import { createHash } from "node:crypto";
import type {
  Application,
  AppTarget,
  Architecture,
  Catalogue,
  MachineDefinition,
  OsEntry,
  OsMedia,
  SourceGraphNode,
} from "@isomill/schema";
import { validateCatalogue } from "@isomill/schema";
import catalogueJson from "./catalogue.json" with { type: "json" };

validateCatalogue(catalogueJson);

export const catalogue: Catalogue = catalogueJson;

export function catalogueDigest(cat: Catalogue = catalogue): string {
  const json = JSON.stringify(cat);
  return `sha256:${createHash("sha256").update(json).digest("hex")}`;
}

export function osKey(definition: MachineDefinition): string {
  return `${definition.os.distribution}-${definition.os.release}`;
}

export function getOs(definition: MachineDefinition, cat: Catalogue = catalogue): OsEntry {
  const key = osKey(definition);
  const os = cat.oses[key];
  if (!os) {
    throw new Error(`unsupported os ${key}`);
  }
  return os;
}

export function getMedia(
  definition: MachineDefinition,
  cat: Catalogue = catalogue,
): OsMedia {
  const os = getOs(definition, cat);
  const media = os.media[definition.os.architecture];
  if (!media) {
    throw new Error(
      `unsupported architecture ${definition.os.architecture} for ${os.displayName}`,
    );
  }
  return media;
}

export function aptArch(architecture: Architecture): "amd64" | "arm64" {
  return architecture === "aarch64" ? "arm64" : "amd64";
}

export function archLabel(architecture: Architecture): string {
  return architecture === "aarch64" ? "ARM 64-bit" : "Intel / AMD 64-bit";
}

export function osChoices(
  cat: Catalogue = catalogue,
): Array<{ key: string; distribution: OsEntry["distribution"]; release: string; displayName: string }> {
  return Object.entries(cat.oses).map(([key, os]) => ({
    key,
    distribution: os.distribution,
    release: os.release,
    displayName: os.displayName,
  }));
}

export function getApplication(id: string, cat: Catalogue = catalogue): Application {
  const app = cat.applications.find((a) => a.id === id);
  if (!app) {
    throw new Error(`unknown application ${id}`);
  }
  return app;
}

export function getTarget(
  app: Application,
  definition: MachineDefinition,
): AppTarget | undefined {
  return app.targets[osKey(definition)];
}

export function isAppAvailable(
  app: Application,
  definition: MachineDefinition,
): boolean {
  return Boolean(getTarget(app, definition));
}

const SAFE_TOKEN = /^[A-Za-z0-9@/_.+\-^]+$/;

export function assertSafeToken(value: string, kind: string): void {
  if (!SAFE_TOKEN.test(value) || value.includes("..") || value.includes(" ")) {
    throw new Error(`refusing unsafe ${kind} token: ${value}`);
  }
}

export function assertHttpsUrl(value: string, kind: string): void {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new Error(`refusing unsafe ${kind} URL: ${value}`);
  }
  if (url.protocol !== "https:") {
    throw new Error(`refusing non-https ${kind} URL: ${value}`);
  }
}

export function expandDefinition(
  definition: MachineDefinition,
  cat: Catalogue = catalogue,
): MachineDefinition {
  const apps = [...(definition.applications ?? [])];
  const services = [...(definition.services ?? [])];

  for (const id of apps) {
    const app = getApplication(id, cat);
    if (!isAppAvailable(app, definition)) {
      throw new Error(
        `${app.name} is not available: ${app.unavailableReason ?? "no target for this OS"}`,
      );
    }
    for (const req of app.requires ?? []) {
      if (!apps.includes(req)) {
        apps.push(req);
      }
    }
  }

  if (services.includes("docker") && !apps.includes("docker")) {
    apps.push("docker");
  }

  return {
    ...definition,
    applications: [...new Set(apps)],
    services: [...new Set(services)],
  };
}

export function egressHosts(
  cat: Catalogue = catalogue,
  opts: { includeNpm?: boolean } = {},
): string[] {
  const hosts = new Set<string>();
  const add = (url: string) => {
    try {
      hosts.add(new URL(url).hostname);
    } catch {
      /* skip */
    }
  };

  for (const os of Object.values(cat.oses)) {
    for (const media of Object.values(os.media)) {
      add(media.downloadUrl);
      add(media.checksumUrl);
      if (media.checksumSignatureUrl) add(media.checksumSignatureUrl);
      add(media.gpgKeyUrl);
    }
  }
  for (const app of cat.applications) {
    for (const target of Object.values(app.targets)) {
      if (target.vendor) {
        add(target.vendor.repoUrl);
        add(target.vendor.keyUrl);
      }
    }
  }
  if (opts.includeNpm) {
    hosts.add("registry.npmjs.org");
  }
  return [...hosts].sort();
}

export function selectedBrowserIds(
  definition: MachineDefinition,
  cat: Catalogue = catalogue,
): string[] {
  return (definition.applications ?? []).filter((id) => {
    const app = cat.applications.find((a) => a.id === id);
    return app?.group === "browsers";
  });
}

/** Distro desktops ship Firefox. Drop it only when the user picked other browsers and not Firefox. */
export function shouldDropDistroFirefox(
  definition: MachineDefinition,
  cat: Catalogue = catalogue,
): boolean {
  const browsers = selectedBrowserIds(definition, cat);
  return browsers.length > 0 && !browsers.includes("firefox");
}

export const GROUPS: Array<{ id: Application["group"]; label: string }> = [
  { id: "browsers", label: "Browsers" },
  { id: "editors", label: "Editors" },
  { id: "terminal", label: "Terminal" },
  { id: "git", label: "Git" },
  { id: "cli", label: "CLI" },
  { id: "languages", label: "Languages" },
  { id: "containers", label: "Containers" },
  { id: "ai", label: "AI assistants" },
];

export interface SourceGraphOptions {
  isoVerified?: boolean;
}

export function buildSourceGraph(
  input: MachineDefinition,
  cat: Catalogue = catalogue,
  opts: SourceGraphOptions = {},
): SourceGraphNode[] {
  const definition = expandDefinition(input, cat);
  const os = getOs(definition, cat);
  const isoBadge = opts.isoVerified
    ? { kind: "iso-verified" as const, label: "ISO verified" }
    : { kind: "will-verify-iso" as const, label: "Will verify official ISO" };

  const nodes: SourceGraphNode[] = [
    {
      id: `os:${osKey(definition)}`,
      name: `${os.displayName} · ${archLabel(definition.os.architecture)}`,
      icon: os.icon ?? `${definition.os.distribution}.svg`,
      publisher: os.publisher,
      detail: getMedia(definition, cat).filename,
      badges: [
        {
          kind: "official-repository",
          label: `Official ${os.publisher}`,
        },
        isoBadge,
      ],
    },
  ];

  for (const id of definition.applications ?? []) {
    const app = getApplication(id, cat);
    const target = getTarget(app, definition);
    if (!target) continue;
    if (target.sourceClass === "distro") {
      nodes.push({
        id: `app:${id}`,
        name: app.name,
        icon: app.icon,
        publisher: os.publisher,
        badges: [{ kind: "official-repository", label: "Official repository" }],
        detail: target.distroVersionLabel,
      });
    } else if (target.sourceClass === "vendor" && target.vendor) {
      nodes.push({
        id: `app:${id}`,
        name: app.name,
        icon: app.icon,
        publisher: target.vendor.publisher,
        badges: [
          { kind: "first-party-vendor", label: "First-party vendor" },
          { kind: "approved-source", label: "Approved source" },
        ],
      });
    } else if (target.sourceClass === "npm") {
      nodes.push({
        id: `app:${id}`,
        name: app.name,
        icon: app.icon,
        publisher: app.publisher ?? "npm",
        badges: [
          {
            kind: "npm-allowlist",
            label: "npm allowlist — not distro-signed",
          },
        ],
      });
    }
  }

  return nodes;
}
