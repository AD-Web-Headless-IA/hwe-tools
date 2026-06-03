---
name: scaffold-variant
description: Add a structural variant to an existing @hwp/core-ui block. Creates the variant subfolder and component, and updates the block's index.ts resolver. Use after /scaffold-block when a block needs structural variants per DEC-008.
argument-hint: <BlockName> <VariantName>
allowed-tools: Read Write Glob Grep Bash(test *) Bash(ls *) Bash(mkdir *)
---

# Scaffold Variant

> **Status: stub.** This skill is documented but not yet implemented. See "Implementation triggers" below for the criteria that gate implementation. Until then, create structural variants manually following [`docs/frontend/block-contract.md`](../../../docs/contracts/frontend/block-contract.md) §Structural variants ([DEC-008](../../../docs/architecture/decisions.md#dec-008--structural-variants-for-complex-blocks)).

## Planned behavior

```
/scaffold-variant GalleryBlock Masonry
```

Creates:

```
packages/core-ui/src/base-blocks/GalleryBlock/GalleryMasonry/
├── GalleryMasonry.tsx
└── (placeholder for variant-specific hooks)
```

Updates:

```
packages/core-ui/src/base-blocks/GalleryBlock/index.ts
  - imports GalleryMasonry
  - adds 'masonry' to the galleryVariants record
```

Does NOT touch:

- `packages/core-ui/src/renderer/baseBlockRegistry.ts` — the block is already registered; only its internal resolver changes.
- `packages/core-ui/src/index.ts` — the public API of the package is unchanged; consumers still import `GalleryBlock` from the package root.
- `GalleryBlock.schema.ts` / `GalleryBlock.types.ts` / `GalleryBlock.test.tsx` — these are shared across variants. Variant-specific schema fields are added by hand as `.optional()` on the shared schema; variant-specific tests are added to the shared test file.

## Constraints (planned)

- Block must already exist at `packages/core-ui/src/base-blocks/{BlockName}/` and follow the structural-variant layout (i.e. already have an `index.ts` resolver). If the block is still in flat 5-file layout, the skill prompts the user to migrate first.
- Variant name is PascalCase, no `Block` suffix (e.g. `Masonry`, `Carousel`, `BeforeAfter`). The skill rejects `MasonryBlock` or `gallery-masonry`.
- Never overwrite an existing variant subfolder.
- All generated files are in English (technical artifacts, DEC-001).

## Refusal cases (planned)

- Refuse if the block does not exist.
- Refuse if the block does not have an `index.ts` resolver (still in flat layout — point user to manual migration).
- Refuse if the variant subfolder already exists.
- Refuse variant names that do not match `^[A-Z][A-Za-z0-9]+$` (PascalCase, no `Block` suffix).

## Implementation triggers

Implement this skill when:

1. At least 3 blocks in `@hwp/core-ui` have structural variants, AND
2. The manual variant-addition workflow has been performed at least twice and shown to be stable, AND
3. The variant resolver pattern in `block-contract.md` is settled (no pending revisions).
