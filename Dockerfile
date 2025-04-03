FROM mcr.microsoft.com/playwright:v1.43.0-jammy AS base

WORKDIR /app

RUN apt-get update && apt-get install -y curl \
    && curl -fsSL https://deb.nodesource.com/setup_22.x | bash - \
    && apt-get install -y nodejs \
    && npm install -g npm \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

RUN curl -L https://github.com/vishnubob/wait-for-it/raw/master/wait-for-it.sh -o /usr/local/bin/wait-for-it.sh \
    && chmod +x /usr/local/bin/wait-for-it.sh

COPY package*.json ./

RUN npm ci

COPY . .

RUN npx prisma generate

RUN chmod +x ./reset-db.sh

FROM mcr.microsoft.com/playwright:v1.43.0-jammy AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV NEXT_SHARP_PATH=/app/node_modules/sharp

RUN apt-get update && apt-get install -y curl \
    && curl -fsSL https://deb.nodesource.com/setup_22.x | bash - \
    && apt-get install -y nodejs \
    && npm install -g npm \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

COPY --from=base /usr/local/bin/wait-for-it.sh /usr/local/bin/wait-for-it.sh
COPY --from=base /app/reset-db.sh /usr/local/bin/reset-db.sh

COPY --from=base /app/package*.json ./
COPY --from=base /app/next.config.js ./
COPY --from=base /app/public ./public
COPY --from=base /app/node_modules ./node_modules
COPY --from=base /app/prisma ./prisma
COPY --from=base /app/.env* ./

RUN chmod +x /usr/local/bin/wait-for-it.sh \
    && chmod +x /usr/local/bin/reset-db.sh

# Expose port
EXPOSE 3000

CMD ["sh", "-c", "/usr/local/bin/wait-for-it.sh ai-db:5432 -- /usr/local/bin/reset-db.sh --reset && npm run build && npm start"]