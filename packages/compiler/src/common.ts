import type { Catalogue, MachineDefinition } from "@isomill/schema";
import { validateMachineDefinition } from "@isomill/schema";
import {
  catalogue as defaultCatalogue,
  expandDefinition,
  getOs,
} from "@isomill/catalogue";

export class CompilerError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CompilerError";
  }
}

export function osKeyOf(definition: MachineDefinition): string {
  return `${definition.os.distribution}-${definition.os.release}`;
}

export function prepareDefinition(
  input: unknown,
  cat: Catalogue = defaultCatalogue,
): MachineDefinition {
  validateMachineDefinition(input);
  const os = getOs(input, cat);
  const lang = os.locales.languages.find((l) => l.id === input.locale.language);
  const kb = os.locales.keyboards.find((k) => k.id === input.locale.keyboard);
  if (!lang) {
    throw new CompilerError(
      `language ${input.locale.language} is not offered by ${os.displayName}`,
    );
  }
  if (!kb) {
    throw new CompilerError(
      `keyboard ${input.locale.keyboard} is not offered by ${os.displayName}`,
    );
  }
  if (!os.locales.timezones.includes(input.locale.timezone)) {
    throw new CompilerError(
      `timezone ${input.locale.timezone} is not offered by ${os.displayName}`,
    );
  }
  if (!os.media[input.os.architecture]) {
    throw new CompilerError(
      `${os.displayName} does not offer ${input.os.architecture}`,
    );
  }
  return expandDefinition(input, cat);
}

const FORBIDDEN_KICKSTART = [
  /\bzerombr\b/i,
  /\bclearpart\b/i,
  /\bautopart\b/i,
  /\brootpw\b/i,
  /^\s*user\b/im,
  /^\s*sshkey\b/im,
];

export function assertKickstartSafety(ks: string): void {
  for (const re of FORBIDDEN_KICKSTART) {
    if (re.test(ks)) {
      throw new CompilerError(
        `kickstart failed safety: matched ${re}. Identity and storage stay in Anaconda.`,
      );
    }
  }
}

export function assertAutoinstallSafety(doc: Record<string, unknown>): void {
  const keys = Object.keys(doc);
  if (keys.length !== 1 || keys[0] !== "autoinstall") {
    throw new CompilerError(
      `ubuntu user-data must have a single autoinstall root, got: ${keys.join(", ")}`,
    );
  }
  const auto = doc.autoinstall as Record<string, unknown>;
  const sections = auto["interactive-sections"];
  if (
    !Array.isArray(sections) ||
    !sections.includes("identity") ||
    !sections.includes("storage")
  ) {
    throw new CompilerError(
      "ubuntu autoinstall must set interactive-sections: [identity, storage]",
    );
  }
  if ("identity" in auto && auto.identity) {
    throw new CompilerError("ubuntu autoinstall must not set identity");
  }
  if ("storage" in auto && auto.storage) {
    throw new CompilerError("ubuntu autoinstall must not set storage");
  }
  if ("user-data" in auto) {
    throw new CompilerError("ubuntu autoinstall must not nest extra user-data identity");
  }
}
