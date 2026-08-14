import { describe, expect, it } from "vitest";
import { expandDefinition } from "@isomill/catalogue";
import { prepareDefinition } from "../src/common.js";

describe("unavailable apps", () => {
  it("refuses Ghostty on Fedora 44", () => {
    expect(() =>
      prepareDefinition({
        schemaVersion: 1,
        os: { distribution: "fedora", release: "44", architecture: "x86_64" },
        desktop: { environment: "gnome" },
        locale: { language: "en_US", keyboard: "us", timezone: "UTC" },
        applications: ["ghostty"],
      }),
    ).toThrow(/Not in official/);
  });

  it("allows Ghostty on Ubuntu 26.04", () => {
    const def = prepareDefinition({
      schemaVersion: 1,
      os: { distribution: "ubuntu", release: "26.04", architecture: "aarch64" },
      desktop: { environment: "gnome" },
      locale: { language: "en_US", keyboard: "us", timezone: "UTC" },
      applications: ["ghostty"],
    });
    expect(def.applications).toContain("ghostty");
  });

  it("refuses Chromium on Ubuntu because the archive package is a Snap stub", () => {
    expect(() =>
      prepareDefinition({
        schemaVersion: 1,
        os: { distribution: "ubuntu", release: "24.04", architecture: "x86_64" },
        desktop: { environment: "gnome" },
        locale: { language: "en_US", keyboard: "us", timezone: "UTC" },
        applications: ["chromium"],
      }),
    ).toThrow(/Snap/);
  });
});

void expandDefinition;
