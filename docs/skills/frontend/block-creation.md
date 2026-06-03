# Block creation — walkthrough

> The **how-to** for adding a block to the hwe platform or to a client site. Companion to [`docs/frontend/block-contract.md`](../../contracts/frontend/block-contract.md) (the rules) and to the `/scaffold-block` skill (the file generator). Load this when implementing a block by hand, reviewing a block PR, or fixing a regression in an existing block.
>
> **DEC-015 — two locations:** platform blocks (base-blocks) go into `packages/core-ui/src/base-blocks/`; client-specific blocks go into `site-{slug}/src/blocks/`. Read "Decide the target" below before scaffolding.
>
> If `/scaffold-block` works for your case, use it — it produces the skeleton in one step. This document covers what to do **after** the skeleton exists, plus the cases the skill does not yet automate (structural variants per [DEC-008](../../architecture/decisions.md#dec-008--structural-variants-for-complex-blocks), slot definitions per DEC-015).

## End-to-end flow

Eight steps from "I have a story" to "the block is in production". Each step links to the authoritative reference for that phase.

```
1. Decide the layers
2. Scaffold the files
3. Replace placeholders
4. Implement TDD-first
5. Register (manual)
6. /seo-audit
7. /security-audit   ← only if block has inputs or adapter
8. /archive
```

### 1. Decide the layers — [`block-architecture.md §1`](../../specs/frontend/block-architecture.md)

Read `docs/specs/frontend/block-architecture.md §1` and answer four questions:
- Layer 1 (content schema): **always**.
- Layer 3 (config schema): only if the block has behavioral options (autoplay, columns, PMS config).
- Layer 4 (adapter): only if the block connects to an external service (PMS, map, CRM).
- Layer 2 level: CVA (styling only) vs structural (different hooks/DOM) vs functional (different Payload fields).

If working inside SPECBOOT, the Planner documents the layers in the proposal ("Layer declaration" section). If working standalone, decide here.

### 2. Scaffold the files — [`/scaffold-block`](../../../.claude/skills/scaffold-block/SKILL.md)

```bash
/scaffold-block {Name}Block                                # base-block (default: packages/core-ui/src/base-blocks/)
/scaffold-block {Name}Block --target client                # client block (site-{slug}/src/blocks/)
/scaffold-block {Name}Block --config                       # + Layer 3 config schema
/scaffold-block {Name}Block --config --adapter {domain}    # + Layer 4 adapter comment
```

The skill creates the mandatory 5 files (plus `{Name}Block.config.schema.ts` if `--config`). It prints the two manual registry edits you must apply in Step 5.

### 3. Replace placeholders — [`block-contract.md`](../../contracts/frontend/block-contract.md)

In each generated file, replace the `TODO` stubs with real content:

| File | What to fill |
|---|---|
| `{Name}Block.schema.ts` | Real Zod fields mirroring the Figma reference. Image fields keep `alt`. Optional fields use `.optional()`. |
| `{Name}Block.config.schema.ts` | Real behavioral config fields with `.default()` values. |
| `{Name}Block.variants.ts` | Real CVA recipe — Tailwind token utilities, never raw hex or Tailwind built-ins. |
| `{Name}Block.test.tsx` | Cover all mandatory cases per contract: schema parse, render, all variants, axe. |

Do **not** touch `{Name}Block.tsx` yet — the test must fail first.

### 4. Implement TDD-first — [`block-creation.md §TDD flow`](#tdd-flow)

```
a. pnpm --filter @hwe/core-ui test {Name}Block.test.tsx   → must FAIL (no component yet)
b. Write {Name}Block.tsx + fill in variants.ts             → minimum code to pass
c. pnpm --filter @hwe/core-ui test {Name}Block.test.tsx   → must PASS
d. pnpm --filter @hwe/core-ui typecheck                   → zero errors
e. pnpm --filter @hwe/core-ui build                       → no build failures
```

If the test does not fail at step (a), the test is testing the wrong thing — fix the test before writing the component.

### 5. Register — [`block-creation.md §Exports and registry`](#exports-and-registry)

Apply the manual edits the scaffold printed (differ by target):

**For a base-block (platform):**
1. **`packages/core-ui/src/renderer/baseBlockRegistry.ts`** — add component import + schema import + registry entry.
2. **`packages/core-ui/src/index.ts`** — add named exports for the component and types.

**For a client block:**
1. **`site-{slug}/src/blocks/registry.ts`** — add component import + registry entry.
2. Pass `clientBlocks` from `registry.ts` to `<BlockRenderer layout={layout} blocks={clientBlocks} />`.

These are intentionally manual: adding them is the conscious decision "this block is now part of the platform's public API."

### 6. `/seo-audit` — [`seo-geo-specialist`](../../../.claude/agents/seo-geo-specialist.md)

Run after every new block — mandatory gate before `beta`:

```
/seo-audit {slug}
```

The audit checks: heading hierarchy, landmark elements (`<section aria-labelledby>`), image `alt` text, `next/image` usage, and that the block's JSON-LD mapping is documented in `block-architecture.md §6`. A block without a documented JSON-LD mapping entry (even if "no JSON-LD needed") is a **major finding**.

Fix all blockers and majors before proceeding.

### 7. `/security-audit` — [`security-specialist`](../../../.claude/agents/security-specialist.md)

Run **only if** the block has user inputs OR connects to an adapter (Layer 4):

```
/security-audit {slug}
```

The audit checks per `block-architecture.md §7`: Zod validation at Route Handler boundary, XSS prevention, credentials in env vars only (never in client bundle), DOMPurify before `dangerouslySetInnerHTML`, RGPD legal basis for personal data.

Fix all blockers before proceeding.

### 8. `/archive` — [`specboot-flow.md §Phase 5`](../../../docs/specs/ai/specboot-flow.md)

After `/verify` is green and `/seo-audit` + `/security-audit` pass:

```
/archive docs/plans/{epic}/stories/US-NNN-{slug}.md
```

The `docs-writer` agent:
- Syncs `docs/specs/seo/semantic-html.md §Per-block semantic requirements` if the block is new.
- Adds the block to `docs/catalog.md`.
- Updates `docs/specs/frontend/block-architecture.md §6` with the JSON-LD mapping if missing.
- Marks the story `status: done`.

---

## Decide the layers

Before writing a single file, read [`docs/specs/frontend/block-architecture.md`](../../specs/frontend/block-architecture.md) and decide which layers the block needs. Answer these questions:

| Question | Answer | Layer to add |
|---|---|---|
| Always | — | **Layer 1** — Content Schema (`{Name}Block.schema.ts`) |
| Does the block have behavioral options (autoplay, columns, PMS config, lightbox)? | Yes | **Layer 3** — Config Schema (`{Name}Block.config.schema.ts`) |
| Does the block connect to an external service (PMS, map, CRM, payment)? | Yes | **Layer 4** — Adapter (`@hwe/{domain}/adapters/{name}/`) |
| Do variants differ only in CSS classes? | Yes | **Layer 2-A** — CVA (default, no extra files) |
| Do variants need different hooks, DOM trees, or sub-components? | Yes | **Layer 2-B** — Structural variants (`index.ts` resolver) |
| Do variants need different content fields in Payload? | Yes | **Layer 2-C** — Functional variants (shared schema with `.optional()` fields) |

**Rule:** add a layer only when the answer is "Yes". A static visual block (hero, media-text, amenities) needs only Layer 1 + Layer 2-A. A booking widget needs all four layers.

The planner must declare the required layers in the proposal before `/apply`. If you are working outside SPECBOOT, decide here before choosing the file layout.

---

## When to create a block

Before creating a block, classify the element using [`docs/architecture/domain-model.md`](../../architecture/domain-model.md) §7:

| You want to build … | The right home is … |
|---|---|
| A self-contained page section reusable across 2+ clients, maintained by the platform team | A **base-block** in `packages/core-ui/src/base-blocks/{Name}/` |
| A self-contained page section specific to one client, or a client override of a base-block | A **client block** in `site-{slug}/src/blocks/{Name}/` |
| An atomic UI primitive (button, input, dialog, icon) | A **primitive** in `@hwe/core-ui/src/primitives/{Name}/` |
| A full data-driven page layout (accommodation detail, article detail) | A **template** in `@hwe/core-ui/src/templates/{Name}/` |
| A one-off arrangement of blocks for a single client's page | A **composition** in `apps/site-{slug}/src/compositions/` |

If your candidate has a unique data shape **and** is reused, it is a block. If it only appears in one client's app, it stays in that app's `compositions/` — never in `core-ui`.

## Decide the target

Before creating any files, decide whether the block belongs to the platform or to the client.

| Question | Target |
|---|---|
| Will 2+ clients use this block unchanged? | Base-block → `packages/core-ui/src/base-blocks/{Name}/` |
| Is this block specific to one client, or overriding a base-block? | Client block → `site-{slug}/src/blocks/{Name}/` |
| Does the client just need to re-export the base-block? | Level 1 — no new files, just `src/blocks/{Name}/index.ts` re-exporting |
| Does the client need to fill named slots in the base-block? | Level 2 — create `src/blocks/{Name}/index.ts` wrapping the base-block with slot content |
| Does the client need a completely different DOM/behavior? | Level 3 — create a full `src/blocks/{Name}/{Name}.tsx` component |

## File structure

### Base-block (platform — `packages/core-ui/src/base-blocks/`)

A base-block lives in `packages/core-ui/src/base-blocks/{Name}/`. Schemas live separately in `packages/core-ui/src/schemas/`, types in `packages/core-ui/src/types/`. Two layouts depending on complexity.

### Flat layout (default — CVA variants only)

Five mandatory files. Used when variants are styling-only (CVA).

```
packages/core-ui/src/base-blocks/{Name}/
├── {Name}.tsx              ← component
├── {Name}.variants.ts      ← CVA recipe
├── {Name}.types.ts         ← types (re-export only — actual types in src/types/)
├── {Name}.schema.ts        ← Zod schema for `content` (actual schema in src/schemas/)
└── {Name}.test.tsx         ← Vitest + Testing Library + axe

packages/core-ui/src/schemas/{Name}Block.schema.ts   ← canonical schema location
packages/core-ui/src/types/{Name}Block.types.ts      ← canonical types location
```

Generated by `/scaffold-block {Name}`. Do not write these by hand if the skill works for your block name.

### Slot definition (optional, DEC-015)

If the base-block has named extension points for clients, declare them in a `.slots.ts` file alongside the component:

```
packages/core-ui/src/base-blocks/{Name}/
├── {Name}.tsx
├── {Name}.slots.ts         ← defines HeroBlockSlots type + default empty slots
└── ...
```

```ts
// {Name}Block.slots.ts
export type {Name}BlockSlots = {
  badge?: React.ReactNode;
  afterCta?: React.ReactNode;
};
```

### Structural-variant layout (opt-in — [DEC-008](../../architecture/decisions.md#dec-008--structural-variants-for-complex-blocks))

Used when variants require different hooks, different DOM trees, or different sub-components (Gallery masonry vs carousel, Booking inline vs iframe, Hero video vs slider).

```
packages/core-ui/src/base-blocks/{Name}Block/
├── index.ts                ← variant resolver (this is THE exception to the
│                              "no internal index.ts" rule from structure.md)
├── {Name}Block.schema.ts   ← ONE shared schema, all variants parse the same content
├── {Name}Block.types.ts    ← shared types
├── {Name}Block.test.tsx    ← tests covering every variant
├── shared/                 ← sub-components used by 2+ variants of this family
│   └── {Component}.tsx
├── {Name}{VariantA}/       ← one subfolder per structural variant
│   └── {Name}{VariantA}.tsx
└── {Name}{VariantB}/
    └── {Name}{VariantB}.tsx
```

### Client block (`site-{slug}/src/blocks/`)

Client blocks follow the same five-file layout as base-blocks, but may also include a `.slots.ts` consumer file:

```
site-{slug}/src/blocks/{Name}Block/
├── index.ts              ← Level 1: re-export OR Level 2: wrapper with slots OR Level 3: full component
└── {Name}Block.tsx       ← Level 3 only: custom component implementation
```

After creating the files, always register the block in `src/blocks/registry.ts`:

```ts
// site-{slug}/src/blocks/registry.ts
import { HeroBlock } from './HeroBlock';
import { CustomBlock } from './CustomBlock';

export const clientBlocks = {
  HeroBlock,
  CustomBlock,
} as const;
```

And pass the registry to `BlockRenderer`:

```tsx
import { clientBlocks } from '../blocks/registry';
// ...
<BlockRenderer layout={page.layout} blocks={clientBlocks} />
```

The resolver in `index.ts`:

```ts
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

A future `/scaffold-variant` skill will automate adding a new structural variant to an existing block. Until then, copy an existing subfolder and update the resolver by hand.

### Choosing the layout

| Question | If yes |
|---|---|
| Do variants only change CSS classes (color, spacing, alignment)? | Flat layout, CVA variants |
| Do variants need different React hooks, different child components, or different DOM trees? | Structural-variant layout |
| Is there only one variant today? | Flat layout. Migrate later if needed. |

Start flat. Migrate to structural variants when CVA can no longer express the difference.

## TDD flow

The block contract treats tests as a promotion gate ([`lifecycle.md`](../../specs/lifecycle.md)). Write them first.

### 1. Write the schema

Open `{Name}.schema.ts` and declare the Zod shape of `content`. Mirror the Figma reference (`figma-makes/{slug}/src/app/components/{Component}.tsx`) for field names and required-vs-optional. Image fields **always** carry `alt`. Optional fields use `.optional()` — the component renders them conditionally.

### 2. Write the test

Open `{Name}.test.tsx`. Cover the four mandatory cases before any component code exists:

```tsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { axe, toHaveNoViolations } from 'jest-axe';
import { {Name} } from './{Name}';
import { {Name}Content } from './{Name}.schema';

expect.extend(toHaveNoViolations);

const minimal: {Name}Content = {
  /* the smallest content payload that parses */
};

describe('{Name}', () => {
  it('parses minimal content', () => {
    expect(() => {Name}Content.parse(minimal)).not.toThrow();
  });

  it('renders the title and image', () => {
    render(<{Name} content={minimal} />);
    expect(screen.getByRole('heading')).toBeInTheDocument();
  });

  it('renders all declared variants without error', () => {
    /* one render per variant value */
  });

  it('passes axe accessibility audit', async () => {
    const { container } = render(<{Name} content={minimal} />);
    expect(await axe(container)).toHaveNoViolations();
  });
});
```

Run `pnpm --filter @hwe/core-ui test`. Tests **must fail** — there is no component yet.

For structural variants, add one interaction test per variant where users do something (click a CTA, open a dialog, swipe a carousel).

### 3. Implement until green

Write `{Name}.tsx` and `{Name}.variants.ts` (and the subfolder variants if applicable). Keep iterating until `pnpm test` is green. Then `pnpm typecheck`. Then `pnpm build`.

The order matters: schema → test → fail → component → pass. If you write the component first you will subconsciously test the implementation you wrote, not the contract you intended.

### 4. Visual check against Figma

Open the rendered probe / composition in `localhost:3000`. Compare with the Figma Make reference component side-by-side. Discrepancies trigger a fix in `.tsx` or `.variants.ts`, never a fix in `tokens.json` (that file describes the brand, not the layout).

## Design token rules

This section is load-bearing. Every block has to follow these rules; they protect the brand consistency across clients.

### Rule 1 — Never use Tailwind defaults when a token exists

Tokens defined in `apps/site-{slug}/src/theme/tokens.json` are the design vocabulary. If a property has a token (`colors`, `radii`, `shadows`, `fonts`, `spacing`), the block uses that token via the Tailwind utility class that the preset wires up. **Never** fall back to Tailwind's built-in default for that property.

| Property | Tailwind default | Token-driven utility (correct) |
|---|---|---|
| Border radius | `rounded-md` ≡ 6px | `rounded-md` ≡ value from `tokens.radii.md` (e.g. 3px) |
| Shadow | `shadow-md` ≡ Tailwind's opinionated shadow | `shadow-card` / `shadow-elevated` ≡ values from `tokens.shadows` |
| Background color | `bg-blue-500` | `bg-primary` / `bg-accent` / `bg-surface` |
| Heading font | `font-serif` | `font-heading` ≡ `tokens.fonts.heading` |

The `createhwePreset` function maps `tokens.radii`, `tokens.shadows`, etc. onto Tailwind's namespaces, so `rounded-md` and `shadow-card` resolve to the token values automatically. But that only protects you if you **use the named utility**. Never write `rounded` (no value — Tailwind picks a default), `shadow` (same), `border` (same).

### Rule 2 — If the Figma does not apply a class, your block does not either

The base-template (Camping Mer et Camargue) deliberately uses **zero border-radius on CTAs, cards, and surfaces** — the surfaces are rectangular, the brand uses `rounded-full` only for circular icon containers. The fact that `tokens.radii` defines `sm`/`md`/`lg` does not mean every surface uses them. The tokens are the **available vocabulary**; the Figma reference says which words to actually use.

Before adding any visual utility (`rounded-*`, `shadow-*`, a `border`, a `transition-*`), check the Figma reference (`figma-makes/{slug}/src/app/components/{Component}.tsx`). If the reference component does not have it, your block does not get it.

This rule was added by [DEC-012](../../architecture/decisions.md#dec-012--tailwind-v3-over-v4-for-the-walking-skeleton) discussion (walking skeleton 2026-05-21). See also the user-memory note `hwe-figma-fidelity-no-tailwind-defaults` if working with Claude Code on this repo.

### Rule 3 — Map every visual property to a token, never inline

- No hex codes in `.tsx` or `.variants.ts` (`#1A4A52` is forbidden — use `bg-primary`).
- No font-family strings (`'Playfair Display'` is forbidden — use `font-heading`).
- No raw `px` or `rem` for shadows, radii, or any value that has a token.
- Spacing utilities (`p-4`, `gap-6`, `mt-8`) are exempt — Tailwind's default spacing scale is the project's spacing scale. The exception is `py-section-y` and `max-w-container`, which come from `tokens.spacing`.

### Rule 4 — Variants change appearance, not data

CVA variants are pure styling. They never change the shape of `content`. If a variant needs different fields, it is a **structural variant** (per [DEC-008](../../architecture/decisions.md#dec-008--structural-variants-for-complex-blocks)) and the differing fields are optional on the shared schema, not part of a CVA value.

## SEO rules

Every block is crawled by search engines and LLM indexers. These rules are load-bearing for SEO health and complement the Design token rules above.

### Never use native `<img>`

Always use Next.js `<Image>` from `next/image`. Native `<img>` bypasses format optimisation, resizing, and the LCP-preload pipeline.

```tsx
// ✗ Wrong
<img src={content.image.src} alt={content.image.alt} />

// ✓ Correct
import Image from 'next/image';
<Image src={content.image.src} alt={content.image.alt} width={800} height={600} loading="lazy" />
```

### Loading strategy by position

| Block role | Prop | Why |
|---|---|---|
| Hero (above-the-fold, LCP candidate) | `priority` | Sets `fetchPriority="high"` + preload link in `<head>` — do not add `loading="eager"` separately |
| Every other image | `loading="lazy"` | Browser defers off-screen images; reduces initial payload |

Always provide explicit `width` and `height` — prevents CLS (Cumulative Layout Shift).

### Landmark and heading structure

- `<section>` always carries `aria-labelledby` pointing to the block's heading `id`.
- Block titles use `<h2>`. Sub-items (cards, reviews, gallery captions) use `<h3>`. **Never use `<h1>` inside a block** — `<h1>` belongs to the page only.
- Heading IDs follow the pattern `{name}-heading` (e.g. `reviews-heading`, `amenities-heading`).

### Semantic elements for repeated content

| Content type | Element |
|---|---|
| Accommodation card, review card (standalone, linkable) | `<article>` |
| Review / testimonial text | `<blockquote>` |
| Navigation links within a block | `<nav aria-label="...">` |

### Alt text rules

Alt text is **descriptive and in the site's language**:

- Hero: scene + establishment name (e.g. `"Vue aérienne du Camping Mer et Camargue dans la pinède de Calvisson"`)
- Accommodation card: type + capacity (e.g. `"Mobil-home 3 chambres, vue jardin"`)
- Decorative dividers or background fills: `alt=""` **and** `aria-hidden="true"`
- Never: `"image"`, `"photo"`, `"img"`, `"picture"`, or an empty string on a meaningful image

### Reference

Full per-block semantic table: [`docs/specs/seo/semantic-html.md`](../../specs/seo/semantic-html.md).

## Exports and registry

Two (or three for client blocks) manual edits per block after the files exist. These are the **conscious promotion gates** — they are deliberately not automated by `/scaffold-block`.

### Public API — `packages/core-ui/src/index.ts` (base-blocks only)

Add the named exports:

```ts
export { {Name} } from './base-blocks/{Name}/{Name}';
export type {
  {Name}Content,
  {Name}Props,
  {Name}Variants,
} from './base-blocks/{Name}/{Name}.types';
```

Consumers import from the package root only:

```ts
import { HeroBlock, type HeroBlockContent } from '@hwe/core-ui';
```

Or via subpath when importing specifically from base-blocks:

```ts
import { HeroBlock } from '@hwe/core-ui/base-blocks';
```

Never expose deep paths (`@hwe/core-ui/src/base-blocks/...`). The package's public API is the single line of defense against drift.

### Registry — `packages/core-ui/src/renderer/baseBlockRegistry.ts` (base-blocks only)

Add the entry:

```ts
import { {Name} }        from '@/base-blocks/{Name}/{Name}';
import { {Name}Content } from '@/base-blocks/{Name}/{Name}.schema';

export const baseBlockRegistry = {
  // ...
  {Name}: {
    component: {Name},
    contentSchema: {Name}Content,
    variants: ['variantA', 'variantB'] as const,   // optional — declares legal variant keys
  },
} as const;
```

The `variants` field is optional, declared when the block has variants the CMS should know about (CVA values OR structural variant keys per [DEC-008](../../architecture/decisions.md#dec-008--structural-variants-for-complex-blocks)).

### Client block registry — `site-{slug}/src/blocks/registry.ts`

For client blocks (Level 1, 2, or 3), add the entry to the client's registry:

```ts
import { {Name}Block } from './{Name}Block';

export const clientBlocks = {
  // ...
  {Name}Block,
} as const;
```

Then pass it to `BlockRenderer`:

```tsx
<BlockRenderer layout={page.layout} blocks={clientBlocks} />
```

`BlockRenderer` merges client blocks on top of `baseBlockRegistry`. Client blocks take precedence for any type name they declare.

### Catalog — `docs/catalog.md`

Add a row under "Blocks" (or create the section if it does not exist yet):

```
| {Name} | alpha | 0.1.0 | `packages/core-ui/src/base-blocks/{Name}/` | One-line description |
```

Promotion from `alpha` to `beta` requires all 5 mandatory files filled with real content, all tests green (including axe), and the block consumed by at least one composition. See [`lifecycle.md`](../../specs/lifecycle.md).

## Common failures

| Symptom | Cause | Fix |
|---|---|---|
| `BlockRenderer` renders nothing for a block | Missing or misspelled entry in `baseBlockRegistry.ts` or `registry.ts` | Add the entry; double-check `BlockType` matches the key in Payload; verify `blocks` prop is passed to `BlockRenderer` for client blocks |
| `entry.contentSchema.parse(...)` throws at runtime | Payload data shape diverged from the schema | Update the schema (and Payload field config) — never silently coerce |
| `axe` reports a contrast failure | Block uses a token combination not approved by the brand | Pick a different token pair; do not add `aria-hidden` to silence axe |
| Tailwind utility renders the wrong color | The class name uses a Tailwind built-in (`bg-blue-500`) instead of a token (`bg-primary`) | Replace with the token utility; see "Design token rules" above |
| `rounded` or `shadow` appears in the diff | A default-valued utility class slipped in | Replace with the named token utility, or remove if the Figma does not apply it (rule 2) |
| Build fails with "TokensContract: Required" | `tokens.json` is missing a required field for the role | Extract the missing color from Figma; never invent a brand value |

## Where to read next

- [`docs/frontend/block-contract.md`](../../contracts/frontend/block-contract.md) — the canonical rules (this doc is the walkthrough).
- [`docs/skills/theme-tokens-pipeline.md`](./theme-tokens-pipeline.md) — how the token values reach the block.
- [`docs/frontend/structure.md`](../../contracts/frontend/structure.md) — where blocks live in the package.
- [`docs/architecture/decisions.md`](../../architecture/decisions.md) §DEC-008 / §DEC-009 / §DEC-010 / §DEC-012 — the architectural decisions that constrain this walkthrough.
- [`docs/specs/frontend/coding-standards.md`](../../specs/frontend/coding-standards.md) — day-to-day coding rules that apply when writing the `.tsx` and `.variants.ts` files: component structure, import order, React patterns, anti-patterns table.
