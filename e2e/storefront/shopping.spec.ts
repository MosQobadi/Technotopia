import { test, expect } from "@playwright/test";
import { cleanUpTestCustomers, makeTestCustomer, productCard, signUp } from "./helpers";

test.afterAll(cleanUpTestCustomers);

// Cheap, always-in-stock seed product (see prisma/seed.ts) so the flow never trips the
// stock-shortfall path.
const PRODUCT_NAME = "Boya BY-M1 Lavalier Mic";

// The cart lives in localStorage, so no account is needed to fill one — only to order.
test("fill a cart while logged out, and keep it across a browser restart", async ({ browser }) => {
  const context = await browser.newContext();
  const page = await context.newPage();

  await page.goto("/products");
  await productCard(page, PRODUCT_NAME).getByRole("button", { name: "Add to Cart" }).click();

  // Adding opens the mini-cart where the customer is already looking; its link is
  // the way to the full page, and the header never navigated on its own.
  await expect(page.getByRole("dialog", { name: "Your Cart" })).toBeVisible();
  await expect(page).toHaveURL(/\/products$/);
  await page.getByRole("link", { name: "View Cart" }).click();
  await expect(page).toHaveURL(/\/cart$/);
  await expect(page.getByText(PRODUCT_NAME, { exact: true })).toBeVisible();

  // One line in the cart, so the stepper's buttons are unambiguous. The header
  // badge is the thing that has to agree with it.
  const cartButton = page.getByRole("button", { name: "Cart" });
  await page.getByRole("button", { name: "Increase quantity" }).click();
  await expect(cartButton).toContainText("2");

  await page.reload();
  await expect(page.getByText(PRODUCT_NAME, { exact: true })).toBeVisible();
  await expect(cartButton).toContainText("2");

  // A restart is a fresh browser reading the same stored state — not a fresh profile.
  const restarted = await browser.newContext({ storageState: await context.storageState() });
  const reopened = await restarted.newPage();
  await reopened.goto("/cart");
  await expect(reopened.getByText(PRODUCT_NAME, { exact: true })).toBeVisible();
  await expect(reopened.getByRole("button", { name: "Cart" })).toContainText("2");

  await reopened.getByRole("button", { name: "Remove item" }).click();
  await expect(reopened.getByText("Your cart is empty.")).toBeVisible();

  await restarted.close();
  await context.close();
});

test("browse a product, add it to cart, and complete checkout", async ({ page }) => {
  await signUp(page, makeTestCustomer());

  // Exact: the home page's category cards read as "<Category> Shop" links too.
  await page.getByRole("link", { name: "Shop", exact: true }).click();
  await expect(page).toHaveURL(/\/products$/);

  await page.getByRole("link", { name: PRODUCT_NAME, exact: true }).click();
  await expect(page.getByRole("heading", { name: PRODUCT_NAME })).toBeVisible();

  // The "Related" section below can render its own "Add to Cart" buttons; the main one is
  // the first in DOM order, above that section.
  await page.getByRole("button", { name: "Add to Cart" }).first().click();

  await page.getByRole("link", { name: "View Cart" }).click();
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

test("check out as a guest, and keep the receipt that is handed over", async ({ page }) => {
  // No account is made. The test customer only lends its suffix-tagged name, which
  // is how cleanup finds a guest order.
  const guest = makeTestCustomer();

  await page.goto("/products");
  await productCard(page, PRODUCT_NAME).getByRole("button", { name: "Add to Cart" }).click();
  await page.getByRole("link", { name: "View Cart" }).click();
  await page.getByRole("link", { name: /Checkout/ }).click();
  await expect(page).toHaveURL(/\/checkout$/);

  // Offered, not required.
  await expect(page.getByRole("link", { name: "Log in", exact: true })).toBeVisible();

  await page.getByLabel("Full name").fill(guest.fullName);
  await page.getByLabel("Phone number").fill(guest.phone);
  await page.getByLabel("Street address").fill("221B Baker Street");
  await page.getByLabel("City").fill("London");
  await page.getByLabel("Postal code").fill("NW1 6XE");
  await page.getByRole("button", { name: /Place Order/ }).click();

  await expect(page).toHaveURL(/\/checkout\/confirmation$/);
  await expect(page.getByRole("heading", { name: "Order confirmed" })).toBeVisible();
  await expect(page.getByText("Total paid")).toBeVisible();
  // Nothing to track the order with, so no link to a page that would 404.
  await expect(page.getByRole("link", { name: "Track order" })).toHaveCount(0);

  // The receipt survives a reload of its own tab, and the cart it came from is gone.
  await page.reload();
  await expect(page.getByRole("heading", { name: "Order confirmed" })).toBeVisible();
  await page.goto("/cart");
  await expect(page.getByText("Your cart is empty.")).toBeVisible();
});

test("signing in from checkout comes back to checkout, details filled in", async ({ page }) => {
  const customer = makeTestCustomer();

  await page.goto("/products");
  await productCard(page, PRODUCT_NAME).getByRole("button", { name: "Add to Cart" }).click();
  await page.goto("/checkout");

  await page.getByRole("link", { name: "Log in", exact: true }).click();
  await expect(page).toHaveURL(/\/login\?next=%2Fcheckout$/);
  await page.getByRole("tab", { name: "Sign Up" }).click();
  await page.getByLabel("Full Name").fill(customer.fullName);
  await page.getByLabel("Email").fill(customer.email);
  await page.getByLabel("Phone Number").fill(customer.phone);
  await page.getByLabel("Password").fill(customer.password);
  await page.getByRole("button", { name: "Create Account" }).click();

  // The cart lives in the browser, so it was waiting on this side of the login.
  await expect(page).toHaveURL(/\/checkout$/);
  await expect(page.getByLabel("Full name")).toHaveValue(customer.fullName);
  await expect(page.getByRole("link", { name: "Log in", exact: true })).toHaveCount(0);
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
