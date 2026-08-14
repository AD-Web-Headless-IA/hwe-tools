# Guía práctica: Cómo usar GalleryBlock

> **Para:** equipo HWE — cómo instanciar GalleryBlock en composiciones con todas sus variantes y configuraciones.  
> **Última actualización:** 2026-06-19

---

## Concepto rápido

GalleryBlock tiene **dos capas de datos**:

- **`content`** — lo que edita el editor: título e imágenes (con alt obligatorio)
- **`config`** — cómo se comporta: variante, columnas, autoplay, lightbox, etc.

Ambas se pasan por instancia: `content`, `variant` y `config` son campos del `BlockInstance` (`config` desde **DEC-029**). El `BlockRenderer` reenvía `config` al bloque y el bloque lo valida con su schema. Los knobs de `config` que **omitas** usan sus valores por defecto.

---

## Las 5 variantes

### 1. `slider` — Carrusel horizontal (default)

El más común. Imágenes una a una con flechas y dots.

```typescript
{
  id: 'gallery-general',
  type: 'GalleryBlock',
  variant: 'slider',
  content: {
    title: 'Discover our camping',
    images: [
      { src: '/img/pool.jpg', alt: 'Heated pool with water slides', width: 1920, height: 1080 },
      { src: '/img/restaurant.jpg', alt: 'Outdoor restaurant terrace', width: 1920, height: 1080 },
      { src: '/img/playground.jpg', alt: 'Children playground area', width: 1920, height: 1080 },
    ],
  },
}
```

**Defaults:** autoplay off, loop on, dots on, flechas on, efecto slide, ratio 16/9, lightbox on.

**Cuándo usarlo:** galerías generales (home, servicios, entorno), banners rotativos.

**Varias imágenes a la vez** (carrusel multi-slide) — usa `config.slidesPerView` (responsive: el bloque escala 1 móvil → 2 tablet → N desktop):

```typescript
{
  id: 'gallery-related',
  type: 'GalleryBlock',
  variant: 'slider',
  config: { slidesPerView: 3 },   // 3 visibles en desktop, desliza el carrusel
  content: { title: 'Explore other accommodations', images: [/* 6+ imágenes */] },
}
```

---

### 2. `slider-thumbs` — Carrusel con miniaturas

Dos carruseles sincronizados: el principal arriba, miniaturas debajo. Click en miniatura = navegar.

```typescript
{
  id: 'gallery-accommodation',
  type: 'GalleryBlock',
  variant: 'slider-thumbs',
  content: {
    title: 'Mobile Home Confort',
    images: [
      { src: '/img/mh-exterior.jpg', alt: 'Mobile home exterior surrounded by pine trees', width: 1920, height: 1080 },
      { src: '/img/mh-living.jpg', alt: 'Spacious living room with equipped kitchen', width: 1920, height: 1080 },
      { src: '/img/mh-bedroom.jpg', alt: 'Double bedroom with forest view', width: 1920, height: 1080 },
      { src: '/img/mh-terrace.jpg', alt: 'Private terrace with garden furniture', width: 1920, height: 1080 },
      { src: '/img/mh-bathroom.jpg', alt: 'Modern bathroom with walk-in shower', width: 1920, height: 1080 },
    ],
  },
}
```

**Cuándo usarlo:** fichas de alojamiento (la variante estrella en hospitality), fichas de servicio detalladas.

---

### 3. `grid` — Grid de columnas

Todas las imágenes visibles a la vez, distribuidas en columnas regulares.

```typescript
{
  id: 'gallery-facilities',
  type: 'GalleryBlock',
  variant: 'grid',
  content: {
    title: 'Our facilities',
    images: [
      { src: '/img/pool.jpg', alt: 'Heated swimming pool', width: 800, height: 600 },
      { src: '/img/spa.jpg', alt: 'Wellness area and spa', width: 800, height: 600 },
      { src: '/img/gym.jpg', alt: 'Fitness room', width: 800, height: 600 },
      { src: '/img/kids-club.jpg', alt: 'Kids club indoor area', width: 800, height: 600 },
      { src: '/img/bike-rental.jpg', alt: 'Bicycle rental station', width: 800, height: 600 },
      { src: '/img/minimarket.jpg', alt: 'On-site minimarket', width: 800, height: 600 },
    ],
  },
}
```

**Defaults:** 3 columnas en desktop, colapsa a 1-2 en móvil, ratio 16/9, lightbox on.

**Cuándo usarlo:** listados donde importa ver todo de un vistazo (instalaciones, actividades).

---

### 4. `masonry` — Grid tipo Pinterest

Imágenes con alturas distintas, se encajan en columnas sin dejar huecos. Más orgánico y visual.

```typescript
{
  id: 'gallery-surroundings',
  type: 'GalleryBlock',
  variant: 'masonry',
  content: {
    title: 'Explore the surroundings',
    images: [
      { src: '/img/beach-panoramic.jpg', alt: 'Sandy beach 500m from the camping', width: 1920, height: 800 },
      { src: '/img/village-square.jpg', alt: 'Medieval village square', width: 800, height: 1200 },
      { src: '/img/hiking-trail.jpg', alt: 'Coastal hiking trail', width: 1200, height: 900 },
      { src: '/img/market.jpg', alt: 'Local farmers market on Saturday', width: 900, height: 900 },
      { src: '/img/sunset.jpg', alt: 'Sunset over the Mediterranean', width: 1920, height: 1080 },
      { src: '/img/vineyard.jpg', alt: 'Wine tasting at a nearby vineyard', width: 800, height: 600 },
      { src: '/img/castle.jpg', alt: 'Cathar castle ruins on the hilltop', width: 600, height: 900 },
    ],
  },
}
```

**Cuándo usarlo:** páginas de "descubre el entorno", portfolios visuales, fotos con proporciones muy variadas.

---

### 5. `collage` — Composición editorial

Una imagen grande destacada + varias pequeñas alrededor. Efecto editorial/revista.

```typescript
{
  id: 'gallery-highlight',
  type: 'GalleryBlock',
  variant: 'collage',
  content: {
    title: 'Summer at the camping',
    images: [
      { src: '/img/aerial-view.jpg', alt: 'Aerial view of the camping and beach', width: 1920, height: 1080 },
      { src: '/img/family-pool.jpg', alt: 'Family enjoying the pool', width: 800, height: 600 },
      { src: '/img/evening-show.jpg', alt: 'Evening entertainment show', width: 800, height: 600 },
      { src: '/img/barbecue.jpg', alt: 'Communal barbecue area', width: 800, height: 600 },
      { src: '/img/yoga-beach.jpg', alt: 'Morning yoga session on the beach', width: 800, height: 600 },
    ],
  },
}
```

**La primera imagen es la destacada** (la grande). El resto se distribuyen alrededor.

**Cuándo usarlo:** cabecera de página de galería, sección destacada de alojamiento, hero visual.

---

## Imágenes con caption

Cualquier imagen puede tener un `caption` opcional. Se renderiza como `<figcaption>` y aparece también en el lightbox:

```typescript
{
  src: '/img/pool-panoramic.jpg',
  alt: 'Heated pool complex with three pools',
  caption: 'Our pool complex: 3 pools open from May to September',
  width: 1920,
  height: 1080,
}
```

---

## Config por instancia (DEC-029)

Pasa `config` como campo del `BlockInstance`, junto a `content` y `variant`. Lo que omitas usa su default:

```typescript
{
  id: 'gallery-promo',
  type: 'GalleryBlock',
  variant: 'slider',
  content: {
    title: 'Special offers',
    images: [/* ... */],
  },
  config: {
    autoplay: true,
    autoplayDelay: 5000,
    effect: 'fade',
    loop: true,
    showDots: false,
    showArrows: true,
    lightbox: false,
    aspectRatio: '4/3',
    headingLevel: 3,
  },
}
```

**Tabla de knobs de config:**

| Knob | Tipo | Default | Variantes | Descripción |
|---|---|---|---|---|
| `variant` | `slider \| slider-thumbs \| grid \| masonry \| collage` | `slider` | — | Ya funciona via `BlockInstance.variant` |
| `columns` | `2 \| 3 \| 4` | `3` | grid, masonry | Columnas en desktop |
| `slidesPerView` | `1 \| 2 \| 3 \| 4` | `1` | slider | Imágenes visibles a la vez en desktop. **Responsive**: el bloque escala 1 (móvil) → 2 (tablet) → este valor (desktop). `1` = carrusel clásico de una en una |
| `aspectRatio` | `16/9 \| 4/3 \| 3/2 \| 1/1 \| auto` | `16/9` | todas | Proporción visual |
| `lightbox` | boolean | `true` | todas | Click para abrir visor fullscreen |
| `autoplay` | boolean | `false` | slider, slider-thumbs | Rotación automática |
| `autoplayDelay` | número (ms) | `3000` | slider, slider-thumbs | Solo si autoplay: true |
| `loop` | boolean | `true` | slider, slider-thumbs | Navegación infinita |
| `showDots` | boolean | `true` | slider | Puntos de paginación |
| `showArrows` | boolean | `true` | slider, slider-thumbs | Flechas de navegación |
| `effect` | `slide \| fade` | `slide` | slider | Transición entre imágenes |
| `headingLevel` | `2 \| 3 \| 4` | `2` | todas | Nivel del heading del título |

---

## Ejemplo completo: página de alojamiento

```typescript
import { BlockRenderer, type BlockInstance } from '@hwe/core-ui';
import { clientBlocks } from '@/blocks/registry';

const layout: BlockInstance[] = [
  {
    id: 'hero-1',
    type: 'HeroBlock',
    content: {
      title: 'Mobile Home Confort Plus',
      subtitle: '2 bedrooms · 4 guests · Air conditioning · Private terrace',
      image: {
        src: '/img/mh-confort-hero.jpg',
        alt: 'Mobile Home Confort Plus with sea view terrace',
      },
    },
  },
  {
    id: 'gallery-photos',
    type: 'GalleryBlock',
    variant: 'slider-thumbs',   // carrusel con miniaturas
    content: {
      title: 'Photo gallery',
      images: [
        { src: '/img/mh-exterior.jpg', alt: 'Exterior view with pine trees', width: 1920, height: 1080 },
        { src: '/img/mh-living.jpg', alt: 'Living room and kitchen', width: 1920, height: 1080 },
        { src: '/img/mh-bedroom1.jpg', alt: 'Master bedroom', width: 1920, height: 1080 },
        { src: '/img/mh-bedroom2.jpg', alt: 'Twin bedroom', width: 1920, height: 1080 },
        { src: '/img/mh-bathroom.jpg', alt: 'Bathroom with shower', width: 1920, height: 1080 },
        { src: '/img/mh-terrace.jpg', alt: 'Private terrace with furniture', width: 1920, height: 1080 },
      ],
    },
  },
  {
    id: 'booking-search',
    type: 'BookingSearchBlock',
    variant: 'inline',
    content: {
      widgetTitle: 'Check availability',
      mobile: 'accordion',
    },
  },
  {
    id: 'gallery-area',
    type: 'GalleryBlock',
    variant: 'grid',            // grid para el entorno
    config: { columns: 3, aspectRatio: '4/3' },  // config por instancia (DEC-029)
    content: {
      title: 'Around the camping',
      images: [
        { src: '/img/beach.jpg', alt: 'Sandy beach at 500m', width: 800, height: 600 },
        { src: '/img/market.jpg', alt: 'Weekly local market', width: 800, height: 600 },
        { src: '/img/trail.jpg', alt: 'Coastal walking trail', width: 800, height: 600 },
      ],
    },
  },
];

export function AccommodationComposition() {
  return <BlockRenderer layout={layout} blocks={clientBlocks} />;
}
```

---

## Reglas para los `alt`

El schema Zod **rechaza** imágenes sin `alt`. Estos son los criterios:

- ✅ `"Terraza privada del mobile home Confort con vistas al pinar"` — descriptivo y específico
- ✅ `"Piscina climatizada con tobogán infantil"` — describe lo que se ve
- ❌ `"imagen"`, `"foto"`, `"IMG_4532.jpg"`, `""` — genéricos, inútiles para SEO y accesibilidad
- ❌ Sin `alt` → Zod lanza error, la imagen no se renderiza

---

## Lo que se genera automáticamente (no tienes que hacer nada)

- **Lightbox** en todas las variantes (click en imagen → visor fullscreen con zoom y navegación)
- **Lazy loading** en todas las imágenes excepto la primera visible
- **JSON-LD** `ImageGallery` con structured data de schema.org (server-rendered para SEO)
- **`<figure>` + `<figcaption>`** cuando la imagen tiene `caption`
- **ARIA carousel** en las variantes slider (navegación por teclado, lectores de pantalla)
- **`prefers-reduced-motion`** respetado (autoplay se desactiva, transiciones instantáneas)
