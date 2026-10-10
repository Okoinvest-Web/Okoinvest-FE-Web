// src/lib/newsroom.js – Register des Newsrooms (Welle 3, Paket NL)
//
// Meldungen liegen unter src/content/newsroom (Struktur wie Ratgeber). Öffentlich ist NUR, was freigegeben ist:
// status "freigegeben" UND freigabe { von, am }. Alles andere (Entwürfe, Vorlagen) gibt dieses Modul nie heraus.
// Kurzprofil (Boilerplate) und Pressekontakt kommen ausschließlich aus src/data/site.js – eine Quelle.

import { MELDUNGEN } from "../content/newsroom/index.js";
import { GESELLSCHAFT, KENNZAHLEN, PRESSE, SITE } from "../data/site.js";

export const NEWSROOM_BASE = "/newsroom";
export const MELDUNG_TYPEN = Object.freeze(["pressemitteilung", "fachbeitrag"]);
const LAENDER = ["DE", "AT", "CH"];
const SLUG = /^[a-z0-9-]+$/;

/** Darf diese Meldung öffentlich erscheinen? */
export function istOeffentlich(m) {
  return !!(
    m &&
    m.status === "freigegeben" &&
    m.freigabe &&
    typeof m.freigabe.von === "string" &&
    m.freigabe.von.trim() &&
    /^\d{4}-\d{2}-\d{2}$/.test(m.freigabe.am || "") &&
    MELDUNG_TYPEN.includes(m.typ) &&
    SLUG.test(m.slug || "") &&
    Array.isArray(m.laender) &&
    m.laender.length > 0 &&
    m.laender.every((l) => LAENDER.includes(l)) &&
    /^\d{4}-\d{2}-\d{2}$/.test(m.datum || "")
  );
}

/** Öffentliche Meldungen, neueste zuerst; land "DE" | "AT" | "CH" filtert, null = alle. quelle für Tests. */
export function meldungen({ land = null, quelle = MELDUNGEN } = {}) {
  return quelle.filter(istOeffentlich).filter((m) => !land || m.laender.includes(land)).sort((a, b) => b.datum.localeCompare(a.datum));
}

/** Öffentliche Meldung nach Slug – sonst null (Entwürfe gibt es hier nicht) */
export function meldungNachSlug(slug, { quelle = MELDUNGEN } = {}) {
  return meldungen({ quelle }).find((m) => m.slug === slug) || null;
}

export const meldungPfad = (slug) => `${NEWSROOM_BASE}/${slug}`;

/** Kurzprofil für Redaktionen – nur Angaben aus site.js, keine Kennzahlen ohne Beleg */
export function kurzprofil(sprache = "de") {
  const gf = GESELLSCHAFT.geschaeftsfuehrung.join(sprache === "en" ? " and " : " und ");
  if (sprache === "en") {
    return `${GESELLSCHAFT.name}, based in ${GESELLSCHAFT.ort} (Upper Austria), develops ground-mounted and agrivoltaic solar power plants in Germany, Austria and Switzerland. The company is part of the ${SITE.gruppe.replace("Gruppe", "Group")}, which has been planning, building and operating solar power plants since ${KENNZAHLEN.gruppeGegruendet}. Managing directors: ${gf}. Company register ${GESELLSCHAFT.register}, ${GESELLSCHAFT.gericht}.`;
  }
  return `Die ${GESELLSCHAFT.name} mit Sitz in ${GESELLSCHAFT.ort} (Oberösterreich) entwickelt Freiflächen- und Agri-PV-Kraftwerke in Deutschland, Österreich und der Schweiz. Sie ist ein Unternehmen der ${SITE.gruppe}, die seit ${KENNZAHLEN.gruppeGegruendet} Solarkraftwerke plant, baut und betreibt. Geschäftsführer: ${gf}. Firmenbuch ${GESELLSCHAFT.register}, ${GESELLSCHAFT.gericht}.`;
}

/** Pressekontakt aus site.js (null-Werte blendet die Seite aus) */
export const pressekontakt = () => PRESSE;
