import Link from "next/link";
import { AlertTriangle, BadgeEuro, FileSpreadsheet, Gauge, HandCoins, KanbanSquare, Receipt } from "lucide-react";
import Button from "@/components/ui/Button";
import { Badge, Karte, Kennzahl, SeitenKopf } from "@/components/Portal/ui";
import Prognose from "@/components/Portal/Transaktion/Prognose";
import { portalNutzer, laden } from "@/lib/plattform/server/seite";
import { werkzeugeBackend } from "@/lib/plattform/backend/werkzeuge";
import { eur, mwp } from "@/lib/plattform/format";
import { cn } from "@/components/ui/cn";

export const metadata = { title: "Deal-Pipeline – Verkauf über alle Projekte" };

const LAENDER = [["", "Alle Länder"], ["AT", "Österreich"], ["DE", "Deutschland"], ["CH", "Schweiz"]];

export default async function PipelineSeite({ searchParams }) {
  const n = await portalNutzer({ admin: true });
  const sp = (await searchParams) || {};
  const land = ["AT", "DE", "CH"].includes(sp.land) ? sp.land : "";
  const d = await laden(() => werkzeugeBackend().dealPipeline(n, { land }));
  const s = d.summen;
  return (
    <>
      <SeitenKopf
        eyebrow="Backoffice · Transaktion"
        titel="Deal-Pipeline"
        text="Alle Projekte der Börse nach Verkaufsphase – mit Abschlusswahrscheinlichkeit, erwartetem Kaufpreis und gewichteter Provision. Phase und Preis ergeben sich aus Interessen, LOIs, Bieterverfahren und Closing-Raum."
        aktionen={<><Button href={`/api/admin/projekte/pipeline?format=csv${land ? `&land=${land}` : ""}`} size="sm" variant="secondary" icon={FileSpreadsheet}>Deal-Bericht (CSV)</Button><Button href="/portal/admin/deals" size="sm" variant="secondary" icon={HandCoins}>Provisionen</Button></>}
      />
      <section aria-label="Kennzahlen" className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
        <Kennzahl ton="dunkel" icon={KanbanSquare} label="Offene Deals" wert={String(s.deals)} hinweis={`${s.stockend} ohne Aktivität > 21 Tage`} />
        <Kennzahl icon={BadgeEuro} label="Volumen (erwartet)" wert={eur(s.volumen)} hinweis={s.ohnePreis ? `${s.ohnePreis} ohne Preis` : undefined} />
        <Kennzahl icon={Receipt} label="Provision möglich" wert={eur(s.provisionMoeglich)} />
        <Kennzahl icon={Gauge} label="Provision gewichtet" wert={eur(s.provisionGewichtet)} />
        <Kennzahl icon={HandCoins} label="Verkauft (Provision)" wert={eur(s.provisionVerkauft)} hinweis={`${s.verkauft} Deals`} />
      </section>

      <nav aria-label="Land" className="mb-4 flex flex-wrap gap-1.5">
        {LAENDER.map(([k, l]) => <Link key={k} href={`/portal/admin/deals/pipeline${k ? `?land=${k}` : ""}`} aria-current={land === k ? "page" : undefined} className={cn("inline-flex h-8 items-center rounded-full px-3 text-[13px] font-semibold ring-1 ring-inset", land === k ? "bg-navy-900 text-white ring-navy-900" : "bg-white text-ink-700 ring-ink-200")}>{l}</Link>)}
      </nav>

      <div className="-mx-4 overflow-x-auto px-4 pb-2 md:mx-0 md:px-0" role="region" aria-label="Kanban nach Phase" tabIndex={0}>
        <div className="grid min-w-max auto-cols-[270px] grid-flow-col gap-3">
          {d.spalten.map((sp_) => (
            <section key={sp_.id} aria-label={sp_.label} className="flex min-w-0 flex-col rounded-3xl bg-ink-50 p-3 ring-1 ring-ink-200/70">
              <header className="mb-2 px-1">
                <h2 className="flex items-center justify-between font-display text-[15px] font-bold text-ink-900">{sp_.label}<span className="ov-num rounded-full bg-white px-2 text-[12px] font-bold text-ink-700 ring-1 ring-ink-200">{sp_.anzahl}</span></h2>
                <p className="text-[12px] text-ink-500">{Math.round(sp_.wahrscheinlichkeit * 100)} % Standard · {eur(sp_.provisionGewichtet)} gewichtet</p>
              </header>
              <ul className="space-y-2">
                {sp_.karten.map((k) => (
                  <li key={k.projektId} className="rounded-2xl bg-white p-3 ring-1 ring-ink-200/70">
                    <Link href={`/portal/projekte/${k.projektId}`} className="block text-[13.5px] font-semibold leading-snug text-ink-900 hover:text-ov-700">{k.titel}</Link>
                    <p className="mt-0.5 text-[12px] text-ink-500">{k.land} · {k.mwp ? mwp(k.mwp) : "–"} · {k.interessenten} Interessenten{k.lois ? ` · ${k.lois} LOI` : ""}</p>
                    <p className="mt-1.5 text-[12.5px] text-ink-700"><span className="ov-num font-semibold">{k.preis ? eur(k.preis) : "kein Preis"}</span> <span className="text-ink-500">({k.preisQuelle})</span></p>
                    <p className="text-[12.5px] text-ink-700">Provision {k.provision ? eur(k.provision) : "–"}{k.provisionSatzAnnahme ? " (Satz angenommen 1,5 %)" : ` (${String(Math.round(k.provisionSatz * 1000) / 10).replace(".", ",")} %)`}</p>
                    <div className="mt-1.5 flex flex-wrap gap-1">
                      <Badge ton={k.manuell ? "info" : "neutral"}>{Math.round(k.wahrscheinlichkeit * 100)} %{k.manuell ? " manuell" : ""}</Badge>
                      {k.phase !== "verkauft" && <Badge>Closing {k.closingErwartet.split("-").reverse().join("/")}</Badge>}
                      {k.stockt && <Badge ton="warn"><AlertTriangle aria-hidden="true" className="h-3 w-3" />{k.tageRuhig} Tg. ruhig</Badge>}
                    </div>
                    {k.notiz && <p className="mt-1 text-[12px] text-ink-500">{k.notiz}</p>}
                    <p className="mt-1.5 flex flex-wrap gap-2 text-[12px]">
                      <Link href={`/portal/dealroom/${k.projektId}`} className="font-semibold text-ov-700 hover:text-ov-800">Deal-Room</Link>
                      {k.closing && <Link href={`/portal/admin/closing/${k.closing.id}`} className="font-semibold text-ov-700 hover:text-ov-800">Closing</Link>}
                    </p>
                    {d.darfSchreiben && k.phase !== "verkauft" && <Prognose karte={k} />}
                  </li>
                ))}
                {!sp_.karten.length && <li className="px-1 py-4 text-center text-[12.5px] text-ink-500">keine</li>}
              </ul>
            </section>
          ))}
        </div>
      </div>

      <Karte className="mt-6" titel="Prognose nach Quartal" untertitel="Erwartetes Closing (Standard je Phase oder manuell) – gewichtete Provision" innen="p-0">
        {d.prognose.length ? (
          <ul className="divide-y divide-ink-100">
            {d.prognose.map((q) => <li key={q.quartal} className="flex flex-wrap items-center justify-between gap-2 px-5 py-3 text-[13.5px] md:px-6"><span className="font-semibold text-ink-900">{q.quartal.replace("-", " ")}</span><span className="text-ink-600">{q.anzahl} Deals · möglich {eur(q.provision)} · gewichtet <strong className="ov-num text-ink-900">{eur(q.provisionGewichtet)}</strong></span></li>)}
          </ul>
        ) : <p className="px-6 py-6 text-[14px] text-ink-500">Keine offenen Deals.</p>}
        <p className="border-t border-ink-100 px-5 py-3 text-[12.5px] text-ink-500 md:px-6">Wahrscheinlichkeiten sind interne Schätzwerte je Phase (Prüfung 5 %, Vermarktung 10 %, Datenraum 20 %, Angebote 35 %, Exklusivität 60 %, Closing 80 % bzw. 90 % nach Signing) und keine Zusage. Provision nur bei erfolgreichem Abschluss.</p>
      </Karte>
    </>
  );
}
