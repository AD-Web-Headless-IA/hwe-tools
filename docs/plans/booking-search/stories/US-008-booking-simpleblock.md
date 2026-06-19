# US-008: THR simple-block module — BookingSimpleBlock

> **Status:** ✅ Done (2026-06-16) — implemented per DEC-027. **CSS brand theming added 2026-06-17** from the verified ILib v4 bundle (simpleblock.html/.css), driven by the reviewed visual spec (`apps/site-demo/docs/block-specs/BookingSimpleBlock.visual-spec.md`); mirrors the favorites methodology. Demo placement on the home is temporary; real `categories` ids + live-DOM re-verification of the class snapshot still pending US-006.
> **Epic:** [Multi-engine Booking Search](../plan.md)
> **Depends on:** [DEC-025](../../../architecture/decisions.md#dec-025--booking-adapter-pattern--engine-agnostic-blocks-with-ui-delegation), **[DEC-027](../../../architecture/decisions.md#dec-027--booking-widgets-beyond-search-adapter-per-widget-shared-thr-script-url-composition-and-a-tenant-feature-toggle)** (no new DEC — simple-block follows the pattern verbatim).
> **Bounded context:** Booking · **Pattern precedent:** US-007 (favorites) — mirror it.

> **Naming correction (2026-06-16):** this widget was first built as "onenight" (`<thr-onenight>` / `BookingOnenightBlock` / `category`) from an outdated note. THR's authoritative ILib v4 doc shows the real element is **`<thr-simpleblock>`** with a **`categories` array** (plus `category-type`, `search-type`, `one-mode`, `date`, `day`, `duration`, `on-search`). The whole tree was renamed to `SimpleBlock` and the contract corrected. See the §5 attributes in `thr-ilib-v4.md`.

## User Story

**As a** hwe client whose THR account offers availability for specific accommodation categories,
**I want to** drop THR's `<thr-simpleblock>` widget on my site as a block, toggled from my client config and themed to my brand,
**So that** visitors can check availability and book one or more chosen categories without any engine-specific code.

### Description

Third and final of the currently-scoped THR widgets (after search + favorites), closing THR coverage with three widget instances. `<thr-simpleblock>` maps the ILib `simpleblock` script flag → `BookingSimpleBlock` + `BookingSimpleBlockAdapter`. It follows DEC-027 verbatim: own adapter family over the shared `thr-runtime`, tenant feature toggle (`booking.features.simpleblock`), tenant-derived `buildThrScriptUrl` (the `simpleblock → simpleblock` flag), colours/typography theming via `[data-engine="thr"]` overrides, structure untouched.

**Key difference vs favorites:** `<thr-simpleblock>` **requires a `categories`** attribute (≥1 accommodation category ID, array literal) — it is per-instance presentation content (the block validates it; the adapter fails gracefully if empty). HWE serialises `categories: string[]` to THR's array-literal form `categories="['12']"`.

**Placement:** loaded on `HomeComposition` **temporarily as a demo** (Cristina: "lo cargaremos como ejemplo en la home, luego lo quitaremos para añadirlo en una página de alojamiento"). It is not its permanent home — a later story/edit moves it to an accommodation page.

## Scope checklist

- **No DEC** — implements within DEC-027; cite it.
- **Adapter family:** `BookingSimpleBlockAdapter` port + `resolveSimpleBlockAdapter(engine)` registry (placeholders throw) + `ThrSimpleBlockAdapter` mounting `<thr-simpleblock>` with `categories` (**required**, serialised to the array literal), `site?` (group accounts), `showPicture?` (`show-picture`), `searchType?` (`search-type`), `day?`, and `on-load`/`on-search`/`on-book`. Reuse `thr-runtime` (`ensureThelisResaBootstrap`, callbacks, `buildThrScriptUrl(features)`). Reference: `thr-ilib-v4.md §5`, `thr-widgets.md`.
- **Validation:** adapter `validateConfig` requires `engine==='thr'`, `codeCamping`, `locale`, **and `categories.length ≥ 1`** — empty categories → `onError` + `mounted:false` (mirrors search/favorites failure path).
- **Block:** `BookingSimpleBlock` via the 5-file pattern (tsx/variants/types/schema/test). Reads tenant, **renders nothing when `booking.features.simpleblock` is absent/false**, resolves adapter, owns section wrapper + loading/error chrome + `data-engine`/`data-status` hooks (mirror `BookingFavoritesBlock`). Register in `baseBlockRegistry` + `base-blocks/index.ts`.
- **Schema:** `BookingSimpleBlock.schema.ts` (Zod, presentation-only): `title?`, **`categories` (required `string[]`, ≥1)**, `showPicture?`, `searchType?` (`'1'|'2'`), `day?`, `site?`, `attributes?` passthrough (category-type, one-mode, date, duration), `debug?`.
- **Tenant config:** `booking.features.simpleblock` on `BookingFeatures` (DEC-027).
- **Tooling:** extend `/setup-booking` with `--with-simpleblock` (toggle `features.simpleblock` + block instance + CSS scaffold). Mirrors `--with-favorites`. Requires a `--categories` arg.
- **site-demo:** add `BookingSimpleBlock` to `HomeComposition` (temporary demo), set `features.simpleblock: true`, reuse the shared card/button theme.

## Documentation Pointers

- `docs/integrations/bookings/thr/thr-ilib-v4.md` §3, §5 — `<thr-simpleblock>` attributes (`categories` required, `category-type`, `search-type`, `one-mode`, `date`, `day`, `duration`, callbacks).
- `docs/integrations/bookings/thr/thr-widgets.md` — widget → block map.
- `docs/integrations/bookings/thr/thr-notes.md` — CSS override strategy + `<thr-favorites>` class snapshot (simple-block class map pending US-006).
- `hwe-core/.../adapters/booking/{favorites-registry.ts, thr/ThrFavoritesAdapter.ts, thr/thr-runtime.ts}` and `.../base-blocks/BookingFavoritesBlock/*` — the precedent mirrored.

## Acceptance Criteria

- With `booking = { engine:'thr', codeCamping, features:{ simpleblock:true } }` and a block with ≥1 `categories`, a placed `BookingSimpleBlock` mounts `<thr-simpleblock>` (`data-status="mounted"`) with `categories="['…']"`.
- With `features.simpleblock` absent/false, the block renders nothing (no error, no chrome).
- With `features.simpleblock:true` but **empty `categories`**, the adapter calls `onError` and the block shows its error state with a Retry.
- A page with search + favorites + simpleblock loads **one** ILib script: `?searchengine&favorites&simpleblock` (tenant-derived `buildThrScriptUrl`).
- An unimplemented engine resolving simple-block throws a clear "not yet implemented" error.
- Brand theming applies via `[data-engine="thr"]` only — no CSS in the block.
- `/setup-booking --with-simpleblock --categories <ids>` is idempotent (marker-based).

## Definition of Done

- [x] TDD: tests first, all green (core-ui 115); typecheck/lint/build clean.
- [x] No `any`; Zod at the content boundary (incl. required `categories`).
- [x] Docs updated (thr-widgets, thr-ilib-v4 §5, thr-notes class map, `/setup-booking` + booking-adapter, catalog, epic plan).
- [x] site-demo demonstrates search + favorites + simpleblock (one combined ILib script).
- [x] Conventional Commits.

## Resolved decisions (Cristina)

- **Placement → HomeComposition, temporary demo.** Moves to a dedicated accommodation page later.
- **No new DEC** — simple-block follows DEC-027.
- **Naming → SimpleBlock** (matches THR's `<thr-simpleblock>`), correcting the initial "onenight" misnomer.

## Open Questions

- **OQ-1 — Valid `categories` ID(s) for the demo account.** `<thr-simpleblock>` needs real accommodation-category IDs for the demo THR account (`mercamargue`/`demosalons`) or it renders empty/errors. Demo currently uses `['12']` (provided by Cristina). (Visibility-only; code/tests don't need it.)
- **OQ-2 — Visual pass: RESOLVED (2026-06-17).** Yes — the simple-block introduces several elements not themed by favorites/search (a category-availability **grid**, month tabs, an overlaid accommodation name, and a **bare `<button>` book CTA that is NOT the search `.btn.btn-primary`**). A `/design-block` pass was done → `BookingSimpleBlock.visual-spec.md` (approved by Cristina), implemented in `globals.css` §THIRD-PARTY OVERRIDES. Corrects the earlier assumption that the reserve button reused the shared `.btn.btn-primary` theme.
- **OQ-3 — SPA / live-DOM verification** remains the standing TODO across THR widgets (US-006) — simple-block class snapshot to be re-verified against the mounted widget.
