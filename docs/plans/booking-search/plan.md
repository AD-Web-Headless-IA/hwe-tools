# Epic — Multi-engine Booking Search

> **Bounded context:** Booking
> **Status:** In progress — foundation Done, hardening + second-engine pending
> **Owner:** Cristina Gutiérrez
> **Branches:** `feat/booking-search-block` (hwe-core), `docs/booking-adapter` (hwe-tools)
> **Decisions:** [DEC-025](../../architecture/decisions.md#dec-025--booking-adapter-pattern--engine-agnostic-blocks-with-ui-delegation) (Accepted), [DEC-026](../../architecture/decisions.md#dec-026--mobile-disclosure-as-a-pluggable-strategy-on-bookingsearchblock) (Proposed), [DEC-027](../../architecture/decisions.md#dec-027--booking-widgets-beyond-search-adapter-per-widget-shared-thr-script-url-composition-and-a-tenant-feature-toggle) (Proposed)

## Vision

A single, engine-agnostic availability-search experience that any hwe client site can drop in regardless of which booking engine (PMS/channel manager) the client uses — THR (eSeasonResa), Witbooking, Mastercamping, Resalys, and others to come.

The client never writes engine-specific code. The engine and its account credentials are authoritative in the tenant config (`TenantConfig.booking`, a discriminated union by engine); the block (`BookingSearchBlock`) is presentation-only and delegates the mount/destroy lifecycle to an **adapter** resolved from a registry. Adding an engine = writing one adapter + one registry entry, never touching the block, the renderer, or any client site. Styling the third-party widget happens through `[data-engine]`-scoped overrides in the client's `globals.css` — zero CSS in the block.

This is hexagonal: the block depends on the `BookingSearchAdapter` port; concrete adapters are the infrastructure. The same pattern will host future booking UI elements (one-night, favorites, rates) as separate blocks.

## Stories

| ID | Title | Status |
|---|---|---|
| [US-001](stories/US-001-booking-epic-retrospective.md) | Booking search foundation — adapter layer, THR engine, block, mobile disclosure (retrospective) | ✅ Done |
| US-002 | THR widget HTML/semantics fixes (real class names, a11y, SEO of the injected DOM) | 📋 Planned |
| US-003 | Second engine adapter (Witbooking) — prove the registry with a non-THR integration model | 📋 Planned |
| US-004 | CSP hardening per engine — add each engine's script/frame domains to client `next.config.mjs` | 📋 Planned |
| US-005 | Cookiebot consent bridge — wire `consentAds` to live consent state (read + listen for changes) | 📋 Planned |
| US-006 | Real-engine smoke test (Playwright) — load a live THR account and assert the widget mounts | 📋 Planned |
| [US-007](stories/US-007-booking-favorites-block.md) | THR offers module — `BookingFavoritesBlock` (`<thr-favorites>`), tenant feature toggle, colors-only theming (DEC-027) | ✅ Done (live-DOM CSS classes + SPA nav pending US-006 smoke test) |

## Current state

**Done (US-001):**
- Adapter layer (`adapters/booking/`): port types, map-pattern registry, framework-agnostic script loader.
- THR adapter (ILib v4) — `script-injection` integration, full mount/destroy lifecycle, 13 tests.
- `BookingSearchBlock` — engine-agnostic, tenant-driven, registered as a platform default; `inline`/`sticky`/`modal` variants; `sticky` is opaque + token-driven (`--booking-sticky-top`, `--booking-sticky-shadow`).
- DEC-026 mobile disclosure — pluggable `accordion` strategy.
- `/setup-booking` skill + `scaffold-site` TenantProvider fix; full docs set (diagram, integration guides, adapter skill).

**Done (US-007, DEC-027):**
- Shared `thr-runtime.ts` (bootstrap, callbacks, tenant-derived `buildThrScriptUrl`); `ThrSearchAdapter` refactored onto it (own commit, search tests green).
- Favorites adapter family — `BookingFavoritesAdapter` port + `resolveFavoritesAdapter` registry + `ThrFavoritesAdapter` (`<thr-favorites>`).
- `BookingFavoritesBlock` — engine-agnostic, gated by `booking.features.favorites` (off → renders nothing), registered as a platform default; defaults to THR 6/3, no layout variants.
- `/setup-booking --with-favorites`; site-demo demos search + favorites on Home (one combined ILib script).
- 92 core-ui tests green; typecheck clean (core-ui + site-demo).

**Pending (carried as TODOs / explicit non-goals):**
- Witbooking / Mastercamping / Resalys adapters are throwing placeholders (search + favorites registry entries only).
- `<thr-favorites>` real CSS class names + SPA-navigation script behavior are unverified — need a live-account test (US-006).
- `consentAds` is passed explicitly — Cookiebot wiring is a separate task (`thr.types.ts` TODO → US-005).
- CSP domains are documented but not enforced per client (US-004).
- The THR widget's real CSS class names / semantic HTML are not yet audited (US-002).
- No real-account smoke test yet (US-006).
- DEC-026 awaits decider ratification (Proposed → Accepted).
