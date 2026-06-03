# Block resolution chain — base registry + client overrides

> How `BlockRenderer` resolves which component to render for a given block type: it merges the platform's `baseBlockRegistry` with the client's own registry, giving client blocks priority. Materialises [DEC-015](../architecture/decisions.md#dec-015--client-owned-blocks-with-shared-schemas-slot-based-composition-and-npm-subpath-exports) (client-owned blocks) and [DEC-017](../architecture/DEC-017-Repo-Split.md) (independent client repos).
>
> For how the winning component resolves its **variant** at render time, see [`block-variant-resolution.md`](./block-variant-resolution.md).

```mermaid
flowchart TB
  subgraph hwe_core["hwe-core/ (@hwe/core-ui npm package)"]
    direction TB

    subgraph base_blocks["src/base-blocks/  (reference implementations)"]
      direction LR
      bb_hero["HeroBlock/\nHeroBlock.tsx + slots"]
      bb_booking["BookingBlock/\nindex.ts (resolver)\nBookingInline/ · BookingModal/"]
      bb_media["MediaTextBlock/"]
      bb_gallery["GalleryBlock/\nindex.ts (resolver)\nGalleryMasonry/ · GalleryCarousel/"]
      bb_etc["..."]
    end

    base_registry["src/renderer/baseBlockRegistry.ts\n{\n  HeroBlock:    { component, contentSchema },\n  BookingBlock: { component, contentSchema, variants },\n  MediaText:    { component, contentSchema },\n  GalleryBlock: { component, contentSchema, variants },\n  ...\n}"]

    blockrenderer["src/renderer/BlockRenderer.tsx\nconst merged = { ...baseBlockRegistry, ...clientBlocks }\n(client overrides base for same key)"]
  end

  subgraph client_repo["site-{slug}/  (client repo — Level 1 / 2 / 3)"]
    direction TB

    subgraph client_blocks_dir["src/blocks/"]
      direction LR
      l1["HeroBlock/HeroBlock.tsx\n← Level 1: re-export\nexport { HeroBlock } from '@hwe/core-ui/base-blocks'"]
      l2["MediaTextBlock/MediaTextBlock.tsx\n← Level 2: slots\n<BaseMedia ... heading={myHeading} />"]
      l3["FAQBlock/FAQBlock.tsx\n← Level 3: full custom\n(no base-block yet)"]
    end

    client_registry["src/blocks/registry.ts\n{\n  HeroBlock:     HeroBlock,    // Level 1 re-export\n  MediaTextBlock: MediaTextBlock, // Level 2 slot\n  FAQBlock:      FAQBlock,     // Level 3 custom\n}"]
  end

  subgraph resolution["Resolution at render time"]
    direction LR
    check["merged[block.type] ?"]
    use_client["Use CLIENT implementation\n(shadows base for same key)"]
    use_base["Use BASE implementation\n(from baseBlockRegistry)"]
    warn["DEV WARNING:\nblock type not registered"]

    check -- "found in clientBlocks" --> use_client
    check -- "not in clientBlocks\nbut found in base" --> use_base
    check -- "not found in either" --> warn
  end

  base_blocks --> base_registry
  client_blocks_dir --> client_registry
  base_registry --> blockrenderer
  client_registry -- "blocks prop" --> blockrenderer
  blockrenderer --> check
```

## The three usage levels

| Level | Where it lives | Pattern | Typical frequency |
|---|---|---|---|
| **Level 1 — re-export** | `src/blocks/{Name}/{Name}.tsx` | `export { HeroBlock } from '@hwe/core-ui/base-blocks'` | ~70% of blocks |
| **Level 2 — slots** | `src/blocks/{Name}/{Name}.tsx` | `<BaseName {...props} SlotName={MyComp} />` | ~20% |
| **Level 3 — full custom** | `src/blocks/{Name}/{Name}.tsx` | Own JSX, imports schema types only from `@hwe/core-ui/schemas` | ~10% |

## Key invariants

- **Client registry always wins** for keys it declares. A Level 1 re-export passes through transparently; a Level 3 full custom completely replaces the base block for that client.
- **Base-blocks stay in `hwe-core/`**. No per-client logic ever enters `@hwe/core-ui/src/base-blocks/`. Client-specific implementations live in `site-{slug}/src/blocks/` ([DEC-015](../architecture/decisions.md#dec-015--client-owned-blocks-with-shared-schemas-slot-based-composition-and-npm-subpath-exports), [DEC-017](../architecture/DEC-017-Repo-Split.md)).
- **Schemas are shared.** Even Level 3 blocks import their content type from `@hwe/core-ui/schemas` — content contracts are stable across the platform. Only the rendering is per-client.
- **BlockRenderer receives the final merged map.** The merge is `{ ...baseBlockRegistry, ...clientBlocks }` — one line, no magic. The renderer doesn't know or care which level a block is.
