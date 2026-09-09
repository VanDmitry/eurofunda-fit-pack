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
