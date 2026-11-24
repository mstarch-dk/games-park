# Guldtoget 🚆

Kør det lille guldtog gennem landet til **Guldbanken**. Når et tog kommer brusende imod dig, skal du skifte spor ved skiftesporet – i sidste øjeblik suser det forbi. Saml guldsækkene undervejs!

En del af [Spilleparken](../../README.md).

## Sådan spiller du

| Tast | Hvad |
|---|---|
| ← → | Vælg hvilken vej dit næste skiftespor skal gå (pilen over toget viser det) |
| ↑ / ↓ | Ligeud igen |
| MELLEMRUM | Dyt! Så går køerne væk fra sporet |
| P | Pause |
| M | Lyd til/fra |
| V | Skift kamera: 45° oppefra eller lavere bagfra |
| ESC | Tilbage til menuen |

Med mus/touch: tryk i venstre eller højre tredjedel for at vælge retning, i midten for at dytte.

- Toget kører selv. Du bestemmer kun, hvilket spor du vil over på.
- **Pilene på skinnerne** foran dig viser, hvor dit næste skifte kan føre hen – den gule pil er den, du har valgt.
- **Et rødt "!"** langt ude betyder, at et tog er på vej imod dig.
- **Køer** 🐄 kan du enten køre udenom eller dytte væk.
- **Dobbelt-tog** (bane 6 og frem): to tog på én gang – kun den ene vej er fri.
- Rammer du noget, siger det BONK, og du mister to guldsække og et hjerte. Tre hjerter pr. bane.

**Let** (standard) viser en blinkende hjælpe-pil, når du skal skifte. **Normal** er lidt hurtigere og uden hjælp.

## Point

| | Point |
|---|---|
| Guldsæk | 50 |
| Diamant 💎 | 250 |
| Tog suser lige forbi dig | 25 |
| Ko dyttet væk | 10 |
| Bane klaret | 200 + 100 pr. stjerne (+150 uden bump) |

Stjerner efter hvor mange af banens guldsække, du får hjem: 3 ★ for mindst 55 %, 2 ★ for mindst 30 %.

## Banerne bygges, mens du kører

Der er 8 baner (3, 4 og til sidst 5 spor), men de er aldrig ens: `js/director.js` – "instruktøren" – bygger banen løbende ud fra, hvilket spor du rent faktisk kører i. To regler gælder altid:

1. **Banen kan altid gennemføres.** Hver forhindring sættes lige efter et skiftespor, hvor der er en fri udvej, og der er kun én udfordring ad gangen.
2. **Det er altid "lige akkurat".** Et modkørende tog startes langt ude med præcis den position, der får det til at nå skiftesporet *netop* et øjeblik (`margin`) efter, at din sidste vogn er kørt ud af sporet. Bliver du stående, støder du sammen; skifter du, suser det forbi.

Hver udfordring tjekkes, før den sættes ind, med en lille "spøgelses-kørsel" (bliv i sporet ⇒ sammenstød, tag udvejen ⇒ fri bane). Fejler tjekket, bliver udfordringen droppet.

### Test-autopilot

- `index.html?autopilot` – kører alle baner selv og tager altid udvejen (skal give 0 bump).
- `index.html?autopilot=late` – trykker først lige efter skiftet (tester den lille ekstra tid, man har).
- `index.html?autopilot=stay` – skifter aldrig (alle forhindringer skal ramme).
- Tilføj `&fast=8` for at køre 8 gange hurtigere. Resultater står nederst på skærmen og i konsollen.

## Justér spillet

- `js/levels.js` – banernes fart, længde, antal spor, hvor tæt det er ("margin"), varsel og blandingen af udfordringer.
- `js/track.js` – mål på tog og spor, hvor langt man kan se, og hvor sent et tryk må komme (`GRACE`).
- `js/camera.js` – de to kameravinkler.
