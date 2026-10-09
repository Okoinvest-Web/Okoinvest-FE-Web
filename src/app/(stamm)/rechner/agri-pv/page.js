// src/app/rechner/agri-pv/page.js – Agri-PV-Rechner: drei Wege im Vergleich
//
// Sprachmodell: deutsche Texte in DE, englische in EN (gleiche Struktur; Regeln:
// src/lib/sprache/woerterbuch.js). Zahlen im Format der Sprache (src/lib/sprache/zahlformat.js).

import Link from "@/components/Land/Link";
import RechnerSeite, { rechnerMetadata, rechnerMetadataEn } from "@/components/Rechner/RechnerSeite";
import AgriPvRechner from "@/components/Agri/AgriPvRechner";
import SectionHeading from "@/components/ui/SectionHeading";
import { AGRI, BAUART, ERLOESE, FREIFLAECHE, PACHT } from "@/lib/invest/markt";
import { fmt } from "@/lib/rechner/annahmen";
import { pfad as seitenPfad } from "@/lib/land";
import { seitenLand, seitenMetadata, spracheDerAnfrage } from "@/lib/land/seite";
import { faqFuerLand, NurDEBlock } from "@/components/Land/Laenderteile";
import { uebersetze } from "@/lib/sprache/woerterbuch";
import { formate } from "@/lib/sprache/zahlformat";

const PFAD = seitenPfad("/rechner/agri-pv");
const e = formate("en");

const metadata = rechnerMetadata({
  pfad: PFAD,
  title: "Agri-PV-Rechner: Pacht oder Investition? | ÖkoInvest",
  description:
    "Agri-PV-Rechner für Landwirte: Verpachten, selbst investieren oder über die Genossenschaft beteiligen – mit IRR, Amortisation, GAP-Zahlung und Deckungsbeitrag.",
  keywords: ["Agri-PV Rechner", "Agri-PV Pacht berechnen", "Agri-PV Investition", "Agri-PV Genossenschaft", "Agri-PV GAP"],
});

const metadataEn = rechnerMetadataEn({
  title: "Agrivoltaics calculator: lease or invest? | ÖkoInvest",
  description:
    "Agrivoltaics calculator for farmers: lease, invest yourself or participate via the cooperative – with IRR, payback, CAP payment and gross margin.",
  keywords: ["agrivoltaics calculator", "agrivoltaics lease", "agrivoltaics investment", "agrivoltaics cooperative", "agrivoltaics CAP"],
});

const FAQ = [
  {
    q: "Warum rechnet sich hoch aufgeständerte Agri-PV auf dem Acker oft schlechter?",
    a: `Die hohe Unterkonstruktion kostet deutlich mehr – rund ${fmt(AGRI.capexProKwp.hoch.min)}–${fmt(AGRI.capexProKwp.hoch.max)} €/kWp statt ${fmt(AGRI.capexProKwp.vertikal.min)}–${fmt(AGRI.capexProKwp.vertikal.max)} €/kWp bei vertikalen Systemen. Bei Obst und Beeren ersetzt sie aber Hagelnetz oder Folientunnel und schützt einen hohen Deckungsbeitrag; dort ist sie oft die richtige Wahl.`,
    nurDE: "Rechenwerte",
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
    nurDE: "Förderregeln für Agri-PV",
  },
  {
    q: "Welche Vermarktung ist realistisch?",
    a: `In Deutschland ist Agri-PV als besondere Solaranlage EEG-förderfähig. Weil das vorgesehene eigene Untersegment nach aktuellem Stand noch nicht beihilferechtlich freigegeben war, bietet Agri-PV im ersten Segment mit – wir rechnen mit ${fmt(ERLOESE.eegFreiflaecheCt, 1)} ct/kWh, für hoch aufgeständerte Anlagen inklusive Bonus mit ${fmt(ERLOESE.eegBesondereCt, 1)} ct/kWh, jeweils 20 Jahre. Alternativ ist ein Stromliefervertrag (PPA) möglich. Danach setzen wir vorsichtig ${fmt(ERLOESE.merchantCt, 1)} ct/kWh Marktwert an.`,
    nurDE: "Vermarktungs- und Förderwerte",
  },
];

const FAQ_EN = [
  {
    q: "Why do elevated agrivoltaic systems on arable land often pay off less well?",
    a: `The tall mounting structure costs considerably more – around ${e.eur(AGRI.capexProKwp.hoch.min)}–${e.eur(AGRI.capexProKwp.hoch.max, "/kWp")} instead of ${e.eur(AGRI.capexProKwp.vertikal.min)}–${e.eur(AGRI.capexProKwp.vertikal.max, "/kWp")} for vertical systems. For fruit and berries, however, it replaces hail nets or polytunnels and protects a high gross margin; there it is often the right choice.`,
    nurDE: "Figures",
  },
  {
    q: "What does the project return (IRR) mean?",
    a: "The internal rate of return shows the annual percentage at which the investment earns interest over its lifetime – here without a bank loan and before tax. With typical debt financing, the return on the equity invested is usually higher, and so is the risk.",
  },
  {
    q: "How is the cooperative modelled in the calculator?",
    a: "In simplified form: the plant pays you, as the landowner, the agrivoltaic lease, and you hold the chosen share in the plant – you bear the corresponding share of the investment and receive that share of the surpluses. How much a cooperative actually distributes is decided by its general meeting; reserves and administration reduce the distribution.",
  },
  {
    q: "Which direct payments remain with agrivoltaics?",
    a: `Under the CAP (Common Agricultural Policy) rules in Germany, agrivoltaic land complying with DIN SPEC 91434 usually remains ${e.pct(AGRI.gapFoerderfaehig * 100)} eligible. The calculator assumes around ${e.eur(AGRI.direktzahlungProHa, "/ha")} of basic income support and redistributive payment. Please check eco-schemes and regional programmes with your agricultural office.`,
    nurDE: "Subsidy rules for agrivoltaics",
  },
  {
    q: "Which way of selling the power is realistic?",
    a: `In Germany, agrivoltaics qualifies for EEG support (German Renewable Energy Sources Act) as a “special solar installation”. Because the planned dedicated sub-segment had not yet received state-aid approval at the time of writing, agrivoltaics bids in the first segment – we calculate with ${e.fmt(ERLOESE.eegFreiflaecheCt, 1)} ct/kWh, and for elevated systems including the bonus with ${e.fmt(ERLOESE.eegBesondereCt, 1)} ct/kWh, each for 20 years. Alternatively, a power purchase agreement (PPA) is possible. Thereafter we cautiously assume a market value of ${e.fmt(ERLOESE.merchantCt, 1)} ct/kWh.`,
    nurDE: "Marketing and subsidy figures",
  },
];

const DE = {
  bausteine: [
    { weg: "C", titel: "Verpachten", invest: "keine Investition", energie: [`Agri-Pacht ${fmt(PACHT.agriProHa.mittel)} €/ha, +${fmt(PACHT.indexierung * 100, 1)} % p. a.`], energieLand: ["Agri-Pacht, indexiert"] },
    { weg: "B", titel: "Selbst investieren", invest: "volle Investition", energie: ["alle Stromerlöse", "abzgl. Betrieb, Wartung, Versicherung, Rückbaurücklage"] },
    { weg: "D", titel: "Genossenschaft", invest: "Investition anteilig", energie: ["Agri-Pacht", "Ihr Anteil an den Überschüssen"] },
  ],
  bausteineLabel: "Bausteine der drei Wege",
  weg: "Weg",
  deckung: "+ Deckungsbeitrag unter der Anlage",
  gapDe: "+ verbleibende GAP-Zahlung",
  gapLand: "+ Direktzahlungen, soweit förderfähig",
  energieTeil: "Energie-Teil",
  landwirtschaft: "Landwirtschaft – in allen Wegen gleich",
  breadcrumb: "Agri-PV-Rechner",
  eyebrow: "Agri-PV-Rechner für Landwirte",
  title: <>Verpachten, investieren <span className="ov-text-gradient-light">oder beteiligen?</span></>,
  lead: "Drei Wege für Ihre Fläche nebeneinander – mit Investition, Rendite, Amortisation, GAP-Zahlung und dem Deckungsbeitrag, der auf der Fläche weiterläuft.",
  chips: ["Kostenlos & ohne Anmeldung", "Drei Szenarien", "Inklusive GAP"],
  app: {
    name: "ÖkoInvest Agri-PV-Rechner",
    description: "Vergleicht für Agri-PV-Flächen Verpachtung, Eigeninvestition und Beteiligung über eine Genossenschaft – mit Investition, IRR, Amortisation, GAP-Direktzahlungen und landwirtschaftlichem Deckungsbeitrag.",
    featureList: ["Vertikale und hoch aufgeständerte Agri-PV", "Kulturen mit Ertragsfaktor", "EEG-Zuschlag oder PPA", "IRR und Amortisation", "Genossenschaftsanteil wählbar", "GAP und Deckungsbeitrag"],
  },
  methodik: {
    eyebrow: "So rechnen wir",
    title: "Die Landwirtschaft läuft in allen drei Wegen weiter.",
    lead: (de) => `Anders als beim klassischen Solarpark bleibt bei Agri-PV die Ernte. Deshalb enthält jede Summe den Deckungsbeitrag unter der Anlage und ${de ? "die verbleibende GAP-Zahlung" : "die Direktzahlungen, soweit die Fläche förderfähig bleibt"} – die Wege unterscheiden sich im Energie-Teil.`,
  },
  annahmen: [
    ["Investition vertikal", `${fmt(AGRI.capexProKwp.vertikal.mittel)} €/kWp`],
    ["Investition hoch aufgeständert", `${fmt(AGRI.capexProKwp.hoch.mittel)} €/kWp`],
    ["Zzgl. Netz & Entwicklung", `${fmt(FREIFLAECHE.netzanschlussFixProMwp)} €/MWp + ${fmt(FREIFLAECHE.entwicklungProKwp.min)} €/kWp`],
    ["Betriebskosten", `${fmt(AGRI.opexProKwp)} €/kWp·a, +${fmt(FREIFLAECHE.inflation * 100)} % p. a.`],
    ["EEG vertikal / hoch / PPA", `${fmt(ERLOESE.eegFreiflaecheCt, 1)} / ${fmt(ERLOESE.eegBesondereCt, 1)} / ${fmt(ERLOESE.ppaCt.mittel, 1)} ct/kWh`],
    ["Nach 20 Jahren", `${fmt(ERLOESE.merchantCt, 1)} ct/kWh`],
    ["Agri-Pacht", `${fmt(PACHT.agriProHa.mittel)} €/ha·a`],
    ["GAP förderfähig / Satz", `${fmt(AGRI.gapFoerderfaehig * 100)} % · ${fmt(AGRI.direktzahlungProHa)} €/ha`],
    ["Degradation", `${fmt(FREIFLAECHE.degradation * 100, 1)} % p. a.`],
  ],
  quellen: [
    { name: "Fraunhofer ISE – Agri-PV-Leitfaden", url: "https://www.ise.fraunhofer.de/de/veroeffentlichungen/studien/agri-photovoltaik-chance-fuer-landwirtschaft-und-energiewende.html" },
    { name: "Bundesnetzagentur – Ausschreibungen", url: "https://www.bundesnetzagentur.de/DE/Fachthemen/ElektrizitaetundGas/Ausschreibungen/Solaranlagen1/start.html" },
    { name: "KTBL", url: "https://www.ktbl.de/" },
  ],
  querverweise: [
    { href: seitenPfad("/agri-pv"), titel: "Agri-PV im Detail", text: "Kategorien der DIN SPEC 91434, Systeme, Kulturen, GAP und Baurecht." },
    { href: seitenPfad("/landwirte"), titel: "Für Landwirte", text: "Die vier Wege und die Entscheidungshilfe „Welcher Weg passt?“." },
    { href: seitenPfad("/genossenschaft"), titel: "Genossenschaft", text: "Mitglied werden und am Ertrag regionaler Anlagen teilhaben." },
  ],
  cta: {
    eyebrow: "Für Landwirte kostenfrei",
    title: "Mit Ihren echten Zahlen rechnen?",
    text: "Wir prüfen Fläche, Netz und Kultur und rechnen die Wege mit Ihnen durch – inklusive Finanzierung und Förderung.",
    primary: { label: "Anfrage stellen", href: seitenPfad("/landwirte#anfrage") },
    secondary: { label: "Fläche prüfen", href: seitenPfad("/flaechencheck") },
  },
};

const EN = {
  bausteine: [
    { titel: "Lease", invest: "no investment", energie: [`Agrivoltaic lease ${e.eur(PACHT.agriProHa.mittel, "/ha")}, +${e.pct(PACHT.indexierung * 100, 1)} p.a.`], energieLand: ["Agrivoltaic lease, indexed"] },
    { titel: "Invest yourself", invest: "full investment", energie: ["all power revenue", "less operation, maintenance, insurance, decommissioning reserve"] },
    { titel: "Cooperative", invest: "pro-rata investment", energie: ["Agrivoltaic lease", "Your share of the surpluses"] },
  ],
  bausteineLabel: "Building blocks of the three options",
  weg: "Option",
  deckung: "+ gross margin under the system",
  gapDe: "+ remaining CAP payment",
  gapLand: "+ direct payments, where eligible",
  energieTeil: "Energy part",
  landwirtschaft: "Farming – the same in all options",
  breadcrumb: "Agrivoltaics calculator",
  eyebrow: "Agrivoltaics calculator for farmers",
  title: <>Lease, invest <span className="ov-text-gradient-light">or participate?</span></>,
  lead: "Three options for your land side by side – with investment, return, payback, CAP payment and the gross margin that continues on the land.",
  chips: ["Free & no sign-up", "Three scenarios", "Including CAP"],
  app: {
    name: "ÖkoInvest agrivoltaics calculator",
    description: "Compares leasing, own investment and participation via a cooperative for agrivoltaic land – with investment, IRR, payback, CAP direct payments and agricultural gross margin.",
    featureList: ["Vertical and elevated agrivoltaics", "Crops with yield factor", "EEG award or PPA", "IRR and payback", "Selectable cooperative share", "CAP and gross margin"],
  },
  methodik: {
    eyebrow: "How we calculate",
    title: "Farming continues in all three options.",
    lead: (de) => `Unlike a conventional solar park, agrivoltaics keeps the harvest. That is why every total includes the gross margin under the system and ${de ? "the remaining CAP payment" : "the direct payments, as far as the land remains eligible"} – the options differ in the energy part.`,
  },
  annahmen: [
    ["Investment, vertical", e.eur(AGRI.capexProKwp.vertikal.mittel, "/kWp")],
    ["Investment, elevated", e.eur(AGRI.capexProKwp.hoch.mittel, "/kWp")],
    ["Plus grid & development", `${e.eur(FREIFLAECHE.netzanschlussFixProMwp, "/MWp")} + ${e.eur(FREIFLAECHE.entwicklungProKwp.min, "/kWp")}`],
    ["Operating costs", `${e.eur(AGRI.opexProKwp, "/kWp·yr")}, +${e.pct(FREIFLAECHE.inflation * 100)} p.a.`],
    ["EEG vertical / elevated / PPA", `${e.fmt(ERLOESE.eegFreiflaecheCt, 1)} / ${e.fmt(ERLOESE.eegBesondereCt, 1)} / ${e.fmt(ERLOESE.ppaCt.mittel, 1)} ct/kWh`],
    ["After 20 years", `${e.fmt(ERLOESE.merchantCt, 1)} ct/kWh`],
    ["Agrivoltaic lease", e.eur(PACHT.agriProHa.mittel, "/ha·yr")],
    ["CAP eligible / rate", `${e.pct(AGRI.gapFoerderfaehig * 100)} · ${e.eur(AGRI.direktzahlungProHa, "/ha")}`],
    ["Degradation", `${e.pct(FREIFLAECHE.degradation * 100, 1)} p.a.`],
  ],
  quellen: [
    { name: "Fraunhofer ISE – agrivoltaics guideline" },
    { name: "Bundesnetzagentur (Federal Network Agency) – tenders" },
    { name: "KTBL (Association for Technology and Structures in Agriculture)" },
  ],
  querverweise: [
    { titel: "Agrivoltaics in detail", text: "DIN SPEC 91434 categories, systems, crops, CAP and planning law." },
    { titel: "For farmers", text: "The four options and the decision aid “Which option suits you?”." },
    { titel: "Cooperative", text: "Become a member and share in the yield of regional plants." },
  ],
  cta: {
    eyebrow: "Free of charge for farmers",
    title: "Calculate with your real figures?",
    text: "We check the land, grid and crop and work through the options with you – including financing and subsidies.",
    primary: { label: "Send an enquiry" },
    secondary: { label: "Check your land" },
  },
};

export default async function Page({ params }) {
  const land = await seitenLand(params);
  const sprache = spracheDerAnfrage();
  const en = sprache === "en";
  const t = uebersetze({ de: DE, en: EN }, sprache);
  // Bausteine der Wege: Pachtwert und GAP-Regel gelten für Deutschland – in AT/CH ohne Wert und ohne deutsche Förderregel
  const de = !land || land === "DE";
  return (
    <RechnerSeite
      pfad={PFAD}
      toolId="agri-pv"
      breadcrumb={t.breadcrumb}
      eyebrow={t.eyebrow}
      title={t.title}
      lead={t.lead}
      chips={t.chips}
      app={t.app}
      rechner={<AgriPvRechner />}
      erklaerung={
        <>
          <SectionHeading eyebrow={t.methodik.eyebrow} title={t.methodik.title} lead={t.methodik.lead(de)} />
          <NurDEBlock land={land} thema="Rechenwerte und Annahmen" themaEn="Figures and assumptions">
            <div className="ov-prose mt-8 max-w-2xl">
              {en ? (
                <>
                  <p>
                    <strong>Lease:</strong> an investor builds the plant and pays an agrivoltaic lease of {e.eur(PACHT.agriProHa.mittel, "/ha")}, indexed at {e.pct(PACHT.indexierung * 100, 1)} per year. <strong>Invest yourself:</strong> you bear the investment and receive all power revenue less operation, maintenance, insurance and the decommissioning reserve. <strong>Cooperative:</strong> you receive the lease and hold the chosen share in the plant.
                  </p>
                  <p>
                    The capacity follows from the land required by the system – around {e.fmt(BAUART.agriVertikal.haProMwp, 1)} ha per MWp for vertical systems, around {e.fmt(BAUART.agriHoch.haProMwp, 1)} ha per MWp for elevated ones. Which systems exist and what DIN SPEC 91434 requires is explained under <Link href={seitenPfad("/agri-pv")}>Agrivoltaics</Link>; which option suits your farm is shown by the decision aid for <Link href={seitenPfad("/landwirte")}>farmers</Link>.
                  </p>
                </>
              ) : (
                <>
                  <p>
                    <strong>Verpachten:</strong> Ein Investor baut und zahlt eine Agri-Pacht von {fmt(PACHT.agriProHa.mittel)} €/ha, indexiert mit {fmt(PACHT.indexierung * 100, 1)} % pro Jahr. <strong>Selbst investieren:</strong> Sie tragen die Investition und erhalten alle Stromerlöse abzüglich Betrieb, Wartung, Versicherung und Rückbaurücklage. <strong>Genossenschaft:</strong> Sie erhalten die Pacht und halten den gewählten Anteil an der Anlage.
                  </p>
                  <p>
                    Die Leistung ergibt sich aus dem Flächenbedarf des Systems – vertikal rund {fmt(BAUART.agriVertikal.haProMwp, 1)} ha je MWp, hoch aufgeständert rund {fmt(BAUART.agriHoch.haProMwp, 1)} ha je MWp. Welche Systeme es gibt und was die DIN SPEC 91434 verlangt, lesen Sie unter <Link href={seitenPfad("/agri-pv")}>Agri-PV</Link>; welcher Weg zu Ihrem Betrieb passt, zeigt die Entscheidungshilfe für <Link href={seitenPfad("/landwirte")}>Landwirte</Link>.
                  </p>
                </>
              )}
            </div>
          </NurDEBlock>
          <ul className="mt-10 grid max-w-3xl gap-3 sm:grid-cols-3" aria-label={t.bausteineLabel}>
            {t.bausteine.map((b) => (
              <li key={b.titel} className="flex flex-col rounded-[1.4rem] bg-white p-4 shadow-e1 ring-1 ring-ink-200/70">
                <p className="text-[11.5px] font-bold uppercase tracking-[0.12em] text-ov-700">{t.weg} {b.weg}</p>
                <p className="mt-1 font-display text-[15.5px] font-bold leading-tight text-ink-900">{b.titel}</p>
                <p className="mt-1 text-[12.5px] text-ink-500">{b.invest}</p>
                <div className="mt-3 flex flex-1 flex-col gap-1.5">
                  {(de ? b.energie : b.energieLand || b.energie).map((x) => (
                    <span key={x} className="rounded-lg bg-ov-50 px-2.5 py-1.5 text-[12.5px] font-medium leading-snug text-ov-800 ring-1 ring-inset ring-ov-200">
                      {x}
                    </span>
                  ))}
                  <span className="mt-auto rounded-lg bg-sun-50 px-2.5 py-1.5 text-[12.5px] font-medium leading-snug text-sun-700 ring-1 ring-inset ring-sun-200">{t.deckung}</span>
                  <span className="rounded-lg bg-sun-50 px-2.5 py-1.5 text-[12.5px] font-medium leading-snug text-sun-700 ring-1 ring-inset ring-sun-200">{de ? t.gapDe : t.gapLand}</span>
                </div>
              </li>
            ))}
          </ul>
          <p className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-[12.5px] text-ink-500">
            <span className="flex items-center gap-2"><span aria-hidden="true" className="h-2.5 w-2.5 rounded-full bg-ov-500" />{t.energieTeil}</span>
            <span className="flex items-center gap-2"><span aria-hidden="true" className="h-2.5 w-2.5 rounded-full bg-sun-400" />{t.landwirtschaft}</span>
          </p>
        </>
      }
      annahmen={t.annahmen}
      quellen={t.quellen}
      faq={faqFuerLand(uebersetze({ de: FAQ, en: FAQ_EN }, sprache), land, { sprache })}
      querverweise={t.querverweise}
      cta={t.cta}
    />
  );
}

export const generateMetadata = seitenMetadata("/rechner/agri-pv", metadata, { en: metadataEn });
