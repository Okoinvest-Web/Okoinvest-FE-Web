// Bilanz der Vergleichstabelle: je Modell, wie viele der Kriterien typisch
// erfüllt, teilweise erfüllt oder nicht üblich sind. Zählt nur die Einordnung
// aus der Tabelle (zeilen) – keine weiteren Daten. Auch unsere Schwäche
// (Reichweite) zählt mit.
// Bewegung: Beim Laden füllen sich die Balken Modell für Modell, Segment für
// Segment (scaleX, ov-sofort) – die Bilanz wird „ausgezählt“. Reduziert: statisch.
import { cn } from "@/components/ui/cn";
import { spracheDerAnfrage } from "@/lib/land/seite";

const STUFEN = [
  { id: "gut", label: "typisch erfüllt", farbe: "bg-ov-400" },
  { id: "teils", label: "teilweise", farbe: "bg-sun-300" },
  { id: "nein", label: "nicht üblich", farbe: "bg-white/20" },
];
const STUFEN_EN = { gut: "typically met", teils: "partly", nein: "not usual" };

export default function ModellBilanz({ spalten = [], zeilen = [] }) {
  const n = zeilen.length;
  const en = spracheDerAnfrage() === "en";
  const stufen = en ? STUFEN.map((st) => ({ ...st, label: STUFEN_EN[st.id] })) : STUFEN;
  return (
    <figure style={{ "--ov-delay": "450ms" }} className="ov-sofort relative mx-auto max-w-[580px] rounded-[1.75rem] bg-white/[0.06] p-5 ring-1 ring-inset ring-white/15 backdrop-blur-md sm:p-7 lg:ml-auto lg:mr-0">
      <figcaption className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <span className="font-display text-[17px] font-bold text-white">{en ? `${n} criteria at a glance` : `${n} Kriterien im Überblick`}</span>
        <a href="#vergleich" className="rounded text-[13px] text-white/70 underline decoration-white/30 underline-offset-4 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ov-300">
          {en ? "Go to the table" : "Zur Tabelle"}
        </a>
      </figcaption>

      <ul className="mt-6 space-y-5">
        {spalten.map((s, i) => {
          const zaehl = Object.fromEntries(stufen.map((st) => [st.id, zeilen.filter((z) => z.werte[i]?.stufe === st.id).length]));
          return (
            <li key={s.id} className={cn("rounded-2xl p-4", s.hervorheben ? "bg-white text-ink-900 shadow-e4" : "bg-white/[0.04] ring-1 ring-white/10")}>
              <div className="flex items-baseline justify-between gap-3">
                <p className={cn("font-display text-[15.5px] font-bold", s.hervorheben ? "text-ink-900" : "text-white")}>
                  {s.titel}
                  {s.hervorheben && <span className="ml-2 rounded-full bg-ov-50 px-2 py-0.5 align-[2px] text-[10.5px] font-bold uppercase tracking-[0.08em] text-ov-700 ring-1 ring-ov-200">ÖkoInvest</span>}
                </p>
                <p className={cn("ov-num shrink-0 text-[13px]", s.hervorheben ? "text-ink-600" : "text-white/70")}>
                  <span className={cn("font-bold", s.hervorheben ? "text-ink-900" : "text-white")}>{zaehl.gut}</span> {en ? `of ${n} met` : `von ${n} erfüllt`}
                </p>
              </div>
              <div
                className={cn("mt-3 flex h-3 gap-0.5 overflow-hidden rounded-full", s.hervorheben ? "bg-ink-100" : "bg-white/10")}
                role="img"
                aria-label={en ? `${s.titel}: ${zaehl.gut} typically met, ${zaehl.teils} partly, ${zaehl.nein} not usual` : `${s.titel}: ${zaehl.gut} typisch erfüllt, ${zaehl.teils} teilweise, ${zaehl.nein} nicht üblich`}
              >
                {stufen.map((st, k) =>
                  zaehl[st.id] > 0 ? (
                    <span
                      key={st.id}
                      className={cn("ov-balken-x h-full", st.id === "nein" && s.hervorheben ? "bg-ink-300" : st.farbe, st.id === "gut" && s.hervorheben && "bg-ov-500")}
                      style={{ width: `${(zaehl[st.id] / n) * 100}%`, "--i": i * 6 + k * 2 }}
                    />
                  ) : null
                )}
              </div>
            </li>
          );
        })}
      </ul>

      <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-2 text-[12.5px] text-white/70">
        {stufen.map((st) => (
          <span key={st.id} className="inline-flex items-center gap-2">
            <span aria-hidden="true" className={cn("h-2.5 w-2.5 rounded-full", st.farbe)} />
            {st.label}
          </span>
        ))}
      </div>
      <p className="mt-3 text-[12px] leading-relaxed text-white/60">{en ? "Our own classification of typical models – including our limitations, for example in reach." : "Eigene Einordnung typischer Modelle – inklusive unserer Grenzen, etwa bei der Reichweite."}</p>
    </figure>
  );
}
