// Wechsel ohne Neuanmeldung der Zählpunkte – Zeitstrahl in vier Schritten
import { CalendarCheck, DatabaseZap, FileSignature, KeyRound, ShieldCheck } from "lucide-react";
import Button from "@/components/ui/Button";
import Section from "@/components/ui/Section";
import SectionHeading from "@/components/ui/SectionHeading";
import Reveal from "@/components/ui/Reveal";
import { cn } from "@/components/ui/cn";
import { Haken } from "./teile";
import { spracheDerAnfrage } from "@/lib/land/seite";

/* Sprachmodell: englische Fassung (gleiche Reihenfolge) */
const WECHSEL_EN = [
  { title: "Mandate", marke: "Resolution and contracts", text: "Board resolution, service and data processing agreement; if desired, appointment as organiser." },
  { title: "Transfer EDA access", marke: "No re-registration", text: "The market partner ID stays with your community. Metering points do not have to be deregistered and re-registered – the consents remain in place." },
  { title: "Take over data", marke: "Grid operator reconciliation", text: "Import of members, metering points and tariffs, reconciliation with the grid operator’s list of metering points." },
  { title: "Parallel run and cut-over date", marke: "Fixed cut-over date", text: "Check our own allocation against the grid operator’s values, billing from a fixed month." },
];
const BLEIBT_EN = [
  "The market partner ID stays with your community",
  "Metering points are not deregistered and re-registered",
  "The consents remain in place",
  "Billing only after a parallel run, from a fixed month",
];

const WECHSEL = [
  { icon: FileSignature, title: "Mandat", marke: "Beschluss und Verträge", text: "Vorstandsbeschluss, Dienstleistungs- und Auftragsverarbeitungsvertrag; auf Wunsch Bestellung als Organisator." },
  { icon: KeyRound, title: "EDA-Zugang übertragen", marke: "Keine Neuanmeldung", text: "Die Marktpartner-ID bleibt bei Ihrer Gemeinschaft. Zählpunkte müssen nicht ab- und neu angemeldet werden – die Zustimmungen bleiben bestehen." },
  { icon: DatabaseZap, title: "Daten übernehmen", marke: "Netzbetreiber-Abgleich", text: "Import von Mitgliedern, Zählpunkten und Tarifen, Abgleich mit der Zählpunktliste des Netzbetreibers." },
  { icon: CalendarCheck, title: "Parallellauf und Stichtag", marke: "Fester Stichtag", text: "Eigene Zuteilung gegen die Werte des Netzbetreibers prüfen, Abrechnung ab einem festen Monat." },
];

// Was gleich bleibt – ausschließlich aus den Schritten oben abgeleitet.
// Nur ab lg als Zusammenfassung neben der Überschrift; gestapelt stünde es direkt über Schritt 2 mit denselben Sätzen.
const BLEIBT = [
  "Die Marktpartner-ID bleibt bei Ihrer Gemeinschaft",
  "Zählpunkte werden nicht ab- und neu angemeldet",
  "Die Zustimmungen bleiben bestehen",
  "Abrechnung erst nach Parallellauf, ab einem festen Monat",
];

export default function Wechsel() {
  const en = spracheDerAnfrage() === "en";
  const wechsel = en ? WECHSEL.map((s, i) => ({ ...s, ...WECHSEL_EN[i] })) : WECHSEL;
  const bleibt = en ? BLEIBT_EN : BLEIBT;
  return (
    <Section data-abschnitt="wechsel" tone="white" space="lg" id="wechsel" className="scroll-mt-24 overflow-hidden">

      <div className="relative grid gap-10 lg:grid-cols-[1.1fr_0.9fr] lg:items-end lg:gap-16">
        <SectionHeading
          eyebrow={en ? "Switching" : "Wechsel"}
          title={en ? "Switch without the power faltering" : "Wechseln, ohne dass der Strom stockt"}
          className="[&_h2]:hyphens-manual!"
          lead={
            en
              ? "Existing communities switch to us without re-registering their metering points. Four steps, with a parallel run before the cut-over date."
              : "Bestehende Gemeinschaften wechseln zu uns, ohne ihre Zählpunkte neu anzumelden. Vier Schritte, mit Parallellauf vor dem Stichtag."
          }
        />

        <Reveal delay={120} className="hidden rounded-[1.75rem] bg-white p-6 shadow-e2 ring-1 ring-ov-200/70 sm:p-7 lg:block">
          <div className="flex items-center gap-3">
            <span aria-hidden="true" className="flex h-10 w-10 items-center justify-center rounded-xl bg-ov-600 text-white">
              <ShieldCheck className="h-5 w-5" />
            </span>
            <h3 className="text-[17px] font-semibold leading-tight text-ink-900">{en ? "What stays the same when switching" : "Was beim Wechsel gleich bleibt"}</h3>
          </div>
          <ul role="list" className="mt-5 space-y-3">
            {bleibt.map((b, i) => (
              <li key={i} className="flex gap-3 text-[14.5px] leading-snug text-ink-700">
                <Haken />
                {b}
              </li>
            ))}
          </ul>
        </Reveal>
      </div>

      {/* Zeitstrahl: mobil senkrecht, ab lg waagerecht */}
      <Reveal className="relative mt-14 rounded-[2rem] bg-gradient-to-b from-ov-50/80 to-white p-6 shadow-e1 ring-1 ring-ov-200/70 sm:p-8 md:mt-16 lg:p-10">
        <h3 className="sr-only">{en ? "How switching works" : "Ablauf des Wechsels"}</h3>
        <ol role="list" className="grid gap-0 lg:grid-cols-4 lg:gap-8">
          {wechsel.map((s, i) => {
            const letzter = i === wechsel.length - 1;
            return (
              <li key={i} className={cn("relative flex gap-5 lg:flex-col lg:gap-6", !letzter && "pb-9 lg:pb-0")} style={{ "--i": i * 3 }}>
                {/* Verbindungslinie */}
                {!letzter && (
                  <>
                    <span aria-hidden="true" className="absolute bottom-0 left-7 top-14 w-0.5 -translate-x-1/2 rounded-full bg-gradient-to-b from-ov-400 to-ov-200 lg:hidden" />
                    <span aria-hidden="true" className="absolute left-16 right-[-1.5rem] top-7 hidden h-0.5 -translate-y-1/2 lg:block">
                      <span className="ov-balken-x block h-full w-full rounded-full bg-gradient-to-r from-ov-400 to-ov-200" />
                    </span>
                  </>
                )}

                {/* Knoten */}
                <span aria-hidden="true" className="relative z-10 flex h-14 w-14 shrink-0">
                  <span
                    className={cn(
                      "flex h-14 w-14 items-center justify-center rounded-2xl",
                      letzter ? "bg-ov-600 text-white shadow-[0_10px_28px_-10px_rgba(85,130,39,0.8)]" : "bg-white text-ov-700 shadow-e1 ring-1 ring-ov-200"
                    )}
                  >
                    <s.icon className="h-6 w-6" />
                  </span>
                  <span className="absolute -right-1.5 -top-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-navy-950 text-[11.5px] font-bold tabular-nums text-white ring-2 ring-white">
                    {i + 1}
                  </span>
                </span>

                <div className="flex min-w-0 flex-1 flex-col items-start pt-1 lg:pt-0">
                  <p className="text-[12px] font-semibold uppercase tracking-[0.16em] text-ov-700">
                    {en ? `Step ${i + 1}` : `Schritt ${i + 1}`}
                  </p>
                  <h4 className="mt-1 text-[18px] font-semibold leading-snug text-ink-900">{s.title}</h4>
                  <p className="mb-0 mt-2 text-[14.5px] leading-relaxed text-ink-600 lg:mb-4">{s.text}</p>
                  <p className="mt-3 inline-flex items-center lg:mt-auto gap-1.5 rounded-full bg-ov-50 px-2.5 py-1 text-[12.5px] font-semibold text-ov-800 ring-1 ring-ov-200">
                    <ShieldCheck aria-hidden="true" className="h-3.5 w-3.5" />
                    {s.marke}
                  </p>
                </div>
              </li>
            );
          })}
        </ol>
      </Reveal>

      {/* Nächster Schritt */}
      <Reveal className="relative mt-8 flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="ov-klein max-w-xl text-ink-700">
          {en
            ? "Planning a switch? Choose “Switch provider” in the enquiry – we will set the cut-over date and parallel run together."
            : "Sie planen einen Wechsel? Wählen Sie in der Anfrage „Anbieter wechseln“ – Stichtag und Parallellauf legen wir gemeinsam fest."}
        </p>
        <div className="flex shrink-0 flex-col gap-3 sm:flex-row">
          {/* Paket B7: Wechsel-Check – sinnvoll und möglich? */}
          <Button href="/energiegemeinschaften/software/wechsel-check" variant="secondary" className="shrink-0">{en ? "Take the switch check" : "Wechsel-Check starten"}</Button>
          <Button href="#anfrage" pfeil className="shrink-0">{en ? "Discuss a switch" : "Wechsel besprechen"}</Button>
        </div>
      </Reveal>
    </Section>
  );
}
