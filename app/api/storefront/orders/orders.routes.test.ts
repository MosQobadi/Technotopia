import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import { POST as create } from "./route";
import { getCookieName, signToken } from "@/lib/auth";
import { Role, Status } from "@/lib/generated/prisma/enums";
import { prisma } from "@/lib/db";

const PREFIX = "task19-1-orders";

let customerId: string;
let customerCookie: string;
let categoryId: string;
let brandId: string;

beforeAll(async () => {
  const customer = await prisma.user.create({
    data: {
      email: `${PREFIX}@technotopia.test`,
      passwordHash: "x",
      firstName: "Task",
      lastName: "Customer",
      role: Role.CUSTOMER,
    },
  });
  customerId = customer.id;
  customerCookie = await signToken({ userId: customerId, role: Role.CUSTOMER });

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
  await prisma.cartItem.deleteMany({ where: { cart: { userId: customerId } } });
  await prisma.cart.deleteMany({ where: { userId: customerId } });
  await prisma.inventory.deleteMany({ where: { product: { sku: { startsWith: PREFIX } } } });
  await prisma.product.deleteMany({ where: { sku: { startsWith: PREFIX } } });
  await prisma.brand.deleteMany({ where: { slug: { startsWith: PREFIX } } });
  await prisma.category.deleteMany({ where: { slug: { startsWith: PREFIX } } });
  await prisma.user.delete({ where: { id: customerId } });
  await prisma.$disconnect();
});

async function createProduct(overrides: Record<string, unknown> = {}) {
  const suffix = Math.random().toString(36).slice(2, 8);
  return prisma.product.create({
    data: {
      name: `${PREFIX} Product ${suffix}`,
      slug: `${PREFIX}-slug-${suffix}`,
      sku: `${PREFIX}-SKU-${suffix}`,
      categoryId,
      brandId,
      price: 1000,
      discountPercent: 0,
      tags: [],
      shortDescription: "x",
      longDescription: "x",
      status: Status.ACTIVE,
      ...overrides,
    },
  });
}

async function addToCart(productId: string, quantity: number) {
  const cart = await prisma.cart.upsert({
    where: { userId: customerId },
    create: { userId: customerId },
    update: {},
  });
  await prisma.cartItem.create({ data: { cartId: cart.id, productId, quantity } });
  return cart;
}

const VALID_SHIPPING = {
  fullName: "Task Customer",
  phone: "+98 910 000 00 00",
  address: "12 Test Street",
  city: "Tehran",
  postalCode: "12345",
  paymentMethod: "CARD",
};

function req(body: unknown, cookie: string | null = customerCookie) {
  const headers: Record<string, string> = { "content-type": "application/json" };
  if (cookie !== null) headers.cookie = `${getCookieName()}=${cookie}`;
  return new NextRequest("http://localhost/api/storefront/orders", {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });
}

describe("POST /api/storefront/orders", () => {
  it("rejects an unauthenticated request with a 401", async () => {
    const response = await create(req(VALID_SHIPPING, null));
    expect(response.status).toBe(401);
  });

  it("rejects an invalid body with a 400", async () => {
    const response = await create(req({ ...VALID_SHIPPING, paymentMethod: "CASH" }));
    expect(response.status).toBe(400);
  });

  it("rejects checkout with an empty cart", async () => {
    const response = await create(req(VALID_SHIPPING));
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.success).toBe(false);
  });

  it("creates the order, decrements inventory, and clears the cart", async () => {
    const product = await createProduct({ price: 2000, discountPercent: 25 });
    await prisma.inventory.create({
      data: { productId: product.id, stock: 10, lastUpdatedAt: new Date() },
    });
    const cart = await addToCart(product.id, 2);

    const response = await create(req(VALID_SHIPPING));
    const body = await response.json();

    expect(response.status).toBe(201);
    expect(body.success).toBe(true);
    expect(body.data.orderId).toBeTruthy();

    const order = await prisma.order.findUnique({
      where: { id: body.data.orderId },
      include: { items: true },
    });
    expect(order).not.toBeNull();
    expect(order?.paymentMethod).toBe("CARD");
    expect(order?.fullName).toBe(VALID_SHIPPING.fullName);
    expect(order?.city).toBe(VALID_SHIPPING.city);
    expect(order?.shippingAddress).toBe(VALID_SHIPPING.address);
    expect(order?.items).toHaveLength(1);
    expect(order?.items[0]?.priceSnapshot).toBe(2000);
    expect(order?.items[0]?.lineTotal).toBe(3000); // 1500 discounted unit price x 2
    expect(order?.subtotal).toBe(4000);
    expect(order?.discount).toBe(1000);
    expect(order?.total).toBe(order!.shippingCost + 3000);

    const inventory = await prisma.inventory.findUnique({ where: { productId: product.id } });
    expect(inventory?.stock).toBe(8);

    const remainingItems = await prisma.cartItem.findMany({ where: { cartId: cart.id } });
    expect(remainingItems).toHaveLength(0);
  });

  it("rejects checkout when stock is insufficient and leaves inventory unchanged", async () => {
    const product = await createProduct({ price: 500 });
    await prisma.inventory.create({
      data: { productId: product.id, stock: 1, lastUpdatedAt: new Date() },
    });
    await addToCart(product.id, 5);

    const response = await create(req(VALID_SHIPPING));
    const body = await response.json();

    expect(response.status).toBe(409);
    expect(body.success).toBe(false);

    const inventory = await prisma.inventory.findUnique({ where: { productId: product.id } });
    expect(inventory?.stock).toBe(1);

    const order = await prisma.order.findFirst({
      where: { items: { some: { productId: product.id } } },
    });
    expect(order).toBeNull();
  });
});
