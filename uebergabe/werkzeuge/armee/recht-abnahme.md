ABNAHMEPROTOKOLL – QM Rechtsprüfung (11.10.2026)

**1. Stichprobe der behaupteten Fixes (gerendertes HTML, Dev-Server :3100)**
Alle als „direkt behoben“ gemeldeten Punkte sind im gerenderten HTML nachgewiesen (DE, AT-, CH-Fassung und EN):
- /datenschutz: neue Abschnitte 5a (Bericht per E-Mail), 5b (Newsletter), 9a (Karten im Flächenpass), Widgets-Satz in Abschn. 4, Korrektur „Keine Kategorie ‚Funktional‘“, 3 neue Speicherfristen, Stand 11. Oktober 2026 – identisch auf /at/datenschutz und /ch/datenschutz; EN-Spiegelung in /en/datenschutz vollständig (5a/5b/9a, Fristen, „Functional“-Korrektur), alle neuen Passagen mit Entwurfs-Markierung.
- /barrierefreiheit: Geltungsbereich um Welle-3/4-Werkzeuge erweitert (DE+EN, „Netzanschluss-Begleiter“/„grid connection companion“, Newsletter/Newsroom).
- /bedingungen/banken: Firmierung „ÖkoInvest und ihren Projektgesellschaften“ (DE+EN), kein Rest „ÖkoInvest-Gruppe“ mehr.
- Startseite: „Auf Plausibilität vorgeprüfte Projekte“ / „Projects pre-checked for plausibility“, alte Fassung entfernt (DE+EN).
- Rechner (RechnerSeite.js): Annahmenblock und Druckfuß tragen jetzt „kein Angebot und keine Anlage-, Rechts- oder Steuerberatung“ (DE+EN, geprüft an /rechner/solarpark).
Nichts Fachliches zerstört: npm test 974/974 grün; npx eslint auf alle 6 geänderten Dateien grün; Claim-Lint-Treffer in den geänderten Dateien sind ausschließlich Bestands-Platzhalter (dossier-bekannt, H1), keine neuen Funde; Faktenregister-Check eigenständig GRÜN (163 Fakten, 0 ohne Quelle/Abruf, 0 abgelaufene Klasse A).

**2. Konsistenz DE ↔ EN:** Alle EN-Rechtstexte (/en/impressum, /en/datenschutz, /en/nutzungsbedingungen, /en/barrierefreiheit, /en/bedingungen/banken und /projektboerse) tragen den Hinweis „information only. Only the German version is legally binding.“ Die neuen Datenschutz-Abschnitte sind strukturgleich gespiegelt (5a/5b/9a, Fristenzeilen, Abschnitt-10-Korrektur).

**3. Dossiers:** docs/strang-r/pruefung-2026-10/ vollständig: impressum-dsgvo.md (H3/M9/N5 = 17 ✓), uwg-claims.md (H2/M4/N5 + 1 Verweis = 11 ✓), finanz.md (H3/M5/N3 = 11 ✓), vertraege.md (H6/M7/N4 = 17 ✓) – Zählungen stimmen mit den Kopfangaben überein; jeder Punkt mit Fundstelle, Risiko, Vorschlag, Rechtsgebiet, Land; Kopf je Datei „keine Rechtsberatung, Entscheidung durch Strang R“. Die Dateien sind reine Markdown-Dokumente, werden nicht ausgeliefert (HTTP 404), stehen nicht in der Sitemap (0 Treffer strang-r/pruefung) – noindex damit gegenstandslos erfüllt. kanzlei-briefing.md ist brauchbar: Mandantin/Sachverhalt, Textübersicht mit Fassungsfrage, Unterlagenliste, getrennte Prüfaufträge AT (federführend)/DE/CH, gewünschtes Arbeitsergebnis, Zeitrahmen.

**4. npm run verify: GRÜN** (einziger Gesamtlauf, 1418 s, qa/out/verify-2026-10-11T08-14-40.json): Unit/Charakterisierung ok (141 s), Rechner-Selbsttest ok, Claim-Lint ok (128 Fehler/318 Hinweise als Bericht, nicht streng – Bestandszustand, siehe UWG-N4), Faktenregister ok, Ländermodell ok, axe 10 Kernseiten ok, E2E ok ohne Flakes (Exit 0). Keine Fehler zu beheben; keine Commits angelegt, Dev-Server läuft.

**Die 10 wichtigsten Anwaltspunkte über alle Dossiers**
1. V-H1 (hoch): Die Registrierung erzwingt die verbindliche Annahme von Entwurfs-Nutzungsbedingungen per Pflicht-Haken, ohne Fassung und Zeitpunkt der Zustimmung zu speichern.
2. H1 Impressum/DSGVO (hoch): Sichtbare Platzhalter (Hosting, ERP, Mail, Backup, Identitätsanbieter u. a.) und fehlende AV-Verträge machen einen Livegang der Datenschutzerklärung derzeit unzulässig (Art. 13/14, 28 DSGVO).
3. F-01/V-H5 (hoch): Die entgeltliche Nachweis-/Vermittlungstätigkeit der Projektbörse (Provision 1,5–3 %, auch Share Deals) braucht vor Livegang das Erlaubnis-Gutachten je Land (KWG/§ 34c GewO, WAG 2018, FIDLEG/FINIG) – Blocker.
4. H2 Impressum/DSGVO (hoch): Die GwG/FM-GwG-Verpflichtetenstellung ist ungeklärt und bestimmt Rechtsgrundlage und 5-Jahres-Frist der gesamten KYC/KYB-Verarbeitung.
5. V-H2/V-H3 (hoch): § 20 (unbegrenzte Zustimmungsfiktion) und § 16 Abs. 3 (pauschaler Haftungsausschluss) der Nutzungsbedingungen sind voraussichtlich unwirksam und neu zu fassen.
6. F-02 (hoch): Die öffentlich beschriebene Entwicklungsbeteiligung/Co-Development kann als AIF (KAGB/AIFMG/KAG) qualifizieren und sollte bis zur Freigabe ohne Konditionen oder hinter Professionellen-Schranke stehen.
7. H3 Impressum/DSGVO (hoch): Die biometrische Online-Identifizierung (Art. 9 DSGVO) darf ohne geklärten Anbieter, Rollenverteilung und Einwilligungs-Flow nicht aktiviert werden.
8. UWG-H1 (hoch): Kennzahl „3 Länder“ und der Energiegemeinschafts-Hero können bei gestuftem CH-Start als Irreführung über den Tätigkeitsumfang wirken (§ 5 UWG DE / § 2 UWG AT / Art. 3 UWG CH).
9. UWG-H2 (hoch): Der Pachtangebot-Check bewertet fremde Angebote ohne Offenlegung, dass ÖkoInvest selbst Flächen pachtet (§ 5a UWG, Masterplan S0-16 offen).
10. V-H4 + F-03 (hoch/mittel): Live-Nutzungsbedingungen und Strang-R-Entwürfe laufen auseinander (führende Fassung bestimmen), und die Genossenschafts-Vormerkung ist je Land auf Prospekt-/Pre-Marketing-Zulässigkeit zu bestätigen.

**Offene Inhaberpunkte**
- Platzhalter-Entscheidungen: Dienstleister (Hosting, ERP, Mail, Backup, Video, Identität, Auskunfteien, Verrechnungsstellen) festlegen und AV-Verträge schließen (H1); Vertragswerte der Bedingungen (Vergütungssätze, Haftungshöchstbetrag, Fristen, Vertragsstrafen, Gerichtsstand – V-M5).
- Belege liefern: CH-Tätigkeit oder Umformulierung „3 Länder“ (UWG-H1), Reststrom-PPA (UWG-M1), „~50 MWp/Jahr“-Substantiierung (UWG-M2), Lizenz-/Kaufnachweise der 18 Bilder (V-H6).
- Entscheidungen: führende NB-Fassung (Live 30.09. vs. Entwurf 03.10., V-H4), Teilnahme Verbraucherschlichtung (P-74), Mindestbetrag/Zielgruppe Entwicklungsbeteiligung (F-02), Umbenennung „Sparbrief“ (F-05), Kanzlei-Mandatierung je Land (Briefing liegt bereit).
- QM-Empfehlung: Claim-Lint-Allowlist pflegen und Gate scharf schalten (--streng), derzeit 128 Bestands-Fehler mit Exit 0 (UWG-N4).
- Weiterhin offen aus Übergabe § 6: DE-Beispielwerte auf AT/CH-Seiten, vier AT-Seiten ohne Index-Freigabe, api/land-Route.

**Commit-Vorschlag**
```json
[
  {"titel": "Datenschutzerklärung: Bericht-Baustein, Newsletter, Flächenpass-Karten und Widgets ergänzt, Karten-Kategorie korrigiert (DE+EN)", "pfade": ["src/app/(stamm)/datenschutz/page.js", "src/components/Rechtstexte/DatenschutzEn.js"]},
  {"titel": "Barrierefreiheitserklärung: Geltungsbereich um Welle-3/4-Werkzeuge erweitert (DE+EN)", "pfade": ["src/app/(stamm)/barrierefreiheit/page.js"]},
  {"titel": "Banken-Bedingungen: Firmierung im Lead vereinheitlicht (ÖkoInvest und ihre Projektgesellschaften)", "pfade": ["src/app/(stamm)/bedingungen/banken/page.js"]},
  {"titel": "Startseite: Investoren-Kachel auf Plausibilitätsprüfung präzisiert (DE+EN)", "pfade": ["src/app/(stamm)/page.js"]},
  {"titel": "Rechner: Hinweis um Ausschluss von Anlage-, Rechts- und Steuerberatung erweitert (DE+EN)", "pfade": ["src/components/Rechner/RechnerSeite.js"]},
  {"titel": "Rechtsprüfung Oktober 2026: Anwaltsdossiers und Kanzlei-Briefing (Strang R)", "pfade": ["docs/strang-r/pruefung-2026-10/impressum-dsgvo.md", "docs/strang-r/pruefung-2026-10/uwg-claims.md", "docs/strang-r/pruefung-2026-10/finanz.md", "docs/strang-r/pruefung-2026-10/vertraege.md", "docs/strang-r/pruefung-2026-10/kanzlei-briefing.md"]}
]
```