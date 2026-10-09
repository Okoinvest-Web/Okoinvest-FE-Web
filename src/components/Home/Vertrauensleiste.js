import { Factory, Hammer, Landmark, MapPinned, SunMedium } from "lucide-react";
import Stagger from "@/components/ui/Stagger";
import { GESELLSCHAFT, KENNZAHLEN } from "@/data/site";
import { spracheDerAnfrage } from "@/lib/land/seite";
import { uebersetze } from "@/lib/sprache/woerterbuch";

/**
 * Vertrauensleiste direkt unter dem Hero.
 * Nur belegte Fakten (siehe docs/BRIEFING.md „Unternehmen“) – keine Kundenlogos,
 * keine Auszeichnungen, keine erfundenen Kennzahlen.
 */
const FAKTEN = [
  { icon: Factory, titel: "ÖKOVOLT Gruppe", text: `Photovoltaik seit ${KENNZAHLEN.gruppeGegruendet}` },
  { icon: SunMedium, titel: "Eigene Solarparks", text: "im Betrieb seit 2012" },
  { icon: Hammer, titel: "Eigene Rammtechnik", text: "Fundamente aus der Gruppe" },
  // Paket D: nicht „Projekte im gesamten DACH-Raum“ – belegt sind Gesellschaften in DE und AT
  // (Register siehe src/data/unternehmen.js); die Schweiz startet nur mit Daten und Werkzeugen (E11/E14).
  { icon: MapPinned, titel: "DE · AT", text: "Gesellschaften in Deutschland und Österreich" },
  { icon: Landmark, titel: GESELLSCHAFT.register, text: GESELLSCHAFT.gericht.replace("Landesgericht", "LG") },
];

// Englisch: gleiche Fakten, gleiche Reihenfolge (Registerangaben bleiben im Original)
const FAKTEN_EN = [
  { titel: "ÖKOVOLT Group", text: `Photovoltaics since ${KENNZAHLEN.gruppeGegruendet}` },
  { titel: "Own solar parks", text: "in operation since 2012" },
  { titel: "Own pile-driving equipment", text: "Foundations from within the group" },
  { text: "Companies in Germany and Austria" },
  { text: GESELLSCHAFT.gericht.replace("Landesgericht", "Regional Court") },
];

export default function Vertrauensleiste() {
  const en = spracheDerAnfrage() === "en";
  const FAKTEN_SEITE = uebersetze({ de: FAKTEN, en: FAKTEN_EN }, en ? "en" : "de");
  return (
    <section aria-label={en ? "Facts about ÖkoInvest GmbH" : "Fakten zur ÖkoInvest GmbH"} className="border-b border-ink-100 bg-white">
      <div className="ov-container">
        <Stagger
          as="ul"
          schritt={70}
          className="grid grid-cols-2 gap-x-4 gap-y-5 py-7 sm:grid-cols-3 md:py-8 lg:grid-cols-5 lg:gap-0"
        >
          {FAKTEN_SEITE.map((f, i) => (
            <li
              key={f.titel}
              className={`flex items-center gap-3 ${i === FAKTEN.length - 1 ? "col-span-2 sm:col-span-1" : ""} lg:justify-center lg:px-4 ${i > 0 ? "lg:border-l lg:border-ink-100" : ""}`}
            >
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-ov-50 text-ov-600">
                <f.icon aria-hidden="true" className="h-[18px] w-[18px]" strokeWidth={1.9} />
              </span>
              <span className="min-w-0">
                <span className="block font-display text-[14.5px] font-bold leading-tight text-ink-900">{f.titel}</span>
                <span className="mt-0.5 block text-[12.5px] leading-snug text-ink-500">{f.text}</span>
              </span>
            </li>
          ))}
        </Stagger>
      </div>
    </section>
  );
}
