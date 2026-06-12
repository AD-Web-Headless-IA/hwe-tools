# Booking adapter — add a new engine

> The **how-to** for adding a booking engine (Witbooking, Mastercamping, Resalys, …) to the booking adapter layer. Companion to the architecture overview [`docs/diagrams/booking-architecture.md`](../../diagrams/booking-architecture.md) and the decision [DEC-025](../../architecture/decisions.md#dec-025--booking-adapter-pattern--engine-agnostic-blocks-with-ui-delegation).
>
> The block (`BookingSearchBlock`) is **engine-agnostic and already built** — you never touch it to add an engine. You write an adapter and register it. THR (`ThrSearchAdapter`) is the canonical reference for a `script-injection` engine.

## When to use this guide

- You are adding a new booking engine adapter (the registry currently has a throwing placeholder for it), **or**
- You are adding a new booking widget block (`BookingOnenightBlock`, …) that needs a new adapter method.

If you only need to restyle an existing engine's widget for a client, you do **not** need this guide — that is CSS in the client's `globals.css` (see [CSS override pattern](../../diagrams/booking-architecture.md#css-override-pattern)).

## Prerequisites

1. Know the engine's **integration type** — inspect the engine's real integration:
   - `script-injection` — the engine ships a `<script>` that renders a widget (THR). Most common.
   - `iframe` — the engine is embedded via an `<iframe>` URL.
   - `native` — no engine UI; you build the form and redirect / call an API on submit.
2. Have the engine's integration docs in `docs/integrations/bookings/{engine}/` (Step 1 below creates them).
3. Read the contract you implement: [`@hwe/core-ui/src/adapters/booking/types.ts`](../../../). The interface is small:

```ts
export interface BookingSearchAdapter {
  readonly engine: BookingEngineType;
  readonly integrationType: SearchIntegrationType; // 'script-injection' | 'iframe' | 'native'
  mount(
    container: HTMLElement,
    config: BookingSearchBaseConfig,
    events?: BookingSearchEvents
  ): Promise<BookingSearchMountResult>;            // { destroy, mounted }
  validateConfig(config: BookingSearchBaseConfig): { valid: boolean; errors: string[] };
}
```

`mount` must: resolve even on failure (return `{ mounted: false }` and call `events.onError`), and be safe to call again after a previous `destroy()` (SPA re-navigation).

## Steps

### 1. Document the engine — `docs/integrations/bookings/{engine}/`

Mirror the `thr/` structure:
- `{engine}-ilib-v3.md` (or equivalent) — the integration reference (script URL, widget elements, attributes, consent).
- `{engine}-widgets.md` — quick widget → block mapping.
- `{engine}-notes.md` — internal notes: **CSP domains**, known quirks, CSS override class names, account setup.

Update `docs/integrations/bookings/README.md` — set the engine's row from 🔴 to 🟡 and fill its integration type.

### 2. Create the adapter directory — `@hwe/core-ui/src/adapters/booking/{engine}/`

```
src/adapters/booking/{engine}/
├── {engine}.types.ts            ← engine-specific config extending BookingSearchBaseConfig + constants
├── {Engine}SearchAdapter.ts     ← implements BookingSearchAdapter + a create{Engine}SearchAdapter() factory
├── {Engine}SearchAdapter.test.ts
└── index.ts                     ← barrel export
```

`{engine}.types.ts` extends the base config (`{ engine, locale, … }` — no generic `propertyId`) with the engine's **real-named** credential + presentation fields (mirror `thr.types.ts`, which uses `codeCamping`):

```ts
import type { BookingSearchBaseConfig } from '../types';

export interface WitbookingSearchConfig extends BookingSearchBaseConfig {
  engine: 'witbooking';
  hotelId: string;        // real credential name — matches TenantConfig.booking
  // …other engine-specific fields
}
```

The adapter reads its real field names directly (e.g. `config.codeCamping`) — there is no generic-name mapping layer.

### 3. Implement the adapter — by integration type

**`script-injection`** (follow `ThrSearchAdapter.ts`):
- Set any required global config **before** loading the script.
- `await loadScript({ src, attributes: { 'data-engine': '{engine}' } })` — the shared loader dedupes by `src`, so multiple widgets on a page never double-inject.
- Do any post-load setup (e.g. consent) **after** the load resolves.
- Create the engine's DOM element / call its init, wire callbacks via **uniquely-named** globals (use `crypto.randomUUID()`), append to `container`.
- Return `{ mounted: true, destroy }`. `destroy` removes what you added and clears global callbacks. **Do not unload the script** unless the engine genuinely needs a fresh load.

**`iframe`**: build the `<iframe>` src with config params, append to `container`, handle `postMessage` if the engine emits events. `destroy` removes the iframe.

**`native`**: render a form with our primitives (`@hwe/core-ui/src/primitives/`), and on submit redirect to the engine URL (`buildSearchUrl`) or call its API. Full styling control — follow the design system (`DESIGN.md`).

Reference: `loadScript` signature —

```ts
loadScript({ src: string, timeoutMs?: number, attributes?: Record<string, string> }): Promise<void>
```

### 4. Register in the registry — `adapters/booking/registry.ts`

Replace the placeholder factory with the real one:

```ts
import { createWitbookingSearchAdapter } from './witbooking';

const factories: Record<BookingEngineType, BookingSearchAdapterFactory> = {
  thr: createThrSearchAdapter,
  witbooking: createWitbookingSearchAdapter,   // ← was notImplemented('witbooking')
  mastercamping: notImplemented('mastercamping'),
  resalys: notImplemented('resalys'),
};
```

No `if/else` — the map is the only switch point. `resolveSearchAdapter(engine)`, `isEngineSupported(engine)`, and `getRegisteredEngines()` need no changes.

### 5. Declare the engine in the tenant config — `providers/TenantProvider.tsx`

The engine + credentials are authoritative in `TenantConfig.booking` (a discriminated union by `engine`, DEC-025) — **not** in block content. Replace the engine's placeholder member with the real credential field names (these become what `client.config.ts` declares and what the adapter reads):

```ts
export type TenantBookingConfig =
  | { engine: 'thr'; codeCamping: string; siteId?: string }
  | { engine: 'witbooking'; hotelId: string }   // ← real fields (was a placeholder)
  | …;
```

Block content (`src/schemas/BookingSearchBlock.schema.ts`) stays **presentation-only and engine-agnostic** — extend it only if the new engine needs a genuinely new presentation field. There is no engine field in content and no per-instance engine override. The block assembles `{ ...tenant.booking, locale: tenant.locale, ...content }` and hands it to your adapter, so your adapter's config type must be structurally compatible with that merge.

### 6. Add CSP domains

List every domain the engine loads at runtime in `docs/integrations/bookings/{engine}/{engine}-notes.md` (capture them from the DevTools Network tab on a live widget). Create a task to add them to client CSP config in `next.config.mjs` for clients using this engine — this is a separate **security task**, not done here.

### 7. Test — `{Engine}SearchAdapter.test.ts`

Mock externals; never hit the network. For `script-injection`, mock `../script-loader` (`vi.mock('../script-loader', …)`). Cover, mirroring `ThrSearchAdapter.test.ts`:
- `validateConfig` — valid passes; each required-field-missing fails; wrong engine fails.
- `mount` — inserts the right element/attributes; sets required globals; maps config values to engine params; wires the ready callback → `events.onReady`.
- `mount` failure paths — invalid config and script-load failure both call `onError` and return `{ mounted: false }`.
- `destroy` — removes the element and clears global callbacks.

Then run the gates (zero `any`, all green):

```bash
cd hwe-core && pnpm run typecheck && pnpm run test && pnpm run lint && pnpm run build
```

> **Windows:** before `build`, stop the dev server, free ports 3000/3001, and `rm -rf apps/site-demo/.next`.

### 8. Smoke test

Mount the block in `site-demo` with a real account: set `booking: { engine: '{engine}', …credentials }` in `site-demo/client.config.ts`, add a `BookingSearchBlock` `BlockInstance` (presentation-only `content`, e.g. `{ widgetTitle: '…' }`) to a composition, open `localhost:3000`, confirm the widget renders and `data-status="mounted"`. (`site-demo` is already wrapped in `TenantProvider`.) Keep this out of CI — it loads the engine's real external script.

## Reference implementation

`@hwe/core-ui/src/adapters/booking/thr/` is the canonical `script-injection` adapter. Read `ThrSearchAdapter.ts` for the mount/destroy lifecycle, `thr.types.ts` for the config-extends-base + real-named-fields pattern (the adapter reads `codeCamping` directly), and `ThrSearchAdapter.test.ts` for the mocked-externals test shape.

## Checklist

Copy into the story:

```
- [ ] docs/integrations/bookings/{engine}/ created (integration + widgets + notes with CSP domains)
- [ ] integrations/bookings/README.md row updated (🔴 → 🟡, integration type)
- [ ] src/adapters/booking/{engine}/ created: {engine}.types.ts, {Engine}SearchAdapter.ts, test, index.ts
- [ ] adapter implements BookingSearchAdapter (mount resolves on failure; re-mountable after destroy)
- [ ] registry.ts: placeholder factory replaced with create{Engine}SearchAdapter
- [ ] TenantConfig.booking (TenantProvider.tsx): engine placeholder member replaced with real credential fields
- [ ] BookingSearchBlock.schema.ts: extended only if the engine needs a new presentation field (content stays engine-agnostic)
- [ ] CSP domains documented; client-CSP task filed (separate)
- [ ] adapter tests green (externals mocked); 4 gates green
- [ ] smoke-tested in site-demo with a real account
```

## Where to read next

- [`docs/diagrams/booking-architecture.md`](../../diagrams/booking-architecture.md) — the architecture overview + diagrams.
- [`docs/architecture/decisions.md` §DEC-025](../../architecture/decisions.md#dec-025--booking-adapter-pattern--engine-agnostic-blocks-with-ui-delegation) — why this pattern.
- [`docs/integrations/bookings/`](../../integrations/bookings/README.md) — per-engine integration docs.
- [`docs/skills/frontend/block-creation.md`](./block-creation.md) — adding a new booking *block* (vs a new engine adapter).
