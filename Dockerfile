# Base stage
FROM node:20-slim AS base

# Install system dependencies
RUN apt-get update && apt-get install -y \
    openssl \
    && rm -rf /var/lib/apt/lists/*

# Builder stage
FROM base AS builder

# Install build dependencies
RUN apt-get update && apt-get install -y \
    python3 \
    make \
    g++ \
    && rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./
COPY prisma ./prisma/

# Install dependencies
RUN npm install

# Copy source code
COPY . .

# Generate Prisma client
RUN npx prisma generate

# Build the application
RUN npm run build

# Runner stage
FROM base AS runner

# Install Playwright dependencies
RUN apt-get update && apt-get install -y \
    libwebkit2gtk-4.0-37 \
    libgtk-3-0 \
    libasound2 \
    libnss3 \
    libxss1 \
    libatk1.0-0t64 \
    libatk-bridge2.0-0t64 \
    libcups2 \
    libdrm2 \
    libxkbcommon0 \
    libxcomposite1 \
    libxdamage1 \
    libxfixes3 \
    libxrandr2 \
    libgbm1 \
    libpango-1.0-0 \
    libcairo2 \
    libasound2-data \
    libatk-bridge2.0-0 \
    libatk1.0-0 \
    libatk1.0-data \
    libatspi2.0-0 \
    libcairo-gobject2 \
    libcolord2 \
    libcups2 \
    libepoxy0 \
    libfontconfig1 \
    libgdk-pixbuf2.0-0 \
    libgdk-pixbuf2.0-common \
    libgraphite2-3 \
    libgtk-3-0 \
    libgtk-3-common \
    libharfbuzz0b \
    libjbig0 \
    libjpeg-turbo8 \
    libjpeg8 \
    liblcms2-2 \
    libnspr4 \
    libnss3 \
    libpango-1.0-0 \
    libpangocairo-1.0-0 \
    libpangoft2-1.0-0 \
    libpixman-1-0 \
    librest-0.7-0 \
    libsoup2.4-1 \
    libthai-data \
    libthai0 \
    libtiff5 \
    libwayland-client0 \
    libwayland-cursor0 \
    libwayland-egl1 \
    libwayland-server0 \
    libwebp6 \
    libwebpdemux2 \
    libwoff1 \
    libx11-6 \
    libx11-data \
    libx11-xcb1 \
    libxau6 \
    libxcb1 \
    libxcb-render0 \
    libxcb-shm0 \
    libxcomposite1 \
    libxcursor1 \
    libxdamage1 \
    libxdmcp6 \
    libxext6 \
    libxfixes3 \
    libxi6 \
    libxinerama1 \
    libxkbcommon0 \
    libxrandr2 \
    libxrender1 \
    libxss1 \
    libxtst6 \
    x11-common \
    xkb-data \
    && rm -rf /var/lib/apt/lists/*

# Create a non-root user
RUN useradd -m -s /bin/bash playwright

# Copy reset-db.sh and set permissions
COPY reset-db.sh /usr/local/bin/
RUN chmod +x /usr/local/bin/reset-db.sh

# Create necessary directories
RUN mkdir -p /app/playwright-projects && \
    chown -R playwright:playwright /app/playwright-projects

# Switch to non-root user
USER playwright

# Set working directory
WORKDIR /app

# Copy package files
COPY --from=builder --chown=playwright:playwright /app/package*.json ./
COPY --from=builder --chown=playwright:playwright /app/prisma ./prisma
COPY --from=builder --chown=playwright:playwright /app/dist ./dist
COPY --from=builder --chown=playwright:playwright /app/public ./public
COPY --from=builder --chown=playwright:playwright /app/.next ./.next

# Install production dependencies
RUN npm install --production

# Expose port
EXPOSE 3000

# Start the application
CMD ["npm", "start"]