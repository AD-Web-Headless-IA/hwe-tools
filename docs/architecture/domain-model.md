# HWP — Domain model

> Canonical description of HWP's multi-tenant domain: what a "client" is, what pages it has, what features it can opt into, what's reusable across clients.
> **Always loaded** by any agent that classifies Figma Make modules, scaffolds blocks/templates, designs schemas, or wires routes. Without this file, the agent classifies on generic intuition; with it, the agent classifies on the actual multi-tenant criteria.
>
> **Status:** v0.4 — session 2026-05-18 (Punto 2 closed: catalog of standard pages, hybrid sub-pages model, per-feature structured collections, route customization layers, canonical `client.config.routes` shape). Subsequent sessions extend this file. Open questions tracked at the bottom.
>
> All identifiers in this file are illustrative working names. The canonical English naming (block names, template names, adapter classes) is finalized in a later session (Punto 6 of the domain modeling).

## 1. Customer base — what HWP is built for

The agency building HWP currently serves **200+ hospitality clients**, distributed approximately:

- **~90% campings**
- **~10% hotels** (growing)
- **Edge cases** like `Hotel Balneario Fuente de Cabriel` (hotel + spa + rural cabins) — minority but real and supported.

Balneario is the **first pilot migration** to HWP. The rest follow.

## 2. Multi-tenant model — type + features (mixed)

Each HWP client has exactly two configuration dimensions:

### Type (one of)

| Type | Notes |
|---|---|
| `camping` | Default for ~90% of customer base today |
| `hotel` | Default for ~10%, growing |
| `balneario-spa` | Hotel + spa hybrid (edge case, exists) |
| `rural` | Rural accommodation focused. *Open question: is this a true type or a sub-case of `camping`/`hotel` with features? — see open questions* |
| `residencia-vacacional` | Vacation residences. Distinctive defaults — typically multi-unit independent properties (apartments, villas) often paired with seasonal operation (winter/summer modes). Has the `hasSeasons` feature on by default. |

The `type` determines the **default set of pages and blocks** the site ships with. It is NOT a behavioral switch in the core (`if (type === 'camping') ...` is forbidden — see [base-standards.md](../specs/base-standards.md)). Instead, the type selects which feature defaults and which Payload schema extensions apply.

### Features (opt-in per client)

On top of `type`, each client toggles a set of features. The full feature list is in §4 below.

This is the **mixed model**: type gives you a sensible starting set; features let each client diverge from the starting set in any direction without forking the platform.

## 3. Mandatory pages

Always present, regardless of `type` or features. Building these correctly is the foundation of every HWP site.

| Route (default pattern) | Page concept | Layer | Notes |
|---|---|---|---|
| `/` | Home | Composition (always) | Per-client assembly of blocks. **No `HomeTemplate` exists in core-ui** — homes are always composed in `apps/site-{slug}/src/compositions/HomeComposition.tsx`. |
| `/{collectionSlug}` | Accommodation listing | Template | `AccommodationListingTemplate`. A client may declare **1 or N listings** (multi-collection clients: e.g. a camping with `/bungalows` + `/parcelas` + `/casas-moviles` as separate listings, each with its own slug). |
| `/{collectionSlug}/[unitSlug]` | Accommodation detail | Template | `AccommodationDetailTemplate`. **One route per Accommodation unit** (per §6 decision: unit-level). Each Payload `Accommodation` row → one URL. A hotel with 50 rooms = 50 routes. |
| `/contacto` | Contact + form | Template OR composition (per client) | `ContactoTemplate` exists for standard cases (form + map + address + hours). Clients with significant layout variation use a per-client `ContactoComposition` instead. Both render a contact form whose **fields are configurable per client** (see open questions). |
| `/{legalPageSlug}` | Legal page | Template + Payload collection | `LegalTemplate`. A client always has **≥3 legal pages by default** (privacidad, cookies, aviso-legal). Some clients add more (RGPD, política comercial, etc.). **All legal content comes from the CMS** — one Payload row per legal page, each with its own slug. Bootstrap creates the 3 defaults; client adds extras as needed. |

> Route slugs above are in Spanish (the market is ~100% Spanish-speaking primary clients). The English code names for the templates (`AccommodationListingTemplate`, `AccommodationDetailTemplate`, etc.) are finalized in Punto 6.

> **Slugs are DEFAULTS, not hard-coded URLs.** Each client overrides via `client.config.routes` in three layers (all supported in v1):
>
> 1. **Per-locale slug translation**: `/casitas-rurales` in `es`, `/rural-cabins` in `en`, `/cabanes-rurales` in `fr`. Wired via next-intl `pathnames` config.
> 2. **Per-client slug override of the standard structure**: Balneario uses `/casitas-rurales` for the listing, Camping uses `/parcelas`, Hotel uses `/habitaciones` — same template, different slug per client.
> 3. **Full route-shape override** (`customRoutes` escape hatch): a client can declare a completely non-standard pattern (e.g. `/propiedades/listados/[slug]`) that replaces the standard derivation for that template.
>
> The sitemap helper in `@hwp/core-ui` is what materializes the actual URLs by reading `client.config.routes` + active locales + active features + Payload data. See §8 open questions for the sitemap design tracking.

## 4. Opt-in features

Each feature, when active, adds pages, sub-pages, blocks, and Payload collections to the client's site. Inactive features add nothing — no dead routes, no orphan blocks in the bundle.

| Feature key | Activates when... | Pages added | Sub-pages | Notes |
|---|---|---|---|---|
| `hasParcelas` | Camping has rentable plots | `/parcelas`, `/parcelas/[slug]` | per plot type | Parcelas share the accommodation logic (§6) |
| `hasRestaurant` | Client has F&B | `/restaurante` | optional (menu, reservations) | Sub-pages TBD per client |
| `hasAnimation` | Animation program exists | `/animacion` | optional per-event | |
| `hasSpa` | Spa or balneario services | `/spa` | treatments, pricing | Distinctive of `balneario-spa` type but available to any type |
| `hasMap` | Interactive site map | `/mapa` | none | Available to any type |
| `hasOffers` | Promotional offers | `/ofertas` | per-offer detail (optional) | |
| `hasEntorno` | Surroundings content (places nearby) | `/entorno` | per-element | |
| `hasFaqs` | FAQs section | `/faqs` | none | |
| `hasGallery` | Standalone gallery page | `/galeria` | none | Independent of per-page galleries |
| `hasTarifas` | Pricing page | `/tarifas` | none | Pricing can also live inline in each accommodation ficha — see open questions |

Adding a feature means: a Payload collection (if it stores editable content), a block or template in `core-ui/base-blocks/` or `core-ui/templates/` (visual), a route in each app that has the feature, and a typed entry in `client.config.ts` features object.

> **Feature slugs follow the same 3-layer rule as mandatory pages**: the slug shown above (`/spa`, `/restaurante`, etc.) is a default. Each client can:
> 1. Translate the slug per locale (`/spa` in `en`, `/balneario` in `es`).
> 2. Override the slug per client (Balneario calls its spa page `/balneario`, not `/spa`).
> 3. Replace the whole route shape via `customRoutes`.
>
> Sub-pages of a feature inherit the parent's slug behavior — if a client renames `/spa` to `/balneario`, then `/spa/tratamientos` becomes `/balneario/tratamientos` automatically.

## 5. Booking widget — multi-PMS adapter

HWP supports **4 PMS providers out-of-the-box** today, plus **custom adapters per client** for any non-stock PMS or bespoke integration. No client uses two simultaneously, but the platform is provider-agnostic.

### Stock adapters (in `@hwp/booking/adapters/`)

| Provider | Notes |
|---|---|
| **THR** | |
| **Masterbooking** | |
| **Witbooking** | |
| **Resalys** | |

### Custom adapters

When a client uses a PMS not in the stock set (or has a bespoke API):

- The custom adapter implements the same `BookingAdapter` interface from `@hwp/booking`.
- Lives in `apps/site-{slug}/src/booking/` for client-specific one-offs.
- OR in `packages/booking-{slug}/` if the same custom integration will be reused across multiple sites of the same chain.
- The `BookingBlock` (UI shell) does not know whether the active adapter is stock or custom — it talks only to the interface.

### Architectural implication

The `BookingBlock` (UI of the widget — date pickers, occupancy selector, "search" button) is **provider-agnostic**. Its props are the minimum common denominator across all PMS APIs (stock and custom):
- check-in date, check-out date
- adults, children, ages (if needed)
- accommodation type filter (optional)

Provider-specific differences (auth, endpoint, response shape, error codes) are absorbed by the corresponding adapter in `@hwp/booking`:

```
@hwp/booking
├── interface BookingAdapter   ← contract any adapter must implement
├── adapters/                  ← stock adapters shipped with the platform
│   ├── ThrAdapter
│   ├── MasterbookingAdapter
│   ├── WitbookingAdapter
│   └── ResalysAdapter
└── react/
    └── BookingBlock           ← UI shell; receives results from active adapter

apps/site-{slug}/
└── src/booking/               ← custom adapter for THIS client (if PMS is non-stock)
    └── {ClientName}Adapter    ← also implements BookingAdapter

packages/booking-{chain-slug}/ ← OR a custom adapter shared across multiple sites of the same chain
```

The active adapter for a client is declared in `client.config.ts` and injected into the React context at app root. `BookingBlock` never imports a concrete adapter.

**Detailed adapter interface design is a later session** — not part of v0.1.

## 6. Accommodation — one entity, many display names

The most important unification in the model:

| Client type | Display name in their content | Underlying entity |
|---|---|---|
| Balneario | "Casita Rústica", "Suite Balneario" | `Accommodation` |
| Camping | "Bungalow Pino", "Parcela Premium" | `Accommodation` (parcela = subtype) |
| Hotel | "Habitación Doble", "Suite Superior" | `Accommodation` |

They all share the same **ficha** (detail page) logic:

- Individual detail page
- Gallery
- Amenities / characteristics
- Pricing (inline or linked to `/tarifas`)
- Booking widget integration

→ **ONE generic `AccommodationDetailTemplate`** in `core-ui/templates/`. The display name (`Casita Rústica`, `Bungalow`, `Habitación`) is **data** stored in Payload, not code.

### Naming taxonomy (English in code, free in content)

| Layer | Canonical name (code, English) | What it is | Example value |
|---|---|---|---|
| Template (frontend) | `AccommodationDetailTemplate` | ONE template, renders any accommodation | — |
| Listing template | `AccommodationListingTemplate` | ONE template, lists accommodations | — |
| Entity (Payload + booking) | `Accommodation` | ONE collection, polymorphic per client type | — |
| Display name field | `Accommodation.displayName` | What the client calls this unit | `"Casita Rústica"`, `"Bungalow Pino"`, `"Habitación Doble"` |
| Category label field | `Accommodation.categoryLabel` | Plural label for SEO / breadcrumbs | `"Casitas Rústicas"`, `"Bungalows"`, `"Habitaciones"` |
| Slug | `Accommodation.slug` | URL — kebab-case in the site's primary language | `casita-rustica-001`, `bungalow-pino-3`, `habitacion-doble-premium` |

**The rule**: a block, template, or entity name in code never mentions a client-specific noun. `BalnearioSection`, `CasitaRusticaPage`, `BungalowsTemplate` are forbidden. The right names are `FeatureSection`, `AccommodationDetailTemplate`, `AccommodationListingTemplate` — and the content drives the user-visible label.

### Per-type field extensions

Each client type extends the base `Accommodation` schema with fields its domain needs. Extensions live in `apps/site-{slug}/payload/schemas/accommodation.ts` and are validated against the base schema in `core-ui`.

> **The field examples below are illustrative working names** — the canonical per-type field catalogs are finalized in a later session (Punto 4 of domain modeling) with input on what each PMS actually exposes and what the agency content team needs to manage.

- Camping (illustrative): `plotSize`, `shadedPlot`, `electricHookup`.
- Hotel (illustrative): `bedrooms`, `bathrooms`, `view`.
- Balneario (illustrative): `thermalWaters`, `treatmentAccess`.
- Residencia vacacional (illustrative): `apartmentNumber`, `floor`, `parkingIncluded`.
- Parcelas (camping sub-feature `hasParcelas`, illustrative): all of camping extension + `pitchType`, `tentSize`.

### Category vs unit — decided

`Accommodation` is **unit-level**. Each Payload `Accommodation` row represents **one physical reservable unit** (a specific casita, a specific room number, a specific plot). Each unit has its own slug → its own URL → its own SEO page.

Marketable "categories" (e.g. "Suite Standard", "Suite Deluxe", "Suite Premium") are a **field on the unit** (`category` / `categoryLabel`), not a separate entity. Multiple units can share a category; the listing template can group/filter by it.

Trade-off accepted: a hotel with 50 rooms ships 50 detail pages. This is intentional — each unit gets its own indexable content (gallery, description, amenities specific to that room). For PMS integrations where units within a category are truly identical and the PMS assigns at check-in, the agency creates one `Accommodation` per category instead of per physical room (a per-client editorial choice, not a code change).

## 7. Classification implications — how to use this file when classifying Figma Make modules

When the classifier (human or agent) reviews a module from `docs/docs/plans/phase-1-design-system/sources/{slug}.md`, it consults this file to decide layer + category.

### Decision rules

1. **Module appears on a mandatory page (§3)** → almost always a `Block` or part of a `Template`. Goes to `core-ui/`.

2. **Module appears on a feature-gated page (§4)** → still a `Block` in `core-ui/`, but tagged as "active only when feature X is on". Its inclusion in any client's app is conditional on the feature being declared in `client.config.ts`.

3. **Module wraps a PMS call (search, availability, book button)** → it is the `BookingBlock` (or a sub-component of it). The adapter logic lives in `@hwp/booking`, NEVER in the block. Props are the minimum common denominator across the 4 providers.

4. **Module is a `<XxxSection>` on a client's home (e.g. `BalnearioSection`, `HotelSection`)** → almost always a generic **`FeatureSection`-style block** whose specialness is in its **content** (text, image, CTA target). The block is not per-client; the content is. Naming should be abstract (`FeatureSection`, `HighlightSection`), not domain-specific (`BalnearioSection`).

5. **Module is the specific ARRANGEMENT of blocks on one client's home** (order, grid, which blocks chosen) → goes to `apps/site-{slug}/src/compositions/HomeComposition.tsx`. The blocks themselves remain generic in `core-ui`.

6. **Module is a "ficha" of an accommodation** (regardless of whether the client calls it Casita, Bungalow, or Habitación) → contributes to `AccommodationDetailTemplate` in `core-ui/templates/`, not a per-client component. Per-type fields are added via `extendAccommodation()`.

7. **Module is a UI primitive** (button, input, dialog, calendar widget alone) → `core-ui/primitives/`, NOT `base-blocks/`. These are atomic pieces, not page sections.

### Anti-classification patterns

- A name like `BalnearioSection` is a **content artifact**, not a code artifact. The classifier resists creating a `core-ui/base-blocks/BalnearioSection/` — it's a `FeatureSection` with balneario content. The architecture explicitly forbids `if (client === '...')` in the core; naming a block after one client's domain is the same anti-pattern.
- A page named `CasitaRusticaPage` is **NOT a per-client template**. It's the generic `AccommodationDetailTemplate` rendering the data of a Payload document whose `displayName: 'Casita Rústica'`.
- A `BookingBar` is **not "the THR widget"**. It's the UI shell. The fact that this specific client uses THR is config, not code.

## 8. Seasonality / themes

Some HWP clients (notably `residencia-vacacional` and certain `hotel` / `rural`) operate in **multi-season mode**: the same domain serves different visual themes, content variants, photos, and even active routes depending on the current season.

### The Season entity

A `Season` is a named period with date range(s). It is a **per-client** entity stored in Payload.

| Field | Type | Notes |
|---|---|---|
| `name` | string | Human label: "Invierno", "Verano", "Navidades", "Semana Santa", "Verano Alto" |
| `slug` | string | Code-side identifier: `winter`, `summer`, `christmas`, `easter`, `high-summer` |
| `dateRanges` | `{ start, end }[]` | One or more intervals. Easter is ~10 days, summer is months, Christmas is 2 weeks |
| `theme` | reference | Points to the per-season visual theme (tokens, photos) |
| `displayOrder` | int | UI order if a toggle is shown |

A client without `hasSeasons` declares zero seasons and operates in single-theme mode (the default for the 90% of clients today).

### Number of seasons — N per client

Not fixed. Common case is 2 (`winter`, `summer`) but a client can declare:
- Just summer (seasonal resort closed in winter).
- 4 named periods (winter, easter, summer, christmas).
- Arbitrary custom periods ("Festival de Jazz", "Black Friday").

The model is N seasons with custom names.

### What swaps when the active season changes

A season swap can affect **all four dimensions**, configured per client (a client may swap only colors but not routes, etc.):

| Dimension | Mechanism |
|---|---|
| **Content (text, copy)** | Each block / template field can be declared `seasonized: true` in Payload. The field stores `{ default: ..., winter: ..., summer: ... }` and the block renders the variant for the active season (or `default` if unset). |
| **Images / galleries** | Same as content — media fields can be seasonized. Each season has its own set of photos. |
| **Tokens (colors, fonts)** | Each season has its own token file: `apps/site-{slug}/src/theme/tokens-{seasonSlug}.json`. This **amends DEC-003**, which assumed a single `tokens.json` — for seasonized clients, there are N. |
| **Routes / menus / visible pages** | Some pages exist only in a season (`/esqui` in winter, `/piscina` in summer). The route is registered conditionally based on the active season. Menus filter their items accordingly. |

### Activation modes (3 supported architecturally)

The data model supports 3 ways to determine "what season is active right now":

**(a) Manual toggle UI** — visitor sees a switch ("Invierno / Verano") on the front, picks one. Switch position is configurable per client (header, hero, sidebar, dedicated page).

**(b) Auto by current date** — server checks `today` against the season's `dateRanges`. The earliest matching season wins. This is the default mode.

**(c) Search-driven** — when the visitor uses the booking calendar to pick check-in/check-out dates, the season covering those dates becomes the active one for the rest of their navigation.

### Scope split — v1 vs v2

**v1 implements:**
- The `Season` entity in Payload (collection, fields, validation).
- Per-season token files (`tokens-{seasonSlug}.json`) and the build pipeline that produces one CSS bundle per season.
- **Mode (b) auto by current date** — server-side season resolution.
- Seasonized fields in block/template schemas (declarable but not all blocks need them).

**v2 adds:**
- **Mode (a) toggle UI** with configurable placement per client.
- **Mode (c) search-driven** activation tied to the booking calendar.

This split means v1 sites with `hasSeasons` change automatically by calendar. v2 unlocks visitor agency.

### Implication on previous decisions

- **DEC-003 amendment needed**: the assumption of "a single `tokens.json` per client" is no longer true for clients with `hasSeasons`. The file `docs/contracts/frontend/theme-tokens.md` and the Phase 0 plan need updating to support N-token files. To be tracked as a follow-up.

### Classification implication

When classifying Figma Make modules:

- A block that the designer shows in two visual states ("look invernal" vs "look estival") → ONE block with **seasonized fields** in its schema, NOT two blocks.
- A toggle UI shown in Figma → blocked as a `SeasonSwitchBlock` (v2-only block; in v1 it's not rendered).
- A page that exists only in some seasons → still a regular page, with route registration conditional on the active season at build time.

## 9. Feature sub-pages — hybrid model

Each feature with sub-pages (variable per client) follows the **hybrid model**: structured collections for typed concepts, free-form `FeaturePage` for loose content. The client decides per row which mechanism to use based on the content.

### The two mechanisms

**Structured collections (per typed concept)**

When a feature has sub-pages that share a typed shape (each sub-page has the same set of fields: name, duration, price, image, etc.), there is a dedicated Payload collection + dedicated detail template:

```
Feature `hasSpa` → SpaTreatment collection  →  SpaTreatmentListingTemplate at /{spaSlug}/{treatmentsListingSlug}
                                            →  SpaTreatmentDetailTemplate  at /{spaSlug}/{treatmentsListingSlug}/[unitSlug]
```

The template is provider-of-typing — the schema enforces a consistent shape across all rows.

**Free-form `FeaturePage` collection**

For any sub-page that doesn't fit a typed concept ("Cómo funciona nuestro spa", "Historia del balneario", "Política de cancelación del restaurante"), the client creates a row in a generic `FeaturePage` collection:

| Field | Type | Notes |
|---|---|---|
| `feature` | enum | which feature is the parent: `spa`, `restaurant`, `offers`, etc. |
| `slug` | string | URL segment under the feature's parent slug |
| `title` | string | page title (per locale) |
| `blocks` | array | content as ordered blocks (rendered by `BlockRenderer`) |
| `seo` | object | meta, og, schema.org type (optional) |

A single `FeaturePageTemplate` renders any row. Route pattern: `/{featureSlug}/{freeFormSlug}`.

### When to use which

| Content has... | Mechanism |
|---|---|
| Typed fields agreed across the platform (price, duration, dates...) | **Structured** collection |
| One-off informational pages | **Free-form** `FeaturePage` |
| Content the agency wants to query/filter/sort by typed field | **Structured** |
| Content the client wants to add ad-hoc without code changes | **Free-form** |

A single feature can use both at the same time: `/spa/tratamientos/chocolaterapia` (structured) AND `/spa/como-funciona` (free-form) coexist under the same `hasSpa` feature.

### Routing implication

Sub-pages of a feature inherit the parent feature's slug — if the client renames `/spa` to `/balneario` in their `client.config.routes`, all sub-pages move with it automatically.

The router resolves `/{featureSlug}/{any}/{any}` in this order:
1. Match against structured collection routes (e.g. `/spa/tratamientos/[slug]`).
2. Fall back to `FeaturePage` lookup (free-form).
3. 404 if neither.

### Listing sub-pages

A feature's parent landing template (e.g. `SpaTemplate`) typically renders:
- Block: a hero / intro.
- Block: a `SpaTreatmentListing` block (auto-listing of structured `SpaTreatment` rows) — if the structured collection has rows.
- Block: a `FeaturePageListing` block listing the feature's free-form pages — if the client wants them surfaced.
- Whatever other blocks the client composes.

The composition is per-client. The blocks are reusable across features.

### Default structured collections per feature

These are the **default** structured collections that ship with each feature when activated. Each can be extended per client (add fields via `extend*` helper) or skipped (client uses only free-form `FeaturePage` for that feature).

| Feature | Parent template | Structured collections | Free-form `FeaturePage` allowed |
|---|---|---|---|
| `hasSpa` | `SpaTemplate` | `SpaTreatment` (name, duration, price, image, description) | yes |
| `hasRestaurant` | `RestaurantTemplate` | `MenuSection` + `MenuItem` (2 collections — section groups items; item has name, description, price, allergens, category ref) | yes |
| `hasAnimation` | `AnimationTemplate` | _none_ — animation content is narrative; uses blocks in the parent page + optional free-form sub-pages | yes |
| `hasMap` | `MapTemplate` | _none_ — single-page feature with an interactive map component | no |
| `hasOffers` | `OffersTemplate` | `Offer` (see below for date model) | yes |
| `hasEntorno` | `EntornoTemplate` | `PointOfInterest` (name, kind, distance, description, image, geo coords) | yes |
| `hasFaqs` | `FaqsTemplate` | `FaqItem` (question, answer, category) | no |
| `hasGallery` | `GalleryTemplate` | `GalleryAlbum` (title, description, images, date) | optional (typically no) |
| `hasParcelas` | _reuses_ `AccommodationListingTemplate` | _reuses_ `Accommodation` with subtype `parcela` (per-camping fields: plotSize, shadedPlot, electricHookup) | no |
| `hasTarifas` | `TarifasTemplate` | _none_ — tariff data lives as a block (typed table) inside the parent page | no |

### Offer — date model (`hasOffers`)

An `Offer` has **two independent date ranges**, both optional:

| Field | Type | Purpose |
|---|---|---|
| `publicationStart` | datetime | When the offer becomes visible on the site (may be earlier than its validity for teasers) |
| `publicationEnd` | datetime | When the offer is hidden from the site |
| `offerStart` | datetime | When the discount/offer becomes valid for booking |
| `offerEnd` | datetime | When the discount/offer expires |

Plus an optional relation:

| Field | Type | Purpose |
|---|---|---|
| `seasons` | reference[] | Link to one or more `Season` entities (per §8). When set, the offer is shown only when one of the linked seasons is active, regardless of publication dates. Mutually compatible with publication dates (both constraints apply). |

This allows offers like "valid all summer, but show on the site starting May 15" (publication + offer dates differ) and "only display during the Christmas season" (linked to a Season).

### Feature dependencies

Some features may functionally require others (e.g. `hasRestaurant` without `hasGallery` may look bad visually). Hard dependencies are **not declared at this layer** — they are defined per-page when we work on the block catalog (Punto 3) and validated at composition time, not config time.

## 10. `client.config.routes` — canonical shape

The single source of truth for what URLs a client's site has. Closes Punto 2.

### Type contract (illustrative)

```typescript
type SlugInput = string | Partial<Record<Locale, string>>;
// string  → use as the defaultLocale slug; other locales fall back to it
// object  → explicit per-locale slugs; missing locales fall back to defaultLocale's value

interface RoutesConfig {
  mandatory: {
    home:     { slug: SlugInput };          // always '/' in practice but declared for uniformity
    contacto: { slug: SlugInput };
    // legales NOT declared here — they come from Payload `LegalPage` collection
  };

  accommodations: Array<{                    // always array (1 or N collections)
    key: string;                             // internal identifier per collection
    listingSlug: SlugInput;
    detailBaseSlug: SlugInput;               // [unitSlug] is appended at runtime
  }>;

  features: Partial<Record<FeatureKey, {
    slug: SlugInput;
    collections?: Record<string, {
      slug?: SlugInput;                      // omitted → collection mounts at the parent feature slug
    }>;
  }>>;

  customRoutes: CustomRoute[];               // always present, may be empty []
}
```

### Conventions enforced by the validator

1. **Slug shorthand**: `'balneario'` is normalized to `{ [defaultLocale]: 'balneario' }`. Other locales fall back to the defaultLocale's value unless the object form provides them explicitly.
2. **Uniformity in mandatory**: all mandatory pages declared (`home` always `/`, `contacto`, etc.) — no implicit defaults.
3. **Collection without `slug` (`{}`)**: the collection mounts at the parent feature's slug. The parent IS the listing; details are at `/{parentSlug}/[itemSlug]`. Example: `offers.collections.offers = {}` produces `/ofertas` (listing) + `/ofertas/[slug]` (detail).
4. **Collection with `slug: 'x'`**: the collection has its own sub-listing under the parent. Example: `spa.collections.treatments = { slug: 'tratamientos' }` produces `/balneario/tratamientos` (listing) + `/balneario/tratamientos/[slug]` (detail).
5. **Collection keys** (`treatments`, `offers`, `points`, `albums`, ...) are how the runtime resolves which Payload collection to read for a given route.
6. **`customRoutes` always present** even when empty — uniformity for the type checker and for tooling that introspects routes.

### Example — Balneario (single collection, mixed feature shapes)

```typescript
routes: {
  mandatory: {
    home:     { slug: '/' },
    contacto: { slug: 'contacto' },
  },
  accommodations: [
    {
      key: 'casitas-rurales',
      listingSlug: 'casitas-rurales',
      detailBaseSlug: 'casitas-rurales',
    },
  ],
  features: {
    spa: {
      slug: { es: 'balneario', en: 'spa', fr: 'spa' },
      collections: {
        treatments: { slug: { es: 'tratamientos', en: 'treatments' } },
      },
    },
    restaurant: {
      slug: { es: 'restaurante', en: 'restaurant' },
      collections: {
        menu: { slug: { es: 'carta', en: 'menu' } },
      },
    },
    offers: {
      slug: { es: 'ofertas', en: 'offers' },
      collections: { offers: {} },          // parent IS listing
    },
    entorno: {
      slug: { es: 'entorno', en: 'surroundings' },
      collections: { points: {} },
    },
    gallery: {
      slug: { es: 'galeria', en: 'gallery' },
      collections: { albums: {} },
    },
    faqs: { slug: 'faqs' },
  },
  customRoutes: [],
}
```

### Example — Camping multi-collection (illustrative for scale)

```typescript
routes: {
  mandatory: {
    home:     { slug: '/' },
    contacto: { slug: 'contacto' },
  },
  accommodations: [                          // 3 collections, each rendered with AccommodationListingTemplate
    { key: 'bungalows',     listingSlug: 'bungalows',     detailBaseSlug: 'bungalows' },
    { key: 'parcelas',      listingSlug: 'parcelas',      detailBaseSlug: 'parcelas' },
    { key: 'casas-moviles', listingSlug: 'casas-moviles', detailBaseSlug: 'casas-moviles' },
  ],
  features: {
    animation: { slug: 'animacion' },
    map:       { slug: 'mapa' },
    offers: {
      slug: 'ofertas',
      collections: { offers: {} },
    },
    faqs: { slug: 'faqs' },
  },
  customRoutes: [],
}
```

### Example — Cliente atípico (customRoutes escape hatch)

```typescript
routes: {
  // ...standard layers above...
  customRoutes: [
    {
      template: 'AccommodationDetailTemplate',
      pattern: { es: '/propiedades/listados/[unitSlug]', en: '/properties/listings/[unitSlug]' },
      // overrides the standard derivation for this template
    },
  ],
}
```

### What the sitemap helper consumes

`generateSitemap()` (in `@hwp/core-ui`, see §8 open questions) reads:
- `client.config.locales` and `defaultLocale`.
- The full `client.config.routes` (normalizes shorthand, applies fallbacks).
- Active features map.
- Payload data for dynamic content slugs (Accommodation, SpaTreatment, Offer, PointOfInterest, GalleryAlbum, FeaturePage, LegalPage).
- Active season (if `hasSeasons`).

Output: `MetadataRoute.Sitemap` with all URLs + `hreflang` alternates per locale + proper canonical handling.

## Open questions (carry into next sessions)

These remain unresolved after v0.2 and need to be answered in subsequent domain sessions or technical sessions:

### Domain — defer to later Puntos

- **`rural` as a type**: is it a fourth real type, or just `camping` / `hotel` with specific feature combinations? — defer until we see a `rural` client concretely.
- **`hasTarifas` interaction with accommodation ficha**: pricing can live in `/tarifas` page AND inline in each ficha. Is this one feature with a `mode: 'page' | 'inline' | 'both'`, or two separate features? — undecided.
- **Sub-pages of each feature**: §4 lists "optional" sub-pages for several features (restaurant menu, spa treatments, offer details). Need to enumerate the concrete sub-page list per feature. — Punto 2 (catalog of pages).
- **Contact page**: composition or template? Form details, map embed conventions. — Punto 2.
- **Multilingual routes**: route slugs are currently shown in Spanish. Locale-prefixed routes (`/es/alojamientos`, `/en/accommodations`) — do we translate slugs per locale or keep Spanish slugs across all locales? — Punto 7 (URLs and SEO).
- **Remaining canonical names in English**: feature keys in code (`hasSpa`, `hasParcelas` already proposed but not finalized), block names, route slug strategy. — Punto 6.
- **Per-type field catalogs**: the field examples in §6 ("plotSize", "shadedPlot", etc.) are illustrative. The real per-type field list comes from agency content team + PMS API surface. — Punto 4 (entities) and Punto 5 (search/filters).
- **Multi-collection clients** (e.g. camping with `/bungalows` + `/parcelas` + `/casas-moviles` as separate listings): is it ONE Payload `Accommodation` collection with a `subtype` field, or N separate collections (one per subtype)? Affects `AccommodationListingTemplate` routing and Payload schema. — Punto 4.
- **Contact form fields per client**: the form fields vary per client. Is the field config declared in `client.config.ts` (static) or in a Payload collection `ContactFormConfig` (editable via CMS)? — Punto 4.
- **Bootstrap-time legal pages**: when a new client app is bootstrapped, the 3 default legal Payload rows (privacidad, cookies, aviso-legal) are auto-created. Mechanism: Payload migration script, seed file, or scaffold-client-app skill — Punto 2 closes the catalog, this is implementation detail for the bootstrap path.

### Technical — separate non-domain sessions

- **Sitemap helper in `@hwp/core-ui`** — shared function `generateSitemap()` that each app's `sitemap.ts` calls. Reads:
  - `client.config.routes` (capa 1 standard slugs per locale + capa 2 `customRoutes` overrides — both in v1).
  - Active locales declared in `client.config.locales`.
  - Active features.
  - Payload data (dynamic content slugs, also per-locale).
  - Active season (if `hasSeasons` — decides whether seasonal-only pages appear).

  Emits `MetadataRoute.Sitemap` for Next.js to compile into `sitemap.xml`, with proper `<xhtml:link rel="alternate" hreflang="...">` per locale.

  Tightly coupled to Punto 2 (catalog of templates) and Punto 7 (URLs/SEO) — design closes after both are settled.

- **`BookingAdapter` interface concrete shape**: props, return type, error contract, async semantics across the 4 stock PMS. Requires reading each PMS docs. — separate technical session before Phase 0 US-007 finishes.
- **DEC-003 amendment for multiple `tokens-{seasonSlug}.json`**: the current `theme-tokens.md` and `tokens.contract.ts` assume one file per client. For seasonized clients there are N. Needs:
  - Update `docs/contracts/frontend/theme-tokens.md` to describe the per-season naming pattern.
  - Update `TokensContract` to accept either a single tokens object or a `Record<seasonSlug, Tokens>` shape.
  - Update Phase 0 US-007 to handle both cases.
  - Add a new DEC documenting the amendment.
- **Active season runtime delivery**: how does a block know the active season? React context, a server-set `<html data-season>` attribute, or both? — affects how blocks render seasonized fields. Resolve before implementing seasonized fields in any block.
- **Build pipeline for seasonized clients**: per-season CSS bundle vs single bundle with `data-season` scoped selectors. Performance and SEO implications. — separate technical session.

### v2 backlog (post-v1)

- **Toggle UI placement**: `SeasonSwitchBlock` block lives in `core-ui/base-blocks/` (v2, DEC-015). Variants per typical placement (header, hero, sidebar, dedicated route).
- **Search-driven season activation**: the booking calendar must communicate its date selection to the season resolver. Cross-block coordination needed.

## Versioning

| Version | Date | Sessions captured |
|---|---|---|
| v0.1 | 2026-05-18 | Punto 1 — typologies, features, mandatory pages, accommodation unification, 4 PMS providers |
| v0.2 | 2026-05-18 | Punto 1 continued — custom booking adapters, 5th type `residencia-vacacional`, accommodation naming taxonomy (English in code), seasonality model with v1/v2 split |
| v0.3 | 2026-05-18 | Punto 2 — catalog of standard pages (mandatory + feature-gated), 3-layer route customization (per-locale slugs + per-client overrides + customRoutes escape hatch in v1), Accommodation = unit-level, hybrid sub-pages model (structured collections + free-form FeaturePage), default structured collection per feature, Offer date model with optional Season link |
| v0.4 | 2026-05-18 | Punto 2 closed — canonical `client.config.routes` shape with type contract, slug shorthand normalization (string for defaultLocale + object for explicit per-locale), mount-at-parent convention for single-collection features, examples for Balneario / multi-collection camping / customRoutes escape hatch, sitemap helper consumption contract |
