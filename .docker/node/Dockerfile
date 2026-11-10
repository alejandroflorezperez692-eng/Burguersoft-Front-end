FROM node:22-alpine

RUN apk update && apk upgrade --no-cache && apk add --no-cache git bash

WORKDIR /app
RUN chown -R node:node /app
USER node

COPY --chown=node:node package.json package-lock.json* ./
RUN npm install

EXPOSE 5173
CMD ["npm", "run", "dev", "--", "--host"]
