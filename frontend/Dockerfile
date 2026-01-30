# Frontend Dockerfile (Static Export)
FROM node:20-alpine AS builder

WORKDIR /app

COPY projects/Rolodex/frontend/package.json projects/Rolodex/frontend/package-lock.json ./
RUN npm ci

COPY projects/Rolodex/frontend ./

# Build-time variables - THESE MUST BE PROVIDED
ARG NEXT_PUBLIC_API_BASE_URL
ENV NEXT_PUBLIC_API_BASE_URL=$NEXT_PUBLIC_API_BASE_URL

# Build static export (output: 'export' in next.config.js)
RUN npm run build

# Serve with Nginx
FROM nginx:alpine

COPY --from=builder /app/out /usr/share/nginx/html
COPY projects/Rolodex/frontend/nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
