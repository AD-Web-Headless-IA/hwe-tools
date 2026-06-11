# THR — Widget reference

Quick reference for all THR ILib v3 widgets. For full integration docs see `thr-ilib-v3.md`.

## Widget map → HWE blocks

| THR widget | HWE block | Adapter method | Priority |
|---|---|---|---|
| `<thr-search-engine>` | `BookingSearchBlock` | `mount()` in `ThrSearchAdapter` | P0 — implementing now |
| `<thr-onenight>` | `BookingOnenightBlock` (future) | TBD | P2 |
| `<thr-favorites>` | `BookingFavoritesBlock` (future) | TBD | P2 |
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

**⚠️ Attribute list incomplete — see `thr-ilib-v3.md` §4.**

## `<thr-onenight>` — Passage booking

```html
<thr-onenight category="13" show-picture="true"></thr-onenight>
```

| Attribute | Type | Default | Notes |
|---|---|---|---|
| `category` | string | **required** | Category ID (with or without enterprise ID) |
| `site` | string | — | Required for group accounts |
| `show-picture` | `"true"` \| `"false"` | `"false"` | Show accommodation photo |
| `on-load` | string | — | Global function name |
| `on-book` | string | — | Global function name |

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

Documentation pending. Widget exists in ILib v3 but attribute details not yet documented here.

## `<thr-categories>` — Accommodation categories

Documentation pending. Widget exists in ILib v3 but attribute details not yet documented here.

## Common patterns

### All widgets share

- `site` attribute for group accounts (multi-site)
- `on-load` callback for initialization tracking
- CSS customizable via overrides (see `thr-notes.md §CSS overrides`)

### Consent

All widgets respect the consent value set via `thelisresa.setConsentMode()`.
This must be called after the ILib script loads. See `thr-ilib-v3.md §2`.