import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { mkdir, readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { chromium } from 'playwright';

const scriptDirectory = dirname(fileURLToPath(import.meta.url));
const projectDirectory = dirname(scriptDirectory);
const mockupDirectory = join(projectDirectory, 'mockup');
const mockupUrl = pathToFileURL(join(mockupDirectory, 'index.html')).href;

await mkdir(mockupDirectory, { recursive: true });

async function readProjectFile(relativePath) {
  return readFile(join(projectDirectory, ...relativePath.split('/')), 'utf8');
}

function extractFirstScript(source, label) {
  const scriptMatch = source.match(/<script>([\s\S]*?)<\/script>/);
  assert.ok(scriptMatch, `Tracking script not found in ${label}`);
  return scriptMatch[1];
}

async function assertStaticPackage() {
  const [
    gitignore,
    readme,
    integration,
    section,
    prototype,
    pixel,
    sideSwitch,
    fitAssistant,
    trust,
    mockup
  ] = await Promise.all([
    readProjectFile('.gitignore'),
    readProjectFile('README.md'),
    readProjectFile('docs/integration.md'),
    readProjectFile('sections/ef-purchase-assist-section.liquid'),
    readProjectFile('prototypes/custom-liquid-prototype.liquid'),
    readProjectFile('pixels/ef-gtm-subscriber.js'),
    readProjectFile('snippets/ef-side-switch.liquid'),
    readProjectFile('snippets/ef-fit-assistant.liquid'),
    readProjectFile('snippets/ef-purchase-trust.liquid'),
    readProjectFile('mockup/index.html')
  ]);

  for (const ignoredEntry of ['node_modules/', '.playwright/', '.DS_Store', 'Thumbs.db']) {
    assert.ok(gitignore.split(/\r?\n/).includes(ignoredEntry), `.gitignore missing ${ignoredEntry}`);
  }

  const schemaMatch = section.match(/{% schema %}([\s\S]*?){% endschema %}/);
  assert.ok(schemaMatch, 'Section schema not found');
  JSON.parse(schemaMatch[1]);

  assert.doesNotMatch(prototype, /{%\s*schema\s*%}/, 'Custom Liquid prototype must not contain schema');
  assert.doesNotMatch(prototype, /section\.settings/, 'Custom Liquid prototype must not use section.settings');

  const storefrontLiquid = [section, prototype, sideSwitch, fitAssistant, trust].join('\n');
  assert.doesNotMatch(storefrontLiquid, /dataLayer\s*\.\s*push\s*\(/, 'Storefront Liquid must not push to dataLayer');

  assert.match(section, /assign ef_paired_product_url = section\.settings\.paired_product_url/);
  assert.doesNotMatch(section, /paired_product_url\s*\|\s*default/, 'Standalone section must not guess a paired URL');
  assert.match(sideSwitch, /ef_opposite_url == blank/);
  assert.match(sideSwitch, /ef_opposite_url == ef_current_relative_url/);
  assert.match(sideSwitch, /ef_opposite_url == ef_current_absolute_url/);
  assert.match(sideSwitch, /request\.design_mode/);

  const allCustomerCopy = [section, prototype, trust, mockup].join('\n');
  assert.doesNotMatch(allCustomerCopy, /Envío gratis sobre \$80\.000 ·/);
  assert.match(allCustomerCopy, /Envío gratis sobre \$80\.000 en Chile continental/);
  assert.doesNotMatch(allCustomerCopy, /100[–-]180 cm/, 'Chaise range conflicts with the official fit image');
  assert.doesNotMatch(allCustomerCopy, /100[–-]170 cm/, 'Customer copy must not claim a disputed chaise range');
  assert.match(allCustomerCopy, /¿Dudas con la medida del chaise longue\?/);
  assert.match(allCustomerCopy, /Envíanos una foto y revisamos la compatibilidad antes de comprar\./);

  const trustPoint = integration.indexOf("{% render 'ef-purchase-trust' %}");
  const sidePoint = integration.indexOf("{% render 'ef-side-switch'");
  const fitPoint = integration.indexOf("{% render 'ef-fit-assistant'");
  assert.ok(trustPoint >= 0 && sidePoint > trustPoint && fitPoint > sidePoint, 'Integration docs must show price trust before post-CTA helpers');
  assert.match(readme, /Implementation package ready for Shopify dev-store integration and theme-specific QA\./);
  assert.match(integration, /GTM инициализирован внутри Custom Pixel/);
  assert.match(integration, /не взаимодействует автоматически/);

  assert.match(pixel, /analytics\.subscribe\('eurofunda:side_switch_click'/);
  assert.match(pixel, /event: 'ef_side_switch_click'/);
  assert.match(pixel, /analytics\.subscribe\('eurofunda:fit_whatsapp_click'/);
  assert.match(pixel, /event: 'ef_fit_whatsapp_click'/);

  const whatsappHrefMatch = mockup.match(/href="(https:\/\/wa\.me\/[^\"]+)"/);
  assert.ok(whatsappHrefMatch, 'Mockup WhatsApp URL not found');
  const whatsappUrl = new URL(whatsappHrefMatch[1].replaceAll('&amp;', '&'));
  assert.equal(whatsappUrl.hostname, 'wa.me');
  assert.equal(whatsappUrl.pathname, '/56225830907');
  const whatsappMessage = whatsappUrl.searchParams.get('text');
  assert.match(whatsappMessage, /Microfibra - Funda Sofa L Derecho Dark Chocolate/);
  assert.match(whatsappMessage, /https:\/\/eurofunda\.cl\/products\/funda-de-sofa-esquinero-derecho-dark-chocolate/);
  assert.match(whatsappMessage, /¿Me ayudan a confirmar el modelo antes de comprar\?/);

  assert.match(mockup, /href="https:\/\/eurofunda\.cl\/products\/funda-de-sofa-esquinero-izquierdo-dark-chocolate"/);
  process.stdout.write('static package/schema/URLs: ok\n');
}

const browserCandidates = [
  process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH,
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe'
].filter(Boolean);
const localBrowser = browserCandidates.find((candidate) => existsSync(candidate));
const browser = await chromium.launch({
  headless: true,
  ...(localBrowser ? { executablePath: localBrowser } : {})
});
const page = await browser.newPage({
  viewport: { width: 390, height: 844 },
  deviceScaleFactor: 1,
  colorScheme: 'light',
  reducedMotion: 'reduce'
});

async function openAt(width, height) {
  await page.setViewportSize({ width, height });
  await page.goto(mockupUrl, { waitUntil: 'load' });
  await page.evaluate(() => document.fonts.ready);
}

async function assertLayout(width, height) {
  await openAt(width, height);

  const result = await page.evaluate(() => {
    const interactive = Array.from(document.querySelectorAll('a, button, summary'));
    return {
      clientWidth: document.documentElement.clientWidth,
      scrollWidth: document.documentElement.scrollWidth,
      undersizedTargets: interactive
        .map((element) => {
          const rect = element.getBoundingClientRect();
          return {
            label: element.textContent.trim().replace(/\s+/g, ' ').slice(0, 60),
            width: Math.round(rect.width),
            height: Math.round(rect.height)
          };
        })
        .filter((target) => target.width < 44 || target.height < 44)
    };
  });

  assert.equal(result.scrollWidth, result.clientWidth, `Horizontal scroll at ${width}×${height}`);
  assert.deepEqual(result.undersizedTargets, [], `Touch targets below 44 px at ${width}×${height}`);
  process.stdout.write(`layout ${width}x${height}: ok\n`);
}

async function assertWhatsAppTracking() {
  const snippet = await readProjectFile('snippets/ef-fit-assistant.liquid');
  const trackingScript = extractFirstScript(snippet, 'ef-fit-assistant.liquid');
  const trackingPage = await browser.newPage();

  try {
    await trackingPage.setContent(`
      <a
        id="ef-test-whatsapp"
        href="#whatsapp-target"
        data-ef-fit-whatsapp
        data-product-id="102"
        data-variant-id="202"
        data-product-handle="second-product"
        data-placement="pdp_below_primary_cta"
      ><span>WhatsApp</span></a>
      <script>
        window.__efPublishedEvents = [];
        window.Shopify = {
          analytics: {
            publish: function (name, payload) {
              window.__efPublishedEvents.push({ name: name, payload: payload });
              return Promise.resolve(true);
            }
          }
        };
      </script>
      <script>${trackingScript}</script>
      <script>${trackingScript}</script>
    `);

    assert.equal(await trackingPage.evaluate(() => window.__efPublishedEvents.length), 0, 'WhatsApp event published on page load');
    await trackingPage.click('#ef-test-whatsapp span');
    await trackingPage.waitForFunction(() => window.location.hash === '#whatsapp-target');

    const publishedEvents = await trackingPage.evaluate(() => window.__efPublishedEvents);
    assert.deepEqual(publishedEvents, [{
      name: 'eurofunda:fit_whatsapp_click',
      payload: {
        product_id: '102',
        variant_id: '202',
        product_handle: 'second-product',
        placement: 'pdp_below_primary_cta'
      }
    }]);
  } finally {
    await trackingPage.close();
  }

  process.stdout.write('WhatsApp load/click/deduplication/navigation: ok\n');
}

async function assertSideSwitchTracking() {
  const snippet = await readProjectFile('snippets/ef-side-switch.liquid');
  const trackingScript = extractFirstScript(snippet, 'ef-side-switch.liquid');
  const trackingPage = await browser.newPage();

  try {
    await trackingPage.setContent(`
      <a
        id="ef-test-right-to-left"
        href="#paired-left"
        data-ef-side-switch
        data-product-id="301"
        data-variant-id="401"
        data-from-side="right"
        data-to-side="left"
        data-placement="pdp_purchase_area"
        data-target-url="/products/paired-left"
      ><span>Izquierdo</span></a>
      <a
        id="ef-test-left-to-right"
        href="#paired-right"
        data-ef-side-switch
        data-product-id="302"
        data-variant-id="402"
        data-from-side="left"
        data-to-side="right"
        data-placement="pdp_purchase_area"
        data-target-url="/products/paired-right"
      ><span>Derecho</span></a>
      <script>
        window.__efPublishedEvents = [];
        window.Shopify = {
          analytics: {
            publish: function (name, payload) {
              window.__efPublishedEvents.push({ name: name, payload: payload });
              return Promise.resolve(true);
            }
          }
        };
      </script>
      <script>${trackingScript}</script>
      <script>${trackingScript}</script>
    `);

    assert.equal(await trackingPage.evaluate(() => window.__efPublishedEvents.length), 0, 'Side-switch event published on page load');

    await trackingPage.click('#ef-test-right-to-left span');
    await trackingPage.waitForFunction(() => window.location.hash === '#paired-left');
    assert.deepEqual(await trackingPage.evaluate(() => window.__efPublishedEvents), [{
      name: 'eurofunda:side_switch_click',
      payload: {
        product_id: '301',
        variant_id: '401',
        from_side: 'right',
        to_side: 'left',
        placement: 'pdp_purchase_area',
        target_url: '/products/paired-left'
      }
    }]);

    await trackingPage.click('#ef-test-left-to-right span');
    await trackingPage.waitForFunction(() => window.location.hash === '#paired-right');
    assert.deepEqual(await trackingPage.evaluate(() => window.__efPublishedEvents), [
      {
        name: 'eurofunda:side_switch_click',
        payload: {
          product_id: '301',
          variant_id: '401',
          from_side: 'right',
          to_side: 'left',
          placement: 'pdp_purchase_area',
          target_url: '/products/paired-left'
        }
      },
      {
        name: 'eurofunda:side_switch_click',
        payload: {
          product_id: '302',
          variant_id: '402',
          from_side: 'left',
          to_side: 'right',
          placement: 'pdp_purchase_area',
          target_url: '/products/paired-right'
        }
      }
    ]);
  } finally {
    await trackingPage.close();
  }

  const failurePage = await browser.newPage();
  try {
    await failurePage.setContent(`
      <a id="ef-test-failure" href="#paired-even-on-error" data-ef-side-switch>Paired</a>
      <script>
        window.Shopify = { analytics: { publish: function () { throw new Error('analytics unavailable'); } } };
      </script>
      <script>${trackingScript}</script>
    `);
    await failurePage.click('#ef-test-failure');
    await failurePage.waitForFunction(() => window.location.hash === '#paired-even-on-error');
  } finally {
    await failurePage.close();
  }

  process.stdout.write('side switch load/right-left/left-right/deduplication/navigation: ok\n');
}

async function assertPixelSubscriber() {
  const pixelSource = await readProjectFile('pixels/ef-gtm-subscriber.js');
  const pixelPage = await browser.newPage();

  try {
    await pixelPage.setContent(`
      <script>
        window.__efSubscribers = {};
        window.analytics = {
          subscribe: function (name, callback) {
            window.__efSubscribers[name] = callback;
          }
        };
      </script>
      <script>${pixelSource}</script>
    `);

    assert.equal(await pixelPage.evaluate(() => (window.dataLayer || []).length), 0, 'Pixel must not push on load');
    await pixelPage.evaluate(() => {
      window.__efSubscribers['eurofunda:side_switch_click']({
        customData: {
          product_id: '501',
          variant_id: '601',
          from_side: 'right',
          to_side: 'left',
          placement: 'pdp_purchase_area',
          target_url: '/products/left'
        }
      });
      window.__efSubscribers['eurofunda:fit_whatsapp_click']({
        customData: {
          product_id: '502',
          variant_id: '602',
          product_handle: 'fit-product',
          placement: 'pdp_below_primary_cta'
        }
      });
    });

    assert.deepEqual(await pixelPage.evaluate(() => window.dataLayer), [
      {
        event: 'ef_side_switch_click',
        product_id: '501',
        variant_id: '601',
        from_side: 'right',
        to_side: 'left',
        placement: 'pdp_purchase_area',
        target_url: '/products/left'
      },
      {
        event: 'ef_fit_whatsapp_click',
        product_id: '502',
        variant_id: '602',
        product_handle: 'fit-product',
        placement: 'pdp_below_primary_cta'
      }
    ]);
  } finally {
    await pixelPage.close();
  }

  process.stdout.write('Custom Pixel normalization: ok\n');
}

try {
  await assertStaticPackage();
  await assertWhatsAppTracking();
  await assertSideSwitchTracking();
  await assertPixelSubscriber();

  for (const viewport of [
    { width: 375, height: 812 },
    { width: 390, height: 844 },
    { width: 430, height: 932 },
    { width: 1440, height: 900 }
  ]) {
    await assertLayout(viewport.width, viewport.height);
  }

  await openAt(390, 844);
  await page.screenshot({
    path: join(mockupDirectory, 'shot-mobile-390-first.png'),
    fullPage: false
  });
  await page.screenshot({
    path: join(mockupDirectory, 'shot-mobile-390-full.png'),
    fullPage: true
  });

  await openAt(1440, 900);
  await page.screenshot({
    path: join(mockupDirectory, 'shot-desktop-1440.png'),
    fullPage: true
  });

  process.stdout.write('screenshots: created\n');
} finally {
  await browser.close();
}
