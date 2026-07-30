import { test as setup, expect } from "@playwright/test";
import { ADMIN_EMAIL, ADMIN_PASSWORD, STORAGE_STATE_PATH } from "./constants";

setup("authenticate as admin", async ({ page }) => {
  await page.goto("/admin/login");
  await page.getByLabel("Email").fill(ADMIN_EMAIL);
  await page.getByLabel("Password").fill(ADMIN_PASSWORD);
  await page.getByRole("button", { name: "Login" }).click();

  await expect(page).toHaveURL(/\/admin\/dashboard$/);
  await page.context().storageState({ path: STORAGE_STATE_PATH });
});
