# Source — Hotel Balneario Fuente de Cabriel

> First visual reference fed into the design system phase.
> Methodology: see [`../plan.md`](../plan.md). Every classification decision below is logged in the **Classified** table of that plan.

## Source repo

- **Path:** `../../../figma-makes/hotel-balneario-fuente-de-cabriel/`
- **Imported:** 2026-05-18 (tag `import-2026-05-18`)
- **Auto-generated analysis:** [`../../../memory-bank/clients/hotel-balneario-fuente-de-cabriel/figma-analysis.md`](../../../architecture/clients/hotel-balneario-fuente-de-cabriel/figma-analysis.md)

## Pending classification

### Section blocks

From `figma-makes/hotel-balneario-fuente-de-cabriel/src/app/components/`:

- [ ] `Navbar`
- [ ] `HeroSection`
- [ ] `BookingBar`
- [ ] `HotelSection`
- [ ] `CasasRuralesSection`
- [ ] `BalnearioSection`
- [ ] `RestauranteSection`
- [ ] `OcioSection`
- [ ] `OfertasSection`
- [ ] `PartnersSection`
- [ ] `SiteFooter`

### Pages

From `figma-makes/hotel-balneario-fuente-de-cabriel/src/app/`:

- [ ] `HomePage` (composition candidate)
- [ ] `ElHotelPage`
- [ ] `BalnearioPage`
- [ ] `CasasRuralesPage`
- [ ] `CasitaRusticaPage` (page template candidate — "accommodation detail")
- [ ] `GastronomiaPage`
- [ ] `OcioPage`
- [ ] `OfertasPage`
- [ ] `GaleriaPage`
- [ ] `ContactoPage`

### UI primitives

From `figma-makes/hotel-balneario-fuente-de-cabriel/src/app/components/ui/`:

- [ ] Whole set — decide whether to adopt shadcn/ui verbatim, fork into `@hwp/core-ui/primitives/`, or pick on demand.

## Notes specific to this source

- Some secondary pages (`ElHotelPage`, `GastronomiaPage`, `OcioPage`, `OfertasPage`, `GaleriaPage`, `ContactoPage`) statically import only `Navbar` + `SiteFooter` — their inner content is likely inline rather than imported as named section blocks. Verify when each is reviewed.
- Names like `BalnearioSection`, `CasitaRusticaPage`, `CasasRuralesSection` are client-domain-specific. When classifying, consider whether they belong as generic `@hwp/core-ui` blocks under a more abstract name (e.g. `FeatureSection`, `AccommodationDetailTemplate`) or as `apps/site-{slug}/` compositions.

## Open questions for this source

- _(none yet)_

## Progress log

- 2026-05-18 — source registered, classification not yet started.
