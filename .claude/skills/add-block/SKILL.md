---
name: add-block
description: Add a block with fake content to an existing page composition. Run /create-page first if the composition does not exist yet.
argument-hint: [site-slug] [page-slug] [BlockType]
allowed-tools: Read Write Edit Glob Grep Bash(pnpm *) Bash(test *)
---

# Add Block

You are a frontend scaffolder for hwe client sites. Your job is to add a named block (with realistic fake content) to an existing page composition. The block must already exist in `@hwe/core-ui`; you do not create blocks here — that is `/scaffold-block`.

## Constraints

- All three arguments are required.
- `site-slug` must match `^[a-z0-9-]+$`.
- `page-slug` must match `^[a-z][a-z0-9-]*$`.
- `BlockType` is the stem — **without** the `Block` suffix (e.g. `Hero`, `MediaText`, `Amenities`). The full folder name is `{BlockType}Block`.
- Runs from within the client repo (CWD = `site-{slug}/`). Paths are relative to client repo root.
- The target composition `src/compositions/{PageName}Composition.tsx` must exist. If not, tell the user to run `/create-page` first.
- The block schema is in `node_modules/@hwe/core-ui/src/schemas/{BlockType}Block.schema.ts` or `src/blocks/{BlockType}Block/` (client override). If not found, tell the user to run `/scaffold-block` first.
- SEO rules apply to generated content: descriptive alt text, h2/h3 hierarchy (never h1 inside a block), no native `<img>`.
- Generated fake content is in the **site's language** (read it from the existing `src/data/fake-content.ts` or `src/app/layout.tsx`).

## Process

### Step 0 — Parse and validate arguments

Arguments: `$0` = site-slug (default `site-demo`), `$1` = page-slug, `$2` = BlockType (stem, no `Block` suffix).

Derive:
- `SITE` = site-slug.
- `SLUG` = page-slug.
- `BlockName` = `{BlockType}Block` (e.g. `HeroBlock`, `MediaTextBlock`).
- `PageName` = PascalCase of page-slug (same rule as `/create-page`).
- `contentVar` = camelCase of BlockType + page context (e.g. `heroContent`, `mediaTextAboutContent`).
  If multiple blocks of the same type are on the page, append a disambiguator (e.g. `mediaTextIntroContent`, `mediaTextRegionContent`).

Validate in order:
1. `apps/{SITE}/src/compositions/{PageName}Composition.tsx` exists → if not, stop: "Run /create-page {SITE} {SLUG} first."
2. `packages/core-ui/src/base-blocks/{BlockName}/` exists → if not, stop: "Block {BlockName} not found in @hwe/core-ui. Run /scaffold-block {BlockName} to create it first."

### Step 1 — Read the block schema

Read `node_modules/@hwe/core-ui/src/schemas/{BlockName}.schema.ts` (canonical schema location).

If that file does not exist, fall back to `node_modules/@hwe/core-ui/src/base-blocks/{BlockName}/{BlockName}.schema.ts`.

Parse the Zod schema to understand every required field and optional field. Pay attention to:
- Required vs optional fields.
- Image fields — must always have `alt`.
- Array fields (e.g. `items`, `ctas`, `reviews`) — generate 2–3 realistic items.
- Enum fields or union literals — use the first valid value as the default variant.

Also read `node_modules/@hwe/core-ui/src/base-blocks/{BlockName}/{BlockName}.types.ts` (if it exists separately) for the `{BlockName}Props` type to confirm the variant prop name and available values.

### Step 2 — Determine the default variant

Read the block's variants file: `node_modules/@hwe/core-ui/src/base-blocks/{BlockName}/{BlockName}.variants.ts` (flat layout) OR `node_modules/@hwe/core-ui/src/base-blocks/{BlockName}/index.ts` (structural variants).

- For CVA (flat): the first key in the `variants` object is the default.
- For structural variants (`index.ts`): the first key exported from the variants map is the default.

Use this variant in the `BlockInstance` entry. Never ask the user to pick — use the default.

### Step 3 — Read the Figma Make source (CRITICAL)

Search for the block equivalent in the Figma Make repo:

1. `ls figma-makes/` to find available Figma repos.
2. Identify which Figma slug corresponds to this site — check `docs/clients/{slug}/figma-analysis.md` or infer from site name.
3. Search for the block's component:
   ```bash
   grep -rl "{BlockType}\|{blocktype}" figma-makes/{figma-slug}/src/app/components/ 2>/dev/null
   ```
4. If found: READ the file and extract:
   - All literal text values (headings, body, button labels) — use these AS-IS, in the original language.
   - Image paths — copy to site `public/` or note as placeholder reference.
   - The visual structure (elements present, their order).
5. If not found: generate content in the SAME LANGUAGE as the site (check `layout.tsx` `<html lang="...">` or `figma-analysis.md` language section). **Never default to English unless the site IS English.**

RULE: Figma text always wins over invented placeholder text. The Figma Make repo contains the real brand voice.

### Content language rule

NEVER generate fake content in English unless the site's language IS English.

To detect the language:
1. Check `apps/{SITE}/src/app/layout.tsx` for the `<html lang="...">` attribute.
2. Check `docs/clients/{slug}/figma-analysis.md` for the `## Language` section.
3. Check existing `fake-content.ts` entries for the language of already-written content.

All generated text (titles, subtitles, CTAs, descriptions, alt text) MUST be in the detected language.

### Image rule

For the `src` field of any image:

1. FIRST check `figma-makes/{slug}/public/` for the image — if found, copy to `apps/{SITE}/public/images/` and reference as `/images/{filename}`.
2. If no local image exists, use `https://picsum.photos/seed/{descriptive-seed}/{width}/{height}` (fixed seed = same image on every reload).
3. Add `// TODO: replace with real image` comment on every placeholder URL.
4. If using picsum, ensure `next.config.mjs` has:
   ```js
   images: {
     remotePatterns: [{ protocol: 'https', hostname: 'picsum.photos' }],
   },
   ```
   Add it with the `Edit` tool if missing.

### Step 4 — Check and update client registry

Read `src/blocks/registry.ts`.

Verify that `{BlockName}` is already exported in the `clientBlocks` object. If it is not present:

1. Read `src/blocks/{BlockName}/{BlockName}.tsx`. If this file does not exist, stop and tell the user: "Block `{BlockName}` is not registered in `src/blocks/registry.ts` and no local re-export exists. Run `/scaffold-block {BlockName} --target client --site {SITE}` first, then re-run `/add-block`."
2. If the file exists (the re-export exists but was not added to the registry), add the missing entry using the `Edit` tool:
   - Add the import line with the other block imports: `import { {BlockName} } from './{BlockName}/{BlockName}';`
   - Add `{BlockName},` to the `clientBlocks` object.

### Step 5 — Read existing fake-content file

Read `src/data/fake-content.ts` (or `src/data/fake-content-{SLUG}.ts` if it exists) to:
- Understand the existing naming convention for content variables.
- Confirm the site's language and tone.
- Avoid duplicate variable names.

### Step 6 — Generate the fake content object

Compose a typed fake content object for the block. Rules:

- Type it with the schema type: `const {contentVar}: {BlockName}Content = { ... };`
- Image `alt` text: descriptive, in the site's language. Follow `docs/specs/seo/semantic-html.md` alt rules:
  - Hero: scene + establishment name.
  - Accommodation card: type + capacity.
  - General: subject description + establishment context.
  - Never: `"image"`, `"photo"`, empty string.
- Image `src`: use a path from `/images/` that plausibly exists (or a `/images/placeholder-{block}.jpg` path with a comment `// TODO: replace with real image`).
- Text content: realistic hospitality copy matching the block's purpose, in the site's language (French for Camping Mer et Camargue).
- Array items: 2–3 minimum, representative of the real catalogue (not "Item 1", "Item 2").

### Step 7 — Update or create the fake-content data file

Determine the target data file:
- If `apps/{SITE}/src/data/fake-content-{SLUG}.ts` exists → append to it.
- If this is the homepage (`SLUG` is empty or `/`) → append to `fake-content.ts`.
- Otherwise → create `apps/{SITE}/src/data/fake-content-{SLUG}.ts` (if it does not exist), or append to it.

Add the import at the top:
```ts
import type { {BlockName}Content } from '@hwe/core-ui';
```

Add the export at the bottom:
```ts
export const {contentVar}: {BlockName}Content = { ... };
```

Use the `Edit` tool to append to an existing file; use `Write` only if creating a new file.

### Step 8 — Update the composition

Read `src/compositions/{PageName}Composition.tsx`.

Two edits needed:

**A. Add the import** of the content variable at the top of the file, next to the existing data imports:
```ts
import { {contentVar} } from '@/data/fake-content-{SLUG}';
```
(For homepage compositions that use `fake-content.ts`, import from `@/data/fake-content`.)

**B. Add the block entry** to the `layout` array. Determine the next `order` value (max existing order + 1):
```ts
{ type: '{BlockName}', order: {N}, content: {contentVar}, variant: '{defaultVariant}' },
```

Use the `Edit` tool for both changes.

### Step 9 — Run typecheck

```bash
pnpm --filter {SITE} exec tsc --noEmit
```

If typecheck fails, diagnose the error:
- Missing required field in content → add it to the fake content object.
- Wrong variant value → fix to match the valid union.
- Import path wrong → correct the import.

Fix and re-run. Do not report success until typecheck is green.

### Step 10 — Print summary

```
Block added: {BlockName} → {PageName}Composition (/{SLUG})

Variant used: {defaultVariant}
Content variable: {contentVar}

Files modified:
  apps/{SITE}/src/compositions/{PageName}Composition.tsx  — added block entry (order {N})
  apps/{SITE}/src/data/fake-content-{SLUG}.ts             — added {contentVar}

Typecheck: ✓ green

Next steps:
  - Replace placeholder image paths (grep for "TODO: replace") with real assets.
  - Run /add-block {SITE} {SLUG} {NextBlock} to add more blocks.
  - Run /seo-audit {SITE} to verify the full page.
```

## SEO rules enforced on generated content

These are non-negotiable:

- Images: always `alt` with descriptive text in the site's language. Never `"image"` or empty.
- Block heading level: `h2` for block titles, `h3` for sub-items. Never `h1` inside a block.
- `<section>` elements in blocks: must have `aria-labelledby` pointing to the block heading id.
- No native `<img>` in any generated code — all image composition uses `@hwe/core-ui` block components which already use `next/image`.

Reference: `docs/specs/seo/semantic-html.md`.

## What this skill loads

- Block schema from `packages/core-ui/src/schemas/{BlockName}.schema.ts` (or `base-blocks/` fallback)
- Block types from `packages/core-ui/src/base-blocks/{BlockName}/`
- `apps/{SITE}/src/blocks/registry.ts` — checked to verify block is registered for the site
- `apps/{SITE}/src/data/fake-content*.ts` — naming convention and language
- `figma-makes/*/src/app/components/` — reference copy (if available)

**Total skill-side token cost per invocation: under 3k tokens.**

## Refusal cases

- Missing composition (`/create-page` not run) → stop with clear message.
- Block does not exist in `packages/core-ui/src/base-blocks/` → stop. Point to `/scaffold-block`.
- `BlockType` includes `Block` suffix (e.g. user typed `HeroBlock`) → normalise silently: strip the suffix, use `Hero`.
- More than one `BlockType` argument → process only the first; tell the user to run `/add-block` again for each additional block.

## Examples

### Add HeroBlock to the le-camping page

```
/add-block site-demo le-camping Hero
```

Reads `HeroBlock.schema.ts`, checks for Figma reference, generates French hero content, adds to `fake-content-le-camping.ts`, wires into `LeCampingComposition.tsx` at order 1.

### Add MediaTextBlock to the le-camping page

```
/add-block site-demo le-camping MediaText
```

Adds a media+text section with camping-themed copy. Variant default from `MediaTextBlock.variants.ts`.

### Add a second MediaTextBlock

```
/add-block site-demo le-camping MediaText
```

Detects existing `mediaTextContent` variable in the file; uses `mediaTextRegionContent` (or similar disambiguator) for the new entry.

### User typed BlockType with suffix

```
/add-block site-demo le-camping ReviewsBlock
```

Strips the `Block` suffix silently: treated as `Reviews` → `ReviewsBlock`.
