# syntax=docker/dockerfile:1

FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
# `postinstall` runs `prisma generate`, which reads prisma.config.ts and the
# schema — both must exist before the install or it exits non-zero.
COPY prisma.config.ts ./prisma.config.ts
COPY prisma ./prisma
RUN corepack enable && corepack install
RUN pnpm install --frozen-lockfile

FROM node:22-alpine AS builder
WORKDIR /app
RUN corepack enable
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN corepack install
RUN pnpm prisma generate
# `next build` inlines NEXT_PUBLIC_* into the server chunks and the prerendered
# HTML, so the canonical site URL has to be known here, not at container start.
# docker-compose.prod.yml passes it from .env.production.
ARG NEXT_PUBLIC_SITE_URL
ENV NEXT_PUBLIC_SITE_URL=$NEXT_PUBLIC_SITE_URL
RUN pnpm build

FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

RUN addgroup --system --gid 1001 nodejs \
  && adduser --system --uid 1001 -G nodejs nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# The standalone output only bundles packages actually imported by app code —
# the Prisma CLI is invoked as a subprocess and never imported, so it's absent.
# Install it separately (pinned to the same version as package.json) so the
# entrypoint can run `migrate deploy` before the server starts.
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/prisma.config.ts ./prisma.config.ts
RUN mkdir -p /tmp/prisma-cli \
  && cd /tmp/prisma-cli \
  && npm init -y >/dev/null 2>&1 \
  && npm install --omit=dev prisma@7.9.0 dotenv \
  && rm -rf /tmp/prisma-cli/node_modules/react /tmp/prisma-cli/node_modules/react-dom \
  && cp -r /tmp/prisma-cli/node_modules/. /app/node_modules/ \
  && rm -rf /tmp/prisma-cli

COPY docker-entrypoint.sh ./docker-entrypoint.sh
RUN chmod +x ./docker-entrypoint.sh

USER nextjs
EXPOSE 3000

ENTRYPOINT ["./docker-entrypoint.sh"]
CMD ["node", "server.js"]
