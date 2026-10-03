// src/app/rechner/grossspeicher/page.js – Rendite eines Batteriegroßspeichers

import Link from "next/link";
import RechnerSeite, { rechnerMetadata } from "@/components/Rechner/RechnerSeite";
import GrossspeicherRechner from "@/components/Rechner/GrossspeicherRechner";
import { FREIFLAECHE, SPEICHER } from "@/lib/invest/markt";
import { fmt } from "@/lib/rechner/annahmen";

const PFAD = "/rechner/grossspeicher";
const S = SPEICHER;

export const metadata = rechnerMetadata({
  pfad: PFAD,
  title: "Großspeicher-Rechner: BESS-Rendite und IRR | ÖkoInvest",
  description:
    "Rendite eines Batteriegroßspeichers berechnen: Arbitrage, aFRR und FCR, Co-Location oder Stand-alone, Baukostenzuschuss, Netzentgelte – IRR und Cashflow.",
  keywords: ["Großspeicher Rendite", "BESS Rechner", "Batteriespeicher Wirtschaftlichkeit", "Co-Location Speicher", "Baukostenzuschuss Speicher", "aFRR Erlöse Batteriespeicher"],
});

const FAQ = [
  {
    q: "Womit verdient ein Batteriegroßspeicher Geld?",
    a: `Mit drei Erlösquellen: Arbitrage (günstig laden, teuer entladen am Day-Ahead- und Intraday-Markt), Sekundärregelleistung (aFRR) und Primärregelleistung (FCR). 2025 hat sich der Schwerpunkt verschoben: Laut ISEA-Index stiegen die aFRR-Leistungserlöse deutlich, während FCR durch den Speicherzubau an Bedeutung verlor. Wir rechnen im Mittel mit ${fmt(S.erloesMix.afrr * 100)} % aFRR, ${fmt(S.erloesMix.arbitrage * 100)} % Arbitrage und ${fmt(S.erloesMix.fcr * 100)} % FCR.`,
  },
  {
    q: "Warum liegen Ihre Erlöse unter dem Index?",
    a: `Der ISEA Battery Revenue Index weist für ein 2-h-System 2025 rund ${fmt(S.indexErloes2025.gesamt2h / 1000)} T€ je MW aus – gerechnet mit perfekter Voraussicht und ohne Netzrestriktionen. In der Praxis erreichen Vermarkter davon erfahrungsgemäß nur einen Teil. Unsere Spanne von ${fmt(S.erloesProMwJahr.min / 1000)}–${fmt(S.erloesProMwJahr.max / 1000)} T€/MW ist deshalb bewusst vorsichtig.`,
  },
  {
    q: "Co-Location oder Stand-alone – was ist besser?",
    a: "Co-Location nutzt den Netzanschluss eines Solarparks mit: Das spart Anschlusskosten und in der Regel den Baukostenzuschuss, begrenzt aber die Fahrweise, weil Park und Speicher sich die Anschlussleistung teilen. Stand-alone-Speicher am Umspannwerk sind frei in der Vermarktung, brauchen aber einen eigenen, oft knappen Netzanschluss und zahlen einen Baukostenzuschuss. Der Rechner zeigt beide Varianten nebeneinander.",
  },
  {
    q: "Was bedeutet der Baukostenzuschuss für Speicher?",
    a: `Nach dem Beschluss des Bundesgerichtshofs vom 15. Juli 2025 (EnVR 1/24) dürfen Netzbetreiber auch von Batteriespeichern einen Baukostenzuschuss nach dem Leistungspreismodell verlangen. Als Beispiel rechnen wir mit den Sätzen der Bayernwerk Netz 2025 – rund ${fmt(S.bkzProKw.ms)} €/kW in der Mittelspannung und ${fmt(S.bkzProKw.hs)} €/kW in der Hochspannung. Einzelne Netzbetreiber gewähren Abschläge für netzdienlichen Betrieb.`,
  },
  {
    q: "Zahlt ein Speicher Netzentgelte?",
    a: `Nach § 118 Abs. 6 EnWG sind Speicher, die bis zum ${S.netzentgeltBefreiungBis} in Betrieb gehen, für 20 Jahre von den Netzentgelten für den Ladestrom befreit, soweit der Strom wieder eingespeist wird. Wie es danach weitergeht, ist Teil der laufenden Netzentgeltreform. Im Rechner können Sie die Befreiung abschalten.`,
  },
  {
    q: "Wie wirken Degradation und Zyklen?",
    a: `Lithium-Eisenphosphat-Speicher verlieren je nach Fahrweise rund ${fmt(S.degradation * 100)} % Kapazität pro Jahr. Wir lassen die Arbitrage-Erlöse mit der Kapazität sinken, die Regelleistung – die an der Leistung hängt – nur halb so stark. Eine Erweiterung (Augmentation) nach einigen Jahren ist nicht eingerechnet; sie kann die Erlöse stabilisieren, kostet aber zusätzlich.`,
  },
];

export default function Page() {
  return (
    <RechnerSeite
      pfad={PFAD}
      toolId="grossspeicher"
      breadcrumb="Großspeicher-Rechner"
      eyebrow="Für Investoren · Batteriegroßspeicher"
      title={
        <>
          Großspeicher-Rendite <span className="ov-text-gradient-light">mit ehrlichem Erlösmix.</span>
        </>
      }
      lead="Leistung, Dauer, Systempreis und Standort wählen, Erlöse aus Arbitrage, aFRR und FCR anpassen: Sie erhalten Projekt-IRR, Kapitalwert, Amortisation und den Cashflow – Co-Location und Stand-alone im direkten Vergleich."
      chips={["Arbitrage, aFRR, FCR", "Co-Location vs. Stand-alone", "Baukostenzuschuss", "Degradation & Zyklen"]}
      app={{
        name: "Großspeicher-Renditerechner",
        description: "Wirtschaftlichkeit eines Batteriegroßspeichers: Investition mit Netzanschluss und Baukostenzuschuss, Erlösmix aus Arbitrage und Regelenergie, Degradation, Netzentgelte, Projekt-IRR, Kapitalwert und Cashflow.",
        featureList: ["Leistung und Speicherdauer 1–4 h", "Erlösmix Arbitrage, aFRR, FCR", "Co-Location und Stand-alone", "Baukostenzuschuss nach Netzebene", "Netzentgeltbefreiung § 118 Abs. 6 EnWG", "IRR, NPV, Amortisation, Cashflow-Diagramm"],
      }}
      rechner={<GrossspeicherRechner />}
      erklaerung={
        <div className="ov-prose max-w-none">
          <h2>So rechnet der Großspeicher-Rechner</h2>
          <p>
            Die <strong>Investition</strong> setzt sich aus dem schlüsselfertigen Speichersystem (€/kWh), dem Netzanschluss (€/kW) und – nur bei Stand-alone – dem Baukostenzuschuss
            zusammen. Die <strong>Erlöse</strong> geben Sie je MW für ein 2-h-System ein; für kürzere oder längere Speicher skalieren wir mit einem Faktor, der sich am ISEA-Index orientiert
            (1 h erzielt dort rund 58 % der Erlöse eines 2-h-Systems). Co-Location erhält einen Abschlag von {fmt((1 - S.coLocationErloesFaktor) * 100)} %.
          </p>
          <p>
            Als <strong>Kosten</strong> rechnen wir Betrieb, Wartung und Versicherung mit {fmt(S.opexAnteilCapex * 100, 1)} % der Systemkosten pro Jahr (mit {fmt(FREIFLAECHE.inflation * 100)} %
            Inflation) und ein Vermarktungsentgelt von {fmt(S.vermarktungAnteil * 100)} % der Erlöse. Der allgemeine Erlöstrend von {fmt(S.erloesTrend * 100)} % pro Jahr bildet ab, dass mehr
            Speicher im Markt Preisspreads und Regelenergiepreise drücken.
          </p>
          <h3>Was der Rechner bewusst nicht abbildet</h3>
          <ul>
            <li>Finanzierung und Steuern – die Rendite ist eine Projektrendite vor Steuern.</li>
            <li>Tolling- oder Floor-Verträge, die Banken für eine Finanzierung meist verlangen.</li>
            <li>Erweiterung (Augmentation), Restwert und Rückbau am Laufzeitende.</li>
            <li>Zusatznutzen am Solarpark, etwa vermiedene Abregelung oder höhere Solar-Marktwerte.</li>
          </ul>
          <p>
            Mehr zu Technik, Netzanschluss und Sicherheit unter <Link href="/grossspeicher">Großspeicher</Link>; die Märkte im Detail im Ratgeber{" "}
            <Link href="/ratgeber/grossspeicher-erloese">Speichererlöse</Link>.
          </p>
        </div>
      }
      annahmen={[
        ["Systempreis 2-h (2026)", `${fmt(S.capexProKwh.min)}–${fmt(S.capexProKwh.max)} €/kWh`],
        ["Erlöse real (2-h)", `${fmt(S.erloesProMwJahr.min / 1000)}–${fmt(S.erloesProMwJahr.max / 1000)} T€/MW·a`],
        ["ISEA-Index 2025 (theoretisch)", `${fmt(S.indexErloes2025.gesamt2h / 1000)} T€/MW·a`],
        ["Mix aFRR / Arbitrage / FCR", `${fmt(S.erloesMix.afrr * 100)} / ${fmt(S.erloesMix.arbitrage * 100)} / ${fmt(S.erloesMix.fcr * 100)} %`],
        ["Degradation / Erlöstrend", `${fmt(S.degradation * 100)} % / ${fmt(S.erloesTrend * 100)} % p. a.`],
        ["Betrieb / Vermarktung", `${fmt(S.opexAnteilCapex * 100, 1)} % Capex / ${fmt(S.vermarktungAnteil * 100)} % Erlöse`],
        ["BKZ-Beispiel MS / HS", `${fmt(S.bkzProKw.ms)} / ${fmt(S.bkzProKw.hs)} €/kW`],
        ["Netzanschluss Co-Loc. / MS / HS", `${fmt(S.netzanschlussProKw.coLocation)} / ${fmt(S.netzanschlussProKw.ms)} / ${fmt(S.netzanschlussProKw.hs)} €/kW`],
        ["Wirkungsgrad", `${fmt(S.wirkungsgrad * 100)} %`],
        ["Diskontsatz", `${fmt(S.diskont * 100)} %`],
      ]}
      quellen={[
        { name: "pv magazine – ISEA Battery Revenue Index 2025", url: "https://www.pv-magazine.de/2026/01/23/erloespotenziale-fuer-stationaere-batteriespeicher-in-deutschland-sind-2025-zurueckgegangen/" },
        { name: "BGH, Beschluss vom 15.07.2025 (EnVR 1/24)", url: "https://www.bundesgerichtshof.de/SharedDocs/Pressemitteilungen/DE/2025/2025129.html" },
        { name: "Bayernwerk Netz – Baukostenzuschuss 2025", url: "https://www.bayernwerk-netz.de/content/dam/revu-global/bayernwerk-netz/files/energie-anschliessen/anschluss-mittel-und-hochspannung/baukostenzuschuss_2025.pdf" },
        { name: "§ 118 EnWG", url: "https://www.gesetze-im-internet.de/enwg_2005/__118.html" },
      ]}
      faq={FAQ}
      faqTitel="Großspeicher – gut zu wissen"
      querverweise={[
        { href: "/grossspeicher", titel: "Großspeicher", text: "Co-Location, Stand-alone, Netzanschluss, LFP-Technik und Sicherheit." },
        { href: "/rechner/netzanschluss", titel: "Netzanschluss-Check", text: "Kosten, Zeitrahmen und Risiken des Anschlusses – mit Überbauung und Speicher." },
        { href: "/rechner/solarpark", titel: "Solarpark-Renditerechner", text: "IRR, LCOE und DSCR des Solarparks, an dem der Speicher stehen kann." },
      ]}
      cta={{
        eyebrow: "Speicher am Solarpark",
        title: "Fläche, Netzanschluss oder Projekt für einen Speicher?",
        text: "Wir prüfen Co-Location an bestehenden und geplanten Parks und entwickeln Stand-alone-Standorte an Netzknoten – gemeinsam mit Ihnen.",
        primary: { label: "Speicher-Standort anfragen", href: "/kontakt?anliegen=speicher#formular" },
        secondary: { label: "Großspeicher ansehen", href: "/grossspeicher" },
      }}
    />
  );
}
