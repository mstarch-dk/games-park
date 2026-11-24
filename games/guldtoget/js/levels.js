// Banerne. Hver gang en bane spilles, bygger instruktøren (director.js) den på ny med et nyt tilfældigt frø.
//   lanes    antal parallelle spor
//   speed    dit togs fart (m/s) – den er fast, så instruktøren kan regne præcist
//   onSpeed  de modkørende togs fart (m/s)
//   len      banens længde i meter (stationen ligger for enden)
//   gap      afstand mellem skiftepunkter [min, max] (m)
//   calm     ro efter en udfordring (m) før den næste må komme
//   margin   sekunder fra din sidste vogn er ude af sporet, til det modkørende tog suser forbi ("lige akkurat")
//   warn     mindste varsel (s) fra en forhindring dukker op til skiftet
//   mix      vægte for udfordringer: train (ét tog), double (to tog – kun én vej er fri), cow (ko på sporet)
//   doubleP  ekstra chance for skiftepunkter med krydsning til begge sider
//   gemP     chance for at en guld-gruppe i stedet er en diamant
const LEVELS = [
  {
    name: 'Første tur', lanes: 3, speed: 12, onSpeed: 14, len: 850, gap: [62, 80], calm: 30,
    margin: 0.55, warn: 2.8, mix: { train: 1 }, doubleP: 0, gemP: 0,
    tip: 'Et tog kommer imod dig! Tryk ← eller → før skiftesporet – så kører du over på et andet spor.',
  },
  {
    name: 'Ned i dalen', lanes: 3, speed: 13, onSpeed: 15, len: 950, gap: [58, 76], calm: 22,
    margin: 0.5, warn: 2.6, mix: { train: 1 }, doubleP: 0.1, gemP: 0,
    tip: 'Pilene på skinnerne viser, hvor dit næste skiftespor fører hen. Saml guldsækkene!',
  },
  {
    name: 'Ko-engen', lanes: 3, speed: 14, onSpeed: 16, len: 1050, gap: [56, 72], calm: 18,
    margin: 0.5, warn: 2.4, mix: { train: 2, cow: 1.3 }, doubleP: 0.1, gemP: 0,
    tip: 'Køer på sporet! Skift spor – eller dyt med MELLEMRUM, så går koen sin vej.',
  },
  {
    name: 'Fire spor', lanes: 4, speed: 15, onSpeed: 17, len: 1150, gap: [54, 70], calm: 16,
    margin: 0.46, warn: 2.3, mix: { train: 3, cow: 1 }, doubleP: 0.15, gemP: 0.04,
    tip: 'Nu er der fire spor. Hold øje med, hvor skiftesporene er!',
  },
  {
    name: 'Skovbanen', lanes: 4, speed: 16, onSpeed: 18, len: 1250, gap: [52, 68], calm: 14,
    margin: 0.43, warn: 2.2, mix: { train: 3, cow: 1 }, doubleP: 0.2, gemP: 0.09,
    tip: 'Diamanter giver mange point – men de ligger tit på et andet spor end dit.',
  },
  {
    name: 'Dobbelt op', lanes: 4, speed: 16, onSpeed: 19, len: 1300, gap: [52, 66], calm: 14,
    margin: 0.43, warn: 2.2, mix: { train: 2, double: 2.5, cow: 1 }, doubleP: 0.75, gemP: 0.06,
    tip: 'To tog på én gang! Kun den ene vej er fri – se godt efter, før du skifter.',
  },
  {
    name: 'Fem spor', lanes: 5, speed: 18, onSpeed: 20, len: 1450, gap: [50, 64], calm: 12,
    margin: 0.4, warn: 2.0, mix: { train: 3, double: 2, cow: 1 }, doubleP: 0.45, gemP: 0.08,
    tip: 'Fem spor og fuld fart. Du kan godt!',
  },
  {
    name: 'Guldbanken', lanes: 5, speed: 20, onSpeed: 21, len: 1600, gap: [50, 62], calm: 10,
    margin: 0.37, warn: 1.9, mix: { train: 3, double: 3, cow: 1 }, doubleP: 0.5, gemP: 0.1,
    tip: 'Sidste tur! Kør guldet sikkert hjem til Guldbanken.',
  },
];
