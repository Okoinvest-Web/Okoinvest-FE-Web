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
- Der API-Nutzer hat in Frappe **nur** die Rolle `Plattform API`. Jede Methode prüft zuerst `"Plattform API" in frappe.get_roles()`.
- **Handeln im Namen eines Nutzers:** Alle Methoden außer den mit „öffentlich“ markierten bekommen `als_benutzer` (Frappe-`User.name`, bei uns die E-Mail-Adresse). Die Methode führt dann `frappe.set_user(als_benutzer)` aus (nur erlaubt, wenn der Aufrufer `Plattform API` hat) und prüft **selbst** Rolle und Eigentum. Die Website prüft vorab ebenfalls – Frappe ist die maßgebliche Instanz.
- Argumente und Antworten in **camelCase-JSON**, identisch zu den Objekten unten. Frappe-DocType-Felder sind snake_case; Umrechnung in der App (`zu_json()`/`von_json()`).
- Antwort: `{"message": <Ergebnis>}`.
- Fehler: `frappe.throw(msg, exc)` mit
  - `frappe.PermissionError` → HTTP 403 (Website zeigt `msg`)
  - `frappe.DoesNotExistError` → 404
  - `frappe.ValidationError` / `MandatoryError` → 417 (Website macht 422 daraus, zeigt `msg`)
  - `frappe.DuplicateEntryError` → 409 (z. B. E-Mail vergeben, verbotener Statuswechsel)
  - `frappe.AuthenticationError` → 401
  Meldungen sind **deutsch, für Endnutzer**, ohne Interna. Tracebacks bleiben im Frappe-Log.
- Zeiten ISO 8601 in UTC (`2026-09-29T05:57:00.000Z`). Geldbeträge in EUR als Zahl. Prozentsätze als Dezimalbruch (`0.02` = 2 %).
- Kennungen: `U-26-XXXXXX` Nutzer, `V-` Vorgang, `F-` Fläche, `P-` Projekt, `I-` Interesse, `PV-` Provision, `D-` Dokument, `M-` Nachricht, `A-` Aktivität. Frappe kann eigene Naming-Series nutzen, solange das Format `^[A-Z]{1,3}-[0-9A-Z-]{4,40}$` erfüllt ist (die Website validiert Kennungen so).

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

**Eigentum**
- Vorgang: `nutzerId` · Fläche: `nutzerId` · Projekt: `anbieterId` · Interesse: `investorId` · Provision: `anbieterId` (lesen nur Admin) · Thread „nutzer“: der Nutzer selbst.

## 3. Datenmodell (DocTypes)

Alle DocTypes mit `track_changes = 1`. Felder in camelCase (JSON) → snake_case (DocType).

### Plattform Konto (Erweiterung von `User` oder eigener DocType mit Link auf `User`)
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

Passwort: Frappe-Standard (`frappe.utils.password`). Nie im JSON ausgeben.

### Suchprofil (JSON am Konto)
`{ mwpMin, mwpMax, phasen: [phaseId], laender: ["DE"|"AT"|"CH"], typen: [projektTyp], ticketMin, ticketMax, benachrichtigen: bool }`
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
`id, nutzerId, vorgangId, bezeichnung, land (DE|AT|CH), bundesland, plz, ort, gemarkung, flurstuecke [{gemarkung, flur, nummer}], ha, nutzung (acker|gruenland|konversion|gewerbe|sonstige), agri (Check), eigentum (eigentum|miteigentum|verwaltung), hinweise, status, statusVerlauf, pachtangebot {euroProHaJahr, laufzeitJahre, verlaengerung, text, am}, ablehnGrund, zustaendigId, erstelltAm, geaendertAm`
Ausgabe zusätzlich: `zustaendig {id, vorname, nachname, email, firma}`, `dokumente` (Anzahl), für Admin `eigentuemer {…}`.

### Plattform Projekt
| Feld | Öffentlich | Hinweis |
|---|---|---|
| id, slug | ja | slug = `slugify(titel)-<letzte 4 Zeichen der ID>`, fix nach erster Veröffentlichung |
| titel | ja | anonym (keine Gemeinde) |
| typ | ja | `freiflaeche, agri, carport, speicher, hybrid` |
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
Ausgabe für Eigentümer/Admin zusätzlich: `statistik {aufrufe, merker, ndaAnfragen, lois}`, `dokumente` (Anzahl), `provision` (falls verkauft); Admin: `anbieter {…}`, `zustaendig {…}`.

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
`id, bezugArt, bezugId, name, mime (application/pdf|image/jpeg|image/png), groesse, datei (privates File), kategorie (allgemein|datenraum|vertrag|plan), hochgeladenVon, am, sha256`
Dateien **privat** (`is_private = 1`). Größe ≤ 10 MB, Typ an den ersten Bytes geprüft (die Website prüft vorab, Frappe prüft erneut).

### Plattform Aktivität (append-only)
`id, am, nutzerId, aktion, objektArt, objektId, text, ip` – Login, Registrierung, Anfrage, Status, NDA, Upload, Download, Zuweisung, Nutzeränderung. Kein Update/Delete.

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
5. Projekt → `veroeffentlicht`: `veroeffentlichtAm` setzen (einmalig); Investoren mit `suchprofil.benachrichtigen` und Matching-Score ≥ 70 erhalten eine System-Nachricht im Thread `nutzer` (Score: `src/lib/plattform/matching.js`).
6. Dokument-Upload erzeugt eine System-Nachricht „Dokument hochgeladen: <name>“ im Thread des Bezugs.

## 5. Frappe-Methoden

`n` = Nutzer aus `als_benutzer`. „Recht“ = zusätzlich zu `Plattform API`.

### auth
| Methode | Argumente | Ergebnis | Recht |
|---|---|---|---|
| `auth.anmelden` | `email, passwort` | Konto (ohne Hash) oder `null` bei falschen Daten/gesperrt | öffentlich; setzt `letzterLogin`, verknüpft Vorgänge (s. u.), Aktivität |
| `auth.nutzer_fuer_sitzung` | `nutzerId` | Konto inkl. `sitzungVersion`, `aktiv` oder `null` | öffentlich (nur API-Nutzer) |
| `auth.registrieren` | `email, passwort, vorname, nachname, firma?, telefon?, rollen[], vorgangId?, basisUrl, ip` | `{nutzer, vorgangVerknuepft: id|null}` | öffentlich; Passwortregel: ≥ 10 Zeichen, Buchstabe + Ziffer/Sonderzeichen; `admin` nie; E-Mail vergeben → 409. Vorgang sofort verknüpfen, wenn `vorgangId` existiert, noch kein Konto hat **und** die E-Mail übereinstimmt. Bestätigungsmail mit Link `{basisUrl}/api/auth/email-bestaetigen?token=…` (72 h). Willkommens-System-Nachricht im Thread `nutzer`. |
| `auth.email_bestaetigen` | `token` | Konto | öffentlich; `emailBestaetigt = 1`, dann **Verknüpfung**: alle Vorgänge ohne Konto mit gleicher E-Mail → `nutzerId`, zugehörige Flächen ebenso; passende Rolle (`ROLLE_FUER_TYP`) ergänzen |
| `auth.passwort_vergessen` | `email, basisUrl, ip` | `{ok: true}` immer | öffentlich; nur bei aktivem Konto Mail mit `{basisUrl}/passwort-vergessen?token=…` (1 h) |
| `auth.passwort_setzen` | `token, passwort, ip` | Konto | öffentlich; `sitzungVersion + 1`, `emailBestaetigt = 1`, Verknüpfung wie oben |

`basisUrl` kommt in Produktion aus `PLATTFORM_BASIS_URL` (nie aus dem Host-Header).

### konto
| `konto.passwort_aendern` | `alt, neu` | Konto | eigenes Konto; `sitzungVersion + 1` |
| `konto.profil_speichern` | `daten {vorname, nachname, firma, telefon, rollen?}` | Konto | eigenes Konto; `admin` bleibt erhalten, wird nie ergänzt |
| `konto.suchprofil_speichern` | `profil` | Suchprofil | Rolle investor |

### anfrage
| `anfrage.anlegen` | `typ, kontakt, daten, herkunft, ip, einwilligungText` (+ optional `als_benutzer`) | `{id, vorgang {id, typ, status, flaecheId}}` | öffentlich. Pflicht: Vor-/Nachname, gültige E-Mail, bekannter Typ. Bei typ `flaeche`/`agri` zusätzlich Fläche im Status `entwurf` (ha aus `daten.ha|hektar|flaeche|flaecheHa`). Ist `als_benutzer` gesetzt **und** stimmt dessen bestätigte E-Mail mit `kontakt.email` überein → sofort `nutzerId`. |

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
| `interesse.merken` | `projektId, an` | Interesse | Rolle investor; Projekt sichtbar |
| `interesse.nda_anfragen` | `projektId, akzeptiert, ip, userAgent` | Interesse | Rolle investor, nicht eigenes Projekt; idempotent (bereits angefragt → unverändert); `akzeptiert` Pflicht; speichert `nda {version, am, ip, userAgent}` |
| `interesse.liste` | `alle?, status? (String oder Liste), projektId?` | Interessen | eigene (investor); `alle` nur admin |

### prozess
| `prozess.status_wechsel` | `art, id, nach, als (admin|eigentuemer), extra {…}, ip` | Objekt | `als = admin` → Rolle admin; `als = eigentuemer` → Eigentum. Prüfung nach Abschnitt 4. `interesse → nda_angefragt` hier verboten (nur `nda_anfragen`). |

### nachricht
| `nachricht.threads` | – | `[{bezugArt, bezugId, titel, link, gegenueber, anzahl, ungelesen, letzte {text, am, vonAdmin, system}}]` | eigene Threads; admin alle. `ungelesen` aus Sicht des Aufrufers (admin: `gelesenAdmin`, sonst `gelesenNutzer`). |
| `nachricht.liste` | `bezugArt, bezugId, markieren` | `{titel, link, gegenueber, bezugArt, bezugId, nachrichten [{id, text, am, system, vonAdmin, eigene, vonName, neu}]}` | Eigentümer des Bezugs oder admin; markiert gelesen |
| `nachricht.senden` | `bezugArt, bezugId, text` | `{id, am}` | Eigentümer des Bezugs oder admin (dann `vonAdmin = 1`); 2–5000 Zeichen |

### dokument
| `dokument.liste` | `bezugArt?, bezugId?` | Metadaten (+ `bezugTitel`, `bezugLink`) | ohne Bezug: Dokumente an eigenen Objekten bzw. eigene Uploads; admin alle |
| `dokument.lesen` | `id` | `{meta, inhaltBase64}` | admin; Uploader; Eigentümer des Bezugs; bei Projekt + Kategorie `datenraum`: Investor mit Interesse in `nda_freigegeben, loi_abgegeben, loi_angenommen, abgeschlossen`. Jeder Zugriff → Aktivität „Download“. |
| `dokument.speichern` | `bezugArt, bezugId, name, mime, kategorie, inhaltBase64` | Metadaten | Eigentümer des Bezugs oder admin; Typ/Größe prüfen; `datenraum` nur für Projekte |
| `dokument.loeschen` | `id` | `{ok}` | Uploader oder admin |

### admin (alle nur Rolle admin)
| `admin.zuweisen` | `art, id, zustaendigId|null` | `{id, zustaendigId}` | Zuständige nur aktive Admin-Konten |
| `admin.nutzer_liste` | `q?, rolle?` | Konten + `zaehler {vorgaenge, flaechen, projekte, interessen}` | |
| `admin.nutzer_aendern` | `id, rollen?, aktiv?` | Konto | eigenes Admin-Recht nicht entfernbar, eigenes Konto nicht sperrbar (409); Sperren → `sitzungVersion + 1` |
| `admin.provisionen` | – | Provisionen + `projekt`, `anbieter`, `investor` | |
| `admin.aktivitaeten` | `limit ≤ 500, objektId?` | Aktivitäten (neueste zuerst) + `nutzer` (Name) | |
| `admin.admin_konten` | – | aktive Admin-Konten (kurz) | |
| `admin.uebersicht` | – | Kennzahlen (siehe `adminUebersicht` in demo.js): `vorgaenge {gesamt, neu7, offen, ohneZustaendig, status{}, typ{}, trichter[]}`, `flaechen {gesamt, ha, status{}, trichter[]}`, `projekte {gesamt, inPruefung, mwpBoerse, status{}}`, `interessen {status{}, ndaOffen, loiOffen, trichter[]}`, `provisionen {anzahl, offen, bezahlt}`, `nutzer {gesamt, rollen{}}`, `nachrichten {ungelesen}` | |

`demoLinks` gibt es nur im Demo-Backend (im Frappe-Adapter liefert es `[]`).

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
| `/api/portal/suchprofil` | PUT | investor | Suchprofil | `{ok, suchprofil}` |
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
| `/api/admin/aktivitaeten` | GET | admin | `limit, objekt` | `{ok, aktivitaeten}` |
| `/api/admin/demo-links` | GET | admin | | `{ok, links}` (nur Demo) |

Statuscodes: 401 nicht angemeldet · 403 Rolle/Eigentum/Herkunft · 404 · 409 Konflikt/Übergang nicht vorgesehen · 413 zu groß · 415 falscher Typ · 422 Validierung/Pflichtangabe · 429 Rate-Limit · 502 Backend nicht erreichbar · 503 Backend nicht konfiguriert.
