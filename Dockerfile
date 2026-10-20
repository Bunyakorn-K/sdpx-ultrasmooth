# Use the same pinned Node major and Debian base in every application stage.
FROM node:24-bookworm-slim AS deps
# Keep the checkout at a predictable path.
WORKDIR /app
# Cache installation until a dependency manifest changes.
COPY package.json package-lock.json ./
# Install exactly the versions recorded in the lockfile.
RUN npm ci

# Build the application with the full toolchain.
FROM deps AS build
# Copy source after dependencies to preserve the dependency layer cache.
COPY . .
# Avoid telemetry and identify the production build.
ENV NEXT_TELEMETRY_DISABLED=1
# Build without requiring a database connection during prerendering.
RUN npm run build

# Supply a repeatable unit and browser test image.
FROM deps AS test
# Install the Chromium version matched to the locked Playwright package.
RUN npx playwright install --with-deps chromium
# Include application code and the test harness.
COPY . .
# Disable telemetry in automated tests.
# Chromium needs a UTF-8 locale to preserve Thai download filenames.
ENV NEXT_TELEMETRY_DISABLED=1 LANG=C.UTF-8 LC_ALL=C.UTF-8
# Make unit testing the default container command.
CMD ["npm", "test"]

# Produce a dependency tree containing no development tools.
FROM node:24-bookworm-slim AS production-deps
# Install production dependencies in an isolated directory.
WORKDIR /app
# Keep the production dependency layer cacheable.
COPY package.json package-lock.json ./
# Exclude lint, coverage and browser test tooling from production.
RUN npm ci --omit=dev && npm cache clean --force

# Run only the compiled application and production dependencies.
FROM node:24-bookworm-slim AS runtime
# Use the same absolute working directory as the build.
WORKDIR /app
# Configure the compiled application for production.
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 HOSTNAME=0.0.0.0 PORT=3000 LANG=C.UTF-8 LC_ALL=C.UTF-8
# Copy only production dependencies.
COPY --from=production-deps --chown=node:node /app/node_modules ./node_modules
# Retain package scripts and version metadata.
COPY --from=build --chown=node:node /app/package.json ./package.json
# Include only compiled Next.js output.
COPY --from=build --chown=node:node /app/.next ./.next
# Include public assets and the Next.js runtime configuration.
COPY --from=build --chown=node:node /app/public ./public
COPY --from=build --chown=node:node /app/next.config.ts ./next.config.ts
# Drop root privileges before handling requests.
USER node
# Document the application port; Compose publishes it explicitly.
EXPOSE 3000
# Check HTTP readiness instead of merely checking process existence.
HEALTHCHECK --interval=15s --timeout=5s --start-period=30s --retries=3 CMD node -e "fetch('http://127.0.0.1:3000/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
# Bind to all container interfaces while keeping the runtime non-root.
CMD ["npm", "run", "start", "--", "--hostname", "0.0.0.0"]
