# 🚀 Tu primer día

> Sigue estos pasos en orden. Si algo falla, no avances — pide ayuda antes. Al final de esta guía tendrás el proyecto funcionando en tu máquina.

---

## Antes de empezar

Esta guía asume que estás en **Windows** con acceso a internet. Si estás en Mac, los comandos son casi idénticos pero usa Terminal en lugar de PowerShell.

**Tiempo estimado:** 30-45 minutos la primera vez.

**¿Qué rol tienes?** Hay dos perfiles:
- **Dev de cliente** — trabajas en `site-{slug}/`, el repo del cliente. Usas `npm`. Este es el caso más común.
- **Dev de plataforma** — trabajas en `hwe-core/`, los paquetes compartidos. Usas `pnpm`.

Sigue los pasos de tu perfil en el Paso 3.

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
# Debe mostrar algo como: v22.x.x (o superior a v20)
```

---

### 1b. Git

Git es el sistema de control de versiones.

```powershell
git --version
# Si aparece "git version X.X.X", ya lo tienes instalado
```

Si no lo tienes:
1. Ve a **https://git-scm.com/downloads**
2. Descarga e instala Git for Windows
3. Durante la instalación, selecciona "Git from the command line and also from 3rd-party software"

---

### 1c. VS Code

El editor de código.

1. Ve a **https://code.visualstudio.com**
2. Descarga e instala

**Extensiones recomendadas** (instálalas desde el panel de extensiones):
- **ESLint** — resalta errores de JavaScript/TypeScript
- **Tailwind CSS IntelliSense** — autocompleta las clases de Tailwind
- **Prettier** — formatea el código automáticamente al guardar
- **GitLens** — mejora la integración con git

---

### 1d. pnpm (solo para devs de plataforma)

pnpm es el gestor de dependencias de `hwe-core/`. Los devs de cliente usan npm, que ya viene con Node.js.

```powershell
# Solo instalar si trabajarás en hwe-core/
npm install -g pnpm
pnpm --version
# Debe mostrar: 10.x.x (o superior)
```

---

## Paso 2 — Obtener acceso al repositorio

1. Pide a tu responsable que te dé acceso a GitHub.
2. Configura git con tu nombre y email:

```powershell
git config --global user.name "Tu Nombre"
git config --global user.email "tu.email@septeo.com"
```

---

## Paso 3 — Clonar el proyecto

"Clonar" significa descargar el código a tu máquina por primera vez.

```powershell
# Navega a la carpeta donde quieras tener el workspace (el nombre es libre)
cd <tu-directorio-de-trabajo>
mkdir hwe-workspace   # o el nombre que prefieras
cd hwe-workspace
```

### Si eres dev de cliente (`site-{slug}/`)

Los repos de cliente incluyen `hwe-tools` como submódulo. Usa `--recurse-submodules` para clonarlo todo de una vez:

```powershell
# Reemplaza {slug} con el nombre del cliente (ej: camping-sol, hotel-balneario)
git clone --recurse-submodules https://github.com/septeo-hospitality/site-{slug}.git site-{slug}
cd site-{slug}
```

Verás que se descarga el repo principal y después el submódulo `.hwe-tools/`.

> 🔄 **Equivalente WP:** es como hacer "Exportar" en WP e "Importar" en tu Local, pero para el código fuente.

### Si eres dev de plataforma (`hwe-core/`)

```powershell
git clone https://github.com/septeo-hospitality/hwe-core.git hwe-core
cd hwe-core
```

---

## Paso 4 — Instalar las dependencias

### Dev de cliente

```powershell
# Desde site-{slug}/
npm install
```

Esto descarga `@hwe/core-ui`, `@hwe/config`, `next`, `react` y el resto desde el registro npm privado.

> ⚠️ Si `npm install` falla con "404 @hwe/core-ui", necesitas configurar el acceso al registro privado. Pide al responsable las credenciales de GitHub Packages.

### Dev de plataforma

```powershell
# Desde hwe-core/
pnpm install
```

Verás cómo se descargan cientos de paquetes. Cuando termine:
```
✓ Packages: 847 — Done in 45s
```

> 🔄 **Equivalente WP:** es como hacer click en "Activar todos los plugins" justo después de instalar WordPress.

---

## Paso 5 — Levantar el proyecto

### Dev de cliente

```powershell
# Desde site-{slug}/
npm run dev
```

Espera hasta ver:
```
▲ Next.js 15.x.x
  - Local:   http://localhost:3000
✓ Ready in 4s
```

Abre tu browser en **http://localhost:3000**.

### Dev de plataforma

```powershell
# Desde hwe-core/ — levanta apps/site-demo/
pnpm dev
```

> 🔄 **Equivalente WP:** es como hacer click en "Start" en Local y que el site aparezca en el browser.

---

## Paso 6 — Verificar que todo funciona

### Prueba 1: TypeScript no tiene errores

Abre una **segunda terminal** (sin cerrar la del dev server):

```powershell
# Dev de cliente
npm run typecheck

# Dev de plataforma
pnpm typecheck
```

Si ves `Tasks: X successful` sin errores en rojo, todo está bien.

### Prueba 2: Los colores se ven correctos

En el browser deberías ver los colores del cliente y las fuentes correctas cargadas.

---

## Paso 7 — Hacer tu primer cambio

Para confirmar que puedes editar el proyecto, haz un cambio pequeño:

1. Abre `src/theme/tokens.json` en VS Code
2. Cambia el valor de `primary` a cualquier color hex, por ejemplo `"#2D5A27"` (verde bosque)
3. Guarda el fichero (`Ctrl+S`)
4. Mira el browser — el color principal debería cambiar automáticamente

Deshazte del cambio:

```powershell
git restore src/theme/tokens.json
```

---

## Dónde vive cada cosa — la separación clave (DEC-015 + DEC-017)

El código está dividido entre dos repos. Es importante entender esta separación desde el primer día:

| Qué | Dónde vive | Quién lo toca |
|---|---|---|
| **Base-blocks** (bloques de referencia) | `hwe-core/packages/core-ui/src/base-blocks/` | Dev de plataforma |
| **Schemas Zod compartidos** | `hwe-core/packages/core-ui/src/schemas/` | Dev de plataforma |
| **Adapters** (booking, map, reviews) | `hwe-core/packages/core-ui/src/adapters/` | Dev de plataforma |
| **Bloques del cliente** | `src/blocks/` | Dev de cliente |
| **Registry del cliente** | `src/blocks/registry.ts` | Dev de cliente |
| **Tokens del cliente** | `src/theme/tokens.json` | Dev de cliente + diseñador |
| **CSS del site** | `src/app/globals.css` | Dev de cliente |

> **Regla CSS:** hay **un único `globals.css` por cliente** y **cero CSS por bloque**. Nunca se añade CSS dentro de una carpeta de bloque.

### Los tres niveles de uso de un bloque en un cliente

```
Level 1 — Re-export: usa el base-block tal cual
  src/blocks/HeroBlock/HeroBlock.tsx
  → export { HeroBlock } from '@hwe/core-ui/base-blocks'

Level 2 — Slots: rellena zonas predefinidas del base-block
  src/blocks/HeroBlock/HeroBlock.tsx
  → <BaseHeroBlock {...props} CtaSlot={MyBookingCta} />

Level 3 — Custom: componente nuevo completo (DOM propio)
  src/blocks/HeroBlock/HeroBlock.tsx
  → JSX propio, solo importa tipos de @hwe/core-ui/schemas
```

---

## Paso 8 — Actualizar el submódulo hwe-tools

Si ves mensajes de que `.hwe-tools` está desactualizado:

```powershell
cd .hwe-tools
git pull origin main
cd ..
git add .hwe-tools
git commit -m "chore: update hwe-tools"
```

---

## Paso 9 — Leer a continuación

Ahora que el proyecto funciona, lee en este orden:

1. **[🗺️ Mapa del proyecto](./project-map.md)** — entiende dónde vive cada cosa
2. **[🔄 Diccionario WP → hwe](./wordpress-to-hwe.md)** — traduce lo que ya sabes
3. **[🗓️ Tu día a día](./daily-workflow.md)** — el flujo de trabajo diario

Cuando tengas dudas sobre términos técnicos, consulta el **[📖 Glosario](./glossary.md)**.

---

## Si algo va mal

### "404 @hwe/core-ui" o "registry not found"

Necesitas acceso al registro npm privado (GitHub Packages). Pide las credenciales a tu responsable.

### "command not found: npm" o "node: No such file"

Node.js no está instalado. Vuelve al Paso 1a.

### "Port 3000 is already in use"

```powershell
netstat -ano | findstr :3000
# Anota el PID de la línea que dice LISTENING
Stop-Process -Id {ese-PID} -Force
# Vuelve a ejecutar npm run dev
```

### "Submodule '.hwe-tools' not initialized"

```powershell
git submodule update --init --recursive
```

### "Module not found" o errores de TypeScript extraños

```powershell
# Eliminar la caché y reinstalar
npm install --force  # o pnpm install --force en hwe-core
```

### Cualquier otra cosa

Pregunta directamente a Claude Code:
```
Tengo este error en el setup inicial: [pega el error]
```

---

## En términos simples

El proceso completo es equivalente a:

1. Instalar Local by Flywheel → **instalar Node + Git**
2. Crear un nuevo site en Local → **git clone --recurse-submodules**
3. Instalar los plugins → **npm install**
4. Hacer click en "Start" → **npm run dev**
5. Abrir el site → **http://localhost:3000**

Misma lógica, herramientas diferentes.
