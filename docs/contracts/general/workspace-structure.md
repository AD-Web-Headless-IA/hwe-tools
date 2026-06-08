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

## Skill path resolution: `SITE_DIR` and `PKG`

> **Single source of truth for site-targeting skills.** `/create-page`, `/add-block`, and any skill that writes into a client site resolve their paths from these two variables. Skills **reference this definition** — they must not re-derive or hardcode it. This is a generic **rule**, not a registry: no client project is ever listed here, and future `site-{slug}` repos are never "added" to `hwe-tools`.

- **`SITE_DIR`** = the root of the site the skill targets.
  - **Standalone client repo** (`site-{slug}/`, the normal case): `SITE_DIR` is that repo's root — i.e. the directory that carries `hwe-tools/` as a submodule. A client repo self-locates; nothing in `hwe-tools` needs to know it exists.
  - **Test fixture** (the one documented exception): the fixture is an app *inside* the `hwe-core` monorepo, so it does not match the "repo root that mounts the submodule" rule. For it, `SITE_DIR = hwe-core/apps/{slug}` (today: `hwe-core/apps/site-demo`). This is one line, and it does not grow — there is exactly one fixture.

- **`PKG`** = `{SITE_DIR}/node_modules/@hwe/core-ui` — the **installed** `@hwe/core-ui` package, however it got there (private npm registry in `hwe-template`/`site-{slug}`, pnpm workspace symlink in the fixture). The package publishes its `src/` (`files: ["src"]`, `exports` to `./src/...`), so block schemas/types/variants are read from `{PKG}/src/...`. Never read block source from `hwe-core/packages/core-ui/src/` — that path only exists in the monorepo and is invalid for a real client.

Because every consumer (fixture, template, client) mounts `hwe-tools` as a submodule, this definition is visible from all of them; `hwe-core` is **not** present inside a client repo, so a path convention could not live there.

## Key rules

- No absolute paths anywhere — workspace root name is not fixed
- `site-{slug}/` is independent — it does not need to be a sibling of `hwe-core/` on disk
- `hwe-core/apps/site-demo/` is a test fixture, not a client repo
- `figma-makes/base-template/` is the reference Figma Make for the demo/test project
- Client repos consume `@hwe/*` packages via npm, not via local filesystem paths
- Site-targeting skills resolve paths via `SITE_DIR` / `PKG` (defined above) — never hardcode or re-derive
