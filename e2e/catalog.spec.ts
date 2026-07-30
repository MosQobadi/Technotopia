import { test, expect, type Page } from "@playwright/test";
import { uniqueSuffix } from "./constants";

// The HeroUI Select trigger occasionally doesn't register a click as a "press" (it logs
// "A PressResponder was rendered without a pressable child" in the browser console when
// this happens), leaving the popover closed. Retry the click until the option shows up
// rather than fail the whole flow over that flake.
async function selectOption(page: Page, fieldLabel: string, optionName: string) {
  await expect(async () => {
    await page.getByLabel(fieldLabel).click();
    await expect(page.getByRole("option", { name: optionName })).toBeVisible({ timeout: 1000 });
  }).toPass({ timeout: 10_000 });
  await page.getByRole("option", { name: optionName }).click();
}

test("create a category, a brand, and a product using them, then find it in the products list", async ({
  page,
}) => {
  const suffix = uniqueSuffix();
  const categoryName = `E2E Category ${suffix}`;
  const brandName = `E2E Brand ${suffix}`;
  const productName = `E2E Product ${suffix}`;
  const sku = `E2E-${suffix}`.toUpperCase();

  await page.goto("/admin/categories/add");
  await page.getByLabel("Category Name").fill(categoryName);
  await page.getByLabel("Short Description").fill("Short description for E2E category.");
  await page.getByLabel("Long Description").fill("Long description for the E2E test category.");
  await page.getByRole("button", { name: "Save Category" }).click();

  await expect(page).toHaveURL(/\/admin\/categories$/);
  await page.getByRole("searchbox").fill(categoryName);
  await expect(
    page.getByRole("row").filter({ has: page.getByText(categoryName, { exact: true }) }),
  ).toBeVisible();

  await page.goto("/admin/brands/add");
  await page.getByLabel("Brand Name").fill(brandName);
  await page.getByRole("button", { name: "Save Brand" }).click();

  await expect(page).toHaveURL(/\/admin\/brands$/);
  await page.getByRole("searchbox").fill(brandName);
  await expect(
    page.getByRole("row").filter({ has: page.getByText(brandName, { exact: true }) }),
  ).toBeVisible();

  await page.goto("/admin/products/add");
  await page.getByLabel("Product Name").fill(productName);
  await page.getByLabel("SKU").fill(sku);
  await selectOption(page, "Category", categoryName);
  await selectOption(page, "Brand", brandName);
  await page.getByLabel("Short Description").fill("Short description for E2E product.");
  await page.getByLabel("Long Description").fill("Long description for the E2E test product.");
  await page.getByLabel("Price").fill("100");
  await page.getByRole("button", { name: "Save Product" }).click();

  await expect(page).toHaveURL(/\/admin\/products$/);
  await page.getByRole("searchbox").fill(productName);
  const productRow = page
    .getByRole("row")
    .filter({ has: page.getByText(productName, { exact: true }) });
  await expect(productRow).toBeVisible();
  await expect(productRow.getByText(categoryName, { exact: true })).toBeVisible();
  await expect(productRow.getByText(brandName, { exact: true })).toBeVisible();
});
