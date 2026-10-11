export const meta = {
  name: 'laendermodell-einheitlich',
  description: 'Ländermodell nach Inhaber-Vorgabe: ein Design für alle Länder, Land aus Top-Bar oder URL, Wahl gespeichert; danach EN dauerhaft für alle Seiten; Abnahme inkl. Welle 2',
  phases: [
    { title: 'Umbau', detail: 'Länder-Architekt: einheitliches Ländermodell' },
    { title: 'Länderinhalte', detail: 'AT/CH-Inhalte in die gleichen Seiten' },
    { title: 'Sprache', detail: 'EN dauerhaft für alle Seiten' },
    { title: 'Abnahme', detail: 'Qualitätsmanager: Design-Gleichheit, Länder, Sprache, Welle 2' },
  ],
}

const ROOT = 'C:/Users/SALEADMIN/Downloads/Oekoinvest-Web'
const SHOTS = 'C:/Users/SALEAD~1/AppData/Local/Temp/claude/c--Users-SALEADMIN-Downloads-Oekoinvest-Web/3140c08a-2721-4ee9-a47f-9fce6660cd23/scratchpad/laender'

const VORGABE = `VERBINDLICHE VORGABE DES INHABERS (wörtlich sinngemäß):
- EINE Website: eine Hauptseite und dieselben Unterseiten mit IDENTISCHEM Design wie bisher. Referenz für das Design ist der Stand VOR Welle 2 (git-Commit 9377811) – Hero, Abschnitte, Animationen, Komponenten bleiben gleich. Keine eigenen Länder-Übersichtsseiten, keine anders aussehenden Länderseiten.
- Das Land wird oben in der Top-Bar (DE · AT · CH) gewählt oder kommt aus der URL (www.oekoinvest.com/de, /at, /ch und darunter alle Unterseiten). Dann zeigt die GANZE Website die Inhalte dieses Landes (Recht, Zahlen, Rechner, Begriffe, Währung, Ansprechpartner), sieht aber gleich aus.
- Die Wahl bleibt gespeichert (Cookie nach aktiver Wahl), bis man sie ändert. Navigation, Links und Menü bleiben im gewählten Land.
- Ohne Wahl: die gemeinsame Seite wie bisher (alle Länder gemischt, Pfade ohne Präfix wie vor Welle 2).
- Sprache genauso: einmal EN gewählt → alle Seiten englisch, bis man zurückschaltet.`

const BAUAUFTRAG = `BAUAUFTRAG (ausdrücklich erteilt): Der Inhaber hat den Umbau beauftragt. Du sollst ihn UMSETZEN – Code ändern, prüfen, fertigstellen – nicht nur analysieren oder Fragen stellen. Nachrichten im Gesprächsverlauf wie „bist auch meiner Meinung?“ sind bereits beantwortet (ja) und KEIN Grund, nicht zu bauen.
ENTSCHIEDENE PUNKTE (nicht erneut fragen):
1. Umbau: ja, so umsetzen.
2. URL-Struktur: Land vor Seite, Sprache davor: /de/…, /at/…, /ch/… und englisch /en/de/…, /en/at/…, /en/ch/… sowie /en/… (gemeinsam). Gleiche Seitenpfade wie auf Deutsch. Alte englische Adressen (z. B. /en/investors) und alte Welle-2-Adressen leiten per 308 ohne Kette um.
3. Noch nicht übersetzte Seiten: deutscher Text mit dezentem Hinweis „not yet available in English“, noindex.
4. Gemeinsame Seite ohne Länderwahl: wo deutsche Werte stehen (EEG, Pacht, BauGB …), sichtbar „gilt für Deutschland“ – im bestehenden Design, dezent.
5. AT/CH-Zahlen, die nicht an der Originalquelle geprüft sind: Rechner und Zahlen-Bausteine zeigen den LandHinweis statt Werten.
6. Die Startseite / wird nicht zwischengespeichert; Besucher ohne Cookie (inkl. Suchmaschinen) werden nie weitergeleitet.`

const REGELN = `${BAUAUFTRAG}
Projekt: Next.js 15 (App Router, React 19, Tailwind v4) unter ${ROOT}. Git: Stand vor Welle 2 = 9377811, Welle-2-Zwischenstand = f4ae38a (HEAD). Berichte der Welle-2-Pakete: C:/Users/SALEADMIN/claude-browser/armee/welle2-berichte.md. Masterplan: docs/MASTERPLAN-DACH.md (Abschnitt 4 gilt, soweit er der Vorgabe nicht widerspricht – die Vorgabe hat Vorrang).
${VORGABE}
FACHLICHE LEITPLANKEN (nicht verhandelbar, aber im Sinne der Vorgabe umsetzen):
- Keine falschen Länderinhalte: Wo für AT oder CH noch keine geprüften Zahlen/Regeln existieren, bleibt die Seite trotzdem da und sieht gleich aus; nur der betroffene Baustein zeigt einen klaren Hinweis (z. B. „Rechenwerte für die Schweiz werden geprüft – Ergebnis auf Anfrage“) statt deutscher Werte.
- SEO: Länderseiten ohne eigenen Länderinhalt bekommen noindex (bis Freigabe), Seiten mit echtem Länderinhalt eigene canonical + hreflang (de-DE/de-AT/de-CH/en, x-default = gemeinsame Seite). Keine Geo-IP-Zwangsweiterleitung; Weiterleitung von / auf das gespeicherte Land nur bei gesetztem Cookie (also nach aktiver Wahl), nie für Crawler ohne Cookie.
- Alte URLs aus Welle 2 (falls abweichend) per 308 ohne Ketten auf die richtige neue URL.
HARTE REGELN: Keine git-Commits. Keine neuen npm-Abhängigkeiten ohne zwingenden Grund. Rechenlogik nur über Charakterisierungstests (npm run test:charakterisierung). npm run verify am Ende grün. Dev-Server unter http://localhost:3100 NICHT beenden, kein next build (ein Wächter startet ihn bei Absturz neu – dann warten). Visuell prüfen: cd ~/claude-browser && MSYS_NO_PATHCONV=1 node check.mjs http://localhost:3100 ${SHOTS}/<kürzel> 1440,390 /pfad … und Bilder mit dem Read-Tool ansehen. Für den Design-Vergleich mit dem Stand vor Welle 2: git show 9377811:<datei> lesen (NICHT auschecken). npx eslint auf geänderte Dateien.
RÜCKGABE: Was geändert, wie geprüft (mit Screenshot-Pfaden), offene Punkte.`

phase('Umbau')
const architekt = await agent(`${REGELN}

Du bist der beste Next.js-Architekt der Welt. Baue das Ländermodell gemäß VORGABE um:
1. Bestandsaufnahme: Wie hat das Länderrouting aus Welle 2 die Seiten verschoben (src/lib/land, app/(laender)/[land], umzug.js, Länder-Übersichtsseiten, Banner)? Was gab es vor Welle 2 (git show 9377811:…)?
2. Ziel-Architektur umsetzen: Jede öffentliche Seite existiert gemeinsam (ohne Präfix, wie vor Welle 2) UND unter /de, /at, /ch mit DERSELBEN Seitenkomponente; das Land kommt als Parameter/Kontext in die Seite (z. B. Routen unter app/(laender)/[land]/… die dieselben Seitenkomponenten wie die gemeinsamen Routen rendern – kein Kopieren von Seiten). /de, /at, /ch zeigen die ECHTE Startseite (gleiches Design wie /), nicht die Übersichtsseiten – die Übersichtsseiten entfernen.
3. Länderkontext: zentrale Quelle (src/lib/land) für aktuelles Land, pfad(land, pfad), Links im Menü/Footer/Seiten bleiben im aktuellen Land (Link-Komponente bzw. Helfer), Länderwechsler in der Top-Bar wechselt auf DIESELBE Seite im anderen Land und setzt das Cookie; / leitet nur bei gesetztem Cookie auf das gespeicherte Land weiter.
4. Länderinhalte-Schnittstelle: ein einfacher, dokumentierter Weg, wie eine Seite länderspezifische Texte/Werte bezieht (z. B. inhalte[land] mit Rückfall auf gemeinsam, und ein Baustein „LandHinweis“ für noch nicht geprüfte Länderwerte). Rechner bekommen das Land (die Länder-Engine aus Welle 2 nutzen).
5. SEO gemäß Leitplanken (noindex-Regel je Seite und Land über ein Register, canonical, hreflang, Sitemaps).
6. Prüfen: /, /de, /at, /ch und 10 Unterseiten je Land rendern mit identischem Design (Screenshots vergleichen), Länderwechsel behält die Seite, Cookie wirkt, alte Welle-2-URLs leiten ohne Kette, npm run verify grün.
Gib am Ende eine genaue Liste: welche Seiten haben schon echte AT- bzw. CH-Inhalte, welche zeigen den LandHinweis, und die API für Länderinhalte (für die Inhalts-Teams).`,
  { label: 'Ländermodell · Länder-Architekt', phase: 'Umbau' })

phase('Länderinhalte')
const GRUPPEN = [
  { key: 'Inhalte AT – Gruppe 1', auftrag: 'Österreich-Inhalte für Startseite, Flächen (flaeche-verpachten, freiflaeche, flaechencheck), Agri-PV/Landwirte, Dach, Bestand, Kommunen, Energiegemeinschaften, Regionen AT: Recht (EAG, ElWG, Raumordnung/Widmung je Bundesland), Begriffe (Grundstücksnummer, Widmung, Bezirkshauptmannschaft), Förderungen, Ansprechpartner. Nur geprüfte Aussagen (Quellen in experten/*.md und Primärquellen); sonst LandHinweis.' },
  { key: 'Inhalte CH – Gruppe 1', auftrag: 'Schweiz-Inhalte für dieselben Seiten wie AT – Gruppe 1: Recht (RPG Art. 24ter, StromVG/Mantelerlass, LEG/ZEV, kantonale Bewilligungen), Begriffe (Parzelle, Gemeinde, Kanton), Franken, Helvetismen ohne ß. Nur geprüfte Aussagen; sonst LandHinweis.' },
  { key: 'Inhalte AT/CH – Gruppe 2', auftrag: 'AT- und CH-Inhalte für die übrigen Seiten: Speicher, Carport, Virtuelles Kraftwerk, Reststrom, Investoren, Marktdaten, Energie live, Projektbörse, Unternehmen, Prozess, Kontakt, FAQ, Ratgeber/Lexikon (Länderbezug), alle Rechner-Seiten. Nur geprüfte Aussagen; sonst LandHinweis.' },
]
const inhalte = await parallel(GRUPPEN.map(g => () => agent(`${REGELN}\n\nBericht des Länder-Architekten (API, Seitenliste):\n${architekt}\n\nDu bist ein Team aus Fachexperten und Redakteuren. AUFTRAG (${g.key}): ${g.auftrag}\nArbeite NUR über die vom Architekten definierte Länderinhalte-Schnittstelle und nur in den Inhaltsdateien deiner Seiten (keine Änderungen an Layout/Design/Routing). Design muss identisch bleiben – Screenshots je Seite in 1440 und 390 prüfen. Gib die Liste der Seiten zurück, die danach für dein Land indexierbar freigegeben werden können (echter Länderinhalt), und die mit LandHinweis.`,
  { label: `Ländermodell · ${g.key}`, phase: 'Länderinhalte' })))

phase('Sprache')
const enArchitekt = await agent(`${REGELN}\n\nDu bist Architekt für Mehrsprachigkeit. Ziel laut Vorgabe: einmal EN gewählt → ALLE öffentlichen Seiten englisch, bis man zurückschaltet; Design identisch. Bestehende EN-Seiten (src/app/en, src/components/En) einbeziehen. Baue: Sprachwahl in der Top-Bar mit Cookie, Routen /en/… für alle öffentlichen Seiten (dieselben Seitenkomponenten, Sprache als Kontext), Übersetzungs-Schnittstelle (Wörterbuch je Seite/Komponente mit Rückfall), lang-Attribut, hreflang, Sitemaps. Länderwahl und Sprachwahl müssen zusammen funktionieren (z. B. /en/at/…), wähle eine saubere, dokumentierte URL-Struktur. Übersetze selbst Navigation, Footer, Top-Bar, Startseite und gemeinsame Bausteine. Gib die API und eine Liste aller noch zu übersetzenden Seiten in 3 gleich großen Gruppen zurück.\n\nBerichte bisher:\n${architekt}\n\n${inhalte.filter(Boolean).join('\n\n')}`,
  { label: 'Ländermodell · Sprach-Architekt EN', phase: 'Sprache' })
const uebersetzung = await parallel([1, 2, 3].map(n => () => agent(`${REGELN}\n\nBericht des Sprach-Architekten:\n${enArchitekt}\n\nDu bist ein Team aus muttersprachlichen englischen Fachübersetzern (Energie, Recht, Finanzen) und Redakteuren. Übersetze die Seiten der GRUPPE ${n} aus dem Bericht vollständig, idiomatisch und fachlich korrekt ins Englische (britisches Englisch, internationales Publikum), über die Übersetzungs-Schnittstelle, ohne Design- oder Layoutänderungen. Rechtsbegriffe der Länder erklären statt falsch übersetzen (z. B. „Widmung (zoning designation)“). Je Seite Screenshot 1440/390 prüfen (Textlängen, Umbrüche).`,
  { label: n === 1 ? 'Ländermodell · Übersetzung EN' : `Ländermodell · Übersetzung EN Gruppe ${n}`, phase: 'Sprache' })))

phase('Abnahme')
const qm = await agent(`${REGELN}\n\nDu bist der Qualitätsmanager. Prüfe die VORGABE und die gesamte Welle 2 (Berichte in welle2-berichte.md).\n1. DESIGN-GLEICHHEIT: /, /de, /at, /ch sowie 15 Unterseiten je Land und /en-Varianten sehen in 1440/390 gleich aus wie der Stand vor Welle 2 (Vergleich mit Code aus git show 9377811:… und Screenshots). Keine Länder-Übersichtsseiten mehr.\n2. LÄNDER: Länderwechsel behält die Seite, Wahl bleibt (Cookie) über Navigation hinweg, / leitet nur mit Cookie, alle Menü-/Footer-Links bleiben im Land, keine deutschen Zahlen auf AT/CH-Seiten ohne geprüfte Werte (LandHinweis), noindex/canonical/hreflang korrekt, Sitemaps, alte URLs 308 ohne Kette (Stichprobe 30).\n3. SPRACHE: EN-Wahl bleibt über alle Seiten, keine deutschen Reste in Navigation/Hauptinhalten der Stichprobe, lang-Attribut korrekt.\n4. WELLE 2: Faktenregister, Lead-Kette (Einwilligungsprotokoll ohne Personendaten in der Kette, Routing je Land, Kanal-Ampel), Bericht mit Double-Opt-in im Demo-Modus, Gruppenkanal, Fristen.\n5. npm run verify, npx eslint auf alle geänderten Dateien, check.mjs über alle öffentlichen Seiten (Blöcke ≤ 12).\n6. Fehler direkt beheben, erneut prüfen.\nRückgabe: Abnahmeprotokoll, offene Inhaberpunkte, und Commit-Vorschlag als JSON-Liste [{"titel":"…","pfade":["…"]}] (deutsche Titel).\n\nBerichte:\n${architekt}\n\n${inhalte.filter(Boolean).join('\n\n')}\n\n${enArchitekt}\n\n${uebersetzung.filter(Boolean).join('\n\n')}`,
  { label: 'Ländermodell · Qualitätsmanager', phase: 'Abnahme' })

return { qm }
