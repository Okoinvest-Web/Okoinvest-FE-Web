// /portal/admin/gesellschaften/[id] – Gesellschaft: Kerndaten, Gründungs-Checkliste, Dokumentenpaket (PDF, Muster), Fristen, Verlauf
import Link from "next/link";
import { ArrowLeft, FileDown } from "lucide-react";
import { Angaben, Badge, Hinweis, Karte, SeitenKopf } from "@/components/Portal/ui";
import GruendungCheckliste from "@/components/Portal/Dienste/GruendungCheckliste";
import GesellschaftAktionen from "@/components/Portal/Dienste/GesellschaftAktionen";
import { portalNutzer, laden } from "@/lib/plattform/server/seite";
import { diensteBackend } from "@/lib/plattform/backend/dienste";
import { GESELLSCHAFT_STATUS } from "@/lib/plattform/dienste/gesellschaft/rechtsformen";
import { NAMENSPRUEFUNG_LABEL } from "@/lib/plattform/dienste/register/basis";
import { datum, datumZeit } from "@/lib/plattform/format";

export const metadata = { title: "Gesellschaft" };

const geld = (n, w) => (n || n === 0 ? `${Number(n).toLocaleString("de-DE")} ${w === "CHF" ? "CHF" : "€"}` : "");

export default async function GesellschaftSeite({ params }) {
  const n = await portalNutzer({ admin: true });
  const { id } = await params;
  const { gesellschaft: g, schreiben } = await laden(() => diensteBackend().gesellschaft(n, id));
  const bestand = g.herkunft === "stammdaten";
  return (
    <>
      <Link href="/portal/admin/gesellschaften" className="mb-3 inline-flex items-center gap-1.5 text-[13.5px] font-semibold text-ink-600 hover:text-ov-700"><ArrowLeft aria-hidden="true" className="h-4 w-4" /> Gesellschaften</Link>
      <SeitenKopf
        eyebrow={`Gesellschaft · ${g.rechtsformLabel}`}
        titel={g.name}
        text={[g.registernummer || "noch nicht eingetragen", g.sitz, g.projekt ? `Entwicklungsprojekt ${g.projekt.titel} (${g.projekt.id})` : ""].filter(Boolean).join(" · ")}
        aktionen={
          <div className="flex flex-wrap items-center gap-2">
            {g.demo && <Badge ton="warn">Demo</Badge>}
            <Badge ton={GESELLSCHAFT_STATUS[g.status]?.ton}>{g.statusLabel}</Badge>
            {!bestand && <a href={`/api/admin/gesellschaften/${g.id}/dokumente`} className="inline-flex h-10 items-center gap-1.5 rounded-full bg-ov-600 px-4 text-[14px] font-semibold text-white shadow-[0_8px_24px_-8px_rgba(102,153,51,0.65)] hover:bg-ov-700"><FileDown aria-hidden="true" className="h-4 w-4" />Gründungspaket (PDF)</a>}
          </div>
        }
      />
      {!bestand && <Hinweis ton="neutral" className="mb-5">Alle Dokumente sind MUSTER zur Prüfung und Beurkundung durch das Notariat – keine Rechtsberatung. {g.rechtsformInfo?.beurkundung}.</Hinweis>}
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
        <div className="min-w-0 space-y-6">
          {!bestand && (
            <Karte titel="Gründungs-Checkliste" untertitel={`${g.fortschritt.erledigt} von ${g.fortschritt.gesamt} Pflichtschritten erledigt`}>
              <GruendungCheckliste gesellschaft={JSON.parse(JSON.stringify(g))} schreiben={schreiben} />
            </Karte>
          )}
          <Karte titel="Kerndaten">
            <Angaben items={[
              { label: "Rechtsform", wert: g.rechtsformLabel },
              { label: "Registernummer", wert: g.registernummer || "–" },
              { label: "Sitz", wert: [g.sitz, g.bundesland].filter(Boolean).join(", ") },
              { label: "Geschäftsanschrift", wert: g.anschrift },
              { label: "Stammkapital", wert: geld(g.stammkapital, g.waehrung) },
              { label: "Bei Gründung eingezahlt", wert: geld(g.einzahlung, g.waehrung) },
              { label: "Geschäftsführung", wert: (g.geschaeftsfuehrung || []).map((x) => x.name).join(", ") },
              { label: "Komplementärin", wert: g.komplementaer?.name },
              { label: "UID / USt-IdNr.", wert: g.uid },
              { label: "Steuernummer", wert: g.steuernummer },
              { label: "Gegründet (beurkundet)", wert: g.gegruendetAm ? datum(g.gegruendetAm) : "" },
              { label: "Eingetragen", wert: g.eingetragenAm ? datum(g.eingetragenAm) : "" },
              { label: "Bilanzstichtag", wert: g.bilanzstichtag ? g.bilanzstichtag.split("-").reverse().join(".") : "" },
              { label: "Gegenstand", wert: g.gegenstand, breit: true },
            ]} />
            <h3 className="mt-6 text-[13.5px] font-semibold text-ink-700">Gesellschafter</h3>
            <ul className="mt-2 divide-y divide-ink-100 text-[14px]">
              {(g.gesellschafter || []).map((x, i) => (
                <li key={i} className="flex flex-wrap justify-between gap-2 py-2">
                  <span>{x.gesellschaftId ? <Link href={`/portal/admin/gesellschaften/${x.gesellschaftId}`} className="font-semibold text-ink-900 hover:text-ov-700">{x.name}</Link> : x.name}{x.register ? <span className="text-ink-500"> · {x.register}</span> : null}</span>
                  <span className="ov-num text-ink-700">{x.anteil} %{x.einlage ? ` · ${geld(x.einlage, g.waehrung)}` : ""}</span>
                </li>
              ))}
              {!(g.gesellschafter || []).length && <li className="py-2 text-ink-500">Gesellschafter laut Register (nicht erfasst).</li>}
            </ul>
          </Karte>
        </div>
        <div className="min-w-0 space-y-6">
          {!bestand && (
            <Karte titel="Dokumentenpaket" untertitel="Einzeln oder gesamt als PDF">
              <ul className="space-y-1.5">
                {(g.dokumente || []).map((d) => (
                  <li key={d.id}><a href={`/api/admin/gesellschaften/${g.id}/dokumente?dok=${d.id}`} className="inline-flex items-start gap-2 text-[14px] font-medium text-ink-800 hover:text-ov-700"><FileDown aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-ov-600" />{d.titel}</a></li>
                ))}
              </ul>
            </Karte>
          )}
          {g.namenspruefung && (
            <Karte titel="Namensprüfung">
              <p className="flex flex-wrap items-center gap-2 text-[14px]"><Badge ton={NAMENSPRUEFUNG_LABEL[g.namenspruefung.ergebnis]?.ton}>{NAMENSPRUEFUNG_LABEL[g.namenspruefung.ergebnis]?.label}</Badge><span className="text-ink-500">{datumZeit(g.namenspruefung.am)} · {g.namenspruefung.quelle}</span></p>
              {(g.namenspruefung.aehnlich || []).length > 0 && <ul className="mt-2 text-[13px] text-ink-600">{g.namenspruefung.aehnlich.map((a) => <li key={`${a.nummer}-${a.name}`}>{a.name} · {a.nummer}</li>)}</ul>}
            </Karte>
          )}
          <Karte titel="Fristen">
            {(g.fristen || []).length === 0 ? <p className="text-[14px] text-ink-500">Fristen entstehen mit der Eintragung.</p> : (
              <ul className="space-y-2.5 text-[13.5px]">
                {g.fristen.map((f, i) => (
                  <li key={i}><p className="font-semibold text-ink-900">{datum(f.faellig)} {f.erledigt && <Badge ton="ok">erledigt</Badge>}</p><p className="text-ink-700">{f.label}</p></li>
                ))}
              </ul>
            )}
          </Karte>
          {!bestand && (
            <Karte titel="Buchhaltung & Stammdaten">
              <GesellschaftAktionen id={g.id} erpnext={g.erpnext} bilanzstichtag={g.bilanzstichtag} steuernummer={g.steuernummer} schreiben={schreiben} />
            </Karte>
          )}
          {(g.verlauf || []).length > 0 && (
            <Karte titel="Verlauf">
              <ol className="space-y-2 text-[13px]">
                {g.verlauf.map((x, i) => <li key={i}><span className="font-semibold text-ink-900">{datumZeit(x.am)}</span> · {x.von} · <span className="text-ink-700">{x.text}</span></li>)}
              </ol>
            </Karte>
          )}
        </div>
      </div>
    </>
  );
}
