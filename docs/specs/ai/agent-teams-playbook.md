# Agent Teams Playbook

> Predefined team compositions for the most common hwe tasks. Pick the team for your task, invoke the lead first, then the teammates in parallel or sequence as indicated.

---

## Rules

- **Max 3 agents per team.** More agents = more noise, not more quality.
- **Opus for leads on complex tasks** (planner, reviewer, architect). Opus reasons more carefully through trade-offs.
- **Sonnet for teammates** (implementer + all domain specialists). Fast, cost-effective, specialized.
- **Haiku for verifier only.** It runs mechanical gates — no reasoning needed.
- **Specialists are read-only.** They audit and report. The implementer or senior-developer does the fixing.
- **Don't invoke a specialist if the task doesn't touch their domain.** A static copy block doesn't need security-specialist.

---

## Team Compositions

### 1. Create a block

**Task:** Implement a new `@hwe/core-ui` block from a Figma reference.

**Team:** `senior-developer` (lead) + `ux-ui-analyst` + `seo-geo-specialist`

| Agent | Role in this task |
|---|---|
| `senior-developer` | Guides the implementer on which existing block to mirror, reviews the 5-file contract compliance, validates CVA and Zod usage |
| `ux-ui-analyst` | After implementation: compare rendered block against Figma reference. Flag any visual mismatch before beta |
| `seo-geo-specialist` | After implementation: audit semantic HTML — heading hierarchy, alt text, landmark roles, link text |

**Workflow:**
1. Invoke `senior-developer` → get pattern guidance
2. `implementer` builds the block (SPECBOOT)
3. Invoke `ux-ui-analyst` + `seo-geo-specialist` in parallel → get audit reports
4. `implementer` fixes findings
5. `verifier` runs gates

**When to add security-specialist:** if the block handles user input (forms, date pickers, search fields).

---

### 2. Onboard a new client

**Task:** Set up a new `apps/site-{slug}/` with tokens, layout, and first composition.

**Team:** `senior-developer` (lead) + `security-specialist` + `seo-geo-specialist`

| Agent | Role in this task |
|---|---|
| `senior-developer` | Guides token extraction from figma-notes.md, validates layout.tsx wiring, reviews client.config.ts |
| `security-specialist` | After layout.tsx: audit headers (CSP, X-Frame-Options, Permissions-Policy), cookie consent strategy, RGPD checklist for the client's country |
| `seo-geo-specialist` | After layout.tsx: audit meta tags, Open Graph, structured data spec (Hotel / Campground schema), hreflang if i18n |

**Workflow:**
1. Run `/import-figma` first to generate figma-notes.md
2. `senior-developer` reviews token extraction strategy
3. `implementer` scaffolds the app
4. `security-specialist` + `seo-geo-specialist` in parallel → audit reports
5. `implementer` addresses findings
6. `verifier` runs gates

---

### 3. Architecture review

**Task:** Evaluate a structural change — new package, new pattern, cross-package contract.

**Team:** `architect` (lead) + `senior-developer` + `security-specialist`

| Agent | Role in this task |
|---|---|
| `architect` | Evaluates proposal against existing DECs, domain-model.md, and multi-tenant rules. Produces architecture review or DEC proposal |
| `senior-developer` | Validates that the proposal is buildable with current package idioms. Flags implementation friction |
| `security-specialist` | If the change involves data flow, authentication, or external services: data protection implications |

**When:** before `planner` produces a proposal for any story that crosses package boundaries or proposes a new convention.

**Output:** "aligned / misaligned / needs-DEC" verdict from architect + implementation feasibility note from senior-developer.

---

### 4. Pre-deploy review

**Task:** Final quality check before a site goes live.

**Team:** `qa-engineer` (lead) + `seo-geo-specialist` + `security-specialist`

| Agent | Role in this task |
|---|---|
| `qa-engineer` | Full page QA: functional tests, responsive at 375/768/1440px, keyboard navigation, focus management, cross-block integration |
| `seo-geo-specialist` | Pre-launch SEO checklist: structured data, meta tags, robots.txt, sitemap, all images have alt, heading hierarchy per page |
| `security-specialist` | Pre-launch security checklist: `pnpm audit`, headers scan, cookie consent live, no hardcoded secrets, RGPD compliance |

**Workflow:** all three run in parallel against the running dev server. Each produces a report. Blockers from any report block the deploy.

---

### 5. Document a phase or pattern

**Task:** After a phase completes or a new pattern is established, update the knowledge base.

**Team:** `docs-writer` (solo)

| Agent | Role in this task |
|---|---|
| `docs-writer` | Creates or updates skill docs, guides, catalog, README. Adds cross-references. Follows STD-DOC-SIMPLE |

**No teammates needed.** docs-writer is fully autonomous in `docs/`. Only invoke architect if a docs change also requires a contract or spec update.

---

### 6. Create a user story

**Task:** Produce a fully enriched, developer-ready user story from a raw feature idea.

**Team:** `planner` (lead) + `architect` + `seo-geo-specialist`

| Agent | Role in this task |
|---|---|
| `planner` | Runs the SPECBOOT `/propose` phase. Produces the proposal artifact |
| `architect` | Validates the proposal doesn't contradict existing DECs or domain-model.md. Flags cross-package concerns |
| `seo-geo-specialist` | If the story touches user-visible content: validates that the proposed semantic structure is SEO-sound before implementation begins |

**When:** skip seo-geo-specialist for pure infrastructure stories (no rendered HTML output).

---

### 7. Implement a user story

**Task:** Execute a SPECBOOT cycle for an enriched user story.

**Core pipeline (always):** `planner` → `implementer` → `reviewer` → `verifier` → `docs-writer`

| Phase | Agent | Invoke with |
|---|---|---|
| `/propose` | `planner` (Opus) | Enriched story path |
| `/apply` | `implementer` (Sonnet) | Approved proposal |
| `/review` | `reviewer` (Opus) | Diff + story |
| `/verify` | `verifier` (Haiku) | Working tree |
| `/archive` | `docs-writer` (Sonnet) | Story path (after verify green) |

**Add specialists based on story domain:**

| Story touches... | Add specialist | Phase |
|---|---|---|
| New block with headings, images, or links | `seo-geo-specialist` | After implementer, before reviewer |
| User input, cookies, personal data, external APIs | `security-specialist` | After implementer, before reviewer |
| Figma-referenced visual component | `ux-ui-analyst` | After implementer, before reviewer |
| Structural change or new pattern | `architect` | Before planner, to validate approach |
| Full composition or page assembly | `qa-engineer` | After verifier, before archive |

**Maximum per story:** 5 pipeline agents + up to 2 domain specialists = 7. If more than 2 specialists are needed, consider splitting the story.

---

## Quick reference

| Task | Lead | Teammate 1 | Teammate 2 |
|---|---|---|---|
| Create block | senior-developer | ux-ui-analyst | seo-geo-specialist |
| Onboard client | senior-developer | security-specialist | seo-geo-specialist |
| Architecture review | architect | senior-developer | security-specialist |
| Pre-deploy | qa-engineer | seo-geo-specialist | security-specialist |
| Document | docs-writer | — | — |
| Create story | planner | architect | seo-geo-specialist |
| Implement story | SPECBOOT pipeline (ends with docs-writer /archive) | + specialist(s) per domain | — |

---

## In simple terms

**En WordPress:** cuando instalas un plugin nuevo, tú solo decides si es seguro, si afecta el SEO, si el diseño es correcto, si funciona en móvil. Dependes de tu propio criterio en todo.

**En hwe:** para cada tipo de tarea hay un equipo predefinido. No tienes que recordar qué revisar — el playbook te dice qué especialistas convocar y en qué orden. Máximo 3 por equipo para no perder tiempo coordinando.

| Tipo de tarea | Equipo |
|---|---|
| Crear un bloque nuevo | Senior Dev + UX + SEO |
| Montar el site de un cliente | Senior Dev + Security + SEO |
| Cambiar algo de arquitectura | Architect + Senior Dev + Security |
| Verificar antes de publicar | QA + SEO + Security |
| Documentar | Docs Writer solo |
| Cerrar una story (SPECBOOT /archive) | Docs Writer solo (tras verify verde) |
