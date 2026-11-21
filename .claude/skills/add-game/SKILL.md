---
name: add-game
description: Author a new self-contained HTML game for the games-park (Spilleparken) library and enlist it in the park navigator, or import an existing game folder/repo into the park. Use when the user wants to make, add, build, import or register a game in games-park ("lav et nyt spil", "tilføj et spil til parken").
---

# Add a game to Spilleparken

The park is a library of small browser games for a child. Every game is a **self-contained folder** under `games/<id>/` that runs by double-clicking its `index.html` – no build step, no server, no internet. The park navigator (`index.html` at the repo root) lists every game registered in `games/games.js`.

## 0. Agree on the game (short)
Ask only what you cannot decide yourself: the idea, 1 or 2 players, and the name. Defaults: Danish UI text, keyboard controls, canvas.
The game must be **original** – a genre or mechanic is fine (platformer, space shooter, puzzle), but never recreate a specific existing game (its name, characters, art, music, levels or look).

Pick an `id`: kebab-case from the Danish title (`abe-hop`, `rum-duel`). It must not already exist in `games/games.js`.

## 1. Create the game folder `games/<id>/`
Required files:

| File | Purpose |
|---|---|
| `index.html` | Entry point. Canvas + classic `<script src="js/...">` tags. |
| `style.css` | Page styling (dark/colourful background, centred canvas, small help line). |
| `js/*.js` | Game code split in small files (input, sound, drawing, entities, main loop). |
| `cover.svg` | 320×200 vector picture shown on the park's booth. Bright, simple, recognisable. |
| `README.md` | Danish: how to play, keys, scoring, how to tweak the game. Link back: `[Spilleparken](../../README.md)`. |

Conventions (copy the patterns from `games/abe-hop/` and `games/rum-duel/` – read their `index.html`, `js/input.js`, `js/sound.js` and `js/main.js` first):
- **Self-contained**: only relative paths inside the folder. No CDN, no `fetch` of local files (breaks `file://`), no ES modules (`type="module"` breaks `file://`). Generate sounds with Web Audio, draw with canvas – no binary assets needed.
- **Last line in `<body>`**: `<script src="../../park/home-button.js"></script>` – adds the 🏠 button back to the park (mouse/touch only; the game keeps all its keys).
- **localStorage keys** prefixed with the id without dashes, e.g. `abehop-highscore`, always in `try/catch`.
- Global state object + `requestAnimationFrame` loop with a fixed/clamped `dt`; states like `title`, `playing`, `paused`, `gameover`.
- Keys: arrows + SPACE for one player; P pause, M sound on/off, ESC back to the game's own menu. For 2 players: WASD+F vs. arrows+L.
- Title screen that explains the controls in big, friendly Danish text. Forgiving difficulty – the player is a child.
- `<html lang="da">`, `<meta charset="utf-8">`, viewport meta, `<title>` = game title.

## 2. Create the game's backlog `games-park-backlog/<id>/`
Backlog.md format, as in `games-park-backlog/abe-hop/`:
- `config.yml` – copy from an existing game and set `project_name` to the title.
- `tasks/task-N - <Titel>.md` – one task per chunk of work (engine, player, enemies, menus, play-test), with frontmatter (`id`, `title`, `status`, `created_date`, `ordinal`) and acceptance criteria. Mark them `Done` as you finish them.

## 3. Enlist the game in `games/games.js`
Append one object to `window.PARK_GAMES`:

```js
  {
    id: 'my-game',
    title: 'Mit Spil',
    emoji: '🐸',            // one emoji for the booth sign
    color: '#3bceac',        // booth colour – pick one that differs from the neighbours
    tagline: 'Én kort, sjov sætning til et barn.',
    players: '1',            // or '1–2'
    keys: ['← → gå', 'MELLEMRUM hop'],
    added: 'YYYY-MM-DD'      // today; shows a "✨ Ny!" badge for 3 weeks
  }
```

Also add a line to the games table in the root `README.md`, and a task in `games-park-backlog/tasks/` noting the new game.

## 4. Verify
1. `pwsh tools/check-games.ps1` must print `OK`.
2. Start the `games-park` preview (`.claude/launch.json`, port 8130) and check:
   - the park shows the new booth with its cover, and arrow keys/click select it,
   - ENTER/click opens `games/<id>/index.html`, the game starts and plays from the title screen,
   - the browser console has no errors,
   - the 🏠 button returns to the park.
3. Commit on a branch (`add-game/<id>`), never straight to `main` unless asked.

## Importing an existing game instead
If the user already has a game folder or repo:
1. Keep its history: `git subtree add --prefix=games/<id> <path-or-url> <branch>` (if it is a git repo), otherwise copy the folder.
2. Move any `backlog/` folder to `games-park-backlog/<id>/` with `git mv`; delete its `.claude/launch.json` (the park has one).
3. Make it fit the conventions above: relative paths only, `home-button.js` include, prefixed localStorage keys, `cover.svg`, `README.md`.
4. Do steps 3 and 4.
