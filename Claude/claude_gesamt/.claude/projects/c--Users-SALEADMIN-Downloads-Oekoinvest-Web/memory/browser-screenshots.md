---
name: browser-screenshots
description: Playwright-Screenshot-Werkzeug unter ~/claude-browser zum visuellen Prüfen von UI-Änderungen
metadata:
  node_type: memory
  type: reference
  originSessionId: 3140c08a-2721-4ee9-a47f-9fce6660cd23
  modified: 2026-10-03T02:55:59.418Z
---

Der Nutzer möchte, dass UI-Arbeit visuell im Browser geprüft wird, nicht nur per curl/ESLint.

Werkzeug: `C:\Users\SALEADMIN\claude-browser\shot.mjs` (Playwright 1.63 + Chromium, außerhalb des Projekts installiert, damit package.json unberührt bleibt).
Aufruf: `cd ~/claude-browser && node shot.mjs <url> <ausgabeordner> 1440,390 --tiles` (je Bildschirmhöhe ein Bild beim Scrollen; `--full` = Ganzseite, dann fehlen Reveal-Inhalte oft). Schließt den Cookie-Banner, meldet Konsolenfehler und horizontalen Überlauf. Bilder in den Scratchpad schreiben und mit Read ansehen.

Weitere Werkzeuge dort: `film.mjs` (Filmstreifen + CLS), `check.mjs` (viele Seiten schnell prüfen; in Git-Bash `MSYS_NO_PATHCONV=1` setzen).

Dev-Server des Projekts: `npm run dev` auf Port 3100. Der PC hat nur 8 GB RAM – der Server stürzt unter Agenten-Last ab; Hintergrund-Bash endet nach 2 h, daher Server per `Start-Process` in eigenem Fenster starten.
Agenten-Armee (Okt. 2026): `~/claude-browser/armee/` mit `waechter.mjs` (startet Dev-Server neu), `dashboard.mjs` → `index.html` (Live-Ansicht für den Nutzer), `roster.json`/`baue-roster.mjs`, `posteingang.md` (neue Nutzerwünsche ohne Workflow-Neustart).
