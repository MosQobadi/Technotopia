-- Back-in-stock requests from the storefront PDP (see TASKS.md, Task 30.6). One
-- row per request, pending while `notifiedAt` is null. The admin reads a
-- product's pending rows in the Inventory stock modal and stamps them once the
-- people on them have been reached; nothing is sent automatically. The index
-- serves exactly that read. Rows go with their product (CASCADE): a product is
-- only hard-deleted when no order references it.

-- CreateTable
CREATE TABLE "StockNotification" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "contact" TEXT NOT NULL,
    "notifiedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StockNotification_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "StockNotification_productId_notifiedAt_idx" ON "StockNotification"("productId", "notifiedAt");

-- AddForeignKey
ALTER TABLE "StockNotification" ADD CONSTRAINT "StockNotification_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;
