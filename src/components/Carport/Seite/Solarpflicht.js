// Solarpflicht für Parkplätze: Schwellen als Balkenvergleich + vollständige Tabelle (Daten aus der Seite)
import Link from "@/components/Land/Link";
import { ArrowUpRight, CircleSlash } from "lucide-react";
import Section from "@/components/ui/Section";
import Reveal from "@/components/ui/Reveal";
import Kopf from "@/components/Energie/Seite/Kopf";
import { GiltFuer, LandHinweis } from "@/components/Land/LandHinweis";
import { landCode, landHinweisText, landHinweisTextEn } from "@/lib/land";
import { spracheDerAnfrage } from "@/lib/land/seite";
import { uebersetze } from "@/lib/sprache/woerterbuch";

/** Sprachmodell: feste Texte (Tabelleninhalt kommt übersetzt von der Seite). */
const W = {
  de: {
    eyebrow: "Solarpflicht",
    titel: "Welche Länder Photovoltaik auf Parkplätzen verlangen.",
    leadAt: "In Österreich regeln die Bundesländer Solarpflichten in ihren Bau- und Energiegesetzen unterschiedlich.",
    leadCh: "In der Schweiz regeln die Kantone die Energievorschriften für Gebäude.",
    thema: "Solarpflichten für Parkplätze",
    lead: (stand) => `In acht Bundesländern gilt eine Solarpflicht für neue Parkplätze – mit unterschiedlichen Schwellen, Stichtagen und Ausnahmen. Ein Überblick, Stand ${stand}.`,
    abWie: "Ab wie vielen Stellplätzen?",
    schwelle: "Schwelle für neue Parkplätze",
    achse: "80 Stellplätze",
    lesart: "„> 35“ heißt mehr als 35 Stellplätze. Kürzeste Lesart je Land; Einzelheiten in der Tabelle unten.",
    ohneTitel: "Keine Parkplatzpflicht nach aktuellem Stand",
    ratgeber: "Ratgeber",
    ratgeberTitel: "Solarpflicht für Parkplätze: Details, Rechtsgrundlagen und Ausnahmen",
    region: "Solarpflicht für Parkplätze nach Bundesland",
    caption: (stand) => `Solarpflicht für neue Parkplätze nach Bundesland, Stand ${stand}`,
    kopf: ["Land", "Stellplätze", "Umfang", "Gilt"],
    fuss: "Eigene Zusammenstellung aus Landesrecht, ohne Gewähr. Stichtage beziehen sich meist auf den Bauantrag; Ausnahmen gibt es u. a. bei Unwirtschaftlichkeit oder fehlendem Netzanschluss. Landesrecht ändert sich häufig – vor der Planung den aktuellen Stand prüfen.",
  },
  en: {
    eyebrow: "Solar obligation",
    titel: "Which states require photovoltaics on car parks.",
    leadAt: "In Austria, the federal states regulate solar obligations differently in their building and energy laws.",
    leadCh: "In Switzerland, the cantons regulate the energy requirements for buildings.",
    thema: "Solar obligations for car parks",
    lead: (stand) => `Eight German federal states have a solar obligation for new car parks – with different thresholds, effective dates and exemptions. An overview, as of ${stand}.`,
    abWie: "From how many parking spaces?",
    schwelle: "Threshold for new car parks",
    achse: "80 spaces",
    lesart: "“> 35” means more than 35 parking spaces. Shortest reading per state; details in the table below.",
    ohneTitel: "No car park obligation at present",
    ratgeber: "Guide",
    ratgeberTitel: "Solar obligation for car parks: details, legal bases and exemptions",
    region: "Solar obligation for car parks by federal state",
    caption: (stand) => `Solar obligation for new car parks by federal state, as of ${stand}`,
    kopf: ["State", "Parking spaces", "Scope", "Applies"],
    fuss: "Our own compilation from state law, without guarantee. Effective dates usually refer to the building application; exemptions exist, among other things, where it is uneconomical or there is no grid connection. State law changes frequently – check the current position before planning.",
  },
};

/**
 * pflicht: [[land, schwelle, umfang, seit]]
 * schwellen: [{ land, wert, label }] – Zahl der Stellplätze, ab der die Pflicht greift (aus der Tabelle abgeleitet)
 * ohne: Text der Länder ohne Parkplatzpflicht
 */
export default function Solarpflicht({ pflicht, schwellen, ohne, stand, land = null }) {
  // Die Übersicht ist deutsches Landesrecht: gemeinsam mit Vermerk, in AT/CH LandHinweis statt Tabelle
  const l = landCode(land);
  const sprache = spracheDerAnfrage();
  const w = uebersetze(W, sprache);
  if (l && l !== "DE") {
    return (
      <Section tone="sand" space="lg" id="solarpflicht" data-abschnitt="solarpflicht" aria-labelledby="solarpflicht-titel" className="scroll-mt-24">
        <Kopf
          id="solarpflicht-titel"
          eyebrow={w.eyebrow}
          titel={w.titel}
          lead={l === "AT" ? w.leadAt : w.leadCh}
          className="mb-12 md:mb-14"
        />
        <Reveal>
          <LandHinweis
            land={l}
            thema={W.de.thema}
            themaEn={W.en.thema}
            text={`${landHinweisText(l, W.de.thema)}. Wir prüfen die Lage im Einzelfall.`}
            textEn={`${landHinweisTextEn(l, W.en.thema)}. We assess the situation case by case.`}
          />
        </Reveal>
      </Section>
    );
  }
  const max = 80;
  const sortiert = [...schwellen].sort((a, b) => a.wert - b.wert);
  return (
    <Section tone="sand" space="lg" id="solarpflicht" data-abschnitt="solarpflicht" aria-labelledby="solarpflicht-titel" className="scroll-mt-24">
      <Kopf
        id="solarpflicht-titel"
        eyebrow={w.eyebrow}
        titel={w.titel}
        lead={
          <>
            {w.lead(stand)}
            {!l && (
              <>
                {" "}
                <GiltFuer />
              </>
            )}
          </>
        }
        className="mb-12 md:mb-14"
      />

      <div className="grid gap-5 lg:grid-cols-[1.25fr_0.75fr]">
        <Reveal as="figure" className="rounded-[2rem] bg-white p-6 shadow-e2 ring-1 ring-ink-200/70 sm:p-8">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <figcaption className="font-display text-[19px] font-bold text-ink-900">{w.abWie}</figcaption>
            <p className="text-[12.5px] text-ink-500">{w.schwelle}</p>
          </div>
          <ul className="mt-6 space-y-3">
            {sortiert.map((s) => (
              <li key={s.land} className="grid items-center gap-1 sm:grid-cols-[11rem_minmax(0,1fr)] sm:gap-3">
                <span className="truncate text-[14px] font-semibold text-ink-800">{s.land}</span>
                <span className="flex items-center gap-2">
                  <span className="relative h-7 flex-1 rounded-lg bg-sand-100">
                    <span
                      aria-hidden="true"
                      className="absolute inset-y-0 left-0 rounded-lg bg-gradient-to-r from-ov-500 to-ov-400"
                      style={{ width: `${(s.wert / max) * 100}%` }}
                    />
                    <span
                      className={`ov-num absolute inset-y-0 flex items-center text-[12.5px] font-bold ${s.wert / max > 0.7 ? "pr-2 text-white" : "pl-2 text-ink-900"}`}
                      style={s.wert / max > 0.7 ? { right: `${100 - (s.wert / max) * 100}%` } : { left: `${(s.wert / max) * 100}%` }}
                    >
                      {s.label}
                    </span>
                  </span>
                </span>
              </li>
            ))}
          </ul>
          <div aria-hidden="true" className="mt-3 grid gap-3 text-[11.5px] text-ink-400 sm:grid-cols-[11rem_minmax(0,1fr)]">
            <span className="max-sm:hidden" />
            <span className="flex justify-between">
              <span>0</span>
              <span>40</span>
              <span>{w.achse}</span>
            </span>
          </div>
          <p className="mt-5 text-[12.5px] leading-relaxed text-ink-500">{w.lesart}</p>
        </Reveal>

        <div className="grid gap-5">
          <Reveal delay={60} className="rounded-[2rem] bg-white p-6 ring-1 ring-ink-200/70 sm:p-7">
            <span aria-hidden="true" className="flex h-11 w-11 items-center justify-center rounded-2xl bg-ink-50 text-ink-500 ring-1 ring-ink-200">
              <CircleSlash className="h-5 w-5" />
            </span>
            <h3 className="mt-4 font-display text-[18px] font-bold text-ink-900">{w.ohneTitel}</h3>
            <p className="mt-2 text-[15px] leading-relaxed text-ink-600">{ohne}.</p>
          </Reveal>
          <Reveal delay={120} className="relative overflow-hidden rounded-[2rem] bg-navy-950 p-6 text-white sm:p-7">
            <div aria-hidden="true" className="absolute -right-12 -top-12 h-40 w-40 rounded-full bg-ov-500/25 blur-3xl" />
            <p className="ov-overline relative text-ov-300">{w.ratgeber}</p>
            <h3 className="relative mt-2 font-display text-[18px] font-bold leading-snug">
              <Link href="/ratgeber/parkplatz-solarpflicht-bundeslaender" className="group inline-flex items-start gap-2 rounded outline-none after:absolute after:inset-0 after:content-[''] focus-visible:ring-2 focus-visible:ring-ov-300">
                {w.ratgeberTitel}
                <ArrowUpRight aria-hidden="true" className="mt-1 h-4 w-4 shrink-0 text-ov-300 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
              </Link>
            </h3>
          </Reveal>
        </div>
      </div>

      <Reveal className="mt-5 min-w-0">
        <div tabIndex={0} role="region" aria-label={w.region} className="overflow-x-auto rounded-[2rem] bg-white ring-1 ring-ink-200/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ov-500">
          <table className="w-full min-w-[720px] text-left text-[14.5px]">
            <caption className="sr-only">{w.caption(stand)}</caption>
            <thead className="bg-sand-100 text-[12px] uppercase tracking-[0.12em] text-ink-600">
              <tr>
                {w.kopf.map((k) => (
                  <th key={k} scope="col" className="px-6 py-3.5 font-semibold">{k}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-ink-100">
              {pflicht.map(([land, schwelle, umfang, seit]) => (
                <tr key={land} className="transition-colors hover:bg-sand-50">
                  <th scope="row" className="px-6 py-3.5 font-semibold text-ink-900">{land}</th>
                  <td className="px-6 py-3.5 text-ink-700">{schwelle}</td>
                  <td className="px-6 py-3.5 text-ink-600">{umfang}</td>
                  <td className="whitespace-nowrap px-6 py-3.5 text-ink-500">{seit}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-3 text-[12.5px] leading-relaxed text-ink-500">
          {w.fuss}
        </p>
      </Reveal>
    </Section>
  );
}
