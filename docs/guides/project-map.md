# 🗺️ Mapa del proyecto

> Imprime esto o tenlo abierto el primer día. Todo lo que necesitas saber sobre dónde vive cada cosa.

---

## Vista general — los 3 repos + los extras

```
{workspace-root}/
│
├── 📁 hwe-tools/           ← ESTE REPO — skills, agentes, docs, specs
│   ├── .claude/            ← Skills invocables, agentes, comandos, settings
│   ├── docs/               ← Toda la documentación (guías, specs, contratos, diagramas)
│   └── compatibility.json  ← Versiones compatibles entre tools y core
│
├── 📁 hwe-core/            ← Paquetes npm (@hwe/core-ui, @hwe/config)
│   ├── packages/core-ui/   ← base-blocks, schemas, renderer, adapters, primitives, theme
│   ├── packages/config/    ← tsconfig base, tailwind preset
│   └── apps/site-demo/     ← Fixture de prueba — valida packages antes de publicar
│
├── 📁 hwe-template/        ← Template de GitHub — se clona una vez por cliente
│   ├── .hwe-tools/         ← Submódulo → hwe-tools
│   └── src/                ← Estructura vacía lista para usar
│
├── 📁 site-{slug}/         ← Un repo por cliente (clonado desde hwe-template)
│   ├── .hwe-tools/         ← Submódulo → hwe-tools (skills y docs disponibles aquí)
│   ├── src/                ← Todo el código del cliente
│   └── docs/               ← Docs propias del cliente (audits, block-specs, stories...)
│
└── 📁 figma-makes/         ← Refs de diseño del diseñador (solo lectura — DEC-002)
    ├── base-template/
    └── {slug}/
```

---

## 📁 site-{slug}/ — El repo de un cliente

Este es el repo donde trabaja el dev de cliente en el día a día. Tiene submontado `hwe-tools` como `.hwe-tools/`.

```
site-{slug}/
│
├── 🤖 .hwe-tools/                     ← Submódulo git → hwe-tools
│   ├── .claude/skills/                ← Skills invocables: /scaffold-block, /seo-audit...
│   ├── .claude/agents/                ← 11 agentes especializados
│   └── docs/                          ← Specs, contratos, guías (ESTE fichero está aquí)
│
├── 🎨 src/
│   ├── 📁 app/                        ← Next.js 15 App Router
│   │   ├── layout.tsx                 ← HTML base: <html lang=…>, fonts, providers
│   │   ├── page.tsx                   ← Página de inicio → HomeComposition
│   │   ├── globals.css                ← @import "tailwindcss" + @theme {} del cliente
│   │   ├── sitemap.ts
│   │   └── robots.ts
│   │
│   ├── 📁 blocks/                     ← Bloques propios del cliente (Level 1–3)
│   │   ├── registry.ts                ← Mapa de bloques → BlockRenderer
│   │   ├── HeroBlock/HeroBlock.tsx    ← Level 1: re-export de @hwe/core-ui/base-blocks
│   │   ├── MediaTextBlock/            ← Level 2: base-block + slot personalizado
│   │   └── FAQBlock/                  ← Level 3: componente custom completo
│   │
│   ├── 📁 compositions/               ← Páginas estáticas ensambladas a mano
│   │   ├── HomeComposition.tsx
│   │   └── ContactComposition.tsx
│   │
│   ├── 📁 theme/
│   │   └── tokens.json                ← Colores, fuentes, espaciados del cliente
│   │
│   └── 📁 data/
│       └── fake-content.ts            ← Contenido de prueba para desarrollo
│
├── 📁 docs/                           ← Docs propias del cliente
│   ├── design-language.md             ← Patrones visuales (generado por /import-figma)
│   ├── figma-analysis.md              ← Análisis del Figma Make
│   ├── audits/                        ← Informes de /seo-audit y /security-audit
│   ├── block-specs/                   ← Specs visuales de /design-block
│   └── stories/                       ← User Stories por cliente
│
├── 📁 public/
│   ├── brand/                         ← Logo, favicon, og-image
│   └── fonts/                         ← Solo si las fuentes son self-hosted
│
├── ⚙️  client.config.ts               ← Configuración única del cliente
├── ⚙️  next.config.mjs
├── ⚙️  postcss.config.mjs
├── 📄  package.json                   ← @hwe/core-ui + @hwe/config (npm privado)
└── 📄  tsconfig.json
```

| Fichero | 🎯 Para qué sirve | 🔄 Equivalente WP | 👤 Quién lo toca |
|---|---|---|---|
| `tokens.json` | Los valores de diseño: colores, fuentes, radios | `style.css` variables | Dev + diseñador |
| `globals.css` | `@import "tailwindcss"` + `@theme {}` del cliente | `style.css` global | Dev senior |
| `src/app/page.tsx` | La página de inicio del site | `front-page.php` | Dev |
| `src/app/layout.tsx` | El HTML que envuelve todas las páginas | `header.php` + `footer.php` | Dev senior |
| `client.config.ts` | Configuración del tenant: adapter, features, blockDefaults | `functions.php` | Dev senior |
| `src/blocks/registry.ts` | Mapa de bloques del cliente para BlockRenderer | `register_block_type()` | Dev |

> 💡 **site-demo** en `hwe-core/apps/site-demo/` es el modelo de referencia del equipo de plataforma. Tiene la misma estructura que un repo de cliente real.

### Niveles de uso de bloques en cliente

| Level | Descripción | Patrón |
|---|---|---|
| **Level 1** | Re-export del base-block sin cambios | `export { HeroBlock } from '@hwe/core-ui/base-blocks'` |
| **Level 2** | Re-export con slots rellenados | `<BaseHeroBlock {...props} CtaSlot={MyBookingCta} />` |
| **Level 3** | Componente completamente custom | JSX propio, solo importa tipos de `@hwe/core-ui/schemas` |

---

## 📦 hwe-core/ — Los paquetes compartidos

El dev de plataforma trabaja aquí cuando añade base-blocks, schemas o adapters.

```
hwe-core/
├── 📦 packages/core-ui/               ← @hwe/core-ui (publica base-blocks, schemas, renderer…)
│   └── src/
│       ├── index.ts                   ← Public API principal
│       ├── base-blocks/               ← Bloques de referencia → subpath @hwe/core-ui/base-blocks
│       ├── schemas/                   ← Zod schemas compartidos → subpath @hwe/core-ui/schemas
│       ├── types/                     ← Tipos TypeScript derivados de schemas
│       ├── adapters/
│       │   └── booking/               ← BookingAdapter + BookingProvider + stock adapters
│       ├── renderer/
│       │   ├── BlockRenderer.tsx      ← Acepta layout: BlockInstance[] + blocks? (client map)
│       │   └── baseBlockRegistry.ts   ← Registry de los base-blocks de plataforma
│       ├── primitives/                ← shadcn/Radix: Button, Input, Dialog...
│       ├── layout/                    ← SiteShell, Navbar, Footer
│       ├── providers/                 ← TenantProvider, SeasonProvider
│       ├── composition-rules/         ← Reglas de composición de páginas
│       └── theme/tokens.contract.ts   ← Define la forma correcta de un tokens.json
│
├── 📦 packages/config/                ← @hwe/config
│       └── theme.css                  ← @theme base (Tailwind v4) importado en globals.css del cliente
│
└── 📁 apps/site-demo/                 ← Fixture de prueba (espejo de estructura de cliente)
```

| Package | 🎯 Para qué sirve | 🔄 Equivalente WP | 👤 Quién lo toca |
|---|---|---|---|
| `@hwe/core-ui` | Los bloques base React, schemas y renderer | Un plugin de bloques Gutenberg | Dev de plataforma |
| `@hwe/config` | La configuración base de Tailwind + tsconfig | El `functions.php` del tema padre | Dev senior plataforma |

> 🔑 **Clave:** cuando cambias algo en `packages/core-ui/src/base-blocks/`, el cambio afecta a **todos los clientes** en la próxima release del package. Los clientes pueden sobreescribir los base-blocks en su propia carpeta `src/blocks/`.

---

## 🤖 hwe-tools/ — Las herramientas de IA

Este repo es el submodulo que se monta como `.hwe-tools/` en cada repo de cliente y en `hwe-core`. Contiene las herramientas que usa Claude Code.

```
hwe-tools/
├── 📁 .claude/
│   ├── agents/                        ← Los 11 agentes especializados
│   │   ├── planner.md                 ← Diseña la propuesta técnica (Opus)
│   │   ├── implementer.md             ← Escribe el código TDD-first (Sonnet)
│   │   ├── reviewer.md                ← Revisa el diff independientemente (Opus)
│   │   ├── verifier.md                ← CI gates: typecheck/test/lint/build (Haiku)
│   │   ├── architect.md               ← Guarda la arquitectura y las decisiones (Opus)
│   │   ├── senior-developer.md        ← Experto en patrones del core (Sonnet)
│   │   ├── ux-ui-analyst.md           ← Visual: Figma vs impl + design proposals (Sonnet)
│   │   ├── seo-geo-specialist.md      ← SEO, HTML semántico, structured data (Sonnet)
│   │   ├── security-specialist.md     ← RGPD, cabeceras, inputs (Sonnet)
│   │   ├── qa-engineer.md             ← QA comportamiento y responsive (Sonnet)
│   │   └── docs-writer.md             ← Mantiene la documentación (Sonnet)
│   │
│   ├── skills/                        ← Skills invocables con /comando
│   │   ├── scaffold-block/            ← /scaffold-block — crea base-block o client block
│   │   ├── scaffold-site/             ← /scaffold-site — configura repo clonado de template
│   │   ├── import-figma/              ← /import-figma — importa Figma Make con tag
│   │   ├── design-block/              ← /design-block — spec visual sin Figma
│   │   ├── seo-audit/                 ← /seo-audit — auditoría SEO completa
│   │   ├── security-audit/            ← /security-audit — auditoría de seguridad
│   │   ├── add-block/                 ← /add-block — añade bloque con fake content
│   │   ├── create-page/               ← /create-page — crea nueva página
│   │   ├── commit/                    ← /commit — commit con Conventional Commits
│   │   └── archive/                   ← /archive — cierra story SPECBOOT
│   │
│   ├── templates/                     ← Plantillas para skills
│   │   ├── design-language.md         ← Template para /import-figma
│   │   └── visual-spec.md             ← Template para /design-block
│   │
│   └── settings.json                  ← Permisos de Claude Code
│
├── 📁 docs/
│   ├── 📄 README.md                   ← Índice de toda la documentación
│   ├── 📄 catalog.md                  ← Lista de skills y agentes
│   │
│   ├── 📁 guides/                     ← ESTÁS AQUÍ — guías para desarrolladores
│   │   ├── first-day-setup.md         ← Onboarding día 1
│   │   ├── project-map.md             ← Este fichero
│   │   ├── daily-workflow.md          ← Flujo de trabajo diario
│   │   ├── wordpress-to-hwe.md        ← Diccionario WP → hwe
│   │   └── glossary.md                ← Glosario de términos técnicos
│   │
│   ├── 📁 architecture/               ← Diseño del sistema (para seniors)
│   │   ├── decisions.md               ← DEC-001 a DEC-017
│   │   ├── DEC-017-Repo-Split.md      ← Los 3 repos en detalle
│   │   ├── domain-model.md            ← Qué es un "cliente hwe"
│   │   ├── briefing.md                ← Por qué existe el proyecto
│   │   └── architecture.md            ← La constitución técnica (~4k líneas)
│   │
│   ├── 📁 contracts/frontend/         ← Reglas de cómo construir cada cosa
│   │   ├── block-contract.md
│   │   ├── template-contract.md
│   │   ├── theme-tokens.md
│   │   ├── structure.md
│   │   └── client-composition.md
│   │
│   ├── 📁 specs/                      ← Reglas técnicas de calidad
│   │   ├── general/                   ← base-standards, lifecycle, agent-standards
│   │   ├── frontend/                  ← frontend-standards, coding-standards, block-architecture
│   │   ├── seo/                       ← SEO, semantic-html, local-seo, geo-llm + 11 JSON-LD
│   │   └── security/                  ← security-standards (RGPD, CSP, headers, secrets)
│   │
│   ├── 📁 skills/                     ← Guías de "cómo hacer X"
│   │   ├── frontend/                  ← block-creation, theme-tokens-pipeline
│   │   ├── security/                  ← 8 guías de auditoría de seguridad
│   │   └── seo/                       ← 7 guías de auditoría SEO
│   │
│   └── 📁 diagrams/                   ← Diagramas técnicos (Mermaid)
│       ├── monorepo-overview.md        ← Visión global de los 3 repos
│       ├── block-resolution-chain.md   ← Cómo se fusionan base + client registries
│       ├── block-variant-resolution.md ← Cómo se resuelve la variante de un bloque
│       ├── token-cascade.md            ← Flujo de tokens: global → semantic → brand
│       ├── booking-architecture.md     ← BookingAdapter en @hwe/core-ui
│       ├── core-ui-internal.md         ← Interno de @hwe/core-ui
│       ├── figma-to-production.md      ← Onboarding de cliente completo
│       └── page-tetris.md             ← Cómo se ensamblan bloques en páginas
│
└── 📄 compatibility.json              ← Versiones compatibles tools ↔ @hwe/core-ui
```

---

## 📁 figma-makes/ — Las referencias de diseño

```
figma-makes/
├── 📁 base-template/                  ← El diseño genérico exportado de Figma
│   └── src/app/
│       ├── components/                ← Componentes tal como Figma los exporta
│       └── styles/theme.css           ← Tokens en formato CSS (Tailwind v4)
│
└── 📁 {slug}/                         ← Un repo por cliente (DEC-002)
    └── ...
```

> ⚠️ **Importante:** `figma-makes/` es **solo lectura**. Son repos independientes clonados desde Figma. No los edites — cualquier cambio se sobreescribirá en la próxima importación.

---

## Cómo navegar según la tarea

| Si necesitas... | Ve a... |
|---|---|
| Ver cómo quedar visualmente | `figma-makes/{slug}/src/app/components/` |
| Modificar colores del cliente | `src/theme/tokens.json` + `src/app/globals.css @theme {}` |
| Crear o editar un base-block (plataforma) | `hwe-core/packages/core-ui/src/base-blocks/` |
| Crear o editar un bloque de cliente | `src/blocks/` |
| Personalizar una página del cliente | `src/compositions/` |
| Ver los schemas Zod compartidos | `hwe-core/packages/core-ui/src/schemas/` |
| Entender una decisión técnica | `docs/architecture/decisions.md` |
| Saber las reglas de código | `docs/specs/general/base-standards.md` |
| Aprender a hacer algo | `docs/skills/frontend/` |
| Usar una skill de Claude Code | `.hwe-tools/.claude/skills/` |

---

## En términos simples

Imagina WordPress pero separado en 3 repos independientes:

- **hwe-core** (`packages/core-ui`) → el "tema padre" con todos los bloques base.
- **site-{cliente}** (`src/blocks/`, `src/compositions/`) → el "tema hijo" con los colores, fuentes y personalizaciones del cliente.
- **hwe-tools** (`.hwe-tools/`) → el "kit de herramientas" con skills de IA, specs y documentación.

Los tres repos se usan juntos: el cliente tiene hwe-tools como submódulo, y consume `@hwe/core-ui` como package npm.
