/* Mathe Legends – Aufgabentypen
   VERTRAG zwischen der App (app.js) und den Generatoren (Teil T2 im Technik-Plan, Lernauftrag
   auftraege/2026-11-16_mathe-app.md Abschnitt 6). Die App kennt nur diese Schnittstelle; welche Typen es gibt, steht
   allein hier. Inhalte nach Lernauftrag 2a (Übungsteil), 2b/2c (Schulbuch) und 2d (Heft – für die App gilt das Heft).

   Regeln für diese Datei
   - Kein DOM auf oberster Ebene: Sie läuft auch in node (tools/aufgaben-pruefen.mjs) und in werkzeuge/lernstand.mjs
     (vm, in dem es nur `window` gibt).
   - Nie Math.random in einem Generator, immer den übergebenen Zufall rnd(). Mit demselben Seed kommt dieselbe Aufgabe:
     So lässt sich jede Aufgabe nachrechnen und testen. Jede Schleife hat eine Obergrenze.
   - ids UND Fehlerarten sind Schlüssel zum Fortschritt (S.f[id] und S.f[id].fa in app.js): nie ändern, nie
     wiederverwenden. Register: tools/ids.txt. Nach jeder Änderung: node tools/aufgaben-pruefen.mjs (ohne FEHLER).
     Das Präfix `dummy-` ist für Platzhalter reserviert und kommt nie in eine veröffentlichte Version.
   - Die App ist öffentlich: erfundene Namen, keine Buchtexte, kein Name des Kindes.

   window.MATHE = {
     version: 2,
     bereiche: [{ id, titel }],                  // die 4 Bereiche vom Zettel; Balken für Legends HQ
     themen:   [{ id, titel, bereich, quelle }], // die 10 Zeilen vom Zettel, in dieser Reihenfolge
     typen:    [Typ],                            // Aufgabentypen = Lerneinheiten mit Fortschritt
     fehlerTexte: { art: Text },                 // Rückmeldung je Fehlerart: kurz, freundlich, ohne Scham
     textaufgaben: { rechnung: [...], ganz: [...] },   // Vorlagen als Daten (ta-rechnung, ta-ganz), siehe unten
     zufall(seed) → rnd,  format(n) → '34 567',  zahlAus(text) → { wert, gruppen } | { unlesbar } | null,
     pruefe(aufgabe, eingabe) → { ok, wert, fehlerart, hinweis, unlesbar, gruppen, teile, positionen },
     anzeigen(aufgabe, wert) → Text der Lösung („47 000“, „7 R 3“, „nicht möglich“, „<“, „5 < 56 < 650“)
   }

   Typ = {
     id: 'rs-runden',          // Schlüssel zum Fortschritt
     thema: 'runden',          // themen[].id
     titel: 'Runden',          // erst NACH der Antwort sichtbar (Lernmodell Teil A: keine Überschrift vorher)
     quelle: 'Üb. S. 14–15 · Buch S. 49–51',
     rang: 1,                  // im Thema von leicht nach schwer (Einstufung, Reihenfolge der Lernschritte)
     wo: 'app',                // 'app' = Runde · 'papier' = Ergebnis kommt aus ② oder der Probe (schriftlich, Textaufgabe)
     auswahl: false,           // true bei < > =: die App fragt im Dreierpack, Aufstieg nur bei 3 von 3
     nah: [],                  // Verwechselbares (ids): kommt in der Runde nah beieinander
     voraus: [],               // Voraussetzungen (ids): Reihenfolge der Lernschritte
     gewicht: 1,               // Gewicht in der Schularbeit: Reihenfolge der Lernschritte
     sek: 10,                  // Sekunden je Aufgabe beim Wiederholen (Lernauftrag 2a); bei auswahl der ganze Dreierpack
     sekNeu: 15,               // Sekunden beim ersten Kontakt (Einstufung); Schätzung technik, etwa 1,5 · sek
     varianten: [],            // Spielarten im Typ, nur zur Info (z. B. 'sub-zwei' in sub-schriftlich) – keine ids
     erzeuge(rnd, opt) → Aufgabe   // opt.zweck: einstufung · beispiel · lernschritt · runde · zwilling · papier · ueben
   }                               // Mit zufall(1) und zweck 'runde' muss erzeuge immer klappen (Probe der App).

   Aufgabe = {                 // reines JSON: Papier-Aufgaben speichert die App genau so (S.papier)
     typ: 'rs-runden',
     variante: 'neun',         // Spielart (nur zum Testen und Auswerten, nie anzeigen); ta-rechnung dazu vorlage (id der
                               // Vorlage von fachdidaktik) und falle (true = Frage mit irreführendem Signalwort)
     kennung: '…',             // eindeutig je Aufgabe. Gleiche kennung = gleiche Aufgabe: nicht zweimal in einer Runde.
                               // (term reicht dafür nicht: Text- und Bild-Aufgaben haben keinen.)
     text: 'Runde auf Hunderter.',      // Auftrag, kurz. Verrät nie die Rechenart, wo sie gesucht ist (Hinweis-Test)
     term: '34 567',                    // groß angezeigt, fertig formatiert: Malpunkt ·, Divisionszeichen :, Minus −,
                                        // ≈ nur beim Runden. Bei vergleich steht ○ an der Stelle des Zeichens. Kann leer sein.
     eingabe: 'zahl',                   // Antwortformat:
                                        //   zahl · vergleich (< = >, Dreierpack) · rest (Quotient, Taste R) · term (+ − · : ( ))
                                        //   kuerzel (Md HM ZM M HT ZT T H Z E) · liste (Taste „nächste Zahl“)
                                        //   felder (mehrere Felder mit Namen, je Feld art zahl | term | kuerzel)
                                        //   ordnen (Zahlen der Reihe nach antippen) · strahl (Striche am Zahlenstrahl antippen)
     felder: [{ art: 'zahl', label: 'Vorgänger' }],   // nur bei felder
     tasten: [],                        // 'nm' = „nicht möglich“: bei jeder Division, nicht nur bei : 0 (Hinweis-Test)
     loesung: 34600,                    // zahl: Zahl · vergleich: '<' '>' '=' · rest: { q, r } · 'nm' · kuerzel: '2HT 3T 7H 8Z'
                                        // term: { wert, zahlen: [36, 12, 8], terme: ['(36 + 12) : 8'] } · liste: [62, 64, …]
                                        // felder: [Lösung je Feld] · ordnen: Zahlen in richtiger Reihenfolge · strahl: Werte
     alt: [],                           // weitere richtige Lösungen, gleiche Form wie loesung
     zahlen: [506, 56], richtung: 'auf',   // nur ordnen: Zahlen zum Antippen; 'auf' = kleinste zuerst (<), 'ab' = größte (>)
     ziel: [340, 420, 470],             // nur strahl: diese Zahlen markiert das Kind (Werte von Strichen)
     bild: { art: 'strahl', start: 200, schritt: 50, striche: 10, beschriftet: [0, 2, 4], kreuze: [{ name: 'A', wert: 300 }] },
                                        // Zahlenstrahl: Striche 0 … striche, Strich i hat den Wert start + i · schritt;
                                        // beschriftet = Index der Striche mit Zahl darunter; ein Kreuz liegt auf einem Strich
                                        // oder genau in der Mitte zwischen zwei Strichen
     kette: '147',                      // nur Rechenketten (felder): Startzahl; anzeigen schreibt „147 → 185 → 210 → 227“
     weg: ['…', { mono: ['…'] }],       // Lösungsweg in 2–3 Zeilen (ta-ganz bis 5: geg/ges, a), b), Kurzform, A:), Schreibweise
                                        // des Hefts. weg[0] ist immer Text: der vorgegebene 1. Schritt im Lernschritt und
                                        // der Tipp – er verrät das Ergebnis nie.
                                        // _x_ = unterstrichen · { mono: [Zeilen] } = Rechnung in fester Schrift (Kurzform)
     fehler: { '34500': 'abgerundet' }, // typische falsche Antworten → Fehlerart. Schlüssel wie schluessel(eingabe, wert);
                                        // bei felder je Feld '1:77' (Feld 1 mit dem Wert 77); ein Term, der nicht aufgeht
                                        // („7 : 84“), hat den Schlüssel '?nichtGanz' (durch 0: '?durchNull')
     rueck: { abgerundet: '…', _: '…' } // Rückmeldung mit den Zahlen dieser Aufgabe; '_' gilt für jede andere falsche
                                        // Antwort. Sonst MATHE.fehlerTexte. pruefe() liefert den passenden Text als hinweis.
   }

   Prüfregeln (Lernauftrag 2a): Es zählt der Wert. Kein „fast“ bei Zahlen – eine Ziffer daneben ist falsch. Führende Null
   ist unlesbar (das Ziffernfeld sperrt sie), die 0 allein gilt. Punkt zwischen Dreiergruppen gilt („366.295.900“, wie im
   Heft). Kürzel wie im Buch („2HT 3T 7H 8Z“), Nullstellen fallen weg, die Reihenfolge zählt nicht. Term: richtig, wenn er
   genau die Zahlen aus dem Satz enthält und denselben Wert hat. Liste: Reihenfolge egal, jede Zahl genau einmal.
   Ordnen: Reihenfolge zählt. Strahl: die markierten Werte als Menge.
*/
(function () {
'use strict';

// ================================================================
// Zahlen schreiben und lesen
// ================================================================
const NBSP = '\u00a0';   // festes Leerzeichen: Dreiergruppen gut sichtbar wie im Buch, brechen nie um

// Buch: ab 4 Stellen Leerzeichen in Dreiergruppen, von hinten
function format(n) {
  const s = String(Math.trunc(Math.abs(Number(n) || 0)));
  if (s.length < 4) return s;
  return s.replace(/\B(?=(\d{3})+(?!\d))/g, NBSP);
}
const F = format;

// Eine Zahl, wie man sie schreiben kann: 366295900, „366 295 900“ (Leerzeichen jeder Art) oder „366.295.900“
// (Punkt zwischen Dreiergruppen gilt, Lernauftrag 2d). Ein Punkt zählt nur zwischen gültigen Dreiergruppen, sonst könnte es eine Kommazahl
// sein. Ein Komma ist unlesbar, eine führende Null auch („0542“; die 0 allein gilt). Falsch gesetzte Leerzeichen
// („3405 020“): die Zahl gilt, gruppen = false (nur zur Info – es gibt kein „fast“).
function zahlAus(x) {
  if (typeof x === 'number') return Number.isSafeInteger(x) && x >= 0 ? { wert: x, gruppen: true } : { unlesbar: true };
  let s = String(x == null ? '' : x).normalize('NFKC').trim();
  if (!s) return null;
  s = s.replace(/\s+/g, ' ');
  if (/^0\d/.test(s)) return { unlesbar: true };
  if (/^\d+$/.test(s)) return { wert: Number(s), gruppen: true };
  if (/^\d{1,3}([ .]\d{3})+$/.test(s)) return { wert: Number(s.replace(/[ .]/g, '')), gruppen: true };
  if (/^\d+( \d+)+$/.test(s)) return { wert: Number(s.replace(/ /g, '')), gruppen: false };
  return { unlesbar: true };
}

// Stellenwert-Kürzel wie im Buch: „2HT 3T 7H 8Z“ → { HT: 2, T: 3, H: 7, Z: 8 }. Nullstellen fallen weg, Reihenfolge egal,
// jedes Kürzel höchstens einmal. null = unlesbar.
const KUERZEL = ['Md', 'HM', 'ZM', 'M', 'HT', 'ZT', 'T', 'H', 'Z', 'E'];
const KUERZEL_WERT = { Md: 1e9, HM: 1e8, ZM: 1e7, M: 1e6, HT: 1e5, ZT: 1e4, T: 1e3, H: 100, Z: 10, E: 1 };
function kuerzelAus(x) {
  const s = String(x == null ? '' : x).normalize('NFKC').replace(/\s+/g, ' ').trim();
  if (!s) return null;
  const out = {};
  const re = /(\d+)\s*(Md|HM|ZM|HT|ZT|M|T|H|Z|E)(?![a-z])/g;
  let m, rest = s;
  while ((m = re.exec(s))) {
    if (out[m[2]] != null) return null;
    out[m[2]] = Number(m[1]);
    rest = rest.replace(m[0], '');
  }
  if (rest.trim()) return null;
  for (const k of Object.keys(out)) if (!out[k]) delete out[k];
  return out;
}
function kuerzelText(map) {
  return KUERZEL.filter(k => map[k]).map(k => `${map[k]}${k}`).join(' ');
}
function kuerzelGleich(a, b) {
  const ka = Object.keys(a).sort(), kb = Object.keys(b).sort();
  return ka.join() === kb.join() && ka.every(k => a[k] === b[k]);
}

// Rechnung (Eingabe „term“) auswerten: Zahlen, + − · : und Klammern, Punkt vor Strich, gleiche Stufe von links. Kein eval.
// → null bei einem Schreibfehler (unlesbar) · { wert, zahlen } · { wert: null, zahlen, grund: 'nichtGanz' | 'durchNull' },
// wenn die Rechnung lesbar ist, aber nicht aufgeht („7 : 84“ ist falsch, nicht unlesbar – typischer Fehler: Reihenfolge).
function termAus(x) {
  const s = termNorm(x);
  if (!s) return null;
  const t = s.match(/\d+|[+−·:()]/g);
  if (!t || t.join('') !== s) return null;
  const SCHREIBFEHLER = {};
  let i = 0, grund = null;
  const zahlen = [];
  const faktor = () => {
    if (t[i] === '(') { i++; const v = ausdruck(); if (t[i] !== ')') throw SCHREIBFEHLER; i++; return v; }
    if (/^\d+$/.test(t[i] || '')) { if (/^0\d/.test(t[i])) throw SCHREIBFEHLER; const n = Number(t[i++]); zahlen.push(n); return n; }
    throw SCHREIBFEHLER;
  };
  const produkt = () => {
    let v = faktor();
    while (t[i] === '·' || t[i] === ':') {
      const op = t[i++], r = faktor();
      if (op === '·') v *= r;
      else if (r === 0) { grund = grund || 'durchNull'; v = NaN; }
      else if (v % r !== 0) { grund = grund || 'nichtGanz'; v = NaN; }
      else v /= r;
    }
    return v;
  };
  const ausdruck = () => {
    let v = produkt();
    while (t[i] === '+' || t[i] === '−') { const op = t[i++], r = produkt(); v = op === '+' ? v + r : v - r; }
    return v;
  };
  try {
    const wert = ausdruck();
    if (i !== t.length) return null;
    return grund ? { wert: null, zahlen, grund } : { wert, zahlen };
  } catch (e) {
    if (e === SCHREIBFEHLER) return null;
    throw e;
  }
}
const gleicheZahlen = (a, b) => {
  if (!Array.isArray(a) || !Array.isArray(b) || a.length !== b.length) return false;
  const x = a.slice().sort((p, q) => p - q), y = b.slice().sort((p, q) => p - q);
  return x.every((v, k) => v === y[k]);
};

// Rest: „7 R 3“, „7R3“, „7 Rest 3“ oder { q, r }
function restAus(x) {
  if (x && typeof x === 'object') {
    const q = zahlAus(x.q), r = zahlAus(x.r);
    return q && r && !q.unlesbar && !r.unlesbar ? { q: q.wert, r: r.wert } : { unlesbar: true };
  }
  const m = String(x == null ? '' : x).normalize('NFKC').trim().match(/^(.+?)\s*(?:Rest|R)\s*(.+)$/i);   // „Rest“ zuerst, sonst bliebe „est 3“
  if (!m) { const z = zahlAus(x); return z && !z.unlesbar ? { q: z.wert, r: 0 } : { unlesbar: true }; }
  return restAus({ q: m[1], r: m[2] });
}

// Rechnung (Eingabe „term“): Zeichen vereinheitlichen, Leerzeichen weg. Die Generatoren vergleichen damit.
function termNorm(x) {
  return String(x == null ? '' : x).normalize('NFKC')
    .replace(/[×xX*]/g, '·').replace(/[÷/]/g, ':').replace(/[-–]/g, '−').replace(/\s+/g, '');
}

// Schlüssel einer Antwort (für alt und fehler)
function schluessel(eingabeArt, wert) {
  if (wert === 'nm') return 'nm';
  if (eingabeArt === 'rest') return wert && typeof wert === 'object' ? `${wert.q}R${wert.r || 0}` : String(wert);
  if (eingabeArt === 'term') {
    if (wert && typeof wert === 'object') return wert.wert == null ? `?${wert.grund || 'unlesbar'}` : String(wert.wert);
    return termNorm(wert);
  }
  if (eingabeArt === 'kuerzel') return wert && typeof wert === 'object' ? kuerzelText(wert) : String(wert);
  if (eingabeArt === 'strahl' && Array.isArray(wert)) return wert.map(Number).sort((p, q) => p - q).join('|');
  if (Array.isArray(wert)) return wert.map(x => (x && typeof x === 'object' ? JSON.stringify(x) : String(x))).join('|');
  return String(wert);
}

// Text der Lösung zum Anzeigen (Zahlen immer in Dreiergruppen)
function anzeigen(a, w = a.loesung) {
  const art = a.eingabe || 'zahl';
  if (w === 'nm') return 'nicht möglich';
  if (art === 'vergleich') return String(w);
  if (art === 'rest') return w && typeof w === 'object' ? (w.r ? `${format(w.q)} R ${format(w.r)}` : format(w.q)) : String(w);
  if (art === 'term') return w && typeof w === 'object' ? `${((w.terme || [])[0] || '').replace(/\d+/g, n => format(n))} = ${format(w.wert)}` : String(w);
  if (art === 'kuerzel') return typeof w === 'string' ? w : kuerzelText(w || {});
  if (art === 'liste' || art === 'strahl') return (w || []).map(format).join(', ');
  if (art === 'ordnen') return (w || []).map(format).join(a.richtung === 'ab' ? ' > ' : ' < ');
  if (art === 'felder') {
    const werte = (a.felder || []).map((f, i) => anzeigen({ eingabe: f.art || 'zahl' }, (w || [])[i]));
    if (a.kette) return [a.kette, ...werte].join(' → ');
    return (a.felder || []).map((f, i) => (!f.label ? werte[i] : /\)$/.test(f.label) ? `${f.label} ${werte[i]}` : `${f.label}: ${werte[i]}`)).join(', ');
  }
  return format(w);
}

// ================================================================
// Antwort prüfen – eine Regel für alle Typen
// eingabe je Format: zahl/term/kuerzel: Text · vergleich: '<' '>' '=' · rest: { q, r } oder „7 R 3“ · liste, felder,
// ordnen, strahl: Liste (Texte oder Zahlen) · 'nm' = „nicht möglich“.
// Ergebnis: { ok, wert, fehlerart, hinweis (Rückmeldetext oder null), unlesbar, gruppen, teile (felder), positionen (ordnen) }
// ================================================================
function lies(art, x) {   // eine Antwort lesen → Wert oder { unlesbar: true }
  if (x === 'nm' || (typeof x === 'string' && /^nicht\s*möglich$/i.test(x.trim()))) return 'nm';
  if (art === 'vergleich') { const s = String(x == null ? '' : x).trim(); return ['<', '>', '='].includes(s) ? s : { unlesbar: true }; }
  if (art === 'rest') return restAus(x);
  if (art === 'term') return termAus(x) || { unlesbar: true };
  if (art === 'kuerzel') return kuerzelAus(x) || { unlesbar: true };
  if (art === 'liste' || art === 'ordnen' || art === 'strahl') {
    const roh = Array.isArray(x) ? x : String(x == null ? '' : x).split(/[;,|]/);
    const l = roh.map(s => zahlAus(s)).filter(Boolean);
    return l.length && l.every(z => !z.unlesbar) ? l.map(z => z.wert) : { unlesbar: true };
  }
  const z = zahlAus(x);
  return !z || z.unlesbar ? { unlesbar: true } : z.wert;
}
function gleich(art, w, l) {
  if (l === 'nm' || w === 'nm') return w === l;
  if (art === 'rest') return !!w && !!l && w.q === l.q && (w.r || 0) === (l.r || 0);
  if (art === 'term') return !!w && !!l && w.wert != null && w.wert === l.wert && (!l.zahlen || gleicheZahlen(w.zahlen, l.zahlen));
  if (art === 'kuerzel') { const lk = typeof l === 'string' ? kuerzelAus(l) : l; return !!w && !!lk && kuerzelGleich(w, lk); }
  if (art === 'liste' || art === 'strahl') return Array.isArray(w) && Array.isArray(l) && gleicheZahlen(w, l);
  if (art === 'ordnen') return Array.isArray(w) && Array.isArray(l) && w.length === l.length && w.every((v, k) => v === l[k]);
  return w === l;
}
function pruefe(a, eingabe) {
  const art = a.eingabe || 'zahl';
  const out = { ok: false, wert: null, fehlerart: null, hinweis: null, unlesbar: false, gruppen: true };
  if (art === 'felder') {
    const felder = a.felder || [];
    const werte = Array.isArray(eingabe) ? eingabe : [eingabe];
    out.teile = felder.map((f, i) => {
      const fa = f.art || 'zahl', w = lies(fa, werte[i]);
      if (w && w.unlesbar) return { ok: false, unlesbar: true };
      return { ok: [a.loesung, ...(a.alt || [])].some(l => gleich(fa, w, Array.isArray(l) ? l[i] : undefined)), wert: w };
    });
    if (out.teile.some(t => t.unlesbar)) { out.unlesbar = true; return out; }
    out.wert = out.teile.map(t => t.wert);
    out.ok = out.teile.every(t => t.ok);
  } else {
    const w = lies(art, eingabe);
    if (w && w.unlesbar) { out.unlesbar = true; return out; }
    if (art === 'zahl' && typeof eingabe === 'string') { const z = zahlAus(eingabe); out.gruppen = !!z && z.gruppen !== false; }
    out.wert = w;
    out.ok = [a.loesung, ...(a.alt || [])].some(l => gleich(art, w, l));
    if (art === 'ordnen' && Array.isArray(w) && Array.isArray(a.loesung)) out.positionen = a.loesung.map((z, k) => ({ ok: w[k] === z }));
  }
  if (!out.ok) {
    out.fehlerart = fehlerartVon(a, art, out);
    const r = a.rueck || {};
    out.hinweis = out.fehlerart ? (r[out.fehlerart] || FEHLERARTEN[out.fehlerart] || null) : (r._ || null);
  }
  return out;
}
// Fehlerart einer falschen Antwort: zuerst die ganze Antwort, bei felder das erste falsche Feld mit bekanntem Fehler.
// Ein Term mit anderen Zahlen als im Satz ist immer „zahlen“.
function fehlerartVon(a, art, out) {
  const f = a.fehler || {};
  if (art !== 'felder') {
    const k = f[schluessel(art, out.wert)];
    if (k) return k;
    if (art === 'term' && out.wert && a.loesung && a.loesung.zahlen && !gleicheZahlen(out.wert.zahlen, a.loesung.zahlen)) return 'zahlen';
    return null;
  }
  const felder = a.felder || [];
  let termRichtig = false;
  for (let i = 0; i < felder.length; i++) {
    const t = out.teile[i], fa = felder[i].art || 'zahl';
    if (t && t.ok) { if (fa === 'term') termRichtig = true; continue; }
    if (!t) continue;
    const k = f[`${i}:${schluessel(fa, t.wert)}`];
    if (k) return k;
    const soll = Array.isArray(a.loesung) ? a.loesung[i] : null;
    if (fa === 'term' && t.wert && soll && soll.zahlen && !gleicheZahlen(t.wert.zahlen, soll.zahlen)) return 'zahlen';
    if (fa === 'zahl' && termRichtig) return 'rechenfehler';   // Rechnung stimmt, nur das Ergebnis nicht
  }
  return null;
}

// ================================================================
// Zufall mit Seed (mulberry32) und kleine Würfel-Helfer
// ================================================================
function zufall(seed) {
  let s = (Number(seed) >>> 0) || 1;
  return () => {
    s = (s + 0x6D2B79F5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const zwischen = (rnd, a, b) => a + Math.floor(rnd() * (b - a + 1));   // ganze Zahl a … b
const wahl = (rnd, l) => l[Math.floor(rnd() * l.length)];
function gewichtet(rnd, paare) {   // [[Wert, Gewicht], …]
  let summe = 0;
  for (const p of paare) summe += p[1];
  let x = rnd() * summe;
  for (const p of paare) { x -= p[1]; if (x < 0) return p[0]; }
  return paare[paare.length - 1][0];
}
function mische(rnd, l) {
  const a = l.slice();
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); const t = a[i]; a[i] = a[j]; a[j] = t; }
  return a;
}
const hoch = p => 10 ** p;
const stellenVon = n => String(n).length;
const ziffer = (n, j) => Math.floor(n / hoch(j)) % 10;   // Ziffer an Stelle j von rechts (0 = Einer)
const ausZiffern = ds => Number(ds.join(''));
const zahlMit = (rnd, d) => zwischen(rnd, hoch(d - 1), hoch(d) - 1);
// Ziffern einer Zahl mit d Stellen; jede außer der ersten ist mit Wahrscheinlichkeit pNull eine 0
const ziffernMit = (rnd, d, pNull) => Array.from({ length: d }, (_, i) => (i === 0 ? zwischen(rnd, 1, 9) : rnd() < pNull ? 0 : zwischen(rnd, 1, 9)));
const zahlOk = w => Number.isSafeInteger(w) && w >= 0;
const NULLEN_WORT = ['keine Null', 'eine Null', 'zwei Nullen', 'drei Nullen'];   // als Wort: die Anzahl ist nie mit dem Ergebnis zu verwechseln
const ZWECK_VOLL = new Set(['einstufung', 'papier']);   // Schularbeits-Niveau

// Fehler sammeln: Schlüssel, die eine richtige Lösung wären, kommen nie hinein; der erste Eintrag gewinnt
function sammler(richtig) {
  const map = {};
  const verboten = new Set(richtig);
  return { map, setze(k, art) { if (k == null || verboten.has(k) || map[k]) return; map[k] = art; } };
}
// Gerüst einer Aufgabe (fehlende Felder mit Standardwerten). Jede Aufgabe bekommt rueck._: den Strategie-Satz ihres Typs
// für falsche Antworten ohne eigene Fehlerart (ein Generator kann ihn mit Zahlen der Aufgabe ersetzen).
function aufgabe(typ, x) {
  const a = Object.assign({ typ, variante: '', text: '', term: '', eingabe: 'zahl', tasten: [], loesung: null, alt: [], weg: [], fehler: {}, rueck: {} }, x);
  if (!a.kennung) a.kennung = `${typ}|${a.text}|${a.term}`;
  if (STRATEGIE[typ] && !(a.rueck && a.rueck._)) a.rueck = Object.assign({}, a.rueck, { _: STRATEGIE[typ] });
  return a;
}
// Strategie-Sätze (Lernauftrag 2a „Rückmeldungen“, 2d): kurz, in der Sprache des Kindes, ohne Scham
const STRATEGIE = {
  'zs-ablesen': 'Finde zuerst den Schritt von Strich zu Strich. Dann zähl vom beschrifteten Strich aus weiter.',
  'zs-markieren': 'Finde zuerst den Schritt von Strich zu Strich. Dann zähl vom beschrifteten Strich aus weiter.',
  'vo-zeichen': 'Vergleich von links, Stelle für Stelle. Die erste Stelle, die verschieden ist, entscheidet.',
  'vo-vzn': 'Vorgänger heißt eins weniger, Nachfolger heißt eins mehr. Rechne von der Zahl aus, die dasteht.',
  'vo-ordnen': 'Zähl zuerst die Stellen. Bei gleich vielen Stellen vergleichst du von links.',
  'vo-gerade': 'Geh in Zweierschritten von der ersten Grenze weiter und hör vor der zweiten Grenze auf.',
  'sw-zahlwort': 'Teil das Wort bei Million und tausend. Jeder Teil danach hat genau 3 Stellen.',
  'sw-tafel': 'Schreib die Stellen von groß nach klein und füll leere Stellen mit 0.',
  'sw-als-zahl': 'Schreib die Stellen von groß nach klein und füll leere Stellen mit 0. Zähl am Ende die Stellen nach.',
  'sw-ziffer': 'Zähl von rechts: E, Z, H, T, ZT, HT, M … Schreib die Ziffer mit dem Kürzel ihrer Stelle.',
  'sw-null': 'Verzehnfachen: Jede Ziffer rückt eine Stelle nach links, hinten kommt eine 0 dazu.',
  'rs-runden': 'Unterstreich die Stelle. Die Ziffer rechts daneben entscheidet: 0 bis 4 ab, 5 bis 9 auf. Rechts davon wird alles 0.',
  'rs-ueberschlag': 'Zuerst jede Zahl auf die Stelle runden, die in der Aufgabe steht. Dann mit den gerundeten Zahlen rechnen.',
  'add-kette': 'Rechne jeden Sprung in zwei Teilen: zuerst die Zehner, dann die Einer.',
  'sub-kette': 'Rechne jeden Sprung in zwei Teilen: zuerst die Zehner, dann die Einer.',
  'add-schriftlich': 'Einer unter Einer, von rechts rechnen, den Übertrag mitzählen. Vergleich mit dem Überschlag.',
  'sub-schriftlich': 'Mach die Probe: Ergebnis plus Subtrahend. Kommt genau der Minuend heraus?',
  'sub-begriffe': 'Schreib die Rechnung mit ? an. Rechne mit der Umkehraufgabe und mach die Probe.',
  'ta-rechnung': 'Stell dir die Geschichte vor: Wird es mehr oder weniger? Kommt mehrmals dasselbe dazu oder wird gerecht verteilt?',
  'ta-ganz': 'Geh die Aufgabe noch einmal durch: geg, ges, Rechnung. Passt dein Ergebnis zur Frage?',
  'mul-kopf-stufe': 'Zähl die Nullen: mal 10 eine, mal 100 zwei, mal 1 000 drei Nullen mehr.',
  'mul-kopf-nullen': 'Zuerst ohne Nullen rechnen, dann alle Nullen dazuzählen.',
  'mul-kopf-drei': 'Rechne in zwei Schritten: zuerst zwei Faktoren, dann mal den dritten. Vertauschen ist erlaubt.',
  'mul-kopf-klammer': 'Klammer zuerst, dann mal.',
  'mul-schriftlich': 'Rechne jede Zeile nach. Jede Zeile steht eine Stelle weiter rechts.',
  'div-kopf': 'Mach die Probe: Ergebnis mal Divisor muss den Dividenden geben.',
  'div-schriftlich-1': 'Mach die Probe: Quotient · Divisor (+ Rest). Kommt genau der Dividend heraus?',
  'div-schriftlich-2': 'Mach die Probe: Quotient · Divisor (+ Rest). Kommt genau der Dividend heraus?',
  'vb-regeln': 'Klampunstri: zuerst die Klammer, dann · und :, dann + und − von links nach rechts.',
  'vb-term': 'Lies den Satz Stück für Stück: Was wird zuerst gerechnet? Das kommt in Klammer.'
};

// Stellen von rechts: 0 = Einer … 9 = Milliarden
const STELLE = [
  { k: 'E', name: 'Einer' }, { k: 'Z', name: 'Zehner' }, { k: 'H', name: 'Hunderter' }, { k: 'T', name: 'Tausender' },
  { k: 'ZT', name: 'Zehntausender' }, { k: 'HT', name: 'Hunderttausender' }, { k: 'M', name: 'Millionen' },
  { k: 'ZM', name: 'Zehnmillionen' }, { k: 'HM', name: 'Hundertmillionen' }, { k: 'Md', name: 'Milliarden' }
];
// Ziffer an Stelle p in der Zahl unterstreichen (Markierung _x_ für den Lösungsweg): 63 482, p = 3 → „6_3_ 482“
function unterstreiche(n, p) {
  const s = F(n);
  let k = 0, out = '';
  for (let i = s.length - 1; i >= 0; i--) {
    const ch = s[i];
    if (/\d/.test(ch)) { out = (k === p ? `_${ch}_` : ch) + out; k++; } else out = ch + out;
  }
  return out;
}
// Runden auf Stelle p (0 = Einer): 0–4 ab, 5–9 auf
function rundeAuf(n, p) { const s = hoch(p); return Math.floor((n + s / 2) / s) * s; }

// ================================================================
// Rückmeldung je Fehlerart (Lernauftrag 2a und 2d).
// Kurz, freundlich, in der Sprache des Kindes, ohne Scham. Die Schlüssel stehen im Fortschritt (S.f[id].fa):
// nie umbenennen, nur dazuschreiben (Register tools/ids.txt).
// ================================================================
const FEHLERARTEN = {
  // Zahlenstrahl
  schritt: 'Zuerst den Schritt finden: Wie viel ist es von Strich zu Strich? Schau dir zwei beschriftete Striche an.',
  striche: 'Zähl die Schritte vom beschrifteten Strich aus. Der beschriftete Strich selbst zählt nicht mit.',
  mitte: 'Ein Kreuz zwischen zwei Strichen liegt genau in der Mitte: ein halber Schritt.',
  // Vergleichen und Ordnen
  zeichen: 'Von links vergleichen: Die erste Stelle, die verschieden ist, entscheidet. Die Spitze zeigt zur kleineren Zahl.',
  genau: 'Schau genau, Ziffer für Ziffer: Sind wirklich alle Stellen gleich?',
  stellen: 'Zuerst die Stellen zählen: Mehr Stellen heißt größer. Bei gleich vielen Stellen von links vergleichen.',
  richtung: 'Schau, womit du beginnst: mit der kleinsten oder mit der größten Zahl?',
  ueberNull: 'Eins weniger: Alle Nullen hinten werden 9, die Ziffer davor wird 1 kleiner. 3 400 → 3 399.',
  ueberNeun: 'Eins mehr: Alle Neuner hinten werden 0, die Ziffer davor wird 1 größer. 2 699 → 2 700.',
  vertauscht: 'Vorgänger heißt eins davor, also eins weniger. Nachfolger heißt eins danach, also eins mehr.',
  grenzen: 'Die Grenzen zählen nicht mit: nur die Zahlen dazwischen.',
  gerade: 'Gerade Zahlen enden auf 0, 2, 4, 6 oder 8. Ungerade auf 1, 3, 5, 7 oder 9.',
  // Stellenwert
  einerZehner: 'Du hörst die Einer zuerst, schreibst aber die Zehner zuerst: siebenundvierzig = 47.',
  nullen: 'Jede Stelle braucht eine Ziffer. Wo nichts ist, steht eine 0. Zähl die Stellen nach.',
  stelle: 'Zähl von rechts: E, Z, H, T, ZT, HT, M … An welcher Stelle steht die Ziffer?',
  // Runden und Überschlag
  abgerundet: 'Rechts daneben steht 5, 6, 7, 8 oder 9? Dann rundest du auf.',
  aufgerundet: 'Rechts daneben steht 0, 1, 2, 3 oder 4? Dann rundest du ab.',
  neunKippt: 'Aus der 9 wird beim Aufrunden 10: Die Ziffer davor wird 1 größer. 7 951 ≈ 8 000.',
  falscheStelle: 'Unterstreich zuerst die Stelle, auf die du rundest. Die Ziffer rechts daneben entscheidet.',
  ueGenau: 'Beim Überschlag rechnest du nicht genau: zuerst jede Zahl runden, dann rechnen.',
  ueErstRunden: 'Zuerst jede Zahl runden, dann rechnen. Nicht erst rechnen und dann runden.',
  ueUnter100: 'Wie im Heft: Zahlen unter 100 rundest du auf Zehner, größere auf Hunderter.',
  ueStelle: 'Wie im Heft: bei + und − auf Hunderter (Zahlen unter 100 auf Zehner), bei : beide Zahlen auf Zehner.',
  // Plus und Minus
  uebertrag: 'Der Übertrag zählt mit: klein dazuschreiben und in der nächsten Spalte mitrechnen.',
  zehner: 'Rechne in zwei Schritten: zuerst die Zehner, dann die Einer.',
  obenUnten: 'Immer oben minus unten. Ist oben weniger, ergänzt du und schreibst den Übertrag.',
  verrutscht: 'Stellengerecht untereinander: Einer unter Einer, Zehner unter Zehner.',
  vergessen: 'Nimm alle Zahlen der Rechnung mit.',
  umkehr: 'Gesucht ist ein Teil der Rechnung? Schreib sie mit ? an und rechne mit der Umkehraufgabe.',
  begriffe: 'Minuend − Subtrahend = Differenz. Summand + Summand = Summe.',
  umMehr: '„Um … größer“: Rechne zuerst die zweite Zahl aus, dann die Summe.',
  // Rechenart und Rechnung anschreiben
  rechenart: 'Stell dir die Geschichte vor: Wird es mehr oder weniger? Lies die Frage noch einmal.',
  signalwort: 'Achtung, Falle! Das Wort im Text passt hier nicht zur Rechnung. Stell dir die Geschichte vor.',
  umgedreht: 'Bei minus und geteilt durch steht die größere Zahl (das Ganze) vorne.',
  rechenfehler: 'Die Rechnung stimmt! Nur das Ergebnis nicht. Rechne noch einmal nach.',
  zahlen: 'Nimm genau die Zahlen aus dem Text, jede einmal.',
  klammer: 'Was zuerst gerechnet wird, kommt in Klammer. Klammer zuerst!',
  vonVerdreht: '„Subtrahiere 7 von 20“ heißt 20 − 7: Die Zahl nach „von“ steht vorne.',
  punktVorStrich: 'Punkt vor Strich: zuerst · und :, dann + und −. Klampunstri!',
  zweiSchritte: 'Zwei Schritte: Rechne zuerst a) und nimm das Ergebnis für b).',
  // Mal und Durch
  nullenMal: 'Zähl die Nullen: Bei · 100 kommen zwei Nullen dazu, bei · 1 000 drei.',
  extraNull: 'Aus 5 · 4 wird 20. Diese Null kommt noch zu den angehängten Nullen dazu.',
  faktor: 'Alle Faktoren mitnehmen: zuerst zwei zusammen, dann den dritten.',
  zeileVerrutscht: 'Jede Zeile eine Stelle weiter rechts. Der Punkt hält den Platz frei.',
  nullQuotient: 'Geht der Divisor nicht hinein, schreib 0 in den Quotienten.',
  restVergessen: 'Bleibt etwas übrig? Schreib den Rest mit R.',
  restZuGross: 'Der Rest muss kleiner sein als der Divisor. Sonst passt noch einmal hinein.',
  durchNull: 'Durch 0 kann man nicht dividieren: nicht möglich.',
  nullDurch: '0 geteilt durch eine Zahl ist 0. Nur durch 0 geht es nicht.',
  nullenStreichen: 'Gleich viele Nullen streichen: 54 000 : 60 = 5 400 : 6 = 900.',
  pruefen: 'Kann das stimmen? Mach einen Überschlag oder die Probe.'
};

// ================================================================
// Bereiche und Themen: Zettel des Lehrers (Lernauftrag Abschnitt 1)
// ================================================================
const bereiche = [
  { id: 'zahlen', titel: 'Natürliche Zahlen' },
  { id: 'plusminus', titel: 'Addition und Subtraktion' },
  { id: 'maldurch', titel: 'Multiplikation und Division' },
  { id: 'verbindung', titel: 'Verbindung (4 Rechenarten)' }
];
const themen = [
  { id: 'zahlenstrahl', titel: 'Zahlenstrahl', bereich: 'zahlen', quelle: 'Buch S. 30–33, Üb. S. 8–9' },
  { id: 'ordnen', titel: 'Vergleichen und Ordnen', bereich: 'zahlen', quelle: 'Buch S. 34–37, Üb. S. 10–11' },
  { id: 'stellenwert', titel: 'Stellenwert', bereich: 'zahlen', quelle: 'Buch S. 38–47, Üb. S. 12–13' },
  { id: 'runden', titel: 'Runden und Schätzen', bereich: 'zahlen', quelle: 'Buch S. 48–51, Üb. S. 14–15' },
  { id: 'addition', titel: 'Addition', bereich: 'plusminus', quelle: 'Buch S. 66–69, Üb. S. 20–21' },
  { id: 'subtraktion', titel: 'Subtraktion', bereich: 'plusminus', quelle: 'Buch S. 70–73, Üb. S. 22–23' },
  { id: 'text', titel: 'Textaufgaben', bereich: 'plusminus', quelle: 'Buch S. 74–75, Üb. S. 24–25' },
  { id: 'multiplikation', titel: 'Multiplikation', bereich: 'maldurch', quelle: 'Buch S. 88–93, Üb. S. 28–29' },
  { id: 'division', titel: 'Division', bereich: 'maldurch', quelle: 'Buch S. 94–99, Üb. S. 30–31' },
  { id: 'verbindung', titel: 'Verbindung der 4 Grundrechnungsarten', bereich: 'verbindung', quelle: 'Buch S. 100–103, Üb. S. 32–33' }
];

// ================================================================
// Zahlenstrahl (Üb. S. 8–9, Buch S. 30–33): bis 1 000, Schritt 1, 2, 5, 10, 20, 50, 100, nur manche Striche beschriftet,
// Start bei 0 oder ein Ausschnitt. 10 Abschnitte (11 Striche): passt auf 320 px, Tippflächen 26 px breit.
// ================================================================
const STRICHE = 10;
const STRAHL_ARTEN = [   // Schritt, Beschriftung an jedem k-ten Strich, Start ist ein Vielfaches von raster (0 = nur 0)
  { schritt: 1, k: 5, raster: 10 }, { schritt: 1, k: 10, raster: 10 },
  { schritt: 2, k: 5, raster: 10 },
  { schritt: 5, k: 2, raster: 10 }, { schritt: 5, k: 10, raster: 50 },
  { schritt: 10, k: 2, raster: 100 }, { schritt: 10, k: 5, raster: 100 }, { schritt: 10, k: 10, raster: 100 },
  { schritt: 20, k: 5, raster: 100 },
  { schritt: 50, k: 2, raster: 100 },
  { schritt: 100, k: 2, raster: 0 }, { schritt: 100, k: 5, raster: 0 }
];
const SCHRITTE = [1, 2, 5, 10, 20, 50, 100];
function strahlBauen(rnd) {
  const art = wahl(rnd, STRAHL_ARTEN), s = art.schritt;
  let start = 0;
  if (art.raster && rnd() < 0.65) start = zwischen(rnd, 1, Math.max(1, Math.floor((1000 - STRICHE * s) / art.raster))) * art.raster;
  const beschriftet = [];
  if (rnd() < 0.7) for (let i = 0; i <= STRICHE; i += art.k) beschriftet.push(i);
  else beschriftet.push(0, art.k);   // nur zwei Zahlen: den Schritt muss man ausrechnen
  return { art: 'strahl', start, schritt: s, striche: STRICHE, beschriftet };
}
const strichWert = (b, pos) => b.start + pos * b.schritt;
// 1. Schritt: den Schritt aus zwei beschrifteten Strichen finden
function strahlSchrittText(b) {
  const [i1, i2] = b.beschriftet, v1 = strichWert(b, i1), v2 = strichWert(b, i2), n = i2 - i1;
  return n === 1 ? `Von ${F(v1)} bis ${F(v2)} ist es ein Schritt: ${F(b.schritt)}.`
    : `Von ${F(v1)} bis ${F(v2)} sind es ${n} Schritte: ${F(v2 - v1)} : ${n} = ${F(b.schritt)} pro Schritt.`;
}
// Wie man zur Stelle pos kommt: vom nächsten beschrifteten Strich links davon
function strahlWegText(b, pos) {
  const L = Math.max(...b.beschriftet.filter(i => i <= Math.floor(pos))), vL = strichWert(b, L), v = strichWert(b, pos);
  if (pos % 1) return `genau zwischen ${F(strichWert(b, Math.floor(pos)))} und ${F(strichWert(b, Math.ceil(pos)))} → ${F(v)}`;
  const n = pos - L;
  return `${n} ${n === 1 ? 'Schritt' : 'Schritte'} nach ${F(vL)} → ${F(v)}`;
}
// Typische Fehlablesungen an der Stelle pos: falscher Schritt, ein Strich daneben, halber Schritt falsch
function strahlFehler(b, pos, setze) {
  const v = strichWert(b, pos), L = Math.max(...b.beschriftet.filter(i => i <= Math.floor(pos))), vL = strichWert(b, L);
  if (pos % 1) { setze(strichWert(b, Math.floor(pos)), 'mitte'); setze(strichWert(b, Math.ceil(pos)), 'mitte'); }
  setze(v - b.schritt, 'striche');
  setze(v + b.schritt, 'striche');
  for (const s of SCHRITTE) if (s !== b.schritt) { const w = vL + (pos - L) * s; if (Number.isInteger(w)) setze(w, 'schritt'); }
}

const zsAblesen = {
  id: 'zs-ablesen', thema: 'zahlenstrahl', titel: 'Zahlenstrahl ablesen', quelle: 'Üb. S. 8 Nr. 1–2, S. 9 Nr. 1 · Buch S. 30–33',
  rang: 1, wo: 'app', auswahl: false, nah: [], voraus: [], gewicht: 1, sek: 35, sekNeu: 50, varianten: ['strich', 'mitte'],
  erzeuge(rnd) {
    const b = strahlBauen(rnd);
    const frei = [];
    for (let i = 1; i <= b.striche; i++) if (!b.beschriftet.includes(i)) frei.push(i);
    const pos = mische(rnd, frei).slice(0, rnd() < 0.6 ? 3 : 4);
    // eines auch zwischen zwei Strichen (genau in der Mitte; nur bei geradem Schritt, damit es eine ganze Zahl ist)
    // Kreuze mindestens einen ganzen Schritt auseinander, sonst liegen sie in der Grafik übereinander
    let mitte = b.schritt % 2 === 0 && rnd() < 0.6;
    if (mitte) {
      const andere = pos.slice(0, -1), kandidaten = [];
      for (let i = 0; i < b.striche; i++) if (andere.every(p => Math.abs(p - (i + 0.5)) >= 1)) kandidaten.push(i + 0.5);
      if (kandidaten.length) pos[pos.length - 1] = wahl(rnd, kandidaten);
      else mitte = false;
    }
    pos.sort((x, y) => x - y);
    const namen = ['A', 'B', 'C', 'D'];
    b.kreuze = pos.map((p, i) => ({ name: namen[i], wert: strichWert(b, p) }));
    const loesung = b.kreuze.map(k => k.wert);
    const f = sammler(loesung.map((l, i) => `${i}:${l}`));
    pos.forEach((p, i) => strahlFehler(b, p, (w, art) => { if (zahlOk(w)) f.setze(`${i}:${w}`, art); }));
    return aufgabe('zs-ablesen', {
      variante: mitte ? 'mitte' : 'strich',
      kennung: `zs-ablesen|${b.start}|${b.schritt}|${b.beschriftet.join(',')}|${loesung.join(',')}`,
      text: 'Welche Zahlen gehören zu den Kreuzen?', term: '', bild: b,
      eingabe: 'felder', felder: b.kreuze.map(k => ({ art: 'zahl', label: k.name })),
      loesung,
      weg: [strahlSchrittText(b), b.kreuze.map((k, i) => `${k.name}: ${strahlWegText(b, pos[i])}`).join('; ')],
      fehler: f.map,
      rueck: { schritt: strahlSchrittText(b) }
    });
  }
};

const zsMarkieren = {
  id: 'zs-markieren', thema: 'zahlenstrahl', titel: 'Zahlen am Zahlenstrahl markieren', quelle: 'Üb. S. 9 Nr. 2 · Buch S. 30–33',
  rang: 2, wo: 'app', auswahl: false, nah: ['zs-ablesen'], voraus: [], gewicht: 1, sek: 30, sekNeu: 45, varianten: [],
  erzeuge(rnd) {
    const b = strahlBauen(rnd);
    b.kreuze = [];
    const frei = [];
    for (let i = 1; i <= b.striche; i++) if (!b.beschriftet.includes(i)) frei.push(i);
    const pos = mische(rnd, frei).slice(0, 3).sort((x, y) => x - y);
    const ziel = pos.map(p => strichWert(b, p));
    const f = sammler([schluessel('strahl', ziel)]);
    const verschoben = d => ziel.map(v => v + d * b.schritt);
    for (const d of [-1, 1]) { const w = verschoben(d); if (w.every(x => x >= b.start && x <= strichWert(b, b.striche))) f.setze(schluessel('strahl', w), 'striche'); }
    return aufgabe('zs-markieren', {
      kennung: `zs-markieren|${b.start}|${b.schritt}|${b.beschriftet.join(',')}|${ziel.join(',')}`,
      text: 'Setz bei jeder Zahl ein Kreuz.', term: '', bild: b, eingabe: 'strahl', ziel, loesung: ziel,
      weg: [strahlSchrittText(b), pos.map(p => strahlWegText(b, p)).join('; ')],
      fehler: f.map, rueck: { _: `Hier ist ein Schritt ${F(b.schritt)}. Zähl vom beschrifteten Strich aus weiter.` }
    });
  }
};

// ================================================================
// Vergleichen und Ordnen (Üb. S. 10–11, Buch S. 34–37)
// ================================================================
const voZeichen = {
  id: 'vo-zeichen', thema: 'ordnen', titel: 'Vergleichen: < > =', quelle: 'Üb. S. 10 Nr. 2 · Buch S. 34–37',
  rang: 1, wo: 'app', auswahl: true, nah: ['vo-ordnen'], voraus: [], gewicht: 1, sek: 18, sekNeu: 30, varianten: ['gleich', 'nachbar', 'weit'],
  erzeuge(rnd) {
    // Paare aus gleichen Ziffern (Zahlendreher), gleich lang, auch = (Lernauftrag 2a)
    const len = gewichtet(rnd, [[3, 1], [4, 4], [5, 3], [6, 2], [7, 1]]);
    let ds = ziffernMit(rnd, len, 0.2);
    for (let v = 0; v < 20 && new Set(ds).size < 2; v++) ds = ziffernMit(rnd, len, 0.2);
    const a = ausZiffern(ds);
    let variante = gewichtet(rnd, [['gleich', 15], ['nachbar', 55], ['weit', 30]]);
    let b = a;
    if (variante !== 'gleich') {
      for (let v = 0; v < 40 && b === a; v++) {
        const i = zwischen(rnd, 0, len - 2), j = variante === 'nachbar' ? i + 1 : zwischen(rnd, i + 1, len - 1);
        if (ds[i] === ds[j] || (i === 0 && ds[j] === 0)) continue;
        const e = ds.slice(); const t = e[i]; e[i] = e[j]; e[j] = t;
        b = ausZiffern(e);
      }
      if (b === a) variante = 'gleich';
    }
    const [x, y] = rnd() < 0.5 ? [a, b] : [b, a];
    const l = x < y ? '<' : x > y ? '>' : '=';
    const sx = String(x), sy = String(y);
    let k = 0;
    while (k < sx.length && sx[k] === sy[k]) k++;
    const zeile2 = l === '=' ? 'Alle Stellen sind gleich.'
      : `Die erste verschiedene Stelle sind die ${STELLE[sx.length - 1 - k].name}: ${sx[k]} ${l} ${sy[k]}.`;
    const fehler = l === '=' ? { '<': 'genau', '>': 'genau' } : { [l === '<' ? '>' : '<']: 'zeichen', '=': 'genau' };
    return aufgabe('vo-zeichen', {
      variante, text: 'Setze <, > oder = ein.', term: `${F(x)} ○ ${F(y)}`, eingabe: 'vergleich', loesung: l,
      weg: [`Beide haben ${len} Stellen: von links Stelle für Stelle vergleichen.`, zeile2, `${F(x)} ${l} ${F(y)}`],
      fehler
    });
  }
};

// Alle Zahlen aus 1 … n der gegebenen Ziffern (jede Ziffer höchstens einmal, keine führende 0), nach Länge
function zahlenAusZiffern(ziffern) {
  const nachLaenge = {};
  const bilde = (rest, vorn) => {
    if (vorn.length && vorn[0] !== 0) (nachLaenge[vorn.length] = nachLaenge[vorn.length] || new Set()).add(ausZiffern(vorn));
    if (!rest.length) return;
    rest.forEach((d, i) => bilde(rest.filter((_, j) => j !== i), [...vorn, d]));
  };
  bilde(ziffern, []);
  return nachLaenge;
}
const voOrdnen = {
  id: 'vo-ordnen', thema: 'ordnen', titel: 'Ordnen', quelle: 'Üb. S. 10 Nr. 3–4, S. 11 Nr. 1 · Buch S. 34–37',
  rang: 3, wo: 'app', auswahl: false, nah: ['vo-zeichen'], voraus: [], gewicht: 1, sek: 25, sekNeu: 40, varianten: ['vo-ordnen-auf', 'vo-ordnen-ab'],
  erzeuge(rnd) {
    // 6 Zahlen aus denselben Ziffern, verschieden lang (506, 56, 650, 5, 65, 605) – Falle: nach Ziffern statt nach Stellen
    let auswahl = [];
    for (let v = 0; v < 30; v++) {
      const vier = rnd() < 0.35, n = vier ? 4 : 3, mitNull = rnd() < 0.6;
      const pool = mische(rnd, [1, 2, 3, 4, 5, 6, 7, 8, 9]).slice(0, mitNull ? n - 1 : n);
      const nachLaenge = zahlenAusZiffern(mitNull ? [0, ...pool] : pool);
      const plan = vier ? [[2, 1], [3, 2], [4, 3]] : [[1, 1], [2, 2], [3, 3]];
      auswahl = [];
      for (const [len, k] of plan) auswahl.push(...mische(rnd, [...(nachLaenge[len] || [])]).slice(0, k));
      const nachGroesse = auswahl.slice().sort((x, y) => x - y).join(), nachZiffernF = auswahl.slice().sort((x, y) => (String(x) < String(y) ? -1 : 1)).join();
      if (auswahl.length === 6 && nachGroesse !== nachZiffernF) break;   // nur mit Falle: nach Ziffern sortiert wäre falsch
    }
    const richtung = rnd() < 0.6 ? 'auf' : 'ab';
    const zahlen = mische(rnd, auswahl);
    const auf = auswahl.slice().sort((x, y) => x - y);
    const loesung = richtung === 'auf' ? auf : auf.slice().reverse();
    const nachZiffern = auswahl.slice().sort((x, y) => (String(x) < String(y) ? -1 : 1));
    const f = sammler([loesung.join('|')]);
    f.setze((richtung === 'auf' ? nachZiffern : nachZiffern.slice().reverse()).join('|'), 'stellen');
    f.setze(loesung.slice().reverse().join('|'), 'richtung');
    f.setze((richtung === 'auf' ? nachZiffern.slice().reverse() : nachZiffern).join('|'), 'stellen');
    const zeichen = richtung === 'auf' ? ' < ' : ' > ';
    const laengste = auf.filter(z => stellenVon(z) === stellenVon(auf[auf.length - 1]));
    return aufgabe('vo-ordnen', {
      variante: richtung === 'auf' ? 'vo-ordnen-auf' : 'vo-ordnen-ab',
      kennung: `vo-ordnen|${richtung}|${zahlen.join(',')}`,
      text: `Ordne der Größe nach. Beginne mit der ${richtung === 'auf' ? 'kleinsten' : 'größten'} Zahl.`, term: '',
      eingabe: 'ordnen', zahlen, richtung, loesung,
      weg: ['Zähl zuerst die Stellen: Weniger Stellen heißt kleiner.',
        `Gleich viele Stellen: von links vergleichen, z. B. ${laengste.map(F).join(' < ')}.`,
        loesung.map(F).join(zeichen)],
      fehler: f.map
    });
  }
};

const voVzn = {
  id: 'vo-vzn', thema: 'ordnen', titel: 'Vorgänger und Nachfolger', quelle: 'Üb. S. 10 Nr. 1 · Buch S. 34–37',
  rang: 2, wo: 'app', auswahl: false, nah: [], voraus: [], gewicht: 1, sek: 15, sekNeu: 25, varianten: ['null', 'neun', 'frei'],
  erzeuge(rnd, opt = {}) {
    // bis 10 000, oft an …99/…00 und …999/…000 (Lernauftrag 2a); Falle: eins zurück über die Null.
    // Einstufung auf Schularbeits-Niveau: immer mit Falle
    const d = gewichtet(rnd, [[3, 15], [4, 85]]);
    const variante = opt.zweck === 'beispiel' ? 'null' : opt.zweck === 'einstufung' ? gewichtet(rnd, [['null', 55], ['neun', 45]])
      : gewichtet(rnd, [['null', 40], ['neun', 35], ['frei', 25]]);
    let x;
    if (variante === 'frei') x = zahlMit(rnd, d);
    else {
      const k = Math.min(d - 1, gewichtet(rnd, [[1, 10], [2, 60], [3, 30]]));
      const R = zwischen(rnd, hoch(d - 1 - k), hoch(d - k) - 1) * hoch(k);
      x = variante === 'null' ? R : R - 1;
      if (x < 101) x = R;
    }
    const werte = [x - 1, x, x + 1], namen = ['Vorgänger', 'Zahl', 'Nachfolger'];
    const g = zwischen(rnd, 0, 2);
    const idx = [0, 1, 2].filter(i => i !== g);
    const loesung = idx.map(i => werte[i]);
    const f = sammler(loesung.map((l, i) => `${i}:${l}`));
    idx.forEach((wi, i) => {
      const c = werte[wi];
      if (c < werte[g]) {
        // nach unten gerechnet: über die Null zurück (3 400 → 3 399)
        const Y = c + 1;
        let t = 0;
        while (t < 6 && Y % hoch(t + 1) === 0) t++;
        for (let j = 1; j <= t; j++) f.setze(`${i}:${Y - hoch(j)}`, 'ueberNull');
        if (t) f.setze(`${i}:${Y - 1 + hoch(t)}`, 'ueberNull');
      } else {
        // nach oben gerechnet: über die Neun (2 699 → 2 700)
        let t = 0;
        while (t < 6 && c % hoch(t + 1) === 0 && c > 0) t++;
        for (let j = 1; j <= t; j++) f.setze(`${i}:${c - hoch(j)}`, 'ueberNeun');
      }
    });
    // Vorgänger und Nachfolger vertauscht (nur wenn beide gefragt sind)
    if (g === 1) { f.setze(`0:${werte[2]}`, 'vertauscht'); f.setze(`1:${werte[0]}`, 'vertauscht'); }
    // Regel nach der Richtung des Schritts, der über eine Null (nach unten) oder eine Neun (nach oben) geht
    let regel = 'Vorgänger = eins weniger, Nachfolger = eins mehr.';
    idx.forEach(i => { if (i < g && werte[i] % 10 === 9) regel = FEHLERARTEN.ueberNull; if (i > g && werte[i] % 10 === 0) regel = FEHLERARTEN.ueberNeun; });
    const start = g === 0 ? `Die Zahl ist eins mehr als der Vorgänger ${F(werte[0])}.`
      : g === 1 ? `Vorgänger: eins weniger als ${F(x)}. Nachfolger: eins mehr.`
        : `Die Zahl ist eins weniger als der Nachfolger ${F(werte[2])}.`;
    return aufgabe('vo-vzn', {
      variante, text: 'Ergänze Vorgänger, Zahl und Nachfolger.', term: `${namen[g]}: ${F(werte[g])}`,
      eingabe: 'felder', felder: idx.map(i => ({ art: 'zahl', label: namen[i] })), loesung,
      weg: [start, regel, werte.map(F).join(', ')],
      fehler: f.map
    });
  }
};

const voGerade = {
  id: 'vo-gerade', thema: 'ordnen', titel: 'Gerade und ungerade Zahlen', quelle: 'Üb. S. 11 Nr. 2–3',
  rang: 4, wo: 'app', auswahl: false, nah: [], voraus: [], gewicht: 1, sek: 30, sekNeu: 45, varianten: ['gerade', 'ungerade'],
  erzeuge(rnd) {
    // Abstand bis ca. 20, Grenzen zählen nicht mit (Lernauftrag 2a)
    const gerade = rnd() < 0.6;
    const von = rnd() < 0.7 ? zwischen(rnd, 10, 980) : zwischen(rnd, 1000, 9980);
    const bis = von + zwischen(rnd, 8, 20);
    const liste = [];
    for (let n = von + 1; n < bis; n++) if ((n % 2 === 0) === gerade) liste.push(n);
    const f = sammler([schluessel('liste', liste)]);
    const mitGrenzen = liste.slice();
    if ((von % 2 === 0) === gerade) mitGrenzen.unshift(von);
    if ((bis % 2 === 0) === gerade) mitGrenzen.push(bis);
    f.setze(mitGrenzen.join('|'), 'grenzen');
    const anders = [];
    for (let n = von + 1; n < bis; n++) if ((n % 2 === 0) !== gerade) anders.push(n);
    f.setze(anders.join('|'), 'gerade');
    return aufgabe('vo-gerade', {
      variante: gerade ? 'gerade' : 'ungerade',
      text: `Schreib alle ${gerade ? 'geraden' : 'ungeraden'} Zahlen zwischen ${F(von)} und ${F(bis)}.`, term: '',
      eingabe: 'liste', loesung: liste,
      weg: [`${gerade ? 'Gerade' : 'Ungerade'} Zahlen enden auf ${gerade ? '0, 2, 4, 6 oder 8' : '1, 3, 5, 7 oder 9'}.`,
        `Die Grenzen ${F(von)} und ${F(bis)} zählen nicht mit.`, liste.map(F).join(', ')],
      fehler: f.map
    });
  }
};

// ================================================================
// Stellenwert (Üb. S. 12–13, Buch S. 38–47): Zahlwörter, Stellenwerttafel, Kürzel wie im Buch („4ZT 6H 2E“)
// ================================================================
const EINER = ['', 'ein', 'zwei', 'drei', 'vier', 'fünf', 'sechs', 'sieben', 'acht', 'neun'];
const ZEHN_BIS = ['zehn', 'elf', 'zwölf', 'dreizehn', 'vierzehn', 'fünfzehn', 'sechzehn', 'siebzehn', 'achtzehn', 'neunzehn'];
const ZEHNER = ['', 'zehn', 'zwanzig', 'dreißig', 'vierzig', 'fünfzig', 'sechzig', 'siebzig', 'achtzig', 'neunzig'];
function wort100(n, ende) {   // 0 … 99; ende = steht ganz hinten (1 → „eins“)
  if (!n) return '';
  if (n === 1) return ende ? 'eins' : 'ein';
  if (n < 10) return EINER[n];
  if (n < 20) return ZEHN_BIS[n - 10];
  const z = Math.floor(n / 10), e = n % 10;
  return e ? `${EINER[e]}und${ZEHNER[z]}` : ZEHNER[z];
}
function wort1000(n, ende) {   // 0 … 999
  const h = Math.floor(n / 100), r = n % 100;
  return (h ? EINER[h] + 'hundert' : '') + wort100(r, ende);
}
// Zahlwort wie im Buch: unter einer Million in einem Wort, Millionen getrennt („zwei Millionen dreihundertvierzigtausendsiebzehn“)
function zahlwortTeile(n) {
  const mio = Math.floor(n / 1e6), t = Math.floor(n / 1000) % 1000, r = n % 1000;
  const teile = [];
  if (mio) teile.push(mio === 1 ? 'eine Million' : `${wort1000(mio, false)} Millionen`);
  if (t) teile.push(wort1000(t, false) + 'tausend');
  if (r) teile.push(wort1000(r, true));
  return teile;
}
function zahlwort(n) {
  if (!n) return 'null';
  const teile = zahlwortTeile(n);
  const mio = Math.floor(n / 1e6);
  return mio ? `${teile[0]}${teile.length > 1 ? ' ' + teile.slice(1).join('') : ''}` : teile.join('');
}
// Dreiergruppen von hinten: 2 340 017 → [2, 340, 17]
function gruppen(n) { const g = []; do { g.unshift(n % 1000); n = Math.floor(n / 1000); } while (n > 0); return g; }
const ausGruppen = g => g.reduce((a, x) => a * 1000 + x, 0);

const swZahlwort = {
  id: 'sw-zahlwort', thema: 'stellenwert', titel: 'Zahlwort in Ziffern', quelle: 'Üb. S. 13 Nr. 1, S. 11 Nr. 4 · Buch S. 38–47',
  rang: 1, wo: 'app', auswahl: false, nah: ['sw-tafel', 'sw-als-zahl'], voraus: [], gewicht: 1, sek: 15, sekNeu: 25, varianten: [],
  erzeuge(rnd, opt = {}) {
    // ab 2 Stellen bis Millionen; Fallen: „…und…zig“ (Einer zuerst gesprochen) und Nullen in den Gruppen
    let n = 340017;
    for (let v = 0; v < 60; v++) {
      const d = ZWECK_VOLL.has(opt.zweck) ? zwischen(rnd, 5, 8) : gewichtet(rnd, [[2, 4], [3, 8], [4, 14], [5, 20], [6, 26], [7, 20], [8, 8]]);
      const m = ausZiffern(ziffernMit(rnd, d, 0.3));
      const mio = Math.floor(m / 1e6);
      if (mio > 1 && mio % 100 === 1) continue;   // „hunderteine Millionen“ meiden
      if (opt.zweck === 'beispiel' && !(gruppen(m).some(g => g % 100 > 20 && g % 10) && gruppen(m).slice(1).some(g => g < 100))) continue;
      n = m;
      break;
    }
    const g = gruppen(n);
    const f = sammler([String(n)]);
    g.forEach((x, k) => {
      const z = Math.floor(x / 10) % 10, e = x % 10;
      if (z && e && z !== e) f.setze(String(ausGruppen(g.map((y, j) => (j === k ? y - 10 * z - e + 10 * e + z : y)))), 'einerZehner');
    });
    f.setze(String(Number(g.map(String).join(''))), 'nullen');   // Gruppen ohne Nullen vorne: 340 017 → 34017
    f.setze(String(n * 10), 'nullen');
    if (n % 10 === 0) f.setze(String(n / 10), 'nullen');
    const und = g.map(x => x % 100).find(x => x > 20 && x % 10);
    return aufgabe('sw-zahlwort', {
      text: 'Schreib die Zahl mit Ziffern.', term: zahlwort(n), eingabe: 'zahl', loesung: n,
      weg: [n >= 1000 ? `Teil das Wort bei Million und tausend: ${zahlwortTeile(n).join(' | ')}` : `Zuerst die Hunderter, dann Zehner und Einer: ${zahlwort(n)}`,
        n >= 1000 ? `Jeder Teil nach der Million oder dem Tausend hat 3 Stellen: ${g.map((x, k) => (k ? String(x).padStart(3, '0') : String(x))).join(' | ')}` : `${Math.floor(n / 100)} H, ${Math.floor(n / 10) % 10} Z, ${n % 10} E`,
        F(n)],
      fehler: f.map,
      rueck: und ? { einerZehner: `„${wort100(und, true)}“: Du hörst die Einer zuerst, geschrieben wird ${und}.` } : {}
    });
  }
};

// Zahl aus 2–4 Stellen ≠ 0 (die übrigen Nullen): { map: { ZT: 4, H: 6, E: 2 }, n }
function stellenZahl(rnd, minD, maxD, kMin, kMax) {
  const d = zwischen(rnd, minD, maxD), k = Math.min(d, zwischen(rnd, kMin, kMax));
  const pos = new Set([d - 1]);
  for (let v = 0; v < 50 && pos.size < k; v++) pos.add(zwischen(rnd, 0, d - 2));
  const map = {};
  let n = 0;
  for (const p of pos) { const z = zwischen(rnd, 1, 9); map[STELLE[p].k] = z; n += z * hoch(p); }
  return { map, n, d };
}
// Typische Fehler beim Zusammensetzen: Nullen in einer Dreiergruppe fehlen, eine Null zu viel oder zu wenig
function nullenFehler(n, setze) {
  setze(Number(String(n).replace(/0/g, '')), 'nullen');
  setze(Number(gruppen(n).map(String).join('')), 'nullen');
  const g = gruppen(n);
  g.forEach((x, k) => { if (k && !x) setze(ausGruppen(g.filter((_, j) => j !== k)), 'nullen'); });
  setze(n * 10, 'nullen');
  if (n % 10 === 0) setze(n / 10, 'nullen');
}
function ziffernZeile(n) {   // „ZT T H Z E: 4 0 6 0 2“
  const s = String(n);
  return `${s.split('').map((_, i) => STELLE[s.length - 1 - i].k).join(' ')}: ${s.split('').join(' ')}`;
}
const swTafel = {
  id: 'sw-tafel', thema: 'stellenwert', titel: 'Stellenwerttafel', quelle: 'Üb. S. 12 Nr. 1, S. 13 Nr. 1 · Buch S. 38–47',
  rang: 2, wo: 'app', auswahl: false, nah: ['sw-als-zahl', 'sw-zahlwort'], voraus: [], gewicht: 1, sek: 20, sekNeu: 30, varianten: ['zur-zahl', 'zu-kuerzeln'],
  erzeuge(rnd) {
    // Tafel bis M; 2–4 Ziffern ≠ 0, sonst Nullen; beide Richtungen (Lernauftrag 2a)
    const { map, n } = stellenZahl(rnd, 3, 7, 2, 4);
    const kt = kuerzelText(map);
    if (rnd() < 0.5) {
      const f = sammler([String(n)]);
      nullenFehler(n, (w, art) => { if (zahlOk(w)) f.setze(String(w), art); });
      return aufgabe('sw-tafel', {
        variante: 'zur-zahl', text: 'Schreib als Zahl.', term: kt, eingabe: 'zahl', loesung: n,
        weg: [`Die größte Stelle ist ${KUERZEL.find(k => map[k])}: Die Zahl hat ${stellenVon(n)} Stellen. Leere Stellen bekommen eine 0.`, ziffernZeile(n), F(n)],
        fehler: f.map
      });
    }
    const f = sammler([kt]);
    for (const d of [-1, 1]) {
      const m = {};
      let ok = true;
      for (const k of Object.keys(map)) { const p = STELLE.findIndex(s => s.k === k) + d; if (p < 0 || p > 9) ok = false; else m[STELLE[p].k] = map[k]; }
      if (ok) f.setze(kuerzelText(m), 'stelle');
    }
    return aufgabe('sw-tafel', {
      variante: 'zu-kuerzeln', text: 'Schreib mit Stellenwerten wie im Buch.', term: F(n), eingabe: 'kuerzel', loesung: kt,
      weg: ['Von rechts: E, Z, H, T, ZT, HT, M – welche Ziffer steht an welcher Stelle?', ziffernZeile(n), `Nullen fallen weg: ${kt}`],
      fehler: f.map, rueck: { _: 'Schreib zu jeder Ziffer das Kürzel ihrer Stelle, von rechts gezählt: E, Z, H, T … Nullen lässt du weg.' }
    });
  }
};

const swAlsZahl = {
  id: 'sw-als-zahl', thema: 'stellenwert', titel: 'Stellenwerte als Zahl', quelle: 'Üb. S. 12 Nr. 2 · Buch S. 38–47',
  rang: 3, wo: 'app', auswahl: false, nah: ['sw-tafel', 'sw-zahlwort'], voraus: ['sw-tafel'], gewicht: 1, sek: 20, sekNeu: 30, varianten: [],
  erzeuge(rnd) {
    // bis Milliarden, viele Nullstellen (2Md 5HT 3Z → 2 000 500 030): mindestens eine Dreiergruppe ganz aus Nullen
    let z = stellenZahl(rnd, 7, 10, 2, 4);
    for (let v = 0; v < 40 && !gruppen(z.n).slice(1).some(x => x === 0 || x < 10); v++) z = stellenZahl(rnd, 7, 10, 2, 4);
    const { map, n } = z;
    const f = sammler([String(n)]);
    nullenFehler(n, (w, art) => { if (zahlOk(w)) f.setze(String(w), art); });
    return aufgabe('sw-als-zahl', {
      text: 'Schreib als Zahl.', term: kuerzelText(map), eingabe: 'zahl', loesung: n,
      weg: [`Die größte Stelle ist ${KUERZEL.find(k => map[k])}: Die Zahl hat ${stellenVon(n)} Stellen. Leere Stellen bekommen eine 0.`, ziffernZeile(n), F(n)],
      fehler: f.map
    });
  }
};

const swZiffer = {
  id: 'sw-ziffer', thema: 'stellenwert', titel: 'Ziffer und Stellenwert', quelle: 'Üb. S. 13 Nr. 2–3',
  rang: 4, wo: 'app', auswahl: false, nah: ['sw-tafel'], voraus: [], gewicht: 1, sek: 10, sekNeu: 20, varianten: [],
  erzeuge(rnd) {
    // bis 10 Stellen, die gefragte Ziffer kommt nur einmal vor (Lernauftrag 2a)
    let ds = [], p = 0, z = 1;
    for (let v = 0; v < 60; v++) {
      ds = ziffernMit(rnd, zwischen(rnd, 5, 10), 0.15);
      const kandidaten = [...new Set(ds)].filter(x => x && ds.indexOf(x) === ds.lastIndexOf(x));
      if (!kandidaten.length) continue;
      z = wahl(rnd, kandidaten);
      p = ds.length - 1 - ds.indexOf(z);
      break;
    }
    if (!ds.length || ds.indexOf(z) < 0) { ds = [3, 2, 6, 1, 0, 8, 7]; z = 6; p = 4; }
    const n = ausZiffern(ds), loesung = `${z}${STELLE[p].k}`;
    const f = sammler([loesung]);
    if (p > 0) f.setze(`${z}${STELLE[p - 1].k}`, 'stelle');
    if (p < 9) f.setze(`${z}${STELLE[p + 1].k}`, 'stelle');
    const beispiel = z === 4 ? '7H' : '4H';
    return aufgabe('sw-ziffer', {
      text: `Welchen Stellenwert hat die Ziffer ${z}? Schreib Ziffer und Kürzel, z. B. ${beispiel}.`, term: F(n),
      eingabe: 'kuerzel', loesung,
      weg: ['Von rechts zählen: E, Z, H, T, ZT, HT, M, ZM, HM, Md.', `Die ${z} steht an der ${p + 1}. Stelle von rechts: ${STELLE[p].name}.`, loesung],
      fehler: f.map
    });
  }
};

const swNull = {
  id: 'sw-null', thema: 'stellenwert', titel: 'Verzehnfachen', quelle: 'Üb. S. 13 Nr. 4',
  rang: 5, wo: 'app', auswahl: false, nah: ['mul-kopf-stufe'], voraus: [], gewicht: 1, sek: 10, sekNeu: 15, varianten: [],
  erzeuge(rnd) {
    // 34 506 → 345 060 (4–6 Stellen): jede Ziffer rückt eine Stelle nach links
    const n = ausZiffern(ziffernMit(rnd, zwischen(rnd, 4, 6), 0.25));
    const f = sammler([String(n * 10)]);
    f.setze(String(n * 100), 'nullen');
    if (n % 10 === 0) f.setze(String(n), 'nullen');
    return aufgabe('sw-null', {
      text: 'Verzehnfache die Zahl.', term: F(n), eingabe: 'zahl', loesung: n * 10,
      weg: ['Verzehnfachen: Jede Ziffer rückt eine Stelle nach links.', 'Hinten kommt eine 0 dazu.', F(n * 10)],
      fehler: f.map
    });
  }
};

// ================================================================
// Runden und Überschlag (Üb. S. 14–15, 20–22, Buch S. 49–51, Heft)
// Überschlag wie im Heft: „Ü:“ als Kette mit =, kein ≈. Bei + und − auf Hunderter (Zahlen unter 100 auf Zehner),
// bei : beide Zahlen auf Zehner, dann Nullen streichen, bei · keiner.
// ================================================================
const rsRunden = {
  id: 'rs-runden', thema: 'runden', titel: 'Runden', quelle: 'Üb. S. 14–15 · Buch S. 49–51',
  rang: 1, wo: 'app', auswahl: false, nah: ['rs-ueberschlag'], voraus: [], gewicht: 1, sek: 10, sekNeu: 20, varianten: ['45', 'neun', 'frei'],
  erzeuge(rnd, opt = {}) {
    // bis 6 Stellen, auf Z, H, T, ZT; Fallen: rechts daneben 4 oder 5, eine 9 kippt (Lernauftrag 2a)
    const p = gewichtet(rnd, [[1, 25], [2, 35], [3, 30], [4, 10]]);
    const d = zwischen(rnd, Math.max(p + 1, 3), 6);
    const ds = ziffernMit(rnd, d, 0.15);
    const iP = d - 1 - p, iR = iP + 1;
    if (ds.slice(iR).every(x => x === 0)) ds[d - 1] = zwischen(rnd, 1, 9);   // nie eine Zahl, die schon gerundet ist
    const variante = opt.zweck === 'beispiel' ? '45' : opt.zweck === 'einstufung' ? gewichtet(rnd, [['45', 55], ['neun', 45]])
      : gewichtet(rnd, [['45', 35], ['neun', 25], ['frei', 40]]);   // Einstufung auf Schularbeits-Niveau: immer mit Falle
    if (variante === '45') ds[iR] = rnd() < 0.5 ? 4 : 5;
    if (variante === 'neun') {
      ds[iP] = 9;
      ds[iR] = zwischen(rnd, 5, 9);
      if (iP > 0 && rnd() < 0.4) ds[iP - 1] = 9;
      if (ds[0] === 0) ds[0] = 9;
    }
    const n = ausZiffern(ds), s = hoch(p), rest = n % s, auf = rest >= s / 2;
    const r = rundeAuf(n, p), unten = n - rest;
    const f = sammler([String(r)]);
    if (auf && ziffer(n, p) === 9) f.setze(String(Math.floor(n / (s * 10)) * s * 10), 'neunKippt');
    f.setze(String(auf ? unten : unten + s), auf ? 'abgerundet' : 'aufgerundet');
    if (p > 1) f.setze(String(rundeAuf(n, p - 1)), 'falscheStelle');
    if (p + 1 < stellenVon(n)) f.setze(String(rundeAuf(n, p + 1)), 'falscheStelle');
    const rz = ziffer(n, p - 1), stelle = STELLE[p].name, zp = ziffer(n, p);
    const zeile2 = !auf ? `${rz} heißt abrunden: Die ${zp} bleibt, rechts davon wird alles 0.`
      : zp === 9 ? `${rz} heißt aufrunden: Aus der 9 wird 10 – die Ziffer davor wird 1 größer, rechts alles 0.`
        : `${rz} heißt aufrunden: Aus der ${zp} wird ${zp + 1}, rechts davon wird alles 0.`;
    return aufgabe('rs-runden', {
      variante, text: `Runde auf ${stelle}.`, term: F(n), eingabe: 'zahl', loesung: r,
      weg: [`${stelle} unterstreichen: ${unterstreiche(n, p)}. Rechts daneben steht ${rz}.`, zeile2, `${F(n)} ≈ ${F(r)}`],
      fehler: f.map,
      rueck: { abgerundet: `Rechts neben der ${stelle}-Ziffer steht ${rz}: aufrunden.`, aufgerundet: `Rechts neben der ${stelle}-Ziffer steht ${rz}: abrunden.` }
    });
  }
};

// Überschlag nach dem Heft: Zahl für + und −
const ueRund = n => (n < 100 ? rundeAuf(n, 1) : rundeAuf(n, 2));
function plusMinusZahlen(rnd, d) {   // Zahl mit d Stellen, oft mit 4 oder 5 an der Rundungsstelle (Falle)
  const ds = ziffernMit(rnd, d, 0.15);
  if (d >= 3 && rnd() < 0.35) ds[d - 2] = rnd() < 0.5 ? 4 : 5;
  return ausZiffern(ds);
}
const rsUeberschlag = {
  id: 'rs-ueberschlag', thema: 'runden', titel: 'Überschlag', quelle: 'Üb. S. 20 Nr. 2, S. 21 Nr. 3, S. 22 Nr. 2 · Heft (Ü)',
  rang: 2, wo: 'app', auswahl: false, nah: ['rs-runden'], voraus: ['rs-runden'], gewicht: 1, sek: 20, sekNeu: 30,
  varianten: ['hunderter', 'unter100', 'zehner', 'durch'],
  erzeuge(rnd) {
    // Die Aufgabe nennt immer die Stelle (Projektleitung 16.11.): meist Hunderter; Zahlen unter 100 auf Zehner; hin und
    // wieder die ganze Rechnung auf Zehner (so auch im Heft); bei : beide auf Zehner, dann Nullen
    // streichen. Bei · nie ein Überschlag.
    const variante = gewichtet(rnd, [['hunderter', 45], ['unter100', 20], ['zehner', 15], ['durch', 20]]);
    for (let v = 0; v < 80; v++) {
      const f = sammler([]);
      let zahlen, op, ue, genau, weg, text;
      if (variante === 'durch') {
        const d = zwischen(rnd, 11, 25), q = zwischen(rnd, 12, 99), n = d * q + zwischen(rnd, 0, d - 1);
        const N = rundeAuf(n, 1), D = rundeAuf(d, 1);
        if (N % D || N / D < 2 || [n, d, N, D].includes(N / D)) continue;   // weg[0] darf das Ergebnis nicht verraten
        op = ':'; zahlen = [n, d]; ue = N / D; genau = n % d ? null : n / d;
        const s0 = D % 100 === 0 ? 2 : 1;   // so viele Nullen hat der gerundete Divisor
        text = 'Überschlag: Runde beide Zahlen auf Zehner und streich die Nullen.';
        weg = [`Beide Zahlen auf Zehner: ${F(n)} → ${F(N)}, ${d} → ${D}`, `Nullen streichen: ${F(N)} : ${D} = ${F(N / hoch(s0))} : ${D / hoch(s0)}`, `Ü: ${F(N)} : ${D} = ${F(ue)}`];
        f.setze(String(ue * 10), 'nullenStreichen');
        if (ue % 10 === 0) f.setze(String(ue / 10), 'nullenStreichen');
        const N2 = rundeAuf(n, 2);
        if (N2 % D === 0) f.setze(String(N2 / D), 'ueStelle');
      } else {
        op = rnd() < 0.5 ? '+' : '−';
        const k = variante === 'zehner' && op === '+' ? gewichtet(rnd, [[3, 50], [4, 50]]) : gewichtet(rnd, [[2, 60], [3, 40]]);
        zahlen = [];
        for (let i = 0; i < k; i++) {
          let d;
          if (variante === 'zehner') d = i === 0 ? zwischen(rnd, 3, 4) : gewichtet(rnd, [[1, 10], [2, 45], [3, 45]]);
          else if (variante === 'unter100') d = i === k - 1 ? 2 : zwischen(rnd, 3, 4);
          else d = zwischen(rnd, 3, 4);
          zahlen.push(plusMinusZahlen(rnd, d));
        }
        if (op === '−') zahlen.sort((x, y) => y - x); else zahlen = mische(rnd, zahlen);
        const rundeZ = z => (variante === 'zehner' ? rundeAuf(z, 1) : ueRund(z));
        const rund = zahlen.map(rundeZ);
        if (zahlen.some(z => z >= 10 && (variante === 'zehner' || z < 100 ? z % 10 : z % 100) === 0)) continue;   // jede Zahl muss gerundet werden
        const rechne = l => l.slice(1).reduce((x, y) => (op === '+' ? x + y : x - y), l[0]);
        genau = rechne(zahlen); ue = rechne(rund);
        if (genau <= 0 || ue <= 0) continue;
        if (variante !== 'zehner' && zahlen.some(z => z < 100) !== (variante === 'unter100')) continue;
        if (rund.includes(ue) || zahlen.includes(ue)) continue;   // weg[0] und die Aufgabe verraten das Ergebnis nicht
        const stelle = variante === 'zehner' ? 'Zehner' : 'Hunderter', viele = k === 2 ? 'beide Zahlen' : 'jede Zahl';
        text = variante === 'unter100' ? 'Überschlag: Runde auf Hunderter, Zahlen unter 100 auf Zehner.' : `Überschlag: Runde ${viele} auf ${stelle}.`;
        weg = [`Runde ${viele} auf ${stelle}${variante === 'unter100' ? ' (unter 100 auf Zehner)' : ''}: ${zahlen.map((z, i) => `${F(z)} → ${F(rund[i])}`).join(', ')}`,
          `Ü: ${rund.map(F).join(` ${op} `)} = ${F(ue)}`];
        f.setze(String(rundeAuf(genau, variante === 'zehner' ? 1 : 2)), 'ueErstRunden');
        if (variante === 'unter100') { const alleH = rechne(zahlen.map(z => rundeAuf(z, 2))); if (alleH >= 0) f.setze(String(alleH), 'ueUnter100'); }
        const andereStelle = rechne(zahlen.map(z => rundeAuf(z, variante === 'zehner' ? 2 : 1)));
        if (andereStelle >= 0) f.setze(String(andereStelle), 'ueStelle');
      }
      if (genau != null && genau !== ue) f.setze(String(genau), 'ueGenau');
      delete f.map[String(ue)];
      return aufgabe('rs-ueberschlag', { variante, text, term: zahlen.map(F).join(` ${op} `), eingabe: 'zahl', loesung: ue, weg, fehler: f.map,
        rueck: op === ':' ? { _: 'Beide Zahlen auf Zehner runden, dann gleich viele Nullen streichen und dividieren.' } : {} });
    }
    return aufgabe('rs-ueberschlag', { variante: 'hunderter', text: 'Überschlag: Runde jede Zahl auf Hunderter.', term: '4 349 + 249 + 249', loesung: 4700,
      weg: ['Runde jede Zahl auf Hunderter: 4 349 → 4 300, 249 → 200, 249 → 200', 'Ü: 4 300 + 200 + 200 = 4 700'], fehler: { 4847: 'ueGenau', 4800: 'ueErstRunden' } });
  }
};

// ================================================================
// Addition und Subtraktion (Üb. S. 20–23, Buch S. 66–73, Heft)
// Schriftlich wie im Buch und Heft: Addition von unten nach oben, Übertrag klein über dem Strich; Subtraktion mit
// Ergänzen, Übertrag klein beim Subtrahenden. Vor + und − der Überschlag, danach die Probe „PR:“.
// ================================================================
// Addition mit vergessenen Überträgen an den Stellen in `vergessen` (typischer Fehler; links wird alles geschrieben)
function addMitFehler(zahlen, vergessen) {
  const max = Math.max(...zahlen.map(stellenVon));
  let c = 0, r = 0;
  for (let j = 0; j < max; j++) {
    const s = zahlen.reduce((a, z) => a + ziffer(z, j), 0) + (vergessen.has(j - 1) ? 0 : c);
    c = Math.floor(s / 10);
    r += (j === max - 1 ? s : s % 10) * hoch(j);
  }
  return r;
}
function addUebertraege(zahlen) {   // Spalten j, aus denen ein Übertrag kommt
  const max = Math.max(...zahlen.map(stellenVon)), out = [];
  let c = 0;
  for (let j = 0; j < max; j++) { const s = zahlen.reduce((a, z) => a + ziffer(z, j), 0) + c; c = Math.floor(s / 10); if (c) out.push(j); }
  return out;
}
// Subtraktion (Ergänzen), bei der die Überträge an den Stellen in `vergessen` nicht zum Subtrahenden kommen
function subMitFehler(a, b, vergessen) {
  let c = 0, r = 0;
  for (let j = 0; j < stellenVon(a); j++) {
    const t = ziffer(a, j), u = ziffer(b, j) + (vergessen.has(j - 1) ? 0 : c);
    if (t < u) { r += (t + 10 - u) * hoch(j); c = 1; } else { r += (t - u) * hoch(j); c = 0; }
  }
  return r;
}
function subUebertraege(a, b) {
  const out = [];
  let c = 0;
  for (let j = 0; j < stellenVon(a); j++) { const u = ziffer(b, j) + c; c = ziffer(a, j) < u ? 1 : 0; if (c) out.push(j); }
  return out;
}
const ueText = (zahlen, op) => `Ü: ${zahlen.map(ueRund).map(F).join(` ${op} `)} = ${F(zahlen.map(ueRund).slice(1).reduce((a, x) => (op === '+' ? a + x : a - x), ueRund(zahlen[0])))}`;

// Rechenkette im Kopf: 147 + 38 = 185 → + 25 = 210 (Lernauftrag 2a: 3 Schritte, Zehnerübergang)
function kette(rnd, op) {
  for (let v = 0; v < 80; v++) {
    const plus = op === '+';
    const start = plus ? (rnd() < 0.8 ? zwischen(rnd, 100, 760) : zwischen(rnd, 21, 99)) : zwischen(rnd, 220, 999);
    const schritte = [];
    let x = start, ok = true, rund = false;
    for (let i = 0; i < 3; i++) {
      // meist mit Zehnerübergang (Einer reichen nicht bzw. gehen über 10); bei minus höchstens ein glatter Zehner (− 40)
      const e = x % 10;
      let s;
      if (!plus && !rund && rnd() < 0.2) { s = zwischen(rnd, 2, 9) * 10; rund = true; }
      else {
        const ueber = rnd() < 0.85;
        let se;
        if (plus) se = ueber && e > 0 ? zwischen(rnd, 10 - e, 9) : zwischen(rnd, 1, 9);
        else se = ueber && e < 9 ? zwischen(rnd, e + 1, 9) : zwischen(rnd, 1, 9);
        s = zwischen(rnd, 1, 8) * 10 + se;
      }
      x = plus ? x + s : x - s;
      if (x < 10 || x > 999) { ok = false; break; }
      schritte.push(s);
    }
    if (!ok) continue;
    let ueber = 0, y = start;
    for (const s of schritte) { if (plus ? (y % 10) + (s % 10) >= 10 : (y % 10) < (s % 10)) ueber++; y = plus ? y + s : y - s; }
    if (ueber < 2) continue;   // Lernauftrag 2a: Zehnerübergang
    const werte = [];
    schritte.reduce((a, s) => { const y = plus ? a + s : a - s; werte.push(y); return y; }, start);
    return { start, schritte, werte };
  }
  return { start: 147, schritte: [38, 25, 17], werte: [185, 210, 227] };
}
function ketteAufgabe(typ, rnd, op) {
  const { start, schritte, werte } = kette(rnd, op);
  const f = sammler(werte.map((w, i) => `${i}:${w}`));
  werte.forEach((w, i) => {
    f.setze(`${i}:${op === '+' ? w - 10 : w + 10}`, 'uebertrag');
    if (w - 10 >= 0) f.setze(`${i}:${op === '+' ? w + 10 : w - 10}`, 'zehner');
    if (op === '−') {   // kleinere von der größeren Ziffer: 175 − 27 → 152
      const vorher = i ? werte[i - 1] : start, s = schritte[i];
      const falsch = Math.floor(vorher / 100) * 100 + Math.abs(Math.floor(vorher / 10) % 10 - Math.floor(s / 10) % 10) * 10 + Math.abs(vorher % 10 - s % 10);
      f.setze(`${i}:${falsch}`, 'obenUnten');
    }
  });
  const s0 = schritte[0], z = Math.floor(s0 / 10) * 10, e = s0 % 10;
  // 1. Schritt: den ersten Sprung zerlegen – ohne Zahl, die zufällig ein Ergebnis der Kette ist (sonst nur in Worten)
  const zerlegt = e && z && !werte.includes(z) && !werte.includes(e);
  return aufgabe(typ, {
    text: 'Rechenkette: Rechne Schritt für Schritt im Kopf.',
    term: `${F(start)} → ${schritte.map(s => `${op} ${s}`).join(' → ')}`,
    eingabe: 'felder', felder: schritte.map(s => ({ art: 'zahl', label: `${op} ${s}` })), kette: F(start), loesung: werte,
    weg: [zerlegt ? `Zerleg den ersten Sprung: ${F(start)} ${op} ${z} ${op} ${e}` : 'Zerleg jeden Sprung: zuerst die Zehner, dann die Einer.',
      werte.map((w, i) => `${F(i ? werte[i - 1] : start)} ${op} ${schritte[i]} = ${F(w)}`).join('; '),
      [F(start), ...werte.map(F)].join(' → ')],
    fehler: f.map, rueck: { _: 'Rechne jeden Sprung in zwei Teilen: zuerst die Zehner, dann die Einer.' }
  });
}
const addKette = {
  id: 'add-kette', thema: 'addition', titel: 'Rechenkette plus', quelle: 'Üb. S. 20 Nr. 1',
  rang: 1, wo: 'app', auswahl: false, nah: ['sub-kette'], voraus: [], gewicht: 1, sek: 30, sekNeu: 45, varianten: [],
  erzeuge(rnd) { return ketteAufgabe('add-kette', rnd, '+'); }
};
const subKette = {
  id: 'sub-kette', thema: 'subtraktion', titel: 'Rechenkette minus', quelle: 'Üb. S. 22 Nr. 1',
  rang: 1, wo: 'app', auswahl: false, nah: ['add-kette'], voraus: [], gewicht: 1, sek: 30, sekNeu: 45, varianten: [],
  erzeuge(rnd) { return ketteAufgabe('sub-kette', rnd, '−'); }
};

const addSchriftlich = {
  id: 'add-schriftlich', thema: 'addition', titel: 'Schriftlich addieren', quelle: 'Üb. S. 20 Nr. 2, S. 21 Nr. 1, 3 · Buch S. 66–69',
  rang: 2, wo: 'papier', auswahl: false, nah: ['sub-schriftlich'], voraus: [], gewicht: 2, sek: 75, sekNeu: 110, varianten: [],
  erzeuge(rnd) {
    // 2–4 Summanden, bis 6 Stellen, mehrere Überträge (Lernauftrag 2a)
    let zahlen = [6078, 593, 12846];
    for (let v = 0; v < 80; v++) {
      const k = gewichtet(rnd, [[2, 30], [3, 50], [4, 20]]);
      const gross = zwischen(rnd, 4, 6);
      const z = [zahlMit(rnd, gross)];
      for (let i = 1; i < k; i++) z.push(zahlMit(rnd, zwischen(rnd, 2, gross)));
      const summe = z.reduce((a, x) => a + x, 0);
      if (summe > 999999 || addUebertraege(z).length < 2) continue;
      const ue = z.map(ueRund).reduce((a, x) => a + x, 0);
      if (ue === summe || z.map(ueRund).includes(summe)) continue;   // weg[0] (Ü) verrät das Ergebnis nicht
      zahlen = mische(rnd, z);
      break;
    }
    const summe = zahlen.reduce((a, x) => a + x, 0);
    const f = sammler([String(summe)]);
    for (const j of addUebertraege(zahlen)) f.setze(String(addMitFehler(zahlen, new Set([j]))), 'uebertrag');
    f.setze(String(addMitFehler(zahlen, new Set([0, 1, 2, 3, 4, 5, 6]))), 'uebertrag');
    const max = Math.max(...zahlen.map(stellenVon));
    for (const z of zahlen) if (stellenVon(z) < max) f.setze(String(summe + 9 * z), 'verrutscht');
    const e = zahlen.map(z => z % 10), se = e.reduce((a, x) => a + x, 0);
    return aufgabe('add-schriftlich', {
      text: 'Rechne schriftlich. Zuerst der Überschlag.', term: zahlen.map(F).join(' + '), eingabe: 'zahl', loesung: summe,
      weg: [ueText(zahlen, '+'),
        `Einer unter Einer, von rechts: ${e.join(' + ')} = ${se}${se >= 10 ? ` → schreib ${se % 10}, Übertrag ${Math.floor(se / 10)}` : ''}`,
        `${zahlen.map(F).join(' + ')} = ${F(summe)}`],
      fehler: f.map,
      rueck: { _: 'Vergleich mit dem Überschlag: Liegt dein Ergebnis in der Nähe? Rechne die Spalte mit der markierten Ziffer nach.' }
    });
  }
};

const subSchriftlich = {
  id: 'sub-schriftlich', thema: 'subtraktion', titel: 'Schriftlich subtrahieren', quelle: 'Üb. S. 22 Nr. 2, S. 23 Nr. 1 · Buch S. 70–73 · Heft',
  rang: 2, wo: 'papier', auswahl: false, nah: ['add-schriftlich'], voraus: [], gewicht: 2, sek: 75, sekNeu: 110, varianten: ['zwei', 'sub-zwei'],
  erzeuge(rnd) {
    // bis 5 Stellen, Nullen im Minuend; Variante sub-zwei: runder Minuend, zwei Subtrahenden (500 − 87 − 46)
    if (rnd() < 0.25) {
      for (let v = 0; v < 60; v++) {
        const a = rnd() < 0.6 ? zwischen(rnd, 3, 9) * 100 : zwischen(rnd, 1, 9) * 1000;
        const b = zahlMit(rnd, zwischen(rnd, 2, 3)), c = zahlMit(rnd, zwischen(rnd, 2, 3));
        const r = a - b - c;
        if (r <= 0) continue;
        const ue = ueRund(a) - ueRund(b) - ueRund(c);
        if (ue === r || [a, b, c].map(ueRund).includes(r)) continue;   // weg[0] (Ü) verrät das Ergebnis nicht
        const f = sammler([String(r)]);
        f.setze(String(a - b), 'vergessen');
        f.setze(String(a - c), 'vergessen');
        for (const j of subUebertraege(a, b + c)) f.setze(String(subMitFehler(a, b + c, new Set([j]))), 'uebertrag');
        return aufgabe('sub-schriftlich', {
          variante: 'sub-zwei', text: 'Rechne schriftlich. Zuerst der Überschlag, am Ende die Probe.', term: `${F(a)} − ${b} − ${c}`, loesung: r,
          weg: [ueText([a, b, c], '−'), `Zuerst die Subtrahenden zusammen: ${b} + ${c} = ${F(b + c)}. Dann ${F(a)} − ${F(b + c)}.`,
            `${F(a)} − ${b} − ${c} = ${F(r)}. PR: ${F(r)} + ${b} + ${c} = ${F(a)}`],
          fehler: f.map, rueck: { _: 'Mach die Probe: Ergebnis + beide Subtrahenden. Kommt genau der Minuend heraus?' }
        });
      }
    }
    let a = 6052, b = 1879;
    for (let v = 0; v < 80; v++) {
      const d = zwischen(rnd, 4, 5);
      const x = ausZiffern(ziffernMit(rnd, d, rnd() < 0.7 ? 0.35 : 0.1));
      const y = zahlMit(rnd, zwischen(rnd, 3, d));
      if (y >= x || x - y < 100 || subUebertraege(x, y).length < 2) continue;
      if (ueRund(x) - ueRund(y) === x - y || [ueRund(x), ueRund(y)].includes(x - y)) continue;   // Ü verrät nichts
      a = x; b = y;
      break;
    }
    const r = a - b;
    const f = sammler([String(r)]);
    const ues = subUebertraege(a, b);
    for (const j of ues) f.setze(String(subMitFehler(a, b, new Set([j]))), 'uebertrag');
    f.setze(String(subMitFehler(a, b, new Set(ues))), 'uebertrag');
    let oben = 0;
    for (let j = 0; j < stellenVon(a); j++) oben += Math.abs(ziffer(a, j) - ziffer(b, j)) * hoch(j);
    f.setze(String(oben), 'obenUnten');
    const t0 = ziffer(a, 0), u0 = ziffer(b, 0);
    const erste = t0 >= u0 ? `${u0} + ${t0 - u0} = ${t0} → schreib ${t0 - u0}` : `${u0} + ${t0 + 10 - u0} = 1${t0} → schreib ${t0 + 10 - u0}, Übertrag 1 zum Subtrahenden`;
    return aufgabe('sub-schriftlich', {
      variante: 'zwei', text: 'Rechne schriftlich. Zuerst der Überschlag, am Ende die Probe.', term: `${F(a)} − ${F(b)}`, loesung: r,
      weg: [ueText([a, b], '−'), `Ergänzen von den Einern weg: ${erste}`, `${F(a)} − ${F(b)} = ${F(r)}. PR: ${F(r)} + ${F(b)} = ${F(a)}`],
      fehler: f.map,
      rueck: { uebertrag: 'Übertrag nicht vergessen: Er kommt klein zum Subtrahenden in der nächsten Spalte. Mach die Probe: Differenz + Subtrahend = Minuend?',
        _: 'Mach die Probe: Differenz + Subtrahend. Kommt genau der Minuend heraus?' }
    });
  }
};

const subBegriffe = {
  id: 'sub-begriffe', thema: 'subtraktion', titel: 'Fachbegriffe und Umkehraufgabe', quelle: 'Üb. S. 23 Nr. 2, S. 21 Nr. 2 · Buch S. 73 · Heft',
  rang: 3, wo: 'app', auswahl: false, nah: ['ta-rechnung'], voraus: [], gewicht: 2, sek: 25, sekNeu: 40,
  varianten: ['minuend', 'subtrahend', 'differenz', 'summand', 'add-begriffe'],
  erzeuge(rnd, opt = {}) {
    // Gesucht: Minuend, Subtrahend, Differenz oder 2. Summand; add-begriffe: „der zweite ist um … größer/kleiner“.
    // Einstufung ohne die leichte Variante „Differenz gesucht“ (Lernziel ist die Umkehraufgabe)
    const variante = gewichtet(rnd, [['minuend', 25], ['subtrahend', 20], ['differenz', opt.zweck === 'einstufung' ? 0 : 10], ['summand', 20], ['add-begriffe', 25]]);
    const zwei = () => (rnd() < 0.75 ? zwischen(rnd, 12, 99) : zwischen(rnd, 100, 499));
    let s = zwei(), d = zwei();
    for (let v = 0; v < 20 && s === d; v++) d = zwei();
    const m = s + d;
    const f = sammler([]);
    let text, loesung, weg;
    const erst = rnd() < 0.5;
    if (variante === 'minuend') {
      text = erst ? `Der Subtrahend ist ${F(s)}, die Differenz ist ${F(d)}. Wie heißt der Minuend?` : `Die Differenz ist ${F(d)}, der Subtrahend ist ${F(s)}. Wie heißt der Minuend?`;
      loesung = m; f.setze(String(Math.abs(d - s)), 'umkehr');
      weg = [`Minuend − Subtrahend = Differenz: ? − ${F(s)} = ${F(d)}`, `Umkehraufgabe: ${F(d)} + ${F(s)} = ${F(m)}`, `PR: ${F(m)} − ${F(s)} = ${F(d)}`];
    } else if (variante === 'subtrahend') {
      text = erst ? `Der Minuend ist ${F(m)}, die Differenz ist ${F(d)}. Wie heißt der Subtrahend?` : `Die Differenz ist ${F(d)}, der Minuend ist ${F(m)}. Wie heißt der Subtrahend?`;
      loesung = s; f.setze(String(m + d), 'umkehr');
      weg = [`Minuend − Subtrahend = Differenz: ${F(m)} − ? = ${F(d)}`, `Umkehraufgabe: ${F(m)} − ${F(d)} = ${F(s)}`, `PR: ${F(m)} − ${F(s)} = ${F(d)}`];
    } else if (variante === 'differenz') {
      text = erst ? `Der Minuend ist ${F(m)}, der Subtrahend ist ${F(s)}. Wie heißt die Differenz?` : `Der Subtrahend ist ${F(s)}, der Minuend ist ${F(m)}. Wie heißt die Differenz?`;
      loesung = d; f.setze(String(m + s), 'begriffe');
      weg = [`Minuend − Subtrahend = Differenz: ${F(m)} − ${F(s)} = ?`, `${F(m)} − ${F(s)} = ${F(d)}`];
    } else if (variante === 'summand') {
      text = erst ? `Die Summe ist ${F(m)}, ein Summand ist ${F(s)}. Wie heißt der andere Summand?` : `Ein Summand ist ${F(s)}, die Summe ist ${F(m)}. Wie heißt der andere Summand?`;
      loesung = d; f.setze(String(m + s), 'umkehr');
      weg = [`Summand + Summand = Summe: ${F(s)} + ? = ${F(m)}`, `Umkehraufgabe: ${F(m)} − ${F(s)} = ${F(d)}`, `PR: ${F(s)} + ${F(d)} = ${F(m)}`];
    } else {
      const groesser = rnd() < 0.65, a = Math.max(s, d), k = Math.min(s, d);
      const b = groesser ? a + k : a - k;
      text = `Der erste Summand ist ${F(a)}. Der zweite Summand ist um ${F(k)} ${groesser ? 'größer' : 'kleiner'}. Wie heißt die Summe?`;
      loesung = a + b; f.setze(String(b), 'umMehr'); f.setze(String(a + k), 'umMehr'); f.setze(String(a - k), 'umMehr');
      weg = [`Zuerst der zweite Summand: ${F(a)} ${groesser ? '+' : '−'} ${F(k)} = ${F(b)}`, `Dann die Summe: ${F(a)} + ${F(b)} = ${F(a + b)}`];
    }
    delete f.map[String(loesung)];
    return aufgabe('sub-begriffe', { variante, text, term: '', eingabe: 'zahl', loesung, weg, fehler: f.map,
      rueck: { umkehr: `Schreib die Rechnung mit ? an: ${weg[0].split(': ').pop()}. Dann die Umkehraufgabe.` } });
  }
};

// ================================================================
// Textaufgaben (Üb. S. 24–25, 29, 31, 33; Buch S. 74–75; Heft: geg / ges / Rechnung / A)
// Die Vorlagen sind DATEN von fachdidaktik (TA_RECHNUNG, TA_ZAHLEN, OP_NAME, TA_RUECK, TA_GANZ unten).
//
// ta-rechnung: eine Geschichte, Fragen zu allen vier Rechenarten. {a} ist die größere, {b} die kleinere Zahl; der Generator
//   wählt a = b · q nach TA_ZAHLEN FÜR JEDE Rechenart gleich, damit das Zahlenmuster nichts verrät (Hinweis-Test): a ist
//   immer durch b teilbar, und a + b, a − b, a · b, a : b sind vier verschiedene Zahlen, keine gleich a oder b.
//   Im Text keine anderen Ziffern. { id, titel, fragen: [{ art: '+' | '−' | '·' | ':', text: '… {a} … {b} …?',
//   rechnung: 'a + b' | 'b · a' …, schritt1: '…' (1. Schritt ohne Ergebnis), antwort: '… {e} …' (Antwortsatz),
//   signal: 'irrefuehrend', wort: 'mehr', irreArt: '+' (Falle: das Wort passt zu irreArt, gerechnet wird art) }] }
// ta-ganz: zweistufig mit a) und b), auf Papier (geg/ges/Rechnung/A); das Kind tippt die Ergebnisse.
//   { id, text: '… {z} … {m} …', fragen: ['…?', '…?'], zahlen: { z: [von, bis, schritt?] }, rechnung: ['m + d', 'z − [a]'],
//     geg: '…', ges: '…', antwort: ['… [a] …', '… [b] …'], fehler: [{ feld: 1, rechnung: 'z − m', art: 'zweiSchritte' }] }
//   oder fest: { id, text, fragen, loesung: [432, 168], weg: ['…'] }. [a], [b] = Ergebnis von a) bzw. b).
//   Ergebnisse müssen ganze Zahlen > 0 sein (keine Kommazahlen: Euro ganz oder in Cent).
// ================================================================
// Quelle der Daten: auftraege/2026-11-16_mathe-app/inhalt/inhalt.js (fachdidaktik, 16.11.2026), Abschnitte (A) und (B),
// übernommen bis auf zwei Abweichungen (stehen vor TA_GANZ). Menschenlesbar: textaufgaben.md im selben Ordner.
const TA_RECHNUNG = [
  {
    id: 'krampus',
    titel: 'Krampuslauf',
    fragen: [
      {
        art: '+',
        text: 'Beim Krampuslauf gehen {a} Krampusse mit. Kurz vor dem Start kommen noch {b} Krampusse dazu. Wie viele Krampusse gehen jetzt mit?',
        rechnung: 'a + b',
        schritt1: 'Es kommen Krampusse dazu, also werden es mehr: plus.',
        antwort: 'Jetzt gehen {e} Krampusse mit.',
        einheit: 'Krampusse',
        signalArt: 'passt',
        vorlage: 'krampus-plus'
      },
      {
        art: '−',
        text: 'Der Krampuslauf im Nachbarort dauert {a} Minuten. Das sind um {b} Minuten mehr als bei uns. Wie lange dauert der Krampuslauf bei uns?',
        rechnung: 'a − b',
        signal: 'irrefuehrend',
        wort: 'mehr',
        irreArt: '+',
        schritt1: 'Bei uns dauert der Krampuslauf kürzer als im Nachbarort, also minus.',
        antwort: 'Bei uns dauert der Krampuslauf {e} min.',
        einheit: 'min',
        signalArt: 'irre',
        vorlage: 'krampus-minus'
      },
      {
        art: '·',
        text: 'Beim Krampuslauf hat jeder Krampus {b} Glocken. Es gehen {a} Krampusse mit. Wie viele Glocken sind das zusammen?',
        rechnung: 'a · b',
        signal: 'irrefuehrend',
        wort: 'zusammen',
        irreArt: '+',
        schritt1: 'Jeder Krampus hat gleich viele Glocken: Das ist mehrmals dasselbe, also mal.',
        antwort: 'Das sind {e} Glocken.',
        einheit: 'Glocken',
        signalArt: 'irre',
        vorlage: 'krampus-mal'
      },
      {
        art: ':',
        text: '{a} Krampusse gehen in Gruppen durchs Dorf. In jeder Gruppe sind {b} Krampusse. Wie viele Gruppen sind das?',
        rechnung: 'a : b',
        schritt1: 'Alle Krampusse werden in gleich große Gruppen aufgeteilt: geteilt durch.',
        antwort: 'Das sind {e} Gruppen.',
        einheit: 'Gruppen',
        signalArt: 'ohne',
        vorlage: 'krampus-durch'
      }
    ]
  },
  {
    id: 'stunt',
    titel: 'Stunt-Show',
    fragen: [
      {
        art: '+',
        text: 'Bei der Stunt-Show springt das erste Motorrad {a} m weit. Das zweite Motorrad springt um {b} m weiter. Wie weit springt das zweite Motorrad?',
        rechnung: 'a + b',
        schritt1: 'Das zweite Motorrad springt weiter als das erste, also plus.',
        antwort: 'Das zweite Motorrad springt {e} m weit.',
        einheit: 'm',
        signalArt: 'um',
        vorlage: 'stunt-plus'
      },
      {
        art: '−',
        text: 'Bei der Stunt-Show springt das rote Motorrad {a} m weit. Das ist um {b} m weiter als das blaue Motorrad. Wie weit springt das blaue Motorrad?',
        rechnung: 'a − b',
        signal: 'irrefuehrend',
        wort: 'weiter',
        irreArt: '+',
        schritt1: 'Das rote Motorrad springt weiter. Das blaue springt also weniger weit: minus.',
        antwort: 'Das blaue Motorrad springt {e} m weit.',
        einheit: 'm',
        signalArt: 'irre',
        vorlage: 'stunt-minus'
      },
      {
        art: '·',
        text: 'Bei der Probe am Vormittag sitzen {a} Zuschauer im Zelt. Am Abend sind es {b}-mal so viele. Wie viele Zuschauer sind am Abend da?',
        rechnung: 'a · b',
        schritt1: 'Am Abend sind es mehrmals so viele wie am Vormittag: mal.',
        antwort: 'Am Abend sind {e} Zuschauer da.',
        einheit: 'Zuschauer',
        signalArt: 'passt',
        vorlage: 'stunt-mal'
      },
      {
        art: ':',
        text: 'Bei der Stunt-Show am Abend sitzen {a} Zuschauer im Zelt. Das sind {b}-mal so viele wie bei der Probe am Vormittag. Wie viele Zuschauer waren am Vormittag da?',
        rechnung: 'a : b',
        signal: 'irrefuehrend',
        wort: 'mal so viele',
        irreArt: '·',
        schritt1: 'Am Abend sind es mehrmals so viele wie am Vormittag. Für den Vormittag rechnest du zurück: geteilt durch.',
        antwort: 'Am Vormittag waren {e} Zuschauer da.',
        einheit: 'Zuschauer',
        signalArt: 'irre',
        vorlage: 'stunt-durch'
      }
    ]
  },
  {
    id: 'lego',
    titel: 'LEGO',
    fragen: [
      {
        art: '+',
        text: 'Mia hat {a} LEGO-Figuren. Sie hat um {b} Figuren weniger als Leon. Wie viele LEGO-Figuren hat Leon?',
        rechnung: 'a + b',
        signal: 'irrefuehrend',
        wort: 'weniger',
        irreArt: '−',
        schritt1: 'Mia hat weniger als Leon. Leon hat also mehr: plus.',
        antwort: 'Leon hat {e} LEGO-Figuren.',
        einheit: 'LEGO-Figuren',
        signalArt: 'irre',
        vorlage: 'lego-plus'
      },
      {
        art: '−',
        text: 'Leon hat {a} LEGO-Figuren. Mia hat um {b} Figuren weniger. Wie viele LEGO-Figuren hat Mia?',
        rechnung: 'a − b',
        schritt1: 'Mia hat weniger als Leon, also minus.',
        antwort: 'Mia hat {e} LEGO-Figuren.',
        einheit: 'LEGO-Figuren',
        signalArt: 'um',
        vorlage: 'lego-minus'
      },
      {
        art: '·',
        text: 'In jedem Sackerl eines LEGO-Sets sind {a} Steine. Das Set hat {b} Sackerl. Wie viele Steine hat das Set?',
        rechnung: 'a · b',
        schritt1: 'In jedem Sackerl sind gleich viele Steine: Das ist mehrmals dasselbe, also mal.',
        antwort: 'Das Set hat {e} Steine.',
        einheit: 'Steine',
        signalArt: 'ohne',
        vorlage: 'lego-mal'
      },
      {
        art: ':',
        text: '{b} Kinder teilen sich {a} LEGO-Steine gerecht auf. Wie viele Stück bekommt jedes Kind?',
        rechnung: 'a : b',
        schritt1: 'Gerecht aufteilen heißt: geteilt durch.',
        antwort: 'Jedes Kind bekommt {e} Stück.',
        einheit: 'Stück',
        signalArt: 'passt',
        vorlage: 'lego-durch'
      }
    ]
  },
  {
    id: 'fussball',
    titel: 'Fußball',
    fragen: [
      {
        art: '+',
        text: 'Unsere Mannschaft hat in dieser Saison schon {a} Tore geschossen. Im letzten Spiel schießt sie noch {b} Tore. Wie viele Tore sind das jetzt zusammen?',
        rechnung: 'a + b',
        schritt1: 'Es kommen Tore dazu, also werden es mehr: plus.',
        antwort: 'Jetzt sind es {e} Tore.',
        einheit: 'Tore',
        signalArt: 'passt',
        vorlage: 'fussball-plus'
      },
      {
        art: '−',
        text: 'In der Pause kommen noch {b} Zuschauer zum Fußballplatz dazu. Jetzt sind {a} Zuschauer da. Wie viele Zuschauer waren vor der Pause da?',
        rechnung: 'a − b',
        signal: 'irrefuehrend',
        wort: 'dazu',
        irreArt: '+',
        schritt1: 'Vor der Pause waren es weniger Zuschauer als jetzt, also minus.',
        antwort: 'Vor der Pause waren {e} Zuschauer da.',
        einheit: 'Zuschauer',
        signalArt: 'irre',
        vorlage: 'fussball-minus'
      },
      {
        art: '·',
        text: 'Ein Fußball kostet {a} €. Der Trainer kauft {b} gleiche Bälle. Wie viel muss er zahlen?',
        rechnung: 'a · b',
        schritt1: 'Jeder Ball kostet gleich viel: Das ist mehrmals dasselbe, also mal.',
        antwort: 'Er muss {e} € zahlen.',
        einheit: '€',
        signalArt: 'ohne',
        vorlage: 'fussball-mal'
      },
      {
        art: ':',
        text: 'Das Fußballtraining dauert {a} Minuten. Es gibt {b} gleich lange Übungen. Wie lange dauert eine Übung?',
        rechnung: 'a : b',
        schritt1: 'Die Zeit wird in gleich lange Teile geteilt: geteilt durch.',
        antwort: 'Eine Übung dauert {e} min.',
        einheit: 'min',
        signalArt: 'ohne',
        vorlage: 'fussball-durch'
      }
    ]
  },
  {
    id: 'ski',
    titel: 'Skifahren',
    fragen: [
      {
        art: '+',
        text: 'Ein Skigebiet hat {a} km Pisten. Im Jänner kommen {b} km neue Pisten dazu. Wie viele km Pisten hat es dann?',
        rechnung: 'a + b',
        schritt1: 'Es kommen Pisten dazu, also werden es mehr: plus.',
        antwort: 'Dann hat es {e} km Pisten.',
        einheit: 'km',
        signalArt: 'passt',
        vorlage: 'ski-plus'
      },
      {
        art: '−',
        text: 'Gerade sind {b} Sessel am Sessellift leer. Der Sessellift hat {a} Sessel. Wie viele Sessel sind besetzt?',
        rechnung: 'a − b',
        schritt1: 'Die leeren Sessel zählen nicht mit, also minus.',
        antwort: '{e} Sessel sind besetzt.',
        einheit: 'Sessel',
        signalArt: 'ohne',
        vorlage: 'ski-minus'
      },
      {
        art: '·',
        text: 'Der Skilehrer verteilt Liftkarten an {b} Kinder. Jede Karte kostet {a} €. Wie viel kosten alle Karten?',
        rechnung: 'b · a',
        signal: 'irrefuehrend',
        wort: 'verteilt',
        irreArt: ':',
        schritt1: 'Jede Karte kostet gleich viel: Das ist mehrmals dasselbe, also mal.',
        antwort: 'Alle Karten kosten {e} €.',
        einheit: '€',
        signalArt: 'irre',
        vorlage: 'ski-mal'
      },
      {
        art: ':',
        text: 'In der Skischule sind {a} Kinder. Sie werden auf {b} gleich große Gruppen verteilt. Wie viele Kinder sind in einer Gruppe?',
        rechnung: 'a : b',
        schritt1: 'Gleich große Gruppen: geteilt durch.',
        antwort: 'In einer Gruppe sind {e} Kinder.',
        einheit: 'Kinder',
        signalArt: 'passt',
        vorlage: 'ski-durch'
      }
    ]
  },
  {
    id: 'einkauf',
    titel: 'Einkaufen',
    fragen: [
      {
        art: '+',
        text: 'Mia kauft ein Buch um {b} €. Danach bleiben ihr noch {a} €. Wie viel Geld hatte sie vorher?',
        rechnung: 'a + b',
        signal: 'irrefuehrend',
        wort: 'bleiben',
        irreArt: '−',
        schritt1: 'Vor dem Einkauf hatte Mia mehr Geld: plus.',
        antwort: 'Vorher hatte sie {e} €.',
        einheit: '€',
        signalArt: 'irre',
        vorlage: 'einkauf-plus'
      },
      {
        art: '−',
        text: 'Papa hat {a} € in der Geldbörse. Er kauft Semmeln und Käse um {b} €. Wie viel Geld bleibt ihm?',
        rechnung: 'a − b',
        schritt1: 'Er gibt Geld aus, also wird es weniger: minus.',
        antwort: 'Ihm bleiben {e} €.',
        einheit: '€',
        signalArt: 'passt',
        vorlage: 'einkauf-minus'
      },
      {
        art: '·',
        text: 'Die Schule bestellt für den Skitag {a} gleiche Jausen. Eine Jause kostet {b} €. Wie viel kosten alle Jausen?',
        rechnung: 'a · b',
        schritt1: 'Jede Jause kostet gleich viel: Das ist mehrmals dasselbe, also mal.',
        antwort: 'Alle Jausen kosten {e} €.',
        einheit: '€',
        signalArt: 'ohne',
        vorlage: 'einkauf-mal'
      },
      {
        art: ':',
        text: 'Mama kauft {b} gleiche Packungen Kekse. Zusammen zahlt sie {a} €. Wie viel kostet eine Packung?',
        rechnung: 'a : b',
        schritt1: 'Der Preis wird gleich auf die Packungen aufgeteilt: geteilt durch.',
        antwort: 'Eine Packung kostet {e} €.',
        einheit: '€',
        signalArt: 'ohne',
        vorlage: 'einkauf-durch'
      }
    ]
  },
  {
    id: 'taschengeld',
    titel: 'Taschengeld',
    fragen: [
      {
        art: '+',
        text: 'Lena hat {a} € gespart. Ihr Bruder hat um {b} € mehr gespart. Wie viel Geld hat ihr Bruder gespart?',
        rechnung: 'a + b',
        schritt1: 'Der Bruder hat mehr gespart als Lena, also plus.',
        antwort: 'Ihr Bruder hat {e} € gespart.',
        einheit: '€',
        signalArt: 'um',
        vorlage: 'taschengeld-plus'
      },
      {
        art: '−',
        text: 'Nora hat {a} € in ihrer Geldbörse. Sie kauft ein Federpennal um {b} €. Wie viel Geld hat sie jetzt noch?',
        rechnung: 'a − b',
        schritt1: 'Sie gibt Geld aus, also wird es weniger: minus.',
        antwort: 'Sie hat jetzt noch {e} €.',
        einheit: '€',
        signalArt: 'ohne',
        vorlage: 'taschengeld-minus'
      },
      {
        art: '·',
        text: 'Paul wirft {a} Tage lang jeden Tag {b} Cent in seine Spardose. Wie viele Cent sind dann in der Spardose?',
        rechnung: 'a · b',
        schritt1: 'Jeden Tag kommt gleich viel dazu: Das ist mehrmals dasselbe, also mal.',
        antwort: 'Dann sind {e} Cent in der Spardose.',
        einheit: 'Cent',
        signalArt: 'ohne',
        vorlage: 'taschengeld-mal'
      },
      {
        art: ':',
        text: 'Emil hat {a} € gespart. Das ist {b}-mal so viel, wie seine kleine Schwester gespart hat. Wie viel Geld hat seine Schwester gespart?',
        rechnung: 'a : b',
        signal: 'irrefuehrend',
        wort: 'mal so viel',
        irreArt: '·',
        schritt1: 'Emil hat mehrmals so viel wie seine Schwester. Für die Schwester rechnest du zurück: geteilt durch.',
        antwort: 'Seine Schwester hat {e} € gespart.',
        einheit: '€',
        signalArt: 'irre',
        vorlage: 'taschengeld-durch'
      }
    ]
  },
  {
    id: 'bus',
    titel: 'Bus',
    fragen: [
      {
        art: '+',
        text: 'An der Haltestelle steigen {b} Fahrgäste in den Bus ein. Vorher sind schon {a} Fahrgäste im Bus. Wie viele Fahrgäste sind jetzt im Bus?',
        rechnung: 'a + b',
        schritt1: 'Es steigen Leute ein, also werden es mehr: plus.',
        antwort: 'Jetzt sind {e} Fahrgäste im Bus.',
        einheit: 'Fahrgäste',
        signalArt: 'passt',
        vorlage: 'bus-plus'
      },
      {
        art: '−',
        text: 'Im Bus sitzen {a} Fahrgäste. An der Haltestelle steigen {b} Fahrgäste aus. Wie viele Fahrgäste sind jetzt noch im Bus?',
        rechnung: 'a − b',
        schritt1: 'Es steigen Leute aus, also werden es weniger: minus.',
        antwort: 'Jetzt sind noch {e} Fahrgäste im Bus.',
        einheit: 'Fahrgäste',
        signalArt: 'passt',
        vorlage: 'bus-minus'
      },
      {
        art: '·',
        text: 'Der Schulbus fährt jeden Tag {a} km. Wie viele km fährt er in {b} Tagen?',
        rechnung: 'a · b',
        schritt1: 'Jeden Tag gleich weit: Das ist mehrmals dasselbe, also mal.',
        antwort: 'Er fährt {e} km.',
        einheit: 'km',
        signalArt: 'ohne',
        vorlage: 'bus-mal'
      },
      {
        art: ':',
        text: '{a} Kinder fahren mit Kleinbussen zum Skikurs. In jedem Kleinbus sitzen genau {b} Kinder. Wie viele Kleinbusse fahren?',
        rechnung: 'a : b',
        schritt1: 'Alle Kinder werden in gleich große Gruppen aufgeteilt: geteilt durch.',
        antwort: 'Es fahren {e} Kleinbusse.',
        einheit: 'Kleinbusse',
        signalArt: 'ohne',
        vorlage: 'bus-durch'
      }
    ]
  }
];

// Zahlen für ta-rechnung (Empfehlung fachdidaktik): b 3–9, q 4–12, q ≠ 10, q ≠ b – dann ist kein Ergebnis gleich a oder b
const TA_ZAHLEN = { b: [3, 9], q: [4, 12], qNicht: [10], qUngleichB: true };

// Rückmeldungen in der Sprache des Kindes; {wort}, {irreName}, {warum} = wort, OP_NAME[irreArt], schritt1 der Frage
const OP_NAME = { '+': 'plus', '−': 'minus', '·': 'mal', ':': 'geteilt durch' };
const TA_RUECK = {
  signalwort: 'Achtung, Falle! Bei „{wort}“ rechnest du hier nicht {irreName}. {warum}',
  rechenart: 'Stell dir die Geschichte vor: Wird es mehr oder weniger? {warum}',
  umgedreht: 'Bei minus und geteilt durch steht die größere Zahl (das Ganze) vorne.',
  zahlen: 'Nimm genau die zwei Zahlen aus der Geschichte.',
  rechenfehler: 'Die Rechnung stimmt! Nur das Ergebnis nicht. Rechne noch einmal nach.'
};

// ta-ganz: 10 zweistufige Textaufgaben fürs Heft (② Papier), feste Zahlen; weg bis zu 5 Zeilen (geg/ges, a), b), Kurzform, A:)
// Abweichungen von inhalt.js (Projektleitung 16.11., nach pruefung): taschengeld-mal mit Cent und Tagen statt „108 Wochen“.
// In den Zeilen „geg: … — ges: …“ trennt „;“ statt „·“, damit es nicht wie
// ein Malpunkt aussieht. Echte Malpunkte in den Rechnungen bleiben. Beim nächsten Kopieren beibehalten (das Prüfskript meldet es).
const TA_GANZ = [
  {
    id: 'tg01',
    text: 'Leon baut ein großes LEGO-Set mit 1 250 Teilen. Am Samstag baut er 386 Teile ein, am Sonntag 417 Teile.',
    fragen: ['Wie viele Teile hat er schon eingebaut?', 'Wie viele Teile fehlen noch?'],
    loesung: [803, 447],
    weg: [
      'geg: ganzes Set: 1 250 Teile; Samstag: 386 Teile; Sonntag: 417 Teile — ges: a) schon eingebaute Teile; b) fehlende Teile',
      'a) 386 + 417 = 803',
      'b) 1 250 − 803 = 447',
      'A: a) Leon hat schon 803 Teile eingebaut. b) Es fehlen noch 447 Teile.'
    ],
    geg: ['ganzes Set: 1 250 Teile', 'Samstag: 386 Teile', 'Sonntag: 417 Teile'],
    ges: ['a) schon eingebaute Teile', 'b) fehlende Teile'],
    rechnung: ['a) 386 + 417 = 803', 'b) 1 250 − 803 = 447'],
    antwort: ['a) Leon hat schon 803 Teile eingebaut.', 'b) Es fehlen noch 447 Teile.'],
    kontext: 'LEGO',
    merkmal: 'bisher – fehlt noch',
    ops: ['+', '−']
  },
  {
    id: 'tg02',
    text: 'Ein Skiclub kauft 6 Tageskarten zu je 47 €. Der Trainer zahlt mit 300 €.',
    fragen: ['Wie viel kosten die Tageskarten zusammen?', 'Wie viel Restgeld bekommt der Trainer?'],
    loesung: [282, 18],
    weg: [
      'geg: 6 Tageskarten; eine Tageskarte: 47 €; bezahlt: 300 € — ges: a) Preis aller Tageskarten; b) Restgeld',
      'a) 6 · 47 = 282',
      'b) 300 − 282 = 18',
      'A: a) Die Tageskarten kosten zusammen 282 €. b) Der Trainer bekommt 18 € Restgeld.'
    ],
    geg: ['6 Tageskarten', 'eine Tageskarte: 47 €', 'bezahlt: 300 €'],
    ges: ['a) Preis aller Tageskarten', 'b) Restgeld'],
    rechnung: ['a) 6 · 47 = 282', 'b) 300 − 282 = 18'],
    antwort: ['a) Die Tageskarten kosten zusammen 282 €.', 'b) Der Trainer bekommt 18 € Restgeld.'],
    kontext: 'Skifahren',
    merkmal: 'Restgeld',
    ops: ['·', '−']
  },
  {
    id: 'tg03',
    text: 'Die Klasse fährt zur Stunt-Show. Der Bus kostet 288 €, der Eintritt für alle zusammen 504 €. 22 Kinder fahren mit und teilen sich die Kosten gerecht.',
    fragen: ['Wie viel kostet der Ausflug insgesamt?', 'Wie viel zahlt jedes Kind?'],
    loesung: [792, 36],
    weg: [
      'geg: Bus: 288 €; Eintritt: 504 €; 22 Kinder — ges: a) Kosten insgesamt; b) Kosten für ein Kind',
      'a) 288 + 504 = 792',
      'b) 792 : 22 = 36',
      { mono: ['_79_2 : 22 = 36', '132', '  0 R'] },
      'A: a) Der Ausflug kostet insgesamt 792 €. b) Jedes Kind zahlt 36 €.'
    ],
    geg: ['Bus: 288 €', 'Eintritt: 504 €', '22 Kinder'],
    ges: ['a) Kosten insgesamt', 'b) Kosten für ein Kind'],
    rechnung: ['a) 288 + 504 = 792', 'b) 792 : 22 = 36'],
    antwort: ['a) Der Ausflug kostet insgesamt 792 €.', 'b) Jedes Kind zahlt 36 €.'],
    kontext: 'Stunt-Show',
    merkmal: 'pro Kind teilen',
    ops: ['+', ':']
  },
  {
    id: 'tg04',
    text: 'Für den Krampuslauf backt die Klasse am Montag 158 Kekse und am Dienstag 129 Kekse. Immer 8 Kekse kommen in ein Sackerl.',
    fragen: ['Wie viele Sackerl werden voll?', 'Wie viele Kekse bleiben übrig?'],
    loesung: [35, 7],
    weg: [
      'geg: Montag: 158 Kekse; Dienstag: 129 Kekse; 8 Kekse in jedes Sackerl — ges: a) volle Sackerl; b) Kekse, die übrig bleiben',
      '158 + 129 = 287',
      '287 : 8 = 35 R 7',
      { mono: ['_28_7 : 8 = 35', ' 47', '  7 R'] },
      'A: a) Es werden 35 Sackerl voll. b) 7 Kekse bleiben übrig.'
    ],
    geg: ['Montag: 158 Kekse', 'Dienstag: 129 Kekse', '8 Kekse in jedes Sackerl'],
    ges: ['a) volle Sackerl', 'b) Kekse, die übrig bleiben'],
    rechnung: ['158 + 129 = 287', '287 : 8 = 35 R 7'],
    antwort: ['a) Es werden 35 Sackerl voll.', 'b) 7 Kekse bleiben übrig.'],
    kontext: 'Krampuslauf',
    merkmal: 'Division mit Rest',
    ops: ['+', ':']
  },
  {
    id: 'tg05',
    text: 'Am Samstag kommen 1 348 Zuschauer zum Fußballspiel. Am Sonntag kommen um 276 Zuschauer mehr.',
    fragen: [
      'Wie viele Zuschauer kommen am Sonntag?',
      'Der Fußballplatz hat 2 500 Plätze. Wie viele Plätze bleiben am Sonntag frei?'
    ],
    loesung: [1624, 876],
    weg: [
      'geg: Samstag: 1 348 Zuschauer; Sonntag: um 276 Zuschauer mehr; 2 500 Plätze — ges: a) Zuschauer am Sonntag; b) freie Plätze am Sonntag',
      'a) 1 348 + 276 = 1 624',
      'b) 2 500 − 1 624 = 876',
      'A: a) Am Sonntag kommen 1 624 Zuschauer. b) Am Sonntag bleiben 876 Plätze frei.'
    ],
    geg: ['Samstag: 1 348 Zuschauer', 'Sonntag: um 276 Zuschauer mehr', '2 500 Plätze'],
    ges: ['a) Zuschauer am Sonntag', 'b) freie Plätze am Sonntag'],
    rechnung: ['a) 1 348 + 276 = 1 624', 'b) 2 500 − 1 624 = 876'],
    antwort: ['a) Am Sonntag kommen 1 624 Zuschauer.', 'b) Am Sonntag bleiben 876 Plätze frei.'],
    kontext: 'Fußball',
    merkmal: 'um … mehr',
    ops: ['+', '−']
  },
  {
    id: 'tg06',
    text: 'Im Dezember fährt der Skibus 1 460 km. Das sind um 385 km weniger als im Jänner.',
    fragen: ['Wie viele km fährt der Skibus im Jänner?', 'Wie viele km fährt er in beiden Monaten zusammen?'],
    loesung: [1845, 3305],
    weg: [
      'geg: Dezember: 1 460 km; um 385 km weniger als im Jänner — ges: a) km im Jänner; b) km in beiden Monaten',
      'a) 1 460 + 385 = 1 845',
      'b) 1 460 + 1 845 = 3 305',
      'A: a) Im Jänner fährt der Skibus 1 845 km. b) In beiden Monaten fährt er zusammen 3 305 km.'
    ],
    geg: ['Dezember: 1 460 km', 'um 385 km weniger als im Jänner'],
    ges: ['a) km im Jänner', 'b) km in beiden Monaten'],
    rechnung: ['a) 1 460 + 385 = 1 845', 'b) 1 460 + 1 845 = 3 305'],
    antwort: ['a) Im Jänner fährt der Skibus 1 845 km.', 'b) In beiden Monaten fährt er zusammen 3 305 km.'],
    kontext: 'Bus',
    merkmal: 'um … weniger als (Falle: gerechnet wird plus)',
    ops: ['+', '+']
  },
  {
    id: 'tg07',
    text: 'Der Fußballverein kauft 12 neue Bälle zu je 24 €. Dazu kauft er eine Ballpumpe um 19 €.',
    fragen: ['Wie viel kosten die Bälle?', 'Wie viel zahlt der Verein insgesamt?'],
    loesung: [288, 307],
    weg: [
      'geg: 12 Bälle; ein Ball: 24 €; Ballpumpe: 19 € — ges: a) Preis der Bälle; b) Preis insgesamt',
      'a) 12 · 24 = 288',
      'b) 288 + 19 = 307',
      'A: a) Die Bälle kosten 288 €. b) Der Verein zahlt insgesamt 307 €.'
    ],
    geg: ['12 Bälle', 'ein Ball: 24 €', 'Ballpumpe: 19 €'],
    ges: ['a) Preis der Bälle', 'b) Preis insgesamt'],
    rechnung: ['a) 12 · 24 = 288', 'b) 288 + 19 = 307'],
    antwort: ['a) Die Bälle kosten 288 €.', 'b) Der Verein zahlt insgesamt 307 €.'],
    kontext: 'Fußball',
    merkmal: 'Einkauf',
    ops: ['·', '+']
  },
  {
    id: 'tg08',
    text: 'Eine Gondel bringt bei 6 Fahrten 1 032 Skifahrer auf den Berg. Bei jeder Fahrt sind es gleich viele.',
    fragen: ['Wie viele Skifahrer bringt die Gondel bei einer Fahrt?', 'Wie viele Skifahrer sind es bei 25 Fahrten?'],
    loesung: [172, 4300],
    weg: [
      'geg: 6 Fahrten: 1 032 Skifahrer; bei jeder Fahrt gleich viele; 25 Fahrten — ges: a) Skifahrer bei einer Fahrt; b) Skifahrer bei 25 Fahrten',
      'a) 1 032 : 6 = 172',
      'b) 172 · 25 = 4 300',
      { mono: ['_10_32 : 6 = 172', ' 43', '  12', '   0 R'] },
      'A: a) Bei einer Fahrt bringt die Gondel 172 Skifahrer. b) Bei 25 Fahrten sind es 4 300 Skifahrer.'
    ],
    geg: ['6 Fahrten: 1 032 Skifahrer', 'bei jeder Fahrt gleich viele', '25 Fahrten'],
    ges: ['a) Skifahrer bei einer Fahrt', 'b) Skifahrer bei 25 Fahrten'],
    rechnung: ['a) 1 032 : 6 = 172', 'b) 172 · 25 = 4 300'],
    antwort: ['a) Bei einer Fahrt bringt die Gondel 172 Skifahrer.', 'b) Bei 25 Fahrten sind es 4 300 Skifahrer.'],
    kontext: 'Skifahren',
    merkmal: '',
    ops: [':', '·']
  },
  {
    id: 'tg09',
    text: 'Für den Krampuslauf werden 960 Sitzplätze aufgebaut. 132 Plätze sind für die Musikkapelle reserviert. Die übrigen Plätze stehen in 18 gleich langen Reihen.',
    fragen: ['Wie viele Plätze sind für die Zuschauer?', 'Wie viele Plätze hat eine Reihe?'],
    loesung: [828, 46],
    weg: [
      'geg: 960 Sitzplätze; Musikkapelle: 132 Plätze; 18 gleich lange Reihen — ges: a) Plätze für die Zuschauer; b) Plätze in einer Reihe',
      'a) 960 − 132 = 828',
      'b) 828 : 18 = 46',
      { mono: ['_82_8 : 18 = 46', '108', '  0 R'] },
      'A: a) Für die Zuschauer sind 828 Plätze da. b) Eine Reihe hat 46 Plätze.'
    ],
    geg: ['960 Sitzplätze', 'Musikkapelle: 132 Plätze', '18 gleich lange Reihen'],
    ges: ['a) Plätze für die Zuschauer', 'b) Plätze in einer Reihe'],
    rechnung: ['a) 960 − 132 = 828', 'b) 828 : 18 = 46'],
    antwort: ['a) Für die Zuschauer sind 828 Plätze da.', 'b) Eine Reihe hat 46 Plätze.'],
    kontext: 'Krampuslauf',
    merkmal: '',
    ops: ['−', ':']
  },
  {
    id: 'tg10',
    text: 'Ben bekommt jede Woche 7 € Taschengeld und spart alles.',
    fragen: ['Wie viel Geld hat er nach 52 Wochen?', 'Dann kauft er ein Fahrrad um 299 €. Wie viel Geld bleibt ihm?'],
    loesung: [364, 65],
    weg: [
      'geg: jede Woche 7 €; 52 Wochen; Fahrrad: 299 € — ges: a) Geld nach 52 Wochen; b) Geld, das bleibt',
      'a) 52 · 7 = 364',
      'b) 364 − 299 = 65',
      'A: a) Nach 52 Wochen hat Ben 364 €. b) Ihm bleiben 65 €.'
    ],
    geg: ['jede Woche 7 €', '52 Wochen', 'Fahrrad: 299 €'],
    ges: ['a) Geld nach 52 Wochen', 'b) Geld, das bleibt'],
    rechnung: ['a) 52 · 7 = 364', 'b) 364 − 299 = 65'],
    antwort: ['a) Nach 52 Wochen hat Ben 364 €.', 'b) Ihm bleiben 65 €.'],
    kontext: 'Taschengeld',
    merkmal: '',
    ops: ['·', '−']
  }
];

// Vorlagen prüfen: Fehlerhafte fallen weg (Konsole); das Prüfskript meldet sie als FEHLER
const VORLAGEN_FEHLER = [];
const RECHNUNG_ART = { 'a + b': '+', 'b + a': '+', 'a − b': '−', 'a · b': '·', 'b · a': '·', 'a : b': ':' };
const taRechnung = [];
for (const g of TA_RECHNUNG) for (const fr of g.fragen || []) {
  const ohne = String(fr.text || '').replace('{a}', '').replace('{b}', '');
  if (!/\{a\}/.test(fr.text) || !/\{b\}/.test(fr.text) || /[{}]|\d/.test(ohne)) { VORLAGEN_FEHLER.push(`ta-rechnung ${g.id}: Text braucht genau {a} und {b} und sonst keine Ziffern`); continue; }
  if (RECHNUNG_ART[fr.rechnung] !== fr.art) { VORLAGEN_FEHLER.push(`ta-rechnung ${g.id}: Rechnung „${fr.rechnung}“ passt nicht zu ${fr.art}`); continue; }
  taRechnung.push({ geschichte: g.id, ...fr });
}
const taGanz = (TA_GANZ || []).filter(x => {
  const ok = x && x.id && x.text && Array.isArray(x.fragen) && x.fragen.length >= 2 && (Array.isArray(x.loesung) || (x.zahlen && Array.isArray(x.rechnung) && x.rechnung.length === x.fragen.length));
  if (!ok) VORLAGEN_FEHLER.push(`ta-ganz ${x && x.id}: unvollständig`);
  return ok;
});
if (VORLAGEN_FEHLER.length && typeof console !== 'undefined') console.warn('Mathe Legends, Vorlagen:', VORLAGEN_FEHLER);

// Zahlen für ta-rechnung: dieselbe Verteilung für alle vier Rechenarten (Hinweis-Test „Zahlenmuster“), nach TA_ZAHLEN
function taZahlen(rnd) {
  const Z = TA_ZAHLEN || { b: [3, 9], q: [4, 12], qNicht: [10], qUngleichB: true };
  for (let v = 0; v < 60; v++) {
    const b = zwischen(rnd, Z.b[0], Z.b[1]), q = zwischen(rnd, Z.q[0], Z.q[1]);
    if ((Z.qNicht || []).includes(q) || (Z.qUngleichB && q === b)) continue;
    const a = b * q, erg = [a + b, a - b, a * b, q];
    if (new Set(erg).size === 4 && !erg.includes(a) && !erg.includes(b)) return { a, b, q };
  }
  return { a: 84, b: 7, q: 12 };
}
const fuelle = (s, werte) => String(s || '').replace(/\{(\w+)\}/g, (_, k) => (werte[k] == null ? '' : werte[k])).replace(/\s+/g, ' ').trim();
const taRechnungTyp = {
  id: 'ta-rechnung', thema: 'text', titel: 'Textaufgabe: Rechnung finden', quelle: 'Üb. S. 24–25, 29, 31, 33 · Buch S. 74–75',
  rang: 1, wo: 'app', auswahl: false, nah: ['vb-term', 'sub-begriffe'], voraus: [], gewicht: 2, sek: 40, sekNeu: 60, varianten: ['+', '−', '·', ':'],
  erzeuge(rnd) {
    // jede Rechenart gleich oft; Eingabe für alle gleich: zuerst die Rechnung (ohne vorgedrucktes Zeichen), dann das Ergebnis
    const art = wahl(rnd, ['+', '−', '·', ':']);
    const fr = wahl(rnd, taRechnung.filter(x => x.art === art).length ? taRechnung.filter(x => x.art === art) : taRechnung);
    const { a, b } = taZahlen(rnd);
    const wert = { '+': a + b, '−': a - b, '·': a * b, ':': a / b };
    const zahl = v => (v === 'a' ? a : b);
    const [l, op, r] = fr.rechnung.split(' ');
    const term = `${F(zahl(l))} ${op} ${F(zahl(r))}`;
    const w = wert[fr.art];
    const text = fr.text.replace('{a}', F(a)).replace('{b}', F(b));
    // Fehler an der Rechnung (Feld 0): die Rechenart des Signalworts bei einer Falle („signalwort“), eine andere Rechenart
    // („rechenart“), b − a oder b : a („umgedreht“, wenn es die richtige Rechenart ist). Stimmt die Rechnung und nur das
    // Ergebnis nicht, meldet pruefe „rechenfehler“. Andere Zahlen als im Text: „zahlen“.
    const falle = fr.signal === 'irrefuehrend' && fr.irreArt ? fr.irreArt : null;
    const artFuer = o => (o === fr.art ? 'umgedreht' : o === falle ? 'signalwort' : 'rechenart');
    const f = sammler([`0:${w}`]);
    for (const o of ['+', '−', '·', ':']) if (o !== fr.art) f.setze(`0:${wert[o]}`, artFuer(o));
    f.setze(`0:${b - a}`, artFuer('−'));       // b − a: negativ
    f.setze('0:?nichtGanz', artFuer(':'));     // b : a: geht nie auf
    const frage = text.slice(text.lastIndexOf('. ') + 2);
    const warum = fr.schritt1 || '';
    return aufgabe('ta-rechnung', {
      variante: fr.art, vorlage: fr.vorlage || `${fr.geschichte}-${fr.art}`, falle: !!falle, kennung: `ta-rechnung|${fr.geschichte}|${fr.art}|${text}`,
      text, term: '', eingabe: 'felder', felder: [{ art: 'term', label: 'Rechnung' }, { art: 'zahl', label: 'Ergebnis' }],
      loesung: [{ wert: w, zahlen: [a, b], terme: [term] }, w],
      weg: [warum || `Lies die Frage: „${frage}“ Wird es mehr oder weniger?`, `Rechnung: ${term} = ${F(w)}`,
        fr.antwort ? `A: ${fuelle(fr.antwort, { e: F(w) })}` : `${term} = ${F(w)}`],
      fehler: f.map,
      rueck: {
        signalwort: fuelle(TA_RUECK.signalwort, { wort: fr.wort || '', irreName: OP_NAME[falle] || '', warum }),
        rechenart: fuelle(TA_RUECK.rechenart, { warum }),
        umgedreht: TA_RUECK.umgedreht, zahlen: TA_RUECK.zahlen, rechenfehler: TA_RUECK.rechenfehler
      }
    });
  }
};

// Rechnung einer ta-ganz-Vorlage mit Zahlen ausrechnen: 'z − [a]' → { text: '600 − 432', wert: 168 }
function vorlageRechnen(rechnung, zahlen, erg) {
  const roh = rechnung.replace(/\[([ab])\]/g, (_, k) => String(erg[k])).replace(/\b([a-z]+)\b/g, (_, k) => String(zahlen[k]));
  const t = termAus(roh);
  return t && t.wert != null ? { text: roh.replace(/\d+/g, n => F(Number(n))), wert: t.wert } : null;
}
function vorlageText(s, zahlen, erg) {
  return String(s || '').replace(/\{([a-z]+)\}/g, (_, k) => F(zahlen[k])).replace(/\[([ab])\]/g, (_, k) => F(erg[k]));
}
const taGanzTyp = {
  id: 'ta-ganz', thema: 'text', titel: 'Textaufgabe mit a) und b)', quelle: 'Üb. S. 24 Nr. 1–3, S. 25 Nr. 1–4 · Buch S. 74–75 · Heft (geg/ges/A)',
  rang: 2, wo: 'papier', auswahl: false, nah: [], voraus: ['ta-rechnung'], gewicht: 2, sek: 240, sekNeu: 300, varianten: [],
  erzeuge(rnd) {
    const v = wahl(rnd, taGanz);
    const marken = v.fragen.map((_, i) => String.fromCharCode(97 + i));   // a, b, c
    const felder = marken.map(m => ({ art: 'zahl', label: `${m})` }));
    const fragenText = v.fragen.map((q, i) => `${marken[i]}) ${q}`).join(' ');
    if (Array.isArray(v.loesung)) {
      return aufgabe('ta-ganz', { variante: v.id, kennung: `ta-ganz|${v.id}`, text: `${v.text} ${fragenText}`, eingabe: 'felder', felder,
        loesung: v.loesung.slice(), weg: (v.weg || []).slice(0, 5), fehler: {},
        rueck: { _: 'Mach die Probe: Kommt genau die Ausgangszahl heraus? Schau auch, ob du für b) das Ergebnis von a) genommen hast.' } });
    }
    for (let versuch = 0; versuch < 60; versuch++) {
      const zahlen = {};
      for (const [k, [von, bis, schritt = 1]] of Object.entries(v.zahlen)) zahlen[k] = von + zwischen(rnd, 0, Math.floor((bis - von) / schritt)) * schritt;
      const erg = {}, rech = [];
      let ok = true;
      v.rechnung.forEach((r, i) => {
        const x = ok && vorlageRechnen(r, zahlen, erg);
        if (!x || !(x.wert > 0)) { ok = false; return; }
        erg[marken[i]] = x.wert;
        rech.push(x);
      });
      if (!ok) continue;
      const loesung = marken.map(m => erg[m]);
      const geg = v.geg ? `geg: ${vorlageText(v.geg, zahlen, erg)}; ges: ${vorlageText(v.ges, zahlen, erg)}` : 'Frage unterstreichen: Was wird gesucht? Was weißt du?';
      if (loesung.some(l => new RegExp(`(^|\\D)${F(l)}(\\D|$)`).test(geg))) continue;   // weg[0] verrät nichts
      const f = sammler(loesung.map((l, i) => `${i}:${l}`));
      for (const x of v.fehler || []) { const r = vorlageRechnen(x.rechnung, zahlen, erg); if (r && r.wert >= 0) f.setze(`${x.feld}:${r.wert}`, x.art); }
      return aufgabe('ta-ganz', {
        variante: v.id, kennung: `ta-ganz|${v.id}|${Object.values(zahlen).join(',')}`,
        text: `${vorlageText(v.text, zahlen, erg)} ${v.fragen.map((q, i) => `${marken[i]}) ${vorlageText(q, zahlen, erg)}`).join(' ')}`,
        term: '', eingabe: 'felder', felder, loesung,
        weg: [geg, rech.map((x, i) => `${marken[i]}) ${x.text} = ${F(x.wert)}`).join('; '),
          v.antwort ? `A: ${v.antwort.map(s => vorlageText(s, zahlen, erg)).join(' ')}` : 'A: Antwortsatz mit Einheit ins Heft.'],
        fehler: f.map, rueck: { _: 'Geh die Aufgabe noch einmal durch: geg, ges, Rechnung. Passt dein Ergebnis zur Frage?' }
      });
    }
    return aufgabe('ta-ganz', { variante: 'kastanien-ziel', kennung: 'ta-ganz|fest', text: 'Eine Klasse sammelt 600 Kastanien als Ziel. Am Montag sammeln die Kinder 185, am Dienstag 247. a) Wie viele haben sie bisher? b) Wie viele fehlen noch?',
      eingabe: 'felder', felder, loesung: [432, 168], weg: ['geg: Ziel 600, Montag 185, Dienstag 247; ges: a) bisher, b) fehlen', 'a) 185 + 247 = 432; b) 600 − 432 = 168', 'A: Sie haben 432 gesammelt, 168 fehlen noch.'], fehler: {} });
  }
};

// ================================================================
// Multiplikation (Üb. S. 28–29, Buch S. 88–93, Heft): Kopfrechnen mit Stufenzahlen, Nullen, drei Faktoren, Klammer;
// schriftlich mit der linken Ziffer des 2. Faktors beginnen, rechts ein Punkt als Platzhalter, jede Zeile eine Stelle weiter
// ================================================================
const mulKopfStufe = {
  id: 'mul-kopf-stufe', thema: 'multiplikation', titel: 'Mal 10, 100, 1 000', quelle: 'Üb. S. 28 Nr. 2a · Buch S. 88–93',
  rang: 1, wo: 'app', auswahl: false, nah: ['div-kopf', 'mul-kopf-nullen'], voraus: [], gewicht: 1, sek: 10, sekNeu: 15, varianten: [],
  erzeuge(rnd) {
    // 406 · 100 = 40 600: Zahl mit Nullen drin oder hinten, · 10/100/1 000, auch vertauscht
    const x = ausZiffern(ziffernMit(rnd, zwischen(rnd, 2, 4), 0.35));
    const nullen = gewichtet(rnd, [[1, 30], [2, 40], [3, 30]]), s = hoch(nullen), r = x * s;
    const term = rnd() < 0.8 ? `${F(x)} · ${F(s)}` : `${F(s)} · ${F(x)}`;
    const f = sammler([String(r)]);
    f.setze(String(r / 10), 'nullenMal');
    f.setze(String(r * 10), 'nullenMal');
    return aufgabe('mul-kopf-stufe', {
      text: 'Rechne im Kopf.', term, loesung: r,
      weg: [`Mal ${F(s)} heißt: ${NULLEN_WORT[nullen]} hinten anhängen.`, `${term} = ${F(r)}`], fehler: f.map,
      rueck: { _: `Zähl die Nullen: mal ${F(s)} sind ${NULLEN_WORT[nullen]} mehr.` }
    });
  }
};

const mulKopfNullen = {
  id: 'mul-kopf-nullen', thema: 'multiplikation', titel: 'Mal mit Nullen', quelle: 'Üb. S. 28 Nr. 2b · Buch S. 88–93',
  rang: 2, wo: 'app', auswahl: false, nah: ['mul-kopf-stufe', 'div-kopf'], voraus: ['mul-kopf-stufe'], gewicht: 1, sek: 10, sekNeu: 15, varianten: ['normal', 'extra-null'],
  erzeuge(rnd) {
    // 60 · 400 = 24 000: Zehner · Hunderter bis Millionen, auch Extra-Null (50 · 400 = 20 000)
    const extra = rnd() < 0.3;
    let d1 = zwischen(rnd, 2, 9), d2 = zwischen(rnd, 2, 9);
    if (extra) { d1 = 5; d2 = wahl(rnd, [2, 4, 6, 8]); }
    const i = zwischen(rnd, 1, 3), j = zwischen(rnd, 1, Math.min(3, 5 - i));
    let x = d1 * hoch(i), y = d2 * hoch(j);
    if (rnd() < 0.5) { const t = x; x = y; y = t; }
    const p = d1 * d2, r = x * y;
    const f = sammler([String(r)]);
    f.setze(String(r / 10), p % 10 === 0 ? 'extraNull' : 'nullenMal');
    f.setze(String(r * 10), 'nullenMal');
    const nx = stellenVon(x) - 1, ny = stellenVon(y) - 1;
    return aufgabe('mul-kopf-nullen', {
      variante: p % 10 === 0 ? 'extra-null' : 'normal', text: 'Rechne im Kopf.', term: `${F(x)} · ${F(y)}`, loesung: r,
      weg: [`Zuerst ohne Nullen: ${String(x)[0]} · ${String(y)[0]} = ${p}`, `Dann die Nullen zählen: ${nx} + ${ny} = ${nx + ny} Nullen anhängen${p % 10 === 0 ? ` (die 0 von ${p} bleibt dabei)` : ''}`, `${F(x)} · ${F(y)} = ${F(r)}`],
      fehler: f.map, rueck: { _: 'Kann das stimmen? Zuerst ohne Nullen rechnen, dann alle Nullen dazuzählen.' }
    });
  }
};

const mulKopfDrei = {
  id: 'mul-kopf-drei', thema: 'multiplikation', titel: 'Drei Faktoren', quelle: 'Üb. S. 28 Nr. 2c · Buch S. 88–93',
  rang: 3, wo: 'app', auswahl: false, nah: [], voraus: [], gewicht: 1, sek: 10, sekNeu: 15, varianten: ['vorteil', 'normal'],
  erzeuge(rnd) {
    // 6 · 5 · 3 = 90: oft ein Paar, das einen Zehner ergibt (Vertauschen erlaubt)
    for (let v = 0; v < 40; v++) {
      const vorteil = rnd() < 0.5;
      let fs = [zwischen(rnd, 2, 9), zwischen(rnd, 2, 9), zwischen(rnd, 2, 9)];
      if (vorteil) fs = mische(rnd, [5, wahl(rnd, [2, 4, 6, 8]), zwischen(rnd, 2, 9)]);
      const r = fs[0] * fs[1] * fs[2];
      if (r > 500) continue;
      let paar = [0, 1];
      for (const [p, q] of [[0, 1], [1, 2], [0, 2]]) if ((fs[p] * fs[q]) % 10 === 0) { paar = [p, q]; break; }
      const rest = [0, 1, 2].find(k => !paar.includes(k)), pq = fs[paar[0]] * fs[paar[1]];
      const f = sammler([String(r)]);
      f.setze(String(fs[0] * fs[1]), 'faktor'); f.setze(String(fs[1] * fs[2]), 'faktor'); f.setze(String(fs[0] * fs[2]), 'faktor');
      if (String(pq) === String(r)) continue;
      return aufgabe('mul-kopf-drei', {
        variante: vorteil ? 'vorteil' : 'normal', text: 'Rechne im Kopf.', term: fs.join(' · '), loesung: r,
        weg: [`${(pq % 10 === 0) ? 'Geschickt zusammenfassen' : 'Zuerst zwei Faktoren'}: ${fs[paar[0]]} · ${fs[paar[1]]} = ${pq}`, `${pq} · ${fs[rest]} = ${F(r)}`],
        fehler: f.map, rueck: { _: 'Rechne in zwei Schritten: zuerst zwei Faktoren, dann mal den dritten. Vertauschen ist erlaubt.' }
      });
    }
    return aufgabe('mul-kopf-drei', { text: 'Rechne im Kopf.', term: '6 · 5 · 3', loesung: 90, weg: ['Geschickt zusammenfassen: 6 · 5 = 30', '30 · 3 = 90'], fehler: { 30: 'faktor', 15: 'faktor', 18: 'faktor' } });
  }
};

const mulKopfKlammer = {
  id: 'mul-kopf-klammer', thema: 'multiplikation', titel: 'Mal mit Klammer', quelle: 'Üb. S. 28 Nr. 2d · Buch S. 88–93',
  rang: 4, wo: 'app', auswahl: false, nah: ['vb-regeln'], voraus: [], gewicht: 1, sek: 12, sekNeu: 18, varianten: ['summe', 'differenz'],
  erzeuge(rnd) {
    // 7 · (6 + 4) = 70: Klammer zuerst
    const fak = zwischen(rnd, 2, 9), diff = rnd() < 0.2;
    const s = diff ? zwischen(rnd, 2, 10) : gewichtet(rnd, [[10, 50], [20, 15], [zwischen(rnd, 4, 12), 35]]);
    let a, b;
    if (diff) { b = zwischen(rnd, 2, 9); a = s + b; } else { a = zwischen(rnd, 2, s - 2); b = s - a; }   // nie (7 − 1) oder (1 + 9)
    const o = diff ? '−' : '+', vorne = rnd() < 0.7;
    const kl = `(${a} ${o} ${b})`, term = vorne ? `${fak} · ${kl}` : `${kl} · ${fak}`, r = fak * s;
    const ohne = vorne ? (diff ? fak * a - b : fak * a + b) : (diff ? a - b * fak : a + b * fak);
    const f = sammler([String(r)]);
    if (ohne >= 0) f.setze(String(ohne), 'klammer');
    return aufgabe('mul-kopf-klammer', {
      variante: diff ? 'differenz' : 'summe', text: 'Rechne im Kopf.', term, loesung: r,
      weg: [`Klammer zuerst: ${a} ${o} ${b} = ${s}`, `${vorne ? `${fak} · ${s}` : `${s} · ${fak}`} = ${F(r)}`], fehler: f.map,
      rueck: { _: 'Klammer zuerst, dann mal. Kann das Ergebnis stimmen?' }
    });
  }
};

// Schriftlich multiplizieren: jede Ziffer des 1. Faktors · d, nur die Einer hinschreiben (Übertrag vergessen)
function mal1OhneUebertrag(x, d) {
  const L = stellenVon(x);
  let r = 0;
  for (let j = 0; j < L; j++) { const p = ziffer(x, j) * d; r += (j === L - 1 ? p : p % 10) * hoch(j); }
  return r;
}
// Rechenspalten wie im Heft und in der Generalprobe: 607 · 48 → „2428·“ (Punkt als Platzhalter) und darunter „4856“
// eine Stelle weiter rechts, dann ein Strich und die Summe
function malSpalten(x, y) {
  const ys = String(y), k = ys.length;
  const zeilen = ys.split('').map((d, j) => String(x * Number(d)) + '·'.repeat(k - 1 - j));
  const kopf = `${x} · ${y}`, erg = String(x * y);
  const breite = Math.max(kopf.length, ...zeilen.map(z => z.length), erg.length);
  const strich = '-'.repeat(Math.max(erg.length, ...zeilen.map(z => z.length)));
  return [kopf.padStart(breite), ...zeilen.map(z => z.padStart(breite)), strich.padStart(breite), erg.padStart(breite)];
}
const mulSchriftlich = {
  id: 'mul-schriftlich', thema: 'multiplikation', titel: 'Schriftlich multiplizieren', quelle: 'Üb. S. 28 Nr. 1, 3 · Buch S. 88–93 · Heft',
  rang: 5, wo: 'papier', auswahl: false, nah: [], voraus: [], gewicht: 2, sek: 90, sekNeu: 120, varianten: ['einstellig', 'zweistellig', 'mul-einser', 'dreistellig'],
  erzeuge(rnd) {
    // 3–4-stellig · 1-stellig; 3-stellig · 2-stellig (auch mit 0); Variante mul-einser: · 11 bis 19; selten · 3-stellig (Heft)
    const variante = gewichtet(rnd, [['einstellig', 35], ['zweistellig', 35], ['mul-einser', 20], ['dreistellig', 10]]);
    let x, y;
    if (variante === 'einstellig') { x = ausZiffern(ziffernMit(rnd, zwischen(rnd, 3, 4), 0.15)); y = zwischen(rnd, 3, 9); }
    else if (variante === 'zweistellig') { x = zahlMit(rnd, 3); y = rnd() < 0.25 ? zwischen(rnd, 2, 9) * 10 : zwischen(rnd, 21, 98); }
    else if (variante === 'mul-einser') { x = zahlMit(rnd, zwischen(rnd, 2, 4)); y = zwischen(rnd, 11, 19); }
    else { x = zahlMit(rnd, 3); y = ausZiffern(ziffernMit(rnd, 3, 0.2)); }
    const r = x * y;
    const f = sammler([String(r)]);
    if (y < 10) f.setze(String(mal1OhneUebertrag(x, y)), 'uebertrag');
    else {
      const ds = String(y).split('').map(Number);
      f.setze(String(ds.reduce((a, d) => a + x * d, 0)), 'zeileVerrutscht');   // Zeilen nicht verschoben
      f.setze(String(ds.reduce((a, d, j) => a + x * d * hoch(2 * (ds.length - 1 - j)), 0)), 'zeileVerrutscht');   // zwei Stellen weiter
    }
    const ys = String(y);
    const weg = y < 10
      ? [`Von rechts: ${ziffer(x, 0)} · ${y} = ${ziffer(x, 0) * y}${ziffer(x, 0) * y >= 10 ? ` → schreib ${ziffer(x, 0) * y % 10}, merk ${Math.floor(ziffer(x, 0) * y / 10)}` : ''}`,
        'Dann jede Ziffer weiter nach links, den gemerkten Übertrag dazuzählen.', `${F(x)} · ${y} = ${F(r)}`]
      : [`Mit der linken Ziffer des 2. Faktors beginnen: ${F(x)} · ${ys[0]} = ${F(x * Number(ys[0]))}`, { mono: malSpalten(x, y) }, `${F(x)} · ${F(y)} = ${F(r)}`];
    return aufgabe('mul-schriftlich', {
      variante, text: 'Rechne schriftlich.', term: `${F(x)} · ${F(y)}`, loesung: r, weg, fehler: f.map,
      rueck: { _: 'Kann das stimmen? Rechne jede Zeile nach und schau, ob sie eine Stelle weiter rechts steht.' }
    });
  }
};

// ================================================================
// Division (Üb. S. 30–31, Buch S. 94–99, Heft): Kopfrechnen; schriftlich in Kurzform wie im Heft – erste Teilzahl
// unterstrichen, darunter nur die Reste, jede Zeile eine Stelle weiter, der letzte Rest mit „R“ („1 R“, auch „0 R“).
// Probe „PR:“ Quotient · Divisor, dann „+ R“ = Dividend. Durch 0 geht nicht. Taste „nicht möglich“ bei jeder Division.
// ================================================================
function kurzform(n, d) {
  const s = String(n);
  let i = 0, teil = 0;
  while (i < s.length && (teil < d || i === 0)) { teil = teil * 10 + Number(s[i]); i++; if (teil >= d) break; }
  const erste = s.slice(0, i), q = Math.floor(n / d), r = n % d;
  const zeilen = [`_${erste}_${s.slice(i)} : ${d} = ${q}`];
  let rest = teil % d;
  for (; i < s.length; i++) {
    const z = String(rest) + s[i];
    zeilen.push(' '.repeat(Math.max(0, i + 1 - z.length)) + z);
    rest = (rest * 10 + Number(s[i])) % d;
  }
  zeilen.push(' '.repeat(Math.max(0, s.length - String(rest).length)) + `${rest} R`);
  return { erste: Number(erste), q, r, zeilen };
}
// Probe wie im Heft und in der Generalprobe: „PR: 1 057 · 6 = 6 342, 6 342 + 3 R = 6 345“
const probeText = (q, d, r) => `PR: ${F(q)} · ${d} = ${F(q * d)}${r ? `, ${F(q * d)} + ${r} R = ${F(q * d + r)}` : ''}`;
function divFehler(f, q, r, d) {
  const qs = String(q);
  if (qs.includes('0') && qs.length > 1) {
    f.setze(`${Number(qs.replace(/0/g, '')) || 0}R${r}`, 'nullQuotient');
    for (let k = 1; k < qs.length; k++) if (qs[k] === '0') f.setze(`${Number(qs.slice(0, k) + qs.slice(k + 1))}R${r}`, 'nullQuotient');
  }
  if (r) f.setze(`${q}R0`, 'restVergessen');
  if (q > 1) f.setze(`${q - 1}R${r + d}`, 'restZuGross');
}
const divKopf = {
  id: 'div-kopf', thema: 'division', titel: 'Dividieren im Kopf', quelle: 'Üb. S. 30 Nr. 1 · Buch S. 94–99',
  rang: 1, wo: 'app', auswahl: false, nah: ['mul-kopf-stufe', 'mul-kopf-nullen'], voraus: [], gewicht: 1, sek: 10, sekNeu: 15,
  varianten: ['einmaleins', 'rest', 'stufe', 'nullen', 'eins', 'null', 'durch-null'],
  erzeuge(rnd, opt = {}) {
    // Einmaleins umgekehrt; : 10/100/1 000; Nullen streichen (1 800 : 60); mit 0 und 1 („: 0“ = nicht möglich)
    const variante = opt.zweck === 'beispiel' ? 'nullen'
      : opt.zweck === 'einstufung' ? gewichtet(rnd, [['nullen', 50], ['stufe', 25], ['rest', 15], ['durch-null', 10]])   // Schularbeits-Niveau
        : gewichtet(rnd, [['einmaleins', 28], ['rest', 8], ['stufe', 24], ['nullen', 28], ['eins', 4], ['null', 4], ['durch-null', 4]]);
    const f = sammler([]);
    let n, d, q, r = 0, weg;
    if (variante === 'einmaleins' || variante === 'rest') {
      d = zwischen(rnd, variante === 'rest' ? 3 : 2, 9); q = zwischen(rnd, 2, 10);
      if (variante === 'rest') r = zwischen(rnd, 1, d - 1);
      n = d * q + r;
      weg = variante === 'rest'
        ? [`Welches Vielfache von ${d} passt gerade noch in ${n}?`, `${d} · ${q} = ${d * q}, es bleiben ${r} übrig: ${n} : ${d} = ${q} R ${r}`]
        : [`Umkehraufgabe: ${d} · ? = ${n}`, `${n} : ${d} = ${q}`];
      if (r) f.setze(`${q}R0`, 'restVergessen');
    } else if (variante === 'stufe') {
      const nullen = gewichtet(rnd, [[1, 35], [2, 40], [3, 25]]);
      d = hoch(nullen); q = ausZiffern(ziffernMit(rnd, zwischen(rnd, 1, 3), 0.3)); n = q * d;
      weg = [`Durch ${F(d)} heißt: ${NULLEN_WORT[nullen]} streichen.`, `${F(n)} : ${F(d)} = ${F(q)}`];
      f.setze(`${q * 10}R0`, 'nullenStreichen'); if (q % 10 === 0) f.setze(`${q / 10}R0`, 'nullenStreichen');
    } else if (variante === 'nullen') {
      const a = zwischen(rnd, 2, 9), j = zwischen(rnd, 1, 2), i = zwischen(rnd, j, 3);
      let b = zwischen(rnd, 2, 9);
      if (b === a) b = a === 9 ? 8 : a + 1;   // sonst stünde das Ergebnis schon im 1. Schritt („36 : 6“ bei 3 600 : 600 = 6)
      n = a * b * hoch(i); d = a * hoch(j); q = b * hoch(i - j);
      weg = [`Gleich viele Nullen streichen: ${F(n)} : ${F(d)} = ${F(n / hoch(j))} : ${a}`, `${F(n / hoch(j))} : ${a} = ${F(q)}`];
      f.setze(`${q * 10}R0`, 'nullenStreichen'); if (q % 10 === 0) f.setze(`${q / 10}R0`, 'nullenStreichen');
    } else if (variante === 'eins') {
      q = n = zahlMit(rnd, zwischen(rnd, 2, 3)); d = 1;
      weg = ['Durch 1 dividieren: Die Zahl bleibt gleich.', `${F(n)} : 1 = ${F(n)}`];
      f.setze('1R0', 'pruefen');
    } else if (variante === 'null') {
      n = 0; d = zwischen(rnd, 2, 9); q = 0;
      weg = [`Nichts wird auf ${d} verteilt: Jeder bekommt nichts.`, `0 : ${d} = 0`];
      f.setze('nm', 'nullDurch'); f.setze(`${d}R0`, 'nullDurch');
    } else {
      n = zahlMit(rnd, 2); d = 0;
      f.setze('0R0', 'durchNull'); f.setze(`${n}R0`, 'durchNull');
      return aufgabe('div-kopf', { variante, text: 'Rechne im Kopf.', term: `${F(n)} : 0`, eingabe: 'rest', tasten: ['nm'], loesung: 'nm',
        weg: [`Kann man ${n} auf 0 Kinder verteilen?`, `Durch 0 kann man nicht dividieren: ${F(n)} : 0 → nicht möglich`], fehler: f.map });
    }
    delete f.map[`${q}R${r}`];
    return aufgabe('div-kopf', { variante, text: 'Rechne im Kopf.', term: `${F(n)} : ${F(d)}`, eingabe: 'rest', tasten: ['nm'], loesung: { q, r }, weg, fehler: f.map,
      rueck: { _: `Mach die Probe: Ergebnis · ${F(d)}${r ? ' + Rest' : ''} muss ${F(n)} geben.` } });
  }
};

const divSchriftlich1 = {
  id: 'div-schriftlich-1', thema: 'division', titel: 'Schriftlich dividieren (einstellig)', quelle: 'Üb. S. 30 Nr. 1 · Buch S. 94–96 · Heft (Kurzform)',
  rang: 2, wo: 'papier', auswahl: false, nah: [], voraus: [], gewicht: 2, sek: 90, sekNeu: 120, varianten: ['ohne-rest', 'mit-rest'],
  erzeuge(rnd) {
    // Dividend bis 5 Stellen, Divisor 2–9, oft eine Null im Quotienten; Rest mit R wie im Heft (Üb. ohne Rest, Heft mit)
    let n = 8124, d = 4, q = 2031, r = 0;
    for (let v = 0; v < 60; v++) {
      const dd = zwischen(rnd, 2, 9), qs = ziffernMit(rnd, zwischen(rnd, 3, 4), 0);
      if (rnd() < 0.5) qs[zwischen(rnd, 1, qs.length - 1)] = 0;
      const qq = ausZiffern(qs), rr = rnd() < 0.35 ? zwischen(rnd, 1, dd - 1) : 0, nn = qq * dd + rr;
      if (nn > 99999) continue;
      n = nn; d = dd; q = qq; r = rr;
      break;
    }
    const k = kurzform(n, d);
    const f = sammler([`${q}R${r}`]);
    divFehler(f, q, r, d);
    return aufgabe('div-schriftlich-1', {
      variante: r ? 'mit-rest' : 'ohne-rest', text: 'Rechne schriftlich in Kurzform, mit Probe. Einen Rest schreibst du mit R.',
      term: `${F(n)} : ${d}`, eingabe: 'rest', tasten: ['nm'], loesung: { q, r },
      weg: [`Erste Teilzahl: _${k.erste}_. Wie oft passt ${d} hinein?`, { mono: k.zeilen }, probeText(q, d, r)],
      fehler: f.map, rueck: { _: 'Mach die Probe: Quotient · Divisor (+ Rest). Kommt genau der Dividend heraus?' }
    });
  }
};

const divSchriftlich2 = {
  id: 'div-schriftlich-2', thema: 'division', titel: 'Schriftlich dividieren (zweistellig)', quelle: 'Buch S. 97 · Üb. S. 30 · Heft (Kurzform, Rest R)',
  rang: 3, wo: 'papier', auswahl: false, nah: [], voraus: ['div-schriftlich-1'], gewicht: 2, sek: 150, sekNeu: 180, varianten: ['ohne-rest', 'mit-rest'],
  erzeuge(rnd) {
    // Dividend 3–5 Stellen, Divisor 11–25 (Heft: 11, 12, 13, 17, 21, 25), auch mit Rest „R“; Ü: beide auf Zehner
    let n = 1196, d = 13, q = 92, r = 0;
    for (let v = 0; v < 60; v++) {
      const dd = zwischen(rnd, 11, 25), qs = ziffernMit(rnd, zwischen(rnd, 2, 3), 0);
      if (qs.length > 2 && rnd() < 0.3) qs[zwischen(rnd, 1, qs.length - 1)] = 0;
      const qq = ausZiffern(qs), rr = rnd() < 0.5 ? zwischen(rnd, 1, dd - 1) : 0, nn = qq * dd + rr;
      if (nn > 99999 || nn < 100) continue;
      // Der Text verlangt einen Überschlag: Er muss aufgehen und darf nicht schon das Ergebnis sein (weg[0])
      const N0 = rundeAuf(nn, 1), D0 = rundeAuf(dd, 1);
      if (N0 % D0 || N0 / D0 === qq) continue;
      n = nn; d = dd; q = qq; r = rr;
      break;
    }
    const k = kurzform(n, d);
    const N = rundeAuf(n, 1), D = rundeAuf(d, 1);
    const ue = N % D === 0 && N / D !== q ? `Ü: ${F(N)} : ${D} = ${F(N / D)} (beide Zahlen auf Zehner, Nullen streichen)` : null;
    const f = sammler([`${q}R${r}`]);
    divFehler(f, q, r, d);
    return aufgabe('div-schriftlich-2', {
      variante: r ? 'mit-rest' : 'ohne-rest', text: 'Rechne schriftlich in Kurzform, mit Überschlag und Probe. Einen Rest schreibst du mit R.',
      term: `${F(n)} : ${d}`, eingabe: 'rest', tasten: ['nm'], loesung: { q, r },
      weg: [ue || `Erste Teilzahl: _${k.erste}_. Wie oft passt ${d} hinein? Nebenrechnung mit Vielfachen von ${d}.`, { mono: k.zeilen }, probeText(q, d, r)],
      fehler: f.map, rueck: { _: 'Mach die Probe: Quotient · Divisor (+ Rest). Kommt genau der Dividend heraus?' }
    });
  }
};

// ================================================================
// Verbindung der 4 Rechenarten (Üb. S. 32–33, Buch S. 100–103, Heft): Klampunstri – Klammer, Punkt, Strich.
// Zahlen bis 100, Punktrechnung im Einmaleins, jedes Zwischenergebnis ganz und ≥ 0. Keine gemischten Ketten aus · und :
// (das Buch nennt „gleiche Stufe von links“ nicht). Jede Aufgabe muss eine Falle haben: von links gerechnet oder ohne
// Klammer käme etwas anderes heraus.
// ================================================================
const Zl = n => ({ n });
const Op = (o, l, r, k = false) => ({ o, l, r, k });
const istZahl = t => 'n' in t;
function baumWert(t) {   // null, wenn etwas nicht geht (negativ, nicht ganz)
  if (istZahl(t)) return t.n;
  const l = baumWert(t.l), r = baumWert(t.r);
  if (l == null || r == null) return null;
  if (t.o === '+') return l + r;
  if (t.o === '−') return l - r >= 0 ? l - r : null;
  if (t.o === '·') return l * r;
  return r !== 0 && l % r === 0 ? l / r : null;
}
function baumText(t) {   // Klammern nur, wo k gesetzt ist (die Bäume sind so gebaut, dass Punkt vor Strich sonst passt)
  if (istZahl(t)) return F(t.n);
  const s = `${baumText(t.l)} ${t.o} ${baumText(t.r)}`;
  return t.k ? `(${s})` : s;
}
// Regeln je Knoten: Zahlen bis 100, Zwischenergebnisse bis 100, Punkt im Einmaleins
function baumOk(t) {
  if (istZahl(t)) return t.n >= 1 && t.n <= 100;
  if (!baumOk(t.l) || !baumOk(t.r)) return false;
  const w = baumWert(t), l = baumWert(t.l), r = baumWert(t.r);
  if (w == null || w > 100) return false;
  if (t.o === '·' && (l > 10 || r > 10)) return false;
  if (t.o === ':' && (r > 10 || w > 10)) return false;
  return true;
}
// Rechnung als Zeichenfolge auswerten – auch so, wie man sich typisch verrechnet (für Fallen und Fehler):
// pvs = Punkt vor Strich, klammern = Klammern beachten. NaN, wenn etwas nicht aufgeht.
function rechne(tokens, { pvs = true, klammern = true } = {}) {
  const t = klammern ? tokens : tokens.filter(x => x !== '(' && x !== ')');
  let i = 0;
  const anw = (o, l, r) => (o === '+' ? l + r : o === '−' ? l - r : o === '·' ? l * r : r !== 0 && l % r === 0 ? l / r : NaN);
  const atom = () => { if (t[i] === '(') { i++; const v = summe(); i++; return v; } return Number(t[i++]); };
  const produkt = () => { let v = atom(); while (t[i] === '·' || t[i] === ':') { const o = t[i++]; v = anw(o, v, atom()); } return v; };
  const summe = () => {
    if (!pvs) { let v = atom(); while (i < t.length && t[i] !== ')') { const o = t[i++]; v = anw(o, v, atom()); } return v; }
    let v = produkt();
    while (t[i] === '+' || t[i] === '−') { const o = t[i++]; v = anw(o, v, produkt()); }
    return v;
  };
  const v = summe();
  return Number.isFinite(v) ? v : NaN;
}
const tokensVon = term => String(term).replace(/\s+/g, '').match(/\d+|[+−·:()]/g) || [];
const hatKlammer = t => !istZahl(t) && (t.k || hatKlammer(t.l) || hatKlammer(t.r));
// Stufen wie im Heft (jede Stufe eine neue Zeile): Klammern → Punkt → Strich
function stufenKette(t) {
  const kette = [baumText(t)];
  const ohneKlammer = x => (istZahl(x) ? x : x.k ? Zl(baumWert(x)) : Op(x.o, ohneKlammer(x.l), ohneKlammer(x.r)));
  const ohnePunkt = x => (istZahl(x) ? x : (x.o === '·' || x.o === ':') && istZahl(x.l) && istZahl(x.r) ? Zl(baumWert(x)) : Op(x.o, ohnePunkt(x.l), ohnePunkt(x.r), x.k));
  let b = t;
  if (hatKlammer(b)) { b = ohneKlammer(b); kette.push(baumText(b)); }
  const p = ohnePunkt(b);
  if (baumText(p) !== baumText(b)) { b = p; kette.push(baumText(b)); }
  const w = F(baumWert(t));
  if (kette[kette.length - 1] !== w) kette.push(w);
  return kette;
}
function ersteStufe(t) {   // Was zuerst gerechnet wird, ohne Ergebnis: „die Klammer 12 + 6 und 5 − 2“ / „6 · 7“
  const kl = [], pu = [];
  const such = (x, inKl) => {
    if (istZahl(x)) return;
    if (x.k && !inKl) kl.push(baumText({ ...x, k: false }));
    if ((x.o === '·' || x.o === ':') && !inKl && !x.k) pu.push(x);
    such(x.l, inKl || x.k); such(x.r, inKl || x.k);
  };
  such(t, false);
  if (kl.length) return `zuerst ${kl.length === 1 ? 'die Klammer' : 'die Klammern'}: ${kl.join(' und ')}`;
  return `Punkt vor Strich, zuerst ${pu.map(x => baumText({ ...x, k: false })).join(' und ')}`;
}
const pkt = rnd => (rnd() < 0.55
  ? Op('·', Zl(zwischen(rnd, 2, 10)), Zl(zwischen(rnd, 2, 9)))
  : (() => { const d = zwischen(rnd, 2, 9), q = zwischen(rnd, 2, 10); return Op(':', Zl(d * q), Zl(d)); })());
// Klammer mit dem Wert w: Summe (beide Zahlen ab 2) oder Differenz – nie so etwas wie (1 + 1)
const klammerMit = (rnd, w) => {
  if (rnd() < 0.6 && w >= 4) { const a = zwischen(rnd, 2, w - 2); return Op('+', Zl(a), Zl(w - a), true); }
  const b = zwischen(rnd, 2, Math.max(2, Math.min(30, 100 - w))); return Op('−', Zl(w + b), Zl(b), true);
};
const wertVon = t => baumWert(t) || 0;
const VB_MUSTER = [   // Üb. S. 32 Nr. 1a–l, Buch S. 100–101, Heft
  rnd => { const p = pkt(rnd); return Op('+', Op('−', Zl(zwischen(rnd, wertVon(p), 100)), p), Zl(zwischen(rnd, 1, 40))); },   // 48 − 6 · 7 + 3
  rnd => Op('+', Zl(zwischen(rnd, 2, 60)), pkt(rnd)),
  rnd => { const p = pkt(rnd); return Op('−', Zl(zwischen(rnd, wertVon(p), 100)), p); },
  rnd => Op('+', pkt(rnd), pkt(rnd)),
  rnd => { const p = pkt(rnd), q = pkt(rnd); return wertVon(p) >= wertVon(q) ? Op('−', p, q) : Op('−', q, p); },
  rnd => { const p = pkt(rnd); return Op('−', Op('+', Zl(zwischen(rnd, 2, 50)), p), Zl(zwischen(rnd, 1, 30))); },
  rnd => { const p = pkt(rnd), q = pkt(rnd); return Op('+', Op('−', Zl(zwischen(rnd, wertVon(p), 100)), p), q); },
  rnd => Op('·', Zl(zwischen(rnd, 2, 9)), klammerMit(rnd, zwischen(rnd, 2, 10))),
  rnd => Op('·', klammerMit(rnd, zwischen(rnd, 2, 10)), Zl(zwischen(rnd, 2, 9))),
  rnd => { const d = zwischen(rnd, 2, 9); return Op(':', klammerMit(rnd, d * zwischen(rnd, 2, 10)), Zl(d)); },
  rnd => { const d = zwischen(rnd, 2, 9); return Op(':', klammerMit(rnd, d * zwischen(rnd, 2, 10)), klammerMit(rnd, d)); },   // (12 + 6) : (5 − 2)
  rnd => Op('·', klammerMit(rnd, zwischen(rnd, 2, 10)), klammerMit(rnd, zwischen(rnd, 2, 10))),
  rnd => { const k = klammerMit(rnd, zwischen(rnd, 10, 60)); return Op('−', Zl(zwischen(rnd, wertVon(k), 100)), k); },
  rnd => Op('+', Zl(zwischen(rnd, 2, 40)), Op('·', Zl(zwischen(rnd, 2, 9)), klammerMit(rnd, zwischen(rnd, 2, 10)))),
  rnd => { const k = Op('·', Zl(zwischen(rnd, 2, 9)), klammerMit(rnd, zwischen(rnd, 2, 10))); return Op('−', Zl(zwischen(rnd, wertVon(k), 100)), k); },
  rnd => { const d = zwischen(rnd, 2, 9), p = pkt(rnd); return Op(':', Op('−', Zl(d * zwischen(rnd, 2, 10) + wertVon(p)), p, true), Zl(d)); },
  rnd => { const k = Op('·', Zl(zwischen(rnd, 2, 9)), klammerMit(rnd, zwischen(rnd, 2, 10))); return Op('−', k, Zl(zwischen(rnd, 1, Math.max(1, wertVon(k))))); }
];
// Fallen einer Rechnung: Wert von links gerechnet und Wert ohne Klammern (null, wenn gleich wie richtig)
function fallen(term, richtig) {
  const tk = tokensVon(term);
  const links = rechne(tk, { pvs: false }), ohneKl = tk.includes('(') ? rechne(tk, { klammern: false }) : NaN;
  return { links: links !== richtig ? links : null, ohneKl: ohneKl !== richtig ? ohneKl : null };
}
const vbRegeln = {
  id: 'vb-regeln', thema: 'verbindung', titel: 'Klampunstri', quelle: 'Üb. S. 32 Nr. 1 · Buch S. 100–101 · Heft',
  rang: 1, wo: 'app', auswahl: false, nah: ['mul-kopf-klammer'], voraus: [], gewicht: 2, sek: 20, sekNeu: 35, varianten: [],
  erzeuge(rnd, opt = {}) {
    for (let v = 0; v < 300; v++) {
      const muster = opt.zweck === 'beispiel' && v < 100 ? 0 : zwischen(rnd, 0, VB_MUSTER.length - 1);
      const t = VB_MUSTER[muster](rnd);
      if (!baumOk(t)) continue;
      const w = baumWert(t), term = baumText(t);
      const fa = fallen(term, w);
      if (hatKlammer(t) ? fa.ohneKl == null : fa.links == null) continue;   // die Aufgabe muss etwas prüfen
      const erst = `Klampunstri: ${ersteStufe(t)}.`;
      if (tokensVon(erst).includes(String(w))) continue;   // der 1. Schritt verrät das Ergebnis nicht
      const f = sammler([String(w)]);
      if (fa.ohneKl != null && zahlOk(fa.ohneKl)) f.setze(String(fa.ohneKl), 'klammer');
      if (fa.links != null && zahlOk(fa.links)) f.setze(String(fa.links), 'punktVorStrich');
      const k = stufenKette(t);
      return aufgabe('vb-regeln', {
        variante: `muster-${muster + 1}`, text: 'Rechne.', term, loesung: w,
        weg: [erst, `${k[0]} = ${k[1]}`, ...(k.length > 2 ? [`= ${k.slice(2).join(' = ')}`] : [])], fehler: f.map
      });
    }
    return aufgabe('vb-regeln', { text: 'Rechne.', term: '48 − 6 · 7 + 3', loesung: 9, weg: ['Klampunstri: Punkt vor Strich, zuerst 6 · 7.', '48 − 6 · 7 + 3 = 48 − 42 + 3', '= 9'], fehler: { 297: 'punktVorStrich' } });
  }
};

// Rechnung aus Worten (Üb. S. 33 Nr. 2, 3, 5–7): Summe, Differenz, Produkt, Quotient; „subtrahiere … von …“
const VB_SAETZE = [
  { s: 'Bilde die Summe von {a} und {b}!', b: (a, b) => Op('+', a, b), z: rnd => [zwischen(rnd, 12, 60), zwischen(rnd, 12, 39)], h: 'Summe heißt plus.' },
  { s: 'Bilde die Differenz von {a} und {b}!', b: (a, b) => Op('−', a, b), z: rnd => { const a = zwischen(rnd, 30, 100); return [a, zwischen(rnd, 5, a - 5)]; }, h: 'Differenz heißt minus, die erste Zahl steht vorne.' },
  { s: 'Bilde das Produkt von {a} und {b}!', b: (a, b) => Op('·', a, b), z: rnd => [zwischen(rnd, 2, 10), zwischen(rnd, 2, 9)], h: 'Produkt heißt mal.' },
  { s: 'Bilde den Quotienten von {a} und {b}!', b: (a, b) => Op(':', a, b), z: rnd => { const d = zwischen(rnd, 2, 9); return [d * zwischen(rnd, 2, 10), d]; }, h: 'Quotient heißt durch, die erste Zahl steht vorne.' },
  { s: 'Subtrahiere {b} von {a}!', b: (a, b) => Op('−', a, b), z: rnd => { const a = zwischen(rnd, 30, 100); return [a, zwischen(rnd, 5, a - 5)]; }, h: '„von {a}“: {a} steht vorne.', von: true },
  { s: 'Dividiere die Summe von {a} und {b} durch {c}!', b: (a, b, c) => Op(':', Op('+', a, b, true), c), z: rnd => { const c = zwischen(rnd, 2, 9), w = c * zwischen(rnd, 2, 10), a = zwischen(rnd, 1, w - 1); return [a, w - a, c]; }, h: 'Die Summe kommt zuerst, also in Klammer.' },
  { s: 'Dividiere die Differenz von {a} und {b} durch {c}!', b: (a, b, c) => Op(':', Op('−', a, b, true), c), z: rnd => { const c = zwischen(rnd, 2, 9), w = c * zwischen(rnd, 2, 10), b = zwischen(rnd, 1, Math.max(1, 100 - w)); return [w + b, b, c]; }, h: 'Die Differenz kommt zuerst, also in Klammer.' },
  { s: 'Multipliziere die Summe von {a} und {b} mit {c}!', b: (a, b, c) => Op('·', Op('+', a, b, true), c), z: rnd => { const w = zwischen(rnd, 2, 10), a = zwischen(rnd, 1, w - 1); return [a, w - a, zwischen(rnd, 2, 9)]; }, h: 'Die Summe kommt zuerst, also in Klammer.' },
  { s: 'Multipliziere die Differenz von {a} und {b} mit {c}!', b: (a, b, c) => Op('·', Op('−', a, b, true), c), z: rnd => { const w = zwischen(rnd, 2, 10), b = zwischen(rnd, 1, 30); return [w + b, b, zwischen(rnd, 2, 9)]; }, h: 'Die Differenz kommt zuerst, also in Klammer.' },
  { s: 'Addiere zum Produkt von {a} und {b} die Zahl {c}!', b: (a, b, c) => Op('+', Op('·', a, b), c), z: rnd => [zwischen(rnd, 2, 10), zwischen(rnd, 2, 9), zwischen(rnd, 2, 30)], h: 'Das Produkt zuerst – Punkt vor Strich, keine Klammer nötig.' },
  { s: 'Subtrahiere das Produkt von {a} und {b} von {c}!', b: (a, b, c) => Op('−', c, Op('·', a, b)), z: rnd => { const a = zwischen(rnd, 2, 9), b = zwischen(rnd, 2, 9); return [a, b, zwischen(rnd, a * b, 100)]; }, h: '„von {c}“: {c} steht vorne.', von: true },
  { s: 'Subtrahiere {c} vom Produkt von {a} und {b}!', b: (a, b, c) => Op('−', Op('·', a, b), c), z: rnd => { const a = zwischen(rnd, 2, 10), b = zwischen(rnd, 2, 9); return [a, b, zwischen(rnd, 1, a * b - 1)]; }, h: '„vom Produkt“: Das Produkt steht vorne.', von: true },
  { s: 'Subtrahiere den Quotienten von {a} und {b} von {c}!', b: (a, b, c) => Op('−', c, Op(':', a, b)), z: rnd => { const b = zwischen(rnd, 2, 9), q = zwischen(rnd, 2, 10); return [b * q, b, zwischen(rnd, q, 100)]; }, h: '„von {c}“: {c} steht vorne.', von: true },
  { s: 'Subtrahiere die Summe von {a} und {b} von {c}!', b: (a, b, c) => Op('−', c, Op('+', a, b, true)), z: rnd => { const a = zwischen(rnd, 5, 40), b = zwischen(rnd, 5, 40); return [a, b, zwischen(rnd, a + b, 100)]; }, h: '„von {c}“: {c} steht vorne, die Summe in Klammer.', von: true },
  { s: 'Multipliziere {c} mit der Summe von {a} und {b}!', b: (a, b, c) => Op('·', c, Op('+', a, b, true)), z: rnd => { const w = zwischen(rnd, 2, 10), a = zwischen(rnd, 1, w - 1); return [a, w - a, zwischen(rnd, 2, 9)]; }, h: 'Die Summe kommt zuerst, also in Klammer.' },
  { s: 'Addiere das Produkt von {a} und {b} und das Produkt von {c} und {d}!', b: (a, b, c, d) => Op('+', Op('·', a, b), Op('·', c, d)), z: rnd => [zwischen(rnd, 2, 9), zwischen(rnd, 2, 9), zwischen(rnd, 2, 9), zwischen(rnd, 2, 9)], h: 'Zwei Produkte, dann plus – Punkt vor Strich.' },
  { s: 'Multipliziere die Summe von {a} und {b} mit der Differenz von {c} und {d}!', b: (a, b, c, d) => Op('·', Op('+', a, b, true), Op('−', c, d, true)), z: rnd => { const w = zwischen(rnd, 2, 10), a = zwischen(rnd, 1, w - 1), x = zwischen(rnd, 2, 10), d = zwischen(rnd, 1, 30); return [a, w - a, x + d, d]; }, h: 'Summe und Differenz zuerst, beide in Klammer.' }
];
// Wert wie pruefe() ihn rechnet: negative Zwischenergebnisse gehen, eine Division muss aufgehen (sonst null)
function baumWertRoh(t) {
  if (istZahl(t)) return t.n;
  const l = baumWertRoh(t.l), r = baumWertRoh(t.r);
  if (l == null || r == null) return null;
  if (t.o === '+') return l + r;
  if (t.o === '−') return l - r;
  if (t.o === '·') return l * r;
  return r !== 0 && l % r === 0 ? l / r : null;
}
// Gibt ein anderes Rechenzeichen an irgendeiner Stelle denselben Wert? Dann gälte ein falsches Zeichen als richtig
// (gleiche Zahlen, gleicher Wert). Der Baum wird kurz verändert und wieder hergestellt.
function zeichenTauschGleich(t, w) {
  const knoten = [];
  const sammle = x => { if (!istZahl(x)) { knoten.push(x); sammle(x.l); sammle(x.r); } };
  sammle(t);
  for (const k of knoten) {
    const alt = k.o;
    for (const neu of ['+', '−', '·', ':']) {
      if (neu === alt) continue;
      k.o = neu;
      const v = baumWertRoh(t);
      k.o = alt;
      if (v === w) return true;
    }
  }
  return false;
}
const vbTerm = {
  id: 'vb-term', thema: 'verbindung', titel: 'Rechnung aus Worten', quelle: 'Üb. S. 33 Nr. 2, 3, 5–7 · Buch S. 101–103 · Heft',
  rang: 2, wo: 'app', auswahl: false, nah: ['ta-rechnung'], voraus: ['vb-regeln'], gewicht: 2, sek: 40, sekNeu: 60, varianten: [],
  erzeuge(rnd) {
    for (let v = 0; v < 200; v++) {
      const nr = rnd() < 0.3 ? zwischen(rnd, 0, 4) : zwischen(rnd, 5, VB_SAETZE.length - 1);
      const vs = VB_SAETZE[nr];
      const z = vs.z(rnd);
      const t = vs.b(...z.map(Zl));
      if (!baumOk(t)) continue;
      const w = baumWert(t), term = baumText(t);
      const zahlen = tokensVon(term).filter(x => /^\d+$/.test(x)).map(Number);
      if (new Set(zahlen).size !== zahlen.length) continue;   // jede Zahl nur einmal: sonst ist „genau diese Zahlen“ unklar
      // Falsch aufgebaute Rechnungen mit denselben Zahlen dürfen nicht zufällig dasselbe ergeben (sonst prüft es nichts)
      const tk = tokensVon(term);
      const ohneKl = tk.includes('(') ? rechne(tk, { klammern: false }) : null;
      const top = t.o === '−' || t.o === ':' ? Op(t.o, t.r, t.l, t.k) : null;
      const umgedreht = top ? rechne(tokensVon(baumText(top))) : null;
      if (ohneKl === w || umgedreht === w) continue;
      if (zeichenTauschGleich(t, w)) continue;   // (4, 2): 4 : 2 = 4 − 2 · (2, 2): 2 · 2 = 2 + 2 – ein falsches Zeichen zählte sonst
      const satz = vs.s.replace(/\{([a-d])\}/g, (_, k) => F(z['abcd'.indexOf(k)]));
      const hinweis = vs.h.replace(/\{([a-d])\}/g, (_, k) => F(z['abcd'.indexOf(k)]));
      const f = sammler([`0:${w}`, `1:${w}`]);
      if (ohneKl != null && zahlOk(ohneKl)) { f.setze(`0:${ohneKl}`, 'klammer'); f.setze(`1:${ohneKl}`, 'klammer'); }
      if (umgedreht != null) { const art = vs.von ? 'vonVerdreht' : 'umgedreht'; if (Number.isFinite(umgedreht)) { f.setze(`0:${umgedreht}`, art); if (zahlOk(umgedreht)) f.setze(`1:${umgedreht}`, art); } }
      f.setze('0:?nichtGanz', tk.includes('(') ? 'klammer' : 'umgedreht');
      const k = stufenKette(t);
      return aufgabe('vb-term', {
        variante: `satz-${nr + 1}`, text: satz, term: '', eingabe: 'felder',
        felder: [{ art: 'term', label: 'Rechnung' }, { art: 'zahl', label: 'Ergebnis' }],
        loesung: [{ wert: w, zahlen, terme: [term] }, w],
        weg: [hinweis, `Rechnung: ${term}`, k.join(' = ')], fehler: f.map
      });
    }
    return aufgabe('vb-term', { text: 'Dividiere die Summe von 36 und 12 durch 8!', eingabe: 'felder', felder: [{ art: 'term', label: 'Rechnung' }, { art: 'zahl', label: 'Ergebnis' }],
      loesung: [{ wert: 6, zahlen: [36, 12, 8], terme: ['(36 + 12) : 8'] }, 6], weg: ['Die Summe kommt zuerst, also in Klammer.', 'Rechnung: (36 + 12) : 8', '(36 + 12) : 8 = 48 : 8 = 6'], fehler: { '0:?nichtGanz': 'klammer' } });
  }
};

// ================================================================
// Alle Typen. Reihenfolge = Reihenfolge auf dem Zettel. Neue Typen hinten anfügen; ids nie ändern (tools/ids.txt).
// Kern (zählt für BEREIT) und Extra legt schularbeit.js fest.
// ================================================================
const typen = [
  zsAblesen, zsMarkieren,
  voZeichen, voVzn, voOrdnen, voGerade,
  swZahlwort, swTafel, swAlsZahl, swZiffer, swNull,
  rsRunden, rsUeberschlag,
  addKette, addSchriftlich,
  subKette, subSchriftlich, subBegriffe,
  taRechnungTyp, taGanzTyp,
  mulKopfStufe, mulKopfNullen, mulKopfDrei, mulKopfKlammer, mulSchriftlich,
  divKopf, divSchriftlich1, divSchriftlich2,
  vbRegeln, vbTerm
];

const MATHE = {
  version: 2, bereiche, themen, typen, fehlerTexte: FEHLERARTEN,
  textaufgaben: { rechnung: TA_RECHNUNG, ganz: TA_GANZ, fehler: VORLAGEN_FEHLER },
  zufall, format, zahlAus, restAus, termNorm, termAus, kuerzelAus, kuerzelText, KUERZEL, schluessel, anzeigen, pruefe
};
if (typeof window !== 'undefined') window.MATHE = MATHE;
if (typeof globalThis !== 'undefined') globalThis.MATHE = MATHE;
})();
