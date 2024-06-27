FROM node:18-alpine3.19

RUN apk add --no-cache curl

RUN mkdir -p /usr/local/docker-sync

COPY src/ /usr/local/docker-sync/

COPY healthcheck /usr/local/bin/
RUN chmod +x /usr/local/bin/healthcheck

RUN ls /usr/local/docker-sync

RUN cd /usr/local/docker-sync && npm i

ENTRYPOINT [ "node", "/usr/local/docker-sync/script.js"]