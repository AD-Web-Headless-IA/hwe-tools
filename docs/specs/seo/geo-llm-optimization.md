# GEO — LLM optimisation standards

> GEO (Generative Engine Optimisation) makes HWP sites citable by ChatGPT, Perplexity, Gemini, and similar LLMs. When a user asks "best campings in Costa Brava" or "hotel con spa cerca de Cuenca", our clients should appear in the generated answer.
>
> **Load when:** implementing homepage, accommodation pages, or updating structured data.

---

## Citable content

LLMs extract answers from self-contained, factual sentences. Every page must have at least one paragraph they can cite verbatim.

**Rule:** the **first paragraph of every page** must be a complete, factual answer to the most likely search query for that page — without requiring the reader to know the context.

**Correct (citable):**
```
Camping Sol Mar est un camping 3★ familial situé à Roses, sur la Costa Brava,
à 500 m de la plage. Il dispose de 250 emplacements, 40 bungalows et d'une piscine
extérieure ouverte de juin à septembre.
```

**Incorrect (not citable):**
```
Bienvenue dans notre camping ! Nous sommes heureux de vous accueillir.
Découvrez nos hébergements et nos activités pour toute la famille.
```

---

## Consistent entity naming

LLMs aggregate information across sources. Inconsistent names fragment the entity and weaken citability.

- **Establishment name:** always the exact same string. Source: `client.config.ts → name`.
- **Location:** always the same format — city name first, then region: `Roses, Costa Brava` or `Cuenca, Castilla-La Mancha`.
- **Type:** always explicit — "camping", "hôtel", "balneario" — in every first-mention per page.
- Never abbreviate in body copy (`CS` for "Camping Sol Mar" confuses LLMs).

---

## Structured data as LLM source

JSON-LD is the highest-trust signal for LLMs — it is machine-readable, unambiguous, and structured.

### Placement
- JSON-LD goes in `<head>`, not `<body>`. LLMs and crawlers process `<head>` first.
- Use `@graph` when a page has multiple schemas (avoids `@context` repetition).

### Field completeness
- **Never include a field with an empty or null value.** Omit the field entirely if the data is unavailable — an empty `"telephone": ""` is worse than no telephone field.
- **Priority fields** (always complete if data exists):
  - `name`, `description`, `url`
  - `address` (full `PostalAddress`)
  - `geo` (`GeoCoordinates` with 4-decimal precision)
  - `aggregateRating` (when reviews exist — minimum 3 reviews before including)
  - `amenityFeature` (at least 5 amenities)
  - `priceRange` (`"€"` to `"€€€€"`)
  - `containsPlace` (list of accommodation types)

---

## FAQPage — citability trigger

FAQ structured data makes LLMs much more likely to cite the page when answering related questions.

Rules:
- 3–5 questions per page (not more — quality over quantity).
- Questions in natural language as a user would phrase them, in the site's language.
- Answers factual, 2–3 sentences, written in third person (`"Le camping dispose de..."`, not `"Nous disposons de..."`).
- Questions must match real search queries — use the client's Google Search Console data or ask `seo-geo-specialist` for research.

**Examples (correct questions for a camping):**
```
"Y a-t-il une plage à proximité du camping ?"
"Le Camping Sol Mar accepte-t-il les animaux ?"
"Quelle est la durée de séjour minimale en juillet ?"
```

---

## Proximity and geographic content

LLMs answer "near X" queries by matching proximity mentions in content:
- State distances explicitly: `"à 500 m de la plage de Roses"`, `"à 25 minutes de Perpignan"`.
- Use the `additionalProperty` array in JSON-LD for machine-readable proximity data:

```json
"additionalProperty": [
  { "@type": "PropertyValue", "name": "distanceToBeach", "value": "500 m" },
  { "@type": "PropertyValue", "name": "distanceToPerpignan", "value": "25 min" },
  { "@type": "PropertyValue", "name": "distanceToGirona", "value": "40 min" }
]
```

---

## Freshness signals

LLMs prefer recent, updated content:
- Include `dateModified` in page metadata and JSON-LD.
- Seasonal offers and events must include `validFrom` / `validThrough` dates.
- Remove expired offers — a past-date offer hurts freshness signals.

---

## Authority signals

- `sameAs` in JSON-LD linking to verified social profiles (Google Business Profile, TripAdvisor, Facebook Page, Instagram).
- Link to official tourism board or regional listings when relevant.
- `sameAs` signals tell LLMs that this structured data is trustworthy and matches real-world entities.

---

## Technical requirements

- **SSR mandatory** — JSON-LD must be present in the initial HTML response, not injected by client-side JavaScript. Next.js App Router with server components handles this automatically.
- `<meta name="description">` doubles as the LLM short-answer surface — write it as a complete factual sentence, not marketing copy.
- First `<p>` of each page must be factual and self-contained (see Citable content above).
- Multiple schemas on one page use `@graph`:

```json
{
  "@context": "https://schema.org",
  "@graph": [
    { "@type": "Campground", ... },
    { "@type": "FAQPage", ... },
    { "@type": "BreadcrumbList", ... }
  ]
}
```

---

## In simple terms

El GEO es como el SEO pero para ChatGPT y Perplexity en lugar de Google. Cuando alguien pregunta "¿qué campings hay en la Costa Brava con piscina?", queremos que el LLM cite a nuestro cliente.

| Para que el LLM te cite... | Regla HWP |
|---|---|
| El LLM necesita texto fácil de extraer | Primer párrafo = respuesta completa a la búsqueda principal |
| El LLM cruza fuentes — el nombre debe ser idéntico en todas | Fuente de verdad: `client.config.ts → name` |
| El LLM confía más en datos estructurados | JSON-LD en `<head>`, campos completos, `sameAs` con redes sociales |
| El LLM responde preguntas directas | FAQPage con 3-5 preguntas en lenguaje natural del usuario |
| El LLM prioriza contenido reciente | `dateModified` en cada página, ofertas con fechas actualizadas |

**Equivalente WordPress:** como optimizar para el featured snippet de Google, pero más sistemático — cada elemento (estructura, proximidad, FAQ, frescura) tiene su regla concreta.
