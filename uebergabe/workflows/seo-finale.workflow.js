export const meta = {
  name: 'seo-finale',
  description: 'SEO-Finale laut Inhaber-Anordnung („beste SEO-Agenten zum Schluss“): Technik, Inhalte/Snippets, Ladezeit/Core Web Vitals, KI-Suche (GEO); je Paket Bau und Prüfung, am Ende Qualitätsmanager',
  phases: [
    { title: 'Bau', detail: 'vier SEO-Fachteams, höchstens 3 gleichzeitig' },
    { title: 'Prüfung', detail: 'unabhängiger Prüfer je Paket' },
    { title: 'Abnahme', detail: 'QM: verify, Gesamtprüfung, Commit-Vorschlag' },
  ],
}

let frei = 3
const warte = []
async function slot(fn) {
  if (frei > 0) frei--
  else await new Promise((r) => warte.push(r))
  try { return await fn() } finally { const n = warte.shift(); if (n) n(); else frei++ }
}

const REGELN = `BAUAUFTRAG (Anordnung des Inhabers: „beste SEO-Agenten zum Schluss drauflassen, dass Platz 1 wird bei allen Suchmaschinen“). Du bist Teil des SEO-Finales über die fertige Website (Wellen 0–4). BAUEN und verbessern, nicht nur berichten.

RAHMEN: Die Domain (oekoinvest.com) ist entschieden, aber noch nicht gekauft; die Seite läuft nur lokal und ist außerhalb der Produktion noindex – das bleibt so. Deine Arbeit wirkt ab dem Livegang. Ehrliches SEO: KEIN Keyword-Stuffing, keine versteckten Texte, keine erfundenen Bewertungs-/AggregateRating-Daten, keine Doorway-Pages, nichts, was gegen Google-Richtlinien verstößt. Qualität und Struktur gewinnen.

PROJEKT: Next.js 15, Dev-Server http://localhost:3100, eine Website mit /de, /at, /ch, /en…-Fassungen, hreflang/canonical je Fassung vorhanden. Zuerst lesen: uebergabe/UEBERGABE.md, src/lib/indexsteuerung.js, src/app/sitemap.js, src/lib/hreflang.js (falls vorhanden), src/components/JsonLd, src/components/Seo.

HARTE REGELN: Keine git-Commits, keine neuen npm-Abhängigkeiten, keine Geheimnisse. Dev-Server nicht beenden, kein next build, KEIN vollständiges npm run verify (nur der QM). npm test und npx eslint auf geänderte Dateien. Server weg → warten (Wächter). Zahlen nur aus dem Faktenregister. Inhalte je Land getrennt. Design nicht verändern (keine sichtbaren Layout-Umbauten – Text-/Meta-/Struktur-Arbeit). Parallelarbeit: nur Dateien deines Pakets; gemeinsame Dateien frisch lesen, minimal ergänzen.
Prüfen im gerenderten HTML (curl + ~/claude-browser/txt.mjs) und mit Screenshots (check.mjs), Bilder mit Read ansehen.

RÜCKGABE (deutsch): was verbessert (mit Vorher/Nachher-Beispielen), welche Dateien, wie geprüft, was offen (Inhaberpunkte).`

const PAKETE = [
  { k: 'TECHNIK', name: 'Technisches SEO', a: `Gesamte Website: Prüfe und verbessere im gerenderten HTML (Stichprobe mindestens 25 Seiten über alle Bereiche und Länder): genau eine H1 je Seite, logische H2/H3-Hierarchie, title/description vorhanden und einzigartig (Duplikate über Fassungen hinweg sind durch hreflang ok, aber nicht innerhalb einer Fassung), canonical/hreflang-Konsistenz (Stichprobe gegen die Register), strukturierte Daten (Organization, WebSite mit SearchAction auf /quellen?, BreadcrumbList, FAQPage wo echte FAQ, Dataset auf Datenseiten, Service/LocalBusiness für den Standort – nur wahre Angaben, über das escapende JsonLd), interne Verlinkung: verwaiste Seiten finden (Seiten im Register ohne eingehende Links – Skript schreiben), sinnvolle Querverweise ergänzen (im bestehenden Stil, z. B. „Passende Werkzeuge“-Blöcke), 404/Redirect-Hygiene (Stichprobe alte Pfade → 308 ohne Ketten), robots.js/sitemap konsistent, Bild-alt-Texte (Stichprobe, fehlende ergänzen – beschreibend, nicht keyword-gestopft).` },
  { k: 'INHALT', name: 'Snippets und Suchintention', a: `Für die wichtigsten 40 Seiten (Startseite, Leistungsseiten, Rechner, Marktdaten, Ratgeber-Hubs – je Fassung DE gemeinsam + Länder, EN): title (≤ 60 Zeichen, Suchintention + Marke hinten) und description (140–160 Zeichen, konkreter Nutzen, Handlungsaufforderung, keine leeren Floskeln) überarbeiten, wo sie generisch sind. Ratgeber/Lexikon: Fragen-Überschriften, wo Nutzer so suchen („Was kostet…“, „Wie funktioniert…“), ohne Inhalte zu verfälschen. Rechner-Seiten: der erste Absatz beantwortet die Suchintention in 2 Sätzen. KEINE Keyword-Dichte-Spielerei; natürlich lesbar, Länderbegriffe korrekt (AT: Widmung, CH: Rappen/Parzelle usw. – bestehende Begriffsarbeit nutzen). Vorher/Nachher-Liste im Bericht.` },
  { k: 'TEMPO', name: 'Ladezeit und Core Web Vitals', a: `Mit ~/claude-browser/film.mjs (Filmstreifen, CLS, lange Tasks) und eigenen Messungen die wichtigsten 12 Seiten bei 1440 und 390 messen (3 Läufe, Median; Dev-Server verzerrt absolut, aber relativ aussagekräftig). Finde und behebe: Layout-Sprünge (CLS-Quellen: Bilder ohne Größen, nachladende Bänder, Fonts), überflüssig große Bilder (next/image richtig konfiguriert? sizes-Attribute), Client-Komponenten, die Server-Komponenten sein könnten (nur klare Fälle), unnötige useEffect-Ketten beim Start, Animationen, die Layout triggern (transform statt top/left), prefers-reduced-motion respektiert. Keine Funktionsänderungen; Charakterisierungstests bleiben grün. Vorher/Nachher-Messwerte im Bericht.` },
  { k: 'GEOKI', name: 'KI-Suche (GEO) und Zitierfähigkeit', a: `Die Website soll von KI-Suchmaschinen (ChatGPT, Perplexity, Google AI) als Quelle zitiert werden: llms.txt vervollständigen (alle zitierwürdigen Daten-/Wissensseiten mit 1-Zeilen-Beschreibung), /quellen-Anker in den Seiten nutzen (Zahlen im Fließtext der Hauptseiten auf ihre Fakten-Anker verlinken – Stichprobe 15 Seiten, dezent), Dataset-/FAQ-/HowTo-Schema wo wahrheitsgemäß passend, eindeutige, zitierfähige Definitionssätze am Anfang der Lexikon-/Ratgeber-Artikel (Stichprobe 10, behutsam redigieren), Autor/Stand/Prüfer-Angaben sichtbar auf Wissens-Seiten (nur echte Angaben aus dem Faktenregister, kein erfundenes E-E-A-T), robots.js: KI-Crawler-Regeln dokumentieren (Entscheidung E5 des Inhabers als offenen Punkt vermerken, Standard nicht ändern ohne Freigabe).` },
]

phase('Bau')
const ergebnisse = await Promise.all(PAKETE.map((p) => slot(async () => {
  const bau = await agent(`${REGELN}\n\nDEIN PAKET ${p.k}: ${p.name}\n${p.a}`, { label: `SEO · ${p.k} Bau`, phase: 'Bau' })
  const pruef = await agent(`${REGELN}\n\nDu bist unabhängiger PRÜFER für SEO-Paket ${p.k} (${p.name}). Bericht:\n${bau}\n\nAuftrag war:\n${p.a}\n\nPrüfe kritisch und BEHEBE direkt:\n1. Stimmen die Behauptungen (gerendertes HTML, Messungen nachvollziehen)?\n2. Nichts kaputt: npm test, npm run test:charakterisierung, npx eslint auf geänderte Dateien; Design unverändert (Screenshots 1440/390 von 5 betroffenen Seiten mit Read ansehen); Länder-/Sprachfassungen konsistent geändert (nicht nur DE).\n3. Kein Spam: keine Keyword-Stopferei, keine unwahren Schema-Angaben, Zahlen mit Faktenregister-Deckung.\n4. Kleine Lücken nachziehen, Großes als offen dokumentieren.\nRückgabe: Prüfbericht (bestanden/behoben/offen) mit Dateiliste.`, { label: `SEO · ${p.k} Prüfung`, phase: 'Prüfung' })
  return { k: p.k, name: p.name, bau, pruef }
})))

phase('Abnahme')
const berichte = ergebnisse.filter(Boolean).map((e) => `## ${e.k} ${e.name}\n### Bau\n${e.bau}\n### Prüfung\n${e.pruef}`).join('\n\n')
const qm = await agent(`${REGELN}\n\nDu bist der QUALITÄTSMANAGER des SEO-Finales. Nur du darfst npm run verify vollständig laufen lassen (allein; Flakes einzeln nachprüfen; am Ende EIN grüner Gesamtlauf).\n1. npm test, npm run test:charakterisierung, npx eslint auf alle geänderten Dateien.\n2. HTTP/SEO-Stichprobe 20 Seiten über alle Fassungen: 200, genau eine H1, title/description, canonical/hreflang, strukturierte Daten valide (JSON parsen), noindex-Register unverändert für ungeprüfte Seiten.\n3. Design: Screenshots von 8 geänderten Seiten (1440/390) ansehen – keine sichtbaren Layoutänderungen, keine Überläufe.\n4. CLS-Stichprobe mit film.mjs auf 4 Seiten: nicht schlechter als vorher (Berichte vergleichen).\n5. Konflikte in gemeinsamen Dateien; Sitemap unverändert bzgl. noindex.\n6. Fehler beheben, erneut prüfen, npm run verify GRÜN.\nRückgabe: Abnahmeprotokoll, offene Inhaberpunkte, Commit-Vorschlag als JSON-Liste [{"titel":"…","pfade":["…"]}] (deutsche Titel, jede geänderte Datei in genau einem Commit; uebergabe/ und *.tmp.js nicht aufnehmen).\n\nBerichte:\n${berichte}`, { label: 'SEO · Qualitätsmanager', phase: 'Abnahme' })
return { qm, pakete: ergebnisse.filter(Boolean).map((e) => ({ k: e.k, pruef: e.pruef })) }
