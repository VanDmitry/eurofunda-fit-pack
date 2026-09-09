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

async function assertTracking() {
  const snippet = await readFile(join(projectDirectory, 'snippets', 'ef-fit-assistant.liquid'), 'utf8');
  const scriptMatch = snippet.match(/<script>([\s\S]*?)<\/script>/);
  assert.ok(scriptMatch, 'Tracking script not found in ef-fit-assistant.liquid');

  await page.setContent(`
    <a
      id="ef-test-first"
      href="#first"
      data-ef-fit-whatsapp
      data-product-id="101"
      data-variant-id="201"
      data-product-handle="first-product"
      data-placement="pdp_below_primary_cta"
    >First</a>
    <a
      id="ef-test-second"
      href="#second"
      data-ef-fit-whatsapp
      data-product-id="102"
      data-variant-id="202"
      data-product-handle="second-product"
      data-placement="pdp_below_primary_cta"
    >Second</a>
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
    <script>${scriptMatch[1]}</script>
    <script>${scriptMatch[1]}</script>
  `);

  assert.equal(await page.evaluate(() => window.__efPublishedEvents.length), 0, 'Event published on page load');
  await page.click('#ef-test-second');

  const publishedEvents = await page.evaluate(() => window.__efPublishedEvents);
  assert.equal(publishedEvents.length, 1, 'One click must publish exactly one event');
  assert.deepEqual(publishedEvents[0], {
    name: 'eurofunda:fit_whatsapp_click',
    payload: {
      product_id: '102',
      variant_id: '202',
      product_handle: 'second-product',
      placement: 'pdp_below_primary_cta'
    }
  });
  process.stdout.write('tracking load/click/deduplication: ok\n');
}

try {
  for (const viewport of [
    { width: 375, height: 812 },
    { width: 390, height: 844 },
    { width: 430, height: 932 },
    { width: 1440, height: 900 }
  ]) {
    await assertLayout(viewport.width, viewport.height);
  }

  await assertTracking();

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
