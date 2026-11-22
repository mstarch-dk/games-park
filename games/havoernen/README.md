# Havørnen – kaperfart i de danske farvande

Du er kaptajn på kaperskibet *Havørnen*. Sejl rundt i Kattegat, Øresund, Bælterne og Østersøen, opbring fremmede handelsskibe, jag sørøvere – og tjen en formue, så du kan stige i rang fra skibsdreng til admiral.

Skibet sejler efter vinden, og kanonerne skal sigtes: hvor højt de peger, hvordan vinden skubber kuglerne, og hvor meget skibet krænger, afgør hvor kuglerne lander.

## Sådan spiller du
Havørnen er en del af [Spilleparken](../../README.md). Vælg spillet i parken, eller åbn denne mappes `index.html` direkte i en browser (dobbeltklik). Fra roden af repoet kan du også starte en lille server:

```bash
python -m http.server 8130
```

og gå til http://localhost:8130/games/havoernen/ – 🏠-knappen i hjørnet fører tilbage til parken.

| Tast | Hvad den gør |
|---|---|
| ← → | drej skibet (ror) |
| ↑ ↓ | sæt flere sejl / tag sejl ned (nede, halve, fulde) |
| W S | hæv / sænk kanonerne (2°–30°) |
| A (eller Z) | skyd en bredside til venstre (bagbord) |
| D (eller X) | skyd en bredside til højre (styrbord) |
| MELLEMRUM | skyd til begge sider |
| ENTER | entr et skib, der har overgivet sig / gå i havn |
| K (eller TAB) | stort kort |
| H | sigtehjælp til/fra |
| P | pause (Q i pausen gemmer og går til menuen) |
| M | lyd til/fra |
| ESC | gem og gå til menuen |

## Vinden
- Vindrosen nederst til venstre viser hvor vinden kommer fra, og hvor dit skib peger (den gule pil).
- I det **røde felt** er du *i vindøjet* – sejlene blafrer, og skibet står næsten stille. Drej væk fra vinden!
- I det **grønne felt** har du *halvvind* (vinden ind fra siden) – det er hurtigst. Bidevind, slør og læns er lidt langsommere.
- Vinden drejer og skifter styrke engang imellem.

## Kanonerne
- Panelet forneden viser skibet set bagfra og hvor højt kanonerne peger på hver side.
- Højere hældning = længere skud (men kuglen er længere tid undervejs).
- Vinden skubber kuglerne, og skibets egen fart følger med kuglen.
- Når vinden presser på sejlene, **krænger** skibet: kanonerne i læ (siden vinden blæser hen mod) peger lavere, og kanonerne i luv peger højere.
- Den stiplede bue (orange til venstre, blå til højre) viser, hvor kuglerne lander med det hele regnet med. Den kan slås fra med H for en større udfordring.

## Skibene
| Flag | Skib | Hvad gør du? |
|---|---|---|
| Grønt med gul sol | Fremmed handelsskib | Du har kaperbrev: skyd til det stryger flaget, og entr det. Lasten er 90–200 rd værd. |
| Sort med dødningehoved | Sørøverskib | Skyder igen! Entr det for skat + dusør, eller sænk det for en mindre dusør. |
| Grønt (stort skib, 3 master) | Fremmed fregat | Dukker op fra rangen *Styrmand*. Stærk, men 500–800 rd værd. |
| Dannebrog | Dansk handelsskib | Lad det være! Skud på danske skibe giver bøde. |

Et skib, der har overgivet sig, hejser hvidt flag. Sejl helt hen til det og tryk ENTER. Bagefter sejler prisemandskabet det i havn. Sænker du et handelsskib, går lasten tabt – så skyd ikke mere end nødvendigt.

## Havnene
København, Helsingør, Aarhus, Frederikshavn, Nyborg, Svendborg og Esbjerg. Sejl ind i den stiplede ring og tryk ENTER:
- **Sælg lasten** – først her bliver lasten til penge i pengekisten.
- **Reparer skibet** – 2 rd pr. skade (er du helt flad, lapper tømrerne gratis op til det halve).
- **Forbedringer** – flere kanoner, stærkere skrog, større sejl, bedre krudt og øvet kanonmandskab.

Spillet gemmes hver gang du er i havn og når du går til menuen.

## Rang
Skibsdreng → Matros (250 rd) → Bådsmand (700) → Styrmand (1.500) → Kaptajn (2.800) → Kommandør (4.500) → Admiral (7.000). Rangen følger hvor mange penge du har tjent i alt. Jo højere rang, jo flere sørøvere og fregatter – og de sigter bedre.

Bliver Havørnen skudt i sænk, er det ikke slut: besætningen reddes, og skibet slæbes til nærmeste havn. Kun lasten går tabt – pengene i pengekisten er i sikkerhed.

## Tilpas spillet
- `js/cannon.js` – `BALL`: mundingsfart, tyngde, hvor meget vinden skubber kuglerne og min./maks. hældning.
- `js/ship.js` – `SHIP_TYPES`: fart, skrog, kanoner, ladetid og hvornår skibene overgiver sig (`surrender`) og hvad de er værd (`reward`).
- `js/wind.js` – `sailFactor()`: hvor hurtigt skibet sejler i forhold til vinden.
- `js/harbor.js` – `UPGRADES`: forbedringer og priser.
- `js/main.js` – `RANKS` (rang og beløb), `ZOOM` (kameraets afstand) og `manageSpawns()` (hvor mange skibe der er på havet).
- `js/map.js` – kysterne, havnene og sejlruterne (i længde- og breddegrader).

Spillet gemmer i `localStorage` under nøglen `havoernen-save`.
