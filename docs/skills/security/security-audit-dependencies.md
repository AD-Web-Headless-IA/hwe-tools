# Security audit — Dependencies

> Scans the dependency tree for known vulnerabilities, deprecated packages, and supply chain risks. A critical or high vulnerability in a dependency is a deploy blocker.

---

## Trigger

Run:
- Weekly as part of routine security maintenance (schedule a recurring `/security-audit` task).
- Before any production deployment.
- After `pnpm add` or `pnpm update` changes the lock file.
- After a security advisory is published for any package in the stack (Next.js, Payload, Zod, etc.).
- When `security-specialist` is invoked for a pre-deploy review.

---

## Agent

`security-specialist` — read-only; produces a report only.

---

## Required reading

| File | What it defines |
|---|---|
| `docs/specs/security/security-standards.md` §Secrets | `pnpm audit --audit-level=high` must pass before every deploy |

---

## Threat model

| Threat | Attack vector | Impact |
|---|---|---|
| Known CVE in a dependency | Attacker exploits published vulnerability (e.g. prototype pollution, SSRF, RCE in a Next.js middleware) | Code execution, data exfiltration, DoS |
| Supply chain attack | Attacker publishes a malicious version of a legitimate package (typosquatting, account compromise) | Backdoor executed on every server that installs the package |
| Deprecated package with no maintainer | Unpatched vulnerability discovered with no fix forthcoming | Forced emergency migration under pressure |
| Lock file tampering | `pnpm-lock.yaml` modified to pin a compromised version | Malicious code installed silently on `pnpm install` |
| Transitive dependency vulnerability | A dependency-of-a-dependency has a CVE not surfaced by `npm audit` shallow scan | Same as direct CVE — pnpm audit catches these |

---

## Steps

All commands run from the client repo root (`site-{slug}/`).

**Step 1 — Run `pnpm audit`**
```bash
pnpm audit --audit-level=high
```
Expected: exit code 0 (no high or critical vulnerabilities).
- Exit code non-zero → **Blocker** (critical or high vulnerabilities found)
- Any `critical` finding in the output → **Blocker**
- Any `high` finding in the output → **Blocker**
- Any `moderate` finding → **Major**
- Any `low` finding → **Minor**

**Step 2 — Get machine-readable audit output**
```bash
pnpm audit --json 2>/dev/null | node -e "
const data = JSON.parse(require('fs').readFileSync('/dev/stdin', 'utf8'));
const vulns = data.vulnerabilities || {};
Object.entries(vulns).forEach(([name, v]) => {
  if (['critical','high','moderate'].includes(v.severity)) {
    console.log(v.severity.toUpperCase() + ' | ' + name + ' | ' + v.range + ' | ' + (v.fixAvailable ? 'fix: pnpm update ' + name : 'no fix'));
  }
});
"
```
This extracts actionable vulnerability lines for the report.

**Step 3 — Verify lock file exists and is committed**
```bash
git ls-files pnpm-lock.yaml | grep pnpm-lock.yaml
```
Expected: `pnpm-lock.yaml` (lock file is tracked).
- Lock file not tracked → **Major** (reproducible builds not guaranteed)

**Step 4 — Check for lock file modifications outside `pnpm install`**
```bash
git log --oneline -10 -- pnpm-lock.yaml
```
Review recent commits that touch the lock file. Each should correspond to a `pnpm add`, `pnpm update`, or `pnpm install` operation. An unexpected lock file change (no corresponding package.json change) warrants investigation.
- Unexpected lock file change → **Major** (investigate for tampering)

**Step 5 — Check for deprecated packages**
```bash
pnpm list --depth=0 2>/dev/null | awk '{print $1}' | xargs -I{} sh -c 'npm info {} deprecated 2>/dev/null | grep -q "." && echo "DEPRECATED: {}"' 2>/dev/null | head -20
```
Or alternatively:
```bash
node -e "
const pkg = require('./package.json');
const allDeps = {...(pkg.dependencies||{}), ...(pkg.devDependencies||{})};
console.log(Object.keys(allDeps).join('\n'));
" 2>/dev/null
```
Then check npm for deprecation notices on key packages.
- Deprecated package with a CVE → **Major**
- Deprecated package without a CVE → **Minor**

**Step 6 — Verify no packages with extremely low download counts**

For each direct dependency, a package with < 1000 weekly downloads on npm may indicate:
- A typosquatted package (supply chain risk)
- An abandoned package
- An internal package accidentally published

```bash
node -e "
const pkg = require('./package.json');
console.log(JSON.stringify({...pkg.dependencies, ...pkg.devDependencies}, null, 2));
" 2>/dev/null
```
Then manually verify any unfamiliar package name against npmjs.com.
- Package with < 1000 weekly downloads that is not an internal `@hwe/*` package → **Major** (investigate)

**Step 7 — Check that `pnpm audit` is in the CI pipeline**
```bash
cat .github/workflows/*.yml 2>/dev/null | grep "pnpm audit" || echo "NOT IN CI"
```
Expected: `pnpm audit` appears in at least one CI workflow.
- Not in CI → **Minor** (vulnerabilities may accumulate between manual checks)

---

## Output

```markdown
# Security Audit — Dependencies: {SLUG}

**Date:** {YYYY-MM-DD}
**pnpm audit exit code:** {0 / non-zero}

## Vulnerability summary

| Severity | Count | Packages | Fix available |
|---|---|---|---|
| Critical | {N} | {names} | Yes / No |
| High | {N} | {names} | Yes / No |
| Moderate | {N} | {names} | Yes / No |
| Low | {N} | {names} | Yes / No |

## Top findings

| Package | Severity | Version range | CVE | Fix |
|---|---|---|---|---|
| {name} | Critical / High | {range} | {CVE-YYYY-NNNNN} | `pnpm update {name}` / No fix |

## Lock file

| Check | Status | Severity |
|---|---|---|
| `pnpm-lock.yaml` committed | Yes / No | Pass / Major |
| No unexpected lock file changes | Clean / {commit SHA} | Pass / Major |

## Deprecated packages

| Package | Deprecated since | CVE | Severity |
|---|---|---|---|
| {name} | {date} | {CVE or none} | Major / Minor |

## Verdict

**Green** — `pnpm audit` exits 0, no deprecated packages with CVEs, lock file clean.
**Yellow** — Moderate findings or deprecated packages without CVEs.
**Red** — Critical or High vulnerabilities; site cannot deploy.
```

---

## Fix flow

1. **For each critical/high vulnerability with a fix available:**
   ```bash
   pnpm update {package-name}
   ```
   Then re-run `pnpm audit` to confirm the fix.

2. **For vulnerabilities with no direct fix:**
   - Check if a newer major version resolves the CVE: `pnpm add {package}@latest`
   - If the vulnerable package is a transitive dependency, add an `overrides` entry in `package.json`:
     ```json
     "pnpm": { "overrides": { "{package}": "^{safe-version}" } }
     ```
   - Document the decision in `docs/architecture/decisions.md` if no fix is available.

3. **For deprecated packages:** plan migration to the recommended replacement. Create a tracking issue.

4. Re-run Step 1 after each fix to confirm clean state.

---

## Promotion gate

A site cannot deploy with any `pnpm audit --audit-level=high` failure. The pre-deploy checklist includes this as a mandatory step. Moderate findings require a documented decision if not fixed immediately.

---

## In simple terms

Como mantener los plugins de WordPress actualizados — una versión antigua de Wordfence o WooCommerce con una vulnerabilidad conocida es una puerta de entrada para atacantes.

**WordPress equivalent:** "Check for updates" en wp-admin → Plugins. `pnpm audit` es el equivalente automatizable — escanea todas las dependencias (directas y transitivas) contra la base de datos de CVEs de npm.

**Day-to-day impact:** antes de cada deploy, corre `pnpm audit --audit-level=high`. Si devuelve errores, no puedes hacer el deploy hasta resolverlos. Es como no poder publicar una actualización en WordPress hasta haber actualizado todos los plugins con vulnerabilidades conocidas.
