import type {
  Catalogue,
  MachineDefinition,
  Provenance,
} from "@isomill/schema";
import { NPM_DISCLAIMER } from "@isomill/schema";
import {
  catalogue as defaultCatalogue,
  catalogueDigest,
  getApplication,
  getOs,
  getTarget,
} from "@isomill/catalogue";
import { prepareDefinition } from "./common.js";
import { digestJson } from "./digest.js";
import { buildSourceGraph } from "./source-graph.js";

export { buildSourceGraph } from "./source-graph.js";

export interface ProvenanceInput {
  definition: MachineDefinition;
  installCfg: string;
  builder: { version: string; gitCommit: string; sourceRepo?: string };
  upstream: Provenance["upstreamIso"];
  observedVendorKeys?: Array<{
    url: string;
    publisher: string;
    fingerprint: string;
    fetchedAt: string;
    packages: string[];
  }>;
  isoVerified?: boolean;
  sample?: boolean;
}

export function buildProvenance(
  input: ProvenanceInput,
  cat: Catalogue = defaultCatalogue,
): Provenance {
  const definition = prepareDefinition(input.definition, cat);
  const os = getOs(definition, cat);
  const hasNpm = (definition.applications ?? []).some((id) => {
    const app = getApplication(id, cat);
    return getTarget(app, definition)?.sourceClass === "npm";
  });

  const repositories: Provenance["repositories"] = [
    {
      kind: "distro",
      url:
        definition.os.distribution === "fedora"
          ? "https://download.fedoraproject.org/"
          : "http://archive.ubuntu.com/ubuntu",
      publisher: os.publisher,
    },
  ];

  for (const id of definition.applications ?? []) {
    const app = getApplication(id, cat);
    const target = getTarget(app, definition);
    if (!target) continue;
    if (target.sourceClass === "vendor" && target.vendor) {
      const observed = input.observedVendorKeys?.find(
        (k) => k.url === target.vendor!.keyUrl,
      );
      repositories.push({
        kind: "vendor",
        url: target.vendor.repoUrl,
        publisher: target.vendor.publisher,
        keyUrl: target.vendor.keyUrl,
        observedKeyFingerprint: observed?.fingerprint,
        keyFetchedAt: observed?.fetchedAt,
        packages: target.packages,
      });
    }
    if (target.sourceClass === "npm" && target.npmPackage) {
      repositories.push({
        kind: "npm",
        url: "https://registry.npmjs.org",
        publisher: app.publisher,
        packages: [target.npmPackage],
      });
    }
  }

  return {
    schemaVersion: 1,
    whatIsThis:
      "Customized official installer ISO. isomill injected native install configuration into official upstream media. This is not a Fedora or Ubuntu remix authored by isomill.",
    generatedBy: {
      project: "isomill",
      homepage: "https://isomill.dev",
      sourceRepo: input.builder.sourceRepo ?? "https://github.com/BVisagie/isomill",
      version: input.builder.version,
      gitCommit: input.builder.gitCommit,
    },
    upstreamIso: input.upstream,
    configuration: {
      installCfgDigest: digestJson(input.installCfg),
      machineDefinitionDigest: digestJson(definition),
      adapter:
        definition.os.distribution === "fedora" ? "kickstart" : "autoinstall",
    },
    catalogue: {
      version: cat.version,
      digest: catalogueDigest(cat),
    },
    repositories,
    npmDisclaimer: hasNpm ? NPM_DISCLAIMER : undefined,
    sourceGraph: buildSourceGraph(definition, cat, {
      isoVerified: input.isoVerified,
    }),
    sample: input.sample,
  };
}

export function renderReadme(p: Provenance, definition: MachineDefinition): string {
  const npmBlock = p.npmDisclaimer
    ? `\nNPM\n----\n${p.npmDisclaimer}\n`
    : "";
  const sample = p.sample
    ? "\nTHIS FILE IS A SAMPLE FIXTURE, NOT A LIVE ISO.\nIt ships with the isomill demo so you can read the contract without building media.\n"
    : "";
  return `isomill installer media
=======================
${sample}
What is this?
  ${p.whatIsThis}

Which project generated it?
  ${p.generatedBy.project} ${p.generatedBy.version} (git ${p.generatedBy.gitCommit})
  ${p.generatedBy.sourceRepo ?? ""}

Who generated it?
  A self-hosted isomill worker. This file lives on the ISO so the media still
  explains itself if that worker is gone.

Which upstream ISO was used?
  ${p.upstreamIso.distribution} ${p.upstreamIso.release}
  filename: ${p.upstreamIso.filename}
  url: ${p.upstreamIso.downloadUrl}

What checksum was verified?
  ${p.upstreamIso.checksumAlgorithm} ${p.upstreamIso.checksumValue}
  checksum file: ${p.upstreamIso.checksumUrl}
  signature verified: ${p.upstreamIso.signatureVerified ? "yes (observed)" : "not yet / sample"}

Which configuration was embedded?
  adapter: ${p.configuration.adapter}
  install.cfg digest: ${p.configuration.installCfgDigest}
  machine definition digest: ${p.configuration.machineDefinitionDigest}
  desktop: ${definition.desktop.environment}
  locale: ${definition.locale.language} / ${definition.locale.keyboard} / ${definition.locale.timezone}

Which catalogue version was used?
  ${p.catalogue.version} ${p.catalogue.digest}

Which repositories will the installer contact?
${p.repositories.map((r) => `  - [${r.kind}] ${r.publisher ?? ""} ${r.url}`).join("\n")}
${npmBlock}
Packages are resolved at install time by dnf or apt. This file records what
the installer is configured to install, not the exact RPM/DEB versions that
will be chosen on the day you boot it.

Identity, encryption, and storage are not in this configuration. You set
those in the Fedora or Ubuntu install shield.
`;
}

export function renderSources(p: Provenance): string {
  const lines = [
    `project=${p.generatedBy.project}`,
    `version=${p.generatedBy.version}`,
    `gitCommit=${p.generatedBy.gitCommit}`,
    `upstream=${p.upstreamIso.downloadUrl}`,
    `filename=${p.upstreamIso.filename}`,
    `checksum=${p.upstreamIso.checksumAlgorithm}:${p.upstreamIso.checksumValue}`,
    `checksumUrl=${p.upstreamIso.checksumUrl}`,
    `catalogue=${p.catalogue.digest}`,
    `installCfg=${p.configuration.installCfgDigest}`,
  ];
  for (const r of p.repositories) {
    lines.push(`repo=${r.kind}|${r.url}`);
  }
  return `${lines.join("\n")}\n`;
}
