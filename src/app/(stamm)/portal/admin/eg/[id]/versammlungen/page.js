// /portal/admin/eg/[id]/versammlungen – Backoffice: Mitglieder- bzw. Generalversammlungen, Beschlüsse und Beiträge der
// Gemeinschaft (WP5; Einladung und Abschluss führen Vorstand bzw. Schriftführung, das Backoffice bereitet vor).

import VereinSeite from "@/components/Portal/EG/Gruendung/VereinSeite";
import { portalNutzer } from "@/lib/plattform/server/seite";

export const metadata = { title: "Versammlungen" };

export default async function Seite({ params }) {
  const n = await portalNutzer({ admin: true });
  const { id } = await params;
  return <VereinSeite nutzer={n} gemeinschaftId={id} art="admin" start="versammlungen" reiter="versammlungen" />;
}
