"use client";

import { useMemo } from "react";
import { AlertTriangle, Sun, TrendingDown } from "lucide-react";
import useLiveDaten from "./useLiveDaten";
import { preisTage, ct, zahl, uhr } from "./berechnung";
import { ERLOESE } from "@/lib/invest/markt";
import { fmt } from "@/lib/rechner/annahmen";

/**
 * Solar-Capture-Rate heute: mit der Solareinspeisung gewichteter Börsenpreis
 * im Verhältnis zum Tagesdurchschnitt (Base). Dazu negative Viertelstunden
 * und der Solaranteil, der in diese Zeiten fiel.
 *
 * initial:      kompakter Server-Startwert (Preise)
 * initialSolar: { zeiten: [ms], werte: [MW] } – Solarreihe vom Server
 */
export default function CaptureRate({ initial, initialSolar }) {
  const { daten, jetzt } = useLiveDaten(initial);
  const tage = useMemo(() => preisTage(daten.preis, jetzt), [daten.preis, jetzt]);

  const solar = useMemo(() => {
    const z = daten.erzeugung?.zeiten;
    const w = daten.erzeugung?.serien?.solar;
    if (z?.length && w?.length) return { zeiten: z, werte: w };
    return initialSolar || { zeiten: [], werte: [] };
  }, [daten.erzeugung, initialSolar]);

  const k = useMemo(() => {
    const heute = tage.heute;
    if (!heute) return null;
    const schritt = tage.schrittMs;
    const solarAn = new Map();
    solar.zeiten.forEach((t, i) => {
      const v = Number(solar.werte[i]);
      if (Number.isFinite(v)) solarAn.set(Math.floor(t / schritt) * schritt, Math.max(0, v));
    });
    let sumSP = 0;
    let sumS = 0;
    let sumSNeg = 0;
    let negativ = 0;
    let letzte = null;
    for (const p of heute.punkte) {
      if (p.eurMwh < 0) negativ++;
      const s = solarAn.get(p.t);
      if (s == null) continue;
      sumSP += s * p.eurMwh;
      sumS += s;
      if (p.eurMwh < 0) sumSNeg += s;
      letzte = p.t;
    }
    // Mindestens ~1 GWh Solar in den Daten, sonst ist eine Aussage unseriös (früher Morgen)
    const genug = (sumS * schritt) / 3600000 > 1000;
    return {
      genug,
      capture: sumS > 0 ? sumSP / sumS : null,
      base: heute.avg,
      rate: sumS > 0 && heute.avg > 0 ? sumSP / sumS / heute.avg : null,
      negativ,
      negativStunden: (negativ * schritt) / 3600000,
      solarNegAnteil: sumS > 0 ? sumSNeg / sumS : 0,
      bis: letzte,
    };
  }, [tage, solar]);

  const breiteBase = 100;
  const breiteCapture = k?.rate != null ? Math.max(4, Math.min(140, k.rate * 100)) : 0;

  return (
    <div className="grid gap-5 lg:grid-cols-[1.1fr_0.9fr]">
      <div className="rounded-[2rem] bg-white p-6 shadow-xl ring-1 ring-ink-200/70 md:p-8">
        <p className="flex items-center gap-2 text-[12.5px] font-semibold uppercase tracking-[0.14em] text-ink-600">
          <Sun aria-hidden="true" className="h-4 w-4 text-sun-500" />
          Solar-Capture-Rate heute
        </p>
        {k?.genug && k.rate != null ? (
          <>
            <p className="mt-4 flex flex-wrap items-baseline gap-x-3 font-display font-extrabold leading-none tracking-tight text-ink-900">
              <span className="text-[clamp(2.8rem,2.2rem+2.4vw,4.2rem)]">{zahl(k.rate * 100, 0)} %</span>
              <span className="text-[16px] font-semibold text-ink-500">des Tagesdurchschnitts</span>
            </p>
            <p className="mt-3 text-[15.5px] leading-relaxed text-ink-600">
              Solarstrom erzielte heute{k.bis ? ` bis ${uhr(k.bis)} Uhr` : ""} im Schnitt <strong className="text-ink-900">{ct(k.capture)} ct/kWh</strong> an der Börse – bei
              einem Tagesmittel (Base) von {ct(k.base)} ct/kWh.
            </p>
            <div className="mt-7 space-y-3" aria-hidden="true">
              <Balken label="Base (Tagesmittel)" wert={`${ct(k.base)} ct`} breite={breiteBase / 1.4} farbe="bg-navy-700" />
              <Balken label="Solar-Capture-Preis" wert={`${ct(k.capture)} ct`} breite={breiteCapture / 1.4} farbe="bg-sun-400" />
            </div>
          </>
        ) : (
          <p className="mt-4 text-[15.5px] leading-relaxed text-ink-600">
            Heute ist noch zu wenig Solarstrom eingespeist, um eine belastbare Capture-Rate zu berechnen. Sie erscheint im Laufe des Vormittags. Zur
            Einordnung: Für ungeförderte Anlagen rechnen wir langfristig konservativ mit einem Solar-Marktwert von etwa {fmt(ERLOESE.merchantCt, 1)} ct/kWh.
          </p>
        )}
        <p className="mt-6 text-[12.5px] leading-relaxed text-ink-500">
          Berechnung: Day-Ahead-Preis je Viertelstunde, gewichtet mit der öffentlichen Solareinspeisung (Energy-Charts). Orientierung, keine Erlösprognose.
        </p>
      </div>

      <div className="grid gap-4">
        <div className="rounded-3xl bg-navy-950 p-6 text-white md:p-7">
          <p className="flex items-center gap-2 text-[13px] text-white/65">
            <TrendingDown aria-hidden="true" className="h-4 w-4 text-ov-300" />
            Negative Preise heute
          </p>
          <p className="mt-3 font-display text-[clamp(1.8rem,1.4rem+1.4vw,2.6rem)] font-extrabold leading-none">
            {k ? `${zahl(k.negativStunden, k.negativStunden % 1 ? 2 : 0)} h` : "–"}
          </p>
          <p className="mt-2 text-[14px] leading-relaxed text-white/65">
            {k && k.negativ > 0
              ? `${k.negativ} Viertelstunden unter null${k.solarNegAnteil > 0 ? ` – ${zahl(k.solarNegAnteil * 100, 0)} % des bisherigen Solarstroms fielen in diese Zeiten` : ""}.`
              : "Heute bisher keine Viertelstunde mit negativem Preis."}
          </p>
        </div>
        <div className="rounded-3xl bg-ov-50 p-6 ring-1 ring-ov-200 md:p-7">
          <p className="flex items-center gap-2 text-[13px] font-semibold text-ov-800">
            <AlertTriangle aria-hidden="true" className="h-4 w-4" />
            Warum das für Investoren zählt
          </p>
          <p className="mt-2 text-[14.5px] leading-relaxed text-ink-700">
            Je mehr Solar im Netz, desto stärker drückt es mittags den Preis – die Capture-Rate sinkt. Ungeförderte Parks brauchen deshalb PPAs (zuletzt etwa{" "}
            {fmt(ERLOESE.ppaCt.min, 1)}–{fmt(ERLOESE.ppaCt.max, 1)} ct/kWh), Speicher oder flexible Abnehmer, die Mittagsstrom gezielt nutzen.
          </p>
        </div>
      </div>
    </div>
  );
}

function Balken({ label, wert, breite, farbe }) {
  return (
    <div>
      <div className="mb-1.5 flex justify-between text-[13px] text-ink-600">
        <span>{label}</span>
        <span className="ov-num font-semibold text-ink-900">{wert}</span>
      </div>
      <div className="h-3 rounded-full bg-ink-100">
        <div className={`h-full rounded-full ${farbe} transition-[width] duration-700`} style={{ width: `${Math.max(0, Math.min(100, breite))}%` }} />
      </div>
    </div>
  );
}
