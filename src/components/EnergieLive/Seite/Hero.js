// Hero der Seite /energie-live – kompakte Kopfzeile, darunter das Live-Cockpit (children) und die Kapitelnavigation
import { Activity } from "lucide-react";
import Breadcrumbs from "@/components/ui/Breadcrumbs";
import { spracheDerAnfrage } from "@/lib/land/seite";

const KAPITEL = [
  { href: "#preisverlauf", label: "Preis heute" },
  { href: "#entscheidungen", label: "Was das bedeutet" },
  { href: "#strommix", label: "Strommix 24 h" },
  { href: "#capture-rate", label: "Capture-Rate" },
  { href: "#hintergrund", label: "Merit-Order" },
];

/* Sprachmodell: englische Fassung (gleiche Anker) */
const KAPITEL_EN = ["Price today", "What it means", "Power mix 24 h", "Capture rate", "Merit order"];

export default function Hero({ children }) {
  const en = spracheDerAnfrage() === "en";
  const kapitel = en ? KAPITEL.map((k, i) => ({ ...k, label: KAPITEL_EN[i] })) : KAPITEL;
  return (
    <section data-abschnitt="hero" aria-labelledby="hero-titel" className="ov-verlauf-nacht ov-noise relative isolate overflow-hidden text-white">
      <div aria-hidden="true" className="ov-grid-bg absolute inset-0 -z-10 opacity-50" />
      <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-px bg-gradient-to-r from-transparent via-ov-300/40 to-transparent" />
      <div aria-hidden="true" className="pointer-events-none absolute -left-40 -top-40 -z-10 h-[520px] w-[520px] rounded-full bg-ov-500/20 blur-[120px]" />
      <div aria-hidden="true" className="pointer-events-none absolute -right-40 top-40 -z-10 h-[460px] w-[460px] rounded-full bg-sun-400/10 blur-[120px]" />

      <div className="ov-container pb-14 pt-6 sm:pt-8 md:pb-20 md:pt-10">
        <Breadcrumbs items={[{ name: en ? "Knowledge" : "Wissen", href: "/ratgeber" }, { name: en ? "Power market live" : "Strommarkt live" }]} dark className="ov-hero-in mb-8 md:mb-10" />

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.9fr)] lg:items-end lg:gap-16">
          <div>
            <p className="ov-hero-in inline-flex items-center gap-2 rounded-full bg-white/[0.06] px-3.5 py-1.5 text-[12.5px] font-semibold uppercase tracking-[0.14em] text-ov-300 ring-1 ring-inset ring-white/15" style={{ "--ov-delay": "40ms" }}>
              <Activity aria-hidden="true" className="h-3.5 w-3.5" />
              {en ? "Energy live · Germany" : "Energie live · Deutschland"}
            </p>
            <h1 id="hero-titel" className="ov-h1 ov-hero-in mt-6 text-balance" style={{ "--ov-delay": "100ms" }}>
              {en ? "German power market" : "Strommarkt Deutschland"} <span className="ov-text-gradient-light">live</span>
            </h1>
          </div>
          <p className="ov-lead ov-hero-in text-pretty text-white/75" style={{ "--ov-delay": "180ms" }}>
            {en
              ? "Exchange power price, power mix and solar capture rate\u00a0– every quarter-hour from open data by Fraunhofer ISE. Put into context for companies that buy electricity and investors who assess solar parks and storage."
              : "Börsenstrompreis, Strommix und Solar-Capture-Rate\u00a0– viertelstündlich aus offenen Daten des Fraunhofer ISE. Eingeordnet für Unternehmen, die Strom beschaffen, und Investoren, die Solarparks und Speicher bewerten."}
          </p>
        </div>

        <div className="ov-hero-in mt-10 md:mt-12" style={{ "--ov-delay": "260ms" }}>{children}</div>

        <nav aria-label={en ? "Page sections" : "Kapitel der Seite"} className="mt-10 border-t border-white/10 pt-6 md:mt-12">
          <ul className="ov-no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:px-0">
            {kapitel.map((k, i) => (
              <li key={k.href} className="shrink-0">
                <a href={k.href} className="inline-flex h-10 items-center gap-2 rounded-full bg-white/[0.06] px-4 text-[14px] font-semibold text-white/85 ring-1 ring-inset ring-white/15 transition-colors hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ov-300">
                  <span className="ov-num text-[11px] font-bold text-ov-300">{String(i + 1).padStart(2, "0")}</span>
                  {k.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>
      </div>
    </section>
  );
}
