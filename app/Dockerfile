# Multi-stage Dockerfile for Next.js 16 (App Router)
# Build stage
FROM node:20-alpine AS builder

# Set working directory
WORKDIR /app

# Install OS deps if needed (sharp, etc.)
RUN apk add --no-cache libc6-compat

# Copy package manifests and install deps
COPY package.json package-lock.json* pnpm-lock.yaml* yarn.lock* ./
RUN \
  if [ -f yarn.lock ]; then yarn --frozen-lockfile; \
  elif [ -f pnpm-lock.yaml ]; then corepack enable && pnpm i --frozen-lockfile; \
  else npm ci; fi

# Copy source
COPY . .

# Build
ENV NEXT_TELEMETRY_DISABLED 1
RUN npm run build

# Runtime stage
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Add a non-root user
RUN addgroup -g 1001 -S nodejs && adduser -S nextjs -u 1001

# Copy the standalone output and public assets
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/public ./public

# Create data directory for persistence (writable by nextjs user)
RUN mkdir -p data/uploads && chown -R nextjs:nodejs data

# Port for Next.js
ENV PORT=3000
EXPOSE 3000

# Run as non-root
USER nextjs

# Start the server
CMD ["node", "server.js"]
