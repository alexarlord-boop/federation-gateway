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

# Configure nginx for SPA routing and API proxy
RUN echo 'server { \
    listen 80; \
    server_name localhost; \
    root /usr/share/nginx/html; \
    index index.html; \
    \
    # Proxy API requests to backend \
    location /api/ { \
        proxy_pass http://backend:8765; \
        proxy_http_version 1.1; \
        proxy_set_header Upgrade $http_upgrade; \
        proxy_set_header Connection "upgrade"; \
        proxy_set_header Host $http_host; \
        proxy_set_header X-Real-IP $remote_addr; \
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for; \
        proxy_set_header X-Forwarded-Proto $scheme; \
    } \
    \
    # Hashed assets (JS/CSS/fonts) — cache forever, filename changes on rebuild \
    location ~* \\.(?:js|css|woff2?|ttf|eot|svg|png|ico|webp)$ { \
        expires 1y; \
        add_header Cache-Control "public, max-age=31536000, immutable"; \
        try_files $uri =404; \
    } \
    \
    # HTML — never cache so the browser always fetches the current entry point \
    location ~* \\.html$ { \
        add_header Cache-Control "no-store, no-cache, must-revalidate"; \
        try_files $uri $uri/ /index.html; \
    } \
    \
    # SPA routing \
    location / { \
        add_header Cache-Control "no-store, no-cache, must-revalidate"; \
        try_files $uri $uri/ /index.html; \
    } \
}' > /etc/nginx/conf.d/default.conf

# Expose port 80
EXPOSE 80

# Start nginx
CMD ["nginx", "-g", "daemon off;"]
