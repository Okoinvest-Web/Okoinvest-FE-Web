// /portal/admin/eg/gruendung/neu – Backoffice legt einen Gründungs- bzw. Wechselauftrag (optional für ein Auftraggeber-Konto) an. WP5.

import { Karte, SeitenKopf } from "@/components/Portal/ui";
import GrAnfrage from "@/components/Portal/EG/Gruendung/Anfrage";
import { portalNutzer, laden } from "@/lib/plattform/server/seite";
import { egBackend } from "@/lib/plattform/backend/eg";

export const metadata = { title: "Gründungsauftrag anlegen" };

export default async function Seite({ searchParams }) {
  const n = await portalNutzer({ admin: true });
  const sp = (await searchParams) || {};
  const nb = await laden(() => egBackend().egNetzbetreiber(n));
  return (
    <div className="space-y-6">
      <SeitenKopf eyebrow="Backoffice · Gründungsaufträge" titel="Auftrag anlegen" text="Für eine Initiative, Gemeinde oder bestehende Gemeinschaft – mit Portalkonto des Auftraggebers für Angebot, Unterschrift und Fahrplan." />
      <Karte><GrAnfrage netzbetreiber={nb.netzbetreiber || []} basis="/portal/admin/eg/gruendung" admin startPaket={typeof sp.paket === "string" ? sp.paket : ""} /></Karte>
    </div>
  );
}
