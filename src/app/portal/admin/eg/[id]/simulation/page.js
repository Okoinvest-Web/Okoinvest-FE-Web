// /portal/admin/eg/[id]/simulation – Kurzweg zur Simulation mit den Daten dieser Gemeinschaft (WP3).
import { redirect } from "next/navigation";
import { portalNutzer } from "@/lib/plattform/server/seite";

export default async function Seite({ params }) {
  await portalNutzer({ admin: true });
  const { id } = await params;
  redirect(`/portal/admin/eg/simulation?gemeinschaft=${encodeURIComponent(id)}`);
}
