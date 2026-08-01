# Technotopia Storefront — Final Task List (Phases 15–25)

Continues from admin (Phases 0–12, 12B, 12C — done). This file replaces both
`technotopia-storefront-tasks-v2.md` and `technotopia-storefront-and-deployment-tasks.md` —
use only this one from now on.

## How to use the `.dc.html` reference files

Copy all `.dc.html` files into `/design/storefront/` in your repo (skip `support.js`). Add a
line to `CLAUDE.md` pointing at that folder. When a task says "per `X.dc.html`," Claude Code
reads it from `design/storefront/x.dc.html` directly — reproduce the visual design and
interaction using real React/Tailwind/HeroUI, not the prototype's `sc-if`/`sc-for`/
`DCLogic`/inline styles.

---

## Phase 15 — Storefront Foundations

### Task 15.1 — Extend Prisma schema
**Prompt:**
```
Extend prisma/schema.prisma: Product gets `slug` (unique, auto-generated from name),
`isFeatured` (Boolean, default false), `salesCount` (Int, default 0, incremented on
DELIVERED). Category gets `isFeatured` (Boolean, default false). Add Banner (id, image,
headline, subheadline, link, displayOrder, status), Address (id, userId FK, fullName, phone,
addressLine, city, postalCode, isDefault), Cart (id, userId FK unique), CartItem (id, cartId
FK, productId FK, quantity), Wishlist (id, userId FK, productId FK, unique on
[userId, productId]). Migrate.
```

### Task 15.2 — Design tokens → Tailwind theme + HeroUI config
**DoD:** A demo page renders the button variants, price tag, and a product card using only the theme, not one-off hex/oklch values in component code.
**Prompt:**
```
Configure the Tailwind theme and HeroUI provider to match the approved design system
(technotopia-design-system-v2.dc.html). Register these as named tokens, not inline values:

Colors (oklch):
- ink-900: oklch(0.19 0 0) — headings, nav text
- accent (signal blue): oklch(0.58 0.2 258), accent-hover: oklch(0.5 0.23 258) — CTAs and
  links ONLY, nothing else uses this color
- surface-100: oklch(0.96 0.002 240) — card/product-tray fill
- surface-200: oklch(0.94 0.002 240) — image placeholder fill
- gray-500: oklch(0.55 0 0) — body copy
- border: oklch(0.9-0.94 0 0) range — hairline borders on inputs/dividers only
- success: oklch(0.55-0.62 0.16-0.17 148) — in stock / delivered
- warning: oklch(0.6-0.75 0.17 80) — low stock / shipped-in-progress
- error/discount: oklch(0.55-0.6 0.21-0.2 25) — out of stock, discount badges

Typography: Plus Jakarta Sans (400/500/600/700/800) as the primary sans, loaded via
next/font — weight 800 for all headings/hero text with tight letter-spacing (-0.015em to
-0.02em), 400/500 for body copy. IBM Plex Mono (500/600) as a secondary accent font used
ONLY for: eyebrow/category labels, SKU/spec tags, prices' secondary text, mono badges —
never for headings or body paragraphs.

Shape/elevation rules: buttons and pill controls use fully-rounded (radius 999px) corners.
Cards and product trays use large radius (18-24px), NO border, NO box-shadow — depth comes
from the surface-100 gray fill against the white page background, not elevation.

Signature motif: a small filled colored dot precedes every eyebrow/section label. Build this
as part of the shared SectionEyebrow component (Task 15.5), not repeated ad hoc.

Focus states: 2px solid accent outline, 2px offset, on every interactive element — carry it
into the Tailwind/HeroUI config globally rather than per-component.
```

### Task 15.3 — Currency formatting utility
**DoD:** Skip if `lib/format.ts` already exists from admin Task 12C.2 — just confirm it.
**Prompt:**
```
Confirm lib/format.ts exists with formatPrice(amountInRial: number) using
Intl.NumberFormat('fa-IR') plus the Rial symbol (built in admin Task 12C.2). If it doesn't
exist yet, create it now. This is the only place currency formatting logic lives — every
storefront component displaying a price imports this rather than formatting inline.
```

### Task 15.4 — Layout shells: full Navbar, minimal Header, Footer
**DoD:** Three components, used consistently per the page-by-page assignment below.
**Prompt:**
```
Build three layout components per the reference files:

1. components/storefront/Navbar.tsx (full nav) — per the header markup repeated in
   Cart.dc.html, My Account.dc.html, Product Detail.dc.html, Product Listing.dc.html,
   Wishlist.dc.html, Home.dc.html: logo (dot + "Technotopia" wordmark) linking home, nav
   links (Home/Shop/Categories), a search bar combining a scope <select> (All/Products/
   Categories/Brands) with a text input and a circular submit button, a wishlist icon
   button, a cart icon button with an item-count badge (bound to the cart store from 15.7),
   and a circular account-initial avatar button linking to /account (or /login if logged
   out). Sticky on scroll.

2. components/storefront/MinimalHeader.tsx — per Checkout.dc.html, Login and Sign
   Up.dc.html, Order Confirmation.dc.html, Order Tracking.dc.html: just the logo, no nav
   links, no search, no icons.

3. components/storefront/Footer.tsx — build as the RICH version shown in Home.dc.html:
   4-column grid (brand block, Shop category links, Support links including Track an order,
   Visit/address), plus a bottom bar with copyright + Privacy/Terms links. Use this ONE
   Footer everywhere it applies below.

Page → shell assignment:
- Full Navbar + Footer: Home, Cart, Product Detail, Product Listing, Wishlist
- Full Navbar, no Footer: My Account
- Minimal Header, no Footer: Checkout, Login/Sign Up, Order Confirmation, Order Tracking
```

### Task 15.5 — Shared UI primitives
**DoD:** Every screen task below composes these rather than writing one-off markup.
**Prompt:**
```
Build these shared components in components/storefront/ui/, matching
technotopia-design-system-v2.dc.html's "Applied to core components" section exactly:

- Button — 5 variants: primary, secondary, accent-outline, icon-circle, disabled.
- PriceTag — current price bold, optional strikethrough original price, optional discount
  percentage badge, and an "IN STOCK" mono status variant.
- SectionEyebrow — colored dot + uppercase mono label, used before every section heading.
- StatusBadge — two variants: colored dot + mono text for stock status (green/orange/red),
  and a separate pill for order status (green=Delivered, accent-blue=Shipped,
  orange=Processing) — don't merge these.
- Tabs — pill-shaped segmented control, used by Login/Sign Up and My Account.
- QuantityStepper — pill with −/value/+ buttons.
- Breadcrumb — small gray text with "/" separators.
- EmptyState — centered surface-100 card, message + primary button.
- ProductCard — surface-100 card, square image with wishlist-heart top-right and an
  optional status/discount/rank badge top-left, eyebrow, name, PriceTag, full-width "Add to
  Cart" button. The single most-reused component in the app — get it right once here.
```

### Task 15.6 — Customer auth (single page, tab-toggled)
**DoD:** One route, client-side tab state — not two separate pages.
**Prompt:**
```
Per Login and Sign Up.dc.html, build ONE page (app/(storefront)/login/page.tsx) containing
both Login and Sign Up forms behind the Tabs component (15.5) — client-side state toggles
which form shows (no separate /signup route). Login: email, password, "Forgot password?"
link. Sign Up: full name, email, password, Terms/Privacy text. Wire to two separate API
endpoints (POST /api/storefront/auth/login and /signup). React Hook Form + Zod for both.
```

### Task 15.7 — Cart store + API
**Prompt:**
```
Per Cart.dc.html: Zustand cart store + API routes (GET /api/storefront/cart,
POST/PATCH/DELETE on cart items) — inline quantity +/− per line, remove (✕) button, sticky
order summary (Subtotal/Shipping/Total, shipping flat-rate when subtotal > 0 else "Free"),
EmptyState (15.5) when empty. Use formatPrice (15.3) for every amount.
```

### Task 15.8 — Wishlist API
**Prompt:**
```
Per Wishlist.dc.html: wishlist API (GET/POST/DELETE), wire the heart-icon toggle on
ProductCard. Empty state uses EmptyState, "Browse products" → listing page.
```

---

## Phase 16 — Home Page

### Task 16.1 — Home data API
**DoD:** Best Sellers reuses Task 17.1's endpoint, not a second bespoke one.
**Prompt:**
```
GET /api/storefront/home: up to 3 active Banners in displayOrder (tag/headline/subcopy/CTA
per Home.dc.html's hero slides), up to 10 featured products (isFeatured=true) for The Stars
with discount fields only present when discountPercent > 0. Best Sellers on the Home page
reuses GET /api/storefront/products?sort=sold&pageSize=10 (Task 17.1) — confirm 17.1 exists
first or stub the call.
```

### Task 16.2 — Home page UI
**DoD:** Stars expand/collapse and hero rotation work without reload; blank section is genuinely empty.
**Prompt:**
```
Build the Home page per Home.dc.html:

- Hero: auto-rotating carousel (6s, clean up interval on unmount), surface-100 background
  (the one non-white section). Eyebrow + dot, headline (48px/800), subcopy, CTA. Prev/next
  arrows, dot indicators (active = wider + accent), clicking a dot jumps to that slide.
- The Stars: SectionEyebrow + heading, ProductCard grid (4 by default), "Show More"/
  "Show Less" button toggling 4↔10 — client-side state, one section not two views. Discount
  badge only shown when the product actually has one.
- Blank section: empty spacer, no placeholder text, no border, aria-hidden — genuinely
  empty, matching the approved design exactly.
- Best Sellers: SectionEyebrow + heading, category filter CHIPS (different UI than Product
  Listing's sidebar checkboxes — intentional, don't unify), brand + sort dropdowns (sort
  defaults "Most Sold"), ProductCard grid with a "#{rank} SOLD" badge instead of a discount
  badge. Empty filtered result shows plain text, no button.

Use Navbar + rich Footer (15.4).
```

---

## Phase 17 — Product Listing

### Task 17.1 — Listing + search API
**Prompt:**
```
GET /api/storefront/products with ?category=&brand=&maxPrice=&status=
&sort=(sold|priceAsc|priceDesc|new)&search=&page=&pageSize=, defaulting sort to `sold`
(Product.salesCount desc). GET /api/storefront/search?scope=&q= for the navbar's global
search from Task 15.4.
```

### Task 17.2 — Listing page UI
**Prompt:**
```
Per Product Listing.dc.html: breadcrumb, title bound to active category, sticky left filter
sidebar (Category as text-button list, Brand as checkboxes, Price as a range slider showing
"Up to {formatPrice(maxPrice)}", Status as checkboxes), ProductCard grid with results-count
label and sort dropdown above it. Empty results: plain centered text, no CTA (not
EmptyState). Navbar + Footer per 15.4.
```

---

## Phase 18 — Product Detail

### Task 18.1 — Product detail API (by slug)
**Prompt:**
```
GET /api/storefront/products/[slug] — related products (same category, excluding self,
limit 4). 404 on unknown slug.
```

### Task 18.2 — Product detail page UI
**Prompt:**
```
Per Product Detail.dc.html: breadcrumb, image gallery (active image + clickable thumbnail
row), category/brand eyebrow, title, PriceTag with discount, StatusBadge (stock variant),
mono spec-tag pills from Product.tags, QuantityStepper with live subtotal, Add to Cart +
wishlist icon-circle side by side, description, "Related" section (SectionEyebrow +
ProductCard grid). generateMetadata + JSON-LD Product structured data (raw numeric IRR
price, not the formatted string).
```

---

## Phase 19 — Cart & Checkout

### Task 19.1 — Order creation API
**Prompt:**
```
POST /api/storefront/orders per Checkout.dc.html: shipping address (full name, phone,
street address, city, postal code) + payment method selection (confirm "Credit/debit card"
+ "Bank transfer" still matches your actual payment plan — payment integration itself is a
separate future task). Transaction: verify stock, create Order + OrderItems with snapshots,
decrement Inventory, clear cart. Return order id for redirect to confirmation.
```

### Task 19.2 — Checkout page UI
**Prompt:**
```
Per Checkout.dc.html: two-column — shipping address form + payment method as selectable
cards (highlighted background on selection, not plain radios), left; sticky Order Summary
(line items, Subtotal/Shipping/Total, "Place Order" button), right. MinimalHeader, no
Footer. React Hook Form + Zod.
```

---

## Phase 20 — Order Confirmation + Order Tracking

### Task 20.1 — Order confirmation page
**Prompt:**
```
Per Order Confirmation.dc.html: centered success layout — icon, "Order confirmed" heading,
message, summary card (order number, estimated delivery, total paid), "Track order" +
"Continue shopping" buttons. MinimalHeader, no Footer.
```

### Task 20.2 — Order tracking page
**Prompt:**
```
Per Order Tracking.dc.html: order number + date in mono, horizontal step tracker (Order
Placed → Processing → Shipped → Out for Delivery → Delivered) with connecting lines,
checkmarked completed steps, timestamped history log below. Scope to the logged-in
customer's own orders only — verify ownership server-side. MinimalHeader, no Footer.
```

---

## Phase 21 — Wishlist Page

### Task 21.1 — Wishlist page UI
**Prompt:**
```
Per Wishlist.dc.html: EmptyState (15.5) when empty, otherwise ProductCard grid where each
card's primary action is "Add to Cart" and a ✕ (not a heart) removes the item. Full Navbar
+ Footer.
```

---

## Phase 22 — My Account

### Task 22.1 — Account API
**Prompt:**
```
app/api/storefront/account/: GET/PATCH /profile, GET/POST/PATCH/DELETE /addresses (with
isDefault handling — setting one default unsets any previous). Scoped to the logged-in
user only.
```

### Task 22.2 — My Account page UI
**Prompt:**
```
Per My Account.dc.html: Tabs (15.5) for Profile / Order History / Addresses.
- Profile: 2-column form grid, "Save changes" button.
- Order History: cards (order number + date in mono, items summary, total, status pill via
  StatusBadge's order-status variant).
- Addresses: 2-column card grid + "+ Add address" button.
Full Navbar, no Footer.
```

---

## Phase 23 — SEO & Performance Pass

*(Do this as its own pass after Phases 16–22 exist.)*

### Task 23.1 — Metadata audit
**Prompt:**
```
Confirm generateMetadata on every storefront route with a real title/description: Home,
Product Listing (dynamic by category/search), Product Detail (per-product),
Cart/Checkout (simple/static). Add a fallback in the storefront layout for anything missing.
```

### Task 23.2 — Structured data
**Prompt:**
```
JSON-LD: Product schema on product detail (if not done in 18.2, priceCurrency: "IRR"),
BreadcrumbList on product/category pages, Organization schema in the root layout.
```

### Task 23.3 — Sitemap + robots.txt
**Prompt:**
```
app/sitemap.ts: every active product (by slug) and category (by slug), plus static routes.
app/robots.ts: allow storefront routes, disallow /admin, /api, /cart, /checkout, /account.
```

### Task 23.4 — Image + font audit
**Prompt:**
```
Confirm next/image everywhere (no raw <img>), meaningful alt text, hero image has priority
set, next/font used for all custom fonts with no layout shift.
```

### Task 23.5 — Caching / ISR
**Prompt:**
```
Add revalidate (e.g. 300s) to Home, Product Listing, Product Detail. Confirm
Cart/Checkout/Account stay fully dynamic — no caching, they're per-user.
```

---

## Phase 24 — Testing & Hardening

### Task 24.1 — E2E happy paths
**Prompt:**
```
Extend the Playwright suite from admin Task 13.1 (technotopia-claude-code-tasks.md) with:
browse → add to cart → checkout → confirmation; add/remove wishlist item; navbar search
across all scopes; sign up → login → account → order history.
```

### Task 24.2 — Security & correctness pass
**Prompt:**
```
Confirm order creation can't oversell stock under concurrent requests (test two
near-simultaneous requests against low stock); a customer can't view/modify another
customer's orders, addresses, or cart via URL id manipulation; all storefront routes
validate input server-side with Zod.
```

---

## Phase 25 — Real Deployment: ArvanCloud

*One deployment, done once, after Phases 0–24 are complete and verified locally.*

### Task 25.1 — Production Dockerfile
**Prompt:**
```
Add `output: 'standalone'` to next.config. Multi-stage Dockerfile: deps (pnpm install),
build (pnpm build), runner (standalone output + static + public, non-root user, EXPOSE
3000, CMD node server.js). Add .dockerignore.
```

### Task 25.2 — docker-compose for ArvanCloud
**DoD:** Decide upfront: self-hosted Postgres container, or ArvanCloud Managed Database.
**Prompt:**
```
docker-compose.prod.yml: app service + nginx service. Postgres: [CHOOSE ONE — ArvanCloud
Managed Database (omit a postgres service, point DATABASE_URL at it), or self-hosted
postgres:16 with a named volume, not exposed publicly]. App service runs
`prisma migrate deploy` on start before serving traffic.
```

### Task 25.3 — Nginx reverse proxy config
**Prompt:**
```
nginx.conf proxying to the app on port 3000: gzip, security headers (X-Frame-Options,
X-Content-Type-Options, Referrer-Policy), HTTP block for certbot ACME challenge + redirect
to HTTPS, HTTPS block ready for a cert.
```

### Task 25.4 — ArvanCloud deployment runbook
**Prompt:**
```
DEPLOYMENT.md: creating an ArvanCloud Cloud Server (Ubuntu), installing Docker + Compose,
firewall rules (80/443/22 only), non-root deploy user, cloning the repo, production .env
values, certbot certificate, `docker compose -f docker-compose.prod.yml up -d --build`,
redeploy procedure (pull/rebuild/migrate/restart). Document Object Storage bucket setup too
if product images go there instead of local disk.
```

### Task 25.5 — Go-live checklist
**Prompt:**
```
Before pointing the domain here: confirm Phase 23 (SEO) is done, run the E2E suite (24.1)
against the production build, confirm no dev/test secrets leak into env vars, confirm the
admin password isn't a seed/default value, confirm backups are configured for whichever
Postgres setup was chosen in 25.2.
```
