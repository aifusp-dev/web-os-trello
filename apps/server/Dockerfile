# Base image for building
FROM node:20-alpine AS builder
WORKDIR /app

# Copy root workspace files
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
FROM node:20-alpine
RUN apk add --no-cache curl
WORKDIR /app

COPY --from=builder /app/package.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/apps/server/dist ./apps/server/dist
COPY --from=builder /app/apps/server/package.json ./apps/server/
COPY --from=builder /app/apps/server/prisma ./apps/server/prisma
COPY --from=builder /app/apps/server/node_modules ./apps/server/node_modules

EXPOSE 3001
CMD ["npm", "run", "start", "--workspace=apps/server"]
