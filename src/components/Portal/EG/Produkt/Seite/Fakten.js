// Faktenleiste – Regeln, die die Plattform abbildet
// Mobil: ruhige Liste (Zahl links, Einheit + Erklärung rechts), ab sm 2×2, ab lg vier gleich gebaute Spalten.
import { BadgeCheck, BellRing, Check, Repeat } from "lucide-react";
import { cn } from "@/components/ui/cn";
import { spracheDerAnfrage } from "@/lib/land/seite";

/** Produktfakten – Regeln, die die Plattform abbildet (keine Unternehmenskennzahlen) */
const FAKTEN = [
  { icon: Repeat, wert: "5", einheit: "Gemeinschaften", text: "je Zählpunkt – Teilnahmefaktoren im Blick" },
  { icon: BellRing, wert: "10", einheit: "Werktage", text: "Zustimmungsfrist – das Portal zählt für jedes Mitglied mit" },
  { icon: BadgeCheck, wert: "2", einheit: "Freigaben", text: "Vier-Augen-Prinzip für jede Abrechnung und Zahlung" },
  { icon: Check, wert: "0", einheit: "Neuanmeldungen", text: "beim Wechsel – die Zustimmungen der Mitglieder bleiben gültig" },
];

/* Sprachmodell: englische Fassung (gleiche Werte) */
const FAKTEN_EN = [
  { einheit: "Communities", text: "per metering point – participation factors kept in view" },
  { einheit: "Working days", text: "consent period – the portal counts along for every member" },
  { einheit: "Approvals", text: "four-eyes principle for every bill and payment" },
  { einheit: "New registrations", text: "when switching – the members’ consents remain valid" },
];

export default function Fakten() {
  const en = spracheDerAnfrage() === "en";
  const fakten = en ? FAKTEN.map((f, i) => ({ ...f, ...FAKTEN_EN[i] })) : FAKTEN;
  return (
    <section data-abschnitt="fakten" aria-labelledby="fakten-titel" className="relative z-10 -mt-12 md:-mt-16">
      <h2 id="fakten-titel" className="sr-only">{en ? "Rules the platform covers" : "Regeln, die die Plattform abbildet"}</h2>
      <div className="ov-container">
        <div className="relative rounded-[1.75rem] bg-white shadow-e4 ring-1 ring-ink-200/70 md:rounded-[2rem]">
          <div aria-hidden="true" className="absolute inset-x-12 top-0 h-px bg-gradient-to-r from-transparent via-ov-400 to-transparent" />
          <dl className="grid px-5 sm:grid-cols-2 sm:px-2 lg:grid-cols-4 lg:px-0 lg:py-3">
            {fakten.map((f, i) => (
              <div
                key={i}
                className={cn(
                  "grid grid-cols-[2.75rem_minmax(0,1fr)] items-start gap-x-4 border-ink-100 py-5 sm:px-5 sm:py-6 lg:grid-cols-1 lg:gap-x-0 lg:px-7 lg:py-5 xl:px-8",
                  i > 0 && "border-t",
                  i === 1 && "sm:border-l sm:border-t-0",
                  i === 3 && "sm:border-l",
                  i > 0 && "lg:border-l lg:border-t-0"
                )}
              >
                <dt className="col-start-2 row-start-1 lg:col-start-1 lg:row-start-2">
                  <span className="block font-display text-[16px] font-bold leading-tight tracking-[-0.01em] text-ov-700 lg:mt-2.5 lg:text-[17px]">{f.einheit}</span>
                  <span className="mt-1 block text-[14px] text-pretty leading-snug text-ink-600">{f.text}</span>
                </dt>
                <dd className="col-start-1 row-start-1 flex items-center gap-3">
                  <span aria-hidden="true" className="hidden h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-ov-50 text-ov-600 ring-1 ring-ov-200 lg:order-last lg:ml-auto lg:flex"><f.icon className="h-4 w-4" /></span>
                  <span className="ov-kpi-l block w-full text-right text-ink-900 lg:w-auto lg:text-left">{f.wert}</span>
                </dd>
              </div>
            ))}
          </dl>
        </div>
      </div>
    </section>
  );
}
