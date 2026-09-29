# ÖkoInvest – Website & Plattform

Website und Plattform der **ÖkoInvest GmbH** (Projektgesellschaft der ÖKOVOLT Gruppe): Projektentwicklung für Freiflächen-PV, Agri-PV, Solarcarports und Großspeicher im DACH-Raum – mit Projektbörse, Portalen für alle Beteiligten, Rechnern und dem Reststrom-Pool für den Mittelstand.

Technisch und gestalterisch basiert das Projekt auf der Website von Ökovolt Deutschland (gleiches Design-System, gleiche Bausteine).

## Schnellstart

```bash
npm install
npm run dev          # http://localhost:3100
```

Ohne weitere Konfiguration läuft die Plattform im **Demo-Backend** (lokale JSON-Datei unter `.data/`, mit Demo-Konten – siehe `docs/PLATTFORM.md`).

## Struktur

| Pfad | Inhalt |
|---|---|
| `src/app/` | Seiten (App Router) und API-Routen |
| `src/components/ui/` | Design-System-Bausteine (Hero, Section, Button, FAQ, CtaBand, Logo …) |
| `src/components/Rechner/` | Rechner-Bausteine, Seitenrahmen, Tool-Register |
| `src/components/Plattform`, `Portal`, `Boerse` | Formulare, Portal, Projektbörse |
| `src/lib/invest/markt.js` | **Alle Marktannahmen** (Kosten, Erträge, Pacht, Strompreise, Phasen) – eine Quelle für alle Rechner und Texte |
| `src/lib/rechner/` | Rechenlogik der Tools (rein, testbar) |
| `src/lib/plattform/` | Backend-Adapter (Frappe / Demo), Sessions, Rechte, Prozesse |
| `src/data/site.js` | Stammdaten: Domain, Gesellschaft, Kontakt |
| `src/data/navigation.js` | Seitenstruktur für Menü, Footer, Sitemap |
| `src/content/ratgeber/` | Ratgeber-Artikel (inhaltsgetrieben) |
| `docs/` | Briefing, Plattform-Betrieb, API-Vertrag zur Frappe-App |

## Vor dem Livegang

- `src/data/site.js`: Produktivdomain (`NEXT_PUBLIC_SITE_URL`), Telefon, E-Mail, UID eintragen.
- Umgebungsvariablen setzen (`SESSION_SECRET`, `PLATTFORM_BACKEND=frappe`, `SERVER`, `API_KEY`, `API_SECRET`, optional `NEXT_PUBLIC_GA_ID`) – siehe `docs/PLATTFORM.md`.
- Rechtstexte (Impressum, Datenschutz, Nutzungsbedingungen) anwaltlich prüfen lassen.
- Logo: `src/components/ui/Logo.js` durch freigegebene Logodatei ersetzen, falls vorhanden.
- `npm audit` ohne hohe Funde.

## Build prüfen, ohne den Dev-Server zu stören

```bash
NEXT_DIST_DIR=.next-verify npx next build
```
