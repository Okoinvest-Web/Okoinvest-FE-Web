## Welle 2 · Welle-2-Planer

{
 "pakete": [
  {
   "key": "B1",
   "titel": "Faktenregister-Kern und Länder-Engine (Strangler, einziger Strom an markt.js)",
   "ziel": "Jeder Markt- und Rechtswert kommt aus einem Register mit Quelle, Stand, Gültigkeit, Status, Prüfer und Klasse. marktFuer(land) liefert je Land (DE/AT/CH, CH in CHF) die Annahmen. markt.js bleibt als Fassade bestehen. Die Rechner werden einzeln umgestellt, zuerst die vier Bericht-Rechner (Pacht, Pachtangebot-Check, Flächencheck, Kommune).",
   "dateien": "NEU: src/lib/fakten/schema.js, src/lib/fakten/register.js, src/lib/fakten/index.js, src/lib/fakten/pruefen.js, src/lib/fakten/waehrung.js, src/lib/fakten/daten/de.js, src/lib/fakten/daten/at.js, src/lib/fakten/daten/ch.js, src/lib/fakten/*.test.mjs, src/lib/invest/laender/** (marktFuer.js, erloesmodelle.js), qa/fakten-check.mjs, src/components/Fakten/** (FaktWert.js, StandHinweis.js, Quellenzeile.js). GEÄNDERT (exklusiv): src/lib/invest/markt.js, src/lib/rechner/** (nur die je PR umgestellten Module; annahmen.js für Format je Land/CHF), test/charakterisierung/**, test/rechner/**, qa/verify.mjs. NICHT: src/lib/fakten/daten/termine-*.js, umlagen-*.js, netzentgelte-*.js (gehören FRI).",
   "inhalt": "1) Am ersten Tag schema.js als Vertrag festschreiben und an FRI/B4 geben: Fakt = {id, wert, einheit, land: DE|AT|CH|DACH, quelle:{titel,url}, abruf (ISO-Datum), gueltigAb, gueltigBis, status: geprueft|zu_pruefen|entwurf|abgelaufen, pruefer (Rolle/Kürzel oder TODO-E6), klasse: A|B|C, notiz}. Dazu faktValidieren() und istAbgelaufen(fakt, heute). 2) register.js: fakt(id, land), fakten({land, klasse, praefix}), alleFakten(); Datenquellen werden als Module in daten/*.js registriert, so dass FRI eigene Dateien beisteuern kann (Import-Liste in index.js, FRI-Dateien als vorab angelegte leere Platzhalter-Exporte). 3) Werte aus markt.js (PACHT, ERLOESE, FREIFLAECHE, KOMMUNE, REGIONEN.ertrag, ZUSCHLAEGE, DACH, QUELLEN) in daten/de.js, at.js und ch.js überführen, jeweils mit der Primärquelle, die markt.js bzw. QUELLEN heute schon nennt. Werte ohne belegbare Quelle bekommen status \"zu_pruefen\" und werden nicht erfunden. 4) marktFuer(land) in src/lib/invest/laender/marktFuer.js baut aus dem Register Objekte in derselben Form wie die heutigen markt.js-Konstanten, mit Währung (EUR, CHF für CH) und Erlösmodell je Land (DE EEG/§ 51, AT EAG-Marktprämie/Investzuschuss, CH HEIV/GMP; wo unbelegt: zu_pruefen). Danach exportiert markt.js dieselben Namen, bezogen über marktFuer(\"DE\") (Strangler-Fassade). Die Charakterisierungs-Snapshots müssen dabei unverändert bleiben. 5) Rechner einzeln umstellen, je Rechner ein eigener Patch mit Snapshot-Diff: pacht.js, pachtangebot.js, flaechencheck.js, kommune.js bekommen den Parameter land (Default aus regionId bzw. \"DE\"). Für AT/CH gilt weiterhin die Länder-Sperre (laenderSperre), bis Werte mit status geprueft vorliegen. Die übrigen Rechner bleiben auf der Fassade und werden später umgestellt. 6) qa/fakten-check.mjs: 0 Werte ohne quelle/abruf, Warnung bei abgelaufenen Klasse-A-Werten und bei status zu_pruefen. Ausgabe als JSON und als Schritt in qa/verify.mjs (bei Klasse A abgelaufen: Gate rot). Außerdem Schritt 5 in verify.mjs auf den Glob qa/e2e/*.e2e.mjs umstellen, damit B3 und B4 eigene E2E-Dateien beisteuern können (erste Änderung im Paket, sofort an alle melden). 7) Komponenten FaktWert und StandHinweis zeigen Wert, Einheit, Land, Stand und Quelle. Ein abgelaufener Wert wird sichtbar als \"Stand abgelaufen, wird geprüft\" markiert und nie als aktuell ausgegeben. Alle Bausteine nehmen land als Prop (länderfähig).",
   "abnahme": "(a) npm run test:charakterisierung grün; jede Snapshot-Änderung einzeln im Rückgabebericht begründet, Fassaden-Umstellung selbst ohne Diff. (b) Neue node:test-Tests für schema, register, marktFuer(DE/AT/CH), Währung CHF, istAbgelaufen; in npm test enthalten. (c) qa/fakten-check.mjs meldet 0 Fakten ohne quelle oder abruf; abgelaufener Klasse-A-Testfakt macht verify rot. (d) marktFuer(\"DE\") liefert für die vier Bericht-Rechner identische Ergebnisse wie vor der Umstellung (Snapshot); marktFuer(\"CH\") rechnet in CHF oder sperrt sichtbar. (e) Abweichung Rechner zu Regionsseite für DE-Standardfall unter 3 % (Test über regionen-Daten vs. pachtRechnung). (f) grep: keine Importe aus src/lib/fakten/daten/* außerhalb src/lib/fakten. (g) npm run verify grün, npx eslint auf alle geänderten Dateien ohne Fehler.",
   "deps": []
  },
  {
   "key": "FRI",
   "titel": "Fristen 2026, Umlagen 2027 und Netzentgelte 2027 als Registerdaten",
   "ziel": "Alle befristeten Termine und die 2027er-Preisbestandteile liegen als datierte, quellenbelegte Fakten im Register (nur Daten, keine Pressearbeit). Bereits bestehende Fristenkästen beziehen ihren Inhalt daraus.",
   "dateien": "NEU: src/lib/fakten/daten/termine-2026.js, src/lib/fakten/daten/umlagen-2027.js, src/lib/fakten/daten/netzentgelte-2027.js, src/lib/fakten/daten/termine.test.mjs, src/components/Fakten/FristenListe.js, src/components/Fakten/BestandteileTabelle.js, src/app/marktdaten/fristen/page.js (noindex bis Fachfreigabe). GEÄNDERT (exklusiv): src/data/regionen/fristen.js, src/data/regionen/fristen.test.mjs.",
   "inhalt": "1) Termine 2026 im Fakt-Schema von B1 erfassen: EAG-Call AT (08.10.–22.10.2026), Pronovo-Runde 4/2026 (18.10.–01.11.2026), CH-Marktzugang 31.10., dazu die übrigen Termine aus dem Masterplan bzw. den Expertenbefunden (gezielt per Grep in armee/experten/*). Jeder Termin bekommt die Primärquelle mit Abrufdatum, ein gueltigBis und die Klasse A. 2) Umlagen 2027 DE (KWKG-Umlage, Offshore-Netzumlage, Aufschlag für besondere Netznutzung) als Einträge mit dem amtlichen Veröffentlichungstermin der Übertragungsnetzbetreiber (netztransparenz.de). Solange keine Werte veröffentlicht sind: wert null, status zu_pruefen und der Hinweis \"Veröffentlichung erwartet bis <Datum laut Quelle>\". Keine Schätzwerte. Bei Werten, die bis zur Abnahme erschienen sind: Wert plus Quelle, Status geprueft nur mit Prüfer (sonst TODO-E6). 3) Netzentgelte 2027: DE nur Struktur und Termin der vorläufigen und endgültigen Veröffentlichung, keine VNB-Vollabdeckung (Stop-Liste); AT SNE-VO 2027 nur als erwarteter Termin, kein AT-Atlas; CH ElCom-Tarife 2027 nur als Verweis auf die amtliche Quelle, Werte zu_pruefen. 4) src/data/regionen/fristen.js wird zur Fassade über die Registereinträge, die bestehenden Exporte (EAG_CALL_AT usw.) und ihr Verhalten nach Ablauf bleiben unverändert. 5) FristenListe(land) und BestandteileTabelle(land) zeigen Stand, Quelle und Ablauf. Abgelaufene Einträge erscheinen nicht, ein offener Wert erscheint als \"noch nicht veröffentlicht\". Keine Countdowns. 6) Die Seite /marktdaten/fristen als schlichte Übersicht im bestehenden Design, metadata robots noindex, Kennzeichnung \"Prüfung Rechtsabteilung\".",
   "abnahme": "(a) Alle neuen Einträge bestehen faktValidieren() aus B1 (Test); 0 Einträge ohne Quelle und Abruf. (b) fristen.test.mjs weiter grün; die Exporte von fristen.js sind identisch zum Stand vorher (Vergleichstest bis zum jeweiligen Ablaufdatum). (c) Test: Ein Eintrag mit gueltigBis in der Vergangenheit wird von FristenListe nicht ausgegeben. (d) Kein Umlagen- oder Netzentgeltwert ohne Primärquelle; offene Werte haben wert null und status zu_pruefen (Test). (e) Screenshot /marktdaten/fristen bei 1440 und 390 px über check.mjs, ohne Konsolenfehler; Claim-Lint ohne neue Funde. (f) npm run verify grün, eslint sauber.",
   "deps": [
    "B1"
   ]
  },
  {
   "key": "B3",
   "titel": "Lead-Kette: Einwilligungsprotokoll, getrennte Personendaten, Routing Land×Typ×Größe, SLA-Messung, Score",
   "ziel": "Jede Anfrage hat ein Land und eine zuständige Person (oder ist sichtbar \"ohne Zuständigkeit\"). Die append-only-Kette enthält nur Pseudonyme und Hashes; Personendaten liegen getrennt und sind löschbar (Art. 17). Werbekanäle ohne Einwilligung sind technisch gesperrt. Die Zeit bis zum Erstkontakt wird gemessen (Median/P90).",
   "dateien": "NEU: src/lib/anfrage/routing.js, src/lib/anfrage/sla.js, src/lib/anfrage/feiertage.js, src/lib/anfrage/score.js, src/lib/anfrage/protokoll.js (Pseudonym, Eintragsform, Kanal-Ampel), src/lib/anfrage/*.test.mjs, src/data/lead-routing.js, src/lib/plattform/backend/leadkette.js, src/lib/plattform/backend/demo/leadkette.js, src/lib/plattform/backend/frappe/leadkette.js, src/app/api/admin/leads/** (Lead-Desk, SLA-Auswertung, Widerruf, Löschung), src/app/portal/admin/leads/** und src/components/Portal/Leads/**, Backend-Import/oekoinvest_app/oekoinvest_app/plattform/api/einwilligung.py, Backend-Import/…/plattform/doctype/plattform_einwilligung_protokoll/**, Backend-Import/…/plattform/doctype/plattform_lead_person/**, qa/e2e/lead.e2e.mjs. GEÄNDERT (exklusiv): src/app/api/anfrage/route.js, src/lib/anfrage/hinweise.js, src/lib/anfrage/laender.js, src/lib/anfrage/zaehler.js, src/lib/anfrage/tests/**, src/lib/plattform/backend/demo.js (nur Abschnitt anfrageAnlegen und Hilfen), Backend-Import/…/plattform/api/anfrage.py, Backend-Import/…/hooks.py (Scheduler), src/lib/plattform/backend/frappe.js (nur falls Mapping nötig).",
   "inhalt": "1) Datenmodell: protokoll.js erzeugt Einträge {pseudonym = HMAC-SHA-256(E-Mail normalisiert, Server-Pepper aus Umgebung), art: hinweis|einwilligung|widerruf|doi, zweck: werbeanruf|newsletter|weitergabe_partner|bericht, textId, textVersion, textHash, kanal, land, zeit}. Die Einträge werden über die vorhandene hashkette.js (verketten/verifyChain) verkettet und sind append-only. Personendaten (Name, Mail, Telefon, gekürzte IP, Vorgangs-ID) liegen in einer getrennten Tabelle: Demo .data/plattform.json unter db.leadPersonen, Frappe DocType plattform_lead_person. IPs werden nach 30 Tagen gelöscht (Demo beim Zugriff, Frappe per täglichem Scheduler in hooks.py). Bei Löschung nach Art. 17 bleibt das Pseudonym in der Kette; der Minimaldatensatz für den Nachweis bleibt bis zum Ende der Nachweisfrist (Frist als TODO Rechtsabteilung markieren). 2) Widerruf als eigener Eintrag; werbekanalErlaubt(pseudonym, zweck) liest die Kette (Kanal-Ampel) und wird von allen Versandstellen genutzt. Werbeanrufe und Werbe-Mails ohne Einwilligung werfen einen Fehler. 3) Die drei getrennten, nicht vorbelegten Häkchen (Rückruf/Werbeanruf, Newsletter/Alarm, Weitergabe an benannte Partner) stammen aus hinweise.js. Es gibt keine mutmaßliche B2B-Einwilligung. Telefon ist nur Pflicht, wenn Rückruf oder Vor-Ort-Termin gewählt wurde (bestehende Regel). 4) Routing-Matrix in src/data/lead-routing.js: Land (DE/AT/CH/unbekannt) × Typ (flaeche, agri, dach, kommune, investor, speicher, …) × Größe (ha bzw. MWh/MW-Klassen) → Lead-Desk (Rolle bzw. Gebiet aus akquise.js), Vertretung, SLA-Klasse. Personen und Postfächer je Land sind als TODO-Inhaber eingetragen, Platzhalter ohne echte Adresse; Fallback ist das vorhandene Gebiets-Routing bzw. \"ohne Zuständigkeit\". routing.js ist eine reine Funktion. 5) sla.js: Zielwerte aus Masterplan 5.5 (A-Lead mit Rückruf < 1 Geschäftsstunde; Großspeicher, Investor, Kommune 4 h; Fläche ≥ 20 ha am selben Tag; Rest 2 Werktage) in Geschäftsstunden je Land mit bundesweiten Feiertagen DE/AT/CH (feiertage.js, Ostern berechnet; regionale Feiertage als TODO). Erfasst werden eingang, erstkontaktAm (gesetzt beim ersten Statuswechsel bzw. bei der ersten Aktivität), Überfälligkeit, Median und P90 je Land/Typ. Die Zeitziele sind nur intern; öffentlich gibt es keine Zeitzusage (Welle-1-Regel). 6) score.js: regelbasiert A/B/C mit Begründungstext (Größe, Land bekannt, Rückrufwunsch, Vollständigkeit), kein ML. 7) Integration in anfrageAnlegen (Demo und Frappe-anfrage.py gespiegelt): Land Pflichtfeld des Vorgangs, zuständig + Vertretung, slaKlasse, score, Protokolleinträge. Eine öffentliche Schnittstelle protokollAnhaengen()/werbekanalErlaubt() über backend/leadkette.js (eigener Facade-Stil wie werkzeuge.js, backend/index.js bleibt unverändert), die B4 für DOI-Einträge nutzt. Den Vertrag (Funktionsnamen und Felder) am ersten Tag an B4 geben. 8) Admin-Ansicht Lead-Desk: Liste je Land mit SLA-Ampel, Median/P90, Absagecodes mit Begründung, Widerruf/Löschung auslösen, verifyChain-Status. 9) Letzter Schritt: Partner-/Gruppenkennung aus GRP (src/lib/gruppe/kanal.js, Funktion herkunftBereinigen) in route.js aufrufen, sobald GRP abgenommen ist; bis dahin bleibt herkunft wie heute. 10) Personendaten nie in Logs oder Fehlermeldungen.",
   "abnahme": "(a) Tests: Kette verifizierbar (verifyChain true), Manipulation erkannt; kein Personendatum in Ketteneinträgen (Test durchsucht Einträge nach Mail/Telefon/IP-Mustern). (b) Löschung nach Art. 17 entfernt die Personenzeile, die Kette bleibt verifizierbar. Test: IP älter als 30 Tage wird entfernt. (c) werbekanalErlaubt false ohne Einwilligung und nach Widerruf, true nur nach ausdrücklicher Einwilligung (Test). (d) 100 % der Test-Anfragen DE/AT/CH haben Land und zuständig oder die Markierung \"ohne Zuständigkeit\" (Matrix-Test über alle Kombinationen). (e) SLA-Test mit Feiertag und Wochenende je Land; Median/P90-Berechnung getestet. (f) Score liefert immer Klasse und Begründung. (g) Bestehende Tests src/lib/anfrage/tests/** grün, Telefonregel unverändert. (h) Frappe-Spiegel: anfrage.py und einwilligung.py mit derselben Logik (Python-Syntaxcheck py_compile; Logik-Parität im Rückgabebericht dokumentiert). (i) E2E qa/e2e/lead.e2e.mjs mit abgefangenen POSTs grün; Portal-Ansicht über check.mjs bei 1440/390 ohne Konsolenfehler. (j) npm run verify grün, eslint sauber; Postfächer/Personen als TODO-Inhaber markiert.",
   "deps": [
    "GRP"
   ]
  },
  {
   "key": "B4",
   "titel": "Bericht-Baustein Stufe 1: HTML-Bericht mit Double-Opt-in (Pacht, Pachtangebot-Check, Flächencheck, Kommune)",
   "ziel": "Das Ergebnis bleibt immer frei. Wer einen Bericht möchte, gibt Name und E-Mail an (Telefon freiwillig). Der Server rechnet neu, bestätigt per Double-Opt-in-Link und zeigt eine barrierearme HTML-Berichtsseite mit Druck-CSS und Annahmenbuch. Vor dem Livegang wird nur im Demo- bzw. Testmodus versendet.",
   "dateien": "NEU: src/lib/bericht/** (neuRechnen.js mit Positivliste der 4 Rechner und Eingabe-Validierung, annahmenbuch.js, token.js, versand.js mit versandErlaubt(), *.test.mjs), src/app/api/rechner/bericht/route.js (POST anfordern), src/app/api/rechner/bericht/bestaetigen/route.js, src/app/bericht/[token]/page.js (noindex, nicht in Sitemap), src/components/Bericht/** (BerichtAnfordern.js, BerichtSeite.js, Annahmenbuch.js, bericht-druck.css), src/lib/plattform/backend/bericht.js, src/lib/plattform/backend/demo/bericht.js, src/lib/plattform/backend/frappe/bericht.js, Backend-Import/…/plattform/api/bericht.py, Backend-Import/…/plattform/doctype/plattform_bericht/**, qa/e2e/bericht.e2e.mjs. GEÄNDERT (exklusiv): src/components/Rechner/ErgebnisAnfrage.js (optionale Prop bericht), src/components/Rechner/PachtangebotCheck.js, src/components/Rechner/KommuneRechner.js, src/components/Flaeche/PachtRechner.js, src/components/Flaeche/Check/** bzw. src/components/Flaeche/FlaechenWizard.js (nur Ergebnisbereich).",
   "inhalt": "1) POST /api/rechner/bericht nimmt {rechner, eingaben, land, kontakt:{name,email,telefon?}, einwilligungen?} an. Nur die 4 Rechner der Positivliste, Eingaben werden auf Typ und Bereich geprüft, maxBytes klein, Rate-Limit über das vorhandene route()-Limit, Bot-Schutz über das vorhandene Honeypot-Muster. Der Server rechnet mit den Funktionen aus src/lib/rechner neu und übernimmt nie Client-Ergebnisse. Der Server-Zähler ohne Kennung (wie zaehler.js, aber eigener Schlüsselraum in src/lib/bericht) zählt angefordert, bestaetigt und abgelehnt. 2) Token: zufällig (32 Byte), gespeichert wird nur der SHA-256-Hash, Ablauf der Bestätigung 48 h, Berichtslink 30 Tage (Fristen als TODO Datenschutz/Rechtsabteilung). Bestätigung über einen Link, der eine Seite mit Bestätigungsknopf öffnet (POST), damit Mail-Scanner nicht automatisch bestätigen. 3) Double-Opt-in: Die Bestätigung schreibt über backend/leadkette (B3-Vertrag) einen Eintrag art doi, zweck bericht. Erst danach entsteht ein Vorgang über backend.anfrageAnlegen mit typ aus dem Rechner, land und strukturierten Rechnerdaten. Newsletter/Werbeanruf nur über die getrennten Häkchen. 4) versand.js: versandErlaubt() gibt true nur zurück, wenn das Demo-Backend aktiv ist (Mail landet im postausgang) oder wenn ausdrücklich BERICHT_TESTVERSAND=1 und NEXT_PUBLIC_SITE_ENV ungleich production gesetzt sind. In jedem anderen Fall wird nichts versendet; die Antwort lautet ehrlich \"Berichtsversand startet mit dem Livegang\" und es gibt keine Datenerhebung ohne Zweck (Formular ausgeblendet). Absendername und Domain sind als TODO-Inhaber/B0 markiert, kein Versand unter dem Namen vor dem Livegang. 5) Berichtsseite: Kopf mit Rechner, Land, Datum, Prüf-ID (Hash über Eingaben + Rechenlogik-Stand STAND_RECHENLOGIK), Ergebnis-Kennzahlen, Rechenweg, Annahmenbuch (je verwendeter Annahme Wert, Einheit, Quelle, Stand, Status aus dem B1-Register; bis zur B1-Umstellung Fallback auf markt.js-QUELLEN mit Hinweis \"Stand laut Rechenlogik\"), Grenzen und Haftungshinweis (Kennzeichnung \"Prüfung Rechtsabteilung\"). Druck-CSS (A4, keine Navigation, Links ausgeschrieben), semantisches HTML, Kontraste nach WCAG AA, robots noindex, no-store. 6) UI: BerichtAnfordern als ruhiger Zusatz unter ErgebnisAnfrage. Das Ergebnis ist nie gesperrt, es gibt keinen Countdown und keine Vorbelegung; Pflichtfelder sind nur Name und E-Mail. Design über das Design- und Motion-System. Alle Bausteine nehmen land als Prop/Parameter (später aus der Route /de|/at|/ch). 7) Frappe-Spiegel: api/bericht.py (anfordern, bestaetigen, lesen) und DocType plattform_bericht (token_hash, rechner, land, eingaben_json, ergebnis_json, pruef_id, ablauf, bestaetigt_am), ohne Personendaten außer dem Verweis auf plattform_lead_person (B3). 8) Server-Neuberechnung gegen die B1-Fassade; erst produktiv schalten, wenn B1 die vier Rechner umgestellt hat. Die UI-Arbeit läuft parallel (Rahmen: höchstens 2 Kernströme gleichzeitig).",
   "abnahme": "(a) Tests: Server ignoriert manipulierte Client-Ergebnisse (Neuberechnung gleich Rechnerfunktion); nur 4 Rechner zulässig, sonst 422; Token wird nur gehasht gespeichert; abgelaufenes Token führt zu 410. (b) Test: ohne DOI kein Vorgang und kein Bericht; nach DOI genau ein Vorgang mit Land und Rechnerdaten und ein Ketteneintrag doi ohne Personendaten. (c) versandErlaubt() ist false bei Frappe ohne Testflag und bei SITE_ENV=production (Test). (d) Telefon optional (Test: Anfrage ohne Telefon wird angenommen). (e) Berichtsseite: axe ohne neue Verstöße; Druckansicht per shot.mjs geprüft; Screenshots 1440/390 aller 4 Rechner mit Bericht-Baustein über check.mjs. (f) Annahmenbuch listet zu jeder genutzten Annahme Quelle und Stand; Werte zu_pruefen sind sichtbar markiert. (g) E2E qa/e2e/bericht.e2e.mjs (Anfordern → postausgang → Bestätigen → Bericht) grün im Demo-Modus. (h) Charakterisierungstests unverändert (B4 ändert keine Rechenlogik). (i) npm run verify grün, eslint sauber, Claim-Lint ohne neue Funde.",
   "deps": [
    "B1",
    "B3"
   ]
  },
  {
   "key": "GRP",
   "titel": "Gruppenkanal: offengelegte Verweise und Partnerkennungen",
   "ziel": "Leads aus der ÖKOVOLT-Gruppe und von Partnern sind mit Kennung messbar. Die Gruppenzugehörigkeit ist überall offengelegt. Es gibt keine Cookies, keinen Versand und keine Provisionslogik.",
   "dateien": "NEU: src/lib/gruppe/partner-register.js (Kennung, Art: gruppe|kammer|maschinenring|stadtwerk|installateur, Land, Status aktiv/entwurf, Offenlegungstext; Einträge nur als TODO-Platzhalter), src/lib/gruppe/kanal.js (herkunftBereinigen: Kennung serverseitig gegen das Register prüfen, unbekannt → verwerfen), src/lib/gruppe/*.test.mjs, src/app/p/[kennung]/route.js (Kurzlink: 302 auf das freigegebene Ziel mit utm_source=<kennung>&utm_medium=gruppe|partner, ohne Cookie, unbekannte Kennung → Startseite ohne Parameter), src/components/Gruppe/** (Offenlegung.js \"Teil der ÖKOVOLT-Gruppe\", VerweisBaustein.js als HTML-Snippet-Vorlage für Gruppenseiten), src/app/api/admin/kanaele/route.js und src/components/Portal/Kanaele/** (Auswertung Leads je Gruppen-/Partnerkanal). GEÄNDERT (exklusiv): src/lib/herkunft.js und dessen Test(s).",
   "inhalt": "1) In herkunft.js um die Kanäle \"Gruppe\" und \"Partner\" erweitern: Referrer oekovolt.de/oekovolt.com sowie utm_medium=gruppe|partner. Erkannt werden sie nach KI-Assistent und vor Kampagne, die Reihenfolge wird im Test festgehalten. Ohne Cookie, nur Arbeitsspeicher (bisheriges Prinzip). 2) Partner-Register als Daten: Kennungen sind kurze, nicht personenbezogene Slugs. Echte Partner und Gruppengesellschaften trägt erst der Inhaber ein (Entscheidung E9: TODO-Inhaber), bis dahin nur Beispiel-Einträge mit status entwurf, die im Produktionsmodus nicht greifen. 3) kanal.js als reine Serverfunktion herkunftBereinigen(herkunft) → {kanal, partnerKennung|null}. Schnittstellenvertrag für B3 (B3 ruft sie in route.js auf). 4) Kurzlink /p/[kennung]: Weiterleitung nur auf interne Pfade aus einer Positivliste (kein offener Redirect, vorhandenes sicheresZiel-Muster nutzen), keine Kennung im Klartext in Logs. 5) Offenlegung: Baustein für Seiten, auf die Gruppen- oder Partnerverweise führen (Landing-Hinweis \"Sie kommen über <Partner>; ÖkoInvest ist Teil der ÖKOVOLT-Gruppe\"), Kennzeichnung \"Prüfung Rechtsabteilung\". Es gibt keine Vergütungs- oder Provisionsaussage (Stop-Liste: keine Provisionen vor Klärung der Erlaubnisse). 6) VerweisBaustein: statische HTML-Vorlage und Text für oekovolt.de/.com zum Einbau durch die Gruppe. Der Einbau auf fremden Domains gehört nicht in dieses Repo. 7) Admin-Auswertung: Leads je Kanal und Kennung je Land über die vorhandenen Vorgänge (Feld herkunft), ohne Personendaten. 8) Alles länderfähig: Kennung trägt land; die Zielpfade werden als Pfadschlüssel gespeichert, die das Länderrouting später auf /de|/at|/ch auflöst.",
   "abnahme": "(a) Tests: kanal() erkennt Gruppe und Partner, KI-Assistent hat weiter Vorrang; bestehende herkunft-Tests grün. (b) herkunftBereinigen verwirft unbekannte bzw. Entwurfs-Kennungen im Produktionsmodus (Test). (c) /p/[kennung] leitet nie auf externe Ziele weiter (Test mit //evil, https://…), setzt kein Cookie (Header-Prüfung im Test). (d) Offenlegungsbaustein über check.mjs bei 1440/390 sichtbar, axe ohne neue Verstöße. (e) Keine echten Partnernamen oder Kennzahlen erfunden; Register nur mit TODO-Platzhaltern. (f) npm run verify grün, eslint sauber.",
   "deps": []
  }
 ],
 "laenderrouting": {
  "ziel": "Eine Domain (oekoinvest.com) mit Länderzonen /de, /at, /ch nach dem Zonenmodell aus Masterplan Abschnitt 4. Gestufter Start: /de vollständig, /at nur fachgeprüfte Seiten (Regionen AT, Energiegemeinschaften, Flächencheck AT), /ch nur Einstieg, Marktzugang-Check und Parzellen-Vorprüfung. Fehlt eine dieser Seiten, steht dort \"in Vorbereitung\". Es gibt keine Zwangsweiterleitung; der Länder-Vorschlag erscheint als schließbares Banner, ein Cookie wird nur nach aktiver Wahl gesetzt. Das Paket läuft ALLEIN und erst NACH B1, FRI, B3, B4 und GRP, weil es fast alle Seiten berührt.",
  "inhalt": "1) src/lib/land/** als einzige Quelle: laender.js (DE/AT/CH, Präfix, lang de-DE/de-AT/de-CH, Währung über B1-waehrung), zonen.js (geschlossene Liste des neutralen Stamms: /, /wissen, /projektboerse, /investoren, /unternehmen, /referenzen, /kontakt, /impressum, /datenschutz, /presse, /hinweisgeber, /quellen, /sicherheit; ohne Präfix: /en, /portal, /login, /einladung, /api, /bericht, /p), stufen.js (je Land die freigegebenen Seiten, AT und CH als Positivliste mit Fachfreigabe-Vermerk und Prüfer TODO-E6), pfad(schluessel, land), alternates(schluessel) und hreflang bidirektional inkl. x-default. 2) Routengruppe src/app/(laender)/[land]/… mit generateStaticParams aus stufen.js und notFound() für nicht freigegebene Kombinationen. Länderzonen-Seiten (Rechner, Regionen, Flächencheck, Kommunen, Energiegemeinschaften, Reststrom, Marktdaten/Fristen usw.) werden dorthin verschoben. Die Bausteine aus B1, FRI, B4 und GRP bekommen land aus params. Für lang je Zone sind getrennte Root-Layouts je Routengruppe nötig (html lang); die vorhandene Root-Struktur wird entsprechend aufgeteilt. 3) umzug.js als Redirect-Tabelle (alt → /de/…) mit 308, ohne Ketten (Test: kein Ziel ist selbst eine Quelle), eingebunden über redirects() in next.config. Der Middleware-Matcher wird NICHT erweitert. 4) Codemod-Skript scripts/codemod-links.mjs für die ca. 800 statischen und die dynamischen Links: Ersatz durch pfad(), Bericht der nicht automatisch lösbaren Stellen; Navigation und Footer laufen über src/lib/land. 5) Sitemaps je Land und eine für den Stamm (sitemap.js bzw. generateSitemaps), robots.js verweist auf alle. Seiten mit noindex (Rechtsentwürfe, /marktdaten/fristen bis zur Freigabe) bleiben draußen. 6) Länderwechsler in der Navbar: Er wechselt auf die Entsprechung im anderen Land, sonst auf dessen Einstieg; fehlende Seiten zeigen sichtbar den Link auf die DE-Seite mit \"(gilt für Deutschland)\". 7) Länderhinweis: /api/land liefert nur einen Vorschlag (Accept-Language bzw. Geo-Header als Hinweis) ohne Vary auf Geo und ohne Weiterleitung. Ein Client-Banner ist schließbar und tastaturbedienbar; das Cookie land wird erst bei aktiver Wahl gesetzt (Cookie-Hinweis in den Datenschutz-Entwurf aufnehmen, Kennzeichnung Prüfung Rechtsabteilung). 8) Formulare, Lead-Kette und Bericht übernehmen das Land aus der Route (daten.land), die PLZ-Regel gilt je Land. 9) Firmen- und Länderangaben nur aus src/data/site.js; Postfächer je Land bleiben TODO-Inhaber. 10) Kein Massenklonen: keine geklonten Seiten, keine Massen-PLZ-Seiten.",
  "abnahme": "(a) Tests für src/lib/land: pfad/alternates für alle Zonen, hreflang bidirektional (jede Seite verweist auf alle Alternativen und wird von ihnen zurückverwiesen) inklusive x-default; Stamm und präfixlose Bereiche erhalten nie ein Präfix. (b) umzug.js: alle alten öffentlichen Pfade aus der bisherigen Sitemap haben genau eine 308-Weiterleitung, ohne Ketten und ohne Schleifen (Test). (c) Gestufter Start: /at und /ch liefern für nicht freigegebene Seiten 404 bzw. \"in Vorbereitung\"; /de ist vollständig (Test aus stufen.js gegen die Routen). (d) Keine IP-Weiterleitung, kein Vary: Geo-Header in Antworten (Header-Test); Cookie nur nach Klick (E2E). (e) Codemod-Bericht: 0 verbleibende harte Links auf verschobene Pfade (grep-Check in verify). (f) Sitemaps je Land valide, enthalten nur indexierbare und freigegebene Seiten. (g) check.mjs-Screenshots 1440/390 für /de, /at, /ch, Banner und Länderwechsler, ohne Konsolenfehler; axe ohne neue Verstöße. (h) Charakterisierungstests unverändert, npm run verify grün, eslint sauber. (i) Der Crawl-Diff gegen einen Produktions-Build läuft NICHT auf dem 8-GB-Rechner; er ist als offener Punkt für Staging vermerkt."
 },
 "nicht_in_welle2": [
  "Organisatorisch, nicht als Code: Anwaltsmandate DE/AT/CH (Strang R), Eintrag bei energiegemeinschaften.gv.at, Auswahl des externen Hinweisgeber-Anbieters (E13), Fotoshooting eigener Parks",
  "Inhaberentscheidungen, die als TODO markiert und nicht selbst getroffen werden: zweite Prüfperson (E6; Prüfer-Felder im Register bleiben TODO-E6), Belegbarkeit der Reststrom-Aussage \"Strom aus Parks der Gruppe\", Mindestbetrag Entwicklungsbeteiligung, Team-Postfächer bzw. Personen je Land für Routing und SLA (E7), Lizenznachweise der 18 Bilder, Freigabe Gruppenkanal und echte Partnerkennungen (E9)",
  "B0 Betrieb: Domain sichern, Hosting EU, Frappe produktiv, Mail-Dienstleister mit AVV, SPF/DKIM/DMARC, privates Git-Remote, NEXT_PUBLIC_SITE_URL/ENV setzen. Bis dahin kein echter Versand (DOI nur Demo/Test), keine Presse, kein Newsletter unter dem Namen",
  "Livegang selbst: frühestens am Ende von Welle 2, wenn Strang R freigegeben, B0 erledigt, verify grün und der Vertrieb besetzt ist",
  "Crawl-Diff gegen einen Produktions-Build (nicht auf dem 8-GB-Rechner, kein next build lokal), Lighthouse- und Playwright-Läufe nur seriell",
  "Welle 3 und später: B5 Rechnungs-Check Gewerbestrom, Netzentgelte der größten VNB, B6 Flächenpass, B7 EG-Preisblatt/White-Label, B8 Kommunal 2.0 und Ratsvorlage, B9 Ausschreibungs-Monitor, B10 Neutralität der Börse, Newsletter je Land, Newsroom, Search Console, Paid Media, PDF-Bericht mit Prüf-ID (B4 Stufe 2)",
  "Umstellung der übrigen Rechner (Solarpark, Agri-PV, Speicher, PPA, Carport, Beteiligung usw.) auf die Länder-Engine: läuft nach Welle 2 Rechner für Rechner einzeln weiter",
  "Gestrichen bzw. Stop-Liste: Pacht-Barometer, VNB-Vollabdeckung DE, AT-Atlas vor SNE-VO 2027, ML-Scoring, mutmaßliche B2B-Einwilligung, Provisionen vor Klärung der Erlaubnisse, Countdowns, erfundene Zähler oder Testimonials, Massen-PLZ-Seiten, neue npm-Abhängigkeiten ohne zwingenden Grund",
  "Matomo-Einführung (E12) und Ersatz von GA4: nicht Teil der Code-Pakete von Welle 2, solange der Inhaber nicht entschieden hat",
  "git-Commits und Remote macht der Mensch; die Agenten liefern Patches bzw. Branches"
 ]
}

---

## Welle 2 · Paket GRP: Gruppenkanal: offengelegte Verweise und Partnerkennungen

Paket GRP ist umgesetzt. `npm run verify` ist grün (5 min 9 s), eslint ist sauber, und alle 55 betroffenen Tests laufen durch (38 neue plus die bestehenden Herkunft-Tests). Keine Commits und keine neuen Abhängigkeiten. Wichtig: Seiten, Formular und Speicherung nutzen die neuen Teile noch nicht. Bis jemand die drei Einbaupunkte unten erledigt, zählt die Website keine Gruppen- oder Partner-Anfragen, und Besucher sehen den Hinweis nicht.

**Geänderte und neue Dateien**
- GEÄNDERT: `C:/Users/SALEADMIN/Downloads/Oekoinvest-Web/src/lib/herkunft.js`
  - Neue Kanäle „Gruppe“ (Verweis von oekovolt.de/.com oder `utm_medium=gruppe`) und „Partner“ (`utm_medium=partner`).
  - Reihenfolge: KI-Assistent → Partner/Gruppe → Anzeige → Kampagne. Weiterhin ohne Cookie, nur im Arbeitsspeicher.
- NEU `src/lib/gruppe/partner-register.js`: Arten, Länder, Zielseiten als Schlüssel (`ZIELE`, `zielPfad(schluessel, land, {praefix})`), Prüfung der Kennung, `kennungFinden()`.
  - Nur 6 Beispiel-Einträge `beispiel-*`, alle im Status Entwurf und als TODO-Inhaber markiert.
  - Im Produktionsmodus greift keiner davon.
- NEU `src/lib/gruppe/kanal.js`:
  - `herkunftBereinigen(herkunft)` → `{kanal, partnerKennung|null}`, für B3. Der Server berechnet den Kanal selbst, verwirft unbekannte und Entwurfs-Kennungen und verlangt, dass die Art zum Kanal passt.
  - Dazu `KANAELE`, `offenlegungDaten()` und `kanalAuswertung()` (nur Zählwerte).
- NEU `src/app/p/[kennung]/route.js`: Kurzlink mit 302 auf eine erlaubte interne Seite (aus `ZIELE`, zusätzlich durch das vorhandene `sicheresZiel()`).
  - Hängt `utm_source`/`utm_medium` an; `Location` ist ein relativer Pfad.
  - Sendet `no-store` und `noindex`, setzt kein Cookie und schreibt die Kennung nicht ins Log.
  - Unbekannte Kennung → `/` ohne Parameter.
- NEU `src/app/api/admin/kanaele/route.js`: nur Backoffice mit Recht „Berichte“; Anfragen je Kanal, Kennung und Land, ohne Personendaten.
- NEU `src/components/Gruppe/Offenlegung.js`: Hinweis „Sie kommen über <Partner>. Die ÖkoInvest GmbH ist Teil der ÖKOVOLT Gruppe“ samt Gesellschafterin laut `site.js`.
  - Das Etikett „Entwurf · Prüfung Rechtsabteilung“ erscheint nur außerhalb der Produktion.
  - Der Hinweis lässt sich schließen; das gilt nur für den Seitenaufruf.
- NEU `src/components/Gruppe/VerweisBaustein.js`: HTML- und Textvorlage für die Gruppe, ohne Skript und Pixel, Eingaben escaped.
- NEU `src/components/Portal/Kanaele/KanalAuswertung.js`: Kennzahlen, Tabellen je Kanal und Kennung, Register, Vorlagen-Generator mit Kopierknopf und Vorschau des Hinweises.
- NEU Tests: `src/lib/gruppe/herkunft.test.mjs`, `kanal.test.mjs`, `partner-register.test.mjs`, `kurzlink.test.mjs`, `verweis.test.mjs`.

**Abnahme**
- (a) Bestanden. Gruppe und Partner werden erkannt; KI-Assistent hat Vorrang, die Reihenfolge ist im Test festgehalten. Die bestehenden Tests in `ereignis.test.mjs` sind grün.
- (b) Bestanden. Unbekannte Kennungen und Entwürfe werden im Produktionsmodus verworfen (Test, auch über alle Register-Einträge).
- (c) Bestanden.
  - Test mit `//evil.com`, `https://evil.com`, Backslash, Tab, `javascript:`, `__proto__` und `/api/...`: alle Ziele bleiben intern, und es gibt kein `Set-Cookie`.
  - Gegen den Dev-Server per curl: Antwort 302 mit `location: /dachflaeche-verpachten?utm_source=beispiel-installateur-de&utm_medium=partner`, ohne Cookie.
  - Ein Angriffs-Aufruf landet auf `/`.
- (d) Bestanden, aber nur über eine temporäre Vorschauseite (`src/app/grp-vorschau-temp`), die inzwischen wieder gelöscht ist.
  - check.mjs bei 1440 und 390: OK, kein Überlauf, keine Konsolenfehler.
  - axe auf dieser Seite: 0 Verstöße bei 1440 und 390.
  - Bilder liegen unter `C:/Users/SALEAD~1/AppData/Local/Temp/claude/c--Users-SALEADMIN-Downloads-Oekoinvest-Web/3140c08a-2721-4ee9-a47f-9fce6660cd23/scratchpad/welle2/grp/`, die Backoffice-Ansicht unter `admin/`.
- (e) Bestanden. Der Test prüft, dass nur Entwürfe mit TODO im Register stehen, ohne Prozent-, Euro- oder Provisionsangaben und ohne echte Namen.
- (f) Bestanden. verify grün; die 6 axe-Verstöße auf den Kernseiten stehen bereits in der Baseline, und die E2E-Tests laufen 7 von 7. Das Claim-Lint meldet nichts mehr in meinen Dateien, nachdem ich einen TODO-Kommentar umformuliert habe.

**Abweichungen vom Plan**
- Es gibt keine Admin-Seite und keinen festen Einbau des Hinweises, weil die nötigen Dateien außerhalb meines Pakets liegen. Die Sichtprüfung lief deshalb über die temporäre Seite.
- Der Text in `herkunftBereinigen`: Wer `utm_medium=partner` oder `gruppe` ohne gültige Kennung schickt, wird als „Kampagne“ gezählt. Ein echter Verweis von oekovolt.de/.com bleibt „Gruppe“, auch ohne Kennung.
- Die Admin-Auswertung liest die Vorgänge im Demo-Backend einzeln (höchstens 2.000 je Zeitraum). Bietet das Backend später eine Methode `kanalRohdaten`, nutzt die Route diese automatisch.
- In `src/lib/herkunftServer.js` (nicht mein Paket) fehlen „Gruppe“ und „Partner“ in der Kanalliste. Ohne Anpassung würde Frappe den Kanal leer speichern; die vollständige Liste steht in `KANAELE` in `kanal.js`.

**Für andere Pakete**
1. B3 in `src/app/api/anfrage/route.js`: `const { kanal, partnerKennung } = herkunftBereinigen(body.herkunft)` aufrufen und mit `herkunft: { ...herkunft, kanal, partnerKennung }` speichern. Außerdem `herkunftServer.js` um die neuen Kanäle erweitern.
2. Länderrouting: `LAENDER_PRAEFIX_AKTIV` in `partner-register.js` umstellen, den Link „Mehr zum Unternehmen“ in `Offenlegung.js` je Land auflösen und `<Offenlegung land=… />` unter dem Seitenkopf der Zielseiten einbauen.
3. Die Seite `/portal/admin/kanaele` mit `<KanalAuswertung />` anlegen und in die Navigation aufnehmen.

**Offene Punkte für dich**
- Echte Gruppengesellschaften und Partner im Register (Entscheidung E9): Kennung, Art, Land, Zielseiten und Anzeigename, erst nach Abstimmung in der Gruppe bzw. mit dem Partner. Für die Schweiz erst nach der Klarstellung zur Ökovolt Schweiz AG.
- Die Rechtsabteilung prüft den Wortlaut des Hinweises und der Vorlage sowie die Bestandskundenansprache (§ 7 Abs. 3 UWG).
- Zweite Prüfperson, Reststrom-Aussage, Mindestbetrag, Postfächer je Land und Bildrechte habe ich nicht berührt.
- Der Next-Dev-Server schreibt aufgerufene Pfade selbst ins Log, also auch `/p/<kennung>`. Bitte das Request-Logging beim Hosting so einstellen, dass das nicht passiert.

Im Arbeitsverzeichnis gibt es Änderungen, die nicht von mir sind: `qa/verify.mjs`, `src/lib/fakten/`, `src/lib/invest/laender/`.

---

## Welle 2 · Paket B1: Faktenregister-Kern und Länder-Engine (Strangler, einziger Strom an markt.js)

# Welle 2, Paket B1: Faktenregister-Kern und Länder-Engine

Paket B1 ist fertig: Alle sieben Abnahmekriterien sind erfüllt, `npm run verify` ist mit allen sechs Schritten grün. Es gab keine Commits und keine neuen npm-Abhängigkeiten.

**Sofort an B3, B4 und FRI weitergeben:**
- **E2E-Schritt:** Schritt 5 in `qa/verify.mjs` nimmt jetzt alle Dateien `qa/e2e/*.e2e.mjs`. B3 und B4 können eigene E2E-Dateien dort ablegen. Das war die erste Änderung im Paket. Eine Nachricht an die anderen Pakete konnte ich nicht schicken, bitte über diesen Bericht weitergeben.
- **Vertrag:** `src/lib/fakten/schema.js` ist der festgeschriebene Vertrag für FRI und B4.

## Geänderte und neue Dateien

**Neu**
- `src/lib/fakten/`: `schema.js`, `register.js`, `index.js`, `pruefen.js`, `waehrung.js`
- `src/lib/fakten/daten/`: `de.js`, `at.js`, `ch.js`
- Leere Vorlagen für FRI in `daten/`, nur angelegt, weil sie fehlten: `termine-de/at/ch.js`, `umlagen-de/at/ch.js`, `netzentgelte-de/at/ch.js`. Alle sind in `index.js` eingebunden.
- Tests in `src/lib/fakten/`: `schema`, `register`, `waehrung`, `pruefen`, `marktFuer` (je `*.test.mjs`)
- `src/lib/invest/laender/`: `marktFuer.js`, `erloesmodelle.js`, `regionen.js`, `sperre.js`
- `src/components/Fakten/`: `FaktWert.js`, `StandHinweis.js`, `Quellenzeile.js`
- `qa/fakten-check.mjs` und `test/rechner/laender.test.mjs`

**Geändert**
- `src/lib/invest/markt.js` (jetzt Fassade)
- die vier Bericht-Rechner `pacht.js`, `pachtangebot.js`, `flaechencheck.js`, `kommune.js`
- `src/lib/rechner/annahmen.js`
- `qa/verify.mjs`
- `test/charakterisierung/faelle.mjs` und die Snapshots `pacht.json`, `kommune.json`, `pachtangebot.json`

## Abnahme

- **(a) Bestanden.** `npm run test:charakterisierung` zeigt 195 von 195 grün. Die Fassade wurde zuerst umgestellt, danach jeder Rechner einzeln, und nach jedem Schritt liefen die 191 bisherigen Fälle ohne Abweichung. Die einzige Snapshot-Änderung: vier neue Fälle (`pacht/land_de_explizit`, `pacht/land_ch_explizit`, `kommune/land_at_explizit`, `pachtangebot/land_ch_explizit`). Sie prüfen den neuen Parameter `land`. Laut Diff kamen nur Zeilen dazu, gelöscht wurde keine, kein bisheriger Wert hat sich geändert.
- **(b) Bestanden.** Neue node:test-Tests decken Vertrag, Register, `marktFuer` für DE, AT und CH, CHF-Format und Ablauf (`istAbgelaufen`) ab. Sie laufen in `npm test` mit (611 von 611 grün) und in Schritt 1 von verify.
- **(c) Bestanden.** `qa/fakten-check.mjs` findet 100 Fakten, keiner ohne Quelle oder Abrufdatum.
  - Mit `--testfakt-abgelaufen` meldet die Prüfung ROT und endet mit Fehlercode 1. Ein Test bildet genau das nach.
  - Die Prüfung ist als Schritt 6 in verify eingebaut. Sie läuft vor den Browser-Schritten, die Nummern 4 und 5 bleiben gleich.
- **(d) Bestanden.**
  - `land: "DE"` liefert dasselbe Ergebnis wie bisher, belegt durch Snapshot und Test.
  - `marktFuer("CH")` liefert CHF und Rappen, `marktFuer("AT")` Euro.
  - Alle vier Rechner zeigen für AT und CH die Länder-Sperre sichtbar an, `flaechencheck` gibt dort keine Pachtwerte aus.
  - Ein Test sichert, dass AT und CH nur eigene oder länderübergreifende Fakten nutzen und nie deutsche Geldwerte.
- **(e) Bestanden für den DE-Standardfall.** Für Süddeutschland mit 10 ha (Seiten Bayern und Baden-Württemberg) weicht der Ertrag um 2,7 % ab, die Pacht über 30 Jahre um 0 %. Bei den übrigen deutschen Seiten liegt die Ertragsabweichung über 3 % (siehe offene Punkte).
- **(f) Bestanden.** Es gibt keine Importe aus `fakten/daten` außerhalb von `src/lib/fakten`, ein Test prüft das. Die einzige Fundstelle beim Suchen ist ein Kommentar in `markt.js`.
- **(g) Bestanden.** `npm run verify` ist GRÜN (4 min 30 s), eslint meldet auf allen geänderten Dateien weder Fehler noch Warnungen.
- **Komponenten optisch geprüft** bei 1440 und 390 px, ohne Konsolenfehler und ohne seitliches Überlaufen. Zwei Fehler habe ich dabei behoben: abgeschnittene Hinweise und Zeilenumbruch im Fließtext. Die Vorschauseite dafür war nur vorübergehend und ist wieder gelöscht.

## Abweichungen vom Plan

1. **Länder-Sperre verschoben.** `LAENDER_SPERRE`, `laenderSperre` und `landVonRegion` liegen jetzt in `src/lib/invest/laender/sperre.js`, damit sich die Module nicht gegenseitig importieren. `markt.js` gibt sie unverändert weiter.
2. **Gesperrte Länder rechnen mit deutscher Basis.** Die Funktion `rechenbasisFuer()` lässt AT und CH wie bisher mit deutschen Werten rechnen und setzt die Sperre. So bleiben die Snapshots stabil. Die Sperre wird nicht automatisch aufgehoben, das bleibt eine bewusste Entscheidung mit zweiter Prüfperson. `marktFuer(land).freigabe` zeigt, was dafür noch fehlt.
3. **Annahmenbuch statt neuer Ergebnisfelder.** Damit B4 die Grundlagen zeigen kann, gibt es je Rechner eine Liste der genutzten Fakten und eine Abfrage dazu, etwa `annahmenPacht(eingabe)`. Die Rechner-Ergebnisse selbst habe ich nicht erweitert, sonst hätten sich alle Snapshots geändert.
4. **Kleine Zusätze.**
   - `AGRI.eagAbschlagAt` kommt jetzt aus dem Register.
   - Die 20 Jahre EEG-Förderdauer kommen in `pacht.js` und `pachtangebot.js` aus dem Erlösmodell.
   - FINANZIERUNG, AGRI, CARPORT, SPEICHER, STROM und die übrigen Konstanten bleiben vorerst in `markt.js` und kommen später dran.
5. **Wann ein Wert als „geprüft“ gilt.** Den Status „geprüft“ haben nur 21 Werte, die in Welle 1 nachweislich am Original nachgeprüft wurden. Alles andere steht auf „zu prüfen“, 79 Werte, darunter alle eigenen Einschätzungen.

## Offene Punkte für den Inhaber

- **Zweite Prüfperson:** Sie ist nicht benannt. In jedem Fakt steht beim Prüfer „TODO-E6“.
- **Prüfstau:** 79 Werte stehen auf „zu prüfen“. Bei acht Quellen fehlt die URL, unter anderem bei der Destatis-Pressemitteilung Nr. 309 (Hebesatz), der AfA-Tabelle und den Pronovo- und BFE-Angaben.
- **Gate wird am 1. Januar 2027 ROT:** Die beiden CH-Höchstgebote der Auktionsrunde Q4/2026 laufen am 31.12.2026 ab. Das ist so gewollt. FRI oder das Team Schweiz muss sie vorher fortschreiben.
- **AT und CH:** Diese Werte fehlen und wurden bewusst nicht erfunden.
  - Pachtwert in CHF.
  - Förderdauer der EAG-Marktprämie und der GMP.
  - Zuschlagswerte nach EAG.
  - Kosten in AT und CH.

  Solange diese Werte fehlen, bleibt die Sperre aktiv.
- **Ertrag auf den Regionsseiten:** Bei 11 von 16 deutschen Regionsseiten weicht der Ertrag um mehr als 3 % vom Rechner ab, maximal 11 % in Rheinland-Pfalz. Grund: Die Seiten zeigen den reinen PVGIS-Wert je Bundesland, der Rechner rechnet mit einem bewussten Abschlag je Großregion. Die Regionsseiten gehören nicht zu meinem Paket. Mein Vorschlag: Die Seiten übernehmen denselben Abschlag, oder es kommen Ertragswerte je Bundesland ins Register.
- **Doppelte Werte:** Der Ratgeber `freiflaechen-pv-schweiz.js` hält die HEIV- und GMP-Werte noch selbst und doppelt zum Register. Er sollte später auf das Register umgestellt werden.
- **Nicht von mir entschieden:** Reststrom-Aussage, Mindestbetrag, Postfächer je Land und Bildrechte.

Die Screenshots liegen in `C:/Users/SALEAD~1/AppData/Local/Temp/claude/c--Users-SALEADMIN-Downloads-Oekoinvest-Web/3140c08a-2721-4ee9-a47f-9fce6660cd23/scratchpad/welle2/b1/`.

---

## Welle 2 · Paket FRI: Fristen 2026, Umlagen 2027 und Netzentgelte 2027 als Registerdaten

# Welle 2, Paket FRI: Fristen 2026, Umlagen 2027 und Netzentgelte 2027 im Register

Paket FRI ist fertig, aber ab dem **16.10.2026 meldet `npm run verify` ROT**. Grund: Die neuen Termine laufen nacheinander ab, und ein abgelaufener Klasse-A-Wert macht die Faktenprüfung rot. Wer die Daten pflegt, muss abgelaufene Termine im Register löschen oder fortschreiben (Details unten). Alle Abnahmekriterien a bis f sind erfüllt; `npm run verify` war heute in allen sechs Schritten GRÜN. Es gab keine Commits und keine neuen npm-Abhängigkeiten.

**Werte 2027:** Die Umlagen 2027 sind noch nicht veröffentlicht, die Übertragungsnetzbetreiber müssen sie bis zum 25.10.2026 bekanntgeben. Deshalb steht dort überall „noch nicht veröffentlicht“, ohne Schätzwert.

## Geänderte und neue Dateien

**Neu**
- `C:/Users/SALEADMIN/Downloads/Oekoinvest-Web/src/lib/fakten/daten/termine-2026.js`: 5 Termine: EAG-Call AT, Gebotstermin EAG-Marktprämie 10.12., Pronovo Runde 4, CH-Marktzugang 31.10., EEG-Gebotstermin 01.12.
- `C:/Users/SALEADMIN/Downloads/Oekoinvest-Web/src/lib/fakten/daten/umlagen-2027.js`: 3 Umlagen mit Wert null und der Termin 25.10.
- `C:/Users/SALEADMIN/Downloads/Oekoinvest-Web/src/lib/fakten/daten/netzentgelte-2027.js`: Aufbau der Netzentgelte DE, Termine 15.10. (vorläufig) und „endgültig“, AT SNE 2027 als offener Wert mit erwartetem Termin, CH ElCom 2027 als Verweis.
- `C:/Users/SALEADMIN/Downloads/Oekoinvest-Web/src/lib/fakten/daten/termine.test.mjs`: 18 Tests.
- `C:/Users/SALEADMIN/Downloads/Oekoinvest-Web/src/components/Fakten/FristenListe.js`
- `C:/Users/SALEADMIN/Downloads/Oekoinvest-Web/src/components/Fakten/BestandteileTabelle.js`
- `C:/Users/SALEADMIN/Downloads/Oekoinvest-Web/src/app/marktdaten/fristen/page.js`: noindex, Kennzeichnung „Entwurf · Prüfung Rechtsabteilung“, wird stündlich neu erzeugt.

**Geändert**
- `src/data/regionen/fristen.js` ist jetzt eine Fassade über das Register. Dazu kommt ein neuer Export `MARKTZUGANG_CH`.
- `src/data/regionen/fristen.test.mjs`: Vergleichstests sind hinzugekommen, die alten Tests sind unverändert.
- Die neun leeren Vorlagen von B1 (`termine-*`, `umlagen-*` und `netzentgelte-*` je für de, at, ch) filtern jetzt die neuen Dateien nach Land. Diese Dateien stehen nicht in meiner Dateiliste, B1 hat sie aber ausdrücklich FRI zugeordnet. `index.js` habe ich nicht angefasst.

## Abnahme

- **(a) Bestanden.** Alle 15 neuen Einträge bestehen `faktValidieren()` ohne Fehler. Kein Eintrag ist ohne Quelle (https) und Abrufdatum. Alle Termine haben Klasse A und ein `gueltigBis`. Die Faktenprüfung findet 115 Fakten, davon 0 abgelaufene Klasse-A-Werte.
- **(b) Bestanden.** Die alten Tests in `fristen.test.mjs` sind grün. `EAG_CALL_AT` ist identisch zum Stand vorher (gleiche Inhalte). `fristenAT` und `fristenCH` liefern stündlich vom 01.10. bis 03.11.2026 und genau an den Ablaufgrenzen dasselbe wie vorher.
- **(c) Bestanden.** Ein Test zeigt: Ein Eintrag mit `gueltigBis` in der Vergangenheit erscheint in FristenListe nicht. Mit dem echten Register erscheint der EAG-Call am 22.10. noch und am 23.10. nicht mehr.
- **(d) Bestanden.** Jeder Umlagen- und Netzentgeltwert hat eine Primärquelle (keine eigene, keine Sekundärquelle). Offene Werte haben `wert: null`, `status: zu_pruefen` und den Hinweis „Veröffentlichung erwartet bis TT.MM.JJJJ“. Für die Umlagen ist das der 25.10.2026 nach § 11 EnFG. Ein Test sichert, dass die Tabelle keinen ct/kWh-Wert zeigt.
- **(e) Bestanden.** `check.mjs` meldet bei 1440 und 390 px Status 200, keine Konsolenfehler und kein seitliches Überlaufen. Die Ganzseitenaufnahmen habe ich angesehen. Claim-Lint: vorher und nachher je 78 Fehler und 274 Hinweise, auf den neuen Dateien 0 Funde.
- **(f) Bestanden.** `npm run verify` ist GRÜN (5 min 56 s), eslint meldet auf allen 18 geänderten Dateien keine Fehler.

## Abweichungen vom Plan

1. **Komponenten ohne JSX.** FristenListe und BestandteileTabelle sind wie `JsonLd.js` mit `createElement` gebaut, damit node:test sie direkt laden kann. Stand-Etikett und Quellenzeile sind deshalb in `FristenListe.js` nachgebaut, mit derselben Optik und denselben Texten wie StandHinweis und Quellenzeile.
2. **Titel und Text der Fristen stehen im Register.** Sie liegen im Wert des Termins (`wert.titel`, `wert.text`, `wert.endeZeitpunkt`), damit die Fassade sie 1:1 ausgeben kann. Der Vertrag in `schema.js` bleibt unverändert.
3. **Fehlender Registereintrag.** Fehlt ein Eintrag im Register, verhält sich die Fassade wie nach Ablauf: `ende` ist dann 0, und die drei Seiten mit `Date.now() < EAG_CALL_AT.ende` zeigen den Kasten nicht mehr.
4. **Prüfstatus „geprüft“** gilt nur dort, wo ich oder Welle 0 den Wortlaut am Original nachgelesen haben: § 28a EEG, § 11 EnFG, § 20 EnWG, § 17 StromNEV, EAG-Call, Pronovo, Art. 11 StromVV. Der Prüfer steht überall als „· Zweitprüfung TODO-E6“.
5. **Marktzugang CH auf /reststrom.** Der Kasten liest den Termin noch nicht aus dem Register, weil die Seite nicht zu meinem Paket gehört. `MARKTZUGANG_CH` steht dafür bereit.

## Offene Punkte für den Inhaber

- **Gate wird ROT, so gewollt nach B1:**

  | Ab | Grund | Abgelaufene Klasse-A-Werte |
  |---|---|---|
  | 16.10.2026 | Netzentgelte vorläufig | 1 |
  | 23.10.2026 | EAG-Call | 2 |
  | 01.01.2027 | alle Termine 2026 | 11 |

  Abgelaufene Termine müssen dann aus dem Register gelöscht oder fortgeschrieben werden, sonst ist `verify` rot. Alternative: B1 behandelt abgelaufene Termine (`termin.*`) in `pruefen.js` nur als Warnung. Das muss der Inhaber bzw. B1 entscheiden.
- **Nach dem 25.10.2026:** Die Werte der drei Umlagen 2027 mit Quelle eintragen. Den Status „geprüft“ erst setzen, wenn die zweite Prüfperson benannt ist (E6).
- **Noch zu prüfen:**
  - Gebotstermin EAG-Marktprämie 10.12.2026: nur über Recherche belegt, die Verordnung selbst ist nicht nachgelesen.
  - Erwarteter Termin der AT-Tarifverordnung (SNE-TV): Die E-Control nennt nur den Start der neuen Entgelte am 01.01.2027, kein amtliches Erlassdatum.
  - Endgültige Netzentgelte DE: Das Gesetz nennt keinen eigenen Stichtag.
  - Lizenz der ElCom-Daten vor jeder Nutzung von Werten prüfen.
- **Nicht von mir entschieden:** zweite Prüfperson, Reststrom-Aussage, Mindestbetrag, Postfächer je Land, Bildrechte.

Die Screenshots liegen in `C:/Users/SALEAD~1/AppData/Local/Temp/claude/c--Users-SALEADMIN-Downloads-Oekoinvest-Web/3140c08a-2721-4ee9-a47f-9fce6660cd23/scratchpad/welle2/fri/` (Ganzseiten unter `voll/`).

---

## Welle 2 · Paket B3: Lead-Kette: Einwilligungsprotokoll, getrennte Personendaten, Routing Land×Typ×Größe, SLA-Messung, Score

Paket B3 (Lead-Kette) ist umgesetzt. `npm run verify` ist grün (7 min 25 s), eslint ist sauber, keine Commits, keine neuen Abhängigkeiten. Das Claim-Lint meldet in meinen Dateien genau einen Fund: das gewollte „TODO Inhaber“ in `src/data/lead-routing.js:72`. Es erscheint nur im Backoffice, nicht auf öffentlichen Seiten.

**Wichtig vor dem Livegang:** `LEAD_PSEUDONYM_PEPPER` (mindestens 32 Zeichen) muss in der Umgebung gesetzt sein, bei Frappe als `lead_pseudonym_pepper` in der site_config. Ohne diesen Schlüssel lehnt die Produktion jede Anfrage ab (Fehler 503). Das ist Absicht: lieber ein lauter Fehler als ein schwaches Pseudonym.

## Dateien
Alle Pfade relativ zu `C:/Users/SALEADMIN/Downloads/Oekoinvest-Web/`.

**Neu**
- Logik: `src/lib/anfrage/{protokoll,routing,sla,feiertage,score}.js` und `src/data/lead-routing.js`
- Tests: `src/lib/anfrage/{protokoll,routing,sla,leadkette}.test.mjs` und `qa/e2e/lead.e2e.mjs`
- Backend: `src/lib/plattform/backend/leadkette.js` (Schnittstelle, der Vertrag für B4 steht im Dateikopf), `…/backend/demo/leadkette.js`, `…/backend/frappe/leadkette.js`
- Backoffice: `src/app/api/admin/leads/` (Liste, `sla`, `kette`, `widerruf`, `absage`, `loeschung`), die Seite `src/app/portal/admin/leads/page.js` und `src/components/Portal/Leads/{Anzeige,LeadAktionen}.js`
- Frappe: `Backend-Import/…/plattform/api/einwilligung.py` und die DocTypes `plattform_einwilligung_protokoll/`, `plattform_lead_person/`

**Geändert**
- `src/app/api/anfrage/route.js`: Herkunft wird jetzt mit `herkunftBereinigen` aus GRP bereinigt.
- `src/lib/anfrage/hinweise.js`: Zweck je Häkchen (`zweckFuer`).
- `src/lib/anfrage/laender.js`: neue Funktion `leadLand`.
- `src/lib/anfrage/zaehler.js`: Kanäle „Gruppe“ und „Partner“.
- `src/lib/anfrage/tests/anfrage.test.mjs`: ein Test dazu.
- `src/lib/plattform/backend/demo.js`: nur `anfrageAnlegen`.
- `Backend-Import/…/plattform/api/anfrage.py` und `hooks.py` (täglicher IP-Löschlauf).

## Abnahme
- **(a) bestanden:** Die Kette prüft sauber. Zehn Arten von Manipulation werden erkannt (Feld ändern, löschen, umsortieren, einfügen …). Ein Test durchsucht alle Einträge nach E-Mail-, Telefon-, IP- und Namensmustern und findet nichts. Die Prüfung hat einen echten Fehler aufgedeckt: Eine IP passte ins Feld „Textversion“. Das Muster ist jetzt enger.
- **(b) bestanden:** Die Löschung nach Art. 17 entfernt die Personenzeile. Vorgang und CRM-Kontakt werden geschwärzt, offene Einwilligungen als widerrufen eingetragen, die Kette bleibt prüfbar. IPs werden nach 30 Tagen entfernt: nach 29 Tagen ist sie noch da, nach 31 weg.
- **(c) bestanden:** Ein Werbekanal ist gesperrt ohne Häkchen und nach einem Widerruf. Er ist nur nach ausdrücklicher Einwilligung offen, beim Newsletter und Bericht erst nach Double-Opt-in. Werbe-Versand ohne Einwilligung bricht mit Fehler 403 ab.
- **(d) bestanden:** Im Matrix-Test (900 Kombinationen) und im Lead-Desk-Test hat jede Anfrage ein Land und eine zuständige Person oder steht sichtbar „ohne Zuständigkeit“ da.
- **(e) bestanden:** Die Fristen sind an echten Fällen geprüft: Ostern (DE gegen AT), die Bundesfeier in der Schweiz, Wochenenden, der österreichische Nationalfeiertag zusammen mit der Zeitumstellung, Fläche ab 20 ha am selben Tag. Median und P90 sind getestet.
- **(f) bestanden:** Der Score liefert über alle Kombinationen immer eine Klasse A, B oder C und eine Begründung.
- **(g) bestanden:** Die bestehenden Anfrage-Tests sind grün, die Telefonregel ist unverändert. Das prüft auch der E2E-Test: Rückruf ohne Telefon wird nicht gesendet.
- **(h) bestanden:** Die Python-Dateien kompilieren. Ein Vergleichslauf mit 558 Fällen zwischen Website und Frappe ergab dasselbe Ergebnis. Er umfasst Pseudonym, Ketten-Hashes, Kanal-Ampel, IP-Kürzung, Routing, Score, Fristen, Geschäftsminuten, SLA sowie Median/P90. Das Skript liegt unter `scratchpad/welle2/b3/paritaet.mjs`.
- **(i) bestanden, mit einer Einschränkung:** `qa/e2e/lead.e2e.mjs` läuft 3 von 3. `check.mjs` meldet sich nicht an, deshalb habe ich die Portalseite mit einem eigenen Skript (`~/claude-browser/b3-leads.mjs`, mit Demo-Anmeldung) bei 1440 und 390 geprüft. Ergebnis: Status 200, kein Überlauf, keine Konsolenfehler. Ein Lauf direkt nach einer Codeänderung meldete einmal einen Hydration-Hinweis, der danach nicht mehr auftrat. Ich halte ihn für ein Artefakt des Neuladens im Dev-Server. Bilder unter `scratchpad/welle2/b3/admin3/`.
- **(j) bestanden:** Personen, Vertretungen und Postfächer stehen als „TODO Inhaber“ in der Routing-Datei, ohne echte Adressen.

## Abweichungen vom Plan
- **Speicherort der Lead-Daten:** Routing, Score und SLA eines Vorgangs liegen unter `herkunft.lead`. Grund: Dieses Feld sieht der Anfragende im Portal nicht, und Frappe hat am Vorgang kein eigenes Feld dafür. Das Land steht in der Demo zusätzlich direkt am Vorgang. Empfehlung: Plattform Vorgang später um `land` und `lead` erweitern.
- **Kontaktdaten am Vorgang:** Die Kontaktdaten bleiben als Arbeitskopie am Vorgang. Die Löschung nach Art. 17 schwärzt sie dort mit. Die IP steht nicht mehr am Vorgang und auch nicht mehr im unveränderlichen Aktivitätsprotokoll. Die E-Mail-Adresse ist ebenfalls aus dem Protokolltext entfernt.
- **Datenschutz-Hinweis im Protokoll:** Der Hinweis nach Art. 6 Abs. 1 lit. b wird mit einem eigenen Zweck „anfrage“ protokolliert, weil keiner der vier Werbe-Zwecke passt.
- **Erstkontakt:** Der Erstkontakt wird beim ersten Öffnen des Lead-Desks aus dem ersten Statuswechsel oder der ersten Aktivität ermittelt und dann festgeschrieben. Ein Eingriff in die Statuswechsel war nicht nötig.
- **Kette bei Frappe:** Die Reihenfolge wird über eine Datenbank-Sperre gesichert. Die Personendaten-Tabelle hat bewusst keine Versionshistorie, damit eine Löschung keine Kopie hinterlässt.
- **Geschäftszeit:** Mo–Fr 8–17 Uhr ist eine Annahme. In der Schweiz sind Neujahr, Auffahrt und Weihnachten als „zu prüfen“ markiert, regionale Feiertage als TODO.
- **Vor-Ort-Termin:** Es gibt kein Feld dafür. Die Telefonregel greift weiter nur beim Rückruf.

## Für andere Pakete
- **Werbe-Versandstellen:** Akquise-Kampagnen, Automationen und Newsletter müssen vor dem Versand `werbekanalSicherstellen` aufrufen. Die Dateien liegen nicht in meinem Paket.
- **Angebots-Rücklauf:** `/api/angebot/[code]/anfrage` schreibt die Telefon-Einwilligung noch nicht in die Kette.
- **Herkunft:** In `src/lib/herkunftServer.js` fehlen „Gruppe“ und „Partner“. Darauf hat GRP schon hingewiesen.
- **Navigation:** Der Navigationspunkt und die Brotkrumen für `/portal/admin/leads` fehlen; dort steht derzeit „leads“ kleingeschrieben.

## Offen für dich
- Personen, Vertretungen und Postfächer je Land für die 16 Lead-Desks (E7, Postfächer je Land). Bis dahin greift das Gebiets-Routing, sonst bleibt die Anfrage ohne Zuständigkeit.
- Geschäftszeiten je Desk und die Schwellen der Größenklassen. Nur die 20 ha stammen aus dem Masterplan.
- Rechtsabteilung:
  - Nachweisfrist je Land. Arbeitswert sind 5 Jahre nach § 7a Abs. 2 UWG, für AT und CH offen.
  - Wortlaut der Absagecodes.
  - Beschreibung des Scores in der Datenschutzerklärung (Art. 22).
  - Kantonale Feiertage.
- Zweite Prüfperson, Reststrom-Aussage, Mindestbetrag und Bildrechte habe ich nicht angefasst.

Hinweis: Für die Sichtprüfung habe ich zwei Test-Anfragen an das Demo-Backend geschickt. Sie stehen in `.data/plattform.json`, es ging keine Mail raus.

---

## Welle 2 · Paket B4: Bericht-Baustein Stufe 1: HTML-Bericht mit Double-Opt-in (Pacht, Pachtangebot-Check, Flächencheck, Kommune)

# Paket B4: Abschlussbericht

Der Bericht-Baustein Stufe 1 ist fertig. `npm run verify` ist GRÜN (8 min 41 s), eslint meldet nichts. Es gibt keine Commits und keine neuen Abhängigkeiten, und die Rechenlogik ist unverändert.

## Neue Dateien
Alle Pfade relativ zu `C:/Users/SALEADMIN/Downloads/Oekoinvest-Web/`.

- **Logik in `src/lib/bericht/`:**
  - `neuRechnen.js`: Positivliste der 4 Rechner, Prüfung jedes Felds auf Typ und Bereich, Prüf-ID
  - `annahmenbuch.js`, `token.js`, `versand.js` (mit `versandErlaubt()`), `zaehler.js`
  - `anforderung.js`, `texte.js`, `dienst.js` (steuert den Ablauf)
  - Tests: `neuRechnen.test.mjs`, `versand.test.mjs`, `dienst.test.mjs`
- **API-Routen:** `src/app/api/rechner/bericht/route.js` (GET für den Status, POST zum Anfordern) und `src/app/api/rechner/bericht/bestaetigen/route.js`
- **Berichtsseite:** `src/app/bericht/[token]/page.js`
- **Komponenten in `src/components/Bericht/`:** `BerichtAnfordern.js`, `BerichtSeite.js` (enthält auch die Bestätigungs- und die Abgelaufen-Ansicht), `Annahmenbuch.js`, `BerichtAktionen.js` (Druck- und Bestätigungsknopf), `bericht-druck.css`
- **Backend-Adapter:** `src/lib/plattform/backend/bericht.js`, `…/demo/bericht.js`, `…/frappe/bericht.js`
- **Frappe:** `Backend-Import/…/plattform/api/bericht.py` und der DocType `doctype/plattform_bericht/` (json, py, `__init__`)
- **E2E-Test:** `qa/e2e/bericht.e2e.mjs`

## Geänderte Dateien
- `src/components/Rechner/ErgebnisAnfrage.js`: neue optionale Prop `bericht`
- `PachtRechner.js`, `PachtangebotCheck.js`, `KommuneRechner.js`, `FlaechenWizard.js` (dort nur der Ergebnisbereich): Der Baustein steht unter dem Ergebnis. Er bekommt genau die Eingaben, mit denen das Ergebnis im Browser gerechnet wurde.

## Abnahme
- **(a) bestanden.**
  - Ein Test zeigt, dass die Neuberechnung exakt dasselbe liefert wie die Rechnerfunktion, und zwar für alle 4 Rechner.
  - Ein mitgeschicktes `ergebnis` oder fremde Ergebnisfelder werden ignoriert bzw. mit 422 abgelehnt.
  - Andere Rechner werden mit 422 abgelehnt; das prüfen ein Unit-Test und der E2E-Test gegen die echte API.
  - Gespeichert wird nur der Token-Hash. Ein Test prüft, dass der Klartext nicht im Datensatz steht.
  - Ein abgelaufenes Token liefert 410, auch nach dem Aufräumen (es bleibt ein leerer Platzhalter-Datensatz stehen). Ein unbekanntes Token liefert 404.
- **(b) bestanden.**
  - Ohne Bestätigung entsteht kein Vorgang und kein Bericht.
  - Nach der Bestätigung gibt es genau einen Vorgang. Er trägt Typ, Land und `daten.bericht` (Rechner, Prüf-ID, Kennzahlen).
  - In der Lead-Kette steht genau ein Eintrag `doi/bericht/doi_link`, ohne Personendaten, und die Kette ist intakt.
  - Eine zweite Bestätigung ändert nichts.
  - Newsletter und Werbeanruf laufen nur über die getrennten Häkchen. Der Werbeanruf gilt nur, wenn eine Telefonnummer angegeben ist.
- **(c) bestanden.** Ein Test zeigt: `false` bei Frappe ohne Testflag und bei `SITE_ENV=production`, auch im Demo-Backend. Ohne Versanderlaubnis antwortet die API mit 503 „Berichtsversand startet mit dem Livegang.“ und nimmt keine Daten an. Die Oberfläche blendet das Formular dann aus.
- **(d) bestanden.** Eine Anfrage ohne Telefon wird angenommen; das prüfen ein Unit-Test und der E2E-Test.
- **(e) bestanden.**
  - axe meldet auf der Bestätigungsseite, der Berichtsseite und allen 4 Rechnerseiten bei 1440 und 390 px keine Verstöße. Zwei Fehler in einer Definitionsliste auf der Berichtsseite habe ich behoben.
  - Die Druckansicht ist geprüft: Navigation und Fußbereich sind ausgeblendet, Links werden ausgeschrieben, A4-PDF.
  - check.mjs zeigt für alle 4 Rechner bei 1440 und 390 px Status 200, keinen Überlauf und keine Fehler. Den Baustein selbst habe ich jeweils zugeklappt und geöffnet zusätzlich mit einem eigenen Skript aufgenommen.
- **(f) bestanden.**
  - Jede Annahme zeigt Quelle und Stand, Werte „zu prüfen“ tragen ein sichtbares Etikett „Prüfung ausstehend“.
  - Konstanten, die noch nicht im Faktenregister stehen (BAUART, AGRI, Kosten der Solarpark-Rechnung), erscheinen mit dem Hinweis „Stand laut Rechenlogik“ und der Quellenliste aus markt.js.
- **(g) bestanden.** `qa/e2e/bericht.e2e.mjs` läuft 4 von 4 grün. Er läuft nur im Demo-Modus, sonst wird er übersprungen.
- **(h) bestanden.** Die Charakterisierungstests laufen 195 von 195 grün. B4 hat keine Snapshots angefasst; die vorhandenen Snapshot-Änderungen stammen von B1.
- **(i) bestanden.** verify ist grün, eslint sauber, und das Claim-Lint meldet in meinen Dateien keine neuen Fehler.
  - Die axe-Verstöße auf /landwirte, /kontakt, /freiflaeche und /projektboerse bestanden schon vorher; sie stehen in der Baseline, an der verify misst.

## Abweichungen vom Plan
1. **Kontaktdaten bis zur Bestätigung:** Bis zur Bestätigung liegt der Kontakt als Personenzeile „ausstehend“ in `plattform_lead_person` (Demo: `leadPersonen`). Ohne Bestätigung wird sie nach 48 h gelöscht, nach der Bestätigung durch die Zeile ersetzt, die der Vorgang anlegt. `plattform_bericht` speichert nur den Verweis darauf.
2. **Ein Token für zwei Zwecke:** Vor der Bestätigung öffnet der Link die Bestätigungsseite mit einem Knopf, danach dieselbe Adresse den Bericht. Zusätzlich gibt es `GET …/bestaetigen?token=` als reine Zustandsabfrage, die nichts verändert.
3. **Zwei Ketteneinträge:** Beim Anfordern wird `einwilligung/bericht` geschrieben, bei der Bestätigung `doi/bericht`. Das verlangt die B3-Kanal-Ampel.
4. **Gesperrte Länder:** Für AT und CH lehnen Pacht, Pachtangebot-Check und Kommune den Bericht mit 422 ab, und der Baustein wird bei Sperre nicht angezeigt. Der Flächencheck für AT und CH bekommt einen Bericht ohne Pachtwerte, genau wie im Browser.
5. **Rate-Limit:** Es läuft über die bestehende Grenze „anfrage“ (10 pro Stunde in Produktion); einen eigenen Eintrag konnte ich nicht anlegen, weil `rateLimit.js` nicht zu meinem Paket gehört.
6. **Robots-Angabe:** Das Layout setzt außerhalb der Produktion schon ein eigenes `noindex`; die Berichtsseite hat zusätzlich ihr eigenes.

## Offen
- **TODO Inhaber/B0:** Absendername, Absenderadresse und Versanddomain. Bis dahin geht nichts unter dem Namen raus.
- **TODO Datenschutz/Rechtsabteilung:**
  - Fristen: 48 h für die Bestätigung, 30 Tage für den Berichtslink.
  - Alle Texte in `texte.js` sind als „Entwurf · Prüfung Rechtsabteilung“ gekennzeichnet: Hinweistext, Bestätigungstext und Haftung.
  - Dass mit der Bestätigung ein Vorgang entsteht, steht offen im Formular. Die Rechtsabteilung sollte das trotzdem prüfen.
- **TODO Betrieb:**
  - In `hooks.py` (nicht mein Paket) fehlt der tägliche Lauf `bericht.aufraeumen_taeglich`.
  - Für Frappe-Tests müssen in der site_config `bericht_testversand=1` gesetzt und `site_env` von `production` verschieden sein.
  - Gegen einen echten Frappe-Server konnte ich nicht testen; geprüft ist nur, dass die Python-Dateien kompilieren und das DocType-JSON gültig ist.
- **Zweite Prüfperson:** Laut Annahmenbuch stehen im Register derzeit 87 Werte auf „zu prüfen“.
- **Keine Entscheidung von mir:** Zweite Prüfperson, Reststrom-Aussage, Mindestbetrag, Postfächer je Land und Bildrechte habe ich nicht angefasst.
- **Testdaten im Demo-Backend:** In `.data/plattform.json` liegen einige Testberichte, Vorgänge und Mails (alle mit @example.com). Es ging keine Mail raus.

Screenshots und das Druck-PDF liegen in `C:/Users/SALEAD~1/AppData/Local/Temp/claude/c--Users-SALEADMIN-Downloads-Oekoinvest-Web/3140c08a-2721-4ee9-a47f-9fce6660cd23/scratchpad/welle2/b4/`. Die Prüfskripte sind `~/claude-browser/b4-baustein.mjs` und `~/claude-browser/b4-druck.mjs`.

---

## Welle 2 · Länderrouting

**Paket Länderrouting** ist umgesetzt. `npm run verify` ist **GRÜN** mit allen 7 Schritten (16 min 19 s, über dem 10-Minuten-Budget; das ist nur eine Warnung). eslint ist sauber. Keine Commits, keine neuen Abhängigkeiten, Rechenlogik und Snapshots sind unverändert.

Rund 770 Seitendateien liegen jetzt an neuer Stelle (per Kopieren und Löschen, kein `git mv`). Git sieht diese Verschiebungen vor dem Commit als „gelöscht + neu“.

## Dateien
Pfade relativ zu `C:/Users/SALEADMIN/Downloads/Oekoinvest-Web/`.

**Neu**
- `src/lib/land/`: `laender.js`, `zonen.js`, `stufen.js`, `pfad.js` (`pfad()`, `alternates()`, `hreflang()`, `linkFuer()`), `umzug.js`, `seite.js`, `navigation.js`, `vorschlag.js`, `sitemaps.js`, `index.js`
- Tests in `src/lib/land/`: `land`, `umzug`, `routen`, `sitemaps`, `vorschlag` (je `*.test.mjs`); dazu `test/land/alte-sitemap.json` (die eingefrorene alte Sitemap, 120 Pfade)
- Root-Layouts: `src/app/(stamm)/layout.js` (lang „de“), `src/app/(en)/layout.js` (lang „en“), `src/app/(laender)/[land]/layout.js` (de-DE, de-AT, de-CH), dazu `src/app/global-not-found.js` und `src/components/Wurzel/{Wurzel,NichtGefundenSeite}.js`
- Neue Seiten:
  - Einstieg `src/app/(laender)/[land]/page.js`
  - `marktzugang-check/page.js` und `parzellen-vorpruefung/page.js` (beide „in Vorbereitung“)
  - `not-found.js` je Zone
- `src/app/api/land/route.js`; `src/components/Land/{useLand,Laenderwahl,LaenderHinweis,LandEinstieg,InVorbereitung}.js`
- `scripts/codemod-links.mjs`, `qa/e2e/land.e2e.mjs`, `qa/link-pruefung.mjs`

**Verschoben**
- Alle Seiten der Länderzonen liegen unter `src/app/(laender)/[land]/…`.
- Die Stamm-Seiten, Portal, Login usw. liegen unter `src/app/(stamm)/…`.
- Der Ratgeber liegt jetzt unter `(stamm)/wissen/ratgeber`, die englischen Seiten unter `(en)/en`.

**Geändert**
- Links in 176 Dateien per Codemod: 787 Stellen laufen jetzt über `pfad()`, 204 Ratgeber-Links zeigen auf `/wissen/ratgeber`, 421 Pfade im Fließtext sind umgeschrieben, auch in `public/llms.txt`.
- Infrastruktur: `next.config.mjs` (`redirects()` und globale 404), `src/app/sitemap.js` und `src/app/robots.js`, `src/lib/indexsteuerung.js` samt Test, `src/data/site.js` (`LAENDER_ANGABEN`).
- Navigation und Rahmen: Navbar, Footer, LayoutWrapper.
- Seiten mit Länderfassung: die Seiten der Länderzonen (Flächencheck, Regionen, Energiegemeinschaften); dazu `Flaeche/Check/Abschnitte.js`, `FlaechenWizard.js` und `LaenderTabs.js` (Startland, Kontrastfehler behoben).
- Formulare und Bericht: `AnfrageMitDaten.js`, `AnfrageFormular.js`, `BerichtAnfordern.js`.
- GRP: `partner-register.js` mit Tests, `Offenlegung.js`, `p/[kennung]/route.js`.
- Datenschutz-Entwurf: Abschnitt zum Cookie „land“, gekennzeichnet „Prüfung Rechtsabteilung“.
- QA: axe-Seitenliste und Baseline, die übrigen E2E-Tests, Claim-Lint-Pfade, `qa/verify.mjs` (neuer Schritt 7), `eslint.config.mjs`.
- Zwei Plattform-Testskripte (`scripts/plattform-test-eg-abrechnung.mjs`, `plattform-test-eg-gruendung.mjs`) zeigen auf den neuen Portalpfad.
- Backend: Links in `gemeinde.py` und `eg_portal_kern.py`; `onboarding_pfade.json` neu erzeugt.
- `src/components/Seo/HtmlSprache.js` ist gelöscht, weil die Root-Layouts `lang` jetzt serverseitig setzen.

## Abnahme
- **(a) bestanden.**
  - Getestet sind `pfad()` und `alternates()` für alle Seiten in allen drei Ländern.
  - hreflang ist wechselseitig: Jede Alternative liefert dieselbe Tabelle zurück, inklusive x-default.
  - Stamm und präfixlose Bereiche bekommen in keinem Land ein Präfix.
  - Die Stammliste wird direkt gegen den Masterplan-Text geprüft.
- **(b) bestanden.** Alle 120 alten Pfade der Sitemap haben genau eine 308-Weiterleitung oder bleiben im Stamm. Es gibt keine Ketten und keine Schleifen, und `next.config` ist eingebunden. Im E2E-Test liefern alle Quellen 308 auf ihr Ziel, und das Ziel antwortet mit 200.
- **(c) bestanden.**
  - Statisch: Jeder Eintrag in `stufen.js` hat seine Route und prüft seinen eigenen Schlüssel (`landDerSeite`, `landMetadata`).
  - Im E2E-Test liefern nicht freigegebene AT- und CH-Seiten 404; „in Vorbereitung“ liefert 200 mit noindex.
  - Dass /de vollständig ist, belegen der statische Routentest und die Linkprüfung: 124 Sitemap-Seiten, 135 interne Linkziele, 0 Fehler, 0 Weiterleitungen.
- **(d) bestanden.**
  - Geo- und Sprach-Header führen nie zu einer Weiterleitung, es gibt kein `Vary` darauf, und die Antwort ist `no-store`.
  - Ohne Klick wird kein Cookie gesetzt; Schließen per Esc setzt auch keins.
  - Das Cookie „land“ entsteht erst nach einem Klick im Banner oder im Länderwechsler (E2E bei 1440 und 390).
- **(e) bestanden.** Die Codemod-Prüfung meldet 0 harte Links auf alte Pfade; sie läuft jetzt als Gate in verify (Schritt 7). Die 6 Stellen, die der Codemod nicht automatisch lösen konnte, sind von Hand gelöst.
- **(f) bestanden.**
  - Es gibt vier Sitemaps: `/sitemap/{stamm,de,at,ch}.xml`; robots.txt verweist auf alle.
  - In den Länder-Sitemaps stehen nur indexierbare, freigegebene Seiten mit hreflang.
  - `/de/marktdaten/fristen` und Seiten „in Vorbereitung“ fehlen. Die CH-Sitemap enthält nur `/ch`.
- **(g) bestanden.**
  - check.mjs bei 1440 und 390 für /, /de, /at, /ch, die CH-Seiten in Vorbereitung, die AT-Seiten und die 404: Status stimmt, kein Überlauf, keine Konsolenfehler.
  - Ein /ch-Lauf brach einmal ab, weil der Dev-Server neu startete; der Wiederholungslauf war OK.
  - axe: 0 Verstöße auf allen neuen Seiten bei beiden Breiten. Der Kontrastfehler in den Länder-Tabs der Energiegemeinschaften bestand schon vorher und ist behoben.
  - Bilder liegen unter `scratchpad/welle2/land/`; Banner, Mega-Menü und Fußbereich unter `banner/`.
- **(h) bestanden.**
  - Charakterisierung 195 von 195, `npm test` 712 von 712, verify GRÜN, eslint sauber.
  - Claim-Lint: 77 Fehler, also nicht mehr als vorher (78). Auf den neuen Seiten gibt es nur Hinweise, keinen Fehler.
- **(i) offen, wie vorgesehen.** Der Crawl-Diff gegen einen Produktions-Build ist ein Punkt für Staging. Ersatz auf diesem Rechner: `qa/link-pruefung.mjs`.

## Abweichungen vom Plan
1. **Ratgeber im Stamm.** Der Ratgeber zieht nach `/wissen/ratgeber` statt in die Länderzone, weil `/wissen` zur geschlossenen Stammliste gehört und die Artikel aller Länder sonst unter /de lägen.
2. **Ohne Präfix ergänzt.** `/registrieren`, `/passwort-vergessen`, `/angebot`, `/termin`, `/design`, `/barrierefreiheit`, `/nutzungsbedingungen` und `/bedingungen` stehen in `OHNE_PRAEFIX_ERGAENZT`, jeweils mit Begründung. Die Einordnung muss bestätigt werden.
3. **Energiegemeinschaften-Rechner und -Software nur in /at**, weil sie österreichischen Inhalt haben. /de verlinkt dorthin mit „(gilt für Österreich)“.
4. **Keine eigenen AT-Fassungen von DE-Seiten.** Flächencheck, Regionen-Übersicht und Energiegemeinschaften haben eigene AT-Fassungen: andere Reihenfolge und Texte, ohne Pachtwerte. Die übrigen Seiten gibt es nur für DE.
5. **Formulare:** Das Land der Route belegt die Länderwahl vor und geht als `daten.land` mit. Besucher können das Land weiter wählen. So kommen AT- und CH-Anfragen auf Seiten, die nur für DE gelten, weiter durch (Regel aus Welle 1).
6. **Länderhinweis:** Er erscheint erst nach der Entscheidung im Cookie-Banner, und nur auf `/` und in den Länderzonen. Schließen merkt sich nur die Browsersitzung (sessionStorage), es entsteht kein Cookie.
7. **eslint:** Die Regel `no-html-link-for-pages` ist abgeschaltet. Mit dem dynamischen Segment `[land]` meldet sie jeden Pfad als Seite, auch Datei-Downloads. Die Begründung steht in `eslint.config.mjs`.
8. **Länderwahl in der GRP-Kurzlink-Logik ist aktiv.** „start“ führt auf den Einstieg des Landes, zum Beispiel `/at`. Die GRP-Tests habe ich entsprechend angepasst.
9. **Die Laufzeitprüfung in E2E (c) nimmt Stichproben,** weil der Dev-Server bei vollem Lauf neu startete. Die Vollständigkeit belegen der statische Routentest und die Linkprüfung.

## Offene Punkte für dich
- **E6:** Der Fachfreigabe-Vermerk für AT und CH steht auf „Prüfer TODO-E6“. Die AT-Seiten sind von Welle 1 überarbeitet, eine Zweitprüfung fehlt.
- **Postfächer je Land** stehen in `site.js` als `LAENDER_ANGABEN.*.postfach = null` (TODO). Reststrom-Aussage, Mindestbetrag und Bildrechte habe ich nicht angefasst.
- **Rechtsabteilung:**
  - Cookie „land“: Laufzeit 12 Monate und Rechtsgrundlage, steht als Entwurf im Datenschutz-Text.
  - Einordnung der Rechtstexte ohne Präfix: Stamm oder je Land?
- **CH:** Inhalte für Marktzugang-Check und Parzellen-Vorprüfung fehlen. Die CH-Regionsseite ist offline, die alte URL leitet auf `/ch` um.
- **Staging:**
  - Crawl-Diff gegen einen Produktions-Build.
  - Weiterleitung mit Schrägstrich am Ende (`/rechner/pacht/`): Hier entstehen zwei Hops.
  - Wechsel zwischen den Root-Layouts lädt die Seite vollständig neu; das ist gewollt.
- **Nicht von mir erledigt:** In `src/lib/herkunftServer.js` fehlen weiterhin die Kanäle „Gruppe“ und „Partner“ (Hinweis von GRP und B3).
- **verify-Dauer:** über 10 Minuten. Der Dev-Server startete unter Last mehrfach neu; die HTTP-Prüfungen warten das jetzt ab.