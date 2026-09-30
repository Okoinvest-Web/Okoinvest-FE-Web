// GET  /api/admin/entwicklung/[id]/steuerung – Ampel, Flächensicherung (Grundbuch, Optionsfristen), Entscheidungsvorlagen,
//      Geschäftsmodell-Vergleich, SPV/Finanzierungsfall, Aufgaben des Projekts
// POST /api/admin/entwicklung/[id]/steuerung – { aktion: "sicherung", flaecheId, daten: { grundbuch, grundbuchDatum, optionBis } }
//      | { aktion: "vorlage", id?, daten: { art, titel, sachverhalt, beschlussvorschlag, alternativen, risikenText, budgetEur,
//        empfehlung, entscheidungBis } } (Entwurf anlegen/bearbeiten) | { aktion: "aufgaben" }
import { route } from "@/lib/plattform/server/route";
import { PlattformFehler } from "@/lib/plattform/fehler";
import { steuerungBackend } from "@/lib/plattform/backend/entwicklung-steuerung";

export const GET = route({ admin: true }, async ({ nutzer, params }) => ({ ok: true, ...(await steuerungBackend().steuerungProjekt(nutzer, params.id)) }));

export const POST = route({ admin: true }, async ({ nutzer, params, body }) => {
  const aktion = String(body?.aktion || "");
  const daten = body?.daten && typeof body.daten === "object" ? body.daten : {};
  if (aktion === "sicherung") return await steuerungBackend().steuerungSicherung(nutzer, params.id, String(body?.flaecheId || ""), daten);
  if (aktion === "vorlage") return { ok: true, vorlage: await steuerungBackend().vorlageSpeichern(nutzer, params.id, { id: body?.id ? String(body.id) : null, daten }) };
  if (aktion === "aufgaben") return await steuerungBackend().steuerungAufgabenErzeugen(nutzer, { projektId: params.id });
  throw new PlattformFehler(400, "Unbekannte Aktion.");
});
