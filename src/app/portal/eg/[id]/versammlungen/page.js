// /portal/eg/[id]/versammlungen – Organ-Reiter „Versammlungen“ (eg/navigation.js EG_ORGAN_REITER) – gleiche Ansicht wie
// /portal/eg/[id]/verein, Einstieg Versammlungen (WP5).

import VereinSeite from "@/components/Portal/EG/Gruendung/VereinSeite";
import { portalNutzer } from "@/lib/plattform/server/seite";

export const metadata = { title: "Versammlungen" };

export default async function Seite({ params }) {
  const n = await portalNutzer();
  const { id } = await params;
  return <VereinSeite nutzer={n} gemeinschaftId={id} art="portal" start="versammlungen" />;
}
