# Client compositions

> **How** to assemble pages for a specific client using the building blocks of `@hwe/core-ui`. Companion to [`block-contract.md`](./block-contract.md), [`template-contract.md`](./template-contract.md), and the binding rules in [`ai-specs/specs/frontend-standards.md`](../../specs/frontend-standards.md).
> Load this file when scaffolding a new client site, deciding where a piece of UI belongs, or implementing per-client customization.
>
> **DEC-015:** Client blocks live in `src/blocks/` of the client repo (or `apps/site-{slug}/src/blocks/`), never in `packages/core-ui/src/base-blocks/`. See [`block-contract.md`](./block-contract.md) §Block ownership model for Level 1/2/3 details.
>
> **Composition names below** (`HomeComposition`, `BalnearioHomeComposition`) **are illustrative** — the canonical list of compositions per client comes from the per-source classification work under `docs/docs/plans/phase-1-design-system/sources/`.

## The layers, side by side

| Layer | Lives in | Reusable across clients? | Knows about a specific client? |
|---|---|---|---|
| **Primitive** | `packages/core-ui/src/primitives/` | yes | no |
| **Platform Block** | `packages/core-ui/src/base-blocks/` | yes | no |
| **Template** | `packages/core-ui/src/templates/` | yes | no |
| **Client Block** | `apps/site-{slug}/src/blocks/` (or client repo `src/blocks/`) | no — specific to this client | yes — implements the block for this client |
| **Composition** | `apps/site-{slug}/src/compositions/` | no — by design | yes — it IS the client |

Client blocks and compositions are the only places where "this client is special" is allowed to surface in code. Everything reusable stays in core-ui; everything specific stays in the client's app or repo.

### Client block ownership

A **Client Block** is a block that exists in the client's `src/blocks/` folder. It is never added to `packages/core-ui/src/base-blocks/`. Three usage levels apply (see [`block-contract.md`](./block-contract.md) §Block ownership model):

- **Level 1 — Re-export:** the client block folder is omitted; the platform block is re-exported directly from the client's `registry.ts`.
- **Level 2 — Slot extension:** the client wraps a platform block and fills its named slots.
- **Level 3 — Full custom:** the client implements the block from scratch using the same 5-file layout as platform blocks.

## What a composition is

A **composition** is a function component that:

1. Lives in `apps/site-{slug}/src/compositions/`.
2. Imports primitives, platform blocks, and/or templates from `@hwe/core-ui` and `@hwe/core-ui/base-blocks`.
3. Accepts already-fetched, already-validated `data` as props.
4. Assembles a specific page for a specific client.
5. May import client-only content from `apps/site-{slug}/src/content/{locale}.json` or hardcode arrangement that does not need to vary.

A composition is allowed to be opinionated about layout, ordering of blocks, and per-client copy that is not edited via the CMS. It is **not** allowed to do data fetching, to call APIs, or to contain business logic — those belong to the route handler and the application services.

## When to use which

| You need… | Use… |
|---|---|
| A reusable atomic UI element (button, input, dialog) | **Primitive** in `core-ui/primitives/` |
| A reusable page section (any client could use it) | **Platform Block** in `core-ui/base-blocks/` |
| A reusable page layout (one shape, many entities) | **Template** in `core-ui/templates/` |
| A platform block used unchanged by this client | **Level-1 client block** — re-export in `src/blocks/registry.ts` |
| A platform block extended with slots for this client | **Level-2 client block** in `src/blocks/{Name}/` |
| A fully custom block specific to this client | **Level-3 client block** in `src/blocks/{Name}/` |
| Assembly of blocks for one client's static page (home, contact) | **Composition** in `apps/site-{slug}/src/compositions/` |
| Wrapping a template with client-specific extras (extra section, custom header) | **Composition** that wraps the template |
| One-off visual for one client that no other client would want | **Composition** (and only inside it) |

## Where compositions plug into the route

A composition replaces inline assembly inside a `page.tsx`. Pages stay thin.

```tsx
// apps/site-{slug}/src/app/[locale]/page.tsx
import { HomeComposition } from '@/compositions/HomeComposition';
import { contentRepository } from '@/lib/repositories';

export default async function HomePage({ params }: { params: { locale: string } }) {
  const data = await contentRepository.getHomePage('{tenant-id}', params.locale);
  return <HomeComposition data={data} />;
}
```

The route:

- Does the data fetching.
- Validates `data` (the repository returns Zod-parsed types).
- Hands `data` to the composition.

The composition:

- Knows the visual order of blocks for this page on this client.
- Knows which blocks this page uses and which it omits.
- Does no fetching, no validation, no business logic.

## A static-page composition (illustrative)

```tsx
// apps/site-{slug}/src/compositions/HomeComposition.tsx
import { HeroBlock, GalleryBlock, BookingBlock, AmenitiesBlock } from '@hwe/core-ui/base-blocks';
import type { HomePageData } from '@/lib/types';

export function HomeComposition({ data }: { data: HomePageData }) {
  return (
    <>
      <HeroBlock      content={data.hero}      variant="full" />
      <BookingBlock   content={data.booking}   variant="inline" />
      <GalleryBlock   content={data.gallery}   variant="slider" />
      <AmenitiesBlock content={data.amenities} />
    </>
  );
}
```

The composition decides:

- That this client's home shows hero, then booking, then gallery, then amenities (a second client may put booking last).
- That the hero uses the `full` variant and the gallery uses `slider`.

Payload still stores the editable `content` of each block (texts, images, prices). The composition fixes the **arrangement and variant** for this client; Payload provides the **content** for each.

## Dynamic-layout composition with BlockRenderer

When the page layout itself is content-managed in Payload (the editor controls which blocks appear and in what order), the composition delegates rendering to `BlockRenderer`:

```tsx
// apps/site-{slug}/src/compositions/HomeComposition.tsx
import { BlockRenderer, type BlockInstance } from '@hwe/core-ui';
import { clientBlocks } from '@/blocks/registry';

export function HomeComposition({ layout }: { layout: BlockInstance[] }) {
  return <BlockRenderer layout={layout} blocks={clientBlocks} />;
}
```

Key points:

- `layout` is the array of `BlockInstance` objects from Payload (`{ type, variant, order, content }`).
- `blocks` is the client's registry — a `Record<string, ComponentType>` that merges on top of the base registry. Client blocks shadow platform blocks when their `type` key matches; new type keys are added to the registry without touching core-ui.
- The client's `src/blocks/registry.ts` is the **only** place to declare this registry. Compositions import from it — they do not build the registry inline.

```ts
// apps/site-{slug}/src/blocks/registry.ts
import { ComponentType } from 'react';
// Level 1 — re-exports (no subfolder needed)
export { HeroBlock, GalleryBlock } from '@hwe/core-ui/base-blocks';

// Level 3 — fully custom block
import { BookingPlusBlock } from './BookingPlusBlock/BookingPlusBlock';

export const clientBlocks: Record<string, ComponentType<any>> = {
  BookingPlus: BookingPlusBlock,
};
```

## A template-wrapping composition (per-client extras)

When a client extends a template's schema with extra fields, the page route uses a composition that wraps the template:

```tsx
// apps/site-{slug}/src/compositions/{Slug}AccommodationComposition.tsx
import { AccommodationDetailTemplate } from '@hwe/core-ui';
import { clientBlocks } from '@/blocks/registry';
import type { {Slug}AccommodationContent } from '@/payload-types';

export function {Slug}AccommodationComposition({ data }: { data: {Slug}AccommodationContent }) {
  return (
    <>
      <AccommodationDetailTemplate data={data} blocks={clientBlocks} />
      <aside>
        {/* extras specific to this client, rendered with the extended fields */}
        <h3>Specs</h3>
        <ul>
          <li>Plot size: {data.plotSize} m²</li>
          <li>Shaded: {data.shadedPlot ? 'yes' : 'no'}</li>
        </ul>
      </aside>
    </>
  );
}
```

The dynamic route uses the composition instead of the template directly:

```tsx
// apps/site-{slug}/src/app/[locale]/casas-rurales/[slug]/page.tsx
import { {Slug}AccommodationComposition } from '@/compositions/{Slug}AccommodationComposition';
import { contentRepository } from '@/lib/repositories';

export async function generateStaticParams() {
  const items = await contentRepository.list('accommodations', '{tenant}');
  return items.map(item => ({ slug: item.slug, locale: 'es' }));
}

export default async function Page({ params }: { params: { slug: string; locale: string } }) {
  const data = await contentRepository.get('accommodations', '{tenant}', params.slug);
  return <{Slug}AccommodationComposition data={data} />;
}
```

The core template is untouched. The client's extras live in the client's repo. Other clients of the same template do not see them.

## What compositions can contain

Allowed:

- JSX assembly of primitives, blocks, and templates from `@hwe/core-ui` and `@hwe/core-ui/base-blocks`.
- `<BlockRenderer layout={layout} blocks={clientBlocks} />` for content-managed page sections.
- Local copy via `next-intl` translations or `src/content/{locale}.json`.
- Per-client layout decisions (CSS class composition, grid arrangement).
- Per-client interaction wiring that does not belong to a block (e.g. binding a button click to a router navigation).

Forbidden:

- Data fetching (`await fetch(...)`, `await db.query(...)`).
- Validation logic (the route handler already validated).
- Calls to external APIs.
- Inline domain logic (price calculation, availability lookup, search filtering).
- Importing from `payload/` directly — `payload-types.ts` only.
- Modifying or re-styling a block via global selectors.
- Building the `clientBlocks` registry inline inside a composition — use `@/blocks/registry.ts`.

## Composition discoverability

Each client's `apps/site-{slug}/src/compositions/` is its own namespace. Compositions are not exported from a package — they are used only inside the same app. Two different clients can both have a `HomeComposition` with totally different internals.

Naming convention inside a single app:

- A composition for a static page: `{PageName}Composition.tsx` (e.g. `HomeComposition.tsx`, `ContactComposition.tsx`).
- A composition wrapping a template: `{Concept}Composition.tsx` (e.g. `AccommodationComposition.tsx`).
- For ambiguity across clients, a slug prefix is optional but rarely useful since each composition lives under one client's folder.

## When NOT to make a composition

- The page is identical for multiple clients → that is a template, not a composition.
- The visual element you need is going to appear on more than one client → it is a block, not a composition.
- The element is a primitive UI affordance → it is a primitive, not a composition.

If you find yourself copying a composition from `apps/site-A/` to `apps/site-B/` and tweaking it, stop. The shared part is a template or a block, and the per-client part is the only thing that should remain in the composition.

## Testing compositions

Compositions can be tested without booting Next. Render them in Vitest with fixture data:

```tsx
// apps/site-{slug}/src/compositions/HomeComposition.test.tsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { HomeComposition } from './HomeComposition';

describe('HomeComposition', () => {
  it('renders hero, then booking, then gallery, then amenities', () => {
    render(<HomeComposition data={fixtureHomePage} />);
    // assert order via querySelectorAll or by reading the DOM in sequence
  });
});
```

For dynamic-layout compositions, pass a fixture `layout` array:

```tsx
describe('HomeComposition (dynamic layout)', () => {
  it('renders client blocks from the registry', () => {
    const layout: BlockInstance[] = [
      { type: 'BookingPlus', variant: undefined, order: 0, content: fixtureBooking },
    ];
    render(<HomeComposition layout={layout} />);
    // assert the BookingPlusBlock is rendered
  });
});
```

E2E tests for the same composition live in `apps/site-{slug}/tests/e2e/` and hit the actual route via Playwright. The unit test catches "we put the blocks in the wrong order"; the E2E test catches "the route does not deliver the data the composition expects".

## Summary in one sentence

Platform blocks and templates are **what is possible**. Client blocks are **how this client extends it**. Compositions are **what this specific client chose**.
