# Plattform-Armee – Prüfberichte der Pakete

## ROLLEN

PRÜFBERICHT – Paket ROLLEN (unabhängige Prüfung): **BESTANDEN**

**1) Behauptete Fixes verifiziert (Code, Tests, Browser)**
- Commit `44722e1` umfasst exakt die zwei genannten Dateien, nichts Fremdes.
- `C:\Users\SALEADMIN\Downloads\Oekoinvest-Web\src\app\(stamm)\portal\page.js`: Alle sechs neuen Backend-Aufrufe gegen die Demo-Implementierungen geprüft – Methoden und Datenformen stimmen (`fzBankMeine` → `anfragen[].status` mit genau den gefilterten Werten offen/in_pruefung/termsheet/ausgewaehlt; `gaMeine` → `kennzahlen.anfragen/laufend`; `energieAusschreibungen` (Lieferant) → Array mit `darfBieten`/`los`; `mgUebersicht` → `mitgliedschaften`/`versammlungen[].darfAbstimmen`; `kommuneUebersicht` → `gemeinden`/`geprueft`; `anlagen` → Array). Jeder Aufruf nur bei vorhandener Rolle und mit `.catch(() => null)`; Lieferant ohne Datensatz wirft `verboten()` → sauber abgefangen, Kachel entfällt.
- `rollen-abdeckung.test.mjs`: 4/4 Tests grün (`node --test`).
- Browser-Nachstellung mit eigenem Playwright-Login (lieferant@example.com, Demo-Backend, localhost:3100): Übersicht rendert, Kachel „Angebotsanfragen 3“ vorhanden – deckungsgleich mit dem Team-Screenshot. Eigener Beleg: `C:\Users\SALEAD~1\AppData\Local\Temp\claude\c--Users-SALEADMIN-Downloads-Oekoinvest-Web\3140c08a-2721-4ee9-a47f-9fce6660cd23\scratchpad\lieferant_portal_pruefer.png`. Team-Screenshots (25 Stück) unter `C:\Users\SALEADMIN\claude-browser\shots-rollen\` vorhanden und plausibel (mitglied_portal.png zeigt Prio-1-Schritt „Abstimmung offen“ + Kachel „Mitgliedschaften“).

**2) Nichts kaputtgemacht**
- `npm test`: 850/850 grün (135 s).
- `npx eslint` auf beiden geänderten Dateien: 0 Befunde.

**3) Sicherheitsregeln eingehalten**
- Keine neuen Abhängigkeiten (package.json unberührt), keine Geheimnisse (nur die bekannten Demo-Zugänge), nur Demo-Backend, Dev-Server nicht angefasst, kein verify/build. Uncommittete Dateien anderer Pakete (rechte.js, sicherheit.*, Backend-Import, Pentest) unverändert gelassen – korrekt.

**4) Abweichungen/Anmerkungen (kein Handlungsbedarf)**
- Berichts-Ungenauigkeit (NIEDRIG): Der Prio-1-Schritt „Angebotsrunde offen“ (Lieferant) ist im aktuellen Demo-Datenbestand nicht sichtbar („keine offene Runde“ – die Seed-Frist `inTagen(6)` ist im persistierten Demo-Stand abgelaufen; frischer Seed zeigt ihn). Der Codepfad ist korrekt; auch der Team-Screenshot zeigt denselben Zustand. Keine Behebung nötig; bei Demo-Reset wieder sichtbar.
- Ebenso zeigt gutachter_portal.png „Alles erledigt“ (0 offene Angebotsanfragen im Seed) – konsistent mit `gaMeine`, kein Fehler.
- Die drei dokumentierten Großvorhaben (rollenspezifische Startseiten, Kommune-Rückrufschritt, Kachel-Priorisierung bei `slice(0,4)`) sind als Vorschläge korrekt belassen.

**5) Offen**
- Nichts aus diesem Paket. Hydration-Warnung `/portal/admin/anlagen` bleibt wie notiert beim Paket Betrieb/UI zur Beobachtung.

Dateiliste (geprüft, unverändert übernommen): `src/app/(stamm)/portal/page.js`, `src/lib/plattform/rollen-abdeckung.test.mjs` (beide in Commit `44722e1`). Eigene Änderungen: keine erforderlich.

## RECHTE

PRÜFBERICHT – PAKET RECHTE (unabhängige Prüfung)

**Gesamturteil: BESTANDEN.** Alle behaupteten Fixes sind im Code vorhanden, korrekt und durch Tests gedeckt; nichts kaputtgemacht; Sicherheitsregeln eingehalten. Ein offener Punkt bleibt (Freigabesteuerung verwehrt den Lauf auch mir).

**1) Verifizierte Behauptungen (alle bestätigt)**
- `Backend-Import/oekoinvest_app/oekoinvest_app/plattform/rechte.py`: `ROLLEN_LABEL` mit allen 10 Unterrollen vorhanden; `BACKOFFICE_ROLLEN` endet nach den Appends (projektleitung, energie, eg) tatsächlich bei 10 Rollen – der frühere KeyError in `api/berichte.py` (hartes 5-Rollen-Dict) war real und ist behoben (`ROLLEN_LABEL.get(r, r)` mit Fallback). Labels identisch mit `rechte.js` (Zeile für Zeile verglichen). `py_compile` auf alle 3 geänderten Python-Dateien: OK.
- `Backend-Import/werkzeuge/pruefen.py`: **0 Fehler**, „Rechte-Bereiche JS = Python: 40“ – Matrix-Parität JS↔Python vom projekteigenen Prüfer bestätigt.
- `Backend-Import/werkzeuge/desk_rechte.py`: die 3 Lead-Ketten-DocTypes (`Plattform Bericht` nur Admin lesend, `Plattform Lead Person` und `Plattform Einwilligung Protokoll` Admin+Compliance lesend) sind in der Matrix, restriktiv wie behauptet.
- `src/lib/plattform/rechte.js`: `leads: "vorgaenge"` und `kanaele: "berichte"` in `API_BEREICH` ergänzt (Zeilen 212–213), konsistent zur Seiten-Zuordnung.
- `src/lib/plattform/rechte.test.mjs`: 12 Tests, **12/12 grün** (`node --test`), decken Matrix-Invarianten, Least Privilege, apiAnforderungen inkl. leads/kanaele ab. `npx eslint` auf rechte.js und rechte.test.mjs: **0 Befunde**.
- Durchsetzungs-Behauptung stichprobenhaft nachgezogen: alle **264** route.js-Dateien unter `src/app/api/admin/**` setzen `admin: true` (264/264, keine Ausnahme).

**2) Nichts kaputtgemacht**
- `npm test`: **850/850 grün** (inkl. der 12 neuen Rechte-Tests), 0 fail.
- Die übrigen Diffs im Arbeitsbaum (`api/sicherheit.py`, `demo/sicherheit.js`, `server/route.js` Byte-Längen-Fix, `scripts/plattform-test-security-pen.mjs`, `qa/pentest-2026-10.md`) stammen vom parallelen Paket SECURITY, nicht vom Rechte-Team – keine Paketgrenzen verletzt.

**3) Sicherheitsregeln**
- Keine neuen npm-Abhängigkeiten, keine Geheimnisse in den geänderten Dateien, nur Demo-/Lokalpfade, Dev-Server nicht angefasst, kein `npm run verify`. Eingehalten.

**4) Von mir behoben/nachgezogen**
- Nichts zu beheben nötig – alle Fixes waren korrekt. Keine zusätzlichen Dateien geändert.

**5) Offen / Einschränkungen**
- `python Backend-Import/werkzeuge/desk_rechte.py --anwenden` (normalisiert die permissions-Blöcke der 3 DocType-JSONs): **auch mir von der Freigabesteuerung verwehrt** – muss der Inhaber bzw. ein Lauf mit Freigabe einmal ausführen. Bis dahin meldet `pruefen.py` 3 Warnungen „Rechte weichen von der Matrix ab“ (keine Fehler). Werkzeug geprüft: reine Stdlib, schreibt nur lokale JSONs – unbedenklich.
- Live-Nachstellung im Browser/per HTTP gegen das Demo-Backend war in dieser Sitzung durch die Freigabesteuerung blockiert (HTTP-Aufrufe verweigert); die Live-Behauptungen des Teams (35 Prüfungen, Mandantentrennung, 403-Verhalten) konnte ich daher nur per Code-Lektüre und Testsuite plausibilisieren, nicht selbst gegen localhost:3100 wiederholen.
- Vorschläge des Teams (Vier-Augen bei SEPA, Vier-Augen bei Rechtevergabe, veraltete Kanal-Erwartungen in `plattform-test-backoffice.mjs`) bleiben als Doku-Vorschläge für die Pakete BUCHHALTUNG/QM bestehen – korrekt nicht im Code umgesetzt.
- `pruefen.py` meldet zusätzlich (vorbestehend, Paket ÜBERSETZUNG/QM): 11 Begriffe ohne Übersetzung in de.csv.
- Kein Commit angelegt (sammelt der QM des Workflows).

**Dateiliste (geprüft, Stand bestätigt):**
- C:\Users\SALEADMIN\Downloads\Oekoinvest-Web\Backend-Import\oekoinvest_app\oekoinvest_app\plattform\rechte.py
- C:\Users\SALEADMIN\Downloads\Oekoinvest-Web\Backend-Import\oekoinvest_app\oekoinvest_app\plattform\api\berichte.py
- C:\Users\SALEADMIN\Downloads\Oekoinvest-Web\Backend-Import\werkzeuge\desk_rechte.py
- C:\Users\SALEADMIN\Downloads\Oekoinvest-Web\src\lib\plattform\rechte.js
- C:\Users\SALEADMIN\Downloads\Oekoinvest-Web\src\lib\plattform\rechte.test.mjs (neu)

## SECURITY

PRÜFBERICHT PAKET SECURITY (unabhängige Prüfung) – **BESTANDEN mit einem nachgezogenen Befund (behoben)**

**1) Geprüfte Bereiche**
- Behauptete Fixes per Code-Lektüre verifiziert (Diffs in `src/lib/plattform/backend/demo/sicherheit.js`, `src/lib/plattform/server/route.js`, `Backend-Import/oekoinvest_app/oekoinvest_app/plattform/api/sicherheit.py`) und live gegen das Demo-Backend (http://localhost:3100) nachgestellt.
- S1-Fix fachlich korrekt: `sperrePruefen` vor der Prüfung, Fehlversuch wird rollback-sicher gebucht (Demo: Rückgabe `{fehlversuch:true}` aus `aendern`, Wurf danach; Frappe: `festschreiben()` vor `frappe.throw`). Sperre greift auch für den Login und hat Vorrang vor richtigem Code – im Test bestätigt.
- S2-Fix korrekt: `Buffer.byteLength`-Prüfung in `jsonLesen()`; Chunked-Anfrage mit 80 KB UTF-8 → 413 live bestätigt.
- Vollständigkeitsprüfung: alle verbleibenden Passwort-/Code-Prüfstellen in beiden Backends gesucht und bewertet (Login-2FA-Schritt zählt bereits; `zweiFaktorPruefen`/`zwei_faktor_pruefen` ok).
- Sicherheitsregeln: eingehalten – nur localhost/Demo, Testkonten `pen-…@example.com`, keine neuen Abhängigkeiten (nur `node:crypto`/fetch), keine Geheimnisse (Passwörter laufzeitgeneriert), `qa/pentest-2026-10.md` ohne Exploit-Anleitungen, Dev-Server nicht angefasst, kein `npm run verify`.

**2) Gefundene Lücken**
- **S1a (mittel):** Das Fachteam hat beim S1-Fix die sensible Aktion **„Passwort ändern“** übersehen (`POST /api/portal/passwort`): Falsche alte Passwörter zählten weiterhin nicht zur Kontosperre – identisch in `src/lib/plattform/backend/demo.js` (`passwortAendern`) und `Backend-Import/.../plattform/api/konto.py` (`passwort_aendern`). Gleiche Angriffsklasse wie S1 (Passwort-Raten aus gekaperter Sitzung).
- Sonst nichts: keine Regressionen, keine Regelverstöße des Teams.

**3) Direkt behoben (Dateien)**
- `C:\Users\SALEADMIN\Downloads\Oekoinvest-Web\src\lib\plattform\backend\demo.js` – S1a: `sperrePruefen` + Fehlversuchsbuchung in `passwortAendern` (minimal-invasiv; gemeinsame Datei vorher frisch gelesen).
- `C:\Users\SALEADMIN\Downloads\Oekoinvest-Web\Backend-Import\oekoinvest_app\oekoinvest_app\plattform\api\konto.py` – S1a spiegelbildlich (`s.sperre_pruefen`, `s.fehlversuch_buchen` + `s.festschreiben()`), `py_compile` grün.
- `C:\Users\SALEADMIN\Downloads\Oekoinvest-Web\scripts\plattform-test-security-pen.mjs` – 2 neue Regressionstests (jetzt 20).
- `C:\Users\SALEADMIN\Downloads\Oekoinvest-Web\qa\pentest-2026-10.md` – Befund S1a nachgetragen, Prüfzahl aktualisiert.

**Testläufe (alle grün):** `npm test` 850/850 (zweimal, vor und nach meinem Fix) · `scripts/plattform-test-sicherheit.mjs` 118/118 · `scripts/plattform-test-security-pen.mjs` 20/20 · `npx eslint` auf allen geänderten Dateien sauber · `python -m py_compile` auf beiden Python-Dateien ok.

**4) Vorschläge für große Vorhaben** (Team-Vorschläge geprüft und bestätigt, nichts hinzuzufügen)
- V1 vollständige CSP mit Nonces als eigenes Paket vor Go-live – sinnvoll, korrekt als groß eingestuft.
- H3 Rate-Limits zusätzlich am Reverse-Proxy – in den Go-live-Plan.

**5) Offene Inhaberpunkte** (unverändert vom Fachteam, bestätigt)
- H2: Entscheidung Rechtsabteilung zu vollen IP-Adressen in der append-only-Hash-Kette (`ipGrob` für Nicht-Nachweis-Einträge?).
- Vor Go-live: `SESSION_SECRET` (≥ 32 Zeichen), `PLATTFORM_2FA_SCHLUESSEL`, `TRUSTED_PROXY_HOPS`, optional `PLATTFORM_HIBP=1`, `PLATTFORM_2FA_PFLICHT=admin`.
- Hinweis: Frappe-Backend weiterhin nur per Code-Lektüre + `py_compile` geprüft (keine Bench vorhanden) – vor Produktivgang einmal gegen eine echte Bench testen.
- Kein Commit angelegt (macht laut Workflow der QM); alle Änderungen liegen im Arbeitsverzeichnis. Die Pen-Testläufe haben `pen-…@example.com`-Testkonten in der Demo-Datei hinterlassen (Seed-Konten unverändert).

## API

PRÜFBERICHT – Paket API (unabhängige Prüfung): **BESTANDEN**, nichts nachzubessern.

**1) Behauptete Fixes verifiziert**
- `scripts/api-register.mjs`: gelesen – reiner Sammler (fs/path, keine erfundene Semantik, Beschreibungen aus route.js-Kopfzeilen), nur Node-Bordmittel.
- `docs/API-REGISTER.md`: existiert, zählt exakt 502 Routen und 660 Frappe-Methoden (stichprobengeprüft, Zählung per grep bestätigt); Test 1 bestätigt, dass es dem Generator-Output entspricht (nicht veraltet).
- `src/lib/plattform/api-vertrag.test.mjs`: alle 7 Tests grün (`node --test`), Prüflogik gelesen – prüft echt (Register-Diff, Adapter→Python-Whitelist, Doku-Methoden, Doku-Routen, Operationen in Demo- UND Frappe-Baum, Fehlercodes, Rate-Limit-Namen), rein statisch, kein Alias-Loader nötig.
- `docs/API.md`: Diff rein additiv (51 Zeilen, 0 Löschungen, nach „Statuscodes“). Inhalt gegen Code geprüft: Rate-Limit-Tabelle stimmt 1:1 mit `server/rateLimit.js` (inkl. Dev-Faktor 10 via `PLATTFORM_RATE_FAKTOR`, `loginEmail` je E-Mail, Suche 120/min je Nutzer in `src/app/api/portal/suche/route.js`, kein Retry-After); Fehlerform live nachgestellt: `GET /api/portal/suche` ohne Anmeldung → 401 `{"ok":false,"error":"Bitte melden Sie sich an.","code":"nicht_angemeldet"}` mit `Cache-Control: no-store` – exakt wie dokumentiert; Sondercodes (`herkunft`, `kyc`, `bonitaet`, `kontingent`, `zwei_faktor_pflicht`, `gesperrt`, `newsletter_aus`) im Code vorhanden; Newsletter-Ausnahme bestätigt (`backend/newsletter.js`: außerhalb Demo 503 `newsletter_aus`, TODO-Kommentar wie berichtet, `FRAPPE_SPAETER` im Test deckungsgleich mit `NEWSLETTER_OPERATIONEN`).

**2) Nichts kaputtgemacht**
- `npm test`: 857 Tests, 0 Fehler (vorher 834 + die 7 neuen + weitere parallele Pakete) – die neuen Tests laufen im Glob mit.
- `npx eslint` auf beide neuen JS-Dateien: 0 Befunde.
- Dev-Server läuft weiter (Startseite 200), nicht angefasst.

**3) Sicherheitsregeln eingehalten**
- Keine neuen Abhängigkeiten (`package.json`/`package-lock.json` unverändert), keine Geheimnisse in den neuen Dateien, Python nur gelesen (keine .py-Änderung durch dieses Paket – die modifizierten .py im git status stammen von anderen Paketen), alles Demo-only/lokal.

**4) Nachgezogen / behoben:** nichts nötig – keine Lücke gefunden.

**5) Offen (unverändert aus dem Fachbericht, korrekt als Vorhaben eingestuft):** feld-genaue Demo↔Frappe-Paritätsprüfung, prozessübergreifendes Rate-Limiting vor Livegang, Frappe-Newsletter-Spiegel nach Wahl des Versanddienstes.

Geprüfte/relevante Dateien: `C:\Users\SALEADMIN\Downloads\Oekoinvest-Web\scripts\api-register.mjs`, `C:\Users\SALEADMIN\Downloads\Oekoinvest-Web\docs\API-REGISTER.md`, `C:\Users\SALEADMIN\Downloads\Oekoinvest-Web\src\lib\plattform\api-vertrag.test.mjs`, `C:\Users\SALEADMIN\Downloads\Oekoinvest-Web\docs\API.md`, gegengelesen: `src\lib\plattform\fehler.js`, `src\lib\plattform\server\rateLimit.js`, `src\lib\plattform\backend\newsletter.js`, `src\app\api\portal\suche\route.js`. Commit-Vorschlag des Teams („API-Vertrag: Register, Konsistenz-Test und Regeln für Fehler, Rate-Limits und Kompatibilität“) ist passend; Commit macht laut Workflow der QM.

## FRAPPE

Alle Prüfungen abgeschlossen.

# Prüfbericht Paket FRAPPE – Ergebnis: **bestanden** (mit einer kleinen Nachbesserung)

## 1) Behauptete Fixes nachvollzogen – bestätigt

- **Rechte-Matrix Lead-Kette:** `git diff` der drei DocType-JSONs zeigt genau die Angleichung an die Matrix in `Backend-Import/werkzeuge/desk_rechte.py` (Stufe `L` = read+report+print; Zeile 392 setzt `print=1`). Konkret wurde je Rolle nur `print 0→1` gesetzt – alle Schreib-/Lösch-/Export-Rechte stehen auf 0, Rollen wie behauptet: Plattform Bericht nur `ÖkoInvest Admin`, Lead Person und Einwilligung Protokoll `Admin + Compliance`. Dry-Run `python desk_rechte.py` → **„0 DocType(s) abweichend“**.
- **Übersetzungen:** 11 neue Schlüssel in `translations/de.csv` (abmeldelink, art17_loeschung, doi, flaechencheck, in_bestaetigung, …) vorhanden und plausibel.
- **Konsistenzprüfer:** `python -I Backend-Import/werkzeuge/pruefen.py` → **0 Fehler, 0 Warnungen** (225 DocTypes, 40 Rechte-Bereiche JS=Python).
- **compileall:** komplettes `plattform`-Paket fehlerfrei.
- **Unit-Tests:** Die Team-Angabe „7 Stub-fähige Module / 87 Tests“ war zu konservativ – tatsächlich sind **35 Testmodule** ohne Frappe importierbar. Alle ausgeführt: **369 Tests grün, 1 Skip, 0 Fehler**. Kein Widerspruch zum Bericht, nur untertrieben.

## 2) Nichts kaputtgemacht

- `npm test` → **857 Tests grün, 0 fail** (inkl. Rechner-Selbsttests und der neuen `rechte.test.mjs`). Das FRAPPE-Team hat keine JS-Dateien angefasst (die JS-Änderungen im Arbeitsbaum stammen vom SECURITY-Paket), daher kein gesonderter eslint-Lauf nötig.
- Browser-Nachstellung entfällt begründet: Die Änderungen betreffen nur Desk-Rechte-JSONs und Desk-Übersetzungen; Frappe läuft hier nicht, das Portal/Demo-Backend ist unberührt (durch npm test abgedeckt).

## 3) Sicherheitsregeln eingehalten

- Keine neuen Abhängigkeiten (`package.json` unverändert), keine bench-Kommandos, nur lokale Dateien.
- Geheimnis-Scan über den gesamten Diff: nur Code-Bezeichner (z. B. `check_password`), keine Tokens/Secrets.
- Die Rechte-Änderung ist restriktiv (reine Lese-/Druckrechte), keine Rechteausweitung über die Matrix hinaus.

## 4) Von mir direkt behoben

- **Doppelter Übersetzungsschlüssel** `gruen` (identischer Wert „Grün“, vorbestehend, Zeilen 333+410) dedupliziert:
  `C:\Users\SALEADMIN\Downloads\Oekoinvest-Web\Backend-Import\oekoinvest_app\oekoinvest_app\translations\de.csv`
  Nachweis: keine Duplikate mehr, `pruefen.py` weiterhin 0/0, de.csv jetzt 860 Übersetzungen.

## 5) Offen (bestätigt aus dem Teambericht, nichts Neues)

- Commit-Hinweis bleibt gültig: die drei DocType-JSONs + de.csv gehören mit den uncommitteten SECURITY-Dateien (`api/sicherheit.py`, `rechte.py`, `desk_rechte.py`, `src/lib/plattform/...`) fachlich in einen gemeinsamen Commit (macht der QM/Workflow).
- Optional: `jinja2` in der Prüfumgebung installieren (pruefen.py meldet „einfache Blockprüfung“).
- N+1-Vorschlag und PII-Versionierungs-Doku des Teams: sinnvoll, korrekt als Nur-Vorschlag belassen (braucht laufende Bench).

**Geprüfte/angefasste Dateien:**
- Geprüft: `Backend-Import/.../doctype/plattform_bericht/plattform_bericht.json`, `.../plattform_einwilligung_protokoll/plattform_einwilligung_protokoll.json`, `.../plattform_lead_person/plattform_lead_person.json`, `Backend-Import/werkzeuge/desk_rechte.py`, `Backend-Import/werkzeuge/pruefen.py`, gesamter Diff
- Geändert: `Backend-Import/oekoinvest_app/oekoinvest_app/translations/de.csv` (1 Duplikatzeile entfernt)

## DB

PRÜFBERICHT – Paket DB (Datenbank und Datenqualität) – unabhängige Prüfung

**Ergebnis: BESTANDEN mit 1 behobenem Fehler (Migrationswirksamkeit der Index-Flags)**

**1) Behauptete Fixes geprüft**
- `Backend-Import/oekoinvest_app/oekoinvest_app/plattform/aufbewahrung.py`: BESTÄTIGT. `vorgaenge_anonymisieren` löscht `Plattform Lead Person` je `vorgang_id` mit (get_all mit `pluck="name"` – korrekt); neue Funktion `lead_personen_verwaiste` (LEFT JOIN auf Vorgang, fängt gelöschte und bereits anonymisierte Vorgänge) ist im Tagesjob `taeglich()` verdrahtet. SQL-Parameter (`in %s` mit Tupel) ist pymysql-konform. `python -m py_compile` grün.
- `src/lib/plattform/validierung.js` (`plzLand`): BESTÄTIGT. DE `^\d{5}$` (führende 0 erlaubt, korrekt für Dresden), AT/CH `^[1-9]\d{3}$`, unbekanntes Land → generischer Fallback. In `demo.js` → `flaecheDaten` korrekt mit festem `land` eingebunden; Lead-Eingang unverändert.
- `src/lib/plattform/validierung.plz.test.mjs`: 5 Tests vorhanden und grün – aber NUR über den Projekt-Runner (`npm test` nutzt den Loader `test/hilfen/registrieren.mjs` für endungslose Importe); nacktes `node --test <datei>` schlägt mit ERR_MODULE_NOT_FOUND (`./fehler`) fehl. Kein Fehler, nur Hinweis für künftige Teams.
- 29 DocType-JSONs mit `search_index`/`in_standard_filter`: Flags vorhanden, alle 225 JSONs parsen.

**2) Gefundener Fehler (MITTEL) – direkt behoben**
- 26 der geänderten DocType-JSONs hatten KEINEN `modified`-Bump. Frappes `bench migrate` synchronisiert ein DocType-JSON nur, wenn `modified` neuer als der DB-Stand ist – die neuen Indizes wären also nie angelegt worden. Behoben: `modified` auf `2026-10-10 23:59:00.000000` gesetzt in 27 JSONs (alle ohne Bump, u. a. kyc_fall, plattform_bank, plattform_eg_gemeinschaft, plattform_zahlungslauf, plattform_serviceauftrag, plattform_anmeldung, plattform_contracting_vertrag …); die 3 bereits von Parallel-Teams gebumpten (plattform_bericht, plattform_einwilligung_protokoll, plattform_lead_person) unverändert gelassen. Alle 225 JSONs parsen weiterhin.
- Geprüft, kein Handlungsbedarf: `vorgang_id` in `plattform_lead_person.json` hat bereits `search_index` (wichtig für die neue Lösch-Abfrage).

**3) Nichts kaputt**
- `npm test`: 867/867 grün (inkl. PLZ-, api-vertrag-, rechte-, demo- und Rechner-Tests).
- `npx eslint` auf validierung.js, demo.js, validierung.plz.test.mjs: 0 Befunde.
- Dev-Server läuft weiter: `/de` → 200, `/portal` → 307 (Login-Redirect, erwartet). Nicht angefasst.

**4) Sicherheitsregeln eingehalten**
- Keine Änderungen an package.json/package-lock (keine neuen Abhängigkeiten), keine Secrets in den Diffs, Python nur per Code-Lektüre + py_compile, alles Demo-only. Der demo.js-Diff enthält zusätzlich eine Kontosperre-Änderung in `passwortAendern` (Paket SECURITY, kommentiert als Pen-Test-Befund S1) – fremdes Paket, unangetastet gelassen und von den Tests abgedeckt.

**5) Offen / Hinweise für QM und Inhaber**
- „Mandant"-Index aus dem Auftrag: Es existiert kein Feld `mandant` in den DocTypes – Punkt gegenstandslos; Datums-Indizes (creation/modified) legt Frappe standardmäßig an.
- Migration mit Rückweg (einmalig `bench migrate` auf der Test-Site; MariaDB-Indizes bei Rücknahme manuell droppen), Flächen-Duplikaterkennung und Frappe-Spiegel von `plzLand` bleiben wie vom Fachteam dokumentiert als Vorhaben offen.
- Inhaberpunkte unverändert: Frist `vorgang_ohne_konto` (1095 Tage) bestätigen; Flächen-Duplikate warnen vs. blockieren.
- Kein Commit angelegt (macht der QM).

Geänderte Dateien dieser Prüfung (nur `modified`-Bumps): 27 JSONs unter `C:\Users\SALEADMIN\Downloads\Oekoinvest-Web\Backend-Import\oekoinvest_app\oekoinvest_app\plattform\doctype\` (alle vom Fachteam angefassten außer plattform_bericht, plattform_einwilligung_protokoll, plattform_lead_person).

## BACKUP

**PRÜFBERICHT PAKET BACKUP – BESTANDEN (mit zwei kleinen Nachbesserungen)**

**1) Geprüfte Bereiche**
- Code-Lektüre: `scripts/demo-sicherung.mjs`, `test/plattform/demo-sicherung.test.mjs`, Abgleich der Sperrlogik mit `src/lib/plattform/backend/demo/speicher.js` (identisches Protokoll: `plattform.lock`, wx-open, Stale-Erkennung 2 s/120 s, 60-s-Timeout – stimmt).
- `docs/BETRIEB-BACKUP.md` vollständig gelesen (Sicherungsumfang, Takte/EU/3-2-1/Verschlüsselung, RPO 1 h/RTO 4 h, bench-Konzept nur als Doku, Notfallhandbuch, Art.-33/34-Baum, Restore-Protokoll) – fachlich plausibel, keine Geheimnisse, Demo-only eingehalten.
- `.gitignore`-Diff: nur `/.data-sicherungen/` ergänzt, minimal-invasiv.
- Behauptungen live nachgestellt: `pruefen` der Team-Sicherung `2026-10-10T21-51-23_restore-test` → OK (104 Dateien); aktueller `plattform.json`-Hash `c1b907e0…28200835` stimmt exakt mit dem Protokoll in Abschnitt 6 überein; eigene Live-Sicherung bei laufendem Dev-Server erfolgreich; Portal `/login` HTTP 200; Dev-Server lief ungestört.
- Tests: `node --test test/plattform/demo-sicherung.test.mjs` grün (1/1), **kompletter `npm test` grün (863/863)**, ESLint auf beiden Dateien sauber.
- Sicherheitsregeln: keine npm-Abhängigkeiten (nur node:fs/crypto/path), keine Geheimnisse (Grep negativ), keine Produktivpfade, bench nur als Doku, Restore-Test nur Demo-Daten. Eingehalten.

**2) Gefundene Lücken (von mir)**
- NIEDRIG (behoben): `sichern()` las `.data/` **ohne** die Backend-Sperre – bei gleichzeitigem Schreiben des Dev-Servers konnte eine Sicherung einen inkonsistenten Zwischenstand über mehrere Dateien erwischen (z. B. neue `plattform.json`, zugehöriger Upload fehlt noch).
- NIEDRIG (behoben): `schemaHinweis` wurde nach dem Kopieren erneut aus der **Live**-`plattform.json` gelesen statt aus der gesicherten Kopie – konnte vom Manifest abweichen.
- Kein Befund zum Restore-Pfad: Prüfen-vor-Einspielen, Sicherheitsnetz-Sicherung, atomares Schreiben unter Sperre, Nachkontrolle – alles korrekt umgesetzt und getestet. Fehlende `…_vor-wiederherstellung`-Sicherung im Team-Test ist konsistent (Datenverlust war simuliert, nichts da zum Wegsichern).

**3) Direkt behoben (Dateien)**
- `C:\Users\SALEADMIN\Downloads\Oekoinvest-Web\scripts\demo-sicherung.mjs`: Lesen+Kopieren jetzt unter `sperren()/entsperren()` (try/finally), `schemaHinweis` aus der Kopie, Zählervariable angepasst. Danach erneut: isolierter Test grün, ESLint sauber, Live-Sicherung `2026-10-10T21-57-07_pruefer-abnahme` (104 Dateien, 10,6 MB, Schema 2) bei laufendem Dev-Server erfolgreich, `/login` weiter HTTP 200.
- `C:\Users\SALEADMIN\Downloads\Oekoinvest-Web\docs\BETRIEB-BACKUP.md`: Abschnitt 5 um den Sperr-Hinweis ergänzt.
- Kein Commit angelegt (macht der QM).

**4) Vorschläge für große Vorhaben** (unverändert sinnvoll, vom Team bereits in BETRIEB-BACKUP.md Abschnitt 2–3 ausgearbeitet): bench-Backup-Automatik + rclone auf EU-Objektspeicher mit Object Lock, Monitoring-Alarm, vierteljährlicher bench-Restore-Test; Backups ins Löschkonzept/Verarbeitungsverzeichnis.

**5) Offene Inhaberpunkte** (bestätigt): privates Git-Remote (dringend – Code ohne jede Sicherung), Hosting-Wahl + Backup-Verantwortliche benennen, Datenschutz-Ansprechperson für Art. 33 (Rechtsabteilung soll den 33/34-Baum gegenlesen), EU-Speicheranbieter und Schlüsselverwahrung (zwei GF) bestätigen.

## BUCHHALTUNG

**Prüfbericht Paket BUCHHALTUNG (unabhängige Prüfung des Fachteam-Berichts, Commit `fba7c67`)**

**1) Geprüfte Bereiche**
- Code-Lektüre des gesamten Commits `fba7c67` (Kleinbetrag, USt-Verprobung, Kontenrahmen-Doku) in JS, Python-Spiegel, Demo-Backend, UI und Doku
- Tests: `node --test` auf `finanzen.test.mjs` + `buchhaltung.test.mjs` sowie voller `npm test` (882 Tests, 0 Fehler); `python -m py_compile` auf `buchhaltung_kern.py` und `finanzen/steuer.py` plus Smoke-Lauf des Python-Spiegels mit identischen Daten wie der JS-Test (Ergebnis deckungsgleich)
- Live gegen das Demo-Backend (Dev-Server :3100): Login als `bo-buchhaltung@example.com`, API `GET /api/admin/finanzen/buchhaltung/abschluss/2026-09` und Seitenrender `/portal/admin/finanzen/buchhaltung?tab=abschluss&monat=2026-09` (HTTP 200, Karte sichtbar)
- Fachliche Gegenprüfung der Rechtsangaben: AT 400 € (§ 11 Abs. 6 UStG 1994), DE 250 € (§ 33 UStDV), DE-Kleinbetrag ohne Leistungszeitraum korrekt, AT-Kleinbetrag mit Leistungszeitraum korrekt (§ 11 Abs. 6 verlangt Tag/Zeitraum), CH 8,1 % centgenau (1234,56 → 100,00), Storno-Vorzeichen (Stornobelege werden negativ gespeichert, `op.js stornoBeleg`)

**2) Ergebnis zu den behaupteten Fixes: BESTANDEN** – alle drei Fixes sind real, korrekt umgesetzt und getestet. Sicherheitsregeln eingehalten: keine neuen Abhängigkeiten, keine Geheimnisse, nur Demo-Backend, kein `npm run verify`/`next build`.

**3) Vom Prüfer gefundene und direkt behobene Fehler**
- **Mittel (Commit `ee4a3a6`):** Die USt-Verprobung zählte **Pacht-Gutschriften (Gutschriftsverfahren) in die Ausgangsumsätze**. Im Gutschriftsverfahren ist der Verpächter der leistende Unternehmer – für ÖkoInvest ist das Eingangsseite/Vorsteuer. Live nachgewiesen: Im Demo-Monat 2026-09 steckte 1 Gutschrift (400 € Netto / 76 € USt) in den Summen; die vom Fachteam „korrekt“ geprüften Summen waren nur arithmetisch korrekt. Fix: eigener Block `ust.gutschriften`, Ausgangszeilen bereinigt, Storno der Gutschrift symmetrisch zugeordnet, Hinweistext erweitert, UI-Zeile „Gutschriften (Eingangsseite)“. Dateien: `src/lib/plattform/buchhaltung/abschluss.js`, `Backend-Import/oekoinvest_app/oekoinvest_app/plattform/buchhaltung_kern.py`, `src/app/(stamm)/portal/admin/finanzen/buchhaltung/page.js`, `src/lib/plattform/buchhaltung/buchhaltung.test.mjs` (+Gutschrift/Gutschrift-Storno-Fälle), `docs/handbuch/backoffice-buchhaltung.md`, `Backend-Import/FINANZEN-ERPNEXT.md`
- **Klein (Commit `812409e`):** Zitat „§ 33 **Satz 2** UStDV“ für den RC-Ausschluss war nicht belegt (in der geltenden Fassung Satz 4) → auf „§ 33 UStDV“ allgemein gefasst (`src/lib/plattform/finanzen/steuer.js`, `finanzen.test.mjs`) – Regel „Zahlen/Angaben nie erfinden“
- Nach den Fixes: beide Testdateien grün, voller `npm test` 882/882 grün, ESLint auf allen geänderten Dateien sauber, Live-API zeigt 15 Ausgangsbelege + 1 Gutschrift separat, `ohneVorlage: 0`

**4) Nicht committet (bewusst):** `docs/API.md` – ein Satz zu `ust.gutschriften` ergänzt; die Datei enthält weiterhin uncommittete Änderungen anderer Teams (Fehlerstruktur, Rate-Limits) und bleibt wie vom Fachteam hinterlassen uncommittet.

**5) Offene Punkte (unverändert gültig, vom Fachteam korrekt benannt)**
- Kontenrahmen/BU-Schlüssel/BMD-Steuercodes und Steuervorlagen vor Livegang mit Steuerberatung festlegen (Beispielwerte); Basiszinssatz amtlich pflegen
- BMD NTCS Vollformat, CH-Treuhand-Export/CH-MWST-Nummer, Vorsteuer/Ist-Besteuerung – nur als Vorhaben dokumentiert, korrekt
- Gutschriftsverfahren muss im Pachtvertrag vereinbart sein (§ 11 Abs. 7–8 UStG 1994)
- Neu dazu: ob die Eingangsseite (Vorsteuer aus Pacht-Gutschriften) später in eine echte UVA-Vorbereitung einfließen soll, mit der Steuerberatung klären (derzeit nur ausgewiesen, bewusst nicht verrechnet)

**Commits:** `ee4a3a6` (Gutschriften-Trennung), `812409e` (Zitat-Korrektur). Kein Push (macht der Inhaber).

## UIUX

PRÜFBERICHT PAKET UIUX (unabhängige Prüfung) – Ergebnis: **bestanden mit einer Nachbesserung**

**1) Geprüfte Bereiche**
- Code-Lektüre aller behaupteten Fixes (Diff gegen HEAD): SlotAuswahl, Leads/Anzeige, Dealroom/Countdown, Scroll-Tabellen (ui.js, Energie/teile.js, BieterBereich, Zugriffsprotokoll, EdaAktionen, Anlagen-Detail, Rechte-Matrix), Tablisten-Helfer `tabTasten.js` samt Verdrahtung (4 Stellen per Grep bestätigt), neues Gate `qa/axe-portal.mjs`, Baseline, npm-Skript, Doku-Nachträge.
- Tests: `npm test` → **888/888 grün, Exit 0** (ein erster Lauf brach mit Exit 1 ab, zwei Wiederholungen vollständig grün – vermutlich Flake/Stderr-Artefakt, kein reproduzierbarer Fehler).
- ESLint auf allen 16 geänderten UIUX-Dateien: **0 Befunde**.
- Funktionsnachweis im Browser gegen das Demo-Backend (Dev-Server 3100, Demo-Login): Gate-Läufe Rolle admin @1440 (12 bzw. 15 Seiten) und investor @390 – Login, Seitenladen, axe und Strukturprüfungen funktionieren wie behauptet.
- Sicherheitsregeln: keine neuen npm-Abhängigkeiten (package.json nur +1 Skript), keine Geheimnisse (Demo-Passwort „Demo-2026!“ war bereits an 7 Stellen im Repo), Gate läuft nur gegen `http://localhost:3100` (`qa/browser.mjs`), keine Produktivpfade. Eingehalten.

**2) Gefundene Lücken/Fehler (Schweregrad)**
- KLEIN/MITTEL (Prüfnetz-Lücke): Drei der gefixten Seiten waren im neuen Gate gar nicht enthalten – `/portal/admin/rechte` (Rechte-Matrix), `/portal/admin/finanzen/buchhaltung` (Werkzeuge-Tabs), `/portal/admin/akquise/karte` (Tablist). Die Fixes selbst stimmten, waren aber unbelegt.
- MITTEL (WCAG 1.4.1, serious, axe `link-in-text-block`): Auf der Akquise-Karte waren die Attributionslinks (basemap.at, BKG, OSM) nur farblich vom Fließtext unterscheidbar – vom erweiterten Gate sofort gefunden, vom Team übersehen, weil die Seite nicht im Prüfumfang war.

**3) Direkt behoben (Dateien)**
- `C:\Users\SALEADMIN\Downloads\Oekoinvest-Web\qa\axe-portal.mjs` – drei Admin-Seiten in `ROLLEN.admin.seiten` ergänzt (jetzt 78 Prüfungen).
- `C:\Users\SALEADMIN\Downloads\Oekoinvest-Web\qa\axe-portal-baseline.json` – drei Schlüssel (leer) ergänzt, Baseline bleibt ohne Altlasten.
- `C:\Users\SALEADMIN\Downloads\Oekoinvest-Web\src\components\Portal\Geodaten\AkquiseKarte.js` – Attributionslinks unterstrichen (`ATTRIBUTION`/`ATTRIBUTION_DE`).
- `C:\Users\SALEADMIN\Downloads\Oekoinvest-Web\docs\UX-AUDIT.md` – Prüfer-Nachtrag im Abschnitt „Nachtrag 11.10.2026“.
- Nachgewiesen: Gate admin @1440 nach Fix **15/15 Prüfungen, 0 Verstöße**; ESLint auf beiden geänderten Dateien sauber; `npm test` 888 grün. Nicht committet (Arbeitskopie enthält parallele Pakete, Commit macht das QM).

**4) Vorschläge für große Vorhaben** (unverändert übernommen, plausibel)
- `qa:axe-portal` als Schritt 4b in `qa/verify.mjs` (Entscheidung QM, Laufzeit ~15 Min; Hinweis: mobile Läufe prüfen nur die ersten 3 Seiten je Rolle – bewusster Laufzeit-Kompromiss, im README dokumentieren falls aufgenommen).
- Glocken-Panel-Bündelung (Audit Q7) und Vereinheitlichung der `Feld`-Varianten (Q3) bleiben Produktentscheidung bzw. koordinierter Querschnittsumbau.
- Neu: EG-Vereinsseiten (`/portal/eg/[id]/verein`) liegen hinter dynamischen IDs und sind vom Gate nicht abgedeckt – wenn gewünscht, Seed-ID fest ins Gate aufnehmen.

**5) Offene Inhaberpunkte**
- Keine neuen; bestehende To-dos (E6-Prüfperson, Rechtsabteilung, Preise, Versanddienst) und die Demo-Seed-Testdaten („Test mup…“) unverändert – Sache anderer Pakete.

Fazit: Teambericht in allen überprüfbaren Punkten korrekt; eine echte Abdeckungslücke gefunden, geschlossen und dabei einen weiteren WCAG-Verstoß behoben. Keine Regressionen.

## DEALROOM

Alle Prüfungen abgeschlossen. Abschlussbericht:

# Prüfbericht Paket DEALROOM (unabhängige Prüfung)

**Gesamturteil: BESTANDEN** – die behaupteten Fixes des Fachteams sind real, korrekt umgesetzt und getestet. Eine kleine Testlücke habe ich selbst nachgezogen.

## 1) Geprüfte Bereiche
- Alle behaupteten Fix-Diffs per Code-Lektüre verifiziert (Demo-Backend, Frappe-Backend, UI, Route, Kernregeln, Scheduler-Hook).
- Vollständiger Testlauf `npm test`, gezielte Testläufe der neuen Dateien, `npx eslint` auf alle geänderten DEALROOM-Dateien, `python -I -m py_compile` auf alle geänderten Python-Dateien.
- Demo-Beleg: alle 4 behaupteten Screenshots existieren in `C:\Users\SALEADMIN\claude-browser\shots-closing\` (admin-closing-liste, admin-closing-raum, admin-dealroom, kaeufer-closing-raum). Dev-Server auf Port 3100 läuft (Portal antwortet mit Redirect zur Anmeldung, nicht öffentlich – korrekt).

## 2) Prüfung der behaupteten Fixes – alle bestätigt
- **CP-Überfälligkeit:** `cpsUeberfaellig()` in `src/lib/plattform/closing/closing.js` (nur Status offen/gemeldet, nur offene Räume, Strikt-Vergleich ISO-Datum) – korrekt; Spiegel `cps_ueberfaellig()` in `Backend-Import/.../closing_kern.py` semantisch identisch. Kennzahl `ueberfaellig` in clListe/cl_liste, `ueberfaellig`-Flag je CP in Demo- und Frappe-Ausgabe, rote Markierung in Backoffice-Liste, Backoffice-Raum (`ClosingRaum.js`) und Käufer-/Verkäufer-Sicht (`closing/[id]/page.js`) vorhanden.
- **Fristen-Lauf:** `clFristenLauf` im Demo-Backend, Route `GET /api/admin/closing/fristen` ist mit `route({ admin: true })` korrekt abgesichert; Frappe `cl_fristen_lauf` (whitelisted POST mit `_lese_noetig`) und `fristen_taeglich` meldet jetzt Grundbuch UND Closing-CPs ans Backoffice (je Deal gedeckelt, keine Mail). `docs/API.md` dokumentiert die Route.
- **Bindefrist beim Zuschlag:** 409-Sperre in `src/lib/plattform/backend/demo/dealroom.js` (bieterAktion/zuschlag) und `Backend-Import/.../api/bieter.py` – beide korrekt, mit Handlungsanweisung (Verlängerung einholen oder anderes Gebot).
- **Tests:** 15 neue Tests in `closing.test.mjs` (7) und `dealroom.test.mjs` (8) vorhanden und inhaltlich sinnvoll (inkl. Grenzfälle: Frist läuft heute noch, geschlossene Räume, null).

## 3) Vom Prüfer direkt behoben
- **Testlücke Bindefrist:** Die Bindefrist-Regel lag nur inline im Demo-Backend und in bieter.py, ohne eigenen Test. Als reine Regel `gebotBindefristAbgelaufen(g, heute)` nach `src/lib/plattform/dealroom.js` extrahiert, im Demo-Backend (`src/lib/plattform/backend/demo/dealroom.js`) verwendet und mit 5 Assertions in `src/lib/plattform/dealroom.test.mjs` abgesichert (abgelaufen gestern = gesperrt, läuft heute noch = erlaubt, ohne Bindefrist = keine Sperre).

## 4) Qualität / Regressionen
- `npm test`: **883/883 grün** (882 vorher + 1 neuer Test), kein voller `npm run verify` (laut Regel QM-Sache).
- `npx eslint` auf alle geänderten/neuen DEALROOM-Dateien: sauber.
- `py_compile` auf bieter.py, closing.py, closing_kern.py, hooks.py: grün.
- Hinweis: Im Arbeitsbaum liegen viele Änderungen anderer Parallel-Teams (EG, Sicherheit, Berichte, DocType-JSONs u. a.) – nicht Teil dieses Pakets, durch den grünen Gesamt-Testlauf aber mitgeprüft, nichts kaputt.

## 5) Sicherheitsregeln – eingehalten
- Keine neuen npm-Abhängigkeiten (package.json/lock unverändert), keine Geheimnisse in Code/Route, alles nur gegen Demo-Backend, Dev-Server nicht angefasst, neue Admin-Route nur lesend und rechtegeprüft.

## 6) Offen (unverändert, korrekt dokumentiert)
- Klein: automatische Erinnerung für überfällige Q&A-Antworten der Anbieter (Team-Befund, bewusst offen).
- Große Vorhaben als Vorschlag (vom Team sauber dokumentiert, bestätige die Einschätzung): echtes PDF-Wasserzeichen je Seite, ZIP-Datenraum-Export zum Closing (Übergabepunkt verweist auf nicht existierenden Export), Archivierung statt Löschung alter Zugriffsprotokoll-Einträge (20.000er-Kappung).
- Inhaberpunkte: anwaltliche Prüfung der Muster (SPA/NDA), Entscheidung zu Wasserzeichen/Export vor dem ersten echten Deal.

**Geänderte Dateien dieser Prüfung:**
- `C:\Users\SALEADMIN\Downloads\Oekoinvest-Web\src\lib\plattform\dealroom.js` (neue reine Regel `gebotBindefristAbgelaufen`)
- `C:\Users\SALEADMIN\Downloads\Oekoinvest-Web\src\lib\plattform\backend\demo\dealroom.js` (nutzt die Regel statt Inline-Vergleich)
- `C:\Users\SALEADMIN\Downloads\Oekoinvest-Web\src\lib\plattform\dealroom.test.mjs` (neuer Test, jetzt 9 Tests)

Keine Commits angelegt – Commit-Vorschlag macht laut Workflow der Qualitätsmanager.

## MARKETING

**PRÜFBERICHT – Paket MARKETING (unabhängige Prüfung)**

**1) Geprüfte Bereiche**
- Alle behaupteten neuen/geänderten Dateien gelesen (Route, Seite, Komponente, Demo-Backend, Vertrag, rechte.js, PortalRahmen.js, api-vertrag.test.mjs, docs/API-REGISTER.md).
- Rechtekette nachvollzogen: `route({ admin:true, recht:"crm" })` → GET Stufe 1, POST Stufe 2 (server/rechte.js + apiAnforderungen), Export zusätzlich `stufe(nutzer,"export") >= 1`; Seite prüft `darfLesen(n,"crm")` + notFound. Korrekt.
- Live gegen Demo-Backend (Dev-Server lief durchgehend): Login als `admin@example.com`, `/api/admin/newsletter` liefert Übersicht (200), Seite `/portal/admin/newsletter` rendert (200), unangemeldet 401 bzw. Redirect. `python -I -m py_compile akquise_kampagne_kern.py` grün. Seiten leads/kanaele/vorlagen vorhanden.

**2) Befund zu den Behauptungen: BESTANDEN mit einer Einschränkung**
- Alle behaupteten Fixes stimmen; Code sauber (Grabsteine ohne Personendaten, Widerruf vor Löschung, 404-Verhalten, CSRF über route(), kein Klartext-Token, 503 außerhalb Demo). ESLint auf allen geänderten Dateien ohne Befund, `docs/API-REGISTER.md` ist aktuell (Regenerierung ändert nichts).
- KLEIN (Hinweis, nicht behoben, kein Fehler): Der Export-Button erscheint auch ohne Recht „CSV-Export“ (Server lehnt mit 403 ab, Hinweistext steht auf der Seite) – bewusste serverseitige Prüfung, UX-Feinschliff optional.
- Sicherheitsregeln eingehalten: keine neuen npm-Abhängigkeiten, keine Geheimnisse, nur Demo-Backend, Dev-Server nicht angefasst, kein `npm run verify`.

**3) Vom Prüfer direkt behoben/nachgezogen (Dateien)**
Offener Punkt „Demo-Seed ohne Newsletter-Beispielabos“ geschlossen – eigener Fachmodul-Seed über die echten Operationen (konsistente Token-Hashes, Einwilligungskette, Personenzeilen, Postausgang; nur @example.com, idempotent über `db.newsletterSeed`):
- `src/lib/plattform/backend/demo/newsletter-seed.js` – NEU: 3 aktive Abos (DE/AT/CH, davon 1 englisch), 1 offenes (DOI ausstehend), 1 abgemeldetes (Grabstein + Widerruf)
- `src/lib/plattform/backend/demo/vorbereiten.js` – eine Zeile: Schritt `"newsletter"` in SCHRITTE (minimal-invasiv)
- `src/lib/plattform/backend/demo/newsletter-seed.test.mjs` – NEU: 2 Tests (Seed-Inhalt inkl. Versandlisten-Sperre, Idempotenz)
- `src/lib/plattform/backend/demo/newsletter-backoffice.test.mjs` – angepasst: Erwartungen als Differenz zur Seed-Basis, Auswahl per E-Mail statt „erstes aktives Abo“ (der erste volle `npm test` nach dem Seed deckte 2 Brüche auf; behoben, erneut grün)

**4) Qualität**
- Voller `npm test`: **888/888 grün** (vor meiner Seed-Ergänzung 886/886; die 2 Zwischen-Fehlschläge waren meine Seed-Kollision mit dem Teamtest, behoben).
- ESLint auf allen neuen/geänderten Dateien ohne Befund. Dev-Server nach allen Änderungen weiter gesund (Login 200, API 200, Seite 200).
- Hinweis: Die Seed-Abos erscheinen im laufenden Dev-Server erst nach dem nächsten Prozess-Neustart (Vorbereitung läuft einmal pro Prozess) – Tests belegen die Funktion.

**5) Offen / Inhaberpunkte (unverändert aus dem Teambericht, bestätigt)**
- Frappe-Spiegel „Plattform Newsletter Abo“ vor Livegang (nur als Dokument mit Rückweg); Versanddienst mit AVV wählen; Rechtsabteilung Newsletter-Texte/Lösch-Wortlaut; Newsroom-Freigabe bei der Geschäftsführung.
- Nichts committet (Commit laut Workflow durch den QM).

