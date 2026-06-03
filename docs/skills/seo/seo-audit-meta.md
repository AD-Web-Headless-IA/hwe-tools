# SEO audit — Meta tags

> Audits `<title>`, `<meta name="description">`, canonical URL, Open Graph tags, and the `lang` attribute. Run per page — not per block. A page with a perfect hero image and broken meta tags still loses click-through rate.

---

## Trigger

Run when:
- A new client site is set up (first audit, before any deploy).
- `apps/{site}/src/app/layout.tsx` or a page's `generateMetadata()` is added or modified.
- A new page route is created.
- Before first deploy.

---

## Agent

`seo-geo-specialist`

---

## Required reading

| File | What it defines |
|---|---|
| `docs/specs/seo/seo-standards.md` §Titles | Format `{Name} — {Type} {Stars}★ en {Locality}, {Region}`, max 60 chars, uniqueness rules |
| `docs/specs/seo/seo-standards.md` §Meta descriptions | Max 155 chars, must include keyword + location + differentiator + implicit CTA |

---

## Steps

Assumes the dev server is running at `http://localhost:3000`. Run for each page route to audit.

**Step 1 — Fetch the page**
```bash
curl -s http://localhost:3000 -o /tmp/hwp-page.html
```

**Step 2 — Extract and check `<title>`**
```bash
grep -oE '<title>[^<]+</title>' /tmp/hwp-page.html
```
Verify:
- Contains establishment name + type + location.
- Max 60 characters: count with `grep -oP '(?<=<title>)[^<]+' /tmp/hwp-page.html | wc -m`.
- Not a generic default (e.g. "Next.js App" or the site framework name).
- Homepage format: `{Name} — {Type} {Stars}★ en {Locality}, {Region}`.
- Sub-page format: `{Page topic} — {Short name} | {Locality}`.

**Step 3 — Extract and check meta description**
```bash
grep -oE '<meta name="description" content="[^"]*"' /tmp/hwp-page.html
```
Verify:
- Present and not empty.
- Max 155 characters.
- Contains: primary keyword + location + differentiator + implicit CTA.
- Does not repeat the `<title>` verbatim.
- Not generic marketing copy ("Welcome to our site", "Bienvenue").

**Step 4 — Check canonical URL**
```bash
grep -oE '<link rel="canonical"[^>]+>' /tmp/hwp-page.html
```
Must be present on every page and point to the correct absolute URL. Missing = Major.

**Step 5 — Check Open Graph tags**
```bash
grep -oE '<meta property="og:[^"]*" content="[^"]*"' /tmp/hwp-page.html
```
Required five tags:
- `og:title`
- `og:description`
- `og:image` (absolute URL; preferably 1200×630 px WebP)
- `og:type` (`website` for homepage, `article` for blog)
- `og:url`

Missing any of these = Major. `og:image` with a relative URL = Major.

**Step 6 — Check `lang` attribute on `<html>`**
```bash
grep -oE '<html[^>]*>' /tmp/hwp-page.html
```
Must include `lang="{locale}"` (e.g. `lang="fr"`, `lang="es"`, `lang="ca"`). Missing = Blocker. Wrong locale = Major.

---

## Output

```markdown
# SEO Audit — Meta tags: {SiteName} / {PagePath}

**Date:** {YYYY-MM-DD}
**URL audited:** {http://localhost:3000/...}

## Title
| Check | Value | Severity |
|---|---|---|
| Present | `{title content}` | Pass / Blocker |
| Format | Matches `{Name} — {Type} en {Locality}` | Pass / Major |
| Length | {N} chars | Pass (≤60) / Major (>60) |
| Location keyword | Present / Missing | Pass / Major |

## Meta description
| Check | Value | Severity |
|---|---|---|
| Present | `{description content}` | Pass / Blocker |
| Length | {N} chars | Pass (≤155) / Major (>155) |
| Keyword + location | Present / Missing | Pass / Major |
| CTA present | Yes / No | Pass / Minor |
| Not a title copy | Pass / Fail | Pass / Major |

## Canonical
| `<link rel="canonical">` | Present / Missing | Pass / Major |

## Open Graph
| Tag | Present | Value | Severity |
|---|---|---|---|
| `og:title` | Yes / No | `{value}` | Pass / Major |
| `og:description` | Yes / No | `{value}` | Pass / Major |
| `og:image` | Yes / No | `{url}` | Pass / Major |
| `og:type` | Yes / No | `{value}` | Pass / Major |
| `og:url` | Yes / No | `{value}` | Pass / Major |

## Language
| `<html lang>` | `{value}` | Pass / Blocker |

## Verdict
Green / Yellow / Red
```

---

## Fix flow

1. **implementer** updates `generateMetadata()` in the relevant page file or in `layout.tsx` for site-wide defaults.
2. Restart the dev server if `layout.tsx` changed: `pnpm dev`.
3. **seo-geo-specialist** re-runs Steps 2–6.
4. Green verdict required before any page is indexed (add `noindex` in `robots.txt` until resolved if needed).

---

## In simple terms

Como revisar los campos SEO de Yoast antes de publicar en WordPress, pero con formato estandarizado y verificación automática para toda la plataforma:

| Campo | En Yoast (WP) | En HWP |
|---|---|---|
| Título SEO | Campo editable por página en el editor | `generateMetadata()` en Next.js — formato fijado por spec |
| Meta description | Campo editable con semáforo de longitud | Misma lógica, reglas documentadas en `seo-standards.md` |
| Open Graph | Pestaña "Social" de Yoast | `openGraph: {}` en el objeto `metadata` de Next.js |
| Idioma | Gestionado por WPML o Polylang | `lang` en `layout.tsx` — una línea, pero crítica |

**Por qué importa:** el `<title>` es el primer texto que ve Google de una URL — determina si el site aparece en la búsqueda "camping en Roses". La meta description no afecta el ranking pero sí el CTR: una description genérica pierde clics frente a una que menciona "a 500m de la playa".
