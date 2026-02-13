FROM node:20-slim AS deps
WORKDIR /app
COPY package*.json ./
RUN npm install

FROM node:20-slim AS builder
WORKDIR /app

# OpenSSL нужен для prisma generate
RUN apt-get update && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*

COPY --from=deps /app/node_modules ./node_modules
COPY . .

RUN npx prisma generate
RUN npm run build

FROM node:20-slim AS runner
WORKDIR /app
ENV NODE_ENV=production

# OpenSSL нужен для Prisma runtime, wget для health checks
# Remove ld.so.preload in case the base image or runtime is compromised
RUN apt-get update && apt-get install -y openssl wget --no-install-recommends && rm -rf /var/lib/apt/lists/* \
    && rm -f /etc/ld.so.preload

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/prisma ./prisma
COPY package*.json ./

RUN mkdir -p uploads/categories

EXPOSE 3001

CMD ["sh", "-c", "npx prisma db push --skip-generate && node dist/main.js"]
