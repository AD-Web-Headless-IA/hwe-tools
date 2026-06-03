# Performance SEO — Core Web Vitals

> Core Web Vitals are a Google ranking factor since 2021. Poor scores cost rankings and conversions — a 1-second LCP delay reduces conversions by ~7 % in hospitality. These rules are the minimum to stay in the green zone.
>
> **Load when:** implementing or auditing the hero image, booking widget, fonts, or any above-the-fold content.

---

## LCP — Largest Contentful Paint (`< 2.5 s`)

The LCP element is almost always the **hero image** on hospitality pages.

Rules:
- Hero image must have `loading="eager"` and `fetchpriority="high"` — never `loading="lazy"`.
- Preload the hero image in `<head>`:
  ```html
  <link rel="preload" as="image" href="/hero.webp" fetchpriority="high" />
  ```
- Use Next.js `<Image>` with `priority` prop for the hero — this automatically adds the preload.
- Serve in WebP or AVIF format — typically 30–50 % smaller than JPEG at the same quality.
- Hero image max file size after optimisation: **200 KB** at 1440 px wide.
- Do not place the hero image behind a lazy-loaded carousel or JS-rendered component — LCP requires the element to be in the initial HTML.

---

## CLS — Cumulative Layout Shift (`< 0.1`)

Layout shifts happen when content moves after the page loads — most commonly caused by images without dimensions and web fonts loading late.

Rules:
- **Every `<img>` tag must have explicit `width` and `height` attributes** matching the rendered size. Next.js `<Image>` enforces this automatically.
- **Fonts** — use `font-display: swap` in `@font-face` and preload the heading font:
  ```html
  <link rel="preload" as="font" type="font/woff2"
        href="/fonts/heading.woff2" crossorigin="anonymous" />
  ```
- No content injected above the fold after page load (banners, consent bars that push content down must reserve space with CSS before they appear).
- Skeleton screens or fixed-height placeholders for any dynamically loaded content.

---

## INP — Interaction to Next Paint (`< 200 ms`)

INP measures how quickly the page responds to user interactions. The booking widget is the critical path.

Rules:
- The booking form toggle (mobile) must respond in `< 200 ms`. Use `<button>` (not `<div onClick>`) — browsers optimise native button interactions.
- Heavy computations (availability calendar, price calculation) must run in a `useTransition` or `startTransition` to avoid blocking the main thread.
- No large JavaScript bundles loaded synchronously before the booking widget is interactive.
- Avoid `setTimeout`/`setInterval` polling — use event-driven updates.

---

## Font preloading

```html
<!-- In <head> — before any stylesheet -->
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link
  rel="preload"
  as="font"
  type="font/woff2"
  href="/fonts/{heading-font}.woff2"
  crossorigin="anonymous"
/>
```

Self-hosted fonts (in `public/fonts/`) are preferred over Google Fonts CDN — avoids the DNS lookup and eliminates the FOUT risk from an external CDN.

---

## Lighthouse CI thresholds (enforced in CI)

| Metric | Target | Fail threshold |
|---|---|---|
| LCP | < 1.8 s | > 2.5 s |
| CLS | < 0.05 | > 0.1 |
| INP | < 100 ms | > 200 ms |
| Performance score | ≥ 90 | < 80 |

CI fails below the fail threshold; a warning is raised between target and fail threshold.

---

## In simple terms

Los Core Web Vitals son la nota de performance que Google usa como factor de ranking. Un site lento pierde posiciones aunque el contenido sea perfecto.

| Métrica | Qué mide | Causa más frecuente en hospitality |
|---|---|---|
| LCP | Cuánto tarda en verse la imagen principal | Foto del hero sin preload o en formato PNG |
| CLS | Cuánto salta el contenido mientras carga | Imágenes sin `width`/`height`, fuentes sin swap |
| INP | Cuánto tarda el botón de reserva en responder | Widget de booking bloqueando el hilo principal |

**Equivalente WordPress:** como tener WP Super Cache + Imagify + OMGF instalados. Aquí las reglas están integradas en los contratos de bloque — el `<Image>` de Next.js las aplica automáticamente si sigues el contrato.
