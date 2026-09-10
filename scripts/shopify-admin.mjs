import { readFile } from "node:fs/promises";

const API_VERSION = "2026-07";
const EXPECTED_SHOP = "eurofunda-cro-demo";
const EXPECTED_TEMPLATE_SUFFIX = "eurofunda-demo";
const PRODUCT_SPECS = [
  {
    side: "DERECHO",
    handle: "funda-de-sofa-esquinero-derecho-dark-chocolate",
    manifestKey: "derecho",
  },
  {
    side: "IZQUIERDO",
    handle: "funda-de-sofa-esquinero-izquierdo-dark-chocolate",
    manifestKey: "izquierdo",
  },
];
const REPLACED_MEDIA_ALTS = {
  derecho: "Vista frontal del sofá en L derecho con funda Dark Chocolate",
  izquierdo: "Vista frontal del sofá en L izquierdo con funda Dark Chocolate",
};

const PRODUCT_FIELDS = `
  id
  title
  handle
  status
  templateSuffix
  media(first: 100) {
    nodes {
      id
      alt
      mediaContentType
      status
      preview {
        status
      }
      ... on MediaImage {
        image {
          url
          width
          height
        }
      }
    }
    pageInfo {
      hasNextPage
    }
  }
`;

const FIND_PRODUCT_QUERY = `
  query FindProduct($query: String!) {
    products(first: 10, query: $query) {
      nodes {
        ${PRODUCT_FIELDS}
      }
    }
  }
`;

const PRODUCT_BY_ID_QUERY = `
  query ProductById($id: ID!) {
    product: node(id: $id) {
      ... on Product {
        ${PRODUCT_FIELDS}
      }
    }
  }
`;

const UPDATE_PRODUCT_MEDIA_MUTATION = `
  mutation UpdateProductWithNewMedia(
    $product: ProductUpdateInput!
    $media: [CreateMediaInput!]
  ) {
    productUpdate(product: $product, media: $media) {
      product {
        id
        title
      }
      userErrors {
        field
        message
      }
    }
  }
`;

const UPDATE_PRODUCT_TEMPLATE_MUTATION = `
  mutation UpdateProductTemplate($product: ProductUpdateInput!) {
    productUpdate(product: $product) {
      product {
        id
        handle
        templateSuffix
      }
      userErrors {
        field
        message
      }
    }
  }
`;

const DELETE_PRODUCT_MEDIA_MUTATION = `
  mutation DeleteProductMedia($productId: ID!, $mediaIds: [ID!]!) {
    productDeleteMedia(productId: $productId, mediaIds: $mediaIds) {
      deletedMediaIds
      mediaUserErrors { field message }
    }
  }
`;

const REORDER_PRODUCT_MEDIA_MUTATION = `
  mutation ReorderProductMedia($id: ID!, $moves: [MoveInput!]!) {
    productReorderMedia(id: $id, moves: $moves) {
      job { id }
      mediaUserErrors { field message }
    }
  }
`;

function requiredEnvironment(name) {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

function normalizeShop(value) {
  return value
    .replace(/^https?:\/\//i, "")
    .replace(/\.myshopify\.com\/?$/i, "")
    .replace(/\/$/, "")
    .toLowerCase();
}

function sleep(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

function printTable(rows) {
  if (rows.length === 0) return;
  const columns = Object.keys(rows[0]);
  const widths = Object.fromEntries(
    columns.map((column) => [
      column,
      Math.max(column.length, ...rows.map((row) => String(row[column] ?? "").length)),
    ]),
  );
  console.log(columns.map((column) => column.padEnd(widths[column])).join(" | "));
  console.log(columns.map((column) => "-".repeat(widths[column])).join("-|-"));
  for (const row of rows) {
    console.log(
      columns
        .map((column) => String(row[column] ?? "").padEnd(widths[column]))
        .join(" | "),
    );
  }
}

async function acquireAccessToken(shop, clientId, clientSecret) {
  const body = new URLSearchParams({
    grant_type: "client_credentials",
    client_id: clientId,
    client_secret: clientSecret,
  });
  const response = await fetch(
    `https://${shop}.myshopify.com/admin/oauth/access_token`,
    {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
    },
  );
  const payload = await response.json().catch(() => null);
  if (!response.ok || !payload?.access_token) {
    const description = payload?.error_description || payload?.error || response.statusText;
    throw new Error(`Client credentials grant failed (${response.status}): ${description}`);
  }
  console.log("token acquired: yes");
  console.log(`token length: ${payload.access_token.length}`);
  return payload.access_token;
}

function createAdminClient(shop, accessToken) {
  const endpoint = `https://${shop}.myshopify.com/admin/api/${API_VERSION}/graphql.json`;
  return async function adminGraphql(query, variables = {}) {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Shopify-Access-Token": accessToken,
      },
      body: JSON.stringify({ query, variables }),
    });
    const payload = await response.json().catch(() => null);
    if (!response.ok) {
      throw new Error(`Admin GraphQL HTTP ${response.status}: ${response.statusText}`);
    }
    if (!payload) {
      throw new Error("Admin GraphQL returned a non-JSON response");
    }
    if (payload.errors?.length) {
      throw new Error(
        `Admin GraphQL errors: ${payload.errors.map((error) => error.message).join("; ")}`,
      );
    }
    return payload.data;
  };
}

async function loadManifest() {
  const manifestUrl = new URL("../assets/product-images/manifest.json", import.meta.url);
  return JSON.parse(await readFile(manifestUrl, "utf8"));
}

async function findProducts(adminGraphql) {
  const products = [];
  for (const spec of PRODUCT_SPECS) {
    const data = await adminGraphql(FIND_PRODUCT_QUERY, {
      query: `handle:${spec.handle}`,
    });
    const nodes = data.products.nodes;
    if (nodes.length !== 1) {
      throw new Error(
        `${spec.side}: expected exactly one product search result for ${spec.handle}, found ${nodes.length}`,
      );
    }
    const product = nodes[0];
    if (product.handle !== spec.handle) {
      throw new Error(
        `${spec.side}: handle mismatch; expected ${spec.handle}, received ${product.handle}`,
      );
    }
    if (product.media.pageInfo.hasNextPage) {
      throw new Error(`${spec.side}: more than 100 media items; refusing an incomplete safety check`);
    }
    products.push({ spec, product });
  }
  return products;
}

function printProductPreflight(products) {
  printTable(
    products.map(({ spec, product }) => ({
      SIDE: spec.side,
      "PRODUCT GID": product.id,
      TITLE: product.title,
      HANDLE: product.handle,
      STATUS: product.status,
      "TEMPLATE SUFFIX": product.templateSuffix || "(default)",
      "MEDIA COUNT": product.media.nodes.length,
    })),
  );
}

async function assignProductTemplates(adminGraphql, products) {
  const unexpected = products.filter(
    ({ product }) =>
      product.templateSuffix && product.templateSuffix !== EXPECTED_TEMPLATE_SUFFIX,
  );
  if (unexpected.length) {
    throw new Error(
      `Safety gate stopped: unexpected template suffix on ${unexpected
        .map(({ spec, product }) => `${spec.side} (${product.templateSuffix})`)
        .join(", ")}`,
    );
  }

  for (const { spec, product } of products) {
    if (product.templateSuffix === EXPECTED_TEMPLATE_SUFFIX) {
      console.log(`${spec.side}: template already assigned; mutation skipped`);
      continue;
    }
    const data = await adminGraphql(UPDATE_PRODUCT_TEMPLATE_MUTATION, {
      product: { id: product.id, templateSuffix: EXPECTED_TEMPLATE_SUFFIX },
    });
    const result = data.productUpdate;
    if (result.userErrors.length) {
      throw new Error(
        `${spec.side} productUpdate userErrors: ${result.userErrors
          .map((error) => `${error.field?.join(".") || "unknown"}: ${error.message}`)
          .join("; ")}`,
      );
    }
    if (result.product?.templateSuffix !== EXPECTED_TEMPLATE_SUFFIX) {
      throw new Error(`${spec.side}: template assignment was not returned by Shopify`);
    }
    console.log(`${spec.side}: template assigned`);
  }

  const verified = await findProducts(adminGraphql);
  for (const { spec, product } of verified) {
    if (product.templateSuffix !== EXPECTED_TEMPLATE_SUFFIX) {
      throw new Error(`${spec.side}: template verification failed`);
    }
  }
  printProductPreflight(verified);
  console.log(`TEMPLATE ROUTING: PASS (${EXPECTED_TEMPLATE_SUFFIX})`);
}

function mediaAltList(product) {
  return product.media.nodes.map((media) => media.alt || "");
}

function sameList(left, right) {
  return left.length === right.length && left.every((item, index) => item === right[index]);
}

async function waitForMediaAltOrder(adminGraphql, productId, expectedAlts) {
  const startedAt = Date.now();
  while (Date.now() - startedAt <= 120_000) {
    const product = await readProductById(adminGraphql, productId);
    if (
      sameList(mediaAltList(product), expectedAlts) &&
      product.media.nodes.every(
        (media) => media.status === "READY" && media.preview?.status === "READY",
      )
    ) {
      return product;
    }
    await sleep(3_000);
  }
  throw new Error(`Timed out waiting for curated media order on ${productId}`);
}

async function curateProductMedia(adminGraphql, products, manifest) {
  for (const { spec, product: initialProduct } of products) {
    const expected = expectedMedia(manifest, spec);
    const expectedAlts = expected.map((item) => item.alt);
    const oldAlts = [...expectedAlts];
    oldAlts[2] = REPLACED_MEDIA_ALTS[spec.manifestKey];
    let product = initialProduct;
    let currentAlts = mediaAltList(product);

    if (sameList(currentAlts, expectedAlts)) {
      console.log(`${spec.side}: curated gallery already complete; mutation skipped`);
      continue;
    }
    const oldMedia = product.media.nodes.find(
      (media) => media.alt === REPLACED_MEDIA_ALTS[spec.manifestKey],
    );
    const replacement = product.media.nodes.find((media) => media.alt === expectedAlts[2]);
    const initialStateIsSafe =
      sameList(currentAlts, oldAlts) ||
      (currentAlts.length === 6 && oldMedia && replacement);
    if (!initialStateIsSafe) {
      printCurrentMedia(spec.side, product);
      throw new Error(`${spec.side}: safety gate stopped on an unexpected gallery state`);
    }

    if (!replacement) {
      const data = await adminGraphql(UPDATE_PRODUCT_MEDIA_MUTATION, {
        product: { id: product.id },
        media: [expected[2]],
      });
      if (data.productUpdate.userErrors.length) {
        throw new Error(
          `${spec.side}: replacement upload failed: ${data.productUpdate.userErrors
            .map((error) => error.message)
            .join("; ")}`,
        );
      }
      console.log(`${spec.side}: distinct detail image submitted`);
      const readyStartedAt = Date.now();
      do {
        if (Date.now() - readyStartedAt > 120_000) {
          throw new Error(`${spec.side}: timed out waiting for replacement media to become READY`);
        }
        await sleep(3_000);
        product = await readProductById(adminGraphql, product.id);
      } while (
        !product.media.nodes.some(
          (media) =>
            media.alt === expectedAlts[2] &&
            media.status === "READY" &&
            media.preview?.status === "READY",
        )
      );
    }

    const duplicate = product.media.nodes.find(
      (media) => media.alt === REPLACED_MEDIA_ALTS[spec.manifestKey],
    );
    if (duplicate) {
      const data = await adminGraphql(DELETE_PRODUCT_MEDIA_MUTATION, {
        productId: product.id,
        mediaIds: [duplicate.id],
      });
      const result = data.productDeleteMedia;
      if (result.mediaUserErrors.length || !result.deletedMediaIds?.includes(duplicate.id)) {
        throw new Error(
          `${spec.side}: duplicate removal failed: ${result.mediaUserErrors
            .map((error) => error.message)
            .join("; ") || "deleted media ID not returned"}`,
        );
      }
      console.log(`${spec.side}: near-duplicate image removed`);
    }

    product = await readProductById(adminGraphql, product.id);
    const detail = product.media.nodes.find((media) => media.alt === expectedAlts[2]);
    if (!detail || product.media.nodes.length !== 5) {
      throw new Error(`${spec.side}: expected five media items before reordering`);
    }
    if (mediaAltList(product)[2] !== expectedAlts[2]) {
      const data = await adminGraphql(REORDER_PRODUCT_MEDIA_MUTATION, {
        id: product.id,
        moves: [{ id: detail.id, newPosition: "2" }],
      });
      if (data.productReorderMedia.mediaUserErrors.length) {
        throw new Error(
          `${spec.side}: media reorder failed: ${data.productReorderMedia.mediaUserErrors
            .map((error) => error.message)
            .join("; ")}`,
        );
      }
      console.log(`${spec.side}: detail image moved to position 3`);
    }
    product = await waitForMediaAltOrder(adminGraphql, product.id, expectedAlts);
    console.log(`${spec.side}: curated gallery verified (${product.media.nodes.length}/5 READY)`);
  }
  console.log("MEDIA CURATION: PASS");
}

function expectedMedia(manifest, spec) {
  const entries = manifest[spec.manifestKey];
  if (!Array.isArray(entries) || entries.length !== 5) {
    throw new Error(`${spec.side}: manifest must contain exactly five media entries`);
  }
  return entries.map((entry) => ({
    mediaContentType: "IMAGE",
    originalSource: entry.source_url,
    alt: entry.alt_suggestion,
  }));
}

function classifyMediaState(product, expected) {
  const current = product.media.nodes;
  if (current.length === 0) return "UPLOAD";
  const exact =
    current.length === expected.length &&
    current.every(
      (media, index) =>
        media.mediaContentType === "IMAGE" && media.alt === expected[index].alt,
    );
  return exact ? "COMPLETE" : "MISMATCH";
}

function printCurrentMedia(side, product) {
  console.log(`\n${side} current media:`);
  if (product.media.nodes.length === 0) {
    console.log("(none)");
    return;
  }
  printTable(
    product.media.nodes.map((media, index) => ({
      "#": index + 1,
      TYPE: media.mediaContentType,
      ALT: media.alt || "",
      STATUS: media.status,
      "PREVIEW STATUS": media.preview?.status || "",
    })),
  );
}

function assertSafeMediaStates(products, manifest) {
  const decisions = products.map(({ spec, product }) => {
    const expected = expectedMedia(manifest, spec);
    return { spec, product, expected, state: classifyMediaState(product, expected) };
  });
  const mismatches = decisions.filter((decision) => decision.state === "MISMATCH");
  if (mismatches.length) {
    for (const { spec, product } of mismatches) {
      printCurrentMedia(spec.side, product);
    }
    throw new Error(
      "Safety gate stopped: existing media does not exactly match the five expected IMAGE alt texts; no mutations were performed",
    );
  }
  return decisions;
}

async function addProductMedia(adminGraphql, decision) {
  const { spec, product, expected, state } = decision;
  if (state === "COMPLETE") {
    console.log(`${spec.side}: already complete; mutation skipped`);
    return;
  }
  const data = await adminGraphql(UPDATE_PRODUCT_MEDIA_MUTATION, {
    product: { id: product.id },
    media: expected,
  });
  const result = data.productUpdate;
  if (result.userErrors.length) {
    throw new Error(
      `${spec.side} productUpdate userErrors: ${result.userErrors
        .map((error) => `${error.field?.join(".") || "unknown"}: ${error.message}`)
        .join("; ")}`,
    );
  }
  if (!result.product?.id) {
    throw new Error(`${spec.side}: productUpdate returned no product`);
  }
  console.log(`${spec.side}: five media items submitted`);
}

async function readProductById(adminGraphql, id) {
  const data = await adminGraphql(PRODUCT_BY_ID_QUERY, { id });
  if (!data.product) throw new Error(`Product ${id} was not returned after mutation`);
  if (data.product.media.pageInfo.hasNextPage) {
    throw new Error(`Product ${id} has more than 100 media items after mutation`);
  }
  return data.product;
}

function mediaAreReady(product, expected) {
  const media = product.media.nodes;
  return (
    media.length === expected.length &&
    media.every(
      (item, index) =>
        item.mediaContentType === "IMAGE" &&
        item.alt === expected[index].alt &&
        item.status === "READY" &&
        item.preview?.status === "READY" &&
        item.image?.url,
    )
  );
}

async function waitForReady(adminGraphql, decisions) {
  const timeoutMs = 120_000;
  const intervalMs = 4_000;
  const startedAt = Date.now();
  let lastProducts = [];
  while (Date.now() - startedAt <= timeoutMs) {
    lastProducts = [];
    for (const decision of decisions) {
      const product = await readProductById(adminGraphql, decision.product.id);
      lastProducts.push({ ...decision, product });
    }
    if (
      lastProducts.every(({ product, expected }) => mediaAreReady(product, expected))
    ) {
      return lastProducts;
    }
    await sleep(intervalMs);
  }
  for (const { spec, product } of lastProducts) printCurrentMedia(spec.side, product);
  throw new Error("Timed out waiting 120 seconds for all product media to become READY");
}

function printMediaResult(products) {
  const rows = [];
  for (const { spec, product } of products) {
    product.media.nodes.forEach((media, index) => {
      rows.push({
        SIDE: spec.side,
        "#": index + 1,
        ALT: media.alt || "",
        STATUS: `${media.status}/${media.preview?.status || "-"}`,
        "WIDTHxHEIGHT": media.image
          ? `${media.image.width}x${media.image.height}`
          : "-",
        "SHOPIFY CDN URL": media.image?.url || "",
      });
    });
  }
  printTable(rows);
}

async function main() {
  const mode = process.argv[2];
  if (!new Set(["products", "media", "routing", "curate-media"]).has(mode)) {
    throw new Error("Usage: node scripts/shopify-admin.mjs <products|media|routing|curate-media>");
  }
  const shop = normalizeShop(requiredEnvironment("SHOPIFY_SHOP"));
  if (shop !== EXPECTED_SHOP) {
    throw new Error(`Refusing store ${shop}; expected ${EXPECTED_SHOP}`);
  }
  const clientId = requiredEnvironment("SHOPIFY_CLIENT_ID");
  const clientSecret = requiredEnvironment("SHOPIFY_CLIENT_SECRET");
  const accessToken = await acquireAccessToken(shop, clientId, clientSecret);
  const adminGraphql = createAdminClient(shop, accessToken);
  const manifest = await loadManifest();

  const products = await findProducts(adminGraphql);
  printProductPreflight(products);
  if (mode === "products") {
    console.log("READ-ONLY PREFLIGHT: PASS");
    return;
  }
  if (mode === "routing") {
    await assignProductTemplates(adminGraphql, products);
    return;
  }
  if (mode === "curate-media") {
    await curateProductMedia(adminGraphql, products, manifest);
    return;
  }

  const decisions = assertSafeMediaStates(products, manifest);
  console.log("SAFETY GATE: PASS");
  for (const decision of decisions) await addProductMedia(adminGraphql, decision);
  const readyProducts = await waitForReady(adminGraphql, decisions);

  console.log("ADMIN API AUTH: PASS");
  for (const { spec, product } of readyProducts) {
    console.log(`${spec.side}: ${product.media.nodes.length}/5 READY`);
  }
  printMediaResult(readyProducts);
}

main().catch((error) => {
  console.error(`ERROR: ${error.message}`);
  process.exitCode = 1;
});
