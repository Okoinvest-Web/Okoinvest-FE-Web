// GET  /api/admin/entwicklung/steuerung – Steuerung aller Entwicklungsprojekte: Projektampel, Pipeline MWp je Phase × Land,
//      Ziel-Abgleich (rund 50 MWp/Jahr), Kapazität der Projektleitungen, Risiken, Dokumentenlücken, Optionsfristen, Vorlagen
// POST /api/admin/entwicklung/steuerung – { aktion: "aufgaben", projektId? } Aufgaben aus fälligen Meilensteinen/Optionsfristen
//      | { aktion: "kapazitaet", nutzerId, stundenMonat } (nur Leitung; null = Standard)
import { route } from "@/lib/plattform/server/route";
import { PlattformFehler } from "@/lib/plattform/fehler";
import { steuerungBackend } from "@/lib/plattform/backend/entwicklung-steuerung";

export const GET = route({ admin: true }, async ({ nutzer }) => ({ ok: true, ...(await steuerungBackend().steuerungUebersicht(nutzer)) }));

export const POST = route({ admin: true }, async ({ nutzer, body }) => {
  const aktion = String(body?.aktion || "");
  if (aktion === "aufgaben") return await steuerungBackend().steuerungAufgabenErzeugen(nutzer, { projektId: String(body?.projektId || "") });
  if (aktion === "kapazitaet") {
    const h = body?.stundenMonat;
    return await steuerungBackend().steuerungKapazitaetSetzen(nutzer, String(body?.nutzerId || ""), { stundenMonat: h === null || h === undefined || h === "" ? null : Number(h) });
  }
  throw new PlattformFehler(400, "Unbekannte Aktion.");
});
