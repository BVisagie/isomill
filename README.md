<p align="center">
  <img src="brand/icon.svg" width="96" height="96" alt="isomill">
</p>

# isomill

**Installation media that explains itself.**

isomill is an open-source installer compiler that turns a declarative Linux workstation configuration into a thin Fedora or Ubuntu installation ISO based on official upstream installer media, with native install config, official or allowlisted vendor repos (and a labeled npm exception), verified upstream ISO sources, and a provenance graph **on the ISO**.

Identity, encryption, and storage stay in the install shield. Packages resolve at install time via `dnf`/`apt`. isomill is **legibility**, not a new security boundary: it does not replace package signatures, and it does not claim to verify software beyond what Fedora and Ubuntu already do.

## What you get

- A **Machine Definition** (JSON) — OS, desktop, locale, catalogue apps, services. No users, no passwords, no disk layout.
- A **thin installer ISO** — official Fedora Everything netinst or Ubuntu Desktop (24.04 or 26.04 LTS), Intel / AMD 64-bit or ARM 64-bit, with Kickstart or Autoinstall injected. Anaconda/Subiquity still run on the machine you install.
- A **Source Graph** — a pre-commit audit of who supplies each thing. Official repository, first-party vendor, and npm allowlist are **unequal** badges.
- **`/isomill/` on the ISO** (copied to `/etc/isomill/` after install) — README, sources, provenance, the definition, the exact install config, and the catalogue lock. Mount the ISO offline and you can still answer what this is.

The USB carries the configuration. It does not depend on this repo or your Compose stack still being up at boot.

## What this is not

- Not a baked disk image, OS remix, or offline package mirror.
- Not “fully unattended including disk.” Generated configs never wipe disks or set identity.
- Not a hosted ISO farm. **Self-hosted is the product.**
- Not extra cryptography. `dnf`/`apt` remain the package verifiers.

## Try the visual demo

The GitHub Pages demo is the full builder with a **live Source Graph**. Generate does not build an ISO. A sample `/isomill` tree is included and labeled as a fixture, not a live image. 

You should be able to view the demo site here: [View Demo Site ↗](https://bvisagie.github.io/isomill/)

## Build a real ISO

You need Docker (a Linux VM on Mac/Windows — the worker is always Linux).

```bash
git clone https://github.com/BVisagie/isomill.git
cd isomill
docker compose up --build
```

Then open http://127.0.0.1:3000. Bind is localhost by default. First Generate downloads official installer media into a local volume (Fedora netinst ~2 GB, Ubuntu Desktop ~6 GB) and verifies checksums and signatures. Finished ISOs land on another local volume; the UI serves them from disk. No S3, no cloud egress, no builder accounts.

Compile Kickstart or Autoinstall without ISO tooling:

```bash
npm install
npx isomill compile fixtures/definitions/sample-fedora.json
```

## Source classes

| Class | Badge | What it means |
| --- | --- | --- |
| Distro first-party | Official repository | Fedora repos or Ubuntu `main`/`universe`. `dnf`/`apt` verify as usual. |
| Vendor apt/yum allowlist | First-party vendor + Approved source | The vendor’s own repo URL is in the catalogue. isomill is a **witness** of keys, not an authority for them. |
| npm allowlist | npm allowlist — not distro-signed | Named packages on `registry.npmjs.org`, installed with `npm install -g --ignore-scripts`. Policy, not `dnf`/`apt`. |

Never: COPR, PPAs, community GitHub debs, Snap/Flatpak sources, `curl \| bash` installers, user-uploaded ISOs.

## Hard safety

Generated Kickstart/Autoinstall must never `zerombr` / `clearpart` / `autopart` or set identity. Ubuntu Autoinstall uses `interactive-sections: [identity, storage]`. Fedora leaves Anaconda spokes in place.

The generator is the injection boundary: only schema-validated fields and catalogue ids enter install config. The privileged worker has **no direct internet**; outbound HTTP(S) goes through an egress-proxy sidecar whose allowlist is generated from the catalogue.

If an official key URL starts serving a different key than last observed, the build enters **UPSTREAM_KEY_CHANGED** (not generic FAILED). The operator must acknowledge previous vs observed fingerprint against the vendor’s own docs before resume.

## Repository layout

```
packages/schema      Machine Definition, catalogue, provenance JSON Schemas
packages/catalogue   Versioned app/source catalogue and icons
packages/compiler    Kickstart + Autoinstall generators, provenance, CLI
packages/resolver    Official ISO checksum/GPG resolver and key tripwire
apps/web             Visual builder (Next.js); static export is the Pages demo
apps/api             Hono + Postgres queue
workers/             Privileged ISO inject (mkksiso / xorriso) + egress-proxy
fixtures/            Sample definition and labeled sample /isomill tree
compose.yaml         The product: UI, API, Postgres, worker, proxy, volumes
```

## License

Apache-2.0. isomill is based on official Fedora and Ubuntu installer media. That is not an endorsement by those projects.
