// Hero-Bühne einer Regionalseite: Foto der Region im Rahmen, darüber zwei Datenkarten –
// Pacht-Beispiel (10 ha) und Einordnung des Ertrags innerhalb aller DACH-Regionen (PVGIS).
import Image from "next/image";
import { Coins, Sun } from "lucide-react";
import { REGIONEN } from "@/data/regionen";
import { fmt, fmtEur } from "@/lib/rechner/annahmen";
import { BEISPIEL_HA } from "./rechnung";
import { ERTRAG_MAX, ERTRAG_MIN, ERTRAG_STUFEN, ertragStufe } from "./ErtragsKarte";
import { spracheDerAnfrage } from "@/lib/land/seite";
import { fmtZahl } from "@/lib/sprache/format";

export function ertragRang(slug) {
  const liste = REGIONEN.filter((r) => r.ertrag?.kwhProKwp).sort((a, b) => b.ertrag.kwhProKwp - a.ertrag.kwhProKwp);
  const eigen = liste.find((r) => r.slug === slug);
  if (!eigen) return null;
  // gleicher Wert = gleicher Rang
  const rang = liste.findIndex((r) => r.ertrag.kwhProKwp === eigen.ertrag.kwhProKwp) + 1;
  return { rang, von: liste.length };
}

export default function RegionBuehne({ region: r, k }) {
  const en = spracheDerAnfrage() === "en";
  const fmt = (n, s = 0) => fmtZahl(n, s, en ? "en" : "de");
  const fmtEur = (n) => (en ? `€${fmtZahl(Math.round(n), 0, "en")}` : `${fmtZahl(Math.round(n), 0, "de")} €`);
  const rang = ertragRang(r.slug);
  const anteil = ((k.ertrag - ERTRAG_MIN) / Math.max(1, ERTRAG_MAX - ERTRAG_MIN)) * 100;
  const farbe = ERTRAG_STUFEN[ertragStufe(k.ertrag) ?? 0].fill;
  return (
    <div className="relative mx-auto w-full max-w-[600px] lg:max-w-none">
      <div className="relative aspect-[4/3] overflow-hidden rounded-[1.75rem] shadow-[0_40px_80px_-30px_rgba(0,8,30,0.8)] ring-1 ring-white/15 sm:aspect-[5/4] lg:mr-10">
        <Image src={r.bild} alt={en ? `Ground-mounted photovoltaics – illustrative image for ${r.name}` : `Freiflächen-Photovoltaik – Symbolbild für ${r.name}`} fill sizes="(min-width: 1024px) 560px, 100vw" className="object-cover" priority />
        <div aria-hidden="true" className="absolute inset-0 bg-gradient-to-t from-navy-950/70 via-navy-950/10 to-transparent" />
        <span className="absolute left-4 top-4 rounded-full bg-navy-950/70 px-3 py-1 text-[11.5px] font-semibold text-white ring-1 ring-inset ring-white/15 backdrop-blur">{en ? "Illustrative image" : "Symbolbild"}</span>
      </div>

      {/* Ertrag im DACH-Vergleich */}
      <div className="relative -mt-16 ml-4 w-[min(20rem,86%)] rounded-2xl bg-white p-4 text-ink-900 shadow-e4 ring-1 ring-ink-200/70 sm:-mt-24 sm:ml-6 sm:p-5 lg:absolute lg:-left-10 lg:bottom-10 lg:m-0">
        <p className="flex items-center gap-1.5 text-[11.5px] font-semibold uppercase tracking-[0.12em] text-ov-700"><Sun aria-hidden="true" className="h-3.5 w-3.5" /> {en ? "Yield" : "Ertrag"} {r.inName}</p>
        <p className="ov-num mt-1.5 font-display text-[26px] font-extrabold leading-none tracking-tight">{fmt(k.ertrag)}<span className="ml-1 text-[13px] font-bold text-ink-500">kWh/kWp</span></p>
        <div className="relative mt-4 h-2 rounded-full" style={{ background: `linear-gradient(90deg, ${ERTRAG_STUFEN.map((s) => s.fill).join(", ")})` }} role="img" aria-label={en ? `Position between ${fmt(ERTRAG_MIN)} and ${fmt(ERTRAG_MAX)} kWh/kWp` : `Einordnung zwischen ${fmt(ERTRAG_MIN)} und ${fmt(ERTRAG_MAX)} kWh/kWp`}>
          <span aria-hidden="true" className="absolute top-1/2 h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full ring-[3px] ring-white" style={{ left: `${Math.min(100, Math.max(0, anteil))}%`, background: farbe, boxShadow: "0 2px 6px rgba(3,18,43,0.35)" }} />
        </div>
        <div className="ov-num mt-1.5 flex justify-between text-[11px] text-ink-500"><span>{fmt(ERTRAG_MIN)}</span><span>{fmt(ERTRAG_MAX)}</span></div>
        {rang && (en ? <p className="mt-2 text-[12.5px] text-ink-600">Rank <strong className="text-ink-900">{rang.rang}</strong> of {rang.von} regions (PVGIS)</p> : <p className="mt-2 text-[12.5px] text-ink-600">Rang <strong className="text-ink-900">{rang.rang}</strong> von {rang.von} Regionen (PVGIS)</p>)}
      </div>

      {/* Pacht-Beispiel */}
      <div className="absolute right-0 top-6 hidden w-[15.5rem] rounded-2xl bg-navy-900/90 p-4 text-white shadow-e4 ring-1 ring-inset ring-white/10 backdrop-blur sm:block lg:-right-2 lg:top-10">
        <p className="flex items-center gap-1.5 text-[11.5px] font-semibold uppercase tracking-[0.12em] text-ov-300"><Coins aria-hidden="true" className="h-3.5 w-3.5" /> {en ? "Example" : "Beispiel"} {BEISPIEL_HA} ha</p>
        {k.pachtGesperrt ? (
          <>
            <p className="mt-1.5 font-display text-[17px] font-extrabold leading-tight">{en ? `around ${fmt(k.mwp, 1)} MWp solar park` : `rund ${fmt(k.mwp, 1)} MWp Solarpark`}</p>
            <p className="mt-1 text-[12px] leading-snug text-white/65">
              {en ? `Lease values: calculation logic for ${k.land === "CH" ? "Switzerland" : "Austria"} in preparation` : `Pachtwerte: Rechenlogik für ${k.land === "CH" ? "die Schweiz" : "Österreich"} in Vorbereitung`}
            </p>
          </>
        ) : (
          <>
            <p className="ov-num mt-1.5 font-display text-[19px] font-extrabold leading-tight">{fmtEur(k.pachtJahr.min)}–{fmtEur(k.pachtJahr.max)}<span className="text-[12px] font-bold text-white/60">{en ? " / year" : " / Jahr"}</span></p>
            <p className="mt-1 text-[12px] leading-snug text-white/65">{en ? `Lease range for a solar park of around ${fmt(k.mwp, 1)} MWp` : `Pachtspanne für rund ${fmt(k.mwp, 1)} MWp Solarpark`}</p>
          </>
        )}
      </div>
    </div>
  );
}
