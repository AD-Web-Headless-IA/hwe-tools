# Guía práctica: Cómo usar MediaTextBlock

> **Para:** equipo HWE — cómo instanciar MediaTextBlock en composiciones con sus variantes y todo su contenido.
> **Última actualización:** 2026-06-26

---

## Concepto rápido

MediaTextBlock es un bloque a **dos columnas**: una de **media** (imagen o vídeo) y otra de **texto** (eyebrow, título, subtítulo, párrafos, lista de features y CTAs). Es el caballo de batalla de las páginas de marketing: alternando `media-left` / `media-right` en bloques consecutivos se consigue el clásico ritmo en **zigzag**.

A diferencia de GalleryBlock o la familia booking, **no tiene capa `config`**: todo lo que controlas va en `content`. La presentación (qué columna manda) se elige con `variant`, igual que el resto de bloques (`variant` y `content` son campos del `BlockInstance`, y el `BlockRenderer` los reenvía).

```
composición  →  { type: 'MediaTextBlock', variant, content }   ← variante (lado) + contenido
```

---

## Las 2 variantes

La variante controla **qué columna manda** (puente de variante, DEC-023). El intercambio de orden en el DOM lo hace el componente; en móvil ambas apilan media→texto.

### 1. `media-left` — Media a la izquierda (default)

```typescript
{
  id: 'rooms',
  type: 'MediaTextBlock',
  variant: 'media-left',
  content: {
    media: { kind: 'image', src: '/img/room.jpg', alt: 'Double room with sea view balcony' },
    heading: 'Rooms with a view',
    body: ['Wake up to the sea from every room, minutes from the beach.'],
  },
}
```

### 2. `media-right` — Media a la derecha

```typescript
{
  id: 'pool',
  type: 'MediaTextBlock',
  variant: 'media-right',
  content: {
    media: { kind: 'image', src: '/img/pool.jpg', alt: 'Heated pool open from May to September' },
    heading: 'Our pools',
    body: ['Three heated pools and a children’s splash area.'],
  },
}
```

**Cuándo usar cada una:** da igual una sola, pero **alterna** entre bloques consecutivos (`media-left`, luego `media-right`, luego `media-left`…) para el efecto zigzag de una landing.

---

## El `media` es polimórfico (imagen o vídeo)

El campo `media` es una unión discriminada por `kind` (DEC-023). Según el `kind`, el bloque renderiza un sub-componente distinto:

### Imagen

```typescript
media: {
  kind: 'image',
  src: '/img/pool.jpg',
  alt: 'Heated pool with water slides',   // obligatorio
  href: '/piscinas',                       // opcional: la imagen es un enlace
  caption: 'Open May to September',        // opcional: pie bajo la media
}
```

Se renderiza con `next/image` (`fill`, `object-cover`, `sizes` responsive).

### Vídeo

```typescript
media: {
  kind: 'video',
  src: '/video/tour.mp4',
  poster: { src: '/img/tour-poster.jpg', alt: 'Aerial tour of the campsite' },  // opcional
  title: 'Aerial tour',     // opcional → aria-label del vídeo
  href: '/tour',            // opcional
  caption: '2-minute tour', // opcional
}
```

`<video controls playsInline>` con `poster` opcional.

> El `alt` de la imagen es **obligatorio** (Zod lo exige) — descriptivo y específico, igual que en GalleryBlock.

---

## Contenido completo

(Schema en `@hwe/core-ui/src/schemas/MediaTextBlock.schema.ts`.)

| Campo | Obligatorio | Tipo | Qué hace |
|---|---|---|---|
| `media` | **sí** | imagen o vídeo (ver arriba) | la columna visual |
| `heading` | **sí** | string (≥1) | título principal (`<h2>`) |
| `eyebrow` | no | string | etiqueta pequeña sobre el título (primitivo `Eyebrow`) |
| `subtitle` | no | string | subtítulo bajo el título, con tipografía de heading |
| `body` | no | `string[]` | lista de párrafos (cada string = un `<p>`); default `[]` |
| `features` | no | `{ icon?, label, description? }[]` | lista de características en grid de 2 columnas |
| `ctas` | no | `{ label, href?, variant }[]` | botones de acción |
| `backgroundColor` | no | string (token CSS) | color de fondo de la sección, p.ej. `var(--color-secondary)` |

### `features` — fila de características

```typescript
features: [
  { icon: 'waves', label: 'Heated pool', description: 'Open May to September' },
  { icon: 'home',  label: 'Private balcony', description: 'In every room' },
  { icon: 'wifi',  label: 'Fast Wi-Fi' },   // description opcional
]
```

El `icon` es una clave de icono (o emoji) que se pinta con el primitivo `Icon`; `label` es obligatorio, `description` opcional.

### `ctas` — botones

```typescript
ctas: [
  { label: 'See availability', href: '/rooms', variant: 'outline' },
  { label: 'Video', href: '#video', variant: 'ghost' },
]
```

| `variant` del CTA | Uso |
|---|---|
| `primary` | acción principal |
| `accent` | acción destacada con color de acento |
| `outline` | acción secundaria con borde |
| `ghost` | enlace discreto (no lleva chevron) |

Todas las variantes salvo `ghost` añaden un chevron automáticamente. Si omites `href`, apunta a `#`.

---

## Ejemplo completo: sección con todo

De `site-demo/src/compositions/HomeComposition.tsx`:

```typescript
import { BlockRenderer, type BlockInstance } from '@hwe/core-ui';
import { clientBlocks } from '@/blocks/registry';

const layout: BlockInstance[] = [
  {
    id: 'media-text-1',
    type: 'MediaTextBlock',
    variant: 'media-left',
    content: {
      media: {
        kind: 'image',
        src: 'https://picsum.photos/seed/site-demo-rooms/800/600',
        alt: 'Double room with a private balcony overlooking the sea',
      },
      eyebrow: 'About the campsite',
      heading: 'Rooms with a view',
      subtitle: 'A 4-star stay in the pinède',
      body: ['Wake up to the sea from every room, a few minutes from the beaches of Le Grau-du-Roi.'],
      features: [
        { icon: 'waves', label: 'Heated pool', description: 'Open May to September' },
        { icon: 'home', label: 'Private balcony', description: 'In every room' },
        { icon: 'wifi', label: 'Fast Wi-Fi', description: 'Free across the site' },
      ],
      ctas: [
        { label: 'See availability', href: '/rooms', variant: 'outline' },
        { label: 'Video', href: '#video', variant: 'ghost' },
      ],
      backgroundColor: 'var(--color-secondary)',
    },
  },
];

export function HomeComposition() {
  return <BlockRenderer layout={layout} blocks={clientBlocks} />;
}
```

---

## Cómo me lo pides

Dame el bloque, la página, la variante (lado) y el contenido — o pídeme contenido de ejemplo:

> "Añade un **MediaTextBlock** a la home de site-demo, variante **media-right**, con título
> 'Nuestras piscinas', un párrafo de relleno, 3 features con icono y un CTA 'Ver más' a `/piscinas`."

Para colocarlo: skill **`/add-block <site> <page> MediaText`** (sin el sufijo `Block`; la página debe existir — si no, `/create-page` primero).

---

## Dónde se añade en el proyecto

En el array `layout: BlockInstance[]` de una composición: `{SITE_DIR}/src/compositions/{Pagina}Composition.tsx`. El contenido va **inline** en el array (así trabaja `site-demo`).

---

## Lo que se genera automáticamente (no tienes que hacer nada)

- **`next/image`** con `fill`, `object-cover` y `sizes` responsive para la media de imagen.
- **`<video controls playsInline>`** con `poster` y `aria-label` (desde `title`) para la media de vídeo.
- **Swap de columnas** según `variant` — el orden del DOM cambia, sin que toques CSS.
- **Apilado responsive** — en móvil las dos columnas apilan (media arriba, texto debajo).
- **`<figcaption>` visual** (pie) cuando la media lleva `caption`.
- **Enlace envolvente** cuando la media lleva `href`.
- **Chevron automático** en los CTAs salvo `ghost`.
- **Línea de acento** decorativa entre subtítulo y cuerpo.
