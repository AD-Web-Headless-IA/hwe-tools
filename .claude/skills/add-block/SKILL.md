---
name: add-block
description: Add a registered block with realistic inline content to an existing page composition's BlockInstance array. Run /create-page first if the composition does not exist yet.
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
- **Paths resolve from `SITE_DIR` and `PKG`** — defined once in `docs/contracts/general/workspace-structure.md` §"Skill path resolution". Do not re-derive them here. In short: `SITE_DIR` = the target site root (`hwe-core/apps/{SITE}` for the fixture, the repo root for a standalone client); `PKG` = `{SITE_DIR}/node_modules/@hwe/core-ui` (the installed package, which ships `src/`). Never read block source from `hwe-core/packages/core-ui/src/` — that path only exists in the monorepo.
- The target composition `{SITE_DIR}/src/compositions/{PageName}Composition.tsx` must exist. If not, tell the user to run `/create-page` first.
- The block must exist in `{PKG}/src/base-blocks/{BlockType}Block/`. If not found, tell the user to run `/scaffold-block` first.
- SEO rules apply to generated content: descriptive alt text, h2/h3 hierarchy (never h1 inside a block), no native `<img>`.
- **Content is inline.** `site-demo` keeps block content inline in the composition's `BlockInstance[]` array (see `HomeComposition.tsx`), NOT in a separate `src/data/fake-content.ts`. Do not create or append to a `fake-content*.ts` file. Content language follows the site's `<html lang>` in `layout.tsx`.

## Process

### Step 0 — Parse and validate arguments

Arguments: `$0` = site-slug (default `site-demo`), `$1` = page-slug, `$2` = BlockType (stem, no `Block` suffix).

Derive:
- `SITE` = site-slug.
- `SLUG` = page-slug.
- `SITE_DIR`, `PKG` = per `docs/contracts/general/workspace-structure.md` §"Skill path resolution" (fixture: `SITE_DIR = hwe-core/apps/{SITE}`, `PKG = {SITE_DIR}/node_modules/@hwe/core-ui`).
- `BlockName` = `{BlockType}Block` (e.g. `HeroBlock`, `MediaTextBlock`).
- `PageName` = PascalCase of page-slug (same rule as `/create-page`).
- `instanceId` = kebab-case BlockType + index on the page (e.g. `hero-1`, `media-text-1`). Used as the `BlockInstance.id`. If a block of the same type is already on the page, increment the suffix (`media-text-2`).

Validate in order:
1. `{SITE_DIR}/src/compositions/{PageName}Composition.tsx` exists → if not, stop: "Run /create-page {SITE} {SLUG} first."
2. `{PKG}/src/base-blocks/{BlockName}/` exists → if not, stop: "Block {BlockName} not found in @hwe/core-ui. Run /scaffold-block {BlockName} to create it first."

### Step 1 — Read the block schema

Read `{PKG}/src/schemas/{BlockName}.schema.ts` (canonical schema location).

If that file does not exist, fall back to `{PKG}/src/base-blocks/{BlockName}/{BlockName}.schema.ts`.

Parse the Zod schema to understand every required field and optional field. Pay attention to:
- Required vs optional fields.
- Image fields — must always have `alt`.
- Array fields (e.g. `items`, `ctas`, `reviews`) — generate 2–3 realistic items.
- Enum fields or union literals — use the first valid value as the default variant.

Also read `{PKG}/src/base-blocks/{BlockName}/{BlockName}.types.ts` (if it exists separately) for the `{BlockName}Props` type to confirm the variant prop name and available values.

### Step 2 — Determine the default variant

Read the block's variants file: `{PKG}/src/base-blocks/{BlockName}/{BlockName}.variants.ts` (flat layout) OR `{PKG}/src/base-blocks/{BlockName}/index.ts` (structural variants).

- For CVA (flat): the first key in the `variants` object is the default.
- For structural variants (`index.ts`): the first key exported from the variants map is the default.

Use this variant in the `BlockInstance` entry. Never ask the user to pick — use the default.

### Step 3 — Read the Figma Make source (if one exists)

If this client has a Figma Make reference, its text wins over invented copy. This is optional — `site-demo` has none, so skip to the language rule and generate plausible English demo content.

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
5. If not found (or no Figma repo): generate content in the SAME LANGUAGE as the site (see the language rule below).

RULE: Figma text always wins over invented placeholder text. The Figma Make repo contains the real brand voice.

### Content language rule

Generated content is in the **site's language**. NEVER default to English unless the site's language IS English (`site-demo` is English).

To detect the language:
1. Check `{SITE_DIR}/src/app/layout.tsx` for the `<html lang="...">` attribute.
2. Check `docs/clients/{slug}/figma-analysis.md` for the `## Language` section.
3. Check the existing `BlockInstance` content already inline in the site's compositions.

All generated text (titles, subtitles, CTAs, descriptions, alt text) MUST be in the detected language.

### Image rule

For the `src` field of any image:

1. FIRST check `figma-makes/{slug}/public/` for the image — if found, copy to `{SITE_DIR}/public/images/` and reference as `/images/{filename}`.
2. If no local image exists, use `https://picsum.photos/seed/{descriptive-seed}/{width}/{height}` (fixed seed = same image on every reload).
3. Add `// TODO: replace with real image` comment on every placeholder URL.
4. If using picsum, ensure `{SITE_DIR}/next.config.mjs` has:
   ```js
   images: {
     remotePatterns: [{ protocol: 'https', hostname: 'picsum.photos' }],
   },
   ```
   Add it with the `Edit` tool if missing.

### Step 4 — Check and update client registry

Read `{SITE_DIR}/src/blocks/registry.ts`.

Verify that `{BlockName}` is already a key in the `clientBlocks` object. If it is not present:

1. Read `{SITE_DIR}/src/blocks/{BlockName}/{BlockName}.tsx`. If this file does not exist, stop and tell the user: "Block `{BlockName}` is not registered in `src/blocks/registry.ts` and no local re-export exists. Run `/scaffold-block {BlockName} --target client --site {slug}` first, then re-run `/add-block`."
2. If the file exists (the re-export exists but was not added to the registry), add the missing entry using the `Edit` tool, **following the registry's type-erasure convention** (see `scaffold-site` Step 6 — `clientBlocks` is `Record<string, BlockComponent>` and each entry is cast `as BlockComponent`):
   - Add the import line with the other block imports: `import { {BlockName} } from './{BlockName}/{BlockName}';`
   - Add `{BlockName}: {BlockName} as BlockComponent,` to the `clientBlocks` object.

### Step 5 — Read the existing composition

Read `{SITE_DIR}/src/compositions/{PageName}Composition.tsx` to:
- See the existing `BlockInstance[]` (the `layout` array) — its current entries, their `id`s, and the inline content shape already in use.
- Confirm the site's language and tone from the content already inline.
- Pick a non-colliding `instanceId` (Step 0).

There is **no** `src/data/fake-content.ts` — content lives inline in the `layout` array (DEC-019 single-source convention; see `site-demo/src/compositions/HomeComposition.tsx`). Do not create one.

### Step 6 — Compose the inline content object

Build the content object that will sit **inline** inside the new `BlockInstance`. Rules:

- It must satisfy the block's schema type `{BlockName}Content` (read in Step 1). Every required field present; valid enum/union values.
- Image `alt` text: descriptive, in the site's language. Follow `docs/specs/seo/semantic-html.md` alt rules:
  - Hero: scene + establishment name.
  - Accommodation card: type + capacity.
  - General: subject description + establishment context.
  - Never: `"image"`, `"photo"`, empty string.
- Image `src`: a `/images/...` path or a picsum URL per the Image rule, with a `// TODO: replace with real image` comment.
- Text content: realistic hospitality copy matching the block's purpose, in the site's language. Array fields: 2–3 representative items (not "Item 1", "Item 2").

### Step 7 — Add the BlockInstance inline (single edit)

Add one entry to the composition's `layout` array, with the content **inline** (matching `site-demo`'s `HomeComposition.tsx`). `BlockInstance` is `{ id?, type, variant?, order?, content }`; the convention is `id` + `type` + `content` (+ `variant` only when the block has variants):

```ts
{
  id: '{instanceId}',
  type: '{BlockName}',
  variant: '{defaultVariant}',   // omit if the block has no variants
  content: {
    // the object composed in Step 6, typed by {BlockName}Content
  },
},
```

Use the `Edit` tool to insert the entry into the `layout` array. No import is added (content is inline); no separate data file is touched.

### Step 8 — Run typecheck

From the workspace root (the pnpm workspace is `hwe-core`):

```bash
pnpm --filter {SITE} exec tsc --noEmit
```

If typecheck fails, diagnose the error:
- Missing required field in content → add it to the inline content object.
- Wrong variant value → fix to match the valid union.
- Content shape mismatch → correct it against `{BlockName}Content`.

Fix and re-run. Do not report success until typecheck is green.

### Step 9 — Print summary

```
Block added: {BlockName} → {PageName}Composition (/{SLUG})

Instance id:  {instanceId}
Variant used: {defaultVariant}   (or "—" if the block has no variants)

Files modified:
  {SITE_DIR}/src/compositions/{PageName}Composition.tsx  — added BlockInstance (id {instanceId}, inline content)

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

- Block schema from `{PKG}/src/schemas/{BlockName}.schema.ts` (or `{PKG}/src/base-blocks/{BlockName}/` fallback), where `PKG = {SITE_DIR}/node_modules/@hwe/core-ui`
- Block types/variants from `{PKG}/src/base-blocks/{BlockName}/`
- `{SITE_DIR}/src/compositions/{PageName}Composition.tsx` — read for existing inline content + edited to add the new instance
- `{SITE_DIR}/src/blocks/registry.ts` — checked to verify the block is registered for the site
- `figma-makes/*/src/app/components/` — reference copy (if available)

**Total skill-side token cost per invocation: under 3k tokens.**

## Refusal cases

- Missing composition (`/create-page` not run) → stop with clear message.
- Block does not exist in `{SITE_DIR}/node_modules/@hwe/core-ui/src/base-blocks/` → stop. Point to `/scaffold-block`.
- `BlockType` includes `Block` suffix (e.g. user typed `HeroBlock`) → normalise silently: strip the suffix, use `Hero`.
- More than one `BlockType` argument → process only the first; tell the user to run `/add-block` again for each additional block.

## Examples

### Add a HeroBlock to the home page of site-demo

```
/add-block site-demo home Hero
```

Reads `HeroBlock.schema.ts` from the installed package, generates a plausible English hero content object, and inserts a `BlockInstance` (`id: 'hero-1'`, inline `content`) into `HomeComposition.tsx`. Default variant from `HeroBlock.variants.ts`.

### Add a MediaTextBlock to a page

```
/add-block site-demo le-camping MediaText
```

Adds a media+text `BlockInstance` with inline content in the site's language (e.g. French if `<html lang="fr">`). Variant default from `MediaTextBlock.variants.ts`.

### Add a second MediaTextBlock

```
/add-block site-demo le-camping MediaText
```

Detects the existing `media-text-1` instance in the `layout` array; uses `media-text-2` as the new `instanceId`.

### User typed BlockType with suffix

```
/add-block site-demo home ReviewsBlock
```

Strips the `Block` suffix silently: treated as `Reviews` → `ReviewsBlock`.
