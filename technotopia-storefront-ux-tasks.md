# Technotopia — Storefront UI/UX Overhaul — Claude Code Task List

Continues `TASKS.md` (which ends at Phase 26). Numbering picks up at **Phase 27**.

The storefront is built and works — every screen in `design/storefront/` exists, 244 unit tests
pass, the production build ships. What it lacks is the layer above "works": one typographic voice,
a colour system that can be repainted, server-rendered pages instead of spinners, and a buying flow
that doesn't ask a stranger to sign up before they can put something in a basket.

The reference implementation for all of it is **Top Oil** (`D:\Code\topoil`), same stack, same
author, same conventions. Where a task says "as topoil does", the named file is the thing to read.

**What is deliberately not ported:** everything under Cars & Fitment — `FitmentWizard`,
`FitmentResults`, `SpecOnlyCard`, `OilGuidanceCard`, `RequestItForm`, `CompatibleVehicles`,
`FitsYourCarNotice`, `FitContextBanner`, the `/cars` and `/fitment` routes, `lib/storefront/fitment.ts`,
and the `?fit=` product context. Technotopia sells content-creation equipment; there is no car to
match. Topoil's homepage is built *around* that wizard, so its hero is the one piece of its home
page that has to be redesigned rather than copied — see Task 29.1.

---

## How to read a task

Every task below has the same three parts, in this order:

1. **A paragraph or two** — what is wrong today and why the task exists.
2. **Done when** — the checklist that closes the task. This belongs to the task it appears under,
   above the prompt fence.
3. **Prompt** — the last thing in every task block. Paste this into a Claude Code session.

So: `### Task N` → context → `**Done when:**` → `**Prompt:**` → next `### Task N+1`. Nothing
follows the fence, which is what went wrong in the first draft of this document.

## How to use this

- Same discipline as `TASKS.md`: one task = one Claude Code session = one commit, in order.
- The phases are ordered by dependency, not by visibility. **Phase 27 comes first** even though it
  changes nothing a customer can name: every later task paints from the tokens it defines, and doing
  it after the screens means repainting them twice.
- Beyond each task's own "Done when", the standing bar from `CLAUDE.md` applies every time:
  `pnpm lint`, `pnpm tsc --noEmit` and `pnpm test` clean, plus `pnpm build` where the change touches
  routing or rendering. Those aren't repeated per task.
- `design/storefront/*.dc.html` stays the source of truth for **layout and copy**. It is not the
  source of truth for colour or type any more — Phase 27 supersedes the design-system file, and
  Task 27.5 rewrites it to match.

---

## Findings this list is built on

Read these before starting; several tasks below only make sense against them.

**1. `--white` is never defined.** `app/globals.css:44` sets `--background: var(--white)` and line 49
sets `--accent-foreground: var(--white)`, and no rule anywhere declares `--white`. Both resolve to
nothing. This is fixed in passing by Task 27.2, but it is worth knowing that the storefront's
"background" token has never worked.

**2. There is no dark theme at all.** Not a broken one — none. The tokens are shade-named
(`--ink-900`, `--gray-500`, `--surface-100`, `--surface-200`), and shade names describe a colour
rather than a job, so there is nothing for a theme switch to reassign. Components spell this out:
`ProductCard` paints `bg-surface-100`, `text-ink-900`, `bg-white`. Topoil's answer is a *ranked*
set of roles — `surface > surface-sunken > surface-muted`, `fg > fg-muted > fg-subtle > fg-faint`,
`line > line-strong` — and one attribute on `<html>` that reassigns all of them.

**3. Three font families load on every page, in eleven weights.** `app/[locale]/(storefront)/layout.tsx`
loads Plus Jakarta Sans (400–800), IBM Plex Mono (500, 600) and Vazirmatn (400–700) unconditionally,
because `next/font` calls must sit at module scope. An English visitor downloads the Persian face;
a Persian visitor downloads both Latin faces and then overrides them in CSS. Topoil loads **one**
family per locale by branching on the route param *before* choosing which font object to spread
(`app/[locale]/layout.tsx:59`) — the call sites are still at module scope, only the choice is not.

**4. The mono face is doing display work.** Category eyebrows, badges, rank labels and the image
placeholder are all `font-mono` at 10–11px, uppercase, letter-spaced. Combined with headings
hard-set to `font-weight: 800` and `-0.02em` for every `h1`/`h2`/`h3` in `globals.css`, that is the
"fonts are the worst" complaint: two extreme weights, no middle, and a monospace label on a product
card that isn't code.

**5. Every storefront screen is a client component that fetches in `useEffect`.** Home, PLP, PDP,
cart, checkout, account, wishlist. The server sends an empty shell, the browser paints nothing, then
data arrives. It costs the LCP, the SEO and the perceived speed all at once, and it is the single
biggest reason the site feels worse than topoil, which renders home/PLP/PDP on the server from the
service layer directly.

**6. You cannot add anything to a cart without an account.** `app/api/storefront/cart/route.ts`
guards both GET and POST with `requireUser`, and `CheckoutContent` only calls `hydrateCart()` when
`user` is truthy. A first-time visitor's path to buying one thing is: find product → add to cart →
be told to log in → sign up → verify → come back → find product again. Topoil's cart is
`localStorage` reconciled against a public lookup route, and the login wall sits at the *order*, not
at the basket — and even there, guests may order (Design Decision 6, `app/api/storefront/orders/route.ts:35`).

**7. `Order.customerId` is a required FK.** So guest checkout is a schema change, exactly as it was
in topoil. Task 30.4 covers it.

**8. PLP filter state lives in React, not the URL.** `ProductsContent.tsx` reads `useSearchParams`
once for the initial value and then keeps category, brands, statuses, price and sort in `useState`.
Filtered listings can't be linked, shared, or reached with the back button.

**9. Product images are cropped.** `ProductCard` uses `object-cover` on an `aspect-square`. Topoil's
rule — product photography is shot on white, and the card *contains* rather than crops — is what
makes a grid read as one shelf. Cropping a lens or a microphone arm to a square cuts the product.

**10. Interactive glyphs are text characters.** The wishlist toggle is `♥`/`♡` and the remove button
is `✕`, rendered as button children. They inherit the font, so they render differently in the Latin
and Persian faces, they can't be sized against the label, and screen readers announce whatever the
font does. Topoil has `components/storefront/icons.tsx`.

**11. There is one piece of dead markup on the home page.**
`<section className="mx-auto max-w-320 px-6 py-16" aria-hidden="true" />` — an empty spacer between
the stars and best-sellers sections. Delete it in Task 29.5.

---

# Phase 27 — Type, colour, theme

The foundation. Nothing here is a new screen; everything here is what the later screens are made of.

### Task 27.1 — One font per locale, and a scale between the extremes

Three families in eleven weights load on every page (Finding 3), and the mono face is doing display
work it shouldn't (Finding 4). This is the task that answers "the fonts are the worst": it cuts what
downloads, and it replaces two extreme weights with a scale that has a middle.

**Done when:**

- On `/en` the network panel shows one font family; on `/fa`, one. Neither downloads the other's.
- IBM Plex Mono is gone from the storefront, or is used only where something is genuinely
  fixed-width (a SKU, an order number) — never on a category eyebrow or a product badge.
- A named type scale lives in `globals.css`, and the blanket `h1,h2,h3 { font-weight: 800 }` rule is
  gone. Heading levels pick steps from the scale rather than arbitrary values per call site.
- The loaded weight list is trimmed to what the scale actually uses.
- No layout has moved. This task changes what loads and what type looks like, nothing else.

**Prompt:**

```
Read topoil's app/[locale]/layout.tsx (the `const font = locale === "fa" ? vazirmatn : geistSans`
line and the comment above it) and our app/[locale]/(storefront)/layout.tsx.

Load one font family per locale instead of three families on every page. Keep the next/font calls at
module scope — only the *choice* moves into the component. English gets the Latin face, Farsi gets
Vazirmatn, and neither downloads the other. Drop IBM Plex Mono from the storefront entirely unless
you find a place that is genuinely showing code or a fixed-width figure; SKUs and order numbers
qualify, category eyebrows and product badges do not.

Then replace the blanket `[data-scope="storefront"] h1,h2,h3 { font-weight: 800 }` rule with a
deliberate type scale: sizes and weights named once, in globals.css, so a heading level is a choice
between defined steps rather than a Tailwind arbitrary value at each call site. Trim the weight list
to what the scale actually uses.

Do not change any layout. This task changes what is loaded and what the type looks like, not where
anything sits.
```

### Task 27.2 — Semantic colour tokens

Shade-named tokens can't be repainted (Finding 2), and `--white` has never existed (Finding 1). This
task rebuilds the palette as ranked *roles* so that Task 27.3 has something to flip. Light theme
only here.

**Done when:**

- `globals.css` defines the ranked roles: `surface > surface-sunken > surface-muted`,
  `fg > fg-muted > fg-subtle > fg-faint`, `line > line-strong`, plus `accent` (theme-dependent, for
  text/borders/rings), `accent-solid` (the fill, which does not flip), and the
  success/warning/danger/info pairs.
- `--ink-900`, `--gray-500`, `--surface-100` and `--surface-200` are gone as *definitions* (call
  sites are swept in 27.4).
- `--white` is either declared or its two references are replaced — no token resolves to nothing.
- Every pair carries its measured contrast ratio in a comment beside the value, generated from the
  actual colours rather than estimated.
- The storefront still looks the same to the eye as it did before the task.

**Prompt:**

```
Read the block comment at the top of topoil's app/globals.css — it explains why the tokens are ranked
roles rather than shades, and what each rank is for. Rebuild our storefront palette on the same
model, keeping our own accent hue.

Replace --ink-900 / --gray-500 / --surface-100 / --surface-200 with the ranked roles:
surface > surface-sunken > surface-muted, fg > fg-muted > fg-subtle > fg-faint, line > line-strong,
plus accent (theme-dependent, for text/borders/rings), accent-solid (the fill, which does not flip),
and the success/warning/danger/info pairs.

Fix --white while you are in there: it is referenced twice and declared nowhere, so
--background and --accent-foreground currently resolve to nothing.

Contrast-check every pair and write the ratio into the comment beside the value, as topoil does —
this is the file that has to be trusted later, so the numbers are generated, not guessed. Light
theme only in this task; dark is 27.3.
```

### Task 27.3 — The light/dark mechanism

With roles in place, the theme is one attribute on `<html>`. The reason it must be an *attribute*
and not HeroUI's documented `dark` class is specific to our layout shape, and topoil has already
been bitten by it — read the comment before deciding otherwise.

**Done when:**

- `lib/storefront/theme.ts` exists with `THEME_ATTRIBUTE`, a `"technotopia-theme"` storage key,
  `THEME_INIT_SCRIPT`, `readAppliedTheme`, `applyTheme` and `ensureThemeApplied`.
- The pre-paint script is the first child of `<body>` in `app/[locale]/layout.tsx`, with
  `suppressHydrationWarning` on `<html>` — and there is no flash of the wrong theme on a cold load.
- A `ThemeGuard` restores the attribute after a locale switch: the theme survives `/en` → `/fa`.
- `globals.css` carries the `@custom-variant dark` line pointing Tailwind's `dark:` at the same
  attribute HeroUI keys on, and HeroUI's own components flip with ours.
- The dark half of the palette is defined, with `surface-sunken` *darker* than `surface` (the
  inversion topoil documents).
- The admin tree sets no theme attribute and is visually unchanged.

**Prompt:**

```
Read topoil's lib/storefront/theme.ts in full — including the comments about why it is a
`data-theme` attribute and not the `dark` class HeroUI documents. The reason is specific to our
setup: React owns <html className>, the locale layout puts the font variable there, so React
rewrites that attribute on a locale switch and silently wipes a class the theme script added. We
have exactly the same layout shape, so we would hit exactly the same bug.

Port the mechanism:
- lib/storefront/theme.ts — THEME_ATTRIBUTE, a "technotopia-theme" storage key, THEME_INIT_SCRIPT,
  readAppliedTheme, applyTheme, ensureThemeApplied.
- The inline pre-paint script as the first child of <body> in app/[locale]/layout.tsx, with
  suppressHydrationWarning on <html>.
- A ThemeGuard component that restores the attribute after a locale switch remounts the layout.
- The @custom-variant line in globals.css pointing Tailwind's `dark:` at the same attribute
  HeroUI keys on.

Then add the dark half of the palette from 27.2. Note the inversion topoil documents: surface-sunken
is *darker* than surface in dark mode, the reverse of light — that is why they are two tokens rather
than one plus a shadow.

The admin tree does not get a toggle and must not set the attribute. Its wireframes are drawn
light-only.
```

### Task 27.4 — The toggle, and the repaint sweep

27.3 built the switch; nothing is wired to it and most components still paint from fixed shades.
This is the task that actually makes the dark theme real, and it is mostly a sweep.

**Done when:**

- `ThemeToggle` is in the storefront header beside the language switcher, and reachable from the
  mobile drawer.
- A grep over `components/storefront/` and `app/[locale]/(storefront)/` for `bg-white`,
  `text-ink-900`, `bg-surface-100`, `bg-surface-200`, `text-gray-500`, any raw `neutral-*`/`slate-*`,
  and any hex or `oklch(` literal inside a `className` or style object returns nothing.
- Surfaces that are dark *whatever* the theme is — a scrim over a photograph, a badge on an image —
  use the non-flipping accent token, not the theme-dependent one.
- Both themes verified at three widths and in RTL, with a screenshot per theme in the commit.

**Prompt:**

```
Add ThemeToggle to the storefront header (topoil: components/storefront/ThemeToggle.tsx), beside the
language switcher.

Then sweep every file under components/storefront/ and app/[locale]/(storefront)/ for colour that
cannot flip: bg-white, text-ink-900, bg-surface-100, bg-surface-200, text-gray-500, any raw
neutral-N or slate-N, any hex or oklch literal in a className or style object. Each one becomes the
semantic token whose *job* it was doing. Where the answer isn't obvious — a scrim over a photograph,
a badge on an image — read topoil's note on accent-on-dark: surfaces that are dark whatever the
theme is take the non-flipping token.

Verify both themes at three widths and in RTL. A screenshot per theme in the commit message is worth
more than a description.
```

### Task 27.5 — Bring the design-system file up to date

The design-system page now documents a palette and a type treatment that no longer exist. Leaving it
stale is worse than not having it, because the next session will trust it.

**Done when:**

- `design/storefront/Technotopia Design System v2.dc.html` documents the ranked roles, both themes
  side by side with their contrast ratios, the type scale, and the one-font-per-locale rule.
- The page and `globals.css` agree — no colour or size in one that contradicts the other.
- `CLAUDE.md`'s Styling section says to paint from the tokens, the way topoil's does.
- `Technotopia Design System.dc.html` (v1) is left alone as history.

**Prompt:**

```
design/storefront/Technotopia Design System v2.dc.html documents the palette and type that Tasks
27.1–27.4 have just replaced. Rewrite it so it documents what the code now does: the ranked roles,
both themes side by side with their contrast ratios, the type scale, and the one-font-per-locale
rule. Leave the older Technotopia Design System.dc.html alone as history.

Then update CLAUDE.md's Styling section to say that storefront surfaces are painted from the
semantic tokens, never from a fixed Tailwind step — the way topoil's CLAUDE.md does.
```

---

# Phase 28 — Render on the server

Fixes the blank first paint (Finding 5). Independent of Phase 29's redesign — do it first so the
redesign is built on server components rather than converted afterwards.

### Task 28.1 — The home page renders on the server

`HomeContent.tsx` is a client component that fetches `/api/storefront/home` in a `useEffect` and
renders an empty shell until it answers. Topoil's `app/[locale]/page.tsx` awaits the service layer
directly and explains in a comment why it doesn't call its own HTTP routes.

**Done when:**

- View-source on `/en` contains the products, categories and brands — not an empty shell.
- `page.tsx` has no `"use client"`, and awaits the same service functions the
  `/api/storefront/home` route calls.
- `/api/storefront/home` still exists and still works — it stays the public contract, it just isn't
  the page's own data source.
- Auth and wishlist hydration have moved down into the interactive leaves that need them.
- No spinner on first paint.

**Prompt:**

```
app/[locale]/(storefront)/HomeContent.tsx is a client component that fetches /api/storefront/home in
a useEffect and renders an empty shell until it answers. Topoil's app/[locale]/page.tsx is a Server
Component that awaits the service layer directly — read it, including the comment about why it calls
the services rather than its own HTTP routes.

Convert ours the same way: page.tsx awaits the same functions server/ exposes to the /api/storefront/home
route, and passes the data down as props. Keep /api/storefront/home — it stays the public contract —
but the page must not be its client.

The wishlist and auth hydration currently sitting in HomeContent belong to the interactive leaves,
not the page. Push them down to the components that actually need them, so the page itself has no
"use client".
```

### Task 28.2 — PLP renders on the server, with filters in the URL

Two problems with one fix: the listing fetches in the browser, and its filter state lives in
`useState` rather than the URL (Finding 8), so a filtered listing can't be shared or reached with
the back button.

**Done when:**

- `/en/products?category=…&sort=price-asc&page=2` renders that exact state from the server.
- That URL survives a reload, a back button, and being pasted into another browser.
- Search params are validated with a Zod schema before they reach the service layer.
- The filter sidebar is a client component that writes to the URL and holds no listing state of
  its own.
- Real pagination is on the page, driven by the total the result already carries.

**Prompt:**

```
Two problems in app/[locale]/(storefront)/products/ProductsContent.tsx, and they have one fix.

It fetches in the browser, and it keeps category, brand, status, price and sort in useState rather
than in the URL — so a filtered listing can't be shared or reached with the back button.

Make the URL the single source of truth: filters and sort and page are search params, page.tsx reads
them, validates them with a Zod schema, calls the service layer, and renders the results. The filter
sidebar becomes a client component that writes to the URL and nothing else. Read topoil's
lib/storefront/plp.ts for how it parses and normalises the params, and its ProductFilters /
ProductSortSelect / Pagination for the split between the server page and the client controls.

Add real pagination while you are here — the result already carries a total.
```

### Task 28.3 — PDP renders on the server

The product page is the one whose HTML matters most to a crawler, and today it ships empty.

**Done when:**

- View-source on a product URL contains the name, price, description and breadcrumbs.
- `generateMetadata` and the Product JSON-LD are built from the real row, not from a shell — the
  Rich Results test sees the Product schema.
- Only gallery selection, quantity, add-to-cart and wishlist remain client components.

**Prompt:**

```
Convert app/[locale]/(storefront)/products/[slug]/ProductDetailContent.tsx the same way: the page
awaits the product, renders name, price, description, gallery and breadcrumbs on the server, and only
the interactive parts — gallery selection, quantity, add-to-cart, wishlist — stay client components.

This is the page whose metadata and JSON-LD matter most, so confirm both are emitted from real data
rather than from a shell.
```

### Task 28.4 — The account tree

Account, orders and wishlist are client-fetched too. These are behind auth, so SEO isn't the
argument — the spinner is.

**Done when:**

- No `useEffect`-then-`fetch` pattern remains in `app/[locale]/(storefront)/account/`,
  `/orders/` or `/wishlist/`.
- Order history and order detail arrive with the page rather than after it.
- Forms stay client components; only the data loading moves.

**Prompt:**

```
Account, orders and wishlist are client-fetched too. These are behind auth so SEO isn't the argument
— the argument is the spinner. Render them on the server where the session allows it (topoil's
app/[locale]/(account)/ is the model), keeping the forms as client components.

Order history and order detail should arrive with the page, not after it.
```

---

# Phase 29 — The home page

Topoil's home page is five sections in the order a customer decides things. Ours is a carousel, a
featured row, an empty spacer, and a best-sellers block. Rebuild it on the same rhythm — minus the
car finder, which is the one section that has no equivalent here.

### Task 29.1 — The hero

Topoil's hero is built around its car-finder wizard, so this is the one home-page section that has
to be designed rather than copied. Ours is banner data an admin manages, which is a different
premise — the task is to keep that premise and fix what the carousel does badly.

**Ask before starting** whether the carousel survives as a carousel. A single well-made banner is a
legitimate outcome here.

**Done when:**

- The first slide renders from the server — the page's LCP element is not waiting on a client fetch.
- One headline and one CTA, legible at 375px.
- Auto-advance respects `prefers-reduced-motion` and pauses on hover and on focus.
- The banner ground uses the non-flipping accent token, and the hero reads correctly in both themes
  and in RTL.
- If the carousel could not be made to behave, the commit says so and ships a single banner instead
  of a compromise.

**Prompt:**

```
Read topoil's components/storefront/home/HomeHero.tsx and the --app-hero-* block in its globals.css,
including the reasoning: the photograph is a CSS background rather than an <Image> because there is
one still-life per theme and a display:none <img> is still a fetch — and this is the LCP image.

Ours is a HeroCarousel driven by admin-managed Banner rows, which is a different premise: the
content is data, not a fixed composition. Keep the banner data, but fix what the carousel does badly:

- It must not be the reason the page's LCP is a client component. The first slide renders on the
  server.
- One clear headline, one clear CTA, at a size that reads on a phone.
- Auto-advance is opt-out for reduced-motion and pauses on hover/focus. If it can't be made to
  behave, a single banner is better than a bad carousel — say so in the commit rather than shipping
  a compromise.
- Dark and light both need to work, and the banner ground is a surface that is dark whatever the
  theme is: use the non-flipping accent token there.

Ask before inventing a photographic treatment we don't have assets for.
```

### Task 29.2 — The deals rail

The offers rail sits directly under the hero because it is the one section that can be shopped
without knowing anything else about what you want.

**Done when:**

- The rail renders under the hero, sourced from products with a `discountPercent` above zero, best
  offer first.
- With no discounted products, the section does not render at all — no empty rail, no "no offers"
  message.
- It scrolls by keyboard and by touch, and scrolls the correct way in RTL.

**Prompt:**

```
Add a deals/offers rail directly under the hero, as topoil does (components/storefront/home/DealsCarousel.tsx).
It sits there because it is the one section that can be shopped without knowing anything else about
what you want.

Source it from products with a discountPercent above zero, ordered so the best offer leads. An empty
rail must not render at all — topoil's comment on this is right: a shop with nothing on offer
shouldn't announce it.
```

### Task 29.3 — Browse by category

Category cards get the opposite image treatment from product cards — full-bleed photograph under a
scrim — and that contrast is what stops the two from being confused.

**Done when:**

- Categories are browsable from the home page, rendered from `Category.image` as full-bleed
  photographs under a scrim.
- Text over the photograph uses the non-flipping accent/foreground tokens, so it holds in both
  themes.
- The section works in RTL.

**Prompt:**

```
Add a category browse section (topoil: CategoryBrowseSection.tsx). Category cards there are
full-bleed photographs under a scrim — deliberately the opposite treatment from a product card, and
the reason the two never get confused.

We have Category.image. Use the same treatment: photograph, scrim, name over it, and the
non-flipping accent for anything drawn on top.
```

### Task 29.4 — Browse by brand

Since 28.2 made the PLP filter a URL param, a brand tile is just a link.

**Done when:**

- Brand logos render on a neutral ground and link to the PLP with that brand's filter applied.
- The destination URL is shareable and reloadable (it is a real search param, not client state).
- The logo treatment is contained — neither the white-panel product treatment nor the full-bleed
  category one — and the component's comment says why it is a third case.

**Prompt:**

```
Add a brand browse section (topoil: BrandBrowseSection.tsx) — brand logos on a neutral ground,
linking into the PLP with that brand's filter applied. Since 28.2 the filter is a URL param, so
this is a plain link.

Brand logos are the one image that is neither a white-background product shot nor a full-bleed
photograph; give them their own contained treatment and say so in the component's comment.
```

### Task 29.5 — Trust strip, and delete the dead spacer

Closes the page, and clears out Finding 11.

**Done when:**

- A trust strip closes the home page, reading from `getPublicSettings` so every claim on it is
  something the store actually configured.
- The empty `<section aria-hidden="true" />` spacer is gone, and section spacing belongs to the
  sections.
- The final order is hero → deals → categories → brands → trust.
- Any difference from `design/storefront/Home.dc.html` is reconciled in the commit message.

**Prompt:**

```
Add a closing trust strip (topoil: TrustStrip.tsx) — delivery, returns, support, whatever Settings
actually knows. It reads from getPublicSettings, so it says something true rather than something
decorative.

Then delete the empty `<section aria-hidden="true" />` spacer in HomeContent.tsx. Spacing between
sections belongs to the sections.

Assemble the final order: hero → deals → categories → brands → trust. Compare against
design/storefront/Home.dc.html and reconcile any difference in the commit message.
```

---

# Phase 30 — The buying flow

The largest behavioural change in this list, and the one to do first if only one phase gets done. Do
Phase 27 before it — the cart and checkout screens are rebuilt here and should be built once, in the
new tokens.

### Task 30.1 — A cart that works logged out

Finding 6 is the flow's biggest problem: a visitor cannot put anything in a basket without an
account. This task moves the cart into the browser and the login wall to the order.

**Ask before starting** — and record the answer in `TASKS.md` — what happens to the existing
server-side `Cart`/`CartItem` tables and to a cart a signed-in customer already has. Either they
become the signed-in customer's cross-device cart and merge on login, or they are retired. Both are
defensible; guessing is not.

**Done when:**

- A logged-out visitor can add an item, change its quantity, and remove it.
- The cart survives a reload and a browser restart.
- A public `GET /api/storefront/cart?ids=a,b,c` reconciles the stored snapshot against the catalog;
  it creates nothing and takes no body.
- The reconciliation rules — `unavailable`, `outOfStock`, `exceedsStock`, `priceChanged` — are pure
  functions in `lib/storefront/cart.ts` with unit tests, and the store, the cart page and the route
  all use those same functions.
- A product that went out of stock while it sat in the cart says so.
- The decision about the existing `Cart`/`CartItem` tables is written into `TASKS.md` with its
  reasoning, and implemented.

**Prompt:**

```
Today app/api/storefront/cart/route.ts requires a user on both GET and POST, so a visitor cannot put
anything in a basket without an account. That is the flow's biggest problem.

Adopt topoil's model (its Design Decision 4, and lib/storefront/cart.ts):
- The cart lives in the browser — a persisted Zustand store holding productId, quantity and addedAt.
- A public GET /api/storefront/cart?ids=a,b,c reconciles that snapshot against the catalog: what is
  still on sale, still in stock, still at the captured price. Nothing is created; the ids are not
  personal data, so it is a GET with a query string, not a POST.
- The reconciliation rules are pure functions in lib/storefront/cart.ts with unit tests, so the cart
  page, the store and the route all share one definition of "unavailable" / "out of stock" /
  "exceeds stock" / "price changed".

Decide explicitly what happens to the existing server-side Cart/CartItem tables and to a cart a
signed-in customer already has: either keep them as the signed-in customer's cross-device cart and
merge on login, or retire them. Both are defensible — write the decision and its reasoning into
TASKS.md before implementing, and ask if the answer isn't clearly one of the two.
```

### Task 30.2 — A mini-cart in the header

Adding something to a cart currently gives no feedback where the customer is looking.

**Done when:**

- Adding from a product card produces visible feedback in the header without leaving the page.
- The header cart opens a panel rather than navigating; the panel carries the link to `/cart`.
- A count badge reflects the store, at every width.
- The full cart is also reachable from the mobile drawer.

**Prompt:**

```
Add a mini-cart to the header (topoil: components/storefront/cart/MiniCart.tsx). It opens a panel
rather than navigating — the panel carries the link to the full cart, so the page is one predictable
step away at every width.

Add a count badge that reflects the store, and make sure it works from the mobile drawer too.
```

### Task 30.3 — The cart page

Rebuilt on the reconciled lines from 30.1, so each line can tell the truth about itself.

**Done when:**

- Every line state — available, unavailable, out of stock, quantity above what is left, price
  changed since it was added — has a visible, translated treatment.
- Totals come from the pure module from 30.1, not from arithmetic inlined in JSX, and match its
  tests.
- The page renders correctly with a mix of good and problem lines at once.

**Prompt:**

```
Rebuild app/[locale]/(storefront)/cart/CartContent.tsx on the reconciled lines from 30.1. Each line
renders its own state honestly — available, unavailable, out of stock, quantity above what is left,
price changed since it was added — rather than assuming every line is fine.

Read topoil's CartView / CartLineRow / useCartLines for the split. Totals come from the pure module,
not from arithmetic inlined in the JSX.
```

### Task 30.4 — Guest checkout (schema change)

Finding 7: `Order.customerId` is a required FK, so guest checkout is a migration. Topoil rejected the
stub-user approach because it needs a `passwordHash` that can never log in and fills the admin
Customers list with unreachable rows.

**Done when:**

- `Order.customerId` is optional, `Order` carries its own guest contact fields, and the migration
  applies cleanly.
- `schema.prisma` and the migration are committed together, `pnpm prisma generate` has been run, and
  the dev server has been restarted afterwards.
- The admin Orders list and order detail render a guest order without crashing — customer column,
  customer link, and any filter or count that assumed a customer exists.
- The existing order tests still pass.

**Prompt:**

```
Order.customerId is a required FK, so an order needs an account. Topoil hit this and resolved it by
making the column nullable and giving Order its own guest contact fields — creating a stub User per
guest order was rejected because it needs a passwordHash that can never log in and fills the admin
Customers list with unreachable rows.

Do the same here: make customerId optional, add the guest contact fields the order needs, write the
migration, and handle the null customer everywhere the admin reads it — the Orders list's customer
column, the order detail's customer link, any filter or count that assumes a customer exists.

Schema change discipline from CLAUDE.md: schema.prisma and the migration together, then
pnpm prisma generate, then confirm the migration applies. Restart the dev server afterwards.
```

### Task 30.5 — The checkout screen

Built on 30.1 and 30.4. The shape is: a pure module for what the screen shows while the customer is
still deciding, server recomputation for every figure they are actually charged.

**Done when:**

- A visitor with no account can complete a purchase end to end. Signing in is offered, not required.
- The order POST is rate-limited per IP, before anything touches the database.
- Who is ordering is read from the verified session or treated as a guest — never from the request
  body.
- A guest's receipt is handed over directly rather than linking to an order-history page they cannot
  open.
- Delivery method and its cost are defined once and shared between the summary and the server.
- The totals the screen showed match the totals the order stored.
- Existing payment methods and Zod schemas are unchanged — this task is the flow, not payment.

**Prompt:**

```
Rebuild checkout on top of 30.1 and 30.4. Read topoil's lib/storefront/checkout.ts and
components/storefront/checkout/* — the shape is: pure module for what the screen shows while the
customer is still deciding, server recomputation for every figure they are actually charged.

- Guests may check out. Signing in is an offer, not a gate.
- Rate-limit the order POST per IP, since it is now open — topoil does this before anything touches
  the database.
- Never read who is ordering from the request body; take it from the verified session or treat the
  request as a guest.
- A guest's receipt has no order history to return to, so hand it over directly rather than linking
  to a page they cannot open.
- Delivery method and its cost are named once and shared between the summary and the server.

Keep our existing payment methods and Zod schemas; this is about the flow, not about payment.
```

### Task 30.6 — The add-to-cart control on the PDP

Where the flow starts. Today every inventory state gets the same control.

**Ask before starting** whether a notify-me capture has anywhere to land on the admin side. If not,
propose the smallest model that would work rather than building a form that writes nowhere.

**Done when:**

- The quantity stepper is bounded by what is actually in stock.
- A stock badge states the real inventory state.
- An unbuyable product shows a disabled control *with a stated reason*, never a dead button.
- Out of stock offers a notify-me path, and that capture has a confirmed destination.
- Every inventory state has a defined control — none of them is a button that does nothing.

**Prompt:**

```
The PDP's buying control is where the flow starts. Read topoil's pdp/AddToCartControl.tsx,
QuantityStepper.tsx, StockBadge.tsx and NotifyMeForm.tsx.

Give ours: a quantity stepper bounded by what is actually in stock, a stock badge that states the
real inventory state, a disabled-with-a-reason state rather than a dead button, and a notify-me path
for something out of stock — capturing the interest instead of losing the visit.

Confirm the notify-me capture has somewhere to go on the admin side before building it; if it does
not, propose the smallest model that would work and ask.
```

---

# Phase 31 — How products look

### Task 31.1 — The product card

Four problems in one component: cropped images (Finding 9), text-glyph buttons (Finding 10),
monospace eyebrows (Finding 4), and shade-named colours (Finding 2).

**Done when:**

- Product images are contained on a white panel, not cropped — no product is cut by the frame.
- `components/storefront/icons.tsx` exists, and the wishlist toggle and remove button use real icons
  with accessible names. No `♥`, `♡` or `✕` as button children anywhere.
- The category eyebrow uses a step from the 27.1 type scale, not `font-mono` at 11px.
- The card paints entirely from semantic tokens and flips with the theme.
- Layout and states are unchanged — discount, rank and status badges all still work.

**Prompt:**

```
components/storefront/ui/ProductCard.tsx has four problems:

- `object-cover` on an aspect-square crops the product. Topoil's rule (in its CLAUDE.md) is that
  product photography is shot on white and the card *contains* rather than crops — that is what makes
  a grid read as one shelf rather than a patchwork. Adopt it.
- The wishlist toggle and remove button are the text characters ♥ / ♡ / ✕. They inherit the font, so
  they render differently on /en and /fa. Replace them with real icons — create
  components/storefront/icons.tsx as topoil has.
- The category eyebrow is monospace, uppercase, 11px. Phase 27.1 removed mono from the storefront;
  restate it in the type scale.
- Colours are shade-named and won't flip; 27.4 should already have caught this, but verify.

Keep the card's layout and its states — discount, rank, status badges all stay.
```

### Task 31.2 — Write the image standard down

31.1 assumes product photography is shot on white. That assumption has to become a rule before
someone uploads 200 photographs against a different one.

**Done when:**

- `CLAUDE.md`'s Styling section states the white-background product photography rule, and states the
  opposite case: category images are full-bleed photographs under a scrim, a treatment not available
  to product cards.
- The admin's product image upload field shows the standard at the point of upload.

**Prompt:**

```
Task 31.1 assumes product photography is shot on white. Make that a rule rather than an assumption:
write it into CLAUDE.md's Styling section the way topoil does, and add the note to the admin's
product image upload field so whoever is entering real data knows the standard before they upload
200 photographs against it.

State the opposite case too: category images are full-bleed photographs under a scrim, and that
treatment is not available to product cards.
```

### Task 31.3 — Breadcrumbs and the missing furniture

We have a `Breadcrumb` component that is barely used. Pagination may already exist from 28.2 — if so
this task is only the breadcrumbs.

**Done when:**

- PLP, PDP, cart, checkout, account and wishlist all show where they are.
- Breadcrumb paths are derived from the shared nav-items definitions, so a path is described once.
- The PDP emits `BreadcrumbList` JSON-LD alongside its Product schema.

**Prompt:**

```
Topoil puts Breadcrumbs on every screen below the home page and has a shared Pagination component;
we have a Breadcrumb component that is barely used and no Pagination (28.2 may have added one — if
so, this task is just the breadcrumbs).

Add breadcrumbs to PLP, PDP, cart, checkout, account and wishlist, driven by the same nav-items
definitions so a path is described once. Emit BreadcrumbList JSON-LD from the PDP's.
```

---

# Phase 32 — The little issues

The "many little issues" from the brief, made specific. Each is small; together they are most of the
difference between a site that works and one that feels finished.

### Task 32.1 — Pure modules and their tests

Topoil's `lib/storefront/` is a set of pure modules each with a `.test.ts` beside it. Ours has
`lib/format.ts` and `lib/seo.ts`. Phases 28 and 30 will have created several already; this finishes
the set.

**Done when:**

- No arithmetic on money or stock is left inline in a component.
- Anything that computes a number a customer sees, normalises a query param, or decides a state name
  lives in a tested module.
- Nothing was extracted into a module just because it could be — single-use logic used in one place
  stays where it is.

**Prompt:**

```
Topoil's lib/storefront/ is a set of pure modules each with a .test.ts beside it: cart, checkout,
pricing, plp, pdp, orders, seo, sitemap, structured-data, option-search. Ours has lib/format.ts and
lib/seo.ts.

Phases 28 and 30 will have created several of these already. Finish the set: anything that computes
a number a customer sees, or normalises a query param, or decides a state name, moves out of a
component and into a tested module. Don't create a module for something used once in one place.
```

### Task 32.2 — States: empty, loading, error, not-found

The four states that are easy to forget, across every screen.

**Done when:**

- An empty cart, an empty wishlist, a filter combination with no results, a 404 product, an order id
  that isn't yours, and a failed fetch each have a defined, translated treatment with a way forward.
- No screen can reach a blank region with no explanation, and no untranslated error string is
  reachable.
- `loading.tsx` and `error.tsx` boundaries exist for every segment that can actually be slow after
  Phase 28.

**Prompt:**

```
Sweep every storefront screen for the four states that are easy to forget. An empty cart, an empty
wishlist, a filter combination with no results, a product that 404s, an order id that isn't yours,
a failed fetch. Each needs a defined, translated treatment with a way forward — not a blank region
and not an untranslated error string.

Since Phase 28 moved rendering to the server, add loading.tsx and error.tsx boundaries where a
segment can actually be slow.
```

### Task 32.3 — Accessibility and RTL sweep

**Done when:**

- Every input has a label; every icon-only button has an accessible name.
- Focus is visible on every interactive element, in both themes.
- Headings nest correctly, and nothing is announced to a screen reader as a font glyph.
- The contrast numbers generated in 27.2 are verified in the built page, not just in the file.
- The full storefront is checked in Farsi at three widths: logical properties throughout
  (start/end, never left/right), rails and carousels scrolling the correct way, no mirrored text
  inside an image.
- The audit is written into the commit, with each finding either fixed or filed as a follow-up task.

**Prompt:**

```
Run through the storefront against WCAG 2.1 AA: every input has a label, every icon-only button has
an accessible name, focus is visible on every interactive element in both themes, headings nest,
contrast holds (27.2 generated the numbers — verify them in the built page, not just in the file),
and nothing is announced by a font glyph.

Then the RTL pass: the whole storefront in Farsi at three widths. Logical properties everywhere
(start/end, not left/right), carousels and rails scrolling the right way, no mirrored text in an
image.
```

### Task 32.4 — E2E for the flow that matters

**Done when:**

- A guest path passes end to end: home → category → product → add to cart → mini-cart → cart →
  checkout → receipt.
- The same path passes in Farsi, and in dark mode.
- It runs against a production build, with the setup Phase 24 and Task 26.3 already established
  (the app not already holding the port, a seeded test database).

**Prompt:**

```
e2e/storefront exists. Add the path this whole list is about, as a guest: land on home → browse a
category → open a product → add to cart → see the mini-cart → open the cart → check out → see the
receipt. Then the same in Farsi, and the same in dark mode.

Our notes say the E2E suite needs the app not already running on the port and a seeded test
database; check TASKS.md Phase 24 and 26.3 for what that setup expects before writing.
```

### Task 32.5 — Measure it

**Done when:**

- Lighthouse numbers for home, PLP and PDP, in both locales, against a production build, are
  recorded in `TASKS.md`: LCP, CLS, total font bytes, total image bytes.
- The before-figures are stated honestly — if no baseline was captured before Phase 28, the write-up
  says so rather than inventing one.
- The effect of 27.1 (fewer font files) and Phase 28 (content in the HTML) is visible in the
  numbers, or its absence is written up as a finding.

**Prompt:**

```
Run Lighthouse against a production build for home, PLP and PDP, in both locales, before and after —
if a before-run wasn't captured at the start of Phase 28, say so rather than inventing one. Record
LCP, CLS and the total font/image bytes.

Phases 27.1 and 28 should show up here specifically: fewer font files, and HTML that contains the
content. If they don't, that is a finding, not a rounding error — write it up.
```

---

## What to do first if the list is too long

If only one phase gets done: **Phase 30**. A visitor who cannot add to a cart without signing up
does not reach any of the other problems.

If two: **27 and 30**. Type and colour are what "the UI is awful" usually means, and they are cheap
compared with the screens.

Phase 28 is the one whose benefit is invisible in a screenshot and obvious in use.
