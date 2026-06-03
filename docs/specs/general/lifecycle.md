# Component lifecycle

> Stages every reusable HWP component (skill, agent, MCP, agent team, `@hwp/core-ui` block, template, primitive) passes through, and what each stage requires.
> Status is tracked in `docs/catalog.md` (one row per component).
> Loaded by agents that promote, demote, or audit components. Short — keep under 150 lines.

## Stages

```
alpha → beta → stable → deprecated → archived
```

Every component starts as `alpha`. Promotion is explicit and requires meeting the criteria below.

## `alpha`

**Meaning:** experimental, in active design, API may change without notice.

**Allowed:**
- One repo, one author, one use case.
- Breaking changes between any two commits.
- Tests may be partial.
- Docs may be a single README paragraph.

**Forbidden:**
- Listed as a dependency by anything outside its origin folder.
- Used in a production deploy of any client site.
- Referenced as "supported" in client-facing material.

**Promotion to `beta` requires:**
- At least one consumer outside the component's origin (a second site, a second skill that calls it, etc.).
- All public exports typed (no `any`).
- Test coverage meets the relevant threshold from `base-standards.md`.
- A README with at least: purpose, public API, one usage example, known limitations.
- An entry in `docs/catalog.md` with version `0.x.x` and status `alpha`.

## `beta`

**Meaning:** functionally complete, used in production by at least one client, API stabilized but may still change with a deprecation warning.

**Allowed:**
- Used in production sites with the understanding that breakage may occur with a 1-version notice.
- Multiple consumers across apps and packages.
- API changes with a deprecation period of at least one minor version.

**Forbidden:**
- Removing a public export without a prior release marking it `@deprecated`.
- Breaking changes in patch releases.

**Promotion to `stable` requires:**
- All public APIs documented (props, return types, side effects, error modes).
- Accessibility audit passed (WCAG 2.1 AA) for any visual component.
- i18n support verified for any component that renders text.
- Test coverage at or above the relevant threshold AND includes the scenarios actually exercised in real use.
- A migration guide if the API changed during `beta`.
- **Production-evidence gate** (phase-dependent):
  - **Pre-production phase** (no client sites deployed yet): the component has been integrated into at least one in-progress site (e.g. Balneario Cabriel) without requiring an API change in the last 4 weeks of work, and the maintainer explicitly declares it stable.
  - **Production phase** (≥3 client sites deployed): the component has been live in at least 1 production site for at least 30 days without a regression attributable to it.

## `stable`

**Meaning:** safe to depend on, breaking changes only in major versions, supported indefinitely.

**Allowed:**
- Default choice for new client sites.
- Featured in onboarding material.
- Long-term support.

**Forbidden:**
- Breaking changes outside a major version bump.
- API removal without a `deprecated` stage first.

**Demotion to `deprecated` requires:**
- A replacement exists and is at least `beta` (we never deprecate without a path forward).
- A migration guide from this component to the replacement.
- Catalog updated with `replaced_by` pointing to the successor.

## `deprecated`

**Meaning:** still works, no new features, scheduled for removal.

**Allowed:**
- Existing consumers continue to use it.
- Security fixes only — no new behavior.

**Forbidden:**
- New client sites adopting it.
- New features.

**Move to `archived` requires:**
- Zero consumers in the monorepo (verified by grep across `apps/` and `packages/`).
- A removal commit deleting the source.
- Catalog row moved to the **Deprecated** section with the last working version.

## `archived`

**Meaning:** source removed from the repo. The catalog keeps a row for historical traceability.

The component is gone. Anyone who needs to see how it worked finds it through git history.

## How to promote or demote

A status change is a PR that updates exactly three things:

1. The component's row in `docs/catalog.md` (new status, new version if applicable).
2. A short ADR entry in `docs/architecture/decisions.md` if moving to `stable`, `deprecated`, or `archived` (alpha → beta is too routine to log).
3. The component's README, noting the new stage and any consumer-facing implications.

Status changes are never silent.

## Version-status correspondence

| Status | Version range | Breaking changes allowed |
|---|---|---|
| `alpha` | `0.0.x` – `0.x.x` | Any commit |
| `beta` | `0.y.0`+ where `y > 0` | Minor bumps with deprecation notice |
| `stable` | `1.0.0`+ | Major bumps only |
| `deprecated` | (frozen at last version) | None |
| `archived` | (frozen, source removed) | N/A |
