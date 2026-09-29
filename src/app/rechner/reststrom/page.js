import RechnerSeite, { rechnerMetadata } from "@/components/Rechner/RechnerSeite";
import ReststromRechner from "@/components/Reststrom/ReststromRechner";
import { STROM, STAND } from "@/lib/invest/markt";
import { fmt } from "@/lib/rechner/annahmen";
import { FAQ_RESTSTROM } from "@/data/faq";

const PFAD = "/rechner/reststrom";

export const metadata = rechnerMetadata({
  pfad: PFAD,
  title: "Reststrom-Rechner: Strompool-Ersparnis | ÖkoInvest",
  description:
    "Jahresverbrauch, Arbeitspreis und Lastprofil eingeben: Der Rechner zeigt, was Bündelung, Solar-PPA und Flexibilität im Reststrom-Pool pro Jahr sparen können.",
  keywords: ["Reststrom", "Strompool Mittelstand", "Gewerbestrom Ersparnis", "Strombeschaffung Rechner", "Solar-PPA", "Stromsteuer 2026"],
});

const ct2 = (n) => fmt(n, 2);
const fix = STROM.bestandteile.filter((b) => !b.beeinflussbar);

export default function ReststromRechnerPage() {
  return (
    <RechnerSeite
      pfad={PFAD}
      toolId="reststrom"
      breadcrumb="Reststrom-Rechner"
      eyebrow="Reststrom-Rechner · Unternehmen"
      title={
        <>
          Was spart Ihr Betrieb im <span className="ov-text-gradient-light">Strompool?</span>
        </>
      }
      lead="Verbrauch, Preis und Lastprofil eingeben – Sie sehen die Ersparnisspanne je Hebel und wie sich Ihr Strompreis vorher und nachher zusammensetzt. Ehrlich gerechnet: Netzentgelte, Umlagen und Steuern bleiben, wie sie sind."
      chips={["Spanne je Hebel", "Preiszerlegung vorher/nachher", "Mit eigener PV", "Stromsteuer 2026"]}
      app={{
        name: "Reststrom-Rechner – Ersparnis im Strompool",
        description: "Schätzt die jährliche Ersparnis durch Bündelung, Solar-PPA und Flexibilität für den Reststrom mittelständischer Unternehmen.",
        featureList: ["Ersparnis je Hebel", "Preiszerlegung vorher/nachher", "Berücksichtigung eigener PV", "Stromsteuer-Entlastung produzierendes Gewerbe"],
      }}
      rechner={<ReststromRechner />}
      erklaerung={
        <div className="ov-prose">
          <h2>So rechnet der Reststrom-Rechner</h2>
          <p>
            Ihr Arbeitspreis besteht aus zwei Welten. Fest vorgegeben sind Netzentgelte und Messung, Umlagen, Konzessionsabgabe und Stromsteuer – zusammen
            nach unserer Einschätzung für 2026 rund {fmt(fix.reduce((s, b) => s + b.ct, 0), 1)} ct/kWh. Was darüber liegt, ist Beschaffung und Vertrieb.
            Nur dort setzt der Pool an.
          </p>
          <p>Drei Hebel wirken auf diese Beschaffungskomponente:</p>
          <ul>
            {STROM.poolHebel.map((h) => (
              <li key={h.id}>
                <strong>{h.label}</strong>: {ct2(h.ct.min)}–{ct2(h.ct.max)} ct/kWh
              </li>
            ))}
          </ul>
          <p>
            Wie viel davon bei Ihnen ankommt, hängt vom Lastprofil ab: Ein Einschichtbetrieb braucht Strom genau dann, wenn die Parks liefern – der PPA-Hebel ist
            groß. Ein Dreischichtbetrieb verbraucht viel nachts, profitiert dafür stärker von der strukturierten Beschaffung. Eine eigene PV-Anlage senkt Ihren
            Reststrom und deckt Tagesstunden bereits selbst – der PPA-Hebel wird kleiner, das Profil für den Pool aber planbarer.
          </p>
          <p>
            Damit das Ergebnis nicht zu optimistisch wird, deckelt der Rechner die Summe der Hebel bei gut einem Drittel Ihrer heutigen Beschaffungskomponente.
          </p>
        </div>
      }
      annahmen={[
        ...STROM.bestandteile.map((b) => [b.label, `${ct2(b.ct)} ct/kWh`]),
        ["Stromsteuer produzierendes Gewerbe (ab 2026)", `${ct2(STROM.stromsteuerProduzierend)} ct/kWh`],
        ...STROM.poolHebel.map((h) => [h.label, `${ct2(h.ct.min)}–${ct2(h.ct.max)} ct`]),
        ["PPA-Deckung der Tagesstunden", `${fmt(STROM.ppaDeckungsanteil.min * 100)}–${fmt(STROM.ppaDeckungsanteil.max * 100)} %`],
        ["Stand", STAND],
      ]}
      quellen={[
        { name: "BDEW-Strompreisanalyse", url: "https://www.bdew.de/service/daten-und-grafiken/bdew-strompreisanalyse/" },
        { name: "Stromsteuergesetz", url: "https://www.gesetze-im-internet.de/stromstg/" },
        { name: "eigene Einschätzung ÖkoInvest" },
      ]}
      faq={FAQ_RESTSTROM.slice(0, 7)}
      faqTitel="Fragen zum Reststrom-Pool"
      querverweise={[
        { href: "/reststrom", titel: "Reststrom-Pool Mittelstand", text: "Ablauf, Voraussetzungen und Zusammenspiel mit PV und Speicher." },
        { href: "/virtuelles-kraftwerk", titel: "Virtuelles Kraftwerk", text: "Wie Parks, Speicher und Unternehmen im Verbund zusammenwirken." },
        { href: "/energie-live", titel: "Strommarkt live", text: "Börsenpreis, negative Preise und Solar-Capture-Rate in Echtzeit." },
      ]}
      cta={{
        eyebrow: "Reststrom-Pool",
        title: "Aus der Spanne wird ein Angebot.",
        text: "Schicken Sie uns Lastgang oder Jahresverbrauch und Ihren aktuellen Vertrag. Wir prüfen Profil, Kündigungsfristen und Preisbestandteile – kostenlos und unverbindlich.",
        primary: { label: "Pool-Angebot anfragen", href: "/reststrom#anfrage" },
        secondary: { label: "Wie der Pool funktioniert", href: "/reststrom" },
      }}
    />
  );
}
