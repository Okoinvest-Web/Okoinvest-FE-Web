// /portal/admin/eg/gruendung/[id] – Backoffice: Gründungs- bzw. Wechselauftrag steuern (WP5): Angebot und Signatur,
// Gemeinschaft über WP1 anlegen, Schritte mit Wirkung auf Stammdaten und Lebenszyklus, EDA-Start (Ereignis an WP2),
// Wechsel-Import, Kontrollabrechnung (WP4), Dokumente, Ausfüllhilfen, Förder-Check.

import AuftragSeite from "@/components/Portal/EG/Gruendung/AuftragSeite";
import { portalNutzer, laden } from "@/lib/plattform/server/seite";
import { egBackend } from "@/lib/plattform/backend/eg";

export const metadata = { title: "Gründungsauftrag" };

export default async function Seite({ params }) {
  const n = await portalNutzer({ admin: true });
  const { id } = await params;
  const b = egBackend();
  const [a, nb] = await Promise.all([laden(() => b.grAuftrag(n, id)), laden(() => b.egNetzbetreiber(n))]);
  let gemeinschaften = [];
  if (!a.gemeinschaftId) {
    try {
      gemeinschaften = (await b.egGemeinschaften(n, {})).gemeinschaften.map((g) => ({ id: g.id, name: g.name }));
    } catch {
      gemeinschaften = [];
    }
  }
  return <AuftragSeite auftrag={a} netzbetreiber={nb.netzbetreiber || []} gemeinschaften={gemeinschaften} art="admin" />;
}
