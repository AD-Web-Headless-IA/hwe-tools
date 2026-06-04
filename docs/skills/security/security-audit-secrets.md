# Security audit — Secrets and credentials

> Scans source code and git history for accidentally committed credentials. A secret found in the repo is a blocker that requires immediate rotation — not a fix-later.

---

## Trigger

Run:
- After any developer reports they may have accidentally committed a secret.
- As part of the pre-deploy security checklist.
- When a new developer joins and pushes their first commits (risk surface increases).
- After integrating a new external service that requires API keys.
- When `security-specialist` is invoked for a full pre-deploy review.

---

## Agent

`security-specialist` — read-only; produces a report. If secrets are found, **stop the audit immediately** and escalate — do not continue reviewing other areas until the credential is rotated.

---

## Required reading

| File | What it defines |
|---|---|
| `docs/specs/security/security-standards.md` §Secrets | No credentials in code, Vercel env vars only, rotate immediately if leaked |

---

## Threat model

| Threat | Attack vector | Impact |
|---|---|---|
| Credential exposure via repo | API key committed to git, pushed to GitHub (public or leaked private) | Attacker calls the API with the key — billing fraud, data exfiltration, PMS manipulation |
| Token in build artifact | Secret bundled into the Next.js client bundle | Visible to anyone who opens browser DevTools |
| Secret in env file committed | `.env` or `.env.local` committed and pushed | All secrets in the file exposed to all repo contributors |
| Historical commit exposure | Secret committed then deleted — still visible in `git log` | Rotation required even after deletion (git history is immutable) |
| Hardcoded URL with credentials | `https://user:pass@api.pms.com` in source | Credentials embedded in a URL string, found by grep or logged by error reporters |

---

## Steps

All commands run from the client repo root (`site-{slug}/`).

**Step 1 — Scan for common secret patterns in source code**
```bash
grep -rn --include="*.ts" --include="*.tsx" --include="*.mjs" --include="*.js" --include="*.json" \
  -E "sk_live_|sk_test_|pk_live_|pk_test_|api[_-]?key\s*[:=]\s*['\"][A-Za-z0-9+/]{16,}|token\s*[:=]\s*['\"][A-Za-z0-9+/._-]{20,}|password\s*[:=]\s*['\"][^'\"\s]{6,}|secret\s*[:=]\s*['\"][A-Za-z0-9+/._-]{16,}" \
  apps/ packages/ .claude/
```
Expected: zero results.
- Any result → **Blocker** — report the file and line; do not quote the secret value in the report.

**Step 2 — Scan for Anthropic API keys**
```bash
grep -rn --include="*.ts" --include="*.tsx" --include="*.mjs" --include="*.js" --include="*.env*" \
  -E "sk-ant-[A-Za-z0-9+/]{40,}" \
  apps/ packages/ .claude/
```
Expected: zero results.
- Any result → **Blocker** — escalate immediately.

**Step 3 — Scan for URLs with embedded credentials**
```bash
grep -rn --include="*.ts" --include="*.tsx" --include="*.mjs" --include="*.js" \
  -E "https?://[^/\s]+:[^@/\s]+@" \
  apps/ packages/ .claude/
```
Expected: zero results.
- Any result → **Blocker**

**Step 4 — Scan for long random-looking strings (potential tokens)**
```bash
grep -rn --include="*.ts" --include="*.tsx" --include="*.mjs" \
  -E "['\"][A-Za-z0-9+/]{40,}['\"]" \
  apps/ packages/ | grep -v "node_modules\|.turbo\|dist\|__snapshots__"
```
Review each match manually:
- Base64-encoded image data → **Pass** (expected)
- Known public key (OAuth public client ID) → **Pass**
- Looks like an API token or secret → **Blocker**

**Step 5 — Verify `.env` files are gitignored**
```bash
cat .gitignore | grep -E "\.env"
```
Expected: `.env`, `.env.local`, `.env.*.local` are listed.
- Any `.env` variant NOT in `.gitignore` → **Blocker**

**Step 6 — Check that no `.env` file is tracked**
```bash
git ls-files | grep -E "\.env" | grep -v "\.env\.example"
```
Expected: zero results (only `.env.example` files are ever tracked).
- Any `.env` file tracked → **Blocker**

**Step 7 — Search git history for committed secrets**
```bash
git log --all --diff-filter=A --name-only --pretty=format: | grep -E "\.env$|\.env\.local|credentials"
```
AND scan diffs in recent commits:
```bash
git log --all -p --since="90 days ago" -- "*.env" "*.env.local" | grep -E "sk_|api_key|password|secret|token" | head -30
```
Expected: zero results.
- Any result → **Blocker** — the secret must be rotated even if the file was subsequently deleted, because git history is permanent.

**Step 8 — Verify `.env.example` contains only placeholder values**
```bash
cat apps/{slug}/.env.example 2>/dev/null || cat .env.example 2>/dev/null
```
Expected: all values are empty, `YOUR_KEY_HERE`, or example non-real strings.
- Any real-looking value (> 20 chars, not obviously fake) → **Major**

---

## Output

```markdown
# Security Audit — Secrets: {SLUG}

**Date:** {YYYY-MM-DD}
**Scope:** apps/, packages/, .claude/, git history (last 90 days)

## Source code scan

| Pattern searched | Matches | Severity |
|---|---|---|
| API key patterns (sk_, pk_, api_key=) | 0 / {N} | Pass / Blocker |
| Anthropic key (sk-ant-) | 0 / {N} | Pass / Blocker |
| URLs with credentials | 0 / {N} | Pass / Blocker |
| Long random strings | 0 / {N} reviewed | Pass / Major |

## Git hygiene

| Check | Status | Severity |
|---|---|---|
| `.env` in `.gitignore` | Yes / No | Pass / Blocker |
| `.env` not tracked by git | Clean / {files} | Pass / Blocker |
| Git history scan | Clean / {finding summary} | Pass / Blocker |
| `.env.example` placeholders only | Yes / No | Pass / Major |

## Verdict

**Green** — no credentials found in source or history.
**Red** — at least one credential found; audit stopped; rotate immediately.
```

---

## Fix flow — if a secret is found

1. **Rotate immediately.** Contact the service provider (Anthropic, PMS, payment gateway) and generate a new key before doing anything else. The exposed key is now compromised regardless of whether it was used.
2. **Remove from source.** Delete the credential from the file.
3. **Remove from git history** (if committed): use `git filter-repo --path <file> --invert-paths` or BFG Repo Cleaner. This rewrites history — coordinate with the team before force-pushing.
4. **Add to Vercel env vars.** Set the new key in the Vercel project dashboard under Settings → Environment Variables.
5. **Update `.env.example`** to list the variable name with an empty value.
6. Re-run Steps 1–8 to confirm the scan is clean.

---

## Promotion gate

A site with any **Blocker** secrets finding cannot be deployed under any circumstances. The security audit is stopped and all other findings are deferred until rotation is confirmed.

---

## In simple terms

Como revisar que el `wp-config.php` no está en el repositorio de git — en WordPress ese fichero tiene la contraseña de la base de datos y nunca debe commitearse. En hwe, todas las claves van en variables de entorno de Vercel, nunca en el código.

**WordPress equivalent:** `wp-config.php` nunca en git. `wp-config-sample.php` es el equivalente de `.env.example` — tiene los nombres de las variables pero sin valores reales.

**Day-to-day impact:** si en algún momento accidentalmente haces `git add .env.local` y luego un commit, necesitas rotar todas las claves que estaban en ese fichero — aunque hagas un `git reset` inmediatamente después. El historial de git guarda todo.
