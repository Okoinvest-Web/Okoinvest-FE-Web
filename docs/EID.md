# Staatliche eID – ID Austria und Online-Ausweis (Team „eID“)

Stand: 30.09.2026. Abstimmung mit Team „Eigene Identifizierung“ (KYC-Assistent) und Compliance.

## Kurzfassung

- Zwei neue Identifizierungs-Varianten im Weg `eid` von `KYC_METHODEN` (kyc.js): **ID Austria** (`id_austria`, AT) und **Online-Ausweis** (`online_ausweis`, DE: Personalausweis, eAT, EU-eID-Karte über einen eID-Service).
- Protokoll: **OpenID Connect, Authorization-Code-Flow** mit `state`, `nonce` und **PKCE S256**, `client_secret_post`. SAML2/PVP (ID Austria, „nicht empfohlen“) und die SOAP-Schnittstelle nach TR-03130 sind nicht umgesetzt.
- Das Ergebnis ändert **nie** den KYC-Status. Es wird als Nachweis am eID-Vorgang gespeichert und als **Hinweis** an den KYC-Fall gehängt (`kycErgebnisAnhaengen`, `art: "eid"`). Die Entscheidung trifft die Compliance.
- Compliance-Regel „**eID mit hohem Vertrauensniveau = Identität bestätigt**“ (Standard: aus) setzt nur das Kennzeichen `identitaetBestaetigt` (Nachweis und `daten.identitaetBestaetigt` im Hinweis). Voraussetzungen: Niveau hoch, Name und Geburtsdatum widersprechen den KYC-Angaben nicht, keine Dublette (gleiche bPK bzw. gleiches Pseudonym bei einem anderen Konto).
- Ohne Konfiguration (außerhalb der Produktion bzw. mit `PLATTFORM_DEMO=1`) läuft ein **DEMO-Simulator** durch denselben Prüfpfad (Code-Tausch mit PKCE, signiertes ID-Token, nonce, Niveau). Nachweise sind durchgehend mit „DEMO“ gekennzeichnet.

## Schnittstelle für Team 1 (KYC-Assistent)

| Was | Wo |
| --- | --- |
| Weg in `KYC_METHODEN` | Eintrag `eid`: `verfuegbar: true`, `varianten: ["id_austria","online_ausweis"]`, `start: "/api/portal/dienste/eid"` |
| Tatsächlich startbare Varianten | `GET /api/portal/dienste/eid` → `methoden: [{ id, label, land, kurz, text, icon, demo, aktiv, loaMin }]` (leer = eID derzeit nicht anbieten). Serverseitig: `eidVerfuegbar()` aus `src/lib/plattform/dienste/eid/methoden.js` (nur Server, nutzt node:crypto) |
| Start-Schaltflächen (fertig) | `@/components/Portal/Dienste/EidStart` – Props `{ methoden }`; startet und leitet weiter |
| Start per API | `POST /api/portal/dienste/eid` `{ methode }` → `{ vorgang: { id, methode, demo }, url }`; Browser mit `window.location.assign(url)` weiterleiten |
| Rückkehr ins Portal | `/portal/verifizierung?eid=<EI-…>&ergebnis=bestanden|abgelehnt|fehler|abgebrochen` bzw. `?eid=ungueltig|doppelt|limit|fehler|anmeldung` (nie Code/Token in der URL) |
| Nachweis/Status des Nutzers | `GET /api/portal/dienste/eid` → `nachweis` (jüngster gültiger: `{ methode, demo, vorname, nachname, geburtsdatum, vertrauensniveau, am, transaktionsId, identitaetBestaetigt, abgleich }`), `vorgaenge` (letzte 5), `regel.hochBestaetigt` |
| Im KYC-Fall | `pruefergebnisse[]` mit `art: "eid"`, `quelle: "eID ID Austria" | "eID Online-Ausweis"` (+ „ (DEMO)“), `ergebnis: ok | auffaellig | hinweis | fehler`, `daten: { vorgang, methode, vertrauensniveau, zeitpunkt, transaktionsId, nameStimmt, geburtsdatumStimmt, dublette, identitaetBestaetigt, regelHochBestaetigt, demo }` |
| Backend-intern (Demo) | `eidNachweisDb(db, kontoId)` bzw. `await eidNachweis(kontoId)` aus `backend/demo/eid.js` |
| Backend-intern (Frappe) | `oekoinvest_app.plattform.api.eid.eid_nachweis(konto_id)` |

Hinweise für Team 1:
- `kycIdentNachweis(f, "eid")` erkennt die Hinweise bereits (Regex auf `art/quelle`, `ergebnis: "ok"`). Bitte zusätzlich `daten.demo === true` im Echtbetrieb nicht als Nachweis werten und für „Identität bestätigt“ `daten.identitaetBestaetigt` verwenden (nicht nur `ergebnis: "ok"`).
- Python: `kyc_ident_kern.py` führt `eid` noch mit `"verfuegbar": False` (Team-1-Datei, nicht geändert). Vorschlag: dort `verfuegbar` aus `oekoinvest_app.plattform.eid_kern.verfuegbar(frappe.conf.get, demo_erlaubt=…)` ableiten.

## Operationen (Backend `eidBackend()` – Demo und Frappe gleich)

| Operation | Frappe-Methode | Rechte |
| --- | --- | --- |
| `eidStatus(n)` | `eid.eid_status` | Person selbst |
| `eidStarten(n, { methode, basisUrl })` → `{ vorgang, url, bindung }` | `eid.eid_starten` | Person selbst, max. 10 je Tag |
| `eidDemoCode(n, { state, nonce, codeChallenge, auswahl })` → `{ url }` | `eid.eid_demo_code` | nur DEMO, nur eigener offener Vorgang |
| `eidAbschluss(n, { state, code, fehler, bindung })` → `{ ok, vorgang }` | `eid.eid_abschluss` | Person selbst (state gehört zum Konto) |
| `eidEinstellungen(n)` / `eidEinstellungenSpeichern(n, { hochBestaetigt })` | `eid.eid_einstellungen(_speichern)` | Compliance lesen (Bereich ≥ 1) / Compliance |

Routen: `GET/POST /api/portal/dienste/eid`, `POST /api/portal/dienste/eid/demo`, `GET/POST /api/portal/dienste/eid/einstellungen`, `GET /api/dienste/eid/rueckkehr` (Rücksprung-URL, beim Aussteller zu registrieren: `<Website>/api/dienste/eid/rueckkehr`), Seite `/portal/eid/demo` (Simulator).

## Sicherheit

- **state** (256 Bit) nur als SHA-256 gespeichert; gehört zu genau einem Konto. **Browser-Bindung**: zweiter Zufallswert als HttpOnly-Cookie `oi_eid_bindung` (SameSite=Lax, Pfad nur Rücksprung, 15 min), serverseitig nur als Hash – schützt gegen Login-CSRF und untergeschobene Rücksprünge (ersetzt die Origin-Prüfung, die bei einem Top-Level-GET vom Aussteller nicht möglich ist).
- **Einmaligkeit**: Vorgang wird vor dem Code-Tausch verbraucht (Status `in_pruefung`), 10 min gültig; neuer Start lässt ältere offene Vorgänge verfallen. **Replay**: SHA-256 des ID-Tokens wird gespeichert und abgewiesen, wenn schon verwendet; nonce nur als Hash, zeitkonstanter Vergleich.
- **ID-Token**: Signatur (RS/PS/ES 256–512; `none` und HS* abgelehnt, RSA ≥ 2048 Bit, `crit` abgelehnt, JWE nicht unterstützt → klare Meldung), `iss` exakt, `aud` enthält Client-ID (bei mehreren: `azp`), `exp`/`iat`/`nbf` mit 120 s Toleranz, Anmeldung höchstens 15 min alt, `nonce`, Vertrauensniveau ≥ `loaMin`. Schlüssel per JWKS-URL (1 h Cache, bei unbekannter `kid` einmal neu laden) oder fest hinterlegt (Pinning).
- **Minimaldaten**: Vorname, Familienname, Geburtsdatum, Vertrauensniveau, Zeitpunkt, Transaktions-ID (`txn`/`jti`/`sid`, sonst Token-Hash-Präfix). bPK bzw. Pseudonym nur als HMAC-SHA256 mit geheimem Pfeffer (`EID_BPK_PEPPER`) – für den Dubletten-Hinweis. Access-Token und ID-Token werden verworfen, nie protokolliert, nie in URLs.
- PKCE-Verifier liegt bis zum Abschluss beim Vorgang (Frappe: verschlüsselt als Password-Feld) und wird danach gelöscht.

## Konfiguration

Website (Demo-Backend) per Umgebung, Frappe per site_config (`oekoinvest_eid_*`, Platzhalter in `Backend-Import/site_config.beispiel.json`). Schritte zur Registrierung: `Backend-Import/GO-LIVE.md`, Abschnitt „ID Austria / Online-Ausweis aktivieren“.

| Umgebung (Website) | site_config (Frappe) | Bedeutung |
| --- | --- | --- |
| `EID_BPK_PEPPER` | `oekoinvest_eid_bpk_pepper` | Pflicht, ≥ 16 Zeichen |
| `EID_AT_UMGEBUNG` | `oekoinvest_eid_at_umgebung` | `referenz` \| `produktion` (offizielle Endpunkte hinterlegt) |
| `EID_AT_CLIENT_ID` / `_CLIENT_SECRET` | `oekoinvest_eid_at_client_id` / `_client_secret` | aus der IDA-SPR |
| `EID_AT_LOA_MIN` | `oekoinvest_eid_at_loa_min` | `hoch` (Standard) \| `substanziell` |
| `EID_AT_JWKS` | `oekoinvest_eid_at_jwks` | optional: JWKS-JSON bzw. PEM (Pinning) |
| `EID_DE_ISSUER` (+ `_AUTH_URL`, `_TOKEN_URL`, `_JWKS_URL`) | `oekoinvest_eid_de_issuer` … | eID-Service; Endpunkte sonst per Discovery |
| `EID_DE_CLIENT_ID` / `_CLIENT_SECRET` | `oekoinvest_eid_de_client_id` / `_client_secret` | vom eID-Service |
| `EID_DE_CLAIM_VORNAME` / `_NACHNAME` / `_GEBURTSDATUM` / `_PSEUDONYM` / `_LOA` | `oekoinvest_eid_de_claim_*` | Claim-Namen laut Dienst (Komma-Liste) |
| `EID_DE_LOA_STANDARD` | `oekoinvest_eid_de_loa_standard` | Niveau, falls der Dienst keines liefert (zu bestätigen) |
| `EID_*_REDIRECT_URI`, `EID_*_ALGS`, `EID_*_SCOPE` | `…_redirect_uri`, `…_algs`, `…_scope` | optional |
| – | `oekoinvest_eid_demo` | `1` = Simulator auf Test-Sites ohne developer_mode |

## Tests

- `node scripts/plattform-test-eid.mjs` (Logik + Ablauf gegen den Dev-Server im Demo-Modus; `--ohne-server` nur Logik)
- `cd Backend-Import/oekoinvest_app && python -m unittest oekoinvest_app.plattform.tests.test_eid_kern -v` (ohne Bench; RSA-Testschlüssel in reinem Python, Kreuzprüfung mit einem von node:crypto signierten Token)
- `bench --site test run-tests --module oekoinvest_app.plattform.tests.test_eid` (mit Bench, Demo)
