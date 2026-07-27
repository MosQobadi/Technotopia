import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import { DELETE, GET as getOne, PATCH } from "./[id]/route";
import { GET as list, POST as create } from "./route";
import { getCookieName, signToken } from "@/lib/auth";
import { OrderStatus, PaymentStatus, Role, Status } from "@/lib/generated/prisma/enums";
import { prisma } from "@/lib/db";

const PREFIX = "task71";
const adminId = "task71-admin-id";

let adminCookie: string;
let customerCookie: string;
let categoryId: string;
let otherCategoryId: string;
let brandId: string;
let otherBrandId: string;

beforeAll(async () => {
  adminCookie = await signToken({ userId: adminId, role: Role.ADMIN });
  customerCookie = await signToken({ userId: "task71-customer-id", role: Role.CUSTOMER });

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

  const otherCategory = await prisma.category.create({
    data: {
      name: `${PREFIX} Other Category`,
      slug: `${PREFIX}-other-category`,
      tags: [],
      shortDescription: "x",
      longDescription: "x",
      status: Status.ACTIVE,
    },
  });
  otherCategoryId = otherCategory.id;

  const brand = await prisma.brand.create({
    data: { name: `${PREFIX} Brand`, slug: `${PREFIX}-brand`, status: Status.ACTIVE },
  });
  brandId = brand.id;

  const otherBrand = await prisma.brand.create({
    data: { name: `${PREFIX} Other Brand`, slug: `${PREFIX}-other-brand`, status: Status.ACTIVE },
  });
  otherBrandId = otherBrand.id;
});

afterAll(async () => {
  await prisma.orderItem.deleteMany({ where: { productNameSnapshot: { startsWith: PREFIX } } });
  await prisma.order.deleteMany({ where: { shippingAddress: { startsWith: PREFIX } } });
  await prisma.user.deleteMany({ where: { email: { startsWith: PREFIX } } });
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

function validProductBody(overrides: Record<string, unknown> = {}) {
  return {
    name: `${PREFIX} Lavalier Mic`,
    sku: `${PREFIX}-SKU-${Math.random().toString(36).slice(2, 8)}`,
    categoryId,
    brandId,
    price: 100,
    discountPercent: 0,
    tags: ["mic"],
    shortDescription: "Compact clip-on lavalier microphone.",
    longDescription: "A budget-friendly lavalier microphone with a 20-foot cable.",
    status: Status.ACTIVE,
    ...overrides,
  };
}

async function createProductDirect(overrides: Record<string, unknown> = {}) {
  const response = await create(
    req("/api/admin/products", { method: "POST", body: validProductBody(overrides) }),
  );
  const body = await response.json();
  return { response, body };
}

describe("POST /api/admin/products", () => {
  it("requires authentication", async () => {
    const response = await create(
      req("/api/admin/products", { method: "POST", body: validProductBody(), cookie: null }),
    );
    expect(response.status).toBe(401);
  });

  it("rejects non-admin roles", async () => {
    const response = await create(
      req("/api/admin/products", {
        method: "POST",
        body: validProductBody(),
        cookie: customerCookie,
      }),
    );
    expect(response.status).toBe(403);
  });

  it("creates a product with a linked inventory row at stock 0 and computes finalPrice", async () => {
    const { response, body } = await createProductDirect({ price: 100, discountPercent: 25 });

    expect(response.status).toBe(201);
    expect(body.success).toBe(true);
    expect(body.data.stock).toBe(0);
    expect(body.data.finalPrice).toBe(75);

    const inventory = await prisma.inventory.findUnique({ where: { productId: body.data.id } });
    expect(inventory).not.toBeNull();
    expect(inventory?.stock).toBe(0);
  });

  it("rejects a duplicate SKU with a clear error", async () => {
    const sku = `${PREFIX}-DUP-SKU`;
    await createProductDirect({ sku });
    const { response, body } = await createProductDirect({ sku });

    expect(response.status).toBe(409);
    expect(body.success).toBe(false);
    expect(body.error).toMatch(/sku/i);
  });

  it("rejects an invalid body with a 400", async () => {
    const response = await create(
      req("/api/admin/products", {
        method: "POST",
        body: validProductBody({ name: "" }),
      }),
    );
    expect(response.status).toBe(400);
  });
});

describe("GET /api/admin/products", () => {
  it("requires authentication", async () => {
    const response = await list(req("/api/admin/products", { cookie: null }));
    expect(response.status).toBe(401);
  });

  it("filters by search, category, brand, and status together", async () => {
    await createProductDirect({
      name: `${PREFIX} Filter Target`,
      categoryId,
      brandId,
      status: Status.ACTIVE,
    });
    // Same search term, but wrong category — should be excluded.
    await createProductDirect({
      name: `${PREFIX} Filter Target`,
      categoryId: otherCategoryId,
      brandId,
      status: Status.ACTIVE,
    });
    // Same search term and category, but wrong brand — should be excluded.
    await createProductDirect({
      name: `${PREFIX} Filter Target`,
      categoryId,
      brandId: otherBrandId,
      status: Status.ACTIVE,
    });
    // Same search term, category, and brand, but wrong status — should be excluded.
    await createProductDirect({
      name: `${PREFIX} Filter Target`,
      categoryId,
      brandId,
      status: Status.INACTIVE,
    });

    const response = await list(
      req(
        `/api/admin/products?search=${PREFIX}%20Filter&category=${categoryId}&brand=${brandId}&status=ACTIVE&page=1&pageSize=10`,
      ),
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.data.products.length).toBe(1);
    expect(body.data.products[0].categoryId).toBe(categoryId);
    expect(body.data.products[0].brandId).toBe(brandId);
    expect(body.data.products[0].status).toBe(Status.ACTIVE);
  });

  it("includes category name, brand name, stock, and finalPrice", async () => {
    const { body: created } = await createProductDirect({ price: 50, discountPercent: 10 });

    const response = await list(req(`/api/admin/products?search=${created.data.sku}`));
    const body = await response.json();

    expect(body.data.products.length).toBe(1);
    const product = body.data.products[0];
    expect(product.category).toEqual({ id: categoryId, name: `${PREFIX} Category` });
    expect(product.brand).toEqual({ id: brandId, name: `${PREFIX} Brand` });
    expect(product.stock).toBe(0);
    expect(product.finalPrice).toBe(45);
  });
});

describe("GET /api/admin/products/:id", () => {
  it("returns a single product", async () => {
    const { body: created } = await createProductDirect();

    const response = await getOne(req(`/api/admin/products/${created.data.id}`), {
      params: Promise.resolve({ id: created.data.id }),
    });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data.id).toBe(created.data.id);
  });

  it("returns 404 for an unknown id", async () => {
    const response = await getOne(req("/api/admin/products/does-not-exist"), {
      params: Promise.resolve({ id: "does-not-exist" }),
    });
    expect(response.status).toBe(404);
  });
});

describe("PATCH /api/admin/products/:id", () => {
  it("updates a product", async () => {
    const { body: created } = await createProductDirect();

    const response = await PATCH(
      req(`/api/admin/products/${created.data.id}`, {
        method: "PATCH",
        body: { status: Status.INACTIVE },
      }),
      { params: Promise.resolve({ id: created.data.id }) },
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data.status).toBe(Status.INACTIVE);
  });

  it("returns 404 for an unknown id", async () => {
    const response = await PATCH(
      req("/api/admin/products/does-not-exist", {
        method: "PATCH",
        body: { status: Status.ACTIVE },
      }),
      { params: Promise.resolve({ id: "does-not-exist" }) },
    );
    expect(response.status).toBe(404);
  });
});

describe("DELETE /api/admin/products/:id", () => {
  it("deletes a product with no order history", async () => {
    const { body: created } = await createProductDirect();

    const response = await DELETE(
      req(`/api/admin/products/${created.data.id}`, { method: "DELETE" }),
      { params: Promise.resolve({ id: created.data.id }) },
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual({ success: true, data: { deactivated: false, product: null } });

    const stillExists = await prisma.product.findUnique({ where: { id: created.data.id } });
    expect(stillExists).toBeNull();
  });

  it("deactivates instead of deleting when the product has order history", async () => {
    const { body: created } = await createProductDirect();

    const customer = await prisma.user.create({
      data: {
        email: `${PREFIX}-customer@example.com`,
        passwordHash: "hash",
        firstName: "Test",
        lastName: "Customer",
        role: Role.CUSTOMER,
      },
    });

    const order = await prisma.order.create({
      data: {
        customerId: customer.id,
        status: OrderStatus.DELIVERED,
        paymentStatus: PaymentStatus.PAID,
        subtotal: "100.00",
        discount: "0.00",
        shippingCost: "0.00",
        tax: "0.00",
        total: "100.00",
        shippingAddress: `${PREFIX} 123 Main St`,
        postalCode: "00000",
      },
    });

    await prisma.orderItem.create({
      data: {
        orderId: order.id,
        productId: created.data.id,
        productNameSnapshot: `${PREFIX} Snapshot`,
        priceSnapshot: "100.00",
        quantity: 1,
        lineTotal: "100.00",
      },
    });

    const response = await DELETE(
      req(`/api/admin/products/${created.data.id}`, { method: "DELETE" }),
      { params: Promise.resolve({ id: created.data.id }) },
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.data.deactivated).toBe(true);
    expect(body.data.product.status).toBe(Status.INACTIVE);

    const stillExists = await prisma.product.findUnique({ where: { id: created.data.id } });
    expect(stillExists).not.toBeNull();
    expect(stillExists?.status).toBe(Status.INACTIVE);
  });

  it("returns 404 for an unknown id", async () => {
    const response = await DELETE(
      req("/api/admin/products/does-not-exist", { method: "DELETE" }),
      { params: Promise.resolve({ id: "does-not-exist" }) },
    );
    expect(response.status).toBe(404);
  });
});
