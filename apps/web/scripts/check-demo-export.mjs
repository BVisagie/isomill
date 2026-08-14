import { existsSync, readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const webRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const repoRoot = join(webRoot, "../..");
const outDir = join(webRoot, "out");
const cataloguePath = join(repoRoot, "packages/catalogue/src/catalogue.json");

function fail(message) {
  console.error(message);
  process.exit(1);
}

if (!existsSync(join(outDir, "index.html"))) {
  fail(
    "apps/web/out/index.html is missing. Run ISOMILL_DEMO=1 npm run build:demo -w @isomill/web first.",
  );
}

function collectText(dir) {
  let text = "";
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === "icons" || entry.name === "fixture") continue;
      text += collectText(path);
      continue;
    }
    if (!/\.(html|js|txt)$/.test(entry.name)) continue;
    text += readFileSync(path, "utf8");
  }
  return text;
}

const catalogue = JSON.parse(readFileSync(cataloguePath, "utf8"));
const haystack = collectText(outDir);
const missing = [];

for (const app of catalogue.applications) {
  if (!existsSync(join(outDir, "icons", app.icon))) {
    missing.push(`out/icons/${app.icon} (${app.id})`);
  }
  if (!haystack.includes(app.icon)) {
    missing.push(`icon reference ${app.icon} (${app.id})`);
  }
}

if (!existsSync(join(outDir, ".nojekyll"))) missing.push("out/.nojekyll");

if (missing.length) {
  fail(
    `Demo export drifted from the catalogue:\n${missing.map((line) => `  - ${line}`).join("\n")}\nThe Pages demo is apps/web with ISOMILL_DEMO=1, not a separate site.`,
  );
}

console.log(`demo export includes ${catalogue.applications.length} catalogue apps`);
