// Fünf Pachtmodelle – Hauptmodell als dunkle Leitkarte mit Laufzeit-Grafik, vier Varianten daneben
import Link from "@/components/Land/Link";
import { ArrowRight, BadgePercent, Banknote, Hammer, Lock, Zap } from "lucide-react";
import SectionHeading from "@/components/ui/SectionHeading";
import Reveal from "@/components/ui/Reveal";
import { fmt, fmtEur } from "@/lib/rechner/annahmen";
import { landHinweisText, landHinweisTextEn, pfad, zahlenModus } from "@/lib/land";
import { landDerAnfrage, spracheDerAnfrage } from "@/lib/land/seite";
import { GiltFuer, LandHinweis } from "@/components/Land/LandHinweis";
import { uebersetze } from "@/lib/sprache/woerterbuch";
import { datumText, fmtZahl } from "@/lib/sprache/format";

/** Sprachmodell: Texte und Zahlenformat je Sprache (Werte aus dem Dachpacht-Rechner). */
const WORTE = {
  de: {
    f: (n, s = 0) => fmt(n, s),
    eur: (n) => fmtEur(n),
    tsd: (v) => `${fmt(Math.round(v / 1000))} Tsd. €`,
    grafikLabel: (n, max, einmal, jahre) => `Kumulierte Pacht über ${n} Jahre bis ${max}; die Einmalzahlung von ca. ${einmal} entspricht dem Stand nach rund ${jahre} Jahren.`,
    einmalLinie: (v) => `Einmalzahlung ca. ${v}`,
    jahr: (n) => `Jahr ${n}`,
    weitere: (bsp, dach, f, tsd, eur) => [
      { t: "Einmalzahlung", k: "Barwert", x: "Alle künftigen Pachten abgezinst auf einen Betrag bei Baubeginn – etwa für Sanierung, Investition oder Tilgung.", s: `ca. ${tsd(bsp.einmalzahlung)} einmalig` },
      { t: "Umsatzbeteiligung", k: `${f(dach.umsatzbeteiligung.min * 100)}–${f(dach.umsatzbeteiligung.max * 100)} %`, x: "Anteil an den Stromerlösen, meist mit Mindestpacht. Steigt mit dem Strompreis – schwankt aber mit Ertrag und Markt.", s: `ca. ${eur(bsp.erloesVoll * 0.06)} bei 6 %` },
      { t: "Dachstrom (PPA)", k: `${f(dach.ppaVorOrtCt.min)}–${f(dach.ppaVorOrtCt.max)} ct/kWh`, x: "Sie oder Ihr Mieter beziehen den Strom direkt vom Dach – ohne Netzentgelte für diesen Anteil. Pacht dafür meist reduziert.", s: `Barwert ca. ${tsd(bsp.wege.ppa.barwert)} (40 % Eigenverbrauch)` },
      { t: "Dachsanierung", k: "als Gegenleistung", x: "Der Betreiber finanziert die Neueindeckung ganz oder teilweise und verrechnet sie mit der Pacht. Sie erhalten ein neues Dach ohne Kapital.", s: `Neueindeckung ≈ ${f(bsp.sanierungInPachtjahren, 0)} Pachtjahre` },
    ],
    eyebrow: "Fünf Modelle",
    titel: "Pacht, Einmalbetrag, Dachstrom – oder ein neues Dach.",
    lead: (m2, bsp, dach, f) => `Beispielwerte für ein ${f(m2)}-m²-Trapezdach in Süddeutschland (≈ ${f(bsp.kwp)} kWp, ${f(bsp.kwhJahr1 / 1000)} MWh im Jahr) über ${dach.laufzeit} Jahre. Ihre Werte rechnen Sie im Dachpacht-Rechner.`,
    planbar: "Am planbarsten",
    festTitel: "Dachpacht fest",
    festWert: (dach, f) => `${f(dach.pachtProM2.min, 2)}–${f(dach.pachtProM2.max, 2)} €/m²`,
    festText: (dach, f) => `Fester Betrag je m² oder je kWp (${f(dach.pachtProKwp.min)}–${f(dach.pachtProKwp.max)} €/kWp) und Jahr – auf Wunsch indexiert. Maximal planbar.`,
    proJahr: "pro Jahr",
    inJahren: (n) => `in ${n} Jahren`,
    einmal: "Einmalzahlung",
    grafikFuss: (m2, f) => `Kumulierte Pacht für ${f(m2)} m² · Linie: Einmalzahlung als Barwert`,
    beispiel: "Beispiel: ",
    hinweis: (l) => `Beispielrechnung mit Werten für Deutschland. ${landHinweisText(l, "Pacht- und Strompreiswerte")}.`,
    fuss: (dach, f, stand) => `Nominal und vor Steuern. Einmalzahlung abgezinst mit ${f(dach.einmalDiskont * 100, 1)} %; Stromerlöse bei Volleinspeisung mit ${f(dach.eegDachCt, 1)} ct/kWh (Durchschnitt der Dach-Ausschreibungen 2025). Modelle lassen sich kombinieren, etwa Mindestpacht plus Umsatzbeteiligung oder Sanierung plus reduzierte Pacht. Stand ${stand}.`,
    rechnen: "Mit eigenen Werten rechnen",
  },
  en: {
    f: (n, s = 0) => fmtZahl(n, s, "en"),
    eur: (n) => `€${fmtZahl(Math.round(n), 0, "en")}`,
    tsd: (v) => `€${fmtZahl(Math.round(v / 1000), 0, "en")}k`,
    grafikLabel: (n, max, einmal, jahre) => `Cumulative lease over ${n} years up to ${max}; the one-off payment of approx. ${einmal} corresponds to the level after around ${jahre} years.`,
    einmalLinie: (v) => `One-off payment approx. ${v}`,
    jahr: (n) => `Year ${n}`,
    weitere: (bsp, dach, f, tsd, eur) => [
      { t: "One-off payment", k: "Present value", x: "All future lease payments discounted to a single amount at the start of construction – for example for renovation, investment or repayment.", s: `approx. ${tsd(bsp.einmalzahlung)} one-off` },
      { t: "Revenue share", k: `${f(dach.umsatzbeteiligung.min * 100)}–${f(dach.umsatzbeteiligung.max * 100)} %`, x: "A share of the power revenue, usually with a minimum lease. Rises with the power price – but fluctuates with yield and market.", s: `approx. ${eur(bsp.erloesVoll * 0.06)} at 6 %` },
      { t: "Rooftop power (PPA)", k: `${f(dach.ppaVorOrtCt.min)}–${f(dach.ppaVorOrtCt.max)} ct/kWh`, x: "You or your tenant buy the power directly from the roof – without grid fees for this share. The lease is usually reduced in return.", s: `Present value approx. ${tsd(bsp.wege.ppa.barwert)} (40 % self-consumption)` },
      { t: "Roof renovation", k: "in return", x: "The operator finances the new roofing in whole or in part and offsets it against the lease. You get a new roof without capital.", s: `New roofing ≈ ${f(bsp.sanierungInPachtjahren, 0)} years of lease` },
    ],
    eyebrow: "Five models",
    titel: "Lease, lump sum, rooftop power – or a new roof.",
    lead: (m2, bsp, dach, f) => `Example figures for a ${f(m2)} m² trapezoidal roof in southern Germany (≈ ${f(bsp.kwp)} kWp, ${f(bsp.kwhJahr1 / 1000)} MWh per year) over ${dach.laufzeit} years. You can calculate your own figures in the roof lease calculator.`,
    planbar: "Most predictable",
    festTitel: "Fixed roof lease",
    festWert: (dach, f) => `€${f(dach.pachtProM2.min, 2)}–${f(dach.pachtProM2.max, 2)}/m²`,
    festText: (dach, f) => `A fixed amount per m² or per kWp (€${f(dach.pachtProKwp.min)}–${f(dach.pachtProKwp.max)}/kWp) per year – indexed if you wish. Maximum predictability.`,
    proJahr: "per year",
    inJahren: (n) => `over ${n} years`,
    einmal: "One-off payment",
    grafikFuss: (m2, f) => `Cumulative lease for ${f(m2)} m² · line: one-off payment as present value`,
    beispiel: "Example: ",
    hinweis: (l) => `Example calculation with figures for Germany. ${landHinweisTextEn(l, "Lease and power price figures")}.`,
    fuss: (dach, f, stand) => `Nominal and before tax. One-off payment discounted at ${f(dach.einmalDiskont * 100, 1)} %; power revenue with full feed-in at ${f(dach.eegDachCt, 1)} ct/kWh (average of the 2025 rooftop tenders). Models can be combined, for example a minimum lease plus revenue share, or renovation plus a reduced lease. As of ${datumText(stand, "en")}.`,
    rechnen: "Calculate with your own figures",
  },
};

/** Kumulierte Pacht über die Laufzeit (Säulen) und Einmalzahlung (Linie) */
function LaufzeitGrafik({ jahr, n, einmal, w }) {
  const tsd = w.tsd;
  const max = jahr * n;
  const W = 520;
  const H = 200;
  const b = W / n;
  const yE = H - (einmal / max) * H;
  return (
    <svg viewBox={`0 0 ${W} ${H + 26}`} className="block h-auto w-full" role="img" aria-label={w.grafikLabel(n, tsd(max), tsd(einmal), w.f(einmal / jahr))}>
      {[0.25, 0.5, 0.75].map((f) => (
        <line key={f} x1="0" x2={W} y1={H - f * H} y2={H - f * H} stroke="#fff" strokeOpacity="0.08" />
      ))}
      {Array.from({ length: n }, (_, i) => {
        const h = ((i + 1) / n) * H;
        return <rect key={i} x={i * b + 2} y={H - h} width={b - 4} height={h} rx="2.5" fill={i === n - 1 ? "#aed083" : "#669933"} fillOpacity={i === n - 1 ? 1 : 0.55 + (i / n) * 0.35} />;
      })}
      <line x1="0" x2={W} y1={yE} y2={yE} stroke="#ffd873" strokeWidth="1.6" strokeDasharray="6 5" />
      <text x="4" y={yE - 7} fill="#ffd873" fontSize="15" fontWeight="600">{w.einmalLinie(tsd(einmal))}</text>
      <text x="2" y={H + 22} fill="#fff" fillOpacity="0.6" fontSize="14">{w.jahr(1)}</text>
      <text x={W - 2} y={H + 22} fill="#fff" fillOpacity="0.6" fontSize="14" textAnchor="end">{w.jahr(n)}</text>
    </svg>
  );
}

export default function Modelle({ bsp, dach, m2, stand }) {
  const w = uebersetze(WORTE, spracheDerAnfrage());
  const { f, tsd, eur } = w;
  const ICONS = [Banknote, BadgePercent, Zap, Hammer];
  const weitere = w.weitere(bsp, dach, f, tsd, eur).map((m, i) => ({ icon: ICONS[i], ...m }));

  return (
    <section id="modelle" data-abschnitt="modelle" aria-labelledby="modelle-titel" className="scroll-mt-24 bg-sand-50 py-20 md:py-28">
      <div className="ov-container">
        <SectionHeading
          eyebrow={w.eyebrow}
          title={<span id="modelle-titel">{w.titel}</span>}
          lead={w.lead(m2, bsp, dach, f)}
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
                <span className="rounded-full bg-ov-300 px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-[0.08em] text-navy-950">{w.planbar}</span>
              </div>
              <h3 className="mt-5 font-display text-[22px] font-bold">{w.festTitel}</h3>
              <p className="ov-num mt-1 font-display text-[30px] font-extrabold leading-tight tracking-tight text-ov-300 md:text-[34px]">
                {w.festWert(dach, f)}
              </p>
              <p className="mt-3 max-w-md text-[15px] leading-relaxed text-white/75">
                {w.festText(dach, f)}
              </p>
              <dl className="mt-6 grid grid-cols-3 gap-px overflow-hidden rounded-2xl bg-white/10 ring-1 ring-inset ring-white/10">
                {[
                  [w.proJahr, eur(bsp.pachtJahr), "text-white"],
                  [w.inJahren(dach.laufzeit), tsd(bsp.wege.pacht.summe), "text-ov-300"],
                  [w.einmal, `≈ ${tsd(bsp.einmalzahlung)}`, "text-sun-300"],
                ].map(([k, v, c]) => (
                  <div key={k} className="bg-navy-950/60 px-3 py-3 sm:px-4">
                    <dt className="text-[11.5px] leading-tight text-white/60 sm:text-[12px]">{k}</dt>
                    <dd className={`ov-num mt-1 font-display text-[14px] font-extrabold leading-tight sm:text-[18px] ${c}`}>{v}</dd>
                  </div>
                ))}
              </dl>
              <div className="mt-auto pt-6">
                <LaufzeitGrafik jahr={bsp.pachtJahr} n={dach.laufzeit} einmal={bsp.einmalzahlung} w={w} />
                <p className="mt-2 text-[12px] text-white/55">{w.grafikFuss(m2, f)}</p>
              </div>
            </div>
          </Reveal>

          {/* Vier Varianten */}
          <ul className="grid gap-4 sm:grid-cols-2">
            {weitere.map((m, i) => (
              <Reveal as="li" key={i} delay={80 + i * 60} className="flex flex-col rounded-3xl bg-white p-6 ring-1 ring-ink-200/60">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-ov-50 text-ov-600 ring-1 ring-ov-200">
                  <m.icon aria-hidden="true" className="h-[18px] w-[18px]" />
                </span>
                <h3 className="mt-4 font-display text-[17px] font-bold text-ink-900">{m.t}</h3>
                <p className="ov-num mt-0.5 font-display text-[19px] font-extrabold tracking-tight text-ov-700">{m.k}</p>
                <p className="mt-2.5 text-[14px] leading-relaxed text-ink-600">{m.x}</p>
                <p className="ov-num mt-auto border-t border-ink-100 pt-3.5 text-[13.5px] font-semibold text-ink-800">
                  <span className="sr-only">{w.beispiel}</span>{m.s}
                </p>
              </Reveal>
            ))}
          </ul>
        </div>

        <div className="mt-8 flex flex-col gap-4 md:flex-row md:items-start md:justify-between md:gap-10">
          {/* Länderinhalt: Beispielwerte gelten für Deutschland – in AT/CH ausdrücklich gesagt (LandHinweis) */}
          {zahlenModus(landDerAnfrage(), ["DE"]) === "hinweis" ? (
            <LandHinweis land={landDerAnfrage()} zeile className="max-w-4xl" text={WORTE.de.hinweis(landDerAnfrage())} textEn={WORTE.en.hinweis(landDerAnfrage())} />
          ) : (
          <p className="max-w-4xl text-[13px] leading-relaxed text-ink-500">
            {w.fuss(dach, f, stand)}
            {!landDerAnfrage() && <> <GiltFuer /></>}
          </p>
          )}
          <Link href={pfad("/rechner/dachpacht")} className="group inline-flex shrink-0 items-center gap-2 rounded-full bg-white px-5 py-3 text-[14.5px] font-semibold text-ov-700 shadow-e1 ring-1 ring-ov-200 transition-colors hover:bg-ov-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ov-500">
            {w.rechnen}
            <ArrowRight aria-hidden="true" className="h-4 w-4 transition-transform group-hover:translate-x-0.5 motion-reduce:transition-none" />
          </Link>
        </div>
      </div>
    </section>
  );
}
