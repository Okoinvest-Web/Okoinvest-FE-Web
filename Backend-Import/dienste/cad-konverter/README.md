# CAD-Konverter (DWG → DXF)

DWG ist ein proprietäres Format von Autodesk. Die Plattform zeigt Pläne im Browser als DXF (eigener Parser, `src/lib/plattform/planung/dxf.js`). Dieser Dienst wandelt hochgeladene DWG-Dateien serverseitig in DXF um; das Ergebnis wird als **abgeleitete Datei an derselben Planversion** gespeichert (Original bleibt unverändert der Nachweis). Ohne Dienst zeigt das Portal „Vorschau nach Konvertierung“ und bietet das Original zum Download an.

## Schnittstelle

| Methode | Pfad | Beschreibung |
|---|---|---|
| `POST` | `/v1/konvertieren?ziel=dxf` (bzw. `svg`) | Rumpf = DWG-Bytes, `Authorization: Bearer <KONVERTER_TOKEN>`, `Content-Type: application/octet-stream`. Antwort 200 = DXF bzw. SVG. Fehler als JSON `{"fehler": "…"}`: 401 Token, 413 zu groß, 415 keine DWG-Kennung (`AC10xx`), 422 nicht konvertierbar/kein gültiges DXF, 429 ausgelastet, 504 Zeitlimit. |
| `GET` | `/gesund` | `{"ok": true, "modus": "libredwg", "werkzeug": "<Version>"}` (ohne Token, für Healthchecks) |

Aufrufer: Frappe (`plattform/api/planung.py`, Hintergrundjob `konvertieren_job`, site_config `cad_konverter_url` + `cad_konverter_token`) bzw. im Demo-Betrieb der Next.js-Server (`CAD_KONVERTER_URL`, `CAD_KONVERTER_TOKEN`, `src/lib/plattform/planung/konverter.js`). Die Kennzahlen (Layer-Konvention) der konvertierten DXF wertet die Website aus (Aktion „Kennzahlen auswerten“ bzw. direkt nach der Konvertierung im Demo-Backend).

## Sicherheit

- Token ≥ 32 Zeichen, zeitkonstanter Vergleich; keine Dateiinhalte und keine Token im Log.
- Größenlimit (`KONVERTER_MAX_MB`, Standard 30), Zeitlimit (`KONVERTER_ZEIT_S`, 90 s), je Konvertierung eigener Temp-Ordner und eigener Prozess mit `setrlimit` (Adressraum `KONVERTER_SPEICHER_MB`, CPU-Zeit, Dateigröße, offene Dateien, keine Core-Dumps), keine Shell, minimale Umgebung, höchstens `KONVERTER_PARALLEL` Aufträge gleichzeitig.
- Container: Nicht-root (UID 10001), `read_only`, `/tmp` als tmpfs, `cap_drop: ALL`, `no-new-privileges`, `pids_limit`, `mem_limit`, **internes Netz ohne Internetzugang** (`internal: true`), Port nicht veröffentlicht – nur Frappe/Next.js im selben Netz erreichen den Dienst.
- Die Eingabe prüfen Website und Frappe bereits (Kennung, Größe, Rechte); der Dienst prüft erneut und kontrolliert das Ergebnis (DXF-Kopf).

## Weg 1 (Standard): GNU LibreDWG

- Lizenz: **GPL-3.0-or-later**. Der Dienst ruft `dwg2dxf` bzw. `dwg2SVG` als **separaten Prozess** auf (keine Bibliothek wird in die Plattform gelinkt). Wird das Image weitergegeben, gelten die GPL-Pflichten für LibreDWG (Quelltext-Angebot; das Dockerfile baut aus dem offiziellen Tarball, die Lizenzdatei liegt unter `/opt/libredwg/COPYING-LibreDWG`).
- Quelle: `https://ftp.gnu.org/gnu/libredwg/` – vor dem Bau aktuelle Version und SHA-256 prüfen (GPG-Signatur `.sig` mit dem Schlüssel des Maintainers verifizieren) und als Build-Argument setzen:
  ```
  LIBREDWG_SHA256=<sha256> KONVERTER_TOKEN=$(openssl rand -hex 32) docker compose up -d --build
  ```
- Qualität: LibreDWG liest DWG R13 bis 2018 (AC1012–AC1032) weitgehend; bei neueren oder sehr komplexen Dateien (Proxy-Objekte, dynamische Blöcke, Bemaßungsstile) kann die Umwandlung unvollständig sein. Der Parser der Plattform zeigt nicht unterstützte Objekte (HATCH, SOLID, …) als Hinweis.

## Weg 2 (Alternative): ODA File Converter

- Kostenlos von der Open Design Alliance, **proprietäre Lizenz** – vor Einsatz die aktuellen Nutzungsbedingungen prüfen (Registrierung/Annahme der Bedingungen, Einschränkungen für Weitergabe und Einbindung in Dienste). Deshalb **nicht im Image enthalten**.
- Einrichtung: eigenes Image auf Basis dieses Dockerfiles, ODA-Paket (`.deb`/AppImage für Linux x64) selbst herunterladen und installieren, `xvfb` installieren (der Konverter braucht eine Anzeige), dann `KONVERTER=oda` und ggf. `ODA_BEFEHL=/pfad/ODAFileConverter` setzen. Aufruf intern: `ODAFileConverter <ein> <aus> ACAD2018 DXF 0 1 *.dwg` (über `xvfb-run -a`).
- Vorteil: sehr hohe Formattreue auch für aktuelle DWG-Versionen; Nachteil: Lizenz, größeres Image, Qt/X11-Abhängigkeiten.

## Tests

```
cd Backend-Import/dienste/cad-konverter
python -m unittest discover -s tests      # Token, Limits, Kennungen, HTTP-Ablauf mit Ersatzwerkzeug (Linux)
```
