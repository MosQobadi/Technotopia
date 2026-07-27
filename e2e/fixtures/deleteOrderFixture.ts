// Cleanup counterpart to createOrderFixture.ts — see that file for why this runs
// as a separate `tsx` process instead of being imported into the Playwright test.
import "dotenv/config";
import { readFileSync } from "node:fs";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../../lib/generated/prisma/client";

interface OrderFixtureIds {
  orderId: string;
  customerId: string;
  categoryId: string;
  brandId: string;
  productId: string;
}

// Ids are passed via a file path (not an inline JSON argv) so this survives being
// shelled out to on Windows, where a shell re-parses and mangles quoted CLI args.
const idsFilePath = process.argv[2];
if (!idsFilePath) throw new Error("Usage: tsx deleteOrderFixture.ts <path-to-ids-json>");
const ids: OrderFixtureIds = JSON.parse(readFileSync(idsFilePath, "utf-8"));

const adapter = new PrismaPg(process.env["DATABASE_URL"] as string);
const prisma = new PrismaClient({ adapter });

async function main() {
  await prisma.orderItem.deleteMany({ where: { orderId: ids.orderId } });
  await prisma.order.deleteMany({ where: { id: ids.orderId } });
  await prisma.product.deleteMany({ where: { id: ids.productId } });
  await prisma.brand.deleteMany({ where: { id: ids.brandId } });
  await prisma.category.deleteMany({ where: { id: ids.categoryId } });
  await prisma.user.deleteMany({ where: { id: ids.customerId } });
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
