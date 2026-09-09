# Eurofunda Fit Pack

Локальный набор артефактов для проверки CRO-гипотезы на выбранной PDP: сделать условия покупки заметнее, дать покупателю самостоятельно выбрать сторону L-дивана и оставить WhatsApp как запасной путь при сомнении по стороне или размеру.

Пакет не меняет live-сайт, не содержит результатов теста и не считается проверенным в production-теме.

## Состав

- `snippets/ef-purchase-trust.liquid` — компактная строка оплаты, доставки и гарантий.
- `snippets/ef-side-switch.liquid` — явный выбор Derecho / Izquierdo без логики по handle.
- `snippets/ef-fit-assistant.liquid` — WhatsApp fallback и click event.
- `snippets/ef-purchase-assist.liquid` — композиционный fragment для точной интеграции в main product section.
- `sections/ef-purchase-assist-section.liquid` — настраиваемая standalone section с preset.
- `prototypes/custom-liquid-prototype.liquid` — однофайловый быстрый prototype без schema и `section.settings`.
- `pixels/ef-gtm-subscriber.js` — опциональная подписка Shopify Custom Pixel для существующего GTM.
- `mockup/index.html` — самодостаточный локальный макет, не скриншот live-сайта.
- `scripts/shots.mjs` — автоматические responsive-проверки и три Playwright screenshot.
- `docs/integration.md` — варианты внедрения и rollback.
- `docs/qa-checklist.md` — mobile, tracking и regression QA.

## Открыть mockup

Откройте `mockup/index.html` в браузере. Внешние картинки, шрифты, CDN и сервер не нужны.

## Снять screenshots

Из корня пакета:

```powershell
npm install
npx playwright install chromium
npm run shots
```

Если Playwright Chromium не установлен, сценарий автоматически попробует локальный Chrome/Edge; путь можно явно передать через `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH`.

Сценарий проверяет отсутствие горизонтального скролла и минимальный размер интерактивных целей на 375 / 390 / 430 / 1440 px, затем создаёт:

- `mockup/shot-mobile-390-first.png` — viewport 390×844, первый экран;
- `mockup/shot-mobile-390-full.png` — viewport 390×844, full page;
- `mockup/shot-desktop-1440.png` — viewport 1440×900, full page.

## Выбрать способ внедрения

- Для самой быстрой проверки в неопубликованной теме: Custom Liquid prototype, если main product section поддерживает такой block.
- Для точного размещения и повторного использования: snippets внутри реальной main product section после изучения её block loop и product form.
- Для Theme Editor без правки main product section: standalone section, только если позиция между template sections достаточно точна.

Standalone section можно перемещать между секциями JSON template, но она не гарантирует место непосредственно внутри product info под Add to Cart. Такое размещение зависит от конкретной темы; универсального безопасного patch без её кода нет.

## Tracking architecture

```text
theme click
  → Shopify.analytics.publish('eurofunda:fit_whatsapp_click', payload)
  → optional Shopify Custom Pixel
  → один GTM dataLayer.push({ event: 'ef_fit_whatsapp_click' })
```

Тема не отправляет событие при page load и не пишет напрямую в `dataLayer`. Custom Pixel подключается только после аудита существующего tracking stack, чтобы не создать дубль.

## Перед live и rollback

До публикации пройти `docs/qa-checklist.md` на обеих парных PDP и проверить product form, variant picker, cart drawer, sticky CTA и GTM Preview. Для отката удалить добавленный Custom Liquid block, theme-specific render/block или standalone section — в зависимости от выбранного варианта — и повторно проверить purchase flow. Подробности находятся в `docs/integration.md`.
