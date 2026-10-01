import { Factory, Hammer, Landmark, MapPinned, SunMedium } from "lucide-react";
import Stagger from "@/components/ui/Stagger";
import { GESELLSCHAFT, KENNZAHLEN } from "@/data/site";

/**
 * Vertrauensleiste direkt unter dem Hero.
 * Nur belegte Fakten (siehe docs/BRIEFING.md „Unternehmen“) – keine Kundenlogos,
 * keine Auszeichnungen, keine erfundenen Kennzahlen.
 */
const FAKTEN = [
  { icon: Factory, titel: "ÖKOVOLT Gruppe", text: `Solarkraftwerke seit ${KENNZAHLEN.gruppeGegruendet}` },
  { icon: SunMedium, titel: "Eigene Solarparks", text: "im Betrieb seit 2012" },
  { icon: Hammer, titel: "Eigene Rammtechnik", text: "Fundamente aus der Gruppe" },
  { icon: MapPinned, titel: "DE · AT · CH", text: "Projekte im gesamten DACH-Raum" },
  { icon: Landmark, titel: GESELLSCHAFT.register, text: GESELLSCHAFT.gericht.replace("Landesgericht", "LG") },
];

export default function Vertrauensleiste() {
  return (
    <section aria-label="Fakten zur ÖkoInvest GmbH" className="border-b border-ink-100 bg-white">
      <div className="ov-container">
        <Stagger
          as="ul"
          schritt={70}
          className="grid grid-cols-2 gap-x-4 gap-y-5 py-7 sm:grid-cols-3 md:py-8 lg:grid-cols-5 lg:gap-0"
        >
          {FAKTEN.map((f, i) => (
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
