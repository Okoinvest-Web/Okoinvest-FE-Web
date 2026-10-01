# eda-gateway – Transport der EDA-Marktkommunikation

Eigenständiger Dienst (nur Python-Standardbibliothek, optional `openssl` für S/MIME) zwischen der Plattform
(Frappe, `plattform/api/eg_eda.py`) und den Netzbetreibern über die EDA-Infrastruktur (ebUtilities).
Fachlogik (Schemas, Parser, Prozess-Automat, Fristen) liegt in `plattform/eg_eda_kern.py` – das Gateway lädt sie unverändert
(gleiche Logik wie Website und Plattform, Gleichheitstest gegen `src/lib/plattform/eg/testdaten/eda`).

## Ablauf

1. `eg_eda.ausgang` liefert wartende ausgehende Nachrichten (kanonisches EDA-XML, Prüfsumme in der Plattform).
2. Der Adapter sendet sie (E-Mail, KEP oder Ordner) → `eg_eda.ausgang_quittung` (gesendet bzw. fehler).
   Unbeantwortete Nachrichten wiederholt die Plattform im Fristenlauf (2/4/8 Tage, danach Klärfall).
3. Eingänge des Adapters → `eg_eda.nachricht_eingang` (idempotent je Absender + Message-ID). Erst nach erfolgreicher
   Einlieferung wird die Nachricht im Postfach als erledigt markiert.

| Datei | Aufgabe |
|---|---|
| `gateway.py` | Einstellungen, Frappe-Client (Token, TLS, Retry mit Backoff), Durchlauf, CLI (`--einmal`, `--pruefen`) |
| `adapter.py` | `DateiAdapter`, `SimulatorAdapter`, `EmailAdapter` (SMTP/IMAP, TLS, S/MIME über openssl), `KepAdapter` (Ordner/HTTPS mit Client-Zertifikat) |
| `tests/test_gateway.py` | Tests ohne Netz: `python -m unittest discover -s tests` |

## Inbetriebnahme

1. Frappe: API-Benutzer für das Gateway mit Rolle „ÖkoInvest EDA-Gateway“ (Fixture offen, bis dahin „ÖkoInvest API“), API-Key/Secret erzeugen.
2. `cp .env.example .env`, Werte eintragen, `python gateway.py --pruefen`.
3. Betrieb als Dienst (systemd oder Container), Ordner `EDA_ORDNER` persistent, Logs ohne Inhalte.
4. Für Tests/Demo: `EDA_ADAPTER=simulator` bzw. in Frappe `site_config` `"eg_eda_simulator": 1` (Simulator ohne Gateway).

Vor dem Echtbetrieb zu klären (siehe `docs/GO-LIVE.md`, Abschnitt „EDA-Anbindung“): Anbindungsart und Plattformvertrag mit
der EDA GmbH, Zertifikate, Empfängeradressen je Marktpartner, Abbildung des kanonischen XML auf die offiziellen
ebUtilities-Schemas (Namensräume, Pflichtfelder, Prozessversionen ab 05.10.2026) – jeweils (zu bestätigen).
