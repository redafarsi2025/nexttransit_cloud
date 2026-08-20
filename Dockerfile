# syntax=docker/dockerfile:1

# ==============================================================================
# STAGE 1: Builder
# ==============================================================================
FROM node:22.14-bookworm-slim AS builder

WORKDIR /app

# Install dependencies (only package files to optimize cache)
COPY package.json package-lock.json ./
RUN npm ci

# Copy source files
COPY . .

# Build the application
RUN npm run build

# ==============================================================================
# STAGE 2: API Runtime
# ==============================================================================
FROM node:22.14-bookworm-slim AS api

WORKDIR /app

# Run as non-root user for security
RUN groupadd -r nodejs && useradd -r -g nodejs nodejs
USER nodejs

# API needs node_modules because esbuild uses --packages=external
# In a real-world scenario, we'd prune devDependencies (npm prune --production) 
# but for Smoke Testing with Vite we might need some, we'll just copy node_modules.
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./
COPY --from=builder /app/dist ./dist

# Expose API port and metrics port
EXPOSE 3000
EXPOSE 9090

# Entrypoint
CMD ["node", "dist/server.cjs"]

# ==============================================================================
# STAGE 3: Worker Runtime
# ==============================================================================
FROM node:22.14-bookworm-slim AS worker

WORKDIR /app

# Run as non-root user
RUN groupadd -r nodejs && useradd -r -g nodejs nodejs
USER nodejs

# Copy dependencies and build artifacts
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./
COPY --from=builder /app/dist ./dist

# Expose Metrics port
EXPOSE 9091

# Entrypoint
CMD ["node", "dist/worker.cjs"]
