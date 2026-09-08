import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import { GET } from "./route";
import { Status } from "@/lib/generated/prisma/enums";
import { prisma } from "@/lib/db";
import { reconcileCart, type CartCatalogEntry } from "@/lib/storefront/cart";

const PREFIX = "task30-1-cart";

let activeId: string;
let inactiveId: string;
let outOfStockId: string;

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

  async function seed(suffix: string, status: Status, stock: number, discountPercent = 0) {
    const product = await prisma.product.create({
      data: {
        name: `${PREFIX} ${suffix}`,
        slug: `${PREFIX}-${suffix}`,
        sku: `${PREFIX}-${suffix}`,
        categoryId: category.id,
        brandId: brand.id,
        price: 1000,
        discountPercent,
        tags: [],
        shortDescription: "x",
        longDescription: "x",
        status,
      },
    });
    await prisma.inventory.create({
      data: { productId: product.id, stock, lastUpdatedAt: new Date() },
    });
    return product.id;
  }

  activeId = await seed("active", Status.ACTIVE, 3, 20);
  inactiveId = await seed("inactive", Status.INACTIVE, 5);
  outOfStockId = await seed("empty", Status.ACTIVE, 0);
});

afterAll(async () => {
  await prisma.inventory.deleteMany({ where: { product: { sku: { startsWith: PREFIX } } } });
  await prisma.product.deleteMany({ where: { sku: { startsWith: PREFIX } } });
  await prisma.brand.deleteMany({ where: { slug: { startsWith: PREFIX } } });
  await prisma.category.deleteMany({ where: { slug: { startsWith: PREFIX } } });
  await prisma.$disconnect();
});

/** No cookie is ever sent: the whole point is that this answers for a visitor. */
async function lookup(ids: string | null) {
  const url = new URL("http://localhost/api/storefront/cart");
  if (ids !== null) url.searchParams.set("ids", ids);
  const response = await GET(new NextRequest(url));
  return { status: response.status, body: await response.json() };
}

describe("GET /api/storefront/cart", () => {
  it("answers a logged-out visitor", async () => {
    const { status, body } = await lookup(activeId);
    expect(status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.data.entries).toHaveLength(1);
  });

  it("returns an empty list rather than an error for no ids", async () => {
    expect((await lookup(null)).body.data.entries).toEqual([]);
    expect((await lookup("")).body.data.entries).toEqual([]);
  });

  it("prices each entry the way the storefront shows it", async () => {
    const [entry] = (await lookup(activeId)).body.data.entries as CartCatalogEntry[];
    expect(entry).toMatchObject({
      productId: activeId,
      unitPrice: 800,
      originalPrice: 1000,
      discountPercent: 20,
      stock: 3,
      isAvailable: true,
    });
  });

  it("returns a deactivated product marked unavailable rather than omitting it", async () => {
    const [entry] = (await lookup(inactiveId)).body.data.entries as CartCatalogEntry[];
    expect(entry?.productId).toBe(inactiveId);
    expect(entry?.isAvailable).toBe(false);
  });

  it("says nothing about an id the catalog has no row for", async () => {
    const { body } = await lookup(`${activeId},does-not-exist`);
    expect(body.data.entries.map((entry: CartCatalogEntry) => entry.productId)).toEqual([activeId]);
  });

  it("feeds the same reconciliation rules the cart page uses", async () => {
    const ids = [activeId, inactiveId, outOfStockId];
    const { body } = await lookup(ids.join(","));

    const cart = reconcileCart(
      ids.map((productId, index) => ({
        productId,
        quantity: 5,
        addedAt: `2026-09-0${index + 1}T00:00:00.000Z`,
        capturedPrice: 800,
      })),
      body.data.entries,
    );

    expect(cart.lines.map((line) => line.issue)).toEqual([
      "exceedsStock", // 5 asked for, 3 on the shelf
      "unavailable", // deactivated since it went in
      "outOfStock",
    ]);
    expect(cart.subtotal).toBe(800 * 3);
  });
});
