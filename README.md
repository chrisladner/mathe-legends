# Mathe Legends – Mathe-Trainer für die Schularbeit

Web-App (PWA) fürs iPhone: Jeden Tag eine Mission aus ① einer gemischten Runde in der App und ② ein paar Rechnungen im
Heft, deren Ergebnisse das Kind eintippt. Jede Aufgabenart hat Stufen (neu · ⅓ · ⅔ · sicher); „Ein Stunt kommt erst in
die Show, wenn er sicher sitzt.“ Kein App Store, kein Build-Schritt, keine Abhängigkeiten. Läuft offline, sobald sie
einmal geöffnet wurde. Gerüst aus Spell Legends (`dl-v8`) als Steinbruch.

**Stand `ml-v2` (16.11.2026): Lernlogik nach Teil B, alle Ansichten und die Generalprobe fertig (T1), echte Aufgabentypen
von T2, nicht veröffentlicht.**
Grundlage: `auftraege/2026-11-16_mathe-app.md` (Stoff 2d, Lernmodell Teil A und B in Abschnitt 3, Erlebnis in 4,
Entscheidungen in 5, Technik-Plan in 6). OK der Eltern zum Bauen: 16.11., 21:10 („ja so bauen mit 26“). Noch offen:

| Was fehlt | Wer | Wo es hinkommt |
|---|---|---|
| Feinschliff der Aufgabentypen (26 Kern- und 4 Extra-Typen sind da) | T2 (technik) | `aufgaben.js`, `tools/aufgaben-pruefen.mjs`, `tools/ids.txt` |
| Echte Dauer der Schularbeit (heute **Annahme 50 Min.**, die App schreibt „ca.“) | Eltern | `schularbeit.js` → `dauer`, dann `dauerAnnahme: false` |
| Buch-Beleg bestätigen (heute zs-ablesen, rs-runden, add-schriftlich) | `fachdidaktik` | `schularbeit.js` → `einstufung.beleg` |
| Rückmeldetexte je Fehlerart (Lernauftrag 2a) | T2 | `MATHE.fehlerTexte` oder `pruefe() → hinweis`; die App zeigt sie schon |
| Lagebericht auswerten (`ML1:`) | technik, später | `werkzeuge/lernstand.mjs` |

## Aufs iPhone

1. In **Safari** die veröffentlichte Adresse öffnen.
2. Teilen-Symbol → **„Zum Home-Bildschirm“**.
3. Ab jetzt nur noch über das Icon starten (mit Internet beim ersten Mal). Dort unter Einstellungen den
   Verbindungs-Code für Legends HQ einfügen. Der Fortschritt liegt in der Home-Bildschirm-App, getrennt vom Safari-Tab.
   Sicherung: Einstellungen → „Code kopieren“ (beginnt mit `ML1:`).
4. Der Repo-Name ist die Adresse und damit der Speicher: nach der Installation nie mehr umbenennen.

## Wie gelernt wird (Lernmodell Teil A und B, alle Werte in `MODELL` oben in `app.js`)

| Baustein | Umsetzung |
|---|---|
| Lerneinheit | Aufgabentyp (`aufgaben.js` → `MATHE.typen`), nicht Karte. Die App erzeugt jede Aufgabe neu (Zufall mit Seed). `schularbeit.js` → `typen`: die 26 Kern-Typen (zählen für BEREIT), `extra`: geübt, zählen nie |
| Stufen | 0 neu · 1 ⅓ · 2 ⅔ · 3 sicher · 4–6 nach dem Test. Pausen 1 · 1 · 2 · 7 · 14 · 30 Tage, höchste Stufe 60 |
| Aufstieg | nur durch den ersten Versuch des Tages in der gemischten Runde, ohne Tipp. Einstufung, Lernschritt, Tipp und Zwilling heben nie darüber hinaus |
| Fehler | −1 Stufe, nie unter ⅓, morgen wieder. Nach 3 anderen Aufgaben kommt ein **Zwilling** (gleicher Typ, neue Zahlen, nur Übung). Ist auch er falsch: **Lücke** → Mi–Fr Lernschritt am nächsten Tag, Sa/So gleich in derselben Runde. Höchstens 2 Fehler je Typ und Runde. Eine offene Lücke kommt nie gemischt, nur als Lernschritt |
| Einstufung | 2 Aufgaben je Typ (Schularbeits-Niveau), mit Buch-Beleg (`einstufung.beleg`) 1: richtig → ⅔, falsch → ⅓. Reihenfolge `einstufung.reihenfolge` (Teil B: zs-ablesen und rs-runden zum Aufwärmen, …, zuletzt die vier mul-kopf). „Weiß ich noch nicht“ = 0; 2 von 2 → ⅔, 1 → ⅓, 0 → Lernschritt. Zwei Typen eines Themas auf 0 → die schwereren ohne Frage auf 0. Höchstens 12 Min., der Rest am nächsten Tag zuerst. Papier-Typen stufen sich in ② ein (1 von 1 → ⅓, mit Beleg ⅔) |
| Lernschritt | Beispiel → Aufgabe mit vorgegebenem 1. Schritt → selbst, bis zwei in Folge richtig (= ⅓); höchstens 6 Aufgaben, sonst „morgen mit Hilfe“. **Papier-Typ kurz** (Prüfung Runde 1): Beispiel mit Rechenweg (bei ta-ganz mit geg/ges/A), dann 1 Aufgabe mit vorgegebenem 1. Schritt; richtig → ⅓, falsch → morgen noch einmal kurz. Ein Papier-Typ, der in ② auf 0 fällt, wartet bis morgen. Reihenfolge: `lernFolge`, dann Voraussetzung, dann Gewicht. Menge je Tag, einmal am Tag festgelegt (`S.day.lsQuote`): am Tag der Einstufung höchstens 2, danach höchstens 8 – beides nur, soweit der **Tagesdeckel** reicht; was nicht passt, kommt am nächsten Tag. Neue Lernschritte bis Test − 3 (Fr, Überlauf: ohne die Grenze 8, ② und Extra werden dafür zuerst kleiner; was auch dann nicht passt, bleibt neu); **Sa/So keine neuen, nur Lücken**. Gezählt wird ein Lernschritt erst, wenn er beendet ist |
| Tagesdeckel | Mi–Fr höchstens 30 Min. geschätzt (`MODELL.deckelMin`): Gemachtes + Einstufungsrest + Lücken + Fällige + ② (Heft und 15 s Eintippen je Ergebnis) + neue Lernschritte + Extra. Schätzung: erster Kontakt `sekNeu`, sonst `sek`; Lernschritt = Beispiel 30 s + 5 Aufgaben (mindestens 40 s), Papier-Typ Beispiel + 1 Aufgabe. Was zuerst rutscht: neue Lernschritte, dann Extra; am Fr zuerst ② und Extra. Die Mission zeigt dieselben Minuten (vor der Einstufung mit einer Vorschau auf die Lernschritte) |
| Mischen | nach dem ersten Kontakt nur gemischt; höchstens 40 % geblockt; nie zweimal derselbe Typ hintereinander; Verwechselbares (`nah`) nah beieinander; **keine Überschrift und keine Themenfarbe vor der Antwort** (der Name des Typs steht erst in der Rückmeldung) |
| Dreierpack | `< > =` kommt als Pack aus 3; Aufstieg nur bei 3 von 3; jeder falsche Teil ist ein Fehler; in `quote7` zählen die Teile einzeln |
| Extra | ab Test − 3 (Fr) hinten an der Runde, höchstens 5 Min. und nur im Rest des Tagesdeckels (`S.day.xSek`): zuerst noch nie Gesehenes, dann Fälliges. Erster Kontakt ohne Einstufung auf ⅓. Zählen nie für BEREIT und halten die Mission nicht offen |
| Kalender | Mi–Fr neue Lernschritte (Fr Überlauf) · Fr dazu Extra · **Sa (Test − 2) Generalprobe**, die Runde fragt nur, was die Probe nicht abfragt; danach Ruhe bis nach dem Test · **So (Test − 1)** nur Fehler seit Sa (Lücken, Probe-Fehler); eine am Sa angefangene Probe lässt sich noch eintippen · Mo Testtag: keine Mission, **nichts stuft zurück**; freiwillig höchstens 10 Aufgaben aus den Fehlern vom So, ohne Fehler 5 aus verschiedenen Themen (zählen nie) |
| So-Nachsicht | Ein Fehler am So stuft nicht gleich zurück (`s.ns`): Stimmt der Zwilling bzw. der 2. Versuch auf Papier, bleibt die Stufe, sonst −1. Bleibt die Nachsicht offen, verfällt sie am Testtag ohne Folgen (BEREIT vom So-Abend bleibt) |
| Papier ② | Die App stellt Heft-Aufgaben, das Kind rechnet im Heft und tippt das Ergebnis. Am Tag der Einstufung neue Papier-Typen (`papier.rechnungen`, ohne `papier.spaeter`) und 1 Textaufgabe (`papier.text`); danach fällige Rechnungen, niedrigste Stufe zuerst (höchstens 3), und 1 Textaufgabe. Höchstens 12 Min. im Heft, beim ersten Kontakt mit `sekNeu`: Die Textaufgabe zuerst, dann Rechnungen, solange sie passen – am Mi heißt das add-, sub-, mul-schriftlich und ta-ganz, div-schriftlich-1 und -2 kommen am Do. Am Fr nur, was neben den Lernschritten im Tagesdeckel Platz hat. So nur Papier-Typen mit Fehler seit Sa. Der erste Versuch zählt, wenn der Typ fällig ist. Bei Fehler statt Zwilling ein 2. Versuch („Mach die Probe: Kommt genau die Ausgangszahl heraus?“, bei · „Kann das stimmen? Schau die Stellen und Überträge an.“), dann der Lösungsweg. Fertig, wenn alles eingetippt ist |
| Probe (Sa) | `schularbeit.js` → `probe`: 12 Aufgaben, 32 Einträge, jeder Kern-Typ mindestens einmal (fachdidaktik; Aufgaben- und Lösungsblatt in `auftraege/2026-11-16_mathe-app/inhalt/probe.md`, zum Ausdrucken, nicht im Repo). Uhr zählt mit und stoppt nicht (daneben die Dauer). Danach Ergebnisse eintippen (Muss), vor dem Lösungsblatt, ohne Rückmeldung je Aufgabe. Dann je Fehler die richtige Lösung (bei mehreren Feldern eine Zeile je Feld) und der Lösungsweg; Name der Aufgabe `term`, sonst `kurz`. Unter Fehlern bei +, − und : „Mach die Probe …“, bei · „Kann das stimmen? Schau die Stellen und Überträge an.“ (im Heft gibt es bei · keine Probe), beim Überschlag nichts. Sa und So über die Startseite wieder aufrufbar. Ein Fehler stuft zurück (Stufe 0 bleibt 0); richtig zählt wie eine gemischte Prüfung, ein noch neuer Typ (Stufe 0) kommt damit auf ⅓. Nicht in `quote7` |
| Zählen | Einstufung und Lernschritt zählen als neu (`zaehleNeu`), nicht in `quote7`; Zwilling, Tipp, Training und Probe nur als Zeit |

## Ziel-Karte und Mission (Erlebnis, Teil B Linie A)

- Große Zahl „geschafft“ = Mittel der Themen (jedes Thema gleich viel, darin jeder Typ gleich viel); Füllstand = Mittel der
  Stufen ⅓, ⅔, sicher. Darunter „★ N von M Aufgabenarten sicher“.
- „Deine 10 Themen“ wie auf dem Zettel: Balken mit karierter Linie bei ⅔. **Über der Linie** (Linie A: Füllstand
  mindestens ⅔, kein Typ mehr neu, jeder Typ schon gemischt geprüft, `s.g`) steht „bereit“. Rechts ein Stern je Typ,
  ★ = sicher. Papier-Typen unter ⅔ stehen eigens unter dem Balken („im Heft noch üben“). Antippen zeigt die Typen mit
  Stufe, was bis zur Linie fehlt, und die Extras.
- **BEREIT** = alle Themen über der Linie. Den Stempel gibt es erst am Abend des Prüftags (ab 18 Uhr oder sobald die Probe
  eingetippt ist), vorher und nach einem Abrutschen „FAST BEREIT“. Einmal Konfetti; PERFEKT = BEREIT und alle Kern-Typen
  sicher.
- Kasten „Deine Mission heute“: ① Runde (am ersten Tag „Einstufung“) und ② Papier bzw. am Sa „Generalprobe“. Ist die
  Runde leer und heute nichts gespielt (Sa, wenn die Probe alle Typen abfragt), steht nur ② da. Am Sa zuerst die Probe.
  Offen ○, erledigt ✓ in Lime, nie ✕ oder Rot. Kein Rot, keine Uhr in der Runde, keine Serien, keine XP.

## Ziffernfeld und Antwortformate

Keine iPhone-Tastatur in der Runde (kein `<input>`): Die Tasten gehören der App, nichts verdeckt die Aufgabe, und es gibt
Tasten, die das iPhone-Ziffernfeld nicht hat. Ziffern 1–9, 0, ⌫, Prüfen; Zusatztasten erscheinen je Format und je Feld:

| `eingabe` | Zusatztasten | Antwort an `MATHE.pruefe` |
|---|---|---|
| `zahl` | – | Text aus Ziffern |
| `rest` | R | `{ q, r }` |
| `term` | + − · : ( ) | Text, z. B. `(29+34):7` |
| `kuerzel` | Md HM ZM M HT ZT T H Z E | Text, z. B. `2HT 3T 7H 8Z` |
| `liste` | nächste Zahl | Liste von Texten |
| `felder` | nächstes Feld (Felder auch antippbar) | Liste, je Feld `zahl`, `term` oder `kuerzel` |
| `vergleich` | eigene Knöpfe `< = >` je Zeile in der Karte | Zeichen je Teil |
| `ordnen` | keine: Zahlen antippen, die App setzt `<` bzw. `>` dazwischen; Antippen in der Reihe nimmt die Zahl zurück | Liste der Zahlen in der getippten Reihenfolge (`positionen` markiert, was falsch steht) |
| `strahl` | keine: Striche am Zahlenstrahl antippen (Kreuz), noch einmal tippen nimmt es weg | Liste der markierten Werte (als Menge geprüft) |
| (`tasten: ['nm']`) | nicht möglich | `'nm'` |

- Führende Null gesperrt („0542“ gibt es nicht), die 0 allein geht. Jedes Kürzel nur einmal.
- Die Anzeige setzt Dreiergruppen selbst (Buch: ab 4 Stellen); geübt wird das auf Papier (Lernauftrag 2a).
- Kein „fast“ bei Zahlen: eine Ziffer daneben ist falsch. Die Rückmeldung zeigt die richtige Zahl in Dreiergruppen und
  markiert die Ziffern, die nicht stimmen; die falsche Zahl selbst steht nicht da.
- Mac-Tastatur zum Testen: Ziffern, Rücktaste, Enter, R, + - * / : ( ), Tab (nächstes Feld), < > =.
- Ab 3 Feldern sind die Felder kleiner; ragt die Eingabe trotzdem unter das Ziffernfeld (lange Aufträge der Probe bei
  375 × 667), rückt die Karte beim Zeigen hoch, das aktive Feld scrollt immer ins Bild. Die Tasten bleiben 48 px.
- Lange Zahlwörter brechen nur nach „hundert“, „tausend“, „Million(en)“ und „Milliarde(n)“ um (`<wbr>`, nur in Wörtern
  aus Zahlwort-Teilen); als Aufgabe stehen sie etwas kleiner (`.q.wort`), damit jedes Stück in die Zeile passt.
- `bild: { art: 'strahl', … }` zeigt über jeder Antwortart einen Zahlenstrahl (SVG, 320 breit), z. B. mit `felder` A, B, C
  zum Ablesen. Ein Typ, dessen Aufgabe ein Format oder Bild hat, das die App nicht kennt, kommt nicht in die Runde
  (`ML.tag().nurPapier`) – die App hängt nie.
- Lösungsweg `weg`: Zeilen als Text, `_…_` unterstreicht (erste Teilzahl wie im Heft), `{ mono: ['…'] }` ist eine
  Rechenspalte in fester Schrift (Kurzform der Division: nur Reste, „R“ unten, Probe „PR:“). Die Rechenspalte bekommt
  keine Nummer.

## Aufgabentypen (`aufgaben.js`, Vertrag im Dateikopf, `MATHE.version` 2)

`aufgaben.js` gehört T2 (Generatoren, Prüfung, `tools/aufgaben-pruefen.mjs`, Register `tools/ids.txt`). Kein DOM auf oberster
Ebene, nie `Math.random` im Generator. **ids und Fehlerarten nie ändern oder wiederverwenden** (sie stehen in `S.f[id]` und
`S.f[id].fa`); `dummy-…` ist für Platzhalter der lokalen Testseite reserviert. Was die App davon liest:

| Feld | Wofür in der App |
|---|---|
| Typ: `id`, `thema`, `titel`, `rang`, `wo`, `auswahl`, `nah`, `voraus`, `gewicht` | Ziel und Themen, Name erst nach der Antwort, Einstufung und Lernschritte, Dreierpack, Mischen. `wo: 'papier'` ist Pflicht für alles in `schularbeit.js` → `papier` (sonst meldet `ML.daten()` einen Fehler) |
| Typ: `sek`, `sekNeu` | Sekunden je Aufgabe: `sek` für die Regeln (12-Min.-Grenzen, Lernschritte, Extra), `sekNeu` für die Minuten-Anzeige beim ersten Kontakt (Einstufung, erstes ②, erstes Extra); ohne Angabe `MODELL.sek` |
| Aufgabe: `kennung` | gleiche kennung = gleiche Aufgabe: kommt in einer Runde nicht zweimal (ohne kennung zählt `term`); in ② kommt nichts, was schon auf einem Blatt stand (ta-ganz hat 10 feste Aufgaben) |
| Aufgabe: `text`, `term`, `eingabe`, `felder`, `tasten`, `loesung`, `alt` | Karte und Ziffernfeld (Formate oben); `term` kann leer sein |
| Aufgabe: `zahlen`, `richtung` (ordnen) · `ziel` (strahl) · `bild` | Ordnen-Ansicht · Striche zum Antippen · Zahlenstrahl `{ art: 'strahl', start, schritt, striche, beschriftet, kreuze }` |
| Aufgabe: `weg` | Lösungsweg in 2–3 Zeilen, bei ta-ganz bis 5 (geg/ges, a), b), Kurzform, A:). `weg[0]` ist Text: vorgegebener 1. Schritt im Lernschritt und der Tipp. `_…_` unterstrichen, `{ mono: ['…'] }` Rechenspalte |
| `MATHE.pruefe(aufgabe, eingabe)` | für alle Formate, auch ordnen und strahl: `ok`, `wert`, `teile` (felder, Dreierpack), `positionen` (ordnen), `fehlerart` (zählt in `S.f[id].fa`), `hinweis` |
| `hinweis` (aus `rueck` der Aufgabe oder `MATHE.fehlerTexte`) | Rückmeldetext vor dem Lösungsweg, im Dreierpack der des ersten falschen Teils; die App nimmt `MATHE.fehlerTexte[fehlerart]`, falls `hinweis` fehlt |
| `MATHE.anzeigen`, `format`, `schluessel`, `KUERZEL`, `zufall` | Lösung als Text, Dreiergruppen, Antwort auf dem ②-Blatt, Kürzel-Tasten, Zufall mit Seed (`schluessel` und `KUERZEL` mit Ersatz in der App) |

Ein älteres `aufgaben.js` (Version 1, z. B. auf der lokalen Testseite) prüft ordnen und strahl nicht: Dann prüft die App sie
selbst, ohne Fehlerart.

## Speicher (`localStorage['mathelegends.v1']`)

`settings` (name, testDate, testSince, sfx) · `f` (je Typ: lv, due, last, ok, bad, since; dazu c, cx, g, fz, ns, lk, ls,
lsN, fa; Extra-Typen genauso) · `papier` (Blätter `p-JJJJ-MM-TT` und die Probe: items, erg, fertig, start, ende;
②-Blätter nach 60 Tagen weg) · `stats` · `day` (date, ls, lsQuote, estop, esek, en, r, xSek) · `ui` (hideInstall, onboarded,
start, e1, bereit, perfekt, neues) · `log` ·
`plaene`. Neue Felder nur über `fresh()` und `upgrade()`; ein unlesbarer Stand wird als `mathelegends.v1.kaputt`
beiseitegelegt. Aufgaben der Runde werden nicht gespeichert (die Generatoren dürfen sich ändern), Papier-Aufgaben schon
(sie stehen im Heft).

## Termin, Plan-Karte, Legends HQ

- `schularbeit.js` → Termin „von Mama/Papa“ (in den Einstellungen gesperrt). `test.seit` = der spätere von `start` und
  dem ersten Start der App (`ui.start`): Rutscht die Installation, rechnet der Plan nicht mit Tagen ohne App.
  (Abweichung von plattform.md; ab der 2. Schularbeit wieder `eingetragen`.)
- Lagebericht: Typen sind die Karten, Stufe 0 läuft als `neuOffen`; Regeln `MODELL.ampel`. `heuteOffen.neu` = die
  Minuten der Einstufung umgerechnet (je 150 s eins, höchstens 12 Min.) + Lernschritte + 1 für ein offenes ②.
  **Kein `fortschritt.schreiben`** (Legends HQ sagte sonst „Schreibauftrag“, „Text wartet aufs Herzeigen“);
  `fortschritt.balken` = die 4 Bereiche vom Zettel. Eine Mission, die ohne gezählte Antwort fertig ist (Probetag), steht
  trotzdem als fertig im Protokoll (`log.f`).
- **Erststart** (Prüfung, 17.11.): Bis die Einstufung fertig ist, steht im Bericht kein Termin – also weder Prognose noch
  Plan; Legends HQ zeigt grau „Pause“, die Plan-Karte „Los geht's“. Am Installationstag ist vor dem ersten Übungstag
  (`start`) oder vor der ersten Antwort nichts offen (`heuteOffen` 0), damit HQ den Tag am nächsten Morgen nicht als
  ausgelassen zählt.
- **Plan**: Erst nach der Einstufung eingefroren (`plaene` erst dann im Bericht). Die App legt ihn selbst ab, bevor
  `bericht()` ihn rechnet (`planVorbereiten`): dieselbe Simulation aus `legends-status.js`, aber bis zum Tag nach der Probe
  (am Sa kommt dort jeder Typ dran, danach Ruhe wie in der App), Minuten höchstens wie der Tagesdeckel (30). Ohne das
  rechnete das Modell bis zum Vortag des Tests und meldete trotz jeder Mission „hinter dem Plan“.
- **Plan-Karte**: Hat das Kind seit dem ersten Übungstag jede Mission gemacht und die Ampel zeigt trotzdem Gelb oder Rot
  (Trefferquote, Abstand zum Modell), steht dort „Im Plan ✓“ statt „Aufholen“ oder „Notfallplan“, ohne den Satz „Das
  sehen Mama und Papa auch“.
- Legends HQ braucht für v1 keinen Deploy: Der Worker nimmt jede App-id, die Eltern-App zeigt unbekannte Apps mit Namen
  aus dem Bericht (Einheitsfarbe, ganz hinten). Lokal: `apps/legends-hq/tools/dev.mjs` kennt Port 8771.
- `legends-status.js`, `legends-sync.js` sind Kopien aus `apps/legends-hq/shared/` – **hier nie von Hand ändern**
  (dort ändern, dann `node tools/verteilen.mjs` in `apps/legends-hq`; das Ziel `mathe-legends` ist eingetragen).

## Offline und Updates

Wie Spell Legends: App-Dateien mit Internet frisch vom Server (höchstens 2,5 s warten), sonst aus dem Cache. Neue
`VERSION` (in `sw.js` **und** `app.js`, Stand `ml-v2`) wird beim Öffnen und beim Zurückholen erkannt; die App lädt neu,
sobald sie auf der Startseite ist, nie mitten in einer Runde. Der Service Worker löscht nur alte eigene Versions-Caches
(`/^ml-v\d+$/`; das Präfix `ml-` gibt es woanders schon). Die laufende Version steht unten in den Einstellungen.

## Dateien

- `index.html` – Gerüst, iOS-Meta-Tags · `styles.css` – Design (Stunt-Orange `#B4470C`, Rechenkästchen, Stufen ⅓ ⅔ Lime, sicher Gold)
- `aufgaben.js` – Aufgabentypen und Prüfung (Vertrag) · `schularbeit.js` – Termin, Ziel, ②, Probe
- `app.js` – Lernlogik und Oberfläche (ein IIFE in Abschnitten)
- `legends-status.js`, `legends-sync.js` – Kopien aus `apps/legends-hq/shared/`
- `sw.js` – Offline-Cache · `manifest.webmanifest`, `icons/` – App-Icon (Quelle `icons/icon-source.html`)
- `tools/devserver.py` – Test-Server ohne Cache
- `tools/test/` – nur lokal (in `.gitignore`): die App mit Platzhalter-Typen, Probe und Spieler für Wochen-Läufe

## Lokal testen

```bash
# im Projektordner (oder über .claude/launch.json „mathe-legends“, Port 8771)
python3 apps/mathe-legends/tools/devserver.py 8771
```

Auf localhost ist der Offline-Cache aus (mit `?sw` trotzdem testen). Die echte Seite läuft mit den echten Typen und der
echten Probe. Für Grenzfälle gibt es **http://localhost:8771/tools/test/** (nur lokal, nicht im Repo) mit Platzhalter-Typen
und Schaltern (`?ohneprobe`, `?zweiterechnung&maxmin=6`). Beide teilen sich den Speicher. Auf der Testseite gibt es
`T.neu(2)` (Speicher leer, frisch am Mi), `T.tagSpielen(p)` und `T.woche([{ p: 0.8 }, { skip: true }, …])` (spielt Tag für
Tag über die echte Oberfläche, Trefferquote p). Auf der echten Seite lädt man den Spieler so:
`document.body.appendChild(Object.assign(document.createElement('script'), { src: '/tools/test/helfer-test.js' }))`.
Speicher leeren dort am besten von einer anderen Seite derselben Adresse aus (z. B. `/manifest.webmanifest`): Beim
Verlassen schreibt die App ihren Stand sonst wieder zurück.
Browser-Konsole:

| Befehl | Wofür |
|---|---|
| `ML.shiftDays(1)` | einen Tag weiter (nur in diesem Tab) |
| `ML.tag()` | Phase, Mission, Einstufung, Lernschritte, Wiederholungen, Extra, Papier, Zielstand, `nurPapier` |
| `ML.gen('vb-regeln', 5)` · `ML.check('vb-regeln', '17', 5)` | Aufgabe mit Seed erzeugen · Antwort prüfen |
| `ML.setze({ 'vb-regeln': 2 })` | Stufen setzen, fällig heute (nur zum Testen) |
| `ML.ziel()` · `ML.daten()` · `ML.ses` | Zielstand · geladene Daten und Fehler darin · laufende Runde |
| `ML.bericht()` · `ML.urteil()` · `ML.eingabe()` | Lagebericht, Ampel, Eingabe dafür |
| `ML.melden()` · `ML.sync` | melden und sichern (nur mit Verbindung) · Verbindungszustand |

Getestet am 16.11.2026 im Browser-Pane (393 × 852 und 375 × 667; Klicks per Skript, ohne sichere Ränder), zuerst mit den
Platzhaltern und der Test-Probe aus `tools/test/`, zuletzt mit den echten Typen und der echten Probe:
- Gerüst (`ml-v1`): alle Antwortformate, Einstufung mit „Weiß ich noch nicht“ und 12-Minuten-Grenze, Lernschritt bis
  „morgen mit Hilfe“, Zwilling, Lücke, Tipp, Lagebericht an den lokalen Legends HQ (`node --test` 83 von 83), Offline-Cache
- Teil B (`ml-v2`): Wochen-Läufe Mi–Di mit 50–100 % Treffern über die echte Oberfläche, keine Fehler in der Konsole:
  Einstufung mit Buch-Beleg (1 Aufgabe), Lernschritte am Mi höchstens 2, ② am Mi mit neuen Papier-Typen und
  Textaufgabe, danach fällige Rechnungen, 2. Versuch mit „Mach die Probe“, Extras ab Fr, Sa nur die Generalprobe (Uhr,
  Eingabe, Lösungswege zu den Fehlern, wieder aufrufbar), So nur Fehler seit Sa mit Nachsicht (2. Versuch richtig:
  Stufe bleibt), Testtag mit Aufwärmen, BEREIT erst ab Sa-Abend, vorher FAST BEREIT
- Ansichten: Ordnen (Antippen, Zeichen von der App), Zahlenstrahl als Grafik (Ablesen mit Kreuzen, Eintragen durch
  Antippen), Rechenspalte und Unterstreichen im Lösungsweg, Rückmeldetext zur Fehlerart
- Stempel am Sa um 10 Uhr (Uhr im Test verstellt): vorher FAST BEREIT, nach der eingetippten Probe BEREIT, Konfetti über
  der Zusammenfassung. Ohne Probe-Inhalt: Sa-Runde mit allen App-Typen, ② mit allen Papier-Typen
- ② mit zwei Rechnungen und 6-Minuten-Grenze: die hintere Rechnung fällt weg, die Textaufgabe bleibt
- 375 × 667: Zahlenstrahl mit drei Feldern über dem Ziffernfeld, Kreuz per Klick auf einen Strich, Ordnen mit sechs Zahlen,
  ② mit Textaufgabe, Zusammenfassung der Probe
- Fortschritt: Sicherungs-Code kopieren, Speicher leeren, Code einfügen → alle Typen, Blätter, Protokoll und Einstellungen
  gleich. Ein Stand ohne die neuen Felder (`g`, `ns`, `day.r`) geladen → nichts verloren. Die echte Seite mit einem Stand
  voller unbekannter ids (Platzhalter) → alle Einträge bleiben
- Mit den echten Typen (T2) und der echten Probe auf der echten Seite: Woche Mi–Di mit 75–100 % ohne Fehler in der
  Konsole und ohne Datenfehler (Einstufung 20 App-Typen in 12 Min., ② am Mi mit add-, sub-, mul-schriftlich und ta-ganz, Sa Probe, So nur
  Fehler, BEREIT). Probe einzeln: alle 32 Einträge eingetippt, 4 falsch (Vergleich, Division mit vergessener Null,
  vertauschte Rechnung aus Worten, „pro Kind“ mal statt durch) → Auswertung mit Lösungswegen, So genau diese 4 Typen,
  BEREIT bleibt. Eingabe in 375 × 667 für Zahlenstrahl mit 4 Feldern, Ordnen, Tabelle ①–④, Kürzel, Rechnung aus Worten,
  zwei Geschichten mit 4 Feldern: Das aktive Feld scrollt ins Bild, sehr lange Texte etwas kleiner
- BEREIT ohne Runde (Sa ab 18 Uhr): einmal Konfetti und „BEREIT! Du bist Mathe Legend.“ auf der Startseite
- Vertrag Version 2: alle 30 Typen haben eine `kennung`; Lernschritte von Typen ohne term (ta-rechnung, vo-ordnen,
  zs-ablesen) ohne doppelte Aufgabe; ta-ganz in ② über die Woche viermal verschieden; Rückmeldetext aus `pruefe` bei
  Runden (Fehler aus `fehler`), Ordnen (richtung), Zahlenstrahl (Text der Aufgabe) und im Dreierpack (zeichen)

- Prüfung Runde 1 (B1 und Mängel), mit dem Simulations-Treiber von `pruefung` (`tools/test/sim-treiber.js`, Kopie; Minuten
  ohne Lesezeit, ② mit Eintippen): normal (Δ 0, 8 Läufe) Mi Ø 27,9 (26,5–28,8), Do Ø 28,5 (27,1–30,6), Fr Ø 27,8
  (24,0–33,0) Min.; schwach (Δ −0,15, 5 Läufe) Mi Ø 28,3, Do Ø 29,7 (bis 32,8), Fr Ø 29,6 (bis 33,4). Vorher Mi Ø 33,
  Do Ø 50, Fr schwach 42–57. So-Abend BEREIT normal 6 von 8, schwach 0 von 5; normal bleibt kein Typ neu, schwach 1–4
- Zahlwörter: 250 Aufgaben sw-zahlwort und die 32 Einträge der Probe bei 375 px – jedes Stück bis zum Umbruch passt in
  die Zeile (Aufgabe, Auftrag, Lösungsweg). Probe bei 375 × 667: Bei allen Einträgen mit 3 oder 4 Feldern sind alle
  Felder beim Zeigen zu sehen. So falsch, Runde vor dem Zwilling beendet, Mo: Stufe und BEREIT bleiben; Aufwärmen am
  Mo ändert keine Stufe; eine am Sa angefangene Probe am So eingetippt
- Kurzer Lernschritt ta-ganz bei 375 × 667: Beispiel mit geg/ges, Rechnung, Kurzform und A:, dann 1 Aufgabe mit
  vorgegebenem 1. Schritt; richtig → ⅓, falsch → bleibt neu, `lsN` + 1, heute nicht noch einmal. Probe bei Stufe 0:
  richtig → ⅓ (mit `g`), falsch → bleibt 0

- Erststart (17.11., Treiber von `pruefung`, Abend 20 Uhr, HQ-Sicht am nächsten Morgen): **Fall 1** Installation Di
  abends ohne Üben, ab Mi jede Mission – Di und Mi (Einstufung bis Do) „Pause“ und „Los geht's“, HQ Mi früh „Pause“;
  dann Do–So grün in 3 normalen Läufen. Schwach (Δ −0,15): ab Fr Gelb/Rot über Abstand und Trefferquote, die Plan-Karte
  zeigt „Im Plan ✓“. **Fall 2** Installation Do: Do „Pause“, Fr/Sa Gelb „Der Plan ist knapp: 60 % sicher“, So Rot
  „hinter dem Plan“ (Prognose 38 %); die Plan-Karte zeigt jeden Abend „Im Plan ✓“. Probetag im Protokoll als fertig

Noch nicht: iOS-Simulator und echtes iPhone (Tippen auf die Striche, sichere Ränder, Home-Bildschirm-App), Update von
`ml-v1` auf `ml-v2` mit Service Worker.

## Icons neu erzeugen

```bash
cd apps/mathe-legends/icons
CH="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
"$CH" --headless=new --hide-scrollbars --window-size=1024,1024 --virtual-time-budget=3000 --screenshot=$PWD/i.png "file://$PWD/icon-source.html"
"$CH" --headless=new --hide-scrollbars --window-size=1024,1024 --virtual-time-budget=3000 --screenshot=$PWD/m.png "file://$PWD/icon-source.html?s=0.6"
magick i.png -resize 180x180 apple-touch-icon.png && magick i.png -resize 192x192 icon-192.png
magick i.png -resize 512x512 icon-512.png && magick m.png -resize 512x512 icon-maskable-512.png && rm i.png m.png
```
