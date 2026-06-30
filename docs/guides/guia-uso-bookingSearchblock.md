# Guía práctica: Cómo usar BookingSearchBlock

> **Para:** equipo HWE — cómo instanciar BookingSearchBlock en composiciones con sus variantes y configuración.
> **Última actualización:** 2026-06-26

---

## Concepto rápido

BookingSearchBlock es el **buscador de disponibilidad/reservas**. No contiene la lógica de ningún motor: **delega** en un *adapter* que se resuelve según el motor del cliente (DEC-025). El bloque solo aporta el contenedor, el estado de carga/error y la presentación.

La diferencia clave con el resto de bloques: tiene **dos capas que viven en sitios distintos**.

- **El motor + credenciales** — viven en `client.config.ts` (`TenantConfig.booking`), **una vez por sitio**. El bloque los lee vía `useTenant()`. **NUNCA van en el bloque** (DEC-025).
- **El `content` de la instancia** — solo **presentación**: título del widget, filtros visibles, texto del botón, modo móvil. Es lo que pones en cada `BlockInstance`.

A nivel de instancia, igual que el resto de bloques, pasas `variant` y `content` como campos del `BlockInstance`. El `BlockRenderer` los reenvía al bloque, que lee el motor del tenant, ensambla la config del adapter (`credenciales + locale + content`) y delega el montaje. Todo lo que omitas en `content` usa su valor por defecto del motor.

```
client.config.ts  →  booking: { engine, credenciales }   ← una vez por sitio (autoritativo)
composición       →  { type: 'BookingSearchBlock', variant, content }  ← por instancia (presentación)
```

---

## Las 3 variantes

La variante controla **dónde y cómo se posiciona** el buscador en la página (eje de presentación CVA). Se pasa por `BlockInstance.variant`.

### 1. `inline` — En el flujo de la página (default)

El buscador fluye en su sitio dentro de la composición, como una sección más.

```typescript
{
  id: 'booking-search',
  type: 'BookingSearchBlock',
  variant: 'inline',
  content: {
    widgetTitle: 'Check availability',
  },
}
```

**Cuándo usarlo:** sección de búsqueda en home, página de alojamiento o página dedicada de reservas. Es lo que querrás el 90% de las veces.

---

### 2. `sticky` — Barra fija al hacer scroll

El buscador se pega (`position: sticky`, sin JS) y permanece visible mientras el visitante hace scroll. Se sitúa por debajo del Navbar (`z-40` < `z-50` del menú) y lleva fondo opaco para que el contenido no se transparente por detrás.

```typescript
{
  id: 'booking-search-sticky',
  type: 'BookingSearchBlock',
  variant: 'sticky',
  content: {
    widgetTitle: 'Find your stay',
    searchText: 'Search',
  },
}
```

**Cuándo usarlo:** cuando quieres que el visitante pueda buscar en cualquier momento sin volver arriba (páginas largas de alojamiento, landings).

#### Personalizar el sticky (sin tocar código)

Por defecto se pega a `top: 0` y sin sombra. Para ajustarlo al Figma se tocan **dos tokens** en el `globals.css` del cliente:

```css
:root {
  --booking-sticky-top: 4.5rem;                    /* alto del navbar → se pega debajo del menú */
  --booking-sticky-shadow: var(--shadow-elevated); /* sombra al quedar fijo */
}
```

| Quieres… | Haces… |
|---|---|
| Pegado arriba, sin sombra | nada — es el default |
| Debajo del menú | `--booking-sticky-top: <alto del navbar>` |
| Con sombra | `--booking-sticky-shadow: var(--shadow-elevated)` |

---

### 3. `modal` — Oculto hasta un disparador

El buscador se renderiza oculto (`hidden`) hasta que un disparador lo revela.

```typescript
{
  id: 'booking-search-modal',
  type: 'BookingSearchBlock',
  variant: 'modal',
  content: {
    widgetTitle: 'Check availability',
  },
}
```

> ⚠️ **Diferido — aún no operativo.** La clase CVA existe (`hidden`) pero todavía no hay disparador que lo abra. No lo uses en producción hasta que se complete.

---

## Modo móvil: disclosure (DEC-026)

En viewports pequeños el buscador puede **colapsarse bajo un botón** en lugar de ocupar toda la pantalla. Se activa con el campo `content.mobile`. Es un eje extensible: cada modo mapea a una estrategia en `disclosure/registry.ts`.

| Modo | Efecto |
|---|---|
| `accordion` | el buscador se expande en su sitio bajo un botón toggle |
| *(omitido)* | sin colapso — el widget se muestra siempre |

```typescript
{
  id: 'booking-search',
  type: 'BookingSearchBlock',
  variant: 'inline',
  content: {
    widgetTitle: 'Check availability',
    mobile: 'accordion',   // se colapsa en móvil tras un toggle
  },
}
```

El contenedor del widget **nunca se desmonta**: el adapter del motor sigue funcionando igual con o sin disclosure.

---

## Content — solo presentación

(Schema en `@hwe/core-ui/src/schemas/BookingSearchBlock.schema.ts`.) **Todos los campos son opcionales** → omítelos para un buscador simple por defecto. Los nombres mapean **1:1 a atributos del widget THR** (`<thr-search-engine>`); los motores ignoran los campos que no usan.

| Campo | Tipo | Atributo THR | Qué hace |
|---|---|---|---|
| `widgetTitle` | string | `title` | título sobre el widget (también es el `aria-label` de la sección) |
| `type` | string | `type` | filtro de tipo de alojamiento (`"1"`, `"2"` o sub-tipo, p.ej. `"Mobil-Home"`) |
| `hideCategoriesType` | boolean | `hide-categories-type` | oculta el selector de tipo de alojamiento |
| `hideCapacity` | boolean | `hide-capacity` | oculta el selector de capacidad |
| `searchText` | string | `search-text` | texto del botón de buscar |
| `setDayOfWeek` | string | `set-day-of-week` | arranca en un día de la semana (en inglés, p.ej. `"saturday"`) |
| `mobile` | `accordion` | — | modo de colapso en móvil (DEC-026, ver arriba) |
| `attributes` | `Record<string,string>` | (varios) | escotilla de escape: atributos extra escritos tal cual sobre el widget |
| `debug` | boolean | — | muestra detalle de error verboso en el estado de error del bloque |

> **Nunca** pongas el motor ni las credenciales en `content` — eso vive en `client.config.ts` (DEC-025). No existe override de motor por instancia.

---

## Configurar el motor (una vez por sitio)

El motor y sus credenciales se declaran en `client.config.ts` como una **unión discriminada por `engine`**. Cada motor declara sus propios campos reales (no hay `propertyId` genérico). Son identificadores de cuenta públicos, no secretos.

```typescript
import type { TenantConfig } from '@hwe/core-ui';

export const config: TenantConfig = {
  name: 'site-demo',
  locale: 'fr',
  // El bloque lee esto vía useTenant() — la app debe ir envuelta en <TenantProvider>.
  booking: { engine: 'thr', codeCamping: 'demosalons' },
};
```

**Credenciales por motor:**

| Motor | Campos en `booking` | Estado del adapter |
|---|---|---|
| `thr` | `codeCamping: string`, `siteId?: string` | ✅ implementado |
| `mastercamping` | `idProperty: number`, `bookingUrl: string`, `layout?`, `categoryGroupIds?`, `guestAges?`, `target?` | ✅ implementado |
| `witbooking` | `hotelId: string` | ⏳ placeholder — degrada |
| `resalys` | `propertyId: string` | ⏳ placeholder — degrada |

> La forma más cómoda de escribir esto: skill **`/setup-booking`** (configura `booking`, añade dominios CSP, scaffolda los overrides CSS y asegura `TenantProvider`).
> ```
> /setup-booking --engine thr --codeCamping <id> [--siteId <id>] [--with-block]
> ```

---

## Degradación: motor sin adapter

El bloque es **engine-agnostic** y pregunta al registry, nunca hace `if (engine === …)`. Hay dos situaciones que no son un crash:

- **Sin `booking` en el tenant** → error de configuración: se muestra un mensaje fijo (sin botón de reintentar, reintentar no ayudaría).
- **Motor configurado pero sin adapter implementado** (`witbooking`, `resalys`) → el bloque **degrada**: `DevWarning` en desarrollo, **nada** en producción. La composición no se rompe.

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
      image: { src: '/img/mh-confort-hero.jpg', alt: 'Mobile Home Confort Plus with sea view terrace' },
    },
  },
  {
    id: 'booking-search',
    type: 'BookingSearchBlock',
    variant: 'sticky',          // barra fija al hacer scroll
    content: {
      widgetTitle: 'Check availability',
      searchText: 'Search',
      mobile: 'accordion',      // colapsada bajo un toggle en móvil
    },
  },
  {
    id: 'gallery-photos',
    type: 'GalleryBlock',
    variant: 'slider-thumbs',
    content: {
      title: 'Photo gallery',
      images: [
        { src: '/img/mh-exterior.jpg', alt: 'Exterior view with pine trees', width: 1920, height: 1080 },
        { src: '/img/mh-living.jpg', alt: 'Living room and kitchen', width: 1920, height: 1080 },
      ],
    },
  },
];

export function AccommodationComposition() {
  return <BlockRenderer layout={layout} blocks={clientBlocks} />;
}
```

Y en `client.config.ts` (el motor, una vez por sitio):

```typescript
export const config: TenantConfig = {
  name: 'site-demo',
  locale: 'fr',
  booking: { engine: 'thr', codeCamping: 'demosalons' },
};
```

---

## Cómo me lo pides

Como el motor ya lo asumo de `client.config.ts`, en el bloque solo me dices la presentación:

> "Mete el **buscador de reservas** en la home de site-demo, que sea **sticky debajo del menú** y con sombra, y que en móvil se **colapse** bajo un botón."

Para colocarlo en una página: skill **`/add-block <site> <page> BookingSearch`** (o `--with-block` al hacer `/setup-booking`).

---

## Dónde se añade en el proyecto

- **El bloque (presentación):** array `layout: BlockInstance[]` de una composición, en `{SITE_DIR}/src/compositions/{Pagina}Composition.tsx`.
- **El motor + credenciales (autoritativo):** `{SITE_DIR}/client.config.ts` → `booking`. El bloque lo lee vía `useTenant()`, por lo que la app debe ir envuelta en `<TenantProvider>` (lo aseguran `/setup-booking` y `/scaffold-site`).
- **Overrides CSS del widget:** `{SITE_DIR}/src/app/globals.css`, con scope `[data-engine="<motor>"]` (el bloque expone `data-engine` en la `<section>`). Zero CSS en el bloque: la presentación del widget es del motor.

---

## Lo que se genera automáticamente (no tienes que hacer nada)

- **Carga del script / montaje del widget** del motor (THR: ILib v4 + `<thr-search-engine>`) vía el adapter resuelto del registry.
- **Estado de carga** (`role="status"`, `aria-live="polite"`) mientras el widget monta.
- **Estado de error** (`role="alert"`) con botón de **Retry** — salvo error de configuración, donde reintentar no ayuda y no se ofrece.
- **Degradación silenciosa** si el motor no tiene adapter (DevWarning en dev, nada en prod).
- **Limpieza del lifecycle** (`destroy`) al desmontar o re-navegar en SPA — sin fugas de DOM ni de globals.
- **`data-engine` y `data-status`** en la `<section>` como hooks de CSS y de scope para los overrides del widget.
- **Centrado en el container** del sitio (`--width-container`) para que el widget no quede full-bleed.
