// /portal/eg/[id]/verein – Vereinsorganisation für Organe und Mitglieder (WP5): Versammlungen mit Online-Abstimmung,
// Beschlussregister, Organe, Mitgliedsbeiträge (Kassier), Statuten und Dokumente, Auflösung. Ohne Rolle in der Gemeinschaft → 404.

import VereinSeite from "@/components/Portal/EG/Gruendung/VereinSeite";
import { portalNutzer } from "@/lib/plattform/server/seite";

export const metadata = { title: "Verein" };

export default async function Seite({ params, searchParams }) {
  const n = await portalNutzer();
  const { id } = await params;
  const sp = (await searchParams) || {};
  const start = ["versammlungen", "beschluesse", "organe", "beitraege", "statuten", "aufloesung"].includes(sp.reiter) ? sp.reiter : "versammlungen";
  return <VereinSeite nutzer={n} gemeinschaftId={id} art="portal" start={start} />;
}
