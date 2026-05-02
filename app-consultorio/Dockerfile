FROM node:20 AS builder
WORKDIR /app

# 👇 IMPORTANTE: declarar args
ARG VITE_BACKEND_URL
ARG VITE_STATIC_URL

# 👇 hacerlos visibles para el build (Vite)
ENV VITE_BACKEND_URL=$VITE_BACKEND_URL
ENV VITE_STATIC_URL=$VITE_STATIC_URL

COPY package*.json ./
RUN npm install

COPY . .

# (opcional pero útil para debug)
RUN echo "BACKEND=$VITE_BACKEND_URL"

RUN npm run build


FROM nginx:stable-alpine
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]