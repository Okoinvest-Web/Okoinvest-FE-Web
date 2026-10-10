// /projektboerse/muster-nda – Muster einer Vertraulichkeitsvereinbarung zwischen Projektanbieter
// (Fremdentwickler) und ÖkoInvest als Betreiberin der Projektbörse (Welle 3, Paket B10).
// Schreibt die Informationsbarriere aus /projektboerse/neutralitaet vertraglich fest.
//
// ENTWURF zur anwaltlichen Prüfung (Strang R) – kein Angebot, kein Vertrag. Länderteil (Rechtswahl,
// Gerichtsstand, Datenschutzrecht) strikt je Land: Länderfassung zeigt nur ihr Land, die gemeinsame Seite
// alle drei Varianten beschriftet. noindex (Register index: false), nicht in der Sitemap.

import LegalShell from "@/components/Reusable/LegalShell";
import Link from "@/components/Land/Link";
import { GESELLSCHAFT, abs } from "@/data/site";
import { EntwurfHinweis, Platzhalter } from "@/app/(stamm)/bedingungen/_teile";
import { seitenLand, seitenMetadata, spracheDerAnfrage } from "@/lib/land/seite";
import { RECHT_STAND } from "@/lib/boerse/neutralitaet";
import { datumText } from "@/lib/sprache/format";
import { schreibweiseBaum } from "@/components/Land/SchweizerSchreibweise";

const SCHLUESSEL = "/projektboerse/muster-nda";
const TITEL = "Muster-NDA für Projektanbieter (Entwurf) | ÖkoInvest";
const BESCHREIBUNG = "Entwurf einer Vertraulichkeitsvereinbarung zwischen Projektanbieter und ÖkoInvest als Betreiberin der Projektbörse – mit Informationsbarriere gegenüber der eigenen Projektentwicklung.";

const metadata = {
  title: TITEL,
  description: BESCHREIBUNG,
  robots: { index: false, follow: false }, // Entwurf, anwaltliche Prüfung offen (Register index: false)
  openGraph: { type: "website", url: abs(SCHLUESSEL), siteName: "ÖkoInvest", title: TITEL, description: BESCHREIBUNG, images: [{ url: abs("/img/planer-tablet.jpg"), alt: "Projektplanung am Tablet" }] },
};
const metadataEn = {
  title: "Model NDA for project sellers (draft) | ÖkoInvest",
  description: "Draft confidentiality agreement between a project seller and ÖkoInvest as operator of the project exchange – with an information barrier towards its own project development.",
  openGraph: { title: "Model NDA for project sellers (draft) | ÖkoInvest", description: "Draft confidentiality agreement between a project seller and ÖkoInvest as operator of the project exchange – with an information barrier towards its own project development.", images: [{ alt: "Project planning on a tablet" }] },
};

const G = GESELLSCHAFT;

/** Länderteil § 9 – je Land getrennt; Werte sind Platzhalter bis zur Prüfung. */
const LAENDERTEIL = {
  DE: {
    de: { land: "Deutschland", recht: "Es gilt deutsches Recht.", gericht: "Gerichtsstand für Kaufleute", datenschutz: "DSGVO und BDSG" },
    en: { land: "Germany", recht: "German law applies.", gericht: "Place of jurisdiction for merchants", datenschutz: "GDPR and the German Federal Data Protection Act (BDSG)" },
  },
  AT: {
    de: { land: "Österreich", recht: "Es gilt österreichisches Recht unter Ausschluss der Verweisungsnormen.", gericht: "Gerichtsstand", datenschutz: "DSGVO und Datenschutzgesetz (DSG)" },
    en: { land: "Austria", recht: "Austrian law applies, excluding its conflict-of-law rules.", gericht: "Place of jurisdiction", datenschutz: "GDPR and the Austrian Data Protection Act (DSG)" },
  },
  CH: {
    de: { land: "Schweiz", recht: "Es gilt schweizerisches Recht unter Ausschluss des Kollisionsrechts.", gericht: "Gerichtsstand", datenschutz: "Bundesgesetz über den Datenschutz (DSG) und, soweit anwendbar, DSGVO" },
    en: { land: "Switzerland", recht: "Swiss law applies, excluding its conflict-of-law rules.", gericht: "Place of jurisdiction", datenschutz: "Swiss Federal Act on Data Protection (FADP) and, where applicable, the GDPR" },
  },
};

function Laenderteil({ land, en }) {
  const codes = land ? [land] : ["DE", "AT", "CH"];
  return codes.map((c) => {
    const x = LAENDERTEIL[c][en ? "en" : "de"];
    return (
      <div key={c} data-land={c}>
        {codes.length > 1 && <p><strong>{en ? `Variant for ${x.land}` : `Variante ${x.land}`}</strong></p>}
        <p>
          (1) {x.recht} (2) {x.gericht}: <Platzhalter>{en ? "court at the seat of ÖkoInvest or of the seller – to be decided" : "Gericht am Sitz von ÖkoInvest oder des Anbieters – festlegen"}</Platzhalter>. (3){" "}
          {en ? `Personal data contained in the information is processed in accordance with the ${x.datenschutz}.` : `Personenbezogene Daten in den Informationen werden nach ${x.datenschutz} verarbeitet.`}
        </p>
      </div>
    );
  });
}

export default async function MusterNda({ params }) {
  const land = await seitenLand(params);
  const en = spracheDerAnfrage() === "en";
  const stand = datumText(RECHT_STAND, en ? "en" : "de");

  if (en) {
    return (
      <LegalShell titel="Model NDA for project sellers" pfad={SCHLUESSEL} stand={stand} lead="Draft confidentiality agreement between you as the project seller and ÖkoInvest as operator of the project exchange. It sets out the information barrier towards the ÖKOVOLT Group's own project development.">
        <EntwurfHinweis>This model is a draft and has not yet been legally approved. It is not an offer to conclude a contract. Before the first upload, we will send you the version that applies to your project.</EntwurfHinweis>
        <h2>Parties</h2>
        <p>
          (1) <Platzhalter>name and address of the seller</Platzhalter> (“Seller”) and (2) {G.name}, {G.sitz}, {G.plz} {G.ort}, Austria, {G.register} (“ÖkoInvest”), operator of the project exchange.
        </p>
        <h2>§ 1 Purpose</h2>
        <p>The Seller intends to present a project (<Platzhalter>project name, type, capacity</Platzhalter>) on the project exchange. ÖkoInvest receives confidential information solely for the purpose of reviewing, presenting and marketing this project on the exchange (“Purpose”).</p>
        <h2>§ 2 Confidential information</h2>
        <p>(1) Confidential information is all non-public information about the project that the Seller provides – in particular location, municipality, plots, landowners, grid operator, connection point, contracts, reports and prices.</p>
        <p>(2) This does not include information that is publicly known without a breach of this agreement, was already lawfully known to ÖkoInvest, was developed independently or was lawfully received from third parties without a duty of confidentiality. ÖkoInvest bears the burden of proof.</p>
        <h2>§ 3 Obligations of ÖkoInvest</h2>
        <ul>
          <li>to use confidential information only for the Purpose,</li>
          <li>to pass it on only to investors whose non-disclosure agreement has been approved, and only to the extent of the data room level released by the Seller,</li>
          <li>to pass it on to advisers only if they are bound to professional secrecy or confidentiality,</li>
          <li>to protect it with appropriate technical and organisational measures.</li>
        </ul>
        <h2>§ 4 Information barrier</h2>
        <p>(1) ÖkoInvest does not pass on confidential information to the project development or land acquisition of the companies of the ÖKOVOLT Group and does not use it for their purposes.</p>
        <p>(2) ÖkoInvest and the companies of the ÖKOVOLT Group do not approach landowners, municipalities or grid operators of the project about the project without the Seller&rsquo;s prior consent.</p>
        <p>(3) If a company of the ÖKOVOLT Group is interested in the project, it receives information only via the exchange like any other investor (NDA, data room, the same deadlines). The Seller is informed. There is no right of first refusal, step-in or first access.</p>
        <h2>§ 5 Access log</h2>
        <p>Access to the data room is logged. On request, ÖkoInvest informs the Seller who has received which data room level.</p>
        <h2>§ 6 Return and deletion</h2>
        <p>At the end of the marketing or on request, ÖkoInvest deletes or returns confidential information, unless statutory retention obligations prevent this. Automatic backups are deleted in the regular cycle.</p>
        <h2>§ 7 Term</h2>
        <p>The obligations apply from signature and end <Platzhalter>two or three years – to be decided</Platzhalter> after the end of the marketing.</p>
        <h2>§ 8 No further obligations</h2>
        <p>This agreement grants no rights to the project and does not oblige either party to conclude further contracts. The commission is governed exclusively by the commission agreement and the <Link href="/bedingungen/projektboerse">special terms for the project exchange</Link>. <Platzhalter>contractual penalty: yes/no, amount – to be reviewed</Platzhalter></p>
        <h2>§ 9 Applicable law and jurisdiction</h2>
        <Laenderteil land={land} en />
        <h2>§ 10 Final provisions</h2>
        <p>Amendments require text form. Should a provision be invalid, the remaining provisions remain unaffected.</p>
      </LegalShell>
    );
  }

  // Schweiz: fest geschriebener Vertragstext ohne „ß“
  return schreibweiseBaum(
    <LegalShell titel="Muster-NDA für Projektanbieter" pfad={SCHLUESSEL} stand={stand} lead="Entwurf einer Vertraulichkeitsvereinbarung zwischen Ihnen als Projektanbieter und ÖkoInvest als Betreiberin der Projektbörse. Sie schreibt die Informationsbarriere gegenüber der eigenen Projektentwicklung der ÖKOVOLT Gruppe fest.">
      <EntwurfHinweis>Dieses Muster ist ein Entwurf und noch nicht rechtlich freigegeben. Es ist kein Angebot auf Abschluss eines Vertrags. Vor dem ersten Upload senden wir Ihnen die für Ihr Projekt geltende Fassung.</EntwurfHinweis>
      <h2>Parteien</h2>
      <p>
        (1) <Platzhalter>Name und Anschrift des Anbieters</Platzhalter> („Anbieter“) und (2) {G.name}, {G.sitz}, {G.plz} {G.ort}, {G.land}, {G.register} („ÖkoInvest“), Betreiberin der Projektbörse.
      </p>
      <h2>§ 1 Zweck</h2>
      <p>Der Anbieter beabsichtigt, ein Projekt (<Platzhalter>Projektname, Typ, Leistung</Platzhalter>) in der Projektbörse vorzustellen. ÖkoInvest erhält vertrauliche Informationen ausschließlich, um dieses Projekt zu prüfen, darzustellen und über die Börse zu vermarkten („Zweck“).</p>
      <h2>§ 2 Vertrauliche Informationen</h2>
      <p>(1) Vertraulich sind alle nicht öffentlichen Informationen zum Projekt, die der Anbieter überlässt – insbesondere Lage, Gemeinde, Flurstücke bzw. Grundstücke, Eigentümer, Netzbetreiber, Verknüpfungspunkt, Verträge, Gutachten und Preise.</p>
      <p>(2) Ausgenommen sind Informationen, die ohne Verstoß gegen diese Vereinbarung öffentlich bekannt sind, ÖkoInvest bereits rechtmäßig bekannt waren, unabhängig erarbeitet oder von Dritten ohne Vertraulichkeitspflicht rechtmäßig erhalten wurden. Die Beweislast trägt ÖkoInvest.</p>
      <h2>§ 3 Pflichten von ÖkoInvest</h2>
      <ul>
        <li>vertrauliche Informationen nur für den Zweck zu verwenden,</li>
        <li>sie nur an Investoren weiterzugeben, deren Vertraulichkeitsvereinbarung freigegeben ist, und nur im Umfang der vom Anbieter freigegebenen Datenraum-Stufe,</li>
        <li>sie an Berater nur weiterzugeben, wenn diese berufsrechtlich oder vertraglich zur Verschwiegenheit verpflichtet sind,</li>
        <li>sie durch angemessene technische und organisatorische Maßnahmen zu schützen.</li>
      </ul>
      <h2>§ 4 Informationsbarriere</h2>
      <p>(1) ÖkoInvest gibt vertrauliche Informationen nicht an die Projektentwicklung oder Flächenakquise der Gesellschaften der ÖKOVOLT Gruppe weiter und verwendet sie nicht für deren Zwecke.</p>
      <p>(2) ÖkoInvest und die Gesellschaften der ÖKOVOLT Gruppe sprechen Flächeneigentümer, Gemeinden und Netzbetreiber des Projekts nicht ohne vorherige Zustimmung des Anbieters auf das Projekt an.</p>
      <p>(3) Interessiert sich eine Gesellschaft der ÖKOVOLT Gruppe für das Projekt, erhält sie Informationen nur wie jeder andere Investor über die Börse (Vertraulichkeitsvereinbarung, Datenraum, dieselben Fristen). Der Anbieter wird darüber informiert. Ein Vorkaufs-, Eintritts- oder Erstzugriffsrecht besteht nicht.</p>
      <h2>§ 5 Protokoll</h2>
      <p>Zugriffe auf den Datenraum werden protokolliert. Auf Anfrage teilt ÖkoInvest dem Anbieter mit, wer welche Datenraum-Stufe erhalten hat.</p>
      <h2>§ 6 Rückgabe und Löschung</h2>
      <p>Nach Ende der Vermarktung oder auf Verlangen löscht ÖkoInvest vertrauliche Informationen oder gibt sie zurück, soweit keine gesetzlichen Aufbewahrungspflichten entgegenstehen. Automatische Sicherungskopien werden im regulären Zyklus gelöscht.</p>
      <h2>§ 7 Laufzeit</h2>
      <p>Die Pflichten gelten ab Unterzeichnung und enden <Platzhalter>zwei oder drei Jahre – festlegen</Platzhalter> nach Ende der Vermarktung.</p>
      <h2>§ 8 Keine weiteren Pflichten</h2>
      <p>Diese Vereinbarung räumt keine Rechte am Projekt ein und verpflichtet keine Partei zum Abschluss weiterer Verträge. Die Provision regeln allein die Provisionsvereinbarung und die <Link href="/bedingungen/projektboerse">Besonderen Bedingungen Projektbörse</Link>. <Platzhalter>Vertragsstrafe ja/nein, Höhe – prüfen</Platzhalter></p>
      <h2>§ 9 Recht und Gerichtsstand</h2>
      <Laenderteil land={land} />
      <h2>§ 10 Schlussbestimmungen</h2>
      <p>Änderungen bedürfen der Textform. Sollte eine Bestimmung unwirksam sein, bleiben die übrigen Bestimmungen wirksam.</p>
    </LegalShell>,
    land
  );
}

export const generateMetadata = seitenMetadata(SCHLUESSEL, metadata, { en: metadataEn });
