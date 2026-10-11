export const meta = {
  name: 'welle2-fundament',
  description: 'Welle 2 „Fundament“ laut docs/MASTERPLAN-DACH.md: Planung in konfliktfreie Pakete, Umsetzung (max. 3 parallel, Länderrouting allein am Schluss), Qualitätsmanager',
  phases: [
    { title: 'Planung', detail: 'Welle 2 in Pakete ohne Dateikonflikte schneiden' },
    { title: 'Bau', detail: 'Pakete nach Abhängigkeiten, höchstens 3 gleichzeitig' },
    { title: 'Länderrouting', detail: 'Umbau auf /de /at /ch – allein, weil fast alle Seiten betroffen sind' },
    { title: 'Abnahme', detail: 'Qualitätsmanager' },
  ],
}

const ROOT = 'C:/Users/SALEADMIN/Downloads/Oekoinvest-Web'
const SHOTS = 'C:/Users/SALEAD~1/AppData/Local/Temp/claude/c--Users-SALEADMIN-Downloads-Oekoinvest-Web/3140c08a-2721-4ee9-a47f-9fce6660cd23/scratchpad/welle2'

const REGELN = `Projekt: Next.js 15 (App Router, React 19, Tailwind v4) unter ${ROOT}; Frappe-Backend unter Backend-Import/oekoinvest_app; Demo-Backend unter src/lib/plattform/backend/demo. Git-Stand: Welle 1 ist committet (Arbeitsverzeichnis war sauber).
GRUNDLAGE: docs/MASTERPLAN-DACH.md – Abschnitte 2 (Burggräben B0–B10), 4 (Ländertrennung, Zonenmodell, gestufter Start, Technik), 5 (Lead-System), 8 (Welle 2) und 9 (Stop-Liste). Detail-Befunde der Fachexperten: C:/Users/SALEADMIN/claude-browser/armee/experten/*.md (gezielt per Grep).
ENTSCHEIDUNGEN DES INHABERS: Domain oekoinvest.com, eine Domain mit /de, /at, /ch (keine Zwangsweiterleitung, Vorschlag per schließbarem Banner, Cookie nur nach aktiver Wahl). Firmendaten zentral in src/data/site.js. Rechtliche Angaben direkt bestmöglich einarbeiten und als „Prüfung Rechtsabteilung“ kennzeichnen – die Rechtsabteilung prüft am Ende gesamthaft. Kein Versand und keine Presse unter dem Namen vor dem Livegang. Offene Inhaberpunkte (zweite Prüfperson, Reststrom-Aussage, Mindestbetrag, Postfächer je Land, Bildrechte) NICHT selbst entscheiden – als TODO markieren.
HARTE REGELN:
- Nur die Dateien deines Pakets ändern. Keine git-Commits. Keine neuen npm-Abhängigkeiten ohne zwingenden Grund (dann begründen).
- Zahlen/Rechtsaussagen nur mit Primärquelle; Unsicheres als „zu prüfen“ markieren. Nichts erfinden, keine Dark Patterns, kein erfundener Social Proof.
- Rechenlogik nur über die Charakterisierungstests (npm run test:charakterisierung) – Abweichungen einzeln begründen, Snapshots bewusst aktualisieren.
- Neue Funktionen bekommen Tests (node:test); npm run verify muss am Ende deines Pakets grün sein (seriell, RAM 8 GB).
- Dev-Server läuft unter http://localhost:3100 (eigenes Fenster; ein Wächter startet ihn bei Absturz oder kaputtem Cache automatisch neu, das kann 2 Minuten dauern – dann warten und erneut versuchen). NICHT beenden, NICHT next build. Prüfen mit cd ~/claude-browser && MSYS_NO_PATHCONV=1 node check.mjs http://localhost:3100 ${SHOTS}/<paket> 1440,390 /pfad … bzw. shot.mjs/film.mjs; Bilder mit dem Read-Tool ansehen. Design auf dem Niveau der bestehenden Seiten (Design-System, Motion-System src/components/motion).
- npx eslint auf alle geänderten Dateien.
RÜCKGABE: geänderte/neue Dateien, je Abnahmekriterium bestanden/offen mit Nachweis, Abweichungen vom Plan, offene Punkte für den Inhaber.`

phase('Planung')
const PLAN = {
  type: 'object',
  properties: {
    pakete: { type: 'array', items: { type: 'object', properties: {
      key: { type: 'string', description: 'kurz, z. B. B1, B3, B4, REG, GRP' },
      titel: { type: 'string' },
      ziel: { type: 'string' },
      dateien: { type: 'string', description: 'exklusive Dateien/Ordner dieses Pakets' },
      inhalt: { type: 'string', description: 'konkrete Arbeitsschritte' },
      abnahme: { type: 'string' },
      deps: { type: 'array', items: { type: 'string' } },
    }, required: ['key', 'titel', 'ziel', 'dateien', 'inhalt', 'abnahme', 'deps'] } },
    laenderrouting: { type: 'object', properties: {
      ziel: { type: 'string' }, inhalt: { type: 'string' }, abnahme: { type: 'string' },
    }, required: ['ziel', 'inhalt', 'abnahme'] },
    nicht_in_welle2: { type: 'array', items: { type: 'string' }, description: 'was bewusst nicht gemacht wird (organisatorisch, Inhaber, spätere Wellen)' },
  },
  required: ['pakete', 'laenderrouting', 'nicht_in_welle2'],
}
const plan = await agent(`${REGELN}

Du bist technischer Lead und Architekt. Schneide WELLE 2 („Fundament“, Abschnitt 8) in 4–7 umsetzbare Code-Pakete für Agenten-Teams, die PARALLEL ohne gemeinsame Dateien arbeiten können (Ausnahme: das Länderrouting – siehe unten). Lies dafür den Code (src/lib/invest/markt.js, src/lib/rechner, src/app, src/lib/plattform, Rechner-PDF/Bericht-Bausteine, Einwilligungen, CRM-Routing) und die Masterplan-Abschnitte.
Inhalt laut Plan u. a.: B1 Faktenregister und Länder-Engine (Strangler, Rechner einzeln), B3 Einwilligungsprotokoll mit getrennter Personendaten-Tabelle, Routing Land×Typ×Größe, SLA-Messung, B4 Stufe 1 HTML-Bericht (Pacht, Pachtangebot-Check, Flächencheck, Kommune) mit Double-Opt-in-Logik (Versand vor Livegang nur im Demo/Testmodus), Gruppenkanal (Verweise, Partnerkennungen), Fristen 2026/Umlagen/Netzentgelte 2027 als Daten ins Register. Organisatorisches (Anwälte, Fotoshooting usw.) ist NICHT Teil der Code-Pakete → nicht_in_welle2.
WICHTIG: Das Länderrouting (/de /at /ch, Routengruppe app/(laender)/[land], src/lib/land, hreflang, Sitemaps je Land, Länderwechsler, Länderhinweis-Banner, umzug.js mit 308-Redirects, Codemod der Links, gestufter Start: /de vollständig, /at nur fachgeprüfte Seiten, /ch nur Einstieg) berührt fast alle Seiten. Beschreibe es separat unter „laenderrouting“ – es läuft ALLEIN NACH allen anderen Paketen. Die anderen Pakete sollen ihre neuen Bausteine so bauen, dass sie danach länderfähig sind (Land als Parameter).
Jedes Paket: exklusive Dateien, konkrete Inhalte, prüfbare Abnahmekriterien, Abhängigkeiten (deps auf andere keys).`,
  { label: 'Welle 2 · Welle-2-Planer', phase: 'Planung', schema: PLAN })

const P = Object.fromEntries(plan.pakete.map(p => [p.key, p]))
log(`Plan: ${plan.pakete.map(p => p.key).join(', ')} + Länderrouting`)

phase('Bau')
const ergebnis = {}
const LIMIT = 3
const offen = new Set(Object.keys(P)), laufend = new Map(), fertig = new Set()
const bauen = async (k) => {
  const p = P[k]
  ergebnis[k] = await agent(`${REGELN}\n\nDu bist ein Weltklasse-Team (Architekt, Entwickler, Fachexperte, Tester) für WELLE 2, PAKET ${k}: ${p.titel}.\nZIEL: ${p.ziel}\nEXKLUSIVE DATEIEN: ${p.dateien}\nINHALT: ${p.inhalt}\nABNAHME: ${p.abnahme}\nHinweis: Das Länderrouting (/de /at /ch) folgt NACH dir – baue alles mit dem Land als Parameter, verschiebe aber keine Seiten.\n${p.deps.length ? `Vorarbeiten (${p.deps.join(', ')}) sind fertig:\n${p.deps.map(d => `### ${d}\n${ergebnis[d] || '(kein Bericht)'}`).join('\n\n')}` : ''}`,
    { label: `Welle 2 · Paket ${k}: ${p.titel}`, phase: 'Bau' })
  return k
}
while (offen.size || laufend.size) {
  for (const k of [...offen]) {
    if (laufend.size >= LIMIT) break
    if (P[k].deps.filter(d => P[d]).every(d => fertig.has(d))) { offen.delete(k); laufend.set(k, bauen(k).catch(() => k)) }
  }
  if (!laufend.size) { log(`Blockiert (Abhängigkeiten): ${[...offen].join(', ')}`); break }
  const k = await Promise.race(laufend.values()); laufend.delete(k); fertig.add(k)
}

phase('Länderrouting')
const L = plan.laenderrouting
const routing = await agent(`${REGELN}\n\nDu bist ein Weltklasse-Team (Next.js-Architekt, SEO-Migrationsexperte, Tester) für das LÄNDERROUTING (Abschnitt 4). Alle anderen Welle-2-Pakete sind fertig; du darfst jetzt alle betroffenen Seiten und Links ändern.\nZIEL: ${L.ziel}\nINHALT: ${L.inhalt}\nABNAHME: ${L.abnahme}\nBerichte der übrigen Pakete:\n${Object.entries(ergebnis).map(([k, r]) => `### ${k}\n${r}`).join('\n\n')}\n\nArbeite in kleinen, prüfbaren Schritten (erst src/lib/land mit Tests, dann Routengruppe, dann Seiten verschieben, dann Redirect-Tabelle und Link-Codemod, dann Sitemaps/hreflang, dann Länderwechsler und Banner). Nach jedem größeren Schritt: npm run test:charakterisierung und check.mjs auf Stichproben. Alte URLs müssen per 308 auf die neuen zeigen, ohne Ketten. Ein Crawl-Diff gegen einen Produktions-Build ist auf diesem Rechner NICHT möglich – stattdessen ein Link-Prüfskript gegen den Dev-Server (alle internen Links der öffentlichen Seiten → kein 404, keine Redirect-Kette).`,
  { label: 'Welle 2 · Länderrouting', phase: 'Länderrouting' })

phase('Abnahme')
const qm = await agent(`${REGELN}\n\nDu bist der Qualitätsmanager für Welle 2. Plan:\n${JSON.stringify(plan, null, 1).slice(0, 12000)}\n\nBerichte:\n${Object.entries({ ...ergebnis, Laenderrouting: routing }).map(([k, r]) => `### ${k}\n${r || '(fehlgeschlagen)'}`).join('\n\n')}\n\nPrüfe:\n1. git status/diff --stat: Paketgrenzen, Konflikte.\n2. npm run verify seriell; npx eslint auf alle geänderten Dateien.\n3. check.mjs über alle öffentlichen Seiten der neuen Struktur (/de/…, /at/…, /ch/…, neutraler Stamm) in 1440/390, Blöcke ≤ 12.\n4. Redirects: Stichprobe von 30 alten URLs → 308 auf die neue URL, keine Ketten; hreflang bidirektional; Sitemaps je Land; Länderbanner nur Vorschlag; keine Geo-Weiterleitung.\n5. Lead-Kette: Bericht anfordern im Demo-Modus, Einwilligungsprotokoll-Eintrag ohne Personendaten in der Kette, Routing je Land, Kanal-Ampel sperrt Werbekanäle ohne Einwilligung.\n6. Fehler direkt beheben, erneut prüfen.\nRückgabe: Abnahmeprotokoll je Paket und Kriterium, offene Inhaberpunkte, und ein Commit-Vorschlag als JSON-Liste [{"titel": "...", "pfade": ["Ordner/Glob", ...]}] in sinnvoller Reihenfolge (deutsche Commit-Titel).`,
  { label: 'Welle 2 · Qualitätsmanager', phase: 'Abnahme' })

return { pakete: Object.keys(ergebnis), qm }
