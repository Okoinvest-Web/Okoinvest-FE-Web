import Link from "next/link";
import { redirect } from "next/navigation";
import { AlarmClock, Inbox, LifeBuoy, MessageSquareReply, UserRound } from "lucide-react";
import { cn } from "@/components/ui/cn";
import { Karte, Kennzahl, Leer, SeitenKopf } from "@/components/Portal/ui";
import { TicketZeile } from "@/components/Portal/Support/teile";
import { AusStoerung } from "@/components/Portal/Support/TicketFormulare";
import { portalNutzer, laden } from "@/lib/plattform/server/seite";
import { serviceBackend } from "@/lib/plattform/backend/service";
import { anlagenBackend } from "@/lib/plattform/backend/anlagen";
import { darfLesen, darfSchreiben } from "@/lib/plattform/rechte";

export const metadata = { title: "Support-Tickets" };

const FILTER = [
  ["offen", "Offen"],
  ["neu", "Neu"],
  ["wartet_kunde", "Wartet auf Kunde"],
  ["erledigt", "Erledigt"],
  ["", "Alle"],
];

export default async function AdminSupportSeite({ searchParams }) {
  const n = await portalNutzer({ admin: true });
  const sp = await searchParams;
  if (sp?.ticket && /^[A-Z]{1,3}-[0-9A-Z-]{4,40}$/.test(sp.ticket)) redirect(`/portal/support/${sp.ticket}`);
  const status = FILTER.some(([id]) => id === sp?.status) ? sp.status : "offen";
  const q = typeof sp?.q === "string" ? sp.q.slice(0, 80) : "";
  const s = serviceBackend();
  const [tickets, kennzahlen, stoerungen] = await Promise.all([
    laden(() => s.tickets(n, { alle: true, status, q })),
    laden(() => s.ticketKennzahlen(n)),
    darfSchreiben(n, "support") && darfLesen(n, "anlagen") ? anlagenBackend().stoerungen(n, { status: "offen", limit: 50 }).catch(() => []) : [],
  ]);
  const mitTicket = new Set((await s.tickets(n, { alle: true }).catch(() => [])).map((t) => t.stoerungId).filter(Boolean));
  const ohneTicket = stoerungen.filter((x) => !mitTicket.has(x.id)).slice(0, 8);

  return (
    <>
      <SeitenKopf eyebrow="Backoffice · Service" titel="Support-Tickets" text="Kundenanfragen und Störungen aus dem Anlagen-Modul mit Reaktions- und Lösungszielen (SLA). Sortiert nach Dringlichkeit – überfällige zuerst beachten." />
      <section aria-label="Kennzahlen" className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kennzahl ton="dunkel" icon={LifeBuoy} label="Offen" wert={String(kennzahlen.offen)} hinweis={`${kennzahlen.neu} neu`} />
        <Kennzahl icon={AlarmClock} label="SLA überschritten" wert={String(kennzahlen.slaVerletzt)} hinweis={`${kennzahlen.slaKnapp} knapp`} />
        <Kennzahl icon={MessageSquareReply} label="Wartet auf Kunde" wert={String(kennzahlen.wartetKunde)} />
        <Kennzahl icon={UserRound} label="Mir zugewiesen" wert={String(kennzahlen.meine)} />
      </section>
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <Karte
          titel="Tickets"
          innen="p-0"
          aktion={
            <form className="flex w-full gap-2 sm:w-auto" role="search">
              <input type="hidden" name="status" value={status} />
              <label htmlFor="sup-q" className="sr-only">Suchen</label>
              <input id="sup-q" name="q" defaultValue={q} placeholder="Suchen …" className="h-10 w-full min-w-0 rounded-full bg-white px-4 text-[14px] ring-1 ring-inset ring-ink-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ov-500 sm:w-[200px]" />
            </form>
          }
        >
          <nav aria-label="Filter" className="flex gap-2 overflow-x-auto border-b border-ink-100 px-5 py-3 md:px-6">
            {FILTER.map(([id, label]) => (
              <Link key={id || "alle"} href={`/portal/admin/support?status=${id}${q ? `&q=${encodeURIComponent(q)}` : ""}`} className={cn("whitespace-nowrap rounded-full px-3.5 py-1.5 text-[13.5px] font-semibold", status === id ? "bg-navy-900 text-white" : "bg-ink-50 text-ink-700 hover:bg-ink-100")}>
                {label}
              </Link>
            ))}
          </nav>
          {tickets.length ? <ul className="divide-y divide-ink-100">{tickets.map((t) => <TicketZeile key={t.id} t={t} backoffice />)}</ul> : <Leer icon={Inbox} titel="Keine Tickets" text="Für diesen Filter gibt es keine Tickets." className="m-5 border-0" />}
        </Karte>
        <aside className="min-w-0 space-y-6">
          {darfSchreiben(n, "support") && darfLesen(n, "anlagen") && (
            <Karte titel="Störungen ohne Ticket" untertitel="Aus dem Anlagen-Leitstand übernehmen">
              <AusStoerung stoerungen={ohneTicket} />
            </Karte>
          )}
          <Karte titel="SLA-Regeln">
            <p className="text-[13px] leading-relaxed text-ink-600">Reaktion/Lösung in Kalenderstunden: Kritisch 2/24 · Hoch 8/48 · Normal 24/120 · Niedrig 48/240. Die erste öffentliche Antwort erfüllt die Reaktionszeit; interne Notizen zählen nicht. Mit Frappe Helpdesk werden Tickets zusätzlich als „HD Ticket“ geführt.</p>
          </Karte>
        </aside>
      </div>
    </>
  );
}
