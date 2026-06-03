# Security audit — Cookies and consent

> Verifies that no non-essential cookie is written before explicit user consent and that all cookies carry the correct security flags. RGPD Art. 6 makes consent a legal requirement, not a nice-to-have.

---

## Trigger

Run:
- When setting up a new client site (cookie consent banner is a launch blocker).
- After any change to cookie-related code (analytics, booking tracking, session management).
- When integrating a third-party service that may set cookies (analytics, chat widget, booking engine).
- As part of the pre-deploy security checklist.
- When `security-specialist` is invoked as a teammate during diff review.

---

## Agent

`security-specialist` — read-only; produces a report only.

---

## Required reading

| File | What it defines |
|---|---|
| `docs/specs/security/security-standards.md` §RGPD | Cookie consent rules, strictly necessary exemption, dark pattern prohibition |
| `docs/specs/security/security-standards.md` §Cookie consent | Consent recording, withdrawal flow |

---

## Threat model

| Threat | Attack vector | RGPD / security implication |
|---|---|---|
| RGPD violation — no consent | Non-essential cookie set on first page load | Fines up to 4% of global annual revenue (Art. 83 RGPD) |
| Session hijacking | Session cookie without `HttpOnly` or `Secure` flag | Attacker reads cookie via XSS or HTTP interception |
| CSRF | Session cookie without `SameSite=Strict` or `SameSite=Lax` | Cross-site requests forged using the victim's cookie |
| Consent bypass | Dark pattern (pre-ticked, misleading wording) | Illegal under RGPD — invalid consent = no legal basis |
| Consent not recorded | Consent given but not logged with timestamp | Cannot prove compliance to DPA (Data Protection Authority) |

---

## Steps

**Step 1 — Fetch the root page with a clean cookie jar**
```bash
curl -s -c /tmp/hwe-cookies-initial.txt -D /tmp/hwe-headers-initial.txt {BASE_URL}
```
This fetches the home page with no cookies. Captures response headers (including `Set-Cookie`) and any cookies written.

**Step 2 — Check for non-essential cookies set without consent**
```bash
grep -i "set-cookie" /tmp/hwe-headers-initial.txt
```
AND:
```bash
cat /tmp/hwe-cookies-initial.txt
```
Expected: only strictly necessary cookies may appear before consent:
- `__session` (session auth cookie) — **Allowed**
- `csrf_token` — **Allowed**
- `consent_record` (the record of consent choice) — **Allowed**
- Any analytics cookie (`_ga`, `_gid`, `_fbp`, etc.) → **Blocker** (set before consent)
- Any booking-tracking cookie → **Blocker**
- Any marketing cookie → **Blocker**

**Step 3 — Verify consent banner is present in the HTML**
```bash
curl -s {BASE_URL} | grep -iE "cookie(s)?[- ]consent|rgpd|gdpr|cookiebanner|cookie-notice|accepter.*cookie|accept.*cookie"
```
Expected: at least one match indicating a consent element is rendered.
- No match → **Blocker** (no consent mechanism at all)

**Step 4 — Verify security flags on all cookies**
```bash
grep -i "set-cookie" /tmp/hwe-headers-initial.txt
```
For every `Set-Cookie` line, verify:
- Contains `Secure` → absent = **Blocker** (cookie transmitted over HTTP)
- Contains `HttpOnly` → absent on session cookies = **Major** (XSS can read it)
- Contains `SameSite=Strict` or `SameSite=Lax` → absent = **Major** (CSRF risk)
- `SameSite=None` without `Secure` → **Blocker** (browser will reject it anyway, but flag the intent)

**Step 5 — Verify consent is recorded**

Grep the codebase for consent recording logic:
```bash
grep -rn "consent" hwe-platform/apps/{slug}/src --include="*.ts" --include="*.tsx" | grep -i "timestamp\|date\|record\|log\|store"
```
Expected: at least one hit showing consent is stored with a timestamp.
- No storage of consent found → **Major** (cannot prove compliance)

**Step 6 — Verify withdrawal is as easy as giving consent**

Grep for a mechanism to withdraw consent:
```bash
grep -rn "withdraw\|revoke\|opt.out\|gérer.*cookies\|manage.*cookies" hwe-platform/apps/{slug}/src --include="*.tsx" --include="*.ts" -i
```
Expected: a settings/preferences link or button that re-opens the consent UI.
- No withdrawal mechanism found → **Major**

**Step 7 — Check for dark patterns in consent UI**

Read the consent component source:
```bash
grep -rn "defaultChecked\|checked={true}\|checked=.true" hwe-platform/apps/{slug}/src --include="*.tsx"
```
Expected: no pre-checked checkboxes for non-essential consent categories.
- Pre-ticked boxes found → **Blocker** (illegal under RGPD)

---

## Output

```markdown
# Security Audit — Cookies and Consent: {SLUG}

**Date:** {YYYY-MM-DD}
**URL audited:** {BASE_URL}

## Pre-consent cookies

| Cookie name | Category | Set before consent? | Severity |
|---|---|---|---|
| `_ga` | Analytics (non-essential) | Yes / No | Blocker / Pass |
| `__session` | Auth (strictly necessary) | Yes / No | Pass (allowed) |

## Cookie flags

| Cookie name | Secure | HttpOnly | SameSite | Severity |
|---|---|---|---|---|
| `__session` | Yes / No | Yes / No | Strict/Lax/None | Pass / Blocker / Major |

## Consent mechanism

| Check | Status | Severity |
|---|---|---|
| Consent banner present | Yes / No | Pass / Blocker |
| No pre-ticked boxes | Yes / No | Pass / Blocker |
| Consent recorded with timestamp | Yes / No | Pass / Major |
| Withdrawal mechanism present | Yes / No | Pass / Major |

## Verdict

**Green** — no pre-consent cookies, all flags correct, consent recorded, withdrawal possible.
**Yellow** — Minors only.
**Red** — at least one Blocker or Major.
```

---

## Fix flow

1. **Pre-consent cookies:** move analytics/tracking initialization to the consent callback — fire only after `consent_record` shows opt-in.
2. **Missing cookie flags:** add `Secure; HttpOnly; SameSite=Lax` to the cookie options in the session/auth middleware.
3. **No banner:** implement a consent banner component before launch. The banner must offer genuine choice — reject button as visible as accept button.
4. **No consent recording:** store `{ timestamp, choice, version }` in a `consent_record` cookie (strictly necessary category).
5. Re-run Steps 1–7 after fixes.

---

## Promotion gate

A site cannot deploy to production with any **Blocker** cookie finding. The pre-deploy checklist requires:
- Zero non-essential cookies set before explicit consent.
- `Secure`, `HttpOnly`, `SameSite` on every session cookie.
- Consent banner with genuine accept/reject choice.
- Consent timestamp recorded.

---

## In simple terms

Como el plugin GDPR Cookie Consent / CookieYes en WordPress — cada cookie que no sea imprescindible para que el site funcione (sesión, CSRF) necesita permiso del usuario antes de escribirse.

**WordPress equivalent:** GDPR Cookie Consent by WebToffee o CookieYes. En hwe no hay plugin — la lógica la implementas tú en código, pero la regla es exactamente la misma.

**Day-to-day impact:** si añades Google Analytics, Facebook Pixel, o el tracking del motor de reservas, ese código no puede ejecutarse cuando el usuario llega por primera vez. Solo se activa cuando hace click en "Aceptar". El agente `security-specialist` verifica que esto sea así antes de cada deploy.
