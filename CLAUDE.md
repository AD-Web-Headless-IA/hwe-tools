# HWP — Contexto para Claude Code

> **Antes de empezar cualquier tarea, lee `docs/README.md`** — mapea cada tipo de tarea al conjunto mínimo de ficheros a cargar. **No cargues `docs/architecture/architecture.md` entero** salvo que lo pida explícitamente — son 4.2k líneas y rompe la amortización de tokens (ver DEC-003).

## Reglas que SIEMPRE están en contexto

| Fichero | Qué es |
|---|---|
| `docs/specs/general/base-standards.md` | Reglas comunes (TS strict, Zod, TDD, English, naming, commits) |
| `docs/specs/frontend/frontend-standards.md` | Reglas React/Next/Tailwind/a11y/i18n (extiende base) |
| `docs/specs/frontend/coding-standards.md` | Reglas de codificación HWP del día a día — estructura de componentes, patrones React, anti-patterns (extiende base + frontend) |
| `docs/specs/security/security-standards.md` | Seguridad y RGPD — input validation, CSP, secrets, prompt injection, pre-deploy checklist (obligación legal) |
| `docs/specs/general/lifecycle.md` | alpha → beta → stable — criterios de promoción |

## Documentación principal (carga selectiva — ver `docs/README.md`)

- **Constitución del sistema:** `docs/architecture/architecture.md` — fuente de verdad pero cargar SOLO la sección que necesites (grep `^## ` para el TOC).
- **Modelo de dominio multi-tenant:** `docs/architecture/domain-model.md` — **cargar SIEMPRE** en tareas de clasificación de bloques/templates, diseño de schemas, wiring de rutas. Sin él, las decisiones se toman con intuición genérica en vez de los criterios reales (types + features, multi-PMS, accommodation unificada, seasonality).
- **Frontend (cómo construir):** `docs/contracts/frontend/` — `structure.md`, `block-contract.md`, `template-contract.md`, `theme-tokens.md`, `client-composition.md`.
- **Block architecture (sistema de 4 capas):** `docs/specs/frontend/block-architecture.md` — **cargar SIEMPRE** en tareas de creación, modificación o propuesta de bloques. Define las 4 capas (content schema, variants, config schema, adapter), los gates de SEO/security por bloque, y el lifecycle SPECBOOT completo de un bloque.
- **Briefing:** `docs/architecture/briefing.md` — visión y modelo de negocio.
- **Decisiones:** `docs/architecture/decisions.md` — DEC-001 a DEC-010 hasta la fecha. Greppea por número o tema antes de proponer cambios estructurales.
- **Catálogo de skills/agents:** `docs/catalog.md`.

## Lo esencial del proyecto

- Plataforma multi-tenant para webs de hospitality (campings y hoteles) hasta 300 clientes — producto de **Septeo Hospitality**.
- Stack: Next.js 14 + Payload CMS v3 + Vercel Postgres + TypeScript (DEC-007).
- Monorepo Turborepo + pnpm con packages `@hwp/*` compartidos.
- Deploy: Vercel full-stack (proyecto por cliente para frontend, proyecto por tipo para Payload, Postgres + Blob Storage + Cron) — DEC-007.
- IA: Claude API siempre via Next.js Route Handler server-side — credenciales en Vercel env vars, nunca desde el browser.
- Bloques con **variantes estructurales** (DEC-008): bloques complejos usan subfolder por variante + `index.ts` resolver. CVA sigue siendo el camino por defecto para variantes solo de estilo.
- `blockDefaults` en `client.config.ts` (DEC-009): preferencias de variante por cliente. Reemplaza `activeBlocks`.
- `BookingBlock` en `@hwp/core-ui`, `BookingProvider` en `@hwp/booking` (DEC-010). El paquete de dominio expone su provider; el bloque vive con el resto del catálogo de UI.
- **Bloques de plataforma** en `@hwp/core-ui/base-blocks`; **bloques de cliente** en `src/blocks/` del repo del cliente (DEC-015). Schemas compartidos exportados como `@hwp/core-ui/schemas`. Nuevos sitios se crean con `/scaffold-site`.

## Reglas no negociables

- Nunca `if (client === 'nombre')` en el core — usar adapter pattern.
- Sin `any` en TypeScript.
- Validación Zod en cada boundary del sistema.
- TDD — tests antes que código. Coberturas y stack de testing: ver `docs/specs/general/base-standards.md` §Testing y DEC-006.
- Conventional Commits en inglés.
- **Documentación antes que código** (SPECBOOT). Nunca implementar sin proposal artifact aprobado.
- **RGPD compliance es obligación legal** — toda violación es blocker de producción, no warning. Ver `docs/specs/security/security-standards.md`.

## Agentes especializados

11 agentes en `.claude/agents/` — 4 del pipeline SPECBOOT y 7 especialistas de dominio. Antes de implementar, considera si necesitas consultar un especialista.

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

Referencia completa: `docs/specs/ai/agent-directory.md`. Equipos predefinidos por tipo de tarea: `docs/specs/ai/agent-teams-playbook.md`. Decisión de adopción: DEC-014.

## Metodología

**SPECBOOT:** `/enrich_us` → `/propose` → `/apply` → `/verify` → `/archive` → `/commit`.

Skills disponibles (registradas en `docs/catalog.md`):
- `/import-figma <git-url> [slug]` — clona/re-importa un Figma Make en `figma-makes/{slug}/` con tag por importación (DEC-002).
- `/enrich-us <path>` — enriquece una user story aislada.
- `/plan-to-stories <plan> [epic]` — pipeline plan → stories enriquecidas.
- `/archive <story-path>` — cierra una story tras verify verde: sincroniza specs, actualiza catálogo, marca done, repara cross-refs. Ejecutado por `docs-writer`.

## Estructura del workspace

```
C:\laragon\www\Hospitality Web Platform\
├── hwp-platform\                       ← este repo (plataforma + packages + docs)
│   ├── apps\        ← sites y portales por cliente (pendiente Phase 0)
│   ├── packages\    ← @hwp/* (pendiente Phase 0)
│   ├── docs\        ← toda la documentación (arquitectura, contratos, specs, planes, clientes)
│   │   ├── architecture\    ← decisions.md, domain-model.md, briefing.md, architecture.md
│   │   ├── contracts\frontend\  ← block-contract, structure, template-contract, theme-tokens
│   │   ├── specs\general\   ← base-standards, lifecycle, agent-standards
│   │   ├── specs\frontend\  ← frontend-standards, coding-standards
│   │   ├── specs\security\  ← security-standards (RGPD, CSP, input handling, secrets, prompt injection)
│   │   ├── specs\seo\       ← seo-standards, semantic-html, local-seo, geo-llm-optimization, performance-seo + schemas/ (11 JSON-LD)
│   │   ├── skills\frontend\ ← block-creation, theme-tokens-pipeline
│   │   ├── skills\ai\       ← agent-directory, agent-teams-playbook, specboot-flow
│   │   ├── plans\           ← walking-skeleton, phase-0, phase-1-design-system
│   │   ├── clients\         ← figma-analysis + figma-notes por cliente
│   │   └── diagrams\        ← 6 diagramas Mermaid
│   └── .claude\skills\
└── figma-makes\                        ← un repo git por cliente (DEC-002)
    └── {slug}\
```

## Idioma

- **Conversación humano-IA:** español.
- **Artefactos técnicos** (código, tests, commits, docs, specs, user stories, decisiones): **inglés** (DEC-001).
- **Artefactos de negocio** (briefings cliente, brand, copy de site): idioma natural del cliente.

## Cuando estés perdido

1. `docs/README.md` — qué ficheros cargar según la tarea.
2. `docs/architecture/domain-model.md` — qué es un cliente HWP, cómo se modela el multi-tenant.
3. `docs/architecture/decisions.md` — qué decisiones ya están tomadas (no contradecirlas).
4. `docs/architecture/briefing.md` — por qué existe el proyecto.
5. Solo entonces, `docs/architecture/architecture.md` (sección específica, no entero).
