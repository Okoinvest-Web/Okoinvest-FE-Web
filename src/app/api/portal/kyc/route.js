// GET   /api/portal/kyc – eigener KYC-Fall: Angaben, Unterlagen (Metadaten), Anforderungen, Fortschritt, Freigaben
// PATCH /api/portal/kyc – Abschnitt speichern { abschnitt: kontotyp|person|firma|ubos|vertreter|pep|mittelherkunft|steuer|bank, daten }
import { route } from "@/lib/plattform/server/route";
import { kycBackend } from "@/lib/plattform/backend/kyc";

export const GET = route({}, async ({ nutzer }) => ({ ok: true, ...(await kycBackend().kycFall(nutzer)) }));

export const PATCH = route({ maxBytes: 32 * 1024 }, async ({ nutzer, body }) => ({ ok: true, ...(await kycBackend().kycSpeichern(nutzer, { abschnitt: String(body.abschnitt || ""), daten: body.daten || {} })) }));
