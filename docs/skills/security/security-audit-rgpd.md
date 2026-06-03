# Security audit — RGPD compliance

> Verifies that the site meets EU data protection requirements before launch. Operating in Spain and France, RGPD compliance is a legal obligation — violations can trigger fines up to 4% of global annual revenue.

---

## Trigger

Run:
- Before any client site goes to production (launch blocker).
- After adding any form that collects personal data (name, email, phone, booking info).
- After integrating a new service that processes personal data (email provider, analytics, CRM).
- Annually as a compliance maintenance review.
- When `security-specialist` is invoked for a pre-deploy review.

---

## Agent

`security-specialist` — read-only; produces a report only.

---

## Required reading

| File | What it defines |
|---|---|
| `docs/specs/security/security-standards.md` §RGPD | Data inventory requirement, cookie consent, privacy policy, right to deletion, data minimisation |

---

## Threat model

| Risk | Legal / business impact |
|---|---|
| No cookie consent before non-essential cookies | Art. 6 RGPD violation → DPA fine, reputational damage |
| No privacy policy page | Art. 13 RGPD violation (right to information) |
| Privacy policy not linked from footer | Inaccessible = legally invalid disclosure |
| No data inventory | Cannot respond to DSAR (Data Subject Access Request) within 30-day deadline |
| No deletion procedure | Art. 17 RGPD violation (right to erasure) |
| Soft-delete instead of hard delete | "Deletion" that keeps data in an archived state violates Art. 17 |
| Collecting data beyond stated purpose | Art. 5(1)(b) data minimisation violation |
| No legal basis documented for each data field | Art. 6 violation — purpose limitation |

---

## Steps

**Step 1 — Verify privacy policy page exists**
```bash
curl -s -o /dev/null -w "%{http_code}" {BASE_URL}/politique-de-confidentialite
```
OR (for Spanish sites):
```bash
curl -s -o /dev/null -w "%{http_code}" {BASE_URL}/politica-de-privacidad
```
Expected: `200`.
- `404` or `301` to home → **Blocker**

**Step 2 — Verify privacy policy is linked from footer**
```bash
curl -s {BASE_URL} | grep -i "politique-de-confidentialite\|politica-de-privacidad\|privacy.policy\|política de privacidad\|politique de confidentialité"
```
Expected: at least one match in the page HTML (the footer link).
- No match → **Blocker**

**Step 3 — Verify cookie consent banner**
```bash
curl -s {BASE_URL} | grep -iE "cookie(s)?[- ]consent|accepter|refuser|gdpr|rgpd|banner|cookie-notice"
```
Expected: at least one match.
- No match → **Blocker**

Also verify via `security-audit-cookies.md` Step 2 that no non-essential cookie is set before consent.

**Step 4 — Verify data inventory exists**
```bash
ls -la hwe-platform/docs/clients/{slug}/data-inventory.md 2>/dev/null && echo "EXISTS" || echo "MISSING"
```
Expected: `EXISTS`.
- `MISSING` → **Major** (cannot go to production without it; create `docs/clients/{slug}/data-inventory.md` using the template below)

If the file exists, verify it covers all 5 dimensions from `security-standards.md §Data inventory`:
- What (fields collected)
- Where (storage system)
- How long (retention per class)
- Who (roles with access)
- Legal basis (contract / legal obligation / consent)

**Step 5 — Verify forms link to privacy policy**
```bash
grep -rn "politique-de-confidentialite\|politica-de-privacidad\|privacy" hwe-platform/apps/{slug}/src --include="*.tsx" | grep -i "form\|input\|booking\|contact"
```
Expected: every form that collects personal data has a link to the privacy policy within or adjacent to it.
- Any form without a privacy link → **Major**

**Step 6 — Verify deletion procedure is documented**
```bash
grep -rni "deletion\|erasure\|art.17\|right to" hwe-platform/docs/clients/{slug}/ 2>/dev/null
```
Expected: at least one mention of how deletion requests are handled (SLA, responsible person, which systems are purged).
- Not documented → **Major**

**Step 7 — Check for data minimisation violations**

Review the data collection in each form against its stated purpose:
```bash
grep -rn "input\|field\|FormData\|z\.string\|z\.email\|z\.number" hwe-platform/apps/{slug}/src --include="*.tsx" --include="*.ts" | grep -v "node_modules"
```
For each field collected, ask: is this field strictly necessary for the stated purpose?
- Field collected beyond stated purpose (e.g. date of birth when not needed for booking) → **Major**

**Step 8 — Verify marketing consent is separate from booking consent**
```bash
grep -rn "newsletter\|marketing\|promotional" hwe-platform/apps/{slug}/src --include="*.tsx" --include="*.ts" -i
```
Marketing consent must be a separate opt-in, not bundled with booking consent.
- Bundled consent → **Blocker** (invalid consent = no legal basis for marketing)

---

## Data inventory template

If `docs/clients/{slug}/data-inventory.md` is missing, create it with this structure:

```markdown
# Data inventory — {Client name}

**Last reviewed:** {YYYY-MM-DD}
**Reviewer:** {name}

## Personal data fields

| Field | Collected in | Stored in | Retention | Who can access | Legal basis |
|---|---|---|---|---|---|
| Name | Booking form | Payload DB + PMS | Duration of contract + 5y legal min | Admin, staff | Contract performance |
| Email | Booking form, newsletter | Payload DB, email provider | Until withdrawn (newsletter) / 5y (booking) | Admin | Contract + Consent |
| Phone | Booking form | Payload DB + PMS | 5y legal min | Admin, staff | Contract performance |
| Payment ref (token) | Booking form | PMS only (tokenized) | Per PMS policy | PMS system | Contract performance |
| IP address | Server logs | Vercel log storage | 30 days | DevOps | Legitimate interest |

## Deletion procedure

**Who handles requests:** {name or role}
**SLA:** {N} working days (legal max: 30 days)
**Systems to purge:** Payload DB, PMS (via API), email provider, server logs (Vercel — automatic TTL)

## Third-party data processors

| Processor | Purpose | Data shared | DPA signed |
|---|---|---|---|
| Vercel | Hosting + logs | IP, request metadata | Yes (Vercel DPA) |
| {PMS name} | Booking engine | Full booking data | {Yes/No — required} |
| {Email provider} | Transactional email | Name, email | {Yes/No — required} |
```

---

## Output

```markdown
# Security Audit — RGPD Compliance: {SLUG}

**Date:** {YYYY-MM-DD}
**URL audited:** {BASE_URL}

## Legal requirements

| Requirement | Status | Severity |
|---|---|---|
| Privacy policy page exists and returns 200 | Yes / No | Pass / Blocker |
| Privacy policy linked from footer | Yes / No | Pass / Blocker |
| Cookie consent banner present | Yes / No | Pass / Blocker |
| No non-essential cookies before consent | Yes / No | Pass / Blocker |
| Marketing consent separate from booking | Yes / No | Pass / Blocker |

## Data governance

| Check | Status | Severity |
|---|---|---|
| Data inventory documented | Yes / No | Pass / Major |
| Deletion procedure documented | Yes / No | Pass / Major |
| All forms link to privacy policy | Yes / No | Pass / Major |
| No data collected beyond stated purpose | Yes / No | Pass / Major |

## Verdict

**Green** — all legal requirements met, governance documented.
**Yellow** — Major governance gaps; fix before launch.
**Red** — at least one Blocker; site cannot go to production.
```

---

## Fix flow

1. **Missing privacy policy page:** create `apps/{slug}/src/app/politique-de-confidentialite/page.tsx` (or `/politica-de-privacidad/`). The page must describe: data collected, purpose, retention, third parties, user rights (access, rectification, deletion, portability).
2. **Missing footer link:** add a link to the privacy policy in `SiteFooter.tsx`.
3. **Missing data inventory:** create `docs/clients/{slug}/data-inventory.md` using the template above.
4. **Bundled consent:** split into two checkboxes — one for booking T&Cs (mandatory) and one for marketing (optional, unchecked by default).
5. Re-run Steps 1–8.

---

## Promotion gate

A site cannot go to production with any **Blocker** RGPD finding. The pre-deploy checklist requires all legal requirements to be met. Major governance gaps (data inventory, deletion procedure) must be resolved within 30 days of launch.

---

## In simple terms

Como la sección de RGPD de la checklist de lanzamiento de cualquier agencia web seria — estos puntos no son opcionales porque vienen impuestos por ley en España y Francia.

**WordPress equivalent:** el plugin de GDPR (CookieYes, GDPR Cookie Consent) más tener la página de "Política de privacidad" creada y linkeada desde el footer. En hwe lo mismo — pero sin plugin que lo haga automático.

**Day-to-day impact:** antes de que cualquier site hwe vea tráfico real, estas casillas tienen que estar marcadas. El `security-specialist` las audita en el pre-deploy check. Si alguna está en rojo, el site no se despliega — punto.
