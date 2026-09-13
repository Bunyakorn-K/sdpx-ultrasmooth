# Stage 1: Install dependencies based on lockfile
FROM node:24-alpine AS deps
# Install libc6-compat and required system utilities
RUN apk add --no-cache libc6-compat curl bash
# Set the container working directory
WORKDIR /app
# Install bun globally for fast deterministic lockfile installs
RUN npm install -g bun@1.2.4
# Copy dependency manifests first to leverage Docker layer caching
COPY package.json bun.lock ./
# Install dependencies using frozen lockfile
RUN bun install --frozen-lockfile

# Stage 2: Build the Next.js application
FROM node:24-alpine AS build
# Set working directory for build process
WORKDIR /app
# Copy installed dependencies from deps stage
COPY --from=deps /app/node_modules ./node_modules
# Copy full application source files
COPY . .
# Disable Next.js telemetry collection during build
ENV NEXT_TELEMETRY_DISABLED=1
# Set production node environment for compilation
ENV NODE_ENV=production
# Install bun for building with next
RUN npm install -g bun@1.2.4 && bun run build

# Stage 3: Test runner stage for CI and local verification
FROM node:24-alpine AS test
# Set working directory for tests
WORKDIR /app
# Copy dependencies and application code
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# Set environment flag for test execution
ENV NODE_ENV=test
# Run vitest test suite by default in this stage
CMD ["npm", "test"]

# Stage 4: Minimal production runtime
FROM node:24-alpine AS runtime
# Set working directory for the application server
WORKDIR /app
# Set environment to production
ENV NODE_ENV=production
# Disable telemetry in production runtime
ENV NEXT_TELEMETRY_DISABLED=1
# Install curl to support health check polling
RUN apk add --no-cache curl
# Create dedicated non-root group and user
RUN addgroup --system --gid 1001 nodejs && adduser --system --uid 1001 nextjs
# Copy public static files
COPY --from=build /app/public ./public
# Copy compiled Next.js build artifacts with non-root ownership
COPY --from=build --chown=nextjs:nodejs /app/.next ./.next
# Copy node_modules with non-root ownership
COPY --from=build --chown=nextjs:nodejs /app/node_modules ./node_modules
# Copy package manifest
COPY --from=build --chown=nextjs:nodejs /app/package.json ./package.json
# Switch from root to non-root user
USER nextjs
# Inform Docker that the container listens on port 3000
EXPOSE 3000
# Configure periodic health check probing /api/health
HEALTHCHECK --interval=15s --timeout=5s --start-period=10s --retries=3 \
  CMD curl -f http://localhost:3000/api/health || exit 1
# Launch production server via next start
CMD ["node_modules/.bin/next", "start"]