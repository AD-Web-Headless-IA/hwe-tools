# Local SEO standards — hospitality

> Rules specific to local search optimisation for hotels and campings. Local SEO drives direct bookings — a guest searching "camping near Roses" must find the client before finding an OTA.
>
> **Always loaded** by `seo-geo-specialist` during site setup and pre-deploy audits.

---

## NAP consistency (Name, Address, Phone)

NAP (Name, Address, Phone) must appear **identically** in:
- `<header>` / navigation (abbreviated name is acceptable)
- `<footer>` inside `<address>` (full NAP)
- JSON-LD `LocalBusiness` / `Campground` / `Hotel` structured data
- Google Business Profile (maintained by client, outside codebase)

Rules:
- **Same format, same spelling, every time.** "Camping Sol Mar" ≠ "Camping Sol-Mar" ≠ "Sol Mar Camping".
- **Full address** with street number, street name, postal code, city, and country code.
- **Phone in international format**: `+34 972 123 456` (no spaces or dots that differ between occurrences).
- The `client.config.ts` is the single source of truth for NAP — all HTML and JSON-LD must read from it, never hardcoded in a component.

---

## Address format

```
{Street name} {Number}
{Postal code} {City}
{Region}, {Country}
```

Example:
```
Av. de la Costa 45
17480 Roses
Girona, España
```

The `<address>` element must contain exactly this structure. The `PostalAddress` schema.org object must mirror it field by field.

---

## Geo coordinates

- Decimal degrees format (not DMS): `latitude: 42.2640, longitude: 3.1752`.
- Precision: at least 4 decimal places.
- Source: verified from Google Maps / the client's GPS, not estimated.
- Present in `GeoCoordinates` JSON-LD and optionally in `<meta name="geo.position">`.

```json
"geo": {
  "@type": "GeoCoordinates",
  "latitude": 42.2640,
  "longitude": 3.1752
}
```

---

## Location keywords

Location keywords must appear in:
- `<title>` — always
- `<h1>` — always (primary page heading)
- `<meta name="description">` — always
- First visible paragraph of the page — always
- At least one `<h2>` or `<h3>` — for sub-pages

Keyword pattern for hospitality:
```
{Type} en {City}           → "Camping en Roses"
{Type} cerca de {City}     → "Camping cerca de Girona"
{Type} en {Region}         → "Camping en la Costa Brava"
{Type} {Country}           → "Camping en España"
```

Use all four levels — users search at every granularity.

---

## Proximity keywords

Add proximity phrases to body copy and the accommodation description:
- Distance to beaches: `"à 500 m de la plage"`, `"a 5 minutos caminando del mar"`
- Distance to major cities: `"à 25 minutes de Perpignan"`, `"entre Roses et Cadaqués"`
- Distance to attractions: `"à 10 km du Parc Natural del Cap de Creus"`

These phrases mirror how users search and how LLMs construct location-aware answers.

Place at least 2 proximity phrases in:
- Homepage hero or first section
- Accommodation list page intro
- JSON-LD `additionalProperty` array

---

## hreflang (multilingual sites)

When the site has multiple languages (`i18n` active):
- Add `<link rel="alternate" hreflang="{lang}" href="{url}">` for every language version of every page.
- Include a self-referencing tag for the current page's language.
- Add `hreflang="x-default"` pointing to the default language version.
- The default language is defined in `client.config.ts → i18n.defaultLocale`.

---

## In simple terms

El SEO local es lo que hace que "camping cerca de Roses" devuelva tu cliente y no Booking.com.

| Regla | Por qué importa |
|---|---|
| NAP idéntico en todo el site | Google detecta inconsistencias y penaliza la confianza local |
| Coordenadas geo exactas | Aparece en Google Maps + respuestas de LLMs sobre ubicación |
| Keywords de localización en H1 | La señal de relevancia más fuerte para búsquedas locales |
| Frases de proximidad | Captura búsquedas como "entre Roses y Cadaqués" |
| hreflang | Evita que las versiones de idioma compitan entre sí en Google |

**Equivalente WordPress:** como el plugin WP Local Business o Yoast Local SEO, pero con reglas documentadas que el agente `seo-geo-specialist` verifica automáticamente antes de cada deploy.
