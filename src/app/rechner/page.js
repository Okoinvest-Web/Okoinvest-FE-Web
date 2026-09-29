// src/app/rechner/page.js – Hub „Rechner & Tools"

import Link from "next/link";
import { ArrowRight, ArrowUpRight } from "lucide-react";
import PageHero from "@/components/ui/PageHero";
import Section from "@/components/ui/Section";
import SectionHeading from "@/components/ui/SectionHeading";
import Faq from "@/components/ui/Faq";
import CtaBand from "@/components/ui/CtaBand";
import Reveal from "@/components/ui/Reveal";
import { cn } from "@/components/ui/cn";
import { TOOLS } from "@/components/Rechner/tools";
import { rechnerMetadata } from "@/components/Rechner/RechnerSeite";
import { VorschauAgri, VorschauBalken, VorschauCarport, VorschauCashflow, VorschauFlaeche, VorschauPacht, VorschauStrompreis, VorschauTreppe } from "@/components/Rechner/ToolVorschau";
import { rechneSolarpark } from "@/lib/rechner/solarpark";
import { rechneKommune } from "@/lib/rechner/kommune";
import { abs } from "@/data/site";
import { STAND } from "@/lib/invest/markt";
import { fmt } from "@/lib/rechner/annahmen";

const PFAD = "/rechner";

export const metadata = rechnerMetadata({
  pfad: PFAD,
  title: "Rechner für Solarparks, Pacht & Agri-PV | ÖkoInvest",
  description:
    "Kostenlose Profi-Rechner für den DACH-Raum: Flächencheck, Pacht, Agri-PV, Solarpark-Rendite, Projektbewertung, Reststrom, Solarcarport und Kommunal-Einnahmen.",
  keywords: ["Solarpark Rechner", "Pachtrechner Photovoltaik", "Agri-PV Rechner", "Projektbewertung Solar", "Solarcarport Rechner", "Solarpark Gemeinde Einnahmen"],
});

const toolById = (id) => TOOLS.find((t) => t.id === id);

const GRUPPEN = [
  { titel: "Flächeneigentümer & Landwirte", text: "Eignet sich Ihre Fläche – und was bringt sie über 30 Jahre?", ids: ["flaechencheck", "pacht", "agri-pv"] },
  { titel: "Investoren & Entwickler", text: "Rendite, Finanzierung und Wert von Projekten in jeder Phase.", ids: ["solarpark", "projektbewertung"] },
  { titel: "Unternehmen & Kommunen", text: "Günstiger Strom, Parkplatz-PV und Einnahmen für die Gemeinde.", ids: ["reststrom", "solarcarport", "kommune"] },
];

const FAQ = [
  {
    q: "Wie genau sind die ÖkoInvest-Rechner?",
    a: "Sie liefern eine fundierte Orientierung auf Basis offengelegter Marktannahmen – Einstrahlung, Baukosten, Pachtpreise, Ausschreibungsergebnisse und Finanzierungskonditionen. Jede Rechnerseite zeigt ihre Annahmen und Quellen. Verbindlich werden Zahlen erst mit Ertragsgutachten, Netzauskunft und konkreten Angeboten.",
  },
  {
    q: "Kosten die Rechner etwas?",
    a: "Nein. Alle Rechner sind kostenlos und ohne Anmeldung nutzbar. Erst wenn Sie eine Anfrage senden, übermitteln Sie Ihre Werte – auf Wunsch direkt aus dem Rechner.",
  },
  {
    q: "Gelten die Rechner auch für Österreich und die Schweiz?",
    a: "Die Ertrags- und Wirtschaftlichkeitsrechner enthalten Regionen für Deutschland, Österreich und die Schweiz. Förder- und Steuerregeln (etwa EEG-Zuschläge, § 6 EEG oder Gewerbesteuer) bilden sie nach deutschem Recht ab; die Unterschiede in Österreich und der Schweiz erläutern wir auf den jeweiligen Seiten.",
  },
  {
    q: "Wie aktuell sind die Annahmen?",
    a: `Stand ist ${STAND}. Wir aktualisieren die Werte an einer zentralen Stelle, sobald neue Ausschreibungsergebnisse, Kosten- oder Marktdaten vorliegen – alle Rechner übernehmen sie automatisch.`,
  },
];

export default function RechnerHub() {
  // Beispielrechnungen für die Vorschauen – mit derselben Logik wie die Rechner
  const park = rechneSolarpark({ mwp: 10 });
  let kum = -park.investition.summe;
  const cf = [kum, ...park.jahre.map((j) => (kum += j.cfProjekt))];
  const gemeinde = rechneKommune({ mwp: 20 });

  const vorschau = {
    flaechencheck: <VorschauFlaeche />,
    pacht: <VorschauPacht />,
    "agri-pv": <VorschauAgri />,
    solarpark: (
      <div>
        <div className="mb-2 flex items-baseline justify-between text-[12.5px] text-ink-500">
          <span>Beispiel 10 MWp · kumulierter Cashflow</span>
          <span className="ov-num font-semibold text-ink-700">LCOE {fmt(park.lcoeCt, 1)} ct</span>
        </div>
        <VorschauCashflow werte={cf} />
      </div>
    ),
    projektbewertung: (
      <div>
        <p className="mb-2 text-[12.5px] text-ink-500">Werttreppe bis Baureife, €/kWp</p>
        <VorschauTreppe />
      </div>
    ),
    reststrom: <VorschauStrompreis />,
    solarcarport: <VorschauCarport />,
    kommune: (
      <VorschauBalken
        reihen={[
          { label: "§ 6 EEG (30 J.)", wert: gemeinde.gesamtLaufzeit.p6, anzeige: `${fmt(gemeinde.gesamtLaufzeit.p6 / 1e6, 1)} Mio. €`, farbe: "#669933" },
          { label: "Gewerbesteuer (30 J.)", wert: gemeinde.gesamtLaufzeit.gewSt || 1, anzeige: `${fmt(gemeinde.gesamtLaufzeit.gewSt / 1e6, 1)} Mio. €`, farbe: "#1f5aa1" },
        ]}
      />
    ),
  };

  const itemList = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: "ÖkoInvest Rechner & Tools",
    url: abs(PFAD),
    numberOfItems: TOOLS.length,
    itemListElement: TOOLS.map((t, i) => ({ "@type": "ListItem", position: i + 1, url: abs(t.href), name: t.titel, description: t.text })),
  };

  return (
    <div>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(itemList) }} />

      <PageHero
        variant="dark"
        breadcrumbs={[{ name: "Rechner & Tools" }]}
        eyebrow="Rechner & Tools"
        title={
          <>
            Erst rechnen, <span className="ov-text-gradient-light">dann entscheiden.</span>
          </>
        }
        lead="Acht kostenlose Werkzeuge für Flächen, Projekte, Kapital und Strom – mit offengelegten Marktannahmen für Deutschland, Österreich und die Schweiz."
        stats={[
          { value: TOOLS.length, label: "kostenlose Tools" },
          { value: 3, label: "Länder im DACH-Raum" },
          { value: 30, suffix: " J.", label: "Cashflow je Solarpark" },
        ]}
        className="[&>div.ov-container]:pb-28 md:[&>div.ov-container]:pb-36"
      />

      <section aria-label="Alle Rechner und Tools" className="relative z-10 -mt-20 md:-mt-28">
        <div className="ov-container">
          <div className="divide-y divide-ink-100 rounded-[2rem] bg-white px-5 shadow-[0_40px_80px_-40px_rgba(3,18,43,0.45)] ring-1 ring-ink-200/70 sm:px-6 md:px-8">
            {GRUPPEN.map((g) => (
              <div key={g.titel} className="py-8 md:py-10">
                <div className="mb-6 flex flex-wrap items-end justify-between gap-x-6 gap-y-1">
                  <h2 className="ov-h3 text-ink-900 md:text-[26px]">{g.titel}</h2>
                  <p className="text-[14.5px] text-ink-500">{g.text}</p>
                </div>
                <ul className={cn("grid gap-4 lg:gap-5", g.ids.length === 2 ? "md:grid-cols-2" : "md:grid-cols-2 lg:grid-cols-3")}>
                  {g.ids.map((id, i) => {
                    const t = toolById(id);
                    if (!t) return null;
                    return (
                      <Reveal as="li" key={id} delay={i * 60} className="flex">
                        <ToolKarte tool={t} ton={id === "solarpark" ? "dunkel" : "hell"} gross={g.ids.length === 2}>
                          {vorschau[id]}
                        </ToolKarte>
                      </Reveal>
                    );
                  })}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      <Section tone="white" space="md">
        <div className="grid gap-10 lg:grid-cols-[0.8fr_1.2fr] lg:gap-16">
          <SectionHeading eyebrow="Wegweiser" title="Welcher Rechner passt zu Ihrer Frage?" lead="Wählen Sie das Werkzeug nach Ihrem Vorhaben – Ergebnisse lassen sich direkt in eine Anfrage übernehmen." />
          <Reveal className="min-w-0">
            <div tabIndex={0} role="region" aria-label="Wegweiser: Vorhaben und passender Rechner" className="overflow-x-auto rounded-3xl ring-1 ring-ink-200/70">
              <table className="w-full min-w-[520px] text-left text-[15px]">
                <caption className="sr-only">Wegweiser: Vorhaben und passender Rechner</caption>
                <thead className="bg-sand-50 text-[12.5px] uppercase tracking-[0.12em] text-ink-600">
                  <tr>
                    <th scope="col" className="px-5 py-3.5 font-semibold">Ihr Vorhaben</th>
                    <th scope="col" className="px-5 py-3.5 font-semibold">Passender Rechner</th>
                    <th scope="col" className="px-5 py-3.5 font-semibold">Ergebnis</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-ink-100">
                  {[
                    ["Fläche verpachten", "flaechencheck", "Eignung, Pachtspanne"],
                    ["Pachtangebot vergleichen", "pacht", "Pacht über 30 Jahre"],
                    ["Agri-PV auf dem eigenen Hof", "agri-pv", "Pacht vs. Investition"],
                    ["Solarpark kaufen oder finanzieren", "solarpark", "IRR, LCOE, DSCR"],
                    ["Projektrechte verkaufen", "projektbewertung", "Kaufpreis je kWp"],
                    ["Stromkosten im Betrieb senken", "reststrom", "Ersparnis im Pool"],
                    ["Parkplatz mit PV überdachen", "solarcarport", "Amortisation, Contracting"],
                    ["Solarpark in der Gemeinde", "kommune", "Einnahmen je Quelle"],
                  ].map(([frage, id, ergebnis]) => {
                    const t = toolById(id);
                    return (
                      <tr key={id} className="bg-white">
                        <td className="px-5 py-3.5 text-ink-700">{frage}</td>
                        <td className="px-5 py-3.5">
                          <Link href={t.href} className="inline-flex items-center gap-1.5 font-semibold text-ov-700 hover:text-ov-800">
                            {t.titel} <ArrowRight aria-hidden="true" className="h-3.5 w-3.5" />
                          </Link>
                        </td>
                        <td className="px-5 py-3.5 text-ink-500">{ergebnis}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Reveal>
        </div>
      </Section>

      <Section tone="sand" space="md">
        <div className="grid gap-10 lg:grid-cols-[0.8fr_1.2fr] lg:gap-20">
          <SectionHeading eyebrow="Häufige Fragen" title="Rechner & Tools – gut zu wissen" lead="Transparent, kostenlos und ohne Anmeldung." />
          <Faq items={FAQ} />
        </div>
      </Section>

      <CtaBand
        eyebrow="Kostenlos & unverbindlich"
        title="Aus Zahlen wird ein Projekt."
        text="Sie haben gerechnet – wir prüfen Fläche, Netz und Wirtschaftlichkeit mit echten Daten. Mit festem Ansprechpartner und Status im Portal."
        primary={{ label: "Fläche prüfen lassen", href: "/flaechencheck" }}
        secondary={{ label: "Für Investoren", href: "/investoren" }}
      />
    </div>
  );
}

function ToolKarte({ tool, ton, gross, children }) {
  const Icon = tool.icon;
  const dunkel = ton === "dunkel";
  return (
    <Link
      href={tool.href}
      className={cn(
        "group ov-card-hover relative flex w-full flex-col overflow-hidden rounded-3xl p-6 md:p-7",
        dunkel
          ? "ov-noise bg-navy-900 text-white ring-1 ring-white/10 shadow-[0_24px_48px_-24px_rgba(3,18,43,0.6)]"
          : "bg-sand-50 ring-1 ring-ink-200/70 hover:bg-white hover:ring-ov-300"
      )}
    >
      <div className="flex items-start justify-between gap-4">
        <span className={cn("flex h-12 w-12 items-center justify-center rounded-2xl", dunkel ? "bg-white/10 text-ov-300 ring-1 ring-white/15" : "bg-ov-50 text-ov-600 ring-1 ring-ov-100")}>
          <Icon aria-hidden="true" className="h-6 w-6" />
        </span>
        {tool.tag && <span className={cn("rounded-full px-2.5 py-1 text-[11.5px] font-semibold", dunkel ? "bg-sun-400 text-navy-950" : "bg-ink-900 text-white")}>{tool.tag}</span>}
      </div>
      <h3 className={cn("mt-5 font-display font-extrabold leading-tight tracking-tight", gross ? "text-[24px]" : "text-[20px]", dunkel ? "text-white" : "text-ink-900")}>{tool.titel}</h3>
      <p className={cn("mt-2 text-[14.5px] leading-relaxed", dunkel ? "text-white/70" : "text-ink-600")}>{gross ? tool.text : tool.kurz}</p>
      <div className={cn("mt-6 flex flex-1 flex-col justify-end rounded-2xl bg-white p-4", !dunkel && "ring-1 ring-ink-200/60")}>{children}</div>
      <span className={cn("mt-5 inline-flex items-center gap-1.5 text-[14.5px] font-semibold", dunkel ? "text-ov-300" : "text-ov-700")}>
        Öffnen
        <ArrowUpRight aria-hidden="true" className="h-4 w-4 transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
      </span>
    </Link>
  );
}
