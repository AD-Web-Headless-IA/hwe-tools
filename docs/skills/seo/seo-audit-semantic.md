# SEO audit — Semantic HTML

> Checks that every block uses meaningful HTML elements — headings in order, landmarks present, no `<div>` where semantic elements apply. This is the baseline audit for every new block before it can advance past `alpha`.

---

## Trigger

Run after:
- A new block is created or its JSX structure changes.
- `HeroBlock`, `SiteNavigation`, `SiteFooter`, or any layout component is modified.
- Before a block advances from `alpha` to `beta` (STD-AGENT-SEO gate).

---

## Agent

`seo-geo-specialist` — invoke after `reviewer` approves the block diff, or as a standalone call during block creation.

---

## Required reading

Load before auditing:

| File | What it defines |
|---|---|
| `docs/specs/seo/semantic-html.md` | Landmark elements table, no-div rule, per-block semantic requirements |
| `docs/specs/seo/seo-standards.md` §Heading hierarchy | One h1 rule, heading order, h1 must be in `<main>` not `<header>` |

---

## Steps

Assumes the dev server is running at `http://localhost:3000`. Adjust the URL for sub-pages.

**Step 1 — Fetch the rendered HTML**
```bash
curl -s http://localhost:3000 -o /tmp/hwe-page.html
```

**Step 2 — Count H1 elements (must be exactly 1)**
```bash
grep -c '<h1' /tmp/hwe-page.html
```
Expected: `1`. Zero = Blocker (no page heading). Two or more = Blocker (duplicate H1).

**Step 3 — Extract all heading tags and inspect hierarchy**
```bash
grep -oE '<h[1-6][^>]*>' /tmp/hwe-page.html
```
Verify: sequence starts at `h1`, each level increments by one. A jump from `h2` to `h4` is a Blocker.

**Step 4 — Verify landmark elements are present**
```bash
grep -oE '<(header|nav|main|section|article|footer)[^>]*>' /tmp/hwe-page.html
```
Required per page: at least one `<header>`, one `<nav>`, one `<main>`, one `<footer>`. Flag any missing landmark as a Blocker.

**Step 5 — Check every `<nav>` has `aria-label`**
```bash
grep -oE '<nav[^>]*>' /tmp/hwe-page.html
```
Every `<nav>` must include `aria-label="..."` (e.g. `aria-label="Primary navigation"`, `aria-label="Footer navigation"`). Missing `aria-label` = Major.

**Step 6 — Check every `<section>` has `aria-labelledby` or `aria-label`**
```bash
grep -oE '<section[^>]*>' /tmp/hwe-page.html
```
Every `<section>` must include either `aria-labelledby="{heading-id}"` or `aria-label="..."`. Missing = Major.

**Step 7 — Detect no-div violations**
```bash
grep -oE '<div[^>]*class="[^"]*"' /tmp/hwe-page.html | grep -iE 'nav|header|footer|section|card|address|review|date'
```
Any match indicates a `<div>` used where a semantic element applies. Cross-reference `docs/specs/seo/semantic-html.md §The no-div rule` for the correct replacement.

**Step 8 — Per-block check against the requirements table**
Read `docs/specs/seo/semantic-html.md §Per-block semantic requirements`. For the specific block being audited, verify each required element is present with the correct attributes (e.g. `HeroBlock` must have `<section aria-labelledby="hero-heading">` and `<h1>` only on the homepage).

---

## Output

```markdown
# SEO Audit — Semantic HTML: {BlockName or PageName}

**Date:** {YYYY-MM-DD}
**URL audited:** {http://localhost:3000/...}

## Heading hierarchy
| Check | Value | Severity |
|---|---|---|
| H1 count | {N} | Pass (=1) / Blocker (≠1) |
| Sequence | h1→h2→h3 / h2→h4 skip | Pass / Blocker |
| H1 location | Inside `<main>` / In `<header>` | Pass / Major |

## Landmarks
| Element | Present | Attribute | Severity |
|---|---|---|---|
| `<header>` | Yes / No | — | Pass / Blocker |
| `<nav>` | Yes / No | aria-label ✓/✗ | Pass / Major |
| `<main>` | Yes / No | — | Pass / Blocker |
| `<footer>` | Yes / No | — | Pass / Blocker |
| `<section>` (per block) | Yes / No | aria-labelledby ✓/✗ | Pass / Major |

## No-div violations
| Element found | Should be | File | Severity |
|---|---|---|---|
| `<div class="nav">` | `<nav aria-label="...">` | SiteNavigation.tsx:42 | Blocker |

## Per-block requirements
| Block | Requirement | Status |
|---|---|---|
| HeroBlock | `<section aria-labelledby="hero-heading">` | Pass / Fail |
| HeroBlock | `<h1>` on homepage only | Pass / Fail |

## Verdict
**Green** — no Blockers or Majors.
**Yellow** — Minor findings only; block may advance with ticket open.
**Red** — Blocker or Major present; block cannot advance.
```

---

## Fix flow

1. **implementer** reads the findings and fixes the JSX in the block file.
2. Runs the test suite: `pnpm test --filter @hwe/core-ui`.
3. **seo-geo-specialist** re-runs Steps 2–8 after the fix is pushed.
4. Green verdict required for the block to advance to `beta`.
5. If the fix requires changing a block's contract (e.g. adding a new required prop for `aria-labelledby`), escalate to **architect** first.

---

## In simple terms

Como la checklist de accesibilidad de Yoast antes de publicar en WordPress, pero ejecutada por un agente antes de que el bloque llegue a producción:

| Qué verifica | Equivalente WP |
|---|---|
| Un solo H1 por página | Yoast "Multiple H1 detected" warning |
| `<nav>` con `aria-label` | Menú accesible — sin plugin equivalente en WP |
| `<section>` con `aria-labelledby` | Sin equivalente — regla nueva en hwe |
| No divs donde haya semántica | Tema bien codificado vs plantilla genérica |

**Por qué importa:** Google entiende la página a través de los elementos semánticos. Un `<main>` le indica dónde está el contenido principal. Un `<nav>` le dice que hay navegación. Sin estos elementos, el crawler adivina — y penaliza cuando adivina mal.
