# hwe — Decision Log

---

## DEC-001 — SPECBOOT skill format adopted from Septeo boilerplate
**Date:** 2026-05-15
**Status:** Accepted

### Context

We started building tooling skills directly in `.claude/commands/*.md` as narrative prose, without frontmatter, without sub-agent delegation, and without a formal lifecycle. After analyzing the `Septeo-ES/hospitality-ai-boilerplate` reference repo, we found a mature pattern we should adopt before writing more features.

### Decision

Adopt the boilerplate's SKILL.md format for all reusable hwe tooling:

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
- US-003 — Define `docs/specs/general/base-standards.md` for hwe.
- US-004 — Define `docs/specs/frontend/frontend-standards.md`.
- US-005 — Define `docs/specs/backend-standards.md`.
- US-006 — Create agent templates for the 5 hwe product agents.
- US-007 — Define component lifecycle (`alpha → beta → stable`) adapted to hwe.

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
{workspace-root}/
└── figma-makes/                    ← plain container, NOT a git repo
    ├── base-template/              ← own .git, reference Figma Make for demo/test
    ├── camping-sol/                ← own .git, clone of designer's repo
    └── {slug}/                    ← one folder per client
```

- One git repo per client at `figma-makes/{slug}/`, with its own `.git/`, independent from all project repos.
- Every import (initial clone or subsequent re-import) is sealed with `git tag import-YYYY-MM-DD`. Re-imports run `git pull --ff-only` against the same origin — never `rm -rf` + re-clone, so history is preserved.
- Generated artifacts (`figma-analysis.md`, `figma-notes.md`) live under `site-{slug}/docs/`, NOT inside the cloned repo. This keeps `figma-makes/{slug}/` pristine and avoids untracked-file noise on future `git pull`.
- The `figma-makes/` container lives at the workspace root — outside all project repos on purpose.

### Why

- **Isolation** — second client never touches the first; nothing to reconcile manually.
- **History for free** — `git log` + tags inside each client repo give us a complete, navigable record of every export. `git checkout import-2026-05-18` reproduces any past state exactly.
- **No duplication** — preferred Option A (tags) over Option B (snapshots in dated subdirectories) because tags are zero-byte, queryable with standard git tooling, and don't bloat disk usage when a single client gets re-exported 20 times.
- **No nested git** — `figma-makes/` is not a git repo. If it were, every client's `.git/` would become a submodule, which is operational overhead we don't want.

### Migration applied today

- Established `figma-makes/base-template/` as the reference Figma Make for the demo/test project.
- Updated `/import-figma` skill to use this layout, support re-imports via `git pull` + new tag, and write analysis/notes under `site-{slug}/docs/`.

### Alternatives considered

- **Snapshot subdirectories per import (`{slug}/YYYY-MM-DD/`)** — rejected. Duplicates files on every import, bloats disk, breaks the "this is the designer's repo with upstream" mental model.
- **Keep one `figma-make/` and rename on each client** — rejected. Lossy, manual, and `/import-figma` would have to be a destructive operation.
- **Nest `figma-makes/` inside `hwe-platform/`** — rejected. The cloned repos would be nested git repos relative to the platform repo, which means either ignoring them via `.gitignore` (so they're invisible from the platform's POV anyway) or adopting them as submodules (overhead for no benefit, since they're third-party design references, not platform code).

### Consequences

- `/import-figma <git-url> [slug]` is now the only way to bring in or refresh a client's Figma Make export.
- Devs querying "what did the designer ship for client X on date Y" run `git -C figma-makes/{slug} checkout import-YYYY-MM-DD`.
- When `site-{slug}/` repos are created (per architecture roadmap), `figma-makes/{slug}/` stays where it is — it's a separate concern from the deployable site repo.

---

## DEC-003 — Frontend layout, naming conventions, and docs split for token amortization
**Date:** 2026-05-18
**Status:** Accepted

### Context

We were ready to start implementing `@hwe/core-ui` and the first client site, but the architecture (`docs/architecture/architecture.md`) defines only the high-level monorepo shape and the block system principles — not the React file layout, naming conventions, or where validation schemas live. Without these settled and written down, every Claude Code session would re-derive them from `architecture.md` (4.224 lines, ~50k tokens), and they would drift across the 300 sites planned.

Two problems to solve together:

1. **Pick the conventions** (file structure, naming, schema location).
2. **Make them cheap to load** for any future automated session — a sub-agent scaffolding a single block must not need 50k tokens of context.

### Decision

#### Conventions (the structural choices)

1. **Folder per component** inside `packages/core-ui/src/blocks/{Name}/` (and `templates/`, `primitives/`). Each folder holds `{Name}.tsx`, `{Name}.variants.ts`, `{Name}.types.ts`, `{Name}.schema.ts`, `{Name}.test.tsx`. One folder = one atomic unit.
2. **Zod schemas co-located with their block/template** inside `core-ui`. The block owns its content contract. `core-ui` depends on `zod`. Payload field configs are derived from these schemas, not the reverse, so there is one source of truth.
3. **`src/` inside every `apps/site-{slug}/`** — so the apps layout matches the packages layout. Cross-monorepo scripts and codemods use a single pattern (`apps/*/src/**`, `packages/*/src/**`).
4. **Client compositions in `apps/site-{slug}/src/compositions/`**, separate from `app/`. Routes (`app/[locale]/page.tsx`) are thin wrappers that import a composition. Compositions are testable in isolation and reusable across routes.

Naming summary: folders kebab-case, React components PascalCase, hooks/utils camelCase, dynamic route param always `[slug]`, no internal barrels (only one `index.ts` at each package root), cross-package imports via `@hwe/...`, intra-package via `@/` alias to `src/`.

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
- **Schemas in `@hwe/content`** — rejected. Splits a block across two packages; creates a "which is the source of truth?" question for automation; sub-agents need to read two folders to understand one block.
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

The `TokensContract` Zod schema (in `@hwe/core-ui/src/theme/tokens.contract.ts`) accepts either:
- A single `Tokens` object (legacy, default), OR
- A `Record<seasonSlug, Tokens>` keyed by the season's `slug` field.

The `createhwePreset()` helper in `@hwe/config/tailwind-preset` accepts either and produces either a single Tailwind theme or N themes accessible via the `data-season` HTML attribute (e.g. `[data-season="winter"]` selectors override the base).

### Why

- Seasonality is a feature, not a global concern — most clients should not pay the complexity cost. A conditional shape preserves the simple case.
- Per-season files match how the agency thinks about the client's themes — the designer exports winter and summer as separate Figma variable sets.
- `data-season` scoping at runtime means we ship one CSS bundle per build (no extra builds per season); the active season is decided server-side and emitted on the `<html>` tag.

### Implementation impact

- `docs/contracts/frontend/theme-tokens.md` updated to describe both the single-theme and seasonized layouts.
- `TokensContract` becomes a discriminated union — implemented during Phase 0 US-004.
- `createhwePreset()` returns a Tailwind config whose `theme.extend` includes per-season overrides via `:where([data-season="..."])` selectors when given the seasonized input — implemented during Phase 0 US-002.
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

The hwe testing toolchain is:

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

- Phase 0 US-002 (`@hwe/config`) ships `vitest.config.ts` + a `@hwe/config/vitest` export for packages to extend.
- Phase 0 US-009 (CI) runs `pnpm test` (Vitest) and `pnpm test:e2e` (Playwright). Coverage thresholds enforced.
- Both Phase 2 enrich-story prompts (`enrich-us/phase-2-enrich-story.md`, `plan-to-stories/phase-2-enrich-story.md`) drop the Jest reference and the `should_..._when_...` naming convention. The pointer becomes "Vitest + @testing-library/react for unit/integration, Playwright for E2E".
- The `vitest-axe` dependency lands as part of `@hwe/core-ui`'s dev deps in US-003 (`@hwe/core-ui` skeleton).
- No tool is added to the catalog as a skill — these are runtime dependencies, not reusable components.

### Alternatives considered

- **Jest + Playwright** — rejected. Workable but pays a setup tax (TS, ESM, JSX transform, workspaces) that Vitest avoids. Equal capability, worse DX in 2026 Turborepo + Next 14 + TS.
- **Vitest + Cypress** — rejected. Cypress remains Chromium-only at the time of writing; cross-browser regression is part of the spec for a 300-client platform with varied admin browsers.
- **Vitest + Playwright + Storybook test-runner** — deferred. Storybook is a useful documentation surface for `core-ui` but adding it pre-Phase-0 inflates bootstrap. Revisit when there are ≥5 blocks worth documenting.
- **Vitest with `happy-dom` instead of `jsdom`** — accepted as default (it's already Vitest's default in 1.x), explicit pin via `environment: 'happy-dom'` in `@hwe/config/vitest`. `jsdom` reserved for the very rare test that needs full DOM compliance.

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

The hwe hosting stack is **Vercel for everything**:

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
- **The `BookingAdapter` and Payload schemas are unaffected.** They are defined in `@hwe/core-ui/src/adapters/booking/` and `@hwe/content` regardless of where they run.

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

`docs/contracts/frontend/structure.md` states: "No `src/blocks/index.ts`, no `src/blocks/HeroBlock/index.ts`". This DEC creates a controlled exception: a block with structural variants MUST have an `index.ts` that acts as the variant resolver. That `index.ts` is NOT a barrel re-export — it contains the resolver function. Consumers still import from `@hwe/core-ui` root (the public API rule is unchanged).

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

## DEC-010 — `BookingBlock` in `@hwe/core-ui`, `BookingProvider` in `@hwe/booking`
**Date:** 2026-05-21
**Status:** Superseded by DEC-017
**Supersedes:** the `@hwe/booking/react/` location for `BookingBlock` mentioned in `docs/architecture/architecture.md` (§Booking Engine).

> **Superseded by DEC-017.** The `@hwe/booking` package no longer exists — it was eliminated in DEC-017. `BookingAdapter`, `BookingProvider`, `useBookingAdapter()`, and all stock adapters now live in `@hwe/core-ui/src/adapters/booking/`. The rationale below (why BookingBlock stays in core-ui, why UI and domain are separated) remains valid and informed DEC-017. Read DEC-017 for the current implementation contract.

### Context

Two documents place `BookingBlock` in different locations:

- `docs/architecture/architecture.md` §Booking Engine shows `BookingBlock` in `@hwe/booking/react/`.
- `docs/contracts/frontend/block-contract.md` and `docs/contracts/frontend/structure.md` state that all blocks live in `@hwe/core-ui/src/blocks/`.

This creates ambiguity about where the UI component lives versus where the domain logic lives. It also blurs the boundary of `@hwe/booking`, which should be a domain + infrastructure package (interface + adapters), not a UI package.

### Decision

1. **`BookingBlock`** (the React component family) lives in `packages/core-ui/src/blocks/BookingBlock/`, like every other block. It MAY have structural variants per DEC-008 (e.g. `BookingInline`, `BookingModal`, `BookingIframe`).

2. **`BookingBlock` depends on the `BookingAdapter` interface** from `@hwe/booking` — never on a concrete adapter. It receives the adapter via React context, accessed through a `useBookingAdapter()` hook re-exported by `@hwe/booking`.

3. **`@hwe/booking` exports:**
   - The `BookingAdapter` interface (the port).
   - Stock adapters: THR, Masterbooking, Witbooking, Resalys (the infrastructure).
   - `BookingProvider` — the React context provider that wraps the app and injects the active adapter.
   - `useBookingAdapter()` — the hook blocks use to consume the adapter.

4. **`@hwe/booking` does NOT export React UI components.** Remove the planned `@hwe/booking/react/` directory. Keeping `BookingProvider` and `useBookingAdapter()` in the package is acceptable because they are domain-layer plumbing for context, not UI; they carry no JSX of their own beyond `<Context.Provider>`.

5. **The app's root layout wires the provider:**

   ```tsx
   // apps/site-{slug}/src/app/layout.tsx
   import { BookingProvider } from '@hwe/booking';
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
- `@hwe/booking` stays a domain + infrastructure package: adapter interface, concrete adapters, provider, hook. No `.tsx` page-section components.
- `BookingBlock` in `@hwe/core-ui` can be unit-tested without any concrete PMS adapter — tests mock the adapter via `BookingProvider`. This matches DEC-006 (Testing toolchain) and keeps coverage targets achievable.
- The architectural rule that "no block lives outside `@hwe/core-ui/src/blocks/`" becomes a hard invariant — `BookingBlock` was the exception that no longer exists.
- Multi-PMS clients (rare but specified in the domain model) compose their own adapter at `apps/site-{slug}/src/booking/` without changing `@hwe/core-ui`.

### Alternatives considered

- **`BookingBlock` in `@hwe/booking/react/`** — rejected. Puts UI inside a domain package, violates the single-responsibility of `@hwe/booking`, and breaks the "all blocks in core-ui" invariant. Also forces `@hwe/booking` to depend on React and Tailwind, which it currently does not.
- **No provider — pass `adapter` as a prop to every `BookingBlock`** — rejected. Every composition that uses `BookingBlock` would need to import and wire the adapter. The provider does that once at the root, and other adapters that may follow (analytics, AI) can reuse the same pattern.
- **`BookingBlock` in `@hwe/core-ui` but `BookingProvider` also in `@hwe/core-ui`** — rejected. The provider's job is to expose the active `BookingAdapter`, which is `@hwe/booking`'s contract. Putting the provider in `@hwe/core-ui` would make `@hwe/core-ui` depend on knowledge that belongs to the booking domain.

## DEC-011 — Client sites live in independent repos, monorepo holds only platform + reference site
**Date:** 2026-05-21
**Status:** Superseded by DEC-017

> **Superseded by DEC-017.** The split described here was executed and formalized in DEC-017, which also renamed `hwe-platform/` to three separate repos (`hwe-tools`, `hwe-core`, `hwe-template`). References to `hwe-platform/` below are historical. The rationale and the "one independent repo per client" principle remain valid.

### Context

The walking skeleton (per `docs/docs/plans/walking-skeleton.md`) bootstraps the platform as a full monorepo containing `packages/*` (the `@hwe/*` packages) AND `apps/site-demo/` (a reference camping site). That layout is fast for validation: one `pnpm install`, one Turborepo cache, one local dev loop.

The scale target is **300 clients**. Continuing the monorepo path means 300 apps inside `apps/`:

- Build/CI time grows linearly with client count even for unrelated changes.
- Every client's `tsconfig`, lint config, Tailwind preset extension and test matrix can drift; cross-client invariants become hard to enforce.
- A single failing client app blocks the workspace's `pnpm -r build` / CI gate.
- Agency-facing operations couple across clients (who can merge what, who can deploy what).

The hosting target ([DEC-007](#dec-007--vercel-full-stack-hosting-replaces-cdmon--hetzner--mariadb)) is already "one Vercel project per client" — independent deploy boundaries. The repo layout should match.

### Decision

1. **Production client sites live in independent git repos**, one per client (e.g. `site-{slug}/`, hosted under the agency's org on the same git provider as `hwe-platform/`).
2. **The `hwe-platform/` monorepo holds only:**
   - `packages/*` — the `@hwe/*` packages (`core-ui`, `booking`, `content`, `config`, etc.).
   - `apps/site-demo/` — a single reference site used to validate package releases end-to-end before publishing.
   - Platform documentation, decisions, plans, skills (`docs/`, `docs/architecture/`, `docs/`, `docs/plans/`, `.claude/`).
3. **Client repos consume `@hwe/*` via a private npm registry** (GitHub Packages or Verdaccio — final choice resolved before client #1; default position is GitHub Packages because it is already the registry referenced in [DEC-007](#dec-007--vercel-full-stack-hosting-replaces-cdmon--hetzner--mariadb) §npm registry).
4. **Client repos are bootstrapped from a template repo** (`site-template`, TBD before client #1) that ships: `package.json` with `@hwe/*` dependencies pinned, `client.config.ts`, `src/theme/tokens.json`, `src/compositions/`, `src/app/` skeleton, `next.config.mjs`, Vercel config.
5. **The walking skeleton (this milestone)** stays in `apps/site-demo/` inside the monorepo. Migration of the per-client model — splitting into independent repos + standing up the private registry + writing the template — happens **before the first real client onboarding**, not during walking-skeleton validation.

### Consequences

- **Package versioning becomes load-bearing.** `@hwe/core-ui` and friends ship as semver releases via the private registry. Client repos pin to a version and consciously bump. Breaking changes in `core-ui` no longer ripple silently into every client.
- **Cross-cutting changes need a propagation step.** A new block contract is a PR to `hwe-platform/` → release → bump in N client repos. Accepted cost in exchange for client isolation and the freedom for clients to stay on older versions when business reasons demand it.
- **CI per client is small, independent, and fast.** A failing build in client A does not block client B's deploy.
- **`apps/site-demo/`** is the canonical "what does a real client app look like" reference. The template repo is generated from it (or kept in lockstep). The demo must always build green or releases of `@hwe/*` are blocked.
- **Deferred work, sequenced before client #1:**
  - Stand up the private npm registry (GitHub Packages provisioning + tokens).
  - Publish `@hwe/core-ui@0.1.0`, `@hwe/config@0.1.0`, `@hwe/booking@0.1.0` from the monorepo.
  - Create `site-template/` repo (separate from `hwe-platform/`) that bootstraps a new client.
  - Define the version-bump workflow (Changesets candidate, decided in its own DEC).
- **The "all clients in a single Turborepo" mental model is dropped.** Tooling like Renovate / Dependabot operates per client repo against the private registry, not via shared lockfiles.

### Alternatives considered

- **Keep all 300 client apps inside `hwe-platform/apps/`.** Rejected. Build and CI time grow with N; agency operations couple across clients; one broken `apps/site-foo/` blocks `pnpm -r build`; storage and clone time scale poorly.
- **`@hwe/core-ui` consumed via git submodule from each client repo.** Rejected. Submodule operational pain (developers forget to update, detached HEADs, weird CI states); loses semantic versioning; updates require touching every client repo's `.gitmodules` instead of a version bump.
- **Single client repo containing all clients, separate from the platform monorepo.** Rejected. Re-creates the same monorepo problems one layer down — a "monorepo of clients" instead of "monorepo of platform + clients" still couples 300 deploys.
- **Publish to public npm.** Rejected. The packages encode agency-specific design decisions, partner adapter wiring, and patterns the platform does not want public until the offering is mature. Private registry preserves optionality.

---

---

## DEC-012 — Tailwind v3 over v4 for the walking skeleton
**Date:** 2026-05-21
**Status:** Superseded by DEC-017

> ⚠️ **Superseded by [DEC-017](#dec-017--repo-split-tools-submodule--core-npm--template--client-repos) (2026-06-03).** The stack moved to **Tailwind v4 (CSS-first `@theme`)**. The decision below — pinning v3 for the walking skeleton because the token pipeline was built around a JS preset (`createhwePreset()` returning `Partial<Config>` + `presets: [...]`) — is preserved as historical record. The v4 token pipeline (whether `tokens.json` + `TokensContract` survive, or `@theme` CSS becomes the only source) is an open hwe-core rewrite tracked in `docs/contracts/frontend/theme-tokens.md`. New work targets v4.

### Context

The walking skeleton (per `docs/docs/plans/walking-skeleton.md`) needs Tailwind wired into `apps/site-demo` so the Camping Mer et Camargue palette and fonts reach the browser. The reference Figma export (`figma-makes/base-template/src/styles/theme.css`) is authored in **Tailwind v4 syntax** — CSS-first config via `@theme inline` directives. That tempts us to adopt v4 directly.

But the hwe token pipeline documented in `docs/contracts/frontend/theme-tokens.md` is built around a **JavaScript preset**:

1. `apps/site-{slug}/src/theme/tokens.json` is parsed at build time by `TokensContract` (Zod schema in `@hwe/core-ui`).
2. The parsed `Tokens` object is passed to `createhwePreset(tokens)` in `@hwe/config`, which returns a `Partial<Config>`.
3. `apps/site-{slug}/tailwind.config.ts` lists `[createhwePreset(tokens)]` under `presets`.

That `Partial<Config>` + `presets: [...]` shape is **Tailwind v3 API**. Tailwind v4 removes JS presets in favor of CSS `@theme` directives — the token pipeline as designed in `docs/contracts/frontend/theme-tokens.md` cannot be expressed in v4 without rewriting the contract.

### Decision

1. The walking skeleton (and the foreseeable Phase 0/1 work) uses **Tailwind CSS v3.4**.
2. The Figma export's `theme.css` (v4 syntax) is read as a **reference for color and font values only**, not copied as code. The values are extracted into `tokens.json` and consumed via the v3 JS preset pipeline.
3. Migration to Tailwind v4 is **deferred** until both gates clear:
   - The Next.js + Tailwind v4 + Turborepo + pnpm combination is stable for production use (no recurring HMR / build pipeline issues).
   - The CVA + Tailwind v4 ecosystem is stable (CVA's variant compilation works against v4's CSS-first theme without contract drift).
4. When the migration is on the table, it ships as a new DEC that supersedes the v3 sections of `docs/contracts/frontend/theme-tokens.md` and rewrites `createhwePreset` against the v4 contract — not as a silent dependency bump.

### Consequences

- `apps/site-demo/package.json` and `packages/config/package.json` pin Tailwind to `^3.4.x` until the migration DEC lands.
- `docs/contracts/frontend/theme-tokens.md` remains the source of truth as-is; no v3-vs-v4 caveat banner is needed because v3 is the only supported target today.
- New tokens added to the contract land in v3 form (`theme.extend.colors`, `theme.extend.fontFamily`, etc.). Designers who export from Figma in v4 syntax have their output **mapped** by the extraction step, not copied verbatim.
- The v4 syntax in `figma-makes/base-template/src/styles/theme.css` is preserved as historical reference — the Figma Make repos are pristine clones ([DEC-002](#dec-002--one-figma-make-repo-per-client-tagged-per-import)), we do not edit them.

### Alternatives considered

- **Adopt Tailwind v4 now and rewrite the token contract.** Rejected for the walking skeleton. Rewriting `theme-tokens.md`, `tokens.contract.ts`, and `createhwePreset` in CSS-first form would block delivery of the walking skeleton on a tooling redesign whose payoff is uncertain (CVA + Next.js + Turborepo + v4 still has rough edges). Deferring keeps the path to localhost short.
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

The team building hwe comes entirely from a WordPress background. In WordPress, one developer typically handles design fidelity, SEO, security, and documentation manually — relying on their own judgment for every concern. At the scale of 300 clients and a multi-package monorepo, this single-developer mental model does not scale: quality gates get skipped under pressure, concerns get mixed in the wrong layer, and the knowledge base drifts.

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

The root export (`@hwe/core-ui`) does NOT re-export base-blocks. Client code explicitly chooses whether to use the base-block or its own implementation.

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
export { HeroBlock } from '@hwe/core-ui/base-blocks';

// Level 2 — Slots (~20% of cases)
import { HeroBlock as BaseHero } from '@hwe/core-ui/base-blocks';
export function HeroBlock({ content }) {
  return <BaseHero content={content} slots={{ heading: myCustomHeading }} />;
}

// Level 3 — Full custom (~10% of cases)
import type { HeroBlockContent } from '@hwe/core-ui/schemas';
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

Three levels, resolved at build time inside `createhwePreset()`. Compatible with Tailwind v3 (DEC-012). Client `tailwind.config.ts` files continue to work as-is — the cascade is internal to the preset function.

> ⚠️ **Mechanism superseded by [DEC-017](#dec-017--repo-split-tools-submodule--core-npm--template--client-repos).** The stack is now Tailwind v4 CSS-first. The three-layer cascade (global → semantic → brand) remains the intent, but it no longer resolves through `createhwePreset()` / `tailwind.config.ts`; under v4 it flows through `@hwe/config/theme.css` (base) + the client's `@theme {}` override in `globals.css`. See `docs/contracts/frontend/theme-tokens.md`.

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
- Client repos that consume `@hwe/core-ui@<version>` get base-blocks as part of the package — no extra install needed.

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

Three additions to the hwe tooling system:

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

---

## DEC-017 — Repo split: tools (submodule) + core (npm) + template + client repos

> **Status:** Accepted
> **Date:** 2026-06-03
> **Extends:** DEC-011 (independent client repos), DEC-015 (client-owned blocks)
> **Supersedes:** The single `hwe-platform/` monorepo containing tools + code + docs together

See full spec: `docs/architecture/DEC-017-Repo-Split.md`

### The decision

Split the current `hwe-platform/` monorepo into three purpose-built repos:

| Repo | Contains | Delivery |
|---|---|---|
| `hwe-tools` | Skills, agents, commands, docs, specs, contracts, guides | **Git submodule** (mounted as `.hwe-tools/`) |
| `hwe-core` | React packages: schemas, base-blocks, primitives, renderer, theme, adapters | **npm packages** (`@hwe/core-ui`, `@hwe/config`) |
| `hwe-template` | Empty starter structure for new clients | **GitHub template repo** |

Client repos are independent, created from the template, and consume tools via submodule + core via npm.

`@hwe/booking` package is eliminated — booking adapters move to `@hwe/core-ui/src/adapters/booking/`.

### Stack versions (binding from this DEC)

- Next.js 15
- React 19
- Tailwind v4 with CSS-first `@theme` (replaces JS presets from v3)
- TypeScript 5.x strict

### Consequences

- `CLAUDE.md` in hwe-tools describes the tools repo only, not the monorepo.
- `compatibility.json` maps tool versions to compatible `@hwe/core-ui` versions.
- `.claude/templates/design-language.md` and `.claude/templates/visual-spec.md` replace `docs/clients/_template/`.
- Client repos use `.hwe-tools/` submodule path instead of a shared monorepo.
- All skill paths updated: `hwe-platform/apps/{slug}/` → `site-{slug}/` or relative CWD paths.
- Skill `globals.css` template updated to Tailwind v4 syntax (`@import "tailwindcss"` + `@theme {}`).
- `docs/audits/`, `docs/clients/`, `docs/stories/`, `docs/plans/` removed from hwe-tools — these belong in project repos, not in the tools submodule.

---

## DEC-018 — Retire `architecture.md` as the constitution: thin overview + legacy archive

> **Status:** Accepted
> **Date:** 2026-06-04
> **Deciders:** Cristina Gutiérrez
> **Supersedes:** the "annotate, never rewrite the constitution" policy of [DEC-003](#dec-003--frontend-layout-naming-conventions-and-docs-split-for-token-amortization) **for documents that have become majority-stale.** DEC-003's token-amortization decisions (folder-per-component, schemas in core-ui, docs split, the `docs/README.md` index) all stand.

### Context

`docs/architecture/architecture.md` was written as the system "constitution" when hwe was a single `hwe-platform/` monorepo on cdmon + Hetzner + MariaDB + PHP. Since then, DEC-007 (Vercel), DEC-011 (independent client repos), DEC-015 (client-owned blocks) and DEC-017 (3-repo split) have rewritten almost all of its substance. Per DEC-003 the policy was *annotate with banners, do not rewrite*. That policy has now failed for this document specifically:

1. **Banners do not protect partial readers.** A banner at line 3 says "activeBlocks superseded by DEC-009", and 220 lines later the `client.config.ts` example still shows `activeBlocks`. With selective loading (the norm per `docs/README.md`), readers enter mid-document and read stale bodies as current. The banner only helps a linear reader from line 1 — which the same index tells them not to be.
2. **The premise broke.** "Don't rewrite because it's stable" held when the doc was mostly correct. It is now >70% superseded (infra, packages, monorepo, stack versions, client config). It is no longer a stable constitution with annotations — it is a historical archive with islands of current truth.
3. **It violates DEC-003's own token-amortization principle.** A ~4.3k-line document that the docs explicitly say "never load whole" is dead weight: loaded, it is expensive and polluting; not loaded, it is the source of nothing.
4. **The live truth already migrated.** `workspace-structure.md`, `contracts/`, `specs/`, `domain-model.md` and `decisions.md` are the canonical sources today. `architecture.md` duplicates the live parts (with stale versions) and monopolizes the parts not yet rehomed.

### Decision

1. **`architecture.md` becomes a thin overview (~1 screen):** vision + current stack + a "where each thing lives" index pointing to the canonical docs. It stops being a section-by-section reference.
2. **Dead infrastructure narrative moves to `architecture-legacy.md`,** explicitly labeled as a historical archive (cdmon / Hetzner / MariaDB / PHP proxy / Verdaccio / `hwe-platform` monorepo / eliminated `@hwe/*` packages / old CI-CD-SSH / staging-backups-monitoring-on-cdmon / OpenAPI aspiration / the old `client.config.ts` snippet with `activeBlocks`).
3. **Still-valid content with no canonical home is extracted first, then the source is archived:**
   - Product content-AI system (5 content agents, prompts, bulk editing, client portal, evals, prompt chaining) → new `docs/specs/ai/content-operations.md`, with an explicit separation from the 11 Claude Code dev agents (kills the duplicated-"planner" confusion).
   - Topics already covered elsewhere (dynamic pages, feature flags, booking, security, SEO, WordPress migration, onboarding, context engineering) are **dropped, not copied** — they live in their canonical docs.
4. **`client.config.ts` shape is NOT documented as authority in hwe-tools.** Its *definition* is the **`TenantConfig`** type exported by `@hwe/core-ui` (`providers/TenantProvider`) — minimal today (`name`, `locale`, `defaultLocale?`, `hasSeasons?`, `defaultSeason?`), no Zod schema yet. The canonical name is **`TenantConfig`** (the code's name); earlier DECs/docs called it `ClientConfig` — same concept, one name now to end the dual naming. The rich fields (`bookingAdapter`, `features`, `blockDefaults`, `locales`, `theme`…) are **roadmap, not yet built**. hwe-tools describes semantics (in `domain-model.md`) and points to the type; it must never list the fields as authority — that is what let `activeBlocks` rot.
5. **Stack confirmed binding (already set by DEC-017):** Next.js 15, React 19, Tailwind v4 (CSS-first `@theme`), TypeScript 5.x strict. DEC-012 (Tailwind v3) is marked superseded.

### Policy change (the part that supersedes DEC-003)

Banners remain the right tool for **pointwise, recent supersessions** in a document that is still mostly correct (e.g. DEC-009 on one field, DEC-010 on one location). When a document needs **more than ~3 banners**, or is majority-stale, the correct action is to **split it** (extract live content to canonical homes → thin overview + labeled legacy archive), not to keep annotating. The decision log (`decisions.md`) is exempt — it is append-only by nature and continues to be annotated, never rewritten.

### Consequences

- `architecture.md` rewritten as overview; `architecture-legacy.md` created.
- `content-operations.md` created and indexed in `docs/README.md` + `docs/catalog.md`.
- `CLAUDE.md` and `docs/README.md` references to "the constitution / load sections of architecture.md" updated to point at the overview + canonical docs.
- DEC-012 marked `Superseded by DEC-017`; DEC-015 §8 annotated for the v4 mechanism.
- **Pending (out of scope — hwe-core):** expand `TenantConfig` toward the documented target (`bookingAdapter`, `features`, `blockDefaults`, `locales`, `theme`…) as the platform is built, and decide whether it warrants Zod validation. Must reflect DEC-009/010/015 (with `blockDefaults`, never `activeBlocks`/`database`/`cmsDomain`). Code story in hwe-core, TDD-first. `site-demo` is the living fixture where this grows incrementally.

### Alternatives considered

- **Keep annotating with banners (status quo per DEC-003).** Rejected — see Context. Banners on a majority-stale doc produce internal contradictions and do not help selective readers.
- **Delete `architecture.md` and rely on `git log` for history.** Rejected — the historical infra narrative is more discoverable in a labeled `architecture-legacy.md` than in git history for someone asking "why is there PHP in here?". Also risks losing not-yet-rehomed content if deleted before extraction.
- **Rewrite `architecture.md` in full as a new current constitution.** Rejected — re-creates a large always-stale monolith and re-introduces the very token-amortization problem DEC-003 solved. The canonical docs are already the constitution, distributed.

---

## DEC-019 — `site-demo` is the single source; `hwe-template` is generated from it

> **Status:** Accepted
> **Date:** 2026-06-04
> **Deciders:** Cristina Gutiérrez
> **Resolves:** the "generated from `site-demo` **or** kept in lockstep" ambiguity left open in [DEC-011](#dec-011--client-sites-live-in-independent-repos-monorepo-holds-only-platform--reference-site).

### Context

Two things could each act as "the example client": `hwe-core/apps/site-demo/` (the package-validation fixture, which consumes `@hwe/core-ui` via local workspace link for a fast inner loop) and `hwe-template` (the GitHub template a real client is cloned from, which consumes the **published** `@hwe/core-ui` at a pinned version). Maintaining both by hand would mean two parallel codebases drifting apart. But only the template-based path exercises the **real onboarding flow** (published package + submodule + clone), which is `site-demo`'s blind spot.

The owner's constraint: **do not maintain two things**, but **be able to validate the real flow eventually**.

### Decision

1. **`site-demo` is the single hand-maintained source of truth.** It already mirrors a client repo's structure (DEC-015). It is the fast inner-loop fixture (local link) used while building `@hwe/core-ui`. Only `site-demo` is edited by hand.
2. **`hwe-template` is a generated artifact, not maintained in parallel.** It is produced from `site-demo` by a generator (a script, or the `/scaffold-site` skill in reverse) that: copies the client-repo structure, **swaps the dependency wiring** (local `workspace:` link → pinned published `@hwe/core-ui@<version>`), and strips demo content. Regenerated per release; never edited by hand alongside `site-demo`.
3. **Real-flow validation is a periodic action, not a second codebase.** When wanted (deferred to the pre-launch milestone, when packages are stable enough to publish): generate `hwe-template` from `site-demo` → publish the packages → clone the template as a client would → `install` + `build` + smoke test. The only thing this proves that `site-demo` cannot is the published-package path — which is exactly the dependency swap in step 2.
4. **Do not build `hwe-template` yet.** Premature while the packages are embryonic (only `HeroBlock` implemented, `adapters/` not built). Building it now would stand up the publish pipeline + registry + template + submodule wiring before there is anything worth consuming, and would force the slow publish loop during heavy package development.

### Why

- **One source, no drift.** `site-demo` is the only hand-maintained client-shaped repo; the template is derived, so the two cannot diverge.
- **Fast inner loop preserved.** Package development stays on the local-link fixture; nobody pays the publish-loop tax while building blocks.
- **Real flow still validated.** The generate→publish→clone→smoke pass exercises the exact path a client takes, on demand, without a second maintained repo.

### Consequences

- A generator (`site-demo` → `hwe-template`) is needed before the first real-flow validation. Tracked as a future skill/script; not built now.
- `site-demo` must stay a faithful mirror of a client repo (per DEC-015) — that faithfulness is what makes the generated template correct.
- The pre-launch checklist gains: "generate `hwe-template`, publish packages, clone + smoke test" before client #1.

### Alternatives considered

- **Maintain `hwe-template` and `site-demo` in parallel (lockstep by hand).** Rejected — two codebases drift; doubles maintenance; violates the owner's "don't maintain two things" constraint.
- **Make `hwe-template` the source and `site-demo` an instance of it.** Rejected — the template pins published packages, which breaks the fast inner loop that package development needs.
- **Build `hwe-template` now.** Rejected — premature; see Decision step 4.

---

## DEC-020 — Lint toolchain: one shared ESLint flat config exported from `@hwe/config`

> **Status:** Accepted
> **Date:** 2026-06-08
> **Deciders:** Cristina Gutiérrez
> **Resolves:** the lint gate was declared (`eslint src` / `next lint` scripts) but had no ESLint install and no config anywhere — it could never pass. Establishing the toolchain is a new tooling decision, parallel to [DEC-006](#dec-006--testing-toolchain-vitest--playwright--testing-library).

### Context

Four CI gates are intended: typecheck, **lint**, test, build. The lint gate existed only as npm scripts; ESLint itself was not installed and no config file existed in `hwe-core`, so the gate was structurally red. Lint is not only `hwe-core`'s concern: it is a rule for **every** repo in the platform — the `@hwe/core-ui` + `@hwe/config` packages, `site-demo`, and every generated `site-{slug}` client repo. A per-repo `.eslintrc` copied around would reproduce the "dragged, undocumented, drifting decision" disease the foundation cleanup exists to cure.

### Decision

1. **One shared ESLint flat config (ESLint 9), exported from `@hwe/config` as the subpath `@hwe/config/eslint`** (`packages/config/eslint.mjs`). `@hwe/config` is already the platform config package and is already published, so independent `site-{slug}` repos consume the same config over npm. No third package is created — this respects [DEC-017](#dec-017--repo-split-tools-submodule--core-npm--template--client-repos) ("only `@hwe/core-ui` + `@hwe/config`").
2. **Two layers.** `base` (`typescript-eslint` recommended + `eslint-plugin-react-hooks` + `@typescript-eslint/no-explicit-any: error`, enforcing the existing "no `any`" rule) for packages; `next` (`base` + `@next/eslint-plugin-next` recommended + core-web-vitals) for Next.js apps.
3. **Each repo's `eslint.config.mjs` is a 3-line re-export** of the layer it needs (`base` for `core-ui`, `next` for `site-demo` and every `site-{slug}`). Plugin dependencies live in `@hwe/config`, so consumers only need `eslint` itself.
4. **`site-demo` lint runs `eslint .`, not `next lint`.** `next lint` is deprecated in Next 15 in favour of the ESLint CLI; running `eslint` directly keeps every repo on one uniform flat-config toolchain.
5. **Deliberately NOT type-aware** (no `parserOptions.project`) — fast, no per-repo project wiring. Tighten with a follow-up DEC if needed.

### Why

- **Single source, no drift.** Lint rules change in exactly one file; every package and client repo inherits the change.
- **Respects DEC-017.** Config ships from an existing published package; no new package, no contradiction.
- **Forward-looking and uniform.** Flat config + `eslint .` is the modern path; `next lint`'s deprecation does not strand the platform.

### Consequences

- `@hwe/config` gains runtime dependencies (`@eslint/js`, `typescript-eslint`, `eslint-plugin-react-hooks`, `@next/eslint-plugin-next`) and a new `./eslint` export. Its responsibility now spans TS base config, theme tokens, **and** lint config.
- Every generated `site-{slug}` ships the same 3-line `eslint.config.mjs`; the `site-demo`→`hwe-template` generator (DEC-019) must emit it.
- `@hwe/config` itself has no `lint` script yet (no source beyond the config); add one if the package grows lintable source.

### Alternatives considered

- **A separate `@hwe/eslint-config` package.** Rejected — contradicts DEC-017's two-package rule; `@hwe/config` is the natural home.
- **Per-repo `.eslintrc` copied into each client.** Rejected — reproduces the drifting-duplicate-config disease the cleanup targets.
- **Keep `next lint` for apps.** Rejected — deprecated in Next 15; splits the toolchain (eslintrc for apps, flat for packages).
- **Full type-aware strict rules now.** Rejected for Fase A — scope creep over embryonic scaffolded code; revisit via a later DEC.

---

## DEC-021 — One canonical client reference (`site-demo`), `SITE_DIR` path convention, and contract↔reference reconciliation

> **Status:** Accepted
> **Date:** 2026-06-08
> **Deciders:** Cristina Gutiérrez
> **Reaffirms:** [DEC-019](#dec-019--site-demo-is-the-single-source-hwe-template-is-generated-from-it) (do not build `hwe-template` yet). **Reconciles** divergences between `docs/contracts/frontend/structure.md` and the actual `site-demo` reference that were causing repeated path confusion and breakage while fixing the generator skills (Fase B).

### Context

Fixing the generator skills (`scaffold-block`, `scaffold-site`, `add-block`, `create-page`) kept breaking because there was no single canonical client-shaped reference: `site-demo` (in the monorepo, workspace-linked, minimal), the `structure.md` contract (fuller: `SiteShell`, `sitemap`, locale), and a hypothetical future `hwe-template` each implied different paths and structures. Every skill edit had to guess which to obey. Three concrete divergences surfaced between the contract and the working, green `site-demo`.

### Decision

1. **`site-demo` is the single canonical client reference.** It IS the content of the future `hwe-template` (minus the dependency swap, which is generation-time per DEC-019). Where the contract and `site-demo` disagree, they are reconciled here and locked. Building a standalone `hwe-template` now is rejected (reaffirms DEC-019): it consumes the not-yet-published package and falls outside `hwe-core`'s turbo gates.

2. **`SITE_DIR` / `PKG` path convention, defined once in `docs/contracts/general/workspace-structure.md`** §"Skill path resolution". `SITE_DIR` = the target site root (`hwe-core/apps/{slug}` for the fixture — the one documented exception — or the repo root for a standalone client, which self-locates via its mounted `hwe-tools` submodule). `PKG` = `{SITE_DIR}/node_modules/@hwe/core-ui` (installed package; ships `src/`). It lives in `hwe-tools` (mounted in every repo; `hwe-core` is absent from client repos). It is a **rule, not a registry** — no client project is ever listed, future `site-{slug}` repos are never "added". Site-targeting skills **reference** it; they never re-derive or hardcode paths.

3. **(A) `baseBlockRegistry` is `Record<string, BlockComponent>`** (bare component, cast at the type-erasure boundary), matching the current `@hwe/core-ui` code and `BlockRenderer`. Base blocks are **not** auto-registered by default; clients own blocks via their own `registry.ts` (DEC-015). Registering a base block in `baseBlockRegistry` is an **optional** platform-default. The richer `Record<BlockType, { component, contentSchema, variants? }>` form (which would enable Zod validation inside the renderer) is **deferred** to a future DEC if/when needed. `structure.md` and `scaffold-block` Step 5 are aligned to the code, not the other way round.

4. **(B) Client blocks are folder-per-component, including Level-1 re-exports.** A Level-1 re-export is `src/blocks/{Name}/{Name}.tsx` containing `export { {Name} } from '@hwe/core-ui/base-blocks'` — matching `site-demo` and the generator skills. This **reverses** the prior `structure.md` line ("Level 1 re-exports are declared directly in registry.ts — no subfolder needed"). Rationale: a stable local module path + an obvious in-place upgrade path to Level 2/3, and uniform registry imports.

5. **(C) `site-demo` stays minimal for now; `create-page`'s `sitemap`/navbar steps are conditional** (skip when absent). The only conformance applied now is the **`<main>` landmark** (a11y): the bare root layout means the composition owns `<main>`. Growing `site-demo` to the full client shell (`SiteShell`, `sitemap.ts`, `robots.ts`, locale routing) is deferred to a separate task — not bundled into the skill fixes.

6. **Maintainability guardrail (fix-and-verify).** A skill is correct iff running its prescribed output into `site-demo` leaves the four gates green. `site-demo` is git-revertible, so verification is cheap and repeatable: run → `turbo run typecheck lint build` → revert. No SKILL.md is edited "blind"; a file that is already green is not rewritten without first contrasting it with the contract.

### Why

- **One reference, one path variable, one contract — no drift.** Collapses the three competing structures into a single source of truth, which is what was causing the breakage.
- **No redo later.** The per-block/page skills are written against `SITE_DIR`/`PKG` and work unchanged for the fixture and for real clients; the only client-vs-fixture difference (the `workspace:*` → npm dependency swap) lives in one place (`scaffold-site` / template generation), exactly as DEC-019 designed.
- **Nothing green is broken.** Reconciliation aligned the contract to the working reference where the contract was aspirational; the only `site-demo` code change is the additive `<main>` landmark.

### Consequences

- `docs/contracts/frontend/structure.md` updated: `baseBlockRegistry` shape (A) and client-block folder layout (B).
- `docs/contracts/general/workspace-structure.md` gains the `SITE_DIR`/`PKG` definition; skills reference it.
- `scaffold-block` Step 5 base edits: public API via the `./base-blocks` + `./schemas` subpaths (required); `baseBlockRegistry` entry optional and bare-component-shaped.
- Deferred, tracked: richer `baseBlockRegistry` form (A); full `site-demo` shell conformance (C); the `generate → publish → clone → smoke test` published-package validation (already DEC-019). The published-package boundary risk is minimized now by `site-demo` importing only via public subpaths.

### Alternatives considered

- **Build `hwe-template` now to remove the site-demo/template duality.** Rejected — reintroduces the publish-loop tax DEC-019 avoids, adds a third path model, and falls outside `hwe-core`'s gates. The duality is a sequencing (site-demo now, template generated later), not a parallel-maintenance burden.
- **Conform `site-demo` UP to the full contract (SiteShell/sitemap/locale) now.** Deferred — scope creep into the skill-fix phase; done as a separate task.
- **Align the contract DOWN by deleting locale/SiteShell/sitemap as concepts.** Rejected — they are real future client needs, not wrong; only their *mandatory-now* status is relaxed.
- **Richer `baseBlockRegistry` (`{component, contentSchema}`) now.** Deferred — a code change to green `@hwe/core-ui` with no current consumer; revisit when renderer-side Zod validation is actually wired.

---

## DEC-022 — Design system: token-driven shared primitives; `globals.css @theme` is the single per-project visual source

> **Status:** Accepted
> **Date:** 2026-06-08
> **Deciders:** Cristina Gutiérrez
> **Builds on:** [DEC-012/Tailwind v4 CSS-first], [DEC-015](#dec-015--client-owned-blocks-with-shared-schemas-slot-based-composition-and-npm-subpath-exports), [DEC-021](#dec-021--one-canonical-client-reference-site-demo-sitedir-path-convention-and-contractreference-reconciliation).

### Context

After wiring the visual pipeline (DEC-021 + the Tailwind `@source` fix), blocks rendered with tokens but still looked undesigned: CTAs were raw `<a>`/`<button>` with no styling. The Figma achieves its look by composing a **styled primitive layer** (shadcn `components/ui/*`), not by styling each block. We had no primitive layer (`@hwe/core-ui/src/primitives/` was empty). The question: where does the full visual language (buttons, hovers, eyebrow, shadows…) live, and how does a new block — or a new client — inherit it automatically?

### Decision

1. **A token-driven shared primitives layer in `@hwe/core-ui/src/primitives/`.** Built now: `Button` (`primary | accent | outline | ghost`, sizes, `onDark`, hover) and `Eyebrow`. Their recipes use **only theme-token classes** (`bg-primary`, `rounded-md`, `text-accent`, `tracking-eyebrow`, …) — never hardcoded brand values. Exported from the package root (`@hwe/core-ui`). Blocks **compose** them; blocks never re-style atoms.

2. **`globals.css @theme` is the single source of truth for a project's visual language** — and it holds the **full** layer, not just colors: colors, fonts, radii (square vs rounded), shadows, eyebrow tracking, etc. The same shared primitive renders per-project purely from these token values.

3. **No `design-system.ts`/config.** The stack is Tailwind v4 CSS-first; tokens live in `@theme`. A parallel TS token object would be a second source of truth → drift. One source: the CSS `@theme`. (`tokens.json` is only the import transport; `TokensContract` only validates it.)

4. **`import-figma` extracts the atomic visual layer** (CTA recipe, hover, eyebrow tracking, shadows) into `tokens.json`/`design-language.md`; **`scaffold-site` pours the full layer** into `globals.css @theme` and wires `@source`. So every client gets the design system, automatically, from one place.

5. **Structural details are not tokens.** "Button has a trailing chevron", "card has a hairline divider" are decided once in the shared primitive/block (or a rare per-client `src/primitives/` override), not per project.

6. **Every project carries a `DESIGN.md` at its root** — the authoritative, human-readable design-system guide (overview, colours, typography, layout, elevation, shapes, components/primitives, do's & don'ts, responsive, iteration, known gaps). It is the reference for building **blocks/sections not present in the Figma**. Generated by `/scaffold-site` from the `/import-figma` analysis; read by `/design-block`. It **supersedes** the lighter `design-language.md` draft (same purpose, fuller form). `DESIGN.md` is prose/guidance; the token *values* still live only in `globals.css @theme`. Its **live visual counterpart** is the `/design-system` route (`src/app/design-system/page.tsx`), which renders swatches from the real `--color-*` vars and the real primitives — non-duplicating by construction. Both are generated per project by `/scaffold-site`.

### Why

- **Build the atom once, theme per project.** A new block that composes `<Button>` gets on-brand, correctly-hovered buttons with zero per-block styling; a new client gets them by setting tokens. This is what makes "design applies automatically" true.
- **One source of truth, no drift** — the project's `@theme`. No duplicated styling across blocks or a competing TS config.
- **Honest scope of "automatic":** atomic styling (via primitives) + brand values (via tokens) are automatic; block-specific layout is still implemented per block (dev/TDD).

### Consequences

- Built: `Button` + `Eyebrow` primitives (token-driven, TDD); `--tracking-eyebrow` added to the base token contract; `HeroBlock` and `MediaTextBlock` retrofitted to compose the primitives + the Figma design.
- **Fixed in passing:** the `HeroBlock` schema-duplication bug (component now uses the canonical `src/schemas/HeroBlock.schema.ts`; the co-located stub was deleted). CTA `variant` enum gained `accent` in both schemas.
- `scaffold-site` pours the full token layer + carries a primitives constraint; `import-figma` extracts the atomic visual layer. `structure.md`'s `primitives/` is now populated.
- **Deferred:** the renderer variant-bridge (a `BlockInstance.variant` string still doesn't reach a block's CVA prop — known issue); a real icon dependency (`lucide-react` — using an inline SVG chevron for now); more primitives (`SectionHeading`, `Card`) as blocks need them; a possible `/style-block` skill to semi-automate Figma-component → styled block.

### Alternatives considered

- **Style buttons/atoms inside each block.** Rejected — duplication across blocks and clients; the drift disease.
- **A `design-system.ts` token config.** Rejected — Tailwind v4 is CSS-first; a TS object is a second source of truth. Refactor later if the stack ever changes (YAGNI).
- **Per-client primitive code by default.** Rejected — the shared primitive themed by tokens covers it; per-client `src/primitives/` overrides exist only for rare exceptions.
- **Add `lucide-react` now.** Deferred — kept `@hwe/core-ui` dependency-light with an inline SVG; revisit when an icon system is needed broadly.

---

## DEC-023 — Variant bridge: blocks read the `variant` string; media is a content discriminated union

> **Status:** Accepted
> **Date:** 2026-06-08
> **Deciders:** Cristina Gutiérrez
> **Builds on:** [DEC-008](#dec-008--structural-variants-for-complex-blocks) (structural variants), [DEC-015](#dec-015--client-owned-blocks-with-shared-schemas-slot-based-composition-and-npm-subpath-exports), [DEC-022](#dec-022--design-system-token-driven-shared-primitives-globalscss-theme-is-the-single-per-project-visual-source).

### Context

`BlockRenderer` passes `variant={instance.variant}` (a single string from the `BlockInstance`), but blocks read named CVA props (`imageSide`, `tone`), so the variant chosen in the composition/content never reached the block — it silently fell back to the CVA default. Separately, enriching `MediaTextBlock` (image vs gallery vs video; with/without subtitle, icons, multiple CTAs) risked conflating three different concerns into "variants".

### Decision

1. **Variant bridge — one convention.** A block exposes its **single primary variant axis** under the prop name the renderer passes: **`variant` (string)**. The block maps that string to its CVA recipe; blocks with no variant ignore it. `BlockRenderer` already passes `variant={instance.variant}`, so the bridge closes in the blocks (no renderer change). A multi-axis escape hatch (`instance.variantProps` spread by the renderer) is **deferred** until a block genuinely needs more than one axis.
2. **Three distinct axes — do not conflate.** For any block:
   - **Layout** (e.g. `media-left | media-right`) → the CVA `variant` (bridge).
   - **Media type** (image | gallery | video | …) → a **discriminated union in the content schema** (`media.kind`); the block composes a sub-component per kind. NOT a CVA variant, NOT (by default) a DEC-008 structural variant, NOT a separate block.
   - **Content options** (subtitle, feature list, 0–N CTAs, captions) → **optional schema fields**, rendered conditionally. Not variants at all.
3. **Block boundary.** A block stays one block while it keeps its defining columns/slots. `MediaTextBlock` = text column + media column. Drop a column (gallery-only, stats-only) → that's a **separate block** (`GalleryBlock`, `StatsBlock`), not a MediaText variant.
4. **`MediaTextBlock` first iteration:** `variant` `media-left | media-right`; `media` union `image | video` (gallery, before-after, map deferred); optional `subtitle`, `features` (icon/label/description), and 0–N `ctas`. The media slot supports an optional `href` and `caption`.

### Why

- **Content-driven variants actually work** — a `BlockInstance` (and later Payload content) can set `variant` and it reaches the block; the same block is reused with different layouts on a page.
- **Clean separation** keeps blocks from becoming "everything" components: layout = variant, media = polymorphic content, extras = optional fields.
- **Decide the convention before scaling** — the remaining blocks adopt the `variant`-prop convention from the start instead of being retrofitted.

### Consequences

- `MediaTextBlock` reworked: CVA axis renamed to `variant` (`media-left|media-right`); content `image` field replaced by the `media` discriminated union; `subtitle` + `features` added; a `MediaSlot` sub-component switches on `media.kind`. Tests cover image, video, both sides, features, and a11y.
- `site-demo` home now has two `MediaTextBlock` instances (`media-left` image, `media-right` video) — the second proves the bridge end-to-end through `BlockRenderer`.
- Future blocks expose their primary variant as `variant`. Multi-axis (`variantProps`) and richer media kinds (gallery/before-after/map) are deferred. Icons in `features` are plain strings until an icon system lands (DEC-022 deferral).

### Alternatives considered

- **Map `variant` → named CVA prop inside the renderer.** Rejected — the renderer would need to know each block's prop name; pushing the mapping into the block (which owns its CVA) is simpler and local.
- **Media kinds as DEC-008 structural variants (separate files per kind).** Rejected for the media slot — a polymorphic content union + small media sub-components is lighter and keeps one block, one registration. DEC-008 remains for blocks whose *whole* DOM/hooks diverge.
- **A separate block per media type.** Rejected — they share the text+media composition; only a dropped column warrants a new block.

---

## DEC-024 — Site chrome: layout layer (SiteShell/Navbar/Footer) driven by client.config; lucide-based Icon primitive

> **Status:** Accepted
> **Date:** 2026-06-08
> **Deciders:** Cristina Gutiérrez
> **Builds on:** [DEC-017](#dec-017--repo-split-tools-submodule--core-npm--template--client-repos) (adapter pattern), [DEC-021](#dec-021--one-canonical-client-reference-site-demo-sitedir-path-convention-and-contractreference-reconciliation) (deferred shell), [DEC-022](#dec-022--design-system-token-driven-shared-primitives-globalscss-theme-is-the-single-per-project-visual-source) (token-driven primitives).

### Context

Header and footer frame every page and must exist before more content blocks. They are **not** content blocks — they're site chrome. `@hwe/core-ui` already had a skeletal layout layer (`SiteShell`/`Navbar`/`Footer`). Their content (links, contact, footer columns, logo) is **per-client**, and the Figma chrome (and feature lists) lean heavily on icons.

### Decision

1. **Header/footer = the layout layer**, not blocks: `@hwe/core-ui/src/layout/` — `SiteShell` composes `Navbar` + `<main>` + `Footer`. They are shared + token-driven; they **compose** the primitives (`Button`, `Icon`). `SiteShell` **owns the page `<main>`** — a page/composition using it must NOT add another `<main>`.
2. **Content is driven by `client.config.ts`** (the tenant's single, growable config — `TenantConfig`, extended): identity, `logo` (asset and/or text wordmark), `contact`, `nav` (links + dropdown children + CTA), `footer` (tagline + columns + legal). The **booking engine** lives here too (`booking.provider`) as the DEC-017 adapter-selection point (wired later). Nothing client-specific is hardcoded in `@hwe/core-ui`.
3. **Icon system = `lucide-react` + an `Icon` primitive.** `Icon` is a **resolver over a curated registry** (custom-core icons → lucide fallback), importing only the icons we use (tree-shakeable), server-friendly, `currentColor` + `size`, decorative by default (`aria-hidden`) or labelled (`role=img`). Icons are referenced **by name** (`<Icon name="phone" />`), including content-driven (`features[].icon`). One source, instantiated by name — the Button principle for icons. The inline-SVG stopgaps were replaced.
4. **Icons vs images.** UI icons (lucide or custom) are **SVG-as-component** resolved by `<Icon>`. Brand images / logo / photos are **assets in `public/brand/`** (referenced by URL), not the icon system.
5. **Token added:** `--color-surface-dark` (dark footer / sections).

### Why

- **One place, instantiate** — chrome content in `client.config.ts`, icons by name, all rendered by shared token-driven components; a new client gets correct chrome by editing config, not code.
- **Icon library beats per-icon asset files** — lucide + a curated registry is DRY, accessible, tree-shakeable; bespoke icons extend the same registry. Asset files would reinvent it.
- **Booking belongs in client.config** as the adapter selection (DEC-017), so the tenant declares its PMS without touching core.

### Consequences

- `Navbar` (client component — mobile toggle + dropdowns), `Footer`, `SiteShell` fleshed out to the Figma chrome, token-driven, composing `Icon` + `Button`. `TenantConfig` extended with `logo`/`contact`/`nav`/`footer`/`booking`.
- `site-demo`: `client.config.ts` added; `layout.tsx` adopts `SiteShell`; `HomeComposition` dropped its `<main>` (SiteShell provides it); `public/brand/` established (text wordmark placeholder until a real logo).
- `lucide-react` added to `@hwe/core-ui` dependencies. `Icon` exported from the root.
- `scaffold-site` templates updated: `layout.tsx` uses `SiteShell` + `client.config.ts`; the config carries nav/footer/contact.
- **Deferred:** client-bespoke icons resolved *by name* (would need an `IconProvider` client boundary — for now custom icons extend the core registry); a real logo asset.

### Alternatives considered

- **Header/footer as blocks.** Rejected — they're chrome on every page, not page-section content; the layout layer is their home.
- **Custom SVG icons as files in `public/` + a resolver.** Rejected for UI icons — reinvents lucide with more code and worse a11y; assets are for brand images, not icons.
- **Hardcode chrome content in the shared components.** Rejected — violates "no client specifics in `@hwe/core-ui`"; content comes from `client.config.ts`.

---

## DEC-025 — Booking adapter pattern — engine-agnostic blocks with UI delegation

> **Status:** Accepted
> **Date:** 2026-06-11
> **Deciders:** Cristina Gutiérrez
> **Builds on:** [DEC-017](#dec-017--repo-split-tools-submodule--core-npm--template--client-repos) (adapters inside `@hwe/core-ui`, no `@hwe/booking` package), [DEC-023](#dec-023--variant-bridge-blocks-read-the-variant-string-media-is-a-content-discriminated-union) (the `variant` string bridge).
> **Supersedes the data-only adapter assumption** of the earlier `booking-architecture.md` (which modelled a `BookingAdapter` of `checkAvailability`/`createReservation` only). The diagram is rewritten to this DEC.

### Context

Booking engines (THR, Witbooking, Mastercamping, Resalys) do not share an integration model. THR (eSeasonResa) ILib v4 injects a third-party `<script>` that renders its own Web Component (`<thr-search-engine>`); other engines embed an iframe; others expose an API a native form would drive. A single `BookingBlock` handling every engine would need engine-specific conditionals inside `@hwe/core-ui` — exactly the `if (client === '…')` / `if (engine === '…')` branching the platform forbids. The earlier booking architecture assumed an adapter that only abstracts **data**; the real variation is in **how the UI is instantiated**. The search widget is also only the first of several booking UI elements (one-night, favorites, rates) that will share whatever pattern we pick now.

### Decision

1. **One block per booking UI element, not modes of a mega-block.** `BookingSearchBlock` is its own block; future `BookingSimpleBlock`, `BookingFavoritesBlock`, `BookingRatesBlock` are separate blocks. (The pre-existing `BookingBlock.schema.ts` — labels only, no component — is a distinct, untouched artifact.)
2. **Blocks are engine-agnostic and delegate rendering.** A booking block resolves a `BookingSearchAdapter` via `resolveSearchAdapter(engine)` and hands it the container; it never imports a concrete adapter. The block depends on the interface (the port); infrastructure provides the adapter (hexagonal).
3. **The adapter encapsulates the integration type and the full mount/destroy lifecycle.** The contract declares `integrationType: 'script-injection' | 'iframe' | 'native'` and an idempotent `mount(container, config, events) → { destroy, mounted }` that resolves even on failure and is safe to re-call after `destroy()` (SPA re-navigation).
4. **Registry is a map, no if/else, no engine names in block code.** `adapters/booking/registry.ts` maps each engine to a factory; unimplemented engines register a factory that throws "not yet implemented". Adding an engine = writing an adapter + swapping its factory.
5. **External widget styling is overridden via `data-engine` scoped selectors in the client's `globals.css`.** The block sets `data-engine="{engine}"` on its `<section>`; clients restyle with `[data-engine="…"]`-scoped `!important` rules. Zero CSS lives in the block.
6. **Script loading is framework-agnostic (plain DOM, not `next/script`)** so the adapter layer carries no React dependency and is portable; the shared `script-loader.ts` dedupes by `src`.
7. **Engine + credentials are authoritative in the tenant config; block content is presentation only.** `TenantConfig.booking` is a **discriminated union by `engine`**, each member declaring its own **real-named** credential fields (`{ engine: 'thr'; codeCamping; siteId? }`, `{ engine: 'witbooking'; hotelId }`, …) — no generic `propertyId` at this layer. The block reads it via `useTenant()`; **there is no engine field in block content and no fallback**. Block content is presentation only (`widgetTitle`, `accommodationType`, `debug`). The block assembles the adapter config as `{ ...tenant.booking, locale: tenant.locale, ...content }` and the adapter reads its own real field names (THR reads `codeCamping`). Account IDs like `codeCamping` are **public** (visible in any THR site's HTML) — they live in `client.config.ts`, not env vars. Missing `booking` → an always-visible config-error in the block (not a crash, no retry).

### Why

- **No engine branching in core.** The only switch point is the registry map; the block and every other consumer are blind to which engine is active.
- **Adding an engine doesn't touch the block.** New engine = new adapter + registration. The block, renderer, and schema union absorb it without edits to rendering logic.
- **Honest about integration reality.** Abstracting the *integration type* (not just data) is what lets one block serve a script-widget engine and a native-form engine alike.

### Consequences

- Adding a new engine follows [`docs/skills/frontend/booking-adapter.md`](../skills/frontend/booking-adapter.md); each engine's integration docs live in `docs/integrations/bookings/{engine}/`.
- THR is implemented (`script-injection`); Witbooking/Mastercamping/Resalys are throwing placeholders. *(Amended 2026-06-17: Mastercamping search is now implemented too — `MastercampingSearchAdapter`, a second `script-injection` reference using a global `MasterWidget` JS constructor + static JS/CSS assets, vs THR's Web Components. Only Witbooking/Resalys remain placeholders. See `docs/integrations/bookings/mastercamping/`.)*
- **Client-specific CSS overrides are required per engine per client** — the platform does not manage widget skins.
- **A GDPR consent bridge must be implemented per engine that loads external scripts.** THR's adapter accepts `consentAds`; the live Cookiebot wiring (and THR CSP domains in client `next.config.mjs`) are separate, still-open tasks.
- `BookingSearchBlock` is registered as a **platform default** in `baseBlockRegistry` (uncommon — most blocks are client-owned per DEC-015 — justified because the block is fully engine-agnostic).
- `TenantConfig.booking` is now a real discriminated union (it was a `{ provider?: string }` stub from DEC-024's "wired later" note — superseded here). Adding an engine means adding a member to that union (real credential names) **and** registering its adapter. The app must be wrapped in `TenantProvider` for the block to read it (`site-demo` layout does this).
- `docs/diagrams/booking-architecture.md` rewritten to this pattern; the add-an-engine guide is `docs/skills/frontend/booking-adapter.md`.

### Alternatives considered

- **One `BookingBlock` with an engine/mode switch inside.** Rejected — pushes engine conditionals into core and grows an unmaintainable mega-component as engines and widget types multiply.
- **Data-only adapter (`checkAvailability`/`createReservation`), block always renders our form.** Rejected — does not fit script-injection/iframe engines that render their own UI; the variation is in mounting, not just data.
- **A block per engine (`ThrSearchBlock`, `WitbookingSearchBlock`).** Rejected — duplicates the block per engine and re-introduces engine names into the block layer; the engine belongs in the adapter, selected by config.
- **`next/script` for loading.** Rejected — couples the adapter layer to React/Next; a plain-DOM loader keeps adapters portable and testable with mocked externals.

## DEC-026 — Mobile disclosure as a pluggable strategy on BookingSearchBlock

> **Status:** Proposed
> **Date:** 2026-06-15
> **Deciders:** Cristina Gutiérrez
> **Builds on:** [DEC-025](#dec-025--booking-adapter-pattern--engine-agnostic-blocks-with-ui-delegation) (the block is engine-agnostic, content is presentation only), [DEC-017](#dec-017--repo-split-tools-submodule--core-npm--template--client-repos) (map-pattern registries, no branching in `@hwe/core-ui`).

### Context

On small viewports the booking search widget is tall and pushes page content far down — clients want it collapsed behind a toggle that expands in place, while desktop always shows it open. There will be more than one way to collapse it (an in-place `accordion` now; a full-screen app-style `sheet` with a close button is foreseeable), and the engine widget mounts into its container imperatively (DEC-025) — so the container must stay mounted at all times; only its visibility may change. We do not want this UX axis to grow `if (mode === '…')` conditionals inside the block.

### Decision

1. **Mobile collapse is a separate presentation axis, expressed in block content.** `BookingSearchBlockContent.mobile?: 'accordion'` (`bookingMobileModeSchema`). Omitted → no collapse (the widget is always shown). It is distinct from the `variant` axis (`inline`/`sticky`/`modal`, DEC-023) — a `sticky` bar can also be an `accordion` on mobile.
2. **Each mode maps to a disclosure strategy via a registry, no branching in the block.** `base-blocks/BookingSearchBlock/disclosure/registry.ts` maps each mode to a strategy component (mirrors the booking adapter registry, DEC-017). Adding a mode = a member in `bookingMobileModeSchema` + one entry in the registry. The block resolves the strategy and renders it; it never names a mode.
3. **A strategy is a component that wraps the widget container and owns its toggle chrome.** Contract (`disclosure/types.ts`): `({ title, children }) => ReactElement`. It MUST NOT unmount `children` (the engine is mounted into it) — it toggles visibility with CSS (`hidden`/`block`) and must keep the widget shown on `md+` regardless of collapsed state.
4. **`accordion` is the first strategy.** A full-width toggle button (`md:hidden`) labelled with the widget title; the panel is `hidden` when collapsed and `md:block` so desktop never collapses. `aria-expanded` + `aria-controls` wire the toggle to the panel.

### Why

- **New collapse modes don't touch the block.** `sheet` (or any future mode) = a new strategy + one registry entry, exactly like adding a booking engine.
- **The imperative-mount invariant is preserved.** Hiding via CSS (never unmounting) keeps the adapter lifecycle identical with or without disclosure.
- **Orthogonal to `variant`.** Collapse behaviour and page-placement are independent axes, so they compose freely.

### Consequences

- `disclosure/` lives inside the block (strategies are presentation-only and block-specific; not exported from the package barrel — same as `bookingSearchVariantSchema`).
- `site-demo` exercises `mobile: 'accordion'` on its sticky BookingSearchBlock.
- A `sheet` mode is left unimplemented by design (added when a client needs it).

### Alternatives considered

- **A boolean `collapsibleOnMobile` flag with the behaviour hard-coded in the block.** Rejected — bakes one UX into the block and forces an `if` when a second mode (`sheet`) arrives; the registry is the same pattern already used for engines.
- **CSS-only `<details>`/`<summary>`.** Rejected — gives no control over the `md+` always-open requirement or the toggle styling/a11y wiring, and would still need block-level branching per future mode.
- **Putting the mode on the `variant` axis (`accordion` as a variant).** Rejected — conflates page-placement with collapse behaviour; they must compose (`sticky` + `accordion`), so they are separate axes.

## DEC-027 — Booking widgets beyond search: adapter-per-widget, shared THR script-URL composition, and a tenant feature toggle

> **Status:** Accepted
> **Date:** 2026-06-16
> **Deciders:** Cristina Gutiérrez
> **Builds on:** [DEC-025](#dec-025--booking-adapter-pattern--engine-agnostic-blocks-with-ui-delegation) (one block per booking UI element, engine-agnostic delegation, registry map), [DEC-017](#dec-017--repo-split-tools-submodule--core-npm--template--client-repos) (adapters in `@hwe/core-ui`, no branching), [DEC-016](#dec-016) (visual spec without Figma via `/design-block`).
> **Scope:** establishes the pattern for the *second and subsequent* THR widgets (favorites/offers first — `<thr-favorites>` → `BookingFavoritesBlock`; later `<thr-simpleblock>`, `<thr-tarifs>`, `<thr-categories>`). Does **not** cover page placement (a composition decision, not architecture).

### Context

DEC-025 implemented the first booking UI element (`BookingSearchBlock` + `ThrSearchAdapter`) and anticipated more ("one block per booking UI element, not modes of a mega-block"). Adding the THR **favorites/offers** widget (`<thr-favorites>`, the *coups de cœur* gallery) is the first time the pattern is exercised for a second widget, and it surfaces three decisions that every future booking widget will inherit:

1. **Adapter granularity.** The existing port is `BookingSearchAdapter` / `resolveSearchAdapter` — search-shaped. A second widget needs its own mount signature and config, but `ThrSearchAdapter` already contains THR-runtime plumbing (the `thelisresa.ilib` queueing bootstrap, unique global-callback naming, `data-engine` tagging) that a second THR adapter would duplicate.
2. **ILib script composition.** THR loads **one** script per site with the widget set selected by query flags (`/ilib/v4/?favorites&searchengine&…`). Today `THR_ILIB_SRC` is hardcoded to `?searchengine`. With search + favorites on the same page, two adapters requesting two different `src` values would make the `src`-deduping `script-loader` load **two** scripts — wrong per THR's integration model.
3. **"Active or not" per client.** A client must be able to mark the offers widget active/inactive in `client.config.ts`, independent of whether a block instance is placed (e.g. the account may not have featured accommodations configured).

### Decision

1. **One adapter family per widget, sharing a THR runtime module.** Each booking UI element gets its own port + registry + concrete adapter, mirroring search: `BookingFavoritesAdapter` (port) + `resolveFavoritesAdapter(engine)` (map registry, placeholders throw) + `ThrFavoritesAdapter`. The shared THR plumbing is **extracted** from `ThrSearchAdapter` into `adapters/booking/thr/thr-runtime.ts` (`ensureThelisResaBootstrap`, `uniqueCallbackName`, global-callback helpers) and reused by both adapters — no duplication, `ThrSearchAdapter` refactored to consume it with its tests staying green.
2. **The THR script URL is computed once from tenant features, not negotiated between adapters.** A pure function `buildThrScriptUrl(features: TenantBookingFeatures)` derives the final `/ilib/v4/?<flags>` from `tenant.booking.features` — the tenant already knows which widgets are active, so the URL is **definitive before any adapter mounts**:
   ```ts
   function buildThrScriptUrl(features: TenantBookingFeatures): string {
     const flags = ['searchengine'];            // always present when booking is configured
     if (features.favorites) flags.push('favorites');
     if (features.simpleblock) flags.push('simpleblock');
     return `https://thelisresa.webcamp.fr/ilib/v4/?${flags.join('&')}`;
   }
   ```
   The computed URL is passed to the THR adapters; the `script-loader` dedupes by `src` **unchanged** because the URL is already final. **No dynamic convergence in the loader** — uniting flags by mutating an already-loaded script is fragile by timing (if search mounts before favorites, the script is already loaded as `?searchengine` and the favorites flag arrives too late). Computing once from the tenant eliminates the race entirely.
3. **A tenant-level feature toggle, separate from credentials.** `TenantConfig.booking` gains an optional, engine-agnostic `features?: { favorites?: boolean; … }`. The block reads it via `useTenant()`; when its feature is absent/false the block renders nothing (not an error — it is a deliberate off state). Credentials stay in the engine-discriminated union (DEC-025); `features` is the capability switch.
4. **Per-client wiring extends `/setup-booking`; placement uses `/add-block`.** Enabling a widget for a client (set the `features` flag, extend the `[data-engine]` CSS color-override scaffold) is added to `/setup-booking` (e.g. `--with-favorites`) — **no per-widget skill**. Placing the block on a page is the existing `/add-block` once the block is in `baseBlockRegistry`.
5. **Design customization is visual theming via the existing `[data-engine]` overrides — structure untouched.** The widget renders THR's own light DOM; the block owns only its section wrapper (title, container width, padding). Theming is not limited to colour: typography (font family + sizes), the per-offer reserve button, and the slider chrome (arrows, dots) are all in scope — done with token-driven `[data-engine="thr"]` overrides (`!important` + selector depth to beat THR's themed layer), never by touching the widget's DOM/layout. *(Amended 2026-06-16: the original "colors-only" framing was too narrow — the mechanism is unchanged, only the extent of theming widened.)* The visual spec without Figma is produced by `/design-block` (DEC-016) mapping the design language onto THR's real class snapshot — see `site-demo/docs/block-specs/BookingFavoritesBlock.visual-spec.md` and the `<thr-favorites>` class map in `thr-notes.md`.

### Why

- **Adding a widget never touches existing blocks/adapters.** New widget = new adapter family + new block + registry entry, exactly the DEC-025 shape — now proven for N>1.
- **Honest to THR's integration model.** One combined script per site is what THR documents; deriving the URL from tenant features makes that deterministic, never an accident of which adapter mounted first.
- **Toggle ≠ placement ≠ credentials.** Three orthogonal concerns kept in three places: `features` (tenant capability), composition (where it shows), the discriminated union (account IDs).
- **No skill sprawl.** One `/setup-booking` owns per-client booking wiring; widgets are flags, not new skills.

### Consequences

- **Refactor lands before the feature.** Extracting `thr-runtime.ts` (+ `buildThrScriptUrl`) and refactoring `ThrSearchAdapter` to use it is its **own commit with the existing 13 tests green**, before any favorites code — the two are never mixed.
- `script-loader` is **unchanged** — it keeps deduping by final `src`. No convergence logic added. *(Amended 2026-06-17: a sibling `loadStylesheet` (deduped by `href`) was added **additively** for `script-injection` engines that ship a separate required CSS file — Mastercamping loads JS + CSS together. The script path is untouched. Note Mastercamping currently implements **search only**; its favorites/simpleblock adapters remain placeholders, and the THR script-URL composition here is THR-specific — Mastercamping uses fixed static asset URLs, no feature-flag composition.)*
- `buildThrScriptUrl` is a pure function (trivially unit-tested); the URL is computed once at the booking boundary and threaded to the adapters.
- `TenantConfig.booking.features` is additive and optional — existing configs keep working.
- `/setup-booking` grows a `--with-favorites` path (config flag + CSS scaffold); `docs/skills/frontend/booking-adapter.md` gains an "add a widget" section.
- **SPA navigation is an open verification (TODO).** When a user navigates from a search-only page to a search+favorites page within the SPA, it is unverified whether THR needs `?favorites` present in the initial script URL to include the widget code, or loads widget code on demand. Since the URL is tenant-derived (all active widgets' flags present from the first load), this should be a non-issue — but it needs a **real test against a live account** to confirm; left as a TODO (ties into US-006 smoke test) if not verifiable now.
- Subsequent THR widgets follow this DEC verbatim (add a `features` flag + its script flag in `buildThrScriptUrl`): `simpleblock` (`<thr-simpleblock>`, done — US-008), then `tarifs`, `categories`.

### Alternatives considered

- **Generalize one `BookingWidgetAdapter` with a `widget` discriminator instead of an adapter per widget.** Rejected — collapses distinct mount signatures/configs into one branching component, re-introducing the per-widget `if` DEC-025 forbids; the registry-per-widget keeps each adapter cohesive.
- **Each adapter loads its own `?widget` script (no shared builder).** Rejected — violates THR's one-combined-script model and double-loads the ILib bundle when widgets coexist.
- **Dynamic convergence in the `script-loader` — adapters declare their flag and the loader unions them onto one script.** Rejected — **fragile by timing**: if search mounts before favorites, the script is already loaded as `?searchengine` and the late favorites flag cannot be merged. Deriving the URL once from tenant features sidesteps the race entirely.
- **Always load the full ILib bundle (`?categories&favorites&searchengine&simpleblock`).** Rejected — simpler but ships widget code the site doesn't use; the tenant-derived URL gives the same single-script guarantee without the dead weight.
- **A dedicated `/setup-favorites` skill.** Rejected — duplicates the booking onboarding machinery (config + CSP + CSS + TenantProvider) and splits ownership; widgets are flags on `/setup-booking`.
- **A per-instance `enabled` flag in block content instead of a tenant feature toggle.** Rejected — "active for this client" is a tenant capability, not per-placement presentation; block content stays presentation-only (DEC-025).

---

## DEC-028 — SwiperPrimitive: the single shared carousel primitive

> **Status:** Accepted
> **Date:** 2026-06-19
> **Deciders:** Cristina Gutiérrez
> **Builds on:** [DEC-008](#dec-008--structural-variants-for-complex-blocks) (structural variants — GalleryBlock's carousel variants), [DEC-017](#dec-017--repo-split-tools-submodule--core-npm--template--client-repos) (primitives live in `@hwe/core-ui`), [DEC-022](#dec-022--design-system-token-driven-shared-primitives-globalscss-theme-is-the-single-per-project-visual-source) (token-driven shared primitives).
> **Scope:** establishes where carousel/slider behaviour lives and its contract surface. Does **not** cover any individual block's variants, schema, or placement (those stay per-block).

### Context

GalleryBlock (US-001) introduces the platform's first carousel. The team guide (`docs/guides/guia-galleryblock.md` §8) already plans **five+ blocks** that need a slider: GalleryBlock (`slider`, `slider-thumbs`, lightbox), ReviewsBlock (opinions slider), AccommodationCardBlock (photo slider on the listing card), PromoBlock (rotating banner, fade), and the footer logo slider (partners/certifications).

The existing primitives — `Button`, `Icon`, `Eyebrow`, `DevWarning` — are stateless atoms. A carousel is the opposite: stateful, requires `swiper` as a dependency, modular module/CSS imports, the full WAI-ARIA carousel wiring, keyboard handling, and `prefers-reduced-motion` behaviour. If each block wired Swiper itself, that logic (and its a11y correctness) would be duplicated five times and drift. Because five blocks will depend on it, the carousel's home and public contract must be decided **once, formally**, before the second consumer exists — not set implicitly by whatever GalleryBlock happens to do internally.

### Decision

1. **One primitive, one location.** `SwiperPrimitive` lives at `packages/core-ui/src/primitives/Swiper/`. It is the **only** place in the platform that imports from `swiper/*`. No block (base or client) imports Swiper directly — they consume `SwiperPrimitive`.
2. **It is a client component** (`'use client'`). It encapsulates: module selection, modular CSS imports (`swiper/css`, `swiper/css/navigation`, …, never the bundle), the ARIA carousel wiring (`role="region"` + `aria-roledescription="carousel"` on the container; `role="group"` + `aria-roledescription="slide"` + `aria-label="Image X of Y"` per slide), keyboard navigation, and `prefers-reduced-motion` (disables autoplay, collapses transitions to instant).
3. **Contract surface (props).** `SwiperPrimitive` accepts: the slides (children), the set of Swiper modules to enable, a typed config object (autoplay/loop/effect/navigation/pagination/thumbs), and a **required** `ariaLabel`. No `any`. Lightbox/thumbs are composed by passing the relevant modules and a second synced instance — the primitive does not hardcode a single use case.
4. **The primitive owns no brand visuals.** Control colours come from theme tokens via the consuming block's `[data-block]` scope (DEC-022); `SwiperPrimitive` ships only structural/base CSS (Swiper's own + layout utilities).
5. **`swiper` becomes a dependency of `@hwe/core-ui`** (`pnpm add swiper`, modular imports only), pinned to the latest stable major.

### Why

- **One a11y implementation.** The ARIA carousel pattern and keyboard/reduced-motion handling are written and tested once, not re-derived per block.
- **No direct-Swiper drift.** A single import site means one upgrade point and one place to enforce modular imports / tree-shaking.
- **Consistent with the layered model.** Carousel behaviour is cross-block plumbing, exactly what the primitives layer is for (DEC-017); blocks stay focused on content + variants.
- **Decided before the dependents exist.** Five blocks will build on it; ratifying the contract now prevents each from coupling to incidental internals of GalleryBlock.

### Consequences

- **First non-atomic primitive.** The `primitives/` layer now holds a stateful, dependency-bearing component alongside the atoms; acceptable and intended.
- `swiper` is added to `core-ui` dependencies; its base CSS is imported modularly by the primitive.
- **GalleryBlock (US-001) is the first consumer** and the reference for the primitive's API. Subsequent slider blocks (Reviews, AccommodationCard, Promo, footer) consume `SwiperPrimitive` verbatim — adding one is a new block, never a new carousel.
- `SwiperPrimitive` must be registered/documented like other primitives (catalog/project-map) at `/archive` time.

### Alternatives considered

- **Each block imports Swiper directly.** Rejected — duplicates module/CSS wiring and the a11y implementation across five blocks; guarantees drift and inconsistent keyboard/reduced-motion behaviour.
- **Reuse a `GalleryCarousel` sub-component from GalleryBlock.** Rejected — couples every other block's slider to GalleryBlock's internal structure and import graph; a shared need belongs in `primitives/`, not inside a block.
- **A headless carousel library (Embla, Keen) instead of Swiper.** Rejected — the team guide already standardizes on Swiper, and the gallery lightbox relies on Swiper's `Zoom`/fullscreen; introducing a second carousel engine for the same need is redundant.

