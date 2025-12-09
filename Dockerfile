# Build Stage
FROM node:20-alpine as build
WORKDIR /app

# 1. Copy only package.json (removed package-lock.json)
COPY package.json ./

# 2. Use 'npm install' instead of 'npm ci'
# (Generates the missing lockfile automatically)
RUN npm install

COPY . .
RUN npm run build

# Serve Stage
FROM nginx:alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
