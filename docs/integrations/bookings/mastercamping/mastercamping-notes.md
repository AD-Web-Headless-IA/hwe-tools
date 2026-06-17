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

The block scopes the widget under `[data-engine="mastercamping"]` (set on both the block `<section>` and the adapter's inner container). Client overrides go in the site's `globals.css`, scoped to that selector, using `!important` + theme tokens. **Don't hardcode colors here — each client customizes in its own repo.** Class names below are placeholders: inspect the live widget in DevTools and replace.

```css
/* site-{slug}/src/app/globals.css — Mastercamping widget overrides.
   Scope to [data-engine="mastercamping"], use !important + theme tokens, zero CSS per block. */
[data-engine="mastercamping"] .searchButton {
  background: var(--color-primary) !important;
  color: var(--color-on-primary) !important;
}

[data-engine="mastercamping"] .widgetBookingContainer {
  /* background / spacing overrides */
}

[data-engine="mastercamping"] .popupTitle {
  /* popup header colors */
}
```

## Quirks

1. **Two static assets, both required.** JS + CSS load from fixed `latest` URLs; the adapter awaits both (`Promise.all`) before `new MasterWidget(...)`. The CSS is not optional styling — the widget depends on it.
2. **No ready/destroy API.** The vendor exposes no load callback and no teardown method. `onReady` fires once the constructor returns; `destroy()` only removes the inner mount node. The shared assets stay loaded (deduped) for other widgets on the page — same policy as THR (`booking-adapter.md`: do not unload).
3. **String container id, not an element.** MasterWidget takes an `id`. The adapter mints a collision-free inner `<div id="hwe-mc-…">` so multiple widgets coexist.
4. **`idProperty` is numeric.** Pass a `number`, not a string — `validateConfig` rejects non-positive / non-integer values.
5. **`latest` channel.** The vendor can change the widget under us. If a breaking change lands, pin a versioned URL here and in `mastercamping.types.ts`.
