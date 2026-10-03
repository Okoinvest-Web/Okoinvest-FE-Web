# Prüf-Gate (Paket F)

Ein Befehl vor jeder Übergabe: `npm run verify`. Er läuft seriell und braucht den laufenden Dev-Server (`npm run dev`, Port 3100). `next build` startet er nicht.

| Schritt | Befehl einzeln | Wirkung |
|---|---|---|
| 1 Unit- und Charakterisierungstests | `npm test` | Gate |
| 2 `selbsttest()` aller Rechner | `npm run test:selbsttest` | Gate |
| 3 Claim-Lint | `npm run lint:claims` | Bericht, mit `--streng` Gate |
| 4 axe auf 10 Kernseiten | `npm run qa:axe` | Gate (Ratsche gegen `qa/axe-baseline.json`) |
| 5 Funnel-E2E, POSTs abgefangen | `npm run qa:e2e` | Gate; Tests mit `todo` gehören zu anderen Paketen |

Optionen: `npm run verify -- --ohne-browser` (nur 1–3, Ergebnis „unvollständig“), `-- --streng`, `-- --nur 1,2`.
Das Protokoll landet in `qa/out/verify-<zeit>.json` mit Commit-SHA und der Zahl geänderter Dateien.

## Charakterisierung (Golden Master)

- Die Fälle stehen in `test/charakterisierung/faelle.mjs`, die Snapshots in `test/charakterisierung/snapshots/*.json`.
- Die Snapshots halten die **heutigen** Ausgaben fest und sind **nicht** fachlich geprüft. Grün heißt nur „unverändert“.
- Wer Zahlen ändert (Paket E):
  1. `npm run test:snapshots:diff -- --datei abweichungen.md` erzeugt die Tabelle für den PR.
  2. Jede Zeile mit Quelle am Original und Prüfer begründen.
  3. Erst dann `npm run test:snapshots:aktualisieren -- <rechner>` ausführen.
- Neue Rechner: einen Eintrag in `faelle.mjs` anlegen, dann aktualisieren. `selbsttest()` wird automatisch gefunden.

## Claim-Lint

- Regeln und Paketlisten stehen in `qa/claim-lint/regeln.mjs`. Die Liste ist ein Entwurf zur Abstimmung mit Strang R und keine Rechtsprüfung.
- Paketweise prüfen: `npm run lint:claims -- --paket D --streng --regeln reizwort,testdaten`.
- Eigene Dateilisten: `npm run lint:claims -- --dateien "src/app/impressum/**,src/data/site.js"`.
- Ausnahmen gelten nur mit Begründung in derselben oder der vorigen Zeile, z. B. `// claim-ok: § 19 EEG, gesetzlich festgelegte Vergütung` (in JSX als `{/* claim-ok: … */}`).

## Browser

- Playwright ist keine Projektabhängigkeit. Gesucht wird zuerst unter `PLAYWRIGHT_PFAD`, dann in `node_modules` und zuletzt in `~/claude-browser/node_modules`.
- In der CI wird es mit `npm i --no-save` installiert, siehe `.github/workflows/verify.yml`.
- axe-core ist über eslint-plugin-jsx-a11y bereits vorhanden.
- Die Prüfungen setzen das Cookie `cookieConsent` auf „nur notwendig“ und sperren externe Hosts.
- Die E2E sendet nichts: Alle Nicht-GET-Aufrufe an `/api/**` werden abgefangen und mit `{ ok: true }` beantwortet.
- Die axe-Baseline nur verkleinern: Nach einer Behebung `npm run qa:axe -- --baseline-schreiben` ausführen. Vorher prüfen, dass keine Seite einen 500er liefert.
