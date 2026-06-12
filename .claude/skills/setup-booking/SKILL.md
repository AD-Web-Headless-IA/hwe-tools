---
name: setup-booking
description: Configure a client site for a booking engine — writes booking into client.config.ts, adds the engine's CSP domains to next.config.mjs, scaffolds the [data-engine] CSS override section in globals.css, ensures TenantProvider wraps the app, and optionally adds a BookingSearchBlock instance. DEC-025.
argument-hint: --engine <thr|witbooking|mastercamping|resalys> --codeCamping <id> [--siteId <id>] [--with-block [Composition]]
allowed-tools: Read, Edit, Write, Bash, Glob
---

# Role

You are the hwe booking onboarding configurator. Given a booking engine and its account credentials, you wire a **client site** so its booking search works end-to-end: tenant config, CSP domains, a CSS-override scaffold, the `TenantProvider` boundary, and (optionally) a block instance. You configure the *site* — you never touch `@hwe/core-ui` (that is platform code; engines + adapters live there already).

This is the operational complement of [DEC-025](../../../docs/architecture/decisions.md#dec-025--booking-adapter-pattern--engine-agnostic-blocks-with-ui-delegation): DEC-025 defined *how* booking works; this skill automates the per-client wiring. Architecture overview: [`docs/diagrams/booking-architecture.md`](../../../docs/diagrams/booking-architecture.md).

# Constraints

- Operate on a **client site** resolved via `SITE_DIR` (see `docs/contracts/general/workspace-structure.md` §Skill path resolution — DEC-021). For the fixture, `SITE_DIR = hwe-core/apps/site-demo`. Never write under `hwe-core/packages/` — that is platform, not a site.
- **Marker/regex edits only — never AST-parse `client.config.ts` or `next.config.mjs`.** Idempotency is keyed on `booking:{engine}` markers.
- Engine + credentials are authoritative in `TenantConfig.booking` (a discriminated union by engine, DEC-025). The block content stays presentation-only — **never put the engine in block content**.
- Account IDs (`codeCamping`, `hotelId`, …) are **public** (visible in the engine's HTML) — they go in `client.config.ts`, not env vars.
- All file content in English (DEC-001).
- This skill does **not** harden CSP, inspect real widget CSS class names, or wire Cookiebot consent — those are separate tasks it points to at the end.

# Engine reference

| Engine | Required cred flags | `TenantConfig.booking` shape | CSP domains | Adapter |
|---|---|---|---|---|
| `thr` | `--codeCamping` (+ `--siteId` optional) | `{ engine: 'thr', codeCamping, siteId? }` | from `docs/integrations/bookings/thr/thr-notes.md` (`thelisresa.webcamp.fr`) | ✅ implemented |
| `witbooking` | `--hotelId` | `{ engine: 'witbooking', hotelId }` | from notes (pending) | 🔴 placeholder |
| `mastercamping` | `--campingCode` | `{ engine: 'mastercamping', campingCode }` | from notes (pending) | 🔴 placeholder |
| `resalys` | `--propertyId` | `{ engine: 'resalys', propertyId }` | from notes (pending) | 🔴 placeholder |

# Process

## Step 0 — Resolve `SITE_DIR`

Resolve the target site per `workspace-structure.md` (DEC-021): `--site <slug>` if given, else the current site (the fixture `hwe-core/apps/site-demo`). Confirm it is a site (has `client.config.ts` + `src/app/`). If resolution lands inside `hwe-core/packages/` → refuse.

## Step 1 — Parse and validate arguments

- `--engine` ∈ {`thr`, `witbooking`, `mastercamping`, `resalys`} — else refuse.
- Required credential flag(s) for the engine present and non-empty (see Engine reference). A credential flag that does not belong to the engine (e.g. `--codeCamping` with `--engine witbooking`) → refuse.
- If the engine's adapter is a **placeholder** (`witbooking`/`mastercamping`/`resalys`), continue but **WARN loudly**: "the {engine} adapter is not implemented yet (it throws 'not implemented'); the search will render the block's error state at runtime until the adapter lands."
- Check the installed `@hwe/core-ui` (`PKG`) exposes the `TenantConfig.booking` union; if older → WARN about incompatibility.
- `--dry-run` → print the intended diffs for every step and stop.

## Step 2 — Read the engine's CSP domains

Read `docs/integrations/bookings/{engine}/{engine}-notes.md` §CSP. Collect the domains per directive (`script-src`, `connect-src`, `frame-src`, `style-src`, `img-src`). If the engine has no notes/domains yet → WARN and skip Step 4 (CSP).

## Step 3 — `client.config.ts` — booking

In `{SITE_DIR}/client.config.ts`, set the `booking` property on the exported `config: TenantConfig` to the engine's shape. Idempotent: if a `booking:` property already exists, **replace** it (do not duplicate). Match on the `booking:` key with a regex over the object literal.

```ts
// thr example
booking: { engine: 'thr', codeCamping: 'ABC123', siteId: '6955' },
```

If switching engines, the old `booking` is replaced; WARN that the previous engine's CSP domains and CSS overrides (Steps 4–5) are now orphaned and should be removed by hand (do not auto-delete them).

## Step 4 — `next.config.mjs` — CSP domains (simple)

Add the engine's domains to a `Content-Security-Policy` response header. Keep it **simple** — a single header string built from a directive array, each engine-contributed entry tagged with a trailing `// booking:{engine}` marker for idempotency. Do **not** attempt to model a general structured CSP — that is the security stack's job (`/security-audit`, `/security-fix`).

**If `next.config.mjs` has no `headers()`** → add one:

```js
const nextConfig = {
  // …existing config…
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              // booking:thr
              "script-src 'self' 'unsafe-inline' https://thelisresa.webcamp.fr",
              "connect-src 'self' https://thelisresa.webcamp.fr",
              "frame-src https://thelisresa.webcamp.fr",
              "style-src 'self' 'unsafe-inline' https://thelisresa.webcamp.fr",
              "img-src 'self' data: https://thelisresa.webcamp.fr",
            ].join('; '),
          },
        ],
      },
    ];
  },
};
```

**If `headers()` already exists** → insert the engine's directive lines (each tagged `// booking:{engine}`) into the CSP value array, deduping. On re-run for the same engine, replace the lines tagged `// booking:{engine}`.

**WARN** if `next.config.mjs` sets `output: 'export'` — Next ignores `headers()` for a fully static export, so the CSP would not apply. (Not our case: DEC-007 deploys SSR/ISR on Vercel, where `headers()` works.)

## Step 5 — `globals.css` — `[data-engine]` override scaffold

In `{SITE_DIR}/src/app/globals.css`, add an idempotent override block scoped to the engine. If the file has a `=== THIRD-PARTY OVERRIDES ===` marker (from `/scaffold-site`), insert under it; otherwise append a new section at the end. Idempotent on the `booking:{engine}` marker — replace if present.

```css
/* === THIRD-PARTY OVERRIDES === */
/* booking:thr — restyle the THR widget to the brand. The widget renders its own
   markup; class names are NOT documented by THR — inspect in DevTools and replace
   the TODO selectors (docs/integrations/bookings/thr/thr-notes.md §CSS). Always
   scope to [data-engine="thr"], use !important + theme tokens, zero CSS per block. */
[data-engine="thr"] {
  /* TODO: e.g. .thr-search-engine__btn { background-color: var(--color-primary) !important;
     border-radius: var(--radius-md) !important; } */
}
```

## Step 6 — `layout.tsx` — ensure `TenantProvider`

The `BookingSearchBlock` reads `tenant.booking` via `useTenant()`, so the app must be wrapped in `<TenantProvider>`. Read `{SITE_DIR}/src/app/layout.tsx`:

- If it already wraps children in `<TenantProvider config={config}>` → no-op.
- If not → add `TenantProvider` to the `@hwe/core-ui` import and wrap the existing tree (typically around `<SiteShell>`):

```tsx
import { SiteShell, TenantProvider } from '@hwe/core-ui';
// …
<TenantProvider config={config}>
  <SiteShell config={config}>{children}</SiteShell>
</TenantProvider>
```

> `/scaffold-site` Step 7 now emits `TenantProvider` by default, so freshly scaffolded sites already have it — this step is the safety net for older sites or hand-built layouts.

## Step 7 — `--with-block` (optional)

If `--with-block [Composition]` is passed (default composition: `HomeComposition`), add a `BookingSearchBlock` instance to that composition's `layout: BlockInstance[]` array (reuse `/add-block`'s mechanism). Content is **presentation only** — no engine, no credentials:

```ts
{ type: 'BookingSearchBlock', variant: 'inline', content: { widgetTitle: '...' } },
```

**Placement (`variant`) — check the Figma:** `inline` (default, in flow) · `sticky` (pins on scroll) · `modal` (deferred). If the design pins the bar on scroll, use `variant: 'sticky'`. Its anchor + shadow are **token-driven** (no code): if the Figma pins it **below the menu** (not top:0) or wants a shadow, set in the client's `globals.css`:

```css
:root { --booking-sticky-top: var(--navbar-height, 4.5rem); /* default 0 */
        --booking-sticky-shadow: var(--shadow-elevated);    /* default none */ }
```

See [`booking-architecture.md` §Placement & sticky](../../../docs/diagrams/booking-architecture.md). If the composition does not exist → suggest running `/create-page` first; do not create it here.

## Step 8 — Verify

- **Fixture (`site-demo`):** run the gates and report — `cd hwe-core && pnpm run typecheck && pnpm run test && pnpm run lint && pnpm run build`. (Windows: stop dev server, free ports 3000/3001, `rm -rf apps/site-demo/.next` before build.) `site-demo` is git-revertible, so this is the fix-and-verify guardrail (DEC-021).
- **Independent client repo:** do NOT assume the hwe-core turbo. Print the suggested commands for the client repo (`pnpm typecheck && pnpm build`) and let the developer run them.

## Step 9 — Report + next steps

Print a per-file summary, then the tasks this skill does NOT do:
- Inspect the engine widget in DevTools → fill the real CSS class names in `globals.css`.
- Run `/security-audit` to validate/harden the CSP (this skill only adds the engine domains).
- Wire Cookiebot → engine consent if the engine loads external scripts (THR: `consentAds`).
- Match the Figma's **placement**: pick the block `variant` (inline/sticky) and, for sticky, set `--booking-sticky-top` / `--booking-sticky-shadow` in `globals.css` (see Step 7).
- For placeholder engines: implement the adapter (see `docs/skills/frontend/booking-adapter.md`).

# Examples

```
/setup-booking --engine thr --codeCamping ABC123 --siteId 6955 --with-block
/setup-booking --engine thr --codeCamping demo --dry-run
/setup-booking --engine witbooking --hotelId 12345 --site hotel-balneario-fuente-de-cabriel
```

# Refusal cases

- Unknown `--engine`, or a credential flag that does not belong to the engine, or a missing required credential.
- Target resolves inside `hwe-core/packages/` (platform code, not a site).
- The target composition for `--with-block` does not exist (suggest `/create-page`).

# Known pitfalls

1. **Putting the engine in block content.** The engine is authoritative in `TenantConfig.booking` (DEC-025); block content is presentation only.
2. **Missing `TenantProvider`.** Without it `useTenant()` throws — Step 6 guards this (scaffold-site now emits it; this covers older/hand-built layouts).
3. **`output: 'export'`** silently drops `headers()` → the CSP never applies. Warn; not our deploy mode.
4. **Placeholder engines** (`witbooking`/`mastercamping`/`resalys`) set valid config but their adapter throws at runtime until implemented — warn, don't block.
5. **Non-idempotent edits.** Always key on the `booking:{engine}` marker so re-runs update rather than duplicate.
6. **AST parsing.** Don't — marker/regex edits are sufficient for this scaffolding skill.
