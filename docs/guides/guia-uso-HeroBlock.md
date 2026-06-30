# Guía práctica: Cómo usar HeroBlock

> **Para:** equipo HWE — cómo instanciar HeroBlock en composiciones, con todo su contenido.
> **Última actualización:** 2026-06-26

---

## Concepto rápido

HeroBlock es la **sección de cabecera a sangre completa** (full-bleed): imagen de fondo que ocupa todo el ancho, una capa de **tinte** (overlay) por encima para que el texto blanco se lea, y encima el texto (eyebrow, título `h1`, subtítulo) + botones, centrados verticalmente. Es lo primero que ve el visitante: el primer bloque de una home o una landing.

A diferencia de GalleryBlock o la familia booking, **no tiene capa `config` ni variantes**: todo lo que controlas va en `content`. El aspecto sale de la **imagen + los tokens de tema** (el overlay se construye a partir de `--color-primary`).

```
composición  →  { type: 'HeroBlock', content }   ← solo contenido (sin variant)
```

---

## Variantes

**No tiene.** El eje `variant` no existe en este bloque: el impacto visual viene de la imagen y el tinte de tema, así que no hay nada que elegir. Omite `variant` en la instancia.

---

## El título es un `<h1>`

HeroBlock renderiza `title` como `<h1>` — es el encabezado de nivel 1 de la página. **Por eso suele ir como primer bloque y solo uno por página**: tener dos `<h1>` perjudica el SEO y la accesibilidad. El resto de bloques con título usan `<h2>`.

---

## Contenido completo

(Schema en `@hwe/core-ui/src/schemas/HeroBlock.schema.ts`.)

| Campo | Obligatorio | Tipo | Qué hace |
|---|---|---|---|
| `title` | **sí** | string (≥1) | título principal, renderizado como `<h1>` |
| `image` | **sí** | `{ src, alt }` | imagen de fondo full-bleed (`next/image`, `fill`, `priority`) |
| `eyebrow` | no | string | etiqueta pequeña sobre el título (primitivo `Eyebrow`) |
| `subtitle` | no | string | texto bajo el título |
| `ctas` | no | `{ label, href, variant? }[]` | botones de acción |

### `image` — fondo a sangre completa

```typescript
image: {
  src: '/img/hero.jpg',
  alt: 'Aerial view of the campsite in the pine forest',  // obligatorio
}
```

Se renderiza con `next/image` (`fill`, `priority`, `sizes="100vw"`, `object-cover`). El `priority` está puesto porque el hero es contenido above-the-fold (mejora el LCP). El `alt` es **obligatorio** (Zod lo exige) — descriptivo y específico.

### `ctas` — botones

```typescript
ctas: [
  { label: 'Book now', href: '#book', variant: 'accent' },
  { label: 'Discover the campsite', href: '#about', variant: 'ghost' },
]
```

A diferencia de MediaTextBlock, aquí `href` es **obligatorio** y `variant` es **opcional**:

| Aspecto | Comportamiento |
|---|---|
| `variant` omitido | usa `accent` por defecto |
| valores de `variant` | `primary` · `accent` · `outline` · `ghost` |
| tamaño | siempre `lg` (botones grandes de hero) |
| color | `onDark` — pensados para leerse sobre la imagen oscurecida |

---

## Ejemplo completo

De `site-demo/src/compositions/HomeComposition.tsx`:

```typescript
import { BlockRenderer, type BlockInstance } from '@hwe/core-ui';
import { clientBlocks } from '@/blocks/registry';

const layout: BlockInstance[] = [
  {
    id: 'hero-1',
    type: 'HeroBlock',
    content: {
      eyebrow: 'Calvisson · Gard · France',
      title: 'Welcome to site-demo',
      subtitle:
        'A 4-star campsite in the heart of a verdant pine forest, between Nîmes and Montpellier.',
      image: {
        src: 'https://picsum.photos/seed/site-demo-hero/1920/1080',
        alt: 'Aerial view of the campsite in the pine forest at Calvisson',
      },
      ctas: [
        { label: 'Book now', href: '#book', variant: 'accent' },
        { label: 'Discover the campsite', href: '#about', variant: 'ghost' },
      ],
    },
  },
];

export function HomeComposition() {
  return <BlockRenderer layout={layout} blocks={clientBlocks} />;
}
```

---

## Cómo me lo pides

Dame el sitio, la página y el contenido — o pídeme contenido de ejemplo:

> "Añade un **Hero** a la home de site-demo con imagen de ejemplo, eyebrow 'Estamos aquí'
> y título 'Bienvenidos', y un CTA 'Reservar' que vaya a `#book`."

Para colocarlo: skill **`/add-block <site> <page> Hero`** (sin el sufijo `Block`; la página debe existir — si no, `/create-page` primero).

---

## Dónde se añade en el proyecto

En el array `layout: BlockInstance[]` de una composición: `{SITE_DIR}/src/compositions/{Pagina}Composition.tsx`. El contenido va **inline** en la instancia. Por convención, **como primer bloque** de la página (es el `<h1>`).

---

## Lo que se genera automáticamente (no tienes que hacer nada)

- **`next/image`** con `fill`, `priority` (optimiza el LCP del above-the-fold), `sizes="100vw"` y `object-cover`.
- **Overlay de tinte** en degradado (más oscuro arriba/abajo, más claro en medio) a partir de `--color-primary`, para que el texto blanco se lea sobre cualquier imagen.
- **`<h1>`** semántico para el título (encabezado de nivel 1 de la página).
- **Altura `min-h-[80vh]`** para una cabecera de impacto, con el contenido centrado verticalmente.
- **Botones `lg` + `onDark`** automáticos para los CTAs, con `accent` como variante por defecto.
- **Centrado en el container** del sitio (`--width-container`) para el bloque de texto, sobre el fondo full-bleed.
