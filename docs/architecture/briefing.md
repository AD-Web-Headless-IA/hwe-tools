# hwe — Project briefing

> Short briefing on what hwe is, who builds it, who it serves, and how the business model works. Load when a task touches platform vision or business model.
> Technical details live in [`docs/architecture.md`](./architecture.md). Hosting and infra in [`decisions.md`](./decisions.md) DEC-007. Rules of work in [`ai-specs/specs/base-standards.md`](../specs/base-standards.md) and [`ai-specs/specs/frontend-standards.md`](../specs/frontend-standards.md). Multi-tenant criteria in [`domain-model.md`](./domain-model.md).
> Intentionally short — under 120 lines.

## What hwe is

A multi-tenant platform to build and operate hospitality websites — campings and hotels — for ~200 clients today, scaling to ~300. hwe is a product of **Septeo Hospitality**: the web layer of a broader catalogue of hospitality software (see §Parent company below).

Each site is produced in three layers:

1. **Design** — the agency designer ships the site in Figma with the client's branding. Figma Make exports visual reference code. Claude Code rebuilds it on top of generic `@hwe/core-ui` blocks (Figma is a visual reference, **not** a code generator — Phase 1 of the design system classifies each Figma module into block / template / composition).
2. **Content** — Payload CMS holds all editorial content (texts, images, accommodations, services, pages). The agency seeds the initial content with AI.
3. **Day-to-day management** — a portal lets the client edit content through natural-language chat. AI interprets the request, validates with the client, and writes through Payload.

The visitor-facing output is a Next.js site deployed on Vercel (per DEC-007). Booking is search-only: the widget queries availability and links out to the client's PMS, which handles the actual reservation.

## Parent company — Septeo Hospitality

hwe does not exist in a vacuum. Septeo Hospitality already sells a portfolio of solutions to the same hospitality clients:

| Solution | What it does |
|---|---|
| **PMS** | Property management for hotels and campings |
| **Booking engine** | Real-time availability + online reservations (the PMS hwe links to) |
| **Access barriers** | Physical access control (gates, RFID, license plate) |
| **Meters** | Consumption metering (water, electricity, gas) on plots and rooms |
| **CRM** | Customer relationship and loyalty tooling |
| **Accounting** | Sector-specific bookkeeping |

hwe is the **official website** layer that ties this portfolio together: visitors find the establishment, see real-time availability, jump to the PMS to book; the agency manages content in Payload; the client edits via AI portal; analytics feed the CRM. The website is the public-facing hub for everything Septeo already runs in the background.

## What the website ships with

In addition to the editorial pages (home, accommodations, services, etc. — see [`domain-model.md`](./domain-model.md) §3 and §4 for the full catalogue), every hwe site can integrate:

- **Real-time availability search** — booking widget that queries the client's PMS through a PMS-agnostic adapter (see [`domain-model.md`](./domain-model.md) §5).
- **Accommodation detail pages** — rooms, bungalows, plots, suites. One template, per-type field extensions ([`domain-model.md`](./domain-model.md) §6).
- **Activities and surroundings** — animation program, points of interest, events agenda (feature-gated per [`domain-model.md`](./domain-model.md) §4).
- **Visitor AI chatbot** — 24/7 automated front-desk for site visitors. Answers questions about the establishment, availability, services. Different from the agency-facing editing portal — the visitor chatbot is read-only against Payload content; the agency portal mutates Payload through guarded AI prompts.
- **Web analytics + visit intelligence** — traffic, conversion funnel, search-term capture. Fed into the agency's CRM for re-targeting and into the admin dashboard for site-by-site visibility.
- **Custom domain per client** — `campingsol.com`, not `hwe.something.com`.

## Customer base

- ~90% campings, ~10% hotels (growing).
- Edge cases like balneario + rural (`Hotel Balneario Fuente de Cabriel`, the first pilot) are minority but supported.
- A handful of PMS providers cover the stock case (THR, Masterbooking, Witbooking, Resalys); per-client custom adapters exist for everything else.

The multi-tenant model and feature taxonomy are formalized in [`domain-model.md`](./domain-model.md). This briefing intentionally does not duplicate them.

## Business model — why hwe exists

Septeo Hospitality's status quo is one bespoke WordPress (or similar) site per client. Branding, content structure, booking integration, and admin flow are reinvented every time. With 300 clients on the roadmap that does not scale.

hwe replaces the bespoke approach with:

- **One reusable design system** (`@hwe/core-ui`) — base-blocks (reference implementations), templates, primitives, shared schemas — consumed by all client sites via npm subpath exports (DEC-015).
- **One per-client site** (independent repo `site-{slug}/` per DEC-011) — only the parts that legitimately differ: block implementations (`src/blocks/`), theme tokens, content compositions, custom adapters.
- **One content backbone** (Payload CMS) — same collections, same admin UI, same AI-assisted editing across all clients.
- **One ops surface** — same monorepo, same CI/CD (GitHub Actions verification + Vercel Git integration deploy), same observability (Vercel + analytics).

Economic target: onboarding a new client should approach the cost of a Figma redesign + token extraction + content seeding, not the cost of a full custom site.

## High-level pipeline — onboarding a new client

The end-to-end flow that turns a Figma design into a live production site (orthogonal to SPECBOOT, which governs how we develop the platform itself):

| # | Stage | What happens |
|---|---|---|
| 1 | **Import Figma** | `/import-figma` clones the designer's Figma Make repo into `figma-makes/{slug}/` and writes provisional client context (DEC-002). |
| 2 | **Classify** | Phase 1 — each Figma module is classified as atomic block, page template, or per-client composition. New entries land in `@hwe/core-ui` only when reusable. |
| 3 | **Compose** | A new client repo (`site-{slug}/`) consumes `@hwe/core-ui` base-blocks (re-exported, slot-customized, or fully replaced in `src/blocks/`), plugs the client's tokens, declares features in `client.config.ts`, and assembles compositions per template. `BlockRenderer` is wired with the client's `registry.ts` block map. |
| 4 | **Wire content** | Payload schemas are derived from block Zod schemas; the agency seeds initial content (AI-assisted bulk generation, then human review). |
| 5 | **Client-side AI portal** | The client edits day-to-day content via natural-language chat backed by a server-side Route Handler to Claude API (DEC-007 — credentials in Vercel env vars). |
| 6 | **Test** | Vitest unit/integration + Playwright E2E + a11y assertions (DEC-006). CI gates on coverage and lint. |
| 7 | **Deploy** | Vercel Git integration: preview per PR, prod on merge. Custom domain wired per client. |
| 8 | **Operate** | Vercel Cron handles backups + warm-up; analytics feed the CRM; visitor chatbot answers FAQs against Payload content. |
| 9 | **Iterate** | Core improvements in `@hwe/core-ui` propagate to every client; per-client work stays in `apps/site-{slug}/`. |

This flow is the agency's user journey. The developer's user journey is SPECBOOT (`/enrich-us` → `/propose` → `/apply` → `/verify` → `/commit`).

## What hwe is not

- Not a booking engine. Reservations live in the PMS.
- Not a CMS product. Payload is the CMS; hwe wraps it.
- Not a code generator from Figma. Figma is a visual reference; the code reuses `@hwe/core-ui` blocks.
- Not a no-code builder for the client. The agency builds; the client edits via AI portal.
- Not a multi-region SaaS. Each client gets their own Vercel project, their own Postgres DB, their own Blob bucket — isolated per `tenantId` (DEC-007).

## Where to look next

- **Modelo de dominio (multi-tenant criteria):** [`domain-model.md`](./domain-model.md).
- **Decisiones arquitectónicas:** [`decisions.md`](./decisions.md) — especialmente DEC-002 (Figma per client), DEC-003 (frontend layout), DEC-006 (testing), DEC-007 (hosting).
- **Cómo construir frontend:** [`docs/frontend/`](../contracts/frontend/).
- **Constitución técnica (carga selectiva):** [`docs/architecture.md`](./architecture.md) — usar el TOC, no leer entero (DEC-003). Las secciones de hosting están parcialmente superseded por DEC-007.
- **Índice de carga por tipo de tarea:** [`docs/README.md`](../docs/README.md).
