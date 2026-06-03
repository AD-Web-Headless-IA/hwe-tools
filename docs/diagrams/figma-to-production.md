# Figma to production — client onboarding flow

> End-to-end flow of bringing a new client from a Figma Make export to a deployed site on Vercel. Combines [DEC-002](../architecture/decisions.md#dec-002--one-figma-make-repo-per-client-tagged-per-import) (Figma-per-client), [DEC-007](../architecture/decisions.md#dec-007--vercel-full-stack-hosting-replaces-cdmon--hetzner--mariadb) (Vercel), [DEC-017](../architecture/DEC-017-Repo-Split.md) (3-repo structure), and [DEC-009](../architecture/decisions.md#dec-009--remove-activeblocks-add-blockdefaults-to-clientconfigts) (`blockDefaults`).

```mermaid
flowchart LR
  designer["Designer\n(Septeo Hospitality)"]
  figma_repo["figma-makes/{slug}/\ngit repo · tagged import-YYYY-MM-DD\n(DEC-002)"]

  subgraph tools_work["hwp-tools skills"]
    import_skill["/import-figma {url} {slug}"]
    scaffold_skill["/scaffold-site {slug}"]
    design_skill["/design-block {Name} --client {slug}"]
  end

  subgraph client_repo["site-{slug}/  (created from hwp-template)"]
    direction TB
    submodule[".hwp-tools/ (submodule → hwp-tools)"]
    client_docs["docs/\nfigma-analysis.md + figma-notes.md\ndesign-language.md (DRAFT)\ntokens.json (DRAFT)"]
    client_config["client.config.ts\ntenantId · bookingAdapter · blockDefaults · features\n(DEC-009)"]
    theme["src/theme/tokens.json\nsrc/app/globals.css @theme {}\n(Tailwind v4 — DEC-017)"]
    compositions["src/compositions/"]
    blocks["src/blocks/\n(Level 1 re-exports + Level 2/3 custom)"]
    routes["src/app/"]
  end

  npm_pkg["@hwp/core-ui · @hwp/config\n(from private npm registry)"]

  subgraph deploy["Vercel (DEC-007)"]
    preview["Preview deploy per PR"]
    prod["Production · custom domain\nVercel Postgres · Blob Storage"]
  end

  designer --> figma_repo
  figma_repo --> import_skill
  import_skill --> client_docs
  client_docs -- "human review + approve" --> scaffold_skill
  scaffold_skill --> blocks
  scaffold_skill --> theme
  scaffold_skill --> client_config
  client_docs -- "no Figma for this block" --> design_skill
  design_skill -- "visual spec → /propose" --> blocks
  blocks & compositions --> npm_pkg
  routes --> compositions
  client_config --> compositions
  theme --> compositions
  routes -- "npm run build" --> preview
  preview -- "merge to main" --> prod
```

## Key invariants

- **Figma is reference, not codegen.** Classification (block vs template vs composition) is a human-led step driven by [`domain-model.md §7`](../architecture/domain-model.md).
- **Per-client surface stays small.** Most work for client N+1 is `client.config.ts` + `globals.css @theme {}` + a few compositions. Blocks come from `@hwp/core-ui/base-blocks`.
- **Re-imports preserve history.** [`/import-figma`](../../.claude/skills/import-figma/SKILL.md) runs `git pull --ff-only` and adds a new dated tag — old exports stay reachable via `git checkout import-YYYY-MM-DD`.
- **Preview deploys are the design review surface.** Every PR gets a Vercel preview URL; the designer reviews the rendered site, not a Figma diff.
- **Design language fills the gap.** When the designer hasn't provided a Figma for a specific block, `/design-block` reads `docs/design-language.md` (extracted by `/import-figma`) to generate a consistent visual spec — no ad-hoc improvisation.
