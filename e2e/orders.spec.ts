import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test, expect } from "@playwright/test";
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
let tmpDir: string;

test.beforeAll(() => {
  const output = execFileSync(
    "pnpm",
    ["exec", "tsx", "e2e/fixtures/createOrderFixture.ts", PREFIX],
    { encoding: "utf-8", shell: true },
  );
  fixture = JSON.parse(output.trim());
});

test.afterAll(() => {
  tmpDir = mkdtempSync(join(tmpdir(), "technotopia-e2e-"));
  const idsFilePath = join(tmpDir, "order-fixture-ids.json");
  writeFileSync(idsFilePath, JSON.stringify(fixture));
  try {
    execFileSync("pnpm", ["exec", "tsx", "e2e/fixtures/deleteOrderFixture.ts", idsFilePath], {
      shell: true,
    });
  } finally {
    rmSync(tmpDir, { recursive: true, force: true });
  }
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
