import { LifeBuoy } from "lucide-react";
import { Karte, Leer, SeitenKopf } from "@/components/Portal/ui";
import { TicketZeile } from "@/components/Portal/Support/teile";
import { TicketNeu } from "@/components/Portal/Support/TicketFormulare";
import { portalNutzer, laden } from "@/lib/plattform/server/seite";
import { serviceBackend } from "@/lib/plattform/backend/service";
import { anlagenBackend } from "@/lib/plattform/backend/anlagen";
import { TICKET_PRIORITAETEN } from "@/lib/plattform/tickets";

export const metadata = { title: "Support" };

export default async function SupportSeite({ searchParams }) {
  const n = await portalNutzer();
  const sp = await searchParams;
  const [tickets, anlagen] = await Promise.all([
    laden(() => serviceBackend().tickets(n, {})),
    n.rollen.includes("unternehmen") || n.rollen.includes("admin") ? anlagenBackend().anlagen(n, {}).catch(() => []) : [],
  ]);
  const offen = tickets.filter((t) => t.offen);
  const erledigt = tickets.filter((t) => !t.offen);

  return (
    <>
      <SeitenKopf eyebrow="Service" titel="Support" text="Störung an Ihrer Anlage, Frage zur Abrechnung, zum Vertrag oder zum Portal: Schreiben Sie uns hier – mit Verlauf, Anhängen und klaren Antwortzeiten." />
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_420px]">
        <div className="min-w-0 space-y-6">
          <Karte titel="Offene Anfragen" untertitel={`${offen.length} in Bearbeitung`} innen="p-0">
            {offen.length ? <ul className="divide-y divide-ink-100">{offen.map((t) => <TicketZeile key={t.id} t={t} />)}</ul> : <Leer icon={LifeBuoy} titel="Keine offenen Anfragen" text="Wenn Sie eine Frage haben, eröffnen Sie rechts eine neue Anfrage." className="m-5 border-0" />}
          </Karte>
          {erledigt.length > 0 && (
            <Karte titel="Erledigt" innen="p-0">
              <ul className="divide-y divide-ink-100">{erledigt.slice(0, 20).map((t) => <TicketZeile key={t.id} t={t} />)}</ul>
            </Karte>
          )}
        </div>
        <aside className="min-w-0 space-y-6">
          <Karte titel="Neue Anfrage">
            <TicketNeu anlagen={anlagen.map((a) => ({ id: a.id, name: a.name }))} startKategorie={sp?.kategorie} />
          </Karte>
          <Karte titel="Antwortzeiten">
            <ul className="space-y-1.5 text-[13.5px] text-ink-700">
              {Object.values(TICKET_PRIORITAETEN).map((p) => (
                <li key={p.label} className="flex justify-between gap-3"><span>{p.label}</span><span className="ov-num text-ink-500">erste Antwort ≤ {p.reaktionH} Std.</span></li>
              ))}
            </ul>
            <p className="mt-3 text-[12.5px] text-ink-500">Kalenderstunden. „Kritisch“ vergibt das Service-Team, z. B. bei Ausfall einer Anlage.</p>
          </Karte>
        </aside>
      </div>
    </>
  );
}
