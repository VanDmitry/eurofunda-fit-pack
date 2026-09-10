# Shopify dev-store final evidence

- **Status:** PASS
- **Date:** 2026-09-10
- **Store:** `eurofunda-cro-demo.myshopify.com`
- **Theme:** `157730078910` — `Eurofunda CRO Preview 2026-09-10` — **unpublished**
- **Implementation package HEAD before this uncommitted iteration:** `a377ba924217e9fa37c4e037fbf88bbca771341d`

## Store settings

| Setting | Current before iteration | Final target/state |
| --- | --- | --- |
| Primary market | United States | Chile |
| Store currency | USD | CLP |
| Storefront domain language | English | Español, published and set as the domain default |
| Customer-facing money | `$219,900.00` | `$219.900` |
| Time zone | Eastern Time (US & Canada) | Santiago |
| Shipping to the active market | Not configured | Chile zone, `Envío gratis`, 3–5 business days |
| Shopify Payments | Setup incomplete; development store allows test payments only | Unchanged; it did not block the CLP change |
| Business entity / store address | United States | Unchanged by design |

All four customer-facing currency format fields use Shopify's supported `{{ amount_no_decimals_with_comma_separator }}` placeholder. The Spanish storefront is served at the ordinary root/product URLs (`<html lang="es">`); English remains available as the source language in Shopify Languages.

## Theme and content changes

- Native Horizon storefront UI now renders in Spanish; the main menu is `Inicio`, `Catálogo`, `Contacto`.
- `Comprar ahora` is suppressed only when `template.suffix == 'eurofunda-demo'`; `Agregar al carrito` remains the primary CTA.
- The lazy product-recommendations section was disabled in the demo template because its placeholder state was not consistently presentation-ready.
- The Fit Assistant retains `Tramo principal: 180–370 cm` and no longer publishes an exact chaise-longue range. It now says `¿Dudas con la medida del chaise longue?` and `Envíanos una foto y revisamos la compatibilidad antes de comprar.`
- The `Medidas` accordion uses the same neutral wording.
- Both demo products retain `templateSuffix: eurofunda-demo`; ordinary paired product URLs work without `view=`.

## Source-of-truth issue

The discrepancy is confirmed: the prior live PDP copy stated `100–180 cm`, while the official measurement image states `100–170 cm`. Because neither artifact has been established as the approved commercial source of truth, the customer-facing demo now avoids an exact chaise range and routes uncertain buyers to a photo-based compatibility check. No source image was altered.

## Product media

- Derecho: 5 images, all `READY`, Derecho hero first.
- Izquierdo: 5 images, all `READY`, Izquierdo hero first.
- Order: hero → lifestyle → distinct fit/detail → texture → measurements.
- The near-duplicate lifestyle image was replaced with an official close-up fit/detail image for each product.
- Sources and alt text are recorded in `assets/product-images/manifest.json`; source JPG files are not stored in Git.

## Browser QA

- 375 px: homepage and both demo PDP layouts stable; no horizontal overflow.
- 390 px: homepage, both product directions, five-slide galleries, purchase area, accordions and footer verified; no horizontal overflow.
- 430 px: homepage and PDP stable, five slide controls present; no horizontal overflow.
- 1440 px: gallery grid and sticky product information balanced; no horizontal overflow.
- Derecho → Izquierdo → Derecho navigation works at ordinary product URLs, with the correct active side on each PDP.
- Slide 3 on Derecho and slide 5 on Izquierdo were opened successfully; each gallery exposes five controls.
- `Medidas` expands and contains the confirmed main range plus neutral chaise guidance; neither `100–170` nor `100–180` remains in rendered customer copy.
- WhatsApp points to `wa.me/56225830907` with the current title and product URL in the prefilled message.
- `Agregar al carrito` works. The cart drawer is Spanish and shows `$219.900` per line and `$219.900 CLP` for the estimated total. The test item was removed after QA and the cart was confirmed empty.
- Homepage and PDP customer-facing scans found no English navigation, CTA, cart or recommendation labels. Product names and the explicit technical phrase `Shopify development store` are intentionally unchanged.

## Theme validation

`shopify theme check` inspected 365 files: **0 errors**, 6 pre-existing Horizon warnings (`sections/header.liquid`: one excessive-settings warning; `snippets/divider.liquid`: five unused documentation parameters). Eurofunda-specific errors/warnings: 0.

## Preview

- **Home:** https://eurofunda-cro-demo.myshopify.com/?preview_theme_id=157730078910
- **Derecho:** https://eurofunda-cro-demo.myshopify.com/products/funda-de-sofa-esquinero-derecho-dark-chocolate?preview_theme_id=157730078910
- **Izquierdo:** https://eurofunda-cro-demo.myshopify.com/products/funda-de-sofa-esquinero-izquierdo-dark-chocolate?preview_theme_id=157730078910
- **Theme editor:** https://eurofunda-cro-demo.myshopify.com/admin/themes/157730078910/editor

## Evidence

- `evidence/devstore-home-mobile-390.png` — 390×823, clean homepage viewport.
- `evidence/devstore-preview-mobile-390-first.png` — 390×823, clean first PDP viewport.
- `evidence/devstore-preview-mobile-390-full.png` — 390×2161, clean full PDP.
- `evidence/devstore-preview-desktop-1440.png` — 1440×900, clean desktop PDP.
- `evidence/devstore-cart-mobile-390.png` — 390×844, Spanish cart drawer with CLP totals.
- `evidence/devstore-preview-draft-bar.png` — 380×822, explicit proof of the Shopify `Draft` preview state before the bar was hidden with Shopify's own `Hide bar` control.

No theme CSS or DOM was altered to hide the preview toolbar. Clean evidence was captured only after using Shopify's supported preview-bar control.

## Scope and limitations

- Production Eurofunda and the live theme were not changed.
- The development store's legal/business entity and address remain in the United States.
- No checkout payment/test order was completed.
- Custom Pixel installation was not changed; the existing theme-side event publication remains as previously verified.
- This iteration is uncommitted and unpushed to Git.
