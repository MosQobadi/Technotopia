import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { put } from "@vercel/blob";
import { NextResponse, type NextRequest } from "next/server";
import { requireAdmin } from "@/lib/auth";

const MAX_FILE_SIZE = 5 * 1024 * 1024;

const EXTENSION_BY_TYPE: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
  "image/gif": "gif",
};

/**
 * `file.type` is just the client-supplied Content-Type header and is trivially
 * spoofable, so re-derive the type from the file's magic bytes and require it to
 * match what the client claimed before trusting it for the extension/storage.
 */
function sniffImageType(buffer: Buffer): string | null {
  if (
    buffer.length >= 8 &&
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47
  ) {
    return "image/png";
  }
  if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return "image/jpeg";
  }
  if (
    buffer.length >= 6 &&
    (buffer.toString("ascii", 0, 6) === "GIF87a" || buffer.toString("ascii", 0, 6) === "GIF89a")
  ) {
    return "image/gif";
  }
  if (
    buffer.length >= 12 &&
    buffer.toString("ascii", 0, 4) === "RIFF" &&
    buffer.toString("ascii", 8, 12) === "WEBP"
  ) {
    return "image/webp";
  }
  return null;
}

export async function POST(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (!auth.ok) {
    return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
  }

  const formData = await request.formData().catch(() => null);
  const file = formData?.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ success: false, error: "No file provided." }, { status: 400 });
  }

  const extension = EXTENSION_BY_TYPE[file.type];
  if (!extension) {
    return NextResponse.json(
      { success: false, error: "Unsupported image type. Use PNG, JPG, WEBP, or GIF." },
      { status: 400 },
    );
  }
  if (file.size > MAX_FILE_SIZE) {
    return NextResponse.json(
      { success: false, error: "Image must be 5MB or smaller." },
      { status: 400 },
    );
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  if (sniffImageType(buffer) !== file.type) {
    return NextResponse.json(
      { success: false, error: "File content does not match the declared image type." },
      { status: 400 },
    );
  }

  const filename = `${randomUUID()}.${extension}`;

  try {
    const url = await storeUpload(filename, buffer, file.type);
    return NextResponse.json({ success: true, data: { url } }, { status: 201 });
  } catch {
    return NextResponse.json(
      { success: false, error: "Upload failed. Please try again." },
      { status: 500 },
    );
  }
}

/**
 * The real deployment target is the Docker/Nginx VPS from DEPLOYMENT.md, where
 * `public/uploads` is a persistent volume — so local disk is the normal path.
 * Vercel is only used for preview builds here, and its serverless functions have
 * a read-only filesystem, so previews fall back to Vercel Blob instead.
 */
async function storeUpload(filename: string, buffer: Buffer, contentType: string) {
  if (process.env.VERCEL) {
    const blob = await put(`uploads/${filename}`, buffer, {
      access: "public",
      contentType,
      addRandomSuffix: false,
    });
    return blob.url;
  }

  const uploadDir = path.join(process.cwd(), "public", "uploads");
  await mkdir(uploadDir, { recursive: true });
  await writeFile(path.join(uploadDir, filename), buffer);
  return `/uploads/${filename}`;
}
