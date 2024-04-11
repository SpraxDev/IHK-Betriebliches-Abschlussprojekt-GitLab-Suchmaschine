FROM docker.io/node:20-alpine as base

LABEL maintainer="Christian Koop <c.koop@ryze-digital.de>"

RUN apk add --no-cache file

RUN mkdir -p /app/ && \
    chown -R node:node /app/

USER node
WORKDIR /app/
COPY --chown=node:node package.json package-lock.json README.md LICENSE ./
COPY ./prisma/ ./prisma/


FROM base as builder

RUN npm clean-install

COPY --chown=node:node tsconfig.json ./
COPY --chown=node:node src/ ./src/
RUN npm run build


FROM base as prod

ENV NODE_ENV=production
RUN npm clean-install && \
    npm cache clean --force && \
    rm -Rf /home/node/.npm/

COPY --chown=node:node --from=builder /app/dist/ ./dist/
COPY --chown=node:node resources/ ./resources/

CMD ["node", "dist/main.js"]
