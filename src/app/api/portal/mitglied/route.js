// GET  /api/portal/mitglied – Mitgliederbereich (Genossenschaften, eigene Mitgliedschaften, Versammlungen, Ausschüttungen, Energiegemeinschaft)
// POST /api/portal/mitglied – { aktion, … }:
//   beitritt {genoId, daten} · zurueckziehen|zeichnen|kuendigen|kuendigungZuruecknehmen|uebertragen {id, …}
//   uebertragungAnnehmen|uebertragungAblehnen {uebertragungId} · abstimmen {gvId, stimmen}
//   egBeitreten {egId, daten} · egKuendigen {id}
import { route } from "@/lib/plattform/server/route";
import { mitgliedBackend } from "@/lib/plattform/backend/mitglied";
import { PlattformFehler } from "@/lib/plattform/fehler";

export const GET = route({ rollen: ["mitglied"] }, async ({ nutzer }) => ({ ok: true, ...(await mitgliedBackend().mgUebersicht(nutzer)) }));

const MITGLIED_AKTIONEN = ["zurueckziehen", "zeichnen", "kuendigen", "kuendigungZuruecknehmen", "uebertragen", "uebertragungAnnehmen", "uebertragungAblehnen"];

export const POST = route({ rollen: ["mitglied"] }, async ({ nutzer, body, ip }) => {
  const b = mitgliedBackend();
  const aktion = String(body.aktion || "");
  if (aktion === "beitritt") return { ok: true, mitgliedschaft: await b.mgBeitritt(nutzer, body.genoId, body.daten || {}, { ip }) };
  if (MITGLIED_AKTIONEN.includes(aktion)) {
    const { id, ...rest } = body;
    return { ok: true, ergebnis: await b.mgAktion(nutzer, id, rest, { ip }) };
  }
  if (aktion === "abstimmen") return { ok: true, stimme: await b.gvAbstimmen(nutzer, body.gvId, body.stimmen || {}, { ip }) };
  if (aktion === "egBeitreten") return { ok: true, teilnahme: await b.egBeitreten(nutzer, body.egId, body.daten || {}, { ip }) };
  if (aktion === "egKuendigen") return { ok: true, teilnahme: await b.egTeilnahmeAktion(nutzer, body.id, { aktion: "kuendigen" }, { ip }) };
  throw new PlattformFehler(422, "Unbekannte Aktion.");
});
