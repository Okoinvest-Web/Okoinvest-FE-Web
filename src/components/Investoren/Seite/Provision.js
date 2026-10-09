// Provision – transparent: Rollenkacheln + Beispielrechnung als Balken, darunter die Werkzeuge
import Link from "@/components/Land/Link";
import { ArrowUpRight, BadgePercent, LineChart, Scale, Sprout } from "lucide-react";
import Reveal from "@/components/ui/Reveal";
import SectionHeading from "@/components/ui/SectionHeading";
import { cn } from "@/components/ui/cn";
import { PHASEN, PROVISION } from "@/lib/invest/markt";
import { landCode, landHinweisText, landHinweisTextEn, pfad } from "@/lib/land";
import { spracheDerAnfrage } from "@/lib/land/seite";
import { uebersetze } from "@/lib/sprache/woerterbuch";
import { fmtEuro, fmtZahl } from "@/lib/sprache/format";
import { GiltFuer } from "@/components/Land/LandHinweis";

const rtb = PHASEN.find((p) => p.id === "rtb");
const BEISPIEL = { mwp: 20, preis: Math.round((rtb.preisProKwp.min + rtb.preisProKwp.max) / 2) };
const kaufpreis = BEISPIEL.mwp * 1000 * BEISPIEL.preis;

const WERKZEUGE = [
  { href: pfad("/rechner/solarpark"), icon: LineChart, titel: "Solarpark-Renditerechner", text: "Projekt- und EK-IRR, LCOE, DSCR und Cashflow über 30 Jahre – mit Sensitivitätsmatrix." },
  { href: pfad("/rechner/projektbewertung"), icon: Scale, titel: "Projektbewertung", text: "Kaufpreisspanne je kWp nach Phase, Netzanschluss, Größe und Vermarktung." },
];

const TEXTE = {
  de: {
    eyebrow: "Provision – transparent",
    titel: "Für Investoren kostenfrei. Punkt.",
    lead: "Wir verdienen erst, wenn ein Projekt den Besitzer wechselt – und dann zahlt der Verkäufer. So bleibt unser Interesse klar: passende Projekte, die auch wirklich gebaut werden.",
    rollen: [
      { titel: "Investoren", text: PROVISION.kaeufer.text },
      { titel: "Verkäufer", text: PROVISION.verkaeufer.text },
      { titel: "Flächeneigentümer", text: PROVISION.flaeche.text },
    ],
    beispiel: "Rechenbeispiel",
    baureifZu: (mwp, preis) => `${mwp} MWp baureif zu ${preis} €/kWp`,
    baureif: (mwp) => `${mwp} MWp baureif`,
    kaufpreis: "Kaufpreis",
    desKaufpreises: "des Kaufpreises",
    anVerkaeufer: "Kaufpreis an den Verkäufer",
    vergroessert: "Provision (vergrößert dargestellt)",
    provVon: "Die Provision von",
    bis: "bis",
    traegt: "trägt der Verkäufer, nur bei Abschluss.",
    traegtSatz: "des Kaufpreises trägt der Verkäufer, nur bei Abschluss.",
    thema: "Marktspannen je kWp",
    sieZahlen: "Sie zahlen als Käufer:",
    selbst: "Rechnen Sie selbst",
    zwei: "Zwei Werkzeuge für Ihre Kalkulation",
    werkzeuge: WERKZEUGE,
  },
  en: {
    eyebrow: "Commission – transparent",
    titel: "Free of charge for investors. Full stop.",
    lead: "We only earn when a project changes hands – and then the seller pays. That keeps our interest clear: suitable projects that actually get built.",
    rollen: [
      { titel: "Investors", text: "free of charge for investors (search profile, NDA, data room)" },
      { titel: "Sellers", text: `${fmtZahl(PROVISION.verkaeufer.min * 100, 1, "en")}–${fmtZahl(PROVISION.verkaeufer.max * 100, 0, "en")} % of the purchase price, only on successful closing` },
      { titel: "Landowners", text: "always free of charge for landowners" },
    ],
    beispiel: "Worked example",
    baureifZu: (mwp, preis) => `${mwp} MWp ready-to-build at €${preis}/kWp`,
    baureif: (mwp) => `${mwp} MWp ready-to-build`,
    kaufpreis: "purchase price",
    desKaufpreises: "of the purchase price",
    anVerkaeufer: "Purchase price to the seller",
    vergroessert: "Commission (shown enlarged)",
    provVon: "The commission of",
    bis: "to",
    traegt: "is borne by the seller, only on closing.",
    traegtSatz: "of the purchase price is borne by the seller, only on closing.",
    thema: "Market ranges per kWp",
    sieZahlen: "You pay as the buyer:",
    selbst: "Run the numbers yourself",
    zwei: "Two tools for your calculation",
    werkzeuge: [
      { titel: "Solar park return calculator", text: "Project and equity IRR, LCOE, DSCR and cash flow over 30 years – with a sensitivity matrix." },
      { titel: "Project valuation", text: "Purchase price range per kWp by stage, grid connection, size and offtake." },
    ],
  },
};

export default function Provision({ land = null }) {
  // Kaufpreis im Rechenbeispiel = Mitte der Marktspanne RTB für Deutschland (PHASEN): gemeinsam mit Vermerk,
  // in AT/CH nur die Provisionssätze (gelten in DACH) und der LandHinweis statt Eurowerten.
  const l = landCode(land);
  const werte = !l || l === "DE";
  const sprache = spracheDerAnfrage();
  const en = sprache === "en";
  const t = uebersetze(TEXTE, sprache);
  const z = (n, s = 0) => fmtZahl(n, s, sprache);
  const eur = (n) => fmtEuro(n, sprache);
  const nullEuro = en ? "€0" : "0 €";
  const saetze = `${z(PROVISION.verkaeufer.min * 100, 1)}–${z(PROVISION.verkaeufer.max * 100)} %`;
  const rollen = [
    { icon: LineChart, titel: t.rollen[0].titel, wert: nullEuro, text: t.rollen[0].text, hervor: true },
    { icon: BadgePercent, titel: t.rollen[1].titel, wert: saetze, text: t.rollen[1].text },
    { icon: Sprout, titel: t.rollen[2].titel, wert: nullEuro, text: t.rollen[2].text },
  ];
  const anteilMax = PROVISION.verkaeufer.max * 100;
  return (
    <section data-abschnitt="provision" aria-labelledby="provision-titel" className="bg-white py-20 md:py-28">
      <div className="ov-container">
        <div className="grid gap-10 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)] lg:gap-16">
          <SectionHeading
            eyebrow={t.eyebrow}
            title={<span id="provision-titel">{t.titel}</span>}
            lead={t.lead}
          />

          <div className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-3">
              {rollen.map((k, i) => (
                <Reveal key={k.titel} delay={i * 70} className={cn("relative overflow-hidden rounded-3xl p-5", k.hervor ? "bg-ov-700 text-white" : "bg-sand-50 ring-1 ring-ink-200/70")}>
                  {k.hervor && <div aria-hidden="true" className="pointer-events-none absolute -right-12 -top-12 h-36 w-36 rounded-full bg-ov-400/40 blur-2xl" />}
                  <div className="relative flex items-center gap-2">
                    <k.icon aria-hidden="true" className={cn("h-4 w-4", k.hervor ? "text-ov-200" : "text-ov-600")} />
                    <p className={cn("text-[13px] font-semibold", k.hervor ? "text-white/90" : "text-ink-600")}>{k.titel}</p>
                  </div>
                  <p className="ov-kpi relative mt-3">{k.wert}</p>
                  <p className={cn("relative mt-1.5 text-[13.5px] leading-relaxed", k.hervor ? "text-white/85" : "text-ink-600")}>{k.text}</p>
                </Reveal>
              ))}
            </div>

            {/* Beispielrechnung */}
            <Reveal delay={200} className="rounded-3xl bg-white p-5 shadow-e2 ring-1 ring-ink-200/70 sm:p-6">
              <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                <p className="text-[12px] font-semibold uppercase tracking-[0.14em] text-ink-500">{t.beispiel}</p>
                <p className="text-[13px] text-ink-600">
                  {werte ? (
                    <>
                      {t.baureifZu(BEISPIEL.mwp, z(BEISPIEL.preis))}{!l && <> <GiltFuer /></>}
                    </>
                  ) : (
                    t.baureif(BEISPIEL.mwp)
                  )}
                </p>
              </div>
              <p className="ov-num mt-2 font-display text-[26px] font-extrabold tracking-tight text-ink-900">
                {werte ? eur(kaufpreis) : saetze} <span className="text-[14px] font-bold text-ink-500">{werte ? t.kaufpreis : t.desKaufpreises}</span>
              </p>
              <div className="relative mt-4 h-4 overflow-hidden rounded-full bg-ov-100" aria-hidden="true">
                <span className="absolute inset-y-0 right-0 bg-sun-400" style={{ width: `${anteilMax * 4}%` }} />
                <span className="absolute inset-y-0 right-0 bg-sun-500" style={{ width: `${(PROVISION.verkaeufer.min * 100) * 4}%` }} />
              </div>
              <div className="mt-2 flex justify-between gap-4 text-[12px] text-ink-500" aria-hidden="true">
                <span>{t.anVerkaeufer}</span>
                <span>{t.vergroessert}</span>
              </div>
              <p className="mt-4 border-t border-ink-100 pt-4 text-[14px] leading-relaxed text-ink-700">
                {werte ? (
                  <>
                    {t.provVon} <strong className="font-semibold text-ink-900">{eur(kaufpreis * PROVISION.verkaeufer.min)}</strong> {t.bis} <strong className="font-semibold text-ink-900">{eur(kaufpreis * PROVISION.verkaeufer.max)}</strong> {t.traegt}
                  </>
                ) : (
                  <>
                    {t.provVon} <strong className="font-semibold text-ink-900">{saetze}</strong> {t.traegtSatz} <span data-land-hinweis={l}>{en ? landHinweisTextEn(l, t.thema) : landHinweisText(l, t.thema)}.</span>
                  </>
                )}{" "}
                {t.sieZahlen} <strong className="font-semibold text-ov-700">{en ? "€0" : "0\u00a0€"}</strong>.
              </p>
            </Reveal>
          </div>
        </div>

        {/* Werkzeuge */}
        <div className="mt-16 md:mt-20">
          <div className="mb-5 flex flex-wrap items-end justify-between gap-x-6 gap-y-1">
            <h3 className="ov-h3 text-ink-900">{t.selbst}</h3>
            <p className="text-[14px] text-ink-500">{t.zwei}</p>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            {t.werkzeuge.map((w) => (
              <Link
                key={w.href}
                href={w.href}
                className="group relative isolate flex items-start gap-5 overflow-hidden rounded-3xl bg-white p-6 shadow-e1 ring-1 ring-ink-200/70 transition-[box-shadow,transform] duration-300 hover:shadow-e3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ov-500 motion-safe:hover:-translate-y-1 md:p-7"
              >
                <span aria-hidden="true" className="pointer-events-none absolute -right-16 -top-16 -z-10 h-44 w-44 rounded-full bg-ov-200/50 opacity-60 blur-3xl transition-opacity duration-300 group-hover:opacity-100" />
                <span aria-hidden="true" className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-ov-50 text-ov-700 ring-1 ring-inset ring-ov-200 transition-colors group-hover:bg-ov-600 group-hover:text-white">
                  <w.icon className="h-5 w-5" strokeWidth={1.8} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-center justify-between gap-3 font-display text-[19px] font-bold text-ink-900">
                    {w.titel}
                    <ArrowUpRight aria-hidden="true" className="h-5 w-5 shrink-0 text-ink-400 transition-colors group-hover:text-ov-700" />
                  </span>
                  <span className="mt-1.5 block text-[14.5px] leading-relaxed text-ink-600">{w.text}</span>
                </span>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
