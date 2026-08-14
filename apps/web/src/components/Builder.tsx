"use client";

import { useEffect, useMemo, useState } from "react";
import type { Architecture, BuildStatus, MachineDefinition } from "@isomill/schema";
import { compileDefinition } from "@isomill/compiler/preview";
import { catalogue, buildSourceGraph, osChoices, archLabel } from "@isomill/catalogue";
import { AppTiles } from "./AppTiles";
import { BrandMark } from "./BrandMark";
import { GitHubLink, SOURCE_REPO } from "./GitHubLink";
import { ProvenanceDialog } from "./ProvenanceDialog";
import { SourceGraph } from "./SourceGraph";
import { Stepper } from "./Stepper";

const DEMO = process.env.NEXT_PUBLIC_ISOMILL_DEMO === "1";
const API = process.env.NEXT_PUBLIC_API_URL ?? "http://127.0.0.1:3001";

const initial: MachineDefinition = {
  schemaVersion: 1,
  os: { distribution: "fedora", release: "44", architecture: "x86_64" },
  desktop: { environment: "gnome" },
  locale: { language: "en_GB", keyboard: "gb", timezone: "Europe/Amsterdam" },
  applications: ["git", "neovim", "btop"],
  services: ["ssh"],
};

type KeyChange = {
  previousFingerprint: string;
  observedFingerprint: string;
  keyUrl: string;
  keyDocsUrl: string;
  publisher: string;
};

export function Builder() {
  const [def, setDef] = useState<MachineDefinition>(initial);
  const [isoVerified, setIsoVerified] = useState(false);
  const [status, setStatus] = useState<BuildStatus | null>(null);
  const [buildId, setBuildId] = useState<string | null>(null);
  const [keyChange, setKeyChange] = useState<KeyChange | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showProv, setShowProv] = useState(false);
  const [downloadPath, setDownloadPath] = useState<string | null>(null);
  const [fixtureReadme, setFixtureReadme] = useState<string>("");

  useEffect(() => {
    const base = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
    fetch(`${base}/fixture/isomill/README.txt`)
      .then((r) => r.text())
      .then(setFixtureReadme)
      .catch(() => setFixtureReadme("Sample fixture is in fixtures/isomill/README.txt"));
  }, []);

  const osEntry = catalogue.oses[`${def.os.distribution}-${def.os.release}`]!;
  const selected = new Set(def.applications ?? []);

  const nodes = useMemo(
    () => buildSourceGraph(def, catalogue, { isoVerified }),
    [def, isoVerified],
  );

  const preview = useMemo(
    () =>
      compileDefinition(def, catalogue, {
        builder: {
          version: "0.1.0",
          gitCommit: isoVerified ? "observed" : "preview",
          sourceRepo: SOURCE_REPO,
        },
        isoVerified,
        sample: DEMO,
      }),
    [def, isoVerified],
  );

  function setOsChoice(distribution: "fedora" | "ubuntu", release: string) {
    setIsoVerified(false);
    setDef({
      ...def,
      os: { ...def.os, distribution, release },
      applications: (def.applications ?? []).filter((id) => {
        const app = catalogue.applications.find((a) => a.id === id);
        return Boolean(app?.targets[`${distribution}-${release}`]);
      }),
    });
  }

  function setArchitecture(architecture: Architecture) {
    setIsoVerified(false);
    setDef({ ...def, os: { ...def.os, architecture } });
  }

  function toggleApp(id: string) {
    const next = new Set(def.applications ?? []);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setDef({ ...def, applications: [...next] });
  }

  function toggleService(id: "ssh" | "docker") {
    const next = new Set(def.services ?? []);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setDef({ ...def, services: [...next] });
  }

  async function generate() {
    setError(null);
    setDownloadPath(null);
    const res = await fetch(`${API}/builds`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(def),
    });
    if (!res.ok) {
      setError(await res.text());
      return;
    }
    const body = (await res.json()) as { id: string; status: BuildStatus };
    setBuildId(body.id);
    setStatus(body.status);
    poll(body.id);
  }

  async function poll(id: string) {
    for (;;) {
      const res = await fetch(`${API}/builds/${id}`);
      const body = (await res.json()) as {
        status: BuildStatus;
        error?: string;
        keyChange?: KeyChange | null;
        downloadPath?: string | null;
      };
      setStatus(body.status);
      if (body.status === "SOURCE_READY" || body.status === "READY") {
        setIsoVerified(true);
      }
      if (body.keyChange) setKeyChange(body.keyChange);
      else setKeyChange(null);
      if (body.status === "READY") {
        setDownloadPath(body.downloadPath ?? `/builds/${id}/iso`);
        return;
      }
      if (body.status === "FAILED") {
        setError(body.error ?? "build failed");
        return;
      }
      if (body.status === "UPSTREAM_KEY_CHANGED") {
        return;
      }
      await new Promise((r) => setTimeout(r, 1500));
    }
  }

  async function acknowledge() {
    if (!buildId) return;
    await fetch(`${API}/builds/${buildId}/acknowledge-key`, { method: "POST" });
    setKeyChange(null);
    setStatus("QUEUED");
    poll(buildId);
  }

  return (
    <div className="shell">
      {DEMO ? (
        <div className="demo-banner">
          This is the GitHub Pages demo. The Source Graph is live. Generate does
          not build an ISO — run <code>docker compose up</code> from the repo on
          your own machine. The fixture below is a sample <code>/isomill</code>{" "}
          tree, not a live image.
        </div>
      ) : null}

      <header className="masthead">
        <div className="brand">
          <BrandMark className="brand-mark" />
          <div>
            <h1 className="wordmark">isomill</h1>
            <p className="tagline">
              Installation media that explains itself. A Machine Definition
              becomes a thin official Fedora or Ubuntu installer ISO. Identity and
              disk stay in the install shield. Packages resolve at install time
              via dnf or apt.
            </p>
          </div>
        </div>
        <GitHubLink />
      </header>

      <div className="layout">
        <div>
          <div className="panel">
            <h2>Machine Definition</h2>
            <p className="note">
              Network install: Fedora Everything netinst or Ubuntu Desktop.
              Intel / AMD 64-bit and ARM 64-bit. We are not an OS mirror. GNOME
              only in v1. No users, passwords, or partitioning here.
            </p>
            <div className="row">
              <label className="field">
                Distribution
                <select
                  value={`${def.os.distribution}-${def.os.release}`}
                  onChange={(e) => {
                    const choice = osChoices().find((o) => o.key === e.target.value);
                    if (choice) setOsChoice(choice.distribution, choice.release);
                  }}
                >
                  {osChoices().map((o) => (
                    <option key={o.key} value={o.key}>
                      {o.displayName}
                    </option>
                  ))}
                </select>
              </label>
              <label className="field">
                Architecture
                <select
                  value={def.os.architecture}
                  onChange={(e) =>
                    setArchitecture(e.target.value as Architecture)
                  }
                >
                  <option value="x86_64">{archLabel("x86_64")}</option>
                  <option value="aarch64">{archLabel("aarch64")}</option>
                </select>
              </label>
              <label className="field">
                Language
                <select
                  value={def.locale.language}
                  onChange={(e) =>
                    setDef({
                      ...def,
                      locale: { ...def.locale, language: e.target.value },
                    })
                  }
                >
                  {osEntry.locales.languages.map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="field">
                Keyboard
                <select
                  value={def.locale.keyboard}
                  onChange={(e) =>
                    setDef({
                      ...def,
                      locale: { ...def.locale, keyboard: e.target.value },
                    })
                  }
                >
                  {osEntry.locales.keyboards.map((k) => (
                    <option key={k.id} value={k.id}>
                      {k.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="field">
                Timezone
                <select
                  value={def.locale.timezone}
                  onChange={(e) =>
                    setDef({
                      ...def,
                      locale: { ...def.locale, timezone: e.target.value },
                    })
                  }
                >
                  {osEntry.locales.timezones.map((tz) => (
                    <option key={tz} value={tz}>
                      {tz}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <div className="group-title">Services</div>
            <div className="services">
              <label>
                <input
                  type="checkbox"
                  checked={def.services?.includes("ssh") ?? false}
                  onChange={() => toggleService("ssh")}
                />{" "}
                OpenSSH server
              </label>
              <label>
                <input
                  type="checkbox"
                  checked={def.services?.includes("docker") ?? false}
                  onChange={() => toggleService("docker")}
                />{" "}
                Docker engine
              </label>
            </div>

            <AppTiles
              apps={catalogue.applications}
              definition={def}
              selected={selected}
              onToggle={toggleApp}
            />
          </div>
        </div>

        <aside>
          <div className="panel">
            <h2>Source Graph</h2>
            <p className="note">
              Pre-commit audit of who supplies each thing. These badges are not
              the same check. isomill does not replace dnf or apt.
            </p>
            <SourceGraph
              nodes={nodes}
              onOpenProvenance={() => setShowProv(true)}
            />
            <div className="actions">
              {DEMO ? (
                <>
                  <button className="primary" type="button" disabled>
                    Generate ISO
                  </button>
                  <p className="note">
                    Building requires Docker on your machine:{" "}
                    <code>docker compose up</code>. This page will not start a
                    build or fake a download.
                  </p>
                </>
              ) : (
                <button className="primary" type="button" onClick={generate}>
                  Generate ISO
                </button>
              )}
              <Stepper status={status} />
              {keyChange ? (
                <div className="keybox">
                  <strong>Upstream key changed</strong>
                  <p>
                    The official key URL for {keyChange.publisher} is serving a
                    different key than last observed. isomill is a witness, not
                    an authority for vendor keys.
                  </p>
                  <div>
                    previous: <code>{keyChange.previousFingerprint}</code>
                  </div>
                  <div>
                    observed: <code>{keyChange.observedFingerprint}</code>
                  </div>
                  <div>
                    key URL: <code>{keyChange.keyUrl}</code>
                  </div>
                  <p>
                    <a href={keyChange.keyDocsUrl} target="_blank" rel="noreferrer">
                      Vendor key documentation
                    </a>
                  </p>
                  <button className="primary" type="button" onClick={acknowledge}>
                    Acknowledge new key and resume
                  </button>
                </div>
              ) : null}
              {error ? <p className="note">{error}</p> : null}
              {downloadPath ? (
                <p>
                  <a href={`${API}${downloadPath}`}>Download ISO from local volume</a>
                </p>
              ) : null}
            </div>
          </div>
        </aside>
      </div>

      <ProvenanceDialog
        open={showProv}
        title="Complete provenance (preview)"
        note={
          isoVerified
            ? "This is the same tree written to /isomill/ on the ISO after Generate finishes."
            : "This is the /isomill tree that would be written onto the ISO. Checksums stay unverified until Generate finishes on your machine."
        }
        readme={preview.readme}
        json={`${JSON.stringify(preview.provenance, null, 2)}\n`}
        onClose={() => setShowProv(false)}
      />

      <section className="fixture">
        <h2>Sample /isomill tree</h2>
        <p className="note">
          Sample artifact from this Machine Definition, not a live ISO. Checked
          into the repo so you can read the contract without a privileged worker.
        </p>
        <pre className="readme">{fixtureReadme}</pre>
      </section>
    </div>
  );
}
