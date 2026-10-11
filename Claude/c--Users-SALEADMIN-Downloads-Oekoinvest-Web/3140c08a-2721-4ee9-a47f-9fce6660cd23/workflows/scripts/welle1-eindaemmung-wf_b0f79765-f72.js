export const meta = {
  name: 'welle1-eindaemmung',
  description: 'Welle 1 „Eindämmung“ laut docs/MASTERPLAN-DACH.md: Pakete A1+F zuerst, dann A, B, C, D, E, G, I, R mit Abhängigkeiten (max. 3 parallel), danach Qualitätsmanager',
  phases: [
    { title: 'Tag 1', detail: 'A1 JSON-LD-Komponente und F Charakterisierungstests + Prüf-Gate' },
    { title: 'Pakete', detail: 'A, B, C, D, E, G, I, R nach Abhängigkeiten, höchstens 3 gleichzeitig' },
    { title: 'Abnahme', detail: 'Qualitätsmanager prüft alle Abnahmekriterien' },
  ],
}

const ROOT = 'C:/Users/SALEADMIN/Downloads/Oekoinvest-Web'
const SHOTS = 'C:/Users/SALEAD~1/AppData/Local/Temp/claude/c--Users-SALEADMIN-Downloads-Oekoinvest-Web/3140c08a-2721-4ee9-a47f-9fce6660cd23/scratchpad/welle1'

const REGELN = `Projekt: Next.js 15 (App Router, React 19, Tailwind v4) unter ${ROOT}; Frappe-Backend unter Backend-Import/oekoinvest_app; Demo-Backend unter src/lib/plattform/backend/demo.
GRUNDLAGE: docs/MASTERPLAN-DACH.md – lies Abschnitt 3 (Fehler im Bestand), Abschnitt 8 (Rahmen) und in Abschnitt 11 DEIN Paket vollständig. Detail-Befunde der Fachexperten liegen in C:/Users/SALEADMIN/claude-browser/armee/experten/*.md (gezielt nachlesen, z. B. per Grep nach Dateinamen/Begriffen).
ENTSCHEIDUNGEN DES INHABERS: Domain bleibt oekoinvest.com (Produktions-URL https://www.oekoinvest.com, wird gerade gesichert). Alle Länder auf einer Domain mit /de, /at, /ch (Umbau erst in Welle 2 – in Welle 1 NICHT umstrukturieren). Crawler-Regel E5 wie empfohlen (Such-Crawler der KI-Dienste erlauben, CCBot/Bytespider sperren). Kontaktdaten (Telefon, Mail, UID) sind NOCH NICHT freigegeben – nichts erfinden, Platzhalter bleiben als klar markierte TODO.
HARTE REGELN:
- Nur die Dateien deines Pakets ändern (siehe Abschnitt 11). Neue gemeinsame Bausteine legt nur das zuständige Paket an.
- Keine git-Commits, kein Push. Keine neuen npm-Abhängigkeiten ohne zwingenden Grund (dann im Bericht begründen).
- Fachliche Zahlen und Rechtsaussagen nur ändern, wenn du sie an der Primärquelle geprüft hast (Quelle als Kommentar/Bericht). Unsicheres als „zu prüfen“ markieren statt raten. Nichts erfinden.
- Rechtstexte: Agenten liefern Entwürfe, keine Freigaben.
- Dev-Server läuft unter http://localhost:3100 (eigenes Fenster, ein Wächter startet ihn bei Absturz neu). NICHT beenden, NICHT next build. Seiten prüfen mit: cd ~/claude-browser && MSYS_NO_PATHCONV=1 node check.mjs http://localhost:3100 ${SHOTS}/<paket> 1440,390 /pfad1 /pfad2 …  bzw. node shot.mjs / film.mjs (Bilder mit dem Read-Tool ansehen). RAM 8 GB: Browser-Skripte und Tests seriell, keine Dauerprozesse.
- npx eslint auf alle geänderten Dateien; Tests deines Pakets müssen grün sein.
RÜCKGABE: geänderte/neue Dateien, je Abnahmekriterium bestanden/offen mit Nachweis, Abweichungen vom Plan mit Begründung, offene Punkte für den Inhaber.`

const PAKETE = {
  A1: { titel: 'JSON-LD-Komponente (Tag 1)', auftrag: 'Nur Teil A1 aus Paket A: lege src/components/JsonLd.js an (zentrales sicheres Escaping von <, >, &, U+2028/2029 im JSON, Server-Komponente, API wie <JsonLd daten={…} />), mit node:test-Test (</script> im Titel rendert sicher). Bestehende JSON-LD-Stellen NICHT umbauen – das machen A, D, G danach in ihren Dateien. Dokumentiere die API in der Datei (JSDoc).', deps: [] },
  F: { titel: 'Sicherheitsnetz & Prüf-Gate', auftrag: 'Paket F vollständig: zuerst Charakterisierungstests mit den HEUTIGEN Ausgaben aller Rechner (Standardeingaben plus Randfälle, Snapshots unter test/), dann npm run verify (node:test, selbsttest(), Claim-Lint mit Reizwörtern/Platzhaltern/Testdaten/ß in CH-Texten, axe auf 10 Kernseiten gegen den laufenden Dev-Server, Funnel-E2E mit abgefangenen POSTs). package.json nur scripts und version 0.4.0. Kein GitHub-Remote anlegen; .github/workflows nur als Datei. verify muss seriell unter 10 Minuten laufen. Claim-Lint darf in Welle 1 Funde melden (Bericht), soll aber per Datei-Liste paketweise einschränkbar sein, damit D seine Dateien prüfen kann.', deps: [] },
  A: { titel: 'Sicherheit', auftrag: 'Paket A (ohne A1, das existiert): JSON-LD-Stellen außerhalb der Dateien von D und G auf JsonLd umstellen; ipAdresse.js (vertrauenswürdiger Proxy-Header), next.config.mjs nur headers (HSTS, CSP Report-Only), Demo-Guard, Timeout/Retry in energy.js, Open-Redirect-Prüfung, Rate-Limit Passwort-Reset, security.txt (Kontakt als TODO, da nicht freigegeben). rechte.js nur, wenn das Konteninventar es zulässt, sonst Befund berichten.', deps: ['A1'] },
  B: { titel: 'Datenschutz & Messung', auftrag: 'Paket B vollständig, inklusive neuem Hook src/lib/ereignis/* (feuert nur mit Einwilligung). KI-Triage-Schalter Standard AUS.', deps: [] },
  C: { titel: 'Lead-Lecks', auftrag: 'Paket C vollständig; nutze den Hook aus B. Teste E2E gegen das Demo-Backend mit abgefangenen bzw. Demo-POSTs (keine echten Mails). Einwilligungstexte nur als markierte Platzhalter (finaler Text aus Strang R).', deps: ['B'] },
  D: { titel: 'Ehrlichkeit & Claims', auftrag: 'Paket D vollständig; JSON-LD in deinen Dateien über JsonLd. Reststrom-Texte gemäß Empfehlung E3 (Vermittler mit offengelegter Vergütung) als Entwurf, im Bericht als Inhaber-Entscheidung markieren. Impressum: Kontaktdaten bleiben TODO.', deps: ['A1', 'F'] },
  E: { titel: 'Zahlen-Sofortkorrektur', auftrag: 'Paket E vollständig – einziger Strom an markt.js. Jede geänderte Zahl am Original prüfen (Quelle als Kommentar), Abweichungen gegenüber den Charakterisierungstests einzeln begründen und die Snapshots bewusst aktualisieren. Länder-Sperre AT/CH. Zusätzlich die dateModified-Korrektur in RechnerSeite.js.', deps: ['F'] },
  G: { titel: 'Recht-Text-Fixes', auftrag: 'Zuerst W0-2 aus Abschnitt 8 (Fristenkästen, nur Text, jede Frist am Original prüfen – abgelaufene Fristen NICHT einbauen), danach Paket G vollständig; JSON-LD in deinen Dateien über JsonLd. Jede geänderte Rechtsaussage mit Quelle in einer Liste im Bericht.', deps: ['A1'] },
  I: { titel: 'Indexsteuerung & Altcode', auftrag: 'Paket I vollständig mit Produktions-URL https://www.oekoinvest.com (E1 entschieden) und Crawler-Regel E5 wie oben. Build-Abbruch ohne NEXT_PUBLIC_SITE_URL in Produktion als Prüfung im Code (nicht durch Ausführen von next build testen, sondern per Unit-Test der Prüffunktion). noindex für Nicht-Produktion. Ergänze außerdem .gitignore um *.tmp.js und lege .env.example an (W0-1, ohne Geheimnisse).', deps: [] },
  R: { titel: 'Rechtstexte (Entwürfe)', auftrag: 'Strang R als ENTWÜRFE: schreibe überarbeitete Fassungen für Datenschutz, Nutzungsbedingungen, Bedingungen und eine Hinweisgeber-Seite als Markdown nach docs/strang-r/ (je Land getrennt, wo Recht abweicht), mit markierten Platzhaltern für Inhaberdaten und einer Liste aller Prüfpunkte für den Anwalt. Die Live-Seiten unter src/app NICHT ändern. Keine Rechtsberatung vortäuschen – klar als Entwurf zur anwaltlichen Prüfung kennzeichnen.', deps: [] },
}

const ergebnis = {}
const start = async (k) => {
  const p = PAKETE[k]
  log(`Start Paket ${k}: ${p.titel}`)
  ergebnis[k] = await agent(`${REGELN}\n\nDu bist ein Weltklasse-Team (Entwickler, Fachexperte, Prüfer) für WELLE 1, PAKET ${k}: ${p.titel}.\nAUFTRAG: ${p.auftrag}\n${p.deps.length ? `Vorarbeiten der Pakete ${p.deps.join(', ')} sind abgeschlossen; Berichte:\n${p.deps.map(d => `### Paket ${d}\n${ergebnis[d] || '(kein Bericht)'}`).join('\n\n')}` : ''}`,
    { label: `Welle 1 · Paket ${k}: ${p.titel}`, phase: k === 'A1' || k === 'F' ? 'Tag 1' : 'Pakete' })
  log(`Fertig Paket ${k}`)
  return ergebnis[k]
}

// Abhängigkeitsgesteuerte Ausführung, höchstens 3 Pakete gleichzeitig
phase('Tag 1')
const LIMIT = 3
const offen = new Set(Object.keys(PAKETE)), laufend = new Map(), fertig = new Set()
while (offen.size || laufend.size) {
  for (const k of [...offen]) {
    if (laufend.size >= LIMIT) break
    if (PAKETE[k].deps.every(d => fertig.has(d)) && (k === 'A1' || k === 'F' || (fertig.has('A1') || !PAKETE[k].deps.length))) {
      offen.delete(k)
      if (k !== 'A1' && k !== 'F') phase('Pakete')
      laufend.set(k, start(k).then(() => k, () => k))
    }
  }
  if (!laufend.size) { log(`Blockiert: ${[...offen].join(', ')}`); break }
  const k = await Promise.race(laufend.values())
  laufend.delete(k); fertig.add(k)
}

phase('Abnahme')
const qm = await agent(`${REGELN}\n\nDu bist der Qualitätsmanager für Welle 1. Berichte der Pakete:\n\n${Object.entries(ergebnis).map(([k, r]) => `### Paket ${k}\n${r || '(fehlgeschlagen)'}`).join('\n\n')}\n\nPrüfe gegen „Abschluss Welle 1“ und die Abnahmekriterien jedes Pakets in Abschnitt 11:\n1. git status/diff --stat: Paketgrenzen eingehalten? Konflikte zwischen Paketen?\n2. npm run verify seriell; npx eslint auf alle geänderten Dateien.\n3. check.mjs über alle öffentlichen Kernseiten in 1440/390 (Blöcke ≤ 12 Seiten).\n4. Gezielte Prüfungen: </script>-Test, gefälschter X-Forwarded-For, /%09/evil.com, kein GA auf /einladung /portal /login/link, Ablehnen setzt keine Analytics-Cookies, AT-PLZ 5020 und CH-PLZ 8001 werden angenommen (Demo-Backend), Flächencheck 12 ha, keine Testprojekte ohne Demo-Modus, Staging liefert noindex.\n5. Gefundene Fehler direkt beheben (du darfst dafür betroffene Dateien ändern), danach erneut prüfen.\nRückgabe: Abnahmeprotokoll je Paket und Kriterium (bestanden/behoben/offen), Liste der Inhaber-Entscheidungen und -Daten, die noch fehlen, Vorschlag für thematische Commits (Reihenfolge, Dateien, Commit-Text auf Deutsch).`,
  { label: 'Welle 1 · Qualitätsmanager', phase: 'Abnahme' })

return { pakete: Object.keys(ergebnis), qm }
