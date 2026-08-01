/*
  Warnings:

  - Added the required column `city` to the `Order` table without a default value. This is not possible if the table is not empty.
  - Added the required column `fullName` to the `Order` table without a default value. This is not possible if the table is not empty.
  - Added the required column `paymentMethod` to the `Order` table without a default value. This is not possible if the table is not empty.
  - Added the required column `phone` to the `Order` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "PaymentMethod" AS ENUM ('CARD', 'BANK_TRANSFER');

-- AlterTable (nullable first so existing rows can be backfilled)
ALTER TABLE "Order" ADD COLUMN     "city" TEXT,
ADD COLUMN     "fullName" TEXT,
ADD COLUMN     "paymentMethod" "PaymentMethod",
ADD COLUMN     "phone" TEXT;

-- Backfill existing (pre-checkout-API) orders from their customer record; these predate
-- per-order shipping fields and payment method selection.
UPDATE "Order" o
SET "fullName" = TRIM(u."firstName" || ' ' || u."lastName"),
    "phone" = COALESCE(u."phone", 'unknown'),
    "city" = 'Unknown',
    "paymentMethod" = 'CARD'
FROM "User" u
WHERE u.id = o."customerId";

-- AlterTable (now enforce NOT NULL)
ALTER TABLE "Order" ALTER COLUMN "city" SET NOT NULL,
ALTER COLUMN "fullName" SET NOT NULL,
ALTER COLUMN "paymentMethod" SET NOT NULL,
ALTER COLUMN "phone" SET NOT NULL;
