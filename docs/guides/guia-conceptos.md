# Guía de conceptos HWP — Para nuevos miembros del equipo

> Esta guía explica cómo está organizado el proyecto HWP, qué piezas lo componen y cómo trabajarás con ellas en tu día a día. Está pensada para alguien que acaba de incorporarse al equipo y viene de un entorno WordPress o similar.
>
> **No necesitas memorizar todo esto.** Úsalo como referencia cuando tengas dudas sobre dónde buscar algo o cómo funciona un proceso.

---

## La idea general

HWP es una plataforma para crear webs de campings y hoteles. En vez de hacer cada web desde cero (como haríamos en WordPress con un theme nuevo cada vez), tenemos un sistema de piezas reutilizables que se combinan de forma diferente para cada cliente.

Piensa en LEGO: las piezas (bloques) son las mismas para todos los clientes, pero cada cliente monta su propio modelo. Algunos clientes usan las piezas tal cual. Otros las pintan de otro color. Y unos pocos crean piezas totalmente nuevas porque su diseño lo requiere.

Para que esto funcione con 300 clientes sin volverse un caos, el proyecto está muy organizado. Esta guía te explica esa organización.

---

## Los cuatro pilares del proyecto

```
┌──────────────────────────────────────────────────────┐
│                                                      │
│   📚 Docs          → QUÉ hemos decidido y POR QUÉ   │
│   📏 Specs         → CÓMO debemos trabajar           │
│   🔧 Skills        → QUÉ puede hacer la IA por ti    │
│   📋 User Stories  → QUÉ hay que construir            │
│                                                      │
└──────────────────────────────────────────────────────┘
```

Cada uno tiene un propósito claro. Vamos uno a uno.

---

## 📚 Docs — La memoria del proyecto

### ¿Qué son?

Los **docs** son documentos que explican las decisiones que se han tomado, los contratos que rigen cómo se construyen las cosas, y las guías para orientarte. Son la "memoria" del proyecto: si algo se decidió, está aquí.

### ¿Dónde están?

Todo vive bajo la carpeta `docs/` del repositorio:

```
docs/
├── architecture/        ← Las decisiones grandes del proyecto
│   ├── decisions.md     ← "Decidimos usar Vercel, no cdmon" (y por qué)
│   ├── architecture.md  ← La visión completa del sistema
│   ├── domain-model.md  ← Qué es un cliente, un bloque, un alojamiento
│   └── briefing.md      ← Por qué existe el proyecto
│
├── contracts/frontend/  ← Los "contratos" de cómo se construyen las piezas
│   ├── block-contract.md       ← "Un bloque SIEMPRE tiene estos 5 ficheros"
│   ├── structure.md            ← "Las carpetas van organizadas ASÍ"
│   ├── theme-tokens.md         ← "Los colores y fuentes se definen ASÍ"
│   ├── template-contract.md    ← "Una plantilla de página funciona ASÍ"
│   └── client-composition.md   ← "Un proyecto de cliente se monta ASÍ"
│
├── guides/              ← Guías prácticas para el día a día
│   ├── first-day-setup.md      ← Lo primero que leer al incorporarte
│   ├── daily-workflow.md       ← Tu rutina diaria de trabajo
│   ├── project-map.md          ← Mapa visual de dónde está cada cosa
│   ├── glossary.md             ← Diccionario de términos del proyecto
│   └── wordpress-to-hwp.md     ← "En WordPress hacías X, aquí se hace Y"
│
├── plans/               ← Planes de trabajo por fase
├── diagrams/            ← Diagramas visuales de la arquitectura
├── catalog.md           ← Índice de todos los skills, agentes y componentes
└── README.md            ← Punto de entrada: qué leer según tu tarea
```

### ¿Cuándo los consultas?

- **Antes de empezar cualquier tarea nueva**: lee `docs/README.md`. Te dice exactamente qué ficheros cargar según lo que vayas a hacer.
- **Cuando no entiendas por qué algo se hace de cierta manera**: busca en `docs/architecture/decisions.md`. Cada decisión tiene un "por qué" documentado.
- **Cuando no sepas dónde poner algo**: consulta `docs/contracts/frontend/structure.md`.
- **Cuando no sepas qué significa un término**: consulta `docs/guides/glossary.md`.

### Analogía WordPress

En WordPress, estas decisiones viven en la cabeza del developer senior o en un Notion que nadie actualiza. Aquí están versionadas en Git, revisadas como código, y son la fuente de verdad. Si algo no está documentado, no se ha decidido.

---

## 📏 Specs — Las reglas del juego

### ¿Qué son?

Las **specs** (especificaciones) son las reglas de cómo escribimos código, cómo hacemos SEO, cómo manejamos la seguridad, y cómo trabajamos con la IA. Son las "normas de la casa" — aplican siempre, no se negocian caso a caso.

### ¿Dónde están?

```
docs/specs/
├── general/
│   ├── base-standards.md       ← Reglas que aplican a TODO: TypeScript strict, 
│   │                              Zod en cada frontera, TDD obligatorio,
│   │                              commits en inglés, no usar "any"
│   └── lifecycle.md            ← Cómo un componente pasa de borrador a producción
│                                  (alpha → beta → stable)
│
├── frontend/
│   ├── frontend-standards.md   ← Reglas de React, Next.js, Tailwind, accesibilidad
│   ├── coding-standards.md     ← Cómo nombrar variables, organizar imports,
│   │                              patrones permitidos y prohibidos
│   └── block-architecture.md   ← El sistema de 4 capas de los bloques
│
├── seo/
│   ├── seo-standards.md        ← Títulos, metas, alt texts, URLs
│   ├── semantic-html.md        ← Qué etiquetas HTML usar en cada caso
│   ├── local-seo.md            ← Geolocalización, NAP, hreflang
│   └── schemas/                ← 11 plantillas JSON-LD para datos estructurados
│
├── security/
│   └── security-standards.md   ← RGPD, cookies, validación de inputs, CSP
│
└── ai/
    ├── agent-directory.md      ← Los 11 agentes de IA y cuándo usar cada uno
    └── agent-teams-playbook.md ← Combinaciones de agentes por tipo de tarea
```

### Las reglas más importantes (resumen)

Estas reglas aplican siempre, sin excepciones:

1. **TypeScript strict** — no se usa `any` nunca. Si no sabes el tipo, usa `unknown` + Zod para validar.
2. **TDD** — escribes el test ANTES que el código. Si no puedes escribir el test, la especificación no está clara.
3. **Zod en cada frontera** — cada dato que entra (de la API, del CMS, del usuario) se valida con un schema Zod.
4. **No `if (client === 'camping-x')` en el core** — la lógica específica de un cliente va en su proyecto, nunca en los paquetes compartidos.
5. **Un `globals.css` por cliente, cero CSS por bloque** — los bloques solo usan clases Tailwind.
6. **Commits en inglés** — siguiendo el formato Conventional Commits.
7. **Documentación antes que código** — primero se aprueba la propuesta, luego se implementa.
8. **RGPD es obligación legal** — cualquier violación de privacidad bloquea el despliegue.

### ¿Cuándo las consultas?

- **Siempre que escribas código**: las specs de `frontend/` y `general/` deben estar en tu cabeza. Si tienes duda, reconsúltalas.
- **Antes de crear un bloque nuevo**: lee `block-architecture.md` — define las 4 capas que puede tener un bloque.
- **Antes de desplegar**: revisa `security-standards.md` y `seo-standards.md`.

### Analogía WordPress

En WordPress, las normas de codificación son los WPCS (WordPress Coding Standards). Las specs de HWP son el equivalente, pero cubren más: no solo cómo escribir PHP/React, sino también SEO, seguridad, accesibilidad, y la metodología de trabajo con IA.

---

## 🔧 Skills — Lo que la IA hace por ti

### ¿Qué son?

Los **skills** son tareas automatizadas que Claude Code (nuestra IA de desarrollo) puede ejecutar por ti. En vez de hacer algo manualmente paso a paso, invocas un skill y Claude Code lo hace siguiendo las reglas del proyecto.

### ¿Dónde están?

```
.claude/
├── skills/              ← Los skills ejecutables
│   ├── scaffold-block/  ← Crea la estructura de un bloque nuevo
│   ├── scaffold-site/   ← Crea un proyecto de cliente desde cero
│   ├── enrich-us/       ← Enriquece una user story con detalles técnicos
│   ├── import-figma/    ← Importa un diseño de Figma al proyecto
│   ├── security-audit/  ← Auditoría de seguridad completa
│   ├── seo-audit/       ← Auditoría SEO completa
│   ├── archive/         ← Cierra una historia completada
│   ├── commit/          ← Prepara commits siguiendo las convenciones
│   └── ...13 skills en total
│
├── commands/            ← Comandos rápidos (wrappers de skills)
│   ├── add-block/
│   ├── create-page/
│   └── ...6 comandos
│
└── agents/              ← 11 perfiles de agente IA especializados
    ├── planner.md       ← Diseña la solución técnica
    ├── implementer.md   ← Implementa con TDD
    ├── reviewer.md      ← Revisa el código de forma independiente
    ├── verifier.md      ← Verifica que compile y pase tests
    └── ...7 especialistas más
```

### Los skills que más usarás

| Skill | Qué hace | Cuándo lo usas |
|---|---|---|
| `/scaffold-block` | Crea la estructura completa de un bloque nuevo (5 ficheros + imports) | Cuando el planner aprueba un bloque nuevo |
| `/scaffold-site` | Crea un proyecto de cliente completo desde la plantilla | Cuando onboardeas un nuevo cliente |
| `/import-figma` | Importa un diseño de Figma y extrae tokens de color/tipografía | Cuando el diseñador entrega un Figma nuevo |
| `/security-audit` | Revisa seguridad: headers, cookies, inputs, RGPD, dependencias | Antes de cada despliegue |
| `/seo-audit` | Revisa SEO: semántica HTML, metas, JSON-LD, imágenes, performance | Después de crear bloques o páginas |
| `/archive` | Cierra una historia: actualiza docs, catálogo, marca como done | Cuando una historia pasa la verificación |

### Los agentes que hay detrás

Los skills no son solo scripts — los ejecutan agentes de IA con roles específicos. Hay 11, pero los que verás más a menudo son:

- **Planner** — antes de escribir código, diseña la solución. Dice qué ficheros tocar, qué tests escribir, qué riesgos hay.
- **Implementer** — escribe el código siguiendo el plan del planner. Siempre con TDD: test primero, luego implementación.
- **Reviewer** — revisa el código de forma independiente. Nunca ve el plan del planner (para que la revisión sea objetiva).
- **Verifier** — ejecuta typecheck, tests, lint y build. Si algo falla, reporta. No arregla.

### ¿Cómo se usan?

En Claude Code (VS Code), escribes el comando:

```
/scaffold-block GalleryBlock --target base
```

Claude Code lee el skill, carga las reglas del proyecto, y ejecuta la tarea. No necesitas decirle cómo — ya sabe las convenciones del proyecto porque lee las specs y los contracts antes de actuar.

### Analogía WordPress

En WordPress, usarías WP-CLI para scaffoldear un plugin (`wp scaffold plugin mi-plugin`). Los skills de HWP son eso pero mucho más potentes: no solo crean ficheros, sino que los crean siguiendo las specs, con tests incluidos, y validando que todo cuadre con la arquitectura.

---

## 📋 User Stories — Lo que hay que construir

### ¿Qué son?

Las **user stories** (historias de usuario) son las tareas de desarrollo, escritas desde la perspectiva de quién necesita algo y por qué. Son el "qué hay que hacer" del proyecto.

### ¿Cómo se ven?

Una user story tiene este formato:

```
Como [tipo de usuario],
quiero [funcionalidad],
para [beneficio].
```

Ejemplo real:

```
Como visitante de la web del camping,
quiero ver una galería de fotos del camping en formato masonry,
para hacerme una idea visual del lugar antes de reservar.
```

### ¿Dónde viven?

```
docs/stories/
├── frontend/    ← Historias de bloques, templates, composiciones
├── cms/         ← Historias de Payload CMS, contenido
└── infra/       ← Historias de CI/CD, deploy, configuración
```

Cada historia es un fichero markdown con:
- La historia en sí (quién, qué, para qué)
- Criterios de aceptación (cómo sabemos que está hecho)
- Detalles técnicos (qué ficheros tocar, qué patterns seguir)
- Tests esperados

### El ciclo de vida de una historia (SPECBOOT)

Este es el flujo que sigue cada historia desde que nace hasta que se cierra:

```
1. /enrich_us    → Se enriquece la historia con detalles técnicos
                    (el agente "planner" analiza qué hace falta)

2. /propose      → Se diseña la solución técnica
                    (qué ficheros crear, qué tests escribir, qué riesgos hay)

3. /apply        → Se implementa con TDD
                    (test primero → falla → implementar → pasa)

4. /verify       → Se verifican los gates de calidad
                    (typecheck, tests, lint, build — todo verde)

5. /archive      → Se cierra la historia
                    (se actualizan docs, catálogo, se marca como done)

6. /commit       → Se hace el commit con mensaje convencional
```

### ¿Por qué es importante este ciclo?

Porque garantiza que:
- **Nada se implementa sin pensarlo antes** (paso 2)
- **Nada se escribe sin tests** (paso 3)
- **Nada se mezcla sin pasar calidad** (paso 4)
- **Nada queda sin documentar** (paso 5)

En WordPress, estos pasos suelen saltarse bajo presión ("ya lo documentaré luego", "los tests los pongo después"). En HWP, el propio sistema de IA los refuerza — no puedes avanzar al siguiente paso sin completar el anterior.

### Analogía WordPress

Las user stories son como los tickets de Jira o Trello que usarías en un proyecto WordPress, pero con más estructura: incluyen los detalles técnicos desde el principio y tienen un ciclo de vida formal que asegura calidad.

---

## Cómo se crea un proyecto de cliente desde cero

Supongamos que llega un nuevo cliente: **Camping Sol y Luna**. Este es el proceso completo:

### Paso 1 — Importar el diseño

El diseñador entrega un repositorio de Figma Make. Lo importamos:

```
/import-figma https://github.com/... camping-sol-y-luna
```

Esto clona el diseño en `figma-makes/camping-sol-y-luna/`, extrae los colores y fuentes, y genera un análisis en `docs/clients/camping-sol-y-luna/figma-analysis.md`.

### Paso 2 — Crear el proyecto del cliente

```
/scaffold-site camping-sol-y-luna
```

Esto crea un repositorio independiente con:
- Todos los bloques base (re-exportados desde `@hwp/core-ui`)
- El registry de bloques
- La estructura de tema con los tokens del Figma
- El `globals.css` con las fuentes del cliente
- La configuración de Tailwind, Next.js, TypeScript

### Paso 3 — Extraer y aplicar tokens

Del análisis del Figma, se extraen los tokens de color y tipografía y se escriben en `src/theme/tokens.json`. Estos tokens alimentan todo el sistema visual.

### Paso 4 — Personalizar bloques (si es necesario)

Para cada bloque, el equipo decide:

- **¿El base-block con tokens basta?** → No se toca nada (Level 1). Solo los colores y fuentes cambian.
- **¿Necesita ajustes visuales en una pieza?** → Se usan slots (Level 2). Por ejemplo, cambiar cómo se ve el botón del hero.
- **¿El diseño es completamente diferente?** → Se escribe un bloque custom (Level 3), usando solo el schema de datos compartido.

### Paso 5 — Crear composiciones

Las composiciones definen qué bloques van en cada página y en qué orden:

```
Home = Hero + Booking + Gallery + Amenities + Reviews
Le Camping = Hero + MediaText + AccommodationGrid + Amenities
Tarifas = Hero + Rates
Contacto = Hero + Contact + Map
```

Cada composición es un fichero en `src/compositions/`.

### Paso 6 — Auditorías

Antes de desplegar, se ejecutan las auditorías:

```
/seo-audit camping-sol-y-luna
/security-audit camping-sol-y-luna
```

Se corrigen los issues encontrados y se re-audita hasta que todo está verde.

### Paso 7 — Despliegue

El proyecto se despliega en Vercel con su propio dominio. Cada cliente tiene su proyecto Vercel independiente — un problema en un cliente nunca afecta a otro.

---

## Resumen visual

```
┌─────────────────────────────────────────────────────────────────┐
│                        DOCS                                     │
│  "Esto es lo que hemos decidido y cómo está organizado todo"    │
│  → decisions.md, contracts/, guides/, plans/, diagrams/         │
└──────────────────────────────┬──────────────────────────────────┘
                               │ se basan en
┌──────────────────────────────▼──────────────────────────────────┐
│                        SPECS                                    │
│  "Estas son las reglas: TypeScript strict, TDD, Zod, RGPD..."  │
│  → base-standards.md, coding-standards.md, seo/, security/     │
└──────────────────────────────┬──────────────────────────────────┘
                               │ son ejecutadas por
┌──────────────────────────────▼──────────────────────────────────┐
│                       SKILLS                                    │
│  "La IA sabe hacer esto por ti, siguiendo las specs"            │
│  → scaffold-block, scaffold-site, seo-audit, security-audit     │
└──────────────────────────────┬──────────────────────────────────┘
                               │ aplicados a
┌──────────────────────────────▼──────────────────────────────────┐
│                    USER STORIES                                 │
│  "Esto es lo que hay que construir, paso a paso"                │
│  → /enrich → /propose → /apply → /verify → /archive → /commit  │
└─────────────────────────────────────────────────────────────────┘
```

---

## Preguntas frecuentes

### ¿Tengo que leer todos los docs antes de empezar?

No. Lee `docs/guides/first-day-setup.md` y `docs/guides/project-map.md`. El resto lo consultas según la tarea.

### ¿Qué pasa si no estoy de acuerdo con una spec?

Perfecto — propón un cambio. Pero el cambio pasa por un DEC (Decision Entry in Catalog) formal que se discute y se documenta. No se cambian las reglas "sobre la marcha" en un commit.

### ¿Puedo ignorar un skill y hacer algo manualmente?

Técnicamente sí, pero pierdes las garantías: el skill aplica las specs automáticamente, genera tests, y sigue los contratos. Si lo haces manual, eres tú quien debe verificar todo eso.

### ¿Qué es SPECBOOT?

Es nuestra metodología de desarrollo: **Spec-driven, Boot-strapped**. En resumen: la especificación (el plan) va primero, el código va después. Nunca se escribe código sin una propuesta aprobada.

### ¿Esto es como Scrum?

No exactamente. SPECBOOT define el ciclo de una historia individual (enrich → propose → apply → verify → archive), no la gestión de sprints o ceremonias de equipo. Se puede combinar con Scrum, Kanban, o cualquier framework de gestión que elija la empresa.

### ¿Qué diferencia hay entre un bloque y una composición?

- **Bloque**: una pieza visual reutilizable (un hero, una galería, un formulario). Se usa en muchos clientes.
- **Composición**: el montaje de bloques para una página concreta de un cliente. Solo existe en ese proyecto.

Un bloque es como una pieza de LEGO. Una composición es el modelo que montas con esas piezas.

### ¿Qué pasa cuando actualicemos `@hwp/core-ui`?

Los clientes que usan Level 1 (re-export) reciben las mejoras automáticamente al hacer `npm update`. Los que usan Level 2 (slots) o Level 3 (custom) solo se ven afectados si cambia el schema de datos — y eso es un cambio de versión major que se comunica y se planifica.

---

## Tu primer día: checklist

```
□ Leer esta guía (ya lo estás haciendo)
□ Leer docs/guides/first-day-setup.md
□ Leer docs/guides/project-map.md
□ Echar un vistazo a docs/guides/wordpress-to-hwp.md
□ Abrir el proyecto en VS Code y explorar la estructura de carpetas
□ Ejecutar pnpm install y pnpm build para verificar que todo compila
□ Abrir apps/site-demo en localhost y navegar el camping de ejemplo
□ Leer UN bloque completo (HeroBlock) para entender la estructura de 5 ficheros
□ Preguntar al equipo las dudas que te surjan — no hay preguntas tontas
```