// =====================================================================
//  BANERNE!  Her kan du selv bygge nye baner eller ændre de gamle.
//
//  Hver bane er et kort lavet af tegn. Hvert tegn er én firkant:
//     =  jord / mur                  -  tynd platform (man kan hoppe op igennem den)
//     P  her starter aben            F  målet (den store bananklase)
//     o  banan                       C  checkpoint-flag
//     B  tønde-kanon                 M  bevægelig platform (3 felter bred)
//     H  hammer                      S  stjerne (uovervindelig)
//     W  fjer (dobbelthop)           L  lava       ~  vand
//
//  barrelSpeed = hvor hurtigt tønderne ruller
//  spawnEvery  = hvor mange sekunder der går mellem hver tønde
//  theme       = jungle, beach, volcano, sky eller castle
// =====================================================================
const LEVELS = [
  {
    name: 'Junglen',
    theme: 'jungle',
    barrelSpeed: 110,
    spawnEvery: 4.2,
    map: [
      '                                                                                                              ',
      '                                                                                                              ',
      '                                                                                                              ',
      '                                                                                                              ',
      '                                                                                                              ',
      '                                      o o o                                     o o o                         ',
      '                                     -------                                   -------                        ',
      '            o o o                                    H                                       o o o            ',
      '           -------          o o o       ---        -----           o o o   ---              -----             ',
      '                           -------                                -------                                     ',
      '  P   o o o       o o o              B         o o o      C    o o o              B    o o o       B      F   ',
      '=============================   ============================================   ===============================',
      '=============================   ============================================   ===============================',
    ],
  },
  {
    name: 'Strandbyen',
    theme: 'beach',
    barrelSpeed: 130,
    spawnEvery: 3.6,
    map: [
      '                                                                                                                                  ',
      '                                                                                                                                  ',
      '                                                                                                                                  ',
      '                                                                                                                                  ',
      '                                                                                                                                  ',
      '                            o o o                                 S                                                               ',
      '                           -------                              -----                                                             ',
      '            o o o                       o            o o o                            o o o                                       ',
      '           -------      ---            ---          ----- ---                        -------               H                      ',
      '                                                                                                     --- -----                    ',
      '  P   o o      B           o o o     B            C            o o      B            o o o      B           o o o   B         F   ',
      '=====================   =================   ==============   ===================  ====================   =========================',
      '=====================~~~=================~~~==============~~~===================~~====================~~~=========================',
    ],
  },
  {
    name: 'Vulkanbjerget',
    theme: 'volcano',
    barrelSpeed: 150,
    spawnEvery: 3.1,
    map: [
      '                                                                                                                                  ',
      '                                                                                                                                  ',
      '                                                                                                                                  ',
      '                                                                                                                                  ',
      '                                                 o o o                                                                            ',
      '                                                -------                      S                                                    ',
      '                                                                            ---                                                   ',
      '             o o o                         o o       H                               o o                   o o o                  ',
      '            -------     o      o                   -----                ---                  o o o        -------                 ',
      '                                          M                                         M       -------                               ',
      '  P   o o o        B                 B            C    o o o  B             B              o o          B         o o   B     F   ',
      '========================  ====   ========      ===================   =============        ======   ===========  ==================',
      '========================LL====LLL========LLLLLL===================LLL=============LLLLLLLL======LLL===========LL==================',
    ],
  },
  {
    name: 'Skyerne',
    theme: 'sky',
    barrelSpeed: 140,
    spawnEvery: 3.4,
    map: [
      '                                                                                                                                            ',
      '                                                                                                                                            ',
      '                                                                                                                                            ',
      '                                                                                                                                            ',
      '                                                                                                                                            ',
      '                                                                                     o o o                                                  ',
      '                             o o o                               S                                   o o o                                  ',
      '              o o o                           o o o                                    ---                            o o o                 ',
      '                              ----                             ----                                  ----                                   ',
      '               ---                             ----                                ---                                 ----                 ',
      '  P   W                   B           o o oB               B            C  o o B                 B             H   B            o o o  F    ',
      '=============       ========        =========         =======         ===========           =======         =========         ==============',
      '=============       ========        =========         =======         ===========           =======         =========         ==============',
    ],
  },
  {
    name: 'Bananborgen',
    theme: 'castle',
    barrelSpeed: 175,
    spawnEvery: 2.6,
    map: [
      '                                                                                                                                                      ',
      '                                                                                                                                                      ',
      '                                                                                                                                                      ',
      '                                                                                                                                                      ',
      '                                                                                                                                                      ',
      '                                 o o o                                         o o                                                                    ',
      '                                -------                                       -----                                                                   ',
      '             H           o o                 S                o o        H                                o o       o H o             o o             ',
      '          ------- ---   -----              -----                      -------                                      -------           -----            ',
      '                              =                   =          M                                 =         M                                            ',
      '  P   o o o            B      =    B         B    =   C              B          B          B   =   o o           C      B            o o    B     F   ',
      '==================   =================   ===================      ==================   =================      ==================   ===================',
      '==================LLL=================LLL===================LLLLLL==================LLL=================LLLLLL==================LLL===================',
    ],
  },
];
