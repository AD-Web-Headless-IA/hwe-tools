# Frontend standards

> Rules for all frontend code in hwe. Extends [`base-standards.md`](base-standards.md).
> Always loaded into agent context for any frontend task. Short — keep under 200 lines.
> Detailed layout / patterns / examples live in `docs/contracts/frontend/*` — load on demand per `docs/README.md`.

## Stack (non-negotiable)

- **Next.js 15 App Router** with `output: 'export'` (static export). No SSR at runtime.
- **React 19** function components only. No class components.
- **TypeScript strict** (inherited from base-standards).
- **Tailwind v4** with `@theme` directives. No CSS-in-JS, no styled-components, no inline `style={{}}` except for runtime-dynamic values that cannot be expressed as classes.
- **next-intl** for i18n. Every route is wrapped in `[locale]/`.
- **class-variance-authority (cva)** for variants. Every visual variant of a block is a declared CVA recipe.
- **Zod** for validating every block/template `content` payload coming from Payload.
- **Vitest** for unit tests, **Playwright** for E2E.
- **Radix UI primitives via shadcn/ui** for accessible building blocks. Never reinvent (dialog, popover, dropdown).

## File layout

See `docs/contracts/frontend/structure.md` for the full layout. Summary of the binding rules:

- **Three independent repos (DEC-017)**: `hwe-core/` (packages), `hwe-template/` (starter), `site-{slug}/` (client repos). Client repos consume `@hwe/*` via npm. All use `src/`.
- **Three component categories in `hwe-core/packages/core-ui/`** (cannot be mixed in the same folder):
  - `primitives/` — shadcn/Radix atomic UI (Button, Input, Dialog).
  - `base-blocks/` — reference block implementations (DEC-015: renamed from `blocks/`). Each `{Name}Block/` folder holds `{Name}Block.tsx`, `{Name}Block.slots.ts` (if slots needed), `{Name}Block.variants.ts`, `{Name}Block.test.tsx`.
  - `schemas/` — Zod content + config schemas for all blocks (DEC-015: moved out of block folders).
  - `types/` — TypeScript types derived from schemas (DEC-015: moved out of block folders).
  - `templates/` — full page layouts driven by data (AccommodationDetailTemplate).
- **Client sites have their own `src/blocks/`** (`site-{slug}/src/blocks/`) with their block implementations (Level 1 re-exports, Level 2 slot overrides, or Level 3 full custom). A `registry.ts` wires them to `BlockRenderer`.
- **Compositions** live in `site-{slug}/src/compositions/`, NOT in `app/`. Routes are thin wrappers that call a composition.
- **No barrel files** inside packages (only one `index.ts` at the package root that re-exports the public API).
- **Imports**: use the correct `@hwe/core-ui` subpath (DEC-015): `@hwe/core-ui` for primitives/renderer/providers, `@hwe/core-ui/schemas` for Zod schemas + types, `@hwe/core-ui/base-blocks` for reference implementations. Use `@/` for intra-package (alias to `src/`). No deep path imports across packages.

## Block contract (binding)

Detail in `docs/contracts/frontend/block-contract.md`. The rules:

- A block is a function component that accepts `content: ContentType` and optionally `variant: VariantName`.
- The block's `.schema.ts` lives in `hwe-core/packages/core-ui/src/schemas/` and exports a Zod schema for `content`. The block's `.types.ts` (in `types/`) derives the TS type from it (`z.infer`).
- The block's `.variants.ts` exports a CVA recipe. Variants are a fixed set, declared at design time.
- Payload stores `{ type, variant, order, content }` per block instance. **Never layout, colors, or spacing.**
- The `BlockRenderer` (in `hwe-core/packages/core-ui/src/renderer/`) maps `type` to component via `baseBlockRegistry` with an optional client override map (`blocks` prop). Adding a platform block = one row in `baseBlockRegistry` + a base-block implementation in `base-blocks/`. Adding a client block = one entry in the client's `src/blocks/registry.ts` + the implementation in `src/blocks/{Name}/`.

## Template contract (binding)

Detail in `docs/contracts/frontend/template-contract.md`. The rules:

- A template is a function component that accepts `data: TemplateContent`.
- The template's `.schema.ts` is layered: `Base` (required) + `Optional` (well-known optionals the template renders conditionally) + `Sections` (`BlockContent[]` body delegated to BlockRenderer).
- Per-client field extensions go through an exported `extend*` helper. Custom fields rendered either via a `SpecsBlock` in `sections` or via a client-side composition wrapping the template. **Never edit the template per client.**

## Theming

Detail in `docs/contracts/frontend/theme-tokens.md`. The rules:

- Tokens come from `src/theme/tokens.json` (in client repo, exported from Figma Variables).
- `tokens.json` must satisfy the `TokensContract` type from `@hwe/core-ui/src/theme/tokens.contract.ts`. Failing this contract fails the build.
- Tailwind v4: `src/app/globals.css` imports `"tailwindcss"` + `"@hwe/config/theme.css"` and overrides with `@theme { ... }` blocks. No `tailwind.config.ts` + `createhwePreset()` (that was v3).
- CSS custom properties are emitted from tokens — never hardcoded in components.

## Accessibility — WCAG 2.1 AA (binding)

Every reusable block must:

- Use semantic HTML (`<nav>`, `<main>`, `<article>`, `<aside>`, `<button>`). Never `<div onClick>` for actionable elements.
- Provide visible focus states on every interactive element.
- Maintain a single `<h1>` per page; heading hierarchy without skipping levels.
- Require `alt` text on all images at the schema level (Zod refuses empty alt unless `decorative: true`).
- Pass `aria-*` checks: dialogs trap focus, popovers describe themselves, forms label inputs.
- Be keyboard-navigable end-to-end. Tab order matches visual order.
- Respect `prefers-reduced-motion` for animations.

A block without an a11y test in its `.test.tsx` cannot be promoted past `alpha`.

## Internationalization

- Every text rendered by a block comes from `next-intl` or from `content` (Zod-validated). No hardcoded strings in JSX.
- `content` fields that carry text are typed as `z.record(z.string(), z.string())` (locale → text) when the field is multilingual, or as `z.string()` when it is locale-neutral (a URL, a hex color).
- Date and number formatting always through `Intl.*` APIs respecting the active locale.
- RTL support: layout uses logical properties (`ms-*`, `me-*`, `text-start`) — never `ml-*` / `mr-*` / `text-left` for layout.

## Performance

- Images go through `next/image` with `width`, `height`, and `alt`. Never raw `<img>` in production code.
- Fonts are self-hosted via `next/font`. Never load fonts from Google Fonts at runtime.
- Client components are minimized. Default to Server Components; mark `'use client'` only for components that need browser APIs, event handlers, or state.
- No data fetching inside `<Suspense>` boundaries that block initial render of above-the-fold content.
- Bundles audited with `@next/bundle-analyzer` on every PR that touches `apps/*` or `packages/core-ui/`.

## Testing rules specific to frontend

- Visual components have at least: render test, variant rendering test, accessibility test (axe), and one interaction test per documented variant.
- Templates have at least: schema parse test, "renders Base only" test, "renders Base + each Optional" test, "renders sections via BlockRenderer" test.
- E2E tests live in `apps/site-{slug}/tests/e2e/`. Cover the golden path of every public route plus the booking flow.
- No snapshot tests for components — they rot. Test behavior, not markup.

## Anti-patterns specific to frontend (don't)

- Don't import a block, template, or primitive directly by deep path. Use the package's public API.
- Don't put business logic in a block. Blocks render `content`; logic lives in `@hwe/booking`, `@hwe/content`, services, or the composition layer.
- Don't add a prop to a block to satisfy one client. Add a variant, or split into two blocks, or move the logic to a composition.
- Don't create a `useEffect` that fetches data on mount — Server Components or `generateStaticParams` are the answer.
- Don't add `"use client"` higher in the tree than necessary. Each marked component "infects" its subtree.
- Don't ship dead code or commented-out blocks. Delete it; git has the history.
