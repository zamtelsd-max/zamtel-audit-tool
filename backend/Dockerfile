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

CMD ["node", "dist/index.js"]
