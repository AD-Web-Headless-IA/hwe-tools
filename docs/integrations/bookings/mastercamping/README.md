# Mastercamping integration

> Mastercamping (`rsv4.mastercamping.com`) booking widget, integrated with `BookingSearchBlock` via the engine-agnostic adapter layer (DEC-025). Adapter: `@hwe/core-ui/src/adapters/booking/mastercamping/`.

## Summary

| Field | Value |
|---|---|
| Provider | Mastercamping |
| Integration type | `script-injection` (classic JS widget — global `MasterWidget` constructor) |
| Render mode | Light DOM (vendor markup injected into our container) → CSS overrides reach it |
| Assets | One JS + one CSS, **both static** (no per-tenant composition) |
| Status | ✅ Implemented (search) |
| Adapter | `MastercampingSearchAdapter` (`createMastercampingSearchAdapter`) |

## How it differs from THR

THR ships ILib v4 **Web Components** (`<thr-search-engine>`) and composes a single script URL from the tenant's active widgets. Mastercamping is the opposite: a **classic JS widget** instantiated by calling a global constructor against a container `id`, from **fixed** asset URLs.

```js
const widget = new MasterWidget(containerId, options);
```

Key consequences for the adapter:
- Two static assets (`...min.js` + `...min.css`) must **both** load before instantiation — we `await Promise.all([...])`. The CSS is a real `<link>` (not optional styling).
- The constructor needs a **string id**, so the adapter creates an inner `<div id="…">` inside the block's container and passes its id.
- There is **no ready/destroy callback** in the vendor API. `onReady` fires once the constructor returns; `destroy()` just removes the inner node (the shared assets stay loaded, like THR — see [`booking-adapter.md`](../../../skills/frontend/booking-adapter.md)).

## Config (authoritative in `TenantConfig.booking`, DEC-025)

The engine + credentials live in the tenant config, not block content. Mastercamping's slice:

```ts
booking: {
  engine: 'mastercamping',
  idProperty: 1234,                                  // numeric camping id (vendor `idProperty`)
  bookingUrl: 'https://booking.familycampings.com',  // vendor `url`
  layout: 'horizontal',                              // optional — default 'vertical'
  categoryGroupIds: [3, 7],                           // optional passthrough
  guestAges: [18, 18, 2],                             // optional passthrough
  target: '_blank',                                   // optional passthrough
}
```

`layout: 'horizontal'` maps to MasterWidget `class: 'widget_columns'` + `dropdown: true`. The block's own `variant` (`inline` | `sticky`) is independent — sticky placement is token-driven block CSS, the adapter is unaware of it.

## Files

- `mastercamping-widgets.md` — widget reference (constructor, options, layout variants) from the vendor examples.
- `mastercamping-notes.md` — render mode, CSP domains, CSS override pattern, quirks.

## See also

- [`docs/skills/frontend/booking-adapter.md`](../../../skills/frontend/booking-adapter.md) — the how-to for adding an engine.
- [`docs/architecture/decisions.md` §DEC-025](../../../architecture/decisions.md#dec-025--booking-adapter-pattern--engine-agnostic-blocks-with-ui-delegation) / §DEC-027.
