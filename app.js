/* Mathe Legends – Mathe-Trainer für die Schularbeit
   Vanilla JS, keine Abhängigkeiten. Fortschritt liegt in localStorage ('mathelegends.v1').
   Grundlage: auftraege/2026-11-16_mathe-app.md (Lernmodell Teil A in Abschnitt 3, Erlebnis in 4, Technik-Plan in 6).
   Gerüst aus Spell Legends (dl-v8) als Steinbruch: Datum, Speicher, Sicherung, Update, Mission-Kasten, Plan-Karte,
   Eltern-Verbindung. Neu: Aufgabentypen statt Karten (aufgaben.js), eigenes Ziffernfeld statt iPhone-Tastatur.
   Abschnitte: Konstanten · Lernmodell · Aufgaben laden · Datum · Speicher · Termin und Kalender · Lernlogik ·
   Tagesplan · Papier und Probe · Ziel-Karte · Ton · UI-Helfer · Screens · Runde · Ziffernfeld · Rundenende ·
   Sicherung · Lagebericht und Eltern-Verbindung · Aktionen · Konsole (ML) · Start */
(() => {
'use strict';

// ================================================================
// Konstanten: Name, Kürzel, Version
// APP_ID, STORE_KEY und CODE_PREFIX benennen das Fach. Daran hängen Fortschritt, Sicherung und Lagebericht – nie ändern.
// ================================================================
const APP_NAME = 'Mathe Legends';
const APP_ID = 'ml';                    // Legends HQ: Lagebericht und Sicherung (/^[a-z]{2,8}$/)
const STORE_KEY = 'mathelegends.v1';    // Speicher des Fortschritts – nie ändern
const CODE_PREFIX = 'ML1:';             // Sicherungs-Code (werkzeuge/lernstand.mjs)
const VERSION = 'ml-v2';                // wie VERSION in sw.js – immer beide zusammen hochzählen
const DAY_KEY = 'ml.dayOffset';         // sessionStorage: Zeitsprung zum Testen (ML.shiftDays)
const WEEKDAYS = ['Sonntag', 'Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag'];
const DAY_SHORT = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'];
const MONTHS = ['Jänner', 'Februar', 'März', 'April', 'Mai', 'Juni', 'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'];

// ================================================================
// Lernmodell. Alle Regeln hängen an diesen Zahlen.
// Teil A und Teil B: lernforschung, Lernauftrag Abschnitt 3 (16.11.2026, vorläufig, Etikett schwach); Entscheidungen
// der Projektleitung und OK der Eltern („ja so bauen mit 26“, 21:10) in Abschnitt 5.
// ================================================================
const MODELL = {
  stufen: ['neu', '⅓', '⅔', 'sicher'],     // Anzeige; ab sicherAb heißt jede Stufe „sicher“
  pausen: [0, 1, 1, 2, 7, 14, 30],          // Tage Pause nach Erreichen der Stufe (⅓ → morgen, ⅔ → nach 1 Tag, …)
  maxPause: 60,                              // höchste Stufe und wieder richtig (nach dem Test: 7, 14, 30, 60)
  sicherAb: 3,
  fehlerMinus: 1,                            // Fehler: eine Stufe zurück …
  minNachFehler: 1,                          // … nie unter ⅓
  zwillingNach: 3,                           // nach einem Fehler kommt nach 3 anderen Aufgaben ein Zwilling (nur Übung)
  fehlerJeTypMax: 2,                         // höchstens 2 Fehler je Typ und Runde; Zwilling auch falsch = Lücke
  // Lernschritt: Beispiel → 1. Schritt vorgegeben → zwei selbst in Folge; höchstens 6 Aufgaben. Papier-Typen (Prüfung
  // Runde 1): kurz, Beispiel mit Rechenweg und 1 Aufgabe mit vorgegebenem 1. Schritt. schaetzung = Aufgaben je
  // Lernschritt für die Minuten (Mittel aus der Simulation: 4–6)
  lernschritt: { max: 6, inFolge: 2, schaetzung: 5 },
  pack: 3,                                   // Auswahl < > = im Dreierpack, Aufstieg nur bei 3 von 3
  packFehlerAb: 1,                           // jeder falsche Teil im Dreierpack zählt als Fehler (bestätigt, Abschnitt 5)
  // Einstufung: 2 Aufgaben je Typ, mit Buch-Beleg 1 (Teil B); höchstens 12 Min., der Rest am nächsten Tag zuerst;
  // 2 Typen eines Themas auf 0 → die schwereren ohne Frage auf 0 (Teil A). Reihenfolge: schularbeit.js
  einstufung: { jeTyp: 2, mitBeleg: 1, maxSek: 12 * 60, nullen: 2 },
  // Neue Lernschritte (Teil B, Prüfung Runde 1): am Tag der Einstufung höchstens 2, danach höchstens 8 am Tag – beides nur,
  // soweit der Tagesdeckel reicht; was nicht passt, kommt am nächsten Tag. Der letzte Tag für Neues (Fr) ist Überlauf: alle
  // übrigen, dafür werden ② und Extra kleiner. Sa/So keine neuen, nur Lücken. (Die 40-%-Grenze aus Teil A bestimmt nur die
  // Verteilung in der Runde.)
  lernschritte: { ersterTag: 2, folgetag: 8 },
  geblocktMax: 0.4,
  // Tagesdeckel (Projektleitung 16.11., Prüfung Runde 1): geschätzte Minuten aus Einstufungsrest, Lernschritten, Fälligen,
  // ② und Extra höchstens 30 (Rahmen der Eltern)
  deckelMin: 30,
  kalender: { neuLetzter: -3, extraAb: -3, pruefTag: -2, lueckenTag: -1 },   // relativ zum Testtag: neue Lernschritte bis
                                                                        // Fr (Überlauf), Extra ab Fr, Sa prüft alle (Probe),
                                                                        // So nur Lücken und Probe-Fehler
  testtagMax: 10,                            // Testtag: freiwillig höchstens 10 Aufgaben aus den Fehlern vom Vortag
  papierMaxSek: 12 * 60,                     // ② höchstens 12 Min. im Heft (beim ersten Kontakt mit sekNeu geschätzt)
  papierJeTag: 3,                            // Do/Fr: 3 fällige Rechnungen (niedrigste Stufe zuerst) und 1 Textaufgabe
  extraMaxSek: 5 * 60,                       // Extra-Typen ab Fr höchstens 5 Min. in der Runde; zählen nie für BEREIT
  // Sekunden je Aufgabe, wenn der Typ keine eigene Angabe hat (aufgaben.js → sek); für „ca. N Min.“ und die Grenzen
  // eintippen = ② oder Probe: ein Ergebnis aus dem Heft eintippen (zählt beim Tagesdeckel, nicht in „ca. N Min.“ von ②)
  sek: { aufgabe: 20, pack: 18, lernschritt: 40, beispiel: 30, papier: 90, eintippen: 15 },
  // BEREIT (Teil B, Linie A): je Thema Füllstand (Mittel der Stufen) mindestens ⅔, kein Typ mehr neu, jeder Typ schon
  // gemischt geprüft. BEREIT = alle Themen über der Linie. Der Stempel BEREIT erst ab Sa-Abend, vorher FAST BEREIT.
  ziellinie: 2 / 3,
  stempelAbStunde: 18,                       // „Sa-Abend“: ab 18 Uhr – oder sobald die Probe eingetippt ist
  // ---- Ampel in Legends HQ (Teil B; Minuten-Schwellen 30/35: Eltern ok, 16.11.) ----
  ampel: {
    pausen: [0, 1, 1, 2, 7, 14, 30], maxStufe: 6, maxPause: 60, sicherAb: 3, fehlerMinus: 1, neuProTag: 0,
    vorlauf: 3, wdhLimit: 0, paket: 1, sekNeu: 150, sekWdh: 40, sekFehler: 40,
    vorwissen: 0, minGelb: 30, minRot: 35
  }
};
const MAX_STUFE = MODELL.pausen.length - 1;

// Gemeinsame Bausteine von Legends HQ (legends-status.js, legends-sync.js). Fehlen sie, z. B. nach einem halben
// Update ohne Netz, läuft die App trotzdem – nur ohne Plan-Karte und Eltern-Verbindung.
const STATUS = window.LegendsStatus || null;
const SYNC = window.LegendsSync || null;
if (SYNC) SYNC.configure({ app: APP_ID });

const $ = s => document.querySelector(s);
const app = $('#app');

// ================================================================
// Aufgaben laden (aufgaben.js: Vertrag im Dateikopf; schularbeit.js: Termin, Ziel, Papier, Probe)
// Fehlerhafte Einträge fallen weg und stehen in der Konsole (ML.daten()) – die App startet trotzdem.
// ================================================================
function isDay(x) { return typeof x === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(x); }
function cmp(a, b) { return a < b ? -1 : a > b ? 1 : 0; }
const MATHE = window.MATHE || null;
const SA = window.SCHULARBEIT || null;
const DATEN_FEHLER = [];
const TYPEN = [];
const TYP = Object.create(null);
for (const t of (MATHE && Array.isArray(MATHE.typen) ? MATHE.typen : [])) {
  if (!t || typeof t.id !== 'string' || typeof t.erzeuge !== 'function') { DATEN_FEHLER.push('Typ ohne id oder erzeuge()'); continue; }
  if (TYP[t.id]) { DATEN_FEHLER.push('doppelte id: ' + t.id); continue; }
  TYP[t.id] = t;
  TYPEN.push(t);
}
const THEMEN = (MATHE && Array.isArray(MATHE.themen) ? MATHE.themen : []).filter(x => x && x.id);
const THEMA = Object.fromEntries(THEMEN.map((x, i) => [x.id, { ...x, index: i }]));
const BEREICHE = (MATHE && Array.isArray(MATHE.bereiche) ? MATHE.bereiche : []).filter(x => x && x.id);
for (const t of TYPEN) if (!THEMA[t.thema]) DATEN_FEHLER.push(`${t.id}: unbekanntes Thema „${t.thema}“`);
const TEST = SA && isDay(SA.datum) ? SA : null;   // offizieller Termin (vor load: upgrade braucht ihn)
// Kann die App diesen Typ zeigen? Eine Probe-Aufgabe (Seed 1) muss ein gebautes Antwortformat und höchstens ein
// gebautes Bild haben. Sonst bleibt der Typ auf Papier (Kürzungsregel: z. B. Zahlenstrahl ohne Grafik) – nie hängen.
const EINGABEN = ['zahl', 'rest', 'term', 'kuerzel', 'liste', 'felder', 'vergleich', 'ordnen', 'strahl'];
const BILDER = ['strahl'];
const ZEIGBAR = Object.create(null);
const NUR_PAPIER = [];   // Typen, deren Format die App (noch) nicht zeigt – kein Datenfehler, nur auf Papier
function zeigbar(id) {
  if (id in ZEIGBAR) return ZEIGBAR[id];
  let ok = false;
  try {
    const a = TYP[id].erzeuge(MATHE.zufall(1), { zweck: 'runde' });
    ok = !!a && EINGABEN.includes(a.eingabe || 'zahl') && (!a.bild || BILDER.includes(a.bild.art));
    if (!ok) NUR_PAPIER.push(id);
  } catch (e) { DATEN_FEHLER.push(`${id}: Generator wirft (${e && e.message})`); }
  return (ZEIGBAR[id] = ok);
}
// Ziel = Kern-Typen dieser Schularbeit (ohne schularbeit.js: alle). Extra = geübt, zählt nie für BEREIT.
function idsAus(liste, wo) {
  return (Array.isArray(liste) ? liste : []).filter((id, i, l) => {
    if (!TYP[id]) { DATEN_FEHLER.push(`schularbeit.js (${wo}): unbekannter Typ ${id}`); return false; }
    return l.indexOf(id) === i && (TYP[id].wo === 'papier' || zeigbar(id));
  });
}
const ZIEL = idsAus(SA && Array.isArray(SA.typen) ? SA.typen : TYPEN.map(t => t.id), 'typen');
const ZIEL_SET = new Set(ZIEL);
const EXTRA = idsAus(SA && SA.extra, 'extra').filter(id => !ZIEL_SET.has(id) && TYP[id].wo !== 'papier');
const EXTRA_SET = new Set(EXTRA);
function istPapierTyp(id) { return !!TYP[id] && TYP[id].wo === 'papier'; }
const ZIEL_APP = ZIEL.filter(id => !istPapierTyp(id));     // kommen in der Runde dran
const ZIEL_PAPIER = ZIEL.filter(istPapierTyp);             // Ergebnis kommt aus ② oder der Probe
const PLAN_START = SA && isDay(SA.start) ? SA.start : '';
const EINST = (SA && SA.einstufung) || {};
const BELEG = new Set(Array.isArray(EINST.beleg) ? EINST.beleg : []);   // Buch-Beleg: 1 Aufgabe, Papier 1 von 1 → ⅔
const EINST_FOLGE = Array.isArray(EINST.reihenfolge) ? EINST.reihenfolge : [];
const LERN_FOLGE = SA && Array.isArray(SA.lernFolge) ? SA.lernFolge : [];
const PAP = (SA && SA.papier) || {};
const PAPIER_TEXT = new Set(Array.isArray(PAP.text) ? PAP.text : []);
const PAPIER_SPAETER = new Set(Array.isArray(PAP.spaeter) ? PAP.spaeter : []);   // in ② erst ab dem Tag nach der Einstufung
// ② nimmt nur Typen mit wo: 'papier' – steht ein anderer in der Liste, käme er still nie ins Heft. Darum melden.
for (const id of [...(Array.isArray(PAP.rechnungen) ? PAP.rechnungen : []), ...PAPIER_TEXT]) {
  if (TYP[id] && TYP[id].wo !== 'papier') DATEN_FEHLER.push(`schularbeit.js (papier): ${id} ist nicht wo: 'papier'`);
}
const PROBE = SA && SA.probe && SA.probe.id && Array.isArray(SA.probe.aufgaben) && SA.probe.aufgaben.length ? SA.probe : null;
if (PROBE) for (const a of PROBE.aufgaben) if (!TYP[a.typ]) DATEN_FEHLER.push(`Probe ${a.nr}: unbekannter Typ ${a.typ}`);
const PROBE_TYPEN = new Set(PROBE ? PROBE.aufgaben.map(a => a.typ) : []);
if (!MATHE) DATEN_FEHLER.push('aufgaben.js fehlt');
if (DATEN_FEHLER.length) console.warn('Mathe Legends, Daten:', DATEN_FEHLER);
function themaIndex(id) { const t = TYP[id]; return t && THEMA[t.thema] ? THEMA[t.thema].index : 99; }
function typTitel(id) { return TYP[id] ? TYP[id].titel : id; }
// Sekunden je Aufgabe: Angabe des Typs (aufgaben.js → sek), sonst Standard je Ort
function sekVon(id) {
  const t = TYP[id];
  if (t && Number(t.sek) > 0) return Number(t.sek);
  return t && t.wo === 'papier' ? MODELL.sek.papier : t && t.auswahl ? MODELL.pack * MODELL.sek.pack : MODELL.sek.aufgabe;
}
// Sekunden für die Anzeige „ca. N Min.“: Beim ersten Kontakt (Typ noch nie gesehen: Einstufung, erstes ②, erstes Extra)
// gilt sekNeu aus aufgaben.js, damit die Minuten ehrlich sind. Die Regeln (12-Minuten-Grenzen, Lernschritte, Extra)
// rechnen weiter mit sekVon, so wie Teil B sie simuliert hat.
function sekAnzeige(id) {
  const t = TYP[id];
  return t && !S.f[id] && Number(t.sekNeu) > 0 ? Number(t.sekNeu) : sekVon(id);
}
const F = MATHE ? MATHE.format : (n => String(n));

// ================================================================
// Datum (lokale Tage, keine Uhrzeiten)
// ================================================================
let dayOffset = 0;   // nur zum Testen: sessionStorage 'ml.dayOffset'
try { dayOffset = parseInt(sessionStorage.getItem(DAY_KEY) || '0', 10) || 0; } catch (e) { /* egal */ }

function fmt(d) {
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
}
function today() { return fmt(new Date(Date.now() + dayOffset * 864e5)); }
function addDays(ds, n) {
  const [y, m, d] = ds.split('-').map(Number);
  return fmt(new Date(y, m - 1, d + n, 12));
}
function daysBetween(a, b) {
  const [y1, m1, d1] = a.split('-').map(Number);
  const [y2, m2, d2] = b.split('-').map(Number);
  return Math.round((Date.UTC(y2, m2 - 1, d2) - Date.UTC(y1, m1 - 1, d1)) / 864e5);
}
function weekdayOf(ds) { const [y, m, d] = ds.split('-').map(Number); return new Date(y, m - 1, d, 12).getDay(); }
function dateLabel(ds) { const [, m, d] = ds.split('-').map(Number); return `${WEEKDAYS[weekdayOf(ds)]}, ${d}. ${MONTHS[m - 1]}`; }
function dateShort(ds) { const [, m, d] = ds.split('-').map(Number); return `${DAY_SHORT[weekdayOf(ds)]}, ${d}.${m}.`; }
function clock() {
  const d = new Date();
  return String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0');
}

// ================================================================
// Speicher
// f = Aufgabentypen: id → { lv, due, last, ok, bad, since } (Stufe 0–6, fällig am, zuletzt gezählt, richtig, falsch,
//     erster Kontakt), dazu nur wenn nötig:
//     c  Einstufung: richtig (von 2, mit Buch-Beleg von 1) · cx 1 = ohne Frage auf 0 (zwei leichtere Typen auf 0)
//     g  Tag der ersten gemischten Prüfung nach dem ersten Kontakt (Linie A: „jeder Typ gemischt geprüft“)
//     fz Tag des letzten Fehlers (So: Wackler seit Sa; Testtag: Fehler vom Vortag)
//     ns So-Nachsicht offen: Fehler am So, Zwilling bzw. 2. Versuch steht noch aus (stimmt er, kein Zurückstufen)
//     lk Lücke seit (Zwilling auch falsch) – offen bis zum geschafften Lernschritt
//     ls Tag des letzten Lernschritts · lsN wie oft „morgen mit Hilfe“ · fa { Fehlerart: Anzahl }
//     Extra-Typen (schularbeit.js → extra) stehen hier genauso; sie zählen nie für Ziel und BEREIT.
// papier = Papier-Blätter: 'p-JJJJ-MM-TT' (② des Tages) und die Probe (SCHULARBEIT.probe.id):
//     { tag, items: [Aufgabe + nr], erg: { nr: { v Versuche, w Antwort, ok, ok2, ns } }, fertig, start, ende }
// day = heute: ls (Lernschritte beendet), lsQuote (neue Lernschritte des Tages, einmal festgelegt), estop (Einstufung für heute
//     beendet: 12 Minuten erreicht), esek (Sekunden Einstufung heute), en (Aufgaben der Einstufung heute: zählen bei
//     der 40-%-Grenze als nicht geblockt), r (Antworten in einer Runde heute: Ist die Runde leer und r 0, zeigt die
//     Mission nur ②), xSek (Platz für Extra im Tagesdeckel, einmal festgelegt)
// ui.start = Tag des ersten Starts (test.seit) · ui.e1 = Tag, an dem die Einstufung begann · ui.bereit / ui.perfekt
// log = Tagesprotokoll für Plan-Karte und Lagebericht { 'JJJJ-MM-TT': { a, r, n, s, f, o, k } }, höchstens 90 Tage
// plaene = eingefrorener Plan je Termin (LegendsStatus.bericht, erst nach der Einstufung)
// ================================================================
function fresh() {
  return {
    v: 1,
    settings: { name: '', testDate: '', testSince: '', sfx: true },
    f: {},
    papier: {},
    stats: { answers: 0, right: 0, sessions: 0, lastDay: '', streak: 0, best: 0 },
    day: { date: '', ls: 0, lsQuote: -1, estop: 0, esek: 0, en: 0, r: 0, xSek: -1 },
    ui: { hideInstall: false, onboarded: false, start: '', e1: '', bereit: '', perfekt: '', neues: '' },
    log: {},
    plaene: {}
  };
}
// Jedes Feld einzeln aufzählen – was hier fehlt, ist beim nächsten Start weg
function upgrade(s) {
  const d = fresh();
  const obj = x => (x && typeof x === 'object' && !Array.isArray(x) ? x : {});
  const out = {
    v: 1,
    settings: { ...d.settings, ...obj(s.settings) },
    f: obj(s.f),
    papier: obj(s.papier),
    stats: { ...d.stats, ...obj(s.stats) },
    day: { ...d.day, ...obj(s.day) },
    ui: { ...d.ui, ...obj(s.ui) },
    log: obj(s.log),
    plaene: obj(s.plaene)
  };
  // Ein vergangener oder offizieller Termin ist kein eigener Termin mehr
  const t = out.settings.testDate;
  if (t && (!isDay(t) || t < today() || (TEST && t === TEST.datum))) { out.settings.testDate = ''; out.settings.testSince = ''; }
  return out;
}
function load() {
  let raw = null;
  try {
    raw = localStorage.getItem(STORE_KEY);
    if (raw) return upgrade(JSON.parse(raw));
  } catch (e) {
    // Frisch starten – aber den unlesbaren Stand vorher beiseitelegen, sonst überschreibt ihn das nächste save()
    try { if (raw) localStorage.setItem(STORE_KEY + '.kaputt', raw); } catch (e2) { /* egal */ }
  }
  return fresh();
}
let S = load();
if (!S.ui.start) S.ui.start = today();   // erster Start: test.seit (Plan ab dann, nie ab einem Tag ohne App)
if (STATUS) STATUS.kuerzen(S.log, today());   // Protokoll: höchstens 90 Tage
papierAufraeumen();
let saveWarned = false;
let saveCount = 0;   // zählt jede Änderung – Plan-Karte und Lagebericht rechnen nur neu, wenn sich etwas getan hat
function save() {
  saveCount++;
  try { localStorage.setItem(STORE_KEY, JSON.stringify(S)); }
  catch (e) {
    if (!saveWarned) { saveWarned = true; toast('Speichern klappt gerade nicht. Ist privates Surfen an?'); }
  }
}
// Alte ②-Blätter nach 60 Tagen weg (die Stufen stehen in S.f); die Probe bleibt
function papierAufraeumen() {
  const grenze = addDays(today(), -60);
  for (const [id, b] of Object.entries(S.papier)) if (/^p-\d{4}-\d{2}-\d{2}$/.test(id) && b && b.tag < grenze) delete S.papier[id];
}

// ---------- Tagesprotokoll (S.log) ----------
// Jede Aufgabe zählt ihre Sekunden genau einmal: vom Anzeigen bis zur Antwort (legends-status.js nimmt höchstens 60).
let taskStart = 0;
function taskSec() {
  const now = Date.now();
  const s = taskStart ? (now - taskStart) / 1000 : 0;
  taskStart = now;
  return s;
}
// Erste Versuche bei fälligen Typen (zählen in quote7) · neu (Einstufung, Lernschritt: nicht in quote7) · nur Zeit
function logAnswer(right, s) { if (STATUS) STATUS.zaehleAntwort(S.log, today(), right, s); S.stats.answers++; if (right) S.stats.right++; }
function logNew(s) { if (STATUS) STATUS.zaehleNeu(S.log, today(), s); }
function logTime(s) { if (STATUS) STATUS.zaehleZeit(S.log, today(), s); }
function heuteSek() { const e = S.log[today()]; return e && e.s ? e.s : 0; }

// ================================================================
// Termin und Kalender
// Der offizielle Termin steht in schularbeit.js und geht immer vor – das Kind kann ihn nicht verschieben. Einen
// eigenen Termin gibt es nur, wenn kein offizieller ansteht.
// Kalender (Lernmodell Teil A und B, Prüfung Runde 1): neue Lernschritte Mi–Fr (Fr ist Überlauf), Extra ab Fr,
// am Sa die Probe (pruef: jeder Typ wird geprüft), am So nur Lücken und Probe-Fehler (luecken), am Testtag keine
// Mission. Dazwischen „lernen“, ohne Termin „frei“.
// ================================================================
function officialTest() { return TEST && TEST.datum >= today() ? TEST.datum : ''; }
function ownTest() {
  const t = S.settings.testDate;
  return !officialTest() && isDay(t) && t >= today() ? t : '';
}
function testDate() { return officialTest() || ownTest(); }
function testIn() { const t = testDate(); return t ? daysBetween(today(), t) : null; }
function kalTag(off) { const t = testDate(); return t ? addDays(t, off) : ''; }
function pruefTag() { return kalTag(MODELL.kalender.pruefTag); }
// Tag der Generalprobe für Texte: „heute“ oder „am Samstag“ (bei einer Schularbeit am Montag)
function probeTagText() { const p = pruefTag(); return !p ? 'vor der Schularbeit' : p === today() ? 'heute' : `am ${WEEKDAYS[weekdayOf(p)]}`; }
function phase() {
  const d = testIn();
  if (d == null || d < 0) return 'frei';
  if (d === 0) return 'testtag';
  if (d <= -MODELL.kalender.lueckenTag) return 'luecken';
  if (d <= -MODELL.kalender.pruefTag) return 'pruef';
  return 'lernen';
}
function ruhePhase() { const p = phase(); return p === 'pruef' || p === 'luecken'; }
// Für den Lagebericht: { datum, titel, quelle, seit }. seit = der spätere von erstem Übungstag und erstem Start der App:
// Rutscht die Installation, rechnete der eingefrorene Plan sonst mit Übungstagen, die es nie gab (Technik-Plan).
function nextTest() {
  const off = officialTest();
  if (off) {
    const t = { datum: off, titel: TEST.titel || 'Mathe-Schularbeit', quelle: 'eltern' };
    const seit = [PLAN_START, S.ui.start].filter(isDay).sort().pop();
    if (seit && seit < off) t.seit = seit;
    return t;
  }
  const own = ownTest();
  if (!own) return null;
  const t = { datum: own, titel: 'Mathe-Test', quelle: 'selbst' };   // kein Name im Bericht
  if (isDay(S.settings.testSince)) t.seit = S.settings.testSince;
  return t;
}
// Früher Start (wie Spell dl-v4): Tage vor dem ersten Übungstag zählen nie als ausgelassen; wer dort schon geübt hat,
// hat seinen Tag geschafft. Welcher Tag „vor dem Start“ war, merkt sich der Tag selbst (vs = 1). Läuft vor jedem Bericht.
function vorStartTage() {
  const t = today();
  for (const [d, x] of Object.entries(S.log)) {
    if (d >= t || !x || typeof x !== 'object' || x.vs !== 1) continue;
    x.o = 0;
    if ((x.a || 0) + (x.n || 0) > 0) x.f = 1;
  }
  if (STATUS && PLAN_START && t < PLAN_START) STATUS.eintrag(S.log, t).vs = 1;
}

// ================================================================
// Lernlogik (Lernmodell Teil A)
// Stufen je Typ: 0 neu → 1 ⅓ → 2 ⅔ → 3 sicher (→ 4–6 nach dem Test). Aufstieg nur durch den ersten Versuch des Tages in
// der gemischten Runde, ohne Hilfe. Einstufung, Lernschritt, Hilfe und Zwilling heben nie darüber hinaus.
// ================================================================
function sicher(id) { const s = S.f[id]; return !!s && s.lv >= MODELL.sicherAb; }
function pausenTage(lv) { return MODELL.pausen[Math.min(lv, MAX_STUFE)] || 1; }
// Fällig heute (nur Typen ab ⅓; Stufe 0 braucht einen Lernschritt, keine Wiederholung)
function istFaellig(id) {
  const s = S.f[id], t = today();
  // Offene Lücke: nie gemischt, bis der Lernschritt geschafft ist (sonst käme sie nach einem nicht geschafften
  // Lernschritt am selben Tag noch einmal und öffnete ① wieder)
  if (!s || s.lv < 1 || s.last === t || s.lk) return false;
  const ph = phase();
  // Sa: jeder Typ wird geprüft – was in der Probe vorkommt, prüft die Probe (Entscheidung Abschnitt 5); die Runde
  // fragt nur den Rest. So kann das Kind nicht vor der Probe in eine Runde mit allen Typen (ca. 60 Min.) geraten.
  if (ph === 'pruef') return !PROBE_TYPEN.has(id);
  if (ph === 'luecken') return (s.fz || '') >= pruefTag() || s.last < pruefTag();   // So: Wackler seit Sa, Ungeprüftes
  if (ph === 'testtag') return false;                                     // Testtag: keine Pflicht
  return effDue(id) <= t;
}
// Fälligkeit, wie sie gilt (Plan-Karte, Lagebericht): Mi–Fr spätestens am Prüftag; ab Sa Ruhe bis nach dem Test,
// außer Wacklern und Ungeprüftem
function effDue(id) {
  const s = S.f[id], t = today(), ph = phase();
  if (!s) return '';
  if (ph === 'lernen') { const p = pruefTag(); return s.due > p ? p : s.due; }
  if (ph === 'pruef') return s.last === t ? s.due : t;
  if (ph === 'luecken') return ((s.fz || '') >= pruefTag() || s.last < pruefTag()) && s.last !== t ? t : s.due;
  return s.due;
}
// Die wackeligsten zuerst: niedrigste Stufe, dann am längsten fällig
function urgency(a, b) { return (S.f[a].lv - S.f[b].lv) || cmp(effDue(a), effDue(b)) || (themaIndex(a) - themaIndex(b)); }

// Erster Versuch des Tages in der gemischten Runde (oder ein Papier-Ergebnis, das wie eine App-Aufgabe zählt).
// Setzt g: Der Typ ist nach dem ersten Kontakt gemischt geprüft (Linie A).
function review(id, ok) {
  const s = S.f[id], t = today(), from = s.lv;
  if (!s.g) s.g = t;
  if (ok) {
    s.lv = Math.min(MAX_STUFE, from + 1);   // nur ab ⅓ (Stufe 0 braucht den Lernschritt, kommt hier nie an)
    s.due = addDays(t, from >= MAX_STUFE ? MODELL.maxPause : pausenTage(s.lv));
    // Ab Sa geprüft: Ruhe bis nach dem Test
    if (ruhePhase()) { const nach = addDays(testDate(), 1); if (s.due < nach) s.due = nach; }
    s.ok = (s.ok || 0) + 1;
  } else {
    s.lv = Math.max(MODELL.minNachFehler, from - MODELL.fehlerMinus);
    s.due = addDays(t, 1);
    s.fz = t;
    s.bad = (s.bad || 0) + 1;
  }
  s.last = t;
  return { from, to: s.lv };
}
// Einstufung: 2 von 2 → ⅔ (fällig nach 1 Tag) · 1 von 2 → ⅓ (fällig morgen) · 0 → Stufe 0, Lernschritt nach Plan.
// Papier 1 von 1 → ⅓. Mit Buch-Beleg (schularbeit.js → einstufung.beleg; 1 Aufgabe, Teil B): richtig → ⅔, falsch → ⅓
// (der Beleg spricht gegen einen ganzen Lernschritt – zu bestätigen, Bericht technik).
// auto = ohne Frage auf 0 (zwei leichtere Typen des Themas auf 0).
function einstufen(id, richtig, { gefragt = MODELL.einstufung.jeTyp, auto = false } = {}) {
  const t = today();
  const beleg = BELEG.has(id) && !auto;
  const lv = beleg ? (richtig >= 1 ? 2 : 1) : gefragt === 1 ? (richtig ? 1 : 0) : Math.max(0, Math.min(2, richtig | 0));
  const s = { lv, due: lv ? addDays(t, pausenTage(lv)) : t, last: t, ok: Math.min(gefragt, richtig | 0), bad: auto ? 0 : Math.max(0, gefragt - (richtig | 0)), since: t, c: richtig | 0 };
  if (auto) s.cx = 1;
  if (!lv) s.fz = t;
  S.f[id] = s;
  return s;
}
function einstufungFragen(id) { return BELEG.has(id) ? MODELL.einstufung.mitBeleg : MODELL.einstufung.jeTyp; }
// So-Nachsicht (Teil B): Ein Fehler am So stuft nicht zurück, wenn Zwilling bzw. 2. Versuch stimmen. Bis dahin steht
// er in s.ns. Stimmt der Zwilling, fällt ns weg; ist er falsch – oder kommt er nicht mehr –, gilt der Fehler.
function nachsichtFehler(id) {
  const s = S.f[id];
  if (!s || !s.ns) return null;
  delete s.ns;
  const from = s.lv;
  s.lv = Math.max(MODELL.minNachFehler, from - MODELL.fehlerMinus);
  s.due = addDays(today(), 1);
  s.bad = (s.bad || 0) + 1;
  return { from, to: s.lv };
}
// Neuer Tag: offene Nachsicht von gestern gilt als Fehler (der Zwilling kam nicht mehr). Ab dem Testtag stuft nichts mehr
// zurück (Prüfung Runde 1, H5): Eine offene So-Nachsicht verfällt dann ohne Folgen, BEREIT vom So-Abend bleibt.
function nachsichtAufraeumen() {
  const t = today();
  const ohneFolgen = ns => phase() === 'testtag' || (!!TEST && ns < TEST.datum && t >= TEST.datum);
  for (const [id, s] of Object.entries(S.f)) {
    if (s && s.ns && s.ns < t) { if (ohneFolgen(s.ns)) delete s.ns; else nachsichtFehler(id); }
  }
}
function fehlerart(id, art) {
  if (!art || !S.f[id]) return;
  const fa = S.f[id].fa || (S.f[id].fa = {});
  fa[art] = (fa[art] || 0) + 1;
}
// Lernschritt geschafft: ⅓, fällig morgen, die Lücke ist zu
function lernschrittGeschafft(id) {
  const s = S.f[id], t = today();
  s.lv = Math.max(1, s.lv);
  s.due = addDays(t, 1);
  s.ls = t;
  s.last = t;
  delete s.lk;
}
// Nach 6 Aufgaben nicht zwei in Folge: morgen mit Hilfe weiter
function lernschrittMorgen(id) {
  const s = S.f[id];
  s.ls = today();
  s.lsN = (s.lsN || 0) + 1;
}

// Serie: nur intern (lernstand.mjs), nie in der App gezeigt (Erlebnis: keine Serien)
function markDay() {
  const t = today();
  if (S.stats.lastDay === t) return;
  S.stats.streak = S.stats.lastDay && daysBetween(S.stats.lastDay, t) === 1 ? S.stats.streak + 1 : 1;
  S.stats.best = Math.max(S.stats.best, S.stats.streak);
  S.stats.lastDay = t;
}

// ================================================================
// Tagesplan (Teil B): ① Einstufung (was noch nie dran war) · Lernschritte (Stufe 0 und Lücken) · Wiederholungen
// (fällig, gemischt) · ab Fr Extra bis 5 Min. am Ende der Runde (gehört nicht zur Mission, zählt nie für BEREIT).
// ② Papier und die Probe stehen im nächsten Abschnitt.
// ================================================================
function tagFrisch() {
  if (S.day.date === today()) return;
  S.day = { ...fresh().day, date: today() };
  nachsichtAufraeumen();
}
// Schätzung je Lernschritt: Beispiel + ca. 5 Aufgaben, je Aufgabe die Sekunden des Typs (mindestens die eines
// Lernschritts). Papier-Typ: kurz, Beispiel + 1 Aufgabe (erster richtiger Versuch: sekNeu).
function lsSek(id) {
  if (istPapierTyp(id)) return MODELL.sek.beispiel + (Number(TYP[id].sekNeu) || sekVon(id));
  return MODELL.sek.beispiel + MODELL.lernschritt.schaetzung * Math.max(MODELL.sek.lernschritt, sekVon(id));
}
const LS_TYPISCH = MODELL.sek.beispiel + MODELL.lernschritt.schaetzung * MODELL.sek.lernschritt;   // Vorschau vor der Einstufung
const DECKEL = MODELL.deckelMin * 60;
function folgeIndex(liste, id) { const i = liste.indexOf(id); return i < 0 ? 999 : i; }
// Einstufung: Reihenfolge aus schularbeit.js (Teil B: zum Aufwärmen zs-ablesen und rs-runden, dann Stellenwert, …,
// zuletzt die vier mul-kopf); Typen ohne Platz dort danach, je Thema von leicht nach schwer
function einstufungsFolge(a, b) {
  return (folgeIndex(EINST_FOLGE, a) - folgeIndex(EINST_FOLGE, b)) || (themaIndex(a) - themaIndex(b))
    || ((TYP[a].rang || 0) - (TYP[b].rang || 0)) || cmp(a, b);
}
function tiefe(id, seen = new Set()) {
  if (seen.has(id)) return 0;
  seen.add(id);
  const v = ((TYP[id] && TYP[id].voraus) || []).filter(x => TYP[x]);
  return v.length ? 1 + Math.max(0, ...v.map(x => tiefe(x, seen))) : 0;
}
// Lernschritte: Reihenfolge aus schularbeit.js (Teil B: Mi vb-regeln und ta-rechnung), sonst Voraussetzung, dann Gewicht
function lernFolge(a, b) {
  return (folgeIndex(LERN_FOLGE, a) - folgeIndex(LERN_FOLGE, b)) || (tiefe(a) - tiefe(b))
    || ((TYP[b].gewicht || 1) - (TYP[a].gewicht || 1)) || einstufungsFolge(a, b);
}
function einstufungOffen() {
  if (phase() === 'testtag' || (S.day.date === today() && S.day.estop)) return [];
  return ZIEL_APP.filter(id => !S.f[id]).sort(einstufungsFolge);
}
// ================================================================
// Tagesdeckel (Prüfung Runde 1, B1; Projektleitung 16.11.): Einstufungsrest + Lernschritte + Fällige + ② + Extra höchstens
// 30 Min., geschätzt wie in der Anzeige (erster Kontakt sekNeu, Lernschritt Beispiel + ca. 5 Aufgaben, Papier-Typ kurz,
// ② mit Eintippen). Was nicht passt, rutscht auf den nächsten Tag – zuerst neue Lernschritte, dann Extra. Einstufung
// (höchstens 12 Min.), Lücken, Fällige und ② bleiben. Am letzten Tag für Neues (Fr, Überlauf) gilt die Obergrenze 8
// nicht, und ② und Extra werden zuerst kleiner; was auch dann nicht passt, bleibt neu (die Probe am Sa kann es auf ⅓
// heben). Sa/So keine neuen Lernschritte, nur Lücken.
// Die Mengen werden einmal am Tag festgelegt (S.day.lsQuote, S.day.xSek): Wer die Runde neu startet, bekommt nicht
// noch einmal neue.
// ================================================================
function istLetzterNeuTag() { const k = kalTag(MODELL.kalender.neuLetzter); return !!k && today() >= k; }
function istEinstufungsTag() { return !S.ui.e1 || S.ui.e1 === today(); }
// Kandidaten: offene Lücken (Mi–Fr ab dem Tag nach dem Fund, Sa/So gleich) und Typen auf Stufe 0 (nicht an Sa/So)
function lsKandidaten() {
  const t = today(), ph = phase();
  const heuteVersucht = id => S.f[id].ls === t;
  const luecken = ZIEL.filter(id => { const s = S.f[id]; return s && s.lk && !heuteVersucht(id) && (s.lk < t || ruhePhase()); });
  const neu = ruhePhase() || ph === 'testtag' ? []
    : ZIEL.filter(id => { const s = S.f[id]; return s && s.lv === 0 && !s.lk && !heuteVersucht(id); }).sort(lernFolge);
  return { luecken, neu };
}
function sekSumme(ids, f) { return ids.reduce((a, id) => a + f(id), 0); }
function einstRestSek(einst) {
  const rest = Math.max(0, MODELL.einstufung.maxSek - (S.day.date === today() ? S.day.esek : 0));
  return Math.min(rest, sekSumme(einst, id => einstufungFragen(id) * sekAnzeige(id)));
}
// Wie viele neue Lernschritte heute (ohne Lücken). basisSek = Gemachtes und alles andere, was heute noch ansteht.
function lsMenge(neu, luecken, basisSek) {
  const ph = phase(), L = MODELL.lernschritte;
  if (ph === 'frei') return Math.min(L.ersterTag, neu.length);
  if (ph !== 'lernen') return 0;
  // Fr (letzter Tag für Neues, Überlauf): keine Obergrenze 8, aber auch hier der Deckel – ② wird dafür vorher kleiner
  // (papierTypenHeute rechnet am Fr mit allen übrigen Lernschritten)
  const max = istLetzterNeuTag() ? neu.length : Math.min(istEinstufungsTag() ? L.ersterTag : L.folgetag, neu.length);
  let frei = DECKEL - basisSek - sekSumme(luecken, lsSek), q = 0;
  for (const id of neu.slice(0, max)) { if (lsSek(id) > frei) break; q++; frei -= lsSek(id); }
  return q;
}
function lernschritteHeute(basisSek = 0) {
  tagFrisch();
  if (phase() === 'testtag') return [];
  const { luecken, neu } = lsKandidaten();
  if (S.day.lsQuote < 0) S.day.lsQuote = lsMenge(neu, luecken, basisSek);
  return [...luecken, ...neu.slice(0, Math.max(0, S.day.lsQuote - S.day.ls))];
}
// Was heute außer ② und Extra noch ansteht oder schon gemacht ist (für den Überlauf-Tag): Gemachtes, Einstufungsrest,
// Lernschritte (solange die Menge nicht festgelegt ist: alle übrigen – dann bleibt ② klein), Fällige
function andereSekHeute() {
  const { luecken, neu } = lsKandidaten();
  const ls = [...luecken, ...neu.slice(0, S.day.lsQuote >= 0 ? Math.max(0, S.day.lsQuote - S.day.ls) : neu.length)];
  const wdh = ZIEL_APP.filter(id => istFaellig(id) && !ls.includes(id));
  return heuteSek() + einstRestSek(einstufungOffen()) + sekSumme(ls, lsSek) + sekSumme(wdh, sekVon);
}
// ② von heute für den Tagesdeckel: Heft (wie angezeigt) und Eintippen
function papierHeuteSek() {
  const pi = papierInfo();
  return pi && pi.art === 'papier' ? pi.sek + MODELL.sek.eintippen * pi.n : 0;
}
// Extra (schularbeit.js → extra): ab Fr am Ende der Runde, zuerst Neues, dann Fälliges – höchstens 5 Min. und nur, was im
// Tagesdeckel noch Platz hat (einmal am Tag festgelegt). restSek = Platz im Deckel.
function extraHeute(restSek = MODELL.extraMaxSek) {
  const t = today(), ph = phase();
  if (!EXTRA.length || ph !== 'lernen' || t < kalTag(MODELL.kalender.extraAb)) return [];
  if (S.day.xSek < 0) S.day.xSek = Math.max(0, Math.min(MODELL.extraMaxSek, restSek));
  const kandidaten = [...EXTRA.filter(id => !S.f[id]), ...EXTRA.filter(id => S.f[id] && istFaellig(id)).sort(urgency)];
  const out = [];
  let sek = 0;
  for (const id of kandidaten) { if (sek + sekAnzeige(id) > S.day.xSek) break; out.push(id); sek += sekAnzeige(id); }
  return out;
}
function tagesPlan() {
  tagFrisch();
  const t = today(), ph = phase();
  const p = { phase: ph, einstufung: [], lernschritte: [], wdh: [], extra: [], aufwaermen: [], sek: 0 };
  if (ph === 'testtag') {
    // Freiwillig aufwärmen: Fehler vom Vortag, höchstens 10 (Lernmodell Teil A). Ohne Fehler: 5 Aufgaben aus verschiedenen
    // Themen, die schon sitzen (Prüfung Runde 1, H5) – nur Übung, zählt nie
    p.aufwaermen = ZIEL_APP.filter(id => { const s = S.f[id]; return s && s.fz === addDays(t, -1) && s.last !== t; }).slice(0, MODELL.testtagMax);
    if (!p.aufwaermen.length) {
      const jeThema = new Map();
      const sitzt = ZIEL_APP.filter(id => S.f[id] && S.f[id].lv >= 1).sort((a, b) => (S.f[b].lv - S.f[a].lv) || (themaIndex(a) - themaIndex(b)));
      for (const id of sitzt) if (!jeThema.has(TYP[id].thema)) jeThema.set(TYP[id].thema, id);
      p.aufwaermen = [...jeThema.values()].slice(0, 5);
    }
    p.sek = p.aufwaermen.reduce((a, id) => a + sekVon(id), 0);
    return p;
  }
  p.einstufung = einstufungOffen();
  p.wdh = ZIEL_APP.filter(istFaellig).sort(urgency);
  const einstSek = einstRestSek(p.einstufung);
  const wdhSek = () => sekSumme(p.wdh, sekVon);
  let lsVorschau = 0;
  if (!p.einstufung.length) {
    // Lernschritte erst nach der Einstufung festlegen: Welche Typen auf 0 stehen, zeigt erst sie. Der Deckel rechnet mit
    // dem, was heute schon gemacht ist, den Fälligen und ②.
    const basis = heuteSek() + wdhSek() + papierHeuteSek();
    const ls = lernschritteHeute(basis);
    p.lernschritte = ls;
    p.wdh = p.wdh.filter(id => !ls.includes(id));
    // Extra nur im Rest des Deckels (② neu gerechnet: am Fr bekommt es, was die Lernschritte übrig lassen)
    p.extra = extraHeute(DECKEL - heuteSek() - wdhSek() - sekSumme(ls, lsSek) - papierHeuteSek());
  } else if (ph === 'lernen' || ph === 'frei') {
    // Vorschau für die Minuten der Mission, solange die Einstufung läuft: die Lernschritte danach (noch nicht festgelegt).
    // Typen auf 0 kennt erst die Einstufung – dafür rechnet die Vorschau mit typischen Lernschritten.
    const { luecken, neu } = lsKandidaten();
    const basis = heuteSek() + einstSek + wdhSek() + papierHeuteSek();
    const max = istEinstufungsTag() ? MODELL.lernschritte.ersterTag : MODELL.lernschritte.folgetag;
    const bekannt = neu.slice(0, max);
    const geschaetzt = Math.max(0, Math.min(max - bekannt.length, p.einstufung.length)) * LS_TYPISCH;
    lsVorschau = Math.max(0, Math.min(sekSumme([...luecken, ...bekannt], lsSek) + geschaetzt, DECKEL - basis));
  }
  p.sek = einstSek + sekSumme(p.lernschritte, lsSek) + lsVorschau + wdhSek();
  p.extraSek = sekSumme(p.extra, sekAnzeige);
  return p;
}
// ① ist offen, solange Einstufung, Lernschritte oder Wiederholungen fehlen (Extra gehört nicht zur Mission)
function rundeOffen(plan) { return plan.einstufung.length + plan.lernschritte.length + plan.wdh.length > 0; }
function minuten(sek) { return Math.max(1, Math.round(sek / 60)); }

// ================================================================
// Papier und Probe (Lernmodell Teil A und B: Papier und App; Erlebnis: ② Papier, Probe am Sa)
// ② = Heft-Aufgaben, die die App stellt: Das Kind rechnet im Heft mit Rechenweg und tippt das Ergebnis ein. Der erste
// Versuch zählt wie eine App-Aufgabe (wenn der Typ fällig ist), bei Fehler statt Zwilling ein zweiter Versuch, dann der
// Lösungsweg. Am Prüftag ist ② die Probe: ein langer Papier-Auftrag (Uhr zählt nur mit), danach die Ergebnisse
// eintippen – Muss, vor dem Lösungsblatt, nicht in quote7. Ein Fehler in der Probe stuft immer zurück.
// ================================================================
// Was heute ins Heft kommt (Teil B, Prüfung Runde 1), höchstens 12 Min. (beim ersten Kontakt sekNeu), dazu 1 Textaufgabe:
// erster Kontakt (Mi): je ein noch nie gesehener Papier-Typ, soweit die 12 Min. reichen (papier.spaeter erst ab Do) ·
// Do/Fr: 3 fällige Rechnungen, niedrigste Stufe zuerst (noch nie gesehene zuerst) und 1 Textaufgabe; am Fr nur, was im
// Tagesdeckel neben den Lernschritten Platz hat · So: Probe-Fehler · Sa: die Probe · Testtag: nichts
function papierTypenHeute() {
  const ph = phase(), t = today();
  if (!testDate() || ph === 'testtag' || (ph === 'pruef' && PROBE)) return [];
  const istPapierZiel = id => ZIEL_SET.has(id) && istPapierTyp(id);
  const rechnungen = (Array.isArray(PAP.rechnungen) ? PAP.rechnungen : ZIEL_PAPIER.filter(id => !PAPIER_TEXT.has(id))).filter(istPapierZiel);
  const texte = [...PAPIER_TEXT].filter(istPapierZiel);
  // Sa prüft jeden Typ: sonst auf dem Probe-Blatt; fehlt der Inhalt der Probe, hier alle Papier-Typen, ohne 12-Min.-Grenze
  if (ph === 'pruef') return [...rechnungen, ...texte];
  let r, txt;
  if (ph === 'luecken') {
    const fehlerSeitSa = id => S.f[id] && (S.f[id].fz || '') >= pruefTag();
    r = rechnungen.filter(fehlerSeitSa);
    txt = texte.filter(fehlerSeitSa).slice(0, 1);
  } else {
    // Am Tag der Einstufung (dem längsten Tag) noch nicht alles Neue: papier.spaeter kommt erst ab dem Tag danach
    // (Projektleitung 16.11.: div-schriftlich-2 erst ab Do). Vor der ersten Antwort ist ui.e1 noch leer – auch das ist Tag 1.
    const ersterTag = !S.ui.e1 || S.ui.e1 === t;
    const neu = rechnungen.filter(id => !S.f[id] && !(ersterTag && PAPIER_SPAETER.has(id)));
    const faellig = rechnungen.filter(id => S.f[id] && istFaellig(id)).sort(urgency);
    r = [...neu, ...faellig].slice(0, Math.max(Number(PAP.jeTag) || MODELL.papierJeTag, neu.length));
    txt = texte.slice(0, 1);
  }
  // Grenze: 12 Min. im Heft, beim ersten Kontakt mit sekNeu (Prüfung Runde 1). Am letzten Tag für Neues (Fr, Überlauf) nur,
  // was neben den übrigen Lernschritten im Tagesdeckel Platz hat (mit Eintippen). Die Textaufgabe zuerst, dann die
  // Rechnungen der Reihe nach, solange sie passen.
  const maxHeft = (Number(PAP.maxMin) || MODELL.papierMaxSek / 60) * 60;
  const maxGesamt = ph === 'lernen' && istLetzterNeuTag() ? DECKEL - andereSekHeute() : Infinity;
  let heft = 0, gesamt = 0;
  const passt = id => heft + sekAnzeige(id) <= maxHeft && gesamt + sekAnzeige(id) + MODELL.sek.eintippen <= maxGesamt;
  const nimm = id => { heft += sekAnzeige(id); gesamt += sekAnzeige(id) + MODELL.sek.eintippen; return true; };
  const textJa = txt.filter(id => passt(id) && nimm(id));
  const out = [];
  for (const id of r) { if (!passt(id)) break; out.push(id); nimm(id); }
  return [...out, ...textJa];
}
function probeHeute() { return phase() === 'pruef' && PROBE ? PROBE : null; }
// Was heute auf Papier dran ist: { art: 'papier' | 'probe', id, n, offen, stand }
function papierInfo() {
  const probe = probeHeute();
  if (probe) {
    const st = S.papier[probe.id] || {};
    const stand = st.fertig ? 'fertig' : st.ende ? 'eintippen' : st.start ? 'laeuft' : 'neu';
    return { art: 'probe', id: probe.id, n: probe.aufgaben.length, offen: !st.fertig, stand };
  }
  const typen = papierTypenHeute();
  const id = 'p-' + today(), st = S.papier[id];
  if (!st && !typen.length) return null;
  const stand = st && st.fertig ? 'fertig' : st && Object.keys(st.erg || {}).length ? 'eintippen' : st ? 'gestellt' : 'neu';
  const sek = (st ? st.items.map(a => a.typ) : typen).reduce((a, t) => a + sekAnzeige(t), 0);
  return { art: 'papier', id, n: st ? st.items.length : typen.length, offen: !(st && st.fertig), stand, sek };
}
// ② von heute einmal anlegen: Die Aufgaben bleiben für den Tag gleich (sie stehen ja im Heft)
function papierBlatt() {
  const id = 'p-' + today();
  if (!S.papier[id]) {
    const nr = 'abcdefghij';
    // Was schon auf einem ②-Blatt stand, kommt nicht wieder (ta-ganz: 10 feste Aufgaben, sonst doppelt in der Woche)
    const schon = new Set();
    for (const b of Object.values(S.papier)) for (const x of (b && Array.isArray(b.items) ? b.items : [])) { const k = aufgabeKey(x); if (k) schon.add(k); }
    const items = papierTypenHeute().map((typ, i) => Object.assign(neueAufgabe(typ, 'papier', schon) || {}, { nr: nr[i] || String(i + 1) }))
      .filter(a => a.typ);
    S.papier[id] = { tag: today(), items, erg: {}, fertig: '' };
    save();
  }
  return S.papier[id];
}
function blattFertig(b) { return b.items.every(a => { const e = b.erg[a.nr]; return e && (e.ok || e.v >= 2 || b.probe); }); }
// Papier-Ergebnis werten: erster Kontakt = Einstufung auf Papier (1 von 1 → ⅓, mit Buch-Beleg ⅔); sonst zählt der
// erste Versuch wie eine App-Aufgabe, aber nur, wenn der Typ fällig ist (die Textaufgabe kommt jeden Tag, auch ohne)
function papierWertung(id, ok, sek) {
  const s = S.f[id];
  if (!s) { einstufen(id, ok ? 1 : 0, { gefragt: 1 }); logNew(sek); return { from: 0, to: S.f[id].lv }; }
  if (!istFaellig(id)) { logTime(sek); return null; }
  logAnswer(ok, sek);
  return review(id, ok);
}
// Probe (Teil B): nicht in quote7. Ein Fehler stuft immer zurück, auch wenn der Typ heute schon dran war; richtig
// zählt wie eine gemischte Prüfung (Sa: jeder Typ ist fällig)
function probeWertung(id, ok, sek) {
  const s = S.f[id], t = today();
  logTime(sek);
  if (!s) { einstufen(id, ok ? 1 : 0, { gefragt: 1 }); S.f[id].g = t; return { from: 0, to: S.f[id].lv }; }
  if (!s.g) s.g = t;
  if (!ok) {
    const from = s.lv;
    s.lv = from === 0 ? 0 : Math.max(MODELL.minNachFehler, from - MODELL.fehlerMinus);   // ein Fehler hebt nie (Stufe 0 bleibt 0)
    s.due = addDays(t, 1);
    s.fz = t;
    s.last = t;
    s.bad = (s.bad || 0) + 1;
    return { from, to: s.lv };
  }
  if (s.lv === 0) {
    // Noch neu (Lernschritt nicht geschafft), in der Probe aber richtig: wie ein erster Kontakt auf Papier ⅓. An Sa/So gibt
    // es keine neuen Lernschritte (Prüfung Runde 1) – ohne das bliebe der Typ bis zum Test neu und BEREIT unerreichbar.
    s.lv = 1; s.due = addDays(t, 1); s.last = t; s.ok = (s.ok || 0) + 1;
    return { from: 0, to: 1 };
  }
  if (s.last === t) return null;
  return review(id, true);
}
function probeMinuten(st) { return st && st.start ? Math.max(0, Math.round(((st.ende || Date.now()) - st.start) / 60000)) : 0; }

// ================================================================
// Ziel-Karte (Erlebnis; Teil B, Linie A; Entscheidungen Abschnitt 5)
// Große Zahl „geschafft“ = Mittel der Themen (jedes Thema gleich viel, darin jeder Typ gleich viel); Füllstand = Mittel
// der Stufen ⅓, ⅔, sicher – so bewegt jede Runde sichtbar etwas. Daneben der Anteil sicherer Typen.
// Linie A je Thema: Füllstand mindestens ⅔, kein Typ mehr neu, jeder Typ schon gemischt geprüft. BEREIT = alle Themen über
// der Linie; der Stempel BEREIT erst ab Sa-Abend, vorher höchstens FAST BEREIT. Über der Linie steht „bereit“, ein Stern
// heißt: dieser Typ ist sicher. Papier-Typen unter ⅔ stehen eigens da (sonst verdecken sichere Typen im Thema sie).
// Prozent wird abgerundet: 66,6 ist noch nicht ⅔.
// ================================================================
function pct(x) { return x >= 1 ? 100 : Math.max(0, Math.floor(x * 100 + 1e-9)); }
function stufeAnzeige(id) { const s = S.f[id]; return s ? Math.min(s.lv, MODELL.sicherAb) : 0; }
function zielStand() {
  const A = MODELL.sicherAb;
  const themen = THEMEN.map(th => {
    const ids = ZIEL.filter(id => TYP[id].thema === th.id);
    const wert = ids.length ? ids.reduce((a, id) => a + stufeAnzeige(id) / A, 0) / ids.length : 0;
    const neu = ids.filter(id => !S.f[id] || S.f[id].lv === 0).length;
    const ungeprueft = ids.filter(id => !S.f[id] || !S.f[id].g).length;
    const ueber = ids.length > 0 && wert >= MODELL.ziellinie - 1e-9 && !neu && !ungeprueft;
    const papierWackel = ids.filter(id => istPapierTyp(id) && stufeAnzeige(id) < 2);
    return { th, ids, wert, prozent: pct(wert), ueber, neu, ungeprueft, sicher: ids.filter(sicher).length, papierWackel };
  });
  const gemessen = themen.filter(x => x.ids.length);
  const linieA = gemessen.length > 0 && gemessen.every(x => x.ueber);
  const erlaubt = stempelErlaubt();
  const sicherN = ZIEL.filter(sicher).length;
  const bereiche = BEREICHE.map(b => {
    const ts = gemessen.filter(x => x.th.bereich === b.id);
    return { b, prozent: ts.length ? pct(ts.reduce((a, x) => a + x.wert, 0) / ts.length) : 0, n: ts.length };
  }).filter(x => x.n);
  return {
    prozent: gemessen.length ? pct(gemessen.reduce((a, x) => a + x.wert, 0) / gemessen.length) : 0,
    sicherN, sicherProzent: ZIEL.length ? pct(sicherN / ZIEL.length) : 0,
    themen, gemessen, ueberN: gemessen.filter(x => x.ueber).length, linieA,
    bereit: linieA && erlaubt, fast: linieA && !erlaubt,
    perfekt: linieA && erlaubt && ZIEL.length > 0 && ZIEL.every(sicher), bereiche
  };
}
// Stempel BEREIT erst ab Sa-Abend (Teil B): ab 18 Uhr am Prüftag oder sobald die Probe eingetippt ist; danach immer
function stempelErlaubt() {
  if (!testDate()) return true;
  const t = today(), p = pruefTag();
  if (t !== p) return t > p;
  const st = PROBE && S.papier[PROBE.id];
  return new Date().getHours() >= MODELL.stempelAbStunde || !!(st && st.fertig);
}
// BEREIT und PERFEKT festhalten. Gibt zurück, was heute neu ist (für Konfetti).
function meilensteine(z) {
  const neu = {};
  if (z.bereit && !S.ui.bereit) { S.ui.bereit = today(); neu.bereit = true; }
  if (z.perfekt && !S.ui.perfekt) { S.ui.perfekt = today(); neu.perfekt = true; }
  return neu;
}

// ================================================================
// Ton (abschaltbar)
// ================================================================
let actx = null;
function sfx(kind) {
  if (!S.settings.sfx) return;
  try {
    actx = actx || new (window.AudioContext || window.webkitAudioContext)();
    if (actx.state === 'suspended') actx.resume();
    const t = actx.currentTime;
    const seq = {
      ok: [[660, 0], [990, 0.09]],
      bad: [[247, 0], [196, 0.12]],
      tap: [[520, 0]],
      level: [[523, 0], [659, 0.09], [784, 0.18], [1046, 0.27]]
    }[kind] || [];
    for (const [f, d] of seq) {
      const o = actx.createOscillator(), g = actx.createGain();
      o.type = kind === 'bad' ? 'square' : 'triangle';
      o.frequency.value = f;
      const peak = kind === 'bad' ? 0.04 : kind === 'tap' ? 0.05 : 0.15;
      g.gain.setValueAtTime(0.0001, t + d);
      g.gain.exponentialRampToValueAtTime(peak, t + d + 0.012);
      g.gain.exponentialRampToValueAtTime(0.0001, t + d + (kind === 'tap' ? 0.06 : 0.18));
      o.connect(g).connect(actx.destination);
      o.start(t + d);
      o.stop(t + d + 0.45);
    }
  } catch (e) { /* kein Ton */ }
}

// ================================================================
// Kleine UI-Helfer
// ================================================================
function esc(s) {
  return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
function restartAnim(el, cls) { if (!el) return; el.classList.remove(cls); void el.offsetWidth; el.classList.add(cls); }
function shake(el) { restartAnim(el, 'shake'); }
function topbar(title, back = 'home') {
  return `<header class="topbar">
    <button class="icon-btn" type="button" data-act="${back}" aria-label="Zurück">‹</button>
    <h1 class="outline">${title}</h1>
  </header>`;
}
let toastTimer = 0;
function toast(msg) {
  const t = $('#toast');
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('show'), 2600);
}
// Einfaches Bottom-Sheet. buttons: [{ label, value, cls }]
function sheet(html, buttons) {
  return new Promise(resolve => {
    const wrap = document.createElement('div');
    wrap.className = 'sheet-wrap';
    wrap.innerHTML = `<div class="sheet" role="dialog" aria-modal="true">${html}
      <div class="sheet-btns">${(buttons || []).map((b, i) => `<button class="btn ${b.cls || ''}" type="button" data-i="${i}">${esc(b.label)}</button>`).join('')}</div></div>`;
    const close = val => { wrap.remove(); resolve(val); };
    wrap.addEventListener('click', e => {
      if (e.target === wrap) return close(null);
      const b = e.target.closest('[data-i]');
      if (b) return close(buttons[+b.dataset.i].value);
    });
    document.body.appendChild(wrap);
    const first = wrap.querySelector('textarea, input');
    if (first) first.focus();
  });
}
let fxToken = 0;
function stopFx() {
  fxToken++;
  const cv = $('#fx');
  cv.getContext('2d').clearRect(0, 0, cv.width, cv.height);
}
function confetti() {
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const token = ++fxToken;
  const cv = $('#fx'), ctx = cv.getContext('2d');
  const W = innerWidth, H = innerHeight, dpr = Math.min(2, devicePixelRatio || 1);
  cv.width = W * dpr; cv.height = H * dpr;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  const colors = ['#B6F23A', '#FFD23F', '#49B9FF', '#4ED98A', '#FF93DC', '#FF9A2B', '#FFFFFF'];
  const P = Array.from({ length: 110 }, () => ({
    x: W / 2 + (Math.random() - 0.5) * 120, y: H * 0.3,
    vx: (Math.random() - 0.5) * 11, vy: -Math.random() * 12 - 5,
    r: Math.random() * 6, vr: (Math.random() - 0.5) * 0.35,
    w: 7 + Math.random() * 7, h: 10 + Math.random() * 8,
    c: colors[Math.floor(Math.random() * colors.length)]
  }));
  let last = performance.now();
  const ink = getComputedStyle(document.documentElement).getPropertyValue('--ink').trim() || '#2B1408';
  const frame = now => {
    if (token !== fxToken) return;
    const k = Math.min(2, (now - last) / 16.7);
    last = now;
    ctx.clearRect(0, 0, W, H);
    let alive = 0;
    for (const p of P) {
      p.vy += 0.38 * k; p.vx *= 0.995; p.x += p.vx * k; p.y += p.vy * k; p.r += p.vr * k;
      if (p.y > H + 30) continue;
      alive++;
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.r);
      ctx.fillStyle = p.c;
      ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
      ctx.lineWidth = 2;
      ctx.strokeStyle = ink;
      ctx.strokeRect(-p.w / 2, -p.h / 2, p.w, p.h);
      ctx.restore();
    }
    if (alive) requestAnimationFrame(frame); else ctx.clearRect(0, 0, W, H);
  };
  requestAnimationFrame(frame);
}
// Stufe als Kästchen: drei Felder, gefüllt in Lime (⅓, ⅔), alle drei Gold = sicher. Form und Farbe zeigen dasselbe.
function stufeHTML(lv) {
  const n = Math.max(0, Math.min(MODELL.sicherAb, lv | 0));
  return `<span class="stufe s${n}" aria-hidden="true"><i></i><i></i><i></i></span>`;
}
function stufeText(lv) { return MODELL.stufen[Math.max(0, Math.min(MODELL.sicherAb, lv | 0))]; }
function isStandalone() { return navigator.standalone === true || matchMedia('(display-mode: standalone)').matches; }
function isIOS() { return /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1); }

// ================================================================
// Screens
// ================================================================
let screen = '';
let updateReady = false;   // neue Version im Hintergrund geladen – beim nächsten Mal auf der Startseite neu laden

// ---------- Erster Start ----------
function welcome() {
  screen = 'welcome';
  stopFx();
  app.innerHTML = `
  <section class="screen welcome">
    <div class="logo-ops" aria-hidden="true"><b>+</b><b>−</b><b>·</b><b>:</b></div>
    <h1 class="outline hero">Willkommen bei ${esc(APP_NAME)}!</h1>
    <ul class="rules">
      <li><span>🎯</span><p><b>Jeden Tag eine Mission:</b> ① eine Runde in der App, ② ein paar Rechnungen im Heft.</p></li>
      <li><span>🧱</span><p><b>Ein Stunt kommt erst in die Show, wenn er sicher sitzt.</b> Jede Aufgabenart wird an verschiedenen Tagen sicher.</p></li>
      <li><span>✏️</span><p><b>Schriftlich rechnest du im Heft</b>, mit Rechenweg. In die App tippst du nur das Ergebnis.</p></li>
    </ul>
    <form class="panel name-form" id="welcome-form">
      <label for="nm">Wie heißt du?</label>
      <input id="nm" type="text" maxlength="20" placeholder="Dein Name (bleibt am Handy)" autocomplete="off" autocorrect="off" autocapitalize="words" spellcheck="false" enterkeyhint="go" value="${esc(S.settings.name)}">
      <button class="btn go big" type="submit">Los geht’s</button>
    </form>
  </section>`;
  $('#welcome-form').addEventListener('submit', e => {
    e.preventDefault();
    S.settings.name = $('#nm').value.trim().slice(0, 20);
    S.ui.onboarded = true;
    save();
    $('#nm').blur();
    home();
  });
}

// ---------- Startseite ----------
function home() {
  if (updateReady) { location.reload(); return; }
  screen = 'home';
  stopFx();
  SES = null;
  document.body.classList.remove('in-session');
  const z = zielStand();
  // BEREIT kann auch ohne Runde kommen (Stempel ab Sa 18 Uhr): Dann hier festhalten und gleich einmal feiern –
  // am Rundenende wäre es schon vergeben
  const neuMs = meilensteine(z);
  if (Object.keys(neuMs).length) save();
  const plan = tagesPlan();
  const name = S.settings.name;
  const installHint = (!isStandalone() && isIOS() && !S.ui.hideInstall) ? `
    <div class="panel install">
      <p><b>Als App aufs iPhone:</b> unten auf <span class="share">⬆︎</span> Teilen tippen, dann „Zum Home-Bildschirm“. So bleibt dein Fortschritt sicher gespeichert.</p>
      <button class="link" type="button" data-act="hideInstall">Ausblenden</button>
    </div>` : '';
  app.innerHTML = `
  <section class="screen home">
    <header class="home-top">
      <h1 class="outline hello">${name ? `Hi ${esc(name)}!` : 'Hi!'}</h1>
      <button class="icon-btn" type="button" data-act="settings" aria-label="Einstellungen">⚙︎</button>
    </header>
    ${zielHTML(z, plan)}
    ${themenHTML(z)}
    ${planSlot()}
    ${installHint}
    <div class="two">
      ${Object.keys(S.f).length ? '<button class="btn" type="button" data-act="ueben">Freies Training</button>' : ''}
      <button class="btn" type="button" data-act="about">❓ So geht’s</button>
    </div>
    ${DATEN_FEHLER.length ? `<p class="fineprint center">Hinweis für Mama und Papa: ${DATEN_FEHLER.length} Fehler in den Aufgaben-Daten (Konsole).</p>` : ''}
  </section>`;
  if (neuMs.bereit || neuMs.perfekt) { confetti(); toast(neuMs.perfekt ? 'PERFEKT! Jede Aufgabenart sitzt sicher.' : 'BEREIT! Du bist Mathe Legend.'); }
}

// ---------- Ziel-Karte: Termin, Countdown, große Zahl, Stempel, Mission ----------
// BEREIT erst ab Sa-Abend; vorher (alle Themen über der Linie) und nach einem Abrutschen: FAST BEREIT
function stempelHTML(z) {
  if (z.perfekt) return '<span class="stempel perfekt">PERFEKT</span>';
  if (z.bereit) return '<span class="stempel bereit">BEREIT</span>';
  if (z.fast || S.ui.bereit) return '<span class="stempel fast">FAST BEREIT</span>';
  return '';
}
function countdownHTML() {
  const t = testDate();
  if (!t) return '';
  const d = daysBetween(today(), t);
  return `<div class="countdown" aria-label="${d === 0 ? 'heute' : d + (d === 1 ? ' Tag' : ' Tage')}"><b>${d === 0 ? '!' : d}</b><span>${d === 0 ? 'heute' : d === 1 ? 'Tag' : 'Tage'}</span></div>`;
}
function zielSatz(z) {
  const ph = phase();
  const offenThemen = z.gemessen.filter(x => !x.ueber);
  if (!testDate()) return 'Gerade steht keine Schularbeit an. Eine kurze Runde hält alles frisch.';
  if (ph === 'testtag') return `Heute ist die Schularbeit. Du hast dich vorbereitet.${tagesPlan().aufwaermen.length ? ' Kurz aufwärmen, wenn du magst.' : ''}`;
  if (!Object.keys(S.f).length) return 'Zeig zuerst, was du schon kannst. Fehler zeigen, wo wir trainieren.';
  if (z.bereit) return 'BEREIT! Jeden Tag deine Mission, dann bleibst du es.';
  if (z.fast) return `Alle Themen sind über der Linie. Die Generalprobe ${probeTagText()} macht BEREIT daraus.`;
  if (ph === 'pruef') return 'Heute ist Generalprobe: wie die echte Schularbeit, auf Papier.';
  if (ph === 'luecken') return 'Morgen ist die Schularbeit. Heute nur die Wackler, dann früh schlafen.';
  if (offenThemen.length && offenThemen.length <= 3) return `Noch ${offenThemen.length} ${offenThemen.length === 1 ? 'Thema' : 'Themen'} bis zur Linie: ${offenThemen.map(x => x.th.titel).join(', ')}.`;
  return 'Ein Stunt kommt erst in die Show, wenn er sicher sitzt.';
}
function zielHTML(z, plan) {
  if (!ZIEL.length) return '<div class="panel ziel"><p class="mission-line">Hier kommen bald deine Aufgaben.</p></div>';
  const t = nextTest();
  return `<div class="panel ziel" id="ziel">
    <div class="ziel-head">
      <div class="ziel-txt"><div class="eyebrow">${t ? esc(t.titel) : 'Dein Ziel'}</div><h2 class="ziel-titel">${t ? esc(dateLabel(t.datum)) : 'Alles aus deinem Stoff'}</h2></div>
      ${countdownHTML()}
    </div>
    <div class="ziel-zahlrow">
      <div class="ziel-zahl" aria-label="${z.prozent} Prozent geschafft"><b>${z.prozent}</b><span>%</span></div>
      <div class="ziel-zahltxt"><b>geschafft</b><small>${z.bereit || S.ui.bereit ? 'Mathe Legend · ' : ''}★ ${z.sicherN} von ${ZIEL.length} Aufgabenarten sicher</small></div>
      ${stempelHTML(z)}
    </div>
    <p class="ziel-sub">${esc(zielSatz(z))}</p>
    ${missionHTML(plan)}
  </div>`;
}

// ---------- Deine Mission heute: ① Runde, ② Papier (am Sa die Probe). Offenes ○, nie ✕ oder Rot. ----------
function missionHeute(plan = tagesPlan()) {
  const pi = papierInfo();
  const runde = rundeOffen(plan);
  const e = S.log[today()] || {};
  return {
    phase: plan.phase, rundeOffen: runde, papier: pi,
    fertig: plan.phase !== 'testtag' && !runde && !(pi && pi.offen),
    getan: (e.a || 0) + (e.n || 0) > 0 || (e.s || 0) > 0 || !!(pi && pi.stand === 'fertig')
  };
}
function missionZeile(offen, html, act) {
  const haken = `<span class="mhaken" role="img" aria-label="${offen ? 'offen' : 'erledigt'}">${offen ? '○' : '✓'}</span>`;
  return offen
    ? `<button class="mzeile" type="button" data-act="${act}">${haken}<span class="mtext">${html}</span></button>`
    : `<div class="mzeile ok">${haken}<span class="mtext">${html}</span></div>`;
}
function rundeText(plan, nummer) {
  const pre = nummer ? '① ' : '';
  if (plan.einstufung.length) return `<b>${pre}Einstufung</b> · Zeig, was du schon kannst · ca. ${minuten(plan.sek)} Min.`;
  const n = plan.wdh.length + plan.lernschritte.length;
  const teile = [`<b>${pre}Runde</b>`];
  if (plan.wdh.length) teile.push(`${plan.wdh.length} ${plan.wdh.length === 1 ? 'Aufgabe' : 'Aufgaben'}`);
  if (plan.lernschritte.length) teile.push(`${plan.lernschritte.length} ${plan.lernschritte.length === 1 ? 'neuer Trick' : 'neue Tricks'}`);
  // Extras hängen hinten an der Runde (ab Fr, höchstens 5 Min.): Sie stehen dabei, damit die Minuten stimmen
  if (n && plan.extra.length) teile.push(`${plan.extra.length} Extra`);
  if (n) teile.push(`ca. ${minuten(plan.sek + (plan.extraSek || 0))} Min.`);
  return teile.join(' · ');
}
function papierText(pi, nummer) {
  const pre = nummer ? '② ' : '';
  if (pi.art === 'probe') {
    const min = PROBE && PROBE.minuten ? `ca. ${PROBE.minuten} Min.` : `${pi.n} Aufgaben`;
    const w = { neu: `${min} · Uhr zählt mit`, laeuft: 'läuft', eintippen: 'Ergebnisse eintippen', fertig: '' }[pi.stand];
    return `<b>${pre}Generalprobe auf Papier</b>${w ? ' · ' + w : ''}`;
  }
  const w = { neu: `${pi.n} ${pi.n === 1 ? 'Aufgabe' : 'Aufgaben'} ins Heft · ca. ${minuten(pi.sek)} Min.`, gestellt: 'im Heft rechnen, dann eintippen', eintippen: 'Ergebnisse eintippen', fertig: '' }[pi.stand];
  return `<b>${pre}Papier</b>${w ? ' · ' + w : ''}`;
}
function missionHTML(plan) {
  const ph = plan.phase;
  if (ph === 'testtag') {
    const n = plan.aufwaermen.length;
    return n ? `<button class="btn big neben" type="button" data-act="aufwaermen"><b>Aufwärmen</b> · ${n} ${n === 1 ? 'Aufgabe' : 'Aufgaben'} · freiwillig</button>` : '';
  }
  const m = missionHeute(plan);
  const pi = m.papier;
  // Ist die Runde heute leer und wurde nichts gespielt (Sa: die Probe fragt alle Typen ab), steht nur ② da – kein ✓ für nichts
  const ohneRunde = !!pi && !m.rundeOffen && !S.day.r;
  const zwei = !!pi && !ohneRunde;
  const runde = ohneRunde ? '' : missionZeile(m.rundeOffen, m.rundeOffen ? rundeText(plan, zwei) : `<b>${zwei ? '① ' : ''}Runde</b>`, 'start');
  const papier = pi ? missionZeile(pi.offen, papierText(pi, zwei), pi.art === 'probe' ? 'probe' : 'papier') : '';
  // Nach der eingetippten Generalprobe (Sa, So): die Lösungswege zu den Fehlern wieder ansehen
  const probeSt = PROBE && S.papier[PROBE.id];
  const probeLink = probeSt && probeSt.fertig && (ph === 'pruef' || ph === 'luecken')
    ? '<button class="link" type="button" data-act="probeAnsehen">Generalprobe: Lösungswege ansehen</button>'
    // Angefangen, aber nicht eingetippt: am So geht das noch (Prüfung Runde 1, H5)
    : probeSt && probeSt.start && !probeSt.fertig && ph === 'luecken'
      ? '<button class="link" type="button" data-act="probe">Generalprobe: Ergebnisse noch eintippen</button>' : '';
  if (m.fertig) {
    if (!m.getan) return `<p class="mission-done">Für heute erledigt ✓</p>${probeLink}`;
    return `<div class="mission fertig" role="group" aria-label="Deine Mission heute">
      <p class="mission-done">Mission geschafft ✓</p>
      <div class="mzeilen">${runde}${papier}</div>
      <p class="fineprint">Für heute ist Schluss. Morgen geht’s weiter.</p>
      ${probeLink}
    </div>`;
  }
  // Am Prüftag zuerst die Generalprobe (die kurze Runde fragt nur, was die Probe nicht abfragt)
  const probeZuerst = pi && pi.art === 'probe' && pi.offen;
  const knopf = m.rundeOffen && !probeZuerst
    ? '<button class="btn go big start" type="button" data-act="start">Start</button>'
    : `<button class="btn go big start" type="button" data-act="${pi.art === 'probe' ? 'probe' : 'papier'}">${pi.stand === 'eintippen' ? 'Ergebnisse eintippen' : pi.art === 'probe' ? 'Zur Generalprobe' : 'Zum Papier'}</button>`;
  const klein = probeZuerst ? `${zwei ? 'Zuerst die Generalprobe. ' : ''}Danach tippst du deine Ergebnisse ein.` : !zwei ? ''
    : m.rundeOffen && pi.offen ? 'Sind beide ✓, ist deine Mission geschafft. Reihenfolge, wie du magst.'
    : m.rundeOffen ? 'Noch ①, dann ist deine Mission für heute geschafft.' : 'Noch ②, dann ist deine Mission für heute geschafft.';
  return `<div class="mission" role="group" aria-labelledby="mission-titel">
    <div class="eyebrow" id="mission-titel">Deine Mission heute</div>
    <div class="mzeilen">${runde}${papier}</div>
    ${knopf}
    ${klein ? `<p class="fineprint">${klein}</p>` : ''}
    ${probeLink}
  </div>`;
}

// ---------- Deine 10 Themen: je ein Balken mit karierter Linie bei ⅔ (darunter Lime, darüber Gold, „bereit“) ----------
// Rechts die Sterne: einer je sicherem Typ. Papier-Typen unter ⅔ stehen eigens unter dem Balken (Teil B).
function nurPapierThema(th) { return NUR_PAPIER.some(id => TYP[id] && TYP[id].thema === th); }
function sterneHTML(x) { return `<span class="tsterne" aria-hidden="true">${x.ids.map(id => (sicher(id) ? '★' : '☆')).join('')}</span>`; }
function themaZeileHTML(x, tippbar = true) {
  const tag = tippbar ? 'button' : 'div';
  const knopf = tippbar ? `type="button" data-act="thema" data-id="${esc(x.th.id)}"` : '';
  // Thema ohne Aufgabenart im Ziel: Kann die App seine Typen nicht zeigen (z. B. Bild unbekannt), „auf Papier“ wie im
  // Lernauftrag (zählt nicht mit); sonst hat aufgaben.js noch keine Typen dafür
  if (!x.ids.length) return `<${tag} class="trow papier-only" ${knopf}><span class="zlabel">${esc(x.th.titel)}</span><span class="zrest">${nurPapierThema(x.th.id) ? 'auf Papier' : 'kommt bald'}</span></${tag}>`;
  const rechts = x.ueber ? `<span class="zrest ok">bereit ${sterneHTML(x)}</span>` : `<span class="zrest">${sterneHTML(x)}</span>`;
  const papier = x.papierWackel.length
    ? `<span class="tpapier">✏️ im Heft noch üben: ${x.papierWackel.map(id => `${esc(typTitel(id))} ${stufeText(stufeAnzeige(id))}`).join(' · ')}</span>` : '';
  return `<${tag} class="trow ${x.ueber ? 'over' : ''}" ${knopf} aria-label="${esc(x.th.titel)}: ${x.prozent} Prozent${x.ueber ? ', bereit' : ''}, ${x.sicher} von ${x.ids.length} sicher">
    <span class="zlabel">${esc(x.th.titel)}</span>${rechts}
    <span class="zbar"><i style="width:${x.prozent}%"></i><b class="zlinie" style="left:${(MODELL.ziellinie * 100).toFixed(1)}%" aria-hidden="true"></b></span>
    ${papier}
  </${tag}>`;
}
function themenHTML(z) {
  if (!THEMEN.length) return '';
  return `<div class="panel themen">
    <div class="themen-head"><span class="eyebrow">Deine ${THEMEN.length} Themen</span><span class="themen-sterne">${z.ueberN} von ${z.gemessen.length} bereit</span></div>
    <div class="trows">${z.themen.map(x => themaZeileHTML(x)).join('')}</div>
    <p class="fineprint">Über der Linie heißt: bereit. Ein Stern heißt: diese Aufgabenart sitzt sicher.</p>
  </div>`;
}
// Antippen eines Themas: die Aufgabenarten mit Stufe (hier darf der Name stehen – die Regel gilt für die Runde)
function themaSheet(id) {
  const x = zielStand().themen.find(y => y.th.id === id);
  if (!x) return;
  const zeile = tid => {
    const s = S.f[tid];
    // Sa/So gibt es keine neuen Lernschritte mehr (Prüfung Runde 1): dann nur „neu“, ohne Versprechen
    const was = !s ? 'kommt bald' : s.lv === 0 ? (s.lk ? 'Lücke – kommt als neuer Trick' : ruhePhase() || phase() === 'testtag' ? 'neu' : 'neu – kommt als neuer Trick') : stufeText(s.lv) + (s.lv >= MODELL.sicherAb ? ' ★' : '');
    return `<li class="tzeile">${stufeHTML(s ? s.lv : 0)}<span><b>${esc(typTitel(tid))}</b><small>${esc(was)}${istPapierTyp(tid) ? ' · im Heft' : ''}${EXTRA_SET.has(tid) ? ' · Extra' : ''}</small></span></li>`;
  };
  const extra = EXTRA.filter(tid => TYP[tid].thema === id && S.f[tid]);
  const fehlt = !x.ueber && x.ids.length ? [x.neu ? `${x.neu} noch neu` : '', x.ungeprueft ? `${x.ungeprueft} noch nicht gemischt geprüft` : '', x.wert < MODELL.ziellinie ? 'Füllstand unter ⅔' : ''].filter(Boolean).join(' · ') : '';
  sheet(`<h2 class="sheet-title">${esc(x.th.titel)}</h2>
    ${x.ids.length ? themaZeileHTML(x, false) : ''}
    ${fehlt ? `<p class="fineprint">Bis zur Linie: ${esc(fehlt)}</p>` : ''}
    ${x.ids.length ? `<ul class="tliste">${x.ids.map(zeile).join('')}</ul>` : (nurPapierThema(id) ? '<p>Dieses Thema übst du auf Papier. Es zählt hier nicht mit.</p>' : '<p>Für dieses Thema kommen die Aufgaben bald.</p>')}
    ${extra.length ? `<h3 class="sheet-sub">Extra – zählt nicht für BEREIT</h3><ul class="tliste">${extra.map(zeile).join('')}</ul>` : ''}
    <p class="fineprint">${esc(x.th.quelle || '')}</p>`,
    [{ label: 'Schließen', value: null, cls: 'go' }]);
}

// ---------- Plan-Karte: dieselbe Ampel, die Mama und Papa sehen – im Ton fürs Kind, ohne Rot, ohne Minuten ----------
// Mit Testdatum rechnet die Prognose (legends-status.js) ein paar Zehntelsekunden. Darum: Ergebnis merken, solange sich
// weder der Tag noch der Speicherstand ändert, und sonst erst die Startseite zeigen, dann füllen.
let PLAN = null;   // { key, bericht, urteil }
function planKey() { return today() + '|' + saveCount; }
function planNow() {
  if (PLAN && PLAN.key === planKey()) return PLAN;
  const bericht = STATUS.bericht(berichtEingabe());
  save();   // bericht() trägt fertig, offen und sicher von heute ins Protokoll ein und friert den Plan je Termin ein
  PLAN = { key: planKey(), bericht, urteil: STATUS.urteil(bericht, today()) };
  return PLAN;
}
// Nie darf die Startseite an der Plan-Karte hängen: Jeder Fehler hier lässt nur die Karte weg.
function planSlot() {
  if (!STATUS || !ZIEL.length) return '';
  try {
    if (PLAN && PLAN.key === planKey()) return planHTML(PLAN);
    setTimeout(() => {
      const el = $('#plan');
      if (!el) return;
      try { el.outerHTML = planHTML(planNow()); }
      catch (e) { el.remove(); console.warn('Plan-Karte:', e); }
    }, 30);
    return PLAN ? planHTML(PLAN) : '<div class="panel plan wait" id="plan" aria-hidden="true"></div>';
  } catch (e) {
    console.warn('Plan-Karte:', e);
    return '';
  }
}
const DAY_STATE = { fertig: 'Mission geschafft', teil: 'angefangen, Mission noch offen', aus: 'nicht geübt', frei: 'nichts fällig', offen: 'noch offen' };
// Stufen der Ampel → Ton der Karte: grün Lime, gelb Sonne, rot = „Notfallplan“ in Orange (nie Rot), ohne Test grau
const PLAN_TON = { gruen: 'ok', gelb: 'catch', rot: 'sos' };
function planHTML(p) {
  const b = p.bericht, u = p.urteil;
  const tone = PLAN_TON[u.stufe] || 'neutral';
  const t = today(), e = S.log[t] || {};
  const todayState = e.f ? 'fertig' : (e.a || 0) + (e.n || 0) > 0 ? 'teil' : b.heute.faellig + b.heute.neu > 0 ? 'offen' : 'frei';
  const days = b.tage.slice(-6).map(x => ({ d: x.d, s: x.s })).concat({ d: t, s: todayState, today: true });
  const dots = days.map(x => {
    const wd = weekdayOf(x.d);
    const name = x.today ? 'heute' : DAY_SHORT[wd];
    return `<li class="pday ${x.s}${x.today ? ' today' : ''}" aria-label="${x.today ? 'Heute' : WEEKDAYS[wd]}: ${DAY_STATE[x.s] || ''}"><i aria-hidden="true"></i><span aria-hidden="true">${name}</span></li>`;
  }).join('');
  return `<div class="panel plan ${tone}" id="plan">
    <div class="plan-head"><span class="eyebrow">Dein Plan</span><span class="plan-stamp">${esc(u.kind.titel)}</span></div>
    <p class="plan-text">${esc(u.kind.text)}</p>
    <ol class="plan-days" aria-label="Die letzten 7 Tage">${dots}</ol>
    <p class="fineprint">Das sehen Mama und Papa auch.</p>
  </div>`;
}

// ---------- ② Papier: Aufgaben fürs Heft, dann Ergebnisse eintippen ----------
function papierScreen() {
  const pi = papierInfo();
  if (!pi || pi.art !== 'papier') return home();
  const b = papierBlatt();
  if (!b.items.length) { toast('Heute gibt es nichts fürs Heft.'); return home(); }
  screen = 'papier';
  stopFx();
  const liste = b.items.map(a => {
    const e = b.erg[a.nr];
    const status = e && (e.ok || e.v >= 2) ? `<span class="pstatus ok">✓</span>` : '';
    const text = PAPIER_TEXT.has(a.typ) || !a.term ? `<span class="ptext">${umbruch(esc(a.text || ''))}</span>` : '';
    return `<li class="paufgabe"><span class="pnr">${esc(a.nr)})</span><span class="pinhalt">${text}${a.term ? `<span class="pterm">${umbruch(esc(a.term))}</span>` : ''}</span>${status}</li>`;
  }).join('');
  const angefangen = Object.keys(b.erg).length > 0;
  const mitText = b.items.some(a => PAPIER_TEXT.has(a.typ));
  const mitRechnung = b.items.some(a => !PAPIER_TEXT.has(a.typ));
  app.innerHTML = `
  <section class="screen papier">
    ${topbar('② Papier')}
    <div class="panel">
      <p class="lead">Rechne im Heft, mit Rechenweg. Schreib die Nummer dazu.</p>
      <ol class="pliste">${liste}</ol>
      ${mitRechnung ? `<p class="fineprint">Wie im Heft: zuerst „Ü:“ (bei + − und :), dann schriftlich rechnen, dann „PR:“. Kommt bei der Probe
        genau die Ausgangszahl heraus?</p>` : ''}
      ${mitText ? '<p class="fineprint">Textaufgabe: geg: · ges: · Rechnung · A: mit ganzem Satz. Die Einheit steht in geg und im Antwortsatz, nicht in der Rechnung.</p>' : ''}
    </div>
    <button class="btn go big" type="button" data-act="papierEintippen">${angefangen ? 'Weiter eintippen' : 'Fertig gerechnet? Ergebnisse eintippen'}</button>
    <button class="btn" type="button" data-act="home">Später</button>
  </section>`;
}

// ---------- Generalprobe am Prüftag: Blatt, Bleistift, kein Rechner. Die Uhr zählt mit, sie stoppt nicht. ----------
let probeTimer = 0;
function probeScreen() {
  const probe = probeHeute() || PROBE;
  if (!probe) return home();
  screen = 'probe';
  stopFx();
  clearInterval(probeTimer);
  const st = S.papier[probe.id] || {};
  // Daneben die Dauer: die echte, wenn bekannt (schularbeit.js → dauer), sonst die geplante der Probe
  // Ist die Dauer nur angenommen (schularbeit.js → dauerAnnahme), steht „ca.“ davor
  const dauer = SA && SA.dauer ? `Die echte Schularbeit dauert ${SA.dauerAnnahme ? 'ca. ' : ''}${SA.dauer} Min.` : probe.minuten ? `Plane ca. ${probe.minuten} Min. ein.` : '';
  let inhalt;
  if (!st.start) {
    inhalt = `<div class="panel prose">
      <p><b>Generalprobe: Blatt, Bleistift, kein Rechner.</b> Die Uhr zählt mit, sie stoppt dich nicht.</p>
      <p>Leg das Handy weg, bis du fertig bist. Danach tippst du deine Ergebnisse ein, bevor du das Lösungsblatt anschaust.</p>
      ${dauer ? `<p class="fineprint">${esc(dauer)}</p>` : ''}
    </div>
    <button class="btn go big" type="button" data-act="probeStart">Uhr starten</button>
    <button class="btn" type="button" data-act="home">Später</button>`;
  } else if (!st.ende) {
    inhalt = `<div class="panel probe-uhr"><p class="eyebrow">Generalprobe läuft</p><p class="uhr" id="probe-uhr">${probeMinuten(st)} Min.</p>
      ${dauer ? `<p class="fineprint">${esc(dauer)}</p>` : ''}</div>
    <button class="btn go big" type="button" data-act="probeFertig">Fertig</button>
    <button class="btn" type="button" data-act="home">Zur Startseite (Uhr läuft weiter)</button>`;
    probeTimer = setInterval(() => { const el = $('#probe-uhr'); if (el) el.textContent = `${probeMinuten(S.papier[probe.id])} Min.`; else clearInterval(probeTimer); }, 15000);
  } else {
    inhalt = `<div class="panel prose"><p><b>Geschafft! Du hast ${probeMinuten(st)} Min. gebraucht.</b> ${esc(dauer)}</p>
      <p>${st.fertig ? 'Deine Ergebnisse sind eingetippt.' : 'Jetzt tippst du deine Ergebnisse ein, Aufgabe für Aufgabe – noch ohne Lösungsblatt. Danach zeigt dir die App, wie die Fehler gehen.'}</p></div>
    <button class="btn go big" type="button" data-act="probeEintippen">${st.fertig ? 'Ergebnisse ansehen' : 'Ergebnisse eintippen'}</button>
    <button class="btn" type="button" data-act="home">Später</button>`;
  }
  app.innerHTML = `<section class="screen probe">${topbar(esc(probe.titel || 'Generalprobe'))}${inhalt}</section>`;
}

// ---------- Einstellungen ----------
function toggleHTML(key, label, hint) {
  return `<label class="toggle"><span><b>${label}</b>${hint ? `<small>${hint}</small>` : ''}</span>
    <input type="checkbox" data-set="${key}" ${S.settings[key] ? 'checked' : ''}><i aria-hidden="true"></i></label>`;
}
function settings() {
  screen = 'settings';
  stopFx();
  const s = S.settings;
  const off = officialTest();
  app.innerHTML = `
  <section class="screen settings">
    ${topbar('Einstellungen')}
    <div class="panel form">
      <label class="field"><b>Name</b>
        <input id="set-name" type="text" maxlength="20" value="${esc(s.name)}" autocomplete="off" autocorrect="off" spellcheck="false">
        <small>Bleibt am Handy. Mama und Papa bekommen nur Zahlen, keinen Namen.</small></label>
      ${off ? `<div class="field"><b>Testdatum</b>
        <span class="daterow"><input id="set-test" type="date" value="${esc(off)}" disabled></span>
        <small><b class="lockline">🔒 Termin von Mama/Papa</b>${esc(TEST.titel || 'Schularbeit')} am ${esc(dateLabel(off))}. Bis dahin verteilt die App alles so, dass es sich ausgeht.</small></div>`
      : `<label class="field"><b>Testdatum</b>
        <span class="daterow"><input id="set-test" type="date" value="${esc(s.testDate)}">${s.testDate ? '<button class="link" type="button" data-act="clearTest">löschen</button>' : ''}</span>
        <small>Mit Datum verteilt die App alles rechtzeitig.</small></label>`}
      ${toggleHTML('sfx', 'Töne', '')}
    </div>
    <div class="panel form">
      <div class="field"><b>Fortschritt sichern</b>
        <small>Der Code enthält den ganzen Fortschritt. Damit kannst du alles wiederherstellen, z. B. auf einem neuen Handy.</small></div>
      <div class="two"><button class="btn" type="button" data-act="exportCode">Code kopieren</button><button class="btn" type="button" data-act="importCode">Code einfügen</button></div>
    </div>
    <div class="panel form hq">${hqPanelHTML()}</div>
    <button class="btn danger big" type="button" data-act="reset">Fortschritt löschen</button>
    <p class="fineprint center">${esc(APP_NAME)} · ${ZIEL.length} Aufgabenarten · Version ${esc(VERSION.replace(/^ml-v/, ''))}<span id="set-ver"></span></p>
  </section>`;
  // Version des Offline-Caches (ml-v2 → „Version 2“): Ist sie anders als die der App, kommt gerade ein Update an
  if (window.caches) caches.keys().then(keys => {
    const v = keys.find(k => /^ml-v\d+$/.test(k));
    const el = $('#set-ver');
    if (v && el && v !== VERSION) el.textContent = ` · Offline-Kopie ${v.slice(4)}`;
  }).catch(() => {});
  $('#set-name').addEventListener('change', e => { S.settings.name = e.target.value.trim().slice(0, 20); save(); });
  $('#set-test').addEventListener('change', e => {
    if (officialTest()) return;
    const v = e.target.value;
    if (v && daysBetween(today(), v) < 0) { toast('Das Datum liegt in der Vergangenheit.'); e.target.value = S.settings.testDate; return; }
    S.settings.testDate = v;
    S.settings.testSince = v ? today() : '';
    save();
    settings();
  });
  const hqForm = $('#hq-form');
  if (hqForm) hqForm.addEventListener('submit', e => { e.preventDefault(); hqConnect(); });
  app.querySelectorAll('[data-set]').forEach(el => el.addEventListener('change', () => {
    S.settings[el.dataset.set] = el.checked;
    save();
    if (el.checked && el.dataset.set === 'sfx') sfx('ok');
  }));
}

function about() {
  screen = 'about';
  stopFx();
  const kid = S.settings.name ? esc(S.settings.name) : 'Ihr Kind';
  const pt = pruefTag(), ptName = pt ? WEEKDAYS[weekdayOf(pt)] : '';
  app.innerHTML = `
  <section class="screen about">
    ${topbar('So geht’s')}
    <div class="panel prose">
      <h2>Kurz gesagt</h2>
      <ul>
        <li><b>Jeden Tag eine Mission:</b> ① die Runde in der App, an manchen Tagen dazu ② ein paar Rechnungen im Heft. Reihenfolge, wie du magst.</li>
        <li><b>Jede Aufgabenart hat Stufen:</b> neu, ⅓, ⅔, sicher. Sie steigt höchstens einmal am Tag – beim ersten Versuch, ohne Tipp.</li>
        <li><b>Fehler sind okay.</b> Du siehst, wie es geht, und ein paar Aufgaben später kommt die Revanche.</li>
        <li><b>Die Linie:</b> Ist ein Thema über der Linie, steht dort „bereit“. Ein Stern heißt: Diese Aufgabenart sitzt sicher. Sind alle Themen über der Linie, bist du BEREIT${ptName ? ` – der Stempel kommt ab ${ptName}abend` : ''}.</li>
        <li><b>${ptName || 'Vor der Schularbeit'}:</b> Generalprobe auf Papier, wie die Schularbeit. Zuerst tippst du deine Ergebnisse ein, dann zeigt dir die App die Lösungswege.</li>
      </ul>
    </div>
    <div class="panel prose">
      <h2>Für Eltern: die Methode dahinter</h2>
      <p><b>Abrufen statt Anschauen.</b> Jede Aufgabe verlangt, dass ${kid} das Ergebnis selbst rechnet.</p>
      <p><b>Gemischt üben.</b> Nach dem ersten Kontakt kommen die Aufgabenarten gemischt, ohne Überschrift: So lernt ${kid} zu erkennen, welche Rechnung gefragt ist.</p>
      <p><b>Verteilt wiederholen.</b> Eine Aufgabenart steigt höchstens eine Stufe am Tag. Neue Aufgabenarten kommen bis drei Tage vor der Schularbeit dazu, so viele, wie in höchstens 30 Minuten am Tag passen; der Rest am nächsten Tag. Zwei Tage davor wird alles geprüft (Generalprobe), am Tag davor kommen nur noch die Lücken.</p>
      <p><b>Papier zählt mit.</b> Schriftliches Rechnen und Textaufgaben macht ${kid} im Heft; das eingetippte Ergebnis zählt wie eine Aufgabe in der App. Nach einem Fehler: Probe machen, ein zweiter Versuch.</p>
      <p><b>BEREIT</b> heißt: In jedem Thema ist der Füllstand mindestens ⅔, keine Aufgabenart ist mehr neu, und jede wurde schon gemischt geprüft. Den Stempel gibt es erst am Abend des Probetags (ab 18 Uhr oder nach der eingetippten Generalprobe), vorher höchstens „fast bereit“.</p>
      <p><b>Plan-Karte.</b> Auf der Startseite steht, ob ${kid} im Plan ist: dieselbe Ampel wie in Legends HQ, ohne Rot. Mit Verbindungs-Code meldet die App nur Zahlen; die Sicherung ist verschlüsselt.</p>
    </div>
  </section>`;
}

// ================================================================
// Runde
// Einträge (eintrag.art): einstufung (2 je Typ, vor allem anderen) · ls (Lernschritt: Beispiel → 1. Schritt vorgegeben →
// selbst, bis zwei in Folge richtig, höchstens 6) · wdh (gemischt; der erste Versuch des Tages zählt) · zwilling (nach
// einem Fehler, nach 3 anderen Aufgaben, nur Übung) · papier / probe (Ergebnisse vom Blatt) · ueben, aufwaermen (zählen nie)
// Keine Überschrift und keine Farbe je Thema vor der Antwort (Lernmodell Teil A): Die Karte zeigt nur die Aufgabe.
// ================================================================
let SES = null;
let E = {};

// Aufgabe erzeugen. Dieselbe Aufgabe kommt in einer Runde nicht zweimal: Schlüssel ist a.kennung (aufgaben.js), sonst der
// term – Text-, Bild- und Ordnen-Aufgaben haben keinen. vermeiden = Kennungen, die auch nicht kommen sollen (② : was schon
// auf einem Blatt stand; ta-ganz hat nur 10 feste Aufgaben für die ganze Woche). Geht es nicht anders, kommt sie doch.
function neueAufgabe(typ, zweck, vermeiden = null) {
  const t = TYP[typ];
  if (!t || !MATHE) return null;
  const versuche = vermeiden ? 12 : 6;
  for (let i = 0; i < versuche; i++) {
    const seed = (Math.random() * 4294967296) >>> 0;
    try {
      const a = t.erzeuge(MATHE.zufall(seed), { zweck });
      if (!a) continue;
      a.typ = typ;
      a.seed = seed;
      const key = aufgabeKey(a);
      if (key && i < versuche - 1 && ((SES && SES.kennungen.has(key)) || (vermeiden && vermeiden.has(key)))) continue;
      if (SES && key) SES.kennungen.add(key);
      return a;
    } catch (e) { console.warn('Generator', typ, e); return null; }
  }
  return null;
}
function aufgabeKey(a) { return a ? String(a.kennung || a.term || '') : ''; }
// Mischen: Verwechselbares (nah) nah beieinander, nie zweimal derselbe Typ hintereinander
function mischen(ids) {
  const gruppe = id => [id, ...((TYP[id] && TYP[id].nah) || [])].sort()[0];
  return ids.slice().sort((a, b) => cmp(gruppe(a), gruppe(b)) || urgency(a, b));
}
// Lernschritte (geblockt) gleichmäßig zwischen die gemischten Aufgaben setzen; Extra (ab Fr) am Ende
function rundeQueue(plan) {
  const wdh = mischen(plan.wdh).map(typ => ({ art: 'wdh', typ }));
  const ls = plan.lernschritte.map(typ => ({ art: 'ls', typ, schritt: 'beispiel', n: 0, folge: 0, kurz: istPapierTyp(typ) }));
  const extra = (plan.extra || []).map(typ => ({ art: 'extra', typ }));
  if (!ls.length) return [...wdh, ...extra];
  const out = [], abstand = Math.max(1, Math.floor(wdh.length / (ls.length + 1)));
  let i = 0;
  for (const x of ls) { out.push(...wdh.slice(i, i + abstand)); i += abstand; out.push(x); }
  out.push(...wdh.slice(i), ...extra);
  return out;
}
// Einstufung: 2 Aufgaben je Typ, mit Buch-Beleg 1
function einstufungQueue(ids) { return ids.flatMap(typ => Array.from({ length: einstufungFragen(typ) }, (_, k) => ({ art: 'einstufung', typ, k }))); }
function zaehleAufgaben(q) { return q.reduce((a, x) => a + (x.art === 'ls' ? MODELL.lernschrittSchaetzung + 1 : 1), 0); }

function startSession(mode, queue, extra = {}) {
  if (!queue.length) { toast('Gerade gibt es nichts zu üben.'); return home(); }
  tagFrisch();
  SES = Object.assign({
    mode, queue, teil: 'runde', cur: null, auf: null, phase: '', fertig: 0, gesamt: zaehleAufgaben(queue),
    sek: 0, einst: {}, fehler: {}, revanche: 0, falsch: 0, richtig: 0, gestiegen: [], sicherNeu: [], kennungen: new Set(),
    zielVorher: zielStand(), hilfe: false, ein: null, wahl: []
  }, extra);
  sessionShell();
  next();
}
function startRunde() {
  const plan = tagesPlan();
  if (plan.einstufung.length) return startSession('runde', einstufungQueue(plan.einstufung), { teil: 'einstufung', missionVorher: missionHeute(plan).fertig });
  startSession('runde', rundeQueue(plan), { missionVorher: missionHeute(plan).fertig });
}
// Freies Training: die wackeligsten gesehenen Typen und zwei Extra-Typen – zählt nie
function startUeben() {
  const ids = ZIEL_APP.filter(id => S.f[id] && S.f[id].lv >= 1).sort((a, b) => (S.f[a].lv - S.f[b].lv) || ((S.f[b].bad || 0) - (S.f[a].bad || 0))).slice(0, 8);
  const extra = EXTRA.slice().sort(() => Math.random() - 0.5).slice(0, 2);
  startSession('ueben', [...mischen(ids), ...extra].map(typ => ({ art: 'ueben', typ })));
}
function startAufwaermen() { startSession('aufwaermen', tagesPlan().aufwaermen.map(typ => ({ art: 'aufwaermen', typ }))); }
function startPapierEintippen() {
  const b = papierBlatt();
  const id = 'p-' + today();
  const q = b.items.filter(a => { const e = b.erg[a.nr]; return !(e && (e.ok || e.v >= 2)); }).map(a => ({ art: 'papier', typ: a.typ, blatt: id, nr: a.nr }));
  if (!q.length) { b.fertig = b.fertig || today(); save(); return home(); }
  startSession('papier', q, { blatt: id });
}
function startProbeEintippen() {
  const probe = probeHeute() || PROBE;
  if (!probe) return home();
  const st = S.papier[probe.id] || (S.papier[probe.id] = { tag: today(), erg: {}, probe: true });
  st.erg = st.erg || {};
  const q = probe.aufgaben.filter(a => !st.erg[a.nr]).map(a => ({ art: 'probe', typ: a.typ, blatt: probe.id, nr: a.nr }));
  if (!q.length) { st.fertig = st.fertig || today(); save(); return probeErgebnisse(); }
  startSession('probe', q, { blatt: probe.id });
}

function sessionShell() {
  screen = 'session';
  stopFx();
  document.body.classList.add('in-session');
  app.innerHTML = `
  <section class="session">
    <header class="ses-top">
      <button class="icon-btn" type="button" data-act="quit" aria-label="Runde beenden">✕</button>
      <div class="bar"><i id="ses-bar"></i></div>
      <div class="ses-ziel" id="ses-ziel" title="geschafft">${SES.zielVorher.prozent} %</div>
    </header>
    <div class="ses-cardwrap" id="ses-wrap"><article class="vcard" id="ses-card" aria-live="polite"></article></div>
    <div class="pad" id="pad"></div>
    <button class="btn go big" id="ses-next" type="button" data-act="weiter" hidden>Weiter</button>
  </section>`;
  E = { card: $('#ses-card'), wrap: $('#ses-wrap'), pad: $('#pad'), next: $('#ses-next'), bar: $('#ses-bar'), ziel: $('#ses-ziel') };
}
function fortschrittBalken() {
  if (!E.bar || !SES) return;
  E.bar.style.width = Math.min(100, Math.round(100 * SES.fertig / Math.max(1, SES.fertig + zaehleAufgaben(SES.queue) + (SES.cur && SES.phase === 'answer' ? 1 : 0)))) + '%';
}

function next() {
  if (!SES) return;
  const c = SES.cur;
  if (c && c.art === 'ls' && !c.ende) return zeigeSchritt();   // Lernschritt geht weiter
  SES.cur = SES.queue.shift() || null;
  if (!SES.cur) {
    if (SES.teil === 'einstufung') return einstufungZwischen();
    return finish();
  }
  zeigeSchritt();
}

// Die Aufgabe des aktuellen Eintrags zeigen
function zeigeSchritt() {
  const c = SES.cur;
  SES.hilfe = false;
  if (c.art === 'papier' || c.art === 'probe') {
    const quelle = c.art === 'papier' ? S.papier[c.blatt].items : (PROBE ? PROBE.aufgaben : []);
    SES.auf = quelle.find(a => a.nr === c.nr) || null;
    if (SES.auf && SES.auf.eingabe === 'vergleich') SES.auf = [SES.auf];   // ein einzelner Vergleich: wie ein Pack aus einem
  } else if (c.art === 'ls' && c.schritt === 'beispiel') {
    SES.auf = neueAufgabe(c.typ, 'beispiel');
  } else {
    const zweck = { einstufung: 'einstufung', ls: 'lernschritt', wdh: 'runde', zwilling: 'zwilling', extra: 'runde', ueben: 'ueben', aufwaermen: 'ueben' }[c.art] || 'runde';
    SES.auf = TYP[c.typ] && TYP[c.typ].auswahl
      ? Array.from({ length: MODELL.pack }, () => neueAufgabe(c.typ, zweck)).filter(Boolean)
      : neueAufgabe(c.typ, zweck);
  }
  if (!SES.auf || (Array.isArray(SES.auf) && !SES.auf.length)) { console.warn('Keine Aufgabe für', c); c.ende = 'fehler'; return next(); }
  if (!Array.isArray(SES.auf) && (!EINGABEN.includes(SES.auf.eingabe || 'zahl') || (SES.auf.bild && !BILDER.includes(SES.auf.bild.art)))) {
    // Ein Format, das die App nicht kennt: überspringen statt hängen (Konsole sagt, welches)
    console.warn('Antwortformat noch nicht gebaut:', SES.auf.eingabe, SES.auf.bild, c);
    c.ende = 'fehler';
    return next();
  }
  SES.wahl = Array.isArray(SES.auf) ? SES.auf.map(() => '') : [];
  SES.ein = Array.isArray(SES.auf) ? null : neueEingabe(SES.auf);
  SES.ordnung = [];   // Ordnen: angetippte Zahlen der Reihe nach (Index in auf.zahlen)
  SES.marken = [];    // Zahlenstrahl: angetippte Striche (Werte)
  if (c.art === 'ls' && c.schritt === 'beispiel') { SES.phase = 'beispiel'; renderBeispiel(); }
  else { SES.phase = 'answer'; renderAufgabe(); }
  fortschrittBalken();
  taskSec();   // Uhr für diese Aufgabe startet jetzt
}
// Kopfzeile der Karte: nie das Thema (Lernmodell Teil A), nur was zu tun ist
function kopfText(c) {
  if (c.art === 'einstufung') return 'Zeig, was du schon kannst';
  if (c.art === 'ls') return c.schritt === 'beispiel' ? 'Neuer Trick: so geht’s' : c.schritt === 'eins' ? 'Neuer Trick: der erste Schritt steht schon da' : 'Neuer Trick: jetzt du';
  if (c.art === 'zwilling') return 'Revanche';
  if (c.art === 'papier') return `② Aufgabe ${c.nr}) aus deinem Heft`;
  if (c.art === 'probe') return `Generalprobe · Aufgabe ${c.nr}`;
  if (c.art === 'extra') return 'Extra';
  if (c.art === 'ueben' || c.art === 'aufwaermen') return 'Training · zählt nicht';
  return '';
}
// Lange Zahlwörter (sw-zahlwort, Probe 3a): Umbruch nur nach „hundert“, „tausend“, „Million(en)“, „Milliarde(n)“, nie
// mitten in der Silbe (Prüfung Runde 1, M3). Nur in Wörtern, die ganz aus Zahlwort-Teilen bestehen – „Hunderter“ und
// „Tausender“ bleiben heil. Bekommt schon escapten Text.
const ZAHLWORT = /^(?:null|eins?|eine[mnrs]?|zwei|drei|vier|fünf|sechs?|sieb(?:en)?|acht|neun|zehn|elf|zwölf|zwanzig|dreißig|zig|hundert|tausend|und|millionen|million|milliarden|milliarde)+$/i;
function umbruch(html) {
  return String(html).replace(/[A-Za-zÄÖÜäöüß]{12,}/g, w => (ZAHLWORT.test(w)
    ? w.replace(/(hundert|tausend|millionen|million|milliarden|milliarde)(?=[a-zäöüß])/gi, '$1<wbr>') : w));
}
// Sehr lange Aufträge (Generalprobe: zwei Geschichten in einer Aufgabe) etwas kleiner, damit die Felder Platz haben;
// ein Zahlwort als Aufgabe (wort) etwas kleiner als eine Rechnung, damit jedes Stück bis zum Umbruch in die Zeile passt
function aufgabeHTML(a) {
  const lang = a.text && a.text.length > 160 ? ' lang' : '';
  const wort = /[A-Za-zÄÖÜäöüß]{12,}/.test(a.term || '') ? ' wort' : '';
  return `${a.text ? `<p class="atext${lang}">${umbruch(esc(a.text))}</p>` : ''}${a.bild ? bildHTML(a) : ''}${a.term ? `<p class="q${wort}">${umbruch(esc(a.term))}</p>` : ''}`;
}
// Lösungsweg: Textzeilen; _so_ wird unterstrichen (erste Teilzahl der Division, wie im Heft); { mono: [Zeilen] } ist
// eine Rechnung in fester Schrift, Leerzeichen bleiben (Kurzform der Division, Spalten). Zahlen setzt der Generator.
function unterstrichen(html) { return html.replace(/_([^_]+)_/g, '<u>$1</u>'); }
function wegZeile(z) {
  if (z && typeof z === 'object' && Array.isArray(z.mono)) return `<pre class="rechnung">${z.mono.map(l => unterstrichen(esc(l))).join('\n')}</pre>`;
  return unterstrichen(umbruch(esc(z == null ? '' : z)));
}
function wegHTML(weg) {
  if (!Array.isArray(weg) || !weg.length) return '';
  let k = 0;   // Die Rechenspalte (mono) bekommt keine Nummer; die Schritte zählen ohne sie weiter
  return `<ol class="weg">${weg.map(z => (z && typeof z === 'object' ? `<li class="mono">${wegZeile(z)}</li>` : `<li value="${++k}">${wegZeile(z)}</li>`)).join('')}</ol>`;
}

// ---------- Zahlenstrahl als Grafik (bild.art 'strahl') ----------
// bild = { art: 'strahl', start, schritt, striche, beschriftet: [Index der beschrifteten Striche], kreuze: [{ name, wert }] }
// Antwortformat 'strahl' (zs-markieren): Striche antippen, bis so viele Kreuze gesetzt sind wie a.ziel Zahlen hat.
// Ein Kreuz darf zwischen zwei Strichen liegen (halber Schritt). Breite fest 320, damit es am iPhone SE passt.
const STRAHL = { w: 320, rand: 18, y: 46 };
function strahlX(b, wert) { const n = Math.max(1, b.striche); return STRAHL.rand + ((wert - b.start) / b.schritt) * ((STRAHL.w - 2 * STRAHL.rand) / n); }
function bildHTML(a, opt = {}) {
  const b = a.bild;
  if (!b || b.art !== 'strahl') return '';
  const n = Math.max(1, b.striche | 0), beschr = new Set(Array.isArray(b.beschriftet) ? b.beschriftet : [0, n]);
  const tippbar = a.eingabe === 'strahl' && SES && SES.phase === 'answer' && !opt.loesung;
  const marken = opt.loesung ? (a.loesung || []) : (SES ? SES.marken : []);
  let svg = `<line x1="${STRAHL.rand - 8}" y1="${STRAHL.y}" x2="${STRAHL.w - 4}" y2="${STRAHL.y}" class="sl"/><path d="M${STRAHL.w - 4} ${STRAHL.y} l-9 -6 v12 z" class="sp"/>`;
  for (let i = 0; i <= n; i++) {
    const wert = b.start + i * b.schritt, x = strahlX(b, wert), lang = beschr.has(i);
    svg += `<line x1="${x}" y1="${STRAHL.y - (lang ? 10 : 6)}" x2="${x}" y2="${STRAHL.y + (lang ? 10 : 6)}" class="st${lang ? ' lang' : ''}"/>`;
    if (lang) svg += `<text x="${x}" y="${STRAHL.y + 28}" class="sz">${esc(F(wert))}</text>`;
    if (tippbar) svg += `<rect x="${x - 13}" y="${STRAHL.y - 30}" width="26" height="52" class="sh" data-act="strich" data-w="${wert}"/>`;
  }
  const kreuz = (x, name, cls) => `<g class="${cls}"><path d="M${x - 7} ${STRAHL.y - 22} l14 14 M${x + 7} ${STRAHL.y - 22} l-14 14"/>${name ? `<text x="${x}" y="${STRAHL.y - 27}" class="sk">${esc(name)}</text>` : ''}</g>`;
  for (const k of (b.kreuze || [])) svg += kreuz(strahlX(b, k.wert), k.name, 'kr');
  for (const w of marken) svg += kreuz(strahlX(b, w), '', opt.loesung ? 'kr ok' : 'kr neu');
  return `<svg class="strahl" viewBox="0 0 ${STRAHL.w} 84" role="img" aria-label="Zahlenstrahl ab ${esc(F(b.start))}, Schritt ${esc(F(b.schritt))}">${svg}</svg>`;
}
function strichTippen(el) {
  if (!SES || SES.phase !== 'answer' || !SES.auf || SES.auf.eingabe !== 'strahl') return;
  const w = Number(el.getAttribute('data-w'));
  const i = SES.marken.indexOf(w);
  if (i >= 0) SES.marken.splice(i, 1);
  else if (SES.marken.length < (SES.auf.ziel || SES.auf.loesung || []).length) SES.marken.push(w);
  else return shake(E.card);
  sfx('tap');
  const svg = E.card.querySelector('svg.strahl');
  if (svg) svg.outerHTML = bildHTML(SES.auf);
}
// Lösung als Text: Ordnen als Kette mit Zeichen, Zahlenstrahl als Liste, sonst wie aufgaben.js sie schreibt
function loesungText(a) {
  if (a.eingabe === 'ordnen') return (a.loesung || []).map(F).join(a.richtung === 'ab' ? ' > ' : ' < ');
  if (a.eingabe === 'strahl') return (a.loesung || []).map(F).join(', ');
  return MATHE.anzeigen(a);
}

// ---------- Ordnen durch Antippen (Antwortformat 'ordnen') ----------
// a = { zahlen: [506, 56, 650, …], richtung: 'auf' | 'ab', loesung: [5, 56, 65, …] }. Das Kind tippt die Zahlen der Reihe
// nach an, die App setzt die Zeichen (< bzw. >). Eine gesetzte Zahl antippen nimmt sie wieder heraus.
function ordnenHTML(a) {
  const zeichen = a.richtung === 'ab' ? '>' : '<';
  const kette = SES.ordnung.map((i, k) => `${k ? `<span class="oz">${zeichen}</span>` : ''}<button type="button" class="ochip gesetzt" data-act="oraus" data-i="${i}">${esc(F(a.zahlen[i]))}</button>`).join('');
  const rest = a.zahlen.map((z, i) => (SES.ordnung.includes(i) ? '' : `<button type="button" class="ochip" data-act="orein" data-i="${i}">${esc(F(z))}</button>`)).join('');
  return `<div class="okette" aria-label="deine Reihe">${kette || '<span class="leer">Tipp die Zahlen der Reihe nach an.</span>'}</div><div class="opool">${rest}</div>`;
}
function ordnenTippen(b, rein) {
  if (!SES || SES.phase !== 'answer') return;
  const i = Number(b.dataset.i);
  if (rein && !SES.ordnung.includes(i)) SES.ordnung.push(i);
  if (!rein) SES.ordnung = SES.ordnung.filter(x => x !== i);
  sfx('tap');
  const el = $('#ordnen');
  if (el) el.innerHTML = ordnenHTML(SES.auf);
}
// Ordnen und Zahlenstrahl prüft aufgaben.js (ab MATHE.version 2: positionen, Fehlerarten wie stellen, richtung, striche
// und hinweis). Nur für ein älteres aufgaben.js (z. B. die lokale Testseite) prüft die App sie selbst: Reihenfolge bzw.
// Menge der Werte, ohne Fehlerart.
function pruefeLokal(a, wert) {
  const l = Array.isArray(a.loesung) ? a.loesung.map(Number) : [];
  if (a.eingabe === 'ordnen') {
    const teile = l.map((z, k) => ({ ok: Number(wert[k]) === z }));
    return { ok: wert.length === l.length && teile.every(x => x.ok), wert, teile: null, positionen: teile };
  }
  const w = wert.map(Number).sort((x, y) => x - y), s = l.slice().sort((x, y) => x - y);
  return { ok: w.length === s.length && w.every((x, k) => x === s[k]), wert };
}
// Knopf rechts im Band: „Weiß ich noch nicht“ (Einstufung) oder „Tipp“ (zeigt den ersten Schritt; dann kein Aufstieg)
function toolHTML(a, c) {
  if (c.art === 'einstufung') return '<button type="button" class="tool" data-act="weissNicht">Weiß ich noch nicht</button>';
  if ((c.art === 'wdh' || c.art === 'ueben' || c.art === 'aufwaermen') && !Array.isArray(a) && a.weg && a.weg.length > 1) return '<button type="button" class="tool" data-act="tipp">Tipp</button>';
  return '';
}
// Ein Vergleich im Dreierpack: „45 678 ○ 45 687“ – das ○ zeigt die Wahl
function vglTermHTML(x, mitte) {
  const [l, r] = String(x.term).split('○');
  return `<div class="vgl-term"><span>${esc((l || '').trim())}</span>${mitte}<span>${esc((r || '').trim())}</span></div>`;
}
function renderAufgabe() {
  const c = SES.cur, a = SES.auf;
  const kopf = kopfText(c), tool = toolHTML(a, c);
  let body;
  if (Array.isArray(a)) {
    // Dreierpack < > =: je Zeile oben der Vergleich, darunter drei große Knöpfe
    body = `<p class="atext">${esc(a[0].text || 'Setze <, > oder = ein.')}</p><div class="vgl">${a.map((x, i) => `<div class="vgl-zeile">
      ${vglTermHTML(x, `<b class="vgl-erg vgl-slot" id="slot${i}">${esc(SES.wahl[i] || '?')}</b>`)}
      <div class="vgl-k" role="group">${['<', '=', '>'].map(v =>
        `<button type="button" class="vk${SES.wahl[i] === v ? ' an' : ''}" data-act="vgl" data-i="${i}" data-v="${esc(v)}" aria-label="${v === '<' ? 'kleiner' : v === '>' ? 'größer' : 'gleich'}">${esc(v)}</button>`).join('')}</div></div>`).join('')}</div>`;
  } else if (a.eingabe === 'ordnen') {
    body = `${aufgabeHTML(a)}<div class="ordnen" id="ordnen">${ordnenHTML(a)}</div>`;
  } else if (a.eingabe === 'strahl') {
    const n = (a.ziel || a.loesung || []).length;
    body = `${aufgabeHTML(a)}<p class="fineprint">Tipp ${n === 1 ? 'den Strich' : `die ${n} Striche`} an${a.ziel ? `: ${a.ziel.map(z => esc(F(z))).join(', ')}` : ''}. Nochmal antippen nimmt das Kreuz weg.</p>`;
  } else {
    const schritt1 = c.art === 'ls' && c.schritt === 'eins' && a.weg && a.weg[0] ? `<div class="hilfe">1. Schritt: ${wegZeile(a.weg[0])}</div>` : '';
    body = `${aufgabeHTML(a)}${schritt1}<div class="anz-zeile"><output class="anz" id="anz" aria-live="polite"></output></div><p class="tipp-zeile" id="tipp" hidden></p>`;
  }
  E.card.className = 'vcard pop';
  E.card.innerHTML = `${kopf || tool ? `<div class="band"><span>${esc(kopf)}</span>${tool}</div>` : ''}<div class="cbody">${body}</div>`;
  E.next.hidden = true;
  E.pad.hidden = false;
  E.pad.innerHTML = padHTML(a);
  zeigeEingabe();
  E.wrap.scrollTop = 0;
  // Alle Felder sichtbar (Prüfung Runde 1, H4): Ragt die Eingabe unter das Ziffernfeld, rückt die Karte so weit hoch wie
  // nötig – höchstens bis zum Anfang des Auftrags (das Band oben darf verschwinden, der Text nicht)
  // Gemessen ohne die Einblend-Animation der Karte (sie verschiebt und verkleinert anfangs)
  const alt = E.card.style.animation;
  E.card.style.animation = 'none';
  const anz = $('#anz');
  if (anz) {
    const w = E.wrap.getBoundingClientRect();
    const ueber = anz.getBoundingClientRect().bottom - w.bottom + 8;
    const oben = E.card.querySelector('.atext, svg.strahl, .q');
    const max = oben ? oben.getBoundingClientRect().top - w.top - 4 : 0;
    if (ueber > 0) E.wrap.scrollTop = Math.min(ueber, Math.max(0, max));
  }
  feldSichtbar($('#anz .feld.akt'));   // das aktive Feld immer ganz
  E.card.style.animation = alt;
}
function renderBeispiel() {
  const a = SES.auf;
  E.card.className = 'vcard pop';
  E.card.innerHTML = `<div class="band rule">Neuer Trick: so geht’s</div><div class="cbody">${aufgabeHTML(a)}
    ${wegHTML(a.weg)}
    <p class="answer-line">Ergebnis: <b>${esc(loesungText(a))}</b></p>
    <p class="fineprint">Schau dir den Weg an. Gleich bist du dran.</p></div>`;
  E.pad.hidden = true;
  E.next.hidden = false;
  E.next.textContent = 'Jetzt ich';
}

// ================================================================
// Ziffernfeld: eigene Tasten statt iPhone-Tastatur (Technik-Plan): keine Tastatur, die die Aufgabe verdeckt, kein
// Enter-Problem, kein Autokorrektur-Ärger. In der Runde gibt es darum kein <input>. Tasten mindestens 56 pt,
// touch-action: manipulation (sonst zoomt schnelles „1 1“).
// Die Antwort besteht aus Feldern (felder/werte); welche Zusatztasten erscheinen, hängt am Antwortformat und am Feld
// mit dem Cursor (Lernauftrag 2a): zahl · rest (R) · term (+ − · : ( )) · kuerzel (Md … E) · liste (nächste Zahl) ·
// felder (nächstes Feld) · dazu „nicht möglich“, wenn die Aufgabe es anbietet. vergleich hat eigene Knöpfe in der Karte.
// Führende Null gesperrt („0542“ gibt es nicht), die 0 allein geht. Die Dreiergruppen setzt die Anzeige selbst
// (geübt wird das auf Papier, Lernauftrag 2a). Ordnen und Zahlenstrahl haben eigene Ansichten, nur „Prüfen“ unten.
// ================================================================
const OPS = ['+', '−', '·', ':', '(', ')'];
const KUERZEL = (MATHE && MATHE.KUERZEL) || ['Md', 'HM', 'ZM', 'M', 'HT', 'ZT', 'T', 'H', 'Z', 'E'];
const MAX_ZIFFERN = 12;
function neueEingabe(a) {
  const art = a.eingabe || 'zahl';
  const feld = (fa, label = '') => ({ art: fa, label });
  let felder;
  if (art === 'rest') felder = [feld('zahl'), feld('zahl', 'R')];
  else if (art === 'felder') felder = (a.felder || []).map(f => feld(f.art || 'zahl', f.label || ''));
  else if (art === 'term' || art === 'kuerzel') felder = [feld(art)];
  else felder = [feld('zahl')];
  return { art, felder, werte: felder.map(() => ''), i: 0, nm: false, dyn: art === 'liste' };
}
function padHTML(a) {
  if (Array.isArray(a) || a.eingabe === 'ordnen' || a.eingabe === 'strahl') return '<button type="button" class="key go breit" data-act="taste" data-k="ok">Prüfen</button>';
  const k = (v, label, cls = '', aria = '') => `<button type="button" class="key ${cls}" data-act="taste" data-k="${esc(v)}"${aria ? ` aria-label="${esc(aria)}"` : ''}>${label}</button>`;
  const ziffern = ['1', '2', '3', '4', '5', '6', '7', '8', '9'].map(d => k(d, d)).join('');
  return `<div class="tasten extra" id="extra"></div>
    <div class="tasten">${ziffern}${k('del', '⌫', 'del', 'löschen')}${k('0', '0')}${k('ok', 'Prüfen', 'go')}</div>`;
}
// Zusatztasten nach Format und aktivem Feld (ein- und ausgeblendet, das Ziffernfeld bleibt stehen)
function extraHTML() {
  const a = SES.auf, e = SES.ein;
  if (!e) return '';
  const f = e.felder[e.i];
  const k = (v, label, cls = '') => `<button type="button" class="key op ${cls}" data-act="taste" data-k="${esc(v)}">${esc(label)}</button>`;
  const x = [];
  if (e.art === 'rest') x.push(k('R', 'R', 'w2'));
  if (f.art === 'term') x.push(...OPS.map(o => k(o, o)));
  if (f.art === 'kuerzel') x.push(...KUERZEL.map(u => k(u, u, 'kz')));
  if (e.art === 'felder' && e.i < e.felder.length - 1) x.push(k('weiter', 'nächstes Feld →', 'w3'));
  if (e.art === 'liste') x.push(k('naechste', 'nächste Zahl', 'w3'));
  if ((a.tasten || []).includes('nm')) x.push(k('nm', 'nicht möglich', 'w3'));
  return x.join('');
}
function aufArt() { return Array.isArray(SES.auf) ? 'vergleich' : (SES.auf.eingabe || 'zahl'); }
function sperre() { shake($('#anz')); }
// Eine Ziffer an ein Feld anhängen – null, wenn gesperrt (führende Null, zu lang)
function mitZiffer(fa, w, d) {
  if (fa === 'term') {
    const zahl = (w.match(/\d+$/) || [''])[0];
    if (zahl === '0' || zahl.length >= MAX_ZIFFERN || w.endsWith(')')) return null;
    return (w + d).slice(0, 60);
  }
  if (fa === 'kuerzel') {
    const offen = (w.match(/\d+$/) || [''])[0];
    if (offen === '0' || offen.length >= 2) return null;
    return w && !offen ? `${w} ${d}` : w + d;
  }
  if (w === '0' || w.length >= MAX_ZIFFERN) return null;
  return w + d;
}
// Kürzel an die offene Ziffer hängen („2“ + „HT“ → „2HT“); jedes Kürzel nur einmal
function mitKuerzel(w, u) {
  if (!/\d$/.test(w)) return null;
  const da = (w.match(/\d+(Md|HM|ZM|HT|ZT|M|T|H|Z|E)/g) || []).map(t => t.replace(/^\d+/, ''));
  return da.includes(u) ? null : w + u;
}
function ohneLetztes(fa, w) {
  if (fa === 'kuerzel' && /[A-Za-z]$/.test(w)) return w.replace(/[A-Za-z]+$/, '');
  return w.slice(0, -1).replace(/ $/, '');
}
function taste(k) {
  if (!SES || SES.phase !== 'answer') return;
  if (k === 'ok') return pruefen();
  const e = SES.ein;
  if (!e) return;
  const f = e.felder[e.i], w = e.werte[e.i];
  if (k === 'nm') { e.nm = !e.nm; return zeigeEingabe(); }
  if (/^\d$/.test(k)) {
    const neu = mitZiffer(f.art, w, k);
    if (neu == null) return sperre();
    e.nm = false;
    e.werte[e.i] = neu;
  } else if (k === 'del') {
    if (e.nm) e.nm = false;
    else if (w) e.werte[e.i] = ohneLetztes(f.art, w);
    else if (e.i > 0) {
      if (e.dyn) { e.felder.splice(e.i, 1); e.werte.splice(e.i, 1); }
      e.i--;
    }
  } else if (k === 'R') {
    if (e.art !== 'rest' || !e.werte[0]) return sperre();
    e.i = 1;
  } else if (k === 'weiter') {
    if (e.i >= e.felder.length - 1) return sperre();
    e.i++;
  } else if (k === 'naechste') {
    if (!w) return sperre();
    e.felder.push({ art: 'zahl', label: '' });
    e.werte.push('');
    e.i = e.werte.length - 1;
  } else if (OPS.includes(k)) {
    if (f.art !== 'term') return sperre();
    e.werte[e.i] = (w + k).slice(0, 60);
  } else if (KUERZEL.includes(k)) {
    const neu = f.art === 'kuerzel' ? mitKuerzel(w, k) : null;
    if (neu == null) return sperre();
    e.werte[e.i] = neu;
  } else return;
  zeigeEingabe();
}
// Feld antippen (mehrere Felder): Cursor dorthin
function feldWahl(b) {
  if (!SES || SES.phase !== 'answer' || !SES.ein) return;
  const i = +b.dataset.i;
  if (i >= 0 && i < SES.ein.felder.length) { SES.ein.i = i; zeigeEingabe(); }
}
function feldText(fa, w) {
  if (!w) return '';
  if (fa === 'term') return esc(w.replace(/\d+/g, n => F(n)).replace(/([+−·:])/g, ' $1 ').replace(/\s+/g, ' ').trim());
  if (fa === 'kuerzel') return esc(w);
  return F(w);
}
function zeigeEingabe() {
  const el = $('#anz');
  if (!el || !SES || !SES.ein) return;
  const e = SES.ein;
  let html;
  if (e.nm) html = '<span class="nm">nicht möglich</span>';
  else if (e.art === 'rest') {
    html = `<span class="${e.i === 0 ? 'akt' : ''}">${feldText('zahl', e.werte[0]) || '?'}</span>${e.i === 1 || e.werte[1] ? ` <span class="rr">R</span> <span class="${e.i === 1 ? 'akt' : ''}">${feldText('zahl', e.werte[1]) || '?'}</span>` : ''}`;
  } else if (e.felder.length > 1 || e.art === 'felder') {
    // Mehrere Felder: je Feld Name und Wert, antippbar; die Liste ohne Namen, durch Beistriche getrennt
    html = e.felder.map((f, i) => `<button type="button" class="feld${i === e.i ? ' akt' : ''}" data-act="feld" data-i="${i}">${f.label ? `<small>${esc(f.label)}</small>` : ''}<span>${feldText(f.art, e.werte[i]) || '?'}</span></button>`).join(e.art === 'liste' ? '<span class="komma">,</span>' : '');
  } else html = feldText(e.felder[0].art, e.werte[0]);
  el.innerHTML = html || '<span class="leer">?</span>';
  el.classList.toggle('mehr', e.felder.length > 1 && e.art !== 'rest');
  el.classList.toggle('viele', e.felder.length >= 3 && e.art === 'felder');   // H4: alle Felder über dem Ziffernfeld
  const extra = $('#extra');
  if (extra) { extra.innerHTML = extraHTML(); extra.hidden = !extra.innerHTML; }
  feldSichtbar(el.querySelector('.feld.akt'));
}
// Das aktive Feld muss zu sehen sein: Bei vier Feldern und langem Text (Generalprobe, iPhone SE) liegt es sonst unter
// dem Ziffernfeld. Die Karte scrollt nur so weit wie nötig.
function feldSichtbar(akt) {
  const wrap = $('#ses-wrap');
  if (!akt || !wrap) return;
  const a = akt.getBoundingClientRect(), w = wrap.getBoundingClientRect();
  if (a.bottom > w.bottom - 6) wrap.scrollTop += a.bottom - w.bottom + 14;
  else if (a.top < w.top + 6) wrap.scrollTop -= w.top - a.top + 14;
}
function eingabeWert() {
  if (Array.isArray(SES.auf)) return SES.wahl.some(w => !w) ? null : SES.wahl.slice();
  if (SES.auf.eingabe === 'ordnen') return SES.ordnung.length === (SES.auf.zahlen || []).length ? SES.ordnung.map(i => SES.auf.zahlen[i]) : null;
  if (SES.auf.eingabe === 'strahl') return SES.marken.length === (SES.auf.ziel || SES.auf.loesung || []).length ? SES.marken.slice() : null;
  const e = SES.ein;
  if (e.nm) return 'nm';
  if (e.art === 'rest') return e.werte[0] === '' ? null : { q: e.werte[0], r: e.werte[1] === '' ? '0' : e.werte[1] };
  if (e.art === 'felder') return e.werte.some(w => w === '') ? null : e.werte.slice();
  if (e.art === 'liste') { const l = e.werte.filter(Boolean); return l.length ? l : null; }
  return e.werte[0] || null;
}
function vglWahl(b) {
  if (!SES || SES.phase !== 'answer') return;
  const i = +b.dataset.i;
  SES.wahl[i] = b.dataset.v;
  b.parentElement.querySelectorAll('.vk').forEach(x => x.classList.toggle('an', x === b));
  const slot = $('#slot' + i);
  if (slot) slot.textContent = b.dataset.v;
  sfx('tap');
}
// Hardware-Tastatur (Mac, zum Testen): Ziffern, Rücktaste, Enter, R, < > =
document.addEventListener('keydown', e => {
  if (screen !== 'session' || !SES || e.metaKey || e.ctrlKey || e.altKey) return;
  if (e.target && /^(INPUT|TEXTAREA)$/.test(e.target.tagName)) return;
  if (e.key === 'Enter') { e.preventDefault(); if (SES.phase === 'answer') pruefen(); else if (!E.next.hidden) weiter(); return; }
  if (SES.phase !== 'answer') return;
  if (/^\d$/.test(e.key)) taste(e.key);
  else if (e.key === 'Backspace') taste('del');
  else if ((e.key === 'r' || e.key === 'R') && SES.ein && SES.ein.art === 'rest') taste('R');
  else if (e.key === 'Tab') { e.preventDefault(); taste(SES.ein && SES.ein.art === 'liste' ? 'naechste' : 'weiter'); }
  else if ('+-*/:()'.includes(e.key)) taste({ '-': '−', '*': '·', '/': ':' }[e.key] || e.key);
  else if (['<', '>', '='].includes(e.key) && Array.isArray(SES.auf)) {
    const i = SES.wahl.findIndex(w => !w);
    const b = app.querySelector(`.vk[data-i="${i < 0 ? SES.wahl.length - 1 : i}"][data-v="${e.key}"]`);
    if (b) vglWahl(b);
  }
});

// ---------- Prüfen und Folgen ----------
function pruefen() {
  if (!SES || SES.phase !== 'answer') return;
  const wert = eingabeWert();
  if (wert == null) { shake(Array.isArray(SES.auf) || !$('#anz') ? E.card : $('#anz')); return; }
  const c = SES.cur, a = SES.auf;
  const sek = taskSec();
  SES.sek += Math.min(60, sek);
  let r;
  if (Array.isArray(a)) {
    // Dreierpack: richtig (Aufstieg) nur bei 3 von 3; als Fehler zählt es ab MODELL.packFehlerAb falschen Teilen
    const teile = a.map((x, i) => MATHE.pruefe(x, wert[i]));
    const falsch = teile.filter(x => !x.ok).length;
    r = { ok: falsch === 0, fehler: falsch >= MODELL.packFehlerAb, teile, pack: true };
  } else if ((a.eingabe === 'ordnen' || a.eingabe === 'strahl') && !(Number(MATHE.version) >= 2)) {
    r = pruefeLokal(a, wert);
  } else {
    r = MATHE.pruefe(a, wert);
    if (r.unlesbar) { toast('Das kann ich nicht lesen. Nur Ziffern, bitte.'); taskStart = Date.now() - sek * 1000; return; }
  }
  SES.phase = 'feedback';
  const info = folgen(c, r, sek);
  if (r.ok) SES.richtig++; else SES.falsch++;
  SES.fertig++;
  if (SES.mode === 'runde') S.day.r = (S.day.r || 0) + 1;
  save();
  // Probe: Ergebnisse nur notieren (das Kind tippt vor dem Lösungsblatt); Lösungswege zu den Fehlern danach gesammelt
  if (c.art === 'probe') { sfx('tap'); return next(); }
  if (info.nochmal) { SES.phase = 'answer'; SES.ein = Array.isArray(a) ? null : neueEingabe(a); SES.wahl = Array.isArray(a) ? a.map(() => '') : []; SES.ordnung = []; SES.marken = []; }
  renderFeedback(r, info);
  sfx(r.ok ? (info.ch && info.ch.to > info.ch.from ? 'level' : 'ok') : 'bad');
}
// Was eine Antwort bewirkt – je Art des Eintrags. Gibt zurück, was die Rückmeldung zeigen soll.
function folgen(c, r, sek) {
  const typ = c.typ, t = today();
  const info = { art: c.art, ch: null, zwilling: false, luecke: false, nochmal: false, revanche: false, ls: null };
  if (!r.ok && r.fehlerart) fehlerart(typ, r.fehlerart);
  if (c.art === 'einstufung') {
    const e = SES.einst[typ] || (SES.einst[typ] = { r: 0, n: 0 });
    if (!S.ui.e1) S.ui.e1 = t;
    if (e.n === 0) logNew(sek); else logTime(sek);
    e.n++;
    if (r.ok) e.r++;
    S.day.esek = (S.day.esek || 0) + Math.min(60, sek);
    S.day.en = (S.day.en || 0) + 1;
    if (e.n >= einstufungFragen(typ)) einstufungTypFertig(typ);
    return info;
  }
  if (c.art === 'extra' && !S.f[typ]) {
    // Extra, erster Kontakt: keine Einstufung, kein Lernschritt – der Typ startet auf ⅓ und läuft dann gemischt mit
    // (zählt nie für BEREIT; nicht in quote7)
    logNew(sek);
    S.f[typ] = { lv: 1, due: addDays(t, 1), last: t, ok: r.ok ? 1 : 0, bad: r.ok ? 0 : 1, since: t };
    if (!r.ok) S.f[typ].fz = t;
    return info;
  }
  if (c.art === 'wdh' || c.art === 'extra') {
    const s = S.f[typ];
    const zaehlt = !!s && s.last !== t && s.lv >= 1;
    const fehler = r.pack ? r.fehler : !r.ok;   // mehrere Felder (Vorgänger/Nachfolger …) sind eine Aufgabe, kein Pack
    if (zaehlt && SES.hilfe) {
      // Mit Tipp: Stufe bleibt, morgen wieder (Aufstieg nur ohne Hilfe); zählt nicht in quote7
      logTime(sek);
      if (fehler) info.ch = review(typ, false);
      else { s.last = t; s.due = addDays(t, 1); }
    } else if (zaehlt && fehler && phase() === 'luecken' && c.art === 'wdh') {
      // So-Nachsicht (Teil B): Der Fehler zählt (quote7), stuft aber erst zurück, wenn auch der Zwilling falsch ist
      if (r.pack) r.teile.forEach(x => logAnswer(x.ok, sek / r.teile.length)); else logAnswer(false, sek);
      s.ns = t;
      s.last = t;
      if (!s.g) s.g = t;
      info.nachsicht = true;
    } else if (zaehlt) {
      // In quote7 zählen die Teile eines Dreierpacks einzeln
      if (r.pack) r.teile.forEach(x => logAnswer(x.ok, sek / r.teile.length)); else logAnswer(r.ok, sek);
      if (r.ok || fehler) info.ch = review(typ, r.ok);
      else { s.last = t; s.due = addDays(t, 1); }   // Pack nicht ganz richtig, aber unter der Fehlergrenze: bleibt
      if (info.ch && info.ch.to >= MODELL.sicherAb && info.ch.from < MODELL.sicherAb && ZIEL_SET.has(typ)) SES.sicherNeu.push(typ);
      if (info.ch && info.ch.to > info.ch.from) SES.gestiegen.push(typ);
    } else logTime(sek);
    if (fehler && c.art === 'wdh') { if (s) s.fz = t; info.zwilling = zwillingPlanen(typ); }
    else if (fehler && s) s.fz = t;
    return info;
  }
  if (c.art === 'zwilling') {
    logTime(sek);
    SES.fehler[typ] = SES.fehler[typ] || 0;
    const s = S.f[typ];
    const offeneNachsicht = !!s && s.ns === t;
    if (r.ok) {
      info.revanche = true;
      SES.revanche++;
      if (offeneNachsicht) { delete s.ns; info.nachsichtOk = true; }   // So: Zwilling richtig → kein Zurückstufen
    } else {
      SES.fehler[typ]++;
      if (offeneNachsicht) info.ch = nachsichtFehler(typ);
      info.luecke = lueckeGefunden(typ);
    }
    return info;
  }
  if (c.art === 'ls') {
    const s = S.f[typ];
    if (!c.gezaehlt) { logNew(sek); c.gezaehlt = true; c.quote = !!s && !s.lk; } else logTime(sek);
    c.n++;
    info.kurz = !!c.kurz;
    if (c.kurz) {
      // Papier-Typ (Prüfung Runde 1): kurzer Lernschritt – nach dem Beispiel 1 Aufgabe mit vorgegebenem 1. Schritt.
      // Richtig: ⅓, weiter im Heft. Falsch: morgen noch einmal kurz, mit Hilfe (an Sa/So nicht mehr, dann bleibt er neu).
      if (r.ok) { lernschrittGeschafft(typ); c.ende = 'ok'; info.ls = 'ok'; SES.gestiegen.push(typ); }
      else { lernschrittMorgen(typ); c.ende = 'morgen'; info.ls = 'morgen'; }
    } else {
      if (c.schritt === 'selbst') c.folge = r.ok ? c.folge + 1 : 0;
      // Die Tagesmenge zählt erst ein beendeter Lernschritt: Wer mittendrin aufhört, bekommt ihn heute noch einmal
      if (c.folge >= MODELL.lernschritt.inFolge) { lernschrittGeschafft(typ); c.ende = 'ok'; info.ls = 'ok'; SES.gestiegen.push(typ); }
      else if (c.n >= MODELL.lernschritt.max) { lernschrittMorgen(typ); c.ende = 'morgen'; info.ls = 'morgen'; }
      else c.schritt = 'selbst';
    }
    if (c.ende && c.quote) S.day.ls = (S.day.ls || 0) + 1;
    return info;
  }
  // Antwort als kurzer Text fürs Blatt (Rückblick): Vergleich als Zeichen, sonst wie schluessel()
  const antwortText = () => (Array.isArray(SES.auf) ? SES.wahl.join('')
    : typeof MATHE.schluessel === 'function' ? MATHE.schluessel(SES.auf.eingabe || 'zahl', r.wert) : JSON.stringify(r.wert));
  if (c.art === 'papier') {
    const b = S.papier[c.blatt];
    const e = b.erg[c.nr] || (b.erg[c.nr] = { v: 0 });
    const s = S.f[typ];
    e.v++;
    if (e.v === 1) {
      e.w = antwortText();
      e.ok = r.ok;
      if (!r.ok && phase() === 'luecken' && s && istFaellig(typ)) {
        // So-Nachsicht auf Papier: Stimmt der 2. Versuch, stuft der Fehler nicht zurück
        logAnswer(false, sek);
        s.ns = t;
        s.last = t;
        s.fz = t;
        if (!s.g) s.g = t;
        e.ns = 1;
      } else info.ch = papierWertung(typ, r.ok, sek);
    } else {
      logTime(sek);
      if (r.ok) e.ok2 = true;
      if (e.ns && s && s.ns === t) {
        if (r.ok) { delete s.ns; info.nachsichtOk = true; } else info.ch = nachsichtFehler(typ);
      }
    }
    if (!r.ok && e.v < 2) info.nochmal = true;   // zweiter Versuch: noch einmal ins Heft schauen, Probe machen
    if (blattFertig(b) && !b.fertig) b.fertig = t;
    return info;
  }
  if (c.art === 'probe') {
    const b = S.papier[c.blatt];
    b.erg[c.nr] = { v: 1, w: antwortText(), ok: r.ok };
    info.ch = probeWertung(typ, r.ok, sek);
    if (PROBE && PROBE.aufgaben.every(x => b.erg[x.nr])) b.fertig = b.fertig || t;
    return info;
  }
  logTime(sek);   // ueben, aufwaermen: zählt nie
  return info;
}
// Zwilling: nach 3 anderen Aufgaben, gleicher Typ, neue Zahlen. Höchstens 2 Fehler je Typ und Runde.
function zwillingPlanen(typ) {
  SES.fehler[typ] = (SES.fehler[typ] || 0) + 1;
  if (SES.fehler[typ] >= MODELL.fehlerJeTypMax) return false;
  let i = 0, andere = 0;
  while (i < SES.queue.length && andere < MODELL.zwillingNach) { if (SES.queue[i].typ !== typ) andere++; i++; }
  SES.queue.splice(i, 0, { art: 'zwilling', typ });
  return true;
}
// Lücke: auch der Zwilling falsch. Mi–Fr kommt der Lernschritt morgen, Sa/So gleich in dieser Runde.
function lueckeGefunden(typ) {
  const s = S.f[typ];
  if (!s) return false;
  s.lk = today();
  s.fz = today();
  if (ruhePhase() && SES.mode === 'runde') {
    const pos = SES.queue.length && SES.queue[0].typ !== typ ? 1 : 0;
    SES.queue.splice(pos, 0, { art: 'ls', typ, schritt: 'beispiel', n: 0, folge: 0, kurz: istPapierTyp(typ) });
  }
  return true;
}
// Einstufung eines Typs fertig: Stufe setzen, schwerere Typen des Themas ggf. ohne Frage auf 0, Zeitgrenze prüfen
function einstufungTypFertig(typ) {
  const e = SES.einst[typ];
  einstufen(typ, e.r, { gefragt: einstufungFragen(typ) });
  const thema = TYP[typ].thema;
  const nullen = ZIEL.filter(id => TYP[id].thema === thema && S.f[id] && S.f[id].c === 0 && S.f[id].since === today()).length;
  if (nullen >= MODELL.einstufung.nullen) {
    const schwerer = SES.queue.filter(x => x.art === 'einstufung' && TYP[x.typ].thema === thema && (TYP[x.typ].rang || 0) > (TYP[typ].rang || 0)).map(x => x.typ);
    for (const id of new Set(schwerer)) { einstufen(id, 0, { auto: true }); SES.einst[id] = { r: 0, n: 0, auto: true }; }
    SES.queue = SES.queue.filter(x => !(x.art === 'einstufung' && schwerer.includes(x.typ)));
  }
  if ((S.day.esek || 0) >= MODELL.einstufung.maxSek) {
    // 12 Minuten erreicht: Rest morgen zuerst
    SES.queue = SES.queue.filter(x => x.art !== 'einstufung');
    S.day.estop = 1;
  }
}
function weissNicht() {
  if (!SES || SES.phase !== 'answer' || SES.cur.art !== 'einstufung') return;
  const c = SES.cur, typ = c.typ;
  const sek = taskSec();
  SES.sek += Math.min(60, sek);
  const e = SES.einst[typ] || (SES.einst[typ] = { r: 0, n: 0 });
  if (!S.ui.e1) S.ui.e1 = today();
  if (e.n === 0) logNew(sek); else logTime(sek);
  S.day.esek = (S.day.esek || 0) + Math.min(60, sek);
  S.day.en = (S.day.en || 0) + 1;
  e.n = einstufungFragen(typ);   // „Weiß ich noch nicht“ zählt als 0, die zweite Aufgabe dieses Typs entfällt
  SES.queue = SES.queue.filter(x => !(x.art === 'einstufung' && x.typ === typ));
  einstufungTypFertig(typ);
  SES.fertig++;
  save();
  SES.phase = 'feedback';
  E.card.innerHTML = `<div class="band practice">Kein Problem</div><div class="cbody"><p class="answer-line">Das schauen wir uns zusammen an.</p></div>`;
  E.pad.hidden = true;
  E.next.hidden = false;
  E.next.textContent = 'Weiter';
}
function tipp() {
  if (!SES || SES.phase !== 'answer' || Array.isArray(SES.auf)) return;
  const el = $('#tipp'), a = SES.auf;
  if (!el || !a.weg || !a.weg.length) return;
  SES.hilfe = true;
  el.hidden = false;
  el.innerHTML = 'Tipp: ' + wegZeile(a.weg[0]);
}

// ---------- Rückmeldung (Bänder nie Rot) ----------
// Richtige Lösung, die Ziffern markiert, die nicht stimmen (von hinten verglichen). Die falsche Zahl selbst steht nicht da.
function markiert(a, wert) {
  const l = a.loesung;
  if ((a.eingabe || 'zahl') === 'zahl' && typeof l === 'number' && typeof wert === 'number') {
    const ziffern = String(l), w = String(wert);
    let i = 0;
    return [...F(l)].map(ch => {
      if (!/\d/.test(ch)) return ch;
      const vonRechts = ziffern.length - 1 - i++;
      return w[w.length - 1 - vonRechts] === ch ? ch : `<mark>${ch}</mark>`;
    }).join('');
  }
  return esc(loesungText(a));
}
function loesungHTML(a, wert) { return `<p class="answer-line">Richtig ist: <b class="loesung">${markiert(a, wert)}</b></p>`; }
// Ordnen: die richtige Kette, Plätze markiert, an denen eine andere Zahl stand
function ordnenLoesungHTML(a, r) {
  const zeichen = a.richtung === 'ab' ? ' > ' : ' < ';
  return `<p class="answer-line">Richtig ist:</p><p class="okette loesung">${(a.loesung || []).map((z, k) => (r.positionen && r.positionen[k] && !r.positionen[k].ok ? `<mark>${esc(F(z))}</mark>` : esc(F(z)))).join(`<span class="oz">${zeichen.trim()}</span>`)}</p>`;
}
// Rückmeldung zur Fehlerart (Lernauftrag 2a, die Texte liefert aufgaben.js): pruefe() gibt hinweis zurück oder eine
// fehlerart, deren Text in MATHE.fehlerTexte steht. Ohne Text bleibt es beim Lösungsweg.
function hinweisHTML(r) {
  const t = (r && r.hinweis) || (r && r.fehlerart && MATHE && MATHE.fehlerTexte && MATHE.fehlerTexte[r.fehlerart]) || '';
  return typeof t === 'string' && t ? `<p class="note hinweis">${esc(t)}</p>` : '';
}
function renderFeedback(r, info) {
  const c = SES.cur, a = SES.auf;
  const titel = c.typ ? `<p class="typname">${esc(typTitel(c.typ))}</p>` : '';   // erst nach der Antwort
  let band, cls, body = '';
  if (Array.isArray(a)) {
    // Jede Zeile mit dem richtigen Zeichen: grün hinterlegt, wo es stimmte, gelb, wo nicht
    body = `<div class="vgl">${a.map((x, i) => `<div class="vgl-zeile ${r.teile[i].ok ? 'ok' : 'bad'}">${vglTermHTML(x, `<b class="vgl-erg">${esc(x.loesung)}</b>`)}</div>`).join('')}</div>`;
  } else if (!r.ok && a.eingabe === 'ordnen') body = ordnenLoesungHTML(a, r);
  else if (!r.ok && a.eingabe === 'strahl') body = `${bildHTML(a, { loesung: true })}<p class="answer-line">Richtig ist: <b class="loesung">${esc(loesungText(a))}</b></p>`;
  else if (!r.ok) body = loesungHTML(a, r.wert);
  if (r.ok) {
    cls = 'good';
    band = info.revanche ? 'Revanche gewonnen!' : info.ch && info.ch.to >= MODELL.sicherAb && info.ch.from < MODELL.sicherAb ? 'Sicher gelandet!' : 'Sitzt!';
    if (c.art === 'papier' && SES.auf && S.papier[c.blatt].erg[c.nr].v > 1) band = 'Gefunden!';
    // Die gelöste Aufgabe noch einmal ganz (Zahlen in Dreiergruppen): „8 200 → Vorgänger: 8 199 · Nachfolger: 8 201“
    if (!Array.isArray(a)) body += `<p class="answer-line">${a.term ? `${umbruch(esc(a.term))} → ` : ''}<b class="loesung">${esc(loesungText(a))}</b></p>`;
  } else {
    cls = 'sogehts';
    const satz = !Array.isArray(a) && probeSatz(a);
    band = c.art === 'einstufung' ? 'Merken wir uns' : info.nochmal ? (satz && /Probe/.test(satz) ? 'Mach die Probe' : 'Schau noch einmal') : 'So geht’s';
    if (!info.nochmal && c.art !== 'einstufung') {
      const k = Array.isArray(a) ? Math.max(0, r.teile.findIndex(x => !x.ok)) : -1;
      body += k >= 0 ? hinweisHTML(r.teile[k]) + wegHTML(a[k].weg) : hinweisHTML(r) + wegHTML(a.weg);
    }
    // Papier, nach dem ersten falschen Ergebnis (Lernauftrag 2d: Probe gemacht, aber nicht genutzt)
    if (info.nochmal) body = `<p class="answer-line">${esc(satz || 'Schau dir deine Rechnung im Heft noch einmal an.')} Dann tipp das Ergebnis noch einmal.</p>`;
  }
  const notizen = [];
  if (info.ch && info.ch.to !== info.ch.from) notizen.push(`<p class="sched ${info.ch.to > info.ch.from ? 'up' : ''}">${esc(typTitel(c.typ))}: ${stufeText(info.ch.from)} → ${stufeText(info.ch.to)}</p>`);
  if (info.nachsicht) notizen.push('<p class="note">Gleich kommt die Revanche. Stimmt sie, bleibt deine Stufe.</p>');
  if (info.nachsichtOk) notizen.push('<p class="sched up">Deine Stufe bleibt.</p>');
  if (info.zwilling && !info.nachsicht) notizen.push('<p class="note">Gleich kommt die Revanche.</p>');
  if (info.luecke) notizen.push(`<p class="note">${ruhePhase() ? 'Das üben wir gleich noch einmal Schritt für Schritt.' : 'Morgen lernst du dafür einen neuen Trick.'}</p>`);
  if (info.ls === 'ok') notizen.push(`<p class="sched up">Neuer Trick sitzt: ⅓. ${info.kurz ? 'Weiter geht’s im Heft.' : 'Morgen kommt er gemischt.'}</p>`);
  // Am Tag vor der Generalprobe gibt es danach keinen neuen Lernschritt mehr – die Probe fragt den Typ aber ab
  if (info.ls === 'morgen') notizen.push(`<p class="note">${addDays(today(), 1) === pruefTag() ? 'Morgen kommt das in der Generalprobe noch einmal.' : 'Morgen machen wir das mit Hilfe weiter.'}</p>`);
  E.card.className = 'vcard';
  const nochmalHTML = !info.nochmal ? ''
    : Array.isArray(a) || a.eingabe === 'ordnen' || a.eingabe === 'strahl' ? '' : aufgabeHTML(a) + '<div class="anz-zeile"><output class="anz" id="anz"></output></div>';
  E.card.innerHTML = `<div class="band ${cls}">${esc(band)}</div><div class="cbody">${nochmalHTML}${titel}${body}${notizen.join('')}</div>`;
  if (info.nochmal && (Array.isArray(a) || a.eingabe === 'ordnen' || a.eingabe === 'strahl')) {
    // zweiter Versuch bei Vergleich, Ordnen, Zahlenstrahl: die Aufgabe noch einmal ganz zeigen
    SES.phase = 'answer';
    renderAufgabe();
    const kopf = E.card.querySelector('.band span');
    if (kopf) kopf.textContent = 'Noch einmal';
    return;
  }
  if (info.nochmal) { E.pad.hidden = false; zeigeEingabe(); E.next.hidden = true; }
  else { E.pad.hidden = true; E.next.hidden = false; E.next.textContent = 'Weiter'; }
  if (E.ziel) { const p = zielStand().prozent; if (E.ziel.textContent !== p + ' %') { E.ziel.textContent = p + ' %'; restartAnim(E.ziel, 'bump'); } }
  fortschrittBalken();
}
function weiter() {
  if (!SES) return;
  if (SES.phase === 'beispiel') { SES.cur.schritt = 'eins'; return zeigeSchritt(); }
  if (SES.phase === 'zwischen') { SES.phase = ''; SES.teil = 'runde'; SES.queue = rundeQueue(tagesPlan()); SES.cur = null; return next(); }
  if (SES.phase === 'feedback') next();
}

// Nach der Einstufung: zuerst, was schon sitzt (keine Punkte, kein Prozent, keine Uhr, kein Rot), dann weiter mit den
// neuen Tricks des Tages – oder Schluss, wenn heute keine dran sind
function einstufungZwischen() {
  const ids = Object.keys(SES.einst);
  const kann = ids.filter(id => S.f[id] && S.f[id].lv >= 2);
  const halb = ids.filter(id => S.f[id] && S.f[id].lv === 1);
  const neu = ids.filter(id => S.f[id] && S.f[id].lv === 0);
  const offen = einstufungOffen().length;
  save();
  const plan = tagesPlan();
  const weiterGeht = rundeOffen(plan) && !plan.einstufung.length;
  SES.phase = weiterGeht ? 'zwischen' : 'feedback';
  E.card.className = 'vcard pop';
  E.card.innerHTML = `<div class="band good">Einstufung geschafft!</div><div class="cbody">
    ${kann.length ? `<p class="answer-line"><b>Das kannst du schon:</b></p><ul class="kann">${kann.map(id => `<li>${stufeHTML(2)} ${esc(typTitel(id))}</li>`).join('')}</ul>` : ''}
    ${halb.length ? `<p class="answer-line"><b>Fast:</b></p><ul class="kann">${halb.map(id => `<li>${stufeHTML(1)} ${esc(typTitel(id))}</li>`).join('')}</ul>` : ''}
    ${neu.length ? `<p class="note">${neu.length} ${neu.length === 1 ? 'Aufgabenart lernst du' : 'Aufgabenarten lernst du'} als neue Tricks, ein paar jeden Tag.</p>` : ''}
    ${offen ? `<p class="note">${offen} ${offen === 1 ? 'Aufgabenart kommt' : 'Aufgabenarten kommen'} morgen zuerst dran.</p>` : ''}
  </div>`;
  E.pad.hidden = true;
  E.next.hidden = false;
  E.next.textContent = weiterGeht ? 'Weiter mit den neuen Tricks' : 'Fertig';
  if (!weiterGeht) { SES.teil = 'runde'; SES.queue = []; SES.cur = null; }
}

function quit() {
  if (!SES) return home();
  if (SES.fertig > 0) finish(true);
  else home();
}

// ================================================================
// Rundenende
// ================================================================
function finish(abgebrochen = false) {
  const s = SES;
  if (!s) return home();
  const z = zielStand();
  markDay();
  if (s.fertig > 0 && s.mode !== 'ueben') S.stats.sessions++;
  const neu = meilensteine(z);
  save();
  SES = null;
  screen = 'summary';
  document.body.classList.remove('in-session');
  const plan = tagesPlan();
  const m = missionHeute(plan);
  const geschafftJetzt = m.fertig && !s.missionVorher && m.getan;
  let titel = abgebrochen ? 'Pause' : s.mode === 'papier' ? '② geschafft!' : s.mode === 'probe' ? 'Generalprobe eingetippt!' : 'Runde geschafft!';
  if (geschafftJetzt) titel = 'Mission geschafft!';
  const zahlen = s.mode === 'ueben' || s.mode === 'aufwaermen' ? '' : `<p class="zsum-zahlen"><span>${s.zielVorher.prozent} %</span><b>→</b><span class="neu">${z.prozent} %</span></p>`;
  const fehlerSatz = s.falsch && s.revanche ? `${s.falsch} Fehler, ${s.revanche} ${s.revanche === 1 ? 'Revanche' : 'Revanchen'} gewonnen – so bleibt’s hängen.` : '';
  const offenThemen = z.gemessen.filter(x => !x.ueber);
  const bereitSatz = z.bereit ? 'BEREIT – alle Themen über der Linie!' : z.fast ? `Alle Themen über der Linie. Nach der Generalprobe ${probeTagText()} heißt das: BEREIT.`
    : offenThemen.length && offenThemen.length <= 4 ? `Noch ${offenThemen.length} ${offenThemen.length === 1 ? 'Thema' : 'Themen'} bis zur Linie: ${offenThemen.map(x => x.th.titel).join(', ')}.` : '';
  if (s.mode === 'probe' && !abgebrochen) {
    afterRound();
    probeErgebnisse(neu);   // ruft stopFx – das Konfetti erst danach
    if (neu.bereit || neu.perfekt) confetti();
    return;
  }
  let missionTxt = '';
  if (m.fertig && m.getan) missionTxt = '<p class="mstand">Für heute ist Schluss. Morgen: ① Runde, ② Papier.</p>';
  else if (m.papier && m.papier.offen && !m.rundeOffen) missionTxt = `<p class="mstand">Jetzt noch ②: ${m.papier.art === 'probe' ? 'die Generalprobe' : 'Papier'}.</p>`;
  else if (m.rundeOffen && m.papier && !m.papier.offen) missionTxt = '<p class="mstand">Jetzt noch ①: deine Runde.</p>';
  const knopf = m.papier && m.papier.offen && !m.rundeOffen
    ? `<button class="btn go big" type="button" data-act="${m.papier.art === 'probe' ? 'probe' : 'papier'}">${m.papier.art === 'probe' ? 'Zur Generalprobe' : 'Zum Papier'}</button>`
    : m.rundeOffen && !abgebrochen && s.mode !== 'runde' ? '<button class="btn go big" type="button" data-act="start">Zur Runde</button>' : '';
  app.innerHTML = `
  <section class="screen summary">
    <h1 class="outline hero center">${esc(titel)}</h1>
    ${neu.bereit ? '<p class="meilenstein gold">BEREIT! Du bist Mathe Legend.</p>' : ''}
    <div class="panel zsum">
      ${zahlen}
      ${fehlerSatz ? `<p>${esc(fehlerSatz)}</p>` : ''}
      ${bereitSatz ? `<p>${esc(bereitSatz)}</p>` : ''}
      ${missionTxt}
    </div>
    ${knopf}
    <button class="btn ${knopf ? '' : 'go'} big" type="button" data-act="home">${knopf ? 'Pause' : 'Fertig'}</button>
  </section>`;
  if (neu.bereit || neu.perfekt) confetti();
  afterRound();
}
// Generalprobe ausgewertet (Teil B): erst nach dem Eintippen aller Ergebnisse, zu jedem Fehler der Lösungsweg.
// Keine Punkte, keine Note: was saß, und was wir morgen üben.
// Richtige Lösung in der Auswertung der Probe: bei mehreren Feldern eine Zeile je Feld mit seinem Namen – in einer
// Zeile wäre das in der großen Schrift unlesbar lang („① Rechnung: (48 + 36) : 7 = 12, ① Ergebnis: 12, …“)
function richtigHTML(a) {
  if (a.eingabe === 'felder' && Array.isArray(a.felder) && a.felder.length > 1 && Array.isArray(a.loesung)) {
    const zeilen = a.felder.map((f, i) => {
      let t;
      try { t = MATHE.anzeigen({ ...a, eingabe: f.art || 'zahl', felder: undefined, loesung: a.loesung[i] }); } catch (e) { t = String(a.loesung[i]); }
      return `<li>${f.label ? `<small>${esc(f.label)}</small>` : ''}<b class="loesung">${esc(t)}</b></li>`;
    }).join('');
    return `<p class="answer-line">Richtig ist:</p><ul class="kann richtig">${zeilen}</ul>`;
  }
  return `<p class="answer-line">Richtig ist: <b class="loesung">${esc(loesungText(a))}</b></p>`;
}
// Der Probe-Satz passt nur zu Rechnungen (Ergebnis rückwärts nachrechnen), nicht zu Kürzeln, Ordnen oder Ablesen
function probeSatz(a) {
  const term = String((a && a.term) || '');
  if (/^Ü/.test(term)) return '';                                   // Überschlag: keine Probe
  if (/·/.test(term)) return 'Kann das stimmen? Schau die Stellen und Überträge an.';   // im Heft bei · keine Probe (H1)
  if (/[+\-−:]/.test(term) || (a && PAPIER_TEXT.has(a.typ))) return 'Mach die Probe: Kommt genau die Ausgangszahl heraus?';
  return '';
}
function probeErgebnisse(neu = {}) {
  const probe = PROBE;
  if (!probe) return home();
  const st = S.papier[probe.id] || { erg: {} };
  screen = 'probe';
  stopFx();
  document.body.classList.remove('in-session');
  const fehler = probe.aufgaben.filter(a => st.erg[a.nr] && !st.erg[a.nr].ok);
  const offen = probe.aufgaben.filter(a => !st.erg[a.nr]).length;
  const richtig = probe.aufgaben.length - fehler.length - offen;
  const fehlerHTML = fehler.map(a => `<div class="pfehler">
      <p class="answer-line"><b>Aufgabe ${esc(a.nr)}</b>${a.term || a.kurz ? ` · ${umbruch(esc(a.term || a.kurz))}` : ''}</p>
      ${a.text && !a.term ? `<p class="fineprint">${umbruch(esc(a.text))}</p>` : ''}
      ${richtigHTML(a)}
      ${wegHTML(a.weg)}
      ${probeSatz(a) ? `<p class="fineprint">${probeSatz(a)}</p>` : ''}
    </div>`).join('');
  const dauer = SA && SA.dauer ? ` · echte Schularbeit ${SA.dauerAnnahme ? 'ca. ' : ''}${SA.dauer} Min.` : probe.minuten ? ` · geplant ca. ${probe.minuten} Min.` : '';
  app.innerHTML = `<section class="screen probe">${topbar(esc(probe.titel || 'Generalprobe'))}
    ${neu.bereit ? '<p class="meilenstein gold">BEREIT! Du bist Mathe Legend.</p>' : ''}
    <div class="panel prose">
      <p><b>Das saß: ${richtig} ${richtig === 1 ? 'Aufgabe' : 'Aufgaben'} ✓</b></p>
      <p class="fineprint">Gebraucht: ${probeMinuten(st)} Min.${esc(dauer)}</p>
      ${offen ? `<p>${offen} ${offen === 1 ? 'Ergebnis fehlt' : 'Ergebnisse fehlen'} noch.</p>` : ''}
    </div>
    ${fehler.length ? `<div class="panel"><h2 class="sheet-title">${today() === pruefTag() ? 'Das üben wir morgen' : 'So gehen deine Fehler'}</h2>${fehlerHTML}</div>` : '<div class="panel"><p class="lead">Alles richtig. Stark!</p></div>'}
    ${offen ? '<button class="btn go big" type="button" data-act="probeEintippen">Weiter eintippen</button>' : ''}
    <button class="btn ${offen ? '' : 'go'} big" type="button" data-act="home">Fertig</button></section>`;
}

// ================================================================
// Sicherung: Code kopieren, Code einfügen, Fortschritt löschen
// ================================================================
async function exportCode() {
  const code = CODE_PREFIX + btoa(unescape(encodeURIComponent(JSON.stringify(S))));
  try {
    await navigator.clipboard.writeText(code);
    toast('Code kopiert. Am besten in eine Notiz einfügen.');
  } catch (e) {
    sheet(`<h2 class="sheet-title">Dein Sicherungs-Code</h2><p>Alles markieren und kopieren:</p><textarea class="code" readonly>${esc(code)}</textarea>`,
      [{ label: 'Fertig', value: null, cls: 'go' }]);
  }
}
// Das Sheet schließt sich vor dem Auslesen: Den Text darum schon beim Tippen mitschreiben
let importBuffer = '';
document.addEventListener('input', e => { if (e.target && e.target.id === 'imp') importBuffer = e.target.value; });
async function importCode() {
  importBuffer = '';
  const val = await sheet(`<h2 class="sheet-title">Code einfügen</h2><p>Achtung: Das ersetzt den Fortschritt auf diesem Gerät.</p><textarea class="code" id="imp" placeholder="${CODE_PREFIX}…" autocapitalize="none" autocorrect="off" spellcheck="false"></textarea>`,
    [{ label: 'Wiederherstellen', value: 'go', cls: 'go' }, { label: 'Abbrechen', value: null }]);
  if (val !== 'go') return;
  try {
    const txt = importBuffer.trim().replace(/\s+/g, '');
    if (!txt.startsWith(CODE_PREFIX)) throw new Error('falsches Präfix');
    const obj = JSON.parse(decodeURIComponent(escape(atob(txt.slice(CODE_PREFIX.length)))));
    if (!obj || typeof obj.f !== 'object' || !obj.settings) throw new Error(`kein ${APP_NAME}-Code`);
    S = upgrade(obj);
    if (STATUS) STATUS.kuerzen(S.log, today());
    save();
    toast('Fortschritt wiederhergestellt ✓');
    home();
  } catch (e) {
    toast(`Der Code passt nicht. Er beginnt mit ${CODE_PREFIX} – bitte ganz kopieren.`);
  }
}
async function resetAll() {
  const v = await sheet('<h2 class="sheet-title">Fortschritt löschen?</h2><p>Alle Stufen und Papier-Ergebnisse gehen verloren. Name und Einstellungen bleiben.</p><p class="fineprint">Tipp: Vorher „Code kopieren“, dann lässt sich alles wiederherstellen.</p>',
    [{ label: 'Ja, alles löschen', value: 'yes', cls: 'danger' }, { label: 'Abbrechen', value: null, cls: 'go' }]);
  if (v !== 'yes') return;
  const d = fresh();
  d.settings = S.settings;
  d.ui = { ...d.ui, hideInstall: S.ui.hideInstall, onboarded: S.ui.onboarded, start: S.ui.start, neues: S.ui.neues };
  S = d;
  save();
  toast('Alles zurückgesetzt.');
  home();
}

// ================================================================
// Lagebericht und Eltern-Verbindung (Legends HQ)
// Vertrag: apps/legends-hq/docs/schnittstelle.md. Typen sind die Karten; Stufe 0 läuft als neuOffen (Lernmodell Teil A).
// Kein fortschritt.schreiben: Legends HQ sagte sonst „Schreibauftrag“, „Text wartet aufs Herzeigen“ (Technik-Plan).
// Der Plan wird erst nach der Einstufung eingefroren (plaene erst dann).
// ================================================================
function goalText(test) {
  if (!test) return 'alles';
  const [, m, d] = test.datum.split('-');
  return (/schularbeit/i.test(test.titel) ? 'Schularbeit ' : 'Test ') + d + '.' + m + '.';
}
function einstufungFertig() { return ZIEL_APP.every(id => S.f[id]) || (!!S.ui.e1 && today() > addDays(S.ui.e1, 1)); }
function fortschrittBericht(z = zielStand()) {
  return { prozent: z.prozent, bereit: z.bereit, perfekt: z.perfekt, balken: z.bereiche.map(x => ({ id: x.b.id, titel: x.b.titel, prozent: x.prozent })) };
}
function berichtEingabe() {
  vorStartTage();
  const test = nextTest();
  const plan = tagesPlan();
  const pi = papierInfo();
  const mitStufe = id => S.f[id] && S.f[id].lv >= 1;
  const imUmfang = id => ZIEL_SET.has(id) || EXTRA_SET.has(id);
  const alle = Object.keys(S.f).filter(id => TYP[id] && imUmfang(id));
  return {
    app: APP_ID, name: APP_NAME, version: VERSION,
    heute: today(), zeit: clock(),
    test,
    ziel: goalText(test),
    karten: alle.filter(mitStufe).map(id => {
      const s = S.f[id];
      return { lv: s.lv, due: effDue(id), last: s.last, since: s.since, imZiel: ZIEL_SET.has(id), label: typTitel(id), ok: s.ok || 0, bad: s.bad || 0 };
    }),
    neuOffen: { ziel: ZIEL.filter(id => !mitStufe(id)).length, gesamt: [...ZIEL, ...EXTRA].filter(id => !mitStufe(id)).length },
    // Mission = Runde (Einstufung, Lernschritte, Wiederholungen) und ② Papier (zählt als eine neue Aufgabe).
    // Am Testtag ist nichts offen (Aufwärmen ist freiwillig).
    heuteOffen: plan.phase === 'testtag' ? { faellig: 0, neu: 0 }
      : { faellig: plan.wdh.length, neu: plan.einstufung.length + plan.lernschritte.length + (pi && pi.offen ? 1 : 0) },
    regeln: Object.assign({}, MODELL.ampel),
    fortschritt: fortschrittBericht(),
    log: S.log,
    plaene: einstufungFertig() ? S.plaene : null
  };
}
// Ende einer Runde: den Tag ins Protokoll schreiben (Mission fertig?), dann melden und sichern
function afterRound() {
  if (!STATUS) return;
  setTimeout(() => {
    try { PLAN = null; planNow(); } catch (e) { console.warn('Lagebericht:', e); }
    hqReport({ backup: true });
  }, 350);
}
// Melden (und auf Wunsch sichern), nur mit Verbindung. Nie blockierend, Fehler bleiben still.
let hqBusy = false, hqQueued = null;
let hqLastOk = 0;
async function hqReport(opt = {}) {
  if (!SYNC || !STATUS || !SYNC.verbunden()) return;
  if (opt.pause && Date.now() - hqLastOk < opt.pause) return;
  if (hqBusy) { hqQueued = { backup: !!(opt.backup || (hqQueued && hqQueued.backup)) }; return; }
  hqBusy = true;
  try {
    const p = planNow();
    const r = await SYNC.melden({ ...p.bericht, zeit: clock() });
    if (r.ok) hqLastOk = Date.now();
    if (opt.backup) await SYNC.sichern(JSON.parse(JSON.stringify(S)), { tag: today(), version: VERSION });
  } catch (e) { /* still */ }
  hqBusy = false;
  hqShowState();
  if (hqQueued) { const o = hqQueued; hqQueued = null; hqReport(o); }
}
function hqWhen(s) {
  if (!s) return '';
  const [d, hm] = s.split(' ');
  if (d === fmt(new Date())) return hm;
  const [, m, dd] = d.split('-').map(Number);
  return `${dd}.${m}. ${hm}`;
}
function hqStateHTML() {
  const z = SYNC.zustand();
  const parts = ['verbunden', z.gemeldet ? 'gemeldet ' + hqWhen(z.gemeldet) : 'noch nicht gemeldet'];
  if (z.gesichert) parts.push('gesichert ' + hqWhen(z.gesichert));
  return `<b>${esc(parts.join(' · '))}</b>${z.fehler ? `<small>Zuletzt hat es nicht geklappt: ${esc(z.fehler)}. Die App versucht es beim nächsten Mal wieder.</small>` : ''}`;
}
function hqShowState() {
  const el = $('#hq-state');
  if (el && SYNC && SYNC.verbunden()) el.innerHTML = hqStateHTML();
}
function hqPanelHTML() {
  const head = `<div class="field"><b>Eltern-Verbindung</b>
    <small>Mama und Papa sehen, ob du im Plan bist – dasselbe wie auf deiner Startseite. Es gehen nur Zahlen weg, keine Antworten und kein Name. Die Sicherung ist verschlüsselt.</small></div>`;
  if (!SYNC) return head + '<p class="fineprint">Gerade nicht verfügbar. Öffne die App einmal mit Internet.</p>';
  if (!SYNC.verbunden()) {
    return head + `<form class="hq-form" id="hq-form" autocomplete="off" novalidate>
      <input id="hq-code" type="text" placeholder="Verbindungs-Code (HQ1:…)" aria-label="Verbindungs-Code" autocomplete="off" autocorrect="off" autocapitalize="none" spellcheck="false" enterkeyhint="done">
      <button class="btn go" type="submit">Verbinden</button>
    </form>`;
  }
  return head + `<p class="hq-state" id="hq-state" aria-live="polite">${hqStateHTML()}</p>
    <div class="hq-btns">
      <button class="btn" type="button" data-act="hqRestore">Aus Sicherung holen</button>
      <button class="link" type="button" data-act="hqDisconnect">Verbindung trennen</button>
    </div>`;
}
async function hqConnect() {
  const input = $('#hq-code'), btn = $('#hq-form .btn');
  if (!input || !SYNC) return;
  const code = input.value.trim();
  if (!code) { shake(input); input.focus(); return; }
  input.blur();
  btn.disabled = true;
  btn.textContent = 'Verbinde …';
  const r = await SYNC.verbinden(code);
  if (!r.ok) {
    toast(r.fehler || 'Verbinden hat nicht geklappt.');
    if (btn.isConnected) { btn.disabled = false; btn.textContent = 'Verbinden'; }
    return;
  }
  toast('Verbunden ✓');
  if (screen === 'settings') settings();
  hqReport({ backup: true });
}
let hqRestoring = false;
async function hqRestore() {
  if (!SYNC || hqRestoring) return;
  hqRestoring = true;
  const btn = app.querySelector('[data-act="hqRestore"]');
  if (btn) { btn.disabled = true; btn.textContent = 'Hole Sicherung …'; }
  let daten = null, fehler = '';
  try { daten = await SYNC.holen(); }
  catch (e) {
    const net = !e || e.name === 'TypeError' || e.name === 'AbortError';
    fehler = e && e.status === 404 ? 'Es gibt noch keine Sicherung.'
      : e && e.status === 401 ? 'Der Code passt nicht mehr zum Server.'
      : e && e.status ? 'Der Server hat gerade ein Problem. Probier es später nochmal.'
      : net ? 'Holen hat nicht geklappt. Ist Internet da?'
      : 'Die Sicherung lässt sich nicht öffnen.';
  }
  hqRestoring = false;
  if (btn && btn.isConnected) { btn.disabled = false; btn.textContent = 'Aus Sicherung holen'; }
  if (fehler) return toast(fehler);
  const st = daten && daten.stand;
  if (!st || daten.app !== APP_ID || !st.f || typeof st.f !== 'object' || !st.settings) return toast(`Die Sicherung passt nicht zu ${APP_NAME}.`);
  const v = await sheet(`<h2 class="sheet-title">Aus Sicherung holen?</h2>
    <p>Sicherung vom <b>${isDay(daten.tag) ? esc(dateLabel(daten.tag)) : 'unbekannten Tag'}</b> mit ${Object.keys(st.f).length} Aufgabenarten.
      Auf diesem Gerät: ${Object.keys(S.f).length}${isDay(S.stats.lastDay) ? `, zuletzt geübt ${esc(dateLabel(S.stats.lastDay))}` : ''}.</p>
    <p>Achtung: Das ersetzt den Fortschritt auf diesem Gerät.</p>`,
    [{ label: 'Wiederherstellen', value: 'go', cls: 'go' }, { label: 'Abbrechen', value: null }]);
  if (v !== 'go') return;
  S = upgrade(st);
  if (STATUS) STATUS.kuerzen(S.log, today());
  save();
  toast('Fortschritt wiederhergestellt ✓');
  home();
}
async function hqDisconnect() {
  const v = await sheet(`<h2 class="sheet-title">Verbindung trennen?</h2>
    <p>Dann bekommen Mama und Papa keine Meldungen und keine Sicherungen mehr von ${esc(APP_NAME)}. Dein Fortschritt bleibt auf diesem Gerät.</p>`,
    [{ label: 'Verbunden bleiben', value: null, cls: 'go' }, { label: 'Trennen', value: 'yes' }]);
  if (v !== 'yes' || !SYNC) return;
  SYNC.trennen();
  toast('Verbindung getrennt.');
  if (screen === 'settings') settings();
}

// ================================================================
// Aktionen: jeder Knopf hat data-act, hier steht, was er tut
// ================================================================
const ACT = {
  home: () => home(),
  start: () => startRunde(),
  ueben: () => startUeben(),
  aufwaermen: () => startAufwaermen(),
  thema: b => themaSheet(b.dataset.id),
  settings: () => settings(),
  about: () => about(),
  // Runde
  taste: b => taste(b.dataset.k),
  feld: b => feldWahl(b),
  orein: b => ordnenTippen(b, true),
  oraus: b => ordnenTippen(b, false),
  strich: b => strichTippen(b),
  vgl: b => vglWahl(b),
  weiter: () => weiter(),
  quit: () => quit(),
  tipp: () => tipp(),
  weissNicht: () => weissNicht(),
  // Papier und Probe
  papier: () => papierScreen(),
  papierEintippen: () => startPapierEintippen(),
  probe: () => probeScreen(),
  probeStart: () => {
    const p = probeHeute() || PROBE;
    if (!p) return home();
    const st = S.papier[p.id] || (S.papier[p.id] = { tag: today(), erg: {}, probe: true });
    if (!st.start) { st.start = Date.now(); save(); }
    probeScreen();
  },
  probeFertig: () => {
    const p = probeHeute() || PROBE;
    const st = p && S.papier[p.id];
    if (st && !st.ende) { st.ende = Date.now(); st.minuten = probeMinuten(st); save(); }
    probeScreen();
  },
  probeEintippen: () => startProbeEintippen(),
  probeAnsehen: () => probeErgebnisse(),
  // Einstellungen
  clearTest: () => { S.settings.testDate = ''; S.settings.testSince = ''; save(); settings(); },
  hqRestore: () => hqRestore(),
  hqDisconnect: () => hqDisconnect(),
  exportCode: () => exportCode(),
  importCode: () => importCode(),
  reset: () => resetAll(),
  hideInstall: () => { S.ui.hideInstall = true; save(); home(); }
};
app.addEventListener('click', e => {
  const b = e.target.closest('[data-act]');
  if (!b || b.disabled) return;
  const fn = ACT[b.dataset.act];
  if (fn) fn(b, e);
});
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible') {
    if (screen === 'home') home();
    if (screen === 'probe') probeScreen();   // Uhr gleich nachstellen (im Hintergrund stehen Timer still)
    hqReport({ pause: 10 * 60e3 });
  } else if (STATUS && ZIEL.length) {
    // Beim Verlassen den Tag ins Protokoll schreiben – falls die Startseite heute nicht mehr kommt
    try { planNow(); } catch (e) { /* egal */ }
  }
});

// ================================================================
// Konsole – nur zum Testen am Mac (nicht am Handy des Kindes)
// ML.shiftDays(1) springt einen Tag weiter (nur in diesem Tab) · ML.tag() zeigt die Tagesmenge ·
// ML.gen(typ, seed) erzeugt eine Aufgabe · ML.check(typ, eingabe, seed) prüft eine Antwort
// ================================================================
window.ML = {
  get state() { return S; },
  today,
  version: VERSION,
  modell: MODELL,
  phase,
  daten: () => ({ typen: TYPEN.length, ziel: ZIEL.length, app: ZIEL_APP.length, papier: ZIEL_PAPIER.length, themen: THEMEN.length, probe: PROBE ? PROBE.aufgaben.length : 0, fehler: DATEN_FEHLER.slice() }),
  // Eine Aufgabe erzeugen (gleicher Seed → gleiche Aufgabe)
  gen(typ, seed = 1, zweck = 'runde') { const t = TYP[typ]; return t ? Object.assign(t.erzeuge(MATHE.zufall(seed), { zweck }), { typ, seed }) : `unbekannter Typ: ${typ}`; },
  // Antwort prüfen: ML.check('rs-runden', '4700', 5) – oder ML.check(aufgabe, eingabe); liefert auch fehlerart und hinweis
  check(typ, eingabe, seed = 1) { const a = typeof typ === 'object' ? typ : this.gen(typ, seed); return typeof a === 'string' ? a : { aufgabe: a.term, loesung: MATHE.anzeigen(a), ...MATHE.pruefe(a, eingabe) }; },
  tag() {
    const p = tagesPlan(), m = missionHeute(p), z = zielStand();
    return {
      tag: today(), wochentag: DAY_SHORT[weekdayOf(today())], phase: p.phase, testIn: testIn(),
      mission: p.phase === 'testtag' ? 'Testtag (keine Mission)' : `${m.rundeOffen ? '○' : '✓'} Runde${m.papier ? ` · ${m.papier.offen ? '○' : '✓'} ${m.papier.art}` : ''}${m.fertig ? ' · geschafft' : ''}`,
      einstufung: p.einstufung, lernschritte: p.lernschritte, wdh: p.wdh, extra: p.extra || [], aufwaermen: p.aufwaermen, min: Math.round(p.sek / 6) / 10,
      papier: m.papier, papierTypen: papierTypenHeute(), ziel: z.prozent, sicher: z.sicherN, ueber: z.ueberN, bereit: z.bereit, fast: z.fast,
      lsQuote: S.day.lsQuote, schonMin: Math.round(heuteSek() / 6) / 10, nurPapier: NUR_PAPIER.slice()
    };
  },
  ziel: () => zielStand(),
  // HTML einer Aufgabe (Text, Bild, term) wie in der Karte – zum Prüfen von Umbruch und Breite: ML.karte(ML.gen('sw-zahlwort', 3))
  karte: a => aufgabeHTML(a),
  weg: w => wegHTML(w),
  // Stände setzen, nur zum Testen: ML.setze({ 'rs-runden': 2 }) – Stufe je Typ, fällig heute
  setze(map) {
    for (const [id, lv] of Object.entries(map)) {
      if (!TYP[id]) continue;
      einstufen(id, Math.min(2, lv));
      Object.assign(S.f[id], { lv, due: today(), last: addDays(today(), -1), since: addDays(today(), -1) });
    }
    save();
    if (screen === 'home') home();
    return Object.keys(map).length;
  },
  bericht() { if (!STATUS) return null; PLAN = null; return planNow().bericht; },
  urteil: opt => (STATUS ? STATUS.urteil(planNow().bericht, today(), opt) : null),
  eingabe: () => berichtEingabe(),
  melden: () => hqReport({ backup: true }).then(() => SYNC && SYNC.zustand()),
  get sync() { return SYNC && SYNC.zustand(); },
  get ses() { return SES && { cur: SES.cur, phase: SES.phase, auf: SES.auf, rest: SES.queue.map(x => x.art + ':' + x.typ), fertig: SES.fertig }; },
  shiftDays(n) {
    dayOffset += n;
    try { sessionStorage.setItem(DAY_KEY, String(dayOffset)); } catch (e) { /* egal */ }
    PLAN = null;
    if (screen === 'home') home();
    return today();
  }
};

// ================================================================
// Start
// ================================================================
save();   // ui.start festhalten
if (!S.ui.onboarded) welcome();
else home();
// Nach dem Start einmal melden (nur mit Verbindung), wenn die Startseite schon steht
setTimeout(() => hqReport(), 1500);

// Offline-Cache nur auf der echten Seite – lokal beim Entwickeln stört er (mit ?sw trotzdem testen)
const devHost = /^(localhost|127\.0\.0\.1)$/.test(location.hostname) && !/[?&]sw\b/.test(location.search);
if ('serviceWorker' in navigator && location.protocol.startsWith('http') && !devHost) {
  const sw = navigator.serviceWorker;
  const hadController = !!sw.controller;
  addEventListener('load', () => sw.register('sw.js', { updateViaCache: 'none' }).then(reg => {
    // iOS holt Web-Apps oft nur aus dem Hintergrund zurück, ohne sie neu zu starten – dann selbst nach Updates schauen
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') reg.update().catch(() => {});
    });
  }).catch(() => {}));
  // Neue Version übernommen: sofort neu laden, wenn man auf der Startseite ist – nie mitten in einer Runde
  sw.addEventListener('controllerchange', () => {
    if (!hadController) return;
    updateReady = true;
    if (screen === 'home') location.reload();
  });
}
if (navigator.storage && navigator.storage.persist) navigator.storage.persist().catch(() => {});
})();
