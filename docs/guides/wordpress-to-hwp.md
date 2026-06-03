# 🔄 Diccionario WordPress → HWP

> Si vienes de WordPress, ya sabes más de lo que crees. Este diccionario traduce cada concepto que ya conoces al equivalente en HWP.

---

## La tabla de traducción

| En WordPress... | En HWP es... |
|---|---|
| **Tema** (Twenty-Twenty-Four, Divi...) | `site-{cliente}/` + `src/theme/tokens.json` |
| **Tema padre** | `@hwp/core-ui` (en `hwp-core/packages/core-ui/`) |
| **Tema hijo** | `site-{cliente}/src/compositions/` |
| **Template parts** (`header.php`, `footer.php`) | `SiteShell`, `Navbar`, `Footer` en `@hwp/core-ui` |
| **Bloques Gutenberg (tema padre)** | Base-blocks en `hwp-core/packages/core-ui/src/base-blocks/` |
| **Bloques Gutenberg (tema hijo)** | Client blocks en `site-{slug}/src/blocks/` |
| **`register_block_type()` en tema hijo** | `site-{slug}/src/blocks/registry.ts` |
| **`functions.php`** | `src/app/globals.css @theme {}` + `client.config.ts` |
| **`style.css`** | `tokens.json` → Tailwind preset → clases CSS |
| **`wp-content/uploads/`** | CDN / Payload Media Storage |
| **wp-admin** | Payload CMS |
| **Plugins** | Packages en `hwp-core/packages/` (`@hwp/core-ui`, `@hwp/config`) |
| **ACF fields** | Zod schemas en cada bloque |
| **Local by Flywheel / MAMP** | `pnpm dev` → `localhost:3000` |
| **FTP deploy / WP Engine push** | `git push` → Vercel auto-deploy |
| **`get_template_part()`** | `import { HeroBlock } from '@hwp/core-ui'` |
| **`wp_enqueue_style()`** | Tailwind JIT (se auto-genera en build) |
| **Page builder** (Elementor, Divi) | Payload CMS layout builder |
| **`.pot` / `.po` files** (i18n) | `next-intl` / `i18next` (pendiente) |
| **`register_block_type()` (platform)** | `baseBlockRegistry` en `@hwp/core-ui/renderer/` |
| **`the_content()`** | `<BlockRenderer blocks={page.layout} />` |

---

## Explicaciones por fila

### 🎨 Tema → `site-{cliente}/` + `tokens.json` + `globals.css @theme {}`

En WordPress, el tema controla el aspecto visual de un site: colores, fuentes, layout. Aquí eso se divide en dos:

- **`src/theme/tokens.json`** — los valores de diseño (colores, fuentes, espaciados) en formato JSON validado.
- **`src/app/globals.css @theme {}`** — las CSS custom properties que Tailwind v4 lee. Es aquí donde los tokens se aplican al site.
- **`site-{cliente}/`** — el repo independiente del cliente, que usa esos tokens.

Un dev no toca el código de "cómo se ve un botón" — eso está en `@hwp/core-ui`. Solo cambia los *valores* en `tokens.json` y `globals.css @theme {}`.

---

### 🧱 Tema padre → `@hwp/core-ui` (en `hwp-core/`)

El tema padre de WordPress define los bloques, estilos y funciones comunes. Aquí ese rol lo juega `@hwp/core-ui`: contiene todos los bloques React (Hero, Booking, Gallery...) que todos los clientes comparten. Vive en `hwp-core/packages/core-ui/` y se consume como package npm en cada repo de cliente.

Si modificas `@hwp/core-ui`, el cambio llega a **todos los clientes** al mismo tiempo. Igual que cuando actualizas un tema padre y todos los hijos lo heredan.

---

### 👶 Tema hijo → Compositions en `site-{cliente}/`

El tema hijo personalizaba el tema padre para un cliente concreto. Aquí eso se hace con **compositions**: componentes React en `site-{cliente}/src/compositions/` que ensamblan y configuran los bloques de `@hwp/core-ui` con el toque específico del cliente. Cada cliente tiene su propio repo independiente.

---

### 🏗️ Template parts → `SiteShell`, `Navbar`, `Footer`

El `header.php` y `footer.php` de WordPress son los componentes estructurales que aparecen en todas las páginas. Aquí son componentes React en `@hwp/core-ui`: `SiteShell` (el wrapper), `SiteNavigation` (la barra de navegación), `SiteFooter` (el pie).

El `layout.tsx` de cada site los monta, igual que `header.php` y `footer.php` se incluyen en `page.php`.

---

### 🧩 Bloques Gutenberg → Base-blocks + Client blocks

Los bloques Gutenberg son componentes reutilizables. Aquí es lo mismo pero en React, con una distinción importante:

**Base-blocks** (`hwp-core/packages/core-ui/src/base-blocks/`) son como el tema padre — los mantiene el equipo de plataforma y todos los clientes los heredan. No se editan directamente para un cliente concreto.

**Client blocks** (`site-{slug}/src/blocks/`) son como los bloques del tema hijo — cada cliente puede tener los suyos. Existen tres niveles de personalización:

| Level | Qué haces | Ejemplo |
|---|---|---|
| **Level 1** | Usas el base-block tal cual (re-export) | `export { HeroBlock } from '@hwp/core-ui/base-blocks'` |
| **Level 2** | Rellenas slots del base-block (extensión) | Añades un badge de temporada en el Hero sin cambiar su DOM |
| **Level 3** | Creas un componente desde cero (DOM propio) | Un HeroBlock con carrusel de vídeo completamente distinto |

Esta separación es el punto clave de DEC-015: los base-blocks son como un **starter theme** que personalizas, no como un plugin compartido que no puedes tocar. Los clientes tienen agencia real para adaptar los bloques a sus necesidades.

La diferencia clave vs WordPress: todos los bloques HWP son **tipados** con TypeScript y **validados** con Zod. Los schemas se comparten via `@hwp/core-ui/schemas` para que cliente y plataforma siempre hablen el mismo idioma.

---

### ⚙️ `functions.php` → `globals.css @theme {}` + `client.config.ts`

El `functions.php` registraba estilos, scripts, bloques y opciones del tema. Aquí eso se divide:

- **`src/app/globals.css @theme {}`** — define los tokens del cliente (Tailwind v4 CSS-first). Sobreescribe los tokens base de `@hwp/config/theme.css` con los valores específicos del cliente.
- **`client.config.ts`** — configura las opciones del cliente: adaptadores, blockDefaults, features, tenantId.

---

### 🎨 `style.css` → `tokens.json` + `@theme {}` (Tailwind v4)

En WordPress, el `style.css` define variables CSS con los colores y fuentes del tema. Aquí el flujo es:

```
Figma (diseñador) → /import-figma → tokens.json (DRAFT) → globals.css @theme {} → CSS custom properties → clases Tailwind
```

El resultado es el mismo (clases CSS con los colores correctos), pero el proceso es más robusto: los tokens se validan con `TokensContract` antes de llegar al build.

---

### 📤 FTP deploy → `git push` → Vercel

Nada de FTP, SFTP, ni subir ficheros a mano. El flujo es:

```
git add → git commit → git push → Vercel detecta el push → deploy automático en ~2 min
```

Vercel es el hosting (equivalente a WP Engine o Kinsta, pero más moderno). Cada `git push` a `main` despliega automáticamente en producción.

---

### 📋 ACF fields → Zod schemas

Los campos de ACF (Advanced Custom Fields) definen qué datos puede tener un componente. Aquí cada bloque tiene un **Zod schema** que hace exactamente lo mismo: define los campos que el CMS puede configurar para ese bloque.

La ventaja: si alguien configura mal un bloque en el CMS (un texto donde debería ir un número, por ejemplo), el error aparece antes de que llegue al usuario.

---

### 🔌 Plugins → Packages en `hwp-core/packages/`

Los plugins de WordPress añaden funcionalidad al site. Aquí los packages de `hwp-core/packages/` hacen lo mismo: `@hwp/core-ui` añade los bloques, schemas, adapters (booking, map, reviews) y el renderer; `@hwp/config` añade la configuración base de Tailwind.

> No existe `@hwp/booking` como package separado — los adapters de booking viven dentro de `@hwp/core-ui/src/adapters/booking/` (DEC-017).

---

## En términos simples

Si en WordPress tenías:
```
tema-padre/     ← bloques y estilos base
tema-hijo/      ← personalizaciones del cliente
plugins/        ← funcionalidades extra
wp-admin/       ← interfaz de edición de contenido
```

En HWP tienes:
```
hwp-core/packages/core-ui/src/base-blocks/  ← bloques base de referencia (= tema padre)
hwp-core/packages/core-ui/src/schemas/      ← schemas Zod compartidos
hwp-core/packages/core-ui/src/adapters/     ← adapters: booking, map, reviews (= plugins)
site-{cliente}/src/blocks/                  ← bloques propios del cliente (= tema hijo)
site-{cliente}/src/blocks/registry.ts       ← registro de bloques del cliente
site-{cliente}/src/app/globals.css @theme{} ← tokens del cliente (= style.css del tema hijo)
Payload CMS                                 ← interfaz de edición de contenido (= wp-admin)
```

Cada cliente vive en su propio repo independiente (`site-{slug}/`). `hwp-core/apps/site-demo/` es el modelo de referencia del equipo de plataforma. `hwp-tools/` provee las herramientas (skills, agentes, docs) via submódulo `.hwp-tools/`.

La lógica es la misma. La tecnología es diferente, pero el mental model es el mismo.
