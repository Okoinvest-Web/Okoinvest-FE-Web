// POST /api/portal/projekte/[id]/provision – { akzeptiert: true } Provisionsvereinbarung (Zeitstempel + IP protokolliert)
import { route } from "@/lib/plattform/server/route";
import { PlattformFehler } from "@/lib/plattform/fehler";
import { signaturModusPruefen } from "@/lib/plattform/signatur/server"; // Signatur: Modus „signatur“ → 409 signatur_noetig

export const POST = route({ rollen: ["anbieter"] }, async ({ backend, nutzer, params, body, ip }) => {
  if (body.akzeptiert !== true) throw new PlattformFehler(422, "Bitte bestätigen Sie die Provisionsvereinbarung.");
  await signaturModusPruefen(nutzer, "provision", params.id, { ip }); // Signatur: Standard „klick“ ohne Wirkung
  return { ok: true, projekt: await backend.provisionAkzeptieren(nutzer, params.id, { ip }) };
});
