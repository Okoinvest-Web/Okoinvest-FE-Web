// GET /api/portal/kyc/freigabe?schritt=nda|loi|gebot|zuschlag|veroeffentlichung|auszahlung|contracting|codevelopment[&flaecheId=]
// Prüft, ob das eigene Konto (bzw. die aktive Organisation) den Schritt ausführen darf – für Hinweise im Portal.
import { route } from "@/lib/plattform/server/route";
import { kycBackend } from "@/lib/plattform/backend/kyc";

export const GET = route({}, async ({ nutzer, suche }) => ({
  ok: true,
  freigabe: await kycBackend().kycFreigabePruefen(nutzer, { schritt: suche.get("schritt") || "", organisationId: nutzer.organisation?.id || null, flaecheId: suche.get("flaecheId") || null }),
}));
