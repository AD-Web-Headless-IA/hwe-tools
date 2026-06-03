# 🗓️ Tu día a día

> El flujo de trabajo que usarás cada día. Con comandos exactos y comparaciones con lo que ya conoces de WordPress.

---

## Resumen del flujo

```
1. Abrir el proyecto        → abre la carpeta site-{slug}/ en VS Code
2. Levantar el dev server   → npm run dev
3. Hacer cambios            → edita ficheros, el browser se actualiza solo
4. Verificar                → mira el browser, revisa la consola
5. Commit y push            → /commit en Claude Code (o git manual)
```

En WordPress sería: abrir Local → activar el site → editar el theme → F5 → subir por FTP.

---

## 1. 🗂️ Abrir el proyecto

**En WordPress:** abras Local by Flywheel, iniciabas el site, y abrías la carpeta del tema en VS Code.

**En hwe:**

```bash
# Opción A: desde VS Code
# File → Open Folder → C:\laragon\www\Hospitality Web Platform\site-{slug}

# Opción B: desde terminal
cd "C:\laragon\www\Hospitality Web Platform\site-{slug}"
code .
```

> 💡 Abre siempre `site-{slug}/` como la raíz del workspace en VS Code — no la carpeta del cliente ni hwe-core. Así TypeScript y las importaciones funcionan correctamente.

---

## 2. 🚀 Levantar el dev server

**En WordPress:** hacías click en "Start" en Local y ya estaba.

**En hwe:**

```bash
# Desde site-{slug}/ (la raíz del repo de cliente)
npm run dev
```

Verás algo así en la terminal:

```
▲ Next.js 15.x.x
  - Local:   http://localhost:3000

✓ Starting...
✓ Ready in 4s
```

Abre el browser en **http://localhost:3000** y ya tienes el site.

> 🛑 **Si el puerto 3000 está ocupado:** otro proceso lo está usando. En Windows:
> ```powershell
> netstat -ano | findstr :3000
> # Anota el PID que aparece en LISTENING
> Stop-Process -Id {PID} -Force
> ```

---

## 3. ✏️ Hacer cambios y ver el resultado

**En WordPress:** editabas un `.php`, guardabas, apretabas F5 en el browser.

**En hwe:** editas un `.tsx`, `.json` o `.css`, guardas. El browser **se actualiza solo** (Hot Module Replacement). No hay que apretar F5.

### Dónde trabajar según tu rol

| Si eres... | Trabajas en... | Qué tocas |
|---|---|---|
| Dev de cliente | `src/blocks/` | Bloques propios del cliente (Level 1/2/3), registry |
| Dev de cliente (tokens) | `src/theme/tokens.json` | Colores, fuentes, espaciados |
| Dev de cliente (páginas) | `src/app/` | Layout, páginas, `globals.css @theme {}` |
| Dev de plataforma | `hwe-core/packages/core-ui/src/base-blocks/` | Base-blocks, schemas, adapters |

> **Regla CSS:** toda la CSS del cliente va en `src/app/globals.css`. Nunca en ficheros dentro de `src/blocks/`.

### Cambiar colores del cliente (Tailwind v4)

En Tailwind v4 los tokens se definen en `globals.css` con `@theme {}`:

```css
/* src/app/globals.css */
@import "tailwindcss";
@import "@hwe/config/theme.css";

@theme {
  --color-primary: #2D5A27;    ← cambia aquí
  --color-accent: #9FCAD0;
  --font-heading: "Playfair Display", Georgia, serif;
}
```

Guarda → el browser se actualiza en ~1 segundo.

También puedes editar `src/theme/tokens.json` si el preset de `@hwe/config/theme.css` consume ese fichero en tu versión.

### Editar el contenido de una página

```bash
# La página principal
src/app/page.tsx
```

Es JSX (parecido a HTML dentro de JavaScript). Si en WordPress escribías:
```php
<h1><?php echo $title; ?></h1>
```

En JSX escribes:
```tsx
<h1>{title}</h1>
```

### Editar estilos con Tailwind

En lugar de escribir CSS, usas clases de Tailwind directamente en el JSX:

```tsx
// WordPress (style.css + PHP)
<div class="hero-section">   ← clase CSS definida en style.css

// hwe (Tailwind en JSX)
<div className="bg-primary text-on-dark py-[--spacing-section-y]">   ← clases inline
```

Las clases más usadas son las que vienen de los tokens:
- `bg-primary`, `bg-accent`, `bg-surface` — colores de fondo
- `text-foreground`, `text-muted-foreground` — colores de texto
- `font-heading`, `font-body` — tipografías
- `max-w-[--width-container]`, `py-[--spacing-section-y]` — espaciados

---

## 4. 🔍 Verificar que todo está bien

Antes de hacer commit, comprueba tres cosas:

**A) El browser se ve bien** — abre http://localhost:3000 y revisa visualmente.

**B) No hay errores de TypeScript:**
```bash
npm run typecheck
```
Si hay errores, los verás en la terminal con el fichero y la línea exacta.

**C) No hay errores en la terminal del dev server** — mira que no aparezca nada en rojo.

> 💡 En WordPress verificabas que el site no tuviera pantalla blanca. Aquí el equivalente es que `npm run typecheck` salga en verde.

### Antes de desplegar a producción

Hay una verificación adicional obligatoria: el **pre-deploy security checklist** de `docs/specs/security/security-standards.md`. Cubre items bloqueantes que no aparecen en TypeScript:

- `npm audit --audit-level=high` — dependencias sin vulnerabilidades críticas
- Cabeceras HTTP de seguridad (CSP, HSTS, X-Frame-Options...) en `next.config.mjs`
- Cookie consent implementado
- Página de política de privacidad enlazada desde el footer
- Secrets en variables de entorno de Vercel, no en el código

Si tienes dudas, invoca el agente `security-specialist`:

```
Invoca el agente security-specialist para hacer el pre-deploy audit del site.
```

🔄 **WP:** como pasar por la checklist de seguridad de Wordfence antes de publicar el site.

---

## 5. 💾 Hacer commit

**En WordPress:** subías por FTP o hacías click en "Deploy" en tu hosting. No había historial de cambios.

**En hwe:** cada cambio se guarda con git.

### Opción A: con Claude Code (recomendado)

Si tienes Claude Code abierto, escribe en el chat:

```
haz el commit
```

Claude Code analiza los cambios, propone un mensaje de commit descriptivo, y espera tu confirmación antes de ejecutarlo.

### Opción B: manual con la skill `/commit`

En el chat de Claude Code:
```
/commit
```

### Opción C: manual con git

```bash
# Ver qué ficheros han cambiado
git status

# Ver el detalle de los cambios
git diff

# Añadir los ficheros que quieres commitear
git add src/theme/tokens.json

# Crear el commit con un mensaje descriptivo
git commit -m "feat(theme): update Balneario palette — swap accent to terracotta"

# Subir a GitHub (y Vercel lo desplegará automáticamente)
git push
```

### Reglas para el mensaje de commit

```
tipo(scope): descripción corta en inglés

feat      → nueva funcionalidad
fix       → corrección de bug
chore     → cambio menor (actualizar dependencia, etc.)
docs      → solo documentación
refactor  → reorganizar código sin cambiar comportamiento
style     → cambio solo visual/formato
```

Ejemplos:
```
feat(hero): add booking widget slot below headline
fix(tokens): correct border-radius value for cards
docs: update project map for DEC-017
```

> ⚠️ Los commits van **en inglés**. La conversación con Claude Code puede ser en español.

---

## 6. 📦 Actualizar dependencias

### Actualizar `@hwe/core-ui` (nueva release del equipo de plataforma)

```bash
# En el repo de cliente (site-{slug}/)
npm update @hwe/core-ui @hwe/config
npm install
```

Después revisa el changelog de `@hwe/core-ui` — si hay cambios en schemas (breaking), los bloques Level 3 pueden necesitar adaptarse.

### Actualizar hwe-tools (nuevas skills o specs)

```bash
cd .hwe-tools
git pull origin main
cd ..
git add .hwe-tools
git commit -m "chore: update hwe-tools"
```

> 🔄 **Equivalente WP:** como actualizar un plugin o tema padre. Para el core (`@hwe/core-ui`) es `npm update`; para las herramientas (`.hwe-tools`) es `git pull`.

---

## 7. 🤖 Cuándo pedir ayuda a Claude Code

Claude Code es el asistente de IA que vive en la terminal. Úsalo para:

| Situación | Qué escribir |
|---|---|
| No sabes dónde está algo | "¿Dónde está el componente de navegación?" |
| Quieres crear algo nuevo | "Crea un bloque de galería de fotos" |
| Tienes un error que no entiendes | Pega el error y pregunta "¿qué significa esto?" |
| Quieres hacer un commit | "haz el commit" o `/commit` |
| Necesitas saber una decisión técnica | "¿Por qué usamos Tailwind v4 CSS-first?" |

> 💡 Claude Code tiene acceso a toda la documentación a través de `.hwe-tools/docs/`. Si no sabes algo, pregunta antes de buscarlo en Google — probablemente ya esté documentado aquí.

---

## 8. 🎨 Building a block without Figma

When you need to create a block that wasn't in the designer's deliverable:

### Prerequisites

1. Verify `docs/design-language.md` exists in the client repo — it is created automatically by `/import-figma`. If it does not exist, run `/import-figma` first and review the generated draft.
2. Verify at least 2 blocks are already implemented in `src/blocks/`.

### Workflow

```
1. /design-block {BlockName} --client {slug}
      → ux-ui-analyst (Mode B) reads design-language.md + tokens + existing blocks
      → produces docs/block-specs/{BlockName}.visual-spec.md (DRAFT)

2. Review and approve the visual spec
      → confirm it matches the site's visual style
      → edit if needed, remove the DRAFT marker when satisfied

3. /propose {BlockName}
      → planner reads the visual spec as the visual guide
      → normal SPECBOOT continues: /apply → /verify → ux-ui-analyst Mode B re-check
```

### Why this matters

Without a Figma reference, developers tend to improvise spacing, card style, and typography hierarchy. Across 300 clients and dozens of blocks per client, this produces visual inconsistency within a single site. The design language document captures what the designer intended; `/design-block` uses it to keep every new block consistent.

---

## 9. 🤖 Trabajar con agentes

Claude Code puede invocar agentes especializados para tareas concretas.

### Cuándo invocar un agente

| Tarea | Agente a convocar |
|---|---|
| Crear un bloque nuevo — necesitas guía de patrones | `senior-developer` |
| Verificar que el SEO y el HTML semántico son correctos | `seo-geo-specialist` |
| Revisar si hay problemas de seguridad o RGPD | `security-specialist` |
| Comparar el resultado visual con la referencia de Figma | `ux-ui-analyst` |
| Tomar una decisión de arquitectura o crear un DEC | `architect` |
| Actualizar la documentación después de una fase | `docs-writer` |
| Probar el site como lo haría un usuario real | `qa-engineer` |

### Cómo pedírselo a Claude Code

```
Invoca el agente seo-geo-specialist para auditar el bloque HeroBlock que acabamos de implementar.
```

> 📖 Lista completa de agentes: `docs/specs/ai/agent-directory.md`
> 👥 Equipos predefinidos por tipo de tarea: `docs/specs/ai/agent-teams-playbook.md`

---

## Flujo completo de un día típico

```
☀️  Mañana
    cd site-{slug}/
    git pull                                  ← traer cambios del equipo
    git submodule update --recursive          ← actualizar .hwe-tools si cambió
    npm install                               ← si hay nuevas dependencias
    npm run dev                               ← levantar el servidor

✏️  Durante el día
    Editar ficheros → guardar → ver en browser
    Si hay duda → preguntar a Claude Code

🌙  Al final del día
    npm run typecheck                         ← verificar que no hay errores
    git status                                ← ver qué cambié
    /commit en Claude Code                    ← hacer commit con ayuda
    git push                                  ← subir al repositorio
```

---

## En términos simples

| En WordPress... | En hwe... |
|---|---|
| Local / MAMP corriendo | `npm run dev` corriendo |
| F5 en el browser | Auto-recarga (HMR) |
| Editar `style.css` | Editar `globals.css @theme {}` |
| Editar `template.php` | Editar `page.tsx` |
| Upload por FTP | `git push` |
| Plugins actualizados en wp-admin | `npm update @hwe/core-ui` |
| Actualizar tema padre | `cd .hwe-tools && git pull` |
| Pantalla blanca = error | Error rojo en terminal |
