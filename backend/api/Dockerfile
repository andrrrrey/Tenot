FROM node:20-slim AS deps
WORKDIR /app
# .npmrc: onnxruntime-node — только CPU (без CUDA-библиотек на ~370 МБ); CPU-библиотеки
# onnxruntime и sharp идут в самих npm-пакетах, поэтому --ignore-scripts им не мешает
COPY package*.json .npmrc ./
RUN npm ci --ignore-scripts

FROM node:20-slim AS builder
WORKDIR /app

# OpenSSL нужен для Prisma. Engine binaries скачиваем явно: стандартный
# postinstall Prisma нестабилен за Cloudflare и может зависать на сборке.
RUN apt-get update && apt-get install -y openssl ca-certificates curl gzip && rm -rf /var/lib/apt/lists/*

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Модель поиска госномеров (open-image-models, MIT) — с проверкой sha256
RUN sh scripts/fetch-plate-model.sh models/plate-detector.onnx

ARG PRISMA_ENGINES_COMMIT=605197351a3c8bdd595af2d2a9bc3025bca48ea2
RUN set -eux; \
    engine_base="https://binaries.prisma.sh/all_commits/${PRISMA_ENGINES_COMMIT}/debian-openssl-3.0.x"; \
    curl -fsSL --retry 5 -A 'Mozilla/5.0' "${engine_base}/schema-engine.gz" | gzip -d > node_modules/@prisma/engines/schema-engine-debian-openssl-3.0.x; \
    curl -fsSL --retry 5 -A 'Mozilla/5.0' "${engine_base}/libquery_engine.so.node.gz" | gzip -d > node_modules/@prisma/engines/libquery_engine-debian-openssl-3.0.x.so.node; \
    echo 'cedeae04739cfa085493da2bafb5d1e4da0247fc74f2995a51ee24f20c9890be  node_modules/@prisma/engines/schema-engine-debian-openssl-3.0.x' | sha256sum -c -; \
    echo '35860a5c0fb2f79e7b38c40747c4d212318d97e1910ca528b133c802716de0b8  node_modules/@prisma/engines/libquery_engine-debian-openssl-3.0.x.so.node' | sha256sum -c -; \
    chmod +x node_modules/@prisma/engines/schema-engine-debian-openssl-3.0.x; \
    CHECKPOINT_DISABLE=1 \
    PRISMA_HIDE_UPDATE_MESSAGE=true \
    PRISMA_SCHEMA_ENGINE_BINARY=/app/node_modules/@prisma/engines/schema-engine-debian-openssl-3.0.x \
    PRISMA_QUERY_ENGINE_LIBRARY=/app/node_modules/@prisma/engines/libquery_engine-debian-openssl-3.0.x.so.node \
    npx prisma generate
RUN npm run build

FROM node:20-slim AS runner
WORKDIR /app
ENV NODE_ENV=production

# OpenSSL нужен для Prisma runtime, wget для health checks,
# hugin-tools — склейка 360°-панорам салона (pto_gen, cpfind, autooptimiser, nona, verdandi)
# Remove ld.so.preload in case the base image or runtime is compromised
RUN apt-get update && apt-get install -y openssl wget hugin-tools --no-install-recommends && rm -rf /var/lib/apt/lists/* \
    && rm -f /etc/ld.so.preload

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/models ./models
# Библиотеки onnxruntime для других ОС в образе не нужны
RUN rm -rf node_modules/onnxruntime-node/bin/napi-v*/darwin node_modules/onnxruntime-node/bin/napi-v*/win32
COPY --from=builder /app/prisma ./prisma
COPY package*.json ./

RUN mkdir -p uploads/categories

EXPOSE 3001

CMD ["sh", "-c", "npx prisma migrate resolve --rolled-back 20260101000000_init 2>/dev/null || true; npx prisma migrate deploy && node dist/main.js"]
