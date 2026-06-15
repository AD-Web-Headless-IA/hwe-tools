# Guía de uso — Crear y añadir bloques

> Cómo montar páginas con bloques en un sitio hwe: qué bloques existen, qué variantes
> y campos tiene cada uno, y **cómo pedírmelo a mí (Claude)** para que lo haga bien a
> la primera. Pensada para el día a día, no para entender la arquitectura interna.
>
> Si quieres el *porqué* del sistema, lee [`guia-conceptos.md`](./guia-conceptos.md).
> Para el contrato técnico de un bloque, [`block-contract.md`](../contracts/frontend/block-contract.md).

---

## Lo primero: hay dos cosas distintas que llamamos "crear un bloque"

No son lo mismo, y conviene saber cuál pides porque el trabajo (y a quién se lo pides) cambia:

| Lo que quieres | Qué es | Cómo se hace |
|---|---|---|
| **Poner un bloque que YA existe en una página** (lo habitual, ~90%) | Añadir una *instancia* de un bloque del catálogo a una composición, con su contenido | `/add-block` o pedírmelo en lenguaje natural |
| **Crear un bloque que NO existe todavía** | Inventar un tipo de sección nuevo (5 ficheros, schema, tests, registro) | `/scaffold-block` + implementación TDD |

La mayoría de las veces lo que necesitas es lo primero: **colocar un bloque del catálogo en una página y rellenar su contenido**. Empieza por ahí.

---

## Parte 1 — Añadir un bloque existente a una página

### Qué es una "página" aquí

Una página es una **composición**: un fichero `src/compositions/{Nombre}Composition.tsx` que contiene un array `layout` de instancias de bloque. Cada instancia dice *qué bloque*, *qué variante* y *qué contenido*. Ejemplo real (`site-demo/src/compositions/HomeComposition.tsx`):

```ts
const layout: BlockInstance[] = [
  {
    id: 'hero-1',
    type: 'HeroBlock',
    content: { title: 'Welcome to site-demo', /* … */ },
  },
  {
    id: 'booking-search-1',
    type: 'BookingSearchBlock',
    variant: 'inline',
    content: { widgetTitle: 'Check availability' },
  },
];
```

Cada instancia tiene la misma forma (`BlockInstance`):

| Campo | Obligatorio | Qué es |
|---|---|---|
| `id` | sí | identificador único dentro de la página |
| `type` | sí | nombre del bloque, **con** sufijo `Block` (`HeroBlock`, `MediaTextBlock`…) |
| `variant` | no | la presentación (ver el catálogo abajo); si lo omites, usa la variante por defecto |
| `content` | sí | los datos del bloque (textos, imágenes, CTAs…) — **solo presentación, nunca credenciales** |

> El **contenido va inline** en el array de la composición (así trabaja `site-demo`). No hay un `fake-content.ts` aparte.

### Las dos formas de hacerlo

**A) Con la skill** (determinista, valida rutas y SEO):

```
/create-page <site> <page>      ← solo si la página no existe aún
/add-block <site> <page> <BlockType>
```

Ojo: en `/add-block` el `BlockType` va **sin** el sufijo `Block` (`Hero`, `MediaText`, `BookingSearch`). La página tiene que existir antes — si no, te dirá que corras `/create-page`.

**B) Pidiéndomelo a mí** (lenguaje natural). Es lo más cómodo; mira la Parte 3 para cómo redactarlo bien.

---

## Parte 2 — El catálogo: bloques, variantes y campos

> ⚠️ **Solo estos 3 bloques renderizan hoy.** Hay schemas en el repo para otros
> (`AccommodationGrid`, `Amenities`, `Reviews`, `Booking`) pero **aún no tienen
> componente**, así que no se pueden colocar en una página todavía. Si necesitas uno
> de esos, es un caso de la Parte 4 (crear bloque nuevo).

Cada bloque tiene su **ficha de uso** (qué es · para qué sirve · cómo se instancia ·
variantes · dónde se añade · ejemplo real) en [`bloques/`](./bloques/README.md):

| Bloque | Categoría | Variantes | Ficha |
|---|---|---|---|
| `HeroBlock` | frontend | — | [HeroBlock.md](./bloques/frontend/HeroBlock.md) |
| `MediaTextBlock` | frontend | `media-left` · `media-right` | [MediaTextBlock.md](./bloques/frontend/MediaTextBlock.md) |
| `BookingSearchBlock` | booking · THR | `inline` · `sticky` · `modal`¹ | [BookingSearchBlock.md](./bloques/booking/thr/BookingSearchBlock.md) |

¹ `modal` está diferido (aún no operativo).

**Atajo a lo que más se pregunta:** el buscador **sticky** → `variant: 'sticky'` (y, si el
Figma lo quiere debajo del menú o con sombra, dos tokens en `globals.css`). Detalle en la
[ficha de BookingSearchBlock](./bloques/booking/thr/BookingSearchBlock.md#personalizar-el-sticky).

---

## Parte 3 — Cómo pedírmelo a mí (Claude)

No necesitas hablar en "código". Pero cuanto más concreto, menos ida y vuelta. Para
**añadir un bloque** dame, idealmente, estas 4 cosas:

1. **Qué bloque** — del catálogo de arriba (Hero, MediaText, BookingSearch).
2. **En qué página** — el sitio y la página (`site-demo`, home / `landing-verano`…).
3. **Qué variante** — si aplica (p.ej. MediaText `media-right`, Booking `sticky`).
4. **El contenido** — textos, imágenes, CTAs… o dime "pon contenido de ejemplo realista".

### Ejemplos de cómo decírmelo

> "Añade un **MediaTextBlock** a la **home** de **site-demo**, variante **media-right**,
> con título 'Nuestras piscinas', un párrafo de relleno y un CTA 'Ver más' que vaya a
> `/piscinas`."

> "Mete el **buscador de reservas** en la home, que sea **sticky debajo del menú** y con
> sombra."

> "En la página de **contacto** de site-demo añade un **Hero** con imagen de ejemplo,
> eyebrow 'Estamos aquí' y título 'Contáctanos'."

> "No me acuerdo de los campos del MediaText — añádelo con contenido de ejemplo realista
> y luego lo retoco."

Si no me das algún dato, **asumo lo más razonable y te lo digo** (variante por defecto,
contenido de ejemplo, página `home` de `site-demo`). Si algo es ambiguo de verdad, pregunto.

### Lo que NO hace falta que me digas

- El `id` de la instancia — lo genero yo.
- El sufijo `Block` exacto, los imports o el registro — me encargo.
- El motor de reservas al añadir el buscador — eso ya está en `client.config.ts` (es `/setup-booking`, no este bloque).

---

## Parte 4 — Crear un bloque nuevo (no existe en el catálogo)

Si lo que necesitas **no está** en la Parte 2, es un bloque nuevo. Esto es trabajo de
sistema (no de página) y sigue el contrato de bloque: 5 ficheros (`*.tsx`,
`*.variants.ts`, `*.types.ts`, schema, test), registro y tests TDD.

- **Skill:** `/scaffold-block <Nombre> [--target base|client] [--variants a,b,...]`
  crea el esqueleto de los 5 ficheros listo para rellenar.
- **base** = bloque de plataforma (en `@hwe/core-ui`, reutilizable por todos los clientes).
- **client** = bloque propio de un cliente (Levels 1/2/3 en `src/blocks/` de su repo).

Cómo pedírmelo: dime **qué sección es, qué campos de contenido necesita y qué variantes**,
y si va en plataforma o en un cliente concreto. Por convención técnica, primero
acordamos el diseño (specs antes que código) y luego implemento con tests.

> Para entender los 3 niveles de bloque cliente (re-export / slots / full custom) y el
> contrato completo, mira [`block-contract.md`](../contracts/frontend/block-contract.md)
> y la sección de bloques en [CLAUDE.md](../../CLAUDE.md).

---

## Resumen rápido

- **Añadir un bloque del catálogo a una página** → `/add-block` o pídemelo: bloque + página + variante + contenido.
- **Bloques disponibles hoy:** `HeroBlock` (sin variantes), `MediaTextBlock` (`media-left`/`media-right`), `BookingSearchBlock` (`inline`/`sticky`/`modal`).
- **Buscador sticky** → `variant: 'sticky'`; debajo del menú/sombra → tokens en `globals.css`.
- **El motor de reservas no va en el bloque** → `client.config.ts` vía `/setup-booking`.
- **Bloque que no existe** → `/scaffold-block` (trabajo de sistema, diseño antes que código).
