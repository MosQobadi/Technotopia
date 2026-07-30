# Technotopia Storefront + Deployment — Claude Code Task List (Part 2)

Continues directly from `technotopia-claude-code-tasks.md`, after Phase 12 (Dashboard real
data). The Phase 14 "Dockerization & Deployment" section in that original file is now
**superseded by Phase 25 below**, which targets ArvanCloud specifically instead of a generic
Ubuntu VPS. Everything else from Part 1 (Phases 0–12) stands as-is.

Reference wireframe: `technotopia-full-v1.excalidraw`, storefront section (Login, Sign Up,
Home, Product Listing, Product Detail, Cart, Checkout, Order Confirmation, Wishlist, My
Account, Order Details).

Same rules as Part 1: one task = one Claude Code session, check the DoD yourself, commit
before moving on.

---

## Phase 15 — Storefront Foundations

### Task 15.1 — Extend Prisma schema for storefront
**DoD:** Migration applies cleanly; every new model has the same id/timestamp conventions as Part 1.
**Prompt:**
```
Extend prisma/schema.prisma with what the storefront needs that the admin-only schema
doesn't have yet:

- Product: add `slug` (unique String, for clean URLs — auto-generate from name like
  Category/Brand already do), `isFeatured` (Boolean, default false — powers the "Stars"
  section), `salesCount` (Int, default 0 — denormalized counter for "Most Sold" sorting,
  incremented when an order reaches DELIVERED, not on order creation).
- Category: add `isFeatured` (Boolean, default false — powers homepage category cards).
- Banner: id, image, headline, subheadline, link, displayOrder (Int), status (ACTIVE/INACTIVE).
- Address: id, userId (FK), fullName, phone, addressLine, city, postalCode, isDefault (Boolean).
- Cart: id, userId (FK, unique) — one cart per user.
- CartItem: id, cartId (FK), productId (FK), quantity.
- Wishlist: id, userId (FK), productId (FK), unique constraint on (userId, productId).

Run the migration and confirm it applies without touching existing admin data.
```

### Task 15.2 — Customer auth (Sign Up + Login)
**DoD:** Customers can register and log in; role stays CUSTOMER; admin login (Task 2.2) untouched.
**Prompt:**
```
Implement customer-facing auth per the "Storefront - Login" and "Storefront - Sign Up"
frames: POST /api/storefront/auth/signup (name, email, phone, password — creates a User
with role CUSTOMER), POST /api/storefront/auth/login (reuses the same JWT/cookie mechanism
as admin login but does NOT require ADMIN role — reject nothing based on role here, just
authenticate). Build the /login and /signup pages with React Hook Form + Zod, matching the
wireframe fields. Do not touch or reuse the admin login route — keep them separate even
though the underlying auth utilities (Task 2.1) are shared.
```

### Task 15.3 — Storefront shell (navbar)
**DoD:** One reusable component used by every storefront page; scoped search dropdown works (UI only for now — wiring to real search comes in 17.1).
**Prompt:**
```
Build components/storefront/Navbar.tsx per the shared top navbar shown in every storefront
frame: logo, nav links (Home/Shop/Categories), a scope dropdown (All / Products / Categories
/ Brands) next to a search input, a wishlist icon, a cart icon with an item-count badge, and
an account icon linking to /account (or /login if logged out). Wire the cart badge count to
the Zustand cart store (built in 15.4). Use this component in the layout for every
storefront route — don't rebuild it per page.
```

### Task 15.4 — Cart store + API
**DoD:** Cart persists across sessions for logged-in users; guest additions merge into the DB cart on login.
**Prompt:**
```
Build a Zustand cart store (client-side optimistic state) backed by these API routes:
GET /api/storefront/cart, POST /api/storefront/cart/items ({productId, quantity}),
PATCH /api/storefront/cart/items/:id ({quantity}), DELETE /api/storefront/cart/items/:id.
For a logged-in user these read/write the Cart/CartItem tables. For a guest (not logged in),
keep the cart in Zustand only (no DB write) and merge it into their DB cart the moment they
log in. Validate stock availability (compare against Inventory) before allowing a quantity
increase.
```

### Task 15.5 — Wishlist API
**DoD:** Toggling the heart icon on a product card reflects immediately without a page reload.
**Prompt:**
```
Implement app/api/storefront/wishlist/ route handlers: GET / (list current user's wishlist
with product details), POST / ({productId}), DELETE /:productId. Requires login — redirect
to /login if unauthenticated. Add a useWishlist hook or Zustand slice so ProductCard's heart
icon can toggle state optimistically.
```

---

## Phase 16 — Storefront: Home Page

### Task 16.1 — Home page data API
**Prompt:**
```
Implement GET /api/storefront/home returning: active banners (ordered by displayOrder),
featured products for "The Stars" (Product where isFeatured=true, limit 10), and best
sellers (Product ordered by salesCount desc, limit 10, respecting current filter params if
any are passed). Keep this endpoint fast — this is the page most visitors land on first.
```

### Task 16.2 — Home page UI
**DoD:** Matches the "Storefront - Home" frame; Stars section starts collapsed at 4 cards.
**Prompt:**
```
Build the storefront home page per the "Storefront - Home" frame in
technotopia-full-v1.excalidraw: hero banner (carousel if more than one active Banner exists,
otherwise a single static banner), "The Stars" section showing 4 featured products with a
"Show More" button that expands to all (up to 10) with a "Show Less" button to collapse back
— this is a client-side expand/collapse, not a navigation. Leave the section below Stars
empty (labeled or just blank space — matches the wireframe's intentionally blank section).
Then "Best Sellers": product grid sorted by salesCount desc by default, with category/brand
filters and a sort dropdown, plus a search-within-results box. Use the shared ProductCard
component (build one now if it doesn't exist yet, since Product Listing and Product Detail's
"related products" will reuse it).
```

---

## Phase 17 — Storefront: Product Listing / Category Page

### Task 17.1 — Listing API (also powers navbar search)
**Prompt:**
```
Implement GET /api/storefront/products with ?search=&category=&brand=&minPrice=&maxPrice=
&status=&sort=(price_asc|price_desc|most_sold|newest)&page=&pageSize=. Also implement
GET /api/storefront/search?scope=(all|products|categories|brands)&q= for the navbar's
global scoped search, returning a small grouped result set (a few of each matching type when
scope=all). Both endpoints should be reasonably fast on a catalog of a few thousand products
— add appropriate Prisma indexes if query plans look slow.
```

### Task 17.2 — Listing page UI
**Prompt:**
```
Build the product listing/category page per the "Storefront - Product Listing" frame: left
filter rail (brand checkboxes, price range, status), product grid, sort dropdown. Wire the
navbar's search box (Task 15.3) to actually navigate here with the query pre-filled when a
search is submitted.
```

---

## Phase 18 — Storefront: Product Detail Page

### Task 18.1 — Product detail API (by slug)
**Prompt:**
```
Implement GET /api/storefront/products/[slug] — look up by the slug added in Task 15.1, not
by id (id-based URLs are bad for SEO and bad for sharing). Include related products (same
category, excluding itself, limit 4). Return 404 cleanly for an unknown slug.
```

### Task 18.2 — Product detail UI
**Prompt:**
```
Build app/(storefront)/products/[slug]/page.tsx per the "Storefront - Product Detail" frame:
image gallery, name/brand/category/SKU, price with discount strike-through, quantity
selector, Add to Cart (wired to Task 15.4's store), wishlist heart (wired to Task 15.5),
description, tags, related products row using ProductCard. Add generateMetadata with a
dynamic title/description built from the product's name and short description, and a
JSON-LD <script> block with Product structured data (name, image, price, availability).
```

---

## Phase 19 — Storefront: Cart & Checkout

### Task 19.1 — Cart page UI
**Prompt:**
```
Build the cart page per the "Storefront - Cart" frame: line items with quantity controls and
remove, order summary (subtotal/discount/shipping/estimated total computed from cart
contents), promo code input (can be a non-functional placeholder for now — flag this in code
as TODO if no discount-code system exists yet), "Proceed to Checkout" button.
```

### Task 19.2 — Order creation API
**DoD:** Stock is checked and decremented atomically; cart is cleared only after a successful order write.
**Prompt:**
```
Implement POST /api/storefront/orders: accepts the current user's cart plus a shipping
address (existing Address id or a new one to save) and a payment method selection. In a
single Prisma transaction: verify stock for every line item against Inventory, create the
Order + OrderItems (with productNameSnapshot/priceSnapshot per Task 1.1's schema),
decrement Inventory.stock per item, clear the user's CartItems. If any item is out of stock,
roll back and return a clear error identifying which item. Payment processing itself is out
of scope for this task — mark paymentStatus as UNPAID for Cash on Delivery, or as a TODO
integration point for card payments (note this clearly rather than faking a payment flow).
```

### Task 19.3 — Checkout page UI
**Prompt:**
```
Build the checkout page per the "Storefront - Checkout" frame: shipping address form
(prefilled from a saved default Address if one exists, editable), payment method radio
selection (Card / Cash on Delivery — Card can be a disabled/coming-soon option if no payment
gateway is integrated yet), order summary, "Place Order" button wired to Task 19.2, redirect
to the order confirmation page on success.
```

---

## Phase 20 — Storefront: Order Confirmation + Order Tracking

### Task 20.1 — Order confirmation page
**Prompt:**
```
Build the order confirmation page per the "Storefront - Order Confirmation" frame, reading
the just-placed order by id from the URL. Show order total, estimated delivery (can be a
simple "5-7 business days" placeholder if no real logistics estimate exists yet), and links
to Track Order / Continue Shopping.
```

### Task 20.2 — Customer order tracking page
**Prompt:**
```
Build the customer-facing order details/tracking page per the "Storefront - Order Details
(tracking)" frame: read-only view of the same status sequence used in the admin Order
Details screen (Task 9.3), items, totals, shipping address, a "Buy Again" button that adds
all items back to the cart. Reuse the GET /api/admin/orders/:id shape if it already returns
everything needed, scoped to the logged-in customer's own orders only (never let a customer
fetch another customer's order by guessing an id — check ownership server-side).
```

---

## Phase 21 — Storefront: Wishlist Page

### Task 21.1 — Wishlist page UI
**Prompt:**
```
Build the wishlist page per the "Storefront - Wishlist" frame: grid of saved products using
ProductCard, each with an "Add to Cart" action, wired to Tasks 15.4 and 15.5.
```

---

## Phase 22 — Storefront: My Account

### Task 22.1 — Account API
**Prompt:**
```
Implement app/api/storefront/account/ route handlers: GET/PATCH /profile (name, email,
phone, password change), GET/POST/PATCH/DELETE /addresses (the Address book from Task 15.1,
with isDefault handling — setting one as default unsets any previous default). All routes
require login and only ever touch the logged-in user's own data.
```

### Task 22.2 — My Account UI
**Prompt:**
```
Build the account page per the "Storefront - My Account" frame: tabs for Profile, Order
History (reuses the customer order list — link into Task 20.2's detail page), and Addresses
(list/add/edit/delete, matching the Address book from 15.1/22.1).
```

---

## Phase 23 — SEO & Performance Pass

*(Do this as its own pass after Phases 16–22 exist, not scattered per-page — easier to be
systematic and check nothing was missed.)*

### Task 23.1 — Metadata audit
**Prompt:**
```
Audit every storefront route and confirm generateMetadata is implemented with a real,
distinct title and description: Home, Product Listing (dynamic by category/search query),
Product Detail (per-product), Cart/Checkout (can be simple/static — not indexed content).
Add a default/fallback metadata in the storefront layout for any route missing it.
```

### Task 23.2 — Structured data
**Prompt:**
```
Add JSON-LD structured data: Product schema on product detail pages (if not already done in
Task 18.2), BreadcrumbList on product/category pages, Organization schema in the root
layout. Validate the output against Google's Rich Results Test format (structure only — no
need to actually submit anywhere).
```

### Task 23.3 — Sitemap + robots.txt
**Prompt:**
```
Implement app/sitemap.ts generating entries for every active product (by slug) and category
(by slug), plus static routes (home, listing). Implement app/robots.ts allowing storefront
routes and disallowing /admin, /api, /cart, /checkout, /account.
```

### Task 23.4 — Image + font audit
**Prompt:**
```
Audit every storefront image usage — confirm next/image is used everywhere (no raw <img>),
every image has meaningful alt text (not "product image"), and the hero banner's image has
priority set. Confirm next/font is used for all custom fonts with no layout shift.
```

### Task 23.5 — Caching / ISR
**Prompt:**
```
Add revalidate export (e.g. 300 seconds) to the Home, Product Listing, and Product Detail
pages so they're served from cache and periodically refreshed rather than hitting the
database on every request. Confirm Cart/Checkout/Account remain fully dynamic (no caching —
they're per-user).
```

---

## Phase 24 — Testing & Hardening (storefront)

### Task 24.1 — E2E happy paths
**Prompt:**
```
Extend the Playwright suite from Task 13.1 (Part 1) with: browse → add to cart → checkout →
order confirmation; add/remove a wishlist item; navbar search across all three scopes;
sign up → login → view account → view order history.
```

### Task 24.2 — Security & correctness pass
**Prompt:**
```
Audit: order creation cannot oversell stock under concurrent requests (confirm the
transaction in Task 19.2 actually prevents a race condition — test with two near-simultaneous
requests against low stock); a customer cannot view or modify another customer's orders,
addresses, or cart by manipulating an id in the URL; checkout and account routes validate
all input server-side with Zod even though the client already validates it.
```

---

## Phase 25 — Real Deployment: ArvanCloud (supersedes Part 1's Phase 14)

*One deployment, done once, after Phases 0–24 are complete and verified locally.*

### Task 25.1 — Production Dockerfile
**Prompt:**
```
Add `output: 'standalone'` to next.config. Write a multi-stage Dockerfile: deps stage (pnpm
install), build stage (pnpm build), runner stage (copy standalone output + static + public,
run as non-root user, EXPOSE 3000, CMD node server.js). Add .dockerignore.
```

### Task 25.2 — docker-compose for ArvanCloud
**DoD:** Decide up front whether Postgres is self-hosted in a container or ArvanCloud's Managed Database service — don't build both.
**Prompt:**
```
Write docker-compose.prod.yml for deployment on an ArvanCloud Cloud Server (Ubuntu):
app service (built from the Dockerfile, env from .env.production), nginx service (reverse
proxy, depends_on app). For Postgres: [CHOOSE ONE — if using ArvanCloud's Managed Database
service, omit a postgres service entirely and just point DATABASE_URL at it; if
self-hosting, add a postgres:18 service with a named volume, not exposed publicly].
Ensure the app service runs `prisma migrate deploy` on container start before serving traffic.
```

### Task 25.3 — Nginx reverse proxy config
**Prompt:**
```
Write nginx.conf reverse-proxying to the app service on port 3000: gzip enabled, security
headers (X-Frame-Options, X-Content-Type-Options, Referrer-Policy), an HTTP block for the
certbot ACME challenge + redirect to HTTPS, and an HTTPS server block ready for a cert.
```

### Task 25.4 — ArvanCloud deployment runbook
**Prompt:**
```
Write DEPLOYMENT.md covering: creating an ArvanCloud Cloud Server (Ubuntu image, appropriate
vCPU/RAM tier), installing Docker + Docker Compose on it, firewall rules (80/443/24 only),
a non-root deploy user, cloning the repo, setting production .env values (including
DATABASE_URL — either the self-hosted container or the ArvanCloud Managed Database
connection string), obtaining a certbot certificate, running
`docker compose -f docker-compose.prod.yml up -d --build`, and a basic redeploy procedure
(git pull, rebuild, migrate, restart). If product images are stored on ArvanCloud Object
Storage rather than local disk, document that bucket setup too.
```

### Task 25.5 — Go-live checklist
**Prompt:**
```
Before pointing the domain at this server: confirm SEO tasks (Phase 23) are complete, run
the E2E suite (Task 24.1) against the production build one final time, confirm environment
variables don't leak any dev/test secrets, confirm the admin login password isn't a
seed/default value, and confirm backups are configured for whichever Postgres setup was
chosen in Task 25.2.
```

---

## Updated full execution order (Parts 1 + 2 combined)

Phase 0 → 1 → 2 → 3 → 4 → 5 → 6 → 7 → 8 → 9 → 10 → 11 → 12 (Part 1, admin)
→ 15 → 16 → 17 → 18 → 19 → 20 → 21 → 22 (Part 2, storefront, in this order — each depends on
components/APIs from earlier storefront phases)
→ 23 (SEO/performance pass, once storefront exists to audit)
→ 24 (testing, continuously alongside 15–23 in practice, not strictly batched to the end)
→ 25 (the one real deployment, once everything above is verified)
