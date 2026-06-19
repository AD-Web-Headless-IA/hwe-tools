# Proposal: US-001: Implement GalleryBlock (+ SwiperPrimitive)

> **Epic:** base-blocks · **Phase:** SPECBOOT `/propose` · **Story:** [`../stories/US-001-gallery-block.md`](../stories/US-001-gallery-block.md) · **Status:** Ready for review → `/apply`

## Summary

This story delivers two units in `@hwe/core-ui` within the **Content bounded context**: a new shared **`SwiperPrimitive`** (the platform's single Swiper import site, ratified by **DEC-028**) and the **`GalleryBlock`** base block that is its first consumer. The block migrates from the currently-scaffolded flat 5-file layout to the **DEC-008 structural-variant layout**: an `index.ts` resolver plus one subfolder per structural variant (`slider`, `slider-thumbs`, `grid`, `masonry`, `collage`), a `shared/` folder for the server shell, lightbox island and figure component, and shared content/config schemas. GalleryBlock is the codebase's **first** block to use the Layer-3 behavioral config schema and the **first** real structural-variant block — so the contract (`block-architecture.md`, `block-contract.md`) is the source of truth, not the existing flat blocks.

GalleryBlock uses **Layers 1, 2 (structural / Level B per `block-architecture.md` §Layer 2), and 3**; no Layer 4 adapter (it renders static content, no external service — `block-architecture.md` §Layer 4). The architecture-critical decision is the **server/client split**: a Server Component shell parses both schemas and emits the semantic `<figure>`/`next/image` markup plus the JSON-LD `ImageGallery` script (so images, `alt`, and structured data are in the SSR HTML for the `seo-audit-geo-llm` SSR check), while a `'use client'` island hydrates carousel/lightbox interactivity over that markup. The carousel variants delegate all Swiper wiring to `SwiperPrimitive`; the static variants (`grid`/`masonry`/`collage`) load no Swiper at all.

## Affected files

**Note on schema location (code reality vs contract):** `block-contract.md` §33-46 says schemas are co-located *and* re-exported from `schemas/`. The actual codebase (`BookingSearchBlock`, `HeroBlock`, etc.) places the canonical schema in `packages/core-ui/src/schemas/` and imports from there; the scaffolded `GalleryBlock.schema.ts` is co-located. To match the live convention (and DEC-015 §2, which says schemas live in `schemas/`), the canonical schemas should live in `schemas/`. Flagged as an open question below; the table follows code reality (`schemas/`).

| Path | Change | Why |
|---|---|---|
| `packages/core-ui/package.json` | **edit** | Add `swiper` to `dependencies` (latest stable major), per DEC-028 §5. Record version in commit. |
| `packages/core-ui/src/primitives/Swiper/SwiperPrimitive.tsx` | **new** | `'use client'` wrapper; single Swiper import site; modular module + CSS imports; ARIA carousel wiring, keyboard, `prefers-reduced-motion` (DEC-028 §2). |
| `packages/core-ui/src/primitives/Swiper/SwiperPrimitive.types.ts` | **new** | Typed props: slides, enabled modules, typed config (autoplay/loop/effect/navigation/pagination/thumbs), required `ariaLabel`. No `any` (DEC-028 §3). |
| `packages/core-ui/src/primitives/Swiper/SwiperPrimitive.test.tsx` | **new** | TDD-first: rendering, module wiring, ARIA, keyboard, axe. |
| `packages/core-ui/src/index.ts` | **edit** | Export `SwiperPrimitive` + its props type alongside the other primitives. |
| `packages/core-ui/src/schemas/GalleryBlock.schema.ts` | **new** | Layer-1 content schema: `title?`, `images[]` (`.min(1)`) with required `alt`/`width`/`height`. Canonical home per DEC-015 §2 / live convention. |
| `packages/core-ui/src/schemas/GalleryBlock.config.schema.ts` | **new** | Layer-3 config schema: variant/headingLevel/columns/aspectRatio/lightbox/autoplay/autoplayDelay/loop/showDots/showArrows/effect + refinements. |
| `packages/core-ui/src/schemas/index.ts` | **edit** | Re-export `GalleryBlockContent` and `GalleryBlockConfig`. |
| `packages/core-ui/src/base-blocks/GalleryBlock/GalleryBlock.schema.ts` | **delete-and-replace** | Scaffolded placeholder (title + single optional `image`) is wrong shape. Canonical schema lives in `schemas/`. (If co-located convention is kept per open question, this becomes a re-export.) |
| `packages/core-ui/src/base-blocks/GalleryBlock/GalleryBlock.config.schema.ts` | **delete** | Empty placeholder; replaced by `schemas/GalleryBlock.config.schema.ts`. |
| `packages/core-ui/src/base-blocks/GalleryBlock/GalleryBlock.variants.ts` | **delete** | Placeholder CVA recipe; DEC-008 forbids CVA for the structural axis. The structural choice is the `index.ts` resolver, not `cva()`. |
| `packages/core-ui/src/base-blocks/GalleryBlock/GalleryBlock.tsx` | **delete** | Flat component replaced by the resolver in `index.ts` + per-variant components. |
| `packages/core-ui/src/base-blocks/GalleryBlock/GalleryBlock.types.ts` | **edit** | Re-point to `schemas/` for `GalleryBlockContent`/`GalleryBlockConfig`, add `GalleryImage`, `GalleryVariantKey`, `GalleryBlockProps`. |
| `packages/core-ui/src/base-blocks/GalleryBlock/index.ts` | **new** | DEC-008 variant resolver: maps `slider \| slider-thumbs \| grid \| masonry \| collage` → component; default `slider`. Imported by registry. |
| `packages/core-ui/src/base-blocks/GalleryBlock/shared/GalleryShell.tsx` | **new** | Server Component shell: parses schemas, renders semantic `<figure>`/`next/image` markup + JSON-LD `ImageGallery`, renders the heading at `headingLevel`, hosts the client island. |
| `packages/core-ui/src/base-blocks/GalleryBlock/shared/GalleryFigure.tsx` | **new** | Shared `<figure>`/`<figcaption>` + `next/image` (correct `priority`/`loading`, `width`/`height`) used by all variants. |
| `packages/core-ui/src/base-blocks/GalleryBlock/shared/GalleryLightbox.tsx` | **new** | `'use client'` lightbox island: Swiper fullscreen via `SwiperPrimitive` (Zoom + Navigation + Keyboard + A11y), `role="dialog"`, `aria-modal`, focus trap + restore. Shared by all variants when `lightbox: true`. |
| `packages/core-ui/src/base-blocks/GalleryBlock/shared/jsonLd.ts` | **new** | Pure builder: `GalleryBlockContent` → `ImageGallery` JSON-LD object (`image[]` of `ImageObject`). Server-rendered, unit-testable. |
| `packages/core-ui/src/base-blocks/GalleryBlock/GallerySlider/GallerySlider.tsx` | **new** | `'use client'` carousel island over server markup; `SwiperPrimitive` with Navigation/Pagination/Autoplay(opt)/A11y/EffectFade(if fade). |
| `packages/core-ui/src/base-blocks/GalleryBlock/GallerySliderThumbs/GallerySliderThumbs.tsx` | **new** | `'use client'` two synced `SwiperPrimitive` instances (Navigation/Thumbs/A11y). |
| `packages/core-ui/src/base-blocks/GalleryBlock/GalleryGrid/GalleryGrid.tsx` | **new** | CSS Grid (no Swiper); `columns` 2/3/4 → responsive Tailwind cols; first ~3-4 images `priority`. |
| `packages/core-ui/src/base-blocks/GalleryBlock/GalleryMasonry/GalleryMasonry.tsx` | **new** | CSS multi-column (`columns-*`) per resolved decision #2 (no Grid masonry, no JS); no Swiper. |
| `packages/core-ui/src/base-blocks/GalleryBlock/GalleryCollage/GalleryCollage.tsx` | **new** | CSS Grid template-areas (featured + smaller); no Swiper. |
| `packages/core-ui/src/base-blocks/GalleryBlock/GalleryBlock.test.tsx` | **edit (rewrite)** | TDD-first: per-variant render, a11y, lightbox open/close + focus trap, `priority` on first image, JSON-LD presence, `<figure>/<figcaption>`, schema parse/refinement, edge cases (1 image / many). |
| `packages/core-ui/src/base-blocks/index.ts` | **edit** | Export `GalleryBlock` + `GalleryBlockProps` from `./GalleryBlock` (resolves to `index.ts`). |
| `packages/core-ui/src/renderer/baseBlockRegistry.ts` | **edit** | Add `GalleryBlock: GalleryBlock as ... BlockComponent` (flat `Record` shape per code reality). |
| `apps/site-demo/src/blocks/GalleryBlock/GalleryBlock.tsx` | **new** | Level-1 re-export from `@hwe/core-ui/base-blocks` (mirrors `MediaTextBlock`). |
| `apps/site-demo/src/blocks/registry.ts` | **edit** | Register `GalleryBlock` in `clientBlocks`. |
| `apps/site-demo/src/compositions/AccommodationComposition.tsx` | **edit** | Add a `slider-thumbs` GalleryBlock instance with realistic content. |
| `apps/site-demo/src/compositions/HomeComposition.tsx` | **edit** | Add a `grid` GalleryBlock instance (≥2 variants demoed, per checklist). |

## Patterns to follow

- **Structural resolver:** `index.ts` resolver shape from `block-contract.md` §142-165 and DEC-008 §496-519. Default to the first key (`slider`). Closest existing analogue is `BookingSearchBlock/disclosure/registry.ts` (map pattern, never branch on the key) — mirror that style.
- **`next/image`:** follow `MediaTextBlock.tsx:26-33` (`Image` with `sizes`, `className="object-cover"`). Explicit `width`/`height` from schema; `priority` for the first visible image(s), `loading="lazy"` otherwise.
- **Registry shape:** match code reality — `baseBlockRegistry.ts` is a flat `Record<string, BlockComponent>` with the deliberate `as unknown as BlockComponent` erasure cast, NOT the rich `{ component, contentSchema, … }` object in `block-architecture.md` §9 / `block-contract.md` §314. Flag if the richer shape is wanted (open question).
- **Client block / composition:** Level-1 re-export like `apps/site-demo/src/blocks/MediaTextBlock/MediaTextBlock.tsx`; `clientBlocks` cast like `apps/site-demo/src/blocks/registry.ts`; composition `BlockInstance[]` like `AccommodationComposition.tsx`.
- **Tokens, zero per-block CSS:** controls derive from `var(--color-*)` tokens (story §Styling); Tailwind utilities only; client overrides scoped `[data-block="gallery"]`. Set `data-block="gallery"` on the shell root.
- **Schema idiom:** `z.object`, explicit `z.literal` unions for numeric enums (mirror `block-architecture.md` §130 `columns`), `.refine()` for cross-field constraints with clear messages (`block-contract.md` §76).
- **Test idiom:** Vitest + `@testing-library/react` + `vitest-axe` with `expect.extend(axeMatchers)` — as the scaffolded `GalleryBlock.test.tsx:1-8` (DEC-006).

## Data and schemas

**Content (`schemas/GalleryBlock.schema.ts`, Layer 1)** — content only, no behavioral knobs (`block-contract.md` §38-40, story §Content fields):
- `GalleryImage` = `{ src: z.string().url(); alt: z.string().min(1); caption: z.string().optional(); width: z.number().int().positive(); height: z.number().int().positive() }`. `alt` is `.min(1)` so Zod rejects empty/missing alt at the boundary (guide §4.1).
- `GalleryBlockContent` = `{ title: z.string().optional(); images: z.array(GalleryImage).min(1) }`. Export `type GalleryBlockContent = z.infer<…>` and `type GalleryImage = z.infer<…>`.

**Config (`schemas/GalleryBlock.config.schema.ts`, Layer 3)** — story §Behavioral config table:
- `variant: z.enum(['slider','slider-thumbs','grid','masonry','collage']).default('slider')`
- `headingLevel: z.union([z.literal(2),z.literal(3),z.literal(4)]).default(2)` (resolved decision #3; never `<h1>`)
- `columns: z.union([z.literal(2),z.literal(3),z.literal(4)]).default(3)`
- `aspectRatio: z.enum(['16/9','4/3','3/2','1/1','auto']).default('16/9')`
- `lightbox: z.boolean().default(true)`, `autoplay: z.boolean().default(false)`, `autoplayDelay: z.number().int().positive().default(3000)`, `loop: z.boolean().default(true)`, `showDots: z.boolean().default(true)`, `showArrows: z.boolean().default(true)`, `effect: z.enum(['slide','fade']).default('slide')`
- **Refinement** (story line 70): when `autoplay === false`, `autoplayDelay` is not meaningful — express with `.refine()` and a clear message. Keep refinements light; do not over-constrain variant-conditional fields that are simply ignored by a given variant's renderer.

**JSON-LD `ImageGallery`** (guide §4.5, `block-architecture.md` §6) — built in `shared/jsonLd.ts`, server-rendered in `GalleryShell`:
```json
{ "@context":"https://schema.org", "@type":"ImageGallery",
  "name": "<title, if present>",
  "image": "images.map(i => ({ '@type':'ImageObject', url:i.src, name:i.caption ?? i.alt, description:i.alt, width:i.width, height:i.height }))" }
```
Emit via `<script type="application/ld+json">` with `dangerouslySetInnerHTML` (server side only).

## Layer declaration

- **Layer 1 (content schema): ✓** — `GalleryBlockContent` (`title?`, `images[]`). Always required (`block-architecture.md` §Layer 1).
- **Layer 2 (variants): structural (Level B).** The five variants need different DOM trees and hooks: `slider`/`slider-thumbs` use Swiper hooks/synced instances; `grid` is CSS Grid; `masonry` is CSS columns; `collage` is grid-template-areas. They cannot be a CVA value change → DEC-008 §544-548, story §17-19. Schema is shared across variants (DEC-008 §523-527); `index.ts` resolves. A CVA `tone` inside a single variant remains permitted but is out of scope here.
- **Layer 3 (config schema): ✓ needed** — runtime behavioral options (variant, columns, lightbox, autoplay, effect, headingLevel…). Exactly the §Layer 3 trigger (`block-architecture.md` §113-116); GalleryBlock is the platform's first Layer-3 consumer. Config kept strictly separate from content (`block-contract.md` §40).
- **Layer 4 (adapter): ✗ not needed** — renders static content from its own schema, connects to no external service (`block-architecture.md` §Layer 4). `hasAdapter: false`.
- **Slots (DEC-015 §2.5):** none for v1. Consumed at Level 1 (re-export). Flagged as open question if the team wants a `media`/`figure` slot now.

## Tests to write (TDD-first)

**`SwiperPrimitive.test.tsx`** (DEC-028 contract):
- *Rendering:* renders provided slides as children; renders with a single slide.
- *Module wiring:* enables only the modules passed in (no full-bundle import); thumbs config wires a second instance.
- *A11y (structural):* container has `role="region"` + `aria-roledescription="carousel"` + the `ariaLabel`; each slide has `role="group"` + `aria-roledescription="slide"` + `aria-label="Image X of Y"`; `axe` → no violations.
- *Contract:* `ariaLabel` is required (type-level; assert it is rendered).

**`GalleryBlock.test.tsx`** (story §126, `block-architecture.md` §5):
- *Schema (Layer 1):* parses minimal (1 image, all required fields); fails on empty `images[]` (`.min(1)`); fails on missing/empty `alt`; fails on missing `width`/`height`.
- *Config (Layer 3):* defaults applied (`variant:'slider'`, `headingLevel:2`, `lightbox:true`, …); rejects invalid enum/columns; refinement behavior for autoplay/autoplayDelay.
- *Rendering per variant:* each of the five structural variants renders without error.
- *SEO:* first visible image gets `priority`; JSON-LD `ImageGallery` present in server output with one `ImageObject` per image; captioned images render `<figure>`/`<figcaption>`.
- *Heading:* `title` renders at `headingLevel` (h2 default, h3/h4 when configured); never `<h1>`.
- *Lightbox interaction:* Enter/Space on an image opens lightbox (`role="dialog"`, `aria-modal="true"`); Esc closes; focus trapped on open and restored on close; `lightbox:false` disables.
- *Edge cases:* single image; many images (20+) — lazy loading on non-priority images.
- *A11y:* `axe` → no violations for each variant (`toHaveNoViolations`).

## Resolved (by Cristina, 2026-06-19)

- **Schema home → co-located + re-export (RESOLVED).** Follow the contract: the canonical schema lives co-located at `base-blocks/GalleryBlock/GalleryBlock.schema.ts` (and `GalleryBlock.config.schema.ts`), and `schemas/index.ts` **re-exports** it. GalleryBlock sets the correct precedent — it does *not* follow the `schemas/`-canonical shortcut some existing blocks took. → The "Affected files" rows that placed the canonical schema in `schemas/` are inverted: canonical co-located, `schemas/index.ts` is an `edit` that re-exports `from '../base-blocks/GalleryBlock/GalleryBlock.schema'`. The scaffolded co-located schema is **edited in place** (real shape), not deleted.
- **Registry stays flat (RESOLVED).** Keep `baseBlockRegistry.ts` as the flat `Record<string, BlockComponent>`. `GalleryShell` parses its own content + config schemas internally (defensive parse at the block boundary). Extending the registry to the rich shape is a **future refactor, out of scope** for this story.

## Remaining risks and open questions
- **Swiper v12 + Next 15 / React 19 SSR:** the server-shell/client-island split is the mitigation, but verify `swiper/react` hydrates cleanly over server markup and that modular CSS imports work under Tailwind v4. Spike during `/apply`.
- **`prefers-reduced-motion` + autoplay:** enforce inside `SwiperPrimitive` (DEC-028 §2) so all five blocks inherit it; GalleryBlock should not re-implement it.
- **Masonry reading order:** CSS `columns` lays out top-to-bottom per column, diverging from visual order (resolved decision #2). Keep DOM order meaningful and assert with the a11y test.
- **`/scaffold-variant` skill:** the checklist suggests using it; confirm whether the Implementer runs it (creates subfolders + wires `index.ts`) or hand-writes the layout. Either way the end state matches the affected-files table.

## Out of scope

- Other slider consumers (ReviewsBlock, AccommodationCardBlock, PromoBlock, footer logo slider) — they consume `SwiperPrimitive` later (guide §8); not built here.
- Payload CMS field derivation (`block-architecture.md` §8 — future phase).
- CVA `tone`/styling sub-variants inside a structural variant.
- Slot definitions (`*.slots.ts`) — none for v1 unless the open question resolves otherwise.
- Client CSS override files in `site-demo` (overrides are a client concern; only token-driven defaults ship here).

## References

- Story: `hwe-tools/docs/plans/base-blocks/stories/US-001-gallery-block.md`.
- `hwe-tools/docs/specs/frontend/block-architecture.md` §Layer 1/2/3/4, §2 file structure, §5 testing, §6 SEO/JSON-LD, §9 registry.
- `hwe-tools/docs/contracts/frontend/block-contract.md` §The schema (§42-77), §Structural variants (§109-194), §The resolver (§142-165), §The `shared/` folder, §Registry.
- `hwe-tools/docs/architecture/decisions.md` — **DEC-008** (structural variants; GalleryBlock worked example), **DEC-028** (SwiperPrimitive contract).
- Guide: `hwe-tools/docs/guides/guia-galleryblock.md`.
- Code mirrors: `MediaTextBlock.tsx:26-33` (next/image), `BookingSearchBlock/disclosure/registry.ts` (resolver map), `renderer/baseBlockRegistry.ts:12-16` (flat registry), `schemas/index.ts`, `base-blocks/index.ts`, `apps/site-demo/src/blocks/registry.ts`, `apps/site-demo/src/compositions/AccommodationComposition.tsx`. Scaffolded files to migrate: `base-blocks/GalleryBlock/*` (all six).
