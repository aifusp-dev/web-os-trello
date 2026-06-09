# Build stage
FROM node:22-alpine AS builder
WORKDIR /app

COPY apps/web/package.json ./apps/web/
COPY apps/server/package.json ./apps/server/
COPY package.json package-lock.json ./

# Install all dependencies including devDependencies for build
RUN npm install

COPY apps/web ./apps/web
WORKDIR /app/apps/web
RUN npm run build

# Production stage
FROM nginx:stable-alpine
COPY --from=builder /app/apps/web/dist /usr/share/nginx/html
RUN echo "server { listen 80; location / { root /usr/share/nginx/html; index index.html; try_files \$uri \$uri/ /index.html; } }" > /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
