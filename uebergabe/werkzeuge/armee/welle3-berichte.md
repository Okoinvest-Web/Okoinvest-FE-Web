# Welle 3 – Berichte der Pakete (Bau und Prüfung)

## Welle 3 · B9 Bau · Ausschreibungs-Monitor im Datenzentrum /marktdaten

Paket B9 ist fertig: Der Ausschreibungs-Monitor läuft unter `/marktdaten/ausschreibungen` und in allen Länder- und Sprachfassungen (`/de`, `/at`, `/ch`, `/en`, `/en/<land>`). Alle Fassungen sind auf noindex gestellt. Zwei Tests im Gesamtlauf schlagen fehl. Nach meiner Prüfung liegen beide in Dateien, die gerade andere Pakete ändern (Details unten).

**Was gebaut ist**
- **Daten** in `src/data/ausschreibungsmonitor.js`, sechs Reihen, nur aus amtlichen Quellen, am 09.10.2026 jeweils direkt beim Herausgeber gelesen:
  - DE: Solar erstes Segment (dieselben Daten wie auf `/marktdaten`, nicht doppelt gepflegt), zweites Segment (16 Runden 2021–2026) und Innovationsausschreibung (8 Runden ab 2023). Quelle sind die Statistik-Tabellen der BNetzA, die Termine kommen aus §§ 28a, 28b und 28e EEG.
  - AT: EAG-Marktprämie PV, 15 Runden 2022–2026. Übernommen habe ich nur die Kopfwerte der Excel-Veröffentlichungen nach § 26 EAG, keine Bieternamen. Den Höchstpreis 7,77 ct/kWh und die Termine 2026/2027 habe ich im Verordnungstext (RIS) nachgelesen.
  - CH: Pronovo-Auktionen, 14 Runden Einmalvergütung (HEIV) und 6 Runden Marktprämie (GMP), aus den Auktions-Cockpits 2023–2026. Sie sind als „provisorisch“ gekennzeichnet, weil Pronovo sie so nennt.
  - Was die Stelle nicht veröffentlicht, steht leer. Geschätzt ist nichts.
- **Auswertung** in `src/lib/marktdaten/monitor.js` (Termine kommend, laufend, Ergebnis ausstehend; Jahreswerte; Export), dazu 10 eigene Tests in `monitor.test.mjs`.
- **Seite** `src/app/(stamm)/marktdaten/ausschreibungen/page.js` und Monitor-Komponente `src/components/Marktdaten/AusschreibungsMonitor.js`, in der Optik der bestehenden Marktdaten-Seiten:
  - letzte Runde je Programm;
  - kommende Termine (sechs sichtbar, Rest aufklappbar) und Termine mit ausstehendem Ergebnis;
  - Diagramm je Programm mit Zuschlagswerten, Mengen und Tabelle;
  - Download und Methodik, Quellen mit Abrufdatum;
  - Dataset-Beschreibung für Suchmaschinen über die bestehende escapende JsonLd-Komponente;
  - Formular „Fristen-Erinnerung“.
- **Ländertrennung:** Auf `/at` und `/ch` erscheinen nur die eigenen Reihen, auch in Methodik, Quellen und Namensnennung. Die gemeinsame Seite zeigt alle Länder mit Länderkennung und Länderfilter. Die drei Einheiten (ct/kWh, CHF/kW, Rp./kWh) stehen nie auf einer gemeinsamen Achse.
- **Downloads** unter `…/daten.csv` und `…/daten.json` (wahlweise `?land=AT` usw.), Lizenz CC BY 4.0. Der Download-Link auf `/at` und `/ch` liefert nur die Daten des Landes.
- **Fristen-Erinnerung:** Ein Newsletter-Paket gibt es noch nicht. Deshalb nutzt das Formular die bestehende Anfrage-Kette mit dem vorhandenen, nicht vorausgewählten Newsletter-Häkchen. Telefon ist nur bei Rückrufwunsch Pflicht.
- **Englisch:** komplett übersetzt, aber wie die deutsche Fassung noindex.
- **Register und Verlinkung:** Die Seite steht im Seitenregister mit `index: false` (damit nicht in der Sitemap) und im Sprachregister. Die Länder- und Sprachrouten sind angelegt. Auf `/marktdaten` steht ein Link zum Monitor.
- Keine neuen npm-Abhängigkeiten, keine Commits.

**Wie geprüft**
- Meine 10 Monitor-Tests laufen grün, ebenso `test:charakterisierung` (195/195) und die Routenprüfung (`landfassungen.mjs --pruefen`: 63 Seiten vollständig). ESLint ist für alle geänderten Dateien sauber.
- Im Gesamtlauf `npm test` bestehen 754 von 756 Tests:
  - „englische Routen“ zählt eine zusätzliche Catch-all-Seite `src/app/(en)/en/[land]/[...unbekannt]/`. Die gehört zum Paket W3-0 (404-Seiten), nicht zu mir.
  - „BestandteileTabelle“ hängt am Faktenregister, das andere Pakete gerade ändern.
- Seitenprüfung bei 1440 und 390 px für die gemeinsame Seite, `/at`, `/ch`, `/en` und `/en/at` sowie für `/marktdaten`: Status 200, kein Überlauf, keine Konsolenfehler. Ganzseiten-Screenshots habe ich angesehen und danach die Terminliste kompakter gemacht und die Texte je Land angepasst. Nach dieser letzten Textanpassung habe ich nicht noch einmal fotografiert.
- CSV und JSON per Aufruf geprüft; ein unbekanntes Land liefert Fehler 400.

**Offen – für dich**
1. **Prüfung durch die zweite Person (E6):** Bis dahin bleiben Seite und Downloads auf noindex. Nach der Freigabe in beiden Registern `index: false` austragen und die noindex-Kennung bei den Download-Dateien entfernen.
2. **Widersprüchlicher BNetzA-Wert:** Beim zweiten Segment, Runde 1.6.2023, sind Durchschnitt und höchster Zuschlag beide 10,18 ct/kWh, obwohl der niedrigste Zuschlag bei 8,80 liegt. Das geht rechnerisch nicht auf. Ich habe den Wert wie veröffentlicht übernommen und mit Hinweis markiert; eine Rückfrage bei der BNetzA wäre sinnvoll.
3. **Noch nicht veröffentlicht:** Ergebnisse DE zweites Segment 1.10.2026 und AT 24.09.2026; Volumen und Höchstwerte der kommenden DE-Termine; Pronovo-Termine 2027; AT-Höchstpreise vor 2026.
4. **Fristen-Datei korrigierbar:** In `termine-2026.js` steht der AT-Termin 10.12.2026 noch als „zu prüfen“. Ich habe ihn im Verordnungstext nachgelesen, er stimmt. Die Datei gehört zum Fristen-Paket, ich habe sie nicht geändert.
5. **Newsletter-Bestätigung per E-Mail (Double-Opt-in) fehlt noch:** Bis das Newsletter-Paket fertig ist, wird nur der Wunsch gespeichert, es geht nichts raus.
6. **Menü:** Kein Eintrag in `navigation.js`, solange die Seite noindex ist. Erreichbar ist sie über `/marktdaten` und die Querverweise.

Screenshots liegen im Scratchpad unter `shots/` (Unterordner `gem`, `gem2`, `at`, `ench`, `check`).

## Welle 3 · B5 Bau · Rechnungs-Check Gewerbestrom DE (Preisradar Schritt 1)

Der Rechnungs-Check Gewerbestrom für Deutschland ist gebaut, unter `/rechner/gewerbestrom-check` mit allen Länder- und Sprachfassungen. In `npm test` ist ein Test rot (757 von 758 grün). Er kommt aus einem anderen Paket, siehe unten. `npm run test:charakterisierung` ist grün (195 von 195), eslint auf allen geänderten Dateien ist sauber. Die Seite steht auf noindex und ist nicht in der Sitemap.

**Was die Seite kann**
- **Eingaben:** Jahresverbrauch, Spitzenleistung, Anschluss, Lastprofil (fünf Vorlagen oder eigener Lastgang), Arbeitspreis (Gesamtpreis oder nur Energie), Grundpreis, Netzentgelt aus der Rechnung, Bundesland, Kundengruppe für die Konzessionsabgabe mit Gemeindegröße, produzierendes Gewerbe.
- **Lastgang:** Die CSV-Datei wird nur im Browser gelesen. Das steht auch so im Formular. Erkannt werden 15-, 30- und 60-Minuten-Werte in kWh oder kW, kürzere Zeiträume werden aufs Jahr hochgerechnet. An den Bericht gehen nur Jahresverbrauch, Spitzenleistung und ein Profilfaktor, nie die Datei.
- **Zerlegung:** Jede Zeile trägt eine Stufe: amtlich, berechnet, Schätzung oder „Ihre Angabe“ (für Werte aus der Rechnung, also Netzentgelt und Arbeitspreis). Quelle und Stand stehen dabei.
- **Urteil:** „marktgerecht“, „günstig“, „etwas über“ oder „deutlich über“ der Marktspanne, dazu „offen“, wenn das Netzentgelt fehlt. Liegt der Preis darüber, zeigt die Seite die Spanne in €/Jahr. Die Marktspanne ist Börsenwert plus üblicher Aufschlag der Lieferanten. Keine Versorgernamen, keine Rangliste.
- **Preisradar je Bundesland:** zeigt offen, dass Umlagen und Stromsteuer in allen 16 Ländern gleich sind. Unterschiede entstehen nur bei der Konzessionsabgabe (Gemeindegröße) und beim Netzentgelt (Netzbetreiber). Keine Endpreise.
- **Weitere Hinweise auf der Seite:** Stromsteuer-Entlastung nach § 9b StromStG, ein Kasten zu den Umlagen 2027 (schaltet um, sobald die Werte im Register stehen), Börsenverlauf der letzten 12 Monate mit SMARD-Nennung, Verweis auf den Reststrom-Pool.
- **Lead:** Der Bericht läuft über die bestehende Kette mit Double-Opt-in: Name und E-Mail Pflicht, Telefon freiwillig, Routing DE als Typ „reststrom“ mit Verbrauch für die Größenklasse. Im Demo-Modus geprüft: Anfordern, Bestätigen und Berichtsseite mit Annahmenbuch funktionieren, AT wird abgelehnt.
- **AT und CH:** zeigen statt des Rechners den gewünschten Länderhinweis („ab 2027 nach SNE-VO in Vorbereitung“ bzw. „in Vorbereitung“). Die FAQ mit deutschem Recht sind entsprechend gekennzeichnet.
- **Englisch:** Seite und Rechner sind vollständig übersetzt, ebenfalls noindex.

**Werte im Faktenregister**
- Am 09.10.2026 am Original geprüft:
  - Umlagen 2026 auf netztransparenz.de: KWKG-Umlage 0,446 ct, Offshore-Netzumlage 0,941 ct, Aufschlag für besondere Netznutzung 1,559 ct für die erste GWh, darüber 0,050 bzw. 0,025 ct.
  - Stromsteuer nach § 3 und § 9b StromStG: Regelsatz 2,05 ct, Entlastung 2,0 ct über einem Sockel von 250 €.
  - Konzessionsabgabe nach § 2 KAV: 0,11 ct für Sondervertragskunden, 1,32 bis 2,39 ct für Tarifkunden je nach Gemeindegröße, dazu die Abgrenzung 30 kW / 30.000 kWh.
- Die Umlagen 2027 sind noch nicht veröffentlicht. Der Check rechnet deshalb mit 2026 und sagt das; ab 2027 wird der Wert als „Stand abgelaufen“ markiert.
- Börse: Day-Ahead-Monatsmittel Okt. 2025 bis Sept. 2026 und ein Stundenprofil, abgerufen über die öffentliche SMARD-Schnittstelle. Die Lizenz CC BY 4.0 habe ich auf smard.de geprüft; die Nennung „Bundesnetzagentur | SMARD.de“ steht an jeder Darstellung.

**Neue Dateien**
- `src/app/(stamm)/rechner/gewerbestrom-check/page.js` plus die drei Länder- und Sprachrouten (`scripts/landfassungen.mjs --pruefen` meldet alles vollständig)
- `src/components/Rechner/GewerbestromCheck.js`
- `src/lib/rechner/gewerbestrom.js` mit 13 Tests in `gewerbestrom.test.mjs`
- `src/lib/bericht/gewerbestrom.js`
- `src/lib/fakten/daten/gewerbestrom-de.js`
- `scripts/gewerbestrom-smard.mjs` (holt die Börsenwerte zur monatlichen Aktualisierung neu)

**In gemeinsamen Dateien nur ergänzt**
- `src/lib/fakten/index.js`, `src/lib/land/seiten.js`, `src/lib/sprache/seiten.js`: Einträge für die neue Seite bzw. das neue Datenmodul.
- `src/components/Rechner/tools.js`: neuer Rechner-Eintrag, damit erscheint er auch im Rechner-Hub und auf der Startseite.
- `src/components/Rechner/RechnerSeite.js`: neue optionale Eigenschaft für eigene Länderhinweise, abwärtskompatibel.
- `src/lib/bericht/neuRechnen.js` und `annahmenbuch.js`: der neue Rechner in der Bericht-Positivliste.
- Zwei Tests angepasst:
  - `neuRechnen.test.mjs`: die Positivliste hat jetzt fünf Rechner.
  - `termine.test.mjs`: die Tabelle auf `/marktdaten/fristen` zeigt jetzt neben den offenen Umlagen 2027 auch die geprüften Werte 2026. Die Regel „keine Zahl bei offenen Werten“ wird weiter je Zeile geprüft.

**Visuell geprüft** bei 1440 und 390 px: `/rechner/…`, `/at/…`, `/en/…` und `/en/at/…` ohne Überlauf und ohne Konsolenfehler, dazu die Berichtsseite.

**Offen**
1. **Roter Test, nicht aus meinem Paket:** „englische Routen“ zählt 127 statt 126 Seiten. Der Grund ist die neue Fangseite für unbekannte Unterseiten unter `/en/[land]` (`[...unbekannt]`) aus W3-0; dort muss der Test angepasst werden.
2. **Zweite Prüfperson (E6):** muss die geprüften Werte gegenlesen. Erst danach `index: false` im Seitenregister entfernen.
3. **Zwei eigene Einschätzungen sind nicht belegt** und als „Prüfung ausstehend“ gekennzeichnet:
   - Aufschlag der Lieferanten über dem Börsenwert: 1,0 bis 3,5 ct/kWh.
   - Abstand für „etwas über Markt“: 1,5 ct.

   Beide sollte Team Deutschland festlegen.
4. **Börsenwerte veralten:** gültig bis 30.11.2026, danach monatlich mit `scripts/gewerbestrom-smard.mjs` aktualisieren.
5. **Bundesland statt PLZ:** Die Seite fragt das Bundesland ab, nicht die PLZ. Eine PLZ-Zuordnung zu Netzbetreiber und Gemeindegröße gehört zu Schritt 2, ebenso die Netzentgelte je Netzbetreiber.
6. **Bewusst nicht eingerechnet** (steht als Hinweis auf der Seite): Begrenzungen für stromkostenintensive Unternehmen und der Wegfall der Konzessionsabgabe unter dem Grenzpreis.
7. **Prüf-ID im Bericht:** Sie hängt am bisherigen Stand der Rechenlogik (03.10.2026), weil ich `markt.js` nicht angefasst habe.
8. **Testdaten im Demo-Backend:** Durch meinen Test liegen dort ein bestätigter Bericht und eine Anfrage mit test@example.org.

Keine neuen Abhängigkeiten, keine Commits. Der Dev-Server war einmal kurz nicht erreichbar; ich habe gewartet, bis er wieder lief.

## Welle 3 · B9 Prüfung

# Prüfbericht Paket B9: Ausschreibungs-Monitor

**Ergebnis: bestanden.** Ich habe vier kleinere Fehler direkt behoben. Ein Test im Gesamtlauf schlägt fehl, er gehört aber nicht zu B9.

## Bestanden

**1. Funktion**
- Alle Fassungen der Seite laden mit Status 200: gemeinsam, `/de`, `/at`, `/ch`, `/en`, `/en/at` und `/en/ch`.
- Die Downloads `daten.csv?land=AT` und `daten.json?land=ch` liefern 200, ein unbekanntes Land (`?land=XX`) liefert 400.
- Die Daten sind in sich stimmig: Der Durchschnitt liegt zwischen niedrigstem und höchstem Zuschlag, der höchste Zuschlag nicht über dem Höchstwert, die Zuschläge nicht über den Geboten. Einzige Ausnahme ist der bekannte Fall DE zweites Segment vom 1.6.2023 (Ø = höchster Zuschlag, siehe offen).
- Eigene Gegenrechnung: Der Jahreswert AT 2026 ergibt 6,371 ct/kWh, genau wie im Monitor.
- Stichprobe am Original (RIS, EAG-Marktprämienverordnung §§ 4 und 5): Höchstpreis 7,77 ct/kWh, die acht Termine 2026/2027 und je 175.000 kWp stimmen. Der AT-Termin 10.12.2026 ist damit bestätigt.
- Die Fristen-Erinnerung läuft über das bestehende Anfrageformular in die Lead-Kette (mit Land, Quelle und Anliegen). Das Newsletter-Häkchen ist nicht vorausgewählt, Telefon ist nur bei Rückrufwunsch Pflicht.

**2. Recht und Claims**
- Alle Fassungen stehen auf noindex. Die Seite ist in beiden Registern mit `index: false` eingetragen, die Downloads tragen die noindex-Kennung.
- Die Länder sind sauber getrennt: Auf `/at` erscheinen weder Bundesnetzagentur noch Pronovo noch CHF, auf `/ch` weder ct/kWh noch BNetzA.
- Keine Umweltclaims, keine Fremdmarken, keine geschätzten Werte. Der Text zum Programm sagt ausdrücklich, dass nichts geschätzt wird.
- Die Dataset-Beschreibung für Suchmaschinen läuft über die bestehende escapende JsonLd-Komponente.

**3. Design**
- Ich habe Ganzseiten-Bilder bei 1440 und 390 px für die gemeinsame Seite, `/ch` und `/en/at` angesehen. Die Optik entspricht den bestehenden Marktdaten-Seiten. Bei beiden Breiten gibt es keinen Überlauf (0 px) und keine Konsolenfehler.

**4. Englisch**
- Die Seite ist im Sprachregister eingetragen. Die englischen Routen sind korrekt angelegt und werden vom Test geprüft.

**5. Prüfläufe**
- ESLint ist für alle geänderten Dateien sauber.
- Die 10 Monitor-Tests sind grün, `test:charakterisierung` mit 195 von 195 ebenfalls.
- `npm test`: 757 von 758 grün. Der eine Fehler steht unten.

## Behoben

Die ersten drei Änderungen betreffen `src/components/Marktdaten/AusschreibungsMonitor.js`, die vierte `src/app/(stamm)/marktdaten/ausschreibungen/page.js`.

1. **Deutscher Rest auf EN:** Unter den Diagrammen stand „Source: EAG-Förderabwicklungsstelle“. Jetzt steht dort „EAG funding settlement agency (EAG-Förderabwicklungsstelle)“.
2. **Jahreszahlen überlappten bei 390 px:** Unter dem AT-Diagramm stand „20222023“, weil 2022 nur eine Runde hat. Jetzt gilt ein Mindestabstand zwischen den Jahreszahlen. Auf dem neuen Bild stehen sie sauber; 2023 entfällt dabei.
3. **Einheit AT in der Terminliste:** „Volumen 175 MW“ heißt jetzt „175 MWp“, so wie die Verordnung es angibt.
4. **Querverweis mit DE-Inhalt auf AT- und CH-Seiten:** „EEG-Zuschläge seit 2017 …“ heißt jetzt landneutral „Zuschläge, Marktwert Solar, Capture Rate und Zubau – je Land gekennzeichnet.“ Die englische Fassung ist entsprechend angepasst.

## Offen

1. **Fehlschlagender Test „englische Routen“ (127 statt 126 Seiten):** Die zusätzliche Seite ist `src/app/(en)/en/[land]/[...unbekannt]/page.js` aus Paket W3-0 (404-Seiten). Die Monitor-Routen bestehen den Test. Der vom Bau-Agenten genannte zweite Fehler („BestandteileTabelle“) trat in meinem Lauf nicht mehr auf.
2. **Newsletter-Bestätigung per E-Mail fehlt:** Seitentext und Erfolgsmeldung sagen „bestätigen Sie die Anmeldung per E-Mail“. Das passt zum bestehenden Häkchentext, aber die Bestätigungsstrecke gibt es noch nicht, es geht also keine E-Mail raus. Das ist ein Inhaberpunkt für das Newsletter-Paket, solange die Strecke fehlt, sollte die Seite noindex bleiben.
3. **Zweitprüfung (E6) aller Werte** steht aus. Erst danach `index: false` in beiden Registern austragen und die noindex-Kennung bei den Downloads entfernen.
4. **Rückfrage bei der BNetzA** zum zweiten Segment, Runde 1.6.2023 (Ø = höchster Zuschlag = 10,18 ct/kWh). Der Wert ist wie veröffentlicht übernommen und markiert.
5. **Noch nicht veröffentlicht:** Ergebnisse DE zweites Segment 1.10.2026 und AT 24.09.2026, Volumen und Höchstwerte der kommenden DE-Termine, Pronovo-Termine 2027 und AT-Höchstpreise vor 2026.
6. **Nebenbei, ohne Änderung:** Die Programmkarte schreibt bei AT „… MW bezuschlagt“ statt MWp. Die Methodik nennt MWp, der Schaden ist gering.

Ein Download unter dem Länderpfad (`/at/marktdaten/ausschreibungen/daten.csv`) liefert 404. Das ist unkritisch, weil alle Links auf den gemeinsamen Pfad mit `?land=` zeigen.

Die Bilder liegen im Scratchpad unter `scratchpad/pruef` und `scratchpad/pruef2` (`C:\Users\SALEAD~1\AppData\Local\Temp\claude\c--Users-SALEADMIN-Downloads-Oekoinvest-Web\3140c08a-2721-4ee9-a47f-9fce6660cd23\scratchpad\`).

## Welle 3 · B5 Prüfung

**Prüfbericht B5: Rechnungs-Check Gewerbestrom DE**

Ergebnis: bestanden. Ich habe einen fachlichen Rechenfehler gefunden und behoben. Der eine rote Test in `npm test` kommt nicht aus diesem Paket.

**Behoben (1)**
- **Fehler:** Im Modus „Gesamtpreis“ wurden die Netz-Fixkosten (Leistungspreis, Netz-Grundpreis, Messstellenbetrieb, in €/Jahr) vom Energieanteil abgezogen, aber nicht zur Rechnung hinzugezählt. Damit sank der Energieanteil künstlich.
  - Beispiel: Ein Leistungspreis von 9.000 €/Jahr bei 250 MWh senkte den Energieanteil von 12,97 auf 9,37 ct/kWh. Das Urteil sprang dadurch von „marktgerecht“ auf „günstig“.
  - Ein Leistungspreis in €/kW kann nicht im Arbeitspreis stecken.
- **Korrektur:** Im Gesamtpreis-Modus kommen diese Fixkosten jetzt zur Rechnung hinzu. Abgezogen wird nur noch der Netz-Arbeitspreis. Der Energieanteil ändert sich durch die Fixkosten nicht mehr, und die Summe der Zeilen ergibt weiter die Rechnung.
- **Geänderte Dateien:**
  - `src/lib/rechner/gewerbestrom.js`: die Korrektur.
  - `src/lib/rechner/gewerbestrom.test.mjs`: neuer Test, der genau diesen Fall prüft.
  - `src/lib/bericht/gewerbestrom.js`: Satz zum Rechenweg im Bericht angepasst.
  - `src/components/Rechner/GewerbestromCheck.js`: neuer Hinweis am Feld auf Deutsch und Englisch, „Nur Beträge, die als eigene Posten in €/Jahr bzw. €/kW auf der Rechnung stehen – nicht, was schon im Grundpreis des Lieferanten steckt.“

**Bestanden**
1. **Funktion**
   - Alle Fassungen laden mit Status 200 und ohne Konsolenfehler: gemeinsame Seite, /de, /at, /ch, /en, /en/at.
   - Eigene Gegenrechnung für den Beispielbetrieb (250 MWh, Sondervertrag) stimmt mit dem Rechner überein:

     | Wert | Ergebnis |
     |---|---|
     | Amtliche Bestandteile | 0,446 + 0,941 + 1,559 + 0,11 + 2,05 = 5,106 ct/kWh |
     | Rechnung | 61.430 € |
     | Energieanteil | 12,966 ct/kWh |
     | Börsenmittel | 10,405 ct/kWh, mit Profil „Tagbetrieb“ × 0,956 = 9,95 ct/kWh |
     | Marktspanne | 10,95–13,45 ct/kWh, Urteil „marktgerecht“ |

   - Bei 2 GWh, Gruppe C: Aufschlag für besondere Netznutzung 15.840 €, Stromsteuer-Entlastung 39.750 €. Beides habe ich nachgerechnet und es stimmt.
   - Ab 2027 werden die Werte als Vorjahreswerte und „abgelaufen“ gekennzeichnet.
   - Den Bericht über die Lead-Kette (nur DE, AT und CH werden mit 422 abgelehnt, Typ „reststrom“) belegen die Unit-Tests. Den Ablauf im Browser habe ich nicht selbst wiederholt.
2. **Recht und Claims**
   - Die SMARD-Monatswerte Jan.–Sept. 2026 habe ich direkt an der SMARD-Schnittstelle gegengeprüft, sie stimmen.
   - Den Wortlaut von § 9b Abs. 2 StromStG (20 €/MWh, Sockel 250 €) habe ich bei gesetze-im-internet.de geprüft. Der Rechner zieht den Sockel richtig ab.
   - Die KAV-Werte stimmen mit dem Stand meines Wissens überein. Die Umlagen 2026 habe ich nicht am Original nachgeprüft, sie sind aber plausibel.
   - Keine Versorgernamen, keine Rangliste, keine Umweltclaims.
   - AT und CH zeigen den Länderhinweis statt des Rechners. Die FAQ mit deutschem Recht tragen auf /ch den Hinweis, dass die Angaben für Deutschland gelten.
   - Alle Fassungen stehen auf noindex, die Seite ist nicht in der Sitemap.
3. **Design:** Full-Page-Screenshots bei 1440 und 390 px (DE, EN, CH) und Ausschnitte von AT und EN/AT. Gleiche Optik wie die bestehenden Rechner, kein Überlauf bei 390 px.
4. **Englisch:** Die Seite ist im Sprachregister eingetragen (noindex). Navigation und Hauptinhalt sind englisch. Deutsch bleiben nur die Namen der Bundesländer im Auswahlfeld (z. B. „Bayern“), das ist vertretbar.
5. **Prüfläufe**
   - eslint auf allen Dateien des Pakets ohne Befund.
   - `npm run test:charakterisierung`: 195 von 195 grün.
   - `npm test`: 758 von 759 grün.

**Offen**
1. **Roter Test, nicht aus B5:** „englische Routen“ zählt 127 statt 126 Seiten. Grund ist die Fangseite `src/app/(en)/en/[land]/[...unbekannt]/page.js` aus W3-0. Der Test muss dort angepasst werden.
2. **Zweite Prüfperson (E6):** muss die Werte gegenlesen. Erst danach `index: false` entfernen, sowohl im Seitenregister als auch im Sprachregister.
3. **Inhaberpunkt:** Zwei eigene Einschätzungen sind nicht belegt: der Aufschlag der Lieferanten von 1,0–3,5 ct/kWh und der Abstand von 1,5 ct für „etwas über Markt“. Beide sind als „Prüfung ausstehend“ gekennzeichnet und sollten von Team Deutschland festgelegt werden.
4. **Börsenwerte:** gültig bis 30.11.2026, danach monatlich mit `scripts/gewerbestrom-smard.mjs` aktualisieren.
5. **Testdaten im Demo-Backend:** Durch den Test des Bau-Agenten liegen dort ein bestätigter Bericht und eine Anfrage mit test@example.org.

Die Screenshots liegen im Scratchpad unter `C:/Users/SALEAD~1/AppData/Local/Temp/claude/c--Users-SALEADMIN-Downloads-Oekoinvest-Web/3140c08a-2721-4ee9-a47f-9fce6660cd23/scratchpad/` in den Ordnern `b5`, `b5b` und `b5c`.

## Welle 3 · B6 Bau · Flächenpass Stufe 1

Paket B6, der Flächenpass Stufe 1, ist gebaut und läuft unter `/rechner/flaechenpass`. Die Seite liefert in allen Länder- und Sprachfassungen eine Seite (`/de`, `/at`, `/ch`, `/en`, `/en/<land>`), überall mit noindex und nicht in der Sitemap. Von 787 Tests im `npm test` schlägt einer fehl, und der liegt nicht in meinem Paket (Erklärung unten).

## Was gebaut ist

Auf der Seite kann man die Fläche auf einer Karte einzeichnen oder die Größe direkt eingeben. Dazu kommen sechs kurze Fragen und je nach Land zwei oder drei Zusatzfragen:
- **DE:** Abstand zu Autobahn oder Bahn (200-m- und 500-m-Streifen) und benachteiligtes Gebiet.
- **AT:** verordnete PV-Zone (NÖ, Burgenland, Steiermark) bzw. Entfernung zum Umspannwerk (OÖ); in den übrigen Bundesländern Einzelfall.
- **CH:** Eignungsgebiet, vorbelastet, Fruchtfolgefläche.

**Ergebnis:** Größe in ha, mögliche Leistung in MWp, Stromertrag und eine Eignung von 0 bis 100 Punkten mit Ampel, Vorrang A/B/C und Begründung je Kriterium. Die Eignung kommt aus der internen `scoring.js`, die ich nicht verändert habe.

**Checkliste der Restriktionen** in drei Spalten:
- die eigenen Angaben, je mit Stufe erfüllt / prüfen / kritisch / „wird im Gespräch geprüft“,
- der Rechtsrahmen des Bundeslands bzw. der Schweiz, nur Einträge mit Quelle,
- die Ausschluss- und Restriktionskriterien.

Rechtliche Aussagen stammen nur aus bereits veröffentlichten Texten (Freiflächen-Seite, Flächencheck) und den Regionsdaten mit Quelle. Was der Nutzer nicht weiß, bleibt „offen“ und zählt mit einem mittleren Wert; eine unbekannte Netzentfernung wird vorsichtig mit 5 km angesetzt.

**Keine Geldwerte**, in keinem Land. Der Pass verweist für die Pacht auf den Pachtrechner.

**Lead:** Der bestehende Bericht-Baustein (`BerichtAnfordern`) mit Name und E-Mail, Telefon freiwillig. Der Server prüft die Fläche selbst, misst sie neu und ignoriert die ha-Angabe aus dem Browser. Fläche und ha landen im Vorgang. Die Fläche wird als Zeichenkette `"lon,lat;…"` übertragen, weil das Lead-Backend nur flache Werte speichert.

**Karte:** Ich habe das vorhandene Leaflet genutzt, keine neue Abhängigkeit. Die Kacheln kommen von amtlichen Anbietern: BKG TopPlusOpen für DE, basemap.at für AT (mit Luftbild), swisstopo für CH (mit Luftbild), jeweils mit Namensnennung. Die Karte lädt erst nach einem Klick auf „Karte laden“ mit Hinweis auf die IP-Übertragung; es wird kein Cookie gesetzt. Ohne Karte geht der Weg über „Größe angeben“. Ecken setzen, verschieben, rückgängig machen und neu zeichnen funktioniert; Selbstüberschneidung, Flächen außerhalb von DACH und Flächen unter 0,1 ha bzw. über 2.000 ha werden abgelehnt.

Den PVGIS-Proxy gibt es nicht. Der Ertrag kommt aus den PVGIS-Werten der Regionsdaten.

**Englische Fassung:** vollständig, auch die Regionsdaten.

## Dateien

Neu:
- `src/app/(stamm)/rechner/flaechenpass/page.js` (nutzt den Seitenrahmen der Rechner, also dieselbe Optik)
- `src/components/Flaeche/Flaechenpass/Flaechenpass.js` und `Karte.js`
- `src/lib/rechner/flaechenpass.js` (Logik) und `flaechenpassTexte.js` (Texte DE/EN)
- `src/lib/bericht/flaechenpass.js`
- Tests: `src/lib/rechner/flaechenpass.test.mjs`, `src/lib/bericht/flaechenpass.test.mjs`
- Drei Routen, erzeugt mit `scripts/landfassungen.mjs`

In gemeinsamen Dateien nur meine Einträge ergänzt:
- `src/lib/land/seiten.js` (`index: false`), `src/lib/sprache/seiten.js` (übersetzt, `index: false`), `src/components/Rechner/tools.js` (Eintrag plus EN-Text)
- `src/lib/bericht/neuRechnen.js`: Rechner „flaechenpass“, neue Feldregel `eigen` und Haken `normalisieren`; die übrigen Rechner verhalten sich unverändert
- `src/lib/bericht/annahmenbuch.js` und die Positivliste in `neuRechnen.test.mjs`

## Wie geprüft

- **Neue Tests:** 14 grün (Geometrie, Normalisierung, Ausschlussgründe, Checkliste, keine Geldwerte, Bericht, Vorgangsdaten, 422-Fälle). Die bestehenden Tests für Bericht und Dienst sind ebenfalls grün.
- **`npm test`:** 786 von 787 grün. Fehlgeschlagen ist `sprache.test.mjs` „englische Routen“ (135 statt 134 Dateien). Ursache ist die neue Datei `src/app/(en)/en/[land]/[...unbekannt]/page.js` aus Paket W3-0, nicht der Flächenpass. Die QM muss das klären.
- **`npm run test:charakterisierung`:** 195 von 195 grün. Die Rechenlogik der bestehenden Rechner habe ich nicht verändert.
- **`landfassungen --pruefen`:** grün. **eslint** auf allen geänderten Dateien: sauber.
- **Screenshots** bei 1440 und 390 (gemeinsame Seite, `/at`, `/ch`, `/en/ch`, `/en/at`): kein horizontaler Überlauf, keine Konsolenfehler. Das Einzeichnen in Oberösterreich ergab 89,8 ha und 65 Punkte; Checkliste und „Bericht anfordern“ werden angezeigt. In der Schweizer Fassung erscheint „Grösse“ statt „Größe“.

## Offen (Inhaberpunkte)

1. **Datenschutzerklärung:** Sie sagt heute, es gebe keine eingebetteten Karten. Die Kachel-Anbieter (BKG, basemap.at, swisstopo) mit der Zwei-Klick-Lösung muss die Rechtsabteilung ergänzen, bevor die Seite live geht.
2. **Fachprüfung (zweite Prüfperson E6):** offen für die Bewertungslogik in öffentlicher Form, die Texte der Checkliste und die Schwellen. Erst danach `index: false` aufheben.
3. **Unterschiedliche Ertragswerte Schweiz:** Die Scoring-Engine rechnet mit 1.050 kWh/kWp, die Regionsdaten mit 1.230. Angezeigt wird der Regionswert; die Punkte für die Einstrahlung (höchstens 4) nutzen den Engine-Wert. Das sollte vereinheitlicht werden.
4. **Bericht der Schweiz:** Der Bericht ist nur deutsch; Regionstexte darin können im Bericht für die Schweiz noch „ß“ enthalten.
5. **Ohne Karte, Geocoder und Flurstück-Daten:** Es gibt keine Ortssuche (Nominatim bewusst nicht genutzt) und keine Katasterdaten. Die Karte startet in der Mitte des gewählten Bundeslands; Stufe 2 bräuchte amtliche Kataster- und Schutzgebietsdienste.
6. **Verlinkung vom Flächencheck:** Ein Hinweis auf den Flächenpass im Flächencheck wäre sinnvoll, gehört aber nicht zu meinem Paket.

## Welle 3 · W3-0 Prüfung

## Prüfbericht W3-0 (Reste aus der Ländermodell-Abnahme)

**Ergebnis: bestanden, nachdem ich die Lücken selbst geschlossen habe.** Der Bau-Agent hat nichts gemeldet („null“). Im Code waren nur die Punkte 4 und 5 erledigt. Die Punkte 1, 2 und 3 habe ich als Prüfer gebaut.

### 1. Kein „ß“ auf /ch und /en/ch – gebaut
- **Zentraler Helfer:** `src/lib/land/schreibweise.js` ersetzt ß durch ss, wirkt nur für das Land CH und lässt Links, IDs, Icons und Komponenten unberührt.
- **Eingebunden an den Stellen, an denen Texte ausgegeben werden:**
  - die Übersetzungsfunktionen `uebersetze()`, `inhaltFuer()`, `inhaltFuerSprache()`, `useTexte()` und `<T>`; Serverkomponenten bekommen das Land automatisch aus `seite.js`
  - Navigation, Footer und die Seiten-Metadaten
  - die Rechnerliste `toolsFuer(sprache, land)` (`src/components/Rechner/tools.js`)
- **Für fest geschriebenes JSX:** ein zweiter Helfer `src/components/Land/SchweizerSchreibweise.js` (`schreibweiseBaum`). Die Komponente gibt ihr Ergebnis einmal hindurch, dann sind Texte und Text-Attribute ohne ß.
  - Angewendet auf: Genossenschaft (Seite, Hero, Abschnitte), Regionen und Regionsseiten, Ratgeber, Lexikon, Referenzen, Marktdaten, Fristen, Energie live, Großspeicher-Rechner, Investoren-Ablauf, Dach-Bausteine (Fakten, Vertrag, Steuern), Speicher-Netz, beide Regionskarten, Flächencheck-Abschnitte, Reststrom-Hero.
  - Außerdem in einigen Client-Komponenten: Energiefluss-Grafik, Empfehlungen, Prozess-Tabs, Wege-Entscheider, Börsenliste und vier Formulare.
- **Neue Tests:** `src/lib/land/schreibweise.test.mjs` und `src/components/Land/SchweizerSchreibweise.test.mjs`.

### 2. Deutsches Recht auf AT/CH-Seiten – gebaut
- **Genossenschaft:** „§ 6 EEG“ und „EEG-Vergütung“ stehen auf AT/CH in einer neutralen Fassung ohne Rechtsgrundlage.
- **Due-Diligence-Liste Investoren:** Auf AT/CH stehen acht Prüfpunkte mit deutschem Recht, deutschen Registern oder Normen jetzt mit „In Deutschland:“ (EN „In Germany:“) davor.
- **Regionsseiten:** Wird der Rechtsrahmen eines anderen Landes gezeigt (z. B. /at/regionen/bayern), steht das Land fett davor.
- **Landwirte auf CH:** Dort galt fälschlich die EU-Agrarförderung GAP. Jetzt steht die neutrale Schweizer Fassung aus `src/data/laender/ch/agri-pv.js` (beitragsberechtigt nur bei Bewilligung als Agri-PV).
- **Übrige Fundstellen** aus dem Suchlauf über 48 CH-Seiten sind bereits gekennzeichnet: Länderkarten „Deutschland“, LandHinweis auf Rechnerseiten, „EEG“ als österreichische Energiegemeinschaft, Marktdaten mit „Deutschland“.

### 3. „gilt für Deutschland“ auf der gemeinsamen Seite – gebaut
- Genossenschaft: Karten „Gemeinden“ und „Park erzeugt Strom“.
- Freifläche: FAQ zur Zahlung an die Gemeinde.
- Kommunen: vier FAQ mit deutschem Recht.
- Geprüft: /kommunen hat 10 Vermerke, /de/kommunen keinen.

### 4. und 5. – bestanden
- **404-Seiten:** Getestet wurden /at, /ch, /de, /en, /en/at und tiefere Pfade. Die Sprache stimmt jeweils (de-AT, de-CH, en), die Links bleiben im Land, auf /en/at sind sie englisch.
- **Tests angepasst:** Die Routen-Tests in `src/lib/land/routen.test.mjs` waren durch den Bau rot. Ich habe sie angepasst und einen Test ergänzt, dass die 404-Fänger nie Inhalt zeigen.
- **`/api/land`:** ist entfernt und hat keine Verweise mehr.

### 6. Beispielrechnungen mit deutschen Werten – bestanden
Alle Fundstellen auf AT/CH sind als „Werte für Deutschland“ gekennzeichnet oder zeigen dort keine Euro-Werte, sondern den LandHinweis: Fläche verpachten, Dachpacht, Bestandsanlagen, Kommunen, Rechner-Übersicht, Provision und „Projekt anbieten“.

### Prüfung
- **Tests:** `npm test` 786 von 787 grün. Der eine rote Test („englische Seiten außerhalb des Registers“) kommt von neuen Seiten anderer Pakete (gewerbestrom-check, ausschreibungen), nicht von W3-0. Ein zwischenzeitlich roter Faktentest (BestandteileTabelle) war beim letzten Lauf wieder grün.
- **Rechner:** `npm run test:charakterisierung` 195 von 195 grün; an der Rechenlogik habe ich nichts geändert.
- **eslint:** auf alle geänderten Dateien ohne Befund.
- **Screenshots** bei 1440 und 390 Pixel: keine Überläufe, keine Konsolenfehler, gleiche Optik.
- **Nachprüfung auf ß:** /ch/genossenschaft, /ch/investoren, /ch/landwirte, /ch/energie-live und /en/ch/genossenschaft sind ohne ß. Auf Dachfläche verpachten und den Regionsseiten waren noch drei Stellen übrig; die habe ich danach umgestellt, aber nicht noch einmal nachgeprüft.

### Offen
- **Restliches ß nicht vollständig geprüft:** Fest geschriebener Text in Komponenten, die nicht über die Helfer laufen, kann auf /ch noch ß enthalten, etwa in Bildbeschreibungen der Ratgeber-Karten und in Ratgeber-Artikeln. Der Suchlauf deckte nur die 48 Hauptseiten ab. Weitere Fundstellen lassen sich mit `schreibweiseBaum` je Datei in einer Zeile beheben. Die Strukturdaten für Suchmaschinen (JSON-LD) werden nur auf der Genossenschaftsseite umgeschrieben.
- **Gemeinsam genutzte Dateien:** Ich habe zusätzlich `src/app/(stamm)/marktdaten/page.js` und `src/components/Rechner/tools.js` geändert, die auch andere Pakete bearbeiten. Es sind nur kleine Ergänzungen, auf /de und der gemeinsamen Seite ändert sich nichts. Der QM sollte das beim Commit-Vorschlag beachten.
- **Inhaberpunkte:**
  - Die neutralen AT/CH-Fassungen (Genossenschaft, Schweizer Landwirte-Wege) sind nicht fachlich geprüft und brauchen die zweite Prüfperson E6.
  - Die Due-Diligence-Liste hat weiterhin keine eigene AT/CH-Fassung, nur die Kennzeichnung und den LandHinweis.

Prüfwerkzeuge liegen unter `~/claude-browser/w30-text.mjs` und `~/claude-browser/w30-element.mjs`, die Screenshots im Scratchpad unter `w30/`.

## Welle 3 · B6 Prüfung

# Prüfbericht Paket B6 (Flächenpass Stufe 1)

**Ergebnis:** Das Paket ist bestanden, nachdem ich vier Fehler behoben habe. Ein Testfehler bleibt im Gesamtlauf. Er stammt nicht aus B6, sondern aus Paket W3-0.

## Bestanden

**Seiten**
- Alle sieben Fassungen antworten mit 200: gemeinsame Seite, `/de`, `/at`, `/ch`, `/en`, `/en/at` und `/en/ch`.
- Alle tragen `noindex, follow`, wie die anderen ungeprüften Seiten (z. B. `/marktdaten/fristen`). In der Sitemap steht die Seite nicht.
- Die Seite ist richtig eingetragen in `src/lib/land/seiten.js` und im Sprachregister (`index: false`). Die vier Routen sind dünne Weiterleitungen, so wie `scripts/landfassungen.mjs` sie erzeugt.

**Eigene Gegenrechnung**
- Ein Quadrat von 0,01° × 0,01° bei 48° N ergibt 82,73 ha. Die Sollgröße liegt bei etwa 82,8 ha, das passt.
- 82,73 ha ÷ 1,1 ha je MWp = 75,2 MWp. Bei 1.100 kWh/kWp ergibt das 82.720 MWh.
- Die Kriterien summieren sich auf 85 Punkte. Das ergibt Ampel grün und Vorrang A.
- Ausschlussgründe greifen richtig: 1,5 ha mit Naturschutzgebiet ergibt 15 Punkte, mit beiden Ausschlussgründen.
- Eine selbstüberschneidende Fläche wird abgelehnt.
- Die Schweiz mit Fruchtfolgefläche bekommt 8 Punkte Abzug.

**Lead-Kette**
- Der Server prüft die Eingaben gegen eine Positivliste und gibt bei Fehlern 422 zurück.
- Die Fläche wird auf dem Server neu gelesen und gemessen. Bei gezeichneter Fläche ersetzt der Server die ha-Angabe aus dem Browser durch seine eigene Messung.
- Die Region muss zum Land passen, sonst kommt 422.
- Der Bericht nennt keine Geldwerte.

**Recht und Aussagen**
Die rechtlichen Aussagen sind durch Texte belegt, die schon auf der Website stehen:
- 200-m-Streifen nach § 35 Abs. 1 Nr. 8 b BauGB: Freiflächen- und Kommunen-Seite.
- Priorität 1 und 2 in Oberösterreich: `src/data/regionen/oberoesterreich.js`.
- Art. 24ter RPG: `src/data/laender/ch/freiflaeche.js` und der Ratgeber Schweiz.

Es gibt keine Fremdmarken und keine Umweltclaims. Die Kachel-Anbieter werden genannt, weil die Lizenzen das verlangen, nicht als Werbung.

**Design**
- Der Seitenrahmen und die Bausteine sind dieselben wie beim Pachtrechner.
- Ich habe mit Bedienung geprüft: Bundesland wählen, „Größe angeben“, Ergebnis und Checkliste. Geprüft habe ich `/at` und `/de` bei 1440 sowie `/ch`, `/en/at` und die gemeinsame Seite bei 390. Es gibt keinen Überlauf und keine Konsolenfehler.

**Englisch**
In Navigation und Hauptinhalt von `/en/at` steht kein deutscher Text mehr. Übrig sind nur Firmennamen wie „ÖKOVOLT“.

## Behoben

1. **Pacht-Hinweis auf AT- und CH-Seiten war irreführend.** Dort stand „Die Pachtspanne rechnet der Pachtrechner“, obwohl AT und CH für Pachtwerte gesperrt sind.
   - Jetzt steht dort: „Pachtwerte für Österreich / die Schweiz nennen wir erst nach der Prüfung Ihrer Fläche“.
   - Der Link führt zum Kontakt, auch in Englisch.
   - Datei: `src/components/Flaeche/Flaechenpass/Flaechenpass.js`
2. **„Benachteiligtes Gebiet“ wurde ohne Vorbehalt als „in der Kulisse“ gewertet.** Die Bundesländer können diese Gebiete aber ausschließen.
   - Wenn nur das benachteiligte Gebiet zutrifft, ergänzt der Pass jetzt den Satz aus der Fußnote der Freiflächen-Seite: „Ob Ihr Bundesland die Öffnung benachteiligter Gebiete eingeschränkt hat, prüfen wir flurstückgenau.“ Das gilt für DE, EN und den Bericht.
   - Datei: `src/lib/rechner/flaechenpassTexte.js`
3. **Auf `/ch` stand im Erklärtext noch „ß“** („Größe“, „Flächenkulisse …“).
   - Der Text läuft jetzt durch `schreibweiseBaum`.
   - Datei: `src/app/(stamm)/rechner/flaechenpass/page.js`
4. **Die Mindestgröße war in der Checkliste fest auf 2 ha gesetzt.**
   - Sie kommt jetzt aus `SCHWELLEN.mindestHa` in `src/lib/rechner/flaechenpass.js`.

Für 2 und 4 gibt es einen neuen Test in `src/lib/rechner/flaechenpass.test.mjs`.

## Prüfläufe

- `npm test`: 787 von 788 grün. Der eine Fehler ist `sprache.test.mjs` „englische Routen“: 135 statt 134 Seiten. Ursache ist die nicht eingetragene Datei `src/app/(en)/en/[land]/[...unbekannt]/page.js` aus Paket W3-0. Das muss die Qualitätskontrolle klären.
- `npm run test:charakterisierung`: 195 von 195 grün.
- `npx eslint` auf alle geänderten und neuen B6-Dateien: sauber.

## Offen (Inhaberpunkte)

1. **Datenschutzerklärung:** Die drei Kachel-Anbieter (BKG, basemap.at, swisstopo) und die Zwei-Klick-Lösung müssen ergänzt werden, bevor die Seite live geht.
2. **Fachprüfung durch die zweite Prüfperson (E6):** Bewertungslogik in öffentlicher Form, Checklisten-Texte und Schwellen. Erst danach `index: false` aufheben.
3. **Ertragswert Schweiz:** Die Bewertung rechnet mit 1.050 kWh/kWp, die Regionsdaten mit 1.230. Das sollte vereinheitlicht werden.
4. **Bericht für die Schweiz enthält „ß“:** Die Berichtsseite hat bisher keine Schweizer Schreibweise. Das betrifft alle Rechner, nicht nur B6. Ebenso steht im globalen Cookie-Banner auf `/ch` noch „übertragen“ mit „ß“-freier, aber deutscher Schreibweise der Kopf-Texte unverändert – der Banner gehört nicht zu B6.
5. **Flächenbedarf je MWp:** Der Wert von 1,1 ha je MWp gilt für alle drei Länder gleich. Ob er für AT und CH passt, sollte die Fachprüfung bestätigen.
6. **Netzanschluss-Punkte bei großen Flächen:** Ein Park mit 75 MWp in 1–3 km Netzentfernung bekommt beim Kriterium „Netzanschluss im Verhältnis zur Größe“ nur 1,4 von 8 Punkten. Das kommt aus der unveränderten Bewertungslogik (`scoring.js`). Die Fachprüfung sollte es einmal ansehen.
7. **Verweis aus dem Flächencheck auf den Flächenpass** fehlt noch. Das gehört nicht zu B6.

Die Bilder liegen hier:
- `C:\Users\SALEAD~1\AppData\Local\Temp\claude\c--Users-SALEADMIN-Downloads-Oekoinvest-Web\3140c08a-2721-4ee9-a47f-9fce6660cd23\scratchpad\b6\`

Das Prüfskript liegt in `C:\Users\SALEADMIN\claude-browser\b6-pruef.mjs`.

## Welle 3 · B7 Bau · EG-Software AT: Preisblatt, Wechsel-Check, White-Label

Paket B7 steht: Preisblatt, Wechsel-Check und White-Label-Seite für die EG-Software in Österreich. `npm test` hat einen roten Test, den ein anderes Paket verursacht. Commits gibt es keine.

**Prüfstand**
- **Rechenlogik:** Meine 14 neuen Tests sind grün, `npm run test:charakterisierung` auch (195 von 195).
- **Roter Test:** `src/lib/sprache/sprache.test.mjs` erwartet 134 englische Routen und findet 135. Die zusätzliche Datei ist `src/app/(en)/en/[land]/[...unbekannt]/page.js`, der neue 404-Fänger aus W3-0. Das QM muss entweder die Erwartung im Test anpassen oder den Fänger herausnehmen.
- **Routen und Lint:** `node scripts/landfassungen.mjs --pruefen` meldet alle 67 Seiten vollständig, eslint auf allen geänderten Dateien ist ohne Fehler.
- **Erreichbarkeit:** Per curl liefern 15 Länder- und Sprachfassungen Status 200 und tragen noindex.
- **Screenshots** bei 1440 und 390, mit dem Read-Tool angesehen:
  - Keine der geprüften Seiten läuft bei 390 über, und es gibt keine Konsolenfehler.
  - Den Wechsel-Check habe ich auf Deutsch (1440) und Englisch (390) bis zum Ergebnis und Anfrageformular durchgeklickt.
  - Die Hinweise für /de und /ch werden richtig angezeigt.
  - Die neuen Links auf der Software-Seite habe ich geprüft.
- **Was ungeprüft ist:**
  - Bei 390 liefen nur sechs Seitenaufrufe durch. Der Dev-Server war mittendrin zweimal kurz weg; der Wächter hat ihn neu gestartet.
  - Das Absenden der Formulare habe ich nicht getestet. Alle drei nutzen aber die bestehende Formularstrecke (`typ: energiegemeinschaft`, `land: "AT"`).

**Neue Seiten** (alle unter `/energiegemeinschaften/software/…`, auch unter /de, /at, /ch und /en, auf Englisch übersetzt, noindex und nicht in der Sitemap)
- **`preise` (Preisblatt):** drei Pakete (Software, Betriebsführung, Gründung) mit denselben Posten: Einrichtung, Grundgebühr je Gemeinschaft, Betrag je Zählpunkt. Im Code gibt es keine freigegebenen Preise, darum steht überall „Preis auf Anfrage“ mit dem Vermerk „Beträge noch nicht veröffentlicht: Die Freigabe steht aus“. Ein Test schlägt fehl, sobald ohne Freigabe ein Betrag eingetragen wird. Dazu eine Preisanfrage in die Lead-Kette.
- **`wechsel-check`:** sieben Fragen an bestehende Gemeinschaften. Das Ergebnis beantwortet getrennt „Lohnt sich ein Wechsel?“ (wer keine Probleme nennt, bekommt „eher nicht“) und „Ist er möglich?“ (was vorher zu klären ist).
  - Der Hinweis auf die Netzbetreiber-Einschränkung bis voraussichtlich April 2027 kommt wörtlich aus dem Faktenregister, mit Quelle und Stand. Ab 01.05.2027 erscheint dort „Stand abgelaufen, wird geprüft“.
  - Am Ende „Wechselplan anfordern“; Antworten und Ergebnis gehen mit, Telefon nur bei Rückrufwunsch. Keine fremden Anbieternamen.
  - Der Check steht auch in der Rechner-Übersicht.
- **`white-label`:** für Stadtwerke und Energieversorger: Nutzen, wer macht was, Ablauf in vier Schritten, ehrliche Rahmenbedingungen und ein Anfrageformular mit Bundesland.
- **Länder:** /at zeigt alles. Die gemeinsame Seite zeigt alles mit dem Kennzeichen „Österreich“. /de und /ch zeigen stattdessen einen Länderhinweis mit Link zur Österreich-Fassung und zur Seite Energiegemeinschaften. Energy Sharing in Deutschland nenne ich ohne Datum, weil es dazu keinen Eintrag im Faktenregister gibt.

**Geänderte Dateien**
- **Neu:**
  - Rechenlogik `src/lib/eg-angebot/` (`preisblatt.js`, `wechselCheck.js`, `fakten.js`, Test `eg-angebot.test.mjs`)
  - Faktenregister-Modul `src/lib/fakten/daten/eg-at.js` mit vier ElWG-Aussagen, Status „Prüfung ausstehend“
  - Bausteine `src/components/Portal/EG/Angebot/` (`Kopf.js`, `Teile.js`, `Preisblatt.js`, `WechselCheck.js`)
  - drei Seiten unter `src/app/(stamm)/energiegemeinschaften/software/` plus neun erzeugte Länder- und Sprachrouten
- **In gemeinsamen Dateien nur Einträge ergänzt:** `src/lib/fakten/index.js`, `src/lib/land/seiten.js`, `src/lib/sprache/seiten.js`, `src/components/Rechner/tools.js`
- **Auf der Software-Seite:** Link „Zum Preisblatt“ in `Pakete.js`, Button „Wechsel-Check starten“ in `Wechsel.js`
- Keine neuen npm-Abhängigkeiten. Einen Bericht über `/api/rechner/bericht` gibt es nicht: Der Baustein rechnet Zahlen neu, der Wechsel-Check ist eine Einschätzung ohne Zahlen. Außerdem ändern andere Pakete `neuRechnen.js` gerade.

**Inhaberpunkte**
1. **Preise:** Beträge (netto, EUR) in `src/lib/eg-angebot/preisblatt.js` eintragen und `FREIGABE` auf freigegeben setzen, mit Datum und wer freigibt. Dann erscheinen netto und brutto (20 % USt).
2. **Zusagen auf der Preisblatt-Seite bestätigen:**
   - Der laufende Preis richtet sich nach Zählpunkten, nicht nach der geteilten Strommenge.
   - Kosten Dritter werden getrennt ausgewiesen.
   - Wechselaufwand steht im Angebot unter „Einrichtung“.
3. **White-Label:** Technisch ist es noch nicht umgesetzt. Die Seite sagt das offen („richten wir mit den ersten Partnern ein“). Ich verspreche aber Portal, Beitritt und Belege im Erscheinungsbild des Partners; das sollte der Inhaber bestätigen.
4. **Fachprüfung (E6):**
   - Die vier ElWG- und EDA-Aussagen im Faktenregister sind nicht am Original geprüft.
   - Beim EDA-Handbuch fehlen Link und Seitenzahl.
   - Das „April 2027“ ist laut Koordinationsstelle nur „voraussichtlich“.
   - Danach die noindex-Einträge austragen.
5. **Einträge in Gemeinsamen Dateien:** Die bestehende Software-Seite zeigt auf /de und /ch weiterhin Österreich-Inhalte. Das gehört nicht zu B7, wäre aber ein Fall für W3-0.

Screenshots liegen in `C:\Users\SALEAD~1\AppData\Local\Temp\claude\c--Users-SALEADMIN-Downloads-Oekoinvest-Web\3140c08a-2721-4ee9-a47f-9fce6660cd23\scratchpad\b7\`.

## Welle 3 · B7 Prüfung

# Prüfbericht Paket B7 (EG-Software Österreich: Preisblatt, Wechsel-Check, White-Label)

**Ergebnis:** bestanden. Sechs Mängel habe ich direkt behoben. Zwei rote Tests in `npm test` stammen aus anderen Paketen.

## Bestanden

**Seiten und Routen**
- Alle drei Seiten liefern per curl Status 200 in 24 Fassungen: gemeinsam, /de, /at, /ch, /en, /en/at, /en/de und /en/ch.
- Alle tragen noindex: im Register `index: false` und in den Metadaten `noindex, follow`.
- Keine der drei Seiten steht in der Sitemap.
- `landfassungen.mjs --pruefen` meldet 71 Seiten, alle vollständig.

**Länder**
- /de und /ch (auch auf Englisch) zeigen den Länderhinweis. Er ist in allen 12 Aufrufen da und verlinkt korrekt auf die AT-Fassung, auch unter /en zu /en/at.
- Unter /at und auf der gemeinsamen Seite erscheint alles, gekennzeichnet mit „Österreich“.

**Rechenlogik**
- Eigene Gegenrechnung mit „Ehrenamt“ (2) und „Kosten“ (1), dazu Tabellen bei 21–100 Zählpunkten (2): zusammen 5, also „sehr wahrscheinlich“. Das stimmt.
- Für „möglich“ ergeben „feste Laufzeit“ und „EDA nur beim Anbieter“ zwei Vorbereitungsschritte. Das stimmt auch.
- Hinweise für Modellwechsel und Netzgebiet sind richtig zugeordnet.
- Das Preisblatt zeigt ohne Freigabe nie einen Betrag; das sichert ein Test ab.

**Lead-Kette**
- Ich habe den Wechsel-Check per Playwright bis zum Formular durchgeklickt und es abgeschickt.
- Der Inhalt der Anfrage ist richtig: `typ: energiegemeinschaft`, `land: AT`, Anliegen und alle Antworten mit Ergebnis.
- Telefon ist kein Pflichtfeld, Rückruf steht auf `false`.
- Die Anfrage an `/api/anfrage` im Demo-Modus antwortet mit 200, `vorgang.land` ist „AT“.
- Konsolenfehler: keine. Bei 390 ist die Seite 390 px breit, kein Überlauf.

**Recht und Aussagen**
- Keine fremden Anbieternamen, keine Preise, keine Umweltaussagen.
- Die Aussagen zum ElWG und zum EDA kommen aus dem Faktenregister, mit Quelle, Stand und dem Status „Prüfung ausstehend“.
- Das „voraussichtlich April 2027“ steht dort wörtlich, mit Ablauf zum 30.04.2027.

**Englisch:** Menü und Hauptinhalt sind englisch. Nur der Quellentitel der Koordinationsstelle bleibt als Eigenname deutsch.

**Prüfläufe**
- eslint auf allen Dateien von B7: ohne Fehler.
- Die 14 Tests von B7 sind grün.
- `test:charakterisierung` ist grün, 195 von 195.

## Behoben

1. **Überlauf bei 390, abgeschnitten:** Im Seitenkopf (`src/components/Portal/EG/Angebot/Kopf.js`) liefen Überschrift und Einleitung rechts aus dem Bild. Ursache war die lange Kennzeile, die die Spalte breiter als den Bildschirm machte. Die Prüfung meldete das nicht, weil der Abschnitt das Überstehende abschneidet. Die Spalten haben jetzt `min-w-0`; ich habe Preisblatt und White-Label bei 390 neu fotografiert und angesehen.
2. **Wechsel-Check, Sackgasse nach „Zurück“:** Bei Fragen mit nur einer Antwort ließ sich die schon gewählte Antwort nicht erneut anklicken, einen Weiter-Knopf gab es nicht. Jetzt erscheint „Weiter“, sobald eine Antwort gewählt ist (`WechselCheck.js`). Per Playwright geprüft.
3. **„ß“ auf CH-Seiten:** Kopf und Texte von Preisblatt und White-Label zeigten unter /ch „Größe“. Jetzt laufen die Texte durch `schreibweiseFuer(…, land)`; curl zeigt unter /ch „Grösse“ und kein „Größe“ mehr.
4. **Unbelegte Aussage zu Kosten Dritter:** Preisblatt-Seite, Grundsätze und FAQ nannten „Gebühren für den EDA-Zugang“ und „Kosten für die Vereinsgründung“. Beides ist nicht im Register belegt. Ersetzt durch „Bankgebühren für SEPA-Einzüge, Kosten einer Rechts- oder Steuerberatung“, auf Deutsch und Englisch.
5. **Abschlussband im Wechsel-Check:** Der Titel „Wechseln, ohne dass der Strom stockt“ deutete ein Risiko an, das es beim Software-Wechsel nicht gibt. Neu: „Wechseln mit Plan und Parallellauf.“, auf Englisch „Switch with a plan and a parallel run.“
6. **White-Label, Zusage abgeschwächt:** Statt „Portal, Beitritt und Belege tragen Ihr Erscheinungsbild“ steht jetzt „… in Ihrem Erscheinungsbild – den genauen Umfang legen wir im Angebot fest“, auf Deutsch und Englisch.

## Offen

**Rote Tests aus anderen Paketen, nicht B7**
- `sprache.test.mjs` erwartet 134 englische Routen und findet 135. Grund ist der neue 404-Fänger `src/app/(en)/en/[land]/[...unbekannt]/page.js` aus W3-0.
- Der Test „Positivliste“ in `neuRechnen.test.mjs` findet einen zusätzlichen Eintrag `ratsvorlage`, stammt also aus einem anderen Paket (vermutlich B8).

**Kleinigkeit:** Der Kopf der Rechnerseite zeigt „Stand September 2026“. Das ist eine gemeinsame Konstante in `RechnerSeite.js`, die Fakten haben Stand 01.10.2026. Ich habe sie nicht geändert, weil die Datei allen gehört.

**Inhaberpunkte, wie vom Bau-Agenten gemeldet und weiter gültig**
1. Preise eintragen und `FREIGABE` setzen.
2. Die Zusagen auf der Preisblatt-Seite bestätigen: Preis nach Zählpunkten, Kosten Dritter getrennt, netto und brutto, schriftliches Angebot vor dem Vertrag.
3. White-Label: den versprochenen Umfang bestätigen; technisch ist es noch nicht gebaut.
4. Fachprüfung E6 der vier ElWG- und EDA-Aussagen: Beim EDA-Handbuch fehlen Link und Seitenzahl, der Paragraf „§ 68 Abs. 2 ElWG (Organisator)“ ist ungeprüft. Danach noindex austragen.
5. Die bestehende Software-Seite zeigt unter /de und /ch weiterhin Österreich-Inhalte; das ist ein Fall für W3-0.

**Nicht geprüft:** Die Preisanfrage und die White-Label-Anfrage habe ich nicht im Browser abgeschickt. Beide nutzen dieselbe Formularstrecke wie der geprüfte Wechsel-Check.

**Geänderte Dateien in dieser Prüfung:**
- `src/components/Portal/EG/Angebot/Kopf.js`
- `src/components/Portal/EG/Angebot/WechselCheck.js`
- `src/app/(stamm)/energiegemeinschaften/software/preise/page.js`
- `src/app/(stamm)/energiegemeinschaften/software/white-label/page.js`
- `src/app/(stamm)/energiegemeinschaften/software/wechsel-check/page.js`

**Prüfskript:** `C:\Users\SALEADMIN\claude-browser\b7-pruef.mjs`

**Screenshots:** `C:\Users\SALEAD~1\AppData\Local\Temp\claude\c--Users-SALEADMIN-Downloads-Oekoinvest-Web\3140c08a-2721-4ee9-a47f-9fce6660cd23\scratchpad\b7pruef\` und `…\b7pruef2\` (der zweite Ordner enthält die Bilder nach der Korrektur bei 390 und das Wechsel-Check-Ergebnis).

Commits gibt es keine.

## Welle 3 · B8 Bau · Kommunal 2.0 mit Ratsvorlage

# Bericht Paket B8: Kommunal 2.0 mit Ratsvorlage

Das Paket ist gebaut: zwei neue Seiten mit Lead über den Bericht-Baustein. Die Rechenlogik der bestehenden Rechner ist unverändert.

**Ein Test ist rot, aber nicht durch B8:** Von 808 Tests in `npm test` schlagen 807 nicht fehl, einer aber schon. Er zählt die englischen Seiten (143 statt 142), und die überzählige Seite ist `src/app/(en)/en/[land]/[...unbekannt]/page.js` aus Paket W3-0. Bitte beim QM prüfen. Die Charakterisierungstests (195) sind grün.

## Gebaut

**1. Ratsvorlage mit Kommunal-Rechner 2.0** unter `/kommunen/ratsvorlage`, auch unter `/de`, `/at`, `/ch`, `/en` und `/en/<land>`.
- **Deutschland:** Die Einnahmen werden genau wie in `/rechner/kommune` gerechnet; die Ertragsregion folgt aus dem gewählten Bundesland.
  - Für die 7 Länder mit Beteiligungsgesetz (BY, BB, MV, NI, SL, SN, ST) zeigt die Seite das Gesetz, für wen es gilt, die Ausnahmen, die Quelle und einen Orientierungsbetrag für das erste Betriebsjahr.
  - Dieser Betrag ist als „Prüfung ausstehend“ markiert und wird **nicht** zur Summe addiert, weil jedes Landesgesetz selbst regelt, wie er mit § 6 EEG verrechnet wird.
  - Für Sachsen nennt die Seite keinen Betrag: Das Gesetz wurde 09/2025 geändert, der geltende Wert ist nicht belegt.
- **Österreich:** keine Geldwerte, sondern Ablauf, beteiligte Stellen und Prüfpunkte der Widmung je Bundesland, dazu die ElWG-Regel aus dem Register und ein Länderhinweis.
- **Schweiz:** nur der Länderhinweis.
- **Ohne Länderwahl:** Im Werkzeug gibt es einen Umschalter Deutschland / Österreich.

**2. AT-Widmungskit** unter `/kommunen/widmungskit`: für alle 9 Bundesländer Ablauf, Stellen und Prüfpunkte mit Quelle je Punkt, zum Abhaken und Drucken. Die Inhalte stammen nur aus den Regionsdaten; befristete Hinweise wie Fördercalls und die internen „unsicher“-Notizen sind ausgeblendet. Auf `/de` und `/ch` erscheint ein eigener Länderhinweis.

**3. Ratsvorlage als Dokument:**
- **Inhalt:** druckfertige Beschlussvorlage mit demselben Druck-CSS wie der Bericht-Baustein. Sie enthält Kopffelder für die Verwaltung, Beschlussvorschlag, Sachverhalt, finanzielle Auswirkungen mit Tabelle, Landesrecht, Verfahren, Annahmenbuch mit Quellen sowie Grenzen und Haftung.
- **Kennzeichnung:** „Muster ohne Rechtsberatung“ steht oben im Dokument und im Haftungsteil. Die Vorlage selbst ist deutsch, auch auf den englischen Seiten.

**4. Lead:**
- **Ablauf:** Name und E-Mail sind Pflicht, Telefon freiwillig, die Gemeinde ist Teil der Eingaben. Danach Double-Opt-in, dann entsteht ein Vorgang vom Typ „kommune“. Gemeinde und Bundesland stehen dort so, dass Routing je Land und Gebiet sie lesen können.
- **Gemeindename:** wird auf dem Server geprüft.
- **Neuberechnung:** Der Server rechnet die Vorlage selbst neu.

**Neue Dateien:**
- `src/lib/fakten/daten/kommune-laender.js` (17 Fakten, alle Klasse A, „zu prüfen“)
- `src/lib/rechner/kommunePflichten.js`
- `src/lib/kommune/widmung.js`
- `src/lib/bericht/ratsvorlage.js`
- `src/components/Kommune/Ratsvorlage/RatsvorlageWerkzeug.js`
- `src/components/Kommune/Widmungskit/Widmungskit.js`
- `src/components/Bericht/RatsvorlageSeite.js`
- die beiden Seiten mit je 3 Routendateien (Länder, `/en`, `/en/<land>`)
- Tests: `kommunePflichten.test.mjs`, `ratsvorlage.test.mjs`, `ratsvorlage-dienst.test.mjs`

**Gemeinsame Dateien, nur eigene Einträge ergänzt:**
- Register: `src/lib/fakten/index.js`, `src/lib/land/seiten.js` (beide Seiten noindex, nicht in der Sitemap), `src/lib/sprache/seiten.js` (englisch, noindex), `tools.js` (TOOLS und TOOLS_EN)
- Bericht-Baustein: `neuRechnen.js` (Positivliste), `annahmenbuch.js`, `dienst.js` (Gemeinde und Bundesland in die Vorgangsdaten), `zaehler.js`, `/bericht/[token]/page.js`
- `BerichtAnfordern.js`: optional eigene Texte und Sperre, solange der Gemeindename fehlt
- `neuRechnen.test.mjs`: Positivliste um `ratsvorlage` erweitert
- Verweis auf die Ratsvorlage in `/rechner/kommune`

Keine neuen npm-Abhängigkeiten.

## Geprüft

- **Tests:** 12 neue Tests grün, einschließlich des kompletten Ablaufs Anfordern → Bestätigen → Vorgang im Demo-Backend für DE und AT. Der Test bestätigt außerdem, dass die neue Rechnung dieselben Summen liefert wie der Kommunal-Rechner.
- **Weitere Prüfungen:** `landfassungen --pruefen` grün, `fakten-check` GRÜN, eslint ohne Funde. Der Claim-Lint fand noch „Musterstadt“ als Beispielname (entfernt); übrig bleibt das „TODO“ in der Prüferangabe „TODO-E6“, das alle Faktendateien so tragen.
- **Screenshots:** 14 Seitenaufrufe bei 1440 und 390 Pixel, alle mit Status 200, ohne Überlauf und ohne Konsolenfehler. Das Werkzeug habe ich für DE, AT und das Widmungskit angesehen; das Design entspricht den bestehenden Rechnerseiten.
- **Im Browser durchgespielt:** Lead-Ablauf für DE und AT, die Vorgänge kamen mit Gemeinde und Bundesland (Bayern bzw. Oberösterreich) an. Die DE-Vorlage habe ich als Bild geprüft; als PDF wurde sie erzeugt, aber nicht angesehen (es fehlt ein Programm zum Anzeigen). Für AT gibt es keine verwertbare Druckprobe.

## Offen

1. **Landeswerte prüfen:** Die Werte der 7 Beteiligungsgesetze stammen aus den Regionsdateien (Stand 09/2026) und sind nicht am Gesetzestext nachgeprüft (Team Deutschland, zweite Prüfperson E6). Den geltenden Wert für Sachsen muss jemand erheben.
2. **Freigabe für Google:** Beide Seiten bleiben gesperrt, bis die Fachprüfung (E6) durch ist.
3. **Rechtsabteilung:** Muster-Beschlussvorschlag und Sachverhaltstexte für DE und AT prüfen.
4. **Frappe-Backend:** Die Rechnerliste in `Backend-Import/.../api/bericht.py` enthält `ratsvorlage` nicht (dort fehlen auch `gewerbestrom` und `flaechenpass`). Im Demo-Modus funktioniert alles, im echten Backend erst nach Nachtrag.
5. **Schweiz:** Ratsvorlage und Checkliste für die Schweiz sind nicht gebaut, dort steht nur der Länderhinweis.
6. **Navigation:** Die neuen Seiten stehen nicht in `src/data/navigation.js`, sondern nur in der Werkzeugübersicht und als Querverweise. Ob sie ins Menü sollen, entscheidest du.

## Welle 3 · B10 Bau · Neutrale Projektbörse

B10 ist fertig: Die Projektbörse hat jetzt eine Seite „Neutralität & Regeln“, einen Ablauf für Fremdentwickler mit NDA-Schritt und Anfrageformular, einen Muster-NDA-Entwurf, Badges mit festen Kriterien und eine Einladung statt leerer Liste, wenn keine Projekte veröffentlicht sind. `npm test` hat 806 von 808 Tests bestanden. Die zwei roten Tests stammen aus Paketen anderer Agenten, nicht aus B10 (Details unten).

**Neue Seiten** (beide noindex, nicht in der Sitemap, unter /de, /at, /ch, /en und /en/<land> erreichbar, mit englischen Texten):
- **`/projektboerse/neutralitaet`** (Neutralität & Regeln):
  - Offenlegung, dass die ÖKOVOLT Gruppe selbst entwickelt, und sieben Konfliktregeln: Kennzeichnung, Informationsbarriere, kein Vorkaufsrecht, gleiche Informationen und Fristen, keine Ansprache am Projekt vorbei, gleiche Konditionen, Protokoll.
  - Erklärung der Badges, ein Abschnitt „ehrlicher Bestand“ und die rechtliche Einordnung je Land: kein BörsG (DE), kein BörseG 2018 (AT), kein FinfraG (CH). Jede Länderfassung zeigt nur ihr Land, die gemeinsame Seite alle drei beschriftet.
  - Im Hero eine Schema-Grafik der Informationsbarriere.
- **`/projektboerse/muster-nda`**: Entwurf einer Vertraulichkeitsvereinbarung zwischen Anbieter und ÖkoInvest mit Informationsbarriere, im bestehenden Rechtstext-Layout. Gekennzeichnet als „Entwurf – anwaltlich zu prüfen“, offene Punkte als Platzhalter. Recht, Gerichtsstand und Datenschutz je Land getrennt; auf /ch ohne „ß“.

**Erweiterte Seiten und Bausteine:**
- **`/projektboerse`**:
  - Neue Karte „Neutral – auch gegenüber der eigenen Gruppe“.
  - Zwei neue FAQ-Einträge: Neutralität und „Börse im rechtlichen Sinn?“ (je Land).
  - Ohne Demo-Modus und ohne veröffentlichte Projekte erscheint eine Einladung zum Inserieren und zum Suchprofil statt einer leeren Liste. Die Testdaten-Regeln aus Welle 1 bleiben.
- **`/projektboerse/anbieten`**:
  - Neuer Abschnitt `#fremdentwickler` mit vier Schritten (Eckdaten → NDA mit ÖkoInvest → Prüfung durch das Backoffice → anonymes Inserat).
  - Das Formular schickt Anfragen als Typ „projekt“ an die bestehende Lead-Kette, also mit Einwilligungsprotokoll und Routing je Land. Telefon ist nur bei Rückrufwunsch Pflicht; ein Hinweis bittet, Lage und Unterlagen erst nach der NDA zu schicken.
  - Die FAQ „Tritt ÖkoInvest selbst als Käufer auf?“ nennt jetzt die Regeln.
- **Badges** „Gruppenprojekt“, „Fremdinserat“, „Gruppe interessiert“ und „Unterlagen vorgeprüft“ auf Projektkarte und Exposé. Sie erscheinen nur, wenn das Backend die Angabe ausdrücklich liefert; „Gruppenprojekt“ ersetzt im Exposé die bisherige Marke „Eigenprojekt“. Die öffentliche Projektansicht in `src/lib/plattform/oeffentlich.js` gibt dafür drei Ja/Nein-Felder weiter, keine Anbieterdaten.
- Beide Seiten sind in beiden Registern eingetragen (`src/lib/land/seiten.js` und `src/lib/sprache/seiten.js`), die Routen per `node scripts/landfassungen.mjs` erzeugt.

**Neue Dateien** (alle unter `c:\Users\SALEADMIN\Downloads\Oekoinvest-Web\`):
- `src\lib\boerse\neutralitaet.js` und `neutralitaet.test.mjs` (8 Tests)
- `src\components\Boerse\Badges.js`
- `src\components\Boerse\Seite\NeutralitaetBuehne.js`
- `src\components\Boerse\Seite\LeererBestand.js`
- `src\app\(stamm)\projektboerse\neutralitaet\page.js`
- `src\app\(stamm)\projektboerse\muster-nda\page.js`
- die erzeugten Routen unter `(laender)` und `(en)`

Keine neuen Abhängigkeiten, keine Commits.

**Prüfung:**
- `npm test`: 806 von 808 bestanden. Die beiden Fehler kommen aus fremden Paketen:
  - `sprache.test.mjs` zählt eine englische Seite außerhalb des Registers. Das ist der neue Auffang-Ordner `en/[land]/[...unbekannt]` (Fehlerseiten, W3-0).
  - `bericht/neuRechnen.test.mjs` schlägt bei „Positivliste“ fehl. Das hängt vermutlich mit der Ratsvorlage aus B8 zusammen.
- `npm run test:charakterisierung`: 195 von 195 bestanden. An Rechenlogik habe ich nichts geändert.
- `npx eslint` auf alle geänderten Dateien ist sauber.
- Screenshots bei 1440 und 390 (ganze Seite) von:
  - `/projektboerse/neutralitaet`, `/ch/…` und `/en/at/…`
  - `/projektboerse/muster-nda`, `/at/…` und `/en/…`
  - `/ch/projektboerse`
  - `/en/at/projektboerse/anbieten`
  
  Ergebnis: keine Überläufe, keine Konsolenfehler, gleiche Optik wie die bestehenden Börsenseiten. Die Einladung bei leerem Bestand habe ich durch kurzes Erzwingen geprüft und danach zurückgesetzt.

**Inhaberpunkte:**
1. **Die Badges erscheinen noch nirgends.** Weder das Demo-Backend noch Frappe liefern die Felder `eigenprojekt`, `gruppeBeteiligt` und `unterlagenVorgeprueft`. Vor echten Inseraten muss die Anbieter-Angabe im Backoffice Pflicht werden, sonst stimmt die Regel „Jedes Inserat gekennzeichnet“ nicht.
2. **Die Informationsbarriere muss organisatorisch umgesetzt sein, bevor die Seite indexiert wird.** Technisch sehen heute Admins alles. Wer zur Projektentwicklung oder Flächenakquise der Gruppe gehört, darf keine Admin-Rechte in der Börse haben. Außerdem müssen Gruppenbeteiligungen gemeldet und Anbieter informiert werden.
3. **Rechtsabteilung je Land:** die BörsG/BörseG-2018/FinfraG-Einordnung (Stand: Entwurf 9. Oktober 2026), die Platzhalter im Muster-NDA (Gerichtsstand, Laufzeit, Vertragsstrafe) und die Frage, ob das Merkmal „Gruppe interessiert“ öffentlich gezeigt werden darf.
4. **Freigabe zur Indexierung** durch die zweite Prüfperson (E6), danach `index: false` in beiden Registern entfernen.
5. **Gemeinsam genutzte Dateien geändert:**
   - `src/components/Boerse/ProjektKarte.js` (Badge-Zeile)
   - `src/app/(stamm)/projektboerse/[slug]/page.js` (Exposé)
   - `src/lib/plattform/oeffentlich.js` (drei neue Felder)
   
   `BoerseListe.js`, an dem ein anderer Agent arbeitet, habe ich nicht angefasst. Die Navigation ist unverändert; die neuen Seiten sind von `/projektboerse` und `/anbieten` verlinkt.

Ungeprüfte Zahlen gibt es nicht: Die neuen Seiten enthalten keine Werte. Die Provisionsspanne kommt wie bisher aus `src/lib/invest/markt.js`.

## Welle 3 · B10 Prüfung

**Prüfbericht B10 (Neutrale Projektbörse): bestanden, ein Fehler behoben, einige Punkte offen**

**Bestanden**
- **Seiten laden:** Alle geprüften Adressen liefern Status 200. Geprüft habe ich `/projektboerse/neutralitaet` (gemeinsam, /de, /at, /ch, /en, /en/at), `/projektboerse/muster-nda` (gemeinsam, /ch, /en/ch), `/projektboerse`, `/at/projektboerse`, `/projektboerse/anbieten`, `/en/at/projektboerse/anbieten` und ein Exposé (gemeinsam und /en/at).
- **Routen und Register:** Die erzeugten Routen unter `(laender)` und `(en)` sind vorhanden. Beide Register enthalten die zwei neuen Seiten mit `index: false`, sie stehen also nicht in der Sitemap. Die Metadaten der Seiten haben ebenfalls noindex.
- **Länder getrennt:** /at zeigt nur den AT-Abschnitt (BörseG 2018), /ch nur CH (FinfraG). Die gemeinsame Seite zeigt DE, AT und CH, jeweils beschriftet. /en/at enthält kein FinfraG. Im Muster-NDA steht der Länderteil (§ 9) je Land; /ch zeigt nur das schweizerische Recht.
- **Schweizer Schreibweise:** Im Inhalt der CH-Fassungen beider neuen Seiten steht kein „ß“. Ein „ß“ gibt es nur in globalen Bereichen anderer Pakete, siehe offene Punkte.
- **Englisch:** Im Hauptinhalt von /en/at/neutralitaet, /en/ch/muster-nda, /en/at/anbieten und /en/projektboerse sind keine deutschen Reste. Das englische Muster-NDA steht im bestehenden Rechtstext-Layout, das den Hinweis „deutsche Fassung maßgeblich“ zeigt.
- **Lead-Kette:** Das Formular für Fremdentwickler nutzt die vorhandenen Bausteine `AnfrageMitDaten` und `AnfrageFormular` mit Typ „projekt“. Das Land kommt aus der Route. Telefon ist nur Pflicht, wenn ein Rückruf gewünscht wird.
- **Aussagen geprüft:** Die neuen Seiten enthalten keine Zahlen, keine Fremdmarken und keine Umweltclaims. Die Aussagen „für Investoren kostenfrei“, „Aufrufe, Merker und NDA-Anfragen im Portal“ und die Sortierungen „Neueste zuerst“ und „Größte zuerst“ decken sich mit bestehendem Code und bestehenden Texten.
- **Tests:**
  - `node --test neutralitaet.test.mjs`: 8 von 8 bestanden.
  - `npm run test:charakterisierung`: 195 von 195 bestanden.
  - `npm test`: 821 von 822 bestanden. Der eine Fehler ist der Zähler in `sprache.test.mjs` (149 statt 148 englische Seiten). Er kommt von der Auffangroute `en/[land]/[...unbekannt]` aus W3-0, nicht von B10; die Prüfungen für die B10-Routen in diesem Test laufen durch. Der von B10 gemeldete Fehler in `bericht/neuRechnen` tritt nicht mehr auf.
  - `npx eslint` auf alle geänderten B10-Dateien und zwei erzeugte Routen ist sauber.
- **Design:** Screenshots bei 1440 und 390 von /at/neutralitaet, /en/muster-nda, /projektboerse/anbieten und /en/ch/projektboerse: Breite stimmt, keine Konsolenfehler. Die Bilder zeigen nur den sichtbaren Bildschirmbereich, keine ganze Seite. Darauf entspricht der Hero mit dem Schema der Informationsbarriere der bestehenden Börsenoptik. Die Bilder liegen im Scratchpad unter `scratchpad\b10p\`.

**Behoben**
- **Exposé, Badge-Zeile:** Die Badges wurden mit `className="contents"` in eine Hülle gesetzt, die selbst `flex flex-wrap` hat. `cn()` führt Klassen nur zusammen und gleicht keine Widersprüche aus, deshalb kollidierten `flex` und `contents`. Welche Regel gewinnt, ist zufällig; die Badges konnten dadurch einen eigenen Block statt der Zeile bilden.
  - Lösung: neue Option `ohneHuelle` in `c:\Users\SALEADMIN\Downloads\Oekoinvest-Web\src\components\Boerse\Badges.js`. Das Exposé nutzt sie jetzt: `<BoerseBadges projekt={p} ohneHuelle />` in `c:\Users\SALEADMIN\Downloads\Oekoinvest-Web\src\app\(stamm)\projektboerse\[slug]\page.js`.
  - Geprüft: eslint ist sauber, das Exposé lädt gemeinsam und unter /en/at mit Status 200.

**Offen (Inhaberpunkte)**
1. **Aussagen auf indexierten Seiten:** `/projektboerse` und das FAQ auf `/anbieten` versprechen schon jetzt Kennzeichnung jedes Inserats, kein Vorkaufsrecht und die Informationsbarriere. Dort steht auch der Hinweis „keine Börse im Sinne von BörsG/BörseG 2018/FinfraG“. Die Badges erscheinen aber noch nirgends, weil das Backend die Felder nicht liefert. Im Demo-Modus stehen deshalb ungekennzeichnete, als Demo markierte Projekte neben dem Versprechen. Das entspricht der Vorgabe „Recht am Ende“, die Rechtsabteilung prüft gesamthaft. Vor den ersten echten Inseraten muss das Feld „Anbieter“ im Backoffice Pflicht sein.
2. Die vier Punkte des Bau-Agenten bleiben unverändert offen:
   - Pflichtfeld „Anbieter“ im Backoffice.
   - Organisatorische Informationsbarriere (keine Admin-Rechte in der Börse für Projektentwicklung und Flächenakquise der Gruppe).
   - Rechtsprüfung je Land: BörsG/BörseG 2018/FinfraG-Einordnung, Platzhalter im Muster-NDA, ob „Gruppe interessiert“ öffentlich gezeigt werden darf.
   - Freigabe zur Indexierung durch die zweite Prüfperson (E6).
3. **Gehört nicht zu B10:** Auf `/ch/projektboerse` stehen noch „ß“ in der Filterliste („Batteriegroßspeicher“, aus `BoerseListe`), in der Meta-Beschreibung und in den Demo-Texten. In allen CH-Seiten steht außerdem „ß“ im globalen JSON-LD.
4. **Kleinigkeit:** Die Texte `t.eigen` und `t.eigenTitel` im Exposé werden nicht mehr verwendet. Ich habe sie stehen lassen, weil sie keinen Schaden machen.

## Welle 3 · B8 Prüfung

# Prüfbericht Paket B8 (Kommunal 2.0 mit Ratsvorlage)

**Ergebnis: bestanden, nachdem ich drei Fehler behoben habe.** Die beiden roten Tests in `npm test` kommen aus anderen Paketen, nicht aus B8.

## Bestanden

**1. Funktion**
- **Seiten:** Alle Seitenaufrufe von `/kommunen/ratsvorlage` und `/kommunen/widmungskit` liefern Status 200. Geprüft habe ich die gemeinsame Seite sowie `/de`, `/at`, `/ch`, `/en` und `/en/at` bei 1440 und 390 Pixel. Es gab keine Konsolenfehler und keinen Überlauf.
- **Eigene Gegenrechnung, Beispiele bei 10,5 MWp:**
  - Niedersachsen: 10,08 GWh × 0,2 ct = 20.160 €
  - Saarland: 21.000 €
  - Sachsen-Anhalt: max(32.130 €, 26.250 €) = 32.130 €
  - Mecklenburg-Vorpommern: 10 volle MW × 1.000 € = 10.000 € für die Gemeinde, dazu 10.000 € für die Einwohner
  - Bayern bei 20 MWp: 22,0 GWh × 0,2 ct = 44.000 €
  - Sachsen: kein Betrag, wie vorgesehen
- **Schwellen:** Grenzfälle stimmen. Bayern bei genau 5 MW und Brandenburg bei genau 1 MW gelten nicht („mehr als“), Mecklenburg-Vorpommern unter 1 MW ebenfalls nicht.
- **Summen:** Die Summen der neuen Rechnung sind identisch mit `rechneKommune`. Die Rechenlogik der bestehenden Rechner ist unverändert, die Charakterisierungstests sind grün (195/195).
- **Landeswerte:** Alle 7 Landeswerte habe ich mit dem Wortlaut der Regionsdateien abgeglichen, sie stimmen überein. Alle stehen auf „zu prüfen“.
- **Lead-Kette selbst durchgespielt:** Anfordern → Demo-Postausgang → Bestätigen → Vorgang vom Typ „kommune“.
  - DE: Gemeinde „Musterhausen“, Bundesland Bayern
  - AT: Gemeinde „Musterhausen“, Bundesland Oberösterreich
  - Die AT-Vorlage habe ich als Bild geprüft.

**2. Recht und Claims**
- Die Vorlage ist als „Muster ohne Rechtsberatung“ gekennzeichnet, oben und im Haftungsteil.
- Für AT und CH stehen keine Geldwerte, die Schweiz bekommt nur den Länderhinweis. Auf AT- und CH-Seiten zeigen die Annahmen den LandHinweis statt deutscher Werte.
- Beide Seiten tragen in beiden Sprachregistern noindex und stehen nicht in der Sitemap.
- Die Angaben zu Art. 24ter RPG und § 33 EAG sind durch geprüfte Stammdaten im Repo belegt.
- Keine Umweltclaims, kein Social Proof.

**3. Design:** Die Seiten bestehen aus `RechnerSeite` und den bestehenden Bausteinen, die Optik ist identisch mit den bisherigen Rechnerseiten.

**4. Englisch:** Navigation, Hero, Werkzeug, FAQ und Erklärung sind englisch. Die Vorlage selbst bleibt deutsch und ist auf der Seite so gekennzeichnet.

**5. Prüfläufe**
- `npx eslint` auf alle geänderten B8-Dateien: ohne Funde.
- B8- und Bericht-Tests: 34/34 grün, dazu mein neuer Regressionstest: 5/5 grün.

## Behoben

1. **Deutsche Quellen in der AT-Ratsvorlage (Länder vermischt):** Unter „Quellen der Rechenlogik (Auswahl)“ standen im AT-Dokument Bundesnetzagentur, BDEW, EEG 2023 und BauGB § 35.
   - Fix in `src/lib/bericht/annahmenbuch.js`: Für `ratsvorlage` mit Land AT ist `quellenRechenlogik` jetzt leer.
   - Regressionstest in `src/lib/bericht/ratsvorlage.test.mjs` ergänzt.
2. **Deutsches Recht im Kopf der AT- und CH-Seiten:** Einleitung, Chips und Ergebniskarte nannten auf `/at` und `/ch` „§ 6 EEG, Gewerbesteuer“ und „16 Bundesländer“.
   - Fix in `src/app/(stamm)/kommunen/ratsvorlage/page.js`: eigene Kopftexte je Land (`KOPF_LAND`) für AT und CH, jeweils deutsch und englisch.
   - Der Querverweis auf den Kommunal-Rechner, den es nur für DE gibt, entfällt dort.
   - Per Screenshot bei 1440 und 390 Pixel nachgeprüft.
3. **Codeordnung in `src/lib/bericht/dienst.js`:** Die Hilfsfunktion `ratsvorlageVorgang` stand zwischen den Import-Anweisungen. Ich habe sie unter die Imports verschoben, das Verhalten ist unverändert.

## Offen

1. **`npm test` hat 2 rote Tests, beide nicht durch B8** (insgesamt 820 von 822 grün):
   - `sprache.test.mjs` zählt 143 statt 142 englische Seiten. Ursache ist `src/app/(en)/en/[land]/[...unbekannt]/page.js` aus Paket W3-0.
   - `routen.test.mjs` meldet „/newsletter: öffentliche Seite ohne Registereintrag“. Das kommt aus einem anderen Paket, das noch in Arbeit ist.
   - Beides muss der Qualitätsmanager klären.
2. **Inhaberpunkte, wie vom Bau-Agenten gemeldet:**
   - Die Landeswerte sind am Gesetzestext nicht nachgeprüft (E6). Der geltende Wert für Sachsen muss erhoben werden.
   - Die Rechtsabteilung muss den Muster-Beschlussvorschlag für DE und AT prüfen.
   - Im Frappe-Backend (`api/bericht.py`) fehlt `ratsvorlage`, ebenso `gewerbestrom` und `flaechenpass`.
   - Für die Schweiz gibt es keine Vorlage.
   - Ob die Seiten ins Menü (`navigation.js`) kommen, entscheidet der Inhaber.
3. **Kleinigkeit:** Der Link „Werkzeug erneut öffnen“ in der Vorlage zeigt immer auf die gemeinsame Seite, auch bei einer AT-Vorlage. Das ist bei allen bestehenden Berichten so und nicht B8-spezifisch.
4. **Nicht geändert:** Titel und Beschreibung für Suchmaschinen nennen auch auf `/at` „§ 6 EEG“. Das wirkt sich wegen noindex derzeit nicht aus.

## Geänderte Dateien (Prüfer)
- `c:\Users\SALEADMIN\Downloads\Oekoinvest-Web\src\app\(stamm)\kommunen\ratsvorlage\page.js`
- `c:\Users\SALEADMIN\Downloads\Oekoinvest-Web\src\lib\bericht\annahmenbuch.js`
- `c:\Users\SALEADMIN\Downloads\Oekoinvest-Web\src\lib\bericht\dienst.js`
- `c:\Users\SALEADMIN\Downloads\Oekoinvest-Web\src\lib\bericht\ratsvorlage.test.mjs`
- Prüfskript außerhalb des Repos: `C:\Users\SALEADMIN\claude-browser\b8-pruefer.mjs`
- Screenshots und PDFs: `C:\Users\SALEADMIN\AppData\Local\Temp\b8pruefer\`

## Welle 3 · NL Bau · Newsletter je Land und Newsroom

Paket NL ist fertig: Newsletter je Land (mit Double-Opt-in), Newsroom und die vorbereitete Bestätigung für Search Console und Bing. Ein einziger Test in `npm test` schlägt fehl: Von 831 Tests ist 830 grün. Der Fehler liegt in einer Datei, die nicht aus meinem Paket stammt.

**Gebaut**
- **Newsletter je Land**
  - Anmeldung mit Bestätigung per E-Mail. Im Demo-Modus landen die Mails nur im Demo-Postausgang, es wird nichts versendet. Jede Anmeldung, Bestätigung und Abmeldung wird im bestehenden Einwilligungsprotokoll eingetragen. Dort steht ein Prüfwert (Hash) des gezeigten Wortlauts, inklusive Land und Themen.
  - Vier Themen zur Wahl, keines vorausgewählt; mindestens eines ist nötig. Abgefragt wird nur die E-Mail-Adresse.
  - Das Land kommt aus der Seite (/de, /at, /ch, /en/…). Auf der gemeinsamen Seite wählt man es selbst; eine gespeicherte Länderwahl ist vorgeschlagen.
  - Abmelden geht mit einem Klick über die Verwaltungsseite. Dazu gibt es die Ein-Klick-Abmeldung direkt aus dem Mailprogramm (Standard RFC 8058). Bei der Abmeldung wird die Adresse gelöscht.
  - In der echten Produktion und ohne Demo-Backend werden keine Adressen angenommen. Der Baustein zeigt dann nur „Der Newsletter startet mit dem Livegang.“
  - Dateien: Logik in `src/lib/newsletter/` (Themen, Texte, Versandsperre, Zustände, Ablauf), Demo-Backend in `src/lib/plattform/backend/demo/newsletter.js`, Schnittstellen unter `src/app/api/newsletter/` (Anmelden, Bestätigen, Abmelden).
- **Baustein** in `src/components/Newsletter/` (Deutsch und Englisch):
  - eingebaut als Abschnitt auf /marktdaten und /ratgeber und als kompakte Zeile im Footer;
  - alle drei erscheinen nur, solange der Newsletter Anmeldungen annimmt.
- **Seiten**
  - /newsletter mit englischer Fassung, auf noindex.
  - /newsroom mit englischer Fassung, auf noindex und nicht in Navigation und Sitemap. Es gibt eine leere Meldungsliste, Pressekontakt, ein Kurzprofil aus `site.js` und ein Medienpaket. Das Logo ist dort nur als Vorschau zu sehen, es gibt keine Downloads. Die Fotos sind nicht freigegeben und erscheinen deshalb nicht.
  - /newsroom/[slug] zeigt nur freigegebene Meldungen. Angelegt ist nur eine leere Vorlage, die als Entwurf nirgends erscheint; es gibt keine erfundenen Meldungen.
  - Seite zum Bestätigen und Verwalten des Abos unter /newsletter/abo/[token]: noindex und ohne Länderfassung.
- **Register:** Einträge in `src/lib/land/seiten.js` (alle noindex) und `src/lib/sprache/seiten.js`. Die Länder- und Sprachfassungen sind mit dem bestehenden Skript erzeugt.
- **Gemeinsame Dateien**, jeweils nur mein Eintrag: `src/data/site.js` (neuer Pressekontakt `PRESSE`), `src/lib/land/zonen.js`, `src/components/Reusable/footer.js` sowie die Seiten zu /marktdaten und /ratgeber.
- **Search Console und Bing:** Die Meta-Tags waren schon vorbereitet. Neu ist eine Prüfung, die nur gültige Codes übernimmt (`src/lib/verifizierung.js`, eingebunden in `Wurzel.js`). In `.env.example` ist der Ablauf beschrieben. Nichts wurde extern angemeldet.
- Keine neuen npm-Abhängigkeiten.

**Geprüft**
- **Neue Tests:** 22, alle grün (Newsletter-Ablauf, Newsroom, Prüfung der Bestätigungscodes).
- **`npm test`:** Der eine fehlschlagende Test ist „englische Routen“. Ursache ist die Datei `src/app/(en)/en/[land]/[...unbekannt]/page.js`, angelegt um 13:58, vermutlich von Paket W3-0 (404-Seiten). Sie steht nicht im Register; das muss W3-0 oder die Qualitätskontrolle im Test als Ausnahme eintragen.
- `npm run test:charakterisierung` ist grün; die Rechenlogik habe ich nicht verändert. eslint ist sauber, die Prüfung der Länderfassungen ebenfalls.
- **Screenshots** bei 1440 und 390 Pixeln: /newsletter, /at/newsletter, /en/ch/newsletter, /newsroom, /ch/newsroom, /at/newsroom, /en/newsroom, die Abschnitte auf /ch/marktdaten und /en/ratgeber sowie der Footer.
- **Ablauf im Browser durchgespielt** (Deutsch bei 390 Pixeln, Englisch/Schweiz bei 1440 Pixeln): Formularfehler, ausgefüllt, „Bitte bestätigen“, Bestätigung, Abo aktiv, abgemeldet. Keine Konsolenfehler.
- Ein Überlauf bei 390 Pixeln im Medienpaket ist behoben. Alle Seiten tragen noindex und stehen nicht in der Sitemap.

**Offen für den Inhaber**
1. Die Einwilligungs- und Hinweistexte (`src/lib/newsletter/texte.js`) sind Entwürfe für die Rechtsabteilung. Dazu kommen die Fristen (48 Stunden für die Bestätigung) und ein Abschnitt „Newsletter“ in der Datenschutzerklärung.
2. Für den echten Betrieb fehlen ein Versanddienst mit Auftragsverarbeitungsvertrag, Absender und Versanddomain sowie das Gegenstück im Frappe-Backend. Bis dahin ist der Newsletter außerhalb des Demo-Modus aus.
3. Pressekontakt: Ansprechperson oder Pressepostfach festlegen. Bis dahin stehen dort office@ und die Hauptnummer.
4. Medienpaket: Freigabe der Logodatei und Lizenznachweise für die Fotos.
5. Freigabe des Newsrooms (Indexierung, Navigation), danach echte Meldungen mit Freigabe durch die Geschäftsführung.
6. Domain kaufen, danach die Bestätigungscodes für Search Console und Bing setzen.
7. Das Newsletter-Häkchen in den bestehenden Anfrageformularen speichert weiter nur den Wunsch. Es soll später an diesen Bestätigungsablauf angeschlossen werden (nicht Teil dieses Pakets).
8. Ein Abo gilt für genau ein Land. Eine neue, bestätigte Anmeldung ersetzt das alte Abo, und eine Abmeldung beendet alle Newsletter an diese Adresse.

Ungeprüfte Zahlen enthält das Paket keine.

## Welle 3 · NL Prüfung

**Prüfbericht zu Paket NL (Newsletter je Land, Newsroom): bestanden, 2 Fehler behoben, 1 Testfehler bleibt offen (stammt nicht aus NL)**

**Bestanden**
- **Seiten laden:** /newsletter und /newsroom liefern 200 unter /, /de, /at, /ch, /en und /en/at. Die Vorlage /newsroom/vorlage-fachbeitrag liefert wie gewollt 404. /newsletter/abo/[token] gibt es nur ohne Länderfassung (/at/… liefert 404, so eingetragen in OHNE_LAND).
- **noindex und Sitemap:** /newsletter, /at/newsletter, /en/ch/newsletter, /newsroom, /en/newsroom und die Abo-Seite tragen alle noindex. In sitemap.xml steht keiner dieser Pfade.
- **Lead-Kette:** Anmeldung, Bestätigung und Abmeldung werden im Einwilligungsprotokoll eingetragen. Der Prüfwert des Einwilligungstexts wird auf dem Server aus Land, Themen und Sprache neu berechnet und stimmt mit dem angezeigten Wortlaut überein. Ein Aufruf per GET bestätigt nie etwas. Die Ein-Klick-Abmeldung nach RFC 8058 habe ich direkt geprüft: Ein unbekanntes Token liefert 404, ein GET leitet mit 303 weiter. Keine Themen sind vorausgewählt, die Antwort verrät nicht, ob eine Adresse schon angemeldet ist, und außerhalb von Demo-Backend bzw. Produktion werden keine Adressen angenommen.
- **Recht und Claims:** keine Zahlen außer Stammdaten aus site.js (Gründungsjahr, Firmenbuch), keine erfundenen Meldungen, keine Fremdmarken, keine Umweltclaims. Die Texte sind als „Entwurf · Prüfung Rechtsabteilung“ gekennzeichnet.
- **Englisch:** Beide Seiten stehen korrekt im Sprachregister. Auf /en/newsroom sind im Hauptinhalt nur Eigennamen deutsch (Firmenname, Adresse, „Landesgericht Ried im Innkreis“).
- **Design:** Screenshots bei 1440 und 390 Pixeln von /newsletter, /en/at/newsletter, /ch/newsroom, /en/newsroom und /newsletter/abo/xyz angesehen. Gleiche Optik wie die bestehenden Seiten, keine Überläufe, keine Konsolenfehler.
- **Prüfläufe:** eslint auf alle Dateien des Pakets sauber, `npm run test:charakterisierung` 195/195 grün. `npm test` 830/831 grün; der eine Fehler steht unten unter Offen.

**Behoben**
1. **Abmeldelink aus einer älteren Mail lief ins Leere** (`src/lib/plattform/backend/demo/newsletter.js`).
   - Nach einer neuen, bestätigten Anmeldung wurde das alte Abo zu „ersetzt“ und verlor dabei die Zuordnung zur Adresse. Ein Klick auf die Ein-Klick-Abmeldung in der alten Willkommens-Mail meldete deshalb Erfolg, das aktuelle Abo lief aber weiter. Rechtlich ist das ein Risiko, weil die Abmeldung jederzeit wirken muss.
   - Jetzt behält ein ersetztes Abo diese Zuordnung (nur den Prüfwert der Adresse, keine Personendaten). Der alte Link beendet alle Abos dieser Adresse, trägt den Widerruf mit dem Land des aktuellen Abos ein und löscht die Adresse.
2. **Hinweisseiten nach Abmeldung, Ablauf oder Ersetzung waren immer deutsch** (`src/app/(stamm)/newsletter/abo/[token]/page.js`).
   - Die gespeicherten Reste eines beendeten Abos behalten jetzt die Sprache „en“. Die Seite zeigt diese Zustände dann auf Englisch und verlinkt auf /en/newsletter.
   - Bei einem ersetzten Abo zeigt die Seite jetzt selbst einen Knopf zum Abmelden.
3. **Neuer Test** in `src/lib/newsletter/dienst.test.mjs`: Er spielt die Abmeldung über den Link aus der alten Mail und die englischen Hinweisseiten durch. Alle 15 Newsletter-Tests sind grün.

**Offen**
- **`npm test`, Test „englische Routen“ (149 statt 148 Seiten):** Ursache ist `src/app/(en)/en/[land]/[...unbekannt]/page.js` vom 9.10. um 13:58, sehr wahrscheinlich aus Paket W3-0 (Fehlerseiten). Ich habe bestätigt, dass die Datei nicht aus NL stammt. W3-0 oder die Qualitätskontrolle muss sie im Test als Ausnahme eintragen.
- **Klein, nicht behoben:** Die Fehlermeldungen der Schnittstelle zum Bestätigen und Abmelden (404, 409, 410) sind nur deutsch. Das stört kaum, weil die Seite nach dem Neuladen den Zustand in der richtigen Sprache zeigt.
- **Inhaberpunkte** wie vom Bau-Agenten gemeldet:
  1. Einwilligungs- und Hinweistexte, die Frist von 48 Stunden und ein Abschnitt in der Datenschutzerklärung gehen an die Rechtsabteilung.
  2. Für den echten Betrieb fehlen Versanddienst mit Auftragsverarbeitungsvertrag, Absender und Versanddomain sowie das Gegenstück im Frappe-Backend.
  3. Pressekontakt festlegen; bis dahin stehen dort office@ und die Hauptnummer.
  4. Logodatei und Lizenznachweise der Fotos für das Medienpaket freigeben.
  5. Newsroom freigeben (Indexierung, Navigation).
  6. Nach dem Domainkauf die Bestätigungscodes für Search Console und Bing setzen.
  7. Das Newsletter-Häkchen in den bestehenden Anfrageformularen an diesen Bestätigungsablauf anschließen.

Screenshots liegen in: C:/Users/SALEAD~1/AppData/Local/Temp/claude/c--Users-SALEADMIN-Downloads-Oekoinvest-Web/3140c08a-2721-4ee9-a47f-9fce6660cd23/scratchpad/nl/

