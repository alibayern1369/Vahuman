/**
 * Private object storage abstraction for payment receipts.
 *
 * - Never store receipt binaries in PostgreSQL.
 * - Keys must be randomized / non-guessable.
 * - Objects are NOT publicly enumerable.
 *
 * Adapters:
 * - local-dev: filesystem under `.data/private-receipts/` (gitignored)
 * - s3-compatible: blocked until STORAGE_* credentials are configured
 *
 * Trigger later: replace getPrivateStorage() selection when production provider is ready.
 */
import { createHash, randomBytes } from "node:crypto";
import { mkdir, readFile, writeFile, unlink, access } from "node:fs/promises";
import path from "node:path";

export type PrivateObjectMeta = {
  key: string;
  mimeType: string;
  size: number;
};

export type PrivateStorage = {
  readonly provider: "local-dev" | "s3";
  putObject(input: {
    key: string;
    body: Buffer;
    mimeType: string;
  }): Promise<PrivateObjectMeta>;
  getObject(key: string): Promise<{ body: Buffer; mimeType: string } | null>;
  deleteObject(key: string): Promise<void>;
};

const ALLOWED_RECEIPT_MIME = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/pdf",
]);

export const RECEIPT_MAX_BYTES = 5 * 1024 * 1024;

export function assertAllowedReceiptMime(mimeType: string): string {
  const normalized = mimeType.toLowerCase().split(";")[0]!.trim();
  if (!ALLOWED_RECEIPT_MIME.has(normalized)) {
    throw new Error("نوع فایل رسید مجاز نیست (فقط JPEG/PNG/WebP/PDF).");
  }
  return normalized;
}

export function assertReceiptSize(size: number): void {
  if (!Number.isInteger(size) || size <= 0) {
    throw new Error("اندازه فایل نامعتبر است.");
  }
  if (size > RECEIPT_MAX_BYTES) {
    throw new Error("حجم فایل رسید نباید بیشتر از ۵ مگابایت باشد.");
  }
}

/** Sniff magic bytes — never trust extension alone. */
export function detectReceiptMime(buffer: Buffer): string | null {
  if (buffer.length < 4) return null;
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return "image/jpeg";
  }
  if (
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47
  ) {
    return "image/png";
  }
  if (
    buffer.length >= 12 &&
    buffer.toString("ascii", 0, 4) === "RIFF" &&
    buffer.toString("ascii", 8, 12) === "WEBP"
  ) {
    return "image/webp";
  }
  if (buffer.toString("ascii", 0, 5) === "%PDF-") {
    return "application/pdf";
  }
  return null;
}

export function buildReceiptStorageKey(orderId: string): string {
  const rand = randomBytes(16).toString("hex");
  const hash = createHash("sha256")
    .update(`${orderId}:${rand}`)
    .digest("hex")
    .slice(0, 16);
  return `receipts/${orderId}/${rand}-${hash}`;
}

class LocalDevPrivateStorage implements PrivateStorage {
  readonly provider = "local-dev" as const;
  private root: string;

  constructor(root = path.join(process.cwd(), ".data", "private-receipts")) {
    this.root = root;
  }

  private resolve(key: string): string {
    if (key.includes("..") || key.startsWith("/") || key.includes("\\")) {
      throw new Error("Invalid storage key");
    }
    const full = path.join(this.root, key);
    if (!full.startsWith(this.root)) {
      throw new Error("Invalid storage path");
    }
    return full;
  }

  async putObject(input: {
    key: string;
    body: Buffer;
    mimeType: string;
  }): Promise<PrivateObjectMeta> {
    const full = this.resolve(input.key);
    await mkdir(path.dirname(full), { recursive: true });
    await writeFile(full, input.body);
    await writeFile(`${full}.meta.json`, JSON.stringify({ mimeType: input.mimeType }));
    return {
      key: input.key,
      mimeType: input.mimeType,
      size: input.body.length,
    };
  }

  async getObject(
    key: string,
  ): Promise<{ body: Buffer; mimeType: string } | null> {
    const full = this.resolve(key);
    try {
      await access(full);
    } catch {
      return null;
    }
    const body = await readFile(full);
    let mimeType = "application/octet-stream";
    try {
      const meta = JSON.parse(
        (await readFile(`${full}.meta.json`)).toString("utf8"),
      ) as { mimeType?: string };
      if (meta.mimeType) mimeType = meta.mimeType;
    } catch {
      // ignore
    }
    return { body, mimeType };
  }

  async deleteObject(key: string): Promise<void> {
    const full = this.resolve(key);
    try {
      await unlink(full);
    } catch {
      // idempotent
    }
    try {
      await unlink(`${full}.meta.json`);
    } catch {
      // idempotent
    }
  }
}

class UnconfiguredS3Storage implements PrivateStorage {
  readonly provider = "s3" as const;

  async putObject(): Promise<PrivateObjectMeta> {
    throw new Error(
      "Object storage is not configured. Set STORAGE_* env vars for production receipts.",
    );
  }
  async getObject(): Promise<null> {
    throw new Error("Object storage is not configured.");
  }
  async deleteObject(): Promise<void> {
    throw new Error("Object storage is not configured.");
  }
}

let cached: PrivateStorage | null = null;

export function getPrivateStorage(): PrivateStorage {
  if (cached) return cached;
  const provider = process.env.STORAGE_PROVIDER?.trim().toLowerCase();
  if (provider === "s3") {
    const ready =
      process.env.STORAGE_BUCKET &&
      process.env.STORAGE_ACCESS_KEY &&
      process.env.STORAGE_SECRET_KEY;
    cached = ready ? new UnconfiguredS3Storage() : new UnconfiguredS3Storage();
    // Production S3 adapter intentionally not faked — use local-dev until implemented.
    if (!ready) {
      cached = new UnconfiguredS3Storage();
    } else {
      // Credentials present but adapter not yet implemented — fail closed.
      cached = new UnconfiguredS3Storage();
    }
    return cached;
  }
  cached = new LocalDevPrivateStorage();
  return cached;
}

export function getStorageStatus(): {
  provider: string;
  ready: boolean;
  note: string;
} {
  const storage = getPrivateStorage();
  if (storage.provider === "local-dev") {
    return {
      provider: "local-dev",
      ready: true,
      note: "Development filesystem adapter under .data/private-receipts (not for production).",
    };
  }
  return {
    provider: "s3",
    ready: false,
    note: "S3-compatible adapter schema ready; production credentials/adapter wiring still blocked.",
  };
}
