# HWP — Decision Log

---

## DEC-001 — SPECBOOT skill format adopted from Septeo boilerplate
**Date:** 2026-05-15
**Status:** Accepted

### Context

We started building tooling skills directly in `.claude/commands/*.md` as narrative prose, without frontmatter, without sub-agent delegation, and without a formal lifecycle. After analyzing the `Septeo-ES/hospitality-ai-boilerplate` reference repo, we found a mature pattern we should adopt before writing more features.

### Decision

Adopt the boilerplate's SKILL.md format for all reusable HWP tooling:

- **Location:** `.claude/skills/{name}/SKILL.md` plus supporting `*.md` files in the same folder.
- **Frontmatter:** `name`, `description`, `argument-hint`, `allowed-tools`. The `allowed-tools` field is mandatory and constrains the tool surface for each skill.
- **Structure:** Role / Constraints / Process / Examples / Refusal cases.
- **Sub-agents:** Use the `Task` tool to spawn one sub-agent per atomic unit of work (e.g. one story enrichment, one repo analysis). Each sub-agent gets a clean context window.
- **Pipeline pattern:** Map-reduce for batch work — Phase 1 extracts/decomposes, Phase 2 enriches per item.
- **Output structure:** Enriched stories live under `docs/plans/{epic-name}/stories/US-{NNN}-{slug}.md`.
- **Catalog:** Every reusable component (skill, agent, MCP, workflow) MUST be registered in `docs/catalog.md`.
- **Lifecycle:** Every new component starts as `alpha`. Promotion to `beta` / `stable` requires explicit criteria (TBD in `docs/specs/general/lifecycle.md`).

### Language convention

Technical artifacts (skills, agents, user stories, code, tests, commits, catalog, ai-specs) are written in **English only**. Business artifacts (client briefings, brand guidelines, site copy) remain in their natural language. Human-AI conversation remains in Spanish.

### Bootstrap scope

Created during DEC-001:
- `.claude/skills/enrich-us/` — single story enrichment.
- `.claude/skills/plan-to-stories/` — map-reduce pipeline plan → enriched stories.
- `.claude/skills/import-figma/` — clone a Figma Make repo and write provisional client context.
- `docs/catalog.md` — component registry.
- `docs/plans/README.md` — directory layout convention.

Deferred to future User Stories (Step 0b):
- US-002 — Add Context7 MCP to `.claude/settings.json`.
- US-003 — Define `docs/specs/general/base-standards.md` for HWP.
- US-004 — Define `docs/specs/frontend/frontend-standards.md`.
- US-005 — Define `docs/specs/backend-standards.md`.
- US-006 — Create agent templates for the 5 HWP product agents.
- US-007 — Define component lifecycle (`alpha → beta → stable`) adapted to HWP.

### Consequences

- All future tooling work goes through `/plan-to-stories` (for plans) or `/enrich-us` (for one-off stories).
- The previous `.claude/commands/import-figma.md` was removed — replaced by `.claude/skills/import-figma/SKILL.md`.
- `docs/clients/{slug}/figma-notes.md` is the provisional location for client visual context until `site-{slug}/` repos exist; then it moves to `site-{slug}/docs/architecture/figma-notes.md`.

### Alternatives considered

- **Keep narrative prose in `.claude/commands/`** — rejected because it has no frontmatter (no `allowed-tools` security boundary), no sub-agent pattern (pollutes main context), and no enforced output structure.
- **Bootstrap full Septeo boilerplate (agents, MCP, n8n)** — rejected because the bootstrap should be minimal; everything beyond skills enters as enriched User Stories in Step 0b.
- **Spanish for technical artifacts** — rejected. Claude performs measurably better on English technical reasoning; mixing identifiers (`getRooms` next to `obtenerHabitaciones`) breaks consistency; ecosystem (npm, Stack Overflow, error messages) is English-first.

---

## DEC-002 — One Figma Make repo per client, tagged per import
**Date:** 2026-05-18
**Status:** Accepted

### Context

We had a single `figma-make/` directory at the workspace root, holding the cloned Figma Make export of Hotel Balneario Fuente de Cabriel. With 300 clients planned and the same designer-export → developer-rebuild loop repeated every time the designer ships a new revision, that layout has two problems:

1. **No isolation between clients** — re-running `/import-figma` for a second client would either overwrite the first or require ad-hoc renaming.
2. **No history of past imports** — when the designer re-exports, the old reference is lost. We can't `git diff` between "what they shipped in May" and "what they shipped in October" to understand what changed visually.

### Decision

Adopt a fixed layout:

```
C:\laragon\www\Hospitality Web Platform\
├── hwp-platform\                           ← the platform repo (this one)
└── figma-makes\                            ← plain container, NOT a git repo
    ├── hotel-balneario-fuente-de-cabriel\  ← own .git, clone of designer's repo
    ├── camping-sol\                        ← own .git, clone of designer's repo
    └── {slug}\                             ← one folder per client
```

- One git repo per client at `figma-makes/{slug}/`, with its own `.git/`, independent from `hwp-platform/`.
- Every import (initial clone or subsequent re-import) is sealed with `git tag import-YYYY-MM-DD`. Re-imports run `git pull --ff-only` against the same origin — never `rm -rf` + re-clone, so history is preserved.
- Generated artifacts (`figma-analysis.md`, `figma-notes.md`) live under `hwp-platform/docs/clients/{slug}/`, NOT inside the cloned repo. This keeps `figma-makes/{slug}/` pristine and avoids untracked-file noise on future `git pull`.
- The `figma-makes/` container is a sibling of `hwp-platform/` — outside it on purpose, so it never contaminates the platform repo.

### Why

- **Isolation** — second client never touches the first; nothing to reconcile manually.
- **History for free** — `git log` + tags inside each client repo give us a complete, navigable record of every export. `git checkout import-2026-05-18` reproduces any past state exactly.
- **No duplication** — preferred Option A (tags) over Option B (snapshots in dated subdirectories) because tags are zero-byte, queryable with standard git tooling, and don't bloat disk usage when a single client gets re-exported 20 times.
- **No nested git** — `figma-makes/` is not a git repo. If it were, every client's `.git/` would become a submodule, which is operational overhead we don't want.

### Migration applied today

- Moved `figma-make/` → `figma-makes/hotel-balneario-fuente-de-cabriel/` (preserved the original `.git/`).
- Moved `ANALYSIS.md` → `hwp-platform/docs/clients/hotel-balneario-fuente-de-cabriel/figma-analysis.md`.
- Created tag `import-2026-05-18` on the relocated repo.
- Updated `.claude/skills/import-figma/SKILL.md` to use the new layout, support re-imports via `git pull` + new tag, and write analysis/notes under `docs/clients/{slug}/`.
- Updated `docs/docs/plans/phase-1-design-system/plan.md` references.

### Alternatives considered

- **Snapshot subdirectories per import (`{slug}/YYYY-MM-DD/`)** — rejected. Duplicates files on every import, bloats disk, breaks the "this is the designer's repo with upstream" mental model.
- **Keep one `figma-make/` and rename on each client** — rejected. Lossy, manual, and `/import-figma` would have to be a destructive operation.
- **Nest `figma-makes/` inside `hwp-platform/`** — rejected. The cloned repos would be nested git repos relative to the platform repo, which means either ignoring them via `.gitignore` (so they're invisible from the platform's POV anyway) or adopting them as submodules (overhead for no benefit, since they're third-party design references, not platform code).

### Consequences

- `/import-figma <git-url> [slug]` is now the only way to bring in or refresh a client's Figma Make export.
- Devs querying "what did the designer ship for client X on date Y" run `git -C figma-makes/{slug} checkout import-YYYY-MM-DD`.
- When `site-{slug}/` repos are created (per architecture roadmap), `figma-makes/{slug}/` stays where it is — it's a separate concern from the deployable site repo.

---

## DEC-003 — Frontend layout, naming conventions, and docs split for token amortization
**Date:** 2026-05-18
**Status:** Accepted

### Context

We were ready to start implementing `@hwp/core-ui` and the first client site, but the architecture (`docs/architecture/architecture.md`) defines only the high-level monorepo shape and the block system principles — not the React file layout, naming conventions, or where validation schemas live. Without these settled and written down, every Claude Code session would re-derive them from `architecture.md` (4.224 lines, ~50k tokens), and they would drift across the 300 sites planned.

Two problems to solve together:

1. **Pick the conventions** (file structure, naming, schema location).
2. **Make them cheap to load** for any future automated session — a sub-agent scaffolding a single block must not need 50k tokens of context.

### Decision

#### Conventions (the structural choices)

1. **Folder per component** inside `packages/core-ui/src/blocks/{Name}/` (and `templates/`, `primitives/`). Each folder holds `{Name}.tsx`, `{Name}.variants.ts`, `{Name}.types.ts`, `{Name}.schema.ts`, `{Name}.test.tsx`. One folder = one atomic unit.
2. **Zod schemas co-located with their block/template** inside `core-ui`. The block owns its content contract. `core-ui` depends on `zod`. Payload field configs are derived from these schemas, not the reverse, so there is one source of truth.
3. **`src/` inside every `apps/site-{slug}/`** — so the apps layout matches the packages layout. Cross-monorepo scripts and codemods use a single pattern (`apps/*/src/**`, `packages/*/src/**`).
4. **Client compositions in `apps/site-{slug}/src/compositions/`**, separate from `app/`. Routes (`app/[locale]/page.tsx`) are thin wrappers that import a composition. Compositions are testable in isolation and reusable across routes.

Naming summary: folders kebab-case, React components PascalCase, hooks/utils camelCase, dynamic route param always `[slug]`, no internal barrels (only one `index.ts` at each package root), cross-package imports via `@hwp/...`, intra-package via `@/` alias to `src/`.

#### Page template flexibility

A template's schema is a 3-layer contract: `Base` (required for every instance) + `Optional` (well-known fields the template knows how to render conditionally) + `Sections` (flexible `BlockContent[]` body). Per-client extensions use an exported `extend*` helper inside the template. This lets one `AccommodationDetailTemplate` serve a 1-bedroom apartment and a spa suite without branching by client.

#### Docs split for token amortization

`docs/architecture/architecture.md` stays as the constitution but does NOT get loaded by per-task agents. Frontend specifics live in:

```
docs/
├── README.md                         ← index: which docs to load per task type
├── architecture.md                    ← constitution (unchanged, only a short pointer added)
└── frontend/
    ├── structure.md                  ← React layout, naming, src/, compositions
    ├── block-contract.md             ← block schema + variants + BlockRenderer
    ├── template-contract.md          ← Base + Optional + Sections + extend()
    ├── theme-tokens.md               ← tokens.json → tailwind-preset
    └── client-composition.md         ← composition vs template vs block
```

And rules (always loaded, short) live in:

```
docs/specs/
├── base-standards.md                 ← TS strict, Zod, TDD, English, Conventional Commits
├── frontend-standards.md             ← React/Next/Tailwind/a11y/i18n rules
└── lifecycle.md                      ← alpha → beta → stable → deprecated → archived
```

`docs/README.md` is the index that maps task type → minimal doc set to load. Example: scaffolding a new block loads only `base-standards.md` + `frontend-standards.md` + `frontend/block-contract.md` (≈1.5k tokens). Loading `architecture.md` whole drops from a 50k-token operation to a < 2k-token operation — roughly **30× reduction** per agent invocation.

### Why

- **Folder per component** is what automation thrives on: scaffolding clones a folder template, validators check "every block has all 5 files", sub-agents read one folder to understand a unit.
- **Schemas in core-ui** means the block is one atomic unit and the Payload schema is generated FROM the Zod schema, not the other way around. No drift.
- **`src/` in apps** — uniform layout between apps and packages. Cross-repo scripts have one pattern, not two.
- **Compositions separate from `app/`** — predictable in 300 sites: every route has a matching composition, every composition is testable.
- **Docs split** — at scale, the dominant cost of automation is context per agent invocation. Loading less = faster, cheaper, more accurate (less noise for the model).

### Alternatives considered

- **Flat files in `blocks/`** (instead of folders) — rejected. With 20+ blocks the directory becomes noise; co-located variants/schemas/tests get spread.
- **Schemas in `@hwp/content`** — rejected. Splits a block across two packages; creates a "which is the source of truth?" question for automation; sub-agents need to read two folders to understand one block.
- **No `src/` in apps** (Next.js default) — rejected. Diverges from packages convention; mixes source and config at app root.
- **Compositions inline in `page.tsx`** — rejected. Couples routing to view assembly, hard to test, doesn't reuse across routes.
- **Compositions under `app/[locale]/_compositions/`** — rejected. Mixes routing with view code; sharing across nesting levels gets awkward.
- **Frontend layout dumped into `architecture.md`** — rejected. Worsens the token-amortization problem instead of solving it.

### Consequences

- Phase 0 of frontend work creates the rules and docs (8 files) BEFORE any TypeScript exists. Phase 0.5 adds a `/scaffold-block` skill that materializes the folder-per-component convention. Phase 1 of design system (already planned) consumes these.
- Every future Claude Code session loads `docs/specs/general/base-standards.md` + `docs/specs/frontend/frontend-standards.md` as system context (always). Task-specific docs are loaded on demand per `docs/README.md`.
- `docs/architecture/architecture.md` gets a short pointer subsection. Its prose body is not edited beyond that — the constitution is stable.
- DEC-001 deferred items US-003, US-004, US-007 are **closed by this DEC**:
  - **US-003** (base-standards) → `docs/specs/general/base-standards.md`
  - **US-004** (frontend-standards) → `docs/specs/frontend/frontend-standards.md`
  - **US-007** (component lifecycle) → `docs/specs/general/lifecycle.md`

---

## DEC-004 — Epic plans split into methodology (`plan.md`) and per-input tracking (`sources/{slug}.md`)
**Date:** 2026-05-18
**Status:** Accepted

### Context

While working on `docs/docs/plans/phase-1-design-system/plan.md`, the file was mixing two concerns:

1. **Methodology** — generic across all clients and reusable: the loop (propose / discuss / decide / build), the three classification categories (Atomic Block / Page Template / Client Composition), the cumulative table of decisions.
2. **Per-source catalog** — specific to one input: the list of 11 blocks and 10 pages of Hotel Balneario Fuente de Cabriel to classify.

Mixing them meant that every new Figma Make import would force editing `plan.md` to append its blocks and pages. With 300 clients planned, that does not scale — the plan would become an index, not a methodology document.

### Decision

For any epic whose work is fed by **multiple discrete inputs that each need their own progress tracking**, split the epic folder:

```
docs/plans/{epic-name}/
├── plan.md                   ← methodology only — generic, stable across inputs
├── sources/                  ← one file per input feeding the epic
│   └── {slug}.md             ← pending items + per-source notes for that input
└── stories/                  ← (existing convention) output of /plan-to-stories
    └── US-{NNN}-{slug}.md
```

Rules:

- `plan.md` describes **how we work** on this epic. It references inputs abstractly and lists outcomes (e.g. cumulative classification table) but never inlines a per-input checklist.
- `sources/{slug}.md` describes **what is pending for one specific input**. Per-source notes, open questions, and the checkbox progress for that input live here.
- `plan.md` keeps an index table **Sources processed** with one row per input, linking to its `sources/{slug}.md`.
- When the same module appears in two sources (e.g. two clients both ship a "hero with booking bar"), the classification decision is made **once** and recorded in the cumulative table in `plan.md`. The second source just references the existing decision.

Epics with a single input or no per-input state worth tracking skip the `sources/` folder entirely.

### Why

- **Scales linearly.** Adding a new input adds one file in `sources/` — never edits `plan.md`.
- **Methodology stays stable.** A `plan.md` that says "this is how we classify" is reusable for the next epic of the same kind.
- **Per-source review is isolated.** When working on input A, only `plan.md` + `sources/A.md` are loaded — agents do not see the noise of other sources.
- **Aligns with the same token-amortization principle as DEC-003** — small, focused files loaded on demand.

### Migration applied today

- Rewrote `docs/docs/plans/phase-1-design-system/plan.md` as methodology-only (removed the per-source "Pending classification" lists).
- Created `docs/docs/plans/phase-1-design-system/sources/hotel-balneario-fuente-de-cabriel.md` with the original per-source checklist plus source-specific notes.
- Updated `docs/plans/README.md` to document the optional `sources/` subfolder and when to use it.

### Alternatives considered

- **Keep one `plan.md` per epic** — rejected. Forces editing the plan for every new input. Does not scale.
- **One folder per input, no shared `plan.md`** — rejected. Loses the "how we work on this epic" abstraction. Each input would re-invent the methodology.
- **Per-input checklist inside `figma-analysis.md`** (the auto-generated client file) — rejected. That file is auto-regenerated by `/import-figma` and marked "do not edit manually". Mixing manual classification state with auto-generated analysis is fragile.

### Consequences

- All current and future epics with multiple inputs follow this layout.
- `/plan-to-stories` continues to read `plan.md` as the source plan. The per-source files are not consumed by `/plan-to-stories` directly — they are working documents for the human + Claude classification loop.
- When the phase-1 classification work begins, decisions go into the cumulative table in `plan.md` and the per-source checkbox in `sources/{slug}.md` is ticked off.

---

## DEC-005 — Per-season theme tokens for clients with `hasSeasons`
**Date:** 2026-05-18
**Status:** Accepted
**Amends:** the single-`tokens.json` assumption used in `docs/contracts/frontend/theme-tokens.md` (the assumption was introduced alongside DEC-003 but is not part of that DEC's binding decisions; this DEC narrows the gap).

### Context

The seasonality model introduced in `docs/architecture/domain-model.md` v0.2 §8 says: clients with the `hasSeasons` feature can have N seasons (`winter`, `summer`, `christmas`, `easter`, custom), and each season can swap **tokens of color** in addition to content, images, and routes.

The current theming pipeline assumes exactly one `tokens.json` per client at `apps/site-{slug}/src/theme/tokens.json`. That assumption breaks for any seasonized client.

### Decision

For clients with `hasSeasons` active, tokens become **one file per season**:

```
apps/site-{slug}/src/theme/
├── tokens-{seasonSlug}.json     ← one per season declared by the client
└── tailwind.config.ts           ← reads all N, produces N themes
```

For clients without `hasSeasons` (the default — 90%+ of the customer base today), the file remains a single `tokens.json`. The build pipeline detects which mode applies by inspecting the presence of `tokens-*.json` vs `tokens.json` files — clients pick one shape and stick to it.

The `TokensContract` Zod schema (in `@hwp/core-ui/src/theme/tokens.contract.ts`) accepts either:
- A single `Tokens` object (legacy, default), OR
- A `Record<seasonSlug, Tokens>` keyed by the season's `slug` field.

The `createHwpPreset()` helper in `@hwp/config/tailwind-preset` accepts either and produces either a single Tailwind theme or N themes accessible via the `data-season` HTML attribute (e.g. `[data-season="winter"]` selectors override the base).

### Why

- Seasonality is a feature, not a global concern — most clients should not pay the complexity cost. A conditional shape preserves the simple case.
- Per-season files match how the agency thinks about the client's themes — the designer exports winter and summer as separate Figma variable sets.
- `data-season` scoping at runtime means we ship one CSS bundle per build (no extra builds per season); the active season is decided server-side and emitted on the `<html>` tag.

### Implementation impact

- `docs/contracts/frontend/theme-tokens.md` updated to describe both the single-theme and seasonized layouts.
- `TokensContract` becomes a discriminated union — implemented during Phase 0 US-004.
- `createHwpPreset()` returns a Tailwind config whose `theme.extend` includes per-season overrides via `:where([data-season="..."])` selectors when given the seasonized input — implemented during Phase 0 US-002.
- Phase 0 US-007 (Balneario bootstrap) probably uses the single-`tokens.json` form (Balneario does not currently declare `hasSeasons`). The first seasonized client validates the multi-file path.

### Alternatives considered

- **Single tokens file with a `seasons` key inside** (`{ default: {...}, winter: {...}, summer: {...} }`) — rejected. The designer exports per-season files from Figma independently; merging them into one inflates churn and complicates diffs.
- **One Tailwind build per season** (multiple CSS bundles, the server serves the right one) — rejected for v1. Triples build time and CDN cost for a feature only a fraction of clients need. `data-season` scoping covers v1 needs at zero extra build cost.
- **Token swap via CSS-in-JS at runtime** — rejected. We use Tailwind v4 + static export; runtime swapping breaks the cache story and adds bundle weight.

### Consequences

- DEC-003's premise of "a single `tokens.json` per client" no longer holds for seasonized clients. DEC-003 itself stands — its structural decisions about folder layout and schema location are unaffected.
- `theme-tokens.md` is the source of truth for the per-season file convention.
- When a client adds `hasSeasons` after launch, migration is: rename `tokens.json` → `tokens-{defaultSeasonSlug}.json`, add the additional season files, rebuild.

---

## DEC-006 — Testing toolchain: Vitest + Playwright + Testing Library
**Date:** 2026-05-20
**Status:** Accepted

### Context

`docs/specs/general/base-standards.md` mandates TDD and per-layer coverage thresholds (booking > 90%, content > 90%, blocks > 80%, templates > 70%, glue > 60%), but never names the runner. The two existing skill prompts (`.claude/skills/enrich-us/phase-2-enrich-story.md` and `.claude/skills/plan-to-stories/phase-2-enrich-story.md`) silently assumed **Jest for unit/integration + Playwright for E2E**. That assumption was never decided — Phase 0 US-001 is about to bootstrap the monorepo and the runner choice cannot be deferred any longer.

The stack is Next.js 14 (App Router, static export), Turborepo, pnpm workspaces, TypeScript strict, Tailwind, Zod. The choice has to match this stack and the SPECBOOT TDD cadence.

### Decision

The HWP testing toolchain is:

| Concern | Tool | Notes |
|---|---|---|
| Unit + integration (TS, React) | **Vitest** | Same `vite` pipeline used by all packages; native ESM; jest-compatible API |
| React component testing | **@testing-library/react** + `@testing-library/user-event` | DOM assertions; behavior-focused (matches the `base-standards.md` "test names describe behavior" rule) |
| Accessibility assertions | **vitest-axe** (Vitest-native binding for `axe-core`) | Required for `core-ui` blocks per `lifecycle.md` "beta → stable" gate |
| E2E (browser) | **Playwright** | Cross-browser (Chromium / Firefox / WebKit); first-class trace viewer; integrated with Next.js test fixtures |
| Visual regression (when needed) | **Playwright snapshots** | Native to Playwright; no extra service. Per-block on demand, not by default. |
| Mocks of external HTTP APIs | **msw** (Mock Service Worker) | Same intercept works in Vitest (Node) and Playwright (browser). Never mock the DB (`base-standards.md`). |
| Coverage | **Vitest's built-in `v8` provider** + Playwright's `coverage` API for E2E | Aggregated via `c8`/`monocart` if a unified report is needed — defer until Phase 1 if not. |

Conventions:

- **Test file naming:** `{Name}.test.tsx` co-located with `{Name}.tsx` (per `base-standards.md` §Testing).
- **Test description:** behavior in present tense — `"redirects to PMS when dates are selected"`. The `should_..._when_...` pattern referenced in the skill prompts is dropped because it duplicates Vitest's `describe` nesting and is wordier than the rule actually requires.
- **E2E location:** `apps/{app-name}/tests/e2e/` per app (per `base-standards.md`).
- **Coverage gates:** enforced in CI via `vitest --coverage` with `--coverage.thresholds` matching the numbers in `base-standards.md`. CI fails below threshold.

### Why

- **Vitest over Jest:**
  - Native ESM, no Babel/SWC config tax. Next.js 14 + TS strict + workspace `.ts` imports work out of the box.
  - Reuses the Vite resolver — Tailwind classes, path aliases (`@/`), and `.tsx` JSX transform behave identically in tests and dev.
  - Watch mode is dramatically faster (HMR-style), which matters for TDD where the cycle is run-on-save.
  - Jest's React + TS + ESM + workspace setup is non-trivial and routinely the first source of bugs in Turborepo monorepos in 2026.
  - API parity with Jest covers ~95% of cases — migration from Jest tutorials is mechanical if needed.
- **Playwright over Cypress:**
  - True cross-browser. Cypress's Chromium-only e2e was acceptable before, not in 2026.
  - First-class TypeScript story, no plugin chain for it.
  - Plays well with Next.js static export (just serves `out/` and asserts).
  - Built-in parallelism and trace viewer reduce flake debugging time.
- **Testing Library over Enzyme / direct DOM:** matches the user-behavior testing model `base-standards.md` already mandates. No shallow rendering.
- **msw over fetch-mock / nock:** one mock surface for both Vitest and Playwright; intercepts at the network layer, so production code paths are exercised end-to-end.

### Consequences

- Phase 0 US-002 (`@hwp/config`) ships `vitest.config.ts` + a `@hwp/config/vitest` export for packages to extend.
- Phase 0 US-009 (CI) runs `pnpm test` (Vitest) and `pnpm test:e2e` (Playwright). Coverage thresholds enforced.
- Both Phase 2 enrich-story prompts (`enrich-us/phase-2-enrich-story.md`, `plan-to-stories/phase-2-enrich-story.md`) drop the Jest reference and the `should_..._when_...` naming convention. The pointer becomes "Vitest + @testing-library/react for unit/integration, Playwright for E2E".
- The `vitest-axe` dependency lands as part of `@hwp/core-ui`'s dev deps in US-003 (`@hwp/core-ui` skeleton).
- No tool is added to the catalog as a skill — these are runtime dependencies, not reusable components.

### Alternatives considered

- **Jest + Playwright** — rejected. Workable but pays a setup tax (TS, ESM, JSX transform, workspaces) that Vitest avoids. Equal capability, worse DX in 2026 Turborepo + Next 14 + TS.
- **Vitest + Cypress** — rejected. Cypress remains Chromium-only at the time of writing; cross-browser regression is part of the spec for a 300-client platform with varied admin browsers.
- **Vitest + Playwright + Storybook test-runner** — deferred. Storybook is a useful documentation surface for `core-ui` but adding it pre-Phase-0 inflates bootstrap. Revisit when there are ≥5 blocks worth documenting.
- **Vitest with `happy-dom` instead of `jsdom`** — accepted as default (it's already Vitest's default in 1.x), explicit pin via `environment: 'happy-dom'` in `@hwp/config/vitest`. `jsdom` reserved for the very rare test that needs full DOM compliance.

---

## DEC-007 — Vercel full-stack hosting (replaces cdmon + Hetzner + MariaDB)
**Date:** 2026-05-20
**Status:** Accepted
**Supersedes:** the cdmon + Hetzner + MariaDB + PHP-proxy hosting plan described in `docs/architecture/architecture.md` (Visión, Fases de desarrollo, Stack tecnológico, Arquitectura de deploy, Configuración por cliente, Arquitectura de base de datos, PHP proxy en cdmon sections) and the choices recorded in `docs/architecture-all-options.md` (hosting, DB, PHP-proxy sections marked ✓ ELEGIDO).

### Context

The original infrastructure plan, captured throughout `docs/architecture/architecture.md`, was:

- **Frontend:** Next.js static export deployed to **cdmon** (shared hosting) via GitHub Actions + SSH.
- **CMS:** Payload v3 in a Hetzner CX21 VPS (~€5.5/mo), Dockerized with Coolify, one container per client.
- **DB:** MariaDB on cdmon, one DB per client (`{slug}_db`) + a shared `plataforma_db` for tenants/config/logs/backups.
- **API proxy:** PHP scripts on cdmon for PMS and Claude API calls (`api/availability.php`, `api/ai.php`).
- **npm registry:** Verdaccio self-hosted on the same Hetzner box.

This plan optimized for **flat, predictable cost** (one Hetzner box + cdmon plan covering many clients) and **operational familiarity** (PHP, MariaDB, shared hosting). It paid for that with operational complexity: three deploy targets (cdmon static, cdmon PHP, Hetzner Docker), three monitoring surfaces, manual SSL/DNS choreography per client, cold-MariaDB-on-cdmon limits, and the PHP-proxy layer as a permanent moving part.

By 2026-05-20, when the platform is still pre-bootstrap (no `apps/`, no `packages/`), we re-evaluate against the same constraint set (300 clients, ~90% campings, agency operations, no in-house DevOps team) and switch to a unified Vercel target.

### Decision

The HWP hosting stack is **Vercel for everything**:

| Concern | Target | Notes |
|---|---|---|
| Frontend sites (`apps/site-{slug}/`) | **Vercel project per client** | Next.js 14 App Router; output mode flexible (static / ISR / SSR per page); custom domain per client. |
| Payload CMS (`apps/cms-{type}/`) | **Vercel Functions** | One Payload deployment per client type (`cms-camping`, `cms-hotel`, etc.) running as Next.js routes inside a Vercel project. Cold-start mitigated via `experimental.serverComponentsExternalPackages` + Vercel's Edge config for warm endpoints. |
| Database | **Vercel Postgres** | Replaces MariaDB. One Postgres database per client, plus a shared `platform` database for tenants/config/audit logs. Connection pooling via Vercel's built-in pgbouncer. |
| Media uploads | **Vercel Blob Storage** | Replaces cdmon `/uploads/`. Public buckets per client; signed URLs for admin uploads. |
| PMS proxy | **Next.js Route Handlers** in the site app | Replaces the PHP proxy. Credentials live in Vercel env vars (encrypted at rest); the route handler runs server-side, never reaches the browser. |
| Claude API proxy | **Next.js Route Handlers** in the CMS app | Same model — credentials in env vars, server-side only. The AI-editing portal's `/api/ai/*` routes proxy to Anthropic. |
| Background jobs (backups, cron) | **Vercel Cron** | Replaces the cdmon cron + `/backup_db` directory. Backups snapshot Postgres into Blob Storage with retention policy. |
| npm registry | **GitHub Packages** | Replaces self-hosted Verdaccio. Already in the original plan as a GitHub-hosted alternative — confirmed here. |
| CI/CD | **Vercel Git integration** (default) | Per push to a per-client branch or per tag; preview deploys for every PR. GitHub Actions handles cross-app concerns (lint, test, build verification) before Vercel deploys. |

The **monorepo Turborepo + pnpm** layout stays unchanged from DEC-003. Each client app is a separate Vercel project linked to the monorepo via the `Root Directory` setting.

### Why

- **One vendor, one dashboard.** Three deploy targets become one. The agency operates on Vercel only — no SSH, no Docker on Hetzner, no PHP runtime to patch, no Coolify panel.
- **No PHP proxy as a permanent moving part.** PMS and Claude credentials live in Vercel env vars; Next.js Route Handlers serve the proxy role with full type safety, Zod validation, and shared error handling. One language end-to-end (TypeScript).
- **Postgres over MariaDB.** Postgres has stronger native types (jsonb, arrays, enums), better Payload v3 support, and is the default Payload recommends. The shared-DB pattern moves cleanly: one Postgres instance per client + one shared `platform` instance.
- **Static-export limitation lifted.** cdmon required pure static export. Vercel supports ISR and SSR per route, so seasonalized pages, A/B tests, or per-visitor personalization (deferred features) become possible without re-architecting.
- **Per-client cost trades flat vs scalable.** Vercel Pro is ~$20/seat/mo + per-project Postgres/Blob usage. For 300 clients, the bill scales linearly with usage (free tier per project absorbs the long tail). The original cdmon+Hetzner flat plan was cheaper at small scale but does not absorb traffic spikes or Payload activity spikes without manual capacity work.
- **Preview deploys per PR.** A `/scaffold-block` or a `/import-figma` re-pass can be reviewed by the designer in a real Vercel preview URL before merge. The cdmon `/staging` directory pattern is replaced by branch-based previews.

### Consequences

- **`docs/architecture/architecture.md` is partially superseded.** The sections naming cdmon, Hetzner, MariaDB, PHP proxy, Verdaccio, and the Fase 1/Fase 2 deploy split are stale. Per DEC-003, the constitution is not rewritten wholesale — a banner at the top of `architecture.md` points to this DEC for the hosting/deploy/DB/proxy chapters. New work follows DEC-007; old text is preserved for historical context.
- **`docs/architecture-all-options.md` retains its historical record.** The cdmon and Hetzner options marked ✓ ELEGIDO there describe the choice made in May 2026 before this DEC. Add a one-line note pointing to DEC-007 — do not rewrite the rationale of the original choice.
- **`docs/architecture/briefing.md` is updated** to name Vercel as the hosting target.
- **`CLAUDE.md` is updated** to drop the cdmon/Hetzner/MariaDB/PHP-proxy lines and replace them with the Vercel stack.
- **Phase 0 US-009 (CI/CD)** is reshaped: instead of GitHub Actions + SSH to cdmon, the workflow is GitHub Actions (test/build verification) + Vercel Git integration (deploy). To be reflected in `docs/docs/plans/phase-0-frontend-skeleton.md` when US-009 is enriched.
- **Phase 0 US-007 (Balneario bootstrap)** does NOT need to change for hosting — the app builds the same way; only the deploy target moves to Vercel.
- **A new bootstrap phase (Phase 0.5 or Phase 2)** must be planned to cover: Vercel project provisioning per client, Vercel Postgres schema scaffolding, Vercel Blob Storage bucket layout, env-var management strategy. Not in scope for Phase 0.
- **The PHP proxy section of `architecture.md`** describes a layer that no longer exists. New equivalent: `apps/site-{slug}/src/app/api/*` and `apps/cms-{type}/src/app/api/*` Route Handlers. To be documented in a future `docs/contracts/frontend/api-routes.md` when the first route is implemented.
- **Multi-tenant DB isolation rule from `base-standards.md`** still applies — every query is scoped by `tenantId`. The mechanism changes from "one MariaDB per client" to "one Postgres per client", but the constraint is identical.
- **The `BookingAdapter` and Payload schemas are unaffected.** They are defined in `@hwp/booking` and `@hwp/content` regardless of where they run.

### Alternatives considered

- **Status quo (cdmon static + Hetzner Payload + MariaDB + PHP proxy)** — rejected for the reasons in §Why. Functional today, but the operational tax compounds as client count grows and the PHP-proxy layer is a permanent dependency that nobody on the agency wants to maintain long-term.
- **Vercel for frontend only, Payload+DB stays on Hetzner** — rejected. Two-vendor split with two dashboards, two SSL/DNS surfaces, and two CI pipelines. The original concern (Payload cold-start on serverless) is real but mitigable (warm cron, Edge config); it does not justify keeping Hetzner in the loop.
- **Railway / Fly.io / Render for Payload, Vercel for frontend** — rejected for v1. Adds a third vendor for the CMS layer (not Vercel, not the agency's existing hosts). Worth re-evaluating only if Vercel Functions show real cold-start pain in production with Payload.
- **AWS (Amplify + RDS + S3)** — rejected. More flexible long-term but the operational complexity of AWS IAM, VPC, and per-service config is what we are explicitly trying to escape. Reserved for a hypothetical scale where Vercel pricing breaks down (estimated >500 active sites with heavy CMS traffic — not in the foreseeable roadmap).
- **Self-hosted Coolify / Dokku on a bigger VPS** — rejected. Trades one operational burden (cdmon+Hetzner+MariaDB) for another (Coolify upgrades, single-host SPOF, manual scaling). No net win.

### Open questions (resolve before Phase 0.5)

- **Payload v3 on Vercel Functions** — confirm production-readiness via a spike before committing. If cold-start is unworkable for the admin UI even with warm cron, plan B is moving Payload to Railway/Fly while keeping frontend + DB + Blob on Vercel.
- **Vercel Postgres pricing tiers** at 300 clients — model the cost vs hosted Postgres alternatives (Neon, Supabase) before going to scale. Vercel Postgres is built on Neon; using Neon directly may be cheaper at higher tiers.
- **Env-var management for 300 projects** — Vercel Teams + projects with shared env vars at the team scope, or a separate secrets layer (Doppler, Infisical)? Defer until 5+ clients are live.
- **DNS strategy** — each client's custom domain points to Vercel via CNAME. Wildcard SSL handled by Vercel. Confirm the agency's domain-management workflow.
- **GDPR / data residency** — Vercel Postgres regions need to match EU requirements for Spanish hospitality clients. Pin to `fra1` or `cdg1` regions; document in the bootstrap skill.

---

## DEC-008 — Structural variants for complex blocks
**Date:** 2026-05-21
**Status:** Accepted
**Extends:** DEC-003 (Frontend layout) and `docs/contracts/frontend/block-contract.md`.

### Context

The existing block contract (`docs/contracts/frontend/block-contract.md`) defines variants as CVA-only: styling changes that never alter the data shape or the component structure. That works for blocks where variants differ only in CSS — e.g. a `HeroBlock` with `layout="full"` vs `layout="split"`.

However, several block families need variants that are **structurally different components** — different DOM trees, different hooks, different sub-components. Concrete examples:

- `GalleryBlock`: `masonry` (layout algorithm + column calculation) vs `carousel` (swipe handlers, autoplay, dots) vs `grid` (simple CSS grid) vs `lightbox` (modal overlay + navigation).
- `BookingBlock`: `inline` (embedded form) vs `modal` (dialog wrapper) vs `iframe` (third-party embed).
- `HeroBlock`: `video` (video player + autoplay + overlay) vs `slider` (swipe + dots) vs `parallax` (scroll handler + transform).

Putting all structural logic in one `.tsx` file with conditional branches produces unmaintainable components (500+ lines, tangled hooks, impossible to test in isolation).

### Decision

Introduce **structural variants** as an **opt-in** extension of the block contract. A block family MAY have structural variants when its variants require different implementations (different hooks, sub-components, or DOM trees). Blocks that only need visual variants keep using CVA — the flat 5-file layout is unchanged.

#### Folder layout for a block with structural variants

```
packages/core-ui/src/blocks/{Name}Block/
├── index.ts                       ← variant resolver (exception to the no-barrel rule)
├── {Name}Block.schema.ts          ← shared Zod schema (all variants parse the same content)
├── {Name}Block.types.ts           ← shared types (z.infer of the schema + variant key)
├── {Name}Block.test.tsx           ← tests covering all variants
├── shared/                        ← sub-components shared across 2+ variants
│   └── {SharedComponent}.tsx
├── {Name}{VariantA}/              ← one subfolder per structural variant
│   ├── {Name}{VariantA}.tsx
│   └── (optional: hooks, sub-components specific to this variant)
└── {Name}{VariantB}/
    └── {Name}{VariantB}.tsx
```

#### The resolver (`index.ts`)

Each block with structural variants exports a resolver component from `index.ts`:

```ts
// packages/core-ui/src/blocks/{Name}Block/index.ts
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

The resolver is what `blockRegistry.ts` references for that block type. From the BlockRenderer's point of view, nothing changes — it still imports `{Name}Block` and passes `content` + `variant`.

#### Schema sharing rule

All structural variants of a block family share **one** schema (`{Name}Block.schema.ts`). Variant-specific optional fields are declared `.optional()` in the shared schema. A variant ignores fields it does not use — it never fails on them because they are optional.

Rationale: Payload stores one content shape per block type. If variants had different schemas, the CMS would need to switch schemas when the editor changes the variant — that complexity is not justified by the use cases on the table.

#### CVA coexistence

A structural variant MAY also use CVA for fine-grained styling inside its own `.tsx`. The two systems are orthogonal:

- **Structural variant** = which component renders (resolver in `index.ts`).
- **CVA variant** = how that component styles itself (`cva()` inside the variant's `.tsx`).

A `GalleryCarousel` may itself accept a CVA `tone` variant; that is a styling concern internal to the carousel, not a structural choice.

#### Fallback chain for variant resolution

1. **Explicit variant** from Payload `layout[]` (per-page, per-block) → resolver picks that structural variant.
2. **`blockDefaults`** in `client.config.ts` (per-client) → resolver uses the client's default (see DEC-009).
3. **Default variant** declared in the resolver (per-platform) → the first variant declared in the map.

#### When NOT to use structural variants

- If the variants only differ in CSS classes → use CVA (the existing contract).
- If there is only one variant → don't create a resolver; keep the flat 5-file layout.
- Rule of thumb: if you cannot implement the variant by adding a CVA value, you need a structural variant.

#### `index.ts` exception to `structure.md`

`docs/contracts/frontend/structure.md` states: "No `src/blocks/index.ts`, no `src/blocks/HeroBlock/index.ts`". This DEC creates a controlled exception: a block with structural variants MUST have an `index.ts` that acts as the variant resolver. That `index.ts` is NOT a barrel re-export — it contains the resolver function. Consumers still import from `@hwp/core-ui` root (the public API rule is unchanged).

### Consequences

- `docs/contracts/frontend/block-contract.md` is updated with a "Structural variants" section and a "The `shared/` folder" section.
- `docs/contracts/frontend/structure.md` is updated with the `index.ts` exception note.
- `/scaffold-block` continues to generate the flat 5-file layout (no change). Blocks start flat and migrate to structural variants when needed.
- A future `/scaffold-variant` skill will automate adding a structural variant to an existing block. Tracked as a stub in `docs/catalog.md`.
- `blockRegistry.ts` gains an optional `variants` key per entry so Payload can render a select field with the valid options at the CMS layer.
- No existing DEC is contradicted. DEC-003 is extended: the folder-per-component convention still applies; structural variants are a nested specialization of it.

### Alternatives considered

- **Separate blocks per variant** (`GalleryMasonryBlock`, `GalleryCarouselBlock`) — rejected. Bloats the registry, duplicates the schema, forces Payload to manage N block types instead of one with a variant selector, and breaks the "same data shape → variant, different data shape → new block" rule.
- **HOC wrapper per variant** — rejected. Obscures the component tree in React DevTools, makes testing harder, and adds an indirection layer the team would have to teach for every block family.
- **Plugin/slot pattern** (variants register themselves into a slot) — rejected. Over-engineered for the current scale. Revisit only if a block family exceeds 10 variants and dynamic registration becomes a real need.
- **Mega-component with conditional branches** (status quo of "just put everything in `{Name}Block.tsx`") — rejected. The maintenance ceiling is too low; 3+ variants already produce 500-line files with tangled hooks.

---

## DEC-009 — Remove `activeBlocks`, add `blockDefaults` to `client.config.ts`
**Date:** 2026-05-21
**Status:** Accepted
**Supersedes:** the `activeBlocks` field referenced in `docs/architecture/architecture.md` (sections describing `client.config.ts` shape).

### Context

`docs/architecture/architecture.md` shows `activeBlocks: ['HeroBlock', 'GalleryBlock', ...]` as a flat string array in `client.config.ts`. This list is:

- **Never consumed** by any documented contract — `BlockRenderer`, `/scaffold-block`, and compositions do not read it.
- **Redundant** with Payload's `layout[]`, which already declares which blocks appear on each page.
- **Redundant** with the `features` system in `docs/architecture/domain-model.md`, which gates pages and blocks per client (a block tied to `hasSpa` is gated by the feature, not by a parallel list).

Meanwhile, several blocks need **per-client configuration** that a string array cannot express: which PMS adapter, which default variant (DEC-008), which copy fallback. The shape that solves the real need is a record, not an array.

### Decision

1. **Remove** `activeBlocks` from the `client.config.ts` shape.
2. **Add** an optional `blockDefaults` record:

   ```ts
   blockDefaults?: {
     [BlockType: string]: {
       defaultVariant?: string;
       [key: string]: unknown;  // block-specific config
     };
   };
   ```

   Example:

   ```ts
   blockDefaults: {
     BookingBlock:  { defaultVariant: 'inline' },
     GalleryBlock:  { defaultVariant: 'masonry' },
   },
   ```

3. **Variant fallback chain** (canonical, referenced by DEC-008):
   1. Explicit `variant` in Payload `layout[]` (per-page, per-block).
   2. `blockDefaults[blockType].defaultVariant` in `client.config.ts` (per-client).
   3. Default declared in the block's resolver or CVA (per-platform).

4. `blockDefaults` is **populated during client onboarding** — either by Claude interpreting the Figma export (`/import-figma`) or by the team's explicit decisions about the client's defaults.

5. `blockDefaults` is **optional**. Blocks without an entry use the platform default (step 3 of the fallback chain).

### Consequences

- `docs/architecture/architecture.md` references to `activeBlocks` are flagged as superseded by this DEC; new content uses `blockDefaults`.
- Compositions can read defaults via `useTenant().blockDefaults`, but may also hardcode `variant=` on a block when the per-page need overrides the client default.
- Payload's block type selector is NOT affected — it still lists every registered block. `blockDefaults` is a config concern, not a registration concern.
- The features system (`docs/architecture/domain-model.md`) remains the gate for "which blocks are available at all" for a client. `blockDefaults` only configures the blocks that are already available.

### Alternatives considered

- **Keep `activeBlocks` alongside `blockDefaults`** — rejected. Two overlapping mechanisms for the same concern. Inviting future drift between the two lists.
- **No replacement** (drop `activeBlocks`, add nothing) — rejected. The Figma onboarding flow needs a place to declare client-level variant preferences that are not page-specific. Without `blockDefaults`, that information would live in compositions (per-page hardcoding) — losing the "per-client default" abstraction.
- **Put defaults under `features`** — rejected. `features` is a boolean gate (does this client have spa? has seasons?), not a configuration surface. Conflating the two would make the feature flags noisy and the defaults hard to find.

---

## DEC-010 — `BookingBlock` in `@hwp/core-ui`, `BookingProvider` in `@hwp/booking`
**Date:** 2026-05-21
**Status:** Accepted
**Supersedes:** the `@hwp/booking/react/` location for `BookingBlock` mentioned in `docs/architecture/architecture.md` (§Booking Engine).

### Context

Two documents place `BookingBlock` in different locations:

- `docs/architecture/architecture.md` §Booking Engine shows `BookingBlock` in `@hwp/booking/react/`.
- `docs/contracts/frontend/block-contract.md` and `docs/contracts/frontend/structure.md` state that all blocks live in `@hwp/core-ui/src/blocks/`.

This creates ambiguity about where the UI component lives versus where the domain logic lives. It also blurs the boundary of `@hwp/booking`, which should be a domain + infrastructure package (interface + adapters), not a UI package.

### Decision

1. **`BookingBlock`** (the React component family) lives in `packages/core-ui/src/blocks/BookingBlock/`, like every other block. It MAY have structural variants per DEC-008 (e.g. `BookingInline`, `BookingModal`, `BookingIframe`).

2. **`BookingBlock` depends on the `BookingAdapter` interface** from `@hwp/booking` — never on a concrete adapter. It receives the adapter via React context, accessed through a `useBookingAdapter()` hook re-exported by `@hwp/booking`.

3. **`@hwp/booking` exports:**
   - The `BookingAdapter` interface (the port).
   - Stock adapters: THR, Masterbooking, Witbooking, Resalys (the infrastructure).
   - `BookingProvider` — the React context provider that wraps the app and injects the active adapter.
   - `useBookingAdapter()` — the hook blocks use to consume the adapter.

4. **`@hwp/booking` does NOT export React UI components.** Remove the planned `@hwp/booking/react/` directory. Keeping `BookingProvider` and `useBookingAdapter()` in the package is acceptable because they are domain-layer plumbing for context, not UI; they carry no JSX of their own beyond `<Context.Provider>`.

5. **The app's root layout wires the provider:**

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

6. **Custom (non-stock) PMS adapters** live in `apps/site-{slug}/src/booking/` and implement the `BookingAdapter` interface. They are wired into `client.config.ts` as `bookingAdapter` and injected via the provider at the root.

### Consequences

- `docs/architecture/architecture.md` §Booking Engine receives a superseded banner pointing to this DEC.
- `@hwp/booking` stays a domain + infrastructure package: adapter interface, concrete adapters, provider, hook. No `.tsx` page-section components.
- `BookingBlock` in `@hwp/core-ui` can be unit-tested without any concrete PMS adapter — tests mock the adapter via `BookingProvider`. This matches DEC-006 (Testing toolchain) and keeps coverage targets achievable.
- The architectural rule that "no block lives outside `@hwp/core-ui/src/blocks/`" becomes a hard invariant — `BookingBlock` was the exception that no longer exists.
- Multi-PMS clients (rare but specified in the domain model) compose their own adapter at `apps/site-{slug}/src/booking/` without changing `@hwp/core-ui`.

### Alternatives considered

- **`BookingBlock` in `@hwp/booking/react/`** — rejected. Puts UI inside a domain package, violates the single-responsibility of `@hwp/booking`, and breaks the "all blocks in core-ui" invariant. Also forces `@hwp/booking` to depend on React and Tailwind, which it currently does not.
- **No provider — pass `adapter` as a prop to every `BookingBlock`** — rejected. Every composition that uses `BookingBlock` would need to import and wire the adapter. The provider does that once at the root, and other adapters that may follow (analytics, AI) can reuse the same pattern.
- **`BookingBlock` in `@hwp/core-ui` but `BookingProvider` also in `@hwp/core-ui`** — rejected. The provider's job is to expose the active `BookingAdapter`, which is `@hwp/booking`'s contract. Putting the provider in `@hwp/core-ui` would make `@hwp/core-ui` depend on knowledge that belongs to the booking domain.

## DEC-011 — Client sites live in independent repos, monorepo holds only platform + reference site
**Date:** 2026-05-21
**Status:** Accepted

### Context

The walking skeleton (per `docs/docs/plans/walking-skeleton.md`) bootstraps the platform as a full monorepo containing `packages/*` (the `@hwp/*` packages) AND `apps/site-demo/` (a reference camping site). That layout is fast for validation: one `pnpm install`, one Turborepo cache, one local dev loop.

The scale target is **300 clients**. Continuing the monorepo path means 300 apps inside `apps/`:

- Build/CI time grows linearly with client count even for unrelated changes.
- Every client's `tsconfig`, lint config, Tailwind preset extension and test matrix can drift; cross-client invariants become hard to enforce.
- A single failing client app blocks the workspace's `pnpm -r build` / CI gate.
- Agency-facing operations couple across clients (who can merge what, who can deploy what).

The hosting target ([DEC-007](#dec-007--vercel-full-stack-hosting-replaces-cdmon--hetzner--mariadb)) is already "one Vercel project per client" — independent deploy boundaries. The repo layout should match.

### Decision

1. **Production client sites live in independent git repos**, one per client (e.g. `site-{slug}/`, hosted under the agency's org on the same git provider as `hwp-platform/`).
2. **The `hwp-platform/` monorepo holds only:**
   - `packages/*` — the `@hwp/*` packages (`core-ui`, `booking`, `content`, `config`, etc.).
   - `apps/site-demo/` — a single reference site used to validate package releases end-to-end before publishing.
   - Platform documentation, decisions, plans, skills (`docs/`, `docs/architecture/`, `docs/`, `docs/plans/`, `.claude/`).
3. **Client repos consume `@hwp/*` via a private npm registry** (GitHub Packages or Verdaccio — final choice resolved before client #1; default position is GitHub Packages because it is already the registry referenced in [DEC-007](#dec-007--vercel-full-stack-hosting-replaces-cdmon--hetzner--mariadb) §npm registry).
4. **Client repos are bootstrapped from a template repo** (`site-template`, TBD before client #1) that ships: `package.json` with `@hwp/*` dependencies pinned, `client.config.ts`, `src/theme/tokens.json`, `src/compositions/`, `src/app/` skeleton, `next.config.mjs`, Vercel config.
5. **The walking skeleton (this milestone)** stays in `apps/site-demo/` inside the monorepo. Migration of the per-client model — splitting into independent repos + standing up the private registry + writing the template — happens **before the first real client onboarding**, not during walking-skeleton validation.

### Consequences

- **Package versioning becomes load-bearing.** `@hwp/core-ui` and friends ship as semver releases via the private registry. Client repos pin to a version and consciously bump. Breaking changes in `core-ui` no longer ripple silently into every client.
- **Cross-cutting changes need a propagation step.** A new block contract is a PR to `hwp-platform/` → release → bump in N client repos. Accepted cost in exchange for client isolation and the freedom for clients to stay on older versions when business reasons demand it.
- **CI per client is small, independent, and fast.** A failing build in client A does not block client B's deploy.
- **`apps/site-demo/`** is the canonical "what does a real client app look like" reference. The template repo is generated from it (or kept in lockstep). The demo must always build green or releases of `@hwp/*` are blocked.
- **Deferred work, sequenced before client #1:**
  - Stand up the private npm registry (GitHub Packages provisioning + tokens).
  - Publish `@hwp/core-ui@0.1.0`, `@hwp/config@0.1.0`, `@hwp/booking@0.1.0` from the monorepo.
  - Create `site-template/` repo (separate from `hwp-platform/`) that bootstraps a new client.
  - Define the version-bump workflow (Changesets candidate, decided in its own DEC).
- **The "all clients in a single Turborepo" mental model is dropped.** Tooling like Renovate / Dependabot operates per client repo against the private registry, not via shared lockfiles.

### Alternatives considered

- **Keep all 300 client apps inside `hwp-platform/apps/`.** Rejected. Build and CI time grow with N; agency operations couple across clients; one broken `apps/site-foo/` blocks `pnpm -r build`; storage and clone time scale poorly.
- **`@hwp/core-ui` consumed via git submodule from each client repo.** Rejected. Submodule operational pain (developers forget to update, detached HEADs, weird CI states); loses semantic versioning; updates require touching every client repo's `.gitmodules` instead of a version bump.
- **Single client repo containing all clients, separate from the platform monorepo.** Rejected. Re-creates the same monorepo problems one layer down — a "monorepo of clients" instead of "monorepo of platform + clients" still couples 300 deploys.
- **Publish to public npm.** Rejected. The packages encode agency-specific design decisions, partner adapter wiring, and patterns the platform does not want public until the offering is mature. Private registry preserves optionality.

---

---

## DEC-012 — Tailwind v3 over v4 for the walking skeleton
**Date:** 2026-05-21
**Status:** Accepted

### Context

The walking skeleton (per `docs/docs/plans/walking-skeleton.md`) needs Tailwind wired into `apps/site-demo` so the Camping Mer et Camargue palette and fonts reach the browser. The reference Figma export (`figma-makes/base-template/src/styles/theme.css`) is authored in **Tailwind v4 syntax** — CSS-first config via `@theme inline` directives. That tempts us to adopt v4 directly.

But the HWP token pipeline documented in `docs/contracts/frontend/theme-tokens.md` is built around a **JavaScript preset**:

1. `apps/site-{slug}/src/theme/tokens.json` is parsed at build time by `TokensContract` (Zod schema in `@hwp/core-ui`).
2. The parsed `Tokens` object is passed to `createHwpPreset(tokens)` in `@hwp/config`, which returns a `Partial<Config>`.
3. `apps/site-{slug}/tailwind.config.ts` lists `[createHwpPreset(tokens)]` under `presets`.

That `Partial<Config>` + `presets: [...]` shape is **Tailwind v3 API**. Tailwind v4 removes JS presets in favor of CSS `@theme` directives — the token pipeline as designed in `docs/contracts/frontend/theme-tokens.md` cannot be expressed in v4 without rewriting the contract.

### Decision

1. The walking skeleton (and the foreseeable Phase 0/1 work) uses **Tailwind CSS v3.4**.
2. The Figma export's `theme.css` (v4 syntax) is read as a **reference for color and font values only**, not copied as code. The values are extracted into `tokens.json` and consumed via the v3 JS preset pipeline.
3. Migration to Tailwind v4 is **deferred** until both gates clear:
   - The Next.js + Tailwind v4 + Turborepo + pnpm combination is stable for production use (no recurring HMR / build pipeline issues).
   - The CVA + Tailwind v4 ecosystem is stable (CVA's variant compilation works against v4's CSS-first theme without contract drift).
4. When the migration is on the table, it ships as a new DEC that supersedes the v3 sections of `docs/contracts/frontend/theme-tokens.md` and rewrites `createHwpPreset` against the v4 contract — not as a silent dependency bump.

### Consequences

- `apps/site-demo/package.json` and `packages/config/package.json` pin Tailwind to `^3.4.x` until the migration DEC lands.
- `docs/contracts/frontend/theme-tokens.md` remains the source of truth as-is; no v3-vs-v4 caveat banner is needed because v3 is the only supported target today.
- New tokens added to the contract land in v3 form (`theme.extend.colors`, `theme.extend.fontFamily`, etc.). Designers who export from Figma in v4 syntax have their output **mapped** by the extraction step, not copied verbatim.
- The v4 syntax in `figma-makes/base-template/src/styles/theme.css` is preserved as historical reference — the Figma Make repos are pristine clones ([DEC-002](#dec-002--one-figma-make-repo-per-client-tagged-per-import)), we do not edit them.

### Alternatives considered

- **Adopt Tailwind v4 now and rewrite the token contract.** Rejected for the walking skeleton. Rewriting `theme-tokens.md`, `tokens.contract.ts`, and `createHwpPreset` in CSS-first form would block delivery of the walking skeleton on a tooling redesign whose payoff is uncertain (CVA + Next.js + Turborepo + v4 still has rough edges). Deferring keeps the path to localhost short.
- **Run v3 and v4 side-by-side** (v3 in `core-ui`, v4 in `apps/`). Rejected. Two Tailwind generators in one monorepo doubles the build surface and creates token-mapping drift between the package and the app that consumes it.
- **Skip Tailwind entirely, ship CSS-in-JS or vanilla CSS.** Rejected. The contracts (`block-contract.md`, `theme-tokens.md`) presume Tailwind; switching off it is a far larger change than waiting for v4 to stabilize.
---

## DEC-013 — Unified docs structure: merge `memory-bank/`, `ai-specs/`, `plans/` into `docs/`

**Date:** 2026-05-21
**Status:** Accepted
**Deciders:** Cristina Gutiérrez

### Context

The original repo had documentation spread across four sibling directories at the monorepo root:

- `memory-bank/` — architecture, domain model, decisions, briefing, per-client notes
- `ai-specs/` — specs (base-standards, frontend-standards, lifecycle), skills catalog
- `plans/` — SPECBOOT epic plans and phase plans
- `docs/` — architecture diagrams, frontend contracts, agent instructions

This made navigation expensive: to answer "what decisions have been made about theme tokens?", an agent had to check `memory-bank/decisions.md`, `docs/frontend/theme-tokens.md`, `ai-specs/specs/base-standards.md`, and possibly `plans/*/plan.md` — four different subtrees with no clear ownership boundary. CLAUDE.md referenced all four directories explicitly, and every skill's SKILL.md carried its own cross-directory load list.

### Decision

1. All documentation lives under a single `docs/` tree, organised by function:
   - `docs/architecture/` — `decisions.md`, `domain-model.md`, `briefing.md`, `architecture.md`, `architecture-all-options.md`, `architecture-audit.md`
   - `docs/contracts/frontend/` — `block-contract.md`, `structure.md`, `template-contract.md`, `theme-tokens.md`, `client-composition.md`
   - `docs/specs/` — `base-standards.md`, `frontend-standards.md`, `lifecycle.md`
   - `docs/skills/frontend/` — `block-creation.md`, `theme-tokens-pipeline.md`
   - `docs/plans/` — `walking-skeleton.md`, `phase-0-frontend-skeleton.md`, `phase-1-design-system/`
   - `docs/stories/{frontend,infra,cms}/` — enriched User Stories
   - `docs/clients/` — per-client design analysis (`figma-analysis.md`, `figma-notes.md`)
   - `docs/diagrams/` — unchanged
2. `memory-bank/`, `ai-specs/`, and `plans/` are removed from the repo root. All files were migrated with `git mv` to preserve history.
3. `CLAUDE.md` and all skill SKILL.md files are updated to reference the new paths.
4. `docs/README.md` is rewritten to index the new structure and map each task type to the minimum set of docs to load.

### Consequences

- **Single doc root:** any agent can discover the full doc set from `docs/README.md` without consulting CLAUDE.md to locate directories.
- **Cleaner context loading:** the loading policy ("which docs for which task") is expressed entirely within `docs/README.md`, reducing the size of CLAUDE.md.
- **All 40+ cross-references updated** in a single migration pass (automated via Node.js script `fix-refs.mjs`).
- **History preserved:** `git mv` ensures `git log --follow` and `git blame` work correctly on migrated files.

### Alternatives considered

- **Keep the four-directory structure and improve CLAUDE.md.** Rejected. The root cause is spatial separation of concerns, not just documentation quality. A better index doesn't eliminate the overhead of four sibling directories.
- **Move everything to `docs/` with a flat layout.** Rejected. A flat `docs/` with 30+ files is harder to scan than subdirectories by function (`architecture/`, `contracts/`, `specs/`).

---

## DEC-014 — Agent-based development workflow: SPECBOOT pipeline + 7 domain specialists

**Date:** 2026-05-22
**Status:** Accepted
**Deciders:** Cristina Gutiérrez

### Context

The team building HWP comes entirely from a WordPress background. In WordPress, one developer typically handles design fidelity, SEO, security, and documentation manually — relying on their own judgment for every concern. At the scale of 300 clients and a multi-package monorepo, this single-developer mental model does not scale: quality gates get skipped under pressure, concerns get mixed in the wrong layer, and the knowledge base drifts.

The SPECBOOT methodology (DEC-001) introduced a sequential pipeline for implementing user stories, but defined only narrative phases without binding agents to specific models or tool scopes. As the number of `.claude/agents/` files grew, there was no documented system for when to invoke which agent, in what combination, or with what authority.

### Decision

Adopt a **dual-layer agent system**:

**Layer 1 — SPECBOOT pipeline (4 sequential agents):**

| Agent | Model | Phase | Role |
|---|---|---|---|
| `planner` | Opus | `/propose` | Reads enriched US, produces proposal artifact — files to touch, patterns to follow, tests to write |
| `implementer` | Sonnet | `/apply` | Executes approved proposal TDD-first: test → fail → implement → pass |
| `reviewer` | Opus | `/review` | Independent diff review — sees ONLY the diff + story, never the proposal |
| `verifier` | Haiku | `/verify` | Mechanical CI: typecheck → test → lint → build, fail-fast, binary output |

**Layer 2 — Domain specialists (7 read-only agents):**

| Agent | Model | Domain |
|---|---|---|
| `architect` | Opus | DECs, contracts, domain model, package boundaries |
| `senior-developer` | Sonnet | Core package patterns, existing idioms |
| `ux-ui-analyst` | Sonnet | Visual fidelity vs Figma reference |
| `seo-geo-specialist` | Sonnet | Semantic HTML, heading hierarchy, structured data, local SEO |
| `security-specialist` | Sonnet | RGPD, input handling, headers, CSP, cookies, secrets |
| `qa-engineer` | Sonnet | End-to-end behavioral QA, responsiveness, accessibility |
| `docs-writer` | Sonnet | skills, guides, plans, stories, catalog, README |

**Team composition rules (from `docs/specs/ai/agent-teams-playbook.md`):**
- Maximum 3 agents per team (lead + 2 teammates).
- Opus for leads on complex tasks (planner, reviewer, architect). Opus reasons more carefully through trade-offs.
- Sonnet for all teammates (implementer + specialists). Fast, cost-effective, specialized.
- Haiku for verifier only — mechanical gates, no reasoning needed.
- Specialists are read-only: they audit and report; the implementer or senior-developer does the fixing.

### Why

- **Model selection by role.** Opus is used for tasks requiring multi-step reasoning under constraints (designing a proposal, evaluating a diff). Sonnet is used for focused domain audits and TDD execution. Haiku is used for binary mechanical work. Each model is in its cost-effective zone.
- **Specialists are read-only.** The implementer is the only agent that writes application code. Specialists consulting the implementer after writing would create review-by-committee dynamics; specialists consulting before or in parallel with review preserves clean authority.
- **Max 3 per team.** More agents per task produces noise, not quality. The constraint forces the caller to pick the 2 most relevant specialists for the story's domain.
- **Plan to expand to 16 agents.** The 11-agent set covers the walking skeleton and Phase 1. Additional specialists (`i18n-specialist`, `performance-specialist`, `cms-specialist`, etc.) enter as enriched User Stories when a real need is demonstrated — not speculatively.

### Consequences

- Every block delivered henceforth can get SEO + visual + security validation from day one, not as an afterthought before a client launch.
- `docs/specs/ai/agent-directory.md` — the canonical reference for all 11 agents (roles, models, when to invoke, tool scopes).
- `docs/specs/ai/agent-teams-playbook.md` — pre-defined team compositions for the 7 most common task types.
- `docs/specs/ai/specboot-flow.md` — detailed SPECBOOT pipeline documentation (phases, inputs, outputs, specialist cheat sheet).
- `docs/specs/general/base-standards.md` gains three new quality gates: STD-AGENT-VISUAL, STD-AGENT-SEO, STD-AGENT-SECURITY — blocks cannot be promoted past `alpha` without the relevant specialist audits.
- `CLAUDE.md` is updated to name the 11 agents and reference this DEC.

### Alternatives considered

- **One general-purpose agent for everything** — rejected. A single agent that designs, codes, reviews, and audits has no clean separation of concerns; the "independent review" value proposition collapses when the same agent sees both the proposal and the diff.
- **Keep agents informal** (invoke by description, not by name) — rejected. Without named agents with tool scopes and model assignments, quality drifts. The SPECBOOT pipeline is only as strong as the independence of the reviewer, which requires that the reviewer never saw the proposal.
- **More than 3 agents per team** — rejected. Coordination cost grows super-linearly. If more than 2 specialists are needed, the story should be split.

---

## DEC-015 — Client-owned blocks with shared schemas, slot-based composition, and npm subpath exports
**Date:** 2026-06-01
**Status:** Accepted
**Extends:** DEC-003 (Frontend layout), DEC-008 (Structural variants), DEC-009 (blockDefaults), DEC-011 (Independent client repos)
**Supersedes:** The assumption that all block implementations live in `packages/core-ui/blocks/` and that clients consume them as-is with no visual override mechanism beyond tokens and CVA.

### Context

The current architecture places all block implementations (`.tsx` files with JSX, Tailwind classes, and visual structure) in `packages/core-ui/src/blocks/`. Client sites — which per DEC-011 live in **independent git repos** and consume `@hwp/core-ui` as an npm package from a private registry — import these blocks with no ability to change the DOM structure.

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
│   ├── types/                      ← Shared types derived from schemas
│   ├── primitives/                 ← Shadcn/Radix atomic UI (shared, overridable per client)
│   ├── renderer/                   ← BlockRenderer + registry (shared)
│   │   ├── BlockRenderer.tsx
│   │   ├── baseBlockRegistry.ts    ← renamed from blockRegistry.ts
│   │   └── BlockRenderer.test.tsx
│   ├── providers/                  ← React context providers (shared)
│   ├── layout/                     ← Shell, Navbar base, Footer base (shared)
│   ├── theme/                      ← Token contract + cascade system (shared)
│   ├── base-blocks/                ← NEW: reference implementations (scaffold copies these)
│   │   ├── index.ts                ← re-exports all base-blocks for subpath
│   │   └── {Name}Block/            ← each block with optional slots
│   ├── composition-rules/          ← NEW: adopted from DSE reference
│   │   ├── rules.schema.ts
│   │   ├── validator.ts
│   │   └── validator.test.ts
│   └── index.ts
├── package.json                    ← includes "exports" subpaths
```

#### 2. npm subpath exports

```json
{
  "exports": {
    ".":              "./src/index.ts",
    "./base-blocks":  "./src/base-blocks/index.ts",
    "./schemas":      "./src/schemas/index.ts"
  }
}
```

The root export (`@hwp/core-ui`) does NOT re-export base-blocks. Client code explicitly chooses whether to use the base-block or its own implementation.

#### 3. Client repo structure (per DEC-011)

```
site-{slug}/
├── src/
│   ├── blocks/                         ← client's own block implementations
│   │   ├── {Name}Block/{Name}Block.tsx ← uses base-block + slots, or fully custom JSX
│   │   └── registry.ts                 ← client block map fed to BlockRenderer
│   ├── primitives/                     ← OPTIONAL: primitive overrides (~2% of clients)
│   ├── compositions/
│   ├── theme/
│   └── app/
│       └── globals.css                 ← ONE CSS file per client
```

#### 4. `apps/site-demo/` mirrors client repo structure exactly.

#### 5. Block resolution chain

```
1. Client block map (registry.ts)      → Found? Use client implementation.
2. baseBlockRegistry (base-blocks)     → Found? Use default implementation.
3. Neither found?                      → Dev warning.
```

#### 6. Three usage levels for client developers

```tsx
// Level 1 — Re-export (~70% of cases)
export { HeroBlock } from '@hwp/core-ui/base-blocks';

// Level 2 — Slots (~20% of cases)
import { HeroBlock as BaseHero } from '@hwp/core-ui/base-blocks';
export function HeroBlock({ content }) {
  return <BaseHero content={content} slots={{ heading: myCustomHeading }} />;
}

// Level 3 — Full custom (~10% of cases)
import type { HeroBlockContent } from '@hwp/core-ui/schemas';
export function HeroBlock({ content }: { content: HeroBlockContent }) {
  return <section>/* completely custom JSX */</section>;
}
```

#### 7. Slot pattern for base-blocks

Base-blocks define optional render slots for visual customization:

```ts
export type HeroBlockSlots = {
  media?: (image: ImageData) => React.ReactNode;
  heading?: (title: string, subtitle?: string) => React.ReactNode;
  cta?: (cta: CtaData) => React.ReactNode;
};
```

#### 8. Token cascade: global → semantic → brand

Three levels, resolved at build time inside `createHwpPreset()`. Compatible with Tailwind v3 (DEC-012). Client `tailwind.config.ts` files continue to work as-is — the cascade is internal to the preset function.

#### 9. CSS rules

- **ONE `globals.css` per client** in `src/app/globals.css`.
- **ZERO CSS files per block.** Blocks use only Tailwind utility classes and CVA recipes.

### Consequences

- `packages/core-ui/src/blocks/` is renamed to `packages/core-ui/src/base-blocks/`. Schemas move to `schemas/`, types to `types/`.
- `package.json` gains `"exports"` with three subpaths: `.`, `./base-blocks`, `./schemas`.
- BlockRenderer is refactored: the block instances prop is renamed `layout`; an optional `blocks` prop accepts the client block map.
- `scaffold-block` skill changes: now scaffolds into `base-blocks/` (for platform) or a client repo's `src/blocks/` (for client).
- New template: `scaffold-site` creates a client repo with base-block re-exports, registry, theme, globals.css.
- `apps/site-demo/` gains `src/blocks/` + `registry.ts` to mirror the client repo structure.
- Client repos that consume `@hwp/core-ui@<version>` get base-blocks as part of the package — no extra install needed.

### Alternatives considered

- **Keep blocks in core-ui, use only structural variants (DEC-008) for customization** — rejected. Does not scale to 300 clients with unique Figma designs. Pollutes the shared package with single-client variants.
- **Full headless (no base-blocks, every client writes from scratch)** — rejected. Too much duplication. Most clients (~70%) will re-export base-blocks with token changes only.
- **Slots without base-blocks** — rejected. Without a default implementation, every slot must be filled by every client, even for identical renders.
- **Base-blocks consumed via git submodule** — rejected per DEC-011. Submodule operational pain; loses semantic versioning.
- **DSE model (Make + Supabase + AI generation)** — rejected for V1. Elements (token cascade, composition rules, slots) adopted; infrastructure (Make, Supabase) not.
- **Blocks inside `apps/site-{slug}/` in the monorepo** — rejected per DEC-011. Client sites live in independent repos for scalability, developer isolation, and deploy independence.

---

## DEC-016 — Design agent: visual language extraction and block design without Figma reference

> **Status:** Accepted
> **Date:** 2026-06-01
> **Extends:** DEC-002 (Figma Make import), DEC-014 (Agent system), DEC-015 (Client-owned blocks)
> **Depends on:** DEC-015 executed first (base-blocks, schemas, slots)

### Context

The current workflow assumes every block has a Figma reference:

```
Figma design → /import-figma → tokens + analysis → implement block
```

In reality, the designer delivers 5–6 base pages per client. After that, the team needs to create blocks and pages that were **never designed in Figma**: a gallery with animations, a rates page with tabs, a seasonal offers landing, a FAQ section. Someone must make the visual decisions — layout, spacing, typography hierarchy, interaction style, animation approach.

Today, no one in the system fills this role:

1. **`ux-ui-analyst`** only **validates** implementations against existing Figma. If there is no Figma, the agent has nothing to compare against and cannot help.
2. **`/import-figma`** extracts tokens (colors, fonts, spacing, radii, shadows) but not the **design patterns** — the visual language that makes a client's site feel cohesive.
3. **Developers improvise.** When building a block without Figma, they make spacing/layout/hierarchy decisions ad hoc. With 300 clients, this produces visual inconsistency within a single site.

### Decision

Three additions to the HWP tooling system:

#### 1. Design language extraction (amplify `/import-figma`)

When `/import-figma` processes a client's Figma Make repo, it now produces an additional artifact: `docs/clients/{slug}/design-language.md`.

This document captures the **visual patterns** — not the token values (those are in `figma-analysis.md` and `tokens.json`), but how those values are applied: card style, section spacing, typography hierarchy, interaction style, visual density, component patterns.

The extraction is semi-automated: `/import-figma` scans the Figma Make components, identifies recurring patterns, and generates a first draft marked as `DRAFT — requires human review`. Once approved, it becomes the **visual contract for the client**.

#### 2. Evolve `ux-ui-analyst` to dual role

**Mode A — Validation (existing).** When a Figma reference exists, the agent compares implementation vs Figma. No change to this behavior.

**Mode B — Design proposal (new).** When NO Figma reference exists, the agent reads `docs/clients/{slug}/design-language.md`, the client's `tokens.json`, and 2–3 already-implemented blocks, then produces a **visual specification** for the new block that is consistent with the client's design language.

The agent declares which mode it is operating in at the start of its output.

The agent does NOT produce code. It produces a spec that the `planner` and `implementer` consume.

#### 3. New skill: `/design-block`

```
/design-block {BlockName} --client {slug}
```

Reads `design-language.md` + `tokens.json` + existing blocks, invokes `ux-ui-analyst` in Mode B, and saves the output as `docs/clients/{slug}/block-specs/{BlockName}.visual-spec.md` marked as `DRAFT — requires human review before implementation`.

Once the human approves the visual spec, the normal SPECBOOT cycle continues:
```
/propose uses visual spec → /apply implements → /verify → ux-ui-analyst Mode B re-verifies
```

### Why

- **Consistency without a designer.** The design language document captures what the designer intended. New blocks follow the same patterns even if the designer is not available.
- **Scales to 300 clients.** Each client's `design-language.md` is a 1-page document. Creating a new block for any client takes the same workflow.
- **No new agent needed.** Evolving `ux-ui-analyst` is simpler than creating a separate `designer` agent. The visual analysis skills for Mode B are a superset of Mode A.
- **Human in the loop.** The agent proposes; the human approves. No block is implemented from an AI-only design decision.
- **Complements DEC-015.** The three usage levels (re-export, slots, full custom) are most powerful with a clear visual spec. Level 2 (slots) especially benefits — the spec tells the implementer which slots to customize.

### Consequences

- `/import-figma` gains a second output: `design-language.md` alongside the existing `figma-analysis.md`.
- `ux-ui-analyst` agent file is updated with Mode A/Mode B documentation.
- New skill `/design-block` is created in `.claude/skills/design-block/`.
- New directory `docs/clients/{slug}/block-specs/` for per-client visual specifications.
- `docs/catalog.md` gains entries for the new skill and updates to `import-figma` and `ux-ui-analyst`.
- `planner` agent checks for `block-specs/{BlockName}.visual-spec.md` when no Figma reference exists.
- `docs/guides/daily-workflow.md` gains a section on the design-first workflow for non-Figma blocks.

### Alternatives considered

- **Dedicated `designer` agent** — rejected. Visual analysis skills overlap heavily with `ux-ui-analyst`; splitting creates coordination overhead and ambiguity about which agent to call.
- **Skip design language, let developers improvise** — rejected. With 300 clients and a team coming from WordPress, visual inconsistency within a single site is guaranteed.
- **Use AI to generate design images/mockups** — rejected for V1. A text-based visual spec (in terms of Tailwind classes and token references) is sufficient for implementation and avoids image generation API complexity.
- **Require the designer to create Figma for every block** — rejected operationally. The designer can deliver 2–3 designs per month, becoming a bottleneck at 12+ new blocks in Phase 1.
