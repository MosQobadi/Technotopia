// Run via `tsx` (not imported directly into the Playwright test process — Prisma 7's
// generated client is pure ESM and doesn't survive Playwright's own TS transform).
// Deletes every row whose name/email carries one of the given prefixes, which is how
// each spec tags the data it creates (see `uniqueSuffix()` in e2e/constants.ts).
import "dotenv/config";
import { readFileSync } from "node:fs";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../../lib/generated/prisma/client";

// Prefixes are passed via a file path (not an inline JSON argv) so this survives being
// shelled out to on Windows, where a shell re-parses and mangles quoted CLI args.
const prefixesFilePath = process.argv[2];
if (!prefixesFilePath) throw new Error("Usage: tsx deleteTestData.ts <path-to-prefixes-json>");
const prefixes: string[] = JSON.parse(readFileSync(prefixesFilePath, "utf-8"));
if (prefixes.length === 0) process.exit(0);

const adapter = new PrismaPg(process.env["DATABASE_URL"] as string);
const prisma = new PrismaClient({ adapter });

async function main() {
  // Specs create rows through the UI, so they only know the prefix they typed, not the ids.
  const byName = { OR: prefixes.map((prefix) => ({ name: { contains: prefix } })) };
  const byEmail = { OR: prefixes.map((prefix) => ({ email: { contains: prefix } })) };

  // Order matters: Order -> User and OrderItem -> Product are both onDelete: Restrict, so
  // orders go before their customers and products. Everything else (OrderItem, Inventory,
  // Cart, CartItem, Wishlist, Address) cascades from the row it hangs off.
  await prisma.order.deleteMany({ where: { customer: byEmail } });
  await prisma.user.deleteMany({ where: byEmail });
  await prisma.product.deleteMany({ where: byName });
  await prisma.brand.deleteMany({ where: byName });
  await prisma.category.deleteMany({ where: byName });
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
