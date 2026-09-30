// src/lib/plattform/akquise.js
//
// Akquise-Pipeline für Flächen: Scoring (Flächencheck aus src/lib/rechner/flaechencheck.js),
// Priorisierung, Gebietszuordnung (PLZ-Bereiche / Bundesland / Land → Mitarbeiter) und
// SLA-Ampel „Erstkontakt innerhalb von 2 Werktagen“. Reine Funktionen (Client + Server).

import { flaechencheck, BESONDERHEITEN, NETZ } from "../rechner/flaechencheck.js";
import { FREIFLAECHE } from "../invest/markt.js";

export { BESONDERHEITEN as AKQUISE_BESONDERHEITEN, NETZ as AKQUISE_NETZ };

export const SLA = { erstkontaktWerktage: 2 };

const REGION_DE = {
  "de-nord": ["Schleswig-Holstein", "Hamburg", "Niedersachsen", "Bremen", "Mecklenburg-Vorpommern"],
  "de-ost": ["Brandenburg", "Berlin", "Sachsen", "Sachsen-Anhalt", "Thüringen"],
  "de-west": ["Nordrhein-Westfalen", "Hessen", "Rheinland-Pfalz", "Saarland"],
  "de-sued": ["Bayern", "Baden-Württemberg"],
};
// Grobe Zuordnung der ersten PLZ-Ziffer (DE), falls kein Bundesland angegeben ist
const PLZ_REGION_DE = { 0: "de-ost", 1: "de-ost", 2: "de-nord", 3: "de-nord", 4: "de-west", 5: "de-west", 6: "de-west", 7: "de-sued", 8: "de-sued", 9: "de-sued" };

export function regionFuer({ land, bundesland, plz }) {
  if (land === "AT") return "at";
  if (land === "CH") return "ch";
  for (const [id, laender] of Object.entries(REGION_DE)) if (laender.includes(bundesland)) return id;
  const z = String(plz || "").trim()[0];
  return PLZ_REGION_DE[z] || "de-sued";
}

const NUTZUNG = { acker: "acker", gruenland: "gruenland", konversion: "konversion", gewerbe: "parkplatz", sonstige: "sonstige" };
const EIGENTUM = { eigentum: "allein", miteigentum: "gemeinschaft", verwaltung: "gemeinschaft" };

/** Flächencheck für eine Plattform-Fläche (+ Akquise-Zusatzangaben: besonderheiten, netz) */
export function flaechenScore(f, zusatz = {}) {
  const ha = Number(f?.ha) || 0;
  const r = flaechencheck({
    land: f?.land || "DE",
    regionId: regionFuer(f || {}),
    ha: ha > 0 ? ha : 0.5,
    nutzung: NUTZUNG[f?.nutzung] || "sonstige",
    besonderheiten: (zusatz.besonderheiten || []).filter((b) => BESONDERHEITEN.some((x) => x.id === b)),
    netz: NETZ.some((n) => n.id === zusatz.netz) ? zusatz.netz : "unbekannt",
    eigentum: EIGENTUM[f?.eigentum] || "allein",
  });
  return {
    score: ha > 0 ? r.score : Math.min(r.score, 30),
    ampel: ha > 0 ? r.ampel : "rot",
    mwp: ha > 0 ? Math.round((ha / FREIFLAECHE.haProMwp) * 10) / 10 : 0,
    gruende: r.gruende.slice(0, 4).map((g) => ({ text: g.text, art: g.art, punkte: g.punkte })),
  };
}

/** Automatische Priorität aus Score und Größe (manuell überschreibbar) */
export function prioritaetAuto(score, ha) {
  if (score >= 65 && (Number(ha) || 0) >= 5) return "A";
  if (score >= 45) return "B";
  return "C";
}

// ------------------------------------------------------------ Werktage & SLA

const istWerktag = (d) => d.getUTCDay() !== 0 && d.getUTCDay() !== 6;

/** Zeitpunkt `werktage` Werktage (Mo–Fr) nach `iso`; Eingang am Wochenende zählt ab Montag */
export function werktageSpaeter(iso, werktage = SLA.erstkontaktWerktage) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  while (!istWerktag(d)) {
    d.setUTCDate(d.getUTCDate() + 1);
    d.setUTCHours(7, 0, 0, 0);
  }
  let rest = werktage;
  while (rest > 0) {
    d.setUTCDate(d.getUTCDate() + 1);
    if (istWerktag(d)) rest--;
  }
  return d.toISOString();
}

/**
 * SLA-Ampel Erstkontakt. `eingangAm` = Eingang (Anfrage bzw. Einreichung), `erstkontaktAm` = erster
 * Kontakt durch das Backoffice (Anruf/E-Mail/Termin im CRM, Nachricht im Thread oder Statuswechsel).
 * Liefert { ampel: gruen|gelb|rot, status: erledigt|verspaetet|offen|faellig|ueberfaellig, fristBis, text }.
 */
export function slaStatus(eingangAm, erstkontaktAm, jetzt = Date.now()) {
  if (!eingangAm) return { ampel: "grau", status: "unbekannt", fristBis: null, text: "Kein Eingang" };
  const frist = werktageSpaeter(eingangAm);
  const fristMs = new Date(frist).getTime();
  const stunden = (a, b) => Math.max(0, Math.round((b - a) / 36e5));
  if (erstkontaktAm) {
    const k = new Date(erstkontaktAm).getTime();
    if (k <= fristMs) return { ampel: "gruen", status: "erledigt", fristBis: frist, erstkontaktAm, text: `Erstkontakt nach ${stunden(new Date(eingangAm).getTime(), k)} h` };
    return { ampel: "gelb", status: "verspaetet", fristBis: frist, erstkontaktAm, text: `Erstkontakt verspätet (${stunden(fristMs, k)} h nach Frist)` };
  }
  if (jetzt > fristMs) return { ampel: "rot", status: "ueberfaellig", fristBis: frist, text: `Erstkontakt überfällig seit ${stunden(fristMs, jetzt)} h` };
  if (fristMs - jetzt < 24 * 36e5) return { ampel: "gelb", status: "faellig", fristBis: frist, text: `Erstkontakt fällig in ${stunden(jetzt, fristMs)} h` };
  return { ampel: "gruen", status: "offen", fristBis: frist, text: `Frist läuft (${stunden(jetzt, fristMs)} h)` };
}

// ------------------------------------------------------------ Gebiete

/** PLZ passt zu einem Eintrag wie "80-87", "9", "5020" (Präfix bzw. Präfix-Bereich) */
export function plzPasst(plz, muster) {
  const p = String(plz || "").replace(/\D/g, "");
  const m = String(muster || "").replace(/\s/g, "");
  if (!p || !m) return false;
  const bereich = m.match(/^(\d{1,5})-(\d{1,5})$/);
  if (bereich) {
    const [von, bis] = [bereich[1], bereich[2]];
    const len = Math.max(von.length, bis.length);
    const kopf = Number(p.slice(0, len));
    return p.length >= len && kopf >= Number(von.padEnd(len, "0")) && kopf <= Number(bis.padEnd(len, "9"));
  }
  return /^\d{1,5}$/.test(m) && p.startsWith(m);
}

/** Bestes Gebiet für ein Objekt: PLZ (3) vor Bundesland (2) vor Land (1). Liefert { gebiet, grund } oder null */
export function gebietFuer(gebiete = [], { land, bundesland, plz }) {
  let best = null;
  for (const g of gebiete) {
    if (g.aktiv === false || !g.mitarbeiterId) continue;
    if (g.land && land && g.land !== land) continue;
    let punkte = 0;
    let grund = "";
    if ((g.plz || []).some((m) => plzPasst(plz, m))) {
      punkte = 3;
      grund = `PLZ ${plz}`;
    } else if ((g.bundeslaender || []).includes(bundesland)) {
      punkte = 2;
      grund = bundesland;
    } else if (g.land && g.land === land && !(g.plz || []).length && !(g.bundeslaender || []).length) {
      punkte = 1;
      grund = `Land ${land}`;
    }
    if (punkte && (!best || punkte > best.punkte)) best = { gebiet: g, punkte, grund };
  }
  return best;
}
