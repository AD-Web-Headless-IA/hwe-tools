# Security audit — HTTP headers

> Verifies that every production HWP site sends the required security headers. Missing or misconfigured headers are a blocker for deploy.

---

## Trigger

Run:
- When setting up a new client site (`apps/site-{slug}/next.config.mjs` created or modified).
- As part of the pre-deploy security checklist (`security-standards.md §Pre-deploy`).
- After any change to `next.config.mjs` that touches the `headers()` export.
- When `security-specialist` is invoked as a teammate in a diff review that modifies `next.config.mjs`.

---

## Agent

`security-specialist` — invoke after the site is running (dev or staging). Read-only; produces a report only.

---

## Required reading

| File | What it defines |
|---|---|
| `docs/specs/security/security-standards.md` §HTTP headers | Required headers, required values, CSP template for hospitality sites |
| `docs/specs/security/security-standards.md` §Secrets | Confirms no credentials should appear in headers |

---

## Threat model

| Threat | Attack vector | Mitigating header |
|---|---|---|
| Clickjacking | Attacker embeds the site in an `<iframe>` on a malicious page to trick users into clicks | `X-Frame-Options: SAMEORIGIN` or `frame-ancestors 'none'` in CSP |
| MIME-type sniffing | Browser misinterprets a response as executable and runs injected code | `X-Content-Type-Options: nosniff` |
| Data leakage via Referer | Full URL (including query params with personal data) sent to third parties | `Referrer-Policy: strict-origin-when-cross-origin` |
| XSS via injected scripts | Malicious JS loaded from attacker-controlled domain | `Content-Security-Policy: script-src 'self' 'nonce-{NONCE}'` |
| Downgrade to HTTP | MITM intercepts HTTP before HTTPS redirect | `Strict-Transport-Security: max-age=63072000; includeSubDomains` |
| Browser API abuse | Malicious script activates camera / microphone / geolocation | `Permissions-Policy: camera=(), microphone=(), geolocation=()` |

---

## Steps

Assumes the site is accessible at `{BASE_URL}` (dev server or staging).

**Step 1 — Fetch headers only**
```bash
curl -I -s {BASE_URL}
```
Capture the full header block. All subsequent checks operate on this output.

**Step 2 — Verify Strict-Transport-Security**
```bash
curl -I -s {BASE_URL} | grep -i "strict-transport-security"
```
Expected: `strict-transport-security: max-age=63072000; includeSubDomains`
- Absent → **Blocker**
- `max-age` < 31536000 (1 year) → **Major**

**Step 3 — Verify Content-Security-Policy**
```bash
curl -I -s {BASE_URL} | grep -i "content-security-policy"
```
Expected: non-empty. Check it contains:
- `default-src 'self'` → absent = **Blocker**
- `script-src` with either `'nonce-...'` or `'strict-dynamic'` → absent = **Major** (weak script policy)
- `frame-ancestors 'none'` or `frame-ancestors 'self'` → absent = **Major** (clickjacking risk)
- No `unsafe-eval` → present = **Major**

Verify the CSP value matches the hospitality template in `security-standards.md §CSP template`:
```
default-src 'self';
script-src 'self' 'nonce-{NONCE}';
style-src 'self' 'unsafe-inline';
img-src 'self' data: blob: https:;
font-src 'self';
connect-src 'self' https://api.anthropic.com;
frame-ancestors 'none';
base-uri 'self';
form-action 'self';
```

**Step 4 — Verify X-Content-Type-Options**
```bash
curl -I -s {BASE_URL} | grep -i "x-content-type-options"
```
Expected: `x-content-type-options: nosniff`
- Absent → **Blocker**
- Any other value → **Major**

**Step 5 — Verify X-Frame-Options**
```bash
curl -I -s {BASE_URL} | grep -i "x-frame-options"
```
Expected: `x-frame-options: SAMEORIGIN`
- Absent AND CSP `frame-ancestors` also absent → **Major** (if CSP has `frame-ancestors`, X-Frame-Options is redundant but acceptable)

**Step 6 — Verify Referrer-Policy**
```bash
curl -I -s {BASE_URL} | grep -i "referrer-policy"
```
Expected: `referrer-policy: strict-origin-when-cross-origin`
- Absent → **Major**
- `unsafe-url` or `no-referrer-when-downgrade` → **Major** (leaks full URL)

**Step 7 — Verify Permissions-Policy**
```bash
curl -I -s {BASE_URL} | grep -i "permissions-policy"
```
Expected: `permissions-policy: camera=(), microphone=(), geolocation=()`
- Absent → **Major**
- Missing any of the three browser APIs → **Minor** (note which are uncovered)

**Step 8 — Check source config**
```bash
grep -A 50 "headers()" hwp-platform/apps/{slug}/next.config.mjs
```
Verify that all 6 headers are defined in the `headers()` export. A missing header in config won't survive a Vercel deploy — runtime-only headers are not guaranteed.

---

## Output

```markdown
# Security Audit — HTTP Headers: {SLUG}

**Date:** {YYYY-MM-DD}
**URL audited:** {BASE_URL}
**Config file:** apps/{slug}/next.config.mjs

## Header findings

| Header | Present | Value | Severity |
|---|---|---|---|
| `Strict-Transport-Security` | Yes / No | {value or absent} | Pass / Blocker |
| `Content-Security-Policy` | Yes / No | {value or absent} | Pass / Blocker / Major |
| `X-Content-Type-Options` | Yes / No | {value or absent} | Pass / Blocker |
| `X-Frame-Options` | Yes / No | {value or absent} | Pass / Major |
| `Referrer-Policy` | Yes / No | {value or absent} | Pass / Major |
| `Permissions-Policy` | Yes / No | {value or absent} | Pass / Major |

## CSP analysis

| Directive | Present | Value | Severity |
|---|---|---|---|
| `default-src` | Yes / No | {value} | Pass / Blocker |
| `script-src` | Yes / No | {value} | Pass / Major |
| `frame-ancestors` | Yes / No | {value} | Pass / Major |
| `unsafe-eval` | Absent / Present | — | Pass / Major |

## Verdict

**Green** — all 6 headers present, CSP correct, no `unsafe-eval`.
**Yellow** — Minors only; site may deploy with ticket open.
**Red** — at least one Blocker or Major; site cannot deploy.
```

---

## Fix flow

1. Open `apps/{slug}/next.config.mjs`.
2. Add or correct the `headers()` async function using the template in `security-standards.md §HTTP headers`.
3. Replace `{NONCE}` in CSP with the per-request nonce generated by Next.js middleware (see `security-standards.md §CSP template`).
4. Re-run Step 1–7.
5. If Vercel deploy: verify headers appear in the Vercel dashboard → Functions → Response headers tab.

---

## Promotion gate

A site cannot advance from `alpha` to `beta` with any **Blocker** or **Major** header finding. All 6 headers must be present and correct before the pre-deploy checklist can be signed off.

---

## In simple terms

Como la sección de "Security headers" de Wordfence en WordPress — pero aquí las cabeceras se configuran directamente en `next.config.mjs`.

**WordPress equivalent:** el plugin iThemes Security / Wordfence que añade `X-Frame-Options` y `X-Content-Type-Options` via `.htaccess` o PHP headers. En HWP, las pones tú directamente — no hay plugin que lo haga automáticamente.

**Day-to-day impact:** cuando creas un nuevo site, comprueba que `next.config.mjs` tiene la función `headers()` con los 6 headers. Si no, el site no puede ir a producción. El agente `security-specialist` lo verifica automáticamente — pero es más barato comprobarlo tú antes de lanzar el audit.
