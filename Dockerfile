FROM ubuntu:noble

WORKDIR /app

# Install Node.js and dependencies
RUN apt-get update && \
    apt-get install -y curl gnupg tini && \
    curl -fsSL https://deb.nodesource.com/setup_22.x | bash - && \
    apt-get install -y nodejs && \
    npm install -g npm && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*

# Copy and install dependencies
COPY package*.json prisma ./
RUN npm install

# Copy source and build
COPY . .
ENV NODE_ENV=production
ENV DATABASE_URL="file:/app/prisma/dev.db"

# Initialize and build
RUN chmod +x ./reset-db.sh && \
    ./reset-db.sh --reset && \
    npm run build

# Setup permissions
RUN chmod -R 755 /app/.next && \
    mkdir -p /app/playwright-projects && \
    chmod -R 777 /app/playwright-projects

# Create and setup Playwright project
RUN mkdir -p /app/playwright-projects/default && \
    cd /app/playwright-projects/default && \
    npx create-playwright@latest --quiet --install-deps

# Set entrypoint and expose port
ENTRYPOINT ["/usr/bin/tini", "--"]
EXPOSE 3000
CMD ["npm", "start"]