# THR — ILib v3 integration

> Source: thelisresa.webcamp.fr/doc/v3/ (official documentation, access restricted)
> Last verified: 2026-06-11
> Requires: eSeasonResa V3 tunnel for the camping account

## Overview

THR (ThelisResa / eSeasonResa) is a booking engine for campings and hotels by Sequoiasoft.
ILib v3 uses **Web Components** (custom HTML elements) for widget integration.

The integration consists of:
1. Include the ILib script at the bottom of the page (HTTPS required)
2. Place the custom HTML element where you want the widget to appear
3. Configure via HTML attributes on the element

## 1. Script integration

The ILib script must be included at the bottom of the page, before the closing `</body>` tag.

```html
<script src="https://thelisresa.webcamp.fr/ilib/v3/ilib.js"></script>
```

The script URL supports selective widget loading (since 2019) — you can select only the widgets you need for a lighter footprint. A quick integration form is available from THR to generate the exact script tag.

### Global configuration

The global `thelisresa` object is configured before or after the script loads. Settings like `codeCamping` and `language` are passed via the same setter pattern as consent:

```html
<script>
var thelisresa = thelisresa || {};
thelisresa.codeCamping = 'demo';   // Required — camping account ID
thelisresa.language = 'fr';         // Optional — fr, en, es, de, nl, ca, it, pt, da
</script>
<script src="https://thelisresa.webcamp.fr/ilib/v3/ilib.js"></script>
```

## 2. GDPR consent management

To transmit cookie consent status collected on your site to the THR widgets:

```html
<script>
// Define the consent setter (after the thelisresa global config)
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

ILib v3 provides the following widgets as custom HTML elements:

| Element | Purpose | Status in HWE |
|---|---|---|
| `<thr-search-engine>` | Availability search form | 🟡 Implementing |
| `<thr-onenight>` | One-night / passage booking | 🔴 Not started |
| `<thr-favorites>` | Featured accommodations ("coups de coeur") | 🔴 Not started |
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
<thr-search-engine title="Widget Moteur de recherche" type="2">
</thr-search-engine>
```

### Known attributes

| Attribute | Required | Description | Values |
|---|---|---|---|
| `title` | No | Display title above the search form | Any string |
| `type` | No | Accommodation type filter | `1` = emplacement (pitch), `2` = locatif (rental). Omit for both. |
| `site` | Groups only | Site ID within a group account | Site identifier, e.g. `site="6955"` |
| `on-load` | No | Callback when widget loads | Function name (no parentheses) |

> **⚠️ INCOMPLETE:** The full attribute list for `<thr-search-engine>` is not available in the docs we have. Additional attributes (search mode, date params, regions, etc.) may exist. Update this table when the complete documentation is obtained from THR.

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

## 7. WordPress exceptions

For WordPress users with DIVI ≥ 4.14: a specific DIVI feature must be disabled to avoid conflicts with the ILib. Disabling it may cause conflicts with other external libraries.

Not relevant for HWE (Next.js stack), documented for completeness only.