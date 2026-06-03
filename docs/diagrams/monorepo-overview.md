# Platform overview — 3-repo architecture

> High-level map of the hwe platform as of DEC-017: three purpose-built repos, independent client repos, and Figma Make repos outside everything.
>
> Conventions: arrows point in the direction of **dependency**. Dashed arrows are submodule mounts or git references, not npm imports.

```mermaid
flowchart TB
  subgraph workspace["C:\\laragon\\www\\Hospitality Web Platform\\"]
    direction TB

    subgraph tools["hwe-tools/  (git submodule — no runtime code)"]
      direction LR
      skills[".claude/skills/"]
      agents[".claude/agents/"]
      commands[".claude/commands/"]
      docs_t["docs/  (specs · contracts · guides · diagrams)"]
    end

    subgraph core["hwe-core/  (Turborepo — npm packages)"]
      direction LR
      coreui["packages/core-ui/\n@hwe/core-ui\nbase-blocks · schemas · renderer\nadapters · primitives · theme"]
      config["packages/config/\n@hwe/config\ntsconfig · tailwind preset"]
      site_demo["apps/site-demo/\n(test fixture — validates packages\nbefore publish)"]
      coreui --> config
      site_demo --> coreui
      site_demo --> config
    end

    subgraph template["hwe-template/  (GitHub template — cloned once per client)"]
      direction LR
      tmpl_tools[".hwe-tools/  (submodule → hwe-tools)"]
      tmpl_src["src/  (empty structure:\nblocks · compositions · theme · app)"]
      tmpl_pkg["package.json\n@hwe/core-ui + @hwe/config"]
    end

    subgraph clients["site-{slug}/  (one independent repo per client)"]
      direction LR
      client_tools[".hwe-tools/  (submodule → hwe-tools)"]
      client_src["src/blocks · src/compositions\nsrc/theme/tokens.json\nsrc/app/globals.css"]
      client_docs["docs/  (audits · block-specs · stories\ndesign-language · figma-analysis)"]
      client_cfg["client.config.ts"]
    end

    figma["figma-makes/{slug}/\n(one repo per client — DEC-002\noutside all project repos)"]
  end

  registry["Private npm registry\n(GitHub Packages)"]

  tools -.submodule mount.-> template
  tools -.submodule mount.-> clients
  core -- "npm publish @hwe/core-ui\nnpm publish @hwe/config" --> registry
  registry -- "npm install" --> template
  registry -- "npm install" --> clients
  template -."Use this template".-> clients
  figma -."\/import-figma reads".-> clients
```

## Reading the diagram

- **`hwe-tools`** is a pure text repo (skills, agents, docs). No Node.js runtime. Versioned with git tags (`v1.0.0`). Mounted as `.hwe-tools/` in every client repo and in `hwe-template`.
- **`hwe-core`** is the Turborepo workspace that compiles and publishes `@hwe/core-ui` and `@hwe/config`. `apps/site-demo/` lives here as the integration test fixture — it validates packages before they are published.
- **`hwe-template`** is a GitHub template repo. Cloned once per client with "Use this template". Contains the `.hwe-tools/` submodule and a pre-wired `package.json` pointing to `@hwe/core-ui` and `@hwe/config`.
- **`site-{slug}/`** repos are independent — each has its own git history, its own Vercel project, its own `package.json`. They consume `@hwe/*` from the private registry. Claude Code reads `.hwe-tools/` for skills and docs.
- **`figma-makes/{slug}/`** are the designer's repos, tagged per import ([DEC-002](../architecture/decisions.md#dec-002--one-figma-make-repo-per-client-tagged-per-import)). `/import-figma` reads them and writes outputs to the client repo's `docs/`.

## What this diagram does NOT show

- Internal layout of `@hwe/core-ui` (base-blocks, schemas, renderer, adapters) — see [`core-ui-internal.md`](./core-ui-internal.md).
- Block resolution chain (base registry + client registry merge) — see [`block-resolution-chain.md`](./block-resolution-chain.md).
- Token cascade (global → semantic → brand) — see [`token-cascade.md`](./token-cascade.md).
- Deploy targets (Vercel) — see [DEC-007](../architecture/decisions.md#dec-007--vercel-full-stack-hosting-replaces-cdmon--hetzner--mariadb).
