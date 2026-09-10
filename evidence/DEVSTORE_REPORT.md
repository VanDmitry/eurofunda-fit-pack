# Shopify implementation evidence

- **Status:** PASS
- **Date:** 2026-09-10
- **Implementation package HEAD:** `55c93ce674a79108e66adbd2b851c0789bac52f9`

## Что реализовано

- trust/reassurance сразу после цены с принятой безопасной формулировкой;
- selector Derecho / Izquierdo с парной ссылкой и корректной активной стороной;
- Fit Assistant с диапазонами 180–370 cm и 100–180 cm;
- WhatsApp как secondary fallback ниже основного Add to cart;
- storefront-события `eurofunda:side_switch_click` и `eurofunda:fit_whatsapp_click`.

## Где реализовано

Работа выполнена только в development store `eurofunda-cro-demo.myshopify.com`, в отдельной неопубликованной копии стандартной темы Horizon. Live-тема и live Eurofunda не изменялись. Полный код Horizon хранится отдельно от implementation repository.

Создан отдельный `product.eurofunda-demo.json`. В Horizon цена рендерится через `blocks/price.liquid` → `snippets/price.liquid`, buy buttons и product form — через `blocks/buy-buttons.liquid`. В demo-template блок `ef-purchase-trust` расположен сразу после `price_tVjtKg`, а `ef-purchase-assist` — сразу после `buy_buttons_eYQEYi`.

Theme-specific файлы:

- `blocks/ef-purchase-trust.liquid`;
- `blocks/ef-purchase-assist.liquid`;
- `snippets/ef-purchase-trust.liquid`;
- `snippets/ef-side-switch.liquid`;
- `snippets/ef-fit-assistant.liquid`;
- `snippets/ef-purchase-assist-styles.liquid`;
- `templates/product.eurofunda-demo.json`.

Минимальный diff интеграции приложен как `evidence/theme-integration.patch`. Локальная копия темы имеет baseline-коммит `7340c84` и проверенную ветку `codex/eurofunda-cro-preview` (`d863abf`); она не отправлялась в основной GitHub repository.

## QA

- Обе PDP проверены при 375×812, 390×844, 430×932 и 1440×900: horizontal overflow отсутствует, layout стабилен, интерактивные цели не меньше 44×44 px.
- Add to cart доступен и возвращает успешный `/cart/add`; cart drawer открывается и содержит правильный товар.
- Dynamic checkout (`Buy it now`) остаётся на месте, Add to cart визуально главный; sticky Add to cart не перекрывает WhatsApp CTA.
- Derecho → Izquierdo → Back и Izquierdo → Derecho → Back проверены реальной навигацией; demo-template и активная сторона сохраняются.
- WhatsApp URL использует `wa.me/56225830907`; prefilled message содержит правильные title и product URL.
- Загрузка страницы создаёт 0 interaction events. Один клик по side switch и один клик по WhatsApp публикуют ровно по одному событию с ожидаемым payload в обоих направлениях.
- `shopify theme check`: 0 errors; 6 warnings из исходного Horizon (`sections/header.liquid`: 1, `snippets/divider.liquid`: 5); Eurofunda integration warnings: 0.
- Локальный Shopify preview выдавал фоновые `Failed to fetch` от proxy/внешних storefront-запросов; функциональные запросы товаров, секций и корзины были успешны. Ошибок нашей интеграции не обнаружено.

## Preview

- **Store:** `eurofunda-cro-demo.myshopify.com`
- **Theme:** `157730078910` — `Eurofunda CRO Preview 2026-09-10` — `unpublished`
- **Preview:** https://eurofunda-cro-demo.myshopify.com/?preview_theme_id=157730078910
- **Theme editor:** https://eurofunda-cro-demo.myshopify.com/admin/themes/157730078910/editor

- **Derecho:** https://eurofunda-cro-demo.myshopify.com/products/funda-de-sofa-esquinero-derecho-dark-chocolate?preview_theme_id=157730078910&view=eurofunda-demo
- **Izquierdo:** https://eurofunda-cro-demo.myshopify.com/products/funda-de-sofa-esquinero-izquierdo-dark-chocolate?preview_theme_id=157730078910&view=eurofunda-demo

Оба товара активны, доступны к покупке и имеют цену 219,900 CLP. Параметр `view=eurofunda-demo` ограничивает эксперимент двумя demo-PDP; paired links сохраняют этот view. Preview может запросить storefront password — передавать его рецензенту нужно отдельно, не через Git.

## Screenshots

- `evidence/devstore-preview-mobile-390-first.png` — 390×844;
- `evidence/devstore-preview-mobile-390-full.png` — 390×1860, full page;
- `evidence/devstore-preview-desktop-1440.png` — 1440×900.

## Ограничения

- Это стандартная Horizon в отдельном dev store, а не реальная тема Eurofunda; production placement нужно повторно подтвердить на её архитектуре.
- Demo-products созданы без product media, поэтому gallery-сценарий с изображениями не воспроизводился; существующий gallery-код Horizon не менялся.
- Accelerated checkout визуально сохранён, но платёжный checkout/test order не выполнялся.
- Custom Pixel не устанавливался: проверена theme-side публикация событий; перед production нужно изучить существующие GTM/GA4/Meta paths и не создавать дубль.
- Live-сайт и live-тема не изменялись; demo-тема остаётся unpublished.
