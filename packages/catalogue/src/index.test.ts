import { describe, expect, it } from "vitest";
import {
  catalogue,
  expandDefinition,
  getMedia,
  isAppAvailable,
  osChoices,
} from "./index.js";

const fedora = {
  schemaVersion: 1 as const,
  os: { distribution: "fedora" as const, release: "44", architecture: "x86_64" as const },
  desktop: { environment: "gnome" as const },
  locale: { language: "en_GB", keyboard: "gb", timezone: "Europe/Amsterdam" },
};

describe("catalogue", () => {
  it("loads a versioned catalogue", () => {
    expect(catalogue.version).toBe("1.1.0");
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
});
