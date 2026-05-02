# Etapa builder
FROM node:20 AS builder
WORKDIR /app

# Copiar package y tsconfig
COPY package*.json tsconfig*.json prisma ./
RUN npm install

# Copiar todo el código
COPY . .

ARG DATABASE_URL
ENV DATABASE_URL=$DATABASE_URL
# Generar Prisma en src/core/lib/prisma/generated
RUN npx prisma generate --schema=./prisma/schema.prisma

# Compilar TypeScript
RUN npm run build

# Etapa runtime
FROM node:20 AS runtime
WORKDIR /app

# Copiar el build compilado
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules

# Copiar Prisma generado al mismo path relativo dentro de dist
#COPY --from=builder /app/src/core/lib/prisma/generated ./dist/core/lib/prisma/generated

ENV NODE_ENV=production
EXPOSE 3000

CMD ["node", "dist/index.js"]