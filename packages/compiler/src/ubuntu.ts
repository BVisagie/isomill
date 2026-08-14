import YAML from "yaml";
import type { Catalogue, MachineDefinition } from "@isomill/schema";
import {
  aptArch,
  assertHttpsUrl,
  assertSafeToken,
  catalogue as defaultCatalogue,
  getApplication,
  getOs,
  getTarget,
  shouldDropDistroFirefox,
} from "@isomill/catalogue";
import {
  assertAutoinstallSafety,
  osKeyOf,
  prepareDefinition,
} from "./common.js";

function ubuntuLocale(definition: MachineDefinition, cat: Catalogue) {
  const os = getOs(definition, cat);
  const lang = os.locales.languages.find((l) => l.id === definition.locale.language)!;
  const kb = os.locales.keyboards.find((k) => k.id === definition.locale.keyboard)!;
  return {
    locale: lang.ubuntuLocale,
    layout: kb.ubuntuLayout,
    variant: kb.ubuntuVariant ?? "",
    timezone: definition.locale.timezone,
  };
}

export interface AutoinstallFiles {
  userData: string;
  metaData: string;
}

export function generateAutoinstall(
  input: MachineDefinition,
  cat: Catalogue = defaultCatalogue,
): AutoinstallFiles {
  const definition = prepareDefinition(input, cat);
  const loc = ubuntuLocale(definition, cat);
  const distroPackages: string[] = [];
  const late: string[] = [];
  const npmPkgs: string[] = [];
  const units: string[] = [];

  for (const id of definition.applications ?? []) {
    const app = getApplication(id, cat);
    const target = getTarget(app, definition);
    if (!target) continue;
    if (target.sourceClass === "npm") {
      if (!target.npmPackage) throw new Error(`npm app ${id} missing npmPackage`);
      assertSafeToken(target.npmPackage, "npm package");
      npmPkgs.push(target.npmPackage);
      continue;
    }
    if (target.sourceClass === "vendor" && target.vendor) {
      assertHttpsUrl(target.vendor.repoUrl.replaceAll("{arch}", "amd64"), "repo");
      assertHttpsUrl(target.vendor.keyUrl, "key");
      const arch = aptArch(definition.os.architecture);
      const source = (
        target.vendor.repoFile ??
        `deb [arch={arch}] ${target.vendor.repoUrl} stable main`
      ).replaceAll("{arch}", arch);
      assertSafeToken(id, "id");
      late.push(
        `curtin in-target --target=/target -- mkdir -p /etc/apt/keyrings`,
      );
      late.push(
        `curtin in-target --target=/target -- wget -qO /etc/apt/keyrings/${id}.asc ${target.vendor.keyUrl}`,
      );
      late.push(
        `bash -c 'echo "${source}" > /target/etc/apt/sources.list.d/${id}.list'`,
      );
      if (target.vendor.aptPin) {
        const pin = target.vendor.aptPin;
        const originHost = new URL(target.vendor.repoUrl).hostname;
        if (pin.origin !== originHost) {
          throw new Error(
            `aptPin.origin ${pin.origin} must match vendor repo host ${originHost}`,
          );
        }
        assertSafeToken(pin.origin, "apt pin origin");
        const pinPackage = pin.package ?? "*";
        if (pinPackage !== "*") assertSafeToken(pinPackage, "apt pin package");
        late.push(
          `curtin in-target --target=/target -- mkdir -p /etc/apt/preferences.d`,
        );
        late.push(
          `bash -c 'printf "Package: ${pinPackage}\\nPin: origin ${pin.origin}\\nPin-Priority: ${pin.priority}\\n" > /target/etc/apt/preferences.d/${id}'`,
        );
      }
      for (const snap of target.vendor.removeSnaps ?? []) {
        assertSafeToken(snap, "snap");
        late.push(
          `curtin in-target --target=/target -- bash -c 'snap remove ${snap} >/dev/null 2>&1 || true'`,
        );
      }
      const pkgs = target.packages.map((p) => {
        assertSafeToken(p, "package");
        return p;
      });
      late.push(`curtin in-target --target=/target -- apt-get update`);
      late.push(
        `curtin in-target --target=/target -- apt-get install -y ${pkgs.join(" ")}`,
      );
      for (const unit of target.units ?? []) units.push(unit);
      continue;
    }
    for (const pkg of target.packages) {
      assertSafeToken(pkg, "package");
      distroPackages.push(pkg);
    }
    for (const unit of target.units ?? []) units.push(unit);
  }

  let installSsh = false;
  for (const sid of definition.services ?? []) {
    const svc = cat.services.find((s) => s.id === sid);
    const t = svc?.targets[osKeyOf(definition)];
    for (const pkg of t?.packages ?? []) {
      assertSafeToken(pkg, "package");
      distroPackages.push(pkg);
    }
    for (const unit of t?.units ?? []) units.push(unit);
    if (sid === "ssh") installSsh = true;
  }

  if (shouldDropDistroFirefox(definition, cat)) {
    late.push(
      `curtin in-target --target=/target -- bash -c 'snap remove firefox >/dev/null 2>&1 || true'`,
    );
    late.push(
      `curtin in-target --target=/target -- bash -c 'apt-get purge -y firefox >/dev/null 2>&1 || true'`,
    );
  }

  late.push("mkdir -p /target/etc/isomill");
  late.push("cp -a /cdrom/isomill/. /target/etc/isomill/");
  if (npmPkgs.length) {
    late.push("# npm allowlist — not distro-signed. --ignore-scripts is mandatory.");
    for (const pkg of npmPkgs) {
      late.push(
        `curtin in-target --target=/target -- npm install -g --ignore-scripts ${pkg}`,
      );
    }
  }
  for (const unit of [...new Set(units)]) {
    late.push(`curtin in-target --target=/target -- systemctl enable ${unit}`);
  }

  const keyboard: Record<string, string> = { layout: loc.layout };
  if (loc.variant) keyboard.variant = loc.variant;

  const autoinstall: Record<string, unknown> = {
    version: 1,
    "interactive-sections": ["identity", "storage"],
    locale: loc.locale,
    keyboard,
    timezone: loc.timezone,
  };

  if (installSsh) {
    autoinstall.ssh = { "install-server": true };
  }

  if (distroPackages.length) {
    autoinstall.packages = [...new Set(distroPackages)];
  }

  if (late.length) {
    autoinstall["late-commands"] = late.filter((l) => !l.startsWith("#"));
  }

  const doc = { autoinstall };
  assertAutoinstallSafety(doc);

  const yaml = YAML.stringify(doc, { lineWidth: 0 });
  const userData = `#cloud-config\n${yaml}`;
  const metaData = "instance-id: isomill\n";
  return { userData, metaData };
}

export function parseAutoinstallUserData(userData: string): Record<string, unknown> {
  if (!userData.startsWith("#cloud-config\n")) {
    throw new Error("user-data must start with #cloud-config");
  }
  return YAML.parse(userData.replace(/^#cloud-config\n/, "")) as Record<
    string,
    unknown
  >;
}
