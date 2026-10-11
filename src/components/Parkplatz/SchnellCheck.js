"use client";

// src/components/Parkplatz/SchnellCheck.js – Parkplatz-Hub (Welle 4): Schnell-Check Solarpflicht & Potenzial
//
// Drei Angaben (Stellplätze, Standort, Situation) → Pflicht ja/nein/unklar MIT Rechtsgrundlage und
// Quelle, Potenzial in kWp (belegte Flächenannahme je Stellplatz) und Ladepunkte nach GEIG.
// Logik ausschließlich in src/lib/rechner/parkplatz.js; der Bericht wird serverseitig neu gerechnet
// (src/lib/bericht/parkplatz.js). Ergebnis bleibt immer frei sichtbar – kein Sperren.
// Sprachmodell: Bedienung DE/EN über Wörterbuch; AT/CH ehrlich „unklar“ ohne erfundene Regeln.

import { useId, useMemo, useState } from "react";
import { BatteryCharging, CheckCircle2, CircleAlert, ExternalLink, HelpCircle, Sun } from "lucide-react";
import Link from "@/components/Land/Link";
import { Auswahl, Regler } from "@/components/Rechner/bausteine";
import { auswahlKlasse } from "@/components/formular/stil";
import BerichtAnfordern from "@/components/Bericht/BerichtAnfordern";
import { useSprache } from "@/components/Sprache/SpracheKontext";
import { useFormate } from "@/components/Sprache/useFormate";
import { cn } from "@/components/ui/cn";
import { GiltFuer } from "@/components/Land/LandHinweis";
import { parkplatzCheck, PFLICHT_STAND } from "@/lib/rechner/parkplatz";
import { META } from "@/data/regionen/meta";
import { pfad } from "@/lib/land";

const DE_LAENDER = META.filter((r) => r.land === "DE").map((r) => ({ slug: r.slug, name: r.name })).sort((a, b) => a.name.localeCompare(b.name, "de"));

const W = {
  de: {
    stellplaetze: "Stellplätze",
    bundesland: "Bundesland",
    waehlen: "Bitte wählen",
    situation: "Situation",
    situationen: [
      { id: "neubau", label: "Neubau" },
      { id: "erweiterung", label: "Erweiterung" },
      { id: "sanierung", label: "Sanierung" },
      { id: "bestand", label: "Bestand" },
    ],
    betreiber: "Betreiber",
    betreiberOpt: [
      { id: "gewerblich", label: "Unternehmen / Handel", sub: "gewerblich" },
      { id: "oeffentlich", label: "Kommune / öffentlich", sub: "öffentliche Hand" },
    ],
    status: { ja: "Solarpflicht greift voraussichtlich", nein: "Keine Solarpflicht nach aktuellem Stand", unklar: "Im Einzelfall zu prüfen" },
    quelle: "Quelle",
    stand: `Stand ${PFLICHT_STAND} · keine Rechtsberatung; maßgeblich ist der Gesetzestext beim Bauantrag.`,
    potenzial: "PV-Potenzial bei voller Überdachung",
    kwpJe: (x) => `Annahme ${x} kWp je Stellplatz (2,5 × 5 m)`,
    mindest: "Pflichtumfang, grobe Orientierung",
    mindestZusatz: (p) => `${p} % der geeigneten Fläche – maßgeblich ist die Fläche, nicht die Leistung`,
    laden: "Laden & Carport kombinieren",
    geigKeins: "Unter den GEIG-Schwellen – Ladepunkte lohnen trotzdem, wenn Fahrzeuge tagsüber stehen.",
    geigBestand: (p) => `Bestand mit mehr als 20 Stellplätzen: seit 01.01.2025 mindestens ein Ladepunkt (${p}). Der Solarcarport ist die naheliegende Stelle dafür.`,
    geig: (je, n, p) => `Leitungsinfrastruktur für jeden ${je}. Stellplatz (≈ ${n} Stellplätze) und mindestens ein Ladepunkt (${p}) – beim Carport-Bau gleich mitverlegt, spart das Tiefbau.`,
    rechner: "Wirtschaftlichkeit im Carport-Rechner durchspielen",
    ausblick: "Ausblick 2030",
  },
  en: {
    stellplaetze: "Parking spaces",
    bundesland: "Federal state",
    waehlen: "Please choose",
    situation: "Situation",
    situationen: [
      { id: "neubau", label: "New build" },
      { id: "erweiterung", label: "Extension" },
      { id: "sanierung", label: "Renovation" },
      { id: "bestand", label: "Existing" },
    ],
    betreiber: "Operator",
    betreiberOpt: [
      { id: "gewerblich", label: "Business / retail", sub: "commercial" },
      { id: "oeffentlich", label: "Municipality / public", sub: "public sector" },
    ],
    status: { ja: "Solar obligation likely applies", nein: "No solar obligation at present", unklar: "To be assessed case by case" },
    quelle: "Source",
    stand: `As of ${PFLICHT_STAND} · not legal advice; the legal text at the time of the building application is authoritative.`,
    potenzial: "PV potential with full coverage",
    kwpJe: (x) => `assumption ${x} kWp per parking space (2.5 × 5 m)`,
    mindest: "Required scope, rough guide",
    mindestZusatz: (p) => `${p} % of the suitable area – the area is authoritative, not the capacity`,
    laden: "Combining charging & carport",
    geigKeins: "Below the GEIG thresholds – charging points are still worthwhile where vehicles are parked during the day.",
    geigBestand: (p) => `Existing car parks with more than 20 spaces: at least one charging point since 1 January 2025 (${p}). A solar carport is the obvious place for it.`,
    geig: (je, n, p) => `Cabling infrastructure for every ${je}rd/th space (≈ ${n} spaces) and at least one charging point (${p}) – laid during carport construction, this saves civil works.`,
    rechner: "Run the economics in the carport calculator",
    ausblick: "Outlook 2030",
    // Gleiche Aussage wie GMODG_2030.text (src/lib/rechner/parkplatz.js), übersetzt
    ausblickText:
      "Nationwide from 1 January 2030: solar installations are mandatory on new covered car parks physically adjoining a building (§ 106 GModG, implementing the EU buildings directive). The federal rule does not cover open car parks; stricter state rules remain permissible.",
  },
};

/** Ergebnistext je Code (DE geprüfte Fassung, EN gleiche Aussage) */
function pflichtText(code, r, en) {
  const s = r ? (r.art === "ab" ? (en ? `from ${r.schwelle}` : `ab ${r.schwelle}`) : en ? `more than ${r.schwelle}` : `mehr als ${r.schwelle}`) : "";
  const T = {
    at: en
      ? "As far as we know, Austria has no comprehensive solar obligation for car parks; the federal states regulate solar obligations differently in their building and energy laws. We assess your site case by case."
      : "Für Österreich ist uns nach aktuellem Stand keine flächendeckende Solarpflicht für Parkplätze bekannt; die Bundesländer regeln Solarpflichten in ihren Bau- und Energiegesetzen unterschiedlich. Wir prüfen Ihren Standort im Einzelfall.",
    ch: en
      ? "As far as we know, Switzerland has no general solar obligation for car parks; many cantons require new buildings to generate their own electricity. We assess your site case by case."
      : "Für die Schweiz ist uns nach aktuellem Stand keine allgemeine Solarpflicht für Parkplätze bekannt; viele Kantone verlangen bei Neubauten Eigenstromerzeugung am Gebäude. Wir prüfen Ihren Standort im Einzelfall.",
    "keine-pflicht": en ? `${r?.name} currently has no solar obligation for car parks (${r?.grundlage}).` : `${r?.name} kennt nach aktuellem Stand keine Solarpflicht für Parkplätze (${r?.grundlage}).`,
    aufgehoben: en ? `Brandenburg repealed its car park obligation (${r?.grundlage}).` : `In Brandenburg wurde die Parkplatzpflicht wieder aufgehoben (${r?.grundlage}).`,
    bestand: en
      ? `No solar obligation for existing car parks without construction work in ${r?.name} – the obligation (${r?.grundlage}) applies to new car parks.`
      : `Für Bestandsparkplätze ohne Baumaßnahme gilt in ${r?.name} keine Solarpflicht – die Pflicht (${r?.grundlage}) knüpft an neue Parkplätze an.`,
    "sanierung-keine": en
      ? `The obligation in ${r?.name} (${r?.grundlage}) applies to new car parks; a renovation alone does not trigger it at present.`
      : `Die Pflicht in ${r?.name} (${r?.grundlage}) stellt auf neue Parkplätze ab; eine Sanierung allein löst sie nach aktuellem Stand nicht aus.`,
    "unter-schwelle": en
      ? `Your car park is below the threshold of ${s} spaces (${r?.grundlage}) – the solar obligation is unlikely to apply.`
      : `Ihr Parkplatz liegt unter der Schwelle von ${s} Stellplätzen (${r?.grundlage}) – die Solarpflicht greift voraussichtlich nicht.`,
    "erweiterung-unklar": en
      ? `The obligation in ${r?.name} (${r?.grundlage}) applies to new car parks; whether an extension is covered depends on the individual case – we clarify this with you.`
      : `Die Pflicht in ${r?.name} (${r?.grundlage}) stellt auf neue Parkplätze ab; ob eine Erweiterung erfasst ist, hängt vom Einzelfall ab – das klären wir mit Ihnen.`,
    erweiterung: en
      ? `Extensions are expressly covered in ${r?.name}: solar obligation from ${s} spaces (${r?.grundlage}), scope: ${r?.umfang}.`
      : `Die Erweiterung ist in ${r?.name} ausdrücklich erfasst: Solarpflicht ab ${s} Stellplätzen (${r?.grundlage}), Umfang: ${r?.umfang}.`,
    sanierung: en
      ? `In ${r?.name} the obligation also applies to major renovations – from ${s} spaces (${r?.grundlage}).`
      : `In ${r?.name} greift die Pflicht ${r?.sanierungText || "auch bei grundlegender Sanierung"} – ab ${s} Stellplätzen (${r?.grundlage}).`,
    "ueber-schwelle": en
      ? `In ${r?.name} the solar obligation applies to new car parks from ${s}${r?.oeffentlichOhneSchwelle ? " commercially used" : ""} spaces${r?.oeffentlichOhneSchwelle ? " and to public car parks regardless of the threshold" : ""} (${r?.grundlage}). Scope: ${r?.umfang}.${r?.hinweis ? ` ${r.hinweis}` : ""}`
      : `In ${r?.name} gilt die Solarpflicht für neue Parkplätze ab ${s}${r?.oeffentlichOhneSchwelle ? " gewerblich genutzten" : ""} Stellplätzen${r?.oeffentlichOhneSchwelle ? " bzw. für öffentliche Parkplätze unabhängig von der Schwelle" : ""} (${r?.grundlage}). Umfang: ${r?.umfang}.${r?.hinweis ? ` ${r.hinweis}` : ""}`,
    "region-fehlt": en ? "Please choose a federal state." : "Bitte wählen Sie ein Bundesland.",
  };
  return T[code] || T["region-fehlt"];
}

const STATUS_STIL = {
  ja: { icon: CircleAlert, klasse: "bg-sun-300/30 text-ink-900 ring-sun-400/60", iconKlasse: "text-sun-500" },
  nein: { icon: CheckCircle2, klasse: "bg-ov-50 text-ov-800 ring-ov-200", iconKlasse: "text-ov-600" },
  unklar: { icon: HelpCircle, klasse: "bg-ink-100 text-ink-800 ring-ink-200", iconKlasse: "text-ink-500" },
};

export default function SchnellCheck({ land = null }) {
  const id = useId();
  const sprache = useSprache();
  const en = sprache === "en";
  const w = en ? W.en : W.de;
  const f = useFormate();
  const l = land || "DE";
  const de = l === "DE";

  const [stellplaetze, setStellplaetze] = useState(100);
  const [region, setRegion] = useState("");
  const [situation, setSituation] = useState("neubau");
  const [betreiber, setBetreiber] = useState("gewerblich");

  const r = useMemo(() => parkplatzCheck({ land: l, region, stellplaetze, situation, betreiber }), [l, region, stellplaetze, situation, betreiber]);
  const bereit = !de || !!region;
  const stil = STATUS_STIL[bereit ? r.pflicht.status : "unklar"];
  const Icon = stil.icon;
  const quelle = r.pflicht.quelle;
  const eingaben = useMemo(
    () => ({ stellplaetze, situation, betreiber, ...(de && region ? { region } : {}) }),
    [stellplaetze, situation, betreiber, de, region]
  );

  return (
    <div className="grid gap-5 lg:grid-cols-[0.9fr_1.1fr]">
      {/* Eingaben */}
      <div className="rounded-[2rem] bg-white p-6 ring-1 ring-ink-200/70 sm:p-8">
        <div className="space-y-7">
          <Regler label={w.stellplaetze} wert={stellplaetze} min={5} max={1000} step={5} onChange={setStellplaetze} />
          {de && (
            <div>
              <label htmlFor={`${id}-land`} className="mb-2.5 block text-[14.5px] font-semibold text-ink-800">
                {w.bundesland} {!land && <GiltFuer />}
              </label>
              <div className="relative">
                <select id={`${id}-land`} value={region} onChange={(e) => setRegion(e.target.value)} className={auswahlKlasse(false)}>
                  <option value="">{w.waehlen}</option>
                  {DE_LAENDER.map((b) => (
                    <option key={b.slug} value={b.slug}>
                      {b.name}
                    </option>
                  ))}
                </select>
                <span aria-hidden="true" className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-ink-500">
                  ▾
                </span>
              </div>
            </div>
          )}
          <Auswahl legende={w.situation} optionen={w.situationen} wert={situation} onChange={setSituation} spalten={2} klein />
          <Auswahl legende={w.betreiber} optionen={w.betreiberOpt} wert={betreiber} onChange={setBetreiber} spalten={2} klein />
        </div>
      </div>

      {/* Ergebnis */}
      <div className="flex flex-col gap-4">
        <div className="rounded-[2rem] bg-white p-6 ring-1 ring-ink-200/70 sm:p-8" aria-live="polite">
          <span className={cn("inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[13px] font-semibold ring-1", stil.klasse)}>
            <Icon aria-hidden="true" className={cn("h-4 w-4", stil.iconKlasse)} />
            {w.status[bereit ? r.pflicht.status : "unklar"]}
          </span>
          <p className="mt-4 text-[15.5px] leading-relaxed text-ink-700">{bereit ? pflichtText(r.pflicht.code, r.pflicht.regel, en) : pflichtText("region-fehlt", null, en)}</p>
          {bereit && quelle && (
            <p className="mt-3 text-[13px] text-ink-500">
              {w.quelle}:{" "}
              {quelle.url?.startsWith("http") ? (
                <a href={quelle.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 underline decoration-ink-300 underline-offset-2 hover:text-ink-700">
                  {quelle.titel}
                  <ExternalLink aria-hidden="true" className="h-3 w-3" />
                </a>
              ) : (
                <Link href={quelle.url || pfad("/ratgeber/parkplatz-solarpflicht-bundeslaender")} className="underline decoration-ink-300 underline-offset-2 hover:text-ink-700">
                  {quelle.titel}
                </Link>
              )}{" "}
              · {quelle.stand}
            </p>
          )}
          <p className="mt-2 text-[13px] text-ink-500">{w.stand}</p>

          <dl className="mt-6 grid gap-3 sm:grid-cols-2">
            <div className="rounded-2xl bg-sand-50 p-4 ring-1 ring-ink-200/60">
              <dt className="flex items-center gap-1.5 text-[13px] font-semibold text-ink-600">
                <Sun aria-hidden="true" className="h-4 w-4 text-ov-600" />
                {w.potenzial}
              </dt>
              <dd className="mt-1 font-display text-[24px] font-bold text-ink-900">≈ {f.fmt(r.potenzial.kwp)} kWp</dd>
              <dd className="text-[12.5px] text-ink-500">{w.kwpJe(f.fmt(r.potenzial.kwpProStellplatz, 1))}</dd>
            </div>
            {bereit && r.potenzial.mindestKwp ? (
              <div className="rounded-2xl bg-sand-50 p-4 ring-1 ring-ink-200/60">
                <dt className="text-[13px] font-semibold text-ink-600">{w.mindest}</dt>
                <dd className="mt-1 font-display text-[24px] font-bold text-ink-900">≈ {f.fmt(r.potenzial.mindestKwp)} kWp</dd>
                <dd className="text-[12.5px] text-ink-500">{w.mindestZusatz(f.fmt((r.pflicht.regel?.umfangAnteil || 0) * 100))}</dd>
              </div>
            ) : (
              <div className="rounded-2xl bg-sand-50 p-4 ring-1 ring-ink-200/60">
                <dt className="flex items-center gap-1.5 text-[13px] font-semibold text-ink-600">
                  <BatteryCharging aria-hidden="true" className="h-4 w-4 text-ov-600" />
                  {w.laden}
                </dt>
                <dd className="mt-1 text-[13.5px] leading-relaxed text-ink-600">{de ? (r.geig?.greift ? (r.geig.leitungJe ? w.geig(r.geig.leitungJe, f.fmt(r.geig.leitungStellplaetze), r.geig.paragraph) : w.geigBestand(r.geig.paragraph)) : w.geigKeins) : w.geigKeins}</dd>
              </div>
            )}
          </dl>
          {de && bereit && r.potenzial.mindestKwp && r.geig ? (
            <p className="mt-3 flex items-start gap-1.5 text-[13.5px] leading-relaxed text-ink-600">
              <BatteryCharging aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-ov-600" />
              <span>{r.geig.greift ? (r.geig.leitungJe ? w.geig(r.geig.leitungJe, f.fmt(r.geig.leitungStellplaetze), r.geig.paragraph) : w.geigBestand(r.geig.paragraph)) : w.geigKeins}</span>
            </p>
          ) : null}
          {de && r.gmodg2030 && (
            <p className="mt-4 rounded-2xl bg-ink-50 p-4 text-[13px] leading-relaxed text-ink-600 ring-1 ring-ink-200/60">
              <strong className="font-semibold text-ink-800">{w.ausblick}: </strong>
              {en ? w.ausblickText : r.gmodg2030.text}
            </p>
          )}
          <p className="mt-4">
            <Link href={pfad("/rechner/solarcarport")} className="text-[14.5px] font-semibold text-ov-700 underline decoration-ov-300 underline-offset-2 hover:text-ov-800">
              {w.rechner} →
            </Link>
          </p>
        </div>

        <BerichtAnfordern rechner="parkplatz" land={l} eingaben={eingaben} />
      </div>
    </div>
  );
}
