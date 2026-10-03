// qa/claim-lint/regeln.mjs
//
// Regelwerk des Claim-Lints (Paket F). Grundlage: Masterplan Abschnitt 3,
// S0 „Irreführung“ Punkte 11–17 (§ 5/§ 5a UWG, EmpCo), S2 /energie-live,
// S0 4–6 (Platzhalter in Impressum/Rechtstexten) und Paket D.
//
// Die Liste ist ein ENTWURF zur Abstimmung mit Strang R (Rechtstexte) –
// sie ist keine Rechtsprüfung. Ein Treffer heißt „ansehen und belegen oder
// ändern“, nicht „rechtswidrig“. Fehlende Treffer heißen nicht „rechtssicher“.
//
// Stufen:
//   fehler  – zählt für das Gate (--streng) und für die Paket-Abnahme (z. B. D: 0 Reizwörter)
//   hinweis – nur Bericht, fachlich prüfen (häufig legitim)
//
// Ausnahme im Code: Kommentar „claim-ok: <Begründung>“ in derselben oder der
// Zeile davor (JSX: {/* claim-ok: Beleg … */}). Ohne Begründung zählt sie nicht.

export const REGELN = [
  // ---- Reizwörter: Garantie/Risiko -------------------------------------------
  { id: "garantiert", art: "reizwort", stufe: "fehler", muster: /\bgarantier(t|te|ten|tes|ter|en)?\b/i, text: "Garantieaussage – nur mit belegbarer, tatsächlich gegebener Garantie (§ 5 UWG)" },
  { id: "risikofrei", art: "reizwort", stufe: "fehler", muster: /\b(risiko(frei|los)\w*|ohne (jedes )?Risiko|sichere[nr]? Rendite)\b/i, text: "Risikofreiheit/sichere Rendite – irreführend bei Anlage- und Pachtthemen" },
  // ---- Reizwörter: Superlative/Alleinstellung ---------------------------------
  { id: "immer-guenstigste", art: "reizwort", stufe: "fehler", muster: /\bimmer\s+(der|die|das|den)?\s*(günstigst|best|billigst)\w*/i, text: "„immer der/die günstigste“ – absolute Spitzenstellung ohne Beleg" },
  { id: "pionier", art: "reizwort", stufe: "fehler", muster: /\bPionier\w*/i, text: "„Pionier“ – Alleinstellung ohne Beleg" },
  { id: "marktfuehrer", art: "reizwort", stufe: "fehler", muster: /(\bMarktführer\w*|(?<!(?:§|Abs\.|Satz|Art\.|Anlage|Ziff\.|lit\.)\s*\d*[a-z]?\s*)\bNr\.\s?1\b(?![\d.,"'`])|\bNummer\s+1\b|\bführende[nrs]?\s+(Anbieter|Plattform|Projektentwickler|Partner)|einzigartig\w*|unschlagbar\w*|konkurrenzlos\w*)/i, text: "Spitzen-/Alleinstellung ohne Beleg" },
  { id: "geprueft", art: "reizwort", stufe: "fehler", muster: /\b(geprüft|verifiziert|zertifiziert)e?[nrs]?\s+(Projekte?|Flächen|Investoren|Käufer|Partner|Anbieter|Projektierer)\b/i, text: "„geprüfte Projekte/Investoren“ – nur mit offengelegtem Prüfumfang" },
  { id: "drei-laender", art: "reizwort", stufe: "fehler", muster: /\b(3|drei)\s+Länder(n)?\b/i, text: "„3 Länder“ – nur, wenn in allen drei Ländern tatsächlich aktiv (gestufter Start /ch)" },
  { id: "beliebt", art: "reizwort", stufe: "fehler", muster: /(["'`>]\s*Beliebt\s*["'`<]|\bbeliebtest\w*|\bmeistgelesen\w*|\bmeistgenutzt\w*|\bam häufigsten genutzt)/i, text: "„Beliebt“/„meistgelesen“ ohne Nutzungsdaten – erfundener Social Proof" },
  { id: "bankfaehig", art: "reizwort", stufe: "fehler", muster: /\bbank(fähig|konform|tauglich)\w*/i, text: "„bankfähig“ – nur mit dokumentierter Fachabnahme" },
  // ---- Umweltaussagen (EmpCo, § 5 UWG) ----------------------------------------
  { id: "umwelt-generisch", art: "reizwort", stufe: "fehler", muster: /\b(klimaneutral\w*|CO[2₂]-neutral\w*|klimafreundlich\w*|umweltfreundlich\w*|klimapositiv\w*|emissionsfrei\w*|umweltschonend\w*)/i, text: "Generische Umweltaussage – nach EmpCo nur mit anerkannter hervorragender Umweltleistung belegbar" },
  // ---- Irreführende Darstellung / strukturierte Daten -------------------------
  { id: "live-zaehler", art: "reizwort", stufe: "fehler", muster: /\bLive\s*[·•|]\s*\{?\s*\d*/, text: "„Live · N …“ – nur ohne Demo-/Testdaten zulässig" },
  { id: "jsonld-offer", art: "reizwort", stufe: "fehler", muster: /(["']@type["']\s*:\s*["'](Offer|AggregateOffer)["']|\bInStock\b|schema\.org\/InStock)/, text: "JSON-LD Offer/InStock – Projekte sind keine verfügbaren Waren" },
  { id: "energie-live-takt", art: "reizwort", stufe: "fehler", muster: /\balle\s+(5|fünf)\s+Minuten\b/i, text: "„alle 5 Minuten“ – Aktualisierungstakt der Quelle prüfen (/energie-live)" },
  // ---- Hinweise (häufig legitim, fachlich ansehen) ----------------------------
  { id: "kostenlos", art: "reizwort", stufe: "hinweis", muster: /\b(kostenlos\w*|kostenfrei\w*|gratis|unentgeltlich)\b/i, text: "„kostenlos“ – Vergütung/Provision offengelegt? (Reststrom, Pachtangebot-Check)" },
  { id: "superlativ", art: "reizwort", stufe: "hinweis", muster: /\b(günstigst|höchst|best)(e|en|er|es|möglich\w*)\b/i, text: "Superlativ – Vergleichsbasis belegt?" },
  { id: "nachhaltig", art: "reizwort", stufe: "hinweis", muster: /\bnachhaltig\w*/i, text: "„nachhaltig“ – konkrete Umweltleistung benennen statt allgemeiner Aussage (EmpCo)" },
  { id: "genossenschaft-praesens", art: "reizwort", stufe: "hinweis", muster: /\b(unsere|der|die)\s+Genossenschaft\s+(ist|hat|bietet|zahlt|schüttet)\b/i, text: "Genossenschaft im Präsens – Stand „in Vorbereitung“?" },

  // ---- Platzhalter -------------------------------------------------------------
  { id: "todo", art: "platzhalter", stufe: "fehler", muster: /\b(TODO|FIXME|XXX|TBD)\b/, text: "offener Platzhalter/To-do", auchKommentar: "hinweis" },
  // case-sensitiv: die Eigenschaft „platzhalter:“ (Eingabe-Platzhalter) ist kein Fund
  { id: "platzhalter-wort", art: "platzhalter", stufe: "fehler", muster: /(\bPLATZHALTER\b|\bPlatzhalter\b|\b[Ll]orem ipsum\b|\[\s*(Name|Anschrift|Adresse|Telefon|Tel\.|E-Mail|UID|USt-IdNr\.?|Firmenbuch\w*|Handelsregister\w*|Datum|Ort|Registergericht|Geschäftsführ\w*)[^\]]{0,40}\])/, text: "Platzhalter im Text", auchKommentar: "hinweis" },
  { id: "null-kontakt", art: "platzhalter", stufe: "fehler", muster: /(mailto:\s*(\$\{)?\s*null|tel:\s*(\$\{)?\s*null|["'`]null["'`]\s*[,}]|\b(telefon|email|uid|tel)\s*:\s*null\b)/i, text: "Kontaktangabe null (Impressum/Kontakt)" },
  { id: "entwurf-flag", art: "platzhalter", stufe: "fehler", muster: /\bENTWURF\s*=\s*true\b/, text: "Rechtstext steht auf ENTWURF – nur mit noindex und ohne verbindliche Akzeptanz" },

  // ---- Testdaten -----------------------------------------------------------------
  { id: "testdaten", art: "testdaten", stufe: "fehler", muster: /(\(Demo\)|\bTest-?projekt\w*|\bTestdaten\b|\bTestfläche\w*|\bMuster(mann|frau|stadt|weg|straße|dorf)\b|\bBeispiel (GmbH|AG|KG)\b|@(example|test)\.(com|org|de|at|ch)\b|\bexample\.(com|org)\b)/i, text: "Test-/Demodaten auf öffentlicher Seite", ausserWenn: /\bplaceholder=|\bplatzhalter\s*:/ },
];

// ---- ß in CH-Texten -------------------------------------------------------------
// In der Schweiz wird kein ß geschrieben. Geprüft werden
//  (1) ganze Dateien mit Schweizer Zielgruppe (Liste unten, erweiterbar),
//  (2) in allen Dateien Zeilen, die als CH-Datensatz erkennbar sind (land: "CH").
export const CH_DATEIEN = [
  "src/data/regionen/schweiz.js",
  "src/content/ratgeber/freiflaechen-pv-schweiz.js",
  "src/app/ch/**", // ab Welle 2 (Länderpfade)
  "src/content/ch/**",
];
export const CH_ZEILE = /\bland\s*:\s*["'](CH|ch)["']/;
export const CH_REGEL = { id: "ch-eszett", art: "ch-eszett", stufe: "fehler", text: "ß in Text für die Schweiz (CH-Schreibung: ss)" };

// ---- Prüfumfang -------------------------------------------------------------------
// Öffentlich ausgelieferte Inhalte. Portal/API/Demo-Backend sind ausgenommen
// (Testdaten dort sind gewollt; Logins sind keine Werbung).
export const STANDARD_UMFANG = ["src/app/**", "src/components/**", "src/data/**", "src/content/**", "public/llms.txt"];
export const AUSGENOMMEN = [
  "src/app/portal/**",
  "src/app/api/**",
  "src/components/Portal/**",
  "src/app/design/**", // interner Styleguide
  "src/app/login/page.js", // Demo-Konten nur bei istDemo() – Nachweis „ohne Demo keine Testdaten“ gehört in die E2E (Paket D)
  "**/*.test.*",
  "**/*.css",
  "src/content/ratgeber/README.md",
];

// ---- Paket-Dateilisten (Masterplan Abschnitt 11) ---------------------------------
// Damit jedes Paket seine eigenen Dateien prüfen kann: --paket D
export const PAKETE = {
  D: [
    "src/app/freiflaeche/**",
    "src/app/landwirte/**",
    "src/app/investoren/**",
    "src/app/en/**",
    "src/app/projektboerse/page.js",
    "src/app/projektboerse/[slug]/**",
    "src/components/Home/**",
    "src/components/Reststrom/Seite/**",
    "src/data/unternehmen.js",
    "src/data/referenzen.js",
    "src/app/impressum/**",
    "src/app/barrierefreiheit/**",
    "src/app/genossenschaft/**",
  ],
  E: ["src/lib/invest/markt.js", "src/lib/rechner/**", "src/components/Rechner/**"],
  G: [
    "src/content/ratgeber/**",
    "src/data/lexikon.js",
    "src/data/faq.js",
    "src/data/regionen/**",
    "src/app/kommunen/**",
    "src/app/rechner/kommune/page.js",
  ],
  I: ["src/app/robots.js", "src/app/sitemap.js", "src/app/layout.js", "src/data/site.js"],
};
