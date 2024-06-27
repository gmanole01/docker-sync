FROM node:18-alpine3.19

RUN mkdir -p /usr/local/docker-sync

COPY src/ /usr/local/docker-sync/

COPY healthcheck /usr/local/bin/

RUN ls /usr/local/docker-sync

RUN cd /usr/local/docker-sync && npm i

CMD ["node", "/usr/local/docker-sync/script.js"]