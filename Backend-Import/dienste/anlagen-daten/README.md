# anlagen-daten – Ingest-Dienst Anlagen & Monitoring

Eigenständig deployter Dienst: **MQTT → Validierung/Plausibilisierung → TimescaleDB → Störungsregeln → Frappe**, dazu
**Abfrage-API mit SSE-Livestrom** für die Website und der **Broker-Auth-Hook** (Mosquitto go-auth bzw. EMQX HTTP-Auth).
Architektur, Topic- und Payload-Schema: [`docs/ANLAGEN-IOT.md`](../../docs/ANLAGEN-IOT.md).

Die Website (`src/lib/plattform/messdaten/dienst.js`) spricht diesen Dienst serverseitig mit `ANLAGEN_DATEN_URL` und
`ANLAGEN_DATEN_TOKEN` an. Ohne Dienst läuft die Website im Demo-Betrieb mit dem Simulator.

## Aufbau

| Datei | Aufgabe |
|---|---|
| `src/schema.js` | Topic-/Payload-Vertrag v1, ACL-Regel (rein, getestet) |
| `src/plausibel.js` | Zähler rückwärts/Sprung, Leistung über Nennleistung (rein, getestet) |
| `src/regeln.js` | Störungsregeln offline, Fehlercode, Minderleistung (rein, getestet) |
| `src/auth.js` | scrypt-Prüfung (Hash-Format der Website/Frappe), Zugangs-Cache, go-auth/EMQX-Endpunkte (getestet) |
| `src/ingest.js` | MQTT-Client (TLS, QoS 1, persistente Sitzung), Speicherung, Live-Ereignisse, Meldungen an Frappe |
| `src/db.js` | TimescaleDB: Schreiben, Reihen aus Continuous Aggregates, Summen, Monatsstände |
| `src/http.js` | Abfrage-API (Bearer-Token, zeitkonstant), SSE, Auth-Hook-Server |
| `src/frappe.js` | `anlagen.dienst_*` mit Timeout und Backoff |
| `sql/001_schema.sql` | Hypertable, Kompression, CAggs 15 min / 1 h / 1 Tag, Retention |

## Inbetriebnahme

1. **Frappe:** Rolle „ÖkoInvest Anlagen-Dienst“ (legt `after_migrate` an). Benutzer `anlagen-dienst@…` (Website User, nur diese Rolle), API-Key/Secret erzeugen.
2. **Zertifikate** nach `./zertifikate`: `ca.crt`, `broker.crt/.key` (Hostname des Brokers, z. B. `mqtt.oekoinvest.com`), `api.crt/.key`.
3. `cp .env.example .env`, alle Geheimnisse zufällig erzeugen (`openssl rand -base64 48`).
4. `docker compose up -d --build` – der Dienst legt das Schema beim Start idempotent an.
5. **Website:** `ANLAGEN_DATEN_URL=https://<host>:8443`, `ANLAGEN_DATEN_TOKEN=<DIENST_TOKEN>`, `ANLAGEN_MQTT_HOST`, `ANLAGEN_MQTT_PORT=8883`.
6. Firewall: 8883 für Datenlogger, 8443 **nur** für den Website-Server; 5432 und 8081 nie veröffentlichen.
7. Im Portal (Backoffice → Anlagen & Störungen → Anlage → „Gerät verbinden“) Zugang erzeugen, im Datenlogger hinterlegen; Status springt auf „verbunden“, sobald die erste Nachricht ankommt.

Test ohne Datenlogger (Werte aus dem Assistenten):

```sh
mosquitto_pub -h mqtt.example.com -p 8883 --capath /etc/ssl/certs -i '<benutzer>' -u '<benutzer>' -P '<passwort>' -q 1 \
  -t 'oekoinvest/v1/<AL-…>/<GZ-…>/messwerte' -m '{"v":1,"ts":"2026-09-30T10:15:00Z","pv_leistung_kw":412.5,"erzeugung_kwh":1284512.4}'
```

## Prüfen (ohne Pakete, ohne Docker)

```sh
node scripts-check.mjs   # node --check aller Dateien
npm test                 # node --test: Schema, ACL, Plausibilisierung, Regeln, scrypt
```

## Sicherheit

- TLS überall, Zertifikatsprüfung nie abgeschaltet (eigene CA: `MQTT_CA_DATEI`, `DATABASE_CA_DATEI`, `NODE_EXTRA_CA_CERTS`).
- Geräte: eigener Benutzer je Datenlogger, nur Publish auf `oekoinvest/v1/<anlage>/<gerät>/{messwerte,heartbeat,status}`, kein Subscribe. Passwörter nur als scrypt-Hash (Frappe, Password-freies Feld), Sperre wirkt spätestens nach 60 s (Cache).
- Der Dienst kennt keine Portalnutzer; die Website prüft Rolle UND Eigentum vor jeder Abfrage.
- Keine Geheimnisse in Code, Logs oder Fehlermeldungen; Container read-only, ohne Capabilities.
