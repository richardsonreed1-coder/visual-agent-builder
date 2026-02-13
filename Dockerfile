# Stage 1: Build frontend
FROM node:20-alpine AS frontend-build

WORKDIR /app

# Copy frontend package files and install dependencies
COPY package.json package-lock.json* ./
RUN npm ci --ignore-scripts

# Copy frontend source and config files
COPY tsconfig.json tsconfig.node.json vite.config.ts tailwind.config.js postcss.config.js index.html ./
COPY src/ src/
COPY shared/ shared/

# Build frontend
RUN npm run build

# Stage 2: Server
FROM node:20-alpine

WORKDIR /app/server

# Copy server package files and install dependencies
COPY server/package.json server/package-lock.json* ./
RUN npm ci --omit=dev

# Copy server source and shared types
COPY server/ .
COPY shared/ /app/shared/

# Copy built frontend into server/public for static serving
COPY --from=frontend-build /app/dist ./public

EXPOSE 3001

ENV NODE_ENV=production
ENV PORT=3001

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3001/api/health || exit 1

CMD ["npm", "start"]
