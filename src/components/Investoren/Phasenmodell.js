import { cn } from "@/components/ui/cn";
import Reveal from "@/components/ui/Reveal";
import { PHASEN } from "@/lib/invest/markt";
import { fmt } from "@/lib/rechner/annahmen";

/** Was in jeder Phase typischerweise vorliegt bzw. noch offen ist */
const INHALT = {
  flaeche: { hat: "Pacht- oder Optionsverträge, erste Flächenprüfung", offen: "Netz, Baurecht, Gutachten" },
  netz: { hat: "Netzanschlusszusage mit Einspeisepunkt", offen: "Bauleitplanung, Gutachten, Genehmigung" },
  aufstellung: { hat: "Aufstellungsbeschluss, frühzeitige Beteiligung läuft", offen: "Satzungsbeschluss, Umweltbericht, Ausgleich" },
  satzung: { hat: "Rechtskräftiger B-Plan bzw. Baurecht", offen: "Baugenehmigung, Netzvertrag, Vermarktung" },
  rtb: { hat: "Baurecht, Netz, Flächen, Gutachten – baubereit", offen: "EPC, Finanzierung, Zuschlag oder PPA" },
  cod: { hat: "Laufende Anlage mit Ertragshistorie", offen: "Betrieb, Restlaufzeit von Förderung und Pacht" },
};

const RISIKO_STUFE = { "sehr hoch": 5, hoch: 4, "mittel–hoch": 3, mittel: 2, gering: 1, "sehr gering": 0 };

export default function Phasenmodell() {
  const entwicklung = PHASEN.filter((p) => p.id !== "cod");
  const max = Math.max(...entwicklung.map((p) => p.preisProKwp.max));
  return (
    <div>
      <ol className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {PHASEN.map((p, i) => {
          const stufe = RISIKO_STUFE[p.risiko] ?? 3;
          const bestand = p.id === "cod";
          return (
            <Reveal as="li" key={p.id} delay={i * 60} className={cn("relative flex flex-col rounded-3xl p-6 ring-1", bestand ? "bg-navy-950 text-white ring-navy-900" : "bg-white ring-ink-200/70")}>
              <div className="flex items-start justify-between gap-4">
                <span className={cn("flex h-10 w-10 items-center justify-center rounded-2xl font-display text-[15px] font-extrabold", bestand ? "bg-white/10 text-ov-300" : "bg-ov-50 text-ov-700")}>
                  {String(i + 1).padStart(2, "0")}
                </span>
                <span className={cn("rounded-full px-2.5 py-1 text-[11.5px] font-semibold", bestand ? "bg-white/10 text-white/80" : "bg-ink-100 text-ink-600")}>
                  {bestand ? "Bestand / Secondary" : p.monateBisRtb ? `≈ ${p.monateBisRtb} Monate bis RTB` : "baubereit"}
                </span>
              </div>
              <h3 className={cn("mt-5 font-display text-[19px] font-bold leading-snug", bestand ? "text-white" : "text-ink-900")}>{p.label}</h3>
              <p className={cn("ov-num mt-2 font-display text-[26px] font-extrabold tracking-tight", bestand ? "text-ov-300" : "text-ink-900")}>
                {fmt(p.preisProKwp.min)}–{fmt(p.preisProKwp.max)} <span className={cn("text-[15px] font-bold", bestand ? "text-white/60" : "text-ink-500")}>€/kWp</span>
              </p>
              {!bestand && (
                <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-ink-100" aria-hidden="true">
                  <div className="h-full rounded-full bg-ov-500" style={{ marginLeft: `${(p.preisProKwp.min / max) * 100}%`, width: `${((p.preisProKwp.max - p.preisProKwp.min) / max) * 100}%` }} />
                </div>
              )}
              <div className="mt-4 flex items-center gap-3">
                <span className={cn("text-[12.5px] font-medium", bestand ? "text-white/60" : "text-ink-500")}>Risiko</span>
                <span className="flex gap-1" aria-hidden="true">
                  {[1, 2, 3, 4, 5].map((s) => (
                    <span key={s} className={cn("h-2 w-5 rounded-full", s <= stufe ? (stufe >= 4 ? "bg-sun-500" : "bg-sun-400") : bestand ? "bg-white/15" : "bg-ink-200")} />
                  ))}
                </span>
                <span className={cn("text-[13px] font-semibold", bestand ? "text-white" : "text-ink-800")}>{p.risiko}</span>
              </div>
              <dl className={cn("mt-5 space-y-2 border-t pt-4 text-[14px] leading-relaxed", bestand ? "border-white/10" : "border-ink-100")}>
                <div>
                  <dt className={cn("text-[12px] font-semibold uppercase tracking-[0.12em]", bestand ? "text-ov-300" : "text-ov-700")}>Liegt vor</dt>
                  <dd className={bestand ? "text-white/75" : "text-ink-700"}>{INHALT[p.id]?.hat}</dd>
                </div>
                <div>
                  <dt className={cn("text-[12px] font-semibold uppercase tracking-[0.12em]", bestand ? "text-white/50" : "text-ink-500")}>Noch offen</dt>
                  <dd className={bestand ? "text-white/75" : "text-ink-700"}>{INHALT[p.id]?.offen}</dd>
                </div>
              </dl>
            </Reveal>
          );
        })}
      </ol>
      <p className="mt-5 text-[13px] leading-relaxed text-ink-500">
        Preise als Entwicklungsprämie je kWp für Projektrechte (Bestand: Anlagenwert je kWp), DACH 2025/26 – breite Spannen, abhängig von Netzanschluss, Größe, Tarif oder PPA und Standort.
        Frühe Phasen werden meist gestaffelt nach Meilensteinen bezahlt.
      </p>
    </div>
  );
}
