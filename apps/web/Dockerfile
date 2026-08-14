FROM node:24-bookworm-slim AS build
WORKDIR /app
COPY package.json package-lock.json ./
COPY packages ./packages
COPY apps ./apps
COPY workers/runner/package.json ./workers/runner/package.json
COPY fixtures ./fixtures
RUN npm install \
  && npm run build -w @isomill/schema \
  && npm run build -w @isomill/catalogue \
  && npm run build -w @isomill/compiler \
  && npm run build -w @isomill/web

FROM node:24-bookworm-slim
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /app /app
WORKDIR /app/apps/web
EXPOSE 3000
CMD ["npx", "next", "start", "--port", "3000"]
