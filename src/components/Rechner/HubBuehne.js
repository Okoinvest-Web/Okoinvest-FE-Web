// Hero-Bühne des Hubs /rechner (Server-Komponente, dekorativ)
// Alle Zahlen stammen aus Beispielrechnungen mit den Standardannahmen der Rechner.
import { LineChart, MapPinned, HandCoins } from "lucide-react";
import { PACHT } from "@/lib/invest/markt";
import { spracheDerAnfrage } from "@/lib/land/seite";
import { formate } from "@/lib/sprache/zahlformat";

const TEXTE = {
  de: { rechner: "Solarpark-Renditerechner", beispiel: "Beispiel", leistung: "Leistung", irr: "Projekt-IRR", amort: "Amortisation", j: "J.", cf: "Kumulierter Cashflow · 30 Jahre", pacht: "Pachtrechner", acker: "Ackerpacht", solar: "Solarpacht (Mitte)", check: "Flächencheck", checkText: "Ampel, Anlagengröße, Pachtspanne" },
  en: { rechner: "Solar park return calculator", beispiel: "Example", leistung: "Capacity", irr: "Project IRR", amort: "Payback", j: "yrs", cf: "Cumulative cash flow · 30 years", pacht: "Lease calculator", acker: "Arable lease", solar: "Solar lease (mid)", check: "Land check", checkText: "Traffic light, plant size, lease range" },
};
import { VorschauCashflow } from "./ToolVorschau";

function Kennzahl({ label, wert, einheit, betont = false }) {
  return (
    <div className={betont ? "rounded-xl bg-navy-950 px-3 py-2.5 text-white" : "rounded-xl bg-sand-50 px-3 py-2.5 ring-1 ring-inset ring-ink-200/70"}>
      <p className={betont ? "text-[10.5px] font-semibold text-white/60" : "text-[10.5px] font-semibold text-ink-500"}>{label}</p>
      <p className={`ov-num mt-0.5 font-display text-[19px] font-extrabold leading-none tracking-tight ${betont ? "text-white" : "text-ink-900"}`}>
        {wert}
        <span className={betont ? "ml-0.5 text-[12px] font-bold text-ov-300" : "ml-0.5 text-[12px] font-bold text-ink-500"}>{einheit}</span>
      </p>
    </div>
  );
}

export default function HubBuehne({ park, cashflow }) {
  const sprache = spracheDerAnfrage();
  const t = TEXTE[sprache] || TEXTE.de;
  const f = formate(sprache);
  const { fmt } = f;
  const irr = park.projektIrr != null ? fmt(park.projektIrr * 100, 1) : "–";
  const amort = park.amortisation != null ? fmt(park.amortisation, 1) : "–";
  const maxPacht = PACHT.freiflaecheProHa.mittel;

  return (
    <div aria-hidden="true" className="relative mx-auto w-full max-w-[560px] select-none lg:mr-0">
      {/* Hauptkarte: Solarpark-Renditerechner */}
      <div className="relative rounded-[1.5rem] bg-white p-1.5 text-ink-900 shadow-e5 ring-1 ring-white/20">
        <div className="flex items-center justify-between gap-3 px-3.5 py-2.5">
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-[#ff6159]" />
            <span className="h-2 w-2 rounded-full bg-[#ffbd2e]" />
            <span className="h-2 w-2 rounded-full bg-[#28c840]" />
          </span>
          <span className="truncate text-[11.5px] font-medium text-ink-500">{t.rechner}</span>
          <span className="rounded-full bg-sun-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.08em] text-sun-700">{t.beispiel}</span>
        </div>
        <div className="rounded-[1.15rem] bg-white p-4 ring-1 ring-ink-200/70 sm:p-5">
          <div className="flex items-center gap-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-ov-50 text-ov-600 ring-1 ring-ov-100">
              <LineChart className="h-[18px] w-[18px]" />
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex items-baseline justify-between gap-2 text-[12px]">
                <span className="font-semibold text-ink-700">{t.leistung}</span>
                <span className="ov-num font-bold text-ink-900">10 MWp</span>
              </div>
              <div className="relative mt-2 h-1.5 rounded-full bg-ink-100">
                <div className="absolute inset-y-0 left-0 w-[10%] rounded-full bg-ov-500" />
                <div className="absolute top-1/2 h-4 w-4 -translate-y-1/2 rounded-full border-[3px] border-ov-500 bg-white shadow-e2" style={{ left: "calc(10% - 8px)" }} />
              </div>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-3 gap-2">
            <Kennzahl label={t.irr} wert={irr} einheit="%" betont />
            <Kennzahl label="LCOE" wert={fmt(park.lcoeCt, 2)} einheit="ct" />
            <Kennzahl label={t.amort} wert={amort} einheit={t.j} />
          </div>

          <div className="mt-4 rounded-xl bg-sand-50/70 p-3 ring-1 ring-inset ring-ink-200/60">
            <div className="mb-1.5 flex items-baseline justify-between text-[11px] text-ink-500">
              <span>{t.cf}</span>
              <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full border-2 border-sun-600 bg-white" />{t.amort}</span>
            </div>
            <VorschauCashflow werte={cashflow} />
          </div>
        </div>
      </div>

      {/* Schwebende Karte: Pachtrechner */}
      <div className="absolute -bottom-10 -left-4 hidden w-[236px] rounded-2xl bg-white p-4 text-ink-900 shadow-e4 ring-1 ring-ink-200/70 sm:block lg:-left-10">
        <div className="flex items-center gap-2">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-ov-50 text-ov-600"><HandCoins className="h-4 w-4" /></span>
          <span className="text-[12.5px] font-bold">{t.pacht}</span>
        </div>
        <div className="mt-3 space-y-2">
          {[
            { label: t.acker, wert: PACHT.ackerProHa, farbe: "bg-ink-300" },
            { label: t.solar, wert: PACHT.freiflaecheProHa.mittel, farbe: "bg-ov-500" },
          ].map((r) => (
            <div key={r.label}>
              <div className="mb-1 flex justify-between text-[10.5px] text-ink-500">
                <span>{r.label}</span>
                <span className="ov-num font-bold text-ink-800">{f.eur(r.wert, "/ha")}</span>
              </div>
              <div className="h-1.5 rounded-full bg-ink-100">
                <div className={`h-full rounded-full ${r.farbe}`} style={{ width: `${(r.wert / maxPacht) * 100}%` }} />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Schwebende Karte: Flächencheck */}
      <div className="absolute -left-4 -top-9 hidden items-center lg:-top-16 gap-3 rounded-2xl bg-white py-2.5 pl-2.5 pr-4 text-ink-900 shadow-e4 ring-1 ring-ink-200/70 sm:flex lg:-left-10">
        <span className="flex flex-col gap-1 rounded-lg bg-navy-950 p-1.5">
          <span className="h-2 w-2 rounded-full bg-white/20" />
          <span className="h-2 w-2 rounded-full bg-white/20" />
          <span className="h-2 w-2 rounded-full bg-ov-400" />
        </span>
        <span>
          <span className="flex items-center gap-1.5 text-[12.5px] font-bold"><MapPinned className="h-3.5 w-3.5 text-ov-600" />{t.check}</span>
          <span className="block text-[11px] text-ink-500">{t.checkText}</span>
        </span>
      </div>
    </div>
  );
}
