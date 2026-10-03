import Link from "next/link";
import { Angaben, Karte, SeitenKopf } from "@/components/Portal/ui";
import { SlaBadge, TicketStatus, TicketVerlauf } from "@/components/Portal/Support/teile";
import { TicketAktionen, TicketAntwort } from "@/components/Portal/Support/TicketFormulare";
import { portalNutzer, laden } from "@/lib/plattform/server/seite";
import { backend } from "@/lib/plattform/backend";
import { serviceBackend } from "@/lib/plattform/backend/service";
import { datumZeit } from "@/lib/plattform/format";
import { restText } from "@/lib/plattform/tickets";

export const metadata = { title: "Support-Anfrage" };

export default async function TicketSeite({ params }) {
  const n = await portalNutzer();
  const { id } = await params;
  const t = await laden(() => serviceBackend().ticket(n, id));
  const bo = t.meinZugriff === "backoffice";
  const konten = bo ? await backend().adminKonten(n).catch(() => []) : [];

  return (
    <>
      <SeitenKopf eyebrow={`${t.kategorieLabel} · ${t.id}`} titel={t.betreff} aktionen={<TicketStatus status={t.status} label={t.statusLabel} />}>
        <p className="mt-2 text-[14px] text-ink-600">
          Eröffnet {datumZeit(t.erstelltAm)} Uhr · Priorität {t.prioritaetLabel}
          {t.anlage ? <> · Anlage <Link href={`/portal/anlagen/${t.anlage.id}`} className="font-semibold text-ov-700 hover:underline">{t.anlage.name}</Link></> : null}
        </p>
      </SeitenKopf>
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="min-w-0 space-y-6">
          <Karte titel="Verlauf">
            <TicketVerlauf nachrichten={t.nachrichten} anhaenge={t.anhaenge} ticketId={t.id} />
            {t.status !== "geschlossen" && (
              <div className="mt-6 border-t border-ink-100 pt-5">
                <TicketAntwort ticketId={t.id} backoffice={bo} darfAntworten={t.darfAntworten} />
              </div>
            )}
          </Karte>
        </div>
        <aside className="min-w-0 space-y-6">
          <Karte titel={bo ? "Bearbeitung" : "Ihre Anfrage"}>
            <Angaben
              spalten={1}
              items={[
                { label: "Zuständig", wert: t.zustaendig?.name || "wird zugewiesen" },
                bo && { label: "Kunde", wert: t.kunde ? `${t.kunde.name} · ${t.kunde.email}` : "–" },
                bo ? { label: "SLA", wert: <SlaBadge sla={t.sla} /> } : { label: "Erste Antwort", wert: t.sla?.geantwortet ? "erfolgt" : `angestrebt bis ${datumZeit(t.sla?.reaktionBis)} Uhr` },
                bo && t.sla?.loesung && { label: "Lösungsziel", wert: `${datumZeit(t.sla.loesung.bis)} Uhr (${t.sla.loesung.erfuellt ? "erreicht" : restText(t.sla.loesung.restMin)})` },
                bo && t.helpdesk && { label: "Helpdesk", wert: `HD Ticket ${t.helpdesk}` },
              ]}
            />
            <div className="mt-5">
              <TicketAktionen ticket={t} backoffice={bo} konten={konten.map((k) => ({ id: k.id, name: [k.vorname, k.nachname].filter(Boolean).join(" ") || k.email }))} />
            </div>
          </Karte>
          {bo && t.verlauf?.length > 0 && (
            <Karte titel="Protokoll">
              <ul className="space-y-1.5 text-[12.5px] text-ink-600">
                {[...t.verlauf].reverse().slice(0, 15).map((v, i) => <li key={i}>{datumZeit(v.am)} · {v.text}</li>)}
              </ul>
            </Karte>
          )}
        </aside>
      </div>
    </>
  );
}
