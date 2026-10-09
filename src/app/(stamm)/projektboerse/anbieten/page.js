import { BadgePercent, BarChart3, Check, ClipboardCheck, EyeOff, FileCheck2, FolderLock, Handshake, LayoutList, Lock, Send, ShieldCheck, UserPlus, Users } from "lucide-react";
import Section from "@/components/ui/Section";
import SectionHeading from "@/components/ui/SectionHeading";
import { cn } from "@/components/ui/cn";
import Faq from "@/components/ui/Faq";
import CtaBand from "@/components/ui/CtaBand";
import Button from "@/components/ui/Button";
import Reveal from "@/components/ui/Reveal";
import Querverweise from "@/components/Reusable/Querverweise";
import Hero from "@/components/Boerse/Seite/Hero";
import AnbieterBuehne from "@/components/Boerse/Seite/AnbieterBuehne";
import { abs } from "@/data/site";
import { PHASEN, PROVISION } from "@/lib/invest/markt";
import { fmt, fmtEur } from "@/lib/rechner/annahmen";
import { landHinweisText, landHinweisTextEn, pfad } from "@/lib/land";
import { uebersetze } from "@/lib/sprache/woerterbuch";
import { fmtEuro, fmtZahl } from "@/lib/sprache/format";
import { GiltFuer } from "@/components/Land/LandHinweis";
import { seitenLand, seitenMetadata, spracheDerAnfrage } from "@/lib/land/seite";

const PFAD = "/projektboerse/anbieten";
const TITEL = "Solarprojekt verkaufen: Projektbörse | ÖkoInvest";
const SPANNE = `${fmt(PROVISION.verkaeufer.min * 100, 1)}–${fmt(PROVISION.verkaeufer.max * 100, 0)} %`;
const BESCHREIBUNG = `Solarpark oder Projektrechte verkaufen: anonymes Exposé, NDA per Klick, digitaler Datenraum. Provision ${SPANNE} nur bei Abschluss – keine Listungsgebühren.`;

const metadata = {
  title: TITEL,
  description: BESCHREIBUNG,
  openGraph: {
    type: "website",
    url: abs(PFAD),
    siteName: "ÖkoInvest",
    title: TITEL,
    description: BESCHREIBUNG,
    images: [{ url: abs("/img/planer-tablet.jpg"), width: 1280, height: 852, alt: "Projektplanung am Tablet" }],
  },
};

// Beispielrechnung aus den Marktannahmen: baureifes Projekt, Mitte der Preisspanne
const RTB = PHASEN.find((p) => p.id === "rtb");
const BEISPIEL_MWP = 10;
const BEISPIEL_PREIS_KWP = Math.round((RTB.preisProKwp.min + RTB.preisProKwp.max) / 2);
const BEISPIEL_KAUFPREIS = BEISPIEL_MWP * 1000 * BEISPIEL_PREIS_KWP;
const pct = (x) => `${fmt(x * 100, x * 100 % 1 ? 1 : 0)} %`;

const FAQ = [
  {
    q: "Was kostet es, ein Projekt einzustellen?",
    a: `Nichts. Es gibt keine Einstell-, Listungs- oder Datenraumgebühren. Nur wenn ein über die Projektbörse vermittelter Investor Ihr Projekt erwirbt, fällt eine Erfolgsprovision von ${PROVISION.verkaeufer.text.replace(", nur bei erfolgreichem Abschluss", "")} an.`,
  },
  {
    q: "Wie wird der Provisionssatz festgelegt?",
    a: `Der Satz liegt zwischen ${pct(PROVISION.verkaeufer.min)} und ${pct(PROVISION.verkaeufer.max)} des Kaufpreises und richtet sich in der Regel nach Projektgröße und Aufwand. Er wird vor der Veröffentlichung festgelegt und steht in Ihrem Portal. Die Vereinbarung akzeptieren Sie beim Einreichen – mit Zeitstempel protokolliert.`,
  },
  {
    q: "Wer sieht meine Projektdaten?",
    a: "Öffentlich erscheint nur ein anonymer Teaser: Typ, Leistung, Phase, Region, Bundesland bzw. Kanton und Preisindikation. Gemeinde, Flurstücke, Netzbetreiber und Unterlagen sehen nur das Backoffice und Investoren, deren Vertraulichkeitsvereinbarung freigegeben wurde. Sie sehen jederzeit Aufrufe, Merker und NDA-Anfragen.",
  },
  {
    q: "Welche Projekte nehmen Sie auf?",
    a: "Freiflächen-PV, Agri-PV, Parkplatz- und Carport-PV sowie Batteriegroßspeicher in Deutschland, Österreich und der Schweiz – von gesicherten Flächen bis zur Bestandsanlage. Voraussetzung sind nachvollziehbare Angaben zu Flächensicherung, Planungsstand und Netzanschluss.",
  },
  {
    q: "Kann ich das Projekt wieder zurückziehen?",
    a: "Ja. Solange kein Verkauf abgeschlossen ist, nehmen Sie das Projekt mit einem Klick von der Börse und bearbeiten es als Entwurf weiter.",
  },
  {
    q: "Tritt ÖkoInvest selbst als Käufer auf?",
    a: "Die ÖKOVOLT Gruppe entwickelt und betreibt selbst Solarparks und kann im Einzelfall Interesse an Projekten haben. Das legen wir offen; über die Börse gelten für alle Interessenten dieselben Regeln.",
  },
];

const VORTEILE = [
  { icon: EyeOff, title: "Anonym bis zur NDA", text: "Öffentlich nur Region, Leistung, Phase und Preisindikation. Keine Gemeinde, keine Flurstücke – Flächeneigentümer und Gemeinden werden nicht vorzeitig angesprochen." },
  { icon: FolderLock, title: "Datenraum mit Protokoll", text: "Unterlagen sehen nur freigegebene Investoren. Jeder Zugriff wird protokolliert." },
  { icon: BarChart3, title: "Transparente Statistik", text: "Aufrufe, Merker, NDA-Anfragen und LOIs in Ihrem Portal – Sie sehen, wie Ihr Projekt ankommt." },
  { icon: ShieldCheck, title: "Qualitätsprüfung", text: "Jedes Projekt prüfen wir vor der Veröffentlichung. Das schafft Vertrauen auf Käuferseite – und spart Ihnen Rückfragen." },
  { icon: Users, title: "Investoren mit Suchprofil", text: "Registrierte Investoren hinterlegen Größe, Phasen, Länder und Ticket. Passende Projekte sehen sie zuerst." },
  { icon: Handshake, title: "Begleitung bis zum Abschluss", text: "Von der LOI über die Due Diligence bis zum Kaufvertrag begleitet Sie ein fester Ansprechpartner im Backoffice." },
];

const SCHRITTE = [
  { icon: UserPlus, title: "Anbieterkonto anlegen", text: "Kostenlos registrieren. Ihr Konto ist sofort nutzbar." },
  { icon: LayoutList, title: "Projekt erfassen", text: "Grunddaten, Entwicklungsstand, Exposé, Projektdatenblatt und vertrauliche Angaben – jeder Schritt wird gespeichert. Das Datenblatt erscheint nach der NDA im Exposé-PDF." },
  { icon: BadgePercent, title: "Provision akzeptieren", text: `Erfolgsprovision ${PROVISION.verkaeufer.text} – digital, mit Zeitstempel.` },
  { icon: ClipboardCheck, title: "Prüfung durch das Backoffice", text: "Wir prüfen Angaben und Unterlagen und melden uns bei Rückfragen im Portal." },
  { icon: Send, title: "Veröffentlichung & Vermarktung", text: "Anonymer Teaser in der Börse, Datenraum nach NDA, LOIs und Abschluss im Portal." },
];

const PRUEFUNG = [
  ["Flächensicherung", "Pacht-, Options- oder Gestattungsverträge und deren Laufzeit"],
  ["Planungsrecht", "Stand der Bauleitplanung, Widmung bzw. Bewilligung"],
  ["Netzanschluss", "Netzanfrage, Zusage oder Reservierung, Entfernung zum Verknüpfungspunkt"],
  ["Plausibilität", "Leistung zu Fläche, Ertragsannahmen, Zeitplan bis zur Inbetriebnahme"],
  ["Preisindikation", "Einordnung gegenüber üblichen Spannen der jeweiligen Phase"],
  ["Anonymität", "Titel und Beschreibung ohne Rückschluss auf die genaue Lage"],
];

// Englisch (Sprachmodell): gleiche Aussagen, Zahlen im englischen Format
const zEn = (n, s = 0) => fmtZahl(n, s, "en");
const pctEn = (x) => `${zEn(x * 100, (x * 100) % 1 ? 1 : 0)} %`;
const SPANNE_EN = `${zEn(PROVISION.verkaeufer.min * 100, 1)}–${zEn(PROVISION.verkaeufer.max * 100)} %`;
const PROVISION_EN = `${SPANNE_EN} of the purchase price, only on successful closing`;
const BESCHREIBUNG_EN = `Sell a solar park or project rights: anonymous exposé, NDA in one click, digital data room. Commission ${SPANNE_EN} only on closing – no listing fees.`;
const metadataEn = {
  title: "Sell a solar project: project exchange | ÖkoInvest",
  description: BESCHREIBUNG_EN,
  openGraph: { title: "Sell a solar project: project exchange | ÖkoInvest", description: BESCHREIBUNG_EN, images: [{ alt: "Project planning on a tablet" }] },
};

const FAQ_EN = [
  {
    q: "What does it cost to list a project?",
    a: `Nothing. There are no listing, posting or data room fees. Only if an investor introduced via the project exchange acquires your project is a success fee of ${SPANNE_EN} of the purchase price payable.`,
  },
  {
    q: "How is the commission rate set?",
    a: `The rate is between ${pctEn(PROVISION.verkaeufer.min)} and ${pctEn(PROVISION.verkaeufer.max)} of the purchase price and usually depends on project size and effort. It is set before publication and shown in your portal. You accept the agreement when you submit – logged with a time stamp.`,
  },
  {
    q: "Who sees my project data?",
    a: "Publicly, only an anonymous teaser appears: type, capacity, stage, region, federal state or canton and price indication. Only the back office and investors whose non-disclosure agreement has been approved see the municipality, plots, grid operator and documents. You can see views, saves and NDA requests at any time.",
  },
  {
    q: "Which projects do you accept?",
    a: "Ground-mounted PV, agrivoltaics, car park and carport PV as well as large-scale battery storage in Germany, Austria and Switzerland – from secured land to operating assets. The prerequisite is verifiable information on land securing, planning status and grid connection.",
  },
  {
    q: "Can I withdraw the project again?",
    a: "Yes. As long as no sale has been completed, you can take the project off the exchange with one click and continue editing it as a draft.",
  },
  {
    q: "Does ÖkoInvest itself act as a buyer?",
    a: "The ÖKOVOLT Group develops and operates solar parks itself and may in individual cases be interested in projects. We disclose this; on the exchange, the same rules apply to all interested parties.",
  },
];

const TEXTE = {
  de: {
    brotkrumen: ["Projektbörse", "Projekt anbieten"],
    pill: "Provision nur bei Abschluss – so rechnet es sich",
    titel1: "Solarprojekt verkaufen – ",
    titel2: "an die richtigen Investoren.",
    leadStark: "Anonymes Exposé, Klick-NDA und digitaler Datenraum:",
    lead: (p) => ` Sie behalten die Kontrolle, wir bringen Käufer und Verkäufer zusammen. Provision ${p}.`,
    registrieren: "Als Anbieter registrieren",
    boerse: "Zur Projektbörse",
    hinweis: "Kostenlos registrieren · keine Einstell-, Listungs- oder Datenraumgebühren",
    versprechen: ["Keine Listungsgebühren", "Anonym bis zur NDA", "Statistik in Echtzeit", "DACH-weit"],
    warumEyebrow: "Warum hier",
    warumTitel: "Vermarkten, ohne das Projekt aus der Hand zu geben",
    warumLead: "Die Börse ist Teil einer Gruppe, die seit 2010 Solarkraftwerke plant, baut und selbst betreibt. Wir kennen die Fragen der Käufer – und bereiten Ihr Projekt entsprechend auf.",
    vorteile: VORTEILE,
    kontoAnlegen: "Anbieterkonto anlegen",
    teaser: "Öffentlicher Teaser",
    teaserChips: ["Typ", "Leistung", "Phase", "Region", "Preis"],
    nachNda: "Erst nach NDA",
    ndaChips: ["Gemeinde", "Flurstücke", "Netzbetreiber", "Unterlagen"],
    ablaufEyebrow: "Ablauf",
    ablaufTitel: "In fünf Schritten zum geprüften Inserat",
    starten: "Jetzt starten",
    schritte: SCHRITTE,
    schritt: (n) => `Schritt ${n}`,
    provEyebrow: "Provision",
    provTitel: "Transparent – und nur bei Erfolg",
    provLead: "Keine Grundgebühr, keine Laufzeit, keine Exklusivbindung für das Inserat. Die Provision zahlt der Verkäufer nur, wenn ein über die Börse vermittelter Investor kauft.",
    provPunkte: [
      (a, b) => `Satz zwischen ${a} und ${b} des Kaufpreises`,
      "Festgelegt vor der Veröffentlichung, im Portal einsehbar",
      PROVISION.kaeufer.text.charAt(0).toUpperCase() + PROVISION.kaeufer.text.slice(1),
    ],
    beispiel: "Rechenbeispiel",
    beispielText: (mwp, preis) => `Baureifes Freiflächenprojekt mit ${mwp} MWp, Kaufpreis in der Mitte der üblichen Spanne (${preis} €/kWp):`,
    beispielLand: (mwp) => `Baureifes Freiflächenprojekt mit ${mwp} MWp – die Provision bemisst sich am vereinbarten Kaufpreis:`,
    kaufpreisRechte: "Kaufpreis Projektrechte",
    offen: "offen",
    provision: "Provision",
    provVom: "Provision vom Kaufpreis",
    kaufpreis: "Kaufpreis",
    hoechstens: (b) => `Provision höchstens ${b}`,
    basis: (a, b) => `Beispiel auf Basis der Marktspannen für Ready-to-Build (${a}–${b} €/kWp`,
    tatsaechlich: "Der tatsächliche Kaufpreis hängt von Netzanschluss, Vergütung, Standort und Verhandlung ab.",
    thema: "Marktspannen je kWp",
    qEyebrow: "Qualitätsprüfung",
    qTitel: "Was wir vor der Veröffentlichung prüfen",
    qLead: "Keine Due Diligence – aber genug, damit Investoren Ihr Projekt ernst nehmen.",
    einreichen: "Projekt einreichen",
    pruefung: PRUEFUNG,
    faqEyebrow: "Häufige Fragen",
    faqTitel: "Projekt anbieten: Antworten",
    jetztKonto: "Jetzt Anbieterkonto anlegen",
    quer: [
      { titel: "Projektbörse", text: "Alle veröffentlichten Projekte mit Filtern" },
      { titel: "Projektbewertung", text: "Wert Ihres Projekts je Phase einschätzen" },
      { titel: "Für Investoren", text: "So prüfen Käufer Projekte" },
    ],
    ctaEyebrow: "Projekt anbieten",
    ctaTitel: "Bereit, Ihr Projekt zu vermarkten?",
    ctaText: "Konto anlegen, Projekt erfassen, einreichen – wir melden uns im Portal. Provision nur bei Abschluss.",
  },
  en: {
    brotkrumen: ["Project exchange", "Offer a project"],
    pill: "Commission only on closing – how the numbers work",
    titel1: "Sell a solar project – ",
    titel2: "to the right investors.",
    leadStark: "Anonymous exposé, click-through NDA and digital data room:",
    lead: () => ` you stay in control, we bring buyers and sellers together. Commission ${PROVISION_EN}.`,
    registrieren: "Register as a seller",
    boerse: "Go to the project exchange",
    hinweis: "Free registration · no posting, listing or data room fees",
    versprechen: ["No listing fees", "Anonymous until the NDA", "Real-time statistics", "Across the DACH region"],
    warumEyebrow: "Why here",
    warumTitel: "Market your project without letting go of it",
    warumLead: "The exchange is part of a group that has been planning, building and operating solar power plants itself since 2010. We know the questions buyers ask – and prepare your project accordingly.",
    vorteile: [
      { title: "Anonymous until the NDA", text: "Publicly, only region, capacity, stage and price indication. No municipality, no plots – landowners and municipalities are not approached prematurely." },
      { title: "Data room with access log", text: "Only approved investors see documents. Every access is logged." },
      { title: "Transparent statistics", text: "Views, saves, NDA requests and LOIs in your portal – you can see how your project is received." },
      { title: "Quality check", text: "We check every project before publication. This builds trust on the buyer side – and saves you follow-up questions." },
      { title: "Investors with search profiles", text: "Registered investors store size, stages, countries and ticket. They see suitable projects first." },
      { title: "Support through to closing", text: "From the LOI through due diligence to the purchase agreement, a dedicated contact person in our back office supports you." },
    ],
    kontoAnlegen: "Create a seller account",
    teaser: "Public teaser",
    teaserChips: ["Type", "Capacity", "Stage", "Region", "Price"],
    nachNda: "Only after NDA",
    ndaChips: ["Municipality", "Plots", "Grid operator", "Documents"],
    ablaufEyebrow: "How it works",
    ablaufTitel: "Five steps to a checked listing",
    starten: "Get started",
    schritte: [
      { title: "Create a seller account", text: "Register free of charge. Your account is ready to use straight away." },
      { title: "Enter your project", text: "Basic data, development status, exposé, project data sheet and confidential details – every step is saved. The data sheet appears in the exposé PDF after the NDA." },
      { title: "Accept the commission", text: `Success fee of ${PROVISION_EN} – digital, with a time stamp.` },
      { title: "Back-office review", text: "We check the information and documents and get back to you in the portal if we have questions." },
      { title: "Publication & marketing", text: "Anonymous teaser on the exchange, data room after NDA, LOIs and closing in the portal." },
    ],
    schritt: (n) => `Step ${n}`,
    provEyebrow: "Commission",
    provTitel: "Transparent – and only on success",
    provLead: "No basic fee, no minimum term, no exclusivity for the listing. The seller only pays the commission if an investor introduced via the exchange buys.",
    provPunkte: [
      (a, b) => `Rate between ${a} and ${b} of the purchase price`,
      "Set before publication, visible in the portal",
      "Free of charge for investors (search profile, NDA, data room)",
    ],
    beispiel: "Worked example",
    beispielText: (mwp, preis) => `Ready-to-build ground-mounted project with ${mwp} MWp, purchase price in the middle of the usual range (€${preis}/kWp):`,
    beispielLand: (mwp) => `Ready-to-build ground-mounted project with ${mwp} MWp – the commission is based on the agreed purchase price:`,
    kaufpreisRechte: "Purchase price for project rights",
    offen: "open",
    provision: "Commission",
    provVom: "Commission on the purchase price",
    kaufpreis: "Purchase price",
    hoechstens: (b) => `Commission at most ${b}`,
    basis: (a, b) => `Example based on the market ranges for ready-to-build (€${a}–${b}/kWp`,
    tatsaechlich: "The actual purchase price depends on grid connection, remuneration, location and negotiation.",
    qEyebrow: "Quality check",
    qTitel: "What we check before publication",
    qLead: "Not due diligence – but enough for investors to take your project seriously.",
    einreichen: "Submit a project",
    pruefung: [
      ["Land securing", "Lease, option or permission agreements and their terms"],
      ["Planning law", "Status of land-use planning, zoning (Widmung) or permit"],
      ["Grid connection", "Grid request, commitment or reservation, distance to the connection point"],
      ["Plausibility", "Capacity relative to land, yield assumptions, schedule to commissioning"],
      ["Price indication", "Classification against the usual ranges for the respective stage"],
      ["Anonymity", "Title and description without any clue to the exact location"],
    ],
    faqEyebrow: "Frequently asked questions",
    faqTitel: "Offering a project: answers",
    jetztKonto: "Create a seller account now",
    quer: [
      { titel: "Project exchange", text: "All published projects with filters" },
      { titel: "Project valuation", text: "Estimate the value of your project by stage" },
      { titel: "For investors", text: "How buyers review projects" },
    ],
    ctaEyebrow: "Offer a project",
    ctaTitel: "Ready to market your project?",
    ctaText: "Create an account, enter your project, submit – we will get back to you in the portal. Commission only on closing.",
  },
};

export default async function Anbieten({ params }) {
  // Rechenbeispiel mit der Marktspanne RTB für Deutschland (PHASEN): gemeinsam mit Vermerk,
  // in AT/CH nur die Provisionssätze (gelten in DACH) und der LandHinweis statt Eurowerten.
  const land = await seitenLand(params);
  const werte = !land || land === "DE";
  const provAnteilMax = PROVISION.verkaeufer.max * 100;
  const sprache = spracheDerAnfrage();
  const en = sprache === "en";
  const t = uebersetze(TEXTE, sprache);
  const z = (n, s = 0) => (en ? zEn(n, s) : fmt(n, s));
  const eur = (n) => (en ? fmtEuro(n, "en") : fmtEur(n));
  const prozent = en ? pctEn : pct;
  const spanne = en ? SPANNE_EN : SPANNE;
  const vorteile = VORTEILE.map((v, i) => ({ ...v, ...t.vorteile[i] }));
  const schritte = SCHRITTE.map((s, i) => ({ ...s, ...t.schritte[i] }));
  return (
    <>
      <Hero
        breadcrumbs={[{ name: t.brotkrumen[0], href: "/projektboerse" }, { name: t.brotkrumen[1], href: PFAD }]}
        pill={{ marke: spanne, text: t.pill, href: "#provision" }}
        titel={<>{t.titel1}<span className="ov-text-gradient-light">{t.titel2}</span></>}
        lead={<><span className="font-medium text-white">{t.leadStark}</span>{t.lead(PROVISION.verkaeufer.text)}</>}
        aktionen={[
          { label: t.registrieren, href: "/registrieren?rolle=anbieter" },
          { label: t.boerse, href: "/projektboerse" },
        ]}
        hinweis={t.hinweis}
        versprechen={t.versprechen}
        buehne={<AnbieterBuehne />}
      />

      <Section tone="white" space="lg">
        <SectionHeading eyebrow={t.warumEyebrow} title={t.warumTitel} lead={t.warumLead} />
        <ul className="mt-12 grid gap-4 md:mt-16 md:grid-cols-2 lg:grid-cols-3">
          {vorteile.map((v, i) => {
            const Icon = v.icon;
            const gross = i === 0;
            const band = i === vorteile.length - 1;
            return (
              <Reveal
                as="li"
                key={v.title}
                delay={i * 60}
                className={cn(
                  "relative flex flex-col overflow-hidden rounded-[1.75rem] p-6 ring-1 md:p-7",
                  gross ? "ov-noise bg-navy-950 text-white ring-navy-900 md:col-span-2 lg:col-span-1 lg:row-span-2" : "bg-sand-50 ring-ink-200/60",
                  band && "md:col-span-2 lg:col-span-3 lg:grid lg:grid-cols-[auto_minmax(0,1fr)_auto] lg:items-center lg:gap-x-6"
                )}
              >
                {gross && <div aria-hidden="true" className="pointer-events-none absolute -right-20 -top-20 h-60 w-60 rounded-full bg-ov-500/25 blur-[80px]" />}
                <span className={cn("relative flex h-11 w-11 items-center justify-center rounded-2xl", gross ? "bg-white/10 text-ov-300" : "bg-white text-ov-600 shadow-e1 ring-1 ring-ink-200/60")}>
                  <Icon aria-hidden="true" className="h-5 w-5" />
                </span>
                <div className={cn("relative", band && "lg:min-w-0")}>
                  <h3 className={cn("mt-5 font-display font-bold leading-snug", gross ? "text-[22px] text-white" : "text-[18px] text-ink-900", band && "lg:mt-0")}>{v.title}</h3>
                  <p className={cn("mt-2 text-[15px] leading-relaxed", gross ? "text-white/70" : "text-ink-600", band && "lg:mt-1")}>{v.text}</p>
                </div>
                {band && <Button href="/registrieren?rolle=anbieter" variant="secondary" pfeil className="mt-5 justify-self-start lg:mt-0">{t.kontoAnlegen}</Button>}
                {gross && (
                  <div className="relative mt-auto pt-8" aria-hidden="true">
                    <div className="rounded-2xl bg-white/[0.05] p-4 ring-1 ring-inset ring-white/10">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-ov-300">{t.teaser}</p>
                      <div className="mt-2.5 flex flex-wrap gap-1.5">
                        {t.teaserChips.map((x) => (
                          <span key={x} className="inline-flex items-center gap-1 rounded-full bg-ov-400/15 px-2 py-1 text-[11.5px] font-medium text-ov-200 ring-1 ring-inset ring-ov-300/30"><Check className="h-3 w-3" strokeWidth={3} />{x}</span>
                        ))}
                      </div>
                      <p className="mt-4 text-[11px] font-semibold uppercase tracking-[0.12em] text-white/50">{t.nachNda}</p>
                      <div className="mt-2.5 flex flex-wrap gap-1.5">
                        {t.ndaChips.map((x) => (
                          <span key={x} className="inline-flex items-center gap-1 rounded-full bg-white/5 px-2 py-1 text-[11.5px] font-medium text-white/50 ring-1 ring-inset ring-white/10"><Lock className="h-3 w-3" />{x}</span>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </Reveal>
            );
          })}
        </ul>
      </Section>

      <Section tone="sand" space="lg">
        <div className="grid items-end gap-6 lg:grid-cols-[minmax(0,1fr)_auto]">
          <SectionHeading eyebrow={t.ablaufEyebrow} title={t.ablaufTitel} />
          <Button href="/registrieren?rolle=anbieter" pfeil className="justify-self-start">{t.starten}</Button>
        </div>
        <ol className="relative mt-12 grid gap-4 sm:grid-cols-2 md:mt-16 lg:grid-cols-5 lg:gap-3">
          <div aria-hidden="true" className="absolute left-[10%] right-[10%] top-[2.375rem] hidden h-px bg-gradient-to-r from-ov-200 via-ov-400 to-ov-200 lg:block" />
          {schritte.map((s, i) => {
            const Icon = s.icon;
            const letzter = i === schritte.length - 1;
            return (
              <Reveal as="li" key={s.title} delay={i * 70} className={cn("relative flex min-w-0 flex-col rounded-[1.5rem] p-5 ring-1 lg:p-6", letzter ? "bg-ov-600 text-white ring-ov-600 sm:col-span-2 lg:col-span-1" : "bg-white ring-ink-200/60")}>
                <div className="flex items-center justify-between">
                  <span className={cn("relative z-10 flex h-[2.75rem] w-[2.75rem] items-center justify-center rounded-2xl", letzter ? "bg-white/15 text-white" : "bg-ov-50 text-ov-700 ring-1 ring-inset ring-ov-200")}>
                    <Icon aria-hidden="true" className="h-5 w-5" />
                  </span>
                  <span className={cn("ov-num font-display text-[13px] font-bold", letzter ? "text-white/80" : "text-ov-700")}>{t.schritt(i + 1)}</span>
                </div>
                <h3 lang={sprache} className={cn("mt-5 font-display text-[17px] font-bold leading-snug [hyphens:auto]", letzter ? "text-white" : "text-ink-900")}>{s.title}</h3>
                <p lang={sprache} className={cn("mt-2 text-[14px] leading-relaxed [hyphens:auto]", letzter ? "text-white/85" : "text-ink-600")}>{s.text}</p>
              </Reveal>
            );
          })}
        </ol>
      </Section>

      <Section tone="white" space="lg" id="provision" className="scroll-mt-20">
        <div className="grid items-center gap-10 lg:grid-cols-2 lg:gap-16">
          <div>
            <SectionHeading eyebrow={t.provEyebrow} title={t.provTitel} lead={t.provLead} />
            <ul className="mt-8 space-y-3 text-[15.5px] text-ink-700">
              <li className="flex gap-3"><FileCheck2 aria-hidden="true" className="mt-0.5 h-5 w-5 shrink-0 text-ov-600" /> {t.provPunkte[0](prozent(PROVISION.verkaeufer.min), prozent(PROVISION.verkaeufer.max))}</li>
              <li className="flex gap-3"><FileCheck2 aria-hidden="true" className="mt-0.5 h-5 w-5 shrink-0 text-ov-600" /> {t.provPunkte[1]}</li>
              <li className="flex gap-3"><FileCheck2 aria-hidden="true" className="mt-0.5 h-5 w-5 shrink-0 text-ov-600" /> {t.provPunkte[2]}</li>
            </ul>
          </div>
          <Reveal className="ov-noise relative overflow-hidden rounded-[2rem] bg-navy-950 p-7 text-white md:p-10">
            <div aria-hidden="true" className="absolute -right-24 -top-24 h-72 w-72 rounded-full bg-ov-500/30 blur-[100px]" />
            <p className="relative text-[12px] font-semibold uppercase tracking-[0.16em] text-ov-300">{t.beispiel}</p>
            <p className="relative mt-3 text-[15px] text-white/70">
              {werte ? t.beispielText(BEISPIEL_MWP, z(BEISPIEL_PREIS_KWP)) : t.beispielLand(BEISPIEL_MWP)}
            </p>
            <dl className="relative mt-6 space-y-4">
              <div className="flex items-baseline justify-between gap-4 border-b border-white/10 pb-4">
                <dt className="text-white/70">{t.kaufpreisRechte}</dt>
                <dd className="ov-num font-display text-[24px] font-extrabold">{werte ? eur(BEISPIEL_KAUFPREIS) : t.offen}</dd>
              </div>
              <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                <dt className="text-white/70">{werte ? <>{t.provision} ({prozent(PROVISION.verkaeufer.min)}–{prozent(PROVISION.verkaeufer.max)})</> : t.provVom}</dt>
                <dd className="ov-num font-display text-[24px] font-extrabold text-ov-300">{werte ? `${eur(BEISPIEL_KAUFPREIS * PROVISION.verkaeufer.min)} – ${eur(BEISPIEL_KAUFPREIS * PROVISION.verkaeufer.max)}` : `${prozent(PROVISION.verkaeufer.min)} – ${prozent(PROVISION.verkaeufer.max)}`}</dd>
              </div>
            </dl>
            {/* Anteil der Provision am Kaufpreis, maßstäblich */}
            <div className="relative mt-6" aria-hidden="true">
              <div className="flex h-3 overflow-hidden rounded-full bg-white/10">
                <span className="h-full bg-white/30" style={{ width: `${100 - provAnteilMax}%` }} />
                <span className="h-full bg-ov-400" style={{ width: `${provAnteilMax}%` }} />
              </div>
              <div className="mt-2 flex justify-between text-[11.5px] text-white/55">
                <span>{t.kaufpreis}</span>
                <span className="text-ov-300">{t.hoechstens(prozent(PROVISION.verkaeufer.max))}</span>
              </div>
            </div>
            <p className="relative mt-6 text-[12.5px] leading-relaxed text-white/50">
              {werte ? (
                <>
                  {t.basis(z(RTB.preisProKwp.min), z(RTB.preisProKwp.max))}{land ? ")" : <>) <GiltFuer dunkel /></>}. {t.tatsaechlich}
                </>
              ) : (
                <span data-land-hinweis={land}>{en ? landHinweisTextEn(land, "Market ranges per kWp") : landHinweisText(land, "Marktspannen je kWp")}. {t.tatsaechlich}</span>
              )}
            </p>
          </Reveal>
        </div>
      </Section>

      <Section tone="navy" space="lg" className="ov-verlauf-nacht ov-noise overflow-hidden">
        <div aria-hidden="true" className="ov-grid-bg pointer-events-none absolute inset-0 opacity-40" />
        <div className="relative grid gap-10 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.2fr)] lg:gap-16">
          <div>
            <SectionHeading dark eyebrow={t.qEyebrow} title={t.qTitel} lead={t.qLead} />
            <Button href="/registrieren?rolle=anbieter" variant="white" pfeil className="mt-8">{t.einreichen}</Button>
          </div>
          <ol className="grid gap-3 sm:grid-cols-2">
            {t.pruefung.map(([titel, x], i) => (
              <Reveal as="li" key={titel} delay={i * 50} className="flex gap-4 rounded-2xl bg-white/[0.05] p-5 ring-1 ring-inset ring-white/10">
                <span aria-hidden="true" className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-ov-400/15 text-ov-300 ring-1 ring-inset ring-ov-300/40">
                  <Check className="h-4 w-4" strokeWidth={3} />
                </span>
                <span className="min-w-0">
                  <span className="block font-display text-[16px] font-bold text-white">{titel}</span>
                  <span className="mt-1 block text-[14px] leading-relaxed text-white/65">{x}</span>
                </span>
              </Reveal>
            ))}
          </ol>
        </div>
      </Section>

      <Section tone="white" space="lg">
        <div className="grid gap-12 lg:grid-cols-[1fr_1.4fr]">
          <div>
            <SectionHeading eyebrow={t.faqEyebrow} title={t.faqTitel} />
            <Button href="/registrieren?rolle=anbieter" className="mt-8" pfeil>{t.jetztKonto}</Button>
          </div>
          <Faq items={en ? FAQ_EN : FAQ} />
        </div>
      </Section>

      <Querverweise
        items={[
          { href: "/projektboerse", ...t.quer[0] },
          { href: pfad("/rechner/projektbewertung"), ...t.quer[1] },
          { href: "/investoren", ...t.quer[2] },
        ]}
      />

      <CtaBand
        eyebrow={t.ctaEyebrow}
        title={t.ctaTitel}
        text={t.ctaText}
        primary={{ label: t.registrieren, href: "/registrieren?rolle=anbieter" }}
        secondary={{ label: t.boerse, href: "/projektboerse" }}
      />
    </>
  );
}

export const generateMetadata = seitenMetadata("/projektboerse/anbieten", metadata, { en: metadataEn });
