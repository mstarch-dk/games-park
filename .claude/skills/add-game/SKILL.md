---
name: add-game
description: Author a new self-contained HTML game for the games-park (Spilleparken) library and enlist it in the park navigator, or import an existing game folder/repo into the park. Always starts with a concrete game proposal (or choices when the wish is vague) for the user to approve before building. Use when the user wants to make, add, build, import or register a game in games-park ("lav et nyt spil", "tilføj et spil til parken").
---

# Add a game to Spilleparken

The park is a library of small browser games for a child. Every game is a **self-contained folder** under `games/<id>/` that runs by double-clicking its `index.html` – no build step, no server, no internet. The park navigator (`index.html` at the repo root) lists every game registered in `games/games.js`.

## 0. Plan first – propose before building
**Never create files before the user has approved a concrete proposal.** Improvising is welcome, but inside a bounded frame: the user's wish fixes the frame, you fill in the details, and when the wish is too thin you offer choices instead of guessing.

### 0a. The interpretation frame
Every game wish must end up filling these dimensions:

| Dimension | Examples |
|---|---|
| **Core mechanic / genre** | jump-platform, dodge, aim-and-shoot, puzzle, sailing, catch |
| **Theme & hero** | duckling, spaceship, monkey, pirate ship |
| **Goal** – what "winning" is | reach home, collect 10 stars, survive 60 s |
| **Players** | 1, or 1–2 on the same keyboard |
| Controls | arrows+SPACE / WASD+F vs. arrows+L / mouse |
| Progression & length | levels, rising difficulty, round length |
| Learning / feeling (optional) | counting, predicting, reaction, calm |

Classify each dimension as **given** (stated in the wish), **derived** (follows naturally from what is given – "the duckling must cross the road" ⇒ dodge mechanic, 1 player, goal = reach the other side) or **missing**.

### 0b. How much you may improvise
- **Free to improvise** (no need to ask): art style, colours, sounds, level design, scoring details, fun extra effects, title/name suggestions.
- **May improvise, but must be stated explicitly in the proposal**: derived dimensions and defaults (Danish UI, keyboard controls, canvas).
- **Never guess silently**: core mechanic, theme and number of players. If any of these is missing – or more than ~2 dimensions are missing in total – go to 0d.

### 0c. Concrete proposal (when the frame is filled)
Before anything is created, present a short, scannable proposal in Danish:
- Title, `id`, emoji and a one-sentence pitch.
- Core loop: what the child does second by second, the goal, and what happens on a mistake (forgiving – the player is a child).
- Controls and players.
- Progression: number of levels/stages and what changes between them.
- **First version** (keep it small) vs. **"senere idéer"** that are deliberately left out.
- Mark everything you improvised or derived ("Mit bud: …") so the user can correct it.

Then wait for approval – use AskUserQuestion (e.g. "Byg det" / "Ret noget"), or ExitPlanMode when in plan mode. Only start step 1 after a yes; apply any corrections to the proposal first.

### 0d. Offer choices (when the wish is too thin)
Use AskUserQuestion to fill the frame instead of improvising the core:
- 1–3 questions, one per missing core dimension, each with 2–4 concrete, clearly different options with a short description. Put your recommendation first.
- When almost everything is missing ("lav et sjovt spil"), ask one question with 2–3 complete game concepts instead, using `preview` for a mini-pitch (core loop, goal, controls) per concept.
- Don't ask about things you are free to improvise (0b).

With the answers, go to 0c and present the full proposal.

**Examples**
- *"Et spil med dyr"* – theme half-given, mechanic, goal and players missing → 0d: e.g. "Hvilken slags spil?" with *Hop-platform med en abe* / *Fang faldende frugt med en bjørn* / *Undvig-spil med en ælling*, plus "1 eller 2 spillere?".
- *"Ællingen skal over vejen hjem til mor and"* – theme and goal given, mechanic and players derived → straight to 0c, with "Mit bud: undvig biler, 1 spiller, piletaster, 10 baner med mere trafik".

### 0e. Originality and id
The game must be **original** – a genre or mechanic is fine (platformer, space shooter, puzzle), but never recreate a specific existing game (its name, characters, art, music, levels or look). If the wish names an existing game, propose an original game in the same genre and say so.

Read `games/games.js` before proposing: say so if the idea is very close to a game already in the park, and suggest how to make it different.

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

## 2. Create the game's backlog in the private backlog repo
Work planning is **private** and must never be committed to this public repo. It lives in `mstarch-dk/games-park-backlog`, cloned at `C:\dev\games-park-backlog` (if it is missing, clone it there with `gh repo clone mstarch-dk/games-park-backlog C:/dev/games-park-backlog`). Create the board `C:\dev\games-park-backlog\<id>\backlog\` in Backlog.md format, like `abe-hop/backlog/`:
- `config.yml` – copy from an existing game and set `project_name` to the title.
- `tasks/task-N - <Titel>.md` – one task per chunk of work (engine, player, enemies, menus, play-test), with frontmatter (`id`, `title`, `status`, `created_date`, `ordinal`) and acceptance criteria. Mark them `Done` as you finish them.

Commit and push those task files in the backlog repo, separately from the game commit.

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

Also add a line to the games table in the root `README.md`, and a task on the park board (`C:\dev\games-park-backlog\backlog\tasks\`) noting the new game.

## 4. Verify
1. `pwsh tools/check-games.ps1` must print `OK`.
2. Start the `games-park` preview (`.claude/launch.json`, port 8130) and check:
   - the park shows the new booth with its cover, and arrow keys/click select it,
   - ENTER/click opens `games/<id>/index.html`, the game starts and plays from the title screen,
   - the browser console has no errors,
   - the 🏠 button returns to the park.
3. Commit on a branch (`add-game/<id>`), never straight to `main` unless asked.

## Importing an existing game instead
If the user already has a game folder or repo, skip the proposal in step 0 – just confirm the title and `id` (0e) before starting:
1. Keep its history: `git subtree add --prefix=games/<id> <path-or-url> <branch>` (if it is a git repo), otherwise copy the folder.
2. Move any `backlog/` folder out of the public repo into `C:\dev\games-park-backlog\<id>\backlog\` (and `git rm` it here). If the import brought backlog files into this repo's history, strip them before pushing (`git filter-branch --index-filter 'git rm -r -q --cached --ignore-unmatch games/<id>/backlog backlog'`). Delete its `.claude/launch.json` (the park has one).
3. Make it fit the conventions above: relative paths only, `home-button.js` include, prefixed localStorage keys, `cover.svg`, `README.md`.
4. Do steps 3 and 4.
