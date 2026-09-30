import Link from "next/link";
import { ArrowLeft, FileDown, FileSpreadsheet } from "lucide-react";
import { Karte, Leer, SeitenKopf } from "@/components/Portal/ui";
import { Wert, datumKurz, eurKurz, monatText, mwpText } from "@/components/Portal/Entwicklung/teile";
import { AmpelBadge, AmpelPunkt, AuslastungZelle, VorlageStatusBadge } from "@/components/Portal/Entwicklung/SteuerungTeile";
import { AufgabenKnopf, KapazitaetForm } from "@/components/Portal/Entwicklung/Steuerung";
import { portalNutzer, laden } from "@/lib/plattform/server/seite";
import { steuerungBackend } from "@/lib/plattform/backend/entwicklung-steuerung";
import { AMPEL_DIMENSIONEN } from "@/lib/plattform/entwicklung-steuerung";
import { fmt } from "@/lib/rechner/annahmen";

export const metadata = { title: "Steuerung Projektentwicklung" };

const knopfKlasse = "inline-flex h-10 items-center gap-2 rounded-full bg-white px-4 text-[14px] font-semibold text-ink-900 ring-1 ring-inset ring-ink-200 hover:bg-ink-50";
const RANG = { rot: 0, gelb: 1, gruen: 2, grau: 3 };

export default async function SteuerungSeite() {
  const n = await portalNutzer({ admin: true });
  const d = await laden(() => steuerungBackend().steuerungUebersicht(n));
  const offen = d.projekte.filter((p) => ["aktiv", "pausiert"].includes(p.status)).sort((a, b) => RANG[a.ampel.gesamt.farbe] - RANG[b.ampel.gesamt.farbe] || b.mwp - a.mwp);
  const zurEntscheidung = d.vorlagen.filter((x) => x.status === "eingereicht");
  const L = d.matrix.laender;
  const maxJahr = Math.max(d.zielMwpJahr, ...d.ziel.map((j) => j.mwp));

  return (
    <>
      <Link href="/portal/admin/entwicklung" className="mb-3 inline-flex items-center gap-1.5 text-[13.5px] font-semibold text-ink-600 hover:text-ov-700"><ArrowLeft aria-hidden="true" className="h-4 w-4" />Entwicklungs-Pipeline</Link>
      <SeitenKopf
        eyebrow="Backoffice · Projektentwicklung"
        titel="Steuerung & Entscheidungen"
        text="Projektampel über alle Projekte, Pipeline-Bericht nach Phase und Land mit Ziel-Abgleich, Kapazität der Projektleitungen, Risiken und Fristen – und die Entscheidungsvorlagen für die Geschäftsführung."
        aktionen={
          <div className="flex flex-wrap gap-2">
            <a href="/api/admin/entwicklung/steuerung/export?format=pdf&anzeigen=1" target="_blank" rel="noopener" className={knopfKlasse}><FileDown aria-hidden="true" className="h-4 w-4" />Pipeline-Bericht (PDF)</a>
            <a href={`/api/admin/entwicklung/steuerung/export?format=csv`} download className={knopfKlasse}><FileSpreadsheet aria-hidden="true" className="h-4 w-4" />CSV</a>
          </div>
        }
      />

      <section aria-label="Kennzahlen" className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        <Wert ton="dunkel" label="Projekte in Entwicklung" wert={String(d.summen.anzahl)} hinweis={`${mwpText(d.summen.mwp)} · gewichtet ${fmt(d.summen.mwpGewichtet, 1)}`} />
        <Wert ton={d.verteilung.rot ? "warn" : undefined} label="Ampel rot" wert={String(d.verteilung.rot)} hinweis={`${d.verteilung.gelb} gelb · ${d.verteilung.gruen} grün`} />
        <Wert label="Zur Entscheidung" wert={String(zurEntscheidung.length)} hinweis={`${d.vorlagen.length} offene Vorlagen`} />
        <Wert label="Risikokosten erwartet" wert={eurKurz(d.risikoSumme.erwartet)} hinweis={`${d.risikoSumme.hoch} hohe Risiken`} />
        <Wert ton={d.optionsfristen.length ? "warn" : undefined} label="Optionsfristen ≤ 60 T." wert={String(d.optionsfristen.length)} />
        <Wert label="Dokumentenlücken" wert={String(d.dokumentLuecken.length)} hinweis="fällig ≤ 30 T. ohne Pflichtdokument" />
      </section>

      <Karte titel="Zur Entscheidung durch die Geschäftsführung" untertitel="Eingereichte Vorlagen zuerst · Entscheidung nur durch die Leitung, nach dem Vier-Augen-Prinzip" innen="p-0" className="mb-6">
        <ul className="divide-y divide-ink-100">
          {d.vorlagen.map((x) => (
            <li key={x.id} className="flex flex-wrap items-start justify-between gap-3 px-5 py-3 md:px-6">
              <div className="min-w-0">
                <Link href={`/portal/admin/entwicklung/vorlagen/${x.id}`} className="font-semibold text-ink-900 hover:text-ov-700">{x.titel}</Link>
                <p className="text-[12.5px] text-ink-500">{x.artLabel} · {x.projektTitel}{x.budgetEur ? ` · ${eurKurz(x.budgetEur)}` : ""}{x.empfehlungLabel ? ` · Empfehlung: ${x.empfehlungLabel}` : ""}{x.entscheidungBis ? ` · bis ${datumKurz(x.entscheidungBis)}` : ""}</p>
              </div>
              <VorlageStatusBadge status={x.status} />
            </li>
          ))}
          {!d.vorlagen.length && <li className="px-5 py-5 text-[14px] text-ink-500 md:px-6">Keine offenen Vorlagen. Neue Vorlagen legt die Projektleitung im Projekt unter „Steuerung“ an.</li>}
        </ul>
      </Karte>

      <Karte titel="Projektampel" untertitel={Object.values(AMPEL_DIMENSIONEN).join(" · ")} innen="p-0" className="mb-6">
        {offen.length ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-left text-[13.5px]">
              <thead className="bg-ink-50 text-[12px] font-semibold uppercase tracking-wide text-ink-500">
                <tr>
                  <th scope="col" className="px-5 py-2.5 md:px-6">Projekt</th>
                  <th scope="col" className="px-3 py-2.5">Phase</th>
                  <th scope="col" className="px-3 py-2.5 text-right">MWp</th>
                  {Object.entries(AMPEL_DIMENSIONEN).map(([id, l]) => <th key={id} scope="col" className="px-2 py-2.5 text-center">{l.split(" ")[0]}</th>)}
                  <th scope="col" className="px-5 py-2.5 md:px-6">Gesamt</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ink-100">
                {offen.map((p) => (
                  <tr key={p.id} className="align-top">
                    <td className="px-5 py-3 md:px-6">
                      <Link href={`/portal/admin/entwicklung/${p.id}?reiter=steuerung`} className="font-semibold text-ink-900 hover:text-ov-700">{p.titel}</Link>
                      <p className="text-[12px] text-ink-500">{p.land} · {p.projektleiter?.name || "ohne Projektleitung"}</p>
                    </td>
                    <td className="px-3 py-3 text-ink-700">{p.phaseLabel}</td>
                    <td className="ov-num px-3 py-3 text-right">{fmt(p.mwp || 0, 1)}</td>
                    {Object.entries(AMPEL_DIMENSIONEN).map(([id, l]) => <td key={id} className="px-2 py-3 text-center"><AmpelPunkt farbe={p.ampel[id]?.farbe} titel={`${l}: ${p.ampel[id]?.grund || ""}`} /></td>)}
                    <td className="px-5 py-3 md:px-6"><AmpelBadge farbe={p.ampel.gesamt.farbe} /><p className="mt-1 max-w-xs text-[12px] text-ink-500">{p.ampel.gesamt.grund}</p></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : <Leer titel="Keine Projekte in Entwicklung" text="Neue Projekte entstehen aus gesicherten Flächen." />}
      </Karte>

      <div className="mb-6 grid gap-6 xl:grid-cols-2">
        <Karte titel="Pipeline MWp je Phase und Land" untertitel="Offene Projekte · gewichtet mit der Wahrscheinlichkeit der Phase" innen="p-0">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[480px] text-[13.5px]">
              <thead className="bg-ink-50 text-[12px] font-semibold uppercase tracking-wide text-ink-500">
                <tr>
                  <th scope="col" className="px-5 py-2.5 text-left">Phase</th>
                  {L.map((l) => <th key={l} scope="col" className="px-3 py-2.5 text-right">{l}</th>)}
                  <th scope="col" className="px-3 py-2.5 text-right">Summe</th>
                  <th scope="col" className="px-5 py-2.5 text-right">gewichtet</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ink-100">
                {d.matrix.zeilen.map((z) => (
                  <tr key={z.label}>
                    <th scope="row" className="px-5 py-2.5 text-left font-semibold text-ink-800">{z.label}</th>
                    {L.map((l) => <td key={l} className="ov-num px-3 py-2.5 text-right text-ink-700">{z.zellen[l].anzahl ? fmt(z.zellen[l].mwp, 1) : "–"}</td>)}
                    <td className="ov-num px-3 py-2.5 text-right font-semibold">{z.summe.anzahl ? fmt(z.summe.mwp, 1) : "–"}</td>
                    <td className="ov-num px-5 py-2.5 text-right text-ink-700">{z.summe.anzahl ? fmt(z.summe.mwpGewichtet, 1) : "–"}</td>
                  </tr>
                ))}
                <tr className="bg-ink-50 font-semibold">
                  <th scope="row" className="px-5 py-2.5 text-left">Summe</th>
                  {L.map((l) => <td key={l} className="ov-num px-3 py-2.5 text-right">{fmt(d.matrix.spalten[l].mwp, 1)}</td>)}
                  <td className="ov-num px-3 py-2.5 text-right">{fmt(d.matrix.gesamt.mwp, 1)}</td>
                  <td className="ov-num px-5 py-2.5 text-right">{fmt(d.matrix.gesamt.mwpGewichtet, 1)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </Karte>
        <Karte titel={`Ziel-Abgleich: rund ${d.zielMwpJahr} MWp je Jahr`} untertitel="Inbetriebnahme laut Terminplan · Balken = MWp, Markierung = gewichtet">
          <ul className="space-y-3">
            {d.ziel.map((j) => (
              <li key={j.jahr}>
                <div className="flex items-baseline justify-between gap-3 text-[13.5px]">
                  <span className="font-semibold text-ink-900">{j.jahr}</span>
                  <span className="ov-num text-ink-600">{fmt(j.mwp, 1)} MWp · gewichtet {fmt(j.mwpGewichtet, 1)} · <span className={j.farbe === "rot" ? "font-semibold text-red-700" : j.farbe === "gelb" ? "font-semibold text-ink-900" : "font-semibold text-ov-800"}>{Math.round(j.deckung * 100)} %</span></span>
                </div>
                <div className="relative mt-1 h-2.5 overflow-hidden rounded-full bg-ink-100">
                  <div className="h-full rounded-full bg-navy-200" style={{ width: `${Math.min(100, (j.mwp / maxJahr) * 100)}%` }} />
                  <div className="absolute inset-y-0 left-0 rounded-full bg-ov-600" style={{ width: `${Math.min(100, (j.mwpGewichtet / maxJahr) * 100)}%` }} />
                  <div aria-hidden="true" className="absolute inset-y-0 w-0.5 bg-ink-900" style={{ left: `${Math.min(100, (d.zielMwpJahr / maxJahr) * 100)}%` }} />
                </div>
                {j.luecke > 0 && <p className="mt-0.5 text-[12px] text-ink-500">Lücke {fmt(j.luecke, 1)} MWp (gewichtet)</p>}
              </li>
            ))}
          </ul>
          <p className="mt-4 text-[12.5px] text-ink-500">Lücken im Folgejahr lassen sich in der Regel nur über Zukäufe baureifer Projekte schließen; Neuakquise wirkt wegen der Verfahrensdauer meist erst nach zwei bis drei Jahren.</p>
        </Karte>
      </div>

      <Karte
        titel="Kapazität der Projektleitungen"
        untertitel={`Stunden je Monat · ${d.kapazitaet.planwerte.grundlastProjekt} h je Projekt, ${d.kapazitaet.planwerte.jeMeilenstein} h je laufendem internen, ${d.kapazitaet.planwerte.jeGutachten} h je externem Meilenstein · Standard ${d.kapazitaet.planwerte.stundenMonat} h`}
        aktion={d.darfBearbeiten ? <AufgabenKnopf /> : null}
        innen="p-0"
        className="mb-6"
      >
        {d.kapazitaet.zeilen.length ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-[13.5px]">
              <thead className="bg-ink-50 text-[12px] font-semibold uppercase tracking-wide text-ink-500">
                <tr>
                  <th scope="col" className="px-5 py-2.5 text-left md:px-6">Projektleitung</th>
                  <th scope="col" className="px-3 py-2.5 text-right">Proj.</th>
                  {d.kapazitaet.monate.map((m) => <th key={m} scope="col" className="px-2 py-2.5 text-right">{monatText(m)}</th>)}
                  <th scope="col" className="px-5 py-2.5 text-left md:px-6">Kapazität</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ink-100">
                {d.kapazitaet.zeilen.map((z) => (
                  <tr key={z.id}>
                    <th scope="row" className="px-5 py-2.5 text-left font-semibold text-ink-900 md:px-6">{z.name}{d.kapazitaet.vorschlag === z.id && <span className="block text-[11.5px] font-medium text-ov-800">Vorschlag für neue Projekte</span>}</th>
                    <td className="ov-num px-3 py-2.5 text-right">{z.projekte}</td>
                    {z.je.map((j) => <td key={j.monat} className="px-2 py-2.5 text-right"><AuslastungZelle wert={j.auslastung} farbe={j.farbe} stunden={j.stunden} /></td>)}
                    <td className="px-5 py-2.5 md:px-6">{d.leitung ? <KapazitaetForm zeile={z} /> : <span className="ov-num text-ink-700">{z.stundenMonat} h</span>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : <Leer titel="Keine Projektleitungen mit Projekten" text="Weisen Sie Projekten eine Projektleitung zu (Stammdaten im Projekt)." />}
      </Karte>

      <div className="grid gap-6 xl:grid-cols-3">
        <Karte titel="Größte Risiken" untertitel={`Alle Projekte · ${d.risikoSumme.pruefungUeberfaellig} Prüfung(en) überfällig`} innen="p-0" className="xl:col-span-2">
          <ul className="divide-y divide-ink-100">
            {d.risiken.slice(0, 12).map((r) => (
              <li key={r.id} className="flex flex-wrap items-start justify-between gap-3 px-5 py-3 md:px-6">
                <div className="min-w-0">
                  <Link href={`/portal/admin/entwicklung/${r.projektId}?reiter=risiken`} className="font-semibold text-ink-900 hover:text-ov-700">{r.titel}</Link>
                  <p className="text-[12.5px] text-ink-500">{r.projektTitel} · {r.kategorieLabel}{r.erwartet ? ` · Risikokosten ${eurKurz(r.erwartet)}` : ""}{r.pruefenAm ? ` · Prüfung ${datumKurz(r.pruefenAm)}` : ""}{r.pruefungUeberfaellig ? " (überfällig)" : ""}</p>
                </div>
                <AmpelBadge farbe={r.score >= 15 ? "rot" : r.score >= 8 ? "gelb" : "gruen"}>{r.score}{r.restScore ? ` → ${r.restScore}` : ""}</AmpelBadge>
              </li>
            ))}
            {!d.risiken.length && <li className="px-5 py-5 text-[14px] text-ink-500 md:px-6">Keine offenen Risiken.</li>}
          </ul>
        </Karte>
        <div className="space-y-6">
          <Karte titel="Optionsfristen" untertitel="Flächen mit Optionsvertrag, Ablauf ≤ 60 Tage" innen="p-0">
            <ul className="divide-y divide-ink-100">
              {d.optionsfristen.map((o) => (
                <li key={o.flaecheId} className="px-5 py-3">
                  <Link href={`/portal/admin/entwicklung/${o.projektId}?reiter=steuerung`} className="font-semibold text-ink-900 hover:text-ov-700">{o.bezeichnung}</Link>
                  <p className="text-[12.5px] text-ink-500">{o.projektTitel} · bis {datumKurz(o.optionBis)} · <span className={o.inTagen < 14 ? "font-semibold text-red-700" : "font-semibold text-ink-800"}>{o.inTagen < 0 ? "abgelaufen" : `in ${o.inTagen} Tagen`}</span></p>
                </li>
              ))}
              {!d.optionsfristen.length && <li className="px-5 py-4 text-[14px] text-ink-500">Keine Optionsfristen in den nächsten 60 Tagen.</li>}
            </ul>
          </Karte>
          <Karte titel="Dokumentenlücken" untertitel="Fällig ≤ 30 Tage, Pflichtdokument fehlt" innen="p-0">
            <ul className="divide-y divide-ink-100">
              {d.dokumentLuecken.slice(0, 8).map((m) => (
                <li key={m.meilensteinId} className="px-5 py-3">
                  <Link href={`/portal/admin/entwicklung/${m.projektId}?reiter=plan&ms=${m.meilensteinId}`} className="font-semibold text-ink-900 hover:text-ov-700">{m.titel}</Link>
                  <p className="text-[12.5px] text-ink-500">{m.projektTitel} · {datumKurz(m.sollEnde)} · fehlt: {m.fehlt.join(", ")}</p>
                </li>
              ))}
              {!d.dokumentLuecken.length && <li className="px-5 py-4 text-[14px] text-ink-500">Keine Lücken.</li>}
            </ul>
          </Karte>
        </div>
      </div>
    </>
  );
}
