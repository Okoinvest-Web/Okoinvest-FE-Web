import { PACHT, PHASEN, STROM } from "@/lib/invest/markt";
import { spracheDerAnfrage } from "@/lib/land/seite";
import { formate } from "@/lib/sprache/zahlformat";

/* Mini-Vorschauen für die Tool-Karten im Hub /rechner – dekorativ (aria-hidden),
   Werte stammen aus den Marktannahmen bzw. aus Beispielrechnungen der Rechner.
   Server-Komponenten. */

const GRUEN = "#669933";
const GRUEN_HELL = "#cde3b1";
const NAVY = "#1f5aa1";
const GRAU = "#c4cad5";

/** Flächencheck: Kartenausschnitt mit Parzelle und Ampel */
export function VorschauFlaeche() {
  return (
    <svg viewBox="0 0 320 150" className="h-auto w-full" aria-hidden="true">
      <rect width="320" height="150" rx="14" fill="#f4f9ee" />
      <path d="M0 110 C 80 90, 140 130, 320 96" stroke="#dfe3ea" strokeWidth="10" fill="none" />
      <path d="M210 0 L 250 150" stroke="#dfe3ea" strokeWidth="6" />
      <path d="M40 30 L150 22 L168 88 L58 100 Z" fill={GRUEN_HELL} stroke={GRUEN} strokeWidth="2.5" />
      {Array.from({ length: 5 }, (_, i) => (
        <line key={i} x1={52 + i * 21} y1={36 - i * 1.5} x2={62 + i * 21} y2={94 - i * 1.5} stroke={GRUEN} strokeWidth="1" opacity="0.5" />
      ))}
      <circle cx="104" cy="60" r="8" fill={GRUEN} />
      <circle cx="104" cy="60" r="16" fill={GRUEN} opacity="0.2" />
      <g transform="translate(248 20)">
        <rect width="48" height="104" rx="14" fill="#151a24" />
        <circle cx="24" cy="24" r="10" fill="#4e5667" />
        <circle cx="24" cy="52" r="10" fill="#4e5667" />
        <circle cx="24" cy="80" r="10" fill="#8cba58" />
      </g>
    </svg>
  );
}

/** Balkenvergleich (zwei bis drei Reihen) */
export function VorschauBalken({ reihen }) {
  const max = Math.max(...reihen.map((r) => r.wert));
  return (
    <div className="space-y-2.5" aria-hidden="true">
      {reihen.map((r, i) => (
        <div key={r.label}>
          <div className="mb-1 flex justify-between gap-2 text-[11.5px] text-ink-500">
            <span>{r.label}</span>
            <span className="ov-num font-semibold text-ink-700">{r.anzeige}</span>
          </div>
          <div className="h-2.5 overflow-hidden rounded-full bg-ink-100">
            <div className="ov-balken-x h-full rounded-full" style={{ width: `${(r.wert / max) * 100}%`, background: r.farbe, "--i": i * 3 }} />
          </div>
        </div>
      ))}
    </div>
  );
}

/** Pachtrechner: Solarpacht gegenüber Ackerpacht je ha */
export function VorschauPacht() {
  const f = formate(spracheDerAnfrage());
  const en = f.sprache === "en";
  return (
    <VorschauBalken
      reihen={[
        { label: en ? "Arable lease" : "Ackerpacht", wert: PACHT.ackerProHa, anzeige: f.eur(PACHT.ackerProHa, "/ha"), farbe: GRAU },
        { label: en ? "Solar lease (mid)" : "Solarpacht (Mitte)", wert: PACHT.freiflaecheProHa.mittel, anzeige: f.eur(PACHT.freiflaecheProHa.mittel, "/ha"), farbe: GRUEN },
      ]}
    />
  );
}

/** Agri-PV: vertikale Modulreihen mit Kultur dazwischen */
export function VorschauAgri() {
  return (
    <svg viewBox="0 0 320 130" className="h-auto w-full" aria-hidden="true">
      <rect width="320" height="130" rx="14" fill="#fbfaf6" />
      <circle cx="280" cy="30" r="14" fill="#ffd873" />
      <rect x="0" y="104" width="320" height="26" fill="#e6f1d8" />
      {[40, 120, 200, 280].map((x) => (
        <g key={x}>
          <rect x={x - 3} y="40" width="6" height="66" rx="2" fill="#394050" />
          <rect x={x - 7} y="44" width="14" height="52" rx="3" fill={NAVY} />
        </g>
      ))}
      {Array.from({ length: 21 }, (_, i) => {
        const x = 12 + i * 14.5;
        if ([40, 120, 200, 280].some((m) => Math.abs(m - x) < 12)) return null;
        return (
          <g key={i}>
            <line x1={x} y1="104" x2={x} y2={88} stroke={GRUEN} strokeWidth="2" />
            <ellipse cx={x - 3} cy="92" rx="4" ry="2" fill="#8cba58" />
            <ellipse cx={x + 3} cy="96" rx="4" ry="2" fill="#8cba58" />
          </g>
        );
      })}
    </svg>
  );
}

/** Solarpark: kumulierter Cashflow (aus einer Beispielrechnung) */
export function VorschauCashflow({ werte = [] }) {
  if (werte.length < 2) return null;
  const W = 320;
  const H = 120;
  const min = Math.min(...werte, 0);
  const max = Math.max(...werte, 0);
  const x = (i) => 8 + (i / (werte.length - 1)) * (W - 16);
  const y = (v) => 8 + ((max - v) / (max - min || 1)) * (H - 16);
  const d = werte.map((v, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(" ");
  const nullY = y(0);
  const iNull = werte.findIndex((v) => v >= 0);
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" aria-hidden="true">
      <defs>
        <linearGradient id="ov-hub-cf" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor={GRUEN} stopOpacity="0.28" />
          <stop offset="100%" stopColor={GRUEN} stopOpacity="0" />
        </linearGradient>
      </defs>
      <line x1="8" x2={W - 8} y1={nullY} y2={nullY} stroke="#97a0b0" strokeDasharray="3 4" />
      <path d={`${d} L${x(werte.length - 1)},${nullY} L${x(0)},${nullY} Z`} fill="url(#ov-hub-cf)" className="ov-flaeche-ein" />
      <path d={d} fill="none" stroke={GRUEN} strokeWidth="3" strokeLinejoin="round" pathLength="1" className="ov-linie" />
      {iNull > 0 && <circle cx={x(iNull)} cy={nullY} r="5.5" fill="#fff" stroke="#c98500" strokeWidth="3" className="ov-flaeche-ein" />}
    </svg>
  );
}

/** Projektbewertung: Werttreppe der Phasen bis RTB */
export function VorschauTreppe() {
  const phasen = PHASEN.filter((p) => p.id !== "cod");
  const max = Math.max(...phasen.map((p) => p.preisProKwp.max));
  return (
    <div className="flex h-[110px] items-end gap-2" aria-hidden="true">
      {phasen.map((p, i) => (
        <div key={p.id} className="relative flex h-full flex-1 items-end">
          <div className="ov-balken-y absolute bottom-0 w-full rounded-t-lg bg-ov-100" style={{ height: `${(p.preisProKwp.max / max) * 100}%`, "--i": i * 1.5 }} />
          <div className="ov-balken-y absolute bottom-0 w-full rounded-t-lg" style={{ height: `${(p.preisProKwp.min / max) * 100}%`, background: i === phasen.length - 1 ? GRUEN : "#8cba58", "--i": i * 1.5 + 1 }} />
        </div>
      ))}
    </div>
  );
}

/** Reststrom: Strompreisbestandteile, beeinflussbarer Teil hervorgehoben */
export function VorschauStrompreis() {
  const f = formate(spracheDerAnfrage());
  const summe = STROM.bestandteile.reduce((s, b) => s + b.ct, 0);
  return (
    <div aria-hidden="true">
      <div className="flex h-7 overflow-hidden rounded-xl">
        {STROM.bestandteile.map((b, i) => (
          <div key={b.id} style={{ width: `${(b.ct / summe) * 100}%`, background: b.beeinflussbar ? GRUEN : ["#97a0b0", "#c4cad5", "#dfe3ea", "#b2cbe9"][i % 4] }} />
        ))}
      </div>
      <div className="mt-2 flex justify-between text-[11.5px] text-ink-500">
        <span>
          <span className="mr-1.5 inline-block h-2 w-2 rounded-full" style={{ background: GRUEN }} />
          {f.sprache === "en" ? "Procurement – where the pool takes effect" : "Beschaffung – hier wirkt der Pool"}
        </span>
        <span className="ov-num font-semibold text-ink-700">{f.fmt(summe, 1)} ct</span>
      </div>
    </div>
  );
}

/** Carport: Reihencarport über Autos */
export function VorschauCarport() {
  return (
    <svg viewBox="0 0 320 120" className="h-auto w-full" aria-hidden="true">
      <rect width="320" height="120" rx="14" fill="#fbfaf6" />
      <rect x="0" y="100" width="320" height="20" fill="#e6e8ec" />
      {[40, 160, 280].map((x) => (
        <rect key={x} x={x - 3} y="40" width="6" height="62" fill="#394050" />
      ))}
      <path d="M16 44 L304 30 L304 38 L16 52 Z" fill={NAVY} />
      {[34, 108, 182, 256].map((x, i) => (
        <g key={x}>
          <rect x={x} y="78" width="46" height="20" rx="8" fill={i === 1 ? GRUEN : "#97a0b0"} />
          <rect x={x + 8} y="70" width="30" height="12" rx="5" fill={i === 1 ? GRUEN : "#97a0b0"} />
        </g>
      ))}
      <rect x="92" y="72" width="8" height="28" rx="2" fill="#fff" stroke={GRUEN} strokeWidth="2" />
    </svg>
  );
}

export { GRUEN, NAVY };
