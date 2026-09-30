// src/lib/plattform/geodaten/index.js
//
// Geodaten-Adapter für das Akquise-Cockpit (nur serverseitig). Auswahl:
//   GEODATEN_URL + GEODATEN_TOKEN gesetzt → Geodaten-Dienst (Backend-Import/dienste/geodaten, PostGIS)
//   sonst                              → Demo (lokale GeoJSON-Dateien, gleiche Scoring-Logik; im Produktions-Build nur
//                                         mit PLATTFORM_DEMO=1, sonst 503)
// Rechte: Backoffice-Bereich „geodaten“ (Rechte-Matrix: Leitung und Akquise). Jede Operation prüft selbst – die Route
// prüft vorab (server/route.js → adminRechtPruefen).
//
// Operationen (n = angemeldeter Nutzer):
//   uebersicht(n) · kandidaten(n, filter) · kandidat(n, id) · umkreis(n, knotenId, km) · netzknoten(n, { bbox, arten })
//   ebene(n, name, { bbox }) · suche(n, q) · kapazitaetSetzen(n, knotenId, daten) · uebernehmen(n, kandidatId, { notiz })

import * as demo from "./demo";
import * as dienst from "./dienst";
import { geodatenBackend } from "../backend/geodaten";
import { PlattformFehler } from "../fehler";
import { BEREICHE, STUFE_LABEL, stufe } from "../rechte";
import { KONFIG_FEHLER } from "../backend";

export function geodatenModus() {
  if (dienst.dienstKonfiguriert()) return "dienst";
  if (process.env.NODE_ENV === "production" && process.env.PLATTFORM_DEMO !== "1") return null;
  return "demo";
}

function recht(n, st = 1) {
  if (!n) throw new PlattformFehler(401, "Bitte melden Sie sich an.");
  if (!n.rollen?.includes("admin")) throw new PlattformFehler(403, "Nur für das Backoffice.");
  if (stufe(n, "geodaten") < st) throw new PlattformFehler(403, `Ihre Backoffice-Rolle erlaubt im Bereich „${BEREICHE.geodaten}“ kein ${STUFE_LABEL[st]}.`, "recht");
}

function modusPflicht() {
  const m = geodatenModus();
  if (!m) throw new PlattformFehler(503, KONFIG_FEHLER);
  return m;
}

/** Im Demo-Betrieb: gepflegte Kapazitäten aus dem Plattform-Backend (Dienst hält sie selbst) */
async function kontext(n) {
  if (modusPflicht() === "dienst") return { nutzer: n };
  return { nutzer: n, kapazitaeten: await geodatenBackend().netzkapazitaeten(n) };
}

export async function uebersicht(n) {
  recht(n, 1);
  const k = await kontext(n);
  return modusPflicht() === "dienst" ? dienst.uebersicht(k) : demo.uebersicht(k);
}

/** Filter aus Suchparametern (URLSearchParams) lesen und begrenzen */
export function filterLesen(suche, bboxLesen) {
  const zahl = (name, max) => {
    const x = Number(String(suche.get(name) || "").replace(",", "."));
    return Number.isFinite(x) && x > 0 ? Math.min(x, max) : undefined;
  };
  const text = (name) => (suche.get(name) || "").slice(0, 80) || undefined;
  const ampel = ["gruen", "gelb", "rot"].includes(suche.get("ampel")) ? suche.get("ampel") : undefined;
  return {
    bbox: bboxLesen(suche.get("bbox")) || undefined,
    minHa: zahl("minHa", 1000),
    maxTrasseKm: zahl("maxTrasseKm", 50),
    minScore: zahl("minScore", 100),
    land: ["AT", "DE", "CH"].includes(suche.get("land")) ? suche.get("land") : undefined,
    bundesland: text("bundesland"),
    bezirk: text("bezirk"),
    gemeinde: text("gemeinde"),
    ampel,
    q: text("q"),
    limit: zahl("limit", 2000),
  };
}

export async function kandidaten(n, filter = {}) {
  recht(n, 1);
  const k = await kontext(n);
  return modusPflicht() === "dienst" ? dienst.kandidaten(filter, k) : demo.kandidaten(filter, k);
}

export async function kandidat(n, id) {
  recht(n, 1);
  const k = await kontext(n);
  const r = modusPflicht() === "dienst" ? await dienst.kandidat(id, k) : demo.kandidat(id, k);
  if (!r) throw new PlattformFehler(404, "Kandidatenfläche nicht gefunden.");
  return r;
}

export async function umkreis(n, knotenId, km) {
  recht(n, 1);
  const radius = Math.max(0.5, Math.min(30, Number(km) || 5));
  const k = await kontext(n);
  const r = modusPflicht() === "dienst" ? await dienst.umkreis(knotenId, radius, k) : demo.umkreis(knotenId, radius, k);
  if (!r) throw new PlattformFehler(404, "Netzknoten nicht gefunden.");
  return r;
}

export async function netzknoten(n, opt = {}) {
  recht(n, 1);
  const k = await kontext(n);
  return modusPflicht() === "dienst" ? dienst.netzknoten(opt, k) : demo.netzknoten(opt, k);
}

export async function ebene(n, name, opt = {}) {
  recht(n, 1);
  if (!["schutzgebiete", "zonen", "verkehr"].includes(name)) throw new PlattformFehler(404, "Ebene unbekannt.");
  const k = await kontext(n);
  return modusPflicht() === "dienst" ? dienst.ebene(name, opt, k) : demo.ebene(name, opt);
}

export async function suche(n, q) {
  recht(n, 1);
  const k = await kontext(n);
  return modusPflicht() === "dienst" ? dienst.suche(q, k) : demo.suche(q, k);
}

export async function kapazitaetSetzen(n, knotenId, daten = {}) {
  recht(n, 2);
  const r = await geodatenBackend().netzkapazitaetSetzen(n, knotenId, daten); // prüft/protokolliert (Demo bzw. Frappe)
  if (modusPflicht() === "dienst") await dienst.kapazitaetMelden(knotenId, r, { nutzer: n });
  return r;
}

/** Kandidat serverseitig laden und als Akquise-Ziel übernehmen (Fläche + Aufgabe im Plattform-Backend) */
export async function uebernehmen(n, kandidatId, { notiz = "" } = {}) {
  recht(n, 2);
  const kd = await kandidat(n, String(kandidatId || "").slice(0, 80));
  return geodatenBackend().akquiseZielUebernehmen(n, kd, { notiz });
}

export async function ziele(n) {
  recht(n, 1);
  return geodatenBackend().akquiseZiele(n);
}
