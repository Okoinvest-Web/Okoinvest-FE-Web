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

### Eigentum & Betrieb, Vertragsdetails (Fachprüfung Kapitalseite)
Die Anlagen sind Contracting-Anlagen **im Eigentum von ÖkoInvest bzw. einer ÖkoInvest-Projektgesellschaft (SPV)**; ÖkoInvest verkauft den Strom an den Kunden. Der Kunde (`kundeId`/`organisationId`) ist **Stromabnehmer** und ggf. Dachgeber – nicht Eigentümer.
- Anlage, zusätzliche Felder: `eigentuemer` (**Pflicht**, Text ≥ 3 Zeichen – z. B. „ÖkoInvest GmbH“ oder Name der Projektgesellschaft; fehlt → 422/ValidationError), `eigentuemerId` (optional, Link auf das Gesellschaftsverzeichnis – Demo `db.dienste.gesellschaften`, Frappe `Plattform Projektgesellschaft`; bei Angabe wird der Name übernommen, unbekannte Kennung → 422; `anlagen.kunden` liefert zusätzlich `gesellschaften[]`), `betriebsfuehrer` (Standard „ÖkoInvest GmbH“), `dachgeberIstKunde` (Check), `dachgeber` (Text; Ausgabe bei `dachgeberIstKunde` = Name des Stromabnehmers), `dienstbarkeitStatus` (`nicht_erforderlich|vorbereitung|beantragt|eingetragen`; bei beantragt/eingetragen ist `dienstbarkeitDatum` Pflicht), `dienstbarkeitDatum`, `dienstbarkeitHinweis` (Grundbuch Abt. II bzw. AT EZ/KG), `dienstbarkeitDokumentId` (Link `Plattform Dokument`), `finanziertDurch` (**nur Backoffice** in der Ausgabe; Covenants folgen als eigenes Modul). Frappe: Felder am DocType `Plattform Anlage`, Patch `oekoinvest_app.patches.anlage_eigentuemer` füllt Bestände mit „ÖkoInvest GmbH“.
- Kundensicht: `komponenten` = `null`/fehlt, `messpunkte` nur abrechnungsrelevante, `finanziertDurch` fehlt, `geraete` wie bisher nur Backoffice. Portal: Menü „Mein Solarstrom“, Kennzahlen „Solarstrom geliefert“, „Deckungsanteil“, „Reststrom aus dem Netz“, Kosten/Ersparnis; Reiter „Technik & Wartung“ nur Backoffice.
- Contracting-Vertrag, zusätzliche Felder: `indexBasis` (`fest|prozent|vpi|strompreis`), `mindestabnahmeKwhJahr` (Take-or-Pay), `endschaft` (`kaufoption|uebergang|verlaengerung|rueckbau`), `kaufoptionEur`, `endschaftText`. Anzeige der anteiligen Mindestabnahme: `mindestabnahme(vertrag, {eigenverbrauchKwh, monate})` in `src/lib/plattform/anlagen.js`.
- Backoffice „Anlagen & Störungen“: Portfolio je Eigentümergesellschaft (Anzahl, kWp, Erzeugung, gelieferte Menge, Stromverkauf nach Vertrag, Finanzierung); Suche/Filter nach Eigentümer.

### HTTP-APIs der Website (Sitzung Pflicht, Mutationen JSON + Origin)
- `GET /api/portal/anlagen?q=&typ=&status=` – sichtbare Anlagen mit `live`, `heute`, `monat`, `jahr`, `ampel {id: laeuft|warnung|stoerung|offline, grund}`, `veraltet`, dazu `summe` (Leistung jetzt, Energien, Quoten, CO₂), `ampeln`, `quelle` (dienst|simulator), `messfehler`
- `GET /api/portal/anlagen/[id]` – Detail inkl. `kosten {monat, jahr: {arbeitEur, grundEur, gesamtEur, netzEur, ersparnisEur}}`, Quoten, CO₂
- `GET /api/portal/anlagen/[id]/messdaten?von=&bis=&aufloesung=15min|1h|1d|1mon[&format=csv]` – Zeitreihe (1d/1mon mit `erwartetKwh` = Soll); Zeitraum zu lang → 422
- `GET /api/portal/anlagen/[id]/live` – `text/event-stream`, `event: messwert` (max. 6 Ströme je Konto → 429)
- `GET /api/portal/anlagen/[id]/zaehler[?format=csv&art=abrechnung|monitoring]` – Monatswerte (Abrechnung) und Monitoring-Stände
- `GET /api/portal/anlagen/stoerungen?anlage=&status=` · `POST /api/portal/anlagen/stoerungen/[id]` `{aktion …}`
- Backoffice (`admin` + Bereich `anlagen`): `GET /api/admin/anlagen` (Leitstand) · `POST /api/admin/anlagen` (anlegen, 201) · `PATCH /api/admin/anlagen/[id]` · `POST|DELETE /api/admin/anlagen/[id]/eintraege` · `POST /api/admin/anlagen/[id]/geraete` (201, Passwort einmalig, `no-store`) · `GET|POST /api/admin/anlagen/geraete/[gid]` (`testnachricht` nur Demo, sonst 409) · `POST /api/admin/anlagen/stoerungen` · `GET /api/admin/anlagen/kunden`

## 11. Projektentwicklung (internes Entwicklungsmanagement)

Referenz: `src/lib/plattform/backend/demo/entwicklung.js`; Regeln `src/lib/plattform/entwicklung.js` (Vorlagen, Planung, kritischer Pfad, Pipeline) = Frappe `plattform/entwicklung_kern.py` + `entwicklung_vorlagen.py` (generiert, Parität per Test geprüft). Frappe-Methoden: `oekoinvest_app.plattform.api.entwicklung.*` (Adapter `backend/frappe/entwicklung.js`, Auswahl `backend/entwicklung.js`).

### Rollen & Rechte
- Backoffice: Bereich `entwicklung` der Rechte-Matrix – lesen: alle Unterrollen außer Betrieb/Compliance; schreiben: `leitung` und neue Unterrolle **`projektleitung`** (zusätzlich CRM/Aufgaben schreiben, Kernbereiche lesen). Frappe-Desk-Rolle **„ÖkoInvest Projektleitung“** (2FA, DocPerm in `werkzeuge/desk_rechte.py`).
- **Flächeneigentümer/Landwirt** (Konto oder Team einer verknüpften Plattform-Fläche): nur vereinfachter Fortschritt – Meilensteine mit externem Titel, Stand erledigt/läuft/geplant, Zeitraum als Quartal, eigene Fläche mit Pachtstatus, voraussichtliche Inbetriebnahme. Nie Risiken, Kosten, Entscheidungen, Kontakte, Namen anderer Eigentümer, Notizen, Pipeline-Wert.
- **Co-Development-Investor** (Freigabe je Projekt für Konto oder Organisation, Rolle `investor`): Kennzahlen, alle Meilensteine mit Soll/Prognose/Verzug/kritischem Pfad, nur Risiken mit Kennzeichen `extern`, nur Dokumente mit `freigabeInvestor` (Schalter je Freigabe). Keine Kosten, Eigentümer, Notizen.
- **Gutachter/Planer** – neue Rolle `gutachter` (Frappe-Website-Rolle **„ÖkoInvest Gutachter“**, nicht selbst wählbar): nur Meilensteine mit seiner Konto-ID in `gutachterIds`; eigene Uploads bzw. für ihn freigegebene Dokumente (`fuerGutachter`), eigene Rückfragen; meldet `in_arbeit`/`eingereicht` (eingereicht erst nach eigenem Upload), erledigt nie. Einladung: `gutachterEinladen` (Token 256 Bit, nur SHA-256 gespeichert, 14 Tage, einmalig, E-Mail-Bindung) → `/einladung/gutachter/[token]` → Annahme ergänzt die Rolle und die Zuweisung. Profil-Speichern und Nutzerverwaltung behalten die Rolle. **Gutachter-Profil** (`Plattform Gutachter Profil`, GP): Fachgebiete (`GUTACHTER_FACHGEBIETE`), Qualifikation (öffentlich bestellt und vereidigt, zertifiziert/akkreditiert, Kammermitglied, Fachbüro), Büro, Nachweis – bei der Einladung erfassbar (übernommen bei Annahme), im Backoffice über `eintraege` `art: gutachterprofil` (`id` = Konto-ID) pflegbar; Auswahllisten zeigen Fachgebiete/Qualifikation.
- Fremde Konten → 403 (Seiten 404). Ohne Anmeldung → 401.

### Datenmodell (DocTypes, Präfix)
`Plattform Entwicklungsprojekt` (EP: titel, typ, status aktiv|pausiert|boerse|bau|abgebrochen, land, bundesland, gemeinde, landkreis, mwp, mwh, nvp, netzbetreiber, ziel_cod, vermarktung eeg|ppa|merchant, projektleiter_id, start, wahrscheinlichkeit, phase + pipeline_wert (berechnet), boerse_projekt_id, anlage_id, erp_projekt) ·
`Plattform Entwicklung Meilenstein` (MS: projekt_id, schluessel, titel, kategorie, dauer_monate, soll_start/soll_ende/soll_fix, ist_start/ist_ende, status offen|in_arbeit|erledigt|entfaellt, nach (JSON-Kennungen), phase, dokument_pflicht (JSON), extern_titel, gutachten, verantwortlich_id, gutachter_ids (JSON), eingereicht_am, nachweis_verzicht, notiz, erinnert, erp_task) ·
`Plattform Meilenstein Vorlage` (MV, + Kindtabelle `… Schritt`; Standard je Land × Typ per `vorlagen_sicherstellen` nach Migration, im Desk anpassbar) · `Plattform Entwicklung Risiko` (RK: eintritt/auswirkung 1–5, score, extern, meilenstein_id) · `Plattform Entwicklung Entscheidung` (EN, append-only) · `Plattform Budgetposition` (BP: plan_eur, ist_eur, ist_quelle manuell|erpnext|demo) · `Plattform Projektflaeche` (PF: flaeche_id → Plattform Flaeche, pacht_status angefragt|verhandlung|option|pachtvertrag|abgelehnt, pacht_eur_ha) · `Plattform Entwicklung Kontakt` (EK → Plattform CRM Kontakt, rolle) · `Plattform Entwicklung Freigabe` (FG) · `Plattform Entwicklung Dokument` (ED, Datei privat) · `Plattform Entwicklung Rueckfrage` (RF) · `Plattform Gutachter Einladung` (GE).

### Regeln
- **Vorlagen** je Land und Typ (DE: Flächensicherung, Netzanfrage § 8 EEG bzw. § 17 EnWG (Speicher), Netzzusage, Vorgespräch Gemeinde, Aufstellungsbeschluss, frühzeitige Beteiligung § 3/§ 4 BauGB, Netzverträglichkeitsprüfung, Gutachten Artenschutz (saP), FFH-Vorprüfung, Landschaftsbild/Sichtbarkeit, Blendung, Schall (Trafos/Wechselrichter), Entwässerung/Oberflächenwasser, archäologische Voruntersuchung, Baugrund mit Rammtests/Pfahlprobebelastung, Kampfmittelvorerkundung (UXO, vor Baubeginn), bei Agri-PV landwirtschaftliches Nutzungskonzept (DIN SPEC 91434), Umweltbericht, Offenlage, Abwägung, Satzungsbeschluss, Rechtskraft, Baugenehmigung, EEG-Gebot/PPA, Finanzierung, EPC, Baubeginn, Inbetriebnahme; Dach/Carport ohne B-Plan mit Statik; AT: Widmung „Grünland-Photovoltaik“, UVP-Feststellung, Naturverträglichkeitsprüfung, Blendgutachten, geotechnisches Gutachten, Landschaftsbild, elektrizitätsrechtliche Bewilligung, EAG-Förderung; CH: Richtplan, Landschaftsbild, Blendgutachten, geotechnisches Gutachten, Nutzungsplan, Baubewilligung bzw. Meldeverfahren Art. 18a RPG, Pronovo). Dauern sind Planwerte.
- **Terminplan**: Vorwärtsrechnung Start = max(Ende der Vorgänger), Ende = Start + Dauer. Beim Speichern ohne Prognose (Soll-Basis bleibt, Ist-Termine verschieben Nachfolger); „Plan neu berechnen“ mit Prognose (überfällige offene Vorgänger enden frühestens heute) und löst fixe Termine.
- **Kritischer Pfad**: Prognose vorwärts, späteste Enden rückwärts, Puffer ≤ 0 Tage und nicht erledigt = kritisch. **Verzug**: offen und Soll-Ende < heute.
- **Erledigen** nur, wenn alle Vorgänger erledigt/entfallen (sonst 409) und jede Dokumentenpflicht ein Dokument mit `pflicht` hat oder ein begründeter Verzicht (≥ 10 Zeichen) vorliegt (sonst 422). Zurücksetzen mit erledigtem Nachfolger → 409. Abhängigkeit mit Kreis → 409.
- **Phase** = höchste Phase erledigter Meilensteine (ohne: „Akquise“). **Pipeline-Wert** = MWp × 1000 × Mitte der `PHASEN.preisProKwp`-Spanne × Wahrscheinlichkeit (`ENTWICKLUNG.wahrscheinlichkeit` in `markt.js`, je Projekt überschreibbar); Speicher ohne MW: MWh/2.
- **Übergabe Börse**: legt `Plattform Projekt` (Entwurf, Anbieter = handelndes Backoffice-Konto, Phase, MWp, ha, Netzstatus aus den Meilensteinen, vertrauliche Angaben Gemeinde/Netzbetreiber/NVP) an, verknüpft, Status `boerse`, Entscheidung; zweimal → 409. **Übergabe Bau**: ab Phase RTB und mit Recht `anlagen` schreiben → Anlage (Status „Im Bau“) im Anlagen-Monitoring.
- **Benachrichtigungen** (Art `entwicklung`, E-Mail ohne Inhalte): Meilenstein erledigt → Eigentümer (nur externer Titel) und Co-Investoren; Zuweisung/Rückfrage/Einreichung; Fristen ≤ 7 Tage und Verzug je Stufe einmal an Verantwortliche und Gutachter (Frappe: Scheduler `fristen_taeglich`; Demo: beim ersten Öffnen des Portfolios je Tag bzw. `POST /api/admin/entwicklung/fristen`). Desk: Notifications „ÖkoInvest: Meilenstein fällig“ (7 Tage vorher) und „ÖkoInvest: Meilenstein erledigt“.
- **ERPNext (optional)**: nur wenn installiert und `site_config` `"oekoinvest_erpnext_entwicklung": 1`. `aktion: erpnext_sync` (und täglich): nach ERPNext Project + Task je Meilenstein (exp_start_date/exp_end_date, Status, `depends_on`); von ERPNext Task „Completed“ → Ist-Ende am Meilenstein (nur wenn Vorgänger fertig, sonst Konflikt im Ergebnis), `Project.total_costing_amount` (Timesheets) und `total_purchase_cost` → Budgetpositionen mit `ist_quelle = erpnext` (im Portal nicht änderbar). Ohne ERPNext: 409 mit Hinweis. Feldnamen ERPNext v15 – vor Einsatz gegen die installierte Version prüfen.

### Methoden (`entwicklung.*`, alle mit `als_benutzer`)
`portfolio(q,status)` · `holen(id)` · `auswahl()` · `anlegen(daten)` · `aendern(id,daten)` · `eintrag_speichern(projektId,art,id,daten)` · `eintrag_loeschen(projektId,art,id)` · `aktion(projektId,aktion,begruendung)` · `assistent(flaecheId,land,typ,start)` · `gutachter_einladen(projektId,email,meilensteinIds)` · `fristen()` · `meine()` · `extern(id)` · `meilenstein_melden(projektId,meilensteinId,aktion)` · `rueckfrage(projektId,meilensteinId,text,anId)` · `dokument_speichern(projektId,meilensteinId,pflicht,name,mime,inhalt(Base64),freigabeInvestor,fuerGutachter)` · `dokument_lesen(id)` → `{name,mime,inhalt}` · `einladung_info(token)` (ohne Nutzer) · `einladung_annehmen(token)` · `zaehler()`. Bericht **„Entwicklungspipeline“** (je Phase/Land/COD-Jahr mit Ziellinie 50 MWp, Liste), Druckformat **„Projektsteckbrief“** (Jinja `oekoinvest_entwicklung`).

### HTTP-APIs der Website (Sitzung Pflicht, Mutationen JSON + Origin)
- Backoffice (`admin` + Bereich `entwicklung`): `GET|POST /api/admin/entwicklung` · `GET|PATCH /api/admin/entwicklung/[id]` · `POST|DELETE /api/admin/entwicklung/[id]/eintraege` (`art`: flaeche|meilenstein|risiko|entscheidung|budget|kontakt|freigabe) · `POST /api/admin/entwicklung/[id]/aktion` · `POST /api/admin/entwicklung/[id]/gutachter` · `POST /api/admin/entwicklung/[id]/rueckfrage` · `GET /api/admin/entwicklung/assistent?flaecheId=&land=&typ=&start=` · `GET /api/admin/entwicklung/auswahl` · `POST /api/admin/entwicklung/fristen`
- Extern: `GET /api/portal/entwicklung` · `GET /api/portal/entwicklung/[id]` · `POST /api/portal/entwicklung/[id]/meilensteine/[mid]` `{aktion}` (Rolle gutachter) · `POST /api/portal/entwicklung/[id]/rueckfragen` (Rolle gutachter) · `POST /api/portal/entwicklung/dokumente` (multipart + `X-Plattform-Upload: 1`, PDF/JPG/PNG ≤ 10 MB, Magic Bytes) · `GET /api/portal/entwicklung/dokumente/[did]` (Download, protokolliert) · `POST /api/portal/entwicklung/einladung` `{token}`
- Seiten: `/portal/admin/entwicklung` (Portfolio: Kennzahlen, MWp je COD-Jahr mit Ziellinie, Summen je Phase/Land, Liste/Kanban/Karte, Verzug, Fristen 30 Tage, Auslastung), `/portal/admin/entwicklung/neu` (Vorlage-Assistent, `?flaeche=`), `/portal/admin/entwicklung/[id]` (`?reiter=plan|flaechen|risiken|kontakte|entscheidungen|kosten|freigaben`, `&ms=`), `/portal/admin/entwicklung/[id]/steckbrief` (Druck), `/portal/entwicklung` und `/portal/entwicklung/[id]` (externe Sichten), `/einladung/gutachter/[token]`.

## 12. Fachprüfung Flächen & Kommunen (Team A)

Details und Befunde: [`docs/fachpruefung/flaechenseite.md`](./fachpruefung/flaechenseite.md). Logik: `src/lib/plattform/flaecheFach.js`, `kommune.js` (Frappe: `plattform/flaeche_fach.py`).

- **Fläche** zusätzlich: `fach` (JSON, Positivliste: `boden, bewirtschaftung, foerderung, schutz, lage, eigentum, agri, dach`), `flurstuecke[]` je Land mit `gemarkung, gemarkungNr, flur (nur DE), nummer, grundbuch, blatt (DE Blatt / AT EZ), egrid (nur CH), m2` – Formatfehler → 422 „Flurstück n: …“. Kindtabelle `Plattform Flurstueck` neue Felder `gemarkung_nr, grundbuch, blatt, egrid, m2`. `eigentum` + `erbengemeinschaft, gesellschaft`; `nutzung` + `dauerkultur, brache, deponie`. Teil-Updates: fehlt `fach`/`flurstuecke` im Body, bleibt der Bestand.
- **Bedingung `flaecheVollstaendig`** zusätzlich (`fachPflichtFehlt`): Dach → Dachart, Asbest, Nutzer; Agri-PV (nicht Dach) → Kultur; Eigentum ≠ Allein → Vertretung; laufende Pacht → Ende oder Kündigungsfrist; Größe > 110 % der Katasterfläche → fehlt.
- **Pachtangebot** (`extra.pachtangebot`, Übergang „Pachtangebot senden“): `modell (fest|umsatz|kombi)`, Pflicht `laufzeitJahre` + je Modell `euroProHaJahr` bzw. `umsatzProzent` (+ `mindestProHa`); optional `indexierung, indexSatzProzent, reservierungProHaJahr, laufzeitBeginn, verlaengerungJahre, verlaengerung, optionsfristJahre, vorlaufJahre, bewirtschaftung, nichtbau, nichtbauEuroProHa, kuendigung, rueckbau, rueckbauAb, rueckbauEuro, dienstbarkeit, rangruecktritt, nebenflaechen, nebenflaechenText, anwalt, anwaltEuro, steuerhinweis, gueltigBis, text`; `am` setzt der Server. Nur gültige Werte werden gespeichert.
- **Anfrage `kommune`**: `daten` zusätzlich über Positivliste (`land, absender, gemeinde, gemeindeSchluessel` – DE AGS 8 Ziffern, AT 5, CH BFS 1–4, sonst 422 –, `rolle, gemeindeFlaechenHa, interesse6 (nur DE), buergerbeteiligung[], bauleitplanung, kriterienkatalog, themen[]`). CRM-Organisationsart neu `stadtwerk`.
- **Methode `kommune.uebersicht`** (`vorgangId?`, `als_benutzer`) → `{admin, anliegen[], gemeinden[{name, land, schluessel, vorgangId, projekte[{nr, art, ha, status, phase, seit, par6}], summe, ansprechpartner{vorname,nachname}}], geprueft}`. Nicht-Admin: nur eigene Anliegen (typ `kommune`); Projekte nur bei Anliegen im Status `qualifiziert|angebot|abgeschlossen`, nur Flächen im Status `planung|bau|betrieb` im Gemeindegebiet (Gemeindeschlüssel, sonst Name + Land), ohne Kennungen, Eigentümer, Flurstücke, Pacht. Admin: ohne `vorgangId` Liste aller Anliegen, mit `vorgangId` die Sicht dieses Anliegens (fremder Typ → 403, unbekannt → 404).
- **HTTP**: `GET /api/portal/kommune[?vorgang=]` (Sitzung Pflicht) · Seite `/portal/kommune`.

## KYC/KYB – Identitäts- und Firmenprüfung (Abschnitt „KYC/KYB“)

Referenz: `src/lib/plattform/backend/demo/kyc.js` · Selektor `backend/kyc.js` · Adapter `backend/frappe/kyc.js` · Regeln `src/lib/plattform/kyc.js`, `sanktionsliste.js` · Frappe `plattform/api/kyc.py`, `plattform/kyc_kern.py`, `plattform/kyc_aufgaben.py`.

**DocTypes:** `KYC Fall` (KY-…, je Konto bzw. Organisation; Status `offen → eingereicht → in_pruefung → [zweitpruefung] → verifiziert | nachgefordert | abgelehnt`, `verifiziert → abgelaufen` (System, Wiederholungsprüfung), `verifiziert|abgelehnt → offen` (Nutzer: erneute Prüfung); Personen-/Firmendaten als JSON-Felder + Spalten für Listen/Report), Kindtabelle `KYC Wirtschaftlich Berechtigter`, `KYC Dokument` (KD-…, privates File, AES-256-GCM, Prüfliste), `KYC Bankverbindung` (KB-…), `KYC Sanktionsabgleich` (KA-…, append-only), `KYC Sanktionslisteneintrag` (Import), `KYC Einstellungen` (Single). Rolle `ÖkoInvest Compliance` (Desk nur lesen); Website-Unterrolle `compliance` (Rechte-Matrix, Bereich `compliance`: Leitung 1, Compliance 2, sonst 0).

**Rechte:** Person selbst = eigener Fall (Angaben, Uploads, eigene Unterlagen ansehen/löschen solange bearbeitbar, einreichen). Unterlagen und Falldetails nur Unterrolle `compliance`; Leitung sieht nur Warteschlange/Status. Jeder Zugriff (auch verweigerte) → Aktivität `kyc_zugriff`/`kyc_zugriff_verweigert`/`kyc_einsicht` in der Hash-Kette. Sanktionstreffer werden dem Nutzer nie angezeigt (`zweitpruefung` erscheint als `in_pruefung`).

### Methoden `kyc.*` (alle `als_benutzer`, außer markiert)

| Methode | Argumente | Ergebnis / Regeln |
|---|---|---|
| `kyc.fall` | – | `{fall|null, anforderungen[], fortschritt{erfuellt,gesamt,quote,fehlend[]}, status, flaechen[], freigaben{schritt:{label,aktiv,ok}}, ablage}` |
| `kyc.speichern` | `abschnitt` (kontotyp · person · firma · ubos · vertreter · pep · mittelherkunft · steuer · bank), `daten` | legt den Fall beim Kontotyp an; nur in `offen|nachgefordert|abgelaufen` (sonst 409); IBAN mit falscher Prüfziffer/Länge → 422 |
| `kyc.dokument_speichern` | `art, flaecheId?, personId?, ausgestelltAm?, name, mime, inhaltBase64` | Typ an den Bytes (PDF/JPG/PNG), ≤ 10 MB; `eigentumsnachweis` nur für eigene Fläche (403); verschlüsselt als privates File |
| `kyc.dokument_lesen` | `id, ip` | `{meta, inhaltBase64}` – Eigentümer oder Compliance, sonst 403 (protokolliert) |
| `kyc.dokument_loeschen` | `id` | nur eigene, ungeprüfte Unterlage, solange bearbeitbar |
| `kyc.einreichen` | `ip` | alle Pflichtpunkte erfüllt (sonst 422 mit Liste) → `eingereicht`, Sanktionsabgleich, Risiko nach Regeln, Meldung an Compliance |
| `kyc.erneut` | – | `verifiziert → offen` (Freigaben bis zur erneuten Verifizierung gesperrt) |
| `kyc.status` | `kontoId?, organisationId?` (ohne `als_benutzer` = Systemaufruf) | `{status, verifiziert, kontotyp, fallId, bank{vorhanden,geprueft}, eigentum[flaecheIds], naechstePruefung, ausweisGueltigBis, statusLabel}` |
| `kyc.freigabe` | `schritt, kontoId?, organisationId?, flaecheId?` (auch Systemaufruf) | `{ok, aktiv, gruende[], hinweis, status}`; Nutzer nur für sich selbst |
| `kyc.warteschlange` | `status (offen|<status>|treffer|faellig|alle), q` | Compliance ≥ 1: `{faelle[], kennzahlen, liste, schreiben}` |
| `kyc.fall_detail` | `id, ip` | nur Compliance; inkl. Unterlagen-Metadaten, Prüfliste, Abgleich, Risiko, Verlauf, `pruefergebnisse[]`, Zugriffsprotokoll |
| `kyc.aktion` | `id, daten{aktion,…}` | nur Compliance: `uebernehmen` · `pruefliste {dokumentId, punkte, ergebnis ok|abgelehnt, notiz}` · `risiko {stufe, begruendung}` · `treffer {eintragId, prueflingName, bewertung ausgeschlossen|bestaetigt, begruendung ≥ 10}` · `abgleich` · `entscheiden {ergebnis verifiziert|nachgefordert|abgelehnt, grund}` · `zweitfreigabe` (andere Person als Erstprüfer, sonst 409) · `beziehungEnde {datum}` · `notiz {text}` |
| `kyc.einstellungen` / `kyc.einstellungen_speichern` | `daten{gating, geltung, vierAugenBeiHoch, vierAugenImmer, trefferSchwelle, hochrisikoLaender, pilotKonto{id,an}}` | Lesen Compliance ≥ 1, Schreiben nur Compliance |
| `kyc.sanktionsliste` · `kyc.sanktion_pruefen` | – · `name, geburtsdatum?, art` | Listenstand · Einzelabgleich (protokolliert) |
| `kyc.fristen` | `fallId?` | Fristen-Lauf (sonst täglich per Scheduler) |
| `kyc.ergebnis_anhaengen` | `fallId|kontoId|organisationId, eintrag{quelle, art, ergebnis ok|auffaellig|fehler|hinweis|ausstehend, zusammenfassung, rohdatenRef?, externeId?, daten?}` | **nur Systemaufruf** (API-Nutzer, ohne `als_benutzer`) – externe Dienste; entscheidet nie selbst, auffällige Ergebnisse → Meldung an Compliance |

**Verifizieren** setzt voraus: keine ungeprüfte Unterlage (Prüfliste je Dokumentart vollständig bestätigt), alle Pflichtpunkte mit geprüften Unterlagen, kein offener/bestätigter Sanktionstreffer. **Vier-Augen:** bei Risiko hoch, nach ausgeschlossenem Sanktionstreffer oder immer (Einstellung) → `zweitpruefung`, Freigabe durch eine andere Compliance-Person. Nach Verifizierung: `naechstePruefung` = heute + 36/24/12 Monate (Risiko niedrig/mittel/hoch), Bankverbindung `geprueft` = IBAN gültig UND Kontoinhaber = verifizierte Person/Firma.

**Risikoregeln** (`kyc.js kycRisiko` = `kyc_kern.risiko`): Drittland mit hohem Risiko +4 (Liste in den Einstellungen), außerhalb EU/EWR/CH +2, EU außerhalb DACH +1, PEP bzw. nahestehend bzw. PEP als wB +4, Unternehmen ohne wB über Anteile (fiktiver wB) +2, mehrstufig +2, Treuhand/Stiftung +2, Ticket > 5 Mio. +2 / > 1 Mio. +1, Sanktionstreffer offen/bestätigt +4 → ≥ 4 hoch, ≥ 2 mittel, sonst niedrig. Manuelle Einstufung mit Begründung.

**Anforderungen:** Privat – Person (inkl. Anschrift), Ausweisdaten (Art, Nummer, Behörde, gültig bis ≥ heute), Ausweis Vorder-/Rückseite bzw. Pass-Datenseite, PEP-Selbstauskunft; Selfie/Steuer optional. Unternehmen zusätzlich – Firma, Registerauszug (≤ 92 Tage, `ausgestelltAm`), Transparenzregister/WiEReG-Auszug bzw. Erklärung wB (CH), wB (≥ 25 % bzw. Kontrolle oder fiktiv), Vertreter (+ Ausweis je Vertreter außer Einreicher), Vollmacht wenn nicht vertretungsberechtigt. Investor – Ticketgröße + Mittelherkunft; Nachweis ab 1 Mio. € oder Risiko hoch. Flächeneigentümer/Landwirt – Bankverbindung und Eigentumsnachweis je Fläche (optional für die Verifizierung, Pflicht für Auszahlungen).

### Gating (Freigabe-Sperren)

| Schritt | Wo erzwungen (Demo / Frappe) | Wer muss verifiziert sein |
|---|---|---|
| `nda` NDA-Freigabe / Datenraum | `uebergangAnwenden` (interesse → nda_freigegeben) / `ablauf.uebergang_anwenden` | Investor (bzw. dessen Organisation) |
| `loi` LOI | interesse → loi_abgegeben | Investor |
| `gebot` Gebot | `dealroom.gebotAbgeben` / `bieter.gebot_abgeben` | Bieter |
| `zuschlag` Zuschlag | `bieterAktion zuschlag` / `bieter.aktion` | Bieter mit Zuschlag |
| `veroeffentlichung` | projekt → veroeffentlicht | Anbieter (KYB bzw. KYC) |
| `auszahlung` Pachtauszahlung / Gutschrift | für Abrechnung/Pacht: `kycFreigabe("auszahlung", {kontoId, flaecheId})` bzw. `kyc_kern.kyc_sperre("auszahlung", konto_id=…, flaeche_id=…)` | Eigentümer + geprüfte Bankverbindung + geprüfter Eigentumsnachweis der Fläche |
| `contracting` Contracting-Vertrag | neuer/aktivierter Vertrag (`anlageEintragSpeichern` art vertrag) / `anlagen.eintrag_speichern` | Kunde (Konto oder Organisation) |

Sperre → **409, code `kyc`**, Text mit Hinweis (z. B. „Um den Datenraum zu öffnen, bitte Verifizierung abschließen.“). Systemwechsel/Automationen werden ohne Verifizierung still übersprungen. Je Schritt abschaltbar (Standard: an). **Geltung:** Einstellung `geltung` > Umgebung (`PLATTFORM_KYC_GATING` bzw. site_config `oekoinvest_kyc_gating`: `alle|pilot|aus`) > Standard (Produktion/Frappe `alle`; Next.js-Entwicklung `pilot` = nur Konten in `pilotKonten`; Frappe-Testläufe `aus`).

**Für andere Teams:** JS `kycStatus(nutzer | {organisationId} | "U-…")`, `kycFreigabe(schritt, {kontoId, organisationId, flaecheId})`, `kycErgebnisAnhaengen(fall, eintrag)` aus `@/lib/plattform/backend/kyc`; in Demo-Transaktionen `kycSperre(db, schritt, ziel)` / `kycErgebnisAnhaengenDb(db, fall, eintrag)` aus `backend/demo/kycRegeln.js`. Python `kyc_kern.kyc_status(konto, organisation)`, `kyc_freigabe(…)`, `kyc_sperre(…)`, `ergebnis_anhaengen(fall_id, eintrag, konto_id=…)`. Portal-Hinweis: `<KycHinweisServer schritt="nda" nutzer={n} />`.

### HTTP-APIs der Website (Sitzung Pflicht, Mutationen JSON + Origin; Upload multipart + `X-Plattform-Upload: 1`)

`GET|PATCH /api/portal/kyc` · `POST /api/portal/kyc/einreichen` · `POST /api/portal/kyc/erneut` · `GET /api/portal/kyc/freigabe?schritt=&flaecheId=` · `POST /api/portal/kyc/dokumente` · `GET|DELETE /api/portal/kyc/dokumente/[id]` (`?anzeigen=1`) · Backoffice: `GET /api/admin/compliance?status=&q=` · `GET|POST /api/admin/compliance/[id]` · `GET /api/admin/compliance/dokumente/[id]` · `GET|PUT /api/admin/compliance/einstellungen` · `GET|POST /api/admin/compliance/sanktionen` · `POST /api/admin/compliance/fristen {fallId?}` · `POST /api/admin/compliance/freigabe {schritt, kontoId, organisationId?, flaecheId?}` (Cockpit-Leserecht, für Abläufe anderer Teams). Seiten: `/portal/verifizierung`, `/portal/admin/compliance`, `/portal/admin/compliance/[id]`.

## 13. Fachprüfung Kapitalseite (Investor, Anbieter, Unternehmen, Mitglied)

Referenz: `src/lib/plattform/backend/demo/fach.js` (Schnittstelle `backend/fach.js`, Adapter `backend/frappe/fach.js`), reine Fachlogik `src/lib/plattform/fach/*.js` = `plattform/fach/*.py` (Datenblatt-Schema als JSON `plattform/fach/datenblatt_schema.json`, Marktwerte `plattform/fach/markt_werte.json` – Gleichheit prüft `scripts/plattform-test-fach-kapital.mjs`). Befunde und Begründung: `docs/fachpruefung/kapitalseite.md`.

### Projektdatenblatt (Anbieter → Börse)
- `Plattform Projekt.datenblatt` (JSON, **vertraulich**): Felder laut Schema in zehn Bereichen (Technik, Ertrag P50/P75/P90, Netz, Genehmigung, Fläche & Sicherung, Vermarktung, Wirtschaftlichkeit (Anbieterangabe), Transaktion, Umwelt, Bestand). Netzbetreiber, Netzverknüpfungspunkt, Entfernung und P50 liegen weiter in `vertraulich` (`pfad: "vertraulich"` im Schema).
- `projekt.anlegen/aendern`: `daten.datenblatt` wird per Positivliste bereinigt (`datenblatt_bereinigen`); fehlt das Feld im PATCH, bleibt das gespeicherte Datenblatt unverändert.
- Checkliste: `checkliste.quote` = **70 % Pflichtunterlagen + 30 % Datenblatt-Vollständigkeit** (phasenabhängige Pflichtfelder), zusätzlich `quoteUnterlagen` und `datenblatt {quote, erwartet, erfuellt, bereiche[]}`. `datenraumQualitaet` der Börse = dieses `quote`.
- `boerse.detail`: bei Zugriff `nda|eigentuemer|admin` zusätzlich `datenblatt` und `ddIndex {kategorien[8]: {id, label, ampel: gruen|gelb|rot|grau, quote, fehlend[], hinweise[], pruefpunkte[]}, gesamt}` (Kategorien technisch, rechtlich, netz, genehmigung, ertrag, kaufmaennisch, steuern, umwelt). Öffentlich nie.
- Plausibilität (`datenblatt_pruefen`): DC/AC, MWp/ha je Aufständerung, P50 vs. Regionsrichtwert, P90 < P75 < P50, P90/P50-Band, Zusage < AC-Leistung, abgelaufene Reservierung/Realisierungsfrist, COD nach Fristen, Pacht-Laufzeit < 25 J., Reihenfolge der Genehmigungsdaten, § 35 BauGB Agri-PV > 2,5 ha, Ist vs. Prognose (Bestand), Verfügbarkeit.

### LOI (Interesse → `loi_abgegeben`)
`extra.loi` wird mit `loi_bereinigen` geprüft: immer Text ≥ 10 Zeichen **und ein Preis > 0** (`betrag` bzw. `preisbasis: proKwp` mit `preisProKwp` × kWp bzw. `ev` mit `enterpriseValue − nettoschulden`). Mit `struktur: true` zusätzlich Pflicht: `transaktion (asset|share|offen)`, `zahlung (einmal|meilensteine|earnout)` (+ `zahlungDetails` ≥ 10 Zeichen bei Meilensteinen/Earn-out), `gueltigBis` (Zukunft, ≤ 12 Monate), `bedingungenListe[]` (dd, gremien, finanzierung, netz, genehmigung, kartell oder allein `keine`), `finanzierung (ek|fk|fonds)`; optional `exklusivitaetWochen` (0–52). Gespeichert: `{version, preisbasis, betrag, preisProKwp, enterpriseValue, nettoschulden, transaktion, zahlung, zahlungDetails, bedingungenListe, bedingungen, finanzierung, exklusivitaetWochen, gueltigBis, text, am}`. Fehler → ValidationError (422).

### Suchprofil
`konto.suchprofil_speichern` übernimmt zusätzlich `investorTyp`, `regionen[]` (Bundesländer/Kantone), `renditeZielPct`, `renditeBasis (ek|projekt)`, `dealStrukturen[] (asset|share)`, `coDevelopment (egal|ja|nein)`, `esg[] (taxonomie|sfdr|lieferkette|biodiversitaet|buergerbeteiligung)`, `finanzierung`, `datenraumMin`. Der Matching-Score bleibt unverändert; Passungshinweise berechnet die Website (`fach/suchprofil.js`).

### Methoden `fach.*` (alle mit `als_benutzer`)
| Methode | Argumente | Ergebnis | Recht |
|---|---|---|---|
| `fach.energie_daten` | `nutzerId?` (nur Backoffice) | `{abnahmestellen[], lastgaenge[] (ohne Zeitreihe), eg, geno}` | eigenes Konto; Backoffice liest |
| `fach.abnahmestelle_speichern` | `id?, daten {bezeichnung, land, maloId (DE, Prüfziffer), meloId?, zaehlpunkt (AT/CH, 33 Zeichen), messart (rlm|slp|imsys), netzbetreiber, spannungsebene|netzebeneAt, jahresverbrauchKwh, spitzeKw, lieferant, vertragEnde, kuendigungsfristMonate, preisstruktur, arbeitspreisCt, leistungspreisEurKwJahr, grundpreisEurMonat, netzentgeltCt, stromsteuerEntlastung, par19, eigenerzeugungKwp, bemerkung}` | Abnahmestelle | Rolle `unternehmen`, nur eigene; doppelte Kennung → 422 |
| `fach.abnahmestelle_loeschen` | `id` | `{ok}` | Eigentümer |
| `fach.lastgang_speichern` | `name, abnahmestelleId?, reihe {startMs, n, kw[]}, meta, parameter, analyse` | Lastgang (ohne Reihe) | `unternehmen`; Reihe als private Datei; max. 12 |
| `fach.lastgang_reihe` | `id` | `{reihe, abnahmestelle}` | Eigentümer, Backoffice |
| `fach.lastgang_analyse_speichern` | `id, parameter, analyse` | Lastgang (Backoffice: nur Ergebnis, ohne Speichern) | Eigentümer |
| `fach.lastgang_loeschen` | `id` | `{ok}` | Eigentümer |
| `fach.lastgang_anfrage` | `id, nachricht?, ip` | `{vorgangId, bereits}` – legt Vorgang `reststrom` mit Kennzahlen an (einmal je Lastgang) | Eigentümer |
| `fach.eg_speichern` | `daten {land, form, rolle, maloId|zaehlpunkt, zaehlpunktEinspeisung?, netzbetreiber, plz, ort, jahresverbrauchKwh, anlageKwp, smartMeter, datenfreigabe}` | Teilnahme | Rolle `mitglied` |
| `fach.geno_speichern` | `daten {land, anteile 1–1000, art, interessen[], bestaetigt {aufbau, risiko, kuendigung, beratung} (alle true), bemerkung}, ip` | Vormerkung (`status: vorgemerkt`) | Rolle `mitglied` |
| `fach.bewertung` | `projektId` | `{projekt, zugriff, vertraulich, datenblatt, renditeZielPct, szenarien[]}` | Investor mit Datenraum, Anbieter des Projekts, Backoffice; sonst 403 |
| `fach.szenario_speichern` | `projektId, name, modus, eingaben, ergebnis` | Szenario | wie `bewertung`; max. 20 je Projekt |
| `fach.szenario_loeschen` | `id` | `{ok}` | nur eigene |

Lastgang-Parser und Renditerechnung laufen als reine Logik auf dem Website-Server (`fach/lastgang.js`, `fach/bewertung.js`); Frappe prüft Rechte, Grenzen und speichert. DocTypes: `Plattform Abnahmestelle` (AS), `Plattform Lastgang` (LG), `Plattform Bewertung Szenario` (SZ), `Plattform Beteiligung Interesse` (BI, `art geno|eg`), Feld `Plattform Projekt.datenblatt`.

### HTTP-APIs der Website (Sitzung Pflicht, Mutationen JSON + Origin)
- `GET /api/portal/fach/energie[?nutzerId=]` · `POST|DELETE /api/portal/fach/energie/abnahmestellen` (`{id?, daten}` bzw. `{id}`)
- `POST /api/portal/fach/energie/lastgang` `{name, inhalt (CSV-Text ≤ 4 MB), einheit?, abnahmestelleId?, parameter?}` (Rate-Limit „upload“) · `PATCH /api/portal/fach/energie/lastgang/[id]` `{pvKwp, preisCt, produzierend}` · `POST …/[id]` `{nachricht}` (Angebotsanfrage) · `DELETE …/[id]`
- `PUT /api/portal/fach/mitglied` `{art: geno|eg, daten}`
- `GET|POST /api/portal/fach/bewertung/[projektId]` (Vorbelegung + Ergebnis bzw. Szenario speichern `{name, eingaben}`) · `DELETE /api/portal/fach/szenarien/[id]`
- Seiten: `/portal/energie` (unternehmen), `/portal/beteiligung` (mitglied), `/portal/boerse/[id]/bewertung` (investor mit NDA, anbieter, admin)


## Finanzen & Abrechnung (Pacht, Contracting, Provision – ERPNext optional)

Referenz: `src/lib/plattform/backend/demo/finanzen.js` (+ `finanzen-kern.js`, `finanzen-seed.js`) · Schnittstelle `backend/finanzen.js` · Adapter `backend/frappe/finanzen.js` · reine Logik `src/lib/plattform/finanzen/**` = `plattform/finanzen/{logik,steuer,sepa}.py` · Frappe-Methoden `plattform/api/finanzen.py` · Betrieb/ERPNext/Steuer: [`Backend-Import/FINANZEN-ERPNEXT.md`](../Backend-Import/FINANZEN-ERPNEXT.md).

**Rechte:** Backoffice mit Bereich `finanzen` (Rechte-Matrix: `leitung`/`buchhaltung` schreiben – Läufe, Zahlungsstatus, Verträge, SEPA; `transaktion`/`lesen`/`projektleitung` lesen; `akquise`/`betrieb`/`compliance` kein Zugriff). Empfänger sehen nur eigene Belege (Konto `empfaengerId` bzw. Mitglied der `organisationId`), Pachtverträge nur als Eigentümer; fremde → 403 (Seite 404). **Auszahlungen** (SEPA, „bezahlt“ bei Gutschriften) nur nach KYC-Freigabe `auszahlung` (Demo `kycFreigabeDb`, Frappe `kyc_kern.kyc_freigabe`: Verifizierung + geprüfte Bankverbindung + Eigentumsnachweis bei Vertrag mit Portal-Fläche; Geltung nach `PLATTFORM_KYC_GATING` – in der Entwicklung nur Pilot-Konten) → sonst 409 `code: kyc`; die IBAN stammt immer aus der Verifizierung (ohne gültige IBAN nie eine Auszahlung). Gesperrte Posten → Klärfall „KYC unvollständig“ (`schluessel` `KYC:<konto>:<vertrag>`).

**Beleg** (`Plattform Abrechnung`, Kennung `AR-…`): `{id, nummer (PG|CR|PR-JJJJ-NNNNN, fortlaufend), art (pacht|contracting|provision), beleg (gutschrift|rechnung), titel, gesellschaftId, aussteller{name, anschrift, land, uid, firmenbuch}, partei{name, zuHaenden, anschrift, land, uid}, zeitraum{von,bis}, rechnungsdatum, faelligAm, positionen[{art, artikel, text, menge, einheit, preis, betrag}], netto, steuer{vorlage, label, satz, art, betrag, text, rechtsgrundlage}, brutto, status (offen|angewiesen|bezahlt|storniert), zahlungsstatus (+ ueberfaellig), bezahltAm, erklaerung[], zaehlerstaende[{zaehlernummer, register, anfang, ende, menge}], kennzahlen, bezug{pachtvertragId, anlageId, provisionId, projektId, monat, phase}}`; Backoffice zusätzlich `erpnext{doctype, name}`, `mahnhinweis`, `pflichtFehlt[]`, `hinweise[]`, `auszahlung{ok, gruende, ibanMaskiert, kycStatus}`. Je Periode (`schluessel`) höchstens ein nicht stornierter Beleg.

| Methode (`finanzen.*`) | Argumente | Ergebnis | Recht |
|---|---|---|---|
| `meine` | `jahr?` | `{jahr, jahre, pacht{sichtbar, belege, jahr, vertraege[+erklaerung, naechsteZahlung], naechsteZahlung, auszahlung}, contracting{belege, jahr, monate[{monat, kwh, netto, brutto}]}, provision{belege, jahr}}` | jedes Konto (nur eigene) |
| `abrechnung` · `abrechnung_pdf` | `id` (· `ip`) | Beleg (Detail, PDF-Abruf protokolliert) | Empfänger/Organisation/Backoffice |
| `cockpit` | – | `{kennzahlen, jeGesellschaft[], mahnvorschlaege[], laeufe[], zahlungslaeufe[], warnungen[], einstellungen}` | finanzen lesen |
| `abrechnungen` | `art?, status? (+ueberfaellig), q?, limit?` | Belege | finanzen lesen |
| `abrechnung_aktion` | `id, daten{aktion: bezahlt{datum?} · offen · mahnen · storno{grund}}` | Beleg | finanzen schreiben (Gutschrift „bezahlt“ nur mit KYC) |
| `lauf` | `daten{art (pacht|contracting|provision|alle), stichtag?, monat?, trockenlauf?, vertragIds?, anlageIds?}` | `{erzeugt[], klaerfaelle[], vorhanden, uebersprungen}` | finanzen schreiben |
| `pachtvertraege` · `pachtvertrag` · `pachtvertrag_speichern` · `pacht_auswahl` | `status?, q?` · `id` · `id?, daten` · – | Verträge (Eigentümer liest eigenen) | lesen/schreiben |
| `klaerfaelle` · `klaerfall_aktion` | `status?` · `id, daten{aktion: erledigt|verworfen, kommentar}` | Klärfälle | lesen/schreiben |
| `zahlungsvorschlag` | `bis?` | `{eintraege[{kontoId, empfaenger, gesellschaft, ok, gruende, belege[]}], summeFrei, summeGesperrt, auftraggeber[]}` | finanzen lesen |
| `sepa_export` | `ids[], ausfuehrungAm?, ip?` | `{xml (pain.001.001.09), dateiname, zahlungslauf}` – eine Gesellschaft je Datei | finanzen schreiben + KYC |
| `zahlungslauf_aktion` | `id, daten{aktion: bestaetigen|verwerfen}` | Zahlungslauf | finanzen schreiben |
| `vpi_werte` · `vpi_speichern` | – · `daten{reihe, jahr, wert, quelle?}` | Index-Reihen/Werte | lesen/schreiben |
| `anlagen` · `anlage_speichern` | – · `anlageId, daten{anschaffungswert, nutzungsdauerJahre, inbetriebnahme, regel}` | Aktivierung + AfA-Plan (ERPNext Asset) | lesen/schreiben |
| `entwicklung_kosten` · `entwicklung_ist` · `entwicklung_kosten_buchen` | – · `projektId` · `daten{projektId, kostenart, betrag, datum, beleg?, beschreibung?}` | Ist-Kosten, Budget vs. Ist, je MWp (`quelle: erpnext|plattform`) | entwicklung ODER finanzen lesen · finanzen schreiben |

Nebenwirkungen: neuer Beleg → Benachrichtigung `abrechnung` (Glocke + E-Mail ohne Beträge) an Empfänger bzw. Inhaber/Admins der Organisation; Provision `offen → in_rechnung` beim Anlegen der Rechnung und `→ bezahlt` beim Zahlungseingang (Statusverlauf „system“, Automationen); Beleg für eine Periode schließt deren offenen Klärfall. Scheduler täglich: Pacht, Provision, Contracting des Vormonats ab dem 5., ERPNext-Zahlungsstatus; Hook `Payment Entry` (on_submit/on_cancel) und `Plattform Provision.after_insert`.

### HTTP-APIs der Website (Sitzung Pflicht, Mutationen JSON + Origin)
- Portal: `GET /api/portal/finanzen?jahr=` · `GET /api/portal/finanzen/[id]` · `GET /api/portal/finanzen/[id]/pdf[?anzeigen=1]` (PDF, `no-store`, CSP sandbox)
- Backoffice (Bereich `finanzen`): `GET /api/admin/finanzen` · `GET /api/admin/finanzen/abrechnungen?art=&status=&q=[&format=csv]` (CSV zusätzlich Bereich `export`, protokolliert) · `GET|POST /api/admin/finanzen/abrechnungen/[id]` · `POST /api/admin/finanzen/lauf` · `GET|POST /api/admin/finanzen/pachtvertraege` (201) · `GET|PATCH /api/admin/finanzen/pachtvertraege/[id]` · `GET /api/admin/finanzen/pachtvertraege/auswahl` · `GET /api/admin/finanzen/klaerfaelle?status=` · `POST /api/admin/finanzen/klaerfaelle/[id]` · `GET /api/admin/finanzen/zahlungen?bis=` · `POST /api/admin/finanzen/zahlungen/sepa` (→ `application/xml`, Kopfzeile `X-Zahlungslauf`) · `POST /api/admin/finanzen/zahlungen/[id]` · `GET|PUT /api/admin/finanzen/vpi` · `GET /api/admin/finanzen/anlagen` · `PUT /api/admin/finanzen/anlagen/[id]` · `GET|POST /api/admin/finanzen/entwicklung` · `GET /api/admin/finanzen/entwicklung/[id]` (Lesen mit Bereich `entwicklung`)

## Geodaten & Akquise-Engine (Akquise-Karte)

Architektur, Scoring, Datenschutz: [`docs/AKQUISE-GEODATEN.md`](./AKQUISE-GEODATEN.md). Rechte: Backoffice-Bereich `geodaten` (Unterrollen Leitung, Akquise); Übernahme zusätzlich `akquise` schreiben. Geodaten kommen aus dem Geodaten-Dienst (`GEODATEN_URL`/`GEODATEN_TOKEN`, Bearer, `Backend-Import/dienste/geodaten`) bzw. im Demo-Betrieb aus lokalen GeoJSON-Dateien.

### Frappe-Methoden (`oekoinvest_app.plattform.api.geodaten.*`, jeweils mit `als_benutzer`)
| Methode | Argumente | Antwort |
|---|---|---|
| `ziele` | – | `{ ziele: [{ id, kandidatId, flaecheId, aufgabeId, status, score, ha, mwp, bundesland, bezirk, gemeinde, parzellen, umspannwerk, demo, von, am, flaeche }] }` |
| `ziel_uebernehmen` | `kandidat` (Objekt aus dem Geodaten-Dienst, serverseitig geladen), `notiz?` | `{ ziel, flaecheId, aufgabeId }` – legt Plattform Flaeche (Entwurf, ohne Eigentümerkonto), Plattform Aufgabe „Eigentümer ermitteln (Grundbuchabfrage)“ und Plattform Akquise Ziel (Geometrie als GeoJSON-Text) an; doppelt → DuplicateEntryError (409) |
| `kapazitaeten` | – | `{ <knotenId>: { kapazitaet, freiMw, quelle, stand, von, am } }` |
| `kapazitaet_setzen` | `knotenId`, `daten: { kapazitaet: frei\|knapp\|unbekannt, freiMw?, quelle (Pflicht), stand? }` | gespeicherter Eintrag |

### HTTP-APIs der Website (Sitzung Pflicht, Mutationen JSON + Origin)
`GET /api/admin/geodaten` (Übersicht: Modus, Quellen/Lizenzen, Kennzahlen, Gebiete, Ziele) · `GET /api/admin/geodaten/kandidaten?bbox=&minHa=&maxTrasseKm=&minScore=&bundesland=&bezirk=&gemeinde=&ampel=&q=&limit=` · `GET /api/admin/geodaten/kandidaten/[id]` (Steckbrief) · `GET /api/admin/geodaten/umkreis?knoten=&km=` · `GET /api/admin/geodaten/netz?bbox=&arten=` (GeoJSON) · `GET /api/admin/geodaten/ebenen/[schutzgebiete|zonen]?bbox=` · `GET /api/admin/geodaten/suche?q=` · `GET /api/admin/geodaten/export?format=csv|geojson&<Filter>` (protokolliert, Rate-Limit `export`) · `GET /api/admin/geodaten/anschreiben?kandidat=` · `GET|POST /api/admin/geodaten/ziele` (POST `{ kandidatId, notiz? }` → 201) · `POST /api/admin/geodaten/kapazitaet`.
Kandidat (JSON): `{ id, demo, ha, mwp, score, ampel, prioritaet, ko[], kriterien[{ id, label, punkte, max, text, art }], schwerpunkt[lon,lat], bbox, geometrie (MultiPolygon, WGS84), land, bundesland, bezirk, gemeinde, kg[], parzellen[{ id, kg, kgNr, gstNr, ha, nutzung, kultur }], merkmale{ kompaktheit, neigungGrad, exposition, nutzung, hauptnutzung, siedlung, schutz[] }, netz{ knoten, luftlinieM, trasseM, ebene, kosten{ summe, min, max, proKwp, anteil, ampel, monate }, kapazitaetAmpel }, umspannwerk, widmung{ status, text }, kennzahlen, kennzahlenAgri }`.

## Dienste: Identität, Register, Bonität, SPV-Gründung (Abschnitt „Dienste“)

Referenz: `src/lib/plattform/backend/demo/dienste.js` · Frappe: `plattform/api/dienste.py`, Regeln `plattform/dienste_kern.py` (Spiegel von `src/lib/plattform/dienste/**`) · Anbieter, Kosten, Recht: [`docs/DIENSTE-EXTERN.md`](./DIENSTE-EXTERN.md).
Externe Ergebnisse **entscheiden nie** über den KYC-Fall: Sie werden über `kyc_kern.ergebnis_anhaengen` bzw. `kycErgebnisAnhaengen` (Team KYC) als Hinweis angehängt.

### Rechte (Bereiche in `rechte.js`/`rechte.py`, Spalten leitung · akquise · transaktion · buchhaltung · lesen · betrieb · compliance · projektleitung)
| Bereich | Stufen | Bedeutung |
|---|---|---|
| `gesellschaften` | 2 · 0 · 2 · 1 · 1 · 0 · 0 · 1 | Verzeichnis lesen, Gründung/Checkliste schreiben |
| `bonitaet` | 2 · 0 · 2 · 0 · 0 · 0 · 2 · 0 | Ergebnisse nur Leitung, Transaktion, Compliance |
| `register` | 2 · 1 · 2 · 1 · 1 · 0 · 2 · 1 | Suche lesen, (kostenpflichtiger) Abruf schreiben; Ablage im KYC-Fall zusätzlich `compliance` schreiben |

### DocTypes
`Plattform Identitaetspruefung` (IP-…, Online-Sitzung bzw. MRZ-Vorprüfung; MRZ selbst wird nicht gespeichert, Dokumentnummer maskiert) · `Plattform Registerauskunft` (RA-…, Abrufdatum, Quelle, Zweck, KYC-Fall) · `Plattform Bonitaetsauskunft` (BA-…, Ampel, Score, Kreditlimit, Information des Betroffenen, manuelle Freigabe) · `Plattform Projektgesellschaft` (PG-…, Rechtsform, Kapital, Gesellschafter/GF als JSON, Link `Plattform Entwicklungsprojekt`, Namensprüfung) mit Kindtabelle `Plattform Gruendungsschritt`. Nachweise (IP/RA/BA) nur über das Löschkonzept löschbar. Druckformate „Projektgesellschaft Gruendungspaket“ (Jinja-Helfer `oekoinvest_gesellschaft`) und „Bonitaet Information“ (Art. 14 DSGVO, ohne Ergebnis). Notifications „ÖkoInvest: Projektgesellschaft eingetragen“, „ÖkoInvest: Bonitätsauskunft rot“. Scheduler täglich `dienste.gesellschaft_fristen_taeglich`.

### Methoden `dienste.*` (alle `als_benutzer`, außer dem Webhook)
| Methode | Rechte | Ergebnis |
|---|---|---|
| `ident_status` | angemeldet (eigene Daten) | `{konfig:{anbieter,label,aktiv,demo}, sitzungen[], mrz}` |
| `ident_starten(basisUrl)` | angemeldet, max. 5/Tag | `{sitzung, url}` – Redirect zum Anbieter (Demo: `/portal/verifizierung/identitaet?sitzung=`) |
| `ident_demo_abschluss(sitzungId, ergebnis)` | nur Demo-Anbieter, nur eigene Sitzung | signierter Webhook über denselben Prüfpfad |
| `mrz_pruefen(zeilen)` | angemeldet, 20/h | `{ergebnis: plausibel|auffaellig|ungueltig, hinweise, mrz{format,felder,pruefungen}, abgleich, kycVerknuepft}` |
| `webhook_identitaet?anbieter=` | **allow_guest**, nur POST, `rate_limit` 120/min je IP | HMAC-Prüfung je Anbieter (Veriff `X-HMAC-SIGNATURE`, Sumsub `X-Payload-Digest` + `-Alg` (SHA-1 abgelehnt), Onfido `X-SHA2-Signature`, Demo `x-oekoinvest-signatur` über `zeit.body` ±5 min); falsch → 401 ohne Details; idempotent (Ereignis-ID) |
| `register_suche(land,q)` · `register_abruf(land,nummer,kycFallId,zweck)` · `register_auskuenfte(q)` · `register_auskunft(id)` | `register` 1/2 (+ `compliance` 2 für KYC-Ablage) | Firmendaten normalisiert `{name,nummer,gericht,sitz,anschrift,rechtsform,status,gegenstand,stammkapital,organe[],stand}` |
| `bonitaet_uebersicht` · `bonitaet_beauftragen(subjekt{art,id},land,registernummer,anlass,rechtsgrundlage,interesseId,informieren)` · `bonitaet_detail(id)` · `bonitaet_freigeben(id,begruendung)` · `bonitaet_einstellungen_speichern(daten)` | `bonitaet` 1/2 | Auskunft mit Ampel (`gruen|gelb|rot|unbekannt`), `gueltig`/`gueltigGrund` (`fehlt|offen|veraltet|rot|keine_daten`) |
| `bonitaet_status(kontoId, organisationId)` | `interessen` 1 | nur `{pflicht, ok, grund, firma}` – ohne Ergebnis |
| `gesellschaften_liste` · `gesellschaft_auswahl` · `gesellschaft_namen_pruefen` · `gesellschaft_holen` · `gesellschaft_paketdaten` | `gesellschaften` 1 | Verzeichnis, Organigramm `{knoten,kanten,extern}`, Fristen, Dokumentdaten |
| `gesellschaft_anlegen(daten)` · `gesellschaft_aendern(id,daten)` · `gesellschaft_schritt(id,daten)` · `gesellschaft_erp(id)` · `gesellschaft_fristen` | `gesellschaften` 2 | Checkliste mit Reihenfolge (409), Pflichtwerten (Registernummer je Land/Abteilung, Einzahlung ≥ Minimum, UID-Format, Notartermin) |

**Bonität vor LOI/Gebot:** `dienste_kern.bonitaet_sperre("loi"|"gebot", konto_id, organisation_id)` in `ablauf.uebergang_anwenden` bzw. `api/bieter.py` (Demo: `diensteRegeln.bonitaetSperre` in `demo.js`/`dealroom.js`) wirft `BonitaetErforderlich` (HTTP 409, Website-Code `bonitaet`), wenn die Pflicht gilt (Einstellung > `oekoinvest_bonitaet_vor_loi` > Standard: Produktion `firmen`, Entwicklung `pilot`) und keine gültige Auskunft vorliegt (≤ 180 Tage, nicht rot ohne Freigabe). Der Hinweis an den Investor nennt nie ein Ergebnis.

### HTTP-APIs der Website
- Portal (Sitzung Pflicht): `GET|POST /api/portal/dienste/identitaet` · `POST /api/portal/dienste/identitaet/demo` · `POST /api/portal/dienste/mrz` (≤ 4 KB)
- Öffentlich (Server-zu-Server): `POST /api/dienste/identitaet/webhook/[anbieter]` – Roh-Body ≤ 256 KB, nur JSON, HMAC, Rate-Limit; im Frappe-Betrieb Weiterleitung an `dienste.webhook_identitaet`
- Backoffice: `GET|POST /api/admin/register` · `GET /api/admin/register/auskuenfte` · `GET /api/admin/register/[id]` · `GET /api/admin/register/[id]/pdf` · `GET|POST /api/admin/bonitaet` (201) · `GET|POST /api/admin/bonitaet/[id]` · `PUT /api/admin/bonitaet/einstellungen` · `GET /api/admin/bonitaet/status` · `GET|POST /api/admin/gesellschaften` (201) · `GET /api/admin/gesellschaften/auswahl` · `POST /api/admin/gesellschaften/namenspruefung` (Leserecht genügt) · `POST /api/admin/gesellschaften/fristen` · `GET|PATCH /api/admin/gesellschaften/[id]` · `POST /api/admin/gesellschaften/[id]/schritt` · `GET /api/admin/gesellschaften/[id]/dokumente[?dok=]` (PDF) · `POST /api/admin/gesellschaften/[id]/erp` (Demo 501)

## Dokumente, Signatur, Termine, Service & HR (Abschnitt „Dokumente, Signatur, Termine, Service & HR“)

Referenz: `src/lib/plattform/backend/demo/service-*.js` · Adapter `backend/frappe/service.js` · Fassade `backend/service.js` (`serviceBackend()`) · Frappe `plattform/api/{signatur,termine,support,hr}.py`, reine Regeln `plattform/{signatur,termine,hr,service}/`.
Alle Frappe-App-Integrationen sind **optional** (App installiert UND Schalter in `site_config`): `oekoinvest_drive` (+ `oekoinvest_drive_benutzer`, `oekoinvest_drive_team`; KYC nur mit `oekoinvest_drive_kyc` + `oekoinvest_drive_kyc_benutzer`, verschlüsselt), `oekoinvest_helpdesk` (+ `oekoinvest_helpdesk_team`), `oekoinvest_hrms` (+ `oekoinvest_timesheet_aktivitaet`), `oekoinvest_event` (Frappe-Kern „Event“), `oekoinvest_termin_organisator` ({name,email} – erst nach Freigabe einer Kontaktadresse). **Drive- und Helpdesk-DocTypes vor Einsatz gegen die installierte Version prüfen** (Adapter `service/drive.py`, `service/helpdesk.py` erkennen Felder über die Metadaten und brechen mit klarer Meldung ab).

### Rechte (Bereiche in `rechte.js`/`rechte.py`, Spalten leitung · akquise · transaktion · buchhaltung · lesen · betrieb · compliance · projektleitung)
`signatur` 2·2·2·1·1·0·1·1 · `kalender` 2·2·2·1·1·2·1·2 · `support` 2·1·1·1·1·2·1·1 · `team` 2·1·1·1·1·1·1·1 · `wissen` 2·2·2·2·1·2·2·2. Eigene Abwesenheit und eigene Zeiten erfasst jedes Backoffice-Konto (`team` ≥ 1); fremde nur `team` = 2.

### DocTypes (Präfix)
`Plattform Signaturvorgang` (SV, Kindtabelle `Plattform Signatur Unterzeichner`, Protokoll append-only, Original unveränderlich) · `Plattform Termin` (TE) · `Plattform Mitarbeiter` (MA) · `Plattform Abwesenheit` (AB) · `Plattform Zeiteintrag` (ZE) · `Plattform Ticket` (TK) · `Plattform Wissensartikel` (WI) · `Plattform Service Einstellungen` (Single: `nda_modus`, `provision_modus`, Feiertage ohne HRMS). Druckformat **„Signaturprotokoll“**; Notifications „Plattform Ticket SLA ueberschritten“ (E-Mail an „ÖkoInvest Admin“, ohne Kundeninhalte) und „Plattform Signatur abgeschlossen“ (Systembenachrichtigung). Benachrichtigungsarten `signatur`, `termin`, `ticket`. Scheduler: täglich `signatur.erinnerungen_senden`, `hr.hrms_abgleich`; stündlich `termine.erinnerungen_senden`, `support.sla_pruefen`. `doc_events`: `Plattform Dokument`/`KYC Dokument` `after_insert` → Drive-Spiegelung (Hintergrundjob, nur mit Schalter).

### Elektronische Unterschrift (`signatur.*`) – einfache elektronische Signatur (EES, Art. 3 Nr. 10 eIDAS), **keine qualifizierte**
| Methode | Rechte | Ergebnis / Regeln |
|---|---|---|
| `liste(status, alle)` · `holen(id)` | Beteiligte (Unterzeichner, Ersteller), `signatur` ≥ 1 alle | Vorgang: `unterzeichner[]` (andere ohne E-Mail/Browser, IP gekürzt), `protokoll[]`, `dokument{sha256}`, `signiert{sha256}`, `kennzeichnung`, `rechtshinweis`, `zustimmungText`, `ichBinDran` |
| `anlegen(daten{titel,art,pdfBase64,dateiname,unterzeichner[{email oder kontoId}],reihenfolge,fristTage,nachricht,bezugArt,bezugId}, ip)` | `signatur` 2 | nur PDF ≤ 10 MB, nicht verschlüsselt; Unterzeichner = aktive Portal-Konten (max. 6); SHA-256 des Originals; erste Person wird benachrichtigt |
| `code_anfordern(id, ip, userAgent)` | Unterzeichner, der an der Reihe ist (sonst 409) | 6-stelliger Code per E-Mail (nur Hash gespeichert, 10 min, max. 5 Codes/h → 429) |
| `unterschreiben(id, daten{code,art: gezeichnet/getippt,bild (PNG-dataURL ≤ 200 KB),name,zustimmung:true,ip,userAgent})` | dito | falscher Code → 422 (5 Versuche, dann 429); SHA-256 des Originals erneut geprüft (Abweichung → 409 + Protokoll `hash_abweichung`); `{vorgang, abschlussNoetig, folgeAktion}` |
| `abschluss_daten(id)` → `abschliessen(id, pdfBase64, sha256)` | Beteiligte | Website erzeugt die Prüfseite (inkrementelles PDF-Update); Frappe akzeptiert nur Dateien, die byte-genau mit dem Original beginnen; speichert SHA-256 „nachher“; signiertes PDF zusätzlich als `Plattform Dokument` (Kategorie `vertrag`) am Bezug |
| `ablehnen(id, grund)` · `widerrufen(id, grund)` · `erinnern(id)` | Unterzeichner · Backoffice/Ersteller vor Abschluss (danach 409) · `signatur` 2 (einmal je 12 h) | |
| `datei(id, variante: original/signiert)` | Beteiligte | `{name, mime, inhaltBase64}`, Abruf im Protokoll |
| `einstellungen()` · `einstellungen_speichern(daten{ndaModus,provisionModus})` | angemeldet · `signatur` 2 | `klick` (Standard) oder `signatur` |
| `standard(art: nda/provision, projektId)` | Investor (Börsenprojekt) bzw. Anbieter des Projekts | Modus `klick` → `{modus:"klick"}`; sonst Vorgang aus dem bestehenden Text (Frappe: `templates/signatur_standard.html` via `get_pdf`) → `{modus, erledigt, id}` |

**Klick oder Signatur:** `POST /api/portal/boerse/[id]/nda` und `POST /api/portal/projekte/[id]/provision` rufen vorab `signaturModusPruefen()` auf. Im Modus `signatur` antworten sie – solange nicht vollständig unterschrieben – mit **409 `signatur_noetig`** und Link auf den bereitgestellten Vorgang; nach der letzten Unterschrift führt `/api/portal/signatur/[id]` die bisherige Operation (`ndaAnfragen` bzw. `provisionAkzeptieren`) als Folgeaktion aus.

### Termine & Kalender (`termine.*`)
| Methode | Rechte | Ergebnis / Regeln |
|---|---|---|
| `slots(art, von, bis, mitarbeiterId)` | öffentlich für `besichtigung`, `beratung_telefon`, `beratung_video`, `gemeinde`; `datenraum` nur Investoren | `{slots[{start,ende}]}` (Backoffice zusätzlich `mitarbeiter[]`); Arbeitszeiten je Wochentag, Feiertage (HRMS Holiday List bzw. Einstellung), Abwesenheiten, Puffer, Vorlauf, Raster 30 min, Horizont 42 Tage, Europe/Vienna |
| `buchen(daten{art,start,kontakt,einwilligung,notiz,kanal,herkunft,fuerKontoId,mitarbeiterId}, ip)` | öffentlich (Einwilligung Pflicht, max. 3 offene Termine je E-Mail) · Konto · `kalender` 2 | Mitarbeiter: Wunsch (Backoffice) → Gebietsverantwortlicher (Besichtigung/Gemeinde) → geringste Belegung; Sperre `SELECT … FOR UPDATE` + erneute Slot-Prüfung (Doppelbuchung → 409); E-Mail mit ICS an Kunde und Mitarbeiter; öffentliche Buchung → `verwaltenToken` (nur Hash gespeichert) |
| `liste(alle,von,bis,mitarbeiterId,status)` · `holen(id)` · `ics(id)` | Kunde (eigene), Mitarbeiter (zugewiesene), `kalender` ≥ 1 | ICS RFC 5545 (`METHOD:PUBLISH`, mit Organisator `REQUEST`/`CANCEL`, `SEQUENCE`, `VALARM`) |
| `aendern(id, daten{aktion: umbuchen/stornieren/bestaetigen/erledigt/nicht_erschienen/zuweisen, start, grund, mitarbeiterId})` | Kunde: umbuchen/stornieren (nur künftige); `kalender` 2: alle | neue ICS-Sequenz, Benachrichtigung der Gegenseite |
| `per_token(token)` · `per_token_aendern(token, daten)` | öffentlich (Einmal-Link aus der E-Mail) | nur umbuchen/stornieren |
| `verfuegbarkeiten()` · `verfuegbarkeit_speichern(kontoId, daten{arbeitszeiten,terminarten,aktiv})` | `kalender` 1 · 2 | |

### Service & Support (`support.*`) – optional gespiegelt nach Frappe Helpdesk („HD Ticket“)
| Methode | Rechte | Ergebnis / Regeln |
|---|---|---|
| `liste(status: offen/erledigt/<status>, alle, q)` · `holen(id)` · `kennzahlen()` | Kunde/Organisation · `support` ≥ 1 | SLA je Priorität (Reaktion/Lösung in Kalenderstunden: kritisch 2/24, hoch 8/48, normal 24/120, niedrig 48/240); Kunde sieht nur das Reaktionsziel, nie interne Notizen |
| `anlegen(daten{betreff,text,kategorie,prioritaet,anlageId,fuerKontoId})` | Konto (Priorität max. „hoch“), Organisation ab „Mitglied“; Anlage nur mit Zugriff (sonst 403) | Zuständigkeit: Support-Schreibende, bei Abwesenheit die Vertretung |
| `antworten(id, text, intern)` · `aktion(id, daten{aktion: status/prioritaet/zuweisen/schliessen})` | Kunde: antworten, schließen · `support` 2: alles | erste öffentliche Antwort erfüllt die Reaktionszeit; Kundenantwort öffnet „gelöst“ wieder |
| `aus_stoerung(stoerungId)` | `support` 2 | idempotent je Störung, Priorität aus der Schwere |
| `anhang_speichern(id, name, mime, inhaltBase64)` · `anhang_lesen(id, anhangId)` | Beteiligte | PDF/JPG/PNG ≤ 10 MB (Magic Bytes), max. 5 je Ticket, private Files |

### HR & Wissen (`hr.*`)
| Methode | Rechte | Ergebnis / Regeln |
|---|---|---|
| `team()` · `mitarbeiter_speichern(kontoId, daten{funktion,employeeId,vertretungId,kapazitaetStunden,aktiv})` | `team` 1 (sonst nur eigene Zeile) · 2 | Gebiete aus der Akquise (`Plattform Gebiet`), Abwesenheiten, Auslastung (Termine 7 Tage, Aufgaben, Tickets, Signaturen; Kapazität abzüglich Abwesenheit) |
| `abwesenheiten(von,bis,kontoId)` · `abwesenheit_anlegen(daten{mitarbeiterId,von,bis,art,vertretungId})` · `abwesenheit_loeschen(id)` | eigene: Backoffice · fremde: `team` 2 | **automatische Vertretung**: fällige Aufgaben, Termine (ohne Doppelbuchung der Vertretung) und – bei laufender Abwesenheit – offene Tickets gehen an die Vertretung (Kette über Standardvertretungen, Tiefe 4); Hinweis-Aufgabe für offene Zuweisungen; HRMS-Abwesenheiten (`quelle: hrms`) nur dort pflegen |
| `vertretung(kontoId, tag)` | Backoffice | `{id, kette, grund}` – für andere Module (z. B. Zuweisung neuer Vorgänge) |
| `zeiten(monat,kontoId,projektId)` · `zeit_erfassen(daten{datum,stunden,projektId oder erpProjekt,taetigkeit,text,kontoId})` · `zeit_loeschen(id)` | eigene: Backoffice · fremde: `team` 2 | 0,25–12 h je Tag; mit HRMS Timesheet-Entwurf (Employee, Projekt nur, wenn ERPNext-Projekt existiert) |
| `zeiten_auswertung(projektId, von, bis)` | `team`, `entwicklung` oder `finanzen` ≥ 1 | **Schnittstelle Projektentwicklung/Finanzen:** `{projekte[{projektId,erpProjekt,stunden,taetigkeiten}], summe}` – Kosten rechnet das Finanzmodul |
| `wissen(q,kategorie)` · `wissen_artikel(id)` · `wissen_speichern(daten)` · `wissen_loeschen(id)` | nur Backoffice (`wissen` 1/2) – Kunden immer 403 | Versionen (letzte 10) |
| `integrationen()` | Backoffice | Status Drive/Helpdesk/HRMS/Event |

### HTTP-APIs der Website (Mutationen JSON + Origin; Uploads multipart + `X-Plattform-Upload: 1`)
- Portal: `GET /api/portal/signatur` · `GET|POST /api/portal/signatur/[id]` (`aktion`: code, unterschreiben, ablehnen, widerrufen, erinnern) · `GET /api/portal/signatur/[id]/pdf?variante=original|signiert` · `GET|POST /api/portal/termine` · `GET /api/portal/termine/slots` (auch ohne Anmeldung) · `GET|PATCH /api/portal/termine/[id]` · `GET /api/portal/termine/[id]/ics` · `GET|POST /api/portal/support` · `GET|POST|PATCH /api/portal/support/[id]` · `POST /api/portal/support/[id]/anhang` · `GET /api/portal/support/[id]/anhang/[aid]`
- Öffentlich: `POST /api/portal/termine/oeffentlich` (Buchung, Honeypot, Rate-Limit) · `POST /api/portal/termine/oeffentlich/verwalten` (Token im Body)
- Backoffice: `GET|POST /api/admin/signatur` (POST multipart: `datei`, `daten`) · `GET|PATCH /api/admin/signatur/einstellungen` · `GET|POST /api/admin/termine` · `GET|PATCH /api/admin/termine/verfuegbarkeit` · `GET|POST /api/admin/support` · `GET /api/admin/hr` · `PATCH /api/admin/hr/mitarbeiter/[id]` · `GET|POST /api/admin/hr/abwesenheiten` · `DELETE /api/admin/hr/abwesenheiten/[id]` · `GET|POST /api/admin/hr/zeiten` · `DELETE /api/admin/hr/zeiten/[id]` · `GET /api/admin/hr/auswertung` · `GET /api/admin/hr/integrationen` · `GET|POST /api/admin/wissen` · `GET|PATCH|DELETE /api/admin/wissen/[id]`

## Energiebeschaffung & Versorger-Ausschreibung (Team A3)

Fachkonzept, Quellen, Rechtsrahmen: [`docs/ENERGIEBESCHAFFUNG.md`](./ENERGIEBESCHAFFUNG.md). Website: `src/lib/plattform/backend/energie.js` (Demo `backend/demo/energie.js`, Adapter `backend/frappe/energie.js`), Rechenlogik `src/lib/plattform/energie/*` = Frappe `plattform/energie_kern.py`.

**Rollen**: neue Website-Rolle `lieferant` (Frappe „Plattform Lieferant“, nur per Einladung, keine DocPerm); Backoffice-Unterrolle `energie` (Desk-Rolle „ÖkoInvest Energie“, 2FA), Bereich `energie` in der Rechte-Matrix (Leitung/Energie schreiben, Buchhaltung/Lesen lesen). Benachrichtigungsart `energie` (Kunde, Lieferant).

**DocTypes**: Plattform Marktpreis Spot (SX) · Plattform Marktpreis Termin (TP) · Plattform Energie Vertrag (EV) · Plattform Ausschreibung (EA) + Kindtabelle Plattform Ausschreibungsrunde · Plattform Lieferantenangebot (LO) · Plattform Lieferant (LF) · Plattform Lieferant Einladung (LE, nur Token-Hash) · Plattform Beschaffungstranche (BT) · Plattform Wechselanalyse (WN) · Plattform Beschaffungsvollmacht (VM) · Plattform Energie Einstellungen (Single). Druckformate „Angebotsvergleich Energie“, „Zuschlagsschreiben Energie“; Notifications „ÖkoInvest: Fristen-Alarm Energievertrag“, „ÖkoInvest: Zuschlag Energie erteilt“; Scheduler `energie_quellen.spot_taeglich` (täglich), `api.energie.fristen_taeglich` (täglich), `api.energie.lauf_woechentlich` (wöchentlich).

| Methode `energie.*` | Parameter | Rückgabe | Recht |
|---|---|---|---|
| `spot` | `zone (DE, AT), tage` | `{zone, quelle, quelleLabel, lizenz, aufloesungMin, stunden[{t,eurMwh}], aktuell[], stand, fehler?}` | Backoffice lesen |
| `termin` · `termin_speichern` · `termin_loeschen` | `zone, produkt` · `daten {eintrag {handelstag, zone, produkt, typ, preisEurMwh, quelle} oder csv, quelleStandard}` · `id` | Kurve (`tabelle`, `kurve[]`, `verlauf`, `eintraege`) · `{neu, ersetzt, fehler[]}` | lesen · schreiben (Quelle Pflicht, sonst 422) |
| `einstellungen` · `einstellungen_speichern` · `uebersicht` · `lauf` | `daten` | Annahmen (Aufschläge, Schwellen, Vergütungsparameter, Bestpreis-Regel) · Kennzahlen · `{analysen, alarme, erinnerungen}` | lesen / schreiben |
| `kunden` · `kunde` | – · `kunde_id` | Liste mit Wechselanalyse · Detail (Abnahmestellen, Lastgänge, `los`, Verträge, Analyse, Vollmacht) | Backoffice lesen; `kunde` auch der Kunde selbst |
| `vertrag_speichern` | `id?, kunde_id?, daten {lieferant, zone, preisCt, preisArt (energie, gesamt), struktur, beginn, vertragEnde, kuendigungsfristMonate/Wochen, verlaengerungMonate, verlaengerungPreisCt, jahresKwh, lastprofil, pvKwpGeplant, speicherKwhGeplant}` | Vertrag inkl. `kuendigungsStichtag`, `tageBisStichtag`, `energiepreisCt` | Kunde (eigene, nicht aus Zuschlag) oder Backoffice schreiben |
| `meine` | – | Verträge, Analyse, Vollmacht + Text, Ausschreibungen (Kundensicht), Ersparnis | Rolle unternehmen |
| `vollmacht_erteilen` · `vollmacht_widerrufen` · `vollmacht_signatur` | `zustimmung, ip, user_agent` · `ip` · `kunde_id, signatur_id` | Vollmacht (Version, SHA-256 des Textes) | Kunde · Kunde · Backoffice |
| `lieferanten` · `lieferant` · `lieferant_speichern` · `lieferant_bewerten` · `lieferant_einladen` | `id, daten, email, basis_url, ausschreibung_id` | Stamm mit Teilnahme, Bewertung, KYB, offenen Einladungen | Backoffice |
| `einladung_info` · `einladung_annehmen` | `token` · `token, daten {vorname, nachname, passwort}` (ohne Sitzung: Konto anlegen) | `{gueltig, lieferant, email (maskiert), kontoVorhanden}` · `{ok, neuesKonto, weiter}` | API-Benutzer; E-Mail muss zur Einladung passen |
| `ausschreibungen` · `ausschreibung` | `status?` · `id` | je Rolle: Backoffice alles; **Lieferant nur eingeladene, anonymisiert, nur eigene Angebote** (sonst 404); Kunde nur eigene | – |
| `ausschreibung_anlegen` | `daten {titel, kundenIds[], zone, lieferbeginn JJJJ-MM, produkte[{art (fix, tranchen, spot), laufzeitJahre, tranchen?, gruen?}], lieferantIds[], bestpreis, kommune, starten, frist}` | Backoffice-Sicht inkl. `vergleich` | schreiben; jeder Kunde mit aktiver Vollmacht (409), mind. 2 Versorger beim Start (422) |
| `ausschreibung_aktion` | `id, daten {aktion: starten, einladen, frist, beenden, naechsteRunde {lieferantIds (nur mit Angebot), bestpreisRegel}, erinnern, antworten {frageId, antwort, oeffentlich}, zuschlagVorschlag {angebotId, produktId, begruendung}, zuschlag, vorschlagZurueck, abbrechen {grund}}` | Backoffice-Sicht | schreiben; Vorschlag erst nach Rundenende (409); `zuschlag` nur mit Freigabe **aller** Kunden (409) |
| `angebot_abgeben` · `angebot_zurueckziehen` · `frage_stellen` | `id, daten (Preisblatt)` · `id` · `id, text` | Angebot (Version) · `{ok}` · Frage | Lieferant, eingeladen und für die Runde zugelassen; nach Frist 409; KYC-Schritt „gebot“ |
| `freigabe` | `id, daten {entscheidung (freigegeben, abgelehnt), kommentar, ip}` | `{ok, zuschlag, ausschreibung}` – alle Kunden frei → Zuschlag, Verträge, Absagen, Aufgabe „Lieferantenwechsel einleiten“ | Kunde des Loses mit aktiver Vollmacht; KYC-Schritt „zuschlag“ für den Versorger |
| `portfolio` · `tranche_speichern` · `tranche_stornieren` | – · `daten {periode Qn-JJ, zone, mwh, preisEurMwh, gekauftAm, lieferantId}` · `id` | `{zonen{DE, AT: {perioden[], summe{hedgeQuote, mtmEur, risikoEur}}}, kunden[], tranchen[]}` | lesen · schreiben |
| `dokument_daten` | `art (vergleich, zuschlag, vollmacht), id` | Daten für das PDF der Website | Backoffice; Kunde (eigene, ab Freigabe); Versorger nur eigenes Zuschlagsschreiben |

**Normierung**: Position × Profil des Loses (erstes Lieferjahr): Festpreis = Menge × Arbeitspreis; Spot/Tranchen = Menge × (lastgewichteter Terminpreis aus Peak/Offpeak je Monat + Aufschlag); jeweils + Grundpreis × 12 + HKN. Sensitivität mit Exposition Festpreis 0, Tranchen 0,5, Spot 1.

### HTTP-APIs der Website (Mutationen JSON + Origin)
- Backoffice (`admin` + Bereich `energie`): `GET, POST /api/admin/energie` (Übersicht · `{aktion:"lauf"}`) · `GET, POST, DELETE /api/admin/energie/termin` · `GET, POST /api/admin/energie/einstellungen` · `GET /api/admin/energie/kunden` · `GET, POST /api/admin/energie/kunden/[id]` · `POST /api/admin/energie/kunden/[id]/vollmacht-signatur` (zusätzlich Bereich `signatur`) · `GET, POST (201) /api/admin/energie/ausschreibungen` · `GET, POST /api/admin/energie/ausschreibungen/[id]` · `GET, POST /api/admin/energie/lieferanten[/id]` (`aktion`: speichern, bewerten, einladen) · `GET, POST /api/admin/energie/portfolio` (`aktion`: buchen, stornieren)
- Kunde (`unternehmen`): `GET, POST /api/portal/energie` · `POST /api/portal/energie/vollmacht` (`aktion`: erteilen, widerrufen) · `POST /api/portal/energie/freigabe`
- Alle Rollen: `GET /api/portal/energie/dokument?art=vergleich|zuschlag|vollmacht&id=` (PDF, Rechte im Backend)
- Versorger (`lieferant`) bzw. Kunde: `GET /api/portal/ausschreibungen[/id]` · `POST /api/portal/ausschreibungen/[id]/angebot` (Preisblatt bzw. `aktion: zurueckziehen`) · `POST /api/portal/ausschreibungen/[id]/fragen` · `GET, POST /api/portal/ausschreibungen/einladung` (öffentlich bzw. optional angemeldet, Rate-Limit `einladung`)

## Finanzierung: Investoren-Cockpit & Bankfinanzierung Eigenbetrieb (Abschnitt „Finanzierung“)

Recherche, Rechenwerte und Methodik: [`docs/FINANZIERUNG.md`](./FINANZIERUNG.md). Rechenkern (rein, Client + Server): `src/lib/plattform/finanzierung/{kern,bank,foerder,geschaeftsmodell,vorbelegung}.js`; Frappe `plattform/finanzierung_kern.py`.

### Frappe-Methoden (`oekoinvest_app.plattform.api.finanzierung.*`, Adapter `backend/frappe/finanzierung.js`)
Frappe prüft Rolle UND Eigentum, speichert, versendet und rechnet die Covenants (Scheduler täglich `covenants_taeglich`). Financial Model, Varianten, Term-Sheet-Vergleich, Vorbelegung aus Börse/Datenraum und Geschäftsmodell rechnet der Adapter serverseitig (nach der Rechteprüfung) mit denselben reinen Funktionen wie das Demo-Backend.
- Investor/Anbieter: `cockpit_liste` · `cockpit_projekt(projektId)` (nur mit freigegebenem Datenraum bzw. als Anbieter, sonst 403; liefert projekt, vertraulich, datenblatt) · `szenario_speichern(projektId?, name, eingaben, ergebnis, fokus)` · `szenario_loeschen(id)` · `szenario(id, ip)` (nur eigene)
- Backoffice (Bereich `finanzierung`, lesen/schreiben): `uebersicht` · `fall(id)` · `auswahl` · `fall_anlegen(daten)` · `fall_aendern(id, daten)` · `bank_speichern(daten)` · `aktion(fallId, daten)` mit `aktion` ∈ `anfragen{bankIds,frist,nachricht,basisUrl}` · `einladung_neu{anfrageId}` · `anfrage_zurueck{anfrageId}` · `paket{freigabe[]}` · `termsheet{anfrageId,termsheet}` · `entscheidung{anfrageId,begruendung}` (**nur Unterrolle Leitung**) · `kreditvertrag{kreditvertrag,planCfads}` · `cp{cpId,erledigt,nachweis}` · `covenant` · `geschaeftsmodell{gewaehlt,annahmen,begruendung,werte}` (**nur Leitung**) · `dokument_speichern(fallId, baustein, name, mime, inhalt)` · `dokument_lesen(id, anfrageId?, ip)` · `modell_daten(fallId|anfrageId, baustein)` · `reporting_daten(fallId)` · `covenant_lauf` · `geschaeftsmodell(fallId)`
- Bank (Website-Rolle `bank` = Frappe-Rolle „ÖkoInvest Bank“, nur per Einladung; Konto muss in `Plattform Bank.konten` der angefragten Bank stehen): `bank_einladung_info(token)` · `bank_einladung_annehmen(token)` (nur eingeladene E-Mail) · `bank_meine` · `bank_anfrage(anfrageId)` (nur eigene Bank, nur freigegebene Bausteine, keine anderen Banken) · `bank_aktion(anfrageId, {aktion: termsheet|absage|rueckfrage})` · `bank_zaehler`

DocTypes: Plattform Finanzierungsszenario, Finanzierungsfall, Bank, Finanzierungsanfrage (Einladungstoken nur als SHA-256), Term Sheet, Kreditvertrag, Covenant Pruefung (append-only), Finanzierungsdokument (private Datei), Foerderprogramm. Druckformate „Finanzierungsvergleich“ (Szenario), „Bank Reporting Covenants“ (Fall). Notifications „ÖkoInvest: Covenant-Frühwarnung“, „ÖkoInvest: Term Sheet eingegangen“. Benachrichtigungsart `finanzierung`.

### HTTP-APIs der Website (Mutationen JSON + Origin)
- Alle angemeldeten Rollen: `GET, POST (201) /api/portal/finanzierung` (Liste · Szenario speichern) · `GET /api/portal/finanzierung/projekt/[id]` · `DELETE /api/portal/finanzierung/szenarien/[id]` · `GET /api/portal/finanzierung/szenarien/[id]/pdf`
- Backoffice (`admin` + Bereich `finanzierung`): `GET, POST (201) /api/admin/finanzierung` · `GET /api/admin/finanzierung/auswahl` · `POST /api/admin/finanzierung/banken` · `POST /api/admin/finanzierung/covenants` · `POST /api/admin/finanzierung/geschaeftsmodell` (nur Rechnung, lesen) · `GET, PATCH /api/admin/finanzierung/[id]` · `POST /api/admin/finanzierung/[id]/aktion` · `POST /api/admin/finanzierung/[id]/dokumente` (multipart, `X-Plattform-Upload: 1`) · `GET /api/admin/finanzierung/[id]/dokumente/[dok]` · `GET /api/admin/finanzierung/[id]/modell[?art=steckbrief][&format=csv]` · `GET /api/admin/finanzierung/[id]/reporting` (PDF)
- Bank (`bank`): `GET /api/portal/bank` · `GET, POST /api/portal/bank/[id]` · `GET /api/portal/bank/[id]/dokument/[steckbrief|financial_model|FD-…][?format=csv]` · `POST /api/portal/bank/einladung` (Rate-Limit `einladung`)
- Seiten: `/portal/finanzierung[?projekt=|?szenario=]`, `/portal/admin/finanzierung[?tab=]`, `/portal/admin/finanzierung/[id][?tab=banken|paket|vertrag|covenants|geschaeftsmodell]`, `/portal/bank[/id]`, `/einladung/bank/[token]`

## Grundbuch & Closing (Dienstbarkeiten, Deal-Abschluss – Team B0b/B4)

Recherche und Rechtsgrundlagen: [`docs/GRUNDBUCH-CLOSING.md`](./GRUNDBUCH-CLOSING.md) – **keine Rechtsberatung**, alle Vorlagen sind Muster zur anwaltlichen/notariellen Prüfung. Regeln: `src/lib/plattform/closing/{grundbuch,closing}.js` = `plattform/closing_kern.py` (Stammdaten in `closing_vorlagen.json`, aus den JS-Modulen generiert). Backend: `backend/closing.js` (`closingBackend()`), Demo `backend/demo/closing.js` (`db.closing`), Frappe `plattform/api/closing.py`.

### Frappe (whitelisted, `oekoinvest_app.plattform.api.closing.*`, jeweils mit `als_benutzer`)
- Grundbuch: `gb_liste(status, land, q)` · `gb_meine()` · `gb_zu_bezug(bezugArt, bezugId)` · `gb_akte(id)` · `gb_auswahl()` · `gb_anlegen(daten)` · `gb_aendern(id, daten)` · `gb_schritt(id, daten{schluessel,status,datum,nachweisWert,notiz,frist})` · `gb_signatur(id, pdfBase64, dateiname, ip)` (legt über `api/signatur.vorgang_anlegen` einen Signaturvorgang an) · `gb_dokument_speichern(id, schritt, name, mime, inhalt)` · `gb_dokument_lesen(id, dokId, ip)` · `gb_muster_daten(id, vorlage, ip)` · `gb_fristen_lauf()`; Scheduler täglich `fristen_taeglich`.
- Closing: `cl_liste(status)` · `cl_meine()` · `cl_akte(id)` · `cl_anlegen(daten{projektId,interesseId,struktur,spvName,spvGesellschaftId,anteilProzent,kaufpreis})` · `cl_aendern(id, daten)` · `cl_aktion(id, daten{aktion: signing_punkt|signing|cp|cp_neu|zahlung_eingang|closing|uebergabe|abbrechen, …})` · `cl_portal_aktion(id, daten{aktion:"cp_melden", schluessel, nachweis})` · `cl_dokument_daten(id, art: spa|bericht, ip)` · `cl_termin(id)`.
- DocTypes: `Plattform Grundbuch Vorgang` (+ Kindtabelle `Plattform Grundbuch Schritt`), `Plattform Closing` (+ `Plattform Closing Bedingung`). Druckformate (Jinja, Muster): „Dienstbarkeitsvertrag Freiflaeche Muster“, „Dachnutzungsvertrag Servitut Muster“, „Rangruecktritt Ersuchen Muster“, „Loeschungsbewilligung Hinweis Muster“ (Grundbuch-Vorgang), „Kaufvertrag SPA Muster“, „Closing Abschlussbericht“ (Closing); Jinja `oekoinvest_grundbuch(name)`, `oekoinvest_closing(name)`. Bericht „Offene Grundbuch Eintragungen“. Notifications „ÖkoInvest: Grundbuch eingetragen“, „ÖkoInvest: Closing vollzogen“.

### Regeln
- **Rechte:** Backoffice-Bereiche `grundbuch` (Leitung/Akquise/Transaktion/Projektleitung schreiben; Buchhaltung/Lesen/Betrieb lesen) und `closing` (Leitung/Transaktion schreiben; Buchhaltung/Lesen/Compliance/Projektleitung lesen). Eigentümer bzw. Dachgeber (`eigentuemerId` der Akte) sehen nur die eigene Akte, vereinfacht (Portaltexte, ohne interne Notizen/Nachweise außer dem Grundbuchauszug). Käufer (`investorId` der Interesse) und Verkäufer (`anbieterId`) sehen nur ihren Closing-Raum; die Gegenseite bleibt anonym bis zur Kontaktfreigabe im Deal-Room; die Provision sieht nur der Verkäufer. Fremde → 403 (Seiten 404).
- **Grundbuch-Schritte** je Land (DE: Vertrag → Unterschrift → Beglaubigung § 29 GBO → Rangrücktritt → Antrag → Eintragung; AT: Aufsandung, Beglaubigung § 31 GBG, Vorrangseinräumung, Grundbuchsgesuch/TZ, Einverleibung; CH: Vertrag → öffentliche Beurkundung → Rangrücktritt → Anmeldung → Eintragung). Erledigen nur mit erledigten Voraussetzungen (409), Nachweis Pflicht bei Antrag/Rang/Eintragung (422), Rang entfällt ohne Grundpfandrechte, Zurücksetzen nur ohne erledigten Nachfolger (409). Status spiegelt sich an der Anlage (`dienstbarkeitStatus`).
- **Closing:** Anlage nur nach Zuschlag bzw. angenommener LOI und solange das Projekt vermarktet wird (409, ein Raum je Projekt). **Signing** nur mit KYC/KYB beider Seiten (409, Code `kyc`), vollständiger Checkliste und Kontaktfreigabe. **Closing** nur mit allen CPs erfüllt/verzichtet, bestätigtem Zahlungseingang, Notartermin beim Share Deal und weiterhin verifiziertem KYC → Projekt `verkauft` (Automat, Provision) → Provisionsrechnung (Finanzen). CP „erfüllt“ braucht einen Nachweis, „verzichtet“ eine Begründung (422).

### HTTP-APIs der Website (Mutationen JSON + Origin)
- Backoffice Grundbuch: `GET, POST (201) /api/admin/grundbuch` · `GET /api/admin/grundbuch/auswahl` · `GET /api/admin/grundbuch/fristen` · `GET, PATCH /api/admin/grundbuch/[id]` · `POST /api/admin/grundbuch/[id]/schritt` · `POST /api/admin/grundbuch/[id]/signatur` (Bereiche `grundbuch` + `signatur` schreiben) · `POST /api/admin/grundbuch/[id]/dokumente` (multipart, `X-Plattform-Upload: 1`, PDF/JPG/PNG ≤ 10 MB)
- Portal Grundbuch (Eigentümer bzw. Backoffice): `GET /api/portal/grundbuch[?bezugArt=flaeche|anlage&bezugId=]` · `GET /api/portal/grundbuch/[id]` · `GET /api/portal/grundbuch/[id]/muster?vorlage=dienstbarkeit_freiflaeche|dachnutzung_servitut|rangruecktritt|loeschung_hinweis` (PDF) · `GET /api/portal/grundbuch/[id]/dokumente/[dok]`
- Backoffice Closing: `GET, POST (201) /api/admin/closing` · `GET, PATCH /api/admin/closing/[id]` · `POST /api/admin/closing/[id]/aktion`
- Portal Closing (Käufer/Verkäufer bzw. Backoffice): `GET /api/portal/closing` · `GET, POST /api/portal/closing/[id]` (`cp_melden`) · `GET /api/portal/closing/[id]/pdf?art=spa|bericht` · `GET /api/portal/closing/[id]/termin` (.ics)
- Seiten: `/portal/admin/grundbuch[?status=&land=]`, `/portal/admin/grundbuch/[id]`, `/portal/grundbuch[/id]`, `/portal/admin/closing[?status=]`, `/portal/admin/closing/[id]`, `/portal/closing[/id]`; Kurzanzeige an `/portal/flaechen/[id]`.

## Onboarding-Assistenten je Rolle und Untertyp (Team B1)

Deklarative Pfade: `src/lib/plattform/onboarding/pfade/*.js` (investor, verkaeufer, flaeche, kunde, kommune, mitglied, gutachter, lieferant, bank, backoffice), Auswertung `onboarding/motor.js`, Fakten aus echten Daten `server/onboarding.js`. Frappe: `plattform/onboarding_kern.py` + `plattform/onboarding_pfade.json` (Export: `node scripts/onboarding-pfade-export.mjs`), `plattform/api/onboarding.py`.

| Methode | Pfad | Rechte | Inhalt |
|---|---|---|---|
| GET | `/api/portal/onboarding` | angemeldet | `{ zustand (generischer Einstieg), liste (Checkliste = Schritte des aktiven Pfads), pfad: {id,titel,untertyp,untertypen,abgeschlossen,pflichtOffen,naechster} }` |
| GET | `/api/portal/onboarding?ansicht=assistent` | angemeldet | `{ pfade[{id,titel,text}], pfad (Auswertung: schritte[{id,titel,kurz,art,formular,text,punkte,links,pflicht,bestaetigbar,erledigt,spaeter}], erledigt, gesamt, quote, pflichtOffen, abschliessbar, abgeschlossen, naechster), pfadZustand }` – keine Rohfakten |
| GET | `/api/portal/onboarding?ansicht=tour` | angemeldet | `{ tour: { aus, gesehen[] } }` |
| PUT | `/api/portal/onboarding` | eigenes Konto, JSON + Origin | `{ aktion: pfad\|untertyp\|bestaetigen\|spaeter\|fortsetzen\|abschliessen\|tour, pfad?, untertyp?, schritt?, aus?, gesehen? }` → 403 fremder Pfad, 422 unbekannter/nicht bestätigbarer Schritt oder Untertyp (Backoffice: nur eigene Unterrolle), 409 Abschluss mit offenen Pflichtschritten (Meldung nennt sie). Ohne `aktion` wie bisher `{status,schritt,erledigt,checklisteAus}`. |
| GET | `/api/admin/onboarding` | Backoffice, Unterrolle Leitung (sonst 403) | `{ team: [{id,name,email,unterrollen,untertyp,erledigt,gesamt,quote,abgeschlossen,offen[{id,kurz,pflicht}],gestartetAm,letzterLogin}] }` |
| POST | `/api/admin/onboarding/lauf` | Leitung | Erinnerungslauf jetzt → `{ versendet }` (Frappe: `onboarding.mail_lauf_taeglich`, täglich) |

Zustand am Konto (Demo `nutzer.onboardingPfade`, Frappe `Plattform Konto.onboarding_pfade`): `{ aktiv, pfade: { <pfad>: { untertyp, bestaetigt[], spaeter[], gestartetAm, abgeschlossenAm } }, tour: { aus, gesehen[] }, mails: { willkommen, erinnerung3, erinnerung7 }, auswertung (Snapshot), aktualisiertAm }`.
Frappe-Methoden (`oekoinvest_app.plattform.api.onboarding`): `zustand`, `speichern(zustand, aktion, auswertung, protokollText)` (prüft Struktur erneut: `onboarding_kern.struktur_pruefen`), `mail(art, pfadTitel, offen)`, `team`, `mail_lauf`.
Rolle **`kommune`** (neu, selbst wählbar): Anfrage-Typ `kommune` → Rolle `kommune` (bisher `unternehmen`); Frappe-Rolle „Plattform Kommune“; Patch `oekoinvest_app.patches.kommune_rolle` migriert Konten mit kommunalem Anliegen.
