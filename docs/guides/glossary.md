# 📖 Glosario

> Términos técnicos del proyecto explicados sin jerga. Si ves una palabra que no entiendes, búscala aquí.

---

## A–C

### Base-block

A reference block implementation that lives in `packages/core-ui/src/base-blocks/` and is shipped as part of the `@hwp/core-ui` package (accessible via the `@hwp/core-ui/base-blocks` subpath export). Base-blocks are the canonical, platform-maintained implementations — they are not meant to be edited by client developers. Instead, client sites can re-export them unchanged (Level 1), extend them via slots (Level 2), or replace them with a fully custom component (Level 3) in their own `src/blocks/` folder.

Before DEC-015, these were called simply "blocks" and lived in `packages/core-ui/src/blocks/`. The rename to `base-blocks` signals their new role as a starting point, not a hard constraint.

🔄 **WP:** como los bloques del tema padre. Puedes usarlos tal cual, sobreescribirlos en el tema hijo, o crear bloques nuevos — sin tocar el padre.

---

### Agent (Agente)
Un asistente de IA especializado que Claude Code puede invocar para una tarea concreta. Cada agente tiene un rol específico, un modelo de IA asignado, y actúa solo dentro de su dominio. HWP tiene 11 agentes: 4 en el pipeline SPECBOOT y 7 especialistas de dominio.

🔄 **WP:** como un freelancer especializado que contratas para una tarea puntual. No lo llamas para todo — lo llamas cuando su especialidad es exactamente lo que necesitas.

---

### Agent Team (Equipo de agentes)
Un conjunto predefinido de agentes convocados juntos para un tipo de tarea. Máximo 3 por equipo. Ejemplo: crear un bloque convoca `senior-developer` (lead) + `ux-ui-analyst` + `seo-geo-specialist`.

🔄 **WP:** como tener a mano la lista de freelancers correctos para cada tipo de proyecto. No decides cada vez a quién llamar — el playbook ya lo tiene resuelto.

---

### App Router
El sistema de Next.js para organizar las páginas de un site. Las páginas van en `src/app/` y cada carpeta es una URL. `src/app/page.tsx` es la página de inicio, `src/app/contacto/page.tsx` es `/contacto`.

🔄 **WP:** como tener `front-page.php`, `page.php`, `single.php` pero organizado en carpetas.

---

### Block (Bloque)
Un componente React reutilizable que se puede colocar en cualquier página. Ejemplos: `HeroBlock`, `BookingBlock`, `GalleryBlock`. Cada bloque tiene sus propias props (datos), estilos y lógica.

🔄 **WP:** exactamente igual que un bloque de Gutenberg, pero en React en lugar de PHP.

---

### Build
El proceso de compilar el código fuente (TypeScript, JSX) en HTML/CSS/JS que el browser puede leer. En desarrollo (`pnpm dev`) el build es automático e incremental. Para producción, `pnpm build` genera todos los ficheros estáticos.

🔄 **WP:** en WordPress no había "build" — el PHP se interpretaba en el servidor. Aquí el código se compila antes de servirse.

---

### Client Block Registry

The `src/blocks/registry.ts` file in a client site that maps block type names to their React component implementations. Passed to `BlockRenderer` as the optional `blocks` prop. Without it, `BlockRenderer` falls back to the platform's `baseBlockRegistry`. With it, the client's custom or extended blocks take precedence for any type name they declare.

```ts
// site-{slug}/src/blocks/registry.ts
import { HeroBlock } from './HeroBlock';   // could be Level 1, 2, or 3
export const clientBlocks = { HeroBlock };

// page.tsx
<BlockRenderer layout={page.layout} blocks={clientBlocks} />
```

🔄 **WP:** como `register_block_type()` en el tema hijo — registras tus propias versiones de los bloques para que el sistema las use en lugar de las del tema padre.

---

### Client (Cliente HWP)
Un camping u hotel que tiene su propio site en la plataforma. Cada cliente tiene su `apps/site-{slug}/` con sus colores, fuentes y configuración. El mismo código de bloques sirve para todos.

🔄 **WP:** como una instalación de WordPress por cliente, pero todos comparten el mismo tema padre y plugins.

---

### Cookie consent
La obligación legal (RGPD Art. 6) de obtener el consentimiento explícito del usuario antes de instalar cookies no esenciales. Las cookies necesarias (autenticación, CSRF) están exentas. Las de analítica, marketing o tracking de reservas requieren opt-in previo. En HWP: ninguna cookie no esencial se puede escribir antes de que el usuario haya dado su consentimiento activo — los checkboxes premarcados y los patrones oscuros están prohibidos por ley.

🔄 **WP:** como el plugin GDPR Cookie Consent / CookieYes que instalabas en cada sitio WordPress. En HWP la lógica es la misma — la diferencia es que aquí está integrada en el código, no en un plugin.

---

### CSP (Content Security Policy)
Una cabecera HTTP que le dice al browser qué orígenes puede cargar recursos (scripts, estilos, imágenes, iframes). En HWP se configura en `next.config.mjs` y es obligatoria en producción. El objetivo es limitar el impacto de un ataque XSS: aunque un atacante inyecte código, el browser rechazará ejecutar scripts que no vengan de orígenes autorizados.

🔄 **WP:** como la sección de "Security headers" de Wordfence o iThemes Security, pero implementada directamente en la configuración del servidor. En HWP tienes plantilla lista en `docs/specs/security/security-standards.md`.

---

### CLS (Cumulative Layout Shift)
Métrica de Core Web Vitals que mide cuánto se desplaza visualmente el contenido de la página mientras carga. Objetivo: CLS < 0.1. En HWP: todas las imágenes deben tener atributos `width` y `height` explícitos, y las fuentes deben usar `font-display: swap`.

🔄 **WP:** en WordPress las imágenes sin dimensiones explícitas hacen "saltar" el texto mientras se cargan. En HWP es una regla no negociable del contrato de bloque — toda imagen lleva `width` y `height`.

---

### Composition Rules

The `composition-rules/` module inside `@hwp/core-ui` that defines the constraints for how blocks can be assembled on a page — ordering rules, co-occurrence rules, and slot compatibility. These rules are validated at composition time (both at build time and in the CMS editor), preventing invalid page structures before they reach the user.

🔄 **WP:** no hay equivalente directo. Es como tener reglas de Gutenberg para qué bloques pueden ir después de cuáles — pero con tipado TypeScript.

---

### Composition (Composición)
Una página o sección específica de un cliente que ensambla bloques de `@hwp/core-ui`. Vive en `apps/site-{cliente}/src/compositions/`. Es el punto donde se personalizan los bloques para ese cliente concreto.

🔄 **WP:** como un tema hijo que sobreescribe templates del tema padre, pero en React.

---

### Core Web Vitals
Las tres métricas de performance que Google usa como factores de posicionamiento: LCP (Largest Contentful Paint), CLS (Cumulative Layout Shift) e INP (Interaction to Next Paint). Objetivos: LCP < 2.5s, CLS < 0.1, INP < 200ms. Definidas en `docs/specs/seo/performance-seo.md`.

🔄 **WP:** en WordPress se intentaba mejorar con plugins como WP Rocket. En HWP, las reglas de performance están integradas en los contratos de bloque — el Hero, por ejemplo, debe cumplir el requisito de LCP antes de poder pasar a `beta`.

---

### CVA (class-variance-authority)
Una librería para gestionar variantes de estilos en componentes React. Permite definir variantes del mismo componente (`variant: 'primary' | 'secondary'`) sin duplicar código.

🔄 **WP:** como tener un shortcode `[boton tipo="primario"]` y `[boton tipo="secundario"]` con estilos diferentes, pero tipado y sin riesgo de errores.

---

## D–L

### Design language

A document at `docs/clients/{slug}/design-language.md` that captures the visual patterns of a client's design, beyond the raw token values. Where `tokens.json` records the _values_ (colors, fonts, spacings), the design language records _how_ those values are applied: card style (shadow vs border, corner radius, padding), section spacing density, typography hierarchy (eyebrow → h2 → body), interaction style (hover effects, animation approach), and visual density.

Generated as a DRAFT by `/import-figma` from the Figma Make components, then reviewed and approved by the designer or a senior developer. Once approved, it becomes the **visual contract for the client** — any block built without a Figma reference must follow these patterns.

See also: **visual spec**, **Mode B** (ux-ui-analyst). Introduced in DEC-016.

🔄 **WP:** no tiene equivalente directo. Es como tener una guía de estilo del cliente que va más allá de los colores y las fuentes — captura las decisiones de diseño que hacen que el site se sienta cohesionado.

---

### Discriminated union
Un patrón de TypeScript para modelar exactamente los estados posibles de un objeto, sin mezclar estados imposibles. En lugar de cuatro booleans que pueden combinarse de 16 formas (la mayoría absurdas), defines un `type` con un campo discriminador (`status`) que determina qué otros campos están presentes.

```typescript
// Mal: 16 combinaciones posibles, casi todas incoherentes
type State = { isLoading: boolean; hasError: boolean; data?: Data };

// Bien: exactamente los estados que pueden ocurrir
type State =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'success'; data: Data };
```

El compilador de TypeScript sabe qué campos existen en cada rama, por lo que no necesitas guardas como `if (state.data !== undefined)` — simplemente compruebas `state.status === 'success'`.

🔄 **WP:** no tenía equivalente en PHP. Es el principal motivo por el que TypeScript elimina una clase entera de bugs en runtime.

---

### Dev Server
El servidor de desarrollo local que ejecutas con `pnpm dev`. Sirve el site en `http://localhost:3000` y recarga automáticamente cuando cambias un fichero.

🔄 **WP:** como tener Local by Flywheel corriendo. La diferencia es que la recarga es instantánea sin necesitar F5.

---

### Domain Specialist (Especialista de dominio)
Uno de los 7 agentes de dominio de HWP: `architect`, `senior-developer`, `ux-ui-analyst`, `seo-geo-specialist`, `security-specialist`, `qa-engineer`, `docs-writer`. Son agentes de solo lectura — auditan y reportan, no escriben código de aplicación.

🔄 **WP:** como el SEO experto externo que contratas para revisar el site antes de publicarlo, o el auditor de seguridad que comprueba que el RGPD está bien.

---

### GEO (Generative Engine Optimisation)
Estrategia para que el contenido del site sea citado por asistentes de IA (ChatGPT, Perplexity, Gemini). Técnicas clave: primeros párrafos citables que definan la entidad, structured data `FAQPage`, naming consistente de la entidad desde `client.config.ts`, y enlaces `sameAs` a perfiles autoritativos (Google Business, Booking.com, TripAdvisor). Definido en `docs/specs/seo/geo-llm-optimization.md`.

🔄 **WP:** no existía en WordPress. Es la evolución del SEO para el mundo de los asistentes de IA — ya no solo posicionas en Google, posicionas para que LLMs como ChatGPT o Gemini te citen directamente como respuesta.

---

### HMR (Hot Module Replacement)
La tecnología que actualiza el browser automáticamente cuando guardas un fichero, sin recargar la página completa. El estado de la interfaz se conserva.

🔄 **WP:** en WordPress no existía — tenías que hacer F5 cada vez. Aquí ahorras varios segundos por cada cambio.

---

### JSX / TSX
La sintaxis que mezcla HTML con JavaScript (JSX) o TypeScript (TSX). Es lo que ves en los ficheros `.tsx`. Parece HTML pero es JavaScript.

```tsx
// TSX
const Titulo = ({ texto }: { texto: string }) => (
  <h1 className="font-heading text-primary">{texto}</h1>
);
```

🔄 **WP:** como PHP que mezcla HTML con lógica, pero al revés — es JavaScript con HTML dentro.

---

### JIT (Just-In-Time)
El modo de Tailwind que genera solo las clases CSS que realmente usas en el código. Escanea todos los `.tsx` al compilar y genera un CSS mínimo.

🔄 **WP:** como si WordPress solo cargara los estilos del plugin que realmente necesitas en cada página, en lugar de cargarlos todos siempre.

---

### JSON-LD
El formato estándar para incrustar structured data en páginas web. Un bloque `<script type="application/ld+json">` en el `<head>` contiene un objeto JSON con tipos de Schema.org. Se renderiza server-side (SSR) para que los crawlers de Google y los asistentes de IA lo lean sin ejecutar JavaScript. HWP tiene 11 plantillas listas en `docs/specs/seo/schemas/`.

🔄 **WP:** Yoast SEO o RankMath lo generaban automáticamente en background. En HWP lo implementas directamente — las 11 plantillas de `docs/specs/seo/schemas/` te dan el JSON-LD correcto por tipo de página, sin depender de plugins.

---

### LCP (Largest Contentful Paint)
Métrica de Core Web Vitals que mide cuándo termina de renderizar el elemento visible más grande (normalmente la imagen del hero). Objetivo: < 2.5 segundos. En HWP: el `HeroBlock` debe usar `loading="eager"`, `fetchpriority="high"`, y `<link rel="preload">` en el `<head>`. Definido en `docs/specs/seo/performance-seo.md`.

🔄 **WP:** WP Rocket e Imagify ayudaban con esto. En HWP, el contrato del bloque Hero define directamente los requisitos de LCP — no necesitas plugins, las reglas están en el código.

---

### LLM Optimization
Ver **GEO**. Prácticas para que el contenido sea legible y citable por Large Language Models. Incluye el patrón `@graph` en JSON-LD para establecer relaciones entre entidades, `FAQPage` con respuestas en lenguaje natural, `dateModified` para señales de frescura, y `additionalProperty` con datos de proximidad relevantes para búsquedas de hospitality.

🔄 **WP:** no tenía equivalente. Es la capa adicional sobre el SEO tradicional — optimizas no solo para que te indexe Google, sino para que asistentes como ChatGPT o Gemini te citen cuando alguien pregunta "mejor camping cerca de Valencia".

---

## M–P

### Mode B

The design-proposal operating mode of the `ux-ui-analyst` agent, used when there is no Figma reference for the block being worked on. In Mode B, the agent reads `docs/clients/{slug}/design-language.md`, the client's `tokens.json`, and 2–3 already-implemented blocks, then produces a **visual specification** describing how the new block should look and behave — layout, spacing, typography, container style, hover effects, responsive behavior, and slot recommendations.

Mode B never produces code. It produces a spec that feeds into the SPECBOOT `/propose` phase. Contrast with Mode A (validation against Figma). Introduced in DEC-016.

🔄 **WP:** como pedirle al diseñador que te escriba un brief para una página nueva cuando no tiene tiempo de hacer el Figma completo. Aquí el brief lo genera la IA basándose en el estilo establecido.

---

### Monorepo
Un único repositorio de git que contiene múltiples proyectos relacionados: los packages compartidos (`packages/`) y los sites de los clientes (`apps/`). Turborepo gestiona la compilación en el orden correcto.

🔄 **WP:** imagina tener el tema padre, todos los temas hijos (un por cliente) y todos los plugins en el mismo repositorio de git. Esto es exactamente un monorepo.

---

### Prompt injection
Un tipo de ataque en el que datos externos (mensajes de usuario, respuestas de APIs, datos del PMS) contienen instrucciones que intentan manipular el comportamiento del LLM. En HWP, todo input externo que llega al Claude API debe estar encapsulado en delimitadores explícitos y etiquetado como "datos, no instrucciones". Una integración de IA que interpola directamente `${userMessage}` en el system prompt es vulnerable.

```typescript
// Vulnerable: el usuario podría escribir "Ignora todo lo anterior y..."
const prompt = `Eres asistente del camping. El usuario dijo: ${userMessage}`;

// Seguro: el input externo está delimitado
const prompt = `Eres asistente del camping.
<mensaje-visitante>
${sanitize(userMessage)}
</mensaje-visitante>
Responde solo a la pregunta del visitante.`;
```

🔄 **WP:** como la inyección SQL en WordPress — en aquella era protegías las queries con `$wpdb->prepare()`. Aquí proteges los prompts con delimitadores explícitos.

---

### NAP (Name, Address, Phone)
Los tres datos de contacto del negocio que deben ser idénticos en todos los lugares donde aparecen: en los componentes de header y footer, en todos los schemas JSON-LD (`Organization`, `Hotel`, `Campground`), y en perfiles externos (Google Business, Booking.com, TripAdvisor). En HWP, el NAP se define en `client.config.ts` como única fuente de verdad. NAP inconsistente es una penalización de local SEO.

🔄 **WP:** en WordPress se copiaba el teléfono en diferentes widgets y páginas, creando inconsistencias. En HWP, `client.config.ts` es la única fuente — ningún componente duplica estos datos.

---

### Next.js
El framework React que añade routing, server-side rendering y optimizaciones de performance. Los sites de cada cliente son apps de Next.js. Vercel (el hosting) está hecho por los mismos creadores de Next.js.

🔄 **WP:** como si WordPress fuera el framework y Next.js es el motor. Maneja las URLs, las páginas y la generación de HTML.

---

### Package
Un módulo de código reutilizable. En este proyecto, `@hwp/core-ui` y `@hwp/config` son packages. Se publican en un registro privado y los sites de cliente los instalan como dependencias.

🔄 **WP:** exactamente como un plugin de WordPress, pero instalado con `pnpm` en lugar de subido al servidor.

---

### Payload CMS
El gestor de contenido (CMS) que los editores de contenido usan para crear y editar páginas. Es el reemplazo de WordPress para la parte de administración. Tiene una interfaz visual donde se arrastran bloques para construir páginas.

🔄 **WP:** literalmente es el wp-admin. Mismo rol, tecnología diferente.

---

### Pipeline (SPECBOOT)
La secuencia de cuatro fases que transforma una user story en código mergeado y verificado: `planner` → `implementer` → `reviewer` → `verifier`. No se pueden saltar pasos — un `/apply` sin `/propose` previo es código sin diseño.

🔄 **WP:** como el proceso de una agencia para lanzar una página: brief → desarrollo → revisión → staging → publicación. La diferencia es que aquí cada paso tiene un agente especializado con instrucciones exactas.

---

### Preset (Tailwind Preset)
Una configuración de Tailwind reutilizable. La función `createHwpPreset(tokens)` en `@hwp/config` toma los tokens del cliente y devuelve una configuración de Tailwind que define todas las clases de color, fuentes y espaciado.

🔄 **WP:** como tener un `functions.php` que genera automáticamente las variables CSS correctas para cada cliente.

---

### pnpm
El gestor de paquetes que usamos. Más rápido que npm y mejor para monorepos porque no duplica las dependencias entre proyectos.

🔄 **WP:** como npm o Composer, pero más eficiente. Instala `react`, `next`, `tailwindcss` y el resto de librerías externas.

---

## R–T

### RGPD (Reglamento General de Protección de Datos)
La regulación europea de protección de datos (equivalente al inglés GDPR). Define los derechos de los usuarios sobre sus datos personales y las obligaciones de las empresas que los tratan. HWP opera en España y Francia, por lo que su cumplimiento es una **obligación legal** — toda violación es un blocker de producción, no un warning.

Impacto directo en el desarrollo:
- Ninguna cookie no esencial antes de consentimiento explícito.
- Toda colección de datos personales (nombre, email, teléfono) tiene una base legal documentada.
- El usuario puede solicitar la eliminación de sus datos — y el sistema debe hacerlo de forma irreversible.
- Cada site tiene una página de política de privacidad enlazada desde el footer.

🔄 **WP:** en WordPress lo gestionabas con plugins como GDPR Cookie Consent o WP GDPR Compliance. En HWP, las reglas están codificadas en `docs/specs/security/security-standards.md` y el `security-specialist` las audita antes de cada deploy.

---

### Registry (Block Registry)
El mapa que relaciona cada tipo de bloque con su componente React. Cuando Payload CMS dice "aquí hay un `HeroBlock`", el Registry sabe qué componente renderizar.

🔄 **WP:** como `register_block_type()` — registras el tipo con su nombre y su componente, y el sistema sabe cómo renderizarlo.

---

### Renderer (Block Renderer)
El componente `<BlockRenderer blocks={layout} />` que recibe el array de bloques del CMS y los renderiza en orden, consultando el Registry para saber qué componente usar para cada uno.

🔄 **WP:** como `the_content()` pero para bloques. En WP, `the_content()` renderiza el HTML guardado en la BD. Aquí, `BlockRenderer` renderiza el array de bloques.

---

### Schema (Zod Schema)
La definición de los datos que acepta un componente. Escrito con Zod, valida que los datos del CMS tengan el formato correcto antes de renderizar el componente.

🔄 **WP:** como los field groups de ACF. Defines qué campos tiene un componente (título, imagen, texto...) y el CMS los muestra para que el editor los rellene.

---

### Schema.org
El vocabulario colaborativo (schema.org) que define tipos y propiedades semánticas para structured data. HWP usa tipos como `Hotel`, `Campground`, `CampingPitch`, `TouristAttraction`, `FAQPage`, `Event`, `BreadcrumbList`, `Organization` y `AggregateRating`. Las 11 plantillas JSON-LD de `docs/specs/seo/schemas/` implementan estos tipos para páginas de hospitality.

🔄 **WP:** Yoast SEO aplicaba Schema.org en background, sin que el developer tuviera control. En HWP, cada bloque tiene su schema explícito — ves exactamente qué tipos estás usando y por qué.

---

### Slot

A named extension point declared in a base-block's `.slots.ts` file that a client can fill with custom content, without overriding the block's main structure. The first example in the platform is `HeroBlock.slots.ts`. A client using Level 2 customization imports the base-block and provides slot content — the base-block decides where to render it.

```ts
// HeroBlock.slots.ts (platform)
export type HeroBlockSlots = {
  badge?: React.ReactNode;      // extra badge below the headline
  afterCta?: React.ReactNode;   // content injected after the CTA buttons
};

// site-{slug}/src/blocks/HeroBlock/index.ts (Level 2)
export function HeroBlock(props) {
  return <BaseHeroBlock {...props} slots={{ badge: <SeasonBadge /> }} />;
}
```

🔄 **WP:** como los action hooks de WordPress (`do_action('before_hero_cta')`). El tema padre define dónde se pueden enchufar cosas; el tema hijo decide qué poner ahí.

---

### SPECBOOT
La metodología de desarrollo de HWP: cada cambio no trivial pasa por cuatro fases en orden — `/propose` → `/apply` → `/review` → `/verify`. Ninguna fase se salta. SPECBOOT garantiza que siempre haya un diseño antes del código y una revisión independiente antes del merge.

🔄 **WP:** como si tu agencia tuviera un proceso formal para cada proyecto: primero el brief técnico, luego el desarrollo, luego la revisión de un segundo developer, luego las pruebas. En WordPress lo hacías informalmente; en HWP está automatizado.

---

### Structured Data
Metadatos legibles por máquina incrustados en páginas web para que los motores de búsqueda y asistentes de IA entiendan el tipo de contenido, las relaciones entre entidades y sus propiedades clave, sin parsear lenguaje natural. En HWP: siempre se implementa como JSON-LD (nunca Microdata ni RDFa), renderizado SSR en el `<head>`. Ver `docs/specs/seo/geo-llm-optimization.md` y las 11 plantillas en `docs/specs/seo/schemas/`.

🔄 **WP:** Yoast SEO lo gestionaba automáticamente. En HWP, lo implementas con control total — las plantillas de `docs/specs/seo/schemas/` te dan los schemas correctos para cada tipo de página de hospitality.

---

### Subpath Export

A named entry point inside an npm package that allows importing a specific subset of that package directly, without going through the main barrel. HWP uses two subpath exports in `@hwp/core-ui`:

- `@hwp/core-ui/base-blocks` — imports the base-block components directly (platform use)
- `@hwp/core-ui/schemas` — imports the shared Zod schemas directly

```ts
// Subpath import (preferred for base-blocks)
import { HeroBlock } from '@hwp/core-ui/base-blocks';

// Root import (preferred for composed re-exports)
import { HeroBlock, type HeroBlockContent } from '@hwp/core-ui';
```

Subpath exports are defined in the `exports` field of `package.json`. They avoid barrel-import overhead and make tree-shaking more predictable.

🔄 **WP:** como tener acceso a una función interna de un plugin directamente: `require 'woocommerce/includes/class-wc-cart.php'` en lugar de cargar todo WooCommerce. No se usaba porque WP no lo necesitaba — aquí es una mejora de performance y organización.

---

### Subagent (Subagente)
Un agente que Claude Code lanza en un contexto propio e independiente. El subagente recibe instrucciones precisas, trabaja en su ventana de contexto, y devuelve su resultado. Permite paralelizar trabajo — dos subagentes pueden ejecutarse a la vez.

🔄 **WP:** como lanzar dos freelancers en paralelo en lugar de esperar a que uno termine para empezar el otro.

---

### TDD (Test-Driven Development)
Metodología donde primero escribes el test que describe el comportamiento esperado, luego escribes el código que lo supera. En HWP, cada bloque nuevo se crea con sus tests antes del código.

🔄 **WP:** en WordPress casi no se usaban tests. Aquí es obligatorio — garantiza que cuando cambias algo en `@hwp/core-ui` no rompes los otros 299 clientes.

---

### Team Lead (Líder del equipo)
El agente que lidera un Agent Team. Dirige la tarea, integra los informes de los especialistas, y produce el resultado final. Siempre es Opus (planner, reviewer, architect) o `senior-developer` en equipos de creación de bloques.

🔄 **WP:** como el developer senior de la agencia que coordina a los freelancers y da el visto bueno final.

---

### Teammate (Compañero de equipo)
Un agente especialista dentro de un Agent Team. Audita su dominio, produce un informe, y no implementa nada. Siempre es Sonnet. Máximo 2 teammates por equipo (más el lead).

🔄 **WP:** como el SEO freelancer o el diseñador que revisan el trabajo del developer antes de publicar.

---

### Token Cascade

The three-tier build-time pipeline that resolves the final CSS custom property values for a given client:

```
global → semantic → brand
```

1. **Global tokens** — platform-wide constants (e.g. a palette of raw hex values) in `@hwp/core-ui`.
2. **Semantic tokens** — role-based aliases (e.g. `primary`, `surface`, `foreground`) that reference global tokens.
3. **Brand tokens** — client-specific overrides declared in `apps/site-{slug}/src/theme/tokens.json` that set the final values for their semantic roles.

The cascade runs entirely at build time — Tailwind JIT generates the CSS using the resolved values. There is no runtime token switching (except for seasonized clients per DEC-005, which swap token files between seasons).

🔄 **WP:** como las Custom Properties de CSS en cascada: el plugin define `--color-primary: blue`, el tema padre puede cambiarla a `--color-primary: teal`, y el tema hijo puede fijarla definitivamente a `--color-primary: #1A4A52`. El último en hablar gana — aquí el brand token siempre gana.

---

### Token (Design Token)
Un valor de diseño con nombre: un color (`"primary": "#1A4A52"`), una fuente (`"heading": "Playfair Display"`), un espaciado (`"section-y": "clamp(3rem, 8vw, 6rem)"`). Viven en `tokens.json` y fluyen hasta convertirse en clases CSS de Tailwind.

🔄 **WP:** como las Custom Properties de CSS (variables CSS): `--color-primary: #1A4A52`. La diferencia es que aquí están en un JSON validado y hay todo un pipeline que las convierte en utilidades de Tailwind.

---

### Turborepo
El orquestador del monorepo. Sabe en qué orden compilar los packages (primero `@hwp/core-ui`, luego `@hwp/config`, luego `apps/`), cachea los resultados para no recompilar lo que no cambió, y permite ejecutar `pnpm dev` o `pnpm build` para todos los proyectos a la vez.

🔄 **WP:** no tiene equivalente directo en WordPress. Imagina un Makefile inteligente que sabe qué plugins compilar antes de compilar el tema, y que no repite trabajo innecesario.

---

### TypeScript (TS)
JavaScript con tipos. En lugar de `let color = "rojo"`, escribes `let color: string = "rojo"`. Los tipos permiten que el editor detecte errores antes de que lleguen al browser.

🔄 **WP:** en WordPress casi todo era PHP sin tipos estrictos. Si pasabas un número donde esperabas un string, solo lo descubrías al abrir el site. Con TypeScript, el error aparece mientras escribes el código.

---

## V–Z

### Visual spec

A document at `docs/clients/{slug}/block-specs/{BlockName}.visual-spec.md` describing how a specific block should look and behave for a specific client, written when no Figma design exists for that block. Generated by the `/design-block` skill via `ux-ui-analyst` Mode B. Contains: layout (grid/flex, columns, alignment), spacing tokens, typography hierarchy, container style, hover effects, responsive behavior, and slot recommendations.

The visual spec is a **human-approved checkpoint** between the AI's design proposal and the implementer's work. It begins as a DRAFT — the human reviews it and removes the DRAFT marker when satisfied. The `planner` agent reads it as the visual guide during `/propose`, the same way it would read a Figma reference.

See also: **design language**, **Mode B**. Introduced in DEC-016.

🔄 **WP:** como el brief de diseño que le das al maquetador antes de que empiece. Sin él, el maquetador toma decisiones visuales ad hoc que no siguen el estilo del site.

---

### Variant (Variante)
Una versión alternativa de un bloque con distinto layout o comportamiento, no solo estilo. Ejemplo: `BookingBlock` puede tener una variante `inline` (integrada en la página) y una variante `modal` (desplegable). Las variantes de solo estilo usan CVA; las estructurales usan subcarpetas por variante.

🔄 **WP:** como tener `[booking tipo="modal"]` y `[booking tipo="inline"]` — mismo shortcode, diferente renderizado.

---

### Vercel
El hosting donde se despliegan los sites de cliente. Cada `git push` a la rama `main` dispara un deploy automático. También gestiona las variables de entorno (secrets), el dominio y el CDN.

🔄 **WP:** como WP Engine o Kinsta, pero diseñado para Next.js. El deploy es automático — no hay FTP, no hay botón de "publicar". El código que está en git es el que está en producción.

---

### Workspace (pnpm Workspace)
La configuración que le dice a pnpm que `hwp-platform/` contiene múltiples proyectos relacionados (`apps/*` y `packages/*`). Permite instalar dependencias compartidas una sola vez y referenciar packages locales con `@hwp/core-ui` sin publicarlos a npm.

🔄 **WP:** no tiene equivalente directo. Es la magia que hace que `import { HeroBlock } from '@hwp/core-ui'` funcione sin tener que publicar `@hwp/core-ui` a internet.

---

### Zod
Una librería de validación de datos con TypeScript. Define la forma de un objeto y valida que los datos reales coincidan con esa forma. Si no coinciden, lanza un error con el campo exacto que falla.

```typescript
const TokensContract = z.object({
  colors: z.object({
    primary: z.object({ value: z.string() })
  })
});
TokensContract.parse(tokensJson); // falla si primary no es un string
```

**Zod at every boundary** — el principio HWP de que todo dato que entra al sistema desde fuera (formulario del usuario, respuesta de API externa, output de LLM, env var, body de un webhook) se valida con `.parse()` antes de ser usado. Dentro de un paquete, confías en tus propios tipos. En los límites del sistema (Route Handlers, adapters), nunca.

```typescript
// En un Route Handler
const body = await request.json();
const parsed = BookingRequestSchema.parse(body); // valida aquí, usa 'parsed' después
```

🔄 **WP:** como la validación de campos de ACF + `sanitize_text_field()` en cada handler de formulario. En WordPress lo hacías manualmente y era fácil olvidarlo. En HWP, el type system te recuerda dónde está el boundary.

---

## En términos simples

Si tuvieras que resumirlo todo en una frase por tecnología:

| Tecnología | En una frase |
|---|---|
| **Next.js** | Es el motor que convierte código React en páginas web |
| **React** | Es la forma moderna de escribir HTML dinámico |
| **TypeScript** | Es JavaScript con corrector ortográfico incorporado |
| **Tailwind** | Es CSS escrito como clases directamente en el HTML |
| **Zod** | Es el guardia que verifica que los datos tienen la forma correcta |
| **pnpm** | Es el instalador de todas las librerías externas |
| **Turborepo** | Es el director de orquesta que coordina todos los subproyectos |
| **Vercel** | Es el hosting que se actualiza automáticamente con cada `git push` |
| **Payload CMS** | Es el wp-admin, pero para esta plataforma |
| **Monorepo** | Es un solo repositorio que contiene todos los proyectos del equipo |
