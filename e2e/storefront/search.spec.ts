import { test, expect } from "@playwright/test";

// The navbar's scoped search (All/Products/Categories/Brands) is UI-only right now — its
// submit handler is a no-op (see the comment in components/storefront/Navbar.tsx) even
// though the backing GET /api/storefront/search?scope=&q= endpoint already exists and is
// tested (app/api/storefront/search/search.routes.test.ts). There's no results page to
// navigate to yet, so this is fixme'd rather than asserting on a page that doesn't exist.
// Un-skip once the navbar submit is wired to a real results page.
test.fixme(
  "navbar search finds results across all scopes",
  async ({ page }) => {
    await page.goto("/");

    await page.getByLabel("Search").fill("camera");
    await page.getByLabel("Search").press("Enter");
    await expect(page).toHaveURL(/search/);
    await expect(page.getByText(/camera/i).first()).toBeVisible();

    await page.getByLabel("Search scope").selectOption("Brands");
    await page.getByLabel("Search").fill("Sony");
    await page.getByLabel("Search").press("Enter");
    await expect(page.getByText("Sony").first()).toBeVisible();
  },
);
