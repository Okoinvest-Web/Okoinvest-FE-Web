// src/lib/bericht/texte.js
//
// Texte des Bericht-Bausteins (Welle 2, Paket B4).
//
// ┌──────────────────────────────────────────────────────────────────────────────────────────────┐
// │ ENTWURF · Prüfung Rechtsabteilung. Alle Hinweis- und Haftungstexte hier sind bestmöglich      │
// │ formuliert, aber nicht freigegeben. Jede Textänderung → BERICHT_TEXT_VERSION erhöhen (der     │
// │ SHA-256 des Wortlauts steht im Einwilligungsprotokoll).                                        │
// └──────────────────────────────────────────────────────────────────────────────────────────────┘
//
// Rechtliche Linie (zu prüfen durch die Rechtsabteilung):
//  - Der Bericht ist eine angeforderte Leistung (Art. 6 Abs. 1 lit. b DSGVO). Werbung ist er nicht.
//  - Double-Opt-in, weil die E-Mail-Adresse nicht geprüft ist (Nachweis, dass die Inhaberin/der Inhaber
//    den Bericht wirklich wollte). Protokoll: Eintrag art "einwilligung" bei der Anforderung, art "doi" bei der
//    Bestätigung, zweck "bericht" (src/lib/plattform/backend/leadkette.js, Paket B3).
//  - Newsletter und Werbeanruf NUR über die getrennten, nicht vorbelegten Häkchen aus src/lib/anfrage/hinweise.js.
//  - Mit der Bestätigung entsteht ein Vorgang beim Team (transparent im Formular gesagt).

export const BERICHT_TEXT_VERSION = "ENTWURF-2026-10-03";
export const KENNZEICHNUNG_RECHT = "Entwurf · Prüfung Rechtsabteilung";

/** Wortlaut beim Absenden (Hash → Protokoll art "einwilligung", zweck "bericht") */
export const ANFORDERUNG = Object.freeze({
  textId: "bericht_anforderung",
  text: "Bitte senden Sie mir einen Bestätigungslink für den Bericht zu diesem Ergebnis an meine E-Mail-Adresse.",
  hinweis:
    "Wir nutzen Ihren Namen und Ihre E-Mail-Adresse, um Ihnen den Bericht bereitzustellen. Nach Ihrer Bestätigung legen wir zu diesem Ergebnis eine Anfrage bei unserem Team an; wir können Sie dazu einmal persönlich ansprechen. Ohne Bestätigung löschen wir Ihre Angaben nach 48 Stunden.",
  verweisVor: "Einzelheiten und Ihre Rechte finden Sie in der",
  verweisLink: "Datenschutzerklärung",
});

/** Wortlaut auf der Bestätigungsseite (Hash → Protokoll art "doi", zweck "bericht") */
export const DOI = Object.freeze({
  textId: "bericht_doi",
  titel: "Bericht bestätigen",
  text: "Ja, ich habe diesen Bericht angefordert und bestätige meine E-Mail-Adresse.",
  knopf: "Bestätigen und Bericht öffnen",
});

/** Grenzen und Haftung – auf jeder Berichtsseite (Kennzeichnung KENNZEICHNUNG_RECHT) */
export const HAFTUNG = Object.freeze([
  "Dieser Bericht ist eine rechnerische Orientierung auf Grundlage Ihrer Eingaben und der unten genannten Annahmen. Er ist kein Angebot, keine Zusage und keine Rechts-, Steuer- oder Anlageberatung.",
  "Annahmen mit dem Vermerk „Prüfung ausstehend“ sind noch nicht am Original nachgeprüft. Werte können sich mit Gesetzen, Ausschreibungen und Marktpreisen ändern; maßgeblich ist der Stand der Rechenlogik im Kopf dieses Berichts.",
  "Netzanschluss, Planungsrecht, Schutzgüter und Vertragsdetails können das Ergebnis im Einzelfall deutlich verändern. Eine konkrete Projektrechnung erfolgt erst nach Prüfung der Fläche bzw. des Vorhabens.",
  "Die Prüf-ID belegt, mit welchen Eingaben und welchem Stand der Rechenlogik dieser Bericht erstellt wurde. Sie enthält keine Personendaten.",
]);

export const BERICHT_HINWEIS_DRUCK = "Ausdruck oder „Als PDF speichern“ über die Druckfunktion Ihres Browsers.";
