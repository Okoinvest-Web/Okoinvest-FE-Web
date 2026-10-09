// Zwei Modelle: Co-Location am Solarpark (hell) und Stand-alone am Netzknoten (dunkel) – je mit Prinzipskizze
import { Network, Sun } from "lucide-react";
import Section from "@/components/ui/Section";
import Kopf from "@/components/Energie/Seite/Kopf";
import Reveal from "@/components/ui/Reveal";
import { cn } from "@/components/ui/cn";
import { landCode, landHinweisText, landHinweisTextEn } from "@/lib/land";
import { spracheDerAnfrage } from "@/lib/land/seite";
import { uebersetze } from "@/lib/sprache/woerterbuch";

const MODELLE = [
  {
    id: "colocation",
    icon: Sun,
    marke: "Modell A",
    titel: "Co-Location am Solarpark",
    kurz: "Ein Anschluss, zwei Anlagen",
    dunkel: false,
    fluss: [["Solarpark + Speicher", "teilen sich die Leistung"], ["Ein Anschluss", "mit Energiemanagement"], ["Netz", "Summe der Leistung > Anschlussleistung"]],
    punkte: [
      "nutzt den vorhandenen Netzanschluss mit – Überbauung statt neuer Anschlussleistung",
      "nimmt Mittagsspitzen auf, die sonst abgeregelt oder zu negativen Preisen verkauft würden",
      "speist abends ein, wenn Preise und Bedarf hoch sind",
      { nurDE: true, text: "Regeln für gemischt genutzte Speicher (Grünstrom und Netzstrom) wurden 2025 gelockert; die Umsetzung läuft" },
    ],
  },
  {
    id: "standalone",
    icon: Network,
    marke: "Modell B",
    titel: "Stand-alone am Netzknoten",
    kurz: "Eigener Anschluss, freie Fahrweise",
    dunkel: true,
    fluss: [["Speicher", "lädt und entlädt rund um die Uhr"], ["Eigener Netzanschluss", "oft knapp · Baukostenzuschuss"], ["Umspannwerk", "Börse und Regelenergie"]],
    punkte: [
      "frei in der Fahrweise: Arbitrage und Regelenergie rund um die Uhr",
      "skalierbar auf viele Megawattstunden am Umspannwerk",
      "eigener Netzanschluss nötig – oft knapp, mit langen Wartezeiten",
      { nurDE: "Regeln zu Anschlusskosten und Netzentgelten", text: "in der Regel Baukostenzuschuss; Netzentgeltbefreiung nach § 118 Abs. 6 EnWG bis 2029" },
    ],
  },
];

/** Sprachmodell: Texte der Modelle (en nur Texte, Listen je Index; nurDE-Themen englisch). */
const W = {
  de: {
    modelle: MODELLE,
    skizzeA: { solarpark: ["Solarpark", "mittags viel"], speicher: ["Speicher", "lädt / entlädt"], anschluss: ["Ein Anschluss", "+ Energiemanagement"], netz: "Netz", summe: "Summe der Leistung > Anschlussleistung" },
    skizzeB: { speicher: ["Speicher", "rund um die Uhr"], anschluss: ["Eigener", "Netzanschluss"], uw: ["Umspann-", "werk"], entladen: "entladen", laden: "laden", knapp: "oft knapp · Baukostenzuschuss" },
    giltDe: " (gilt für Deutschland)",
    hinweis: (l, thema) => landHinweisText(l, thema),
    eyebrow: "Zwei Modelle",
    titel: "Am Solarpark oder am Netzknoten.",
    lead: "Der Netzanschluss ist der knappste Faktor – er entscheidet, welches Modell sich rechnet.",
  },
  en: {
    modelle: [
      {
        marke: "Model A",
        titel: "Co-location at the solar park",
        kurz: "One connection, two installations",
        fluss: [["Solar park + storage", "share the capacity"], ["One connection", "with energy management"], ["Grid", "total capacity > connection capacity"]],
        punkte: [
          "shares the existing grid connection – overbuilding instead of new connection capacity",
          "absorbs midday peaks that would otherwise be curtailed or sold at negative prices",
          "feeds in during the evening, when prices and demand are high",
          { text: "Rules for mixed-use storage (green power and grid power) were relaxed in 2025; implementation is under way" },
        ],
      },
      {
        marke: "Model B",
        titel: "Stand-alone at the grid node",
        kurz: "Own connection, free operation",
        fluss: [["Storage", "charges and discharges around the clock"], ["Own grid connection", "often scarce · grid connection contribution"], ["Substation", "exchange and balancing power"]],
        punkte: [
          "free to operate: arbitrage and balancing power around the clock",
          "scalable to many megawatt hours at the substation",
          "own grid connection required – often scarce, with long waiting times",
          { nurDE: "Rules on connection costs and grid fees", text: "usually a grid connection contribution (Baukostenzuschuss); exemption from grid fees under § 118 (6) EnWG until 2029" },
        ],
      },
    ],
    skizzeA: { solarpark: ["Solar park", "lots at midday"], speicher: ["Storage", "charge / discharge"], anschluss: ["One connection", "+ energy management"], netz: "Grid", summe: "Total capacity > connection capacity" },
    skizzeB: { speicher: ["Storage", "around the clock"], anschluss: ["Own grid", "connection"], uw: ["Sub-", "station"], entladen: "discharge", laden: "charge", knapp: "often scarce · connection contribution" },
    giltDe: " (applies to Germany)",
    hinweis: (l, thema) => landHinweisTextEn(l, thema),
    eyebrow: "Two models",
    titel: "At the solar park or at the grid node.",
    lead: "The grid connection is the scarcest factor – it decides which model pays off.",
  },
};

/* Prinzipskizzen: Knoten + Flusslinien, Beschriftung im SVG (aria-hidden, Text steht daneben) */
function Knoten({ x, y, w = 92, label, sub, ton }) {
  const farben = {
    sonne: ["#fff7df", "#f5a70f", "#8a5a00"],
    gruen: ["#eef6e4", "#669933", "#37521e"],
    navy: ["#eef4fb", "#1f5aa1", "#03285a"],
    dunkelGruen: ["rgba(140,186,88,0.16)", "#8cba58", "#e6f1d8"],
    dunkelNavy: ["rgba(127,167,214,0.14)", "#7fa7d6", "#d9e6f5"],
    dunkelSonne: ["rgba(255,197,61,0.14)", "#ffc53d", "#fff1c9"],
  }[ton];
  return (
    <g>
      <rect x={x - w / 2} y={y - 24} width={w} height="48" rx="14" fill={farben[0]} stroke={farben[1]} strokeWidth="1.5" />
      <text x={x} y={sub ? y - 3 : y + 5} textAnchor="middle" fontSize="13" fontWeight="700" fill={farben[2]}>
        {label}
      </text>
      {sub && (
        <text x={x} y={y + 13} textAnchor="middle" fontSize="10.5" fill={farben[2]} opacity="0.75">
          {sub}
        </text>
      )}
    </g>
  );
}

function SkizzeColocation({ s }) {
  return (
    <svg viewBox="0 0 440 170" className="h-auto w-full" aria-hidden="true">
      <path d="M100 48 C 140 48, 140 85, 172 85" fill="none" stroke="#f5a70f" strokeWidth="2.5" strokeDasharray="5 5" />
      <path d="M100 122 C 140 122, 140 85, 172 85" fill="none" stroke="#669933" strokeWidth="2.5" />
      <path d="M296 85 L 344 85" fill="none" stroke="#1f5aa1" strokeWidth="2.5" />
            <Knoten x={56} y={48} w={88} label={s.solarpark[0]} sub={s.solarpark[1]} ton="sonne" />
      <Knoten x={56} y={122} w={88} label={s.speicher[0]} sub={s.speicher[1]} ton="gruen" />
      <Knoten x={234} y={85} w={124} label={s.anschluss[0]} sub={s.anschluss[1]} ton="gruen" />
      <Knoten x={392} y={85} w={84} label={s.netz} ton="navy" />
      <text x="234" y="148" textAnchor="middle" fontSize="11" fill="#558227" fontWeight="600">
        {s.summe}
      </text>
    </svg>
  );
}

function SkizzeStandalone({ s }) {
  return (
    <svg viewBox="0 0 440 170" className="h-auto w-full" aria-hidden="true">
      <path d="M104 72 L 182 72" fill="none" stroke="#8cba58" strokeWidth="2.5" />
      <path d="M182 98 L 104 98" fill="none" stroke="#7fa7d6" strokeWidth="2.5" />
      <path d="M176 66 l8 6 -8 6" fill="none" stroke="#8cba58" strokeWidth="2" />
      <path d="M110 92 l-8 6 8 6" fill="none" stroke="#7fa7d6" strokeWidth="2" />
      <path d="M276 85 L 330 85" fill="none" stroke="#7fa7d6" strokeWidth="2.5" />
      <Knoten x={56} y={85} w={92} label={s.speicher[0]} sub={s.speicher[1]} ton="dunkelGruen" />
      <Knoten x={230} y={85} w={92} label={s.anschluss[0]} sub={s.anschluss[1]} ton="dunkelSonne" />
      <Knoten x={384} y={85} w={104} label={s.uw[0]} sub={s.uw[1]} ton="dunkelNavy" />
      <text x="143" y="60" textAnchor="middle" fontSize="10.5" fill="#cde3b1">{s.entladen}</text>
      <text x="143" y="120" textAnchor="middle" fontSize="10.5" fill="#b2cbe9">{s.laden}</text>
      <text x="230" y="148" textAnchor="middle" fontSize="11" fill="#ffd873" fontWeight="600">
        {s.knapp}
      </text>
    </svg>
  );
}

/**
 * Stichpunkte je Land: { nurDE, text } gilt nur für Deutschland (gemeinsam mit Vermerk);
 * in AT/CH entfällt der Punkt (nurDE: true) oder zeigt den LandHinweis (nurDE: "Thema").
 */
function punkteFuer(punkte, l, w) {
  return punkte
    .map((p) => {
      if (typeof p === "string") return p;
      if (!l) return `${p.text}${w.giltDe}`;
      if (l === "DE") return p.text;
      return p.nurDE === true ? null : w.hinweis(l, p.nurDE);
    })
    .filter(Boolean);
}

export default function Modelle({ land = null }) {
  const l = landCode(land);
  const w = uebersetze(W, spracheDerAnfrage());
  return (
    <Section tone="white" space="lg" data-abschnitt="modelle" aria-labelledby="modelle-titel">
      <Kopf
        id="modelle-titel"
        eyebrow={w.eyebrow}
        titel={w.titel}
        lead={w.lead}
        className="mb-12 md:mb-16"
      />
      <div className="grid gap-5 lg:grid-cols-2 lg:gap-6">
        {w.modelle.map((m, i) => (
          <Reveal
            key={m.id}
            delay={i * 80}
            as="article"
            aria-labelledby={`modell-${m.id}`}
            className={cn(
              "relative flex flex-col overflow-hidden rounded-[2rem] p-6 sm:p-8 md:p-10",
              m.dunkel ? "ov-verlauf-nacht text-white shadow-e3" : "bg-sand-50 ring-1 ring-ink-200/70"
            )}
          >
            {m.dunkel && <div aria-hidden="true" className="ov-grid-bg pointer-events-none absolute inset-0 opacity-40 [mask-image:radial-gradient(70%_60%_at_80%_10%,#000,transparent)]" />}
            <div className="relative flex items-start justify-between gap-4">
              <div>
                <p className={cn("ov-overline", m.dunkel ? "text-ov-300" : "text-ov-700")}>{m.marke}</p>
                <h3 id={`modell-${m.id}`} className={cn("ov-h3 mt-2", m.dunkel ? "text-white" : "text-ink-900")}>
                  {m.titel}
                </h3>
                <p className={cn("mt-1 text-[15px]", m.dunkel ? "text-white/65" : "text-ink-600")}>{m.kurz}</p>
              </div>
              <span aria-hidden="true" className={cn("flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl", m.dunkel ? "bg-white/[0.08] text-ov-300 ring-1 ring-white/15" : "bg-white text-sun-500 shadow-e1 ring-1 ring-ink-200/70")}>
                <m.icon className="h-6 w-6" />
              </span>
            </div>

            <div className={cn("relative mt-7 rounded-2xl p-3 sm:p-4", m.dunkel ? "bg-white/[0.04] ring-1 ring-white/10" : "bg-white ring-1 ring-ink-200/60")}>
              <div className="hidden sm:block">{m.dunkel ? <SkizzeStandalone s={w.skizzeB} /> : <SkizzeColocation s={w.skizzeA} />}</div>
              <ol className="sm:hidden" aria-hidden="true">
                {m.fluss.map(([t, s], k) => (
                  <li key={k} className="relative flex items-start gap-3 pb-4 last:pb-0">
                    {k < m.fluss.length - 1 && <span className={cn("absolute bottom-0 left-[11px] top-7 w-0.5 rounded-full", m.dunkel ? "bg-ov-300/40" : "bg-ov-300")} />}
                    <span className={cn("mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] font-bold", m.dunkel ? "bg-ov-400/20 text-ov-200 ring-1 ring-ov-300/40" : "bg-ov-100 text-ov-800 ring-1 ring-ov-200")}>{k + 1}</span>
                    <div className="min-w-0">
                      <p className={cn("text-[15px] font-bold", m.dunkel ? "text-white" : "text-ink-900")}>{t}</p>
                      <p className={cn("text-[13px]", m.dunkel ? "text-white/60" : "text-ink-500")}>{s}</p>
                    </div>
                  </li>
                ))}
              </ol>
            </div>

            <ul className="relative mt-7 space-y-3.5">
              {punkteFuer(m.punkte, l, w).map((p) => (
                <li key={p} className={cn("flex gap-3 text-[15.5px] leading-relaxed", m.dunkel ? "text-white/80" : "text-ink-700")}>
                  <span aria-hidden="true" className={cn("mt-[0.6rem] h-1.5 w-1.5 shrink-0 rounded-full", m.dunkel ? "bg-ov-300" : "bg-ov-500")} />
                  {p}
                </li>
              ))}
            </ul>
          </Reveal>
        ))}
      </div>
    </Section>
  );
}
