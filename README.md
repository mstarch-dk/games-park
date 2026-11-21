# 🎡 Spilleparken (games-park)

En forlystelsespark fuld af små browserspil, lavet til (og sammen med) et barn. Gå rundt i parken med piletasterne, vælg en bod – og spil!

**Spil online:** https://mstarch-dk.github.io/games-park/

## Spillene
| | Spil | Spillere | Hvad går det ud på |
|---|---|---|---|
| 🐒 | [Abe-Hop](games/abe-hop/) | 1 | Platformspil: hop over tønder, saml bananer og flygt fra bombeflyet gennem 8 baner. |
| 🚀 | [Rum-Duel](games/rum-duel/) | 1–2 | Rumskibe med ægte rumfysik og tyngdekraft: duel, mod computeren eller fjende-bølger. |

## Spil lokalt
Dobbeltklik på `index.html` – det virker uden server og uden internet. Eller start en lille server i roden af repoet:

```bash
python -m http.server 8130
```

og gå til http://localhost:8130

I parken: **← → ↑ ↓** vælger en bod, **ENTER/MELLEMRUM** går ind, **R** eller 🎲 vælger et tilfældigt spil. Inde i et spil fører 🏠-knappen i hjørnet tilbage til parken.

## Sådan er repoet bygget op
```
index.html, park/         parken (navigatoren) + hjem-knappen spillene bruger
games/games.js            kataloget – ét objekt pr. spil
games/<id>/               ét selvstændigt spil pr. mappe (index.html, style.css, js/, cover.svg, README.md)
tools/check-games.ps1     tjekker at katalog og mapper passer sammen
.claude/skills/add-game/  Claude-skill til at lave og tilføje et nyt spil
```

Hvert spil er ren HTML, CSS og JavaScript uden build-trin og uden eksterne filer, så en spilmappe kan kopieres ud og spilles for sig selv.

## Tilføj et nyt spil
Med [Claude Code](https://claude.com/claude-code) i dette repo: bed om et nyt spil ("lav et nyt spil til parken om en frø der hopper over åkander"). Skillen `add-game` laver mappen og indgangen i kataloget og tester det hele.

I hånden:
1. Lav `games/<id>/` med `index.html`, `style.css`, `js/`, `cover.svg` (320×200) og `README.md`.
2. Sæt `<script src="../../park/home-button.js"></script>` sidst i `<body>`.
3. Tilføj spillet i `games/games.js` og i tabellen ovenfor.
4. Kør `pwsh tools/check-games.ps1`.

## Licens
[MIT](LICENSE)
