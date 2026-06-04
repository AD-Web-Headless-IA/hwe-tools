# hwe — Arquitectura (overview)

> **Qué es este documento:** un mapa de 1 pantalla. Da la visión, el stack vigente, y la tabla "dónde vive cada cosa". **No es una constitución que se carga entera** — para cada tema, ve al doc canónico enlazado abajo.
>
> El documento exhaustivo original (monorepo `hwe-platform`, cdmon/Hetzner/MariaDB/PHP) se retiró por [DEC-018](./decisions.md#dec-018--retire-architecturemd-as-the-constitution-thin-overview--legacy-archive) y se conserva como archivo histórico en [`architecture-legacy.md`](./architecture-legacy.md). No lo uses para el estado actual.

---

## Visión

Plataforma para construir y gestionar webs de hospitality (campings y hoteles) para hasta ~300 clientes. Cada web se monta en tres capas:

1. **Diseño — desde Figma.** El diseñador entrega las páginas base en Figma; Figma Make genera código de referencia visual; Claude Code reconstruye el site con bloques de `@hwe/core-ui`. Los bloques/páginas sin Figma se diseñan desde el lenguaje visual extraído ([DEC-016](./decisions.md#dec-016--design-agent-visual-language-extraction-and-block-design-without-figma-reference)).
2. **Contenido — desde Payload CMS.** Payload gestiona todo el contenido editorial (textos, imágenes, alojamientos, servicios, páginas).
3. **Gestión — portal con IA.** El cliente edita su contenido por chat en lenguaje natural; la IA interpreta, valida y aplica en Payload con confirmación previa.

Claves: core compartido versionado (una mejora beneficia a todos), personalización por cliente (diseño + features + contenido), booking solo búsqueda de disponibilidad + salto al PMS, y escalado a 300 clientes sin cambiar la arquitectura base.

> Detalle de visión y modelo de negocio: [`briefing.md`](./briefing.md).

---

## Stack vigente (binding — DEC-017)

| Capa | Tecnología |
|---|---|
| Framework | **Next.js 15** (App Router) + **React 19** |
| Lenguaje | **TypeScript 5.x strict** |
| Estilos | **Tailwind v4** (CSS-first `@theme`; sin JS preset — DEC-012 superseded) |
| CMS | **Payload CMS v3** (en Vercel Functions, por tipo de cliente) |
| Base de datos | **Vercel Postgres** (una DB por cliente + `platform` compartida) — DEC-007 |
| Media | **Vercel Blob Storage** — DEC-007 |
| Proxies (PMS, Anthropic API) | **Next.js Route Handlers** server-side (credenciales en Vercel env vars) — DEC-007 |
| Hosting / deploy | **Vercel** (proyecto por cliente, Vercel Git integration) — DEC-007 |
| Testing | **Vitest + @testing-library/react + vitest-axe + Playwright + msw** — DEC-006 |
| Paquetes npm | **`@hwe/core-ui` + `@hwe/config`** (en `hwe-core`, registro privado) — DEC-017 |
| Cron / jobs | **Vercel Cron** |

> No existen `@hwe/booking` / `@hwe/content` / `@hwe/analytics` / `@hwe/i18n` / `@hwe/ai` como paquetes — eliminados en DEC-017. Los adapters (booking, map, reviews, form) viven en `@hwe/core-ui/src/adapters/`.

---

## Arquitectura de 3 repos (DEC-017)

```
hwe-tools/       ← ESTE repo — submódulo: skills, agents, commands, docs, specs, contracts
hwe-core/        ← paquetes npm: @hwe/core-ui + @hwe/config (Turborepo)
hwe-template/    ← template de GitHub, clonado por cliente
site-{slug}/     ← repos cliente independientes (clonados de hwe-template; consumen @hwe/* via npm)
figma-makes/     ← carpeta plain (no git), un repo de diseñador por cliente
```

> Fuente de verdad del layout: [`../contracts/general/workspace-structure.md`](../contracts/general/workspace-structure.md) + [`DEC-017-Repo-Split.md`](./DEC-017-Repo-Split.md).

---

## Dónde vive cada cosa (índice)

| Tema | Doc canónico |
|---|---|
| Visión y negocio | [`briefing.md`](./briefing.md) |
| Modelo multi-tenant: tipos, **features (feature flags)**, entidad alojamiento, **páginas dinámicas**, routing, seasonality | [`domain-model.md`](./domain-model.md) |
| Layout de repos / workspace / paths | [`../contracts/general/workspace-structure.md`](../contracts/general/workspace-structure.md) |
| Estructura monorepo, naming, imports | [`../contracts/frontend/structure.md`](../contracts/frontend/structure.md) |
| Cómo construir un bloque (qué) | [`../contracts/frontend/block-contract.md`](../contracts/frontend/block-contract.md) |
| Sistema de bloques de 4 capas (cómo) | [`../specs/frontend/block-architecture.md`](../specs/frontend/block-architecture.md) |
| Page templates (3 capas) | [`../contracts/frontend/template-contract.md`](../contracts/frontend/template-contract.md) |
| Composición por cliente | [`../contracts/frontend/client-composition.md`](../contracts/frontend/client-composition.md) |
| Tokens / theming (Tailwind v4) | [`../contracts/frontend/theme-tokens.md`](../contracts/frontend/theme-tokens.md) |
| `client.config.ts` — **shape canónico = schema Zod `ClientConfig` en `@hwe/core-ui` (hwe-core)**; semántica de `features`/`routes` en | [`domain-model.md`](./domain-model.md) |
| Booking engine / adapters PMS | [`../diagrams/booking-architecture.md`](../diagrams/booking-architecture.md) + `@hwe/core-ui/src/adapters/booking/` |
| Sistema de IA de **contenido del producto** (5 agentes, prompts, edición masiva, portal cliente, evals) | [`../specs/ai/content-operations.md`](../specs/ai/content-operations.md) |
| Agentes de **desarrollo** de Claude Code (11, SPECBOOT) | [`../specs/ai/agent-directory.md`](../specs/ai/agent-directory.md) · [`agent-teams-playbook.md`](../specs/ai/agent-teams-playbook.md) · [`specboot-flow.md`](../specs/ai/specboot-flow.md) |
| Seguridad y RGPD | [`../specs/security/security-standards.md`](../specs/security/security-standards.md) |
| SEO / GEO / HTML semántico / performance | [`../specs/seo/`](../specs/seo/) |
| Migración WordPress → hwe | [`../guides/wordpress-to-hwe.md`](../guides/wordpress-to-hwe.md) |
| Onboarding técnico de cliente | [`../guides/first-day-setup.md`](../guides/first-day-setup.md) |
| Reglas comunes (TS strict, Zod, TDD, English, commits) | [`../specs/general/base-standards.md`](../specs/general/base-standards.md) |
| Ciclo de vida de componentes (alpha→stable) | [`../specs/general/lifecycle.md`](../specs/general/lifecycle.md) |
| **Decisiones (DEC-001 → última)** | [`decisions.md`](./decisions.md) |
| Catálogo de skills/agentes | [`../catalog.md`](../catalog.md) |
| Qué cargar según la tarea | [`../README.md`](../README.md) |
| **Registro histórico** (infra cdmon/Hetzner/MariaDB/PHP, monorepo, paquetes eliminados, OpenAPI aspiracional) | [`architecture-legacy.md`](./architecture-legacy.md) |

---

## Reglas no negociables (resumen)

- Nunca `if (client === 'nombre')` en `@hwe/core-ui` — adapter pattern.
- Sin `any` en TypeScript. Validación Zod en cada boundary del sistema.
- TDD — tests antes que código (DEC-006).
- Conventional Commits en inglés (DEC-001). Conversación humano-IA en español; artefactos técnicos en inglés.
- Documentación antes que código (SPECBOOT). RGPD es obligación legal — toda violación es blocker de producción.

> El detalle de cada regla vive en `../specs/`. Esta lista es solo el recordatorio.
