# === Base Stage ===
FROM ubuntu:noble AS base

WORKDIR /app

# Install Node.js 22 and essential tools
RUN apt-get update && apt-get install -y curl gnupg \
    && curl -fsSL https://deb.nodesource.com/setup_22.x | bash - \
    && apt-get install -y nodejs \
    && npm install -g npm \
    && apt-get clean && rm -rf /var/lib/apt/lists/*

# Copy and install dependencies
COPY package*.json ./
RUN npm ci

# Copy the full source
COPY . .

# Set environment variables
ENV DATABASE_URL="file:/app/prisma/dev.db"

# Initialize database and generate Prisma client
RUN npx prisma generate \
    && chmod +x ./reset-db.sh \
    && ./reset-db.sh --reset

# Build the Next.js app
RUN npm run build

# === Runner Stage ===
FROM ubuntu:noble AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV NEXT_SHARP_PATH=/app/node_modules/sharp
ENV DATABASE_URL="file:/app/prisma/dev.db"

# Install Node.js 22
RUN apt-get update && apt-get install -y curl gnupg \
    && curl -fsSL https://deb.nodesource.com/setup_22.x | bash - \
    && apt-get install -y nodejs \
    && npm install -g npm \
    && apt-get clean && rm -rf /var/lib/apt/lists/*clear

# Add tini for proper signal handling
RUN apt-get update && apt-get install -y tini

# Set tini as the entrypoint
ENTRYPOINT ["/usr/bin/tini", "--"]

# Copy built app from base stage
COPY --from=base /app/package*.json ./
COPY --from=base /app/next.config.js ./
COPY --from=base /app/public ./public
COPY --from=base /app/.next ./.next
COPY --from=base /app/node_modules ./node_modules
COPY --from=base /app/prisma ./prisma
COPY --from=base /app/reset-db.sh /usr/local/bin/reset-db.sh

# Create appuser
RUN useradd -m appuser

# Create and set permissions for necessary directories
RUN mkdir -p /app/playwright-projects \
    && chown -R appuser:appuser /app/.next \
    && chown -R appuser:appuser /app/public \
    && chown -R appuser:appuser /app/prisma \
    && chown -R appuser:appuser /app/playwright-projects \
    && chown appuser:appuser /app/package*.json \
    && chown appuser:appuser /app/next.config.js

# Set permissions for reset-db.sh
RUN chown appuser:appuser /usr/local/bin/reset-db.sh \
    && chmod +x /usr/local/bin/reset-db.sh

USER appuser

EXPOSE 3000
