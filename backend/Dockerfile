FROM node:20-alpine AS deps
WORKDIR /app
COPY backend/package*.json ./
RUN npm ci --only=production

FROM node:20-alpine AS builder
WORKDIR /app
COPY backend ./backend
RUN cd backend && npm ci && npm run build || echo "No build step; using ts-node at runtime"

FROM node:20-alpine
WORKDIR /app
ENV NODE_ENV=production
COPY --from=deps /app/node_modules ./backend/node_modules
COPY backend ./backend
EXPOSE 4000
CMD ["node", "backend/src/index.ts"]

