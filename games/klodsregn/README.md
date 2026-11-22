# ☁️ Klodsregn

En glad sky regner klodser ned. Flyt og drej klodserne, så de passer sammen – når en række er helt fyldt, forsvinder den med stjerner og fanfare!

Klodserne har små ansigter: de smiler, blinker, jubler når en række forsvinder, og bliver bange hvis bunken når helt op til skyen.

[Spilleparken](../../README.md)

## Sådan spiller du
Åbn `index.html` (dobbeltklik). Vælg i menuen med **↑ ↓** og **ENTER** (eller klik):

- **▶ Spil** – klodserne falder hurtigere for hvert niveau (hver 8. række). Du har **3 hjerter**. Når bunken når skyen, forsvinder et hjerte, og en regnbue rydder pladen, så du kan spille videre.
- **☁ Rolig leg** – klodserne falder langsomt hele tiden, og du kan ikke tabe. Regnbuen rydder bare op.

## Taster
| Tast | Hvad |
|---|---|
| ← → (eller A D) | flyt klodsen |
| ↑ (eller W / X) | drej med uret |
| Z | drej mod uret |
| ↓ (eller S) | fald hurtigere |
| MELLEMRUM | bum – klodsen falder helt ned |
| P | pause |
| M | lyd til/fra |
| ESC | tilbage til menuen |

Den stiplede skygge viser, hvor klodsen lander.

## Klodserne
Der er ni former: små 3-klodser (pind og hjørne) og 4-klodser (stang, kasse, top, slange, orm, støvle, krog). De trækkes fra en "pose", så alle former kommer jævnligt.

Hver 13. klods er en **stjernebombe** 💣⭐ – når den lander, sprænger den klodserne i et felt på 5 × 3 væk.

## Point
| | Point |
|---|---|
| 1 række | 100 × niveau |
| 2 rækker | 300 × niveau |
| 3 rækker | 500 × niveau |
| 4 rækker | 800 × niveau |
| klods sprængt af bomben | 25 |
| MELLEMRUM-fald | 2 pr. felt |
| ↓-fald | 1 pr. felt |

Bedste score gemmes i browseren (`klodsregn-highscore`).

## Skru på spillet
I `js/main.js`:
- `LINES_PER_LEVEL` – hvor mange rækker der skal til et nyt niveau.
- `BOMB_EVERY` – hvor tit stjernebomben kommer.
- `interval()` – hvor hurtigt klodserne falder (sekunder pr. felt).
- `COLS`, `ROWS` – pladens størrelse.

I `js/pieces.js` kan du lave nye former eller skifte farver.

## Filer
- `js/input.js` – tastatur
- `js/sound.js` – lyde lavet med Web Audio
- `js/pieces.js` – formerne og drejning
- `js/draw.js` – klodser med ansigter, skyen, bomben, hjerter
- `js/main.js` – spillets regler, skærme og game loop
