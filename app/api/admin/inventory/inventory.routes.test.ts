import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { revalidatePath } from "next/cache";
import { PATCH } from "./[productId]/route";
import {
  GET as listNotifications,
  PATCH as markNotifications,
} from "./[productId]/notifications/route";
import { GET as list } from "./route";

// revalidatePath needs the store Next sets up around a real request; outside
// one it throws. What matters here is which paths the restock asks to refresh.
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
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

  it("refreshes the product's cached page in both locales", async () => {
    const product = await createProductWithStock(0);
    vi.mocked(revalidatePath).mockClear();

    await PATCH(
      req(`/api/admin/inventory/${product.id}`, { method: "PATCH", body: { addStock: 3 } }),
      { params: Promise.resolve({ productId: product.id }) },
    );

    expect(revalidatePath).toHaveBeenCalledWith(`/en/products/${product.slug}`);
    expect(revalidatePath).toHaveBeenCalledWith(`/fa/products/${product.slug}`);
  });
});

describe("/api/admin/inventory/:productId/notifications", () => {
  function ctx(productId: string) {
    return { params: Promise.resolve({ productId }) };
  }

  it("requires an admin", async () => {
    const product = await createProductWithStock(0);
    const url = `/api/admin/inventory/${product.id}/notifications`;

    expect((await listNotifications(req(url, { cookie: null }), ctx(product.id))).status).toBe(
      401,
    );
    expect(
      (await listNotifications(req(url, { cookie: customerCookie }), ctx(product.id))).status,
    ).toBe(403);
    expect(
      (
        await markNotifications(
          req(url, { method: "PATCH", body: { ids: ["x"] }, cookie: customerCookie }),
          ctx(product.id),
        )
      ).status,
    ).toBe(403);
  });

  it("lists only this product's pending requests, oldest first", async () => {
    const product = await createProductWithStock(0);
    const other = await createProductWithStock(0);
    await prisma.stockNotification.createMany({
      data: [
        { productId: product.id, contact: "second@example.com", createdAt: new Date("2026-09-02") },
        { productId: product.id, contact: "first@example.com", createdAt: new Date("2026-09-01") },
        { productId: product.id, contact: "done@example.com", notifiedAt: new Date() },
        { productId: other.id, contact: "other@example.com" },
      ],
    });

    const response = await listNotifications(
      req(`/api/admin/inventory/${product.id}/notifications`),
      ctx(product.id),
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data.map((row: { contact: string }) => row.contact)).toEqual([
      "first@example.com",
      "second@example.com",
    ]);
  });

  it("stamps only the ids given, and only this product's", async () => {
    const product = await createProductWithStock(0);
    const other = await createProductWithStock(0);
    const shown = await prisma.stockNotification.create({
      data: { productId: product.id, contact: "shown@example.com" },
    });
    const arrivedLater = await prisma.stockNotification.create({
      data: { productId: product.id, contact: "later@example.com" },
    });
    const otherProducts = await prisma.stockNotification.create({
      data: { productId: other.id, contact: "other@example.com" },
    });

    const response = await markNotifications(
      req(`/api/admin/inventory/${product.id}/notifications`, {
        method: "PATCH",
        body: { ids: [shown.id, otherProducts.id] },
      }),
      ctx(product.id),
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data.count).toBe(1);

    const rows = await prisma.stockNotification.findMany({
      where: { id: { in: [shown.id, arrivedLater.id, otherProducts.id] } },
    });
    const stamped = Object.fromEntries(rows.map((row) => [row.id, row.notifiedAt !== null]));
    expect(stamped).toEqual({
      [shown.id]: true,
      [arrivedLater.id]: false,
      [otherProducts.id]: false,
    });
  });

  it("rejects an empty list of ids", async () => {
    const product = await createProductWithStock(0);
    const response = await markNotifications(
      req(`/api/admin/inventory/${product.id}/notifications`, {
        method: "PATCH",
        body: { ids: [] },
      }),
      ctx(product.id),
    );
    expect(response.status).toBe(400);
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
