# DEC-017 — Repo split: tools (submodule) + core (npm) + template + client repos

> **Status:** Proposed
> **Date:** 2026-06-03
> **Extends:** DEC-011 (independent client repos), DEC-015 (client-owned blocks)
> **Supersedes:** The single `hwp-platform/` monorepo containing tools + code + docs together

---

## The decision

Split the current `hwp-platform/` monorepo into three purpose-built repos. Each uses the delivery mechanism natural to what it contains:

| Repo | Contains | Delivery | Why this mechanism |
|---|---|---|---|
| `hwp-tools` | Skills, agents, commands, docs, specs, contracts, guides | **Git submodule** | Text files that Claude Code and humans read directly. No compilation, no dependencies. |
| `hwp-core` | React packages: schemas, base-blocks, primitives, renderer, theme, adapters | **npm packages** (`@hwp/core-ui`, `@hwp/config`) | Compiled code with dependencies (React, Zod, CVA). Needs semver, bundling, import resolution. |
| `hwp-template` | Empty starter structure for new clients | **GitHub template repo** | Cloned once per client via "Use this template". Not published as npm. |

Client repos are independent, created from the template, and consume tools via submodule + core via npm.

Figma Make repos remain independent per DEC-002 — outside all project repos.

---

## Repo 1: `hwp-tools` (git submodule)

Everything the team and Claude Code need to **work correctly** — rules, skills, agents, methodology. No runtime code.

```
hwp-tools/
├── .claude/
│   ├── skills/                         ← executable skills for Claude Code
│   │   ├── scaffold-block/
│   │   ├── scaffold-site/              ← configures a cloned template
│   │   ├── add-block/
│   │   ├── create-page/
│   │   ├── design-block/              ← DEC-016: visual spec without Figma
│   │   ├── import-figma/
│   │   ├── enrich-us/
│   │   ├── plan-to-stories/
│   │   ├── seo-audit/
│   │   ├── seo-fix/
│   │   ├── security-audit/
│   │   ├── security-fix/
│   │   ├── archive/
│   │   └── commit/
│   │
│   ├── agents/                         ← 11 agent profiles
│   │   ├── planner.md
│   │   ├── implementer.md
│   │   ├── reviewer.md
│   │   ├── verifier.md
│   │   ├── architect.md
│   │   ├── senior-developer.md
│   │   ├── ux-ui-analyst.md            ← Mode A (Figma) + Mode B (design proposal)
│   │   ├── seo-geo-specialist.md
│   │   ├── security-specialist.md
│   │   ├── qa-engineer.md
│   │   └── docs-writer.md
│   │
│   ├── commands/                       ← slash command wrappers
│   │   ├── add-block.md
│   │   ├── create-page.md
│   │   ├── scaffold-site.md
│   │   ├── security-audit.md
│   │   ├── security-fix.md
│   │   └── seo-fix.md
│   │
│   └── settings.json                   ← Claude Code settings
│
├── docs/
│   ├── architecture/                   ← decisions and system design
│   │   ├── decisions.md                ← DEC-001 through DEC-017
│   │   ├── architecture.md             ← system constitution
│   │   ├── domain-model.md             ← multi-tenant model
│   │   └── briefing.md                 ← project vision
│   │
│   ├── contracts/frontend/             ← binding contracts
│   │   ├── block-contract.md
│   │   ├── structure.md
│   │   ├── template-contract.md
│   │   ├── theme-tokens.md
│   │   └── client-composition.md
│   │
│   ├── specs/                          ← rules (always loaded by agents)
│   │   ├── general/
│   │   │   ├── base-standards.md
│   │   │   └── lifecycle.md
│   │   ├── frontend/
│   │   │   ├── frontend-standards.md
│   │   │   ├── coding-standards.md
│   │   │   └── block-architecture.md
│   │   ├── seo/
│   │   │   ├── seo-standards.md
│   │   │   ├── semantic-html.md
│   │   │   ├── local-seo.md
│   │   │   ├── geo-llm-optimization.md
│   │   │   ├── performance-seo.md
│   │   │   └── schemas/               ← 11 JSON-LD templates
│   │   ├── security/
│   │   │   └── security-standards.md
│   │   └── ai/
│   │       ├── agent-directory.md
│   │       ├── agent-teams-playbook.md
│   │       └── specboot-flow.md
│   │
│   ├── guides/
│   │   ├── first-day-setup.md
│   │   ├── daily-workflow.md
│   │   ├── project-map.md
│   │   ├── glossary.md
│   │   └── wordpress-to-hwp.md
│   │
│   ├── diagrams/
│   │   ├── monorepo-overview.mmd
│   │   ├── core-ui-internal.mmd
│   │   ├── block-resolution-chain.mmd
│   │   ├── token-cascade.mmd
│   │   ├── page-tetris.mmd
│   │   ├── figma-to-production.mmd
│   │   └── booking-architecture.mmd
│   │
│   ├── catalog.md
│   └── README.md
│
├── templates/                          ← templates used by skills
│   ├── design-language.md
│   └── visual-spec.md
│
├── compatibility.json                  ← maps tools version to compatible core-ui versions
└── CLAUDE.md
```

**Versioned by:** git tags (`v1.0.0`, `v1.1.0`). No npm publishing.

---

## Repo 2: `hwp-core` (npm packages)

Everything that **compiles, bundles, and runs** in client sites. Turborepo workspace for developing the packages together.

```
hwp-core/
├── packages/
│   ├── core-ui/                        ← published as @hwp/core-ui
│   │   ├── src/
│   │   │   ├── schemas/                ← Zod content + config schemas
│   │   │   │   ├── HeroBlock.schema.ts
│   │   │   │   ├── HeroBlock.config.schema.ts
│   │   │   │   ├── BookingBlock.schema.ts
│   │   │   │   ├── MediaTextBlock.schema.ts
│   │   │   │   ├── AccommodationGridBlock.schema.ts
│   │   │   │   ├── AmenitiesBlock.schema.ts
│   │   │   │   ├── ReviewsBlock.schema.ts
│   │   │   │   └── index.ts
│   │   │   │
│   │   │   ├── types/                  ← derived from schemas (z.infer)
│   │   │   │   ├── HeroBlock.types.ts
│   │   │   │   └── ...
│   │   │   │
│   │   │   ├── base-blocks/            ← reference React implementations
│   │   │   │   ├── index.ts            ← re-exports all for subpath
│   │   │   │   ├── HeroBlock/
│   │   │   │   │   ├── HeroBlock.tsx
│   │   │   │   │   ├── HeroBlock.slots.ts
│   │   │   │   │   ├── HeroBlock.variants.ts
│   │   │   │   │   └── HeroBlock.test.tsx
│   │   │   │   ├── BookingBlock/
│   │   │   │   │   ├── index.ts        ← variant resolver (DEC-008)
│   │   │   │   │   ├── BookingInline/
│   │   │   │   │   └── BookingSticky/
│   │   │   │   ├── MediaTextBlock/
│   │   │   │   ├── AccommodationGridBlock/
│   │   │   │   ├── AmenitiesBlock/
│   │   │   │   └── ReviewsBlock/
│   │   │   │
│   │   │   ├── primitives/             ← shadcn/Radix atomic UI
│   │   │   │   ├── Button/
│   │   │   │   ├── Input/
│   │   │   │   ├── Dialog/
│   │   │   │   ├── Accordion/
│   │   │   │   └── ...
│   │   │   │
│   │   │   ├── renderer/
│   │   │   │   ├── BlockRenderer.tsx
│   │   │   │   ├── baseBlockRegistry.ts
│   │   │   │   └── BlockRenderer.test.tsx
│   │   │   │
│   │   │   ├── providers/
│   │   │   │   ├── TenantProvider.tsx
│   │   │   │   ├── SeasonProvider.tsx
│   │   │   │   └── index.ts
│   │   │   │
│   │   │   ├── layout/
│   │   │   │   ├── SiteShell.tsx
│   │   │   │   ├── Navbar/
│   │   │   │   └── Footer/
│   │   │   │
│   │   │   ├── theme/
│   │   │   │   ├── tokens.contract.ts
│   │   │   │   ├── cssVariables.ts
│   │   │   │   └── index.ts
│   │   │   │
│   │   │   ├── adapters/               ← adapter interfaces + stock implementations
│   │   │   │   ├── booking/
│   │   │   │   │   ├── BookingAdapter.ts       ← interface (port)
│   │   │   │   │   ├── BookingProvider.tsx      ← React context + useBookingAdapter()
│   │   │   │   │   └── stock/
│   │   │   │   │       ├── thr.ts
│   │   │   │   │       ├── masterbooking.ts
│   │   │   │   │       └── witbooking.ts
│   │   │   │   ├── map/                        ← future: MapAdapter
│   │   │   │   ├── reviews/                    ← future: ReviewsAdapter
│   │   │   │   └── form/                       ← future: FormAdapter
│   │   │   │
│   │   │   ├── composition-rules/
│   │   │   │   ├── rules.schema.ts
│   │   │   │   ├── platform-rules.ts
│   │   │   │   ├── validator.ts
│   │   │   │   └── validator.test.ts
│   │   │   │
│   │   │   └── index.ts               ← package root public API
│   │   │
│   │   ├── package.json                ← exports: ".", "./base-blocks", "./schemas", "./theme"
│   │   └── tsconfig.json
│   │
│   └── config/                         ← published as @hwp/config
│       ├── src/
│       │   ├── tailwind-preset.ts      ← createHwpPreset(tokens)
│       │   └── index.ts
│       ├── tsconfig.json               ← base tsconfig for all projects
│       └── package.json
│
├── apps/
│   └── site-demo/                      ← test fixture: validates packages before publish
│       ├── src/
│       │   ├── blocks/
│       │   │   └── registry.ts
│       │   ├── compositions/
│       │   │   └── HomeComposition.tsx
│       │   └── app/
│       │       ├── layout.tsx
│       │       ├── page.tsx
│       │       ├── globals.css
│       │       ├── error.tsx
│       │       └── not-found.tsx
│       ├── tailwind.config.ts
│       ├── postcss.config.mjs
│       └── package.json
│
├── turbo.json
├── pnpm-workspace.yaml
└── package.json
```

**npm subpath exports** for `@hwp/core-ui`:
```json
{
  "exports": {
    ".":              "./src/index.ts",
    "./base-blocks":  "./src/base-blocks/index.ts",
    "./schemas":      "./src/schemas/index.ts",
    "./theme":        "./src/theme/index.ts"
  }
}
```

**Versioned by:** semver via Changesets. Each merge to main → publish to private npm registry.

---

## Repo 3: `hwp-template` (GitHub template)

Empty starter cloned via "Use this template" on GitHub. Not published as npm.

```
hwp-template/
├── .hwp-tools/                         ← git submodule → hwp-tools repo
│   ├── .claude/
│   └── docs/
│
├── .gitmodules                         ← submodule config
│
├── src/
│   ├── app/
│   │   ├── layout.tsx                  ← <html lang="{lang}"><body>{children}</body>
│   │   ├── page.tsx                    ← delegates to HomeComposition
│   │   ├── globals.css                 ← @tailwind + empty commented sections
│   │   ├── error.tsx
│   │   └── not-found.tsx
│   │
│   ├── blocks/                         ← Level 1 re-exports of all base-blocks
│   │   ├── HeroBlock/
│   │   │   └── HeroBlock.tsx           ← export { HeroBlock } from '@hwp/core-ui/base-blocks'
│   │   ├── BookingBlock/
│   │   │   └── BookingBlock.tsx
│   │   ├── MediaTextBlock/
│   │   │   └── MediaTextBlock.tsx
│   │   ├── AccommodationGridBlock/
│   │   │   └── AccommodationGridBlock.tsx
│   │   ├── AmenitiesBlock/
│   │   │   └── AmenitiesBlock.tsx
│   │   ├── ReviewsBlock/
│   │   │   └── ReviewsBlock.tsx
│   │   └── registry.ts
│   │
│   ├── schemas/                        ← empty, for client schema extensions
│   │   └── .gitkeep
│   ├── primitives/                     ← empty, for client primitive overrides
│   │   └── .gitkeep
│   ├── compositions/
│   │   └── HomeComposition.tsx         ← empty: const layout = []
│   ├── data/
│   │   └── .gitkeep
│   └── theme/
│       └── tokens.json                 ← placeholder tokens (white, black, sans-serif)
│
├── docs/                               ← client-specific docs (starts empty)
│   ├── audits/
│   │   └── .gitkeep
│   ├── block-specs/
│   │   └── .gitkeep
│   ├── stories/
│   │   └── .gitkeep
│   └── .gitkeep
│
├── public/
│   ├── brand/
│   │   └── .gitkeep
│   ├── fonts/
│   │   └── .gitkeep
│   └── images/
│       └── .gitkeep
│
├── tests/e2e/
│   └── .gitkeep
│
├── client.config.ts
├── tailwind.config.ts
├── postcss.config.mjs
├── next.config.mjs
├── tsconfig.json
├── package.json                        ← depends on @hwp/core-ui + @hwp/config
├── CLAUDE.md                           ← points to .hwp-tools/ for context
├── README.md
└── .gitignore
```

---

## Client repo example (after onboarding)

A real client after `/import-figma` + block customization + audits:

```
site-camping-sol/
├── .hwp-tools/                         ← git submodule (skills, agents, docs, specs)
│
├── src/
│   ├── app/
│   │   ├── layout.tsx                  ← <html lang="fr">
│   │   ├── page.tsx                    ← → HomeComposition
│   │   ├── le-camping/
│   │   │   └── page.tsx                ← → LeCampingComposition
│   │   ├── hebergements/
│   │   │   ├── page.tsx                ← → AccommodationsComposition
│   │   │   └── [slug]/page.tsx         ← → AccommodationDetailTemplate
│   │   ├── tarifs/
│   │   │   └── page.tsx                ← → RatesComposition
│   │   ├── contact/
│   │   │   └── page.tsx                ← → ContactComposition
│   │   ├── politique-de-confidentialite/
│   │   │   └── page.tsx
│   │   ├── globals.css                 ← fonts, token vars, animations, THR overrides
│   │   ├── error.tsx
│   │   ├── not-found.tsx
│   │   ├── sitemap.ts
│   │   └── robots.ts
│   │
│   ├── blocks/
│   │   ├── HeroBlock/
│   │   │   └── HeroBlock.tsx           ← Level 1: re-export
│   │   ├── BookingBlock/
│   │   │   └── BookingBlock.tsx        ← Level 1: re-export
│   │   ├── MediaTextBlock/
│   │   │   └── MediaTextBlock.tsx      ← Level 2: base + custom heading slot
│   │   ├── AccommodationGridBlock/
│   │   │   └── AccommodationGridBlock.tsx  ← Level 1: re-export
│   │   ├── AmenitiesBlock/
│   │   │   └── AmenitiesBlock.tsx      ← Level 1: re-export
│   │   ├── ReviewsBlock/
│   │   │   └── ReviewsBlock.tsx        ← Level 1: re-export
│   │   ├── FAQBlock/
│   │   │   └── FAQBlock.tsx            ← Level 3: full custom (no base-block yet)
│   │   └── registry.ts
│   │
│   ├── schemas/                        ← client schema extensions
│   │   └── HeroBlock.schema.ts         ← extends base with videoUrl, seasonBadge
│   │
│   ├── primitives/                     ← empty (this client uses base primitives)
│   │
│   ├── compositions/
│   │   ├── HomeComposition.tsx
│   │   ├── LeCampingComposition.tsx
│   │   ├── AccommodationsComposition.tsx
│   │   ├── RatesComposition.tsx
│   │   └── ContactComposition.tsx
│   │
│   ├── data/
│   │   ├── fake-content.ts             ← French content from Figma
│   │   └── fake-content-le-camping.ts
│   │
│   └── theme/
│       └── tokens.json                 ← #1A4A52 primary, Playfair Display, etc.
│
├── docs/
│   ├── audits/
│   │   ├── seo-audit-2026-06-15.md
│   │   └── security-audit-2026-06-15.md
│   ├── block-specs/
│   │   └── FAQBlock.visual-spec.md
│   ├── stories/
│   │   ├── US-001-hero-video.md
│   │   └── US-002-faq-page.md
│   ├── design-language.md
│   └── figma-analysis.md
│
├── public/
│   ├── brand/
│   │   ├── logo.svg
│   │   ├── favicon.ico
│   │   └── og-image.jpg
│   ├── fonts/
│   │   ├── PlayfairDisplay-Regular.woff2
│   │   └── Montserrat-Regular.woff2
│   └── images/
│       ├── hero-piscine.jpg
│       └── camping-aerien.jpg
│
├── tests/e2e/
│   ├── home.spec.ts
│   └── booking.spec.ts
│
├── client.config.ts
├── tailwind.config.ts
├── postcss.config.mjs
├── next.config.mjs
├── tsconfig.json
├── package.json
├── CLAUDE.md
└── .gitignore
```

---

## Figma Make repos (unchanged — DEC-002)

```
figma-makes/                            ← plain folder, NOT a git repo
├── base-template/                      ← Camping Mer et Camargue (reference)
│   ├── src/app/components/
│   ├── src/styles/theme.css
│   ├── public/
│   └── .git/                           ← tagged per import
├── camping-sol/
└── hotel-balneario/
```

`/import-figma` reads from here, writes results to the client repo's `docs/`.

---

## Client onboarding flow

```
1. Create repo    → GitHub "Use this template" from hwp-template
2. Clone          → git clone --recurse-submodules site-camping-sol
3. Install        → npm install (@hwp/core-ui + @hwp/config)
4. Import Figma   → /import-figma → writes tokens.json + design-language.md + figma-analysis.md
5. Configure      → client.config.ts, globals.css fonts, layout.tsx lang
6. Customize      → blocks (Level 1/2/3), pages (/create-page), content (/add-block)
7. Audit          → /seo-audit + /security-audit → results in docs/audits/
8. Deploy         → Connect to Vercel, configure domain
```

---

## How updates work

### Updating tools

```bash
cd .hwp-tools && git pull origin main && cd ..
git add .hwp-tools
git commit -m "chore: update hwp-tools to v1.2.0"
```

### Updating core

```bash
npm update @hwp/core-ui
# Level 1 blocks: changes apply automatically
# Level 2/3: check changelog for schema changes
pnpm test
git add package.json package-lock.json
git commit -m "chore: update @hwp/core-ui to v2.1.0"
```

### Compatibility check

`hwp-tools/compatibility.json` maps tool versions to compatible core-ui versions:

```json
{
  "tools": "1.2.0",
  "core-ui": ">=2.0.0 <3.0.0",
  "config": ">=1.0.0"
}
```

Skills check this at execution time and warn on mismatch.

---

## Summary

```
┌──────────────────────────────────────────────────────────────┐
│  hwp-tools (submodule)                                       │
│  Skills · Agents · Commands · Docs · Specs · Contracts       │
│  Update: git pull                                            │
└──────────────────────────┬───────────────────────────────────┘
                           │ submodule
┌──────────────────────────┼───────────────────────────────────┐
│  hwp-core (Turborepo)                                        │
│  @hwp/core-ui · @hwp/config                                  │
│  Update: npm update                                          │
└──────────────────────────┬───────────────────────────────────┘
                           │ npm install
┌──────────────────────────┼───────────────────────────────────┐
│  hwp-template (GitHub template)                              │
│  Empty starter with submodule + deps pre-configured          │
│  Use: "Use this template" once per client                    │
└──────────────────────────┬───────────────────────────────────┘
                           │ clone once
┌──────────────────────────┼───────────────────────────────────┐
│  site-{slug} (client repos)                                  │
│  Blocks · Compositions · Theme · Docs · Stories              │
│  Deploy: independent Vercel project per client               │
└──────────────────────────────────────────────────────────────┘

figma-makes/{slug}/ — designer repos, outside all projects (DEC-002)
```