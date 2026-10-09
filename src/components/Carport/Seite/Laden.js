// Ladeinfrastruktur & GEIG: Text, Ladeoptionen und eine Stellplatz-Skizze zur GEIG-Regel (jeder 3. Stellplatz vorbereitet, mind. 1 Ladepunkt)
import { BatteryCharging, PlugZap, Sun, Zap } from "lucide-react";
import Section from "@/components/ui/Section";
import { GiltFuer } from "@/components/Land/LandHinweis";
import Link from "@/components/Land/Link";
import { LAENDER, landCode, landHinweisText, landHinweisTextEn } from "@/lib/land";
import { spracheDerAnfrage } from "@/lib/land/seite";
import { uebersetze } from "@/lib/sprache/woerterbuch";
import Reveal from "@/components/ui/Reveal";
import Kopf from "@/components/Energie/Seite/Kopf";
import { cn } from "@/components/ui/cn";

/** Sprachmodell: Texte des Abschnitts (en nur Texte). */
const W = {
  de: {
    skizzeTitel: "Neubau, 12 Stellplätze – was das GEIG verlangt",
    prinzip: "Prinzipskizze",
    skizzeLabel: "Stellplätze: jeder dritte mit Leitungsinfrastruktur, einer mit Ladepunkt",
    platz: (n, art) => `Stellplatz ${n}: ${art}`,
    arten: { laden: "Ladepunkt", leitung: "Leitungsinfrastruktur", ohne: "ohne Vorgabe" },
    legendeLaden: "mindestens 1 Ladepunkt",
    legendeLeitung: "Leitung für jeden 3. Stellplatz",
    kachelnDe: [
      { k: "Leitungsinfrastruktur", v: "jeder 3. Stellplatz", t: "Neubau Nichtwohngebäude, > 6 Stellplätze" },
      { k: "Mindestens", v: "1 Ladepunkt", t: "Bestand Nichtwohngebäude, > 20 Stellplätze, seit 2025" },
    ],
    kachelnLand: [
      { k: "Ladeleistung", v: "AC & DC", t: "11/22 kW bis 150 kW je Ladepunkt" },
      { k: "Lastmanagement", v: "Solar zuerst", t: "Netzanschluss nicht überlasten" },
    ],
    kachelnAlle: [
      { k: "Speicher", v: "optional", t: "mehr Eigenverbrauch, Lastspitzen kappen" },
      { k: "Gleichzeitigkeit", v: "tagsüber", t: "wenn Fahrzeuge stehen und die Sonne scheint" },
    ],
    optionen: (de, ac, dc) => [
      { titel: "AC 11/22 kW", text: de ? `ab rund ${ac} je Ladepunkt` : "Kosten je Ladepunkt auf Anfrage", fuer: "Mitarbeiter und Dienstwagen, die Stunden stehen" },
      { titel: "DC 50–150 kW", text: de ? `ab rund ${dc} je Lader, ohne Netzausbau` : "Kosten je Lader auf Anfrage", fuer: "Kunden, Flotten mit kurzen Standzeiten, öffentliches Laden" },
      { titel: "Lastmanagement", text: "Solarstrom zuerst, Netzanschluss nicht überlasten", fuer: "verteilt die verfügbare Leistung auf die Ladepunkte" },
    ],
    eyebrowDe: "Ladeinfrastruktur & GEIG",
    eyebrow: "Ladeinfrastruktur",
    titelA: "Solarstrom ",
    titelB: "direkt ins Auto.",
    lead: "AC-Ladepunkte mit 11 oder 22 kW reichen für Mitarbeiter und Dienstwagen, die Stunden stehen. DC-Schnelllader mit 50 bis 150 kW lohnen sich für Kunden, Flotten mit kurzen Standzeiten und öffentliches Laden – brauchen aber mehr Netzanschlussleistung.",
    last: "Ein Lastmanagement verteilt die verfügbare Leistung auf die Ladepunkte und bevorzugt Solarstrom.",
    geig: "Das GEIG verlangt bei neuen Nichtwohngebäuden mit mehr als sechs Stellplätzen Leitungsinfrastruktur für jeden dritten Stellplatz und mindestens einen Ladepunkt; bestehende Nichtwohngebäude mit mehr als 20 Stellplätzen brauchen seit 2025 mindestens einen Ladepunkt.",
    pflichtenTitel: (l) => `Pflichten für Ladepunkte ${LAENDER[l].inLand}`,
    pflichtenText: (l) => `${landHinweisText(l, "Pflichten für Ladepunkte auf Parkplätzen")}.`,
    anfragen: "Persönlich anfragen",
  },
  en: {
    skizzeTitel: "New building, 12 parking spaces – what the GEIG requires",
    prinzip: "Schematic",
    skizzeLabel: "Parking spaces: every third with cabling infrastructure, one with a charging point",
    platz: (n, art) => `Parking space ${n}: ${art}`,
    arten: { laden: "charging point", leitung: "cabling infrastructure", ohne: "no requirement" },
    legendeLaden: "at least 1 charging point",
    legendeLeitung: "cabling for every 3rd space",
    kachelnDe: [
      { k: "Cabling infrastructure", v: "every 3rd space", t: "new non-residential building, > 6 spaces" },
      { k: "At least", v: "1 charging point", t: "existing non-residential building, > 20 spaces, since 2025" },
    ],
    kachelnLand: [
      { k: "Charging power", v: "AC & DC", t: "11/22 kW to 150 kW per charging point" },
      { k: "Load management", v: "Solar first", t: "without overloading the grid connection" },
    ],
    kachelnAlle: [
      { k: "Storage", v: "optional", t: "more self-consumption, peak shaving" },
      { k: "Simultaneity", v: "daytime", t: "when vehicles are parked and the sun is shining" },
    ],
    optionen: (de, ac, dc) => [
      { titel: "AC 11/22 kW", text: de ? `from around ${ac} per charging point` : "Cost per charging point on request", fuer: "Employees and company cars parked for hours" },
      { titel: "DC 50–150 kW", text: de ? `from around ${dc} per charger, excluding grid reinforcement` : "Cost per charger on request", fuer: "Customers, fleets with short dwell times, public charging" },
      { titel: "Load management", text: "Solar power first, without overloading the grid connection", fuer: "distributes the available power across the charging points" },
    ],
    eyebrowDe: "Charging infrastructure & GEIG",
    eyebrow: "Charging infrastructure",
    titelA: "Solar power ",
    titelB: "straight into the car.",
    lead: "AC charging points with 11 or 22 kW are enough for employees and company cars that are parked for hours. DC fast chargers with 50 to 150 kW pay off for customers, fleets with short dwell times and public charging – but need more grid connection capacity.",
    last: "Load management distributes the available power across the charging points and gives priority to solar power.",
    geig: "The GEIG (German Building Electromobility Infrastructure Act) requires new non-residential buildings with more than six parking spaces to have cabling infrastructure for every third space and at least one charging point; existing non-residential buildings with more than 20 parking spaces have needed at least one charging point since 2025.",
    pflichtenTitel: (l) => `Obligations for charging points ${LAENDER[l].en.inLand}`,
    pflichtenText: (l) => `${landHinweisTextEn(l, "Obligations for charging points on car parks")}.`,
    anfragen: "Ask us directly",
  },
};

function GeigSkizze({ w }) {
  const plaetze = Array.from({ length: 12 }, (_, i) => i + 1);
  return (
    <figure className="rounded-[1.75rem] bg-white/[0.04] p-5 ring-1 ring-white/10 sm:p-6">
      <figcaption className="flex flex-wrap items-baseline justify-between gap-2">
        <span className="font-display text-[17px] font-bold text-white">{w.skizzeTitel}</span>
        <span className="text-[12px] text-white/55">{w.prinzip}</span>
      </figcaption>
      <ul className="mt-5 grid grid-cols-6 gap-2" aria-label={w.skizzeLabel}>
        {plaetze.map((n) => {
          const laden = n === 3;
          const leitung = n % 3 === 0;
          return (
            <li
              key={n}
              className={cn(
                "relative flex aspect-[3/4] flex-col items-center justify-end rounded-lg border-2 border-dashed pb-1.5 text-[10.5px] font-semibold",
                laden ? "border-ov-400 bg-ov-500/25 text-ov-100" : leitung ? "border-navy-300/70 bg-navy-400/15 text-navy-100" : "border-white/15 text-white/35"
              )}
            >
              {laden ? <PlugZap aria-hidden="true" className="mb-auto mt-2 h-4 w-4 text-ov-300" /> : leitung ? <Zap aria-hidden="true" className="mb-auto mt-2 h-4 w-4 text-navy-200" /> : null}
              <span className="sr-only">{w.platz(n, laden ? w.arten.laden : leitung ? w.arten.leitung : w.arten.ohne)}</span>
              <span aria-hidden="true">{n}</span>
            </li>
          );
        })}
      </ul>
      <ul className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-[12.5px] text-white/75">
        <li className="inline-flex items-center gap-2">
          <span aria-hidden="true" className="h-3 w-3 rounded-[3px] border-2 border-dashed border-ov-400 bg-ov-500/40" /> {w.legendeLaden}
        </li>
        <li className="inline-flex items-center gap-2">
          <span aria-hidden="true" className="h-3 w-3 rounded-[3px] border-2 border-dashed border-navy-300 bg-navy-400/30" /> {w.legendeLeitung}
        </li>
      </ul>
    </figure>
  );
}

export default function Laden({ ac, dc, land = null }) {
  // GEIG und Kostenwerte gelten für Deutschland: gemeinsam mit Vermerk, in AT/CH ohne GEIG und ohne Werte
  const l = landCode(land);
  const de = !l || l === "DE";
  const w = uebersetze(W, spracheDerAnfrage());
  const zwei = de ? w.kachelnDe : w.kachelnLand;
  const KACHELN = [
    { icon: PlugZap, ...zwei[0] },
    { icon: Zap, ...zwei[1] },
    { icon: BatteryCharging, ...w.kachelnAlle[0] },
    { icon: Sun, ...w.kachelnAlle[1] },
  ];
  const OPTIONEN = w.optionen(de, ac, dc);
  return (
    <Section tone="navy" space="lg" bare data-abschnitt="laden" aria-labelledby="laden-titel" className="ov-verlauf-nacht ov-noise overflow-hidden">
      <div aria-hidden="true" className="ov-grid-bg pointer-events-none absolute inset-0 opacity-60 [mask-image:radial-gradient(60%_50%_at_80%_20%,#000,transparent)]" />
      <div className="ov-container relative">
        <div className="grid gap-12 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:gap-16">
          <div>
            <Kopf
              dark
              id="laden-titel"
              eyebrow={de ? w.eyebrowDe : w.eyebrow}
              titel={
                <>
                  {w.titelA}<span className="ov-text-gradient-light">{w.titelB}</span>
                </>
              }
              lead={w.lead}
            />
            <Reveal className="mt-6">
              <p className="text-[15.5px] leading-relaxed text-white/70">
                {w.last}{" "}
                {de ? (
                  <>
                    {w.geig}
                    {!l && (
                      <>
                        {" "}
                        <GiltFuer dunkel />
                      </>
                    )}
                  </>
                ) : null}
              </p>
            </Reveal>
            <ul className="mt-8 grid gap-3">
              {OPTIONEN.map((o, i) => (
                <Reveal as="li" key={o.titel} delay={i * 60} className="flex items-start gap-4 rounded-2xl bg-white/[0.05] p-4 ring-1 ring-white/10">
                  <span aria-hidden="true" className="ov-num flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-ov-400/15 text-[13px] font-bold text-ov-300 ring-1 ring-ov-300/30">
                    {i + 1}
                  </span>
                  <div className="min-w-0">
                    <p className="font-display text-[17px] font-bold text-white">{o.titel}</p>
                    <p className="text-[14.5px] text-white/75">{o.text}</p>
                    <p className="mt-0.5 text-[13px] text-white/55">{o.fuer}</p>
                  </div>
                </Reveal>
              ))}
            </ul>
          </div>

          <div className="min-w-0 lg:pt-4">
            <Reveal dir="scale">
              {de ? (
                <GeigSkizze w={w} />
              ) : (
                <div className="rounded-[1.75rem] bg-white/[0.04] p-5 ring-1 ring-white/10 sm:p-6" data-land-hinweis={l}>
                  <p className="font-display text-[17px] font-bold text-white">{w.pflichtenTitel(l)}</p>
                  <p className="mt-3 text-[15px] leading-relaxed text-white/70">{w.pflichtenText(l)}</p>
                  <Link href="/kontakt" className="mt-4 inline-block text-[15px] font-semibold text-ov-300 underline underline-offset-2 hover:text-white">
                    {w.anfragen}
                  </Link>
                </div>
              )}
            </Reveal>
            <dl className="mt-4 grid grid-cols-2 gap-3 sm:gap-4">
              {KACHELN.map((x, i) => (
                <Reveal key={i} delay={i * 50} className="rounded-2xl bg-white/[0.05] p-4 ring-1 ring-white/10 sm:p-5">
                  <dt className="flex items-center gap-2 text-[12.5px] text-white/60">
                    <x.icon aria-hidden="true" className="h-4 w-4 shrink-0 text-ov-300" />
                    {x.k}
                  </dt>
                  <dd>
                    <span className="mt-2 block font-display text-[18px] font-extrabold leading-tight text-white sm:text-[20px]">{x.v}</span>
                    <span className="mt-1 block text-[12.5px] leading-snug text-white/60">{x.t}</span>
                  </dd>
                </Reveal>
              ))}
            </dl>
          </div>
        </div>
      </div>
    </Section>
  );
}
