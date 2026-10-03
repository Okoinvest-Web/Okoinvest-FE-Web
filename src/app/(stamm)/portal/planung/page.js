import { redirect } from "next/navigation";
import { istAdmin, portalNutzer } from "@/lib/plattform/server/seite";

// Keine eigene Übersicht: Pläne hängen am Entwicklungsprojekt (Brotkrumen von /portal/planung/[vid] führen hierher)
export default async function PlanungUebersicht() {
  const n = await portalNutzer();
  redirect(istAdmin(n) ? "/portal/admin/entwicklung" : "/portal/entwicklung");
}
