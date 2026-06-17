# Booking engine integrations

Index of external booking engines integrated with `BookingSearchBlock` and future booking widgets.

Each engine has its own subdirectory with integration docs, widget reference, and internal notes.

## Engines

| Engine | Provider | Integration type | Status | Directory |
|---|---|---|---|---|
| THR (eSeasonResa) | Sequoiasoft / Thelis | script-injection (ILib v4 Web Components) | ✅ Implemented (search) | `thr/` |
| Witbooking | Witbooking | TBD | 🔴 Not started | `witbooking/` |
| Mastercamping | Mastercamping | script-injection (MasterWidget JS constructor) | ✅ Implemented (search) | `mastercamping/` |
| Resalys | Resalys | TBD | 🔴 Not started | `resalys/` |

## Integration types

- **script-injection** — Load an external `<script>`, engine renders via custom elements or DOM injection. We control the container; they control the widget internals. CSS overrides via `globals.css` with `!important` to match client brand.
- **iframe** — Mount an `<iframe>` pointing to the engine's URL with params. Fully isolated. Limited styling control.
- **native** — We build the form UI with our own primitives, call the engine's API or redirect on submit. Full styling control, most effort.

## Architecture

```
@hwe/core-ui/src/
├── base-blocks/BookingSearchBlock/  ← The block component (engine-agnostic)
└── adapters/booking/             ← Engine adapter implementations
    ├── types.ts                  ← BookingSearchAdapter interface
    ├── registry.ts               ← Engine → adapter resolution
    ├── script-loader.ts          ← Shared utility for script-injection engines
    └── thr/                      ← THR adapter
```

The block delegates all rendering to the resolved adapter. Adding a new engine means creating a new adapter — the block component does not change.

See `docs/specs/frontend/block-architecture.md` for the 4-layer block system.

## CSS override pattern

External widgets come with their own styles. To match the client's brand:

1. The adapter wraps the widget in a container with `data-engine="{engine}"` attribute
2. Client overrides go in the client's `globals.css`
3. Use `!important` to beat the widget's internal specificity
4. Scope overrides to `[data-engine="thr"]` to avoid leaking to other engines

```css
/* site-{slug}/src/app/globals.css */
[data-engine="thr"] .thr-search-engine__btn {
  background-color: var(--color-primary) !important;
  border-radius: var(--radius-md) !important;
}
```

## Adding a new engine

1. Research the engine's integration method and document it in `docs/integrations/bookings/{engine}/`
2. Classify integration type (script-injection / iframe / native)
3. Create adapter in `@hwe/core-ui/src/adapters/booking/{engine}/`
4. Register in `adapters/booking/registry.ts`
5. Add CSP domains to the engine's `{engine}-notes.md` for security audit