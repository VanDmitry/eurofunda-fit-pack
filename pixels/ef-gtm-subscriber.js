/*
 * Опциональный Shopify Custom Pixel для магазина с уже настроенным GTM.
 * Подключать только после проверки существующего tracking stack: параллельный
 * источник того же события создаст дубли. Этот код не устанавливает GTM.
 */

analytics.subscribe('eurofunda:fit_whatsapp_click', function (event) {
  var customData = event.customData || {};

  window.dataLayer = window.dataLayer || [];
  window.dataLayer.push({
    event: 'ef_fit_whatsapp_click',
    product_id: customData.product_id,
    variant_id: customData.variant_id,
    product_handle: customData.product_handle,
    placement: customData.placement
  });
});

analytics.subscribe('eurofunda:side_switch_click', function (event) {
  var customData = event.customData || {};

  window.dataLayer = window.dataLayer || [];
  window.dataLayer.push({
    event: 'ef_side_switch_click',
    product_id: customData.product_id,
    variant_id: customData.variant_id,
    from_side: customData.from_side,
    to_side: customData.to_side,
    placement: customData.placement,
    target_url: customData.target_url
  });
});
