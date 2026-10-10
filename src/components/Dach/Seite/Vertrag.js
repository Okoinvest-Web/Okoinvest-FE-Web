// Der Dachnutzungsvertrag – als Vertragsblatt mit acht Regelungspunkten
import { CalendarClock, FileSignature, HandCoins, Hammer, KeyRound, ScrollText, ShieldCheck, Wrench } from "lucide-react";
import SectionHeading from "@/components/ui/SectionHeading";
import Reveal from "@/components/ui/Reveal";
import Button from "@/components/ui/Button";
import { landDerAnfrage, spracheDerAnfrage } from "@/lib/land/seite";
import { uebersetze } from "@/lib/sprache/woerterbuch";
import { schreibweiseBaum } from "@/components/Land/SchweizerSchreibweise";

// Schweiz (/ch, /en/ch): fest geschriebene Texte ohne „ß“ (W3-0, src/components/Land/SchweizerSchreibweise.js)
const chBaum = (el) => schreibweiseBaum(el, landDerAnfrage());

/** Sprachmodell: Texte (en nur Texte; Länderunterschied AT bei der Dienstbarkeit). */
const W = {
  de: {
    eyebrow: "Der Dachnutzungsvertrag",
    titel: "Was im Vertrag steht – und warum.",
    lead: "Ein Dachvertrag bindet Ihr Gebäude für Jahrzehnte. Wir legen den Entwurf offen vor, erklären jede Klausel und geben Ihnen Zeit für die Prüfung mit Anwalt oder Verband.",
    button: "Vertragsentwurf anfragen",
    blatt: "Dachnutzungsvertrag",
    ueberblick: "Inhalte im Überblick",
  },
  en: {
    eyebrow: "The roof use agreement",
    titel: "What the contract says – and why.",
    lead: "A roof agreement binds your building for decades. We share the draft openly, explain every clause and give you time to review it with a lawyer or your association.",
    button: "Request a draft contract",
    blatt: "Roof use agreement",
    ueberblick: "Contents at a glance",
  },
};

/** Englisch: Regelungspunkte je Index (Dienstbarkeit AT: im Grundbuch eingetragen). */
const punkteEn = (laufzeit, verlaengerung, at) => [
  { t: "Term", x: `Usually ${laufzeit} years from commissioning, plus ${String(verlaengerung).replace(/^(.*) Jahre Option$/, "options of $1 years")} – matched to the remaining service life of the roof.` },
  { t: "Easement", x: at ? "An easement (Dienstbarkeit) entered in the land register for the installation, cable routes and access – a prerequisite for financing, and it also binds buyers." : "A limited personal easement (beschränkte persönliche Dienstbarkeit) for the installation, cable routes and access – a prerequisite for financing, and it also binds buyers." },
  { t: "Decommissioning", x: "Dismantling and restoring the roof membrane are the operator’s obligation, secured (by a guarantee) for larger installations." },
  { t: "Insurance & liability", x: "The operator insures the installation and its liability and indemnifies you. Coordination with your building insurance before construction." },
  { t: "Access & operation", x: "Notification, times, walkways, fall protection, access for maintenance and faults – without disrupting your operations." },
  { t: "Roof renovation during the term", x: "Dismantling and reinstallation on request, cost allocation and how lost yield is handled – agreed in advance." },
  { t: "Roof maintenance", x: "Who maintains the roof membrane, drainage and roof lights under the modules? Clear obligations prevent disputes later." },
  { t: "Legal succession & tenants", x: "Transfer on sale or inheritance; rules for tenants in the building, for example on roof access and power supply." },
];

export default function Vertrag({ laufzeit, verlaengerung }) {
  const sprache = spracheDerAnfrage();
  const w = uebersetze(W, sprache);
  const punkteDe = [
    { icon: CalendarClock, t: "Laufzeit", x: `Meist ${laufzeit} Jahre ab Inbetriebnahme, dazu ${verlaengerung} – abgestimmt auf die Restnutzungsdauer des Dachs.` },
    { icon: ScrollText, t: "Dienstbarkeit", x: landDerAnfrage() === "AT" ? "Im Grundbuch eingetragene Dienstbarkeit für Anlage, Kabelwege und Zugang – Voraussetzung für die Finanzierung, bindet auch Käufer." : "Beschränkte persönliche Dienstbarkeit für Anlage, Kabelwege und Zugang – Voraussetzung für die Finanzierung, bindet auch Käufer." },
    { icon: ShieldCheck, t: "Rückbau", x: "Rückbau und Wiederherstellung der Dachhaut sind Pflicht des Betreibers, bei größeren Anlagen mit Sicherheit (Bürgschaft)." },
    { icon: HandCoins, t: "Versicherung & Haftung", x: "Betreiber versichert Anlage und Haftpflicht und stellt Sie frei. Abstimmung mit Ihrer Gebäudeversicherung vor dem Bau." },
    { icon: KeyRound, t: "Zugang & Betrieb", x: "Anmeldung, Zeiten, Laufwege, Absturzsicherung, Zugang für Wartung und Störungen – ohne Ihren Betrieb zu stören." },
    { icon: Hammer, t: "Dachsanierung in der Laufzeit", x: "Demontage und Remontage auf Anforderung, Kostenverteilung und Umgang mit dem Ertragsausfall – vorab geregelt." },
    { icon: Wrench, t: "Instandhaltung Dach", x: "Wer wartet Dachhaut, Entwässerung und Lichtbänder unter den Modulen? Klare Pflichten verhindern späteren Streit." },
    { icon: FileSignature, t: "Rechtsnachfolge & Mieter", x: "Übergang bei Verkauf oder Erbe; Regeln für Mieter im Gebäude, etwa für Dachzugang und Stromlieferung." },
  ];
  const punkte = sprache === "en" ? punkteDe.map((k, i) => ({ ...k, ...punkteEn(laufzeit, verlaengerung, landDerAnfrage() === "AT")[i] })) : punkteDe;

  return chBaum(
    <section data-abschnitt="vertrag" aria-labelledby="vertrag-titel" className="relative overflow-clip bg-sand-50 py-20 md:py-28">
      <div className="ov-container grid gap-12 lg:grid-cols-[minmax(0,0.75fr)_minmax(0,1.25fr)] lg:gap-16">
        <div className="lg:sticky lg:top-28 lg:self-start">
          <SectionHeading
            eyebrow={w.eyebrow}
            title={<span id="vertrag-titel">{w.titel}</span>}
            lead={w.lead}
          />
          <Reveal className="mt-8">
            <Button href="#anfrage" variant="navy" pfeil>{w.button}</Button>
          </Reveal>
        </div>

        {/* Vertragsblatt */}
        <Reveal dir="scale" className="relative">
          <div aria-hidden="true" className="absolute inset-x-4 -bottom-3 top-3 rounded-[1.75rem] bg-white/60 ring-1 ring-ink-200/60 max-sm:hidden" />
          <div className="relative overflow-hidden rounded-[1.75rem] bg-white shadow-e3 ring-1 ring-ink-200/70">
            <div className="flex items-center justify-between gap-3 border-b border-ink-100 bg-gradient-to-b from-sand-50 to-white px-5 py-4 md:px-8">
              <p className="flex items-center gap-2.5 font-display text-[15px] font-bold text-ink-900">
                <ScrollText aria-hidden="true" className="h-4 w-4 text-ov-600" />
                {w.blatt}
              </p>
              <span className="rounded-full bg-ink-50 px-2.5 py-0.5 text-[11.5px] font-semibold text-ink-600 ring-1 ring-ink-200">{w.ueberblick}</span>
            </div>
            <ol className="grid sm:grid-cols-2">
              {punkte.map((k, i) => (
                <li key={i} className="flex gap-4 border-ink-100 p-5 md:p-6 max-sm:[&:not(:first-child)]:border-t sm:[&:nth-child(n+3)]:border-t sm:[&:nth-child(even)]:border-l">
                  <span className="ov-num mt-0.5 font-display text-[13px] font-bold text-ov-600" aria-hidden="true">§&nbsp;{i + 1}</span>
                  <div className="min-w-0">
                    <p className="flex items-center gap-2 font-display text-[16px] font-bold text-ink-900">
                      {k.t}
                      <k.icon aria-hidden="true" className="h-4 w-4 shrink-0 text-ink-300" />
                    </p>
                    <p className="mt-1.5 text-[14px] leading-relaxed text-ink-600">{k.x}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
