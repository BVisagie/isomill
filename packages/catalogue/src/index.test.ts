import { readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import {
  catalogue,
  expandDefinition,
  getMedia,
  GROUPS,
  isAppAvailable,
  osChoices,
  shouldDropDistroFirefox,
} from "./index.js";

const iconsDir = join(dirname(fileURLToPath(import.meta.url)), "../icons");

function unboundPrefixes(xml: string) {
  const declared = new Set(["xml", "xmlns"]);
  for (const match of xml.matchAll(/\sxmlns:([A-Za-z_][\w.-]*)=/g)) {
    declared.add(match[1]);
  }
  const unbound = new Set<string>();
  for (const match of xml.matchAll(/<\/?([A-Za-z_][\w.-]*):/g)) {
    if (!declared.has(match[1])) unbound.add(match[1]);
  }
  for (const match of xml.matchAll(/\s([A-Za-z_][\w.-]*):[A-Za-z_][\w.-]*="/g)) {
    if (match[1] !== "xmlns" && !declared.has(match[1])) unbound.add(match[1]);
  }
  return [...unbound];
}

const fedora = {
  schemaVersion: 1 as const,
  os: { distribution: "fedora" as const, release: "44", architecture: "x86_64" as const },
  desktop: { environment: "gnome" as const },
  locale: { language: "en_GB", keyboard: "gb", timezone: "Europe/Amsterdam" },
};

describe("catalogue", () => {
  it("loads a versioned catalogue", () => {
    expect(catalogue.version).toBe("1.2.0");
    expect(catalogue.applications.length).toBeGreaterThan(20);
    expect(osChoices().map((o) => o.key)).toEqual([
      "fedora-44",
      "ubuntu-24.04",
      "ubuntu-26.04",
    ]);
    for (const os of Object.values(catalogue.oses)) {
      expect(os.media.x86_64.filename).toBeTruthy();
      expect(os.media.aarch64.filename).toBeTruthy();
    }
    expect(
      getMedia({
        ...fedora,
        os: { distribution: "ubuntu", release: "26.04", architecture: "aarch64" },
      }).filename,
    ).toBe("ubuntu-26.04-desktop-arm64.iso");
  });

  it("gates Ghostty on Fedora 44 and Ubuntu 24.04", () => {
    const ghostty = catalogue.applications.find((a) => a.id === "ghostty")!;
    expect(isAppAvailable(ghostty, fedora)).toBe(false);
    expect(
      isAppAvailable(ghostty, {
        ...fedora,
        os: { distribution: "ubuntu", release: "24.04", architecture: "x86_64" },
      }),
    ).toBe(false);
    expect(
      isAppAvailable(ghostty, {
        ...fedora,
        os: { distribution: "ubuntu", release: "26.04", architecture: "aarch64" },
      }),
    ).toBe(true);
    expect(ghostty.unavailableReason).toMatch(/Not in official/);
  });

  it("auto-selects nodejs for npm apps", () => {
    const expanded = expandDefinition({
      ...fedora,
      applications: ["claude-code"],
    });
    expect(expanded.applications).toContain("nodejs");
    expect(expanded.applications).toContain("claude-code");
  });

  it("offers browsers from first-party or vendor sources, not snaps", () => {
    const ids = catalogue.applications
      .filter((a) => a.group === "browsers")
      .map((a) => a.id);
    expect(ids).toEqual(["firefox", "chromium", "brave-origin"]);
    const chromium = catalogue.applications.find((a) => a.id === "chromium")!;
    expect(isAppAvailable(chromium, fedora)).toBe(true);
    expect(
      isAppAvailable(chromium, {
        ...fedora,
        os: { distribution: "ubuntu", release: "24.04", architecture: "x86_64" },
      }),
    ).toBe(false);
    expect(chromium.unavailableReason).toMatch(/Snap/);
  });

  it("drops the desktop Firefox only when another browser is chosen", () => {
    expect(shouldDropDistroFirefox({ ...fedora, applications: ["git"] })).toBe(false);
    expect(shouldDropDistroFirefox({ ...fedora, applications: ["firefox"] })).toBe(false);
    expect(shouldDropDistroFirefox({ ...fedora, applications: ["chromium"] })).toBe(true);
    expect(
      shouldDropDistroFirefox({ ...fedora, applications: ["firefox", "chromium"] }),
    ).toBe(false);
  });

  it("exposes every catalogue app group in GROUPS so the demo can tile them", () => {
    const exposed = new Set(GROUPS.map((group) => group.id));
    for (const app of catalogue.applications) {
      expect(exposed.has(app.group), `${app.id} group ${app.group}`).toBe(true);
    }
  });

  it("ships well-formed icon SVGs that browsers can load as images", () => {
    const iconFiles = new Set(
      readdirSync(iconsDir).filter((name) => name.endsWith(".svg")),
    );
    for (const app of catalogue.applications) {
      expect(iconFiles.has(app.icon), app.icon).toBe(true);
    }
    for (const os of Object.values(catalogue.oses)) {
      if (os.icon) expect(iconFiles.has(os.icon), os.icon).toBe(true);
    }
    for (const name of iconFiles) {
      const xml = readFileSync(join(iconsDir, name), "utf8");
      expect(unboundPrefixes(xml), name).toEqual([]);
    }
  });
});
