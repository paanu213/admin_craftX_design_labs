import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import {
  MAX_FILE_SIZE,
  validateMimeType,
  validateMagicBytes,
  sanitizeFilename,
  uploadReceiptToR2,
} from "@/lib/r2";

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const contentType = request.headers.get("content-type") ?? "";
    if (!contentType.includes("multipart/form-data")) {
      return NextResponse.json({ error: "Expected multipart/form-data" }, { status: 400 });
    }

    const formData = await request.formData();
    const file = formData.get("file");

    if (!file || typeof file === "string") {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    // 1. Size check
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: "File exceeds 2 MB limit" },
        { status: 413 }
      );
    }

    if (file.size === 0) {
      return NextResponse.json({ error: "File is empty" }, { status: 400 });
    }

    // 2. MIME type check (declared type)
    if (!validateMimeType(file.type)) {
      return NextResponse.json(
        { error: "Only JPEG, PNG, GIF, WebP, and PDF files are allowed" },
        { status: 415 }
      );
    }

    // 3. Read buffer and validate magic bytes (actual content)
    const arrayBuffer = await file.arrayBuffer();
    const buffer = new Uint8Array(arrayBuffer);

    if (!validateMagicBytes(buffer, file.type)) {
      return NextResponse.json(
        { error: "File content does not match declared type" },
        { status: 415 }
      );
    }

    // 4. Sanitize filename (used only for display; storage key is UUID-based)
    const safeFilename = sanitizeFilename(file.name || "receipt");

    // 5. Upload to R2
    const url = await uploadReceiptToR2(buffer, safeFilename, file.type);

    return NextResponse.json({ url, filename: safeFilename });
  } catch (error) {
    console.error("[POST /api/upload/receipt]", error);
    return NextResponse.json({ error: "Upload failed" }, { status: 500 });
  }
}
