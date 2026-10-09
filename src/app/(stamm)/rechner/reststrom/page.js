// src/app/rechner/reststrom/page.js – Reststrom-Rechner
//
// Sprachmodell: deutsche Texte in DE, englische in EN (gleiche Struktur; Regeln:
// src/lib/sprache/woerterbuch.js). Zahlen im Format der Sprache (src/lib/sprache/zahlformat.js).

import RechnerSeite, { rechnerMetadata, rechnerMetadataEn } from "@/components/Rechner/RechnerSeite";
import ReststromRechner from "@/components/Reststrom/ReststromRechner";
import { STROM, STAND } from "@/lib/invest/markt";
import { fmt } from "@/lib/rechner/annahmen";
import { FAQ_RESTSTROM } from "@/data/faq";
import { FAQ_RESTSTROM_EN } from "@/data/faq-en";
import { pfad as seitenPfad } from "@/lib/land";
import { seitenLand, seitenMetadata, spracheDerAnfrage } from "@/lib/land/seite";
import { faqFuerLand, NurDEBlock } from "@/components/Land/Laenderteile";
import { uebersetze } from "@/lib/sprache/woerterbuch";
import { formate } from "@/lib/sprache/zahlformat";
import { datumText } from "@/lib/sprache/format";
import { STROM_EN, stromTeilEn } from "@/lib/sprache/rechnerBegriffe";

const PFAD = seitenPfad("/rechner/reststrom");
const e = formate("en");

const metadata = rechnerMetadata({
  pfad: PFAD,
  title: "Reststrom-Rechner: Strompool-Ersparnis | ÖkoInvest",
  description:
    "Jahresverbrauch, Arbeitspreis und Lastprofil eingeben: Der Rechner zeigt, was Bündelung, Solar-PPA und Flexibilität im Reststrom-Pool pro Jahr sparen können.",
  keywords: ["Reststrom", "Strompool Mittelstand", "Gewerbestrom Ersparnis", "Strombeschaffung Rechner", "Solar-PPA", "Stromsteuer 2026"],
});

const metadataEn = rechnerMetadataEn({
  title: "Residual power calculator: power pool savings | ÖkoInvest",
  description:
    "Enter annual consumption, energy price and load profile: the calculator shows what pooling, solar PPAs and flexibility in the residual power pool can save per year.",
  keywords: ["residual power", "power pool SMEs", "commercial electricity savings", "power procurement calculator", "solar PPA", "electricity tax 2026"],
});

const ct2 = (n) => fmt(n, 2);
const fix = STROM.bestandteile.filter((b) => !b.beeinflussbar);

const DE = {
  breadcrumb: "Reststrom-Rechner",
  eyebrow: "Reststrom-Rechner · Unternehmen",
  title: (
    <>
      Was spart Ihr Betrieb im <span className="ov-text-gradient-light">Strompool?</span>
    </>
  ),
  lead: "Verbrauch, Preis und Lastprofil eingeben – Sie sehen die Ersparnisspanne je Hebel und wie sich Ihr Strompreis vorher und nachher zusammensetzt. Ehrlich gerechnet: Netzentgelte, Umlagen und Steuern bleiben, wie sie sind.",
  chips: ["Spanne je Hebel", "Preiszerlegung vorher/nachher", "Mit eigener PV", "Stromsteuer 2026"],
  app: {
    name: "Reststrom-Rechner – Ersparnis im Strompool",
    description: "Schätzt die jährliche Ersparnis durch Bündelung, Solar-PPA und Flexibilität für den Reststrom mittelständischer Unternehmen.",
    featureList: ["Ersparnis je Hebel", "Preiszerlegung vorher/nachher", "Berücksichtigung eigener PV", "Stromsteuer-Entlastung produzierendes Gewerbe"],
  },
  annahmen: [
    ...STROM.bestandteile.map((b) => [b.label, `${ct2(b.ct)} ct/kWh`]),
    ["Stromsteuer produzierendes Gewerbe (ab 2026)", `${ct2(STROM.stromsteuerProduzierend)} ct/kWh`],
    ...STROM.poolHebel.map((h) => [h.label, `${ct2(h.ct.min)}–${ct2(h.ct.max)} ct`]),
    ["PPA-Deckung der Tagesstunden", `${fmt(STROM.ppaDeckungsanteil.min * 100)}–${fmt(STROM.ppaDeckungsanteil.max * 100)} %`],
    ["Stand", STAND],
  ],
  quellen: [
    { name: "BDEW-Strompreisanalyse", url: "https://www.bdew.de/service/daten-und-grafiken/bdew-strompreisanalyse/" },
    { name: "Stromsteuergesetz", url: "https://www.gesetze-im-internet.de/stromstg/" },
    { name: "eigene Einschätzung ÖkoInvest" },
  ],
  faqTitel: "Fragen zum Reststrom-Pool",
  querverweise: [
    { href: seitenPfad("/reststrom"), titel: "Reststrom-Pool Mittelstand", text: "Ablauf, Voraussetzungen und Zusammenspiel mit PV und Speicher." },
    { href: seitenPfad("/virtuelles-kraftwerk"), titel: "Virtuelles Kraftwerk", text: "Wie Parks, Speicher und Unternehmen im Verbund zusammenwirken." },
    { href: seitenPfad("/energie-live"), titel: "Strommarkt live", text: "Börsenpreis, negative Preise und Solar-Capture-Rate in Echtzeit." },
  ],
  cta: {
    eyebrow: "Reststrom-Pool",
    title: "Aus der Spanne wird ein Angebot.",
    text: "Schicken Sie uns Lastgang oder Jahresverbrauch und Ihren aktuellen Vertrag. Wir prüfen Profil, Kündigungsfristen und Preisbestandteile – kostenlos und unverbindlich.",
    primary: { label: "Pool-Angebot anfragen", href: seitenPfad("/reststrom#anfrage") },
    secondary: { label: "Wie der Pool funktioniert", href: seitenPfad("/reststrom") },
  },
};

const EN = {
  breadcrumb: "Residual power calculator",
  eyebrow: "Residual power calculator · businesses",
  title: (
    <>
      What can your business save in the <span className="ov-text-gradient-light">power pool?</span>
    </>
  ),
  lead: "Enter consumption, price and load profile – you see the savings range per lever and how your electricity price is made up before and after. Calculated honestly: grid fees, levies and taxes stay as they are.",
  chips: ["Range per lever", "Price breakdown before/after", "With your own PV", "Electricity tax 2026"],
  app: {
    name: "Residual power calculator – savings in the power pool",
    description: "Estimates the annual savings from pooling, solar PPAs and flexibility on the residual power of small and medium-sized businesses.",
    featureList: ["Savings per lever", "Price breakdown before/after", "Takes your own PV into account", "Electricity tax relief for manufacturing businesses"],
  },
  annahmen: [
    ...STROM.bestandteile.map((b) => [stromTeilEn(b).label, `${e.fmt(b.ct, 2)} ct/kWh`]),
    ["Electricity tax, manufacturing (from 2026)", `${e.fmt(STROM.stromsteuerProduzierend, 2)} ct/kWh`],
    ...STROM.poolHebel.map((h) => [STROM_EN.hebel[h.id] ?? h.label, `${e.fmt(h.ct.min, 2)}–${e.fmt(h.ct.max, 2)} ct`]),
    ["PPA coverage of daytime hours", `${e.fmt(STROM.ppaDeckungsanteil.min * 100)}–${e.pct(STROM.ppaDeckungsanteil.max * 100)}`],
    ["As of", datumText(STAND, "en")],
  ],
  quellen: [{ name: "BDEW electricity price analysis" }, { name: "German Electricity Tax Act (StromStG)" }, { name: "ÖkoInvest’s own estimate" }],
  faqTitel: "Questions about the residual power pool",
  querverweise: [
    { titel: "Residual power pool for SMEs", text: "Process, requirements and interaction with PV and storage." },
    { titel: "Virtual power plant", text: "How parks, storage and businesses work together in the network." },
    { titel: "Power market live", text: "Exchange price, negative prices and solar capture rate in real time." },
  ],
  cta: {
    eyebrow: "Residual power pool",
    title: "From a range to an offer.",
    text: "Send us your load profile or annual consumption and your current contract. We check the profile, notice periods and price components – free of charge and without obligation.",
    primary: { label: "Request a pool offer" },
    secondary: { label: "How the pool works" },
  },
};

export default async function ReststromRechnerPage({ params }) {
  const land = await seitenLand(params);
  const sprache = spracheDerAnfrage();
  const en = sprache === "en";
  const t = uebersetze({ de: DE, en: EN }, sprache);
  return (
    <RechnerSeite
      pfad={PFAD}
      toolId="reststrom"
      breadcrumb={t.breadcrumb}
      eyebrow={t.eyebrow}
      title={t.title}
      lead={t.lead}
      chips={t.chips}
      app={t.app}
      rechner={<ReststromRechner />}
      erklaerung={
        <NurDEBlock land={land} thema="Rechenwerte und Annahmen" themaEn="Figures and assumptions">
          {en ? (
            <div className="ov-prose">
              <h2>How the residual power calculator works</h2>
              <p>
                Your energy price consists of two worlds. Grid fees and metering, levies, the concession fee and electricity tax are fixed – together around {e.fmt(fix.reduce((s, b) => s + b.ct, 0), 1)} ct/kWh in our estimate for 2026. Anything above that is procurement and sales. That is the only place where the pool takes effect.
              </p>
              <p>Three levers act on this procurement component:</p>
              <ul>
                {STROM.poolHebel.map((h) => (
                  <li key={h.id}>
                    <strong>{STROM_EN.hebel[h.id] ?? h.label}</strong>: {e.fmt(h.ct.min, 2)}–{e.fmt(h.ct.max, 2)} ct/kWh
                  </li>
                ))}
              </ul>
              <p>
                How much of this reaches you depends on the load profile: a single-shift business needs power exactly when the parks deliver – the PPA lever is large. A three-shift business uses a lot at night, but benefits more from structured procurement. Your own PV plant lowers your residual power and already covers daytime hours itself – the PPA lever becomes smaller, but the profile becomes more predictable for the pool.
              </p>
              <p>To keep the result from becoming too optimistic, the calculator caps the sum of the levers at just over a third of your current procurement component.</p>
            </div>
          ) : (
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
          )}
        </NurDEBlock>
      }
      annahmen={t.annahmen}
      quellen={t.quellen}
      faq={faqFuerLand(uebersetze({ de: FAQ_RESTSTROM.slice(0, 7), en: FAQ_RESTSTROM_EN.slice(0, 7) }, sprache), land, { sprache })}
      faqTitel={t.faqTitel}
      querverweise={t.querverweise}
      cta={t.cta}
    />
  );
}

export const generateMetadata = seitenMetadata("/rechner/reststrom", metadata, { en: metadataEn });
