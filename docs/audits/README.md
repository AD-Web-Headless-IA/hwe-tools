# `docs/audits/` — Audit reports

This directory holds the output of the `/seo-audit` and `/security-audit` skills. One subdirectory per client site, one typed subdirectory per audit category, one report per audit run.

## Structure

```
docs/audits/
├── README.md                          ← this file
├── site-demo/
│   ├── seo/
│   │   ├── seo-audit-2026-05-26.md
│   │   └── seo-audit-2026-06-01.md   (re-audit after fixes)
│   └── security/
│       └── security-audit-2026-05-28.md
└── site-hotel-balneario/
    ├── seo/
    │   └── seo-audit-2026-07-15.md
    └── security/
        └── security-audit-2026-07-15.md
```

## How reports are generated

### SEO audit

```
/seo-audit [site-slug]
```

The skill:
1. Verifies or starts the dev server for the site.
2. Executes all 7 audit areas (semantic HTML, meta tags, images, structured data, local SEO, performance, GEO/LLM).
3. Writes a consolidated markdown report to `docs/audits/{slug}/seo/seo-audit-{date}.md`.

### Security audit

```
/security-audit [site-slug]
```

The skill:
1. Verifies the dev server is running.
2. Runs automated network checks (HTTP headers, cookie pre-consent, dependency CVEs).
3. Runs grep-based code audits (input handling, secrets, RGPD, Next.js patterns).
4. Writes a consolidated markdown report to `docs/audits/{slug}/security/security-audit-{date}.md`.

Default slug for both skills is `site-demo`. Re-running on the same day overwrites the existing report.

## Verdict levels

| Verdict | Meaning |
|---|---|
| 🟢 Green | No Blockers, no Majors. Ready to deploy. |
| 🟡 Yellow | No Blockers, at least 1 Major. Fix before deploy. |
| 🔴 Red | At least 1 Blocker. Do not deploy until resolved. |

## Severity definitions

| Severity | Definition |
|---|---|
| Blocker | Will cause indexing failure, security breach, legal violation, or LLM invisibility. Must fix before any deploy. |
| Major | Ranking/citability penalty or significant security risk. Fix before first production deploy. |
| Minor | Best-practice gap. Fix in next iteration. |

## SEO audit areas

Each SEO report covers 7 areas (skill docs in `docs/skills/seo/`):

1. Semantic HTML — heading hierarchy, landmark elements, aria attributes
2. Meta tags — title format, meta description, canonical, Open Graph
3. Images — alt text, dimensions, loading strategy, hero preload
4. Structured data — JSON-LD presence, SSR, schema completeness
5. Local SEO — NAP consistency, geo coordinates, location keywords
6. Performance (Core Web Vitals) — LCP, CLS, INP signals
7. GEO / LLM optimisation — citability, FAQPage, sameAs, entity naming

## Security audit areas

Each security report covers 7 active areas + 1 future area (skill docs in `docs/skills/security/`):

1. HTTP headers — HSTS, CSP, X-Content-Type-Options, X-Frame-Options, Referrer-Policy, Permissions-Policy
2. Cookies & consent — pre-consent cookie scan, Secure/HttpOnly/SameSite flags, RGPD Art.6
3. Input handling — dangerouslySetInnerHTML, eval(), Route Handler Zod coverage
4. Secrets — API key patterns in source, .env hygiene, git history scan
5. RGPD — privacy policy page, footer link, data inventory, deletion procedure
6. Dependencies — CVEs via pnpm audit, lock file integrity
7. Next.js patterns — server/client boundary, external API calls, tenant isolation
8. AI content safeguards — ⏳ pre-integration (activates with Payload+AI pipeline)

## Reports are not committed by default

Audit reports are output artifacts — they change every time fixes are applied. Teams may choose to commit milestone reports (first deploy, post-launch) but routine re-audits do not need to be in git history.

Add to `.gitignore` to exclude them:
```
docs/audits/
```

Or commit selectively per milestone. The decision is per team.
