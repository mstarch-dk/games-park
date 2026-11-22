# 🚂 Togbanen

Et roligt gådespil om tog. Hver bane er et lille landskab set fra oven med farvede stationer og passagerer, der venter. Læg skinner, så toget kan samle passagererne op og køre hver af dem hen til stationen med samme farve. Tryk **Kør!** og se toget tøffe af sted.

Man kan ikke tabe: hvis toget kører galt, stopper det venligt, og så retter man bare sporet.

Del af [Spilleparken](../../README.md). Åbn `index.html` med dobbeltklik. Det virker uden internet.

## Sådan spiller man
- **Træk** med musen eller fingeren for at lægge skinner. Sporet følger fingeren, også rundt om hjørner.
- **Tryk** på en skinne for at dreje den (lige ↔ sving).
- **Gule sporskifter**: tryk på dem for at skifte vej, også mens toget kører. Man laver selv et sporskifte ved at trække et spor ind i siden af et andet spor.
- **Kryds**: træk lige hen over et andet spor.
- **🧽 Visk** eller **højreklik** fjerner skinner.
- **💡 Hjælp** viser en løsning med stiplede skinner.
- **▶ Kør!** sender toget af sted. **📯 Dyt!** får en ko på sporet til at gå væk.

Toget har et begrænset antal vogne med plads til én passager hver. Passagerer stiger på, når toget kører forbi deres plads, og af ved stationen i deres farve.

### Forhindringer
Træer, huse og klipper kan man ikke bygge på. Over vand skal der være en bro, så der kan kun ligge en lige skinne. En ko på sporet får toget til at holde, indtil man dytter. På de sidste baner er der to tog, og de må ikke støde sammen.

### Stjerner
Hver bane giver 1–3 ⭐. Man får 3 stjerner, hvis man bruger lige så få skinner som løsningen eller færre. Stjernerne er en bonus: den næste bane låses op, så snart banen er klaret.

### Fri leg
Byg din egen bane på et stort, tomt gitter: sæt tog (op til 2), træer, klipper, vand, huse, køer, stationer og passagerer. Tryk på toget for at dreje det. Banen gemmes automatisk.

## Taster
| Tast | Hvad |
|---|---|
| Piletaster | flyt markøren |
| SHIFT + piletaster | tegn spor fra markøren |
| MELLEMRUM | læg / drej en skinne (skift sporskifte) |
| DELETE / BACKSPACE / X | fjern skinnen |
| V | skift mellem spor og viskelæder |
| ENTER | kør / ret sporet |
| H | dyt |
| P | pause |
| F | hurtigere |
| M | lyd til/fra |
| ESC | tilbage |

## Gemt i browseren
`togbanen-progress` (stjerner og åbne baner), `togbanen-fri` (den frie bane) og `togbanen-muted`.

## Tilpas spillet
- **Baner**: `js/levels.js`. Hver bane er et lille tekstkort (`map`) plus en løsning (`sol`), som bruges til hjælpen og til at tælle skinner til 3 stjerner. Tegnforklaringen står øverst i filen.
- **Fart**: `TICK` i `js/main.js` (sekunder pr. felt).
- **Farver og grafik**: `js/draw.js`. Lyde: `js/sound.js`.

Filer: `grid.js` (gitter og byggeri), `sim.js` (togene kører), `draw.js` (tegning), `screens.js` (skærme og knapper), `input.js`, `main.js`.
