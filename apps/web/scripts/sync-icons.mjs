import { cpSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const icons = join(here, "../../packages/catalogue/icons");
const dest = join(here, "public/icons");
mkdirSync(dest, { recursive: true });
cpSync(icons, dest, { recursive: true });
const fixtureSrc = join(here, "../../fixtures/isomill");
const fixtureDest = join(here, "public/fixture/isomill");
mkdirSync(fixtureDest, { recursive: true });
cpSync(fixtureSrc, fixtureDest, { recursive: true });
console.log("synced catalogue icons and sample /isomill fixture");
