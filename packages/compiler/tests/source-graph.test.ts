import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { buildSourceGraph } from "../src/source-graph.js";

const sample = JSON.parse(
  readFileSync(
    join(
      dirname(fileURLToPath(import.meta.url)),
      "../../../fixtures/definitions/sample-fedora.json",
    ),
    "utf8",
  ),
);

describe("source graph badges", () => {
  it("uses Official repository for distro apps and not for npm", () => {
    const nodes = buildSourceGraph(sample);
    const git = nodes.find((n) => n.name === "Git")!;
    const vscode = nodes.find((n) => n.name === "Visual Studio Code")!;
    const claude = nodes.find((n) => n.name === "Claude Code CLI")!;
    const os = nodes[0]!;

    expect(git.badges.map((b) => b.label)).toContain("Official repository");
    expect(vscode.badges.map((b) => b.label)).toEqual([
      "First-party vendor",
      "Approved source",
    ]);
    expect(claude.badges.map((b) => b.kind)).toEqual(["npm-allowlist"]);
    expect(claude.badges[0]!.label).toBe("npm allowlist — not distro-signed");
    expect(os.badges.map((b) => b.label)).toContain("Will verify official ISO");
    expect(os.badges.map((b) => b.label)).not.toContain("ISO verified");
  });

  it("shows ISO verified only when this instance has a verified cache", () => {
    const nodes = buildSourceGraph(sample, undefined, { isoVerified: true });
    expect(nodes[0]!.badges.map((b) => b.label)).toContain("ISO verified");
  });
});
