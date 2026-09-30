// GET  /api/admin/anlagen/betrieb/anlage/[id] – Betriebsführung einer Anlage inkl. Kennzahlen (PR, Ist/Soll, Verfügbarkeit)
//      und Plausibilisierung der Zählerstand-Monatswerte (Messdaten erst nach Rechteprüfung über das Backend)
// POST /api/admin/anlagen/betrieb/anlage/[id] – { aktion, … }
//   plan { daten } · planLoeschen { id } · vorschlag · protokoll { daten } · einstrahlung { monat, kwhM2, quelle }
//   freigabe { messpunktId, register, monat, begruendung } – den Befund berechnet der Server, nie der Browser
import { route } from "@/lib/plattform/server/route";
import { betriebBackend } from "@/lib/plattform/backend/betrieb";
import { kennzahlenMonate, plausibilisierung } from "@/lib/plattform/betrieb/auswertung";
import { PlattformFehler } from "@/lib/plattform/fehler";

export const GET = route({ admin: true }, async ({ nutzer, params }) => {
  const b = await betriebBackend().betriebAnlage(nutzer, params.id);
  const [k, p] = await Promise.all([kennzahlenMonate(nutzer, params.id, { betrieb: b }), plausibilisierung(nutzer, params.id)]);
  return { ok: true, ...b, kennzahlen: { zeilen: k.zeilen, gesamt: k.gesamt, messfehler: k.messfehler }, plausibilisierung: p };
});

export const POST = route({ admin: true, maxBytes: 256 * 1024 }, async ({ nutzer, params, body }) => {
  const b = betriebBackend();
  const id = params.id;
  switch (body.aktion) {
    case "plan":
      return { ok: true, plan: await b.betriebPlanSpeichern(nutzer, id, body.daten || {}) };
    case "planLoeschen":
      return b.betriebPlanLoeschen(nutzer, id, body.id);
    case "vorschlag":
      return { ok: true, ...(await b.betriebPlaeneVorschlagen(nutzer, id)) };
    case "protokoll":
      return { ok: true, protokoll: await b.betriebProtokollSpeichern(nutzer, id, body.daten || {}) };
    case "einstrahlung":
      return b.betriebEinstrahlungSpeichern(nutzer, id, body);
    case "freigabe": {
      const p = await plausibilisierung(nutzer, id);
      const z = p.zeilen.find((x) => x.messpunktId === body.messpunktId && x.register === body.register && x.monat === body.monat);
      if (!z) throw new PlattformFehler(404, "Monatswert nicht gefunden.");
      return b.betriebMonatswertFreigeben(nutzer, id, { messpunktId: z.messpunktId, register: z.register, monat: z.monat, stand: z.stand, befund: z.befund, begruendung: body.begruendung || "" });
    }
    default:
      throw new PlattformFehler(422, "Unbekannte Aktion.");
  }
});
