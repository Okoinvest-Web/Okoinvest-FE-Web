// PUT /api/portal/fach/mitglied – { art: "geno" | "eg", daten } Interesse Genossenschaft bzw. Teilnahme Energiegemeinschaft
import { route } from "@/lib/plattform/server/route";
import { fachBackend } from "@/lib/plattform/backend/fach";
import { PlattformFehler } from "@/lib/plattform/fehler";

export const PUT = route({ rollen: ["mitglied"] }, async ({ nutzer, body, ip }) => {
  const b = fachBackend();
  if (body.art === "geno") return { ok: true, geno: await b.genoInteresseSpeichern(nutzer, body.daten || {}, { ip }) };
  if (body.art === "eg") return { ok: true, eg: await b.egTeilnahmeSpeichern(nutzer, body.daten || {}) };
  throw new PlattformFehler(422, "Unbekannte Art.");
});
