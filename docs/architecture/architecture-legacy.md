# hwe — Arquitectura (ARCHIVO HISTÓRICO)

> 🗄️ **ARCHIVO HISTÓRICO — NO ES FUENTE DE VERDAD. Retirado por [DEC-018](./decisions.md#dec-018--retire-architecturemd-as-the-constitution-thin-overview--legacy-archive) (2026-06-04).**
>
> Este documento fue la "constitución" original de hwe, escrito cuando la plataforma era un monorepo único `hwe-platform/` sobre cdmon + Hetzner + MariaDB + PHP. Hoy está **mayoritariamente obsoleto** (>70%): DEC-007 (Vercel), DEC-011/DEC-015/DEC-017 (3 repos + client-owned blocks) y DEC-012→DEC-017 (Tailwind v4) reescribieron casi todo su contenido.
>
> **No cargues este fichero para entender el estado actual.** Se conserva solo como registro histórico (por qué existió el PHP proxy, MariaDB, el monorepo, los paquetes `@hwe/booking`/`@hwe/content`/`@hwe/analytics`/`@hwe/i18n`/`@hwe/ai`, etc.).
>
> **Estado actual → empieza por [`architecture.md`](./architecture.md)** (overview + índice "dónde vive cada cosa"). Fuentes canónicas:
> - Repos / workspace: [`../contracts/general/workspace-structure.md`](../contracts/general/workspace-structure.md) + [`DEC-017`](./DEC-017-Repo-Split.md)
> - Modelo de dominio / features: [`domain-model.md`](./domain-model.md)
> - Frontend (bloques/templates/theme/composición): [`../contracts/frontend/`](../contracts/frontend/)
> - Sistema de IA de contenido del producto: [`../specs/ai/content-operations.md`](../specs/ai/content-operations.md)
> - Decisiones: [`decisions.md`](./decisions.md)
>
> Todo lo que sigue es el texto original sin modificar (incluye infra muerta, `activeBlocks`, Tailwind v3, paquetes eliminados). Léelo como "qué se pensó en su día", no como "qué hacemos hoy".

---

<details>
<summary>Banners originales del documento (preservados)</summary>

> ⚠️ Partially superseded by DEC-017 (2026-06-03). Written when hwe was a single `hwe-platform/` monorepo.
> ⚠️ HOSTING / DEPLOY / DB / API-PROXY: superseded por DEC-007 (Vercel full-stack reemplaza cdmon + Hetzner + MariaDB + PHP proxy).
> Documento exhaustivo de decisiones de arquitectura. Última actualización: Mayo 2026.

</details>

---

## VISIÓN DEL SISTEMA

Plataforma para construir y gestionar webs de hospitality (campings y hoteles) para hasta 300 clientes.

Cada web se construye en tres capas:

**1. DISEÑO — desde Figma**
El diseñador crea el site en Figma con el branding del cliente.
Figma Make genera código de referencia visual.
Claude Code construye el site con bloques de @hwe/core-ui.

**2. CONTENIDO — desde Payload CMS**
Payload gestiona todo el contenido editorial del site.
Textos, imágenes, alojamientos, servicios, páginas.
La agencia genera el contenido inicial con IA.

**3. GESTIÓN — via portal con IA**
El cliente edita su contenido sin entrar al CMS.
Chat en lenguaje natural → IA interpreta → cambio en Payload.
La IA valida con el cliente antes de actuar.

El resultado es un site Next.js desplegado en Vercel (DEC-007),
con Payload como CMS headless en Vercel Functions + Vercel Postgres,
y un portal de cliente con IA para gestión del día a día.

**Características clave:**
- Core compartido versionado — una mejora beneficia a todos los clientes
- Personalización por cliente — diseño, funcionalidades y contenido propios
- Booking engine: solo búsqueda de disponibilidad + salto al PMS
- Escalable a 300 clientes sin cambiar la arquitectura base

---

## FASES DE DESARROLLO

```
FASE 1 — Desarrollo local (ahora)
  Laragon (Windows local)
    Next.js en localhost
    Payload CMS en localhost
    MySQL de Laragon
    PHP local para pruebas
  Sin costes externos
  Sin infraestructura de producción

FASE 2 — Primer deploy real (DEC-007)
  Vercel project por cliente → frontend (Next.js)
  Vercel Functions          → Payload CMS por tipo (camping, hotel, ...)
  Vercel Postgres           → una DB por cliente + platform DB compartida
  Vercel Blob Storage       → uploads de media
  Vercel Cron               → backups y tareas programadas
  GitHub Actions            → lint/test/build verification
  Vercel Git integration    → deploy automático (preview por PR, prod por main)
```

---

## STACK TECNOLÓGICO

> Stack canónico vigente, actualizado por DEC-006 (testing) y DEC-007 (hosting).

```
Lenguaje:         TypeScript — obligatorio en todo el sistema
Framework:        Next.js 14 con App Router (output flexible — static, ISR o SSR según ruta)
CMS:              Payload CMS v3 — instancia por TIPO de cliente (cms-camping, cms-hotel, ...)
ORM:              Prisma (sobre Postgres)
Base de datos:    Vercel Postgres — una DB por cliente + platform DB compartida (DEC-007)
Media storage:    Vercel Blob Storage — buckets por cliente (DEC-007)
Monorepo:         Turborepo + pnpm workspaces
Registry npm:     GitHub Packages (privado @hwe/*)
Deploy frontend:  Vercel project por cliente — Vercel Git integration (DEC-007)
Deploy CMS:       Vercel Functions por tipo — Vercel Git integration (DEC-007)
API proxy:        Next.js Route Handlers (PMS, Claude API) — credenciales en Vercel env vars (DEC-007)
Cron / jobs:      Vercel Cron — backups, warm-up de Functions, tareas programadas
i18n:             next-intl
Analytics:        GTM + DataLayer tipado (@hwe/analytics)
Testing:          Vitest + @testing-library/react (unit/integration) + Playwright (E2E) — DEC-006
CI/CD:            GitHub Actions (verificación) + Vercel Git integration (deploy)
Documentación:    OpenAPI generado automáticamente (zod-openapi)
Dev local:        Laragon (Windows) — Next.js + Payload + Postgres local
```

---

## ARQUITECTURA DE DEPLOY

> Layout actualizado por DEC-007. La versión anterior (cdmon + Hetzner + MariaDB + PHP proxy) está en `git log` para referencia histórica.

```
DESARROLLO LOCAL (Fase 1)
  Laragon
    localhost:3001  ← Next.js (site)
    localhost:3000  ← Payload CMS
    localhost:5432  ← Postgres local
    localhost:3001/api/*  ← Route Handlers (PMS proxy, AI proxy)

PRODUCCIÓN (Fase 2 — DEC-007)
  GitHub
    hwe-platform/  ← monorepo único
    ↓ push / PR
      GitHub Actions: lint + test + build verification
    ↓ on merge
      Vercel Git integration: deploy automático

  Vercel proyecto: site-camping-sol
    Next.js (App Router, mix static + ISR + SSR per route)
    /api/availability  ← Route Handler — proxy al PMS
    /api/content       ← Route Handler — proxy CMS si aplica
    Custom domain: campingsol.com

  Vercel proyecto: site-hotel-mar
    ...mismo layout, domain hotelmar.com

  Vercel proyecto: cms-camping
    Payload CMS v3 (Next.js routes)
    /admin             ← Payload admin UI
    /api/payload/*     ← Payload REST/GraphQL
    /api/ai/*          ← Route Handler — proxy Claude API
    Custom domain: cms.campingsol.com (cliente-aware via routing)

  Vercel proyecto: cms-hotel
    ...mismo layout, atiende todos los clientes type=hotel

  Vercel Postgres
    platform-db                ← config global, tenants, audit_logs, backups
    camping-sol-db             ← exclusiva cliente 1
    hotel-mar-db               ← exclusiva cliente 2
    ...una DB por cliente

  Vercel Blob Storage
    bucket: camping-sol-media  ← uploads cliente 1
    bucket: hotel-mar-media    ← uploads cliente 2

  Vercel Cron
    daily-backup-{slug}        ← snapshot Postgres → Blob Storage
    warm-cms-functions         ← keep-warm para Payload Functions

  GitHub Packages
    @hwe/*                     ← registry npm privado
```

---

## ESTRUCTURA DEL MONOREPO

```
hwe-platform/                      ← repositorio GitHub único
├── apps/
│   ├── site-template/             ← plantilla base Next.js estático
│   ├── site-camping-sol/          ← cliente 1 (copia de template)
│   ├── site-hotel-mar/            ← cliente 2
│   ├── portal-template/           ← plantilla portal cliente con IA
│   ├── portal-camping-sol/        ← portal.campingsol.com
│   ├── portal-hotel-mar/          ← portal.hotelmar.com
│   └── admin/                     ← panel agencia (vista global)
│
├── packages/
│   ├── @hwe/core-ui/              ← bloques base sin estilos visuales
│   ├── @hwe/booking/              ← BookingAdapter interface + adaptadores PMS
│   ├── @hwe/content/              ← ContentRepository interface + PayloadAdapter
│   ├── @hwe/analytics/            ← GTM hooks tipados + DataLayer
│   ├── @hwe/i18n/                 ← next-intl config + traducciones base
│   └── @hwe/config/               ← tsconfig, eslint, tailwind base compartido
│
├── docs/architecture/
│   ├── briefing.md            ← este documento
│   ├── systemPatterns.md          ← patrones de arquitectura
│   ├── techStack.md               ← decisiones de stack
│   └── decisions.md               ← log de decisiones
│
├── docs/
│   ├── backend-standards.md       ← DDD, SOLID, naming, testing
│   ├── frontend-standards.md      ← Next.js, next-intl, Tailwind
│   └── documentation-standards.md ← reglas de documentación
│
└── .github/
    └── workflows/
        ├── deploy-client.yml      ← deploy manual por cliente
        └── test-core.yml          ← tests automáticos en push
```

### Detalle de estructura React y convenciones de frontend

Este documento define la estructura **a nivel monorepo**. Los detalles del frontend (layout interno de `@hwe/core-ui`, contratos de bloques y templates, theming, compositions por cliente) viven separados para no engordar esta constitución y para que los agentes IA carguen solo lo que necesitan (ver DEC-003 sobre amortización de tokens):

- **Reglas** (siempre cargadas por cualquier agente frontend): `docs/specs/general/base-standards.md`, `docs/specs/frontend/frontend-standards.md`, `docs/specs/general/lifecycle.md`.
- **Cómo** (cargar por tarea): `docs/contracts/frontend/structure.md`, `docs/contracts/frontend/block-contract.md`, `docs/contracts/frontend/template-contract.md`, `docs/contracts/frontend/theme-tokens.md`, `docs/contracts/frontend/client-composition.md`.
- **Índice de carga**: `docs/README.md` mapea cada tipo de tarea (scaffold de bloque, nuevo template, bootstrap de site…) al conjunto mínimo de ficheros a leer. **Nunca cargar este `architecture.md` entero cuando un doc específico cubre la tarea.**

---

## CONFIGURACIÓN POR CLIENTE

> **Partially superseded by [DEC-009](./decisions.md#dec-009--remove-activeblocks-add-blockdefaults-to-clientconfigts) (2026-05-21).** The `activeBlocks` field (flat string array) has been removed from `client.config.ts` — it was redundant: no contract consumed it (BlockRenderer, scaffold-block, compositions), Payload `layout[]` already declares which blocks appear on each page, and `features` already gates which blocks are available per client. It is replaced by an optional `blockDefaults` record that configures per-block variant preferences (e.g. `BookingBlock: { defaultVariant: 'inline' }`). The snippet below is preserved as historical record; new `client.config.ts` files must follow DEC-009.
>
> **Additionally,** this section mentions `BookingBlock` as one of the active blocks. The component's location is updated by [DEC-010](./decisions.md#dec-010--bookingblock-in-hwecore-ui-bookingprovider-in-hwebooking): `BookingBlock` lives in `@hwe/core-ui` like any other block; `BookingProvider` and `useBookingAdapter()` live in `@hwe/booking`. Per [DEC-015](./decisions.md#dec-015--client-owned-blocks-with-shared-schemas-slot-based-composition-and-npm-subpath-exports) (2026-06-01), the path is `@hwe/core-ui/src/base-blocks/BookingBlock/` (renamed from `src/blocks/`).

Toda la personalización de un cliente vive en un solo fichero:

```typescript
// apps/site-camping-sol/client.config.ts
export const config: ClientConfig = {
  tenantId: 'camping-sol',
  domain: 'campingsol.com',
  portalDomain: 'portal.campingsol.com',
  cmsDomain: 'cms.campingsol.com',        // Payload en Hetzner
  locales: ['es', 'en', 'fr'],
  defaultLocale: 'es',

  // PMS del cliente — adapter pattern
  bookingAdapter: new CloudbedsAdapter({
    apiKey: env.CLOUDBEDS_KEY
  }),

  // Bloques activos en este cliente
  activeBlocks: [
    'HeroBlock',
    'GalleryBlock',
    'BookingBlock',
    'ServicesBlock',
    'MapBlock',
    'ReviewsBlock',
    'FAQBlock'
  ],

  // Features habilitadas
  features: {
    aiContentPortal: true,
    reviews: true,
    blog: false,
    restaurant: false,
    spa: false
  },

  // Tokens de diseño exportados de Figma
  theme: {
    tokens: './tokens/camping-sol.json'
  },

  // DB de este cliente en cdmon
  database: {
    url: env.CAMPING_SOL_DATABASE_URL
  }
}
```

---

## ARQUITECTURA DE BASE DE DATOS

### Modelo híbrido — DB por cliente

```
cdmon MariaDB
├── plataforma_db              ← compartida, config global
│   ├── tenants                ← registro de todos los clientes
│   ├── users                  ← usuarios de la agencia
│   ├── audit_logs             ← logs de acciones
│   └── backups                ← snapshots temporales de cambios IA
│
├── camping_sol_db             ← exclusiva cliente 1
│   ├── accommodations
│   ├── services
│   ├── pages
│   ├── media
│   └── ...schemas Payload
│
├── hotel_mar_db               ← exclusiva cliente 2
│   └── ...mismos schemas base + extensiones propias
│
└── hotel_costa_db             ← exclusiva cliente 3
    └── ...mismos schemas base + extensiones propias
```

### Schema tabla tenants (plataforma_db)

```sql
create table tenants (
  id            varchar(36) primary key,
  slug          varchar(100) unique not null,    -- 'camping-sol'
  domain        varchar(255) unique,             -- 'campingsol.com'
  portal_domain varchar(255),                    -- 'portal.campingsol.com'
  cms_domain    varchar(255),                    -- 'cms.campingsol.com'
  pms_adapter   varchar(50) not null,            -- 'cloudbeds' | 'mews'
  locales       json,                            -- ['es', 'en', 'fr']
  active_blocks json,
  features      json,
  core_version  varchar(20),                     -- '1.2.0'
  status        enum('active','inactive'),
  created_at    timestamp default now()
);
```

### Payload y los schemas por cliente

Payload crea las tablas automáticamente en la DB del cliente al arrancar.
Los schemas se definen en TypeScript — nunca desde la UI de Payload.

```typescript
// Schema BASE compartido por todos los clientes
// packages/@hwe/content/schemas/base/accommodation.ts
export const baseAccommodation = {
  fields: [
    { name: 'title',       type: 'text'    },
    { name: 'description', type: 'richText' },
    { name: 'price',       type: 'number'  },
    { name: 'maxGuests',   type: 'number'  },
    { name: 'images',      type: 'array'   },
  ]
}

// Schema EXTENDIDO solo para campings
// apps/site-camping-sol/payload/schemas/accommodation.ts
export const accommodation = {
  ...baseAccommodation,
  fields: [
    ...baseAccommodation.fields,
    { name: 'plotSize',       type: 'number'  },
    { name: 'shadedPlot',     type: 'boolean' },
    { name: 'electricHookup', type: 'boolean' },
  ]
}
```

---

## ARQUITECTURA DDD — 4 CAPAS

```
PRESENTATION
  Next.js pages (compiladas como HTML estático)
  Payload Admin UI (en Hetzner, cms.cliente.com)
  Portal cliente (Next.js estático en cdmon)
        ↓
APPLICATION
  BookingService, ContentService,
  TenantService, AnalyticsService,
  AIContentService
        ↓
DOMAIN
  Tenant, Accommodation, Booking,
  Availability, Reservation, Block,
  ContentRepository (interface),
  BookingAdapter (interface)
        ↓
INFRASTRUCTURE
  Prisma, PayloadAdapter, CloudbedsAdapter,
  MewsAdapter, PHPProxyAdapter,
  EmailService, StorageService
```

**Regla de oro:** nunca `if (client === 'camping-sol')` en el core.

---

## PHP PROXY EN CDMON

PHP resuelve el problema de llamadas a APIs externas desde una web estática.
Las credenciales nunca se exponen al navegador.

```php
<?php
// /web/api/availability.php
// Proxy seguro para API del PMS

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: https://campingsol.com');

$pms_key = getenv('CLOUDBEDS_KEY');  // variable de entorno del servidor

$response = file_get_contents(
  'https://api.cloudbeds.com/availability?' . $_SERVER['QUERY_STRING'],
  false,
  stream_context_create([
    'http' => ['header' => 'Authorization: Bearer ' . $pms_key]
  ])
);

echo $response;
```

```javascript
// Next.js estático llama al PHP proxy
// Las credenciales del PMS nunca llegan al navegador
const res = await fetch('/api/availability.php?checkin=2025-08-01')
const data = await res.json()
```

---

## BOOKING ENGINE

**Component location updated by [DEC-010](./decisions.md#dec-010--bookingblock-in-hwecore-ui-bookingprovider-in-hwebooking) (2026-05-21).** `BookingBlock` and `BookingWidget` live in `@hwe/core-ui` (not in `@hwe/booking/react/`). `@hwe/booking` exports the `BookingAdapter` interface, stock adapters, `BookingProvider`, and `useBookingAdapter()` — no UI components. The PHP proxy references are superseded by [DEC-007](./decisions.md#dec-007) (Next.js Route Handlers). Per [DEC-015](./decisions.md#dec-015--client-owned-blocks-with-shared-schemas-slot-based-composition-and-npm-subpath-exports) (2026-06-01), the path inside the package is `src/base-blocks/BookingBlock/` (renamed from `src/blocks/`).

### Interface común para todos los PMS

```typescript
export type BookingMode = 'native' | 'iframe' | 'redirect'
export type AvailabilityMode = 'realtime' | 'polling' | 'static'

export interface AdapterCapabilities {
  bookingMode: BookingMode
  availabilityMode: AvailabilityMode
  supportsWebhooks: boolean
  supportsCancellation: boolean
  supportsMultiRoom: boolean
  currency: string
  iframeUrl?: string
  redirectUrl?: string
}

export interface BookingAdapter {
  getCapabilities(): AdapterCapabilities
  getAvailability(params: AvailabilityQuery): Promise<AvailabilityResult>
  createReservation(params: ReservationRequest): Promise<ReservationResult>
  cancelReservation?(id: string): Promise<void>
}
```

### Flujo de reserva

```
Usuario selecciona fechas en web estática
  ↓
fetch a /api/availability.php (PHP proxy en cdmon)
  ↓
PHP llama al PMS con credenciales seguras
  ↓
PMS devuelve disponibilidad y precios
  ↓
Web muestra disponibilidad
  ↓
Usuario inicia reserva → salto al motor del PMS
  ↓
PMS gestiona el proceso completo de reserva
```

**Los precios NUNCA se guardan en el sistema — siempre vienen del PMS.**
**Primera fase: solo búsqueda + salto al PMS. El PMS gestiona la reserva.**

---

## CONTENT REPOSITORY — PORTABILIDAD DEL CMS

```typescript
// Esta interface NUNCA cambia — es el contrato permanente
export interface ContentRepository {
  getPage(slug: string, locale: string): Promise<Page>
  getRooms(tenantId: string, filters?: RoomFilters): Promise<Room[]>
  getServices(tenantId: string): Promise<Service[]>
  getMedia(id: string): Promise<Media>
  searchContent(query: string, tenantId: string): Promise<SearchResult[]>
}

// Hoy — Payload en Hetzner
contentRepository: new PayloadAdapter({ baseUrl: env.CMS_URL })

// Futuro — cualquier alternativa sin tocar Next.js
contentRepository: new DirectDBAdapter({ db: prisma })
contentRepository: new TinaCMSAdapter({ token: env.TINA_TOKEN })
```

Next.js nunca importa nada de Payload directamente.
Cambiar de CMS = cambiar el adaptador en client.config.ts.
El contenido se exporta en JSON neutro diariamente — siempre portable.

### Rich text en Markdown

El rich text se guarda en Markdown — no en Lexical nativo de Payload.
Razón: formato universal, cualquier CMS lo lee, la IA lo entiende mejor.

---

## SISTEMA DE BLOQUES Y FLUJO FIGMA

**Extended by [DEC-008](./decisions.md#dec-008--structural-variants-for-complex-blocks) (2026-05-21).** The block variant system now supports structural variants (different components per variant, not just CVA styling). See `docs/contracts/frontend/block-contract.md` §Structural variants. `activeBlocks` is replaced by `blockDefaults` per [DEC-009](./decisions.md#dec-009--remove-activeblocks-add-blockdefaults-to-clientconfigts).

> **⚠ Superseded/Extended by [DEC-015](decisions.md#dec-015--client-owned-blocks-with-shared-schemas-slot-based-composition-and-npm-subpath-exports) (2026-06-01).** See decisions.md for the current model. Key changes: `packages/core-ui/src/blocks/` → `base-blocks/`; schemas → `schemas/`; types → `types/`; client sites own their block implementations in `src/blocks/`; `BlockRenderer` accepts `layout: BlockInstance[]` + optional `blocks` client map; `blockRegistry.ts` → `baseBlockRegistry.ts`; three usage levels (re-export / slots / full custom); slot pattern via `{Name}Block.slots.ts`; token cascade global → semantic → brand in `createhwePreset()`; one `globals.css` per client, zero CSS per block; new `composition-rules/` module.

### Tres capas

```
Capa 1 — @hwe/core-ui (bloques base)
  Estructura y lógica — sin estilos visuales
  HeroBlock, GalleryBlock, BookingBlock,
  ServicesBlock, MapBlock, ReviewsBlock,
  FAQBlock, TestimonialsBlock...
  Cada bloque tiene variantes declaradas (full, split, slider...)

Capa 2 — Tokens por cliente (desde Figma)
  Figma Variables → script exporta → tailwind.config.ts
  Colores, tipografías, radios, sombras del cliente
  Convención de nombres obligatoria:
    color/primary/default → colors.primary.DEFAULT
    typography/font/heading → fontFamily.heading
    spacing/4 → spacing[4]

Capa 3 — Composición con Figma Make como referencia
  Diseñador crea el site en Figma
  Figma Make genera código completo como referencia visual
  Dev analiza el código generado y mapea a bloques @hwe/core-ui
  Dev construye con los bloques correctos y sus variantes
  Resultado: código limpio, semántico, que sigue las convenciones
```

### Flujo completo Figma → producción

```
1. Cliente entrega branding (logo, colores, tipografías)
   ↓
2. Diseñador crea site completo en Figma
   usando Variables con convención de nombres
   ↓
3. Script exporta Variables de Figma → tailwind.config.ts
   automático, 2 minutos
   ↓
4. Figma Make genera código completo del site
   REFERENCIA VISUAL — no código de producción
   ↓
5. Claude Code recibe:
   - Código generado por Figma Make
   - Catálogo de bloques @hwe/core-ui (del memory-bank)
   - tailwind.config.ts del cliente
   - docs/frontend-standards.md
   ↓
6. Claude analiza el código de Figma Make y construye
   el site equivalente usando bloques de @hwe/core-ui:
   "<div class='hero full-width'>" → <HeroBlock variant="full" />
   "<div class='gallery slider'>" → <GalleryBlock variant="slider" />
   "<div class='booking inline'>" → <BookingBlock variant="inline" />
   ↓
7. Dev revisa el código generado por Claude y aprueba
   Claude hace los ajustes necesarios
   ↓
8. Deploy a staging — validación visual con el cliente
   ↓
9. Cliente aprueba → producción
```

### Por qué Figma Make es referencia y no producción

```
Figma Make genera           Claude con @hwe/core-ui genera
────────────────────        ──────────────────────────────
HTML/CSS genérico           TypeScript tipado
Sin accesibilidad           ARIA labels correctos
Sin semántica HTML          Semántica correcta
Sin convenciones propias    Sigue DDD, SOLID, ai-specs
Sin conexión a Payload      Conectado al CMS via ContentRepo
Sin i18n                    next-intl integrado
Sin GTM hooks               @hwe/analytics integrado
No escalable                Reutiliza bloques del core
```

### Rol del dev en este flujo

```
Dev NO hace               Dev SÍ hace
──────────────────        ──────────────────────────
Analizar Figma Make       Revisar el código de Claude
Mapear bloques            Aprobar o pedir ajustes
Escribir componentes      Validar accesibilidad y SEO
                          Deploy a staging
                          Validación final con cliente
```

### Checklist del dev al revisar código de Claude

```
□ El bloque elegido es el correcto para cada sección
□ La variante del bloque corresponde al diseño
□ tailwind.config.ts tiene todos los tokens necesarios
□ Las props de cada bloque están correctamente tipadas
□ La comparación visual con Figma Make es fiel
□ Accesibilidad, semántica HTML y i18n correctos
□ Conexiones a Payload y analytics funcionan
```

### Figma Master de la agencia

```
hwe Master Figma (referencia para todos los diseñadores)
├── Catálogo de bloques documentado
│   ├── HeroBlock — variantes: full, split, minimal
│   ├── GalleryBlock — variantes: grid, slider, masonry
│   ├── BookingBlock — variantes: inline, floating, sidebar
│   └── ...cada bloque con sus variantes
│
├── Tokens base (valores por defecto)
│   Colores neutros, tipografías, espaciados base
│
└── Kit de personalización por cliente
    Plantilla de Variables a rellenar con branding del cliente
```

### Estados del Figma en el flujo de trabajo

```
🔴 In Progress  → diseñador trabajando, no tocar
🟡 Review       → diseñador terminó, tech lead revisa:
                   ✓ Variables con nombres correctos
                   ✓ Secciones usan bloques del catálogo
                   ✓ Mobile y desktop diseñados
🟢 Ready for dev → tech lead aprobó
                   Dev puede ejecutar Figma Make y construir
✅ Approved     → cliente validó staging → deploy producción
```

### Lo que Payload almacena por página

```typescript
{
  slug: 'home',
  blocks: [
    { type: 'HeroBlock',     variant: 'full',    order: 1, content: {...} },
    { type: 'GalleryBlock',  variant: 'slider',  order: 2, content: {...} },
    { type: 'BookingBlock',  variant: 'floating', order: 3, content: {} }
  ]
}
```

**Payload nunca almacena layout, columnas, colores ni espaciados.**

---

## SISTEMA DE IA

### Generación de contenido (agencia)

```
Agencia describe en lenguaje natural
  ↓
Claude API (via PHP proxy en cdmon) genera contenido
  estructurado según schema de Payload
  ↓
Validación con Zod contra schema antes de guardar
  ↓
Guardado en Payload como DRAFT — nunca Published directo
  ↓
Agencia revisa en cms.cliente.com y publica
  ↓
GitHub Actions detecta publicación → recompila Next.js → sube a cdmon
  ↓
Web actualizada en ~2-3 minutos
```

### Cambios de contenido (cliente via portal)

```
Cliente describe cambio en chat o formulario guiado
  ↓
IA (via PHP proxy) interpreta y muestra qué va a cambiar:
"Voy a cambiar la foto principal de Cabaña Bosque
 por la imagen que enviaste. ¿Confirmas?"
  ↓
Cliente confirma
  ↓
Sistema guarda backup temporal (30 días) en plataforma_db
  ↓
IA hace el cambio en Payload via API
  ↓
GitHub Actions recompila y sube a cdmon (~2-3 minutos)
  ↓
Si algo falla → restauración automática desde backup
```

### Reordenación de bloques (solo agencia)

```
Agencia: "Pon la galería antes del booking"
  ↓
Claude genera nuevo array de bloques reordenado
  ↓
Agencia revisa y aprueba en Payload
  ↓
GitHub Actions recompila → web actualizada en ~2-3 minutos
```

### Reglas de seguridad IA

- Claude API siempre llamada desde PHP en cdmon — nunca desde el navegador
- IA solo puede modificar contenido del tenant autenticado
- Nunca puede tocar estructura de bloques si es el cliente
- Nunca publica directamente — siempre requiere confirmación del usuario
- Todo validado con Zod antes de tocar la DB
- Backup temporal obligatorio antes de cualquier cambio — individual o masivo

---

## EDICIÓN MASIVA DE CONTENIDO

Tres mecanismos según el tipo de operación:

### Mecanismo 1 — Portal IA (cliente o agencia)

Para cambios simples aplicados a múltiples documentos.

```
"Añade wifi a todos los alojamientos"
"Cambia 'Reservar' por 'Reservar ahora' en todas las cabañas"
  ↓
IA obtiene lista completa de documentos de Payload
  ↓
IA muestra resumen antes de actuar:
"Voy a modificar 12 alojamientos añadiendo wifi. ¿Confirmas?"
  ↓
Usuario confirma
  ↓
Backup de TODOS los documentos antes de cambiar
  ↓
IA actualiza uno a uno via Payload API
  ↓
Un solo recompile al final — no uno por cambio
```

### Mecanismo 2 — Script de bulk operations (agencia)

Para migraciones de datos complejas, importación desde CSV,
cambios estructurales de campos o correcciones masivas post-IA.

```bash
# Ejemplos de uso
npm run content:bulk-update camping-sol \
  --collection=accommodations \
  --field=amenities \
  --operation=append \
  --value=wifi

npm run content:import camping-sol \
  --collection=accommodations \
  --file=precios-temporada.csv

npm run content:bulk-update camping-sol \
  --collection=accommodations \
  --field=price \
  --operation=multiply \
  --value=1.1    # subida de precios 10%
```

```typescript
// packages/@hwe/content/bulk-operations.ts
export async function bulkUpdate(
  tenantId: string,
  collection: string,
  filter: FilterQuery,
  operation: BulkOperation
): Promise<BulkResult> {
  const docs = await payload.find({ collection, where: filter })

  // Backup de todos antes de cambiar
  await backupAll(tenantId, collection, docs.docs)

  // Aplicar operación
  for (const doc of docs.docs) {
    await payload.update({
      collection,
      id: doc.id,
      data: operation.apply(doc)
    })
  }

  // Un solo recompile al final
  await triggerRebuild(tenantId)

  return { updated: docs.totalDocs }
}
```

### Mecanismo 3 — Payload admin directo (agencia)

Para correcciones puntuales en varios documentos concretos.
La agencia entra a `cms.campingsol.com`, filtra los documentos
que necesita corregir y edita directamente en la lista de Payload.
Sin scripts, sin IA — edición manual directa.

### Cuándo usar cada mecanismo

```
Mecanismo 1 — Portal IA
  ✓ Cambio simple en todos o en un grupo
  ✓ Lo pide el cliente o la agencia en lenguaje natural
  ✓ "Añade X a todos", "Cambia Y en todas las cabañas"

Mecanismo 2 — Script bulk
  ✓ Migración de datos desde CSV o sistema externo
  ✓ Cambio estructural de un campo
  ✓ Corrección masiva tras generación IA incorrecta
  ✓ Actualización de precios por temporada

Mecanismo 3 — Payload admin
  ✓ Corrección de 2-5 documentos concretos
  ✓ La agencia sabe exactamente qué documentos editar
  ✓ Cambio que no justifica escribir un script
```

---

## PÁGINAS DINÁMICAS

El diseñador diseña una sola página de referencia en Figma.
Next.js genera automáticamente una página por cada registro en Payload.

### Páginas estáticas vs dinámicas

```
Páginas estáticas              Páginas dinámicas
(diseño individual en Figma)   (una plantilla → N páginas)
──────────────────────         ──────────────────────────
/                              /alojamientos/[slug]
/alojamientos                  /servicios/[slug]
/servicios                     /blog/[slug]
/contacto
/sobre-nosotros
```

### Cómo funciona en Next.js static export

```typescript
// app/[locale]/alojamientos/[slug]/page.tsx

// Next.js genera todas las páginas en tiempo de compilación
export async function generateStaticParams() {
  const rooms = await contentRepository.getRooms('camping-sol')
  return rooms.map(room => ({
    slug: room.slug,
    locale: 'es'
  }))
}

// Misma plantilla, datos distintos por página
export default async function AccommodationPage({ params }) {
  const room = await contentRepository.getRoom(
    'camping-sol',
    params.slug
  )
  return <AccommodationTemplate room={room} />
}
```

### Lo que Figma Make recibe

El diseñador diseña `/alojamientos/cabana-bosque` con datos reales de ejemplo.
Figma Make genera el código de esa página de ejemplo.
Claude recibe ese código y genera:
- El componente `AccommodationTemplate` con props tipadas
- La función `generateStaticParams` que obtiene todos los slugs de Payload
- Next.js compila una página HTML por cada alojamiento automáticamente

### Cuando se añade contenido nuevo en Payload

```
Cliente añade "Cabaña Norte" en Payload via portal o CMS
  ↓
Payload webhook → GitHub Actions
  ↓
Next.js recompila → generateStaticParams incluye nuevo slug
  ↓
/alojamientos/cabana-norte aparece en cdmon
  ↓
Web actualizada en ~2-3 minutos
```

---

## PORTAL DE CLIENTE

Un portal Next.js estático por cliente: `portal.campingsol.com`
También compilado y subido a cdmon via GitHub Actions.

### Lo que el cliente puede hacer

- Chat libre en lenguaje natural para pedir cambios de contenido
- Formulario guiado para cambios estructurados
- Subir imágenes y fotos
- Ver historial de cambios realizados
- Deshacer cambios recientes (desde backup temporal)

### Lo que el cliente NO puede hacer

- Cambiar estructura de bloques o layout (solo agencia)
- Cambiar configuración técnica del site
- Acceder a datos de otros clientes
- Publicar directamente sin su propia confirmación

---

## CI/CD — FLUJO DE DEPLOY

```bash
# Deploy de un cliente específico — lanzado manualmente por el dev
npm run deploy:client camping-sol

# GitHub Actions workflow_dispatch:
# 1. Compila Next.js → genera HTML estático en /out
# 2. Ejecuta tests
# 3. Si pasan → sube via SSH a /web/camping-sol/ en cdmon
# 4. Si fallan → para y notifica al dev

# Deploy del core (packages @hwe/*)
# Se lanza automáticamente en push a main
# Publica nueva versión en Verdaccio
# Cada cliente actualiza cuando el dev lo decide
```

```yaml
# .github/workflows/deploy-client.yml
on:
  workflow_dispatch:
    inputs:
      client:
        description: 'Cliente a desplegar (camping-sol, hotel-mar...)'
        required: true
      core_version:
        description: 'Versión del core (opcional)'
        required: false
```

Camping Sol puede estar en v1.2.0 y Hotel Mar en v1.5.0 sin problema.

---

## REPOSITORIOS GIT

### Estructura de repos en GitHub

```
GitHub Organization: tuagencia
  ├── hwe-platform/           ← core + packages + templates (privado)
  │     packages/@hwe/*
  │     apps/site-template/
  │     apps/portal-template/
  │
  ├── site-camping-sol/       ← solo este cliente (privado)
  ├── site-hotel-mar/         ← solo este cliente (privado)
  ├── portal-camping-sol/     ← portal cliente 1 (privado)
  └── portal-hotel-mar/       ← portal cliente 2 (privado)
```

### Permisos por equipo

```
GitHub Teams:
  core-devs
    → hwe-platform (lectura/escritura)

  camping-sol-devs
    → hwe-platform (solo lectura)
    → site-camping-sol (lectura/escritura)

  hotel-mar-devs
    → hwe-platform (solo lectura)
    → site-hotel-mar (lectura/escritura)

  admin-agencia
    → todos los repos
```

Cada dev solo clona lo que necesita.
Un dev externo de un cliente no ve el código de otros clientes.

### Flujo de trabajo diario

```bash
# Dev trabajando en camping-sol
git clone https://github.com/tuagencia/hwe-platform   # una vez
git clone https://github.com/tuagencia/site-camping-sol # una vez

# Desarrollo
cd site-camping-sol
# ... cambios
git push  # GitHub Actions despliega a cdmon
```

---

## VERSIONADO DEL CORE

### Un solo repo — hwe-platform

```
github.com/tuagencia/hwe-platform    ← un solo repo siempre
  main branch                        ← desarrollo activo

No hay hwe-platform-v2/ ni repos separados por versión.
Las versiones son packages publicados en GitHub Packages.
```

### Changesets — gestión de versiones automática

Herramienta estándar para monorepos TypeScript con Turborepo.
Automatiza versionado semántico, CHANGELOG y publicación en GitHub Packages.

```bash
# 1. Dev implementa el cambio en hwe-platform
# 2. Dev describe el cambio con Changesets
npx changeset
# → selecciona qué packages cambió (@hwe/booking)
# → selecciona el tipo (major/minor/patch)
# → describe el cambio ("Add Mews PMS adapter")
# → crea fichero en .changeset/ automáticamente

# 3. Dev hace PR normal con código + fichero changeset
# 4. Tech lead aprueba y mergea
# 5. GitHub Actions detecta el changeset
#    → abre PR automático "Version Packages"
# 6. Tech lead mergea ese PR cuando quiere publicar
#    → GitHub Actions publica en GitHub Packages
#    → CHANGELOG.md actualizado automáticamente
```

### Versiones independientes por package

```
@hwe/core-ui    v1.3.0  ← nueva feature de bloques
@hwe/booking    v1.1.2  ← bug fix en adapter
@hwe/content    v1.2.0  ← nueva feature de export
@hwe/ai         v1.0.0  ← sin cambios este ciclo
```

Cada package tiene su propia versión — no se actualizan todos a la vez.

### GitHub Packages — versiones disponibles

```
github.com/tuagencia/packages
  @hwe/core-ui
    1.0.0, 1.1.0, 1.2.0, 1.3.0    ← historial completo
  @hwe/booking
    1.0.0, 1.1.0, 1.1.1, 1.2.0    ← cada release publicado
```

### Versionado semántico

```
PATCH  1.1.1  ← bug fix — actualizar pronto, siempre seguro
MINOR  1.2.0  ← nueva feature compatible — actualizar cuando convenga
MAJOR  2.0.0  ← breaking change — revisar antes, guía de migración
```

### Repos de cliente — versión congelada

```
site-camping-sol/package.json
  "@hwe/core-ui": "1.1.0"   ← usa esta versión
  "@hwe/booking": "1.2.0"   ← no se actualiza solo

site-hotel-mar/package.json
  "@hwe/core-ui": "1.3.0"   ← versión distinta, sin problema
```

### Actualizar un cliente

```bash
cd site-camping-sol
npm update @hwe/booking        # actualiza a última versión
npm run build                  # verifica que todo funciona
git push                       # deploy automático a cdmon
```

### Scripts de gestión

```bash
npm run versions:check              # ver qué versión tiene cada cliente
npm run update:client camping-sol   # actualizar un cliente concreto
npm run update:all-clients          # actualizar todos (solo patches)
```

### Documentación por versión

```
hwe-platform/
  docs/
    architecture.md   ← siempre versión actual
    architecture-all-options.md
    migration/
      v1-to-v2.md                ← guía de migración breaking changes
  CHANGELOG.md                   ← generado automáticamente por Changesets

# Ver arquitectura de una versión anterior
git show v1.2.0:docs/architecture/architecture.md
```

---

## STAGING

Cada cliente tiene su entorno de staging en cdmon antes de ir a producción.

```
cdmon /staging/camping-sol/    ← staging.campingsol.com
cdmon /staging/hotel-mar/      ← staging.hotelmar.com
```

### Flujo de deploy con staging

```bash
# 1. Deploy a staging primero
npm run deploy:staging camping-sol
# GitHub Actions compila y sube a /staging/camping-sol/

# 2. Cliente valida en staging.campingsol.com

# 3. Si aprueba → deploy a producción
npm run deploy:client camping-sol
# GitHub Actions sube a /web/camping-sol/
```

### Cuándo se usa staging

```
✓ Primer deploy de un cliente nuevo
✓ Cambios visuales importantes (nuevo bloque, nuevo layout)
✓ Actualizaciones de versión del core
✗ Cambios de contenido menores via IA — van directo a producción
  tras confirmación del cliente en el portal
```

---

## BACKUPS

### Dos niveles de backup

**Nivel 1 — Backup diario completo (cdmon /backup_db)**
```
cdmon /backup_db/
  camping_sol_db_2026-05-12.sql
  hotel_mar_db_2026-05-12.sql
  plataforma_db_2026-05-12.sql
```
cdmon gestiona este backup automáticamente.
Retención: según política de cdmon (consultar con soporte).

**Nivel 2 — Backup temporal por cambio IA**
```
plataforma_db.backups
  id, tenant_id, collection, document_id,
  snapshot (JSON completo del documento),
  created_at, expires_at (30 días)
```

Antes de cada cambio via IA:
- Sistema guarda snapshot del estado actual en plataforma_db.backups
- TTL de 30 días — se purga automáticamente
- El cliente puede deshacer desde el portal: "vuelve a la versión anterior"
- La agencia puede restaurar cualquier versión de los últimos 30 días

```typescript
// Flujo de backup antes de cambio IA
const backup = await payload.findByID({ collection, id: documentId })
await db.backups.create({
  tenantId,
  collection,
  documentId,
  snapshot: JSON.stringify(backup),
  expiresAt: addDays(new Date(), 30)
})
// Hacer el cambio
await payload.update({ ... })
```

---

## MONITORIZACIÓN

Sistema basado en Playwright + GitHub Actions + email. Sin coste extra.

### Health checks automáticos

```yaml
# .github/workflows/health-check.yml
on:
  schedule:
    - cron: '0 * * * *'   # cada hora

jobs:
  check:
    runs-on: ubuntu-latest
    steps:
      - name: Test camping-sol
        run: npx playwright test health-checks/camping-sol.spec.ts
      - name: Test hotel-mar
        run: npx playwright test health-checks/hotel-mar.spec.ts
      - name: Notify on failure
        if: failure()
        uses: dawidd6/action-send-mail@v3
        with:
          to: webmaster@tuagencia.com
          subject: "🔴 Site caído: ${{ github.job }}"
          body: "El health check ha fallado. Revisar logs."
```

### Qué comprueban los health checks

```typescript
// health-checks/camping-sol.spec.ts
test('home carga correctamente', async ({ page }) => {
  await page.goto('https://campingsol.com')
  await expect(page).toHaveTitle(/Camping Sol/)
  await expect(page.locator('nav')).toBeVisible()
})

test('booking widget responde', async ({ page }) => {
  await page.goto('https://campingsol.com')
  const response = await page.request.get('/api/availability.php')
  expect(response.status()).toBeLessThan(500)
})
```

### Logs de errores

```
cdmon /logs/
  camping-sol-error.log    ← errores PHP proxy
  hotel-mar-error.log
  plataforma-error.log
```

PHP escribe en estos logs. GitHub Actions los revisa en cada health check.

---

## GESTIÓN DE IMÁGENES

Las imágenes subidas por el cliente via el portal se almacenan en cdmon.

```
cdmon /web/camping-sol/uploads/
  hero/
    hero-principal.jpg
    hero-cabanas.jpg
  accommodations/
    cabana-bosque-1.jpg
    cabana-bosque-2.jpg
  services/
    piscina.jpg
```

Apache sirve las imágenes directamente como archivos estáticos.
URL pública: `campingsol.com/uploads/accommodations/cabana-bosque-1.jpg`

### Flujo de subida de imagen

```
Cliente sube imagen via portal
  ↓
Portal envía imagen al PHP en cdmon
  ↓
PHP valida: tipo (jpg, png, webp), tamaño máximo (5MB)
PHP redimensiona si necesario (max 2000px ancho)
PHP guarda en /web/camping-sol/uploads/
  ↓
PHP devuelve la URL pública al portal
  ↓
IA usa esa URL en el campo de imagen de Payload
```

### Consideraciones

- Espacio en disco de cdmon a monitorizar — revisar periódicamente
- Imágenes antiguas purgar manualmente o con script cuando se actualizan
- No hay CDN — Apache sirve directamente desde España
  Para clientes con mucho tráfico internacional, valorar Cloudflare free tier como CDN encima

---

## SEGURIDAD

- Variables de entorno: nunca en código — en .env local (dev) y servidor (prod)
- Claves PMS: guardadas como variables de entorno en cdmon — PHP las lee con getenv()
- Claude API key: variable de entorno en cdmon — PHP la lee, nunca al browser
- Payload: 2FA obligatorio para todos los usuarios admin
- MariaDB: usuario dedicado por DB de cliente, sin acceso cruzado
- IA: validación Zod antes de cualquier escritura en DB
- Backups: doble nivel — diario cdmon + temporal por cambio IA (30 días)
- HTTPS: Nginx + Certbot en Hetzner gestiona SSL automáticamente
- Audit log: todo cambio registrado con usuario, timestamp y acción
- PHP proxy: CORS restringido al dominio del cliente
- Imágenes: validación de tipo y tamaño antes de guardar
- Health checks: Playwright cada hora + email a webmaster si falla

---

## MULTIIDIOMA Y SEO

```
next-intl
  Rutas por locale: /es, /en, /fr
  Páginas generadas estáticamente por cada locale
  hreflang en el HTML compilado
  Metadata por locale desde Payload en tiempo de build

Schema.org
  LodgingBusiness por cliente
  Structured data en cada página compilada

Geo-redirect
  PHP en cdmon detecta Accept-Language del browser
  Redirige al locale correcto automáticamente
```

---

## ANALYTICS

```typescript
// packages/@hwe/analytics/hooks.ts
useTrackEvent('booking_start', {
  property_id: 'camping-sol',
  check_in: '2025-08-01',
  check_out: '2025-08-07',
  adults: 2,
  children: 1
})
// El hook gestiona el push a GTM dataLayer
// Schema de eventos tipado — sin strings mágicos
```

Eventos estándar: page_view, accommodation_view, booking_start,
booking_step, booking_complete, booking_abandon, search, filter_apply

---

## OPENAPI Y DOCUMENTACIÓN

- OpenAPI generado automáticamente desde Zod schemas (zod-openapi)
- Payload genera su OpenAPI automáticamente via plugin oficial
- Nunca escrito a mano — siempre sincronizado con el código

---

## MEMORY-BANK Y AI-SPECS

### docs/architecture/ (contexto del proyecto para IA)

```
docs/architecture/
  briefing.md      ← este documento resumido
  systemPatterns.md    ← adapter pattern, content repo, DDD layers
  techStack.md         ← decisiones de stack y por qué
  decisions.md         ← log cronológico de decisiones
  dataModel.md         ← schema DB con diagrama ERD Mermaid
```

### docs/ (reglas para agentes IA)

```
docs/
  backend-standards.md       ← DDD, SOLID, naming, testing 90% coverage
  frontend-standards.md      ← Next.js static export, next-intl, Tailwind
  documentation-standards.md ← actualizar docs antes de commit
```

### Regla de modelo por tarea

- Opus: decisiones de arquitectura, diseño de schemas, revisión de seguridad
- Sonnet: implementar adaptadores, componentes, scripts, tests
- Haiku: tareas repetitivas, traducir copies, formatear datos

---

---

## HARNESS ENGINEERING — GESTIÓN DE PROMPTS

### Estructura de prompts

Los prompts viven en ficheros Markdown en el repo — versionados en Git,
editables sin deploy, compartidos entre todos los clientes.

```
packages/@hwe/ai/
  prompts/
    content-generation.md    ← generación inicial de contenido
    content-edit.md          ← cambios simples via portal
    bulk-operations.md       ← operaciones masivas
    code-generation.md       ← Figma Make → @hwe/core-ui
    block-reorder.md         ← reordenación de bloques
```

### Construcción de prompts con contexto del tenant

Cada llamada a Claude incluye el contexto específico del cliente:

```typescript
// packages/@hwe/ai/prompt-builder.ts

export function buildSystemPrompt(tenant: TenantConfig): string {
  return `
Eres un asistente especializado en gestión de contenido
para ${tenant.name}, un ${tenant.type} en ${tenant.location}.

SCHEMAS DISPONIBLES:
${JSON.stringify(tenant.schemas, null, 2)}

REGLAS:
- Solo puedes modificar contenido del tenant ${tenant.id}
- Nunca modifiques estructura de bloques
- Siempre responde en JSON válido según el schema
- Muestra al usuario qué vas a cambiar antes de hacerlo
- Idioma por defecto: ${tenant.defaultLocale}

TONO DE COMUNICACIÓN:
${tenant.brandVoice}
  `
}
```

### Validación de outputs con Zod

Todo output de Claude se valida antes de tocar Payload.
Claude puede equivocarse — Zod es la red de seguridad.

```typescript
// packages/@hwe/ai/validators.ts

const AccommodationAIOutput = z.object({
  title: z.record(z.string()),
  description: z.record(z.string()),
  price: z.number().positive(),
  maxGuests: z.number().int().positive(),
  amenities: z.array(z.string()),
})

// Nunca se guarda en Payload sin pasar por aquí
const validated = AccommodationAIOutput.parse(claudeOutput)
```

### Observabilidad — log de cada llamada

```typescript
// packages/@hwe/ai/logger.ts

// Cada llamada a Claude queda registrada
await aiLogger.log({
  tenantId,
  agentId: rule.id,
  model: rule.model,
  promptSent: systemPrompt + userMessage,
  responseReceived: claudeOutput,
  validationPassed: true | false,
  tokensUsed: { input, output },
  estimatedCost: calculateCost(rule.model, tokens),
  actionTaken: 'updated accommodation title',
  timestamp: new Date()
})
```

### Versionado de prompts

```
prompts/content-generation/
  v1.0.md    ← versión inicial
  v1.1.md    ← mejorada tras feedback
  v2.0.md    ← actual (symlink)
```

Si un prompt empieza a dar peores resultados,
se revierte al anterior cambiando el symlink.

---

## ARQUITECTURA DE AGENTES

### Los cinco agentes del sistema

```
AGENTE 1 — Content Editor
  Contexto:   portal-cliente
  Tareas:     cambios simples — texto, foto, precio
  Modelo:     claude-haiku-4-5 (rápido y barato)
  Autónomo:   no — confirmación del usuario siempre
  Backup:     sí — antes de cada cambio

AGENTE 2 — Content Generator
  Contexto:   panel-agencia
  Tareas:     generación inicial de alojamientos,
              servicios, FAQs en múltiples idiomas
  Modelo:     claude-sonnet-4-6
  Autónomo:   no — agencia revisa antes de publicar
  Backup:     no — genera en draft

AGENTE 3 — Bulk Operator
  Contexto:   panel-agencia
  Tareas:     edición masiva, migraciones, N documentos
  Modelo:     claude-sonnet-4-6
  Autónomo:   no — confirmación antes de actuar siempre
  Backup:     sí — backup de todos los docs afectados

AGENTE 4 — Code Builder
  Contexto:   claude-code (dev)
  Tareas:     Figma Make → @hwe/core-ui
  Modelo:     claude-sonnet-4-6
  Autónomo:   no — dev revisa siempre
  Backup:     no — código en Git

AGENTE 5 — Planner
  Contexto:   panel-agencia (uso interno)
  Tareas:     diseño de schemas, análisis de analytics,
              decisiones complejas de contenido
  Modelo:     claude-opus-4-6
  Autónomo:   no — siempre humano en el loop
  Backup:     no
```

### Sistema de reglas — controlado sin código

Las reglas definen qué agente usar en cada situación.
Se gestionan desde el panel de administración de la agencia
sin necesidad de deploy.

```typescript
// packages/@hwe/ai/agent-rules.ts

export const agentRules: AgentRule[] = [
  {
    id: 'content-simple-edit',
    description: 'Cambios simples de texto, foto o precio',
    context: 'portal-cliente',
    triggers: ['cambiar', 'actualizar', 'subir foto', 'precio'],
    model: 'claude-haiku-4-5',
    maxTokens: 1000,
    requiresConfirmation: true,
    requiresBackup: true,
    active: true
  },
  {
    id: 'content-generation',
    description: 'Generación de contenido inicial completo',
    context: 'panel-agencia',
    triggers: ['generar', 'crear contenido', 'redactar'],
    model: 'claude-sonnet-4-6',
    maxTokens: 8000,
    requiresConfirmation: true,
    requiresBackup: false,
    active: true
  },
  {
    id: 'bulk-operation',
    description: 'Operaciones masivas en múltiples documentos',
    context: 'panel-agencia',
    triggers: ['todos', 'masivo', 'todos los alojamientos'],
    model: 'claude-sonnet-4-6',
    maxTokens: 16000,
    requiresConfirmation: true,
    requiresBackup: true,
    active: true
  },
  {
    id: 'code-generation',
    description: 'Construcción de código desde Figma Make',
    context: 'claude-code',
    triggers: ['figma', 'componente', 'bloque'],
    model: 'claude-sonnet-4-6',
    maxTokens: 8000,
    requiresConfirmation: false,
    requiresBackup: false,
    active: true
  },
  {
    id: 'architecture-planning',
    description: 'Decisiones complejas de arquitectura y schemas',
    context: 'panel-agencia',
    triggers: ['diseñar schema', 'arquitectura', 'planificar'],
    model: 'claude-opus-4-6',
    maxTokens: 32000,
    requiresConfirmation: true,
    requiresBackup: false,
    active: true
  }
]
```

### Router — decide qué agente usar

```typescript
// packages/@hwe/ai/router.ts

export async function routeRequest(
  request: AIRequest,
  context: AgentContext
): Promise<AgentRule> {

  // Reglas activas para este contexto
  const contextRules = agentRules.filter(
    r => r.context === context && r.active
  )

  // Regla que más coincide con la petición
  const matched = contextRules.find(rule =>
    rule.triggers.some(trigger =>
      request.message.toLowerCase().includes(trigger)
    )
  )

  // Si no hay coincidencia → regla por defecto del contexto
  return matched ?? getDefaultRule(context)
}
```

### Control de tokens y costes por cliente

```typescript
// packages/@hwe/ai/token-tracker.ts

// Cada llamada registra su coste
await tokenTracker.log({
  tenantId,
  ruleId: rule.id,
  model: rule.model,
  inputTokens: usage.input,
  outputTokens: usage.output,
  estimatedCost: calculateCost(rule.model, usage),
  timestamp: new Date()
})

// Dashboard admin agencia:
// Por cliente: tokens usados este mes, operaciones, coste estimado
// Por tipo de operación: qué agente se usa más
// Alertas: si un cliente supera umbral de coste mensual
```

### Lo que controla la agencia sin tocar código

```
✓ Qué modelo usa cada tipo de operación
✓ Máximo de tokens por operación
✓ Si una operación requiere confirmación
✓ Si una operación requiere backup
✓ Activar o desactivar tipos de operaciones por cliente
✓ Ver coste por cliente y por tipo de operación
✓ Recibir alertas si se supera umbral de coste
```

### Estructura del package @hwe/ai

```
packages/@hwe/ai/
  agent-rules.ts         ← reglas configurables
  router.ts              ← decide qué agente usar
  prompt-builder.ts      ← construye prompts con contexto tenant
  validators.ts          ← Zod schemas para validar outputs
  logger.ts              ← logs de todas las llamadas
  token-tracker.ts       ← tracking de uso y costes por tenant
  agents/
    content-editor.ts    ← Haiku, cambios simples
    content-gen.ts       ← Sonnet, generación inicial
    bulk-operator.ts     ← Sonnet, operaciones masivas
    code-builder.ts      ← Sonnet, Figma Make → código
    planner.ts           ← Opus, arquitectura y planning
  prompts/
    content-generation.md
    content-edit.md
    bulk-operations.md
    code-generation.md
    block-reorder.md
```



```
Fase 1 — Desarrollo local
  Laragon                    $0 — gratis
  Todo en local              $0
  Total                      $0/mes

Fase 2 — Producción
  cdmon                      ya contratado — $0 extra
  Hetzner CX21               €5.5/mes — todos los clientes
  GitHub                     gratis (repo privado plan gratuito)
  Total extra                €5.5/mes independiente del nº de clientes
```

---

## PENDIENTES DE DEFINIR (no arquitectura — negocio)

```
○ Diccionario de dominio — nombres definitivos en inglés de todas las entidades
○ Primer cliente real — para diseñar schemas con caso concreto
○ Catálogo de bloques hospitality — qué bloques y qué variantes
○ Schema de DB completo — tablas, campos, relaciones con diagrama ERD
○ Schemas de Payload — colecciones base y extensiones por tipo de cliente
○ Confirmar cron jobs disponibles en cdmon (para automatizaciones futuras)
```

---

*Última actualización: Mayo 2026*
*Próximo paso: definir diccionario de dominio con primer cliente real*

 Figma Master de la agencia

```
hwe Master Figma
├── Catálogo de bloques (referencia para diseñadores)
│   ├── HeroBlock — variantes: full, split, minimal
│   ├── GalleryBlock — variantes: grid, slider, masonry
│   ├── BookingBlock — variantes: inline, floating, sidebar
│   └── ...cada bloque con sus variantes documentadas
├── Tokens base (valores por defecto)
└── Kit de personalización por cliente
    Plantilla de Variables a rellenar con branding del cliente
```

### Estados del Figma

```
🔴 In Progress  → diseñador trabajando
🟡 Review       → tech lead verifica convención de nombres y bloques
🟢 Ready for dev → Claude Code puede procesar
✅ Approved     → cliente validó staging → producción
```

---

## PÁGINAS DINÁMICAS

```typescript
// Una plantilla → N páginas generadas automáticamente
export async function generateStaticParams() {
  const rooms = await contentRepository.getRooms('camping-sol')
  return rooms.map(room => ({ slug: room.slug, locale: 'es' }))
}

export default async function AccommodationPage({ params }) {
  const room = await contentRepository.getRoom('camping-sol', params.slug)
  return <AccommodationTemplate room={room} />
}
```

Cuando el cliente añade contenido nuevo en Payload:
```
Payload webhook → GitHub Actions recompila
→ generateStaticParams incluye nuevo slug
→ nueva página en cdmon en ~2-3 minutos
```

---

## EDICIÓN MASIVA DE CONTENIDO

### Mecanismo 1 — Portal IA

```
"Añade wifi a todos los alojamientos"
  ↓
IA muestra resumen: "Voy a modificar 12 alojamientos. ¿Confirmas?"
  ↓
Backup de TODOS antes de cambiar
  ↓
IA actualiza uno a uno via Payload API
  ↓
Un solo recompile al final
```

### Mecanismo 2 — Script bulk operations

```bash
npm run content:bulk-update camping-sol \
  --collection=accommodations \
  --field=amenities \
  --operation=append \
  --value=wifi

npm run content:import camping-sol \
  --collection=accommodations \
  --file=precios-temporada.csv
```

### Mecanismo 3 — Payload admin directo

Para correcciones puntuales de 2-5 documentos.
La agencia entra a `cms.campingsol.com` y edita directamente.

### Cuándo usar cada uno

```
Portal IA      → cambio simple en todos o en un grupo
Script bulk    → migración desde CSV, corrección masiva post-IA
Payload admin  → corrección de pocos documentos concretos
```

---

## SISTEMA DE IA

### Generación de contenido (agencia)

```
Agencia describe en lenguaje natural
  ↓ Claude API via PHP proxy cdmon
Validación Zod contra schema
  ↓
Guardado en Payload como DRAFT
  ↓
Agencia revisa y publica
  ↓
GitHub Actions recompila → web en ~2-3 minutos
```

### Cambios via portal (cliente)

```
Cliente pide cambio
  ↓
IA muestra exactamente qué va a cambiar
  ↓
Cliente confirma
  ↓
Backup temporal en plataforma_db (TTL 30 días)
  ↓
IA hace el cambio en Payload
  ↓
GitHub Actions recompila → web en ~2-3 minutos
  ↓
Si algo falla → restauración automática desde backup
```

### Reordenación de bloques (solo agencia)

```
Agencia pide reordenar
  ↓
Claude genera nuevo array de bloques
  ↓
Agencia aprueba en Payload
  ↓
GitHub Actions recompila
```

### Reglas de seguridad IA

- Claude API siempre via PHP proxy en cdmon — nunca desde browser
- Solo modifica contenido del tenant autenticado
- Nunca toca estructura de bloques si es el cliente
- Nunca publica directamente — siempre confirmación
- Validación Zod obligatoria antes de tocar DB
- Backup obligatorio antes de cualquier cambio

---

## HARNESS ENGINEERING

### Estructura de prompts

```
packages/@hwe/ai/prompts/
  content-generation.md
  content-edit.md
  bulk-operations.md
  code-generation.md
  block-reorder.md
```

Versionados en Git. Editables sin deploy.
Si un prompt empeora → revertir con git.

### Construcción de prompts con contexto del tenant

```typescript
export function buildSystemPrompt(tenant: TenantConfig): string {
  return `
Eres un asistente para ${tenant.name}, un ${tenant.type}.
SCHEMAS: ${JSON.stringify(tenant.schemas)}
REGLAS:
- Solo modificas contenido del tenant ${tenant.id}
- Nunca modificas estructura de bloques
- Siempre responde en JSON válido
- Muestra al usuario qué vas a cambiar antes de actuar
- Idioma: ${tenant.defaultLocale}
TONO: ${tenant.brandVoice}
  `
}
```

### Validación obligatoria con Zod

```typescript
// Todo output de Claude pasa por Zod antes de tocar Payload
const validated = AccommodationAIOutput.parse(claudeOutput)
```

### Logging completo

```typescript
await aiLogger.log({
  tenantId, agentId, model,
  promptSent, responseReceived,
  validationPassed,
  tokensUsed: { input, output },
  estimatedCost,
  actionTaken,
  timestamp: new Date()
})
```

---

## ARQUITECTURA DE AGENTES

### Los cinco agentes

```
Content Editor    Haiku    portal-cliente   cambios simples texto/foto/precio
Content Generator Sonnet   panel-agencia    generación inicial completa
Bulk Operator     Sonnet   panel-agencia    operaciones masivas N documentos
Code Builder      Sonnet   claude-code      Figma Make → @hwe/core-ui
Planner           Opus     panel-agencia    arquitectura y schemas complejos
```

### Reglas configurables sin código

```typescript
export const agentRules: AgentRule[] = [
  {
    id: 'content-simple-edit',
    context: 'portal-cliente',
    triggers: ['cambiar', 'actualizar', 'subir foto', 'precio'],
    model: 'claude-haiku-4-5',
    maxTokens: 1000,
    requiresConfirmation: true,
    requiresBackup: true,
    active: true
  },
  {
    id: 'content-generation',
    context: 'panel-agencia',
    triggers: ['generar', 'crear contenido', 'redactar'],
    model: 'claude-sonnet-4-6',
    maxTokens: 8000,
    requiresConfirmation: true,
    requiresBackup: false,
    active: true
  },
  {
    id: 'bulk-operation',
    context: 'panel-agencia',
    triggers: ['todos', 'masivo', 'todos los alojamientos'],
    model: 'claude-sonnet-4-6',
    maxTokens: 16000,
    requiresConfirmation: true,
    requiresBackup: true,
    active: true
  },
  {
    id: 'code-generation',
    context: 'claude-code',
    triggers: ['figma', 'componente', 'bloque'],
    model: 'claude-sonnet-4-6',
    maxTokens: 8000,
    requiresConfirmation: false,
    requiresBackup: false,
    active: true
  },
  {
    id: 'architecture-planning',
    context: 'panel-agencia',
    triggers: ['diseñar schema', 'arquitectura', 'planificar'],
    model: 'claude-opus-4-6',
    maxTokens: 32000,
    requiresConfirmation: true,
    requiresBackup: false,
    active: true
  }
]
```

La agencia puede cambiar modelo, tokens, confirmación y backup
desde el panel admin sin tocar código y sin deploy.

### Control de tokens por cliente

```typescript
await tokenTracker.log({
  tenantId, ruleId, model,
  inputTokens, outputTokens,
  estimatedCost,
  timestamp: new Date()
})
// Dashboard: tokens usados por cliente, coste estimado, alertas de umbral
```

---

## PORTAL DE CLIENTE

Un portal Next.js estático por cliente: `portal.campingsol.com`
Compilado y subido a cdmon via GitHub Actions.

```
Cliente puede:
  ✓ Chat libre para cambios de contenido
  ✓ Formulario guiado para cambios estructurados
  ✓ Subir imágenes
  ✓ Ver historial de cambios
  ✓ Deshacer cambios (últimos 30 días)

Cliente NO puede:
  ✗ Cambiar estructura de bloques (solo agencia)
  ✗ Cambiar config técnica
  ✗ Ver datos de otros clientes
  ✗ Publicar sin confirmar
```

---

## CI/CD

```yaml
# .github/workflows/deploy.yml (en cada repo de cliente)
on:
  workflow_dispatch:
    inputs:
      environment:
        type: choice
        options: [staging, production]

jobs:
  deploy:
    steps:
      - npm ci                          # instala @hwe/* de GitHub Packages
      - npm run build                   # genera HTML estático
      - rsync a cdmon via SSH           # sube a /staging/ o /web/
```

```bash
# Desde hwe-platform — actualizar versión core de un cliente
npm run update:client camping-sol --version=1.3.0
# Abre PR automático en site-camping-sol con la actualización
```

---

## STAGING

```
cdmon /staging/camping-sol/    ← staging.campingsol.com
cdmon /staging/hotel-mar/      ← staging.hotelmar.com
```

Flujo: deploy:staging → cliente valida → deploy:production

Se usa para: primer deploy, cambios visuales importantes, actualizaciones de core.
No se usa para: cambios de contenido menores via IA.

---

## BACKUPS

```
Nivel 1 — Backup diario completo
  cdmon /backup_db/ — automático, gestionado por cdmon

Nivel 2 — Snapshot por cambio IA (TTL 30 días)
  plataforma_db.backups
  Antes de CADA cambio IA — individual o masivo
  Cliente puede deshacer desde el portal
```

---

## MONITORIZACIÓN

```yaml
# Playwright health checks cada hora via GitHub Actions cron
on:
  schedule:
    - cron: '0 * * * *'
# Si falla → email automático a webmaster
# Logs en cdmon /logs/
```

---

## GESTIÓN DE IMÁGENES

```
cdmon /web/camping-sol/uploads/
  hero/, accommodations/, services/
```

PHP valida tipo (jpg, png, webp) y tamaño (max 5MB) antes de guardar.
Apache sirve las imágenes directamente como estáticos.
URL: `campingsol.com/uploads/foto.jpg`

---

## SEGURIDAD

- Variables de entorno: nunca en código
- Claves PMS: getenv() en PHP — nunca al browser
- Claude API key: PHP proxy — nunca al browser
- Payload: 2FA obligatorio para todos los admins
- MariaDB: usuario dedicado por DB de cliente
- IA: validación Zod antes de cualquier escritura en DB
- Backups: doble nivel diario + snapshot por cambio IA
- HTTPS: Nginx + Certbot en Hetzner, SSL cdmon para frontend
- Audit log: todo cambio registrado
- PHP proxy: CORS restringido al dominio del cliente
- Imágenes: validación tipo y tamaño antes de guardar

---

## MULTIIDIOMA Y SEO

```
next-intl: rutas /es, /en, /fr
hreflang en HTML compilado
Metadata por locale desde Payload en tiempo de build
Schema.org LodgingBusiness por cliente
Geo-redirect: PHP detecta Accept-Language
Sitemaps generados en tiempo de build
```

---

## ANALYTICS

```typescript
useTrackEvent('booking_start', {
  property_id: 'camping-sol',
  check_in: '2025-08-01',
  adults: 2
})
// GTM DataLayer tipado — sin strings mágicos
```

---

## OPENAPI

OpenAPI generado automáticamente desde Zod schemas.
Payload genera su OpenAPI via plugin oficial.
Nunca escrito a mano.

---

## MEMORY-BANK Y AI-SPECS

```
docs/architecture/
  briefing.md      ← este documento resumido
  systemPatterns.md    ← adapter pattern, DDD, content repo
  techStack.md         ← decisiones de stack y por qué
  decisions.md         ← log cronológico
  dataModel.md         ← schema DB con ERD Mermaid

docs/
  backend-standards.md       ← DDD, SOLID, naming, testing 90%
  frontend-standards.md      ← Next.js static, next-intl, Tailwind
  documentation-standards.md ← actualizar docs antes de commit
```

Regla de modelo por tarea:
- Opus: arquitectura, schemas complejos, seguridad
- Sonnet: código, componentes, scripts, tests
- Haiku: tareas repetitivas, traducciones, datos

---

## COSTES

```
Fase 1 — Desarrollo local
  Laragon + todo en local     $0/mes

Fase 2 — Producción
  cdmon                       ya contratado
  Hetzner CX21                €5.5/mes (todos los clientes)
  GitHub Team                 $4/usuario/mes (5 devs = $20/mes)
  Total extra                 ~€25/mes independiente del nº de clientes

Si cdmon confirma Node.js persistente:
  Hetzner eliminado           €0/mes extra
  Total extra                 ~$20/mes (solo GitHub Team)
```

---

## PENDIENTES (no arquitectura — negocio)

```
○ Respuesta cdmon — procesos Node.js + mod_proxy + SSL wildcard
○ Diccionario de dominio — nombres definitivos en inglés
○ Primer cliente real — para diseñar schemas concretos
○ Catálogo de bloques hospitality — qué bloques y variantes
○ Schema de DB completo — tablas, campos, ERD Mermaid
○ Schemas de Payload — colecciones base y extensiones por tipo
○ Roles y permisos detallados — admin agencia, editor agencia, editor cliente
```

---

*Última actualización: Mayo 2026*
*Próximo paso: respuesta cdmon → diccionario de dominio*


---

## METODOLOGÍA DE DESARROLLO — SPECBOOT

hwe adopta el ciclo **SPECBOOT by LIDR** como metodología oficial de desarrollo.
Spec-Driven Development — la documentación es la fuente de verdad, el código viene después.

### El ciclo completo

```
User Story
  ↓ /enrich_us
Refined User Story
  ↓ /propose
Proposal Artifacts
  (specs, tests, docs, design)
  ↓ /apply
  ┌─────────────────────────┐
  │ Branch                  │
  │ Tests                   │
  │ Documentation           │  ← /verify + /code_review
  │ Code                    │  ← implement changes (loop)
  │ Testing Report          │
  │ Proposal Update         │
  └─────────────────────────┘
  ↓ /archive + /commit
Feature Ready → Feature for PR → Feature Published
```

### Comandos — contratos entre humano e IA

```
/enrich_us    ← Claude refina la User Story con contexto del memory-bank
               Añade criterios de aceptación, edge cases, dependencias

/propose      ← Claude genera Proposal Artifacts:
               specs técnicas, diseño de tests, docs a actualizar,
               impacto en schemas, componentes afectados

/apply        ← Claude implementa desde los artifacts:
               branch, tests primero (TDD), código, docs

/verify       ← Claude revisa el código implementado:
               contra los artifacts, contra docs/,
               contra los tests, contra las buenas prácticas

/code_review  ← Claude hace code review formal:
               seguridad, performance, consistencia con el core

/archive      ← Claude genera Testing Report y actualiza:
               Proposal Update, memory-bank, DataModel si cambió

/commit       ← Claude genera commit message descriptivo
               siguiendo convenciones del proyecto
```

### Estructura de artefactos en el repo

```
hwe-platform/
  docs/architecture/
    user-stories/          ← US refinadas por feature
      feat-booking-widget.md
      feat-ai-content-portal.md
    proposals/             ← artifacts generados por /propose
      feat-booking-widget/
        specs.md
        test-design.md
        api-changes.md
    testing-reports/       ← informes generados por /verify + /archive
      feat-booking-widget-report.md

  docs/
    specboot/
      commands.md          ← definición de cada comando
      enrich-us.md         ← cómo refinar una US con contexto hwe
      propose.md           ← qué artifacts genera /propose en hwe
      apply.md             ← cómo implementa Claude en hwe
      verify.md            ← checklist de /verify para hwe
      archive.md           ← qué actualiza /archive en hwe
```

### Reglas de SPECBOOT en hwe

```
1. Documentación antes que código
   Nunca se escribe código sin Proposal Artifacts aprobados

2. Tests antes que implementación (TDD)
   /apply escribe tests primero, luego código que los pasa

3. Proposal Update obligatorio
   Si el código difiere del proposal → actualizar el proposal
   Nunca dejar docs desincronizados con el código

4. /verify antes de PR
   Todo PR pasa por /verify con Claude antes de revisión humana

5. /archive antes de merge
   Testing Report generado y archivado antes de merge a main
```

### Cómo encaja con la arquitectura hwe existente

```
SPECBOOT                    hwe
────────────────────        ──────────────────────────
User Story                  Ticket en Linear
Refined User Story          docs/architecture/user-stories/
Proposal Artifacts          docs/architecture/proposals/
Branch                      git branch en repo del cliente
Tests                       Jest + Playwright
Documentation               OpenAPI + DataModel.md
Code                        Next.js + Payload + @hwe/*
Testing Report              docs/architecture/testing-reports/
Proposal Update             Actualización de docs/ y docs/architecture/
Feature for PR              Pull Request en GitHub
Feature Published           Deploy via GitHub Actions → cdmon
```

### Modelo de IA por fase del ciclo

```
/enrich_us    → Opus    (razonamiento complejo, contexto amplio)
/propose      → Opus    (diseño de arquitectura y specs)
/apply        → Sonnet  (implementación de código)
/verify       → Sonnet  (revisión de código)
/code_review  → Sonnet  (análisis de calidad)
/archive      → Haiku   (generación de reports, commit messages)
```


---

## SEGURIDAD COMPLETA

### 1 — Gestión de secretos

```
Keeper (fuente de verdad humana)
  Todas las claves del proyecto viven en Keeper
  Solo devs autorizados tienen acceso
  Rotación obligatoria si un dev abandona el proyecto

GitHub Secrets (distribución automática para CI/CD)
  Dev copia de Keeper → configura en GitHub Secrets
  GitHub Actions las lee automáticamente en deploys
  Nunca aparecen en logs ni en código

Por repo de cliente:
  CDMON_SSH_KEY          ← clave SSH para deploy
  CDMON_HOST             ← IP/host del servidor
  PAYLOAD_URL            ← URL del Payload en Hetzner
  DATABASE_URL           ← MariaDB del cliente
  PMS_API_KEY            ← clave del PMS
  CLAUDE_API_KEY         ← clave Claude para PHP proxy

GitHub Organization secrets (compartidos):
  HETZNER_API_KEY        ← para crear/gestionar VPS
  GITHUB_PACKAGES_TOKEN  ← para instalar @hwe/*

Entorno local (Laragon):
  .env.local             ← nunca en Git
  .env.example           ← sí en Git, con placeholders
  Dev obtiene valores reales de Keeper

Producción cdmon:
  Variables de entorno del servidor — PHP las lee con getenv()
  Next.js build — variables en el panel de GitHub Actions
  Nunca en ficheros .env en producción
```

### 2 — Rate limiting en PHP proxy

```php
// Límites por endpoint
// /api/availability.php  → 30 req/min por IP
// /api/ai.php            → 10 req/min por IP
// /api/upload.php        →  5 req/min por IP

function checkRateLimit($ip, $maxRequests = 30, $window = 60) {
  $file = sys_get_temp_dir() . '/rl_' . md5($ip);
  $data = file_exists($file)
    ? json_decode(file_get_contents($file), true)
    : ['count' => 0, 'start' => time()];

  if (time() - $data['start'] > $window) {
    $data = ['count' => 1, 'start' => time()];
  } else {
    $data['count']++;
  }

  file_put_contents($file, json_encode($data));

  if ($data['count'] > $maxRequests) {
    http_response_code(429);
    die(json_encode(['error' => 'Too many requests']));
  }
}
```

### 3 — Sanitización de uploads de imágenes

```php
// Verificar MIME real — nunca confiar en la extensión
$finfo = finfo_open(FILEINFO_MIME_TYPE);
$mimeType = finfo_file($finfo, $_FILES['image']['tmp_name']);

$allowedMimes = ['image/jpeg', 'image/png', 'image/webp'];
if (!in_array($mimeType, $allowedMimes)) {
  http_response_code(400);
  die(json_encode(['error' => 'Invalid file type']));
}

// Regenerar imagen con GD — elimina metadatos y código malicioso
$image = imagecreatefromstring(
  file_get_contents($_FILES['image']['tmp_name'])
);
$safePath = '/web/' . $tenantId . '/uploads/' . uniqid() . '.jpg';
imagejpeg($image, $safePath, 85);
imagedestroy($image);

// Nunca usar el nombre original del fichero
// Nunca guardar en una ruta predecible
```

### 4 — Headers de seguridad HTTP

Apache `.htaccess` por cliente en cdmon:

```apache
Header always set X-Frame-Options "SAMEORIGIN"
Header always set X-Content-Type-Options "nosniff"
Header always set X-XSS-Protection "1; mode=block"
Header always set Strict-Transport-Security "max-age=31536000; includeSubDomains"
Header always set Referrer-Policy "strict-origin-when-cross-origin"
Header always set Permissions-Policy "geolocation=(), microphone=(), camera=()"
Header always set Content-Security-Policy "
  default-src 'self';
  script-src 'self' 'unsafe-inline' https://www.googletagmanager.com
             https://consent.cookiebot.com;
  style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;
  font-src 'self' https://fonts.gstatic.com;
  img-src 'self' data: https:;
  connect-src 'self' https://api.anthropic.com;
  frame-src https://consent.cookiebot.com;
"
```

El CSP se ajusta por cliente según el PMS de booking que use
(cada PMS tiene sus propios dominios que hay que permitir).

### 5 — GDPR y gestión de cookies

**Cookiebot** como servicio externo de gestión de consentimiento.

```
Ventajas para vuestro caso:
  ✓ Escanea automáticamente las cookies del site
  ✓ Banner configurable por idioma — encaja con multiidioma
  ✓ Registro de consentimientos auditable
  ✓ Integración directa con GTM — GTM solo carga tras aceptar
  ✓ Se actualiza automáticamente cuando cambia la ley
  ✓ Coste: ~€10-14/mes por dominio — repercutible al cliente

Integración en Next.js estático:
  Script de Cookiebot en <head> de cada site
  GTM configurado para esperar señal de Cookiebot
  El cliente gestiona su banner desde panel Cookiebot
  Sin intervención del dev para cambios legales
```

**Otras obligaciones GDPR:**

```
✓ DPA (Data Processing Agreement) firmado con:
    cdmon — por los datos en MariaDB y logs
    Hetzner — por Payload y sus datos
    Cookiebot — incluido en su contrato
    Anthropic — por uso de Claude API

✓ Logs anonimizados:
    IPs hasheadas o truncadas tras 30 días en cdmon /logs/

✓ Política de privacidad por cliente:
    Generada en onboarding, gestionada por el cliente

✓ Derecho al olvido:
    Script en @hwe/content para borrar datos de usuario
    por tenant cuando se solicite

✓ Datos personales identificados:
    MariaDB: usuarios del portal (email, nombre)
    Logs: IPs de visitantes
    GTM: comportamiento de navegación (solo con consentimiento)
```


---

## SEO / GEO / PERFORMANCE

### URLs por locale

```
Estructura elegida: prefijo locale + slugs traducidos

campingsol.com/es/alojamientos/cabana-bosque
campingsol.com/en/accommodations/forest-cabin
campingsol.com/fr/hebergements/chalet-foret

✗ Descartado: campingsol.com/alojamientos?lang=es (parámetro — peor SEO)
✗ Descartado: es.campingsol.com (subdominio — más complejo de gestionar)
```

Los slugs se traducen por locale en Payload y se generan
estáticamente en tiempo de build para todos los idiomas.

### Metadata por página

```typescript
// Metadata completa por página y locale
export async function generateMetadata({ params }): Promise<Metadata> {
  const room = await contentRepository.getRoom(tenantId, params.slug)
  return {
    title: `${room.title} — ${config.name}`,
    description: room.description.substring(0, 160),
    openGraph: {
      title: room.title,
      description: room.description,
      images: [{ url: room.images[0].url, width: 1200, height: 630 }],
      type: 'website',
      locale: params.locale,
      siteName: config.name,
    },
    twitter: { card: 'summary_large_image', ... },
    alternates: {
      canonical: `https://${config.domain}/${params.locale}/...`,
      languages: {
        'es': `https://${config.domain}/es/alojamientos/${room.slug_es}`,
        'en': `https://${config.domain}/en/accommodations/${room.slug_en}`,
        'fr': `https://${config.domain}/fr/hebergements/${room.slug_fr}`,
      }
    }
  }
}
```

### Sitemap dinámico

Generado automáticamente en tiempo de build por cliente.
Incluye todas las páginas estáticas y dinámicas por locale.

```typescript
// app/sitemap.ts — generado en build
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const rooms = await contentRepository.getRooms(tenantId)
  const pages = await contentRepository.getPages(tenantId)
  // Una entrada por página × locale con lastModified, priority
}
```

### Robots.txt por cliente

```typescript
// app/robots.ts — generado en build
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: '*', allow: '/', disallow: ['/api/', '/uploads/private/'] }],
    sitemap: `https://${config.domain}/sitemap.xml`,
    host: `https://${config.domain}`,
  }
}
```

### llms.txt por cliente

Fichero estático para que los LLMs entiendan el site.
Generado en onboarding, mantenido por la agencia.

```
# /web/camping-sol/llms.txt
# Camping Sol — Información para agentes IA

## Descripción
Camping familiar en la Costa Brava, España.

## Servicios
- Reservas: https://campingsol.com/es/reservas
- Alojamientos: https://campingsol.com/es/alojamientos

## Idiomas: Español, English, Français
## No indexar: /api/, /uploads/private/, /admin/
```

### Schema.org personalizado por tipo

```typescript
// packages/@hwe/core-ui/seo/schemas.ts

// Camping → Campground + CampingPitch por alojamiento
// Hotel   → Hotel + HotelRoom por alojamiento

export function lodgingSchema(config: ClientConfig) {
  return {
    '@context': 'https://schema.org',
    '@type': config.type === 'camping' ? 'Campground' : 'Hotel',
    name: config.name,
    address: { '@type': 'PostalAddress', ... },
    geo: { '@type': 'GeoCoordinates', latitude, longitude },
    amenityFeature: config.amenities.map(a => ({
      '@type': 'LocationFeatureSpecification',
      name: a, value: true
    })),
  }
}

export function accommodationSchema(room: Room, config: ClientConfig) {
  return {
    '@context': 'https://schema.org',
    '@type': config.type === 'camping' ? 'CampingPitch' : 'HotelRoom',
    name: room.title,
    description: room.description,
    occupancy: { '@type': 'QuantitativeValue', maxValue: room.maxGuests },
    photo: room.images.map(img => ({ '@type': 'ImageObject', url: img.url }))
  }
}
```

### Core Web Vitals en CI/CD

Lighthouse CI integrado en GitHub Actions.
Si alguna métrica baja del umbral → el deploy falla.

```yaml
# .github/workflows/deploy.yml
- name: Lighthouse CI
  run: npx lhci autorun
# Umbrales obligatorios:
# LCP < 2.5s — foto hero carga rápido
# CLS < 0.1  — imágenes con dimensiones fijas obligatorio
# INP < 200ms — botón reserva responde rápido
```

### Performance — configuración Apache cdmon

```apache
# /web/camping-sol/.htaccess

# Compresión gzip
<IfModule mod_deflate.c>
  AddOutputFilterByType DEFLATE text/html text/css application/javascript
</IfModule>

# Cache headers — assets estáticos cacheados 1 año
<FilesMatch "\.(js|css|woff2|jpg|png|webp|svg)$">
  Header set Cache-Control "max-age=31536000, immutable"
</FilesMatch>

# HTML sin cache — siempre fresco
<FilesMatch "\.html$">
  Header set Cache-Control "no-cache, must-revalidate"
</FilesMatch>
```

### Performance — imágenes

```
Reglas obligatorias en @hwe/core-ui:
  ✓ Formato webp por defecto — PHP convierte uploads automáticamente
  ✓ Dimensiones width/height obligatorias en todo <img> — evita CLS
  ✓ loading="lazy" en imágenes fuera del viewport
  ✓ loading="eager" + fetchpriority="high" en imagen hero
  ✓ Tamaño máximo upload: 5MB → PHP optimiza a webp 85% calidad
  ✓ Responsive images con srcset por breakpoint
```

### Gestión de 404 y redirects 301

**Página 404 personalizada por cliente:**
```
apps/site-[cliente]/app/not-found.tsx
  Branding del cliente
  Buscador de alojamientos
  Enlace a home
  Sugerencias de páginas populares
```

**Redirects 301 — solo cuando son necesarios:**

```
Cuándo se crean:
  ✓ Migración WordPress → hwe (URLs cambian)
  ✓ Cambio de estructura de URLs en cliente existente
  ✓ Página eliminada con tráfico SEO acumulado
  ✓ Cambio de dominio

Cuándo NO se crean:
  ✗ Cliente nuevo sin web anterior
  ✗ URLs que no han cambiado
  ✗ Páginas sin tráfico SEO
```

```bash
# Script que genera redirect map automáticamente
npm run generate:redirects camping-sol \
  --old-sitemap=old-sitemap.xml \
  --new-sitemap=new-sitemap.xml
# Genera bloque .htaccess con los 301 necesarios
# Claude mapea URLs antiguas a nuevas cuando no hay correspondencia directa
```

```apache
# /web/camping-sol/.htaccess — solo las que cambian
RewriteEngine On
RewriteRule ^cabanas/?$ /es/alojamientos/ [R=301,L]
RewriteRule ^cabanas/cabana-bosque/?$ /es/alojamientos/cabana-bosque [R=301,L]
```

**Monitoring de 404s:**
```
Logs cdmon → alerta si > 10 errores 404/día distintos
  → indica links rotos o migración incompleta
  → revisión manual y corrección de redirects
```

### Indexación en Google

```
Onboarding cliente:
  ✓ Verificar dominio en Google Search Console
  ✓ Enviar sitemap a GSC
  ✓ Solicitar indexación de páginas principales via GSC API

Tras cada deploy:
  GitHub Actions → solicita indexación via GSC API
  de las páginas modificadas en ese deploy

Monitorización:
  Auditoría mensual automática verifica páginas no indexadas
```

### Auditoría SEO mensual automática

```yaml
# .github/workflows/seo-audit.yml
on:
  schedule:
    - cron: '0 9 1 * *'   # primer día de cada mes

# Verifica automáticamente:
#   ✓ Core Web Vitals por encima de umbrales
#   ✓ hreflang válido en todas las páginas
#   ✓ Sitemap accesible y válido
#   ✓ Robots.txt correcto
#   ✓ Schema.org válido (Google Rich Results API)
#   ✓ 404s detectados en logs del mes
#   ✓ Páginas no indexadas en GSC
# Genera informe → email a webmaster
```

**Auditoría trimestral manual** (no automatizable):
```
  Revisión de posicionamiento real en Google
  Análisis de keywords nuevas
  Revisión de competencia
  Herramienta: Semrush o Ahrefs
```

### Análisis de contenido SEO — agente IA

Nuevo agente en @hwe/ai — modelo Haiku:

```typescript
// packages/@hwe/ai/agents/seo-auditor.ts
// Analiza estructura SEO del contenido de cada página:
//   H1 único con keyword principal
//   H2/H3 con estructura lógica
//   Meta description 120-160 caracteres
//   Alt text en todas las imágenes
//   Contenido mínimo 300 palabras
//   Internal linking presente
// Devuelve JSON con issues y sugerencias
```

Se ejecuta en la auditoría mensual automática y
bajo demanda desde el panel de agencia.


---

## BOOKING ENGINE — ARQUITECTURA COMPLETA

**Component location updated by [DEC-010](./decisions.md#dec-010--bookingblock-in-hwecore-ui-bookingprovider-in-hwebooking) (2026-05-21).** `BookingBlock` and `BookingWidget` live in `@hwe/core-ui` (not in `@hwe/booking/react/`). `@hwe/booking` exports the `BookingAdapter` interface, stock adapters, `BookingProvider`, and `useBookingAdapter()` — no UI components. The PHP proxy references are superseded by [DEC-007](./decisions.md#dec-007) (Next.js Route Handlers). Per [DEC-015](./decisions.md#dec-015--client-owned-blocks-with-shared-schemas-slot-based-composition-and-npm-subpath-exports) (2026-06-01), the path inside the package is `src/base-blocks/BookingBlock/` (renamed from `src/blocks/`).

### Alcance del sistema

```
hwe gestiona:
  ✓ UI de búsqueda de disponibilidad
  ✓ Muestra de disponibilidades y precios (via PMS)
  ✓ Salto al motor de reservas del PMS

hwe NO gestiona:
  ✗ Proceso de reserva completo
  ✗ Pagos
  ✗ Confirmaciones
  ✗ Cancelaciones
  → Todo esto lo gestiona el PMS del cliente
```

### Dos modos de integración

```
Modo A — API propia (preferido)
  PHP proxy → API del PMS → UI propia en Next.js
  Control total visual — buscador diseñado en Figma
  Máxima experiencia de usuario

Modo B — Widget externo JS del PMS
  Script JS del PMS embebido en el DOM
  El PMS renderiza su widget
  Vosotros controlais el contenedor y posición
  Algunos PMS permiten theming via CSS

Modo iframe — descartado como estándar
  Solo caso excepcional si el PMS no ofrece API ni widget JS
  No es el flujo normal de trabajo
```

### BookingAdapter interface

```typescript
// packages/@hwe/booking/types.ts

export type BookingMode = 'api' | 'external-widget'
export type AvailabilityMode = 'realtime' | 'polling'

export interface AdapterCapabilities {
  bookingMode: BookingMode

  // Si bookingMode === 'api'
  availabilityMode?: AvailabilityMode
  hasDatePicker?: boolean
  hasGuestSelector?: boolean
  hasUnitTypeFilter?: boolean
  hasPromoCode?: boolean

  // Si bookingMode === 'external-widget'
  widgetScriptUrl?: string
  widgetInitConfig?: object
  supportsCustomCSS?: boolean
}

export interface BookingAdapter {
  getCapabilities(): AdapterCapabilities
  getAvailability?(params: AvailabilityQuery): Promise<AvailabilityResult>
}
```

### BookingWidget — se adapta automáticamente

```typescript
// packages/@hwe/core-ui/BookingWidget.tsx

export function BookingWidget({ adapter }) {
  const capabilities = adapter.getCapabilities()

  if (capabilities.bookingMode === 'api') {
    return <NativeBookingSearch capabilities={capabilities} />
    // UI propia completa — diseñada en Figma del cliente
  }

  if (capabilities.bookingMode === 'external-widget') {
    return (
      <ExternalWidgetContainer
        scriptUrl={capabilities.widgetScriptUrl}
        config={capabilities.widgetInitConfig}
        supportsCustomCSS={capabilities.supportsCustomCSS}
      />
    )
    // Contenedor estilizado + script JS del PMS
  }
}
```

### Figma — variantes del BookingWidget

```
Figma Master → BookingWidget
  variant="api"              ← buscador completo diseñado por vosotros
  variant="external-widget"  ← contenedor + placeholder del widget PMS
```

El diseñador conoce el PMS del cliente antes de empezar el Figma.
El modo determina qué variant diseñar.

### Verificación obligatoria en onboarding

```
Antes de firmar con un cliente:
  ✓ Identificar qué PMS usa
  ✓ ¿Tiene API pública documentada? → modo api
  ✓ ¿Tiene widget JS embebible? → modo external-widget
  ✓ ¿Permite theming CSS en el widget?
  ✓ Documentar en client.config.ts
  ✓ Informar al diseñador del modo antes de empezar Figma
```

### Implementación de cada adaptador — fuera de la arquitectura

Las especificaciones técnicas de cada PMS concreto
(endpoints, autenticación, parámetros, formato de respuesta)
se definen cuando arranca ese cliente — no en la arquitectura base.

Cada adaptador implementado vive en:
```
hwe-platform/packages/@hwe/booking/adapters/
  cloudbeds.adapter.ts
  mews.adapter.ts
  siteminder.adapter.ts
  ...
```

---

## BUENAS PRÁCTICAS — NO BADCODING

### Code Review Checklist

```markdown
# /docs/code-review-checklist.md

## Arquitectura
  □ Sin if (client === 'nombre') en el core
  □ Usa interfaces — no implementaciones directas
  □ DDD respetado — cada capa solo accede a la siguiente
  □ Sin lógica de negocio en componentes UI

## TypeScript
  □ Sin uso de `any` — usar unknown o tipo específico
  □ Props de componentes tipados explícitamente
  □ Sin type assertions innecesarias (as Type)
  □ Return types explícitos en funciones públicas

## Seguridad
  □ Sin claves API en el código
  □ Inputs validados con Zod
  □ Sin console.log con datos sensibles
  □ CORS y headers presentes

## Tests
  □ Cobertura > 90% en booking y adaptadores
  □ AAA pattern — Arrange, Act, Assert
  □ Sin tests que dependen de orden de ejecución
  □ Casos de error cubiertos además del happy path

## Performance
  □ Imágenes con width/height y loading correcto
  □ Sin imports innecesarios que aumenten bundle
  □ Sin waterfalls de data fetching evitables

## Documentación
  □ OpenAPI actualizado si hay cambios de API
  □ DataModel.md actualizado si hay cambios de schema
  □ memory-bank actualizado si hay decisiones nuevas
```

### Definition of Done por tipo de tarea

```markdown
# /docs/definition-of-done.md

## Feature nueva
  □ Proposal Artifacts aprobados antes de codificar
  □ Tests escritos antes del código (TDD)
  □ Cobertura de tests cumple el umbral
  □ Code review aprobado (humano + /verify Claude)
  □ Lighthouse CI pasa en staging
  □ Documentación actualizada
  □ Testing Report generado con /archive
  □ Deploy a staging validado
  □ Cliente aprueba si es cambio visual

## Bug fix
  □ Test que reproduce el bug escrito primero
  □ Fix implementado — test pasa
  □ Regression tests pasan
  □ PATCH version bump en el package afectado
  □ Desplegado en clientes afectados

## Nuevo cliente
  □ Script create-client ejecutado
  □ DB creada y schemas aplicados
  □ Payload configurado y accesible
  □ PMS identificado y modo booking definido
  □ Tokens Figma exportados → tailwind.config.ts
  □ Health check pasa en staging
  □ SSL configurado y verificado
  □ GSC verificado y sitemap enviado
  □ Cookiebot configurado
  □ Redirects 301 implementados si aplica
```

### Política de deuda técnica

```
Registro: Linear con label "tech-debt"
  Campos: impacto (alto/medio/bajo), esfuerzo, razón del atajo, deadline

Priorización:
  Alta   → seguridad o bloquea features → sprint actual
  Media  → degrada mantenibilidad → próximos 2 sprints
  Baja   → mejora sin impacto inmediato → backlog trimestral

Regla del Boy Scout:
  Deja el código mejor de como lo encontraste
  Máximo 20% del tiempo de la tarea

Presupuesto:
  20% del tiempo de desarrollo reservado para deuda técnica
  Revisado en retrospectiva mensual
```

### Conventional Commits — obligatorio

```
Formato: type(scope): descripción en inglés

Types: feat | fix | docs | style | refactor | test | chore | perf | ci | revert

Ejemplos hwe:
  feat(booking): add Mews adapter
  fix(core-ui): hero block CLS on mobile
  docs(memory-bank): update system patterns
  chore(deps): update @hwe/core-ui to 1.3.0
  perf(images): add webp conversion to upload proxy

Reglas:
  ✓ Inglés siempre
  ✓ Máximo 72 caracteres primera línea
  ✓ Imperativo — "add" no "added"
  ✓ Sin punto final
```

Husky + commitlint valida automáticamente:
```json
{
  "husky": {
    "hooks": {
      "commit-msg": "commitlint --edit $1",
      "pre-commit": "lint-staged"
    }
  },
  "lint-staged": {
    "*.{ts,tsx}": ["eslint --fix", "prettier --write"]
  }
}
```

### Política de dependencias

```
Antes de añadir cualquier librería:
  □ ¿Se puede resolver con código propio en < 2h? → no añadir
  □ Mantenimiento activo (commit últimos 6 meses)
  □ > 1000 stars o empresa conocida
  □ Bundle size aceptable (verificar bundlephobia.com)
  □ Sin vulnerabilidades (npm audit)
  □ Licencia compatible (MIT, Apache 2.0)
  □ Sin duplicar funcionalidad ya en el proyecto

Prohibido sin aprobación tech lead:
  ✗ Librerías > 100KB sin tree-shaking
  ✗ Sin mantenimiento activo
  ✗ Licencia GPL
  ✗ Duplicar funcionalidad existente

Automatizado:
  npm audit en cada PR via GitHub Actions
  Dependabot activo — PRs automáticos de seguridad
  Revisión trimestral de dependencias desactualizadas
```

### ESLint + Prettier + TypeScript strict

```typescript
// packages/@hwe/config/tsconfig.base.json
{
  "compilerOptions": {
    "strict": true,           // obligatorio
    "noImplicitAny": true,    // sin any implícito
    "noUnusedLocals": true,   // sin variables sin usar
    "noUnusedParameters": true,
    "exactOptionalPropertyTypes": true
  }
}
```

```javascript
// packages/@hwe/config/eslint.base.js
{
  rules: {
    '@typescript-eslint/no-explicit-any': 'error',  // any prohibido
    '@typescript-eslint/explicit-function-return-type': 'warn',
    'no-console': ['warn', { allow: ['warn', 'error'] }],
  }
}
```


---

## PERFORMANCE BUDGET

Límites de rendimiento obligatorios. Si se superan el deploy falla automáticamente.

### Umbrales

```
Bundle size:
  JavaScript inicial    < 100KB gzipped
  CSS inicial           < 20KB gzipped
  Total por página      < 500KB sin imágenes

Core Web Vitals:
  LCP                   < 2.5s
  CLS                   < 0.1
  INP                   < 200ms
  TTFB                  < 600ms (desde cdmon España)

Imágenes:
  Hero                  < 200KB webp
  Galería por imagen    < 100KB webp
  Total imágenes/página < 1MB
```

### Implementación en CI/CD

```javascript
// bundlewatch.config.js en hwe-platform
module.exports = {
  files: [
    { path: '.next/static/chunks/*.js', maxSize: '100kb' },
    { path: '.next/static/css/*.css',   maxSize: '20kb'  }
  ]
}
```

```yaml
# .github/workflows/deploy.yml
- name: Bundle size check
  run: npx bundlewatch
- name: Lighthouse CI
  run: npx lhci autorun
# Si cualquier umbral se supera → deploy falla
```

---

## FEATURE FLAGS

Dos niveles según frecuencia de cambio y quién los gestiona.

### Nivel 1 — Estáticos en client.config.ts

```typescript
features: {
  blog: false,           // sección blog activa
  reviews: true,         // sección reviews activa
  restaurant: false,     // sección restaurante
  spa: false,            // sección spa
  aiContentPortal: true  // portal IA cliente
}
```

Requieren deploy para cambiar.
Para features estructurales que cambian pocas veces.
El dev los gestiona.

### Nivel 2 — Dinámicos en plataforma_db

```sql
create table feature_flags (
  tenant_id   varchar(36) not null,
  flag        varchar(100) not null,
  enabled     boolean default false,
  updated_at  timestamp default now(),
  updated_by  varchar(100),
  primary key (tenant_id, flag)
);
```

Sin deploy para cambiar.
El cliente los gestiona desde el portal.
Para features operacionales que cambian con frecuencia.

```
Ejemplos de flags dinámicos:
  banner-oferta-especial    ← cliente activa/desactiva
  modo-mantenimiento        ← agencia activa si hay incidencia
  formulario-lista-espera   ← cliente activa en temporada alta
  precios-temporada-alta    ← switch de tarifa activa
```

### Cuándo usar cada nivel

```
Nivel estático (config)    → activa un tipo de página nuevo
                              cambia la estructura del site
                              requiere trabajo de diseño previo

Nivel dinámico (DB)        → activa/desactiva contenido existente
                              cambio operacional sin implicaciones visuales
                              el cliente puede gestionarlo solo
```

---

## MIGRACIÓN WORDPRESS → hwe

### Escenario A — Migración completa

```
1. Auditoría WordPress
   → inventario páginas, posts, imágenes
   → export URLs indexadas desde GSC
   → identificar contenido a migrar vs descartar

2. Mapeo de contenido
   → WordPress posts → Payload collections
   → ACF custom fields → Payload schemas
   → WordPress media → /uploads/ en cdmon

3. Script de migración
   npm run migrate:wordpress camping-sol
   → lee WordPress via WP REST API
   → Claude estructura contenido según schemas Payload
   → sube a Payload como drafts para revisión agencia

4. Redirect map
   npm run generate:redirects camping-sol \
     --old-sitemap=wordpress-sitemap.xml \
     --new-sitemap=hwe-sitemap.xml
   → genera .htaccess con 301s necesarios

5. Validación en staging
   → contenido migrado correcto
   → redirects funcionan
   → Lighthouse CI pasa
   → cliente valida

6. DNS cutover
   → DNS apunta a cdmon nuevo
   → WordPress en standby 30 días
   → tras 30 días → WordPress desactivado
```

### Escenario B — Convivencia temporal

```
Durante el desarrollo de hwe:
  campingsol.com      → WordPress (producción actual)
  new.campingsol.com  → hwe (staging del nuevo site)

Cuando hwe está listo:
  DNS cutover → campingsol.com → hwe
  old.campingsol.com → WordPress standby 30 días
```

### Script de migración

```typescript
// packages/@hwe/content/migration/wordpress.ts

export async function migrateFromWordPress(
  wpApiUrl: string,
  tenantId: string
): Promise<MigrationReport> {

  // 1. Obtener contenido WordPress via REST API
  const pages = await wpFetch(`${wpApiUrl}/wp-json/wp/v2/pages`)
  const media = await wpFetch(`${wpApiUrl}/wp-json/wp/v2/media`)

  // 2. Claude estructura según schemas de Payload
  const structured = await aiContentAgent.structureFromWordPress({
    pages, tenantId
  })

  // 3. Validar con Zod
  const validated = MigrationSchema.parse(structured)

  // 4. Subir a Payload como drafts
  await payloadClient.bulkCreate({
    collection: 'pages',
    data: validated.pages,
    status: 'draft'    // siempre draft — agencia revisa
  })

  return { migrated: validated.pages.length }
}
```

### Lo que la IA hace en la migración

```
✓ Estructura contenido WordPress → schemas Payload
✓ Traduce contenido a otros idiomas durante la migración
✓ Sugiere slugs SEO-friendly para cada página
✓ Identifica contenido duplicado o de baja calidad
✓ Genera redirect map inteligentemente

✗ No migra plugins WordPress con lógica compleja
✗ No migra WooCommerce ni formularios complejos
✗ No garantiza fidelidad visual exacta
```


---

## GESTIÓN DE ERRORES

### Tres capas de error handling

**Next.js — Error Boundaries**

```typescript
// apps/site-template/app/error.tsx
export default function Error({ error, reset }) {
  useEffect(() => {
    errorLogger.log(error, { tenant: config.tenantId })
  }, [error])

  return (
    <div className="error-page">
      <h1>Algo ha salido mal</h1>
      <p>Estamos trabajando para solucionarlo.</p>
      <button onClick={reset}>Intentar de nuevo</button>
    </div>
  )
}

// app/global-error.tsx  ← errores críticos de layout
// app/not-found.tsx     ← 404 personalizado (ver sección SEO/GEO)
```

**PHP — Errores de proxy**

```php
function handleProxyError($error, $context) {
  // Log estructurado
  error_log(json_encode([
    'timestamp' => date('c'),
    'tenant'    => $context['tenant'],
    'endpoint'  => $context['endpoint'],
    'error'     => $error,
  ]), 3, '/web/logs/' . $context['tenant'] . '-error.log');

  // Degradación elegante — nunca romper la experiencia
  http_response_code(503);
  echo json_encode([
    'error'    => 'Service temporarily unavailable',
    'fallback' => $context['fallbackUrl'] // URL del PMS directo
  ]);
}
```

**Payload — Degradación elegante**

```typescript
// Si Payload no responde → fallback a cache o array vacío
export async function getRoomsWithFallback(tenantId: string) {
  try {
    return await contentRepository.getRooms(tenantId)
  } catch (error) {
    errorLogger.log(error, { tenantId, operation: 'getRooms' })
    return getCachedRooms(tenantId) ?? []
  }
}
```

### Logs centralizados

```
cdmon /logs/
  camping-sol-error.log    ← errores PHP proxy (500, timeouts)
  camping-sol-access.log   ← accesos anonimizados (GDPR)

plataforma_db.error_logs
  tenant_id, level, message, context, timestamp
  ← errores Next.js y Payload
  ← consultables desde panel admin agencia
```

### Alertas automáticas

```yaml
# Health check existente ampliado:
# Alerta si > 10 errores HTTP 500 en 1 hora
# Email a webmaster con resumen del error y contexto
# Diferenciado de alertas 404 (que van a SEO/GEO)
```

### Tipos de error y su tratamiento

```
HTTP 404   → página 404 con branding (ver SEO/GEO)
HTTP 500   → error boundary + log + alerta webmaster
Timeout    → degradación elegante + fallback + log
Payload KO → cache local si existe, array vacío si no
PMS KO     → mensaje "consultar disponibilidad directamente"
              + URL directa al PMS como fallback
Claude KO  → mensaje al usuario + reintento manual
```

---

## ACCESIBILIDAD (a11y)

Estándar mínimo obligatorio: **WCAG 2.1 nivel AA**

### Obligatorio en @hwe/core-ui

```
✓ Alt text en todas las imágenes — campo required en Payload schema
✓ Contraste mínimo 4.5:1 — verificado en tokens Figma
✓ Focus visible en todos los elementos interactivos
✓ Navegación por teclado en booking widget
✓ ARIA labels en botones sin texto descriptivo
✓ Headings en orden correcto H1 → H2 → H3
✓ Skip to main content link al inicio de cada página
✓ lang attribute en HTML por locale
✓ Estados de error descriptivos en formularios
```

### Alt text obligatorio en schema Payload

```typescript
// Campo imagen — alt text required
{
  name: 'images',
  type: 'array',
  fields: [
    { name: 'url',    type: 'text',   required: true },
    { name: 'alt',    type: 'text',   required: true },  // obligatorio
    { name: 'width',  type: 'number', required: true },
    { name: 'height', type: 'number', required: true },
  ]
}
```

### Automatizado en CI/CD

```yaml
# .github/workflows/deploy.yml
- name: Accessibility check
  run: npx axe-core-cli https://staging.campingsol.com
  # Falla si hay errores a11y críticos (nivel AA)
```

### En el proceso de diseño Figma

```
Checklist antes de Ready for dev:
  □ Contraste verificado con plugin Figma Contrast
  □ Focus states diseñados para elementos interactivos
  □ Estados de error diseñados en formularios
  □ Textos alternativos definidos para imágenes clave
```

---

## DNS Y DOMINIOS

### Lo que vive en el proyecto (Git)

```typescript
// client.config.ts — dominios del cliente
domain: 'campingsol.com',
cmsDomain: 'cms.campingsol.com',       // → Hetzner (Payload)
portalDomain: 'portal.campingsol.com', // → cdmon
stagingDomain: 'staging.campingsol.com' // → cdmon
```

```bash
# hwe-platform/scripts/verify-dns.sh
# Verifica que todos los registros DNS son correctos
# antes de hacer el DNS cutover
dig campingsol.com A
dig cms.campingsol.com A
curl -I https://campingsol.com
curl -I https://cms.campingsol.com
```

```markdown
# docs/onboarding-checklist.md
DNS checklist:
  □ Dominio principal → IP cdmon
  □ cms.cliente.com → IP Hetzner
  □ portal.cliente.com → IP cdmon
  □ staging.cliente.com → IP cdmon
  □ SSL válido en todos los subdominios
  □ GSC verificado
```

### Lo que NO vive en el proyecto

```
→ Credenciales panel cdmon (Keeper)
→ Configuración real registros DNS (panel registrador)
→ Acceso registrador de dominios del cliente (Keeper)
→ Proceso de transferencia de dominios (documentación interna agencia)
```


---

## ONBOARDING TÉCNICO DE CLIENTE NUEVO

### Lo que entra al sistema desde el briefing

El briefing es un documento de negocio — no vive en el proyecto.
Lo que sí vive en el proyecto es la información técnica que sale de él.

```
Briefing aprobado (Notion, PDF, reunión)
  ↓ la agencia extrae la información técnica
  ↓
Repo site-[cliente]/
  client.config.ts       ← config completa del cliente
  tokens/cliente.json    ← branding exportado de Figma
  assets/
    logo.svg             ← logo del cliente
    favicon.ico          ← favicon
  payload/schemas/       ← extensiones de schema
  docs/architecture/
    briefing.md          ← resumen técnico del briefing
    brand-guidelines.md  ← guía de marca
    figma-notes.md       ← notas del diseñador
```

### client.config.ts — sección de recursos

```typescript
// site-camping-sol/client.config.ts
export const config: ClientConfig = {
  // ... config existente ...

  // Recursos del proyecto — para Claude Code y el equipo
  assets: {
    figmaUrl:    'https://figma.com/file/xxx/camping-sol',
    briefingUrl: 'https://notion.so/xxx',        // opcional
    logoSvg:     './assets/logo.svg',
    favicon:     './assets/favicon.ico',
    brandColors: {
      primary:   '#2D6A4F',
      secondary: '#95D5B2',
    }
  }
}
```

### memory-bank del cliente

Cada repo de cliente tiene su propio memory-bank
con el contexto necesario para que Claude Code
entienda el proyecto sin explicaciones adicionales.

```
site-camping-sol/
  docs/architecture/
    briefing.md
      ← nombre del cliente, tipo de negocio, ubicación
      ← público objetivo, tono de comunicación
      ← servicios principales, competidores referencia
      ← requisitos especiales del cliente
      ← PMS que usa y modo de integración (api/widget)
      ← idiomas requeridos y mercados objetivo

    brand-guidelines.md
      ← colores corporativos con hex codes
      ← tipografías y pesos
      ← tono de voz y estilo de comunicación
      ← qué evitar (colores, palabras, estilos)
      ← ejemplos de comunicación aprobados

    figma-notes.md
      ← URL del Figma
      ← notas del diseñador sobre decisiones de diseño
      ← componentes con comportamiento especial
      ← animaciones o interacciones previstas
      ← variantes no estándar y su razón
```

### Flujo de onboarding técnico completo

```
1. Briefing aprobado por la agencia
   ↓
2. Script create-client genera el repo base
   npm run create:client camping-sol
   ↓
3. Dev rellena client.config.ts con datos del briefing
   ↓
4. Dev crea docs/architecture/briefing.md con resumen técnico
   ↓
5. Diseñador recibe brief y empieza en Figma
   → usa el Figma Master de la agencia como base
   → aplica branding del cliente en Variables Figma
   ↓
6. Script exporta tokens Figma → tokens/camping-sol.json
   → genera tailwind.config.ts automáticamente
   ↓
7. Diseñador marca Figma como Ready for dev
   ↓
8. Claude Code lee:
   → docs/architecture/briefing.md (contexto del cliente)
   → docs/architecture/brand-guidelines.md (tono y marca)
   → docs/architecture/figma-notes.md (notas del diseño)
   → código de Figma Make (referencia visual)
   → catálogo @hwe/core-ui (bloques disponibles)
   ↓
9. Claude construye el site con contexto completo
   ↓
10. Dev revisa y aprueba
    ↓
11. Deploy a staging → cliente valida → producción
```

### Lo que Claude Code necesita para trabajar bien

Sin el memory-bank del cliente, Claude Code no tiene contexto
y genera código genérico. Con él, genera código ajustado
al tono, marca y necesidades específicas del cliente.

```
Claude lee antes de cualquier tarea en site-[cliente]:
  hwe-platform/docs/architecture/          ← arquitectura global
  hwe-platform/docs/             ← reglas de desarrollo
  site-[cliente]/docs/architecture/        ← contexto del cliente
  site-[cliente]/client.config.ts    ← config técnica
```


---

## CICLO DE VIDA DE LA DOCUMENTACIÓN

### Principio fundamental

La documentación es la fuente de verdad — el código viene después.
Cuando el código cambia, la documentación cambia primero o simultáneamente.
Nunca dejar documentación desincronizada con el código.

### Tres niveles de documentación

```
Nivel 1 — Documentos maestros de arquitectura
  hwe-architecture.md
  architecture-all-options.md
  → Se actualizan en revisiones periódicas de arquitectura
  → No se tocan en el desarrollo diario
  → Solo el tech lead los modifica tras consenso del equipo

Nivel 2 — memory-bank del proyecto (actualización continua)
  docs/architecture/briefing.md
  docs/architecture/systemPatterns.md
  docs/architecture/decisions.md
  docs/architecture/dataModel.md
  → Se actualizan con cada feature relevante
  → Claude propone cambios, dev aprueba

Nivel 3 — Artefactos técnicos (actualización automática)
  OpenAPI spec
  testing-reports/
  docs/architecture/decisions.md (log)
  → Claude los actualiza automáticamente en /archive
  → Sin intervención humana necesaria
```

### Qué actualiza Claude automáticamente en /archive

```
decisions.md          ← log de cada decisión tomada
dataModel.md          ← si hay cambios de schema DB o Payload
OpenAPI               ← si hay cambios de endpoints
testing-reports/      ← informe del testing de la feature
```

### Qué propone Claude y el dev aprueba

```
briefing.md       ← si hay decisiones de arquitectura nuevas
systemPatterns.md     ← si hay patrones nuevos identificados
backend-standards.md  ← si hay reglas nuevas de código
frontend-standards.md ← si hay reglas nuevas de UI
```

### Qué actualiza solo el dev (nunca automático)

```
hwe-architecture.md  ← documento maestro
architecture-all-options.md    ← alternativas evaluadas
→ Solo en revisiones periódicas de arquitectura
→ Nunca en el desarrollo diario de features
```

### Regla en documentation-standards.md

```markdown
Antes de cualquier commit:
  1. Revisar qué documentación debe actualizarse
  2. Actualizar según el nivel correspondiente
  3. Claude automático → Nivel 3
  4. Claude propone + dev aprueba → Nivel 2
  5. Revisión de arquitectura → Nivel 1
  6. Nunca hacer commit con docs desincronizados del código
```

### Cuándo hacer revisión de arquitectura (Nivel 1)

```
✓ Nueva decisión que cambia el sistema significativamente
✓ Cambio de proveedor o tecnología clave
✓ Nuevo tipo de cliente que no encaja en el modelo actual
✓ Problema de escalabilidad detectado en producción
✓ Revisión trimestral programada
✗ No en cada feature — los niveles 2 y 3 cubren el día a día
```

### Flujo completo con Claude Code

```
Claude Code implementa feature
  ↓ /verify — revisión de código
  ↓ /archive — Claude actualiza:
      decisions.md (automático)
      dataModel.md si hay cambios (automático)
      OpenAPI si hay cambios (automático)
      testing-reports/ (automático)
      Propone cambios en briefing.md si aplica
  ↓ Dev revisa propuestas de Nivel 2
  ↓ Dev aprueba o ajusta
  ↓ /commit — commit con docs actualizados
  ↓ PR → merge → deploy
```


---

## CONTEXT ENGINEERING

### Principio fundamental

El contexto es lo que la IA sabe en cada momento.
Diseñar el contexto correctamente es tan importante
como diseñar la arquitectura técnica.

### Sistema de 3 capas — simple y gradual

Para un equipo sin experiencia previa con Claude Code.
Coste estimado: ~$12/mes por dev — insignificante.
RAG se evalúa cuando agentes de producción superen $500/mes (~100+ clientes activos).

---

### Capa 1 — Contexto global (siempre presente)

Fichero `CLAUDE.md` en la raíz de cada repo.
Claude Code lo lee automáticamente en cada sesión.
Máximo ~500 tokens — conciso y directo.

```markdown
# CLAUDE.md — hwe-platform

## Qué es este proyecto
hwe — Hospitality Web Platform. Plataforma multi-cliente
para webs de campings y hoteles. Hasta 300 clientes.

## Stack
Next.js 14 static export · Payload CMS · Prisma · MariaDB
TypeScript strict · @hwe/* packages via GitHub Packages

## Reglas no negociables
- Sin `any` en TypeScript — error de ESLint
- Sin `if (client === 'x')` en el core
- Tests antes que código (TDD)
- Documentación actualizada antes del commit
- Conventional commits en inglés

## Dónde está todo
docs/architecture/briefing.md    ← resumen del sistema
docs/architecture/systemPatterns.md  ← patrones de arquitectura
docs/architecture/decisions.md       ← decisiones tomadas
docs/                      ← estándares de desarrollo

## Antes de cualquier tarea
Lee docs/architecture/briefing.md si no lo has leído ya.
```

```markdown
# CLAUDE.md — site-camping-sol

## Qué es este proyecto
Site de Camping Sol — cliente de hwe.
Arquitectura global en hwe-platform/docs/architecture/

## Cliente
Tipo: camping · Locales: es, en, fr · PMS: Cloudbeds (api)

## Contexto específico de este cliente
docs/architecture/briefing.md         ← brief del cliente
docs/architecture/brand-guidelines.md ← marca y tono
docs/architecture/figma-notes.md      ← notas de diseño

## Reglas adicionales
- Tono: familiar pero profesional
- Nunca mencionar precios sin confirmar con PMS
- Imágenes siempre en formato webp
```

---

### Capa 2 — Contexto por tarea (dev decide qué cargar)

El dev indica explícitamente qué contexto adicional necesita Claude.
Explícito, controlado, sin magia.

```markdown
# docs/context-per-task.md
# Qué contexto cargar según el tipo de tarea

## Booking engine
Lee: systemPatterns.md + @hwe/booking/types.ts

## Nuevo componente de cliente
Lee: briefing.md + client.config.ts + figma-notes.md

## Schema de Payload
Lee: dataModel.md + payload/schemas/base/

## Agente de IA
Lee: systemPatterns.md + @hwe/ai/agent-rules.ts

## SEO / sitemap
Lee: systemPatterns.md sección SEO + app/sitemap.ts

## Migración WordPress
Lee: systemPatterns.md + scripts/migrate-wordpress.ts
```

---

### Capa 3 — Contexto de conversación (automático)

El historial de la sesión actual. Claude lo gestiona solo.

**Regla crítica — sesiones cortas y focalizadas:**

```
✓ Una sesión = una tarea
  "Implementar CloudbedsAdapter"
  → todo el contexto es sobre booking

✗ No mezclar tareas en una sesión
  "CloudbedsAdapter + HeroBlock + revisar SEO"
  → contexto contaminado → calidad baja
```

---

### Coste de tokens — sistema simple vs RAG

```
Sistema simple (~$12/mes por dev)
  ~4000 tokens de contexto por mensaje
  50 mensajes por sesión → 200K tokens
  20 días al mes → $12/mes por dev
  Para equipo de 3 devs → $36/mes

RAG (~$4.50/mes por dev)
  ~1500 tokens de contexto por mensaje
  Ahorro: $7.50/mes por dev
  Para equipo de 3 devs → ahorro $22.50/mes

Implementar RAG: ~2 semanas senior → $5.000-8.000
Amortización del ahorro: ~18 años
→ Sistema simple es la decisión correcta ahora
```

### Agentes de producción — coste real

```
Content Editor (cliente edita contenido)
  ~5.000 tokens por sesión
  5 sesiones/semana → $0.075/semana por cliente
  → $3.90/mes por cliente activo

50 clientes activos → $195/mes en tokens
100 clientes activos → $390/mes en tokens

Trigger para evaluar RAG en agentes:
  Cuando supere $500/mes → evaluar optimización
  → ~100+ clientes activos editando frecuentemente
```

### Cuándo evolucionar a RAG

```
No antes de:
  ✓ 100+ clientes activos en producción
  ✓ Tokens de agentes > $500/mes
  ✓ Equipo con experiencia real en Claude Code
  ✓ Sistema simple ha demostrado sus límites

La evolución es gradual:
  Sistema simple → RAG solo para agentes de producción
                → RAG para Claude Code también
  Sin reescribir la arquitectura — solo añadir capa de recuperación
```


---

## BOUNDED CONTEXTS — DDD

El sistema hwe tiene cuatro contextos delimitados.
Cada contexto tiene su propio lenguaje — nunca se mezclan términos entre contextos.
Nunca importar tipos de un contexto en otro directamente.

### Mapa de contextos

```
Tenant ──────────────────────────────────────┐
  proporciona config y theme a todos          │
                                              ↓
Content ←──────────── AI ──────────────→ Booking
  recibe contenido      orquesta          consulta
  generado por IA       agentes           disponibilidad
                        entre contextos   al PMS
```

### Bounded Context 1 — Booking

```
Responsabilidad:
  Búsqueda de disponibilidad y muestra de resultados
  Salto al PMS para completar la reserva
  NO gestiona el proceso de reserva completo

Entidades:
  Accommodation  ← unidad reservable (cabaña, parcela, habitación)
  Availability   ← disponibilidad en un rango de fechas
  Rate           ← precio para esa disponibilidad
  SearchQuery    ← parámetros de búsqueda del usuario

Lenguaje obligatorio en código:
  check-in / check-out  (no "entrada" / "salida")
  occupancy             (no "capacidad")
  rate                  (no "precio")
  availability          (no "disponibilidad")
  unit                  (no "alojamiento")

Package: @hwe/booking
Fuera del contexto: reservas completas, pagos, confirmaciones
```

### Bounded Context 2 — Content

```
Responsabilidad:
  Todo el contenido editorial del site
  Páginas, bloques, medios, textos, imágenes
  Multiidioma

Entidades:
  Page           ← página del site con sus bloques
  Block          ← unidad visual con type, variant, order
  Section        ← agrupación lógica de bloques
  Media          ← imagen o fichero con metadatos
  Locale         ← idioma de un contenido

Lenguaje obligatorio en código:
  publish / draft  (no "publicar" / "borrador")
  slug             (no "url" o "ruta")
  locale           (no "idioma")
  block            (no "sección" o "componente")
  variant          (no "tipo" o "estilo")
  media            (no "imagen" o "foto")

Package: @hwe/content
Fuera del contexto: disponibilidad, config del tenant, prompts IA
```

### Bounded Context 3 — Tenant

```
Responsabilidad:
  Configuración y personalización por cliente
  Identidad, dominio, features, tokens de diseño

Entidades:
  Tenant         ← el cliente (camping o hotel)
  Config         ← configuración técnica del tenant
  Theme          ← tokens de diseño (colores, tipografías)
  Feature        ← feature flag activa o inactiva

Lenguaje obligatorio en código:
  tenant          (no "cliente" o "client")
  domain          (no "dominio")
  feature         (no "funcionalidad")
  theme           (no "diseño" o "estilo")
  active/inactive (no "activado" / "desactivado")

Package: @hwe/config
Fuera del contexto: contenido, reservas, agentes IA
```

### Bounded Context 4 — AI

```
Responsabilidad:
  Todos los agentes, prompts, reglas y tokens
  Orquestación de llamadas a Claude API
  Validación y logging de outputs

Entidades:
  Agent          ← agente especializado
  Prompt         ← instrucción base de un agente
  Rule           ← regla configurable de un agente
  Completion     ← respuesta de Claude a un prompt
  Token          ← unidad de uso de la API
  Validation     ← resultado de validar un completion con Zod

Lenguaje obligatorio en código:
  agent       (no "bot" o "IA")
  prompt      (no "mensaje" o "instrucción")
  completion  (no "respuesta")
  rule        (no "configuración")
  validation  (no "verificación")

Package: @hwe/ai
Fuera del contexto: contenido generado, config tenant, disponibilidad
```

### Regla de oro — mismo concepto, nombre distinto por contexto

```
"Alojamiento" en Booking → Unit (unidad reservable)
"Alojamiento" en Content → Accommodation (contenido editorial)

Son la misma cosa del mundo real pero
entidades distintas en el código.
Nunca comparten una clase o interface.
La comunicación entre contextos es via
interfaces y eventos — nunca acoplamiento directo.
```

### Reflejo en estructura de carpetas

```
packages/
  @hwe/booking/    ← Booking Context
    types.ts       ← Unit, Availability, Rate, SearchQuery
  @hwe/content/    ← Content Context
    types.ts       ← Page, Block, Section, Media, Locale
  @hwe/config/     ← Tenant Context
    types.ts       ← Tenant, Config, Theme, Feature
  @hwe/ai/         ← AI Context
    types.ts       ← Agent, Prompt, Rule, Completion, Token
```

---

## EVALUATIONS (EVALS)

Métricas de calidad para medir si los agentes funcionan correctamente.
Sin métricas no se puede mejorar — "parece correcto" no es suficiente.

### Storage de evals

```sql
-- plataforma_db
create table agent_evals (
  id          varchar(36) primary key,
  agent_id    varchar(50),
  tenant_id   varchar(36),
  score       decimal(3,2),    -- 0.00 a 1.00
  metrics     json,            -- métricas específicas
  passed      boolean,
  timestamp   timestamp default now()
);
```

### Umbrales de aprobación por agente

```
Content Editor    → 0.95  (crítico — toca contenido real del cliente)
Content Generator → 0.80  (flexible — hay revisión humana después)
Bulk Operator     → 0.99  (muy crítico — afecta a muchos documentos)
Code Builder      → CI/CD (Lighthouse + axe-core + tsc + jest)
SEO Auditor       → 0.75  (orientativo — revisión manual trimestral)
```

### Métricas por agente

**Content Editor**
```
✓ Cambio solicitado realizado correctamente (0/1)
✓ Campos no pedidos intactos (0/1)
✓ JSON pasó validación Zod (0/1)
✓ Tono coherente con brand-guidelines (1-5)

Medición:
  Automático: Zod pass/fail + diff antes/después
  Manual mensual: muestra de 10 ediciones
```

**Content Generator**
```
✓ Campos obligatorios completos (% completitud)
✓ Longitud adecuada por campo (min/max tokens)
✓ Keywords presentes en descripción (% presencia)
✓ Sin alucinaciones — datos inventados (0/1)
✓ Tono coherente con brand-guidelines (1-5)
✓ Coherencia entre locales (1-5)

Medición:
  Automático: schema completeness + keyword check
  Manual: revisión humana antes de publicar (ya obligatorio)
```

**Bulk Operator**
```
✓ Documentos afectados = documentos esperados (0/1)
✓ Campos no pedidos intactos (0/1)
✓ Backup creado antes de operar (0/1)
✓ Tiempo de operación dentro del límite (ms/doc)

Medición:
  Automático: diff de todos los documentos afectados
  Automático: verificación de backup en plataforma_db
```

**Code Builder**
```
✓ Lighthouse score > umbrales (LCP, CLS, INP)
✓ Axe-core sin errores críticos
✓ TypeScript sin errores
✓ Tests pasan
✓ Bundle size dentro del budget

Medición: CI/CD ya lo hace — el Code Builder no necesita eval propio
```

**SEO Auditor**
```
✓ Issues identificados correctamente (% precisión)
✓ Sin falsos positivos (% falsos positivos)
✓ Sugerencias implementables (% accionables)

Medición: manual trimestral — dev revisa muestra de auditorías
```

### Dashboard de evals en panel admin

```
Por agente:    score medio últimos 30 días + tendencia
Por tenant:    agentes más usados y calidad media
Alertas:       email al tech lead si score baja del umbral
Comparativa:   ¿los prompts mejoran con los cambios?
```

---

## PROMPT CHAINING

Tareas complejas divididas en cadenas de prompts simples.
Cada prompt hace una sola cosa — output pequeño y validable.
Haiku donde es suficiente, Sonnet donde se necesita calidad.

### Flujo 1 — Generación de contenido inicial

```
Input: nombre + características + brand-guidelines + locales

Prompt 1 — Structurer (Haiku)
  Extrae datos clave → JSON estructurado limpio
  { name, type, capacity, amenities[], uniqueFeatures[] }

Prompt 2 — Writer (Sonnet) × N locales
  JSON + brand-guidelines + locale
  → { title, description } por locale
  Se ejecuta una vez por locale en paralelo

Prompt 3 — SEO Enhancer (Haiku)
  Textos del Writer + keywords objetivo
  → Textos optimizados manteniendo el tono

Prompt 4 — Validator (automático, sin LLM)
  Zod.parse(output del SEO Enhancer)
  → Falla → retry Prompt 2 con instrucciones más claras
  → Pasa → guardar en Payload como draft
```

### Flujo 2 — Edición via portal cliente

```
Input: mensaje del cliente + documento actual + brand-guidelines

Prompt 1 — Intent Classifier (Haiku)
  Clasifica la petición:
  text_change | image_change | price_change |
  amenity_change | unknown
  Output: solo el tipo — ~50 tokens

Prompt 2 — Change Extractor (Haiku)
  Tipo + mensaje + documento actual
  → { field, currentValue, newValue }
  Output: cambio específico — ~200 tokens

Prompt 3 — Confirmation Generator (Haiku)
  Cambio extraído + locale del cliente
  → Mensaje amigable explicando exactamente qué va a cambiar
  Output: texto para mostrar al cliente

→ Cliente confirma (humano en el loop — siempre)

Prompt 4 — Validator (automático, sin LLM)
  Zod.parse({ field, newValue })
  → Falla → mensaje de error al cliente
  → Pasa → backup + aplicar cambio en Payload
```

### Flujo 3 — Reordenación de bloques

```
Input: instrucción agencia + array actual de bloques

Prompt 1 — Reorder Interpreter (Sonnet)
  Array actual + instrucción en lenguaje natural
  → Nuevo array completo reordenado
  Regla: mismos bloques, solo cambia el orden

Prompt 2 — Validator (automático, sin LLM)
  Verifica:
    → Mismo número de bloques (ni más ni menos)
    → Todos los type y variant son válidos
    → Orders consecutivos sin huecos
  → Falla → retry Prompt 1 más restrictivo
  → Pasa → mostrar a agencia para aprobación humana
```

### Por qué Prompt Chaining mejora la calidad

```
Sin chaining                    Con chaining
────────────────────────        ──────────────────────────
Un prompt gigante hace todo     Cada prompt hace una cosa
Claude se pierde en el ruido    Claude es preciso y enfocado
Output difícil de validar       Output pequeño y validable con Zod
Difícil de mejorar              Mejoras aisladas por prompt
Costoso — Sonnet para todo      Haiku donde es suficiente
```