# Block contract

> **How** to build a reusable block in `@hwp/core-ui`. Companion to the binding rules in [`ai-specs/specs/frontend-standards.md`](../../specs/frontend-standards.md).
> Load this file when scaffolding a new block, modifying an existing one, or wiring a block into the BlockRenderer.
>
> **Block names below** (`HeroBlock`, `GalleryBlock`, `BookingBlock`) **are illustrative.** The canonical catalog of blocks comes out of a separate domain-modeling session.
>
> **Scope of this contract:** defines the *what* — mandatory files, exports, registry wiring. For the *how* — 4-layer architecture, extensibility patterns, config schemas, adapters — see [`docs/specs/frontend/block-architecture.md`](../../specs/frontend/block-architecture.md).

## What a block is

A **block** is a function component that:

1. Accepts a typed `content` payload (validated by Zod against the block's schema).
2. Optionally accepts a `variant` (one of a fixed CVA-declared set).
3. Renders a self-contained page section.
4. Knows nothing about who calls it, where it is in the page, or which client it serves.

Blocks are the unit Payload stores: every page is `{ blocks: [{ type, variant, order, content }, ...] }`. Adding a new block in the system means:

- **Platform block (reusable):** add one folder under `packages/core-ui/src/base-blocks/` and one entry in `baseBlockRegistry.ts`.
- **Client block (specific to one client):** add one folder under `apps/site-{slug}/src/blocks/` (or the equivalent in an independent client repo) and one entry in the client's `src/blocks/registry.ts`.

See "Block ownership model (DEC-015)" below for the full breakdown.

## The folder

```
packages/core-ui/src/base-blocks/{Name}/
├── {Name}.tsx                     ← the component
├── {Name}.variants.ts             ← CVA recipe for visual variants
├── {Name}.types.ts                ← TS types derived from the schema (z.infer)
├── {Name}.schema.ts               ← Zod schema for `content` (always co-located here, also published to packages/core-ui/src/schemas/)
├── {Name}.test.tsx                ← Vitest unit + axe a11y tests
└── {Name}.config.schema.ts        ← Zod schema for behavioral config (optional — Layer 3)
```

The first five files are mandatory. The `/scaffold-block` skill generates them from a template. A block that does not have all five cannot be promoted past `alpha` ([lifecycle](../../specs/lifecycle.md)).

`{Name}.config.schema.ts` is optional: add it when the block has behavioral options (autoplay, number of columns, PMS connection). Config is always separate from content — never merge behavioral options into the content schema. See [`docs/specs/frontend/block-architecture.md §3`](../../specs/frontend/block-architecture.md) for the config layer contract.

## The schema (`{Name}.schema.ts`)

The schema defines what the block renders. Payload guarantees this shape; nothing in the block code re-validates beyond the boundary.

Schemas are co-located with the block component inside `base-blocks/{Name}/` **and** re-exported from `packages/core-ui/src/schemas/` so they can be imported without pulling in the component.

```ts
// packages/core-ui/src/base-blocks/{Name}/{Name}.schema.ts
import { z } from 'zod';

export const {Name}Content = z.object({
  title:    z.string().min(1),
  subtitle: z.string().optional(),
  image:    z.object({
    src: z.string().url(),
    alt: z.string(),                // empty alt only if `decorative: true`
    decorative: z.boolean().optional(),
  }),
  cta: z.object({
    label: z.string().min(1),
    href:  z.string(),
  }).optional(),
});

export type {Name}Content = z.infer<typeof {Name}Content>;
```

Rules:

- Schema name matches the type name (both `{Name}Content`).
- The TS type is **always** `z.infer` of the schema — never written by hand.
- Image fields **always** require `alt`. The schema enforces this at the data layer so the agency cannot publish an accessibility violation by accident.
- Multilingual text fields are `z.record(z.string(), z.string())` (locale → text), not `z.string()`.
- Optional fields are declared `optional()`. The component renders them conditionally.
- Cross-field constraints use `.refine()` and have a clear error message.

## The variants (`{Name}.variants.ts`)

Variants are a **fixed, declared set** at design time. They are styling-only — they never change the data shape.

```ts
// packages/core-ui/src/base-blocks/{Name}/{Name}.variants.ts
import { cva, type VariantProps } from 'class-variance-authority';

export const {name}Variants = cva(
  'block-base-classes',
  {
    variants: {
      layout:  { full: 'min-h-screen', split: 'grid grid-cols-2', minimal: 'py-12' },
      tone:    { light: 'bg-surface', dark: 'bg-primary text-on-dark' },
    },
    defaultVariants: {
      layout: 'full',
      tone:   'light',
    },
  }
);

export type {Name}Variants = VariantProps<typeof {name}Variants>;
```

Rules:

- The CVA name uses camelCase (`heroVariants`), the exported `VariantProps` type uses PascalCase (`HeroVariants`).
- Default variants always declared, so the block has sensible behavior when Payload omits the variant.
- Adding a new variant value is a minor version bump. Removing one is a major version bump.

## Structural variants

> Added by [DEC-008](../../architecture/decisions.md#dec-008--structural-variants-for-complex-blocks) (2026-05-21).

CVA variants change how a block looks. **Structural variants** change what the block *is* — different DOM trees, different hooks, different sub-components. A `GalleryBlock` with `variant="masonry"` vs `variant="carousel"` is not a CSS change: masonry needs a layout algorithm, carousel needs swipe handlers, autoplay, and dots.

Structural variants are an **opt-in** extension. Most blocks use the flat 5-file layout above. Reach for structural variants only when:

- The variants require different React hooks (intersection observer for one, drag handlers for another).
- The variants render fundamentally different DOM (an iframe wrapper vs an embedded form).
- The variants share content but not implementation.

If you can implement the variant by adding a CVA value, do not use structural variants.

### Folder layout

A block with structural variants nests one subfolder per structural variant. The shared schema/types/tests stay at the family root. `index.ts` is the variant resolver.

```
packages/core-ui/src/base-blocks/{Name}Block/
├── index.ts                        ← variant resolver (see below)
├── {Name}Block.schema.ts           ← shared Zod schema — all variants parse the same content
├── {Name}Block.types.ts            ← shared types
├── {Name}Block.test.tsx            ← tests covering all variants
├── shared/                         ← sub-components shared across 2+ variants
│   └── {SharedComponent}.tsx
├── {Name}{VariantA}/               ← one subfolder per structural variant
│   ├── {Name}{VariantA}.tsx
│   └── (optional: hooks, sub-components specific to this variant)
└── {Name}{VariantB}/
    └── {Name}{VariantB}.tsx
```

### The resolver (`index.ts`)

The block's `index.ts` maps variant keys to components and exports a single resolver component. The resolver is what gets imported by `baseBlockRegistry.ts` — from the renderer's point of view, nothing changes.

```ts
// packages/core-ui/src/base-blocks/{Name}Block/index.ts
import { {Name}{VariantA} } from './{Name}{VariantA}/{Name}{VariantA}';
import { {Name}{VariantB} } from './{Name}{VariantB}/{Name}{VariantB}';
import type { {Name}BlockProps } from './{Name}Block.types';

export const {name}Variants = {
  variantA: {Name}{VariantA},
  variantB: {Name}{VariantB},
} as const;

export type {Name}VariantKey = keyof typeof {name}Variants;

export function {Name}Block(
  { content, variant = 'variantA', ...rest }: {Name}BlockProps & { variant?: {Name}VariantKey }
) {
  const Component = {name}Variants[variant] ?? {name}Variants.variantA;
  return <Component content={content} {...rest} />;
}
```

### Schema sharing rule

All structural variants of a block family share **one** schema (`{Name}Block.schema.ts`). Variant-specific fields are declared `.optional()` in the shared schema; variants that do not need a field simply ignore it. Payload stores one content shape per block type — switching schemas when the editor changes the variant is complexity we do not pay.

### CVA coexistence

A structural variant MAY use CVA inside its own `.tsx`. The two systems are orthogonal:

- **Structural variant** = which component renders (resolver in `index.ts`).
- **CVA variant** = how that component styles itself (`cva()` inside the variant's `.tsx`).

A `GalleryCarousel` may accept its own CVA `tone` variant; that is a styling concern internal to the carousel, not a structural choice.

### Variant resolution — fallback chain

When the BlockRenderer renders a block, the effective variant is resolved in this order:

1. **Explicit `variant`** in Payload `layout[]` (per-page).
2. **`blockDefaults[blockType].defaultVariant`** in `client.config.ts` (per-client) — see [DEC-009](../../architecture/decisions.md#dec-009--remove-activeblocks-add-blockdefaults-to-clientconfigts).
3. **Default variant** declared first in the resolver map (per-platform).

The resolver does not need to know about steps 1 and 2 — it just receives a `variant` prop. The chain is materialized by `BlockRenderer` + composition code that reads `useTenant().blockDefaults`.

### When NOT to use structural variants

- Variants only differ in CSS classes → use CVA.
- There is only one variant → flat 5-file layout, no resolver.
- The "variant" is really a different block (different content fields) → new block, not a variant.

## The `shared/` folder

> Added by [DEC-008](../../architecture/decisions.md#dec-008--structural-variants-for-complex-blocks) (2026-05-21).

Inside a block family, `shared/` holds sub-components used by **two or more** structural variants of the same family. Examples: a `GalleryLightbox` used by both `GalleryMasonry` and `GalleryCarousel`, a `HeroCTA` button used by every Hero variant.

Rules:

- Components in `shared/` are **internal to the block family**. They are NOT exported from `packages/core-ui/src/index.ts`.
- If a shared component would be useful to a **different** block family, promote it to `primitives/`. `shared/` is the antechamber, not the destination.
- If only one structural variant uses a component, keep it inside that variant's folder — do not put it in `shared/` "in case someone else needs it later".

## The component (`{Name}.tsx`)

```tsx
// packages/core-ui/src/base-blocks/{Name}/{Name}.tsx
import type { {Name}Content } from './{Name}.types';
import type { {Name}Variants } from './{Name}.variants';
import { {name}Variants } from './{Name}.variants';

export type {Name}Props = {
  content: {Name}Content;
} & {Name}Variants;

export function {Name}({ content, layout, tone }: {Name}Props) {
  return (
    <section className={{name}Variants({ layout, tone })}>
      <h2>{content.title}</h2>
      {content.subtitle && <p>{content.subtitle}</p>}
      <img
        src={content.image.src}
        alt={content.image.alt}
        aria-hidden={content.image.decorative}
      />
      {content.cta && (
        <a href={content.cta.href}>{content.cta.label}</a>
      )}
    </section>
  );
}
```

Rules:

- Function component, named export, same as the file.
- Props are `{ content: ContentType } & Variants`.
- Optional schema fields render conditionally (`content.subtitle &&`).
- No business logic. No data fetching. No state beyond UI ephemerals (open/closed, hover).
- Semantic HTML always. `<section>`, `<article>`, `<nav>`, `<button>` — not `<div>` with handlers.
- Server Component by default. Add `'use client'` only when you genuinely need browser APIs (intersection observer, drag-and-drop, controlled forms).

## The types (`{Name}.types.ts`)

```ts
// packages/core-ui/src/base-blocks/{Name}/{Name}.types.ts
export type { {Name}Content } from '../../schemas/{Name}.schema';
export type { {Name}Variants } from './{Name}.variants';
export type { {Name}Props }    from './{Name}';
```

This file is a barrel for types only. `{Name}Content` is re-exported from the canonical schema location under `../../schemas/` so consumers can import types without dragging in the runtime component. `{Name}Variants` and `{Name}Props` remain co-located.

## The test (`{Name}.test.tsx`)

Minimum coverage for a block to be promoted past `alpha`:

```tsx
// packages/core-ui/src/base-blocks/{Name}/{Name}.test.tsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { axe, toHaveNoViolations } from 'jest-axe';
import { {Name} } from './{Name}';
import { {Name}Content } from '../../schemas/{Name}.schema';

expect.extend(toHaveNoViolations);

const minimal: {Name}Content = {
  title: 'Test title',
  image: { src: 'https://example.com/a.jpg', alt: 'A test image' },
};

describe('{Name}', () => {
  it('parses minimal content', () => {
    expect(() => {Name}Content.parse(minimal)).not.toThrow();
  });

  it('renders the title and image', () => {
    render(<{Name} content={minimal} />);
    expect(screen.getByRole('heading', { name: 'Test title' })).toBeInTheDocument();
    expect(screen.getByAltText('A test image')).toBeInTheDocument();
  });

  it('renders all declared variants without error', () => {
    // exercise each variant value once
    render(<{Name} content={minimal} layout="full"    tone="light" />);
    render(<{Name} content={minimal} layout="split"   tone="dark" />);
    render(<{Name} content={minimal} layout="minimal" tone="light" />);
  });

  it('passes axe accessibility audit', async () => {
    const { container } = render(<{Name} content={minimal} />);
    expect(await axe(container)).toHaveNoViolations();
  });
});
```

Add one interaction test per documented variant where users can do something (click a CTA, open a dialog, etc.).

## Registry — wiring the block into BlockRenderer

The BlockRenderer maps Payload's `type` string to a component. Adding a platform block means one extra row in `baseBlockRegistry.ts`. Client blocks are wired through the client's own `registry.ts` and passed to BlockRenderer via the `blocks` prop.

```ts
// packages/core-ui/src/renderer/baseBlockRegistry.ts
import { {Name} } from '@hwp/core-ui/base-blocks/{Name}/{Name}';
import { {Name}Content } from '@hwp/core-ui/schemas/{Name}.schema';
// ...other blocks

export const baseBlockRegistry = {
  {Name}: {
    component: {Name},
    contentSchema: {Name}Content,
    variants: ['variantA', 'variantB'] as const,  // optional — declares the legal variant keys
  },
  // GalleryBlock: { ... },
  // BookingBlock: { ... },
} as const;

export type BlockType = keyof typeof baseBlockRegistry;
```

The `variants` field is optional. When present it serves two purposes:

1. **Payload CMS** can render a select field with the valid options when the editor adds a block of this type — no second source of truth.
2. **BlockRenderer** can warn at dev time if a Payload entry references a variant key that is not declared.

For CVA-only blocks, `variants` lists the CVA variant values. For blocks with structural variants ([DEC-008](../../architecture/decisions.md#dec-008--structural-variants-for-complex-blocks)), it lists the structural variant keys.

```tsx
// packages/core-ui/src/renderer/BlockRenderer.tsx
import { ComponentType } from 'react';
import { baseBlockRegistry, type BlockType } from './baseBlockRegistry';

export type BlockInstance = {
  type: BlockType;
  variant?: string;
  order: number;
  content: unknown;
};

export function BlockRenderer({
  layout,
  blocks,
}: {
  layout: BlockInstance[];
  blocks?: Record<string, ComponentType<{ content: unknown; variant?: string }>>;
}) {
  // Client-provided `blocks` override or extend the base registry
  const registry = { ...baseBlockRegistry, ...blocks };

  return (
    <>
      {layout
        .sort((a, b) => a.order - b.order)
        .map((block, i) => {
          const entry = registry[block.type];
          if (!entry) return null;
          const content = entry.contentSchema.parse(block.content);
          const Component = entry.component as ComponentType<{ content: unknown; variant?: string }>;
          return <Component key={i} content={content} variant={block.variant} />;
        })}
    </>
  );
}
```

The `layout` prop is the array of block instances from Payload (renamed from `blocks` in DEC-015). The optional `blocks` prop accepts a `Record<string, ComponentType>` of client-level overrides — client registries merge on top of the base registry, allowing client blocks to shadow or extend platform blocks without touching core-ui code.

The renderer is where validation happens — at the boundary between Payload data and the typed component world. Inside the block, `content` is trusted.

## What Payload stores per block instance

```ts
{
  type: '{Name}',          // matches a key in baseBlockRegistry or the client registry
  variant: 'split',        // matches a CVA variant value, optional
  order: 2,                // integer used to sort blocks within a page
  content: { /* matches {Name}Content schema */ }
}
```

**Payload never stores layout, colors, spacing, or markup.** Those come from the block's CVA recipe and the active theme.

## Public API exposure

Blocks are **not** exported from the `@hwp/core-ui` root. Use the `@hwp/core-ui/base-blocks` subpath export instead:

```ts
// Correct — use the subpath
import { {Name} } from '@hwp/core-ui/base-blocks';
import type { {Name}Content } from '@hwp/core-ui/schemas';
```

Schemas are separately available via the `@hwp/core-ui/schemas` subpath, which is useful for Payload schema definitions that need the Zod schema without the component runtime.

```ts
// packages/core-ui package.json (subpath exports)
{
  "exports": {
    ".":              "./src/index.ts",
    "./base-blocks":  "./src/base-blocks/index.ts",
    "./schemas":      "./src/schemas/index.ts"
  }
}
```

The root `src/index.ts` exports only the renderer, providers, primitives, and layout components — not blocks. This keeps the root surface auditable and lets us reorganize block internals without breaking consumers.

## Block ownership model (DEC-015)

> Added by DEC-015. Establishes where blocks live, who owns them, and how they are consumed.

### Ownership levels

| Level | Lives in | Owner | Registry |
|---|---|---|---|
| **Platform block** | `packages/core-ui/src/base-blocks/{Name}/` | HWP platform team | `baseBlockRegistry.ts` in core-ui |
| **Client block** | `apps/site-{slug}/src/blocks/{Name}/` (or client repo `src/blocks/{Name}/`) | Client project | `src/blocks/registry.ts` in the client repo |

Platform blocks are the **reference implementations**: reusable, theme-neutral, fully tested. Client blocks are project-specific implementations that live in the client's own repo and are never added to core-ui.

### Three usage levels for client blocks

When a client needs a block, choose the appropriate level:

**Level 1 — Re-export (default).** The client uses the platform block unchanged. The client's `registry.ts` simply re-exports from `@hwp/core-ui/base-blocks`:

```ts
// apps/site-{slug}/src/blocks/registry.ts
export { HeroBlock } from '@hwp/core-ui/base-blocks';
export { GalleryBlock } from '@hwp/core-ui/base-blocks';
// ...
```

**Level 2 — Slot extension.** The client wraps a platform block and injects content into its named slots (see "Slot pattern" below), without forking the block implementation.

**Level 3 — Full custom block.** The client implements the block from scratch in `src/blocks/{Name}/`, following the same 5-file layout as platform blocks. The block schema can optionally import and extend a platform schema from `@hwp/core-ui/schemas`.

### Client registry wiring

The client site wires its blocks into `BlockRenderer` via the `blocks` prop:

```ts
// apps/site-{slug}/src/blocks/registry.ts
import { ComponentType } from 'react';
export { HeroBlock } from '@hwp/core-ui/base-blocks';    // Level 1
import { CustomHeroBlock } from './CustomHeroBlock/CustomHeroBlock'; // Level 3

export const clientBlocks: Record<string, ComponentType<any>> = {
  CustomHero: CustomHeroBlock,
};
```

```tsx
// apps/site-{slug}/src/compositions/HomeComposition.tsx
import { BlockRenderer } from '@hwp/core-ui';
import { clientBlocks } from '@/blocks/registry';

export function HomeComposition({ layout }: { layout: BlockInstance[] }) {
  return <BlockRenderer layout={layout} blocks={clientBlocks} />;
}
```

Client blocks in `clientBlocks` override any platform block with the same type key, and introduce new type keys unknown to the base registry.

## Slot pattern

Base blocks define a `{Name}Block.slots.ts` file when they expose **named injection points** for client customization. Slots are typed React component props — the client passes a component for each slot it wants to fill; unset slots render the block's own default.

```ts
// packages/core-ui/src/base-blocks/HeroBlock/HeroBlock.slots.ts
import { ComponentType } from 'react';

export type HeroBlockSlots = {
  /** Override the default CTA button with a client-specific component */
  CtaSlot?: ComponentType<{ href: string; label: string }>;
  /** Inject extra content below the hero headline */
  BelowHeadlineSlot?: ComponentType;
};
```

```tsx
// packages/core-ui/src/base-blocks/HeroBlock/HeroBlock.tsx
import type { HeroBlockSlots } from './HeroBlock.slots';
import type { HeroContent } from './HeroBlock.types';

export function HeroBlock({ content, CtaSlot, BelowHeadlineSlot }: HeroContent & HeroBlockSlots) {
  return (
    <section>
      <h1>{content.title}</h1>
      {BelowHeadlineSlot && <BelowHeadlineSlot />}
      {content.cta && CtaSlot
        ? <CtaSlot href={content.cta.href} label={content.cta.label} />
        : content.cta && <a href={content.cta.href}>{content.cta.label}</a>
      }
    </section>
  );
}
```

A Level-2 client block re-exports the platform block with its slots filled:

```tsx
// apps/site-{slug}/src/blocks/HeroBlock/HeroBlock.tsx  (Level 2)
import { HeroBlock as BaseHeroBlock } from '@hwp/core-ui/base-blocks';
import { BookingCta } from '@/primitives/BookingCta';

export function HeroBlock(props: Parameters<typeof BaseHeroBlock>[0]) {
  return <BaseHeroBlock {...props} CtaSlot={BookingCta} />;
}
```

Rules:

- Slot prop names end in `Slot` by convention.
- Slot types are always `ComponentType<...>` — never ReactNode. This preserves lazy loading compatibility.
- Platform blocks MUST render a default implementation for every slot — slots are an enhancement, not a requirement.
- Slots are declared in a dedicated `.slots.ts` file — not inline in the component props — so they can be inspected without importing the component.

## When to make a new block vs add a variant

- **Same data shape, different look** → variant.
- **Different data shape (different content fields)** → new block.
- **Same look, different data source** → still one block; the data source belongs to the composition or repository, not the block.

## When to NOT create a block

- The element is used by exactly one client and is unlikely to be reused → put it in `apps/site-{slug}/src/compositions/` as a client-only component, not in core-ui.
- The element is a primitive (button, input, dialog) → it goes in `primitives/`, not `blocks/`.
- The element is a full page layout → it is a template, not a block.
