// Projektsteckbrief (Druckansicht im Browser, intern). Im Frappe-Desk gibt es das gleichnamige Druckformat (Jinja).
import { Angaben, Karte } from "@/components/Portal/ui";
import DruckKnopf from "@/components/Portal/Entwicklung/DruckKnopf";
import { datumKurz, eurKurz, monatText, mwpText } from "@/components/Portal/Entwicklung/teile";
import { portalNutzer, laden } from "@/lib/plattform/server/seite";
import { entwicklungBackend } from "@/lib/plattform/backend/entwicklung";
import { LAENDER } from "@/lib/plattform/konstanten";

export const metadata = { title: "Projektsteckbrief" };

export default async function Steckbrief({ params }) {
  const n = await portalNutzer({ admin: true });
  const { id } = await params;
  const p = await laden(() => entwicklungBackend().entwicklungProjekt(n, id));
  const offen = p.risiken.filter((r) => r.status !== "geschlossen").slice(0, 6);
  return (
    <article className="mx-auto max-w-4xl space-y-5 print:max-w-none">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-[12px] font-semibold uppercase tracking-[0.16em] text-ov-700">Projektsteckbrief · intern · {datumKurz(new Date().toISOString())}</p>
          <h1 className="mt-1 font-display text-[28px] font-extrabold text-ink-900">{p.titel}</h1>
          <p className="text-[14px] text-ink-600">{[p.typLabel, p.gemeinde, p.bundesland, LAENDER[p.land]].filter(Boolean).join(" · ")}</p>
        </div>
        <DruckKnopf />
      </header>
      <Karte titel="Eckdaten">
        <Angaben spalten={3} items={[
          { label: "Leistung", wert: `${mwpText(p.mwp)}${p.mwh ? ` · ${p.mwh} MWh` : ""}` },
          { label: "Phase", wert: p.phaseLabel },
          { label: "Fortschritt", wert: `${p.fortschritt} %` },
          { label: "Pipeline-Wert", wert: `${eurKurz(p.pipeline.wert)} (${Math.round(p.pipeline.wahrscheinlichkeit * 100)} %)` },
          { label: "COD Ziel / Prognose", wert: `${monatText(p.zielCod)} / ${monatText((p.prognoseCod || "").slice(0, 7))}` },
          { label: "Vermarktung", wert: p.vermarktungLabel },
          { label: "Fläche", wert: `${p.flaecheGesichertHa} von ${p.flaecheHa} ha gesichert` },
          { label: "Netzverknüpfungspunkt", wert: p.nvp || "–" },
          { label: "Projektleitung", wert: p.projektleiter?.name || "–" },
          { label: "Budget Ist / Plan", wert: `${eurKurz(p.budgetIst)} / ${eurKurz(p.budgetPlan)}` },
        ]} />
      </Karte>
      <Karte titel="Meilensteine" innen="p-0">
        <table className="w-full text-left text-[13px]">
          <thead className="border-b border-ink-100 text-[11.5px] uppercase text-ink-500"><tr><th className="px-5 py-2">Meilenstein</th><th className="px-3 py-2">Soll-Ende</th><th className="px-3 py-2">Ist</th><th className="px-5 py-2">Status</th></tr></thead>
          <tbody className="divide-y divide-ink-100">
            {p.meilensteine.filter((m) => m.status !== "entfaellt").map((m) => (
              <tr key={m.id} className={m.ueberfaellig ? "text-red-800" : ""}>
                <td className="px-5 py-1.5">{m.kritisch ? <strong>{m.titel}</strong> : m.titel}</td>
                <td className="px-3 py-1.5">{datumKurz(m.sollEnde)}</td>
                <td className="px-3 py-1.5">{m.istEnde ? datumKurz(m.istEnde) : "–"}</td>
                <td className="px-5 py-1.5">{m.ueberfaellig ? `überfällig (${m.verzugTage} T.)` : m.statusLabel}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Karte>
      <Karte titel="Wesentliche Risiken" innen="p-0">
        <ul className="divide-y divide-ink-100 text-[13.5px]">
          {offen.map((r) => <li key={r.id} className="px-5 py-2"><strong>{r.score}</strong> · {r.titel}{r.massnahme ? ` – ${r.massnahme}` : ""}</li>)}
          {!offen.length && <li className="px-5 py-3 text-ink-500">Keine offenen Risiken.</li>}
        </ul>
      </Karte>
    </article>
  );
}
