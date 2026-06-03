# Security Audit — site-demo

**Date:** 2026-05-28 | **Base URL:** http://localhost:3000 | **Overall:** 🟡 Yellow

---

## Site-wide findings

<!-- RUNNER OUTPUT — network-based checks: headers, cookies, dependencies -->
<!-- Code audit (inputs, secrets, RGPD, Next.js) is appended by SKILL.md -->

## `headers` — 🟢 Green

### BLOCKERS (0)

_None_ ✓

### MAJORS (0)

_None_ ✓

### MINORS (1)

- CSP `script-src` uses no nonce or strict-dynamic — consider tightening before production

### SKIPPED (1)

- ⏭️ `Strict-Transport-Security` — SKIP on localhost (Vercel injects in production; verify post-deploy)

---

## `cookies` — 🟢 Green

### BLOCKERS (0)

_None_ ✓

### MAJORS (0)

_None_ ✓

### MINORS (0)

_None_ ✓

---

## `dependencies` — 🟢 Green

### BLOCKERS (0)

_None_ ✓

### MAJORS (0)

_None_ ✓

### MINORS (1)

- `pnpm audit` could not run on Windows (path resolution issue in runner) — run `pnpm audit` manually from the repo root to verify no CVEs

---

## Code audit findings

### Input handling

**3a — `dangerouslySetInnerHTML`**

- ⏭️ **SKIP** — `apps/site-demo/src/app/layout.tsx:241` — JSON-LD pattern (`JSON.stringify(jsonLd)` in `<script type="application/ld+json">`). `JSON.stringify` escapes all HTML special characters. Not an XSS risk. Comment present in source. ✓

**3b — `eval` / `new Function`**

- _None_ ✓

**3c — Route Handler Zod coverage**

- No Route Handlers using `request.json()` found — no Zod coverage gap. ✓

---

### Secrets

**4a — Secret patterns in source**

- _None_ ✓

**4b — `.env` hygiene**

- `.env`, `.env.local`, `.env.*.local` are present in `.gitignore` ✓
- No `.env` or `.env.local` files tracked in git ✓

**4c — Git history scan (last 90 days)**

- No secret patterns found in commit history ✓

---

### RGPD

**5a — Privacy policy page**

- `GET /politique-de-confidentialite` → `200` ✓
- `GET /politica-de-privacidad` → `404` — not required for FR site ✓

**5b — Privacy policy footer link**

- Link to `politique-de-confidentialite` found in homepage HTML ✓

**5c — Data inventory**

- **MAJOR** — `docs/clients/site-demo/data-inventory.md` does not exist. Required to document collected data, legal basis, retention periods, and processors (RGPD Art.30). Use the template in `docs/skills/security/security-audit-rgpd.md`.

---

### Next.js patterns

**6a — Sensitive data in Client Component props**

- No sensitive fields detected in `'use client'` files ✓

**6b — External API calls from client files**

- No Anthropic SDK usage outside Route Handlers ✓

**6c — Tenant isolation in packages**

- No `if (client === ...)` / `slug === ...` / `tenant === ...` patterns in `packages/` ✓

---

### AI content safeguards

**Status:** N/A — pre-integration (Payload + AI content pipeline not yet active)

---

## Score by area

| Area | Blockers | Majors | Minors | Verdict |
|---|---|---|---|---|
| HTTP headers | 0 | 0 | 1 | 🟢 Green |
| Cookies & consent | 0 | 0 | 0 | 🟢 Green |
| Input handling | 0 | 0 | 0 | 🟢 Green |
| Secrets | 0 | 0 | 0 | 🟢 Green |
| RGPD | 0 | 1 | 0 | 🟡 Yellow |
| Dependencies | 0 | 0 | 1 | 🟢 Green |
| Next.js patterns | 0 | 0 | 0 | 🟢 Green |
| AI content | N/A | N/A | N/A | ⏳ Pre-integration |
| **TOTAL** | **0** | **1** | **2** | **🟡 Yellow** |

---

## Fix priority order

**MAJORS (1) — fix before production launch:**

1. **[RGPD — MAJOR]** Data inventory missing — create `docs/clients/site-demo/data-inventory.md` using the template in `docs/skills/security/security-audit-rgpd.md`. Document: data collected, legal basis (RGPD Art.6), retention periods, processors (hosting, booking engine).

**MINORS (2):**

2. **[HTTP HEADERS — MINOR]** CSP `script-src` uses `'unsafe-inline'` — before production, migrate to a nonce-based CSP. See `docs/skills/security/security-audit-headers.md`.
3. **[DEPENDENCIES — MINOR]** `pnpm audit` could not run in runner (Windows path issue). Run `pnpm audit` manually from `hwp-platform/` to confirm no CVEs.

**SKIPPED (informational):**

- `Strict-Transport-Security` — not checked on localhost. Vercel injects it automatically in production. Verify after first deploy.

---

## Reference

- Headers: `docs/skills/security/security-audit-headers.md`
- Cookies: `docs/skills/security/security-audit-cookies.md`
- Input handling: `docs/skills/security/security-audit-inputs.md`
- Secrets: `docs/skills/security/security-audit-secrets.md`
- RGPD: `docs/skills/security/security-audit-rgpd.md`
- Dependencies: `docs/skills/security/security-audit-dependencies.md`
- Next.js: `docs/skills/security/security-audit-nextjs.md`
