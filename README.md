# Abe-Hop – det store tønde-eventyr

Et platformspil hvor en abe hopper over tønder og flygter fra bomber gennem 8 baner.

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
- Guld-banan: **+250** og tæller som 5 bananer
- Lige uden for en bombes farezone, når den springer (PÅ ET HÅR!): **+300**
- Tønde eller kanon ramt af en bombe: **+150**
- Bane klaret: **+1000** + hurtig-bonus + banan-bonus

## Bombeflyet
Engang imellem lyder sirenen, og et komisk stort bombefly kommer forbi og smider en bombe.
- Bomben springer efter 3-5 sekunder. Den røde ring viser farezonen, og en eksplosion koster et liv.
- Aben får **super-energi**, når bomben falder: den løber hurtigere og hopper meget højere og længere.
- Brug kræfterne til at flygte, eller til at nå **guld-bananerne** højt oppe.
- Hop på bomben for at sparke den væk. Eksplosionen smadrer tønder og slår kanoner ud i 8 sekunder.

## Power-ups
- 🔨 **Hammer** – smadrer tønder i 10 sekunder
- ⭐ **Stjerne** – uovervindelig i 8 sekunder
- 🪶 **Fjer** – dobbelthop resten af banen

## Byg dine egne baner
Banerne er tegnet med bogstaver i [js/levels.js](js/levels.js). Øverst i filen står hvad hvert tegn betyder, og hvordan bombeflyet indstilles på hver bane.
