import Link from "next/link";
import { CalendarClock, Plus, TriangleAlert } from "lucide-react";
import Button from "@/components/ui/Button";
import { Karte, SeitenKopf } from "@/components/Portal/ui";
import Portfolio from "@/components/Portal/Entwicklung/Portfolio";
import JahresChart, { Balken } from "@/components/Portal/Entwicklung/JahresChart";
import { Wert, datumKurz, eurKurz, mwpText } from "@/components/Portal/Entwicklung/teile";
import { portalNutzer, laden } from "@/lib/plattform/server/seite";
import { entwicklungBackend } from "@/lib/plattform/backend/entwicklung";
import { heuteIso } from "@/lib/plattform/entwicklung";
import { fmt } from "@/lib/rechner/annahmen";

export const metadata = { title: "Projektentwicklung" };

export default async function EntwicklungPortfolioSeite({ searchParams }) {
  const n = await portalNutzer({ admin: true });
  const sp = await searchParams;
  const pf = await laden(() => entwicklungBackend().entwicklungPortfolio(n));
  const s = pf.summen;
  const jahr = Number(heuteIso().slice(0, 4));
  const dieses = s.jeJahr.find((j) => j.jahr === jahr + 1);

  return (
    <>
      <SeitenKopf
        eyebrow="Backoffice · Projektentwicklung"
        titel="Entwicklungs-Pipeline"
        text="Alle eigenen Entwicklungsprojekte von der Flächensicherung bis zur Baureife: Phase, Pipeline-Wert, Terminverzug, Fristen und Auslastung. Ziel: rund 50 MWp Neuentwicklung pro Jahr."
        aktionen={pf.darfBearbeiten && <Button href="/portal/admin/entwicklung/neu" size="sm" icon={Plus}>Neues Projekt</Button>}
      />

      <section aria-label="Kennzahlen" className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        <Wert ton="dunkel" label="Projekte in Entwicklung" wert={String(s.anzahl)} hinweis={mwpText(s.mwp)} />
        <Wert label="MWp gewichtet" wert={fmt(s.mwpGewichtet, 1)} hinweis="Wahrscheinlichkeit je Phase" />
        <Wert label="Pipeline-Wert" wert={eurKurz(s.wert)} hinweis={`Volumen ungewichtet ${eurKurz(s.volumen)}`} />
        <Wert label={`COD ${jahr + 1}`} wert={dieses ? mwpText(dieses.mwp) : "–"} hinweis={`Ziel ${s.zielMwpJahr} MWp`} />
        <Wert ton={pf.verzug.some((v) => v.kritisch) ? "warn" : undefined} label="Überfällige Meilensteine" wert={String(pf.verzug.length)} hinweis={`${pf.verzug.filter((v) => v.kritisch).length} auf dem kritischen Pfad`} />
        <Wert label="Fristen ≤ 30 Tage" wert={String(pf.fristen.length)} />
      </section>

      <div className="mb-6 grid gap-6 xl:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
        <Karte titel="MWp je Inbetriebnahmejahr" untertitel="Prognose aus dem Terminplan (kritischer Pfad) · gewichtet mit der Wahrscheinlichkeit der Phase">
          <JahresChart jahre={s.jeJahr} ziel={s.zielMwpJahr} />
        </Karte>
        <div className="grid gap-6">
          <Karte titel="Je Phase"><Balken zeilen={s.jePhase.filter((x) => x.anzahl)} wertText={(z) => eurKurz(z.wert)} /></Karte>
          <Karte titel="Je Land"><Balken zeilen={s.jeLand.filter((x) => x.anzahl)} wertText={(z) => eurKurz(z.wert)} /></Karte>
        </div>
      </div>

      <Karte titel="Portfolio" untertitel="Liste, Kanban nach Phase oder Karte (Taste v wechselt)" className="mb-6">
        <Portfolio projekte={pf.projekte} ansicht={sp?.ansicht || "liste"} />
      </Karte>

      <div className="grid gap-6 xl:grid-cols-3">
        <Karte titel="Verzug" untertitel="Überfällige Meilensteine, kritischer Pfad zuerst" innen="p-0">
          <ul className="divide-y divide-ink-100">
            {pf.verzug.slice(0, 12).map((v) => (
              <li key={v.meilensteinId} className="px-5 py-3">
                <Link href={`/portal/admin/entwicklung/${v.projektId}?reiter=plan&ms=${v.meilensteinId}`} className="font-semibold text-ink-900 hover:text-ov-700">{v.titel}</Link>
                <p className="text-[12.5px] text-ink-500">{v.projektTitel} · {v.verantwortlich?.name || "–"}</p>
                <p className="mt-0.5 flex items-center gap-1.5 text-[12.5px] font-semibold text-red-700"><TriangleAlert aria-hidden="true" className="h-3.5 w-3.5" />{v.tage} Tage überfällig{v.kritisch ? " · kritischer Pfad" : ""}</p>
              </li>
            ))}
            {!pf.verzug.length && <li className="px-5 py-5 text-[14px] text-ink-500">Kein Verzug.</li>}
          </ul>
        </Karte>
        <Karte titel="Fristen der nächsten 30 Tage" innen="p-0">
          <ul className="divide-y divide-ink-100">
            {pf.fristen.slice(0, 12).map((v) => (
              <li key={v.meilensteinId} className="px-5 py-3">
                <Link href={`/portal/admin/entwicklung/${v.projektId}?reiter=plan&ms=${v.meilensteinId}`} className="font-semibold text-ink-900 hover:text-ov-700">{v.titel}</Link>
                <p className="text-[12.5px] text-ink-500">{v.projektTitel} · {v.verantwortlich?.name || "–"}</p>
                <p className="mt-0.5 flex items-center gap-1.5 text-[12.5px] text-ink-700"><CalendarClock aria-hidden="true" className="h-3.5 w-3.5" />{datumKurz(v.sollEnde)} · in {v.inTagen} Tagen{v.kritisch ? " · kritisch" : ""}</p>
              </li>
            ))}
            {!pf.fristen.length && <li className="px-5 py-5 text-[14px] text-ink-500">Keine Fristen in den nächsten 30 Tagen.</li>}
          </ul>
        </Karte>
        <Karte titel="Auslastung je Projektleitung" innen="p-0">
          <ul className="divide-y divide-ink-100">
            {pf.auslastung.map((a) => {
              const max = Math.max(1, ...pf.auslastung.map((x) => x.offeneMeilensteine));
              return (
                <li key={a.id} className="px-5 py-3">
                  <div className="flex items-baseline justify-between gap-3">
                    <span className="truncate font-semibold text-ink-900">{a.name}</span>
                    <span className="ov-num shrink-0 text-[12.5px] text-ink-600">{a.projekte} Proj. · {mwpText(a.mwp)}</span>
                  </div>
                  <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-ink-100"><div className="h-full rounded-full bg-navy-600" style={{ width: `${(a.offeneMeilensteine / max) * 100}%` }} /></div>
                  <p className="mt-1 text-[12px] text-ink-500">{a.offeneMeilensteine} offene Meilensteine · {a.faellig30} fällig ≤ 30 T.{a.ueberfaellig ? <span className="font-semibold text-red-700"> · {a.ueberfaellig} überfällig</span> : ""}</p>
                </li>
              );
            })}
            {!pf.auslastung.length && <li className="px-5 py-5 text-[14px] text-ink-500">Keine Projektleitungen.</li>}
          </ul>
        </Karte>
      </div>
    </>
  );
}
