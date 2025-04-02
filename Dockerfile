# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy source code
COPY . .

# Set environment variables for build
ENV DATABASE_URL="postgresql://postgres:postgres@db:5432/ai_test_management"
ENV POSTGRES_URL="postgresql://postgres:postgres@db:5432/ai_test_management"
ENV POSTGRES_URL_NON_POOLING="postgresql://postgres:postgres@db:5432/ai_test_management"
ENV POSTGRES_USER="postgres"
ENV POSTGRES_HOST="db"
ENV POSTGRES_PASSWORD="postgres"
ENV POSTGRES_DATABASE="ai_test_management"
ENV POSTGRES_URL_NO_SSL="postgresql://postgres:postgres@db:5432/ai_test_management"
ENV POSTGRES_PRISMA_URL="postgresql://postgres:postgres@db:5432/ai_test_management?connect_timeout=15"

# Generate Prisma client
RUN npx prisma generate

# Build application
RUN npm run build

# Production stage
FROM node:20-alpine AS runner

WORKDIR /app

# Set to production
ENV NODE_ENV=production

# Copy necessary files from builder
COPY --from=builder /app/next.config.js ./
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/prisma ./prisma

# Set environment variables for runtime
ENV DATABASE_URL="postgresql://postgres:postgres@db:5432/ai_test_management"
ENV POSTGRES_URL="postgresql://postgres:postgres@db:5432/ai_test_management"
ENV POSTGRES_URL_NON_POOLING="postgresql://postgres:postgres@db:5432/ai_test_management"
ENV POSTGRES_USER="postgres"
ENV POSTGRES_HOST="db"
ENV POSTGRES_PASSWORD="postgres"
ENV POSTGRES_DATABASE="ai_test_management"
ENV POSTGRES_URL_NO_SSL="postgresql://postgres:postgres@db:5432/ai_test_management"
ENV POSTGRES_PRISMA_URL="postgresql://postgres:postgres@db:5432/ai_test_management?connect_timeout=15"

# Expose port
EXPOSE 3000

# Start the application
CMD ["node", "server.js"] 