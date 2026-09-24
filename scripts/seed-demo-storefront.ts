/**
 * Upserts a clearly labeled demo published product for local storefront smoke tests.
 */
import { config } from "dotenv";
import { eq } from "drizzle-orm";

config({ path: ".env.local" });

async function main() {
  const { getDb, getPool } = await import("@/lib/db");
  const { products, productMedia } = await import("@/lib/db/schema");
  const db = getDb();
  const slug = "vahuman-demo-product";

  const existing = await db
    .select({ id: products.id })
    .from(products)
    .where(eq(products.slug, slug))
    .limit(1);

  let productId = existing[0]?.id;
  if (!productId) {
    const [row] = await db
      .insert(products)
      .values({
        name: "محصول نمونه وهومن",
        slug,
        shortDescription: "نمونه برای تست فروشگاه عمومی",
        description: "این محصول دمو برای بررسی صفحه فروشگاه و سبد خرید است.",
        sku: "VAHUMAN-DEMO",
        status: "published",
        priceToman: 450000,
        compareAtPriceToman: 520000,
        trackInventory: true,
        stockQuantity: 25,
        isFeatured: true,
        seoTitle: "محصول نمونه وهومن",
        seoDescription: "دموی فروشگاه وهومن",
        publishedAt: new Date(),
      })
      .returning({ id: products.id });
    productId = row.id;
    await db.insert(productMedia).values({
      productId,
      url: "https://placehold.co/800x1000/png",
      alt: "محصول نمونه وهومن",
      isPrimary: true,
      sortOrder: 0,
    });
    console.log("Demo product created:", slug);
  } else {
    await db
      .update(products)
      .set({
        status: "published",
        publishedAt: new Date(),
        isFeatured: true,
        updatedAt: new Date(),
      })
      .where(eq(products.id, productId));
    console.log("Demo product ensured published:", slug);
  }

  await getPool().end();
}

main().catch(async (error) => {
  console.error(error);
  try {
    const { getPool } = await import("@/lib/db");
    await getPool().end();
  } catch {
    // ignore
  }
  process.exit(1);
});
