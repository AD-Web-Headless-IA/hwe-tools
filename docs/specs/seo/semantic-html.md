# Semantic HTML standards

> Rules for meaningful HTML structure in every block and layout component. Semantic HTML is the foundation of both SEO and accessibility — a `<div>` where a `<section>` should be is a finding, not a preference.
>
> **Always loaded** by `seo-geo-specialist` during block audits.

---

## Required landmark elements

| Element | Use case | Notes |
|---|---|---|
| `<header>` | Site navigation wrapper (`<SiteShell>` top) | One `<header>` per page at the top level |
| `<nav>` | Navigation menus | Must have `aria-label` to distinguish multiple navs (e.g. `aria-label="Primary navigation"`, `aria-label="Footer navigation"`) |
| `<main>` | Page content area | One `<main>` per page; wraps everything below `<header>` and above `<footer>` |
| `<section>` | Thematic content section (HeroBlock, BookingBlock…) | Must have `aria-labelledby` pointing to its heading, or `aria-label` if no heading |
| `<article>` | Self-contained content (accommodation cards, review items) | Can stand alone and still make sense out of context |
| `<footer>` | Site footer (`<SiteShell>` bottom) | One `<footer>` per page at the top level |
| `<address>` | Physical address, phone, email of the establishment | Use inside `<footer>` or contact section |
| `<blockquote>` | Guest reviews and testimonials | Add `cite` attribute when source URL is known |
| `<time>` | Dates — check-in dates, event dates, review dates | Always include `datetime` attribute in machine-readable format: `<time datetime="2026-07-15">15 juillet 2026</time>` |

---

## The no-div rule

Do not use `<div>` when a semantic element applies:

| Instead of... | Use... |
|---|---|
| `<div class="nav">` | `<nav aria-label="...">` |
| `<div class="header">` | `<header>` |
| `<div class="footer">` | `<footer>` |
| `<div class="section">` | `<section aria-labelledby="...">` |
| `<div class="card">` (accommodation) | `<article>` |
| `<div class="address">` | `<address>` |
| `<div class="review">` | `<blockquote>` |
| `<div class="date">` | `<time datetime="...">` |
| `<div onClick={...}>` (navigation) | `<a href="...">` |
| `<div onClick={...}>` (action) | `<button type="button">` |

`<div>` and `<span>` are correct for layout-only wrappers where no semantic meaning applies.

---

## Per-block semantic requirements

| Block | Required elements | Notes |
|---|---|---|
| `HeroBlock` | `<section aria-labelledby="hero-heading">`, `<h1>` (homepage) or `<h2>` (interior page), `<img>` with descriptive `alt` | `<h1>` only on homepage; all other pages get `<h2>` |
| `BookingBlock` | `<section aria-labelledby="booking-heading">`, `<form>`, `<label>` for each input, `<button type="submit">` | No `<div role="button">` for the submit action |
| `AccommodationGrid` | `<section aria-labelledby="accom-heading">`, `<ul>` or grid container, `<article>` per card, `<h3>` per card name | Cards are self-contained → `<article>` |
| `AmenitiesBlock` | `<section aria-labelledby="amenities-heading">`, `<ul>` for the list, `<li>` per amenity | Not `<div>` soup |
| `ReviewsBlock` | `<section aria-labelledby="reviews-heading">`, `<ul>` of reviews, `<article>` or `<li>` per review, `<blockquote>` for review text | Include `AggregateRating` JSON-LD |
| `MediaText` | `<section aria-labelledby="mediatext-heading">`, `<figure>` + `<figcaption>` for image | `<figcaption>` visible caption or empty if covered by `alt` |
| `SiteNavigation` | `<header>`, `<nav aria-label="Primary navigation">`, `<ul>` for nav items | Logo is `<a>` wrapping `<img>` with `alt="{establishment name}"` |
| `SiteFooter` | `<footer>`, `<nav aria-label="Footer navigation">`, `<address>` for NAP | Footer logo same as navbar |

---

## In simple terms

El HTML semántico es como los titulares y párrafos de un periódico: si todo fuera el mismo tamaño y tipo de texto, el lector (y Google) no sabría qué es importante.

| En WordPress (PHP)... | En hwe (React)... |
|---|---|
| `<div class="entry-content">` | `<main>` |
| `<div class="widget-area">` | `<aside>` |
| `<div class="site-header">` | `<header>` |
| Cards de alojamiento como `<div>` | `<article>` (se puede leer de forma independiente) |
| La dirección del camping en un `<p>` | `<address>` |

**Impacto día a día:** cuando crees un bloque nuevo, mira la tabla de arriba y usa el elemento semántico correcto desde el principio. El revisor lo comprobará, y el `seo-geo-specialist` lo auditará antes de que el bloque llegue a `beta`.
