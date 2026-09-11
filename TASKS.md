# Technotopia — Task List

Single source of truth for build order. Replaces `technotopia-storefront-final_1.md`,
which replaced `technotopia-storefront-and-deployment-tasks.md` and
`technotopia-storefront-tasks-v2.md`. Use only this file.

**Legend:** ✅ done · ⬜ not started · ⏸ deferred

Completed tasks keep their title, outcome, and commit so the history stays visible.
Their original prompt blocks are in git history — see `technotopia-storefront-final_1.md`
in any commit up to `cbb97c7`. Outstanding and deferred tasks keep their full prompts.

---

## Status at a glance

| Phase | Scope                   | Status                        |
| ----- | ----------------------- | ----------------------------- |
| 0–14  | Admin panel             | ✅ done                       |
| 15    | Storefront foundations  | ✅ done                       |
| 16    | Home page               | ✅ done                       |
| 17    | Product listing         | ✅ done                       |
| 18    | Product detail          | ✅ done                       |
| 19    | Cart & checkout         | ✅ done                       |
| 20    | Confirmation & tracking | ✅ done                       |
| 21    | Wishlist page           | ✅ done                       |
| 22    | My Account              | ✅ done                       |
| 23    | SEO & performance       | ✅ done                       |
| 24    | Testing & hardening     | ✅ done                       |
| 26    | Cleanup & correctness   | ✅ done                       |
| 25    | Deployment              | ✅ done — waiting on a VPS    |
| 27+   | Storefront UI/UX        | in `technotopia-storefront-ux-tasks.md` |

---

# Part 1 — Completed

## Phases 0–14 — Admin panel ✅

Built before the storefront, from a task list that was never committed to the repo
(`technotopia-claude-code-tasks.md`, kept locally). Reconstructed from commit history:

- **Phases 0–1** — Next.js 16 bootstrap, HeroUI theming, Prisma schema + Postgres
  compose, seed script, Zod schemas.
- **Phases 2–3** — Auth library (bcrypt/JWT/cookies), auth routes, `proxy.ts` route
  protection, login page, Zustand auth store.
- **Phase 4** — Admin shell, shared `DataTable`, shared form primitives.
- **Phases 5–11** — CRUD for Categories, Brands, Products, Inventory, Orders,
  Customers, Settings; dashboard wired to real data.
- **Phase 12B** — Banner CRUD + drag-reorder (`12B.1`, `12B.2`), `isFeatured` toggles (`12B.3`).
- **Phase 12C** — Money moved from `Decimal` to `Int` (`12C.1`), shared currency utility
  at `lib/format.ts` (`12C.2`), masked `RialInput` (`12C.3`).
- **Phase 13** — Playwright E2E happy paths (`13.1`).
- **Phase 14** — Dockerfile (`14.1`), compose + migrate-on-start entrypoint (`14.2`),
  nginx + certbot config (`14.3`), `DEPLOYMENT.md` runbook (`14.4`), GitHub Actions CI (`14.5`).

> Note: Phase 14 targets a **generic Ubuntu VPS**, not a specific provider. Phase 25
> below revisits this.

## Phase 15 — Storefront foundations ✅

| Task                      | Outcome                                                                                                    | Commit               |
| ------------------------- | ---------------------------------------------------------------------------------------------------------- | -------------------- |
| 15.1 Extend Prisma schema | Product `slug`/`isFeatured`/`salesCount`, Category `isFeatured`, Banner, Address, Cart, CartItem, Wishlist | `f672dc9`            |
| 15.2 Design tokens        | Tailwind theme + HeroUI config, no one-off hex values                                                      | `2c6e09b`            |
| 15.3 Currency utility     | `lib/format.ts` — landed during admin Task 12C.2                                                           | `83d5b21`            |
| 15.4 Layout shells        | Navbar, MinimalHeader, Footer                                                                              | `2318467`, `d2be32e` |
| 15.5 Shared UI primitives | Button, price tag, product card, section eyebrow                                                           | `4ddd639`            |
| 15.6 Customer auth        | Signup/login, later merged into one tab-toggled page                                                       | `344ecbc`, `add863f` |
| 15.7 Cart store + API     |                                                                                                            | `edac792`            |
| 15.8 Wishlist API         |                                                                                                            | `6d79f5f`            |

> Task numbering shifted when the list was replaced in `18307d0`. Early commits
> reference the old numbers (e.g. "Task 15.2" for customer login). The work is all
> present; only the labels drifted.

## Phases 16–22 — Storefront screens ✅

| Task                              | Commit    |
| --------------------------------- | --------- |
| 16.1 Home data API                | `54fa01a` |
| 16.2 Home page UI                 | `675d13a` |
| 17.1 + 17.2 Listing API + UI      | `e87d4c0` |
| 18.1 Product detail API (by slug) | `267900e` |
| 18.2 Product detail page UI       | `4f2b453` |
| 19.1 Order creation API           | `47ba3f1` |
| 19.2 Checkout page UI             | `e775f75` |
| 20.1 Order confirmation page      | `64ffd1f` |
| 20.2 Order tracking page          | `84390ce` |
| 21.1 Wishlist page UI             | `02f0373` |
| 22.1 Account API                  | `3104d8a` |
| 22.2 My Account page UI           | `2403d8b` |

## Phase 23 — SEO & performance ✅

| Task                      | Status | Commit               |
| ------------------------- | ------ | -------------------- |
| 23.1 Metadata audit       | ✅     | `ccf9f3b`            |
| 23.2 Structured data      | ✅     | `75a55ae`            |
| 23.3 Sitemap + robots.txt | ✅     | `ef6fc34`, `97a04ba` |
| 23.4 Image + font audit   | ✅     | `15bfca4`            |
| 23.5 Caching / ISR        | ✅     | uncommitted          |

**23.5 outcome** — `revalidate = 300` on Home and Product Detail; Detail also gets an
empty `generateStaticParams()`, which is what puts a dynamic segment on the ISR path
instead of rendering it per request (nothing is prerendered at build — the build host
has no guaranteed DB access). Verified on `next start`: `/` and `/fa` serve
`x-nextjs-cache: HIT` with `s-maxage=300`; `/products/<slug>` goes MISS → HIT.

Product Listing is deliberately left dynamic: `generateMetadata` awaits `searchParams`
so `/products?category=<slug>` keeps its own title and canonical (the sitemap emits one
URL per category), and reading `searchParams` opts the whole route into dynamic
rendering — a `revalidate` export there is silently ignored. It renders a client-fetched
shell with no server-side DB work, so the cost is small. Making it cacheable _and_
keeping per-category SEO would mean moving categories to a real path segment
(`/products/category/[slug]`) — a separate task if it's ever wanted.

Cart / Checkout / Account / Wishlist need no `force-dynamic`: they read no cookies on the
server, so Next prerenders an identical empty shell for everyone and all per-user data
arrives from cookie-authenticated, uncached route handlers on the client. Confirmed the
served HTML for a logged-in request contains no user-identifying data.

## Phase 24 — Testing & hardening ✅

| Task                             | Commit    |
| -------------------------------- | --------- |
| 24.1 E2E happy paths             | `65b9826` |
| 24.2 Security & correctness pass | `f1bdc8a` |

## Off-list work ✅

Done outside the task list, after Phase 24:

- `1cb1391` — run `prisma generate` on postinstall so Vercel builds get the client.
- `b3a5498` — basic admin mobile responsiveness (PR #1).
- `8be37dd` — Farsi (fa) storefront support, SEO-first i18n routing (PR #2).
- `cbb97c7` — banner/image upload 500 fix on Vercel previews, via Vercel Blob.
- `59ffc14` — external upload storage removed entirely. Vercel Blob needed a paid
  plan and Supabase was ruled out, so `storeUpload`'s `if (process.env.VERCEL)` branch is
  gone: uploads always write to `public/uploads` and return `/uploads/<file>`. Image
  upload no longer works on Vercel previews — that admin panel is browse-only. Banner
  images are now validated as `/uploads/...` paths only.

---

# Part 2 — Found by audit, after the plan

## Phase 26 — Cleanup & correctness ✅

Items found by auditing the repo, not part of the original plan.

### Task 26.1 — Fix storefront test isolation ✅

Two tests in `app/api/storefront/home/home.routes.test.ts` failed against a used
development database: the endpoint returns only the top 3 banners by `displayOrder`
and the top 10 best sellers, and pre-existing rows filled every slot before the
test's own fixtures appeared. The tests assumed an empty database.

Fixed by pinning the fixtures to the leading edge of each ordering — banners below
the lowest existing active `displayOrder`, best sellers above the highest existing
`salesCount` — so they always land inside the endpoint's limit. The assertions now
check that they lead the returned list, which verifies the ordering rather than
just membership.

**DoD:** `pnpm test` is green against a database that already contains data. ✅

**Prompt:**

```
Make the storefront home route tests independent of pre-existing database rows.
Either scope the assertions to the test's own fixtures without relying on them
appearing inside the endpoint's limit, or give the suite an isolated database.
Do not weaken what the tests actually verify (banner ordering by displayOrder,
best sellers ordered by salesCount descending).
```

### Task 26.2 — Apply uploads-only image validation to the other resources ✅

The uploads-only rule that `banner.schema.ts` carried locally now lives in
`lib/validation/common.ts` as `uploadedImagePathSchema`, with `imageUrlSchema` as its
nullable/optional variant. Product.image, Category.image, and Brand.logo pick the rule
up through `imageUrlSchema`; `banner.schema.ts` imports the shared one instead of
keeping its own copy, so there is a single definition of what a valid image path is.

Absolute URLs are now rejected everywhere, closing the latent failure where the
storefront would render an external image with `next/image` and throw on any host not
allow-listed in `next.config.ts`. No external URLs existed in those tables, so no data
migration was needed.

**DoD:** An external image URL is rejected for Product, Category, and Brand; existing
`/uploads/...` values still pass; admin uploads work unchanged. ✅

**Prompt:**

```
Apply the same uploads-only rule used by banner.schema.ts to imageUrlSchema in
lib/validation/common.ts, covering Product.image, Category.image, and Brand.logo.
Keep it nullable/optional where it already is. Add route tests asserting an external
URL is rejected and a /uploads/ path is accepted.
```

### Task 26.3 — Clean the local development database ✅

The dev database has accumulated test residue: categories and brands named
`E2E Category ms3fakd2`, `e2e-order-ms3fcb1b Brand`, `Featured Test ms7qf168`, plus
duplicate banner generations. It makes the storefront filter lists unusable for
judging real UI.

**DoD:** Storefront category and brand filters show only real catalog values.

**Prompt:**

```
Remove leftover E2E and manual-test rows from the development database (categories,
brands, products, banners with test-prefixed names). Confirm the E2E suite still
cleans up after itself so the residue doesn't come back, and check whether
prisma/seed.ts should reseed a clean baseline afterwards.
```

### Task 26.4 — Small polish ✅

Both things the prompt names had already been dealt with by later work: `ProductCard`
and `CartContent` carry `sizes` today, and the `nginx.conf;C` directory is gone (25.3
rewrote that config into `nginx/`). What was left were the three `fill` images nobody had
listed — `HeroCarousel`'s slide image and `ProductGallery`'s main image and thumbnails —
so they got the same treatment: viewport-matched `sizes` for the two that scale with the
layout, a flat `68px` for the fixed-size thumbnail buttons.

Every `next/image` with `fill` in the codebase now has a `sizes`, and `pnpm build` prints
no warnings at all (with 26.6 removing the one error it still had).

**Prompt:**

```
ProductCard and CartContent use next/image with `fill` but no `sizes` prop, which
Next warns about on every render. Add appropriate `sizes` values. Also delete the
stray empty directory literally named `nginx.conf;C` in the repo root — it's an
artifact of a mangled shell redirect and is untracked.
```

### Task 26.5 — Decide the real-data entry plan ✅

**Decision: the admin enters real data on the developer's machine, against the local
dev stack — not on a Vercel preview — and none of it is re-entered later.**

Uploads write to `public/uploads` and nowhere else, and Vercel's runtime filesystem is
read-only, so no image-bearing product, category, brand, or banner can be created on a
preview at all. The preview stays browse-only. The local dev database and
`public/uploads` folder are the canonical store until a VPS exists; both move across in
one pass (`pg_dump -Fc` + restore, and a copy of the uploads folder). Image columns hold
root-relative `/uploads/<uuid>.<ext>` paths, so nothing needs rewriting as long as the
folder travels with the dump, and `User` rows carry their bcrypt hashes, so the admin's
login moves too.

Two config gaps that would have broken this were fixed while documenting it:

- `docker-compose.prod.yml` had no mount for `public/uploads`. The Dockerfile bakes
  `public/` into the image, so every uploaded file — including a restored batch — was
  lost on the next `up -d --build`. Now bind-mounted from `./uploads` (uid 1001).
- `nginx.conf` had no `client_max_body_size`, so nginx's 1MB default would have
  rejected uploads between 1MB and the route's own 5MB cap with a 413. Now `5m`.

`DEPLOYMENT.md` sections 6 and 7 carry the answer, the step-by-step move, and a
backup routine that keeps the dump and the uploads archive together.

**DoD:** A written answer covering where the admin should enter data, and how both rows
and the `public/uploads` files move to production without re-entry. ✅

**Prompt:**

```
Decide and document where real catalog data should be entered now that deployment is
deferred and uploads are local-disk only. Cover how both the database rows and the
public/uploads files move to the future VPS without the admin re-entering anything.
Write the answer and the migration steps into DEPLOYMENT.md.
```

### Task 26.6 — Delete the unreachable dev-preview pages ✅

Deleted, along with the references that outlived them: the two `robots.ts` disallow
entries (which were disallowing routes that returned 404 anyway), the "dev-preview" half
of `proxy.ts`'s comment, the sibling-root-layout note in `app/[locale]/layout.tsx`, and
the two `app/dev-preview/...` paths in `AGENTS.md` — already stale, since the files had
moved into `app/(dev)` at some point without the docs following. `AGENTS.md` now points
at a real admin screen for each component instead of a preview page.

The production build is silent as a result: no `ENVIRONMENT_FALLBACK`, no warnings, just
the route table.

**The finding**, from running the go-live checks (25.5). `app/(dev)` held `/dev-preview`
and `/storefront-dev-preview`, the component-preview pages from Phases 5 and 15. Both
returned 404 in every environment, dev included — `proxy.ts` sends everything outside
`/admin` through next-intl's middleware, which rewrites `/dev-preview` to
`/en/dev-preview`, and they lived outside the `[locale]` tree — so they had been dead
since the i18n work (`8be37dd`). They were still built and prerendered into the production
image, and they were the source of the `Error: ENVIRONMENT_FALLBACK` that every production
build printed (confirmed by building with the directory moved aside).

**Prompt:**

```
Delete app/(dev) — both preview pages plus their demo components — and clean up what
referenced them: the /dev-preview and /storefront-dev-preview entries in app/robots.ts,
the "dev-preview routes" mention in proxy.ts's comment, and the two `app/dev-preview/...`
paths in AGENTS.md (already stale — the files moved into app/(dev) since). Confirm the
production build no longer prints ENVIRONMENT_FALLBACK, and note in DEPLOYMENT.md
section 10 items 2 and 9 that the error and the two routes are gone.
```

### Task 26.7 — Make the navbar search actually search ✅

**Decision: a suggestions panel under the input, not a results page.** The two things in
the repo disagreed about this. `GET /api/storefront/search` returns at most five products,
five categories and five brands, with no paging and no totals — a typeahead's shape, with
nothing for a results page to page through. The skipped E2E spec, meanwhile, asserted
`toHaveURL(/search/)`. Nothing in `design/storefront/` draws either one; the design files
show the input and stop. The panel was chosen because it is what the endpoint already
answers, and because a results page would have meant inventing both an API contract and a
screen.

`components/storefront/NavbarSearch.tsx` is the search box and its panel, lifted out of
`Navbar.tsx` (which had grown to hold the form, its state, and five icons). It debounces
at 250ms and tags each response with the query and scope that produced it, so "loading" is
derived rather than stored and the panel can never show the previous query's hits against
the current text. An `AbortController` cancels the in-flight request on every change,
which also settles the out-of-order-response problem.

Results link somewhere real: products to `/products/<slug>`, categories to
`/products?category=<name>` — the listing already resolved that param by name, for the
footer's Shop links. Brands had no destination at all, so `ProductsContent` learned
`?brand=<name>` the same way, seeding the brand checkbox instead of the request (brand is
a client-side filter there). That is the one change outside the search itself.

**What it doesn't do:** no arrow-key navigation through results, and Enter doesn't jump to
the first hit — it just opens the panel, since there's nowhere else to go. The panel is a
labelled region with grouped lists of links and an `aria-live` count, rather than an ARIA
combobox, because a combobox must own a `listbox` and these rows are links.

**Verified**: manually in both locales — the panel renders grouped results, RTL mirrors
correctly under `/fa`, the scope select narrows the groups, and a brand result lands on
`/products?brand=Sony` with the Sony checkbox already ticked. The `test.fixme` in
`e2e/storefront/search.spec.ts` is now two real tests (results and navigation; the
no-results message and Escape), and the suite runs **12 passed, 0 skipped** against a
production build.

**Prompt:**

```
The navbar search box submits nowhere — handleSearchSubmit is a no-op pointing at Task
17.1, which shipped without it. The GET /api/storefront/search endpoint exists and is
tested. Wire the box up, un-skip e2e/storefront/search.spec.ts, and make sure every
result has somewhere to go.
```

---

# Part 3 — Deployment (done, waiting on a server)

## Phase 25 — Deployment ✅

**All five tasks are done; what's left needs a server.** The phase was written as
deferred because there was no VPS, and there still isn't one — but every task turned out
to be work that could be finished and verified locally, so it was. What remains is
executing `DEPLOYMENT.md` against a real box, plus the items in its section 10 that only
a running server can answer (backups actually running, TLS, the live-site probes). The
original list named ArvanCloud; that provider choice is still open.

Phase 14 already produced a working generic-VPS setup (`Dockerfile`,
`docker-compose.prod.yml`, `nginx/`, `DEPLOYMENT.md`), so much of this is
adaptation rather than new work:

- **25.1** — largely satisfied already. The Dockerfile is multi-stage with a non-root
  `nextjs` user and `EXPOSE 3000`, `.dockerignore` exists, and `output: 'standalone'`
  is set in `next.config.ts`.
- **25.2** — done. Self-hosted Postgres; the stack was actually run and verified.
- **25.3** — done. Security headers are live, the HTTPS block ships as an activatable
  file instead of a commented-out one, and the cached-upstream 502 is fixed.
- **25.4** — done. The runbook now covers provisioning through day-2 operations, and
  creating the first admin user, which nothing had accounted for.
- **25.5** — done. The checklist is written and every item that can be run without a
  VPS was run; three defects only a production build shows were fixed.

### Task 25.1 — Production Dockerfile ✅

```
Add `output: 'standalone'` to next.config. Multi-stage Dockerfile: deps (pnpm install),
build (pnpm build), runner (standalone output + static + public, non-root user, EXPOSE
3000, CMD node server.js). Add .dockerignore.
```

### Task 25.2 — docker-compose for the chosen host ✅

**Decision: self-hosted `postgres:16` in the compose stack, not a managed database.**
No provider is chosen, so a managed instance would mean writing `DATABASE_URL`, its
TLS mode and the backup routine against a placeholder; the container runs on any
generic VPS and is what DEPLOYMENT.md section 7's `pg_dump` routine already assumes.
The cost is that backups and major-version upgrades are self-run.

Phase 14 had already written the three services, but — as with 25.1 — nobody had run
them. Doing so turned up three defects:

- **`.env.production` shipped inside the image.** `.dockerignore` excluded `.env` and
  `.env*.local` but not `.env.production`, and `next build` copies any `.env*` it finds
  into `.next/standalone`. `DATABASE_URL` and `JWT_SECRET` were readable out of the
  published image with one `docker run --entrypoint sh`. Now excluded.
- **The canonical site URL only worked because of that leak.** `next build` inlines
  `NEXT_PUBLIC_*` into the server chunks, so `NEXT_PUBLIC_SITE_URL` is a build-time
  value; `env_file` at container start is too late. Removing the leaked file alone
  would have silently reverted every JSON-LD absolute URL to `http://localhost:3000`.
  It's a build argument now, passed from `.env.production` — which is also why every
  compose command in DEPLOYMENT.md gained `--env-file .env.production`.
- **The dev and prod stacks shared a database volume.** Both compose files live in
  `technotopia/` and both name their volume `postgres_data`, so both resolved to
  `technotopia_postgres_data` — the prod stack mounted the dev database, and
  `--remove-orphans` on one deleted the other's container. The prod file now sets
  `name: technotopia-prod`.

**Verified** on a rebuilt stack against a fresh volume: postgres reaches `healthy`
before `app` starts, the entrypoint applies all 10 migrations and only then serves,
`/en` returns 200, postgres is unreachable from the host, nginx is up on 80/443, the
`./uploads` bind mount round-trips, and the image no longer contains any `.env` file
while the built chunks carry the real site URL.

**DoD:** Decide upfront: self-hosted Postgres container, or a managed database. ✅

**Prompt:**

```
docker-compose.prod.yml: app service + nginx service. Postgres: self-hosted postgres:16
with a named volume, not exposed publicly. App service runs `prisma migrate deploy` on
start before serving traffic.
```

### Task 25.3 — Nginx reverse proxy config ✅

Root `nginx.conf` is now `nginx/nginx.conf` plus `nginx/conf.d/`, and both are mounted
into the `nginx` service. Three things were wrong with the old single file:

- **The security headers only existed inside the commented-out HTTPS block**, so every
  response nginx served — the whole pre-certificate deploy included — carried none of
  them. They're now `add_header ... always` at the `http` level, where both server
  blocks inherit them. That placement is load-bearing: `add_header` does not merge
  across levels, so one `add_header` inside a server or location block would silently
  drop all three. Both config files say so, because the failure is invisible.
  `server_tokens off` came along with them. `Strict-Transport-Security` is deliberately
  **not** set — browsers cache it for the full max-age with no way to withdraw it, so it
  belongs after the certificate and its renewals have run for a while, not on day one.
- **The HTTPS server block was 25 lines of comment**, activated by uncommenting it on
  the server, with the domain kept in sync by hand across a live block and a dead one.
  It's a real file now, `nginx/conf.d/https.conf.disabled`, activated with a `cp` to
  `https.conf` (gitignored, so `git pull` never fights it). It can't simply ship active:
  nginx refuses to start when `ssl_certificate` points at a file that doesn't exist,
  and the certificate only exists after certbot has run. Gained `http2 on` and session
  caching while it was being rewritten.
- **The cached upstream**, as diagnosed in 25.2. `upstream app { server app:3000; }` is
  gone in favour of `resolver 127.0.0.11 valid=10s ipv6=off;` and a variable
  `proxy_pass`. The second effect matters as much as the re-resolution: the old form
  also refused to *start* when `app` was down (`host not found in upstream`), so a
  broken app container took nginx with it.

**Verified** against a real `nginx:alpine` on a Docker network, with a self-signed cert
and a stub backend named `app`: the shipped pre-certificate state boots, answers the
ACME challenge over HTTP, 301s everything else, and leaves 443 unbound; with the HTTPS
block activated, `nginx -t` passes and a request returns HTTP/2 200 through the proxy
with all three security headers and the correct `Host`/`X-Forwarded-For`/
`X-Forwarded-Proto`, path and query string intact. For the upstream fix specifically:
nginx started while no `app` container existed (the old form fails `nginx -t` outright),
served a clean 502, picked up `app` when it appeared — and after `app` was destroyed and
recreated on a different IP (172.22.0.3 → 172.22.0.6) kept serving 200 with no restart
and no reload.

DEPLOYMENT.md sections 2–5 follow the new layout: the `restart nginx` workaround in
section 4 is deleted, and section 3 no longer claims the site is browsable over HTTP
before the certificate exists — it isn't, the HTTP block 301s everything but the ACME
challenge, and a `301` from `curl -I` is the thing to check instead.

**DoD:** gzip, the three security headers, an ACME challenge block, and an HTTPS block
ready for a cert. ✅

**Prompt:**

```
nginx.conf proxying to the app on port 3000: gzip, security headers (X-Frame-Options,
X-Content-Type-Options, Referrer-Policy), HTTP block for certbot ACME challenge + redirect
to HTTPS, HTTPS block ready for a cert.
```

### Task 25.4 — Deployment runbook ✅

Sections 1-7 of DEPLOYMENT.md already covered most of the brief — Phase 14 wrote them
and 25.1-25.3 kept them current. So this was about what the runbook was still missing,
and one thing it got wrong.

**The gap that mattered: a fresh deploy has no way in.** `prisma migrate deploy` creates
the schema and nothing else, so the production database comes up with zero rows in
`User` and nobody who can log into `/admin`. The runbook never said so, and the obvious
fallback doesn't exist: `prisma/seed.ts` needs `tsx` and the devDependencies, neither of
which is in the runner image, and it would insert demo catalog data next to a
`password123` admin anyway. Section 3 now ends with a bootstrap that creates the account
in Postgres directly, using `pgcrypto`'s `crypt(..., gen_salt('bf', 10))` — a `$2a$`
bcrypt hash, which is what `bcryptjs` verifies at login — plus the `UPDATE` form for
rotating it later, since the admin panel has no change-password screen.

**What it got wrong: section 2 told you to edit a tracked file.** Replacing
`your-domain.com` in `nginx/nginx.conf`'s `server_name` left a local modification to a
tracked file, which is exactly what makes section 4's `git pull` refuse to fast-forward
the next time that file changes upstream — the problem 25.3 had already solved for
`https.conf` and reintroduced here. The edit also bought nothing: each block is the only
one listening on its port, so it is that port's default server and answers every request
whatever the `Host` says. Both blocks now ship `server_name _`, and the activated HTTPS
copy's two `ssl_certificate` paths are the only lines anyone edits on the server.

**Object storage: no bucket, and that is now written down** (section 8). Images go to the
VPS's own disk — the upload route writes `public/uploads` and stores a root-relative
path, `docker-compose.prod.yml` bind-mounts `./uploads` over it. The section records what
that costs (one machine's disk, no CDN, only as safe as the backup routine) and that
moving to a bucket is not a configuration change: `uploadedImagePathSchema` enforces
`/^\/uploads\//` server-side, so it needs schema, route, env, `next.config.ts` and a data
migration. Nothing here assumes a bucket, and none has to be created to go live.

Also added: server sizing and swap (the image is built *on the box*, and `next build` is
what the OOM killer comes for); the `ufw` caveat that Docker's iptables rules sit ahead
of ufw's chains, so a `ports:` entry is internet-reachable whatever ufw says — harmless
now, dangerous the moment someone publishes 5432 to poke at the database; `chmod 600
.env.production`; a single maintenance script (backup + certbot renewal + image prune)
behind one cron entry, which is also how `date +%F` avoids crontab's `%` escaping; and a
day-2 section listing the failures that actually happen, each traced to the config that
produces it. Section 6 now flags that restoring a dev dump carries the seeded
`password123` admin into production.

**Verified**, since a runbook is only as good as its commands: the bootstrap SQL was run
against `postgres:16` with the real migrations applied — 0 users after `migrate deploy`,
insert lands `ADMIN`/`ACTIVE` with a `$2a$10$` hash, and `bcryptjs.compare` returns true
for the password and false for a wrong one, before and after the rotation `UPDATE`. Both
nginx states parse and boot with the `server_name _` change: shipped (HTTP only), and
with `https.conf` activated against a self-signed cert — TLS serves, all three security
headers are present on both vhosts, `server_tokens off` holds, and the HTTP block 301s.
The compose error quoted in the day-2 list is the real string from a run with the env
file withheld, and the maintenance script passes `sh -n`.

**DoD:** a runbook someone can follow start to finish on a bare Ubuntu box. ✅

**Prompt:**

```
DEPLOYMENT.md: creating the server (Ubuntu), installing Docker + Compose, firewall rules
(80/443/22 only), non-root deploy user, cloning the repo, production .env values, certbot
certificate, `docker compose -f docker-compose.prod.yml up -d --build`, redeploy procedure
(pull/rebuild/migrate/restart). Document object storage bucket setup too if product images
go there instead of local disk.
```

### Task 25.5 — Go-live checklist ✅

`DEPLOYMENT.md` section 10 is the checklist: ten items, each with the command that
proves it and what a failure means. Writing it meant running everything that can be run
without a server, which is where the value was — three of the briefed confirmations
failed, and all three failed only in a production build.

**The E2E suite could not run against a production build at all.**
`playwright.config.ts` hardcoded `pnpm dev`, and the obvious substitute doesn't exist:
`next start` refuses to serve a build with `output: "standalone"` — and it says so
_after_ logging "Ready", so it looks like it worked. `E2E_PROD=1` now builds, assembles
the standalone output the way the Dockerfile's two COPY steps do (the static chunks and
`public/` are left outside `.next/standalone`, so without them the server boots and
404s every asset), and serves it with `node server.js`, the container's own entry point.
It also refuses to adopt an existing server on port 4000: reusing the dev server would
produce a green run of the wrong program, which is the one thing this mode exists to
prevent. Result — **10 passed, 1 skipped**, the skip being a documented `test.fixme` for
the navbar search box, which submits nowhere.

**`og:image` pointed at localhost, for every visitor.** No `metadataBase` was set, so
Next resolved the product page's relative `/uploads/<file>` against its fallback of
`http://localhost:<port>` — not against the request's host, so it is wrong identically
for everyone, and ISR caches the page with that URL in it. Phase 23 didn't catch it
because `next dev` on localhost makes the fallback look right, and the warning is only
printed by a production build. Now set from `SITE_URL` in `app/[locale]/layout.tsx`.

**`X-Powered-By: Next.js` was on every response**, alongside an nginx that 25.3 had
already given `server_tokens off`. `poweredByHeader: false` turns off the other half.

Two findings that are not blockers, written into the checklist as such:

- **The production build prints `Error: ENVIRONMENT_FALLBACK`.** It comes from
  `app/(dev)` — confirmed by building with that directory moved aside. Those two preview
  pages also turn out to be unreachable in _every_ environment, dev included: `proxy.ts`
  routes everything outside `/admin` through next-intl's middleware, which rewrites
  `/dev-preview` to `/en/dev-preview`, and the pages live outside the `[locale]` tree.
  What ships is two prerendered pages nobody can open. Deleting them is Task 26.6.
- **pgcrypto cannot answer "is the admin password still `password123`?"** The obvious
  query — `WHERE "passwordHash" = crypt('password123', "passwordHash")` — silently
  returns nothing: `crypt()` doesn't understand the `$2b$` hashes `bcryptjs` writes, only
  the `$2a$` ones it writes itself. (25.4's bootstrap is unaffected; that direction —
  bcryptjs verifying a `$2a$` hash — works, and was verified there.) The checklist POSTs
  to `/api/auth/login` instead, which uses the application's own bcrypt and answers the
  question end to end.

**Verified**, item by item:

- **E2E against the production build**: 10 passed, 1 skipped, run against
  `node .next/standalone/server.js`. `pnpm lint`, `pnpm tsc --noEmit` and `pnpm test`
  (244 tests) clean.
- **No secrets in the image**: built it and looked. `/app` holds no `.env`, it runs as
  `uid=1001(nextjs)`, the build-arg site URL is present in the server chunks _and_ in the
  prerendered `en.html` (so changing it really does need a rebuild), and the dev database
  password appears nowhere. That `.dockerignore` rule is load-bearing rather than
  theoretical: the local `next build` does write `.next/standalone/.env`.
- **The default-password probe detects what it claims to**: a POST of
  `admin@technotopia.com` / `password123` returns 200 against the seeded database and 401
  for a wrong password. The pgcrypto query returns zero rows for that same account.
- **SEO absolute URLs**: with `NEXT_PUBLIC_SITE_URL` unset, `sitemap.xml`, `robots.txt`
  and every canonical emit `http://localhost:3000`; rebuilt with it set, those three plus
  `og:image` emit the real origin.
- **Backups**: not verifiable without a server, and the checklist says so — it requires
  the maintenance script be run once by hand and its dump listed with `pg_restore -l`,
  rather than treating a crontab line as proof.

**DoD:** a checklist someone can work through before pointing the domain at the box, with
every item that doesn't need a server already run. ✅

**Prompt:**

```
Before pointing the domain here: confirm Phase 23 (SEO) is done, run the E2E suite (24.1)
against the production build, confirm no dev/test secrets leak into env vars, confirm the
admin password isn't a seed/default value, confirm backups are configured for whichever
Postgres setup was chosen in 25.2.
```

---

# Part 4 — Storefront UI/UX overhaul

The phase-by-phase list lives in `technotopia-storefront-ux-tasks.md` (Phase 27 onward).
Only decisions that outlive their task are recorded here.

## Phase 30 — The buying flow

### Task 30.1 — A cart that works logged out ✅

**Decision: the server-side `Cart` and `CartItem` tables are retired. The browser holds
the only cart, for signed-in customers as much as for visitors, and an existing
customer's rows were dropped with the tables.**

The alternative was to keep them as a signed-in customer's cross-device cart and merge
the local snapshot into them on login. Both are defensible; this is why the tables went.

- **A guest cart is not optional, so the browser path has to exist either way.** Keeping
  the tables means shipping *both* paths plus a merge rule (sum the quantities, or take
  the larger? cap at stock at merge time, or at checkout?) and two sync directions to
  keep honest. Every one of those is a place for the two carts to disagree, and the
  disagreement is invisible until a customer sees a quantity they did not choose.
- **What the second cart buys is one feature — the cart following a customer between
  devices — and nothing else.** That is worth real money to a store with a phone app and
  a repeat-purchase habit. It is not worth two sources of truth here, and it can be added
  later on top of the browser cart without being unpicked first: a `SavedCart` row keyed
  by user, written on change and read on login, is additive.
- **The rows were not worth preserving.** They were 32 carts and 4 items of local
  development data. On a live store this decision would need an export first; here it
  needed a migration comment, which `20260908000000_retire_server_side_cart` carries.

**What this changed beyond the cart itself.** `createOrder` used to read the cart out of
the database inside its own transaction, so retiring the tables moved checkout's lines
into the request body — as ids and quantities only. The server re-reads name, price,
discount and status from the catalog and re-checks stock, so a hand-edited body buys
nothing at a price it invented; a route test asserts exactly that. Clearing the cart is
now the browser's job, done after the order comes back.

**The shape of it.** The cart is a persisted Zustand store holding `productId`,
`quantity`, `addedAt` and the unit price it went in at. The captured price is the one
field beyond the three the task named: the reconciliation route receives only ids, so
`priceChanged` has nothing to compare against unless the snapshot carries it. Public
`GET /api/storefront/cart?ids=a,b,c` answers with the catalog's current truth for those
ids — including products that have been deactivated, marked unavailable rather than
omitted, so the page can say what happened instead of quietly shrinking. The four rules
(`unavailable`, `outOfStock`, `exceedsStock`, `priceChanged`) are pure functions in
`lib/storefront/cart.ts` with 30 unit tests, and the store, the cart page and the route
all read from that one module.

**DoD:** a logged-out visitor can add, change and remove; the cart survives a reload and
a browser restart; a product that went out of stock while it sat there says so; the
decision above is written down and implemented. ✅

**Verified:** `pnpm lint`, `pnpm tsc --noEmit` and `pnpm test` (291 tests) clean; the
migration applied to the dev database. A new E2E fills a cart with no account, changes
the quantity, reloads, reopens it in a fresh browser context carrying the same stored
state, and removes it — and the existing sign-up-to-confirmation checkout still passes
end to end against the browser cart. In the running app, zeroing one product's stock and
repricing another mid-cart produced "Out of stock — remove it to check out." and "The
price changed to ۱٬۴۹۹ ریال.", with the out-of-stock line dropping out of the total.

One unrelated pre-existing break was fixed to get there: `e2e/storefront/shopping.spec.ts`
matched `getByRole("link", { name: "Shop" })`, which stopped being unique when Task 29.3
gave the home page category cards that read as "<Category> Shop" links.

### Task 30.2 — A mini-cart in the header ✅

**Decision: the header cart is a button, not a link.** Pressing it opens a summary panel;
the panel carries the only link to `/cart`. The cart page is one predictable step away
either way, and making the trigger a link as well would have meant a control that both
navigates and opens — the thing that has to answer "did that work?" cannot also be the
thing that leaves the page.

That is what forced the second decision, which is the one that outlives the task: **the
storefront header now has two shapes.** Below `md` the bar keeps three controls — menu,
wordmark, mini-cart — and the search wraps underneath; the section links, wishlist,
account, language switch and theme toggle move into a drawer, which also carries its own
plain link to the full cart. From `md` up they come back onto the bar. The cart is the
only control that is in both, because it is the only one that has to be able to answer an
add wherever the customer is standing. Anything added to the header from here needs a home
in both shapes, or it exists only on a desktop.

**The shape of it.** The store gained one field, `lastAddedAt`, bumped by `addItem` and by
nothing else — the count could not be the cue, because it also moves on a removal and does
not move at all when a line was already at its ceiling. `MiniCart` subscribes to the store
rather than rendering on that field, so the panel opens as a reaction instead of as a
second render chasing the first. The panel prints quantity and unit price per line and the
reconciled subtotal, and deliberately no per-line total: `lineTotal` is what can actually
ship, which for a line whose stock has fallen is not quantity times price, and a summary
is the wrong place to open that conversation — the cart page is where a line explains
itself. Dismissal (pointer outside, focus outside, Escape) is one hook,
`lib/storefront/useDismissable.ts`, shared by the panel and the drawer, which is also what
stops both hanging off the header at once.

**DoD:** adding from a product card opens the panel without leaving the page; the panel
carries the link to `/cart`; the badge reflects the store at every width; the full cart is
reachable from the drawer. ✅

**Verified:** `pnpm lint`, `pnpm tsc --noEmit`, `pnpm test` (291) and `pnpm build` clean;
all 13 E2E pass. In the running app: adding from a card opened the panel with the badge at
4 and "and 1 more product" under three lines; both themes, both locales, and 375px and
1280px checked, with the panel inset 24px from both edges on a phone and anchored to the
trigger's start edge in RTL.

`e2e/storefront/shopping.spec.ts` moved with it: it used to reach the cart page through
`getByRole("link", { name: "Cart" })` in the header, which is now a button, and it asserts
the panel is open and the URL has not changed before following "View Cart".

### Task 30.3 — The cart page ✅

**Decision: a line that ships nothing stops the order; a line that ships less does not.**
The cart already said "remove it to check out" under an out-of-stock line while leaving
the checkout button live, and `orderableLines` quietly dropped that line from the order.
One of the two had to give. Blocking is the half that keeps the promise: an order missing
a product the customer believes they bought is discovered after payment, and the sentence
already asks for the removal. `exceedsStock` is deliberately not in that class — it ships
what is on the shelf and the note says so — and `priceChanged` blocks nothing, because
checkout settles the price against the catalog rather than the snapshot. The rule is one
function, `cartBlocker`, next to the totals it has to agree with.

**Decision: four states, not two.** A cart is unread, unchecked, uncheckable or checked,
and only the last of them may say a word about stock or price. Collapsing them is what the
page used to do, and it had two consequences that only showed up on a slow or broken
lookup: for the length of the first round trip every line rendered as "This product is no
longer listed", and a lookup that failed left that showing permanently — the store turned
a failure into an empty entry list, which reconciles to "everything is gone". The store now
records which ids its answer covers (`entriesKey`) separately from whether the last attempt
succeeded (`lookupFailed`), `pendingCart` renders the browser's own snapshot with no claims
attached, and the failure gets a panel with a retry rather than six confident lies.

**What fell out of that.** Two mutations stopped asking the catalog anything: a quantity
change asks a question whose answer has not moved, and a removal cannot invalidate what was
learned about the other lines, so its held entries are pruned instead of thrown away. Both
used to refetch, which on this screen means every line's state blanking for a round trip —
on the one page whose whole job is to keep saying what is wrong with each line. Adding a
product the answer does not cover is the only mutation that still fetches.

**The shape of it.** Three files, the way topoil splits it: `useCartLines` decides what the
screen may claim, `CartLineRow` says one line's state, and `CartContent` composes them and
holds no arithmetic at all — every figure on it comes from `lib/storefront/cart.ts`. The
stepper's ceiling is now the shelf, so raising a line past what is left is not offered and
`exceedsStock` can only mean stock fell under a quantity already stored. A blocked row
carries a `bg-danger-soft` wash, drops its stepper (remove is the only move left) and
prints "Not included" where its money would be; a short row keeps both and prints the
`2 × …` its total is actually for. Notes are toned by how much they stand between cart and
order: danger, warning, info.

**DoD:** every line state — available, unavailable, out of stock, quantity above what is
left, price changed — has a visible, translated treatment; totals come from the pure
module and match its tests; the page renders correctly with good and problem lines mixed. ✅

**Verified:** `pnpm lint`, `pnpm tsc --noEmit`, `pnpm build` clean; `pnpm test` 305 (14 new
over `pendingCart`, `cartBlocker` and `cartIdsKey`); all 13 E2E pass. In the running app, a
six-line cart holding one good line, a repriced one, one above stock, one out of stock, one
deactivated and one id the catalog has no row for rendered all six at once with a subtotal
of ۸٬۲۱۵ — 2249 + 1598 + 4368, the three lines that can ship — and checkout disabled under
"An item in your cart is out of stock. Remove it to continue." Both themes, both locales
and 375px checked. Forcing the lookup to 400 produced the failure panel and its retry, and
the retry put the page back into "Checking availability…" rather than into a cart of
products that no longer exist.

### Task 30.4 — Guest checkout (schema change) ✅

**Decision: `Order.customerId` is nullable and the order carries its own guest contact; there
is no stub user per guest.** A stub `User` needs a `passwordHash` that can never log in, and
every one of them lands in the admin Customers list as a row nobody can reach — the same reason
topoil rejected it.

**Decision: one new column, not topoil's three.** Topoil added `guestName`, `guestPhone` and
`guestEmail` because its `Order` held no contact of its own. Ours already stores `fullName` and
`phone` from the checkout form on every order, so for a guest those _are_ the name and phone;
copying them into `guest*` columns would give each guest order two names that can disagree.
`guestEmail` is the one detail an account supplied that the row did not hold. It is nullable:
whether checkout requires it is Task 30.5's call, and the admin already copes without it.

`onDelete: Restrict` stays spelled out, because Prisma's default for an optional relation is
SET NULL — which would quietly turn a deleted customer's order into a guest order with no email.
The migration drops NOT NULL and leaves the foreign key alone.

**What the admin reads.** `OrderListItem` gained `isGuest`; a guest row's `customerName` is the
`fullName` typed at checkout, marked with a "Guest" chip in the Orders list and the dashboard's
recent orders. On the detail, `customer.id` is null for a guest and name, phone and email come
off the order; the card carries the same chip and omits a missing email. Search used to go only
through the customer relation, so a guest order could never be found — it now also matches
`fullName` and `guestEmail` on orders with no customer, while registered orders still match on
the account as before. Counts needed nothing: the dashboard's total and revenue count every
order, and a customer's order count only ever counted their own. The detail page has no customer
link — the wireframe's Customer card is name, phone and email — so there was none to guard.

**Not in this task.** `createOrder` still takes a customer id and the order POST still requires
a session; opening it to guests is 30.5.

**DoD:** `customerId` is optional, `Order` carries its guest contact, the migration applies; the
admin Orders list, order detail and dashboard render a guest order; the existing order tests
pass. ✅

**Verified:** `pnpm lint` and `pnpm tsc --noEmit` clean; `pnpm test` 308 (3 new: a guest order
listed under its checkout name and found by its email, found by that name, and its detail with a
null customer id). `20260910122020_guest_orders` applied to the dev database, `prisma generate`
run, `prisma migrate status` up to date, dev server restarted. In the running app a guest order
cloned from a seed order rendered in the Orders list, its detail page and the dashboard, with
every admin data request answering 200, and was deleted afterwards.

### Task 30.5 — The checkout screen ✅

**Decision: a signed-in customer keeps their order page; a guest's receipt is handed over.** The
order POST now answers with the receipt itself (`PlacedOrder`: id, total, `isGuest`). A signed-in
customer goes to `/orders/[id]/confirmation`, which reads the database and links to tracking, as
before. A guest has no page they could open — that lookup is scoped to an owner, and a guest order
has none — so the response is kept in sessionStorage (`lib/store/receipt.ts`) and shown at
`/checkout/confirmation`, without the Track link. sessionStorage rather than localStorage: a reload
keeps it, the next person at the browser does not find it. Both screens render one `OrderReceipt`.

**Decision: one delivery method, named in `lib/storefront/delivery.ts`.** The design shows a single
flat-rate row, and a choice would need a field on the checkout schema, which this task keeps
unchanged. `STANDARD_DELIVERY_COST` and `deliveryCost()` are read by `cartTotals` (so the summary),
by `createOrder` and by the home page's trust strip; `SHIPPING_FLAT_RATE` is gone.

**Decision: no email from a guest.** `guestEmail` stays null. 30.4 left it optional, this task keeps
the schemas as they are, and the receipt is handed over rather than mailed; the courier calls the
phone number every order already stores.

**What "the totals match" actually needed.** The server rounded each *line*
(`round(price × (1 − d) × qty)`) while every screen rounds the *unit* and multiplies, so 25% off
1999 at quantity 2 read 2998 on the summary and was stored as 2999. `createOrder` now takes its unit
price from `toDisplayPrice`, the function the cart lookup uses, and a route test builds the summary
from the real lookup and asserts the stored total equals it.

**Who is ordering.** `getCustomerId` (`lib/auth/guard.ts`) reads the verified cookie: a CUSTOMER
session orders as that customer; no session, an invalid one or a staff login orders as a guest.
Nothing is read from the body — the schema has no such field, and a test posts another customer's
id to show it lands nowhere.

**The rate limit, and the address it keys on.** The POST spends from a ten-an-hour per-address
allowance before the body is parsed or the database asked anything. Getting there exposed that
`getClientIp` keyed on the *first* X-Forwarded-For entry, which behind nginx's
`$proxy_add_x_forwarded_for` is whatever the client sent — so this limit, and login's, could be
walked around by varying it. It now prefers X-Real-IP (nginx sets it to `$remote_addr`) and falls
back to X-Forwarded-For's last hop. Playwright sends a per-run X-Real-IP, because the reused dev
server keeps its limiter between runs.

**Fixed on the way.** The payment radios were never registered with the form, so a guest choosing
bank transfer still submitted CARD; they are registered now and the chosen card is painted from
`:checked`. A refused order printed the server's English message on the Farsi screen in raw
`red-50`; it is now a translated reason keyed on the status, in the danger tokens, and a 409
re-reads the catalog so the summary can say which line moved. The summary prints no figure until
the catalog has answered. Signing in is offered through `/login?next=/checkout`, and login follows
a same-site `next` only (`safeReturnPath`).

**DoD:** a visitor with no account completes a purchase and signing in is offered; the order POST
is rate-limited per IP before any database work; who is ordering comes from the session or is a
guest; a guest's receipt is handed over; delivery is named once and shared; the stored totals equal
the summary's; payment methods and Zod schemas are unchanged. ✅

**Verified:** `pnpm lint` and `pnpm tsc --noEmit` clean; `pnpm test` 326 (18 new: the checkout
module, `safeReturnPath`, `getClientIp`, and route tests for a guest order, a body naming another
customer, a staff session, the limit tripping before the database, and totals parity). All 15 E2E
pass against the production build, which is also the `pnpm build` check — 2 of them new: a guest
checkout to a receipt that survives a reload, offers no Track link and leaves the cart empty, and
signing in from checkout coming back to it with the name filled in. Neither suite leaves orders
behind. In the running app, the Farsi guest checkout at 375px in the dark theme, and the
no-receipt state of `/fa/checkout/confirmation`.

### Task 30.6 — The add-to-cart control on the PDP ✅

**Decision: notify-me lands in a `StockNotification` table, read in the Inventory stock modal.**
Asked before building: nothing on the admin side could receive the capture, and there is no email
or SMS sender. The smallest model that works is one row per request — `productId`, `contact` (an
email or a phone number, one field), `notifiedAt` (null while pending). The admin sees who is
waiting inside the stock-edit modal they already open to restock (`RestockRequests`), reaches each
contact by hand through a mailto:/tel: link, and presses "Mark N as notified", which stamps exactly
the ids on screen, so a request that arrived while the modal was open stays pending. This is the one
addition beyond the wireframe, approved for this task. Rows cascade with their product.

**The capture.** `POST /api/storefront/products/[slug]/notify-me`, public, ten an hour per address
before the database is asked anything. It records only while the product is out of stock: asking
about something already back gets `alreadyInStock` and no row, so nobody lands on the admin's list
to be told twice. The same contact asking again while pending is one request. Contacts are stored
in one spelling (emails lowercased, phone separators stripped, Persian and Arabic-Indic digits read
as ASCII), because a phone number typed on the Farsi storefront would otherwise never validate.

**Every inventory state has a defined control** (`pdpAddLimit` in `lib/storefront/cart.ts`, pure and
unit-tested): buyable gets a stepper bounded by stock less what the cart already holds (and the
99-per-line cap), with "N already in your cart" when that is why it stops short. Out of stock gets
a disabled "Out of Stock" button, the reason, and the notify-me form. All of it in the cart, or a
cart at its 50-product limit, gets a disabled button, the sentence saying which, and a link to the
cart. The last two were real dead buttons: `addToStoredCart` silently refuses both. Each disabled
button points at its reason with `aria-describedby`.

**The badge states the real state.** The PDP now carries `stock` (the cart lookup already exposes it
for any id, so it is no new disclosure); low stock reads "Only N left" instead of "Low stock".

**A restock refreshes the PDP.** The page is ISR-cached for five minutes, which would have told the
people just contacted that the product was still out of stock. The inventory PATCH now revalidates
`/en` and `/fa` for that product's slug.

**DoD:** the stepper is bounded by stock; the badge states the real state; unbuyable states show a
disabled control with a stated reason; out of stock offers notify-me with a confirmed destination;
no state leaves a button that does nothing. ✅

**Verified:** `pnpm lint` and `pnpm tsc --noEmit` clean; `pnpm test` 348 (22 new: the contact schema,
`pdpAddLimit`, the notify-me route — recorded, deduped, in stock, inactive, invalid, rate limit — and
the admin notifications route, including that marking stamps only the ids given and that a restock
revalidates both locales). `pnpm build` succeeds. The migration applied to the dev database. In the
running app: the English low-stock PDP reads "Only 6 left", the stepper stops at 6, and after adding
them the button is disabled with its reason and a cart link; the Farsi out-of-stock PDP shows the
disabled control, the reason, and takes a phone number typed in Persian digits (201). The admin modal
was not exercised in a browser (it needs an admin sign-in); its route is covered by the tests above.

## Phase 32 — The little issues

### Task 32.5 — Measure it ✅

**There was no baseline.** No Lighthouse run was captured before Phase 27 or Phase 28, and
nothing in the repo or its history records one. The "before" columns below were measured
**today, after the fact**: the commit before 27.1 (`58cafb1`), the end of Phase 27 (`b0f3895`)
and the end of Phase 28 (`f11e636`) were each built in a worktree and run against the same dev
database as HEAD, on the same machine, with the same Lighthouse. They are real measurements of
the old code, but they are not a record from the time. The catalog columns those commits read
(`Product`, `Category`, `Brand`, `Banner`) have not changed since, so the old builds render
today's data as it is.

**Method.** Lighthouse 12.8.2, Chrome 152, the mobile preset (412px wide, 4× CPU, 150 ms RTT /
1.6 Mbps) with `throttlingMethod: devtools`, one warm-up run and then the median of three.
Each build ran as `node .next/standalone/server.js`, the Dockerfile's entry point. The PDP
tested is `roads-led-panel-kit`, the only product with an image. Bytes are transfer sizes from
Lighthouse's network log. "Names in HTML" counts how many of the 8 active product names appear
in the raw HTML outside `<script>`.

Lighthouse's default simulated throttling was not usable on this machine. Headless Chrome's
first paint stalls for about 0.9 s in roughly half of all runs, whatever the build. The
simulation reads the stall as real work, so simulated LCP swung by up to 1.3 s on identical
builds. Devtools throttling measures LCP directly, and its three runs usually landed within
150 ms of each other.

**Now (HEAD `02ee9c1`):**

| Page | Locale | LCP   | CLS  | Fonts            | Images          |
| ---- | ------ | ----- | ---- | ---------------- | --------------- |
| Home | en     | 2.9 s | 0.00 | 1 file, 26.9 KB  | 1 file, 11.9 KB |
| Home | fa     | 3.1 s | 0.00 | 2 files, 79.4 KB | 1 file, 11.9 KB |
| PLP  | en     | 2.3 s | 0.00 | 1 file, 26.9 KB  | none            |
| PLP  | fa     | 2.3 s | 0.00 | 2 files, 79.4 KB | none            |
| PDP  | en     | 4.6 s | 0.00 | 1 file, 26.9 KB  | 1 file, 18.1 KB |
| PDP  | fa     | 4.8 s | 0.00 | 2 files, 79.4 KB | 1 file, 18.1 KB |

**Across the phases** (en / fa):

|                     | Before 27 `58cafb1` | After 27 `b0f3895` | After 28 `f11e636` | Now `02ee9c1` |
| ------------------- | ------------------- | ------------------ | ------------------ | ------------- |
| Font files          | 4 / 4               | 1 / 2              | 1 / 2              | 1 / 2         |
| Font KB             | 92.7 / 92.7         | 26.9 / 79.4        | 26.9 / 79.4        | 26.9 / 79.4   |
| Names in HTML, home | 0                   | 0                  | 8                  | 8             |
| Names in HTML, PLP  | 0                   | 0                  | 8                  | 8             |
| Names in HTML, PDP  | 2                   | 2                  | 2                  | 2             |
| Home LCP (s)        | 5.2 / 5.3           | 4.9 / 5.3          | 2.8 / 2.9          | 2.9 / 3.1     |
| Home CLS            | 0.62 / 0.62         | 0.62 / 0.62        | 0.00 / 0.00        | 0.00 / 0.00   |
| PLP LCP (s)         | 2.3 / 2.6           | 2.4 / 2.4          | 2.6 / 2.2          | 2.3 / 2.3     |
| PLP CLS             | 0.14 / 0.14         | 0.14 / 0.13        | 0.00 / 0.00        | 0.00 / 0.00   |
| PDP LCP (s)         | 3.8 / 3.8           | 3.5 / 3.7          | 3.4 / 3.7          | 4.6 / 4.8     |
| PDP CLS             | 0.00                | 0.00               | 0.00               | 0.00          |

Image bytes are the same in all four builds, so they are left out of this table.

**27.1 shows up in the font numbers, strongly in English and only slightly in Farsi.**
Before, both locales fetched the same four preloaded files: Plus Jakarta Sans, Vazirmatn's
Arabic file and two IBM Plex Mono weights. English is now one file, down 71%. Farsi is down
from four files to two and 14% in bytes. The Farsi saving is small for a structural reason:
Farsi pages still carry Latin text, such as product names and SKUs, so they still need a Latin
face. It is now Vazirmatn's own Latin file (34.7 KB), in place of Plus Jakarta plus Mono. That is
two files but one family. `subsets: ["arabic"]` only controls preloading; next/font still emits
the Latin range, and the browser fetches it because the page uses it. Fonts made no measurable
difference to LCP. They are not preloaded, and no page's LCP element is text waiting on a web
font.

**Phase 28 shows up on home and PLP.** All 8 product names are in the HTML (none before). Home
LCP dropped from 5.2 s to 2.8 s. The hero image used to wait for the client fetch of
`/api/storefront/home`, a 4.2 s delay before the image was even requested; now it is in the
HTML with `priority`, and that delay is 0.6 s. CLS went from 0.62 to 0 on home and from 0.14 to
0 on PLP. Those pages used to paint an empty shell and then shift it when the content arrived.

**Finding: PLP LCP does not measure the listing.** At 412px the largest element is the header
search box's placeholder, not the grid. 7 of the 8 dev products have no image, and the one that
does sits below the fold. So PLP LCP equals FCP in every build, and 28.2 shows up only in CLS and
in the HTML. Re-measure once the real, photographed catalog is in; a product photo will then be
the LCP element.

**Finding: 28.3 had no gap to close in these metrics.** Before 28.3, the PDP's `page.tsx`
already fetched the product on the server and passed it to a client component, and client
components are server-rendered too. The product name is in the HTML in every build. 28.3
changed what hydrates, not what is in the HTML.

**Finding: PDP LCP regressed by about 1.2 s after Phase 28.** It went from 3.4 / 3.7 s at
`f11e636` to 4.6 / 4.8 s now. Five extra English runs per build confirmed it: 3.49–3.58 s
against 4.45–4.79 s. Two causes combine:

- The gallery's main image (`components/storefront/ui/ProductGallery.tsx`) has no `priority`, so
  next/image gives it `loading="lazy"`. That has been true in all four builds. A lazy image is
  not requested until layout has run and the main thread is free to get to it.
- Task 30.6 imported `NotifyMeForm` statically into `ProductPurchasePanel`. So every PDP loads
  react-hook-form, Zod and HeroUI's text field up front, even an in-stock product that never
  shows the form. That is three extra chunks, about 138 KB transferred, 65 KB of it Zod. At 4×
  CPU that JS holds the main thread, and the image request moves from 2.4 s to 3.2 s. FCP is
  unchanged (about 2.7 s in both builds).

**Fixed in a follow-up commit, re-measured the same way.** PDP LCP is now 2.5 s (en) and 3.0 s
(fa), medians of three. That is better than before the regression (3.4 / 3.7 s at `f11e636`).
Two changes did it:

- The gallery's main image takes `preload`. That is Next 16's name for what `HomeHero` still
  spells `priority`; both make the image eager and emit a preload link. The thumbnails stay lazy.
  The image is now requested from the HTML at about 0.9 s and has arrived by about 1.7 s.
- `NotifyMeForm` loads through `next/dynamic`. An in-stock PDP's initial chunks no longer contain
  react-hook-form or Zod. PDP JS dropped from 341 KB to 191 KB transferred, and total blocking time
  from about 630 ms to 90 ms. An out-of-stock PDP still server-renders the form with its chunks,
  validates, and posts (201).

LCP now equals FCP in every run: the photograph is ready before the first paint, so first paint
is what is left to improve. Because of that, LCP moves with FCP. Eight English runs across two
batches ranged from 2.4 s to 2.9 s, and the three Farsi runs from 2.5 s to 3.1 s.

**Finding: image bytes say almost nothing yet.** They are the same in every build. Home loads
11.9 KB, which is the one banner, a 1.7 MB upload that next/image serves at 750w. PLP loads no
images, and the PDP loads 18.1 KB. The dev catalog holds two uploaded images, and categories and
brands have none, so the home page's category photos (29.3) and brand logos (29.4) render as
placeholders. Image bytes need re-measuring against the real catalog.

**DoD:** home, PLP and PDP in both locales are recorded against a production build, with LCP,
CLS, font bytes and image bytes. The missing baseline is stated, and the before-columns are
labelled as measured after the fact. 27.1 and Phase 28 are visible in the numbers; where they
are not (Farsi fonts, PLP LCP, PDP HTML), the reason is written up. ✅

**Verified:** four production builds, run against the standalone server one at a time, never
two measurements at once. The PDP regression was confirmed separately on the `f11e636` and HEAD
builds, with five devtools-throttled runs each and a request waterfall for each.
