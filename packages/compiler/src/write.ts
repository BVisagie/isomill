import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import type { CompileResult } from "./compile.js";

export function writeIsomillTree(result: CompileResult, dir: string): void {
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, "README.txt"), result.readme);
  writeFileSync(join(dir, "SOURCES.txt"), result.sources);
  writeFileSync(
    join(dir, "provenance.json"),
    `${JSON.stringify(result.provenance, null, 2)}\n`,
  );
  writeFileSync(
    join(dir, "machine-definition.json"),
    `${JSON.stringify(result.definition, null, 2)}\n`,
  );
  writeFileSync(join(dir, "install.cfg"), result.installCfg);
  writeFileSync(join(dir, "catalogue.lock.json"), result.catalogueLock);
  if (result.userData) {
    writeFileSync(join(dir, "user-data"), result.userData);
  }
  if (result.metaData) {
    writeFileSync(join(dir, "meta-data"), result.metaData);
  }
}
