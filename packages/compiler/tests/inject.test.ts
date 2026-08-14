import { accessSync, constants } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const root = join(dirname(fileURLToPath(import.meta.url)), "../../..");

describe("iso inject scripts", () => {
  it("ships fedora mkksiso and ubuntu xorriso injectors", () => {
    for (const rel of ["workers/fedora/inject.sh", "workers/ubuntu/inject.sh"]) {
      accessSync(join(root, rel), constants.R_OK);
    }
  });

  it("ubuntu injector replays the source boot catalog", () => {
    const sh = require("node:fs").readFileSync(
      join(root, "workers/ubuntu/inject.sh"),
      "utf8",
    );
    expect(sh).toContain("-boot_image any replay");
    expect(sh).toContain("/isomill");
    expect(sh).toContain("/nocloud");
  });

  it("fedora injector embeds /isomill via mkksiso", () => {
    const sh = require("node:fs").readFileSync(
      join(root, "workers/fedora/inject.sh"),
      "utf8",
    );
    expect(sh).toContain("mkksiso");
    expect(sh).toContain("isomill");
  });
});
