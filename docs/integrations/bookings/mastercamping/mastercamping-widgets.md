# Mastercamping — widget reference

> Captured from the vendor integration examples. Treat these as the source of truth for the adapter's option mapping. **Verify against a live integration snippet** before trusting any value.

## Assets

| Asset | URL |
|---|---|
| JS | `https://rsv4.mastercamping.com/widget/latest/master_booking_plugin.min.js` |
| CSS | `https://rsv4.mastercamping.com/widget/latest/master_booking_plugin.min.css` |

Both are static (the `latest` channel — the vendor controls updates). Load the JS as a `<script>` and the CSS as a `<link rel="stylesheet">`. **Both must be present before instantiating the widget.**

The script registers a global constructor `window.MasterWidget` once loaded.

## Instantiation

```js
const widget = new MasterWidget(containerId, options);
```

`containerId` is a **string** element id (not an element). Multiple independent widgets on one page are supported — each gets its own container id and its own `new MasterWidget(...)` call.

## Options

### Required

| Option | Type | Description |
|---|---|---|
| `lang` | `string` | Widget language: `'es'`, `'ca'`, `'en'`, `'fr'`, `'nl'`, … |
| `idProperty` | `number` | Camping/property identifier (numeric, **not** a string) |
| `url` | `string` | Booking-engine URL for this property, e.g. `'https://booking.familycampings.com'` |

### Optional

| Option | Type | Default | Description |
|---|---|---|---|
| `class` | `string` | — | CSS layout class. `'widget_columns'` = horizontal layout |
| `dropdown` | `boolean` | `false` | Use dropdown selectors |
| `target` | `string` | — | Link target, e.g. `'_blank'` |
| `categoryGroupIds` | `number[]` | — | Pre-filter by category group ids |
| `guestAges` | `number[]` | — | Pre-populated guest ages, e.g. `[18, 18, 2, 16]` |

## Layout variants → adapter mapping

The adapter receives `layout` (`'vertical' | 'horizontal'`) from `TenantConfig.booking`:

| `layout` | MasterWidget options |
|---|---|
| `'vertical'` (default) | _none_ — widget renders vertically |
| `'horizontal'` | `class: 'widget_columns'`, `dropdown: true` |

Block `variant` (`inline` / `sticky`) is **separate** and handled by the block (token-driven sticky CSS) — the adapter never sees it. Sticky placement pairs naturally with `horizontal` layout, but the two axes are independent and the block does not branch on the engine.

## Adapter option mapping (reference)

| `TenantConfig.booking` field | MasterWidget option |
|---|---|
| `locale` (tenant) → `mastercampingLanguage()` | `lang` |
| `idProperty` | `idProperty` |
| `bookingUrl` | `url` |
| `layout === 'horizontal'` | `class: 'widget_columns'` + `dropdown: true` |
| `categoryGroupIds` | `categoryGroupIds` (passthrough when set) |
| `guestAges` | `guestAges` (passthrough when set) |
| `target` | `target` (passthrough when set) |

## Widget → block mapping

| Widget | Block | Status |
|---|---|---|
| Search | `BookingSearchBlock` | ✅ Implemented |
| Offers / favorites | `BookingFavoritesBlock` | 🔴 Not started (no Mastercamping favorites adapter yet) |
| Category availability | `BookingSimpleBlock` | 🔴 Not started |
