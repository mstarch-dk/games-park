# Abe-Hop – det store tønde-eventyr

Et platformspil hvor en abe hopper over tønder gennem 5 baner.

## Sådan spiller du
Åbn `index.html` i en browser (dobbeltklik), eller start en lille server:

```bash
python -m http.server 8123
```

og gå til http://localhost:8123

| Tast | Hvad den gør |
|---|---|
| ← → | løb |
| ↑ eller MELLEMRUM | hop (hold for at hoppe højere) |
| P | pause |
| M | lyd til/fra |

## Point
- Hop over en tønde: **+100**
- Hop oven på en tønde (BOING!): **+50**
- Smadr en tønde med hammer: **+300** (med stjerne: **+500**)
- Banan: **+10** – 50 bananer giver et ekstra liv
- Bane klaret: **+1000** + hurtig-bonus + banan-bonus

## Power-ups
- 🔨 **Hammer** – smadrer tønder i 10 sekunder
- ⭐ **Stjerne** – uovervindelig i 8 sekunder
- 🪶 **Fjer** – dobbelthop resten af banen

## Byg dine egne baner
Banerne er tegnet med bogstaver i [js/levels.js](js/levels.js). Øverst i filen står hvad hvert tegn betyder.
