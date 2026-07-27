import { test, expect } from "@playwright/test";

const PRODUCT_NAME = "Sony Alpha 7 IV";
// Product is the row header (not a plain gridcell) for this table, so it's excluded
// from a `gridcell`-role query — the remaining gridcells are Category, Brand, Stock, ...
const STOCK_COLUMN_INDEX = 2;
const ADD_AMOUNT = 7;

test("edit a product's stock via Inventory and see the list update", async ({ page }) => {
  await page.goto("/admin/inventory");

  await page.getByRole("searchbox").fill(PRODUCT_NAME);
  const row = page.getByRole("row").filter({ has: page.getByText(PRODUCT_NAME, { exact: true }) });
  await expect(row).toBeVisible();

  const stockCell = row.getByRole("gridcell").nth(STOCK_COLUMN_INDEX);
  const currentStock = Number(await stockCell.textContent());
  expect(Number.isFinite(currentStock)).toBe(true);
  const expectedStock = currentStock + ADD_AMOUNT;

  await row.getByRole("button", { name: "Edit" }).click();
  await expect(page.getByRole("heading", { name: "Edit Stock" })).toBeVisible();

  await page.getByLabel("Add Stock").fill(String(ADD_AMOUNT));
  await expect(page.getByText(`New Total: ${expectedStock}`)).toBeVisible();
  await page.getByRole("button", { name: "Save" }).click();

  await expect(page.getByRole("heading", { name: "Edit Stock" })).not.toBeVisible();
  await expect(stockCell).toHaveText(String(expectedStock));
});
