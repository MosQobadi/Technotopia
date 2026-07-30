# Deployment

This file currently covers obtaining and renewing the HTTPS certificate for the
nginx reverse proxy (`nginx.conf`). Initial VPS provisioning, firewall setup, and
the day-to-day update/redeploy procedure are documented separately (Task 14.4).

## Prerequisites

- `docker-compose.prod.yml` stack running (`app`, `postgres`, `nginx`), reachable
  on ports 80/443.
- A domain's DNS `A` (and `AAAA`, if used) record pointed at the VPS's public IP.
- `nginx.conf`'s `server_name your-domain.com www.your-domain.com;` lines updated
  to the real domain, in **both** the HTTP server block and the commented-out
  HTTPS server block.

## Obtaining the first certificate

1. Bring the stack up with only the HTTP server block active (the default state
   of `nginx.conf` — the HTTPS block is commented out until a certificate
   exists):

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

## Renewing

Let's Encrypt certificates are valid for 90 days. Renew with the same image:

```
docker run --rm \
  -v "$(pwd)/certbot/conf:/etc/letsencrypt" \
  -v "$(pwd)/certbot/www:/var/www/certbot" \
  certbot/certbot renew

docker compose -f docker-compose.prod.yml exec nginx nginx -s reload
```

Certbot only renews certs within 30 days of expiry, so this is safe to run
often. Scheduling it (cron/systemd timer) is covered in the VPS runbook
(Task 14.4).
