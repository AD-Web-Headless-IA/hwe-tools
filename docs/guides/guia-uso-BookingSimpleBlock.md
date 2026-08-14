# Guía práctica: Cómo usar BookingSimpleBlock

> **Para:** equipo HWE — cómo instanciar BookingSimpleBlock (bloque de disponibilidad por categoría) en composiciones.
> **Última actualización:** 2026-06-26

---

## Concepto rápido

BookingSimpleBlock es el **bloque de disponibilidad acotado por categoría** del motor de reservas (THR `<thr-simpleblock>`). Permite mostrar la disponibilidad de **categorías de alojamiento concretas** (p.ej. "Mobil-Home Confort" + "Cottage 6p") en su propia sección, sin el buscador general. Igual que el resto de la familia booking, no contiene la lógica del motor: **delega** en un *adapter* resuelto según el motor del cliente (DEC-025 / DEC-027).

La diferencia clave con el resto de bloques: tiene **tres cosas que viven en sitios distintos**.

- **El motor + credenciales** — viven en `client.config.ts` (`TenantConfig.booking`), **una vez por sitio**. El bloque los lee vía `useTenant()`. **NUNCA van en el bloque** (DEC-025).
- **El toggle de activación** — `booking.features.simpleblock` en `client.config.ts`. Si está **off, el bloque no renderiza nada** (estado off deliberado, no es un error). Decide si el widget existe para el tenant (DEC-027).
- **El `content` de la instancia** — solo **presentación**, pero con una particularidad: **`categories` es obligatorio**. Un bloque colocado apunta siempre a categorías concretas.

```
client.config.ts  →  booking: { engine, credenciales, features: { simpleblock: true } }  ← una vez por sitio
composición       →  { type: 'BookingSimpleBlock', content: { categories: [...] } }       ← por instancia
```

> ⚠️ **Dos requisitos imprescindibles:** sin `features.simpleblock: true` en el tenant el bloque renderiza `null`; y sin `categories` (≥1) en el `content` el schema Zod **rechaza** la instancia. Son los dos errores más comunes.

---

## Variantes

**No tiene.** Como [BookingFavoritesBlock](guia-uso-bookingFavoritesBlock.md) y a diferencia del buscador, tiene **una sola variante `default`** (DEC-027): renderiza el DOM propio del motor, así que el bloque solo aporta su `<section>` envolvente. La personalización es vía overrides `[data-engine]` en el `globals.css` del cliente, no de layout. El campo `variant` del `BlockInstance` se ignora.

---

## Content — presentación + `categories` (obligatorio)

(Schema en `@hwe/core-ui/src/schemas/BookingSimpleBlock.schema.ts`.) Solo `categories` es obligatorio; el resto opcional. Los nombres mapean **1:1 a atributos del widget THR** (`<thr-simpleblock>`); los motores ignoran los campos que no usan.

| Campo | Tipo | Atributo THR | Qué hace |
|---|---|---|---|
| `categories` | **`string[]` (≥1, requerido)** | `categories` | IDs de categoría de alojamiento. Cada uno puede llevar enterprise id, p.ej. `"12"`, `"7"`, `"18675,13"` |
| `title` | string | — | encabezado de sección renderizado **por el bloque** (`<h2>`); también es el `aria-label` de la sección |
| `showPicture` | boolean | `show-picture` | muestra la foto del alojamiento |
| `searchType` | `'1'` \| `'2'` | `search-type` | modo de búsqueda por defecto: `"1"` flexible (por mes) · `"2"` fechas exactas |
| `day` | string | `day` | día de llegada por defecto en modo flexible (**en francés**: `lundi`…`dimanche`) |
| `site` | string | `site` | cuentas de grupo: site concreto |
| `attributes` | `Record<string,string>` | (varios) | escotilla de escape: atributos extra (`category-type`, `one-mode`, `date`, `duration`) tal cual |
| `debug` | boolean | — | muestra detalle de error verboso en el estado de error del bloque |

> **Nunca** pongas el motor, las credenciales ni el toggle en `content` — eso vive en `client.config.ts` (DEC-025 / DEC-027).

```typescript
{
  id: 'availability-mobilhomes',
  type: 'BookingSimpleBlock',
  content: {
    title: 'Mobile homes availability',
    categories: ['12', '7'],   // requerido — categorías concretas
    showPicture: true,
    searchType: '1',           // flexible (por mes)
  },
}
```

---

## Activar el motor y el feature (una vez por sitio)

El motor y sus credenciales se declaran en `client.config.ts` (unión discriminada por `engine`), y se activa el widget con `features.simpleblock: true`.

```typescript
import type { TenantConfig } from '@hwe/core-ui';

export const config: TenantConfig = {
  name: 'site-demo',
  locale: 'fr',
  booking: {
    engine: 'thr',
    codeCamping: 'demosalons',
    features: { simpleblock: true },   // ← sin esto, BookingSimpleBlock no se ve
  },
};
```

**Credenciales por motor** (idénticas a las del resto de bloques booking — el `booking` es uno solo):

| Motor | Campos en `booking` | Adapter de simple-block |
|---|---|---|
| `thr` | `codeCamping: string`, `siteId?: string` | ✅ implementado |
| `mastercamping` | `idProperty: number`, `bookingUrl: string`, … | ⏳ placeholder — degrada |
| `witbooking` | `hotelId: string` | ⏳ placeholder — degrada |
| `resalys` | `propertyId: string` | ⏳ placeholder — degrada |

> Hoy **solo THR** tiene adapter de simple-block. En el resto, el bloque degrada.
> Las features se pueden combinar: `features: { favorites: true, simpleblock: true }`.

---

## Estados: off, degradación y error

Tres situaciones que **no son un crash** (idénticas a BookingFavoritesBlock):

- **Feature off** (`features.simpleblock` ausente o `false`, o sin `booking`) → el bloque **renderiza `null`**. Off deliberado (DEC-027), sin mensaje.
- **Feature on pero el motor no tiene adapter de simple-block** (todo menos THR) → **degrada**: `DevWarning` en desarrollo, **nada** en producción.
- **Fallo al montar el widget** → estado de error (`role="alert"`) con botón **Retry**.

Siempre engine-agnostic: el bloque pregunta al registry (`isSimpleBlockAdapterAvailable`), nunca hace `if (engine === …)`.

---

## Ejemplo completo: página de tipo de alojamiento

```typescript
import { BlockRenderer, type BlockInstance } from '@hwe/core-ui';
import { clientBlocks } from '@/blocks/registry';

const layout: BlockInstance[] = [
  {
    id: 'hero-1',
    type: 'HeroBlock',
    content: {
      title: 'Mobile Homes',
      subtitle: 'Comfort and space for the whole family',
      image: { src: '/img/mh-hero.jpg', alt: 'Mobile home terrace among the pines' },
    },
  },
  {
    id: 'availability',
    type: 'BookingSimpleBlock',
    content: {
      title: 'Check availability for our mobile homes',
      categories: ['12', '7'],   // categorías de mobile-home
      showPicture: true,
      searchType: '2',           // fechas exactas
    },
  },
  {
    id: 'gallery',
    type: 'GalleryBlock',
    variant: 'grid',
    content: {
      title: 'Photo gallery',
      images: [
        { src: '/img/mh-1.jpg', alt: 'Living room with equipped kitchen', width: 800, height: 600 },
        { src: '/img/mh-2.jpg', alt: 'Double bedroom with forest view', width: 800, height: 600 },
      ],
    },
  },
];

export function MobileHomesComposition() {
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
    features: { simpleblock: true },
  },
};
```

---

## Cómo me lo pides

El motor y el toggle los asumo de `client.config.ts`; en el bloque me dices la presentación y, sobre todo, **qué categorías**:

> "Añade el **bloque de disponibilidad** en la página de mobile-homes de site-demo, para las **categorías 12 y 7**, con foto y en modo fechas exactas."

Para colocarlo en una página: skill **`/add-block <site> <page> BookingSimple`**. Si el tenant aún no tiene `features.simpleblock`, recuérdame activarlo (o lo hago con `/setup-booking`).

---

## Dónde se añade en el proyecto

- **El bloque (presentación + categorías):** array `layout: BlockInstance[]` de una composición, en `{SITE_DIR}/src/compositions/{Pagina}Composition.tsx`.
- **El motor + credenciales + toggle (autoritativo):** `{SITE_DIR}/client.config.ts` → `booking` (con `features.simpleblock: true`). El bloque lo lee vía `useTenant()`, por lo que la app debe ir envuelta en `<TenantProvider>` (lo aseguran `/setup-booking` y `/scaffold-site`).
- **Overrides CSS del widget:** `{SITE_DIR}/src/app/globals.css`, con scope `[data-engine="<motor>"]` (el bloque expone `data-engine` en la `<section>`). Personalización vía tema (DEC-027): zero CSS de layout en el bloque, la presentación del widget es del motor.

---

## Lo que se genera automáticamente (no tienes que hacer nada)

- **Carga del script / montaje del widget** del motor (THR: ILib v4 + `<thr-simpleblock>`) vía el adapter resuelto del registry.
- **Render condicional por feature toggle** — `null` limpio cuando `features.simpleblock` está off.
- **Validación Zod** de `categories` (≥1) en el boundary — una instancia sin categorías se rechaza.
- **Encabezado de sección** (`<h2>`) cuando pasas `title`, con tipografía de heading del tema.
- **Estado de carga** (`role="status"`, `aria-live="polite"`) mientras el widget monta.
- **Estado de error** (`role="alert"`) con botón de **Retry**.
- **Degradación silenciosa** si el motor no tiene adapter de simple-block (DevWarning en dev, nada en prod).
- **Limpieza del lifecycle** (`destroy`) al desmontar o re-navegar en SPA.
- **`data-engine` y `data-status`** en la `<section>` como hooks de CSS y de scope para los overrides del widget.
- **Centrado en el container** del sitio (`--width-container`) para que el widget no quede full-bleed.
