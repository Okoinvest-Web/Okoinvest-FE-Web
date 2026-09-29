import VorgangDetail from "@/components/Portal/VorgangDetail";
import { portalNutzer, laden } from "@/lib/plattform/server/seite";
import { backend } from "@/lib/plattform/backend";

export const metadata = { title: "Vorgang" };

export default async function AdminVorgang({ params }) {
  const { id } = await params;
  const n = await portalNutzer({ admin: true });
  const b = backend();
  const vorgang = await laden(() => b.vorgang(n, id));
  const [thread, dokumente, adminKonten] = await Promise.all([
    b.nachrichten(n, "vorgang", id),
    b.dokumente(n, { bezugArt: "vorgang", bezugId: id }),
    b.adminKonten(n),
  ]);
  return <VorgangDetail vorgang={vorgang} thread={thread} dokumente={dokumente} nutzer={n} admin adminKonten={adminKonten} />;
}
