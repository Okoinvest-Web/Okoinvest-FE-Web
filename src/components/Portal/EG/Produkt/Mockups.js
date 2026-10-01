// Stilisierte Produkt-Screens der EG-Plattform für die öffentliche Produktseite /energiegemeinschaften/software (T6).
// Reine Darstellung mit fiktiven, als Beispiel gekennzeichneten Werten – Aufbau wie im echten Portal (/portal/eg/[id],
// /portal/eg/[id]/abrechnung). Server-Komponenten; Bewegung nur über Design-System-Klassen bzw. EnergieFluss
// (transform/opacity, unter prefers-reduced-motion still). Inhalte sind für Screenreader als ein Bild mit Beschreibung
// zusammengefasst (role="img" + aria-label, Innenleben aria-hidden).

import { BadgeCheck, Check, FileCheck2, GitCompareArrows, PiggyBank, Send, Sun, UsersRound } from "lucide-react";
import { cn } from "@/components/ui/cn";
import FortschrittsRing from "@/components/ui/FortschrittsRing";
import EnergieFluss from "@/components/Portal/EG/Mitglied/EnergieFluss";

/** Browserfenster-Rahmen (ohne echte Adresse) */
export function FensterRahmen({ titel = "Plattform", className, children }) {
  return (
    <div className={cn("overflow-hidden rounded-2xl bg-white shadow-e5 ring-1 ring-ink-200/80", className)}>
      <div className="flex items-center gap-2 border-b border-ink-100 bg-ink-50 px-3.5 py-2.5">
        <span className="flex gap-1.5" aria-hidden="true">
          <span className="h-2.5 w-2.5 rounded-full bg-ink-200" />
          <span className="h-2.5 w-2.5 rounded-full bg-ink-200" />
          <span className="h-2.5 w-2.5 rounded-full bg-ink-200" />
        </span>
        <span className="mx-auto truncate rounded-full bg-white px-3 py-0.5 text-[11px] font-medium text-ink-500 ring-1 ring-ink-200">{titel}</span>
        <span className="w-10" aria-hidden="true" />
      </div>
      {children}
    </div>
  );
}

/** Telefon-Rahmen */
export function TelefonRahmen({ className, children }) {
  return (
    <div className={cn("rounded-[2.4rem] bg-navy-950 p-2 shadow-e5 ring-1 ring-white/10", className)}>
      <div className="relative overflow-hidden rounded-[1.9rem]">
        <span aria-hidden="true" className="absolute left-1/2 top-2 z-10 h-1.5 w-16 -translate-x-1/2 rounded-full bg-white/15" />
        {children}
      </div>
    </div>
  );
}

const GRUEN = [
  { von: 10, bis: 15, stark: true },
  { von: 8.5, bis: 10, stark: false },
];

/** Mitglied: „Energie heute“ auf dem Handy */
export function MockEnergieHeute({ className }) {
  return (
    <TelefonRahmen className={className}>
      <div className="ov-verlauf-nacht px-4 pb-5 pt-8 text-white">
        <p className="flex items-center gap-1.5 text-[10.5px] font-bold uppercase tracking-[0.16em] text-ov-300"><span className="ov-live-punkt" />Energie heute</p>
        <p className="mt-1 font-display text-[17px] font-extrabold leading-tight">Jetzt viel Gemeinschaftsstrom</p>
        <p className="mt-0.5 text-[11.5px] text-white/75">laut Prognose bis 15:00 Uhr</p>
        <div className="mt-4">
          <EnergieFluss gemeinschaftName="Sonnenland" ausGemeinschaft="212 kWh" aktiv kompakt />
        </div>
        <div className="mt-4 rounded-2xl bg-white/5 p-3.5 ring-1 ring-white/10">
          <p className="flex items-center gap-1.5 text-[11px] text-white/75"><PiggyBank className="h-3.5 w-3.5 text-ov-300" />Ihre Ersparnis · dieses Jahr</p>
          <p className="ov-num font-display text-[30px] font-extrabold leading-tight tracking-tight">71,40<span className="ml-1 text-[16px] opacity-70">€</span></p>
          <div className="mt-2 flex items-center gap-3 border-t border-white/10 pt-2.5">
            <FortschrittsRing wert={38} groesse={46} staerke={5} ton="hell" dunkel sofort label="38 Prozent aus der Gemeinschaft" />
            <p className="text-[11px] leading-snug text-white/75">1.180 kWh kamen aus der Gemeinschaft</p>
          </div>
        </div>
        <div className="mt-3">
          <p className="mb-1 flex items-center gap-1 text-[11px] font-semibold text-white/85"><Sun className="h-3 w-3 text-sun-300" />Grüne Stunden heute</p>
          <div className="relative h-4 rounded-full bg-white/10">
            {GRUEN.map((g) => <span key={g.von} className={cn("absolute inset-y-0.5 rounded-full", g.stark ? "bg-ov-300" : "bg-ov-500")} style={{ left: `${(g.von / 24) * 100}%`, width: `${((g.bis - g.von) / 24) * 100}%` }} />)}
            <span className="absolute -inset-y-0.5 w-0.5 rounded-full bg-white" style={{ left: "52%" }} />
          </div>
        </div>
      </div>
    </TelefonRahmen>
  );
}

/** Mitglied: Zustimmung beim Netzbetreiber mit Countdown-Ring und Anleitung */
export function MockZustimmung({ className }) {
  const schritte = ["Kundenportal öffnen", "Bereich „Energiegemeinschaften“ wählen", "Anfrage der Gemeinschaft finden", "Teilnahmefaktor prüfen", "Zustimmen – fertig"];
  return (
    <div className={cn("overflow-hidden rounded-3xl bg-white shadow-e4 ring-1 ring-ink-200/70", className)}>
      <div className="flex items-center gap-4 bg-ov-50 p-5 ring-1 ring-ov-200">
        <FortschrittsRing wert={6} max={14} groesse={78} staerke={8} ton="marke" label="Noch 6 Tage für die Zustimmung">
          <span className="flex flex-col items-center leading-none"><span className="ov-num font-display text-[24px] font-extrabold text-ink-900">6</span><span className="text-[10.5px] font-semibold text-ink-600">Tage</span></span>
        </FortschrittsRing>
        <div className="min-w-0">
          <p className="font-display text-[16px] font-bold leading-snug text-ink-900">Jetzt zustimmen – damit „Sonnenland“ Sie versorgen kann</p>
          <p className="mt-0.5 text-[12.5px] text-ink-600">Frist bis 14.10. · Anleitung für Ihren Netzbetreiber</p>
        </div>
      </div>
      <ol className="space-y-2.5 p-5">
        {schritte.map((s, i) => (
          <li key={s} className="flex items-center gap-3 text-[13px] text-ink-800">
            <span className={cn("flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] font-bold", i < 2 ? "bg-ov-600 text-white" : "bg-navy-950 text-white")}>{i < 2 ? <Check className="h-3.5 w-3.5" strokeWidth={3} /> : i + 1}</span>
            <span className={i < 2 ? "text-ink-500 line-through decoration-ink-300" : ""}>{s}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}

const PIPELINE = ["Angelegt", "Vorschau", "1. Freigabe", "2. Freigabe", "Versendet", "Abgeschlossen"];

/** Kassier: Abrechnungsperiode mit Status-Pipeline, Vergleich zum Vormonat und Vier-Augen-Freigabe */
export function MockKassier({ className, kompakt = false }) {
  const stand = 3;
  return (
    <FensterRahmen titel="Abrechnung · Oktober" className={className}>
      <div className="space-y-4 p-4 md:p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="font-display text-[15px] font-bold text-ink-900">Monat 01.10. – 31.10.</p>
          <span className="inline-flex items-center gap-1 rounded-full bg-navy-50 px-2.5 py-0.5 text-[11px] font-semibold text-navy-700 ring-1 ring-navy-100"><UsersRound className="h-3 w-3" />Vier-Augen-Prinzip</span>
        </div>
        <ol className="flex items-start">
          {PIPELINE.map((s, j) => (
            <li key={s} className="relative flex min-w-0 flex-1 flex-col items-center text-center">
              {j > 0 && <span className={cn("absolute right-1/2 top-[11px] h-0.5 w-full", j <= stand ? "bg-ov-500" : "bg-ink-200")} />}
              <span className={cn("relative z-10 flex h-6 w-6 items-center justify-center rounded-full text-[10.5px] font-bold", j < stand ? "bg-ov-600 text-white" : j === stand ? "bg-white text-navy-700 ring-2 ring-navy-700" : "bg-white text-ink-500 ring-1 ring-ink-200")}>
                {j < stand ? <Check className="h-3 w-3" strokeWidth={3} /> : j + 1}
              </span>
              <span className={cn("mt-1 hidden text-[10px] leading-tight sm:block", j === stand ? "font-semibold text-ink-900" : "text-ink-500")}>{s}</span>
            </li>
          ))}
        </ol>
        <div className="grid grid-cols-3 gap-2">
          {[["Rechnungen", "58", "4.212,80 €"], ["Gutschriften", "14", "1.906,30 €"], ["Vorteil Mitglieder", "", "1.084,10 €"]].map(([l, n, w]) => (
            <div key={l} className="rounded-xl bg-sand-50 p-2.5 ring-1 ring-sand-200">
              <p className="truncate text-[10.5px] text-ink-500">{l}</p>
              <p className="ov-num truncate text-[13px] font-bold text-ink-900">{n ? `${n} · ` : ""}{w}</p>
            </div>
          ))}
        </div>
        {!kompakt && (
          <div className="rounded-xl ring-1 ring-ink-200/70">
            <p className="flex items-center gap-1.5 border-b border-ink-100 px-3 py-2 text-[11.5px] font-semibold text-ink-800"><GitCompareArrows className="h-3.5 w-3.5 text-ov-600" />Veränderung zum September · 3 auffällig</p>
            {[["Hofer, Landwirt", "+18 %", "neuer Zählpunkt"], ["Gemeindeamt", "−12 %", "Saison"], ["Familie Brandl", "neu dabei", ""]].map(([n, d, g]) => (
              <p key={n} className="flex items-center justify-between gap-2 border-t border-ink-100 px-3 py-1.5 text-[11.5px] first-of-type:border-t-0">
                <span className="truncate text-ink-700">{n}{g ? <span className="text-ink-500"> · {g}</span> : null}</span>
                <span className="shrink-0 rounded-full bg-sun-50 px-2 py-0.5 font-semibold text-sun-700 ring-1 ring-sun-200">{d}</span>
              </p>
            ))}
          </div>
        )}
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1 rounded-full bg-ov-50 px-2.5 py-1 text-[11px] font-semibold text-ov-800 ring-1 ring-ov-200"><BadgeCheck className="h-3 w-3" />1. Auge · Kassier</span>
          <span className="inline-flex items-center gap-1 rounded-full bg-navy-700 px-2.5 py-1 text-[11px] font-semibold text-white"><BadgeCheck className="h-3 w-3" />2. Auge · Vorstand</span>
          <span className="ml-auto inline-flex h-8 items-center gap-1.5 rounded-full bg-ov-600 px-3.5 text-[11.5px] font-semibold text-white shadow-gruen"><Send className="h-3.5 w-3.5" />72 Belege versenden</span>
        </div>
      </div>
    </FensterRahmen>
  );
}

/** Abschlussmeldung des Kassier-Ablaufs */
export function MockAbschluss({ className }) {
  return (
    <div className={cn("flex items-center gap-3 rounded-2xl bg-white p-3.5 shadow-e4 ring-1 ring-ink-200/70", className)}>
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-ov-600 text-white"><FileCheck2 className="h-5 w-5" /></span>
      <p className="text-[12.5px] leading-snug text-ink-700"><strong className="block text-[13.5px] text-ink-900">72 Belege versendet</strong>Lastschrift am 05.11. – alles erledigt für Oktober</p>
    </div>
  );
}

/** Hero-Komposition: Kassier-Fenster hinten, Handy vorn, schwebende Statusmeldungen */
export function HeroKomposition({ className }) {
  return (
    <div
      role="img"
      aria-label="Beispielansicht der Plattform mit fiktiven Werten: Mitglied sieht auf dem Handy den Energiefluss und 71,40 € Ersparnis, der Kassier gibt die Oktober-Abrechnung im Vier-Augen-Prinzip frei."
      className={cn("relative mx-auto w-full max-w-[680px]", className)}
    >
      <div aria-hidden="true" className="relative">
        <div className="ov-hero-in pr-[24%] sm:pr-[26%]" style={{ "--ov-delay": "200ms" }}>
          <MockKassier kompakt />
        </div>
        <div className="ov-hero-in absolute -bottom-10 right-0 w-[46%] max-w-[250px] sm:-bottom-14 sm:w-[40%]" style={{ "--ov-delay": "340ms" }}>
          <div className="animate-ov-float">
            <MockEnergieHeute />
          </div>
        </div>
        <div className="ov-hero-in absolute -bottom-16 left-2 hidden w-[52%] sm:block" style={{ "--ov-delay": "480ms" }}>
          <MockAbschluss />
        </div>
      </div>
    </div>
  );
}
