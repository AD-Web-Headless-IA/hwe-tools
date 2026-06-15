# `docs/` — index and loading policy

---

## 👋 ¿Nuevo en el equipo?

Empieza aquí — en este orden:

1. **[🚀 Tu primer día](./guides/first-day-setup.md)** — instala las herramientas y levanta el proyecto
2. **[🗺️ Mapa del proyecto](./guides/project-map.md)** — entiende dónde vive cada cosa
3. **[🔄 Diccionario WordPress → hwe](./guides/wordpress-to-hwe.md)** — traduce lo que ya sabes
4. **[🗓️ Tu día a día](./guides/daily-workflow.md)** — el flujo de trabajo diario
5. **[📖 Glosario](./guides/glossary.md)** — cuando encuentres un término que no reconoces
6. **[🧱 Bloques](./guides/guia-bloques.md)** — cómo crear/añadir un bloque y sus variantes ([fichas](./guides/bloques/README.md))
7. **[🤖 Agentes](./specs/ai/agent-directory.md)** — qué agentes hay y cuándo convocarlos

> El resto de esta página es para agentes de IA y developers con más contexto del proyecto.

---

> **Purpose:** keep agent context small. This file maps each task type to the **minimum** set of docs the agent should load — never load `architecture/architecture.md` whole unless explicitly asked.
> **Rule:** if your task is not listed here, identify the closest match and load only those files. If none match, ask the user before loading more than 3 files.

## Directory map

```
docs/
├── guides/             ← onboarding guides for developers new to the project
├── architecture/       ← system constitution + domain model + decisions
│   ├── architecture.md              (overview + 'where each thing lives' index — DEC-018)
│   ├── architecture-legacy.md       (🗄️ historical archive — NOT current; do not load for state)
│   ├── architecture-all-options.md  (options evaluated before decisions)
│   ├── architecture-audit.md        (audit findings — Phase B)
│   ├── briefing.md                  (vision + business model)
│   ├── decisions.md                 (DEC-001 → latest)
│   └── domain-model.md              (multi-tenant model — load for classification)
├── contracts/
│   └── frontend/       ← how to build blocks / templates / themes / compositions
│       ├── block-contract.md
│       ├── client-composition.md
│       ├── structure.md
│       ├── template-contract.md
│       └── theme-tokens.md
├── specs/              ← rules layer (always loaded by every agent)
│   ├── general/        ← cross-cutting standards
│   │   ├── base-standards.md
│   │   ├── lifecycle.md
│   │   └── agent-standards.md
│   ├── frontend/       ← React / Next.js / Tailwind rules
│   │   ├── frontend-standards.md
│   │   ├── coding-standards.md
│   │   └── block-architecture.md    (4-layer block system — load for any block task)
│   ├── seo/            ← SEO, semantic HTML, local SEO, GEO-LLM, Core Web Vitals
│   │   ├── seo-standards.md
│   │   ├── semantic-html.md
│   │   ├── local-seo.md
│   │   ├── geo-llm-optimization.md
│   │   ├── performance-seo.md
│   │   └── schemas/    ← 11 JSON-LD schema templates
│   ├── security/       ← RGPD, input handling, headers, secrets, prompt injection
│   │   └── security-standards.md
│   └── cms/            ← (coming)
├── skills/
│   ├── frontend/       ← how-to guides for common dev tasks
│   │   ├── block-creation.md
│   │   ├── booking-adapter.md
│   │   └── theme-tokens-pipeline.md
│   ├── security/       ← 8 security audit how-to guides (one per audit type)
│   │   ├── security-audit-headers.md
│   │   ├── security-audit-cookies.md
│   │   ├── security-audit-inputs.md
│   │   ├── security-audit-secrets.md
│   │   ├── security-audit-rgpd.md
│   │   ├── security-audit-dependencies.md
│   │   ├── security-audit-nextjs.md
│   │   └── security-audit-ai-content.md  ← stub (pre-Payload integration)
│   ├── seo/            ← 7 SEO audit how-to guides (one per audit type)
│   │   ├── seo-audit-semantic.md
│   │   ├── seo-audit-meta.md
│   │   ├── seo-audit-images.md
│   │   ├── seo-audit-structured-data.md
│   │   ├── seo-audit-local.md
│   │   ├── seo-audit-performance.md
│   │   └── seo-audit-geo-llm.md
│   └── ai/             ← agent system documentation
│       ├── agent-directory.md
│       ├── agent-teams-playbook.md
│       ├── specboot-flow.md
│       └── content-operations.md      ← product content-AI agents (distinct from dev agents)
├── plans/              ← SPECBOOT epic plans
│   ├── README.md
│   ├── walking-skeleton.md
│   ├── phase-0-frontend-skeleton.md
│   └── phase-1-design-system/
├── stories/            ← enriched User Stories (by domain)
│   ├── frontend/
│   ├── infra/
│   └── cms/
├── clients/            ← per-client design analysis (one subfolder per client slug)
├── integrations/       ← external service integration docs
│   └── bookings/       ← booking engines (THR done; Witbooking/Mastercamping/Resalys planned)
├── diagrams/           ← Mermaid architecture diagrams
│   ├── block-variant-resolution.md
│   ├── booking-architecture.md
│   ├── core-ui-internal.md
│   ├── figma-to-production.md
│   ├── monorepo-overview.md
│   └── page-tetris.md
├── catalog.md          ← skills + agents registry
├── claude-code-instructions.md
└── README.md           ← this file
```

## Documentation map

| File | What it is | When to load |
|---|---|---|
| `guides/first-day-setup.md` | Step-by-step onboarding for a new developer | Day 1 setup |
| `guides/project-map.md` | Visual map of the full project structure | Orientation, finding files |
| `guides/wordpress-to-hwe.md` | Concept translation dictionary WP → hwe | Onboarding from WP background |
| `guides/daily-workflow.md` | Day-to-day commands and patterns | Reference during normal work |
| `guides/glossary.md` | Plain-language definitions of all technical terms | When a term is unfamiliar |
| `guides/guia-bloques.md` | How to create/add a block, how to ask Claude for it, and the variants | Adding blocks to a page; learning the catalog |
| `guides/bloques/` | One usage card per block (qué es · variantes · dónde · ejemplo) | Looking up a specific block's fields/variants |
| `architecture/architecture.md` | Overview (~1 screen): vision, current stack, "where each thing lives" index (DEC-018) | Orientation; finding the canonical doc for a topic |
| `architecture/architecture-legacy.md` | 🗄️ Historical archive of the old constitution (cdmon/Hetzner/MariaDB/PHP, `hwe-platform` monorepo, eliminated packages). **Not current.** | Only when researching *why* a past approach existed |
| `architecture/architecture-all-options.md` | Options evaluated before decisions were made | Only when revisiting a past architectural choice |
| `architecture/briefing.md` | Vision, business model, Septeo Hospitality context | Any task touching platform vision or business model |
| `architecture/domain-model.md` | Multi-tenant model — types, features, accommodation entity | **Always** when classifying Figma modules, designing blocks/templates, modeling Payload schemas, or wiring routes |
| `architecture/decisions.md` | DEC-001 → latest | Before proposing structural changes — grep for related DECs first |
| `contracts/general/workspace-structure.md` | Workspace layout — repos, relative paths, what lives where. No absolute paths. | **Always** for scaffolding, bootstrap, or any skill that writes to the filesystem |
| `contracts/frontend/structure.md` | Monorepo layout, naming, imports | Scaffolding packages/apps, moving files |
| `contracts/frontend/block-contract.md` | How to build a `@hwe/core-ui` block — the *what* (files, exports, registry) | New block, modifying a block, wiring BlockRenderer |
| `specs/frontend/block-architecture.md` | 4-layer block system — the *how* (content schema, variants, config schema, adapter). SEO/security gates. Lifecycle. | **Always** for any block task — decides which layers to build before writing a line of code |
| `contracts/frontend/template-contract.md` | How to build a page template (3-layer schema) | New template, extending a template per client |
| `contracts/frontend/theme-tokens.md` | Figma → tokens.json → Tailwind preset | New client theme, token issues, designer onboarding |
| `contracts/frontend/client-composition.md` | Compositions vs templates vs blocks | New client site, deciding where UI belongs |
| `catalog.md` | Skills + agents registry | Adding, renaming, or changing a skill / agent / MCP |
| `specs/ai/agent-directory.md` | All 11 agents: roles, models, when to invoke | When invoking an agent; selecting the right specialist |
| `specs/ai/agent-teams-playbook.md` | Pre-defined team compositions per task type | Picking a team for a task |
| `specs/ai/specboot-flow.md` | SPECBOOT pipeline detail: phases, inputs, outputs | Running a full SPECBOOT cycle |
| `specs/ai/content-operations.md` | The **product** content-AI system: 5 content agents, prompt chaining, bulk editing, client portal, evals (NOT the 11 dev agents) | Any task touching AI content generation/editing, the client portal, or content evals |
| `skills/security/security-audit-headers.md` | Audit HTTP security headers: CSP, HSTS, X-Content-Type-Options, X-Frame-Options, Referrer-Policy, Permissions-Policy | New site setup; any next.config.mjs change; pre-deploy |
| `skills/security/security-audit-cookies.md` | Audit cookie consent (RGPD): no non-essential cookies before opt-in, Secure/HttpOnly/SameSite flags | New site setup; adding analytics or booking tracking; pre-deploy |
| `skills/security/security-audit-inputs.md` | Audit input handling: dangerouslySetInnerHTML, eval(), Route Handler Zod coverage, file upload validation | Any block with user input; any Route Handler added; pre-deploy |
| `skills/security/security-audit-secrets.md` | Audit secrets: API key patterns in source code and git history, .env hygiene | After new service integration; after any suspicious commit; pre-deploy |
| `skills/security/security-audit-rgpd.md` | Audit RGPD compliance: privacy policy, footer link, cookie consent, data inventory, deletion procedure | Before any site goes to production; after adding personal data collection |
| `skills/security/security-audit-dependencies.md` | Audit dependencies: pnpm audit CVEs, lock file integrity, deprecated packages | Weekly; after pnpm add/update; pre-deploy |
| `skills/security/security-audit-nextjs.md` | Audit Next.js patterns: server/client boundary, Route Handler Zod, no external API from client, tenant isolation | After any Route Handler or server component change; pre-deploy |
| `skills/security/security-audit-ai-content.md` | Placeholder: AI content safeguards spec (versioning, human gate, guardrails, prompt injection) | Activate after Payload + AI content pipeline integration |
| `skills/seo/seo-audit-semantic.md` | Audit semantic HTML (H1, landmarks, no-div rule) | After any block creation or JSX change |
| `skills/seo/seo-audit-meta.md` | Audit title, meta description, canonical, Open Graph, lang | New page route, layout.tsx changes, pre-deploy |
| `skills/seo/seo-audit-images.md` | Audit all images: alt, dimensions, loading, hero preload | Any block with images; pre-deploy |
| `skills/seo/seo-audit-structured-data.md` | Audit JSON-LD schemas per page type | New client setup; schema changes; pre-deploy |
| `skills/seo/seo-audit-local.md` | Audit NAP, geo coords, location keywords, proximity, hreflang | New client setup; client.config.ts changes; pre-deploy |
| `skills/seo/seo-audit-performance.md` | Audit Core Web Vitals signals (LCP/CLS/INP) | HeroBlock changes; font changes; booking widget; pre-deploy |
| `skills/seo/seo-audit-geo-llm.md` | Audit GEO citability: first paragraph, FAQPage, sameAs, SSR | Homepage setup; structured data changes; pre-deploy |
| `specs/frontend/coding-standards.md` | Day-to-day coding rules: component structure, TS strict patterns, React patterns, anti-patterns table | Any frontend task; code review; onboarding |
| `specs/security/security-standards.md` | RGPD compliance, input handling, HTTP headers, secrets, prompt injection, pre-deploy checklist | New site setup; Payload/booking integration; any block with user input; pre-deploy |
| `diagrams/booking-architecture.md` | Booking adapter layer + `BookingSearchBlock` — architecture, mount sequence, file map, CSS overrides, status | Understanding or extending booking; before adding an engine |
| `skills/frontend/booking-adapter.md` | How-to: add a new booking engine adapter (steps + checklist) | Adding/implementing Witbooking/Mastercamping/Resalys (or a new booking widget) |
| `integrations/bookings/README.md` | Booking engine integrations index | Any booking adapter task |
| `integrations/bookings/thr/*` | THR ILib v4 docs (`thr-ilib-v4.md`), widget reference, internal notes + CSS personalization reference | Implementing or modifying THR adapter, or theming the THR widget |

## Rules layer (always loaded)

These are short. **Every agent working on this repo loads them as system context.** Do not duplicate their content here.

| File | What it is |
|---|---|
| [`specs/general/base-standards.md`](specs/general/base-standards.md) | Common rules (TS strict, Zod, TDD, English, naming, commits) |
| [`specs/frontend/frontend-standards.md`](specs/frontend/frontend-standards.md) | React/Next/Tailwind/a11y/i18n rules (extends base) |
| [`specs/general/lifecycle.md`](specs/general/lifecycle.md) | alpha → beta → stable → deprecated → archived |
| [`specs/general/agent-standards.md`](specs/general/agent-standards.md) | STD-AGENT-VISUAL / SEO / SECURITY — promotion gates for blocks |
| [`specs/seo/seo-standards.md`](specs/seo/seo-standards.md) | Titles, meta descriptions, heading hierarchy, images, URLs — hospitality SEO |
| [`specs/seo/semantic-html.md`](specs/seo/semantic-html.md) | Landmark elements, semantic block usage table, no-div rule |
| [`specs/seo/local-seo.md`](specs/seo/local-seo.md) | NAP consistency, geo coordinates, proximity keywords |
| [`specs/seo/geo-llm-optimization.md`](specs/seo/geo-llm-optimization.md) | LLM citation optimization, structured data for AI, FAQPage triggers |
| [`specs/seo/performance-seo.md`](specs/seo/performance-seo.md) | Core Web Vitals as SEO signal — LCP, CLS, INP thresholds |
| [`specs/seo/schemas/README.md`](specs/seo/schemas/README.md) | Index: page type → which JSON-LD schemas to load |
| [`specs/frontend/coding-standards.md`](specs/frontend/coding-standards.md) | Actionable coding rules: component structure, TS patterns, React patterns, anti-patterns |
| [`specs/security/security-standards.md`](specs/security/security-standards.md) | RGPD + security rules — load for any task touching user data, input, headers, or AI |

## Task-to-load recipes

Concrete recipes — copy the load list for the task at hand. The token budget is approximate.

### Scaffold a new block in `@hwe/core-ui` or in a client site

```
Always:   docs/contracts/general/workspace-structure.md
          docs/specs/general/base-standards.md
          docs/specs/frontend/frontend-standards.md
          docs/architecture/domain-model.md             (to know if block is core, feature-gated, or seasonized)
          docs/specs/frontend/block-architecture.md     (decide which of the 4 layers the block needs)
On demand: docs/contracts/frontend/block-contract.md   (mandatory files, exports, registry wiring)
           docs/specs/seo/semantic-html.md              (if block has headings, images, or links)
           docs/specs/security/security-standards.md   (if block has user inputs or connects to an adapter)
```

> **DEC-015 + DEC-017:** base-blocks go to `hwe-core/packages/core-ui/src/base-blocks/`; client-specific blocks go to `src/blocks/` inside the client's independent repo. Use `/scaffold-block {Name} --target client` for client blocks. See `docs/skills/frontend/block-creation.md §Decide the target`.

**Budget:** ~4k tokens. **vs. loading `architecture/architecture.md` whole:** ~50k tokens. **Reduction:** ~12×.

### Scaffold a new page template

```
Always:   docs/specs/general/base-standards.md
          docs/specs/frontend/frontend-standards.md
          docs/architecture/domain-model.md         (which type defaults it serves, what features gate it)
On demand: docs/contracts/frontend/template-contract.md
          docs/contracts/frontend/block-contract.md  (templates reference blocks)
```

**Budget:** ~3.5k tokens.

### Bootstrap a new client site (`site-{slug}/`)

```
Always:   docs/contracts/general/workspace-structure.md
          docs/specs/general/base-standards.md
          docs/specs/frontend/frontend-standards.md
On demand: docs/contracts/frontend/structure.md
          docs/contracts/frontend/theme-tokens.md
          docs/contracts/frontend/client-composition.md
          docs/clients/{slug}/figma-notes.md  (if exists)
```

**Budget:** ~3k tokens.

### Onboard a booking engine for a client site

```
Always:   docs/diagrams/booking-architecture.md           (the pattern: tenant-driven engine + adapter)
On demand: .claude/skills/setup-booking/SKILL.md            (the /setup-booking skill — self-contained)
          docs/integrations/bookings/{engine}/{engine}-notes.md  (CSP domains, quirks)
          docs/skills/frontend/booking-adapter.md           (only if the engine's adapter is not implemented yet)
```

**Shortcut:** `/setup-booking --engine <engine> <credentials> [--with-block]` wires `client.config.ts` (booking) + CSP + CSS overrides + `TenantProvider` in one pass. **Budget:** ~2k tokens.

### Build a per-client composition

```
Always:   docs/specs/general/base-standards.md
          docs/specs/frontend/frontend-standards.md
On demand: docs/contracts/frontend/client-composition.md
          docs/clients/{slug}/figma-notes.md  (if exists)
          docs/contracts/frontend/template-contract.md  (if wrapping a template)
```

**Budget:** ~2k tokens.

### Import a new Figma Make reference

```
Always:   docs/contracts/general/workspace-structure.md
          docs/specs/general/base-standards.md
On demand: .claude/skills/import-figma/SKILL.md  (the skill is self-contained)
```

**Budget:** ~1k tokens. The `/import-figma` skill is the canonical procedure.

### Classify a Figma Make module (Atomic Block / Template / Composition)

```
Always:   docs/specs/general/base-standards.md
          docs/specs/frontend/frontend-standards.md
          docs/architecture/domain-model.md               ← THE CRITERION (multi-tenant rules)
          docs/plans/phase-1-design-system/plan.md        ← THE METHODOLOGY
          docs/plans/phase-1-design-system/sources/{slug}.md  ← THE INVENTORY
          docs/clients/{slug}/figma-analysis.md           ← THE EVIDENCE
On demand: docs/contracts/frontend/block-contract.md  (if you suspect Atomic Block)
          docs/contracts/frontend/template-contract.md  (if you suspect Template)
          docs/contracts/frontend/client-composition.md  (if you suspect Composition)
```

**Budget:** ~5-6k tokens. The `domain-model.md` load is non-negotiable — without it, classification falls back to generic intuition and misses multi-tenant criteria.

### Add or modify a design token

```
Always:   docs/specs/general/base-standards.md
          docs/specs/frontend/frontend-standards.md
          docs/architecture/domain-model.md         (to know if client has hasSeasons → multi-tokens layout)
On demand: docs/contracts/frontend/theme-tokens.md
          src/theme/tokens.json  (single-theme client)
          src/theme/tokens-*.json  (seasonized client, per DEC-005)
```

**Budget:** ~3k tokens.

### Propose a structural change (new package, new convention, layout shift)

```
Always:   docs/specs/general/base-standards.md
On demand: docs/architecture/decisions.md  (search for related DECs first — avoid contradicting)
          docs/architecture/domain-model.md  (if the change touches multi-tenant model or client typology)
          docs/architecture/architecture.md  (overview — to find the canonical doc for the area you're changing)
          docs/README.md  (this file — to know what other docs exist)
```

**Budget:** depends on which DECs are relevant. `architecture.md` is now a thin overview/index — load it to locate the canonical doc, then load that doc.

### Extend the domain model (add a type, a feature, a season behavior, etc.)

```
Always:   docs/architecture/domain-model.md         ← the file you are extending
          docs/architecture/decisions.md            ← check what is already decided
On demand: docs/contracts/frontend/* depending on which dimension you touch
```

**Budget:** ~5k tokens. The output is a new version of `domain-model.md` (bump the version in the table at the bottom). When the model stabilizes enough for a phase, a DEC formalizes the snapshot.

### SPECBOOT cycle — enrich a User Story (`/enrich-us` or `/plan-to-stories` phase 2)

```
Always (sub-agent inherits):
          docs/specs/general/base-standards.md
          docs/specs/frontend/frontend-standards.md  (if frontend story)
On demand (per story):
          The story file itself (verbatim, inlined by orchestrator)
          docs/architecture/briefing.md  (project brief)
          docs/contracts/frontend/*  (whichever match the story's component type)
          docs/plans/{epic}/stories/US-{prior}.md  (if this story depends on prior ones)
```

The orchestrator skill (`plan-to-stories` or `enrich-us`) is responsible for telling the sub-agent **which** docs to load — see the skill's own SKILL.md.

### SPECBOOT archive — close a story after verify green (`/archive`)

```
Always:
          The story file (to read status + affected scope)
          docs/plans/{epic}/proposals/US-{NNN}-proposal.md  (to detect divergence)
          docs/specs/ai/specboot-flow.md                   (Phase 5 process)
On demand (per story):
          docs/specs/{area}/*   (specs the story touched — sync to code reality)
          docs/catalog.md       (if new components or skills were created)
          docs/guides/project-map.md  (if file structure changed)
```

**Shortcut:** `/archive docs/plans/{epic}/stories/US-NNN-{slug}.md` — run after `/verify` green. Executed by `docs-writer` agent.

**Budget:** ~2–3k tokens. The skill reads the story, the proposal, and the affected spec files only.

### Security audit or pre-deploy security review

```
Always:   docs/specs/security/security-standards.md
On demand: next.config.mjs                                (headers config)
          src/app/api/**                                 (Route Handlers — Zod coverage)
          hwe-core/packages/core-ui/src/base-blocks/**   (base-blocks with user input)
          src/blocks/**                                  (client blocks with user input)
          docs/skills/security/security-audit-headers.md  (header audit steps)
          docs/skills/security/security-audit-cookies.md  (cookie consent steps)
          docs/skills/security/security-audit-inputs.md   (input handling steps)
          docs/skills/security/security-audit-secrets.md  (secrets scan steps)
          docs/skills/security/security-audit-rgpd.md     (RGPD compliance steps)
          docs/clients/{slug}/data-inventory.md           (RGPD — if exists)
```

**Shortcut:** run `/security-audit {slug}` to execute all 7 active audits automatically.

**Budget:** ~2k tokens (spec only). Full audit via `/security-audit` is self-contained.

### Write code that handles user input or personal data

```
Always:   docs/specs/general/base-standards.md
          docs/specs/security/security-standards.md  §Input handling
On demand: docs/specs/frontend/coding-standards.md   §Error handling
```

**Budget:** ~3k tokens.

## Anti-patterns

- **Don't load `architecture/architecture-legacy.md`.** It is the old ~50k-token constitution, kept only as historical archive. The current `architecture.md` is a thin overview/index — load that instead.
- **Don't load every doc in `contracts/frontend/` "in case."** Each doc is self-contained. Load only those the task names.
- **Don't load `decisions.md` whole** to find one DEC. Grep for the DEC number or the topic, then read the section.
- **Don't load `figma-analysis.md` of clients other than the one in scope.** Each client's analysis is irrelevant to others.

## Adding a new doc

When you create a new file in `docs/`:

1. Add a row to the "Documentation map" table above.
2. Add a recipe to "Task-to-load recipes" if the doc enables a new kind of task.
3. Mention it in the relevant DEC in `docs/architecture/decisions.md` if the doc is born from a decision.

The index is the contract. A doc not listed here is a doc agents will not find.
