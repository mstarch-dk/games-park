# games-park (Spilleparken)

Library of small, original browser games for a child, plus a theme-park navigator to pick them. UI text is Danish.

- `index.html` + `park/` – the navigator. Reads `games/games.js` (`window.PARK_GAMES`). Plain JS, no dependencies, must work from `file://`.
- `games/<id>/` – one self-contained game per folder: `index.html`, `style.css`, `js/`, `cover.svg`, `README.md`. Classic `<script>` tags, relative paths only, no CDN/modules/fetch, Web Audio for sound. Each includes `../../park/home-button.js` last in `<body>`.
- `games-park-backlog/` – park tasks at the top level, each game's tasks in `games-park-backlog/<id>/` (Backlog.md format).
- `tools/check-games.ps1` – run after any change to games or the registry.
- Preview: `.claude/launch.json` → `games-park` on port 8130.

**Adding or importing a game: use the `add-game` skill** (`.claude/skills/add-game/SKILL.md`). Games must be original – never recreate a specific existing game.

Commit messages are in Danish. Published via GitHub Pages from `main`.
