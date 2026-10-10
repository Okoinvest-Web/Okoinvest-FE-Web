// src/content/newsroom/index.js – Meldungen des Newsrooms (Welle 3, Paket NL)
//
// Struktur wie der Ratgeber (src/content/ratgeber/README.md): kurzFazit, abschnitte mit bloecke, quellen – gerendert
// mit ArtikelInhalt. Zusätzlich je Meldung:
//   typ        "pressemitteilung" | "fachbeitrag"
//   laender    ["DE"] | ["AT"] | ["CH"] | mehrere – Inhalte, Recht und Zahlen je Land getrennt
//   ort, datum Ortsmarke und Datum (Pressemitteilung)
//   status     "entwurf" | "freigegeben"
//   freigabe   { von, am } – Pflicht für "freigegeben" (Geschäftsführung; Klasse-A-Inhalte zusätzlich E6)
//
// ÖFFENTLICH ist eine Meldung NUR mit status "freigegeben" UND freigabe.von/am (src/lib/newsroom.js). Entwürfe
// erscheinen nirgends – weder auf der Seite noch in Sitemap, Feed oder JSON-LD.
//
// REGELN (Masterplan Abschnitt 7, Inhaber): keine erfundenen Meldungen, Zahlen nur aus dem Faktenregister mit Quelle
// und Stand, keine Umweltaussagen („grün“, „klimaneutral“), keine Fremdmarken. Presse unter dem Namen ÖkoInvest erst,
// wenn der Inhaber den Newsroom freigibt (Domain oekoinvest.com noch nicht gekauft).

export const MELDUNGEN = Object.freeze([
  // Vorlage – bewusst ohne Inhalt, nie öffentlich. Kopieren, ausfüllen, von der Geschäftsführung freigeben lassen.
  Object.freeze({
    slug: "vorlage-fachbeitrag",
    typ: "fachbeitrag",
    status: "entwurf",
    freigabe: null,
    laender: ["DE"],
    ort: "",
    datum: "",
    title: "[ENTWURF] Vorlage Fachbeitrag – nicht veröffentlichen",
    description: "[ENTWURF] Kurzbeschreibung, 140–160 Zeichen.",
    excerpt: "[ENTWURF] Ein bis zwei Sätze für die Karte.",
    kurzFazit: [],
    abschnitte: [],
    quellen: [],
  }),
]);
