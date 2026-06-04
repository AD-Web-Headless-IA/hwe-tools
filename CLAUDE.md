# hwe-tools — Contexto para Claude Code

> Este repo es **`hwe-tools`** — el submodulo de herramientas que se monta como `hwe-tools/` en cada repo cliente y en `hwe-core`. No contiene código de producción: solo skills, agentes, documentación y specs.
>
> **Antes de empezar cualquier tarea en un repo cliente, lee `docs/README.md`** — mapea cada tipo de tarea al conjunto mínimo de ficheros a cargar.

---

## Arquitectura de 3 repos (DEC-017)

```
hwe-tools/          ← ESTE REPO — submodulo git
  .claude/          ← skills, agents, commands, settings
  docs/             ← arquitectura, contratos, specs, guías
  .claude/templates/ ← plantillas para /design-block e /import-figma
  compatibility.json

hwe-core/           ← repo separado — paquetes npm
  packages/
    core-ui/        → @hwe/core-ui (base-blocks, schemas, renderer, theme, adapters)
    config/         → @hwe/config (tailwind preset, tsconfig base)

hwe-template/       ← repo template de GitHub
  hwe-tools/       ← submodulo → hwe-tools
  src/              ← estructura vacía lista para clonar por cliente

site-{slug}/        ← repos independientes por cliente (clonados desde hwe-template)
  hwe-tools/       ← submodulo → hwe-tools
  src/
    blocks/         ← implementaciones propias del cliente (Levels 1/2/3)
    compositions/
    theme/
    app/
  docs/             ← audits, block-specs, stories, design-language
```

`figma-makes/{slug}/` — repos del diseñador, fuera de todos los proyectos (DEC-002).

---

## Reglas que SIEMPRE están en contexto

| Fichero | Qué es |
|---|---|
| `docs/specs/general/base-standards.md` | Reglas comunes (TS strict, Zod, TDD, English, naming, commits) |
| `docs/specs/frontend/frontend-standards.md` | Reglas React/Next/Tailwind/a11y/i18n (extiende base) |
| `docs/specs/frontend/coding-standards.md` | Reglas de codificación hwe del día a día |
| `docs/specs/security/security-standards.md` | Seguridad y RGPD — obligación legal |
| `docs/specs/general/lifecycle.md` | alpha → beta → stable — criterios de promoción |

---

## Documentación principal (carga selectiva — ver `docs/README.md`)

- **Overview + índice "dónde vive cada cosa":** `docs/architecture/architecture.md` — mapa de 1 pantalla (visión, stack vigente, tabla de punteros). Ya no es una constitución por secciones (DEC-018). El texto histórico está en `docs/architecture/architecture-legacy.md` — **no lo cargues para el estado actual.**
- **Modelo de dominio:** `docs/architecture/domain-model.md` — **cargar SIEMPRE** en tareas de clasificación de bloques/templates, schemas, routing.
- **Frontend (cómo construir):** `docs/contracts/frontend/` — `structure.md`, `block-contract.md`, `template-contract.md`, `theme-tokens.md`, `client-composition.md`.
- **Block architecture (4 capas):** `docs/specs/frontend/block-architecture.md` — **cargar SIEMPRE** en cualquier tarea de bloques.
- **Decisiones:** `docs/architecture/decisions.md` — DEC-001 a DEC-017. Greppea antes de proponer cambios estructurales.
- **Catálogo:** `docs/catalog.md`.

---

## Lo esencial del stack

- **Frontend:** Next.js 15 + TypeScript strict + Tailwind v4 (CSS-first `@theme`) + React 19
- **Testing:** Vitest + @testing-library/react + vitest-axe + Playwright + msw (DEC-006)
- **Packages:** `@hwe/core-ui` + `@hwe/config` (en `hwe-core/`, consumidos vía npm privado)
- **Deploy:** Vercel — un proyecto por cliente (DEC-007)
- **IA:** Claude API siempre via Next.js Route Handler server-side (DEC-007)

---

## Estructura de paquetes `@hwe/core-ui` (DEC-015 + DEC-017)

| Subpath export | Contenido |
|---|---|
| `@hwe/core-ui` | renderer, providers, layout, theme, primitives |
| `@hwe/core-ui/base-blocks` | implementaciones de referencia de cada bloque |
| `@hwe/core-ui/schemas` | Zod schemas compartidos |
| `@hwe/core-ui/theme` | token contract + CSS variables |

**Adapters** (booking, map, reviews, form) viven en `@hwe/core-ui/src/adapters/` — no existe `@hwe/booking` como paquete separado (DEC-017 elimina ese paquete).

---

## Bloques: dónde viven

| Tipo | Directorio | Registry |
|---|---|---|
| Base block (platform) | `hwe-core/packages/core-ui/src/base-blocks/{Name}/` | `baseBlockRegistry.ts` |
| Client block (Level 1-3) | `src/blocks/{Name}/` en el repo cliente | `src/blocks/registry.ts` |

### Los 3 niveles de uso en repos cliente

```ts
// Level 1 — re-export (~70%)
export { HeroBlock } from '@hwe/core-ui/base-blocks';

// Level 2 — slots (~20%)
import { HeroBlock as BaseHero } from '@hwe/core-ui/base-blocks';
export function HeroBlock(props) {
  return <BaseHero {...props} CtaSlot={MyBookingCta} />;
}

// Level 3 — full custom (~10%)
import type { HeroBlockContent } from '@hwe/core-ui/schemas';
export function HeroBlock({ content }) { /* JSX propio */ }
```

---

## Reglas no negociables

- Nunca `if (client === 'nombre')` en `@hwe/core-ui` — usar adapter pattern.
- Sin `any` en TypeScript.
- Validación Zod en cada boundary del sistema.
- TDD — tests antes que código (DEC-006).
- Conventional Commits en inglés (DEC-001).
- **Documentación antes que código** (SPECBOOT). Sin proposal artifact aprobado, no se implementa.
- **RGPD compliance es obligación legal** — toda violación es blocker de producción.

---

## Agentes especializados

11 agentes en `.claude/agents/` — 4 del pipeline SPECBOOT y 7 especialistas de dominio.

| Tarea | Agente |
|---|---|
| Diseñar la solución técnica | `planner` (Opus) |
| Implementar TDD-first | `implementer` (Sonnet) |
| Revisión independiente del diff | `reviewer` (Opus) |
| Verificar CI gates (typecheck/test/lint/build) | `verifier` (Haiku) |
| Validar arquitectura o proponer DEC | `architect` (Opus) |
| Guía de patrones del core | `senior-developer` (Sonnet) |
| Auditoría visual vs Figma | `ux-ui-analyst` (Sonnet) |
| Auditoría SEO / HTML semántico | `seo-geo-specialist` (Sonnet) |
| Auditoría seguridad / RGPD | `security-specialist` (Sonnet) |
| QA de comportamiento y responsive | `qa-engineer` (Sonnet) |
| Cerrar story tras verify (`/archive`) | `docs-writer` (Sonnet) |

Referencia completa: `docs/specs/ai/agent-directory.md`. Equipos predefinidos: `docs/specs/ai/agent-teams-playbook.md`.

---

## Metodología

**SPECBOOT:** `/enrich-us` → `/propose` → `/apply` → `/verify` → `/archive` → `/commit`.

Skills disponibles (registradas en `docs/catalog.md`):
- `/scaffold-block {Name} [--target base|client] [--site <slug>]` — crea bloque en `base-blocks/` o en el repo cliente.
- `/scaffold-site <slug>` — configura un repo cliente clonado desde hwe-template.
- `/import-figma <git-url> [slug]` — importa un Figma Make con tag por importación (DEC-002).
- `/design-block {BlockName} --client {slug}` — visual spec para bloques sin referencia Figma (DEC-016).
- `/enrich-us <path>` — enriquece una user story.
- `/plan-to-stories <plan>` — pipeline plan → stories enriquecidas.
- `/seo-audit [slug]` — auditoría SEO completa.
- `/security-audit [slug]` — auditoría de seguridad completa.
- `/archive <story-path>` — cierra story tras verify verde.

---

## Compatibilidad de versiones

Ver `compatibility.json` en la raíz — mapea versión de tools a versiones compatibles de `@hwe/core-ui` y `@hwe/config`.

---

## Onboarding de nuevo cliente

```
1. Create repo  → GitHub "Use this template" desde hwe-template
2. Clone        → git clone --recurse-submodules site-{slug}
3. Install      → npm install (@hwe/core-ui + @hwe/config desde npm privado)
4. Import Figma → /import-figma → tokens.json + design-language.md
5. Configure    → client.config.ts, globals.css, layout.tsx lang
6. Customize    → blocks (Level 1/2/3), páginas (/create-page), contenido (/add-block)
7. Audit        → /seo-audit + /security-audit
8. Deploy       → Vercel, dominio personalizado
```

---

## Workspace

> Fuente de verdad completa: `docs/contracts/general/workspace-structure.md`

- El workspace root es el directorio que abre el developer — su nombre varía por máquina. **Sin paths absolutos en ningún fichero.**
- `hwe-tools/` — este repo (submodulo montado en `hwe-core/`, `hwe-template/` y cada `site-{slug}/`)
- `hwe-core/` — paquetes npm `@hwe/core-ui` + `@hwe/config` (Turborepo). `apps/site-demo/` es fixture de test, no repo cliente.
- `hwe-template/` — repo template de GitHub, se clona una vez por cliente
- `site-{slug}/` — repos cliente independientes, pueden vivir en cualquier directorio del filesystem
- `figma-makes/` — carpeta plain (no git repo) con un repo clonado por cliente. `base-template/` es la referencia para el proyecto de demo/test.

---

## Idioma

- **Conversación humano-IA:** español.
- **Artefactos técnicos** (código, tests, commits, docs, specs, user stories): **inglés** (DEC-001).
- **Artefactos de negocio** (briefings cliente, brand, copy): idioma natural del cliente.

---

## Cuando estés perdido

1. `docs/README.md` — qué ficheros cargar según la tarea.
2. `docs/architecture/domain-model.md` — qué es un cliente hwe, cómo se modela el multi-tenant.
3. `docs/architecture/decisions.md` — qué decisiones ya están tomadas.
4. `docs/architecture/briefing.md` — por qué existe el proyecto.
5. `compatibility.json` — versiones compatibles entre tools y core.
