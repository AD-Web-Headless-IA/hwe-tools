# SEO audit — Performance (Core Web Vitals)

> Audits the static code signals that determine LCP, CLS, and INP scores. Core Web Vitals are a Google ranking factor — poor scores cost positions even when content is perfect. In hospitality, a 1-second LCP delay reduces conversions by ~7 %.

---

## Trigger

Run when:
- `HeroBlock` or any above-the-fold content is created or modified.
- Fonts are changed in `tokens.json` or `layout.tsx`.
- The booking widget is added or modified.
- Before first deploy.
- When Lighthouse CI reports a regression (score drops below 80).

---

## Agent

`seo-geo-specialist`

---

## Required reading

| File | What it defines |
|---|---|
| `docs/specs/seo/performance-seo.md` | LCP rules (hero eager + preload + 200 KB max), CLS rules (explicit dimensions + font-display swap), INP rules (native button not div), Lighthouse CI thresholds |

---

## Steps

Assumes the dev server is running at `http://localhost:3000`. For accurate Core Web Vitals measurements, also run Lighthouse CI if configured.

**Step 1 — Fetch the rendered HTML**
```bash
curl -s http://localhost:3000 -o /tmp/hwp-page.html
```

**Step 2 — Check hero image preload in `<head>` (LCP signal)**
```bash
python3 -c "
import re
html = open('/tmp/hwp-page.html').read()
head = html[:html.index('</head>')]
preloads = re.findall(r'<link[^>]+rel=[\"\'\"']preload[\"\'\"'][^>]+as=[\"\'\"']image[\"\'\"'][^>]*>', head)
print(f'Image preloads in <head>: {len(preloads)}')
for p in preloads: print(' ', p)
"
```
At least one `<link rel="preload" as="image" fetchpriority="high">` must be in `<head>`. Missing = Major.

> When using Next.js `<Image priority>`, this tag is generated automatically. Verify the hero `<Image>` has the `priority` prop set.

**Step 3 — Check hero `<img>` has `fetchpriority="high"` and `loading="eager"` (LCP signal)**
```bash
python3 -c "
import re
imgs = re.findall(r'<img[^>]+>', open('/tmp/hwp-page.html').read())
for img in imgs[:5]:
    has_priority = 'fetchpriority' in img
    has_eager = 'loading=\"eager\"' in img or \"loading='eager'\" in img
    print(f'fetchpriority={has_priority} eager={has_eager} | {img[:120]}')
"
```
The hero `<img>` (largest above-fold image, typically the first one) must have both. Missing `loading="eager"` on the hero = Blocker. Missing `fetchpriority="high"` = Major.

**Step 4 — Check all images have explicit `width` and `height` (CLS signal)**
```bash
python3 -c "
import re
imgs = re.findall(r'<img[^>]+>', open('/tmp/hwp-page.html').read())
issues = [(i+1, img[:120]) for i, img in enumerate(imgs) if 'width=' not in img or 'height=' not in img]
print(f'Images missing width or height: {len(issues)}')
for n, img in issues: print(f'  #{n}:', img)
"
```
Every `<img>` must have explicit `width` and `height`. Each missing attribute = Major (browser cannot reserve space before the image loads → layout shift).

**Step 5 — Check `font-display: swap` in CSS (CLS signal)**
```bash
grep -rn 'font-display' apps/ packages/ --include='*.css' --include='*.ts' --include='*.tsx' --include='*.mjs' 2>/dev/null
```
Every `@font-face` declaration must include `font-display: swap`. Missing = Major (causes FOUT — Flash of Unstyled Text — which shifts layout).

**Step 6 — Check font preload in `<head>` (CLS signal)**
```bash
python3 -c "
import re
html = open('/tmp/hwp-page.html').read()
head = html[:html.index('</head>')]
font_preloads = re.findall(r'<link[^>]+rel=[\"\'\"']preload[\"\'\"'][^>]+as=[\"\'\"']font[\"\'\"'][^>]*>', head)
print(f'Font preloads in <head>: {len(font_preloads)}')
for p in font_preloads: print(' ', p)
"
```
The heading font must be preloaded in `<head>` with `crossorigin="anonymous"`. Missing = Minor (risk of layout shift on first load).

**Step 7 — Check booking widget uses native `<button>` (INP signal)**
```bash
grep -rn 'div.*onClick\|div.*onPress\|div.*onKeyDown' packages/core-ui/src/base-blocks/BookingBlock/ apps/ 2>/dev/null
```
Any `<div onClick>` or `<div onKeyDown>` in the booking widget = Major. Browsers optimise native `<button>` interactions — `<div onClick>` delays the response by one frame.

**Step 8 — Check for render-blocking scripts in `<head>`**
```bash
python3 -c "
import re
html = open('/tmp/hwp-page.html').read()
head = html[:html.index('</head>')]
blocking = re.findall(r'<script(?![^>]*(async|defer|type=[\"\'\"']module[\"\'\"']))[^>]+src=[^>]+>', head)
print(f'Potentially render-blocking scripts: {len(blocking)}')
for s in blocking: print(' ', s[:100])
"
```
All `<script src>` in `<head>` must have `async`, `defer`, or `type="module"`. Blocking scripts delay first render and inflate LCP.

---

## Output

```markdown
# SEO Audit — Performance (Core Web Vitals): {SiteName} / {PagePath}

**Date:** {YYYY-MM-DD}
**URL audited:** {http://localhost:3000/...}

## LCP signals (hero image)
| Check | Result | Severity |
|---|---|---|
| `<link rel="preload" as="image">` in `<head>` | Pass / Missing | Pass / Major |
| Hero `loading="eager"` | Pass / Missing | Pass / Blocker |
| Hero `fetchpriority="high"` | Pass / Missing | Pass / Major |

## CLS signals (layout stability)
| Check | Count / Result | Severity |
|---|---|---|
| Images missing `width` | {N} | Major per occurrence |
| Images missing `height` | {N} | Major per occurrence |
| `font-display: swap` in CSS | Pass / Missing | Pass / Major |
| Heading font `<link rel="preload">` in `<head>` | Pass / Missing | Pass / Minor |

## INP signals (interaction responsiveness)
| Check | Result | Severity |
|---|---|---|
| Booking toggle: `<button>` not `<div onClick>` | Pass / Fail | Pass / Major |
| No render-blocking `<script>` in `<head>` | Pass / {N} found | Pass / Major |

## Verdict
Green / Yellow / Red

> This audit checks static code signals only. For measured Core Web Vitals, run `pnpm lighthouse` or check Google Search Console CrUX data after deploy.
```

---

## Fix flow

1. **LCP**: add `priority` prop to the `HeroBlock`'s Next.js `<Image>` — this automatically sets `loading="eager"`, `fetchpriority="high"`, and adds `<link rel="preload" as="image">` to `<head>`.
2. **CLS (images)**: add explicit `width` and `height` to every `<img>` — use actual rendered dimensions, not `width="100%"`.
3. **CLS (fonts)**: add `font-display: swap` to every `@font-face` in `globals.css`; add `<link rel="preload" as="font">` to `layout.tsx`.
4. **INP**: replace any `<div onClick>` in the booking widget with `<button type="button">`.
5. **seo-geo-specialist** re-runs Steps 2–8 after all fixes.
6. For Lighthouse CI scores: run `pnpm lighthouse` if configured, or trigger the CI pipeline.

---

## In simple terms

Como revisar WP Rocket + Imagify antes de lanzar un site de WordPress, pero con reglas explícitas en el código y verificadas antes del deploy:

| Core Web Vital | Causa más frecuente en hospitality | Regla HWP |
|---|---|---|
| LCP lento (>2.5s) | Foto del hero sin `preload` ni `fetchpriority` | `<Image priority>` en `HeroBlock` |
| CLS alto (>0.1) | Imágenes sin `width`/`height`, fuentes sin `swap` | Ambos obligatorios en el contrato de bloque |
| INP alto (>200ms) | Widget de reservas con `<div onClick>` | `<button>` siempre para acciones |

**Por qué importa:** Google usa Core Web Vitals como factor de ranking desde 2021. Un site que tarda 4s en mostrar el hero pierde posiciones frente a un competidor con hero en 1.5s — aunque el contenido sea idéntico. En hospitality, cada posición perdida en "camping cerca de Roses" son reservas perdidas a Booking.com.
