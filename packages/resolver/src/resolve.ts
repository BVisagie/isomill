import { createHash } from "node:crypto";
import * as openpgp from "openpgp";
import type { OsMedia } from "@isomill/schema";
import { checkTripwire, normalizeFingerprint } from "./tripwire.js";

export interface FetchLike {
  (url: string): Promise<{ text(): Promise<string>; arrayBuffer(): Promise<ArrayBuffer> }>;
}

export interface ObservedKey {
  url: string;
  fingerprint: string;
  fetchedAt: string;
  publisher: string;
  keyDocsUrl: string;
}

export interface ResolvedIso {
  filename: string;
  downloadUrl: string;
  checksumAlgorithm: "sha256";
  checksumValue: string;
  checksumUrl: string;
  checksumSignatureUrl?: string;
  signatureVerified: boolean;
  gpgKeyUrl: string;
  observedKey: ObservedKey;
}

function sha256Hex(data: Uint8Array | string): string {
  return createHash("sha256")
    .update(typeof data === "string" ? data : Buffer.from(data))
    .digest("hex");
}

export function parseChecksumFile(text: string, filename: string): string {
  const lines = text.split(/\r?\n/);
  for (const line of lines) {
    const sha256sum = line.match(/^([a-fA-F0-9]{64})\s+\*?(\S+)$/);
    if (sha256sum && sha256sum[2]!.endsWith(filename)) {
      return sha256sum[1]!.toLowerCase();
    }
    const fedora = line.match(/^SHA256\s+\(([^)]+)\)\s+=\s+([a-fA-F0-9]{64})$/);
    if (fedora && fedora[1]!.endsWith(filename)) {
      return fedora[2]!.toLowerCase();
    }
  }
  throw new Error(`checksum for ${filename} not found in official checksum file`);
}

export async function fingerprintArmoredKey(armored: string): Promise<string> {
  const keys = await openpgp.readKeys({ armoredKeys: armored });
  if (!keys[0]) throw new Error("no OpenPGP keys in payload");
  return normalizeFingerprint(keys[0].getFingerprint());
}

export async function verifyDetachedOrClearsign(opts: {
  messageText: string;
  signatureArmored?: string;
  publicKeyArmored: string;
}): Promise<boolean> {
  const verificationKeys = await openpgp.readKeys({
    armoredKeys: opts.publicKeyArmored,
  });
  if (opts.signatureArmored) {
    const message = await openpgp.createMessage({ text: opts.messageText });
    const signature = await openpgp.readSignature({
      armoredSignature: opts.signatureArmored,
    });
    const result = await openpgp.verify({ message, signature, verificationKeys });
    const sig = result.signatures[0];
    return Boolean(sig && (await sig.verified));
  }
  const message = await openpgp.readCleartextMessage({
    cleartextMessage: opts.messageText,
  });
  const result = await openpgp.verify({ message, verificationKeys });
  const sig = result.signatures[0];
  return Boolean(sig && (await sig.verified));
}

export async function resolveOfficialIso(
  media: OsMedia,
  publisher: string,
  fetchImpl: FetchLike = fetch,
  lastObserved?: { fingerprint?: string },
): Promise<ResolvedIso> {
  const fetchedAt = new Date().toISOString();
  const keyRes = await fetchImpl(media.gpgKeyUrl);
  const keyText = await keyRes.text();
  const fingerprint = await fingerprintArmoredKey(keyText);

  checkTripwire({
    lastObserved: lastObserved?.fingerprint ?? media.lastObservedFingerprint,
    observed: fingerprint,
    keyUrl: media.gpgKeyUrl,
    keyDocsUrl: media.keyDocsUrl,
    publisher,
  });

  const checksumRes = await fetchImpl(media.checksumUrl);
  const checksumText = await checksumRes.text();

  let signatureVerified = false;
  const sigUrl = media.checksumSignatureUrl;
  if (sigUrl && sigUrl !== media.checksumUrl) {
    const sigText = await (await fetchImpl(sigUrl)).text();
    signatureVerified = await verifyDetachedOrClearsign({
      messageText: checksumText,
      signatureArmored: sigText,
      publicKeyArmored: keyText,
    });
  } else {
    signatureVerified = await verifyDetachedOrClearsign({
      messageText: checksumText,
      publicKeyArmored: keyText,
    });
  }

  if (!signatureVerified) {
    throw new Error(`official checksum signature did not verify for ${media.filename}`);
  }

  const checksumValue = parseChecksumFile(checksumText, media.filename);

  return {
    filename: media.filename,
    downloadUrl: media.downloadUrl,
    checksumAlgorithm: "sha256",
    checksumValue,
    checksumUrl: media.checksumUrl,
    checksumSignatureUrl: media.checksumSignatureUrl,
    signatureVerified: true,
    gpgKeyUrl: media.gpgKeyUrl,
    observedKey: {
      url: media.gpgKeyUrl,
      fingerprint,
      fetchedAt,
      publisher,
      keyDocsUrl: media.keyDocsUrl,
    },
  };
}

export function verifyIsoBytes(bytes: Uint8Array, expectedSha256: string): boolean {
  return sha256Hex(bytes) === expectedSha256.toLowerCase();
}

export { sha256Hex };
