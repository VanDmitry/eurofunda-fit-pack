# Интеграция в Shopify

Пакет предназначен для проверки в дубликате темы. До изучения реальной темы нельзя считать точное место вставки или совместимость с product form подтверждёнными.

## Вариант A — быстрый prototype

1. В Shopify Admin создать дубликат текущей темы и работать только с неопубликованной копией.
2. Открыть product template выбранной PDP в Theme Editor.
3. Проверить, поддерживает ли реальная main product section блок **Custom Liquid** внутри product info.
4. Если поддерживает — добавить такой блок и вставить содержимое `prototypes/custom-liquid-prototype.liquid`.
5. Разместить блок в доступной позиции рядом с основным purchase flow. Захардкоженный prototype настроен для товара Derecho и ведёт на парный товар Izquierdo.
6. Открыть preview выбранной PDP и пройти mobile/desktop QA по `qa-checklist.md`.

Ограничение: Custom Liquid prototype не использует `{% schema %}` и `section.settings`. Это осознанно однофайловая проверка гипотезы, а не настраиваемый production-компонент.

**Rollback:** удалить Custom Liquid block из неопубликованной темы или вернуть его в скрытое состояние. Если тема всё же была опубликована, сначала переключиться на предыдущий дубликат, затем удалить блок из новой рабочей копии.

## Вариант B — точная интеграция в main product section

Это основной вариант после изучения темы.

1. Добавить четыре файла из `snippets/` в код дубликата темы.
2. Открыть фактическую main product section, используемую выбранным product template.
3. Найти точку, где тема рендерит buy buttons / product form, и проверить соседние блоки цены, variant picker и pickup availability.
4. Добавить вызов `ef-purchase-assist` непосредственно после buy buttons либо оформить его как отдельный theme-specific block, если архитектура темы использует цикл `section.blocks`.
5. Явно передать сторону и URL парного товара. Не определять сторону по `product.handle` внутри компонента.

Пример параметров вызова — это не универсальный patch и не указание точной строки вставки:

```liquid
{% render 'ef-purchase-assist',
  product: product,
  current_side: 'right',
  opposite_url: '/products/funda-de-sofa-esquinero-izquierdo-dark-chocolate',
  opposite_label: 'Izquierdo',
  right_label: 'Derecho',
  left_label: 'Izquierdo',
  whatsapp_number: '+56 2 2583 0907',
  show_trust: true
%}
```

Для парной PDP параметры должны быть зеркальными: `current_side: 'left'`, а `opposite_url` должен вести на товар Derecho.

**Rollback:** удалить только добавленный вызов/блок и четыре `ef-*.liquid` snippets из рабочей копии темы. Если менялась схема блока, также удалить только соответствующий theme-specific block definition. Проверить, что JSON template снова открывается без orphaned block.

## Вариант C — standalone section

1. Добавить snippets и `sections/ef-purchase-assist-section.liquid` в дубликат темы.
2. В Theme Editor добавить preset **EF Purchase Assist** в product template.
3. Заполнить сторону текущего товара и URL парного товара; проверить подписи и WhatsApp.
4. Использовать этот вариант только если позиция между секциями template достаточно точна для выбранной темы.

Standalone section можно перемещать между секциями JSON template, но это не гарантирует позицию непосредственно внутри product info под Add to Cart. Если section оказывается после всей product section, визуальная и смысловая связь с CTA может быть слабее; тогда нужен вариант B.

**Rollback:** удалить section из product template в Theme Editor. После проверки отсутствия ссылок на неё можно удалить section-файл и snippets из рабочей копии темы.

## Трекинг

Основной поток данных:

```text
клик по WhatsApp в теме
  → Shopify.analytics.publish('eurofunda:fit_whatsapp_click', payload)
  → опциональный Shopify Custom Pixel
  → один dataLayer.push({ event: 'ef_fit_whatsapp_click', ... })
  → существующий GTM
```

Тема публикует событие только по `click`. Она не вызывает `dataLayer.push()` и не публикует событие при загрузке страницы. Делегированный обработчик регистрируется один раз и обслуживает несколько экземпляров блока.

`pixels/ef-gtm-subscriber.js` нужен только при уже существующем GTM-сценарии. Перед подключением проверить текущую тему, Custom Pixels, app pixels и GTM tags: второго подписчика или параллельного theme listener с тем же событием быть не должно.

Минимальная проверка в preview:

1. До клика событие отсутствует.
2. Один клик открывает корректный WhatsApp URL и вызывает один `Shopify.analytics.publish`.
3. Payload содержит `product_id`, `variant_id`, `product_handle` и `placement: 'pdp_below_primary_cta'`.
4. При подключённом Custom Pixel один custom event создаёт один `ef_fit_whatsapp_click` в GTM preview.

## До live

Нужны доступы к дубликату темы, product template, main product section, Customer events/Custom Pixels и GTM preview. Обязательно проверить обе PDP, доступные варианты товара, cart drawer, динамический checkout, mobile sticky CTA и поведение после смены variant. Публикация допустима только после preview QA и согласованного rollback.
