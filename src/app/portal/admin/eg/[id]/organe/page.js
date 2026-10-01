// /portal/admin/eg/[id]/organe – Backoffice: Organe und Funktionsperioden der Gemeinschaft (Organ-Einträge über WP1, Regeln
// und Ansicht WP5: Besetzung nach VerG §§ 5, 21 bzw. GenG, ablaufende Perioden, Statuten, Dokumente, Auflösung).

import VereinSeite from "@/components/Portal/EG/Gruendung/VereinSeite";
import { portalNutzer } from "@/lib/plattform/server/seite";

export const metadata = { title: "Organe" };

export default async function Seite({ params }) {
  const n = await portalNutzer({ admin: true });
  const { id } = await params;
  return <VereinSeite nutzer={n} gemeinschaftId={id} art="admin" start="organe" reiter="organe" />;
}
