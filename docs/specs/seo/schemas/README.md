# JSON-LD schema templates

> One file per schema type. Use `@graph` to combine multiple schemas on a single page. Fields marked `{{VARIABLE}}` are injected at runtime from `client.config.ts` or from Payload CMS content. Never include a field whose value would be empty — omit it entirely.
>
> **Rule:** every schema must be rendered in `<head>` as `<script type="application/ld+json">`, not in `<body>`, and must be present in the initial SSR HTML (no client-side injection).

---

## Page → schema mapping

| Page / context | Required schemas | Optional schemas |
|---|---|---|
| Camping homepage | `campground-homepage.json` | `organization.json`, `faq.json` |
| Hotel homepage | `campground-homepage.json` (use Hotel type) | `organization.json`, `faq.json` |
| Restaurant / bar page | `restaurant.json` | `faq.json` |
| Natural environment / surroundings page | `environment-tourist-attraction.json` | — |
| Individual accommodation page | `accommodation-single.json` | `reviews.json` |
| Accommodation list page | `accommodation-list.json` | — |
| Reviews / testimonials section | `reviews.json` | — |
| Offers / promotions page | `offers.json` | — |
| FAQ page or FAQ section | `faq.json` | — |
| Events page or event detail | `event.json` | — |
| Any page with breadcrumbs | `breadcrumbs.json` | — |
| All pages (footer / global) | `organization.json` | — |

---

## Schema files

| File | `@type` | When to use |
|---|---|---|
| `campground-homepage.json` | `Campground` or `Hotel` | Main homepage of any hospitality site |
| `restaurant.json` | `Restaurant` | Restaurant, bar, or food service page |
| `environment-tourist-attraction.json` | `TouristAttraction` | Natural surroundings, local area page |
| `accommodation-single.json` | `CampingPitch` or `HotelRoom` or `LodgingBusiness` | Individual accommodation detail page |
| `accommodation-list.json` | `ItemList` of accommodations | Accommodation listing / catalogue page |
| `reviews.json` | `AggregateRating` + `Review[]` | Guest reviews section or page |
| `offers.json` | `Offer` | Promotions, packages, seasonal deals |
| `faq.json` | `FAQPage` | FAQ section (3-5 questions per page) |
| `event.json` | `Event` | Events, animations, activities |
| `breadcrumbs.json` | `BreadcrumbList` | Any page deeper than homepage |
| `organization.json` | `Organization` | Global — injected on every page |

---

## Combining schemas with @graph

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

The `@graph` pattern avoids repeating `"@context"` and allows Google to understand relationships between entities on the same page.
