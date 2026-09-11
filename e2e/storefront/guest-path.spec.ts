import { test, expect, type Page } from "@playwright/test";
import en from "../../messages/en.json";
import fa from "../../messages/fa.json";
import { cleanUpTestCustomers, makeTestCustomer } from "./helpers";

test.afterAll(cleanUpTestCustomers);

// The seed's Microphones shelf and its cheap, deeply stocked lavalier (see prisma/seed.ts),
// so the path never trips the stock-shortfall branch. Catalog names aren't translated, so
// they read the same in both locales; every label around them comes from messages/*.json,
// which is what the page itself renders.
const CATEGORY = { name: "Microphones", slug: "microphones" };
const PRODUCT = { name: "Boya BY-M1 Lavalier Mic", slug: "boya-by-m1-lavalier-mic" };

interface Variant {
  /** English is unprefixed; Farsi lives under /fa (see i18n/routing.ts). */
  prefix: "" | "/fa";
  t: typeof en;
  lang: "en" | "fa";
  dir: "ltr" | "rtl";
  theme: "light" | "dark";
}

const ENGLISH: Variant = { prefix: "", t: en, lang: "en", dir: "ltr", theme: "light" };
const FARSI: Variant = { prefix: "/fa", t: fa, lang: "fa", dir: "rtl", theme: "light" };

/**
 * home → category → product → add to cart → mini-cart → cart → checkout → receipt, as a
 * guest. The locale and the theme are checked after every step rather than once: both live
 * on <html>, and a client-side navigation is exactly what can drop them — the links here
 * are soft navigations, and none of them may fall back to English or to light.
 */
async function walkGuestPath(page: Page, { prefix, t, lang, dir, theme }: Variant) {
  const guest = makeTestCustomer();
  const localized = (path: string) => (path === "/" ? prefix || "/" : prefix + path);

  async function expectAt(path: string) {
    await expect(page).toHaveURL(localized(path));
    const html = page.locator("html");
    await expect(html).toHaveAttribute("lang", lang);
    await expect(html).toHaveAttribute("dir", dir);
    await expect(html).toHaveAttribute("data-theme", theme);
  }

  await page.goto(localized("/"));
  await expectAt("/");

  // The home page's own category shelf, not the header menu.
  await page
    .getByRole("region", { name: t.home.categories.heading })
    .getByRole("link", { name: CATEGORY.name })
    .click();
  await expectAt(`/products?category=${CATEGORY.slug}`);
  await expect(page.getByRole("heading", { level: 1, name: CATEGORY.name })).toBeVisible();

  await page.getByRole("link", { name: PRODUCT.name, exact: true }).click();
  await expectAt(`/products/${PRODUCT.slug}`);
  await expect(page.getByRole("heading", { level: 1, name: PRODUCT.name })).toBeVisible();

  // The "Related" section below can render its own add buttons; the main one is first.
  await page.getByRole("button", { name: t.common.addToCart }).first().click();

  // Adding opens the mini-cart where the customer already is; its link is the way on.
  const miniCart = page.getByRole("dialog", { name: t.cart.title });
  await expect(miniCart.getByText(PRODUCT.name)).toBeVisible();
  await miniCart.getByRole("link", { name: t.cart.viewCart }).click();

  await expectAt("/cart");
  await expect(page.getByText(PRODUCT.name, { exact: true })).toBeVisible();
  await page.getByRole("link", { name: t.cart.checkout }).click();

  await expectAt("/checkout");
  await page.getByLabel(t.checkout.fullName).fill(guest.fullName);
  await page.getByLabel(t.checkout.phone).fill(guest.phone);
  await page.getByLabel(t.checkout.streetAddress).fill("221B Baker Street");
  await page.getByLabel(t.checkout.city).fill("London");
  await page.getByLabel(t.checkout.postalCode).fill("NW1 6XE");
  await page.getByRole("button", { name: t.checkout.placeOrder }).click();

  const receipt = t.orders.confirmation;
  await expectAt("/checkout/confirmation");
  await expect(page.getByRole("heading", { level: 1, name: receipt.heading })).toBeVisible();
  await expect(page.getByText(receipt.guestMessage)).toBeVisible();
  await expect(page.getByText(receipt.totalPaid)).toBeVisible();
}

test.describe("guest path, home to receipt", () => {
  test("in English", async ({ page }) => {
    await walkGuestPath(page, ENGLISH);
  });

  test("in Farsi", async ({ page }) => {
    await walkGuestPath(page, FARSI);
  });

  test("in dark mode", async ({ page }) => {
    // Switched the way a visitor switches it. The toggle stores the choice, so the path
    // then starts from a cold load that has to read it back before first paint.
    await page.goto("/");
    await page.getByRole("button", { name: en.nav.toggleTheme }).click();
    await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");

    await walkGuestPath(page, { ...ENGLISH, theme: "dark" });
  });
});
