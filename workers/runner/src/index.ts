import { createHash } from "node:crypto";
import { createWriteStream } from "node:fs";
import { mkdir, readFile, stat } from "node:fs/promises";
import { dirname, join } from "node:path";
import { pipeline } from "node:stream/promises";
import { fileURLToPath } from "node:url";
import { spawn } from "node:child_process";
import { catalogue, getMedia } from "@isomill/catalogue";
import { compileDefinition, writeIsomillTree } from "@isomill/compiler";
import {
  resolveOfficialIso,
  UpstreamKeyChangedError,
  verifyIsoBytes,
} from "@isomill/resolver";
import type { MachineDefinition } from "@isomill/schema";

const API = process.env.API_URL ?? "http://api:3001";
const TOKEN = process.env.WORKER_TOKEN ?? "dev-worker";
const CACHE = process.env.ISO_CACHE ?? "/iso-cache";
const OUT = process.env.ISO_OUT ?? "/iso-out";
const ROOT = process.env.WORKER_ROOT ?? join(dirname(fileURLToPath(import.meta.url)), "../../..");

async function api(path: string, init?: RequestInit) {
  const res = await fetch(`${API}${path}`, {
    ...init,
    headers: {
      "content-type": "application/json",
      "x-isomill-worker": TOKEN,
      ...(init?.headers ?? {}),
    },
  });
  if (!res.ok) {
    throw new Error(`${path} ${res.status} ${await res.text()}`);
  }
  return res.json();
}

function run(cmd: string, args: string[]): Promise<void> {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, { stdio: "inherit" });
    child.on("exit", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`${cmd} exited ${code}`));
    });
  });
}

async function download(url: string, dest: string): Promise<void> {
  await mkdir(dirname(dest), { recursive: true });
  const res = await fetch(url);
  if (!res.ok || !res.body) throw new Error(`download failed ${url} ${res.status}`);
  await pipeline(res.body as never, createWriteStream(dest));
}

async function sha256File(path: string): Promise<string> {
  const buf = await readFile(path);
  return createHash("sha256").update(buf).digest("hex");
}

async function handleJob(job: {
  id: string;
  definition: MachineDefinition;
  lastObservedFingerprint?: string | null;
}): Promise<void> {
  const definition = job.definition;
  const os = catalogue.oses[`${definition.os.distribution}-${definition.os.release}`];
  if (!os) throw new Error("unsupported os");
  const media = getMedia(definition);

  try {
    const resolved = await resolveOfficialIso(
      media,
      os.publisher,
      fetch,
      { fingerprint: job.lastObservedFingerprint ?? undefined },
    );

    const cachePath = join(CACHE, media.filename);
    let needFetch = true;
    try {
      const bytes = await readFile(cachePath);
      if (verifyIsoBytes(bytes, resolved.checksumValue)) needFetch = false;
    } catch {
      needFetch = true;
    }
    if (needFetch) {
      await download(resolved.downloadUrl, cachePath);
      const bytes = await readFile(cachePath);
      if (!verifyIsoBytes(bytes, resolved.checksumValue)) {
        throw new Error("cached ISO did not match official checksum");
      }
    }

    await api(`/internal/jobs/${job.id}`, {
      method: "PATCH",
      body: JSON.stringify({
        status: "SOURCE_READY",
        key_url: resolved.gpgKeyUrl,
        observed_fingerprint: resolved.observedKey.fingerprint,
        publisher: os.publisher,
        key_docs_url: media.keyDocsUrl,
      }),
    });

    await api(`/internal/jobs/${job.id}`, {
      method: "PATCH",
      body: JSON.stringify({ status: "BUILDING" }),
    });

    const compiled = compileDefinition(definition, catalogue, {
      isoVerified: true,
      upstream: {
        distribution: definition.os.distribution,
        release: definition.os.release,
        filename: resolved.filename,
        downloadUrl: resolved.downloadUrl,
        checksumAlgorithm: "sha256",
        checksumValue: resolved.checksumValue,
        checksumUrl: resolved.checksumUrl,
        checksumSignatureUrl: resolved.checksumSignatureUrl,
        signatureVerified: true,
        gpgKeyUrl: resolved.gpgKeyUrl,
        observedKeyFingerprint: resolved.observedKey.fingerprint,
        keyFetchedAt: resolved.observedKey.fetchedAt,
      },
      builder: {
        version: "0.1.0",
        gitCommit: process.env.ISOMILL_GIT_COMMIT ?? "unknown",
      },
    });

    const work = join("/tmp", `isomill-${job.id}`);
    const tree = join(work, "isomill");
    await mkdir(tree, { recursive: true });
    writeIsomillTree(compiled, tree);

    const outIso = join(OUT, `${job.id}.iso`);
    await mkdir(OUT, { recursive: true });

    if (definition.os.distribution === "fedora") {
      const ks = join(work, "ks.cfg");
      const { writeFile } = await import("node:fs/promises");
      await writeFile(ks, compiled.installCfg);
      await run("bash", [
        join(ROOT, "workers/fedora/inject.sh"),
        cachePath,
        ks,
        tree,
        outIso,
      ]);
    } else {
      const { writeFile } = await import("node:fs/promises");
      const ud = join(work, "user-data");
      const md = join(work, "meta-data");
      await writeFile(ud, compiled.userData ?? compiled.installCfg);
      await writeFile(md, compiled.metaData ?? "instance-id: isomill\n");
      await run("bash", [
        join(ROOT, "workers/ubuntu/inject.sh"),
        cachePath,
        ud,
        md,
        tree,
        outIso,
      ]);
    }

    await api(`/internal/jobs/${job.id}`, {
      method: "PATCH",
      body: JSON.stringify({ status: "VERIFYING" }),
    });

    const digest = await sha256File(outIso);
    const info = await stat(outIso);
    if (info.size < 10_000_000) {
      throw new Error("output ISO is implausibly small");
    }

    await api(`/internal/jobs/${job.id}`, {
      method: "PATCH",
      body: JSON.stringify({
        status: "READY",
        iso_path: outIso,
        iso_sha256: digest,
        provenance: compiled.provenance,
      }),
    });
  } catch (err) {
    if (err instanceof UpstreamKeyChangedError) {
      await api(`/internal/jobs/${job.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          status: "UPSTREAM_KEY_CHANGED",
          previous_fingerprint: err.previousFingerprint,
          observed_fingerprint: err.observedFingerprint,
          key_url: err.keyUrl,
          key_docs_url: err.keyDocsUrl,
          publisher: err.publisher,
          error: err.message,
        }),
      });
      return;
    }
    throw err;
  }
}

async function loop(): Promise<void> {
  console.log("isomill worker polling");
  for (;;) {
    try {
      const claimed = (await api("/internal/jobs/claim")) as {
        job: { id: string; definition: MachineDefinition } | null;
        lastObservedFingerprint: string | null;
      };
      if (!claimed.job) {
        await new Promise((r) => setTimeout(r, 2000));
        continue;
      }
      try {
        await handleJob({
          ...claimed.job,
          lastObservedFingerprint: claimed.lastObservedFingerprint,
        });
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        console.error("job failed", claimed.job.id, message);
        await api(`/internal/jobs/${claimed.job.id}`, {
          method: "PATCH",
          body: JSON.stringify({ status: "FAILED", error: message }),
        });
      }
    } catch (err) {
      console.error("poll error", err);
      await new Promise((r) => setTimeout(r, 4000));
    }
  }
}

await loop();
