# === Base Stage ===
FROM ubuntu:noble AS base

USER root

WORKDIR /app

# Install Node.js 22 and essential tools
RUN apt-get update && apt-get install -y curl gnupg \
    && curl -fsSL https://deb.nodesource.com/setup_22.x | bash - \
    && apt-get install -y nodejs \
    && npm install -g npm \
    && apt-get install -y \
        libatk1.0-0t64 \
        libatk-bridge2.0-0t64 \
        libcups2t64 \
        libxdamage1 \
        libpango-1.0-0 \
        libcairo2 \
        libasound2t64 \
        libatspi2.0-0t64 \
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

# Install Node.js 22 and Playwright dependencies
RUN apt-get update && apt-get install -y curl gnupg \
    && curl -fsSL https://deb.nodesource.com/setup_22.x | bash - \
    && apt-get install -y nodejs \
    && npm install -g npm \
    && apt-get install -y \
        libatk1.0-0t64 \
        libatk-bridge2.0-0t64 \
        libcups2t64 \
        libxdamage1 \
        libpango-1.0-0 \
        libcairo2 \
        libasound2t64 \
        libatspi2.0-0t64 \
    && apt-get clean && rm -rf /var/lib/apt/lists/*

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

RUN useradd -m playwright
RUN chown -R playwright:playwright /app
USER playwright


RUN mkdir -p /app/playwright-projects
RUN chmod -R 777 /app/playwright-projects

EXPOSE 3000