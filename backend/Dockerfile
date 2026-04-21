FROM node:20-alpine

WORKDIR /app

# Install ALL deps (including devDeps like tsc) for build
COPY package*.json ./
COPY prisma ./prisma/

RUN npm ci

# Copy source and build
COPY . .

RUN npm run build

# Prune devDependencies after build
RUN npm prune --production

EXPOSE 3001

CMD ["node", "dist/index.js"]
