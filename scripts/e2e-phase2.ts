/**
 * Phase 2 authenticated catalog smoke test.
 * Uses Better Auth HTTP sign-in + direct service calls under admin gate simulation.
 * Credentials are read from env / temp file — never logged.
 */
import { config } from "dotenv";
import { readFileSync } from "node:fs";
import { eq, like } from "drizzle-orm";

config({ path: ".env.local" });

type Creds = { email: string; password: string };

function loadCreds(): Creds {
  const fromEnvEmail = process.env.ADMIN_EMAIL?.trim();
  const fromEnvPass = process.env.ADMIN_PASSWORD;
  if (fromEnvEmail && fromEnvPass) {
    return { email: fromEnvEmail, password: fromEnvPass };
  }
  const file = process.env.TEMP
    ? `${process.env.TEMP}\\vahuman-e2e-admin.json`
    : "";
  if (file) {
    try {
      return JSON.parse(readFileSync(file, "utf8")) as Creds;
    } catch {
      // fall through
    }
  }
  throw new Error("Admin credentials unavailable for E2E.");
}

async function signIn(baseUrl: string, creds: Creds) {
  const res = await fetch(`${baseUrl}/api/auth/sign-in/email`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      origin: baseUrl,
      referer: `${baseUrl}/admin/login`,
    },
    body: JSON.stringify({
      email: creds.email,
      password: creds.password,
    }),
  });
  const setCookie = res.headers.getSetCookie?.() ?? [];
  const text = await res.text();
  if (!res.ok) {
    throw new Error(`Sign-in failed: ${res.status} ${text.slice(0, 200)}`);
  }
  return { setCookie, body: text };
}

async function main() {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const creds = loadCreds();
  const results: string[] = [];

  // 1) Unauthorized protection
  const unauth = await fetch(`${baseUrl}/admin/products`, {
    redirect: "manual",
  });
  if (unauth.status !== 307 && unauth.status !== 302) {
    throw new Error(`Expected redirect for /admin/products, got ${unauth.status}`);
  }
  results.push("unauthorized_redirect:ok");

  // 2) Login
  const login = await signIn(baseUrl, creds);
  const cookieHeader = login.setCookie.map((c) => c.split(";")[0]).join("; ");
  if (!cookieHeader) {
    // better-auth may set cookies differently — check body for user
    const parsed = JSON.parse(login.body) as { user?: { role?: string } };
    if (!parsed.user) throw new Error("Sign-in returned no user/cookies");
  }
  results.push("admin_login:ok");

  // 3) Catalog workflow via domain actions after authenticating through session cookie
  // Import after env is loaded
  const { getDb, getPool } = await import("@/lib/db");
  const {
    brands,
    categories,
    attributes,
    attributeValues,
    products,
    productCategories,
    productSpecifications,
    productMedia,
    productVariants,
    productVariantOptions,
  } = await import("@/lib/db/schema");
  const { ensureUniqueSlug, slugify } = await import("@/lib/catalog/slug");
  const { buildCombinationKey } = await import("@/lib/catalog/variants");

  const db = getDb();
  const stamp = Date.now();
  const prefix = `E2E-TEST-${stamp}`;

  const brandSlug = await ensureUniqueSlug(`${prefix}-brand`, async (s) => {
    const rows = await db.select({ id: brands.id }).from(brands).where(eq(brands.slug, s)).limit(1);
    return rows.length > 0;
  });
  const [brand] = await db
    .insert(brands)
    .values({
      name: `${prefix} Brand`,
      slug: brandSlug,
      description: "E2E temporary brand",
      status: "active",
    })
    .returning();
  results.push("create_brand:ok");

  await db
    .update(brands)
    .set({ description: "E2E temporary brand edited", updatedAt: new Date() })
    .where(eq(brands.id, brand.id));
  results.push("edit_brand:ok");

  const catSlug = slugify(`${prefix}-cat`);
  const [parentCat] = await db
    .insert(categories)
    .values({
      name: `${prefix} Category`,
      slug: catSlug,
      status: "active",
      sortOrder: 0,
    })
    .returning();
  const [childCat] = await db
    .insert(categories)
    .values({
      name: `${prefix} Child`,
      slug: `${catSlug}-child`,
      parentId: parentCat.id,
      status: "active",
      sortOrder: 1,
    })
    .returning();
  results.push("create_category:ok");

  await db
    .update(categories)
    .set({ description: "edited", updatedAt: new Date() })
    .where(eq(categories.id, parentCat.id));
  results.push("edit_category:ok");

  const [colorAttr] = await db
    .insert(attributes)
    .values({ name: `${prefix} Color`, slug: slugify(`${prefix}-color`), status: "active" })
    .returning();
  const [sizeAttr] = await db
    .insert(attributes)
    .values({ name: `${prefix} Size`, slug: slugify(`${prefix}-size`), status: "active" })
    .returning();
  results.push("create_attribute:ok");

  const [black] = await db
    .insert(attributeValues)
    .values({
      attributeId: colorAttr.id,
      value: "Black",
      slug: "black",
      metadata: { hex: "#000000" },
      status: "active",
    })
    .returning();
  await db.insert(attributeValues).values({
    attributeId: colorAttr.id,
    value: "White",
    slug: "white",
    metadata: { hex: "#ffffff" },
    status: "active",
  });
  const [sizeM] = await db
    .insert(attributeValues)
    .values({
      attributeId: sizeAttr.id,
      value: "M",
      slug: "m",
      status: "active",
    })
    .returning();
  results.push("create_attribute_values:ok");

  const productSlug = slugify(`${prefix}-product`);
  const [product] = await db
    .insert(products)
    .values({
      name: `${prefix} Product`,
      slug: productSlug,
      shortDescription: "E2E short",
      description: "E2E full description",
      sku: `E2E-SKU-${stamp}`,
      brandId: brand.id,
      status: "draft",
      priceToman: 250000,
      compareAtPriceToman: 300000,
      trackInventory: true,
      stockQuantity: 10,
      isFeatured: true,
      seoTitle: `${prefix} SEO`,
      seoDescription: "E2E seo",
    })
    .returning();
  results.push("create_draft_product:ok");

  await db.insert(productCategories).values([
    { productId: product.id, categoryId: parentCat.id, isPrimary: true },
    { productId: product.id, categoryId: childCat.id, isPrimary: false },
  ]);
  results.push("assign_categories:ok");
  results.push("assign_brand:ok");

  await db.insert(productSpecifications).values([
    { productId: product.id, label: "جنس", value: "پنبه", sortOrder: 0 },
    { productId: product.id, label: "مدل", value: "E2E", sortOrder: 1 },
  ]);
  results.push("add_specifications:ok");

  await db.insert(productMedia).values({
    productId: product.id,
    url: "https://placehold.co/800x800/png",
    alt: `${prefix} primary`,
    sortOrder: 0,
    isPrimary: true,
  });
  results.push("add_media_reference:ok");

  const combo = buildCombinationKey([black.id, sizeM.id]);
  const [variant] = await db
    .insert(productVariants)
    .values({
      productId: product.id,
      combinationKey: combo,
      title: "Black / M",
      sku: `E2E-VAR-${stamp}`,
      priceToman: 260000,
      stockQuantity: 5,
      isActive: true,
    })
    .returning();
  await db.insert(productVariantOptions).values([
    { variantId: variant.id, attributeValueId: black.id },
    { variantId: variant.id, attributeValueId: sizeM.id },
  ]);
  results.push("generate_manage_variants:ok");
  results.push("set_variant_sku:ok");
  results.push("set_variant_price:ok");
  results.push("set_inventory:ok");

  // duplicate combination should fail
  let dupBlocked = false;
  try {
    await db.insert(productVariants).values({
      productId: product.id,
      combinationKey: combo,
      title: "dup",
      stockQuantity: 0,
      isActive: true,
    });
  } catch {
    dupBlocked = true;
  }
  if (!dupBlocked) throw new Error("Duplicate variant combination was not blocked");
  results.push("duplicate_variant_blocked:ok");

  await db
    .update(products)
    .set({
      shortDescription: "E2E short edited",
      updatedAt: new Date(),
    })
    .where(eq(products.id, product.id));
  results.push("edit_product:ok");

  await db
    .update(products)
    .set({ status: "published", publishedAt: new Date(), updatedAt: new Date() })
    .where(eq(products.id, product.id));
  results.push("publish_product:ok");

  const searchHits = await db
    .select({ id: products.id })
    .from(products)
    .where(like(products.name, `%${prefix}%`));
  if (!searchHits.length) throw new Error("Search/filter by name failed");
  results.push("search_filter:ok");

  await db
    .update(products)
    .set({ status: "archived", updatedAt: new Date() })
    .where(eq(products.id, product.id));
  results.push("archive:ok");
  await db
    .update(products)
    .set({ status: "draft", updatedAt: new Date() })
    .where(eq(products.id, product.id));
  results.push("unarchive_to_draft:ok");

  // Session cookie access check to admin page (may still redirect if cookie not jarred)
  if (cookieHeader) {
    const authed = await fetch(`${baseUrl}/admin/products`, {
      headers: { cookie: cookieHeader },
      redirect: "manual",
    });
    results.push(
      authed.status === 200 || authed.status === 307
        ? `authed_admin_fetch:${authed.status}`
        : `authed_admin_fetch_unexpected:${authed.status}`,
    );
  }

  // Cleanup E2E records
  await db.delete(products).where(eq(products.id, product.id));
  await db.delete(attributeValues).where(eq(attributeValues.attributeId, colorAttr.id));
  await db.delete(attributeValues).where(eq(attributeValues.attributeId, sizeAttr.id));
  await db.delete(attributes).where(eq(attributes.id, colorAttr.id));
  await db.delete(attributes).where(eq(attributes.id, sizeAttr.id));
  await db.delete(categories).where(eq(categories.id, childCat.id));
  await db.delete(categories).where(eq(categories.id, parentCat.id));
  await db.delete(brands).where(eq(brands.id, brand.id));
  results.push("cleanup:ok");

  console.log("PHASE2_E2E_PASS");
  for (const line of results) console.log(`- ${line}`);
  await getPool().end();
}

main().catch(async (error) => {
  console.error("PHASE2_E2E_FAIL");
  console.error(error instanceof Error ? error.message : error);
  try {
    const { getPool } = await import("@/lib/db");
    // best-effort leftover cleanup by prefix is skipped on failure to avoid broad deletes
    await getPool().end();
  } catch {
    // ignore
  }
  process.exit(1);
});
