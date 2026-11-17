#!/usr/bin/env node
/* Mathe Legends – Prüfskript für die Aufgabentypen (aufgaben.js), Teil T2 im Technik-Plan
   Aufruf im Ordner apps/mathe-legends:   node tools/aufgaben-pruefen.mjs [anzahl] [typ …]
     anzahl  Aufgaben je Typ für den Zweck „runde“ (Standard 10 000); dazu je 500 für jeden anderen Zweck
     typ     nur diese Typen prüfen (Standard: alle außer dummy-…)

   Jede Aufgabe wird erzeugt und mit EIGENEN Mitteln nachgerechnet, nie mit dem Generator selbst: eigener Termrechner,
   Zahlwort-Leser, Kürzel-Leser, Rundungsregel und Überschlagsregel aus dem Heft. Geprüft wird:
    1. Lösung stimmt (Orakel je Typ, aus dem, was das Kind sieht)
    2. Bereich stimmt (Zahlenräume aus Lernauftrag 2a, 2c, 2d)
    3. pruefe(): die richtige Antwort, so wie das Ziffernfeld sie schickt, ist ok (auch mit Dreiergruppen); jeder
       fehler-Schlüssel ist falsch und liefert seine Fehlerart und einen Rückmeldetext
    4. fehler ist nie gleich der Lösung (oder einer alt-Lösung)
    5. Lösungsweg: 2–3 Zeilen, weg[0] ist Text und verrät das Ergebnis nicht
    6. Schreibweise: Dreiergruppen ab 4 Stellen, · : −, ≈ nur beim Runden, „Ü:“ ohne ≈
    7. reines JSON, gleicher Seed = gleiche Aufgabe, kein Math.random, jeder Zweck läuft
    8. nie zweimal dieselbe Aufgabe hintereinander (mit dem Nachwürfeln der App: bis zu 6 Versuche)
    9. Hinweis-Test, soweit er automatisch geht (vor allem ta-rechnung: Eingabe, Tasten, Zahlenmuster, Wörter)
   10. Register tools/ids.txt; kein Name des Kindes in meinen Dateien (Name aus KIND_NAME, nie im Repo)
   FEHLER → Exit-Code 1. WARN = bitte anschauen, blockiert nicht.
*/
import fs from 'node:fs';
import vm from 'node:vm';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ORDNER = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const QUELLE = fs.readFileSync(path.join(ORDNER, 'aufgaben.js'), 'utf8');
const IDS = fs.readFileSync(path.join(ORDNER, 'tools', 'ids.txt'), 'utf8');
const args = process.argv.slice(2);
const N = Number(args.find(a => /^\d+$/.test(a))) || 10000;
const NUR = args.filter(a => !/^\d+$/.test(a));
const ANDERE = Math.min(500, N);
const ZWECKE = ['einstufung', 'beispiel', 'lernschritt', 'zwilling', 'papier', 'ueben'];

// aufgaben.js laden wie im Browser (eigener Kontext, nur window) – Math.random wirft danach
const ctx = { window: {}, console: { warn: () => {}, log: () => {} } };
vm.createContext(ctx);
vm.runInContext(QUELLE, ctx, { filename: 'aufgaben.js' });
const M = ctx.window.MATHE;
vm.runInContext('Math.random = () => { throw new Error("Math.random im Generator"); };', ctx);

// ---------------------------------------------------------------- Meldungen
const MELD = new Map();   // `${art}|${typ}|${pruefung}` → { art, typ, pruefung, n, beispiel }
function melde(art, typ, pruefung, beispiel) {
  const k = `${art}|${typ}|${pruefung}`;
  const e = MELD.get(k) || { art, typ, pruefung, n: 0, beispiel };
  e.n++;
  MELD.set(k, e);
}
const fehler = (typ, p, b) => melde('FEHLER', typ, p, b);
const warn = (typ, p, b) => melde('WARN', typ, p, b);
const kurz = a => `${a.text ? a.text.slice(0, 90) : ''}${a.term ? ` [${a.term}]` : ''}`.replace(/\u00a0/g, ' ');

// ---------------------------------------------------------------- eigene Werkzeuge (unabhängig von aufgaben.js)
const NB = /[\s\u00a0\u202f]/g;
const z = s => Number(String(s).replace(NB, ''));
const ZAHL_RE = /\d{1,3}(?:[\u00a0\u202f]\d{3})+|\d+/g;   // Zahlen im Text, auch mit Dreiergruppen (festes Leerzeichen)
const zahlenIn = s => (String(s).match(ZAHL_RE) || []).map(z);
const gleicheMenge = (a, b) => a.length === b.length && a.slice().sort((x, y) => x - y).every((v, i) => v === b.slice().sort((x, y) => x - y)[i]);
const PR = { '+': 1, '−': 1, '·': 2, ':': 2 };
// Termrechner (Shunting-Yard): → { wert, zwischen, punkt: [[op, a, b, wert]] } oder null
function rechnen(term) {
  const s = String(term).replace(NB, '');
  const t = s.match(/\d+|[+−·:()]/g);
  if (!t || t.join('') !== s) return null;
  const out = [], ops = [], zwischen = [], punkt = [];
  const anw = () => {
    const o = ops.pop(), b = out.pop(), a = out.pop();
    if (a === undefined || b === undefined) throw new Error('Term kaputt: ' + term);
    const w = o === '+' ? a + b : o === '−' ? a - b : o === '·' ? a * b : a / b;
    zwischen.push(w);
    if (o === '·' || o === ':') punkt.push([o, a, b, w]);
    out.push(w);
  };
  for (const x of t) {
    if (/^\d/.test(x)) out.push(Number(x));
    else if (x === '(') ops.push(x);
    else if (x === ')') { while (ops.length && ops[ops.length - 1] !== '(') anw(); if (!ops.length) return null; ops.pop(); }
    else { while (ops.length && ops[ops.length - 1] !== '(' && PR[ops[ops.length - 1]] >= PR[x]) anw(); ops.push(x); }
  }
  while (ops.length) { if (ops[ops.length - 1] === '(') return null; anw(); }
  return out.length === 1 ? { wert: out[0], zwischen, punkt } : null;
}
// so, wie ein Kind ohne „Punkt vor Strich“ rechnet: von links, Klammern beachtet
function vonLinks(term) {
  const t = String(term).replace(NB, '').match(/\d+|[+−·:()]/g);
  let i = 0;
  const atom = () => { if (t[i] === '(') { i++; const v = gruppe(); i++; return v; } return Number(t[i++]); };
  const gruppe = () => {
    let v = atom();
    while (i < t.length && t[i] !== ')') { const o = t[i++], b = atom(); v = o === '+' ? v + b : o === '−' ? v - b : o === '·' ? v * b : v / b; }
    return v;
  };
  return gruppe();
}
const ohneKlammern = term => { const r = rechnen(String(term).replace(/[()]/g, '')); return r ? r.wert : NaN; };
// Zahlwort lesen
const EINS = { ein: 1, eins: 1, eine: 1, zwei: 2, drei: 3, vier: 4, fünf: 5, sechs: 6, sieben: 7, acht: 8, neun: 9 };
const TEEN = { zehn: 10, elf: 11, zwölf: 12, dreizehn: 13, vierzehn: 14, fünfzehn: 15, sechzehn: 16, siebzehn: 17, achtzehn: 18, neunzehn: 19 };
const ZIG = { zwanzig: 20, dreißig: 30, vierzig: 40, fünfzig: 50, sechzig: 60, siebzig: 70, achtzig: 80, neunzig: 90 };
function bis99(s) {
  if (!s) return 0;
  if (s in TEEN) return TEEN[s];
  if (s in ZIG) return ZIG[s];
  if (s in EINS && s !== 'eine') return EINS[s];
  const u = s.match(/^(.+?)und(.+)$/);
  if (u && u[1] in EINS && u[2] in ZIG) return EINS[u[1]] + ZIG[u[2]];
  throw new Error('Zahlwort unlesbar: ' + s);
}
function bis999(s) { const h = s.match(/^(.*?)hundert(.*)$/); return h ? (h[1] ? bis99(h[1]) : 1) * 100 + bis99(h[2]) : bis99(s); }
function wortLesen(w) {
  let s = String(w).toLowerCase().replace(/\s+/g, ' ').trim(), mio = 0, tsd = 0;
  const m = s.match(/^(.+?) million(?:en)? ?(.*)$/);
  if (m) { mio = m[1] === 'eine' ? 1 : bis999(m[1]); s = m[2]; }
  const t = s.match(/^(.*?)tausend(.*)$/);
  if (t) { tsd = t[1] ? bis999(t[1]) : 1; s = t[2]; }
  return mio * 1e6 + tsd * 1000 + bis999(s);
}
// Kürzel
const KW = { Md: 1e9, HM: 1e8, ZM: 1e7, M: 1e6, HT: 1e5, ZT: 1e4, T: 1e3, H: 100, Z: 10, E: 1 };
const KS = ['E', 'Z', 'H', 'T', 'ZT', 'HT', 'M', 'ZM', 'HM', 'Md'];
function kuerzelWert(s) {
  let w = 0, rest = String(s);
  for (const m of String(s).matchAll(/(\d+)(Md|HM|ZM|HT|ZT|M|T|H|Z|E)/g)) { w += Number(m[1]) * KW[m[2]]; rest = rest.replace(m[0], ''); }
  return rest.trim() ? null : w;
}
const kuerzelMenge = s => String(s).trim().split(/\s+/).sort().join(' ');
const kuerzelVon = n => { const s = String(n); return s.split('').map((d, i) => (d === '0' ? null : d + KS[s.length - 1 - i])).filter(Boolean).join(' '); };
const rundeAuf = (n, p) => Math.round(n / 10 ** p) * 10 ** p;   // n > 0: .5 rundet auf
const heftUe = n => (n < 100 ? rundeAuf(n, 1) : rundeAuf(n, 2));   // Heft: + und − auf H, unter 100 auf Z
const STELLE_NR = { Zehner: 1, Hunderter: 2, Tausender: 3, Zehntausender: 4, Hunderttausender: 5 };
const ganz = w => Number.isSafeInteger(w) && w >= 0;
const istOp = (s, i) => '+−·:'.includes(s[i]);

// ---------------------------------------------------------------- Orakel je Typ: { soll, bereich: [Verstöße] }
// soll in der Form von loesung; bei felder je Feld (Zahl oder { wert, zahlen } für Terme)
function ketteOrakel(a, op) {
  const teile = String(a.term).split(' → ');
  const start = z(teile[0]), schritte = teile.slice(1).map(x => z(x.slice(2)));
  const soll = [];
  schritte.reduce((x, s) => { const y = op === '+' ? x + s : x - s; soll.push(y); return y; }, start);
  const b = [];
  if (schritte.length !== 3) b.push('nicht 3 Schritte');
  if (schritte.some(s => s < 10 || s > 99)) b.push('Schritt nicht zweistellig');
  if (soll.some(v => v < 10 || v > 999)) b.push('Zwischenergebnis außerhalb 10–999');
  if (start > 999) b.push('Start zu groß');
  let ueber = 0, x = start;
  for (const s of schritte) { if (op === '+' ? (x % 10) + (s % 10) >= 10 : (x % 10) < (s % 10)) ueber++; x = op === '+' ? x + s : x - s; }
  if (ueber === 0) b.push('WARN:kein Zehnerübergang');
  return { soll, bereich: b };
}
function divOrakel(a) {
  const [n, d] = String(a.term).split(' : ').map(z);
  if (d === 0) return { soll: 'nm', bereich: [], n, d };
  return { soll: { q: Math.floor(n / d), r: n % d }, bereich: [], n, d };
}
const ORAKEL = {
  'zs-ablesen'(a) {
    const b = a.bild, e = [];
    if (!b || b.art !== 'strahl') return { soll: null, bereich: ['kein Bild'] };
    for (const k of b.kreuze) {
      const pos = (k.wert - b.start) / b.schritt;
      if (!Number.isInteger(pos * 2)) e.push('Kreuz weder auf Strich noch in der Mitte');
      if (pos <= 0 || pos > b.striche) e.push('Kreuz außerhalb');
      if (Number.isInteger(pos) && b.beschriftet.includes(pos)) e.push('Kreuz auf beschriftetem Strich');
    }
    if (b.beschriftet.length < 2 || !b.beschriftet.includes(0)) e.push('Schritt nicht ablesbar');
    if (b.start + b.striche * b.schritt > 1000) e.push('über 1 000');
    if (![1, 2, 5, 10, 20, 50, 100].includes(b.schritt)) e.push('Schritt nicht aus 2a');
    if (b.kreuze.length < 3 || b.kreuze.length > 5) e.push('nicht 3–5 Kreuze');
    if (b.kreuze.map(k => k.name).join('') !== 'ABCDE'.slice(0, b.kreuze.length)) e.push('Kreuze nicht A, B, C …');
    if (b.kreuze.some((k, i) => i && k.wert <= b.kreuze[i - 1].wert)) e.push('Kreuze nicht von links nach rechts');
    if (b.kreuze.some((k, i) => i && k.wert - b.kreuze[i - 1].wert < b.schritt)) e.push('Kreuze weniger als einen Schritt auseinander (überlappen)');
    return { soll: b.kreuze.map(k => k.wert), bereich: e };
  },
  'zs-markieren'(a) {
    const b = a.bild, e = [];
    for (const v of a.ziel) { const pos = (v - b.start) / b.schritt; if (!Number.isInteger(pos) || pos <= 0 || pos > b.striche) e.push('Ziel nicht auf einem Strich'); if (b.beschriftet.includes(pos)) e.push('Ziel auf beschriftetem Strich'); }
    if (b.start + b.striche * b.schritt > 1000) e.push('über 1 000');
    return { soll: a.ziel.slice().sort((x, y) => x - y), bereich: e };
  },
  'vo-zeichen'(a) {
    const [x, y] = String(a.term).split(' ○ ').map(z);
    const sx = String(x), sy = String(y), e = [];
    if (sx.length !== sy.length) e.push('nicht gleich lang');
    if (sx.split('').sort().join() !== sy.split('').sort().join()) e.push('nicht dieselben Ziffern');
    if (sx.length < 3 || sx.length > 7) e.push('Länge außerhalb 3–7');
    return { soll: x < y ? '<' : x > y ? '>' : '=', bereich: e };
  },
  'vo-ordnen'(a) {
    const e = [], s = a.zahlen.slice().sort((x, y) => x - y);
    if (a.zahlen.length !== 6) e.push('nicht 6 Zahlen');
    const ziffern = new Set(a.zahlen.flatMap(x => String(x).split('')));
    if (ziffern.size > 4) e.push('mehr als 4 verschiedene Ziffern');
    if (a.zahlen.some(x => new Set(String(x)).size !== String(x).length)) e.push('Ziffer doppelt in einer Zahl');
    if (new Set(a.zahlen.map(x => String(x).length)).size < 2) e.push('alle gleich lang');
    if (new Set(a.zahlen).size !== a.zahlen.length) e.push('Zahl doppelt');
    const lex = a.zahlen.slice().sort((x, y) => (String(x) < String(y) ? -1 : 1));
    if (lex.join() === s.join()) e.push('WARN:keine Falle (Ziffern-Ordnung = Größen-Ordnung)');
    return { soll: a.richtung === 'ab' ? s.reverse() : s, bereich: e };
  },
  'vo-vzn'(a) {
    const [name, wert] = String(a.term).split(': ');
    const g = z(wert), off = { Vorgänger: -1, Zahl: 0, Nachfolger: 1 };
    const x = g - off[name];
    const e = x + 1 > 10000 ? ['über 10 000 (Lernauftrag 2a)'] : [];
    // Der Lösungsweg nennt die Regel für den Schritt, der über eine Null (nach unten) oder Neun (nach oben) geht
    const runter = a.felder.some(f => off[f.label] < off[name] && (x + off[f.label]) % 10 === 9);
    const rauf = a.felder.some(f => off[f.label] > off[name] && (x + off[f.label]) % 10 === 0);
    if (runter && !/^Eins weniger/.test(a.weg[1])) e.push('Lösungsweg nennt nicht die Regel „Eins weniger“');
    if (rauf && !/^Eins mehr/.test(a.weg[1])) e.push('Lösungsweg nennt nicht die Regel „Eins mehr“');
    if (!runter && !rauf && /^Eins (weniger|mehr):/.test(a.weg[1])) e.push('Lösungsweg nennt eine Regel, die hier nicht gebraucht wird');
    return { soll: a.felder.map(f => x + off[f.label]), bereich: e };
  },
  'vo-gerade'(a) {
    const m = a.text.match(/(geraden|ungeraden) Zahlen zwischen ([\d\u00a0]+) und ([\d\u00a0]+)/);
    const von = z(m[2]), bis = z(m[3]), soll = [];
    for (let n = von + 1; n < bis; n++) if ((n % 2 === 0) === (m[1] === 'geraden')) soll.push(n);
    return { soll, bereich: bis - von > 21 || soll.length < 3 ? ['Abstand nicht bis ca. 20 / zu wenig Zahlen'] : [] };
  },
  'sw-zahlwort'(a) {
    const n = wortLesen(a.term), e = [];
    if (n < 10 || n > 99999999) e.push('außerhalb 2 Stellen bis Millionen');
    if (/[A-ZÄÖÜ]/.test(a.term.replace(/Million(en)?/g, ''))) e.push('Großbuchstabe im Zahlwort');
    return { soll: n, bereich: e };
  },
  'sw-tafel'(a) {
    const e = [];
    if (a.eingabe === 'zahl') {
      const n = kuerzelWert(a.term);
      if (String(n).length > 7) e.push('über 7 Stellen');
      const k = String(n).replace(/0/g, '').length;
      if (k < 2 || k > 4) e.push('nicht 2–4 Ziffern ≠ 0');
      return { soll: n, bereich: e };
    }
    const n = z(a.term);
    if (String(n).length > 7) e.push('über 7 Stellen');
    return { soll: kuerzelVon(n), bereich: e, kuerzel: true };
  },
  'sw-als-zahl'(a) {
    const n = kuerzelWert(a.term), s = String(n), e = [];
    if (s.length < 7 || s.length > 10) e.push('nicht 7–10 Stellen');
    const k = s.replace(/0/g, '').length;
    if (k < 2 || k > 4) e.push('nicht 2–4 Ziffern ≠ 0');
    return { soll: n, bereich: e };
  },
  'sw-ziffer'(a) {
    const d = a.text.match(/Ziffer (\d)/)[1], s = String(z(a.term));
    const e = s.indexOf(d) !== s.lastIndexOf(d) ? ['Ziffer kommt mehrmals vor'] : [];
    if (s.length > 10) e.push('über 10 Stellen');
    return { soll: d + KS[s.length - 1 - s.indexOf(d)], bereich: e, kuerzel: true };
  },
  'sw-null'(a) { const n = z(a.term); return { soll: n * 10, bereich: String(n).length < 4 || String(n).length > 6 ? ['nicht 4–6 Stellen'] : [] }; },
  'rs-runden'(a) {
    const p = STELLE_NR[a.text.match(/Runde auf (\w+)\./)[1]], n = z(a.term), e = [];
    if (String(n).length > 6) e.push('über 6 Stellen');
    if (!(p >= 1 && p <= 4)) e.push('nicht auf Z, H, T, ZT');
    if (10 ** p > n) e.push('Stelle größer als die Zahl');
    return { soll: rundeAuf(n, p), bereich: e };
  },
  'rs-ueberschlag'(a) {
    // Die Stelle steht im Text (Projektleitung 16.11.): „auf Hunderter“, „unter 100 auf Zehner“, „auf Zehner“, bei : „auf
    // Zehner und streich die Nullen“
    const t = String(a.term), x = a.text, e = [];
    if (t.includes(':')) {
      const [n, d] = t.split(' : ').map(z);
      const N = rundeAuf(n, 1), D = rundeAuf(d, 1);
      if (!/auf Zehner und streich die Nullen/.test(x)) e.push('Text nennt bei : nicht „auf Zehner, Nullen streichen“');
      if (d < 11 || d > 25) e.push('Divisor nicht 11–25');
      if (N % D) e.push('Ü geht nicht auf');
      return { soll: N / D, bereich: e };
    }
    if (t.includes('·')) e.push('Überschlag bei · (laut Heft nie)');
    const op = t.includes('+') ? '+' : '−';
    const zahlen = t.split(` ${op} `).map(z);
    let runde;
    if (/unter 100 auf Zehner/.test(x)) runde = heftUe;
    else if (/auf Zehner/.test(x)) runde = n => rundeAuf(n, 1);
    else if (/auf Hunderter/.test(x)) { runde = n => rundeAuf(n, 2); if (zahlen.some(n => n < 100)) e.push('Zahl unter 100, Text sagt nur „auf Hunderter“'); }
    else { e.push('Text nennt die Stelle nicht'); runde = heftUe; }
    const r = zahlen.map(runde);
    const soll = r.slice(1).reduce((p2, q2) => (op === '+' ? p2 + q2 : p2 - q2), r[0]);
    if (zahlen.some(n => n > 9999)) e.push('über 4 Stellen');
    if (soll <= 0) e.push('Ü ≤ 0');
    return { soll, bereich: e };
  },
  'add-kette': a => ketteOrakel(a, '+'),
  'sub-kette': a => ketteOrakel(a, '−'),
  'add-schriftlich'(a) {
    const zahlen = String(a.term).split(' + ').map(z), r = rechnen(a.term).wert, e = [];
    if (zahlen.length < 2 || zahlen.length > 4) e.push('nicht 2–4 Summanden');
    if (zahlen.some(x => String(x).length > 6) || String(r).length > 6) e.push('über 6 Stellen');
    let c = 0, ue = 0;
    for (let j = 0; j < 7; j++) { const s = zahlen.reduce((x, y) => x + Math.floor(y / 10 ** j) % 10, 0) + c; c = Math.floor(s / 10); if (c) ue++; }
    if (ue < 2) e.push('weniger als 2 Überträge');
    return { soll: r, bereich: e };
  },
  'sub-schriftlich'(a) {
    const zahlen = String(a.term).split(' − ').map(z), r = rechnen(a.term).wert, e = [];
    if (String(zahlen[0]).length > 5) e.push('Minuend über 5 Stellen');
    if (r <= 0) e.push('Ergebnis ≤ 0');
    if (zahlen.length === 3 && zahlen[0] % 100) e.push('sub-zwei: Minuend nicht rund');
    return { soll: r, bereich: e };
  },
  'sub-begriffe'(a) {
    const t = a.text, N = '([\\d\\u00a0]+)';
    const num = w => { const m = t.match(new RegExp(`${w} ist ${N}`, 'i')); return m ? z(m[1]) : null; };
    let soll = null;
    if (/Wie heißt der Minuend/.test(t)) soll = num('Differenz') + num('Subtrahend');
    else if (/Wie heißt der Subtrahend/.test(t)) soll = num('Minuend') - num('Differenz');
    else if (/Wie heißt die Differenz/.test(t)) soll = num('Minuend') - num('Subtrahend');
    else if (/andere Summand/.test(t)) soll = num('Summe') - num('ein Summand');
    else if (/Wie heißt die Summe/.test(t)) {
      const erst = num('erste Summand'), um = t.match(new RegExp(`um ${N} (größer|kleiner)`)), k = z(um[1]);
      soll = erst + (um[2] === 'größer' ? erst + k : erst - k);
    }
    return { soll, bereich: soll > 0 && soll < 10000 ? [] : ['Ergebnis außerhalb 1–9 999'] };
  },
  'ta-rechnung'(a) {
    const zahlen = zahlenIn(a.text), l = a.loesung[0], e = [];
    if (zahlen.length !== 2) e.push('nicht genau 2 Zahlen im Text');
    if (!gleicheMenge(zahlen, l.zahlen)) e.push('Zahlen der Rechnung ≠ Zahlen im Text');
    const r = rechnen(l.terme[0]);
    const op = (String(l.terme[0]).match(/[+−·:]/) || [])[0];
    if (op !== a.variante) e.push('Rechenzeichen passt nicht zur Rechenart');
    const [x, y] = zahlen.slice().sort((p, q) => q - p), Z = M.textaufgaben.zahlen || { b: [3, 9], q: [4, 12], qNicht: [10], qUngleichB: true };
    const q = x / y;
    if (x % y || y < Z.b[0] || y > Z.b[1] || q < Z.q[0] || q > Z.q[1] || (Z.qNicht || []).includes(q) || (Z.qUngleichB && q === y)) e.push('Zahlen nicht nach TA_ZAHLEN (a = b · q)');
    if ([x + y, x - y, x * y, q].some(w => w === x || w === y)) e.push('ein Ergebnis gleich a oder b');
    return { soll: [{ wert: r.wert, zahlen }, r.wert], bereich: e };
  },
  'ta-ganz'(a) {
    // Jede Rechnung „… = …“ im Lösungsweg nachrechnen (auch „287 : 8 = 35 R 7“); jede Lösung muss dort als Ergebnis stehen,
    // jede Zahl einer Rechnung im Text oder als früheres Ergebnis; im Antwortsatz stehen die Lösungen
    const e = [], ergebnisse = [], bekannt = zahlenIn(a.text);
    const zeilen = a.weg.filter(w => typeof w === 'string');
    for (const zl of zeilen) {
      if (/^(geg|A):/.test(zl)) continue;
      for (const m of zl.matchAll(/((?:\d[\d\u00a0]*\s*[+−·:]\s*)+\d[\d\u00a0]*)\s*=\s*([\d\u00a0]+)(?:\s*R\s*(\d+))?/g)) {
        const r = rechnen(m[1]), w = z(m[2]), rest = m[3] ? Number(m[3]) : 0;
        if (!r) { e.push('Rechnung im Lösungsweg unlesbar'); continue; }
        const teiler = /:/.test(m[1]) ? z(m[1].split(':').pop()) : 0;
        const ok = teiler ? Math.floor(r.wert) === w && Math.round((r.wert - w) * teiler) === rest : r.wert === w;
        if (!ok) e.push(`Rechnung im Lösungsweg stimmt nicht: ${m[0]}`);
        for (const n of zahlenIn(m[1])) if (!bekannt.includes(n) && !ergebnisse.includes(n)) e.push(`Zahl ${n} steht weder im Text noch als Ergebnis davor`);
        ergebnisse.push(w);
        if (m[3]) ergebnisse.push(rest);
      }
    }
    const l = a.loesung;
    if (l.some(w => !ergebnisse.includes(w))) e.push('Lösung kommt im Lösungsweg nicht als Ergebnis vor');
    if (l.some(w => !(w > 0) || !Number.isInteger(w))) e.push('Ergebnis nicht ganz und > 0');
    const antwort = a.weg.find(w => typeof w === 'string' && w.startsWith('A:'));
    if (!antwort) e.push('WARN:kein Antwortsatz (A:)');
    else if (l.some(w => !zahlenIn(antwort).includes(w))) e.push('WARN:Antwortsatz nennt nicht alle Ergebnisse');
    if (a.felder.length !== l.length) e.push('Felder ≠ Lösungen');
    if (a.weg.some(w => typeof w === 'string' && /^geg:/.test(w) && / · /.test(w))) e.push('„·“ als Trennzeichen in geg/ges (sieht aus wie ein Malpunkt; „;“ nehmen)');
    return { soll: l.slice(), bereich: e };
  },
  'mul-kopf-stufe'(a) {
    const [x, y] = String(a.term).split(' · ').map(z), e = [];
    const s = [x, y].find(v => [10, 100, 1000].includes(v)), o = s === x ? y : x;
    if (!s) e.push('kein Faktor 10, 100, 1 000');
    if (String(o).length < 2 || String(o).length > 4) e.push('Zahl nicht 2–4 Stellen');
    return { soll: x * y, bereich: e };
  },
  'mul-kopf-nullen'(a) {
    const f = String(a.term).split(' · ').map(z), e = [];
    for (const v of f) if (!/^[2-9]0+$/.test(String(v))) e.push('Faktor nicht Zehner/Hunderter/Tausender');
    if (f[0] * f[1] > 1e7) e.push('über 10 Millionen');
    return { soll: f[0] * f[1], bereich: e };
  },
  'mul-kopf-drei'(a) {
    const f = String(a.term).split(' · ').map(z);
    return { soll: f.reduce((x, y) => x * y, 1), bereich: f.length !== 3 || f.some(v => v < 2 || v > 9) ? ['nicht 3 Faktoren 2–9'] : [] };
  },
  'mul-kopf-klammer'(a) {
    const r = rechnen(a.term), e = [];
    if (!/^\d · \(\d+ [+−] \d+\)$|^\(\d+ [+−] \d+\) · \d$/.test(String(a.term))) e.push('nicht Faktor · (Summe/Differenz)');
    if (r.zwischen.some(w => !ganz(w))) e.push('Zwischenergebnis nicht ganz ≥ 0');
    return { soll: r.wert, bereich: e };
  },
  'mul-schriftlich'(a) {
    const [x, y] = String(a.term).split(' · ').map(z), e = [];
    if (String(x).length < 2 || String(x).length > 4) e.push('1. Faktor nicht 2–4 Stellen');
    if (String(y).length > 3) e.push('2. Faktor über 3 Stellen');
    if (a.variante === 'mul-einser' && (y < 11 || y > 19)) e.push('mul-einser nicht 11–19');
    return { soll: x * y, bereich: e };
  },
  'div-kopf'(a) {
    const o = divOrakel(a), e = [];
    if (o.d !== 0 && o.d > 9 && !/^[1-9]0*$/.test(String(o.d)) && !/^[2-9]0+$/.test(String(o.d))) e.push('Divisor nicht Einmaleins/Stufenzahl/Zehner');
    if (o.soll !== 'nm' && o.soll.r && (o.d > 9 || o.soll.q > 10)) e.push('Rest außerhalb des Einmaleins');
    return { soll: o.soll, bereich: e };
  },
  'div-schriftlich-1'(a) {
    const o = divOrakel(a), e = [];
    if (o.d < 2 || o.d > 9) e.push('Divisor nicht 2–9');
    if (String(o.n).length > 5) e.push('Dividend über 5 Stellen');
    return { soll: o.soll, bereich: e };
  },
  'div-schriftlich-2'(a) {
    const o = divOrakel(a), e = [];
    if (o.d < 11 || o.d > 25) e.push('Divisor nicht 11–25');
    if (String(o.n).length < 3 || String(o.n).length > 5) e.push('Dividend nicht 3–5 Stellen');
    return { soll: o.soll, bereich: e };
  },
  'vb-regeln'(a) {
    const r = rechnen(a.term), e = [];
    const ops = (String(a.term).match(/[+−·:]/g) || []).length, kl = (String(a.term).match(/\(/g) || []).length;
    if (ops < 2 || ops > 4) e.push('nicht 2–4 Rechenzeichen');
    if (kl > 2) e.push('mehr als 2 Klammern');
    if (zahlenIn(a.term).some(n => n > 100 || n < 1)) e.push('Zahl außerhalb 1–100');
    if (r.zwischen.some(w => !ganz(w))) e.push('Zwischenergebnis nicht ganz ≥ 0');
    if (r.punkt.some(([o, x, y, w]) => (o === '·' ? x > 10 || y > 10 : y > 10 || w > 10))) e.push('Punktrechnung nicht im Einmaleins');
    // keine gemischten Ketten aus · und : auf einer Ebene
    const flach = String(a.term).replace(NB, '');
    let tiefe = 0, letzt = null;
    for (let i = 0; i < flach.length; i++) {
      const c = flach[i];
      if (c === '(') { tiefe++; letzt = null; } else if (c === ')') { tiefe--; letzt = null; } else if (c === '+' || c === '−') letzt = null;
      else if (c === '·' || c === ':') { if (letzt && (letzt !== c || c === ':')) e.push('gemischte Kette aus · und :'); letzt = c; }
    }
    const falle = vonLinks(a.term) !== r.wert || (kl && ohneKlammern(a.term) !== r.wert);
    if (!falle) e.push('keine Falle: von links und ohne Klammer gleich');
    return { soll: r.wert, bereich: e };
  },
  'vb-term'(a) {
    const l = a.loesung[0], r = rechnen(l.terme[0]), zahlen = zahlenIn(a.text), e = [];
    if (!gleicheMenge(zahlen, l.zahlen)) e.push('Zahlen der Rechnung ≠ Zahlen im Satz');
    if (r.zwischen.some(w => !ganz(w))) e.push('Zwischenergebnis nicht ganz ≥ 0');
    if (r.punkt.some(([o, x, y, w]) => (o === '·' ? x > 10 || y > 10 : y > 10 || w > 10))) e.push('Punktrechnung nicht im Einmaleins');
    if (l.terme[0].includes('(') && ohneKlammern(l.terme[0]) === r.wert) e.push('ohne Klammer gleicher Wert');
    // Ein anderes Rechenzeichen an irgendeiner Stelle darf nie denselben Wert geben (sonst gälte es als richtig)
    const zeichen = [...l.terme[0]].map((c, i) => ('+−·:'.includes(c) ? i : -1)).filter(i => i >= 0);
    for (const i of zeichen) for (const o of '+−·:') {
      if (o === l.terme[0][i]) continue;
      const anders = rechnen(l.terme[0].slice(0, i) + o + l.terme[0].slice(i + 1));
      if (anders && anders.wert === r.wert && anders.zwischen.every(w => Number.isInteger(w))) e.push(`anderes Zeichen gibt denselben Wert (${o})`);   // wie pruefe: negativ geht, Division muss aufgehen
    }
    return { soll: [{ wert: r.wert, zahlen }, r.wert], bereich: e };
  }
};

// ---------------------------------------------------------------- Antworten wie das Ziffernfeld sie schickt
const termEingabe = t => String(t).replace(NB, '');
function eingabeVon(a, l = a.loesung) {
  if (l === 'nm') return 'nm';
  switch (a.eingabe) {
    case 'rest': return { q: String(l.q), r: String(l.r || 0) };
    case 'term': return termEingabe(l.terme[0]);
    case 'liste': return l.map(String);
    case 'ordnen': return l.slice();
    case 'strahl': return l.slice().reverse();
    case 'felder': return a.felder.map((f, i) => (f.art === 'term' ? termEingabe(l[i].terme[0]) : String(l[i])));
    case 'vergleich': case 'kuerzel': return String(l);
    default: return String(l);
  }
}
function eingabeAusSchluessel(a, k) {
  if (k === 'nm') return 'nm';
  if (a.eingabe === 'rest') { const m = k.match(/^(\d+)R(\d+)$/); return m ? { q: m[1], r: m[2] } : null; }
  if (['liste', 'ordnen', 'strahl'].includes(a.eingabe)) return k.split('|').map(Number);
  if (a.eingabe === 'felder') {
    const m = k.match(/^(\d+):(.+)$/);
    if (!m) return null;
    const i = Number(m[1]), f = a.felder[i];
    if (!f || f.art === 'term') return null;   // Term-Schlüssel ist ein Wert, keine Rechnung: nur „≠ Lösung“ prüfbar
    const e = eingabeVon(a);
    e[i] = m[2];
    return e;
  }
  if (a.eingabe === 'term') return null;
  return k;
}
function sollGleich(a, soll, orakel) {
  const l = a.loesung;
  if (soll === null || soll === undefined) return false;
  if (orakel.kuerzel) return typeof l === 'string' && kuerzelMenge(l) === kuerzelMenge(soll);
  if (a.eingabe === 'rest') return soll === 'nm' ? l === 'nm' : l && l.q === soll.q && (l.r || 0) === soll.r;
  if (a.eingabe === 'felder') {
    return Array.isArray(l) && l.length === soll.length && soll.every((s, i) => (s && typeof s === 'object'
      ? l[i] && l[i].wert === s.wert && gleicheMenge(l[i].zahlen, s.zahlen) : l[i] === s));
  }
  if (Array.isArray(soll)) return Array.isArray(l) && l.length === soll.length && soll.every((s, i) => l[i] === s);
  return l === soll;
}
// Zahlen, die das Ergebnis ausmachen (für „weg[0] verrät das Ergebnis nicht“)
function ergebnisZahlen(a) {
  const l = a.loesung;
  if (l === 'nm' || a.eingabe === 'vergleich' || a.eingabe === 'kuerzel') return [];
  if (a.eingabe === 'rest') return [l.q];
  if (a.eingabe === 'felder') return l.map(x => (x && typeof x === 'object' ? x.wert : x));
  if (Array.isArray(l)) return l;
  return [l];
}

// Eine sicher falsche Antwort in der Form der Lösung (für den Test „jede falsche Antwort bekommt einen Satz“)
function falscheLoesung(a) {
  const l = a.loesung;
  if (l === 'nm') return { q: 1, r: 0 };
  switch (a.eingabe) {
    case 'rest': return { q: l.q + 7, r: 0 };
    case 'kuerzel': return l === '9Md' ? '8Md' : '9Md';
    case 'liste': case 'ordnen': case 'strahl': return l.slice().reverse().map((x, i) => (i ? x : x + 7));
    case 'felder': return l.map((x, i) => (x && typeof x === 'object' ? x : i === l.length - 1 ? x + 7 : x));
    default: return typeof l === 'number' ? l + 7 : l;
  }
}

// ---------------------------------------------------------------- Prüfung einer Aufgabe
const STR_OPS = /[*×÷\/]| - | x /;
const HINWEIS_TYPEN = new Set(['ta-rechnung', 'ta-ganz', 'vb-term', 'sub-begriffe']);   // hier ist die Rechenart gesucht
// Einstufung auf Schularbeits-Niveau (Lernauftrag Teil A): diese leichten Spielarten kommen dort nicht vor
const EINSTUFUNG_NICHT = { 'vo-vzn': ['frei'], 'rs-runden': ['frei'], 'div-kopf': ['eins', 'null', 'einmaleins'], 'sub-begriffe': ['differenz'] };
function pruefeAufgabe(t, a, seed, zweck, sammel) {
  const id = t.id;
  if (zweck === 'einstufung' && (EINSTUFUNG_NICHT[id] || []).includes(a.variante)) fehler(id, `Einstufung mit leichter Spielart ${a.variante}`, kurz(a));
  // 7. reines JSON
  const json = JSON.stringify(a);
  if (JSON.stringify(JSON.parse(json)) !== json || /NaN|Infinity|undefined/.test(json)) fehler(id, 'kein reines JSON', kurz(a));
  if (a.typ !== id) fehler(id, 'typ falsch gesetzt', a.typ);
  for (const k of ['text', 'kennung', 'eingabe']) if (typeof a[k] !== 'string' || (k !== 'eingabe' && !a[k])) fehler(id, `Feld ${k} fehlt`, kurz(a));
  if (typeof a.term !== 'string') fehler(id, 'term ist kein Text', kurz(a));
  if (a.eingabe === 'felder' && (!Array.isArray(a.felder) || !a.felder.length)) fehler(id, 'felder fehlen', kurz(a));
  if (t.wo === 'papier' && a.eingabe === 'vergleich') fehler(id, 'Papier mit Vergleich', kurz(a));
  // 1. + 2. Lösung und Bereich
  let o;
  try { o = ORAKEL[id](a); } catch (e) { fehler(id, `Orakel kann die Aufgabe nicht lesen (${e.message})`, kurz(a)); return; }
  if (!sollGleich(a, o.soll, o)) fehler(id, 'Lösung stimmt nicht', `${kurz(a)} → ${JSON.stringify(a.loesung)} statt ${JSON.stringify(o.soll)}`);
  for (const b of o.bereich) (b.startsWith('WARN:') ? warn(id, `Bereich: ${b.slice(5)}`, kurz(a)) : fehler(id, `Bereich: ${b}`, kurz(a)));
  // 3. pruefe: die richtige Antwort
  const ein = eingabeVon(a);
  const r = M.pruefe(a, ein);
  if (!r.ok) fehler(id, 'richtige Antwort gilt nicht', `${kurz(a)} ← ${JSON.stringify(ein)}`);
  if (a.eingabe === 'zahl' && typeof a.loesung === 'number' && a.loesung >= 1000) {
    if (!M.pruefe(a, M.format(a.loesung)).ok) fehler(id, 'Dreiergruppen mit Leerzeichen gelten nicht', kurz(a));
    if (!M.pruefe(a, String(M.format(a.loesung)).replace(/\u00a0/g, '.')).ok) fehler(id, 'Punkt zwischen Dreiergruppen gilt nicht', kurz(a));
    if (M.pruefe(a, String(a.loesung)[0] + String(a.loesung)).ok) fehler(id, 'falsche Zahl gilt', kurz(a));
  }
  if (a.eingabe === 'kuerzel' && typeof a.loesung === 'string' && !M.pruefe(a, a.loesung.split(' ').reverse().join(' ')).ok) fehler(id, 'Kürzel in anderer Reihenfolge gelten nicht', kurz(a));
  if (a.eingabe === 'zahl' && typeof a.loesung === 'number' && M.pruefe(a, '0' + a.loesung).ok) fehler(id, 'führende Null gilt', kurz(a));
  for (const alt of a.alt || []) if (!M.pruefe(a, eingabeVon(a, alt)).ok) fehler(id, 'alt-Lösung gilt nicht', kurz(a));
  // 3. + 4. fehler-Schlüssel
  const richtig = new Set([a.loesung, ...(a.alt || [])].map(l => M.schluessel(a.eingabe === 'felder' ? 'felder' : a.eingabe, l)));
  const loesFeld = a.eingabe === 'felder' ? a.felder.map((f, i) => M.schluessel(f.art, a.loesung[i])) : [];
  for (const [k, art] of Object.entries(a.fehler || {})) {
    sammel.fehlerarten.add(art);
    if (!(art in M.fehlerTexte)) fehler(id, `Fehlerart ohne Rückmeldetext: ${art}`, k);
    if (richtig.has(k)) { fehler(id, 'fehler gleich Lösung', `${kurz(a)} ${k}`); continue; }
    const m = k.match(/^(\d+):(.+)$/);
    if (a.eingabe === 'felder') {
      if (!m || Number(m[1]) >= a.felder.length) { fehler(id, 'fehler-Schlüssel ohne gültiges Feld', k); continue; }
      if (loesFeld[Number(m[1])] === m[2]) { fehler(id, 'fehler gleich Lösung (Feld)', `${kurz(a)} ${k}`); continue; }
    }
    const e = eingabeAusSchluessel(a, k);
    if (e == null) continue;
    const rr = M.pruefe(a, e);
    if (rr.unlesbar) fehler(id, 'fehler-Schlüssel ist unlesbar', `${kurz(a)} ${k}`);
    else if (rr.ok) fehler(id, 'fehler-Schlüssel gilt als richtig', `${kurz(a)} ${k}`);
    else if (rr.fehlerart !== art) fehler(id, 'pruefe liefert eine andere Fehlerart', `${kurz(a)} ${k}: ${rr.fehlerart} statt ${art}`);
    else if (!rr.hinweis) fehler(id, 'kein Rückmeldetext (hinweis)', `${k}`);
    sammel.fehlerTreffer++;
  }
  if (!Object.keys(a.fehler || {}).length && !(a.rueck && a.rueck._)) sammel.ohneFehler++;
  // M1 (pruefung): jede falsche Antwort bekommt einen Satz – ohne eigene Fehlerart den Strategie-Satz rueck._
  if (!(a.rueck && typeof a.rueck._ === 'string' && a.rueck._.length > 10)) fehler(id, 'kein Strategie-Satz (rueck._)', kurz(a));
  else { const rw = M.pruefe(a, a.eingabe === 'vergleich' ? (a.loesung === '<' ? '>' : '<') : eingabeVon(a, falscheLoesung(a))); if (!rw.ok && !rw.unlesbar && !rw.hinweis) fehler(id, 'falsche Antwort ohne Rückmeldetext', kurz(a)); }
  // „7 Rest 3“ als Text lesbar
  if (a.eingabe === 'rest' && a.loesung !== 'nm' && a.loesung.r && !M.pruefe(a, `${a.loesung.q} Rest ${a.loesung.r}`).ok) fehler(id, '„… Rest …“ als Text nicht lesbar', kurz(a));
  // Sagt der Text „Überschlag“, steht im Lösungsweg eine Zeile mit „Ü:“
  if (/Überschlag/.test(a.text) && !(a.weg || []).some(w => typeof w === 'string' && /^Ü:/.test(w))) fehler(id, 'Text verlangt Überschlag, Lösungsweg hat keine Ü-Zeile', kurz(a));
  // Probe mit Rest wie im Heft: „…, x + r R = …“
  if (/^div-schriftlich/.test(id) && a.loesung.r && !(a.weg || []).some(w => typeof w === 'string' && w.includes(`+ ${a.loesung.r} R =`))) fehler(id, 'Probe mit Rest nicht wie im Heft (+ r R =)', kurz(a));
  // Platzhalter bei der Multiplikation wie in Heft und Probe: „·“, kein „.“
  if (id === 'mul-schriftlich' && (a.weg || []).some(w => w && w.mono && w.mono.some(z0 => z0.includes('.')))) fehler(id, 'Platzhalter „.“ statt „·“ in der Rechenspalte', kurz(a));
  if (id === 'ta-rechnung') taRundweg(a, t);
  // 5. Lösungsweg
  const weg = a.weg;
  const wegMax = id === 'ta-ganz' ? 5 : 3;   // ta-ganz: geg/ges, a), b), Kurzform, A: (Projektleitung 16.11.)
  if (!Array.isArray(weg) || weg.length < 2 || weg.length > wegMax) fehler(id, `Lösungsweg nicht 2–${wegMax} Zeilen`, kurz(a));
  else {
    if (typeof weg[0] !== 'string' || !weg[0]) fehler(id, 'weg[0] ist kein Text', kurz(a));
    for (const w of weg) if (!(typeof w === 'string' && w) && !(w && Array.isArray(w.mono) && w.mono.every(x => typeof x === 'string'))) fehler(id, 'Zeile im Lösungsweg ungültig', kurz(a));
    // Nur Zahlen, die das Kind noch nicht sieht, können etwas verraten (z. B. 64 : 8 = 8: die 8 steht schon da)
    const sichtbar = new Set([...zahlenIn(a.text), ...zahlenIn(a.term), ...(a.felder || []).flatMap(f => zahlenIn(f.label)), ...(a.ziel || []), ...(a.zahlen || [])]);
    const versteckt = ergebnisZahlen(a).filter(x => !sichtbar.has(x));
    const in0 = zahlenIn(String(weg[0]).replace(/_/g, ''));
    if (versteckt.length && versteckt.every(x => in0.includes(x))) fehler(id, 'weg[0] verrät das Ergebnis', `${kurz(a)} | ${weg[0]}`);
    else if (versteckt.length > 1 && versteckt.some(x => in0.includes(x)) && !id.startsWith('zs-')) warn(id, 'weg[0] nennt ein Teilergebnis', `${kurz(a)} | ${weg[0]}`);
    if (a.eingabe === 'rest' && a.loesung !== 'nm' && a.loesung.r && String(weg[0]).includes(`R ${a.loesung.r}`)) fehler(id, 'weg[0] verrät den Rest', kurz(a));
  }
  // 6. Schreibweise
  const zeilen = [a.text, a.term, ...(Array.isArray(weg) ? weg.filter(w => typeof w === 'string') : []), ...(a.felder || []).map(f => f.label)];
  for (const s of zeilen) {
    if (/\d{4,}/.test(String(s).replace(/_/g, ''))) { fehler(id, 'Zahl ab 4 Stellen ohne Dreiergruppen', `${kurz(a)} | ${s}`); break; }
  }
  if (STR_OPS.test(a.term)) fehler(id, 'Rechenzeichen nicht · : − im term', a.term);
  for (const s of zeilen) if (/\d ?- ?\d/.test(String(s))) { fehler(id, 'Bindestrich statt Minus', s); break; }
  const alles = zeilen.join(' ');
  if (alles.includes('≈') && id !== 'rs-runden') fehler(id, '≈ außerhalb von Runden', kurz(a));
  if (/Ü:[^.;]*≈/.test(alles)) fehler(id, '„Ü:“ mit ≈', kurz(a));
  const anz = M.anzeigen(a);
  if (typeof anz !== 'string' || !anz || /undefined|NaN|object/.test(anz)) fehler(id, 'anzeigen liefert Unsinn', `${kurz(a)} → ${anz}`);
  // 9. Hinweis-Test: Wo die Rechenart gesucht ist, steht der Name des Typs nie in der Aufgabe (die App zeigt ihn erst danach)
  if (HINWEIS_TYPEN.has(id) && (`${a.text} ${a.term}`).toLowerCase().includes(t.titel.toLowerCase())) fehler(id, 'Hinweis-Test: Titel steht in der Aufgabe', kurz(a));
  sammel.tasten.add(JSON.stringify(a.tasten || []));
  sammel.eingaben.add(a.eingabe);
}

// ---------------------------------------------------------------- ta-rechnung: alle typischen Fehler einmal eintippen
// Jede Rechenart in beiden Reihenfolgen: die richtige Rechenart umgedreht → „umgedreht“; die Rechenart des Signalworts
// einer Falle → „signalwort“; jede andere → „rechenart“. Rechnung richtig, Ergebnis falsch → „rechenfehler“; andere Zahlen →
// „zahlen“. Jede Rückmeldung ohne offene {Platzhalter}.
const VORLAGE_VON = new Map();
for (const g of M.textaufgaben.rechnung) for (const fr of g.fragen) VORLAGE_VON.set(fr.text, fr);
function taRundweg(a, t) {
  const id = t.id, l = a.loesung[0], [x, y] = l.zahlen.slice().sort((p, q) => q - p);
  const fr = [...VORLAGE_VON.values()].find(v => a.text === v.text.replace('{a}', M.format(x)).replace('{b}', M.format(y)));
  if (!fr) { fehler(id, 'Vorlage zur Aufgabe nicht gefunden', kurz(a)); return; }
  const falle = fr.signal === 'irrefuehrend' ? fr.irreArt : null;
  for (const o of ['+', '−', '·', ':']) for (const [p, q] of [[x, y], [y, x]]) {
    const term = `${p}${o}${q}`, r = rechnen(`${p} ${o} ${q}`);
    const ergebnis = r && Number.isInteger(r.wert) && r.wert >= 0 ? String(r.wert) : '1';
    const rr = M.pruefe(a, [term, ergebnis]);
    const richtig = o === a.variante && (o === '+' || o === '·' || p === x);
    if (richtig) { if (!rr.ok) fehler(id, 'richtige Rechnung gilt nicht', `${kurz(a)} ← ${term}`); continue; }
    const soll = o === a.variante ? 'umgedreht' : o === falle ? 'signalwort' : 'rechenart';
    if (rr.ok || rr.unlesbar) fehler(id, 'falsche Rechnung gilt oder ist unlesbar', `${kurz(a)} ← ${term}`);
    else if (rr.fehlerart !== soll) fehler(id, `Fehlerart ${rr.fehlerart} statt ${soll}`, `${kurz(a)} ← ${term}`);
    if (!rr.hinweis || /[{}]/.test(rr.hinweis)) fehler(id, 'Rückmeldung fehlt oder hat offene Platzhalter', `${term}: ${rr.hinweis}`);
  }
  const rf = M.pruefe(a, [M.termNorm(l.terme[0]), String(l.wert + 1)]);
  if (rf.ok || rf.fehlerart !== 'rechenfehler' || !rf.hinweis) fehler(id, 'Rechenfehler nicht erkannt', `${kurz(a)} → ${rf.fehlerart}`);
  const rz = M.pruefe(a, [`${x + 1}+${y}`, String(x + 1 + y)]);
  if (rz.ok || rz.fehlerart !== 'zahlen' || !rz.hinweis) fehler(id, 'andere Zahlen nicht erkannt', `${kurz(a)} → ${rz.fehlerart}`);
}

// ---------------------------------------------------------------- Hinweis-Test ta-rechnung (über alle Aufgaben)
const RECHENWOERTER = /\b(addier|subtrahier|multiplizier|dividier|plus|minus|mal|geteilt|Summe|Differenz|Produkt|Quotient)/i;
const SIGNALWOERTER = ['mehr', 'weniger', 'dazu', 'zusammen', 'übrig', 'bleiben', 'noch', 'je', 'jede', 'jeder', 'jedes', 'gleichmäßig', 'verteilt', 'mal', 'insgesamt', 'pro', 'teilen', 'gleich'];
function hinweisTextaufgaben(liste) {
  const id = 'ta-rechnung', jeArt = {};
  for (const a of liste) {
    const x = jeArt[a.variante] || (jeArt[a.variante] = { n: 0, form: new Set(), teilbar: 0, gross: 0, woerter: {} });
    x.n++;
    x.form.add(JSON.stringify([a.eingabe, a.felder.map(f => [f.art, f.label]), a.tasten]));
    const [p, q] = zahlenIn(a.text).sort((u, v) => v - u);
    if (p % q === 0) x.teilbar++;
    x.gross += p;
    if (RECHENWOERTER.test(a.text.replace(/-mal\b/g, ''))) fehler(id, 'Hinweis-Test: Rechen-Wort im Text', a.text);
    const woerter = new Set(a.text.toLowerCase().replace(/[^a-zäöüß\- ]/g, ' ').split(/\s+/));
    for (const w of SIGNALWOERTER) if (woerter.has(w) || (w === 'mal' && /-mal\b/.test(a.text))) x.woerter[w] = (x.woerter[w] || 0) + 1;
  }
  const arten = Object.keys(jeArt);
  if (arten.length !== 4) fehler(id, 'Hinweis-Test: nicht alle vier Rechenarten', arten.join(' '));
  const formen = new Set(arten.flatMap(r => [...jeArt[r].form]));
  if (formen.size !== 1) fehler(id, 'Hinweis-Test: Eingabe, Felder oder Tasten verraten die Rechenart', [...formen].join(' / '));
  for (const r of arten) if (jeArt[r].teilbar !== jeArt[r].n) fehler(id, 'Hinweis-Test: Zahlenmuster (Teilbarkeit) nicht bei allen Rechenarten gleich', `${r}: ${jeArt[r].teilbar}/${jeArt[r].n}`);
  const mittel = arten.map(r => jeArt[r].gross / jeArt[r].n), lo = Math.min(...mittel), hi = Math.max(...mittel);
  if (hi > lo * 1.2) warn(id, 'Hinweis-Test: Zahlengröße je Rechenart verschieden', arten.map((r, i) => `${r} ${mittel[i].toFixed(0)}`).join(', '));
  const fallen = liste.filter(a => a.falle).length;
  const anteile = arten.map(r => `${r} ${(100 * jeArt[r].n / liste.length).toFixed(0)} %`).join(', ') + ` · mit Falle (Signalwort) etwa ${(100 * fallen / liste.length).toFixed(0)} %`;
  const signal = [];
  for (const w of SIGNALWOERTER) {
    const c = arten.map(r => jeArt[r].woerter[w] || 0), s = c.reduce((u, v) => u + v, 0);
    if (!s) continue;
    const top = Math.max(...c);
    const zeile = `${w}: ${arten.map((r, i) => `${r}${c[i]}`).join(' ')}`;
    signal.push(zeile);
    if (s >= liste.length * 0.03 && top / s >= 0.95) warn(id, 'Hinweis-Test: Signalwort nur bei einer Rechenart (Inhalt oder Hinweis? Liste in der Ausgabe)', zeile);
  }
  return { anteile, signal };
}

// ---------------------------------------------------------------- Lauf
const ID_REG = new Map();
for (const z0 of IDS.split('\n')) { const m = z0.match(/^(typ|fehlerart|reserviert|platzhalter)\s+(\S+)/); if (m) ID_REG.set(`${m[1]}:${m[2]}`, true); }
const typen = M.typen.filter(t => (NUR.length ? NUR.includes(t.id) : !t.id.startsWith('dummy-')));
const zeilen = [], alleFehlerarten = new Set();
let taListe = [];
const seedRnd = M.zufall(20261116);
const neuerSeed = () => (seedRnd() * 4294967296) >>> 0;
const start = Date.now();

for (const t of typen) {
  const id = t.id;
  // Typ-Felder
  if (!M.themen.some(x => x.id === t.thema)) fehler(id, 'unbekanntes Thema', t.thema);
  for (const k of ['titel', 'quelle']) if (typeof t[k] !== 'string' || !t[k]) fehler(id, `Typ ohne ${k}`, '');
  if (!['app', 'papier'].includes(t.wo)) fehler(id, 'wo nicht app/papier', t.wo);
  if (!(Number(t.sek) > 0) || !(Number(t.sekNeu) > 0)) fehler(id, 'sek oder sekNeu fehlt', '');
  if (!ID_REG.has(`typ:${id}`) && !ID_REG.has(`platzhalter:${id}`)) fehler(id, 'id fehlt in tools/ids.txt', id);
  if (ID_REG.has(`reserviert:${id}`)) fehler(id, 'reservierter Name als id', id);
  for (const x of [...(t.nah || []), ...(t.voraus || [])]) if (!M.typen.some(y => y.id === x)) fehler(id, 'nah/voraus mit unbekannter id', x);
  // Probe der App: Seed 1, Zweck runde
  try { const a = t.erzeuge(M.zufall(1), { zweck: 'runde' }); if (!a) fehler(id, 'Probe (Seed 1) liefert nichts', ''); } catch (e) { fehler(id, `Probe (Seed 1) wirft: ${e.message}`, ''); }

  const sammel = { fehlerarten: new Set(), tasten: new Set(), eingaben: new Set(), fehlerTreffer: 0, ohneFehler: 0 };
  const kennungen = new Set();
  let n = 0, dopRoh = 0, dopApp = 0, vorher = null, vorherRoh = null, beispiel = null;
  const laeufe = [['runde', N], ...ZWECKE.map(zw => [zw, ANDERE])];
  for (const [zweck, anzahl] of laeufe) {
    vorher = null; vorherRoh = null;
    for (let i = 0; i < anzahl; i++) {
      let a = null, seed = 0;
      // wie die App: bis zu 6 Versuche, solange dieselbe Aufgabe wie eben kommt
      for (let v = 0; v < 6; v++) {
        seed = neuerSeed();
        try { a = t.erzeuge(M.zufall(seed), { zweck }); } catch (e) { fehler(id, `erzeuge wirft (${zweck}): ${e.message}`, `Seed ${seed}`); a = null; break; }
        if (!a) { fehler(id, `erzeuge liefert nichts (${zweck})`, `Seed ${seed}`); break; }
        if (v === 0) { if (vorherRoh === a.kennung) dopRoh++; vorherRoh = a.kennung; }
        if (a.kennung !== vorher) break;
      }
      if (!a) continue;
      if (a.kennung === vorher) { dopApp++; fehler(id, 'zweimal dieselbe Aufgabe hintereinander (auch nach 6 Versuchen)', kurz(a)); }
      vorher = a.kennung;
      kennungen.add(a.kennung);
      n++;
      if (zweck === 'runde' && i < 3) {
        const b = t.erzeuge(M.zufall(seed), { zweck });
        if (JSON.stringify(b) !== JSON.stringify(a)) fehler(id, 'gleicher Seed, andere Aufgabe', kurz(a));
      }
      if (!beispiel && zweck === 'runde' && i === 7) beispiel = a;
      pruefeAufgabe(t, a, seed, zweck, sammel);
      if (id === 'ta-rechnung' && zweck === 'runde') taListe.push(a);
    }
  }
  sammel.fehlerarten.forEach(f => alleFehlerarten.add(f));
  if (sammel.tasten.size > 1) fehler(id, 'Hinweis-Test: Tasten wechseln innerhalb des Typs', [...sammel.tasten].join(' / '));
  zeilen.push({ id, t, n, distinct: kennungen.size, dopRoh, dopApp, beispiel, sammel });
}
const ta = taListe.length ? hinweisTextaufgaben(taListe) : null;
for (const f of alleFehlerarten) if (!ID_REG.has(`fehlerart:${f}`)) fehler('—', 'Fehlerart fehlt in tools/ids.txt', f);
for (const f of Object.keys(M.fehlerTexte)) if (!ID_REG.has(`fehlerart:${f}`)) fehler('—', 'Fehlerart (Text) fehlt in tools/ids.txt', f);
for (const v of M.textaufgaben.fehler || []) fehler('—', 'Vorlage fehlerhaft', v);
// Name des Kindes: steht nie im Repo (CLAUDE.md Regel 5). Er kommt aus KIND_NAME oder aus tools/test/kind-name.txt
// (der Ordner steht in .gitignore). Ohne Namen läuft dieser Check nicht – das steht dann in der Ausgabe.
let KIND = (process.env.KIND_NAME || '').trim();
if (!KIND) { try { KIND = fs.readFileSync(path.join(ORDNER, 'tools', 'test', 'kind-name.txt'), 'utf8').trim(); } catch (e) { /* keine Datei */ } }
const NAMENS_CHECK = KIND
  ? (() => {
    const meine = { 'aufgaben.js': QUELLE, 'tools/ids.txt': IDS, 'tools/aufgaben-pruefen.mjs': fs.readFileSync(fileURLToPath(import.meta.url), 'utf8') };
    for (const [datei, text] of Object.entries(meine)) if (text.toLowerCase().includes(KIND.toLowerCase())) fehler('—', 'Name des Kindes in ' + datei, '');
    return 'Namens-Check: gelaufen.';
  })()
  : 'Namens-Check übersprungen: Name fehlt (KIND_NAME setzen oder tools/test/kind-name.txt anlegen, steht in .gitignore).';
if (/Math\.random\s*\(/.test(QUELLE.replace(/\/\*[\s\S]*?\*\/|\/\/.*$/gm, ''))) fehler('—', 'Math.random im Code', '');

// ---------------------------------------------------------------- Ausgabe
const fmt = n => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
const pad = (s, l) => String(s).padEnd(l);
console.log(`Mathe Legends – Aufgaben prüfen (${fmt(N)} je Typ als „runde“, dazu je ${ANDERE} für ${ZWECKE.join(', ')}; ${((Date.now() - start) / 1000).toFixed(1)} s)\n`);
console.log(`${pad('Typ', 19)}${pad('wo', 7)}${pad('Aufgaben', 10)}${pad('verschieden', 13)}${pad('gleich hint.', 14)}${pad('FEHLER', 8)}${pad('WARN', 6)}Fehlerarten`);
for (const zl of zeilen) {
  const f = [...MELD.values()].filter(x => x.typ === zl.id && x.art === 'FEHLER').reduce((s, x) => s + x.n, 0);
  const w = [...MELD.values()].filter(x => x.typ === zl.id && x.art === 'WARN').reduce((s, x) => s + x.n, 0);
  console.log(`${pad(zl.id, 19)}${pad(zl.t.wo, 7)}${pad(fmt(zl.n), 10)}${pad(fmt(zl.distinct), 13)}${pad(`${zl.dopRoh} → ${zl.dopApp}`, 14)}${pad(f, 8)}${pad(w, 6)}${[...zl.sammel.fehlerarten].sort().join(' ')}`);
}
console.log('\nBeispiele (Zweck runde):');
for (const zl of zeilen) {
  const a = zl.beispiel;
  if (!a) continue;
  const bild = a.bild ? ` {Strahl ab ${a.bild.start}, Schritt ${a.bild.schritt}, beschriftet ${a.bild.beschriftet.join(',')}${a.bild.kreuze.length ? `, Kreuze ${a.bild.kreuze.map(k => k.name).join('')}` : ''}}` : '';
  const zahlen = a.zahlen ? ` {${a.zahlen.join(', ')}}` : '';
  console.log(`  ${pad(zl.id, 18)} ${kurz(a)}${bild}${zahlen} → ${M.anzeigen(a)}`.replace(/\u00a0/g, ' '));
  console.log(`  ${pad('', 18)} weg: ${a.weg.map(w => (typeof w === 'string' ? w : `[${w.mono.join(' / ')}]`)).join(' | ')}`.replace(/\u00a0/g, ' '));
}
if (ta) {
  console.log(`\nHinweis-Test ta-rechnung: Rechenarten ${ta.anteile}`);
  console.log(`  Signalwörter je Rechenart: ${ta.signal.join(' · ')}`);
}
const meld = [...MELD.values()].sort((x, y) => (x.art < y.art ? -1 : x.art > y.art ? 1 : x.typ < y.typ ? -1 : 1));
if (meld.length) {
  console.log('\nMeldungen (Anzahl, erstes Beispiel):');
  for (const m of meld) console.log(`  ${pad(m.art, 7)} ${pad(m.typ, 18)} ${m.pruefung} ×${fmt(m.n)}${m.beispiel ? `\n          ${String(m.beispiel).replace(/\u00a0/g, ' ').slice(0, 220)}` : ''}`);
}
const nFehler = meld.filter(m => m.art === 'FEHLER').reduce((s, m) => s + m.n, 0);
const nWarn = meld.filter(m => m.art === 'WARN').reduce((s, m) => s + m.n, 0);
console.log(`\n${NAMENS_CHECK}`);
console.log(`\n${nFehler ? `FEHLER: ${fmt(nFehler)}` : 'Keine FEHLER.'} WARN: ${fmt(nWarn)}. ${typen.length} Typen geprüft.`);
process.exit(nFehler ? 1 : 0);
