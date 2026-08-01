import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import { GET as getDetail } from "./route";
import { Status } from "@/lib/generated/prisma/enums";
import { prisma } from "@/lib/db";

const PREFIX = "task18-1-product-detail";

let categoryId: string;
let otherCategoryId: string;
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
});

afterAll(async () => {
  await prisma.product.deleteMany({ where: { sku: { startsWith: PREFIX } } });
  await prisma.brand.deleteMany({ where: { slug: { startsWith: PREFIX } } });
  await prisma.category.deleteMany({ where: { slug: { startsWith: PREFIX } } });
  await prisma.$disconnect();
});

function req() {
  return new NextRequest("http://localhost/api/storefront/products/x");
}

function ctx(slug: string) {
  return { params: Promise.resolve({ slug }) };
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
      tags: ["tag-a", "tag-b"],
      shortDescription: "short",
      longDescription: "long",
      status: Status.ACTIVE,
      ...overrides,
    },
  });
}

describe("GET /api/storefront/products/[slug]", () => {
  it("requires no authentication and returns the product by slug", async () => {
    const product = await createProduct();

    const response = await getDetail(req(), ctx(product.slug));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.data.product.id).toBe(product.id);
    expect(body.data.product.tags).toEqual(["tag-a", "tag-b"]);
    expect(body.data.product.shortDescription).toBe("short");
    expect(body.data.product.longDescription).toBe("long");
  });

  it("returns 404 on an unknown slug", async () => {
    const response = await getDetail(req(), ctx(`${PREFIX}-does-not-exist`));
    expect(response.status).toBe(404);
    const body = await response.json();
    expect(body.success).toBe(false);
  });

  it("returns 404 for an inactive product", async () => {
    const product = await createProduct({ status: Status.INACTIVE });
    const response = await getDetail(req(), ctx(product.slug));
    expect(response.status).toBe(404);
  });

  it("returns up to 4 related products from the same category, excluding self", async () => {
    const target = await createProduct();
    const related = await Promise.all([
      createProduct(),
      createProduct(),
      createProduct(),
      createProduct(),
      createProduct(),
    ]);
    const otherCategoryProduct = await createProduct({ categoryId: otherCategoryId });

    const response = await getDetail(req(), ctx(target.slug));
    const body = await response.json();

    expect(body.data.related.length).toBeLessThanOrEqual(4);
    const relatedIds: string[] = body.data.related.map((p: { id: string }) => p.id);
    expect(relatedIds).not.toContain(target.id);
    expect(relatedIds).not.toContain(otherCategoryProduct.id);
    relatedIds.forEach((id) => expect(related.map((r) => r.id)).toContain(id));
  });
});