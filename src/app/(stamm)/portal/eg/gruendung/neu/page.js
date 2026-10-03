// /portal/eg/gruendung/neu – Anfrage eines Gründungs- bzw. Wechselauftrags (WP5). Angemeldet; Prüfung serverseitig.

import { Karte, SeitenKopf } from "@/components/Portal/ui";
import GrAnfrage from "@/components/Portal/EG/Gruendung/Anfrage";
import { portalNutzer, laden } from "@/lib/plattform/server/seite";
import { egBackend } from "@/lib/plattform/backend/eg";

export const metadata = { title: "Anfrage Gründung" };

export default async function Seite({ searchParams }) {
  const n = await portalNutzer();
  const sp = (await searchParams) || {};
  const nb = await laden(() => egBackend().egNetzbetreiber(n));
  return (
    <div className="space-y-6">
      <SeitenKopf eyebrow="Gemeinschaft gründen" titel="Ihre Anfrage" text="Wenige Angaben genügen. Wir melden uns mit einem unverbindlichen Angebot und einem Fahrplan mit Fristen." />
      <Karte>
        <GrAnfrage netzbetreiber={nb.netzbetreiber || []} startPaket={typeof sp.paket === "string" ? sp.paket : ""} />
      </Karte>
    </div>
  );
}
