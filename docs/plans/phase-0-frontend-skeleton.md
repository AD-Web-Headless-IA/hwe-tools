# Phase 0 — Frontend skeleton

> Living plan. Source for `/plan-to-stories` when ready to generate the formal US backlog.
> This is the **bootstrap of the monorepo** — it has no production code yet. Phase 1 (design system classification) depends on this phase being done.

## Goal

Bring the monorepo from "specs only" to "compileable empty skeleton" so all subsequent frontend work has a place to land. By the end of this phase:

- `pnpm install` runs clean at the repo root.
- `pnpm build` and `pnpm test` execute (with zero blocks/templates yet — just the skeleton).
- A developer (or an automated skill like `/scaffold-block`) can add a block and have it compile, lint, and test without any further setup.

## Non-goals

- **Not** implementing any actual block, template, primitive, or composition. Those are Phase 1+ work.
- **Not** wiring Payload schemas. Backend bootstrap is its own phase.
- **Not** designing the domain catalog (block names, template names, search/filter naming). That is a separate domain-modeling session with the agency.
- **Not** publishing packages to a registry. Local pnpm workspaces only.

## References

**Rules (always loaded):**
- [`ai-specs/specs/base-standards.md`](../specs/base-standards.md)
- [`ai-specs/specs/frontend-standards.md`](../specs/frontend-standards.md)
- [`ai-specs/specs/lifecycle.md`](../specs/lifecycle.md)

**How (load on demand per story):**
- [`docs/frontend/structure.md`](../contracts/frontend/structure.md) — the layout to materialize
- [`docs/frontend/theme-tokens.md`](../contracts/frontend/theme-tokens.md) — for the `TokensContract` story
- [`docs/frontend/block-contract.md`](../contracts/frontend/block-contract.md) — for the `BlockRenderer` story
- [`docs/README.md`](../../docs/README.md) — load index

**Constitution (specific sections only):**
- `docs/architecture/architecture.md` sections 6 (Estructura del monorepo), 9 (Sistema de bloques), 14 (Páginas dinámicas).

## Approach

Story-by-story, in dependency order. Each story is implemented with TDD per `base-standards.md`. After each story, the developer commits, and the working tree always passes `pnpm test`.

The story list below is the **proposed decomposition** to feed into `/plan-to-stories`. After enrichment, each becomes a file under `stories/` and the dependency graph is materialized in `stories/INDEX.md`.

## Proposed user stories

### US-001 — Initialize pnpm + Turborepo monorepo

- Root `package.json`, `pnpm-workspace.yaml`, `turbo.json`.
- `apps/*` and `packages/*` as workspace globs.
- Root `tsconfig.base.json` (extended later by each package).
- Root `.gitignore`, `.editorconfig`, `.nvmrc` or `.node-version`.
- `pnpm install` runs clean; `pnpm turbo` is callable.
- **Dependencies:** none. This is the foundation.

### US-002 — Create `@hwp/config` package (shared configs)

- `packages/config/` with sub-exports: `tsconfig`, `eslint`, `tailwind-preset`, `prettier`.
- `tsconfig.base.json` exported under `@hwp/config/tsconfig`.
- ESLint flat config exported under `@hwp/config/eslint` (TS + React + a11y + Tailwind).
- Tailwind preset exported under `@hwp/config/tailwind-preset` — accepts a `Tokens` argument (per `theme-tokens.md`).
- Prettier config exported under `@hwp/config/prettier`.
- **Dependencies:** US-001.

### US-003 — Bootstrap `@hwp/core-ui` package skeleton

- `packages/core-ui/` with `src/`, `package.json`, `tsconfig.json` extending `@hwp/config/tsconfig`.
- Empty `src/base-blocks/`, `src/schemas/`, `src/types/`, `src/templates/`, `src/primitives/`, `src/renderer/`, `src/layout/`, `src/theme/`, `src/composition-rules/` directories (each with a `.gitkeep`). Note: `src/base-blocks/` is the DEC-015 location; older stories may reference `src/blocks/` — update as encountered.
- `src/index.ts` empty but present (the package's only barrel).
- `README.md` describing purpose and lifecycle status (`alpha v0.0.1`).
- **Dependencies:** US-002.

### US-004 — Implement `TokensContract`, `cssVariables` helper, and `useActiveSeason` hook in `@hwp/core-ui/theme/`

- `src/theme/tokens.contract.ts` — Zod schema for tokens. **Discriminated union per DEC-005**: accepts either a single `Tokens` object (default) or a `Record<seasonSlug, Tokens>` (seasonized).
- `src/theme/cssVariables.ts` — typed accessors for CSS custom properties.
- `src/theme/season.ts` — `useActiveSeason()` React hook that reads the `data-season` attribute from the `<html>` tag. Returns `null` when single-theme.
- Tests for `TokensContract` covering: minimal valid single-theme parses; minimal valid seasonized parses; missing required field in either shape fails; mixing single-theme and seasonized keys fails.
- Tests for `useActiveSeason`: returns the season slug when present, null when absent.
- Exported from `src/index.ts`.
- **Dependencies:** US-003.

### US-005 — Implement `BlockRenderer` + `baseBlockRegistry` in `@hwp/core-ui/renderer/`

- `src/renderer/baseBlockRegistry.ts` — empty `baseBlockRegistry` object exported as `const`; `BlockType` derived as `keyof typeof baseBlockRegistry`. (DEC-015: formerly `blockRegistry.ts`)
- `src/renderer/BlockRenderer.tsx` — accepts `layout: BlockInstance[]` + optional `blocks?: Record<string, ComponentType>` (client block map). Merges client blocks on top of `baseBlockRegistry`. Sorts by `order`, parses `content` against registry's `contentSchema`, renders the component.
- Tests covering: empty array renders nothing, unknown block type is skipped silently with a console warning in dev, ordering is respected, schema-invalid content throws (so it's caught at build time).
- Exported from `src/index.ts`.
- **Dependencies:** US-003.

### US-006 — Scaffold a sample block via `/scaffold-block` and prove it round-trips

- Run `/scaffold-block SampleBlock` to validate the skill works against the new skeleton.
- Apply the two manual edits the skill prints (registry + public API).
- Implement a minimal real schema/component/test (replace the `SampleBlock` placeholders).
- Verify `pnpm test` passes and the block renders through `BlockRenderer` with fixture content.
- Once verified, decide whether to keep `SampleBlock` as a doc/example or remove it.
- **Dependencies:** US-005, scaffold-block skill.

### US-007 — Bootstrap `apps/site-hotel-balneario-fuente-de-cabriel/` skeleton

- `apps/site-hotel-balneario-fuente-de-cabriel/` with the structure from `frontend/structure.md`:
  - `src/app/layout.tsx`, `src/app/[locale]/layout.tsx`, `src/app/[locale]/page.tsx` (delegating to a stub composition).
  - `src/compositions/HomeComposition.tsx` (stub — renders a placeholder section).
  - `src/theme/tokens.json` (extracted manually from `docs/clients/hotel-balneario-fuente-de-cabriel/figma-analysis.md` per the interim procedure in `docs/contracts/frontend/theme-tokens.md`, satisfying `TokensContract`). Balneario uses the **single-theme** layout — it does NOT have `hasSeasons` active for v1.
  - `src/theme/tailwind.config.ts` extending `@hwp/config/tailwind-preset` and feeding it `tokens.json`.
  - `client.config.ts` with the tenant config: `type: 'balneario-spa'`, `features: { hasSpa: true, hasRestaurant: true, hasSeasons: false }`, and one entry in `routes.accommodations[]` for casitas rurales (`key: 'casitas-rurales'`, `listingSlug: 'casitas-rurales'`, `detailBaseSlug: 'casitas-rurales'`) — initial guess, confirm with agency before finalizing. Casitas rurales are NOT a feature (no `hasCabins` exists in `domain-model.md §4`); they are an `Accommodation` collection per §6.
  - `next.config.mjs` with `output: 'export'` and i18n config.
  - `public/`, `tests/e2e/` empty.
- `pnpm --filter site-hotel-balneario-fuente-de-cabriel build` produces a static export with the placeholder home page.
- This US validates the **single-theme** path end-to-end. The **seasonized** path (`tokens-{seasonSlug}.json` layout per DEC-005) gets its own validation when the first `residencia-vacacional` client is bootstrapped.
- **Dependencies:** US-002, US-003, US-004.

### US-008 — Wire `@hwp/i18n` minimum (next-intl bootstrap)

- `packages/i18n/` with next-intl middleware config and a placeholder translations table.
- Used by the Balneario app's `[locale]/layout.tsx`.
- Tests for the locale resolver.
- **Dependencies:** US-002.

### US-009 — CI/CD bootstrap

- `.github/workflows/test-core.yml` running `pnpm install && pnpm test` on push to any branch.
- `.github/workflows/build-skeleton.yml` running `pnpm build` on push to main (no deploy yet).
- Both fail-fast on type errors and test failures.
- **Dependencies:** US-001.

## Out of scope explicitly

- Booking adapters, content adapters, AI package, analytics package — separate bootstrap phases each.
- Payload schemas of any kind.
- Per-block CVA recipes, primitives library, or any real visual implementation.
- Deploy to Vercel (handled in a later phase per DEC-007).

## Definition of done for Phase 0

- All 9 stories implemented, each with passing tests.
- The Balneario app builds to `out/` as static HTML.
- A developer running `pnpm install && pnpm test && pnpm build` from the repo root sees a clean, green run.
- The skeleton is small enough that Phase 1 can begin classifying and implementing blocks without rework.

## Decisions log (per session)

- _(none yet — record here as stories are completed if any non-trivial deviation from the plan occurs)_

## Open questions

- Domain catalog of block / template / route names → resolved in a separate domain-modeling session with the agency. Stub names used during Phase 0 (`SampleBlock`, `HomeComposition`) are placeholders.
- Whether to bootstrap `apps/portal-{slug}/` and `apps/admin/` in Phase 0 or defer to a later phase → **defer** (current decision). Phase 0 covers only one site app to validate the full chain end-to-end.
- **Token extraction automation** → US-007 builds `tokens.json` for Balneario **manually** following the interim procedure in [`docs/frontend/theme-tokens.md`](../contracts/frontend/theme-tokens.md#token-extraction--interim-manual-process). After this first pass, evaluate promoting to a `/extract-tokens <slug>` skill (target: before client #3). Decision and skill spec, when ready, get registered in `docs/catalog.md` and documented in a new DEC.
