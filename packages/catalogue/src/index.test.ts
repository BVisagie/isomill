import { describe, expect, it } from "vitest";
import { catalogue, expandDefinition, isAppAvailable } from "./index.js";

const fedora = {
  schemaVersion: 1 as const,
  os: { distribution: "fedora" as const, release: "44", architecture: "x86_64" as const },
  desktop: { environment: "gnome" as const },
  locale: { language: "en_GB", keyboard: "gb", timezone: "Europe/Amsterdam" },
};

describe("catalogue", () => {
  it("loads a versioned catalogue", () => {
    expect(catalogue.version).toBe("1.0.0");
    expect(catalogue.applications.length).toBeGreaterThan(20);
  });

  it("gates Ghostty on v1 distros", () => {
    const ghostty = catalogue.applications.find((a) => a.id === "ghostty")!;
    expect(isAppAvailable(ghostty, fedora)).toBe(false);
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
