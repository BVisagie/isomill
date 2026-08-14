FROM node:22-bookworm-slim
WORKDIR /app
COPY package.json package-lock.json ./
COPY packages ./packages
COPY apps/api ./apps/api
COPY apps/web/package.json ./apps/web/package.json
COPY workers/runner/package.json ./workers/runner/package.json
COPY fixtures ./fixtures
RUN npm install \
  && npm run build -w @isomill/schema \
  && npm run build -w @isomill/catalogue \
  && npm run build -w @isomill/compiler \
  && npm run build -w @isomill/resolver \
  && npm run build -w @isomill/api
WORKDIR /app/apps/api
ENV NODE_ENV=production
EXPOSE 3001
CMD ["node", "dist/index.js"]
