// /portal/admin/kanaele – Anfragen je Gruppen- und Partnerkanal (Welle 2, Paket GRP; Einbau durch QM)
//
// Nur Zählwerte je Kanal, Kennung und Land (GET /api/admin/kanaele), keine Personendaten.
// Recht: Bereich „Berichte“ (wie die API). Partner-Register enthält bis zur Freigabe durch den Inhaber (E9)
// nur Entwürfe.

import { notFound } from "next/navigation";
import { SeitenKopf } from "@/components/Portal/ui";
import KanalAuswertung from "@/components/Portal/Kanaele/KanalAuswertung";
import { portalNutzer } from "@/lib/plattform/server/seite";
import { darfLesen } from "@/lib/plattform/rechte";

export const metadata = { title: "Kanäle Gruppe & Partner" };

export default async function KanaeleSeite() {
  const n = await portalNutzer({ admin: true });
  if (!darfLesen(n, "berichte")) notFound();
  return (
    <div className="space-y-6">
      <SeitenKopf
        eyebrow="Backoffice · Steuerung"
        titel="Kanäle Gruppe & Partner"
        text="Anfragen je Kanal, Kennung und Land – nur Zählwerte, ohne Personendaten. Partner-Einträge sind Entwürfe, bis der Inhaber sie freigibt."
      />
      <KanalAuswertung />
    </div>
  );
}
