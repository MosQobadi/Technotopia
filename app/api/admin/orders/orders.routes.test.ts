import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import { GET as list } from "./route";
import { GET as detail } from "./[id]/route";
import { PATCH as patchStatus } from "./[id]/status/route";
import { PATCH as patchNote } from "./[id]/note/route";
import { getCookieName, signToken } from "@/lib/auth";
import { Role, Status } from "@/lib/generated/prisma/enums";
import { prisma } from "@/lib/db";

const PREFIX = "task91";
const adminId = "task91-admin-id";

let adminCookie: string;
let customerCookie: string;
let customerId: string;
let categoryId: string;
let brandId: string;
let productId: string;

beforeAll(async () => {
  adminCookie = await signToken({ userId: adminId, role: Role.ADMIN });
  customerCookie = await signToken({ userId: "task91-customer-id", role: Role.CUSTOMER });

  const customer = await prisma.user.create({
    data: {
      email: `${PREFIX}@example.com`,
      passwordHash: "not-a-real-hash",
      firstName: "Jane",
      lastName: "Doe",
      role: Role.CUSTOMER,
    },
  });
  customerId = customer.id;

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

  const product = await prisma.product.create({
    data: {
      name: `${PREFIX} Product`,
      slug: `${PREFIX}-slug`,
      sku: `${PREFIX}-SKU`,
      categoryId,
      brandId,
      price: 25,
      discountPercent: 0,
      tags: [],
      shortDescription: "x",
      longDescription: "x",
      status: Status.ACTIVE,
    },
  });
  productId = product.id;
});

afterAll(async () => {
  await prisma.orderItem.deleteMany({ where: { productId } });
  await prisma.order.deleteMany({ where: { customerId } });
  await prisma.product.deleteMany({ where: { sku: { startsWith: PREFIX } } });
  await prisma.brand.deleteMany({ where: { slug: { startsWith: PREFIX } } });
  await prisma.category.deleteMany({ where: { slug: { startsWith: PREFIX } } });
  await prisma.user.deleteMany({ where: { email: `${PREFIX}@example.com` } });
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

async function createOrder(overrides: Record<string, unknown> = {}) {
  return prisma.order.create({
    data: {
      customerId,
      status: "PENDING",
      paymentStatus: "UNPAID",
      subtotal: 25,
      discount: 0,
      shippingCost: 5,
      tax: 2,
      total: 32,
      shippingAddress: "1 Test Street",
      postalCode: "T3 5T5",
      items: {
        create: [
          {
            productId,
            productNameSnapshot: `${PREFIX} Product`,
            priceSnapshot: 25,
            quantity: 1,
            lineTotal: 25,
          },
        ],
      },
      ...overrides,
    },
  });
}

describe("GET /api/admin/orders", () => {
  it("requires authentication", async () => {
    const response = await list(req("/api/admin/orders", { cookie: null }));
    expect(response.status).toBe(401);
  });

  it("lists orders with customer name, item count, and total", async () => {
    const order = await createOrder();
    const response = await list(req(`/api/admin/orders?search=Jane`));
    const body = await response.json();
    const match = body.data.orders.find((o: { id: string }) => o.id === order.id);

    expect(response.status).toBe(200);
    expect(match.customerName).toBe("Jane Doe");
    expect(match.itemCount).toBe(1);
    expect(match.total).toBe(32);
  });
});

describe("GET /api/admin/orders/:id", () => {
  it("requires authentication", async () => {
    const order = await createOrder();
    const response = await detail(req(`/api/admin/orders/${order.id}`, { cookie: null }), {
      params: Promise.resolve({ id: order.id }),
    });
    expect(response.status).toBe(401);
  });

  it("returns full order detail", async () => {
    const order = await createOrder();
    const response = await detail(req(`/api/admin/orders/${order.id}`), {
      params: Promise.resolve({ id: order.id }),
    });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data.customer.name).toBe("Jane Doe");
    expect(body.data.items).toHaveLength(1);
    expect(body.data.items[0].productName).toBe(`${PREFIX} Product`);
    expect(body.data.total).toBe(32);
  });

  it("returns 404 for an unknown id", async () => {
    const response = await detail(req("/api/admin/orders/does-not-exist"), {
      params: Promise.resolve({ id: "does-not-exist" }),
    });
    expect(response.status).toBe(404);
  });
});

describe("PATCH /api/admin/orders/:id/status", () => {
  it("requires authentication", async () => {
    const order = await createOrder();
    const response = await patchStatus(
      req(`/api/admin/orders/${order.id}/status`, {
        method: "PATCH",
        body: { status: "SENDING" },
        cookie: null,
      }),
      { params: Promise.resolve({ id: order.id }) },
    );
    expect(response.status).toBe(401);
  });

  it("rejects non-admin roles", async () => {
    const order = await createOrder();
    const response = await patchStatus(
      req(`/api/admin/orders/${order.id}/status`, {
        method: "PATCH",
        body: { status: "SENDING" },
        cookie: customerCookie,
      }),
      { params: Promise.resolve({ id: order.id }) },
    );
    expect(response.status).toBe(403);
  });

  it("allows the valid next transition PENDING -> SENDING", async () => {
    const order = await createOrder();
    const response = await patchStatus(
      req(`/api/admin/orders/${order.id}/status`, {
        method: "PATCH",
        body: { status: "SENDING" },
      }),
      { params: Promise.resolve({ id: order.id }) },
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data.status).toBe("SENDING");
  });

  it("rejects skipping a step (PENDING -> SENT)", async () => {
    const order = await createOrder();
    const response = await patchStatus(
      req(`/api/admin/orders/${order.id}/status`, { method: "PATCH", body: { status: "SENT" } }),
      { params: Promise.resolve({ id: order.id }) },
    );
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.success).toBe(false);
  });

  it("rejects cancelling from an invalid state (SENT -> CANCELLED)", async () => {
    const order = await createOrder({ status: "SENT" });
    const response = await patchStatus(
      req(`/api/admin/orders/${order.id}/status`, {
        method: "PATCH",
        body: { status: "CANCELLED" },
      }),
      { params: Promise.resolve({ id: order.id }) },
    );
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.success).toBe(false);
  });

  it("allows cancelling from PENDING", async () => {
    const order = await createOrder();
    const response = await patchStatus(
      req(`/api/admin/orders/${order.id}/status`, {
        method: "PATCH",
        body: { status: "CANCELLED" },
      }),
      { params: Promise.resolve({ id: order.id }) },
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data.status).toBe("CANCELLED");
  });

  it("returns 404 for an unknown id", async () => {
    const response = await patchStatus(
      req("/api/admin/orders/does-not-exist/status", {
        method: "PATCH",
        body: { status: "SENDING" },
      }),
      { params: Promise.resolve({ id: "does-not-exist" }) },
    );
    expect(response.status).toBe(404);
  });
});

describe("PATCH /api/admin/orders/:id/note", () => {
  it("requires authentication", async () => {
    const order = await createOrder();
    const response = await patchNote(
      req(`/api/admin/orders/${order.id}/note`, {
        method: "PATCH",
        body: { adminNote: "test" },
        cookie: null,
      }),
      { params: Promise.resolve({ id: order.id }) },
    );
    expect(response.status).toBe(401);
  });

  it("updates the admin note", async () => {
    const order = await createOrder();
    const response = await patchNote(
      req(`/api/admin/orders/${order.id}/note`, {
        method: "PATCH",
        body: { adminNote: "Customer requested delivery after 6pm." },
      }),
      { params: Promise.resolve({ id: order.id }) },
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data.adminNote).toBe("Customer requested delivery after 6pm.");
  });

  it("returns 404 for an unknown id", async () => {
    const response = await patchNote(
      req("/api/admin/orders/does-not-exist/note", {
        method: "PATCH",
        body: { adminNote: "test" },
      }),
      { params: Promise.resolve({ id: "does-not-exist" }) },
    );
    expect(response.status).toBe(404);
  });
});
