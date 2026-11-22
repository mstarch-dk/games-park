# 🌍 Gæt et Land

Et geografispil med alle verdens lande. Man får et lands **omrids**, **flag** og nogle **ledetråde** – og så skal man klikke på verdenskortet, hvor man tror landet ligger. Jo tættere man rammer, jo flere point. Bagefter kan man trykke **📖 Vis mere om landet** og få et fakta-ark med hovedstad, indbyggere, størrelse, sprog, penge, naboer og sjove fakta.

Del af [Spilleparken](../../README.md). Åbn `index.html` med dobbeltklik. Det virker uden internet.

## Sådan spiller man
1. Vælg sværhedsgrad, verdensdel og hvor mange lande der skal være med, og tryk **▶ Start**.
2. Kig på omridset, flaget og ledetrådene. Tryk **💡 Ny ledetråd**, hvis du vil have hjælp.
3. Klik på kortet, hvor landet ligger. Der kommer en nål. Tryk **📍 Gæt!**.
4. Landet lyser op på kortet, og du kan se, hvor langt du var fra det.

Et spil er 10 lande. Til sidst ser du alle landene igen og kan trykke på dem for at læse mere.

### Sværhedsgrader
| | Hvad man får |
|---|---|
| 🐣 **Let** | Landets navn, flag og omrids – find det på kortet. Ledetråde er gratis. |
| 🦊 **Normal** | Omrids, flag og én ledetråd. |
| 🦅 **Svær** | Kun omridset. |

Ledetrådene kommer i rækkefølge fra svær til let: fakta om landet, flaget, verdensdelen, nabolandene og til sidst hovedstadens forbogstav.

### Point og stjerner
- Afstanden måles fra nålen til **nærmeste sted i landet** (0 km hvis nålen er inde i landet).
- Inden for 150 km tæller som fuldt hit: ⭐⭐⭐ og alle point. Under 1.000 km giver ⭐⭐, under 3.000 km ⭐.
- Man kan højst få 1.000 point pr. land. På Normal og Svær koster hver ekstra ledetråd 100 point (man får altid mindst 400 for et hit).
- Lande man har fundet med mindst ⭐⭐, tælles med i »Du har fundet X af 199 lande«. Nye spil vælger mest lande, man ikke har fundet endnu.

### Opdag verden
Kortet uden opgaver: hold musen over et land for at se navnet, og klik for at åbne dets fakta-ark. Med **◀ Forrige / Næste ▶** kan man bladre gennem alle lande.

## Styring
**Mus/finger:** klik = sæt nål · træk = flyt kortet · hjul eller knib = zoom · knapperne + − 🌐.

| Tast | Hvad |
|---|---|
| Piletaster | flyt kortet |
| + / − | zoom |
| 0 | hele verden (eller verdensdelen) |
| MELLEMRUM | sæt nålen midt på kortet (ved sigtekornet) |
| ENTER | gæt / næste land |
| H | ny ledetråd |
| F | vis mere om landet |
| M | lyd til/fra |
| ESC | luk fakta-ark / tilbage til menuen |

## Hvilke lande?
De 193 FN-lande plus Vatikanstaten, Palæstina, Kosovo og Taiwan – og Grønland og Færøerne fra Rigsfællesskabet. I alt 199. Hvert land er mærket som »kendt«, »mellem« eller »svært«, så man kan starte med de kendte lande.

## Gemt i browseren
`gaetetland-opts` (valg i menuen), `gaetetland-best` (bedste point pr. sværhedsgrad), `gaetetland-found` (fundne lande) og `gaetetland-muted`.

## Tilpas spillet
- **Fakta og ledetråde**: `js/data/countries.js` – én linje pr. land. Felterne `clues` (4 ledetråde, sværest først – de må ikke nævne landets navn), `facts` (fakta-arket), `hello`, `food`, `animal`, `cap`, `pop` (mio.) og `tier` (1 kendt, 2 mellem, 3 svær). Ret direkte i filen.
- **Point**: `scoreFor` og `starsFor` i `js/main.js`. Antal lande pr. spil: `ROUNDS`.
- **Ledetrådenes rækkefølge**: `buildSteps` i `js/main.js`.
- **Farver**: `PALETTE` i `js/map.js`, resten i `style.css`. Lyde: `js/sound.js`.

Filer: `geo.js` (omrids, klik og afstande), `map.js` (verdenskortet), `outline.js` (omrids-tegning), `sheet.js` (fakta-arket), `main.js` (spillet), `data/` (kort og lande), `flags/` (flag).

## Datakilder
- Kort: [Natural Earth](https://www.naturalearthdata.com/) (public domain) via `world-atlas`.
- Grunddata (areal, sprog, valuta, naboer): `world-countries` (ODbL). Danske landenavne fra Unicode CLDR.
- Flag: [flag-icons](https://github.com/lipis/flag-icons) (MIT).
- Ledetråde og fakta er skrevet til spillet.

`tools/build-data.js` genskaber `js/data/` og `flags/` fra kilderne (se kommentaren øverst i filen). Det er kun nødvendigt, hvis kortet skal laves om – fakta rettes direkte i `countries.js`.
