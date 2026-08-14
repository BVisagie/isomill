#!/usr/bin/env python3
"""Generate catalogue icons (custom glyphs + letterforms, not reused boxes)."""
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent / "packages" / "catalogue" / "icons"
ROOT.mkdir(parents=True, exist_ok=True)

def svg(body: str) -> str:
    return (
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" fill="none">'
        f"{body}</svg>\n"
    )

def letter(ch: str, bg: str, fg: str = "#f4f1ea") -> str:
    return svg(
        f'<rect width="32" height="32" rx="7" fill="{bg}"/>'
        f'<text x="16" y="21.5" text-anchor="middle" font-family="ui-sans-serif,system-ui,sans-serif" '
        f'font-size="14" font-weight="700" fill="{fg}">{ch}</text>'
    )

icons = {}

# Distros — simplified identifying marks, not official lockups as endorsement.
icons["fedora"] = svg(
    '<rect width="32" height="32" rx="7" fill="#0B57A4"/>'
    '<circle cx="13" cy="16" r="5.2" stroke="#F4F1EA" stroke-width="2.2"/>'
    '<path d="M18 16h7" stroke="#F4F1EA" stroke-width="2.2" stroke-linecap="round"/>'
)
icons["ubuntu"] = svg(
    '<rect width="32" height="32" rx="7" fill="#E95420"/>'
    '<circle cx="16" cy="16" r="5" stroke="#F4F1EA" stroke-width="2"/>'
    '<circle cx="16" cy="6.5" r="2.1" fill="#F4F1EA"/>'
    '<circle cx="24.2" cy="21" r="2.1" fill="#F4F1EA"/>'
    '<circle cx="7.8" cy="21" r="2.1" fill="#F4F1EA"/>'
)

# Editors
icons["vscode"] = svg(
    '<rect width="32" height="32" rx="7" fill="#2F80ED"/>'
    '<path d="M8 10.5 14 16 8 21.5" stroke="#F4F1EA" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>'
    '<path d="M14.5 7.5 24 16 14.5 24.5 11 22V10z" fill="#F4F1EA"/>'
)
icons["cursor"] = svg(
    '<rect width="32" height="32" rx="7" fill="#1A1A1A"/>'
    '<path d="M9 7.5 23.5 16 14 18.2 11.8 25.5 9 7.5z" fill="#F4F1EA"/>'
)
icons["neovim"] = svg(
    '<rect width="32" height="32" rx="7" fill="#16251C"/>'
    '<path d="M8 24V8l6 10L20 8v16" stroke="#59B36B" stroke-width="2.3" stroke-linejoin="round"/>'
    '<path d="M20 8l4 0 0 16" stroke="#F4F1EA" stroke-width="2.3"/>'
)
icons["micro"] = svg(
    '<rect width="32" height="32" rx="7" fill="#2A1F4A"/>'
    '<text x="16" y="21.5" text-anchor="middle" font-family="ui-sans-serif,system-ui,sans-serif" font-size="11" font-weight="700" fill="#C9B8FF">μ</text>'
)
icons["emacs"] = svg(
    '<rect width="32" height="32" rx="7" fill="#6B2D8B"/>'
    '<text x="16" y="21" text-anchor="middle" font-family="ui-sans-serif,system-ui,sans-serif" font-size="13" font-weight="700" fill="#F4E8FF">E</text>'
)

# Terminals
icons["kitty"] = svg(
    '<rect width="32" height="32" rx="7" fill="#1C1917"/>'
    '<ellipse cx="12" cy="14" rx="3.2" ry="3.6" fill="#F59E0B"/>'
    '<ellipse cx="20" cy="14" rx="3.2" ry="3.6" fill="#F59E0B"/>'
    '<path d="M10 21c2 3 10 3 12 0" stroke="#F59E0B" stroke-width="1.8" stroke-linecap="round"/>'
)
icons["alacritty"] = svg(
    '<rect width="32" height="32" rx="7" fill="#0F172A"/>'
    '<path d="M16 6 26 26H6L16 6z" fill="#FBBF24"/>'
    '<path d="M16 13 21 24h-10L16 13z" fill="#0F172A"/>'
)
icons["ghostty"] = svg(
    '<rect width="32" height="32" rx="7" fill="#111827"/>'
    '<path d="M8 18c0-6 16-6 16 0v6H8v-6z" fill="#E5E7EB"/>'
    '<circle cx="13" cy="18" r="1.4" fill="#111827"/>'
    '<circle cx="19" cy="18" r="1.4" fill="#111827"/>'
)

# Git
icons["git"] = svg(
    '<rect width="32" height="32" rx="7" fill="#F05032"/>'
    '<path d="M16 7v11M16 18l6 6M16 13l6-3" stroke="#F4F1EA" stroke-width="2.2" stroke-linecap="round"/>'
    '<circle cx="16" cy="7" r="2.1" fill="#F4F1EA"/>'
    '<circle cx="16" cy="18" r="2.1" fill="#F4F1EA"/>'
    '<circle cx="22" cy="10" r="2.1" fill="#F4F1EA"/>'
    '<circle cx="22" cy="24" r="2.1" fill="#F4F1EA"/>'
)
icons["gh"] = svg(
    '<rect width="32" height="32" rx="7" fill="#181717"/>'
    '<path fill="#F4F1EA" d="M16 7.2c-4.9 0-8.8 4-8.8 8.8 0 3.9 2.5 7.2 6 8.3.4.1.6-.2.6-.4v-1.5c-2.4.5-2.9-1-2.9-1-.4-1-1-1.3-1-1.3-.8-.6.1-.6.1-.6.9.1 1.4.9 1.4.9.8 1.4 2.2 1 2.7.8.1-.6.3-1 .6-1.2-2-.2-4.1-1-4.1-4.5 0-1 .4-1.8 1-2.4-.1-.2-.4-1.2.1-2.5 0 0 .8-.3 2.6 1a9 9 0 0 1 4.8 0c1.8-1.3 2.6-1 2.6-1 .5 1.3.2 2.3.1 2.5.6.6 1 1.4 1 2.4 0 3.5-2.1 4.3-4.1 4.5.3.3.6.8.6 1.7v2.5c0 .2.2.5.6.4 3.5-1.1 6-4.4 6-8.3 0-4.8-4-8.8-8.8-8.8z"/>'
)
icons["lazygit"] = letter("lg", "#14532D")
icons["git-delta"] = letter("Δ", "#1E3A5F")

# CLI letterforms — unique colors, not identical boxes
icons["btop"] = letter("bt", "#7C2D12")
icons["htop"] = letter("ht", "#3F3F46")
icons["tmux"] = letter("tx", "#0F766E")
icons["fzf"] = letter("fz", "#4C1D95")
icons["ripgrep"] = letter("rg", "#9A3412")
icons["fd"] = letter("fd", "#1D4ED8")
icons["bat"] = letter("bat", "#78350F", "#FDE68A")
icons["jq"] = letter("jq", "#164E63")
icons["yq"] = letter("yq", "#365314")
icons["zoxide"] = letter("z", "#831843")
icons["direnv"] = letter("de", "#134E4A")
icons["starship"] = svg(
    '<rect width="32" height="32" rx="7" fill="#1E1B4B"/>'
    '<path d="M16 6.5 18.2 13H25l-5.2 3.8 2 6.5L16 19.6 10.2 23.3l2-6.5L7 13h6.8L16 6.5z" fill="#FDE68A"/>'
)
icons["shellcheck"] = letter("sh", "#365314")
icons["curl"] = letter("cu", "#1E3A8A")
icons["wget"] = letter("wg", "#312E81")
icons["unzip"] = letter("zip", "#44403C")
icons["tree"] = svg(
    '<rect width="32" height="32" rx="7" fill="#14532D"/>'
    '<path d="M16 7v18M16 12h7M16 18h7M16 24h7M16 12l-6 4M16 18l-6 4" stroke="#BBF7D0" stroke-width="1.8" stroke-linecap="round"/>'
)

# Languages
icons["python"] = svg(
    '<rect width="32" height="32" rx="7" fill="#3776AB"/>'
    '<path d="M12 8h8a4 4 0 0 1 4 4v3H16a3 3 0 0 0-3 3v1H10V12a4 4 0 0 1 4-4z" fill="#FFD43B"/>'
    '<path d="M20 24h-8a4 4 0 0 1-4-4v-3h8a3 3 0 0 0 3-3v-1h3v6a4 4 0 0 1-4 4z" fill="#F4F1EA"/>'
)
icons["nodejs"] = svg(
    '<rect width="32" height="32" rx="7" fill="#16351F"/>'
    '<path d="M16 6 26 12v8L16 26 6 20v-8L16 6z" stroke="#5FA04E" stroke-width="1.8"/>'
    '<path d="M16 11v10" stroke="#5FA04E" stroke-width="1.8"/>'
)
icons["go"] = svg(
    '<rect width="32" height="32" rx="7" fill="#00ADD8"/>'
    '<text x="16" y="21" text-anchor="middle" font-family="ui-sans-serif,system-ui,sans-serif" font-size="11" font-weight="800" fill="#083344">Go</text>'
)
icons["rust"] = svg(
    '<rect width="32" height="32" rx="7" fill="#1C1917"/>'
    '<circle cx="16" cy="16" r="7.5" stroke="#F97316" stroke-width="1.6"/>'
    '<circle cx="16" cy="16" r="3.2" fill="#F97316"/>'
)
icons["build-tools"] = svg(
    '<rect width="32" height="32" rx="7" fill="#44403C"/>'
    '<path d="M9 21 21 9M14 8l10 10M8 14l4 4" stroke="#E7E5E4" stroke-width="2" stroke-linecap="round"/>'
)

# Containers / AI
icons["docker"] = svg(
    '<rect width="32" height="32" rx="7" fill="#1D63ED"/>'
    '<rect x="8" y="14" width="5" height="4" fill="#F4F1EA"/>'
    '<rect x="14" y="14" width="5" height="4" fill="#F4F1EA"/>'
    '<rect x="20" y="14" width="5" height="4" fill="#F4F1EA"/>'
    '<rect x="14" y="9" width="5" height="4" fill="#F4F1EA"/>'
    '<path d="M6 20c2 4 18 4 20 0" stroke="#F4F1EA" stroke-width="1.6" fill="none"/>'
)
icons["claude-code"] = svg(
    '<rect width="32" height="32" rx="7" fill="#D97706"/>'
    '<path d="M8 22c4-12 12-12 16 0" stroke="#1C1917" stroke-width="2.2" fill="none"/>'
    '<circle cx="16" cy="11" r="2.2" fill="#1C1917"/>'
)
icons["codex"] = svg(
    '<rect width="32" height="32" rx="7" fill="#111111"/>'
    '<circle cx="16" cy="16" r="8" stroke="#F4F1EA" stroke-width="2"/>'
    '<circle cx="16" cy="16" r="3" fill="#F4F1EA"/>'
)
icons["gemini-cli"] = svg(
    '<rect width="32" height="32" rx="7" fill="#1A73E8"/>'
    '<path d="M16 6 18 14h8l-6.5 4.6L22 27 16 21.8 10 27l2.5-8.4L6 14h8L16 6z" fill="#F4F1EA"/>'
)
icons["opencode"] = svg(
    '<rect width="32" height="32" rx="7" fill="#0B3D2E"/>'
    '<path d="M10 20c0-4 12-4 12 0" stroke="#6EE7B7" stroke-width="2"/>'
    '<path d="M8 12h16M12 8v8M20 8v8" stroke="#6EE7B7" stroke-width="1.8" stroke-linecap="round"/>'
)

for name, content in icons.items():
    (ROOT / f"{name}.svg").write_text(content)

print(f"wrote {len(icons)} icons to {ROOT}")
