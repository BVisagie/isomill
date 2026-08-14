export class UpstreamKeyChangedError extends Error {
  readonly code = "UPSTREAM_KEY_CHANGED" as const;
  constructor(
    readonly previousFingerprint: string,
    readonly observedFingerprint: string,
    readonly keyUrl: string,
    readonly keyDocsUrl: string,
    readonly publisher: string,
  ) {
    super(
      `upstream key changed for ${publisher}: previous ${previousFingerprint} observed ${observedFingerprint}`,
    );
    this.name = "UpstreamKeyChangedError";
  }
}

export function normalizeFingerprint(value: string): string {
  return value.replace(/\s+/g, "").toUpperCase();
}

export function checkTripwire(opts: {
  lastObserved?: string;
  observed: string;
  keyUrl: string;
  keyDocsUrl: string;
  publisher: string;
}): void {
  if (!opts.lastObserved) return;
  const prev = normalizeFingerprint(opts.lastObserved);
  const next = normalizeFingerprint(opts.observed);
  if (prev && next && prev !== next) {
    throw new UpstreamKeyChangedError(
      prev,
      next,
      opts.keyUrl,
      opts.keyDocsUrl,
      opts.publisher,
    );
  }
}
