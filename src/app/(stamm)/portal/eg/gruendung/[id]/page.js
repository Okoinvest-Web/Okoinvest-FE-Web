// /portal/eg/gruendung/[id] – Gründungsauftrag aus Sicht des Auftraggebers bzw. des Vorstands (WP5): Angebot und Unterschrift,
// Fahrplan mit Fristen und Nachweisen, Muster und Dokumente, Ausfüllhilfen, Förder-Check, Nachrichten. Fremde Aufträge → 404.

import AuftragSeite from "@/components/Portal/EG/Gruendung/AuftragSeite";
import { portalNutzer, laden } from "@/lib/plattform/server/seite";
import { egBackend } from "@/lib/plattform/backend/eg";

export const metadata = { title: "Gründungsauftrag" };

export default async function Seite({ params }) {
  const n = await portalNutzer();
  const { id } = await params;
  const b = egBackend();
  const [a, nb] = await Promise.all([laden(() => b.grAuftrag(n, id)), laden(() => b.egNetzbetreiber(n))]);
  return <AuftragSeite auftrag={a} netzbetreiber={nb.netzbetreiber || []} art="kunde" />;
}
