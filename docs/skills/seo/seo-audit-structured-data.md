# SEO audit — Structured data (JSON-LD)

> Audits all JSON-LD schemas on the page: required types per page, field completeness, placement in `<head>`, no unfilled template placeholders. Structured data is the highest-trust signal for both Google rich results and LLM citations — a hotel missing its `Campground` or `Hotel` schema is invisible to rich results.

---

## Trigger

Run when:
- A new client site is set up.
- `apps/{site}/src/app/layout.tsx` or any page's structured data is added or modified.
- A new page route with its own schema is created.
- Before first deploy.
- After seasonal data changes (offers, events, reviews count).

---

## Agent

`seo-geo-specialist`

---

## Required reading

| File | What it defines |
|---|---|
| `docs/specs/seo/schemas/README.md` | Page → required schema mapping; index of all 11 template files |
| `docs/specs/seo/geo-llm-optimization.md` §Structured data | Placement in `<head>`, `@graph` pattern, field completeness rules, SSR requirement |

---

## Steps

Assumes the dev server is running at `http://localhost:3000`. Run for each page type being audited.

**Step 1 — Fetch the page**
```bash
curl -s http://localhost:3000 -o /tmp/hwp-page.html
```

**Step 2 — Extract and pretty-print all JSON-LD blocks**
```bash
python3 -c "
import re, json
html = open('/tmp/hwp-page.html').read()
schemas = re.findall(r'<script[^>]+type=[\"\'"]application/ld\+json[\"\'"][^>]*>(.*?)</script>', html, re.DOTALL)
print(f'Found {len(schemas)} JSON-LD block(s)')
for i, s in enumerate(schemas, 1):
    print(f'\n--- Schema {i} ---')
    print(json.dumps(json.loads(s.strip()), indent=2))
"
```

**Step 3 — Verify all JSON-LD is in `<head>`, not `<body>`**
```bash
python3 -c "
html = open('/tmp/hwp-page.html').read()
head = html[:html.index('</head>')]
body = html[html.index('<body'):]
print(f'JSON-LD in head: {head.count(\"application/ld+json\")}')
print(f'JSON-LD in body: {body.count(\"application/ld+json\")}')
"
```
Any count in body > 0 = Major (crawlers prioritise `<head>`; body placement reduces reliability).

**Step 4 — Determine the page type and its required schemas**
Check `docs/specs/seo/schemas/README.md §Page → schema mapping`:
- Camping homepage → `Campground` (required) + `Organization` + optionally `FAQPage`
- Hotel homepage → `Hotel` (required) + `Organization` + optionally `FAQPage`
- Any sub-page → `BreadcrumbList` (required when deeper than homepage)
- All pages → `Organization` (required in global layout)

**Step 5 — Verify required schema types are present**
```bash
grep -oE '"@type"\s*:\s*"[^"]*"' /tmp/hwp-page.html | sort | uniq
```
Cross-check against the required schemas identified in Step 4. Missing required type = Blocker.

**Step 6 — Check for unfilled template placeholders**
```bash
grep -c '{{' /tmp/hwp-page.html
```
Any count > 0 means a `{{VARIABLE}}` placeholder from a schema template was rendered without being replaced = Blocker (broken structured data in production).

**Step 7 — Validate required fields per schema type**
For each schema found, cross-reference its template file in `docs/specs/seo/schemas/`:
```bash
python3 -c "
import re, json
html = open('/tmp/hwp-page.html').read()
schemas = re.findall(r'<script[^>]+type=[\"\'"]application/ld\+json[\"\'"][^>]*>(.*?)</script>', html, re.DOTALL)
for s in schemas:
    d = json.loads(s.strip())
    items = d.get('@graph', [d]) if isinstance(d, dict) else [d]
    for item in items:
        t = item.get('@type', 'unknown')
        name = item.get('name', 'MISSING')
        url = item.get('url', 'MISSING')
        addr = item.get('address', 'MISSING')
        geo = item.get('geo', 'MISSING')
        print(f'{t}: name={name!r}, url={url!r}, address={\"present\" if addr != \"MISSING\" else \"MISSING\"}, geo={\"present\" if geo != \"MISSING\" else \"MISSING\"}')
"
```
Required in all `Campground` / `Hotel` / `Organization` schemas: `name`, `url`, `address`, `geo`. Missing = Blocker.

**Step 8 — Check for empty or null field values**
```bash
grep -oE '"[^"]+"\s*:\s*(""|null|\[\])' /tmp/hwp-page.html
```
Any empty string `""`, `null`, or empty array `[]` in a schema field = Major. Per `geo-llm-optimization.md`: omit the field entirely if data is unavailable — an empty field is worse than no field.

**Step 9 — Check `@graph` pattern when multiple schemas are present**
If Step 2 found more than one JSON-LD block, they should be combined using `@graph`:
```bash
grep -c '"@graph"' /tmp/hwp-page.html
```
Multiple separate `<script type="application/ld+json">` blocks are functional but `@graph` is preferred — it avoids repeating `"@context"` and lets Google understand entity relationships.

---

## Output

```markdown
# SEO Audit — Structured data: {SiteName} / {PagePath}

**Date:** {YYYY-MM-DD}
**URL audited:** {http://localhost:3000/...}

## JSON-LD inventory
| # | @type | Placement | Unfilled `{{}}` | Empty fields | Result |
|---|---|---|---|---|---|
| 1 | Campground | head ✓ | 0 | 0 | Pass |
| 2 | Organization | head ✓ | 0 | 0 | Pass |
| 3 | FAQPage | body ✗ | 2 | 1 | Blocker + Major |

## Required schemas (per README.md mapping)
| Required schema | Present | Severity |
|---|---|---|
| `Campground` or `Hotel` | Yes / No | Pass / Blocker |
| `Organization` | Yes / No | Pass / Major |
| `BreadcrumbList` (sub-pages) | Yes / No | Pass / Major |

## Field validation
| Schema | Field | Issue | Severity |
|---|---|---|---|
| FAQPage | `mainEntity[1].name` | `{{QUESTION_2}}` placeholder | Blocker |
| Campground | `geo.latitude` | Empty string | Blocker |
| Organization | `telephone` | null value | Major |

## @graph usage
| Multiple schemas present | @graph used | Recommendation |
|---|---|---|
| Yes | No | Consolidate into @graph |

## Verdict
Green / Yellow / Red
```

---

## Fix flow

1. **implementer** updates the schema generation code in `layout.tsx` or the relevant page Server Component.
2. Verify `client.config.ts` has all required NAP and geo fields populated before schemas are generated.
3. Remove or omit any field whose value is empty — never include `"field": ""`.
4. **seo-geo-specialist** re-runs Steps 2–9 after fixes.
5. To validate rich results manually: use `curl -s http://localhost:3000 | python3 -m json.tool` on the extracted JSON-LD, or Google Rich Results Test after the site is publicly accessible.

---

## In simple terms

Como la auditoría de schema de Yoast SEO Premium, pero con control total sobre qué tipos se usan y qué datos los rellenan:

| En Yoast (WP) | En HWP |
|---|---|
| Schema generado automáticamente (Hotel, LocalBusiness) | 11 plantillas explícitas en `docs/specs/seo/schemas/` |
| Configuras los datos en wp-admin | Los datos vienen de `client.config.ts` y Payload CMS |
| Test en Google Rich Results con la URL pública | Test en local con `curl` + extracción Python del JSON-LD |
| No sabes que un campo falta hasta que Google avisa | El agente detecta `{{placeholders}}` sin rellenar antes del deploy |

**Por qué importa:** Google muestra estrellas ⭐, precios 💶 y FAQs expandibles en los resultados de búsqueda — pero solo cuando el JSON-LD es correcto y completo. Para un hotel, la diferencia entre aparecer con rich results y sin ellos puede ser un 30% más de CTR. Un `{{VARIABLE}}` en producción es un bug de deploy que silencia toda esa ventaja.
