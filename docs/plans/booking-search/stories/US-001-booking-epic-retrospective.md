# US-001: Booking search foundation — adapter layer, THR engine, block, mobile disclosure (retrospective)

## User Story

**As a** hwe platform developer onboarding client sites,
**I want to** drop a single engine-agnostic availability-search block into any client site and configure the engine purely through tenant config,
**So that** each client's booking widget works end-to-end without engine-specific code in `@hwe/core-ui` or in the client repo.

### Description

This is a **retrospective** story: it documents booking work already built and merged on `feat/booking-search-block` (hwe-core) and `docs/booking-adapter` (hwe-tools) during this session. It reconstructs the decisions, files, skills, and remaining TODOs so the epic has a developer-readable record of how the foundation was laid. No further code is implied by this story — follow-up work is tracked as US-002…US-006 in [`../plan.md`](../plan.md).

## Technical Specification

### Overview

Bounded context: **Booking**. The work establishes the booking adapter layer inside `@hwe/core-ui` (no separate `@hwe/booking` package — DEC-017) and the first consumer block, `BookingSearchBlock`. The architecture is hexagonal: the block depends on the `BookingSearchAdapter` **port** (`adapters/booking/types.ts`) and resolves a concrete adapter from a **map-pattern registry** (`adapters/booking/registry.ts`) keyed by engine — never `if (engine === 'thr')`. The engine + its account credentials are authoritative in the tenant config (`TenantConfig.booking`, a discriminated union by engine); the block reads them via `useTenant()` and carries presentation only. THR (eSeasonResa ILib v4) is the first implemented adapter, using the `script-injection` integration model: it injects the third-party script (deduped by a shared `script-loader.ts`) and lets the engine render its own `<thr-search-engine>` Web Component into the block's container. Mobile collapse is a second, orthogonal presentation axis (`mobile: 'accordion'`) resolved through its own strategy registry (DEC-026), so the block never branches on collapse mode either.

This composes with the existing variant bridge (DEC-023): `BlockRenderer` passes a `variant` string (`inline`/`sticky`/`modal`); `sticky` pins an opaque, token-driven bar.

### Data Model Changes

No database changes (the platform DB / Payload are not involved — booking is a client-side widget integration).

Tenant config (`TenantConfig.booking`) became a real **discriminated union by `engine`** (it was a `{ provider?: string }` stub from DEC-024, superseded by DEC-025):
- `{ engine: 'thr'; codeCamping: string; siteId?: string }`
- `{ engine: 'witbooking'; hotelId: string }`
- `{ engine: 'mastercamping'; campingCode: string }`
- `{ engine: 'resalys'; propertyId: string }`

Account IDs (`codeCamping`, etc.) are **public** (visible in the engine's HTML) → they live in `client.config.ts`, not env vars.

Block content schema (`BookingSearchBlock.schema.ts`, Zod, presentation-only):
- `widgetTitle?`, `type?`, `hideCategoriesType?`, `hideCapacity?`, `searchText?`, `setDayOfWeek?` — forwarded 1:1 to THR `<thr-search-engine>` attributes.
- `attributes?: Record<string,string>` — escape hatch for verbatim engine attributes.
- `debug?: boolean` — verbose error detail.
- `mobile?: 'accordion'` (`bookingMobileModeSchema`) — DEC-026 disclosure axis; omit → no collapse.
- `variant?: 'inline'|'sticky'|'modal'` (`bookingSearchVariantSchema`) on the Payload block shape.

### API Contracts

No hwe-owned HTTP endpoints. The external integration is the THR ILib v4 script:
- The adapter sets config through the global `thelisresa.ilib(key, value)` setter (`ilib('camping', codeCamping)`, `ilib('language', locale)`, `ilib('consent_ads', 0|1)`), which queues into `.a` until the script loads and processes the queue.
- The engine renders `<thr-search-engine>` with the forwarded attributes; on search submit the engine handles navigation itself. Adapter exposes lifecycle events (`onReady`, `onSearch`, `onError`) up to the block.
- CSP: THR script/frame domains (`thelisresa.webcamp.fr`, per `thr-notes.md`) must be allowed in the client `next.config.mjs` (US-004 — not enforced yet).

### Files to Create or Modify

**hwe-core — `@hwe/core-ui` adapter layer (commits `06df65c`, `4dcc005`, `942c856`):**
- `packages/core-ui/src/adapters/booking/types.ts` — `BookingSearchAdapter` port, `BookingEngineType`, `integrationType`, `mount(container,config,events) → {destroy,mounted}`, `BookingSearchEvents`.
- `packages/core-ui/src/adapters/booking/registry.ts` — map-pattern `resolveSearchAdapter(engine)`; `isEngineSupported`, `getRegisteredEngines`; placeholders throw "not yet implemented".
- `packages/core-ui/src/adapters/booking/script-loader.ts` (+ `.test.ts`) — framework-agnostic (plain DOM, not `next/script`) loader, dedupes by `src`.
- `packages/core-ui/src/adapters/booking/thr/ThrSearchAdapter.ts` (+ `.test.ts`) — THR ILib v4 adapter, `script-injection`, full mount/destroy.
- `packages/core-ui/src/adapters/booking/thr/thr.types.ts` — `thelisresa` global + THR config typing.
- `packages/core-ui/src/adapters/booking/thr/index.ts` — `createThrSearchAdapter` factory.

**hwe-core — block (commits `f9eff82`, `b856092`, `53d9d10`, `b312169`, `3ff5326`, `a90d237`):**
- `packages/core-ui/src/base-blocks/BookingSearchBlock/BookingSearchBlock.tsx` — engine-agnostic block; reads tenant, resolves adapter, owns loading/error/config-error chrome + `data-engine`/`data-status` scope hooks; resolves disclosure strategy.
- `…/BookingSearchBlock.variants.ts` — CVA `inline`/`sticky`/`modal`; `sticky` = `bg-background` opaque + `top-[var(--booking-sticky-top,0px)]` + `shadow-[var(--booking-sticky-shadow,none)]`, `z-40` (below the `z-50` Navbar).
- `…/BookingSearchBlock.types.ts`, `…/BookingSearchBlock.test.tsx` (13 tests).
- `…/disclosure/types.ts` — `DisclosureProps`/`DisclosureStrategy` contract (never unmount children).
- `…/disclosure/registry.ts` — `resolveDisclosure(mode)` map.
- `…/disclosure/AccordionDisclosure.tsx` — full-width toggle (`md:hidden`), panel `hidden`/`md:block`, `aria-expanded`/`aria-controls`.
- `packages/core-ui/src/schemas/BookingSearchBlock.schema.ts` — content + variant + mobile-mode + payload schemas.
- Modified: `providers/TenantProvider` (`TenantConfig.booking` union), `baseBlockRegistry.ts` (register block as platform default), `schemas/index.ts` (barrel).

**hwe-core — site-demo fixture (commits `1f791c7`, `3ff5326`, `a90d237`):**
- `apps/site-demo/src/app/globals.css` — `[data-engine="thr"]` override section + `--booking-sticky-top`/`--booking-sticky-shadow` tokens.
- `apps/site-demo/src/compositions/HomeComposition.tsx` — `BookingSearchBlock` instance, `variant: 'sticky'`, `mobile: 'accordion'`.
- `apps/site-demo/src/app/layout.tsx` — wrapped in `TenantProvider`.

**hwe-tools — docs + skills (branch `docs/booking-adapter`):**
- `docs/architecture/decisions.md` — DEC-025 (Accepted), DEC-026 (Proposed).
- `docs/diagrams/booking-architecture.md` — rewritten to the adapter pattern.
- `docs/integrations/bookings/README.md`, `.../thr/thr-ilib-v4.md`, `.../thr/thr-notes.md`, `.../thr/thr-widgets.md` — THR integration reference.
- `docs/skills/frontend/booking-adapter.md` — "add an engine" guide.
- `docs/guides/bloques/booking/thr/BookingSearchBlock.md` — block usage card.
- `.claude/skills/setup-booking/SKILL.md` — per-client onboarding skill (commit `084e6b2`).
- `.claude/skills/scaffold-site/…` — emits `TenantProvider` in `layout.tsx` (commit `4942e41`).

### Business Rules & Logic

1. **No engine branching in core.** The only switch point is `resolveSearchAdapter(engine)`. The block, renderer and schema union are blind to which engine is active.
2. **Engine + credentials only in tenant config.** There is no engine field in block content and no per-instance override (DEC-025). Block content is presentation only.
3. **Adapter assembles config as** `{ ...tenant.booking, locale: tenant.locale, ...content }` and reads its own real field names (THR reads `codeCamping`).
4. **`mount` is idempotent and resolves even on failure** (`{ mounted: false }`), safe to re-call after `destroy()` (SPA re-navigation).
5. **Disclosure never unmounts the widget container** — the engine mounts into it imperatively; strategies toggle CSS visibility only, and keep the widget shown on `md+`.
6. **Adding an engine = adapter + registry entry**; adding a mobile mode = `bookingMobileModeSchema` member + disclosure registry entry. No block edits either way.

### Error Handling

- **Booking not configured (`!tenant.booking`)** → always-visible config error in the block, no Retry button (retrying can't help); no adapter resolution attempted.
- **Adapter mount fails / `mounted: false`** → error state with a Retry button that re-runs the mount effect (`attempt` counter).
- **Unimplemented engine** → registry factory throws "Booking engine '…' is not yet implemented".
- Degradation principle: the booking widget failing never breaks the page — it renders its own loading/error chrome inside the block section.

### Testing Requirements

**Unit Tests (Vitest + @testing-library/react):** all green (61 core-ui tests).
- `BookingSearchBlock.test.tsx` (13) — scoped section + `data-engine`; adapter resolution + assembled config; destroy on unmount; config-error (no retry); loading; error + retry; recover via retry; `onReady` forwarded; sticky variant class; no disclosure toggle when `mobile` omitted; accordion collapsed-by-default + expands on click; axe audit.
- `ThrSearchAdapter.test.ts` (13) — ILib v4 mount/config/destroy with mocked externals.
- `script-loader.test.ts` (8) — dedupe by `src`, load/error paths.

**Integration Tests:** N/A — covered by the adapter unit tests with mocked externals (no hwe server boundary).

**E2E Tests (Playwright):** none yet — real-account smoke test is US-006.

### Documentation Updates

Done in this epic: DEC-025/DEC-026, booking architecture diagram, THR integration docs, `booking-adapter.md` skill guide, block usage card, `/setup-booking` skill. This retrospective (`plan.md` + US-001) closes the documentation loop.

### Security & Non-Functional Requirements

- Account IDs are public — kept in `client.config.ts`, never env vars; no secrets in the browser.
- **GDPR:** THR loads an external script → a consent bridge is a legal requirement. `consentAds` is plumbed; live Cookiebot wiring is **pending** (US-005).
- **CSP:** each engine's domains must be allowlisted in the client `next.config.mjs` (**pending**, US-004).
- Zod validation at the content boundary; TS strict, no `any`.

### Definition of Done

- [x] Adapter layer (port + registry + script-loader) implemented and tested.
- [x] THR adapter (ILib v4) implemented and tested.
- [x] `BookingSearchBlock` engine-agnostic, tenant-driven, registered as platform default.
- [x] `inline`/`sticky`/`modal` variants; sticky opaque + token-driven.
- [x] DEC-026 mobile disclosure (`accordion`) implemented and tested.
- [x] `/setup-booking` skill + `scaffold-site` TenantProvider fix.
- [x] Docs: DEC-025/026, diagram, THR integration guides, adapter skill, block card.
- [x] Tests written (TDD) and passing — 61 core-ui tests green.
- [x] Type-safe — no `any`; typecheck clean (core-ui + site-demo).
- [x] Conventional Commits.

### Acceptance Criteria

- **Given** a client site with `TenantConfig.booking = { engine: 'thr', codeCamping }`, **when** a `BookingSearchBlock` renders, **then** the THR adapter is resolved and the `<thr-search-engine>` widget mounts (`data-status="mounted"`).
- **Given** a tenant with no `booking`, **when** the block renders, **then** an always-visible config error shows with no Retry and no adapter resolution.
- **Given** a mount failure, **when** the user clicks Retry, **then** the mount effect re-runs.
- **Given** `variant: 'sticky'`, **then** the bar is opaque (`bg-background`), pins at `--booking-sticky-top`, and sits below the Navbar.
- **Given** `mobile: 'accordion'`, **then** on mobile the search is collapsed behind a toggle and expands on click, while `md+` always shows it.
- **Given** an unimplemented engine, **when** resolved, **then** the registry throws a clear "not yet implemented" error.

### Open Questions

1. **DEC-026 ratification** — currently `Proposed`; needs decider sign-off to flip to `Accepted`.
2. **THR widget real CSS class names** — the `[data-engine="thr"]` overrides in site-demo are scaffolded, not verified against the live widget DOM (US-002).
3. **Which second engine to implement first** — Witbooking assumed in US-003; confirm priority.

### References

- `hwe-core/packages/core-ui/src/adapters/booking/types.ts` — `BookingSearchAdapter` port + `integrationType`; the contract every engine implements.
- `hwe-core/packages/core-ui/src/adapters/booking/registry.ts` — map-pattern engine resolution (DEC-017/DEC-025); placeholders throw.
- `hwe-core/packages/core-ui/src/adapters/booking/thr/ThrSearchAdapter.ts` + `thr.types.ts` — THR ILib v4 `script-injection` adapter; `thelisresa.ilib()` setter, `consentAds` TODO (Cookiebot, US-005).
- `hwe-core/packages/core-ui/src/base-blocks/BookingSearchBlock/BookingSearchBlock.tsx` — block lifecycle, tenant-driven config, disclosure resolution.
- `hwe-core/packages/core-ui/src/base-blocks/BookingSearchBlock/disclosure/` — DEC-026 strategy registry + accordion.
- `hwe-core/packages/core-ui/src/schemas/BookingSearchBlock.schema.ts` — content/variant/mobile/payload Zod schemas.
- `docs/architecture/decisions.md` — DEC-025 (booking adapter pattern, Accepted), DEC-026 (mobile disclosure, Proposed).
- `docs/diagrams/booking-architecture.md` — adapter pattern (script-injection / iframe / native).
- `docs/skills/frontend/booking-adapter.md` — how to add an engine.
- `docs/integrations/bookings/thr/thr-ilib-v4.md` — THR ILib v4 attributes + consent (`§2`) + search attributes (`§4`).
- `.claude/skills/setup-booking/SKILL.md` — per-client onboarding (config + CSP + CSS scaffold + TenantProvider + optional block).

### Notes — history

The THR adapter initially targeted ILib **v3** (commit `4dcc005`); it was retargeted to **v4** (commit `942c856`, docs corrected in `ae50bbd`). Current state is ILib v4.
