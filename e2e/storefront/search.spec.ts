import { test, expect } from "@playwright/test";

// Seed data (prisma/seed.ts). The brand and the product share a name, so one query
// exercises two of the panel's three result groups — and no seeded category matches
// "Boya", which is what makes the scope assertions below meaningful.
const QUERY = "Boya";
const PRODUCT_NAME = "Boya BY-M1 Lavalier Mic";

test("navbar search suggests matching products and brands, and its results are navigable", async ({
  page,
}) => {
  await page.goto("/");

  const panel = page.getByRole("region", { name: "Search results" });
  await expect(panel).toBeHidden();

  await page.getByRole("searchbox").fill(QUERY);

  const productResult = panel.getByRole("link", { name: PRODUCT_NAME });
  const brandResult = panel.getByRole("link", { name: QUERY, exact: true });
  await expect(productResult).toBeVisible();
  await expect(brandResult).toBeVisible();

  // Narrowing the scope drops the groups it excludes.
  await page.getByLabel("Search scope").selectOption("brands");
  await expect(productResult).toBeHidden();
  await expect(brandResult).toBeVisible();

  // A brand result deep-links into the listing with that brand's filter already applied.
  await brandResult.click();
  await expect(page).toHaveURL(/\/products\?brand=Boya$/);
  await expect(panel).toBeHidden();
  await expect(page.getByRole("checkbox", { name: QUERY })).toBeChecked();
});

test("navbar search says so when nothing matches, and Escape closes the panel", async ({
  page,
}) => {
  await page.goto("/");

  const panel = page.getByRole("region", { name: "Search results" });
  await page.getByRole("searchbox").fill("zzzz-no-such-product");

  await expect(panel.getByText(/No results for/)).toBeVisible();

  await page.getByRole("searchbox").press("Escape");
  await expect(panel).toBeHidden();
});
