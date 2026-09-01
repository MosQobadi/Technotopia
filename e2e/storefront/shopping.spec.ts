import { test, expect } from "@playwright/test";
import { cleanUpTestCustomers, makeTestCustomer, productCard, signUp } from "./helpers";

test.afterAll(cleanUpTestCustomers);

// Cheap, always-in-stock seed product (see prisma/seed.ts) so the flow never trips the
// stock-shortfall path.
const PRODUCT_NAME = "Boya BY-M1 Lavalier Mic";

test("browse a product, add it to cart, and complete checkout", async ({ page }) => {
  await signUp(page, makeTestCustomer());

  await page.getByRole("link", { name: "Shop" }).click();
  await expect(page).toHaveURL(/\/products$/);

  await page.getByRole("link", { name: PRODUCT_NAME, exact: true }).click();
  await expect(page.getByRole("heading", { name: PRODUCT_NAME })).toBeVisible();

  // The "Related" section below can render its own "Add to Cart" buttons; the main one is
  // the first in DOM order, above that section.
  await page.getByRole("button", { name: "Add to Cart" }).first().click();

  await page.getByRole("link", { name: "Cart" }).click();
  await expect(page).toHaveURL(/\/cart$/);
  await expect(page.getByText(PRODUCT_NAME, { exact: true })).toBeVisible();

  await page.getByRole("link", { name: /Checkout/ }).click();
  await expect(page).toHaveURL(/\/checkout$/);

  await page.getByLabel("Street address").fill("221B Baker Street");
  await page.getByLabel("City").fill("London");
  await page.getByLabel("Postal code").fill("NW1 6XE");
  await page.getByRole("button", { name: /Place Order/ }).click();

  await expect(page).toHaveURL(/\/orders\/[^/]+\/confirmation$/);
  await expect(page.getByRole("heading", { name: "Order confirmed" })).toBeVisible();
  await expect(page.getByText("Total paid")).toBeVisible();
});

test("add and remove a wishlist item", async ({ page }) => {
  await signUp(page, makeTestCustomer());

  await page.goto("/products");
  const listingCard = productCard(page, PRODUCT_NAME);
  await listingCard.getByRole("button", { name: "Add to wishlist" }).click();
  await expect(listingCard.getByRole("button", { name: "Remove from wishlist" })).toBeVisible();

  await page.getByRole("link", { name: "Wishlist" }).click();
  await expect(page).toHaveURL(/\/wishlist$/);
  await expect(page.getByRole("link", { name: PRODUCT_NAME, exact: true })).toBeVisible();

  await productCard(page, PRODUCT_NAME)
    .getByRole("button", { name: "Remove from wishlist" })
    .click();
  await expect(page.getByText("You haven't saved anything yet.")).toBeVisible();
});
