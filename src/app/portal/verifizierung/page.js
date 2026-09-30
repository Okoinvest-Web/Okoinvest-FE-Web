import { KycStatusBadge } from "@/components/Portal/Kyc/teile";
import KycAssistent from "@/components/Portal/Kyc/KycAssistent";
import { Hinweis, SeitenKopf } from "@/components/Portal/ui";
import { portalNutzer, laden } from "@/lib/plattform/server/seite";
import { kycBackend } from "@/lib/plattform/backend/kyc";
import IdentitaetsPruefung from "@/components/Portal/Dienste/IdentitaetsPruefung"; // Dienste: Online-Identifizierung + MRZ-Vorprüfung
import { diensteBackend } from "@/lib/plattform/backend/dienste"; // Dienste

export const metadata = { title: "Verifizierung" };

export default async function VerifizierungSeite() {
  const n = await portalNutzer();
  const daten = await laden(() => kycBackend().kycFall(n));
  const ident = await diensteBackend().identStatus(n).catch(() => null); // Dienste: Identitätsanbieter/MRZ (optional)
  return (
    <>
      <SeitenKopf
        eyebrow="Konto · Verifizierung"
        titel="Identität bestätigen"
        text="Für Datenraum, Absichtserklärungen, Gebote, Projektveröffentlichungen, Pachtauszahlungen und Contracting-Verträge prüfen wir einmalig Ihre Identität bzw. Ihr Unternehmen – einfach, geführt und verschlüsselt."
        aktionen={<KycStatusBadge status={daten.fall?.status || null} />}
      />
      {daten.ablage?.entwicklung && (
        <Hinweis ton="neutral" className="mb-5">Entwicklungsbetrieb: Die Ablage nutzt einen lokalen Entwicklungsschlüssel. Für den Betrieb PLATTFORM_KYC_SCHLUESSEL setzen.</Hinweis>
      )}
      {ident && <IdentitaetsPruefung start={JSON.parse(JSON.stringify(ident))} />}
      <KycAssistent start={JSON.parse(JSON.stringify(daten))} rollen={n.rollen || []} />
    </>
  );
}
