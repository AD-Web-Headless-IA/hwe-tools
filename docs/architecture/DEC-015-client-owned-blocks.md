# DEC-015 — Client-owned blocks with shared schemas, slot-based composition, and npm subpath exports

> **Status:** Proposed
> **Date:** 2026-06-01
> **Extends:** DEC-003 (Frontend layout), DEC-008 (Structural variants), DEC-009 (blockDefaults), DEC-011 (Independent client repos)
> **Supersedes:** The assumption that all block implementations live in `packages/core-ui/blocks/` and that clients consume them as-is with no visual override mechanism beyond tokens and CVA.

---

## Part 1 — The Decision

### Context

The current architecture places all block implementations (`.tsx` files with JSX, Tailwind classes, and visual structure) in `packages/core-ui/src/blocks/`. Client sites — which per DEC-011 live in **independent git repos** and consume `@hwe/core-ui` as an npm package from a private registry — import these blocks with no ability to change the DOM structure.

This creates a fundamental tension:

1. **Visual structure is fixed.** A `HeroBlock` with `h1 centered → subtitle → CTA button` works for Camping Mer et Camargue but not for Hotel Balneario, which needs a split layout with text-left and an image half. Tokens change colors and fonts, CVA variants change class combinations, but neither changes the DOM tree.

2. **Structural variants (DEC-008) don't scale to 300 clients.** Adding a structural variant to `core-ui` for every client-specific layout pollutes the shared package. With 300 clients, `HeroBlock/` would accumulate dozens of variants, most used by a single site.

3. **The client project feels incomplete.** Opening a client repo shows compositions and theme but not the blocks that render the actual UI. The developer must look at the npm package source to understand what renders.

4. **Existing team patterns confirm the split.** The Septeo `react-components` project already separates generic primitives (`components/ui/` — shadcn) from product-specific components (`components/RevenueManagement*/`, `modules/properties/`). The team is familiar with this pattern.

5. **The Design System Engine (DSE) reference** demonstrates that sections with "slots" (customizable render points) provide visual flexibility while maintaining structural consistency.

### Decision

**Split `packages/core-ui/` into shared infrastructure and reference implementations. Block implementations live in each client's independent repo. Base-blocks are consumed via npm subpath exports.**

#### 1. New structure of `packages/core-ui/`

```
packages/core-ui/
├── src/
│   ├── schemas/                    ← Zod content + config schemas (shared, immutable)
│   │   ├── HeroBlock.schema.ts
│   │   ├── HeroBlock.config.schema.ts
│   │   ├── GalleryBlock.schema.ts
│   │   └── ...
│   ├── types/                      ← Shared types derived from schemas
│   │   ├── HeroBlock.types.ts
│   │   └── ...
│   ├── primitives/                 ← Shadcn/Radix atomic UI (shared, overridable per client)
│   │   ├── Button/
│   │   ├── Input/
│   │   ├── Dialog/
│   │   └── ...
│   ├── renderer/                   ← BlockRenderer + registry (shared)
│   │   ├── BlockRenderer.tsx
│   │   ├── baseBlockRegistry.ts    ← renamed from blockRegistry.ts, imports from base-blocks
│   │   └── BlockRenderer.test.tsx
│   ├── providers/                  ← React context providers (shared)
│   │   ├── TenantProvider.tsx
│   │   ├── SeasonProvider.tsx
│   │   └── index.ts
│   ├── layout/                     ← Shell, Navbar base, Footer base (shared)
│   │   ├── SiteShell.tsx
│   │   ├── Navbar/
│   │   └── Footer/
│   ├── theme/                      ← Token contract + cascade system (shared)
│   │   ├── tokens.contract.ts      ← existing, extended for cascade
│   │   ├── cssVariables.ts
│   │   └── index.ts
│   ├── base-blocks/                ← NEW: reference implementations (scaffold copies these)
│   │   ├── index.ts                ← re-exports all base-blocks for subpath
│   │   ├── HeroBlock/
│   │   │   ├── HeroBlock.tsx       ← default implementation with optional slots
│   │   │   ├── HeroBlock.slots.ts  ← slot type definitions
│   │   │   └── HeroBlock.test.tsx  ← reference tests
│   │   ├── BookingBlock/           ← structural variants preserved (DEC-008)
│   │   │   ├── index.ts            ← variant resolver
│   │   │   ├── BookingInline/
│   │   │   └── BookingSticky/
│   │   ├── GalleryBlock/
│   │   └── ...
│   ├── composition-rules/          ← NEW: adopted from DSE reference
│   │   ├── rules.schema.ts         ← Zod schema for composition rules
│   │   ├── validator.ts            ← validates section order/adjacency
│   │   └── validator.test.ts
│   └── index.ts                    ← package root public API
│
├── package.json                    ← includes "exports" subpaths
├── tsconfig.json
└── README.md
```

#### 2. npm subpath exports in `package.json`

Client repos and `apps/site-demo/` both consume `@hwe/core-ui` via the same import paths. The package exposes three public subpaths:

```json
{
  "name": "@hwe/core-ui",
  "exports": {
    ".":              "./src/index.ts",
    "./base-blocks":  "./src/base-blocks/index.ts",
    "./schemas":      "./src/schemas/index.ts"
  }
}
```

This means:

```ts
// Package root — primitives, renderer, providers, theme, types
import { BlockRenderer, Button, SiteShell } from '@hwe/core-ui';

// Base-blocks subpath — reference block implementations
import { HeroBlock } from '@hwe/core-ui/base-blocks';

// Schemas subpath — Zod schemas and derived types only (no runtime components)
import { HeroBlockContent } from '@hwe/core-ui/schemas';
import type { HeroBlockContent as HeroType } from '@hwe/core-ui/schemas';
```

The root export (`@hwe/core-ui`) does NOT re-export base-blocks. This is intentional: client code that imports a block explicitly chooses whether to use the base-block or its own implementation. No accidental coupling.

#### 3. Structure of a client repo (independent, per DEC-011)

Client repos are independent git repos that install `@hwe/core-ui` (and other `@hwe/*` packages) from the private npm registry. The structure of a client repo:

```
site-{slug}/                            ← independent repo, NOT inside hwe-platform/
├── src/
│   ├── app/
│   │   ├── globals.css                 ← ONE CSS file: fonts, token vars, animations, 3rd-party
│   │   ├── layout.tsx
│   │   ├── page.tsx
│   │   └── [locale]/...
│   ├── blocks/                         ← client's own block implementations
│   │   ├── HeroBlock/
│   │   │   └── HeroBlock.tsx           ← uses base-block + slots, or fully custom JSX
│   │   ├── GalleryBlock/
│   │   │   └── GalleryBlock.tsx
│   │   └── registry.ts                 ← client block map fed to BlockRenderer
│   ├── primitives/                     ← OPTIONAL: primitive overrides (rare, ~2% of clients)
│   │   └── Button/
│   │       └── Button.tsx
│   ├── compositions/
│   │   ├── HomeComposition.tsx
│   │   └── ...
│   ├── data/                           ← static content / fake content
│   ├── content/                        ← i18n translations
│   └── theme/
│       ├── tokens.json                 ← brand-level token values
│       └── globals.css                 ← can also live in app/ per convention
├── payload/                            ← Payload schemas for this client
├── public/
├── tests/e2e/
├── client.config.ts
├── tailwind.config.ts
├── next.config.mjs
├── package.json                        ← depends on @hwe/core-ui, @hwe/config, @hwe/booking...
└── tsconfig.json
```

The key change vs. the current `apps/site-{slug}/` layout (per `structure.md`) is the addition of `src/blocks/` and `src/blocks/registry.ts`.

#### 4. The same structure in `apps/site-demo/` (monorepo reference)

`apps/site-demo/` inside the monorepo mirrors the client repo structure exactly. It is the canonical "what does a real client project look like?" reference. It consumes `@hwe/core-ui` via pnpm workspace link (not npm install), but the import paths are identical:

```
apps/site-demo/
├── src/
│   ├── app/
│   ├── blocks/                         ← same as a client repo
│   │   ├── HeroBlock/HeroBlock.tsx
│   │   ├── ...
│   │   └── registry.ts
│   ├── compositions/
│   ├── data/
│   └── theme/
```

#### 5. Block resolution chain

When BlockRenderer needs to render a block, it resolves in this order:

```
1. Client block map (site-{slug}/src/blocks/registry.ts)
   → Found? Use client implementation.
   → Not found? ↓

2. Base-block (from @hwe/core-ui/base-blocks via baseBlockRegistry)
   → Found? Use default implementation.
   → Not found? Dev warning.
```

The client's `registry.ts`:

```ts
// site-{slug}/src/blocks/registry.ts
import { HeroBlock } from './HeroBlock/HeroBlock';
import { GalleryBlock } from './GalleryBlock/GalleryBlock';
import { BookingBlock } from './BookingBlock/BookingBlock';

export const clientBlocks = {
  HeroBlock,
  GalleryBlock,
  BookingBlock,
} as const;
```

The layout wires it:

```tsx
// site-{slug}/src/app/layout.tsx
import { BlockRenderer } from '@hwe/core-ui';
import { clientBlocks } from '../blocks/registry';

// BlockRenderer merges: clientBlocks over baseBlockRegistry
<BlockRenderer layout={layout} blocks={clientBlocks} />
```

BlockRenderer is refactored to accept an optional `blocks` prop:

```tsx
type BlockRendererProps = {
  layout: LayoutBlock[];
  blocks?: Record<string, React.ComponentType<any>>;
};
```

Render logic: for each block in `layout[]`, look up `blocks[type]` first (client override). If not found, fall back to `baseBlockRegistry[type]`. If neither, dev warning.

#### 6. Three usage levels for client developers

```tsx
// Level 1 — Re-export (tokens do all the work, ~70% of cases)
export { HeroBlock } from '@hwe/core-ui/base-blocks';

// Level 2 — Slots (customize specific visual pieces, ~20% of cases)
import { HeroBlock as BaseHero } from '@hwe/core-ui/base-blocks';
export function HeroBlock({ content }) {
  return <BaseHero content={content} slots={{ heading: myCustomHeading }} />;
}

// Level 3 — Full custom (ignore base-block, use only schema, ~10% of cases)
import type { HeroBlockContent } from '@hwe/core-ui/schemas';
export function HeroBlock({ content }: { content: HeroBlockContent }) {
  return <section>/* completely custom JSX */</section>;
}
```

#### 7. Primitive override chain

Same three levels apply to primitives. Most clients (~98%) never override primitives — tokens handle it. For the 2% that need a custom Button with a special animation:

```
site-{slug}/src/primitives/Button/Button.tsx  ← client's custom Button
```

This is NOT automatic resolution. It's an import choice: the client's block imports from `../primitives/Button` if a local override exists, or from `@hwe/core-ui` if using the shared one. The `scaffold-site` template sets up imports from `@hwe/core-ui` by default.

#### 8. Slot pattern for base-blocks

Base-blocks define optional render slots for visual customization. A slot is a typed function that receives data and returns JSX.

```ts
// packages/core-ui/src/base-blocks/HeroBlock/HeroBlock.slots.ts
import type { ImageData, CtaData } from '../../types/HeroBlock.types';

export type HeroBlockSlots = {
  media?: (image: ImageData) => React.ReactNode;
  heading?: (title: string, subtitle?: string) => React.ReactNode;
  cta?: (cta: CtaData) => React.ReactNode;
};
```

The base-block uses slots when provided, defaults when not:

```tsx
export function HeroBlock({ content, slots }: HeroBlockProps) {
  return (
    <section aria-labelledby="hero-heading">
      {slots?.media
        ? slots.media(content.image)
        : <DefaultMedia image={content.image} />}
      {slots?.heading
        ? slots.heading(content.title, content.subtitle)
        : <DefaultHeading title={content.title} subtitle={content.subtitle} />}
      {slots?.cta && content.cta
        ? slots.cta(content.cta)
        : content.cta && <DefaultCta cta={content.cta} />}
    </section>
  );
}
```

Slots are optional per block. The planner decides during `/propose` whether a block needs slots. Simple blocks (RichTextBlock, BannerBlock) may have zero slots.

#### 9. Token cascade: global → semantic → brand

Adopted from the DSE reference. **Compatible with Tailwind v3** (DEC-012) and the existing `createhwePreset(tokens)` pipeline.

Three levels of tokens:

| Level | Location | Purpose | Example |
|---|---|---|---|
| Global | `packages/core-ui/src/theme/global.tokens.json` | Platform-wide primitives | `color.teal.600 → #0F6E56` |
| Semantic | Inline in `createhwePreset()` | Maps primitives to roles | `primary → color.teal.600` |
| Brand | `site-{slug}/src/theme/tokens.json` | Client overrides (existing) | `primary → #8B6914` |

The cascade is resolved at **build time** inside `createhwePreset()`, not at runtime. This preserves compatibility with Tailwind v3 and the existing contract:

```ts
// packages/config/src/tailwind-preset.ts (updated)
export function createhwePreset(
  brandTokens: Tokens,
  options?: { globalTokens?: GlobalTokens }
): Partial<Config> {
  // Cascade: brand overrides semantic overrides global
  const resolved = resolveTokenCascade(options?.globalTokens, brandTokens);
  return {
    theme: {
      extend: {
        colors: {
          background: resolved.colors.background.value,
          primary:    resolved.colors.primary.value,
          // ...same shape as today
        },
        // ...rest unchanged
      },
    },
  };
}
```

The existing `TokensContract` (Zod schema) does NOT change shape. The cascade is internal to the preset function. Client `tailwind.config.ts` files continue to work as-is — the `globalTokens` parameter is optional and defaults to the platform global when omitted.

The `globals.css` in each client contains the compiled CSS custom properties from this cascade, plus fonts, animations, and third-party overrides.

#### 10. Composition rules

Adopted from the DSE reference, validated with Zod:

```ts
// packages/core-ui/src/composition-rules/rules.schema.ts
export const CompositionRule = z.object({
  sectionId: z.string(),
  maxPerPage: z.number().optional(),
  position: z.enum(['first', 'last', 'after-navbar']).optional(),
  canFollow: z.array(z.string()).optional(),
  notDirectlyAfter: z.array(z.string()).optional(),
  minimumDistanceBetween: z.number().optional(),
});
```

Used by the planner agent and by a future Payload CMS page builder to validate layouts before render.

#### 11. CSS rules

- **ONE `globals.css` per client** in `src/app/globals.css`.
- Contains: `@font-face`, `:root` token variables, `@keyframes`, third-party widget overrides (THR, Ideta), `@media print`.
- **ZERO CSS files per block.** Blocks use only Tailwind utility classes and CVA recipes.
- The `scaffold-site` template generates a `globals.css` skeleton with commented sections.

### Consequences

- `packages/core-ui/src/blocks/` is renamed to `packages/core-ui/src/base-blocks/`. Schemas move to `schemas/`, types to `types/`.
- `package.json` gains `"exports"` with three subpaths: `.`, `./base-blocks`, `./schemas`.
- BlockRenderer is refactored to accept a client block map that overrides `baseBlockRegistry`.
- `scaffold-block` skill changes: now scaffolds into `base-blocks/` (for platform) or a client repo's `src/blocks/` (for client).
- New template: `scaffold-site` creates a client repo with base-block re-exports, registry, theme, globals.css.
- `apps/site-demo/` gains `src/blocks/` + `registry.ts` to mirror the client repo structure.
- The Phase 1 classification table gains a "Slots?" column.
- Client repos that consume `@hwe/core-ui@<version>` get base-blocks as part of the package — no extra install needed.

### Alternatives considered

- **Keep blocks in core-ui, use only structural variants (DEC-008) for customization** — rejected. Does not scale to 300 clients with unique Figma designs. Pollutes the shared package with single-client variants.
- **Full headless (no base-blocks, every client writes from scratch)** — rejected. Too much duplication. Most clients (~70%) will re-export base-blocks with token changes only.
- **Slots without base-blocks** — rejected. Without a default implementation, every slot must be filled by every client, even for identical renders.
- **Base-blocks consumed via git submodule** — rejected per DEC-011. Submodule operational pain; loses semantic versioning.
- **DSE model (Make + Supabase + AI generation)** — rejected for V1. Elements (token cascade, composition rules, slots) adopted; infrastructure (Make, Supabase) not.
- **Blocks inside `apps/site-{slug}/` in the monorepo** — rejected per DEC-011. Client sites live in independent repos for scalability, developer isolation, and deploy independence.

---

## Part 2 — Migration Plan for Claude Code

> Three phases: **A** (structural changes in the monorepo — explicit, step by step), **B** (systematic sweep of all documentation — grep + conceptual review), **C** (verification).
>
> **Scope:** Phase A and B touch only `hwe-platform/`. Client repos don't exist yet — the `scaffold-site` template (Step A5) defines their structure for when they do.
>
> **Language:** instructions in Spanish (human-AI conversation). All technical artifacts in English (DEC-001).
> **Rule:** no step deletes existing files without creating their replacement first.

### Pre-migration: read context

Before starting, Claude Code must read:
- `CLAUDE.md`
- `docs/contracts/frontend/block-contract.md`
- `docs/contracts/frontend/structure.md`
- `docs/contracts/frontend/theme-tokens.md`
- `docs/specs/frontend/block-architecture.md`
- `docs/architecture/decisions.md` (DEC-008 through DEC-014)

---

## Phase A — Structural changes (explicit, step by step)

These steps create directories, move files, and write new code. Execute in order.

### Step A1 — Append DEC-015 to decisions.md

**File:** `docs/architecture/decisions.md`
**Action:** Append the content of Part 1 of this document as DEC-015, following the format of existing DECs (DEC-001 through DEC-014).

---

### Step A2 — Restructure packages/core-ui

A2.1. Create `packages/core-ui/src/schemas/` directory.
- For each block in `src/blocks/`: move `{Name}Block.schema.ts` → `src/schemas/{Name}Block.schema.ts`.
- If the block has a config schema, move it too.
- Create `src/schemas/index.ts` re-exporting all schemas.

A2.2. Create `packages/core-ui/src/types/` directory.
- For each block: move `{Name}Block.types.ts` → `src/types/{Name}Block.types.ts`.
- Update imports in moved files to reference new schema locations.

A2.3. Rename `packages/core-ui/src/blocks/` → `packages/core-ui/src/base-blocks/`.
- Each block folder keeps: `.tsx`, `.test.tsx`, `.variants.ts`.
- Create `src/base-blocks/index.ts` re-exporting all base-block components.
- Update all internal imports.

A2.4. For `BookingBlock/` (structural variants, DEC-008): preserve `index.ts` resolver, `BookingInline/`, `BookingSticky/` in `base-blocks/BookingBlock/`.

A2.5. Create `packages/core-ui/src/base-blocks/HeroBlock/HeroBlock.slots.ts` as the first slot definition example.

A2.6. Create `packages/core-ui/src/composition-rules/`:
- `rules.schema.ts` — Zod schema for composition rules.
- `validator.ts` — validation function.
- `validator.test.ts` — tests.

A2.7. Update `packages/core-ui/package.json` — add subpath exports:
```json
{
  "exports": {
    ".":              "./src/index.ts",
    "./base-blocks":  "./src/base-blocks/index.ts",
    "./schemas":      "./src/schemas/index.ts"
  }
}
```

A2.8. Update `packages/core-ui/src/index.ts` — the root public API:
- Export primitives, BlockRenderer, providers, theme, layout, composition-rules.
- Export types from `types/`.
- Do NOT export base-blocks from root (they have their own subpath).
- Do NOT export schemas from root (they have their own subpath).

---

### Step A3 — Refactor BlockRenderer

**File:** `packages/core-ui/src/renderer/`

A3.1. Rename `blockRegistry.ts` → `baseBlockRegistry.ts`. Update imports to `../base-blocks/`.

A3.2. Add optional `blocks` prop to `BlockRenderer`:
```tsx
type BlockRendererProps = {
  layout: LayoutBlock[];
  blocks?: Record<string, React.ComponentType<any>>;
};
```

A3.3. Render logic: look up `blocks[type]` first → fall back to `baseBlockRegistry[type]` → dev warning if neither.

A3.4. Update `BlockRenderer.test.tsx`:
- Test rendering with base-blocks only (no client map).
- Test rendering with client blocks overriding one base-block.
- Test fallback when block type is not in either registry.

---

### Step A4 — Migrate apps/site-demo

A4.1. Create `apps/site-demo/src/blocks/`.

A4.2. For each of the 6 existing blocks, create a Level 1 re-export:
```ts
// apps/site-demo/src/blocks/HeroBlock/HeroBlock.tsx
export { HeroBlock } from '@hwe/core-ui/base-blocks';
```

A4.3. Create `apps/site-demo/src/blocks/registry.ts`:
```ts
import { HeroBlock } from './HeroBlock/HeroBlock';
import { BookingBlock } from './BookingBlock/BookingBlock';
import { MediaTextBlock } from './MediaTextBlock/MediaTextBlock';
import { AccommodationGridBlock } from './AccommodationGridBlock/AccommodationGridBlock';
import { AmenitiesBlock } from './AmenitiesBlock/AmenitiesBlock';
import { ReviewsBlock } from './ReviewsBlock/ReviewsBlock';

export const clientBlocks = {
  HeroBlock, BookingBlock, MediaTextBlock,
  AccommodationGridBlock, AmenitiesBlock, ReviewsBlock,
} as const;
```

A4.4. Update `HomeComposition.tsx` and `LeCampingComposition.tsx`:
- Import `clientBlocks` from `../blocks/registry`.
- Pass `blocks={clientBlocks}` to `BlockRenderer`.

A4.5. Update `layout.tsx` if it references BlockRenderer directly.

---

### Step A5 — Create scaffold-site skill

**File:** `.claude/skills/scaffold-site/SKILL.md`

Defines the template for creating a new client repo. The skill creates:
- `src/blocks/` — all base-blocks as Level 1 re-exports
- `src/blocks/registry.ts` — all blocks registered
- `src/primitives/` — empty directory (ready for overrides)
- `src/compositions/` — empty with README
- `src/theme/tokens.json` — template from platform defaults
- `src/app/globals.css` — skeleton with commented sections
- `src/app/layout.tsx` — wired with BlockRenderer + clientBlocks
- `tailwind.config.ts` — extends `@hwe/config` preset
- `client.config.ts` — template with blockDefaults
- `package.json` — depends on `@hwe/core-ui`, `@hwe/config`, `@hwe/booking`

---

## Phase B — Systematic sweep

After Phase A, the code compiles and runs. Phase B ensures ALL documentation, skills, agents, commands, guides, and specs are consistent with DEC-015.

### Step B1 — Automated grep sweep

Run these searches and apply the replacement rules to EVERY match:

```bash
# B1.1 — Old block path in docs and AI config
grep -rn "core-ui/src/blocks/" docs/ .claude/ CLAUDE.md
grep -rn "core-ui/blocks" docs/ .claude/ CLAUDE.md
grep -rn "@hwe/core-ui/blocks" docs/ .claude/
```

**Rules per match:**
- If context describes WHERE reference implementations live → replace with `core-ui/src/base-blocks/`
- If context describes WHERE a client's blocks live → replace with `site-{slug}/src/blocks/`
- If context says "all blocks live in packages/core-ui" → rewrite to explain the split: schemas in core-ui, base-blocks as reference, client blocks in client repo
- If context describes an IMPORT → update to `@hwe/core-ui/base-blocks` or `@hwe/core-ui/schemas` as appropriate

```bash
# B1.2 — Schema paths
grep -rn "blocks/.*\.schema" docs/ .claude/ packages/ apps/
grep -rn "blocks/.*\.types" docs/ .claude/ packages/ apps/
```
**Rule:** Update to `schemas/{Name}Block.schema.ts` and `types/{Name}Block.types.ts`.

```bash
# B1.3 — Token system
grep -rn "tokens\.json" docs/ .claude/
grep -rn "theme-tokens" docs/ .claude/
```
**Rule:** Where text describes the token system, add reference to the cascade. Do not rewrite passing mentions.

```bash
# B1.4 — blockRegistry
grep -rn "blockRegistry" docs/ .claude/ packages/ apps/
```
**Rule:** Update to `baseBlockRegistry` where referring to the platform registry. Note that BlockRenderer now accepts client block map.

```bash
# B1.5 — CSS patterns
grep -rn "\.css" docs/specs/ docs/contracts/ .claude/
```
**Rule:** Ensure `globals.css` rule is mentioned: one per client, zero per block.

```bash
# B1.6 — Orphan check
grep -rn "packages/core-ui/src/blocks" packages/ apps/
```
**Rule:** After Phase A, ZERO results. Any remaining are missed migrations.

---

### Step B2 — Agent review (all 11 agents in `.claude/agents/`)

Read EVERY file. For each agent, check and update:

| Agent | What to check |
|---|---|
| `architect.md` | Package structure, block locations, DECs list (now through DEC-015) |
| `planner.md` | Where to find existing blocks for proposals — now base-blocks + client blocks. How to propose: specify which usage level (1/2/3) |
| `implementer.md` | Where to write code — for platform: `base-blocks/`. For client: `site-{slug}/src/blocks/`. Import paths via subpath exports |
| `reviewer.md` | What paths to review. Slot pattern as valid architecture. Client registry.ts as review target |
| `verifier.md` | Build paths — probably unchanged. Verify subpath exports compile |
| `docs-writer.md` | Catalog format, new terms (base-block, slot, token cascade, composition rules, client block registry) |
| `qa-engineer.md` | Where to find blocks for testing. Base-block tests vs client block tests |
| `security-specialist.md` | Block paths for audits. `globals.css` as audit surface (no CSS per block) |
| `senior-developer.md` | Reference patterns now include `base-blocks/`, `schemas/`, slot pattern |
| `seo-geo-specialist.md` | Block paths for SEO audits. JSON-LD mapping still from schema (unchanged) |
| `ux-ui-analyst.md` | Block paths for Figma comparison. Slot-based blocks as valid pattern |

---

### Step B3 — Skills review (all 13 skills in `.claude/skills/`)

Read EVERY file. For each:

| Skill | What to check |
|---|---|
| `scaffold-block` | **CRITICAL.** Now supports two targets: `--target base` (scaffolds in `base-blocks/`, schema in `schemas/`) and `--target client` (scaffolds in client's `src/blocks/`, imports schema from `@hwe/core-ui/schemas`). Update templates. |
| `scaffold-variant` | References `blocks/` → `base-blocks/` |
| `add-block` | Update paths. Must also update client `registry.ts` when adding to a client |
| `archive` | Catalog and project-map paths |
| `commit` | Probably path-agnostic. Verify |
| `enrich-us` | Architecture context references |
| `import-figma` | Token extraction — mention cascade (global → semantic → brand) |
| `plan-to-stories` | Monorepo structure references |
| `create-page` | Block imports — now from client `registry.ts`, not from `@hwe/core-ui` directly |
| `security-audit` | Scan paths — now includes client `src/blocks/` AND platform `base-blocks/` |
| `security-fix` | Fix paths — same |
| `seo-audit` | Scan paths — same |
| `seo-fix` | Fix paths — same |

---

### Step B4 — Commands review (all 6 in `.claude/commands/`)

Read EVERY file. Check for block path references and update:
- `add-block`, `archive`, `create-page`, `security-audit`, `security-fix`, `seo-fix`

---

### Step B5 — Contracts review (all 5 in `docs/contracts/frontend/`)

| Contract | What to update |
|---|---|
| `block-contract.md` | **CRITICAL.** Add "Block ownership model (DEC-015)" section. Explain: schemas shared via `@hwe/core-ui/schemas`, base-blocks via `@hwe/core-ui/base-blocks`, client blocks in client repo, three usage levels, slot pattern, `registry.ts`. Update folder layout examples. The "What a block is" section says "adding a new block means adding one folder under `packages/core-ui/src/blocks/`" — this needs to distinguish platform blocks (base-blocks) from client blocks. |
| `structure.md` | **CRITICAL.** Update `packages/core-ui/` tree (rename `blocks/` to `base-blocks/`, add `schemas/`, `types/`, `composition-rules/`). Update `apps/site-{slug}/` tree (add `blocks/`, `blocks/registry.ts`, optional `primitives/`). Note that per DEC-011 the `apps/site-{slug}/` tree is also the structure of independent client repos. Update the public API rule to mention subpath exports. Update "What NOT to do" list. |
| `theme-tokens.md` | Add section on token cascade (global → semantic → brand) and how it integrates with `createhwePreset()`. Document `globals.css` rule (one per client, zero per block). Keep existing Tailwind v3 pipeline intact (DEC-012). |
| `template-contract.md` | Templates in base-blocks reference schemas from `@hwe/core-ui/schemas`. Client compositions wrapping templates import blocks from local `src/blocks/`, not from `@hwe/core-ui` directly. Update import examples. |
| `client-composition.md` | **CRITICAL.** The "three layers" table says blocks live in `packages/core-ui/src/blocks/` — update. Compositions now import from `../blocks/` (local registry) and pass `clientBlocks` to BlockRenderer. The table needs a row for "Client Block" (lives in `site-{slug}/src/blocks/`, specific to this client). |

---

### Step B6 — Specs review (all files in `docs/specs/`)

| Area | Files | What to update |
|---|---|---|
| `frontend/` | `block-architecture.md` | **CRITICAL.** §1: schemas shared, implementations client-owned. §2: file structure updated. Add §2.5: slots. §9: registry extended with client block map. §10: promotion gates for slot-based blocks. §11: lifecycle — scaffold targets. Add §13: composition rules. |
| `frontend/` | `coding-standards.md` | Add `globals.css` rule. Update multi-tenant rules (blocks in client repo, not packages). Add anti-pattern: CSS file next to block. Update import grouping for subpath exports. |
| `frontend/` | `frontend-standards.md` | Update file layout summary. Update block contract summary. |
| `seo/` | `semantic-html.md` | Update block path references if any |
| `seo/` | All other SEO specs | Grep for block paths |
| `seo/schemas/` | 11 JSON-LD templates | Probably path-agnostic. Verify |
| `security/` | `security-standards.md` | Update block paths for audit scope |
| `ai/` | `agent-teams-playbook.md` | Update if references block paths or agent instructions |
| `general/` | `base-standards.md` | Verify no block path references |

---

### Step B7 — Guides review (all 5 in `docs/guides/`)

| Guide | What to update |
|---|---|
| `project-map.md` | **CRITICAL.** Full update of monorepo map. Show new core-ui layout. Show client repo structure (per DEC-011 + DEC-015). |
| `first-day-setup.md` | **CRITICAL.** Update "where things live". Explain the split: schemas shared, blocks in client, base-blocks as reference. |
| `daily-workflow.md` | Update "where to work" — platform devs work in `base-blocks/`. Client devs work in `site-{slug}/src/blocks/`. |
| `glossary.md` | Add: `base-block`, `slot`, `token cascade`, `composition rules`, `client block registry`, `subpath export`. |
| `wordpress-to-hwe.md` | Update block analogy: base-blocks are like a starter theme you customize, not a shared plugin. |

---

### Step B8 — Docs skills review (`docs/skills/`)

| Area | Files | What to update |
|---|---|---|
| `frontend/` | `block-creation.md` | **CRITICAL.** Walkthrough must reflect: scaffolding into base-blocks vs client blocks, slot pattern, three usage levels, subpath imports. |
| `frontend/` | `theme-tokens-pipeline.md` | Add token cascade. Update pipeline for global → semantic → brand. |
| `security/` | All 8 audit skill docs | Update block path references. Scope includes client `src/blocks/`. |
| `seo/` | All 7 audit skill docs | Same |

---

### Step B9 — Architecture docs review (`docs/architecture/`)

| File | What to update |
|---|---|
| `architecture.md` | Add DEC-015 banners to affected sections (block system, theme). Do NOT rewrite. |
| `decisions.md` | Already updated in Step A1. Verify DEC-015 appended. |
| `domain-model.md` | Update if block classification rules reference core-ui as only block location. |
| `briefing.md` | Update project structure description if present. |

---

### Step B10 — Plans, diagrams, catalog, README

**Plans** (`docs/plans/`):

| File | What to update |
|---|---|
| `phase-1-design-system/plan.md` | Add "Slots?" column to Classified table. Note base-block vs client-block distinction. |
| `phase-1-design-system/sources/*.md` | Update block path references if any |
| `phase-0/` and `walking-skeleton.md` | Update references to `core-ui/blocks/` → `base-blocks/` |
| `technical-roadmap.md` | Update if describes block architecture |

**Diagrams** (`docs/diagrams/`) — update existing 6 + create 2 new:

| Diagram | Action |
|---|---|
| `monorepo-overview.mmd` | **REWRITE.** Show new core-ui layout (schemas/, base-blocks/, composition-rules/). Show client repo structure. Show npm subpath consumption. |
| `core-ui-internal.mmd` | **REWRITE.** schemas/ as foundation → types/ derived → base-blocks/ using both → renderer/ accepting client block map. |
| `block-variant-resolution.mmd` | Update: client registry → base-block fallback. |
| `page-tetris.mmd` | Update block import source. |
| `figma-to-production.mmd` | Update for scaffold-site flow. |
| `booking-architecture.mmd` | Verify (adapter pattern unchanged). |
| **NEW:** `block-resolution-chain.mmd` | Client registry → baseBlockRegistry → dev warning. |
| **NEW:** `token-cascade.mmd` | global → semantic → brand → globals.css. |

**Other root files:**

| File | What to update |
|---|---|
| `CLAUDE.md` | Add DEC-015 summary. Update "Lo esencial del proyecto" and "Estructura del workspace" sections. Add subpath export convention. |
| `docs/catalog.md` | Add `scaffold-site` skill. Update `scaffold-block` description. Add `composition-rules`. |
| `docs/README.md` | Update if it describes documentation structure. |
| `packages/config/src/tailwind-preset.ts` | Evaluate if cascade requires signature change. If so, add optional `globalTokens` parameter. |

---

## Phase C — Verification

### Step C1 — Code verification

```bash
pnpm -r typecheck    # all packages + apps compile
pnpm -r test         # all tests pass
pnpm -r build        # all builds succeed
```

### Step C2 — Orphan reference check

```bash
# ZERO results — no code imports from old path
grep -rn "packages/core-ui/src/blocks/" packages/ apps/
grep -rn "from.*core-ui/blocks" packages/ apps/

# ZERO results — no docs reference old path without DEC-015 context
grep -rn "core-ui/src/blocks/" docs/ .claude/ CLAUDE.md | grep -v "base-blocks" | grep -v "DEC-015"
```

### Step C3 — Structural verification

```bash
# New directories exist
test -d packages/core-ui/src/schemas && echo "✓ schemas/"
test -d packages/core-ui/src/types && echo "✓ types/"
test -d packages/core-ui/src/base-blocks && echo "✓ base-blocks/"
test -d packages/core-ui/src/composition-rules && echo "✓ composition-rules/"
test -d apps/site-demo/src/blocks && echo "✓ site-demo blocks/"
test -f apps/site-demo/src/blocks/registry.ts && echo "✓ registry.ts"

# Old directory does NOT exist
test ! -d packages/core-ui/src/blocks && echo "✓ old blocks/ removed"

# Subpath exports resolve
node -e "require.resolve('@hwe/core-ui/base-blocks')" && echo "✓ base-blocks subpath"
node -e "require.resolve('@hwe/core-ui/schemas')" && echo "✓ schemas subpath"
```

### Step C4 — Documentation consistency check

```bash
# Every contract mentions DEC-015
grep -l "DEC-015" docs/contracts/frontend/*.md | wc -l
# Expected: 5

# CLAUDE.md mentions DEC-015
grep -c "DEC-015" CLAUDE.md
# Expected: ≥1

# Catalog has scaffold-site
grep -c "scaffold-site" docs/catalog.md
# Expected: ≥1

# decisions.md ends with DEC-015
tail -5 docs/architecture/decisions.md | grep -c "DEC-015"
# Expected: ≥1
```

### Step C5 — Full checklist

```
STRUCTURAL
□ decisions.md has DEC-015, consistent format with DEC-001–DEC-014
□ packages/core-ui/src/schemas/ exists with all block schemas + index.ts
□ packages/core-ui/src/types/ exists with all block types
□ packages/core-ui/src/base-blocks/ exists (renamed from blocks/) + index.ts
□ packages/core-ui/src/base-blocks/HeroBlock/HeroBlock.slots.ts exists
□ packages/core-ui/src/composition-rules/ exists with schema + validator + test
□ packages/core-ui/package.json has "exports" with 3 subpaths
□ packages/core-ui/src/index.ts re-exports (NOT base-blocks, NOT schemas)
□ renderer/baseBlockRegistry.ts imports from base-blocks/
□ BlockRenderer accepts optional blocks prop
□ apps/site-demo/src/blocks/ exists with 6 re-exports + registry.ts
□ HomeComposition.tsx passes clientBlocks to BlockRenderer
□ LeCampingComposition.tsx passes clientBlocks to BlockRenderer
□ Old packages/core-ui/src/blocks/ directory does NOT exist

SKILLS & COMMANDS
□ scaffold-site SKILL.md created
□ scaffold-block SKILL.md supports --target flag
□ ALL 13 skills reviewed and updated
□ ALL 6 commands reviewed and updated

DOCUMENTATION
□ ALL 11 agents reviewed and updated
□ ALL 5 contracts updated
□ ALL specs reviewed (frontend, seo, security, ai, general)
□ ALL 5 guides updated
□ ALL docs/skills reviewed (block-creation, theme-tokens-pipeline, security, seo)
□ ALL architecture docs reviewed
□ ALL plans reviewed
□ 6 existing diagrams updated + 2 new diagrams created
□ CLAUDE.md updated with DEC-015
□ docs/catalog.md updated
□ docs/README.md updated if applicable

VERIFICATION
□ pnpm typecheck → green
□ pnpm test → green
□ pnpm build → green
□ grep orphan check → ZERO results for old paths
□ Subpath exports resolve correctly
□ All technical artifacts in English (DEC-001)
□ No files deleted without replacement
