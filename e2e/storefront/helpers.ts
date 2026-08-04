import { expect, type Page } from "@playwright/test";
import { uniqueSuffix } from "../constants";

export interface TestCustomer {
  fullName: string;
  email: string;
  phone: string;
  password: string;
}

export function makeTestCustomer(): TestCustomer {
  const suffix = uniqueSuffix();
  return {
    fullName: `E2E Customer ${suffix}`,
    email: `e2e-customer-${suffix}@example.com`,
    phone: `+44 7700 ${suffix}`,
    password: "password123",
  };
}

/** Fills the storefront's tab-toggled auth page and leaves the customer logged in on "/". */
export async function signUp(page: Page, customer: TestCustomer) {
  await page.goto("/login");
  await page.getByRole("tab", { name: "Sign Up" }).click();
  await page.getByLabel("Full Name").fill(customer.fullName);
  await page.getByLabel("Email").fill(customer.email);
  await page.getByLabel("Phone Number").fill(customer.phone);
  await page.getByLabel("Password").fill(customer.password);
  await page.getByRole("button", { name: "Create Account" }).click();
  await expect(page).toHaveURL("/");
}

export async function logIn(page: Page, identifier: string, password: string) {
  await page.goto("/login");
  await page.getByLabel("Email or Phone").fill(identifier);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Login" }).click();
  await expect(page).toHaveURL("/");
}

/**
 * There's no logout control in the storefront UI (only the admin login page has one), so
 * clearing the session between the "sign up" and "log in" halves of a flow goes through the
 * shared cookie-clearing endpoint directly instead.
 */
export async function logOut(page: Page) {
  await page.request.post("/api/auth/logout");
}

/**
 * Scopes to a single ProductCard by walking up from its (uniquely-named) title link, so
 * assertions don't collide with same-named buttons on other cards in the same grid.
 */
export function productCard(page: Page, name: string) {
  return page.getByRole("link", { name, exact: true }).locator("xpath=../..");
}
