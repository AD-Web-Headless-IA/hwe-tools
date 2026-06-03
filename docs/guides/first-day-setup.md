# 🚀 Tu primer día

> Sigue estos pasos en orden. Si algo falla, no avances — pide ayuda antes. Al final de esta guía tendrás el proyecto funcionando en tu máquina.

---

## Antes de empezar

Esta guía asume que estás en **Windows** con acceso a internet. Si estás en Mac, los comandos son casi idénticos pero usa Terminal en lugar de PowerShell.

**Tiempo estimado:** 30-45 minutos la primera vez.

---

## Paso 1 — Instalar las herramientas base

### 1a. Node.js

Node.js es el motor que ejecuta JavaScript fuera del browser. Sin él, nada funciona.

1. Ve a **https://nodejs.org**
2. Descarga la versión **LTS** (la que dice "Recommended For Most Users")
3. Ejecuta el instalador → siguiente, siguiente, finalizar
4. Verifica:

```powershell
node --version
# Debe mostrar algo como: v20.18.1 (o superior)
```

---

### 1b. pnpm

pnpm es el gestor de dependencias (como npm, pero más rápido y diseñado para monorepos).

```powershell
# Instalar pnpm globalmente
npm install -g pnpm

# Verificar
pnpm --version
# Debe mostrar: 10.x.x (o superior)
```

> 🔄 **Equivalente WP:** es como Composer (el gestor de PHP) pero para JavaScript. En WordPress raramente lo usabas directamente, pero aquí lo usarás todos los días.

---

### 1c. Git

Git es el sistema de control de versiones. Probablemente ya lo tienes si usabas GitHub Desktop o similar.

```powershell
git --version
# Si aparece "git version X.X.X", ya lo tienes instalado
```

Si no lo tienes:
1. Ve a **https://git-scm.com/downloads**
2. Descarga e instala Git for Windows
3. Durante la instalación, selecciona "Git from the command line and also from 3rd-party software"

---

### 1d. VS Code

El editor de código. Si ya tienes otro (WebStorm, Sublime...) puedes usarlo, pero VS Code tiene las mejores extensiones para este proyecto.

1. Ve a **https://code.visualstudio.com**
2. Descarga e instala

**Extensiones recomendadas** (instálalas desde el panel de extensiones):
- **ESLint** — resalta errores de JavaScript/TypeScript
- **Tailwind CSS IntelliSense** — autocompleta las clases de Tailwind
- **Prettier** — formatea el código automáticamente al guardar
- **GitLens** — mejora la integración con git

---

## Paso 2 — Obtener acceso al repositorio

1. Pide a tu responsable que te dé acceso al repositorio de GitHub del proyecto.
2. Cuando tengas acceso, verás la URL del repo (algo como `https://github.com/septeo-hospitality/hwp-platform`).

**Configura git con tu nombre y email:**

```powershell
git config --global user.name "Tu Nombre"
git config --global user.email "tu.email@septeo.com"
```

---

## Paso 3 — Clonar el repositorio

"Clonar" significa descargar el código a tu máquina por primera vez.

```powershell
# Navega a la carpeta donde quieres el proyecto
# Por ejemplo, si usas Laragon:
cd C:\laragon\www

# Crea la carpeta del proyecto
mkdir "Hospitality Web Platform"
cd "Hospitality Web Platform"

# Descarga el código
git clone https://github.com/septeo-hospitality/hwp-platform.git hwp-platform

# Entra en la carpeta
cd hwp-platform
```

Verás cómo se descargan todos los ficheros. Puede tardar un minuto.

> 🔄 **Equivalente WP:** es como hacer "Exportar" en WP y luego "Importar" en tu Local. Pero en lugar de un XML, descargas el código fuente completo.

---

## Paso 4 — Instalar las dependencias

Las dependencias son las librerías externas que usa el proyecto (React, Next.js, Tailwind...). No vienen en el repositorio — hay que descargarlas por separado.

```powershell
# Asegúrate de estar en la carpeta hwp-platform/
pnpm install
```

Verás cómo se descargan cientos de paquetes. Esto puede tardar 2-5 minutos la primera vez. Cuando termine verás algo como:

```
✓ Packages: 847
✓ Progress: resolved 847, reused 847, downloaded 0, added 847
Done in 45s
```

> 🔄 **Equivalente WP:** es como hacer click en "Activar todos los plugins" justo después de instalar WordPress. El código de los plugins viene de internet, no del repositorio.

---

## Paso 5 — Levantar el proyecto

```powershell
pnpm dev
```

Espera hasta ver:

```
▲ Next.js 14.2.35
  - Local:   http://localhost:3000

✓ Starting...
✓ Ready in 6s
```

Abre tu browser y ve a **http://localhost:3000**.

Si ves una página con colores verdes y un título que dice "HWP token probe", ¡felicidades! El proyecto está funcionando.

> 🔄 **Equivalente WP:** es como hacer click en "Start" en Local y que el site aparezca en el browser.

---

## Paso 6 — Verificar que todo funciona

### Prueba 1: TypeScript no tiene errores

Abre una **segunda terminal** (sin cerrar la del dev server) y ejecuta:

```powershell
pnpm typecheck
```

Si ves `Tasks: 1 successful, X total` sin errores en rojo, todo está bien.

> ⚠️ Es normal que aparezca un error en `@hwp/config` sobre `@hwp/core-ui` — es un stub temporal de la fase de bootstrap. No es un problema tuyo.

### Prueba 2: Los colores se ven correctos

En el browser (http://localhost:3000) deberías ver:
- Una barra de navegación verde oscuro
- Swatches de colores
- Ejemplos de tipografía con Playfair Display y Montserrat

Si los colores se ven bien y las fuentes cargan, el pipeline de tokens funciona correctamente.

---

## Paso 7 — Hacer tu primer cambio

Para confirmar que puedes editar el proyecto, haz un cambio pequeño:

1. Abre `apps/site-demo/src/theme/tokens.json` en VS Code
2. Cambia el valor de `"primary"` a cualquier color hex, por ejemplo `"#2D5A27"` (verde bosque)
3. Guarda el fichero (`Ctrl+S`)
4. Mira el browser — la barra de navegación debería cambiar de color automáticamente

Deshazte del cambio cuando lo hayas probado:

```powershell
git restore apps/site-demo/src/theme/tokens.json
```

---

## Dónde vive cada cosa — la separación clave de DEC-015

Después de la migración DEC-015, el código de bloques está dividido en dos lugares. Es importante entender esta separación desde el primer día:

| Qué | Dónde vive | Quién lo toca |
|---|---|---|
| **Base-blocks** (bloques de referencia de la plataforma) | `packages/core-ui/src/base-blocks/` | Dev de plataforma |
| **Schemas Zod compartidos** | `packages/core-ui/src/schemas/` | Dev de plataforma |
| **Tipos TypeScript compartidos** | `packages/core-ui/src/types/` | Dev de plataforma |
| **Bloques de cliente** (custom o re-exports) | `site-{slug}/src/blocks/` | Dev de cliente |
| **Registry de bloques del cliente** | `site-{slug}/src/blocks/registry.ts` | Dev de cliente |
| **CSS del site** | `site-{slug}/src/app/globals.css` | Dev de cliente |

> **Regla CSS:** hay **un único `globals.css` por cliente** y **cero CSS por bloque**. Nunca se añade CSS dentro de una carpeta de bloque.

### Los tres niveles de uso de un bloque en un cliente

Cuando un cliente necesita un bloque, puede elegir el nivel de personalización:

```
Level 1 — Re-export: usa el base-block tal cual
  src/blocks/HeroBlock/index.ts → re-exporta desde @hwp/core-ui/base-blocks

Level 2 — Slots: rellena zonas predefinidas del base-block
  src/blocks/HeroBlock/index.ts → importa HeroBlock + rellena HeroBlock.slots.ts

Level 3 — Custom: componente nuevo completo (DOM propio)
  src/blocks/HeroBlock/HeroBlock.tsx → componente React desde cero
```

Para desarrolladores de plataforma (que trabajan en `packages/`): añadir funcionalidad en `base-blocks/`.
Para desarrolladores de cliente (que trabajan en `apps/site-{slug}/`): trabajar en `src/blocks/`.

---

## Paso 8 — Leer a continuación

Ahora que el proyecto funciona, lee en este orden:

1. **[🗺️ Mapa del proyecto](./project-map.md)** — entiende dónde vive cada cosa
2. **[🔄 Diccionario WP → HWP](./wordpress-to-hwp.md)** — traduce lo que ya sabes
3. **[🗓️ Tu día a día](./daily-workflow.md)** — el flujo de trabajo diario

Cuando tengas dudas sobre términos técnicos, consulta el **[📖 Glosario](./glossary.md)**.

---

## Si algo va mal

### "command not found: pnpm"
Node.js no está instalado o pnpm no se instaló correctamente. Vuelve al Paso 1.

### "Port 3000 is already in use"
Otro proceso usa el puerto 3000. En PowerShell:
```powershell
netstat -ano | findstr :3000
# Anota el número PID de la línea que dice LISTENING
Stop-Process -Id {ese-PID} -Force
# Vuelve a ejecutar pnpm dev
```

### "Module not found" o errores de TypeScript extraños
Prueba reinstalar las dependencias:
```powershell
# Eliminar la caché y reinstalar
pnpm install --force
```

### No aparece ninguna página en http://localhost:3000
Comprueba la terminal donde ejecutaste `pnpm dev`. Si hay un error en rojo, cópialo y compártelo con el equipo (o pregunta a Claude Code).

### Cualquier otra cosa
Escríbelo en el canal del equipo o pregunta directamente a Claude Code:
```
Tengo este error en el setup inicial: [pega el error]
```

---

## En términos simples

El proceso completo es equivalente a:

1. Instalar Local by Flywheel → **instalar Node + pnpm**
2. Crear un nuevo site en Local → **git clone**
3. Instalar los plugins → **pnpm install**
4. Hacer click en "Start" → **pnpm dev**
5. Abrir el site → **http://localhost:3000**

Misma lógica, herramientas diferentes.
