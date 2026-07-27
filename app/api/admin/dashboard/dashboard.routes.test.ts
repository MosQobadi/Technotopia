import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import { GET } from "./summary/route";
import { getCookieName, signToken } from "@/lib/auth";
import { Role, Status } from "@/lib/generated/prisma/enums";
import { prisma } from "@/lib/db";

const PREFIX = "task121";
const adminId = "task121-admin-id";

let adminCookie: string;
let customerCookie: string;
let customerId: string;
let categoryId: string;
let brandId: string;

beforeAll(async () => {
  adminCookie = await signToken({ userId: adminId, role: Role.ADMIN });
  customerCookie = await signToken({ userId: "task121-customer-id", role: Role.CUSTOMER });

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
});

afterAll(async () => {
  await prisma.orderItem.deleteMany({ where: { productNameSnapshot: { startsWith: PREFIX } } });
  await prisma.order.deleteMany({ where: { customerId } });
  await prisma.product.deleteMany({ where: { sku: { startsWith: PREFIX } } });
  await prisma.brand.deleteMany({ where: { slug: { startsWith: PREFIX } } });
  await prisma.category.deleteMany({ where: { slug: { startsWith: PREFIX } } });
  await prisma.user.deleteMany({ where: { email: `${PREFIX}@example.com` } });
  await prisma.$disconnect();
});

function req(url: string, options: { cookie?: string | null } = {}) {
  const headers: Record<string, string> = {};
  if (options.cookie !== undefined) {
    if (options.cookie !== null) headers.cookie = `${getCookieName()}=${options.cookie}`;
  } else {
    headers.cookie = `${getCookieName()}=${adminCookie}`;
  }

  return new NextRequest(`http://localhost${url}`, { method: "GET", headers });
}

async function createProduct(overrides: Record<string, unknown> = {}) {
  return prisma.product.create({
    data: {
      name: `${PREFIX} Product`,
      sku: `${PREFIX}-SKU-${Math.random().toString(36).slice(2, 8)}`,
      categoryId,
      brandId,
      price: "10.00",
      discountPercent: 0,
      tags: [],
      shortDescription: "x",
      longDescription: "x",
      status: Status.ACTIVE,
      ...overrides,
    },
  });
}

async function createOrder(status: "PENDING" | "DELIVERED", total: string) {
  const product = await createProduct();
  return prisma.order.create({
    data: {
      customerId,
      status,
      paymentStatus: status === "DELIVERED" ? "PAID" : "UNPAID",
      subtotal: total,
      discount: "0.00",
      shippingCost: "0.00",
      tax: "0.00",
      total,
      shippingAddress: "1 Test Street",
      postalCode: "T3 5T5",
      items: {
        create: [
          {
            productId: product.id,
            productNameSnapshot: `${PREFIX} Product`,
            priceSnapshot: total,
            quantity: 1,
            lineTotal: total,
          },
        ],
      },
    },
  });
}

describe("GET /api/admin/dashboard/summary", () => {
  it("requires authentication", async () => {
    const response = await GET(req("/api/admin/dashboard/summary", { cookie: null }));
    expect(response.status).toBe(401);
  });

  it("rejects non-admin roles", async () => {
    const response = await GET(
      req("/api/admin/dashboard/summary", { cookie: customerCookie }),
    );
    expect(response.status).toBe(403);
  });

  // These aggregates are intentionally store-wide (not scoped to this test's fixtures), so other
  // test files writing to Order/Product/Inventory concurrently could shift the numbers. Rather than
  // comparing to a "before" snapshot taken earlier in wall-clock time (which failed under full-suite
  // parallelism), each test fires its ground-truth Prisma query in the same tick as the API call so
  // both read the same near-instant DB state.

  it("counts orders and sums only DELIVERED revenue", async () => {
    await createOrder("PENDING", "50.00");
    await createOrder("DELIVERED", "75.00");

    const [response, truthCount, truthRevenue] = await Promise.all([
      GET(req("/api/admin/dashboard/summary")),
      prisma.order.count(),
      prisma.order.aggregate({ where: { status: "DELIVERED" }, _sum: { total: true } }),
    ]);
    const body = await response.json();

    expect(body.data.totalOrders).toBe(truthCount);
    expect(body.data.totalRevenue).toBeCloseTo(Number(truthRevenue._sum.total ?? 0), 2);
  });

  it("counts only active products", async () => {
    await createProduct({ status: Status.ACTIVE });
    await createProduct({ status: Status.INACTIVE });

    const [response, truthCount] = await Promise.all([
      GET(req("/api/admin/dashboard/summary")),
      prisma.product.count({ where: { status: Status.ACTIVE } }),
    ]);
    const body = await response.json();

    expect(body.data.activeProductCount).toBe(truthCount);
  });

  it("counts low stock (1-9) but not out-of-stock or in-stock", async () => {
    const outOfStock = await createProduct();
    await prisma.inventory.create({
      data: { productId: outOfStock.id, stock: 0, lastUpdatedAt: new Date() },
    });
    const lowStock = await createProduct();
    await prisma.inventory.create({
      data: { productId: lowStock.id, stock: 9, lastUpdatedAt: new Date() },
    });
    const inStock = await createProduct();
    await prisma.inventory.create({
      data: { productId: inStock.id, stock: 10, lastUpdatedAt: new Date() },
    });

    // Scoped by this test's category, so it directly proves inclusion/exclusion at the boundaries
    // without depending on the store-wide count staying stable.
    const scopedLowStockCount = await prisma.inventory.count({
      where: { stock: { gt: 0, lt: 10 }, product: { categoryId } },
    });
    expect(scopedLowStockCount).toBe(1);

    const [response, truthCount] = await Promise.all([
      GET(req("/api/admin/dashboard/summary")),
      prisma.inventory.count({ where: { stock: { gt: 0, lt: 10 } } }),
    ]);
    const body = await response.json();

    expect(body.data.lowStockCount).toBe(truthCount);
  });

  it("returns recent orders paginated by page/pageSize", async () => {
    const response = await GET(req("/api/admin/dashboard/summary?page=1&pageSize=1"));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data.recentOrders.length).toBeLessThanOrEqual(1);
    expect(typeof body.data.recentOrdersTotal).toBe("number");
  });
});
