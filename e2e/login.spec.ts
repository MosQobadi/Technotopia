import { test, expect } from "@playwright/test";
import { ADMIN_EMAIL, ADMIN_PASSWORD } from "./constants";

test("admin logs in and lands on the dashboard", async ({ page }) => {
  await page.goto("/admin/login");

  await page.getByLabel("Email").fill(ADMIN_EMAIL);
  await page.getByLabel("Password").fill(ADMIN_PASSWORD);
  await page.getByRole("button", { name: "Login" }).click();

  await expect(page).toHaveURL(/\/admin\/dashboard$/);
  await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible();
  await expect(page.getByText("Total Orders")).toBeVisible();
  await expect(page.getByText("Recent Orders")).toBeVisible();
});

test("rejects an incorrect password", async ({ page }) => {
  await page.goto("/admin/login");

  await page.getByLabel("Email").fill(ADMIN_EMAIL);
  await page.getByLabel("Password").fill("wrong-password");
  await page.getByRole("button", { name: "Login" }).click();

  await expect(page.getByRole("alert")).toBeVisible();
  await expect(page).toHaveURL(/\/admin\/login$/);
});
