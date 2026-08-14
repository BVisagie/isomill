FROM ubuntu:24.04
RUN apt-get update && apt-get install -y --no-install-recommends squid ca-certificates nodejs \
  && rm -rf /var/lib/apt/lists/*
COPY packages/catalogue/src/catalogue.json /opt/isomill/packages/catalogue/src/catalogue.json
COPY workers/egress-proxy /opt/isomill/workers/egress-proxy
WORKDIR /opt/isomill
RUN node workers/egress-proxy/generate-allowlist.mjs /etc/squid/squid.conf
EXPOSE 3128
CMD ["squid", "-N", "-d", "1"]
