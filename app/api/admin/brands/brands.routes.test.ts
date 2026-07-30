import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import { DELETE, GET as getOne, PATCH } from "./[id]/route";
import { GET as list, POST as create } from "./route";
import { getCookieName, signToken } from "@/lib/auth";
import { Role, Status } from "@/lib/generated/prisma/enums";
import { prisma } from "@/lib/db";

const PREFIX = "task61";
const adminId = "task61-admin-id";

let adminCookie: string;
let customerCookie: string;

beforeAll(async () => {
  adminCookie = await signToken({ userId: adminId, role: Role.ADMIN });
  customerCookie = await signToken({ userId: "task61-customer-id", role: Role.CUSTOMER });
});

afterAll(async () => {
  await prisma.product.deleteMany({ where: { sku: { startsWith: PREFIX } } });
  await prisma.brand.deleteMany({ where: { slug: { startsWith: PREFIX } } });
  await prisma.category.deleteMany({ where: { slug: { startsWith: PREFIX } } });
  await prisma.$disconnect();
});

function req(
  url: string,
  options: { method?: string; body?: unknown; cookie?: string | null } = {},
) {
  const headers: Record<string, string> = {};
  if (options.body !== undefined) headers["content-type"] = "application/json";
  if (options.cookie !== undefined) {
    if (options.cookie !== null) headers.cookie = `${getCookieName()}=${options.cookie}`;
  } else {
    headers.cookie = `${getCookieName()}=${adminCookie}`;
  }

  return new NextRequest(`http://localhost${url}`, {
    method: options.method ?? "GET",
    headers,
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
  });
}

function validBrandBody(overrides: Record<string, unknown> = {}) {
  return {
    name: `${PREFIX} Nikon`,
    status: Status.ACTIVE,
    ...overrides,
  };
}

async function createBrandDirect(overrides: Record<string, unknown> = {}) {
  const response = await create(
    req("/api/admin/brands", { method: "POST", body: validBrandBody(overrides) }),
  );
  const body = await response.json();
  return { response, body };
}

describe("POST /api/admin/brands", () => {
  it("requires authentication", async () => {
    const response = await create(
      req("/api/admin/brands", { method: "POST", body: validBrandBody(), cookie: null }),
    );
    expect(response.status).toBe(401);
  });

  it("rejects non-admin roles", async () => {
    const response = await create(
      req("/api/admin/brands", {
        method: "POST",
        body: validBrandBody(),
        cookie: customerCookie,
      }),
    );
    expect(response.status).toBe(403);
  });

  it("auto-generates a slug from the name when none is provided", async () => {
    const { response, body } = await createBrandDirect({ name: `${PREFIX} Canon` });

    expect(response.status).toBe(201);
    expect(body.success).toBe(true);
    expect(body.data.slug).toBe("task61-canon");
    expect(body.data.productCount).toBe(0);
  });

  it("uses an explicitly provided slug instead of generating one", async () => {
    const { response, body } = await createBrandDirect({
      name: `${PREFIX} Sony`,
      slug: `${PREFIX}-custom-brand-slug`,
    });

    expect(response.status).toBe(201);
    expect(body.data.slug).toBe(`${PREFIX}-custom-brand-slug`);
  });

  it("rejects a duplicate slug with a clear error", async () => {
    await createBrandDirect({ name: `${PREFIX} Dup A`, slug: `${PREFIX}-dup-brand-slug` });
    const { response, body } = await createBrandDirect({
      name: `${PREFIX} Dup B`,
      slug: `${PREFIX}-dup-brand-slug`,
    });

    expect(response.status).toBe(409);
    expect(body.success).toBe(false);
    expect(body.error).toMatch(/slug/i);
  });

  it("rejects an invalid body with a 400", async () => {
    const response = await create(
      req("/api/admin/brands", {
        method: "POST",
        body: validBrandBody({ name: "" }),
      }),
    );
    expect(response.status).toBe(400);
  });
});

describe("GET /api/admin/brands", () => {
  it("lists brands with productCount and total, filtered by search and status", async () => {
    await createBrandDirect({ name: `${PREFIX} Searchable Drones`, status: Status.INACTIVE });

    const response = await list(
      req(`/api/admin/brands?search=${PREFIX}%20Searchable&status=INACTIVE&page=1&pageSize=10`),
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.data.total).toBeGreaterThanOrEqual(1);
    expect(body.data.brands.every((b: { status: string }) => b.status === "INACTIVE")).toBe(true);
    expect(body.data.brands[0]).toHaveProperty("productCount");
  });

  it("requires authentication", async () => {
    const response = await list(req("/api/admin/brands", { cookie: null }));
    expect(response.status).toBe(401);
  });
});

describe("GET /api/admin/brands/:id", () => {
  it("returns a single brand", async () => {
    const { body: created } = await createBrandDirect({ name: `${PREFIX} Get Me` });

    const response = await getOne(req(`/api/admin/brands/${created.data.id}`), {
      params: Promise.resolve({ id: created.data.id }),
    });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data.id).toBe(created.data.id);
  });

  it("returns 404 for an unknown id", async () => {
    const response = await getOne(req("/api/admin/brands/does-not-exist"), {
      params: Promise.resolve({ id: "does-not-exist" }),
    });
    expect(response.status).toBe(404);
  });
});

describe("PATCH /api/admin/brands/:id", () => {
  it("updates a brand", async () => {
    const { body: created } = await createBrandDirect({ name: `${PREFIX} Patch Me` });

    const response = await PATCH(
      req(`/api/admin/brands/${created.data.id}`, {
        method: "PATCH",
        body: { status: Status.INACTIVE },
      }),
      { params: Promise.resolve({ id: created.data.id }) },
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data.status).toBe(Status.INACTIVE);
  });

  it("rejects a slug collision on update", async () => {
    await createBrandDirect({ name: `${PREFIX} Taken`, slug: `${PREFIX}-taken-brand-slug` });
    const { body: created } = await createBrandDirect({ name: `${PREFIX} Patch Collide` });

    const response = await PATCH(
      req(`/api/admin/brands/${created.data.id}`, {
        method: "PATCH",
        body: { slug: `${PREFIX}-taken-brand-slug` },
      }),
      { params: Promise.resolve({ id: created.data.id }) },
    );

    expect(response.status).toBe(409);
  });

  it("returns 404 for an unknown id", async () => {
    const response = await PATCH(
      req("/api/admin/brands/does-not-exist", {
        method: "PATCH",
        body: { status: Status.ACTIVE },
      }),
      { params: Promise.resolve({ id: "does-not-exist" }) },
    );
    expect(response.status).toBe(404);
  });
});

describe("DELETE /api/admin/brands/:id", () => {
  it("deletes a brand with no products", async () => {
    const { body: created } = await createBrandDirect({ name: `${PREFIX} Delete Me` });

    const response = await DELETE(req(`/api/admin/brands/${created.data.id}`, { method: "DELETE" }), {
      params: Promise.resolve({ id: created.data.id }),
    });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual({ success: true, data: null });

    const stillExists = await prisma.brand.findUnique({ where: { id: created.data.id } });
    expect(stillExists).toBeNull();
  });

  it("soft-fails with a clear error when the brand has products", async () => {
    const { body: created } = await createBrandDirect({ name: `${PREFIX} Has Products` });
    const category = await prisma.category.create({
      data: {
        name: `${PREFIX} Category`,
        slug: `${PREFIX}-category`,
        tags: [],
        shortDescription: "x",
        longDescription: "x",
        status: Status.ACTIVE,
      },
    });
    await prisma.product.create({
      data: {
        name: `${PREFIX} Product`,
        sku: `${PREFIX}-sku-1`,
        categoryId: category.id,
        brandId: created.data.id,
        price: 10,
        tags: [],
        shortDescription: "x",
        longDescription: "x",
        status: Status.ACTIVE,
      },
    });

    const response = await DELETE(req(`/api/admin/brands/${created.data.id}`, { method: "DELETE" }), {
      params: Promise.resolve({ id: created.data.id }),
    });
    const body = await response.json();

    expect(response.status).toBe(409);
    expect(body.success).toBe(false);
    expect(body.error).toMatch(/product/i);

    const stillExists = await prisma.brand.findUnique({ where: { id: created.data.id } });
    expect(stillExists).not.toBeNull();
  });

  it("returns 404 for an unknown id", async () => {
    const response = await DELETE(req("/api/admin/brands/does-not-exist", { method: "DELETE" }), {
      params: Promise.resolve({ id: "does-not-exist" }),
    });
    expect(response.status).toBe(404);
  });
});
