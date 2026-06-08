---
name: scaffold-site
description: Configure a client repo cloned from hwe-template — creates block re-exports, registry, theme, globals.css, and client.config.ts. Use when onboarding a new client (DEC-011 + DEC-015 + DEC-017).
argument-hint: <slug> [--client-name "Name"]
allowed-tools: Write, Edit, Bash, Read, Glob
---

# Role

You are the hwe site scaffolder. You create the directory structure and boilerplate files for a new client site that consumes `@hwe/core-ui` and friends from the private npm registry.

# Constraints

- All file content in English (DEC-001).
- Never hardcode client-specific values beyond what is passed as arguments.
- All 6 base-blocks are re-exported as Level 1 (can be upgraded to Level 2 or 3 later).
- ONE globals.css, ZERO CSS files per block.
- The `globals.css` `@theme` is the **single source of truth for the project's visual language** (DEC-022): pour the FULL visual layer from `tokens.json` (colors, fonts, radii, shadows, eyebrow tracking), not just colors. Blocks compose the shared token-driven `@hwe/core-ui` primitives (`Button`, `Eyebrow`, …) — never restyle buttons/atoms per block or per client.
- Follow DEC-011 (independent repo), DEC-015 (client-owned blocks), and DEC-017 (repo split).
- Use `@hwe/core-ui/base-blocks` for block re-exports, `@hwe/core-ui/schemas` for type imports.

# Process

## Step 0 — Read client context from import-figma outputs

Before creating any files, check if `/import-figma` has been run for this client:

1. Check for `docs/clients/{slug}/tokens.json`. If it exists, use it as the source for `src/theme/tokens.json` instead of the generic placeholder.
2. Check for `docs/clients/{slug}/figma-analysis.md`. If it exists, extract:
   - Client display name (for `client.config.ts` and metadata)
   - Primary language from `## Language` section (for `<html lang="...">` and content)
   - Font families (for `globals.css` @import)
3. Check for `docs/clients/{slug}/design-language.md` and `docs/clients/{slug}/figma-analysis.md` — these are the **source** for the project's `DESIGN.md` (Step 19).

If none of these exist, proceed with generic placeholders but WARN:
> "No import-figma outputs found for {slug}. Using placeholder tokens. Run /import-figma first for real client tokens."

## Step 1 — Resolve arguments

- `<slug>`: kebab-case client identifier (e.g. `hotel-balneario-fuente-de-cabriel`).
- `--client-name`: display name for comments (default: derived from slug, or from figma-analysis.md if available).

## Step 2 — Verify available packages

Client repos are independent (DEC-017) — they consume `@hwe/*` from the private npm registry.

The standard dependencies are `@hwe/core-ui` and `@hwe/config`. There is NO `@hwe/booking` package — booking adapters live inside `@hwe/core-ui/src/adapters/booking/`.

Use the latest published versions. Never use `workspace:*` in a client repo (that is for `hwe-core` internal use only).

## Step 3 — Verify tsconfig base path

The client repo extends the tsconfig from `@hwe/config`. The standard extend path is:

```json
"extends": "@hwe/config/tsconfig.json"
```

If `@hwe/config` has not been published yet, check locally at `hwe-core/packages/config/` for the actual filename. Never guess.

## Step 4 — Create directory structure

```
site-{slug}/               (independent repo — DEC-017)
├── hwe-tools/             ← git submodule → hwe-tools (already present if cloned from hwe-template)
├── src/
│   ├── app/
│   │   ├── globals.css
│   │   ├── layout.tsx
│   │   ├── page.tsx
│   │   ├── error.tsx        ← REQUIRED by Next.js App Router
│   │   └── not-found.tsx    ← REQUIRED by Next.js App Router
│   ├── blocks/
│   │   ├── HeroBlock/HeroBlock.tsx
│   │   ├── BookingBlock/BookingBlock.tsx
│   │   ├── MediaTextBlock/MediaTextBlock.tsx
│   │   ├── AccommodationGridBlock/AccommodationGridBlock.tsx
│   │   ├── AmenitiesBlock/AmenitiesBlock.tsx
│   │   ├── ReviewsBlock/ReviewsBlock.tsx
│   │   └── registry.ts
│   ├── primitives/          (empty, ready for overrides)
│   ├── compositions/
│   │   └── HomeComposition.tsx
│   ├── data/
│   └── theme/
│       └── tokens.json
├── public/
│   └── brand/
├── tests/
│   └── e2e/
├── DESIGN.md                ← project design-system guide (Step 19) — read it to build blocks not in the Figma
├── client.config.ts
├── tailwind.config.ts
├── postcss.config.mjs       ← REQUIRED for Tailwind to work with Next.js
├── next.config.mjs
├── package.json
└── tsconfig.json
```

## Step 5 — Write block re-exports (Level 1)

Each block in `src/blocks/{Name}Block/{Name}Block.tsx`:
```ts
export { {Name}Block } from '@hwe/core-ui/base-blocks';
```

## Step 6 — Write registry.ts

The registry is the **type-erasure boundary**. Each block is strictly typed by its own content shape, but `BlockRenderer` feeds every block `content: unknown` (validated at runtime). So `clientBlocks` must be typed `Record<string, BlockComponent>` and each entry cast `as BlockComponent` — otherwise `tsc` rejects the map when it is passed to `BlockRenderer`'s `blocks` prop. This is the deliberate erasure point, **not** `any`. (A bare `{ HeroBlock, ... } as const` does NOT typecheck against the renderer — that was the original bug.)

```ts
import type { ComponentType } from 'react';
import { HeroBlock } from './HeroBlock/HeroBlock';
import { BookingBlock } from './BookingBlock/BookingBlock';
import { MediaTextBlock } from './MediaTextBlock/MediaTextBlock';
import { AccommodationGridBlock } from './AccommodationGridBlock/AccommodationGridBlock';
import { AmenitiesBlock } from './AmenitiesBlock/AmenitiesBlock';
import { ReviewsBlock } from './ReviewsBlock/ReviewsBlock';

// The registry is the type-erasure boundary: BlockRenderer feeds `content:
// unknown`, validated at runtime. The cast is the deliberate erasure point —
// not `any`.
type BlockComponent = ComponentType<{ content: unknown; variant?: string }>;

export const clientBlocks: Record<string, BlockComponent> = {
  HeroBlock: HeroBlock as BlockComponent,
  BookingBlock: BookingBlock as BlockComponent,
  MediaTextBlock: MediaTextBlock as BlockComponent,
  AccommodationGridBlock: AccommodationGridBlock as BlockComponent,
  AmenitiesBlock: AmenitiesBlock as BlockComponent,
  ReviewsBlock: ReviewsBlock as BlockComponent,
};
```

## Step 7 — Write app/layout.tsx

The layout adopts `SiteShell` from `@hwe/core-ui`, which renders the Navbar + `<main>` + Footer from `client.config.ts` (DEC-024). `<html lang>` comes from the config locale (detected in Step 0).

```tsx
import type { Metadata } from 'next';
import { SiteShell } from '@hwe/core-ui';
import { config } from '../../client.config';
import './globals.css';

export const metadata: Metadata = {
  title: {
    template: `%s | ${config.name}`,
    default: config.name,
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang={config.locale}>
      <body>
        <SiteShell config={config}>{children}</SiteShell>
      </body>
    </html>
  );
}
```

**Because `SiteShell` provides the `<main>` landmark, compositions must NOT add their own `<main>`** (see `/create-page` — bare-layout branch is for sites without SiteShell).

## Step 8 — Write app/error.tsx and app/not-found.tsx

These are **required** by Next.js App Router. Without them the browser shows "missing required error components, refreshing..." in an infinite loop.

**error.tsx:**
```tsx
'use client';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main style={{ padding: '2rem', fontFamily: 'sans-serif' }}>
      <h2>Something went wrong</h2>
      <p style={{ color: '#666' }}>{error.message}</p>
      <button onClick={reset} style={{ marginTop: '1rem', cursor: 'pointer' }}>
        Try again
      </button>
    </main>
  );
}
```

**not-found.tsx:**
```tsx
import Link from 'next/link';

export default function NotFound() {
  return (
    <main style={{ padding: '2rem', fontFamily: 'sans-serif' }}>
      <h2>404 — Page not found</h2>
      <p style={{ color: '#666' }}>The page you are looking for does not exist.</p>
      <Link href="/" style={{ marginTop: '1rem', display: 'inline-block' }}>
        Back to home
      </Link>
    </main>
  );
}
```

## Step 9 — Write app/globals.css

If figma-analysis.md specifies font families, add a Google Fonts `@import` (acceptable for scaffold/demo; replace with `next/font` before production):

```css
@import "tailwindcss";
@import "@hwe/config/theme.css";

/* REQUIRED — Tailwind v4 ignores node_modules by default, so the utility
   classes used INSIDE @hwe/core-ui blocks are never generated and the page
   renders unstyled. Scan the installed package explicitly. Relative to this
   file (src/app/globals.css), node_modules is two levels up; the path is the
   same in the fixture (workspace symlink) and a real client (npm install). */
@source "../../node_modules/@hwe/core-ui";

/* === FONTS === */
@import url('https://fonts.googleapis.com/css2?family={HeadingFont}:wght@400;600;700&family={BodyFont}:wght@400;500;600;700&display=swap');
/* Note: replace with next/font before production deployment */

/* === CLIENT TOKEN OVERRIDES === */
/* The @theme is the SINGLE SOURCE OF TRUTH for this project's visual language
   (DEC-022). Pour the FULL visual layer from tokens.json — not just colors:
   colors, fonts, radii (square vs rounded), shadows, eyebrow tracking. The
   shared @hwe/core-ui primitives (Button, Eyebrow, …) read these tokens, so
   the whole site — and every block — picks up the brand automatically. */
@theme {
  --color-background: {background};
  --color-foreground: {foreground};
  --color-surface: {surface};
  --color-secondary: {secondary};
  --color-primary: {primary};
  --color-primary-foreground: {primary-foreground};
  --color-accent: {accent};
  --color-accent-foreground: {accent-foreground};
  --color-muted-foreground: {muted-foreground};
  --color-text-on-dark: {text-on-dark};
  --color-border: {border};
  --color-overlay: {overlay};

  --font-heading: "{HeadingFont}", Georgia, serif;
  --font-body: "{BodyFont}", system-ui, sans-serif;
  --font-ui: "{BodyFont}", system-ui, sans-serif;

  --radius-sm: {radii.sm};
  --radius-md: {radii.md};
  --radius-lg: {radii.lg};

  --shadow-card: {shadows.sm};
  --shadow-elevated: {shadows.lg};

  --tracking-eyebrow: {eyebrow tracking, e.g. 0.2em};
}

/* === ANIMATIONS === */

/* === THIRD-PARTY OVERRIDES === */
/* PMS widget overrides (THR, Masterbooking, etc.) */

/* === PRINT === */
@media print {
  nav,
  footer {
    display: none;
  }
}
```

## Step 10 — Write tokens.json

If `docs/clients/{slug}/tokens.json` exists (from Step 0), copy its content directly.

Otherwise, write a placeholder that matches the `TokensContract` shape:

```json
{
  "colors": {
    "background":          { "value": "#ffffff" },
    "foreground":          { "value": "#1a1a1a" },
    "surface":             { "value": "#f5f5f5" },
    "primary":             { "value": "#1a4a52" },
    "primary-foreground":  { "value": "#ffffff" },
    "accent":              { "value": "#9fcad0" },
    "accent-foreground":   { "value": "#1a4a52" },
    "accent-secondary":    { "value": "#e4f3f5" },
    "secondary":           { "value": "#e4f3f5" },
    "muted-foreground":    { "value": "#676977" },
    "text-on-dark":        { "value": "#ffffff" },
    "border":              { "value": "rgba(159,202,208,0.35)" },
    "overlay":             { "value": "rgba(0,0,0,0.5)" }
  },
  "fonts": {
    "heading": { "family": "Playfair Display", "fallback": "Georgia, serif" },
    "body":    { "family": "Montserrat",        "fallback": "system-ui, sans-serif" },
    "ui":      { "family": "Montserrat",        "fallback": "system-ui, sans-serif" }
  },
  "spacing": {
    "container-max": "1280px",
    "section-y":     "80px"
  },
  "radii": {
    "sm": "4px", "md": "8px", "lg": "16px", "full": "9999px"
  },
  "shadows": {
    "sm": "0 1px 2px rgba(0,0,0,0.05)",
    "md": "0 4px 6px rgba(0,0,0,0.10)",
    "lg": "0 10px 15px rgba(0,0,0,0.10)"
  }
}
```

## Step 11 — Write client.config.ts

The config type is `TenantConfig` from `@hwe/core-ui`. It is the tenant's single, growable source of truth: identity + locale + **chrome content** (logo, contact, nav, footer) that `SiteShell`/`Navbar`/`Footer` render (DEC-024), plus the **booking engine** selection (`booking.provider`, the DEC-017 adapter choice — wired later). Fill nav/footer/contact from the import-figma analysis. At the repo root (`client.config.ts`).

```ts
import type { TenantConfig } from '@hwe/core-ui';

export const config: TenantConfig = {
  name: '{Client Display Name}',
  locale: '{detected-language}',
  logo: { wordmark: '{Client Display Name}' }, // real logo → public/brand/logo.svg
  contact: {
    phone: '{phone}',
    email: '{email}',
    address: '{city, region}',
  },
  nav: {
    links: [
      { label: '{Page}', href: '/{slug}' },
      { label: '{Menu}', href: '#', children: [{ label: '{Child}', href: '#' }] },
    ],
    cta: { label: '{Book}', href: '#book' },
  },
  footer: {
    tagline: '{one-line tagline}',
    columns: [
      { heading: '{Column}', links: [{ label: '{Link}', href: '#' }] },
    ],
    legal: '© {year} {Client Display Name}. {rights}.',
  },
  // booking: { provider: 'thr' },  // PMS adapter — uncomment + configure when wiring booking
};
```

## Step 12 — Write tailwind.config.ts (Tailwind v4)

Tailwind v4 uses CSS-first configuration via `@theme` in `globals.css`. There is no `tailwind.config.ts` in most cases.

**For Tailwind v4**, the configuration lives entirely in `globals.css`:

```css
@import "tailwindcss";
@import "@hwe/config/theme.css";   /* base hwe design tokens */

@theme {
  /* Client overrides — these shadow @hwe/config base tokens */
  --color-primary: #1a4a52;
  --color-primary-foreground: #ffffff;
  --color-accent: #9fcad0;
  --font-heading: "Playfair Display", Georgia, serif;
  --font-body: "Montserrat", system-ui, sans-serif;
  --spacing-section-y: 80px;
  --width-container: 1280px;
}
```

**When a config file IS needed** (e.g. to specify content paths for monorepo):

```ts
import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/**/*.{ts,tsx}',
    './node_modules/@hwe/core-ui/src/**/*.{ts,tsx}',
  ],
};

export default config;
```

**Do NOT use `presets: [createhwePreset(...)]`** — that is the v3 API and does not work with Tailwind v4.

## Step 13 — Write postcss.config.mjs

**REQUIRED for Tailwind v4.** Without this file Tailwind classes are silently ignored.

```js
export default {
  plugins: {
    '@tailwindcss/postcss': {},
  },
};
```

Note: Tailwind v4 uses `@tailwindcss/postcss` — not the old `tailwindcss` key.

## Step 14 — Write next.config.mjs

```js
/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['@hwe/core-ui', '@hwe/config'],
};

export default nextConfig;
```

## Step 15 — Write package.json

Only include `@hwe/*` packages verified to exist in Step 2. Use `"workspace:*"` for monorepo packages:

```json
{
  "name": "site-{slug}",
  "private": true,
  "version": "0.0.1",
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "typecheck": "tsc --noEmit",
    "test": "vitest"
  },
  "dependencies": {
    "@hwe/core-ui": "^1.0.0",
    "@hwe/config": "^1.0.0",
    "next": "^15.0.0",
    "react": "^19.0.0",
    "react-dom": "^19.0.0"
  },
  "devDependencies": {
    "@types/node": "^20.0.0",
    "@types/react": "^19.0.0",
    "@types/react-dom": "^19.0.0",
    "tailwindcss": "^4.0.0",
    "typescript": "^5.0.0",
    "vitest": "^2.0.0"
  }
}
```

## Step 16 — Write tsconfig.json

Use the exact filename found in Step 3:

```json
{
  "extends": "../../packages/config/{actual-filename}",
  "compilerOptions": {
    "baseUrl": ".",
    "rootDir": ".",
    "paths": {
      "@/*": ["./src/*"]
    }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules", "dist", ".next", ".turbo"]
}
```

Note: `"rootDir": "."` is required to override the base config's `"rootDir": "./src"`, which would otherwise block imports of `client.config.ts`, `tailwind.config.ts`, and `next.config.mjs`.

## Step 17 — Write compositions

Read `packages/core-ui/src/renderer/BlockRenderer.tsx` to confirm the current prop names before writing compositions.

Known correct API:
- `layout: BlockInstance[]` — the array of block instances (NOT `blocks`)
- `blocks?: Record<string, ComponentType<any>>` — the client block override map

`BlockInstance` is exported from `@hwe/core-ui`. `BlockRendererProps` is NOT exported — do not use it.

```tsx
import type { BlockInstance } from '@hwe/core-ui';
import { BlockRenderer } from '@hwe/core-ui';
import { clientBlocks } from '../blocks/registry';

const layout: BlockInstance[] = [];

export function HomeComposition() {
  return <BlockRenderer layout={layout} blocks={clientBlocks} />;
}
```

## Step 18 — Pre-flight: verify @hwe/core-ui resolves

Before reporting completion, verify that `@hwe/core-ui` is installed and the key subpath exports resolve:

```bash
node -e "require('@hwe/core-ui')" 2>&1 | head -5
node -e "require('@hwe/core-ui/base-blocks')" 2>&1 | head -5
node -e "require('@hwe/core-ui/schemas')" 2>&1 | head -5
```

If any subpath fails to resolve, check that the correct version is installed and the package.json `exports` field is present.

## Step 19 — Write `DESIGN.md` (project design-system guide)

Every project gets a **`DESIGN.md` at its root** — the authoritative, human-readable design-system guide (DEC-022). Its purpose: the reference for building **blocks or sections that do NOT exist in the Figma**, so new work stays coherent with the brand. It **supersedes** the lighter `design-language.md` draft (same purpose, fuller form) — `/design-block` reads `DESIGN.md`.

Generate it from the import-figma outputs (`figma-analysis.md`, `design-language.md`, `tokens.json`) for this client. Use the section structure below; fill every section from the analysis, mark anything uncertain `(?)`, and **reference token names** (`--color-primary`, `--radius-md`, `tracking-eyebrow`) and **shared primitives** (`Button`, `Eyebrow`, …) rather than raw values.

Sections (model: `apps/site-demo/DESIGN.md`):
1. **Header** — client, source repo + tag, "token source of truth = `globals.css @theme`", "compose `@hwe/core-ui` primitives".
2. **Overview** — the identity in a paragraph + key characteristics.
3. **Colors** — table of `--color-*` tokens → value → use; colour-usage rules.
4. **Typography** — families (`--font-*`), hierarchy table, the eyebrow pattern.
5. **Layout & Spacing** — container, `--spacing-section-y`, grid, alternating backgrounds.
6. **Elevation & Depth** — flat-first; shadow tokens; hero overlay.
7. **Shapes (radius)** — `--radius-*` table; the square-vs-pill rule.
8. **Components** — primitives (`Button` variants/sizes/onDark, `Eyebrow`, …) + blocks; **how to build a new block** (compose primitives, tokens only, the eyebrow→heading→divider→body→CTA pattern, a11y test).
9. **Do's and Don'ts.**
10. **Responsive Behavior.**
11. **Iteration Guide.**
12. **Known Gaps** — blocks not yet built, adapters, deferred items.

Write to `{project-root}/DESIGN.md`. If no import-figma outputs exist, write a skeleton with the section headers and `(?)` placeholders, and WARN that it needs the designer/dev to fill it.

## Step 20 — Write the live `/design-system` route

Alongside the `DESIGN.md` prose guide, every project gets a **live visual reference** at `src/app/design-system/page.tsx` (route `/design-system`) — the rendered counterpart of `DESIGN.md` (model: `site-demo/src/app/design-system/page.tsx`).

It MUST be **live and non-duplicating** (DEC-022): swatches read the actual `var(--color-*)` from `@theme`, and the component sections render the **real `@hwe/core-ui` primitives** (`<Button variant=...>`, `<Eyebrow>`, …) — never hardcoded hex values, never re-implemented atoms. So if a token changes, the page updates itself, and it proves the primitives match the design.

Sections (mirror `DESIGN.md`): header + identity; **Color** (swatch grid reading `--color-*`); **Typography** (the type scale, real `Eyebrow`); **Components** (every `Button` variant/size + `onDark` over a dark surface, plus other primitives as they're added); **Shapes** (`--radius-*` boxes); **Layout** (spacing); **Depth** (`--shadow-*`). Use only token classes/vars and the real components.

# Examples

```
/scaffold-site hotel-balneario-fuente-de-cabriel --client-name "Hotel Balneario Fuente de Cabriel"
/scaffold-site camping-sol
```

# Refusal cases

- Do not scaffold inside `hwe-core/` — client repos are independent (DEC-011 + DEC-017).
- Do not create CSS files next to blocks.
- Do not export base-block components from `@hwe/core-ui` root — use the `./base-blocks` subpath.

# Known pitfalls

0. **Missing `@source "../../node_modules/@hwe/core-ui"` in `globals.css`** → Tailwind v4 ignores node_modules, so the utility classes used inside `@hwe/core-ui` blocks are never generated and the whole site renders unstyled (content shows, no design). This is the most common cause of a "no styles" page.
1. **Missing `postcss.config.mjs`** → Tailwind classes silently ignored, page renders with no styles.
2. **Missing `error.tsx` / `not-found.tsx`** → "missing required error components" infinite refresh loop.
3. **Using `workspace:*` in client repo** → `npm install` fails, these are only for `hwe-core` internal use.
4. **`tsconfig extends` wrong filename** → compilation fails with "file not found".
5. **Using v3 `@tailwind base/components/utilities`** → Tailwind v4 requires `@import "tailwindcss"`.
6. **Using `presets: [createhwePreset(...)]`** → v3 API, does not work with Tailwind v4.
7. **Using non-existent types (`ClientConfig`, `BlockRendererProps`)** → TypeScript compilation fails.
8. **Not loading fonts** → heading/body fonts fall back to system fonts, breaking brand fidelity.
9. **Adding `@hwe/booking`** → this package does not exist; booking adapter is inside `@hwe/core-ui`.
10. **Not overriding `rootDir` in tsconfig** → TypeScript rejects imports of files outside `src/`.
