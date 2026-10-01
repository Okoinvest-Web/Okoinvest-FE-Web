# Energiegemeinschaften – Schnittstellenvertrag WP1–WP6

Stand 01.10.2026 · Eigentümer: **WP1 „Kern-Stammdaten, Rechte, Integration“** · Grundlage: [EG-FACHKONZEPT.md](./EG-FACHKONZEPT.md) (Abschnitte 3, 5, 8), [EG-MARKT.md](./EG-MARKT.md), Spielregeln [BRIEFING.md](./BRIEFING.md).
Dieser Vertrag ist ab sofort **eingefroren**. Änderungswünsche als Patch-Abschnitt in `docs/eg/<paket>.md` (Überschrift „Patch an WP1“), WP1 übernimmt sie in die gemeinsamen Dateien.

---

## 1. Grundregeln (für alle Pakete)

1. **Reine Regeln** unter `src/lib/plattform/eg/` (keine Importe aus `backend/`, kein `@/`, relative Importe **mit** `.js`-Endung, damit Node-Tests ohne Server laufen). Python-Spiegel 1:1 unter `Backend-Import/oekoinvest_app/oekoinvest_app/plattform/eg_<paket>_kern.py`, gemeinsame Testvektoren als JSON unter `src/lib/plattform/eg/testdaten/<paket>/*.json` (beide Testsuiten lesen sie).
2. **Backend**: Jedes Paket implementiert seine Operationen in `backend/demo/eg-<paket>.js` und `backend/frappe/eg-<paket>.js` (gleiche Exporte, gleiche Signaturen). Die Fassade `src/lib/plattform/backend/eg.js` führt alle zusammen: `egBackend().<operation>(n, …)`. WP1 hat für WP2–WP6 **Stub-Dateien** angelegt (jede Operation → HTTP 501) – das Paket **ersetzt seine Stub-Datei vollständig**.
3. **Frappe**: `plattform/api/eg_<paket>.py` (whitelisted, Rolle UND Kontext prüfen), DocTypes `Plattform EG <Name>` (Ordner `plattform_eg_<name>`), Controller registrieren ihr Präfix in `PRAEFIX` (siehe 3.1). Kein `allow_guest` außer dem öffentlichen Rechner (WP6, ohne Personendaten).
4. **Kein Paket schreibt fremde Entitäten direkt.** Status einer Teilnahme ändert nur `egTeilnahmeUebergang` (WP1), Stammdaten nur die WP1-Operationen; Ereignisse laufen über `egEreignisSenden` (Abschnitt 6).
5. **Gemeinsame Dateien ändert ausschließlich WP1**: `eg/modell.js`, `eg/rechte.js`, `eg/navigation.js`, `backend/eg.js`, `src/lib/plattform/rechte.js` (+ `plattform/rechte.py`), `src/components/Portal/PortalRahmen.js`, `docs/API.md` (Abschnitt „Energiegemeinschaften“), `docs/PLATTFORM.md`, `docs/EG-SCHNITTSTELLEN.md`, `Backend-Import/werkzeuge/desk_rechte.py` (EG-Block), `hooks.py`/`patches.txt` (EG-Einträge).
6. **Tailwind-Falle**: In `src/**` keine eckigen Klammern mit Text in Strings/Kommentaren (Tailwind liest sie als Klassen). „zu bestätigen“ daher in **runden** Klammern schreiben: `(zu bestätigen)`.
7. **Demo-Daten** nur fiktiv („(Demo)“, `example.com`). Eigene Seeds in eigener Datei (`demo/eg-<paket>-seed.js`), Bezug auf WP1-Demo über `gemeinschaft.seedSchluessel` (`sonnenland`, `alpenvorland`, `linzerstrasse`) – nie über zufällige IDs.
8. **Ressourcen**: Tests ohne Server (Logik/Python), höchstens eine Testreihe gegen den Server; Dev-Server nie neu starten; keine neuen Pakete.

## 2. Zuständigkeiten (exakt nach Fachkonzept 8)

| WP | Reine Regeln `src/lib/plattform/eg/` | Backend | Frappe | DocTypes `Plattform EG …` | Seiten / Komponenten |
|---|---|---|---|---|---|
| **WP1** Kern | `modell.js`, `stamm.js`, `mitglied.js`, `zaehlpunkt.js`, `anlage.js`, `tarif.js`, `netzbetreiber.js`, `netzentgelt.js`, `rechte.js`, `status.js`, `navigation.js`, `migration.js`, `index.js` | `backend/eg.js` (Fassade), `demo/eg-stamm.js`, `demo/eg-stamm-seed.js`, `frappe/eg-stamm.js` | `eg_modell.py`, `eg_stamm_kern.py`, `api/eg_stamm.py`, `patches/eg_migration_stamm.py` | Gemeinschaft, Organ, Mitglied, Zaehlpunkt, ZP Teilnahme, Anlage, Tarif, Verteilschluessel, Netzbetreiber, Netzentgelt Regel (+ Kindtabellen) | `/portal/admin/eg`, `/portal/admin/eg/[id]` (Reiter Stammdaten, Mitglieder & Zählpunkte, Anlagen & Tarife), `/portal/admin/eg/netzbetreiber`, `/portal/eg/[id]/verwaltung`; `src/components/Portal/EG/Stamm/**`; APIs `/api/admin/eg/**` (Stamm), `/api/portal/eg/[id]/verwaltung`; Migration `scripts/eg-migration.mjs` |
| **WP2** EDA | `eda/**` (Schemas, Builder, Parser, Automat, Responsecodes) | `demo/eg-eda.js`, `frappe/eg-eda.js` | `eg_eda_kern.py`, `api/eg_eda.py`, `eg_eda_jobs.py`; Gateway `Backend-Import/dienste/eda-gateway/**` | EDA Prozess, EDA Nachricht | `/portal/admin/eg/[id]/eda/**`; `src/components/Portal/EG/Eda/**` |
| **WP3** Energie | `messwerte.js`, `qualitaet.js`, `verteilung.js`, `simulation.js`, `prognose.js`, `optimierung.js`, `speicher.js` | `demo/eg-energie.js`, `frappe/eg-energie.js` | `eg_energie_kern.py`, `api/eg_energie.py` | Messreihe, Messmonat, Simulation | `/portal/admin/eg/[id]/energiedaten`, `/portal/admin/eg/simulation`; `src/components/Portal/EG/Energie/**` |
| **WP4** Abrechnung | `abrechnung.js`, `ust.js`, `belege.js`, `ersparnis.js`, `zahlung.js`, `buchhaltung.js`, `beleg-pdf.js` | `demo/eg-abrechnung.js`, `frappe/eg-abrechnung.js` | `eg_abrechnung_kern.py`, `api/eg_abrechnung.py` | Periode, Beleg, Beleg Position, Zahlung, Buchung | `/portal/admin/eg/[id]/abrechnung/**`, `/[id]/buchhaltung/**`, Organe: `/portal/eg/[id]/abrechnung`, `/portal/eg/[id]/kasse`; `src/components/Portal/EG/Abrechnung/**` |
| **WP5** Gründung | `gruendung.js`, `wechsel.js`, `verein.js`, `statuten.js`, `vertraege.js`, `foerder.js`, `lieferantenpflichten.js`, `vorlagen/**` | `demo/eg-gruendung.js`, `frappe/eg-gruendung.js` | `eg_gruendung_kern.py`, `api/eg_gruendung.py` | Gruendungsauftrag, Gruendungsschritt, Import, Foerdercheck | `/portal/eg/gruendung/**`, `/portal/admin/eg/gruendung/**`, `/portal/admin/eg/[id]/organe`, `/[id]/versammlungen`, Organe: `/portal/eg/[id]/versammlungen`; `src/components/Portal/EG/Gruendung/**` |
| **WP6** Portale | `dashboard.js`, `anreize.js`, `empfehlung.js`, `interesse.js` | `demo/eg-portal.js`, `frappe/eg-portal.js` | `eg_portal_kern.py`, `api/eg_portal.py` | Interesse | `/portal/eg/**` (außer `gruendung` und den Organ-Reitern), Rechner-Teil von `/energiegemeinschaften` bzw. `/energiegemeinschaften/rechner`; `src/components/Portal/EG/{Mitglied,Gemeinde}/**`; E2E `scripts/plattform-test-eg-portal.mjs`; Organ-Reiter `/portal/eg/[id]/energie` gehört WP3 |

Platzhalter-Seiten von WP1 (zum Ersetzen): `/portal/admin/eg/gruendung` (WP5), `/portal/admin/eg/simulation` (WP3), `/portal/eg` (WP6). Gemeinsamer Platzhalter: `src/components/Portal/EG/Stamm/EgPlatzhalter.js`.
Tests je Paket: `src/lib/plattform/eg/<paket>.test.mjs` bzw. `scripts/plattform-test-eg-<paket>.mjs` (`--nur-logik` ohne Server), Python `plattform/tests/test_eg_<paket>_kern.py` (ohne Frappe) und `test_eg_<paket>.py` (mit Frappe).
Abgelöst: Prototyp `mitglied/gemeinschaft.js`, `/portal/admin/energiegemeinschaften`, `/portal/beteiligung/energiegemeinschaft` (bleiben bis zur Migration lesbar; DE/CH-Formen bleiben dort eingefroren).

## 3. Datenmodell (`src/lib/plattform/eg/modell.js`, Python `plattform/eg_modell.py`)

Alle Konstanten und JSDoc-Typen stehen in `modell.js`; Python-Spiegel wird erzeugt (`node scripts/eg-modell-export.mjs`, Prüfung `--pruefen`). Jede Entität: `id`, `erstelltAm`, `erstelltVon`, `geaendertAm`, `geaendertVon`, optional `demo`, bei Migration `migriertAus`.

### 3.1 Kennungen (Präfix-JJ-XXXXXX, max. 3 Buchstaben)

| Entität | Präfix | DocType | WP |
|---|---|---|---|
| Gemeinschaft | `EGG` | Plattform EG Gemeinschaft | 1 |
| Organ | `EGO` | Plattform EG Organ | 1 |
| Mitglied | `EMG` | Plattform EG Mitglied | 1 |
| Zählpunkt | `EZP` | Plattform EG Zaehlpunkt | 1 |
| Teilnahme | `ETN` | **Plattform EG ZP Teilnahme** (der Name „Plattform EG Teilnahme“ ist vom Prototyp belegt) | 1 |
| Anlage / Tarif / Verteilschlüssel | `EAN` / `ETF` / `EVS` | Plattform EG Anlage / Tarif / Verteilschluessel | 1 |
| Netzbetreiber / Netzentgelt-Regel | `ENB-<kurz>` / `ENR-<…>` (sprechend, fest) | Plattform EG Netzbetreiber / Netzentgelt Regel | 1 |
| EDA-Prozess / -Nachricht | `EDP` / `EDN` | Plattform EG EDA Prozess / Nachricht | 2 |
| Messreihe / Messmonat / Simulation | `EMR` / `EMM` / `ESI` | Plattform EG Messreihe / Messmonat / Simulation | 3 |
| Periode / Beleg / Zahlung / Buchung | `EPR` / `EBL` / `EZA` / `EBU` | Plattform EG Periode / Beleg / Zahlung / Buchung | 4 |
| Gründungsauftrag / Import / Förder-Check | `EGA` / `EIM` / `EFC` | Plattform EG Gruendungsauftrag / Import / Foerdercheck | 5 |
| Interesse | `EIN` | Plattform EG Interesse | 6 |

### 3.2 Entitäten und Beziehungen

```
Netzbetreiber n─m Gemeinschaft 1─n Organ (kontoId → Konto; Teamrolle je Funktion)
                     │ 1─n Mitglied (kontoId → Konto, beliebige Portal-Rolle) 1─n Teilnahme n─1 Zählpunkt (global, eindeutige Nummer) n─1 Anlage
                     │ 1─n Tarif (versioniert)      1─n Verteilschlüssel (nur statisch)      0─1 Vorgänger/Nachfolger (Umwandlung)
                     │ 1─n EDA-Prozess (WP2) · 1─n Messreihe (WP3, je Zählpunkt) · 1─n Periode → Beleg (WP4) · 0─1 Gründungsauftrag (WP5)
Zählpunkt: max. 5 zählende Teilnahmen, Σ Teilnahmefaktor ≤ 100 (aktive + geplante), je Gemeinschaft höchstens eine
```

| Entität | Pflichtfelder (Auszug, vollständig siehe JSDoc in `modell.js`) | Zustände |
|---|---|---|
| Gemeinschaft `EgGemeinschaft` | `name`, `modell` (`eeg`/`beg`/`gea`/`p2p`/`eigenversorgung`), `zonelevel` 1–7 (zulässig je Modell, `ZONELEVEL`), `rechtsform`, `netzbetreiber[]`, `verteilmodell`, `edaAnbindung`, `marktpartnerId`, `gemeinschaftsId`, `dienstleistung{aktiv,paket,seit,avvAm}`, `seedSchluessel` (Demo) | `GEMEINSCHAFT_STATUS` interesse → machbarkeit → in_gruendung → rechtsperson → marktpartner → vertrag_nb → eda_bereit → aktiv ⇄ aufnahmestopp → in_aufloesung → aufgeloest; umgewandelt |
| Organ `EgOrgan` | `gemeinschaftId`, `kontoId` oder `name`, `funktion` (`ORGAN_FUNKTIONEN`), `von`, `bis`, `zeichnungsberechtigt` | `aktiv`, `beendet` |
| Mitglied `EgMitglied` | `gemeinschaftId`, `kontoId?`, `mitgliedsnummer` (fortlaufend), `art` (`MITGLIED_ARTEN`), `person{…}`, `steuerstatusErzeuger`, `uid`, `iban`, `sepaMandat`, `rechnungsweg`, `abrechnungsrhythmus`, `schutzbeduerftig` | `MITGLIED_STATUS` interessent → antrag → geprueft → aufgenommen → aktiv → gekuendigt → ausgeschieden; abgelehnt, ausgeschlossen |
| Zählpunkt `EgZaehlpunkt` | `zaehlpunktnummer` (33), `nbNummer`, `plz`, `netzbetreiberId`, `richtung` (`verbrauch`/`erzeugung`), `anlageId`, `inhaberKontoId`, `smartMeter`, `netzebene` | – (global, wird bei Mehrfachteilnahme wiederverwendet) |
| Teilnahme `EgTeilnahme` | `zaehlpunktId`, `gemeinschaftId`, `mitgliedId`, `teilnahmefaktor` 1–100, `aufteilungsschluesselPct` (statisch), `consentId`, `gueltigAb`, `gueltigBis`, `tfHistorie[]`, `verlauf[]`, `responsecode`, `fristBis`, `beendetGrund`, `anmeldungVorgemerkt` | `TEILNAHME_STATUS` (Automat 3.8, Ereignisse siehe 3.3) |
| Anlage `EgAnlage` | `art`, `engpassleistungKw`/`kwp`, `nutzungsmodell`, `foerderung`, `haushalt`, `eigentuemerMitgliedId`, `iotQuelle` | geplant, aktiv, stillgelegt |
| Tarif `EgTarif` | `gueltigAb`, `bezugspreisCt`, `einspeisepreisCt` (netto, 4 NK), `zeitfenster[]` (TOU), Gebühren, `sozialtarif`, `individuell[]`, `beschluss` | entwurf, beschlossen, aktiv, abgeloest (Vorgänger endet automatisch am Vortag) |
| Verteilschlüssel `EgVerteilschluessel` | `gueltigAb`, `positionen[{teilnahmeId,pct}]`, `summePct` | entwurf, gesendet (WP2), gueltig |
| Netzbetreiber `EgNetzbetreiber` | `id` (`ENB-…`), `nbNummer` (+ `nbNummerStatus`), `marktpartnerId`, `vertragsweg`, Kontakt, `plzListe[]`, `netzentgeltAp[]` | – |
| Netzentgelt-Regel `EgNetzentgeltRegel` | `gueltigAb/Bis`, `bezug` (`modell` bis 2026 / `zonelevel` ab 2027), `netzebenen[]`, `reduktionPct`, `abgabenBefreitModelle[]`, `status` (gesichert/entwurf/platzhalter) | – |

### 3.3 Zustandsautomat Teilnahme (Ereignisse für `egTeilnahmeUebergang`)

| von | Ereignis → nach | Pflichtangaben / Wirkung |
|---|---|---|
| entwurf | `senden` → angefragt · `verwerfen` → verworfen | – |
| angefragt | `anforderung_econ` → zustimmung_offen · `ablehnung_econ` → abgelehnt · `fehler` → entwurf | `fristBis` = Datum + 30 Tage |
| zustimmung_offen | `zustimmung_econ` → zugestimmt · `frist_abgelaufen` → abgelaufen · `ablehnung_econ` → abgelehnt | `consentId` |
| zugestimmt | `antwort_econ` → wartet_technik · `abschluss_econ` → aktiv | `datum` = Aktivierungsdatum (Pflicht), TF-Historie |
| wartet_technik | `abschluss_econ` → aktiv · `ablehnung_econ` → abgelehnt | – |
| aktiv | `tf_geaendert` → aktiv · `cm_rev_sp` → abmeldung_angefragt · `cm_rev_cus` / `cm_rev_imp` → beendet | TF ganzzahlig 1–100, **1 Änderung pro Tag**, Σ ≤ 100; Abmeldung nicht rückwirkend |
| abmeldung_angefragt | `abmeldung_ok` → beendet · `abmeldung_abgelehnt` → aktiv | `gueltigBis` |
| abgelehnt / abgelaufen | `erneut` → entwurf | Consent und Frist zurückgesetzt |

Allgemein: `responsecode`, `prozessId` (EDP-…) werden übernommen; jeder Übergang schreibt `verlauf[]`. Ohne `prozessId` (manuelle Korrektur) ist `grund` Pflicht.

### 3.4 Feldnamen JS ↔ Frappe

camelCase ↔ snake_case (`gemeinschaftsId` ↔ `gemeinschafts_id`, `zaehlpunktnummer` ↔ `zaehlpunktnummer`, `teilnahmefaktor` ↔ `teilnahmefaktor`, `aufteilungsschluesselPct` ↔ `aufteilungsschluessel_pct`, `kontoId` ↔ `konto` (Link Plattform Konto), `gemeinschaftId` ↔ `gemeinschaft` (Link)). Verschachtelte Objekte (`person`, `sitzAdresse`, `sepaMandat`, `dienstleistung`) sind in Frappe flache Felder mit Präfix (`person_vorname`, `sitz_plz`, `sepa_referenz`, `dienstleistung_aktiv`); Listen sind Kindtabellen (`Plattform EG TF Historie`, `Plattform EG Tarif Zeitfenster`, `Plattform EG Gemeinschaft Netzbetreiber`, `Plattform EG Verteilschluessel Position`, `Plattform EG Netzbetreiber PLZ`). Die API gibt immer camelCase aus (wie das Demo-Backend).

## 4. Backend-Fassade `src/lib/plattform/backend/eg.js`

`import { egBackend, egSystem, egEreignisSenden, EG_OPERATIONEN } from "@/lib/plattform/backend/eg";` – `n` = angemeldeter Nutzer, `egSystem()` = Systemkonto (Scheduler, Ereignisse). Fehler: `PlattformFehler` (401/403/404/409/422/501).

### WP1 Stamm (implementiert: Demo; Frappe-API `api/eg_stamm.py`)

| Operation | Rückgabe | Recht (Kontext, eg/rechte.js) |
|---|---|---|
| `egKontext(n, {gemeinschaftId?})` | `{gemeinschaften:[{id,name,modell,status,rollen[],rollenLabels[],backofficeStufe,organ,rechte{}}]}` | angemeldet; nur Gemeinschaften mit Rolle |
| `egGemeinschaften(n, {status?,modell?,q?})` | `{gemeinschaften[] (inkl. kennzahlen, hinweise, netzentgelt, tarifAktuell), kennzahlen, darfSchreiben, heute}` | Backoffice Bereich „eg“ lesen |
| `egGemeinschaft(n, id)` | `{gemeinschaft, organe[], mitglieder[], zaehlpunkte[], teilnahmen[], anlagen[], tarife[], verteilschluessel[], netzbetreiber[], rollen[], rechte{}, backofficeStufe, hinweise[], reiter[], heute}` | `mitgliederliste` ≥ 1 (Details ab `stammdaten` ≥ 1) |
| `egGemeinschaftSpeichern(n, {id?, daten})` | Gemeinschaft | neu: Backoffice „eg“ schreiben; ändern: `organe_statuten` 2 |
| `egGemeinschaftStatus(n, id, {nach, grund?, nachfolgerId?})` | Gemeinschaft | `organe_statuten` 2 (aktiv/aufnahmestopp/eda_bereit: Vorstand oder Backoffice) |
| `egOrganSpeichern(n, {gemeinschaftId, id?, daten})` · `egOrganBeenden(n, id, {bis})` | Organ | `organe_statuten` 2 |
| `egMitgliedSpeichern(n, {gemeinschaftId, id?, daten})` | Mitglied | `stammdaten` 2 |
| `egMitgliedStatus(n, id, {nach, grund?, zum?})` | Mitglied | aufnehmen/ablehnen/ausschließen: `mitglied_aufnehmen` 2, sonst `stammdaten` 2 |
| `egZaehlpunktSpeichern(n, {gemeinschaftId, id?, daten})` | `{zaehlpunkt, hinweise[]}` (bekannte Nummer → vorhandener Zählpunkt) | `stammdaten` 2 |
| `egTeilnahmeSpeichern(n, {gemeinschaftId, id?, daten:{zaehlpunktId, mitgliedId, teilnahmefaktor, aufteilungsschluesselPct?, fremdTf?, fremdAnzahl?}})` | Teilnahme (nur Entwurf) | `stammdaten` 2 |
| `egTeilnahmeUebergang(n, teilnahmeId, {ereignis, datum?, consentId?, teilnahmefaktor?, responsecode?, prozessId?, grund?})` | Teilnahme | `eda_ausloesen` 2 (Organisator/Gründung/System); senden/verwerfen: `stammdaten` 2 |
| `egAnlageSpeichern` · `egTarifSpeichern` · `egVerteilschluesselSpeichern` (je `{gemeinschaftId, id?, daten}`) | Entität | `stammdaten` 2 · `tarife` (Entwurf ≥ 1, beschlossen/aktiv 2 + Vorstand/Backoffice) · `stammdaten` 2 |
| `egMassenaktion(n, gemeinschaftId, {aktion, ids[], werte{}})` | `{geaendert, fehler[{id,fehler}]}` | je Aktion (`mitglied_status`, `rechnungsweg`, `abrechnungsrhythmus`, `schutzbeduerftig`, `zp_smartmeter`, `zp_netzebene`, `tf_entwurf`, `anmeldung_vormerken`) |
| `egCsvImport(n, gemeinschaftId, {art:"mitglieder", csv, ausfuehren})` | `{vorschau[{zeile,aktion,name,zaehlpunkt,hinweise,fehler}], fehler[], angelegt, geaendert, spalten[]}` | Vorschau `stammdaten` 1, Ausführen 2 (bricht bei Fehlern ab) |
| `egCsvExport(n, gemeinschaftId, {art:"mitglieder"\|"zaehlpunkte"})` | `{dateiname, csv}` (BOM, Semikolon, Formelschutz) | `mitgliederliste` 1 (Personendaten ab `stammdaten` 1), protokolliert |
| `egNetzbetreiber(n)` · `egNetzentgeltRegeln(n, {stichtag?})` | Listen | angemeldet |
| `egVerwaltung(n, gemeinschaftId)` | Organe-Sicht: `{gemeinschaft, organe, mitglieder, teilnahmenStatus, tarife, aufgaben[], hinweise, rollen, rechte, reiter}` | Organ-Rolle oder Backoffice |
| `egMigrationVorschau(n)` · `egMigrationAusfuehren(n)` | Anzahlen, Warnungen, Übersprungenes | Backoffice „eg“ schreiben |

CSV-Vorlage (Import): `mitgliedsnummer;art;vorname;nachname;firma;strasse;plz;ort;email;iban;sepa_referenz;sepa_datum;steuerstatus;uid;zaehlpunkt;richtung;teilnahmefaktor;kwp`.
Demo-intern für andere Pakete: `import { egIntern } from "./eg-stamm"` → `lesenBereit`, `aendernBereit`, `zugriff(db, n, gid, recht, stufe)`, `kontext`, `heute`, `E(db)` (Sammlung `db.eg`). Eigene Daten anderer Pakete liegen in eigenen Sammlungen (`db.egEda`, `db.egEnergie`, `db.egAbrechnung`, `db.egGruendung`, `db.egPortal`).

### WP2–WP6 (Signaturen – Implementierung durch das Paket, bis dahin 501)

| WP | Operation (Signatur) | Rückgabe / Bemerkung |
|---|---|---|
| 2 | `edaProzesse(n, gemeinschaftId, {status?, code?})` · `edaProzess(n, id)` | Liste / Detail mit Nachrichten |
| 2 | `edaAnmelden(n, gemeinschaftId, {teilnahmeIds[], offline?})` | erzeugt `EC_REQ_ONL`/`EC_REQ_OFF`, ruft `egTeilnahmeUebergang(…,"senden")` |
| 2 | `edaTfAendern(n, gemeinschaftId, {aenderungen:[{teilnahmeId, teilnahmefaktor, ab}]})` · `edaAbmelden(n, gemeinschaftId, {teilnahmeIds[], zum})` | `EC_PRTFACT_CHG` / `CM_REV_SP` (Vier-Augen bei Masse: `eda_freigeben`) |
| 2 | `edaVerteilschluesselSenden(n, verteilschluesselId)` · `edaPodlistAnfordern(n, gemeinschaftId)` · `edaNachforderung(n, {zaehlpunktId, von, bis})` | `EC_PRT_CHANGE` / `EC_PODLIST` / `CR_REQ_PT` |
| 2 | `edaNachrichtEingang(sys, {xml, quelle})` · `edaFristenLauf(sys)` · `edaGemeinschaftBereit(sys, {gemeinschaftId})` | idempotent je Message-ID; sendet `eg.energiedaten.empfangen` |
| 3 | `enMessreihen(n, {gemeinschaftId, zaehlpunktId?, von, bis, groessen?})` · `enEnergiedatenEmpfangen(sys, EgEnergiedatenPayload)` | Tagesblöcke (Fachkonzept 3.12) |
| 3 | `enPeriodenwerte(n, gemeinschaftId, von, bis)` | `{zaehlpunkte:[{zaehlpunktId, teilnahmeId, mitgliedId, groessen:{eigendeckung:kWh,…}, vollstaendig, anteilL3}]}` – **Eingang für WP4** |
| 3 | `enQualitaet(n, gemeinschaftId, {monat})` · `enAbweichungsbericht(n, gemeinschaftId, {monat})` · `enCsvImport(n, gemeinschaftId, {csv})` | Ampel, Abweichung NB ↔ eigene Zuteilung |
| 3 | `enSimulation(n, {daten})` · `enSimulationen(n, {gemeinschaftId?})` · `enPrognose(n, gemeinschaftId)` · `enOptimierung(n, {zaehlpunktId})` | Simulation 4.7, Prognose 4.8, TF-Optimierer 4.9 |
| 4 | `abPerioden(n, gemeinschaftId)` · `abPeriodeAnlegen(n, gemeinschaftId, {von, bis, art})` · `abPeriodeAktion(n, id, {aktion:"vorschau"\|"freigeben"\|"versenden"\|"abschliessen"\|"stornieren", …})` | Vier-Augen: `abrechnung_freigabe_1` + `_2` |
| 4 | `abBelege(n, {gemeinschaftId?, mitgliedId?, periodeId?})` · `abBelegPdf(n, id)` · `abZahlungslauf(n, gemeinschaftId, {art:"pain008"\|"pain001", belegIds[]})` · `abCamtImport(n, gemeinschaftId, {xml})` · `abMahnlauf(n, gemeinschaftId)` | Mitglied sieht nur eigene Belege (WP6 liest über `abBelege`) |
| 4 | `abBuchungen(n, gemeinschaftId, {jahr})` · `abExport(n, gemeinschaftId, {art, jahr})` · `abKleinunternehmer(n, gemeinschaftId)` · `abJahresbescheinigung(n, mitgliedId, {jahr})` | E/A, UVA/K2-Vorbereitung, BMD/DATEV-CSV |
| 5 | `grAuftraege(n)` · `grAuftrag(n, id)` · `grAuftragAnlegen(n, {daten})` · `grAuftragAktion(n, id, {aktion, …})` · `grSchrittAktion(n, id, {schritt, aktion, …})` | legt Gemeinschaft über `egGemeinschaftSpeichern` an |
| 5 | `grDokumentErzeugen(n, {gemeinschaftId, vorlage, daten})` · `grImportVorschau(n, gemeinschaftId, {csv})` · `grImportAusfuehren(n, importId)` | Import schreibt über WP1-Operationen; danach `eg.import.uebernommen` |
| 5 | `grFoerdercheck(n, {gemeinschaftId?, daten})` · `grVersammlungen(n, gemeinschaftId)` · `grAufloesung(n, gemeinschaftId, {aktion})` | GV über bestehendes Versammlungsmodul |
| 6 | `ptUebersicht(n)` · `ptGemeinschaft(n, gemeinschaftId)` · `ptBelege(n)` · `ptEnergie(n, {zaehlpunktId, von, bis})` | nur eigene Daten (`eigene_daten`) |
| 6 | `ptBeitrittAntrag(n, gemeinschaftId, {daten}, {ip})` · `ptKuendigung(n, mitgliedId, {zum})` · `ptTfWunsch(n, teilnahmeId, {teilnahmefaktor})` | legt Mitglied/Teilnahme über WP1 an (Status antrag/entwurf) |
| 6 | `ptInteresse(null\|n, {daten}, {ip})` · `ptGemeindeSicht(n)` · `ptDatenauskunft(n)` · `ptRechner(null, {daten})` | öffentlich nur Interesse und Rechner |

## 5. Rechte

### 5.1 Backoffice (Rechte-Matrix `src/lib/plattform/rechte.js` = `plattform/rechte.py`)

- Neuer **Bereich `eg`** „Energiegemeinschaften (ElWG)“ für `/portal/admin/eg/**` und `/api/admin/eg/**`: Leitung 2, Buchhaltung 1, Lesen 1, Compliance 1, Energie 1, **eg 2**, übrige 0.
- Neue **Unterrolle `eg`** „Energiegemeinschaften“ (Betriebsführung/Organisator): `eg` 2, CRM/Aufgaben/Signatur/Kalender 2, Cockpit, Vorgänge, Vorlagen, Berichte, Nutzer, Support, Wissen, Genossenschaft, Kommunen 1.
- Der Prototyp-Bereich `genossenschaft` (alte Route `/portal/admin/energiegemeinschaften`) bleibt unverändert.

### 5.2 Kontext-Rollen je Gemeinschaft (`src/lib/plattform/eg/rechte.js`)

`egRollen({nutzer, gemeinschaft, organe, mitglieder, heute})` → `{rollen[], backofficeStufe}`; `egStufe(kontext, recht)`, `egDarf(kontext, recht, stufe)`, `egRechteVon(kontext)`, `istOrgan(kontext)`.

| Rolle | entsteht durch |
|---|---|
| `vorstand` (Obmann/Obfrau, Stellvertretung, Vorstand, Geschäftsführung) · `kassier` · `schriftfuehrer` · `rechnungspruefer` (auch Aufsichtsrat) | wirksamer **Organ**-Eintrag mit eigenem Konto (Teamrolle innerhalb der Gemeinschaft, analog Bank-Team) |
| `mitglied` / `gemeinde` | **Mitglied**-Eintrag mit `kontoId` im Status aufgenommen/aktiv/gekündigt (Konto mit beliebiger Portal-Rolle: mitglied, landwirt, unternehmen, kommune …) |
| `interessent` | Mitglied-Eintrag interessent/antrag/geprüft (WP6 zusätzlich: Interesse) |
| `organisator` | Backoffice mit Bereich „eg“ und `dienstleistung.aktiv` (Dienstleistungs-/AV-Vertrag) |
| `gruendung` | Backoffice mit Bereich „eg“, Gemeinschaft vor „aktiv“ |

Rechte (Stufe 0/1/2, Spalten interessent · mitglied · gemeinde · vorstand · kassier · schriftfuehrer · rechnungspruefer · organisator · gruendung): `eigene_daten`, `beitritt`, `mitgliederliste`, `mitglied_aufnehmen`, `stammdaten`, `organe_statuten`, `eda_ausloesen`, `eda_freigeben`, `qh_aggregiert`, `qh_einzeln` (protokollieren!), `tarife`, `abrechnung_vorschau`, `abrechnung_freigabe_1` (Kassier), `abrechnung_freigabe_2` (Vorstand), `abrechnung_versand`, `sepa`, `buchhaltung`, `buchhaltung_pruefen` (Rechnungsprüfung), `gv`, `gruendungsauftrag`, `audit` – Werte in `EG_RECHTE`.
Backoffice-Organisator/Gründung sind auf die Stufe im Bereich „eg“ gedeckelt. **Stammdatenpflege** (`BACKOFFICE_PFLEGE`: mitgliederliste, stammdaten, organe_statuten, mitglied_aufnehmen, tarife, audit, qh_aggregiert) darf das Backoffice mit Bereich „eg“ auch ohne Kontext-Rolle (protokolliert); EDA, Freigaben, Zahlungen, Rechnungsprüfung und Einzelwerte bleiben an Kontext-Rollen gebunden.
Seiten: ohne jede Rolle → 404; mit Rolle, aber ohne Recht → 403 (API) bzw. Knopf ausgeblendet.

## 6. Ereignisse (`EG_EREIGNISSE`, `egEreignisSenden(name, payload)`)

| Ereignis | von → an | Empfänger-Operation | Payload |
|---|---|---|---|
| `eg.energiedaten.empfangen` | WP2 → WP3 | `enEnergiedatenEmpfangen` | `EgEnergiedatenPayload` (`gemeinschaftId`, `zaehlpunktnummer`, `nachrichtId`, `messageId`, `von`, `bis`, `reihen[{groesse, werte[], qualitaet[]}]`) |
| `eg.gemeinschaft.eda_bereit` | WP5 → WP2 | `edaGemeinschaftBereit` | `{gemeinschaftId}` |
| `eg.import.uebernommen` | WP5 → WP2 | `edaPodlistAnfordern` | `{gemeinschaftId}` |
| `eg.teilnahme.geaendert`, `eg.periode.freigegeben` | WP1/WP4 → alle | – (nur Information) | – |

Frappe: dieselben Namen als `frappe.enqueue`-Jobs (`oekoinvest_app.plattform.api.eg_<paket>.<operation>`), Wiederholung mit Backoff beim Absender.

## 7. Navigation (`src/lib/plattform/eg/navigation.js`)

- **Menü** (PortalRahmen.js): Gruppe „Energiegemeinschaften“ im Backoffice: Gemeinschaften `/portal/admin/eg`, Gründungsaufträge `/portal/admin/eg/gruendung` (WP5), Simulation `/portal/admin/eg/simulation` (WP3), Netzbetreiber & Netzentgelte `/portal/admin/eg/netzbetreiber` (WP1). Portal: „Energiegemeinschaft“ `/portal/eg` für Konten mit Rolle mitglied, kommune, landwirt, unternehmen.
- **Reiter je Gemeinschaft** `EG_ADMIN_REITER` (Backoffice: Stammdaten · Mitglieder & Zählpunkte · Anlagen & Tarife (WP1) · Organe · Versammlungen (WP5) · EDA (WP2) · Energiedaten (WP3) · Abrechnung · Buchhaltung (WP4)) und `EG_ORGAN_REITER` (Organe: Verwaltung (WP1) · Abrechnung & Freigaben · Kassa (WP4) · Versammlungen (WP5) · Energiedaten (WP3), je mit Mindestrecht). Komponente `src/components/Portal/EG/Stamm/EgReiter.js` – jede Seite unter `/[id]/…` bindet sie oben ein.
- **Brotkrumen**: `EG_BROTKRUMEN` (gilt für Pfade mit Segment `eg`).

## 8. Demo-Grundgerüst (`backend/demo/eg-stamm-seed.js`, Sammlung `db.eg`)

| `seedSchluessel` | Gemeinschaft | Inhalt |
|---|---|---|
| `sonnenland` | **Sonnenland Innviertel (Demo)** – EEG lokal, Zonelevel 3, Verein, Netz OÖ (`AT003000…`), aktiv, Organisator ÖkoInvest | 25 Mitglieder (u. a. `mitglied@`, `landwirt@`, `kommune@` mit 4 Gemeinde-Zählpunkten), 34 Zählpunkte in allen Teilnahme-Zuständen, 7 PV-Anlagen (127 kW → § 69), Tarif mit Mittagsstrom + abgelöster Vorgänger, Organe mit Konten |
| `alpenvorland` | **Bürgerenergie Alpenvorland (Demo)** – BEG im Aufbau (in_gruendung, Zonelevel 7, Netz OÖ + Salzburg Netz) | 5 Mitglieder (Antrag/Interessent, ein Großunternehmen), Mehrfachteilnahme: Landwirt-Erzeugung 60 % Sonnenland + 40 % BEG (Entwurf) |
| `linzerstrasse` | **GEA Wohnhausanlage Linzer Straße (Demo)** – GEA, Zonelevel 1, Wiener Netze, statischer Schlüssel | Hausverwaltung + 8 Wohnungen + Allgemeinstrom, PV 30 kWp, Verteilschlüssel Σ 100 % |

Demo-Konten (Passwort wie alle Demo-Konten): `eg-obmann@example.com` (Obmann), `eg-kassier@example.com` (Kassier), `eg-pruefer@example.com` (Rechnungsprüfer) – alle Rolle `mitglied`, Organ in Sonnenland. Backoffice: `admin@example.com` (Leitung).

## 9. Migration aus dem Prototyp

`src/lib/plattform/eg/migration.js` `migrationAusPrototyp(alt, {neueId, heute, vorhanden, netzbetreiber, namen})` – idempotent über `migriertAus`; nur AT. Abbildung: Form → Modell/Zonelevel (eeg_lokal → eeg/3, eeg_regional → eeg/4, beg → beg/6, gea → gea/1), Status (aufbau → in_gruendung, geschlossen → aufnahmestopp), Teilnahme (beantragt → entwurf, angemeldet → angefragt, aktiv, beendet, abgelehnt), je Person ein Mitglied, Bezug/Einspeisung als getrennte Zählpunkte, Preise → Tarif, kWp → PV-Anlage; fehlende Consent-IDs → Warnung + EC_PODLIST-Abgleich. Demo: `egMigrationVorschau`/`egMigrationAusfuehren` (Backoffice-Knopf auf `/portal/admin/eg`, Skript `scripts/eg-migration.mjs`), Frappe: Patch `plattform/patches/eg_migration_stamm.py` (liest die JSON-DocTypes, alte DocTypes bleiben lesbar).

## 10. Offene Punkte (Vertrag)

- Netzbetreibernummern außer Wiener Netze/Netz NÖ/Netz OÖ (alle „zu bestätigen“) und Netzentgelt-Arbeitspreise je Netzbereich sind noch zu pflegen (`netzentgeltAp`).
- Marktpartner- und Gemeinschafts-ID-Format für P2P/Eigenversorgung offen (Formatprüfung nur generisch).
- Netzentgelt Okt.–Dez. 2026: Fachkonzept (SNE-V 2018 gilt weiter) und Marktanalyse („Übergangslücke“) widersprechen sich – Regeltabelle folgt dem Fachkonzept, Ersparnis nur als Schätzung.
- Zustimmungsfrist: Fachkonzept 30 Tage, Marktanalyse 10 Werktage (Altregel) – `ZUSTIMMUNG_FRIST_TAGE` = 30.

## 11. Nachträge (Stand nach Schritt 2)

- **WP2-Operationen** zusätzlich in `EG_OPERATIONEN.eda`: `edaUebersicht`, `edaJournal`, `edaFreigaben`, `edaFreigeben`, `edaErneutAnstossen`, `edaErinnern`, `edaReklamation`, `edaSimulator`, `edaAusgang`, `edaAusgangQuittung`.
- **Python für andere Pakete** (`plattform/api/eg_stamm.py`): `zugriff(n, gemeinschaft_id, recht, stufe=1)` → `(g, k)` (401/404/403 wie Demo, `n.system` = organisator + gruendung, Stufe 2), `teilnahme_uebergang_intern(n, teilnahme_id, daten)`, `system_nutzer()`, `gemeinschaft_daten(gid)`, `aus_doc`/`in_doc` (Abbildung DocType ↔ camelCase); Schreibmethoden mit `_n=<nutzer>` (ohne erneute API-Benutzerprüfung). Kern: `eg_stamm_kern.rollen_von` = `eg_rollen`, `stufe_von` = `eg_stufe`.
- **Next-Routen**: dynamisches Segment heißt überall `[id]` (`/api/admin/eg/[id]/…`, `/api/portal/eg/[id]/…`). Gemeinsame Stammdaten-Aktionen: `src/lib/plattform/server/eg-aktion.js` (`egAktion`, `csvAntwort`).
- **Mitglied `vertraege`** wird beim Anlegen übernommen (`[{art, dokumentId, version, am}]`, max. 30).
- **Desk-Rechte** eingetragen für WP1, WP2 (EDA Prozess/Nachricht) und WP4 (Periode, Beleg, Zahlung, Buchung); WP3/WP5/WP6 melden ihre DocTypes per Patch.
- **hooks.py** (WP2 `eg_eda_jobs.stuendlich`/`taeglich`) wird eingetragen, sobald `plattform/eg_eda_jobs.py` existiert (pruefen.py prüft die Pfade).
- **Seed-Version 2**: Sonnenland-Bestandsteilnahmen mit 13 Monaten Historie (`gueltigAb` ≈ heute − 410 Tage) für WP3.

- **Belegversand (Koordinator-Entscheidung):** `abrechnung_versand` – Organisator immer 2; Vorstand und Kassier 2 nur in Selbstverwaltung (Gemeinschaft ohne aktiven Organisator, `kontext.selbstverwaltung`), sonst 1. Vier-Augen-Freigabe unverändert. `egRollen` liefert dafür `selbstverwaltung`.

## 12. Nachträge Integration (nach WP1–WP6)

- **Periodenwerte-Cache (WP3):** `enPeriodenwerte` setzt Zeiträume aus Monatsbeiträgen zusammen (ganze Monate als Summe, angeschnittene Monate je Tag). Demo: Speicher-Cache je Gemeinschaft × Monat, Signatur aus Stichtag, Modell, Teilnahmen, Tarifen, Zählpunkten und Eingangsstand `db.egEnergie.standJe[gid]`; `einarbeiten` (EDA/CSV) verwirft die betroffenen Monate (`periodenCacheVerwerfen`). Frappe: `frappe.cache` Schlüssel `eg_periode|<gid>|<monat>` (26 h), Signatur inkl. `max(modified)` der Messreihen, `_einarbeiten` löscht die Monate. Mitglieder-Dashboard `/portal/eg/[id]` nach dem ersten Aufruf ≈ 1,3 s statt 5–18 s.
- **TF-Wünsche (WP6 → WP2):** `ptTfWuensche(n, gemeinschaftId)` (Recht `mitgliederliste` ≥ 1, `darfAusloesen` = `eda_ausloesen` 2) und `ptTfWunschUmsetzen(n, gemeinschaftId, {wunschIds[], entscheidung: "melden"|"ablehnen", ab?, grund?})` → `edaTfAendern` (EC_PRTFACT_CHG; 1 Änderung/Tag, Σ ≤ 100 %, Vier-Augen bei Masse). Route `/api/portal/eg/[id]/tf-wuensche`; Anzeige in `/portal/eg/[id]/verwaltung` und `/portal/admin/eg/[id]/eda`. Frappe: Protokoll `eg_tf_wunsch` (offen) / `eg_tf_wunsch_erledigt` (Text „TF-Wunsch <Aktivität> Teilnahme <id>: gemeldet|abgelehnt …“).
- **Vier-Augen-Freigaben** (`EdaFreigaben`, WP2) in `/portal/eg/[id]/verwaltung` eingebunden (Recht `eda_freigeben`).
- **Optimierer (WP3):** Kandidaten über `optimierungsTeilnahmen` (zählende Teilnahmen inkl. Entwurf; verworfen/abgelehnt/beendet nicht) und `optimierungsKandidat` (Messwerte nur mit Summe > 0, sonst Schätzung aus der Mitgliederliste ab Status „antrag“, sonst „keine“), Hinweise `optimierungsHinweise`; Python-Spiegel und Vektoren `optimierung.kandidaten`.
- **Probe-Abrechnung (WP5 → WP4):** WP4 kennt keine Art „probe“ – WP5 legt mit `probePeriode({von, bis})` → `{art: monat|quartal|jahr, probe: true}` an und liest die Vorschau `{periode: {vorschau: {belege}}}` über `probeKontrollwerte` (Schlüssel Mitgliedsnummer bzw. „Nr-G“ für Gutschriften, kWh, Netto).
