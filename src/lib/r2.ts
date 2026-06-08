import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { randomUUID } from "crypto";

const ALLOWED_MIME_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  "application/pdf",
]);

// Magic byte signatures for each allowed type
const MAGIC_SIGNATURES: Record<string, number[][]> = {
  "image/jpeg": [[0xff, 0xd8, 0xff]],
  "image/png":  [[0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]],
  "image/gif":  [[0x47, 0x49, 0x46, 0x38, 0x37, 0x61], [0x47, 0x49, 0x46, 0x38, 0x39, 0x61]],
  "image/webp": [[0x52, 0x49, 0x46, 0x46]], // RIFF header
  "application/pdf": [[0x25, 0x50, 0x44, 0x46]], // %PDF
};

const EXTENSION_MAP: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/gif": "gif",
  "image/webp": "webp",
  "application/pdf": "pdf",
};

export const MAX_FILE_SIZE = 2 * 1024 * 1024; // 2 MB

function getR2Client() {
  return new S3Client({
    region: "auto",
    endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: process.env.R2_ACCESS_KEY_ID!,
      secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
    },
  });
}

export function validateMimeType(mime: string): boolean {
  return ALLOWED_MIME_TYPES.has(mime);
}

export function validateMagicBytes(buffer: Uint8Array, mime: string): boolean {
  const signatures = MAGIC_SIGNATURES[mime];
  if (!signatures) return false;
  return signatures.some((sig) => sig.every((byte, i) => buffer[i] === byte));
}

export function sanitizeFilename(name: string): string {
  return name
    .replace(/[^\w.\-]/g, "_")   // only word chars, dot, hyphen
    .replace(/\.{2,}/g, ".")      // no double dots (path traversal)
    .replace(/^\./, "_")          // no leading dot
    .slice(0, 80);                // cap length
}

export async function uploadReceiptToR2(
  buffer: Uint8Array,
  originalName: string,
  mimeType: string
): Promise<string> {
  const ext = EXTENSION_MAP[mimeType] ?? "bin";
  const key = `receipts/${randomUUID()}.${ext}`;

  const client = getR2Client();
  await client.send(
    new PutObjectCommand({
      Bucket: process.env.R2_BUCKET_NAME!,
      Key: key,
      Body: Buffer.from(buffer),
      ContentType: mimeType,
      // Prevent serving as HTML to block stored-XSS via uploaded files
      ContentDisposition: mimeType === "application/pdf" ? "inline" : "inline",
      CacheControl: "private, max-age=31536000",
    })
  );

  return `${process.env.R2_PUBLIC_URL}/${key}`;
}
