// src/components/Portal/Kyc/KycHinweisServer.js
//
// Server-Komponente für andere Portalseiten: zeigt „Um … bitte Verifizierung abschließen“, wenn der Schritt für das
// angemeldete Konto gesperrt ist. Einbinden: <KycHinweisServer schritt="nda" nutzer={n} /> (Schritte: kyc.js KYC_SCHRITTE).
// Fehler im KYC-Modul unterdrücken die Anzeige (die Sperre selbst erzwingt das Backend).

import { kycBackend } from "@/lib/plattform/backend/kyc";
import { KycHinweis } from "./teile";

export default async function KycHinweisServer({ schritt, nutzer, flaecheId = null, className }) {
  if (!nutzer) return null;
  let r = null;
  try {
    r = await kycBackend().kycFreigabePruefen(nutzer, { schritt, organisationId: nutzer.organisation?.id || null, flaecheId });
  } catch {
    return null;
  }
  if (!r?.aktiv || r.ok) return null;
  return <KycHinweis schritt={schritt} status={{ verifiziert: false, status: r.status }} aktiv className={className} />;
}
