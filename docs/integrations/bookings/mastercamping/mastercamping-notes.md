# Mastercamping — internal notes

> Render mode, CSP domains, CSS override pattern, and quirks. Internal — not vendor docs.

## Render mode

**Light DOM.** The widget injects its own markup directly into the container `<div>` (no shadow DOM, no iframe). Client CSS overrides therefore **reach the widget** and can restyle it from the client's `globals.css`. There is no account-level back-office theming captured yet (unlike THR's `color1`/`color2`) — restyle via CSS.

## CSP domains

Add these to the client's `Content-Security-Policy` (`next.config.mjs`) for any site using Mastercamping. This is a separate **security task** (`/security-audit` / `/security-fix`) — the `/setup-booking` skill only seeds the engine row.

| Directive | Domain(s) |
|---|---|
| `script-src` | `https://rsv4.mastercamping.com` |
| `style-src` | `https://rsv4.mastercamping.com` |
| `connect-src` | `https://rsv4.mastercamping.com` |
| `img-src` | `https://rsv4.mastercamping.com` (widget assets/icons) |
| `frame-src` / `connect-src` | the client's **booking URL** domain, e.g. `https://booking.familycampings.com` — **varies per client** (the `bookingUrl` value) |

> ⚠️ The booking URL domain is per-client (`TenantConfig.booking.bookingUrl`). Capture the exact runtime domains from the DevTools Network tab on a live widget before hardening CSP — the widget may redirect/iframe to the booking engine on submit.

## CSS override pattern

The block scopes the widget under `[data-engine="mastercamping"]` (set on both the block `<section>` and the adapter's inner container). Client overrides go in the site's `globals.css`, scoped to that selector, using `!important` + theme tokens. **Don't hardcode colors here — each client customizes in its own repo.**

The vendor bundle is **low-specificity** (mostly single-class rules, only 2 `!important` in the whole file), so `[data-engine="mastercamping"]` + `!important` wins without selector gymnastics — unlike THR, which needs extra class depth to beat its account theme layer.

### Verified class map (`master_booking_plugin.min.css`, `latest`, snapshot 2026-06-17)

| Class | Element | Vendor default worth overriding |
|---|---|---|
| `.widgetBookingContainer` | Outer panel | `background:#e6e6e6` (flat grey) |
| `.searchButton` | Submit button | `background:rgba(0,0,0,.6)` (dark grey); in `widget_columns` it also becomes `width:20%` |
| `.inputBox`, `.comboBox`, `.datePicker`, `.categorySelector` | Field boxes / selects | bordered inputs |
| `.categoryGroupLabel`, `.categoryLabel`, `.facilityContainer label` | Category / facility row labels | default link-blue text |
| `.categoryGroupCB`, `.facilityGroupCB` | Checkboxes | native checkbox colour (use `accent-color`) |
| `.facilitiesTitle`, `.popupTitle` | Section / popup headers | `font-weight:300`; popup is white-on-`#5d5d5d` |
| `.comboPopup`, `.datePickerPopup`, `.categoriesPopup`, `.fullScreenPopup` | Dropdown / picker popups | borders + shadow |
| `.comboboxOption.selected`, `.stayDay.selected`, `.checkinDay.selected` | Selected option / day | selected-state colour |

> In `widget_columns` (horizontal `layout`) the main sections — `.categorySelector`, `.checkinCheckoutContainer`, `.childAgeContainer`, `.facilities`, `.peopleContainer`, `.searchButton` — each become `display:inline-block; width:20%`, i.e. a one-row search bar. The Search button therefore renders compact (not full-width) in horizontal mode.

```css
/* site-{slug}/src/app/globals.css — Mastercamping widget overrides.
   Scope to [data-engine="mastercamping"], use !important + theme tokens, zero CSS per block.
   Worked, verified example: hwe-core/apps/site-demo/src/app/globals.css §booking:mastercamping. */
[data-engine="mastercamping"] .widgetBookingContainer {
  background: var(--color-secondary) !important;          /* was flat #e6e6e6 */
  border: 1px solid var(--color-border) !important;
  border-radius: var(--radius-md) !important;
}

[data-engine="mastercamping"] .searchButton {
  background: var(--color-primary) !important;            /* was rgba(0,0,0,.6) */
  color: var(--color-primary-foreground) !important;
  border-radius: var(--radius-md) !important;
}

[data-engine="mastercamping"] .categoryGroupCB,
[data-engine="mastercamping"] .facilityGroupCB,
[data-engine="mastercamping"] input[type="checkbox"] {
  accent-color: var(--color-primary) !important;
}
```

## Quirks

1. **Two static assets, both required.** JS + CSS load from fixed `latest` URLs; the adapter awaits both (`Promise.all`) before `new MasterWidget(...)`. The CSS is not optional styling — the widget depends on it.
2. **No ready/destroy API.** The vendor exposes no load callback and no teardown method. `onReady` fires once the constructor returns; `destroy()` only removes the inner mount node. The shared assets stay loaded (deduped) for other widgets on the page — same policy as THR (`booking-adapter.md`: do not unload).
3. **String container id, not an element.** MasterWidget takes an `id`. The adapter mints a collision-free inner `<div id="hwe-mc-…">` so multiple widgets coexist.
4. **`idProperty` is numeric.** Pass a `number`, not a string — `validateConfig` rejects non-positive / non-integer values.
5. **`latest` channel.** The vendor can change the widget under us. If a breaking change lands, pin a versioned URL here and in `mastercamping.types.ts`.
