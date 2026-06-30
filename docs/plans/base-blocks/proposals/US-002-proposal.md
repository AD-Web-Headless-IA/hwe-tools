# Proposal: US-002: Implement AmenitiesBlock (+ hospitality icon set)

> **Epic:** base-blocks · **Phase:** SPECBOOT `/propose` · **Story:** [`../stories/US-002-amenities-block.md`](../stories/US-002-amenities-block.md) · **Status:** Done (applied + verified green, closed 2026-06-30)

## Summary

This story delivers two units in `@hwe/core-ui` within the **Content bounded context**: an extension of the curated **`Icon` registry** (DEC-024) with a hospitality icon set, and the **`AmenitiesBlock`** base block (amenities / services / equipment sections) that consumes it.

Unlike GalleryBlock (US-001), AmenitiesBlock is **not** a DEC-008 structural-variant block. Its three layouts (`grid`, `checklist`, `list`) differ only in Tailwind layout — same DOM family, no divergent hooks — so they are a **CVA `layout` axis** in a single flat component (ratified decision #1, 2026-06-26). The block is a **Server Component**; the only interactive concern — a per-group collapsible disclosure (reference img 2, "Equipamiento en detalle ▼") — is isolated in one small `'use client'` island (`CollapsibleGroup`), so all amenity content stays server-rendered.

The block renders one or more **labeled groups** (`groups[]`), each a list of icon+label items, so a single instance expresses heterogeneous sections (reference img 1: a `grid` group beside a `checklist` group; reference img 2: a `list` group beside a collapsible detail group). Per-group `layout`/`collapsible` live in **content** (ratified decision #2, "Alt A"); block-wide presentation defaults live in the **Layer-3 config** schema. No Layer-4 adapter (no external service).

The scaffold (`/scaffold-block AmenitiesBlock --target base --config --variants grid,checklist,list`) and its wiring are already applied: `base-blocks/index.ts`, `schemas/index.ts` (re-exporting content + config from the co-located schema), and `renderer/baseBlockRegistry.ts` (registered as a platform default) are done, and the central `schemas/AmenitiesBlock.schema.ts` stub is deleted. `/apply` replaces the placeholder bodies of the six co-located files with the real shapes below.

## Affected files

Schema home: **co-located** in `base-blocks/AmenitiesBlock/` + re-exported from `schemas/` (GalleryBlock precedent, US-001 resolved). The re-export wiring is already in place.

| Path | Change | Why |
|---|---|---|
| `packages/core-ui/src/primitives/Icon/Icon.tsx` | **edit** | Register the hospitality icon set (lucide names) in the curated registry (DEC-024). ~25 names — verify exact lucide exports during `/apply`. |
| `packages/core-ui/src/icons/*.tsx` | **new (only if needed)** | Custom SVG component(s) for any reference icon lucide lacks; mapped by name in the registry (custom entries take precedence). |
| `packages/core-ui/src/primitives/Icon/Icon.test.tsx` | **edit** | Assert each newly registered name resolves; unknown still warns + returns null. TDD-first. |
| `packages/core-ui/src/base-blocks/AmenitiesBlock/AmenitiesBlock.schema.ts` | **edit (rewrite)** | Replace placeholder (`title`+`image?`) with real content: `eyebrow?`, `heading?`, `groups[]` (`AmenityGroup` + `AmenityItem`). Co-located canonical. |
| `packages/core-ui/src/base-blocks/AmenitiesBlock/AmenitiesBlock.config.schema.ts` | **edit (rewrite)** | Real Layer-3 config: `layout`, `columns`, `iconStyle`, `headingLevel`, `background`. |
| `packages/core-ui/src/base-blocks/AmenitiesBlock/AmenitiesBlock.variants.ts` | **edit** | CVA recipe: `layout` axis (`grid`/`checklist`/`list`) + styling axes for `iconStyle` and `columns` (Tailwind classes from tokens). Keep the axis named `variant` (DEC-023) — see open question on the layout source. |
| `packages/core-ui/src/base-blocks/AmenitiesBlock/AmenitiesBlock.types.ts` | **edit** | Re-export `AmenitiesBlockContent`, add `AmenityGroup`, `AmenityItem`, `AmenitiesBlockConfig`, `AmenitiesBlockProps`. |
| `packages/core-ui/src/base-blocks/AmenitiesBlock/AmenitiesBlock.tsx` | **edit (rewrite)** | RSC shell: parse content + config; render `eyebrow`/`heading` (at `headingLevel`), then each group (sub-heading + `<ul role="list">` of items, icon via `Icon`, optional `href` → `<a>`, `footnote`). Resolve effective layout per group (`group.layout ?? config.layout`). Delegate `collapsible` groups to `CollapsibleGroup`. Apply full-bleed `background` token. Set `data-block="amenities"`. |
| `packages/core-ui/src/base-blocks/AmenitiesBlock/CollapsibleGroup.tsx` | **new** | `'use client'` disclosure island (WAI-ARIA Disclosure): toggle `<button aria-expanded aria-controls>` + region; wraps a group's server-rendered markup; items stay in the DOM (CSS-hidden) when collapsed. `prefers-reduced-motion` → instant. |
| `packages/core-ui/src/base-blocks/AmenitiesBlock/AmenitiesBlock.test.tsx` | **edit (rewrite)** | TDD-first (see Tests). Remove the placeholder `tone="light/dark"` cases (the axis is `variant`, not `tone`). |
| `packages/core-ui/src/base-blocks/index.ts` | **done** | `AmenitiesBlock` + `AmenitiesBlockProps` exported (manual edit already applied). |
| `packages/core-ui/src/schemas/index.ts` | **done** | Re-exports `AmenitiesBlockContent` + `AmenitiesBlockConfig` from the co-located schema (applied); stub deleted. |
| `packages/core-ui/src/renderer/baseBlockRegistry.ts` | **done** | `AmenitiesBlock` registered as a platform default (applied). |
| `apps/site-demo/src/blocks/AmenitiesBlock/AmenitiesBlock.tsx` | **new** | Level-1 re-export from `@hwe/core-ui/base-blocks` (mirrors `MediaTextBlock`). |
| `apps/site-demo/src/blocks/registry.ts` | **edit** | Register `AmenitiesBlock` in `clientBlocks`. |
| `apps/site-demo/src/compositions/*.tsx` | **edit** | Add ≥2 demos: (a) a facilities `grid` group + a "services included" `checklist` group in **one** instance (reference img 1); (b) a "what's included" `list` + collapsible "equipment detail" group on an accommodation page (reference img 2). |

## Patterns to follow

- **Icon registry:** extend `primitives/Icon/Icon.tsx` exactly as DEC-024 — `import { Dumbbell, … } from 'lucide-react'` + one `registry` line per name. Never import lucide wholesale. Custom SVGs go under `src/icons/` and map by name (custom takes precedence).
- **Icon usage in the block:** decorative → `<Icon name={item.icon} />` **without** `label` (renders `aria-hidden`), because the visible text label is the accessible name. Follow `MediaTextBlock.tsx:79-83` (feature icon usage).
- **Eyebrow / heading:** `Eyebrow` primitive like `HeroBlock.tsx:35` / `MediaTextBlock.tsx:62`. Render the heading element at `headingLevel` (group headings one level deeper, clamped ≤ 4, never `<h1>`) — same explicit-level approach as GalleryBlock config (resolved decision #3 there).
- **Disclosure island:** mirror `BookingSearchBlock/disclosure/AccordionDisclosure.tsx` (the existing collapse pattern, DEC-026) for `CollapsibleGroup` — button + `aria-expanded`/`aria-controls`, content region keeps mounted markup.
- **`href` items:** plain `<a href={item.href}>` when set; otherwise text. No `Button` (these are links, not CTAs).
- **Links list semantics:** `<ul role="list">` + `<li>` (Tailwind `list-none` strips list semantics in Safari/VoiceOver).
- **Registry shape / client block / composition:** flat `Record<string, BlockComponent>` (code reality); Level-1 re-export like `apps/site-demo/src/blocks/MediaTextBlock/MediaTextBlock.tsx`; `clientBlocks` cast and `BlockInstance[]` composition like the existing demo files.
- **Background token:** full-bleed section background via a `var(--color-*)` token, content in `max-w-[var(--width-container)]` — mirror `MediaTextBlock.tsx:110-114` (`backgroundColor` style on the `<section>`), but the value comes from **config**, not content.
- **Tokens, zero per-block CSS:** card borders, circle/badge backgrounds (`badge` = `var(--color-accent)`), gaps, check colour all from tokens; client overrides scoped `[data-block="amenities"]`.
- **Schema / test idiom:** `z.object`, `z.enum`, `z.union([z.literal(2),…])` for numeric enums; Vitest + `@testing-library/react` + `vitest-axe` with `expect.extend(axeMatchers)` (DEC-006).

## Data and schemas

**Content (`AmenitiesBlock.schema.ts`, Layer 1)** — content only:
- `AmenityItem` = `{ label: z.string().min(1); icon: z.string().optional(); description: z.string().optional(); href: z.string().optional(); footnote: z.string().optional() }`.
- `AmenityGroup` = `{ heading: z.string().optional(); items: z.array(AmenityItem).min(1); layout: z.enum(['grid','checklist','list']).optional(); collapsible: z.boolean().optional(); defaultOpen: z.boolean().optional() }`.
- `AmenitiesBlockContent` = `{ eyebrow: z.string().optional(); heading: z.string().optional(); groups: z.array(AmenityGroup).min(1) }`. Export `z.infer` types for all three.
- **Per-group `layout`/`collapsible` in content is intentional** (ratified decision #2 / "Alt A") — group structure varies within one payload.

**Config (`AmenitiesBlock.config.schema.ts`, Layer 3)** — behavioral/presentation defaults, separate from content:
- `layout: z.enum(['grid','checklist','list']).default('grid')` — block-wide default; a group's own `layout` overrides it.
- `columns: z.union([z.literal(2),z.literal(3),z.literal(4)]).default(3)` — grid + list.
- `iconStyle: z.enum(['plain','circle','badge']).default('plain')` — `plain`/`circle` (neutral disc, img 2)/`badge` (accent disc, img 3).
- `headingLevel: z.union([z.literal(2),z.literal(3),z.literal(4)]).default(2)` — never `<h1>`.
- `background: z.string().optional()` — full-bleed section background colour token. **v1 = colour only**; image background deferred (story "Deferred").
- No `.refine()` needed for v1 (no cross-field constraints; `columns` is simply ignored by `checklist`).

**Icon set (`Icon.tsx`)** — provisional ~25, pin against the real demo content during `/apply`: `dumbbell`, `briefcase`, `coffee`, `utensils`, `clock`, `bed`, `refrigerator`, `microwave`, `tv`, `paw-print`, `snowflake`, `sparkles`, `flame`, `zap`, `lock`, `bath`, `umbrella`, `palmtree`, `volleyball`, `baby`, `flower`, `droplets`, `car`, `key`, `shield`. Verify each is a real lucide export; custom SVG fallback otherwise.

**No JSON-LD** — presentational block (story §SEO). `amenityFeature` structured data is a template concern, not this block's.

## Layer declaration

- **Layer 1 (content schema): ✓** — `AmenitiesBlockContent` (`eyebrow?`, `heading?`, `groups[]`).
- **Layer 2 (variants): CVA (Level A), not structural.** `grid`/`checklist`/`list` differ in Tailwind layout only — no divergent hooks/DOM trees → CVA `layout` axis, single component (ratified decision #1). Deliberate inverse of GalleryBlock. The one interactive concern (`CollapsibleGroup`) is an isolated `'use client'` sub-component, not a structural variant.
- **Layer 3 (config schema): ✓ needed** — `layout` default, `columns`, `iconStyle`, `headingLevel`, `background`. Config strictly separate from content (`block-contract.md` §40).
- **Layer 4 (adapter): ✗ not needed** — static content, no external service. `hasAdapter: false`.
- **Slots:** none for v1. Consumed at Level 1 (re-export).

## Tests to write (TDD-first)

**`Icon.test.tsx`** (extend existing):
- Each newly registered name resolves to a rendered SVG; unknown name still `console.warn`s + returns null; decorative (no `label`) → `aria-hidden`, with `label` → `role="img"` + `aria-label`.

**`AmenitiesBlock.test.tsx`** (rewrite):
- *Schema (Layer 1):* parses minimal (1 group, 1 item with only `label`); fails on empty `groups[]` / empty `items[]`; `icon`/`heading` optional; `href`/`footnote` accepted.
- *Config (Layer 3):* defaults applied (`layout:'grid'`, `columns:3`, `iconStyle:'plain'`, `headingLevel:2`); rejects invalid enum/columns.
- *Rendering per layout:* `grid`, `checklist`, `list` each render without error; `checklist` shows a uniform check and ignores per-item `icon`.
- *Groups:* multiple groups render; **per-group `layout` override** beats the config default (grid + checklist in one instance); group headings render one level below the block heading; group/block headings never `<h1>`.
- *Items:* item with `href` renders `<a>`; without renders text; `footnote` rendered; `description` rendered; icon decorative (`aria-hidden`), label is the accessible name.
- *iconStyle:* `plain`/`circle`/`badge` apply the expected wrapper classes (token-driven).
- *Collapsible:* `collapsible` group renders a `<button aria-expanded aria-controls>`; toggling flips `aria-expanded`; items remain in the DOM when collapsed (SSR/AT); `defaultOpen` honored.
- *Lists:* each group is `<ul role="list">` with `<li>` items.
- *Background:* `config.background` applies the token to the section style.
- *A11y:* `axe` → no violations for each layout + collapsed/expanded states (`toHaveNoViolations`).

## Resolved (by Cristina)

- **#1 Layouts → CVA, not DEC-008 structural** (2026-06-26). One flat component; `CollapsibleGroup` is the only client island.
- **#2 Per-group `layout`/`collapsible` in content ("Alt A")** (2026-06-26). Block-wide defaults in config; per-group overrides in content; rejected alternative (block-level `layout` config + img 1 as two instances) recorded in the story.
- **#3 Background → full-bleed colour token in config; content contained** (2026-06-26). Image background deferred.
- **#4 Icon registry expansion bundled, curated-only** (2026-06-26). No open/dynamic library access, no per-item emoji/SVG escape hatch — `AmenityItem.icon` is always a registered registry name.

## Remaining risks and open questions

- **Layout source — `config.layout` vs `BlockInstance.variant`. ✅ Resolved (Cristina, 2026-06-30): `config.layout`.** The block-wide default layout reads from `config.layout` (+ per-group `layout` override); the DEC-023 `variant` prop is intentionally unused as the layout selector. All layout knobs live together with `columns`/`iconStyle`.
- **`iconStyle` per group?** v1 makes `iconStyle` block-wide config. Img 1 (plain card icons) + img 3 (accent badge) suggest it could vary per group like `layout`. Deferred to v1-as-block-wide unless review wants per-group; would mirror the `layout` override.
- **Exact lucide export names** — verify the ~25 names during `/apply`; some may differ (e.g. `paw-print` → `PawPrint`) or be missing (custom SVG fallback).
- **`prefers-reduced-motion`** — handle in `CollapsibleGroup` only (the sole animated piece).

## Out of scope

- Full-bleed background **image** (+ overlay/contrast) — deferred (story "Deferred (post-v1)").
- Per-item emoji/SVG icon escape hatch and open/dynamic icon-library access — rejected (decision #4).
- Per-group `iconStyle` override (unless the open question resolves otherwise).
- `amenityFeature` / `LocationFeatureSpecification` JSON-LD — template concern, not this block.
- Payload CMS field derivation; client CSS override files in `site-demo` (token-driven defaults only).
- DEC-008 structural-variant layout (`index.ts` resolver + subfolders) — explicitly not used (decision #1).

## References

- Story: `hwe-tools/docs/plans/base-blocks/stories/US-002-amenities-block.md`.
- `hwe-tools/docs/specs/frontend/block-architecture.md` §Layer 1/2/3, §5 testing, §6 SEO.
- `hwe-tools/docs/contracts/frontend/block-contract.md` §The schema, §The variants (CVA), §"When to make a new block vs add a variant", §Registry.
- `hwe-tools/docs/architecture/decisions.md` — **DEC-024** (curated Icon registry), **DEC-029** (per-instance config via BlockInstance/BlockRenderer), **DEC-026** (disclosure), **DEC-023** (variant prop), **DEC-015** (ownership / co-located schema).
- Code mirrors: `MediaTextBlock.tsx` (Icon + Eyebrow + `backgroundColor`, next/image), `HeroBlock.tsx` (Eyebrow, heading), `BookingSearchBlock/disclosure/AccordionDisclosure.tsx` (disclosure), `primitives/Icon/Icon.tsx` (registry to extend), `renderer/baseBlockRegistry.ts`, `schemas/index.ts`, `base-blocks/index.ts`, `apps/site-demo/src/blocks/registry.ts`. Scaffolded files to fill: `base-blocks/AmenitiesBlock/*` (six).
```
