import { execFileSync } from "node:child_process";
import { test, expect } from "@playwright/test";
import { cleanUpTestData } from "./cleanup";
import { uniqueSuffix } from "./constants";

interface OrderFixtureIds {
  orderId: string;
  customerId: string;
  categoryId: string;
  brandId: string;
  productId: string;
}

const PREFIX = `e2e-order-${uniqueSuffix()}`;
let fixture: OrderFixtureIds;

test.beforeAll(() => {
  const output = execFileSync(
    "pnpm",
    ["exec", "tsx", "e2e/fixtures/createOrderFixture.ts", PREFIX],
    { encoding: "utf-8", shell: true },
  );
  fixture = JSON.parse(output.trim());
});

test.afterAll(() => {
  cleanUpTestData([PREFIX]);
});

test("advance an order through its full status sequence", async ({ page }) => {
  await page.goto(`/admin/orders/${fixture.orderId}`);

  const statusBadge = page
    .locator("h1", { hasText: /^Order #/ })
    .locator("xpath=following-sibling::*[1]");

  await expect(statusBadge).toHaveText("Pending");
  await expect(page.getByRole("button", { name: "Next Step" })).toBeVisible();

  await page.getByRole("button", { name: "Next Step" }).click();
  await expect(statusBadge).toHaveText("Sending");

  await page.getByRole("button", { name: "Next Step" }).click();
  await expect(statusBadge).toHaveText("Sent");

  await page.getByRole("button", { name: "Next Step" }).click();
  await expect(statusBadge).toHaveText("Delivered");

  await expect(page.getByRole("button", { name: "Next Step" })).not.toBeVisible();
});
