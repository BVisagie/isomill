# Agent notes

## Demo site

The GitHub Pages demo is **`apps/web` with `ISOMILL_DEMO=1`** (static Next export). It is not a second frontend. Tiles come from `GROUPS` + `catalogue.applications` in `AppTiles`. Adding a catalogue app **is** the demo update, if:

1. `group` is a member of `AppGroup` / the catalogue schema enum **and** has a label in `GROUP_LABELS` (`packages/catalogue/src/index.ts`). A group that exists only on the app is invisible.
2. The icon SVG is in `packages/catalogue/icons/` (well-formed as an `<img>`; no unbound XML prefixes). `apps/web` copies that tree into `public/icons` at build time — do not hand-edit the copy.

Do not add a parallel demo app, hardcoded tile lists, or Pages HTML outside this export.

CI and Pages run `build:demo` and then `check:demo`, which fails if a catalogue app’s icon is missing from `apps/web/out`. Production deploys from `main`. Same-repo PRs preview at `/pr-preview/pr-<number>/` on `gh-pages` once Pages is **Deploy from a branch**.

## Catalogue sources

Apps are first-party distro packages, allowlisted vendor apt/yum repos, or a labeled npm exception. Never snaps, PPAs, COPR, Flatpak, or `curl | bash`. Ubuntu Chromium stays unavailable for that reason.
