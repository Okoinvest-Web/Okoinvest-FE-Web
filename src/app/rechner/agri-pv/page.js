// src/app/rechner/agri-pv/page.js – Agri-PV-Rechner: drei Wege im Vergleich

import Link from "next/link";
import RechnerSeite, { rechnerMetadata } from "@/components/Rechner/RechnerSeite";
import AgriPvRechner from "@/components/Agri/AgriPvRechner";
import SectionHeading from "@/components/ui/SectionHeading";
import { AGRI, BAUART, ERLOESE, FREIFLAECHE, PACHT } from "@/lib/invest/markt";
import { fmt } from "@/lib/rechner/annahmen";

const PFAD = "/rechner/agri-pv";

export const metadata = rechnerMetadata({
  pfad: PFAD,
  title: "Agri-PV-Rechner: Pacht oder Investition? | ÖkoInvest",
  description:
    "Agri-PV-Rechner für Landwirte: Verpachten, selbst investieren oder über die Genossenschaft beteiligen – mit IRR, Amortisation, GAP-Zahlung und Deckungsbeitrag.",
  keywords: ["Agri-PV Rechner", "Agri-PV Wirtschaftlichkeit", "Agri-PV Pacht", "Agri-PV Investition", "Agri-PV Genossenschaft", "Agri-PV GAP"],
});

const FAQ = [
  {
    q: "Warum rechnet sich hoch aufgeständerte Agri-PV auf dem Acker oft schlechter?",
    a: `Die hohe Unterkonstruktion kostet deutlich mehr – rund ${fmt(AGRI.capexProKwp.hoch.min)}–${fmt(AGRI.capexProKwp.hoch.max)} €/kWp statt ${fmt(AGRI.capexProKwp.vertikal.min)}–${fmt(AGRI.capexProKwp.vertikal.max)} €/kWp bei vertikalen Systemen. Bei Obst und Beeren ersetzt sie aber Hagelnetz oder Folientunnel und schützt einen hohen Deckungsbeitrag; dort ist sie oft die richtige Wahl.`,
  },
  {
    q: "Was bedeutet die Projektrendite (IRR)?",
    a: "Der interne Zinsfuß zeigt, mit wie viel Prozent pro Jahr sich die Investition über die Laufzeit verzinst – hier ohne Bankdarlehen und vor Steuern. Mit einer üblichen Fremdfinanzierung liegt die Rendite auf das eingesetzte Eigenkapital in der Regel höher, das Risiko ebenfalls.",
  },
  {
    q: "Wie ist die Genossenschaft im Rechner abgebildet?",
    a: "Vereinfacht: Die Anlage zahlt Ihnen als Flächeneigentümer die Agri-Pacht, und Sie halten den gewählten Anteil an der Anlage – Sie tragen den entsprechenden Teil der Investition und erhalten den Teil der Überschüsse. Wie viel eine Genossenschaft tatsächlich ausschüttet, entscheidet die Generalversammlung; Rücklagen und Verwaltung mindern die Ausschüttung.",
  },
  {
    q: "Welche Direktzahlungen bleiben mit Agri-PV?",
    a: `Nach den GAP-Regeln in Deutschland bleiben Agri-PV-Flächen nach DIN SPEC 91434 in der Regel zu ${fmt(AGRI.gapFoerderfaehig * 100)} % förderfähig. Der Rechner setzt dafür rund ${fmt(AGRI.direktzahlungProHa)} €/ha Einkommensgrundstützung und Umverteilung an. Öko-Regelungen und Landesprogramme prüfen Sie bitte mit Ihrem Landwirtschaftsamt.`,
  },
  {
    q: "Welche Vermarktung ist realistisch?",
    a: `In Deutschland ist Agri-PV als besondere Solaranlage EEG-förderfähig. Weil das vorgesehene eigene Untersegment nach aktuellem Stand noch nicht beihilferechtlich freigegeben war, bietet Agri-PV im ersten Segment mit – wir rechnen mit ${fmt(ERLOESE.eegFreiflaecheCt, 1)} ct/kWh, für hoch aufgeständerte Anlagen inklusive Bonus mit ${fmt(ERLOESE.eegBesondereCt, 1)} ct/kWh, jeweils 20 Jahre. Alternativ ist ein Stromliefervertrag (PPA) möglich. Danach setzen wir vorsichtig ${fmt(ERLOESE.merchantCt, 1)} ct/kWh Marktwert an.`,
  },
];

export default function Page() {
  return (
    <RechnerSeite
      pfad={PFAD}
      toolId="agri-pv"
      breadcrumb="Agri-PV-Rechner"
      eyebrow="Agri-PV-Rechner für Landwirte"
      title={<>Verpachten, investieren <span className="ov-text-gradient-light">oder beteiligen?</span></>}
      lead="Drei Wege für Ihre Fläche nebeneinander – mit Investition, Rendite, Amortisation, GAP-Zahlung und dem Deckungsbeitrag, der auf der Fläche weiterläuft."
      chips={["Kostenlos & ohne Anmeldung", "Drei Szenarien", "Inklusive GAP"]}
      app={{
        name: "ÖkoInvest Agri-PV-Rechner",
        description: "Vergleicht für Agri-PV-Flächen Verpachtung, Eigeninvestition und Beteiligung über eine Genossenschaft – mit Investition, IRR, Amortisation, GAP-Direktzahlungen und landwirtschaftlichem Deckungsbeitrag.",
        featureList: ["Vertikale und hoch aufgeständerte Agri-PV", "Kulturen mit Ertragsfaktor", "EEG-Zuschlag oder PPA", "IRR und Amortisation", "Genossenschaftsanteil wählbar", "GAP und Deckungsbeitrag"],
      }}
      rechner={<AgriPvRechner />}
      erklaerung={
        <>
          <SectionHeading
            eyebrow="So rechnen wir"
            title="Die Landwirtschaft läuft in allen drei Wegen weiter."
            lead="Anders als beim klassischen Solarpark bleibt bei Agri-PV die Ernte. Deshalb enthält jede Summe den Deckungsbeitrag unter der Anlage und die verbleibende GAP-Zahlung – die Wege unterscheiden sich im Energie-Teil."
          />
          <div className="ov-prose mt-8 max-w-2xl">
            <p>
              <strong>Verpachten:</strong> Ein Investor baut und zahlt eine Agri-Pacht von {fmt(PACHT.agriProHa.mittel)} €/ha, indexiert mit {fmt(PACHT.indexierung * 100, 1)} % pro Jahr. <strong>Selbst investieren:</strong> Sie tragen die Investition und erhalten alle Stromerlöse abzüglich Betrieb, Wartung, Versicherung und Rückbaurücklage. <strong>Genossenschaft:</strong> Sie erhalten die Pacht und halten den gewählten Anteil an der Anlage.
            </p>
            <p>
              Die Leistung ergibt sich aus dem Flächenbedarf des Systems – vertikal rund {fmt(BAUART.agriVertikal.haProMwp, 1)} ha je MWp, hoch aufgeständert rund {fmt(BAUART.agriHoch.haProMwp, 1)} ha je MWp. Welche Systeme es gibt und was die DIN SPEC 91434 verlangt, lesen Sie unter <Link href="/agri-pv">Agri-PV</Link>; welcher Weg zu Ihrem Betrieb passt, zeigt die Entscheidungshilfe für <Link href="/landwirte">Landwirte</Link>.
            </p>
          </div>
        </>
      }
      annahmen={[
        ["Investition vertikal", `${fmt(AGRI.capexProKwp.vertikal.mittel)} €/kWp`],
        ["Investition hoch aufgeständert", `${fmt(AGRI.capexProKwp.hoch.mittel)} €/kWp`],
        ["Zzgl. Netz & Entwicklung", `${fmt(FREIFLAECHE.netzanschlussFixProMwp)} €/MWp + ${fmt(FREIFLAECHE.entwicklungProKwp.min)} €/kWp`],
        ["Betriebskosten", `${fmt(AGRI.opexProKwp)} €/kWp·a, +${fmt(FREIFLAECHE.inflation * 100)} % p. a.`],
        ["EEG vertikal / hoch / PPA", `${fmt(ERLOESE.eegFreiflaecheCt, 1)} / ${fmt(ERLOESE.eegBesondereCt, 1)} / ${fmt(ERLOESE.ppaCt.mittel, 1)} ct/kWh`],
        ["Nach 20 Jahren", `${fmt(ERLOESE.merchantCt, 1)} ct/kWh`],
        ["Agri-Pacht", `${fmt(PACHT.agriProHa.mittel)} €/ha·a`],
        ["GAP förderfähig / Satz", `${fmt(AGRI.gapFoerderfaehig * 100)} % · ${fmt(AGRI.direktzahlungProHa)} €/ha`],
        ["Degradation", `${fmt(FREIFLAECHE.degradation * 100, 1)} % p. a.`],
      ]}
      quellen={[
        { name: "Fraunhofer ISE – Agri-PV-Leitfaden", url: "https://www.ise.fraunhofer.de/de/veroeffentlichungen/studien/agri-photovoltaik-chance-fuer-landwirtschaft-und-energiewende.html" },
        { name: "Bundesnetzagentur – Ausschreibungen", url: "https://www.bundesnetzagentur.de/DE/Fachthemen/ElektrizitaetundGas/Ausschreibungen/Solaranlagen1/start.html" },
        { name: "KTBL", url: "https://www.ktbl.de/" },
      ]}
      faq={FAQ}
      querverweise={[
        { href: "/agri-pv", titel: "Agri-PV im Detail", text: "Kategorien der DIN SPEC 91434, Systeme, Kulturen, GAP und Baurecht." },
        { href: "/landwirte", titel: "Für Landwirte", text: "Die vier Wege und die Entscheidungshilfe „Welcher Weg passt?“." },
        { href: "/genossenschaft", titel: "Genossenschaft", text: "Mitglied werden und am Ertrag regionaler Anlagen teilhaben." },
      ]}
      cta={{
        eyebrow: "Für Landwirte kostenfrei",
        title: "Mit Ihren echten Zahlen rechnen?",
        text: "Wir prüfen Fläche, Netz und Kultur und rechnen die Wege mit Ihnen durch – inklusive Finanzierung und Förderung.",
        primary: { label: "Anfrage stellen", href: "/landwirte#anfrage" },
        secondary: { label: "Fläche prüfen", href: "/flaechencheck" },
      }}
    />
  );
}
