-- Rial has no fractional subunit in practical use, so Product.price and the
-- Order/OrderItem monetary fields move from Decimal(10,2) to Integer.
--
-- Log (don't silently drop) any existing value that has a nonzero fractional
-- part before rounding -- that would indicate real data needing manual review.
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT id, subtotal, discount, "shippingCost", tax, total
    FROM "Order"
    WHERE subtotal != ROUND(subtotal)
       OR discount != ROUND(discount)
       OR "shippingCost" != ROUND("shippingCost")
       OR tax != ROUND(tax)
       OR total != ROUND(total)
  LOOP
    RAISE WARNING 'Order % has a non-integer monetary value before rounding: subtotal=%, discount=%, shippingCost=%, tax=%, total=%',
      r.id, r.subtotal, r.discount, r."shippingCost", r.tax, r.total;
  END LOOP;

  FOR r IN
    SELECT id, "priceSnapshot", "lineTotal"
    FROM "OrderItem"
    WHERE "priceSnapshot" != ROUND("priceSnapshot")
       OR "lineTotal" != ROUND("lineTotal")
  LOOP
    RAISE WARNING 'OrderItem % has a non-integer monetary value before rounding: priceSnapshot=%, lineTotal=%',
      r.id, r."priceSnapshot", r."lineTotal";
  END LOOP;

  FOR r IN
    SELECT id, price
    FROM "Product"
    WHERE price != ROUND(price)
  LOOP
    RAISE WARNING 'Product % has a non-integer price before rounding: price=%', r.id, r.price;
  END LOOP;
END $$;

-- AlterTable: cast via ROUND (not truncate) so fractional values round to the nearest Rial.
ALTER TABLE "Order"
  ALTER COLUMN "subtotal" TYPE INTEGER USING ROUND(subtotal)::integer,
  ALTER COLUMN "discount" TYPE INTEGER USING ROUND(discount)::integer,
  ALTER COLUMN "shippingCost" TYPE INTEGER USING ROUND("shippingCost")::integer,
  ALTER COLUMN "tax" TYPE INTEGER USING ROUND(tax)::integer,
  ALTER COLUMN "total" TYPE INTEGER USING ROUND(total)::integer;

ALTER TABLE "OrderItem"
  ALTER COLUMN "priceSnapshot" TYPE INTEGER USING ROUND("priceSnapshot")::integer,
  ALTER COLUMN "lineTotal" TYPE INTEGER USING ROUND("lineTotal")::integer;

ALTER TABLE "Product"
  ALTER COLUMN "price" TYPE INTEGER USING ROUND(price)::integer;
