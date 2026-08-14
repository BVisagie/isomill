import { describe, expect, it } from "vitest";
import { validateMachineDefinition } from "./validate.js";

describe("machine definition schema", () => {
  it("accepts a valid definition", () => {
    expect(() =>
      validateMachineDefinition({
        schemaVersion: 1,
        os: {
          distribution: "fedora",
          release: "44",
          architecture: "x86_64",
        },
        desktop: { environment: "gnome" },
        locale: {
          language: "en_GB",
          keyboard: "gb",
          timezone: "Europe/Amsterdam",
        },
        applications: ["git"],
        services: ["ssh"],
      }),
    ).not.toThrow();
  });

  it("rejects identity and storage fields", () => {
    expect(() =>
      validateMachineDefinition({
        schemaVersion: 1,
        os: {
          distribution: "fedora",
          release: "44",
          architecture: "x86_64",
        },
        desktop: { environment: "gnome" },
        locale: {
          language: "en_US",
          keyboard: "us",
          timezone: "UTC",
        },
        user: "alice",
      }),
    ).toThrow();
  });
});
