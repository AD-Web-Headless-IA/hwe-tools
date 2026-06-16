# THR — Internal notes

Implementation notes, quirks, and operational details for the THR integration.
This file is for the HWE team — not from THR's official docs.

## Script URLs

| Resource | URL | Notes |
|---|---|---|
| **ILib v4 script** ✅ | `https://thelisresa.webcamp.fr/ilib/v4/?<widgets>` | HTTPS. Widgets selected via query flags (`searchengine`, `favorites`→offers, `simpleblock`→onenight, `categories`). HWE composes the URL **once from `tenant.booking.features`** via `buildThrScriptUrl` (DEC-027) — search + favorites converge on one deduped `?searchengine&favorites` script, no per-adapter negotiation. |
| `/ilib/` (no version) | `https://thelisresa.webcamp.fr/ilib/` | Returns the **legacy** `ThelisResa.options` script (200). Not Web Components — **do not use.** |
| Booking tunnel | `https://thelisresa.webcamp.fr/` | Where users land after search. Hosted by THR. |
| Legacy ILib (v1/v2) | `https://ajax.webcamp.fr/ilib/` | **Do not use.** Old global-config pattern. |

Verified 2026-06-12 against the `demosalons` demo account. Config is set via `thelisresa.ilib('camping', <account>)` / `ilib('language', …)` — see [`thr-ilib-v4.md` §1](./thr-ilib-v4.md).

## CSP (Content Security Policy) domains

These domains must be allowed in the client's CSP headers for THR widgets to work:

```
script-src:  thelisresa.webcamp.fr
connect-src: thelisresa.webcamp.fr
frame-src:   thelisresa.webcamp.fr
style-src:   thelisresa.webcamp.fr
img-src:     thelisresa.webcamp.fr
```

**Action:** Add these to the CSP configuration in `next.config.mjs` for clients using THR.
See `docs/specs/security/security-standards.md` and `docs/skills/security/security-audit-headers.md`.

**TODO:** Verify the complete list of domains (CDN, analytics, etc.) that THR loads at runtime. Use browser DevTools Network tab on a live THR widget to capture all external requests.

## CSS override strategy

THR widgets render their own styles with medium-to-high specificity. To match the client's brand:

### Container structure

The adapter wraps the widget element like this:

```html
<section data-engine="thr" data-status="mounted" class="booking-search-block ...">
  <div> <!-- container ref -->
    <thr-search-engine title="..." type="2"></thr-search-engine>
  </div>
</section>
```

### Guidelines

- **Always scope** to `[data-engine="thr"]` — never write naked `.thr-*` selectors.
- **`!important` + extra specificity** — THR's account-theme layer uses `!important` (see "Override pattern" below).
- **Theme tokens only** so overrides adapt per client.
- **Zero CSS in the block component** — all overrides live in the client's `globals.css` (one per client).

The verified render details, class map, and a working override baseline follow.

### How THR renders (verified — ILib v4, 2026-06-12)

- **Light DOM (AngularJS app), not shadow DOM and not an iframe.** The widget injects regular `<div>`/`<select>`/`<button>` inside `<thr-search-engine>` (markers like `ng-scope`, `ng-isolate-scope`). → our `[data-engine="thr"] …` overrides **reach it**.
- **THR ships Bootstrap 3** scoped under a root `.thr` class, **plus a second "account theme" layer** in the same stylesheet that applies the account's configured colours (`color1`/`color2`) **with `!important`** — e.g. `.thr .btn-primary { background-color: <color2> !important }`, `.btn-secondary { <color1> }`, and `.thr .form-control/.thr-select/.thr-range-picker { border-radius: 0 }`.
- **Icons:** Font Awesome (`fas fa-search`, `fa-chevron-down`, `far fa-calendar-alt`, `fa-check`, `fa-long-arrow-alt-right`).
- **Theming is two layers:** (1) account colours `color1`/`color2` configured **in THR's back-office** per client; (2) CSS overrides here for structure/typography/shape. Fix the brand colours at the source (THR panel) AND override structure via CSS.
- **Multisite vs single-site:** a multisite account (e.g. `demosalons`) also renders *Regions* + *Campsites* selectors (`component-multi`); single-site accounts render a simpler tree without them. Style the shared classes below and both work.

### Class map (`<thr-search-engine>`)

| Class | Element |
|---|---|
| `.thr` | root wrapper (when ILib) |
| `.thr-search-engine-multi` · `-main` (+`-full`/`-half`/`-none`) | container + criteria row |
| `.thr-search-engine-{regions,campsites,dates,type,pers,promocode}` | per-field wrappers (`pers` = capacity) |
| `.thr-search-engine-hide-{type,capacity,promocode}` · `-alone-criteria` | layout modifiers |
| `.form-group` + `<label>` | field group + label |
| `.thr-select` · `.thr-select-placeholder` · `.thr-select-options` · `-options-container` · `-option-selected` · `-header` · `-option-disabled` (+ `.active`/`.thr-focus`/`.thr-disabled`) | custom select + dropdown |
| `.thr-range-picker` | date range field |
| `.form-control` | text input (promocode) |
| **`.btn.btn-primary.thr-btn-search`** | **the search submit button** |

### Override pattern (beats THR's `!important`)

Because THR's account-theme layer uses `!important`, overrides must use **`!important` AND extra specificity** (chain a second class, e.g. `.btn.btn-primary`, or `[data-engine="thr"]` + the THR class). Token-driven baseline (see the working copy in `site-demo/src/app/globals.css` §THIRD-PARTY OVERRIDES):

```css
/* labels → eyebrow; inputs/selects/date → hairline+flat; dropdown; submit → brand */
[data-engine="thr"] .form-group label { text-transform: uppercase !important;
  letter-spacing: var(--tracking-eyebrow) !important; color: var(--color-muted-foreground) !important; }
[data-engine="thr"] .thr-select,
[data-engine="thr"] .thr-range-picker,
[data-engine="thr"] .form-control { border: 1px solid var(--color-border) !important;
  border-radius: var(--radius-sm) !important; box-shadow: none !important; font-family: var(--font-ui) !important; }
[data-engine="thr"] .btn.btn-primary,
[data-engine="thr"] .thr-btn-search { background-color: var(--color-primary) !important;
  color: var(--color-primary-foreground) !important; border-radius: var(--radius-md) !important; }
```

> **Note:** captured from ILib **v4** on 2026-06-12. v4 is THR's stable/only version (no v5 planned), so this is fixed — the only caveat is that THR doesn't *publish* its class names, so they were read from the live widget.

### Class map (`<thr-favorites>` — offers/coups de cœur, DEC-027)

Snapshot from THR's ILib v4 bundle (favorites.html/.css), **2026-06-16**. THR doesn't publish class names → **TODO: re-verify against the live mounted widget (US-006 smoke test)** and adjust any drift. The gallery is a **slick** carousel.

| Class | Element |
|---|---|
| `.thr-favorites.thr` | root wrapper |
| `.slick-slider` · `.slick-list` · `.slick-track` · `.slick-slide` | slick carousel scaffold |
| **`.slick-prev` · `.slick-next`** (+ `:before` glyph) | **prev/next arrows** |
| `.slick-dots li button` (+ `:before`, `li.slick-active`) | pagination dots |
| `.thr-favorite` | one offer card |
| `.thr-box-picture` | card image area (left as-is) |
| `.thr-favorite-content` | card content wrapper |
| **`.thr-favorite-content-category`** | **offer title/name** |
| `.thr-favorite-period` (`> p > span`) | **date range** |
| **`.thr-favorite-price` · `.thr-color-primary`** | **price** (`.thr-color-primary` = account colour) |
| **`.thr-box-footer .btn.btn-primary`** | **per-offer reserve button** (shares the search button theme) |

THR's themed layer here uses deep `html.thr .thr-favorites div .thr-favorite … { …!important }` selectors — overrides mirror that depth under `[data-engine="thr"]` + `!important`. **Visual theming (typography, button, arrows), not colours-only** — full reviewed baseline in `site-demo/src/app/globals.css` §THIRD-PARTY OVERRIDES, driven by `docs/block-specs/BookingFavoritesBlock.visual-spec.md`.

### Class map (`<thr-onenight>` — one-night/passage, DEC-027)

**Not yet captured** — implemented (`ThrOnenightAdapter` + `BookingOnenightBlock`) from the documented attributes (`thr-ilib-v4.md §5`), but its rendered DOM class names were not in the provided bundle. Its reserve button reuses the generic `[data-engine="thr"] .btn.btn-primary` theme; **TODO: capture the `<thr-onenight>` card classes against a live account (US-006)** and add typography/price overrides mirroring favorites. The widget requires a `category` attribute.

## Known quirks

1. **Config is queued, order is forgiving** — push config with `thelisresa.ilib('camping', …)` / `ilib('language', …)` after bootstrapping the `ilib` setter; calls before the script finishes are queued in `thelisresa.a` and consumed on load. (The adapter sets them before calling `loadScript`.)

2. **Web Component registration** — The `<thr-search-engine>` element must be inserted AFTER the ILib script has loaded and registered the custom element. Inserting before will result in an empty unknown element that doesn't upgrade.

3. **Multiple widgets on same page** — Unknown if multiple `<thr-search-engine>` elements are supported on the same page. Test before using in page builder with multiple booking blocks.

4. **SPA navigation** — THR's ILib was designed for traditional multi-page sites. Behavior during Next.js client-side navigation (App Router) is untested. The adapter's `destroy()` must clean up properly, and `mount()` must work on re-navigation.

5. **WordPress DIVI conflict** — DIVI ≥ 4.14 has a feature that conflicts with ILib. Not relevant for HWE, but noted in case clients mention it from their old WordPress sites.

6. **Consent** — set via `thelisresa.ilib('consent_ads', 0|1)`; because the `ilib` setter is bootstrapped up front and queues, it can be set before or after the script loads. (The adapter queues it alongside `camping`/`language`.)

## Account setup

Each camping client needs:
- A THR / eSeasonResa account with a `codeCamping` identifier
- The eSeasonResa tunnel enabled (required for ILib v4)
- For group accounts: the `site` ID for each camping in the group

These values are configured in `client.config.ts` under `booking.provider` config and stored in Payload as tenant booking config.

## Contact

THR support for integration questions: via Sequoiasoft / Thelis support channels.
Internal reference: Septeo Hospitality team.