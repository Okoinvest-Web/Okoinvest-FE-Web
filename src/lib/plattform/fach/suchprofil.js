// src/lib/plattform/fach/suchprofil.js
//
// Fachliche Erweiterung des Investoren-Suchprofils (zusätzlich zu mwpMin/-Max, phasen, laender, typen, ticket*):
// Investorentyp, Regionen (Bundesländer/Kantone), Rendite-Ziel, Deal-Struktur, Co-Development, ESG/Taxonomie,
// Finanzierungsweise, Mindest-Datenraumqualität. Reine Funktionen; Demo und Frappe (plattform/fach/suchprofil.py).
// Der Matching-Score (matching.js) bleibt unverändert – die Erweiterung liefert zusätzliche Hinweise („passt“/„prüfen“),
// damit bestehende Alarme und Schwellen stabil bleiben.

export const INVESTOR_TYPEN = {
  family_office: "Family Office",
  fonds: "Fonds / Asset Manager (AIF, Spezialfonds)",
  stadtwerk: "Stadtwerk / kommunales Unternehmen",
  evu: "Energieversorger",
  ipp: "Unabhängiger Stromerzeuger (IPP)",
  versicherung: "Versicherung / Pensionskasse",
  unternehmen: "Unternehmen (Eigenversorgung, PPA)",
  privat: "Privatinvestor",
  genossenschaft: "Energiegenossenschaft / Bürgerenergie",
};
export const DEAL_STRUKTUREN = { asset: "Asset Deal", share: "Share Deal (SPV)" };
export const CO_DEVELOPMENT = { egal: "Egal", ja: "Ja, Co-Development gewünscht", nein: "Nein, nur fertige Rechte/Anlagen" };
export const ESG_ANFORDERUNGEN = {
  taxonomie: "EU-Taxonomie-Konformität (Nachweis Klimaschutz, DNSH)",
  sfdr: "Eignung für Art. 8/9 SFDR-Fonds",
  lieferkette: "Lieferketten-Nachweis Module (Zwangsarbeit, LkSG)",
  biodiversitaet: "Biodiversitätskonzept (z. B. Blühflächen, Beweidung)",
  buergerbeteiligung: "Bürger- bzw. Kommunalbeteiligung",
};
export const FINANZIERUNGSWEISEN = { ek: "Vollständig Eigenkapital", projektfinanzierung: "Projektfinanzierung (Non-Recourse)", portfolio: "Portfolio-/Konzernfinanzierung", offen: "Offen" };

const auswahl = (v, erlaubt, std = "") => (Object.prototype.hasOwnProperty.call(erlaubt, v) ? v : std);
const mehrfach = (v, erlaubt) => (Array.isArray(v) ? [...new Set(v.filter((x) => Object.prototype.hasOwnProperty.call(erlaubt, x)))] : []);
function zahl(v, min, max, stellen = 1) {
  if (v === undefined || v === null || v === "" || typeof v === "object" || typeof v === "boolean") return null;
  const n = typeof v === "number" ? v : Number(String(v).replace(/\s/g, "").replace(",", "."));
  if (!Number.isFinite(n) || n < min || n > max) return null;
  return Math.round(n * 10 ** stellen) / 10 ** stellen;
}

/**
 * Erweiterungsfelder bereinigen. `bundeslaenderAlle` = erlaubte Regionen (konstanten.BUNDESLAENDER aller Länder).
 */
export function suchprofilErweiterung(p = {}, bundeslaenderAlle = []) {
  const erlaubt = Object.fromEntries(bundeslaenderAlle.map((b) => [b, 1]));
  return {
    investorTyp: auswahl(p?.investorTyp, INVESTOR_TYPEN, ""),
    regionen: mehrfach(p?.regionen, erlaubt),
    renditeZielPct: zahl(p?.renditeZielPct, 0, 30, 1),
    renditeBasis: auswahl(p?.renditeBasis, { projekt: 1, ek: 1 }, "ek"),
    dealStrukturen: mehrfach(p?.dealStrukturen, DEAL_STRUKTUREN),
    coDevelopment: auswahl(p?.coDevelopment, CO_DEVELOPMENT, "egal"),
    esg: mehrfach(p?.esg, ESG_ANFORDERUNGEN),
    finanzierung: auswahl(p?.finanzierung, FINANZIERUNGSWEISEN, ""),
    datenraumMin: zahl(p?.datenraumMin, 0, 100, 0),
  };
}

/**
 * Zusätzliche Passungs-Hinweise (ohne Score-Wirkung) für Projekt + Suchprofil.
 * Nutzt nur öffentliche Projektfelder bzw. – falls vorhanden (nach NDA) – das Datenblatt.
 * @returns {{passt: string[], pruefen: string[]}}
 */
export function passungHinweise(projekt, profil, datenblatt = null) {
  const passt = [];
  const pruefen = [];
  if (!projekt || !profil) return { passt, pruefen };
  if (profil.regionen?.length) {
    if (profil.regionen.includes(projekt.bundesland)) passt.push(`Region ${projekt.bundesland}`);
    else pruefen.push(`Region ${projekt.bundesland || "–"} nicht im Suchprofil`);
  }
  const frueh = ["flaeche", "netz", "aufstellung"].includes(projekt.phase);
  if (profil.coDevelopment === "ja" && frueh) passt.push("Frühphase – Co-Development möglich");
  if (profil.coDevelopment === "nein" && frueh) pruefen.push("Frühphase, Co-Development laut Profil nicht gewünscht");
  if (typeof profil.datenraumMin === "number" && typeof projekt.datenraumQualitaet === "number") {
    if (projekt.datenraumQualitaet >= profil.datenraumMin) passt.push(`Datenraum ${projekt.datenraumQualitaet} %`);
    else pruefen.push(`Datenraum ${projekt.datenraumQualitaet} % unter Mindestwert ${profil.datenraumMin} %`);
  }
  if (datenblatt?.struktur && profil.dealStrukturen?.length) {
    const angebot = datenblatt.struktur === "beides" ? ["asset", "share"] : [datenblatt.struktur];
    if (angebot.some((s) => profil.dealStrukturen.includes(s))) passt.push(`Struktur ${angebot.map((s) => DEAL_STRUKTUREN[s]).join("/")}`);
    else pruefen.push(`Angebotene Struktur (${angebot.map((s) => DEAL_STRUKTUREN[s]).join("/")}) nicht im Profil`);
  }
  if (typeof profil.renditeZielPct === "number" && typeof datenblatt?.irrPct === "number") {
    if (datenblatt.irrPct >= profil.renditeZielPct) passt.push(`Anbieter-IRR ${datenblatt.irrPct} % (ungeprüft)`);
    else pruefen.push(`Anbieter-IRR ${datenblatt.irrPct} % unter Ziel ${profil.renditeZielPct} %`);
  }
  return { passt, pruefen };
}
