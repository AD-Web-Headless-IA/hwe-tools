# Guía: GalleryBlock — Arquitectura, Variantes y SEO

> **Audiencia:** equipo de desarrollo HWE (frontend + diseño + SEO).  
> **Última actualización:** 2026-06-18  
> **Bloque:** `GalleryBlock` — galería de imágenes reutilizable para sites de hospitality.

---

## 1. Visión general

GalleryBlock es el bloque de galería de imágenes de la plataforma. Se usa en prácticamente todas las páginas de un site de hospitality: fichas de alojamiento, servicios, actividades, entorno, etc.

Internamente se apoya en **Swiper.js v12** (React components) para las variantes de carrusel y en **CSS Grid** para las variantes estáticas. El lightbox también se construye con Swiper (fullscreen + zoom), sin dependencias externas adicionales.

### Arquitectura en dos capas

El diseño separa la lógica de carrusel del bloque de galería para que otros bloques puedan reutilizar Swiper sin duplicar código:

| Capa | Ubicación | Responsabilidad |
|---|---|---|
| **SwiperPrimitive** | `core-ui/src/primitives/Swiper/` | Wrapper reutilizable de Swiper. Encapsula configuración, módulos, y lógica compartida. No es un bloque — es un primitivo que cualquier bloque puede consumir (ReviewsBlock slider, logo slider del footer, promos, etc.) |
| **GalleryBlock** | `core-ui/src/base-blocks/GalleryBlock/` | Bloque de galería de imágenes. Usa SwiperPrimitive internamente para las variantes de carrusel. Define el schema de contenido, las variantes visuales, y la lógica de lightbox. |

Esta separación evita que cada bloque que necesite un slider reimplemente Swiper desde cero.

---

## 2. Variantes visuales

### 2.1 Variantes con carrusel (usan SwiperPrimitive)

#### `slider` — Carrusel horizontal clásico

El más común. Navegación con flechas laterales y dots (puntos de paginación). Opcionalmente con autoplay y loop.

**Módulos Swiper:** Navigation, Pagination, Autoplay (opcional), A11y.

**Cuándo usarlo:** galerías generales (página de inicio, servicios, entorno), banners rotativos, cualquier contexto donde se muestren imágenes una a una.

#### `slider-thumbs` — Carrusel con miniaturas

Dos instancias de Swiper sincronizadas: el carrusel principal arriba y una barra de miniaturas debajo. Al hacer click en una miniatura se navega a esa imagen en el carrusel principal.

**Módulos Swiper:** Navigation, Thumbs, A11y.

**Cuándo usarlo:** fichas de alojamiento (es la variante más usada en hospitality), fichas de servicio con galería detallada. Cualquier contexto donde el usuario necesita ver y navegar rápidamente entre varias fotos de un mismo elemento.

### 2.2 Variantes estáticas (CSS Grid, sin Swiper)

#### `grid` — Grid responsive de columnas

Grid regular con columnas configurables (2, 3 o 4). Todas las imágenes al mismo tamaño, distribución uniforme.

**Cuándo usarlo:** listados de fotos donde importa mostrar todas a la vez (instalaciones, galería del camping, actividades).

#### `masonry` — Grid de altura variable

Tipo Pinterest — las imágenes mantienen su proporción original y se distribuyen en columnas de altura variable. Más visual y orgánico que el grid regular.

**Cuándo usarlo:** portfolios visuales, páginas de "descubre el entorno", contextos donde las fotos tienen proporciones muy diferentes entre sí.

#### `collage` — Composición asimétrica

Una imagen destacada grande acompañada de varias imágenes pequeñas. Diseño editorial que funciona bien como sección hero de una galería.

**Cuándo usarlo:** cabecera de una página de galería, sección destacada de alojamiento, cualquier contexto donde una imagen principal manda y el resto son complementarias.

### 2.3 Lightbox (transversal a todas las variantes)

Todas las variantes comparten la funcionalidad de **lightbox**: al hacer click en una imagen se abre un visor a pantalla completa con:

- Navegación entre imágenes (flechas + swipe en móvil)
- Zoom con pinch (móvil) y doble click (desktop)
- Navegación por teclado (← → para navegar, Esc para cerrar)
- Caption de la imagen visible
- Fondo oscuro con transición fade

El lightbox se implementa con el propio Swiper (instancia fullscreen con módulos Zoom + Navigation + Keyboard + A11y), sin necesidad de una librería de lightbox externa.

Se puede desactivar por configuración (`lightbox: false`) si no se desea en un contexto específico.

---

## 3. Campos de contenido

### Campos del bloque

| Campo | Tipo | Obligatorio | Default | Variantes | Notas |
|---|---|---|---|---|---|
| `title` | string | no | — | todas | Localizable. Si se incluye, se renderiza como heading con el nivel correcto en la jerarquía de la página. |
| `images` | array de `GalleryImage` | sí (mín. 1) | — | todas | Ver tabla de GalleryImage abajo. |
| `variant` | enum | no | `slider` | — | `slider`, `slider-thumbs`, `grid`, `masonry`, `collage` |
| `columns` | 2, 3 o 4 | no | 3 | grid, masonry | Número de columnas en desktop. En móvil siempre colapsa a 1-2. |
| `lightbox` | boolean | no | `true` | todas | Activa/desactiva el lightbox al hacer click. |
| `autoplay` | boolean | no | `false` | slider, slider-thumbs | Rotación automática de imágenes. |
| `autoplayDelay` | número (ms) | no | 3000 | slider, slider-thumbs | Solo aplica si `autoplay: true`. |
| `loop` | boolean | no | `true` | slider, slider-thumbs | Navegación infinita (vuelve al principio al llegar al final). |
| `showDots` | boolean | no | `true` | slider | Muestra los puntos de paginación. |
| `showArrows` | boolean | no | `true` | slider, slider-thumbs | Muestra las flechas de navegación. |
| `effect` | enum | no | `slide` | slider | `slide` (desplazamiento horizontal) o `fade` (transición crossfade). |
| `aspectRatio` | enum | no | `16/9` | todas | `16/9`, `4/3`, `3/2`, `1/1`, `auto`. Unifica la proporción visual de la galería. |

### Campos de `GalleryImage`

| Campo | Tipo | Obligatorio | Notas |
|---|---|---|---|
| `src` | string (URL) | sí | Ruta de la imagen. |
| `alt` | string | **sí** | Texto alternativo descriptivo. **Obligatorio por schema** — Zod rechaza imágenes sin alt. Fundamental para SEO y accesibilidad. |
| `caption` | string | no | Pie de foto. Localizable. Se muestra como `<figcaption>` y en el lightbox. |
| `width` | número | sí | Ancho original en píxeles. Necesario para `next/image` (evita CLS). |
| `height` | número | sí | Alto original en píxeles. Necesario para `next/image` (evita CLS). |

---

## 4. SEO

La galería de imágenes es uno de los bloques con mayor impacto en SEO para sites de hospitality. Google Images es una fuente de tráfico significativa para campings y hoteles. Estos son los puntos que el bloque debe cumplir:

### 4.1 Texto alternativo (`alt`) obligatorio

El atributo `alt` es el factor SEO más importante para imágenes. Debe ser descriptivo y específico del contenido de la imagen, no genérico.

- ✅ `"Terraza del mobile home Confort con vistas al pinar"` 
- ❌ `"imagen"`, `"foto"`, `"IMG_4532.jpg"`, `""`

El schema Zod **rechaza** imágenes sin `alt`. Es una validación en el boundary — no llega a renderizar sin ella.

### 4.2 next/image con dimensiones explícitas

Todas las imágenes se renderizan con el componente `next/image` de Next.js, que aporta:

- **Optimización automática de formato** (WebP/AVIF según el navegador)
- **Responsive `srcset`** (genera múltiples tamaños automáticamente)
- **Lazy loading nativo** para imágenes fuera del viewport
- **Prevención de CLS** (Cumulative Layout Shift) al especificar `width` y `height`

Los campos `width` y `height` en el schema son obligatorios precisamente para que `next/image` reserve el espacio correcto y no haya saltos de layout.

### 4.3 Prioridad de carga: primera imagen visible

La primera imagen visible en el viewport (la que el usuario ve sin hacer scroll) debe llevar `priority={true}` en `next/image`. Esto desactiva el lazy loading para esa imagen y la precarga, mejorando el **LCP** (Largest Contentful Paint), que es un Core Web Vital.

- En variantes `slider` y `slider-thumbs`: la primera slide lleva `priority`.
- En variantes `grid`, `masonry`, `collage`: las imágenes visibles en el viewport inicial llevan `priority` (normalmente las primeras 3-4 dependiendo de las columnas).

### 4.4 Semántica HTML: `<figure>` y `<figcaption>`

Las imágenes con caption se envuelven en la estructura semántica estándar:

```html
<figure>
  <img src="..." alt="Piscina del camping con tobogán infantil" />
  <figcaption>Piscina climatizada abierta de mayo a septiembre</figcaption>
</figure>
```

Esto le da contexto semántico a los motores de búsqueda y mejora la experiencia de lectores de pantalla.

### 4.5 Structured data: schema.org `ImageGallery`

El bloque inyecta un bloque JSON-LD con structured data de tipo `ImageGallery` que incluye la lista de imágenes:

```json
{
  "@context": "https://schema.org",
  "@type": "ImageGallery",
  "name": "Galería de alojamientos",
  "image": [
    {
      "@type": "ImageObject",
      "url": "https://example.com/images/mobile-home-terraza.jpg",
      "name": "Terraza del mobile home Confort",
      "description": "Terraza del mobile home Confort con vistas al pinar",
      "width": 1920,
      "height": 1080
    }
  ]
}
```

Esto mejora la aparición en **resultados enriquecidos de Google Images** y en la pestaña de imágenes de la búsqueda.

### 4.6 Jerarquía de headings

Si el bloque tiene un `title`, se renderiza como heading (`<h2>`, `<h3>`, etc.) respetando la jerarquía de la página. Nunca se usa un `<h1>` dentro del bloque (el `<h1>` es del hero o del título principal de la página).

El nivel del heading se infiere del contexto de la composición o se configura explícitamente.

---

## 5. Accesibilidad

### 5.1 Carrusel accesible

El carrusel sigue las recomendaciones del [WAI-ARIA Carousel Pattern](https://www.w3.org/WAI/ARIA/apg/patterns/carousel/):

| Atributo | Elemento | Valor |
|---|---|---|
| `role="region"` | contenedor del carrusel | Identifica el carrusel como una región landmark |
| `aria-roledescription="carousel"` | contenedor del carrusel | Le dice al lector de pantalla que es un carrusel |
| `aria-label` | contenedor del carrusel | Describe el carrusel (ej. "Galería de fotos del alojamiento") |
| `role="group"` | cada slide | Agrupa el contenido de la slide |
| `aria-roledescription="slide"` | cada slide | Identifica cada slide |
| `aria-label` | cada slide | "Imagen 1 de 12" — posición y total |

### 5.2 Navegación por teclado

| Tecla | Acción |
|---|---|
| `←` / `→` | Navegar entre imágenes |
| `Enter` / `Space` | Abrir lightbox (en la imagen con foco) |
| `Esc` | Cerrar lightbox |
| `Tab` | Mover foco entre controles (flechas, dots, imágenes) |

### 5.3 Lightbox accesible

- El lightbox captura el foco al abrirse (focus trap)
- Al cerrarse, devuelve el foco al elemento que lo abrió
- El overlay tiene `role="dialog"` y `aria-modal="true"`
- Las imágenes en el lightbox mantienen su `alt`

### 5.4 Reducción de movimiento

Si el usuario tiene activada la preferencia `prefers-reduced-motion`:
- El autoplay se desactiva automáticamente
- Las transiciones de slide y lightbox se reducen a un cambio instantáneo (sin animación)

---

## 6. Rendimiento

### 6.1 Lazy loading por defecto

Todas las imágenes excepto la primera visible cargan con lazy loading nativo de `next/image`. Esto es especialmente importante en variantes `grid` y `masonry` donde pueden haber 20+ imágenes.

### 6.2 Módulos de Swiper bajo demanda

Swiper es modular. Solo se importan los módulos necesarios para la variante activa:

| Variante | Módulos importados |
|---|---|
| `slider` | Navigation, Pagination, Autoplay, A11y, EffectFade (si `effect: 'fade'`) |
| `slider-thumbs` | Navigation, Thumbs, A11y |
| Lightbox | Navigation, Zoom, Keyboard, A11y |
| `grid`, `masonry`, `collage` | Ninguno (no usan Swiper) |

### 6.3 Tamaños de imagen responsivos

`next/image` genera automáticamente un `srcset` con múltiples tamaños. El navegador descarga solo el tamaño adecuado para el viewport. Para un carrusel a ancho completo, los tamaños típicos son 640w, 750w, 828w, 1080w, 1200w, 1920w.

---

## 7. Personalización por cliente

### 7.1 Estilos via tokens

Los colores de los controles del carrusel (flechas, dots, fondo del lightbox) se derivan de los **design tokens** del cliente:

- Flechas: `var(--color-on-surface)` con fondo `var(--color-surface/80%)`
- Dots activo: `var(--color-primary)`
- Dots inactivo: `var(--color-on-surface/30%)`
- Fondo lightbox: `rgba(0, 0, 0, 0.9)`

### 7.2 CSS overrides

Si un cliente necesita personalización adicional, los overrides van en su fichero CSS dedicado (no en `globals.css`), scoped con `[data-block="gallery"]`:

```css
/* site-{slug}/src/app/blocks/gallery-overrides.css */
[data-block="gallery"] .swiper-button-next,
[data-block="gallery"] .swiper-button-prev {
  /* override de flechas */
}
```

---

## 8. Relación con otros bloques

GalleryBlock y SwiperPrimitive son la base para otros bloques que necesitan carrusel:

| Bloque | Usa SwiperPrimitive | Uso |
|---|---|---|
| **GalleryBlock** | sí (slider, slider-thumbs, lightbox) | Galería de imágenes |
| **ReviewsBlock** | sí (slider) | Carrusel de opiniones |
| **AccommodationCardBlock** | sí (slider-thumbs) | Galería de fotos en la ficha de alojamiento |
| **PromoBlock** | sí (slider con effect fade) | Banner rotativo de promociones |
| **Footer** (logo slider) | sí (slider) | Carrusel de logos de partners/certificaciones |

Todos estos bloques consumen `SwiperPrimitive` — ninguno importa Swiper directamente.

---

## 9. Checklist de implementación

- [ ] `SwiperPrimitive` como primitivo en `core-ui/src/primitives/Swiper/`
- [ ] `GalleryBlock` con las 5 variantes
- [ ] Lightbox compartido (Swiper fullscreen + Zoom)
- [ ] Schema Zod con `alt` obligatorio y validación de dimensiones
- [ ] `next/image` con `priority` en primera imagen visible
- [ ] Structured data JSON-LD `ImageGallery`
- [ ] Semántica `<figure>` / `<figcaption>` para imágenes con caption
- [ ] ARIA carousel pattern completo
- [ ] Navegación por teclado (carrusel + lightbox)
- [ ] Focus trap en lightbox
- [ ] `prefers-reduced-motion` respetado
- [ ] Tests: rendering, variantes, a11y (`toHaveNoViolations`), lightbox open/close
- [ ] Demo en `site-demo` con contenido realista
