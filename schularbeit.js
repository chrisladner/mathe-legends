/* Mathe Legends – die Schularbeit, für die gerade geübt wird (wie exam.js in Word Legends)
   Der Termin gilt als „von Mama/Papa“: Das Kind kann ihn in der App nicht verschieben.
   Eintragen über /stoff (Projektleitung). Bei der nächsten Schularbeit diese Datei neu schreiben; neue Aufgabentypen
   kommen hinten in aufgaben.js dazu, alte ids bleiben (Fortschritt hängt an ihnen).

   window.SCHULARBEIT = {
     id: 'sa1',                   // Schlüssel dieser Schularbeit – nie ändern
     titel, datum, start,         // Termin; erster Übungstag (test.seit = der spätere von start und dem ersten Start der App)
     dauer: null | Minuten,       // Dauer der Schularbeit (steht bei der Probe)
     dauerAnnahme: true | false,  // true: Dauer nur angenommen, die App schreibt „ca.“
     typen: [ids],                // Ziel (Kern): zählt für Balken, Linie und BEREIT
     extra: [ids],                // geübt (ab Fr bis 5 Min. in der Runde, freies Training), zählt nie für BEREIT
     einstufung: {
       reihenfolge: [ids],        // Reihenfolge der Einstufung (Typen ohne Platz danach, je Thema von leicht nach schwer)
       beleg: [ids]               // Buch-Beleg: 1 Aufgabe statt 2; Papier 1 von 1 → ⅔
     },
     lernFolge: [ids],            // Reihenfolge der Lernschritte (Typen ohne Platz danach)
     papier: {                    // ② je Tag (höchstens maxMin Minuten)
       rechnungen: [ids],         // schriftliche Rechnungen (Papier-Typen)
       text: [ids],               // Textaufgaben (eine je Tag)
       spaeter: [ids],            // neue Rechnungen, die am Tag der Einstufung noch nicht kommen (erst ab dem Tag danach)
       jeTag: 3, maxMin: 12       // Do/Fr: 3 fällige Rechnungen (niedrigste Stufe zuerst) und 1 Textaufgabe
     },
     probe: {                     // Generalprobe am Sa auf Papier, danach Ergebnisse eintippen (Muss)
       id, titel, minuten,        // id nie ändern (S.papier[id] hält die Eingaben)
       aufgaben: [{ nr, typ, text, term, kurz?, eingabe, felder?, bild?, zahlen?, richtung?, tasten, loesung, weg, punkte? }]
                                  // wie eine Aufgabe aus aufgaben.js; jeder Kern-Typ mindestens einmal; kurz = Name, wenn term leer
     }
   }

   Stand 16.11.2026, 22:30 (technik): Kern und Extra nach dem OK der Eltern („ja so bauen mit 26“, Lernauftrag Abschnitt 5).
   Einstufungs- und Lernschritt-Reihenfolge nach Teil B. Probe von fachdidaktik eingesetzt. Dauer 50 Min. ist eine Annahme.
   OFFEN: beleg (welche Typen haben einen Buch-Beleg? Vorschlag aus Lernauftrag 2a: Zahlenstrahl, Runden, Addition bis 6
   Stellen). Ohne Probe-Aufgaben fragt die Sa-Runde alle Typen.
*/
window.SCHULARBEIT = {
  id: 'sa1',
  titel: 'Mathe-Schularbeit',
  datum: '2026-11-23',
  start: '2026-11-18',
  dauer: 50,                  // ANNAHME (Projektleitung, 16.11.): echte Dauer unbekannt, eine Schulstunde
  dauerAnnahme: true,         // solange die Dauer nur angenommen ist: die App schreibt „ca.“
  typen: [
    'zs-ablesen',
    'vo-zeichen', 'vo-ordnen', 'vo-vzn',
    'sw-zahlwort', 'sw-tafel', 'sw-als-zahl',
    'rs-runden', 'rs-ueberschlag',
    'add-kette', 'add-schriftlich',
    'sub-kette', 'sub-schriftlich', 'sub-begriffe',
    'ta-rechnung', 'ta-ganz',
    'mul-kopf-stufe', 'mul-kopf-nullen', 'mul-kopf-drei', 'mul-kopf-klammer', 'mul-schriftlich',
    'div-kopf', 'div-schriftlich-1', 'div-schriftlich-2',
    'vb-regeln', 'vb-term'
  ],
  extra: ['zs-markieren', 'vo-gerade', 'sw-ziffer', 'sw-null'],
  einstufung: {
    // Teil B: zs-ablesen und rs-runden zum Aufwärmen → Stellenwert → Vergleichen und Ordnen → vb-regeln, ta-rechnung,
    // div-kopf, sub-kette, rs-ueberschlag, add-kette → zuletzt die vier mul-kopf (schnelle Erfolge am Schluss).
    // vb-term und sub-begriffe (seit dem OK der Eltern im Kern) gleich nach ihren Nachbarn.
    reihenfolge: [
      'zs-ablesen', 'rs-runden',
      'sw-zahlwort', 'sw-tafel', 'sw-als-zahl',
      'vo-zeichen', 'vo-ordnen', 'vo-vzn',
      'vb-regeln', 'vb-term', 'ta-rechnung', 'div-kopf', 'sub-kette', 'sub-begriffe', 'rs-ueberschlag', 'add-kette',
      'mul-kopf-stufe', 'mul-kopf-nullen', 'mul-kopf-drei', 'mul-kopf-klammer'
    ],
    beleg: ['zs-ablesen', 'rs-runden', 'add-schriftlich']   // OFFEN, siehe oben
  },
  // Teil B: Mi zuerst vb-regeln und ta-rechnung; danach die Reihenfolge aus Teil B
  lernFolge: [
    'vb-regeln', 'ta-rechnung', 'sw-als-zahl', 'sw-tafel', 'vb-term', 'sub-begriffe', 'vo-vzn', 'vo-ordnen', 'sw-zahlwort',
    'div-schriftlich-1', 'div-schriftlich-2', 'ta-ganz', 'rs-ueberschlag', 'sub-kette', 'div-kopf', 'sub-schriftlich',
    'mul-kopf-klammer', 'mul-schriftlich', 'add-kette', 'vo-zeichen', 'mul-kopf-stufe', 'mul-kopf-nullen', 'mul-kopf-drei',
    'add-schriftlich', 'rs-runden', 'zs-ablesen'
  ],
  papier: {
    rechnungen: ['add-schriftlich', 'sub-schriftlich', 'mul-schriftlich', 'div-schriftlich-1', 'div-schriftlich-2'],
    text: ['ta-ganz'],
    spaeter: ['div-schriftlich-2'],   // Projektleitung 16.11.: am Mi (Einstufung, längster Tag) noch nicht, erst ab Do
    jeTag: 3,
    maxMin: 12
  },
  // Generalprobe am Sa (fachdidaktik, 16.11.2026). Quelle: auftraege/2026-11-16_mathe-app/inhalt/inhalt.js → PROBE;
  // Aufgabenblatt, Lösungsblatt und Eingabe-Tabelle in probe.md daneben. Das Kind rechnet auf dem ausgedruckten Blatt und
  // tippt danach die Ergebnisse ein, bevor es das Lösungsblatt sieht. 32 Einträge in 12 Aufgaben, jeder der 26 Kern-Typen
  // mindestens einmal, 82 Punkte (punkte je Eintrag ist nur Info). Mehrere Ergebnisse desselben Typs stehen in einem
  // Eintrag (felder), damit ein Typ möglichst nur einmal gewertet wird. kurz = Name für Listen, wenn term leer ist.
  probe: {
    id: 'probe-sa1',
    titel: 'Generalprobe',
    minuten: 50,
    punkte: 82,
    aufgaben: [
      {
        nr: '1',
        typ: 'zs-ablesen',
        punkte: 4,
        text: 'Welche Zahlen gehören zu A, B, C und D?',
        term: '',
        eingabe: 'felder',
        felder: [
          { art: 'zahl', label: 'A' },
          { art: 'zahl', label: 'B' },
          { art: 'zahl', label: 'C' },
          { art: 'zahl', label: 'D' }
        ],
        tasten: [],
        bild: {
          art: 'strahl',
          start: 100,
          schritt: 50,
          striche: 16,
          beschriftet: [0, 10],
          kreuze: [{ name: 'A', wert: 250 }, { name: 'B', wert: 500 }, { name: 'C', wert: 750 }, { name: 'D', wert: 825 }]
        },
        loesung: [250, 500, 750, 825],
        weg: [
          'Von 100 bis 600 sind es 10 Abstände: Ein Abstand ist 50.',
          'A = 250; B = 500; C = 750',
          'D liegt genau zwischen 800 und 850: D = 825'
        ],
        kurz: 'Zahlenstrahl A–D'
      },
      {
        nr: '2a',
        typ: 'vo-zeichen',
        punkte: 1,
        text: 'Setze <, > oder = ein.',
        term: '40 517 ○ 40 571',
        eingabe: 'vergleich',
        tasten: [],
        loesung: '<',
        weg: ['Gleich viele Stellen: Vergleiche von links, Stelle für Stelle.', 'Zehner: 1 < 7, also 40 517 < 40 571'],
        kurz: '40 517 ○ 40 571'
      },
      {
        nr: '2b',
        typ: 'vo-zeichen',
        punkte: 1,
        text: 'Setze <, > oder = ein.',
        term: '309 980 ○ 309 098',
        eingabe: 'vergleich',
        tasten: [],
        loesung: '>',
        weg: ['Gleich viele Stellen: Vergleiche von links, Stelle für Stelle.', 'Hunderter: 9 > 0, also 309 980 > 309 098'],
        kurz: '309 980 ○ 309 098'
      },
      {
        nr: '2c',
        typ: 'vo-zeichen',
        punkte: 1,
        text: 'Setze <, > oder = ein.',
        term: '61 160 ○ 61 106',
        eingabe: 'vergleich',
        tasten: [],
        loesung: '>',
        weg: ['Gleich viele Stellen: Vergleiche von links, Stelle für Stelle.', 'Zehner: 6 > 0, also 61 160 > 61 106'],
        kurz: '61 160 ○ 61 106'
      },
      {
        nr: '2d',
        typ: 'vo-ordnen',
        punkte: 2,
        text: 'Ordne der Größe nach. Beginne mit der kleinsten Zahl.',
        term: '',
        eingabe: 'ordnen',
        zahlen: [7030, 703, 3070, 730, 307, 7300],
        richtung: 'auf',
        loesung: [307, 703, 730, 3070, 7030, 7300],
        weg: [
          'Zähl zuerst die Stellen: Dreistellige Zahlen sind kleiner als vierstellige. Bei gleich vielen Stellen von links vergleichen.',
          '307 < 703 < 730 < 3 070 < 7 030 < 7 300'
        ],
        kurz: 'Ordnen'
      },
      {
        nr: '2e',
        typ: 'vo-vzn',
        punkte: 2,
        text: 'Tabelle: Zeile 1 mit der Zahl 5 000, Zeile 2 mit dem Nachfolger 7 100. Trag ① bis ④ ein.',
        term: '',
        eingabe: 'felder',
        felder: [
          { art: 'zahl', label: '① Vorgänger' },
          { art: 'zahl', label: '② Nachfolger' },
          { art: 'zahl', label: '③ Vorgänger' },
          { art: 'zahl', label: '④ Zahl' }
        ],
        tasten: [],
        loesung: [4999, 5001, 7098, 7099],
        weg: [
          'Vorgänger: eins weniger. Nachfolger: eins mehr. Alle Nullen hinten werden beim Vorgänger zu 9.',
          '4 999; 5 000; 5 001',
          '7 098; 7 099; 7 100'
        ],
        kurz: 'Vorgänger und Nachfolger'
      },
      {
        nr: '3a',
        typ: 'sw-zahlwort',
        punkte: 2,
        text: 'Schreib mit Ziffern: ① zweihundertsiebentausendneunundfünfzig ② sechshunderttausendachtzig',
        term: '',
        eingabe: 'felder',
        felder: [{ art: 'zahl', label: '①' }, { art: 'zahl', label: '②' }],
        tasten: [],
        loesung: [207059, 600080],
        weg: [
          'Zuerst kommt alles vor „tausend“, dann der Rest. Leere Stellen bekommen eine Null. Bei „neunundfünfzig“ schreibst du 5 und dann 9.',
          '① 207 059',
          '② 600 080'
        ],
        kurz: 'Zahlwörter'
      },
      {
        nr: '3b',
        typ: 'sw-tafel',
        punkte: 2,
        text: 'Stellenwerttafel: ① 5 080 307 in Kürzeln (so wie in deiner Tafel) ② die Zahl aus der zweiten Zeile',
        term: '',
        eingabe: 'felder',
        felder: [{ art: 'kuerzel', label: '① Kürzel' }, { art: 'zahl', label: '② Zahl' }],
        tasten: [],
        loesung: ['5M 8ZT 3H 7E', 2040060],
        weg: [
          'Von rechts: E, Z, H, T, ZT, HT, M. Jede Ziffer kommt in ihre Spalte, Nullen fallen in den Kürzeln weg.',
          '① 5 080 307 = 5M 8ZT 3H 7E',
          '② 2M 4ZT 6Z = 2 040 060'
        ],
        kurz: 'Stellenwerttafel'
      },
      {
        nr: '3c',
        typ: 'sw-als-zahl',
        punkte: 2,
        text: 'Schreib als Zahl: ① 3Md 4HM 6ZT 2Z ② 7M 5T 8E',
        term: '',
        eingabe: 'felder',
        felder: [{ art: 'zahl', label: '①' }, { art: 'zahl', label: '②' }],
        tasten: [],
        loesung: [3400060020, 7005008],
        weg: [
          'Jede Stelle bekommt eine Ziffer. Stellen, die nicht vorkommen, bekommen eine Null.',
          '① 3Md 4HM 6ZT 2Z = 3 400 060 020',
          '② 7M 5T 8E = 7 005 008'
        ],
        kurz: 'Kürzel als Zahl'
      },
      {
        nr: '4',
        typ: 'rs-runden',
        punkte: 4,
        text: 'Runde: ① 4 650 auf H; ② 38 451 auf T; ③ 7 962 auf H; ④ 396 512 auf ZT',
        term: '',
        eingabe: 'felder',
        felder: [
          { art: 'zahl', label: '①' },
          { art: 'zahl', label: '②' },
          { art: 'zahl', label: '③' },
          { art: 'zahl', label: '④' }
        ],
        tasten: [],
        loesung: [4700, 38000, 8000, 400000],
        weg: [
          'Unterstreich die Stelle. Die Ziffer rechts daneben entscheidet: 0–4 ab, 5–9 auf.',
          '4 _6_50 ≈ 4 700; 3_8_ 451 ≈ 38 000',
          '7 _9_62 ≈ 8 000; 3_9_6 512 ≈ 400 000'
        ],
        kurz: 'Runden ①–④'
      },
      {
        nr: '5a',
        typ: 'add-kette',
        punkte: 3,
        text: 'Rechenkette: 368 → + 47 → ① → + 86 → ② → + 59 → ③',
        term: '',
        eingabe: 'felder',
        felder: [{ art: 'zahl', label: '①' }, { art: 'zahl', label: '②' }, { art: 'zahl', label: '③' }],
        tasten: [],
        loesung: [415, 501, 560],
        weg: ['Jedes Ergebnis ist der Start für den nächsten Schritt.', '368 + 47 = 415', '415 + 86 = 501', '501 + 59 = 560'],
        kurz: 'Rechenkette plus'
      },
      {
        nr: '5b',
        typ: 'rs-ueberschlag',
        punkte: 1,
        text: 'Überschlag: Runde beide Zahlen auf Hunderter.',
        term: 'Ü: 48 657 + 9 486',
        eingabe: 'zahl',
        tasten: [],
        loesung: 58200,
        weg: ['Runde zuerst jede Zahl auf Hunderter, dann rechne.', 'Ü: 48 700 + 9 500 = 58 200'],
        kurz: 'Ü: 48 657 + 9 486'
      },
      {
        nr: '5c',
        typ: 'add-schriftlich',
        punkte: 3,
        text: 'Rechne schriftlich und mach die Probe.',
        term: '48 657 + 9 486',
        eingabe: 'zahl',
        tasten: [],
        loesung: 58143,
        weg: [
          'Untereinander schreiben, Einer unter Einer. Bei den Einern beginnen, Übertrag nicht vergessen.',
          { mono: ['  48657', '+  9486', '  1111', '  -----', '  58143'] },
          'PR: 58 143 − 9 486 = 48 657. Kommt genau die erste Zahl heraus, stimmt es.'
        ],
        kurz: '48 657 + 9 486'
      },
      {
        nr: '5d',
        typ: 'sub-begriffe',
        punkte: 2,
        text: 'Die Summe ist 900. Der erste Summand ist 365. Wie heißt der zweite Summand?',
        term: 'Summe 900; 1. Summand 365',
        eingabe: 'zahl',
        tasten: [],
        loesung: 535,
        weg: [
          'Summand + Summand = Summe. Einen Summanden findest du mit minus: Summe minus der andere Summand.',
          '900 − 365 = 535',
          'A: Der zweite Summand ist 535.'
        ],
        kurz: 'Summe 900; 1. Summand 365'
      },
      {
        nr: '6a',
        typ: 'sub-kette',
        punkte: 3,
        text: 'Rechenkette: 512 → − 47 → ① → − 68 → ② → − 79 → ③',
        term: '',
        eingabe: 'felder',
        felder: [{ art: 'zahl', label: '①' }, { art: 'zahl', label: '②' }, { art: 'zahl', label: '③' }],
        tasten: [],
        loesung: [465, 397, 318],
        weg: ['Jedes Ergebnis ist der Start für den nächsten Schritt.', '512 − 47 = 465', '465 − 68 = 397', '397 − 79 = 318'],
        kurz: 'Rechenkette minus'
      },
      {
        nr: '6b',
        typ: 'rs-ueberschlag',
        punkte: 1,
        text: 'Überschlag: Runde beide Zahlen auf Hunderter.',
        term: 'Ü: 7 003 − 2 486',
        eingabe: 'zahl',
        tasten: [],
        loesung: 4500,
        weg: ['Runde zuerst jede Zahl auf Hunderter, dann rechne.', 'Ü: 7 000 − 2 500 = 4 500'],
        kurz: 'Ü: 7 003 − 2 486'
      },
      {
        nr: '6c',
        typ: 'sub-schriftlich',
        punkte: 3,
        text: 'Rechne schriftlich und mach die Probe.',
        term: '7 003 − 2 486',
        eingabe: 'zahl',
        tasten: [],
        loesung: 4517,
        weg: [
          'Ergänzen von den Einern weg: Wie viel fehlt auf …? Den Übertrag schreibst du klein zum Subtrahenden.',
          { mono: ['  7003', '− 2486', '  111', '  ----', '  4517'] },
          'PR: 4 517 + 2 486 = 7 003. Kommt genau der Minuend heraus, stimmt es.'
        ],
        kurz: '7 003 − 2 486'
      },
      {
        nr: '6d',
        typ: 'sub-begriffe',
        punkte: 2,
        text: 'Der Subtrahend ist 186. Die Differenz ist 257. Wie heißt der Minuend?',
        term: 'Subtrahend 186; Differenz 257',
        eingabe: 'zahl',
        tasten: [],
        loesung: 443,
        weg: [
          'Minuend − Subtrahend = Differenz. Den Minuenden findest du mit plus: Differenz + Subtrahend.',
          '257 + 186 = 443',
          'A: Der Minuend ist 443.'
        ],
        kurz: 'Subtrahend 186; Differenz 257'
      },
      {
        nr: '7a',
        typ: 'mul-kopf-stufe',
        punkte: 2,
        text: 'Rechne im Kopf.',
        term: '3 070 · 100 und 48 · 1 000',
        eingabe: 'felder',
        felder: [{ art: 'zahl', label: '①' }, { art: 'zahl', label: '②' }],
        tasten: [],
        loesung: [307000, 48000],
        weg: [
          'Mal 100: zwei Nullen anhängen. Mal 1 000: drei Nullen anhängen.',
          '3 070 · 100 = 307 000',
          '48 · 1 000 = 48 000'
        ],
        kurz: '3 070 · 100 und 48 · 1 000'
      },
      {
        nr: '7b',
        typ: 'mul-kopf-nullen',
        punkte: 2,
        text: 'Rechne im Kopf.',
        term: '50 · 800 und 300 · 70',
        eingabe: 'felder',
        felder: [{ art: 'zahl', label: '①' }, { art: 'zahl', label: '②' }],
        tasten: [],
        loesung: [40000, 21000],
        weg: [
          'Rechne zuerst ohne Nullen, dann häng alle Nullen an. Achtung, wenn das kleine Ergebnis schon eine Null hat.',
          '5 · 8 = 40, dazu drei Nullen: 40 000',
          '3 · 7 = 21, dazu drei Nullen: 21 000'
        ],
        kurz: '50 · 800 und 300 · 70'
      },
      {
        nr: '7c',
        typ: 'mul-kopf-drei',
        punkte: 1,
        text: 'Rechne im Kopf.',
        term: '4 · 7 · 5',
        eingabe: 'zahl',
        tasten: [],
        loesung: 140,
        weg: ['Du darfst die Faktoren tauschen. Such zuerst ein Paar, das eine runde Zahl gibt.', '4 · 5 = 20, 20 · 7 = 140'],
        kurz: '4 · 7 · 5'
      },
      {
        nr: '7d',
        typ: 'mul-kopf-klammer',
        punkte: 1,
        text: 'Rechne im Kopf.',
        term: '6 · (23 + 7)',
        eingabe: 'zahl',
        tasten: [],
        loesung: 180,
        weg: ['Klammer zuerst.', '6 · 30 = 180'],
        kurz: '6 · (23 + 7)'
      },
      {
        nr: '7e',
        typ: 'mul-schriftlich',
        punkte: 3,
        text: 'Rechne schriftlich.',
        term: '607 · 48',
        eingabe: 'zahl',
        tasten: [],
        loesung: 29136,
        weg: [
          'Beginne mit der linken Ziffer vom zweiten Faktor. Die nächste Zeile rückt eine Stelle nach rechts (Punkt als Platzhalter).',
          { mono: ['607 · 48', '   2428·', '    4856', '   -----', '   29136'] }
        ],
        kurz: '607 · 48'
      },
      {
        nr: '8a',
        typ: 'div-kopf',
        punkte: 2,
        text: 'Rechne im Kopf.',
        term: '6 300 : 100 und 56 000 : 70',
        eingabe: 'felder',
        felder: [{ art: 'zahl', label: '①' }, { art: 'zahl', label: '②' }],
        tasten: ['nm'],
        loesung: [63, 800],
        weg: [
          'Durch 100: zwei Nullen streichen. Bei beiden Zahlen gleich viele Nullen streichen, dann im Kopf teilen.',
          '6 300 : 100 = 63',
          '56 000 : 70 = 5 600 : 7 = 800'
        ],
        kurz: '6 300 : 100 und 56 000 : 70'
      },
      {
        nr: '8b',
        typ: 'div-kopf',
        punkte: 1,
        text: 'Rechne im Kopf.',
        term: '45 : 0',
        eingabe: 'rest',
        tasten: ['nm'],
        loesung: 'nm',
        weg: ['Frag dich: Welche Zahl mal 0 ergibt 45?', 'Keine. Durch 0 kann man nicht dividieren: nicht möglich.'],
        kurz: '45 : 0'
      },
      {
        nr: '8c',
        typ: 'div-schriftlich-1',
        punkte: 3,
        text: 'Rechne schriftlich und mach die Probe. Schreib den Rest mit R.',
        term: '6 345 : 6',
        eingabe: 'rest',
        tasten: ['nm'],
        loesung: { q: 1057, r: 3 },
        weg: [
          'Erste Teilzahl unterstreichen. Geht eine Teilzahl 0-mal, schreib 0 in den Quotienten.',
          { mono: ['_6_345 : 6 = 1057', '03', ' 34', '  45', '   3 R'] },
          'PR: 1 057 · 6 = 6 342, 6 342 + 3 R = 6 345'
        ],
        kurz: '6 345 : 6'
      },
      {
        nr: '8d',
        typ: 'div-schriftlich-2',
        punkte: 4,
        text: 'Mach zuerst einen Überschlag, dann rechne schriftlich und mach die Probe.',
        term: '4 557 : 21',
        eingabe: 'rest',
        tasten: ['nm'],
        loesung: { q: 217, r: 0 },
        weg: [
          'Ü: Runde beide Zahlen auf Zehner und streich die Nullen.',
          'Ü: 4 560 : 20 = 228',
          { mono: ['_45_57 : 21 = 217', ' 35', ' 147', '   0 R'] },
          { mono: ['PR: 217 · 21', '        434·', '         217', '        ----', '        4557'] }
        ],
        kurz: '4 557 : 21'
      },
      {
        nr: '9a',
        typ: 'vb-regeln',
        punkte: 6,
        text: 'Rechne: ① 56 − 6 · 8 + 9; ② (45 + 27) : (17 − 9); ③ 5 · (348 − 3 · 76) + 84',
        term: '',
        eingabe: 'felder',
        felder: [{ art: 'zahl', label: '①' }, { art: 'zahl', label: '②' }, { art: 'zahl', label: '③' }],
        tasten: [],
        loesung: [17, 9, 684],
        weg: [
          'Klammer zuerst, dann Punkt vor Strich (Klampunstri). Gleiche Stufe von links nach rechts.',
          '① 56 − 6 · 8 + 9 = 56 − 48 + 9 = 8 + 9 = 17',
          '② (45 + 27) : (17 − 9) = 72 : 8 = 9',
          '③ 5 · (348 − 3 · 76) + 84 = 5 · (348 − 228) + 84 = 5 · 120 + 84 = 600 + 84 = 684'
        ],
        kurz: 'Rechenregeln ①–③'
      },
      {
        nr: '9b',
        typ: 'vb-term',
        punkte: 4,
        text: 'Schreib die Rechnung an und rechne. ① Dividiere die Summe von 48 und 36 durch 7! ② Subtrahiere 23 vom Produkt von 7 und 9!',
        term: '',
        eingabe: 'felder',
        felder: [
          { art: 'term', label: '① Rechnung' },
          { art: 'zahl', label: '① Ergebnis' },
          { art: 'term', label: '② Rechnung' },
          { art: 'zahl', label: '② Ergebnis' }
        ],
        tasten: [],
        loesung: [
          { wert: 12, zahlen: [48, 36, 7], terme: ['(48 + 36) : 7'] },
          12,
          { wert: 40, zahlen: [7, 9, 23], terme: ['7 · 9 − 23'] },
          40
        ],
        weg: [
          '„Die Summe von … durch …“: Die Summe kommt zuerst, also in eine Klammer. „Subtrahiere 23 von …“: Die 23 kommt weg, sie steht hinten.',
          '① (48 + 36) : 7 = 84 : 7 = 12',
          '② 7 · 9 − 23 = 63 − 23 = 40'
        ],
        kurz: 'Rechnung aus Worten'
      },
      {
        nr: '10',
        typ: 'ta-rechnung',
        punkte: 4,
        text: '① Lena hat 84 € gespart. Das sind um 19 € mehr, als ihr Bruder gespart hat. Wie viel Geld hat ihr Bruder gespart? ② Für 8 Kinder kostet der Eintritt zur Stunt-Show zusammen 96 €. Wie viel zahlt jedes Kind?',
        term: '',
        eingabe: 'felder',
        felder: [
          { art: 'term', label: '① Rechnung' },
          { art: 'zahl', label: '① Ergebnis' },
          { art: 'term', label: '② Rechnung' },
          { art: 'zahl', label: '② Ergebnis' }
        ],
        tasten: [],
        loesung: [{ wert: 65, zahlen: [84, 19], terme: ['84 − 19'] }, 65, { wert: 12, zahlen: [96, 8], terme: ['96 : 8'] }, 12],
        weg: [
          'Stell dir die Geschichte vor: Wird es mehr oder weniger? Wird gerecht verteilt?',
          '① Lena hat mehr gespart. Der Bruder hat also weniger: minus. 84 − 19 = 65',
          '② Der Preis wird gerecht auf die Kinder aufgeteilt: geteilt durch. 96 : 8 = 12'
        ],
        kurz: 'Textaufgaben ① ②'
      },
      {
        nr: '11',
        typ: 'ta-ganz',
        punkte: 5,
        text: 'Die Klasse fährt zum Skitag. Der Bus kostet 384 €, die Liftkarten für alle zusammen kosten 696 €. 24 Kinder fahren mit und teilen sich die Kosten gerecht. a) Wie viel kostet der Skitag insgesamt? b) Wie viel muss jedes Kind zahlen?',
        term: '',
        eingabe: 'felder',
        felder: [{ art: 'zahl', label: 'a)' }, { art: 'zahl', label: 'b)' }],
        tasten: [],
        loesung: [1080, 45],
        weg: [
          'geg: Bus 384 €; Liftkarten 696 €; 24 Kinder — ges: a) Kosten insgesamt; b) Kosten für ein Kind',
          'a) 384 + 696 = 1 080',
          'b) 1 080 : 24 = 45',
          { mono: ['_108_0 : 24 = 45', ' 120', '   0 R'] },
          'A: a) Der Skitag kostet insgesamt 1 080 €. b) Jedes Kind muss 45 € zahlen.'
        ],
        kurz: 'Sachaufgabe Skitag'
      },
      {
        nr: '12',
        typ: 'ta-ganz',
        punkte: 5,
        text: 'Beim großen Krampuslauf schauen 2 450 Leute zu. Beim kleinen Krampuslauf sind es um 785 Leute weniger. a) Wie viele Leute schauen beim kleinen Krampuslauf zu? b) Wie viele Leute schauen bei beiden Krampusläufen zusammen zu?',
        term: '',
        eingabe: 'felder',
        felder: [{ art: 'zahl', label: 'a)' }, { art: 'zahl', label: 'b)' }],
        tasten: [],
        loesung: [1665, 4115],
        weg: [
          'geg: großer Krampuslauf 2 450 Leute; kleiner um 785 weniger — ges: a) kleiner Krampuslauf; b) beide zusammen',
          'a) 2 450 − 785 = 1 665',
          'b) 2 450 + 1 665 = 4 115',
          'A: a) Beim kleinen Krampuslauf schauen 1 665 Leute zu. b) Bei beiden schauen zusammen 4 115 Leute zu.'
        ],
        kurz: 'Sachaufgabe Krampuslauf'
      }
    ]
  }
};
