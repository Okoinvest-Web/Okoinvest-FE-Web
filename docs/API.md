# Plattform-API – Vertrag für die Frappe-App `oekoinvest_app`

Stand: September 2026 · Referenz-Implementierung: `src/lib/plattform/backend/demo.js` (verhält sich exakt so, wie hier beschrieben).
Adapter auf Next.js-Seite: `src/lib/plattform/backend/frappe.js` (Tabelle `METHODEN`). Zustandsautomaten: `src/lib/plattform/prozesse.js`.

Dieses Dokument beschreibt
1. die **whitelisted Frappe-Methoden**, die die Website serverseitig aufruft,
2. das **Datenmodell** (DocTypes, Felder),
3. **Rechte** (Rolle UND Eigentum) und **Zustandsautomaten**,
4. die **öffentlichen HTTP-APIs der Website** (`/api/...`), die Browser und Testskript nutzen.

---

## 1. Aufrufkonvention Next.js → Frappe

- `POST {SERVER}/api/method/oekoinvest_app.plattform.api.<modul>.<funktion>`
- Header `Authorization: token {API_KEY}:{API_SECRET}` (wie `src/lib/apiBaseUrl.js`), `Content-Type: application/json`.
- Der API-Nutzer hat in Frappe **nur** die Rolle `ÖkoInvest API`. Jede Methode prüft zuerst `"ÖkoInvest API" in frappe.get_roles()`. Keine Methode ist `allow_guest` – auch die „öffentlichen“ (ohne `als_benutzer`) ruft ausschließlich der API-Nutzer der Website auf. Nur `POST`.
- **Handeln im Namen eines Nutzers:** Alle Methoden außer den mit „öffentlich“ markierten bekommen `als_benutzer` = **Konto-ID** (`nutzer.id`, z. B. `U-26-7KQ2XM`; so sendet es `frappe.js`). Frappe löst daraus das `Plattform Konto` und dessen Frappe-User (`User.name` = E-Mail) auf – aus Robustheit wird auch die E-Mail-Adresse akzeptiert. Die Methode führt dann `frappe.set_user(<User des Kontos>)` aus (nur nach bestandener Prüfung der API-Rolle; unbekannte oder gesperrte Konten → 401; Konten mit `System Manager`/`ÖkoInvest API` werden nie über die Website gesteuert → 403) und prüft **selbst** Rolle und Eigentum. Die Website prüft vorab ebenfalls – Frappe ist die maßgebliche Instanz.
- Die fachlichen Rollen und `ÖkoInvest API` haben **keine** DocType-Rechte: `/api/resource/...` liefert dem API-Nutzer nichts; gelesen und geschrieben wird nur innerhalb der Methoden nach eigener Prüfung.
- Argumente und Antworten in **camelCase-JSON**, identisch zu den Objekten unten. Frappe-DocType-Felder sind snake_case; Umrechnung in der App (`plattform/ausgabe.py`, Positivlisten in den Methoden).
- Antwort: `{"message": <Ergebnis>}`. Ist das Ergebnis `None` (z. B. `auth.anmelden` mit falschen Daten, `interesse.merken` mit `an: false` ohne bestehendes Interesse), lässt Frappe `message` weg – der Adapter liefert dann `null`.
- Fehler: `frappe.throw(msg, exc)` mit
  - `frappe.PermissionError` → HTTP 403 (Website zeigt `msg`)
  - `frappe.DoesNotExistError` → 404
  - `frappe.ValidationError` / `MandatoryError` → 417 (Website macht 422 daraus, zeigt `msg`)
  - `frappe.DuplicateEntryError` → 409 (z. B. E-Mail vergeben, verbotener Statuswechsel)
  - `frappe.AuthenticationError` → 401
  Meldungen sind **deutsch, für Endnutzer**, ohne Interna. Tracebacks bleiben im Frappe-Log.
- Zeiten ISO 8601 in UTC (`2026-09-29T05:57:00.000Z`). Geldbeträge in EUR als Zahl. Prozentsätze als Dezimalbruch (`0.02` = 2 %).
- Kennungen: `U-26-XXXXXX` Nutzer, `V-` Vorgang, `F-` Fläche, `P-` Projekt, `I-` Interesse, `PV-` Provision, `D-` Dokument, `M-` Nachricht, `A-` Aktivität, `B-` Benachrichtigung, `AF-` Aufgabe, `E-` E-Mail im Demo-Postausgang. Frappe kann eigene Naming-Series nutzen, solange das Format `^[A-Z]{1,3}-[0-9A-Z-]{4,40}$` erfüllt ist (die Website validiert Kennungen so). Umsetzung in `oekoinvest_app`: Schema `PRÄFIX-JJ-XXXXXX` mit 6 zufälligen Zeichen (per Controller, nicht fortlaufend – Kennungen sind nicht aufzählbar).

## 2. Rollen

| Rolle (Website) | Frappe-Rolle | Selbst wählbar |
|---|---|---|
| `flaeche` | Plattform Flächeneigentümer | ja |
| `landwirt` | Plattform Landwirt | ja |
| `investor` | Plattform Investor | ja |
| `anbieter` | Plattform Anbieter | ja |
| `unternehmen` | Plattform Unternehmen | ja |
| `mitglied` | Plattform Mitglied | ja |
| `admin` | Plattform Backoffice | **nein** (nur durch Admin) |

Ein Konto kann mehrere Rollen haben. `admin` darf alles lesen und alle Admin-Übergänge auslösen; Eigentümer-Übergänge (z. B. Pachtangebot annehmen) bleiben dem Eigentümer vorbehalten.

Maßgeblich sind die Rollen am `Plattform Konto` (Tabelle `rollen`, Stammdaten `Plattform Rolle`); die Frappe-Rollen des Users werden daraus automatisch gesetzt (alle ohne Desk-Zugang).

Technische Rollen (nicht auf der Website):

| Frappe-Rolle | Wer | Desk |
|---|---|---|
| `ÖkoInvest API` | nur der technische API-Benutzer der Website | nein |
| `ÖkoInvest Admin` | Pflege/Lesen der Plattform-DocTypes im Frappe-Desk (keine Anlage/Löschung; Statuswechsel mit Pflichtangaben nur über das Portal) | ja |

**Eigentum**
- Vorgang: `nutzerId` · Fläche: `nutzerId` · Projekt: `anbieterId` · Interesse: `investorId` · Provision: `anbieterId` (lesen nur Admin) · Thread „nutzer“: der Nutzer selbst.

## 3. Datenmodell (DocTypes)

Alle DocTypes mit `track_changes = 1`. Felder in camelCase (JSON) → snake_case (DocType).
DocType-Namen ohne Umlaute (`Plattform Flaeche`, `Plattform Aktivitaet`; Anzeige über Übersetzung). `statusVerlauf` = Kindtabelle `Plattform Statusverlauf`, `flurstuecke` = Kindtabelle `Plattform Flurstueck`, `rollen` = Table MultiSelect `Plattform Konto Rolle` → `Plattform Rolle`. Bezüge von Nachricht/Dokument als `bezug_art` + Dynamic Link (`bezug_doctype`, `bezug_id`). Interne Felder, die die App nie ausgibt: Projekt `kaeuferInteresseId`/`kaufpreis` (Grundlage der Provision), `description` (interne Notiz).

### Plattform Konto (eigener DocType, 1:1-Link auf `User`)
| Feld | Typ | Hinweis |
|---|---|---|
| id | Data | Kennung |
| email | Data (unique, lowercase) | = Frappe-User |
| vorname, nachname, firma, telefon | Data | |
| rollen | Table MultiSelect | siehe Rollen |
| sitzungVersion | Int | +1 bei Passwortänderung/-reset und Sperre → alte Website-Sitzungen ungültig |
| aktiv | Check | |
| emailBestaetigt | Check | |
| erstelltAm, letzterLogin | Datetime | |
| suchprofil | JSON | siehe Suchprofil |
| mailEinstellungen | JSON | `{status, nachricht, nda, suchprofil, anfrage, aufgabe}` je `true/false` – welche Benachrichtigungen zusätzlich per E-Mail kommen. Fehlt ein Schlüssel: `true`. Wird in `nutzerFuerSitzung`/`anmelden` mit ausgegeben (`null` = Standard). |

Passwort: Frappe-Standard (`frappe.utils.password`). Nie im JSON ausgeben.

### Suchprofil (JSON am Konto)
`{ mwpMin, mwpMax, phasen: [phaseId], laender: ["DE"|"AT"|"CH"], typen: [projektTyp], ticketMin, ticketMax, benachrichtigen: bool, schwelle: 50–100 }`
`schwelle` = Mindest-Matching-Score für den Suchprofil-Alarm (Standard 70; Werte außerhalb 50–100 → 70).
Phasen-IDs aus `PHASEN` (`src/lib/invest/markt.js`): `flaeche, netz, aufstellung, satzung, rtb, cod`.

### Plattform Vorgang
| Feld | Typ | Hinweis |
|---|---|---|
| id | Data | |
| typ | Select | `flaeche, agri, investor, projekt, reststrom, energiegemeinschaft, genossenschaft, kommune, carport, speicher, kontakt` |
| status | Select | Automat `vorgang` |
| statusVerlauf | Table | `{status, am, vonId, vonRolle: admin|eigentuemer|system, kommentar}` |
| nutzerId | Link Konto | leer bis zur Zuordnung |
| email | Data | Kontakt-E-Mail (lowercase) |
| kontakt | JSON | `{anrede, vorname, nachname, firma, email, telefon, plz, ort, land}` |
| daten | JSON | freie Zusatzdaten je Typ (flach, max. 60 Felder, ≤ 20 KB) |
| herkunft | JSON | Kampagnen-Zuordnung (`src/lib/herkunft.js`) |
| ip | Data | nur Admin sichtbar |
| einwilligung | JSON | `{am, ip, text}` |
| zustaendigId | Link Konto (admin) | |
| flaecheId | Link Fläche | bei typ flaeche/agri |
| erstelltAm, geaendertAm | Datetime | |

### Plattform Fläche
`id, nutzerId, vorgangId, bezeichnung, land (DE|AT|CH), bundesland, plz, ort, gemarkung, flurstuecke [{gemarkung, flur, nummer}], ha, nutzung (acker|gruenland|konversion|gewerbe|sonstige|dach), agri (Check), eigentum (eigentum|miteigentum|verwaltung), hinweise, status, statusVerlauf, pachtangebot {euroProHaJahr, laufzeitJahre, verlaengerung, text, am}, ablehnGrund, zustaendigId, erstelltAm, geaendertAm`
Ausgabe zusätzlich: `zustaendig {id, vorname, nachname, email, firma}`, `dokumente` (Anzahl), `checkliste` (s. u.), für Admin `eigentuemer {…}`.

### Plattform Projekt
| Feld | Öffentlich | Hinweis |
|---|---|---|
| id, slug | ja | slug = `slugify(titel)-<letzte 4 Zeichen der ID>`, fix nach erster Veröffentlichung |
| titel | ja | anonym (keine Gemeinde) |
| typ | ja | `freiflaeche, agri, carport, speicher, hybrid, dach` (Dach-PV Gewerbe/Halle, auch Bestandsanlagen) |
| land, bundesland, region | ja | Region nur grob |
| mwp, mwhSpeicher, flaecheHa | ja | |
| phase | ja | PHASEN-ID |
| netzanschluss | ja | `offen, angefragt, zusage, reserviert, vorhanden` |
| codGeplant | ja | `JJJJ` oder `JJJJ-MM` |
| preisModus, preis, preisProKwp | ja | `gesamt | proKwp | anfrage` |
| beschreibung, highlights[] | ja | |
| status, veroeffentlichtAm, demo | ja | |
| vertraulich | **nein** | `{gemeinde, gemarkung, flurstuecke, netzbetreiber, einspeisepunkt, entfernungNetzKm, sicherung, planungsrecht, ertragKwhKwp, verguetung, details}` |
| anbieterId | **nein** | |
| provisionAkzeptiert | nein | `{am, ip, version, text}` |
| provisionSatz | nein | 0.015–0.03, bei Veröffentlichung gesetzt |
| ablehnGrund, aufrufe, zustaendigId, statusVerlauf, erstelltAm, geaendertAm | nein | |

Öffentliche Projektion = Positivliste in `src/lib/plattform/oeffentlich.js` (`projektOeffentlich`). **Frappe muss dieselbe Positivliste verwenden.**
In Börsenliste, Börsendetail und Exposé-Daten kommt als berechnetes Feld `datenraumQualitaet` (0–100, Vollständigkeit der Pflichtunterlagen, s. Checklisten) hinzu – nur die Kennzahl, keine Dokumentnamen.
Ausgabe für Eigentümer/Admin zusätzlich: `statistik {aufrufe, merker, ndaAnfragen, lois}`, `dokumente` (Anzahl), `checkliste` (s. u.), `provision` (falls verkauft); Admin: `anbieter {…}`, `zustaendig {…}`.

### Plattform Interesse
`id, projektId, investorId, status, gemerkt (Check), statusVerlauf, nda {version, am, ip, userAgent}, loi {betrag, text, bedingungen, gueltigBis, am}, ablehnGrund, erstelltAm, geaendertAm`
Genau ein Interesse je (Projekt, Investor). Ausgabe mit `projekt` (öffentliche Projektion); Admin zusätzlich `investor {…}`, `anbieter {…}`. Für Investoren ohne `nda.ip/userAgent`.

### Plattform Provision
`id, projektId, anbieterId, investorId, interesseId, kaufpreis, satz, betrag (= round(kaufpreis × satz)), status, statusVerlauf, erstelltAm`
Wird **automatisch** beim Übergang Projekt → `verkauft` erzeugt.

### Plattform Nachricht
`id, bezugArt (vorgang|flaeche|projekt|interesse|nutzer), bezugId, vonId, vonAdmin (Check), system (Check), text (≤ 5000), am, gelesenNutzer (Check), gelesenAdmin (Check)`
Threads = alle Nachrichten mit gleichem (bezugArt, bezugId).

### Plattform Dokument
`id, bezugArt, bezugId, name, mime (application/pdf|image/jpeg|image/png), groesse, datei (privates File), kategorie (allgemein|datenraum|vertrag|plan), checkliste (Schlüssel eines Checklisten-Punkts oder leer), hochgeladenVon, am, sha256`
Dateien **privat** (`is_private = 1`). Größe ≤ 10 MB, Typ an den ersten Bytes geprüft (die Website prüft vorab, Frappe prüft erneut).

### Plattform Aktivität (append-only)
`id, am, nutzerId, aktion, objektArt, objektId, text, ip` – Login, Registrierung, Anfrage, Status, NDA, Upload, Download, Zuweisung, Nutzeränderung. Kein Update/Delete.

### Dokumenten-Checklisten (berechnet, kein DocType)
Tabelle: `src/lib/plattform/checkliste.js` = `plattform/checkliste.py` (identisch). Ein Dokument erfüllt einen Punkt, wenn sein Feld `checkliste` den Schlüssel trägt.
- **Projekt** (erwartet ab Phase): `pacht`, `lageplan` (flaeche) · `netzzusage` (netz) · `aufstellung` (nicht carport), `gutachten` (aufstellung) · `satzung`, `ertrag` (nicht speicher) (satzung) · `baugenehmigung`, `eeg` (optional, nicht speicher) (rtb) · `betrieb` (cod). Bezeichnungen je Land (AT: Umwidmung/Grünland-PV, EAG; CH: Nutzungsplanung, Baubewilligung, Einmalvergütung).
- **Fläche**: `grundbuch`, `flurkarte`, `vollmacht` (nur bei Miteigentum/Verwaltung), `pachtDritter` (optional).
Ausgabe `checkliste = {punkte: [{id, label, text, pflicht, ab?, erwartet, vorhanden, dokumente: [{id, name, am}]}], erwartet, erfuellt, quote}`; `quote` = erfüllte / erwartete Pflichtpunkte in % (kaufmännisch gerundet, ohne erwartete Pflichtpunkte 100).

### Plattform Benachrichtigung
`id, nutzerId, art (status|nachricht|nda|suchprofil|anfrage|aufgabe), titel, text, link (nur `/portal…`), objektArt, objektId, am, gelesen, mail (per E-Mail gemeldet)`. Nach dem Anlegen ist nur `gelesen` änderbar. Entstehen:
- aus jeder Nachricht für die Seite, die sie noch nicht gelesen hat (Eigentümer bei `gelesenNutzer = 0`, Backoffice bei `gelesenAdmin = 0` → zuständiges Admin-Konto, sonst alle aktiven Admins; nie an den Absender). Art: Systemnachricht „Status: …“ → `status` (an Interessen: `nda`), sonst `nachricht`. Willkommensnachricht nur in der Glocke, ohne E-Mail.
- neue Anfrage → alle aktiven Admins (`anfrage`); Aufgabe zugewiesen / Wiedervorlage fällig → Zuständiger (`aufgabe`); Suchprofil-Treffer → Investor (`suchprofil`).
- Lesen eines Threads (`nachricht.liste` mit `markieren`) markiert Benachrichtigungen (`status|nachricht|nda`) zum selben Objekt als gelesen.
- E-Mail nur, wenn `mailEinstellungen[art]` nicht `false` ist; Inhalt nur Hinweis, bei `suchprofil`/`aufgabe` der (öffentliche bzw. interne) Titel, und Link ins Portal – nie Nachrichtentexte oder vertrauliche Projektdaten.

### Plattform Aufgabe
`id, titel (3–160), beschreibung, faelligAm (JJJJ-MM-TT, Pflicht), zustaendigId (aktives Admin-Konto), bezugArt? (vorgang|flaeche|projekt|interesse), bezugId?, status (offen|erledigt), erstelltVon, erstelltAm, erledigtAm, erledigtVon, erinnertAm`.
Ausgabe zusätzlich: `zustaendig {…}`, `erstelltVonName`, `bezugTitel`, `bezugLink`, `ueberfaellig` (offen und fällig < heute, Europe/Vienna), `heuteFaellig`. Sortierung: offene nach Fälligkeit, dann erledigte (neueste zuerst). Verschieben oder Neuzuweisen setzt `erinnertAm` zurück.

### Plattform Token
`hash (SHA-256 des Tokens), art (email|reset), nutzerId, ablauf, benutzt` – das Token selbst wird nie gespeichert. Reset 1 h, E-Mail-Bestätigung 72 h, einmalig.

## 4. Zustandsautomaten

Quelle der Wahrheit: `PROZESSE` in `src/lib/plattform/prozesse.js`. Frappe übernimmt die Tabelle 1:1 (z. B. als Python-Dict). Ein Übergang ist erlaubt, wenn (von, nach, wer) in der Tabelle steht; `wer` ∈ `admin | eigentuemer | system`. Pflichtangaben (`pflicht`) fehlen → ValidationError. Bedingungen (`bedingung`) → ValidationError mit Liste fehlender Punkte.

**Vorgang:** eingegangen → in_pruefung → qualifiziert → angebot → abgeschlossen (admin) · offen → abgelehnt (admin, `grund`) · abgelehnt/zurückgezogen → in_pruefung (admin) · offen → zurueckgezogen (eigentuemer)

**Fläche:** entwurf → eingegangen (eigentuemer mit Bedingung `flaecheVollstaendig`: Bezeichnung, Land, PLZ, Ort, ha; oder admin) → vorpruefung → standortanalyse → pachtangebot (admin, `pachtangebot {euroProHaJahr 50–50000, laufzeitJahre 1–60}`) → vertrag (eigentuemer „annehmen“ oder admin) → planung → bau → betrieb (admin) · entwurf…planung → abgelehnt (admin, `grund`) · abgelehnt → vorpruefung (admin)

**Projekt:** entwurf → pruefung (eigentuemer, Bedingung `projektEinreichbar`: Titel, Typ, Land, Bundesland, Region, MWp > 0, Phase, Beschreibung ≥ 80 Zeichen, Provisionsvereinbarung akzeptiert) · pruefung → entwurf (eigentuemer „zurückziehen“ oder admin mit `kommentar`) · pruefung → veroeffentlicht (admin, `provisionSatz` 1,5–3 %; Eingabe > 0,2 wird als Prozent interpretiert) · pruefung → abgelehnt (admin, `grund`) · abgelehnt → entwurf (eigentuemer) · veroeffentlicht → entwurf (eigentuemer „von der Börse nehmen“) · veroeffentlicht ↔ reserviert (admin) · veroeffentlicht/reserviert → verkauft (admin, `interesseId` + `kaufpreis`)

**Interesse:** gemerkt → nda_angefragt (eigentuemer, nur über `interesse.nda_anfragen`, `ndaAkzeptiert`) → nda_freigegeben (admin) → loi_abgegeben (eigentuemer, `loi {text ≥ 10 Zeichen, betrag?, bedingungen?, gueltigBis?}`) → loi_angenommen (admin) → abgeschlossen (system) · nda_angefragt/nda_freigegeben/loi_abgegeben → abgelehnt (admin, `grund`) · offen → abgelehnt (system „anderweitig verkauft“)

**Provision:** offen → in_rechnung → bezahlt (admin) · offen/in_rechnung → storniert (admin, `grund`)

**Nebenwirkungen (müssen in Frappe identisch sein):**
1. Jeder Übergang schreibt `statusVerlauf` und eine **System-Nachricht** in den Thread des Objekts: `Status: „<alt>“ → „<neu>“. <kommentar|grund>` (bei Admin: `gelesenNutzer = 0`; bei Eigentümer: `gelesenAdmin = 0`). Ausnahme: Provision.
2. `grund` → `ablehnGrund`.
3. Interesse → `loi_angenommen`: Projekt `veroeffentlicht` → `reserviert` (system).
4. Projekt → `verkauft`: Provision anlegen (`satz = provisionSatz`, sonst Minimum), Käufer-Interesse → `abgeschlossen`, alle anderen offenen Interessen → `abgelehnt` („Projekt anderweitig verkauft.“).
5. Projekt → `veroeffentlicht`: `veroeffentlichtAm` setzen (einmalig); **Suchprofil-Alarm**: Investoren mit `suchprofil.benachrichtigen` und Matching-Score ≥ `suchprofil.schwelle` (Standard 70) erhalten eine System-Nachricht im Thread `nutzer` (ohne eigene Benachrichtigung), eine Benachrichtigung `suchprofil` (Titel, Passung, Link `/portal/boerse/<id>`) und – je nach Einstellung – eine E-Mail mit öffentlichem Titel und Passung; Aktivität `suchprofil_treffer` (Score: `src/lib/plattform/matching.js`).
6. Dokument-Upload erzeugt eine System-Nachricht „Dokument hochgeladen: <name>“ im Thread des Bezugs (Benachrichtigungsart `nachricht`).
7. Jede Nachricht erzeugt Benachrichtigungen (s. Plattform Benachrichtigung). Neue Anfragen melden alle aktiven Admins.
8. Wiedervorlagen: offene Aufgaben mit `faelligAm ≤ heute` und ohne `erinnertAm` werden einmalig als Benachrichtigung `aufgabe` gemeldet (Frappe: täglicher Scheduler `aufgaben.wiedervorlagen_erinnern` und beim Abruf von `benachrichtigung.liste` durch den Zuständigen; Demo: beim Abruf).
9. Änderungen an Fläche/Projekt protokollieren die geänderten Felder („Fläche bearbeitet: Ort, Größe“).

## 5. Frappe-Methoden

`n` = Nutzer aus `als_benutzer`. „Recht“ = zusätzlich zu `ÖkoInvest API`.

### auth
| Methode | Argumente | Ergebnis | Recht |
|---|---|---|---|
| `auth.anmelden` | `email, passwort` | Konto (ohne Hash) oder `null` bei falschen Daten/gesperrt | öffentlich; setzt `letzterLogin`, verknüpft Vorgänge (s. u.), Aktivität |
| `auth.nutzer_fuer_sitzung` | `nutzerId` | Konto inkl. `sitzungVersion`, `aktiv` oder `null` | öffentlich (nur API-Nutzer) |
| `auth.registrieren` | `email, passwort, vorname, nachname, firma?, telefon?, rollen[], vorgangId?, basisUrl, ip` | `{nutzer, vorgangVerknuepft: id|null}` | öffentlich; Passwortregel: ≥ 10 Zeichen, Buchstabe + Ziffer/Sonderzeichen; `admin` nie; E-Mail vergeben → 409. Vorgang sofort verknüpfen, wenn `vorgangId` existiert, noch kein Konto hat **und** die E-Mail übereinstimmt. Bestätigungsmail mit Link `{basisUrl}/api/auth/email-bestaetigen?token=…` (72 h). Willkommens-System-Nachricht im Thread `nutzer`. |
| `auth.email_bestaetigen` | `token` | Konto | öffentlich; `emailBestaetigt = 1`, dann **Verknüpfung**: alle Vorgänge ohne Konto mit gleicher E-Mail → `nutzerId`, zugehörige Flächen ebenso; passende Rolle (`ROLLE_FUER_TYP`) ergänzen |
| `auth.passwort_vergessen` | `email, basisUrl, ip` | `{ok: true}` immer | öffentlich; nur bei aktivem Konto Mail mit `{basisUrl}/passwort-vergessen?token=…` (1 h) |
| `auth.passwort_setzen` | `token, passwort, ip` | Konto | öffentlich; `sitzungVersion + 1`, `emailBestaetigt = 1`, Verknüpfung wie oben |

`basisUrl` kommt in Produktion aus `PLATTFORM_BASIS_URL` (nie aus dem Host-Header). **Frappe baut die Links in E-Mails ausschließlich mit `plattform_basis_url` aus der `site_config.json`**; das Argument `basisUrl` wird nur bei `developer_mode` als Ersatz genutzt (Test-Bench). Fehlt der Schlüssel in Produktion, wird keine Mail versendet (Eintrag im Error Log) – das Konto entsteht trotzdem.
Benachrichtigungs-E-Mails (Vorlage `oekoinvest_benachrichtigung`, ohne Inhalte, nur Hinweis + Link ins Portal) folgen den Benachrichtigungen (Abschnitt 3) und den `mailEinstellungen` des Empfängers. Gibt es noch kein aktives Backoffice-Konto, geht der Hinweis auf neue Anfragen an `plattform_backoffice_email` (Vorlage `oekoinvest_hinweis`).

### konto
| `konto.passwort_aendern` | `alt, neu` | Konto | eigenes Konto; `sitzungVersion + 1` |
| `konto.profil_speichern` | `daten {vorname, nachname, firma, telefon, rollen?}` | Konto | eigenes Konto; `admin` bleibt erhalten, wird nie ergänzt |
| `konto.suchprofil_speichern` | `profil` | Suchprofil (inkl. `schwelle`) | Rolle investor |

### benachrichtigung
| `benachrichtigung.liste` | `nurUngelesen?, limit? (1–200, Standard 50)` | `{eintraege: [Benachrichtigung], ungelesen, gesamt, einstellungen}` | eigene; neueste zuerst. Für Admins werden fällige Wiedervorlagen vorher gemeldet. |
| `benachrichtigung.gelesen` | `ids? [..]` oder `alle: true` | `{geaendert, ungelesen}` | nur eigene (fremde Kennungen werden ignoriert, `geaendert` zählt nur eigene); ohne Auswahl → ValidationError |
| `benachrichtigung.einstellungen_speichern` | `einstellungen {art: bool}` | vollständige Einstellungen | eigenes Konto; nur bekannte Arten, nur Booleans |

### anfrage
| `anfrage.anlegen` | `typ, kontakt, daten, herkunft, ip, einwilligungText` (+ optional `als_benutzer`) | `{id, vorgang {id, typ, status, flaecheId}}` | öffentlich. Pflicht: Vor-/Nachname, gültige E-Mail, bekannter Typ. Bei typ `flaeche`/`agri` zusätzlich Fläche im Status `entwurf` (ha aus `daten.ha|hektar|flaeche|flaecheHa`; `daten.art = "dach"` → Nutzung `dach`). Ist `als_benutzer` gesetzt **und** stimmt dessen bestätigte E-Mail mit `kontakt.email` überein → sofort `nutzerId`. |

### vorgang
| `vorgang.liste` | `alle?, status?, typ?, q?` | Liste `{id, typ, status, erstelltAm, geaendertAm, kontakt{vorname,nachname,firma,email}, zustaendig, flaecheId, letzterKommentar, nutzerId (nur admin)}` | eigene; `alle` nur admin |
| `vorgang.holen` | `id` | Vorgang (+`zustaendig`, admin: `nutzer`; Nicht-Admin ohne `ip`/`herkunft`) | Eigentümer oder admin |

### flaeche
| `flaeche.liste` | `alle?, status?` | Flächen | eigene; `alle` nur admin |
| `flaeche.holen` | `id` | Fläche | Eigentümer oder admin |
| `flaeche.anlegen` | `daten {…, einreichen?}`, `ip` | Fläche (Status `entwurf`, bei `einreichen` und vollständig `eingegangen`) | Rolle flaeche oder landwirt |
| `flaeche.aendern` | `id, daten` | Fläche | Eigentümer nur in `entwurf`/`eingegangen` (sonst 409), admin immer |

### projekt
| `projekt.liste` | `alle?, status?` | Projekte inkl. Statistik | Rolle anbieter (eigene); `alle` nur admin |
| `projekt.holen` | `id` | Projekt | Anbieter oder admin |
| `projekt.anlegen` | `daten, ip` | Projekt (entwurf) | Rolle anbieter |
| `projekt.aendern` | `id, daten` | Projekt | Anbieter nur im `entwurf` (sonst 409), admin immer |
| `projekt.provision_akzeptieren` | `id, ip` | Projekt | nur Anbieter des Projekts; speichert `{am, ip, version: "2026-09", text}` |

### boerse
| `boerse.liste` | `typ?, land?, phase?, mwpMin?, mwpMax?` (+ optional `als_benutzer`) | `{projekte: [öffentliche Projektion (+ für Investoren meinInteresse {id,status,gemerkt}, matching {score, gruende})], kennzahlen {anzahl, mwp, laender, verkauft}, demo}` | öffentlich; nur Status `veroeffentlicht`, `reserviert` |
| `boerse.detail` | `schluessel` (slug oder id), `zaehlen` | `{projekt, zugriff: oeffentlich|nda|eigentuemer|admin, interesse, vertraulich|null, dokumente[]}` | öffentlich; nicht sichtbare Status → 404 (außer Anbieter/admin). `vertraulich` + Datenraum-Dokumente nur bei `zugriff ≠ oeffentlich`; `nda` sieht nur Kategorie `datenraum`. `zaehlen` erhöht `aufrufe` (nicht für Anbieter/admin). |

### interesse
| `interesse.merken` | `projektId, an` | Interesse bzw. `null` (`an: false` ohne bestehendes Interesse) | Rolle investor; Projekt sichtbar |
| `interesse.nda_anfragen` | `projektId, akzeptiert, ip, userAgent` | Interesse | Rolle investor, nicht eigenes Projekt; idempotent (bereits angefragt → unverändert); `akzeptiert` Pflicht; speichert `nda {version, am, ip, userAgent}` |
| `interesse.liste` | `alle?, status? (String oder Liste), projektId?` | Interessen | eigene (investor); `alle` nur admin |

### boerse.expose (Exposé-PDF)
| `boerse.expose` | `id` (Kennung oder Slug), `ip` | `{projekt (öffentliche Projektion + datenraumQualitaet), vertraulich, dokumente [Metadaten], zugriff: admin|eigentuemer|nda, empfaenger {name, firma, email, rolle}, erstelltAm}` | Backoffice, Anbieter des Projekts, Investor mit Interesse in `DATENRAUM_STATUS` (sonst 403; nicht sichtbare Projekte 404). `nda` erhält nur Datenraum-Dokumente. Jeder Abruf → Aktivität `expose`. Das PDF erzeugt die Website (`src/lib/plattform/server/expose.js`), der öffentliche Teaser entsteht aus `boerse.detail` ohne Nutzer. |

Interesse-Objekte (auch in `merken`, `nda_anfragen` und `boerse.detail.interesse`) enthalten für Nicht-Admins **nie** `nda.ip`/`nda.userAgent` – der Nachweis ist nur für das Backoffice (das Demo-Backend liefert in `merken`/`nda_anfragen`/`boerse.detail` noch das Rohobjekt).

### prozess
| `prozess.status_wechsel` | `art, id, nach, als (admin|eigentuemer), extra {…}, ip` | Objekt | `als = admin` → Rolle admin; `als = eigentuemer` → Eigentum. Prüfung nach Abschnitt 4. `interesse → nda_angefragt` hier verboten (nur `nda_anfragen`). |

### nachricht
| `nachricht.threads` | `nurUngelesen?` | `[{bezugArt, bezugId, titel, link, gegenueber, anzahl, ungelesen, letzte {text, am, vonAdmin, system}}]` | eigene Threads; admin alle (max. 500 neueste). `ungelesen` aus Sicht des Aufrufers (admin: `gelesenAdmin`, sonst `gelesenNutzer`). |
| `nachricht.liste` | `bezugArt, bezugId, markieren` | `{titel, link, gegenueber, bezugArt, bezugId, nachrichten [{id, text, am, system, vonAdmin, eigene, vonName, neu}]}` | Eigentümer des Bezugs oder admin; markiert gelesen |
| `nachricht.senden` | `bezugArt, bezugId, text` | `{id, am}` | Eigentümer des Bezugs oder admin (dann `vonAdmin = 1`); 2–5000 Zeichen |

### dokument
| `dokument.liste` | `bezugArt?, bezugId?` | Metadaten (+ `bezugTitel`, `bezugLink`) | ohne Bezug: Dokumente an eigenen Objekten bzw. eigene Uploads; admin alle |
| `dokument.lesen` | `id` | `{meta, inhaltBase64}` | admin; Uploader; Eigentümer des Bezugs; bei Projekt + Kategorie `datenraum`: Investor mit Interesse in `nda_freigegeben, loi_abgegeben, loi_angenommen, abgeschlossen`. Jeder Zugriff → Aktivität „Download“. |
| `dokument.speichern` | `bezugArt, bezugId, name, mime, kategorie, inhaltBase64, checkliste?` | Metadaten (inkl. `checkliste`) | Eigentümer des Bezugs oder admin; Typ (erste Bytes müssen zu `mime` passen) und Größe prüfen; `datenraum` nur für Projekte. Der JSON-Body ist bei 10 MB Datei ≈ 13,4 MB groß (Base64) – Proxy/Frappe müssen das zulassen (siehe ANLEITUNG). |
| `dokument.loeschen` | `id` | `{ok}` | Uploader oder admin |

### admin (alle nur Rolle admin)
| `admin.zuweisen` | `art, id, zustaendigId|null` | `{id, zustaendigId}` | Zuständige nur aktive Admin-Konten |
| `admin.nutzer_liste` | `q?, rolle?` | Konten + `zaehler {vorgaenge, flaechen, projekte, interessen}` | |
| `admin.nutzer_aendern` | `id, rollen?, aktiv?` | Konto | eigenes Admin-Recht nicht entfernbar, eigenes Konto nicht sperrbar (409); Sperren → `sitzungVersion + 1` |
| `admin.provisionen` | – | Provisionen + `projekt`, `anbieter`, `investor` | |
| `admin.aktivitaeten` | `limit ≤ 500, objektId?, objektIds? [≤ 50]` | Aktivitäten (neueste zuerst) + `nutzer` (Name) | Aktivitäts-Feed je Objekt (auch mehrere, z. B. Projekt + Interessen) |
| `admin.protokoll_eintrag` | `aktion, objektArt, objektId, text, ip` | `{ok}` | nur Aktionen der Positivliste (`export`) – z. B. CSV-Export der Website |
| `admin.admin_konten` | – | aktive Admin-Konten (kurz) | |
| `admin.uebersicht` | – | Kennzahlen (siehe `adminUebersicht` in demo.js): `vorgaenge {gesamt, neu7, offen, ohneZustaendig, status{}, typ{}, trichter[]}`, `flaechen {gesamt, ha, status{}, trichter[]}`, `projekte {gesamt, inPruefung, mwpBoerse, status{}}`, `interessen {status{}, ndaOffen, loiOffen, trichter[]}`, `provisionen {anzahl, offen, bezahlt}`, `nutzer {gesamt, rollen{}}`, `nachrichten {ungelesen}`, `aufgaben {offen, ueberfaellig, heute, meineOffen, meineUeberfaellig, meine [≤ 6 Aufgaben]}` | |

### aufgabe (alle nur Rolle admin)
| `aufgabe.liste` | `zustaendigId?, status? (offen|erledigt), bezugArt?, bezugId?, nurUeberfaellig?` | Aufgaben (≤ 500) | |
| `aufgabe.anlegen` | `daten {titel, beschreibung?, faelligAm, zustaendigId? (Standard: selbst), bezugArt?, bezugId?}` | Aufgabe | Datum ungültig/Titel zu kurz/Zuständiger kein aktives Admin-Konto → ValidationError; Bezug unbekannt → 404. Zuständiger ≠ Anlegender → Benachrichtigung `aufgabe`. Aktivität `aufgabe` am Bezug. |
| `aufgabe.aendern` | `id, daten {titel?, beschreibung?, faelligAm?, zustaendigId?, status?}` | Aufgabe | wie anlegen; Neuzuweisung benachrichtigt; Änderungen werden protokolliert |

`demoLinks` und `postausgang` (E-Mails, die Frappe versenden würde: `{id, am, an, anName, nutzerId, art (bestaetigung|passwort|status|nachricht|nda|suchprofil|anfrage|aufgabe), betreff, text, link, linkText, hinweis}`) gibt es nur im Demo-Backend (im Frappe-Adapter liefern sie `[]`; Frappe versendet über die Email Queue).

Umsetzung: Frappe-App `oekoinvest_app` unter `Backend-Import/oekoinvest_app` (Installation: `Backend-Import/ANLEITUNG.md`). Zustandsautomaten zusätzlich im Controller erzwungen: Statusänderungen außerhalb der API (z. B. im Desk) sind nur als Admin-Schritt ohne Pflichtangaben möglich; die Provision entsteht beim Übergang Projekt → `verkauft` im Controller; `Plattform Aktivitaet` ist append-only (Ändern/Löschen/Umbenennen verboten).

### ki (Nutzungsprotokoll des KI-Assistenten)
| Methode | Argumente | Rückgabe | Hinweise |
|---|---|---|---|
| `ki.nutzung_heute` | – | `{anzahl, limit}` | heutige Aufrufe des Kontos (`tag` = Systemdatum); `limit` aus site_config `oekoinvest_ki_tageskontingent`(`_admin`) oder `null` (dann gilt der Website-Standard) |
| `ki.nutzung_protokollieren` | `fall (expose|triage|frage|flaeche|nachricht), modus (ki|regel), ergebnis?, tokensEin?, tokensAus?, objektArt?, objektId?` | `{ok}` | append-only DocType `Plattform KI Nutzung`; **keine Inhalte** – weitere Argumente werden verworfen. Der KI-Aufruf selbst läuft auf der Website (`ANTHROPIC_API_KEY` nur dort). |

### bedienung (Befehlspalette & Onboarding)
| Methode | Argumente | Rückgabe | Hinweise |
|---|---|---|---|
| `bedienung.suchen` | `q (2–80 Zeichen), limit? (1–20, Standard 6 je Art)` | `{q, treffer: [{art (flaeche|projekt|vorgang|nachricht|boerse|nutzer), id, titel, untertitel, href}]}` | setzt **nur** auf die rechtegeprüften Listen-Methoden auf (`vorgang.liste`, `flaeche.liste`, `projekt.liste`, `boerse.liste`, `nachricht.threads`, `admin.nutzer_liste`) – „alle“ nur mit Rolle admin, Börse nur Investor, Nutzer nur admin. `href` immer interner Portal-Pfad; keine internen Felder. Unscharfe Bewertung wie `src/lib/plattform/suche.js`. |
| `bedienung.onboarding` | – | `{status (neu|laufend|erledigt|uebersprungen), schritt (0–3), erledigt [profil|objekt|benachrichtigungen|bedienung|fertig], checklisteAus, aktualisiertAm}` | Feld `Plattform Konto.onboarding` (JSON); fehlt es → Status `neu` |
| `bedienung.onboarding_speichern` | `daten {status?, schritt?, erledigt?[], checklisteAus?}` | Zustand wie oben | nur eigenes Konto; Positivliste; `erledigt` wird ergänzt (nie entfernt); Status nie von `erledigt` zurück auf `neu`; Abschluss/Überspringen → Aktivität `onboarding` |

Die Checkliste „Erste Schritte“ berechnet die Website aus echten Daten (Fläche/Projekt/Suchprofil/Telefon/E-Mail bestätigt) plus diesem Zustand (`src/lib/plattform/onboarding.js`).

## 6. HTTP-APIs der Website

Alle Antworten JSON mit `Cache-Control: no-store`. Fehler: `{ ok: false, error, code }`.
**CSRF:** Jede Mutation (POST/PATCH/PUT/DELETE) braucht einen `Origin`-Header der eigenen Seite (oder aus `PLATTFORM_ORIGINS`) und `Content-Type: application/json`; Uploads `multipart/form-data` + Kopfzeile `X-Plattform-Upload: 1`. Sonst 403 bzw. 415.
**Sitzung:** Cookie `oi_sitzung` (Produktion `__Host-oi_sitzung`), HttpOnly, SameSite=Lax, Secure in Produktion, 7 Tage.

| Route | Methode | Auth | Body / Query | Antwort |
|---|---|---|---|---|
| `/api/anfrage` | POST | optional | `{typ, kontakt, daten, einwilligung: true, herkunft?}` (Vertrag BRIEFING) | `{ok, id, vorgang}` · Limit 10/h je IP |
| `/api/auth/login` | POST | – | `{email, passwort}` | `{ok, nutzer}` + Cookie · Limit 10/15 min je IP, 8/15 min je E-Mail |
| `/api/auth/logout` | POST | – | `{}` | `{ok}` |
| `/api/auth/registrieren` | POST | – | `{email, passwort, vorname, nachname, firma?, telefon?, rollen[], vorgang?, agb: true}` | 201 `{ok, nutzer, vorgangVerknuepft}` + Cookie · 5/h |
| `/api/auth/passwort-vergessen` | POST | – | `{email}` | `{ok}` immer · 5/h |
| `/api/auth/passwort-setzen` | POST | – | `{token, passwort}` | `{ok, nutzer}` + Cookie |
| `/api/auth/email-bestaetigen?token=` | GET | – | | 307 → `/portal?hinweis=email-bestaetigt` bzw. `/login?hinweis=link-ungueltig` |
| `/api/auth/ich` | GET | optional | | `{ok, nutzer|null}` |
| `/api/boerse` | GET | optional | `typ, land, phase, mwpMin, mwpMax` | `{ok, projekte, kennzahlen, demo}` |
| `/api/boerse/[slug]` | GET | optional | slug oder id | `{ok, projekt, zugriff, interesse, vertraulich, dokumente}` |
| `/api/portal/vorgaenge` | GET | ja | `status?` | `{ok, vorgaenge}` |
| `/api/portal/vorgaenge/[id]` | GET | ja | | `{ok, vorgang}` |
| `/api/portal/flaechen` | GET / POST | flaeche, landwirt | Fläche | `{ok, flaechen}` / `{ok, flaeche}` |
| `/api/portal/flaechen/[id]` | GET / PATCH | ja | | `{ok, flaeche}` |
| `/api/portal/projekte` | GET / POST | anbieter | Projekt | `{ok, projekte}` / `{ok, projekt}` |
| `/api/portal/projekte/[id]` | GET / PATCH | ja | | `{ok, projekt}` |
| `/api/portal/projekte/[id]/provision` | POST | anbieter | `{akzeptiert: true}` | `{ok, projekt}` |
| `/api/portal/boerse/[id]/merken` | POST | investor | `{an}` | `{ok, interesse}` |
| `/api/portal/boerse/[id]/nda` | POST | investor | `{akzeptiert: true}` | `{ok, interesse}` |
| `/api/portal/interessen` | GET | investor | | `{ok, interessen}` |
| `/api/portal/status` | POST | ja (Eigentümer) | `{art, id, nach, extra}` | `{ok, objekt {id, status}}` |
| `/api/portal/nachrichten` | GET / POST | ja | GET `?bezug=art:id` · POST `{bezugArt, bezugId, text}` | `{ok, threads}` / `{ok, thread}` / `{ok, nachricht}` |
| `/api/portal/dokumente` | GET / POST | ja | GET `?bezug=art:id` · POST multipart `datei, bezugArt, bezugId, kategorie` | `{ok, dokumente}` / `{ok, dokument}` |
| `/api/portal/dokumente/[id]` | GET / DELETE | ja | `?anzeigen=1` inline | Datei / `{ok}` |
| `/api/portal/profil` | GET / PATCH | ja | Stammdaten, rollen | `{ok, nutzer}` |
| `/api/portal/passwort` | POST | ja | `{alt, neu}` | `{ok}` + neues Cookie |
| `/api/portal/suchprofil` | PUT | investor | Suchprofil (inkl. `schwelle`) | `{ok, suchprofil}` |
| `/api/portal/benachrichtigungen` | GET / POST / PUT | ja | GET `?ungelesen=1&limit=` · POST `{ids}` bzw. `{alle: true}` · PUT `{einstellungen}` | `{ok, eintraege, ungelesen, gesamt, einstellungen}` / `{ok, geaendert, ungelesen}` / `{ok, einstellungen}` |
| `/api/portal/suche` | GET | ja | `?q=` (2–80 Zeichen), `&limit=` (1–20 je Art) · Rate-Limit je Nutzer | `{ok, q, treffer: [{art, id, titel, untertitel, href}]}` – nur Berechtigtes (siehe `bedienung.suchen`) |
| `/api/portal/onboarding` | GET / PUT | ja | PUT `{status?, schritt?, erledigt?[], checklisteAus?}` (≤ 4 KB) | `{ok, zustand, liste {punkte[], erledigt, gesamt, quote, fertig}}` / `{ok, zustand}` |
| `/api/portal/ki` | GET | ja | | `{ok, aktiv, faelle[], kontingent {limit, rest}}` |
| `/api/portal/ki/[fall]` | POST | je Fall (siehe PLATTFORM.md) | `expose {projektId}` · `triage {vorgangId}` · `frage {projektId, frage, stream?}` · `flaeche {flaecheId, frage?, stream?}` · `nachricht {bezugArt, bezugId, stichpunkte?, stream?}` | `{ok, fall, modus (ki|regel), ergebnis, quellen, hinweis, kontingent}` bzw. NDJSON-Stream (`start`/`text`/`ersetzen`/`ende`) · fremdes Objekt 403/404 · Kontingent 429 `code: kontingent` |
| `/api/portal/projekte/[id]/expose` | GET | ja (Rechte s. `boerse.expose`) | | PDF (Download, protokolliert) |
| `/api/boerse/[slug]/teaser` | GET | – | | öffentlicher Teaser als PDF (nur Positivliste, `noindex`) |
| `/api/admin/uebersicht` | GET | admin | | `{ok, uebersicht}` |
| `/api/admin/vorgaenge` | GET | admin | `status, typ, q` | `{ok, vorgaenge}` |
| `/api/admin/flaechen` | GET | admin | `status` | `{ok, flaechen}` |
| `/api/admin/projekte` | GET | admin | `status` | `{ok, projekte}` |
| `/api/admin/interessen` | GET | admin | `status=a,b` | `{ok, interessen}` |
| `/api/admin/status` | POST | admin | `{art (+provision), id, nach, extra}` | `{ok, objekt}` |
| `/api/admin/zuweisen` | POST | admin | `{art, id, zustaendigId}` | `{ok, ergebnis}` |
| `/api/admin/nutzer` | GET | admin | `q, rolle` | `{ok, nutzer}` |
| `/api/admin/nutzer/[id]` | PATCH | admin | `{rollen?, aktiv?}` | `{ok, nutzer}` |
| `/api/admin/provisionen` | GET | admin | | `{ok, provisionen}` |
| `/api/admin/aktivitaeten` | GET | admin | `limit, objekt, objekte=a,b` | `{ok, aktivitaeten}` |
| `/api/admin/aufgaben` | GET / POST | admin | GET `?ansicht=meine|offen|ueberfaellig|erledigt|alle&bezug=art:id` · POST Aufgabe | `{ok, aufgaben}` / `{ok, aufgabe}` |
| `/api/admin/aufgaben/[id]` | PATCH | admin | `{status?, titel?, beschreibung?, faelligAm?, zustaendigId?}` | `{ok, aufgabe}` |
| `/api/admin/export/[art]` | GET | admin | `art` ∈ `vorgaenge, flaechen, projekte, interessen, provisionen` | CSV (UTF-8 mit BOM, Semikolon, CRLF, Dezimalkomma, Formel-Schutz), Export protokolliert |
| `/api/admin/postausgang` | GET | admin | `limit` | `{ok, mails}` (nur Demo) |
| `/api/admin/demo-links` | GET | admin | | `{ok, links}` (nur Demo) |

Statuscodes: 401 nicht angemeldet · 403 Rolle/Eigentum/Herkunft · 404 · 409 Konflikt/Übergang nicht vorgesehen · 413 zu groß · 415 falscher Typ · 422 Validierung/Pflichtangabe · 429 Rate-Limit · 502 Backend nicht erreichbar · 503 Backend nicht konfiguriert.

## 7. Deal-Room & Investoren (Q&A, Bieterverfahren, Datenraum 2.0, Pipeline, Cockpit)

Referenz: `src/lib/plattform/backend/demo/dealroom.js` (Schnittstelle `backend/dealroom.js`, Frappe-Adapter `backend/frappe/dealroom.js`), Regeln `src/lib/plattform/dealroom.js` = `plattform/dealroom_kern.py`. Frappe-Methoden in `plattform/api/{qa,bieter,dealroom}.py`.

**Grundsätze**
- Zugang je Projekt: Backoffice, Anbieter des Projekts, Investoren mit Interesse in `DATENRAUM_STATUS` (sonst 403, Seite 404).
- **Umgehungsschutz:** Der Anbieter sieht Investoren nur als Pseudonym (`Investor A, B …`, Reihenfolge der NDA-Anfragen), der Investor den Anbieter nur als „Anbieter“ – bis das Backoffice je Interesse den Kontakt freigibt (`Plattform Kontaktfreigabe`). Freitexte (Fragen, Antworten, Gebotsangaben) werden von E-Mail-Adressen, Links und Rufnummern bereinigt; das Original sieht nur das Backoffice.
- **Freigabestufen:** Stufe 1 nach NDA-Freigabe, Stufe 2 nach LOI (`loi_abgegeben|loi_angenommen|abgeschlossen`) oder als zugelassener Teilnehmer einer verbindlichen Runde. Gilt auch für `dokument.lesen` und die Dokumentliste in `boerse.detail`.
- **Automat (gezielt erweitert):** Interesse `nda_freigegeben|loi_abgegeben → loi_angenommen` (wer `system`, „Zuschlag im Bieterverfahren“). Zuschlag → Interesse `loi_angenommen` (LOI aus dem Gebot, falls keine vorliegt) → Projekt `reserviert` (system). Verkauf und Provision danach unverändert über `prozess.status_wechsel` (Projekt → `verkauft`).

**DocTypes** (Kennungen per Controller): `Plattform Frage` (FR) · `Plattform Bieterverfahren` (BV, Kindtabelle `Plattform Bieterrunde`) · `Plattform Gebot` (GB) · `Plattform Datenraum Eintrag` (DR: Ordner, Stufe, Vorversion je Dokument) · `Plattform Zugriff` (ZG, append-only) · `Plattform Notiz` (NZ, privat – kein Desk-Recht für das Backoffice) · `Plattform Suchprofil` (SP, privat) · `Plattform Kontaktfreigabe` (KF) · `Plattform Projektaufruf` (PA, Aufrufe je Tag, eindeutig je Projekt + Tag). Scheduler stündlich `api.bieter.erinnerungen_senden` (Erinnerung 48 h vor Fristende an Teilnehmer ohne Gebot).

**Q&A-Status:** `eingereicht` (Moderation) → `freigegeben` (beim Anbieter, `fristAm`, Standard 5 Tage) → `beantwortet` (Antwort in Prüfung) → `veroeffentlicht` (`oeffentlich`: für alle NDA-Investoren) · `abgelehnt` (`ablehnGrund`) · Rückgabe `beantwortet → freigegeben` mit `rueckfrage`. Investoren sehen nur `offen|beantwortet|abgelehnt`, eigene Fragen und freigegebene Antworten „für alle“ (Fragender: „Anderer Interessent“).

**Bieterverfahren:** `laufend` → (Frist abgelaufen oder `beenden`) `auswertung` → `zuschlag` → (Projekt verkauft) `abgeschlossen` · `abgebrochen`. Runden `indikativ|verbindlich` mit `frist` und `teilnehmer` (Interesse-Kennungen); verbindliche Runden verlangen Finanzierung und Zeitplan. Gebote verdeckt: ein Gebot je Runde und Bieter (Aktualisierung = neue `version`, `historie`), nach Fristende 409, Zuschlag erst nach Rundenende.

| Methode | Argumente | Ergebnis | Recht |
|---|---|---|---|
| `dealroom.kopf` | `projektId` | `{rolle, projekt, interesse, stufe, anbieter, kontaktFrei?, interessenten? (admin)}` | Zugang s. o. |
| `dealroom.kontakt_freigabe` | `projektId, interesseId, an` | `{projektId, interesseId, kontaktFrei}` | admin |
| `qa.liste` | `projektId` | `{rolle, fragen[], zaehler}` | Zugang, gefiltert je Rolle |
| `qa.frage_stellen` | `projektId, kategorie (technisch, rechtlich, kaufmaennisch, netz), text ≥ 10` | Frage | Investor mit Datenraum, Projekt in der Börse, ≤ 25 offene |
| `qa.aktion` | `id, daten {aktion …}`: antworten `{antwort, oeffentlich}` · freigeben `{text?, fristTage 1–30}` · ablehnen `{grund}` · antwortFreigeben `{antwort?, oeffentlich?}` · zurueckgeben `{kommentar}` · frist `{fristTage}` | Frage | antworten: Anbieter/admin; sonst admin |
| `bieter.verfahren` | `projektId` | `{rolle, verfahren, projekt}` – Investor: `zugelassen, eigeneGebote, zuschlagEigen` (nie fremde Gebote oder deren Anzahl); Anbieter: `matrix` erst nach `anbieterFreigabe`, pseudonym; admin: `matrix, teilnehmer, verlauf` | Zugang |
| `bieter.liste` | – | Übersicht aller Verfahren | admin |
| `bieter.starten` | `daten {projektId, art, frist (ISO), pflicht[], hinweis?, teilnehmer?[]}` | Verfahren | admin; Projekt `veroeffentlicht`, kein aktives Verfahren (409) |
| `bieter.aktion` | `id, daten {aktion …}`: frist · beenden · naechsteRunde `{teilnehmer[], frist, art?}` · anbieterFreigabe `{an}` · erinnern · zuschlag `{gebotId, kommentar?}` · abbrechen `{grund}` | Verfahren (+ `hinweis`) | admin |
| `bieter.gebot_abgeben` | `daten {verfahrenId, preisModus (gesamt, proKwp), preis bzw. preisProKwp, bedingungen, finanzierung, zeitplan, gueltigBis?, finanzierungDokumentId?}` | eigenes Gebot | Investor, Teilnehmer der offenen Runde |
| `bieter.gebot_zurueckziehen` | `id` | `{ok}` | eigenes Gebot, Runde offen |
| `dealroom.datenraum` | `projektId, besuch?, ip` | `{rolle, stufe, ordner[{id, nr, label, text, dokumente[{…, ordner, stufe, version, gesperrt, versionen[]}]}], anzahl, gesperrt}` | Zugang (Investor: nur Kategorie `datenraum`) |
| `dealroom.einordnen` | `dokumentId, daten {ordner?, stufe?, versionVon?}` | `{id, ordner, stufe, versionVon}` | Anbieter/admin; eine neuere Version je Dokument, keine Kreise (409) |
| `dealroom.dokument` | `id, ip, anzeigen?` | `{meta, inhaltBase64, dateiname}` (Dateiname mit Empfänger + Datum) | wie `dokument.lesen` + Stufe; jeder Zugriff → `Plattform Zugriff` |
| `dealroom.zugriffe` | `projektId, limit?` | `{investoren[{pseudonym, …, zugriffe, besuche, dokumente[], letzter}], eintraege[]}` | Anbieter (pseudonym), admin |
| `dealroom.pipeline` | – | `{karten[{spalte, spalteAuto, manuell, projekt, notiz, gebote, letztesGebot, dealroom}], tags, suchprofile[{…, treffer, beste}], kennzahlen{aktiv, mwpPipeline, preisProKwpMittel, gewonnen, laender, phasen, typen}}` | Investor (nur eigene) |
| `dealroom.notiz_speichern` | `projektId, text?, tags?[] (≤ 8), spalte? ("" = automatisch)` | Notiz | Investor mit Interesse (sonst 409) |
| `dealroom.suchprofile_speichern` | `profile[] (≤ 8)` | Profile | Investor |
| `dealroom.cockpit` | `projektId, tage?` | `{trichter[aufrufe, merker, nda, datenraum, angebote], verlauf[{tag, aufrufe}], fragen, bieter, zugriffe}` | Anbieter, admin |
| `dealroom.uebersicht` | – | `{moderation[], beimAnbieter[], verfahren[], kennzahlen}` | admin |

HTTP-APIs der Website: `/api/portal/qa` (GET `?projekt=` / POST, investor), `/api/portal/qa/[id]` (POST `{aktion …}`), `/api/portal/bieter` (GET `?projekt=` / POST Gebot, investor), `/api/portal/bieter/gebote/[id]` (DELETE), `/api/portal/datenraum` (GET `?projekt=&besuch=1`), `/api/portal/datenraum/dokumente/[id]` (GET Datei `?anzeigen=1` / PATCH Einordnung, anbieter), `/api/portal/datenraum/upload` (POST multipart `datei, projektId, ordner, stufe, versionVon?` + `X-Plattform-Upload: 1`, anbieter), `/api/portal/datenraum/zugriffe` (GET, anbieter), `/api/portal/pipeline` (GET / PUT Notiz, investor), `/api/portal/pipeline/suchprofile` (PUT, investor), `/api/portal/pipeline/cockpit` (GET `?projekt=&tage=`, anbieter), `/api/admin/bieter` (GET / POST starten), `/api/admin/bieter/[id]` (POST `{aktion …}`), `/api/admin/dealroom` (GET), `/api/admin/dealroom/freigabe` (POST `{projektId, interesseId, an}`).

## 8. Login, Sicherheit & Teams

Referenz: `src/lib/plattform/backend/demo/sicherheit.js`, `backend/demo/teams.js`; Auswahl `backend/sicherheit.js` (`sicherheit()`), Adapter `backend/frappe/sicherheit.js`; Frappe `plattform/api/sicherheit.py`, `plattform/api/organisation.py`. Stammlisten `src/lib/plattform/organisation.js` (= `konstanten.py`).

### Sitzungen (Änderung am Sitzungstoken)
- Das signierte Cookie trägt zusätzlich die Sitzungskennung `s` (`S-26-XXXXXXXXXX`). `auth.nutzer_fuer_sitzung(nutzerId, sitzungId)` liefert nur dann ein Konto, wenn der Eintrag `Plattform Sitzung` besteht, nicht widerrufen/abgelaufen ist und seine `version` = `sitzungVersion` des Kontos. Token ohne `s` (vor dieser Stufe) gelten nur über die Version.
- Rückgabe zusätzlich: `sitzung {id, organisationId, zweiFaktor}`, `organisation {id,name,art,rolle}|null`, `organisationen [..]`, `zweiFaktorAktiv`, `zweiFaktorPflicht`, `zweiFaktorPflichtOffen`, `komfort {farbe, sprache, kanaele{email, sicherheitEmail}}`; im Organisationskontext `suchprofil` = Team-Suchprofil (`suchprofilPersoenlich` = eigenes).
- Jede Anmeldung (Passwort, E-Mail-Link, 2FA, Reset, Registrierung) legt eine **neue** Sitzung an (Rotation); Passwortänderung und 2FA-Einrichtung ersetzen die aktuelle.
- Jeder Aufruf mit Nutzer sendet zusätzlich `als_organisation` (aktive Organisation); Frappe liest es aus `form_dict` und prüft die Mitgliedschaft (`kern.nutzer`).
- `auth.anmelden` bekommt `ip, userAgent, land`; Rückgabe enthält `zweiFaktorAktiv`. **Kontosperre:** ab 5 Fehlversuchen (Passwort oder 2FA-Code) `30 s · 2^(n−5)`, höchstens 1 h → HTTP 429 (`TooManyRequestsError`, Website-Code `gesperrt`). Erfolgreiche Anmeldung (auch per E-Mail-Link) setzt zurück.

### Methoden `sicherheit.*`
| Methode | Argumente | Ergebnis | Recht |
|---|---|---|---|
| `sitzung_anlegen` | `ip, userAgent, land, methode, zweiFaktor, geraetToken, geraetMerken, ersetzt` | `{sitzung {id}, geraetToken (nur neu erzeugt), neuesGeraet}` | eigenes Konto; Historie, Sperre zurücksetzen, neues Gerät → Benachrichtigung `sicherheit` + E-Mail |
| `sitzungen` | `sitzungId` | `[{id, geraet, mobil, ort, erstelltAm, letzteAktivitaet, methode, zweiFaktor, aktuell, organisation}]` | eigene |
| `sitzung_beenden` | `id` oder `alleAnderen: true`, `sitzungId` | `{beendet, sitzungVersion}` | eigene; „alle anderen“ erhöht `sitzungVersion`, die aktuelle Sitzung übernimmt sie |
| `anmeldungen` | `limit ≤ 200` | `[{id, am, ok, methode, grund (passwort|2fa|gesperrt), ort, geraet}]` | eigene, auch Fehlversuche |
| `geraete` / `geraet_vergessen` | `geraetToken` / `id` | `[{id, label, mobil, ersteAnmeldung, letzteAnmeldung, vertraut, vertrautBis, aktuell}]` / `{ok}` | eigene |
| `geraet_vertraut` | `nutzerId, geraetToken` | `bool` | öffentlich (API-Nutzer) – „Gerät 30 Tage merken“ |
| `zwei_faktor_status` | – | `{aktiv, aktiviertAm, codesUebrig, pflicht, einrichtungLaeuft, vertrauteGeraete}` | eigenes Konto |
| `zwei_faktor_starten` | – | `{geheimnis (Base32), uri (otpauth)}` | eigenes Konto; aktiv → 409 |
| `zwei_faktor_bestaetigen` | `code` | `{codes [10 × XXXXX-XXXXX], status}` | eigenes Konto; Einrichtung ≤ 30 min |
| `zwei_faktor_deaktivieren` | `passwort, code` | Status | nicht bei Pflicht (409); Code oder Wiederherstellungscode |
| `wiederherstellungscodes_neu` | `code` (TOTP) | `{codes, status}` | eigenes Konto |
| `zwei_faktor_pruefen` | `nutzerId, code, ip, userAgent, land` | Konto + `zweiFaktorMethode (totp|wiederherstellung), codesUebrig` | öffentlich; falsch → 401, zählt zur Sperre |
| `pflicht_lesen` / `pflicht_speichern` | – / `rollen []` | `{rollen, umgebung, wirksam, kontenOhne2fa}` | admin; zusätzlich `plattform_2fa_pflicht` (site_config) bzw. `PLATTFORM_2FA_PFLICHT` |
| `magic_link_anfordern` | `email, basisUrl, ip` | `{ok: true}` immer | öffentlich; Token-Art `magic`, 15 min, Link `{basis}/login/link?token=…` |
| `magic_link_einloesen` | `token` | Konto (+`zweiFaktorAktiv`) | öffentlich; einmalig; E-Mail gilt als bestätigt |
| `komfort_speichern` | `komfort` | Konto | eigenes Konto; Positivliste (Farbe, Sprache de|en, Kanal E-Mail) |
| `email_aendern_anfordern` | `neu, passwort, basisUrl` | `{ok, an}` | eigenes Konto; Token-Art `email_neu` (24 h) an die neue Adresse, Hinweis an die alte; vergeben → 409 |
| `email_aendern_bestaetigen` | `token` | Konto | öffentlich |
| `daten_export` | – | JSON (Art. 15/20 DSGVO) | nur eigene Daten; keine Hashes, Schlüssel, Token, internen Notizen; E-Mail-Adressen Dritter maskiert |
| `konto_loeschen` | `passwort, bestaetigung = "LÖSCHEN"` | `{ok}` | anonymisieren + sperren; letzter Admin bzw. Inhaber mit Team → 409 |

**TOTP:** RFC 6238, HMAC-SHA1, 30 s, 6 Stellen, Toleranz ±1 Schritt, Replay-Schutz über `letzterSchritt`. Schlüssel in Frappe als Password-Feld (`Plattform Zwei Faktor`), im Demo AES-256-GCM (`PLATTFORM_2FA_SCHLUESSEL`, sonst aus `SESSION_SECRET`). Wiederherstellungscodes nur als `sha256("oekoinvest-wiederherstellung|" + CODE)`.

### Methoden `organisation.*` (Nicht-Mitglieder → immer 403)
| Methode | Argumente | Ergebnis | Recht |
|---|---|---|---|
| `liste` | – | `{organisationen [{id,name,art,rolle,mitglieder}], aktiv}` | eigene |
| `anlegen` | `daten {name, art}` | Organisation | jedes Konto (wird Inhaber), max. 20 |
| `holen` | `id` | `{…, rolle, mitglieder [..], einladungen (ab admin), objekte {flaechen, projekte, interessen, liste}, zuordenbar}` | Mitglied |
| `aendern` / `loeschen` | `id, daten` / `id` | Organisation / `{ok}` | ab admin / inhaber (Objekte werden wieder persönlich) |
| `einladen` | `id, email, rolle (admin|mitglied|lesen), basisUrl` | `{id, email, rolle, ablauf}` | ab admin, nie über der eigenen Stufe; Link `{basis}/einladung/<token>` (7 Tage, nur Hash gespeichert) |
| `einladung_widerrufen` | `id, einladungId` | `{ok}` | ab admin |
| `einladung_info` | `token` | `{gueltig, organisation {name, art}, rolle, eingeladenVon, email (maskiert), ablauf}` | öffentlich |
| `einladung_annehmen` | `token` | `{organisationId, name, rolle}` | nur Konto mit der eingeladenen E-Mail (sonst 403); einmalig |
| `mitglied_aendern` | `id, mitgliedId, rolle` | Organisation | ab admin; `inhaber` = Übertragung nur durch den Inhaber |
| `mitglied_entfernen` | `id, mitgliedId` | Organisation bzw. `{ok, verlassen}` | ab admin oder selbst; Inhaber nie |
| `wechseln` | `organisationId|null, sitzungId` | `{aktiv, organisation}` | Mitglied (sonst 403) |
| `zuordnen` | `art (flaeche|projekt|interesse), id, organisationId|null` | `{id, art, organisationId}` | Eigentümer + Teamrolle ≥ mitglied |

**Rechte an Objekten (in allen bestehenden Lese- und Schreibmethoden):** Flächen, Projekte, Interessen tragen `organisationId` (DocType-Feld `organisation_id`). Lesen: Eigentümer, Backoffice **oder Mitglied der Objekt-Organisation (jede Teamrolle)**. Schreiben, Eigentümer-Statuswechsel, Upload, Nachricht senden: Eigentümer oder Teamrolle ≥ `mitglied`; Provisionsvereinbarung: Eigentümer oder ≥ `admin`. Listen: ohne aktive Organisation die eigenen Objekte (wie bisher), mit aktiver Organisation alle Objekte der Organisation. Anlegen im Kontext → `organisationId` = aktive Organisation (`lesen` → 403). Börse: Interesse der aktiven Organisation vor dem eigenen; Datenraum/Exposé auch über das Team-Interesse (NDA im Organisationskontext); das Team des Anbieters hat Zugriff `eigentuemer`. Ausgaben bekommen `organisation {id,name}` und `meinZugriff` (`eigentuemer|schreiben|lesen|admin`). Suchprofil-Alarm zusätzlich für Team-Suchprofile (je Person ein Alarm).

**DocTypes:** `Plattform Organisation`, `Plattform Mitgliedschaft`, `Plattform Einladung`, `Plattform Sitzung`, `Plattform Geraet`, `Plattform Anmeldung` (append-only), `Plattform Zwei Faktor` (Password-Felder); am Konto `komfort`, `fehlversuche`, `gesperrt_bis`, `geloescht_am`; Token-Arten `magic`, `email_neu` (+ `neue_email`); Benachrichtigungsart `sicherheit` (E-Mail immer, nicht abschaltbar).

### HTTP-APIs
| Route | Methode | Auth | Body | Antwort |
|---|---|---|---|---|
| `/api/auth/login` | POST | – | `{email, passwort}` | `{ok, nutzer}` + Cookie **oder** `{ok, zweiFaktor: true}` + Zwischen-Cookie `oi_2fa` (5 min, SameSite=Strict) · 429 `gesperrt` |
| `/api/auth/zwei-faktor` | POST | Zwischen-Cookie | `{code, merken?}` | `{ok, nutzer, zweiFaktorMethode, codesUebrig}` + Cookie · 401 · 10/15 min |
| `/api/auth/magic-link` | POST | – | `{email}` | `{ok}` immer · 5/h je IP und je Adresse |
| `/api/auth/magic-link/einloesen` | POST | – | `{token}` | wie Login |
| `/api/auth/email-aendern?token=` | GET | – | | 307 → `/portal/profil?hinweis=email-geaendert` bzw. `/login?hinweis=link-ungueltig` |
| `/api/auth/passwort-setzen` | POST | – | `{token, passwort}` | wie Login (bei 2FA Zwischenschritt) |
| `/api/auth/logout` | POST | optional | `{}` | beendet auch die Sitzung im Backend |
| `/api/portal/sicherheit` | GET | ja | | `{zweiFaktor, sitzungen, anmeldungen, geraete}` |
| `/api/portal/sicherheit/zwei-faktor` | POST | ja | `{aktion: starten|bestaetigen|deaktivieren|codes, code?, passwort?}` | siehe Methoden |
| `/api/portal/sicherheit/sitzungen` | GET / POST | ja | POST `{alleAnderen: true}` | `{sitzungen}` / `{beendet}` + neues Cookie |
| `/api/portal/sicherheit/sitzungen/[id]` | DELETE | ja | | `{beendet, abgemeldet}` |
| `/api/portal/sicherheit/geraete/[id]` | DELETE | ja | | `{ok}` |
| `/api/portal/sicherheit/pflicht` | GET / PUT | admin | `{rollen}` | `{pflicht}` |
| `/api/portal/konto/komfort` | PATCH | ja | `{farbe, sprache, kanaele{email}}` | `{komfort}` |
| `/api/portal/konto/email` | POST | ja | `{neu, passwort}` | `{ok, an}` |
| `/api/portal/konto/export` | GET | ja | | JSON-Download (`Content-Disposition: attachment`) |
| `/api/portal/konto/loeschen` | POST | ja | `{passwort, bestaetigung}` | `{ok}`, Cookie gelöscht |
| `/api/portal/organisation` | GET / POST | ja | POST `{name, art}` | `{organisationen, aktiv}` / `{organisation, aktiv}` |
| `/api/portal/organisation/[id]` | GET / PATCH / DELETE | Mitglied | `{name?, art?}` | `{organisation}` |
| `/api/portal/organisation/[id]/einladungen` | POST | ab admin | `{email, rolle}` | `{einladung}` |
| `/api/portal/organisation/[id]/einladungen/[eid]` | DELETE | ab admin | | `{ok}` |
| `/api/portal/organisation/[id]/mitglieder/[mid]` | PATCH / DELETE | ab admin bzw. selbst | `{rolle}` | `{organisation}` / `{verlassen}` |
| `/api/portal/organisation/wechseln` | POST | ja | `{organisationId|null}` | `{aktiv, organisation}` |
| `/api/portal/organisation/einladung` | POST | ja | `{token}` | `{organisationId, name, rolle}` |
| `/api/portal/organisation/zuordnen` | POST | ja | `{art, id, organisationId|null}` | `{objekt}` |

**Pflicht-2FA:** Solange ein Konto mit Pflicht-Rolle keine 2FA eingerichtet hat, antworten alle authentifizierten APIs außer den Sicherheits-APIs mit 403 (`zwei_faktor_pflicht`); Portalseiten leiten auf `/portal/sicherheit?pflicht=1` um.
**Leak-Prüfung:** Mit `PLATTFORM_HIBP=1` prüfen Registrierung, Passwort-Reset und Passwortänderung das neue Passwort gegen Pwned Passwords (k-Anonymity: nur 5 Zeichen des SHA-1 verlassen den Server, `Add-Padding`) → 422 `passwort_geleakt`; bei Netzfehlern wird die Prüfung übersprungen.

## 9. Backoffice: CRM, Akquise, Automationen, Vorlagen, Berichte, Rechte, Hash-Kette

Referenz: `src/lib/plattform/backend/demo/{crm,akquise,automation,vorlagen,berichte,rechte,kette}.js` · Adapter `backend/frappe/backoffice.js` (Tabelle `BACKOFFICE_METHODEN`) · Frappe `plattform/api/{crm,automation,berichte}.py`, Motor `plattform/backoffice.py`, Rechte `plattform/rechte.py`, Kette `plattform/hashkette.py`.

### Unterrollen (Rechte-Matrix)
Backoffice-Konten (`admin`) tragen `backofficeRollen` (Konto-Feld `backoffice_rollen`, kommagetrennt): `leitung | akquise | transaktion | buchhaltung | lesen`; ohne Angabe gilt `leitung`. Stufen je Bereich 0/1/2 (kein Zugriff/lesen/schreiben), Tabelle `RECHTE_MATRIX` in `src/lib/plattform/rechte.js` = `plattform/rechte.py`. Die Website erzwingt die Matrix in **jeder** Admin-API (`server/route.js` → `server/rechte.js`, Bereich aus dem Pfad; `status`/`zuweisen` nach `body.art`; `export/[art]` braucht Export + Bereich) und auf jeder Admin-Seite (`portalNutzer({admin})` → 404); jede Backoffice-Methode prüft zusätzlich selbst (`recht_noetig`). Fehlende Rechte → 403.

### Hash-Kette des Aktivitätsprotokolls
`hash = SHA-256(prevHash + "\n" + JSON.stringify([["id",…],["am",ISO],["nutzerId",…],["aktion",…],["objektArt",…],["objektId",…],["text",…],["ip",…]]))`, Start 64 × `0`. Plattform Aktivitaet: `kette_nr, prev_hash, entry_hash, nachgesiegelt`; Kettenkopf Single `Plattform Kette` (Sperre `FOR UPDATE` beim Anhängen). Einführung: Patch `hashkette_einfuehren` siegelt den Altbestand nach. `berichte.kette_pruefen` = `verify_chain` (meldet geänderte, gelöschte, eingefügte/umsortierte und ungesicherte Einträge).

### Methoden (alle mit `als_benutzer`, Rechte je Bereich)
| Methode | Argumente | Ergebnis | Bereich |
|---|---|---|---|
| `crm.kontakte` | `q?, rolle?, tag?, organisationId?, zustaendigId?, quelle?, nurDubletten?, limit?` | `{kontakte, gesamt, tags, dubletten}` | crm lesen |
| `crm.kontakt` | `id` | Kontakt + `bezuegeListe, aktivitaeten, verlauf, dubletten, organisationObjekt, konto` | crm lesen |
| `crm.kontakt_speichern` | `id?, daten {…, trotzdem?}` | Kontakt (gleiche E-Mail → 409) | crm schreiben |
| `crm.beziehung` | `kontaktId, art, id, rolle?, entfernen?` | `{ok, bezuege}` | crm schreiben |
| `crm.organisationen` · `crm.organisation` · `crm.organisation_speichern` | `q?, art?` · `id` · `id?, daten` | Organisation(en) | crm |
| `crm.aktivitaet_anlegen` | `daten {typ, betreff, text?, am?, kontaktId?, organisationId?, bezugArt?, bezugId?, wiedervorlageAm?, zustaendigId?}` | Aktivität (Wiedervorlage = Plattform Aufgabe) | crm schreiben |
| `crm.dubletten` · `crm.zusammenfuehren` | – · `zielId, quelleId` | Paare `{a, b, score, gruende}` · Kontakt | crm |
| `crm.massenaktion` | `ids[], tag?, tagEntfernen?, zustaendigId?, rolle?` | `{ok, geaendert}` | crm schreiben |
| `crm.akquise` | `land?, prioritaet?, sla?, zustaendigId? ("ohne"), status?, q?, alle?` | `{flaechen, kennzahlen, konten, gebiete}` | akquise lesen |
| `crm.akquise_setzen` | `flaecheId, daten {prioritaet?, besonderheiten?, netz?}` | Zeile | akquise schreiben |
| `crm.gebiete` · `crm.gebiete_speichern` | – · `liste [{name, land, bundeslaender[], plz[], mitarbeiterId, aktiv}]` | Gebiete | akquise |
| `crm.akquise_zuweisen` | `ids[], modus (gebiet, person), zustaendigId?, ueberschreiben?` | `{zugewiesen, uebersprungen, ohneGebiet}` | akquise + flaechen schreiben |
| `automation.liste` | `protokollLimit?, regelId?` | `{regeln, protokoll, vorlagen, konten, statistik}` (prüft fällige Fristen) | automationen lesen |
| `automation.speichern` · `automation.loeschen` | `id?, regel` · `id` | Regel | automationen schreiben |
| `automation.testlauf` | `regelId` oder `regel`, `bezugArt?, bezugId?, score?, kategorie?` | mit Objekt `{protokoll, aenderungen}` ohne Wirkung, sonst Rückblick | automationen lesen |
| `automation.fristen_pruefen` · `automation.tag_setzen` | – · `art, id, tag, an` | `{ausgeloest}` · `{tags}` | automationen · Bereich des Objekts |
| `automation.vorlagen` · `vorlage_speichern` · `vorlage_wiederherstellen` · `vorlage_vorschau` · `vorlage_senden` | wie Demo | Vorlagen mit `versionen[]` | vorlagen (senden zusätzlich crm schreiben) |
| `berichte.bericht` | `von?, bis?` (JJJJ-MM-TT, Standard 12 Monate) | `{zeitraum, kennzahlen, trichterZeit, kohorteTrichter, flaechenTrichter, quellen, pipelinePhasen, flaechenPipeline, provision, durchlauf, team}` | berichte lesen (Provisionsdetails nur mit provisionen lesen) |
| `berichte.rechte` · `berichte.rollen_setzen` | – · `nutzerId, rollen[]` | Matrix + Konten · `{id, backofficeRollen}` (eigene Leitung → 409) | rechte |
| `berichte.kette_pruefen` | `limit?` | `{ok, geprueft, fehler[], letzterHash, anker, eintraege[]}` | protokoll lesen |

**Automationsregel:** `{name, aktiv, beschreibung, ausloeser {typ (vorgang_neu, status, frist, suchprofil, dokument), art?, von?, nach?, frist (sla_erstkontakt, status_dauer, aufgabe_ueberfaellig)?, status?, tage?}, bedingungen [{feld, op, wert}], aktionen [...]}` – Felder `typ, land, bundesland, plz, mwp, ha, score, kanal, status, kategorie, tag`; Operatoren `gleich, ungleich, in, min, max, enthaelt, beginnt`; Aktionen `zustaendig {mitarbeiterId | "gebiet"}`, `aufgabe {titel, faelligInTagen, zustaendig}`, `mail {vorlageId, an}`, `nachricht {vorlageId}`, `tag {tag}`, `status {nach, kommentar}`, `prioritaet {wert}`. Bereinigung `regelBereinigen` (`src/lib/plattform/automation.js`) = `regel_bereinigen` (Python). Statuswechsel nur über den Automaten (als admin, inkl. Pflichtangaben). **Schleifenschutz:** Kettentiefe ≤ 3, jede Regel je Objekt einmal je Ereigniskette, ≤ 3 Ausführungen je Regel/Objekt/Stunde; alles im Ausführungsprotokoll (`Plattform Automation Lauf`, append-only). **Ereignisse** aus dem Kern: neuer Vorgang (auch CRM-Lead), jeder Statuswechsel (inkl. System), Dokument-Upload, Suchprofil-Treffer; Fristen täglich (Scheduler `backoffice.fristen_taeglich`) und beim Öffnen von Automationen/Akquise.

**Vorlagen-Platzhalter:** `PLATZHALTER` in `src/lib/plattform/vorlagen.js` (Kontakt, Vorgang, Fläche, Projekt – nur öffentliche Felder –, Zuständig, Portal-Link, Datum). Unbekannte Platzhalter → 422.

### HTTP-APIs (alle `admin` + Rechte-Matrix, Mutationen JSON + Origin)
`/api/admin/crm/kontakte` GET/POST · `/api/admin/crm/kontakte/[id]` GET/PATCH · `/api/admin/crm/kontakte/[id]/beziehung` POST · `/api/admin/crm/organisationen[/id]` GET/POST/PATCH · `/api/admin/crm/aktivitaeten` POST · `/api/admin/crm/dubletten` GET/POST · `/api/admin/crm/massenaktion` POST · `/api/admin/akquise` GET/POST · `/api/admin/akquise/[id]` PATCH · `/api/admin/akquise/gebiete` GET/PUT · `/api/admin/automationen` GET/POST · `/api/admin/automationen/[id]` PATCH/DELETE · `/api/admin/automationen/testlauf`, `…/fristen`, `…/tags` POST · `/api/admin/vorlagen` GET/POST · `/api/admin/vorlagen/[id]` PATCH · `/api/admin/vorlagen/[id]/wiederherstellen`, `/api/admin/vorlagen/vorschau`, `/api/admin/vorlagen/senden` POST · `/api/admin/berichte` GET · `/api/admin/berichte/csv` GET (CSV, protokolliert) · `/api/admin/berichte/pdf?monat=JJJJ-MM` GET (Monatsbericht-PDF mit Vormonatsvergleich, protokolliert) · `/api/admin/protokoll` GET · `/api/admin/rechte` GET · `/api/admin/rechte/[id]` PATCH.

## 10. Anlagen & Monitoring (Contracting-Anlagen, MQTT, Störungen)

Architektur, MQTT-Vertrag und Ingest-Dienst: [`docs/ANLAGEN-IOT.md`](./ANLAGEN-IOT.md). Referenz: `src/lib/plattform/backend/demo/anlagen.js` (Schnittstelle `backend/anlagen.js`, Adapter `backend/frappe/anlagen.js`), Regeln/Stammlisten `src/lib/plattform/anlagen.js` = `plattform/anlagen_kern.py`. Frappe-Methoden in `plattform/api/anlagen.py`. **Zeitreihen liefert nicht Frappe**, sondern der Ingest-Dienst (`src/lib/plattform/messdaten`).

**Rechte:** Backoffice mit Bereich `anlagen` (Rechte-Matrix, neue Unterrolle `betrieb`: Anlagen schreiben, Cockpit/Nutzer lesen, Aufgaben schreiben; `leitung` schreiben; `buchhaltung`/`lesen` lesen; `akquise`/`transaktion` kein Zugriff). Kunde = Konto `kundeId` der Anlage oder Mitglied der `organisationId` (jede Teamrolle liest; kommentieren als Kundenkonto bzw. ab Teamrolle „Mitglied“). Fremde Anlage → 403 (Seite 404) – auch für Messdaten, Zähler und Live. Kunden sehen nie Gerätezugänge, interne Kommentare oder interne Wartungskosten. Störungen **quittieren/bearbeiten nur der Betrieb** (Kunde → 403).

**DocTypes:** `Plattform Anlage` (AL) · `Plattform Anlagenkomponente` (AK) · `Plattform Messpunkt` (MP; `abrechnungsrelevant` nur mit `messstelle = geeicht`) · `Plattform Geraetezugang` (GZ; nur scrypt-Hash `scrypt$16384$8$1$salt$hash`) · `Plattform Stoerungsfall` (ST) · `Plattform Wartung` (WA) · `Plattform Contracting Vertrag` (CV, einer je Anlage) · `Plattform Zaehlerstand Monatswert` (ZM; Stand ≥ Vormonat, `menge` berechnet). Neue Benachrichtigungsart `stoerung` (Glocke + E-Mail ohne Inhalte, abbestellbar). Neue technische Rolle `ÖkoInvest Anlagen-Dienst` (nur `dienst_*`).

| Methode | Argumente | Ergebnis | Recht |
|---|---|---|---|
| `anlagen.liste` | `q?, typ?, status?` | `[{id, name, typ, typLabel, status, land, bundesland, ort, regionId, kwp, speicherKwh, speicherKw, inbetriebnahme, lastprofil, lastJahrKwh, wechselrichterAnzahl, kunde, organisation, offeneStoerungen[], vertrag{strompreisCt, grundgebuehrMonat, status}, meinZugriff, darfBearbeiten}]` | Kunde: eigene/Organisation; Backoffice (lesen): alle |
| `anlagen.holen` | `id` | Anlage + `vertrag` (voll), `komponenten[]`, `messpunkte[]`, `wartungen[]`, `stoerungen[]`, `geraete[]` (nur Backoffice), `datenVerbunden` | wie oben |
| `anlagen.kunden` | – | `{konten[] (Rolle unternehmen), organisationen[], betrieb[]}` | Backoffice lesen |
| `anlagen.anlegen` · `anlagen.aendern` | `daten {name, typ, status, land, bundesland, ort, kwp, speicherKwh, speicherKw, inbetriebnahme (Pflicht bei „betrieb“), lastprofil, lastJahrKwh, wechselrichterAnzahl, beschreibung, kundeId?, organisationId?}` · `id` | Anlage (Detail) | Backoffice schreiben |
| `anlagen.eintrag_speichern` | `anlageId, art (komponente, messpunkt, wartung, vertrag, monatswert), id?, daten` | Eintrag | Backoffice schreiben |
| `anlagen.eintrag_loeschen` | `anlageId, art, id` | `{ok}` (Messpunkt mit Monatswerten → 409) | Backoffice schreiben |
| `anlagen.monatswerte` | `anlageId` | `[{id, monat, messpunktId, zaehlernummer, bezeichnung, register, registerLabel, stand, menge, quelle, geprueft}]` | wie `holen` |
| `anlagen.geraet_anlegen` | `anlageId, bezeichnung` | `{zugang, passwort, einmalig: true, broker{host, port, tls}}` – **Passwort nur in dieser Antwort** | Backoffice schreiben |
| `anlagen.geraet` | `id` | `{zugang{id, benutzer, topic, status (wartet, verbunden, gesperrt), letzteNachricht, hash{algorithmus, fingerabdruck}}, broker}` | Backoffice lesen |
| `anlagen.geraet_aktion` | `id, daten {aktion: sperren, entsperren, neu}` (`neu` → neues Passwort einmalig; `testnachricht` → 409, nur Demo) | wie oben | Backoffice schreiben |
| `anlagen.stoerungen` | `anlageId?, status (offen, behoben, alle), limit?` | Störungen nach Priorität (Schwere × 10 + Alter + unquittiert) | sichtbare Anlagen |
| `anlagen.stoerung_anlegen` | `daten {anlageId, schwere, titel, text}` | Störung (Regel `manuell`) | Backoffice schreiben |
| `anlagen.stoerung_aktion` | `id, daten {aktion: kommentar {text, intern?} · quittieren · status {status, text?} · zuweisen {zustaendigId} · schwere {schwere}}` | Störung | kommentar: Kunde/Team ab Mitglied/Betrieb; sonst nur Betrieb (2× quittieren → 409) |
| `anlagen.leitstand` | – | `{stoerungen[], zaehler{offen, inArbeit, unquittiert, kritisch, anlagen, geraeteWartend, wartungenFaellig}}` | Backoffice lesen |
| `anlagen.dienst_zugaenge` | – | `[{benutzer, passwortHash, anlageId, geraetId, gesperrt}]` | **nur** Rolle `ÖkoInvest Anlagen-Dienst` |
| `anlagen.dienst_anlagen` | – | `[{id, status, kwp, speicherKw, regionId, geraete}]` | Anlagen-Dienst |
| `anlagen.dienst_stoerung` | `befund {anlageId, geraetId?, regel, schwere, titel, text, schluessel}` | `{id, neu}` (offene Störung derselben Regel → zusammengefasst) | Anlagen-Dienst |
| `anlagen.dienst_verbindung` | `geraetId, letzteNachricht` | `{ok}` (Status „verbunden“) | Anlagen-Dienst |

`site_config.json`: `oekoinvest_mqtt_host`, `oekoinvest_mqtt_port` (Broker-Angaben im Assistenten).

### HTTP-APIs der Website (Sitzung Pflicht, Mutationen JSON + Origin)
- `GET /api/portal/anlagen?q=&typ=&status=` – sichtbare Anlagen mit `live`, `heute`, `monat`, `jahr`, `ampel {id: laeuft|warnung|stoerung|offline, grund}`, `veraltet`, dazu `summe` (Leistung jetzt, Energien, Quoten, CO₂), `ampeln`, `quelle` (dienst|simulator), `messfehler`
- `GET /api/portal/anlagen/[id]` – Detail inkl. `kosten {monat, jahr: {arbeitEur, grundEur, gesamtEur, netzEur, ersparnisEur}}`, Quoten, CO₂
- `GET /api/portal/anlagen/[id]/messdaten?von=&bis=&aufloesung=15min|1h|1d|1mon[&format=csv]` – Zeitreihe (1d/1mon mit `erwartetKwh` = Soll); Zeitraum zu lang → 422
- `GET /api/portal/anlagen/[id]/live` – `text/event-stream`, `event: messwert` (max. 6 Ströme je Konto → 429)
- `GET /api/portal/anlagen/[id]/zaehler[?format=csv&art=abrechnung|monitoring]` – Monatswerte (Abrechnung) und Monitoring-Stände
- `GET /api/portal/anlagen/stoerungen?anlage=&status=` · `POST /api/portal/anlagen/stoerungen/[id]` `{aktion …}`
- Backoffice (`admin` + Bereich `anlagen`): `GET /api/admin/anlagen` (Leitstand) · `POST /api/admin/anlagen` (anlegen, 201) · `PATCH /api/admin/anlagen/[id]` · `POST|DELETE /api/admin/anlagen/[id]/eintraege` · `POST /api/admin/anlagen/[id]/geraete` (201, Passwort einmalig, `no-store`) · `GET|POST /api/admin/anlagen/geraete/[gid]` (`testnachricht` nur Demo, sonst 409) · `POST /api/admin/anlagen/stoerungen` · `GET /api/admin/anlagen/kunden`
