-- A guest checkout has no account behind it (see TASKS.md, Task 30.4), so the
-- customer FK becomes nullable and the order row carries the one contact detail
-- it did not already hold: `fullName` and `phone` are on every order from the
-- checkout form, the email is not. The foreign key itself is unchanged — the
-- schema pins `onDelete: Restrict`, so the relation keeps the RESTRICT it had
-- while required. Existing orders all have a customer and are untouched.

-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "guestEmail" TEXT,
ALTER COLUMN "customerId" DROP NOT NULL;
