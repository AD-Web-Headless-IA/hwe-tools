# 🗺️ Mapa del proyecto

> Imprime esto o tenlo abierto el primer día. Todo lo que necesitas saber sobre dónde vive cada cosa.

---

## Vista general

```
C:\laragon\www\Hospitality Web Platform\
│
├── 📁 hwp-platform/          ← El repo principal. Todo el código vive aquí.
│   ├── apps/                 ← Un site por cliente (Next.js)
│   ├── packages/             ← Código compartido entre todos los clientes
│   ├── docs/                 ← Documentación de todo el proyecto
│   └── .claude/              ← Automatizaciones de Claude Code
│
├── 📁 figma-makes/           ← Las referencias de diseño de Figma (solo lectura)
│   ├── base-template/        ← El diseño base genérico
│   └── hotel-balneario-*/    ← Diseño del cliente específico
│
└── 📄 .gitignore             ← Ficheros que git ignora (node_modules, etc.)
```

---

## 📁 hwp-platform/ — El repo principal

### apps/ — Los sites de cliente

`apps/site-demo/` es el site sandbox que actúa como espejo de la estructura de un repo de cliente real. Los clientes reales viven en repos independientes con la misma estructura.

```
apps/
└── 📁 site-demo/                      ← Site de demostración / espejo de estructura de cliente
    ├── 🎨 src/theme/tokens.json       ← Colores, fuentes, espaciados del cliente
    ├── 🖼️  src/app/page.tsx           ← Página principal (Next.js App Router)
    ├── 🖼️  src/app/layout.tsx         ← HTML base: <html>, fuentes, providers
    ├── 🎨 src/app/globals.css         ← CSS base — 1 único globals.css por cliente, 0 CSS por bloque
    ├── ⚙️  tailwind.config.ts         ← Tailwind configurado con tokens del cliente
    ├── ⚙️  next.config.mjs            ← Configuración de Next.js
    └── 📁 src/blocks/                 ← Bloques propios del cliente (Level 1–3)
        ├── registry.ts                ← Mapa de bloques del cliente (client block map)
        ├── HeroBlock/                 ← Ejemplo: re-export o override del base HeroBlock
        └── ...
```

| Fichero | 🎯 Para qué sirve | 🔄 Equivalente WP | 👤 Quién lo toca |
|---|---|---|---|
| `tokens.json` | Los valores de diseño: colores, fuentes, radios | `style.css` variables | Dev + diseñador |
| `page.tsx` | La página principal del site | `front-page.php` | Dev |
| `layout.tsx` | El HTML que envuelve todas las páginas | `header.php` + `footer.php` juntos | Dev senior |
| `globals.css` | Estilos base, variables CSS — **único por cliente, nunca por bloque** | `style.css` global | Dev senior |
| `tailwind.config.ts` | Conecta los tokens con Tailwind | `functions.php` (enqueue styles) | Dev senior |
| `src/blocks/registry.ts` | Mapa de bloques del cliente para el BlockRenderer | `register_block_type()` | Dev |

> 💡 **En producción:** cada cliente real vive en su propio repo (`site-{slug}/`) con esta misma estructura. `site-demo` es el modelo de referencia.

### Niveles de uso de bloques en cliente

| Level | Descripción | Dónde |
|---|---|---|
| **Level 1** | Re-export del base-block sin cambios (adoptar tal cual) | `src/blocks/{Name}Block/index.ts` re-exporta desde `@hwp/core-ui/base-blocks` |
| **Level 2** | Re-export con slots rellenados (añadir secciones) | `src/blocks/{Name}Block/index.ts` usa `HeroBlock.slots.ts` |
| **Level 3** | Componente completamente custom (DOM propio) | `src/blocks/{Name}Block/{Name}Block.tsx` nuevo |

---

### packages/ — El código compartido

```
packages/
├── 📦 core-ui/                        ← Bloques base, schemas, tipos y renderer compartidos
│   └── src/
│       ├── index.ts                   ← Public API principal del package
│       ├── base-blocks/               ← Bloques de referencia (plataforma) — exportados por @hwp/core-ui/base-blocks
│       │   ├── HeroBlock/
│       │   ├── BookingBlock/
│       │   ├── MediaTextBlock/
│       │   └── ...
│       ├── schemas/                   ← Zod schemas compartidos — exportados por @hwp/core-ui/schemas
│       ├── types/                     ← Tipos TypeScript compartidos
│       ├── renderer/
│       │   ├── BlockRenderer.tsx      ← Acepta layout: BlockInstance[] + blocks? (client block map)
│       │   └── baseBlockRegistry.ts   ← Registry de los base-blocks (antes blockRegistry.ts)
│       ├── composition-rules/         ← Módulo de reglas de composición de páginas
│       ├── layout/                    ← SiteShell, Navbar, Footer
│       └── theme/tokens.contract.ts   ← Define la forma correcta de un tokens.json
│
└── 📦 config/                         ← Configuraciones compartidas (Tailwind preset)
    └── src/
        ├── tailwind-preset.ts         ← La "fábrica" que convierte tokens → utilidades CSS
        └── index.ts                   ← Exporta el preset
```

| Package | 🎯 Para qué sirve | 🔄 Equivalente WP | 👤 Quién lo toca |
|---|---|---|---|
| `@hwp/core-ui` | Los bloques base React, schemas y renderer compartidos | Un plugin de bloques Gutenberg | Dev |
| `@hwp/config` | Las reglas de Tailwind compartidas entre clientes | El `functions.php` del tema padre | Dev senior |

> 🔑 **Clave:** cuando cambias algo en `packages/core-ui/src/base-blocks/`, el cambio afecta a **todos** los clientes al mismo tiempo. Es como editar un plugin que usan 300 sites. Los clientes pueden sobreescribir o extender los base-blocks en su propia carpeta `src/blocks/`.

---

### docs/ — La documentación

```
docs/
├── 📄 README.md                       ← Índice de toda la documentación
├── 📄 catalog.md                      ← Lista de skills y agentes de Claude Code
│
├── 📁 guides/                         ← ESTÁS AQUÍ — guías para desarrolladores
│   ├── first-day-setup.md             ← Onboarding día 1
│   ├── project-map.md                 ← Este fichero
│   ├── daily-workflow.md              ← Flujo de trabajo diario
│   ├── wordpress-to-hwp.md            ← Diccionario WP → HWP
│   └── glossary.md                    ← Glosario de términos técnicos
│
├── 📁 architecture/                   ← Cómo está diseñado el sistema (para seniors)
│   ├── decisions.md                   ← DEC-001 a DEC-013: decisiones técnicas tomadas
│   ├── domain-model.md                ← Qué es un "cliente HWP", qué tipos existen
│   ├── briefing.md                    ← Por qué existe el proyecto
│   └── architecture.md               ← La constitución técnica del sistema (~4k líneas)
│
├── 📁 contracts/frontend/             ← Las reglas de cómo construir cada cosa
│   ├── block-contract.md              ← Cómo construir un bloque
│   ├── template-contract.md           ← Cómo construir una plantilla de página
│   ├── theme-tokens.md                ← Cómo fluyen los tokens de Figma a CSS
│   ├── structure.md                   ← Dónde vive cada fichero en el monorepo
│   └── client-composition.md          ← Cómo personalizar un site de cliente
│
├── 📁 specs/                          ← Reglas técnicas de calidad (TypeScript, tests, SEO...)
│   ├── 📁 general/                    ← Reglas transversales (todos los agentes las cargan)
│   │   ├── base-standards.md          ← Reglas comunes (TS strict, Zod, TDD, commits...)
│   │   ├── lifecycle.md               ← Cuándo un bloque pasa de alpha → beta → stable
│   │   └── agent-standards.md         ← Gates de calidad: STD-AGENT-VISUAL/SEO/SECURITY
│   │
│   ├── 📁 frontend/                   ← Reglas React / Next.js / Tailwind / a11y
│   │   └── frontend-standards.md
│   │
│   ├── 📁 seo/                        ← Reglas SEO, HTML semántico, LLM, performance
│   │   ├── seo-standards.md           ← Títulos, meta descriptions, headings, imágenes
│   │   ├── semantic-html.md           ← Elementos semánticos por bloque, regla no-div
│   │   ├── local-seo.md               ← NAP, coordenadas geo, keywords de localización
│   │   ├── geo-llm-optimization.md    ← Contenido citable, JSON-LD para LLMs, FAQPage
│   │   ├── performance-seo.md         ← Core Web Vitals como factor SEO (LCP/CLS/INP)
│   │   └── 📁 schemas/                ← 11 templates JSON-LD listos para usar
│   │       ├── README.md              ← Índice: tipo de página → schemas a cargar
│   │       ├── campground-homepage.json
│   │       ├── restaurant.json
│   │       ├── environment-tourist-attraction.json
│   │       ├── accommodation-single.json
│   │       ├── accommodation-list.json
│   │       ├── reviews.json
│   │       ├── offers.json
│   │       ├── faq.json
│   │       ├── event.json
│   │       ├── breadcrumbs.json
│   │       └── organization.json
│   │
│   ├── 📁 security/                   ← (próximamente — RGPD, CSP, headers)
│   └── 📁 cms/                        ← (próximamente — reglas Payload CMS)
│
├── 📁 skills/frontend/                ← Guías de "cómo hacer X" (orientadas a tarea)
│   ├── block-creation.md              ← Cómo crear un bloque nuevo paso a paso
│   └── theme-tokens-pipeline.md       ← Cómo extraer tokens de Figma e integrarlos
│
├── 📁 plans/                          ← Los planes de desarrollo por fase
│   ├── walking-skeleton.md            ← Plan de las fases A y B (monorepo + tokens)
│   ├── phase-0-frontend-skeleton.md   ← Plan detallado de la fase 0
│   └── phase-1-design-system/         ← Plan de la fase 1 (sistema de diseño)
│
├── 📁 clients/                        ← Análisis de diseño por cliente
│   ├── base-template/                 ← Análisis del template base de Figma
│   └── hotel-balneario-fuente-*/      ← Análisis del primer cliente real
│
├── 📁 diagrams/                       ← Diagramas técnicos (Mermaid)
│   ├── monorepo-overview.md           ← Visión global del monorepo
│   ├── page-tetris.md                 ← Cómo se ensamblan bloques en páginas
│   └── ...                            ← Más diagramas de arquitectura
│
└── 📁 stories/                        ← User Stories detalladas (pendiente)
    ├── frontend/
    ├── infra/
    └── cms/
```

---

### .claude/ — Los agentes y skills

```
.claude/
├── 📁 agents/                             ← Los 11 agentes especializados
│   ├── planner.md                         ← Diseña la propuesta técnica (Opus)
│   ├── implementer.md                     ← Escribe el código TDD-first (Sonnet)
│   ├── reviewer.md                        ← Revisa el diff de forma independiente (Opus)
│   ├── verifier.md                        ← Ejecuta los gates CI: typecheck/test/lint/build (Haiku)
│   ├── architect.md                       ← Guarda la arquitectura y las decisiones (Opus)
│   ├── senior-developer.md                ← Experto en patrones del core (Sonnet)
│   ├── ux-ui-analyst.md                   ← Compara el resultado con Figma (Sonnet)
│   ├── seo-geo-specialist.md              ← Audita el HTML semántico y SEO (Sonnet)
│   ├── security-specialist.md             ← Audita RGPD y cabeceras de seguridad (Sonnet)
│   ├── qa-engineer.md                     ← QA de comportamiento y responsive (Sonnet)
│   └── docs-writer.md                     ← Mantiene la documentación actualizada (Sonnet)
└── 📁 skills/                             ← Skills invocables con /comando
    ├── commit/
    ├── enrich-us/
    ├── import-figma/
    ├── plan-to-stories/
    ├── scaffold-block/                    ← Crea un base-block en @hwp/core-ui/src/base-blocks/
    ├── scaffold-variant/
    └── scaffold-site/                     ← Bootstrapea un nuevo repo de cliente
```

> 🔄 **Equivalente WP:** los agentes son como un equipo de freelancers especializados que llamas cuando necesitas algo concreto — el SEO experto, el auditor de seguridad, el developer senior. No los llamas para todo; los convocas para la tarea que es su especialidad.
>
> 📖 Ver la lista completa con roles y modelos: `docs/specs/ai/agent-directory.md`
> 👥 Ver los equipos predefinidos por tipo de tarea: `docs/specs/ai/agent-teams-playbook.md`

---

## 📁 figma-makes/ — Las referencias de diseño

```
figma-makes/
├── 📁 base-template/                  ← El diseño genérico exportado de Figma
│   └── src/app/
│       ├── components/                ← Los componentes tal como Figma los exporta
│       │   ├── HeroSection.tsx        ← Hero con imagen y título
│       │   ├── BookingWidget.tsx      ← Widget de reservas
│       │   ├── AccommodationCard.tsx  ← Tarjeta de alojamiento
│       │   ├── SiteNavigation.tsx     ← Barra de navegación
│       │   ├── SiteFooter.tsx         ← Pie de página
│       │   └── ...                    ← Más componentes
│       └── styles/theme.css           ← Los tokens en formato CSS (Tailwind v4)
│
└── 📁 hotel-balneario-fuente-de-cabriel/  ← El primer cliente real
    └── src/app/components/            ← Sus componentes específicos
```

> ⚠️ **Importante:** `figma-makes/` es **solo lectura**. Son repos independientes clonados desde Figma. No los edites — cualquier cambio se sobreescribirá en la próxima importación.
>
> 🔄 **Equivalente WP:** es como tener el PSD del diseñador. Lo miras para saber cómo debe quedar, pero no editas el PSD.

---

## Cómo navegar según la tarea

| Si necesitas... | Ve a... |
|---|---|
| Ver cómo quedar visualmente | `figma-makes/{cliente}/src/app/components/` |
| Modificar colores del cliente | `apps/site-{cliente}/src/theme/tokens.json` |
| Crear o editar un base-block (plataforma) | `packages/core-ui/src/base-blocks/` |
| Crear o editar un bloque de cliente | `apps/site-{cliente}/src/blocks/` |
| Personalizar un site de cliente | `apps/site-{cliente}/src/compositions/` |
| Ver los schemas Zod compartidos | `packages/core-ui/src/schemas/` |
| Ver las reglas de composición | `packages/core-ui/src/composition-rules/` |
| Entender una decisión técnica | `docs/architecture/decisions.md` |
| Saber las reglas de código | `docs/specs/general/base-standards.md` |
| Aprender a hacer algo | `docs/skills/frontend/` |

---

## En términos simples

Imagina WordPress pero en lugar de un site con un tema, tienes:

- **Un "tema padre" compartido** (`packages/core-ui`) con todos los bloques base y estilos base.
- **Un "tema hijo" por cliente** (`apps/site-{cliente}`) con los colores, fuentes, bloques propios y personalizaciones de ese cliente.
- **Una librería de bloques base** (`packages/core-ui/src/base-blocks/`) que los clientes pueden usar tal cual (Level 1), extender con slots (Level 2), o reemplazar completamente (Level 3).
- **Schemas y tipos compartidos** (`packages/core-ui/src/schemas/`, `packages/core-ui/src/types/`) exportados por subpath para que los clientes siempre validen datos con las mismas definiciones.
- **Un gestor de proyectos** (Turborepo) que sabe en qué orden compilar todo para que funcione.

Los clientes reales viven en repos independientes que consumen `@hwp/core-ui` como package npm privado. `apps/site-demo/` es el modelo de referencia que vive en este monorepo.
