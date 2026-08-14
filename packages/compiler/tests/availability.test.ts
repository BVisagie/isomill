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
});

void expandDefinition;
