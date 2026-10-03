// /portal/admin/gesellschaften – Gesellschaftsverzeichnis (Bestand + Projektgesellschaften/SPV in Gründung) mit Organigramm,
// Gründungsfortschritt und Fristen (Meldungen, Jahresabschluss, WiEReG). Neue Gründung: /portal/admin/gesellschaften/neu.
import Link from "next/link";
import { Building2, CalendarClock, Hammer, Plus } from "lucide-react";
import Button from "@/components/ui/Button";
import { Badge, Karte, Kennzahl, Leer, SeitenKopf } from "@/components/Portal/ui";
import Organigramm from "@/components/Portal/Dienste/Organigramm";
import { portalNutzer, laden } from "@/lib/plattform/server/seite";
import { diensteBackend } from "@/lib/plattform/backend/dienste";
import { GESELLSCHAFT_STATUS } from "@/lib/plattform/dienste/gesellschaft/rechtsformen";
import { datum } from "@/lib/plattform/format";
import { cn } from "@/components/ui/cn";

export const metadata = { title: "Gesellschaften & SPV-Gründung" };

const FILTER = [["", "Alle"], ["entwurf", "Entwurf"], ["in_gruendung", "In Gründung"], ["eingetragen", "Eingetragen"], ["aktiv", "Aktiv"], ["bestand", "Bestand"]];

export default async function GesellschaftenSeite({ searchParams }) {
  const n = await portalNutzer({ admin: true });
  const sp = await searchParams;
  const status = FILTER.some(([k]) => k === sp?.status) ? sp.status : "";
  const q = typeof sp?.q === "string" ? sp.q.slice(0, 80) : "";
  const d = await laden(() => diensteBackend().gesellschaftenListe(n, { q, status }));
  const k = d.kennzahlen;
  return (
    <>
      <SeitenKopf
        eyebrow="Backoffice · Gesellschaften"
        titel="Gesellschaften & SPV-Gründung"
        text="Projektgesellschaften aus Entwicklungsprojekten gründen (AT GmbH, DE GmbH bzw. GmbH & Co. KG, CH GmbH): Namensprüfung, Dokumentenpaket als Muster für das Notariat, Checkliste bis zur Eintragung und Fristen danach."
        aktionen={d.schreiben ? <Button href="/portal/admin/gesellschaften/neu" size="sm" icon={Plus}>Neue Gründung</Button> : null}
      />
      <section aria-label="Kennzahlen" className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kennzahl ton="dunkel" icon={Building2} label="Gesellschaften" wert={String(k.gesamt)} />
        <Kennzahl icon={Hammer} label="In Gründung" wert={String(k.inGruendung)} href="/portal/admin/gesellschaften?status=in_gruendung" />
        <Kennzahl icon={Building2} label="Aktiv / Bestand" wert={String(k.aktiv)} />
        <Kennzahl icon={CalendarClock} label="Fristen ≤ 60 Tage" wert={String(k.fristen)} hinweis={k.ueberfaellig ? `${k.ueberfaellig} überfällig` : undefined} />
      </section>

      <Karte titel="Beteiligungsstruktur" untertitel="Organigramm aller Gesellschaften der Gruppe – Klick öffnet die Gesellschaft" className="mb-6">
        <Organigramm daten={d.organigramm} />
      </Karte>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <Karte
          titel="Verzeichnis"
          untertitel={`${d.gesellschaften.length} Gesellschaften`}
          innen="p-0"
          aktion={
            <form role="search" action="/portal/admin/gesellschaften" className="w-full sm:w-auto">
              {status && <input type="hidden" name="status" value={status} />}
              <label htmlFor="g-suche" className="sr-only">Suche</label>
              <input id="g-suche" name="q" defaultValue={q} placeholder="Name, FN/HRB, Sitz" className="h-10 w-full rounded-full bg-white px-4 text-[14px] ring-1 ring-inset ring-ink-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ov-500 sm:w-[220px]" />
            </form>
          }
        >
          <nav aria-label="Filter" className="flex gap-1.5 overflow-x-auto border-b border-ink-100 px-5 py-3 ov-no-scrollbar md:px-6">
            {FILTER.map(([key, label]) => (
              <Link key={key || "alle"} href={`/portal/admin/gesellschaften${key ? `?status=${key}` : ""}`} aria-current={status === key ? "page" : undefined}
                className={cn("whitespace-nowrap rounded-full px-3 py-1.5 text-[13px] font-semibold ring-1 ring-inset", status === key ? "bg-navy-900 text-white ring-navy-900" : "bg-white text-ink-700 ring-ink-200 hover:ring-ink-300")}>
                {label}
              </Link>
            ))}
          </nav>
          {d.gesellschaften.length === 0 ? (
            <Leer icon={Building2} titel="Keine Gesellschaften" text="In dieser Ansicht gibt es keine Einträge." className="m-5" />
          ) : (
            <ul className="divide-y divide-ink-100">
              {d.gesellschaften.map((g) => (
                <li key={g.id} className="px-5 py-4 md:px-6">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0">
                      <Link href={`/portal/admin/gesellschaften/${g.id}`} className="font-semibold text-ink-900 hover:text-ov-700">{g.name}</Link>
                      <p className="mt-0.5 text-[12.5px] text-ink-500">{[g.rechtsformLabel, g.registernummer || "noch nicht eingetragen", g.sitz, g.projekt ? `Projekt ${g.projekt.titel}` : ""].filter(Boolean).join(" · ")}</p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      {g.demo && <Badge ton="warn">Demo</Badge>}
                      <Badge ton={GESELLSCHAFT_STATUS[g.status]?.ton}>{g.statusLabel}</Badge>
                    </div>
                  </div>
                  {g.herkunft !== "stammdaten" && (
                    <div className="mt-2.5 flex items-center gap-3">
                      <div className="h-2 flex-1 overflow-hidden rounded-full bg-ink-100" role="progressbar" aria-valuenow={g.fortschritt.quote} aria-valuemin={0} aria-valuemax={100} aria-label={`Gründungsfortschritt ${g.name}`}>
                        <div className="h-full rounded-full bg-ov-500" style={{ width: `${g.fortschritt.quote}%` }} />
                      </div>
                      <span className="ov-num text-[12.5px] font-semibold text-ink-600">{g.fortschritt.erledigt}/{g.fortschritt.gesamt}</span>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}
        </Karte>

        <Karte titel="Fristen" untertitel="Fällig in den nächsten 60 Tagen">
          {d.fristen.length === 0 ? (
            <p className="text-[14px] text-ink-500">Keine anstehenden Fristen.</p>
          ) : (
            <ul className="space-y-3">
              {d.fristen.map((f, i) => (
                <li key={`${f.gesellschaftId}-${f.art}-${i}`} className="text-[13.5px]">
                  <p className="flex flex-wrap items-center gap-2 font-semibold text-ink-900">
                    {datum(f.faellig)} {f.ueberfaellig && <Badge ton="warn">überfällig</Badge>}
                  </p>
                  <p className="text-ink-700">{f.label}</p>
                  <Link href={`/portal/admin/gesellschaften/${f.gesellschaftId}`} className="text-[12.5px] font-semibold text-ov-700 hover:underline">{f.gesellschaft}</Link>
                </li>
              ))}
            </ul>
          )}
        </Karte>
      </div>
    </>
  );
}
