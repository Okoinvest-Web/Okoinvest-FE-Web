// Proportionale Zeitachse 2010 → heute auf dunklem Grund: Was die Gruppe seit
// wann tut. Nur Jahreszahlen aus den Meilensteinen (daten.js) – keine Mengen.
// Bewegung: Sobald die Grafik ins Bild kommt (Eltern-Reveal), wachsen die Spuren
// gestaffelt von ihrem Startjahr bis heute (scaleX) – die Gruppe „wächst“ sichtbar.

import { spracheDerAnfrage } from "@/lib/land/seite";

const START = 2010;

const SPUREN = [
  { ab: 2010, titel: "Planung & Bau von PV-Anlagen", text: "ÖKOVOLT, Türkheim", ton: "bg-white/80" },
  { ab: 2012, titel: "Eigene Solarparks in Betrieb", text: "Artern, Tilleda, ab 2013 Irsingen", ton: "bg-ov-300" },
  { ab: 2020, titel: "Projektentwicklung ÖkoInvest", text: "Freifläche, Agri-PV, Speicher", ton: "bg-ov-500" },
  { ab: 2023, titel: "Eigene Kraftwerksgesellschaften", text: "GFL, später HIL", ton: "bg-sun-300" },
];

const SPUREN_EN = [
  { titel: "Planning & construction of PV systems", text: "ÖKOVOLT, Türkheim" },
  { titel: "Own solar parks in operation", text: "Artern, Tilleda, from 2013 Irsingen" },
  { titel: "ÖkoInvest project development", text: "Ground-mounted, agrivoltaics, storage" },
  { titel: "Own power plant companies", text: "GFL, later HIL" },
];

export default function Zeitachse({ marken = [] }) {
  const en = spracheDerAnfrage() === "en";
  const spuren = en ? SPUREN.map((s, i) => ({ ...s, ...SPUREN_EN[i] })) : SPUREN;
  const heute = new Date().getFullYear();
  const ende = Math.max(heute, 2026);
  const pos = (j) => `${((j - START) / (ende - START)) * 100}%`;
  const ticks = [];
  for (let j = START; j <= ende; j += 2) ticks.push(j);

  return (
    <figure className="ov-flaeche-dunkel relative overflow-hidden p-5 sm:p-7 md:p-9">
      <figcaption className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1">
        <span className="font-display text-[17px] font-bold text-white">{en ? "What the group has been doing, and since when" : "Was die Gruppe seit wann tut"}</span>
        <span className="text-[13px] text-white/60">
          {START} {en ? "to today" : "bis heute"}
        </span>
      </figcaption>

      <div className="relative mt-7">
        {/* Raster */}
        <div aria-hidden="true" className="absolute inset-0">
          {ticks.map((j) => (
            <span key={j} className="absolute bottom-0 top-0 w-px bg-white/[0.07]" style={{ left: pos(j) }} />
          ))}
        </div>

        <ul className="relative space-y-4 sm:space-y-5">
          {spuren.map((s, i) => {
            const rechts = (s.ab - START) / (ende - START) > 0.5;
            const ausrichtung = rechts ? "sm:justify-end sm:text-right" : "sm:pl-[var(--x)]";
            return (
            <li key={s.titel} className="relative">
              <p className={`flex flex-wrap items-baseline gap-x-2 text-[13.5px] leading-snug ${ausrichtung}`} style={{ "--x": pos(s.ab) }}>
                <span className="font-semibold text-white">{s.titel}</span>
                <span className="text-white/55">{en ? "since" : "seit"} {s.ab}</span>
              </p>
              <div className="relative mt-2 h-2.5 rounded-full bg-white/[0.06]">
                <span className={`ov-balken-x absolute inset-y-0 right-0 rounded-full ${s.ton}`} style={{ left: pos(s.ab), "--i": i * 5 }} />
                <span aria-hidden="true" className="absolute top-1/2 h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-navy-950 bg-white" style={{ left: pos(s.ab) }} />
              </div>
              <p className={`mt-1.5 text-[12.5px] text-white/60 ${ausrichtung}`} style={{ "--x": pos(s.ab) }}>
                {s.text}
              </p>
            </li>
            );
          })}
        </ul>

        {/* Achse */}
        <div aria-hidden="true" className="relative mt-6 h-6 border-t border-white/15">
          {ticks.map((j) => (
            <span key={j} className="ov-num absolute top-2 -translate-x-1/2 text-[11.5px] text-white/50 max-sm:[&:nth-child(even)]:hidden" style={{ left: pos(j) }}>
              {j}
            </span>
          ))}
          {marken.map((j) => (
            <span key={`m${j}`} className="absolute -top-[5px] h-2.5 w-2.5 -translate-x-1/2 rounded-full bg-ov-300 ring-2 ring-navy-950" style={{ left: pos(j) }} />
          ))}
        </div>
      </div>
    </figure>
  );
}
