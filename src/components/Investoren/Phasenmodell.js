import { cn } from "@/components/ui/cn";
import Reveal from "@/components/ui/Reveal";
import { PHASEN } from "@/lib/invest/markt";
import { fmt } from "@/lib/rechner/annahmen";
import { RISIKO_STUFE, RisikoPunkte } from "./Seite/teile";

/** Was in jeder Phase typischerweise vorliegt bzw. noch offen ist */
const INHALT = {
  flaeche: { hat: "Pacht- oder Optionsverträge, erste Flächenprüfung", offen: "Netz, Baurecht, Gutachten" },
  netz: { hat: "Netzanschlusszusage mit Einspeisepunkt", offen: "Bauleitplanung, Gutachten, Genehmigung" },
  aufstellung: { hat: "Aufstellungsbeschluss, frühzeitige Beteiligung läuft", offen: "Satzungsbeschluss, Umweltbericht, Ausgleich" },
  satzung: { hat: "Rechtskräftiger B-Plan bzw. Baurecht", offen: "Baugenehmigung, Netzvertrag, Vermarktung" },
  rtb: { hat: "Baurecht, Netz, Flächen, Gutachten – baubereit", offen: "EPC, Finanzierung, Zuschlag oder PPA" },
  cod: { hat: "Laufende Anlage mit Ertragshistorie", offen: "Betrieb, Restlaufzeit von Förderung und Pacht" },
};

/**
 * Phasenmodell als „Preisleiter“: eine Zeile je Entwicklungsphase mit Preisspanne
 * auf gemeinsamer Achse (€/kWp), Risiko, Zeit bis RTB sowie „liegt vor / noch offen“.
 * Bestand folgt als eigene, dunkle Zeile (anderer Maßstab). Server-Komponente.
 */
export default function Phasenmodell() {
  const entwicklung = PHASEN.filter((p) => p.id !== "cod");
  const bestand = PHASEN.find((p) => p.id === "cod");
  const max = Math.ceil(Math.max(...entwicklung.map((p) => p.preisProKwp.max)) / 50) * 50;
  const ticks = Array.from({ length: max / 50 + 1 }, (_, i) => i * 50);

  return (
    <div>
      <div className="overflow-hidden rounded-[1.75rem] bg-white shadow-e2 ring-1 ring-ink-200/70">
        {/* Kopfzeile (ab lg) */}
        <div className="hidden grid-cols-[minmax(0,1.15fr)_minmax(0,1.5fr)_minmax(0,0.7fr)_minmax(0,1.35fr)] gap-6 border-b border-ink-100 bg-ink-50/60 px-8 py-3.5 text-[11.5px] font-semibold uppercase tracking-[0.12em] text-ink-500 lg:grid">
          <span>Phase</span>
          <span>Preis je kWp <span className="font-medium normal-case tracking-normal text-ink-500">· Achse 0–{max} €</span></span>
          <span>Risiko</span>
          <span>Liegt vor · noch offen</span>
        </div>

        <ol>
          {entwicklung.map((p, i) => {
            const stufe = RISIKO_STUFE[p.risiko] ?? 3;
            const rtb = p.id === "rtb";
            return (
              <Reveal
                as="li"
                key={p.id}
                delay={i * 60}
                className={cn(
                  "grid gap-x-6 gap-y-4 border-ink-100 px-5 py-6 sm:px-8 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1.5fr)_minmax(0,0.7fr)_minmax(0,1.35fr)] lg:items-center",
                  i > 0 && "border-t",
                  rtb && "bg-ov-50/60"
                )}
              >
                {/* Phase */}
                <div className="flex items-start gap-4">
                  <span className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl font-display text-[15px] font-extrabold", rtb ? "bg-ov-600 text-white" : "bg-ov-50 text-ov-700 ring-1 ring-inset ring-ov-200")}>
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <div className="min-w-0">
                    <h3 className="font-display text-[17px] font-bold leading-snug text-ink-900">{p.label}</h3>
                    <p className="mt-0.5 text-[13px] text-ink-500">{p.monateBisRtb ? `≈ ${p.monateBisRtb} Monate bis RTB` : "baubereit"}</p>
                  </div>
                </div>

                {/* Preis */}
                <div className="flex items-center gap-4">
                  <p className="ov-num w-[7.5rem] shrink-0 font-display text-[20px] font-extrabold tracking-tight text-ink-900">
                    {fmt(p.preisProKwp.min)}–{fmt(p.preisProKwp.max)}
                    <span className="ml-1 text-[12px] font-bold text-ink-500">€/kWp</span>
                  </p>
                  <div className="relative h-3 flex-1 rounded-full bg-ink-100" aria-hidden="true">
                    {ticks.slice(1, -1).map((t) => (
                      <span key={t} className="absolute inset-y-0 w-px bg-white" style={{ left: `${(t / max) * 100}%` }} />
                    ))}
                    <span
                      className={cn("absolute inset-y-0 rounded-full", rtb ? "bg-ov-600" : "bg-gradient-to-r from-ov-300 to-ov-500")}
                      style={{ left: `${(p.preisProKwp.min / max) * 100}%`, width: `${Math.max(2, ((p.preisProKwp.max - p.preisProKwp.min) / max) * 100)}%` }}
                    />
                  </div>
                </div>

                {/* Risiko */}
                <div className="flex items-center gap-3">
                  <span className="text-[12.5px] font-medium text-ink-500 lg:sr-only">Risiko</span>
                  <RisikoPunkte stufe={stufe} klein />
                  <span className="text-[13px] font-semibold text-ink-800">{p.risiko}</span>
                </div>

                {/* Inhalt */}
                <dl className="grid gap-x-5 gap-y-2 text-[13.5px] leading-snug sm:grid-cols-2">
                  <div>
                    <dt className="text-[11px] font-semibold uppercase tracking-[0.12em] text-ov-700">Liegt vor</dt>
                    <dd className="mt-0.5 text-ink-700">{INHALT[p.id]?.hat}</dd>
                  </div>
                  <div>
                    <dt className="text-[11px] font-semibold uppercase tracking-[0.12em] text-ink-500">Noch offen</dt>
                    <dd className="mt-0.5 text-ink-700">{INHALT[p.id]?.offen}</dd>
                  </div>
                </dl>
              </Reveal>
            );
          })}
        </ol>
      </div>

      {/* Bestand – eigener Maßstab */}
      {bestand && (
        <Reveal className="relative mt-4 overflow-hidden rounded-[1.75rem] bg-navy-950 px-5 py-6 text-white sm:px-8 lg:mt-5">
          <div aria-hidden="true" className="ov-grid-bg pointer-events-none absolute inset-0 opacity-60" />
          <div className="relative grid gap-x-6 gap-y-4 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1.5fr)_minmax(0,0.7fr)_minmax(0,1.35fr)] lg:items-center">
            <div className="flex items-start gap-4">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-white/10 font-display text-[15px] font-extrabold text-ov-300">06</span>
              <div className="min-w-0">
                <h3 className="font-display text-[17px] font-bold leading-snug">{bestand.label}</h3>
                <p className="mt-0.5 text-[13px] text-white/60">Bestand / Secondary</p>
              </div>
            </div>
            <p className="ov-num font-display text-[24px] font-extrabold tracking-tight text-ov-300">
              {fmt(bestand.preisProKwp.min)}–{fmt(bestand.preisProKwp.max)}
              <span className="ml-1 text-[12px] font-bold text-white/60">€/kWp Anlagenwert</span>
            </p>
            <div className="flex items-center gap-3">
              <span className="text-[12.5px] font-medium text-white/60 lg:sr-only">Risiko</span>
              <RisikoPunkte stufe={RISIKO_STUFE[bestand.risiko] ?? 0} dunkel klein />
              <span className="text-[13px] font-semibold">{bestand.risiko}</span>
            </div>
            <dl className="grid gap-x-5 gap-y-2 text-[13.5px] leading-snug sm:grid-cols-2">
              <div>
                <dt className="text-[11px] font-semibold uppercase tracking-[0.12em] text-ov-300">Liegt vor</dt>
                <dd className="mt-0.5 text-white/80">{INHALT.cod.hat}</dd>
              </div>
              <div>
                <dt className="text-[11px] font-semibold uppercase tracking-[0.12em] text-white/60">Noch offen</dt>
                <dd className="mt-0.5 text-white/80">{INHALT.cod.offen}</dd>
              </div>
            </dl>
          </div>
        </Reveal>
      )}

      <p className="mt-5 text-[13px] leading-relaxed text-ink-500">
        Preise als Entwicklungsprämie je kWp für Projektrechte (Bestand: Anlagenwert je kWp), DACH 2025/26 – breite Spannen, abhängig von Netzanschluss, Größe, Tarif oder PPA und Standort.
        Frühe Phasen werden meist gestaffelt nach Meilensteinen bezahlt.
      </p>
    </div>
  );
}
