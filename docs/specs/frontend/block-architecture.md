# Block Architecture — 4-Layer Extensible Block System

> The definitive spec for how blocks are structured, extended, and audited in HWP.
> Companion to [`docs/contracts/frontend/block-contract.md`](../../contracts/frontend/block-contract.md) (the what — mandatory files and exports) and to [`docs/skills/frontend/block-creation.md`](../../skills/frontend/block-creation.md) (the walkthrough).
>
> **This spec defines the how:** 4 architectural layers, extensibility patterns, adapter contracts, SEO/security gates, and the Payload derivation strategy.

> **Extended by [DEC-015](../../architecture/decisions.md#dec-015--client-owned-blocks-with-shared-schemas-slot-based-composition-and-npm-subpath-exports) (2026-06-01).** Schemas are now shared via `@hwp/core-ui/schemas` (subpath export). Reference implementations live in `packages/core-ui/src/base-blocks/` and are consumed via `@hwp/core-ui/base-blocks`. Client sites own their block implementations in `src/blocks/` (three usage levels). See §2 for updated file structures, §2.5 for the slot pattern, §9 for the updated registry, and §13 for composition rules.

---

## §1 The 4 Layers of a Block

Every block is composed of up to 4 layers. Layer 1 is always present. Layers 2–4 are opt-in based on block complexity.

```
┌─────────────────────────────────────────────────────────────────┐
│  Layer 4 — Adapter       (when block connects to external service)│
│  Layer 3 — Config Schema (when block has behavioral options)      │
│  Layer 2 — Variants      (CVA style or structural component)      │
│  Layer 1 — Content Schema (always — defines what the editor fills)│
└─────────────────────────────────────────────────────────────────┘
```

### Layer 1 — Content Schema (always)

The content schema defines what the editor (or the AI content pipeline) writes into Payload for this block. It is the single source of truth for the block's data shape.

**Rules:**

- Defined as a Zod schema in `{Name}Block.schema.ts`.
- The TypeScript type is always `z.infer<typeof schema>` — never written by hand.
- Never empty fields: if a field is optional, use `.optional()`. Never `""` as a default for a conceptually absent field.
- Image fields always require `alt`. The schema enforces this so the editor cannot publish an accessibility violation.
- Extensible via `.extend()` when a client needs additional fields on top of the platform default.
- Supports repeaters: `z.array(ItemSchema)` for lists — `images[]`, `questions[]`, `amenities[]`, `rates[]`. Use `.min(1)` when at least one item is required.
- Compatible with Payload: the Zod schema is the source of truth; Payload field configs are derived from it (see §8).

```ts
// packages/core-ui/src/schemas/{Name}Block.schema.ts  (DEC-015: shared, no longer co-located with block)
import { z } from 'zod';

const ImageSchema = z.object({
  src:        z.string().url(),
  alt:        z.string(),
  decorative: z.boolean().optional(),
});

export const {Name}BlockContent = z.object({
  title:    z.string().min(1),
  subtitle: z.string().optional(),
  image:    ImageSchema,
  items:    z.array(z.object({ label: z.string(), value: z.string() })).min(1),
});

export type {Name}BlockContent = z.infer<typeof {Name}BlockContent>;
```

**Client extension example:**
```ts
// site-camping-x/src/schemas/{Name}BlockContent.extended.ts
import { {Name}BlockContent } from '@hwp/core-ui/schemas';  // DEC-015: subpath import
export const ExtendedContent = {Name}BlockContent.extend({
  badge: z.string().optional(),
});
```

---

### Layer 2 — Variants (by complexity)

Variants define how the same content can be rendered differently. Three variant levels exist, ordered by complexity:

**Level A — CVA (styling only)**

CSS changes only. One `.tsx` file; different Tailwind classes via `cva()`.

- Use when variants only differ in colors, spacing, alignment, or layout proportions.
- Example: `MediaTextBlock` with `imageLeft` / `imageRight` variants.

```ts
// {Name}Block.variants.ts
export const {name}BlockVariants = cva('base-classes', {
  variants: { layout: { imageLeft: '...', imageRight: '...' } },
  defaultVariants: { layout: 'imageLeft' },
});
```

**Level B — Structural (different component, different DOM)**

A different React component renders for each variant. The resolver in `index.ts` maps variant keys to components (DEC-008).

- Use when variants require different React hooks, different DOM trees, or different sub-components.
- Example: `BookingBlock` with `inline` / `sticky` variants; `GalleryBlock` with `grid` / `masonry` / `carousel` / `lightbox` variants.
- Each variant MAY also have its own CVA recipe for internal styling — the two levels are orthogonal.

**Level C — Functional (different content fields per variant)**

Content shape differs meaningfully between variants. Implemented as a structural variant where optional fields in the shared schema are populated or ignored depending on variant.

- Use when different variants need different editor fields in Payload.
- Example: `GalleryBlock` `links` variant needs a `links[]` repeater field; `grid` variant ignores it.
- Schema rule: all fields from all variants live in the shared schema as `.optional()`. Payload shows fields dynamically based on the active variant.

**Each block instance is independent.** The same block type appearing twice on the same page can use different variants. Variant is not global — it is per-instance.

---

### Layer 3 — Config Schema (when behavioral options exist)

Config is separated from content. Content is *what the editor fills*; config is *how the block behaves*.

**When to add a config schema:**
- The block has runtime behavioral options (autoplay, lightbox, number of columns, PMS connection).
- The behavior varies per client or per page instance.
- A purely visual block with no behavioral options does not need a config layer.

**Precedence chain (from most to least specific):**
1. Per-instance config in Payload `layout[]` (editor sets it per page block)
2. Per-client default in `blockDefaults` in `client.config.ts` (DEC-009)
3. Platform default defined in the schema

```ts
// {Name}Block.config.schema.ts
import { z } from 'zod';

export const {Name}BlockConfig = z.object({
  lightbox:  z.boolean().default(false),
  autoplay:  z.boolean().default(false),
  columns:   z.union([z.literal(2), z.literal(3), z.literal(4)]).default(3),
});

export type {Name}BlockConfig = z.infer<typeof {Name}BlockConfig>;
```

**BookingBlock example:**
```ts
export const BookingBlockConfig = z.object({
  pms:        z.enum(['thr', 'masterbooking', 'witbooking']),
  propertyId: z.string().min(1),
  features:   z.object({
    hasOffers:   z.boolean().default(false),
    hasCalendar: z.boolean().default(true),
  }),
});
```

---

### Layer 4 — Adapter (when block connects to an external service)

An adapter abstracts the connection to an external service. The block does not know whether the implementation underneath uses REST, GraphQL, a widget iframe, WebServices, or a local data source.

**When to add an adapter:**
- The block calls a PMS, a payment provider, a CRM, a map service, or any external API.
- The same block must work with multiple providers (e.g. `BookingBlock` must work with THR, Masterbooking, and Witbooking).
- A block that only renders static content from its content schema does NOT need an adapter.

**Provider pattern:**
- A React context wraps the app at the layout level.
- Blocks consume the adapter via `use{Domain}Adapter()` hook — they never import a concrete adapter.
- The concrete adapter is injected at the app level (`apps/site-{slug}/`) based on `client.config.ts`.

**Known adapter domains:**

| Domain | Block(s) | Providers |
|---|---|---|
| `booking` | `BookingBlock` | THR, Masterbooking, Witbooking |
| `form` | `ContactFormBlock`, `NewsletterBlock` | email, CRM webhook, SendGrid |
| `map` | `MapBlock` | Google Maps, OSM, Mapbox |
| `reviews` | `ReviewsBlock` | Google, TripAdvisor, manual/Payload |
| `email` | `NewsletterBlock` | Mailchimp, SendGrid |

See §4 for the adapter creation process and file structure.

---

## §2 File Structure by Layer

> **DEC-015 (2026-06-01):** Schemas live in `packages/core-ui/src/schemas/`, types in `packages/core-ui/src/types/`. Block implementations (`.tsx`, `.variants.ts`, `.slots.ts`, `.test.tsx`) live in `packages/core-ui/src/base-blocks/` for platform reference blocks. Client sites place their own implementations in `site-{slug}/src/blocks/`. See §2.5 for the slot pattern and §13 for the three usage levels.

### Simple block (Layer 1 + CVA variants)

```
packages/core-ui/src/schemas/
└── {Name}Block.schema.ts        ← content schema (Layer 1) — shared via @hwp/core-ui/schemas

packages/core-ui/src/types/
└── {Name}Block.types.ts         ← types derived from schema

packages/core-ui/src/base-blocks/{Name}Block/
├── {Name}Block.tsx              ← reference component
├── {Name}Block.slots.ts         ← slot type definitions (optional, see §2.5)
├── {Name}Block.variants.ts      ← CVA recipe (Layer 2-A)
└── {Name}Block.test.tsx         ← reference tests
```

### Block with config (Layer 1 + Layer 3)

```
packages/core-ui/src/schemas/
├── {Name}Block.schema.ts
└── {Name}Block.config.schema.ts ← behavioral config (Layer 3)

packages/core-ui/src/types/
└── {Name}Block.types.ts

packages/core-ui/src/base-blocks/{Name}Block/
├── {Name}Block.tsx
├── {Name}Block.slots.ts
├── {Name}Block.variants.ts
└── {Name}Block.test.tsx
```

### Block with structural variants (Layer 2-B or 2-C)

```
packages/core-ui/src/schemas/
├── {Name}Block.schema.ts        ← shared content schema
└── {Name}Block.config.schema.ts ← shared config schema (if applicable)

packages/core-ui/src/types/
└── {Name}Block.types.ts

packages/core-ui/src/base-blocks/{Name}Block/
├── index.ts                     ← variant resolver
├── {Name}Block.slots.ts         ← slot type definitions
├── {Name}Block.test.tsx         ← covers all variants
├── shared/                      ← sub-components used by 2+ variants
│   └── {SharedComponent}.tsx
├── {Name}{VariantA}/
│   └── {Name}{VariantA}.tsx
└── {Name}{VariantB}/
    └── {Name}{VariantB}.tsx
```

### Adapter package (`@hwp/{domain}`)

```
packages/{domain}/src/
├── {domain}-adapter.interface.ts   ← the TypeScript contract
├── {domain}-config.schema.ts       ← base config Zod schema
├── {domain}-provider.tsx           ← React context + use{Domain}Adapter() hook
└── adapters/
    └── {name}/
        ├── {name}-adapter.ts       ← implements the interface
        ├── {name}-config.schema.ts ← extends base config for this provider
        └── {name}-docs.md          ← API/service docs for Claude
```

---

## §2.5 Slot Pattern (DEC-015)

Base-blocks define optional render slots for visual customization without requiring clients to rewrite the entire component. A slot is a typed function that receives data and returns JSX.

**Slot type definitions file:**

```ts
// packages/core-ui/src/base-blocks/HeroBlock/HeroBlock.slots.ts
import type { ImageData, CtaData } from '../../types/HeroBlock.types';

export type HeroBlockSlots = {
  media?:   (image: ImageData) => React.ReactNode;
  heading?: (title: string, subtitle?: string) => React.ReactNode;
  cta?:     (cta: CtaData) => React.ReactNode;
};
```

**Base-block consuming slots:**

```tsx
// packages/core-ui/src/base-blocks/HeroBlock/HeroBlock.tsx
export function HeroBlock({ content, slots }: HeroBlockProps) {
  return (
    <section aria-labelledby="hero-heading">
      {slots?.media
        ? slots.media(content.image)
        : <DefaultMedia image={content.image} />}
      {slots?.heading
        ? slots.heading(content.title, content.subtitle)
        : <DefaultHeading title={content.title} subtitle={content.subtitle} />}
      {slots?.cta && content.cta
        ? slots.cta(content.cta)
        : content.cta && <DefaultCta cta={content.cta} />}
    </section>
  );
}
```

**Three usage levels in a client site (`site-{slug}/src/blocks/`):**

```tsx
// Level 1 — Re-export (tokens do all the work, ~70% of cases)
export { HeroBlock } from '@hwp/core-ui/base-blocks';

// Level 2 — Slots (customize specific visual pieces, ~20% of cases)
import { HeroBlock as BaseHero } from '@hwp/core-ui/base-blocks';
export function HeroBlock({ content }) {
  return <BaseHero content={content} slots={{ heading: myCustomHeading }} />;
}

// Level 3 — Full custom (ignore base-block, use only schema, ~10% of cases)
import type { HeroBlockContent } from '@hwp/core-ui/schemas';
export function HeroBlock({ content }: { content: HeroBlockContent }) {
  return <section>{ /* completely custom JSX */ }</section>;
}
```

**Rules:**
- Slots are optional per block. Simple blocks (e.g. `RichTextBlock`, `BannerBlock`) may have zero slots.
- The planner decides during `/propose` whether a block needs slots.
- A slot-based block must still pass all promotion gates (STD-AGENT-VISUAL, STD-AGENT-SEO, STD-AGENT-ARCHITECTURE). The slot pattern is a valid architectural implementation — the reviewer verifies that the base-block's defaults provide accessible, SEO-sound markup and that each slot preserves the semantic contract.

---

## §3 Blocks in Pages

- **No block is mandatory on any page** — each composition decides which blocks to include.
- **The same block type can appear multiple times** on the same page, each instance with its own variant, content, and config.
- **Each instance is fully independent** — its own variant, its own content object, its own config.
- In Payload CMS: the page has a `blocks` repeater field. The editor adds block instances, selects the variant, fills the content, sets config options, and reorders freely.

---

## §4 Adding a New Adapter

1. Create `packages/{domain}/src/adapters/{name}/`.
2. Create `{name}-adapter.ts` implementing `{Domain}AdapterInterface`.
3. Create `{name}-config.schema.ts` that extends the domain's base config schema.
4. Create `{name}-docs.md` with:
   - Service name, base URL, authentication method.
   - Endpoint list with request/response shapes (as Zod schemas).
   - Rate limits, error codes, quirks.
5. Register the adapter in `{domain}-provider.tsx` so the context can select it based on config.
6. **Tests:** mock the adapter in block tests — never call the real service in unit/integration tests.

---

## §5 Testing by Layer (TDD-first)

Write tests before implementation. Each layer has its own test category.

### Layer 1 — Content schema tests

```ts
it('parses minimal required content', () => {
  expect(() => {Name}BlockContent.parse(minimal)).not.toThrow();
});
it('parses with optional fields present', () => {
  expect(() => {Name}BlockContent.parse(full)).not.toThrow();
});
it('fails when required field is missing', () => {
  expect(() => {Name}BlockContent.parse({})).toThrow();
});
it('fails when repeater has 0 items (if min(1))', () => {
  expect(() => {Name}BlockContent.parse({ ...minimal, items: [] })).toThrow();
});
```

### Layer 3 — Config schema tests

Same pattern as Layer 1: required fields, optional fields, defaults, invalid values.

### Component tests (Layer 2)

```ts
it('renders with minimal content', () => { /* ... */ });
it('renders each CVA variant without error', () => { /* one render per variant */ });
it('renders each structural variant without error', () => { /* one render per variant */ });
it('applies config options correctly', () => { /* test lightbox: true shows overlay, etc. */ });
it('passes axe accessibility audit', async () => { /* ... */ });
```

### Layer 4 — Adapter tests

```ts
it('calls the adapter method with correct arguments', () => { /* mock adapter, verify call */ });
it('renders error state when adapter throws', () => { /* mock failure path */ });
it('does not call the real service in tests', () => { /* assert mock was used */ });
```

---

## §6 SEO/GEO Mapping by Block

Every block that renders public content must have a documented JSON-LD mapping. The `/seo-audit` is a mandatory gate after creating a new block (see §10 for promotion gates).

| Block | JSON-LD Schema | Key fields |
|---|---|---|
| `HeroBlock` | `LodgingBusiness` (via layout.tsx) | Inherit from page schema |
| `AccommodationGridBlock` | `ItemList` → `LodgingReservation` | `itemListElement[]`, `name`, `description`, `offers` |
| `ReviewsBlock` | `AggregateRating` + `Review[]` | `ratingValue`, `reviewCount`, `reviewBody`, `author` |
| `FAQBlock` | `FAQPage` | `mainEntity[].name`, `mainEntity[].acceptedAnswer.text` |
| `RatesBlock` | `Offer[]` | `name`, `price`, `priceCurrency`, `validFrom`, `validThrough` |
| `GalleryBlock` | `ImageGallery` | `image[]` with `url`, `name`, `description` |
| `MapBlock` | `GeoCoordinates` (nested in `LodgingBusiness`) | `latitude`, `longitude` (4 decimal places) |
| `AmenitiesBlock` | `amenityFeature[]` (nested in `LodgingBusiness`) | `LocationFeatureSpecification.name`, `.value` |
| `EventsBlock` | `Event` | `name`, `startDate`, `endDate`, `location`, `offers` |
| `ContactBlock` | `ContactPoint` (nested) | `telephone`, `email`, `contactType` |
| `BookingBlock` | `LodgingReservation` potential | Signals booking intent — no direct JSON-LD needed |

**Rules:**
- Semantic HTML per `docs/specs/seo/semantic-html.md` — see per-block requirements table.
- Images always via `<Image>` from `next/image` with descriptive `alt` text in the site's language.
- Hero / above-the-fold images: `priority` prop (triggers preload). All others: `loading="lazy"` with explicit `width` and `height`.
- Block titles use `<h2>` (never `<h1>` — the page owns the H1). Cards use `<h3>`.
- `/seo-audit` is a mandatory gate before a block can be promoted to `beta`.

---

## §7 Security by Block

| Block characteristic | Security requirement |
|---|---|
| Has user inputs (forms, date pickers, search) | Zod validation server-side at Route Handler boundary; XSS prevention via sanitization |
| Connects to an adapter (PMS, CRM, payment) | Credentials in Vercel env vars only; never in client bundle; rate limiting |
| Renders rich text from Payload CMS | Sanitize with `DOMPurify` before `dangerouslySetInnerHTML` |
| Has a form submission | CSRF protection; spam prevention (honeypot or rate limit) |
| Collects personal data | RGPD legal basis documented; data inventory entry; consent required |

**Blanket rules:**
- No API keys, credentials, or tokens in `packages/core-ui/` or in any client-side file.
- Claude API and PMS credentials live in Vercel env vars, consumed by server-side Route Handlers only.
- `/security-audit` is a mandatory gate for any block with user inputs or external service adapters.

---

## §8 Zod → Payload Derivation

The Zod schema is the **source of truth**. Payload field configuration is derived from the schema — not the reverse. When a new field is added to the Zod schema, the corresponding Payload field must be updated to match.

**Field type mapping:**

| Zod type | Payload field type |
|---|---|
| `z.string()` | `text` |
| `z.string().url()` | `text` (with URL validation) |
| `z.number()` | `number` |
| `z.boolean()` | `checkbox` |
| `z.enum(['a', 'b'])` | `select` with options `['a', 'b']` |
| `z.object({...})` | `group` |
| `z.array(ItemSchema)` | `array` or `blocks` (repeater) |
| `ImageSchema` (with `src`, `alt`) | `upload` (Payload media collection) |
| `z.record(z.string(), z.string())` | `i18n` / `blocks` per locale |
| `.optional()` | `required: false` |
| `.min(1)` on string | `minLength: 1` or `required: true` |
| `.min(1)` on array | `minRows: 1` |

**Implementation note:** the derivation layer is a `cms-specialist` concern and will be implemented in Phase 1 when Payload CMS is integrated. During the current phase, the Zod schema drives TypeScript types and mock data only.

---

## §9 baseBlockRegistry Extended

> **DEC-015 (2026-06-01):** `blockRegistry.ts` is renamed to `baseBlockRegistry.ts`. `BlockRenderer` now accepts an optional `blocks` prop (a client block map) that overrides the base registry. The layout wires the client registry via `<BlockRenderer layout={layout} blocks={clientBlocks} />`. See the updated `BlockRendererProps` type below.

**BlockRenderer props (updated):**

```tsx
type BlockRendererProps = {
  layout:  BlockInstance[];              // renamed from `blocks` (was ambiguous)
  blocks?: Record<string, ComponentType<any>>;  // optional client override map
};
```

Render logic: for each entry in `layout[]`, look up `blocks[type]` first (client override). If not found, fall back to `baseBlockRegistry[type]`. If neither, emit a dev warning.

**Base registry shape (as Payload is integrated):**

```ts
// packages/core-ui/src/renderer/baseBlockRegistry.ts
export const baseBlockRegistry = {
  {Name}Block: {
    component:     {Name}Block,          // imported from base-blocks/
    contentSchema: {Name}BlockContent,   // imported from schemas/
    configSchema:  {Name}BlockConfig,    // optional — Layer 3
    variants:      ['grid', 'masonry'] as const,
    hasAdapter:    false,
    jsonLdType:    'ItemList',
  },
} as const;
```

Fields:
- `variants`: drives the variant selector in the Payload editor and warns `BlockRenderer` of unknown variant keys at dev time.
- `configSchema`: drives the behavioral config fields in the Payload editor (shown below the content fields).
- `hasAdapter`: signals to the composition layer that the block needs an adapter provider in scope.
- `jsonLdType`: signals to the JSON-LD generator in `layout.tsx` which schema to include for pages containing this block type.

**Client block map (registered per site):**

```ts
// site-{slug}/src/blocks/registry.ts
import { HeroBlock }   from './HeroBlock/HeroBlock';
import { GalleryBlock } from './GalleryBlock/GalleryBlock';

export const clientBlocks = { HeroBlock, GalleryBlock } as const;
```

---

## §10 Promotion Gates

**alpha → beta requires ALL of the following:**

| Gate | Agent | Trigger |
|---|---|---|
| **STD-AGENT-VISUAL** | `ux-ui-analyst` | Always — compare each variant against Figma reference |
| **STD-AGENT-SEO** | `seo-geo-specialist` | If block renders headings, images, or links |
| **STD-AGENT-SECURITY** | `security-specialist` | If block has user inputs or connects to an adapter |
| **STD-AGENT-ARCHITECTURE** | `reviewer` (checklist) | Always — 4-layer structure correctly implemented |

The `reviewer` agent's checklist (Phase 3 of SPECBOOT) includes:
- [ ] Layer 1 (content schema) present and correct — all fields typed, no `any`, no empty defaults. Schema lives in `packages/core-ui/src/schemas/`, not co-located with the component.
- [ ] Layer 2 (variants) correctly typed — CVA if styling-only, structural if different DOM.
- [ ] Layer 3 (config schema) present if and only if the block has behavioral options.
- [ ] Layer 4 (adapter) present if and only if the block connects to an external service.
- [ ] Config schema separated from content schema (not merged).
- [ ] Adapter interface exists in `@hwp/{domain}/` — block imports the hook, not the concrete adapter.
- [ ] (DEC-015) If the block has slots: `{Name}Block.slots.ts` exists, all slot types are explicit (`React.ReactNode` returns), and base-block defaults preserve accessible semantic markup when no slot is provided.
- [ ] (DEC-015) Client blocks in `site-{slug}/src/blocks/` import schemas from `@hwp/core-ui/schemas` and components from `@hwp/core-ui/base-blocks` — no deep path imports.

---

## §11 Lifecycle of a Block (SPECBOOT)

```
/propose  → planner identifies which of the 4 layers the block needs and why
            + specifies the scaffold target (base-block in packages/core-ui, or client block in site-{slug}/src/blocks/)
            + decides if the block needs slots (§2.5) and which usage level is expected
/apply    → implementer builds TDD-first: schema (in schemas/) → test → fail → component (in base-blocks/) → pass
/review   → reviewer checks 4-layer structure + SEO + security (STD-AGENT-ARCHITECTURE)
            + verifies slot types if slots were specified
/verify   → verifier runs typecheck + tests + lint + build
            ↓
            /seo-audit  (mandatory if block has headings, images, or links)
            /security-audit  (mandatory if block has inputs or adapters)
            ↓
/archive  → docs-writer closes story: catalog, project-map, specs synced to code reality
```

**Key rules for each phase:**

- **Planner:** proposal must state which layers are needed and justify each. A block with only a content schema and no behavioral options does not get a config schema. A block with no external service does not get an adapter. Must state scaffold target: `base-block` (platform reusable) or `client block` (site-specific). For base-blocks, must decide if slots are needed and list slot names.
- **Implementer:** builds each layer TDD-first. Schema goes to `packages/core-ui/src/schemas/`. Component goes to `packages/core-ui/src/base-blocks/{Name}Block/`. Config schema has its own tests. Adapter tests use mocks — never the real service.
- **Reviewer:** validates the 4-layer boundary — no config fields leaking into content schema, no concrete adapter imported by the block. Also checks slot types are explicit and that base-block defaults are accessible.
- **Docs-writer:** updates `docs/catalog.md` with the block entry and its layer flags; updates `docs/specs/seo/semantic-html.md §Per-block semantic requirements` if the block is new.

---

## §13 Composition Rules (DEC-015)

The `packages/core-ui/src/composition-rules/` module (added by DEC-015) provides Zod-validated rules for block ordering and adjacency constraints. It is consumed by the planner agent and, in a future phase, by the Payload CMS page builder.

**Schema shape:**

```ts
// packages/core-ui/src/composition-rules/rules.schema.ts
export const CompositionRule = z.object({
  sectionId:              z.string(),
  maxPerPage:             z.number().optional(),
  position:               z.enum(['first', 'last', 'after-navbar']).optional(),
  canFollow:              z.array(z.string()).optional(),
  notDirectlyAfter:       z.array(z.string()).optional(),
  minimumDistanceBetween: z.number().optional(),
});
```

**Usage:**
- The planner validates that a proposed page composition does not violate any registered rules before emitting the proposal artifact.
- Violations are surfaced as warnings (not hard errors) in the current phase.
- Rules are registered per block type alongside the `baseBlockRegistry`.

---

## §12 In Simple Terms

**En WordPress:** cuando instalas un bloque de Gutenberg, tiene campos que rellenas, un aspecto que puedes cambiar (estilo del botón, color del fondo), y a veces se conecta a un plugin externo (un mapa, un sistema de reservas). Pero todo eso está mezclado — los campos, la configuración, y la conexión externa no están separados de forma explícita.

**En HWP:** cada bloque tiene hasta 4 capas bien separadas:

| Capa | Equivalente WordPress | Para qué sirve |
|---|---|---|
| Content Schema | Los campos del editor de Gutenberg | Define qué escribe el editor |
| Variants | Los estilos del bloque (Gutenberg "transform") | Cambia cómo se ve o cómo funciona |
| Config Schema | Las opciones del widget (settings del plugin) | Define cómo se comporta el bloque |
| Adapter | El plugin externo (WooCommerce, Booking.com widget) | Conecta con servicios externos sin hardcodear el proveedor |

**Por qué importa para el equipo:**
- Un bloque con "superpoderes" (reservas, mapa, reseñas) tiene las 4 capas → necesita auditoría de seguridad.
- Un bloque visual estático (hero, texto+imagen) tiene solo 1 o 2 capas → más simple de construir y mantener.
- Antes de implementar un bloque nuevo, el planner decide qué capas necesita y lo justifica en la propuesta.

**Checklists rápidos:**
- ¿Tiene opciones de comportamiento (número de columnas, autoplay)? → Layer 3 (Config Schema).
- ¿Conecta a un servicio externo (PMS, mapa, CRM)? → Layer 4 (Adapter).
- ¿Las variantes tienen campos de contenido diferentes? → Layer 2-C (Functional variants).
- ¿Solo cambia el CSS? → Layer 2-A (CVA).
