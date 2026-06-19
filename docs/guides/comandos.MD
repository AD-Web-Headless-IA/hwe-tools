
# 1- IMPORTAR FIGMA

## /import-figma <git-url> [slug] — qué hace
### /import-figma git@github.com:agenciawebsqs/Skillskittest.git site-demo

Clona el repo Figma Make en figma-makes/{slug}/ (lo deja prístino, con tag import-YYYY-MM-DD — DEC-002).
Analiza sus design tokens y su catálogo de componentes.
Genera en docs/clients/{slug}/: tokens.json (colores/tipo/spacing…), figma-analysis.md (incl. idioma y fuentes) y design-language.md.
Esa salida alimenta directamente el resto: tokens.json → D2 (tema), y los componentes/idioma → D3 (spec por bloque) y D0 (qué fuentes cargar).
# 2. Use template    → clonar hwe-template = esqueleto del proyecto (+ submódulo hwe-tools)
La corrección clave: import-figma = trae el diseño; el proyecto nace de clonar hwe-template; scaffold-site = lo configura (incluido el design-system).

(Nota: site-demo es el fixture, hecho a mano antes de este flujo; este onboarding es para clientes reales.)

# 2 - IMPORTAR globals.css con @source+tokens AL PROYECTO 
# 3. npm install     → @hwe/core-ui + @hwe/config desde npm

## /scaffold-site

configura: globals.css (@source+tokens), blocks/registry,
compositions, app, client.config, DESIGN.md + /design-system

## Añadir un bloque de media text

/design-block MediaTextBlock --client site-demo
/design-block BookingFavoritesBlock --client {slug}

# Actualizar submodulo hwe-tools dentro de hwe-core
ejecutándolo dentro de hwe-core:

## git submodule update --remote hwe-tools

# 4. buscador THR
El --with-block que ya tiene el plan lo hace. En una sola invocación:
## /setup-booking --engine thr --codeCamping ABC123 --siteId 6955 --with-block
Eso configura el site y añade una instancia de BookingSearchBlock a la HomeComposition. Si quieres personalizar la presentación:
## /setup-booking --engine thr --codeCamping ABC123 --with-block --widget-title "Réservation"
Si más adelante quieres el buscador en otra página, usarías /add-block:
## /add-block BookingSearchBlock --page alojamientos --accommodationType locatif
Y cuando Payload esté integrado, será drag-and-drop desde el admin panel: añadir bloque BookingSearch, rellenar título y tipo de alojamiento. El motor ya lo sabe el site por client.config.
En resumen: no necesitas un skill aparte para colocar el buscador. /setup-booking --with-block lo cubre para el primer buscador, y /add-block para los siguientes.

## crear histyorias de usuario para bloques.
Usa la skill /generate-block-story GalleryBlock. Lee docs/guides/guia-galleryblock.md y galleryblock-story.md en la raíz como input — contienen las decisiones ya tomadas por el equipo (variantes, SEO, a11y, SwiperPrimitive). Genera la story canónica en docs/plans/base-blocks/stories/ con el formato y numeración correctos. Después borra galleryblock-story.md de la raíz — ese era un borrador temporal, la versión definitiva es la que generes tú.