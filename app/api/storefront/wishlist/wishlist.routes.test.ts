import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import { GET as getWishlist, POST as addItem } from "./route";
import { DELETE as removeItem } from "./[productId]/route";
import { getCookieName, signToken } from "@/lib/auth";
import { Role, Status } from "@/lib/generated/prisma/enums";
import { prisma } from "@/lib/db";

const PREFIX = "task24-2-wishlist";

let productId: string;
let customerACookie: string;
let customerBCookie: string;

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

  const brand = await prisma.brand.create({
    data: { name: `${PREFIX} Brand`, slug: `${PREFIX}-brand`, status: Status.ACTIVE },
  });

  const product = await prisma.product.create({
    data: {
      name: `${PREFIX} Product`,
      slug: `${PREFIX}-product`,
      sku: `${PREFIX}-SKU`,
      categoryId: category.id,
      brandId: brand.id,
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
  customerACookie = await signToken({ userId: customerA.id, role: Role.CUSTOMER });

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

  await prisma.wishlist.create({ data: { userId: customerA.id, productId } });
});

afterAll(async () => {
  await prisma.wishlist.deleteMany({ where: { user: { email: { startsWith: PREFIX } } } });
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

describe("GET /api/storefront/wishlist", () => {
  it("rejects an unauthenticated request with a 401", async () => {
    const response = await getWishlist(
      req("http://localhost/api/storefront/wishlist", "GET", undefined, null),
    );
    expect(response.status).toBe(401);
  });

  it("only returns the requesting customer's own items", async () => {
    const response = await getWishlist(
      req("http://localhost/api/storefront/wishlist", "GET", undefined, customerBCookie),
    );
    const body = await response.json();
    expect(response.status).toBe(200);
    expect(body.data).toEqual([]); // customer B never added anything
  });
});

describe("POST /api/storefront/wishlist", () => {
  it("rejects a body missing productId with a 400", async () => {
    const response = await addItem(
      req("http://localhost/api/storefront/wishlist", "POST", {}, customerACookie),
    );
    expect(response.status).toBe(400);
  });

  it("rejects a non-existent product with a 404", async () => {
    const response = await addItem(
      req(
        "http://localhost/api/storefront/wishlist",
        "POST",
        { productId: "not-a-real-product-id" },
        customerACookie,
      ),
    );
    expect(response.status).toBe(404);
  });
});

describe("DELETE /api/storefront/wishlist/[productId]", () => {
  it("is scoped to the requesting customer: it can't remove another customer's wishlist entry", async () => {
    // Customer B has never wishlisted this product, so from B's perspective there's nothing
    // to delete — this proves removal is scoped by (userId, productId), not by productId alone.
    const response = await removeItem(
      req(`http://localhost/api/storefront/wishlist/${productId}`, "DELETE", undefined, customerBCookie),
      { params: Promise.resolve({ productId }) },
    );
    expect(response.status).toBe(404);

    const stillThere = await prisma.wishlist.findFirst({ where: { productId } });
    expect(stillThere).not.toBeNull(); // customer A's entry survives
  });

  it("lets the owning customer remove their own wishlist entry", async () => {
    const response = await removeItem(
      req(`http://localhost/api/storefront/wishlist/${productId}`, "DELETE", undefined, customerACookie),
      { params: Promise.resolve({ productId }) },
    );
    expect(response.status).toBe(200);

    const item = await prisma.wishlist.findFirst({ where: { productId } });
    expect(item).toBeNull();
  });
});
