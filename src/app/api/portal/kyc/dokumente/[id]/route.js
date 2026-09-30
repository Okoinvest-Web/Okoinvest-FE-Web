// GET    /api/portal/kyc/dokumente/[id] – eigene Unterlage ansehen (?anzeigen=1 inline); jeder Zugriff wird protokolliert
// DELETE /api/portal/kyc/dokumente/[id] – eigene, noch nicht geprüfte Unterlage löschen (solange bearbeitbar)
import { route } from "@/lib/plattform/server/route";
import { kycBackend } from "@/lib/plattform/backend/kyc";
import { kycDateiAntwort } from "@/lib/plattform/server/kycDatei";

export const GET = route({}, async ({ nutzer, params, suche, ip }) => {
  const { meta, daten } = await kycBackend().kycDokumentLesen(nutzer, params.id, { ip });
  return kycDateiAntwort(meta, daten, { anzeigen: suche.get("anzeigen") === "1" });
});

export const DELETE = route({ json: false }, async ({ nutzer, params }) => kycBackend().kycDokumentLoeschen(nutzer, params.id));
