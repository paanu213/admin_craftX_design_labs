import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import {
  MAX_FILE_SIZE,
  IMAGE_MIME_TYPES,
  validateMagicBytes,
  sanitizeFilename,
  uploadToR2,
} from "@/lib/r2";

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const contentType = request.headers.get("content-type") ?? "";
    if (!contentType.includes("multipart/form-data")) {
      return NextResponse.json({ error: "Expected multipart/form-data" }, { status: 400 });
    }

    const formData = await request.formData();
    const file = formData.get("file");

    if (!file || typeof file === "string") {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    if (file.size === 0) {
      return NextResponse.json({ error: "File is empty" }, { status: 400 });
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: "File exceeds 2 MB limit" }, { status: 413 });
    }

    if (!IMAGE_MIME_TYPES.has(file.type)) {
      return NextResponse.json(
        { error: "Only JPEG, PNG, GIF, and WebP images are allowed" },
        { status: 415 }
      );
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = new Uint8Array(arrayBuffer);

    if (!validateMagicBytes(buffer, file.type)) {
      return NextResponse.json(
        { error: "File content does not match declared type" },
        { status: 415 }
      );
    }

    const safeFilename = sanitizeFilename(file.name || "logo");
    const url = await uploadToR2(buffer, file.type, "logos");

    return NextResponse.json({ url, filename: safeFilename });
  } catch (error) {
    console.error("[POST /api/upload/logo]", error);
    return NextResponse.json({ error: "Upload failed" }, { status: 500 });
  }
}
