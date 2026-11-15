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

# Всё, что скачивается из интернета, — ДО `COPY . .`: эти слои зависят только от
# package-lock.json, поэтому кэшируются Docker и не скачиваются заново при каждом
# изменении кода.

# Модель поиска госномеров (open-image-models, MIT) — с проверкой sha256
COPY scripts/fetch-plate-model.sh scripts/fetch-plate-model.sh
RUN sh scripts/fetch-plate-model.sh models/plate-detector.onnx

# Движки Prisma. binaries.prisma.sh (Cloudflare) с сервера отвечает с перебоями и
# может зависнуть навсегда, поэтому:
#  1) если файлы положены в prisma-engines/ (см. prisma-engines/README.md) и sha256
#     совпадает — берутся оттуда, без интернета;
#  2) иначе скачиваются с таймаутами и до 10 попыток.
ARG PRISMA_ENGINES_COMMIT=605197351a3c8bdd595af2d2a9bc3025bca48ea2
COPY prisma-engines/ /tmp/prisma-engines/
RUN set -eu; \
    dir=node_modules/@prisma/engines; \
    base="https://binaries.prisma.sh/all_commits/${PRISMA_ENGINES_COMMIT}/debian-openssl-3.0.x"; \
    engine() { \
      gz=$1; file=$2; sum=$3; \
      if [ -f "/tmp/prisma-engines/$file" ] && echo "$sum  /tmp/prisma-engines/$file" | sha256sum -c - >/dev/null 2>&1; then \
        cp "/tmp/prisma-engines/$file" "$dir/$file"; echo "prisma engine $file: local copy"; return 0; \
      fi; \
      for i in 1 2 3 4 5 6 7 8 9 10; do \
        if curl -fsSL --connect-timeout 15 --max-time 180 -A 'Mozilla/5.0' -o /tmp/engine.gz "$base/$gz" \
           && gzip -dc /tmp/engine.gz > "$dir/$file" \
           && echo "$sum  $dir/$file" | sha256sum -c -; then \
          rm -f /tmp/engine.gz; echo "prisma engine $file: downloaded"; return 0; \
        fi; \
        echo "prisma engine $file: attempt $i failed, retrying"; sleep 5; \
      done; \
      return 1; \
    }; \
    engine schema-engine.gz schema-engine-debian-openssl-3.0.x cedeae04739cfa085493da2bafb5d1e4da0247fc74f2995a51ee24f20c9890be; \
    engine libquery_engine.so.node.gz libquery_engine-debian-openssl-3.0.x.so.node 35860a5c0fb2f79e7b38c40747c4d212318d97e1910ca528b133c802716de0b8; \
    chmod +x "$dir/schema-engine-debian-openssl-3.0.x"; \
    rm -rf /tmp/prisma-engines

COPY . .

RUN CHECKPOINT_DISABLE=1 \
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
