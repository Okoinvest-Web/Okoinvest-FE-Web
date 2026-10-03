import { CalendarClock, CalendarDays, Plane, Users } from "lucide-react";
import { Karte, Kennzahl, SeitenKopf } from "@/components/Portal/ui";
import Kalender from "@/components/Portal/Termine/Kalender";
import Verfuegbarkeit from "@/components/Portal/Termine/Verfuegbarkeit";
import { portalNutzer, laden } from "@/lib/plattform/server/seite";
import { serviceBackend } from "@/lib/plattform/backend/service";
import { heuteTag, tagPlus } from "@/lib/plattform/termine";

export const metadata = { title: "Kalender" };

export default async function KalenderSeite() {
  const n = await portalNutzer({ admin: true });
  const s = serviceBackend();
  const heute = heuteTag();
  const [vf, woche] = await Promise.all([laden(() => s.verfuegbarkeiten(n)), laden(() => s.termine(n, { alle: true, von: heute, bis: tagPlus(heute, 6) }))]);
  const aktiv = woche.filter((t) => ["gebucht", "bestaetigt"].includes(t.status));
  const heuteAnzahl = aktiv.filter((t) => new Date(t.start).toLocaleDateString("sv-SE", { timeZone: "Europe/Vienna" }) === heute).length;
  const unbestaetigt = aktiv.filter((t) => t.status === "gebucht").length;
  const abwesend = vf.mitarbeiter.filter((m) => m.abwesenheiten?.some((a) => a.von <= tagPlus(heute, 6) && a.bis >= heute)).length;

  return (
    <>
      <SeitenKopf eyebrow="Backoffice · Termine" titel="Kalender" text="Alle Termine des Teams: Flächenbesichtigungen, Beratungen, Gemeindetermine und Datenraum-Sessions. Buchungen aus Portal und Website, Vertretungen bei Abwesenheit, Einladungen mit Kalenderdatei." />
      <section aria-label="Kennzahlen" className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kennzahl ton="dunkel" icon={CalendarDays} label="Heute" wert={String(heuteAnzahl)} />
        <Kennzahl icon={CalendarClock} label="Nächste 7 Tage" wert={String(aktiv.length)} hinweis={`${unbestaetigt} unbestätigt`} />
        <Kennzahl icon={Users} label="Buchbare Mitarbeiter" wert={String(vf.mitarbeiter.filter((m) => m.aktiv && m.terminarten.length).length)} />
        <Kennzahl icon={Plane} label="Abwesend (7 Tage)" wert={String(abwesend)} href="/portal/admin/team" />
      </section>
      <div className="grid gap-6 2xl:grid-cols-[minmax(0,1fr)_380px]">
        <Karte titel="Team-Kalender" innen="p-4 md:p-6">
          <Kalender mitarbeiter={vf.mitarbeiter.map((m) => ({ id: m.id, name: m.name }))} darfBearbeiten={vf.darfBearbeiten} ichId={n.id} />
        </Karte>
        <Karte titel="Verfügbarkeiten" untertitel="Buchbare Terminarten und Arbeitszeiten" innen="p-4 md:p-5">
          <Verfuegbarkeit mitarbeiter={vf.mitarbeiter} darfBearbeiten={vf.darfBearbeiten} />
          {vf.feiertage?.length > 0 && <p className="mt-3 text-[12.5px] text-ink-500">Nächste Feiertage: {vf.feiertage.slice(0, 4).map((f) => f.split("-").reverse().join(".")).join(", ")}</p>}
        </Karte>
      </div>
    </>
  );
}
