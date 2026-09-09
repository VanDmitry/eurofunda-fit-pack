# QA-чеклист

Проверять сначала в дубликате темы, затем повторить критический smoke-check после публикации в согласованное окно.

## Responsive и визуальный приоритет

- [ ] Проверено при ширине 375 px.
- [ ] Проверено при ширине 390 px.
- [ ] Проверено при ширине 430 px.
- [ ] Проверено на desktop (ориентир 1440 px).
- [ ] Нет горизонтального скролла ни на одной ширине.
- [ ] Интерактивные touch targets не меньше 44×44 px.
- [ ] У ссылок и кнопок виден keyboard focus.
- [ ] Контент читается при увеличении текста до 200%.
- [ ] Основная кнопка `Agregar al carrito` остаётся визуально главным CTA.
- [ ] WhatsApp выглядит как вторичное действие, а не конкурирует с Add to Cart.
- [ ] Trust line легко сканируется и не вытесняет цену/CTA с purchase area.

## Сторона и данные товара

- [ ] На PDP Derecho активен `Derecho`, и активная карточка не является ссылкой.
- [ ] На PDP Derecho карточка `Izquierdo` ведёт на правильный парный URL.
- [ ] На PDP Izquierdo активен `Izquierdo`, и ссылка возвращает на правильный товар Derecho.
- [ ] Пустой paired URL не создаёт кликабельную ссылку; в Theme Editor виден `Configura la URL`.
- [ ] Paired URL, совпадающий с текущим product URL, не создаёт ссылку на ту же сторону.
- [ ] Обе SVG-схемы визуально соответствуют подписи стороны при взгляде на диван спереди.
- [ ] Подпись о способе определения стороны видна на mobile.
- [ ] Диапазоны равны `180–370 cm` и `100–180 cm`.

## WhatsApp

- [ ] URL использует `wa.me/56225830907`.
- [ ] Prefilled message содержит актуальные `product.title` и абсолютный `product.url`.
- [ ] Сообщение явно говорит о сомнении по стороне/размеру.
- [ ] Ссылка открывается в новой вкладке с `rel="noopener"`.
- [ ] Текст и URL корректно кодируются для пробелов, знаков вопроса, тире и испанских символов.

## События и GTM

- [ ] `eurofunda:side_switch_click` не возникает при page load.
- [ ] `eurofunda:fit_whatsapp_click` не возникает при page load.
- [ ] Один клик по неактивной стороне вызывает ровно один `Shopify.analytics.publish` и не задерживает переход.
- [ ] Side-switch payload содержит `product_id`, `variant_id`, `from_side`, `to_side`, `placement: 'pdp_purchase_area'`, `target_url`.
- [ ] Проверены оба направления: `right → left` и `left → right`.
- [ ] Один WhatsApp click вызывает ровно один `Shopify.analytics.publish`.
- [ ] WhatsApp payload содержит `product_id`, `variant_id`, `product_handle`, `placement: 'pdp_below_primary_cta'`.
- [ ] Повторная инициализация обоих storefront-обработчиков не удваивает события.
- [ ] Theme code не делает параллельный прямой `dataLayer.push()`.
- [ ] Если GTM subscriber подключён, нет второго Custom Pixel/app pixel/theme listener с тем же назначением.
- [ ] GTM инициализирован внутри того же Custom Pixel sandbox по поддерживаемой Shopify-схеме, а не только в `theme.liquid`.
- [ ] В GTM Preview один Shopify custom event создаёт один `ef_side_switch_click` или `ef_fit_whatsapp_click` соответственно.

## Регрессии темы

- [ ] Компонент не ломает product form и отправку выбранного variant в корзину.
- [ ] Variant picker продолжает работать до и после взаимодействия с блоком.
- [ ] Cart drawer открывается и обновляется без ошибок.
- [ ] Dynamic checkout / accelerated checkout не перекрывается компонентом.
- [ ] Mobile sticky Add to Cart не перекрывает side switch или WhatsApp CTA.
- [ ] Компонент не дублируется при повторном рендере section в Theme Editor.
- [ ] В стилях нет глобальных селекторов, CSS leak и `!important`.
- [ ] Контраст текста и контролов соответствует WCAG AA.
- [ ] Текст про 1 год и 10 дней не расширяет реальные условия Eurofunda.
- [ ] Нет добавленных отзывов, срочности, обещаний роста или неподтверждённых условий.

## Rollback

- [ ] Зафиксирована исходная копия темы и имя рабочего дубликата.
- [ ] Известен владелец решения о публикации/откате.
- [ ] Для выбранного варианта выполнен пробный rollback в дубликате темы.
- [ ] После rollback product form, variant picker и cart drawer повторно проверены.
