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

Run once per server.

**Provisioning the machine.** Any provider works — nothing here assumes more
than a plain Ubuntu box with a public IPv4 address.

- **Ubuntu 24.04 LTS**, x86_64. Docker is the only thing installed on the host;
  everything else runs in containers.
- **2 GB RAM is the practical floor, 4 GB is comfortable.** The image is built
  *on the server* (section 3's `up -d --build`), and `next build` is the
  memory-hungry step. A build that dies partway with no error message is
  usually the OOM killer rather than a code problem — `dmesg | tail` says so.
  On a small instance, add swap once:
  ```
  sudo fallocate -l 2G /swapfile
  sudo chmod 600 /swapfile
  sudo mkswap /swapfile
  sudo swapon /swapfile
  echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
  ```
- **~25 GB disk.** Postgres' named volume, the uploads directory, local backups
  and a Docker image cache that grows with every `--build` deploy all live here.
- **Point the domain's DNS `A` record at the server's IP now.** Certbot
  validates over HTTP in section 5 and needs the name resolving by then;
  starting propagation early costs nothing.

Add your SSH key at creation time if the provider offers it. The rest of this
section assumes you can reach the box over SSH as `root` (or a sudo-capable
user).

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

One caveat to know before anyone edits the compose file: **`ufw` does not filter
ports that Docker publishes.** Docker inserts its own iptables rules ahead of
ufw's chains, so anything under a `ports:` key is reachable from the internet
whether ufw allows it or not. It doesn't bite this stack — `nginx` is the only
service publishing anything, on 80 and 443, which ufw allows anyway. It bites the
moment someone adds `ports: - "5432:5432"` to the `postgres` service to reach the
database from their laptop: that publishes it to the whole internet, ufw rules
notwithstanding. Use `docker compose ... exec postgres psql` (section 9) instead.

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
`env_file` in `docker-compose.prod.yml`. Never commit it. It carries the database
password and the JWT secret in the clear, so tighten it once:

```
chmod 600 .env.production
```

`JWT_SECRET` and `COOKIE_NAME` have no fallback defaults — `lib/auth` throws when
either is missing instead of quietly signing sessions with a dev value. A missing
one surfaces as a 500 on the first login attempt, not as a silently weak
session.

Every `docker compose` command below passes `--env-file .env.production`. It is
not optional: without it Compose falls back to a `.env` in the directory for
`${...}` interpolation, so the build argument above would come from the wrong
file or be missing entirely.

`.env.production` is excluded from the Docker build context (`.dockerignore`) —
`next build` copies any `.env*` it finds into `.next/standalone`, which would
put `DATABASE_URL` and `JWT_SECRET` inside the published image.

**Nothing under `nginx/` needs editing at this point.** Both server blocks use
`server_name _`, and each is the only block listening on its port, which makes it
that port's default server: it answers every request whatever the `Host` header
says, so a single-site deployment never has to write its domain there. The one
place the real domain does appear is the two `ssl_certificate` paths in the
activated HTTPS block — a gitignored copy made in section 5. Leaving the tracked
files unedited is what keeps section 4's `git pull` a clean fast-forward.

Confirm the domain's DNS `A` record already points at the VPS's public IP before
continuing.

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
nginx is up and configured correctly. Create the admin account below, then get
the certificate in section 5 — the site becomes reachable when the HTTPS block
is activated.

### Creating the first admin user

`prisma migrate deploy` creates the schema and nothing else, so a fresh
production database has **no users at all** — there is nobody to log into
`/admin` as. (Coming from section 6 instead? Skip this: a restored dump brings
its own `User` rows, bcrypt hashes included.)

`prisma/seed.ts` is not the answer here. It is a dev fixture — it inserts demo
categories, brands and products alongside an `admin@technotopia.com` /
`password123` account whose password is published in this repository — and it
needs `tsx` and the devDependencies, neither of which exists in the runner image.

Create the account in Postgres directly. `pgcrypto`'s `crypt()` with
`gen_salt('bf', 10)` produces a `$2a$` bcrypt hash, which is exactly what
`bcryptjs` verifies at login:

```
docker compose --env-file .env.production -f docker-compose.prod.yml exec postgres \
  psql -U technotopia -d technotopia
```

Then, at the `psql` prompt:

```sql
CREATE EXTENSION IF NOT EXISTS pgcrypto;

INSERT INTO "User" (id, email, "passwordHash", "firstName", "lastName", role, "updatedAt")
VALUES (gen_random_uuid()::text,
        'you@your-domain.com',
        crypt('the-real-password', gen_salt('bf', 10)),
        'Site', 'Owner', 'ADMIN', now());
```

`id` and `updatedAt` are supplied explicitly because they have no database
default — Prisma fills those in from the client, so an insert made outside Prisma
has to do it itself. `status` defaults to `ACTIVE` and `createdAt` to `now()`.
The role must be `ADMIN`: `authenticateAdmin` turns a `CUSTOMER` away with a 403
even when the password is right.

There is no change-password screen in the admin panel, so rotating that password
later is the same statement as an update:

```sql
UPDATE "User"
SET "passwordHash" = crypt('the-new-password', gen_salt('bf', 10)),
    "updatedAt" = now()
WHERE email = 'you@your-domain.com';
```

Type these at the interactive prompt rather than passing them with `psql -c`:
either way the password is in the clear in psql's history inside the container,
but `-c` puts it in your own shell history on the VPS as well.

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

Every `--build` leaves the image it replaced behind, untagged. Those add up on a
small disk, so run `docker image prune -f` after a few deploys — it removes only
dangling images, never one a container is using. Section 7's maintenance script
does it on a schedule.

## 5. HTTPS certificate (certbot)

### Prerequisites

- The `docker-compose.prod.yml` stack running (`app`, `postgres`, `nginx`),
  reachable on port 80. (443 is published by compose but nothing listens on
  it until step 3 below — the challenge is answered over plain HTTP.)
- The domain's DNS `A` (and `AAAA`, if used) record pointed at the VPS's
  public IP, and resolving — certbot validates over HTTP against the name, so a
  record that hasn't propagated yet fails the challenge.
- No edit to `nginx/nginx.conf`. The HTTP block is the default server on port 80
  and answers the challenge whatever the `Host` header says (section 2).

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
   replacing `your-domain.com` in the copy's two `ssl_certificate` paths — the
   only two lines in it that carry the domain:

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

Certbot only renews certs within 30 days of expiry, so it is safe to run daily.
Automate it — section 7's maintenance script does the renewal and the backup in
one cron entry. A renewal that quietly stops working takes the site down when the
certificate expires — up to 90 days after the last deploy that looked perfectly
fine.

One detail when running it unattended: use `docker compose ... exec -T nginx
nginx -s reload`. Cron has no TTY, and `exec` without `-T` tries to allocate one
and fails.

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

**If that login is the seeded one, change it before go-live.** `prisma/seed.ts`
creates `admin@technotopia.com` with the password `password123`, which anyone can
read in this repository, and restoring a dev dump carries it straight into
production. Rotate it with the `UPDATE` in section 3.

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

Copy the `backups/` directory off the server — a backup that only exists on the
machine it backs up is not a backup. Restoring is section 6's steps 4-7 with the
archive names changed.

### Running it on a schedule

Put the backup, the certificate renewal (section 5) and the image cleanup in one
script rather than three crontab lines. Crontab treats `%` as a line separator,
so `date +%F` inline needs escaping as `date +\%F` — a footgun avoided entirely
by keeping the commands in a file:

```
cat > ~/technotopia/maintenance.sh <<'EOF'
#!/bin/sh
set -e
cd /home/deploy/technotopia
COMPOSE="docker compose --env-file .env.production -f docker-compose.prod.yml"
STAMP=$(date +%F)

mkdir -p backups
$COMPOSE exec -T postgres pg_dump -U technotopia -Fc -f /tmp/db.dump technotopia
$COMPOSE cp postgres:/tmp/db.dump ./backups/db-$STAMP.dump
tar -czf backups/uploads-$STAMP.tar.gz uploads

docker run --rm \
  -v "$PWD/certbot/conf:/etc/letsencrypt" \
  -v "$PWD/certbot/www:/var/www/certbot" \
  certbot/certbot renew --quiet
$COMPOSE exec -T nginx nginx -s reload

find backups -type f -mtime +14 -delete
docker image prune -f
EOF
chmod +x ~/technotopia/maintenance.sh
```

`exec -T` everywhere, for the no-TTY reason in section 5. Then one crontab entry
(`crontab -e`), at a quiet hour:

```
17 3 * * * /home/deploy/technotopia/maintenance.sh >> /home/deploy/maintenance.log 2>&1
```

Run it once by hand first — cron's environment is not your login shell's, and a
maintenance script that has never been executed is a guess. Check the log
afterwards, and check it again a week later: the failure mode here is silence.

The `find ... -mtime +14 -delete` line keeps two weeks of local backups so the
disk doesn't fill. It is not a retention policy on its own — that depends on the
copies you keep off the server.

## 8. Where uploaded images live

**On the server's own disk, not in an object storage bucket.** Worth stating
outright, because it is the kind of thing a deployment is assumed to have.

`app/api/admin/upload/route.ts` writes each uploaded file into `public/uploads`
and stores a root-relative `/uploads/<uuid>.<ext>` path on the row.
`docker-compose.prod.yml` bind-mounts the host's `./uploads` directory over
`/app/public/uploads`, which is what makes those files outlive a deploy — the
image bakes `public/` in at build time, so without the mount every upload would
disappear on the next `up -d --build`. The directory must be owned by the
container's `nextjs` user (uid 1001), the account the server runs as:

```
mkdir -p uploads
sudo chown -R 1001:1001 uploads
```

The trade-offs, on the record: the images sit on one machine's disk, they are
only as safe as section 7's backup routine, and they are served by Next.js
through nginx rather than from a CDN. For a single-VPS deployment that is the
right shape, and it is what the code supports today.

Switching to a bucket is **not** a configuration change, so don't plan a deploy
around it. `uploadedImagePathSchema` validates every image field against
`/^\/uploads\//` server-side, which means a move would need: that schema relaxed
to accept the bucket's URLs, the upload route rewritten to put objects there and
return the new URL, the bucket's credentials added to the environment,
`next.config.ts` given the bucket host under `images.remotePatterns`, and the
existing rows and files migrated. Nothing in this runbook assumes a bucket, and
none has to be created to go live.

## 9. Day-2: checking on it, and what usually breaks

```
docker compose --env-file .env.production -f docker-compose.prod.yml ps
docker compose --env-file .env.production -f docker-compose.prod.yml logs -f app
docker compose --env-file .env.production -f docker-compose.prod.yml logs --tail=50 nginx
```

A psql shell on the production database, without publishing the port:

```
docker compose --env-file .env.production -f docker-compose.prod.yml exec postgres \
  psql -U technotopia -d technotopia
```

The failures that actually come up:

- **Compose exits immediately with `set NEXT_PUBLIC_SITE_URL in .env.production`.**
  The `--env-file .env.production` was left off. Compose read the dev `.env` (or
  nothing) for interpolation and the required build argument came back empty.
- **Everything returns 502.** nginx is up and `app` is not. `logs app` says why —
  most often `prisma migrate deploy` failing at startup because `DATABASE_URL`
  points at `localhost` instead of the `postgres` service name, which leaves the
  container in a restart loop. nginx serving 502 rather than refusing to boot is
  deliberate (section 4).
- **nginx won't start after activating `https.conf`.** An `ssl_certificate` path
  that doesn't exist is fatal at startup. Check the path matches what certbot
  actually wrote under `certbot/conf/live/<domain>/`, and run `nginx -t` before
  reloading — a bad *reload* is rejected harmlessly, a bad *restart* takes the
  site down.
- **Login 500s with `JWT_SECRET environment variable is not set`.** The variable
  is missing from `.env.production`; `lib/auth` refuses to sign a token rather
  than fall back to a default.
- **An image upload fails at just over 5 MB.** Both the upload route and nginx's
  `client_max_body_size` cap at 5 MB deliberately. Raising one without the other
  swaps a clean error for a confusing 413.
- **Security headers missing from a response.** Something added an `add_header`
  inside a `server` or `location` block. `add_header` doesn't merge across
  levels: one of them anywhere below `http` drops all three inherited headers
  silently. Both nginx files carry the warning; this is what it looks like when
  it happens.
- **Disk full.** Usually the untagged images left by repeated `--build` deploys.
  `docker system df` shows the split; `docker image prune -f` reclaims it.

Verifying a deploy from outside, which is what section 5 ends on:

```
curl -sI https://your-domain.com/ | head -1
curl -sI https://your-domain.com/ | grep -Ei 'x-frame|x-content-type|referrer'
```
