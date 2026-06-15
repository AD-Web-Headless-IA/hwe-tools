# BookingSearchBlock — motor THR

> Ficha de uso (motor **THR**). Guía general: [`../../../guia-bloques.md`](../../../guia-bloques.md) ·
> Arquitectura: [`booking-architecture.md`](../../../../diagrams/booking-architecture.md) ·
> Decisión: [DEC-025](../../../../architecture/decisions.md#dec-025--booking-adapter-pattern--engine-agnostic-blocks-with-ui-delegation).
>
> El bloque es **uno solo y engine-agnostic**; esta ficha cubre su uso **cuando el motor
> del cliente es THR**. Otros motores tendrán su ficha en `booking/{motor}/` con sus
> propios campos de contenido. El motor se elige en `client.config.ts`, no en el bloque.

## Qué es

El buscador de disponibilidad/reservas. No contiene la lógica de ningún motor: **delega**
en un *adapter* resuelto según el motor del cliente. Con THR, el adapter carga el script
ILib v4 y monta el Web Component `<thr-search-engine>`.

## Para qué sirve

Permitir al visitante buscar disponibilidad y entrar al motor de reservas del cliente,
con la presentación integrada en la web. THR es hoy el único motor implementado.

## Cómo se instancia / cómo me lo pides

**Importante — dos pasos distintos:**

1. **Configurar el motor del cliente** (una vez por sitio) → skill `/setup-booking`.
   Escribe `booking` en `client.config.ts`, añade dominios CSP, scaffolda los overrides
   CSS y asegura `TenantProvider`. **El motor y las credenciales NO van en el bloque.**
   ```
   /setup-booking --engine thr --codeCamping <id> [--siteId <id>] [--with-block]
   ```
2. **Colocar el bloque en una página** → con `--with-block` en el paso anterior, o:
   ```
   /add-block <site> <page> BookingSearch
   ```

**Pidiéndomelo:**
> "Mete el **buscador de reservas** en la home de site-demo, que sea **sticky debajo del
> menú** y con sombra."

(El motor ya lo asumo de `client.config.ts`; no me lo repitas en el bloque.)

## Posibles variantes

(CVA en `@hwe/core-ui/src/base-blocks/BookingSearchBlock/BookingSearchBlock.variants.ts`)

| Variante | Efecto |
|---|---|
| `inline` (por defecto) | el buscador fluye en la página, en su sitio |
| `sticky` | se queda fijo al hacer scroll (`position: sticky`, sin JS) |
| `modal` | oculto hasta un disparador (*diferido*, aún no operativo) |

### Personalizar el sticky

Basta con `variant: 'sticky'`. Por defecto se pega a `top: 0` y sin sombra. Si el Figma lo
quiere **debajo del menú** o con sombra, se ajustan dos tokens en el `globals.css` del
cliente (sin tocar código):

```css
:root {
  --booking-sticky-top: 4.5rem;                    /* alto del navbar → debajo del menú */
  --booking-sticky-shadow: var(--shadow-elevated); /* sombra al quedar fijo */
}
```

| Quieres… | Haces… |
|---|---|
| Pegado arriba, sin sombra | nada — es el default |
| Debajo del menú | `--booking-sticky-top: <alto del navbar>` |
| Con sombra | `--booking-sticky-shadow: var(--shadow-elevated)` |

## Dónde se añade en el proyecto

- **El bloque (presentación):** array `layout: BlockInstance[]` de una composición,
  `{SITE_DIR}/src/compositions/{Pagina}Composition.tsx`.
- **El motor + credenciales (autoritativo):** `{SITE_DIR}/client.config.ts` → `booking`
  (unión discriminada por motor, DEC-025). El bloque lo lee vía `useTenant()`, por lo que
  la app debe ir envuelta en `<TenantProvider>` (lo asegura `/setup-booking` / `/scaffold-site`).
- **Overrides CSS del widget:** `{SITE_DIR}/src/app/globals.css`, scope `[data-engine="thr"]`
  (ver [`thr-notes.md` §CSS](../../../../integrations/bookings/thr/thr-notes.md)).

## Contenido — solo presentación

(Schema en `@hwe/core-ui/src/schemas/BookingSearchBlock.schema.ts`.) Todo opcional →
omítelo para un buscador simple. Los nombres mapean 1:1 a atributos de `<thr-search-engine>`
(ver [`thr-ilib-v4.md` §4](../../../../integrations/bookings/thr/thr-ilib-v4.md)).

| Campo | Atributo THR | Qué hace |
|---|---|---|
| `widgetTitle` | `title` | título sobre el widget |
| `type` | `type` | filtro de tipo (`"1"`, `"2"` o sub-tipo, p.ej. `"Mobil-Home"`) |
| `hideCategoriesType` | `hide-categories-type` | oculta el selector de tipo |
| `hideCapacity` | `hide-capacity` | oculta el selector de capacidad |
| `searchText` | `search-text` | texto del botón buscar |
| `setDayOfWeek` | `set-day-of-week` | arranca en un día de la semana (inglés, p.ej. `"saturday"`) |
| `attributes` | (varios) | escotilla de escape: atributos extra del widget, tal cual |
| `debug` | — | muestra detalle de error en el estado de error del bloque |

> **Nunca** pongas el motor ni credenciales en `content` — eso es `client.config.ts` (DEC-025).

## Ejemplo real

De `site-demo/src/compositions/HomeComposition.tsx`:

```ts
{
  // El motor + credenciales vienen de client.config.ts (TenantConfig.booking, DEC-025);
  // esta instancia lleva solo presentación.
  id: 'booking-search-1',
  type: 'BookingSearchBlock',
  variant: 'inline',
  content: {
    widgetTitle: 'Check availability',
  },
},
```

Y en `site-demo/client.config.ts` (el motor, una vez por sitio):

```ts
export const config: TenantConfig = {
  name: 'site-demo',
  locale: 'fr',
  booking: { engine: 'thr', codeCamping: 'demosalons' },
};
```
