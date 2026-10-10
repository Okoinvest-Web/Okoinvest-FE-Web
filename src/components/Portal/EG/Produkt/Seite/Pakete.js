// Pakete Software / Betriebsführung / Gründung (Preise auf Anfrage)
// Entscheidungshilfe: Wegweiser „Welches Paket passt?“ + drei Karten mit
// per Subgrid ausgerichteten Zeilen (Kopf, Titel, Arbeitsteilung, Text, Liste, Fuß).
import { ArrowDown, ArrowRight, Building2, ClipboardList, Sparkles, Users } from "lucide-react";
import Button from "@/components/ui/Button";
import Section from "@/components/ui/Section";
import SectionHeading from "@/components/ui/SectionHeading";
import Reveal from "@/components/ui/Reveal";
import { cn } from "@/components/ui/cn";
import { Haken } from "./teile";
import { spracheDerAnfrage } from "@/lib/land/seite";
import Link from "@/components/Land/Link";

const PAKETE = [
  {
    id: "paket-software",
    icon: ClipboardList,
    title: "Software",
    tag: "Selbstverwaltet",
    fuer: "Für Vorstände, die selbst abrechnen möchten",
    frage: "Ihr Vorstand möchte selbst abrechnen",
    text: "Plattform für Vorstand, Kassa und Mitglieder: Stammdaten, EDA-Prozesse, Energiedaten, Abrechnung, Portal.",
    punkte: ["Mitgliederportal und Beitritt online", "Abrechnung mit Vier-Augen-Freigabe", "Export für die Steuerberatung"],
    // schematische Arbeitsteilung: Anteil „Ihre Gemeinschaft“ in Vierteln
    sie: 3,
    teilung: "Ihre Gemeinschaft arbeitet selbst, wir liefern Werkzeug und Support",
  },
  {
    id: "paket-betrieb",
    icon: Users,
    title: "Betriebsführung",
    tag: "ÖkoInvest als Organisator",
    fuer: "Für Gemeinschaften, deren Ehrenamt entlastet werden soll",
    frage: "Ihr Ehrenamt soll entlastet werden",
    text: "Wir übernehmen als Organisator nach § 68 Abs. 2 ElWG Anmeldungen, Datenqualität, Abrechnung und Mitgliederfragen – auf Basis eines Dienstleistungs- und Auftragsverarbeitungsvertrags.",
    punkte: ["Kommunikation mit dem Netzbetreiber", "Lieferantenpflichten ab 100 kW (§ 69)", "Ansprechpartner für Mitglieder"],
    sie: 1,
    teilung: "Wir übernehmen den laufenden Betrieb für Sie",
    hervorgehoben: "Größte Entlastung",
  },
  {
    id: "paket-gruendung",
    icon: Building2,
    title: "Gründung",
    tag: "Von der Idee bis zum ersten Strom",
    fuer: "Für Gemeinden, Vereine und Initiativen am Anfang",
    frage: "Sie wollen eine Gemeinschaft gründen",
    text: "Machbarkeit mit Simulation, Rechtsform und Statuten, Marktpartner, Vertrag mit dem Netzbetreiber, EDA-Zugang, erste Mitglieder.",
    punkte: ["Netzgebiets- und Nahebereichs-Check", "Statuten und Verträge aus Mustern", "Startkampagne für Mitglieder"],
    sie: 2,
    teilung: "Wir begleiten Sie Schritt für Schritt",
  },
];

/* Sprachmodell: englische Fassung (gleiche ids) */
const PAKETE_EN = {
  "paket-software": {
    title: "Software",
    tag: "Self-managed",
    fuer: "For boards that want to do the billing themselves",
    frage: "Your board wants to do the billing itself",
    text: "Platform for board, treasurer and members: master data, EDA processes, energy data, billing, portal.",
    punkte: ["Member portal and online joining", "Billing with four-eyes approval", "Export for the tax adviser"],
    teilung: "Your community does the work, we provide the tool and support",
    anfragen: "Enquire about Software",
  },
  "paket-betrieb": {
    title: "Operational management",
    tag: "ÖkoInvest as organiser",
    fuer: "For communities whose volunteers need relief",
    frage: "Your volunteers need relief",
    text: "As organiser under § 68(2) ElWG, we take over registrations, data quality, billing and member questions – on the basis of a service and data processing agreement.",
    punkte: ["Communication with the grid operator", "Supplier obligations from 100 kW (§ 69)", "Contact person for members"],
    teilung: "We take over day-to-day operation for you",
    hervorgehoben: "Greatest relief",
    anfragen: "Enquire about operational management",
  },
  "paket-gruendung": {
    title: "Founding",
    tag: "From the idea to the first power",
    fuer: "For municipalities, associations and initiatives at the start",
    frage: "You want to found a community",
    text: "Feasibility with simulation, legal form and articles of association, market partners, contract with the grid operator, EDA access, first members.",
    punkte: ["Grid area and proximity area check", "Articles of association and contracts from templates", "Launch campaign for members"],
    teilung: "We guide you step by step",
    anfragen: "Enquire about founding",
  },
};
const WORTE = {
  de: {
    gemeinschaft: "Ihre Gemeinschaft", teilung: "Arbeitsteilung: ", eyebrow: "Pakete", titel: "So viel Unterstützung, wie Ihre Gemeinschaft braucht",
    lead: "Vom Werkzeug für selbstverwaltete Gemeinschaften bis zum kompletten Betrieb. Preise auf Anfrage – wir kalkulieren je Gemeinschaft nach Größe und Leistungsumfang und legen das Angebot transparent dar.",
    welches: "Welches Paket passt?", schwerpunkte: "Schwerpunkte", preis: "Preis nach Größe", aufAnfrage: "auf Anfrage", anfragen: (t) => `${t} anfragen`,
    unsicher: "Noch unsicher?", unsicherText: "Schildern Sie kurz Ihre Lage – wir schlagen Ihnen das passende Paket vor und kalkulieren es offen.", anbieter: "Sie haben schon einen Anbieter?", preisblatt: "Zum Preisblatt",
  },
  en: {
    gemeinschaft: "Your community", teilung: "Division of work: ", eyebrow: "Packages", titel: "As much support as your community needs",
    lead: "From a tool for self-managed communities to complete operation. Prices on request – we calculate per community by size and scope of services and set out the offer transparently.",
    welches: "Which package fits?", schwerpunkte: "Focus areas", preis: "Price by size", aufAnfrage: "on request", anfragen: null,
    unsicher: "Still unsure?", unsicherText: "Briefly describe your situation – we will suggest the right package and calculate it openly.", anbieter: "Already have a provider?", preisblatt: "View the price sheet",
  },
};
const worte = () => WORTE[spracheDerAnfrage() === "en" ? "en" : "de"];

/** Schematische Arbeitsteilung in vier Segmenten – rein qualitativ, ohne Zahlen */
function Arbeitsteilung({ sie, text, dunkel }) {
  const w = worte();
  return (
    <div className={cn("rounded-2xl p-3.5", dunkel ? "bg-white/[0.06] ring-1 ring-white/10" : "bg-sand-50 ring-1 ring-ink-200/60")}>
      <div className={cn("flex items-center justify-between text-[11.5px] font-semibold uppercase tracking-[0.12em]", dunkel ? "text-white/60" : "text-ink-500")}>
        <span className="inline-flex items-center gap-1.5"><span aria-hidden="true" className={cn("h-2 w-2 rounded-full", dunkel ? "bg-white/70" : "bg-navy-700")} />{w.gemeinschaft}</span>
        <span className="inline-flex items-center gap-1.5">ÖkoInvest<span aria-hidden="true" className={cn("h-2 w-2 rounded-full", dunkel ? "bg-ov-400" : "bg-ov-500")} /></span>
      </div>
      <div aria-hidden="true" className="mt-2 flex gap-1">
        {[0, 1, 2, 3].map((k) => (
          <span
            key={k}
            className={cn(
              "h-1.5 flex-1 rounded-full",
              k < sie
                ? dunkel ? "bg-white/70" : "bg-navy-700"
                : dunkel ? "bg-ov-400" : "bg-ov-500"
            )}
          />
        ))}
      </div>
      <p className={cn("mt-2.5 text-[13.5px] leading-snug", dunkel ? "text-white/85" : "text-ink-700")}>
        <span className="sr-only">{w.teilung}</span>{text}
      </p>
    </div>
  );
}

export default function Pakete() {
  const en = spracheDerAnfrage() === "en";
  const w = worte();
  const pakete = en ? PAKETE.map((p) => ({ ...p, ...PAKETE_EN[p.id] })) : PAKETE;
  return (
    <Section data-abschnitt="pakete" tone="sand" space="lg" id="pakete" className="scroll-mt-24">
      <div className="grid gap-8 lg:grid-cols-[1.15fr_0.85fr] lg:items-end lg:gap-16">
        <SectionHeading
          eyebrow={w.eyebrow}
          title={w.titel}
          className="[&_h2]:hyphens-manual!"
          lead={w.lead}
        />

        {/* Entscheidungshilfe: Lage wählen → zur passenden Karte springen */}
        <Reveal as="nav" aria-labelledby="pakete-wegweiser" delay={120} className="rounded-[1.75rem] bg-white p-2 shadow-e1 ring-1 ring-ink-200/70">
          <p id="pakete-wegweiser" className="px-4 pb-2 pt-3 text-[12.5px] font-semibold uppercase tracking-[0.16em] text-ink-500">{w.welches}</p>
          <ul role="list">
            {pakete.map((p) => (
              <li key={p.id}>
                <a
                  href={`#${p.id}`}
                  className="group flex items-center gap-3 rounded-2xl px-4 py-3 transition-colors duration-200 hover:bg-ov-50 focus-visible:bg-ov-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ov-600"
                >
                  <span aria-hidden="true" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-ov-50 text-ov-700 ring-1 ring-ov-100 transition-colors group-hover:bg-white">
                    <p.icon className="h-[18px] w-[18px]" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-[14.5px] font-medium leading-snug text-ink-800">{p.frage}</span>
                    <span className="block text-[13px] font-semibold text-ov-700">→ {p.title}</span>
                  </span>
                  <ArrowDown aria-hidden="true" className="h-4 w-4 shrink-0 text-ink-400 transition-transform duration-200 group-hover:translate-y-0.5 group-hover:text-ov-700" />
                </a>
              </li>
            ))}
          </ul>
        </Reveal>
      </div>

      <ul role="list" className="mt-14 grid gap-6 md:mt-16 lg:grid-cols-3 lg:gap-x-5 lg:gap-y-0">
        {pakete.map((p, i) => {
          const dunkel = Boolean(p.hervorgehoben);
          return (
            <Reveal
              as="li"
              key={p.id}
              id={p.id}
              delay={i * 90}
              aria-labelledby={`${p.id}-titel`}
              className="scroll-mt-28 lg:row-span-6 lg:grid lg:grid-rows-subgrid"
            >
              <article
                className={cn(
                  "ov-lift relative flex h-full flex-col gap-5 rounded-[2rem] p-6 sm:p-8 md:grid md:grid-cols-2 md:gap-x-10 md:gap-y-5 lg:row-span-6 lg:grid-cols-1 lg:grid-rows-subgrid",
                  dunkel
                    ? "ov-verlauf-nacht text-white shadow-e3 ring-2 ring-ov-500/60"
                    : "bg-white shadow-e1 ring-1 ring-ink-200/70"
                )}
              >
                {p.hervorgehoben && (
                  <span className="absolute -top-3.5 left-6 inline-flex items-center gap-1.5 rounded-full bg-sun-400 px-3 py-1 text-[12px] font-bold uppercase tracking-[0.1em] text-navy-950 shadow-e2 sm:left-8">
                    <Sparkles aria-hidden="true" className="h-3.5 w-3.5" />
                    {p.hervorgehoben}
                  </span>
                )}

                {/* 1 Kopf */}
                <div className="flex items-center gap-3 md:col-start-1 md:row-start-1 lg:row-start-auto">
                  <span aria-hidden="true" className={cn("flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl", dunkel ? "bg-ov-500 text-white shadow-[0_8px_24px_-8px_rgba(102,153,51,0.8)]" : "bg-ov-50 text-ov-600 ring-1 ring-ov-100")}>
                    <p.icon className="h-6 w-6" />
                  </span>
                  <span className={cn("text-[11.5px] font-semibold uppercase leading-tight tracking-[0.14em]", dunkel ? "text-ov-300" : "text-ov-700")}>{p.tag}</span>
                </div>

                {/* 2 Titel und Zielgruppe */}
                <div className="md:col-start-1 md:row-start-2 lg:row-start-auto">
                  <h3 id={`${p.id}-titel`} className={cn("ov-h3", dunkel ? "text-white" : "text-ink-900")}>{p.title}</h3>
                  <p className={cn("mt-1.5 text-[15px] font-medium leading-snug", dunkel ? "text-white/85" : "text-ink-700")}>{p.fuer}</p>
                </div>

                {/* 3 Arbeitsteilung */}
                <div className="md:col-start-1 md:row-start-3 lg:row-start-auto">
                  <Arbeitsteilung sie={p.sie} text={p.teilung} dunkel={dunkel} />
                </div>

                {/* 4 Beschreibung */}
                <p className={cn("text-[15px] leading-relaxed md:col-start-2 md:row-span-2 md:row-start-1 lg:col-start-auto lg:row-span-1 lg:row-start-auto", dunkel ? "text-white/75" : "text-ink-600")}>{p.text}</p>

                {/* 5 Schwerpunkte */}
                <div className={cn("border-t pt-5 md:col-start-2 md:row-start-3 md:border-t-0 md:pt-0 lg:col-start-auto lg:row-start-auto lg:border-t lg:pt-5", dunkel ? "border-white/10" : "border-ink-100")}>
                  <p className={cn("text-[12px] font-semibold uppercase tracking-[0.14em]", dunkel ? "text-white/60" : "text-ink-500")}>{w.schwerpunkte}</p>
                  <ul role="list" className="mt-3 space-y-2.5">
                    {p.punkte.map((x, k) => (
                      <li key={k} className={cn("flex gap-2.5 text-[14.5px] leading-snug", dunkel ? "text-white/90" : "text-ink-800")}>
                        <Haken dunkel={dunkel} />
                        {x}
                      </li>
                    ))}
                  </ul>
                </div>

                {/* 6 Preis und nächster Schritt */}
                <div className={cn("mt-auto border-t pt-5 md:col-span-2 md:row-start-4 md:mt-0 md:flex md:items-center md:justify-between md:gap-8 lg:col-span-1 lg:row-start-auto lg:block lg:self-end", dunkel ? "border-white/10" : "border-ink-100")}>
                  <p className="flex items-baseline justify-between gap-3 md:flex-col md:gap-0.5 lg:flex-row lg:gap-3">
                    <span className={cn("text-[13px]", dunkel ? "text-white/60" : "text-ink-500")}>{w.preis}</span>
                    <span className={cn("text-[15px] font-semibold", dunkel ? "text-white" : "text-ink-900")}>{w.aufAnfrage}</span>
                  </p>
                  <Button href="#anfrage" variant={dunkel ? "primary" : "secondary"} block pfeil className="mt-4 md:mt-0 md:w-auto md:min-w-64 lg:mt-4 lg:w-full">
                    {p.anfragen ?? w.anfragen(p.title)}
                  </Button>
                </div>
              </article>
            </Reveal>
          );
        })}
      </ul>

      {/* Unsicher? – Brücke zur Anfrage und zum Wechsel */}
      <Reveal className="mt-10 flex flex-col gap-4 rounded-[1.5rem] border border-dashed border-ink-300/80 px-6 py-5 sm:flex-row sm:items-center sm:justify-between md:mt-12">
        <p className="ov-klein max-w-2xl text-ink-700">
          <span className="font-semibold text-ink-900">{w.unsicher}</span> {w.unsicherText}
        </p>
        {/* Paket B7: Preisblatt mit Aufbau Einrichtung, Grundgebühr, je Zählpunkt */}
        <div className="flex shrink-0 flex-wrap items-center gap-x-6 gap-y-2">
        <Link
          href="/energiegemeinschaften/software/preise"
          className="group inline-flex shrink-0 items-center gap-1.5 rounded-full text-[15px] font-semibold text-ov-700 underline-offset-4 hover:text-ov-800 hover:underline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ov-600"
        >
          {w.preisblatt}
          <ArrowRight aria-hidden="true" className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5" />
        </Link>
        <a
          href="#wechsel"
          className="group inline-flex shrink-0 items-center gap-1.5 rounded-full text-[15px] font-semibold text-ov-700 underline-offset-4 hover:text-ov-800 hover:underline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ov-600"
        >
          {w.anbieter}
          <ArrowRight aria-hidden="true" className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5" />
        </a>
        </div>
      </Reveal>
    </Section>
  );
}
