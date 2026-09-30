import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { SeitenKopf, Badge } from "@/components/Portal/ui";
import Cockpit from "@/components/Portal/Finanzierung/Cockpit";
import { portalNutzer, laden } from "@/lib/plattform/server/seite";
import { finanzierungBackend } from "@/lib/plattform/backend/finanzierung";
import { cockpitStandard } from "@/lib/plattform/finanzierung/kern";

export const metadata = { title: "Finanzierungscockpit" };

// Investoren-Finanzierungscockpit: freies Werkzeug oder je Börsenprojekt (?projekt=ID, nur mit freigegebenem Datenraum bzw. als
// Anbieter/Backoffice – sonst 404). ?szenario=ID lädt ein eigenes gespeichertes Szenario.
export default async function FinanzierungsCockpitSeite({ searchParams }) {
  const n = await portalNutzer();
  const sp = (await searchParams) || {};
  const b = finanzierungBackend();
  const liste = await laden(() => b.fzCockpitListe(n));
  let projekt = null;
  let start = cockpitStandard({ land: "DE" });
  let quellen = {};
  let hinweise = [];
  if (sp.projekt && /^[A-Z]{1,3}-[0-9A-Z-]{4,40}$/.test(sp.projekt)) {
    const d = await laden(() => b.fzCockpitProjekt(n, sp.projekt));
    projekt = d.projekt;
    start = d.vorbelegung.eingaben;
    quellen = d.vorbelegung.quellen || {};
    hinweise = d.vorbelegung.hinweise || [];
  }
  const gespeichert = liste.szenarien.find((s) => s.id === sp.szenario);
  if (gespeichert) start = gespeichert.eingaben;
  const szenarien = projekt ? liste.szenarien.filter((s) => s.projektId === projekt.id || !s.projektId) : liste.szenarien;

  return (
    <>
      <SeitenKopf
        eyebrow={projekt ? "Finanzierung · Projekt aus dem Datenraum" : "Finanzierung · freies Werkzeug"}
        titel={projekt ? projekt.titel : "Finanzierungscockpit"}
        text="Rendite, Kapitalwert, Amortisation und Stromgestehungskosten – und die Finanzierung im Vergleich: Eigenkapital, Annuitätenkredit, Projektfinanzierung, Förderkredit, Leasing, Mietkauf und Mischformen."
        aktionen={projekt ? <Link href={`/portal/boerse/${projekt.id}`} className="inline-flex h-11 items-center gap-2 rounded-full bg-white px-5 text-[14px] font-semibold text-ink-800 ring-1 ring-inset ring-ink-200 hover:ring-ink-300"><ArrowLeft aria-hidden="true" className="h-4 w-4" />Zum Exposé</Link> : null}
      >
        {projekt && (
          <div className="mt-3 flex flex-wrap gap-2">
            <Badge ton="info">{String(projekt.mwp).replace(".", ",")} MWp</Badge>
            <Badge>{projekt.land}</Badge>
            <Badge ton="ok">Werte aus Datenblatt/Exposé vorbelegt – alles änderbar</Badge>
          </div>
        )}
      </SeitenKopf>
      <Cockpit key={`${projekt?.id || "frei"}-${gespeichert?.id || ""}`} start={start} quellen={quellen} projekt={projekt} projekte={liste.projekte} szenarien={szenarien} vbHinweise={hinweise} />
    </>
  );
}
