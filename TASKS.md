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
| 26    | Cleanup & correctness   | ⬜ 26.2 done ← **start here** |
| 25    | Deployment              | ⏸ deferred — no VPS yet       |

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

# Part 2 — Outstanding

## Phase 26 — Cleanup & correctness

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

### Task 26.4 — Small polish ⬜

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

---

# Part 3 — Deferred

## Phase 25 — Deployment ⏸

**Deferred: no VPS yet.** Do not start these until a server exists. The original list
named ArvanCloud; that provider choice is open again.

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

### Task 25.5 — Go-live checklist ⏸

```
Before pointing the domain here: confirm Phase 23 (SEO) is done, run the E2E suite (24.1)
against the production build, confirm no dev/test secrets leak into env vars, confirm the
admin password isn't a seed/default value, confirm backups are configured for whichever
Postgres setup was chosen in 25.2.
```
