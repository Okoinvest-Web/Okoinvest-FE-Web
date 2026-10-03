// /energiegemeinschaften/software – Plattform und Betriebsführung für Energiegemeinschaften in Österreich (WP6):
// Mitgliederportal, Ersparnis-Rechner, fairer Vergleich mit dem Markt (belegt aus docs/EG-MARKT.md, keine Herabsetzung),
// Pakete Software / Betriebsführung / Gründung (Preise auf Anfrage), Wechsel, ElWG-Neuerungen, Anfrage über POST /api/anfrage.
//
// Spannungsbogen für Entscheider: Anlass → Lösung (Tour, Kassa & Vorstand, Mitglieder) → ElWG → Vergleich → Angebot
// (Pakete, Wechsel) → Einwände (FAQ) → Anfrage. Tönung wechselt streng white/sand; dunkle Anker: Hero, ElWG (Mitte), Anfrage (Schluss).
// Reihenfolge der Töne: Hero navy · Wegweiser/Tour white · Kassa sand · Mitglieder white · Rechner sand · ElWG navy ·
// Vergleich white · Pakete sand · Wechsel white · FAQ sand · Anfrage navy · Abschluss white.
//
// Die Abschnitte liegen einzeln unter src/components/Portal/EG/Produkt/Seite/ (je mit data-abschnitt-Attribut).

import { rechnerMetadata } from "@/components/Rechner/RechnerSeite";
import { abs } from "@/data/site";
import Hero from "@/components/Portal/EG/Produkt/Seite/Hero";
import Fakten from "@/components/Portal/EG/Produkt/Seite/Fakten";
import Wegweiser from "@/components/Portal/EG/Produkt/Seite/Wegweiser";
import Tour from "@/components/Portal/EG/Produkt/Seite/Tour";
import Kassa from "@/components/Portal/EG/Produkt/Seite/Kassa";
import Mitglieder from "@/components/Portal/EG/Produkt/Seite/Mitglieder";
import RechnerSektion from "@/components/Portal/EG/Produkt/Seite/RechnerSektion";
import Elwg from "@/components/Portal/EG/Produkt/Seite/Elwg";
import Vergleich from "@/components/Portal/EG/Produkt/Seite/Vergleich";
import Pakete from "@/components/Portal/EG/Produkt/Seite/Pakete";
import Wechsel from "@/components/Portal/EG/Produkt/Seite/Wechsel";
import Faq from "@/components/Portal/EG/Produkt/Seite/Faq";
import Anfrage from "@/components/Portal/EG/Produkt/Seite/Anfrage";
import Abschluss from "@/components/Portal/EG/Produkt/Seite/Abschluss";
import JsonLd from "@/components/JsonLd";
import { pfad as seitenPfad } from "@/lib/land";
import { landDerSeite, landMetadata } from "@/lib/land/seite";

const PFAD = seitenPfad("/energiegemeinschaften/software");

const metadata = rechnerMetadata({
  pfad: PFAD,
  title: "Software für Energiegemeinschaften in Österreich | ÖkoInvest",
  description: "Software und Betriebsführung für EEG, BEG und GEA nach ElWG: Zustimmung beim Netzbetreiber, Mehrfachteilnahme, Ersparnis-Rechner, Gründung und Wechsel.",
  keywords: ["Energiegemeinschaft Software", "EEG Abrechnung", "Bürgerenergiegemeinschaft", "ElWG Energiegemeinschaft", "Mehrfachteilnahme Teilnahmefaktor", "Energiegemeinschaft gründen Österreich"],
});

const schema = {
  "@context": "https://schema.org",
  "@type": "Service",
  "@id": `${abs(PFAD)}/#service`,
  name: "Plattform und Betriebsführung für Energiegemeinschaften",
  serviceType: "Software und Dienstleistung für Energiegemeinschaften",
  description: "Mitgliederportal, EDA-Prozesse, Abrechnung, Gründung und Betriebsführung für Energiegemeinschaften in Österreich nach ElWG.",
  provider: { "@id": `${abs("/")}/#organization` },
  areaServed: { "@type": "Country", name: "Österreich" },
  url: abs(PFAD),
};

export default async function SoftwarePage({ params }) {
  await landDerSeite(params, "/energiegemeinschaften/software");
  return (
    // Silbentrennung: Einleitungen und Abschnittsüberschriften nie trennen („Gemein-schaft“, „Unter-schied“),
    // Fließtext erst ab lg nicht mehr – dort sind die Spalten breit genug. Schmale Karten mobil trennen weiter.
    <div className="[&_.ov-lead]:hyphens-manual [&_h2]:hyphens-manual! lg:[&_p]:hyphens-manual">
      <JsonLd daten={schema} />
      <Hero />
      <Fakten />
      <Wegweiser />
      <Tour />
      <Kassa />
      <Mitglieder />
      <RechnerSektion />
      <Elwg />
      <Vergleich />
      <Pakete />
      <Wechsel />
      <Faq />
      <Anfrage />
      <Abschluss />
    </div>
  );
}

export const generateMetadata = landMetadata("/energiegemeinschaften/software", metadata);
