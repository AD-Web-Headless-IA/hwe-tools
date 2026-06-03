# SEO audit — Local SEO

> Audits NAP consistency, geo coordinates, location keywords, proximity phrases, and hreflang. Local SEO drives direct bookings — a guest searching "camping near Roses" must find our client before finding Booking.com.

---

## Trigger

Run when:
- A new client site is set up (required before first deploy).
- NAP data in `client.config.ts` changes.
- `SiteNavigation` or `SiteFooter` components are modified.
- JSON-LD schemas are updated.
- The client's Google Business Profile changes (name, address, or phone).

---

## Agent

`seo-geo-specialist`

---

## Required reading

| File | What it defines |
|---|---|
| `docs/specs/seo/local-seo.md` | NAP consistency rules, address format, geo coordinates (4 decimal places), location keywords placement, proximity phrases, hreflang rules |

---

## Steps

Assumes the dev server is running at `http://localhost:3000`.

**Step 1 — Fetch the page**
```bash
curl -s http://localhost:3000 -o /tmp/hwe-page.html
```

**Step 2 — Extract NAP from the `<header>` area**
```bash
python3 -c "
import re
html = open('/tmp/hwe-page.html').read()
m = re.search(r'<header[^>]*>(.*?)</header>', html, re.DOTALL)
if m:
    text = re.sub('<[^>]+>', ' ', m.group(1))
    print('HEADER TEXT:', ' '.join(text.split())[:400])
"
```
Record: establishment name spelling, phone number format.

**Step 3 — Extract NAP from the `<footer>` / `<address>` element**
```bash
python3 -c "
import re
html = open('/tmp/hwe-page.html').read()
m = re.search(r'<footer[^>]*>(.*?)</footer>', html, re.DOTALL)
if m:
    addr = re.search(r'<address[^>]*>(.*?)</address>', m.group(1), re.DOTALL)
    if addr:
        text = re.sub('<[^>]+>', ' ', addr.group(1))
        print('FOOTER <address>:', ' '.join(text.split()))
    else:
        text = re.sub('<[^>]+>', ' ', m.group(1))
        print('FOOTER (no <address> found):', ' '.join(text.split())[:400])
"
```

**Step 4 — Extract NAP from JSON-LD**
```bash
python3 -c "
import re, json
html = open('/tmp/hwe-page.html').read()
schemas = re.findall(r'<script[^>]+type=[\"\'\"']application/ld\+json[\"\'\"'][^>]*>(.*?)</script>', html, re.DOTALL)
for s in schemas:
    d = json.loads(s.strip())
    items = d.get('@graph', [d]) if isinstance(d, dict) else [d]
    for item in items:
        if item.get('@type') in ('Campground', 'Hotel', 'Organization', 'LodgingBusiness'):
            print('Type:', item.get('@type'))
            print('Name:', item.get('name'))
            print('Telephone:', item.get('telephone'))
            addr = item.get('address', {})
            print('Address:', json.dumps(addr, indent=2))
            print()
"
```

**Step 5 — Verify NAP consistency across all three sources**
Compare header / footer / JSON-LD side by side:
- **Name**: must be identical in all three. "Camping Sol Mar" ≠ "Camping Sol-Mar" ≠ "Sol Mar Camping". Any variation = Blocker.
- **Phone**: must use the same international format everywhere: `+34 972 123 456`. Mixing formats (dots, dashes, spaces) = Major.
- **Address**: must follow the defined format (`docs/specs/seo/local-seo.md §Address format`). Different format between footer and JSON-LD = Major.

**Step 6 — Verify geo coordinates in JSON-LD**
```bash
python3 -c "
import re, json
html = open('/tmp/hwe-page.html').read()
schemas = re.findall(r'<script[^>]+type=[\"\'\"']application/ld\+json[\"\'\"'][^>]*>(.*?)</script>', html, re.DOTALL)
for s in schemas:
    d = json.loads(s.strip())
    items = d.get('@graph', [d]) if isinstance(d, dict) else [d]
    for item in items:
        geo = item.get('geo', {})
        if geo:
            lat = str(geo.get('latitude', ''))
            lng = str(geo.get('longitude', ''))
            lat_dec = len(lat.split('.')[-1]) if '.' in lat else 0
            lng_dec = len(lng.split('.')[-1]) if '.' in lng else 0
            print(f'lat={lat} ({lat_dec} decimals), lng={lng} ({lng_dec} decimals)')
"
```
Must have at least 4 decimal places. Fewer = Major. Missing geo entirely = Blocker.

**Step 7 — Check location keywords in title, H1, and meta description**
```bash
grep -oE '<title>[^<]+</title>' /tmp/hwe-page.html
grep -oE '<meta name="description" content="[^"]*"' /tmp/hwe-page.html
grep -oE '<h1[^>]*>[^<]+</h1>' /tmp/hwe-page.html
```
Each of the three must contain the city name and/or region. Missing location in any of these = Major.

**Step 8 — Check first paragraph for location and proximity keywords**
```bash
python3 -c "
import re
html = open('/tmp/hwe-page.html').read()
m = re.search(r'<main[^>]*>(.*)', html, re.DOTALL)
if m:
    p = re.search(r'<p[^>]*>([^<]+)</p>', m.group(1))
    if p:
        print('First paragraph:', p.group(1)[:400])
"
```
Verify:
- City name present.
- At least one proximity phrase: distance to beach, nearest city, or major attraction.
- See `docs/specs/seo/local-seo.md §Proximity keywords` for expected patterns.

**Step 9 — Check hreflang (only if i18n is active)**
```bash
grep -oE '<link[^>]+hreflang[^>]+>' /tmp/hwe-page.html
```
If `client.config.ts → i18n.defaultLocale` is set (multilingual site):
- One `<link rel="alternate" hreflang="{lang}" href="{url}">` per language per page.
- One self-referencing tag for the current page's language.
- One `hreflang="x-default"` pointing to the default locale version.
Missing any of these on a multilingual site = Blocker.

---

## Output

```markdown
# SEO Audit — Local SEO: {SiteName} / {PagePath}

**Date:** {YYYY-MM-DD}
**URL audited:** {http://localhost:3000/...}

## NAP consistency
| Source | Name | Phone | Address |
|---|---|---|---|
| Header | `{value}` | `{value}` | `{value}` |
| Footer `<address>` | `{value}` | `{value}` | `{value}` |
| JSON-LD | `{value}` | `{value}` | `{value}` |
| **Match** | Pass / Blocker | Pass / Major | Pass / Major |

## Geo coordinates
| Field | Value | Decimal places | Severity |
|---|---|---|---|
| latitude | `{value}` | {N} | Pass (≥4) / Major (<4) / Blocker (missing) |
| longitude | `{value}` | {N} | Pass (≥4) / Major (<4) / Blocker (missing) |

## Location keywords
| Element | City | Region | Severity |
|---|---|---|---|
| `<title>` | ✓ / ✗ | ✓ / ✗ | Pass / Major |
| `<h1>` | ✓ / ✗ | ✓ / ✗ | Pass / Major |
| `<meta description>` | ✓ / ✗ | ✓ / ✗ | Pass / Major |
| First `<p>` | ✓ / ✗ | ✓ / ✗ | Pass / Minor |

## Proximity keywords
| Phrase | Found in | Severity |
|---|---|---|
| Distance to beach | First paragraph | Pass |
| Distance to {City} | Missing | Minor |

## hreflang (if i18n active)
| Language tag | Present | Severity |
|---|---|---|
| `es` | Yes / No | Pass / Blocker |
| `fr` | Yes / No | Pass / Blocker |
| `x-default` | Yes / No | Pass / Blocker |

## Verdict
Green / Yellow / Red
```

---

## Fix flow

1. **NAP inconsistency**: **implementer** ensures all components read from `client.config.ts` — no hardcoded name, address, or phone in any component. If `SiteFooter` or `SiteNavigation` has hardcoded NAP, replace with props sourced from `client.config.ts`.
2. **Geo coordinates**: verify against Google Maps before updating `client.config.ts`. Use 4+ decimal places.
3. **Location keywords**: if missing from body copy, this is a content task — coordinate with the client or content writer to update the composition's text content.
4. **hreflang**: **implementer** adds `<link rel="alternate" hreflang>` tags in `layout.tsx` using the locale list from `client.config.ts → i18n`.
5. **seo-geo-specialist** re-runs Steps 2–9 after all fixes are applied.

---

## In simple terms

Como revisar si el NAP de un site WordPress está configurado consistentemente, pero en automático y antes del deploy:

| Regla | Por qué importa |
|---|---|
| NAP idéntico en header, footer y JSON-LD | Google fusiona las señales — diferencias crean entidades duplicadas y penalizan la confianza local |
| Coordenadas con 4 decimales | 3 decimales = precisión de 100 m. 4 decimales = 10 m. Google Maps y los LLMs esperan 4 |
| Ciudad en title + H1 + description | Son las 3 señales de relevancia local más fuertes para búsquedas orgánicas |
| Frases de proximidad en el primer párrafo | Capturan "cerca de" y "a X km de" — las búsquedas más frecuentes en hospitality |

**Equivalente WordPress:** como la auditoría de Yoast Local SEO + Google Business Profile checker combinados, ejecutada por el agente `seo-geo-specialist` antes de cada deploy del cliente.
