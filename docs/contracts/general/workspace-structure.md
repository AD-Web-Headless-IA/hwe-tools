# Workspace Structure Contract

> Source of truth for workspace layout. DEC-017 explains the rationale.
> Do not add absolute paths to this file. The workspace root name varies per developer.

---

## Workspace root

The workspace root is whatever directory the developer opens in their IDE or terminal. Its name is not fixed — it varies per machine and per developer. All paths in skills, agents, and docs are relative to this root.

```
{workspace-root}/
  hwe-tools/          ← git repo — submodule mounted inside hwe-core, hwe-template, and site-{slug}/
  hwe-core/           ← git repo — Turborepo monorepo with @hwe/core-ui and @hwe/config packages
  hwe-template/       ← git repo — GitHub template, cloned once per client
  site-{slug}/        ← git repos — one per client, independent, cloned from hwe-template
  figma-makes/        ← plain folder (NOT a git repo) — one cloned designer repo per client
```

---

## Repos

### `hwe-tools/`

Skills, agents, commands, docs, specs, contracts. No runtime code.

Delivered as a **git submodule** — mounted at `hwe-tools/` inside:
- `hwe-core/` (development reference)
- `hwe-template/` (pre-configured in the template)
- `site-{slug}/` (every client repo carries it)

### `hwe-core/`

React packages published to the private npm registry.

```
hwe-core/
  packages/
    core-ui/    → @hwe/core-ui
    config/     → @hwe/config
  apps/
    site-demo/  ← test fixture only — validates packages before publish
```

> `hwe-core/apps/site-demo/` is a **test fixture**, not a real client site. It exists to validate `@hwe/core-ui` and `@hwe/config` before publishing. Do not scaffold production client blocks here.

### `hwe-template/`

Empty starter repo. Cloned once per client via "Use this template" on GitHub. Contains `hwe-tools/` pre-wired as a submodule and the base block re-exports.

### `site-{slug}/`

One independent repo per client, cloned from `hwe-template`. Can live anywhere on the developer's filesystem — it has **no filesystem dependency on `hwe-core/`** because it consumes packages via npm (`@hwe/core-ui`, `@hwe/config`). Contains `hwe-tools/` as a submodule.

```
site-{slug}/
  hwe-tools/          ← submodule
  src/
    blocks/           ← Level 1/2/3 client blocks
    compositions/
    theme/
      tokens.json
    app/
  docs/               ← figma-analysis.md, design-language.md, audits, stories
  client.config.ts
  package.json        ← depends on @hwe/core-ui + @hwe/config via npm
```

---

## `figma-makes/`

Plain folder at the workspace root — **not a git repo itself**. Contains one cloned designer repo per client, each with its own `.git/`.

```
figma-makes/
  base-template/      ← reference Figma Make for the test/demo project
  {slug}/             ← one per client
```

- Every import (clone or re-import) is tagged: `git tag import-YYYY-MM-DD`
- `/import-figma` reads from `figma-makes/{slug}/` and writes results to `site-{slug}/docs/`
- Figma Make repos are **never modified** — pristine clones only

---

## Key rules

- No absolute paths anywhere — workspace root name is not fixed
- `site-{slug}/` is independent — it does not need to be a sibling of `hwe-core/` on disk
- `hwe-core/apps/site-demo/` is a test fixture, not a client repo
- `figma-makes/base-template/` is the reference Figma Make for the demo/test project
- Client repos consume `@hwe/*` packages via npm, not via local filesystem paths
