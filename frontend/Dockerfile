FROM node:24-alpine AS base
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
# Corepack's Node fetch can time out in minimal Docker networks even when npm's
# retrying client can reach the registry. Keep the exact package-manager version
# declared in package.json, but install it with npm for a reproducible build path.
RUN npm install --global pnpm@11.5.2 --fetch-retries=3 --fetch-retry-mintimeout=1000

FROM base AS deps
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile

FROM deps AS dev
COPY . .
EXPOSE 3000
CMD ["pnpm", "dev", "--hostname", "0.0.0.0", "--port", "3000"]

FROM deps AS builder
ARG NEXT_API_ORIGIN=http://api:8000
ARG NEXT_PUBLIC_DATA_SOURCE=http
ENV NEXT_API_ORIGIN=${NEXT_API_ORIGIN}
ENV NEXT_PUBLIC_DATA_SOURCE=${NEXT_PUBLIC_DATA_SOURCE}
COPY . .
RUN pnpm build

FROM node:24-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME=0.0.0.0
ENV INTERNAL_API_ORIGIN=http://api:8000
RUN addgroup --system --gid 1001 nodejs \
  && adduser --system --uid 1001 nextjs
COPY --from=builder --chown=nextjs:nodejs /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
USER nextjs
EXPOSE 3000
CMD ["node", "server.js"]
