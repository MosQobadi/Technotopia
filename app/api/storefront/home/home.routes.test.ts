import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { GET as getHome } from "./route";
import { Status } from "@/lib/generated/prisma/enums";
import { prisma } from "@/lib/db";

const PREFIX = "task16-1";

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
});

afterAll(async () => {
  await prisma.product.deleteMany({ where: { sku: { startsWith: PREFIX } } });
  await prisma.brand.deleteMany({ where: { slug: { startsWith: PREFIX } } });
  await prisma.category.deleteMany({ where: { slug: { startsWith: PREFIX } } });
  await prisma.banner.deleteMany({ where: { headline: { startsWith: PREFIX } } });
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

describe("GET /api/storefront/home", () => {
  it("requires no authentication", async () => {
    const response = await getHome();
    expect(response.status).toBe(200);
  });

  it("returns up to 3 active banners ordered by displayOrder with tag/headline/subcopy/cta", async () => {
    await prisma.banner.create({
      data: {
        image: "/uploads/banner-inactive.jpg",
        headline: `${PREFIX} Inactive`,
        status: Status.INACTIVE,
        displayOrder: 0,
      },
    });
    await prisma.banner.create({
      data: {
        image: "/uploads/banner-b.jpg",
        tag: "best seller",
        headline: `${PREFIX} Second`,
        subheadline: "Second subcopy",
        ctaLabel: "Shop now",
        link: "/categories/x",
        status: Status.ACTIVE,
        displayOrder: 2,
      },
    });
    await prisma.banner.create({
      data: {
        image: "/uploads/banner-a.jpg",
        tag: "new arrival",
        headline: `${PREFIX} First`,
        subheadline: "First subcopy",
        ctaLabel: "Shop the kit",
        link: "/categories/y",
        status: Status.ACTIVE,
        displayOrder: 1,
      },
    });

    const response = await getHome();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    const ownBanners = body.data.banners.filter((b: { headline: string }) =>
      b.headline.startsWith(PREFIX),
    );
    expect(ownBanners).toEqual([
      {
        id: expect.any(String),
        image: "/uploads/banner-a.jpg",
        tag: "new arrival",
        headline: `${PREFIX} First`,
        subcopy: "First subcopy",
        cta: { label: "Shop the kit", href: "/categories/y" },
      },
      {
        id: expect.any(String),
        image: "/uploads/banner-b.jpg",
        tag: "best seller",
        headline: `${PREFIX} Second`,
        subcopy: "Second subcopy",
        cta: { label: "Shop now", href: "/categories/x" },
      },
    ]);
    expect(body.data.banners.length).toBeLessThanOrEqual(3);
  });

  it("returns featured products with discount fields only when discounted", async () => {
    const plain = await createProduct({ isFeatured: true, price: 1000, discountPercent: 0 });
    const discounted = await createProduct({ isFeatured: true, price: 2000, discountPercent: 25 });
    const notFeatured = await createProduct({ isFeatured: false });

    const response = await getHome();
    const body = await response.json();
    const featured: Array<{ id: string; originalPrice?: number }> = body.data.featuredProducts;

    expect(featured.find((p) => p.id === discounted.id)).toEqual({
      id: discounted.id,
      slug: discounted.slug,
      name: discounted.name,
      image: null,
      category: `${PREFIX} Category`,
      price: 1500,
      originalPrice: 2000,
    });
    const plainView = featured.find((p) => p.id === plain.id);
    expect(plainView).toBeDefined();
    expect(plainView).not.toHaveProperty("originalPrice");
    expect(featured.some((p) => p.id === notFeatured.id)).toBe(false);
  });

  it("returns best sellers ordered by salesCount descending", async () => {
    const low = await createProduct({ salesCount: 5 });
    const high = await createProduct({ salesCount: 50 });

    const response = await getHome();
    const body = await response.json();

    const ids: string[] = body.data.bestSellers.map((p: { id: string }) => p.id);
    expect(ids.indexOf(high.id)).toBeLessThan(ids.indexOf(low.id));
  });
});
