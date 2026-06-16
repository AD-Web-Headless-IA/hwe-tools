# THR — ILib v4 integration

> Source: THR's official integration snippet + the live v4 bundle.
> Last verified: 2026-06-12 (ILib **v4**) against the `demosalons` demo account.
> Requires: eSeasonResa tunnel enabled for the account.
>
> **Version note:** **v4 is THR's stable and only version** (no v5 planned), so this contract is fixed — no version-churn to track. This file is the single source of truth for the THR integration. Config is set via `thelisresa.ilib('camping', …)` (not property assignment) and the script is loaded from `/ilib/v4/?<widgets>` (see §1).

## Overview

THR (ThelisResa / eSeasonResa) is a booking engine for campings and hotels by Sequoiasoft.
ILib v4 renders its widgets as **custom HTML elements** (`<thr-search-engine>`, …) driven by an internal **AngularJS** app styled with **Bootstrap 3** (everything scoped under a root `.thr` class). It is **light DOM** — not shadow DOM, not an iframe — so host-page CSS overrides reach it (see [`thr-notes.md` §CSS](./thr-notes.md)).

The integration consists of:
1. Bootstrap the global `thelisresa.ilib` setter and push config (account, language, consent).
2. Load the ILib v4 script (HTTPS), selecting the widgets you need via query params.
3. Place the custom HTML element (`<thr-search-engine>`) where the widget should appear.

## 1. Script integration

The ILib v4 script is loaded **with the widgets selected via query params** (lighter footprint). The official integration snippet bootstraps a `thelisresa.ilib(key, value)` setter that **queues** config until the script loads and processes it:

```html
<script>
(function (t, h, e, l, i, s) {
  t[i] = {}; t[i][s] = t[i][s] || function () {
    if (arguments.length === 1) { return t[i].a[arguments[0]] || null; }
    t[i].a = t[i].a || []; t[i].a[arguments[0]] = arguments[1];
  };
  var R = h.createElement(e), E = h.getElementsByTagName(e)[0];
  R.async = 1; R.src = l; E.parentNode.insertBefore(R, E);
})(window, document, 'script',
   'https://thelisresa.webcamp.fr/ilib/v4/?categories&favorites&searchengine&simpleblock',
   'thelisresa', 'ilib');

thelisresa.ilib('camping', 'demosalons');  // Required — account ID (the `camping` key, NOT `codeCamping`)
thelisresa.ilib('language', 'fr');         // Optional — fr, en, es, de, nl, ca, it, pt, da
</script>
```

Notes:
- **URL:** `https://thelisresa.webcamp.fr/ilib/v4/?<widgets>`. Widgets are selected by query flags: `searchengine`, `categories`, `favorites`, `simpleblock`, … A site loads **one** script with the combined set. The HWE search adapter uses `?searchengine`.
- **Config is set via `thelisresa.ilib(key, value)`** — `camping` (account ID), `language`, `consent_ads`. Calls before the script finishes are queued in `thelisresa.a`. This is **not** property assignment.
- **Do not use the version-less `/ilib/`** — it returns the legacy `ThelisResa.options` script (not Web Components). Always load `/ilib/v4/`.

### How HWE's adapter does it

`ThrSearchAdapter` (`@hwe/core-ui/src/adapters/booking/thr/`) replicates the snippet: it bootstraps `thelisresa.ilib`, calls `ilib('camping', codeCamping)` + `ilib('language', …)` (+ `ilib('consent_ads', …)`), then loads `THR_ILIB_SRC` via the shared `script-loader`, and inserts `<thr-search-engine>`. The block's config field is named `codeCamping` (it maps to the `camping` ilib key).

## 2. GDPR consent management

Consent is passed through the same setter: `thelisresa.ilib('consent_ads', value)` (queued like the rest). An optional `setConsentMode` wrapper can be defined for dynamic updates:

```html
<script>
thelisresa.setConsentMode = function (value) {
    thelisresa.ilib('consent_ads', value);
};
</script>
```

Values for `consent_ads`:
- `1` — user accepted consent on the merchant site
- `0` — user refused or did not respond

Example — updating consent dynamically:

```html
<thr-search-engine title="Search" type="2"></thr-search-engine>

<script>
function updateConsent() {
    var consentValue = document.getElementById('customConsent').value;
    if (consentValue === '0' || consentValue === '1') {
      thelisresa.setConsentMode(parseInt(consentValue));
    }
}
</script>
```

### Integration with Cookiebot

In HWE, consent is managed by Cookiebot (see `security-standards.md`). The adapter must:
1. Read consent state from Cookiebot
2. Call `thelisresa.setConsentMode()` with the appropriate value
3. Listen for consent changes and update THR accordingly

## 3. Widget types

ILib v4 provides the following widgets as custom HTML elements (verified present in the v4 bundle):

| Element | Purpose | Status in HWE |
|---|---|---|
| `<thr-search-engine>` | Availability search form | ✅ Implemented (`ThrSearchAdapter` + `BookingSearchBlock`) |
| `<thr-favorites>` | Featured accommodations ("coups de coeur") | ✅ Implemented (`ThrFavoritesAdapter` + `BookingFavoritesBlock`, DEC-027) |
| `<thr-onenight>` | One-night / passage booking | 🔴 Not started |
| `<thr-tarifs>` | Rates & availability table | 🔴 Not started |
| `<thr-categories>` | Accommodation categories listing | 🔴 Not started |

Widget styles can be customized by the webmaster via CSS overrides.

### Event callbacks

All widgets support event callback attributes (advanced, for integrators):

| Attribute | Description |
|---|---|
| `on-load` | Function name called when widget finishes loading (no parentheses) |
| `on-book` | Function name called when user clicks a "Book" button (no parentheses) |

Example:
```html
<thr-favorites on-load="myLoadCallback" on-book="myBookCallback"></thr-favorites>
```

## 4. Widget: `<thr-search-engine>`

The search engine widget renders an availability search form.

### Example

```html
<thr-search-engine site="6646" type="Appartement" search-text="Chercher"></thr-search-engine>
```

### Attributes (authoritative — from THR)

| Attribute | Required | Description | Values |
|---|---|---|---|
| `site` | Groups only | Specific campsite within a group account | Campsite ID, e.g. `site="6646"` |
| `type` | No | Accommodation type filter | `1` (all pitches) · `2` (all rentals) · or a sub-type: `Insolite, Tente, Chalet, Bungalow, Appartement, Villa, Roulotte, Standard, Grande taille, Camping-Car, Gite, Mobil-Home, Glamping`. Omit for all. |
| `title` | No | Display title above the form | Any string |
| `hide-categories-type` | No | Hide the accommodation-type selector | `1` = hidden · `0` = shown (default) |
| `hide-capacity` | No | Hide the capacity selector | `1` = hidden · `0` = shown (default) |
| `search-text` | No | Label of the "Search" button | Any string, e.g. `search-text="Chercher"` |
| `set-day-of-week` | No | Initialize to a given weekday | Weekday in English, e.g. `set-day-of-week="saturday"` |
| `on-load` | No | Callback when widget loads | Global function name (no parentheses) |

> The account ID itself (`camping`) is **not** an attribute — it is set via `thelisresa.ilib('camping', …)` (see §1). These attributes map 1:1 to HWE's `BookingSearchBlock` content / `ThrSearchConfig` fields (`type`, `hideCategoriesType`, `hideCapacity`, `searchText`, `setDayOfWeek`, `widgetTitle`), plus a generic `attributes` passthrough for any not listed here.

## 5. Widget: `<thr-onenight>`

One-night / passage booking widget for immediate availability.

### Example

```html
<thr-onenight category="13"></thr-onenight>
```

### Attributes

| Attribute | Required | Description | Values |
|---|---|---|---|
| `site` | Groups only | Site ID for group accounts | e.g. `site="6955"` |
| `category` | Yes | Accommodation category ID | Category ID, optionally with enterprise ID: `category="13"` or `category="22628,13"` |
| `show-picture` | No | Show accommodation photo | `true` / `false` |
| `on-load` | No | Callback when widget loads | Function name |
| `on-book` | No | Callback on "Book" click | Function name |

Notes:
- Recommended for categories without arrival day restrictions (to always offer "today" or "tomorrow")
- Use on categories with high availability
- Do not display during closure periods

## 6. Widget: `<thr-favorites>`

Featured accommodations gallery ("coups de coeur").

### Example

```html
<thr-favorites></thr-favorites>
```

### Attributes

| Attribute | Required | Description | Values |
|---|---|---|---|
| `sites` | Groups only | Site IDs (array format) | e.g. `sites="[6955]"` or `sites="[6955,6822]"` |
| `quantity` | No | Total favorites to fetch | Integer. Default: `6` |
| `quantity-to-show` | No | Favorites to display at once | Integer. Default: `3` |
| `on-load` | No | Callback when widget loads | Function name |
| `on-book` | No | Callback on "Book" click | Function name |
