// src/components/Portal/Entwicklung/SteuerungReiter.js – Server-Baustein Reiter „Steuerung“ im Entwicklungsprojekt
// (/portal/admin/entwicklung/[id]?reiter=steuerung): Ampel, Flächensicherung (Grundbuch, Optionsfristen), Entscheidungsvorlagen,
// Verwertung (Geschäftsmodell-Vergleich), SPV/Finanzierungsfall, Aufgaben. Daten über steuerungBackend() (Rechte prüft das Backend).

import Link from "next/link";
import { Angaben, Hinweis, Karte } from "@/components/Portal/ui";
import { laden } from "@/lib/plattform/server/seite";
import { steuerungBackend } from "@/lib/plattform/backend/entwicklung-steuerung";
import { AmpelBadge, AmpelListe, VorlageStatusBadge } from "./SteuerungTeile";
import { AufgabenKnopf, SicherungForm, VorlageFormular } from "./Steuerung";
import { PachtBadge, datumKurz, eurKurz } from "./teile";
import { fmt } from "@/lib/rechner/annahmen";

export async function SteuerungReiter({ nutzer, projektId }) {
  const d = await laden(() => steuerungBackend().steuerungProjekt(nutzer, projektId));
  const gm = d.geschaeftsmodell;
  const offen = ["aktiv", "pausiert"].includes(d.projekt.status);
  return (
    <div className="space-y-6">
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)]">
        <Karte titel="Projektampel" aktion={<AmpelBadge farbe={d.ampel.gesamt.farbe} />}>
          <AmpelListe ampel={d.ampel} />
        </Karte>
        <Karte titel="Entscheidungsvorlagen" untertitel="Gates, Verwertung, SPV, Budget, Abbruch – Entscheidung durch die Geschäftsführung" innen="p-0">
          <ul className="divide-y divide-ink-100">
            {d.vorlagen.map((x) => (
              <li key={x.id} className="flex flex-wrap items-start justify-between gap-3 px-5 py-3 md:px-6">
                <div className="min-w-0">
                  <Link href={`/portal/admin/entwicklung/vorlagen/${x.id}`} className="font-semibold text-ink-900 hover:text-ov-700">{x.titel}</Link>
                  <p className="text-[12.5px] text-ink-500">{x.artLabel}{x.budgetEur ? ` · ${eurKurz(x.budgetEur)}` : ""}{x.empfehlungLabel ? ` · ${x.empfehlungLabel}` : ""} · {datumKurz(x.geaendertAm)}</p>
                </div>
                <VorlageStatusBadge status={x.status} />
              </li>
            ))}
            {!d.vorlagen.length && <li className="px-5 py-5 text-[14px] text-ink-500 md:px-6">Noch keine Vorlagen. Typischer Ablauf: Gate 1 nach Flächensicherung, Gate 2 nach Netzzusage, Gate 3 zur Baureife mit Verwertungsentscheidung.</li>}
          </ul>
          {d.darfBearbeiten && offen && (
            <details className="border-t border-ink-100 px-5 py-4 md:px-6">
              <summary className="cursor-pointer text-[14px] font-semibold text-ov-700">Neue Entscheidungsvorlage</summary>
              <div className="mt-4"><VorlageFormular projektId={d.projekt.id} /></div>
            </details>
          )}
        </Karte>
      </div>

      <Karte titel="Flächensicherung und Grundbuch" untertitel={`${fmt(d.sicherung.vertragHa, 1)} von ${fmt(d.sicherung.ha, 1)} ha vertraglich gesichert · ${fmt(d.sicherung.grundbuchHa, 1)} ha im Grundbuch gesichert`} innen="p-0">
        <Hinweis ton="info" className="mx-5 mt-4 md:mx-6">{d.grundbuchHinweis} Grundbuch-Akte und Muster: Bereich „Grundbuch & Closing“.</Hinweis>
        <ul className="divide-y divide-ink-100">
          {d.flaechen.map((f) => (
            <li key={f.id} className="px-5 py-4 md:px-6">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-semibold text-ink-900">{f.bezeichnung}</p>
                  <p className="text-[12.5px] text-ink-500">{fmt(f.ha || 0, 1)} ha · Grundbuch: {f.grundbuchLabel}{f.grundbuchDatum ? ` (${datumKurz(f.grundbuchDatum)})` : ""}{f.optionBis ? ` · Option bis ${datumKurz(f.optionBis)}${f.optionInTagen !== null && f.optionInTagen <= 60 ? ` (${f.optionInTagen < 0 ? "abgelaufen" : `in ${f.optionInTagen} Tagen`})` : ""}` : ""}</p>
                </div>
                <PachtBadge status={f.pachtStatus} />
              </div>
              {d.darfBearbeiten && (
                <details className="mt-2">
                  <summary className="cursor-pointer text-[13px] font-semibold text-ink-700">Sicherung bearbeiten</summary>
                  <div className="mt-3"><SicherungForm projektId={d.projekt.id} flaeche={f} /></div>
                </details>
              )}
            </li>
          ))}
          {!d.flaechen.length && <li className="px-5 py-5 text-[14px] text-ink-500 md:px-6">Keine Projektflächen – im Reiter „Flächen“ verknüpfen.</li>}
        </ul>
      </Karte>

      <div className="grid gap-6 xl:grid-cols-2">
        <Karte titel="Verwertung" untertitel={d.projekt.verwertungLabel ? `Beschlossen: ${d.projekt.verwertungLabel}` : "Noch nicht beschlossen – über eine Vorlage „Gate 3“ oder „Verwertungsentscheidung“"}>
          {gm ? (
            <>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[420px] text-[13.5px]">
                  <thead className="text-[12px] font-semibold uppercase tracking-wide text-ink-500">
                    <tr><th scope="col" className="py-2 text-left">Modell</th><th scope="col" className="py-2 text-right">Barwert</th><th scope="col" className="py-2 text-right">EK-Bindung</th><th scope="col" className="py-2 text-right">EK-Rendite</th></tr>
                  </thead>
                  <tbody className="divide-y divide-ink-100">
                    {gm.zeilen.map((z) => (
                      <tr key={z.id} className={z.id === gm.beste ? "font-semibold text-ink-900" : "text-ink-700"}>
                        <td className="py-2 pr-3">{z.label}</td>
                        <td className="ov-num py-2 text-right">{eurKurz(z.barwert)}</td>
                        <td className="ov-num py-2 text-right">{z.kapitalbindung ? eurKurz(z.kapitalbindung) : "–"}</td>
                        <td className="ov-num py-2 text-right">{z.irr !== null && z.irr !== undefined ? `${fmt(z.irr * 100, 1)} %` : "–"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="mt-3 text-[12.5px] text-ink-500">{gm.empfehlung} Quelle: {gm.quelle}. „Bau für einen Investor“ entspricht wirtschaftlich dem Verkauf zuzüglich EPC-Marge der Gruppe. Orientierung, keine Anlageberatung.</p>
            </>
          ) : <p className="text-[14px] text-ink-500">Vergleich nicht verfügbar.</p>}
        </Karte>
        <Karte titel="Projektgesellschaft und Finanzierung">
          <Angaben items={[
            { label: "Projektgesellschaft (SPV)", wert: d.gesellschaft ? `${d.gesellschaft.firma || d.gesellschaft.id} (${d.gesellschaft.status})` : "noch nicht angelegt" },
            { label: "Finanzierungsfall", wert: d.finanzierungsfall ? `${d.finanzierungsfall.titel} (${d.finanzierungsfall.status})` : "noch nicht angelegt" },
          ]} />
          <div className="mt-4 flex flex-wrap gap-3 text-[13.5px] font-semibold">
            <Link href="/portal/admin/gesellschaften" className="text-ov-700 hover:text-ov-800">Gründungsassistent SPV</Link>
            <Link href="/portal/admin/finanzierung" className="text-ov-700 hover:text-ov-800">Bankfinanzierung & Geschäftsmodell</Link>
          </div>
        </Karte>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <Karte titel="Aufgaben aus Meilensteinen und Vorlagen" aktion={d.darfBearbeiten && offen ? <AufgabenKnopf projektId={d.projekt.id} /> : null} innen="p-0">
          <ul className="divide-y divide-ink-100">
            {d.aufgaben.map((a) => (
              <li key={a.id} className="flex flex-wrap items-start justify-between gap-2 px-5 py-3 md:px-6">
                <div className="min-w-0">
                  <p className={a.status === "erledigt" ? "text-ink-500 line-through" : "font-semibold text-ink-900"}>{a.titel}</p>
                  <p className="text-[12.5px] text-ink-500">fällig {datumKurz(a.faelligAm)} · {a.zustaendig?.name || "–"}</p>
                </div>
              </li>
            ))}
            {!d.aufgaben.length && <li className="px-5 py-5 text-[14px] text-ink-500 md:px-6">Keine Aufgaben. Aufgaben entstehen für Meilensteine, die in 14 Tagen fällig oder überfällig sind, für Optionsfristen und nach genehmigten Vorlagen.</li>}
          </ul>
          <p className="border-t border-ink-100 px-5 py-3 text-[12.5px] md:px-6"><Link href="/portal/admin/aufgaben" className="font-semibold text-ov-700 hover:text-ov-800">Alle Aufgaben</Link></p>
        </Karte>
        <Karte titel="Dokumentenpflichten" untertitel="Fällige Meilensteine (30 Tage) ohne Pflichtdokument" innen="p-0">
          <ul className="divide-y divide-ink-100">
            {d.dokumentLuecken.map((m) => (
              <li key={m.id} className="px-5 py-3 md:px-6">
                <Link href={`/portal/admin/entwicklung/${d.projekt.id}?reiter=plan&ms=${m.id}`} className="font-semibold text-ink-900 hover:text-ov-700">{m.titel}</Link>
                <p className="text-[12.5px] text-ink-500">Soll-Ende {datumKurz(m.sollEnde)}</p>
              </li>
            ))}
            {!d.dokumentLuecken.length && <li className="px-5 py-5 text-[14px] text-ink-500 md:px-6">Alle fälligen Pflichtdokumente liegen vor.</li>}
          </ul>
        </Karte>
      </div>
    </div>
  );
}
