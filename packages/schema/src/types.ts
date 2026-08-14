export type Distribution = "fedora" | "ubuntu";
export type Architecture = "x86_64";
export type DesktopEnvironment = "gnome";
export type SourceClass = "distro" | "vendor" | "npm";
export type AppGroup =
  | "editors"
  | "terminal"
  | "git"
  | "cli"
  | "languages"
  | "containers"
  | "ai";
export type LicenseKind = "first-party" | "vendor" | "proprietary" | "mixed";
export type ServiceId = "ssh" | "docker";

export type BuildStatus =
  | "QUEUED"
  | "RESOLVING"
  | "UPSTREAM_KEY_CHANGED"
  | "SOURCE_READY"
  | "BUILDING"
  | "VERIFYING"
  | "READY"
  | "FAILED";

export interface MachineDefinition {
  schemaVersion: 1;
  os: {
    distribution: Distribution;
    release: string;
    architecture: Architecture;
  };
  desktop: {
    environment: DesktopEnvironment;
  };
  locale: {
    language: string;
    keyboard: string;
    timezone: string;
  };
  applications?: string[];
  services?: ServiceId[];
}

export interface LanguageMapping {
  id: string;
  label: string;
  fedoraLang: string;
  ubuntuLocale: string;
}

export interface KeyboardMapping {
  id: string;
  label: string;
  fedoraKeymap: string;
  ubuntuLayout: string;
  ubuntuVariant?: string;
}

export interface LocaleCatalog {
  languages: LanguageMapping[];
  keyboards: KeyboardMapping[];
  timezones: string[];
}

export interface OsMedia {
  kind: "everything-netinst" | "desktop";
  filename: string;
  downloadUrl: string;
  checksumUrl: string;
  checksumSignatureUrl?: string;
  gpgKeyUrl: string;
  keyDocsUrl: string;
  lastObservedFingerprint?: string;
}

export interface OsEntry {
  distribution: Distribution;
  release: string;
  architecture: Architecture;
  displayName: string;
  publisher: string;
  icon?: string;
  locales: LocaleCatalog;
  media: OsMedia;
}

export interface VendorSource {
  publisher: string;
  repoUrl: string;
  keyUrl: string;
  keyDocsUrl: string;
  repoFile?: string;
  lastObservedFingerprint?: string;
}

export interface AppTarget {
  sourceClass: SourceClass;
  packages: string[];
  npmPackage?: string;
  distroVersionLabel?: string;
  units?: string[];
  vendor?: VendorSource;
}

export interface Application {
  id: string;
  name: string;
  group: AppGroup;
  license: LicenseKind;
  publisher?: string;
  icon: string;
  iconSource: string;
  iconLicense: string;
  note?: string;
  requires?: string[];
  unavailableReason?: string;
  targets: Record<string, AppTarget>;
}

export interface ServiceEntry {
  id: ServiceId;
  name: string;
  targets: Record<string, { packages: string[]; units: string[] }>;
}

export interface Catalogue {
  version: string;
  oses: Record<string, OsEntry>;
  applications: Application[];
  services: ServiceEntry[];
}

export type SourceGraphBadge =
  | "official-repository"
  | "first-party-vendor"
  | "approved-source"
  | "npm-allowlist"
  | "iso-verified"
  | "will-verify-iso";

export interface SourceGraphNode {
  id: string;
  name: string;
  icon: string;
  publisher: string;
  badges: Array<{ kind: SourceGraphBadge; label: string }>;
  detail?: string;
  children?: SourceGraphNode[];
}

export interface Provenance {
  schemaVersion: 1;
  whatIsThis: string;
  generatedBy: {
    project: string;
    homepage?: string;
    sourceRepo?: string;
    version: string;
    gitCommit: string;
  };
  upstreamIso: {
    distribution: string;
    release: string;
    filename: string;
    downloadUrl: string;
    checksumAlgorithm: string;
    checksumValue: string;
    checksumUrl: string;
    checksumSignatureUrl?: string;
    signatureVerified?: boolean;
    gpgKeyUrl?: string;
    observedKeyFingerprint?: string;
    keyFetchedAt?: string;
  };
  configuration: {
    installCfgDigest: string;
    machineDefinitionDigest: string;
    adapter: "kickstart" | "autoinstall";
  };
  catalogue: {
    version: string;
    digest: string;
  };
  repositories: Array<{
    kind: SourceClass;
    url: string;
    publisher?: string;
    keyUrl?: string;
    observedKeyFingerprint?: string;
    keyFetchedAt?: string;
    packages?: string[];
  }>;
  npmDisclaimer?: string;
  sourceGraph: SourceGraphNode[];
  sample?: boolean;
}

export const NPM_DISCLAIMER =
  "npm packages in this configuration are an isomill policy allowlist. They are not signature-verified the way Fedora or Ubuntu packages are. They were configured to install with npm install -g --ignore-scripts.";
