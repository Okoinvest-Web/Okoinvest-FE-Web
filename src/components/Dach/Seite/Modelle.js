// Fünf Pachtmodelle – Hauptmodell als dunkle Leitkarte mit Laufzeit-Grafik, vier Varianten daneben
import Link from "next/link";
import { ArrowRight, BadgePercent, Banknote, Hammer, Lock, Zap } from "lucide-react";
import SectionHeading from "@/components/ui/SectionHeading";
import Reveal from "@/components/ui/Reveal";
import { fmt, fmtEur } from "@/lib/rechner/annahmen";
import { pfad } from "@/lib/land";

const tsd = (v) => `${fmt(Math.round(v / 1000))} Tsd. €`;

/** Kumulierte Pacht über die Laufzeit (Säulen) und Einmalzahlung (Linie) */
function LaufzeitGrafik({ jahr, n, einmal }) {
  const max = jahr * n;
  const W = 520;
  const H = 200;
  const b = W / n;
  const yE = H - (einmal / max) * H;
  return (
    <svg viewBox={`0 0 ${W} ${H + 26}`} className="block h-auto w-full" role="img" aria-label={`Kumulierte Pacht über ${n} Jahre bis ${tsd(max)}; die Einmalzahlung von ca. ${tsd(einmal)} entspricht dem Stand nach rund ${fmt(einmal / jahr)} Jahren.`}>
      {[0.25, 0.5, 0.75].map((f) => (
        <line key={f} x1="0" x2={W} y1={H - f * H} y2={H - f * H} stroke="#fff" strokeOpacity="0.08" />
      ))}
      {Array.from({ length: n }, (_, i) => {
        const h = ((i + 1) / n) * H;
        return <rect key={i} x={i * b + 2} y={H - h} width={b - 4} height={h} rx="2.5" fill={i === n - 1 ? "#aed083" : "#669933"} fillOpacity={i === n - 1 ? 1 : 0.55 + (i / n) * 0.35} />;
      })}
      <line x1="0" x2={W} y1={yE} y2={yE} stroke="#ffd873" strokeWidth="1.6" strokeDasharray="6 5" />
      <text x="4" y={yE - 7} fill="#ffd873" fontSize="15" fontWeight="600">Einmalzahlung ca. {tsd(einmal)}</text>
      <text x="2" y={H + 22} fill="#fff" fillOpacity="0.6" fontSize="14">Jahr 1</text>
      <text x={W - 2} y={H + 22} fill="#fff" fillOpacity="0.6" fontSize="14" textAnchor="end">Jahr {n}</text>
    </svg>
  );
}

export default function Modelle({ bsp, dach, m2, stand }) {
  const weitere = [
    { icon: Banknote, t: "Einmalzahlung", k: "Barwert", x: "Alle künftigen Pachten abgezinst auf einen Betrag bei Baubeginn – etwa für Sanierung, Investition oder Tilgung.", s: `ca. ${tsd(bsp.einmalzahlung)} einmalig` },
    { icon: BadgePercent, t: "Umsatzbeteiligung", k: `${fmt(dach.umsatzbeteiligung.min * 100)}–${fmt(dach.umsatzbeteiligung.max * 100)} %`, x: "Anteil an den Stromerlösen, meist mit Mindestpacht. Steigt mit dem Strompreis – schwankt aber mit Ertrag und Markt.", s: `ca. ${fmtEur(bsp.erloesVoll * 0.06)} bei 6 %` },
    { icon: Zap, t: "Dachstrom (PPA)", k: `${fmt(dach.ppaVorOrtCt.min)}–${fmt(dach.ppaVorOrtCt.max)} ct/kWh`, x: "Sie oder Ihr Mieter beziehen den Strom direkt vom Dach – ohne Netzentgelte für diesen Anteil. Pacht dafür meist reduziert.", s: `Barwert ca. ${tsd(bsp.wege.ppa.barwert)} (40 % Eigenverbrauch)` },
    { icon: Hammer, t: "Dachsanierung", k: "als Gegenleistung", x: "Der Betreiber finanziert die Neueindeckung ganz oder teilweise und verrechnet sie mit der Pacht. Sie erhalten ein neues Dach ohne Kapital.", s: `Neueindeckung ≈ ${fmt(bsp.sanierungInPachtjahren, 0)} Pachtjahre` },
  ];

  return (
    <section id="modelle" data-abschnitt="modelle" aria-labelledby="modelle-titel" className="scroll-mt-24 bg-sand-50 py-20 md:py-28">
      <div className="ov-container">
        <SectionHeading
          eyebrow="Fünf Modelle"
          title={<span id="modelle-titel">Pacht, Einmalbetrag, Dachstrom – oder ein neues Dach.</span>}
          lead={`Beispielwerte für ein ${fmt(m2)}-m²-Trapezdach in Süddeutschland (≈ ${fmt(bsp.kwp)} kWp, ${fmt(bsp.kwhJahr1 / 1000)} MWh im Jahr) über ${dach.laufzeit} Jahre. Ihre Werte rechnen Sie im Dachpacht-Rechner.`}
        />

        <div className="mt-10 grid gap-4 md:mt-12 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)]">
          {/* Leitkarte */}
          <Reveal className="ov-verlauf-nacht ov-noise relative flex flex-col overflow-hidden rounded-[1.75rem] p-6 text-white shadow-e3 md:p-8">
            <div aria-hidden="true" className="ov-grid-bg absolute inset-0 opacity-40" />
            <div className="relative flex flex-1 flex-col">
              <div className="flex items-center gap-3">
                <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/10 text-ov-300 ring-1 ring-inset ring-white/15">
                  <Lock aria-hidden="true" className="h-5 w-5" />
                </span>
                <span className="rounded-full bg-ov-300 px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-[0.08em] text-navy-950">Am planbarsten</span>
              </div>
              <h3 className="mt-5 font-display text-[22px] font-bold">Dachpacht fest</h3>
              <p className="ov-num mt-1 font-display text-[30px] font-extrabold leading-tight tracking-tight text-ov-300 md:text-[34px]">
                {fmt(dach.pachtProM2.min, 2)}–{fmt(dach.pachtProM2.max, 2)} €/m²
              </p>
              <p className="mt-3 max-w-md text-[15px] leading-relaxed text-white/75">
                Fester Betrag je m² oder je kWp ({fmt(dach.pachtProKwp.min)}–{fmt(dach.pachtProKwp.max)} €/kWp) und Jahr – auf Wunsch indexiert. Maximal planbar.
              </p>
              <dl className="mt-6 grid grid-cols-3 gap-px overflow-hidden rounded-2xl bg-white/10 ring-1 ring-inset ring-white/10">
                {[
                  ["pro Jahr", fmtEur(bsp.pachtJahr), "text-white"],
                  [`in ${dach.laufzeit} Jahren`, tsd(bsp.wege.pacht.summe), "text-ov-300"],
                  ["Einmalzahlung", `≈ ${tsd(bsp.einmalzahlung)}`, "text-sun-300"],
                ].map(([k, v, c]) => (
                  <div key={k} className="bg-navy-950/60 px-3 py-3 sm:px-4">
                    <dt className="text-[11.5px] leading-tight text-white/60 sm:text-[12px]">{k}</dt>
                    <dd className={`ov-num mt-1 font-display text-[14px] font-extrabold leading-tight sm:text-[18px] ${c}`}>{v}</dd>
                  </div>
                ))}
              </dl>
              <div className="mt-auto pt-6">
                <LaufzeitGrafik jahr={bsp.pachtJahr} n={dach.laufzeit} einmal={bsp.einmalzahlung} />
                <p className="mt-2 text-[12px] text-white/55">Kumulierte Pacht für {fmt(m2)} m² · Linie: Einmalzahlung als Barwert</p>
              </div>
            </div>
          </Reveal>

          {/* Vier Varianten */}
          <ul className="grid gap-4 sm:grid-cols-2">
            {weitere.map((m, i) => (
              <Reveal as="li" key={m.t} delay={80 + i * 60} className="flex flex-col rounded-3xl bg-white p-6 ring-1 ring-ink-200/60">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-ov-50 text-ov-600 ring-1 ring-ov-200">
                  <m.icon aria-hidden="true" className="h-[18px] w-[18px]" />
                </span>
                <h3 className="mt-4 font-display text-[17px] font-bold text-ink-900">{m.t}</h3>
                <p className="ov-num mt-0.5 font-display text-[19px] font-extrabold tracking-tight text-ov-700">{m.k}</p>
                <p className="mt-2.5 text-[14px] leading-relaxed text-ink-600">{m.x}</p>
                <p className="ov-num mt-auto border-t border-ink-100 pt-3.5 text-[13.5px] font-semibold text-ink-800">
                  <span className="sr-only">Beispiel: </span>{m.s}
                </p>
              </Reveal>
            ))}
          </ul>
        </div>

        <div className="mt-8 flex flex-col gap-4 md:flex-row md:items-start md:justify-between md:gap-10">
          <p className="max-w-4xl text-[13px] leading-relaxed text-ink-500">
            Nominal und vor Steuern. Einmalzahlung abgezinst mit {fmt(dach.einmalDiskont * 100, 1)} %; Stromerlöse bei Volleinspeisung mit {fmt(dach.eegDachCt, 1)} ct/kWh (Durchschnitt der Dach-Ausschreibungen 2025). Modelle lassen sich kombinieren, etwa Mindestpacht plus Umsatzbeteiligung oder Sanierung plus reduzierte Pacht. Stand {stand}.
          </p>
          <Link href={pfad("/rechner/dachpacht")} className="group inline-flex shrink-0 items-center gap-2 rounded-full bg-white px-5 py-3 text-[14.5px] font-semibold text-ov-700 shadow-e1 ring-1 ring-ov-200 transition-colors hover:bg-ov-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ov-500">
            Mit eigenen Werten rechnen
            <ArrowRight aria-hidden="true" className="h-4 w-4 transition-transform group-hover:translate-x-0.5 motion-reduce:transition-none" />
          </Link>
        </div>
      </div>
    </section>
  );
}
