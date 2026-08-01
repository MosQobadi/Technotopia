import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import { GET as list } from "./route";
import { Status } from "@/lib/generated/prisma/enums";
import { prisma } from "@/lib/db";

const PREFIX = "task17-1-products";

let categoryId: string;
let otherCategoryId: string;
let brandId: string;
let otherBrandId: string;

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
  await prisma.product.deleteMany({ where: { sku: { startsWith: PREFIX } } });
  await prisma.brand.deleteMany({ where: { slug: { startsWith: PREFIX } } });
  await prisma.category.deleteMany({ where: { slug: { startsWith: PREFIX } } });
  await prisma.$disconnect();
});

function req(url: string) {
  return new NextRequest(`http://localhost${url}`);
}

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

describe("GET /api/storefront/products", () => {
  it("requires no authentication", async () => {
    const response = await list(req("/api/storefront/products"));
    expect(response.status).toBe(200);
  });

  it("defaults to sort=sold (salesCount desc)", async () => {
    const low = await createProduct({ salesCount: 5 });
    const high = await createProduct({ salesCount: 50 });

    const response = await list(req(`/api/storefront/products?search=${PREFIX}`));
    const body = await response.json();

    const ids: string[] = body.data.products.map((p: { id: string }) => p.id);
    expect(ids.indexOf(high.id)).toBeLessThan(ids.indexOf(low.id));
  });

  it("never returns inactive products regardless of the status filter", async () => {
    const inactive = await createProduct({ status: Status.INACTIVE });

    const response = await list(req(`/api/storefront/products?search=${PREFIX}`));
    const body = await response.json();

    const ids: string[] = body.data.products.map((p: { id: string }) => p.id);
    expect(ids).not.toContain(inactive.id);
  });

  it("filters by category, brand, and maxPrice together", async () => {
    const match = await createProduct({
      name: `${PREFIX} Filter Target`,
      categoryId,
      brandId,
      price: 500,
    });
    await createProduct({
      name: `${PREFIX} Filter Target`,
      categoryId: otherCategoryId,
      brandId,
      price: 500,
    });
    await createProduct({
      name: `${PREFIX} Filter Target`,
      categoryId,
      brandId: otherBrandId,
      price: 500,
    });
    await createProduct({
      name: `${PREFIX} Filter Target`,
      categoryId,
      brandId,
      price: 5000,
    });

    const response = await list(
      req(
        `/api/storefront/products?search=${PREFIX}%20Filter&category=${categoryId}&brand=${brandId}&maxPrice=1000`,
      ),
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.data.products.length).toBe(1);
    expect(body.data.products[0].id).toBe(match.id);
  });

  it("filters by derived stock status", async () => {
    const outOfStock = await createProduct({ name: `${PREFIX} Stock Target` });
    const inStock = await createProduct({ name: `${PREFIX} Stock Target` });
    await prisma.inventory.create({
      data: { productId: outOfStock.id, stock: 0, lastUpdatedAt: new Date() },
    });
    await prisma.inventory.create({
      data: { productId: inStock.id, stock: 20, lastUpdatedAt: new Date() },
    });

    const response = await list(
      req(`/api/storefront/products?search=${PREFIX}%20Stock&status=IN_STOCK`),
    );
    const body = await response.json();

    const ids: string[] = body.data.products.map((p: { id: string }) => p.id);
    expect(ids).toContain(inStock.id);
    expect(ids).not.toContain(outOfStock.id);
  });

  it("sorts by priceAsc and priceDesc", async () => {
    const cheap = await createProduct({ name: `${PREFIX} Price Target`, price: 100 });
    const expensive = await createProduct({ name: `${PREFIX} Price Target`, price: 900 });

    const asc = await list(
      req(`/api/storefront/products?search=${PREFIX}%20Price&sort=priceAsc`),
    );
    const ascBody = await asc.json();
    const ascIds: string[] = ascBody.data.products.map((p: { id: string }) => p.id);
    expect(ascIds.indexOf(cheap.id)).toBeLessThan(ascIds.indexOf(expensive.id));

    const desc = await list(
      req(`/api/storefront/products?search=${PREFIX}%20Price&sort=priceDesc`),
    );
    const descBody = await desc.json();
    const descIds: string[] = descBody.data.products.map((p: { id: string }) => p.id);
    expect(descIds.indexOf(expensive.id)).toBeLessThan(descIds.indexOf(cheap.id));
  });

  it("computes discounted price with originalPrice only when discounted", async () => {
    const discounted = await createProduct({
      name: `${PREFIX} Discount Target`,
      price: 2000,
      discountPercent: 25,
    });

    const response = await list(req(`/api/storefront/products?search=${PREFIX}%20Discount`));
    const body = await response.json();
    const product = body.data.products.find((p: { id: string }) => p.id === discounted.id);

    expect(product.price).toBe(1500);
    expect(product.originalPrice).toBe(2000);
  });

  it("rejects an invalid sort value with a 400", async () => {
    const response = await list(req("/api/storefront/products?sort=invalid"));
    expect(response.status).toBe(400);
  });
});
