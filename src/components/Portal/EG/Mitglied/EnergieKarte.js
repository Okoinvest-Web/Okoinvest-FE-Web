"use client";

// „Energie heute“ – Energie-Übersicht des Mitglieds (WP6, Darstellung T6/Design-System 2.0):
// Jetzt-Zustand aus der Prognose (grüne Stunde läuft / nächste grüne Stunde), animierter Energiefluss Sonne → Gemeinschaft
// → Zuhause, Ersparnis-Zähler, Anteil Gemeinschaftsstrom als Ring, Kennzahlen für gestern / Monat / Jahr
// (Werte des Netzbetreibers kommen D+1). Daten: ptGemeinschaft().energie (WP3-Periodenwerte, Kennzahlen aus
// eg/dashboard.js) und .stunden (grüne Stunden). Ohne Daten: Leerzustand. Keine Rechenlogik hier – nur Darstellung.

import { useState } from "react";
import { Leaf, PiggyBank, Sun, Zap } from "lucide-react";
import { cn } from "@/components/ui/cn";
import CountUp from "@/components/ui/CountUp";
import FortschrittsRing from "@/components/ui/FortschrittsRing";
import { mitUebergang } from "@/components/ui/motion";
import EnergieFluss, { jetztText, useJetzt } from "./EnergieFluss";
import { KeineMesswerte } from "@/components/illustrationen";
import { ct, datumDe, eur, kg, kwh, pct } from "./format";

const ZEITEN = ["gestern", "monat", "jahr"];

export default function EnergieKarte({ energie, hatErzeugung = false, stunden = null, heute = "", gemeinschaftName = "" }) {
  const [zeit, setZeit] = useState("monat");
  const jetzt = useJetzt(stunden, heute);
  if (!energie) return null;
  const w = energie.werte?.[zeit];
  const z = energie.zeitraeume?.[zeit];
  const leer = !energie.verfuegbar || !w?.hatDaten;
  const zeitraumText = z ? (z.von === z.bis ? datumDe(z.von) : `${datumDe(z.von)} – ${datumDe(z.bis)}`) : "";
  const jt = jetztText(jetzt);
  const ersparnis = Number(w?.ersparnis?.gesamtEur);
  const anteil = w?.anteilPct;

  return (
    <section aria-labelledby="eg-energie" className="ov-verlauf-nacht relative overflow-hidden rounded-[2rem] text-white shadow-e3">
      {/* Kopf: Jetzt-Zustand + Zeitraum */}
      <div className="flex flex-wrap items-start justify-between gap-4 px-5 pt-5 md:px-7 md:pt-7">
        <div className="min-w-0">
          <p className="ov-overline flex items-center gap-2 text-ov-300">
            {jetzt.status === "gruen" ? <span className="ov-live-punkt" aria-hidden="true" /> : <Sun aria-hidden="true" className="h-3.5 w-3.5" />}
            Energie heute
          </p>
          <h2 id="eg-energie" className="mt-1.5 font-display text-[22px] font-extrabold leading-tight tracking-tight md:text-[26px]">
            {jt.titel}
          </h2>
          <p className="mt-1 max-w-xl text-[14px] leading-relaxed text-white/75" aria-live="polite">{jt.text}</p>
        </div>
        <div role="radiogroup" aria-label="Zeitraum der Kennzahlen" className="inline-flex shrink-0 rounded-full bg-white/10 p-1 ring-1 ring-white/10">
          {ZEITEN.map((k) => (
            <label
              key={k}
              className={cn(
                "flex min-h-9 cursor-pointer items-center rounded-full px-3.5 text-[12.5px] font-semibold transition-colors has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ov-300",
                zeit === k ? "bg-white text-ink-900 shadow-e2" : "text-white/75 hover:text-white"
              )}
            >
              <input type="radio" name="eg-zeitraum" value={k} checked={zeit === k} onChange={() => mitUebergang(() => setZeit(k))} className="sr-only" />
              {energie.zeitraeume?.[k]?.label || k}
            </label>
          ))}
        </div>
      </div>

      {/* Energiefluss */}
      <div className="px-5 pb-2 pt-6 md:px-10 md:pt-8">
        <EnergieFluss
          gemeinschaftName={gemeinschaftName || "Gemeinschaft"}
          ausGemeinschaft={!leer ? kwh(w.eigendeckungKwh) : ""}
          eingebracht={!leer && hatErzeugung && Number(w.eingebrachtKwh) > 0 ? kwh(w.eingebrachtKwh) : ""}
          aktiv={jetzt.status === "gruen" || jetzt.status === "unbekannt"}
          zeitraumText={zeitraumText}
        />
      </div>

      {leer ? (
        <div className="mx-5 mb-5 mt-4 flex flex-col items-center gap-3 rounded-3xl bg-white/5 px-6 py-10 text-center ring-1 ring-white/10 md:mx-7 md:mb-7">
          <KeineMesswerte ton="dunkel" className="w-40" />
          <p className="font-display text-[17px] font-bold">{energie.verfuegbar ? "Für diesen Zeitraum liegen noch keine Werte vor" : "Ihre Energiedaten kommen bald"}</p>
          <p className="max-w-md text-[14px] leading-relaxed text-white/75">{energie.hinweis || "Der Netzbetreiber liefert die Viertelstundenwerte am Folgetag; nach dem Start kann die erste Lieferung bis zu 14 Tage dauern."}</p>
        </div>
      ) : (
        <div key={zeit} className="ov-tab-panel grid gap-4 p-5 md:grid-cols-[minmax(0,1.1fr)_minmax(0,1.6fr)] md:gap-5 md:p-7">
          {/* Ersparnis – die eine laute Zahl */}
          <div className="ov-flaeche-dunkel flex flex-col justify-between gap-5 p-5 md:p-6">
            <div>
              <p className="flex items-center gap-1.5 text-[13px] font-medium text-white/75"><PiggyBank aria-hidden="true" className="h-4 w-4 text-ov-300" />Ihre Ersparnis · {energie.zeitraeume?.[zeit]?.label || zeit}</p>
              <p className="ov-kpi-l mt-1 text-white">
                {Number.isFinite(ersparnis) ? <CountUp value={ersparnis} decimals={2} /> : "–"}
                <span className="ov-einheit"> €</span>
              </p>
              <p className="mt-1 text-[12.5px] leading-snug text-white/70">
                Schätzung: Energie {eur(w.ersparnis.energieEur)} · Netz {eur(w.ersparnis.netzEur)}
                {w.ersparnis.abgabenEur ? ` · Abgabe ${eur(w.ersparnis.abgabenEur)}` : ""}
              </p>
            </div>
            <div className="flex items-center gap-4 border-t border-white/10 pt-4">
              <FortschrittsRing wert={Math.max(0, Math.min(100, Number(anteil) || 0))} groesse={76} staerke={8} ton="hell" dunkel label={`Anteil Gemeinschaftsstrom ${anteil === null || anteil === undefined ? "unbekannt" : `${Math.round(anteil)} Prozent`}`} />
              <p className="min-w-0 text-[13px] leading-relaxed text-white/75">
                <strong className="font-semibold text-white">{kwh(w.eigendeckungKwh)}</strong> von {kwh(w.verbrauchKwh)} Verbrauch kamen aus der Gemeinschaft.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 md:gap-4">
            <Kachel icon={Zap} label="Gemeinschaftsstrom" wert={kwh(w.eigendeckungKwh)} zusatz={`zu ${ct(energie.preise?.bezugspreisCt)}/kWh statt ca. ${ct(energie.preise?.lieferantCt)}`} />
            <Kachel icon={Leaf} label="CO₂ (rechnerisch)" wert={kg(w.co2Kg)} zusatz="Strom aus Anlagen der Region" />
            {hatErzeugung && <Kachel icon={Sun} label="Eingebracht" wert={kwh(w.eingebrachtKwh)} zusatz={w.nutzungPct !== null ? `${pct(w.nutzungPct)} Ihrer Erzeugung genutzt` : ""} />}
            {hatErzeugung && <Kachel icon={PiggyBank} label="Gutschrift (Schätzung)" wert={eur(w.erloesEur)} zusatz="laut Einspeisepreis der Gemeinschaft" />}
            {!hatErzeugung && <Kachel icon={Sun} label="Grüne Stunden heute" wert={gruenText(stunden, heute)} zusatz="Zeiten mit viel Gemeinschaftsstrom" breit />}
          </div>

          <p className="text-[12.5px] leading-relaxed text-white/70 md:col-span-2">
            {zeitraumText ? `${zeitraumText} · ` : ""}Werte des Netzbetreibers. Netzentgelt: {energie.preise?.regel}
            {energie.preise?.regelStatus === "platzhalter" ? " (Arbeitshypothese)" : ""}. Die Reduktion zieht Ihr Netzbetreiber direkt auf der Netzrechnung ab; hier zeigen wir sie zur Orientierung.
            {!w.vollstaendig ? " Einzelne Werte fehlen noch – der Netzbetreiber liefert nach." : ""}
          </p>
        </div>
      )}
    </section>
  );
}

function gruenText(stunden, heute) {
  const t = stunden?.tage?.find((x) => x.datum === heute) || stunden?.tage?.[0];
  if (!t?.fenster?.length) return "–";
  return t.fenster.map((f) => `${f.von}–${f.bis}`).join(", ");
}

function Kachel({ icon: Icon, label, wert, zusatz, breit = false }) {
  return (
    <div className={cn("min-w-0 rounded-3xl bg-white/5 p-4 ring-1 ring-white/10 md:p-5", breit && "col-span-2")}>
      <p className="flex items-center gap-1.5 text-[12.5px] font-medium text-white/75"><Icon aria-hidden="true" className="h-3.5 w-3.5 text-ov-300" />{label}</p>
      <p className="ov-kpi mt-1 truncate text-white">{wert}</p>
      {zusatz && <p className="mt-1 text-[12px] leading-snug text-white/70">{zusatz}</p>}
    </div>
  );
}
