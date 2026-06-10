# Base image for building
FROM node:22-bookworm-slim AS builder
WORKDIR /app

# Copy package files first for better caching
COPY package.json package-lock.json ./
COPY apps/server/package.json ./apps/server/
COPY apps/web/package.json ./apps/web/

# Install dependencies
RUN npm install

# Copy server source and prisma schema
COPY apps/server ./apps/server

# Generate Prisma client
WORKDIR /app/apps/server
RUN npx prisma generate

# Build the application
RUN npm run build

# Production image
FROM node:22-bookworm-slim
RUN apt-get update && apt-get install -y openssl curl && rm -rf /var/lib/apt/lists/*
WORKDIR /app

COPY --from=builder /app/package.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/apps/server/dist ./apps/server/dist
COPY --from=builder /app/apps/server/package.json ./apps/server/
COPY --from=builder /app/apps/server/prisma ./apps/server/prisma
COPY --from=builder /app/apps/server/node_modules ./apps/server/node_modules

EXPOSE 3001
CMD ["sh", "-c", "npx prisma migrate deploy && node apps/server/dist/index.js"]
