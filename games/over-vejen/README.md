# Over Vejen – hjælp ællingen hjem

En lille ælling skal over vejen og hjem til mor and i søen. Spillet øver at **forudsige trafikken**: hvor kommer bilerne fra, hvor hurtigt kører de, og hvornår er der et hul, så man kan nå over?

Ingen bliver kørt over. Kommer en bil for tæt på, dytter den, og ællingen flagrer forskrækket tilbage til fortovet (»Hov!«). Bagefter får man et lille tip om, hvad man kan gøre næste gang.

## Sådan spiller du
Over Vejen er en del af [Spilleparken](../../README.md). Vælg spillet i parken, eller åbn denne mappes `index.html` direkte i en browser (dobbeltklik). Fra roden af repoet kan du også starte en lille server:

```bash
python -m http.server 8130
```

og gå til http://localhost:8130/games/over-vejen/ – 🏠-knappen i hjørnet fører tilbage til parken.

| Tast | Hvad den gør |
|---|---|
| ← → ↑ ↓ (eller WASD) | hop ét felt (hold for at blive ved) |
| H | kig-hjælp til/fra |
| P | pause |
| M | lyd til/fra |
| ESC | tilbage til menuen |

Man kan også klikke eller trykke på skærmen ved siden af ællingen for at hoppe i den retning.

I menuen vælger **↑ ↓** sværhedsgrad og **← →** banen (du låser nye baner op ved at klare dem). MELLEMRUM eller ENTER starter.

## Sværhedsgrader
- **Let**: bilerne kører lidt langsommere med større huller, lyset er længere grønt for ællingen, og **kig-hjælpen** er slået til.
- **Normal**: rigtig fart. Kig-hjælpen kan stadig slås til med H.

**Kig-hjælpen** tegner et stiplet »spøgelse« af hvert køretøj der, hvor det er om et sekund. Så kan man se, om bilen når frem, før man er hoppet over.

## Det lærer man
- Pilene på vejen viser, hvilken vej bilerne kører. I den nærmeste bane kommer bilerne fra **venstre**, i den fjerne fra **højre** – derfor »kig til venstre, til højre og til venstre igen«.
- Busser og lastbiler er lange: vent til hele køretøjet er kørt forbi.
- Cykler kører også – kig efter dem på cykelstien.
- Ved **fodgængerfeltet** er der lys. Når anden lyser grønt (og feltet gløder grønt), holder bilerne stille, og det tikker ligesom ved et rigtigt lyskryds.
- Når ællingen står ved vejkanten og venter, kigger den selv til begge sider.

## Baner
1. Den stille vej · 2. To veje · 3. Bussen kommer · 4. Fodgængerfeltet · 5. Cykelstien · 6. Myldretid · 7. Lastbilerne · 8. Det store lyskryds · 9. Isbilen · 10. Den store vej

## Point og stjerner
- Hvert nyt felt fremad: **+10**
- Majskorn: **+50** (der er 3 på hver bane)
- Hjemme hos mor: **+200** plus **100 pr. stjerne**
- Stjerner: ★★★ uden »Hov!«, ★★ med 1–2, ★ ellers. Den bedste stjerne-score pr. bane huskes.

## Sådan ændrer du spillet
- **Baner**: `js/levels.js`. Hver bane har 10 rækker (`P` sø, `G` græs, `S` fortov, `R(...)` kørebane, `B(...)` cykelsti). `R(retning, fart, typer, [mindste, største hul])`, fx `R(-1, 2.0, ['bil', 'bus'])`. `light: { col, green, red }` giver et fodgængerfelt med lys.
- **Køretøjer**: `KINDS` i `js/world.js` (længde, bredde, fart, navn i tips).
- **Kig-hjælpens tid**: `GHOST_TIME` i `js/draw.js`.
- **Hop-fart**: `HOP_TIME` i `js/duck.js`.

Rekord, låste baner og stjerner gemmes i browserens `localStorage` (`overvejen-*`).
