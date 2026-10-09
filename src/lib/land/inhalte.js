// src/lib/land/inhalte.js – Schnittstelle für Länderinhalte (für die Inhalts-Teams)
//
// Grundsatz: Eine Seite, ein Design. Länder unterscheiden sich nur in Texten, Werten und
// Bausteinen – nie in Layout oder Komponenten.
//
// 1) Land der Seite holen
//    Server-Seite:      const land = await seitenLand(params);        // src/lib/land/seite.js
//    Server-Baustein:   const land = landDerAnfrage();                // nach seitenLand() der Seite
//    Client-Baustein:   const { land } = useLand();                   // src/components/Land/useLand.js
//    land ist "DE" | "AT" | "CH" oder null (= gemeinsame Seite ohne Länderwahl).
//
// 2) Texte und Werte je Land
//    const TEXTE = {
//      gemeinsam: { titel: "Solarparks in DACH", lead: "…" },   // Pflicht: Stand wie vor Welle 2
//      AT: { lead: "… nach EAG und Landesraumordnung …" },        // nur, was in AT anders ist
//      CH: { lead: "… nach RPG Art. 24ter …" },
//    };
//    const t = inhaltFuer(TEXTE, land);   // AT: { titel aus gemeinsam, lead aus AT }
//    Fehlt ein Land, gilt „gemeinsam“. DE ohne eigenen Eintrag = gemeinsam.
//
// 3) Zahlen nur, wo sie für das Land geprüft sind
//    const modus = zahlenModus(land, ["DE"]);   // Länder, deren Werte an der Quelle geprüft sind
//      "zeigen"    → Werte normal anzeigen (Land ist geprüft)
//      "gemeinsam" → Werte anzeigen und dezent „gilt für Deutschland“ dazu (<GiltFuer />)
//      "hinweis"   → KEINE Werte, stattdessen <LandHinweis land={land} /> („… werden geprüft – Ergebnis auf Anfrage“)
//    Fertiger Baustein: <LandWerte land={land} geprueft={["DE"]}>…Werte…</LandWerte>
//    (src/components/Land/LandHinweis.js)
//
// 4) Rechner bekommen das Land automatisch: RechnerSeite liest landDerAnfrage(), die Rechner
//    useLand(); Startwerte über landStart() (src/components/Land/useLand.js). Für AT/CH greift
//    die Länder-Sperre der Länder-Engine (src/lib/invest/laender/sperre.js, marktFuer()).
//
// 5) Freigabe für Suchmaschinen: Erst wenn eine Seite für ein Land echten, geprüften Inhalt
//    rendert, den Eintrag in LAENDERINHALT (src/lib/land/seiten.js) mit Vermerk ergänzen. Dann
//    bekommt die Länderfassung index, eigenes canonical, hreflang und einen Sitemap-Eintrag.
//    Vorher bleibt sie noindex – sie ist trotzdem erreichbar und sieht gleich aus.

import { LAENDER, landCode } from "./laender.js";

const istObjekt = (x) => x !== null && typeof x === "object" && !Array.isArray(x) && !(x && x.$$typeof);

/**
 * Inhalt für ein Land mit Rückfall auf „gemeinsam“.
 * Objekte werden flach zusammengeführt (Land überschreibt gemeinsam), alles andere ersetzt.
 * @template T
 * @param {{ gemeinsam: T, DE?: Partial<T>|T, AT?: Partial<T>|T, CH?: Partial<T>|T }} inhalte
 * @param {string|null} land
 * @returns {T}
 */
export function inhaltFuer(inhalte, land) {
  if (!inhalte || !Object.hasOwn(inhalte, "gemeinsam")) throw new Error("inhaltFuer: Eintrag „gemeinsam“ fehlt");
  const l = landCode(land);
  const basis = inhalte.gemeinsam;
  if (!l || !Object.hasOwn(inhalte, l) || inhalte[l] === undefined) return basis;
  const eigen = inhalte[l];
  return istObjekt(basis) && istObjekt(eigen) ? { ...basis, ...eigen } : eigen;
}

/**
 * Wie Zahlenwerte im Land angezeigt werden.
 * @param {string|null} land
 * @param {string[]} geprueft Länder, deren Werte an der Originalquelle geprüft sind (Standard: nur DE)
 * @returns {"zeigen"|"gemeinsam"|"hinweis"}
 */
export function zahlenModus(land, geprueft = ["DE"]) {
  const l = landCode(land);
  if (!l) return "gemeinsam";
  return geprueft.includes(l) ? "zeigen" : "hinweis";
}

/** Text des Länderhinweises („Rechenwerte für die Schweiz werden geprüft – Ergebnis auf Anfrage“). */
export function landHinweisText(land, thema = "Rechenwerte") {
  const l = landCode(land) || "DE";
  return `${thema} ${LAENDER[l].fuerLand} werden geprüft – Ergebnis auf Anfrage`;
}

/** Englischer Länderhinweis („Figures for Switzerland are being reviewed – result on request“). */
export function landHinweisTextEn(land, thema = "Figures") {
  const l = landCode(land) || "DE";
  return `${thema} ${LAENDER[l].en.fuerLand} are being reviewed – result on request`;
}
