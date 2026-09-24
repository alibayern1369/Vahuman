import { eq } from "drizzle-orm";
import { hashPassword } from "better-auth/crypto";
import { config } from "dotenv";
import { randomUUID } from "node:crypto";

config({ path: ".env.local" });
config({ path: ".env" });

async function main() {
  const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD;
  const name = process.env.ADMIN_NAME?.trim() || "مدیر وهومن";

  if (!email || !password) {
    console.error(
      "Set ADMIN_EMAIL and ADMIN_PASSWORD in .env.local before seeding.",
    );
    process.exit(1);
  }

  if (password.length < 10) {
    console.error("ADMIN_PASSWORD must be at least 10 characters.");
    process.exit(1);
  }

  const { getDb, getPool } = await import("@/lib/db");
  const { user, account, storeSettings } = await import("@/lib/db/schema");
  const db = getDb();

  const existing = await db
    .select({ id: user.id, role: user.role })
    .from(user)
    .where(eq(user.email, email))
    .limit(1);

  if (existing[0]) {
    if (existing[0].role !== "admin") {
      await db
        .update(user)
        .set({ role: "admin", name, updatedAt: new Date() })
        .where(eq(user.id, existing[0].id));
      console.log("Existing user promoted to admin:", email);
    } else {
      console.log("Admin already exists:", email);
    }
  } else {
    const userId = randomUUID();
    const hashed = await hashPassword(password);
    const now = new Date();

    await db.insert(user).values({
      id: userId,
      name,
      email,
      emailVerified: true,
      role: "admin",
      createdAt: now,
      updatedAt: now,
    });

    await db.insert(account).values({
      id: randomUUID(),
      accountId: userId,
      providerId: "credential",
      userId,
      password: hashed,
      createdAt: now,
      updatedAt: now,
    });

    console.log("Admin user created:", email);
  }

  const defaults: Array<{ key: string; value: string }> = [
    {
      key: "store.name",
      value: JSON.stringify("وهومن"),
    },
    {
      key: "store.nameLatin",
      value: JSON.stringify("VAHUMAN"),
    },
    {
      key: "store.tagline",
      value: JSON.stringify("فروشگاه اینترنتی وهومن"),
    },
  ];

  for (const item of defaults) {
    await db
      .insert(storeSettings)
      .values({ key: item.key, value: item.value })
      .onConflictDoUpdate({
        target: storeSettings.key,
        set: { value: item.value, updatedAt: new Date() },
      });
  }

  console.log("Default store settings ensured.");
  await getPool().end();
}

main().catch(async (error: unknown) => {
  console.error("Seed failed.");
  if (error instanceof Error) {
    console.error(error.message);
  }
  try {
    const { getPool } = await import("@/lib/db");
    await getPool().end();
  } catch {
    // ignore
  }
  process.exit(1);
});
