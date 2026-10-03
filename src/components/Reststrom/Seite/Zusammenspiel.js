// „Erst selbst erzeugen, dann gebündelt einkaufen“ – schematischer Tageslastgang
import Reveal from "@/components/ui/Reveal";
import SectionHeading from "@/components/ui/SectionHeading";

/* Schema eines Gewerbebetriebs an einem Sommertag (relative Werte, keine Messdaten) */
const LAST = [30, 28, 28, 28, 30, 36, 55, 78, 90, 94, 96, 95, 90, 94, 95, 92, 86, 70, 52, 44, 40, 36, 33, 31, 30];
const PV = [0, 0, 0, 0, 0, 2, 8, 20, 36, 52, 64, 72, 75, 72, 64, 52, 36, 20, 8, 2, 0, 0, 0, 0, 0];
const SPEICHER = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 14, 18, 16, 10, 0, 0, 0, 0];

const W = 620;
const H = 260;
const L = 34;
const R = 12;
const T = 16;
const B = 34;
const x = (h) => L + (h / 24) * (W - L - R);
const y = (v) => T + (1 - v / 100) * (H - T - B);

function flaeche(oben, unten) {
  const o = oben.map((v, h) => `${h ? "L" : "M"}${x(h).toFixed(1)},${y(v).toFixed(1)}`).join(" ");
  const u = unten.map((v, h) => `L${x(h).toFixed(1)},${y(v).toFixed(1)}`).reverse().join(" ");
  return `${o} ${u} Z`;
}

const pvGedeckt = LAST.map((l, h) => Math.min(l, PV[h]));
const speicherOben = LAST.map((l, h) => Math.min(l, pvGedeckt[h] + SPEICHER[h]));
const null0 = LAST.map(() => 0);

const SCHRITTE = [
  { farbe: "bg-sun-400", titel: "1. Eigenverbrauch", text: "Solarstrom vom eigenen Dach oder Carport zuerst" },
  { farbe: "bg-navy-500", titel: "2. Speicher", text: "Abendstunden und Lastspitzen abdecken" },
  { farbe: "bg-ov-500", titel: "3. Reststrom-Pool", text: "den Rest gebündelt ausschreiben – wir vermitteln, der Lieferant liefert" },
];

export default function Zusammenspiel() {
  return (
    <section data-abschnitt="zusammenspiel" aria-labelledby="zusammen-titel" className="bg-white py-20 md:py-28">
      <div className="ov-container grid items-center gap-12 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:gap-16">
        <div>
          <SectionHeading eyebrow="Zusammenspiel mit PV und Speicher" title={<span id="zusammen-titel">Erst selbst erzeugen, dann gebündelt einkaufen</span>} />
          <Reveal className="mt-6 space-y-4 text-[16px] leading-relaxed text-ink-600">
            <p>Die Muttergesellschaft ÖKOVOLT plant und baut Photovoltaik und Speicher für Gewerbe und Industrie. Selbst erzeugter Solarstrom ist oft günstiger als Strom aus dem Netz&nbsp;– aber er deckt nie alles.</p>
            <p>Genau hier setzt der Pool an. Weil eigene PV die Mittagsstunden abdeckt und der Speicher Lastspitzen kappt, wird Ihr Restbezug gleichmäßiger und besser planbar. Das macht ihn für die gemeinsame Beschaffung wertvoller.</p>
          </Reveal>
          <p className="mt-6 rounded-2xl bg-sand-50 p-4 text-[14.5px] leading-relaxed text-ink-600 ring-1 ring-ink-200/60">
            Keine ÖKOVOLT-Anlage? Kein Problem&nbsp;– der Pool steht auch Unternehmen ohne eigene Erzeugung offen.
          </p>
        </div>

        <Reveal dir="right" className="rounded-[1.75rem] bg-white p-5 shadow-e3 ring-1 ring-ink-200/70 sm:p-7">
          <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
            <p className="font-display text-[17px] font-bold text-ink-900">Ein Tag im Betrieb</p>
            <p className="text-[12px] text-ink-500">Schema, relative Werte</p>
          </div>
          <svg viewBox={`0 0 ${W} ${H}`} className="mt-4 h-auto w-full" role="img" aria-label="Schema eines Tageslastgangs: Mittags deckt die eigene PV einen großen Teil des Verbrauchs, am frühen Abend der Speicher. Der verbleibende Bezug – nachts, morgens und abends – kommt aus dem Reststrom-Pool.">
            {[0, 25, 50, 75, 100].map((v) => (
              <line key={v} x1={L} x2={W - R} y1={y(v)} y2={y(v)} stroke="#eef0f4" />
            ))}
            {/* Einlauf in Erzählreihenfolge (über das umgebende Reveal): Lastgang zeichnet sich, dann deckt die eigene PV,
                dann der Speicher – was übrig bleibt, kommt aus dem Pool */}
            <path d={flaeche(LAST, speicherOben)} fill="#8cba58" fillOpacity="0.85" className="ov-flaeche-ein" style={{ animationDelay: "1250ms" }} />
            <path d={flaeche(speicherOben, pvGedeckt)} fill="#1f5aa1" className="ov-flaeche-ein" style={{ animationDelay: "950ms" }} />
            <path d={flaeche(pvGedeckt, null0)} fill="#ffc53d" className="ov-flaeche-ein" style={{ animationDelay: "650ms" }} />
            <path d={LAST.map((v, h) => `${h ? "L" : "M"}${x(h).toFixed(1)},${y(v).toFixed(1)}`).join(" ")} pathLength="1" fill="none" stroke="#11233f" strokeWidth="2" className="ov-linie" />
            {[0, 6, 12, 18, 24].map((h) => (
              <text key={h} x={x(h)} y={H - 12} textAnchor={h === 0 ? "start" : h === 24 ? "end" : "middle"} fontSize="13" fill="#5b6475">{`${h} Uhr`}</text>
            ))}
            <text x={x(12)} y={y(30)} textAnchor="middle" fontSize="15" fontWeight="700" fill="#5c3d00" className="ov-flaeche-ein" style={{ animationDelay: "800ms" }}>eigene PV</text>
            <g className="ov-flaeche-ein" style={{ animationDelay: "1400ms" }}>
              <text x={x(3)} y={y(14)} textAnchor="middle" fontSize="15" fontWeight="700" fill="#1d3a0b">Pool</text>
              <text x={x(12)} y={y(84)} textAnchor="middle" fontSize="15" fontWeight="700" fill="#1d3a0b">Pool</text>
            </g>
          </svg>
          <ul className="mt-5 grid gap-3 border-t border-ink-100 pt-5 sm:grid-cols-3">
            {SCHRITTE.map((s) => (
              <li key={s.titel} className="flex items-start gap-2.5">
                <span aria-hidden="true" className={`mt-1 h-3 w-3 shrink-0 rounded-[4px] ${s.farbe}`} />
                <span>
                  <span className="block text-[14px] font-semibold text-ink-900">{s.titel}</span>
                  <span className="mt-0.5 block text-[13px] leading-snug text-ink-600">{s.text}</span>
                </span>
              </li>
            ))}
          </ul>
        </Reveal>
      </div>
    </section>
  );
}
