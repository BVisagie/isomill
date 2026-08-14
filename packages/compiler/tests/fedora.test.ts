import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { generateKickstart } from "../src/fedora.js";
import { assertKickstartSafety } from "../src/common.js";

const sample = JSON.parse(
  readFileSync(
    join(dirname(fileURLToPath(import.meta.url)), "../../../fixtures/definitions/sample-fedora.json"),
    "utf8",
  ),
);

describe("fedora kickstart", () => {
  it("maps en_GB to Anaconda lang and keymap strings", () => {
    const ks = generateKickstart(sample);
    expect(ks).toMatch(/^lang en_GB\.UTF-8$/m);
    expect(ks).toMatch(/^keyboard --vckeymap=gb$/m);
    expect(ks).toMatch(/^timezone Europe\/Amsterdam --utc$/m);
  });

  it("maps en_US to Anaconda lang en_US.UTF-8", () => {
    const ks = generateKickstart({
      ...sample,
      locale: { language: "en_US", keyboard: "us", timezone: "UTC" },
    });
    expect(ks).toMatch(/^lang en_US\.UTF-8$/m);
    expect(ks).toMatch(/^keyboard --vckeymap=us$/m);
  });

  it("never wipes disks or sets identity", () => {
    const ks = generateKickstart(sample);
    expect(ks).not.toMatch(/zerombr|clearpart|autopart|rootpw|^\s*user\b/m);
    assertKickstartSafety(ks);
  });

  it("installs workstation environment and catalogue packages", () => {
    const ks = generateKickstart(sample);
    expect(ks).toContain("@^workstation-product-environment");
    expect(ks).toContain("\ngit\n");
    expect(ks).toContain("neovim");
    expect(ks).toContain("code");
    expect(ks).toContain("docker-ce");
    expect(ks).toContain("nodejs");
  });

  it("installs npm apps with --ignore-scripts and never curl|bash", () => {
    const ks = generateKickstart(sample);
    expect(ks).toContain("npm install -g --ignore-scripts @anthropic-ai/claude-code");
    expect(ks).not.toMatch(/curl\s+\|/);
    expect(ks).not.toContain("claude.ai/install");
  });

  it("adds vendor repo URLs from the catalogue", () => {
    const ks = generateKickstart(sample);
    expect(ks).toContain("packages.microsoft.com/yumrepos/vscode");
    expect(ks).toContain("download.docker.com/linux/fedora");
  });

  it("matches the golden snapshot", () => {
    expect(generateKickstart(sample)).toMatchSnapshot();
  });
});
