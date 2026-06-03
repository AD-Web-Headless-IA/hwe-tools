# HWP — Technical Roadmap

> Estado actual del proyecto, gaps identificados, y plan técnico alineado con el roadmap de negocio.
> Actualizado: 2026-05-28.
> Este documento es para el equipo técnico y para Claude Code. Vive en `docs/plans/technical-roadmap.md`.
> Referencia de negocio: `hwp-roadmap.html` (documento de presentación para CEO/CTO).

---

## Timeline del proyecto

```
Mayo (S1-S3)     Junio (S4-S6)       Junio-Julio (S7-S8)    Julio (S9-S10)     Post-demo
─────────────    ─────────────────    ────────────────────    ──────────────     ──────────
Fase 0           Fase 1              Fase 2                  Fase 3             V1 + V2
Skeleton ✅      Bloques completos   Sitio completo          QA & Demo          Onboarding + IA
                 + i18n + Payload    + Booking real           SEO/GEO/Security   Experience
                                     + Contenido real
```

**Demo previsto:** Julio 2026
**Tiempo restante:** ~7 semanas
**Semanas trabajadas:** 3

---

## Fase 0 — Walking Skeleton (S1-S3) — ESTADO REAL

### ✅ Completado

| Componente | Detalles |
|---|---|
| Monorepo Turborepo + pnpm | Configurado y compilable |
| @hwp/config | createHwpPreset(tokens) → Tailwind preset |
| @hwp/core-ui | 6 bloques con tests (49 verdes) |
| BlockRenderer + blockRegistry | Funcional |
| Layout (Navbar, Footer, SiteShell) | Responsive, mobile toggle |
| Token pipeline | tokens.json → Zod → preset → CSS |
| 3 páginas site-demo | Home, Le Camping, Politique de confidentialité |
| SEO completo | JSON-LD, meta tags, OG, sitemap, semantic HTML, GEO |
| Security base | Headers HTTP, RGPD page, input handling |
| 11 agentes | SPECBOOT + 7 domain specialists |
| 11 skills ejecutables | /seo-audit, /security-audit, /create-page, /add-block, etc. |
| Specs completos | Coding standards, security standards, 5 SEO specs + 11 schemas |
| Documentación equipo | 5 guides WordPress→HWP, glossary |
| Auditorías automáticas | SEO 🟢 Green, Security 🟡 Yellow |

### ❌ Gaps — el roadmap de negocio dice que Fase 0 incluye esto pero NO está hecho

| Gap | Impacto | Prioridad de cierre |
|---|---|---|
| **Payload CMS conectado** | Sin Payload no hay CMS editable — es prerequisito de Fase 2 | Cerrar en Fase 1 (S4) |
| **CI/CD operativo** | Sin CI/CD no hay deploy automático a Vercel | Cerrar en Fase 1 (S5) |
| **Deploy en Vercel staging** | El site solo vive en localhost | Cerrar en Fase 1 (S5) |

---

## Fase 1 — Sistema de bloques completo (S4-S6) — EMPIEZA AHORA

### Semana 4 — Bloques + Payload bootstrap

**Bloques nuevos a crear:**

| Bloque | Referencia | Structural variants | Prioridad |
|---|---|---|---|
| GalleryBlock | GallerySection.tsx (Figma) | grid / masonry / lightbox | Alta |
| RatesBlock | Tabla de tarifas por temporada | — | Alta |
| OffersBlock | Listado de promociones | — | Alta |
| ContactBlock | Formulario + mapa | — | Alta |
| RichTextBlock | Páginas legales (aviso legal, cookies) | — | Alta |
| ActivityBlock | Cards de actividades/animaciones | — | Media |
| MapBlock | Google Maps interactivo | — | Media |
| FAQBlock | Preguntas frecuentes (conecta con FAQPage schema) | — | Media |
| CTABannerBlock | Banner full-width con CTA | — | Media |
| QuickBookingBlock | Widget de reserva simplificado inline | — | Media |
| AvailabilityCalendarBlock | Calendario visual de disponibilidad | — | Baja |
| PriceTableBlock | Tabla de precios por temporada | — | Baja |

Todos son bloques de `@hwp/core-ui` con el patrón estándar (schema Zod, variants, tests, SEO rules). Los widgets de reserva usan BookingAdapter para la conexión al PMS.

**Cómo:** `/scaffold-block` + seguir `docs/skills/frontend/block-creation.md`. TDD obligatorio. `/seo-audit` después de cada bloque.

**Payload CMS bootstrap:**
1. Crear `docs/specs/cms/payload-standards.md`
2. Definir collections map (bloque → collection)
3. Instalar Payload v3 en el monorepo
4. Crear collections básicas derivadas de los Zod schemas
5. Conectar site-demo a Payload (reemplazar fake-content.ts)

### Semana 5 — i18n + Integraciones + CI/CD

**Multilingüe:**
1. Crear `docs/specs/i18n/i18n-standards.md`
2. Instalar y configurar next-intl
3. Estructura de mensajes por idioma
4. hreflang en todas las páginas
5. Selector de idioma en Navbar
6. Crear agente `i18n-specialist` cuando sea necesario

**Integraciones V1:**

| Integración | Qué hacer | Complejidad |
|---|---|---|
| Chatbot Ideta | Insertar script en layout.tsx | Baja — solo un `<script>` |
| Google Maps | MapBlock con API key en env vars | Media |
| GTM | Script GTM en layout.tsx + consent gate | Media |
| Cookie consent RGPD | Banner de consentimiento (pre-GTM) | Media |

**CI/CD:**
1. GitHub Actions: test + typecheck + build en cada PR
2. Vercel Git integration: preview per PR, prod on merge
3. Deploy site-demo a Vercel staging con URL pública

### Semana 6 — Polish bloques + tokens del cliente demo

- Todos los bloques validados contra Figma del cliente demo (ux-ui-analyst)
- Tokens de diseño del cliente demo extraídos e integrados
- `/seo-audit` verde en todos los bloques
- `/security-audit` verde

**Entregables Fase 1:**
- ≥12 bloques en @hwp/core-ui
- Multilingüe funcionando
- Payload CMS conectado
- Integraciones Ideta + Maps + GTM + Cookie consent
- CI/CD + deploy Vercel staging
- Tokens del cliente demo

---

## Fase 2 — Sitio completo (S7-S8)

### Semana 7 — Todas las páginas + Booking real

**Páginas del sitemap estándar:**

| Sección | Página | Bloques principales |
|---|---|---|
| Principal | Home | Hero, Booking, MediaText, Reviews, Amenities |
| El establecimiento | Sobre nosotros | MediaText, Amenities, Gallery |
| Alojamientos | Índice | AccommodationGrid, Booking |
| Alojamientos | Detalle por tipo | Template nuevo: AccommodationDetail |
| Actividades | Índice | ActivityBlock, Gallery |
| Actividades | Detalle | MediaText, Gallery |
| Galería | Galería fotográfica | GalleryBlock (full page) |
| Tarifas | Tabla de precios | RatesBlock |
| Ofertas | Promociones activas | OffersBlock |
| Contacto | Formulario + mapa | ContactBlock, MapBlock |
| Legal | Aviso legal, privacidad, cookies | RichTextBlock |

**Cómo:** `/create-page` + `/add-block` para cada página.

**Booking real:**
1. Crear `@hwp/booking` package
2. Implementar BookingAdapter interface
3. Implementar primer adapter (PMS del cliente demo)
4. Crear BookingProvider + useBookingAdapter() (DEC-010)
5. Conectar BookingBlock + QuickBookingBlock al adapter real
6. Widget de disponibilidad funcionando con datos reales

### Semana 8 — Contenido real + responsive + idiomas

- Contenido real del camping cargado en Payload por equipo de agencia
- Todas las páginas en los idiomas configurados del cliente
- Responsive validado: mobile (375px), tablet (768px), desktop (1440px)
- GTM + consent RGPD operativos con datos reales
- QA Engineer: primera pasada funcional

**Entregables Fase 2:**
- Todas las páginas del sitemap completas
- Booking conectado a PMS real
- Contenido real en Payload
- Multilingüe en todas las páginas
- Responsive validado
- GTM + consent operativos

---

## Fase 3 — QA & Demo (S9-S10)

### Semana 9 — Auditoría completa

- `/seo-audit` en todas las páginas y todos los idiomas → verde
- `/security-audit` completo → verde
- Lighthouse score ≥ 85 en mobile
- Core Web Vitals en verde (LCP, CLS, INP)
- Tests E2E con Playwright para flujos críticos (home → alojamiento → booking)
- Auditoría de accesibilidad (crear `/a11y-audit` si necesario)
- GEO: verificar citabilidad en ChatGPT, Perplexity

### Semana 10 — Polish + presentación

- Corrección de bugs finales
- Documentación de onboarding actualizada
- Pipeline de onboarding documentado (Figma → tokens → composiciones → Payload → deploy)
- Presentación ejecutiva preparada
- Demo ante CEO y CTO

**Criterios de éxito del demo** (del roadmap de negocio):
- [ ] Home completa con todos los bloques
- [ ] Alojamientos: índice + tipos con detalle
- [ ] Actividades: índice + al menos un detalle
- [ ] Galería fotográfica operativa
- [ ] Tarifas por temporada
- [ ] Ofertas activas
- [ ] Contacto con formulario y mapa
- [ ] Aviso legal, privacidad y cookies
- [ ] Contenido real (sin lorem ipsum)
- [ ] Multilingüe con selector funcional
- [ ] Widget de disponibilidad conectado a PMS real
- [ ] Payload CMS editable por la agencia
- [ ] Chatbot Ideta operativo
- [ ] Deploy en Vercel staging (URL pública)
- [ ] Responsive: mobile + tablet + desktop
- [ ] GTM operativo (GA4 configurado)
- [ ] Banner de cookies RGPD funcional
- [ ] Lighthouse ≥ 85 mobile
- [ ] Core Web Vitals verde
- [ ] Meta tags + OG en todos los idiomas
- [ ] Structured data hospitality
- [ ] Sitemap XML + robots.txt
- [ ] Headings correctos + alt texts
- [ ] GEO: contenido optimizado para IA search
- [ ] Headers HTTP de seguridad
- [ ] Credenciales en env vars
- [ ] RGPD: consentimiento explícito previo a Analytics

---

## Post-Demo — V1 Onboarding

El pipeline documentado durante el demo permite incorporar clientes reales:

```
/import-figma → extracción tokens → /create-page + /add-block → Payload content → Vercel deploy
```

Tareas técnicas para V1:
1. Configurar GitHub Packages (npm registry privado)
2. Publicar @hwp/core-ui, @hwp/config, @hwp/booking como packages
3. Crear site-template/ repo para bootstrapear nuevos clientes
4. Definir workflow de version bump (Changesets)
5. Skill `/new-client-setup` completo
6. Cada nuevo cliente sigue el pipeline documentado
7. Incorporar developers del equipo WordPress (con las guides que ya existen)

---

## Post-Demo — V2 IA Experience (~4 semanas tras demo)

Una página `/experience` generada dinámicamente por IA según el perfil del visitante y la época del año. El sitio estático principal NO se toca — SEO y GEO quedan intactos.

### Arquitectura

- `/experience` es una ruta dinámica con `noindex` — los buscadores nunca la ven
- El sitio estático principal mantiene todo su valor SEO/GEO
- La IA selecciona alojamientos, actividades, imágenes y paleta según perfil + temporada
- Datos reales de Payload — no inventados

### Fases V2

| Semana | Entregable |
|---|---|
| 1-2 | Chat de entrada + API IA (Anthropic/OpenAI) + detección de perfil y contexto temporal |
| 3 | Página /experience generada dinámicamente con bloques existentes de @hwp/core-ui |
| 4 | QA + configuraciones estándar por tipo de cliente + integración con booking |

### Lo que necesita del proyecto

1. Crear `docs/specs/ai/ia-experience-standards.md` — reglas de la página dinámica
2. Crear `docs/plans/v2-ia-experience.md` — plan técnico detallado
3. API Route Handler para Claude/OpenAI API (DEC-007: credenciales en env vars)
4. Composición dinámica que usa BlockRenderer con layout[] generado por IA
5. Tokens de estética adaptativa (paleta por temporada, DEC-005)
6. Guardrails: la IA propone, la app decide (per security-standards §Prompt injection)
7. `noindex` meta tag en /experience

### Specs y agentes a crear para V2

- `docs/specs/ai/ia-experience-standards.md`
- Agente `ai-experience-specialist` (o extender senior-developer)
- Skills de testing para contenido dinámico

---

## Bloques existentes vs necesarios

| Bloque | Existe | Fase |
|---|---|---|
| HeroBlock | ✅ | 0 |
| BookingBlock (inline/sticky) | ✅ | 0 |
| MediaTextBlock (imageLeft/imageRight) | ✅ | 0 |
| AccommodationGridBlock | ✅ | 0 |
| AmenitiesBlock | ✅ | 0 |
| ReviewsBlock | ✅ | 0 |
| GalleryBlock (grid/masonry/lightbox) | ❌ | 1 |
| RatesBlock | ❌ | 1 |
| OffersBlock | ❌ | 1 |
| ContactBlock | ❌ | 1 |
| RichTextBlock | ❌ | 1 |
| ActivityBlock | ❌ | 1 |
| MapBlock | ❌ | 1 |
| FAQBlock | ❌ | 1 |
| CTABannerBlock | ❌ | 1 |
| QuickBookingBlock | ❌ | 1 |
| AvailabilityCalendarBlock | ❌ | 1-2 |
| PriceTableBlock | ❌ | 1-2 |
| AccommodationDetailTemplate | ❌ | 2 |
| ActivityDetailTemplate | ❌ | 2 |

---

## Auditorías automáticas — roadmap

| Auditoría | Skill | Estado | Fase target |
|---|---|---|---|
| SEO | `/seo-audit` | ✅ Operativo, 🟢 Green | 0 ✅ |
| Security | `/security-audit` | ✅ Operativo, 🟡 Yellow | 0 ✅ |
| Accessibility | `/a11y-audit` | ❌ No creado | 3 |
| Performance | `/perf-audit` | ❌ No creado | 3 |
| QA E2E | Playwright | ❌ No creado | 3 |

---

## Agentes — roadmap de expansión

| Agente | Existe | Trigger de creación |
|---|---|---|
| 4 SPECBOOT + 7 specialists | ✅ | — |
| i18n-specialist | ❌ | Cuando se active multilingüe (Fase 1 S5) |
| cms-specialist | ❌ | Cuando se integre Payload (Fase 1 S4) |
| performance-specialist | ❌ | Cuando haya datos reales de CWV (Fase 3) |
| accessibility-specialist | ❌ | Cuando se prepare primer deploy público (Fase 3) |
| frontend-developer | ❌ | Cuando haya 2+ sites (V1 post-demo) |

---

## Riesgos técnicos

| Riesgo | Impacto | Probabilidad | Mitigación |
|---|---|---|---|
| Payload CMS no iniciado | Bloquea Fase 2 completa | Alta | Empezar bootstrap en S4 día 1 |
| i18n complejo | Retrasa Fase 1 | Media | Empezar con 2 idiomas, no más |
| Integración PMS desconocida | Booking widget no funciona en demo | Media | Empezar con PMS mejor documentado. Mock como fallback |
| Único developer frontend activo | Baja prolongada bloquea todo | Alta | Documentación exhaustiva. Agentes IA como segundo par de manos |
| Scope creep antes del demo | Se meten features V2 que retrasan | Media | Tabla V1/V2 del roadmap es el acuerdo de alcance |

---

## In simple terms

**Lo que tenemos:** La base de la casa (cimientos, estructura, 6 paredes tipo). Un modelo de casa terminado con 3 habitaciones amuebladas, electricidad SEO y fontanería de seguridad.

**Lo que falta para el demo (7 semanas):**
1. Más tipos de paredes (más bloques) — Fase 1
2. Conectar el agua corriente (Payload CMS) — Fase 1
3. Amueblar todas las habitaciones (todas las páginas) — Fase 2
4. Conectar el teléfono (booking real con PMS) — Fase 2
5. Inspección final (QA, SEO, security, performance) — Fase 3
6. Puertas abiertas para el jefe (demo) — Fase 3

**Después del demo:**
- V1: Construir casas para clientes reales usando el mismo plano
- V2: Añadir domótica inteligente (IA Experience — la casa se adapta a quien entra)

🔄 **En WordPress:** Tenemos el theme base con 6 bloques Gutenberg, SEO plugin configurado, y security hardened. Falta: más bloques, conectar el CMS, multiidioma, booking real, y preparar todo para la demo ante dirección.