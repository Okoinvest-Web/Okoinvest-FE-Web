import { cn } from "@/components/ui/cn";
import Reveal from "@/components/ui/Reveal";
import Aufbau, { aufbau } from "@/components/Flaeche/Seite/Aufbau";

/**
 * Projekt-Zeitleiste als Balkendiagramm (Server-Komponente, reines HTML/CSS).
 * phasen: [{ titel, text, von, bis, ton? }] in Monaten ab Start; `monate` = Achsenlänge.
 * Auf dem Handy stehen Titel und Balken untereinander.
 */
export const PHASEN_SOLARPARK = [
  { titel: "Flächencheck & Vorprüfung", text: "Kartentisch: Schutzgebiete, Regionalplan, Netz, Einstrahlung", von: 0, bis: 1.5 },
  { titel: "Pachtvertrag & Grundbuch", text: "Nutzungsvertrag, Dienstbarkeit, Reservierungsprämie", von: 1, bis: 4 },
  { titel: "Netzanfrage & Reservierung", text: "Netzverträglichkeitsprüfung beim Netzbetreiber – läuft parallel", von: 2, bis: 12 },
  { titel: "Gemeinde & Aufstellungsbeschluss", text: "Vorstellung im Gemeinderat, städtebaulicher Vertrag", von: 3, bis: 9 },
  { titel: "Gutachten & Beteiligung", text: "Artenschutz über eine Vegetationsperiode, Umweltbericht, Blendgutachten, Auslegung", von: 8, bis: 22 },
  { titel: "Satzungsbeschluss & Baugenehmigung", text: "Abwägung, Satzung, Flächennutzungsplan, Bauantrag", von: 20, bis: 30 },
  { titel: "Zuschlag bzw. PPA & Finanzierung", text: "EEG-Ausschreibung oder Stromliefervertrag, Bankprüfung", von: 26, bis: 34 },
  { titel: "Bau & Netzanschluss", text: "Rammen, Montage, Kabeltrasse, Inbetriebnahme", von: 33, bis: 39, ton: "gruen" },
  { titel: "Betrieb", text: "30 Jahre und mehr – Pacht fließt jährlich", von: 39, bis: 48, ton: "navy", offen: true },
];

export default function Zeitleiste({ phasen = PHASEN_SOLARPARK, monate = 48, className }) {
  const pct = (m) => `${(m / monate) * 100}%`;
  const jahre = Array.from({ length: Math.floor(monate / 12) + 1 }, (_, i) => i);
  return (
    <div className={cn("rounded-[2rem] bg-white p-5 ring-1 ring-ink-200/70 sm:p-7 md:p-9", className)}>
      {/* Achse (nur ab md sichtbar – auf dem Handy trägt jede Zeile ihre Dauer) */}
      <div className="hidden md:grid md:grid-cols-[minmax(0,300px)_1fr] md:gap-6">
        <span />
        <div className="relative h-6 text-[12px] font-semibold text-ink-500">
          {jahre.map((j) => (
            <span key={j} className={cn("absolute whitespace-nowrap", j === 0 ? "" : j * 12 >= monate ? "-translate-x-full" : "-translate-x-1/2")} style={{ left: pct(j * 12) }}>
              {j === 0 ? "Start" : `${j} J.`}
            </span>
          ))}
        </div>
      </div>
      <ol className="space-y-4 md:space-y-2.5">
        {phasen.map((p, i) => (
          <Reveal as="li" key={p.titel} delay={i * 50} className="grid gap-2 md:grid-cols-[minmax(0,300px)_1fr] md:items-center md:gap-6">
            <div className="min-w-0">
              <p className="flex items-baseline gap-2 font-display text-[15.5px] font-bold leading-snug text-ink-900">
                <span className="ov-num text-[12.5px] text-ov-700">{String(i + 1).padStart(2, "0")}</span>
                {p.titel}
                <span className="ml-auto shrink-0 rounded-full bg-ov-50 px-2 py-0.5 font-sans text-[11.5px] font-semibold text-ov-800 md:hidden">{dauer(p)}</span>
              </p>
              <p className="text-[13px] leading-snug text-ink-500">{p.text}</p>
            </div>
            <Aufbau verzoegerung={120 + i * 70} className="relative h-3 rounded-full bg-ink-50 md:h-7">
              {jahre.slice(1, -1).map((j) => (
                <span key={j} aria-hidden="true" className="absolute inset-y-0 w-px bg-ink-200" style={{ left: pct(j * 12) }} />
              ))}
              <span
                className={cn(
                  "absolute inset-y-0 flex items-center overflow-hidden rounded-full px-2.5 text-[11.5px] font-semibold whitespace-nowrap",
                  p.ton === "navy" ? "text-white" : p.ton === "gruen" ? "text-white" : "text-ov-900",
                  p.offen && "rounded-r-none"
                )}
                style={{ left: pct(p.von), width: pct(p.bis - p.von) }}
              >
                {/* Balken wächst von links (transform), die Beschriftung blendet danach ein */}
                <span
                  aria-hidden="true"
                  className={cn(
                    "absolute inset-0 rounded-[inherit]",
                    aufbau.wachsen,
                    p.ton === "navy" ? "bg-navy-950" : p.ton === "gruen" ? "bg-ov-600" : "bg-ov-200",
                    p.offen && "bg-gradient-to-r from-navy-950 to-navy-700"
                  )}
                  style={{ "--dauer": "800ms" }}
                />
                <span className={cn("relative hidden md:inline", aufbau.ein)} style={{ "--ein-start": "450ms" }}>{p.bis - p.von >= 5 ? dauer(p) : null}</span>
              </span>
              {p.bis - p.von < 5 && (
                <span className={cn("absolute inset-y-0 hidden items-center pl-2 text-[11.5px] md:flex font-semibold whitespace-nowrap text-ov-800", aufbau.ein)} style={{ left: pct(p.bis), "--ein-start": "450ms" }}>
                  {dauer(p)}
                </span>
              )}
            </Aufbau>
          </Reveal>
        ))}
      </ol>
      <p className="mt-6 border-t border-ink-100 pt-5 text-[13.5px] leading-relaxed text-ink-500">
        Typischer Verlauf in Deutschland mit Bebauungsplan. Ehrlich gesagt: Von der Unterschrift bis zum Betrieb vergehen meist <strong className="text-ink-800">2 bis 4 Jahre</strong> – Netz, Gemeinde und Artenschutz geben den Takt vor. Privilegierte Flächen, Österreich und die Schweiz folgen eigenen Verfahren.
      </p>
    </div>
  );
}

function dauer(p) {
  if (p.offen) return "30+ Jahre";
  const m = Math.round(p.bis - p.von);
  return m < 2 ? "Wochen" : `${m} Mon.`;
}
