# Eurofunda demo product images

Комплект подготовлен только из официальных PDP Eurofunda и оригинальных Shopify CDN assets. Файлы скачаны без перекодирования, апскейла или изменения качества.

Источники:

- Derecho: https://eurofunda.cl/products/funda-de-sofa-esquinero-derecho-dark-chocolate
- Izquierdo: https://eurofunda.cl/products/funda-de-sofa-esquinero-izquierdo-dark-chocolate

Публичный product JSON возвращает `null` для исходного alt text, поэтому ниже даны аккуратные alt suggestions. Полные CDN URLs, gallery order, размеры, byte size и SHA-256 находятся в `manifest.json`.

## Upload order — Derecho

Product: `Microfibra - Funda Sofa L Derecho Dark Chocolate`

1. `derecho/01-hero.jpg` — Sofá en L derecho con funda de microfibra Dark Chocolate sobre fondo blanco
2. `derecho/02-angle.jpg` — Sofá en L derecho con funda Dark Chocolate en una sala contemporánea
3. `derecho/03-detail.jpg` — Detalle del ajuste de la funda Dark Chocolate en asiento y respaldo
4. `derecho/04-texture.jpg` — Detalle de la textura elástica de microfibra Dark Chocolate
5. `derecho/05-fit.jpg` — Medidas compatibles de la funda para sofá en L derecho Dark Chocolate

## Upload order — Izquierdo

Product: `Microfibra - Funda Sofa L Izquierdo Dark Chocolate`

1. `izquierdo/01-hero.jpg` — Sofá en L izquierdo con funda de microfibra Dark Chocolate sobre fondo blanco
2. `izquierdo/02-angle.jpg` — Sofá en L izquierdo con funda Dark Chocolate en una sala contemporánea
3. `izquierdo/03-detail.jpg` — Detalle del ajuste de la funda Dark Chocolate en asiento y respaldo
4. `izquierdo/04-texture.jpg` — Elasticidad y textura de la funda de microfibra Dark Chocolate
5. `izquierdo/05-fit.jpg` — Medidas compatibles de la funda para sofá en L izquierdo Dark Chocolate

## Duplicate audit

В исходных восьмипозиционных gallery найдены два точных межтоварных дубликата по SHA-256: Derecho order 3 = Izquierdo order 3 и Derecho order 6 = Izquierdo order 5. В финальных наборах один и тот же файл не загружается в обе PDP; ориентация hero, lifestyle и fit assets соответствует конкретной стороне.
