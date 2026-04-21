FROM node:20-alpine

# Install openssl for Prisma engine compatibility
RUN apk add --no-cache openssl

WORKDIR /app

# Install ALL deps (including devDeps like tsc) for build
COPY package*.json ./
COPY prisma ./prisma/

RUN npm ci

# Copy source and build
COPY . .

RUN npm run build

# Generate Prisma client with correct binary target
RUN npx prisma generate

# Prune devDependencies after build
RUN npm prune --production

EXPOSE 3001

# Push schema to DB (works with pooler port 6543), then start
CMD sh -c "npx prisma db push --skip-generate --accept-data-loss 2>/dev/null || true && node dist/index.js"
