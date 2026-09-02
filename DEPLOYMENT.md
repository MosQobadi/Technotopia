# Deployment

Deploying Technotopia to an Ubuntu VPS with Docker Compose + nginx + Let's Encrypt.

**Database: self-hosted, not managed.** `docker-compose.prod.yml` runs its own
`postgres:16` container on a named volume, unpublished, reachable only by the
`app` container over the internal Docker network. No managed-database provider
is chosen, and a managed instance would mean writing `DATABASE_URL`, its TLS
mode and the backup routine against a placeholder. The trade-off is that
backups and major-version upgrades are yours to run — section 7 covers the
backup side.

## 1. Initial VPS setup

Run once per server. Assumes a fresh Ubuntu VPS reachable over SSH as `root`
(or a sudo-capable user).

**Create a non-root deploy user** — don't run the app or Docker as root:

```
adduser deploy
usermod -aG sudo deploy
```

Copy your SSH public key to the new user (from your local machine) so you can
log in as `deploy` without a password:

```
ssh-copy-id deploy@your-vps-ip
```

Log back in as `deploy` for the rest of this section.

**Install Docker and the Compose plugin** (Docker's official convenience
script, then add `deploy` to the `docker` group so `sudo` isn't needed for
every command):

```
curl -fsSL https://get.docker.com | sudo sh
sudo usermod -aG docker deploy
```

Log out and back in for the group change to take effect. Verify with
`docker compose version`.

**Firewall — only 22 (SSH), 80 (HTTP), and 443 (HTTPS)** should be reachable:

```
sudo ufw allow 22/tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable
```

Postgres (5432) is never exposed here — `docker-compose.prod.yml` doesn't
publish it to the host, so it's only reachable from the `app` container over
the internal Docker network. Nothing to open in `ufw` for it.

## 2. Clone the repo and configure the environment

```
git clone <repo-url> technotopia
cd technotopia
cp .env.example .env.production
```

Edit `.env.production` for production. Differences from the `.env.example`
defaults matter here:

- `DATABASE_URL` must point at the `postgres` service name on port `5432`
  (the internal Docker network), not `localhost:5433` — the 5433 mapping in
  `docker-compose.yml` only exists for local dev:
  ```
  DATABASE_URL="postgresql://technotopia:<strong-password>@postgres:5432/technotopia?schema=public"
  ```
- `POSTGRES_USER` / `POSTGRES_PASSWORD` / `POSTGRES_DB` must match the
  credentials embedded in that `DATABASE_URL`.
- `JWT_SECRET` — generate a strong random value (e.g. `openssl rand -base64
  48`), not the `changeme` placeholder.
- `NODE_ENV=production`.
- `NEXT_PUBLIC_SITE_URL` — the real public origin, e.g.
  `https://your-domain.com`. `next build` inlines every `NEXT_PUBLIC_*` value
  into the bundle, so this one is read at **build** time, not container start:
  `docker-compose.prod.yml` passes it to the image as a build argument. Change
  it and you have to rebuild (`up -d --build`), not just restart. Leave it
  wrong and the JSON-LD structured data advertises `http://localhost:3000`.

`.env.production` is read by both the `app` and `postgres` services via
`env_file` in `docker-compose.prod.yml`. Never commit it.

Every `docker compose` command below passes `--env-file .env.production`. It is
not optional: without it Compose falls back to a `.env` in the directory for
`${...}` interpolation, so the build argument above would come from the wrong
file or be missing entirely.

`.env.production` is excluded from the Docker build context (`.dockerignore`) —
`next build` copies any `.env*` it finds into `.next/standalone`, which would
put `DATABASE_URL` and `JWT_SECRET` inside the published image.

Also update `nginx/nginx.conf`: replace `your-domain.com www.your-domain.com`
with the real domain in the `server_name` line of the HTTP server block. The
HTTPS block carries the same placeholder but is not active yet — section 5
covers it. Make sure the domain's DNS `A` record already points at the VPS's
public IP before continuing.

## 3. First deploy

Bring the stack up. Only the HTTP server block is active at this point, so
port 443 isn't listening yet:

```
docker compose --env-file .env.production -f docker-compose.prod.yml up -d --build
```

`app`'s entrypoint (`docker-entrypoint.sh`) runs `prisma migrate deploy`
before starting the server, so the schema is applied automatically on this
first boot.

**If real catalog data was already entered somewhere else, do section 6
instead of this step** — restoring a dump wants Postgres up and `app` still
down, and starting `app` first is a detour, not a disaster.

Note what that HTTP block actually serves: the certbot ACME challenge, and a
301 to HTTPS for everything else. Until the certificate exists that redirect
points at a port nothing is listening on, so **the site is not browsable yet** —
`curl -I http://your-domain.com/` returning `301` is the expected proof that
nginx is up and configured correctly. Go straight on to the certificate below;
the site becomes reachable when the HTTPS block is activated.

## 4. Update / redeploy procedure

For subsequent deploys, from the `technotopia` directory on the VPS:

```
git pull
docker compose --env-file .env.production -f docker-compose.prod.yml up -d --build
```

This rebuilds the `app` image and recreates the container; migrations run
again automatically via the entrypoint (`prisma migrate deploy` is a no-op if
there's nothing new to apply). `postgres` and `nginx` are untouched unless
their config changed.

No `restart nginx` step is needed after a redeploy. nginx re-resolves the
`app` container name against Docker's DNS (`resolver 127.0.0.11 valid=10s`)
instead of caching the address it saw at startup, so a redeploy that lands
`app` on a different IP is picked up within ten seconds. It also means nginx
starts fine while `app` is down — serving 502 until the app is back, rather
than refusing to boot.

This procedure has a brief downtime window while the old `app` container
stops and the new one starts and passes its migration step. Zero-downtime
deploys (e.g. blue-green via a second `app` container swapped in nginx, or a
rolling strategy) are a future improvement, not implemented yet.

## 5. HTTPS certificate (certbot)

### Prerequisites

- The `docker-compose.prod.yml` stack running (`app`, `postgres`, `nginx`),
  reachable on port 80. (443 is published by compose but nothing listens on
  it until step 3 below — the challenge is answered over plain HTTP.)
- The domain's DNS `A` (and `AAAA`, if used) record pointed at the VPS's
  public IP.
- `nginx/nginx.conf`'s `server_name your-domain.com www.your-domain.com;`
  line updated to the real domain (section 2).

### Obtaining the first certificate

1. Confirm the stack is up with only the HTTP server block active. That is
   the state the repo ships in: the HTTPS block is the file
   `nginx/conf.d/https.conf.disabled`, and nginx's `conf.d/*.conf` include
   skips it until it's copied into place — nginx refuses to start when
   `ssl_certificate` points at a file that doesn't exist yet:

   ```
   docker compose --env-file .env.production -f docker-compose.prod.yml up -d --build
   ```

2. Request a certificate with the official certbot image, using the webroot
   method. It writes the ACME challenge file into `./certbot/www`, the same
   directory `nginx/nginx.conf`'s `/.well-known/acme-challenge/` location
   serves —
   both this command and the `nginx` service mount it, so the challenge is
   visible to Let's Encrypt over plain HTTP:

   ```
   docker run --rm \
     -v "$(pwd)/certbot/conf:/etc/letsencrypt" \
     -v "$(pwd)/certbot/www:/var/www/certbot" \
     certbot/certbot certonly --webroot -w /var/www/certbot \
     -d your-domain.com -d www.your-domain.com \
     --email you@example.com --agree-tos --no-eff-email
   ```

   On success, certs land in `./certbot/conf/live/your-domain.com/`, which is
   the same path `docker-compose.prod.yml` mounts read-only into the `nginx`
   service at `/etc/letsencrypt`.

3. Activate the HTTPS server block by copying it into the include path, then
   replacing `your-domain.com` in the copy — in `server_name` and in both
   certificate paths:

   ```
   cp nginx/conf.d/https.conf.disabled nginx/conf.d/https.conf
   nano nginx/conf.d/https.conf
   ```

   The copy is gitignored, so it survives `git pull` and never conflicts with
   the shipped template. Leave the `.disabled` original in place.

4. Check the config parses, then reload nginx to pick it up:

   ```
   docker compose --env-file .env.production -f docker-compose.prod.yml exec nginx nginx -t
   docker compose --env-file .env.production -f docker-compose.prod.yml exec nginx nginx -s reload
   ```

   `nginx -t` before `-s reload` is worth the extra command: a reload with a
   broken config is rejected and the running config stays up, but a *restart*
   with one leaves the container in a crash loop with the site down.

The site is now served over HTTPS; plain HTTP requests redirect to it. Verify
the certificate and the security headers:

```
curl -sI https://your-domain.com/ | head -1
curl -sI https://your-domain.com/ | grep -Ei 'x-frame|x-content-type|referrer'
```

### Renewing

Let's Encrypt certificates are valid for 90 days. Renew with the same image:

```
docker run --rm \
  -v "$(pwd)/certbot/conf:/etc/letsencrypt" \
  -v "$(pwd)/certbot/www:/var/www/certbot" \
  certbot/certbot renew

docker compose --env-file .env.production -f docker-compose.prod.yml exec nginx nginx -s reload
```

Certbot only renews certs within 30 days of expiry, so this is safe to run
often — e.g. from a daily cron job or systemd timer on the VPS running the
two commands above.

## 6. Real catalog data entered before this VPS existed

### Where the admin enters data

**On the developer's machine, against the local dev stack** (`docker-compose.yml`
Postgres + `pnpm dev`) — not on a Vercel preview.

Uploads write to the local filesystem and nowhere else: `app/api/admin/upload/route.ts`
saves into `public/uploads` and returns a root-relative `/uploads/<uuid>.<ext>` path,
and `imageUrlSchema` rejects anything that isn't such a path. Vercel's filesystem is
read-only at runtime, so on a preview deployment every upload 500s and no product,
category, brand, or banner that needs an image can be created at all. A Vercel preview
is browse-only; it is not a data-entry surface.

**None of that data has to be entered twice.** It moves to the VPS as two pieces:

- the database rows — one `pg_dump`, restored into the production Postgres;
- the image files — a copy of `public/uploads` into the VPS's `./uploads`
  directory, which `docker-compose.prod.yml` bind-mounts into the container at
  `/app/public/uploads`.

Because image columns hold root-relative `/uploads/...` paths rather than absolute
URLs, nothing needs rewriting: as long as the folder travels with the dump, every row
still points at its image. The admin's login travels too — `User` rows carry their
bcrypt hashes, so the same credentials work on the VPS.

### Giving the admin access to the local instance

- Same network: start the dev server on all interfaces (`pnpm dev -H 0.0.0.0`) and
  give the admin `http://<dev-machine-ip>:3000/admin`.
- Remote: a temporary tunnel in front of `localhost:3000` — e.g.
  `cloudflared tunnel --url http://localhost:3000` — shut down when the session ends.

Either way:

- Set a real `JWT_SECRET` in `.env` first, not the `changeme` placeholder.
- Add the address the admin actually types to `allowedDevOrigins` in `next.config.ts`
  (the LAN IP, or the tunnel hostname). The dev server refuses `/_next/*` requests
  from origins it doesn't know, which shows up as a page that loads without styles.
- Leave the machine on for the duration.

### Protecting it while it lives on a dev machine

Once real data is in the dev database, that database stops being disposable:

- Do not run `prisma migrate reset` or `prisma db push --force-reset` against it.
- Take a dump (step 1 below) before any schema work, and keep it.
- The E2E suite cleans up after itself and runs on its own port, but it still writes
  to the dev database — dump first if you are unsure.

### Moving it to the VPS

Sections 1 and 2 must be done (VPS set up, repo cloned, `.env.production` written).
Do this **instead of** section 3's single `up -d --build`.

1. On the dev machine, dump the whole database with the container's own `pg_dump`, so
   the client and server versions match. Write to a file inside the container and copy
   it out rather than redirecting — PowerShell's `>` corrupts binary output:

   ```
   docker compose exec -T db pg_dump -U technotopia -Fc -f /tmp/technotopia.dump technotopia
   docker compose cp db:/tmp/technotopia.dump ./technotopia.dump
   ```

   Substitute the `POSTGRES_USER` / `POSTGRES_DB` values from your `.env` if they
   differ from the `.env.example` defaults.

2. Archive the uploaded images:

   ```
   tar -czf uploads.tar.gz -C public uploads
   ```

3. Copy both to the VPS:

   ```
   scp technotopia.dump uploads.tar.gz deploy@your-vps-ip:~/technotopia/
   ```

4. On the VPS, bring up **only** Postgres. Starting `app` here would run
   `prisma migrate deploy` against an empty database and create the schema before the
   restore; `--clean --if-exists` in step 5 copes with that, but it is simpler to
   avoid:

   ```
   docker compose --env-file .env.production -f docker-compose.prod.yml up -d postgres
   ```

5. Restore the dump. `docker compose cp` again avoids shell redirection:

   ```
   docker compose --env-file .env.production -f docker-compose.prod.yml cp ./technotopia.dump postgres:/tmp/technotopia.dump
   docker compose --env-file .env.production -f docker-compose.prod.yml exec postgres \
     pg_restore -U technotopia -d technotopia --clean --if-exists /tmp/technotopia.dump
   ```

   The dump includes Prisma's `_prisma_migrations` table, so the restored database
   knows exactly which migrations it is at.

6. Unpack the images into the bind-mount target and hand it to the container's
   `nextjs` user (uid 1001), which is what writes new uploads:

   ```
   mkdir -p uploads
   tar -xzf uploads.tar.gz --strip-components=1 -C uploads
   sudo chown -R 1001:1001 uploads
   ```

7. Bring the rest of the stack up:

   ```
   docker compose --env-file .env.production -f docker-compose.prod.yml up -d --build
   ```

   The entrypoint's `prisma migrate deploy` now applies only the migrations created
   after the dump was taken, if any. Migrations that landed between data entry and
   deployment are fine — they run forward over the restored data. What does not work
   is restoring a dump that is _newer_ than the deployed code.

8. Verify: log in at `/admin` with the same credentials used during data entry, open a
   product that has an image, and confirm the storefront renders it. A broken image
   means step 6 was missed or the ownership is wrong.

Existing browser sessions are invalidated by the different `JWT_SECRET` — expected,
everyone logs in again.

## 7. Backing up the data

The database and the uploads are one unit: a dump restored without its matching
images gives you rows whose pictures 404. Always take them together.

```
mkdir -p backups
docker compose --env-file .env.production -f docker-compose.prod.yml exec postgres \
  pg_dump -U technotopia -Fc -f /tmp/db.dump technotopia
docker compose --env-file .env.production -f docker-compose.prod.yml cp postgres:/tmp/db.dump ./backups/db-$(date +%F).dump
tar -czf backups/uploads-$(date +%F).tar.gz uploads
```

Run it from a cron job on the VPS alongside the certbot renewal, and copy the
`backups/` directory off the server — a backup that only exists on the machine it
backs up is not a backup. Restoring is steps 4-7 above with the archive names
changed.
