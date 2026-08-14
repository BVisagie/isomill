import { cpSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const webRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const repoRoot = join(webRoot, "../..");

const icons = join(repoRoot, "packages/catalogue/icons");
const dest = join(webRoot, "public/icons");
mkdirSync(dest, { recursive: true });
cpSync(icons, dest, { recursive: true });

const fixtureSrc = join(repoRoot, "fixtures/isomill");
const fixtureDest = join(webRoot, "public/fixture/isomill");
mkdirSync(fixtureDest, { recursive: true });
cpSync(fixtureSrc, fixtureDest, { recursive: true });

console.log("synced catalogue icons and sample /isomill fixture");
