# Walking Skeleton — HWP Phase 0

> Plan para crear el primer vertical slice funcional de HWP: un site de camping visible en `localhost:3000` con bloques reales, theme del Figma, BlockRenderer funcionando, y contenido fake. Diseñado para validar la arquitectura antes de escalar.
>
> **Prerrequisito:** Node.js instalado. Instalar antes de empezar.
>
> **Referencia visual:** `figma-makes/base-template/` (Camping Mer et Camargue). Claude Code debe leer los componentes de `figma-makes/base-template/src/app/components/` y `src/styles/theme.css` como referencia visual — NO copiar el código, sino reconstruirlo con la arquitectura HWP.

---

## Objetivo

Abrir `localhost:3000` y ver una home de camping funcional con:
- Navegación (header + footer)
- Hero con booking widget sticky
- Sección "À propos" (media + texto)
- Grid de alojamientos (3 cards)
- Grid de amenities (4 tiles)
- Sección regional (media + texto, imagen a la derecha)
- Reviews (3 cards)
- Theme real del Figma (Playfair Display + Montserrat, teal palette)

Todo montado con la arquitectura HWP real: monorepo, `@hwp/core-ui` con bloques, BlockRenderer, registry, variantes, theme tokens.

---

## Lo que valida

| Decisión arquitectónica | Cómo se valida |
|---|---|
| Monorepo Turborepo + pnpm | El site en `apps/` importa de `packages/` y funciona |
| `@hwp/core-ui` con base-blocks/ | 5 bloques reales renderizando |
| BlockRenderer + registry | La home se monta iterando un `layout[]` fake |
| Structural variants (DEC-008) | Al menos 1 bloque con 2 variantes estructurales |
| Theme tokens (Figma → Tailwind) | Colores y fuentes del Figma aplicados via tokens |
| Compositions per client | `HomeComposition` en `apps/site-demo/` |
| Layout (SiteShell, Navbar, Footer) | Navegación y footer envolviendo la página |
| CVA variants | Al menos 1 bloque con variante CVA (tone light/dark) |

---

## Scope explícito — qué SÍ y qué NO

### SÍ incluye
- `pnpm-workspace.yaml` + `turbo.json` configurados
- `packages/core-ui/` con 5-6 bloques, renderer, layout, theme contract
- `packages/config/` con tsconfig base + tailwind preset
- `apps/site-demo/` con Next.js 14 App Router funcionando
- Theme tokens extraídos del `base-template` Figma Make
- Contenido fake hardcodeado (no Payload aún)
- TDD: al menos 1 test por bloque (schema parse + render + axe)

### NO incluye (aún)
- Payload CMS, base de datos, API routes
- `@hwp/booking` (el BookingBlock usa fake data, no adapter real)
- `@hwp/content`, `@hwp/analytics`, `@hwp/i18n`, `@hwp/ai`
- Deploy a Vercel
- i18n (single locale por ahora)
- E2E tests con Playwright
- Segundo cliente (solo site-demo)

---

## Bloques a crear en `@hwp/core-ui`

Basados en los componentes del Figma Make `base-template`:

| Bloque HWP | Referencia Figma Make | Variante inicial | Notas |
|---|---|---|---|
| `HeroBlock` | `HeroSection.tsx` | `full` (CVA) | Hero full-viewport con overlay, headline, CTAs |
| `BookingBlock` | `BookingWidget.tsx` | `inline` (structural) | Widget de búsqueda fake. Primer candidato a structural variant: `inline` vs `sticky` |
| `MediaTextBlock` | `MediaTextBlock.tsx` | CVA: `imageLeft` / `imageRight` | Dos columnas: imagen + texto. imagePosition como CVA variant |
| `AccommodationGridBlock` | `AccommodationCard.tsx` | `cards` (CVA) | Grid de accommodation cards |
| `AmenitiesBlock` | `AmenitiesGrid.tsx` | `grid` (CVA) | Grid de amenities con iconos |
| `ReviewsBlock` | `ReviewCard.tsx` | `grid` (CVA) | Grid de guest reviews |

### Structural variant demo: BookingBlock

Para validar DEC-008, `BookingBlock` tendrá dos variantes estructurales:
- `BookingInline/` — el widget embebido en el flujo de la página
- `BookingSticky/` — el widget como sticky debajo del hero (como en el Figma)

Ambas comparten el mismo schema pero tienen DOM y comportamiento diferentes.

---

## Estructura de ficheros a generar

```
hwp-platform/
├── pnpm-workspace.yaml                    ← NEW
├── turbo.json                             ← NEW
├── package.json                           ← NEW (workspace root)
├── tsconfig.base.json                     ← NEW
│
├── packages/
│   ├── config/                            ← NEW: @hwp/config
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   ├── src/
│   │   │   ├── tailwind-preset.ts         ← createHwpPreset(tokens)
│   │   │   ├── tsconfig.base.json         ← shared TS config
│   │   │   └── index.ts
│   │   └── README.md
│   │
│   └── core-ui/                           ← NEW: @hwp/core-ui
│       ├── package.json
│       ├── tsconfig.json
│       ├── vitest.config.ts
│       ├── src/
│       │   ├── index.ts                   ← public API
│       │   │
│       │   ├── primitives/                ← empty for now (blocks use Tailwind directly)
│       │   │
│       │   ├── base-blocks/               ← (DEC-015: formerly blocks/)
│       │   │   ├── HeroBlock/
│       │   │   │   ├── HeroBlock.tsx
│       │   │   │   ├── HeroBlock.schema.ts
│       │   │   │   ├── HeroBlock.variants.ts
│       │   │   │   ├── HeroBlock.types.ts
│       │   │   │   ├── HeroBlock.slots.ts ← slot definitions for client customization
│       │   │   │   └── HeroBlock.test.tsx
│       │   │   │
│       │   │   ├── BookingBlock/          ← structural variants (DEC-008)
│       │   │   │   ├── index.ts           ← resolver
│       │   │   │   ├── BookingBlock.schema.ts
│       │   │   │   ├── BookingBlock.types.ts
│       │   │   │   ├── BookingBlock.test.tsx
│       │   │   │   ├── BookingInline/
│       │   │   │   │   └── BookingInline.tsx
│       │   │   │   └── BookingSticky/
│       │   │   │       └── BookingSticky.tsx
│       │   │   │
│       │   │   ├── MediaTextBlock/
│       │   │   │   ├── MediaTextBlock.tsx
│       │   │   │   ├── MediaTextBlock.schema.ts
│       │   │   │   ├── MediaTextBlock.variants.ts  ← imageLeft/imageRight
│       │   │   │   ├── MediaTextBlock.types.ts
│       │   │   │   └── MediaTextBlock.test.tsx
│       │   │   │
│       │   │   ├── AccommodationGridBlock/
│       │   │   │   ├── AccommodationGridBlock.tsx
│       │   │   │   ├── AccommodationGridBlock.schema.ts
│       │   │   │   ├── AccommodationGridBlock.variants.ts
│       │   │   │   ├── AccommodationGridBlock.types.ts
│       │   │   │   └── AccommodationGridBlock.test.tsx
│       │   │   │
│       │   │   ├── AmenitiesBlock/
│       │   │   │   ├── AmenitiesBlock.tsx
│       │   │   │   ├── AmenitiesBlock.schema.ts
│       │   │   │   ├── AmenitiesBlock.variants.ts
│       │   │   │   ├── AmenitiesBlock.types.ts
│       │   │   │   └── AmenitiesBlock.test.tsx
│       │   │   │
│       │   │   └── ReviewsBlock/
│       │   │       ├── ReviewsBlock.tsx
│       │   │       ├── ReviewsBlock.schema.ts
│       │   │       ├── ReviewsBlock.variants.ts
│       │   │       ├── ReviewsBlock.types.ts
│       │   │       └── ReviewsBlock.test.tsx
│       │   │
│       │   ├── schemas/                   ← (DEC-015: shared Zod schemas)
│       │   ├── types/                     ← (DEC-015: shared TypeScript types)
│       │   ├── composition-rules/         ← (DEC-015: page composition constraints)
│       │   │
│       │   ├── renderer/
│       │   │   ├── baseBlockRegistry.ts   ← (DEC-015: formerly blockRegistry.ts)
│       │   │   ├── BlockRenderer.tsx      ← accepts layout: BlockInstance[] + blocks?: Record<string, ComponentType>
│       │   │   └── BlockRenderer.test.tsx
│       │   │
│       │   ├── layout/
│       │   │   ├── SiteShell.tsx           ← Navbar + main + Footer
│       │   │   ├── Navbar/
│       │   │   │   └── Navbar.tsx
│       │   │   └── Footer/
│       │   │       └── Footer.tsx
│       │   │
│       │   └── theme/
│       │       ├── tokens.contract.ts      ← Zod schema for tokens.json
│       │       └── cssVariables.ts
│       │
│       └── README.md
│
├── apps/
│   └── site-demo/                         ← NEW: demo camping site
│       ├── package.json
│       ├── tsconfig.json
│       ├── next.config.mjs
│       ├── tailwind.config.ts             ← extends @hwp/config preset with tokens
│       ├── client.config.ts               ← demo tenant config
│       ├── src/
│       │   ├── app/
│       │   │   ├── layout.tsx             ← root layout with SiteShell
│       │   │   ├── page.tsx               ← home → HomeComposition
│       │   │   └── globals.css            ← @import fonts + tailwind directives (ONE per client)
│       │   │
│       │   ├── blocks/                    ← (DEC-015) client block folder
│       │   │   └── registry.ts            ← client block map passed to BlockRenderer
│       │   │
│       │   ├── compositions/
│       │   │   └── HomeComposition.tsx     ← assembles blocks for the demo home
│       │   │
│       │   ├── theme/
│       │   │   └── tokens.json            ← extracted from base-template Figma
│       │   │
│       │   └── data/
│       │       └── fake-content.ts        ← hardcoded content for all blocks
│       │
│       └── public/
│           └── images/                    ← placeholder images (or Figma imports)
```

---

## Orden de ejecución

### Fase A — Monorepo bootstrap (sin UI)

1. Instalar Node.js si no está
2. Crear `pnpm-workspace.yaml`, `turbo.json`, root `package.json`
3. Crear `packages/config/` con tsconfig base + tailwind preset skeleton
4. Crear `packages/core-ui/` con package.json, tsconfig, vitest config
5. Crear `apps/site-demo/` con Next.js 14 (App Router)
6. Verificar: `pnpm install` + `pnpm -r build` funciona sin errores
7. Verificar: `pnpm --filter site-demo dev` abre `localhost:3000` con página vacía

### Fase B — Theme tokens

8. Extraer tokens de `figma-makes/base-template/src/styles/theme.css` → `apps/site-demo/src/theme/tokens.json`
9. Crear `packages/core-ui/src/theme/tokens.contract.ts` (Zod schema)
10. Crear `packages/config/src/tailwind-preset.ts` que lee tokens
11. Configurar `apps/site-demo/tailwind.config.ts` que usa el preset con tokens
12. Verificar: colores y fuentes del Figma se aplican en localhost

### Fase C — Layout shell

13. Crear `Navbar.tsx` en core-ui (referencia: `SiteNavigation.tsx` del Figma)
14. Crear `Footer.tsx` en core-ui (referencia: `SiteFooter.tsx` del Figma)
15. Crear `SiteShell.tsx` que envuelve children con Navbar + Footer
16. Wiring en `apps/site-demo/src/app/layout.tsx`
17. Verificar: localhost muestra header + footer con estilos del Figma

### Fase D — Bloques (TDD)

Para cada bloque, en este orden:

18. **HeroBlock** — referencia: `HeroSection.tsx`
    - Escribir schema, test, implementar, verificar render
19. **BookingBlock** con structural variants — referencia: `BookingWidget.tsx`
    - Crear `index.ts` resolver + `BookingInline/` + `BookingSticky/`
    - Esto valida DEC-008 end-to-end
20. **MediaTextBlock** — referencia: `MediaTextBlock.tsx`
    - CVA variant: `imageLeft` / `imageRight`
21. **AccommodationGridBlock** — referencia: `AccommodationCard.tsx`
22. **AmenitiesBlock** — referencia: `AmenitiesGrid.tsx`
23. **ReviewsBlock** — referencia: `ReviewCard.tsx`

### Fase E — Renderer

24. Crear `baseBlockRegistry.ts` con los 6 bloques registrados (DEC-015: antes `blockRegistry.ts`)
25. Crear `BlockRenderer.tsx` que itera `layout: BlockInstance[]` y resuelve; acepta `blocks?: Record<string, ComponentType>` como client block map
26. Test: BlockRenderer recibe un layout[] fake y renderiza todos los bloques

### Fase F — Composición y contenido fake

27. Crear `apps/site-demo/src/data/fake-content.ts` con contenido fake para todos los bloques (textos del Figma Make, placeholder images)
28. Crear `apps/site-demo/src/compositions/HomeComposition.tsx` que:
    - Recibe data del fake-content
    - Monta el layout[] con los 6 bloques en orden
    - Pasa al BlockRenderer
29. Wiring en `apps/site-demo/src/app/page.tsx`
30. Verificar: localhost muestra la home completa con todos los bloques

### Fase G — Verificación final

31. `pnpm -r typecheck` → verde
32. `pnpm -r test` → verde (todos los tests de bloques + renderer)
33. `pnpm -r build` → verde
34. Visual check: comparar localhost con el Figma Make renderizado
35. Commit

---

## Tokens a extraer del Figma

De `figma-makes/base-template/src/styles/theme.css` `:root`:

```json
{
  "colors": {
    "background":       { "value": "#FFFFFF" },
    "foreground":       { "value": "#1A2E32" },
    "surface":          { "value": "#E4F3F5" },
    "primary":          { "value": "#1A4A52" },
    "primary-foreground": { "value": "#FFFFFF" },
    "accent":           { "value": "#9FCAD0" },
    "accent-foreground": { "value": "#1A4A52" },
    "secondary":        { "value": "#E4F3F5" },
    "muted-foreground": { "value": "#676977" },
    "border":           { "value": "rgba(159,202,208,0.35)" },
    "text-on-dark":     { "value": "#FFFFFF" }
  },
  "fonts": {
    "heading": { "family": "Playfair Display", "fallback": "serif" },
    "body":    { "family": "Montserrat",       "fallback": "sans-serif" },
    "ui":      { "family": "Montserrat",       "fallback": "sans-serif" }
  },
  "spacing": {
    "container-max": "1440px",
    "section-y":     "clamp(3rem, 8vw, 6rem)"
  },
  "radii": {
    "sm": "0.0625rem",
    "md": "0.1875rem",
    "lg": "0.3125rem"
  },
  "shadows": {
    "card":      "0 2px 20px rgba(26,74,82,0.09)",
    "elevated":  "0 8px 30px rgba(0,0,0,0.12)"
  }
}
```

---

## Contenido fake de referencia

Extraído del `HomePage.tsx` del Figma Make. Claude Code debe leer el fichero original y usar los textos, pero reconstruir los componentes con la arquitectura HWP (schemas Zod, CVA, etc.).

---

## Reglas para Claude Code

- **Lee `figma-makes/base-template/src/` como referencia visual, NO copies el código.** Reconstruye cada componente usando la arquitectura HWP: Zod schema, CVA variants, typed props, semantic HTML, accesibility.
- **TDD:** para cada bloque, escribe el test primero (schema parse + render + axe), véelo fallar, implementa, véelo pasar.
- **English** en todo artefacto técnico (DEC-001). El contenido fake puede estar en francés (es el idioma del camping demo).
- **No `any`** en TypeScript. Strict mode.
- **No `if (client === '...')`** en packages/. El contenido específico del demo vive en `apps/site-demo/`.
- Sigue los contratos: `docs/contracts/frontend/block-contract.md`, `docs/contracts/frontend/structure.md`, `docs/contracts/frontend/theme-tokens.md`.
- El BlockRenderer sigue el patrón exacto de `docs/contracts/frontend/block-contract.md` §Registry.
- El BookingBlock sigue el patrón de structural variants de `docs/contracts/frontend/block-contract.md` §Structural variants.
