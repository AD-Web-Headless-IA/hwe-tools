# THR — Widget reference

Quick reference for all THR ILib v4 widgets. For full integration docs see `thr-ilib-v4.md`.

## Widget map → HWE blocks

| THR widget | HWE block | Adapter method | Priority |
|---|---|---|---|
| `<thr-search-engine>` | `BookingSearchBlock` | `mount()` in `ThrSearchAdapter` | ✅ implemented |
| `<thr-favorites>` | `BookingFavoritesBlock` | `mount()` in `ThrFavoritesAdapter` | ✅ implemented (DEC-027) |
| `<thr-simpleblock>` | `BookingSimpleBlock` | `mount()` in `ThrSimpleBlockAdapter` | ✅ implemented (DEC-027) |
| `<thr-tarifs>` | `BookingRatesBlock` (future) | TBD | P3 |
| `<thr-categories>` | `BookingCategoriesBlock` (future) | TBD | P3 |

## `<thr-search-engine>` — Availability search

```html
<thr-search-engine
    title="Réservation"
    type="2"
    site="6955"
    on-load="onWidgetReady">
</thr-search-engine>
```

| Attribute | Type | Default | Notes |
|---|---|---|---|
| `title` | string | — | Display title |
| `type` | `"1"` \| `"2"` | both | 1=pitch, 2=rental |
| `site` | string | — | Required for group accounts |
| `on-load` | string | — | Global function name |

**⚠️ Attribute list incomplete — see `thr-ilib-v4.md` §4.**

## `<thr-simpleblock>` — Category availability block

```html
<thr-simpleblock categories="[12]" day="samedi" show-picture="true" search-type="1"></thr-simpleblock>
```

| Attribute | Type | Default | Notes |
|---|---|---|---|
| `categories` | array literal | **required** | Category IDs, e.g. `[12]`, `['13','7']`, `['18675,13']` (enterprise id). Mutually exclusive with `category-type`. |
| `category-type` | string | — | Alternative filter: `camping`/`location`/`both` or a sub-type. Mutually exclusive with `categories`. |
| `site` | string | — | Required for group accounts |
| `show-picture` | `"true"` \| `"false"` | `"false"` | Show accommodation photo (auto when multiple categories) |
| `search-type` | `"1"` \| `"2"` | `"2"` | `1` flexible (by month) · `2` exact dates (single category only) |
| `one-mode` | `"1"` \| `"2"` | `"2"` | Restrict to one search mode (single category only) |
| `date` | `YYYY-MM` | — | Default month (flexible mode) |
| `day` | string | — | Default arrival weekday in French (lundi…dimanche), flexible mode |
| `duration` | `1`–`21` | — | Default stay length |
| `on-load` / `on-search` / `on-book` | string | — | Global callback function names |

> Full attribute semantics in `thr-ilib-v4.md` §5. HWE exposes `categories` (required), `site`, `showPicture`, `searchType`, `day` as first-class `BookingSimpleBlock` content; the rest go through the `attributes` passthrough.

## `<thr-favorites>` — Featured accommodations

```html
<thr-favorites sites="[6955,6822]" quantity="6" quantity-to-show="3"></thr-favorites>
```

| Attribute | Type | Default | Notes |
|---|---|---|---|
| `sites` | string (JSON array) | all sites | Required for group accounts |
| `quantity` | string (integer) | `"6"` | Total items to fetch |
| `quantity-to-show` | string (integer) | `"3"` | Items visible at once |
| `on-load` | string | — | Global function name |
| `on-book` | string | — | Global function name |

## `<thr-tarifs>` — Rates & availability

Documentation pending. Widget exists in ILib v4 but attribute details not yet documented here.

## `<thr-categories>` — Accommodation categories

Documentation pending. Widget exists in ILib v4 but attribute details not yet documented here.

## Common patterns

### All widgets share

- `site` attribute for group accounts (multi-site)
- `on-load` callback for initialization tracking
- CSS customizable via overrides (see `thr-notes.md §CSS overrides`)

### Consent

All widgets respect the consent value set via `thelisresa.setConsentMode()`.
This must be called after the ILib script loads. See `thr-ilib-v4.md §2`.