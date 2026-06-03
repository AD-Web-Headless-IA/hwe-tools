# SEO standards — hwe hospitality

> Rules for every page, block, and site in the hwe platform. Hospitality SEO is local SEO — 80 % of hotel and camping bookings start with a location search. Every rule here optimises for that intent.
>
> **Always loaded** when the `seo-geo-specialist` agent audits a block or site.

---

## Titles (`<title>`)

- Format: `{Establishment name} — {Type} {Stars}★ en {Locality}, {Region}`
- Max 60 characters (Google truncates at ~60).
- Primary keyword first, location always included.
- No duplicates across pages — every page has a unique title.
- Homepage: full establishment name + type + location.
- Sub-pages: `{Page topic} — {Short establishment name} | {Locality}`.

**Examples (correct):**
```
Camping Sol Mar — Camping 3★ en Roses, Costa Brava
Réservations — Camping Sol Mar | Roses
Hébergements — Balneario Fuente de Cabriel | Cuenca
```

**Anti-patterns (reject):**
```
Camping Sol Mar         ← no type, no location
Réservations            ← no establishment context
Bienvenue sur notre site ← generic, zero keyword value
```

---

## Meta descriptions

- Max 155 characters (Google may truncate at 155–160).
- Must include: primary keyword + location + differentiator + implicit CTA.
- No duplicates — every page has a unique description.
- Do not repeat the title verbatim.
- No H1 copy-paste — description frames the value, title names the entity.

**Examples (correct):**
```
Camping familial 3★ face à la mer en Camargue. Emplacements, bungalows et chalets.
Réservez dès 39 €/nuit. Piscine, accès plage direct, animations enfants.
```

---

## Heading hierarchy

- **One visible `<h1>` per page** — never zero, never two.
- Homepage `<h1>`: establishment name + location (matches the primary keyword).
- Each section/block gets an `<h2>`.
- Subsections within a block get `<h3>`.
- **Never skip levels** — `<h2>` → `<h4>` is a bug.
- `<Navbar>` and `<Footer>` logos / nav links are `<p>` or `<span>`, never `<h1>`/`<h2>`.
- The `<h1>` must be in the `<main>` content area, not in `<header>`.

---

## Images

- **Alt text** — descriptive, in the site's language (not English for a French camping):
  - Hero image: `{scene description} au {establishment name}` (e.g. `Piscine extérieure au Camping Sol Mar`)
  - Accommodation image: `{type} pour {capacity} personnes — {establishment name}`
  - Decorative images: `alt=""` + `aria-hidden="true"`
- **Dimensions** — `width` and `height` attributes always explicit (prevents CLS).
- **Lazy loading** — `loading="lazy"` on all images except the hero.
- **Hero** — `loading="eager"` + `fetchpriority="high"`.
- **Format** — WebP or AVIF preferred; fallback JPEG. No PNG for photos.
- **Filename** — descriptive kebab-case: `piscine-camping-sol-mar.webp`, not `IMG_4521.jpg`.

---

## Links

- **Descriptive text** — never "cliquez ici", "click here", "lire la suite".
- **External links** with `target="_blank"` must have `rel="noopener noreferrer"`.
- **Internal navigation** uses `<a>`, not `<button>` or `<div onClick>`.
- **Breadcrumbs** use `<nav aria-label="Breadcrumb">` + `BreadcrumbList` JSON-LD.

---

## URLs

- Slugs in the site's language (`hebergements/bungalow-3-pieces`, not `accommodations/3-room-bungalow`).
- Kebab-case, lowercase, no special characters.
- Max 3 path levels: `/{locale}/{section}/{item}`.
- Canonical `<link rel="canonical">` on every page.

---

## Indexation

- `robots.txt` at the root — disallow `/api/`, `/admin/`, `/uploads/private/`.
- `sitemap.xml` — include all indexable pages, exclude filtered/paginated variants.
- Do **not** index: filter result pages, paginated pages beyond page 1, internal search results.
- `hreflang` when the site has multiple languages — one tag per language per URL pair.

---

## In simple terms

Piensa en estas reglas como la lista de comprobación que hace tu cliente de WordPress antes de publicar una página:

| En WordPress (manual)... | En hwe (automatizado por seo-geo-specialist)... |
|---|---|
| Escribes el título SEO en Yoast | El title sigue el formato `{Nombre} — {Tipo} en {Localidad}` |
| Escribes la meta description | Máx 155 chars, keyword + localización + CTA |
| Revisas que no haya dos H1 | El agente audita la jerarquía de headings |
| Añades alt a las imágenes | Alt descriptivo en el idioma del site, siempre |
| Configuras el sitemap | sitemap.xml, canonical, robots.txt — requisito de lanzamiento |

**Impacto día a día:** cuando el agente `seo-geo-specialist` audita un bloque, verifica todas estas reglas y reporta lo que falta como Blocker, Major o Minor.
