# ---------- BUILD ----------
FROM node:20-alpine AS build

WORKDIR /app
ARG VITE_API_BASE_URL=http://localhost:3000
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

# ---------- RUN ----------
FROM nginx:alpine

LABEL org.opencontainers.image.revision=$GITHUB_SHA

# Copiar build de React
COPY --from=build /app/dist /usr/share/nginx/html

# Configuración SPA correcta
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

# Healthcheck CORRECTO (sin localhost)
HEALTHCHECK --interval=10s --timeout=5s --retries=5 --start-period=10s \
  CMD wget --spider -q http://127.0.0.1 || exit 1

CMD ["nginx", "-g", "daemon off;"]
