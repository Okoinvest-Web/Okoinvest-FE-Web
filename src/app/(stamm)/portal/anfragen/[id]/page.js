import { redirect } from "next/navigation";
import VorgangDetail from "@/components/Portal/VorgangDetail";
import { portalNutzer, laden } from "@/lib/plattform/server/seite";
import { backend } from "@/lib/plattform/backend";

export const metadata = { title: "Anfrage" };

export default async function Anfrage({ params }) {
  const { id } = await params;
  const n = await portalNutzer();
  const b = backend();
  const vorgang = await laden(() => b.vorgang(n, id));
  // Fremde Vorgänge (nur für Admin sichtbar) in der Backoffice-Ansicht öffnen
  if (vorgang.nutzerId && vorgang.nutzerId !== n.id) redirect(`/portal/admin/vorgaenge/${id}`);
  if (!vorgang.nutzerId) redirect(`/portal/admin/vorgaenge/${id}`);
  const [thread, dokumente] = await Promise.all([b.nachrichten(n, "vorgang", id), b.dokumente(n, { bezugArt: "vorgang", bezugId: id })]);
  return <VorgangDetail vorgang={vorgang} thread={thread} dokumente={dokumente} nutzer={n} />;
}
