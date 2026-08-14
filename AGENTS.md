# Agent notes

isomill compiles a Machine Definition into a **thin official Fedora/Ubuntu installer ISO** plus a provenance graph **on the media**. It is not a remix, image baker, hosted ISO farm, or extra crypto layer. `dnf`/`apt` remain the package verifiers. Identity, encryption, and storage stay in Anaconda/Subiquity.

Prefer changing the catalogue or compiler over adding UI or worker special cases. The README is the product story; this file is how to change the code without violating it.

## Data flow

```
Machine Definition JSON
  → @isomill/schema (Ajv)
  → @isomill/catalogue (ids → packages, vendor repos, icons, GROUPS)
  → @isomill/compiler (Kickstart / Autoinstall + /isomill tree)
  → @isomill/resolver (official ISO checksums, GPG, key tripwire)
  → worker (privileged inject via mkksiso / xorriso; outbound HTTP only through egress-proxy)
```

| Path | Role |
| --- | --- |
| `packages/schema` | Types + JSON Schemas. Dual-write both. |
| `packages/catalogue` | Versioned apps/OSes/sources and icons. Product policy lives here. |
| `packages/compiler` | Generators, safety asserts, CLI, golden snapshots. |
| `packages/resolver` | Upstream ISO + key observation. `UPSTREAM_KEY_CHANGED` is not `FAILED`. |
| `apps/web` | Builder UI. `ISOMILL_DEMO=1` static export **is** the Pages demo. |
| `apps/api` | Hono queue. Bind localhost in Compose. |
| `workers/` | Privileged ISO inject + Squid allowlist generated from the catalogue. |
| `compose.yaml` | The self-hosted product. |

Package `tsc` configs **exclude** `*.test.ts` (tests must not land in `dist/`). Root `npm run typecheck` typechecks tests.

## Non-negotiables

- **Sources:** distro first-party, allowlisted vendor apt/yum, or a labeled npm exception (`npm install -g --ignore-scripts`). Never snaps, PPAs, COPR, Flatpak, community GitHub debs, `curl \| bash`, or user-uploaded ISOs. Ubuntu Chromium stays unavailable (archive package is a Snap stub).
- **Safety:** generated Kickstart/Autoinstall must never `zerombr` / `clearpart` / `autopart` or set identity. Ubuntu: `interactive-sections: [identity, storage]`. Fedora: leave Anaconda spokes. Enforced in `packages/compiler/src/common.ts` and compiler tests — do not weaken those.
- **Injection boundary:** only schema-validated fields and catalogue ids enter install config. Do not interpolate free-form user strings into Kickstart, user-data, or shell. Catalogue tokens go through `assertSafeToken` / `assertHttpsUrl`.
- **Worker:** no direct internet. Egress allowlist is generated from catalogue URLs (`workers/egress-proxy/generate-allowlist.mjs`). Adding a vendor repo is what opens the firewall, not a proxy config edit.
- **Keys:** isomill is a **witness** of vendor key URLs, not an authority. Fingerprint changes are `UPSTREAM_KEY_CHANGED`; the operator compares previous vs observed against the vendor’s own docs.
- **Self-hosted:** no S3, builder accounts, or cloud ISO egress. ISOs stay on local volumes.

## Typical changes

**Add a catalogue app** (this also updates the demo tiles):

1. Entry in `packages/catalogue/src/catalogue.json` with per-OS `targets` (`fedora-44`, `ubuntu-24.04`, `ubuntu-26.04`). Omit a target and set `unavailableReason` when a distro has no first-party path.
2. `group` must already exist on `AppGroup` in `packages/schema/src/types.ts` **and** the enum in `packages/schema/src/schemas/catalogue.schema.json` **and** `GROUP_LABELS` in `packages/catalogue/src/index.ts`. A group that exists only on the app is invisible in the UI.
3. Icon in `packages/catalogue/icons/` (well-formed SVG for `<img>`; no unbound XML prefixes). Prefer `packages/catalogue/scripts/render-icons.mjs`. Do not hand-edit `apps/web/public/icons/` — it is copied at build time.
4. Compiler tests for any new install-config behavior (vendor `aptPin`, `{arch}` in repo URLs, `removeSnaps`, package exclusions). Update golden snapshots only when the Kickstart/Autoinstall change is intentional.
5. Bump the catalogue `version` when the published set of apps or sources changes.

**Do not** add a parallel demo, hardcoded tile lists, or Pages HTML outside `apps/web`. CI runs `build:demo` then `check:demo`, which fails if a catalogue icon is missing from `apps/web/out`. Production Pages deploys from `main`. Same-repo PRs preview at `/pr-preview/pr-<number>/` on `gh-pages` once Pages is **Deploy from a branch**.

**Compiler output** is the contract. If UI, API, and CLI disagree, the compiler tests win.

## Commands

```bash
npm ci
npm run lint
npm run typecheck
npm test
npm run build:demo && npm run check:demo
npx isomill compile fixtures/definitions/sample-fedora.json
docker compose up --build   # real ISO path; worker is always Linux
```

CI is `.github/workflows/ci.yml` (lint, package builds, demo export, `check:demo`, typecheck, tests). Do not add a second ad-hoc workflow for the same checks.

## Conventions this repo actually enforces

- TypeScript strict, ESM (`NodeNext`), Node 22+. ESLint 9: `@typescript-eslint/no-explicit-any`, unused vars allowed only with a `_` prefix.
- Vitest next to the code it covers. Compiler Fedora/Ubuntu tests include safety + golden snapshots.
- No `any`. Prefer existing schema types over new DTOs.
- Small diffs: do not refactor unrelated packages to land a catalogue app.
- Commit messages are descriptive sentences, not Conventional Commit prefixes unless the user asks.
