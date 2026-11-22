# 🎡 Spilleparken (games-park)

En forlystelsespark fuld af små browserspil, lavet til (og sammen med) et barn. Gå rundt i parken med piletasterne, vælg en bod – og spil!

**Spil online:** https://mstarch-dk.github.io/games-park/

## Spillene
| | Spil | Spillere | Hvad går det ud på |
|---|---|---|---|
| 🐒 | [Abe-Hop](games/abe-hop/) | 1 | Platformspil: hop over tønder, saml bananer og flygt fra bombeflyet gennem 8 baner. |
| 🚀 | [Rum-Duel](games/rum-duel/) | 1–2 | Rumskibe med ægte rumfysik og tyngdekraft: duel, mod computeren eller fjende-bølger. |
| ✈️ | [Himmel-Heltene](games/himmel-heltene/) | 1–2 | Propelfly set oppefra: skyd fjendefly ned (piloterne hopper ud i faldskærm), saml power-ups og besejr luftskibet. |
| 🏰 | [Kongens Ridder](games/kongens-ridder/) | 1 | Turbaseret strategi i 1500-tallets Danmark: erobr lenene, belejr borge med katapult, rid turnering i Roskilde og fægt for prinsessen. |
| 🚂 | [Togbanen](games/togbanen/) | 1 | Roligt gådespil: læg skinner, så toget kan samle passagerer op og køre dem hjem. 20 baner med broer, køer, sporskifter og to tog, plus fri leg. |
| ☁️ | [Klodsregn](games/klodsregn/) | 1 | Faldende klodser med ansigter: flyt og drej dem, lav hele rækker og spræng bunken med stjernebomber. Med en rolig tilstand hvor man ikke kan tabe. |
| 🌍 | [Gæt et Land](games/gaet-et-land/) | 1 | Geografispil med alle 199 lande: se omrids, flag og ledetråde, klik på verdenskortet og få point efter hvor tæt du rammer. Med fakta-ark om hvert land og »Opdag verden«. |

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
