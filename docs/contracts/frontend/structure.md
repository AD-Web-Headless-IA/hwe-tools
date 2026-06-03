# Frontend file structure

> **How** the React monorepo is laid out. Companion to the rules in [`ai-specs/specs/frontend-standards.md`](../../specs/frontend-standards.md).
> Load this file when scaffolding new packages, new apps, or moving files between layers.
>
> **Naming examples in this document** (`HeroBlock`, `AccommodationDetailTemplate`, `apps/site-hotel-balneario-fuente-de-cabriel`) **are illustrative.** The canonical block / template / route catalog is defined in a separate domain-modeling session — do not treat the names below as the final catalog.

## Monorepo top level

```
hwp-platform/
├── apps/
│   ├── site-{slug}/         ← one per client site
│   ├── portal-{slug}/       ← one per client portal (AI content editing)
│   └── admin/               ← agency-wide admin
│
├── packages/
│   ├── core-ui/             ← @hwp/core-ui — base-blocks, schemas, types, templates, primitives, renderer
│   ├── booking/             ← @hwp/booking — BookingAdapter + PMS adapters
│   ├── content/             ← @hwp/content — ContentRepository + PayloadAdapter
│   ├── analytics/           ← @hwp/analytics — GTM hooks
│   ├── i18n/                ← @hwp/i18n — next-intl config + base translations
│   ├── ai/                  ← @hwp/ai — PHP-proxy client + prompt/agent registry
│   └── config/              ← @hwp/config — tsconfig, eslint, tailwind preset
│
├── docs/architecture/             ← project context (briefing, decisions, user stories...)
├── docs/                ← rules and catalog for AI agents
├── docs/                    ← architecture and how-to docs (this file)
├── docs/plans/                   ← SPECBOOT plans and stories per epic
├── .claude/                 ← Claude Code skills
└── turbo.json, package.json, pnpm-workspace.yaml
```

## Naming summary

| Element | Convention | Example |
|---|---|---|
| Folder | `kebab-case` | `core-ui/`, `client-compositions/` |
| React component file | `PascalCase.tsx` | `HeroBlock.tsx` |
| TS module (non-React) | `camelCase.ts` | `useBooking.ts`, `formatPrice.ts` |
| CVA variant file | `<Component>.variants.ts` | `HeroBlock.variants.ts` |
| Type file (co-located) | `<Component>.types.ts` | `HeroBlock.types.ts` |
| Zod schema file (co-located) | `<Component>.schema.ts` | `HeroBlock.schema.ts` |
| Test file (co-located) | `<Component>.test.tsx` | `HeroBlock.test.tsx` |
| E2E test | `<feature>.spec.ts` in `tests/e2e/` | `booking.spec.ts` |
| Route slug | `kebab-case` | `casas-rurales/` |
| Dynamic param | always `[slug]` | `[slug]/page.tsx` |
| Token file | `tokens.json` | `apps/site-{slug}/src/theme/tokens.json` |
| Package alias | `@hwp/{name}` | `@hwp/core-ui` |
| Intra-package alias | `@/*` → `src/*` | `import { tokens } from '@/theme/tokens'` |

## `packages/core-ui/` layout

```
packages/core-ui/
├── src/
│   ├── primitives/                        ← shadcn/Radix atomic UI (Button, Input, Dialog, ...)
│   │   └── {Name}/
│   │       ├── {Name}.tsx
│   │       ├── {Name}.variants.ts
│   │       ├── {Name}.types.ts
│   │       └── {Name}.test.tsx
│   │
│   ├── base-blocks/                       ← platform page sections (catalog TBD in domain session)
│   │   └── {Name}/
│   │       ├── {Name}.tsx
│   │       ├── {Name}.variants.ts
│   │       ├── {Name}.types.ts
│   │       ├── {Name}.schema.ts           ← Zod schema for `content` (co-located here)
│   │       ├── {Name}.slots.ts            ← typed slot props (optional — Level 2 extensibility)
│   │       └── {Name}.test.tsx
│   │
│   ├── schemas/                           ← canonical schema barrel (re-exports from base-blocks)
│   │   ├── {Name}.schema.ts               ← re-export or standalone schema
│   │   └── index.ts                       ← public schemas barrel (@hwp/core-ui/schemas)
│   │
│   ├── types/                             ← shared TS types not tied to a single block
│   │   └── index.ts
│   │
│   ├── templates/                         ← data-driven page layouts (catalog TBD)
│   │   └── {Name}/
│   │       ├── {Name}.tsx
│   │       ├── {Name}.variants.ts
│   │       ├── {Name}.types.ts
│   │       ├── {Name}.schema.ts
│   │       └── {Name}.test.tsx
│   │
│   ├── renderer/                          ← Payload-to-component bridge
│   │   ├── BlockRenderer.tsx
│   │   ├── baseBlockRegistry.ts           ← Record<BlockType, { component, contentSchema, variants? }>
│   │   └── BlockRenderer.test.tsx
│   │
│   ├── composition-rules/                 ← composition validation helpers (optional)
│   │
│   ├── providers/                         ← React context providers (cross-cutting)
│   │   ├── TenantProvider.tsx             ← exposes client.config via useTenant()
│   │   ├── SeasonProvider.tsx             ← resolves active season via useActiveSeason()
│   │   └── index.ts                       ← re-exports providers + hooks
│   │
│   ├── layout/                            ← generic page scaffolding
│   │   ├── SiteShell.tsx                  ← Navbar + main + Footer container
│   │   ├── Navbar/
│   │   └── Footer/
│   │
│   ├── theme/                             ← token contract (not values)
│   │   ├── tailwind-preset.ts
│   │   ├── tokens.contract.ts             ← TS type any tokens.json must satisfy
│   │   └── cssVariables.ts                ← helpers to emit CSS custom properties
│   │
│   └── index.ts                           ← package public API (renderer, providers, primitives, layout — NOT blocks)
│
├── package.json                           ← includes subpath exports: "./base-blocks", "./schemas"
├── tsconfig.json
└── README.md
```

### Public API rule

`src/index.ts` exports the renderer, providers, primitives, and layout. **Blocks are not exported from the root.** Use the dedicated subpath exports:

```ts
// Good — use subpath exports for blocks and schemas
import { HeroBlock }      from '@hwp/core-ui/base-blocks';
import type { HeroContent } from '@hwp/core-ui/schemas';
import { BlockRenderer }  from '@hwp/core-ui';

// Forbidden — root no longer exports blocks
import { HeroBlock } from '@hwp/core-ui';

// Forbidden — deep imports
import { HeroBlock } from '@hwp/core-ui/base-blocks/HeroBlock/HeroBlock';
```

The `package.json` subpath exports map:

```json
{
  "exports": {
    ".":             "./src/index.ts",
    "./base-blocks": "./src/base-blocks/index.ts",
    "./schemas":     "./src/schemas/index.ts"
  }
}
```

This keeps the surface auditable (one file lists everything we promise per subpath) and lets us reorganize internal folders without breaking consumers.

## `apps/site-{slug}/` layout

> **Note (DEC-011):** The `apps/site-{slug}/` structure below is also the canonical structure for **independent client repos**. When a client project lives outside the monorepo, its `src/` structure mirrors this exactly. The only difference is that cross-package imports use published npm versions of `@hwp/*` rather than workspace references.

```
apps/site-{slug}/
├── src/
│   ├── app/                               ← Next.js App Router
│   │   ├── layout.tsx                     ← root layout (html/body only)
│   │   ├── [locale]/
│   │   │   ├── layout.tsx                 ← NextIntlClientProvider + SiteShell
│   │   │   ├── page.tsx                   ← home → HomeComposition
│   │   │   └── {route}/
│   │   │       ├── page.tsx
│   │   │       └── [slug]/page.tsx        ← dynamic page (uses a template)
│   │   ├── globals.css                    ← ONE globals.css per client — @theme directives + fonts
│   │   ├── sitemap.ts                     ← generated from Payload
│   │   └── robots.ts
│   │
│   ├── blocks/                            ← Client blocks (Level 1 re-exports + Level 2/3 custom)
│   │   ├── registry.ts                    ← Record<string, ComponentType> — passed to BlockRenderer as `blocks` prop
│   │   ├── {CustomName}/                  ← Level 3 full-custom block (same 5-file layout as base-blocks)
│   │   │   ├── {CustomName}.tsx
│   │   │   ├── {CustomName}.variants.ts
│   │   │   ├── {CustomName}.types.ts
│   │   │   ├── {CustomName}.schema.ts
│   │   │   └── {CustomName}.test.tsx
│   │   └── (Level 1 re-exports are declared directly in registry.ts — no subfolder needed)
│   │
│   ├── compositions/                      ← Client Compositions (one per static page)
│   │   ├── HomeComposition.tsx
│   │   └── ContactComposition.tsx
│   │
│   ├── primitives/                        ← Client-only primitives (optional — use sparingly)
│   │
│   ├── theme/
│   │   ├── tokens.json                    ← exported from Figma Variables
│   │   └── tailwind.config.ts             ← extends @hwp/config preset + applies tokens
│   │
│   ├── content/                           ← static content not editable via CMS
│   │   ├── es.json
│   │   ├── en.json
│   │   └── fr.json
│   │
│   └── lib/                               ← client-only utilities (empty by default)
│
├── payload/                               ← Payload schemas for THIS client
│   └── schemas/
│       └── {collection}.ts                ← extends base schema from @hwp/content
│
├── public/
│   ├── brand/                             ← logo, favicon, og-image
│   └── fonts/                             ← only if self-hosted
│
├── tests/
│   └── e2e/                               ← Playwright
│
├── client.config.ts                       ← single source of truth for tenant config
├── next.config.mjs                        ← output: 'export', i18n config
├── package.json
└── tsconfig.json
```

### Why `src/` in apps too

Uniform with `packages/*/src/`. A monorepo-wide find/codemod uses one pattern (`{apps,packages}/*/src/**`), not two. Config files (`next.config.mjs`, `tsconfig.json`, `tailwind.config.ts`) sit at the app root, visually separate from source.

### Pages are thin

`app/[locale]/page.tsx` does data fetching only, then delegates to a composition:

```tsx
// apps/site-{slug}/src/app/[locale]/page.tsx
import { HomeComposition } from '@/compositions/HomeComposition';
import { contentRepository } from '@/lib/repositories';

export default async function HomePage({ params }: { params: { locale: string } }) {
  const data = await contentRepository.getHomePage('{tenant-id}', params.locale);
  return <HomeComposition data={data} />;
}
```

Compositions are pure (data in, JSX out). They can be tested without booting Next.

## `packages/` siblings (booking, content, analytics, i18n, ai, config)

Same shape as core-ui:

```
packages/{name}/
├── src/
│   ├── index.ts                           ← public API
│   └── ...
├── tests/                                 ← only if tests are not co-located
├── package.json
├── tsconfig.json
└── README.md
```

Each package has a `README.md` describing: purpose, public API, key types, usage example, lifecycle stage.

## Imports

- Cross-package (renderer, providers, primitives): `import { BlockRenderer } from '@hwp/core-ui'`.
- Cross-package (blocks): `import { HeroBlock } from '@hwp/core-ui/base-blocks'`.
- Cross-package (schemas only): `import { HeroContent } from '@hwp/core-ui/schemas'`.
- Intra-package: `import { x } from '@/utils/x'` (alias `@/*` → `src/*`).
- Never: `import { x } from '@hwp/core-ui/src/base-blocks/HeroBlock/HeroBlock'` (deep imports forbidden).
- Never: `import { x } from '../../../../packages/core-ui/...'` (relative paths across packages forbidden).

## Workspace and tooling

- **pnpm** + **Turborepo**. `pnpm-workspace.yaml` lists `apps/*` and `packages/*`.
- **TypeScript project references** via `tsconfig.base.json` in `@hwp/config`. Each package's `tsconfig.json` extends it.
- **ESLint** config in `@hwp/config` exported as `@hwp/config/eslint`. Each package extends it.
- **Tailwind preset** in `@hwp/config` exported as `@hwp/config/tailwind-preset`. Each app's `tailwind.config.ts` extends it.

## What NOT to do

- Don't create a flat `blocks/` directory with sibling `.tsx`, `.variants.ts`, `.test.tsx` files. Always folder-per-component.
- Don't add an `index.ts` to every folder inside a package. Only the package root (and the subpath export roots `base-blocks/index.ts`, `schemas/index.ts`) have one. **One controlled exception:** a block with structural variants ([DEC-008](../../architecture/decisions.md#dec-008--structural-variants-for-complex-blocks)) MUST have an `index.ts` at the block's root because that file is the **variant resolver**, not a barrel re-export. See [`block-contract.md`](./block-contract.md) §Structural variants. The public API rule is unchanged — consumers still import from `@hwp/core-ui/base-blocks`.
- Don't put two component categories (primitives + base-blocks, base-blocks + templates) in the same folder.
- Don't put compositions inside `app/`. They live in `src/compositions/`.
- Don't add per-client logic inside `packages/core-ui/`. That belongs in `apps/site-{slug}/src/compositions/` or in `client.config.ts`.
- Don't import block components from `@hwp/core-ui` root — use the `@hwp/core-ui/base-blocks` subpath. The root no longer exports blocks as of DEC-015.
- Don't add a `globals.css` per block. There is exactly ONE `globals.css` per client, located at `src/app/globals.css`.
