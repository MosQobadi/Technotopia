import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import { GET as getCart, POST as addItem } from "./route";
import { PATCH as updateItem, DELETE as removeItem } from "./[itemId]/route";
import { getCookieName, signToken } from "@/lib/auth";
import { Role, Status } from "@/lib/generated/prisma/enums";
import { prisma } from "@/lib/db";

const PREFIX = "task24-2-cart";

let categoryId: string;
let brandId: string;
let productId: string;

// Two independent customers so cross-customer (IDOR) access can be exercised: B trying to
// read/mutate an item that lives in A's cart via A's cart-item id.
let customerAId: string;
let customerACookie: string;
let customerBCookie: string;
let cartItemId: string;

beforeAll(async () => {
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
      slug: `${PREFIX}-product`,
      sku: `${PREFIX}-SKU`,
      categoryId,
      brandId,
      price: 1000,
      discountPercent: 0,
      tags: [],
      shortDescription: "x",
      longDescription: "x",
      status: Status.ACTIVE,
    },
  });
  productId = product.id;

  const customerA = await prisma.user.create({
    data: {
      email: `${PREFIX}-a@technotopia.test`,
      passwordHash: "x",
      firstName: "Customer",
      lastName: "A",
      role: Role.CUSTOMER,
    },
  });
  customerAId = customerA.id;
  customerACookie = await signToken({ userId: customerAId, role: Role.CUSTOMER });

  const customerB = await prisma.user.create({
    data: {
      email: `${PREFIX}-b@technotopia.test`,
      passwordHash: "x",
      firstName: "Customer",
      lastName: "B",
      role: Role.CUSTOMER,
    },
  });
  customerBCookie = await signToken({ userId: customerB.id, role: Role.CUSTOMER });

  const cart = await prisma.cart.create({ data: { userId: customerAId } });
  const item = await prisma.cartItem.create({ data: { cartId: cart.id, productId, quantity: 1 } });
  cartItemId = item.id;
});

afterAll(async () => {
  await prisma.cartItem.deleteMany({ where: { cart: { user: { email: { startsWith: PREFIX } } } } });
  await prisma.cart.deleteMany({ where: { user: { email: { startsWith: PREFIX } } } });
  await prisma.product.deleteMany({ where: { sku: { startsWith: PREFIX } } });
  await prisma.brand.deleteMany({ where: { slug: { startsWith: PREFIX } } });
  await prisma.category.deleteMany({ where: { slug: { startsWith: PREFIX } } });
  await prisma.user.deleteMany({ where: { email: { startsWith: PREFIX } } });
  await prisma.$disconnect();
});

function req(url: string, method: string, body: unknown, cookie: string | null) {
  const headers: Record<string, string> = { "content-type": "application/json" };
  if (cookie !== null) headers.cookie = `${getCookieName()}=${cookie}`;
  return new NextRequest(url, {
    method,
    headers,
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  });
}

describe("GET /api/storefront/cart", () => {
  it("rejects an unauthenticated request with a 401", async () => {
    const response = await getCart(req("http://localhost/api/storefront/cart", "GET", undefined, null));
    expect(response.status).toBe(401);
  });
});

describe("POST /api/storefront/cart", () => {
  it("rejects a quantity outside the allowed range with a 400", async () => {
    const response = await addItem(
      req("http://localhost/api/storefront/cart", "POST", { productId, quantity: 0 }, customerACookie),
    );
    expect(response.status).toBe(400);
  });

  it("rejects a non-existent product with a 404", async () => {
    const response = await addItem(
      req(
        "http://localhost/api/storefront/cart",
        "POST",
        { productId: "not-a-real-product-id", quantity: 1 },
        customerACookie,
      ),
    );
    expect(response.status).toBe(404);
  });
});

describe("PATCH /api/storefront/cart/[itemId]", () => {
  it("rejects an invalid quantity with a 400", async () => {
    const response = await updateItem(
      req(`http://localhost/api/storefront/cart/${cartItemId}`, "PATCH", { quantity: 0 }, customerACookie),
      { params: Promise.resolve({ itemId: cartItemId }) },
    );
    expect(response.status).toBe(400);
  });

  it("can't be used by another customer to modify someone else's cart item", async () => {
    const response = await updateItem(
      req(`http://localhost/api/storefront/cart/${cartItemId}`, "PATCH", { quantity: 5 }, customerBCookie),
      { params: Promise.resolve({ itemId: cartItemId }) },
    );
    expect(response.status).toBe(404);

    const item = await prisma.cartItem.findUnique({ where: { id: cartItemId } });
    expect(item?.quantity).toBe(1); // unchanged
  });

  it("lets the owning customer update their own cart item", async () => {
    const response = await updateItem(
      req(`http://localhost/api/storefront/cart/${cartItemId}`, "PATCH", { quantity: 3 }, customerACookie),
      { params: Promise.resolve({ itemId: cartItemId }) },
    );
    expect(response.status).toBe(200);

    const item = await prisma.cartItem.findUnique({ where: { id: cartItemId } });
    expect(item?.quantity).toBe(3);
  });
});

describe("DELETE /api/storefront/cart/[itemId]", () => {
  it("can't be used by another customer to remove someone else's cart item", async () => {
    const response = await removeItem(
      req(`http://localhost/api/storefront/cart/${cartItemId}`, "DELETE", undefined, customerBCookie),
      { params: Promise.resolve({ itemId: cartItemId }) },
    );
    expect(response.status).toBe(404);

    const item = await prisma.cartItem.findUnique({ where: { id: cartItemId } });
    expect(item).not.toBeNull();
  });

  it("lets the owning customer remove their own cart item", async () => {
    const response = await removeItem(
      req(`http://localhost/api/storefront/cart/${cartItemId}`, "DELETE", undefined, customerACookie),
      { params: Promise.resolve({ itemId: cartItemId }) },
    );
    expect(response.status).toBe(200);

    const item = await prisma.cartItem.findUnique({ where: { id: cartItemId } });
    expect(item).toBeNull();
  });
});
