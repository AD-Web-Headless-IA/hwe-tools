# US-008: THR one-night / passage module — BookingOnenightBlock

> **Status:** ✅ Done (2026-06-16) — implemented per DEC-027. Demo placement on the home is temporary; live `<thr-onenight>` class snapshot + a real `category` id pending US-006.
> **Epic:** [Multi-engine Booking Search](../plan.md)
> **Depends on:** [DEC-025](../../../architecture/decisions.md#dec-025--booking-adapter-pattern--engine-agnostic-blocks-with-ui-delegation), **[DEC-027](../../../architecture/decisions.md#dec-027--booking-widgets-beyond-search-adapter-per-widget-shared-thr-script-url-composition-and-a-tenant-feature-toggle)** (no new DEC — onenight follows the pattern verbatim).
> **Bounded context:** Booking · **Pattern precedent:** US-007 (favorites) — mirror it.

## User Story

**As a** hwe client whose THR account offers immediate / passage ("one-night") availability,
**I want to** drop THR's `<thr-onenight>` widget on my site as a block, toggled from my client config and themed to my brand,
**So that** visitors can book a short/immediate stay for a given accommodation category without any engine-specific code.

### Description

Third and final of the currently-scoped THR widgets (after search + favorites), closing THR coverage with three widget instances. `<thr-onenight>` maps the ILib `simpleblock` script flag → `BookingOnenightBlock` + `BookingOnenightAdapter`. It follows DEC-027 verbatim: own adapter family over the shared `thr-runtime`, tenant feature toggle (`booking.features.onenight`, already defined), tenant-derived `buildThrScriptUrl` (the `onenight → simpleblock` flag is already wired), colours/typography theming via `[data-engine="thr"]` overrides, structure untouched.

**Key difference vs favorites:** `<thr-onenight>` **requires a `category`** attribute (accommodation category ID) — it is per-instance presentation content (the block validates it; the adapter fails gracefully if missing).

**Placement:** load it on `HomeComposition` **temporarily as a demo** (Cristina: "lo cargaremos como ejemplo en la home, luego lo quitaremos para añadirlo en una página de alojamiento"). It is not its permanent home — a later story/edit moves it to an accommodation page.

## Scope checklist (for the enricher / implementer to expand)

- **No DEC** — implements within DEC-027; cite it.
- **Adapter family:** `BookingOnenightAdapter` port + `resolveOnenightAdapter(engine)` registry (placeholders throw) + `ThrOnenightAdapter` mounting `<thr-onenight>` with `category` (**required**), `site?` (group accounts), `showPicture?` (`show-picture` true/false), `on-load`, `on-book`. Reuse `thr-runtime` (`ensureThelisResaBootstrap`, callbacks, `buildThrScriptUrl(features)`). Reference: `thr-ilib-v4.md §5`, `thr-widgets.md`.
- **Validation:** adapter `validateConfig` requires `engine==='thr'`, `codeCamping`, `locale`, **and `category`** — missing category → `onError` + `mounted:false` (mirrors search/favorites failure path).
- **Block:** `BookingOnenightBlock` via the 5-file pattern (tsx/variants/types/schema/test). Reads tenant, **renders nothing when `booking.features.onenight` is absent/false**, resolves adapter, owns section wrapper + loading/error chrome + `data-engine`/`data-status` hooks (mirror `BookingFavoritesBlock`). Register in `baseBlockRegistry` + `base-blocks/index.ts`.
- **Schema:** `BookingOnenightBlock.schema.ts` (Zod, presentation-only): `title?`, **`category` (required string)**, `showPicture?` (boolean), `site?`, `attributes?` passthrough, `debug?`.
- **Tenant config:** `booking.features.onenight` already exists on `BookingFeatures` (DEC-027) — no change.
- **Tooling:** extend `/setup-booking` with `--with-onenight` (toggle `features.onenight` + block instance + CSS scaffold). Mirrors `--with-favorites`. Requires a `--category` arg for the block instance.
- **site-demo:** add `BookingOnenightBlock` to `HomeComposition` (temporary demo), set `features.onenight: true`, add any onenight-specific `[data-engine="thr"]` overrides (likely reuses the shared card/button theme — confirm during the visual pass).
- **Visual:** the onenight card likely reuses the already-themed `.thr-box-footer .btn.btn-primary` + card typography from favorites; a light `/design-block` pass only if it introduces new elements (e.g. a date/price layout not already covered). Decide during implementation.

## Documentation Pointers

- `docs/integrations/bookings/thr/thr-ilib-v4.md` §3, §5 — `<thr-onenight>` attributes (`category` required, `site`, `show-picture`, callbacks).
- `docs/integrations/bookings/thr/thr-widgets.md` — widget → block map (onenight currently P2).
- `docs/integrations/bookings/thr/thr-notes.md` — CSS override strategy + `<thr-favorites>` class snapshot (add an onenight class map after implementation).
- `hwe-core/.../adapters/booking/{favorites-registry.ts, thr/ThrFavoritesAdapter.ts, thr/thr-runtime.ts}` and `.../base-blocks/BookingFavoritesBlock/*` — the precedent to mirror.

## Acceptance Criteria (draft — enricher to formalize Given/When/Then)

- With `booking = { engine:'thr', codeCamping, features:{ onenight:true } }` and a block with a valid `category`, a placed `BookingOnenightBlock` mounts `<thr-onenight>` (`data-status="mounted"`).
- With `features.onenight` absent/false, the block renders nothing (no error, no chrome).
- With `features.onenight:true` but **no `category`**, the adapter calls `onError` and the block shows its error state with a Retry.
- A page with search + favorites + onenight loads **one** ILib script: `?searchengine&favorites&simpleblock` (tenant-derived `buildThrScriptUrl`).
- An unimplemented engine resolving onenight throws a clear "not yet implemented" error.
- Brand theming applies via `[data-engine="thr"]` only — no CSS in the block.
- `/setup-booking --with-onenight --category <id>` is idempotent (marker-based).

## Definition of Done (draft)

- [ ] TDD: tests first, all green (core-ui + new); typecheck/lint/build clean.
- [ ] No `any`; Zod at the content boundary (incl. required `category`).
- [ ] Docs updated (thr-widgets onenight → ✅, thr-notes onenight class map, `/setup-booking` + booking-adapter "add a widget", catalog, epic plan).
- [ ] site-demo demonstrates search + favorites + onenight (one combined ILib script).
- [ ] Conventional Commits.

## Resolved decisions (Cristina)

- **Placement → HomeComposition, temporary demo.** Will be moved to a dedicated accommodation page later (separate edit/story). Mounting it on the home now is only to validate the third widget + the three-flag combined script.
- **No new DEC** — onenight follows DEC-027.

## Open Questions

- **OQ-1 — Valid `category` ID for the demo account.** `<thr-onenight>` needs a real accommodation-category ID for the demo THR account (`mercamargue`/`demosalons`) or it renders empty/errors. Which category ID do we use for site-demo? (Blocker for a *visibly* working demo; the code/tests don't need it.)
- **OQ-2 — Visual pass:** does the onenight card introduce any element not already themed for favorites/search (date/price block, picture toggle)? If yes, a short `/design-block` pass; if it reuses the shared card+button theme, skip.
- **OQ-3 — SPA / live-DOM verification** remains the standing TODO across THR widgets (US-006) — onenight class snapshot to be re-verified against the mounted widget.
