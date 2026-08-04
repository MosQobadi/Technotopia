import { test, expect } from "@playwright/test";
import { logOut, makeTestCustomer, signUp } from "./helpers";

// Cheap, always-in-stock seed product (see prisma/seed.ts) — same one shopping.spec.ts uses,
// so this flow never trips the stock-shortfall path.
const PRODUCT_NAME = "Boya BY-M1 Lavalier Mic";

test("a customer can't view another customer's order by guessing/reusing its URL id", async ({
  page,
}) => {
  // Customer A places an order and lands on its confirmation page.
  await signUp(page, makeTestCustomer());

  await page.goto("/products");
  await page.getByRole("link", { name: PRODUCT_NAME, exact: true }).click();
  await page.getByRole("button", { name: "Add to Cart" }).first().click();

  await page.goto("/checkout");
  await page.getByLabel("Street address").fill("221B Baker Street");
  await page.getByLabel("City").fill("London");
  await page.getByLabel("Postal code").fill("NW1 6XE");
  await page.getByRole("button", { name: /Place Order/ }).click();
  await expect(page).toHaveURL(/\/orders\/[^/]+\/confirmation$/);

  const orderUrl = page.url();
  const orderId = new URL(orderUrl).pathname.split("/")[2];

  // Customer B logs in as a different account and tries the same order URLs directly.
  await logOut(page);
  await signUp(page, makeTestCustomer());

  const confirmationResponse = await page.goto(`/orders/${orderId}/confirmation`);
  expect(confirmationResponse?.status()).toBe(404);

  const trackingResponse = await page.goto(`/orders/${orderId}/tracking`);
  expect(trackingResponse?.status()).toBe(404);
});
