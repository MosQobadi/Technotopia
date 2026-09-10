import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import { POST } from "./route";
import { Status } from "@/lib/generated/prisma/enums";
import { prisma } from "@/lib/db";

const PREFIX = "task30-6-notify";

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
  // Deleting the products takes their requests with them (onDelete: Cascade).
  await prisma.product.deleteMany({ where: { sku: { startsWith: PREFIX } } });
  await prisma.brand.deleteMany({ where: { slug: { startsWith: PREFIX } } });
  await prisma.category.deleteMany({ where: { slug: { startsWith: PREFIX } } });
  await prisma.$disconnect();
});

// Each test speaks from its own address, so none of them spends another's
// rate-limit allowance.
function req(body: unknown, ip = `10.30.6.${Math.floor(Math.random() * 250)}`) {
  return new NextRequest("http://localhost/api/storefront/products/x/notify-me", {
    method: "POST",
    headers: { "content-type": "application/json", "x-real-ip": ip },
    body: JSON.stringify(body),
  });
}

function ctx(slug: string) {
  return { params: Promise.resolve({ slug }) };
}

async function createProduct(stock: number, overrides: Record<string, unknown> = {}) {
  const suffix = Math.random().toString(36).slice(2, 8);
  return prisma.product.create({
    data: {
      name: `${PREFIX} Product`,
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
      inventory: { create: { stock, lastUpdatedAt: new Date() } },
      ...overrides,
    },
  });
}

describe("POST /api/storefront/products/[slug]/notify-me", () => {
  it("records a request for an out-of-stock product, contact normalised", async () => {
    const product = await createProduct(0);

    const response = await POST(req({ contact: " Ali@Example.com " }), ctx(product.slug));
    const body = await response.json();

    expect(response.status).toBe(201);
    expect(body).toEqual({ success: true, data: { alreadyInStock: false } });

    const rows = await prisma.stockNotification.findMany({ where: { productId: product.id } });
    expect(rows).toEqual([
      expect.objectContaining({ contact: "ali@example.com", notifiedAt: null }),
    ]);
  });

  it("keeps one pending request when the same contact asks twice", async () => {
    const product = await createProduct(0);

    await POST(req({ contact: "0912 345 6789" }), ctx(product.slug));
    await POST(req({ contact: "۰۹۱۲۳۴۵۶۷۸۹" }), ctx(product.slug));

    const count = await prisma.stockNotification.count({ where: { productId: product.id } });
    expect(count).toBe(1);
  });

  it("answers that an in-stock product is back, and records nothing", async () => {
    const product = await createProduct(4);

    const response = await POST(req({ contact: "ali@example.com" }), ctx(product.slug));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data.alreadyInStock).toBe(true);
    expect(await prisma.stockNotification.count({ where: { productId: product.id } })).toBe(0);
  });

  it("returns 404 for an inactive product", async () => {
    const product = await createProduct(0, { status: Status.INACTIVE });

    const response = await POST(req({ contact: "ali@example.com" }), ctx(product.slug));

    expect(response.status).toBe(404);
    expect(await prisma.stockNotification.count({ where: { productId: product.id } })).toBe(0);
  });

  it("rejects a contact that is neither an email nor a phone number", async () => {
    const product = await createProduct(0);

    const response = await POST(req({ contact: "call me" }), ctx(product.slug));

    expect(response.status).toBe(400);
    expect(await prisma.stockNotification.count({ where: { productId: product.id } })).toBe(0);
  });

  it("limits one address to ten requests an hour", async () => {
    const ip = "10.30.6.254";
    for (let i = 0; i < 10; i++) {
      const allowed = await POST(req({ contact: "x" }, ip), ctx(`${PREFIX}-missing`));
      expect(allowed.status).toBe(400);
    }

    const refused = await POST(req({ contact: "x" }, ip), ctx(`${PREFIX}-missing`));
    expect(refused.status).toBe(429);
    expect(refused.headers.get("Retry-After")).toBeTruthy();
  });
});
