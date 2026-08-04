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

// Cleanup is keyed off the shared email prefix (rather than just `customerId`) so it also
// catches the extra customers the oversell-race test below creates.
afterAll(async () => {
  await prisma.orderItem.deleteMany({ where: { productNameSnapshot: { startsWith: PREFIX } } });
  await prisma.order.deleteMany({ where: { customer: { email: { startsWith: PREFIX } } } });
  await prisma.cartItem.deleteMany({ where: { cart: { user: { email: { startsWith: PREFIX } } } } });
  await prisma.cart.deleteMany({ where: { user: { email: { startsWith: PREFIX } } } });
  await prisma.inventory.deleteMany({ where: { product: { sku: { startsWith: PREFIX } } } });
  await prisma.product.deleteMany({ where: { sku: { startsWith: PREFIX } } });
  await prisma.brand.deleteMany({ where: { slug: { startsWith: PREFIX } } });
  await prisma.category.deleteMany({ where: { slug: { startsWith: PREFIX } } });
  await prisma.user.deleteMany({ where: { email: { startsWith: PREFIX } } });
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

async function addToCart(productId: string, quantity: number, userId: string = customerId) {
  const cart = await prisma.cart.upsert({
    where: { userId },
    create: { userId },
    update: {},
  });
  await prisma.cartItem.create({ data: { cartId: cart.id, productId, quantity } });
  return cart;
}

/** A second, independent customer + auth cookie — for tests that need two shoppers at once. */
async function createRacingCustomer(suffix: string) {
  const customer = await prisma.user.create({
    data: {
      email: `${PREFIX}-race-${suffix}@technotopia.test`,
      passwordHash: "x",
      firstName: "Race",
      lastName: suffix,
      role: Role.CUSTOMER,
    },
  });
  const cookie = await signToken({ userId: customer.id, role: Role.CUSTOMER });
  return { id: customer.id, cookie };
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

  it("can't be oversold when two checkouts race for the last unit of stock", async () => {
    const product = await createProduct({ price: 1000 });
    await prisma.inventory.create({
      data: { productId: product.id, stock: 1, lastUpdatedAt: new Date() },
    });

    const racerA = await createRacingCustomer("a");
    const racerB = await createRacingCustomer("b");
    await addToCart(product.id, 1, racerA.id);
    await addToCart(product.id, 1, racerB.id);

    // Fired together (not awaited one at a time) so both requests' `prisma.$transaction`
    // calls are in flight against the real Postgres instance at the same time, racing for
    // the same inventory row rather than running strictly one-after-another.
    const [responseA, responseB] = await Promise.all([
      create(req(VALID_SHIPPING, racerA.cookie)),
      create(req(VALID_SHIPPING, racerB.cookie)),
    ]);
    const [bodyA, bodyB] = await Promise.all([responseA.json(), responseB.json()]);

    const statuses = [responseA.status, responseB.status].sort();
    expect(statuses).toEqual([201, 409]);

    const [winnerBody, loserBody] =
      responseA.status === 201 ? [bodyA, bodyB] : [bodyB, bodyA];
    expect(winnerBody.success).toBe(true);
    expect(loserBody.success).toBe(false);

    const inventory = await prisma.inventory.findUnique({ where: { productId: product.id } });
    expect(inventory?.stock).toBe(0);

    const orders = await prisma.order.findMany({
      where: { items: { some: { productId: product.id } } },
    });
    expect(orders).toHaveLength(1);
  });
});
