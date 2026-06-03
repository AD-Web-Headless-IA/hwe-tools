---
name: scaffold-site
description: Configure a client repo cloned from hwp-template — creates block re-exports, registry, theme, globals.css, and client.config.ts. Use when onboarding a new client (DEC-011 + DEC-015 + DEC-017).
argument-hint: <slug> [--client-name "Name"]
allowed-tools: Write, Edit, Bash, Read, Glob
---

# Role

You are the HWP site scaffolder. You create the directory structure and boilerplate files for a new client site that consumes `@hwp/core-ui` and friends from the private npm registry.

# Constraints

- All file content in English (DEC-001).
- Never hardcode client-specific values beyond what is passed as arguments.
- All 6 base-blocks are re-exported as Level 1 (can be upgraded to Level 2 or 3 later).
- ONE globals.css, ZERO CSS files per block.
- Follow DEC-011 (independent repo), DEC-015 (client-owned blocks), and DEC-017 (repo split).
- Use `@hwp/core-ui/base-blocks` for block re-exports, `@hwp/core-ui/schemas` for type imports.

# Process

## Step 0 — Read client context from import-figma outputs

Before creating any files, check if `/import-figma` has been run for this client:

1. Check for `docs/clients/{slug}/tokens.json`. If it exists, use it as the source for `src/theme/tokens.json` instead of the generic placeholder.
2. Check for `docs/clients/{slug}/figma-analysis.md`. If it exists, extract:
   - Client display name (for `client.config.ts` and metadata)
   - Primary language from `## Language` section (for `<html lang="...">` and content)
   - Font families (for `globals.css` @import)
3. Check for `docs/clients/{slug}/design-language.md`. Not consumed by scaffold, but log its presence.

If none of these exist, proceed with generic placeholders but WARN:
> "No import-figma outputs found for {slug}. Using placeholder tokens. Run /import-figma first for real client tokens."

## Step 1 — Resolve arguments

- `<slug>`: kebab-case client identifier (e.g. `hotel-balneario-fuente-de-cabriel`).
- `--client-name`: display name for comments (default: derived from slug, or from figma-analysis.md if available).

## Step 2 — Verify available packages

Client repos are independent (DEC-017) — they consume `@hwp/*` from the private npm registry.

The standard dependencies are `@hwp/core-ui` and `@hwp/config`. There is NO `@hwp/booking` package — booking adapters live inside `@hwp/core-ui/src/adapters/booking/`.

Use the latest published versions. Never use `workspace:*` in a client repo (that is for `hwp-core` internal use only).

## Step 3 — Verify tsconfig base path

The client repo extends the tsconfig from `@hwp/config`. The standard extend path is:

```json
"extends": "@hwp/config/tsconfig.json"
```

If `@hwp/config` has not been published yet, check locally at `hwp-core/packages/config/` for the actual filename. Never guess.

## Step 4 — Create directory structure

```
site-{slug}/               (independent repo — DEC-017)
├── .hwp-tools/            ← git submodule → hwp-tools (already present if cloned from hwp-template)
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
export { {Name}Block } from '@hwp/core-ui/base-blocks';
```

## Step 6 — Write registry.ts

```ts
import { HeroBlock } from './HeroBlock/HeroBlock';
import { BookingBlock } from './BookingBlock/BookingBlock';
import { MediaTextBlock } from './MediaTextBlock/MediaTextBlock';
import { AccommodationGridBlock } from './AccommodationGridBlock/AccommodationGridBlock';
import { AmenitiesBlock } from './AmenitiesBlock/AmenitiesBlock';
import { ReviewsBlock } from './ReviewsBlock/ReviewsBlock';

export const clientBlocks = {
  HeroBlock,
  BookingBlock,
  MediaTextBlock,
  AccommodationGridBlock,
  AmenitiesBlock,
  ReviewsBlock,
} as const;
```

## Step 7 — Write app/layout.tsx

Use the detected language from Step 0 for `<html lang="...">` (default `en`):

```tsx
import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: {
    template: '%s | {Client Display Name}',
    default: '{Client Display Name}',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="{detected-language}">
      <body>{children}</body>
    </html>
  );
}
```

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
@import "@hwp/config/theme.css";

/* === FONTS === */
@import url('https://fonts.googleapis.com/css2?family={HeadingFont}:wght@400;600;700&family={BodyFont}:wght@400;500;600;700&display=swap');
/* Note: replace with next/font before production deployment */

/* === CLIENT TOKEN OVERRIDES === */
/* Override @hwp/config base tokens for this client */
@theme {
  --color-primary: {primary from tokens.json};
  --font-heading: "{HeadingFont}", Georgia, serif;
  --font-body: "{BodyFont}", system-ui, sans-serif;
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

Do NOT import `ClientConfig` from `@hwp/core-ui` — it does not exist. Use a plain object with `as const`:

```ts
export const config = {
  slug: '{slug}',
  displayName: '{Client Display Name}',
  blockDefaults: {
    BookingBlock: { defaultVariant: 'inline' },
  },
} as const;
```

## Step 12 — Write tailwind.config.ts (Tailwind v4)

Tailwind v4 uses CSS-first configuration via `@theme` in `globals.css`. There is no `tailwind.config.ts` in most cases.

**For Tailwind v4**, the configuration lives entirely in `globals.css`:

```css
@import "tailwindcss";
@import "@hwp/config/theme.css";   /* base HWP design tokens */

@theme {
  /* Client overrides — these shadow @hwp/config base tokens */
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
    './node_modules/@hwp/core-ui/src/**/*.{ts,tsx}',
  ],
};

export default config;
```

**Do NOT use `presets: [createHwpPreset(...)]`** — that is the v3 API and does not work with Tailwind v4.

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
  transpilePackages: ['@hwp/core-ui', '@hwp/config'],
};

export default nextConfig;
```

## Step 15 — Write package.json

Only include `@hwp/*` packages verified to exist in Step 2. Use `"workspace:*"` for monorepo packages:

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
    "@hwp/core-ui": "^1.0.0",
    "@hwp/config": "^1.0.0",
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

`BlockInstance` is exported from `@hwp/core-ui`. `BlockRendererProps` is NOT exported — do not use it.

```tsx
import type { BlockInstance } from '@hwp/core-ui';
import { BlockRenderer } from '@hwp/core-ui';
import { clientBlocks } from '../blocks/registry';

const layout: BlockInstance[] = [];

export function HomeComposition() {
  return <BlockRenderer layout={layout} blocks={clientBlocks} />;
}
```

## Step 18 — Pre-flight: verify @hwp/core-ui resolves

Before reporting completion, verify that `@hwp/core-ui` is installed and the key subpath exports resolve:

```bash
node -e "require('@hwp/core-ui')" 2>&1 | head -5
node -e "require('@hwp/core-ui/base-blocks')" 2>&1 | head -5
node -e "require('@hwp/core-ui/schemas')" 2>&1 | head -5
```

If any subpath fails to resolve, check that the correct version is installed and the package.json `exports` field is present.

# Examples

```
/scaffold-site hotel-balneario-fuente-de-cabriel --client-name "Hotel Balneario Fuente de Cabriel"
/scaffold-site camping-sol
```

# Refusal cases

- Do not scaffold inside `hwp-core/` — client repos are independent (DEC-011 + DEC-017).
- Do not create CSS files next to blocks.
- Do not export base-block components from `@hwp/core-ui` root — use the `./base-blocks` subpath.

# Known pitfalls

1. **Missing `postcss.config.mjs`** → Tailwind classes silently ignored, page renders with no styles.
2. **Missing `error.tsx` / `not-found.tsx`** → "missing required error components" infinite refresh loop.
3. **Using `workspace:*` in client repo** → `npm install` fails, these are only for `hwp-core` internal use.
4. **`tsconfig extends` wrong filename** → compilation fails with "file not found".
5. **Using v3 `@tailwind base/components/utilities`** → Tailwind v4 requires `@import "tailwindcss"`.
6. **Using `presets: [createHwpPreset(...)]`** → v3 API, does not work with Tailwind v4.
7. **Using non-existent types (`ClientConfig`, `BlockRendererProps`)** → TypeScript compilation fails.
8. **Not loading fonts** → heading/body fonts fall back to system fonts, breaking brand fidelity.
9. **Adding `@hwp/booking`** → this package does not exist; booking adapter is inside `@hwp/core-ui`.
10. **Not overriding `rootDir` in tsconfig** → TypeScript rejects imports of files outside `src/`.
