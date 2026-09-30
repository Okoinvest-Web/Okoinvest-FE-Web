// GET /api/admin/compliance/dokumente/[id] – Unterlage (entschlüsselt) für die Compliance; jeder Zugriff im Protokoll (Hash-Kette)
import { route } from "@/lib/plattform/server/route";
import { kycBackend } from "@/lib/plattform/backend/kyc";
import { kycDateiAntwort } from "@/lib/plattform/server/kycDatei";

export const GET = route({ admin: true }, async ({ nutzer, params, suche, ip }) => {
  const { meta, daten } = await kycBackend().kycDokumentLesen(nutzer, params.id, { ip });
  return kycDateiAntwort(meta, daten, { anzeigen: suche.get("anzeigen") === "1" });
});
