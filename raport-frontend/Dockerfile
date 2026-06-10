FROM node:22-alpine AS build
WORKDIR /app

COPY package*.json ./
# Ignorujemy błędy rozwiązywania drzewa zależności, które pokazały się u Ciebie przy npm install
RUN npm install --legacy-peer-deps

COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html

# Aplikacje SPA rzadko posiadają serwowanie na zewnątrz z domyślnej konfiguracji, ale tu bez routera zadziała podstawowy index.html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
