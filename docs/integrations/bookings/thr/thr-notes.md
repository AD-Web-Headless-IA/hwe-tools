# THR — Internal notes

Implementation notes, quirks, and operational details for the THR integration.
This file is for the HWE team — not from THR's official docs.

## Script URLs

| Resource | URL | Notes |
|---|---|---|
| ILib v3 script | `https://thelisresa.webcamp.fr/ilib/v3/ilib.js` | HTTPS required. May support widget selection query params. |
| Booking tunnel | `https://thelisresa.webcamp.fr/` | Where users land after search. Hosted by THR. |
| Legacy ILib (v1/v2) | `https://ajax.webcamp.fr/ilib/` | **Do not use.** Old global-config pattern, not Web Components. |

**TODO:** Confirm exact script URL with THR. The v3 docs mention a "quick integration form" that generates the script tag with selective widget loading — we may need a different URL per widget combination.

## CSP (Content Security Policy) domains

These domains must be allowed in the client's CSP headers for THR widgets to work:

```
script-src:  thelisresa.webcamp.fr
connect-src: thelisresa.webcamp.fr
frame-src:   thelisresa.webcamp.fr
style-src:   thelisresa.webcamp.fr
img-src:     thelisresa.webcamp.fr
```

**Action:** Add these to the CSP configuration in `next.config.mjs` for clients using THR.
See `docs/specs/security/security-standards.md` and `docs/skills/security/security-audit-headers.md`.

**TODO:** Verify the complete list of domains (CDN, analytics, etc.) that THR loads at runtime. Use browser DevTools Network tab on a live THR widget to capture all external requests.

## CSS override strategy

THR widgets render their own styles with medium-to-high specificity. To match the client's brand:

### Container structure

The adapter wraps the widget element like this:

```html
<section data-engine="thr" data-status="mounted" class="booking-search-block ...">
  <div> <!-- container ref -->
    <thr-search-engine title="..." type="2"></thr-search-engine>
  </div>
</section>
```

### Override pattern in `globals.css`

```css
/* =================================================================
   Booking widget overrides — THR
   Scope: [data-engine="thr"] prevents leaking to other engines
   ================================================================= */

[data-engine="thr"] .thr-class-name {
  background-color: var(--color-primary) !important;
  font-family: var(--font-sans) !important;
  border-radius: var(--radius-md) !important;
}
```

### Guidelines

- **Always scope** to `[data-engine="thr"]` — never write naked `.thr-*` selectors
- **Use `!important`** — the widget's internal styles often have high specificity
- **Use CSS custom properties** from the client's theme tokens so overrides adapt per-client
- **Inspect the widget** in DevTools to find the actual CSS class names THR uses — they're not documented and may change between ILib versions
- **Zero CSS in the block component** — all overrides go in `globals.css` (per DEC: one `globals.css` per client, zero CSS per block)
- **Test after THR updates** — external widget CSS can change without notice

### Known CSS classes (inspect and update)

**TODO:** Document the actual CSS class names used by `<thr-search-engine>` after first successful mount. Inspect in DevTools and list here.

```
.thr-search-engine__???  — main container
.thr-search-engine__???  — date picker
.thr-search-engine__???  — submit button
.thr-search-engine__???  — accommodation type selector
```

## Known quirks

1. **Script load order matters** — The `thelisresa` global config (`codeCamping`, `language`) should be set BEFORE the script loads, or the widget may initialize with defaults.

2. **Web Component registration** — The `<thr-search-engine>` element must be inserted AFTER the ILib script has loaded and registered the custom element. Inserting before will result in an empty unknown element that doesn't upgrade.

3. **Multiple widgets on same page** — Unknown if multiple `<thr-search-engine>` elements are supported on the same page. Test before using in page builder with multiple booking blocks.

4. **SPA navigation** — THR's ILib was designed for traditional multi-page sites. Behavior during Next.js client-side navigation (App Router) is untested. The adapter's `destroy()` must clean up properly, and `mount()` must work on re-navigation.

5. **WordPress DIVI conflict** — DIVI ≥ 4.14 has a feature that conflicts with ILib. Not relevant for HWE, but noted in case clients mention it from their old WordPress sites.

6. **Consent timing** — `thelisresa.setConsentMode()` must be called AFTER the ILib script has loaded (because it depends on `thelisresa.ilib()` being available). The adapter handles this by calling it post-script-load.

## Account setup

Each camping client needs:
- A THR / eSeasonResa account with a `codeCamping` identifier
- The eSeasonResa V3 tunnel enabled (required for ILib v3)
- For group accounts: the `site` ID for each camping in the group

These values are configured in `client.config.ts` under `booking.provider` config and stored in Payload as tenant booking config.

## Contact

THR support for integration questions: via Sequoiasoft / Thelis support channels.
Internal reference: Septeo Hospitality team.