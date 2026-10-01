# WP5 Gründungsdienstleistung, Wechsel, Vereinsorganisation, Förder-Check, Lieferantenpflichten

Stand 01.10.2026 (ElWG-Stand 01.10.2026). Vertrag: [EG-SCHNITTSTELLEN.md](../EG-SCHNITTSTELLEN.md), Abschnitt 4 (WP5). Fachlich: [EG-FACHKONZEPT.md](../EG-FACHKONZEPT.md) Kapitel 6–8, Markt: [EG-MARKT.md](../EG-MARKT.md). Alle Muster sind als **MUSTER** gekennzeichnet und vor Verwendung rechtlich zu prüfen; unsichere Angaben tragen „(zu bestätigen)“.

## Dateien

| Bereich | Dateien |
|---|---|
| Reine Regeln | `src/lib/plattform/eg/{gruendung,wechsel,verein,statuten,vertraege,foerder,lieferantenpflichten}.js`, Vorlagen `eg/vorlagen/{statuten,mitglied,lieferant,organisator,verein,index}.js` (16 Muster) |
| PDF | `src/lib/plattform/server/eg-gruendung-pdf.js` (`egDokumentPdf`, `egBerichtPdf`) – Muster werden aus der Struktur gerendert, Fußzeile mit Version und SHA-256 |
| Python-Spiegel | `plattform/eg_gruendung_kern.py` + Daten `plattform/eg_gruendung_daten.json`; Test `plattform/tests/test_eg_gruendung_kern.py` (ohne Frappe, alle Vektoren) |
| Testvektoren | `src/lib/plattform/eg/testdaten/gruendung/vektoren.json` (213 Fälle + Vorlagen-Prüfsummen), erzeugt mit `node scripts/eg-gruendung-export.mjs` (`--pruefen`) |
| Backend | `backend/demo/eg-gruendung.js`, `backend/demo/eg-gruendung-seed.js`, `backend/frappe/eg-gruendung.js`, `plattform/api/eg_gruendung.py` |
| DocTypes | Plattform EG Gruendungsauftrag (`EGA`, Kind-Tabelle Gruendungsschritt), EG Import (`EIM`), EG Foerdercheck (`EFC`), EG Dokument (`EGD`), EG Versammlung (`EGV`), EG Versammlung Stimme (`EGS`), EG Beschluss (`EBS`), EG Beitrag (`EBT`), EG Vereinsakte (`EVA`, Statuten-Eingaben + Auflösung je Gemeinschaft) |
| Seiten | `/portal/eg/gruendung` (Anfrage, eigene Aufträge), `/neu`, `/[id]`, `/foerdercheck`; `/portal/admin/eg/gruendung` (Liste mit Kennzahlen), `/neu`, `/[id]`; Organe: `/portal/eg/[id]/verein` (`/versammlungen` leitet weiter), Backoffice `/portal/admin/eg/[id]/{organe,versammlungen}` |
| APIs | `/api/portal/eg/gruendung` (GET Liste, POST Anfrage), `/[id]` (GET, POST Aktion), `/[id]/schritt`; `/api/portal/eg/dokument` (GET `?id=` bzw. `?vorlage=` PDF, POST erzeugen); `/api/portal/eg/foerdercheck`; `/api/portal/eg/[id]/{verein,aufloesung,import,import/ausfuehren}` |
| Komponenten | `src/components/Portal/EG/Gruendung/**` |
| Tests | `node scripts/plattform-test-eg-gruendung.mjs --nur-logik` bzw. gegen den Server |

## Fachlicher Umfang (Kurzfassung)

- **Pakete**: Machbarkeits-Check, Gründung, Komplettbetreuung (mit Organisator-Rolle), Wechsel. Angebot → elektronische Unterschrift (Signatur-Modul, Status wird beim Lesen synchronisiert) oder Annahme per Klick bzw. manueller Nachweis → Fahrplan.
- **Fahrplan je Rechtsform** (35 Schritte, 18 für den Wechsel): Verein (VerG §§ 3, 11, 13 – Vereinsanzeige, ZVR binnen 4 Wochen), eGen (Revisionsverband, Firmenbuch), GmbH, GEA ohne Rechtsperson; Organe, Bank, Finanzamt/UID (Verf 15/16, U15), Marktpartner ebUtilities, Netzbetreiber-Auskunft (ElWG § 70 Abs. 6, 14 Tage), Betreibervertrag/Gemeinschafts-ID, EDA-Zugang, Lieferantenpflichten. Fristen relativ zu Auftrag, Vorgängerschritten oder Stichtag; Ampel nur für Pflichtschritte; Nachweis-Pflicht je Schritt; Zuständigkeit Auftraggeber/ÖkoInvest/Dritte.
- **Wirkung erledigter Schritte**: Felder (ZVR, Marktpartner-ID, Gemeinschafts-ID, UID …) und Status der Gemeinschaft über die WP1-Regeln (Statuspfad nur über erlaubte Übergänge); „EDA-bereit“ erst nach `edaBereitPruefen` und dann Ereignis `eg.gemeinschaft.eda_bereit` an WP2.
- **Wechsel**: Import CSV/Excel-Einfügen mit Erkennung energiedigital / EEG Faktura / EGON / EDA-Portal / Koordinationsstelle, Spaltenzuordnung, Plausibilität (Zählpunkt, TF 1–100, Großunternehmen bei EEG, Dubletten, Bestand), Übernahme über WP1 (`egCsvImport`, `egMassenaktion`, `egTarifSpeichern`), danach EC_PODLIST über WP2; Umstellungsplan mit Stichtag (Monatserster), Probe-/Kontrollabrechnung über WP4, Mitgliederinformation, ElWG-Vertragsanpassung bis zum Stichtag.
- **Verein**: Organ-Check (Funktionsperiode, Pflichtorgane, Rechnungsprüfer), GV über das Versammlungsmodul (Einladungsfrist, Online-Abstimmung, Protokoll mit Hash), Beschlussbuch (auch aus GV-Ergebnissen), Beiträge (Vorschreibung, Status, Einhebung gesondert/mit Abrechnung), Auflösungs-Checkliste.
- **Förder-Check** mit Quelle, URL, Stand und Status je Programm (EAG-Investitionszuschuss, Klimafonds, Länder – Werte „(zu bestätigen)“).
- **Lieferantenpflichten** ab > 100 kW bzw. > 30 kW bei Haushalten (AGB, Informationsblatt, Änderungsvorlauf 30 Tage), ÖkoInvest als Organisator (Vollmacht, Anzeige, AVV).

## Ergänzungen der Signaturen (abwärtskompatibel)

- `grAuftragAktion(n, id, {aktion, …})` – Aktionen: `angebot`, `signatur`, `annehmen`, `beauftragt_manuell`, `ablehnen`, `abbrechen`, `uebergeben`, `gemeinschaft_anlegen`, `gemeinschaft_verknuepfen`, `daten`, `schritte_aktualisieren`, `stichtag`, `statuten`, `notiz`, `mitglieder_informieren`, `probeabrechnung`. Frappe intern zusätzlich `signatur_verknuepfen`, `kontrolle_speichern` (nur vom Adapter).
- `grSchrittAktion(n, id, {schritt, aktion: erledigen|starten|warten|entfaellt|wiedereroeffnen|frist|notiz, wert?, datum?, notiz?, nachweis?})` → Auftrag + `meldungen`.
- `grVersammlungen(n, gid, {aktion, id, daten})` – ohne `aktion` Lesen; `gv_speichern|gv_einladen|gv_oeffnen|gv_abstimmen|gv_abschliessen|gv_absagen`, `beschluss_speichern`, `organ_speichern|organ_beenden` (über WP1), `beitraege_vorschreiben`, `beitrag_status`, `statuten_speichern`.
- `grAufloesung(n, gid, {aktion: lesen|starten|punkt|abschliessen, punkt?, erledigt?, notiz?, grund?})`.
- `grImportVorschau(n, gid, {csv, dateiname, anbieter, zuordnung, importId, auftragId})`, `grImportAusfuehren(n, importId, {ohneFehlerzeilen = true, tarifUebernehmen = true})`.
- `grDokumentErzeugen(n, {gemeinschaftId|auftragId, vorlage, daten, dokumentId?, speichern = true})` – gleicher Inhalt → `unveraendert: true`, sonst neue Version.

## Frappe

- Jede Methode in `api/eg_gruendung.py` ist `@frappe.whitelist(methods=["POST"])`, prüft `nutzer(als_benutzer)` und den Kontext (Backoffice `rechte.stufe(n, "eg")`, Auftraggeber, `eg_stamm.zugriff`); kein `allow_guest`.
- Orchestrierung im Adapter `backend/frappe/eg-gruendung.js`: Frappe prüft vor (`signatur`, `gemeinschaft_anlegen`, `probeabrechnung` → `{ok: true}`; Import `phase: "plan"`; Auflösung `phase: "pruefen"`), dann führt der Adapter WP1/WP4/Signatur aus und legt das Ergebnis in Frappe ab.
- Ausnahme: Wirkung erledigter Schritte schreibt Frappe selbst mit den WP1-Regeln (`eg_stamm_kern.gemeinschaft_bereinigen`/`gemeinschaft_uebergang`, `eg_stamm.in_doc`/`_speichern`) in derselben Transaktion – so wirken auch vom Auftraggeber erledigte Schritte (Systemkonto, protokolliert), ohne dass `eg_stamm` das Systemkonto annehmen muss.

## Patch an WP1 (übernommen laut Rückmeldung WP1)

1. `desk_rechte.py`: alle 10 WP5-DocTypes (Gruendungsschritt als Kind-Tabelle).
2. `EG_PRAEFIX` (modell.js/eg_modell.py): `dokument EGD`, `versammlung EGV`, `versammlungStimme EGS`, `beschluss EBS`, `beitrag EBT`, `vereinsakte EVA`.
3. `gemeinschaftBereinigen` reicht `gruendungsauftragId` durch (Frappe-Feld `gruendungsauftrag_id`); CSV-Import übernimmt die Mitgliedsnummer bei neuen Mitgliedern.
4. `EG_EREIGNISSE[…].argument` – `eg.import.uebernommen` ruft `edaPodlistAnfordern(sys, gemeinschaftId)`; Demo- und Frappe-Adapter von WP5 beachten `argument`.
5. Menü „Gemeinschaft gründen“ (`/portal/eg/gruendung`) und Brotkrumen.

## Offene Punkte

- Frappe-Pfad ist ohne Bench nur statisch geprüft (py_compile, ruff, `pruefen.py`); Bench-Test `bench run-tests --app oekoinvest_app` steht aus.
- Formate der Exporte von energiedigital/EGON und Formularnummern der Behörden sind „(zu bestätigen)“.
- Probe-Abrechnung: angebunden (Integration) – `probePeriode` legt die WP4-Periode mit `probe: true` an, `probeKontrollwerte` übernimmt die Belege der Vorschau in den Kontrollvergleich; ohne Rechenrecht in WP4 (Kassier/Vorstand/Organisator) Vergleich mit den übergebenen Werten.
