FROM node:20-alpine AS build

WORKDIR /app
COPY . .

RUN npm install -g mintlify
RUN mintlify build

FROM nginx:alpine

COPY --from=build /app/.mintlify/output /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 3100

CMD ["nginx", "-g", "daemon off;"]
