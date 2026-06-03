# Plan de actualización post-auditoría — instrucciones para Claude Code

> Este documento describe, paso a paso y en orden de dependencia, todas las actualizaciones que Claude Code debe aplicar al workspace `hwp-platform/` como resultado de la auditoría de arquitectura del 2026-05-21. Cada paso indica qué fichero(s) tocar, qué cambiar, y qué no tocar.
>
> **Idioma:** las instrucciones están en español (conversación humano-IA). Todo artefacto técnico generado DEBE ser en inglés (DEC-001).
>
> **Regla general:** ningún paso crea código ejecutable (no hay `packages/` aún, eso es Phase 0). Todos los cambios son documentación y contratos.

---

## Orden de ejecución

```
Paso 1 — DEC-008: Structural variants for complex blocks
Paso 2 — DEC-009: Remove activeBlocks, add blockDefaults
Paso 3 — DEC-010: BookingBlock in core-ui, BookingProvider in @hwp/booking
Paso 4 — Actualizar block-contract.md (structural variants + shared/ + index.ts)
Paso 5 — Actualizar structure.md (providers/ + index.ts exception)
Paso 6 — Actualizar template-contract.md (minor alignment)
Paso 7 — Actualizar architecture.md (banner + specific sections)
Paso 8 — Actualizar CLAUDE.md (mention new DECs)
Paso 9 — Actualizar scaffold-block skill (add variant resolver awareness)
Paso 10 — Crear scaffold-variant skill stub (catalog entry only, defer implementation)
Paso 11 — Actualizar catalog.md (new skill entries)
Paso 12 — Generar diagramas de arquitectura como ficheros en docs/diagrams/
```

---

## Paso 1 — DEC-008: Structural variants for complex blocks

**Fichero:** `docs/architecture/decisions.md`
**Acción:** Append new DEC-008 at the end, before any closing markers.

**Contenido del DEC (escribir en inglés):**

```
## DEC-008 — Structural variants for complex blocks
Date: 2026-05-21
Status: Accepted
Extends: DEC-003 (Frontend layout), block-contract.md

### Context

The existing block contract (docs/contracts/frontend/block-contract.md) defines variants as CVA-only: styling changes that never alter the data shape or component structure. This works for blocks where variants differ only in CSS (e.g. a HeroBlock with layout="full" vs layout="split").

However, several block families require variants that are structurally different components — different DOM trees, different hooks, different sub-components. Examples:

- GalleryBlock: masonry (layout algorithm + column calculation) vs carousel (swipe handlers, autoplay, dots) vs grid (simple CSS grid) vs lightbox (modal overlay + navigation).
- BookingBlock: inline (embedded form) vs modal (dialog wrapper) vs iframe (third-party embed).
- HeroBlock: video (video player + autoplay + overlay) vs slider (swipe + dots) vs parallax (scroll handler + transform).

Putting all structural logic in one .tsx file with conditional branches leads to unmaintainable components (500+ lines, tangled hooks, impossible to test in isolation).

### Decision

Introduce **structural variants** as an opt-in extension of the block contract. A block family MAY have structural variants when its variants require different implementations (different hooks, sub-components, or DOM trees).

#### Folder layout for a block with structural variants

blocks/{Name}Block/
├── index.ts                     ← variant resolver + re-export
├── {Name}Block.schema.ts        ← shared Zod schema (all variants parse the same content)
├── {Name}Block.types.ts         ← shared types
├── {Name}Block.test.tsx          ← tests covering all variants
├── shared/                      ← sub-components shared across 2+ variants
│   └── {SharedComponent}.tsx
├── {Name}{Variant}/             ← one subfolder per structural variant
│   ├── {Name}{Variant}.tsx
│   └── (optional: hooks, sub-components specific to this variant)
└── ...more variant folders

#### The resolver (index.ts)

Each block with structural variants exports a resolver component from index.ts:

import { {Name}{VariantA} } from './{Name}{VariantA}/{Name}{VariantA}';
import { {Name}{VariantB} } from './{Name}{VariantB}/{Name}{VariantB}';
import type { {Name}BlockProps } from './{Name}Block.types';

export const {name}Variants = {
  variantA: {Name}{VariantA},
  variantB: {Name}{VariantB},
} as const;

export type {Name}VariantKey = keyof typeof {name}Variants;

export function {Name}Block({ content, variant = 'variantA', ...rest }: {Name}BlockProps & { variant?: {Name}VariantKey }) {
  const Component = {name}Variants[variant] ?? {name}Variants.variantA;
  return <Component content={content} {...rest} />;
}

#### Schema sharing rule

All structural variants of a block family share ONE schema ({Name}Block.schema.ts). Variant-specific optional fields are declared as .optional() in the shared schema. A variant ignores fields it doesn't use — it never fails on them because they are optional.

Rationale: Payload stores one content shape per block type. If variants had different schemas, the CMS would need to switch schemas when the editor changes the variant — that complexity is not justified.

#### CVA coexistence

A structural variant MAY also use CVA for fine-grained styling within its implementation. The two systems are orthogonal:
- Structural variant = which component renders (resolver in index.ts).
- CVA variant = how that component styles itself (cva() inside the variant's .tsx).

#### Fallback chain for variant resolution

1. Explicit variant from Payload layout[] → resolver picks that structural variant.
2. blockDefaults in client.config.ts → resolver uses the client's default (DEC-009).
3. Default variant in the resolver → the first variant declared in the map.

#### When NOT to use structural variants

- If the variants only differ in CSS classes → use CVA (the existing contract).
- If there is only one variant → don't create a resolver; use the flat 5-file layout.
- Rule of thumb: if you can't implement the variant by adding a CVA value, you need a structural variant.

#### index.ts exception to structure.md rule

structure.md states "No src/blocks/index.ts, no src/blocks/HeroBlock/index.ts". This DEC creates a controlled exception: a block with structural variants MUST have an index.ts that acts as the variant resolver. This index.ts is NOT a barrel re-export — it contains the resolver function. Consumers still import from @hwp/core-ui root (the public API rule is unchanged).

### Consequences

- docs/contracts/frontend/block-contract.md is updated with a "Structural variants" section (Paso 4).
- docs/contracts/frontend/structure.md is updated with the index.ts exception (Paso 5).
- scaffold-block generates the flat 5-file layout (no change). Blocks start flat and migrate to structural variants when needed.
- A future scaffold-variant skill (Paso 10) will automate adding a structural variant to an existing block.
- blockRegistry.ts gains an optional variants key per entry for Payload schema generation.

### Alternatives considered

- Separate blocks per variant (GalleryMasonryBlock, GalleryCarouselBlock) — rejected. Bloats the registry, duplicates the schema, forces Payload to manage N block types instead of one with a variant selector.
- HOC wrapper per variant — rejected. Obscures the component tree in React DevTools and makes testing harder.
- Plugin/slot pattern — rejected. Over-engineered for the current scale; revisit if block families exceed 10 variants.
```

**No tocar:** ningún otro DEC. No modificar el formato de DECs existentes.

---

## Paso 2 — DEC-009: Remove activeBlocks, add blockDefaults

**Fichero:** `docs/architecture/decisions.md`
**Acción:** Append DEC-009 after DEC-008.

**Contenido del DEC (en inglés):**

```
## DEC-009 — Remove activeBlocks, add blockDefaults to client.config.ts
Date: 2026-05-21
Status: Accepted

### Context

architecture.md shows activeBlocks: ['HeroBlock', 'GalleryBlock', ...] as a flat string array in client.config.ts. This list is:
- Never consumed by any documented contract (BlockRenderer, scaffold-block, compositions).
- Redundant with Payload's layout[] (which already declares which blocks a page uses).
- Redundant with the features system in domain-model.md (which gates pages and blocks).

Meanwhile, blocks like BookingBlock need per-client configuration (which PMS adapter, which default variant) that a string array cannot express.

### Decision

1. Remove activeBlocks from the client.config.ts shape.
2. Add an optional blockDefaults record:

blockDefaults?: {
  [BlockType: string]: {
    defaultVariant?: string;
    [key: string]: unknown;  // block-specific config
  };
};

Example:

blockDefaults: {
  BookingBlock: { defaultVariant: 'inline' },
  GalleryBlock: { defaultVariant: 'masonry' },
},

3. The fallback chain for variant selection is:
   a. Explicit variant in Payload layout[] (per-page, per-block).
   b. blockDefaults[blockType].defaultVariant in client.config.ts (per-client).
   c. Default variant declared in the block's resolver or CVA (per-platform).

4. blockDefaults is populated during client onboarding — either by Claude interpreting the Figma, or by the team's explicit decisions about the client's defaults.

### Consequences

- architecture.md references to activeBlocks are replaced with blockDefaults.
- Compositions can read defaults via useTenant().blockDefaults but may also hardcode variant= for explicit overrides.
- Payload's block type selector is not affected — it still shows all registered blocks.

### Alternatives considered

- Keep activeBlocks alongside blockDefaults — rejected. Two overlapping mechanisms for the same concern.
- No replacement (eliminate without adding blockDefaults) — rejected. The Figma onboarding flow needs a place to declare client-level variant preferences that are not page-specific.
```

---

## Paso 3 — DEC-010: BookingBlock in core-ui, BookingProvider in @hwp/booking

**Fichero:** `docs/architecture/decisions.md`
**Acción:** Append DEC-010 after DEC-009.

**Contenido del DEC (en inglés):**

```
## DEC-010 — BookingBlock in core-ui, BookingProvider in @hwp/booking
Date: 2026-05-21
Status: Accepted

### Context

Two documents place BookingBlock in different locations:
- architecture.md §Booking Engine shows BookingBlock in @hwp/booking/react/.
- block-contract.md and structure.md state all blocks live in @hwp/core-ui/src/blocks/.

This creates ambiguity about where the UI component lives vs where the domain logic lives.

### Decision

1. BookingBlock (the React component family) lives in packages/core-ui/src/blocks/BookingBlock/, like every other block. It has structural variants (BookingInline, BookingModal, BookingIframe per DEC-008).

2. BookingBlock depends on the BookingAdapter interface from @hwp/booking — never on a concrete adapter. It receives the adapter via React context (useBookingAdapter() hook).

3. @hwp/booking exports:
   - BookingAdapter interface (the port).
   - Stock adapters: THR, Masterbooking, Witbooking, Resalys (the adapters).
   - BookingProvider — the React context provider that wraps the app and injects the active adapter.
   - useBookingAdapter() — the hook blocks use to access the adapter.

4. @hwp/booking does NOT export React UI components. Remove the planned @hwp/booking/react/ directory.

5. The app's root layout wires the provider:
   <BookingProvider adapter={config.bookingAdapter}>
     {children}
   </BookingProvider>

6. Custom PMS adapters (non-stock) live in apps/site-{slug}/src/booking/ and implement the BookingAdapter interface.

### Consequences

- architecture.md §Booking Engine is updated to reflect this split.
- The @hwp/booking package is domain + infrastructure only (adapter interface, concrete adapters, provider, hook). No .tsx components.
- BookingBlock in core-ui can be tested without any concrete PMS adapter (mock the adapter via BookingProvider).

### Alternatives considered

- BookingBlock in @hwp/booking/react/ — rejected. Puts UI in a domain package. Violates the single-responsibility of @hwp/booking and the rule that all blocks live in core-ui.
- No provider, pass adapter as prop — rejected. Every composition that uses BookingBlock would need to import and wire the adapter. The provider does it once at the root.
```

---

## Paso 4 — Actualizar block-contract.md

**Fichero:** `docs/contracts/frontend/block-contract.md`
**Acción:** Añadir las siguientes secciones DESPUÉS de la sección "The variants" y ANTES de "The component". No modificar las secciones existentes excepto donde se indica.

**Añadir sección "Structural variants":**

Contenido: el patrón completo de folder layout con structural variants, index.ts como resolver, schema sharing rule, CVA coexistence, shared/ convention. Referenciando DEC-008.

**Añadir sección "The shared/ folder":**

Contenido: components used by 2+ variants of the same block family. Not exported from core-ui index.ts. If needed by a different block family, promote to primitives/.

**Modificar la sección "Registry":**

Añadir el campo opcional `variants` al blockRegistry entry:

```ts
{Name}: {
  component: {Name}Block,
  contentSchema: {Name}BlockContent,
  variants: ['variantA', 'variantB'] as const,  // optional, for Payload schema generation
},
```

---

## Paso 5 — Actualizar structure.md

**Fichero:** `docs/contracts/frontend/structure.md`

**Cambios:**

1. En la sección `packages/core-ui/ layout`, añadir `providers/` entre `renderer/` y `layout/`:

```
│   ├── providers/                         ← React context providers
│   │   ├── TenantProvider.tsx
│   │   ├── SeasonProvider.tsx
│   │   └── index.ts
```

2. En la sección "What NOT to do", añadir:

```
- Don't add an `index.ts` to every folder inside a package — EXCEPT for blocks with structural variants (DEC-008), where `index.ts` is the variant resolver.
```

3. Actualizar el comentario de `renderer/` para incluir `blockRegistry.ts` con el campo `variants`.

---

## Paso 6 — Actualizar template-contract.md

**Fichero:** `docs/contracts/frontend/template-contract.md`
**Acción:** Cambio menor. En la sección "The component", donde dice:

```tsx
{data.gallery && <GalleryBlock content={data.gallery} />}
```

Actualizar a:

```tsx
{data.gallery && <GalleryBlock content={data.gallery} variant={data.galleryVariant} />}
```

Para reflejar que templates pueden pasar la variante que Payload almacena. Añadir una nota: "The variant can come from Payload data, from blockDefaults (DEC-009), or be omitted to use the block's default."

---

## Paso 7 — Actualizar architecture.md

**Fichero:** `docs/architecture/architecture.md`
**Acción:** NO reescribir. Añadir un banner al inicio de las secciones afectadas:

1. En "SISTEMA DE BLOQUES Y FLUJO FIGMA", añadir al inicio:

```
> **Updated by DEC-008, DEC-009, DEC-010 (2026-05-21).** The block variant system now supports structural variants (DEC-008). `activeBlocks` is replaced by `blockDefaults` (DEC-009). `BookingBlock` lives in `@hwp/core-ui`, not `@hwp/booking/react/` (DEC-010). See `docs/architecture/decisions.md` for details.
```

2. En la sección "Booking Engine" (si existe), añadir banner similar referenciando DEC-010.

3. En cualquier sección que mencione `activeBlocks`, añadir: `> Superseded by DEC-009: activeBlocks replaced by blockDefaults.`

---

## Paso 8 — Actualizar CLAUDE.md

**Fichero:** `CLAUDE.md`
**Acción:** En la sección "Lo esencial del proyecto", después de la línea sobre Monorepo, añadir:

```
- Bloques con variantes estructurales (DEC-008): blocks complejos usan subfolder por variante con resolver en index.ts.
- blockDefaults en client.config.ts (DEC-009): preferencias de variante por cliente, reemplaza activeBlocks.
- BookingBlock en core-ui, BookingProvider en @hwp/booking (DEC-010).
```

---

## Paso 9 — Actualizar scaffold-block skill

**Fichero:** `.claude/skills/scaffold-block/SKILL.md`
**Acción:** Añadir una nota en la sección "Final summary" después del "Next steps":

```
If this block will have structural variants (DEC-008), the next step after
filling in the flat structure is to create variant subfolders and an index.ts
resolver. See docs/contracts/frontend/block-contract.md §Structural variants.
A future /scaffold-variant skill will automate this step.
```

**NO cambiar los templates** — los templates generan la estructura plana correcta. La migración a structural variants es un paso posterior manual.

---

## Paso 10 — Crear scaffold-variant skill stub

**Fichero:** `.claude/skills/scaffold-variant/SKILL.md`
**Acción:** Crear el fichero con un stub mínimo:

```
---
name: scaffold-variant
description: Add a structural variant to an existing @hwp/core-ui block. Creates the variant subfolder, component file, and updates the block's index.ts resolver. Use after /scaffold-block when a block needs structural variants (DEC-008).
argument-hint: <BlockName> <VariantName>
allowed-tools: Read Write Glob Grep Bash(test *) Bash(ls *)
---

# Scaffold Variant

> **Status: stub.** This skill will be implemented when 3+ blocks have structural variants. For now, create structural variants manually following docs/contracts/frontend/block-contract.md §Structural variants.

## Planned behavior

/scaffold-variant GalleryBlock Masonry

Creates:
  blocks/GalleryBlock/GalleryMasonry/GalleryMasonry.tsx

Updates:
  blocks/GalleryBlock/index.ts (adds import + registry entry)

Does NOT touch blockRegistry.ts (the block is already registered).
```

---

## Paso 11 — Actualizar catalog.md

**Fichero:** `docs/catalog.md`
**Acción:** Añadir row en la tabla Skills:

```
| scaffold-variant | stub | — | `.claude/skills/scaffold-variant/` | Add a structural variant subfolder to an existing block (DEC-008). Stub — manual process until 3+ blocks need it. |
```

---

## Paso 12 — Generar diagramas de arquitectura

**Fichero:** `docs/diagrams/` (crear el directorio)
**Acción:** Crear ficheros Mermaid (`.mmd`) o Markdown con bloques mermaid para los siguientes diagramas:

### Diagrama 1 — `monorepo-overview.mmd`
Estructura de alto nivel del monorepo: packages/ vs apps/ vs docs/ vs docs/architecture/.
Muestra qué importa de qué (core-ui ← apps, booking ← core-ui, etc.).

### Diagrama 2 — `core-ui-internal.mmd`
Interior de @hwp/core-ui: primitives/ → blocks/ → templates/, con renderer/ y providers/.
Muestra las reglas de dependencia entre capas.

### Diagrama 3 — `block-variant-resolution.mmd`
Flujo de resolución de una variante: Payload layout[] → BlockRenderer → block index.ts resolver → structural variant component.
Incluye el fallback chain (explicit → blockDefaults → block default).

### Diagrama 4 — `page-tetris.mmd`
Cómo una página se compone como tetris de bloques: Payload data → PageBuilder → BlockRenderer itera layout[] → cada bloque se resuelve a su variante → página renderizada.

### Diagrama 5 — `figma-to-production.mmd`
Flujo de onboarding: Figma → /import-figma → classify → client.config.ts con blockDefaults → compositions → deploy.

### Diagrama 6 — `booking-architecture.mmd`
Separación BookingBlock (core-ui) vs BookingAdapter (booking): muestra el provider pattern y cómo la app wires el adapter.

**Formato recomendado:** Mermaid dentro de ficheros `.md` con bloques ```mermaid. Razón: renderizable en GitHub, en VS Code, y consumible por Claude Code como contexto sin herramientas externas.

---

## Verificación post-ejecución

Después de todos los pasos, Claude Code debe ejecutar esta checklist:

```
□ decisions.md tiene DEC-008, DEC-009, DEC-010 con formato consistente con DECs anteriores
□ block-contract.md tiene secciones "Structural variants" y "The shared/ folder"
□ structure.md tiene providers/ en el layout de core-ui
□ structure.md tiene la excepción de index.ts documentada
□ template-contract.md refleja que variant puede venir de Payload o blockDefaults
□ architecture.md tiene banners de superseded en las secciones afectadas
□ CLAUDE.md menciona DEC-008, DEC-009, DEC-010
□ scaffold-block SKILL.md menciona la ruta a structural variants
□ scaffold-variant SKILL.md existe como stub
□ catalog.md tiene entry para scaffold-variant
□ docs/diagrams/ contiene los 6 diagramas
□ Ningún fichero existente ha sido borrado o reescrito entero
□ Todo artefacto técnico está en inglés (DEC-001)
□ Grep "activeBlocks" en architecture.md → todos los hits tienen banner de superseded
□ Grep "booking/react" en architecture.md → todos los hits tienen banner de superseded
```