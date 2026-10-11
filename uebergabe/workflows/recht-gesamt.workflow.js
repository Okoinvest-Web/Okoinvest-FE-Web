export const meta = {
  name: 'recht-gesamtpruefung',
  description: 'Rechtsabteilung prüft die fertige Website gesamthaft (Anordnung des Inhabers): Impressum/DSGVO, UWG/Claims, Finanzmarktrecht, Verträge/Muster; kleine Fixes direkt, Anwaltsdossier für den Rest; QM-Abnahme',
  phases: [
    { title: 'Prüfung', detail: 'vier Fachjuristen-Teams, höchstens 3 gleichzeitig' },
    { title: 'Abnahme', detail: 'QM: verify, Commit-Vorschlag, Anwaltsdossier zusammenführen' },
  ],
}

let frei = 3
const warte = []
async function slot(fn) {
  if (frei > 0) frei--
  else await new Promise((r) => warte.push(r))
  try { return await fn() } finally { const n = warte.shift(); if (n) n(); else frei++ }
}

const REGELN = `PRÜFAUFTRAG (Anordnung des Inhabers vom 03.10.: „die Rechtsabteilung sieht sich die Website dann fertig an und macht Checks“). Du bist Teil der internen Rechtsabteilung. Die Website (Wellen 0–4) ist fertig gebaut; prüfe sie gesamthaft aus deinem Fachgebiet. WICHTIG: Du lieferst KEINE Rechtsberatung nach außen – Ergebnis sind (a) direkt behobene kleine Textfehler im Code und (b) ein Anwaltsdossier (Markdown) mit allen Punkten, die externe Kanzleien (Strang R) entscheiden müssen.

PROJEKT: Next.js, Dev-Server http://localhost:3100. Eine Website mit Länderfassungen /de, /at, /ch und /en…; Rechtstexte unter src/app/(stamm)/impressum|datenschutz|nutzungsbedingungen|barrierefreiheit|bedingungen; Entwürfe docs/strang-r; Stammdaten src/data/site.js; Faktenregister src/lib/fakten. Zuerst lesen: uebergabe/UEBERGABE.md, docs/MASTERPLAN-DACH.md Abschnitt 3 (S0/S1-Fehler) und die zu deinem Gebiet passenden Teile.

REGELN:
- Kleine, eindeutig richtige Korrekturen (Tippfehler in Rechtstexten, fehlender Pflichthinweis nach klarer Gesetzeslage, falscher Paragraph, fehlende Kennzeichnung „Entwurf“, inkonsistente Firmierung) DIREKT im Code beheben – im gleichen Stil wie der Bestand, auch in der EN-Fassung (dort gilt: Übersetzung nur informativ, deutsch bindend).
- Alles Strittige oder Gestaltende NICHT selbst entscheiden: ins Anwaltsdossier (eine Datei je Paket unter docs/strang-r/pruefung-2026-10/<paket>.md) mit Fundstelle (Seite/Datei), Problem, Risiko (hoch/mittel/niedrig), Vorschlag, zuständiges Rechtsgebiet und Land.
- Prüfe im BROWSER (gerendertes HTML, nicht nur Quellcode): wichtige Seiten je Land laden, auch EN. Werkzeug: cd ~/claude-browser && MSYS_NO_PATHCONV=1 node txt.mjs bzw. check.mjs; HTTP-Abrufe mit curl sind ok.
- Keine git-Commits, keine neuen Abhängigkeiten, Dev-Server nicht beenden, kein next build, kein vollständiges npm run verify (nur der QM). npm test und npx eslint auf geänderte Dateien. Keine Geheimnisse, keine Produktivdaten.
- Parallelarbeit: nur Dateien deines Gebiets ändern; Rechtstext-Dateien, die mehrere Pakete betreffen könnten, vor Änderung frisch lesen.

RÜCKGABE (deutsch): 1) geprüfte Seiten/Bereiche, 2) direkt behobene Punkte (Dateien), 3) Anwaltsdossier-Datei mit Punktezahl je Risikostufe, 4) die 5 wichtigsten Funde in einem Satz je Fund.`

const PAKETE = [
  { k: 'IMPRESSUM-DSGVO', name: 'Impressum, Datenschutz, Cookies, Barrierefreiheit', a: `Prüfe: Impressum vollständig je Rechtslage (ECG/UGB AT als Sitzland; Pflichten für DE-Ausrichtung nach DDG/TMG-Nachfolge; CH), Offenlegung § 25 MedienG AT, Firmierung/UID/FN überall konsistent (gegen src/data/site.js), Datenschutzerklärung deckt ALLE tatsächlichen Verarbeitungen: Formulare (welche Felder wohin), Bericht-Baustein mit Double-Opt-in, Newsletter, Statistik (GA nur mit Einwilligung – stimmt der Text mit dem Banner-Verhalten überein?), Karten im Flächenpass (BKG/basemap.at/swisstopo – Zwei-Klick?), Widgets (keine Cookies – steht das drin?), Hosting/Empfänger offen als Platzhalter markiert?, Betroffenenrechte, Speicherdauern (gegen aufbewahrung.py), Cookie-Banner: Ablehnen wirklich gleichwertig, Liste der Cookies korrekt. Barrierefreiheitserklärung aktuell (neue Seiten)? EN-Fassungen tragen den Hinweis „nur informativ“?` },
  { k: 'UWG-CLAIMS', name: 'Lauterkeitsrecht und Werbeaussagen', a: `Prüfe die gesamte öffentliche Website (alle Hauptseiten je Land, Stichproben Regionen/Ratgeber) auf: irreführende Angaben (§ 5 UWG DE / § 2 UWG AT / UWG CH), Umweltaussagen (EmpCo-Richtlinie: „grün“, „klimaneutral“, „CO2-frei“ – auch Umschreibungen), Superlative ohne Beleg („größte“, „beste“, „Nr. 1“), Zahlen ohne Quelle im Fließtext (gegen Faktenregister), Rendite-/Ertragsversprechen (auch implizite: „sichere Pacht“), erfundener Social Proof (Referenzen, Zahlen, Logos), Preisangaben (PAngV DE: Gesamtpreise? Widget-/Software-Preisblatt „auf Anfrage“ ok), Vergleichswerkzeuge fair formuliert (Gewerbestrom-Check: „marktgerecht“-Urteil sauber eingeordnet?), Pflicht-Kennzeichnungen „Beispiel/Entwurf/Demo-Daten“ sichtbar (Gläserner Park, Muster). Reizwort-Suchlauf über src/ dokumentieren.` },
  { k: 'FINANZ', name: 'Finanzmarkt- und Aufsichtsrecht', a: `Prüfe alle Stellen mit Kapital-/Beteiligungsbezug: Projektbörse (Abgrenzung „keine Börse im Sinne von BörsG/BörseG/FinfraG“ korrekt und sichtbar; keine Anlagevermittlung suggeriert), Investoren-Seiten (keine Anlageberatung/kein öffentliches Angebot; Formulierungen wie „Rendite“, „Beteiligung“, „Investment“ im Kontext), Entwicklungsbeteiligung/Genussrechte/Nachrangdarlehen-Reste (die Funktion muss ausgeschaltet unsichtbar sein – ist sie es? Suche nach Resten in öffentlichen Seiten), Rechner-Ergebnisse mit Geldbeträgen (Disclaimer „keine Anlage-/Rechts-/Steuerberatung“ wo nötig, ohne die Seiten zu entwerten), FMA/BaFin/FINMA-Risiken benennen (Dossier!), Bericht-PDFs/Seiten (Annahmenbuch vorhanden, keine Zusagen), Buchhaltungs-/Steuerangaben öffentlich (nur mit Quelle). KEINE neuen Disclaimergirlanden auf jede Seite – gezielt, wo rechtlich geboten; Vorschläge mit Begründung ins Dossier.` },
  { k: 'VERTRAEGE', name: 'Verträge, Muster, Bedingungen, Lizenzen', a: `Prüfe alle Muster und Bedingungen: /nutzungsbedingungen und /bedingungen/* (Banken, Lieferanten, Energiebeschaffung, Projektbörse) auf Konsistenz, Entwurfs-Kennzeichnung, AGB-Recht-Grobverstöße (überraschende Klauseln, Haftungsausschlüsse zu weit – ins Dossier), Muster-NDA (/projektboerse/muster-nda), Ratsvorlage-Muster, Widget-Einbettungsbedingungen (/partner/widgets – gibt es Nutzungsregeln? Haftung, Verfügbarkeit, Kündigung → Dossier-Entwurf), docs/strang-r Entwürfe noch noindex und konsistent mit dem Live-Stand?, Lizenzangaben Dritter: SMARD CC BY (Nennung korrekt?), opendata.swiss „Open use“ (Nennung ElCom), MaStR dl-de/by-2.0, OSM/BKG/basemap/swisstopo-Attribution auf den Kartenseiten, CC-BY-4.0-Vergabe der eigenen Downloads (Formulierung einheitlich), Bildlizenzen (18 Bilder – Status offen, nur Bestand dokumentieren). Schreibe zusätzlich docs/strang-r/pruefung-2026-10/kanzlei-briefing.md: fertiges Briefing-Dokument je Land für die externen Kanzleien (was zu prüfen, Unterlagenliste, offene Fragen).` },
]

phase('Prüfung')
const ergebnisse = await Promise.all(PAKETE.map((p) => slot(async () =>
  agent(`${REGELN}\n\nDEIN GEBIET ${p.k}: ${p.name}\n${p.a}`, { label: `Recht · ${p.k}`, phase: 'Prüfung' })
    .then((b) => ({ k: p.k, bericht: b }))
)))

phase('Abnahme')
const berichte = ergebnisse.filter(Boolean).map((e) => `## ${e.k}\n${e.bericht}`).join('\n\n')
const qm = await agent(`${REGELN}\n\nDu bist der QUALITÄTSMANAGER der Rechtsprüfung. Nur du darfst npm run verify vollständig laufen lassen (allein, am Ende EIN grüner Gesamtlauf; E2E-Flakes einzeln nachprüfen).\n1. Stichprobe: stimmen die behaupteten Fixes (gerendertes HTML je Land ansehen)? Haben die Juristen nichts Fachliches zerstört (Claim-Lint, Faktenregister-Gate, npm test, npx eslint auf geänderte Dateien)?\n2. Konsistenz der Rechtstexte DE-Fassung ↔ EN-Fassung (EN nur informativ, Hinweis vorhanden).\n3. Dossiers unter docs/strang-r/pruefung-2026-10/ vollständig, noindex, nicht in der Sitemap; kanzlei-briefing.md brauchbar.\n4. Fehler beheben, erneut prüfen, npm run verify GRÜN.\nRückgabe: Abnahmeprotokoll, die 10 wichtigsten Anwaltspunkte über alle Dossiers (je 1 Satz + Risiko), offene Inhaberpunkte, Commit-Vorschlag als JSON-Liste [{"titel":"…","pfade":["…"]}] (deutsche Titel, jede geänderte Datei in genau einem Commit; uebergabe/ und *.tmp.js nicht aufnehmen).\n\nBerichte:\n${berichte}`, { label: 'Recht · Qualitätsmanager', phase: 'Abnahme' })
return { qm, berichte: ergebnisse.filter(Boolean) }
