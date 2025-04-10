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

# Copy package.json and package-lock.json first for better caching
COPY package*.json ./
RUN npm install

# Copy rest of the source code
COPY . .
ENV NODE_ENV=production
ENV DATABASE_URL="file:./prisma/dev.db"

RUN npm run prisma:generate

# Initialize and build
RUN npm run build

# Setup permissions
RUN chmod -R 755 /app/.next && \
    mkdir -p /app/playwright-projects && \
    chmod -R 777 /app/playwright-projects

# Create and setup Playwright project
RUN mkdir -p /app/playwright-projects/default && \
    cd /app/playwright-projects/default && \
    npx create-playwright@latest --quiet --install-deps

RUN rm -rf /app/prisma/dev.db

# Set entrypoint and expose port
ENTRYPOINT ["/usr/bin/tini", "--"]
EXPOSE 3000
CMD ["npm", "start"]