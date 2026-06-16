# hwe Component Catalog

Manually-maintained index of every reusable AI/tooling component in this repository.
Every PR adding, renaming, removing, or changing the status/version of a component MUST update this file.

Sort: by category, then by name (ascending).

Lifecycle: `alpha → beta → stable → deprecated → archived` (see `docs/specs/general/lifecycle.md` once defined).

---

## Skills

| Name | Status | Version | Location | Description |
|---|---|---|---|---|
| add-block | alpha | 0.2.0 | `.claude/skills/add-block/` | Add a block with fake content (from Figma Make reference when available) to an existing page composition. Validates registry, generates typed content in the site's language, runs typecheck. Run `/create-page` first if the composition doesn't exist. |
| archive | alpha | 0.1.0 | `.claude/skills/archive/` | SPECBOOT Phase 5. Closes a story after verify green: syncs specs to code reality, updates catalog and project-map, marks story done, repairs cross-references, commits. Executed by `docs-writer`. Invoke with `/archive {story-path}`. |
| booking-adapter | alpha | 0.1.0 | `docs/skills/frontend/booking-adapter.md` | How-to guide: add a new booking engine adapter (Witbooking/Mastercamping/Resalys) to the engine-agnostic booking layer. Implement `BookingSearchAdapter`, register in the registry map, declare the engine in `TenantConfig.booking`. THR is the reference. DEC-025. |
| commit | alpha | 0.1.0 | `.claude/skills/commit/` | Inspect the working tree, cluster changes into logical units, draft Conventional Commits in English, ask for confirmation, and create the commits. Refuses secrets, never skips hooks, never amends. |
| enrich-us | alpha | 0.1.0 | `.claude/skills/enrich-us/` | Enrich one user story into a developer-ready technical spec via sub-agent |
| design-block | alpha | 0.1.0 | `.claude/skills/design-block/` | Generate a visual specification for a block without a Figma reference. Reads `design-language.md` + `tokens.json` + existing blocks. Invokes `ux-ui-analyst` Mode B. Output: `docs/clients/{slug}/block-specs/{BlockName}.visual-spec.md` (DEC-016). |
| import-figma | alpha | 0.4.0 | `.claude/skills/import-figma/` | Clone or re-import a Figma Make repo into `figma-makes/{slug}/`, tag the import, extract tokens, write provisional client context, and extract `design-language.md` (DEC-002, DEC-016) |
| plan-to-stories | alpha | 0.1.0 | `.claude/skills/plan-to-stories/` | Decompose a plan/PRD into enriched user stories via map-reduce pipeline |
| scaffold-block | alpha | 0.2.0 | `.claude/skills/scaffold-block/` | Scaffold a new block: use `--target base` (default) for `hwe-core/packages/core-ui/src/base-blocks/` or `--target client` for `src/blocks/` in the client repo. Creates the folder + 5 mandatory files from templates per `docs/contracts/frontend/block-contract.md`. DEC-015 + DEC-017. |
| scaffold-site | alpha | 0.3.0 | `.claude/skills/scaffold-site/` | Configure a client repo cloned from hwe-template: creates `src/blocks/registry.ts`, `src/app/globals.css`, `src/theme/tokens.json`, `tailwind.config.ts`, `client.config.ts`, `next.config.mjs`, and a `layout.tsx` that wraps the app in `TenantProvider` + `SiteShell`, following DEC-011 + DEC-015 + DEC-017 + DEC-024/025. Reads `import-figma` outputs (tokens.json, language). |
| scaffold-variant | stub | — | `.claude/skills/scaffold-variant/` | Add a structural variant subfolder to an existing block (DEC-008). Stub — implemented when 3+ blocks need it. |
| security-audit | alpha | 0.1.0 | `.claude/skills/security-audit/` | Unified 7-area security audit runner. Headers, cookies, inputs, secrets, RGPD, dependencies, Next.js patterns. Saves `docs/audits/{slug}/security/security-audit-{date}.md`. Invoke with `/security-audit {slug}`. |
| security-fix | alpha | 0.1.0 | `.claude/skills/security-fix/` | Applies fixes from the latest security audit in up to 6 committed groups: headers → RGPD → input handling → secrets → dependencies → Next.js patterns. Invoke with `/security-fix {slug}`. |
| security-audit-headers | alpha | 0.1.0 | `docs/skills/security/security-audit-headers.md` | Audit HTTP security headers: CSP, HSTS, X-Content-Type-Options, X-Frame-Options, Referrer-Policy, Permissions-Policy. Run when setting up a new site or modifying next.config.mjs. |
| security-audit-cookies | alpha | 0.1.0 | `docs/skills/security/security-audit-cookies.md` | Audit cookie consent (RGPD): no non-essential cookies before explicit opt-in, Secure/HttpOnly/SameSite flags on all cookies. Run pre-deploy and after adding analytics or tracking. |
| security-audit-inputs | alpha | 0.1.0 | `docs/skills/security/security-audit-inputs.md` | Audit input handling: dangerouslySetInnerHTML, eval(), Route Handler Zod coverage, file upload validation. Run after any block with user input. |
| security-audit-secrets | alpha | 0.1.0 | `docs/skills/security/security-audit-secrets.md` | Audit secrets and credentials: grep for API keys, tokens, passwords in source code and git history. Run pre-deploy and after new service integrations. |
| security-audit-rgpd | alpha | 0.1.0 | `docs/skills/security/security-audit-rgpd.md` | Audit RGPD compliance: privacy policy page, footer link, cookie consent, data inventory, deletion procedure. Run before any site goes to production. |
| security-audit-dependencies | alpha | 0.1.0 | `docs/skills/security/security-audit-dependencies.md` | Audit npm dependencies: pnpm audit for CVEs, lock file integrity, deprecated packages, low-download packages (supply chain risk). Run weekly and pre-deploy. |
| security-audit-nextjs | alpha | 0.1.0 | `docs/skills/security/security-audit-nextjs.md` | Audit Next.js patterns: server/client boundary, Route Handler Zod, no external API from client files, tenant isolation in packages. Run after any Route Handler or server component change. |
| security-audit-ai-content | stub | — | `docs/skills/security/security-audit-ai-content.md` | Placeholder: AI content safeguards — versioning, human gate, guardrails, session limits, prompt injection, rollback. Activates when Payload+AI content pipeline is integrated. |
| seo-audit | alpha | 0.1.0 | `.claude/skills/seo-audit/` | Unified 7-area audit runner. Fetches the live site, runs all checks in one pass, saves `docs/audits/{slug}/seo/seo-audit-{date}.md`. Invoke with `/seo-audit {slug}`. |
| seo-fix | alpha | 0.1.0 | `.claude/skills/seo-fix/` | Applies fixes from the latest audit report in 5 committed groups: images → JSON-LD → meta tags → semantic HTML → GEO content. Reads specs from `docs/specs/seo/`. Invoke with `/seo-fix {slug}`. |
| seo-audit-semantic | alpha | 0.1.0 | `docs/skills/seo/seo-audit-semantic.md` | Audit semantic HTML: single H1, heading hierarchy, landmark elements, aria-labels, no-div violations. Run after every block creation. |
| seo-audit-meta | alpha | 0.1.0 | `docs/skills/seo/seo-audit-meta.md` | Audit title format, meta description length, canonical URL, Open Graph tags, and html lang attribute. Run per page. |
| seo-audit-images | alpha | 0.1.0 | `docs/skills/seo/seo-audit-images.md` | Audit every img: alt text quality, explicit dimensions, loading strategy, hero preload, file format. Run after any block with images. |
| seo-audit-structured-data | alpha | 0.1.0 | `docs/skills/seo/seo-audit-structured-data.md` | Audit JSON-LD schemas: required types per page, field completeness, no placeholders, placement in head. Run per page and pre-deploy. |
| seo-audit-local | alpha | 0.1.0 | `docs/skills/seo/seo-audit-local.md` | Audit NAP consistency across header/footer/JSON-LD, geo coordinates precision, location keywords, proximity phrases, hreflang. |
| seo-audit-performance | alpha | 0.1.0 | `docs/skills/seo/seo-audit-performance.md` | Audit Core Web Vitals signals: hero preload (LCP), image dimensions and font-display (CLS), native button usage (INP). |
| seo-audit-geo-llm | alpha | 0.1.0 | `docs/skills/seo/seo-audit-geo-llm.md` | Audit GEO / LLM citability: first paragraph, entity naming, FAQPage, sameAs links, additionalProperty proximity, SSR check. |
| setup-booking | alpha | 0.2.0 | `.claude/skills/setup-booking/` | Onboard a client site for a booking engine: writes `booking` into `client.config.ts`, adds the engine's CSP domains to `next.config.mjs`, scaffolds the `[data-engine]` CSS override section, ensures `TenantProvider` wraps the app, and optionally adds `BookingSearchBlock` (`--with-block`) / `BookingFavoritesBlock` (`--with-favorites`) / `BookingOnenightBlock` (`--with-onenight --category <id>`) instances, toggling the matching `booking.features`. Params discriminated by engine. DEC-025 + DEC-027. |

## Agents

| Name | Status | Version | Location | Description |
|---|---|---|---|---|
| implementer | alpha | 0.1.0 | `.claude/agents/implementer.md` | Sonnet. Executes an approved proposal artifact TDD-first — writes tests, sees them fail, implements, sees them pass. Does not innovate beyond the proposal. (`/apply`) |
| planner | alpha | 0.1.0 | `.claude/agents/planner.md` | Opus. Designs the proposal artifact for an enriched user story — files to touch, patterns to follow, tests to write, risks, open questions. Read-only; does not write code. (`/propose`) |
| reviewer | alpha | 0.1.0 | `.claude/agents/reviewer.md` | Opus. Independent diff review against `base-standards.md` and domain rules. Sees ONLY the diff + the US — never the Planner's reasoning or Implementer's notes. Outputs severity-tagged issues or approval. |
| verifier | alpha | 0.1.0 | `.claude/agents/verifier.md` | Haiku. Mechanical green/red on `pnpm typecheck → test → lint → build`, fail-fast. Reports verbatim logs. No diagnosis, no fix suggestions. (`/verify`) |
| architect | alpha | 0.1.0 | `.claude/agents/architect.md` | Opus. Platform guardian — owns DECs, contracts, domain model, package boundaries. Produces DEC proposals and architecture reviews. Invoke before any structural change. |
| docs-writer | alpha | 0.1.0 | `.claude/agents/docs-writer.md` | Sonnet. Knowledge guardian — creates and maintains skills, guides, plans, stories, catalog, README. Follows STD-DOC-SIMPLE. Invoke after any phase completes. |
| qa-engineer | alpha | 0.1.0 | `.claude/agents/qa-engineer.md` | Sonnet. Quality guardian — end-to-end behavioral QA beyond CI gates: responsiveness, accessibility, cross-block integration. Invoke after compositions assembled. |
| security-specialist | alpha | 0.1.0 | `.claude/agents/security-specialist.md` | Sonnet. Data protection guardian — audits RGPD, input handling, headers, CSP, cookies, secrets, dependencies. Invoke after any block handling user input; pre-deploy. |
| senior-developer | alpha | 0.1.0 | `.claude/agents/senior-developer.md` | Sonnet. Core package expert — reference for existing patterns in `hwe-core/packages/*/src/`. Guides implementer on idioms and conventions. |
| seo-geo-specialist | alpha | 0.1.0 | `.claude/agents/seo-geo-specialist.md` | Sonnet. Search visibility guardian — audits semantic HTML, heading hierarchy, structured data, meta tags, local SEO. Invoke after each block created. |
| ux-ui-analyst | alpha | 0.2.0 | `.claude/agents/ux-ui-analyst.md` | Sonnet. Dual-mode visual agent. Mode A — validate implementation against Figma reference. Mode B — produce a visual spec for blocks with no Figma design, using `design-language.md` + existing blocks (DEC-016). |

## MCP

| Name | Status | Version | Location | Description |
|---|---|---|---|---|
| _(none yet)_ | | | | |

## Agent teams

| Name | Status | Version | Location | Description |
|---|---|---|---|---|
| agent-teams-playbook | alpha | 0.1.0 | `docs/specs/ai/agent-teams-playbook.md` | Pre-defined team compositions for 7 task types. Max 3 agents per team. Opus leads, Sonnet teammates. |

## Specs

| Name | Status | Version | Location | Description |
|---|---|---|---|---|
| block-architecture | alpha | 0.1.0 | `docs/specs/frontend/block-architecture.md` | 4-layer extensible block system: content schema (always), variants (CVA/structural/functional), config schema (behavioral options), adapter (external services). SEO/security gates per block. STD-AGENT-ARCHITECTURE. |
| content-operations | alpha | 0.1.0 | `docs/specs/ai/content-operations.md` | The product's content-AI system: 5 content agents (Content Editor/Generator, Bulk Operator, Code Builder, Planner), agent-rules+router, prompt chaining, Zod output validation, bulk editing, client portal, observability, evals. Explicitly distinct from the 11 Claude Code dev agents. Spec — activates with Payload+AI integration. |
| composition-rules | alpha | 0.1.0 | `hwe-core/packages/core-ui/src/composition-rules/` | Runtime + build-time module that defines block ordering constraints, co-occurrence rules, and slot compatibility for page compositions. Consumed by Payload CMS editor and the BlockRenderer. |
| coding-standards | alpha | 0.1.0 | `docs/specs/frontend/coding-standards.md` | hwe frontend coding rules: component structure, import order, no-enum, React patterns, anti-patterns table. Extends base-standards + frontend-standards. |
| security-standards | alpha | 0.1.0 | `docs/specs/security/security-standards.md` | Security and RGPD rules: input validation, CSP, cookie consent, secrets, prompt injection, pre-deploy checklist. Legal obligation for EU deployment. |
| seo-standards | alpha | 0.1.0 | `docs/specs/seo/seo-standards.md` | Title format, meta descriptions, H1 rules, image alt/dimensions, URL slugs, indexation |
| semantic-html | alpha | 0.1.0 | `docs/specs/seo/semantic-html.md` | Landmark elements table, no-div rule, per-block semantic requirements |
| local-seo | alpha | 0.1.0 | `docs/specs/seo/local-seo.md` | NAP consistency, address format, geo coordinates (4 decimal places), hreflang |
| geo-llm-optimization | alpha | 0.1.0 | `docs/specs/seo/geo-llm-optimization.md` | GEO strategy: citable first paragraphs, FAQPage, entity naming, @graph pattern, sameAs |
| performance-seo | alpha | 0.1.0 | `docs/specs/seo/performance-seo.md` | Core Web Vitals rules: LCP (hero eager+preload), CLS (explicit dimensions), INP (button not div) |
| json-ld-schemas | alpha | 0.1.0 | `docs/specs/seo/schemas/` | 11 JSON-LD templates with `{{VARIABLE}}` placeholders: Organization, Hotel/Campground, Restaurant, TouristAttraction, AccommodationSingle/List, Reviews, Offers, FAQ, Event, Breadcrumbs |

---

## Deprecated

| Name | Category | Last version | Replaced by | Deprecated on |
|---|---|---|---|---|
| _(none yet)_ | | | | |
