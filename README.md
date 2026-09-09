# Eurofunda Fit Pack

Локальный набор артефактов для проверки CRO-гипотезы на выбранной PDP: сделать условия покупки заметнее, дать покупателю самостоятельно выбрать сторону L-дивана и оставить WhatsApp как запасной путь при сомнении по стороне или размеру.

Статус: **Implementation package ready for Shopify dev-store integration and theme-specific QA.**

Пакет не меняет live-сайт, не содержит результатов теста и не считается проверенным в production-теме.

## Состав

- `snippets/ef-purchase-trust.liquid` — компактная строка оплаты, доставки и гарантий.
- `snippets/ef-side-switch.liquid` — явный выбор Derecho / Izquierdo, безопасный paired URL и click event.
- `snippets/ef-fit-assistant.liquid` — WhatsApp fallback и click event.
- `snippets/ef-purchase-assist-styles.liquid` — общие стили для раздельного production-размещения.
- `snippets/ef-purchase-assist.liquid` — reusable-композиция для standalone section и демонстрационных сценариев.
- `sections/ef-purchase-assist-section.liquid` — настраиваемая standalone section с preset.
- `prototypes/custom-liquid-prototype.liquid` — однофайловый быстрый prototype без schema и `section.settings`.
- `pixels/ef-gtm-subscriber.js` — подписки Shopify Custom Pixel для существующего GTM-сценария.
- `mockup/index.html` — самодостаточный локальный макет, не скриншот live-сайта.
- `scripts/shots.mjs` — статические, interaction и responsive-проверки плюс три Playwright screenshot.
- `docs/integration.md` — варианты внедрения и rollback.
- `docs/qa-checklist.md` — mobile, tracking и regression QA.

## Открыть mockup

Откройте `mockup/index.html` в браузере. Внешние картинки, шрифты, CDN и сервер не нужны.

## Запустить проверки и снять screenshots

Из корня пакета:

```powershell
npm install
npx playwright install chromium
npm run shots
```

Если Playwright Chromium не установлен, сценарий автоматически попробует локальный Chrome/Edge; путь можно явно передать через `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH`.

Проверки охватывают ширины 375 / 390 / 430 / 1440 px, отсутствие горизонтального скролла, targets от 44 px, Liquid/package invariants, оба custom event, отсутствие событий при загрузке и защиту от повторной инициализации. Затем создаются:

- `mockup/shot-mobile-390-first.png` — viewport 390×844, первый экран;
- `mockup/shot-mobile-390-full.png` — viewport 390×844, full page;
- `mockup/shot-desktop-1440.png` — viewport 1440×900, full page.

## Основной путь интеграции

Точное имя price block, buy-buttons block и main product section зависит от темы. Его определяют только после просмотра product section конкретной темы; пакет не вводит выдуманные Eurofunda block IDs.

Основной production-oriented путь использует две отдельные точки:

1. Подключить `ef-purchase-assist-styles` один раз в фактической product section и рендерить `ef-purchase-trust` непосредственно после существующего price markup — максимально близко к цене.
2. Рендерить `ef-side-switch` и `ef-fit-assistant` непосредственно после существующих buy buttons / Add to Cart.

Так сохраняется иерархия: цена → trust → Add to Cart → Derecho / Izquierdo → Fit Assistant / WhatsApp. Полные generic-примеры для обеих сторон находятся в `docs/integration.md`.

Standalone section и композиционный `ef-purchase-assist` остаются reusable-вариантом. Они не гарантируют точное размещение внутри product info и не являются основным путём для финального placement.

## Tracking architecture

```text
Storefront theme
  → Shopify.analytics.publish('eurofunda:side_switch_click', payload)
  → Shopify.analytics.publish('eurofunda:fit_whatsapp_click', payload)
Shopify Customer Events / Custom Pixel
  → analytics.subscribe(...)
  → window.dataLayer.push(...) внутри того же Custom Pixel sandbox
GTM
  → GTM инициализирован внутри Custom Pixel по поддерживаемой Shopify-схеме
```

Нормализованные события: `ef_side_switch_click` и `ef_fit_whatsapp_click`.

Subscriber не взаимодействует автоматически с произвольным GTM из `theme.liquid`: sandbox Custom Pixel изолирован. Перед установкой нужно проверить существующие theme scripts, Customer Events, app pixels и GTM/GA4/Meta configuration. Если события уже отправляются другим путём, нельзя создавать второй event path.

## Перед live и rollback

До публикации пройти `docs/qa-checklist.md` на обеих парных PDP и проверить product form, variant picker, cart drawer, sticky CTA и GTM Preview. Для отката удалить добавленный Custom Liquid block, theme-specific render/block или standalone section — в зависимости от выбранного варианта — и повторно проверить purchase flow. Подробности находятся в `docs/integration.md`.

До завершения dev-store и theme-specific QA не проверены реальная тема Eurofunda, точные точки placement, Customer Events магазина, текущий analytics stack, cart drawer / variant logic и preview на реальном Shopify store.
