import { FileSpreadsheet } from "lucide-react";
import DateiLink from "@/components/Portal/DateiLink";
import { SeitenKopf } from "@/components/Portal/ui";
import VorgaengeListe from "@/components/Portal/Bedienung/Liste/VorgaengeListe";
import { portalNutzer } from "@/lib/plattform/server/seite";
import { backend } from "@/lib/plattform/backend";
import { PROZESSE } from "@/lib/plattform/prozesse";
import { VORGANG_TYPEN } from "@/lib/plattform/konstanten";

export const metadata = { title: "Vorgänge" };

/** URL-Parameter (auch Links aus Cockpit/Dashboard wie ?status=eingegangen, ?ohne=1) → Startzustand der Liste */
function startAusUrl(sp) {
  const liste = (wert, erlaubt) => (typeof wert === "string" ? wert.split(",").filter((x) => erlaubt(x)).slice(0, 20) : []);
  const filter = {
    status: liste(sp?.status, (x) => !!PROZESSE.vorgang.status[x]),
    typ: liste(sp?.typ, (x) => !!VORGANG_TYPEN[x]),
    zust: sp?.ohne === "1" ? ["ohne"] : liste(sp?.zust, (x) => ["ich", "ohne", "andere"].includes(x)),
  };
  const [spalte, richtung] = typeof sp?.sort === "string" ? sp.sort.split(":") : [];
  return {
    q: typeof sp?.q === "string" ? sp.q.slice(0, 80) : "",
    filter: Object.fromEntries(Object.entries(filter).filter(([, v]) => v.length)),
    sortierung: spalte && ["auf", "ab"].includes(richtung) ? { spalte: spalte.slice(0, 30), richtung } : null,
  };
}

export default async function AdminVorgaenge({ searchParams }) {
  const n = await portalNutzer({ admin: true });
  const sp = await searchParams;
  const liste = await backend().vorgaenge(n, { alle: true });

  return (
    <div>
      <SeitenKopf eyebrow="Backoffice" titel="Alle Vorgänge" text="Anfragen aller Zielgruppen. Status ändern, kommentieren, Zuständigen setzen – der Nutzer sieht Änderungen sofort im Portal." aktionen={<DateiLink href="/api/admin/export/vorgaenge" icon={FileSpreadsheet}>CSV-Export</DateiLink>} />
      <VorgaengeListe vorgaenge={liste} ichId={n.id} start={startAusUrl(sp)} jetzt={Date.now()} />
    </div>
  );
}
