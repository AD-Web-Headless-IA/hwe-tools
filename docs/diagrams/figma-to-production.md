# Figma to production — client onboarding flow

> End-to-end flow of bringing a new client from a Figma Make export to a deployed site on Vercel. Combines [DEC-002](../architecture/decisions.md#dec-002--one-figma-make-repo-per-client-tagged-per-import) (Figma-per-client), [DEC-007](../architecture/decisions.md#dec-007--vercel-full-stack-hosting-replaces-cdmon--hetzner--mariadb) (Vercel) and [DEC-009](../architecture/decisions.md#dec-009--remove-activeblocks-add-blockdefaults-to-clientconfigts) (`blockDefaults`).

```mermaid
flowchart LR
  designer["Designer<br/>(Septeo Hospitality)"]
  figma_repo["figma-makes/{slug}/<br/>git repo · tagged import-YYYY-MM-DD<br/>(DEC-002)"]

  subgraph onboarding["Onboarding inside hwp-platform/"]
    import_skill["/import-figma {url} {slug}"]
    analysis["docs/clients/{slug}/<br/>figma-analysis.md + figma-notes.md"]
    classify["Classify: block · template · composition<br/>(docs/plans/phase-1-design-system + domain-model.md §7)"]
  end

  subgraph app["apps/site-{slug}/"]
    client_config["client.config.ts<br/>tenantId · bookingAdapter · blockDefaults · features · theme<br/>(DEC-009)"]
    theme["src/theme/tokens.json or tokens-{season}.json<br/>(DEC-005)"]
    compositions["src/compositions/"]
    routes["src/app/[locale]/"]
  end

  coreui["@hwp/core-ui<br/>shared blocks · templates · primitives"]

  subgraph deploy["Vercel (DEC-007)"]
    preview["Preview deploy per PR"]
    prod["Production · custom domain · Postgres · Blob"]
  end

  designer --> figma_repo
  figma_repo --> import_skill
  import_skill --> analysis
  analysis --> classify
  classify --> compositions
  classify --> client_config
  classify --> theme
  classify -- promote new block --> coreui
  compositions --> coreui
  routes --> compositions
  client_config --> compositions
  theme --> compositions
  routes -- pnpm build --> preview
  preview -- merge to main --> prod
```

## Key invariants

- **Figma is reference, not codegen.** Classification (block vs template vs composition) is a human-led step driven by [`domain-model.md §7`](../architecture/domain-model.md).
- **Per-client surface stays small.** Most work for client N+1 is `client.config.ts` + `tokens.json` + a few compositions. Blocks come from `@hwp/core-ui`.
- **Re-imports preserve history.** [`/import-figma`](../../.claude/skills/import-figma/SKILL.md) runs `git pull --ff-only` against the same origin and adds a new dated tag — old exports stay reachable via `git checkout import-YYYY-MM-DD`.
- **Preview deploys are the design review surface.** Every PR gets a Vercel preview URL; the designer reviews the rendered site, not a Figma diff.
