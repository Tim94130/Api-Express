# ---- 1) base: installe les deps en clean ----
FROM node:20-alpine AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev

# ---- 2) runner léger pour prod ----
FROM node:20-alpine AS runner
ENV NODE_ENV=production
WORKDIR /app

# Copie deps et code
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Documente le port (mapping fait au run)
EXPOSE 3000

# Démarre l'app
CMD ["node", "server.js"]
