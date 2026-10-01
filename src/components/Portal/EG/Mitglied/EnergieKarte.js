"use client";

// Energie-Übersicht des Mitglieds (WP6): Anteil Gemeinschaftsstrom, Ersparnis inkl. Netzentgelt (Schätzung), CO₂ und – bei
// Erzeugung – eingebrachter Strom mit Gutschrift. Zeiträume gestern / Monat / Jahr (Werte des Netzbetreibers kommen D+1).
// Daten: ptGemeinschaft().energie (WP3-Periodenwerte, Kennzahlen aus eg/dashboard.js). Ohne Daten: Leerzustand.

import { useState } from "react";
import { Leaf, PiggyBank, Sun, Zap } from "lucide-react";
import { cn } from "@/components/ui/cn";
import { ct, datumDe, eur, kg, kwh, pct } from "./format";

function Ring({ wert }) {
  const p = Math.max(0, Math.min(100, Number(wert) || 0));
  const r = 52;
  const u = 2 * Math.PI * r;
  return (
    <svg viewBox="0 0 128 128" className="h-36 w-36 shrink-0 md:h-40 md:w-40" role="img" aria-label={`Anteil Gemeinschaftsstrom ${Math.round(p)} Prozent`}>
      <circle cx="64" cy="64" r={r} fill="none" stroke="currentColor" strokeWidth="12" className="text-white/10" />
      <circle cx="64" cy="64" r={r} fill="none" stroke="currentColor" strokeWidth="12" strokeLinecap="round" className="text-ov-400 motion-safe:transition-[stroke-dashoffset] motion-safe:duration-700" strokeDasharray={u} strokeDashoffset={u * (1 - p / 100)} transform="rotate(-90 64 64)" />
      <text x="64" y="62" textAnchor="middle" className="fill-white font-display text-[26px] font-extrabold">{wert === null || wert === undefined ? "–" : `${Math.round(p)}%`}</text>
      <text x="64" y="82" textAnchor="middle" className="fill-white/60 text-[10px]">aus der Gemeinschaft</text>
    </svg>
  );
}

export default function EnergieKarte({ energie, hatErzeugung = false }) {
  const [zeit, setZeit] = useState("monat");
  if (!energie) return null;
  const w = energie.werte?.[zeit];
  const z = energie.zeitraeume?.[zeit];
  const leer = !energie.verfuegbar || !w?.hatDaten;
  return (
    <section aria-labelledby="eg-energie" className="overflow-hidden rounded-[2rem] bg-navy-950 text-white shadow-[0_40px_80px_-40px_rgba(3,18,43,0.6)]">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 px-5 py-4 md:px-7">
        <div>
          <h2 id="eg-energie" className="font-display text-[18px] font-bold">Ihr Gemeinschaftsstrom</h2>
          <p className="text-[12.5px] text-white/60">{z ? (z.von === z.bis ? datumDe(z.von) : `${datumDe(z.von)} – ${datumDe(z.bis)}`) : ""} · Werte des Netzbetreibers, Ersparnis geschätzt</p>
        </div>
        <div role="radiogroup" aria-label="Zeitraum" className="inline-flex rounded-full bg-white/10 p-1">
          {["gestern", "monat", "jahr"].map((k) => (
            <label key={k} className={cn("cursor-pointer rounded-full px-3.5 py-1.5 text-[12.5px] font-semibold transition-colors has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ov-400", zeit === k ? "bg-white text-ink-900" : "text-white/75 hover:text-white")}>
              <input type="radio" name="eg-zeitraum" value={k} checked={zeit === k} onChange={() => setZeit(k)} className="sr-only" />
              {energie.zeitraeume?.[k]?.label || k}
            </label>
          ))}
        </div>
      </div>
      {leer ? (
        <div className="flex flex-col items-center gap-3 px-6 py-12 text-center">
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10 text-ov-300"><Sun aria-hidden="true" className="h-6 w-6" /></span>
          <p className="font-display text-[17px] font-bold">{energie.verfuegbar ? "Für diesen Zeitraum liegen noch keine Werte vor" : "Ihre Energiedaten kommen bald"}</p>
          <p className="max-w-md text-[14px] leading-relaxed text-white/65">{energie.hinweis || "Der Netzbetreiber liefert die Viertelstundenwerte am Folgetag; nach dem Start kann die erste Lieferung bis zu 14 Tage dauern."}</p>
        </div>
      ) : (
        <div className="grid gap-6 p-5 md:grid-cols-[auto_1fr] md:items-center md:gap-8 md:p-7">
          <div className="flex items-center gap-5 md:block">
            <Ring wert={w.anteilPct} />
            <p className="max-w-[12rem] text-[13px] leading-relaxed text-white/70 md:mt-3 md:text-center">{kwh(w.eigendeckungKwh)} von {kwh(w.verbrauchKwh)} Verbrauch kamen aus der Gemeinschaft.</p>
          </div>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
            <Kachel icon={PiggyBank} label="Ersparnis (Schätzung)" wert={eur(w.ersparnis.gesamtEur)} zusatz={`Energie ${eur(w.ersparnis.energieEur)} · Netz ${eur(w.ersparnis.netzEur)}${w.ersparnis.abgabenEur ? ` · Abgabe ${eur(w.ersparnis.abgabenEur)}` : ""}`} hell />
            <Kachel icon={Zap} label="Gemeinschaftsstrom" wert={kwh(w.eigendeckungKwh)} zusatz={`zu ${ct(energie.preise?.bezugspreisCt)}/kWh statt ca. ${ct(energie.preise?.lieferantCt)}`} />
            <Kachel icon={Leaf} label="CO₂ (rechnerisch)" wert={kg(w.co2Kg)} zusatz="Strom aus Anlagen der Region" />
            {hatErzeugung && <Kachel icon={Sun} label="Eingebracht" wert={kwh(w.eingebrachtKwh)} zusatz={w.nutzungPct !== null ? `${pct(w.nutzungPct)} Ihrer Erzeugung genutzt` : ""} />}
            {hatErzeugung && <Kachel icon={PiggyBank} label="Gutschrift (Schätzung)" wert={eur(w.erloesEur)} zusatz="laut Einspeisepreis der Gemeinschaft" />}
          </div>
          <p className="text-[12px] leading-relaxed text-white/50 md:col-span-2">
            Netzentgelt: {energie.preise?.regel}{energie.preise?.regelStatus === "platzhalter" ? " (Arbeitshypothese)" : ""}. Die Reduktion zieht Ihr Netzbetreiber direkt auf der Netzrechnung ab; hier zeigen wir sie zur Orientierung.
            {!w.vollstaendig ? " Einzelne Werte fehlen noch – der Netzbetreiber liefert nach." : ""}
          </p>
        </div>
      )}
    </section>
  );
}

function Kachel({ icon: Icon, label, wert, zusatz, hell = false }) {
  return (
    <div className={cn("min-w-0 rounded-2xl p-4", hell ? "bg-ov-600" : "bg-white/5 ring-1 ring-white/10")}>
      <p className="flex items-center gap-1.5 text-[12.5px] font-medium text-white/80"><Icon aria-hidden="true" className="h-3.5 w-3.5" />{label}</p>
      <p className="ov-num mt-1 truncate font-display text-[24px] font-extrabold leading-tight tracking-tight">{wert}</p>
      {zusatz && <p className="mt-1 text-[12px] leading-snug text-white/70">{zusatz}</p>}
    </div>
  );
}
