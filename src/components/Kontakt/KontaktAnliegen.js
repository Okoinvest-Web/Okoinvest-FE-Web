"use client";

import { useEffect, useId, useState } from "react";
import Link from "@/components/Land/Link";
import { ArrowUpRight, BatteryCharging, Car, Check, Factory, FolderUp, HandCoins, Landmark, LineChart, MapPinned, MessageSquare, Sprout, Users } from "lucide-react";
import AnfrageFormular from "@/components/Plattform/AnfrageFormular";
import { cn } from "@/components/ui/cn";
import { pfad } from "@/lib/land";
import { useSprache } from "@/components/Sprache/SpracheKontext";
import { uebersetze } from "@/lib/sprache/woerterbuch";

/**
 * Anliegen wählen (Chips) → schaltet `typ` des einheitlichen Anfrageformulars.
 * Vorauswahl per URL: /kontakt?anliegen=reststrom
 */
export const ANLIEGEN = [
  { typ: "flaeche", label: "Fläche verpachten", text: "Sie haben eine Fläche ab etwa 3 ha? Mit Lage und Größe können wir eine erste Einschätzung geben.", felder: ["telefon", "plz", "ort", "land", "nachricht"], link: { href: pfad("/flaechencheck"), label: "Lieber gleich den Flächencheck" } },
  { typ: "agri", label: "Agri-PV", text: "Verpachten, selbst investieren oder beteiligen – beschreiben Sie kurz Fläche und Kulturen.", felder: ["firma", "telefon", "plz", "ort", "nachricht"], link: { href: pfad("/rechner/agri-pv"), label: "Agri-PV-Rechner" } },
  { typ: "investor", label: "Investieren", text: "Suchen Sie Projektrechte, baureife Projekte oder Bestandsanlagen? Nennen Sie Region, Phase und Größe.", felder: ["firma", "telefon", "land", "nachricht"], link: { href: "/registrieren?rolle=investor", label: "Suchprofil im Portal anlegen" } },
  { typ: "projekt", label: "Projekt anbieten", text: "Sie entwickeln ein Projekt oder verkaufen eine Anlage? Eckdaten genügen für den Start.", felder: ["firma", "telefon", "land", "nachricht"], link: { href: "/projektboerse/anbieten", label: "Direkt inserieren" } },
  { typ: "reststrom", label: "Reststrom-Pool", text: "Nennen Sie Jahresverbrauch, aktuellen Preis und Vertragsende – wir melden uns mit einer Einschätzung.", felder: ["firma", "telefon", "plz", "nachricht"], link: { href: pfad("/rechner/reststrom"), label: "Ersparnis vorab berechnen" } },
  { typ: "carport", label: "Solarcarport", text: "Anzahl Stellplätze, Standort und ob Ladepunkte geplant sind – das genügt für den Anfang.", felder: ["firma", "telefon", "plz", "ort", "nachricht"], link: { href: pfad("/rechner/solarcarport"), label: "Carport-Rechner" } },
  { typ: "speicher", label: "Großspeicher", text: "Fläche oder Netzanschluss für einen Batteriespeicher? Nennen Sie Lage und Anschlussleistung, falls bekannt.", felder: ["firma", "telefon", "plz", "ort", "nachricht"], link: { href: pfad("/grossspeicher"), label: "Mehr zu Großspeichern" } },
  { typ: "kommune", label: "Kommune", text: "Gemeinde, Stadtwerk oder Zweckverband: Flächen, Beteiligung, Energiegemeinschaft – sprechen Sie uns an.", felder: ["firma", "telefon", "plz", "ort", "nachricht"], link: { href: pfad("/kommunen"), label: "Für Kommunen" } },
  { typ: "energiegemeinschaft", label: "Energiegemeinschaft", text: "Gründen, mit Parkstrom versorgen oder Abrechnung abgeben – in DE, AT oder CH.", felder: ["firma", "telefon", "plz", "land", "nachricht"], link: { href: pfad("/energiegemeinschaften"), label: "Modelle im Ländervergleich" } },
  { typ: "genossenschaft", label: "Genossenschaft", text: "Interesse an der geplanten Energiegenossenschaft? Registrieren Sie sich unverbindlich.", felder: ["telefon", "plz", "nachricht"], link: { href: pfad("/genossenschaft"), label: "Zur Genossenschaft" } },
  { typ: "kontakt", label: "Sonstiges", text: "Presse, Partnerschaften oder eine andere Frage – schreiben Sie uns.", felder: ["firma", "telefon", "nachricht"], link: null },
];

/** Englisch (Sprachmodell): gleiche Reihenfolge wie ANLIEGEN; ans Backoffice geht weiter das deutsche Label. */
const ANLIEGEN_EN = [
  { label: "Lease your land", text: "Do you have land from about 3 ha? With the location and size we can give you an initial assessment.", link: { label: "Go straight to the land check" } },
  { label: "Agrivoltaics", text: "Lease, invest yourself or take a stake – briefly describe the land and crops.", link: { label: "Agrivoltaics calculator" } },
  { label: "Invest", text: "Looking for project rights, ready-to-build projects or operating assets? Tell us the region, stage and size.", link: { label: "Create a search profile in the portal" } },
  { label: "Offer a project", text: "Are you developing a project or selling a plant? Key data is enough to get started.", link: { label: "List directly" } },
  { label: "Residual power pool", text: "Tell us your annual consumption, current price and contract end – we will get back to you with an assessment.", link: { label: "Calculate savings in advance" } },
  { label: "Solar carport", text: "Number of parking spaces, location and whether charging points are planned – that is enough to start with.", link: { label: "Carport calculator" } },
  { label: "Battery storage", text: "Land or a grid connection for battery storage? Tell us the location and connection capacity, if known.", link: { label: "More on battery storage" } },
  { label: "Municipality", text: "Municipality, municipal utility or special-purpose association: land, participation, energy community – get in touch.", link: { label: "For municipalities" } },
  { label: "Energy community", text: "Set one up, supply it with power from a solar park or hand over the billing – in DE, AT or CH.", link: { label: "Models compared by country" } },
  { label: "Cooperative", text: "Interested in the planned energy cooperative? Register without obligation.", link: { label: "Go to the cooperative" } },
  { label: "Other", text: "Press, partnerships or another question – write to us.", link: null },
];

/** Symbol je Anliegen (rein visuell) */
const ICON = {
  flaeche: MapPinned,
  agri: Sprout,
  investor: LineChart,
  projekt: FolderUp,
  reststrom: Factory,
  carport: Car,
  speicher: BatteryCharging,
  kommune: Landmark,
  energiegemeinschaft: Users,
  genossenschaft: HandCoins,
  kontakt: MessageSquare,
};

export default function KontaktAnliegen() {
  const sprache = useSprache();
  const anliegen = uebersetze({ de: ANLIEGEN, en: ANLIEGEN_EN }, sprache);
  const [typ, setTyp] = useState("kontakt");
  const name = useId();

  useEffect(() => {
    try {
      const a = new URLSearchParams(window.location.search).get("anliegen");
      if (a && ANLIEGEN.some((x) => x.typ === a)) setTyp(a);
    } catch {}
  }, []);

  const waehlen = (t) => {
    setTyp(t);
    try {
      const url = new URL(window.location.href);
      url.searchParams.set("anliegen", t);
      window.history.replaceState(null, "", url);
    } catch {}
  };

  const a = anliegen.find((x) => x.typ === typ);
  const label = ANLIEGEN.find((x) => x.typ === typ).label;

  return (
    <div>
      <fieldset>
        <legend className="mb-3 text-[14.5px] font-semibold text-ink-800">{sprache === "en" ? "What is it about?" : "Worum geht es?"}</legend>
        <div className="grid grid-cols-[repeat(2,minmax(0,1fr))] gap-2 sm:grid-cols-[repeat(3,minmax(0,1fr))]">
          {anliegen.map((x) => {
            const an = x.typ === typ;
            const Icon = ICON[x.typ] || MessageSquare;
            return (
              <label
                key={x.typ}
                className={cn(
                  "group relative flex min-h-12 min-w-0 cursor-pointer items-center gap-2 rounded-2xl py-2 pl-2 pr-2.5 text-[13.5px] sm:gap-2.5 sm:pr-3 sm:text-[14px] font-medium leading-tight ring-1 transition-[background-color,box-shadow,color] duration-150 has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ov-500",
                  an ? "bg-navy-950 font-semibold text-white shadow-e2 ring-navy-950" : "bg-white text-ink-700 ring-ink-200 hover:bg-sand-50 hover:ring-ink-300"
                )}
              >
                <input type="radio" name={name} value={x.typ} checked={an} onChange={() => waehlen(x.typ)} className="sr-only" />
                <span
                  aria-hidden="true"
                  className={cn("flex h-7 w-7 shrink-0 sm:h-8 sm:w-8 items-center justify-center rounded-xl transition-colors", an ? "bg-white/10 text-ov-300" : "bg-ov-50 text-ov-600 group-hover:bg-white")}
                >
                  {an ? <Check className="h-4 w-4" strokeWidth={3} /> : <Icon className="h-4 w-4" />}
                </span>
                <span lang={sprache} className="min-w-0 break-words [hyphens:auto]">{x.label}</span>
              </label>
            );
          })}
        </div>
      </fieldset>

      <div key={a.typ} className="ov-tab-panel mt-5 flex flex-col gap-3 rounded-2xl bg-ov-50/70 p-4 ring-1 ring-ov-100 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-[14.5px] leading-relaxed text-ink-700">{a.text}</p>
        {a.link && (
          <Link href={a.link.href} className="inline-flex min-h-11 shrink-0 items-center gap-1.5 text-[14px] font-semibold text-ov-700 hover:text-ov-800">
            {a.link.label}
            <ArrowUpRight aria-hidden="true" className="h-4 w-4" />
          </Link>
        )}
      </div>

      <div className="mt-8">
        <AnfrageFormular key={a.typ} typ={a.typ} felder={a.felder} daten={{ anliegen: label, quelle: "kontaktseite" }} button={sprache === "en" ? "Send enquiry" : "Anfrage senden"} />
      </div>
    </div>
  );
}
