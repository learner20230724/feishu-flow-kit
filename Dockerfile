# ============================================================
# Stage 1 — Install dependencies
# ============================================================
FROM node:22-alpine AS deps

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

# ============================================================
# Stage 2 — Build TypeScript
# ============================================================
FROM node:22-alpine AS build

WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY package.json package-lock.json ./
COPY tsconfig.json ./
COPY src/ ./src/
COPY scripts/ ./scripts/
COPY examples/ ./examples/

RUN npm run build

# ============================================================
# Stage 3 — Production runtime
# ============================================================
FROM node:22-alpine AS runtime

WORKDIR /app

RUN addgroup -g 1001 -S appgroup && adduser -u 1001 -S appuser -G appgroup
RUN apk add --no-cache dumb-init wget

COPY --from=build /app/dist ./dist
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/package.json ./
COPY --from=build /app/examples/ ./examples/
COPY --from=build /app/scripts/ ./scripts/

USER appuser

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://localhost:${FEISHU_WEBHOOK_PORT:-8787}/healthz || exit 1

ENV NODE_ENV=production
ENV FEISHU_MOCK_MODE=false
ENV FEISHU_WEBHOOK_PORT=8787

EXPOSE 8787

ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "dist/index.js"]
