// Hero-Bühne der Projektbörse: drei Ebenen erzählen den Ablauf
// öffentlicher Teaser → NDA per Klick → Datenraum. Reine Beispielansicht (fiktive Werte).
// Aufbau als Raster statt absoluter Positionen: links Teaser + NDA, rechts versetzt der Datenraum.
import { ArrowRight, Check, FileText, FolderLock, KeyRound, Lock, MapPin, Zap } from "lucide-react";
import TypIllustration from "@/components/Boerse/TypIllustration";
import { PHASEN } from "@/lib/invest/markt";
import { spracheDerAnfrage } from "@/lib/land/seite";
import { uebersetze } from "@/lib/sprache/woerterbuch";

const ORDNER = [["Flächensicherung", "Fläche"], ["Planungsrecht", "Planung"], ["Netzanschluss", "Netz"], ["Ertragsgutachten", "Gutachten"], ["Verträge & Pläne", "Verträge"]];

const TEXTE = {
  de: {
    ordner: ORDNER,
    baureif: "Baureif",
    beispiel: "Beispiel",
    typ: "Freiflächen-PV",
    region: "Region · Bundesland · Land",
    titel: "Solarpark, baureif, mit Netzzusage",
    leistung: "Leistung",
    mwp: "12,0 MWp",
    preis: "Preis",
    anfrage: "auf Anfrage",
    netzKurz: "Netzzusage liegt vor",
    netzLang: "Netzanschlusszusage liegt vor",
    nda: "Vertraulichkeitsvereinbarung",
    ndaPortal: "im Portal akzeptieren",
    ndaOk: "NDA akzeptiert",
    freigabe: "Freigabe folgt",
    datenraum: "Datenraum",
    nachNda: "nach NDA",
    protokoll: "Jeder Zugriff wird protokolliert",
    stufe1: "Teaser · öffentlich",
    stufe2: "NDA per Klick",
    stufe3: "Datenraum",
    erst: "Gemeinde, Flurstücke, Netzbetreiber und Unterlagen erst nach Freigabe",
  },
  en: {
    ordner: [["Land securing", "Land"], ["Planning law", "Planning"], ["Grid connection", "Grid"], ["Yield assessment", "Reports"], ["Contracts & plans", "Contracts"]],
    baureif: "Ready-to-build",
    beispiel: "Example",
    typ: "Ground-mounted PV",
    region: "Region · state · country",
    titel: "Solar park, ready-to-build, with grid commitment",
    leistung: "Capacity",
    mwp: "12.0 MWp",
    preis: "Price",
    anfrage: "on request",
    netzKurz: "Grid commitment in place",
    netzLang: "Grid connection commitment in place",
    nda: "Non-disclosure agreement",
    ndaPortal: "accept in the portal",
    ndaOk: "NDA accepted",
    freigabe: "Approval to follow",
    datenraum: "Data room",
    nachNda: "after NDA",
    protokoll: "Every access is logged",
    stufe1: "Teaser · public",
    stufe2: "NDA in one click",
    stufe3: "Data room",
    erst: "Municipality, plots, grid operator and documents only after approval",
  },
};
const RTB_INDEX = PHASEN.findIndex((p) => p.id === "rtb");

function Stufe({ n, children, className = "" }) {
  return (
    <p className={`mb-2.5 inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.1em] text-white/70 sm:text-[11.5px] ${className}`}>
      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-ov-300 text-[10.5px] font-extrabold tracking-normal text-navy-950">{n}</span>
      {children}
    </p>
  );
}

function Teaser({ t }) {
  return (
    <div className="overflow-hidden rounded-2xl bg-white text-ink-900 shadow-[0_40px_80px_-30px_rgba(0,8,30,0.8)] ring-1 ring-ink-200/70">
      <div className="relative h-[68px] sm:h-[96px]">
        <TypIllustration typ="freiflaeche" className="h-full w-full" />
        <span className="absolute left-2 top-2 inline-flex items-center gap-1.5 rounded-full bg-white/95 px-2 py-0.5 text-[10px] font-semibold shadow-sm ring-1 ring-ink-200/70 sm:left-3 sm:top-3 sm:text-[11px]">
          <span className="flex gap-[2px]">
            {PHASEN.map((x, i) => <span key={x.id} className={`h-2 w-[3px] rounded-full ${i <= RTB_INDEX ? "bg-ov-500" : "bg-ink-200"}`} />)}
          </span>
          {t.baureif}
        </span>
        <span className="absolute right-2 top-2 rounded-full bg-sun-300 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-[0.06em] text-navy-950 sm:right-3 sm:top-3">{t.beispiel}</span>
      </div>
      <div className="p-3 sm:p-4">
        <p className="text-[9.5px] font-semibold uppercase tracking-[0.12em] text-ov-700 sm:text-[10.5px]">{t.typ}</p>
        <p className="mt-1 flex items-center gap-1 text-[10px] text-ink-500 sm:text-[11px]"><MapPin className="h-3 w-3 shrink-0" /> <span className="truncate">{t.region}</span></p>
        <p className="mt-1.5 font-display text-[13px] font-bold leading-snug sm:text-[15px]">{t.titel}</p>
        <div className="mt-2.5 grid grid-cols-2 gap-2 border-t border-ink-100 pt-2.5 sm:mt-3 sm:pt-3">
          <div className="min-w-0">
            <p className="text-[9.5px] text-ink-500 sm:text-[10.5px]">{t.leistung}</p>
            <p className="ov-num font-display text-[13.5px] font-extrabold sm:text-[16px]">{t.mwp}</p>
          </div>
          <div className="min-w-0">
            <p className="text-[9.5px] text-ink-500 sm:text-[10.5px]">{t.preis}</p>
            <p className="font-display text-[12px] font-extrabold leading-tight sm:text-[16px]">{t.anfrage}</p>
          </div>
        </div>
        <p className="mt-2 flex items-center gap-1 text-[10px] text-ink-600 sm:text-[11px]"><Zap className="h-3 w-3 shrink-0 text-ov-600" /> <span className="truncate"><span className="sm:hidden">{t.netzKurz}</span><span className="max-sm:hidden">{t.netzLang}</span></span></p>
      </div>
    </div>
  );
}

function Nda({ t }) {
  return (
    <div className="rounded-2xl bg-white p-3.5 text-ink-900 shadow-e4 ring-1 ring-ink-200/70 sm:p-4">
      <div className="flex items-center gap-2.5">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-navy-950 text-ov-300"><KeyRound className="h-4 w-4" /></span>
        <div className="min-w-0">
          <p className="truncate text-[12.5px] font-bold">{t.nda}</p>
          <p className="truncate text-[11px] text-ink-500">{t.ndaPortal}</p>
        </div>
      </div>
      <div className="mt-3 flex items-center justify-between gap-2 rounded-xl bg-ov-50 px-3 py-2 ring-1 ring-inset ring-ov-200">
        <span className="flex items-center gap-1.5 text-[11.5px] font-semibold text-ov-800">
          <span className="flex h-4 w-4 items-center justify-center rounded-full bg-ov-600 text-white"><Check className="h-2.5 w-2.5" strokeWidth={3.5} /></span>
          {t.ndaOk}
        </span>
        <span className="text-[10.5px] text-ink-500">{t.freigabe}</span>
      </div>
    </div>
  );
}

function Datenraum({ t }) {
  return (
    <div className="overflow-hidden rounded-2xl bg-navy-900/90 shadow-e4 ring-1 ring-inset ring-white/10 backdrop-blur">
      <div className="flex items-center justify-between gap-2 border-b border-white/10 px-3 py-2.5 sm:px-4 sm:py-3">
        <span className="flex min-w-0 items-center gap-1.5 text-[11px] font-semibold text-white/90 sm:text-[12.5px]"><FolderLock className="h-3.5 w-3.5 shrink-0 text-ov-300 sm:h-4 sm:w-4" /> <span className="truncate">{t.datenraum}</span></span>
        <span className="shrink-0 rounded-full bg-white/10 px-2 py-0.5 text-[9px] max-sm:hidden font-bold uppercase tracking-[0.08em] text-white/75 sm:text-[10px]">{t.nachNda}</span>
      </div>
      <ul className="space-y-1.5 p-2.5 sm:space-y-2 sm:p-3.5">
        {t.ordner.map(([o, kurz], i) => (
          <li key={o} className="flex items-center gap-2 rounded-lg bg-white/[0.04] px-2 py-1.5 ring-1 ring-inset ring-white/[0.06] sm:px-3 sm:py-2.5">
            <FileText className="h-3.5 w-3.5 shrink-0 text-white/45" />
            <span className="min-w-0 flex-1 truncate text-[11px] text-white/85 sm:text-[12px]"><span className="sm:hidden">{kurz}</span><span className="max-sm:hidden">{o}</span></span>
            <span className="hidden h-1.5 rounded-full bg-white/15 sm:block" style={{ width: `${14 + ((i * 11) % 18)}%` }} />
            <Lock className="h-3 w-3 shrink-0 text-ov-300/80" />
          </li>
        ))}
      </ul>
      <p className="border-t border-white/10 px-3 py-2 text-[10px] text-white/55 sm:px-4 sm:text-[11px]">{t.protokoll}</p>
    </div>
  );
}

export default function ExposeBuehne() {
  const t = uebersetze(TEXTE, spracheDerAnfrage());
  return (
    <div className="relative mx-auto grid w-full max-w-[600px] select-none grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)] gap-3 sm:gap-5 lg:max-w-none" aria-hidden="true">
      <div className="min-w-0">
        <Stufe n="1">{t.stufe1}</Stufe>
        <Teaser t={t} />
        <div className="hidden sm:block">
          <div className="ml-8 h-8 border-l border-dashed border-ov-300/50" />
          <Stufe n="2">{t.stufe2}</Stufe>
          <Nda t={t} />
        </div>
      </div>
      <div className="relative min-w-0 pt-10 sm:pt-24">
        <Stufe n="3">{t.stufe3}</Stufe>
        <Datenraum t={t} />
        <p className="mt-4 hidden items-center gap-2 text-[12px] leading-snug text-white/60 sm:flex">
          <ArrowRight className="h-3.5 w-3.5 shrink-0 text-ov-300" /> {t.erst}
        </p>
      </div>
    </div>
  );
}
