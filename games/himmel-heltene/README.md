# ✈️ Himmel-Heltene

Flyv et lille propelfly hen over havet, skyd de gnavne fjendefly ned – og se piloterne hoppe ud i faldskærm og vinke farvel. Fang power-ups, så skuddene bliver vildere, og besejr Brumle-Zeppelineren i slutningen af hver bane. Alene eller to sammen.

Del af [Spilleparken](../../README.md). Åbn `index.html` med dobbeltklik – det virker uden internet.

## Taster
| | 1 spiller | Spiller 1 (rød) | Spiller 2 (blå) |
|---|---|---|---|
| Flyv | ← → ↑ ↓ (eller WASD) | W A S D | ← → ↑ ↓ |
| Skyd (hold nede) | MELLEMRUM | F | L |
| Venne-fly | B (eller ENTER) | G | K |

**P** pause · **M** lyd til/fra · **ESC** tilbage til menuen. På titelskærmen vælger du 1 eller 2 spillere med piletasterne (eller tryk 1 / 2).

## Sådan spiller man
- Hvert fly har **5 hjerter**. Bliver du ramt, blinker flyet et øjeblik, og så kan du ikke blive ramt igen lige med det samme.
- Når hjerterne er brugt, hopper din pilot ud i faldskærm, og et **reservefly** kommer flyvende. I starter med 3 reservefly og får ét mere for hver 20.000 point.
- Med 2 spillere deler I reserveflyene. Er de brugt, kommer der en **redningskrans** – fanger makkeren den, er du med igen.
- Røde fly med en gul ring har en gave med: skyd dem, og de taber et power-up.

## Power-ups
| | |
|---|---|
| ⭐ **P** | Bedre skud – 5 niveauer: enkelt, dobbelt, spredning, bred og til sidst **regnbueskud**. Man mister ét niveau når flyet skydes ned. |
| ❤️ Hjerte | +2 hjerter |
| 🛡️ Skjold | 8 sekunder hvor intet kan ramme dig |
| 🧲 Magnet | Trækker mønterne hen til dig |
| ✈️ Venne-fly | +1 venne-eskadrille (max 5) |
| 🛟 Redningskrans | Bringer makkeren tilbage (kun 2 spillere) |

**Venne-eskadrillen**: tre venlige fly suser hen over skærmen, alle fjendeskud bliver til stjerner, og alle fjender får et ordentligt skud.

## Point
| | |
|---|---|
| Småfly | 100 |
| Dykker | 150 |
| Ballon (ufarlig – fuld af konfetti!) | 50 |
| Kanonbåd | 400 |
| Bombefly | 800 |
| Hele flokken skudt ned | +500 |
| Mønt / medalje | 50 / 500 |
| Kanontårn på luftskibet | 300 |
| Bane klaret | 5.000 |

Rekorden gemmes i browseren (`himmelheltene-highscore`).

## Banerne
1. **Morgen** – småfly og balloner
2. **Middag** – nu kommer dykkerne og kanonbådene
3. **Solnedgang** – store bombefly
4. **Stormvejr** – regn og lyn
5. **Nat** – det hele på én gang

Efter bane 5 er du en Himmel-Helt – og kan flyve videre i en sværere runde.

## Sådan justerer du spillet
- `js/levels.js`: `LEVEL_LENGTH` (sekunder før bossen kommer), `WAVES` (bølgernes formationer) og `WAVE_POOLS` (hvilke bølger der kommer på hver bane).
- `js/main.js`: `startLevel()` styrer sværheden (`shooterChance`, `bulletSpeed`, `fireMul`, `hpScale`), `START_RESERVES` og `EXTRA_LIFE_EVERY`.
- `js/player.js`: `MAX_HP`, `PLAYER_SPEED`, `WEAPON_RATE` og skud-mønstrene i `shoot()`.
- `js/enemies.js`: fjendernes liv og point i `ENEMY_TYPES`.
- `js/boss.js`: Brumle-Zeppelinerens liv, kanontårne og hvad den siger (`BOSS_WORDS`).
- `js/particles.js`: hvad piloterne råber i faldskærmen (`PARACHUTE_WORDS`).

## Filer
```
index.html, style.css
js/draw.js        lærred og tegnehjælpere
js/input.js       tastatur (1 eller 2 spillere)
js/sound.js       lyde lavet med Web Audio
js/background.js  hav, øer, skyer og vejr
js/particles.js   røg, konfetti, point-tekst og faldskærme
js/bullets.js     skud
js/planes.js      tegning af fly set oppefra
js/player.js      spillernes fly
js/enemies.js     fjender
js/boss.js        Brumle-Zeppelineren
js/pickups.js     power-ups og mønter
js/levels.js      bølger og baner
js/hud.js         point, hjerter osv.
js/menu.js        titel, pause, game over, sejr
js/main.js        spillets regler og game loop
```
