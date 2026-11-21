# 🏰 Kongens Ridder

Året er 1523. Kong Christian II er drevet i landflygtighed, og tre grådige herrer har delt Danmark mellem sig. Du er en af kongens sidste tro riddere: saml riget land for land – med hære, katapulter, turneringer og dristige togter – så kongen kan vende hjem.

Et turbaseret strategispil i stil med de gamle "film-agtige" ridderspil fra 80'erne, men med nutidig, blød vektorgrafik. Alle personer undtagen kongen er opdigtede.

Del af [Spilleparken](../../README.md). Åbn `index.html` med dobbeltklik – det virker uden internet.

## Sådan spiller man
Vælg en af fire riddere. De er gode til forskellige ting:

| Evne | Bruges til |
|---|---|
| **Lederskab** | slag – hvor hårdt din hær slår |
| **Lanse** | turneringer – hvor roligt lansen ligger |
| **Sværd** | fægtning – hvor lang tid du har til at parere |

Hver **sæson** (forår, sommer, efterår, vinter) får du guld fra dine områder. Vinteren giver mindre.

1. **Køb og byg** så meget du har råd til (K):

   | | Pris | |
   |---|---|---|
   | 5 fodfolk | 8 | styrke 1 hver |
   | 1 ridder | 6 | styrke 3 |
   | 1 katapult | 14 | skal bruges til belejring |
   | Borg (+1 mur) | 22 | gør området svært at erobre |
   | Gård | 10 | +1 guld pr. sæson |
   | Marked | 18 | +2 guld pr. sæson |

2. **March** én gang pr. sæson gennem dine egne lande (H) – og flyt vagter ind og ud af garnisonen (G/F).
3. Vælg **én stor handling**, som afslutter sæsonen:
   - **Erobr** et naboområde (de stiplede). Har det en borg, skal muren først skydes i stykker med katapult.
   - **Togt** (T): snig dig ind i en herres borg og fægt – for guld, eller for at befri prinsessen.
   - **Turnering** (R) i Roskilde, når den er udråbt: rid om ære og guld, eller om land.
   - **Slut sæson** (S).

Bagefter trækker de tre herrer. De angriber hinanden – og dig. Står din hær i det angrebne område, kæmper du selv.

**Du vinder**, når alle 15 områder er dine. **Du taber**, hvis din hjemborg falder.

Pas på: områder uden garnison kan gøre **oprør**. Og når prinsessen er bortført, har du kun 10 sæsoner til at befri hende.

## Taster
| | |
|---|---|
| Kortet | mus, eller **← → ↑ ↓** vælg område · **ENTER** angrib/march · bogstaverne på knapperne |
| Slag | **1–4** vælg taktik (Angreb, Stå fast, Bombardér, Tilbagetog) |
| Belejring | **↑ ↓** kraft · **← →** sten eller ildkrukke · **MELLEMRUM** kast |
| Turnering | **← → ↑ ↓** sigt på skjoldet · **hold MELLEMRUM** lige før stødet |
| Fægtning | **↑** højt hug · **→** stød · **↓** lavt hug · **←** parér |

**P** pause · **M** lyd til/fra · **ESC** menu. Spillet gemmes automatisk hver sæson i browseren (`kongensridder-save`), så du kan trykke **Fortsæt** en anden dag.

## Tips
- Fægtning: se hvor modstanderen holder sværdet – og hug et **andet** sted. Når han trækker sværdet tilbage, så parér med **←**.
- Belejring: muren skal ned under 60 %. Om natten lapper forsvarerne den, så skyd hurtigt. Sten, der flyver over muren, rammer forsvarerne.
- Turnering: holder du lansen sænket for længe, bliver armen træt og lansen svajer.

## Tilpas spillet
- Priser: `SHOP` i `js/economy.js`.
- Områder, indtægter og naboer: `js/map-data.js`.
- Helte og herrer: `js/factions.js`.
- Sværhedsgrad: herrernes mod i `js/ai.js` (`aggression`), belejringen i `js/siege.js` (`BREACH`, antal kast).
- Start i en bestemt minigame: åbn `index.html?debug=1` og tryk **7** (belejring), **8** (turnering) eller **9** (fægtning) på titelskærmen.

## Egne malede baggrunde (valgfrit)
Al grafik tegnes i kode. Vil du have malede baggrunde, så læg et billede på **960×600** i `img/` med et af navnene nedenfor, og skriv navnet i listen i `img/billeder.js`. Spillet tegner så kun figurerne ovenpå.

Forslag til billed-prompts (alle: *"bløde farver, eventyrlig malet stil, ingen tekst, ingen personer i forgrunden, 16:10"*):

| Fil | Prompt |
|---|---|
| `title.png` | Eventyrborg på en bakke ved solnedgang, Danmark i middelalderen, lilla og orange himmel |
| `map.png` | Gammelt pergament-søkort med blåt hav og bølger, kompasrose øverst til venstre, lyst pergament i højre tredjedel |
| `battle.png` | Grøn eng med skovbryn og blå himmel, plads til to hære i midten |
| `siege.png` | Grønne bakker i skumringen, en bakke til højre hvor en borg kan stå |
| `joust.png` | Tumleplads med sand og stribede tribuner fyldt med publikum, set fra rytterens øjenhøjde |
| `hall.png` | Stor stensal i en borg med buede vinduer, vægtæpper og flisegulv |
| `princess.png` | Tårnkammer om natten med stort buet vindue, måne og røde gardiner |
| `coronation.png` | Middelalderby og havn ved solnedgang, roligt hav |
