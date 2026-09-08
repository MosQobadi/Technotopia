-- The cart moved into the browser (see TASKS.md, Task 30.1): a visitor has to be
-- able to fill one without an account, and a second server-side cart alongside it
-- would mean two sources of truth and a merge rule to keep them honest. Existing
-- rows are dropped with the tables.

-- DropForeignKey
ALTER TABLE "Cart" DROP CONSTRAINT "Cart_userId_fkey";

-- DropForeignKey
ALTER TABLE "CartItem" DROP CONSTRAINT "CartItem_cartId_fkey";

-- DropForeignKey
ALTER TABLE "CartItem" DROP CONSTRAINT "CartItem_productId_fkey";

-- DropTable
DROP TABLE "Cart";

-- DropTable
DROP TABLE "CartItem";

