# Catálogo de bloques — fichas de uso

> Una ficha por bloque, con el mismo formato: qué es · para qué sirve · cómo se instancia
> o cómo me lo pides · variantes · dónde se añade · ejemplo real.
>
> Para el flujo general (cómo añadir un bloque a una página, cómo pedírmelo, crear bloques
> nuevos), lee la guía general: [`../guia-bloques.md`](../guia-bloques.md).

## Bloques disponibles hoy

| Bloque | Categoría | Variantes | Ficha |
|---|---|---|---|
| `HeroBlock` | frontend | — | [frontend/HeroBlock.md](./frontend/HeroBlock.md) |
| `MediaTextBlock` | frontend | `media-left` · `media-right` | [frontend/MediaTextBlock.md](./frontend/MediaTextBlock.md) |
| `BookingSearchBlock` | booking · THR | `inline` · `sticky` · `modal`¹ | [booking/thr/BookingSearchBlock.md](./booking/thr/BookingSearchBlock.md) |

¹ `modal` está diferido (aún no operativo).

## Organización

- `frontend/` — bloques de contenido / presentación.
- `booking/{motor}/` — bloques de reservas, **un subdirectorio por motor** (`thr/`,
  y `witbooking/`, `mastercamping/`, `resalys/` cuando se implementen). El bloque
  `BookingSearchBlock` es engine-agnostic (el motor se elige en `client.config.ts`),
  pero su ficha vive bajo el motor porque los campos de contenido son específicos de
  cada motor. Los futuros widgets de reservas (`BookingFavoritesBlock`,
  `BookingSimpleBlock`…) seguirán el mismo esquema por motor.

## Aún sin componente (no se pueden colocar todavía)

Existen schemas para `AccommodationGrid`, `Amenities`, `Reviews` y `Booking`, pero **no
tienen componente** todavía, así que no se instancian en una página. Necesitar uno de
estos es un caso de "crear bloque nuevo" (`/scaffold-block` — ver la guía general).
