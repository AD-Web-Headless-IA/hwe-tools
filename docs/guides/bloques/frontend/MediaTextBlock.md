# MediaTextBlock

> Ficha de uso. Guía general: [`../../guia-bloques.md`](../../guia-bloques.md) ·
> Contrato técnico: [`block-contract.md`](../../../contracts/frontend/block-contract.md).

## Qué es

Un bloque a dos columnas: una columna de **media** (imagen o vídeo) y otra de **texto**
(eyebrow, título, párrafos, lista de features y CTAs).

## Para qué sirve

Contar algo con apoyo visual: presentar las habitaciones, una zona del camping, una
experiencia… Alternando `media-left` / `media-right` en bloques consecutivos se consigue
el clásico ritmo en zigzag de una página de marketing.

## Cómo se instancia / cómo me lo pides

**Con skill:**
```
/add-block <site> <page> MediaText
```
(sin el sufijo `Block`; la página debe existir — si no, `/create-page` primero).

**Pidiéndomelo:**
> "Añade un **MediaTextBlock** a la home de site-demo, variante **media-right**, con
> título 'Nuestras piscinas', un párrafo de relleno, 3 features con icono y un CTA
> 'Ver más' a `/piscinas`."

## Posibles variantes

(CVA en `@hwe/core-ui/src/base-blocks/MediaTextBlock/MediaTextBlock.variants.ts`)

| Variante | Efecto |
|---|---|
| `media-left` (por defecto) | la imagen/vídeo manda a la izquierda |
| `media-right` | la imagen/vídeo manda a la derecha |

La variante se pone en `variant` de la instancia (puente de variante, DEC-023).

## Dónde se añade en el proyecto

En el array `layout: BlockInstance[]` de una composición:
`{SITE_DIR}/src/compositions/{Pagina}Composition.tsx`. El contenido va inline.

## Contenido

(Schema en `@hwe/core-ui/src/schemas/MediaTextBlock.schema.ts`.)

| Campo | Obligatorio | Tipo |
|---|---|---|
| `media` | sí | imagen o vídeo (ver abajo) |
| `heading` | sí | texto |
| `eyebrow` | no | texto |
| `subtitle` | no | texto |
| `body` | no | lista de párrafos (texto) |
| `features` | no | lista de `{ icon?, label, description? }` |
| `ctas` | no | lista de `{ label, href?, variant }` — `variant`: `primary` · `accent` · `outline` · `ghost` |
| `backgroundColor` | no | token de color, p.ej. `var(--color-secondary)` |

El `media` es polimórfico por `kind`:
- **imagen** → `{ kind: 'image', src, alt, href?, caption? }`
- **vídeo** → `{ kind: 'video', src, poster?, title?, href?, caption? }`

## Ejemplo real

De `site-demo/src/compositions/HomeComposition.tsx`:

```ts
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
```
