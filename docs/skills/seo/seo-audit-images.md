# SEO audit — Images

> Audits every `<img>` on the page: alt text quality, explicit dimensions, loading strategy, hero optimisation, and file format. Image issues are among the most common Blockers on hospitality sites — a hotel without proper hero optimisation can have an LCP above 4 seconds.

---

## Trigger

Run when:
- A block with images is created or modified (`HeroBlock`, `AccommodationGrid`, `MediaText`).
- New images are added to a client composition.
- Tokens or the image pipeline changes.
- Before first deploy.

---

## Agent

`seo-geo-specialist`

---

## Required reading

| File | What it defines |
|---|---|
| `docs/specs/seo/seo-standards.md` §Images | Alt text rules, explicit dimensions, lazy/eager loading, filename conventions, WebP preference |
| `docs/specs/seo/performance-seo.md` §LCP | Hero `loading="eager"`, `fetchpriority="high"`, `<link rel="preload">`, 200 KB max |

---

## Steps

Assumes the dev server is running at `http://localhost:3000`.

**Step 1 — Fetch the page**
```bash
curl -s http://localhost:3000 -o /tmp/hwe-page.html
```

**Step 2 — Extract all img tags**
```bash
grep -oE '<img[^>]+>' /tmp/hwe-page.html
```
Build an inventory of every image — record `src`, `alt`, `width`, `height`, `loading`, and `fetchpriority` for each one.

**Step 3 — Check alt text on every img**
```bash
grep -oE 'alt="[^"]*"' /tmp/hwe-page.html
```
For each `<img>`:
- `alt` attribute must be present.
- For content images: must be descriptive, in the site's language (not English for a French or Spanish site). Never "image", "photo", "img", a filename, or an empty string.
- Hero format: `{scene description} at {establishment name}` (e.g. `Piscine extérieure au Camping Sol Mar`).
- Accommodation format: `{type} pour {capacity} personnes — {establishment name}`.
- Decorative images only: `alt=""` is valid **only** when `aria-hidden="true"` is also present.

**Step 4 — Check explicit dimensions on every img (CLS)**
```bash
python3 -c "
import re
imgs = re.findall(r'<img[^>]+>', open('/tmp/hwe-page.html').read())
for img in imgs:
    has_w = 'width=' in img
    has_h = 'height=' in img
    if not has_w or not has_h:
        print('MISSING DIMS:', img[:120])
"
```
Both `width` and `height` must be present on every `<img>`. Missing either one = Major (causes CLS).

**Step 5 — Check loading strategy**
```bash
grep -oE 'loading="[^"]*"' /tmp/hwe-page.html
```
- All images below the fold: `loading="lazy"`.
- Hero image (first large above-fold image): `loading="eager"`. A lazy hero = Major LCP issue.

**Step 6 — Check hero image optimisation (LCP)**
```bash
# Check for preload tag in <head>
python3 -c "
import re
html = open('/tmp/hwe-page.html').read()
head = html[:html.index('</head>')]
preloads = re.findall(r'<link[^>]+rel=[\"\\']preload[\"\\'][^>]+as=[\"\\']image[\"\\'][^>]*>', head)
print(f'Image preloads in head: {len(preloads)}')
for p in preloads: print(' ', p)
"
```
```bash
# Check fetchpriority on hero img
grep -oE '<img[^>]+fetchpriority="high"[^>]*>' /tmp/hwe-page.html
```
Hero `<img>` must have `fetchpriority="high"`. A `<link rel="preload" as="image">` must exist in `<head>`. Both missing = Major.

> When using Next.js `<Image priority>` prop, both preload and fetchpriority are added automatically. Verify the prop is set on the hero `<Image>` component.

**Step 7 — Check image format**
```bash
grep -oE 'src="[^"]*\.(png|jpg|jpeg|gif|bmp)[^"]*"' /tmp/hwe-page.html
```
- JPEG for photos = Minor (should be WebP or AVIF).
- PNG for photos = Major (much larger file size).
- GIF for animation = Blocker (use CSS animation or `<video muted loop>`).
- PNG for logos with transparency = acceptable.

**Step 8 — Check filenames are descriptive**
```bash
grep -oE 'src="[^"]*"' /tmp/hwe-page.html | grep -iE 'img_[0-9]+|dsc[0-9]+|photo[0-9]+|image[0-9]+'
```
Filenames like `IMG_4521.jpg` or `photo001.webp` = Minor. Must be kebab-case and descriptive: `piscine-camping-sol-mar.webp`.

---

## Output

```markdown
# SEO Audit — Images: {BlockName or PageName}

**Date:** {YYYY-MM-DD}
**URL audited:** {http://localhost:3000/...}

## Image inventory
| # | src (truncated) | alt | width | height | loading | fetchpriority | format |
|---|---|---|---|---|---|---|---|
| 1 | hero.webp | ✓ descriptive | ✓ | ✓ | eager | high | WebP ✓ |
| 2 | room.jpg | ✗ empty | ✓ | ✗ | lazy | — | JPEG ⚠ |

## Findings
| Image | Issue | Severity |
|---|---|---|
| room.jpg | Missing `height` attribute | Major |
| room.jpg | JPEG format — convert to WebP | Minor |
| room.jpg | Empty `alt` without `aria-hidden="true"` | Blocker |

## Hero image check
| Check | Result | Severity |
|---|---|---|
| `loading="eager"` | Pass / Fail | Pass / Blocker |
| `fetchpriority="high"` | Pass / Fail | Pass / Major |
| `<link rel="preload" as="image">` in head | Pass / Missing | Pass / Major |
| Format WebP / AVIF | Pass / JPEG / PNG | Pass / Minor / Major |

## Verdict
Green / Yellow / Red
```

---

## Fix flow

1. **implementer** fixes each finding in the block's `.tsx` file:
   - Alt text: update the `alt` prop value to be descriptive.
   - Dimensions: add `width` and `height` attributes.
   - Hero: add `priority` prop to Next.js `<Image>` (automatically sets `loading="eager"`, `fetchpriority="high"`, and adds `<link rel="preload">`).
   - Format: convert images to WebP using the project's image pipeline or replace the `src`.
2. **seo-geo-specialist** re-runs Steps 2–8 after fixes.

---

## In simple terms

Como revisar la librería multimedia de WordPress antes de publicar — pero con reglas explícitas y sin depender de plugins:

| Regla | Por qué importa |
|---|---|
| Alt descriptivo en el idioma del site | Google indexa imágenes por el alt. "Foto del camping" no posiciona para ningún keyword |
| `width` y `height` explícitos | Sin ellos, la página "salta" al cargar las imágenes — Google penaliza ese movimiento (CLS) |
| Hero con `eager` + `fetchpriority` + `preload` | Sin estos tres atributos, Google mide el LCP como el tiempo hasta que carga el hero — puede ser >4s |
| WebP en lugar de JPEG/PNG | Las mismas imágenes pesan 30–50% menos — el site carga antes y Google lo valora |
| Filenames descriptivos | `piscine-sol-mar.webp` puede aparecer en Google Images buscando "piscine camping"  |

**Equivalente WordPress:** como tener Imagify + SEO Image Optimizer configurados correctamente. En hwe, las reglas están en los contratos de bloque — el agente verifica que el developer las ha seguido antes de que el bloque llegue a producción.
