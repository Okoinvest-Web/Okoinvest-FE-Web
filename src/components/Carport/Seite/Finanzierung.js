// Finanzierung: Kauf vs. Contracting mit Kennzahl aus dem Rechner-Beispiel und Vergleichszeilen
import Link from "@/components/Land/Link";
import { ArrowUpRight, Calculator, CircleDollarSign, Handshake } from "lucide-react";
import Section from "@/components/ui/Section";
import Reveal from "@/components/ui/Reveal";
import Kopf from "@/components/Energie/Seite/Kopf";
import { cn } from "@/components/ui/cn";
import { landCode, landHinweisText, landHinweisTextEn, pfad } from "@/lib/land";
import { spracheDerAnfrage } from "@/lib/land/seite";
import { uebersetze } from "@/lib/sprache/woerterbuch";

/** Sprachmodell: Texte (Werte kommen formatiert von der Seite). */
const W = {
  de: {
    ohneWerte: { wert: "auf Anfrage", label: "Beispielwerte" },
    hinweis: (l) => `${landHinweisText(l, "Beispielwerte")}.`,
    kauf: {
      titel: "Kauf",
      text: "Sie investieren, wir planen und bauen. Jede selbst genutzte Kilowattstunde spart den vollen Strompreis, der Überschuss wird eingespeist. Größter Vorteil über die Laufzeit, Abschreibung als Wirtschaftsgut.",
      kennzahl: (a) => ({ wert: `≈ ${a} Jahre`, label: "Amortisation im Beispiel" }),
      zusatz: (i) => `Investition ${i} inkl. Ladepunkte`,
      zeilen: [["Kapital", "Sie investieren"], ["Vorteil", "größter Vorteil über die Laufzeit"], ["Bilanz", "Abschreibung als Wirtschaftsgut"]],
    },
    contracting: {
      titel: "Contracting / PPA",
      text: (j) => `Wir bauen, finanzieren und betreiben. Sie kaufen den Solarstrom vor Ort zu einem festen Preis über ${j} Jahre – ohne eigenes Kapital, ohne Betriebsaufwand. Danach kann die Anlage an Sie übergehen.`,
      kennzahl: (p) => ({ wert: `≈ ${p} ct/kWh`, label: "kostendeckender Solarstrompreis im Beispiel" }),
      zusatz: "je höher Ihr Eigenverbrauch, desto günstiger",
      zeilen: (j) => [["Kapital", "kein eigenes Kapital"], ["Vorteil", `fester Preis über ${j} Jahre`], ["Danach", "Anlage kann an Sie übergehen"]],
    },
    eyebrow: "Finanzierung",
    titel: "Selbst investieren oder Strom kaufen.",
    lead: "Beide Wege führen zum Solarcarport – sie unterscheiden sich in Kapitalbindung, Risiko und Vorteil über die Laufzeit.",
    beispiel: "Beispiel: 100 Stellplätze, 75 % Eigenverbrauch, 10 AC- und 2 DC-Ladepunkte",
    giltDe: " (gilt für Deutschland)",
    rechnen: "Mit Ihren Zahlen rechnen",
  },
  en: {
    ohneWerte: { wert: "on request", label: "Example figures" },
    hinweis: (l) => `${landHinweisTextEn(l, "Example figures")}.`,
    kauf: {
      titel: "Purchase",
      text: "You invest, we plan and build. Every kilowatt hour you use yourself saves the full power price; the surplus is fed into the grid. The greatest benefit over the term, depreciation as a business asset.",
      kennzahl: (a) => ({ wert: `≈ ${a} years`, label: "Payback in the example" }),
      zusatz: (i) => `Investment ${i} incl. charging points`,
      zeilen: [["Capital", "you invest"], ["Benefit", "greatest benefit over the term"], ["Balance sheet", "depreciation as a business asset"]],
    },
    contracting: {
      titel: "Contracting / PPA",
      text: (j) => `We build, finance and operate. You buy the solar power on site at a fixed price over ${j} years – without your own capital and without operating effort. Afterwards, the installation can pass to you.`,
      kennzahl: (p) => ({ wert: `≈ ${p} ct/kWh`, label: "cost-covering solar power price in the example" }),
      zusatz: "the higher your self-consumption, the lower the price",
      zeilen: (j) => [["Capital", "no capital of your own"], ["Benefit", `fixed price over ${j} years`], ["Afterwards", "installation can pass to you"]],
    },
    eyebrow: "Financing",
    titel: "Invest yourself or buy the power.",
    lead: "Both routes lead to a solar carport – they differ in capital commitment, risk and benefit over the term.",
    beispiel: "Example: 100 parking spaces, 75 % self-consumption, 10 AC and 2 DC charging points",
    giltDe: " (applies to Germany)",
    rechnen: "Calculate with your figures",
  },
};

/** amortisation, invest, preisCt: formatierte Werte aus rechneCarport; jahre: Contracting-Laufzeit */
export default function Finanzierung({ amortisation, invest, preisCt, jahre, land = null }) {
  // Beispielwerte rechnen mit deutschen Annahmen (Carport-Rechner): in AT/CH LandHinweis statt Werten
  const l = landCode(land);
  const werte = !l || l === "DE";
  const w = uebersetze(W, spracheDerAnfrage());
  const ohneWerte = w.ohneWerte;
  const KARTEN = [
    {
      id: "kauf",
      icon: CircleDollarSign,
      titel: w.kauf.titel,
      dunkel: false,
      text: w.kauf.text,
      kennzahl: werte ? w.kauf.kennzahl(amortisation) : ohneWerte,
      zusatz: werte ? w.kauf.zusatz(invest) : w.hinweis(l),
      zeilen: w.kauf.zeilen,
    },
    {
      id: "contracting",
      icon: Handshake,
      titel: w.contracting.titel,
      dunkel: true,
      text: w.contracting.text(jahre),
      kennzahl: werte ? w.contracting.kennzahl(preisCt) : ohneWerte,
      zusatz: werte ? w.contracting.zusatz : w.hinweis(l),
      zeilen: w.contracting.zeilen(jahre),
    },
  ];

  return (
    <Section tone="white" space="lg" data-abschnitt="finanzierung" aria-labelledby="finanzierung-titel">
      <Kopf
        id="finanzierung-titel"
        eyebrow={w.eyebrow}
        titel={w.titel}
        lead={w.lead}
        align="center"
        className="mb-12 md:mb-16"
      />
      <div className="grid gap-5 lg:grid-cols-2 lg:gap-6">
        {KARTEN.map((k, i) => (
          <Reveal
            key={k.id}
            as="article"
            delay={i * 80}
            aria-labelledby={`fin-${k.id}`}
            className={cn("relative flex flex-col overflow-hidden rounded-[2rem] p-6 sm:p-8 md:p-10", k.dunkel ? "ov-verlauf-nacht text-white shadow-e4" : "bg-sand-50 ring-1 ring-ink-200/70")}
          >
            <div className="flex items-center gap-4">
              <span aria-hidden="true" className={cn("flex h-12 w-12 items-center justify-center rounded-2xl", k.dunkel ? "bg-white/[0.08] text-ov-300 ring-1 ring-white/15" : "bg-white text-ov-600 shadow-e1 ring-1 ring-ink-200/70")}>
                <k.icon className="h-6 w-6" />
              </span>
              <h3 id={`fin-${k.id}`} className={cn("ov-h3", k.dunkel ? "text-white" : "text-ink-900")}>
                {k.titel}
              </h3>
            </div>
            <p className={cn("mt-5 text-[15.5px] leading-relaxed", k.dunkel ? "text-white/75" : "text-ink-600")}>{k.text}</p>

            <div className={cn("mt-7 rounded-2xl p-5", k.dunkel ? "bg-white/[0.06] ring-1 ring-white/10" : "bg-white ring-1 ring-ink-200/70")}>
              <p className={cn("text-[12.5px] font-semibold uppercase tracking-[0.12em]", k.dunkel ? "text-ov-300" : "text-ov-700")}>{k.kennzahl.label}</p>
              <p className={cn("ov-kpi mt-1", k.dunkel ? "text-white" : "text-ink-900")}>{k.kennzahl.wert}</p>
              <p className={cn("mt-1 text-[13.5px]", k.dunkel ? "text-white/60" : "text-ink-500")}>{k.zusatz}</p>
            </div>

            <dl className={cn("mt-6 divide-y", k.dunkel ? "divide-white/10" : "divide-ink-200/70")}>
              {k.zeilen.map(([a, b]) => (
                <div key={a} className="flex items-baseline justify-between gap-4 py-3">
                  <dt className={cn("text-[14px]", k.dunkel ? "text-white/55" : "text-ink-500")}>{a}</dt>
                  <dd className={cn("text-right text-[15px] font-semibold", k.dunkel ? "text-white" : "text-ink-900")}>{b}</dd>
                </div>
              ))}
            </dl>
          </Reveal>
        ))}
      </div>
      <Reveal className="mt-8 flex flex-col items-center gap-3 text-center">
        {werte && <p className="text-[13px] text-ink-500">{w.beispiel}{!l && w.giltDe}</p>}
        <Link
          href={pfad("/rechner/solarcarport")}
          className="group inline-flex min-h-12 items-center gap-2 rounded-full bg-ov-50 px-5 py-3 text-[15px] font-semibold text-ov-800 ring-1 ring-ov-200 transition-colors hover:bg-ov-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ov-500"
        >
          <Calculator aria-hidden="true" className="h-4 w-4" /> {w.rechnen}
          <ArrowUpRight aria-hidden="true" className="h-4 w-4 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
        </Link>
      </Reveal>
    </Section>
  );
}
