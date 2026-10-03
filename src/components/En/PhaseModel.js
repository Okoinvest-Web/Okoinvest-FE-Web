import { cn } from "@/components/ui/cn";
import Reveal from "@/components/ui/Reveal";
import { PHASEN } from "@/lib/invest/markt";
import { fmtEn } from "./sprachpaare";

/**
 * Englische Fassung von Investoren/Phasenmodell. Preise und Monate kommen
 * unverändert aus PHASEN (src/lib/invest/markt.js) – hier nur Übersetzung.
 */
export const PHASE_EN = {
  flaeche: { label: "Land secured", kurz: "Land secured", hat: "Lease or option agreements, initial site screening", offen: "Grid connection, planning permission, expert reports" },
  netz: { label: "Grid connection commitment", kurz: "Grid commitment", hat: "Grid connection commitment with point of connection", offen: "Zoning plan (B-Plan) procedure, reports, permit" },
  aufstellung: { label: "Zoning plan: resolution to draw up", kurz: "Zoning resolution", hat: "Municipal resolution to draw up the zoning plan (Aufstellungsbeschluss), early public participation under way", offen: "Adoption of the zoning plan, environmental report, compensation measures" },
  satzung: { label: "Zoning plan adopted / building rights", kurz: "Building rights", hat: "Legally binding zoning plan (Satzungsbeschluss) or equivalent building rights", offen: "Building permit, grid connection agreement, route to market" },
  rtb: { label: "Ready-to-Build (RTB)", kurz: "RTB", hat: "Building rights, grid, land and reports in place – ready to build", offen: "EPC, financing, EEG tender award or PPA" },
  cod: { label: "In operation (COD / operating asset)", kurz: "Operating", hat: "Operating plant with yield history", offen: "Operations, remaining term of support scheme and lease" },
};

export const RISIKO_EN = { "sehr hoch": "very high", hoch: "high", "mittel–hoch": "medium–high", mittel: "medium", gering: "low", "sehr gering": "very low" };
const RISIKO_STUFE = { "sehr hoch": 5, hoch: 4, "mittel–hoch": 3, mittel: 2, gering: 1, "sehr gering": 0 };

export default function PhaseModel() {
  const entwicklung = PHASEN.filter((p) => p.id !== "cod");
  const max = Math.max(...entwicklung.map((p) => p.preisProKwp.max));
  return (
    <div>
      <ol className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {PHASEN.map((p, i) => {
          const t = PHASE_EN[p.id];
          const stufe = RISIKO_STUFE[p.risiko] ?? 3;
          const bestand = p.id === "cod";
          return (
            <Reveal as="li" key={p.id} delay={i * 60} className={cn("relative flex flex-col rounded-[1.4rem] p-6 ring-1", bestand ? "ov-verlauf-nacht text-white ring-white/10" : "bg-white ring-ink-200/80")}>
              <div className="flex items-start justify-between gap-4">
                <span className={cn("flex h-10 w-10 items-center justify-center rounded-2xl font-display text-[15px] font-extrabold", bestand ? "bg-white/10 text-ov-300" : "bg-ov-50 text-ov-700")}>
                  {String(i + 1).padStart(2, "0")}
                </span>
                <span className={cn("rounded-full px-2.5 py-1 text-[11.5px] font-semibold", bestand ? "bg-white/10 text-white/80" : "bg-ink-100 text-ink-600")}>
                  {bestand ? "Operating / secondary" : p.monateBisRtb ? `≈ ${p.monateBisRtb} months to RTB` : "ready to build"}
                </span>
              </div>
              <h3 className={cn("mt-5 font-display text-[19px] font-bold leading-snug", bestand ? "text-white" : "text-ink-900")}>{t.label}</h3>
              <p className={cn("ov-num mt-2 font-display text-[26px] font-extrabold tracking-tight", bestand ? "text-ov-300" : "text-ink-900")}>
                €{fmtEn(p.preisProKwp.min)}–{fmtEn(p.preisProKwp.max)} <span className={cn("text-[15px] font-bold", bestand ? "text-white/60" : "text-ink-500")}>/kWp</span>
              </p>
              {!bestand && (
                <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-ink-100" aria-hidden="true">
                  <div className="h-full rounded-full bg-ov-500" style={{ marginLeft: `${(p.preisProKwp.min / max) * 100}%`, width: `${((p.preisProKwp.max - p.preisProKwp.min) / max) * 100}%` }} />
                </div>
              )}
              <div className="mt-4 flex items-center gap-3">
                <span className={cn("text-[12.5px] font-medium", bestand ? "text-white/60" : "text-ink-500")}>Risk</span>
                <span className="flex gap-1" aria-hidden="true">
                  {[1, 2, 3, 4, 5].map((s) => (
                    <span key={s} className={cn("h-2 w-5 rounded-full", s <= stufe ? (stufe >= 4 ? "bg-sun-500" : "bg-sun-400") : bestand ? "bg-white/15" : "bg-ink-200")} />
                  ))}
                </span>
                <span className={cn("text-[13px] font-semibold", bestand ? "text-white" : "text-ink-800")}>{RISIKO_EN[p.risiko] || p.risiko}</span>
              </div>
              <dl className={cn("mt-5 space-y-2 border-t pt-4 text-[14px] leading-relaxed", bestand ? "border-white/10" : "border-ink-100")}>
                <div>
                  <dt className={cn("text-[12px] font-semibold uppercase tracking-[0.12em]", bestand ? "text-ov-300" : "text-ov-700")}>In place</dt>
                  <dd className={bestand ? "text-white/75" : "text-ink-700"}>{t.hat}</dd>
                </div>
                <div>
                  <dt className={cn("text-[12px] font-semibold uppercase tracking-[0.12em]", bestand ? "text-white/50" : "text-ink-500")}>Still open</dt>
                  <dd className={bestand ? "text-white/75" : "text-ink-700"}>{t.offen}</dd>
                </div>
              </dl>
            </Reveal>
          );
        })}
      </ol>
      <p className="mt-5 text-[13px] leading-relaxed text-ink-500">
        Prices as development premium per kWp for project rights (operating assets: asset value per kWp), DACH 2025/26 – wide ranges, depending on grid connection, size, tariff or PPA and location. Early-stage projects are usually paid in milestone instalments.
      </p>
    </div>
  );
}
