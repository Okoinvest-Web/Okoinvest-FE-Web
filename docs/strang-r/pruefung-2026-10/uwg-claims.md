# Anwaltsdossier – Paket UWG-Claims (Lauterkeitsrecht und Werbeaussagen)

Gesamtprüfung der fertigen Website (Wellen 0–4), Prüfung vom 11.10.2026.
Prüfer: interne Rechtsabteilung, Paket UWG-Claims. Keine Rechtsberatung nach außen;
alle strittigen oder gestaltenden Punkte sind hier zur Entscheidung durch die externen
Kanzleien (Strang R) gesammelt.

Geprüft wurden gerenderte Seiten im Browser (Playwright, Dev-Server Port 3100) und der
Quelltext unter `src/`. Reizwort-Suchlauf: siehe Abschnitt „Suchlauf“ am Ende.

**Punktzahl je Risikostufe: hoch 2 · mittel 4 · niedrig 5 · 1 Verweis an anderes Paket.**

---

## Risiko HOCH

### H1 – „Drei Länder“-Aussagen bei gestuftem Schweiz-Start
- **Fundstellen:** Startseite (`src/app/(stamm)/page.js:457`, Kennzahl „3 / Länder / Deutschland, Österreich, Schweiz“); `src/components/Gemeinschaft/Seite/Hero.js:71` („In allen drei Ländern … wir … versorgen Gemeinschaften mit Strom aus unseren Parks“); `src/components/Gemeinschaft/Seite/Vergleich.js:38`; `src/data/faq.js:128`; Ratgeber `buergerenergie-solarpark-akzeptanz.js:284`, `energy-sharing-energiegemeinschaften.js:303/354`, `ppa-fuer-unternehmen.js:219` (Claim-Lint-Regel `drei-laender`, 7 Treffer).
- **Problem:** Laut Masterplan startet das CH-Geschäft gestuft; die Gesellschaften der Gruppe bestehen in DE und AT (Startseite selbst: „DE · AT – Gesellschaften in Deutschland und Österreich“). Viele Stellen beschreiben nur die Rechtslage in drei Ländern (unkritisch), aber die Kennzahl „3 Länder“ und der Gemeinschafts-Hero können als Aussage über eigene Geschäftstätigkeit in der Schweiz verstanden werden.
- **Risiko:** hoch (Irreführung über den Umfang der Geschäftstätigkeit, § 5 UWG DE / § 2 UWG AT / Art. 3 Abs. 1 lit. b UWG CH).
- **Vorschlag:** Entweder CH-Tätigkeit belegen (Projekt, Mandat, Kooperationsvertrag) und intern dokumentieren, oder Kennzahl umformulieren („DE und AT aktiv, Schweiz im Aufbau“) und den Gemeinschafts-Hero auf DE/AT-Parks eingrenzen. Die reinen Rechtslagen-Stellen („die Regeln in allen drei Ländern“) können bleiben und sollten in die Lint-Allowlist.
- **Rechtsgebiet / Land:** Lauterkeitsrecht; DE, AT, CH.

### H2 – Pachtangebot-Check ohne Offenlegung des Eigeninteresses
- **Fundstelle:** `/rechner/pachtangebot-check` (`src/app/(stamm)/rechner/pachtangebot-check/page.js`, `src/components/Rechner/PachtangebotCheck*`). Quellenzeile vorhanden („Marktspannen: eigene Einschätzung ÖkoInvest“), aber kein Hinweis, dass ÖkoInvest selbst Projektierer ist und Flächen pachtet.
- **Problem:** Das Werkzeug bewertet Pachtangebote von Wettbewerbern mit Ampeln und rät u. a. „nutzen Sie eine unabhängige Kanzlei, nicht die des Projektierers“. Dass der Anbieter des Checks selbst am Pachtmarkt als Nachfrager auftritt, wird auf der Seite nicht offengelegt (bereits als Masterplan-Punkt S0-16 benannt, noch offen).
- **Risiko:** hoch (Verschleierung des kommerziellen Zwecks / Interessenkonflikt, § 5a Abs. 4 UWG DE, § 2 UWG AT; Vergleichs- und Herabsetzungsnähe gegenüber Mitbewerbern).
- **Vorschlag:** Deutlicher Hinweiskasten auf der Seite und im Druck-/PDF-Ergebnis: „ÖkoInvest entwickelt selbst Solarparks und pachtet Flächen. Die Marktspannen sind unsere eigene Einschätzung.“ Wortlaut durch Kanzlei freigeben.
- **Rechtsgebiet / Land:** Lauterkeitsrecht; DE, AT, CH.

---

## Risiko MITTEL

### M1 – Reststrom-Pool: „Solarstrom aus Parks der ÖKOVOLT Gruppe … per Liefervertrag (PPA)“
- **Fundstelle:** `src/app/(stamm)/reststrom/page.js:59` (sichtbar auf `/reststrom` und im Rechner-Umfeld).
- **Problem:** Der Beleg für die Aussage, dass Parks der Gruppe den Pool per PPA beliefern (können), steht laut `uebergabe/UEBERGABE.md` Abschnitt 8 noch aus („Beleg für die Reststrom-Aussage“).
- **Risiko:** mittel (unwahre Tatsachenbehauptung über das eigene Angebot, falls kein liefernder Park existiert; § 5 UWG DE / § 2 UWG AT).
- **Vorschlag:** Beleg vom Inhaber einholen (welcher Park, welche Direktvermarktungs-/PPA-Struktur) und dokumentieren; sonst in „geplant“ umformulieren.
- **Rechtsgebiet / Land:** Lauterkeitsrecht; DE (Pool-Angebot DE), AT.

### M2 – Kennzahl „~50 MWp gehen pro Jahr neu in die Entwicklung“
- **Fundstellen:** Startseite und Referenzen (`src/data/site.js:92`, `KENNZAHLEN.entwicklungMwProJahr`; Kommentar: „Vorgabe der Geschäftsführung“).
- **Problem:** Zahl im werblichen Kontext ohne externe oder interne dokumentierte Grundlage; die Beweislast für Werbeaussagen liegt beim Unternehmen.
- **Risiko:** mittel.
- **Vorschlag:** Internes Substantiierungsblatt (Projektliste mit MWp je Jahrgang) anlegen und im Faktenregister referenzieren; sonst abschwächen („Ziel: rund 50 MWp…“).
- **Rechtsgebiet / Land:** Lauterkeitsrecht; DE, AT, CH.

### M3 – „16+ Jahre Erfahrung“ / „seit 2010“ / „seit 2012 eigene Parks“ – Zurechnung der Gruppenerfahrung
- **Fundstellen:** Startseite Kennzahlen (`src/app/(stamm)/page.js:456`), Footer („seit 2010 Solarkraftwerke planen, bauen und betreiben“), `/referenzen` (Registerangaben HRA 12450, HRA 12215, HRA 12240), `/warum-oekoinvest`.
- **Problem:** Die werbende ÖkoInvest GmbH (FN 541505g) ist deutlich jünger; die Erfahrung wird der ÖKOVOLT Gruppe zugeschrieben. Die Referenzen-Seite belegt die Parks mit Registernummern (gut), die Zulässigkeit der Zurechnung von Gruppen-/Gründererfahrung auf die werbende Gesellschaft sollte eine Kanzlei bestätigen (Irreführung über Alter/Erfahrung des Unternehmens).
- **Risiko:** mittel.
- **Vorschlag:** Formulierungen stets mit „der ÖKOVOLT Gruppe“ koppeln (weitgehend geschehen – prüfen, ob überall), Kanzlei-Freigabe einholen; Registerbelege zu den drei Parks als Nachweisordner sichern.
- **Rechtsgebiet / Land:** Lauterkeitsrecht; DE, AT.

### M4 – „vorgeprüft“ / „pre-checked“ ohne definierten Prüfumfang
- **Fundstellen:** `/projektboerse` Hero „vorgeprüft und vertraulich“ (`src/app/(stamm)/projektboerse/page.js:117/166`); `/investoren` („mit vorgeprüften Unterlagen“, `page.js:182/224`); Startseiten-Zielgruppen (`src/components/Home/zielgruppen.js:44/50/127/133`).
- **Problem:** Die Börsen-Beschreibung ordnet den Begriff korrekt ein („auf Plausibilität vorgeprüfte Projekte“, FAQ „Wie werden Projekte geprüft?“, Hinweis „keine Due Diligence“). Verkürzte Nennungen („vorgeprüft“) können aber eine weitergehende Prüfung (Due Diligence) suggerieren.
- **Risiko:** mittel (§ 5 UWG; Anlegererwartung).
- **Vorschlag:** Prüfumfang schriftlich definieren (Checkliste), verkürzte Nennungen mit Link/Tooltip auf die Definition versehen; Wortlaut durch Kanzlei freigeben. Die Startseiten-Kachel wurde bereits auf „Auf Plausibilität vorgeprüfte Projekte“ präzisiert (siehe „Direkt behoben“).
- **Rechtsgebiet / Land:** Lauterkeitsrecht, Kapitalmarkt-Nähe; DE, AT, CH.

---

## Risiko NIEDRIG

### N1 – „bankfähig“ (7 Stellen)
- **Fundstellen:** Ratgeber `benachteiligte-gebiete-pv-freiflaeche.js:268`, `ertragsgutachten-p50-p90.js:135/140/162/295`, `src/data/lexikon.js:1029`, `/rechner/projektbewertung` (`page.js:227`).
- **Problem:** Fachlich jeweils plausibel und erklärend (teils in Anführungszeichen), aber die interne Regel verlangt dokumentierte Fachabnahme; Claim-Lint führt sie als Fehler.
- **Vorschlag:** Fachabnahme durch E6/Finanzierungsfachmann dokumentieren, dann Lint-Allowlist; keine Textänderung nötig.
- **Rechtsgebiet / Land:** Lauterkeitsrecht; DE.

### N2 – Ratgeber Solarpark-Investment: „drückt der Kredit die Eigenkapitalrendite von 4,5 % auf 4,5 %“
- **Fundstelle:** `src/content/ratgeber/solarpark-investment-rendite.js:198` (Werte werden berechnet und runden derzeit auf denselben Wert).
- **Problem:** Gerenderter Satz wirkt widersprüchlich/fehlerhaft; kein Rechtsverstoß, aber glaubwürdigkeitsschädlich.
- **Vorschlag:** Zahlenteam/E6: Nachkommastelle erhöhen oder Satz dynamisch nur zeigen, wenn sich die gerundeten Werte unterscheiden.
- **Rechtsgebiet / Land:** – (fachlich); DE.

### N3 – Umweltaussage „sauberer Strom“ (Projektbeschreibung Irsingen)
- **Fundstelle:** `src/data/unternehmen.js:321`.
- **Problem:** Einzige gefundene Umweltumschreibung außerhalb klar belegter Technikaussagen; nach EmpCo-Maßstab ist „sauberer Strom“ für PV-Erzeugung vertretbar, sollte aber im Umweltaussagen-Review der Kanzlei mitlaufen. „grün“, „klimaneutral“, „CO₂-frei“ kommen auf der Website nicht vor (Suchlauf unten); Newsroom-Redaktionsregel verbietet sie bereits (`src/content/newsroom/index.js:15`).
- **Vorschlag:** Bestätigen oder durch „Solarstrom“ ersetzen.
- **Rechtsgebiet / Land:** EmpCo/Green Claims; DE, AT.

### N4 – Claim-Lint: Gate und Falsch-Positive
- **Fundstelle:** `qa/claim-lint.mjs`; Lauf vom 11.10.2026: 854 Dateien, **128 Fehler**, 318 Hinweise – Exit-Code trotzdem 0.
- **Problem:** Das Gate blockiert nicht; echte Funde (H1) stehen neben Falsch-Positiven: negierte Garantien („Ausschüttungen sind nicht garantiert“ – Risikohinweise, erwünscht), „Hessen ist Pionier“ (Aussage über das Land, `src/data/regionen/hessen.js:108`), „Live · Strommarkt DE“ mit echten Energy-Charts-Daten (`src/components/Energie/VppLiveSignal.js`), „z. B. Musterstadt“ als Formular-Platzhalter (`src/components/Kommune/KommuneAnfrage.js:37`), „alle fünf Minuten“ auf /energie-live (tatsächlicher Polling-Takt: `src/components/EnergieLive/useLiveDaten.js:32`, 5 × 60000 ms – Aussage geprüft und korrekt).
- **Vorschlag:** QM: Allowlist mit Begründung je Stelle pflegen, danach Exit ≠ 0 bei Fehlern.
- **Rechtsgebiet / Land:** intern (QM).

### N5 – „Herstellergarantie“-Aussage im Lexikon
- **Fundstelle:** `src/data/lexikon.js:234` („Hersteller garantieren meist eine Restleistung von rund 80 bis 90 % nach 25 bis 30 Jahren“).
- **Problem:** Drittgarantie-Aussage („meist“) ohne Quelle; üblich und vertretbar, aber als Tatsachenbehauptung über Dritte belegen (z. B. zwei Hersteller-Datenblätter im Faktenregister).
- **Vorschlag:** Quelle ergänzen.
- **Rechtsgebiet / Land:** Lauterkeitsrecht; DE.

---

## Verweis an anderes Paket

- **Nutzungsbedingungen stehen auf ENTWURF und werden verbindlich akzeptiert** (Lint-Regel `entwurf-flag`, `src/app/(stamm)/nutzungsbedingungen/page.js:32`; außerdem 95 × „Platzhalter“ in `bedingungen/*`, `datenschutz`, `DatenschutzEn.js`, `muster-nda`): zuständig Paket Vertragsrecht/AGB bzw. Datenschutz. Aus UWG-Sicht nur der Hinweis, dass als „Entwurf“ gekennzeichnete Texte nicht als geltend dargestellt werden dürfen.

---

## Positiv geprüft (keine Beanstandung)

- **Gläserner Solarpark** (`/projekte/glaeserner-solarpark`): durchgängig „ENTWURF“, „Beispieldaten“, „Demo-Modell“, Beispielwerte mit Faktenregister-Verweis gekennzeichnet.
- **Projektbörse** (`/projektboerse`): „DEMO – Vorführdaten, fiktive Beispielprojekte“, jedes Inserat „DEMO“, Offenlegung Eigenentwicklung + Informationsbarriere, Provision transparent (Verkäufer zahlt 1,5–3 %).
- **Preisblatt EG-Software** (`/energiegemeinschaften/software/preise`): „Preis auf Anfrage“ mit klarer Begründung (Freigabe steht aus), Netto/Brutto-Zusage – PAngV-konform für B2B-Angebot; keine versteckten Gesamtpreis-Probleme gefunden.
- **Partner-Widgets** (`/partner/widgets`, `/widgets/fristen`): ohne Cookies/Tracking, jede Zahl mit Quelle und Stand, bewusst ohne Countdown-/Dringlichkeits-Muster.
- **Gewerbestrom-Check**: Urteil „marktgerecht“ sauber definiert, Bewertungsgrenzen im Faktenregister als „eigene Festlegung“ offengelegt (`src/lib/fakten/daten/gewerbestrom-de.js:240`), ehrliche FAQ.
- **Referenzen** (`/referenzen`): nur Registerbelegtes (HRA-Nummern), Kundenprojekte nur mit Zustimmung – kein erfundener Social Proof; „Beliebt“-Badge der Startseite ist auf „Guter Einstieg“ umgestellt (`src/components/Home/WerkzeugFinder.js:26`); „meistgelesen“ kommt nicht mehr vor.
- **Rendite-/Pacht-Kommunikation**: durchgängig Risikohinweise („nicht garantiert“, „bis zum Totalverlust“, „keine Anlageberatung“), keine „sichere Pacht“-Formulierung (nur „planbar“, mit Einschränkungen); Genossenschaft konsequent als „in Vorbereitung, nicht gegründet“.
- **Regionen** (Stichprobe Bayern): Rechtsangaben mit Quelle und Stand, „Orientierungswerte, keine Angebote“.
- **EN-Fassung** (Stichprobe `/en`): keine schärferen Claims als die deutsche Fassung.

---

## Suchlauf (Dokumentation)

1. `grep -rinoE "garantiert|klimaneutral|CO2-frei|CO₂-frei|emissionsfrei|100 ?% (grün|öko)|Nr\.? ?1|Marktführer|marktführend|führend|größte|grösste|beste[rns]? |Pionier|einzigartig|immer der|meistgelesen|beliebt|sichere Pacht|risikolos|risikofrei|kostenlos|ohne Risiko|geprüfte Projekte" src/` – alle Treffer gesichtet; „größte/beste“ fast ausschließlich generisch („größter Teil/Hebel“), „kostenlos“ nur für tatsächlich kostenlose Leistungen (Rechner, Flächencheck, Investorenkonto).
2. `grep -rinE "klimaneutral|CO2-neutral|emissionsfrei|grüner Strom|sauberer Strom|klimapositiv|umweltfreundlich" src/` – einziger Treffer: N3.
3. `npm run lint:claims` (11.10.2026): 128 Fehler / 318 Hinweise, Aufschlüsselung siehe N4; relevante Fehler sind in H1, N1, N4 und im Verweis erfasst.
4. Browser-Prüfung (Playwright, gerendertes HTML): `/de`, `/en`, `/ch`, `/at/freiflaeche`, `/de/referenzen`, `/de/projektboerse`, `/de/projekte/glaeserner-solarpark`, `/de/rechner/gewerbestrom-check`, `/de/rechner/pachtangebot-check`, `/at/energiegemeinschaften/software/preise`, `/de/partner/widgets`, `/widgets/fristen`, `/de/kommunen/ratsvorlage`, `/de/projektboerse/muster-nda`, `/de/regionen/bayern`, `/de/ratgeber/solarpark-investment-rendite`, `/de/reststrom`.
