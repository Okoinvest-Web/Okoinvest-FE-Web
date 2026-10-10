// Faktenleiste unter dem Hero – überlappt die Nachtbühne (Muster der Referenzseite).
// Mobil: Liste (Zahl rechts), ab sm 2×2, ab lg vier Spalten. Alle Werte aus DACH/Seiteninhalt.
import { CalendarClock, HandCoins, Ruler, ShieldCheck } from "lucide-react";
import { cn } from "@/components/ui/cn";
import { zahlenModus } from "@/lib/land";
import { landDerAnfrage, spracheDerAnfrage } from "@/lib/land/seite";
import { fmtZahl } from "@/lib/sprache/format";
import { schreibweiseBaum } from "@/components/Land/SchweizerSchreibweise";

// Schweiz (/ch, /en/ch): fest geschriebene Texte ohne „ß“ (W3-0, src/components/Land/SchweizerSchreibweise.js)
const chBaum = (el) => schreibweiseBaum(el, landDerAnfrage());

/** Variante der Faktenleiste. fakten: [{ icon, wert, einheit, text }] */
export function FaktenLeiste({ titel, fakten }) {
  return chBaum(
    <section data-abschnitt="fakten" aria-label={titel} className="relative z-10 -mt-12 md:-mt-16">
      <div className="ov-container">
        <div className="relative rounded-[1.75rem] bg-white shadow-e4 ring-1 ring-ink-200/70 md:rounded-[2rem]">
          <div aria-hidden="true" className="absolute inset-x-12 top-0 h-px bg-gradient-to-r from-transparent via-ov-400 to-transparent" />
          <dl className="grid px-5 sm:grid-cols-2 sm:px-2 lg:grid-cols-4 lg:px-0 lg:py-3">
            {fakten.map((f, i) => (
              <div
                key={f.einheit}
                className={cn(
                  "grid grid-cols-[minmax(0,1fr)_auto] items-start gap-x-4 border-ink-100 py-5 sm:px-5 sm:py-6 lg:grid-cols-1 lg:gap-x-0 lg:px-7 lg:py-5 xl:px-8",
                  i > 0 && "border-t",
                  i === 1 && "sm:border-l sm:border-t-0",
                  i === 3 && "sm:border-l",
                  i > 0 && "lg:border-l lg:border-t-0"
                )}
              >
                <dt className="row-start-1 lg:row-start-2">
                  <span className="block font-display text-[16px] font-bold leading-tight tracking-[-0.01em] text-ov-700 lg:mt-2.5 lg:text-[17px]">{f.einheit}</span>
                  <span className="mt-1 block text-pretty text-[14px] leading-snug text-ink-600">{f.text}</span>
                </dt>
                <dd className="col-start-2 row-start-1 flex items-center gap-3 lg:col-start-1">
                  <span aria-hidden="true" className="hidden h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-ov-50 text-ov-600 ring-1 ring-ov-200 lg:order-last lg:ml-auto lg:flex">
                    <f.icon className="h-4 w-4" />
                  </span>
                  <span className={cn("ov-kpi-l ov-num block whitespace-nowrap text-right text-ink-900 lg:text-left", f.wert.length > 5 && "!text-[1.9rem] lg:!text-[2.25rem] xl:!text-[2.6rem]")}>{f.wert}</span>
                </dd>
              </div>
            ))}
          </dl>
        </div>
      </div>
    </section>
  );
}

// Länderinhalt: Dachpacht in € ist nur für Deutschland geprüft – in AT/CH ohne Wert (zahlenModus „hinweis“).
export default function Fakten({ dach }) {
  const ohneWerte = zahlenModus(landDerAnfrage(), ["DE"]) === "hinweis";
  if (spracheDerAnfrage() === "en") {
    const z = (n, s = 2) => fmtZahl(n, s, "en");
    const verlaengerung = String(dach.verlaengerung).replace(/^(.*) Jahre Option$/, "options of $1 years");
    return (
      <FaktenLeiste
        titel="Roof lease in figures"
        fakten={[
          { icon: Ruler, wert: "1,000", einheit: "m² of roof area", text: "from this size, a roof becomes interesting for an operator" },
          ohneWerte
            ? { icon: HandCoins, wert: "on request", einheit: "Roof lease per m²", text: "Lease rates for your country are being reviewed – offer after assessing the roof" }
            : { icon: HandCoins, wert: `${z(dach.pachtProM2.min)}–${z(dach.pachtProM2.max)}`, einheit: "€ per m² per year", text: "guide value for the fixed roof lease" },
          { icon: CalendarClock, wert: String(dach.laufzeit), einheit: "years term", text: `from commissioning, plus ${verlaengerung}` },
          { icon: ShieldCheck, wert: "€0", einheit: "for the assessment", text: "initial assessment, offer and draft contract free of charge" },
        ]}
      />
    );
  }
  return chBaum(
    <FaktenLeiste
      titel="Dachpacht in Zahlen"
      fakten={[
        { icon: Ruler, wert: "1.000", einheit: "m² Dachfläche", text: "ab dieser Größe wird ein Dach für einen Betreiber interessant" },
        ohneWerte
          ? { icon: HandCoins, wert: "auf Anfrage", einheit: "Dachpacht je m²", text: "Pachtwerte für Ihr Land werden geprüft – Angebot nach Prüfung des Dachs" }
          : { icon: HandCoins, wert: `${dach.pachtProM2.min}–${dach.pachtProM2.max}`, einheit: "€ je m² und Jahr", text: "Orientierung für die feste Dachpacht" },
        { icon: CalendarClock, wert: String(dach.laufzeit), einheit: "Jahre Laufzeit", text: `ab Inbetriebnahme, dazu ${dach.verlaengerung}` },
        { icon: ShieldCheck, wert: "0 €", einheit: "für die Prüfung", text: "Erstprüfung, Angebot und Vertragsentwurf kostenfrei" },
      ]}
    />
  );
}
