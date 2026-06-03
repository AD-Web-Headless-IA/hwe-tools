# SEO audit — GEO / LLM optimisation

> Audits whether the page is citable by AI assistants (ChatGPT, Perplexity, Gemini). When a user asks "best camping in Costa Brava with pool", our client should appear in the generated answer — not just in the Google blue links.

---

## Trigger

Run when:
- A new client homepage or accommodation page is set up.
- The hero section, first paragraph, or FAQPage structured data is added or modified.
- `sameAs` links in `client.config.ts` are updated.
- Before first deploy.
- When the client updates their Google Business Profile or social profiles.

---

## Agent

`seo-geo-specialist`

---

## Required reading

| File | What it defines |
|---|---|
| `docs/specs/seo/geo-llm-optimization.md` | Citable first paragraph rule, entity naming consistency, JSON-LD in `<head>`, `@graph` pattern, FAQPage rules (3–5 questions, third person), proximity in `additionalProperty`, freshness via `dateModified`, `sameAs` authority signals, SSR requirement |

---

## Steps

Assumes the dev server is running at `http://localhost:3000`.

**Step 1 — Fetch the rendered HTML (SSR check)**
```bash
curl -s http://localhost:3000 -o /tmp/hwe-page.html
```
Verify the HTTP response contains JSON-LD (SSR check):
```bash
grep -c 'application/ld+json' /tmp/hwe-page.html
```
Count must be > 0. A count of 0 = Blocker (JSON-LD injected client-side — LLM crawlers cannot read it).

**Step 2 — Extract and evaluate the first paragraph (citability)**
```bash
python3 -c "
import re
html = open('/tmp/hwe-page.html').read()
m = re.search(r'<main[^>]*>(.*)', html, re.DOTALL)
if m:
    p = re.search(r'<p[^>]*>(.*?)</p>', m.group(1), re.DOTALL)
    if p:
        text = re.sub('<[^>]+>', '', p.group(1)).strip()
        print('First paragraph:', text[:500])
"
```
The first paragraph must:
- Name the establishment with its exact name from `client.config.ts → name`.
- State the type explicitly: "camping", "hôtel", "balneario" — in the site's language.
- Include the city name and region.
- Include at least one proximity phrase or key feature (pool, beach distance).
- Be written in third person — no "we", "nous", "nosotros".
- Be self-contained: a reader with no page context must understand what and where this is.

**Step 3 — Check meta description is a complete factual sentence (LLM short-answer surface)**
```bash
grep -oE '<meta name="description" content="[^"]*"' /tmp/hwe-page.html
```
The meta description is the surface LLMs use for short answers. Verify:
- Complete factual sentence, not marketing copy ("Discover…", "Welcome to…" = Fail).
- Contains: establishment type + location + 1–2 key differentiators.
- No questions ("Looking for a camping?") — statements only.

**Step 4 — Check entity naming consistency across the page**
```bash
python3 -c "
# Replace EXACT_NAME with the establishment name from client.config.ts
import re
html = open('/tmp/hwe-page.html').read()
text = re.sub('<[^>]+>', ' ', html)
# Look for the exact name
exact = 'EXACT_NAME'  # fill in before running
count = text.count(exact)
print(f'Exact name occurrences: {count}')
"
```
Then search for abbreviated or variant names:
```bash
grep -oiE '[A-Z][a-z]+ [A-Z][a-z]+' /tmp/hwe-page.html | sort | uniq -c | sort -rn | head -20
```
Any abbreviation or alternate spelling of the establishment name (e.g. "CS" for "Camping Sol Mar") = Major. LLMs aggregate entities across sources — inconsistent naming fragments the entity.

**Step 5 — Check FAQPage schema presence and quality**
```bash
python3 -c "
import re, json
html = open('/tmp/hwe-page.html').read()
schemas = re.findall(r'<script[^>]+type=[\"\'\"']application/ld\+json[\"\'\"'][^>]*>(.*?)</script>', html, re.DOTALL)
faq_found = False
for s in schemas:
    d = json.loads(s.strip())
    items = d.get('@graph', [d]) if isinstance(d, dict) else [d]
    for item in items:
        if item.get('@type') == 'FAQPage':
            faq_found = True
            questions = item.get('mainEntity', [])
            print(f'FAQPage: {len(questions)} question(s)')
            for q in questions:
                print(f'  Q: {q.get(\"name\", \"\")}')
                ans = q.get('acceptedAnswer', {}).get('text', '')
                print(f'  A: {ans[:120]}')
if not faq_found:
    print('FAQPage: NOT FOUND')
"
```
Verify:
- FAQPage is present (Major if missing on homepage).
- 3–5 questions — not fewer, not more.
- Questions phrased as a user would ask them in the site's language.
- Answers in third person ("Le camping dispose de…", not "Nous disposons de…"), 2–3 factual sentences.

**Step 6 — Check `sameAs` links in the main schema**
```bash
python3 -c "
import re, json
html = open('/tmp/hwe-page.html').read()
schemas = re.findall(r'<script[^>]+type=[\"\'\"']application/ld\+json[\"\'\"'][^>]*>(.*?)</script>', html, re.DOTALL)
for s in schemas:
    d = json.loads(s.strip())
    items = d.get('@graph', [d]) if isinstance(d, dict) else [d]
    for item in items:
        if item.get('@type') in ('Organization', 'Campground', 'Hotel'):
            same_as = item.get('sameAs', [])
            print(f'{item[\"@type\"]} sameAs: {len(same_as)} link(s)')
            for link in same_as: print(f'  {link}')
"
```
Minimum required: Google Business Profile URL + one OTA (TripAdvisor or Booking.com). Missing = Minor. Both missing = Major. `sameAs` tells LLMs the structured data corresponds to a verified real-world entity.

**Step 7 — Check proximity data in `additionalProperty` (machine-readable proximity)**
```bash
python3 -c "
import re, json
html = open('/tmp/hwe-page.html').read()
schemas = re.findall(r'<script[^>]+type=[\"\'\"']application/ld\+json[\"\'\"'][^>]*>(.*?)</script>', html, re.DOTALL)
for s in schemas:
    d = json.loads(s.strip())
    items = d.get('@graph', [d]) if isinstance(d, dict) else [d]
    for item in items:
        if item.get('@type') in ('Campground', 'Hotel'):
            props = item.get('additionalProperty', [])
            print(f'additionalProperty: {len(props)} entries')
            for p in props: print(f'  {p.get(\"name\")}: {p.get(\"value\")}')
"
```
Must have at least 2 proximity entries (e.g. `distanceToBeach`, `distanceToCity`). Missing = Minor. These entries power "near X" LLM answers.

**Step 8 — Check `dateModified` freshness signal**
```bash
grep -oE '"dateModified"\s*:\s*"[^"]*"' /tmp/hwe-page.html
```
`dateModified` must be present in the main schema and reflect a date within the last 6 months. Missing or stale date = Minor. LLMs prefer content with recent `dateModified`.

---

## Output

```markdown
# SEO Audit — GEO / LLM optimisation: {SiteName} / {PagePath}

**Date:** {YYYY-MM-DD}
**URL audited:** {http://localhost:3000/...}

## SSR check
| JSON-LD in initial HTTP response | Count | Severity |
|---|---|---|
| `application/ld+json` in HTML | {N} | Pass (>0) / Blocker (=0) |

## First paragraph (citability)
| Check | Result | Severity |
|---|---|---|
| Exact establishment name | Present / Missing | Pass / Blocker |
| Type explicit (camping / hotel / …) | Present / Missing | Pass / Major |
| City + region | Present / Missing | Pass / Major |
| Third person (no "we" / "nous") | Pass / Fail | Pass / Minor |
| Proximity phrase or key feature | Present / Missing | Pass / Minor |

## Meta description (LLM short answer)
| Check | Result | Severity |
|---|---|---|
| Complete factual sentence | Pass / Marketing copy | Pass / Major |
| Establishment type + location | Present / Missing | Pass / Major |

## Entity naming consistency
| Exact name occurrences | {N} |
| Alternate spellings found | None / {list} |
| Severity | Pass / Major |

## FAQPage
| Check | Result | Severity |
|---|---|---|
| FAQPage schema present | Yes / No | Pass / Major |
| Number of questions | {N} (target: 3–5) | Pass / Minor |
| Questions in user language | Pass / Fail | Pass / Minor |
| Answers in third person | Pass / Fail | Pass / Minor |

## sameAs links
| Profile | Present | URL |
|---|---|---|
| Google Business Profile | Yes / No | `{url}` |
| TripAdvisor / Booking.com | Yes / No | `{url}` |
| Facebook / Instagram | Yes / No | `{url}` |

## Proximity (additionalProperty)
| Property | Value | Severity |
|---|---|---|
| distanceToBeach | `{value}` / Missing | Pass / Minor |
| distanceTo{City} | `{value}` / Missing | Pass / Minor |

## Freshness
| `dateModified` | Value | Severity |
|---|---|---|
| Present | Yes / No | Pass / Minor |
| Within last 6 months | Yes / No | Pass / Minor |

## Verdict
Green / Yellow / Red
```

---

## Fix flow

1. **First paragraph / entity naming**: content task — coordinate with the client or content writer. The developer updates the text content prop in the composition.
2. **FAQPage**: **implementer** adds or updates the `FAQPage` JSON-LD in `layout.tsx` or the page's Server Component, sourcing questions from the client or `seo-geo-specialist`'s research.
3. **sameAs**: **implementer** adds profile URLs to `client.config.ts → sameAs[]`; the schema template reads from there.
4. **additionalProperty**: **implementer** adds proximity data to `client.config.ts → additionalProperty[]`.
5. **SSR issue**: if JSON-LD count is 0, the schema is in a Client Component — move it to a Server Component or `layout.tsx`.
6. **seo-geo-specialist** re-runs Steps 1–8 after all fixes.

---

## In simple terms

Como el SEO tradicional pero para que ChatGPT y Perplexity te citen cuando alguien pregunta por el mejor camping de la zona:

| Señal de GEO | Qué hace | Por qué importa |
|---|---|---|
| Primer párrafo factual | Es lo que el LLM extrae como respuesta | Sin texto autocontenido, el LLM no puede citar |
| FAQPage con 3–5 preguntas | Activa respuestas directas en LLMs | "¿Hay playa cerca?" → tu camping aparece como respuesta |
| `sameAs` con perfiles verificados | El LLM cruza fuentes — nombres idénticos = entidad real | Google Business + TripAdvisor juntos = señal de confianza |
| `additionalProperty` con distancias | El LLM responde "cerca de" | "camping a 500m de la playa en Roses" → citación directa |
| SSR del JSON-LD | Los crawlers de LLMs leen el HTML inicial | Sin SSR, el JSON-LD es invisible para los crawlers |
| `dateModified` actualizado | El LLM prefiere contenido reciente | Página actualizada hace 3 semanas > página sin fecha |

**Equivalente WordPress:** no tiene equivalente directo — Yoast SEO no hace GEO. Es la capa de SEO avanzado que diferencia a hwe de un site WordPress genérico y que convierte el tráfico de LLMs (creciendo) en fuente de reservas directas.
