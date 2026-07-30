# Deployment

Deploying Technotopia to an Ubuntu VPS with Docker Compose + nginx + Let's Encrypt.

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

`.env.production` is read by both the `app` and `postgres` services via
`env_file` in `docker-compose.prod.yml`. Never commit it.

Also update `nginx.conf`: replace `your-domain.com www.your-domain.com` with
the real domain in the `server_name` line (both the active HTTP block and the
commented-out HTTPS block), and make sure the domain's DNS `A` record already
points at the VPS's public IP before continuing.

## 3. First deploy

Bring the stack up. `nginx.conf` starts with only the HTTP server block
active, so this serves plain HTTP first:

```
docker compose -f docker-compose.prod.yml up -d --build
```

`app`'s entrypoint (`docker-entrypoint.sh`) runs `prisma migrate deploy`
before starting the server, so the schema is applied automatically on this
first boot.

Then obtain the HTTPS certificate and switch `nginx.conf` over to the HTTPS
block — see **Obtaining the first certificate** below. Until that's done, the
site is only reachable over HTTP.

## 4. Update / redeploy procedure

For subsequent deploys, from the `technotopia` directory on the VPS:

```
git pull
docker compose -f docker-compose.prod.yml up -d --build
```

This rebuilds the `app` image and recreates the container; migrations run
again automatically via the entrypoint (`prisma migrate deploy` is a no-op if
there's nothing new to apply). `postgres` and `nginx` are untouched unless
their config changed.

This procedure has a brief downtime window while the old `app` container
stops and the new one starts and passes its migration step. Zero-downtime
deploys (e.g. blue-green via a second `app` container swapped in nginx, or a
rolling strategy) are a future improvement, not implemented yet.

## 5. HTTPS certificate (certbot)

### Prerequisites

- The `docker-compose.prod.yml` stack running (`app`, `postgres`, `nginx`),
  reachable on ports 80/443.
- The domain's DNS `A` (and `AAAA`, if used) record pointed at the VPS's
  public IP.
- `nginx.conf`'s `server_name your-domain.com www.your-domain.com;` lines
  updated to the real domain, in **both** the HTTP server block and the
  commented-out HTTPS server block.

### Obtaining the first certificate

1. Confirm the stack is up with only the HTTP server block active (the
   default state of `nginx.conf` — the HTTPS block is commented out until a
   certificate exists):

   ```
   docker compose -f docker-compose.prod.yml up -d --build
   ```

2. Request a certificate with the official certbot image, using the webroot
   method. It writes the ACME challenge file into `./certbot/www`, the same
   directory `nginx.conf`'s `/.well-known/acme-challenge/` location serves —
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

3. In `nginx.conf`, uncomment the `# server { ... }` HTTPS block (and its
   `ssl_certificate`/`ssl_certificate_key` paths, which already point at
   `/etc/letsencrypt/live/your-domain.com/...`).

4. Reload nginx to pick up the new config and certificate:

   ```
   docker compose -f docker-compose.prod.yml exec nginx nginx -s reload
   ```

The site is now served over HTTPS; plain HTTP requests redirect to it.

### Renewing

Let's Encrypt certificates are valid for 90 days. Renew with the same image:

```
docker run --rm \
  -v "$(pwd)/certbot/conf:/etc/letsencrypt" \
  -v "$(pwd)/certbot/www:/var/www/certbot" \
  certbot/certbot renew

docker compose -f docker-compose.prod.yml exec nginx nginx -s reload
```

Certbot only renews certs within 30 days of expiry, so this is safe to run
often — e.g. from a daily cron job or systemd timer on the VPS running the
two commands above.
