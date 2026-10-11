# AT-Netzentgelte 2027: Werte nach Veröffentlichung einpflegen (Paket ATSNE)

Schritt-für-Schritt-Anleitung, wie die österreichischen Systemnutzungsentgelte nach der
Kundmachung der Fassung 2027 im RIS in die Website kommen. Bis dahin zeigt der
Gewerbestrom-Check auf `/at/rechner/gewerbestrom-check` bewusst **keine geschätzten Werte**
(Länderhinweis mit Zeitplan „erwartet Q1 2027“).

Grundregeln (Masterplan, CLAUDE.md): Werte NUR aus dem Faktenregister, jeder Wert mit
Primärquelle (RIS), Abrufdatum und Status; `status: "geprueft"` erst nach Prüfung am Original;
Klasse-A-Änderungen brauchen die zweite Prüfperson (E6). Keine Sekundärquellen
(Pressemeldungen, Energieversorger-Seiten) als Beleg.

## 1. Kundmachung finden und prüfen

1. RIS-Suche Bundesnormen: <https://www.ris.bka.gv.at/Bundesrecht/> – Titel
   „Systemnutzungsentgelte“ (erwartet: Grundsatzverordnung **SNE-GV** und Tarifverordnung
   **SNE-TV**, Entgelte ab 01.01.2027; Zeitplan laut E-Control-Konsultation).
2. Prüfen, dass die Fassung **in Kraft** ist (Inkrafttretensdatum, kein Entwurf, keine
   Konsultationsfassung).
3. Dauerhafte RIS-URL der geltenden Fassung notieren
   (`GeltendeFassung.wxe?Abfrage=Bundesnormen&Gesetzesnummer=…`) plus BGBl.-Nummer.

## 2. Faktenregister aktualisieren

Dateien:
- `src/lib/fakten/daten/gewerbestrom-at.js` (Paket ATSNE – Struktur, Abgaben)
- `src/lib/fakten/daten/netzentgelte-2027.js` (Paket FRI – Termin-/Verordnungsfakten
  `netzentgelt.at.sne2027`, `termin.at.sneTv2027`; **vorher mit FRI abstimmen**, Datei gehört FRI)

Schritte in `gewerbestrom-at.js`:
1. Fakt `netzentgelt.at.bestandteile`: Paragraphen auf die neue Verordnung umstellen
   (neue Struktur kann abweichen – z. B. geänderte Leistungs-/Arbeitsanteile). Alte Fassung
   nicht löschen, sondern als neue Version mit `gueltigAb: "2027-01-01"` anlegen
   (Register wählt die am Stichtag geltende Version) und bei der alten
   `gueltigBis: "2026-12-31"` belassen.
2. Neue Entgeltwerte als eigene Fakten anlegen, z. B. je Netzbereich und Netzebene
   `netzentgelt.at.<netzbereich>.ne<ebene>` mit `wert: { apCt, lpEurKw }`, `einheit`,
   `quelle` (RIS-URL der SNE-TV), `abruf` (Datum der Prüfung), `gueltigAb: "2027-01-01"`,
   `status: "geprueft"` erst nach Wort-für-Wort-Prüfung am RIS, `klasse: "A"`,
   `pruefer: "… · Zweitprüfung TODO-E6"` bis E6 gegengeprüft hat.
3. **Stop-Liste beachten:** kein vollständiger AT-Atlas als eigenes Produkt ohne
   Inhaberfreigabe; für den Check reichen die Netzbereiche/Netzebenen der Eingabemaske.

## 3. Rechenlogik freischalten

1. `src/lib/rechner/gewerbestromAt.js`: Rechenfunktion ergänzen, die aus Netzebene,
   Netzbereich, Jahresverbrauch und Leistung das Netzentgelt nach der neuen Verordnung
   rechnet – nur mit Fakten, deren `status === "geprueft"` ist (`anzeigeStatus` nutzen).
2. Tests zuerst: `src/lib/rechner/gewerbestromAt.test.mjs` um Rechenfälle aus der
   Verordnung erweitern (mindestens ein nachgerechnetes Beispiel je Netzebene der Maske).
   `npm test` muss grün sein; bestehende Tests nicht löschen.
3. `src/components/Rechner/GewerbestromCheckAT.js`: Länderhinweis-Block (Zeitplan) durch
   die Ergebnisanzeige ersetzen; Eingabemaske (Netzebene, Jahresverbrauch, Leistung) bleibt.
   Danach ggf. Netzbereich (Bundesland) als Eingabe ergänzen, weil die Entgelte je
   Netzbereich gelten.
4. `src/app/(stamm)/rechner/gewerbestrom-check/page.js`: AT-Methodiktext (`ErklaerungAt`)
   und FAQ („Gibt es den Check auch für Österreich …“) aktualisieren; englische Fassung
   in derselben Datei mitziehen.

## 4. Abgaben nachziehen (gleiche Sorgfalt)

1. **Elektrizitätsabgabe** (`abgabe.at.elektrizitaet`): § 4 ElAbgG am RIS prüfen –
   gelten 2027 noch befristete Sondersätze aus dem Übergangsrecht? Nur den tatsächlich
   geltenden Satz mit Zeitraum erfassen (als Version mit `gueltigAb`/`gueltigBis`).
2. **EAG-Förderbeitrag** (`abgabe.at.eagFoerderbeitrag`): jährliche Verordnung nach
   § 75 EAG im RIS suchen, Prozentsatz eintragen, `status` auf `geprueft`, `gueltigAb`/
   `gueltigBis` auf das Kalenderjahr. Ohne geprüfte Verordnung bleibt `wert: null`.

## 5. Qualität und Freigabe

1. `node qa/fakten-check.mjs` → GRÜN (abgelaufene Klasse-A-Fakten blockieren).
2. `npm test` und `npm run test:charakterisierung` → grün.
3. Visuell prüfen (Desktop 1440 und Handy 390): `/at/rechner/gewerbestrom-check` und
   `/en/at/rechner/gewerbestrom-check`.
4. Zweitprüfung E6 für alle Klasse-A-Fakten; erst danach `TODO-E6` aus `pruefer` entfernen.
5. Newsletter: Abonnenten des Themas „Fristen & Förderung“ (Quelle `gewerbestrom-at`)
   über die eingepflegten Werte informieren (Versand macht der Inhaber/Backoffice).
6. Erst nach fachlicher Freigabe die Seite zur Indexierung freigeben
   (`src/lib/land/seiten.js`, `index`), vorher bleibt sie noindex.
