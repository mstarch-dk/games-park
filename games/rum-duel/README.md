# Rum-Duel – rumskibsspil med ægte rumfysik

Styr et rumskib rundt i et lille felt, der hænger sammen i kanterne: flyver du ud til venstre, kommer du ind igen til højre. Der er ingen luft i rummet, så skibet glider videre når du slipper speederen – og planeten i midten trækker i alt med sin tyngdekraft.

## Sådan spiller du
Rum-Duel er en del af [Spilleparken](../../README.md). Vælg spillet i parken, eller åbn denne mappes `index.html` direkte i en browser (dobbeltklik). Fra roden af repoet kan du også starte en lille server:

```bash
python -m http.server 8130
```

og gå til http://localhost:8130/games/rum-duel/ – 🏠-knappen i hjørnet fører tilbage til parken.

## Spilformer
| Spilform | Spillere | Hvad sker der |
|---|---|---|
| **Duel** | 2 | Mod hinanden på samme tastatur. Først til 3 vundne runder. Nyt skib mellem runderne. |
| **Duel mod computeren** | 1 | Mod en computer-pilot (Let, Mellem eller Svær – vælg med ← → i menuen). |
| **Bølger** | 1 | Fjende-bølger der bliver sværere. Hver 5. bølge kommer en **rumbase**. |
| **Samarbejde** | 2 | Som Bølger, men to spillere sammen. Bliver man skudt ned, kommer man tilbage efter 3 sekunder. |

## Taster
| | Én spiller | Spiller 1 | Spiller 2 |
|---|---|---|---|
| Drej | ← → | A D | ← → |
| Speeder (thrust) | ↑ | W | ↑ |
| Skyd | MELLEMRUM | F | L (eller Numpad 0) |
| Special | ↓ | G | ↓ |

P pause · M lyd til/fra · V fartpil til/fra · ESC menu

**Fartpilen** (grøn, stiplet) viser hvor skibet *flyver hen*. Den gule bue viser hvor *næsen peger*. De peger tit forskellige veje – det er det, der er rumfysik!

Nogle tastaturer kan ikke mærke mange taster på én gang. Hvis et skib "går i stå" når begge spillere trykker meget, så prøv Numpad 0 i stedet for L.

## De seks rumskibe
| Skib | Godt | Svært | Special |
|---|---|---|---|
| ⚡ **Lynet** | Hurtigst, laser der skyder hurtigt | Tåler ikke ret meget | Turbo |
| 🛡 **Kampbøffen** | Tåler meget, store kanonkugler (med rekyl!) | Langsom, drejer tungt | Skjold i 2 sek. |
| 🛸 **Snurretoppen** | Drejer lynhurtigt | Kort rækkevidde | Stjerne-ring hele vejen rundt |
| 🐙 **Blæksprutten** | Tre bobler i en vifte | Ikke så hurtig | Blæksky der skjuler og bremser fjendens skud |
| 🐷 **Rumgrisen** | Miner bag sig der jager fjenden | Ingen kanon fremad | PRUT! – fart fremad og giftsky bagud |
| 🦈 **Hajen** | Målsøgende missiler | Skyder ikke så tit | BID! – turbo med kæmpe bid |

Special koster energi (den blå bjælke), som lader op af sig selv.

## Bølger og rumbasen
- Øje-droner, jægere og mine-krabber kommer i stigende antal.
- Rumbasen har fire tårne. Skyd dem ned for at fjerne skjoldet, og skyd så på det store øje.
- Fjender taber nogle gange en **reparations-pakke** (grøn) eller **energi** (lyn).
- Hver bølge giver bonus, og for hver 10.000 point får alle et ekstra liv.

## Lav om på spillet
- Skibenes tal (fart, hitpoints, våben) står øverst i hvert skib i [js/ships.js](js/ships.js).
- Tyngdekraften styres af `GRAVITY_GM` i [js/planet.js](js/planet.js).
- Feltets størrelse er `WORLD` i [js/vec.js](js/vec.js).
- Computerens sværhedsgrader står i [js/ai.js](js/ai.js).
