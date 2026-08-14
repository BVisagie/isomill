import { randomUUID } from "node:crypto";
import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { catalogue, egressHosts } from "@isomill/catalogue";
import { buildSourceGraph, compileDefinition } from "@isomill/compiler";
import { validateMachineDefinition, type MachineDefinition } from "@isomill/schema";
import {
  claimQueued,
  getBuild,
  getObservedFingerprint,
  insertBuild,
  setObservedFingerprint,
  updateBuild,
} from "./db.js";

export const app = new Hono();

app.use("*", cors());

app.get("/health", (c) => c.json({ ok: true }));

app.get("/catalogue", (c) => c.json(catalogue));

app.get("/egress-hosts", (c) => {
  const includeNpm = c.req.query("npm") === "1";
  return c.json({ hosts: egressHosts(catalogue, { includeNpm }) });
});

app.post("/source-graph", async (c) => {
  const body = await c.req.json();
  validateMachineDefinition(body);
  const isoVerified = c.req.query("isoVerified") === "1";
  return c.json({ nodes: buildSourceGraph(body, catalogue, { isoVerified }) });
});

app.post("/compile", async (c) => {
  const body = await c.req.json();
  validateMachineDefinition(body);
  const result = compileDefinition(body);
  return c.json({
    adapter: result.adapter,
    installCfg: result.installCfg,
    provenance: result.provenance,
    readme: result.readme,
  });
});

app.post("/builds", async (c) => {
  const body = (await c.req.json()) as unknown;
  validateMachineDefinition(body);
  const id = randomUUID();
  const row = await insertBuild(id, body as MachineDefinition);
  return c.json(publicBuild(row), 201);
});

app.get("/builds/:id", async (c) => {
  const row = await getBuild(c.req.param("id"));
  if (!row) return c.json({ error: "not found" }, 404);
  return c.json(publicBuild(row));
});

app.post("/builds/:id/acknowledge-key", async (c) => {
  const row = await getBuild(c.req.param("id"));
  if (!row) return c.json({ error: "not found" }, 404);
  if (row.status !== "UPSTREAM_KEY_CHANGED") {
    return c.json({ error: "build is not waiting on a key change" }, 409);
  }
  if (!row.key_url || !row.observed_fingerprint) {
    return c.json({ error: "missing observed key" }, 500);
  }
  await setObservedFingerprint(row.key_url, row.observed_fingerprint);
  const next = await updateBuild(row.id, {
    status: "QUEUED",
    error: null,
  });
  return c.json(publicBuild(next));
});

app.get("/builds/:id/iso", async (c) => {
  const row = await getBuild(c.req.param("id"));
  if (!row) return c.json({ error: "not found" }, 404);
  if (row.status !== "READY" || !row.iso_path) {
    return c.json({ error: "iso not ready" }, 409);
  }
  const info = await stat(row.iso_path);
  c.header("content-type", "application/octet-stream");
  c.header(
    "content-disposition",
    `attachment; filename="isomill-${row.id}.iso"`,
  );
  c.header("content-length", String(info.size));
  return c.body(createReadStream(row.iso_path) as never);
});

app.get("/cache/iso-status", async (c) => {
  const distro = c.req.query("distribution");
  const release = c.req.query("release");
  if (!distro || !release) return c.json({ verified: false });
  const os = catalogue.oses[`${distro}-${release}`];
  if (!os) return c.json({ verified: false });
  const keyUrl = os.media.gpgKeyUrl;
  const fp = await getObservedFingerprint(keyUrl);
  return c.json({
    verified: Boolean(fp),
    observedFingerprint: fp ?? null,
  });
});

app.get("/internal/jobs/claim", async (c) => {
  const token = c.req.header("x-isomill-worker");
  if (token !== (process.env.WORKER_TOKEN ?? "dev-worker")) {
    return c.json({ error: "unauthorized" }, 401);
  }
  const row = await claimQueued();
  if (!row) return c.json({ job: null });
  const os = catalogue.oses[`${row.definition.os.distribution}-${row.definition.os.release}`];
  const last = os ? await getObservedFingerprint(os.media.gpgKeyUrl) : undefined;
  return c.json({ job: publicBuild(row), lastObservedFingerprint: last ?? null });
});

app.patch("/internal/jobs/:id", async (c) => {
  const token = c.req.header("x-isomill-worker");
  if (token !== (process.env.WORKER_TOKEN ?? "dev-worker")) {
    return c.json({ error: "unauthorized" }, 401);
  }
  const body = (await c.req.json()) as Parameters<typeof updateBuild>[1];
  const next = await updateBuild(c.req.param("id"), body);
  if (body.status === "SOURCE_READY" && body.observed_fingerprint && next.key_url) {
    await setObservedFingerprint(next.key_url, body.observed_fingerprint);
  }
  return c.json(publicBuild(next));
});

function publicBuild(row: Awaited<ReturnType<typeof getBuild>>) {
  if (!row) return null;
  return {
    id: row.id,
    status: row.status,
    definition: row.definition,
    error: row.error,
    keyChange:
      row.status === "UPSTREAM_KEY_CHANGED"
        ? {
            previousFingerprint: row.previous_fingerprint,
            observedFingerprint: row.observed_fingerprint,
            keyUrl: row.key_url,
            keyDocsUrl: row.key_docs_url,
            publisher: row.publisher,
          }
        : null,
    isoSha256: row.iso_sha256,
    provenance: row.provenance,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    downloadPath: row.status === "READY" ? `/builds/${row.id}/iso` : null,
  };
}
