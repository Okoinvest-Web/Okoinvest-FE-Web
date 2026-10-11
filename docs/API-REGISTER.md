# API-Register (automatisch erzeugt)

**Nicht von Hand bearbeiten.** Erzeugt mit `node scripts/api-register.mjs`; Aktualität sichert
`src/lib/plattform/api-vertrag.test.mjs`. Vertrag und Semantik: [`docs/API.md`](./API.md) und die dort
verlinkten Fachdokumente – dieses Register ist die vollständige Routen- und Methodenliste dazu.

## HTTP-Routen der Website (`src/app/api/**`)

| Route | Verben | Beschreibung (erste Kommentarzeile der route.js) |
|---|---|---|
| `/api/admin/akquise/[id]` | PATCH | { prioritaet?: "A"·"B"·"C"·"" (leer = automatisch), besonderheiten?: [], netz? } |
| `/api/admin/akquise/gebiete` | GET, PUT | Gebietszuordnung (PLZ-Bereiche / Bundesland / Land → Mitarbeiter) |
| `/api/admin/akquise` | GET, POST | Akquise-Pipeline Flächen (Score, Priorität, SLA, Gebiet) |
| `/api/admin/aktivitaeten` | GET | Aktivitätsprotokoll (nur admin), optional je Objekt(en) |
| `/api/admin/anbieter/[projektId]` | POST | Backoffice (Bereich „projekte“, schreiben): { aktion: pruefpunkt_anlegen {bereich,text,pflicht,fristTage} · |
| `/api/admin/anbieter/fristen` | POST | Erinnerung an überfällige Rückfragen (Frappe: täglicher Scheduler anbieter.frist_lauf) |
| `/api/admin/anlagen/[id]/eintraege` | POST, DELETE | { art: komponente·messpunkt·wartung·vertrag·monatswert, id?, daten } |
| `/api/admin/anlagen/[id]/geraete` | POST | { bezeichnung } → neuer MQTT-Gerätezugang. |
| `/api/admin/anlagen/[id]` | PATCH | Stammdaten ändern (Teilmenge der Felder wie beim Anlegen, inkl. kundeId/organisationId) |
| `/api/admin/anlagen/betrieb/anlage/[id]` | GET, POST | Betriebsführung einer Anlage inkl. Kennzahlen (PR, Ist/Soll, Verfügbarkeit) |
| `/api/admin/anlagen/betrieb/auftraege/[id]` | GET, POST | Auftragsschreiben als PDF (an den Dienstleister) |
| `/api/admin/anlagen/betrieb/auftraege` | POST | Serviceauftrag anlegen |
| `/api/admin/anlagen/betrieb/bericht` | GET | Monats- bzw. Jahresbericht der Anlage (PDF) |
| `/api/admin/anlagen/betrieb/ersatzteile/[id]` | POST | { bewegung: zugang·entnahme·korrektur, menge, anlageId?, stoerungId?, bemerkung? } |
| `/api/admin/anlagen/betrieb/ersatzteile` | POST | Ersatzteil anlegen |
| `/api/admin/anlagen/betrieb/protokolle/[id]` | GET | Prüfprotokoll als PDF |
| `/api/admin/anlagen/betrieb` | GET, POST | Übersicht der Betriebsführung (Fristen, SLA, Aufträge, Versicherungen, Lager) |
| `/api/admin/anlagen/betrieb/stoerung/[id]` | GET, POST | Störung als Ticket (SLA, Ursache, Ertragsausfall, Aufträge, Versicherung) |
| `/api/admin/anlagen/betrieb/versicherungen/[id]` | POST | { status: gemeldet·in_pruefung·reguliert·abgelehnt·zurueckgezogen, gemeldetAm?, schadennummer?, erstattetEur?, grund? } |
| `/api/admin/anlagen/betrieb/versicherungen` | POST | Versicherungsfall anlegen |
| `/api/admin/anlagen/geraete/[gid]` | GET, POST | Status des Gerätezugangs („Warte auf erste Nachricht …“ → verbunden), ohne Passwort/Hash |
| `/api/admin/anlagen/kunden` | GET | Auswahllisten für die Zuordnung (Kundenkonten „unternehmen“, Organisationen, Betrieb) |
| `/api/admin/anlagen` | GET, POST | Störungs-Leitstand (offene Störungen nach Priorität + Kennzahlen); Bereich „anlagen“ lesen |
| `/api/admin/anlagen/stoerungen` | POST | { anlageId, schwere, titel, text } manuell erfasste Störung (Betrieb, schreiben) |
| `/api/admin/aufgaben/[id]` | PATCH | { status?: offen·erledigt, titel?, beschreibung?, faelligAm?, zustaendigId? } (nur admin) |
| `/api/admin/aufgaben` | GET, POST | Aufgaben & Wiedervorlagen (nur admin) |
| `/api/admin/automationen/[id]` | PATCH, DELETE | Regel ändern (gleiches Format wie POST) |
| `/api/admin/automationen/fristen` | POST | Fristen jetzt prüfen (Regeln „Frist überschritten“) |
| `/api/admin/automationen` | GET, POST | Regeln, Ausführungsprotokoll, Vorlagen, Konten (prüft dabei fällige Fristen) |
| `/api/admin/automationen/tags` | POST | Tag an einem Objekt setzen/entfernen { art, id, tag, an } |
| `/api/admin/automationen/testlauf` | POST | Was würde passieren? { regelId · regel, bezugArt?, bezugId?, score?, kategorie? } |
| `/api/admin/berichte/csv` | GET | Bericht als CSV (Excel-DE), Abruf protokolliert |
| `/api/admin/berichte/pdf` | GET | Monatsbericht als PDF (mit Vergleich zum Vormonat), Abruf protokolliert |
| `/api/admin/berichte` | GET | Berichte & Analysen (Trichter, Quellen, Pipeline, Provision, Durchlauf, Team) |
| `/api/admin/bieter/[id]` | POST | { aktion, … }: frist { frist } · beenden · naechsteRunde { teilnehmer[], frist, art? } · |
| `/api/admin/bieter` | GET, POST | alle Bieterverfahren (Übersicht) |
| `/api/admin/bonitaet/[id]` | GET, POST | Auskunft mit Ergebnis (Einsicht wird protokolliert) |
| `/api/admin/bonitaet/einstellungen` | PUT | Pflicht vor LOI/Gebot: { geltung: alle·firmen·pilot·aus·null, gueltigTage, rotSperrt, |
| `/api/admin/bonitaet` | GET, POST | Auskünfte, offene LOI-Voraussetzungen, Einstellungen (nur Leitung/Transaktion/Compliance) |
| `/api/admin/bonitaet/status` | GET | nur Pflicht/erfüllt (OHNE Ergebnis) für die NDA-&-LOI-Übersicht |
| `/api/admin/closing/[id]/aktion` | POST | { aktion, … }: |
| `/api/admin/closing/[id]` | GET, PATCH | Closing-Raum (Backoffice-Sicht inkl. Prüfungen „Signing/Closing möglich?“) |
| `/api/admin/closing/fristen` | GET | überfällige Closing Conditions aller offenen Deals (Frappe: täglicher Scheduler mit Erinnerung) |
| `/api/admin/closing` | GET, POST | Closing-Räume, Kandidaten (Zuschlag/LOI), Kennzahlen |
| `/api/admin/compliance/[id]` | GET, POST | Fall mit Unterlagen, Prüfliste, Abgleich, Verlauf, Zugriffsprotokoll (nur Unterrolle Compliance) |
| `/api/admin/compliance/[id]/video` | GET, POST | Videoidentifizierung protokollieren (nur Unterrolle Compliance, nicht der eigene Fall): |
| `/api/admin/compliance/datenschutz/[id]/export` | GET | Datenauskunft (Art. 15/20) des verknüpften Kontos als JSON (Compliance) |
| `/api/admin/compliance/datenschutz/[id]` | POST | { aktion: identitaet_anfordern·identitaet_bestaetigen·verlaengern·erledigen·ablehnen·konto_verknuepfen·anonymisieren, … } |
| `/api/admin/compliance/datenschutz` | GET, POST | Betroffenenanfragen (Compliance/Leitung lesen) |
| `/api/admin/compliance/dokumente/[id]` | GET | Unterlage (entschlüsselt) für die Compliance; jeder Zugriff im Protokoll (Hash-Kette) |
| `/api/admin/compliance/einstellungen` | GET, PUT | Freigabe-Sperren je Schritt, Geltung, Vier-Augen, Schwelle, Hochrisikoländer |
| `/api/admin/compliance/freigabe` | POST | { schritt, kontoId, organisationId?, flaecheId? } → { ok, aktiv, gruende, hinweis } |
| `/api/admin/compliance/fristen` | POST | Fristen-Lauf (Frappe: täglicher Scheduler): Ausweis-Ablauf, Wiederholungsprüfung, |
| `/api/admin/compliance` | GET | Warteschlange + Kennzahlen (Bereich compliance ≥ lesen) |
| `/api/admin/compliance/sanktionen` | GET, POST | Stand der lokal gespeicherten Sanktionsliste (Quelle, Stand, Anzahl) |
| `/api/admin/compliance/sla` | GET | Bearbeitungsziel der KYC-Warteschlange (Werktage, Ampel je Fall) |
| `/api/admin/compliance/verdacht/[id]` | POST | { aktion: pruefen·meldung_vorbereiten·gemeldet·keine_meldung·abschliessen·notiz, … } – kein Versand an die Meldestelle |
| `/api/admin/compliance/verdacht` | GET, POST | interne Verdachtsfälle (NUR Unterrolle Compliance) |
| `/api/admin/compliance/vvt` | GET | Verzeichnis der Verarbeitungstätigkeiten (Entwurf, Art. 30 DSGVO) |
| `/api/admin/crm/aktivitaeten` | POST | { typ: anruf·termin·email·notiz, betreff, text?, am?, dauerMin?, ergebnis?, kontaktId?, organisationId?, bezugArt?, bezugId?, wiedervorlageAm?, zustaendigId? } |
| `/api/admin/crm/dubletten` | GET, POST | mögliche Dubletten (E-Mail, Name + PLZ, Name + Organisation, Telefon) |
| `/api/admin/crm/kontakte/[id]/beziehung` | POST | { art: vorgang·flaeche·projekt·interesse, id, rolle?, entfernen? } |
| `/api/admin/crm/kontakte/[id]` | GET, PATCH | Kontakt mit Beziehungen, Aktivitäten, Verlauf, Dubletten-Kandidaten |
| `/api/admin/crm/kontakte` | GET, POST | Kontakte (CRM, lesen) |
| `/api/admin/crm/massenaktion` | POST | { ids[], tag?, tagEntfernen?, zustaendigId?, rolle? } |
| `/api/admin/crm/organisationen/[id]` | GET, PATCH | Organisation mit Kontakten, Aktivitäten, Objekten |
| `/api/admin/crm/organisationen` | GET, POST | Organisationen (Gemeinde, Netzbetreiber, Gutachter, Bank …) |
| `/api/admin/dealroom/freigabe` | POST | { projektId, interesseId, an } Kontaktfreigabe Anbieter ↔ Investor (Umgehungsschutz) |
| `/api/admin/dealroom` | GET | Moderationsschlange (Fragen/Antworten), Fragen beim Anbieter, Bieterverfahren, Kennzahlen |
| `/api/admin/demo-links` | GET | nur Demo-Backend: zuletzt erzeugte Bestätigungs-/Passwort-Links (statt E-Mail) |
| `/api/admin/eg/[id]/eda` | GET, POST | EDA-Marktkommunikation einer Gemeinschaft (WP2, Backoffice Bereich „eg“; Kontext-Rechte prüft das Backend) |
| `/api/admin/eg/[id]/energiedaten` | GET, POST | Energiedaten einer Gemeinschaft (WP3, Bereich „eg“; Kontext-Rechte prüft das Backend): |
| `/api/admin/eg/[id]` | GET, POST | Gemeinschaft mit Organen, Mitgliedern, Zählpunkten, Teilnahmen, Anlagen, Tarifen, Rechten |
| `/api/admin/eg/netzbetreiber` | GET | Netzbetreiber-Stammdaten und Netzentgelt-Regeln (Bereich „eg“ lesen) |
| `/api/admin/eg` | GET, POST | Backoffice: alle Energiegemeinschaften mit Kennzahlen und Hinweisen (Bereich „eg“ lesen) |
| `/api/admin/eg/simulation` | GET, POST | gespeicherte Simulationen (WP3; ohne Gemeinschaft: Backoffice „eg“) |
| `/api/admin/energie/ausschreibungen/[id]` | GET, POST | Ausschreibung (Backoffice): GET Detail inkl. normiertem Vergleich · POST {aktion: starten · einladen · frist · beenden · |
| `/api/admin/energie/ausschreibungen` | GET, POST | Ausschreibungen (Backoffice): GET Liste · POST anlegen {titel, kundenIds[], zone, lieferbeginn, produkte[], lieferantIds[], |
| `/api/admin/energie/einstellungen` | GET, POST | Einstellungen der Energiebeschaffung (Aufschlagsannahmen, Schwellen, Vergütungsparameter, Bestpreis-Regel, Demo-Kurve) |
| `/api/admin/energie/kunden/[id]` | GET, POST | Kunde (Backoffice): GET Detail · POST {vertragId?, daten} Stromvertrag anlegen/ändern |
| `/api/admin/energie/kunden/[id]/vollmacht-signatur` | POST | Beschaffungsvollmacht zusätzlich zur elektronischen Unterschrift (EES, Signatur-Modul) an den Kunden senden |
| `/api/admin/energie/kunden` | GET | Kundenliste der Energiebeschaffung mit Wechselanalyse (Empfehlung, Frist) |
| `/api/admin/energie/lieferanten/[id]` | GET, POST | Versorger: GET Detail (Historie, Bewertungen) · POST {aktion: speichern {daten} · bewerten {sterne, text} · einladen {email, ausschreibungId?}} |
| `/api/admin/energie/lieferanten` | GET, POST | Lieferantenstamm: GET Liste (Teilnahme, Bewertung, KYB) · POST {daten} neuer Versorger |
| `/api/admin/energie/portfolio` | GET, POST | Pool-Portfolio: GET Beschaffungsstand, Hedge-Quote, Mark-to-Market, Risiko · POST {aktion: buchen {periode, zone, mwh, |
| `/api/admin/energie` | GET, POST | Handelsdesk (Backoffice, Bereich „energie“): GET Übersicht · POST {aktion: "lauf"} Wechselanalyse + Fristen jetzt ausführen |
| `/api/admin/energie/termin` | GET, POST, DELETE | Terminmarkt: GET ?zone=DE·AT&produkt=Cal-27 · POST {eintrag} oder {csv, quelleStandard} (Quelle je Eintrag Pflicht) |
| `/api/admin/energie/wechsel/[id]` | POST | Schritt für den Kunden bzw. Versorger bestätigen { schritt, bemerkung? } (Bereich „energie“ schreiben) |
| `/api/admin/energie/wechsel` | GET | alle Lieferantenwechsel nach Zuschlag mit Fortschritt und überfälligen Schritten (Bereich „energie“ lesen) |
| `/api/admin/energiegemeinschaften` | GET, POST | Backoffice: Gemeinschaften mit Teilnehmern und Monatsläufen |
| `/api/admin/entwicklung/[id]/aktion` | POST | { aktion: plan_neu · vorlage_anwenden · uebergabe_boerse · uebergabe_anlage · erpnext_sync, begruendung? } |
| `/api/admin/entwicklung/[id]/eintraege` | POST, DELETE | { art: flaeche·meilenstein·risiko·entscheidung·budget·kontakt·freigabe, id?, daten } |
| `/api/admin/entwicklung/[id]/gutachter` | POST | { email, meilensteinIds, fachgebiete?, qualifikation?, buero?, nachweis? } Gutachter/Planer einladen (Link 14 Tage, einmalig; |
| `/api/admin/entwicklung/[id]/kalkulation/aktion` | POST | { aktion: festschreiben {stand, kommentar} · trasse_akquise · |
| `/api/admin/entwicklung/[id]/kalkulation/export` | GET | Kostenrahmen als PDF (Bereich „entwicklung“ lesen) |
| `/api/admin/entwicklung/[id]/kalkulation` | GET, PUT | Projektkostenkalkulation (Vorschlag aus markt.js, falls noch nicht gespeichert) |
| `/api/admin/entwicklung/[id]/planung` | GET, POST | Planliste des Entwicklungsprojekts (Backoffice, Bereich „entwicklung“ lesen) |
| `/api/admin/entwicklung/[id]` | GET, PATCH | Entwicklungsprojekt (Stammdaten, Flächen, Meilensteine mit kritischem Pfad, Risiken, |
| `/api/admin/entwicklung/[id]/rueckfrage` | POST | { meilensteinId, text, anId? } Rückfrage/Antwort an einen zugewiesenen Gutachter |
| `/api/admin/entwicklung/[id]/steuerung` | GET, POST | Ampel, Flächensicherung (Grundbuch, Optionsfristen), Entscheidungsvorlagen, |
| `/api/admin/entwicklung/assistent` | GET | Vorlage-Assistent „Neues Projekt aus Fläche“: |
| `/api/admin/entwicklung/auswahl` | GET | Auswahllisten (Projektleitung, Flächen, CRM-Kontakte, Investoren, Organisationen, Gutachter) |
| `/api/admin/entwicklung/fristen` | POST | Fristen-Erinnerungen jetzt ausführen (≤ 7 Tage bzw. überfällig, je Stufe einmal). |
| `/api/admin/entwicklung` | GET, POST | Portfolio (Projekte mit Phase, Pipeline-Wert, Verzug; Summen je Phase/Land/Jahr, |
| `/api/admin/entwicklung/steuerung/export` | GET | Pipeline-Bericht (MWp je Phase × Land, Ziel-Abgleich, |
| `/api/admin/entwicklung/steuerung` | GET, POST | Steuerung aller Entwicklungsprojekte: Projektampel, Pipeline MWp je Phase × Land, |
| `/api/admin/entwicklung/vorlagen/[vid]/pdf` | GET | Entscheidungsvorlage für die Geschäftsführung als PDF (Bereich „entwicklung“ |
| `/api/admin/entwicklung/vorlagen/[vid]` | GET, POST | Entscheidungsvorlage mit Momentaufnahme (Kennzahlen beim Einreichen), Verlauf |
| `/api/admin/export/[art]` | GET | CSV (Excel-DE: UTF-8 mit BOM, Semikolon) für vorgaenge · flaechen · projekte · interessen · provisionen |
| `/api/admin/finanzen/abrechnungen/[id]` | GET, POST | Beleg mit internen Angaben (Pflichtangaben-Prüfung, Mahnhinweis, KYC) |
| `/api/admin/finanzen/abrechnungen` | GET | alle Belege (offene Posten, Suche, Export). |
| `/api/admin/finanzen/anlagen/[id]` | PUT | Anlage aktivieren/ändern { anschaffungswert, nutzungsdauerJahre, inbetriebnahme, regel (AT·DE·CH), bemerkung? } |
| `/api/admin/finanzen/anlagen` | GET | Anlagenbuchhaltung: Contracting-Anlagen mit Aktivierung und AfA-Plan (ERPNext Asset) |
| `/api/admin/finanzen/anliegen/[id]` | POST | Entscheidung des Backoffice (Bereich „finanzen“ schreiben) |
| `/api/admin/finanzen/anliegen` | GET | Kundenanliegen (Einsprüche, Kündigungen, Verlängerungen, Übernahmen) |
| `/api/admin/finanzen/buchhaltung/abschluss/[monat]` | GET, POST | Monatsabschluss-Checkliste (JJJJ-MM) |
| `/api/admin/finanzen/buchhaltung/belege/[id]/dokument` | GET | PDF (Backoffice) |
| `/api/admin/finanzen/buchhaltung/belege/[id]` | POST | { aktion: "storno", grund, provisionStornieren? } · { aktion: "mahnsperre", bis?, grund? } |
| `/api/admin/finanzen/buchhaltung/einstellungen` | POST | { mahnwesen?, konten? } (Bereich „finanzen“ schreiben) |
| `/api/admin/finanzen/buchhaltung/export` | GET | Datei (DATEV: ISO-8859-1) |
| `/api/admin/finanzen/buchhaltung/mahnlauf` | POST | { ids?: [Beleg-IDs], trockenlauf? } → Mahnbelege (MA-Nummer) für fällige Vorschläge |
| `/api/admin/finanzen/buchhaltung` | GET | Übersicht Buchhaltung: OP-Liste, Mahnvorschläge, Zahlungseingänge, Stornos, Nummernkreise, Steuer-Check |
| `/api/admin/finanzen/buchhaltung/zahlungen/[id]` | POST | { aktion: zuordnen {belegId} · ignorieren {grund} · zuruecksetzen }; id „alle“ = sichere Treffer übernehmen |
| `/api/admin/finanzen/buchhaltung/zahlungen` | POST | Kontoauszug einlesen { inhalt (CAMT-XML oder CSV als Text), dateiname, format? } (max. ca. 3 MB) |
| `/api/admin/finanzen/entwicklung/[id]` | GET | Ist-Kosten eines Entwicklungsprojekts (API für das Entwicklungsmodul): |
| `/api/admin/finanzen/entwicklung` | GET, POST | Kostenträger/Entwicklungsprojekte mit Ist-Kosten, Budget-Vergleich, Kosten je MWp |
| `/api/admin/finanzen/klaerfaelle/[id]` | POST | { aktion: erledigt · verworfen, kommentar } (schreiben) |
| `/api/admin/finanzen/klaerfaelle` | GET | Klärfälle aus den Abrechnungsläufen |
| `/api/admin/finanzen/lauf` | POST | Abrechnungslauf starten (manuell; im Betrieb zusätzlich täglich per Frappe-Scheduler) |
| `/api/admin/finanzen/pachtvertraege/[id]` | GET, PATCH | Vertrag (Backoffice) |
| `/api/admin/finanzen/pachtvertraege/auswahl` | GET | Eigentümer-Konten, Flächen, Anlagen und Steuervorlagen für das Formular |
| `/api/admin/finanzen/pachtvertraege` | GET, POST | Pachtverträge mit KYC-Auszahlungsstatus und nächster Zahlung |
| `/api/admin/finanzen` | GET | Finanz-Cockpit (Kennzahlen, offene Posten, Mahnvorschläge, Läufe, Zahlungsläufe, Hinweise). |
| `/api/admin/finanzen/vpi` | GET, PUT | Index-Reihen und Werte (VPI AT/DE, LIK CH) |
| `/api/admin/finanzen/zahlungen/[id]` | POST | Zahlungslauf { aktion: bestaetigen (Bank hat ausgeführt → bezahlt) · verwerfen } |
| `/api/admin/finanzen/zahlungen` | GET | Zahlungsvorschlag: offene Pacht-Gutschriften je Eigentümer mit KYC-Freigabe |
| `/api/admin/finanzen/zahlungen/sepa` | POST | { ids: [Gutschrift-IDs], ausfuehrungAm? } → SEPA-Datei pain.001.001.09 (XML) |
| `/api/admin/finanzierung/[id]/aktion` | POST | { aktion, … }: |
| `/api/admin/finanzierung/[id]/dokumente/[dok]` | GET | Dokument des Bankenpakets herunterladen (lesen, protokolliert) |
| `/api/admin/finanzierung/[id]/dokumente` | POST | multipart: datei, baustein (Bankenpaket). Kopfzeile X-Plattform-Upload: 1, |
| `/api/admin/finanzierung/[id]/modell` | GET | Financial Model bzw. Projektsteckbrief |
| `/api/admin/finanzierung/[id]/reporting` | GET | Quartalsbericht an die Bank (PDF: DSCR/LLCR, Ampel, Monatswerte, Berichtspflichten) |
| `/api/admin/finanzierung/[id]` | GET, PATCH | Fall: Financial Model, Anfragen, Term-Sheet-Vergleich, Paket, CPs, Kreditvertrag, Covenants – lesen |
| `/api/admin/finanzierung/auswahl` | GET | Entwicklungsprojekte und Anlagen für „Fall anlegen“ – lesen |
| `/api/admin/finanzierung/bankakte/[anfrageId]/berichte/[bid]` | GET | eingereichter Covenant-Report als PDF (Bereich „finanzierung“ lesen) |
| `/api/admin/finanzierung/bankakte/[anfrageId]/dateien/[did]` | GET | Datei der Bank-Akte (Bereich „finanzierung“ lesen) |
| `/api/admin/finanzierung/bankakte/[anfrageId]/dateien` | POST | multipart: datei (PDF/JPG/PNG ≤ 10 MB) für Lieferung, Antwort oder Bericht |
| `/api/admin/finanzierung/bankakte/[anfrageId]` | GET, POST | Bank-Akte einer Anfrage (Bereich „finanzierung“ lesen) |
| `/api/admin/finanzierung/banken` | POST | Bank anlegen bzw. ändern (mit id) { name, land, art, ansprechpartner, email, telefon?, schwerpunkt?, notiz? } |
| `/api/admin/finanzierung/covenants` | POST | Covenant-Prüfung aller Fälle mit Kreditvertrag jetzt ausführen (sonst täglich; |
| `/api/admin/finanzierung/geschaeftsmodell` | POST | Vergleich Build-to-Sell / Eigenbetrieb / Contracting / Verpachtung rechnen |
| `/api/admin/finanzierung` | GET, POST | Übersicht: Finanzierungsfälle (Status, Covenant-Ampel, Reporting), Bankenstamm, Kennzahlen – lesen |
| `/api/admin/flaechen` | GET | alle Flächen (nur admin) |
| `/api/admin/fristen/erinnerungen` | POST | Fristerinnerungen jetzt senden (Pachtakte, Genossenschaft, Gemeinde); |
| `/api/admin/genossenschaft` | GET, POST | Backoffice: Genossenschaften, Mitglieder, Übertragungen, Versammlungen, Ausschüttungen, Kennzahlen |
| `/api/admin/geodaten/anschreiben` | GET | Anschreiben-Vorlage (Serienbrief an Eigentümer) mit |
| `/api/admin/geodaten/ebenen/[ebene]` | GET | Kartenebenen als GeoJSON |
| `/api/admin/geodaten/export` | GET | Export der gefilterten Kandidaten. |
| `/api/admin/geodaten/gemeinden/konkurrenz` | POST, DELETE | POST   /api/admin/geodaten/gemeinden/konkurrenz { schluessel, name, land, bundesland, entwickler, projekt, mw, ha, status, quelle } |
| `/api/admin/geodaten/gemeinden` | GET, PATCH, DELETE | Gemeinde-Screening mit Ranking |
| `/api/admin/geodaten/gemeinden/uebergabe` | POST, DELETE | an die |
| `/api/admin/geodaten/kampagnen/[id]` | GET, PATCH, DELETE | Kampagne mit Zielen, Empfängern (Backoffice), Aufgaben, Kennzahlen |
| `/api/admin/geodaten/kampagnen/[id]/serienbrief` | GET | Serienbrief (Druck-PDF, je Empfänger |
| `/api/admin/geodaten/kampagnen/[id]/starten` | POST | Status aktiv + je Zielfläche Aufgabe „Grundbuchabfrage“ mit Kostenschätzung |
| `/api/admin/geodaten/kampagnen/[id]/versand` | POST | Versand bestätigen (Briefe vermerken) |
| `/api/admin/geodaten/kampagnen/[id]/versandliste` | GET | Versandliste (Post/Lettershop) als CSV (Excel-DE): |
| `/api/admin/geodaten/kampagnen/nachfassen` | POST | fällige Nachfassstufen aller aktiven Kampagnen jetzt auslösen |
| `/api/admin/geodaten/kampagnen` | GET, POST | Akquise-Kampagnen mit Kennzahlen (löst fällige Nachfassstufen aus) |
| `/api/admin/geodaten/kampagnen/ziele/[zielId]/empfaenger/[empfaengerId]` | POST, PATCH | PATCH /api/admin/geodaten/kampagnen/ziele/[zielId]/empfaenger/[empfaengerId] { rueckmeldung?, termin?{am,notiz}, |
| `/api/admin/geodaten/kampagnen/ziele/[zielId]/grundbuch` | POST | POST /api/admin/geodaten/kampagnen/ziele/[zielId]/grundbuch { empfaenger: [{ anrede, titel, vorname, nachname, firma, zusatz, |
| `/api/admin/geodaten/kandidaten/[id]` | GET | Steckbrief einer Kandidatenfläche (Score-Begründung, Parzellen, Netz, Kosten) |
| `/api/admin/geodaten/kandidaten` | GET | GET /api/admin/geodaten/kandidaten?bbox=&minHa=&maxTrasseKm=&minScore=&bundesland=&bezirk=&gemeinde=&ampel=&q=&limit= |
| `/api/admin/geodaten/kapazitaet` | POST | POST /api/admin/geodaten/kapazitaet { knotenId, kapazitaet: frei·knapp·unbekannt, freiMw?, quelle, stand? } |
| `/api/admin/geodaten/netz` | GET | Netzknoten (Umspannwerke/Trafostationen) als GeoJSON |
| `/api/admin/geodaten` | GET | Übersicht Akquise-Karte: Modus (demo·dienst), Quellen/Lizenzen, Kennzahlen, Gebiete für Filter, |
| `/api/admin/geodaten/sperrliste/[id]` | DELETE | Sperre aufheben (nur Leitung, nur bei Irrtum, protokolliert) |
| `/api/admin/geodaten/sperrliste` | GET, POST | Sperrvermerke (maskiert, ohne Klartext-Namen) |
| `/api/admin/geodaten/suche` | GET | Gemeinde/Ort, KG, Grundstücksnummer („KG-Nr Gst-Nr“), Umspannwerk, Kandidat |
| `/api/admin/geodaten/umkreis` | GET | beste Flächen im Umkreis um ein Umspannwerk/einen Netzknoten |
| `/api/admin/geodaten/ziele` | GET, POST | übernommene Akquise-Ziele |
| `/api/admin/gesellschaften/[id]/dokumente` | GET | GET /api/admin/gesellschaften/[id]/dokumente[?dok=vertrag·gf·anmeldung·kapital·eigentuemer·gesellschafterliste·…] – |
| `/api/admin/gesellschaften/[id]/erp` | POST | Company in ERPNext anlegen (nur Frappe mit installiertem ERPNext + Schalter; |
| `/api/admin/gesellschaften/[id]` | GET, PATCH | Gesellschaft mit Checkliste, Dokumentenliste, Fristen, Verlauf |
| `/api/admin/gesellschaften/[id]/schritt` | POST | Checklisten-Schritt { schluessel, status: offen·in_arbeit·erledigt·entfaellt, |
| `/api/admin/gesellschaften/auswahl` | GET | Entwicklungsprojekte (Team Projektentwicklung), Gruppengesellschaften, Rechtsformen |
| `/api/admin/gesellschaften/fristen` | POST | Fristenlauf (Meldungen, Jahresabschluss, WiEReG) → Glocke für fällige Fristen ≤ 14 Tage |
| `/api/admin/gesellschaften/namenspruefung` | POST | Firmennamen-Vorprüfung { rechtsform, name } (Registersuche im Sitzland + |
| `/api/admin/gesellschaften` | GET, POST | Gesellschaftsverzeichnis mit Organigramm, Fortschritt und Fristen |
| `/api/admin/grundbuch/[id]/dokumente` | POST | multipart: datei, schritt (Nachweis, z. B. Grundbuchauszug). Kopfzeile X-Plattform-Upload: 1, |
| `/api/admin/grundbuch/[id]` | GET, PATCH | Akte (Backoffice-Sicht) |
| `/api/admin/grundbuch/[id]/schritt` | POST | { schluessel, status: offen·in_arbeit·erledigt·entfaellt, datum?, nachweisWert?, notiz?, frist? } |
| `/api/admin/grundbuch/[id]/signatur` | POST | Vertrag (Muster-PDF der Akte) über das Signatur-Modul an den Eigentümer senden. |
| `/api/admin/grundbuch/auswahl` | GET | Flächen (ab Pachtangebot) und Anlagen mit Dienstbarkeit für „Akte anlegen“ |
| `/api/admin/grundbuch/fristen` | GET | überfällige Schritte aller offenen Akten (Frappe: täglicher Scheduler mit Erinnerung) |
| `/api/admin/grundbuch` | GET, POST | Akten, Kennzahlen, Bericht „offene Grundbuch-Eintragungen“ |
| `/api/admin/gutachter/[id]/dateien/[did]` | GET | Lieferung bzw. Rechnung eines Auftrags (Bereich „entwicklung“ lesen); Abruf protokolliert |
| `/api/admin/gutachter/[id]/pdf` | GET | Auftragsbestätigung bzw. Abnahmeprotokoll (Bereich „entwicklung“ lesen) |
| `/api/admin/gutachter/[id]` | GET, POST | Auftrag inkl. Angebotsvergleich der Gruppe, interner Bewertung und Notiz |
| `/api/admin/gutachter/[id]/zahlung` | POST | { rechnungId, datum?, betrag? } Zahlung einer sachlich geprüften Rechnung buchen |
| `/api/admin/gutachter/fristen` | POST | Fristen-Lauf der Gutachteraufträge von Hand (sonst täglich; Frappe: Scheduler) |
| `/api/admin/gutachter` | GET, POST | Gutachteraufträge (Bereich „entwicklung“ lesen), Kennzahlen, Gutachter mit Bewertung, Fristen |
| `/api/admin/hinweis` | POST | interner Geldwäsche-Verdachtshinweis an Compliance (jedes Backoffice-Konto mit Cockpit-Leserecht). |
| `/api/admin/hr/abwesenheiten/[id]` | DELETE | eigene Abwesenheit bzw. (Leitung) fremde löschen; Vertretungen bleiben bestehen |
| `/api/admin/hr/abwesenheiten` | GET, POST | Abwesenheiten (alle mit „team“ lesen, sonst eigene) |
| `/api/admin/hr/auswertung` | GET | Schnittstelle Projektentwicklung/Finanzen: Stunden je Projekt und Tätigkeit |
| `/api/admin/hr/integrationen` | GET | Status der optionalen Frappe-Apps (Drive, Helpdesk, HRMS, Event-Kalender) |
| `/api/admin/hr/mitarbeiter/[id]` | PATCH | { funktion?, employeeId?, vertretungId?, kapazitaetStunden?, aktiv? } (Leitung: „team“ schreiben) |
| `/api/admin/hr` | GET | Team-Übersicht (Mitarbeiter ↔ Konto/Employee, Gebiete, Abwesenheiten, Auslastung; Bereich „team“ lesen) |
| `/api/admin/hr/zeiten/[id]` | DELETE | eigenen Zeiteintrag löschen (Leitung: alle), nicht nach Übernahme ins Timesheet |
| `/api/admin/hr/zeiten` | GET, POST | Zeiteinträge (eigene; mit „team“ lesen auch andere) |
| `/api/admin/interessen` | GET | NDA-Anfragen, LOIs usw. (nur admin) |
| `/api/admin/kanaele` | GET | Leads je Gruppen-/Partnerkanal und Kennung je Land (Welle 2, Paket GRP) |
| `/api/admin/leads/absage` | POST | Absagecode mit Begründung (Text an den Interessenten). |
| `/api/admin/leads/kette` | GET | Prüfung der Einwilligungskette (verifyChain über alle Einträge). Welle 2, Paket B3. |
| `/api/admin/leads/loeschung` | POST | Löschung nach Art. 17 DSGVO. |
| `/api/admin/leads` | GET | Lead-Desk (Welle 2, Paket B3) |
| `/api/admin/leads/sla` | GET | SLA-Auswertung (Median/P90 bis zum Erstkontakt je Land und Typ), nur intern. |
| `/api/admin/leads/widerruf` | POST | POST /api/admin/leads/widerruf { vorgangId, zweck: werbeanruf·newsletter·weitergabe_partner·bericht, kanal?: backoffice·telefon·email } |
| `/api/admin/leitung/bericht` | GET | Management-Bericht der Leitung als PDF (nur Unterrolle „Leitung“). |
| `/api/admin/leitung/digest` | POST | { erzwingen? } Tages-Digest jetzt versenden (nur Leitung; im Betrieb läuft er täglich per Scheduler) |
| `/api/admin/newsletter` | GET, POST | Newsletter-Backoffice (Plattform-Armee, Paket MARKETING) |
| `/api/admin/nutzer/[id]` | PATCH | { rollen?: [..], aktiv?: boolean } (Sperren beendet alle Sitzungen sofort) |
| `/api/admin/nutzer` | GET | Nutzerverwaltung (nur admin) |
| `/api/admin/onboarding/lauf` | POST | Erinnerungslauf „offene Einstiegsschritte“ (3/7 Tage) jetzt ausführen. |
| `/api/admin/onboarding` | GET | Einarbeitungsstand aller Backoffice-Konten (Onboarding-Assistenten, Team B1). |
| `/api/admin/pachtakte/agri/[id]` | POST | Agri-PV-Nachweis { nach: bestaetigt·rueckfrage, kommentar } |
| `/api/admin/pachtakte/anliegen/[id]` | POST | { nach: in_pruefung·rueckfrage·erledigt·abgelehnt, kommentar, wirksamZum?, neuesKontoId?, ab? } |
| `/api/admin/pachtakte` | GET | Arbeitsliste Pachtakten (offene Anliegen, eingereichte Agri-PV-Nachweise, Verträge mit |
| `/api/admin/pachtakte/rueckbau/[vertragId]` | POST | { ziel: rueckbau·sicherheit·vertrag, nach, kommentar?, termin?, art?, betrag?, geber?, hinterlegtAm? } |
| `/api/admin/portfolio/[id]/aktion` | POST | { aktion, … }: |
| `/api/admin/portfolio/[id]/bericht` | GET | Quartals- bzw. Jahresbericht als PDF (protokolliert) |
| `/api/admin/portfolio/[id]/dokumente` | POST | multipart: datei, art (jahresabschluss·steuer·bericht·vertrag·gesellschafter·sonstiges), freigabe (0 = intern). |
| `/api/admin/portfolio/[id]` | GET, PATCH | Position mit allen Details (Bereich „portfolio“ lesen) |
| `/api/admin/portfolio/auswahl` | GET | Investorenkonten, Entwicklungsprojekte (Co-Development), Arten und Typen für „Position anlegen“ |
| `/api/admin/portfolio/dokumente/[id]` | GET | Dokument einer Position herunterladen (Bereich „portfolio“ lesen) (protokolliert) |
| `/api/admin/portfolio/fristen` | POST | Fristenlauf manuell (Erinnerung vor Fälligkeit, Verzug, Covenant-Ampel); Frappe: Scheduler täglich |
| `/api/admin/portfolio` | GET, POST | alle Positionen, offene Kapitalabrufe, Wiederverkaufsanfragen, Kennzahlen (Bereich „portfolio“ lesen) |
| `/api/admin/postausgang` | GET | E-Mails, die Frappe versenden würde (nur Demo-Backend, nur admin) |
| `/api/admin/projekte/pipeline/[id]` | POST | Prognose { wahrscheinlichkeit (0–100 · null), closingErwartet (JJJJ-MM), notiz } (Bereich „projekte“ schreiben) |
| `/api/admin/projekte/pipeline` | GET | Verkaufs-Pipeline aller Projekte (Kanban, Wahrscheinlichkeit, erwartete Provision) |
| `/api/admin/projekte` | GET | alle Projekte inkl. Anbieter (nur admin) |
| `/api/admin/protokoll` | GET | Hash-Kette des Aktivitätsprotokolls prüfen (verify_chain) + letzte Einträge mit Hashes |
| `/api/admin/protokoll/suche` | GET | Revisionsprotokoll durchsuchen |
| `/api/admin/provisionen` | GET | Deals & Provisionen (nur admin). Statuswechsel über /api/admin/status (art: provision). |
| `/api/admin/rechte/[id]` | PATCH | { backofficeRollen: ["leitung"·"akquise"·"transaktion"·"buchhaltung"·"lesen"] } (nur Leitung) |
| `/api/admin/rechte` | GET | Backoffice-Unterrollen, Rechte-Matrix, Konten (nur Leitung) |
| `/api/admin/register/[id]/pdf` | GET | Registerauskunft als PDF (Ablage im KYC-Fall: rohdatenRef zeigt hierher) |
| `/api/admin/register/[id]` | GET | eine Registerauskunft (Firmendaten, Abrufdatum, Quelle) |
| `/api/admin/register/auskuenfte` | GET | gespeicherte Registerabrufe (Abrufdatum, Quelle, Zweck, KYC-Fall) |
| `/api/admin/register` | GET, POST | Firmensuche (Zefix live mit Zugang, sonst Demo) – Bereich „register“ lesen |
| `/api/admin/signatur/einstellungen` | GET, PATCH | Modus je Standard-Erklärung (klick · signatur) |
| `/api/admin/signatur` | GET, POST | alle Signaturvorgänge (Bereich „signatur“ lesen) |
| `/api/admin/status` | POST | Statuswechsel durch das Backoffice |
| `/api/admin/support` | GET, POST | alle Tickets mit SLA und Kennzahlen (Bereich „support“ lesen) |
| `/api/admin/termine` | GET, POST | alle Termine (Bereich „kalender“ lesen; löst fällige Erinnerungen aus) |
| `/api/admin/termine/verfuegbarkeit` | GET, PATCH | Mitarbeiter mit Arbeitszeiten, Terminarten, Abwesenheiten; Feiertage |
| `/api/admin/uebersicht` | GET | Kennzahlen, Trichter, Pipeline (nur admin) |
| `/api/admin/vorgaenge` | GET | alle Vorgänge (nur admin) |
| `/api/admin/vorlagen/[id]` | PATCH | neue Version { name, kanal, betreff, text, kommentar?, aktiv? } |
| `/api/admin/vorlagen/[id]/wiederherstellen` | POST | { version } → als neue Version übernehmen |
| `/api/admin/vorlagen` | GET, POST | E-Mail-/Nachrichtenvorlagen mit Versionen |
| `/api/admin/vorlagen/senden` | POST | { vorlageId, kontaktId?, bezugArt?, bezugId? } → E-Mail (Postausgang) bzw. Portal-Nachricht |
| `/api/admin/vorlagen/vorschau` | POST | { vorlageId?, betreff?, text?, bezugArt?, bezugId?, kontaktId? } → gerenderter Text + Warnungen |
| `/api/admin/wissen/[id]` | GET, PATCH, DELETE | Artikel mit Versionen |
| `/api/admin/wissen` | GET, POST | interne Wissensdatenbank (Suche; nur Backoffice, Bereich „wissen“ lesen) |
| `/api/admin/zuweisen` | POST | { art, id, zustaendigId·null } (nur admin; Zuständige müssen Admin-Konten sein) |
| `/api/anfrage` | POST | öffentliches Anfrageformular aller Zielgruppen (Vertrag: docs/BRIEFING.md, docs/API.md) |
| `/api/angebot/[code]/anfrage` | POST | POST /api/angebot/[code]/anfrage { kontakt: { anrede?, vorname, nachname, email, telefon?, plz?, ort? }, nachricht?, |
| `/api/angebot/[code]/aufruf` | POST | Aufruf der Angebotsseite zählen (Rücklauf-Tracking). Öffentlich (ohne Anmeldung), |
| `/api/angebot/[code]/widerspruch` | POST | Widerspruch gegen die Verarbeitung (Art. 21 Abs. 2 DSGVO): |
| `/api/auth/email-aendern` | GET | Link aus der Mail an die NEUE Adresse: Anmeldeadresse ändern. |
| `/api/auth/email-bestaetigen` | GET | Link aus der Bestätigungs-E-Mail. |
| `/api/auth/ich` | GET | angemeldeter Nutzer oder null |
| `/api/auth/login` | POST | { email, passwort } → Sitzungscookie |
| `/api/auth/logout` | POST | aktuelle Sitzung im Backend beenden, Cookies löschen |
| `/api/auth/magic-link/einloesen` | POST | { token } → Sitzung (bzw. 2FA-Zwischenschritt). Einlösen nur per POST von |
| `/api/auth/magic-link` | POST | { email } → immer { ok: true } (keine Konto-Enumeration). |
| `/api/auth/passwort-setzen` | POST | { token, passwort } → neues Passwort, alle alten Sitzungen ungültig, neu angemeldet |
| `/api/auth/passwort-vergessen` | POST | { email } → immer { ok: true } (keine Konto-Enumeration) |
| `/api/auth/registrieren` | POST | Konto anlegen, sofort angemeldet. |
| `/api/auth/zwei-faktor` | POST | { code, merken? } zweiter Schritt der Anmeldung (Zwischen-Cookie aus Login/E-Mail-Link) |
| `/api/boerse/[slug]` | GET | Exposé: öffentlich nur Teaser; vertrauliche Felder und Datenraum |
| `/api/boerse/[slug]/teaser` | GET | öffentlicher Projekt-Teaser als PDF (nur Felder der Positivliste, ohne Datenraum) |
| `/api/boerse` | GET | öffentliche Projektliste (nur Teaser-Felder) |
| `/api/dienste/eid/rueckkehr` | GET | Rücksprung vom eID-Aussteller (ID Austria, |
| `/api/dienste/identitaet/webhook/[anbieter]` | POST | Ergebnis-Webhook des Identitätsanbieters (ÖFFENTLICH, ohne Sitzung). |
| `/api/eg/interesse` | POST | öffentliches Interesse an einer Energiegemeinschaft (WP6, Fachkonzept 2.1): schmale Daten, |
| `/api/eg/rechner` | POST | öffentlicher Ersparnis-Rechner Energiegemeinschaft (WP6), ohne Personendaten. |
| `/api/energie/live` | GET |  |
| `/api/newsletter/abmelden` | GET, POST | Abmeldung mit einem Klick (Welle 3, Paket NL) |
| `/api/newsletter/bestaetigen` | POST | Double-Opt-in des Newsletters (Welle 3, Paket NL) |
| `/api/newsletter` | GET, POST | Newsletter je Land (Welle 3, Paket NL) |
| `/api/planung/upload` | POST | multipart (bewusst außerhalb von /api/portal: die Middleware puffert Anfragen höchstens 10 MB, |
| `/api/portal/anbieter/[projektId]` | GET, POST | Anbieter-Akte (Anbieter/Team, Backoffice; Investor mit Datenraum: nur Bestandsdaten) |
| `/api/portal/anbieter/[projektId]/vermittlungsauftrag` | GET | Vermittlungsauftrag als PDF (Muster; Anbieter/Team und Backoffice, Abruf protokolliert) |
| `/api/portal/anbieter/cockpit` | GET | „Was ist zu tun?“ über alle eigenen Projekte (Anbieter) bzw. Punkte für das Backoffice |
| `/api/portal/anlagen/[id]/live` | GET | Server-Sent Events mit dem jeweils neuesten Messwert (event: messwert). |
| `/api/portal/anlagen/[id]/messdaten` | GET | GET /api/portal/anlagen/[id]/messdaten?von=ISO&bis=ISO&aufloesung=15min·1h·1d·1mon[&format=csv] |
| `/api/portal/anlagen/[id]` | GET | Detail mit Stammdaten, Live-Wert, Summen, Ampel, Kosten (fremde Anlage → 403) |
| `/api/portal/anlagen/[id]/zaehler` | GET | GET /api/portal/anlagen/[id]/zaehler[?format=csv&art=abrechnung·monitoring] |
| `/api/portal/anlagen` | GET | Anlagen, die das Konto sehen darf (Kunde: eigene/Organisation; Betrieb: alle), |
| `/api/portal/anlagen/stoerungen/[id]` | POST | { aktion, … } |
| `/api/portal/anlagen/stoerungen` | GET | Störungen der sichtbaren Anlagen |
| `/api/portal/ausschreibungen/[id]/angebot` | POST | Lieferant: POST Preisblatt {positionen[], bindefristBis, zahlungszielTage, sicherheit, bemerkung} (verdeckt, ersetzt das eigene |
| `/api/portal/ausschreibungen/[id]/fragen` | POST | Frage zur Angebotsanfrage (Antworten gehen anonymisiert an alle eingeladenen Versorger) |
| `/api/portal/ausschreibungen/[id]` | GET | nicht eingeladen bzw. fremd → 404 (keine Existenz verraten) |
| `/api/portal/ausschreibungen/einladung` | GET, POST | Einladung eines Versorgers: GET ?token= Kurzinfo (öffentlich) · POST {token, vorname?, nachname?, passwort?} |
| `/api/portal/ausschreibungen` | GET | Ausschreibungen je Rolle: Lieferant NUR eingeladene (anonymisiert), Unternehmen nur eigene, Backoffice alle |
| `/api/portal/bank/[id]/akte/berichte/[bid]` | GET | eingereichter Covenant-Report als PDF (Momentaufnahme bei Einreichung); Abruf protokolliert |
| `/api/portal/bank/[id]/akte/dateien/[did]` | GET | Datei der Bank-Akte (Lieferung, Antwort, Bericht) der eigenen Anfrage; Abruf protokolliert |
| `/api/portal/bank/[id]/akte/dateien` | POST | multipart: datei (PDF/JPG/PNG ≤ 10 MB) als Anlage zur Bank-Akte (z. B. Checkliste der |
| `/api/portal/bank/[id]/akte` | GET, POST | Bank-Akte der eigenen Anfrage: Anforderungen, Q&A, Zuständigkeit, Kreditentscheidung, CPs, |
| `/api/portal/bank/[id]/dokument/[dok]` | GET | Download aus dem Bankenpaket, nur freigegebene Bausteine: |
| `/api/portal/bank/[id]` | GET, POST | Anfrage aus Sicht der Bank: Vorhaben, NUR freigegebene Bausteine des Bankenpakets, eigenes Term Sheet |
| `/api/portal/bank/einladung` | POST | Bank-Einladung annehmen { token } (angemeldet mit der eingeladenen E-Mail-Adresse); |
| `/api/portal/bank` | GET | Finanzierungsanfragen der eigenen Bank (Rolle „bank“, nur verknüpfte Banken) |
| `/api/portal/bank/team/einladung` | POST | Einladung in das Bank-Team annehmen { token } (angemeldet mit der eingeladenen E-Mail-Adresse); |
| `/api/portal/bank/team` | GET, POST | Team der eigenen Bank (Mitglieder, Rollen, offene Einladungen für die Leitung) |
| `/api/portal/benachrichtigungen` | GET, POST, PUT | eigene Benachrichtigungen (Glocke) + Einstellungen |
| `/api/portal/bieter/gebote/[id]` | DELETE | eigenes Gebot zurückziehen (nur solange die Runde offen ist) |
| `/api/portal/bieter` | GET, POST | Bieterverfahren in der Sicht der Rolle (Investor: nur eigene Gebote) |
| `/api/portal/boerse/[id]/merken` | POST | { an: true·false } Merkliste (Investor) |
| `/api/portal/boerse/[id]/nda` | POST | { akzeptiert: true } Klick-NDA (Text-Version, Zeitstempel, IP, User-Agent protokolliert) |
| `/api/portal/closing/[id]/pdf` | GET | SPA-Muster (keine Rechtsberatung) bzw. Abschlussbericht (nach Closing) als PDF; |
| `/api/portal/closing/[id]` | GET, POST | Closing-Raum für Beteiligte (Gegenseite anonym bis zur Kontaktfreigabe) bzw. Backoffice; fremd → 403 |
| `/api/portal/closing/[id]/termin` | GET | Notartermin als Kalenderdatei (.ics) für Beteiligte und Backoffice |
| `/api/portal/closing` | GET | eigene Closing-Räume (Käufer bzw. Verkäufer) |
| `/api/portal/datenraum/dokumente/[id]` | GET, PATCH | Datenraum-Dokument (Rechte inkl. Freigabestufe), |
| `/api/portal/datenraum` | GET | Datenraum nach Standard-Index (Ordner, Versionen, Stufen) |
| `/api/portal/datenraum/upload` | POST | multipart: datei, projektId, ordner, stufe (1·2), versionVon?, checkliste? |
| `/api/portal/datenraum/zugriffe` | GET | Zugriffsprotokoll je Investor (Anbieter: Pseudonyme, Backoffice: Namen) |
| `/api/portal/dienste/eid/demo` | POST | nur DEMO-Konfiguration: Simulator des eID-Ausstellers. |
| `/api/portal/dienste/eid/einstellungen` | GET, POST | Compliance: eID-Regel und Verfahrensstatus |
| `/api/portal/dienste/eid` | GET, POST | verfügbare eID-Verfahren (ID Austria, Online-Ausweis; ggf. DEMO), eigene Vorgänge, Nachweis |
| `/api/portal/dienste/identitaet/demo` | POST | nur Demo-Anbieter: Ergebnis der eigenen Sitzung simulieren |
| `/api/portal/dienste/identitaet` | GET, POST | Konfiguration (Anbieter, Verfahren), eigene Sitzungen, letzte MRZ-Vorprüfung |
| `/api/portal/dienste/mrz` | POST | automatische MRZ-Vorprüfung (ICAO 9303: Prüfziffern, Ablauf, Abgleich mit dem Konto) |
| `/api/portal/dokumente/[id]` | GET, DELETE | Download (nur Berechtigte; Datenraum nur mit freigegebenem NDA) |
| `/api/portal/dokumente` | GET, POST | Dokumente (nur berechtigte) |
| `/api/portal/eg/[id]/abrechnung/belege/[bid]/pdf` | GET | selbsterklärender Beleg (Rechnung, Gutschrift, Storno) als PDF |
| `/api/portal/eg/[id]/abrechnung/belege/[bid]/zahlung` | POST | Zahlung manuell erfassen { betrag, datum, geldkonto: 2800·2700, referenz } |
| `/api/portal/eg/[id]/abrechnung/belege` | GET | Belege der Gemeinschaft (Organe/Backoffice) bzw. eigene Belege |
| `/api/portal/eg/[id]/abrechnung/buchhaltung` | GET, POST | E/A-Rechnung, Kassabuch, UVA, Kleinunternehmer, Prüfvermerke |
| `/api/portal/eg/[id]/abrechnung/camt` | POST | Kontoauszug camt.053/054 { xml, ausfuehren?, zuordnungen? {index: belegId} } |
| `/api/portal/eg/[id]/abrechnung/export` | GET | Download (protokolliert) |
| `/api/portal/eg/[id]/abrechnung/jahresbescheinigung` | GET | Jahresbescheinigung Erzeuger (kWh, €, § 3 Abs. 1 Z 39 EStG) |
| `/api/portal/eg/[id]/abrechnung/mahnlauf` | GET, POST | Mahnvorschläge (faire Stufen, schutzbedürftige Haushalte gebührenfrei); |
| `/api/portal/eg/[id]/abrechnung/perioden/[pid]` | GET, POST | Periode mit Vorschau, Prüfungen und Belegen |
| `/api/portal/eg/[id]/abrechnung` | GET, POST | Übersicht Abrechnung (Perioden, Kennzahlen, Kleinunternehmer-Monitor, Zahlungsläufe, Rechte) |
| `/api/portal/eg/[id]/abrechnung/zahlungen/[zid]` | GET, POST | Zahlungsdatei (XML), erst nach Freigabe durch eine zweite Person |
| `/api/portal/eg/[id]/abrechnung/zahlungen` | POST | Zahlungslauf { art: pain008·pain001, belegIds?, ausfuehrungAm? } |
| `/api/portal/eg/[id]/aufloesung` | GET, POST | Auflösungs-Checkliste (WP5, Fachkonzept 2.7) |
| `/api/portal/eg/[id]/beitritt` | POST | Beitrittsantrag mit Zählpunkten, Zustimmungen und einfacher elektronischer |
| `/api/portal/eg/[id]/eda` | GET, POST | Vier-Augen-Freigaben der EDA-Massenvorgänge für den Vorstand (WP2) |
| `/api/portal/eg/[id]/energie` | GET | Organe-Sicht der Energiedaten (WP3): dashboard · qualitaet&monat= · |
| `/api/portal/eg/[id]/import/ausfuehren` | POST | Import übernehmen { importId, ohneFehlerzeilen?, tarifUebernehmen? } (WP5 → WP1 egCsvImport, |
| `/api/portal/eg/[id]/import` | POST | Wechsel-Import: Vorschau mit Anbieter-Erkennung, Spaltenzuordnung und Plausibilitätsprüfung (WP5) |
| `/api/portal/eg/[id]` | GET | Mitglieder-Dashboard einer Gemeinschaft (WP6): eigenes Mitglied, Teilnahmen, Kennzahlen, |
| `/api/portal/eg/[id]/tf-wuensche` | GET, POST | Teilnahmefaktor-Wünsche der Mitglieder einer Gemeinschaft (Integration WP6 → WP2) |
| `/api/portal/eg/[id]/verein` | GET, POST | Vereinsorganisation (WP5): Organe, Mitglieder-/Generalversammlungen (Versammlungsmodul), Beschlüsse, Beiträge |
| `/api/portal/eg/[id]/verwaltung` | GET, POST | Organe-Sicht (Vorstand, Kassier, Schriftführung, Rechnungsprüfung): Kennzahlen, |
| `/api/portal/eg/belege/[id]` | GET | PDF eines eigenen Belegs (WP6 reicht an WP4 abBelegPdf weiter; WP4 prüft das Eigentum). |
| `/api/portal/eg/belege` | GET | eigene Belege aller Mitgliedschaften (WP6 liest über WP4 abBelege). |
| `/api/portal/eg/datenauskunft` | GET | Auskunft nach Art. 15 DSGVO über alle Energiegemeinschafts-Daten des |
| `/api/portal/eg/dokument` | GET, POST | Dokumentgenerator (WP5): Musterstatuten, Verträge, Vollmachten, Anzeigen, Mitgliederinformationen |
| `/api/portal/eg/energie` | GET | Energiedaten des eigenen Zählpunkts (WP6 liest über WP3). |
| `/api/portal/eg/foerdercheck` | POST | Förder-Check (WP5) { gemeinschaftId?, auftragId?, daten: { modell, bundesland, antragsteller, |
| `/api/portal/eg/gemeinde` | GET | Gemeinde-Sicht (WP6): Gemeindegebäude-Zählpunkte, Sozialquote (§ 68 Abs. 6 ElWG), |
| `/api/portal/eg/gruendung/[id]` | GET, POST | Gründungsauftrag (WP5) |
| `/api/portal/eg/gruendung/[id]/schritt` | POST | { schritt, aktion: starten · warten · erledigen · entfaellt · wiedereroeffnen · frist · notiz, |
| `/api/portal/eg/gruendung` | GET, POST | Gründungsaufträge (WP5) |
| `/api/portal/eg/kuendigung` | POST | Kündigung der eigenen Mitgliedschaft {mitgliedId, zum} bzw. Rückzug eines offenen |
| `/api/portal/eg/optimierung` | GET | Vorschlag des Mehrfachteilnahme-Optimierers (WP3 enOptimierung, prüft selbst, |
| `/api/portal/eg` | GET | Energiegemeinschaften im Portal (WP6): eigene Mitgliedschaften, Teilnahmen mit Schritten, |
| `/api/portal/eg/tf-wunsch` | POST | Wunsch zum Teilnahmefaktor {teilnahmeId, teilnahmefaktor} (WP6). Entwurf: sofort; |
| `/api/portal/energie/dokument` | GET | PDF (Angebotsvergleich, Zuschlagsschreiben, Beschaffungsvollmacht, |
| `/api/portal/energie/freigabe` | POST | Kundenfreigabe des Zuschlagsvorschlags: POST {ausschreibungId, entscheidung: "freigegeben" · "abgelehnt", kommentar?} |
| `/api/portal/energie` | GET, POST | „Meine Energiebeschaffung“ (Rolle unternehmen): GET Übersicht · POST {vertragId?, daten} eigenen Stromvertrag pflegen |
| `/api/portal/energie/vollmacht` | POST | Beschaffungsvollmacht (Rolle unternehmen): POST {aktion: "erteilen", zustimmung: true} · {aktion: "widerrufen"} – |
| `/api/portal/entwicklung/[id]/meilensteine/[mid]` | POST | { aktion: in_arbeit · eingereicht } – nur zugewiesener Gutachter |
| `/api/portal/entwicklung/[id]` | GET | externe Sicht eines Entwicklungsprojekts (je Beteiligung gefiltert; fremd → 403) |
| `/api/portal/entwicklung/[id]/rueckfragen` | POST | { meilensteinId, text } Rückfrage des Gutachters an die Projektleitung |
| `/api/portal/entwicklung/dokumente/[did]` | GET | Download (Backoffice; Gutachter nur eigene bzw. für ihn freigegebene am zugewiesenen |
| `/api/portal/entwicklung/dokumente` | POST | multipart: datei, projektId, meilensteinId?, pflicht? (Name der Dokumentenpflicht), |
| `/api/portal/entwicklung/einladung` | POST | { token } Gutachter-Einladung annehmen (nur mit der eingeladenen E-Mail-Adresse); |
| `/api/portal/entwicklung` | GET | Entwicklungsprojekte, an denen das Konto extern beteiligt ist (Flächeneigentümer: vereinfacht; |
| `/api/portal/fach/bewertung/[projektId]` | GET, POST | Vorbelegung, Ergebnis, eigene Szenarien (nur mit Datenraum-Zugriff) |
| `/api/portal/fach/energie/abnahmestellen` | POST, DELETE | { id?, daten } anlegen/ändern (MaLo-/Zählpunkt-Prüfung serverseitig) |
| `/api/portal/fach/energie/lastgang/[id]` | POST, PATCH, DELETE | Analyse neu rechnen { pvKwp, preisCt, produzierend } |
| `/api/portal/fach/energie/lastgang` | POST | Lastgang-CSV als Text { name, inhalt, einheit?, abnahmestelleId?, parameter? } (≤ 4 MB) |
| `/api/portal/fach/energie` | GET | Abnahmestellen, Lastgänge, Energiegemeinschaft, Genossenschaft des Kontos (Fachprüfung Kapitalseite) |
| `/api/portal/fach/mitglied` | PUT | { art: "geno" · "eg", daten } Interesse Genossenschaft bzw. Teilnahme Energiegemeinschaft |
| `/api/portal/fach/szenarien/[id]` | DELETE | eigenes Bewertungsszenario löschen |
| `/api/portal/finanzen/[id]/dokument` | GET | PDF für Empfänger (Rechte wie die Abrechnung; Abruf protokolliert) |
| `/api/portal/finanzen/[id]/pdf` | GET | Beleg als PDF (Gutschrift/Rechnung). Rechte wie /api/portal/finanzen/[id]; |
| `/api/portal/finanzen/[id]` | GET | Abrechnung im Detail (Empfänger, Organisation oder Backoffice; fremde → 403) |
| `/api/portal/finanzen/dokumente` | GET | eigene Mahnungen und Stornobelege (Empfänger/Organisation) |
| `/api/portal/finanzen` | GET | eigene Abrechnungen (Pacht-Gutschriften, Contracting-, Provisionsrechnungen) mit |
| `/api/portal/finanzierung/projekt/[id]` | GET | Vorbelegung des Cockpits aus Börse/Datenraum (nur Investor mit freigegebenem |
| `/api/portal/finanzierung` | GET, POST | Finanzierungscockpit: Projekte mit Cockpit-Zugriff (Datenraum frei bzw. eigene) + eigene Szenarien |
| `/api/portal/finanzierung/szenarien/[id]/pdf` | GET | Finanzierungsvergleich als PDF (nur eigenes Szenario; mit Projektbezug |
| `/api/portal/finanzierung/szenarien/[id]` | DELETE | eigenes Szenario löschen (fremde → 403) |
| `/api/portal/flaechen/[id]` | GET, PATCH | eine Fläche (Eigentümer oder Admin) |
| `/api/portal/flaechen` | GET, POST | eigene Flächen |
| `/api/portal/gemeinde/material` | GET | GET /api/portal/gemeinde/material?vorgang=…&art=pressemitteilung·amtsblatt·faq·aushang·sitzungsvorlage&projekt=…&format=pdf·json |
| `/api/portal/gemeinde` | GET, POST | Gemeindecockpit (Gemeinde: eigenes geprüftes Anliegen; Backoffice: Bereich „kommunen“) |
| `/api/portal/grundbuch/[id]/dokumente/[dok]` | GET | Nachweis herunterladen (Backoffice alle, Eigentümer nur den Grundbuchauszug); protokolliert |
| `/api/portal/grundbuch/[id]/muster` | GET | GET /api/portal/grundbuch/[id]/muster[?vorlage=dienstbarkeit_freiflaeche·dachnutzung_servitut·rangruecktritt·loeschung_hinweis] – |
| `/api/portal/grundbuch/[id]` | GET | Akte: Eigentümer/Dachgeber nur die eigene (vereinfacht, „Was bedeutet das für Sie?“), Backoffice alle; fremd → 403 |
| `/api/portal/grundbuch` | GET | eigene Grundbuch-Akten (Eigentümer bzw. Dachgeber); mit ?bezugArt=flaeche·anlage&bezugId= nur Akten zu diesem Objekt |
| `/api/portal/gutachter/[id]/dateien/[did]` | GET | Datei des eigenen Auftrags (Lieferung, Rechnung); Abruf protokolliert |
| `/api/portal/gutachter/[id]/dateien` | POST | multipart: datei (PDF/JPG/PNG ≤ 10 MB), zweck = lieferung · rechnung, |
| `/api/portal/gutachter/[id]/pdf` | GET | Auftragsbestätigung bzw. Abnahmeprotokoll des eigenen Auftrags |
| `/api/portal/gutachter/[id]` | GET, POST | eigener Auftrag (fremd → 403): Leistung, Angebot, Termine, Lieferungen, Rückfragen, Rechnungen |
| `/api/portal/gutachter` | GET | eigene Anfragen und Aufträge des Gutachters (alle Projekte), Fristen, Kennzahlen (Rolle „gutachter“) |
| `/api/portal/interessen` | GET | eigene Projektinteressen (Investor) |
| `/api/portal/ki/[fall]` | POST | Assistent ausführen (JSON, Origin-Prüfung über route()). |
| `/api/portal/ki` | GET | Status des Assistenten für das angemeldete Konto: |
| `/api/portal/kommune` | GET | Gemeinde-Sicht: eigene kommunale Anliegen; Projekte im Gemeindegebiet nur bei |
| `/api/portal/konto/email` | POST | { neu, passwort } → Bestätigungslink an die neue Adresse (24 h), Hinweis an die alte. |
| `/api/portal/konto/export` | GET | Datenexport (Art. 15/20 DSGVO) als JSON-Download, nur eigene Daten, protokolliert |
| `/api/portal/konto/komfort` | PATCH | { farbe?, sprache?, kanaele? { email } } → { ok, komfort } |
| `/api/portal/konto/loeschen` | POST | { passwort, bestaetigung: "LÖSCHEN" } → Konto löschen (Art. 17 DSGVO), abmelden |
| `/api/portal/kundenenergie/anliegen/[id]/pdf` | GET | Eingangsbestätigung, Angebot bzw. Entscheidung als PDF (Kunde, Team, Backoffice Finanzen) |
| `/api/portal/kundenenergie/anliegen/[id]` | POST | Kundenaktion: { aktion: zurueckziehen · annehmen {bestaetigt:true} · ausschlagen {begruendung?} } |
| `/api/portal/kundenenergie/anliegen` | GET, POST | Anliegen des Contracting-Kunden (Kundenseite Energie) |
| `/api/portal/kundenenergie/kosten` | GET | Energiekostenbericht (Netzbezug × Energiepreis + Contracting-Solarstrom) |
| `/api/portal/kundenenergie/stoerung` | POST | Contracting-Kunde meldet eine Störung { anlageId, titel, text?, auswirkung: kein_ertrag·weniger_ertrag·sicherheit·sonstiges } |
| `/api/portal/kundenenergie/vertragsdaten` | GET | Kundendaten und Lokationen für den Liefervertrag |
| `/api/portal/kundenenergie/wechsel/[id]` | POST | Schritt bestätigen { schritt, bemerkung? } |
| `/api/portal/kundenenergie/wechsel` | GET | Lieferantenwechsel nach Zuschlag |
| `/api/portal/kyc/dokumente/[id]` | GET, DELETE | eigene Unterlage ansehen (?anzeigen=1 inline); jeder Zugriff wird protokolliert |
| `/api/portal/kyc/dokumente` | POST | multipart: datei, art, flaecheId?, personId?, ausgestelltAm? |
| `/api/portal/kyc/einreichen` | POST | Verifizierung zur Prüfung einreichen (alle Pflichtangaben/-unterlagen vorhanden) |
| `/api/portal/kyc/erneut` | POST | erneute Prüfung starten (nach Verifizierung, z. B. neuer Ausweis oder neue Bankverbindung) |
| `/api/portal/kyc/freigabe` | GET | GET /api/portal/kyc/freigabe?schritt=nda·loi·gebot·zuschlag·veroeffentlichung·auszahlung·contracting·codevelopment[&flaecheId=] |
| `/api/portal/kyc` | GET, PATCH | eigener KYC-Fall: Angaben, Unterlagen (Metadaten), Anforderungen, Fortschritt, Freigaben |
| `/api/portal/kyc/video` | GET, POST | Videoidentifizierung (eigener Fall): Stand, freie Termine der Compliance, Link, Datenschutz |
| `/api/portal/mitglied/pdf` | GET | Muster-PDFs des |
| `/api/portal/mitglied` | GET, POST | Mitgliederbereich (Genossenschaften, eigene Mitgliedschaften, Versammlungen, Ausschüttungen, Energiegemeinschaft) |
| `/api/portal/mitglied/versammlung/[id]` | GET | Generalversammlung mit Tagesordnung, Unterlagen, eigener Stimme bzw. Ergebnis |
| `/api/portal/nachrichten` | GET, POST | Threads (je Vorgang/Fläche/Projekt/Interesse/Allgemein) |
| `/api/portal/onboarding` | GET, PUT | Onboarding-Zustand am Konto + Checkliste „Erste Schritte“ (aus dem aktiven Pfad) + Pfad-Kurzinfo |
| `/api/portal/organisation/[id]/einladungen/[eid]` | DELETE | offene Einladung widerrufen (ab Admin) |
| `/api/portal/organisation/[id]/einladungen` | POST | { email, rolle (admin·mitglied·lesen) } Einladungslink per E-Mail (7 Tage) |
| `/api/portal/organisation/[id]/mitglieder/[mid]` | PATCH, DELETE | { rolle } Teamrolle ändern (ab Admin; „inhaber“ = Übertragung durch den Inhaber) |
| `/api/portal/organisation/[id]` | GET, PATCH, DELETE | Details inkl. Mitglieder, Einladungen (ab Admin), Objekte { ok, organisation } |
| `/api/portal/organisation/einladung` | POST | { token } Einladung annehmen (nur mit der eingeladenen E-Mail-Adresse), |
| `/api/portal/organisation` | GET, POST | eigene Organisationen { ok, organisationen [{id,name,art,rolle,mitglieder}], aktiv } |
| `/api/portal/organisation/wechseln` | POST | { organisationId · null } aktive Organisation dieser Sitzung (null = persönlich) |
| `/api/portal/organisation/zuordnen` | POST | { art (flaeche·projekt·interesse), id, organisationId · null } |
| `/api/portal/pachtakte/agri` | PUT | Agri-PV-Bewirtschaftungsnachweis speichern bzw. einreichen |
| `/api/portal/pachtakte/anliegen/[id]` | POST | Eigentümer: auf Rückfrage antworten { nach: "eingereicht", kommentar } |
| `/api/portal/pachtakte/anliegen` | POST | Anliegen zum eigenen Pachtvertrag { vertragId, art, daten } |
| `/api/portal/pachtakte/bescheinigung/[jahr]` | GET | Jahresbescheinigung über Pachtzahlungen als PDF (nur eigene |
| `/api/portal/pachtakte` | GET | eigene Pachtakten: Vertrag, Fristen, Anliegen, Rückbau/Sicherheit, Agri-PV-Nachweise, |
| `/api/portal/pachtakte/rueckbau/[vertragId]` | POST | Eigentümer: Rückbau abnehmen { nach: "abgenommen" } |
| `/api/portal/passwort` | POST | { alt, neu } → andere Sitzungen werden ungültig, diese erhält eine neue Sitzung (Rotation) |
| `/api/portal/pipeline/cockpit` | GET | Anbieter-Cockpit: Trichter, Aufrufe über Zeit, |
| `/api/portal/pipeline` | GET, PUT | Deal-Pipeline des Investors (Kanban, Notizen, Kennzahlen, Suchprofile) |
| `/api/portal/pipeline/suchprofile` | PUT | { profile: [{ id?, name, mwpMin, mwpMax, phasen, laender, typen, ticketMin, ticketMax, schwelle }] } |
| `/api/portal/planung` | GET | Pläne eines Entwicklungsprojekts (Backoffice alles; Gutachter/Planer nur Pläne an |
| `/api/portal/planung/versionen/[vid]` | GET, POST | Datei der Planversion (?abgeleitet=1: aus DWG konvertierte DXF bzw. GeoJSON-Vorschau |
| `/api/portal/portfolio/[id]/bericht` | GET | Quartals- bzw. Jahresbericht als PDF (protokolliert) |
| `/api/portal/portfolio/[id]` | GET, POST | Position (Ertrag Soll/Ist, Covenants, Ausschüttungen, Kapitalabrufe, Dokumente, Steuerhinweise) |
| `/api/portal/portfolio/dokumente/[id]` | GET | freigegebenes Dokument einer eigenen Position herunterladen (protokolliert) |
| `/api/portal/portfolio` | GET | eigene Positionen (Investor bzw. Organisation) mit Kennzahlen |
| `/api/portal/profil` | GET, PATCH | eigenes Konto |
| `/api/portal/projekte/[id]/expose` | GET | vertrauliches Exposé als PDF |
| `/api/portal/projekte/[id]/provision` | POST | { akzeptiert: true } Provisionsvereinbarung (Zeitstempel + IP protokolliert) |
| `/api/portal/projekte/[id]` | GET, PATCH | Projekt (Anbieter oder Admin) |
| `/api/portal/projekte` | GET, POST | eigene Projekte (Anbieter) inkl. Statistik |
| `/api/portal/qa/[id]` | POST | { aktion, … } |
| `/api/portal/qa` | GET, POST | Fragen & Antworten zum Projekt (je Rolle gefiltert, anonymisiert) |
| `/api/portal/querschnitt/dokumente/[id]/freigabe` | POST | { status: eingegangen·in_pruefung·freigegeben·abgelehnt, kommentar } (nur Backoffice) |
| `/api/portal/querschnitt/dokumente/[id]/version` | POST | multipart: datei · neue Version eines Dokuments |
| `/api/portal/querschnitt/dokumente/[id]/versionen` | GET | Versionskette (älteste zuerst), nur sichtbare Versionen |
| `/api/portal/querschnitt/rhythmus` | GET, PUT | { rhythmus, digestZuletzt, vorgemerkt } |
| `/api/portal/sicherheit/geraete/[id]` | DELETE | Gerät vergessen (2FA wird dort wieder abgefragt) |
| `/api/portal/sicherheit/pflicht` | GET, PUT | Pflicht-2FA je Rolle (Backoffice) { ok, pflicht {rollen, umgebung, wirksam, kontenOhne2fa} } |
| `/api/portal/sicherheit` | GET | Überblick für /portal/sicherheit: |
| `/api/portal/sicherheit/sitzungen/[id]` | DELETE | eine eigene Sitzung beenden (sofort ungültig; die aktuelle = Abmelden) |
| `/api/portal/sicherheit/sitzungen` | GET, POST | aktive Sitzungen { ok, sitzungen } |
| `/api/portal/sicherheit/zwei-faktor` | POST | Zwei-Faktor-Anmeldung verwalten, { aktion, code?, passwort? }: |
| `/api/portal/signatur/[id]/pdf` | GET | PDF (nur Beteiligte/Backoffice, Abruf protokolliert) |
| `/api/portal/signatur/[id]` | GET, POST | Vorgang (Unterzeichner: eigener Eintrag vollständig, andere ohne E-Mail/Browser, IP maskiert) |
| `/api/portal/signatur` | GET | eigene Signaturvorgänge (als Unterzeichner bzw. Ersteller) |
| `/api/portal/status` | POST | Statuswechsel durch den Eigentümer |
| `/api/portal/suche` | GET | globale Suche der Befehlspalette (Strg/⌘+K) |
| `/api/portal/suchprofil` | PUT | Suchprofil des Investors { mwpMin, mwpMax, phasen[], laender[], typen[], ticketMin, ticketMax, benachrichtigen, schwelle (50–100, Standard 70) } |
| `/api/portal/support/[id]/anhang/[aid]` | GET | Anhang herunterladen (nur Beteiligte/Backoffice) |
| `/api/portal/support/[id]/anhang` | POST | multipart: datei (PDF/JPG/PNG ≤ 10 MB, Typ an den ersten Bytes), Kopfzeile X-Plattform-Upload: 1 |
| `/api/portal/support/[id]` | GET, POST, PATCH | Ticket mit Verlauf (Kunde ohne interne Notizen) |
| `/api/portal/support` | GET, POST | eigene Tickets bzw. Tickets der Organisation |
| `/api/portal/termine/[id]/ics` | GET | Kalenderdatei (RFC 5545) des Termins |
| `/api/portal/termine/[id]` | GET, PATCH | Termin (Kunde: eigener; Mitarbeiter: zugewiesener; Backoffice: alle) |
| `/api/portal/termine/oeffentlich` | POST | öffentliche Terminbuchung (Website /termin, Kontakt- und Flächencheck-Formulare) |
| `/api/portal/termine/oeffentlich/verwalten` | POST | Termin per Einmal-Link aus der E-Mail (Token, nur Hash gespeichert) |
| `/api/portal/termine` | GET, POST | eigene Termine (Kunde) bzw. eigene Termine als Mitarbeiter |
| `/api/portal/termine/slots` | GET | freie Zeitfenster (öffentliche Terminarten ohne Anmeldung; |
| `/api/portal/vorgaenge/[id]` | GET | eine Anfrage (nur Eigentümer oder Admin) |
| `/api/portal/vorgaenge` | GET | eigene Anfragen |
| `/api/rechner/bericht/bestaetigen` | GET, POST | Double-Opt-in des Berichts (Welle 2, Paket B4) |
| `/api/rechner/bericht` | GET, POST | Bericht-Baustein (Welle 2, Paket B4) |

## Frappe-Methoden (Adapter → `oekoinvest_app.plattform.api.*`)

Jede Zeile: whitelisted Methode ← Operation des Backend-Vertrags (Demo und Frappe signaturgleich).

| Methode | Operation | Adapter |
|---|---|---|
| `admin.admin_konten` | `adminKonten` | `backend/frappe.js` |
| `admin.aktivitaeten` | `aktivitaeten` | `backend/frappe.js` |
| `admin.nutzer_aendern` | `nutzerAendern` | `backend/frappe.js` |
| `admin.nutzer_liste` | `nutzerListe` | `backend/frappe.js` |
| `admin.protokoll_eintrag` | `protokollEintrag` | `backend/frappe.js` |
| `admin.provisionen` | `provisionen` | `backend/frappe.js` |
| `admin.uebersicht` | `adminUebersicht` | `backend/frappe.js` |
| `admin.zuweisen` | `zuweisen` | `backend/frappe.js` |
| `anbieter.admin_aktion` | `anbieterAdminAktion` | `backend/frappe/anbieter.js` |
| `anbieter.akte` | `anbieterAkte` | `backend/frappe/anbieter.js` |
| `anbieter.aktion` | `anbieterAktion` | `backend/frappe/anbieter.js` |
| `anbieter.cockpit` | `anbieterCockpit` | `backend/frappe/anbieter.js` |
| `anbieter.frist_lauf` | `anbieterFristLauf` | `backend/frappe/anbieter.js` |
| `anbieter.vermittlungsauftrag_daten` | `vermittlungsauftragDaten` | `backend/frappe/anbieter.js` |
| `anfrage.anlegen` | `anfrageAnlegen` | `backend/frappe.js` |
| `anlagen.aendern` | `anlageAendern` | `backend/frappe/anlagen.js` |
| `anlagen.anlegen` | `anlageAnlegen` | `backend/frappe/anlagen.js` |
| `anlagen.eintrag_loeschen` | `anlageEintragLoeschen` | `backend/frappe/anlagen.js` |
| `anlagen.eintrag_speichern` | `anlageEintragSpeichern` | `backend/frappe/anlagen.js` |
| `anlagen.geraet` | `geraetZugang` | `backend/frappe/anlagen.js` |
| `anlagen.geraet_aktion` | `geraetZugangAktion` | `backend/frappe/anlagen.js` |
| `anlagen.geraet_anlegen` | `geraetZugangAnlegen` | `backend/frappe/anlagen.js` |
| `anlagen.holen` | `anlage` | `backend/frappe/anlagen.js` |
| `anlagen.kunden` | `anlagenKunden` | `backend/frappe/anlagen.js` |
| `anlagen.leitstand` | `anlagenLeitstand` | `backend/frappe/anlagen.js` |
| `anlagen.liste` | `anlagen` | `backend/frappe/anlagen.js` |
| `anlagen.monatswerte` | `zaehlerMonatswerte` | `backend/frappe/anlagen.js` |
| `anlagen.stoerung_aktion` | `stoerungAktion` | `backend/frappe/anlagen.js` |
| `anlagen.stoerung_anlegen` | `stoerungAnlegen` | `backend/frappe/anlagen.js` |
| `anlagen.stoerungen` | `stoerungen` | `backend/frappe/anlagen.js` |
| `aufgabe.aendern` | `aufgabeAendern` | `backend/frappe.js` |
| `aufgabe.anlegen` | `aufgabeAnlegen` | `backend/frappe.js` |
| `aufgabe.liste` | `aufgaben` | `backend/frappe.js` |
| `auth.anmelden` | `anmelden` | `backend/frappe.js` |
| `auth.email_bestaetigen` | `emailBestaetigen` | `backend/frappe.js` |
| `auth.nutzer_fuer_sitzung` | `nutzerFuerSitzung` | `backend/frappe.js` |
| `auth.passwort_setzen` | `passwortSetzen` | `backend/frappe.js` |
| `auth.passwort_vergessen` | `passwortVergessen` | `backend/frappe.js` |
| `auth.registrieren` | `registrieren` | `backend/frappe.js` |
| `automation.fristen_pruefen` | `fristenPruefen` | `backend/frappe/backoffice.js` |
| `automation.liste` | `automationen` | `backend/frappe/backoffice.js` |
| `automation.loeschen` | `automationLoeschen` | `backend/frappe/backoffice.js` |
| `automation.speichern` | `automationSpeichern` | `backend/frappe/backoffice.js` |
| `automation.tag_setzen` | `objektTagSetzen` | `backend/frappe/backoffice.js` |
| `automation.testlauf` | `automationTestlauf` | `backend/frappe/backoffice.js` |
| `automation.vorlage_senden` | `vorlageSenden` | `backend/frappe/backoffice.js` |
| `automation.vorlage_speichern` | `vorlageSpeichern` | `backend/frappe/backoffice.js` |
| `automation.vorlage_vorschau` | `vorlageVorschau` | `backend/frappe/backoffice.js` |
| `automation.vorlage_wiederherstellen` | `vorlageWiederherstellen` | `backend/frappe/backoffice.js` |
| `automation.vorlagen` | `vorlagen` | `backend/frappe/backoffice.js` |
| `bankakte.akte` | `baAkte` | `backend/frappe/bankakte.js` |
| `bankakte.aktion` | `baAktion` | `backend/frappe/bankakte.js` |
| `bankakte.bericht_daten` | `baBerichtDaten` | `backend/frappe/bankakte.js` |
| `bankakte.datei_lesen` | `baDateiLesen` | `backend/frappe/bankakte.js` |
| `bankakte.datei_speichern` | `baDateiSpeichern` | `backend/frappe/bankakte.js` |
| `bankakte.staende` | `baStaende` | `backend/frappe/bankakte.js` |
| `bankakte.team` | `baTeam` | `backend/frappe/bankakte.js` |
| `bankakte.team_aktion` | `baTeamAktion` | `backend/frappe/bankakte.js` |
| `bankakte.team_einladung_annehmen` | `baTeamEinladungAnnehmen` | `backend/frappe/bankakte.js` |
| `bankakte.team_einladung_info` | `baTeamEinladungInfo` | `backend/frappe/bankakte.js` |
| `bedienung.onboarding` | `onboarding` | `backend/frappe.js` |
| `bedienung.onboarding_speichern` | `onboardingSpeichern` | `backend/frappe.js` |
| `bedienung.suchen` | `suchen` | `backend/frappe.js` |
| `benachrichtigung.einstellungen_speichern` | `mailEinstellungenSpeichern` | `backend/frappe.js` |
| `benachrichtigung.gelesen` | `benachrichtigungenGelesen` | `backend/frappe.js` |
| `benachrichtigung.liste` | `benachrichtigungen` | `backend/frappe.js` |
| `bericht.anfordern` | `berichtAnfordern` | `backend/frappe/bericht.js` |
| `bericht.aufraeumen` | `berichtAufraeumen` | `backend/frappe/bericht.js` |
| `bericht.bestaetigen` | `berichtBestaetigen` | `backend/frappe/bericht.js` |
| `bericht.lesen` | `berichtLesen` | `backend/frappe/bericht.js` |
| `berichte.bericht` | `bericht` | `backend/frappe/backoffice.js` |
| `berichte.kette_pruefen` | `protokollKette` | `backend/frappe/backoffice.js` |
| `berichte.rechte` | `backofficeRechte` | `backend/frappe/backoffice.js` |
| `berichte.rollen_setzen` | `backofficeRollenSetzen` | `backend/frappe/backoffice.js` |
| `betrieb.anlage` | `betriebAnlage` | `backend/frappe/betrieb.js` |
| `betrieb.auftrag` | `betriebAuftrag` | `backend/frappe/betrieb.js` |
| `betrieb.auftrag_aktion` | `betriebAuftragAktion` | `backend/frappe/betrieb.js` |
| `betrieb.auftrag_speichern` | `betriebAuftragSpeichern` | `backend/frappe/betrieb.js` |
| `betrieb.bericht_daten` | `betriebBerichtDaten` | `backend/frappe/betrieb.js` |
| `betrieb.einstrahlung_speichern` | `betriebEinstrahlungSpeichern` | `backend/frappe/betrieb.js` |
| `betrieb.ersatzteil_bewegung` | `betriebErsatzteilBewegung` | `backend/frappe/betrieb.js` |
| `betrieb.ersatzteil_speichern` | `betriebErsatzteilSpeichern` | `backend/frappe/betrieb.js` |
| `betrieb.lauf` | `betriebLauf` | `backend/frappe/betrieb.js` |
| `betrieb.monatswert_freigeben` | `betriebMonatswertFreigeben` | `backend/frappe/betrieb.js` |
| `betrieb.plaene_vorschlagen` | `betriebPlaeneVorschlagen` | `backend/frappe/betrieb.js` |
| `betrieb.plan_loeschen` | `betriebPlanLoeschen` | `backend/frappe/betrieb.js` |
| `betrieb.plan_speichern` | `betriebPlanSpeichern` | `backend/frappe/betrieb.js` |
| `betrieb.protokoll` | `betriebProtokoll` | `backend/frappe/betrieb.js` |
| `betrieb.protokoll_speichern` | `betriebProtokollSpeichern` | `backend/frappe/betrieb.js` |
| `betrieb.stoerung` | `betriebStoerung` | `backend/frappe/betrieb.js` |
| `betrieb.stoerung_beheben` | `betriebStoerungBeheben` | `backend/frappe/betrieb.js` |
| `betrieb.stoerung_speichern` | `betriebStoerungSpeichern` | `backend/frappe/betrieb.js` |
| `betrieb.uebersicht` | `betriebUebersicht` | `backend/frappe/betrieb.js` |
| `betrieb.versicherung_aktion` | `betriebVersicherungAktion` | `backend/frappe/betrieb.js` |
| `betrieb.versicherung_speichern` | `betriebVersicherungSpeichern` | `backend/frappe/betrieb.js` |
| `bieter.aktion` | `bieterAktion` | `backend/frappe/dealroom.js` |
| `bieter.gebot_abgeben` | `gebotAbgeben` | `backend/frappe/dealroom.js` |
| `bieter.gebot_zurueckziehen` | `gebotZurueckziehen` | `backend/frappe/dealroom.js` |
| `bieter.liste` | `bieterverfahrenListe` | `backend/frappe/dealroom.js` |
| `bieter.starten` | `bieterStarten` | `backend/frappe/dealroom.js` |
| `bieter.verfahren` | `bieterverfahren` | `backend/frappe/dealroom.js` |
| `boerse.detail` | `boerseDetail` | `backend/frappe.js` |
| `boerse.expose` | `exposeDaten` | `backend/frappe.js` |
| `boerse.liste` | `boerse` | `backend/frappe.js` |
| `buchhaltung.abschluss` | `bhAbschluss` | `backend/frappe/werkzeuge.js` |
| `buchhaltung.abschluss_aktion` | `bhAbschlussAktion` | `backend/frappe/werkzeuge.js` |
| `buchhaltung.beleg_dokument` | `bhBelegDokument` | `backend/frappe/werkzeuge.js` |
| `buchhaltung.einstellungen_speichern` | `bhEinstellungenSpeichern` | `backend/frappe/werkzeuge.js` |
| `buchhaltung.export` | `bhExport` | `backend/frappe/werkzeuge.js` |
| `buchhaltung.mahnlauf` | `bhMahnlauf` | `backend/frappe/werkzeuge.js` |
| `buchhaltung.mahnsperre` | `bhMahnsperre` | `backend/frappe/werkzeuge.js` |
| `buchhaltung.meine_dokumente` | `bhMeineDokumente` | `backend/frappe/werkzeuge.js` |
| `buchhaltung.storno` | `bhStorno` | `backend/frappe/werkzeuge.js` |
| `buchhaltung.uebersicht` | `bhUebersicht` | `backend/frappe/werkzeuge.js` |
| `buchhaltung.zahlung_aktion` | `bhZahlungAktion` | `backend/frappe/werkzeuge.js` |
| `buchhaltung.zahlung_import` | `bhZahlungImport` | `backend/frappe/werkzeuge.js` |
| `closing.cl_aendern` | `clAendern` | `backend/frappe/closing.js` |
| `closing.cl_akte` | `clAkte` | `backend/frappe/closing.js` |
| `closing.cl_aktion` | `clAktion` | `backend/frappe/closing.js` |
| `closing.cl_anlegen` | `clAnlegen` | `backend/frappe/closing.js` |
| `closing.cl_dokument_daten` | `clDokumentDaten` | `backend/frappe/closing.js` |
| `closing.cl_fristen_lauf` | `clFristenLauf` | `backend/frappe/closing.js` |
| `closing.cl_liste` | `clListe` | `backend/frappe/closing.js` |
| `closing.cl_meine` | `clMeine` | `backend/frappe/closing.js` |
| `closing.cl_portal_aktion` | `clPortalAktion` | `backend/frappe/closing.js` |
| `closing.cl_termin` | `clTermin` | `backend/frappe/closing.js` |
| `closing.gb_aendern` | `gbAendern` | `backend/frappe/closing.js` |
| `closing.gb_akte` | `gbAkte` | `backend/frappe/closing.js` |
| `closing.gb_anlegen` | `gbAnlegen` | `backend/frappe/closing.js` |
| `closing.gb_auswahl` | `gbAuswahl` | `backend/frappe/closing.js` |
| `closing.gb_dokument_lesen` | `gbDokumentLesen` | `backend/frappe/closing.js` |
| `closing.gb_dokument_speichern` | `gbDokumentSpeichern` | `backend/frappe/closing.js` |
| `closing.gb_fristen_lauf` | `gbFristenLauf` | `backend/frappe/closing.js` |
| `closing.gb_liste` | `gbListe` | `backend/frappe/closing.js` |
| `closing.gb_meine` | `gbMeine` | `backend/frappe/closing.js` |
| `closing.gb_muster_daten` | `gbMusterDaten` | `backend/frappe/closing.js` |
| `closing.gb_schritt` | `gbSchritt` | `backend/frappe/closing.js` |
| `closing.gb_signatur` | `gbSignatur` | `backend/frappe/closing.js` |
| `closing.gb_zu_bezug` | `gbZuBezug` | `backend/frappe/closing.js` |
| `crm.akquise` | `akquise` | `backend/frappe/backoffice.js` |
| `crm.akquise_setzen` | `akquiseSetzen` | `backend/frappe/backoffice.js` |
| `crm.akquise_zuweisen` | `akquiseZuweisen` | `backend/frappe/backoffice.js` |
| `crm.aktivitaet_anlegen` | `crmAktivitaetAnlegen` | `backend/frappe/backoffice.js` |
| `crm.beziehung` | `crmBeziehung` | `backend/frappe/backoffice.js` |
| `crm.dubletten` | `crmDubletten` | `backend/frappe/backoffice.js` |
| `crm.gebiete` | `gebiete` | `backend/frappe/backoffice.js` |
| `crm.gebiete_speichern` | `gebieteSpeichern` | `backend/frappe/backoffice.js` |
| `crm.kontakt` | `crmKontakt` | `backend/frappe/backoffice.js` |
| `crm.kontakt_speichern` | `crmKontaktSpeichern` | `backend/frappe/backoffice.js` |
| `crm.kontakte` | `crmKontakte` | `backend/frappe/backoffice.js` |
| `crm.massenaktion` | `crmMassenaktion` | `backend/frappe/backoffice.js` |
| `crm.organisation` | `crmOrganisation` | `backend/frappe/backoffice.js` |
| `crm.organisation_speichern` | `crmOrganisationSpeichern` | `backend/frappe/backoffice.js` |
| `crm.organisationen` | `crmOrganisationen` | `backend/frappe/backoffice.js` |
| `crm.zusammenfuehren` | `crmZusammenfuehren` | `backend/frappe/backoffice.js` |
| `datenschutz.aktion` | `dsAktion` | `backend/frappe/werkzeuge.js` |
| `datenschutz.anlegen` | `dsAnlegen` | `backend/frappe/werkzeuge.js` |
| `datenschutz.export` | `dsExport` | `backend/frappe/werkzeuge.js` |
| `datenschutz.kyc_sla` | `kycSlaUebersicht` | `backend/frappe/werkzeuge.js` |
| `datenschutz.uebersicht` | `dsUebersicht` | `backend/frappe/werkzeuge.js` |
| `datenschutz.verdacht_aktion` | `verdachtAktion` | `backend/frappe/werkzeuge.js` |
| `datenschutz.verdacht_liste` | `verdachtListe` | `backend/frappe/werkzeuge.js` |
| `datenschutz.verdacht_melden` | `verdachtMelden` | `backend/frappe/werkzeuge.js` |
| `datenschutz.vvt_export` | `vvtExport` | `backend/frappe/werkzeuge.js` |
| `dealroom.cockpit` | `dealCockpit` | `backend/frappe/dealroom.js` |
| `dealroom.datenraum` | `datenraum` | `backend/frappe/dealroom.js` |
| `dealroom.dokument` | `datenraumDokument` | `backend/frappe/dealroom.js` |
| `dealroom.einordnen` | `datenraumEinordnen` | `backend/frappe/dealroom.js` |
| `dealroom.kontakt_freigabe` | `kontaktFreigabe` | `backend/frappe/dealroom.js` |
| `dealroom.kopf` | `dealroomKopf` | `backend/frappe/dealroom.js` |
| `dealroom.notiz_speichern` | `notizSpeichern` | `backend/frappe/dealroom.js` |
| `dealroom.pipeline` | `pipeline` | `backend/frappe/dealroom.js` |
| `dealroom.suchprofile_speichern` | `suchprofileSpeichern` | `backend/frappe/dealroom.js` |
| `dealroom.uebersicht` | `dealroomUebersicht` | `backend/frappe/dealroom.js` |
| `dealroom.zugriffe` | `datenraumZugriffe` | `backend/frappe/dealroom.js` |
| `dienste.bonitaet_beauftragen` | `bonitaetBeauftragen` | `backend/frappe/dienste.js` |
| `dienste.bonitaet_detail` | `bonitaetDetail` | `backend/frappe/dienste.js` |
| `dienste.bonitaet_einstellungen_speichern` | `bonitaetEinstellungenSpeichern` | `backend/frappe/dienste.js` |
| `dienste.bonitaet_freigeben` | `bonitaetFreigeben` | `backend/frappe/dienste.js` |
| `dienste.bonitaet_status` | `bonitaetStatus` | `backend/frappe/dienste.js` |
| `dienste.bonitaet_uebersicht` | `bonitaetUebersicht` | `backend/frappe/dienste.js` |
| `dienste.gesellschaft_aendern` | `gesellschaftAendern` | `backend/frappe/dienste.js` |
| `dienste.gesellschaft_anlegen` | `gesellschaftAnlegen` | `backend/frappe/dienste.js` |
| `dienste.gesellschaft_auswahl` | `gesellschaftAuswahl` | `backend/frappe/dienste.js` |
| `dienste.gesellschaft_erp` | `gesellschaftErp` | `backend/frappe/dienste.js` |
| `dienste.gesellschaft_fristen` | `gesellschaftFristen` | `backend/frappe/dienste.js` |
| `dienste.gesellschaft_holen` | `gesellschaft` | `backend/frappe/dienste.js` |
| `dienste.gesellschaft_namen_pruefen` | `gesellschaftNamenPruefen` | `backend/frappe/dienste.js` |
| `dienste.gesellschaft_paketdaten` | `gesellschaftPaketdaten` | `backend/frappe/dienste.js` |
| `dienste.gesellschaft_schritt` | `gesellschaftSchritt` | `backend/frappe/dienste.js` |
| `dienste.gesellschaften_liste` | `gesellschaftenListe` | `backend/frappe/dienste.js` |
| `dienste.ident_demo_abschluss` | `identDemoAbschluss` | `backend/frappe/dienste.js` |
| `dienste.ident_starten` | `identStarten` | `backend/frappe/dienste.js` |
| `dienste.ident_status` | `identStatus` | `backend/frappe/dienste.js` |
| `dienste.mrz_pruefen` | `mrzPruefen` | `backend/frappe/dienste.js` |
| `dienste.register_abruf` | `registerAbruf` | `backend/frappe/dienste.js` |
| `dienste.register_auskuenfte` | `registerAuskuenfte` | `backend/frappe/dienste.js` |
| `dienste.register_auskunft` | `registerAuskunft` | `backend/frappe/dienste.js` |
| `dienste.register_suche` | `registerSuche` | `backend/frappe/dienste.js` |
| `dokument.lesen` | `dokumentLesen` | `backend/frappe.js` |
| `dokument.liste` | `dokumente` | `backend/frappe.js` |
| `dokument.loeschen` | `dokumentLoeschen` | `backend/frappe.js` |
| `dokument.speichern` | `dokumentSpeichern` | `backend/frappe.js` |
| `eg_abrechnung.beleg_pdf` | `abBelegPdf` | `backend/frappe/eg-abrechnung.js` |
| `eg_abrechnung.belege` | `abBelege` | `backend/frappe/eg-abrechnung.js` |
| `eg_abrechnung.buchung_speichern` | `abBuchungSpeichern` | `backend/frappe/eg-abrechnung.js` |
| `eg_abrechnung.buchungen` | `abBuchungen` | `backend/frappe/eg-abrechnung.js` |
| `eg_abrechnung.camt_import` | `abCamtImport` | `backend/frappe/eg-abrechnung.js` |
| `eg_abrechnung.einstellungen_speichern` | `abEinstellungenSpeichern` | `backend/frappe/eg-abrechnung.js` |
| `eg_abrechnung.export` | `abExport` | `backend/frappe/eg-abrechnung.js` |
| `eg_abrechnung.jahresbescheinigung` | `abJahresbescheinigung` | `backend/frappe/eg-abrechnung.js` |
| `eg_abrechnung.kleinunternehmer` | `abKleinunternehmer` | `backend/frappe/eg-abrechnung.js` |
| `eg_abrechnung.mahnlauf` | `abMahnlauf` | `backend/frappe/eg-abrechnung.js` |
| `eg_abrechnung.mandate` | `abMandate` | `backend/frappe/eg-abrechnung.js` |
| `eg_abrechnung.periode_aktion` | `abPeriodeAktion` | `backend/frappe/eg-abrechnung.js` |
| `eg_abrechnung.periode_anlegen` | `abPeriodeAnlegen` | `backend/frappe/eg-abrechnung.js` |
| `eg_abrechnung.perioden` | `abPerioden` | `backend/frappe/eg-abrechnung.js` |
| `eg_abrechnung.pruefvermerk` | `abPruefvermerk` | `backend/frappe/eg-abrechnung.js` |
| `eg_abrechnung.zahlung_erfassen` | `abZahlungErfassen` | `backend/frappe/eg-abrechnung.js` |
| `eg_abrechnung.zahlungslauf` | `abZahlungslauf` | `backend/frappe/eg-abrechnung.js` |
| `eg_abrechnung.zahlungslauf_aktion` | `abZahlungslaufAktion` | `backend/frappe/eg-abrechnung.js` |
| `eg_eda.abmelden` | `edaAbmelden` | `backend/frappe/eg-eda.js` |
| `eg_eda.anmelden` | `edaAnmelden` | `backend/frappe/eg-eda.js` |
| `eg_eda.ausgang` | `edaAusgang` | `backend/frappe/eg-eda.js` |
| `eg_eda.ausgang_quittung` | `edaAusgangQuittung` | `backend/frappe/eg-eda.js` |
| `eg_eda.erinnern` | `edaErinnern` | `backend/frappe/eg-eda.js` |
| `eg_eda.erneut_anstossen` | `edaErneutAnstossen` | `backend/frappe/eg-eda.js` |
| `eg_eda.freigaben` | `edaFreigaben` | `backend/frappe/eg-eda.js` |
| `eg_eda.freigeben` | `edaFreigeben` | `backend/frappe/eg-eda.js` |
| `eg_eda.fristen_lauf` | `edaFristenLauf` | `backend/frappe/eg-eda.js` |
| `eg_eda.gemeinschaft_bereit` | `edaGemeinschaftBereit` | `backend/frappe/eg-eda.js` |
| `eg_eda.journal` | `edaJournal` | `backend/frappe/eg-eda.js` |
| `eg_eda.nachforderung` | `edaNachforderung` | `backend/frappe/eg-eda.js` |
| `eg_eda.nachricht_eingang` | `edaNachrichtEingang` | `backend/frappe/eg-eda.js` |
| `eg_eda.podlist_anfordern` | `edaPodlistAnfordern` | `backend/frappe/eg-eda.js` |
| `eg_eda.prozess` | `edaProzess` | `backend/frappe/eg-eda.js` |
| `eg_eda.prozesse` | `edaProzesse` | `backend/frappe/eg-eda.js` |
| `eg_eda.reklamation` | `edaReklamation` | `backend/frappe/eg-eda.js` |
| `eg_eda.simulator` | `edaSimulator` | `backend/frappe/eg-eda.js` |
| `eg_eda.tf_aendern` | `edaTfAendern` | `backend/frappe/eg-eda.js` |
| `eg_eda.uebersicht` | `edaUebersicht` | `backend/frappe/eg-eda.js` |
| `eg_eda.verteilschluessel_senden` | `edaVerteilschluesselSenden` | `backend/frappe/eg-eda.js` |
| `eg_energie.abweichungsbericht` | `enAbweichungsbericht` | `backend/frappe/eg-energie.js` |
| `eg_energie.csv_import` | `enCsvImport` | `backend/frappe/eg-energie.js` |
| `eg_energie.energiedaten_empfangen` | `enEnergiedatenEmpfangen` | `backend/frappe/eg-energie.js` |
| `eg_energie.messreihen` | `enMessreihen` | `backend/frappe/eg-energie.js` |
| `eg_energie.optimierung` | `enOptimierung` | `backend/frappe/eg-energie.js` |
| `eg_energie.periodenwerte` | `enPeriodenwerte` | `backend/frappe/eg-energie.js` |
| `eg_energie.prognose` | `enPrognose` | `backend/frappe/eg-energie.js` |
| `eg_energie.qualitaet` | `enQualitaet` | `backend/frappe/eg-energie.js` |
| `eg_energie.simulation` | `enSimulation` | `backend/frappe/eg-energie.js` |
| `eg_energie.simulationen` | `enSimulationen` | `backend/frappe/eg-energie.js` |
| `eg_gruendung.aufloesung` | `grAufloesung` | `backend/frappe/eg-gruendung.js` |
| `eg_gruendung.auftraege` | `grAuftraege` | `backend/frappe/eg-gruendung.js` |
| `eg_gruendung.auftrag` | `grAuftrag` | `backend/frappe/eg-gruendung.js` |
| `eg_gruendung.auftrag_aktion` | `grAuftragAktion` | `backend/frappe/eg-gruendung.js` |
| `eg_gruendung.auftrag_anlegen` | `grAuftragAnlegen` | `backend/frappe/eg-gruendung.js` |
| `eg_gruendung.dokument_erzeugen` | `grDokumentErzeugen` | `backend/frappe/eg-gruendung.js` |
| `eg_gruendung.foerdercheck` | `grFoerdercheck` | `backend/frappe/eg-gruendung.js` |
| `eg_gruendung.import_ausfuehren` | `grImportAusfuehren` | `backend/frappe/eg-gruendung.js` |
| `eg_gruendung.import_vorschau` | `grImportVorschau` | `backend/frappe/eg-gruendung.js` |
| `eg_gruendung.schritt_aktion` | `grSchrittAktion` | `backend/frappe/eg-gruendung.js` |
| `eg_gruendung.versammlungen` | `grVersammlungen` | `backend/frappe/eg-gruendung.js` |
| `eg_portal.beitritt_antrag` | `ptBeitrittAntrag` | `backend/frappe/eg-portal.js` |
| `eg_portal.belege` | `ptBelege` | `backend/frappe/eg-portal.js` |
| `eg_portal.datenauskunft` | `ptDatenauskunft` | `backend/frappe/eg-portal.js` |
| `eg_portal.energie` | `ptEnergie` | `backend/frappe/eg-portal.js` |
| `eg_portal.gemeinde_sicht` | `ptGemeindeSicht` | `backend/frappe/eg-portal.js` |
| `eg_portal.gemeinschaft` | `ptGemeinschaft` | `backend/frappe/eg-portal.js` |
| `eg_portal.interesse` | `ptInteresse` | `backend/frappe/eg-portal.js` |
| `eg_portal.kuendigung` | `ptKuendigung` | `backend/frappe/eg-portal.js` |
| `eg_portal.rechner` | `ptRechner` | `backend/frappe/eg-portal.js` |
| `eg_portal.tf_wuensche` | `ptTfWuensche` | `backend/frappe/eg-portal.js` |
| `eg_portal.tf_wunsch` | `ptTfWunsch` | `backend/frappe/eg-portal.js` |
| `eg_portal.tf_wunsch_umsetzen` | `ptTfWunschUmsetzen` | `backend/frappe/eg-portal.js` |
| `eg_portal.uebersicht` | `ptUebersicht` | `backend/frappe/eg-portal.js` |
| `eg_stamm.anlage_speichern` | `egAnlageSpeichern` | `backend/frappe/eg-stamm.js` |
| `eg_stamm.csv_export` | `egCsvExport` | `backend/frappe/eg-stamm.js` |
| `eg_stamm.csv_import` | `egCsvImport` | `backend/frappe/eg-stamm.js` |
| `eg_stamm.gemeinschaft` | `egGemeinschaft` | `backend/frappe/eg-stamm.js` |
| `eg_stamm.gemeinschaft_speichern` | `egGemeinschaftSpeichern` | `backend/frappe/eg-stamm.js` |
| `eg_stamm.gemeinschaft_status` | `egGemeinschaftStatus` | `backend/frappe/eg-stamm.js` |
| `eg_stamm.gemeinschaften` | `egGemeinschaften` | `backend/frappe/eg-stamm.js` |
| `eg_stamm.kontext` | `egKontext` | `backend/frappe/eg-stamm.js` |
| `eg_stamm.massenaktion` | `egMassenaktion` | `backend/frappe/eg-stamm.js` |
| `eg_stamm.migration_ausfuehren` | `egMigrationAusfuehren` | `backend/frappe/eg-stamm.js` |
| `eg_stamm.migration_vorschau` | `egMigrationVorschau` | `backend/frappe/eg-stamm.js` |
| `eg_stamm.mitglied_speichern` | `egMitgliedSpeichern` | `backend/frappe/eg-stamm.js` |
| `eg_stamm.mitglied_status` | `egMitgliedStatus` | `backend/frappe/eg-stamm.js` |
| `eg_stamm.netzbetreiber` | `egNetzbetreiber` | `backend/frappe/eg-stamm.js` |
| `eg_stamm.netzentgelt_regeln` | `egNetzentgeltRegeln` | `backend/frappe/eg-stamm.js` |
| `eg_stamm.organ_beenden` | `egOrganBeenden` | `backend/frappe/eg-stamm.js` |
| `eg_stamm.organ_speichern` | `egOrganSpeichern` | `backend/frappe/eg-stamm.js` |
| `eg_stamm.tarif_speichern` | `egTarifSpeichern` | `backend/frappe/eg-stamm.js` |
| `eg_stamm.teilnahme_speichern` | `egTeilnahmeSpeichern` | `backend/frappe/eg-stamm.js` |
| `eg_stamm.teilnahme_uebergang` | `egTeilnahmeUebergang` | `backend/frappe/eg-stamm.js` |
| `eg_stamm.verteilschluessel_speichern` | `egVerteilschluesselSpeichern` | `backend/frappe/eg-stamm.js` |
| `eg_stamm.verteilschluessel_status` | `egVerteilschluesselStatus` | `backend/frappe/eg-stamm.js` |
| `eg_stamm.verwaltung` | `egVerwaltung` | `backend/frappe/eg-stamm.js` |
| `eg_stamm.zaehlpunkt_speichern` | `egZaehlpunktSpeichern` | `backend/frappe/eg-stamm.js` |
| `eid.eid_abschluss` | `eidAbschluss` | `backend/frappe/eid.js` |
| `eid.eid_demo_code` | `eidDemoCode` | `backend/frappe/eid.js` |
| `eid.eid_einstellungen` | `eidEinstellungen` | `backend/frappe/eid.js` |
| `eid.eid_einstellungen_speichern` | `eidEinstellungenSpeichern` | `backend/frappe/eid.js` |
| `eid.eid_starten` | `eidStarten` | `backend/frappe/eid.js` |
| `eid.eid_status` | `eidStatus` | `backend/frappe/eid.js` |
| `einwilligung.absage_setzen` | `leadAbsageSetzen` | `backend/frappe/leadkette.js` |
| `einwilligung.ip_aufraeumen` | `leadIpAufraeumen` | `backend/frappe/leadkette.js` |
| `einwilligung.kanal_stand` | `leadKanalStand` | `backend/frappe/leadkette.js` |
| `einwilligung.kette_pruefen` | `leadKetteStatus` | `backend/frappe/leadkette.js` |
| `einwilligung.lead_desk` | `leadDesk` | `backend/frappe/leadkette.js` |
| `einwilligung.person_loeschen` | `leadPersonLoeschen` | `backend/frappe/leadkette.js` |
| `einwilligung.protokoll_anhaengen` | `leadProtokollAnhaengen` | `backend/frappe/leadkette.js` |
| `einwilligung.werbekanal_erlaubt` | `leadWerbekanalErlaubt` | `backend/frappe/leadkette.js` |
| `einwilligung.widerrufen` | `leadWiderrufen` | `backend/frappe/leadkette.js` |
| `energie.angebot_abgeben` | `energieAngebotAbgeben` | `backend/frappe/energie.js` |
| `energie.angebot_zurueckziehen` | `energieAngebotZurueckziehen` | `backend/frappe/energie.js` |
| `energie.ausschreibung` | `energieAusschreibung` | `backend/frappe/energie.js` |
| `energie.ausschreibung_aktion` | `energieAusschreibungAktion` | `backend/frappe/energie.js` |
| `energie.ausschreibung_anlegen` | `energieAusschreibungAnlegen` | `backend/frappe/energie.js` |
| `energie.ausschreibungen` | `energieAusschreibungen` | `backend/frappe/energie.js` |
| `energie.dokument_daten` | `energieDokumentDaten` | `backend/frappe/energie.js` |
| `energie.einladung_annehmen` | `energieEinladungAnnehmen` | `backend/frappe/energie.js` |
| `energie.einladung_info` | `energieEinladungInfo` | `backend/frappe/energie.js` |
| `energie.einstellungen` | `energieEinstellungen` | `backend/frappe/energie.js` |
| `energie.einstellungen_speichern` | `energieEinstellungenSpeichern` | `backend/frappe/energie.js` |
| `energie.frage_stellen` | `energieFrageStellen` | `backend/frappe/energie.js` |
| `energie.freigabe` | `energieFreigabe` | `backend/frappe/energie.js` |
| `energie.kunde` | `energieKunde` | `backend/frappe/energie.js` |
| `energie.kunden` | `energieKunden` | `backend/frappe/energie.js` |
| `energie.lauf` | `energieLauf` | `backend/frappe/energie.js` |
| `energie.lieferant` | `energieLieferant` | `backend/frappe/energie.js` |
| `energie.lieferant_bewerten` | `energieLieferantBewerten` | `backend/frappe/energie.js` |
| `energie.lieferant_einladen` | `energieLieferantEinladen` | `backend/frappe/energie.js` |
| `energie.lieferant_speichern` | `energieLieferantSpeichern` | `backend/frappe/energie.js` |
| `energie.lieferanten` | `energieLieferanten` | `backend/frappe/energie.js` |
| `energie.meine` | `energieMeine` | `backend/frappe/energie.js` |
| `energie.portfolio` | `energiePortfolio` | `backend/frappe/energie.js` |
| `energie.spot` | `energieSpot` | `backend/frappe/energie.js` |
| `energie.termin` | `energieTermin` | `backend/frappe/energie.js` |
| `energie.termin_loeschen` | `energieTerminLoeschen` | `backend/frappe/energie.js` |
| `energie.termin_speichern` | `energieTerminSpeichern` | `backend/frappe/energie.js` |
| `energie.tranche_speichern` | `energieTrancheSpeichern` | `backend/frappe/energie.js` |
| `energie.tranche_stornieren` | `energieTrancheStornieren` | `backend/frappe/energie.js` |
| `energie.uebersicht` | `energieUebersicht` | `backend/frappe/energie.js` |
| `energie.vertrag_speichern` | `energieVertragSpeichern` | `backend/frappe/energie.js` |
| `energie.vollmacht_erteilen` | `energieVollmachtErteilen` | `backend/frappe/energie.js` |
| `energie.vollmacht_signatur` | `energieVollmachtSignatur` | `backend/frappe/energie.js` |
| `energie.vollmacht_widerrufen` | `energieVollmachtWiderrufen` | `backend/frappe/energie.js` |
| `entwicklung_steuerung.aufgaben_erzeugen` | `steuerungAufgabenErzeugen` | `backend/frappe/entwicklung-steuerung.js` |
| `entwicklung_steuerung.kapazitaet_setzen` | `steuerungKapazitaetSetzen` | `backend/frappe/entwicklung-steuerung.js` |
| `entwicklung_steuerung.projekt` | `steuerungProjekt` | `backend/frappe/entwicklung-steuerung.js` |
| `entwicklung_steuerung.sicherung` | `steuerungSicherung` | `backend/frappe/entwicklung-steuerung.js` |
| `entwicklung_steuerung.uebersicht` | `steuerungUebersicht` | `backend/frappe/entwicklung-steuerung.js` |
| `entwicklung_steuerung.vorlage_aktion` | `vorlageAktion` | `backend/frappe/entwicklung-steuerung.js` |
| `entwicklung_steuerung.vorlage_holen` | `vorlageHolen` | `backend/frappe/entwicklung-steuerung.js` |
| `entwicklung_steuerung.vorlage_speichern` | `vorlageSpeichern` | `backend/frappe/entwicklung-steuerung.js` |
| `entwicklung.aendern` | `entwicklungAendern` | `backend/frappe/entwicklung.js` |
| `entwicklung.aktion` | `entwicklungAktion` | `backend/frappe/entwicklung.js` |
| `entwicklung.anlegen` | `entwicklungAnlegen` | `backend/frappe/entwicklung.js` |
| `entwicklung.assistent` | `entwicklungAssistent` | `backend/frappe/entwicklung.js` |
| `entwicklung.auswahl` | `entwicklungAuswahl` | `backend/frappe/entwicklung.js` |
| `entwicklung.dokument_lesen` | `entwicklungDokumentLesen` | `backend/frappe/entwicklung.js` |
| `entwicklung.dokument_speichern` | `entwicklungDokumentSpeichern` | `backend/frappe/entwicklung.js` |
| `entwicklung.einladung_annehmen` | `entwicklungEinladungAnnehmen` | `backend/frappe/entwicklung.js` |
| `entwicklung.einladung_info` | `entwicklungEinladungInfo` | `backend/frappe/entwicklung.js` |
| `entwicklung.eintrag_loeschen` | `entwicklungEintragLoeschen` | `backend/frappe/entwicklung.js` |
| `entwicklung.eintrag_speichern` | `entwicklungEintragSpeichern` | `backend/frappe/entwicklung.js` |
| `entwicklung.extern` | `entwicklungExtern` | `backend/frappe/entwicklung.js` |
| `entwicklung.fristen` | `entwicklungFristen` | `backend/frappe/entwicklung.js` |
| `entwicklung.gutachter_einladen` | `entwicklungGutachterEinladen` | `backend/frappe/entwicklung.js` |
| `entwicklung.holen` | `entwicklungProjekt` | `backend/frappe/entwicklung.js` |
| `entwicklung.meilenstein_melden` | `entwicklungMeilensteinMelden` | `backend/frappe/entwicklung.js` |
| `entwicklung.meine` | `entwicklungMeine` | `backend/frappe/entwicklung.js` |
| `entwicklung.portfolio` | `entwicklungPortfolio` | `backend/frappe/entwicklung.js` |
| `entwicklung.rueckfrage` | `entwicklungRueckfrage` | `backend/frappe/entwicklung.js` |
| `entwicklung.zaehler` | `entwicklungZaehler` | `backend/frappe/entwicklung.js` |
| `fach.abnahmestelle_loeschen` | `abnahmestelleLoeschen` | `backend/frappe/fach.js` |
| `fach.abnahmestelle_speichern` | `abnahmestelleSpeichern` | `backend/frappe/fach.js` |
| `fach.bewertung` | `bewertung` | `backend/frappe/fach.js` |
| `fach.eg_speichern` | `egTeilnahmeSpeichern` | `backend/frappe/fach.js` |
| `fach.energie_daten` | `energieDaten` | `backend/frappe/fach.js` |
| `fach.geno_speichern` | `genoInteresseSpeichern` | `backend/frappe/fach.js` |
| `fach.lastgang_analyse_speichern` | `lastgangAnalyseSpeichern` | `backend/frappe/fach.js` |
| `fach.lastgang_anfrage` | `lastgangAnfrage` | `backend/frappe/fach.js` |
| `fach.lastgang_loeschen` | `lastgangLoeschen` | `backend/frappe/fach.js` |
| `fach.lastgang_reihe` | `lastgangReihe` | `backend/frappe/fach.js` |
| `fach.lastgang_speichern` | `lastgangSpeichern` | `backend/frappe/fach.js` |
| `fach.szenario_loeschen` | `szenarioLoeschen` | `backend/frappe/fach.js` |
| `fach.szenario_speichern` | `szenarioSpeichern` | `backend/frappe/fach.js` |
| `finanzen.abrechnung` | `abrechnung` | `backend/frappe/finanzen.js` |
| `finanzen.abrechnung_aktion` | `abrechnungAktion` | `backend/frappe/finanzen.js` |
| `finanzen.abrechnung_pdf` | `abrechnungPdfDaten` | `backend/frappe/finanzen.js` |
| `finanzen.abrechnungen` | `finanzAbrechnungen` | `backend/frappe/finanzen.js` |
| `finanzen.anlage_speichern` | `finanzAnlageSpeichern` | `backend/frappe/finanzen.js` |
| `finanzen.anlagen` | `finanzAnlagen` | `backend/frappe/finanzen.js` |
| `finanzen.cockpit` | `finanzCockpit` | `backend/frappe/finanzen.js` |
| `finanzen.entwicklung_ist` | `entwicklungIst` | `backend/frappe/finanzen.js` |
| `finanzen.entwicklung_kosten` | `entwicklungKosten` | `backend/frappe/finanzen.js` |
| `finanzen.entwicklung_kosten_buchen` | `entwicklungKostenBuchen` | `backend/frappe/finanzen.js` |
| `finanzen.klaerfaelle` | `klaerfaelle` | `backend/frappe/finanzen.js` |
| `finanzen.klaerfall_aktion` | `klaerfallAktion` | `backend/frappe/finanzen.js` |
| `finanzen.lauf` | `abrechnungslauf` | `backend/frappe/finanzen.js` |
| `finanzen.meine` | `meineAbrechnungen` | `backend/frappe/finanzen.js` |
| `finanzen.pacht_auswahl` | `pachtAuswahl` | `backend/frappe/finanzen.js` |
| `finanzen.pachtvertraege` | `pachtvertraege` | `backend/frappe/finanzen.js` |
| `finanzen.pachtvertrag` | `pachtvertrag` | `backend/frappe/finanzen.js` |
| `finanzen.pachtvertrag_speichern` | `pachtvertragSpeichern` | `backend/frappe/finanzen.js` |
| `finanzen.sepa_export` | `sepaExport` | `backend/frappe/finanzen.js` |
| `finanzen.vpi_speichern` | `vpiSpeichern` | `backend/frappe/finanzen.js` |
| `finanzen.vpi_werte` | `vpiWerte` | `backend/frappe/finanzen.js` |
| `finanzen.zahlungslauf_aktion` | `zahlungslaufAktion` | `backend/frappe/finanzen.js` |
| `finanzen.zahlungsvorschlag` | `zahlungsvorschlag` | `backend/frappe/finanzen.js` |
| `finanzierung.aktion` | `fzAktion` | `backend/frappe/finanzierung.js` |
| `finanzierung.auswahl` | `fzAuswahl` | `backend/frappe/finanzierung.js` |
| `finanzierung.bank_aktion` | `fzBankAktion` | `backend/frappe/finanzierung.js` |
| `finanzierung.bank_anfrage` | `fzBankAnfrage` | `backend/frappe/finanzierung.js` |
| `finanzierung.bank_einladung_annehmen` | `fzBankEinladungAnnehmen` | `backend/frappe/finanzierung.js` |
| `finanzierung.bank_einladung_info` | `fzBankEinladungInfo` | `backend/frappe/finanzierung.js` |
| `finanzierung.bank_meine` | `fzBankMeine` | `backend/frappe/finanzierung.js` |
| `finanzierung.bank_speichern` | `fzBankSpeichern` | `backend/frappe/finanzierung.js` |
| `finanzierung.bank_zaehler` | `fzBankZaehler` | `backend/frappe/finanzierung.js` |
| `finanzierung.cockpit_liste` | `fzCockpitListe` | `backend/frappe/finanzierung.js` |
| `finanzierung.cockpit_projekt` | `fzCockpitProjekt` | `backend/frappe/finanzierung.js` |
| `finanzierung.covenant_lauf` | `fzCovenantLauf` | `backend/frappe/finanzierung.js` |
| `finanzierung.dokument_lesen` | `fzDokumentLesen` | `backend/frappe/finanzierung.js` |
| `finanzierung.dokument_speichern` | `fzDokumentSpeichern` | `backend/frappe/finanzierung.js` |
| `finanzierung.fall` | `fzFall` | `backend/frappe/finanzierung.js` |
| `finanzierung.fall_aendern` | `fzFallAendern` | `backend/frappe/finanzierung.js` |
| `finanzierung.fall_anlegen` | `fzFallAnlegen` | `backend/frappe/finanzierung.js` |
| `finanzierung.geschaeftsmodell` | `fzGeschaeftsmodell` | `backend/frappe/finanzierung.js` |
| `finanzierung.modell_daten` | `fzModellDaten` | `backend/frappe/finanzierung.js` |
| `finanzierung.reporting_daten` | `fzReportingDaten` | `backend/frappe/finanzierung.js` |
| `finanzierung.szenario` | `fzSzenario` | `backend/frappe/finanzierung.js` |
| `finanzierung.szenario_loeschen` | `fzSzenarioLoeschen` | `backend/frappe/finanzierung.js` |
| `finanzierung.szenario_speichern` | `fzSzenarioSpeichern` | `backend/frappe/finanzierung.js` |
| `finanzierung.uebersicht` | `fzUebersicht` | `backend/frappe/finanzierung.js` |
| `flaeche.aendern` | `flaecheAendern` | `backend/frappe.js` |
| `flaeche.anlegen` | `flaecheAnlegen` | `backend/frappe.js` |
| `flaeche.holen` | `flaeche` | `backend/frappe.js` |
| `flaeche.liste` | `flaechen` | `backend/frappe.js` |
| `frist_erinnerung.lauf` | `fristErinnerungLauf` | `backend/frappe/fristErinnerung.js` |
| `gemeinde.aktion` | `gdAktion` | `backend/frappe/gemeinde.js` |
| `gemeinde.cockpit` | `gdCockpit` | `backend/frappe/gemeinde.js` |
| `gemeinde.material` | `gdMaterial` | `backend/frappe/gemeinde.js` |
| `geodaten.kapazitaet_setzen` | `netzkapazitaetSetzen` | `backend/frappe/geodaten.js` |
| `geodaten.kapazitaeten` | `netzkapazitaeten` | `backend/frappe/geodaten.js` |
| `geodaten.ziel_uebernehmen` | `akquiseZielUebernehmen` | `backend/frappe/geodaten.js` |
| `geodaten.ziele` | `akquiseZiele` | `backend/frappe/geodaten.js` |
| `gutachterauftrag.aktion` | `gaAktion` | `backend/frappe/gutachter.js` |
| `gutachterauftrag.anfrage_anlegen` | `gaAnfrageAnlegen` | `backend/frappe/gutachter.js` |
| `gutachterauftrag.datei_lesen` | `gaDateiLesen` | `backend/frappe/gutachter.js` |
| `gutachterauftrag.datei_speichern` | `gaDateiSpeichern` | `backend/frappe/gutachter.js` |
| `gutachterauftrag.fristen` | `gaFristen` | `backend/frappe/gutachter.js` |
| `gutachterauftrag.holen` | `gaAuftrag` | `backend/frappe/gutachter.js` |
| `gutachterauftrag.meine` | `gaMeine` | `backend/frappe/gutachter.js` |
| `gutachterauftrag.pdf_daten` | `gaPdfDaten` | `backend/frappe/gutachter.js` |
| `gutachterauftrag.uebersicht` | `gaUebersicht` | `backend/frappe/gutachter.js` |
| `gutachterauftrag.zaehler` | `gaZaehler` | `backend/frappe/gutachter.js` |
| `gutachterauftrag.zahlung` | `gaZahlung` | `backend/frappe/gutachter.js` |
| `hr.abwesenheit_anlegen` | `abwesenheitAnlegen` | `backend/frappe/service.js` |
| `hr.abwesenheit_loeschen` | `abwesenheitLoeschen` | `backend/frappe/service.js` |
| `hr.abwesenheiten` | `abwesenheiten` | `backend/frappe/service.js` |
| `hr.integrationen` | `ablageStatus` | `backend/frappe/service.js` |
| `hr.mitarbeiter_speichern` | `mitarbeiterSpeichern` | `backend/frappe/service.js` |
| `hr.team` | `team` | `backend/frappe/service.js` |
| `hr.vertretung` | `vertretung` | `backend/frappe/service.js` |
| `hr.wissen` | `wissen` | `backend/frappe/service.js` |
| `hr.wissen_artikel` | `wissenArtikel` | `backend/frappe/service.js` |
| `hr.wissen_loeschen` | `wissenLoeschen` | `backend/frappe/service.js` |
| `hr.wissen_speichern` | `wissenSpeichern` | `backend/frappe/service.js` |
| `hr.zeit_erfassen` | `zeitErfassen` | `backend/frappe/service.js` |
| `hr.zeit_loeschen` | `zeitLoeschen` | `backend/frappe/service.js` |
| `hr.zeiten` | `zeiten` | `backend/frappe/service.js` |
| `hr.zeiten_auswertung` | `zeitenAuswertung` | `backend/frappe/service.js` |
| `interesse.liste` | `interessen` | `backend/frappe.js` |
| `interesse.merken` | `merken` | `backend/frappe.js` |
| `interesse.nda_anfragen` | `ndaAnfragen` | `backend/frappe.js` |
| `kommune.uebersicht` | `kommuneUebersicht` | `backend/frappe.js` |
| `konto.passwort_aendern` | `passwortAendern` | `backend/frappe.js` |
| `konto.profil_speichern` | `profilSpeichern` | `backend/frappe.js` |
| `konto.suchprofil_speichern` | `suchprofilSpeichern` | `backend/frappe.js` |
| `kundenenergie.anliegen_aktion` | `kundenAnliegenAktion` | `backend/frappe/kundenenergie.js` |
| `kundenenergie.anliegen_anlegen` | `kundenAnliegenAnlegen` | `backend/frappe/kundenenergie.js` |
| `kundenenergie.anliegen_auswahl` | `kundenAnliegenAuswahl` | `backend/frappe/kundenenergie.js` |
| `kundenenergie.anliegen_dokument` | `kundenAnliegenDokument` | `backend/frappe/kundenenergie.js` |
| `kundenenergie.anliegen_liste` | `kundenAnliegen` | `backend/frappe/kundenenergie.js` |
| `kundenenergie.kostenbericht` | `kostenbericht` | `backend/frappe/kundenenergie.js` |
| `kundenenergie.stoerung_melden` | `kundenStoerungMelden` | `backend/frappe/kundenenergie.js` |
| `kundenenergie.vertragsdaten` | `vertragsdaten` | `backend/frappe/kundenenergie.js` |
| `kundenenergie.wechsel_aktion` | `lieferantenwechselAktion` | `backend/frappe/kundenenergie.js` |
| `kundenenergie.wechsel_liste` | `lieferantenwechsel` | `backend/frappe/kundenenergie.js` |
| `kyc_ident.video` | `kycVideo` | `backend/frappe/kycIdent.js` |
| `kyc_ident.video_aktion` | `kycVideoAktion` | `backend/frappe/kycIdent.js` |
| `kyc_ident.video_buchen` | `kycVideoBuchen` | `backend/frappe/kycIdent.js` |
| `kyc_ident.video_protokoll` | `kycVideoProtokoll` | `backend/frappe/kycIdent.js` |
| `kyc_ident.video_stornieren` | `kycVideoStornieren` | `backend/frappe/kycIdent.js` |
| `kyc.aktion` | `kycAktion` | `backend/frappe/kyc.js` |
| `kyc.dokument_lesen` | `kycDokumentLesen` | `backend/frappe/kyc.js` |
| `kyc.dokument_loeschen` | `kycDokumentLoeschen` | `backend/frappe/kyc.js` |
| `kyc.dokument_speichern` | `kycDokumentSpeichern` | `backend/frappe/kyc.js` |
| `kyc.einreichen` | `kycEinreichen` | `backend/frappe/kyc.js` |
| `kyc.einstellungen` | `kycEinstellungen` | `backend/frappe/kyc.js` |
| `kyc.einstellungen_speichern` | `kycEinstellungenSpeichern` | `backend/frappe/kyc.js` |
| `kyc.ergebnis_anhaengen` | `kycErgebnisAnhaengen` | `backend/frappe/kyc.js` |
| `kyc.erneut` | `kycErneut` | `backend/frappe/kyc.js` |
| `kyc.fall` | `kycFall` | `backend/frappe/kyc.js` |
| `kyc.fall_detail` | `kycFallDetail` | `backend/frappe/kyc.js` |
| `kyc.freigabe` | `kycFreigabePruefen` | `backend/frappe/kyc.js` |
| `kyc.fristen` | `kycFristen` | `backend/frappe/kyc.js` |
| `kyc.sanktion_pruefen` | `kycSanktionPruefen` | `backend/frappe/kyc.js` |
| `kyc.sanktionsliste` | `kycSanktionsliste` | `backend/frappe/kyc.js` |
| `kyc.speichern` | `kycSpeichern` | `backend/frappe/kyc.js` |
| `kyc.status` | `kycStatus` | `backend/frappe/kyc.js` |
| `kyc.warteschlange` | `kycWarteschlange` | `backend/frappe/kyc.js` |
| `mitglied.aktion` | `mgAktion` | `backend/frappe/mitglied.js` |
| `mitglied.beitritt` | `mgBeitritt` | `backend/frappe/mitglied.js` |
| `mitglied.bo_ausschuettung_aktion` | `boAusschuettungAktion` | `backend/frappe/mitglied.js` |
| `mitglied.bo_ausschuettung_anlegen` | `boAusschuettungAnlegen` | `backend/frappe/mitglied.js` |
| `mitglied.bo_eg` | `boEg` | `backend/frappe/mitglied.js` |
| `mitglied.bo_eg_abrechnen` | `boEgAbrechnen` | `backend/frappe/mitglied.js` |
| `mitglied.bo_eg_speichern` | `boEgSpeichern` | `backend/frappe/mitglied.js` |
| `mitglied.bo_geno` | `boGeno` | `backend/frappe/mitglied.js` |
| `mitglied.bo_geno_speichern` | `boGenoSpeichern` | `backend/frappe/mitglied.js` |
| `mitglied.bo_gv_aktion` | `boGvAktion` | `backend/frappe/mitglied.js` |
| `mitglied.bo_gv_speichern` | `boGvSpeichern` | `backend/frappe/mitglied.js` |
| `mitglied.bo_mitglied_aktion` | `boMitgliedAktion` | `backend/frappe/mitglied.js` |
| `mitglied.bo_teilnahme_aktion` | `boTeilnahmeAktion` | `backend/frappe/mitglied.js` |
| `mitglied.dokument` | `mgDokument` | `backend/frappe/mitglied.js` |
| `mitglied.eg_beitreten` | `egBeitreten` | `backend/frappe/mitglied.js` |
| `mitglied.eg_teilnahme_aktion` | `egTeilnahmeAktion` | `backend/frappe/mitglied.js` |
| `mitglied.gv_abstimmen` | `gvAbstimmen` | `backend/frappe/mitglied.js` |
| `mitglied.gv_detail` | `gvDetail` | `backend/frappe/mitglied.js` |
| `mitglied.uebersicht` | `mgUebersicht` | `backend/frappe/mitglied.js` |
| `nachricht.liste` | `nachrichten` | `backend/frappe.js` |
| `nachricht.senden` | `nachrichtSenden` | `backend/frappe.js` |
| `nachricht.threads` | `nachrichtenThreads` | `backend/frappe.js` |
| `onboarding.mail` | `onbMail` | `backend/frappe/onboarding.js` |
| `onboarding.mail_lauf` | `onbMailLauf` | `backend/frappe/onboarding.js` |
| `onboarding.speichern` | `onbSpeichern` | `backend/frappe/onboarding.js` |
| `onboarding.team` | `onbTeam` | `backend/frappe/onboarding.js` |
| `onboarding.zustand` | `onbZustand` | `backend/frappe/onboarding.js` |
| `organisation.aendern` | `organisationAendern` | `backend/frappe/sicherheit.js` |
| `organisation.anlegen` | `organisationAnlegen` | `backend/frappe/sicherheit.js` |
| `organisation.einladen` | `einladungAnlegen` | `backend/frappe/sicherheit.js` |
| `organisation.einladung_annehmen` | `einladungAnnehmen` | `backend/frappe/sicherheit.js` |
| `organisation.einladung_info` | `einladungInfo` | `backend/frappe/sicherheit.js` |
| `organisation.einladung_widerrufen` | `einladungWiderrufen` | `backend/frappe/sicherheit.js` |
| `organisation.holen` | `organisation` | `backend/frappe/sicherheit.js` |
| `organisation.liste` | `organisationen` | `backend/frappe/sicherheit.js` |
| `organisation.loeschen` | `organisationLoeschen` | `backend/frappe/sicherheit.js` |
| `organisation.mitglied_aendern` | `mitgliedAendern` | `backend/frappe/sicherheit.js` |
| `organisation.mitglied_entfernen` | `mitgliedEntfernen` | `backend/frappe/sicherheit.js` |
| `organisation.wechseln` | `organisationWechseln` | `backend/frappe/sicherheit.js` |
| `organisation.zuordnen` | `objektZuordnen` | `backend/frappe/sicherheit.js` |
| `pachtakte.agri_aktion` | `agriNachweisAktion` | `backend/frappe/pachtakte.js` |
| `pachtakte.agri_speichern` | `agriNachweisSpeichern` | `backend/frappe/pachtakte.js` |
| `pachtakte.anliegen_aktion` | `anliegenAktion` | `backend/frappe/pachtakte.js` |
| `pachtakte.anliegen_anlegen` | `anliegenAnlegen` | `backend/frappe/pachtakte.js` |
| `pachtakte.backoffice` | `pachtakteBackoffice` | `backend/frappe/pachtakte.js` |
| `pachtakte.jahresbescheinigung` | `jahresbescheinigungDaten` | `backend/frappe/pachtakte.js` |
| `pachtakte.meine` | `meinePachtakte` | `backend/frappe/pachtakte.js` |
| `pachtakte.rueckbau_aktion` | `rueckbauAktion` | `backend/frappe/pachtakte.js` |
| `planung.datei` | `planungDatei` | `backend/frappe/planung.js` |
| `planung.hochladen` | `planungHochladen` | `backend/frappe/planung.js` |
| `planung.kalkulation` | `kalkulationHolen` | `backend/frappe/planung.js` |
| `planung.kalkulation_aktion` | `kalkulationAktion` | `backend/frappe/planung.js` |
| `planung.kalkulation_speichern` | `kalkulationSpeichern` | `backend/frappe/planung.js` |
| `planung.liste` | `planungListe` | `backend/frappe/planung.js` |
| `planung.meine` | `planungMeine` | `backend/frappe/planung.js` |
| `planung.plan_speichern` | `planungPlanSpeichern` | `backend/frappe/planung.js` |
| `planung.version` | `planungVersion` | `backend/frappe/planung.js` |
| `planung.version_aktion` | `planungVersionAktion` | `backend/frappe/planung.js` |
| `portfolio.aendern` | `pfAendern` | `backend/frappe/portfolio.js` |
| `portfolio.aktion` | `pfAktion` | `backend/frappe/portfolio.js` |
| `portfolio.anlegen` | `pfAnlegen` | `backend/frappe/portfolio.js` |
| `portfolio.auswahl` | `pfAuswahl` | `backend/frappe/portfolio.js` |
| `portfolio.bericht_daten` | `pfBerichtDaten` | `backend/frappe/portfolio.js` |
| `portfolio.dokument_lesen` | `pfDokumentLesen` | `backend/frappe/portfolio.js` |
| `portfolio.dokument_speichern` | `pfDokumentSpeichern` | `backend/frappe/portfolio.js` |
| `portfolio.fristen_lauf` | `pfFristenLauf` | `backend/frappe/portfolio.js` |
| `portfolio.meine` | `pfMeine` | `backend/frappe/portfolio.js` |
| `portfolio.portal_aktion` | `pfPortalAktion` | `backend/frappe/portfolio.js` |
| `portfolio.position` | `pfPosition` | `backend/frappe/portfolio.js` |
| `portfolio.uebersicht` | `pfUebersicht` | `backend/frappe/portfolio.js` |
| `projekt.aendern` | `projektAendern` | `backend/frappe.js` |
| `projekt.anlegen` | `projektAnlegen` | `backend/frappe.js` |
| `projekt.holen` | `projekt` | `backend/frappe.js` |
| `projekt.liste` | `projekte` | `backend/frappe.js` |
| `projekt.provision_akzeptieren` | `provisionAkzeptieren` | `backend/frappe.js` |
| `prozess.status_wechsel` | `statusWechsel` | `backend/frappe.js` |
| `qa.aktion` | `qaAktion` | `backend/frappe/dealroom.js` |
| `qa.frage_stellen` | `qaFrageStellen` | `backend/frappe/dealroom.js` |
| `qa.liste` | `qaListe` | `backend/frappe/dealroom.js` |
| `querschnitt.digest_lauf` | `digestLauf` | `backend/frappe/querschnitt.js` |
| `querschnitt.dokument_freigeben` | `dokumentFreigeben` | `backend/frappe/querschnitt.js` |
| `querschnitt.dokument_neue_version` | `dokumentNeueVersion` | `backend/frappe/querschnitt.js` |
| `querschnitt.dokument_versionen` | `dokumentVersionen` | `backend/frappe/querschnitt.js` |
| `querschnitt.mail_rhythmus` | `mailRhythmus` | `backend/frappe/querschnitt.js` |
| `querschnitt.mail_rhythmus_speichern` | `mailRhythmusSpeichern` | `backend/frappe/querschnitt.js` |
| `querschnitt.protokoll_suche` | `protokollSuche` | `backend/frappe/querschnitt.js` |
| `sicherheit.anmeldungen` | `anmeldungen` | `backend/frappe/sicherheit.js` |
| `sicherheit.daten_export` | `datenExport` | `backend/frappe/sicherheit.js` |
| `sicherheit.email_aendern_anfordern` | `emailAendernAnfordern` | `backend/frappe/sicherheit.js` |
| `sicherheit.email_aendern_bestaetigen` | `emailAendernBestaetigen` | `backend/frappe/sicherheit.js` |
| `sicherheit.geraet_vergessen` | `geraetVergessen` | `backend/frappe/sicherheit.js` |
| `sicherheit.geraet_vertraut` | `geraetVertraut` | `backend/frappe/sicherheit.js` |
| `sicherheit.geraete` | `geraete` | `backend/frappe/sicherheit.js` |
| `sicherheit.komfort_speichern` | `komfortSpeichern` | `backend/frappe/sicherheit.js` |
| `sicherheit.konto_loeschen` | `kontoLoeschen` | `backend/frappe/sicherheit.js` |
| `sicherheit.magic_link_anfordern` | `magicLinkAnfordern` | `backend/frappe/sicherheit.js` |
| `sicherheit.magic_link_einloesen` | `magicLinkEinloesen` | `backend/frappe/sicherheit.js` |
| `sicherheit.pflicht_lesen` | `zweiFaktorPflicht` | `backend/frappe/sicherheit.js` |
| `sicherheit.pflicht_speichern` | `zweiFaktorPflichtSpeichern` | `backend/frappe/sicherheit.js` |
| `sicherheit.sitzung_anlegen` | `sitzungAnlegen` | `backend/frappe/sicherheit.js` |
| `sicherheit.sitzung_beenden` | `sitzungBeenden` | `backend/frappe/sicherheit.js` |
| `sicherheit.sitzungen` | `sitzungen` | `backend/frappe/sicherheit.js` |
| `sicherheit.wiederherstellungscodes_neu` | `wiederherstellungscodesNeu` | `backend/frappe/sicherheit.js` |
| `sicherheit.zwei_faktor_bestaetigen` | `zweiFaktorBestaetigen` | `backend/frappe/sicherheit.js` |
| `sicherheit.zwei_faktor_deaktivieren` | `zweiFaktorDeaktivieren` | `backend/frappe/sicherheit.js` |
| `sicherheit.zwei_faktor_pruefen` | `zweiFaktorPruefen` | `backend/frappe/sicherheit.js` |
| `sicherheit.zwei_faktor_starten` | `zweiFaktorStarten` | `backend/frappe/sicherheit.js` |
| `sicherheit.zwei_faktor_status` | `zweiFaktorStatus` | `backend/frappe/sicherheit.js` |
| `signatur.ablehnen` | `signaturAblehnen` | `backend/frappe/service.js` |
| `signatur.abschliessen` | `signaturAbschliessen` | `backend/frappe/service.js` |
| `signatur.abschluss_daten` | `signaturAbschlussDaten` | `backend/frappe/service.js` |
| `signatur.anlegen` | `signaturAnlegen` | `backend/frappe/service.js` |
| `signatur.code_anfordern` | `signaturCodeAnfordern` | `backend/frappe/service.js` |
| `signatur.datei` | `signaturDatei` | `backend/frappe/service.js` |
| `signatur.einstellungen` | `signaturEinstellungen` | `backend/frappe/service.js` |
| `signatur.einstellungen_speichern` | `signaturEinstellungenSpeichern` | `backend/frappe/service.js` |
| `signatur.erinnern` | `signaturErinnern` | `backend/frappe/service.js` |
| `signatur.holen` | `signatur` | `backend/frappe/service.js` |
| `signatur.liste` | `signaturen` | `backend/frappe/service.js` |
| `signatur.standard` | `signaturStandard` | `backend/frappe/service.js` |
| `signatur.unterschreiben` | `signaturUnterschreiben` | `backend/frappe/service.js` |
| `signatur.widerrufen` | `signaturWiderrufen` | `backend/frappe/service.js` |
| `support.aktion` | `ticketAktion` | `backend/frappe/service.js` |
| `support.anhang_lesen` | `ticketAnhangLesen` | `backend/frappe/service.js` |
| `support.anhang_speichern` | `ticketAnhangSpeichern` | `backend/frappe/service.js` |
| `support.anlegen` | `ticketAnlegen` | `backend/frappe/service.js` |
| `support.antworten` | `ticketAntworten` | `backend/frappe/service.js` |
| `support.aus_stoerung` | `ticketAusStoerung` | `backend/frappe/service.js` |
| `support.holen` | `ticket` | `backend/frappe/service.js` |
| `support.kennzahlen` | `ticketKennzahlen` | `backend/frappe/service.js` |
| `support.liste` | `tickets` | `backend/frappe/service.js` |
| `termine.aendern` | `terminAendern` | `backend/frappe/service.js` |
| `termine.buchen` | `terminBuchen` | `backend/frappe/service.js` |
| `termine.holen` | `termin` | `backend/frappe/service.js` |
| `termine.ics` | `terminIcs` | `backend/frappe/service.js` |
| `termine.liste` | `termine` | `backend/frappe/service.js` |
| `termine.per_token` | `terminPerToken` | `backend/frappe/service.js` |
| `termine.per_token_aendern` | `terminPerTokenAendern` | `backend/frappe/service.js` |
| `termine.slots` | `terminSlots` | `backend/frappe/service.js` |
| `termine.verfuegbarkeit_speichern` | `verfuegbarkeitSpeichern` | `backend/frappe/service.js` |
| `termine.verfuegbarkeiten` | `verfuegbarkeiten` | `backend/frappe/service.js` |
| `transaktion.bericht` | `dealBericht` | `backend/frappe/werkzeuge.js` |
| `transaktion.pipeline` | `dealPipeline` | `backend/frappe/werkzeuge.js` |
| `transaktion.prognose` | `dealPrognose` | `backend/frappe/werkzeuge.js` |
| `vorgang.holen` | `vorgang` | `backend/frappe.js` |
| `vorgang.liste` | `vorgaenge` | `backend/frappe.js` |
