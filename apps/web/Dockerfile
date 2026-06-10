# Build stage
FROM node:22-bookworm-slim AS builder
WORKDIR /app

# Copy ALL package files to satisfy monorepo dependencies
COPY package.json package-lock.json ./
COPY apps/web/package.json ./apps/web/
COPY apps/server/package.json ./apps/server/

# Install ALL dependencies (monorepo root installs everything)
RUN npm install

# Copy source code
COPY apps/web ./apps/web
COPY apps/server ./apps/server

# Build the web application
WORKDIR /app/apps/web
RUN npm run build

# Production stage
FROM nginx:stable-alpine
COPY --from=builder /app/apps/web/dist /usr/share/nginx/html
RUN echo "server { listen 80; location / { root /usr/share/nginx/html; index index.html; try_files \$uri \$uri/ /index.html; } }" > /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
