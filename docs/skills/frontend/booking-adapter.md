# Booking adapter — add a new engine

> The **how-to** for adding a booking engine (Witbooking, Mastercamping, Resalys, …) to the booking adapter layer. Companion to the architecture overview [`docs/diagrams/booking-architecture.md`](../../diagrams/booking-architecture.md) and the decision [DEC-025](../../architecture/decisions.md#dec-025--booking-adapter-pattern--engine-agnostic-blocks-with-ui-delegation).
>
> The block (`BookingSearchBlock`) is **engine-agnostic and already built** — you never touch it to add an engine. You write an adapter and register it. There are **two reference `script-injection` implementations**: **THR** (`ThrSearchAdapter`) — Web Components, one tenant-composed ILib script; and **Mastercamping** (`MastercampingSearchAdapter`) — a global `MasterWidget` JS constructor with two **static** assets (JS + a required CSS `<link>`). Pick the closer one to your engine's real integration.

## When to use this guide

- You are adding a new booking engine adapter (the registry currently has a throwing placeholder for it), **or**
- You are adding a new booking widget block (`BookingRatesBlock`, …) that needs a new adapter method.

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
- `{engine}-ilib.md` (or equivalent) — the integration reference (exact script URL, how config is passed, widget elements, attributes, consent). **Verify the URL and config mechanism against the engine's real integration snippet** — don't trust assumptions; capture the authoritative values once and treat them as the source of truth.
- `{engine}-notes.md` — internal notes incl. the **render mode** (light DOM vs shadow DOM vs iframe — decides whether CSS overrides reach it), any **account-level theming** (e.g. THR's back-office `color1`/`color2`), the **CSS class map**, and CSP domains.
- `{engine}-widgets.md` — quick widget → block mapping.

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

**`script-injection`** — two reference shapes: `ThrSearchAdapter.ts` (Web Components) and `MastercampingSearchAdapter.ts` (a global JS constructor + a required CSS asset). Follow whichever matches your engine:
- Set any required global config **before** loading the script.
- `await loadScript({ src, attributes: { 'data-engine': '{engine}' } })` — the shared loader dedupes by `src`, so multiple widgets on a page never double-inject.
- **If the engine ships a separate CSS file it needs to render** (Mastercamping does), also `await loadStylesheet({ href, attributes: { 'data-engine': '{engine}' } })` — the same loader module, deduped by `href`. Await **both** (e.g. `Promise.all`) before instantiating; the CSS is not optional styling.
- Do any post-load setup (e.g. consent) **after** the load resolves; if the engine exposes a global (e.g. `window.MasterWidget`), guard that it exists before using it.
- Create the engine's DOM element / call its init, wire callbacks via **uniquely-named** globals/ids (use `crypto.randomUUID()`), append to `container`. A constructor-style widget that takes a string id needs a uniquely-id'd inner `<div>`.
- Return `{ mounted: true, destroy }`. `destroy` removes what you added and clears global callbacks. **Do not unload the script/stylesheet** unless the engine genuinely needs a fresh load (THR and Mastercamping both keep them — deduped, shared across widgets).

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

Two `script-injection` references, by widget shape:

- **Web Components / tenant-composed script — `@hwe/core-ui/src/adapters/booking/thr/`.** Read `ThrSearchAdapter.ts` for the mount/destroy lifecycle, `thr.types.ts` for the config-extends-base + real-named-fields pattern (the adapter reads `codeCamping` directly), and `ThrSearchAdapter.test.ts` for the mocked-externals test shape.
- **Global JS constructor + static JS/CSS assets — `@hwe/core-ui/src/adapters/booking/mastercamping/`.** Read `MastercampingSearchAdapter.ts` (validates `idProperty`/`bookingUrl`, awaits both assets, guards `window.MasterWidget`, mounts into a uniquely-id'd inner `<div>`, maps `layout → widget_columns`/`dropdown`), `mastercamping-runtime.ts` (the static-asset loader over `loadScript` + `loadStylesheet`, real-named-field types in `mastercamping.types.ts`), and the two `*.test.ts` for the mocked-externals shape (mock `../script-loader`, stub `window.MasterWidget`).

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

## Adding a widget (beyond search) — DEC-027

The same engine has more than one UI element (search, offers/favorites, simple-block, rates). Each is its **own adapter family + block**, never a mode of a mega-component. The favorites/offers widget is the reference (`ThrFavoritesAdapter` + `BookingFavoritesBlock`); the simple-block widget is a second worked example (`ThrSimpleBlockAdapter` + `BookingSimpleBlock`). To add another widget for an engine:

1. **Port + registry per widget.** Add a `Booking{Widget}Adapter` port + `resolve{Widget}Adapter(engine)` map registry in `adapters/booking/` (mirror `favorites-registry.ts`; placeholders throw). The mount/validation shapes are reused from the search port.
2. **Concrete adapter over the shared runtime.** Implement `Thr{Widget}Adapter` using `thr-runtime.ts` (`ensureThelisResaBootstrap`, callback helpers, `buildThrScriptUrl`) — do not re-implement THR plumbing.
3. **Script flag is tenant-derived, not per-adapter.** Add the widget's `features` flag to `BookingFeatures` and its ILib query flag to `buildThrScriptUrl` (e.g. `simpleblock` → `simpleblock`). THR loads one combined script from `tenant.booking.features`; never negotiate flags between adapters at mount time (timing-fragile — see DEC-027).
4. **Block + feature gate.** Scaffold `Booking{Widget}Block` (`/scaffold-block --target base`); it renders nothing unless `booking.features.{widget}` is on, else resolves the adapter and delegates mount/destroy like `BookingFavoritesBlock`. Register it in `baseBlockRegistry`.
5. **Per-client wiring.** Extend `/setup-booking` with a `--with-{widget}` flag (toggle `features.{widget}` + CSS scaffold) — **no per-widget skill**. Placement is `/add-block`.

## Where to read next

- [`docs/diagrams/booking-architecture.md`](../../diagrams/booking-architecture.md) — the architecture overview + diagrams.
- [`docs/architecture/decisions.md` §DEC-027](../../architecture/decisions.md#dec-027--booking-widgets-beyond-search-adapter-per-widget-shared-thr-script-url-composition-and-a-tenant-feature-toggle) — adding widgets beyond search.
- [`docs/architecture/decisions.md` §DEC-025](../../architecture/decisions.md#dec-025--booking-adapter-pattern--engine-agnostic-blocks-with-ui-delegation) — why this pattern.
- [`docs/integrations/bookings/`](../../integrations/bookings/README.md) — per-engine integration docs.
- [`docs/skills/frontend/block-creation.md`](./block-creation.md) — adding a new booking *block* (vs a new engine adapter).
