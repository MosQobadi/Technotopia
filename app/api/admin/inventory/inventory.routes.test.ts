import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import { PATCH } from "./[productId]/route";
import { GET as list } from "./route";
import { getCookieName, signToken } from "@/lib/auth";
import { Role, Status } from "@/lib/generated/prisma/enums";
import { prisma } from "@/lib/db";

const PREFIX = "task81";
const adminId = "task81-admin-id";

let adminCookie: string;
let customerCookie: string;
let categoryId: string;
let brandId: string;

beforeAll(async () => {
  adminCookie = await signToken({ userId: adminId, role: Role.ADMIN });
  customerCookie = await signToken({ userId: "task81-customer-id", role: Role.CUSTOMER });

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
  categoryId = category.id;

  const brand = await prisma.brand.create({
    data: { name: `${PREFIX} Brand`, slug: `${PREFIX}-brand`, status: Status.ACTIVE },
  });
  brandId = brand.id;
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

async function createProductWithStock(stock: number, overrides: Record<string, unknown> = {}) {
  const suffix = Math.random().toString(36).slice(2, 8);
  const product = await prisma.product.create({
    data: {
      name: `${PREFIX} Product`,
      slug: `${PREFIX}-slug-${suffix}`,
      sku: `${PREFIX}-SKU-${suffix}`,
      categoryId,
      brandId,
      price: 10,
      discountPercent: 0,
      tags: [],
      shortDescription: "x",
      longDescription: "x",
      status: Status.ACTIVE,
      inventory: { create: { stock, lastUpdatedAt: new Date("2020-01-01T00:00:00.000Z") } },
      ...overrides,
    },
  });
  return product;
}

describe("PATCH /api/admin/inventory/:productId", () => {
  it("requires authentication", async () => {
    const product = await createProductWithStock(5);
    const response = await PATCH(
      req(`/api/admin/inventory/${product.id}`, {
        method: "PATCH",
        body: { addStock: 1 },
        cookie: null,
      }),
      { params: Promise.resolve({ productId: product.id }) },
    );
    expect(response.status).toBe(401);
  });

  it("rejects non-admin roles", async () => {
    const product = await createProductWithStock(5);
    const response = await PATCH(
      req(`/api/admin/inventory/${product.id}`, {
        method: "PATCH",
        body: { addStock: 1 },
        cookie: customerCookie,
      }),
      { params: Promise.resolve({ productId: product.id }) },
    );
    expect(response.status).toBe(403);
  });

  it("rejects a zero or negative addStock value", async () => {
    const product = await createProductWithStock(5);
    const response = await PATCH(
      req(`/api/admin/inventory/${product.id}`, { method: "PATCH", body: { addStock: 0 } }),
      { params: Promise.resolve({ productId: product.id }) },
    );
    expect(response.status).toBe(400);
  });

  it("returns 404 for an unknown productId", async () => {
    const response = await PATCH(
      req("/api/admin/inventory/does-not-exist", { method: "PATCH", body: { addStock: 1 } }),
      { params: Promise.resolve({ productId: "does-not-exist" }) },
    );
    expect(response.status).toBe(404);
  });

  it("increments stock, updates lastUpdatedAt, and returns the new total", async () => {
    const product = await createProductWithStock(5);
    const before = await prisma.inventory.findUnique({ where: { productId: product.id } });

    const response = await PATCH(
      req(`/api/admin/inventory/${product.id}`, { method: "PATCH", body: { addStock: 20 } }),
      { params: Promise.resolve({ productId: product.id }) },
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.data.stock).toBe(25);
    expect(body.data.status).toBe("IN_STOCK");
    expect(new Date(body.data.lastUpdatedAt).getTime()).toBeGreaterThan(
      before!.lastUpdatedAt.getTime(),
    );
  });
});

describe("GET /api/admin/inventory", () => {
  it("requires authentication", async () => {
    const response = await list(req("/api/admin/inventory", { cookie: null }));
    expect(response.status).toBe(401);
  });

  it("derives OUT_OF_STOCK at exactly 0", async () => {
    const product = await createProductWithStock(0);
    const response = await list(req(`/api/admin/inventory?search=${product.sku}`));
    const body = await response.json();

    expect(body.data.items[0].stock).toBe(0);
    expect(body.data.items[0].status).toBe("OUT_OF_STOCK");
  });

  it("derives LOW_STOCK at exactly 9", async () => {
    const product = await createProductWithStock(9);
    const response = await list(req(`/api/admin/inventory?search=${product.sku}`));
    const body = await response.json();

    expect(body.data.items[0].stock).toBe(9);
    expect(body.data.items[0].status).toBe("LOW_STOCK");
  });

  it("derives IN_STOCK at exactly 10", async () => {
    const product = await createProductWithStock(10);
    const response = await list(req(`/api/admin/inventory?search=${product.sku}`));
    const body = await response.json();

    expect(body.data.items[0].stock).toBe(10);
    expect(body.data.items[0].status).toBe("IN_STOCK");
  });

  it("filters by the derived status", async () => {
    const outOfStock = await createProductWithStock(0);
    const lowStock = await createProductWithStock(9);
    const inStock = await createProductWithStock(10);

    const response = await list(
      req(
        `/api/admin/inventory?category=${categoryId}&brand=${brandId}&status=LOW_STOCK&pageSize=100`,
      ),
    );
    const body = await response.json();
    const productIds = body.data.items.map((item: { productId: string }) => item.productId);

    expect(productIds).toContain(lowStock.id);
    expect(productIds).not.toContain(outOfStock.id);
    expect(productIds).not.toContain(inStock.id);
  });

  it("filters by search, category, and brand together", async () => {
    const product = await createProductWithStock(5);

    const response = await list(
      req(
        `/api/admin/inventory?search=${product.sku}&category=${categoryId}&brand=${brandId}`,
      ),
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data.items.length).toBe(1);
    expect(body.data.items[0].productId).toBe(product.id);
  });
});
