---
name: security-audit
description: Run all 7 active security audits against a running hwe site and save a consolidated report to docs/audits/{slug}/security/security-audit-{date}.md. Skips the AI content audit (placeholder, N/A until Payload+AI integration). Use before any production deployment, after adding user-input blocks, or when setting up a new client site.
argument-hint: [site-slug]
allowed-tools: Read Write Glob Bash(curl *) Bash(node *) Bash(pnpm *) Bash(grep *) Bash(ls *) Bash(test *) Bash(mkdir *) Bash(git *)
---

# Security Audit

You are a security audit runner for hwe sites. Your job is to run 7 automated security checks, surface findings by severity (Blocker / Major / Minor), save the consolidated report, and tell the developer what to fix first.

The runner script handles network-based checks (headers, cookies, dependencies). Grep-based code audits (inputs, secrets, Next.js patterns, RGPD) are executed directly from this skill using the steps below.

## Constraints

- Runs from within a client repo (`site-{slug}/` is the CWD). Slug argument is optional context label.
- Valid slugs match `^[a-z0-9-]+$`.
- Never fabricate audit results. If a check cannot run (missing tool, server down), report it as `SKIP — {reason}`, not as Pass.
- Never modify source files. This skill writes only the audit report.
- Report is saved to `docs/audits/security/security-audit-{TODAY}.md`. Overwrite same-day reports (re-audit after fixes).
- Use Node.js 20+ for the runner script (built-in `fetch`). Verify with `node --version` if uncertain.
- CWD = client repo root. Runner script is at `hwe-tools/.claude/skills/security-audit/runner.mjs`.
- All grep commands: `--include="*.ts" --include="*.tsx" --include="*.mjs" --include="*.js"` unless specified.

## Process

### Step 0 — Parse and validate arguments

Slug = `$0`, default derived from `package.json` `name` field.

Validate:
- Matches `^[a-z0-9-]+$` — if not, stop with: `Error: slug must match ^[a-z0-9-]+$. Got: {input}.`
- CWD contains `package.json` and `src/` — if not, stop with: `Error: not inside a client repo root. cd into the site-{slug}/ directory first.`

Derive:
- `SLUG` = slug (or from `package.json` `name` field)
- `APP_DIR` = `.` (CWD = client repo root)
- `SRC_DIR` = `src/`
- `TODAY` = current date in `YYYY-MM-DD`
- `BASE_URL` = `http://localhost:3000` (default; read from `package.json` `"dev"` script port if non-3000)
- `REPORT_DIR` = `docs/audits/security`

### Step 1 — Verify the dev server

```bash
curl -s -o /dev/null -w "%{http_code}" {BASE_URL}
```

- `200` → proceed.
- Anything else → print: `Dev server not responding at {BASE_URL}. Start it with: pnpm --filter {SLUG} dev` and stop.

### Step 2 — Run the automated runner (headers, cookies, dependencies)

```bash
node hwe-tools/.claude/skills/security-audit/runner.mjs {BASE_URL} {SLUG}
```

Capture stdout as `RUNNER_OUTPUT`. The runner exits 0 on success (even with findings) and exits 1 only on hard failure (server unreachable). On exit 1, report verbatim stderr and stop.

### Step 3 — Code audit: input handling

Run each grep and collect findings:

**3a — dangerouslySetInnerHTML**
```bash
grep -rn "dangerouslySetInnerHTML" {SRC_DIR} node_modules/@hwe/core-ui/src/base-blocks --include="*.tsx" --include="*.ts" 2>/dev/null
```
For each match, apply this decision tree (read ±5 lines of context around the flagged line):

1. **JSON-LD false positive** — the value is `JSON.stringify(...)` AND the surrounding element is `<script type="application/ld+json">`:
   → **SKIP** — `JSON.stringify` escapes all HTML special characters; this is the standard Next.js JSON-LD pattern. Report as: `SKIP — JSON-LD pattern (JSON.stringify in <script type="application/ld+json">) — not an XSS risk`.

2. **Unsanitized raw HTML** — value comes from a user-controlled prop, CMS field, API response, or any variable not produced by `JSON.stringify`:
   → Check the same file for `dompurify` or `sanitize`. No sanitizer → **Blocker**.

**3b — eval and new Function**
```bash
grep -rn "eval(\|new Function(" {SRC_DIR} node_modules/@hwe/core-ui/src/base-blocks --include="*.ts" --include="*.tsx" --include="*.mjs" 2>/dev/null | grep -v "node_modules\|dist"
```
Any result → Blocker.

**3c — Route Handler Zod coverage**
```bash
grep -rln "request\.json()" {SRC_DIR} --include="*.ts" 2>/dev/null
```
For each file returned, check for `.parse(` in the same file:
```bash
grep -l "request\.json()" {SRC_DIR} --include="*.ts" -r 2>/dev/null | while read f; do
  grep -q "\.parse(" "$f" || echo "MISSING_ZOD: $f"
done
```
Any `MISSING_ZOD` → Blocker.

### Step 4 — Code audit: secrets

**4a — Secret patterns in source**
```bash
grep -rn --include="*.ts" --include="*.tsx" --include="*.mjs" --include="*.js" \
  -E "sk_live_|sk_test_|pk_live_|pk_test_|sk-ant-[A-Za-z0-9]{10,}|api[_-]?key\s*[:=]\s*['\"][A-Za-z0-9+/._-]{20,}|password\s*[:=]\s*['\"][^'\"\s]{8,}" \
  {SRC_DIR} node_modules/@hwe/core-ui/src/base-blocks 2>/dev/null | grep -v "node_modules\|dist\|\.env\.example"
```
Any result → Blocker (report file+line, not the value).

**4b — .env in gitignore and not tracked**
```bash
grep -E "\.env" .gitignore 2>/dev/null | head -5
git ls-files | grep -E "\.env$|\.env\.local" | grep -v "\.env\.example"
```
Tracked .env file → Blocker. Missing from .gitignore → Blocker.

**4c — Git history scan (last 90 days)**
```bash
git log --all -p --since="90 days ago" -S "sk-ant-\|api_key\|ANTHROPIC" -- "*.ts" "*.tsx" "*.js" "*.env" 2>/dev/null | grep "^+" | grep -iE "sk-ant-|api_key|password" | head -10
```
Any result → Blocker.

### Step 5 — Code audit: RGPD

**5a — Privacy policy page**
```bash
curl -s -o /dev/null -w "%{http_code}" {BASE_URL}/politique-de-confidentialite 2>/dev/null
curl -s -o /dev/null -w "%{http_code}" {BASE_URL}/politica-de-privacidad 2>/dev/null
```
Both return non-200 → Blocker.

**5b — Privacy policy linked from footer**
```bash
curl -s {BASE_URL} 2>/dev/null | grep -ic "politique-de-confidentialite\|politica-de-privacidad\|privacy"
```
Count 0 → Blocker.

**5c — Data inventory**
```bash
test -f "docs/data-inventory.md" && echo "EXISTS" || echo "MISSING"
```
Missing → Major.

### Step 6 — Code audit: Next.js patterns

**6a — Sensitive data in Client Component props**
```bash
grep -rln "'use client'" {SRC_DIR} --include="*.tsx" 2>/dev/null | while read f; do
  grep -n "email\|phone\|userId\|apiKey\|token\|secret\|password" "$f" 2>/dev/null && echo "CHECK: $f"
done
```
Review any matches manually.

**6b — External API calls from client files**
```bash
grep -rn "import.*Anthropic\|new Anthropic(\|anthropic\.messages" {SRC_DIR} --include="*.tsx" --include="*.ts" 2>/dev/null | grep -v "route\.ts\|route\.tsx\|api/"
```
Any result → Blocker.

**6c — Tenant isolation in packages and base-blocks**
```bash
grep -rn "if.*client\s*===\|slug\s*===\|tenant\s*===" node_modules/@hwe/core-ui/src/base-blocks --include="*.ts" --include="*.tsx" 2>/dev/null | grep -v "node_modules"
```
Any result → Blocker.

### Step 7 — Assemble the report

Combine `RUNNER_OUTPUT` (from Step 2) with all code audit findings into a single markdown document.

Structure:

```markdown
# Security Audit — {SLUG}

**Date:** {TODAY} | **Base URL:** {BASE_URL} | **Overall:** 🔴 Red / 🟡 Yellow / 🟢 Green

---

## Site-wide findings

{RUNNER_OUTPUT — headers, cookies, dependencies sections}

---

## Code audit findings

### Input handling

{Step 3 results — dangerouslySetInnerHTML, eval, Route Handler Zod}

### Secrets

{Step 4 results — pattern matches, .env hygiene, git history}

### RGPD

{Step 5 results — privacy policy, footer link, data inventory}

### Next.js patterns

{Step 6 results — client boundary, external API calls, tenant isolation}

### AI content safeguards

**Status:** N/A — pre-integration (Payload + AI content pipeline not yet active)

---

## Score by area

| Area | Blockers | Majors | Minors | Verdict |
|---|---|---|---|---|
| HTTP headers | {N} | {N} | {N} | 🟢/🟡/🔴 |
| Cookies & consent | {N} | {N} | {N} | 🟢/🟡/🔴 |
| Input handling | {N} | {N} | {N} | 🟢/🟡/🔴 |
| Secrets | {N} | {N} | {N} | 🟢/🟡/🔴 |
| RGPD | {N} | {N} | {N} | 🟢/🟡/🔴 |
| Dependencies | {N} | {N} | {N} | 🟢/🟡/🔴 |
| Next.js patterns | {N} | {N} | {N} | 🟢/🟡/🔴 |
| AI content | N/A | N/A | N/A | ⏳ Pre-integration |
| **TOTAL** | **{N}** | **{N}** | **{N}** | **🟢/🟡/🔴** |

---

## Fix priority order

{Ordered list: Blockers first (by area), then Majors, then Minors. Each item: area + specific finding + recommended fix from the relevant skill doc.}

---

## Reference

- Headers: `docs/skills/security/security-audit-headers.md`
- Cookies: `docs/skills/security/security-audit-cookies.md`
- Input handling: `docs/skills/security/security-audit-inputs.md`
- Secrets: `docs/skills/security/security-audit-secrets.md`
- RGPD: `docs/skills/security/security-audit-rgpd.md`
- Dependencies: `docs/skills/security/security-audit-dependencies.md`
- Next.js: `docs/skills/security/security-audit-nextjs.md`
```

Verdict logic:
- Any Blocker → 🔴 Red
- No Blockers + at least one Major → 🟡 Yellow
- No Blockers, no Majors → 🟢 Green

### Step 8 — Save the report

```bash
mkdir -p docs/audits/security
```

Use the `Write` tool to save:
- Path: `docs/audits/security/security-audit-{TODAY}.md`
- Content: full assembled report from Step 7.

### Step 9 — Print summary

```
Security Audit — {SLUG} — {TODAY}
Verdict: 🔴 Red / 🟡 Yellow / 🟢 Green
Blockers: {N} | Majors: {N} | Minors: {N}

Fix priority:
  1. {highest priority finding — area: description}
  2. {second priority}
  3. {third priority (if exists)}

Full report: docs/audits/{SLUG}/security/security-audit-{TODAY}.md
```

If Green: `All critical security checks passed. Site is ready for the next phase.`

## Refusal cases

- Slug not matching `^site-[a-z0-9-]+$` — stop and report.
- `apps/{slug}/` does not exist — stop and report.
- Runner exits 1 (server unreachable) — stop; do not save a partial report.
- Slug or `$0` contains shell metacharacters — stop immediately; do not execute.
- Asked to edit source files — refuse; this skill is read-only.

## Examples

### Default (site-demo)
```
/security-audit
```
Runs against `site-demo` on `http://localhost:3000`.

### Named slug
```
/security-audit site-hotel-balneario
```

### Re-audit after fixes
```
/security-audit site-demo
```
Overwrites `docs/audits/site-demo/security/security-audit-{TODAY}.md` with fresh results.
