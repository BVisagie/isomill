import { describe, expect, it } from "vitest";
import { app } from "./app.js";

describe("api compile (no db)", () => {
  it("compiles a definition to kickstart", async () => {
    const res = await app.request("/compile", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        schemaVersion: 1,
        os: { distribution: "fedora", release: "44", architecture: "x86_64" },
        desktop: { environment: "gnome" },
        locale: { language: "en_US", keyboard: "us", timezone: "UTC" },
        applications: ["git"],
      }),
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as { adapter: string; installCfg: string };
    expect(body.adapter).toBe("kickstart");
    expect(body.installCfg).toContain("lang en_US.UTF-8");
  });
});
