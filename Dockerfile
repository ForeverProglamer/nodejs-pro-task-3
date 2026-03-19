# Image options: node:24.13.0-bookworm-slim, node:24.13.0-alpine

# Stage 1a - Install all deps. Artifact: ./node_modules
FROM node:24.13.0-bookworm-slim AS deps
WORKDIR /app

COPY package*.json ./
RUN npm ci

# Stage 1b - Install only prod deps. Artifact: ./node_modules
FROM node:24.13.0-bookworm-slim AS prod_deps
WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev

# Stage 2 - Build app for prod. Artifact: ./dist
FROM deps AS build
WORKDIR /app

COPY . ./

RUN npm run build

# Stage 3a - Dev container
FROM deps AS dev
WORKDIR /app

ENV NODE_ENV=development
# The code will be mounted into this container, so we do not copy it here

EXPOSE 3000
CMD ["npm", "run", "start:dev"]

# Stage 3b - Prod
FROM prod_deps AS prod
WORKDIR /app

ENV NODE_ENV=production

COPY --from=build /app/dist ./dist

EXPOSE 3000
CMD ["node", "./dist/src/main.js"]
