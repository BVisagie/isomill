#!/usr/bin/env node
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "../..");
const catalogue = JSON.parse(
  readFileSync(join(root, "packages/catalogue/src/catalogue.json"), "utf8"),
);

const hosts = new Set();
const add = (url) => {
  try {
    hosts.add(new URL(url).hostname);
  } catch {
    /* ignore */
  }
};

for (const os of Object.values(catalogue.oses)) {
  for (const media of Object.values(os.media)) {
    add(media.downloadUrl);
    add(media.checksumUrl);
    if (media.checksumSignatureUrl) add(media.checksumSignatureUrl);
    add(media.gpgKeyUrl);
  }
}
for (const app of catalogue.applications) {
  for (const target of Object.values(app.targets)) {
    if (target.vendor) {
      add(target.vendor.repoUrl);
      add(target.vendor.keyUrl);
    }
  }
}

if (process.env.ALLOW_NPM === "1") {
  hosts.add("registry.npmjs.org");
}

const sorted = [...hosts].sort();
const acl = sorted.map((h) => `acl isomill_ok dstdomain ${h}`).join("\n");

const conf = `
http_port 3128
visible_hostname isomill-egress
access_log stdio:stdout
cache deny all
dns_v4_first on

acl SSL_ports port 443
acl Safe_ports port 80
acl Safe_ports port 443
acl CONNECT method CONNECT

${acl}

http_access deny !Safe_ports
http_access deny CONNECT !SSL_ports
http_access allow isomill_ok
http_access deny all
`;

const out = process.argv[2] ?? "/etc/squid/squid.conf";
writeFileSync(out, conf);
console.error(`wrote ${sorted.length} hosts to ${out}`);
console.log(sorted.join("\n"));
