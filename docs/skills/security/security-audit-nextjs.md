# Security audit — Next.js patterns

> Verifies that hwe-specific Next.js patterns are implemented securely: Server/Client Component data flow, Route Handler validation, and the server-only API proxy rule for credentials.

---

## Trigger

Run:
- After any Route Handler is added or modified (`app/api/**`).
- After any Server Component is modified that reads from Payload, a PMS, or an env var.
- After any `'use client'` directive is added to a component — to verify no sensitive data leaks to the client bundle.
- As part of the pre-deploy security checklist.
- When `security-specialist` is invoked for a diff review touching server/client boundaries.

---

## Agent

`security-specialist` — read-only; produces a report only.

---

## Required reading

| File | What it defines |
|---|---|
| `docs/specs/security/security-standards.md` §Input handling | Zod at Route Handler boundary, server-side validation |
| `docs/specs/security/security-standards.md` §Secrets | Claude API and PMS credentials server-side only (DEC-007) |
| `docs/specs/frontend/coding-standards.md` §Error handling | Zod parse at boundaries, no silent catch |

---

## Threat model

| Threat | Attack vector | Impact |
|---|---|---|
| Credential leak to client bundle | API key passed as prop from Server Component to Client Component | Key visible in browser DevTools → network → JS bundle |
| Unvalidated Route Handler body | `request.json()` used without Zod → malformed input reaches business logic | Data corruption, unexpected behavior, potential injection |
| Direct API call from browser | Client Component calls PMS or Anthropic API directly instead of via Route Handler | Credentials must be in the request, exposed in browser |
| `eval` / `new Function` execution | Dynamic code from CMS or user executed in Next.js server context | Remote code execution on the server |
| Sensitive Server Component data rendered in HTML | DB query result (including personal data) passed to client in page HTML | Personal data indexed by search engines, visible in HTML source |

---

## Steps

All grep commands run from `hwe-platform/`.

**Step 1 — Find all `'use client'` files that receive sensitive props**
```bash
grep -rln "'use client'" apps/{slug}/src packages/core-ui/src --include="*.tsx" --include="*.ts"
```
For each file found, check what props it accepts:
```bash
grep -A 20 "'use client'" {file} | grep -E "props|email|phone|userId|tenantId|bookingId|personalData|apiKey|token"
```
Expected: no personal data, user IDs, or credentials passed as props to Client Components.
- Sensitive data in Client Component props → **Blocker** (it will be serialized into the HTML and visible in source)

**Step 2 — Verify all Route Handlers parse the request body with Zod**
```bash
grep -rln "request\.json()" apps/{slug}/src --include="*.ts"
```
For each file:
```bash
grep -n "request\.json()\|\.parse(\|Schema\." {file}
```
Expected: every file with `request.json()` also has `Schema.parse()` or similar within the same handler.
- `request.json()` without `.parse()` in the same file → **Blocker**

**Step 3 — Verify no direct external API calls from Client Components**
```bash
grep -rn "fetch(" apps/{slug}/src --include="*.tsx" | grep -v "node_modules\|__tests__"
```
For each `fetch(` in a Client Component (`'use client'` file):
- Is the URL an internal Next.js Route Handler (`/api/...`)? → **Pass**
- Is the URL a third-party API (`api.anthropic.com`, PMS domain, etc.)? → **Blocker** (violates DEC-007)

Also scan for SDK usage in client files:
```bash
grep -rn "import.*Anthropic\|import.*anthropic\|new Anthropic(" apps/{slug}/src --include="*.tsx" --include="*.ts" | grep -v "route.ts\|route.tsx\|server"
```
Expected: zero results (Anthropic SDK only in Route Handlers or server-side files).

**Step 4 — Scan for `eval` and `new Function` in server code**
```bash
grep -rn "eval(\|new Function(" apps/{slug}/src packages/ --include="*.ts" --include="*.tsx" --include="*.mjs" | grep -v "node_modules\|dist"
```
Expected: zero results.
- Any result → **Blocker**

**Step 5 — Verify Next.js middleware exists and covers auth (if applicable)**
```bash
ls -la apps/{slug}/src/middleware.ts 2>/dev/null || echo "NO MIDDLEWARE"
```
If middleware exists:
```bash
cat apps/{slug}/src/middleware.ts
```
Verify:
- The middleware does not expose secrets in response headers.
- The `matcher` config is explicit (not `['/:path*']` catching all routes including `_next/static`).
- Auth checks are applied to protected routes.

**Step 6 — Verify environment variable usage**
```bash
grep -rn "process\.env\." apps/{slug}/src --include="*.tsx" --include="*.ts" | grep -v "node_modules"
```
For each `process.env.` usage:
- Is the variable used in a Server Component, Route Handler, or `next.config.mjs`? → **Pass**
- Is the variable used in a Client Component or a file without `'use server'`? → Check the variable name:
  - Starts with `NEXT_PUBLIC_`? → **Pass** (explicitly public)
  - Does NOT start with `NEXT_PUBLIC_`? → **Blocker** (Next.js strips non-NEXT_PUBLIC_ vars from client bundle, but the intent is wrong — flag it)

**Step 7 — Verify no hardcoded tenant checks in packages**
```bash
grep -rn "if.*client\s*===\|slug\s*===\|tenant\s*===" packages/ --include="*.ts" --include="*.tsx"
```
Expected: zero results. Per-client behavior must live in `apps/site-{slug}/` or `client.config.ts`.
- Any match → **Blocker** (violates multi-tenant isolation — security and architecture concern)

---

## Output

```markdown
# Security Audit — Next.js Patterns: {SLUG}

**Date:** {YYYY-MM-DD}
**Scope:** apps/{slug}/src, packages/core-ui/src

## Server / Client boundary

| Check | Status | Severity |
|---|---|---|
| No sensitive data in Client Component props | Clean / {N} findings | Pass / Blocker |
| No direct external API calls from client files | Clean / {N} findings | Pass / Blocker |
| Anthropic SDK only in server files | Clean / {N} findings | Pass / Blocker |

## Route Handler validation

| Handler | request.json() | Zod .parse() | Severity |
|---|---|---|---|
| `app/api/booking/route.ts` | Yes | Yes / No | Pass / Blocker |
| `app/api/contact/route.ts` | Yes | Yes / No | Pass / Blocker |

## Environment variables

| Variable | Used in | NEXT_PUBLIC_ | Severity |
|---|---|---|---|
| `ANTHROPIC_API_KEY` | `app/api/ai/route.ts` (server) | No | Pass |
| `NEXT_PUBLIC_SITE_NAME` | Client component | Yes | Pass |

## Multi-tenant isolation

| Check | Status | Severity |
|---|---|---|
| No `if (client === '...')` in packages | Clean / {N} findings | Pass / Blocker |

## Verdict

**Green** — server/client boundary respected, Route Handlers validated, no credential leaks.
**Red** — at least one Blocker found.
```

---

## Fix flow

1. **Sensitive data in Client Component props:** move the data fetch to a Server Component. Pass only the safe, display-ready subset to the Client Component.
2. **Route Handler without Zod:** add `const body = BodySchema.parse(await request.json())` at the top. Define the schema co-located with the handler.
3. **External API called from client:** move the call to a Route Handler (`app/api/{name}/route.ts`). The Client Component calls `/api/{name}` instead.
4. Re-run Steps 1–7 after each fix.

---

## Promotion gate

A site cannot deploy with any **Blocker** Next.js pattern finding. The server-only credential rule (DEC-007) is non-negotiable.

---

## In simple terms

En WordPress, había una regla clara: las claves de API van en `wp-config.php` (servidor), nunca en JavaScript que se cargue en el browser. En Next.js la misma regla se aplica con una distinción: Server Components y Route Handlers corren en el servidor, Client Components (`'use client'`) corren en el browser.

**WordPress equivalent:** clave de API en `wp-config.php` + llamada desde PHP → correcto. Clave de API en `functions.php` + llamada desde JavaScript del theme → incorrecto y peligroso.

**Day-to-day impact:** si un componente tiene `'use client'` al principio, no puede acceder a variables de entorno secretas ni llamar directamente a APIs externas. Siempre hay que pasar por un Route Handler. El agente `security-specialist` lo comprueba en cada diff review.
