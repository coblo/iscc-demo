FROM node:13-alpine
EXPOSE 80
WORKDIR /app

RUN apk add --no-cache nginx && mkdir -p /run/nginx
COPY .ci/nginx/ /etc/nginx/
COPY . /app/

RUN (test -f config.js || (echo "config.js wasn't found. Using config.example.js..." && cp config.example.js config.js)) \
  ; npm run live-setup

CMD nginx -g "daemon off;"
