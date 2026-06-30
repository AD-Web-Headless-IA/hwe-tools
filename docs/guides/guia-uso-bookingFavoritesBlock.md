# Guía práctica: Cómo usar BookingFavoritesBlock

> **Para:** equipo HWE — cómo instanciar BookingFavoritesBlock (galería de ofertas / alojamientos destacados) en composiciones.
> **Última actualización:** 2026-06-26

---

## Concepto rápido

BookingFavoritesBlock es la **galería de ofertas / alojamientos destacados** del motor de reservas (THR `<thr-favorites>`). Igual que [BookingSearchBlock](guia-uso-bookingSearchblock.md), no contiene la lógica de ningún motor: **delega** en un *adapter* que se resuelve según el motor del cliente (DEC-025 / DEC-027). El bloque solo aporta el contenedor de la sección, el título opcional y el estado de carga/error.

La diferencia clave con el resto de bloques: tiene **tres cosas que viven en sitios distintos**.

- **El motor + credenciales** — viven en `client.config.ts` (`TenantConfig.booking`), **una vez por sitio**. El bloque los lee vía `useTenant()`. **NUNCA van en el bloque** (DEC-025).
- **El toggle de activación** — `booking.features.favorites` en `client.config.ts`. Si está **off, el bloque no renderiza nada** (estado off deliberado, no es un error). Es lo que decide si la galería existe para el tenant (DEC-027).
- **El `content` de la instancia** — solo **presentación**: título de sección, cuántas ofertas traer/mostrar, grupo de sites. Es lo que pones en cada `BlockInstance`.

```
client.config.ts  →  booking: { engine, credenciales, features: { favorites: true } }  ← una vez por sitio
composición       →  { type: 'BookingFavoritesBlock', content }                         ← por instancia (presentación)
```

> ⚠️ **Sin `features.favorites: true` el bloque no se ve.** Es el error más común: colocas el bloque pero olvidas activar el feature en el tenant → renderiza `null` y parece que "no hace nada".

---

## Variantes

**No tiene.** A diferencia de BookingSearchBlock (`inline`/`sticky`/`modal`), la galería de favoritos tiene **una sola variante `default`** (DEC-027): renderiza el DOM propio del motor, así que el bloque solo aporta su `<section>` envolvente. La personalización de diseño es **solo de color**, vía overrides `[data-engine]` en el `globals.css` del cliente — no de layout. El campo `variant` del `BlockInstance` se ignora.

> Se podrán añadir variantes estructurales más adelante si un cliente necesita un tratamiento de sección distinto.

---

## Content — solo presentación

(Schema en `@hwe/core-ui/src/schemas/BookingFavoritesBlock.schema.ts`.) **Todos los campos son opcionales** → omítelos para los defaults del motor (THR: trae 6, muestra 3). Los nombres mapean **1:1 a atributos del widget THR** (`<thr-favorites>`); los motores ignoran los campos que no usan.

| Campo | Tipo | Atributo THR | Qué hace |
|---|---|---|---|
| `title` | string | — | encabezado de sección renderizado **por el bloque** (`<h2>`), no es un atributo del widget; también es el `aria-label` de la sección |
| `quantity` | number (entero +) | `quantity` | total de favoritos a traer (default 6) |
| `quantityToShow` | number (entero +) | `quantity-to-show` | favoritos visibles a la vez (default 3) |
| `sites` | string | `sites` | cuentas de grupo: IDs de site como string de array JSON, p.ej. `"[6955]"` |
| `attributes` | `Record<string,string>` | (varios) | escotilla de escape: atributos extra escritos tal cual sobre el widget |
| `debug` | boolean | — | muestra detalle de error verboso en el estado de error del bloque |

> **Nunca** pongas el motor, las credenciales ni el toggle en `content` — eso vive en `client.config.ts` (DEC-025 / DEC-027).

```typescript
{
  id: 'offers',
  type: 'BookingFavoritesBlock',
  content: {
    title: 'Our best offers',
    quantity: 9,        // trae 9
    quantityToShow: 3,  // muestra 3 a la vez
  },
}
```

---

## Activar el motor y el feature (una vez por sitio)

El motor y sus credenciales se declaran en `client.config.ts` como **unión discriminada por `engine`**, y se activa la galería con `features.favorites: true`.

```typescript
import type { TenantConfig } from '@hwe/core-ui';

export const config: TenantConfig = {
  name: 'site-demo',
  locale: 'fr',
  booking: {
    engine: 'thr',
    codeCamping: 'demosalons',
    features: { favorites: true },   // ← sin esto, BookingFavoritesBlock no se ve
  },
};
```

**Credenciales por motor** (idénticas a las de BookingSearchBlock — el `booking` es uno solo):

| Motor | Campos en `booking` | Adapter de favoritos |
|---|---|---|
| `thr` | `codeCamping: string`, `siteId?: string` | ✅ implementado |
| `mastercamping` | `idProperty: number`, `bookingUrl: string`, … | ⏳ placeholder — degrada |
| `witbooking` | `hotelId: string` | ⏳ placeholder — degrada |
| `resalys` | `propertyId: string` | ⏳ placeholder — degrada |

> Hoy **solo THR** tiene adapter de favoritos. En `mastercamping` (que sí tiene buscador) y el resto, el bloque degrada.
> La forma cómoda de configurar el `booking`: skill **`/setup-booking`**.

---

## Estados: off, degradación y error

El bloque distingue tres situaciones que **no son un crash**:

- **Feature off** (`features.favorites` ausente o `false`, o sin `booking`) → el bloque **renderiza `null`**. Es un off deliberado (DEC-027), no muestra ni mensaje.
- **Feature on pero el motor no tiene adapter de favoritos** (todo menos THR) → **degrada**: `DevWarning` en desarrollo, **nada** en producción. La composición no se rompe.
- **Fallo al montar el widget** → estado de error (`role="alert"`) con botón **Retry**.

Siempre engine-agnostic: el bloque pregunta al registry (`isFavoritesAdapterAvailable`), nunca hace `if (engine === …)`.

---

## Ejemplo completo: home con buscador + ofertas

```typescript
import { BlockRenderer, type BlockInstance } from '@hwe/core-ui';
import { clientBlocks } from '@/blocks/registry';

const layout: BlockInstance[] = [
  {
    id: 'hero-1',
    type: 'HeroBlock',
    content: {
      title: 'Camping Les Pins',
      subtitle: 'Mobile homes & pitches by the Mediterranean',
      image: { src: '/img/hero.jpg', alt: 'Aerial view of the camping and the beach' },
    },
  },
  {
    id: 'booking-search',
    type: 'BookingSearchBlock',
    variant: 'sticky',
    content: { widgetTitle: 'Check availability' },
  },
  {
    id: 'offers',
    type: 'BookingFavoritesBlock',
    content: {
      title: 'Our best offers',
      quantity: 9,
      quantityToShow: 3,
    },
  },
];

export function HomeComposition() {
  return <BlockRenderer layout={layout} blocks={clientBlocks} />;
}
```

Y en `client.config.ts` (el motor + el toggle, una vez por sitio):

```typescript
export const config: TenantConfig = {
  name: 'site-demo',
  locale: 'fr',
  booking: {
    engine: 'thr',
    codeCamping: 'demosalons',
    features: { favorites: true },   // activa la galería de ofertas
  },
};
```

---

## Cómo me lo pides

El motor y el toggle los asumo de `client.config.ts`; en el bloque solo me dices la presentación:

> "Añade la **galería de ofertas** debajo del buscador en la home de site-demo, que **traiga 9 y muestre 3**."

Para colocarlo en una página: skill **`/add-block <site> <page> BookingFavorites`**. Si el tenant aún no tiene `features.favorites`, recuérdame activarlo (o lo hago con `/setup-booking`).

---

## Dónde se añade en el proyecto

- **El bloque (presentación):** array `layout: BlockInstance[]` de una composición, en `{SITE_DIR}/src/compositions/{Pagina}Composition.tsx`.
- **El motor + credenciales + toggle (autoritativo):** `{SITE_DIR}/client.config.ts` → `booking` (con `features.favorites: true`). El bloque lo lee vía `useTenant()`, por lo que la app debe ir envuelta en `<TenantProvider>` (lo aseguran `/setup-booking` y `/scaffold-site`).
- **Overrides CSS del widget:** `{SITE_DIR}/src/app/globals.css`, con scope `[data-engine="<motor>"]` (el bloque expone `data-engine` en la `<section>`). Personalización **solo de color** (DEC-027): zero CSS de layout en el bloque, la presentación de la galería es del motor.

---

## Lo que se genera automáticamente (no tienes que hacer nada)

- **Carga del script / montaje del widget** del motor (THR: ILib v4 + `<thr-favorites>`) vía el adapter de favoritos resuelto del registry.
- **Render condicional por feature toggle** — `null` limpio cuando `features.favorites` está off.
- **Encabezado de sección** (`<h2>`) cuando pasas `title`, con tipografía de heading del tema.
- **Estado de carga** (`role="status"`, `aria-live="polite"`) mientras el widget monta.
- **Estado de error** (`role="alert"`) con botón de **Retry**.
- **Degradación silenciosa** si el motor no tiene adapter de favoritos (DevWarning en dev, nada en prod).
- **Limpieza del lifecycle** (`destroy`) al desmontar o re-navegar en SPA.
- **`data-engine` y `data-status`** en la `<section>` como hooks de CSS y de scope para los overrides del widget.
- **Centrado en el container** del sitio (`--width-container`) para que la galería no quede full-bleed.
