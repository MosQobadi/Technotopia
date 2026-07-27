import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import { GET as list } from "./route";
import { GET as detail } from "./[id]/route";
import { PATCH as patchStatus } from "./[id]/status/route";
import { getCookieName, signToken } from "@/lib/auth";
import { Role, Status } from "@/lib/generated/prisma/enums";
import { prisma } from "@/lib/db";

const PREFIX = "task101";
const adminId = "task101-admin-id";

let adminCookie: string;
let customerCookie: string;
let customerId: string;
let categoryId: string;
let brandId: string;
let productId: string;

beforeAll(async () => {
  adminCookie = await signToken({ userId: adminId, role: Role.ADMIN });
  customerCookie = await signToken({ userId: "task101-customer-id", role: Role.CUSTOMER });

  const customer = await prisma.user.create({
    data: {
      email: `${PREFIX}@example.com`,
      passwordHash: "not-a-real-hash",
      firstName: "Jane",
      lastName: "Doe",
      role: Role.CUSTOMER,
      status: Status.ACTIVE,
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
      sku: `${PREFIX}-SKU`,
      categoryId,
      brandId,
      price: "25.00",
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
      subtotal: "25.00",
      discount: "0.00",
      shippingCost: "5.00",
      tax: "2.00",
      total: "32.00",
      shippingAddress: "1 Test Street",
      postalCode: "T3 5T5",
      items: {
        create: [
          {
            productId,
            productNameSnapshot: `${PREFIX} Product`,
            priceSnapshot: "25.00",
            quantity: 1,
            lineTotal: "25.00",
          },
        ],
      },
      ...overrides,
    },
  });
}

describe("GET /api/admin/customers", () => {
  it("requires authentication", async () => {
    const response = await list(req("/api/admin/customers", { cookie: null }));
    expect(response.status).toBe(401);
  });

  it("lists customers with order count", async () => {
    const order = await createOrder();
    const response = await list(req(`/api/admin/customers?search=Jane`));
    const body = await response.json();
    const match = body.data.customers.find((c: { id: string }) => c.id === customerId);

    expect(response.status).toBe(200);
    expect(match.name).toBe("Jane Doe");
    expect(match.orderCount).toBe(1);
    await prisma.orderItem.deleteMany({ where: { orderId: order.id } });
    await prisma.order.delete({ where: { id: order.id } });
  });

  it("filters by status", async () => {
    const response = await list(req(`/api/admin/customers?status=ACTIVE`));
    const body = await response.json();
    const match = body.data.customers.find((c: { id: string }) => c.id === customerId);

    expect(response.status).toBe(200);
    expect(match).toBeDefined();
  });
});

describe("GET /api/admin/customers/:id", () => {
  it("requires authentication", async () => {
    const response = await detail(req(`/api/admin/customers/${customerId}`, { cookie: null }), {
      params: Promise.resolve({ id: customerId }),
    });
    expect(response.status).toBe(401);
  });

  it("returns profile and order history", async () => {
    const order = await createOrder();
    const response = await detail(req(`/api/admin/customers/${customerId}`), {
      params: Promise.resolve({ id: customerId }),
    });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data.name).toBe("Jane Doe");
    expect(body.data.orders).toHaveLength(1);
    expect(body.data.orders[0].id).toBe(order.id);
    expect(body.data.orders[0].total).toBe(32);
  });

  it("returns 404 for an unknown id", async () => {
    const response = await detail(req("/api/admin/customers/does-not-exist"), {
      params: Promise.resolve({ id: "does-not-exist" }),
    });
    expect(response.status).toBe(404);
  });

  it("returns 404 for a non-customer user id", async () => {
    const response = await detail(req(`/api/admin/customers/${adminId}`), {
      params: Promise.resolve({ id: adminId }),
    });
    expect(response.status).toBe(404);
  });
});

describe("PATCH /api/admin/customers/:id/status", () => {
  it("requires authentication", async () => {
    const response = await patchStatus(
      req(`/api/admin/customers/${customerId}/status`, {
        method: "PATCH",
        body: { status: "INACTIVE" },
        cookie: null,
      }),
      { params: Promise.resolve({ id: customerId }) },
    );
    expect(response.status).toBe(401);
  });

  it("rejects non-admin roles", async () => {
    const response = await patchStatus(
      req(`/api/admin/customers/${customerId}/status`, {
        method: "PATCH",
        body: { status: "INACTIVE" },
        cookie: customerCookie,
      }),
      { params: Promise.resolve({ id: customerId }) },
    );
    expect(response.status).toBe(403);
  });

  it("toggles status to INACTIVE and back to ACTIVE", async () => {
    const inactiveResponse = await patchStatus(
      req(`/api/admin/customers/${customerId}/status`, {
        method: "PATCH",
        body: { status: "INACTIVE" },
      }),
      { params: Promise.resolve({ id: customerId }) },
    );
    const inactiveBody = await inactiveResponse.json();
    expect(inactiveResponse.status).toBe(200);
    expect(inactiveBody.data.status).toBe("INACTIVE");

    const activeResponse = await patchStatus(
      req(`/api/admin/customers/${customerId}/status`, {
        method: "PATCH",
        body: { status: "ACTIVE" },
      }),
      { params: Promise.resolve({ id: customerId }) },
    );
    const activeBody = await activeResponse.json();
    expect(activeResponse.status).toBe(200);
    expect(activeBody.data.status).toBe("ACTIVE");
  });

  it("rejects an invalid status value", async () => {
    const response = await patchStatus(
      req(`/api/admin/customers/${customerId}/status`, {
        method: "PATCH",
        body: { status: "BANNED" },
      }),
      { params: Promise.resolve({ id: customerId }) },
    );
    expect(response.status).toBe(400);
  });

  it("returns 404 for an unknown id", async () => {
    const response = await patchStatus(
      req("/api/admin/customers/does-not-exist/status", {
        method: "PATCH",
        body: { status: "INACTIVE" },
      }),
      { params: Promise.resolve({ id: "does-not-exist" }) },
    );
    expect(response.status).toBe(404);
  });
});
