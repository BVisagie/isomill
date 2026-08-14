FROM fedora:44
RUN dnf -y install lorax xorriso isomd5sum gnupg2 nodejs python3 wget findutils \
  && dnf clean all
WORKDIR /app
COPY package.json package-lock.json ./
COPY packages ./packages
COPY workers ./workers
COPY apps/api/package.json ./apps/api/package.json
COPY apps/web/package.json ./apps/web/package.json
COPY fixtures ./fixtures
RUN npm install \
  && npm run build -w @isomill/schema \
  && npm run build -w @isomill/catalogue \
  && npm run build -w @isomill/compiler \
  && npm run build -w @isomill/resolver \
  && npm run build -w @isomill/worker \
  && chmod +x workers/fedora/inject.sh workers/ubuntu/inject.sh
ENV NODE_ENV=production
ENV NODE_USE_ENV_PROXY=1
ENV WORKER_ROOT=/app
WORKDIR /app/workers/runner
CMD ["node", "dist/index.js"]
