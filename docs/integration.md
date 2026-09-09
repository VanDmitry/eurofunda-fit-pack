# Интеграция в Shopify

Пакет предназначен для проверки в development store и дубликате темы. До изучения реальной product section нельзя считать точное место вставки или совместимость с product form подтверждёнными.

## Вариант A — быстрый prototype

1. В Shopify Admin создать дубликат текущей темы и работать только с неопубликованной копией.
2. Открыть product template выбранной PDP в Theme Editor.
3. Проверить, поддерживает ли реальная main product section блок **Custom Liquid** внутри product info.
4. Если поддерживает — добавить такой блок и вставить содержимое `prototypes/custom-liquid-prototype.liquid`.
5. Использовать prototype только на PDP Derecho: в нём зафиксирована пара Derecho → Izquierdo.
6. Открыть preview выбранной PDP и пройти mobile/desktop QA по `qa-checklist.md`.

Ограничение: Custom Liquid prototype не использует `{% schema %}` и `section.settings`. Это однофайловая проверка визуала и поведения, но один Custom Liquid block не может гарантировать раздельное placement trust около цены и side-switch после Add to Cart. Для следующего этапа основной вариант — B.

**Rollback:** удалить Custom Liquid block из неопубликованной темы или вернуть его в скрытое состояние. Если тема всё же была опубликована, сначала переключиться на предыдущий дубликат, затем удалить блок из новой рабочей копии.

## Вариант B — основная точная интеграция

Это основной production-oriented путь после изучения темы.

1. Добавить пять файлов `snippets/ef-*.liquid` в код дубликата темы.
2. Открыть фактическую main product section, используемую выбранным product template.
3. Определить существующие места, где тема выводит цену и buy buttons / product form. Проверить соседние variant picker, dynamic checkout и pickup availability.
4. Подключить стили один раз в этой product section. Вызов не выводит видимый контент и может находиться перед существующей product-info разметкой:

```liquid
{% render 'ef-purchase-assist-styles' %}
```

### Точка 1 — сразу после цены

Непосредственно после фактического price markup темы, максимально близко к цене:

```liquid
{% render 'ef-purchase-trust' %}
```

### Точка 2 — сразу после buy buttons

Непосредственно после фактических buy buttons / Add to Cart на PDP Derecho:

```liquid
{% render 'ef-side-switch',
  product: product,
  current_side: 'right',
  opposite_url: '/products/funda-de-sofa-esquinero-izquierdo-dark-chocolate',
  opposite_label: 'Izquierdo',
  right_label: 'Derecho',
  left_label: 'Izquierdo',
  placement: 'pdp_purchase_area'
%}

{% render 'ef-fit-assistant',
  product: product,
  whatsapp_number: '+56 2 2583 0907',
  placement: 'pdp_below_primary_cta'
%}
```

На парной PDP Izquierdo вызов side-switch зеркальный:

```liquid
{% render 'ef-side-switch',
  product: product,
  current_side: 'left',
  opposite_url: '/products/funda-de-sofa-esquinero-derecho-dark-chocolate',
  opposite_label: 'Derecho',
  right_label: 'Derecho',
  left_label: 'Izquierdo',
  placement: 'pdp_purchase_area'
%}
```

Эти примеры показывают только параметры и порядок. Они не являются универсальным patch: точные имена блоков и строки вставки определяются после просмотра конкретной product section темы. Перед dev-store QA оба paired URL нужно повторно сверить с фактическим каталогом магазина.

Компонент не определяет сторону по `product.handle`. Если `opposite_url` пуст или совпадает с относительным/абсолютным URL текущего товара, противоположная карточка становится некликабельной. В Theme Editor она показывает `Configura la URL`, а storefront не создаёт ссылку на текущую сторону.

**Rollback:** удалить три вызова видимых snippets и один вызов styles из рабочей копии темы. Если менялась схема theme-specific блока, удалить только соответствующий block definition. Проверить, что JSON template снова открывается без orphaned block.

## Вариант C — standalone section

1. Добавить snippets и `sections/ef-purchase-assist-section.liquid` в дубликат темы.
2. В Theme Editor добавить preset **EF Purchase Assist** в product template.
3. Для каждой PDP явно выбрать текущую сторону и заполнить URL товара противоположной стороны.
4. Убедиться, что карточка противоположной стороны кликабельна и не ведёт на текущую PDP.
5. Использовать этот вариант только если позиция между template sections достаточно точна для выбранной темы.

У standalone section больше нет одностороннего fallback URL. Пустой, неопределённый или совпадающий с текущим product URL не создаёт ссылку; Theme Editor показывает предупреждение в карточке и рядом с настройкой URL.

Standalone section сохраняет reusable-композицию `ef-purchase-assist`, но не гарантирует позиции непосредственно внутри product info. Если section оказывается после всей product section, нужен вариант B.

**Rollback:** удалить section из product template в Theme Editor. После проверки отсутствия ссылок на неё можно удалить section-файл и snippets из рабочей копии темы.

## Трекинг

Поток данных для двух interaction metrics:

```text
Storefront theme click
  → Shopify.analytics.publish('eurofunda:side_switch_click', payload)
  → Shopify.analytics.publish('eurofunda:fit_whatsapp_click', payload)
Shopify Customer Events / Custom Pixel
  → analytics.subscribe('eurofunda:side_switch_click', ...)
  → analytics.subscribe('eurofunda:fit_whatsapp_click', ...)
  → window.dataLayer.push(...) внутри того же Custom Pixel sandbox
GTM
  → GTM инициализирован внутри Custom Pixel по поддерживаемой Shopify-схеме
```

`pixels/ef-gtm-subscriber.js` нормализует события в `ef_side_switch_click` и `ef_fit_whatsapp_click`. Он не устанавливает GTM сам и не взаимодействует автоматически с произвольным `dataLayer` или GTM-контейнером из `theme.liquid`, потому что Custom Pixel работает в sandbox.

До установки проверить текущие theme scripts, Customer Events, app pixels и GTM/GA4/Meta configuration. Если событие уже поступает другим путём, не добавлять второй subscriber, theme listener или тег с тем же назначением.

Storefront-код публикует события только по клику и не делает прямой `dataLayer.push()`. Делегированные обработчики регистрируются один раз, поэтому повторный рендер snippets не удваивает publish. Аналитика не отменяет и не задерживает переход по side-switch или WhatsApp URL.

Минимальная проверка в preview:

1. После загрузки нет ни `eurofunda:side_switch_click`, ни `eurofunda:fit_whatsapp_click`.
2. Один клик по неактивной стороне вызывает один side-switch publish и сразу ведёт на paired product.
3. Side-switch payload содержит `product_id`, `variant_id`, `from_side`, `to_side`, `placement: 'pdp_purchase_area'`, `target_url`.
4. Один WhatsApp click вызывает один publish с `product_id`, `variant_id`, `product_handle`, `placement: 'pdp_below_primary_cta'`.
5. Повторная инициализация кода не создаёт duplicate handlers.
6. В Custom Pixel / GTM preview каждый custom event создаёт ровно одно нормализованное событие.

## До live

Нужны доступы к дубликату темы, product template, main product section, Customer Events / Custom Pixels и GTM preview. Обязательно проверить обе PDP, доступные варианты товара, cart drawer, dynamic checkout, mobile sticky CTA и поведение после смены variant.

После этой итерации статус пакета: **Implementation package ready for Shopify dev-store integration and theme-specific QA.** Он не является production-ready до проверки реальной темы и магазина.
