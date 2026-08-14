import { describe, expect, it } from "vitest";
import * as openpgp from "openpgp";
import {
  checkTripwire,
  UpstreamKeyChangedError,
} from "../src/tripwire.js";
import {
  parseChecksumFile,
  resolveOfficialIso,
  fingerprintArmoredKey,
} from "../src/resolve.js";
import type { OsMedia } from "@isomill/schema";

describe("checksum parser", () => {
  it("parses Ubuntu SHA256SUMS", () => {
    const text = [
      "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa *ubuntu-24.04.3-desktop-amd64.iso",
      "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb  ubuntu-24.04.3-live-server-amd64.iso",
    ].join("\n");
    expect(
      parseChecksumFile(text, "ubuntu-24.04.3-desktop-amd64.iso"),
    ).toBe("a".repeat(64));
  });

  it("parses Fedora CHECKSUM lines", () => {
    const text =
      "SHA256 (Fedora-Everything-netinst-x86_64-44-1.5.iso) = " + "c".repeat(64);
    expect(
      parseChecksumFile(text, "Fedora-Everything-netinst-x86_64-44-1.5.iso"),
    ).toBe("c".repeat(64));
  });
});

describe("key tripwire", () => {
  it("is silent when last-observed is absent", () => {
    expect(() =>
      checkTripwire({
        observed: "AA",
        keyUrl: "https://example.invalid/key",
        keyDocsUrl: "https://example.invalid/docs",
        publisher: "Example",
      }),
    ).not.toThrow();
  });

  it("raises UPSTREAM_KEY_CHANGED with old vs new fingerprint", () => {
    try {
      checkTripwire({
        lastObserved: "AAAA",
        observed: "BBBB",
        keyUrl: "https://fedoraproject.org/fedora.gpg",
        keyDocsUrl: "https://fedoraproject.org/security/",
        publisher: "Fedora",
      });
      throw new Error("expected tripwire");
    } catch (err) {
      expect(err).toBeInstanceOf(UpstreamKeyChangedError);
      const e = err as UpstreamKeyChangedError;
      expect(e.code).toBe("UPSTREAM_KEY_CHANGED");
      expect(e.previousFingerprint).toBe("AAAA");
      expect(e.observedFingerprint).toBe("BBBB");
      expect(e.keyDocsUrl).toContain("fedoraproject.org/security");
    }
  });
});

describe("official ISO resolver", () => {
  it("verifies a clearsigned checksum and trips on fingerprint change", async () => {
    const { privateKey, publicKey } = await openpgp.generateKey({
      type: "curve25519",
      userIDs: [{ name: "Test Distro", email: "iso@example.invalid" }],
    });
    const filename = "Fedora-Everything-netinst-x86_64-44-1.5.iso";
    const hash = "d".repeat(64);
    const unsigned = `SHA256 (${filename}) = ${hash}\n`;
    const signed = await openpgp.sign({
      message: await openpgp.createCleartextMessage({ text: unsigned }),
      signingKeys: await openpgp.readPrivateKey({ armoredKey: privateKey }),
    });
    const fp = await fingerprintArmoredKey(publicKey);
    const media: OsMedia = {
      kind: "everything-netinst",
      filename,
      downloadUrl: "https://download.fedoraproject.org/example.iso",
      checksumUrl: "https://download.fedoraproject.org/CHECKSUM",
      gpgKeyUrl: "https://fedoraproject.org/fedora.gpg",
      keyDocsUrl: "https://fedoraproject.org/security/",
      lastObservedFingerprint: "DEADBEEF",
    };
    const fetchImpl = async (url: string) => {
      const text =
        url.includes("fedora.gpg") || url.includes("keys")
          ? publicKey
          : String(signed);
      return {
        text: async () => text,
        arrayBuffer: async () => new TextEncoder().encode(text).buffer,
      };
    };

    await expect(resolveOfficialIso(media, "Fedora", fetchImpl)).rejects.toMatchObject({
      code: "UPSTREAM_KEY_CHANGED",
    });

    const resolved = await resolveOfficialIso(
      { ...media, lastObservedFingerprint: fp },
      "Fedora",
      fetchImpl,
    );
    expect(resolved.signatureVerified).toBe(true);
    expect(resolved.checksumValue).toBe(hash);
    expect(resolved.observedKey.fingerprint).toBe(fp);
  });
});

