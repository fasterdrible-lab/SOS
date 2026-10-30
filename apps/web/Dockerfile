FROM node:22-slim

RUN apt-get update -y && apt-get install -y --no-install-recommends openssl && rm -rf /var/lib/apt/lists/*

WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1

# O postinstall roda `prisma generate`, entao o schema precisa estar presente antes do npm ci.
COPY . .
RUN npm ci --no-audit --no-fund
RUN npm run build

ENV NODE_ENV=production
RUN chown -R node:node /app/.next
USER node

EXPOSE 3000
CMD ["npx", "next", "start", "-H", "0.0.0.0", "-p", "3000"]
