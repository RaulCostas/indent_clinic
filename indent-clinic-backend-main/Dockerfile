# Dockerfile para Backend NestJS
FROM node:18-alpine AS builder

WORKDIR /app

# Instalar herramientas de compilación necesarias para paquetes nativos (bcrypt, sharp, etc.)
RUN apk add --no-cache python3 make g++

# Copiar package files
COPY package*.json ./

# Instalar dependencias
RUN npm install

# Copiar código fuente
COPY . .

# Build de producción
RUN npm run build

# Eliminar dependencias de desarrollo para producción
RUN npm prune --production

# Etapa de producción
FROM node:18-alpine

WORKDIR /app

# Copiar package files y directorios necesarios
COPY package*.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist

# Exponer puerto
EXPOSE 3000

# Comando de inicio
CMD ["node", "dist/main"]
