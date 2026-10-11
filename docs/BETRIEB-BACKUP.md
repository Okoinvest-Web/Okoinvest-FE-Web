# Betrieb: Sicherung, Wiederherstellung, Datenpanne

Stand: 10.10.2026 (Plattform-Armee, Paket BACKUP). Status: **Konzept** – es gibt noch kein
Produktiv-Hosting (offener Inhaberpunkt). Alles Produktive ist hier als verbindlicher
Vorschlag beschrieben und wird beim Hosting-Aufbau umgesetzt. Was heute schon läuft:
die Sicherung des lokalen Demo-Backends (Abschnitt 5) mit protokolliertem Restore-Test
(Abschnitt 6).

## 1. Was wird gesichert

| Bestandteil | Inhalt | Werkzeug |
|---|---|---|
| **MariaDB** (Frappe-Site) | Alle DocTypes: Konten, Leads, Vorgänge, Einwilligungsprotokolle, Berichte, Buchungen | `bench backup` (mysqldump, gzip) |
| **Private Dateien** | Uploads der Nutzer (Belege, KYC-Dokumente, Verträge) – personenbezogen, höchste Schutzstufe | `bench backup --with-files` (`private/files`) |
| **Öffentliche Dateien** | Bilder, freigegebene Anhänge | ebd. (`public/files`) |
| **Konfiguration** | `site_config.json` (ohne Geheimnisse committen!), `common_site_config.json`, Nginx/Supervisor-Konfiguration, `apps.txt` + installierte App-Versionen (Git-Commit-Hashes) | Konfigurations-Sicherung (Skript, siehe 3.2) |
| **Geheimnisse** | DB-Passwort, `encryption_key`, API-Schlüssel | NICHT im normalen Backup-Strom; separat im Passwort-Tresor der Geschäftsführung (zwei Personen), versioniert |
| **Website (Next.js)** | Vollständig in Git; kein Datenbackup nötig, aber: privates Git-Remote anlegen (offener Inhaberpunkt!) – aktuell existiert das Repo nur auf einem Rechner | Git-Remote + Mirror |
| **Demo-Backend (nur Entwicklung)** | `.data/` (plattform.json, uploads/, kyc/) | `scripts/demo-sicherung.mjs` |

Ausdrücklich **nicht** gesichert werden: Logdateien älter 90 Tage, Build-Artefakte
(`.next`), `node_modules`, Caches – alles reproduzierbar.

## 2. Wie oft, wohin, wie lange (Vorschlag, beim Hosting-Aufbau festzuzurren)

| Ebene | Takt | Ziel | Aufbewahrung |
|---|---|---|---|
| Datenbank-Dump | **stündlich** | lokal auf dem Server (`/home/frappe/backups`) | 24 Stunden |
| Datenbank + Dateien | **täglich 02:00** | externer EU-Objektspeicher, zweiter Anbieter als der Hoster | 30 Tage |
| Wochen-Vollsicherung | sonntags | ebd., zusätzlich **Offline-/Immutable-Kopie** (Object Lock oder getrenntes Konto, gegen Ransomware und gelöschte Zugangsdaten) | 12 Wochen |
| Monats-Vollsicherung | 1. des Monats | ebd. | 12 Monate |
| Konfiguration | bei jeder Änderung + täglich | ebd. | wie Tagessicherung |

Regeln:

- **Speicherort nur EU** (DSGVO, Art. 44 ff.): Rechenzentrum und Betreibersitz in der EU,
  z. B. Hetzner Storage Box/Objektspeicher (DE), IONOS (DE), Exoscale (CH/AT), OVH (FR).
  Kein US-Hyperscaler für personenbezogene Rohdaten ohne gesonderte Prüfung.
- **3-2-1-Regel:** drei Kopien (Server, Objektspeicher, Immutable-Kopie), zwei
  Techniken, eine davon räumlich getrennt und nicht mit den Server-Zugangsdaten löschbar.
- **Verschlüsselung:** Transport nur TLS; Ablage client-seitig verschlüsselt
  (age oder GPG, Schlüssel im GF-Tresor, **nicht** auf dem Server, sonst schützt die
  Verschlüsselung nicht gegen Server-Kompromittierung). Frappe-`encryption_key`
  gehört zwingend zur Sicherung – ohne ihn sind verschlüsselte Felder (API-Schlüssel
  in DocTypes) nach dem Restore unlesbar.
- **Aufbewahrung vs. Löschpflichten:** Backups fallen unter die Löschkonzepte.
  Länger als 12 Monate wird nichts aufbewahrt; Auskunfts-/Löschersuchen werden im
  Live-System erfüllt, Backups rotieren die Daten innerhalb der Fristen aus
  (im Verarbeitungsverzeichnis so dokumentieren).

### Ziele

- **RPO (maximal akzeptierter Datenverlust): 1 Stunde** (stündlicher DB-Dump);
  für Datei-Uploads 24 Stunden – akzeptabel, weil Uploads über die Vorgangshistorie
  nachgefordert werden können.
- **RTO (maximale Wiederherstellzeit): 4 Stunden** bis das Portal wieder läuft
  (neuer Server aus Konfigurations-Sicherung + letzter Dump), **24 Stunden** für den
  vollständigen Dateibestand.
- Beides ist nach dem ersten Produktiv-Restore-Test zu überprüfen und ggf. anzupassen.

### Verantwortliche (Rollen – Namen trägt der Inhaber ein)

| Rolle | Aufgabe | Besetzung |
|---|---|---|
| Backup-Verantwortlicher (Betrieb) | Einrichtung, tägliche Erfolgskontrolle (Monitoring-Alarm bei ausbleibender Sicherung), vierteljährlicher Restore-Test | _offen_ |
| Stellvertretung | identische Rechte, Vier-Augen bei Restore in Produktion | _offen_ |
| Geschäftsführung | Schlüsselverwahrung (Verschlüsselung, Objektspeicher-Zweitkonto), Meldeentscheidung bei Datenpanne | A. Wegscheider / M. Thaler |
| Datenschutz-Ansprechperson | Art.-33-Prüfung und Meldung | _offen (ggf. extern)_ |

## 3. Frappe/bench-Sicherung (Konzept, nur Doku – hier läuft kein bench)

### 3.1 Einrichtung

```bash
# Tägliche Sicherung mit Dateien, stündlich nur DB (Scheduler/Cron):
bench --site <site> backup --with-files          # täglich 02:00
bench --site <site> backup                       # stündlich
# In site_config.json: "backup_limit": 24  (lokale Rotation)
```

Danach verschlüsselt auslagern (Beispiel, als Cron nach dem Backup):

```bash
cd sites/<site>/private/backups
age -r <alterskey-empfaenger> -o $DUMP.age $DUMP && rclone move $DUMP.age eu-backup:oekoinvest/taeglich/
sha256sum $DUMP >> MANIFEST.sha256   # Hash VOR Verschlüsselung festhalten
```

- `rclone`-Ziel: EU-Objektspeicher, eigenes Konto nur mit Schreib-/Listenrecht
  (kein Löschrecht – Löschen macht nur die Lifecycle-Regel des Speichers).
- Wochen-/Monatskopien per Lifecycle-Regel in einen Bucket mit Object Lock.

### 3.2 Konfigurations-Sicherung

Kleines Skript (beim Hosting-Aufbau anlegen), das täglich sichert:
`site_config.json` (Geheimnisse maskiert in der Doku-Kopie, vollständig nur verschlüsselt),
`common_site_config.json`, Nginx-/Supervisor-Dateien, Ausgabe von
`bench version` und `git -C apps/<app> rev-parse HEAD` je App.

### 3.3 Wiederherstellung (bench)

```bash
bench new-site <site> --db-root-password ...     # oder vorhandene Site
bench --site <site> restore <dump.sql.gz> \
      --with-private-files <private.tar> --with-public-files <public.tar>
# encryption_key aus dem GF-Tresor in site_config.json eintragen!
bench --site <site> migrate
bench --site <site> set-maintenance-mode off
```

Prüfpunkte nach dem Restore: Login je Rolle, letzte bekannte Vorgänge sichtbar,
Einwilligungsprotokolle vorhanden, keine Scheduler-Fehler (`bench doctor`).

## 4. Notfallhandbuch

### 4.1 Entscheidungsbaum

```
Störung bemerkt
├─ Portal langsam/teilgestört, Daten intakt?  → kein Restore; Betrieb/Hoster, Vorfall protokollieren
├─ Datenverlust/-beschädigung (versehentliches Löschen, fehlgeschlagene Migration)?
│   → Abschnitt 4.2 (Wiederherstellung). Personenbezug betroffen? → parallel Abschnitt 4.4
├─ Verdacht auf Angriff (Ransomware, fremder Zugriff, Datenabfluss)?
│   → System vom Netz / Zugänge sperren, NICHTS löschen (Beweise), Restore nur auf NEUE
│     Instanz aus Immutable-Kopie, alle Geheimnisse rotieren → zwingend Abschnitt 4.4
└─ Hardware-/Hoster-Totalausfall? → Abschnitt 4.2 auf neuem Server (Konfigurations-Sicherung)
```

### 4.2 Wiederherstellung Schritt für Schritt (Produktion, Frappe)

1. **Zweite Person dazuholen** (Vier-Augen; Restore überschreibt Daten).
2. Wartungsmodus an, Schreibzugriffe stoppen (`bench set-maintenance-mode on`).
3. **Ist-Zustand wegsichern**, auch wenn er kaputt wirkt (`bench backup --with-files`
   in einen Ordner `vor-restore-<datum>`): nie den letzten Zustand vernichten.
4. Jüngste brauchbare Sicherung wählen; **Hash gegen MANIFEST.sha256 prüfen**, erst dann
   entschlüsseln. Bei Angriffsverdacht: Immutable-Wochenkopie statt Tageskopie.
5. Restore nach 3.3; bei Angriffsverdacht auf frischer Instanz.
6. Prüfpunkte aus 3.3 abarbeiten; Differenz zwischen RPO-Fenster und Realität bestimmen
   (welche Vorgänge fehlen?) und die betroffenen Teams informieren.
7. Wartungsmodus aus; 48 h erhöhte Überwachung.
8. **Protokoll** (Zeitleiste, Ursache, Datenverlust-Fenster, Dauer) ablegen unter
   `qa/` bzw. im Betriebsordner; Lehren in dieses Dokument einarbeiten.

### 4.3 Kontakte im Notfall

| Wen | Wofür | Erreichbarkeit |
|---|---|---|
| Backup-Verantwortlicher + Stellvertretung | Restore durchführen | _beim Hosting-Aufbau eintragen_ |
| Geschäftsführung (Wegscheider/Thaler) | Freigabe Restore in Produktion, Meldeentscheidung | office@oekoinvest.com, +43 6278 71030 |
| Hoster-Support | Server/Netz | _nach Hosting-Wahl eintragen_ |
| Datenschutz-Ansprechperson / Kanzlei | Art. 33/34 | _offen_ |
| Datenschutzbehörde Österreich (DSB) | Meldung Art. 33 | dsb.gv.at (Sitz der ÖkoInvest GmbH ist AT → federführend DSB; bei Nutzern in DE/CH mitdenken) |

### 4.4 Entscheidungsbaum Datenpanne (Art. 33/34 DSGVO)

**Uhr läuft ab Kenntnis: 72 Stunden bis zur Meldung.** Sofort dokumentieren (wer hat
wann was bemerkt), auch wenn am Ende nicht gemeldet wird (Art. 33 Abs. 5:
Dokumentationspflicht gilt immer).

```
Sind personenbezogene Daten betroffen (Verlust, unbefugter Zugriff, unbefugte
Offenlegung, Verschlüsselung durch Angreifer)?
├─ NEIN (z. B. nur Konfiguration, nur anonyme Zahlen) → keine Meldung; intern dokumentieren
└─ JA → Verletzung i. S. v. Art. 4 Nr. 12.
    Risiko für Betroffene voraussichtlich NICHT gegeben?
    (z. B. Verlust eines stark verschlüsselten Backups, Schlüssel sicher;
     kurzzeitige Nichtverfügbarkeit ohne Abfluss)
    ├─ JA, kein Risiko → keine Meldung an die Behörde; Begründung schriftlich festhalten
    └─ NEIN, Risiko besteht → MELDUNG an die DSB binnen 72 h (Art. 33),
        notfalls Erstmeldung mit Nachreichung.
        Zusätzlich HOHES Risiko? (KYC-/Ausweisdaten, Finanzdaten, Zugangsdaten,
        großer Umfang, Missbrauch wahrscheinlich)
        ├─ JA → zusätzlich Benachrichtigung der Betroffenen (Art. 34),
        │        klare Sprache: was passiert ist, Folgen, Gegenmaßnahmen, Kontakt
        └─ NEIN → nur Behördenmeldung; Betroffenen-Info erwägen
```

Inhalt der Meldung (Art. 33 Abs. 3): Art der Verletzung, Kategorien und ungefähre Zahl
der Betroffenen und Datensätze, Kontaktstelle, wahrscheinliche Folgen, ergriffene und
vorgeschlagene Maßnahmen. Besonders heikel bei uns: **KYC-Dokumente, Einwilligungs-
protokolle, Lead-Kontaktdaten, Berichte mit Verbrauchsdaten.**

## 5. Demo-Backend sichern und wiederherstellen (heute, Entwicklung)

Das Demo-Backend liegt vollständig unter `.data/` (`plattform.json` = Datenbank,
`uploads/`, `kyc/`, `ki-nutzung.json`). Werkzeug: `scripts/demo-sicherung.mjs`
(ohne npm-Abhängigkeiten; nutzt dieselbe Sperrdatei wie das Demo-Backend und
kollidiert daher nicht mit dem laufenden Dev-Server).

```bash
node scripts/demo-sicherung.mjs sichern [name]          # nach .data-sicherungen/<zeit>_<name>/
node scripts/demo-sicherung.mjs liste
node scripts/demo-sicherung.mjs pruefen <ordnername>    # SHA-256 aller Dateien gegen manifest.json
node scripts/demo-sicherung.mjs wiederherstellen <ordnername>
```

Eigenschaften: SHA-256-Manifest je Sicherung; Sichern liest unter der Backend-Sperre
(kein halber Stand bei gleichzeitigen Schreibvorgängen) und verifiziert jede Kopie sofort;
Wiederherstellen prüft erst die Sicherung, legt automatisch eine Sicherung
`…_vor-wiederherstellung` des aktuellen Stands an, schreibt atomar unter der
Backend-Sperre und kontrolliert das Ergebnis nach. `.data-sicherungen/` steht in
`.gitignore`. Automatischer Test: `test/plattform/demo-sicherung.test.mjs`
(läuft isoliert in einem Temp-Ordner, berührt die echte `.data/` nicht).

## 6. Protokoll Restore-Test (Demo-Daten)

| | |
|---|---|
| Datum | 10.10.2026, ca. 21:51 UTC |
| Durchgeführt von | Claude (Plattform-Armee, Paket BACKUP) |
| Umgebung | lokal, Dev-Server lief weiter auf Port 3100; nur Demo-Daten |
| Sicherung | `node scripts/demo-sicherung.mjs sichern restore-test` → `2026-10-10T21-51-23_restore-test`, 104 Dateien, 10,6 MB, Schema 2 |
| Ausgangs-Hash | `plattform.json` SHA-256 `c1b907e0…28200835` |
| Simulierter Schaden | `plattform.json` und ein Upload (`uploads/BD-BD-26-P3L6ZD-….pdf`) entfernt |
| Prüfen | `pruefen` → OK, alle 104 SHA-256 stimmen |
| Wiederherstellen | `wiederherstellen` → Nachkontrolle OK (104 Dateien) |
| Ergebnis | `plattform.json` nach Restore wieder exakt SHA-256 `c1b907e0…28200835`; Upload vorhanden; Portal `/login` danach HTTP 200 |
| Negativtest | im automatischen Test: manipulierte Sicherung (1 Byte) wird erkannt und nicht eingespielt |
| Bewertung | **BESTANDEN.** RPO=Zeitpunkt der Sicherung, Restore-Dauer < 10 s |

Nächster Test: nach dem Hosting-Aufbau ein echter bench-Restore auf einer Test-Site
(vierteljährlich wiederholen, hier protokollieren).
