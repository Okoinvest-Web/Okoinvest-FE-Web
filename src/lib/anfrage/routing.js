// src/lib/anfrage/routing.js
//
// Lead-Routing (Welle 2, Paket B3): Land × Typ × Größe → Lead-Desk, zuständige Person, Vertretung, SLA-Klasse.
// REINE Funktion ohne Datenbank: Gebietstreffer (vorhandenes Gebiets-Routing aus src/lib/plattform/akquise.js,
// gebietFuer) und die Prüfung „Konto aktiv und Backoffice“ reicht der Aufrufer herein.
// Frappe-Spiegel: Backend-Import/…/plattform/api/einwilligung.py (routen).
//
// Reihenfolge der Zuständigkeit:
//   1. Person des Lead-Desks (src/data/lead-routing.js) – solange TODO Inhaber: leer
//   2. Gebiets-Routing (PLZ > Bundesland/Kanton > Land) – nur mit bekanntem Land
//   3. sonst „ohne Zuständigkeit“ (sichtbar im Lead-Desk, alle Admins werden wie bisher benachrichtigt)

import { GROESSEN, LEAD_DESKS, LEAD_TYPEN, ROUTING_MATRIX, ROUTING_STAND } from "../../data/lead-routing.js";
import { landNormal } from "./laender.js";

const zahl = (x) => {
  if (typeof x === "number") return Number.isFinite(x) ? x : null;
  if (typeof x !== "string" || !x.trim()) return null;
  let s = x.trim().replace(/\s/g, "");
  if (/^\d{1,3}(\.\d{3})+(,\d+)?$/.test(s)) s = s.replace(/\./g, ""); // deutsche Tausenderpunkte: „1.200“ = 1200
  const n = Number(s.replace(",", "."));
  return Number.isFinite(n) ? n : null;
};
const obj = (x) => (x && typeof x === "object" && !Array.isArray(x) ? x : {});

/** Vorgangstyp (+ daten.art) → Lead-Typ; Unbekanntes → "kontakt" */
export function leadTyp(typ, daten) {
  if (typ === "flaeche" && obj(daten).art === "dach") return "dach";
  return Object.hasOwn(LEAD_TYPEN, typ) ? typ : "kontakt";
}

/** Messwert der Größe aus den Formulardaten (Zahl oder null) */
function messwert(typ, d) {
  const ein = obj(d.eingaben);
  switch (typ) {
    case "flaeche":
    case "agri":
      return zahl(d.ha ?? d.hektar ?? d.flaeche ?? d.flaecheHa ?? ein.flaecheHa);
    case "dach":
      return zahl(d.dachflaeche ?? d.dachflaecheM2 ?? d.m2 ?? ein.dachflaeche);
    case "carport":
      return zahl(d.stellplaetze ?? ein.stellplaetze);
    case "speicher":
      return zahl(d.mw ?? ein.mw);
    case "reststrom":
      return zahl(d.verbrauchMwh ?? ein.verbrauchMwh);
    case "investor":
    case "projekt":
      return zahl(d.mwp ?? ein.mwp);
    default:
      return null;
  }
}

/** Größenklasse: { klasse: klein|mittel|gross|unbekannt, wert, einheit } */
export function groesseErmitteln(typ, daten) {
  const g = GROESSEN[typ];
  if (!g) return { klasse: "unbekannt", wert: null, einheit: "" };
  const d = obj(daten);
  const wert = messwert(typ, d);
  if (wert !== null && wert > 0) {
    const klasse = g.grenzen.find(([, bis]) => wert < bis)?.[0] || "gross";
    return { klasse, wert, einheit: g.einheit };
  }
  const auswahl = g.auswahl?.[d.groesse ?? d.ticket];
  return { klasse: auswahl || "unbekannt", wert: null, einheit: g.einheit, ...(auswahl ? { auswahl: String(d.groesse ?? d.ticket) } : {}) };
}

/** Matrix-Zeile für Land × Typ × Größe (immer vorhanden – die Matrix ist vollständig) */
export function matrixZeile(land, typ, groesse) {
  const l = landNormal(land) || "unbekannt";
  return ROUTING_MATRIX.find((z) => z.land === l && z.typ === typ && z.groesse === groesse) || ROUTING_MATRIX.find((z) => z.land === l && z.typ === "kontakt" && z.groesse === "unbekannt");
}

/**
 * Routing einer Anfrage.
 *  eingabe: { typ, daten, land, gebiet: { mitarbeiterId, name, grund } | null, aktiv: (kontoId) => boolean, desks? }
 *  Liefert { land, landBekannt, typ, groesse, desk, zustaendigId, zustaendigQuelle, vertretungId, ohneZustaendigkeit,
 *            slaKlasseBasis, gruende[], stand }.
 */
export function routen({ typ, daten, land, gebiet = null, aktiv = () => false, desks = LEAD_DESKS } = {}) {
  const lt = leadTyp(typ, daten);
  const l = landNormal(land) || "unbekannt";
  const groesse = groesseErmitteln(lt, daten);
  const zeile = matrixZeile(l, lt, groesse.klasse);
  const desk = desks[zeile.desk] || null;
  const istAktiv = (id) => {
    try {
      return !!id && aktiv(id) === true;
    } catch {
      return false;
    }
  };
  const gruende = [];
  let zustaendigId = null;
  let quelle = null;
  if (desk?.person && istAktiv(desk.person)) {
    zustaendigId = desk.person;
    quelle = "desk";
    gruende.push(`Lead-Desk ${desk.label}`);
  } else if (l !== "unbekannt" && gebiet?.mitarbeiterId && istAktiv(gebiet.mitarbeiterId)) {
    zustaendigId = gebiet.mitarbeiterId;
    quelle = "gebiet";
    gruende.push(`Gebiet „${gebiet.name || "?"}“${gebiet.grund ? ` (${gebiet.grund})` : ""}`);
  } else {
    gruende.push(l === "unbekannt" ? "Land unbekannt – Clearing nötig" : "Kein Desk und kein Gebiet besetzt");
  }
  if (desk && !desk.person) gruende.push("Desk-Person offen (TODO Inhaber)");
  const vertretungId = desk?.vertretung && istAktiv(desk.vertretung) && desk.vertretung !== zustaendigId ? desk.vertretung : null;
  return {
    land: l,
    landBekannt: l !== "unbekannt",
    typ: lt,
    groesse,
    desk: desk ? { id: desk.id, label: desk.label } : { id: zeile.desk, label: zeile.desk },
    zustaendigId,
    zustaendigQuelle: quelle,
    vertretungId,
    ohneZustaendigkeit: !zustaendigId,
    slaKlasseBasis: zeile.slaKlasse,
    gruende,
    stand: ROUTING_STAND,
  };
}
