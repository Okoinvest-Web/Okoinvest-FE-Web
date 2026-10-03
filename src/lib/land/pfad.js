// src/lib/land/pfad.js – Pfade, Alternativen und hreflang (Welle 2, Länderrouting)
//
// Schlüssel = Pfad OHNE Länderpräfix, so wie er vor dem Umzug hieß ("/rechner/pacht").
//   pfad("/rechner/pacht")            → "/de/rechner/pacht"
//   pfad("/flaechencheck", "AT")      → "/at/flaechencheck"
//   pfad("/rechner/pacht", "AT")      → "/de/rechner/pacht"   (fehlt in AT → DE-Seite, „gilt für Deutschland“)
//   pfad("/kontakt", "AT")            → "/kontakt"            (Stamm: nie ein Präfix)
//   pfad("/ratgeber/x")               → "/wissen/ratgeber/x"  (umbenannt, Stamm)
//   pfad("/de/rechner/pacht", "AT")   → "/de/rechner/pacht"   (schon aufgelöst: unverändert, idempotent)
// Query und Anker bleiben erhalten.

import { abs } from "../../data/site.js";
import { LAENDER, PRAEFIX_MUSTER, einstiegPfad, landAusPraefix, landCode } from "./laender.js";
import { EINSTIEG, laenderFrei, laenderMitSeite, seiteFuer, stufe, vorhanden } from "./stufen.js";
import { nurPfad, umbenannt, zoneFuer } from "./zonen.js";

const zerlege = (roh) => {
  const s = String(roh ?? "");
  const i = s.search(/[?#]/);
  return i < 0 ? [s, ""] : [s.slice(0, i), s.slice(i)];
};

/** Pfad einer Seite in einem Land (ohne Prüfung, ob es sie dort gibt). */
export const landPfad = (schluessel, land) => `${LAENDER[land].einstieg}${schluessel === "/" ? "" : schluessel}`;

/**
 * Ziel eines Links im Kontext eines Landes.
 * @returns {{ href: string, land: string|null, art: "land"|"anderesLand"|"einstieg"|"stamm"|"unbekannt", giltFuer: string|null }}
 *   art "anderesLand": Die Seite fehlt im gewünschten Land; der Link führt in das Land, für das sie gilt
 *   (giltFuer z. B. „für Deutschland“ – sichtbar neben dem Link anzeigen).
 */
export function ziel(schluesselRoh, land = "DE") {
  const [roh, rest] = zerlege(schluesselRoh);
  const wunsch = landCode(land) || "DE";
  if (PRAEFIX_MUSTER.test(roh)) return { href: roh + rest, land: landAusPraefix(roh.slice(1, 3)), art: "land", giltFuer: null };
  const p = nurPfad(roh);
  const neu = umbenannt(p);
  if (neu) return { href: neu + rest, land: null, art: "stamm", giltFuer: null };
  if (zoneFuer(p) !== "land") return { href: roh + rest, land: null, art: "stamm", giltFuer: null };
  const s = seiteFuer(p);
  if (!s) return { href: roh + rest, land: null, art: "unbekannt", giltFuer: null };
  if (vorhanden(p, wunsch)) return { href: landPfad(p, wunsch) + rest, land: wunsch, art: "land", giltFuer: null };
  const andere = laenderMitSeite(p);
  const ersatz = andere.includes("DE") ? "DE" : andere[0];
  if (ersatz) return { href: landPfad(p, ersatz) + rest, land: ersatz, art: "anderesLand", giltFuer: LAENDER[ersatz].fuerLand };
  // Seite ist in keinem Land freigegeben (z. B. CH-Regionsseite im gestuften Start): Einstieg ihres Landes
  const heimat = s.laender[0];
  return { href: einstiegPfad(heimat), land: heimat, art: "einstieg", giltFuer: LAENDER[heimat].fuerLand };
}

/**
 * Link mit sichtbarem Länderhinweis: fehlt die Seite im Land, zeigt das Label „(gilt für Deutschland)“.
 * @returns {{ href: string, label: string, giltFuer: string|null }}
 */
export function linkFuer(schluessel, land, label) {
  const z = ziel(schluessel, land);
  return { href: z.href, label: z.giltFuer ? `${label} (gilt ${z.giltFuer})` : label, giltFuer: z.giltFuer };
}

/** Link-Ziel als String (siehe ziel()). Standardland DE. */
export const pfad = (schluessel, land = "DE") => ziel(schluessel, land).href;

/**
 * Wo befindet sich ein (aufgelöster) Pfad?
 * @returns {{ land: string|null, schluessel: string, zone: string }}
 *   schluessel: Pfad ohne Länderpräfix ("" = Einstiegsseite des Landes)
 */
export function landAusPfad(pathname) {
  const p = nurPfad(pathname);
  const m = PRAEFIX_MUSTER.exec(p);
  if (m) {
    const rest = p.slice(m[0].length);
    return { land: landAusPraefix(m[1]), schluessel: rest === "/" ? EINSTIEG : rest, zone: "land" };
  }
  return { land: null, schluessel: p, zone: zoneFuer(p) };
}

/**
 * Länderwechsler: Entsprechung der aktuellen Seite im Zielland, sonst dessen Einstieg.
 * @returns {{ href: string, art: "entsprechung"|"einstieg" }}
 */
export function entsprechung(pathname, zielLand) {
  const l = landCode(zielLand) || "DE";
  const { schluessel, zone } = landAusPfad(pathname);
  if (zone === "land" && vorhanden(schluessel, l)) return { href: landPfad(schluessel, l), art: "entsprechung" };
  return { href: einstiegPfad(l), art: "einstieg" };
}

/**
 * hreflang-Cluster einer Seite der Länderzonen: alle Länder mit freigegebenem Inhalt + x-default.
 * x-default = DE-Fassung, wenn es sie gibt, sonst die erste freigegebene.
 * Bidirektional per Konstruktion: Alle Mitglieder eines Clusters liefern dieselbe Tabelle.
 * @returns {Record<string,string>} { "de-DE": url, "de-AT": url, "x-default": url } oder {} ohne Freigabe
 */
export function hreflang(schluessel) {
  const frei = laenderFrei(schluessel);
  if (!frei.length) return {};
  const tabelle = {};
  for (const l of frei) tabelle[LAENDER[l].lang] = abs(landPfad(schluessel, l));
  tabelle["x-default"] = abs(landPfad(schluessel, frei.includes("DE") ? "DE" : frei[0]));
  return tabelle;
}

/**
 * Metadaten-Feld `alternates` (Next.js) für eine Seite.
 *  - Länderzone: canonical auf die eigene Länder-URL, languages = hreflang-Cluster
 *    (nur wenn die Seite in diesem Land freigegeben ist; „in Vorbereitung“ → nur canonical).
 *  - Stamm/ohne Präfix: canonical auf den Pfad selbst, nie ein Präfix; languages optional
 *    (z. B. das DE/EN-Paar aus src/components/En/sprachpaare.js).
 */
export function alternates(schluessel, land = "DE", { languages } = {}) {
  const p = schluessel === EINSTIEG ? EINSTIEG : nurPfad(schluessel);
  const l = landCode(land) || "DE";
  if (p !== EINSTIEG && zoneFuer(p) !== "land") {
    return { canonical: abs(p), ...(languages ? { languages } : {}) };
  }
  const canonical = abs(landPfad(p, l));
  if (stufe(p, l) !== "frei") return { canonical };
  return { canonical, languages: hreflang(p) };
}

/** og:locale je Land ("de_AT") */
export const ogLocale = (land) => LAENDER[landCode(land) || "DE"].ogLocale;

/** <html lang> je Land ("de-AT") */
export const htmlLang = (land) => LAENDER[landCode(land) || "DE"].lang;

