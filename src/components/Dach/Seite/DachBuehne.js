// Hero-Bühne der Seite /dachflaeche-verpachten
// Isometrische Halle mit PV-Belegung (Inline-SVG) und schwebenden Karten mit
// der Beispielrechnung aus src/lib/rechner/dachpacht.js – keine erfundenen Werte.
import { Check, MapPin } from "lucide-react";
import { cn } from "@/components/ui/cn";
import { Zaehler } from "@/components/motion";
import { fmt } from "@/lib/rechner/annahmen";
import { spracheDerAnfrage } from "@/lib/land/seite";
import { uebersetze } from "@/lib/sprache/woerterbuch";
import { fmtZahl } from "@/lib/sprache/format";

/** Sprachmodell: Texte der Bühne (Werte aus dem Dachpacht-Rechner, Format je Sprache). */
const WORTE = {
  de: {
    f: (n, s = 0) => fmt(n, s),
    titel: "Gewerbehalle mit Photovoltaik-Modulreihen auf dem Dach, freiem Brandschutzstreifen und Netzanschluss",
    kopf: (m2) => `Beispiel: ${fmt(m2)} m² Trapezdach · Süd · Süddeutschland`,
    pacht: "Dachpacht fest",
    beispiel: "Beispiel",
    jahr: " / Jahr",
    leistung: (kwp, mwh) => `≈ ${kwp} kWp · ${mwh} MWh im Jahr`,
    jahr1: "Jahr 1",
    summe: (tsd, j) => `${tsd} Tsd. € in ${j} J.`,
    einmal: (tsd) => `Einmalzahlung ca. ${tsd} Tsd. €`,
    portal: "Ihr Dach im Portal",
    status: ["Dachcheck", "Begehung & Statik", "Angebot & Vertrag", "Netz & Genehmigung"],
    zustand: { fertig: "(erledigt)", aktiv: "(in Arbeit)", offen: "(offen)" },
    zahlen: "de-DE",
  },
  en: {
    f: (n, s = 0) => fmtZahl(n, s, "en"),
    titel: "Commercial hall with rows of photovoltaic modules on the roof, a clear fire protection strip and a grid connection",
    kopf: (m2) => `Example: ${fmtZahl(m2, 0, "en")} m² trapezoidal roof · south · southern Germany`,
    pacht: "Fixed roof lease",
    beispiel: "Example",
    jahr: " / year",
    leistung: (kwp, mwh) => `≈ ${kwp} kWp · ${mwh} MWh per year`,
    jahr1: "Year 1",
    summe: (tsd, j) => `€${tsd}k over ${j} yrs`,
    einmal: (tsd) => `One-off payment approx. €${tsd}k`,
    portal: "Your roof in the portal",
    status: ["Roof check", "Site visit & structural check", "Offer & contract", "Grid & permit"],
    zustand: { fertig: "(done)", aktiv: "(in progress)", offen: "(open)" },
    zahlen: "en-GB",
  },
};

/* ---------- Isometrie ---------- */
const S = 25; // Maßstab
const OX = 236;
const OY = 118;
const C = 0.866;
const iso = (x, y, z = 0) => [OX + (x - y) * C * S, OY + (x + y) * 0.5 * S - z * S];
const pts = (...p) => p.map((q) => iso(...q).map((v) => v.toFixed(1)).join(",")).join(" ");

const L = 12; // Hallenlänge
const W = 7; // Hallentiefe
const H = 2.5; // Traufhöhe
const STREIFEN = [5.55, 6.55]; // freier Brandschutzstreifen

/** Modulreihen auf dem Dach (Ost/West-Paare als flache Bänder) */
function module() {
  const out = [];
  let r = 0;
  for (let x = 0.55; x + 0.62 <= L - 0.45; x += 0.86) {
    if (x + 0.62 > STREIFEN[0] && x < STREIFEN[1]) continue;
    for (let y = 0.5; y + 0.92 <= W - 0.4; y += 1.0) {
      out.push({ k: `${r}-${y}`, r, p: pts([x, y, H + 0.04], [x + 0.62, y, H + 0.04], [x + 0.62, y + 0.92, H + 0.04], [x, y + 0.92, H + 0.04]) });
    }
    r++;
  }
  return out;
}
const MODULE = module();
const REIHEN = Math.max(...MODULE.map((m) => m.r)) + 1;

function Halle({ titel }) {
  return (
    <svg viewBox="0 0 560 420" className="block h-auto w-full" role="img" aria-labelledby="dach-buehne-titel">
      <title id="dach-buehne-titel">{titel}</title>
      <defs>
        <linearGradient id="db-modul" x1="0" x2="1" y1="0" y2="1">
          <stop offset="0" stopColor="#2a6fc2" />
          <stop offset="1" stopColor="#123e7a" />
        </linearGradient>
        <linearGradient id="db-dach" x1="0" x2="1" y1="0" y2="1">
          <stop offset="0" stopColor="#1b3a66" />
          <stop offset="1" stopColor="#0e2448" />
        </linearGradient>
        <linearGradient id="db-wand-l" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor="#e9e5d6" />
          <stop offset="1" stopColor="#cfc9b4" />
        </linearGradient>
        <linearGradient id="db-wand-r" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor="#c3bca3" />
          <stop offset="1" stopColor="#a39b82" />
        </linearGradient>
        <linearGradient id="db-glanz" x1="0" x2="1" y1="0" y2="0">
          <stop offset="0" stopColor="#fff" stopOpacity="0" />
          <stop offset="0.5" stopColor="#fff" stopOpacity="0.35" />
          <stop offset="1" stopColor="#fff" stopOpacity="0" />
        </linearGradient>
        <radialGradient id="db-boden" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor="#8cba58" stopOpacity="0.28" />
          <stop offset="1" stopColor="#8cba58" stopOpacity="0" />
        </radialGradient>
      </defs>

      {/* Bodenlicht und Grundstück */}
      <ellipse cx="300" cy="330" rx="270" ry="80" fill="url(#db-boden)" />
      <polygon points={pts([-1.2, -1.2], [L + 1.6, -1.2], [L + 1.6, W + 1.6], [-1.2, W + 1.6])} fill="#ffffff" fillOpacity="0.04" stroke="#ffffff" strokeOpacity="0.12" />

      {/* Netzkabel zur Übergabestation */}
      <polyline points={pts([L, W * 0.3, 0.02], [L + 1.1, W * 0.3, 0.02], [L + 1.1, W + 1.1, 0.02])} fill="none" stroke="#aed083" strokeWidth="2" strokeDasharray="5 5" strokeLinecap="round" />

      {/* Wände */}
      <polygon points={pts([0, W, 0], [L, W, 0], [L, W, H], [0, W, H])} fill="url(#db-wand-l)" />
      <polygon points={pts([L, 0, 0], [L, W, 0], [L, W, H], [L, 0, H])} fill="url(#db-wand-r)" />
      {/* Fensterband und Tore an der Längsseite */}
      <polygon points={pts([0.4, W, H - 0.55], [L - 0.4, W, H - 0.55], [L - 0.4, W, H - 0.35], [0.4, W, H - 0.35])} fill="#0e2448" fillOpacity="0.55" />
      {[1.4, 3.6, 7.8, 10].map((x) => (
        <polygon key={x} points={pts([x, W, 0], [x + 1.3, W, 0], [x + 1.3, W, 1.25], [x, W, 1.25])} fill="#8a836c" />
      ))}
      {[1.4, 3.6, 7.8, 10].map((x) => (
        <polyline key={`l${x}`} points={pts([x, W, 0.42], [x + 1.3, W, 0.42])} stroke="#ffffff" strokeOpacity="0.25" />
      ))}
      {/* Wechselrichter an der Stirnseite */}
      <polygon points={pts([L, 1.2, 0.7], [L, 1.9, 0.7], [L, 1.9, 1.5], [L, 1.2, 1.5])} fill="#0e2448" />
      <polygon points={pts([L, 2.1, 0.7], [L, 2.8, 0.7], [L, 2.8, 1.5], [L, 2.1, 1.5])} fill="#0e2448" />

      {/* Dach mit Attika */}
      <polygon points={pts([0, 0, H], [L, 0, H], [L, W, H], [0, W, H])} fill="url(#db-dach)" />
      <polyline points={pts([0, W, H], [L, W, H], [L, 0, H])} fill="none" stroke="#ffffff" strokeOpacity="0.35" strokeWidth="1.4" strokeLinejoin="round" />

      {/* Brandschutzstreifen */}
      <polygon points={pts([STREIFEN[0], 0.2, H + 0.01], [STREIFEN[1], 0.2, H + 0.01], [STREIFEN[1], W - 0.2, H + 0.01], [STREIFEN[0], W - 0.2, H + 0.01])} fill="#ffd873" fillOpacity="0.16" stroke="#ffd873" strokeOpacity="0.5" strokeDasharray="4 4" />

      {/* Module – erscheinen reihenweise einmalig */}
      {Array.from({ length: REIHEN }, (_, r) => (
        <g key={r} className="ov-hero-in" style={{ "--ov-delay": `${420 + r * 55}ms` }}>
          {MODULE.filter((m) => m.r === r).map((m) => (
            <polygon key={m.k} points={m.p} fill="url(#db-modul)" stroke="#9cc4f0" strokeOpacity="0.35" strokeWidth="0.6" />
          ))}
        </g>
      ))}
      {/* Lichtkante über den Modulen */}
      <polygon points={pts([0.4, 0.3, H + 0.05], [L - 0.4, 0.3, H + 0.05], [L - 0.4, 0.9, H + 0.05], [0.4, 0.9, H + 0.05])} fill="url(#db-glanz)" opacity="0.5" />

      {/* Übergabestation */}
      <polygon points={pts([L + 0.7, W + 0.7, 0], [L + 1.5, W + 0.7, 0], [L + 1.5, W + 0.7, 0.9], [L + 0.7, W + 0.7, 0.9])} fill="#cfc9b4" />
      <polygon points={pts([L + 1.5, W + 0.1, 0], [L + 1.5, W + 0.7, 0], [L + 1.5, W + 0.7, 0.9], [L + 1.5, W + 0.1, 0.9])} fill="#a39b82" />
      <polygon points={pts([L + 0.7, W + 0.1, 0.9], [L + 1.5, W + 0.1, 0.9], [L + 1.5, W + 0.7, 0.9], [L + 0.7, W + 0.7, 0.9])} fill="#e9e5d6" />
    </svg>
  );
}

/** 20 Säulen: kumulierte Pacht je Jahr, Linie = Einmalzahlung (Barwert) */
function PachtSaeulen({ jahr, laufzeit, einmal }) {
  const max = jahr * laufzeit;
  const hEinmal = (einmal / max) * 100;
  return (
    <div className="relative mt-3 h-14" aria-hidden="true">
      {/* Säulen wachsen nacheinander – die Summe der Pacht baut sich Jahr für Jahr auf */}
      <div className="ov-sofort absolute inset-0 flex items-end gap-[3px]" style={{ "--ov-delay": "1150ms" }}>
        {Array.from({ length: laufzeit }, (_, i) => (
          <span key={i} className={cn("ov-balken-y flex-1 rounded-[2px]", i === laufzeit - 1 ? "bg-ov-500" : "bg-ov-200")} style={{ height: `${((i + 1) / laufzeit) * 100}%`, "--i": i * 0.6 }} />
        ))}
      </div>
      <span className="absolute inset-x-0 border-t border-dashed border-navy-500" style={{ bottom: `${hEinmal}%` }} />
    </div>
  );
}

const STATUS = [
  { t: "Dachcheck", s: "fertig" },
  { t: "Begehung & Statik", s: "fertig" },
  { t: "Angebot & Vertrag", s: "aktiv" },
  { t: "Netz & Genehmigung", s: "offen" },
];

export default function DachBuehne({ bsp, m2, laufzeit }) {
  const w = uebersetze(WORTE, spracheDerAnfrage());
  const f = w.f;
  return (
    <div className="relative">
      {/* Kopfzeile der Bühne */}
      <div className="mx-auto flex max-w-[440px] items-center justify-center gap-2 rounded-full bg-white/[0.06] px-3.5 py-1.5 text-[12.5px] text-white/75 ring-1 ring-inset ring-white/12 sm:absolute sm:left-4 sm:top-0 sm:mx-0 sm:max-w-none">
        <MapPin aria-hidden="true" className="h-3.5 w-3.5 shrink-0 text-ov-300" />
        {w.kopf(m2)}
      </div>

      <div className="relative mx-auto mt-2 max-w-[600px] sm:mt-6 lg:mt-8">
        <Halle titel={w.titel} />
      </div>

      {/* Karte: Pacht */}
      <div className="ov-hero-in relative mx-auto mt-2 w-full max-w-[300px] rounded-2xl bg-white p-4 text-ink-900 shadow-e4 ring-1 ring-black/5 sm:absolute sm:right-0 sm:top-6 sm:mt-0 sm:w-[260px] lg:-right-2 lg:top-4 xl:-right-6" style={{ "--ov-delay": "900ms" }}>
        <p className="flex items-center justify-between text-[11.5px] font-semibold uppercase tracking-[0.08em] text-ink-500">
          {w.pacht}
          <span className="rounded-full bg-sun-50 px-2 py-0.5 text-[10.5px] font-bold tracking-[0.06em] text-sun-700 ring-1 ring-sun-200">{w.beispiel}</span>
        </p>
        <p className="ov-num mt-2 font-display text-[30px] font-extrabold leading-none tracking-tight">
          {w.zahlen === "en-GB" ? (
            <Zaehler wert={Math.round(bsp.pachtJahr)} vor="€" dauer={1200} verzoegerung={1000} sprache="en-GB" />
          ) : (
            <Zaehler wert={Math.round(bsp.pachtJahr)} nach=" €" dauer={1200} verzoegerung={1000} />
          )}
          <span className="text-[14px] font-bold text-ink-500">{w.jahr}</span>
        </p>
        <p className="ov-num mt-1.5 text-[12.5px] text-ink-600">
          {w.leistung(f(bsp.kwp), f(bsp.kwhJahr1 / 1000))}
        </p>
        <PachtSaeulen jahr={bsp.pachtJahr} laufzeit={laufzeit} einmal={bsp.einmalzahlung} />
        <div className="ov-num mt-2 flex items-center justify-between text-[11.5px] text-ink-500">
          <span>{w.jahr1}</span>
          <span className="font-semibold text-ov-700">{w.summe(f(Math.round(bsp.wege.pacht.summe / 1000)), laufzeit)}</span>
        </div>
        <p className="mt-2 flex items-center gap-1.5 text-[11.5px] text-ink-500">
          <span aria-hidden="true" className="inline-block w-4 border-t border-dashed border-navy-500" />
          {w.einmal(f(Math.round(bsp.einmalzahlung / 1000)))}
        </p>
      </div>

      {/* Karte: Status im Portal */}
      <div className="ov-hero-in relative mx-auto mt-3 w-full max-w-[300px] rounded-2xl bg-navy-900/90 max-sm:hidden p-4 text-white shadow-e4 ring-1 ring-white/12 backdrop-blur sm:absolute sm:bottom-2 sm:left-0 sm:mt-0 sm:w-[250px] lg:-left-4 xl:-left-8" style={{ "--ov-delay": "1050ms" }}>
        <p className="text-[11.5px] font-semibold uppercase tracking-[0.08em] text-white/60">{w.portal}</p>
        <ol className="mt-3 space-y-2">
          {STATUS.map((x, i) => (
            <li key={x.t} className="flex items-center gap-2.5 text-[13px]">
              <span
                aria-hidden="true"
                className={cn(
                  "flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full",
                  x.s === "fertig" && "bg-ov-500 text-white",
                  x.s === "aktiv" && "bg-sun-300/20 ring-2 ring-sun-300",
                  x.s === "offen" && "ring-1 ring-white/30"
                )}
              >
                {x.s === "fertig" && <Check className="h-2.5 w-2.5" strokeWidth={3.5} />}
                {x.s === "aktiv" && <span className="h-1.5 w-1.5 rounded-full bg-sun-300" />}
              </span>
              <span className={x.s === "offen" ? "text-white/55" : "text-white/90"}>{w.status[i]}</span>
              <span className="sr-only">{w.zustand[x.s]}</span>
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}
