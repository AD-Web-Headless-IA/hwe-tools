# HeroBlock

> Ficha de uso. Guía general: [`../../guia-bloques.md`](../../guia-bloques.md) ·
> Contrato técnico: [`block-contract.md`](../../../contracts/frontend/block-contract.md).

## Qué es

Una sección de cabecera a sangre completa (full-bleed): imagen de fondo, una capa de
tinte (overlay) por encima, y texto + botones centrados.

## Para qué sirve

Es lo primero que ve el visitante de una página: comunica de un vistazo dónde está y
qué puede hacer (reservar, descubrir el camping…). Se usa típicamente como primer bloque
de la home o de una landing.

## Cómo se instancia / cómo me lo pides

**Con skill:**
```
/add-block <site> <page> Hero
```
(el `BlockType` va sin el sufijo `Block`; la página debe existir — si no, `/create-page` primero).

**Pidiéndomelo:**
> "Añade un **Hero** a la home de site-demo con imagen de ejemplo, eyebrow 'Estamos aquí'
> y título 'Bienvenidos', y un CTA 'Reservar' que vaya a `#book`."

## Posibles variantes

**Ninguna.** El aspecto sale de la imagen + los tokens de tema; no hay eje `variant`.

## Dónde se añade en el proyecto

En el array `layout: BlockInstance[]` de una composición:
`{SITE_DIR}/src/compositions/{Pagina}Composition.tsx`. El contenido va inline en la instancia.

## Contenido

(Schema en `@hwe/core-ui/src/schemas/HeroBlock.schema.ts`.)

| Campo | Obligatorio | Tipo |
|---|---|---|
| `title` | sí | texto |
| `subtitle` | no | texto |
| `eyebrow` | no | texto (línea pequeña sobre el título) |
| `image` | sí | `{ src, alt }` |
| `ctas` | no | lista de `{ label, href, variant? }` — `variant`: `primary` · `accent` · `outline` · `ghost` |

## Ejemplo real

De `site-demo/src/compositions/HomeComposition.tsx`:

```ts
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
```
