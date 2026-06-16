# US-007: THR offers module — BookingFavoritesBlock (featured accommodations)

> **Status:** Raw (pre-enrichment) — DEC-027 is **Accepted**; ready to implement.
> **Epic:** [Multi-engine Booking Search](../plan.md)
> **Depends on:** [DEC-025](../../../architecture/decisions.md#dec-025--booking-adapter-pattern--engine-agnostic-blocks-with-ui-delegation) (booking adapter pattern), **[DEC-027](../../../architecture/decisions.md#dec-027--booking-widgets-beyond-search-adapter-per-widget-shared-thr-script-url-composition-and-a-tenant-feature-toggle)** (adapter-per-widget + tenant-derived THR script-URL + tenant feature toggle) — **Accepted**.
> **Bounded context:** Booking

## User Story

**As a** hwe client that markets featured/special accommodations ("ofertas") through THR,
**I want to** show THR's favorites gallery (`<thr-favorites>`) on my site as a drop-in block, toggled on/off from my client config and themed to my brand colors,
**So that** visitors see my promoted stays without any engine-specific code, and I control whether the module is active and where it appears.

### Description

"Ofertas" maps to THR's `<thr-favorites>` widget (the *coups de cœur* gallery of featured accommodations). This story adds the **second** THR booking widget after search, exercising the DEC-027 pattern for the first time: a dedicated `BookingFavoritesBlock` + `BookingFavoritesAdapter` family, the shared THR runtime + combined script-URL builder, and a tenant-level feature toggle.

Personalization is **colors only** — the widget renders THR's own light DOM, so the brand match happens through the existing `[data-engine="thr"]` color overrides in the client `globals.css`; the block owns only its section wrapper. There is no Figma reference → the visual spec comes from `/design-block` (DEC-016) and is intentionally light.

**Out of scope (other stories / non-goals):**
- Page placement is a composition decision, not part of this block. For the **site-demo fixture only**, place the block in `HomeComposition` immediately after the sticky `BookingSearchBlock` (this also validates the combined script-URL builder, since search + favorites coexist on one page).
- Cookiebot consent wiring (US-005), CSP hardening (US-004), and the other THR widgets (`onenight`/`tarifs`/`categories`) are separate.

## Scope checklist (for the enricher to expand)

- **DEC-027 prerequisites (settled there, cite them):** adapter-per-widget, `thr-runtime.ts` extraction, tenant-derived `buildThrScriptUrl(features)`, `TenantConfig.booking.features.favorites`, `/setup-booking --with-favorites`, colors-only via `[data-engine]`.
- **Refactor FIRST, as its own commit (no behavior change):** extract shared THR plumbing from `ThrSearchAdapter` into `adapters/booking/thr/thr-runtime.ts` (`ensureThelisResaBootstrap`, callback helpers, `buildThrScriptUrl`); refactor `ThrSearchAdapter` to consume it; **keep its 13 tests green and commit before any favorites code**. Do not mix refactor and feature.
- **Script URL is tenant-derived, computed once:** `buildThrScriptUrl(features)` is a pure function returning the final `?searchengine[&favorites][&simpleblock]` URL from `tenant.booking.features`. The `script-loader` stays **unchanged** (dedupes by final `src`). **No dynamic convergence** — see DEC-027 (timing-fragile). Unit-test `buildThrScriptUrl` directly.
- **Adapter family:** `BookingFavoritesAdapter` port + `resolveFavoritesAdapter(engine)` registry (placeholders throw) + `ThrFavoritesAdapter` mounting `<thr-favorites>` with `sites?` (group accounts, JSON array), `quantity?` (default 6), `quantity-to-show?` (default 3), `on-load`. Reference: `thr-ilib-v4.md §6`, `thr-widgets.md`.
- **Block:** `BookingFavoritesBlock` via `/scaffold-block --target base` (5 files: tsx/variants/types/schema/test). Reads tenant, **renders nothing when `booking.features.favorites` is absent/false**, resolves adapter, owns section wrapper + loading/error chrome + `data-engine`/`data-status` hooks (mirror `BookingSearchBlock`). Register in `baseBlockRegistry` (platform default, justified — engine-agnostic).
- **Schema:** `BookingFavoritesBlock.schema.ts` (Zod, presentation-only): `title?`, `quantity?`, `quantityToShow?`, `sites?`, `attributes?` passthrough, `debug?`.
- **Tenant config:** add `features?: { favorites?: boolean }` to `TenantBookingConfig`/`TenantConfig.booking` (additive, optional).
- **Tooling:** extend `/setup-booking` with `--with-favorites` (set the flag + extend the `[data-engine="thr"]` CSS color scaffold for the favorites gallery classes). Placement via existing `/add-block`.
- **site-demo:** add `BookingFavoritesBlock` to `HomeComposition` after the search bar; add favorites color overrides to `globals.css`; set `features.favorites: true` in the demo tenant config.
- **Visual spec:** run `/design-block BookingFavoritesBlock --client site-demo` for the section + color spec.

## Documentation Pointers

- `docs/integrations/bookings/thr/thr-ilib-v4.md` §3, §6 — `<thr-favorites>` attributes + widget list.
- `docs/integrations/bookings/thr/thr-widgets.md` — widget → block map (favorites currently 🔴).
- `docs/integrations/bookings/thr/thr-notes.md` — CSS overrides / light-DOM quirks.
- `docs/skills/frontend/booking-adapter.md` — how to add an engine/widget.
- `docs/diagrams/booking-architecture.md` — adapter pattern.
- `hwe-core/.../adapters/booking/thr/ThrSearchAdapter.ts`, `.../registry.ts`, `.../script-loader.ts`, `.../BookingSearchBlock/*` — the precedent to mirror.

## Acceptance Criteria (draft — enricher to formalize Given/When/Then)

- With `booking = { engine: 'thr', codeCamping, features: { favorites: true } }`, a placed `BookingFavoritesBlock` mounts `<thr-favorites>` (`data-status="mounted"`).
- With `features.favorites` absent/false, the block renders nothing (no error, no chrome).
- A page with both search and favorites loads **one** ILib script whose query carries both flags (`?searchengine&favorites`), because the URL is derived from `tenant.booking.features` before either adapter mounts.
- `ThrSearchAdapter`'s existing 13 tests stay green after the `thr-runtime`/`buildThrScriptUrl` refactor (refactor committed separately, before favorites).
- Brand colors apply through `[data-engine="thr"]` overrides only — no CSS in the block.
- An unimplemented engine resolving favorites throws a clear "not yet implemented" error.
- `/setup-booking --with-favorites` is idempotent (marker-based) and wires flag + CSS scaffold.

## Definition of Done (draft)

- [ ] DEC-027 Accepted.
- [ ] TDD: tests first, all green (core-ui + new); typecheck/lint/build clean.
- [ ] No `any`; Zod at the content boundary.
- [ ] Docs updated (thr-widgets favorites → ✅, booking-adapter "add a widget", block card, catalog, epic plan).
- [ ] site-demo demonstrates search + favorites on Home.
- [ ] Conventional Commits.

## Resolved decisions

- **Defaults — keep THR 6/3.** No hwe-specific defaults; `quantity`/`quantityToShow` stay optional in the schema and are omitted unless a client overrides, so THR applies its own 6 fetched / 3 shown. No reason to invent others. (Cristina, 2026-06-16.)
- **No layout variants.** THR owns the gallery layout; the block owns only its section wrapper. The CVA carries a single `default` variant — no grid/carousel axis. (Cristina, 2026-06-16.)

## Open Questions

- **SPA navigation (TODO — needs a live-account test, ties into US-006).** When navigating from a search-only page to a search+favorites page within the SPA, does THR need `?favorites` present in the initial script URL to include the widget code, or does it load on demand? Since the URL is tenant-derived (all active flags present from first load), this should be a non-issue — but confirm with a real test; leave a code TODO if not verifiable now.
