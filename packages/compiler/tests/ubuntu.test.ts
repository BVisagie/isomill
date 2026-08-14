import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import YAML from "yaml";
import {
  generateAutoinstall,
  parseAutoinstallUserData,
} from "../src/ubuntu.js";
import { assertAutoinstallSafety } from "../src/common.js";

const sample = JSON.parse(
  readFileSync(
    join(
      dirname(fileURLToPath(import.meta.url)),
      "../../../fixtures/definitions/sample-ubuntu.json",
    ),
    "utf8",
  ),
);

describe("ubuntu 24.04 autoinstall", () => {
  it("emits a legal user-data document with autoinstall root", () => {
    const { userData } = generateAutoinstall(sample);
    expect(userData.startsWith("#cloud-config\n")).toBe(true);
    const doc = parseAutoinstallUserData(userData);
    expect(Object.keys(doc)).toEqual(["autoinstall"]);
    assertAutoinstallSafety(doc);
    const auto = doc.autoinstall as Record<string, unknown>;
    expect(auto.version).toBe(1);
    expect(auto["interactive-sections"]).toEqual(["identity", "storage"]);
    expect(auto.identity).toBeUndefined();
    expect(auto.storage).toBeUndefined();
  });

  it("maps en_GB to Subiquity locale and keyboard.layout gb", () => {
    const { userData } = generateAutoinstall(sample);
    const auto = parseAutoinstallUserData(userData).autoinstall as {
      locale: string;
      keyboard: { layout: string };
      timezone: string;
    };
    expect(auto.locale).toBe("en_GB.UTF-8");
    expect(auto.keyboard.layout).toBe("gb");
    expect(auto.timezone).toBe("Europe/Amsterdam");
  });

  it("maps en_US to en_US.UTF-8 and layout us", () => {
    const { userData } = generateAutoinstall({
      ...sample,
      locale: { language: "en_US", keyboard: "us", timezone: "UTC" },
    });
    const auto = parseAutoinstallUserData(userData).autoinstall as {
      locale: string;
      keyboard: { layout: string };
    };
    expect(auto.locale).toBe("en_US.UTF-8");
    expect(auto.keyboard.layout).toBe("us");
  });

  it("YAML parses with no stray top-level keys", () => {
    const { userData } = generateAutoinstall(sample);
    const parsed = YAML.parse(userData.replace(/^#cloud-config\n/, ""));
    expect(parsed).toEqual(parseAutoinstallUserData(userData));
    expect(Object.keys(parsed)).toEqual(["autoinstall"]);
  });

  it("installs npm with --ignore-scripts in late-commands", () => {
    const { userData } = generateAutoinstall(sample);
    expect(userData).toContain(
      "npm install -g --ignore-scripts @anthropic-ai/claude-code",
    );
    expect(userData).not.toMatch(/curl\s+\|/);
  });

  it("never wipes disks", () => {
    const { userData } = generateAutoinstall(sample);
    expect(userData).not.toMatch(/zerombr|clearpart|autopart|storage:/);
  });

  it("matches the golden snapshot", () => {
    expect(generateAutoinstall(sample).userData).toMatchSnapshot();
  });

  it("substitutes arm64 into vendor apt lines", () => {
    const { userData } = generateAutoinstall({
      ...sample,
      os: { ...sample.os, architecture: "aarch64" },
    });
    expect(userData).toContain("deb [arch=arm64] https://packages.microsoft.com/repos/code");
    expect(userData).not.toContain("arch=amd64");
  });

  it("compiles Ubuntu 26.04 LTS", () => {
    const { userData } = generateAutoinstall({
      ...sample,
      os: { distribution: "ubuntu", release: "26.04", architecture: "x86_64" },
    });
    expect(userData).toContain("deb [arch=amd64] https://download.docker.com/linux/ubuntu resolute stable");
  });

  it("installs Mozilla Firefox as a vendor deb and pins it over the Snap stub", () => {
    const { userData } = generateAutoinstall({
      ...sample,
      applications: ["firefox"],
    });
    expect(userData).toContain("packages.mozilla.org/apt");
    expect(userData).toContain("Pin: origin packages.mozilla.org");
    expect(userData).toContain("Pin-Priority: 1000");
    expect(userData).toContain("snap remove firefox");
    expect(userData).toContain("apt-get install -y firefox");
    expect(userData).not.toContain("apt-get purge -y firefox");
  });

  it("drops Ubuntu's default Firefox Snap when another browser is selected", () => {
    const { userData } = generateAutoinstall({
      ...sample,
      applications: ["gnome-web"],
    });
    expect(userData).toContain("epiphany-browser");
    expect(userData).toContain("snap remove firefox");
    expect(userData).toContain("apt-get purge -y firefox");
  });
});
