import { test, expect } from "@playwright/test";
import { cleanUpTestCustomers, logIn, logOut, makeTestCustomer, signUp } from "./helpers";

test.afterAll(cleanUpTestCustomers);

const PRODUCT_NAME = 'Roads Ring Light 18"';

test("sign up, place an order, log back in, and see it in order history", async ({ page }) => {
  const customer = makeTestCustomer();
  await signUp(page, customer);

  await page.goto("/products");
  await page.getByRole("link", { name: PRODUCT_NAME, exact: true }).click();
  await expect(page.getByRole("heading", { name: PRODUCT_NAME })).toBeVisible();
  await page.getByRole("button", { name: "Add to Cart" }).first().click();

  await page.goto("/checkout");
  await page.getByLabel("Street address").fill("8 Maple Road");
  await page.getByLabel("City").fill("Bristol");
  await page.getByLabel("Postal code").fill("BS1 5TR");
  await page.getByRole("button", { name: /Place Order/ }).click();
  await expect(page).toHaveURL(/\/orders\/[^/]+\/confirmation$/);

  await logOut(page);
  await page.goto("/");
  // Confirms the logout actually cleared the session before we log back in below.
  await expect(page.getByRole("link", { name: "Account" })).toHaveAttribute("href", "/login");

  await logIn(page, customer.email, customer.password);

  await page.goto("/account");
  await page.getByRole("tab", { name: "Order History" }).click();
  await expect(page.getByText(PRODUCT_NAME, { exact: true })).toBeVisible();
});
