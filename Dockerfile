# ======================
# STEP 1: Build Stage
# ======================
FROM node:20-alpine AS builder

# Set working directory
WORKDIR /app

# Salin file package.json dan install dependencies
COPY package*.json ./
RUN npm install

# Salin semua source code dan file penting lainnya
COPY . .

# Pastikan file .env dibawa untuk build-time
COPY .env .env

# Jalankan build Next.js
RUN npm run build


# ======================
# STEP 2: Production Stage
# ======================
FROM node:20-alpine AS runner

# Set working directory
WORKDIR /app

# Set environment variable untuk production
ENV NODE_ENV=production

# Copy hasil build dan konfigurasi dari tahap builder
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/next.config.mjs ./next.config.mjs
COPY --from=builder /app/.env .env

# Buka port 3000 untuk aplikasi Next.js
EXPOSE 3000

# Jalankan aplikasi
CMD ["npm", "start"]
