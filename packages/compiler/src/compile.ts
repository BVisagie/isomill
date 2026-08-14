import type { Catalogue, MachineDefinition, Provenance } from "@isomill/schema";
import { catalogue as defaultCatalogue, getMedia } from "@isomill/catalogue";
import { generateKickstart } from "./fedora.js";
import { generateAutoinstall } from "./ubuntu.js";
import {
  buildProvenance,
  renderReadme,
  renderSources,
} from "./provenance.js";
import { catalogueDigest } from "@isomill/catalogue";
import { prepareDefinition } from "./common.js";

export interface CompileResult {
  definition: MachineDefinition;
  adapter: "kickstart" | "autoinstall";
  installCfg: string;
  userData?: string;
  metaData?: string;
  provenance: Provenance;
  readme: string;
  sources: string;
  catalogueLock: string;
}

export interface CompileOptions {
  builder?: { version: string; gitCommit: string; sourceRepo?: string };
  upstream?: Provenance["upstreamIso"];
  isoVerified?: boolean;
  sample?: boolean;
}

export function compileDefinition(
  input: MachineDefinition,
  cat: Catalogue = defaultCatalogue,
  opts: CompileOptions = {},
): CompileResult {
  const definition = prepareDefinition(input, cat);
  const os = definition.os.distribution;
  let installCfg: string;
  let userData: string | undefined;
  let metaData: string | undefined;
  if (os === "fedora") {
    installCfg = generateKickstart(definition, cat);
  } else {
    const auto = generateAutoinstall(definition, cat);
    userData = auto.userData;
    metaData = auto.metaData;
    installCfg = auto.userData;
  }

  const media = getMedia(definition, cat);
  const provenance = buildProvenance(
    {
      definition,
      installCfg,
      builder: opts.builder ?? {
        version: "0.1.0",
        gitCommit: process.env.ISOMILL_GIT_COMMIT ?? "unknown",
      },
      upstream: opts.upstream ?? {
        distribution: definition.os.distribution,
        release: definition.os.release,
        filename: media.filename,
        downloadUrl: media.downloadUrl,
        checksumAlgorithm: "sha256",
        checksumValue: "not-verified",
        checksumUrl: media.checksumUrl,
        checksumSignatureUrl: media.checksumSignatureUrl,
        gpgKeyUrl: media.gpgKeyUrl,
        signatureVerified: Boolean(opts.isoVerified),
      },
      isoVerified: opts.isoVerified,
      sample: opts.sample,
    },
    cat,
  );

  return {
    definition,
    adapter: os === "fedora" ? "kickstart" : "autoinstall",
    installCfg,
    userData,
    metaData,
    provenance,
    readme: renderReadme(provenance, definition),
    sources: renderSources(provenance),
    catalogueLock: JSON.stringify(
      {
        version: cat.version,
        digest: catalogueDigest(cat),
        os: `${definition.os.distribution}-${definition.os.release}`,
        architecture: definition.os.architecture,
        applications: definition.applications,
      },
      null,
      2,
    ),
  };
}
