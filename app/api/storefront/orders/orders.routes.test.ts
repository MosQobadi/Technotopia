import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import { POST as create } from "./route";
import { getCookieName, signToken } from "@/lib/auth";
import { Role, Status } from "@/lib/generated/prisma/enums";
import { prisma } from "@/lib/db";
import { reconcileCart } from "@/lib/storefront/cart";
import { toOrderPayload } from "@/lib/storefront/checkout";
import { STANDARD_DELIVERY_COST } from "@/lib/storefront/delivery";
import type { CheckoutDetailsInput } from "@/lib/validation";
import { getCartCatalogEntries } from "@/server/cart.service";

const PREFIX = "task19-1-orders";

/** The route's allowance: ten orders an hour per address. */
const ORDER_RATE_LIMIT = 10;

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

// Orders are found through the products they bought as well as through who bought
// them, because a guest order has no customer to match. Their items cascade.
afterAll(async () => {
  await prisma.order.deleteMany({
    where: {
      OR: [
        { items: { some: { productNameSnapshot: { startsWith: PREFIX } } } },
        { customer: { email: { startsWith: PREFIX } } },
      ],
    },
  });
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

/** A product with `stock` units on the shelf. */
async function stockedProduct(overrides: Record<string, unknown>, stock: number) {
  const product = await createProduct(overrides);
  await prisma.inventory.create({
    data: { productId: product.id, stock, lastUpdatedAt: new Date() },
  });
  return product;
}

/** The cart lives in the browser, so checkout's lines arrive in the request body. */
function lines(...items: [productId: string, quantity: number][]) {
  return items.map(([productId, quantity]) => ({ productId, quantity }));
}

/** A second, independent customer + auth cookie — for tests that need two shoppers at once. */
async function createOtherCustomer(suffix: string) {
  const customer = await prisma.user.create({
    data: {
      email: `${PREFIX}-other-${suffix}@technotopia.test`,
      passwordHash: "x",
      firstName: "Other",
      lastName: suffix,
      role: Role.CUSTOMER,
    },
  });
  const cookie = await signToken({ userId: customer.id, role: Role.CUSTOMER });
  return { id: customer.id, cookie };
}

const VALID_SHIPPING: CheckoutDetailsInput = {
  fullName: "Task Customer",
  phone: "+98 910 000 00 00",
  address: "12 Test Street",
  city: "Tehran",
  postalCode: "12345",
  paymentMethod: "CARD",
};

function uniqueIp() {
  return `${PREFIX}-${Math.random().toString(36).slice(2)}`;
}

/**
 * Signed in as the test customer unless `cookie` says otherwise (null: no
 * session). Each request comes from its own address unless `ip` says otherwise,
 * so the per-address limit only ever meets the test that is about it.
 */
function req(
  body: unknown,
  { cookie = customerCookie, ip = uniqueIp() }: { cookie?: string | null; ip?: string } = {},
) {
  const headers: Record<string, string> = { "content-type": "application/json", "x-real-ip": ip };
  if (cookie !== null) headers.cookie = `${getCookieName()}=${cookie}`;
  return new NextRequest("http://localhost/api/storefront/orders", {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });
}

describe("POST /api/storefront/orders", () => {
  it("lets a guest order, and puts no customer on the row", async () => {
    const product = await stockedProduct({ price: 1200 }, 5);

    const response = await create(
      req({ ...VALID_SHIPPING, items: lines([product.id, 1]) }, { cookie: null }),
    );
    const body = await response.json();

    expect(response.status).toBe(201);
    expect(body.data).toMatchObject({ isGuest: true, total: 1200 + STANDARD_DELIVERY_COST });

    const order = await prisma.order.findUnique({ where: { id: body.data.id } });
    expect(order?.customerId).toBeNull();
    expect(order?.fullName).toBe(VALID_SHIPPING.fullName);
    expect(order?.phone).toBe(VALID_SHIPPING.phone);
  });

  it("never reads who is ordering from the body", async () => {
    const product = await stockedProduct({ price: 900 }, 5);
    const other = await createOtherCustomer("body");
    const claimed = { ...VALID_SHIPPING, customerId: other.id, items: lines([product.id, 1]) };

    const asGuest = await (await create(req(claimed, { cookie: null }))).json();
    const asCustomer = await (await create(req(claimed))).json();

    const guestOrder = await prisma.order.findUnique({ where: { id: asGuest.data.id } });
    const customerOrder = await prisma.order.findUnique({ where: { id: asCustomer.data.id } });
    expect(guestOrder?.customerId).toBeNull();
    expect(customerOrder?.customerId).toBe(customerId);
    expect(await prisma.order.count({ where: { customerId: other.id } })).toBe(0);
  });

  it("treats a staff session as a guest", async () => {
    const product = await stockedProduct({ price: 900 }, 5);
    // The token even names a real account — the role is what decides.
    const staffCookie = await signToken({ userId: customerId, role: Role.ADMIN });

    const response = await create(
      req({ ...VALID_SHIPPING, items: lines([product.id, 1]) }, { cookie: staffCookie }),
    );
    const body = await response.json();

    expect(response.status).toBe(201);
    expect(body.data.isGuest).toBe(true);
    const order = await prisma.order.findUnique({ where: { id: body.data.id } });
    expect(order?.customerId).toBeNull();
  });

  it("rejects an invalid body with a 400", async () => {
    const response = await create(
      req({ ...VALID_SHIPPING, items: lines(["p", 1]), paymentMethod: "CASH" }),
    );
    expect(response.status).toBe(400);
  });

  it("rejects checkout with an empty cart", async () => {
    const response = await create(req({ ...VALID_SHIPPING, items: [] }));
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.success).toBe(false);
  });

  it("files a signed-in customer's order under their account and decrements inventory", async () => {
    const product = await stockedProduct({ price: 2000, discountPercent: 25 }, 10);
    const response = await create(req({ ...VALID_SHIPPING, items: lines([product.id, 2]) }));
    const body = await response.json();

    expect(response.status).toBe(201);
    expect(body.success).toBe(true);
    expect(body.data.isGuest).toBe(false);

    const order = await prisma.order.findUnique({
      where: { id: body.data.id },
      include: { items: true },
    });
    expect(order).not.toBeNull();
    expect(order?.customerId).toBe(customerId);
    expect(order?.paymentMethod).toBe("CARD");
    expect(order?.fullName).toBe(VALID_SHIPPING.fullName);
    expect(order?.city).toBe(VALID_SHIPPING.city);
    expect(order?.shippingAddress).toBe(VALID_SHIPPING.address);
    expect(order?.items).toHaveLength(1);
    expect(order?.items[0]?.priceSnapshot).toBe(2000);
    expect(order?.items[0]?.lineTotal).toBe(3000); // 1500 discounted unit price x 2
    expect(order?.subtotal).toBe(4000);
    expect(order?.discount).toBe(1000);
    expect(order?.shippingCost).toBe(STANDARD_DELIVERY_COST);
    expect(order?.total).toBe(STANDARD_DELIVERY_COST + 3000);
    expect(body.data.total).toBe(order?.total);

    const inventory = await prisma.inventory.findUnique({ where: { productId: product.id } });
    expect(inventory?.stock).toBe(8);
  });

  it("stores the total the checkout summary showed, rounding and all", async () => {
    // 25% off 1999 is 1499.25. The summary rounds the unit and multiplies, as
    // every price on the storefront does: 2 × 1499. Rounding the line instead
    // would store 2999 against a screen that said 2998.
    const product = await stockedProduct({ price: 1999, discountPercent: 25 }, 5);
    const entries = await getCartCatalogEntries([product.id]);
    const summary = reconcileCart(
      [
        {
          productId: product.id,
          quantity: 2,
          addedAt: new Date().toISOString(),
          capturedPrice: entries[0]!.unitPrice,
        },
      ],
      entries,
    );
    expect(summary.total).toBe(2 * 1499 + STANDARD_DELIVERY_COST);

    const response = await create(req(toOrderPayload(VALID_SHIPPING, summary)));
    const body = await response.json();
    const order = await prisma.order.findUnique({ where: { id: body.data.id } });

    expect(order?.total).toBe(summary.total);
    expect(order?.shippingCost).toBe(summary.shipping);
    expect(order!.subtotal - order!.discount).toBe(summary.subtotal);
    expect(body.data.total).toBe(summary.total);
  });

  it("prices from the catalog, so a price sent by the client is ignored", async () => {
    const product = await stockedProduct({ price: 4000, discountPercent: 0 }, 5);

    const response = await create(
      req({
        ...VALID_SHIPPING,
        // A hand-edited body claiming the product costs 1 rial.
        items: [{ productId: product.id, quantity: 1, price: 1, lineTotal: 1 }],
      }),
    );
    const body = await response.json();

    expect(response.status).toBe(201);
    const order = await prisma.order.findUnique({
      where: { id: body.data.id },
      include: { items: true },
    });
    expect(order?.items[0]?.priceSnapshot).toBe(4000);
    expect(order?.items[0]?.lineTotal).toBe(4000);
  });

  it("refuses a product that is no longer on sale, and reserves no stock for it", async () => {
    const product = await stockedProduct({ price: 700, status: Status.INACTIVE }, 4);

    const response = await create(req({ ...VALID_SHIPPING, items: lines([product.id, 1]) }));
    const body = await response.json();

    expect(response.status).toBe(409);
    expect(body.success).toBe(false);

    const inventory = await prisma.inventory.findUnique({ where: { productId: product.id } });
    expect(inventory?.stock).toBe(4);
  });

  it("rejects checkout when stock is insufficient and leaves inventory unchanged", async () => {
    const product = await stockedProduct({ price: 500 }, 1);
    const response = await create(req({ ...VALID_SHIPPING, items: lines([product.id, 5]) }));
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

  it("limits orders per address before reading the body or touching the database", async () => {
    const product = await stockedProduct({ price: 900 }, 5);
    const ip = uniqueIp();

    // Malformed bodies still spend the allowance: the limit counts attempts, and
    // none of these got as far as the database.
    for (let attempt = 0; attempt < ORDER_RATE_LIMIT; attempt++) {
      const response = await create(req({ items: [] }, { ip }));
      expect(response.status).toBe(400);
    }

    const limited = await create(req({ ...VALID_SHIPPING, items: lines([product.id, 1]) }, { ip }));
    expect(limited.status).toBe(429);
    expect(limited.headers.get("Retry-After")).toMatch(/^\d+$/);
    expect(await prisma.order.count({ where: { items: { some: { productId: product.id } } } })).toBe(
      0,
    );
    const inventory = await prisma.inventory.findUnique({ where: { productId: product.id } });
    expect(inventory?.stock).toBe(5);

    // Per address: the same order from another one goes through.
    const elsewhere = await create(req({ ...VALID_SHIPPING, items: lines([product.id, 1]) }));
    expect(elsewhere.status).toBe(201);
  });

  it("can't be oversold when two checkouts race for the last unit of stock", async () => {
    const product = await stockedProduct({ price: 1000 }, 1);

    const racerA = await createOtherCustomer("race-a");
    const racerB = await createOtherCustomer("race-b");
    // Fired together (not awaited one at a time) so both requests' `prisma.$transaction`
    // calls are in flight against the real Postgres instance at the same time, racing for
    // the same inventory row rather than running strictly one-after-another.
    const [responseA, responseB] = await Promise.all([
      create(req({ ...VALID_SHIPPING, items: lines([product.id, 1]) }, { cookie: racerA.cookie })),
      create(req({ ...VALID_SHIPPING, items: lines([product.id, 1]) }, { cookie: racerB.cookie })),
    ]);
    const [bodyA, bodyB] = await Promise.all([responseA.json(), responseB.json()]);

    const statuses = [responseA.status, responseB.status].sort();
    expect(statuses).toEqual([201, 409]);

    const [winnerBody, loserBody] = responseA.status === 201 ? [bodyA, bodyB] : [bodyB, bodyA];
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
