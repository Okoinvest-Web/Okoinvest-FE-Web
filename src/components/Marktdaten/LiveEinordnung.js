"use client";

import Link from "@/components/Land/Link";
import { ArrowRight } from "lucide-react";
import useEnergyLive, { fmtCt } from "@/components/ui/useEnergyLive";
import { LiveDot } from "@/components/ui/LiveTicker";
import { useTexte } from "@/components/Sprache/SpracheKontext";
import { useFormate } from "@/components/Sprache/useFormate";

const TEXTE = {
  de: {
    jetzt: "Börsenpreis jetzt",
    jetztHinweis: "Day-Ahead, aktuelle Viertelstunde",
    heute: "Tagesmittel heute",
    negativ: (n) => `${n} Viertelstunden unter null`,
    laedt: "wird geladen",
    zuschlag: "Ø EEG-Zuschlag",
    marktwert: (j) => `Marktwert Solar ${j}`,
    marktwertHinweis: "Jahresmarktwert, netztransparenz.de",
    titel: "Live-Einordnung",
    unter: "Börsenstrompreis Deutschland jetzt, netto",
    link: "Zum Live-Dashboard Strommarkt",
    zuschlagText: (x) => x,
  },
  en: {
    jetzt: "Exchange price now",
    jetztHinweis: "day-ahead, current quarter-hour",
    heute: "Daily average today",
    negativ: (n) => `${n} quarter-hours below zero`,
    laedt: "loading",
    zuschlag: "Ø EEG award",
    marktwert: (j) => `Solar market value ${j}`,
    marktwertHinweis: "annual market value, netztransparenz.de",
    titel: "Live context",
    unter: "Exchange electricity price in Germany now, net",
    link: "To the live power market dashboard",
    zuschlagText: (x) => x,
  },
};
import Reveal from "@/components/ui/Reveal";
import { pfad } from "@/lib/land";

/**
 * Live-Börsenpreis (Day-Ahead DE-LU) im Vergleich zu den historischen
 * Referenzwerten der Seite: letzter Ø-Zuschlagswert und Jahresmarktwert Solar.
 *
 * props:
 *  zuschlagCt   letzter mengengewichteter Zuschlagswert (ct/kWh)
 *  zuschlagText z. B. "Gebotstermin 1. Juli 2026"
 *  solarCt      letzter Jahresmarktwert Solar (ct/kWh)
 *  solarJahr    Jahr des Jahresmarktwerts
 *  initial      optional { preis: { aktuell, heute } } vom Server (kein leerer Platzhalter)
 */
export default function LiveEinordnung({ zuschlagCt, zuschlagText, solarCt, solarJahr, initial = null }) {
  const t = useTexte(TEXTE);
  const f = useFormate();
  const { fmt } = f;
  const d = useEnergyLive() || initial;
  const jetzt = d?.preis?.aktuell;
  const heute = d?.preis?.heute;
  const jetztCt = jetzt ? jetzt.eurMwh / 10 : null;

  const zeilen = [
    { label: t.jetzt, wert: jetztCt, hinweis: t.jetztHinweis, live: true },
    { label: t.heute, wert: heute ? heute.avg / 10 : null, hinweis: heute ? t.negativ(heute.negativ) : t.laedt, live: true },
    { label: t.zuschlag, wert: zuschlagCt, hinweis: zuschlagText },
    { label: t.marktwert(solarJahr), wert: solarCt, hinweis: t.marktwertHinweis },
  ];
  const skala = Math.max(12, ...zeilen.map((z) => (z.wert != null ? z.wert : 0)));

  return (
    <div className="ov-glass rounded-[2rem] p-6 text-white md:p-8">
      <p className="flex items-center gap-2 text-[12.5px] font-semibold uppercase tracking-[0.14em] text-ov-300">
        <LiveDot />
        {t.titel}
      </p>
      <p className="mt-4 flex items-baseline gap-2 font-display font-extrabold leading-none tracking-tight" aria-live="polite">
        {jetzt ? (
          <>
            <span className="ov-num text-[clamp(2.6rem,2rem+2vw,3.6rem)]">{fmtCt(jetzt.eurMwh, 1, f.sprache)}</span>
            <span className="text-[16px] font-bold text-white/65">ct/kWh</span>
          </>
        ) : (
          <span className="block h-12 w-44 animate-ov-shimmer rounded-lg bg-[linear-gradient(90deg,rgba(255,255,255,0.06),rgba(255,255,255,0.16),rgba(255,255,255,0.06))] bg-[length:200%_100%]" />
        )}
      </p>
      <p className="mt-2 text-[14px] text-white/65">{t.unter}</p>

      {/* Vergleichsbalken wachsen beim Eintritt nacheinander (ov-balken-x am Rahmen); Live-Änderungen per scaleX */}
      <Reveal as="ul" dir="ohne" className="mt-7 space-y-4">
        {zeilen.map((z, i) => {
          const neg = z.wert != null && z.wert < 0;
          const breite = z.wert != null ? Math.max(2, (Math.abs(z.wert) / skala) * 100) : 0;
          return (
            <li key={z.label}>
              <div className="mb-1.5 flex items-baseline justify-between gap-3 text-[13.5px]">
                <span className="text-white/80">{z.label}</span>
                <span className="ov-num font-semibold">{z.wert != null ? `${fmt(z.wert, 2)} ct` : "–"}</span>
              </div>
              <div className="h-2.5 overflow-hidden rounded-full bg-white/10" aria-hidden="true">
                <div className="ov-balken-x h-full" style={{ "--i": i * 3 }}>
                  <div
                    className={`h-full w-full origin-left rounded-full transition-transform duration-700 motion-reduce:transition-none ${z.live ? (neg ? "bg-sun-400" : "bg-white/85") : "bg-ov-400"}`}
                    style={{ transform: `scaleX(${Math.min(100, breite) / 100})` }}
                  />
                </div>
              </div>
              <p className="mt-1 text-[12px] text-white/50">{z.hinweis}</p>
            </li>
          );
        })}
      </Reveal>

      <Link
        href={pfad("/energie-live")}
        className="mt-7 inline-flex items-center gap-2 text-[14px] font-semibold text-ov-300 underline-offset-4 hover:text-white hover:underline"
      >
        {t.link}
        <ArrowRight aria-hidden="true" className="h-4 w-4" />
      </Link>
    </div>
  );
}
