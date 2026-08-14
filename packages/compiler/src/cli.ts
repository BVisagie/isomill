#!/usr/bin/env node
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { compileDefinition, writeIsomillTree } from "./compile.js";
import { generateKickstart } from "./fedora.js";
import { generateAutoinstall } from "./ubuntu.js";

function usage(): never {
  console.error(
    "usage: isomill compile <definition.json> [--out dir] [--kickstart] [--autoinstall]",
  );
  process.exit(2);
}

const args = process.argv.slice(2);
if (args[0] !== "compile" || !args[1]) usage();
const defPath = resolve(args[1]);
const outIdx = args.indexOf("--out");
const outDir = outIdx >= 0 ? resolve(args[outIdx + 1]!) : undefined;
const definition = JSON.parse(readFileSync(defPath, "utf8")) as never;
const result = compileDefinition(definition);

if (outDir) {
  mkdirSync(outDir, { recursive: true });
  writeIsomillTree(result, join(outDir, "isomill"));
  writeFileSync(join(outDir, "install.cfg"), result.installCfg);
  console.log(`wrote ${outDir}`);
} else {
  process.stdout.write(result.installCfg);
}

void dirname;
void generateKickstart;
void generateAutoinstall;
