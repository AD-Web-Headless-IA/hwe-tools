# `@hwe/core-ui` internal structure

> Internal layout of the `@hwe/core-ui` package (in `hwe-core/packages/core-ui/`). Shows the layers (primitives → base-blocks → renderer), the adapter layer, and the cross-cutting concerns (providers, theme, composition-rules).
>
> Companion to [`docs/contracts/frontend/structure.md`](../contracts/frontend/structure.md) and [`docs/contracts/frontend/block-contract.md`](../contracts/frontend/block-contract.md).

```mermaid
flowchart TB
  subgraph coreui["@hwe/core-ui/src/"]
    direction TB

    subgraph public["index.ts — public API (root export)"]
      api["renderer · providers · layout · primitives · theme\n(NOT base-blocks — use ./base-blocks subpath)"]
    end

    subgraph subpaths["npm subpath exports"]
      sp_blocks["./base-blocks  →  src/base-blocks/index.ts"]
      sp_schemas["./schemas  →  src/schemas/index.ts"]
      sp_theme["./theme  →  src/theme/index.ts"]
    end

    subgraph theme["theme/"]
      tokens_contract["tokens.contract.ts\n(validates per-client tokens.json)"]
      css_vars["cssVariables.ts\n(emits CSS custom properties)"]
    end

    subgraph providers["providers/  (cross-cutting context)"]
      tenant["TenantProvider — useTenant()"]
      season["SeasonProvider — useActiveSeason()"]
    end

    subgraph adapters["adapters/  (interfaces + stock implementations)"]
      booking_adapter["booking/\nBookingAdapter interface\nBookingProvider · useBookingAdapter()\nstock: THR · Masterbooking · Witbooking"]
      map_adapter["map/  (future: MapAdapter)"]
      reviews_adapter["reviews/  (future: ReviewsAdapter)"]
    end

    subgraph primitives["primitives/  (atomic — shadcn/Radix)"]
      btn["Button"]
      input["Input"]
      dialog["Dialog"]
    end

    subgraph schemas["schemas/  (shared Zod schemas — subpath ./schemas)"]
      s_hero["HeroBlock.schema.ts"]
      s_booking["BookingBlock.schema.ts"]
      s_etc["..."]
    end

    subgraph base_blocks["base-blocks/  (reference implementations — subpath ./base-blocks)"]
      hero["HeroBlock/"]
      gallery["GalleryBlock/ + structural variants"]
      booking["BookingBlock/ + structural variants"]
      media["MediaTextBlock/"]
      etc_block["..."]
    end

    subgraph renderer["renderer/"]
      registry["baseBlockRegistry.ts\n(platform blocks only)"]
      blockrenderer["BlockRenderer.tsx\n(merges base + client registry)"]
    end

    subgraph layout_layer["layout/"]
      shell["SiteShell"]
      navbar["Navbar/"]
      footer["Footer/"]
    end

    subgraph composition_rules["composition-rules/"]
      rules["rules.schema.ts + validator.ts\n(block ordering + slot compatibility)"]
    end
  end

  base_blocks --> primitives
  base_blocks --> schemas
  base_blocks -.uses adapter via hook.-> adapters
  blockrenderer --> registry
  registry --> base_blocks
  base_blocks -.may use.-> providers
  layout_layer --> primitives
  api --> blockrenderer
  api --> providers
  api --> layout_layer
  api --> primitives
  api --> theme
  api --> adapters
  sp_blocks --> base_blocks
  sp_schemas --> schemas
  sp_theme --> theme
```

## Rules encoded in the diagram

- **Layering is one-way:** `base-blocks → primitives → nothing`. A primitive never imports a block. A block never imports a layout. Inversions break the abstraction.
- **`base-blocks/` renamed from `blocks/`** (DEC-015). Never `blocks/` again. Client blocks live in `src/blocks/` of the client repo, never here.
- **`schemas/` is separate from `base-blocks/`** (DEC-015). Payload and client code that need only the Zod schema import `@hwe/core-ui/schemas` — they don't pull in the React component.
- **`adapters/booking/`** contains `BookingAdapter` interface, `BookingProvider`, `useBookingAdapter()`, and stock PMS adapters. No UI components here. This was previously a separate `@hwe/booking` package — merged into `@hwe/core-ui` per DEC-017.
- **`BlockRenderer` receives two registries:** `baseBlockRegistry` (platform) + an optional `blocks` prop from the client. Client blocks override platform blocks of the same key. See [`block-resolution-chain.md`](./block-resolution-chain.md).
- **`theme/`** holds the contract (`tokens.contract.ts`) and CSS variable helpers. Token values live per-client in `src/theme/tokens.json` and flow via `@theme {}` blocks in `globals.css` (Tailwind v4 CSS-first).
- **Only `index.ts` (root) and subpath `index.ts` files re-export.** No internal barrels inside folders. Exception: a block with structural variants has an `index.ts` that acts as the variant resolver, not a barrel ([DEC-008](../architecture/decisions.md#dec-008--structural-variants-for-complex-blocks)).
