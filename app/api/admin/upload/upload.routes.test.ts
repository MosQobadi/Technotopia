import { existsSync } from "node:fs";
import { rm } from "node:fs/promises";
import path from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { getCookieName, signToken } from "@/lib/auth";
import { Role } from "@/lib/generated/prisma/enums";

const { putMock } = vi.hoisted(() => ({ putMock: vi.fn() }));
vi.mock("@vercel/blob", () => ({ put: putMock }));

const { POST: upload } = await import("./route");

const UPLOAD_DIR = path.join(process.cwd(), "public", "uploads");

function req(options: { formData?: FormData; cookie?: string | null } = {}) {
  const headers: Record<string, string> = {};
  if (options.cookie !== undefined) {
    if (options.cookie !== null) headers.cookie = `${getCookieName()}=${options.cookie}`;
  }

  return new NextRequest("http://localhost/api/admin/upload", {
    method: "POST",
    headers,
    body: options.formData,
  });
}

const PNG_SIGNATURE = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];

function imageFile(bytes: number, type = "image/png", name = "test.png") {
  const data = new Uint8Array(bytes);
  if (type === "image/png") {
    data.set(PNG_SIGNATURE.slice(0, Math.min(bytes, PNG_SIGNATURE.length)));
  }
  return new File([data], name, { type });
}

describe("POST /api/admin/upload", () => {
  let writtenFilename: string | null = null;

  afterEach(async () => {
    if (writtenFilename) {
      await rm(path.join(UPLOAD_DIR, writtenFilename), { force: true });
      writtenFilename = null;
    }
    delete process.env.VERCEL;
    putMock.mockReset();
  });

  it("requires authentication", async () => {
    const formData = new FormData();
    formData.set("file", imageFile(10));
    const response = await upload(req({ formData, cookie: null }));
    expect(response.status).toBe(401);
  });

  it("rejects non-admin roles", async () => {
    const customerCookie = await signToken({ userId: "upload-customer", role: Role.CUSTOMER });
    const formData = new FormData();
    formData.set("file", imageFile(10));
    const response = await upload(req({ formData, cookie: customerCookie }));
    expect(response.status).toBe(403);
  });

  it("rejects a request with no file", async () => {
    const adminCookie = await signToken({ userId: "upload-admin", role: Role.ADMIN });
    const response = await upload(req({ formData: new FormData(), cookie: adminCookie }));
    expect(response.status).toBe(400);
  });

  it("rejects an unsupported file type", async () => {
    const adminCookie = await signToken({ userId: "upload-admin", role: Role.ADMIN });
    const formData = new FormData();
    formData.set("file", imageFile(10, "application/pdf", "test.pdf"));
    const response = await upload(req({ formData, cookie: adminCookie }));
    expect(response.status).toBe(400);
  });

  it("rejects a file over the size limit", async () => {
    const adminCookie = await signToken({ userId: "upload-admin", role: Role.ADMIN });
    const formData = new FormData();
    formData.set("file", imageFile(6 * 1024 * 1024));
    const response = await upload(req({ formData, cookie: adminCookie }));
    expect(response.status).toBe(400);
  });

  it("writes a valid image and returns its public url", async () => {
    const adminCookie = await signToken({ userId: "upload-admin", role: Role.ADMIN });
    const formData = new FormData();
    formData.set("file", imageFile(10));
    const response = await upload(req({ formData, cookie: adminCookie }));
    const body = await response.json();

    expect(response.status).toBe(201);
    expect(body.success).toBe(true);
    expect(body.data.url).toMatch(/^\/uploads\/[\w-]+\.png$/);

    writtenFilename = path.basename(body.data.url);
    expect(existsSync(path.join(UPLOAD_DIR, writtenFilename))).toBe(true);
  });

  it("uploads to Vercel Blob instead of disk when running on Vercel", async () => {
    process.env.VERCEL = "1";
    putMock.mockResolvedValue({ url: "https://example.public.blob.vercel-storage.com/uploads/test.png" });

    const adminCookie = await signToken({ userId: "upload-admin", role: Role.ADMIN });
    const formData = new FormData();
    formData.set("file", imageFile(10));
    const response = await upload(req({ formData, cookie: adminCookie }));
    const body = await response.json();

    expect(response.status).toBe(201);
    expect(body.data.url).toBe("https://example.public.blob.vercel-storage.com/uploads/test.png");
    expect(putMock).toHaveBeenCalledTimes(1);
  });

  it("returns a 500 with a clean error when the blob upload fails", async () => {
    process.env.VERCEL = "1";
    putMock.mockRejectedValue(new Error("network error"));

    const adminCookie = await signToken({ userId: "upload-admin", role: Role.ADMIN });
    const formData = new FormData();
    formData.set("file", imageFile(10));
    const response = await upload(req({ formData, cookie: adminCookie }));
    const body = await response.json();

    expect(response.status).toBe(500);
    expect(body.success).toBe(false);
  });
});
