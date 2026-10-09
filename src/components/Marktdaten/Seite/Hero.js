// Hero der Seite /marktdaten – Text links, Datenkarte „Zuschlagswerte seit 2017“ rechts (echte Werte aus data/marktdaten)
import { ArrowDown, Database } from "lucide-react";
import Breadcrumbs from "@/components/ui/Breadcrumbs";
import Button from "@/components/ui/Button";
import { AUSSCHREIBUNGEN, LETZTE_AUSSCHREIBUNG, MAX_ZUSCHLAG, MIN_ZUSCHLAG } from "@/data/marktdaten";
import { pfad } from "@/lib/land";
import { spracheDerAnfrage } from "@/lib/land/seite";
import { formate } from "@/lib/sprache/zahlformat";

// Sprachmodell: Texte des Heros (Server-Komponente, Sprache aus der Anfrage)
const TEXTE = {
  de: {
    monate: ["Jan.", "Feb.", "März", "Apr.", "Mai", "Juni", "Juli", "Aug.", "Sep.", "Okt.", "Nov.", "Dez."],
    wissen: "Wissen",
    marktdaten: "Marktdaten",
    pill: (
      <>
        Marktdaten<span className="max-sm:hidden"> · Freiflächen-PV</span> DACH
      </>
    ),
    titel: (
      <>
        Marktdaten Solar: <span className="ov-text-gradient-light">Zuschläge, Marktwerte, Trends</span>
      </>
    ),
    lead: "Alle EEG-Ausschreibungen für Freiflächen-Solaranlagen seit 2017, der Marktwert von Solarstrom, die Capture Rate, negative Preise, Zubau und Pachtniveau – mit Quellen, als Diagramm und Tabelle.",
    zuZuschlaegen: "Zu den Zuschlägen",
    rendite: "Rendite rechnen",
    stand: (s) => `Datenstand ${s} · Börsenpreis live weiter unten`,
    kartenTitel: "Ø Zuschlagswert Solar je Gebotstermin",
    zuletzt: (k, n, j) => `zuletzt, ${k} · ${n} Termine seit ${j}`,
    ueber: (x) => `${x}-fach überzeichnet`,
    aria: (a, b, c, d, e, f) => `Verlauf des mengengewichteten Zuschlagswerts von ${a} ct/kWh (${b}) bis ${c} ct/kWh (${d}); Tiefstwert ${e} ct, Höchstwert ${f} ct.`,
    quelle: "Quelle: Bundesnetzagentur, mengengewichteter Durchschnitt je Gebotstermin",
  },
  en: {
    monate: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"],
    wissen: "Knowledge",
    marktdaten: "Market data",
    pill: (
      <>
        Market data<span className="max-sm:hidden"> · ground-mounted PV</span> DACH
      </>
    ),
    titel: (
      <>
        Solar market data: <span className="ov-text-gradient-light">awards, market values, trends</span>
      </>
    ),
    lead: "All EEG tenders for ground-mounted solar installations since 2017, the market value of solar power, the capture rate, negative prices, additions and lease levels – with sources, as charts and tables.",
    zuZuschlaegen: "Go to the awards",
    rendite: "Calculate returns",
    stand: (s) => `Data as of ${s} · live exchange price further down`,
    kartenTitel: "Ø solar award value per bidding date",
    zuletzt: (k, n, j) => `latest, ${k} · ${n} bidding dates since ${j}`,
    ueber: (x) => `${x}× oversubscribed`,
    aria: (a, b, c, d, e, f) => `Development of the volume-weighted award value from ${a} ct/kWh (${b}) to ${c} ct/kWh (${d}); lowest ${e} ct, highest ${f} ct.`,
    quelle: "Source: Bundesnetzagentur (Federal Network Agency), volume-weighted average per bidding date",
  },
};

export default function Hero({ standText }) {
  const t = TEXTE[spracheDerAnfrage()] || TEXTE.de;
  return (
    <section data-abschnitt="hero" aria-labelledby="hero-titel" className="ov-verlauf-nacht ov-noise relative isolate overflow-hidden text-white">
      <div aria-hidden="true" className="ov-grid-bg absolute inset-0 -z-10 opacity-50" />
      <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-px bg-gradient-to-r from-transparent via-ov-300/40 to-transparent" />
      <div aria-hidden="true" className="pointer-events-none absolute -left-40 -top-40 -z-10 h-[520px] w-[520px] rounded-full bg-ov-500/20 blur-[120px]" />

      <div className="ov-container pb-24 pt-6 sm:pt-8 md:pb-32 md:pt-10">
        <Breadcrumbs items={[{ name: t.wissen, href: "/ratgeber" }, { name: t.marktdaten }]} dark className="ov-hero-in mb-8 md:mb-12" />
        <div className="grid items-center gap-y-12 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:gap-x-14 xl:gap-x-20">
          <div className="max-w-[36rem]">
            <p className="ov-hero-in inline-flex items-center gap-2 rounded-full bg-white/[0.06] px-3.5 py-1.5 text-[12.5px] font-semibold uppercase tracking-[0.14em] text-ov-300 ring-1 ring-inset ring-white/15" style={{ "--ov-delay": "40ms" }}>
              <Database aria-hidden="true" className="h-3.5 w-3.5" />
              <span>{t.pill}</span>
            </p>
            <h1 id="hero-titel" className="ov-h1 ov-hero-in mt-6 text-balance md:mt-8" style={{ "--ov-delay": "100ms" }}>
              {t.titel}
            </h1>
            <p className="ov-lead ov-hero-in mt-5 text-pretty text-white/75 md:mt-6" style={{ "--ov-delay": "180ms" }}>
              {t.lead}
            </p>
            <div className="ov-hero-in mt-8 flex flex-col gap-3 sm:flex-row sm:items-center md:mt-10" style={{ "--ov-delay": "260ms" }}>
              <Button href="#ausschreibungen" size="lg" icon={ArrowDown} className="w-full sm:w-auto">{t.zuZuschlaegen}</Button>
              <Button href={pfad("/rechner/solarpark")} size="lg" variant="outlineLight" className="w-full sm:w-auto">{t.rendite}</Button>
            </div>
            <p className="ov-hero-in mt-4 text-[13px] text-white/70" style={{ "--ov-delay": "300ms" }}>{t.stand(standText)}</p>
          </div>

          <div className="ov-hero-in relative" style={{ "--ov-delay": "320ms" }}>
            <div aria-hidden="true" className="pointer-events-none absolute -inset-x-8 -inset-y-10 -z-10 rounded-full bg-[radial-gradient(closest-side,rgba(140,186,88,0.2),transparent_70%)] blur-2xl" />
            <ZuschlagKarte t={t} />
          </div>
        </div>
      </div>
    </section>
  );
}

function ZuschlagKarte({ t }) {
  const { fmt } = formate(spracheDerAnfrage());
  const kurz = (iso) => `${t.monate[Number(iso.slice(5, 7)) - 1]} ${iso.slice(0, 4)}`;
  const d = AUSSCHREIBUNGEN;
  const W = 520;
  const H = 210;
  const P = { l: 8, r: 8, t: 24, b: 26 };
  const lo = 3.5;
  const hi = 7.5;
  const x = (i) => P.l + (i / (d.length - 1)) * (W - P.l - P.r);
  const y = (v) => P.t + (1 - (v - lo) / (hi - lo)) * (H - P.t - P.b);
  const linie = d.map((a, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(a.mittel).toFixed(1)}`).join(" ");
  const flaeche = `${linie} L${x(d.length - 1).toFixed(1)},${H - P.b} L${x(0).toFixed(1)},${H - P.b} Z`;
  const iMin = d.indexOf(MIN_ZUSCHLAG);
  const iMax = d.indexOf(MAX_ZUSCHLAG);
  const L = LETZTE_AUSSCHREIBUNG;
  const jahre = [...new Set(d.map((a) => a.datum.slice(0, 4)))];

  return (
    <figure className="ov-glass rounded-[1.75rem] p-5 shadow-[0_30px_80px_-30px_rgba(0,0,0,0.6)] sm:p-7">
      <figcaption className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-[12px] font-semibold uppercase tracking-[0.14em] text-white/70">{t.kartenTitel}</p>
          <p className="mt-2 flex items-baseline gap-2">
            <span className="ov-kpi-l">{fmt(L.mittel, 2)}</span>
            <span className="text-[15px] font-bold text-white/70">ct/kWh</span>
          </p>
          <p className="mt-1 text-[13px] text-white/70">{t.zuletzt(kurz(L.datum), d.length, d[0].datum.slice(0, 4))}</p>
        </div>
        <span className="rounded-full bg-ov-400/15 px-3 py-1 text-[12px] font-semibold text-ov-200 ring-1 ring-inset ring-ov-300/30">{t.ueber(fmt(L.gebote / L.volumen, 1))}</span>
      </figcaption>

      <svg viewBox={`0 0 ${W} ${H}`} className="mt-5 h-auto w-full" role="img" aria-label={t.aria(fmt(d[0].mittel, 2), kurz(d[0].datum), fmt(L.mittel, 2), kurz(L.datum), fmt(MIN_ZUSCHLAG.mittel, 2), fmt(MAX_ZUSCHLAG.mittel, 2))}>
        <defs>
          <linearGradient id="md-hero-fl" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0" stopColor="#aed083" stopOpacity="0.4" />
            <stop offset="1" stopColor="#aed083" stopOpacity="0" />
          </linearGradient>
        </defs>
        {[4, 5, 6, 7].map((v) => (
          <g key={v}>
            <line x1={P.l} x2={W - P.r} y1={y(v)} y2={y(v)} stroke="rgba(255,255,255,0.08)" />
            <text x={W - P.r} y={y(v) - 4} textAnchor="end" fontSize="11" fill="rgba(255,255,255,0.55)">{v} ct</text>
          </g>
        ))}
        {/* Einlauf beim Laden (reines CSS, ohne JS sichtbar): Kurve zeichnet sich bis zum letzten Termin,
            Fläche und Marken (Hoch, Tief, zuletzt) folgen – die Aussage „von 2017 bis heute“ entsteht in Lesereihenfolge */}
        <g className="ov-sofort" style={{ "--ov-delay": "380ms" }}>
          <path d={flaeche} fill="url(#md-hero-fl)" className="ov-flaeche-ein" />
          <path d={linie} pathLength="1" fill="none" stroke="#aed083" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" className="ov-linie" />
        </g>
        <g className="ov-sofort"><g className="ov-flaeche-ein" style={{ animationDelay: "1250ms" }}>
          <circle cx={x(iMax)} cy={y(MAX_ZUSCHLAG.mittel)} r="4.5" fill="#ffc53d" />
          <text x={x(iMax)} y={y(MAX_ZUSCHLAG.mittel) - 10} textAnchor="middle" fontSize="12" fontWeight="700" fill="#ffd27a">{fmt(MAX_ZUSCHLAG.mittel, 2)}</text>
          <circle cx={x(iMin)} cy={y(MIN_ZUSCHLAG.mittel)} r="4.5" fill="#cde3b1" />
          <text x={x(iMin)} y={y(MIN_ZUSCHLAG.mittel) + 20} textAnchor="middle" fontSize="12" fontWeight="700" fill="#cde3b1">{fmt(MIN_ZUSCHLAG.mittel, 2)}</text>
          <circle cx={x(d.length - 1)} cy={y(L.mittel)} r="9" fill="#aed083" fillOpacity="0.25" />
          <circle cx={x(d.length - 1)} cy={y(L.mittel)} r="5" fill="#fff" stroke="#669933" strokeWidth="2.5" />
        </g></g>
        {jahre.filter((_, i) => i % 2 === 0).map((j) => {
          const i = d.findIndex((a) => a.datum.startsWith(j));
          return (
            <text key={j} x={x(i)} y={H - 6} textAnchor={i === 0 ? "start" : "middle"} fontSize="11" fill="rgba(255,255,255,0.6)">{j}</text>
          );
        })}
      </svg>
      <p className="mt-3 text-[12px] text-white/60">{t.quelle}</p>
    </figure>
  );
}
