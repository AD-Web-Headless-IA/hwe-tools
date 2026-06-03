# HWP architecture audit — block system & variant pattern

> Audit of `docs/contracts/frontend/`, `architecture.md`, `domain-model.md`, `scaffold-block/`, and `.claude/` against the polymorphic variant pattern discussed in this session.
> Date: 2026-05-20. Status: proposal — needs discussion before becoming DECs.

---

## 1. What exists and works well

The documentation layer is remarkably solid for a project with zero code. The contracts are clear, self-consistent, and well-aligned with the domain model. Specific strengths:

**block-contract.md** defines a clean 5-file-per-block convention (`.tsx`, `.variants.ts`, `.types.ts`, `.schema.ts`, `.test.tsx`) with explicit rules for schema ownership, variant declaration via CVA, and registry wiring. The separation of `content` (data from Payload) and `variant` (styling from CVA) is the right abstraction.

**template-contract.md** introduces the 3-layer schema (Base + Optional + Sections) which is an elegant solution for the accommodation polymorphism problem. The `extend{Name}` helper for per-client schema extension is well thought out.

**client-composition.md** correctly draws the line: compositions are the only place where "this client is special" surfaces in code. The rule "if you're copying a composition from site-A to site-B, the shared part is a block or template" is a strong guard against core pollution.

**structure.md** nails the monorepo layout: `core-ui/src/{primitives,blocks,templates,renderer,layout,theme}`, `apps/site-{slug}/src/{app,compositions,theme,content}`. The public API rule (only `src/index.ts` re-exports, no deep imports) is load-bearing.

**scaffold-block skill** correctly automates the block-contract and intentionally leaves registry wiring as a manual step (conscious promotion gate). The templates are minimal and correct.

**theme-tokens.md** covers both single-theme and seasonized clients, with a Zod contract that fails the build on missing tokens. The Flavor A / Flavor B extraction procedure is practical.

**domain-model.md** provides the classification rules (§7) that prevent the anti-patterns the rest of the system is designed to avoid (`BalnearioSection`, `CasitaRusticaPage`, per-client blocks in core).

---

## 2. Gaps and inconsistencies

### GAP-1: The "variant" in block-contract is CVA styling only — no concept of structural variants

**What exists:** `block-contract.md` defines variants via CVA as styling-only changes ("they never change the data shape"). A `HeroBlock` with `variant="full"` vs `variant="split"` uses the same props, same schema, just different CSS classes.

**What's missing:** The system has no concept of a block whose **structure and behavior change** based on configuration. A `GalleryBlock` with `variant="masonry"` vs `variant="carousel"` is not just a CSS change — masonry needs a layout algorithm, carousel needs swipe handlers, autoplay, and dots. Similarly, a `BookingBlock` with `variant="inline"` vs `variant="iframe"` renders fundamentally different DOM trees and may need different sub-components.

**Impact:** With CVA-only variants, complex blocks would accumulate all possible logic into one `.tsx` file with increasingly large conditional branches. A `GalleryBlock.tsx` handling masonry layout calculation, carousel swipe logic, grid positioning, lightbox overlay, and before/after slider in one component would become unmaintainable.

**Proposal:** Introduce a **structural variant** concept alongside CVA variants. A structural variant is a separate component file that shares the family's schema but has its own implementation. The block's `index.ts` (new file, not currently in the contract) acts as a resolver:

```
blocks/GalleryBlock/
├── index.ts                    ← NEW: variant resolver + registry
├── GalleryBlock.schema.ts      ← shared schema (all variants parse the same content)
├── GalleryBlock.types.ts       ← shared types
├── GalleryBlock.test.tsx        ← tests per variant
├── shared/                     ← NEW: sub-components shared across variants
│   ├── GalleryLightbox.tsx
│   └── ImageLoader.tsx
├── GalleryMasonry/             ← NEW: structural variant (own .tsx + own hooks)
│   ├── GalleryMasonry.tsx
│   └── useMasonryLayout.ts
├── GalleryCarousel/            ← NEW: structural variant
│   ├── GalleryCarousel.tsx
│   ├── useSwipe.ts
│   └── CarouselDots.tsx
└── GalleryGrid/                ← NEW: simple structural variant (one file)
    └── GalleryGrid.tsx
```

The `index.ts` exports a resolver and a default:

```ts
// blocks/GalleryBlock/index.ts
import { GalleryMasonry } from './GalleryMasonry/GalleryMasonry';
import { GalleryCarousel } from './GalleryCarousel/GalleryCarousel';
import { GalleryGrid } from './GalleryGrid/GalleryGrid';
import type { GalleryBlockProps } from './GalleryBlock.types';

export const galleryVariants = {
  masonry:  GalleryMasonry,
  carousel: GalleryCarousel,
  grid:     GalleryGrid,
} as const;

export type GalleryVariantKey = keyof typeof galleryVariants;

export function GalleryBlock({ content, variant = 'grid' }: GalleryBlockProps & { variant?: GalleryVariantKey }) {
  const Component = galleryVariants[variant] ?? galleryVariants.grid;
  return <Component content={content} />;
}
```

**Compatibility with existing contract:** CVA variants (styling-only) remain for blocks that only need visual changes. Structural variants are an opt-in extension for blocks that need different implementations. A block can have both (structural variant for the component choice, CVA variants for fine-tuning within that structural variant). The scaffold-block skill generates the flat layout by default; a future `scaffold-variant` skill adds a structural variant to an existing block.

**DEC candidate:** DEC-008 — Structural variants for complex blocks.

---

### GAP-2: `blockRegistry.ts` is a flat map — no variant resolution

**What exists:** `blockRegistry.ts` maps `BlockType → { component, contentSchema }`. The `BlockRenderer` does `blockRegistry[block.type]` and passes `variant` as a prop to the component.

**What's missing:** The registry doesn't know about variants. It trusts the component to handle `variant` internally. This works with CVA variants (the component uses `cva()` to pick classes), but with structural variants the component needs to resolve which sub-component to render. The resolution logic lives inside each block's `index.ts`, which is fine — but the registry has no way to validate that a given `variant` value is legal for a given `BlockType`.

**Proposal — minimal, no registry change:** Keep the registry flat. Each block's exported component (the one in the registry) handles its own variant resolution internally, as shown in GAP-1. The registry doesn't need to know about variants because:

1. CVA variants are handled by `cva()` — an invalid variant value just falls back to `defaultVariants`.
2. Structural variants are handled by the block's resolver — an invalid variant key falls back to the default variant.

The only change to the registry is adding the variant keys for **build-time validation** (optional, for Payload schema generation):

```ts
// blockRegistry.ts
export const blockRegistry = {
  GalleryBlock: {
    component: GalleryBlock,
    contentSchema: GalleryBlockContent,
    variants: ['masonry', 'carousel', 'grid'] as const,  // NEW: declarative
  },
  // ...
} as const;
```

This lets Payload generate a select field with the valid variant options, and lets the BlockRenderer warn at dev time if a Payload entry references a variant that doesn't exist.

---

### GAP-3: `activeBlocks` in `client.config.ts` is redundant and underspecified

**What exists:** `architecture.md` shows `activeBlocks: ['HeroBlock', 'GalleryBlock', ...]` as a flat string array in `client.config.ts`.

**What's missing:** This list is never consumed by any documented contract. The `BlockRenderer` doesn't filter by it. The `scaffold-block` skill doesn't reference it. Compositions import blocks directly by name. Payload stores `layout[]` with the blocks that actually appear on each page.

**What contradicts:** The `domain-model.md` feature system already gates which pages and blocks are available per client. A block that appears on a `hasSpa` page is gated by the feature flag, not by `activeBlocks`.

**Proposal:** Remove `activeBlocks` from `client.config.ts`. Replace with `blockDefaults` for blocks that need per-client configuration:

```ts
// client.config.ts
blockDefaults: {
  BookingBlock: {
    defaultVariant: 'inline',
    // adapter is already declared via bookingAdapter — no duplication
  },
  GalleryBlock: {
    defaultVariant: 'masonry',
  },
},
```

The `blockDefaults` are optional. Blocks without an entry use their own `defaultVariants` from CVA or their structural variant resolver's default.

**DEC candidate:** DEC-009 — Remove `activeBlocks`, add optional `blockDefaults`.

---

### GAP-4: `BookingBlock` adapter wiring is split across two packages without a clear bridge

**What exists:**
- `@hwp/booking` owns `BookingAdapter` interface + stock adapters (THR, Masterbooking, Witbooking, Resalys).
- `architecture.md` shows `BookingBlock` in `@hwp/booking/react/`.
- `block-contract.md` and `structure.md` show blocks living in `@hwp/core-ui/src/blocks/`.

**What contradicts:** Is `BookingBlock` in `@hwp/booking/react/` or in `@hwp/core-ui/src/blocks/`? Both are stated in different documents.

**Proposal:** `BookingBlock` lives in `@hwp/core-ui/src/blocks/BookingBlock/` like every other block. It receives the active adapter via React context (a `BookingProvider` at the app root), never importing a concrete adapter. `@hwp/booking` exports the interface + adapters + the `BookingProvider`. The app's root layout wires them:

```tsx
// apps/site-{slug}/src/app/layout.tsx
import { BookingProvider } from '@hwp/booking';
import { config } from '@/client.config';

export default function RootLayout({ children }) {
  return (
    <BookingProvider adapter={config.bookingAdapter}>
      {children}
    </BookingProvider>
  );
}
```

The `BookingBlock` in core-ui uses `useBookingAdapter()` from `@hwp/booking` — it depends on the package for the interface but never for a concrete adapter. This is clean DDD: the UI layer depends on the domain interface, not the infrastructure.

**Remove `@hwp/booking/react/`** — that creates a UI component inside a domain package. UI belongs in `core-ui`.

**DEC candidate:** DEC-010 — BookingBlock in core-ui, BookingProvider in @hwp/booking.

---

### GAP-5: No `providers/` layer in core-ui

**What exists:** `structure.md` shows `core-ui/src/{primitives,blocks,templates,renderer,layout,theme}`. No providers directory.

**What's missing:** Several cross-cutting concerns need React context:

- **TenantContext** — the active `client.config` (tenantId, features, locale, type).
- **BookingContext** — the active PMS adapter (from `@hwp/booking`).
- **SeasonContext** — the active season (already mentioned in `theme-tokens.md` as `useActiveSeason()`).
- **ThemeContext** — possibly, if tokens need runtime access beyond CSS variables.

**Proposal:** Add `core-ui/src/providers/` with:

```
providers/
├── TenantProvider.tsx       ← reads client.config, exposes via useTenant()
├── SeasonProvider.tsx       ← resolves active season, exposes via useActiveSeason()
└── index.ts
```

`BookingProvider` stays in `@hwp/booking` (it's the domain package's responsibility to provide its own context). `ThemeProvider` is unnecessary if tokens are pure CSS variables (which they are per `theme-tokens.md`).

The app's root layout composes them:

```tsx
<TenantProvider config={clientConfig}>
  <BookingProvider adapter={clientConfig.bookingAdapter}>
    <SeasonProvider>
      {children}
    </SeasonProvider>
  </BookingProvider>
</TenantProvider>
```

---

### GAP-6: scaffold-block needs a sibling `scaffold-variant` skill

**What exists:** `scaffold-block` creates the flat 5-file layout for a new block family.

**What's missing:** No automation for adding a structural variant to an existing block. When the GalleryBlock needs a new `GalleryBeforeAfter` variant, the developer has to create the subfolder, the component file, wire it into the block's `index.ts` resolver, and add tests — all manually.

**Proposal:** A new `scaffold-variant` skill:

```
/scaffold-variant GalleryBlock BeforeAfter
```

Creates `blocks/GalleryBlock/GalleryBeforeAfter/GalleryBeforeAfter.tsx` from a variant template, adds the import to `blocks/GalleryBlock/index.ts`, and prints the test skeleton. Does NOT modify the registry (the block is already registered; only its internal resolver changes).

Lower priority than the other gaps. Can wait until 3+ blocks have structural variants.

---

### GAP-7: `shared/` convention inside a block family is undocumented

**What exists:** The block contract defines 5 files per block. No mention of shared sub-components.

**What's missing:** When a block family has structural variants, they typically share sub-components (a `GalleryLightbox` used by both `GalleryMasonry` and `GalleryCarousel`, a `HeroCTA` button used by all Hero variants). These need a home.

**Proposal:** Add to `block-contract.md` a section on `shared/`:

- `blocks/{Name}/shared/` contains components used by 2+ variants of the same block family.
- Components in `shared/` are NOT exported from `core-ui/src/index.ts` — they are internal to the block family.
- If a shared component is needed by a different block family, it should be promoted to `primitives/`.

---

## 3. What does NOT need to change

These aspects of the current architecture are correct and should be preserved:

- The 3-layer classification (primitive / block / template) with compositions as the per-client assembly layer.
- The public API rule (only `src/index.ts` re-exports).
- The Zod-at-every-boundary philosophy (schemas validate at the Payload→React edge in BlockRenderer).
- The CVA variant system for styling-only variants. Structural variants extend it; they don't replace it.
- The `TokensContract` pattern (build-time validation of tokens.json).
- The `domain-model.md` §7 classification rules (no client names in core, adapter pattern for external dependencies).
- The SPECBOOT methodology and the agent separation (planner reads, implementer writes, reviewer audits, verifier gates).
- The Figma Make → block mapping flow (Figma is reference, not code generator).

---

## 4. Prioritized action plan

| Priority | Action | Effort | Output |
|---|---|---|---|
| P0 | Formalize structural variants in block-contract.md | 1 session | Updated block-contract.md + DEC-008 |
| P0 | Resolve BookingBlock location (core-ui, not @hwp/booking/react/) | 30 min | Updated architecture.md + structure.md + DEC-010 |
| P1 | Add `providers/` to core-ui structure | 30 min | Updated structure.md |
| P1 | Remove `activeBlocks`, add `blockDefaults` to client.config shape | 30 min | Updated architecture.md + DEC-009 |
| P1 | Add `variants` key to blockRegistry for Payload schema generation | 30 min | Updated block-contract.md |
| P2 | Document `shared/` convention for block families | 15 min | Appendix to block-contract.md |
| P2 | Create `scaffold-variant` skill | 1 session | New skill in .claude/skills/ |
| P3 | Add variant resolver pattern to scaffold-block templates | 30 min | Updated templates/ |

---

## 5. Relationship to existing DECs

| Existing DEC | Impact of this audit |
|---|---|
| DEC-001 (SPECBOOT) | No change. |
| DEC-002 (Figma per client) | No change. |
| DEC-003 (Frontend layout) | Extended by structural variants addition. Amendment, not contradiction. |
| DEC-005 (Seasonality) | No change. `SeasonProvider` implements what's already described. |
| DEC-006 (Testing) | No change. Structural variant tests follow the same pattern. |
| DEC-007 (Vercel hosting) | No change. `BookingProvider` wiring aligns with server-side credentials. |

No existing DEC is contradicted. The proposals are extensions of the current architecture, not replacements.