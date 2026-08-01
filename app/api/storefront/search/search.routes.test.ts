import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import { GET as search } from "./route";
import { Status } from "@/lib/generated/prisma/enums";
import { prisma } from "@/lib/db";

const PREFIX = "task17-1-search";

let categoryId: string;
let brandId: string;

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

  await prisma.product.create({
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

describe("GET /api/storefront/search", () => {
  it("requires no authentication and rejects a missing q", async () => {
    const missingQuery = await search(req("/api/storefront/search"));
    expect(missingQuery.status).toBe(400);
  });

  it("scope=all returns matches across products, categories, and brands", async () => {
    const response = await search(req(`/api/storefront/search?q=${PREFIX}`));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.data.products.some((p: { name: string }) => p.name === `${PREFIX} Product`)).toBe(
      true,
    );
    expect(
      body.data.categories.some((c: { name: string }) => c.name === `${PREFIX} Category`),
    ).toBe(true);
    expect(body.data.brands.some((b: { name: string }) => b.name === `${PREFIX} Brand`)).toBe(
      true,
    );
  });

  it("scope=products only searches products", async () => {
    const response = await search(req(`/api/storefront/search?scope=products&q=${PREFIX}`));
    const body = await response.json();

    expect(body.data.products.length).toBeGreaterThan(0);
    expect(body.data.categories).toEqual([]);
    expect(body.data.brands).toEqual([]);
  });

  it("scope is case-insensitive", async () => {
    const response = await search(req(`/api/storefront/search?scope=Brands&q=${PREFIX}`));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data.products).toEqual([]);
    expect(body.data.brands.some((b: { name: string }) => b.name === `${PREFIX} Brand`)).toBe(
      true,
    );
  });

  it("rejects an invalid scope with a 400", async () => {
    const response = await search(req(`/api/storefront/search?scope=invalid&q=${PREFIX}`));
    expect(response.status).toBe(400);
  });
});
