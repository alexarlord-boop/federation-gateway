# Build stage
FROM oven/bun:1 AS builder

WORKDIR /app

# Copy package files
COPY package.json bun.lockb ./

# Install dependencies
RUN bun install

# Copy source code
COPY . .

# Build the application
RUN bun run build

# Production stage
FROM nginx:alpine

# Copy built assets from builder stage
COPY --from=builder /app/dist /usr/share/nginx/html

# nginx:alpine's stock entrypoint renders any /etc/nginx/templates/*.template
# through envsubst into /etc/nginx/conf.d/ at container *start* (not build
# time), so BACKEND_HOST/BACKEND_PORT can be overridden per-deployment
# without touching this image — see nginx/default.conf.template.
COPY nginx/default.conf.template /etc/nginx/templates/default.conf.template
ENV BACKEND_HOST=backend
ENV BACKEND_PORT=8765

# Expose port 80
EXPOSE 80

# Start nginx
CMD ["nginx", "-g", "daemon off;"]
