# hwe — Todas las opciones de arquitectura contempladas

> Documento exhaustivo de todas las opciones evaluadas. Para cada decisión se documentan todas las alternativas, sus pros, contras y por qué se descartaron o eligieron.
>
> ⚠️ **Las opciones de hosting / DB / API-proxy marcadas `✓ ELEGIDO` en este documento (cdmon estático + Hetzner Payload, MariaDB cdmon, PHP en cdmon) reflejan la decisión tomada en mayo 2026 y posteriormente revisada por DEC-007 (2026-05-20).** El stack actual es Vercel full-stack. Este documento se mantiene como registro histórico de las alternativas evaluadas; la decisión vigente y su rationale viven en [`../memory-bank/decisions.md`](./decisions.md#dec-007).

---

## 1. FRAMEWORK FRONTEND

**Next.js 14 + TypeScript** ✓ ELEGIDO
- SSR, SSG e ISR nativos, App Router, Edge Middleware
- Ecosistema más grande, muy maduro para multi-tenant
- Static export para cdmon sin procesos persistentes

**Nuxt.js 3** — Descartado: ecosistema más pequeño, menos talento

**Astro** — Descartado: no es la mejor opción para booking engine interactivo

---

## 2. CMS HEADLESS

**Payload CMS v3 — por tipo de cliente** ✓ ELEGIDO
- MIT gratis en self-hosted
- Schemas 100% en código TypeScript — nunca en DB
- Campos condicionales por tenant — UI limpia por cliente
- Payload compartido por tipo (camping/hotel) — eficiente para 300 clientes
- Separable por cliente en el futuro — una línea en client.config.ts
- Admin UI 100% customizable en React
- Adquirido por Figma 2025 — core MIT garantizado

**Un Payload por cliente**
- Aislamiento total pero ineficiente para 300 clientes
- Descartado como modelo base — posible para clientes con necesidades muy específicas

**Sanity** — Descartado: SaaS cerrado, vendor lock-in, datos fuera de infraestructura

**Strapi** — Descartado: permite schemas en DB via UI (exactamente lo que no se quiere)

**WordPress headless** — Descartado: schemas en DB, page builders, seguridad deficiente

**Directus** — Descartado: Node.js mismo problema infraestructura, schemas en DB

**Cockpit CMS** — Descartado: ecosistema pequeño, riesgo de abandono

---

## 3. BASE DE DATOS

**MariaDB cdmon — DB por cliente + plataforma_db compartida** ✓ ELEGIDO
- Ya disponible en cdmon sin coste extra
- DB separada por cliente = aislamiento físico total
- plataforma_db compartida para config global y logs
- Compatible con Payload v3 y Prisma

**PostgreSQL** — Descartado para fase inicial: no disponible en cdmon nativamente,
innecesario con modelo DB-por-cliente (RLS no necesario)

**Supabase** — Descartado: $25/mes por proyecto escala mal, self-hosted son 13 servicios

**Firebase/MongoDB** — Descartado: no relacional, lock-in, mal para datos estructurados

---

## 4. ORM

**Prisma** ✓ ELEGIDO
- Typesafe, migraciones en Git, soporta MySQL/MariaDB y PostgreSQL
- Cambiar de motor: una línea en schema.prisma

**Drizzle** — Descartado: menos maduro, menor ecosistema

---

## 5. ESTRUCTURA DE REPOS GIT

**hwe-platform (core) + repos separados por cliente** ✓ ELEGIDO
- hwe-platform: packages @hwe/*, templates, scripts — un solo repo
- Un repo independiente por cliente — privacidad y permisos granulares
- Dev solo clona lo que necesita — eficiente para 300 clientes
- GitHub Organizations + Teams para gestión de permisos
- Script create-client automatiza creación de repo + DB + Payload

**Monorepo único con todos los clientes en apps/**
- Descartado: con 300 clientes git clone descarga todo,
  todos los devs ven todos los clientes, CI/CD analiza 300 proyectos

**Repos completamente separados sin core compartido**
- Descartado: bug en core requiere parchear 300 repos

**Monorepo Nx** — Descartado: overkill para equipo pequeño, curva alta

---

## 6. REGISTRY NPM Y VERSIONADO

**GitHub Packages + Changesets** ✓ ELEGIDO

GitHub Packages:
- Incluido en GitHub Team — sin servidor extra
- Integrado nativamente con GitHub Actions
- Sin punto de fallo propio
- Privado, seguro, fiable para 300 clientes

Changesets para gestión de versiones:
- Estándar actual para monorepos TypeScript con Turborepo
- Automatiza versionado semántico, CHANGELOG y publicación
- Versiones independientes por package (@hwe/booking puede ser v1.1.2
  mientras @hwe/core-ui es v1.3.0)
- PR automático "Version Packages" — tech lead decide cuándo publicar
- Usado por Radix UI, shadcn/ui, Remix, tRPC — ecosistema de referencia
- Un solo repo hwe-platform — no hay repos separados por versión

**Verdaccio self-hosted en Hetzner**
- Descartado: punto único de fallo, servidor extra a gestionar,
  si cae ningún cliente puede hacer deploy

**Git tags manuales sin Changesets**
- Descartado: versionado manual tedioso para packages independientes,
  CHANGELOG hay que escribirlo a mano, publicación manual propensa a errores

**Lerna**
- Descartado: menos adoptado en proyectos modernos TypeScript,
  más verboso que Changesets, Changesets es la alternativa moderna

**Nx Release**
- Descartado: requiere migrar de Turborepo a Nx,
  complejidad innecesaria para el equipo actual

---

## 7. DEPLOY E INFRAESTRUCTURA

**Situación real de cdmon (verificada por SSH)**
- Jail Linux Debian, usuario testweb32
- MariaDB 10.11 ✓, Apache ✓, Git ✓, Cron jobs ✓
- PHP disponible via Apache ✓
- Node.js instalable manualmente pero proceso muere inmediatamente
- Procesos persistentes: pendiente confirmar con soporte cdmon

**cdmon estático + Hetzner Payload** ✓ ELEGIDO (Fase 2)
- cdmon: HTML estático + PHP proxy + MariaDB + imágenes
- Hetzner CX21 €5.5/mes: Payload por tipo + Nginx + Coolify
- GitHub Actions compila y despliega — Node.js no necesario en cdmon
- DNS: campingsol.com → cdmon, cms.campingsol.com → Hetzner
- Si cdmon confirma Node.js persistente → Payload migra a cdmon, Hetzner eliminado

**Todo en cdmon (estático puro)**
- Sin Payload online — solo agencia edita en local
- Descartado: cliente necesita editar su contenido directamente

**Vercel + Railway**
- Evaluado extensamente
- Descartado: coste variable por tráfico peligroso para hospitality estacional,
  $0.15/GB tras 1TB, facturas impredecibles en verano

**Cloudflare Pages + Workers**
- Descartado: Next.js App Router con Payload no compatible con Workers
  (sin Node.js, límite 128MB RAM, máx 30s)

**Todo en Hetzner**
- Si Hetzner cae, frontend también cae — inaceptable para hospitality
- Descartado: separación cdmon/Hetzner da resiliencia real

---

## 8. PROXY DE APIS EXTERNAS

**PHP en cdmon** ✓ ELEGIDO
- Ya disponible, sin proveedor extra, sin coste
- Proxy seguro para PMS y Claude API — credenciales nunca al browser
- CORS restringido al dominio del cliente

**Cloudflare Workers** — Válido pero descartado: otro proveedor a gestionar

**Netlify/Vercel Functions** — Descartado: requieren esas plataformas

**AWS Lambda** — Descartado: setup complejo, innecesario con PHP disponible

---

## 9. SISTEMA DE BLOQUES Y FLUJO FIGMA

**Figma Make referencia + Claude Code construye con @hwe/core-ui** ✓ ELEGIDO
- Tokens exportados de Figma Variables → tailwind.config.ts (convención obligatoria)
- Figma Make genera código completo como referencia visual
- Claude Code recibe código Figma Make + catálogo @hwe/core-ui + ai-specs
- Claude construye site con bloques y variantes correctos
- Dev revisa y aprueba
- Payload almacena: type, variant, order — nunca layout

**Figma Make directo a producción**
- Descartado: no accesible, no semántico, no sigue convenciones,
  no conectado a Payload ni analytics, no tiene i18n

**Claude MCP lee Figma directamente**
- Descartado: Figma Make da referencia más completa y rápida

**Page builder en CMS**
- Descartado explícitamente: exactamente lo que no se quiere

---

## 10. BOOKING ENGINE

**Adapter pattern con capabilities declaradas** ✓ ELEGIDO
- Interface BookingAdapter común — el core no depende de ningún PMS
- Precios y disponibilidad siempre del PMS — nunca guardados
- PHP proxy en cdmon para llamadas seguras al PMS
- Primera fase: búsqueda + salto al motor del PMS

**Motor de precios propio** — Descartado: precios vienen del PMS externo

---

## 11. PAYLOAD — SCHEMAS POR CLIENTE

**Campos condicionales por tenant en schema TypeScript** ✓ ELEGIDO
- Schema definido en hwe-platform/packages — código, no UI
- Campos opcionales visibles según activeFields en client.config.ts
- UI limpia por cliente — solo ve sus campos
- Sin deploy para activar/desactivar campos existentes
- Separación a instancia dedicada posible con una línea

**Schema universal sin condiciones**
- Descartado: todos los clientes ven todos los campos, mala UX

**Schema por cliente en repo del cliente**
- Descartado: pierde el beneficio del schema compartido por tipo

---

## 12. SISTEMA DE IA

**Claude API via PHP proxy + validación Zod + backup temporal** ✓ ELEGIDO
- IA siempre via PHP proxy — API key nunca al browser
- Muestra al usuario qué va a cambiar antes de actuar
- Backup temporal obligatorio (TTL 30 días) antes de cualquier cambio
- Si falla → restauración automática
- Cliente puede deshacer desde el portal

**IA publica directamente sin confirmación**
- Descartado: demasiado arriesgado para contenido real de clientes

---

## 13. EDICIÓN MASIVA

**Tres mecanismos combinados** ✓ ELEGIDO
- Portal IA: cambios simples en lenguaje natural, backup de todos, un recompile final
- Script bulk operations: migraciones complejas, CSV, correcciones masivas
- Payload admin directo: correcciones puntuales de 2-5 documentos

---

## 14. PÁGINAS DINÁMICAS

**generateStaticParams de Next.js** ✓ ELEGIDO
- Una plantilla Figma → N páginas compiladas
- Payload webhook → GitHub Actions recompila → nueva página en ~2-3 min

**SSR por petición** — Descartado: requiere proceso Node.js persistente

---

## 15. STAGING

**cdmon /staging por cliente** ✓ ELEGIDO
- staging.cliente.com en /staging/ de cdmon
- Deploy a staging → validación → producción
- Sin coste extra

---

## 16. BACKUPS

**Doble nivel: cdmon /backup_db + snapshots IA en plataforma_db** ✓ ELEGIDO
- Nivel 1: backup diario automático de MariaDB via cdmon
- Nivel 2: snapshot antes de cada cambio IA (TTL 30 días)
- Cliente puede deshacer desde el portal

---

## 17. MONITORIZACIÓN

**Playwright health checks + GitHub Actions cron + email** ✓ ELEGIDO
- Cron cada hora, email a webmaster si falla
- Reutiliza tests E2E existentes, sin coste extra

**UptimeRobot/Sentry/Datadog** — Descartados para fase inicial: coste mensual

---

## 18. GESTIÓN DE IMÁGENES

**cdmon /web/cliente/uploads/** ✓ ELEGIDO
- Apache sirve como estáticos — máxima velocidad
- PHP valida tipo y tamaño antes de guardar
- Sin coste extra

**Cloudflare R2 / S3** — Contemplado para fase futura si el volumen crece

---

## 19. HARNESS ENGINEERING

**Prompts en Markdown versionados en Git + Zod + logging** ✓ ELEGIDO
- Prompts en packages/@hwe/ai/prompts/ — versionados, editables sin deploy
- System prompt construido dinámicamente con contexto del tenant
- Validación Zod de todos los outputs de Claude
- Log completo: prompt, respuesta, validación, tokens, coste, acción

---

## 20. ARQUITECTURA DE AGENTES

**Cinco agentes especializados + router + reglas configurables** ✓ ELEGIDO
- Content Editor (Haiku): cambios simples portal cliente
- Content Generator (Sonnet): generación inicial completa
- Bulk Operator (Sonnet): operaciones masivas con backup obligatorio
- Code Builder (Sonnet): Figma Make → @hwe/core-ui
- Planner (Opus): arquitectura y decisiones complejas
- Reglas configurables desde panel admin sin deploy
- Token tracking por cliente con alertas de coste

**Un solo agente para todo** — Descartado: coste innecesario y calidad inadecuada

**Agentes autónomos sin confirmación** — Descartado: siempre humano en el loop

---

## 21. ARQUITECTURA INTERNA (DDD)

**DDD con 4 capas + SOLID + DRY** ✓ ELEGIDO
- Presentation → Application → Domain → Infrastructure
- Interfaces para todos los adaptadores
- Nunca if (client === 'camping-sol') en el core

---

## 22. TESTING

**Jest + Playwright** ✓ ELEGIDO
- Jest: unit + integración, 90% coverage en booking y adaptadores
- Playwright: E2E + health checks cada hora en producción
- AAA pattern, naming: should_[behavior]_when_[condition]

---

## 23. CI/CD

**GitHub Actions + workflow_dispatch por cliente** ✓ ELEGIDO
- Deploy manual por cliente — dev controla cuándo actualiza
- Clientes pueden estar en versiones distintas del core
- PR automático cuando hay nueva versión del core disponible

---

## 24. PORTABILIDAD DEL CONTENIDO

**Markdown para rich text + export JSON diario** ✓ ELEGIDO
- Markdown: formato universal, cualquier CMS lo lee
- Export diario: Payload REST API → JSON neutro
- Script migrate:export y migrate:import preparados desde el inicio

---

## 25. MULTIIDIOMA Y SEO

**next-intl + hreflang + Schema.org + PHP geo-redirect** ✓ ELEGIDO
- Rutas /es, /en, /fr generadas estáticamente
- LodgingBusiness structured data por cliente
- PHP detecta Accept-Language y redirige

---

## 26. ANALYTICS

**@hwe/analytics — GTM + DataLayer tipado** ✓ ELEGIDO
- Hooks TypeScript tipados — sin strings mágicos
- Eventos: page_view, booking_start, booking_complete...

---

## 27. OPENAPI

**Generado automáticamente desde Zod + Payload plugin** ✓ ELEGIDO
- Nunca escrito a mano — siempre sincronizado con el código


---

## 28. METODOLOGÍA DE DESARROLLO

**SPECBOOT by LIDR — Spec-Driven Development** ✓ ELEGIDO
- Ciclo formal: User Story → /enrich_us → Refined US → /propose →
  Proposal Artifacts → /apply → [Branch+Tests+Docs+Code+Report+Update] →
  /verify + /code_review → /archive + /commit → PR → Published
- Documentación es la fuente de verdad — código viene después
- Comandos estandarizados como contratos humano-IA
- Testing Report como artefacto formal archivado
- Proposal Update obligatorio si el código difiere del proposal
- Modelo de IA por fase: Opus para planning, Sonnet para código, Haiku para reports
- Encaja con memoria-bank/, docs/ y GitHub Actions ya definidos

**Desarrollo ad-hoc sin metodología formal**
- Descartado: sin proceso formal la IA genera código inconsistente,
  la documentación se desactualiza, los tests se escriben después del código

**OpenSpec (del proyecto LTI referencia)**
- Similar a SPECBOOT pero menos prescriptivo en los comandos
- Descartado en favor de SPECBOOT: más completo, mejor definido,
  comandos más claros para trabajar con Claude Code


---

## 29. SEGURIDAD COMPLETA

**Keeper + GitHub Secrets + Rate limiting PHP + GD sanitización + .htaccess headers + Cookiebot** ✓ ELEGIDO

Gestión de secretos:
- Keeper como fuente de verdad humana — ya en uso en la agencia
- GitHub Secrets para distribución automática a CI/CD
- Dev obtiene de Keeper → configura en GitHub Secrets → máquinas lo usan
- Rotación obligatoria cuando un dev deja el proyecto
- .env.example en Git con placeholders, .env.local nunca en Git

Rate limiting:
- PHP con archivos temporales — sin Redis, sin infraestructura extra
- Límites distintos por endpoint según coste: 30/10/5 req/min
- Descartado Redis para rate limiting: innecesario con el volumen esperado

Sanitización de uploads:
- GD regenera la imagen — elimina metadatos y payloads maliciosos
- MIME real verificado con finfo — nunca confiar en la extensión
- Nombre de fichero aleatorio con uniqid() — nunca nombre original

Headers HTTP:
- .htaccess por cliente en cdmon
- CSP ajustado por cliente según PMS de booking
- HSTS, X-Frame-Options, X-Content-Type-Options, Referrer-Policy

GDPR:
- Cookiebot (~€10-14/mes por dominio) ✓ ELEGIDO
  Gestión externa del consentimiento — se actualiza con la ley automáticamente
  GTM solo carga tras aceptar consentimiento
  Registro auditable de consentimientos
- Axeptio — alternativa más visual, empresa francesa, €9/mes
  Descartado para fase inicial en favor de Cookiebot (más conocido, mejor soporte)
- Usercentrics — más enterprise, €30/mes
  Descartado: overkill para la fase actual
- Implementación propia del banner
  Descartado: requiere mantenimiento legal propio, riesgo de incumplimiento

DPA firmados con: cdmon, Hetzner, Cookiebot, Anthropic


---

## 30. SEO / GEO / PERFORMANCE

**Prefijo locale + slugs traducidos + Lighthouse CI + Schema.org personalizado + Cookiebot + GSC API** ✓ ELEGIDO

URLs:
- Prefijo locale: /es/, /en/, /fr/ — mejor para SEO que parámetros o subdominios
- Slugs traducidos por locale — Google indexa mejor en cada idioma
- hreflang automático en metadata de Next.js

Metadata:
- Open Graph + Twitter Cards generados por página y locale
- Canonical URL con hreflang alternates
- llms.txt estático por cliente para agentes IA

Schema.org:
- Campground + CampingPitch para campings
- Hotel + HotelRoom para hoteles
- Personalizado por cliente — amenities, geo, precio
- Descartado: schema genérico LodgingBusiness sin personalización

Core Web Vitals:
- Lighthouse CI en GitHub Actions — deploy falla si baja de umbrales
- LCP < 2.5s, CLS < 0.1, INP < 200ms obligatorio
- Imágenes: webp, dimensiones fijas, lazy loading, srcset
- Apache: gzip + cache headers 1 año para assets estáticos

404 y redirects:
- Página 404 personalizada por cliente con branding
- Redirects 301 solo cuando son necesarios — no por defecto
- Script generate:redirects automatiza la generación del .htaccess
- Monitoring 404s en logs con alerta si > 10/día distintos

Indexación:
- Google Search Console verificado en onboarding
- GSC API solicita indexación tras cada deploy
- Monitorización páginas no indexadas en auditoría mensual

Auditorías:
- Mensual automática via GitHub Actions cron
- Trimestral manual con Semrush o Ahrefs
- Análisis contenido SEO via agente Haiku en @hwe/ai


---

## 31. BOOKING ENGINE — MODOS DE INTEGRACIÓN

**Modo api + modo external-widget. iframe descartado como estándar** ✓ ELEGIDO

Modo api (preferido):
- PHP proxy → API del PMS → UI propia en Next.js
- Control total visual — buscador diseñado en Figma
- Requiere API pública documentada del PMS

Modo external-widget:
- Script JS del PMS embebido en el DOM
- Contenedor estilizado + widget del PMS
- Algunos PMS permiten theming CSS

Modo iframe:
- Descartado como estándar — no es el flujo normal
- Solo caso excepcional si PMS no ofrece API ni widget JS

Especificaciones técnicas de cada PMS concreto:
- Fuera de la arquitectura — se define en onboarding de cada cliente
- Cada adaptador implementado en packages/@hwe/booking/adapters/

---

## 32. BUENAS PRÁCTICAS Y ESTILO DE DESARROLLO

**Code Review Checklist + DoD + Conventional Commits + Dependabot + ESLint strict** ✓ ELEGIDO

Code Review:
- Checklist formal en docs/code-review-checklist.md
- Cubre: arquitectura, TypeScript, seguridad, tests, performance, docs
- Además del /verify automático de SPECBOOT con Claude

Definition of Done:
- Por tipo de tarea: feature, bug fix, nuevo cliente
- En docs/definition-of-done.md
- Incluye verificación de PMS y modo booking en onboarding de cliente

Deuda técnica:
- Registrada en Linear con label tech-debt
- 20% del tiempo de sprint reservado
- Regla del Boy Scout obligatoria

Conventional Commits:
- Obligatorio — Husky + commitlint lo valida antes del commit
- Inglés siempre, imperativo, máximo 72 caracteres
- Si no cumple el formato → commit falla automáticamente

Dependencias:
- Checklist antes de añadir cualquier librería
- bundlephobia.com para verificar bundle size
- npm audit en cada PR via GitHub Actions
- Dependabot activo para PRs de seguridad automáticos

TypeScript:
- strict: true obligatorio en todos los packages
- any prohibido via ESLint — error, no warning
- noUnusedLocals y noUnusedParameters activados


---

## 33. PERFORMANCE BUDGET

**bundlewatch + Lighthouse CI con umbrales obligatorios en GitHub Actions** ✓ ELEGIDO
- JS inicial < 100KB, CSS < 20KB, total página < 500KB sin imágenes
- LCP < 2.5s, CLS < 0.1, INP < 200ms, TTFB < 600ms
- Imágenes: hero < 200KB, galería < 100KB, total < 1MB por página
- Deploy falla automáticamente si se supera cualquier umbral
- bundlewatch para bundle size, Lighthouse CI para Web Vitals

Sin performance budget formal:
- Descartado: sin límites el bundle crece con cada feature,
  la experiencia de usuario degrada progresivamente sin que nadie lo detecte

---

## 34. FEATURE FLAGS

**Dos niveles: estáticos en client.config.ts + dinámicos en plataforma_db** ✓ ELEGIDO

Nivel estático:
- client.config.ts — features estructurales que cambian pocas veces
- Requieren deploy — el dev los gestiona
- Para activar tipos de página nuevos o secciones con diseño propio

Nivel dinámico:
- plataforma_db.feature_flags — features operacionales
- Sin deploy — el cliente los gestiona desde el portal
- Para banners, modo mantenimiento, switches de contenido

Servicio externo de feature flags (LaunchDarkly, Unleash):
- Más potente — A/B testing, rollout gradual, targeting por usuario
- Descartado para fase inicial: coste extra innecesario,
  los dos niveles propios cubren el 95% de los casos

---

## 35. MIGRACIÓN WORDPRESS → hwe

**Script de migración + Claude estructura contenido + redirect map automático + DNS cutover** ✓ ELEGIDO

Escenario A — Migración completa:
- WP REST API → script → Claude estructura → Payload drafts → agencia revisa
- generate:redirects automático → .htaccess 301s
- Convivencia en staging new.cliente.com durante el desarrollo
- DNS cutover + WordPress standby 30 días

Escenario B — Convivencia temporal:
- WordPress en producción mientras hwe se desarrolla
- hwe en new.cliente.com para validación
- DNS cutover cuando hwe está listo

Migración manual sin script:
- Descartado: con 300 clientes potenciales la migración debe ser automatizable
  Claude + script reduce días a horas por cliente


---

## 36. GESTIÓN DE ERRORES

**Error boundaries Next.js + PHP structured logs + degradación elegante + alertas automáticas** ✓ ELEGIDO

- Error boundaries en Next.js: error.tsx, global-error.tsx (404 en SEO/GEO)
- PHP proxy: log estructurado + degradación elegante con fallback URL del PMS
- Payload KO: cache local si existe, array vacío si no — nunca romper la página
- PMS KO: mensaje + URL directa al PMS como fallback
- Logs en cdmon /logs/ por cliente + plataforma_db.error_logs
- Alerta automática si > 10 errores 500 en 1 hora — diferenciado de 404s

Sentry / Datadog para error tracking:
- Más potente — stack traces, agrupación de errores, alertas avanzadas
- Descartado para fase inicial: coste mensual innecesario con el volumen inicial
- Contemplado para cuando escale a 50+ clientes activos

---

## 37. ACCESIBILIDAD

**WCAG 2.1 AA + axe-core en CI/CD + alt text required en Payload** ✓ ELEGIDO

- Estándar mínimo: WCAG 2.1 nivel AA
- axe-core-cli en GitHub Actions — falla deploy si hay errores AA críticos
- Alt text campo required en schema de imágenes Payload
- Contraste 4.5:1 verificado en tokens Figma con plugin Contrast
- Focus states, ARIA labels, heading order, skip to content — obligatorio en core-ui
- Checklist a11y en proceso de diseño Figma antes de Ready for dev

Sin estándar de accesibilidad formal:
- Descartado: riesgo legal en España (RD 1112/2018 obliga a webs públicas),
  mala experiencia para usuarios con diversidad funcional

---

## 38. DNS Y DOMINIOS

**Dominios en client.config.ts + script verify-dns + checklist onboarding** ✓ ELEGIDO

En el proyecto (Git):
- Dominios definidos en client.config.ts
- Script verify-dns.sh para verificación antes de cutover
- Checklist DNS en docs/onboarding-checklist.md

Fuera del proyecto:
- Credenciales y configuración real → Keeper + documentación interna agencia
- Proceso de transferencia de dominios → operativa de la agencia


---

## 39. ONBOARDING TÉCNICO Y BRIEFING

**memory-bank por cliente + assets en repo + client.config.ts con recursos** ✓ ELEGIDO

En el proyecto (Git):
- client.config.ts incluye sección assets con figmaUrl, logoSvg, favicon, brandColors
- docs/architecture/ por cliente: briefing.md, brand-guidelines.md, figma-notes.md
- assets/ por cliente: logo.svg, favicon.ico
- tokens/cliente.json exportados de Figma

Fuera del proyecto:
- Briefing original como documento de negocio (Notion, PDF)
- Reuniones y proceso de ventas con el cliente
- Gestión de la relación con el cliente

Briefing completo en el repo:
- Descartado: información confidencial de negocio no debe estar en Git
- El memory-bank contiene solo el resumen técnico necesario para Claude Code

Sin memory-bank por cliente:
- Descartado: Claude Code sin contexto genera código genérico
  que no refleja el tono ni las necesidades del cliente


---

## 40. CICLO DE VIDA DE LA DOCUMENTACIÓN

**Tres niveles: maestro (manual) + memory-bank (Claude propone) + artefactos técnicos (automático)** ✓ ELEGIDO

Nivel 1 — Documentos maestros:
- hwe-arquitectura-definitiva.md y hwe-opciones-arquitectura.md
- Solo en revisiones periódicas de arquitectura — nunca en desarrollo diario
- Solo el tech lead tras consenso del equipo

Nivel 2 — memory-bank:
- projectbrief.md, systemPatterns.md, decisions.md, dataModel.md
- Claude propone cambios en /archive, dev aprueba
- Actualización continua con cada feature relevante

Nivel 3 — Artefactos técnicos:
- OpenAPI, testing-reports/, decisions.md log
- Claude actualiza automáticamente en /archive
- Sin intervención humana

Todo automático sin revisión humana:
- Descartado: decisiones de arquitectura y patrones
  requieren criterio humano — Claude puede equivocarse
  en la interpretación de qué es relevante

Todo manual sin automatización:
- Descartado: en el desarrollo diario es inviable
  actualizar manualmente toda la documentación
  — se desactualiza inevitablemente


---

## 41. CONTEXT ENGINEERING

**Sistema simple de 3 capas — CLAUDE.md + contexto por tarea + sesión** ✓ ELEGIDO

- Capa 1: CLAUDE.md en raíz de cada repo — ~500 tokens, siempre presente
- Capa 2: docs/context-per-task.md — dev decide qué cargar por tipo de tarea
- Capa 3: historial de sesión — automático, Claude lo gestiona
- Coste: ~$12/mes por dev — insignificante vs $5.000-8.000 de implementar RAG
- Regla crítica: una sesión = una tarea — no mezclar contextos

RAG (Retrieval Augmented Generation):
- Recuperación automática de solo lo relevante
- Ahorro real: $7.50/mes por dev
- Descartado para fase inicial: equipo sin experiencia,
  coste de implementación no se amortiza en años,
  sistema simple suficiente para los primeros 100 clientes
- Se evalúa cuando agentes de producción superen $500/mes

Sin sistema de contexto formal:
- Descartado: Claude Code sin contexto estructurado
  genera código inconsistente con la arquitectura,
  cada sesión empieza desde cero sin conocimiento del proyecto


---

## 42. BOUNDED CONTEXTS

**Cuatro contextos delimitados: Booking, Content, Tenant, AI** ✓ ELEGIDO
- Cada contexto tiene su propio lenguaje obligatorio en código
- Nunca importar tipos de un contexto en otro directamente
- Mismo concepto = nombre distinto por contexto (Unit vs Accommodation)
- Reflejo directo en estructura de packages @hwe/*
- Comunicación entre contextos via interfaces y eventos

Un solo contexto global sin delimitación:
- Descartado: términos mezclados generan confusión,
  Claude Code genera código inconsistente sin contextos claros,
  imposible escalar a 300 clientes sin que el modelo de dominio colapse

---

## 43. EVALUATIONS (EVALS)

**Métricas por agente + storage en plataforma_db + dashboard admin** ✓ ELEGIDO
- Content Editor: 0.95 umbral — crítico, toca contenido real
- Content Generator: 0.80 — revisión humana posterior
- Bulk Operator: 0.99 — muy crítico, afecta muchos documentos
- Code Builder: CI/CD ya lo evalúa (Lighthouse + axe + tsc + jest)
- SEO Auditor: 0.75 — orientativo, revisión manual trimestral
- Dashboard en panel admin con tendencias y alertas

Sin sistema de evals:
- Descartado: sin métricas no se puede mejorar,
  "parece correcto" no es suficiente para un sistema en producción,
  imposible detectar degradación de calidad tras cambios de prompt

Plataforma externa de evals (LangSmith, Braintrust):
- Más potente para evaluación a escala
- Descartado para fase inicial: coste extra innecesario,
  el sistema simple en plataforma_db cubre el 90% de los casos

---

## 44. PROMPT CHAINING

**Cadenas de prompts simples por flujo + Haiku donde es suficiente** ✓ ELEGIDO
- Flujo generación: Structurer → Writer × locales → SEO Enhancer → Validator
- Flujo edición portal: Classifier → Extractor → Confirmation → Validator
- Flujo reordenación: Interpreter → Validator → aprobación humana
- Cada prompt hace una sola cosa — output pequeño y validable con Zod
- Haiku para clasificación y extracción, Sonnet para escritura y razonamiento
- Validator siempre sin LLM — Zod puro, determinista y barato

Un solo prompt gigante por tarea:
- Descartado: Claude se pierde en el ruido con prompts complejos,
  output difícil de validar, imposible mejorar en partes,
  costoso porque Sonnet para todo aunque no sea necesario