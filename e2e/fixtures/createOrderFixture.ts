// Run via `tsx` (not imported directly into the Playwright test process — Prisma 7's
// generated client is pure ESM and doesn't survive Playwright's own TS transform).
// Creates a single PENDING order so orders.spec.ts has something to advance through
// its status sequence, since the admin panel has no order-creation UI of its own.
import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../../lib/generated/prisma/client";
import { Role, Status } from "../../lib/generated/prisma/enums";

const prefix = process.argv[2];
if (!prefix) throw new Error("Usage: tsx createOrderFixture.ts <prefix>");

const adapter = new PrismaPg(process.env["DATABASE_URL"] as string);
const prisma = new PrismaClient({ adapter });

async function main() {
  const customer = await prisma.user.create({
    data: {
      email: `${prefix}@example.com`,
      passwordHash: "not-a-real-hash",
      firstName: "E2E",
      lastName: "Customer",
      role: Role.CUSTOMER,
    },
  });

  const category = await prisma.category.create({
    data: {
      name: `${prefix} Category`,
      slug: `${prefix}-category`,
      tags: [],
      shortDescription: "x",
      longDescription: "x",
      status: Status.ACTIVE,
    },
  });

  const brand = await prisma.brand.create({
    data: { name: `${prefix} Brand`, slug: `${prefix}-brand`, status: Status.ACTIVE },
  });

  const product = await prisma.product.create({
    data: {
      name: `${prefix} Product`,
      sku: `${prefix}-SKU`,
      categoryId: category.id,
      brandId: brand.id,
      price: 25,
      discountPercent: 0,
      tags: [],
      shortDescription: "x",
      longDescription: "x",
      status: Status.ACTIVE,
    },
  });

  const order = await prisma.order.create({
    data: {
      customerId: customer.id,
      status: "PENDING",
      paymentStatus: "UNPAID",
      subtotal: 25,
      discount: 0,
      shippingCost: 5,
      tax: 2,
      total: 32,
      shippingAddress: "1 Test Street",
      postalCode: "TE5T 1NG",
      items: {
        create: [
          {
            productId: product.id,
            productNameSnapshot: `${prefix} Product`,
            priceSnapshot: 25,
            quantity: 1,
            lineTotal: 25,
          },
        ],
      },
    },
  });

  process.stdout.write(
    JSON.stringify({
      orderId: order.id,
      customerId: customer.id,
      categoryId: category.id,
      brandId: brand.id,
      productId: product.id,
    }),
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
