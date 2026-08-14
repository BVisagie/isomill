import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import * as simpleIcons from "simple-icons";

const here = dirname(fileURLToPath(import.meta.url));
const sources = join(here, "icon-sources");
const outDir = join(here, "../icons");
mkdirSync(outDir, { recursive: true });

function si(slug) {
  const key =
    "si" +
    slug.replace(/(^[a-z])|[-.](\w)/g, (_, a, b) => (a || b).toUpperCase());
  const icon = simpleIcons[key];
  if (!icon) throw new Error(`simple-icons missing ${slug} (${key})`);
  return icon;
}

function luminance(hex) {
  const n = hex.replace("#", "");
  const r = parseInt(n.slice(0, 2), 16);
  const g = parseInt(n.slice(2, 4), 16);
  const b = parseInt(n.slice(4, 6), 16);
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255;
}

function tileSimple(icon, { pad = 6 } = {}) {
  const bg = `#${icon.hex}`;
  const fill = luminance(icon.hex) > 0.62 ? "#1a1612" : "#F4F1EA";
  const inner = 32 - pad * 2;
  const scale = inner / 24;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" fill="none">
  <rect width="32" height="32" rx="7" fill="${bg}"/>
  <g transform="translate(${pad} ${pad}) scale(${scale})" fill="${fill}">
    <path d="${icon.path}"/>
  </g>
</svg>
`;
}

function prefixIds(svg, prefix) {
  return svg
    .replace(/\bid="([^"]+)"/g, `id="${prefix}-$1"`)
    .replace(/url\(#([^)]+)\)/g, `url(#${prefix}-$1)`)
    .replace(/href="#([^"]+)"/g, `href="#${prefix}-$1"`)
    .replace(/xlink:href="#([^"]+)"/g, `xlink:href="#${prefix}-$1"`);
}

// Nested tiles drop the source <svg> tag, including xmlns:sketch / rdf / cc.
// Browsers parse <img src="*.svg"> as XML, so leftover prefixes become a
// broken-image icon. Keep xml: / xlink: (declared on the outer tile).
function sanitizeInner(svg) {
  return svg
    .replace(/<metadata\b[^>]*>[\s\S]*?<\/metadata>/gi, "")
    .replace(/\s+xmlns:(?!xlink)[A-Za-z_][\w.-]*="[^"]*"/g, "")
    .replace(/\s+([A-Za-z_][\w.-]*):([A-Za-z_][\w.-]*)="[^"]*"/g, (full, prefix) =>
      prefix === "xml" || prefix === "xlink" || prefix === "xmlns" ? full : "",
    );
}

function extractInner(svg, prefix) {
  const vbMatch = svg.match(/viewBox="([^"]+)"/);
  let vb = vbMatch?.[1];
  if (!vb) {
    const w = svg.match(/\bwidth="([\d.]+)/)?.[1];
    const h = svg.match(/\bheight="([\d.]+)/)?.[1];
    vb = w && h ? `0 0 ${parseFloat(w)} ${parseFloat(h)}` : "0 0 24 24";
  }
  let inner = svg
    .replace(/<\?xml[\s\S]*?\?>/g, "")
    .replace(/<!DOCTYPE[\s\S]*?>/g, "")
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/<svg\b[^>]*>/i, "")
    .replace(/<\/svg>\s*$/i, "");
  inner = sanitizeInner(inner);
  inner = prefixIds(inner, prefix);
  return { vb, inner };
}

function tileOfficial(filename, { bg = "#16130e", pad = 4 } = {}) {
  const raw = readFileSync(join(sources, filename), "utf8");
  const prefix = filename.replace(/\.svg$/, "");
  const { vb, inner } = extractInner(raw, prefix);
  const size = 32 - pad * 2;
  return `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 32 32" fill="none">
  <rect width="32" height="32" rx="7" fill="${bg}"/>
  <svg x="${pad}" y="${pad}" width="${size}" height="${size}" viewBox="${vb}" preserveAspectRatio="xMidYMid meet">${inner}</svg>
</svg>
`;
}

function tileSymbol(bg, mark) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" fill="none">
  <rect width="32" height="32" rx="7" fill="${bg}"/>
  ${mark}
</svg>
`;
}

const files = {
  fedora: tileOfficial("fedora.svg", { bg: "#0B1F33", pad: 2 }),
  ubuntu: tileOfficial("ubuntu.svg", { bg: "#2A0E08", pad: 2 }),
  vscode: tileOfficial("vscode.svg", { bg: "#1F1F1F", pad: 3 }),
  cursor: tileSimple(si("cursor"), { pad: 5 }),
  neovim: tileOfficial("neovim.svg", { bg: "#111827", pad: 5 }),
  micro: tileSimple(si("microeditor")),
  emacs: tileOfficial("emacs.svg", { bg: "#2A1240", pad: 3 }),
  kitty: tileOfficial("kitty.svg", { bg: "#1A120C", pad: 2 }),
  alacritty: tileSimple(si("alacritty")),
  ghostty: tileOfficial("ghostty.svg", { bg: "#0B1020", pad: 3 }),
  git: tileOfficial("git.svg", { bg: "#2A100C", pad: 4 }),
  gh: tileOfficial("github.svg", { bg: "#181717", pad: 5 }),
  docker: tileOfficial("docker.svg", { bg: "#0B2A44", pad: 4 }),
  python: tileOfficial("python.svg", { bg: "#1B2838", pad: 3 }),
  nodejs: tileSimple(si("nodedotjs")),
  go: tileSimple(si("go"), { pad: 5 }),
  rust: tileSimple(si("rust"), { pad: 5 }),
  starship: tileSimple(si("starship")),
  htop: tileSimple(si("htop")),
  tmux: tileSimple(si("tmux")),
  bat: tileSimple(si("bat")),
  curl: tileSimple(si("curl")),
  "claude-code": tileOfficial("claude.svg", { bg: "#2A1A12", pad: 4 }),
  "gemini-cli": tileSimple(si("googlegemini")),
  opencode: tileSimple(si("opencode"), { pad: 5 }),
  codex: tileOfficial("openai.svg", { bg: "#111111", pad: 4 }),

  lazygit: tileSymbol(
    "#0F172A",
    `<path d="M11 8v11.2a3.2 3.2 0 1 0 2.4 0V14h6.2a3.2 3.2 0 1 0 0-2.4H13.4V8A3.2 3.2 0 1 0 11 8Z" fill="#F4F1EA"/>`,
  ),
  "git-delta": tileSymbol(
    "#1E3A5F",
    `<path d="M16 7.5 24 24H8L16 7.5Z" fill="#F4F1EA"/>`,
  ),
  btop: tileSymbol(
    "#7C2D12",
    `<rect x="8" y="18" width="4" height="7" rx="1" fill="#F4F1EA"/><rect x="14" y="11" width="4" height="14" rx="1" fill="#F4F1EA"/><rect x="20" y="8" width="4" height="17" rx="1" fill="#F4F1EA"/>`,
  ),
  fzf: tileSymbol(
    "#4C1D95",
    `<circle cx="14" cy="14" r="5.2" stroke="#F4F1EA" stroke-width="2"/><path d="m18.2 18.2 5.3 5.3" stroke="#F4F1EA" stroke-width="2" stroke-linecap="round"/><path d="M12.2 12.2h3.6M14 10.4v3.6" stroke="#C4B5FD" stroke-width="1.6" stroke-linecap="round"/>`,
  ),
  ripgrep: tileSymbol(
    "#14532D",
    `<path d="M8 10h12M8 15h8M8 20h5" stroke="#BBF7D0" stroke-width="1.8" stroke-linecap="round"/><circle cx="21" cy="20" r="3.2" stroke="#F4F1EA" stroke-width="1.8"/><path d="m23.4 22.4 2.2 2.2" stroke="#F4F1EA" stroke-width="1.8" stroke-linecap="round"/>`,
  ),
  fd: tileSymbol(
    "#1E3A8A",
    `<path d="M8 11.5h5.2l1.6 2H24v9.2a1.8 1.8 0 0 1-1.8 1.8H9.8A1.8 1.8 0 0 1 8 22.7Z" fill="#93C5FD"/><path d="M8 11.5V9.8A1.8 1.8 0 0 1 9.8 8h4.1l1.5 2.2H8Z" fill="#F4F1EA"/>`,
  ),
  jq: tileSymbol(
    "#164E63",
    `<path d="M12 8.5c-2.6 0-4 1.5-4 4.2v6.6c0 2.7 1.4 4.2 4 4.2" stroke="#A5F3FC" stroke-width="2.1" fill="none" stroke-linecap="round"/><path d="M20 8.5c2.6 0 4 1.5 4 4.2v6.6c0 2.7-1.4 4.2-4 4.2" stroke="#A5F3FC" stroke-width="2.1" fill="none" stroke-linecap="round"/>`,
  ),
  yq: tileSymbol(
    "#422006",
    `<path d="M10 8.5 16 16l6-7.5" stroke="#FDE68A" stroke-width="2.1" fill="none" stroke-linecap="round" stroke-linejoin="round"/><path d="M16 16v7.5" stroke="#FDE68A" stroke-width="2.1" stroke-linecap="round"/>`,
  ),
  zoxide: tileSymbol(
    "#134E4A",
    `<path d="M10 9h12L10 23h12" stroke="#99F6E4" stroke-width="2.3" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`,
  ),
  direnv: tileSymbol(
    "#365314",
    `<path d="M8 12h5.4l1.7 2.1H24v9.4a1.7 1.7 0 0 1-1.7 1.7H9.7A1.7 1.7 0 0 1 8 23.5Z" fill="#D9F99D"/><path d="m12.5 18 3 3 5.5-6" stroke="#365314" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`,
  ),
  shellcheck: tileSymbol(
    "#1F2937",
    `<path d="M10 9.5 14.5 16 10 22.5" stroke="#F4F1EA" stroke-width="2.1" fill="none" stroke-linecap="round" stroke-linejoin="round"/><path d="m17 19 2.2 2.2 4.3-5.2" stroke="#86EFAC" stroke-width="2.1" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`,
  ),
  wget: tileSymbol(
    "#1E3A8A",
    `<path d="M16 8v11" stroke="#BFDBFE" stroke-width="2.2" stroke-linecap="round"/><path d="m11.5 15.5 4.5 4.5 4.5-4.5" stroke="#BFDBFE" stroke-width="2.2" fill="none" stroke-linecap="round" stroke-linejoin="round"/><path d="M9 24h14" stroke="#93C5FD" stroke-width="2.2" stroke-linecap="round"/>`,
  ),
  unzip: tileSymbol(
    "#44403C",
    `<path d="M10 12h12v12H10Z" fill="#E7E5E4"/><path d="M14 8h4v16h-4Z" fill="#A8A29E"/><path d="M15.2 10h1.6v1.6h-1.6zm0 3.2h1.6V14.8h-1.6zm0 3.2h1.6v1.6h-1.6z" fill="#44403C"/>`,
  ),
  tree: tileSymbol(
    "#14532D",
    `<path d="M16 8v16M16 14h7M16 20h5M16 11H9M16 17H11" stroke="#BBF7D0" stroke-width="2" stroke-linecap="round"/><circle cx="16" cy="8" r="1.6" fill="#F4F1EA"/><circle cx="9" cy="11" r="1.5" fill="#F4F1EA"/><circle cx="23" cy="14" r="1.5" fill="#F4F1EA"/><circle cx="11" cy="17" r="1.5" fill="#F4F1EA"/><circle cx="21" cy="20" r="1.5" fill="#F4F1EA"/>`,
  ),
  "build-tools": tileSymbol(
    "#44403C",
    `<path d="M20.5 9.2a4.6 4.6 0 0 0-6.2 6.2L8.5 21.2 10.8 23.5l5.8-5.8a4.6 4.6 0 0 0 6.2-6.2l-2.6 2.6-1.8-1.8 2.1-3.1Z" fill="#E7E5E4"/>`,
  ),
};

for (const [name, svg] of Object.entries(files)) {
  const dest = join(outDir, `${name}.svg`);
  writeFileSync(dest, svg);
  console.log("wrote", `${name}.svg`);
}
