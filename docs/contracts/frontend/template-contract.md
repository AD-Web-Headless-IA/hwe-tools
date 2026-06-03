# Template contract

> **How** to build a reusable page template in `@hwe/core-ui`. Companion to the binding rules in [`ai-specs/specs/frontend-standards.md`](../../specs/frontend-standards.md) and complement to [`block-contract.md`](./block-contract.md).
> Load this file when scaffolding a new page template, extending one for a client, or deciding "is this a block or a template?".
>
> **DEC-015:** Platform blocks live in `@hwe/core-ui/base-blocks`; client-owned overrides live in the client repo. Block schemas are importable separately via `@hwe/core-ui/schemas`. Subpath exports: `@hwe/core-ui`, `@hwe/core-ui/base-blocks`, `@hwe/core-ui/schemas`, `@hwe/core-ui/theme`.
>
> **Template name and field examples** (`AccommodationDetailTemplate`, `price`, `bedrooms`) **are illustrative.** The canonical catalog of templates and their domain fields comes from a separate domain-modeling session — names and fields below are placeholders.

## What a template is

A **template** is a function component that:

1. Renders a full page (`<article>` or `<main>` scope).
2. Accepts a typed `data` payload that represents one entity (one accommodation, one event, one article).
3. Is reused by **many pages** of the same kind — Next.js generates one route per entity via `generateStaticParams`.
4. Defines its **content contract** as a 3-layer schema (Base + Optional + Sections) so heterogeneous entities can share one template.

A template differs from a block in scope: a block renders a section, a template renders a page.

## The folder

Same layout as a block:

```
packages/core-ui/src/templates/{Name}/
├── {Name}.tsx
├── {Name}.variants.ts        ← page-level layout variants if any
├── {Name}.types.ts
├── {Name}.schema.ts          ← 3-layer Zod schema
└── {Name}.test.tsx
```

## The 3-layer schema

The schema is the heart of the template's flexibility. Three layers, each with a clear role:

```ts
// packages/core-ui/src/templates/{Name}/{Name}.schema.ts
import { z } from 'zod';
import { BlockContent } from '@/renderer/baseBlockRegistry';
// Schemas are imported from the canonical schemas barrel — not directly from base-blocks
// (illustrative imports — real block names come from the domain session)
import { GalleryBlockContent }   from '@hwe/core-ui/schemas';
import { AmenitiesBlockContent } from '@hwe/core-ui/schemas';

// ─── Layer 1: BASE ──────────────────────────────────────────
// Required for every instance of this template. If a field is here,
// the template assumes it exists and renders it unconditionally.
const Base = z.object({
  slug:        z.string(),
  title:       z.string().min(1),
  description: z.string().min(1),
  heroImage:   z.object({ src: z.string().url(), alt: z.string() }),
  // ...whatever the domain says every instance must have
});

// ─── Layer 2: OPTIONAL ──────────────────────────────────────
// Well-known optional fields. The template knows how to render
// them and renders them only when present in the data.
const Optional = z.object({
  gallery:   GalleryBlockContent.optional(),
  amenities: AmenitiesBlockContent.optional(),
  // ...other optionals defined at design time
});

// ─── Layer 3: SECTIONS ──────────────────────────────────────
// A flexible body of any block from the registry, ordered as configured.
// Lets one instance carry blocks another instance does not.
const Sections = z.object({
  sections: z.array(BlockContent).default([]),
});

// ─── Final exported schema ──────────────────────────────────
export const {Name}Content = Base.merge(Optional).merge(Sections);
export type {Name}Content = z.infer<typeof {Name}Content>;

// ─── Extension helper for per-client custom fields ──────────
export function extend{Name}<T extends z.ZodRawShape>(extra: T) {
  return {Name}Content.extend(extra);
}
```

Rules:

- **Base is the minimum contract.** A field belongs in Base only if the template would not make sense without it. Be strict — Base fields are commitments to every client.
- **Optional is what the template knows.** If the template has rendering logic for a field, the field belongs in Optional. If the template would not know what to do with it, do NOT put it in Optional.
- **Sections is the escape hatch.** Anything block-shaped that varies per instance goes here. The template delegates rendering to `<BlockRenderer>`.
- The `extend{Name}` helper is mandatory if the template might be extended by client apps. It is a one-line export — no excuse to omit it.

## The component (`{Name}.tsx`)

The template reads Base, conditionally renders Optional, delegates Sections.

```tsx
// packages/core-ui/src/templates/{Name}/{Name}.tsx
import { BlockRenderer } from '@/renderer/BlockRenderer';
// Blocks imported from the base-blocks subpath, not the package root
import { GalleryBlock }   from '@hwe/core-ui/base-blocks';
import { AmenitiesBlock } from '@hwe/core-ui/base-blocks';
import type { {Name}Content } from './{Name}.types';

export function {Name}Template({ data }: { data: {Name}Content }) {
  return (
    <article>
      <header>
        <img src={data.heroImage.src} alt={data.heroImage.alt} />
        <h1>{data.title}</h1>
        <p>{data.description}</p>
      </header>

      {/* Optional well-known sections — render only when present */}
      {data.gallery   && <GalleryBlock   content={data.gallery}   variant={data.galleryVariant} />}
      {data.amenities && <AmenitiesBlock content={data.amenities} />}

      {/* Flexible body — layout prop takes the block instance array */}
      <BlockRenderer layout={data.sections} />
    </article>
  );
}
```

Rules:

- One semantic root (`<article>` or `<main>`), one `<h1>`.
- Optionals checked with `&&` — no try/catch, no fallback values. If it is not there, do not render it.
- `sections` always goes through `BlockRenderer` — never iterate it inline.
- No data fetching. The page that uses this template fetches and passes `data` in.
- When passing a `variant` prop to an optional block, the value may come from three sources (see [DEC-009](../../architecture/decisions.md#dec-009--remove-activeblocks-add-blockdefaults-to-clientconfigts) and [DEC-008](../../architecture/decisions.md#dec-008--structural-variants-for-complex-blocks)):
  1. **Payload data** — e.g. `data.galleryVariant`, set per-instance by the content editor.
  2. **`blockDefaults`** — `useTenant().blockDefaults?.GalleryBlock?.defaultVariant`, set per-client in `client.config.ts`.
  3. **Block default** — omit the prop entirely and the block's resolver or CVA picks its own default.

  Templates SHOULD honor sources 1 and 2 explicitly (read Payload, fall back to `blockDefaults`). Templates SHOULD NOT hardcode a variant — that decision belongs in compositions when the per-page choice is fixed for a client.

## Per-client extension

When a client needs fields the base template does not know about:

### Step 1 — extend the schema in the client's Payload schemas

```ts
// apps/site-{slug}/payload/schemas/accommodation.ts
import { extendAccommodation } from '@hwe/core-ui'; // re-exported from the template
import { z } from 'zod';

export const {Slug}AccommodationContent = extendAccommodation({
  // domain fields specific to this client
  plotSize:       z.number().positive(),
  shadedPlot:     z.boolean(),
  electricHookup: z.boolean(),
});

export type {Slug}AccommodationContent = z.infer<typeof {Slug}AccommodationContent>;
```

Payload generates fields from this extended schema. The CMS UI exposes the extra fields to the client's content editors.

### Step 2 — render the extras

Two strategies, in order of preference:

**Strategy A: extras as a `SpecsBlock` in `sections`.** The client's content team adds a generic specs block to the accommodation's `sections` array with `{ label, value }` pairs derived from the extras. The template renders it via `BlockRenderer` without knowing about the extras. **Zero core code changes.**

**Strategy B: per-client composition wrapping the template.** If the extras need custom layout (not just label/value pairs):

```tsx
// apps/site-{slug}/src/compositions/{Slug}AccommodationComposition.tsx
import { AccommodationDetailTemplate } from '@hwe/core-ui';
import type { {Slug}AccommodationContent } from '@/payload-types';

export function {Slug}AccommodationComposition({ data }: { data: {Slug}AccommodationContent }) {
  return (
    <>
      <AccommodationDetailTemplate data={data} />
      <aside>
        <h3>Specs</h3>
        <ul>
          <li>Plot size: {data.plotSize} m²</li>
          <li>Shaded: {data.shadedPlot ? 'yes' : 'no'}</li>
          <li>Electric hookup: {data.electricHookup ? 'yes' : 'no'}</li>
        </ul>
      </aside>
    </>
  );
}
```

The route then uses the composition instead of the template directly. The template stays untouched.

**Forbidden:** editing the template's `.tsx` to add per-client branches. That is a `if (client === '...')` in disguise.

## Routing pattern (Next.js App Router)

A template is consumed by a dynamic route:

```tsx
// apps/site-{slug}/src/app/[locale]/{collection}/[slug]/page.tsx
import { AccommodationDetailTemplate } from '@hwe/core-ui';
import { contentRepository } from '@/lib/repositories';

export async function generateStaticParams() {
  const items = await contentRepository.list('{collection}', '{tenant}');
  return items.map(item => ({ slug: item.slug, locale: 'es' }));
}

export default async function Page({ params }: { params: { slug: string; locale: string } }) {
  const data = await contentRepository.get('{collection}', '{tenant}', params.slug);
  return <AccommodationDetailTemplate data={data} />;
}
```

One template → N routes, one per item in the collection. Adding an item in Payload triggers a recompile and the new route appears automatically.

### Client compositions and the local block registry

When a client composition wraps a template and passes a `BlockRenderer` to render dynamic sections, it must wire the client's own block registry into the renderer. Client blocks live in `src/blocks/registry.ts` — they are **not** imported directly from `@hwe/core-ui`:

```tsx
// apps/site-{slug}/src/compositions/{Slug}AccommodationComposition.tsx
import { AccommodationDetailTemplate } from '@hwe/core-ui';
import { BlockRenderer } from '@hwe/core-ui';
import { clientBlocks } from '@/blocks/registry';   // local registry, NOT @hwe/core-ui
import type { {Slug}AccommodationContent } from '@/payload-types';

export function {Slug}AccommodationComposition({ data }: { data: {Slug}AccommodationContent }) {
  return <AccommodationDetailTemplate data={data} blocks={clientBlocks} />;
}
```

Templates that accept a `blocks` override prop must forward it to their internal `<BlockRenderer layout={...} blocks={blocks} />` call. This allows client blocks to be used inside template sections without modifying core-ui.

## The test (`{Name}.test.tsx`)

Minimum coverage for a template to be promoted past `alpha`:

```tsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { axe } from 'jest-axe';
import { {Name}Template } from './{Name}';
import { {Name}Content } from './{Name}.schema';

const minimalBase: {Name}Content = {
  slug: 'test',
  title: 'Test',
  description: 'A test entity',
  heroImage: { src: 'https://example.com/a.jpg', alt: 'hero' },
  sections: [],
};

describe('{Name}Template', () => {
  it('parses minimal Base content', () => {
    expect(() => {Name}Content.parse(minimalBase)).not.toThrow();
  });

  it('renders Base only', () => {
    render(<{Name}Template data={minimalBase} />);
    expect(screen.getByRole('heading', { level: 1, name: 'Test' })).toBeInTheDocument();
  });

  it('renders each Optional only when present', () => {
    // for each optional field, render with and without it,
    // assert the corresponding block appears / does not appear
  });

  it('renders sections via BlockRenderer', () => {
    // pass sections: [{ type: '...', variant: '...', order: 0, content: {...} }]
    // BlockRenderer receives these as `layout` prop — assert the rendered DOM contains the expected block markup
  });

  it('passes axe accessibility audit on Base', async () => {
    const { container } = render(<{Name}Template data={minimalBase} />);
    expect(await axe(container)).toHaveNoViolations();
  });
});
```

## Public API exposure

```ts
// packages/core-ui/src/index.ts
export { {Name}Template, extend{Name} } from './templates/{Name}/{Name}';
export type { {Name}Content } from './templates/{Name}/{Name}.types';
```

## When to make a new template vs extend one

- **Different page semantics** (event detail vs accommodation detail vs article) → new template.
- **Same page semantics, different fields** (camping accommodation vs hotel accommodation) → extend the existing template via `extend{Name}` + (if needed) per-client composition.
- **Same page semantics, different layout** → declare a variant on the existing template, not a new template.

## Anti-patterns

- Don't add a Base field that only one client needs. Move it to Optional, or to client-side extension.
- Don't add an Optional field whose rendering logic is "if the client passes it, just pass it through". That is what `sections` is for.
- Don't fetch data inside the template component. The page (route handler) fetches; the template renders.
- Don't allow the template to fail silently when a Base field is missing. The schema is the contract — if Base is missing, the route should fail at build time, not render an empty page.
