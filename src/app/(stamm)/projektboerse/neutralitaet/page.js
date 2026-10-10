// /projektboerse/neutralitaet – „Neutralität & Regeln“ der Projektbörse (Welle 3, Paket B10; Masterplan B10,
// Dossier I4). Inhalt: Offenlegung (die ÖKOVOLT Gruppe entwickelt selbst), Informationsbarriere zwischen Börse
// und eigener Projektentwicklung, Konfliktregeln, Badges mit Kriterien (src/lib/boerse/neutralitaet.js),
// ehrlicher Bestand, rechtliche Einordnung je Land (keine Börse im Sinne von BörsG/BörseG 2018/FinfraG).
//
// Länder: gemeinsame Seite zeigt die Einordnung für DE, AT und CH getrennt beschriftet, jede Länderfassung nur
// ihr Land. Regeln und Einordnung sind ENTWURF (Prüfung Rechtsabteilung je Land offen) → noindex
// (Register src/lib/land/seiten.js, index: false), nicht in der Sitemap.

import Link from "@/components/Land/Link";
import { Ban, BadgePercent, Building2, EyeOff, FileLock2, FileSearch, Handshake, Info, Landmark, ListOrdered, ScrollText, Scale } from "lucide-react";
import Section from "@/components/ui/Section";
import SectionHeading from "@/components/ui/SectionHeading";
import Reveal from "@/components/ui/Reveal";
import Faq from "@/components/ui/Faq";
import CtaBand from "@/components/ui/CtaBand";
import Button from "@/components/ui/Button";
import Querverweise from "@/components/Reusable/Querverweise";
import Hero from "@/components/Boerse/Seite/Hero";
import NeutralitaetBuehne from "@/components/Boerse/Seite/NeutralitaetBuehne";
import { Badge } from "@/components/Boerse/Badges";
import { cn } from "@/components/ui/cn";
import { abs } from "@/data/site";
import { BADGES, BADGE_REIHENFOLGE, RECHT_STAND, rechtsrahmenFuer } from "@/lib/boerse/neutralitaet";
import { seitenLand, seitenMetadata, spracheDerAnfrage } from "@/lib/land/seite";
import { uebersetze } from "@/lib/sprache/woerterbuch";
import { datumText } from "@/lib/sprache/format";
import { schreibweiseBaum } from "@/components/Land/SchweizerSchreibweise";

const SCHLUESSEL = "/projektboerse/neutralitaet";
const TITEL = "Neutralität & Regeln der Projektbörse | ÖkoInvest";
const BESCHREIBUNG =
  "Wie die Projektbörse neutral bleibt, obwohl die ÖKOVOLT Gruppe selbst Solarparks entwickelt: Informationsbarriere, Kennzeichnung jedes Inserats, kein Vorkaufsrecht, gleiche Informationen für alle.";

const metadata = {
  title: TITEL,
  description: BESCHREIBUNG,
  robots: { index: false, follow: true }, // Entwurf, Prüfung Rechtsabteilung offen (Register index: false)
  openGraph: {
    type: "website",
    url: abs(SCHLUESSEL),
    siteName: "ÖkoInvest",
    title: TITEL,
    description: BESCHREIBUNG,
    images: [{ url: abs("/img/solarpark-reihen.jpg"), width: 1280, height: 852, alt: "Reihen eines Solarparks" }],
  },
};

const metadataEn = {
  title: "Neutrality & rules of the project exchange | ÖkoInvest",
  description: "How the project exchange stays neutral although the ÖKOVOLT Group develops solar parks itself: information barrier, labelling of every listing, no right of first refusal, the same information for everyone.",
  openGraph: {
    title: "Neutrality & rules of the project exchange | ÖkoInvest",
    description: "How the project exchange stays neutral although the ÖKOVOLT Group develops solar parks itself: information barrier, labelling of every listing, no right of first refusal, the same information for everyone.",
    images: [{ alt: "Rows of a solar park" }],
  },
};

const OFFEN_ICONS = [Building2, Handshake, BadgePercent];
const REGEL_ICONS = [Building2, FileLock2, Ban, Handshake, EyeOff, BadgePercent, ScrollText];

const TEXTE = {
  de: {
    brot: ["Projektbörse", "Neutralität & Regeln"],
    pill: { marke: "Regeln", text: "Informationsbarriere, Kennzeichnung, Rechtsrahmen" },
    titel1: "Wir entwickeln selbst – ",
    titel2: "darum gelten hier feste Regeln.",
    leadStark: "Die ÖKOVOLT Gruppe plant, baut und betreibt eigene Solarparks.",
    lead: " Damit Sie Ihr Projekt trotzdem bedenkenlos über unsere Börse vermarkten können, trennen wir Börse und eigene Projektentwicklung – und legen offen, wo die Gruppe beteiligt ist.",
    aktionen: [
      { label: "Projekt vertraulich anbieten", href: "/projektboerse/anbieten#fremdentwickler" },
      { label: "Muster-NDA ansehen", href: "/projektboerse/muster-nda" },
    ],
    hinweis: "Regeln und rechtliche Einordnung im Entwurf – die Rechtsabteilung prüft sie je Land.",
    versprechen: ["Jedes Inserat gekennzeichnet", "Kein Vorkaufsrecht der Gruppe", "Gleiche Informationen, gleiche Fristen", "Datenraum mit Protokoll"],
    bild: "Schema der Informationsbarriere",
    offenEyebrow: "Offenlegung",
    offenTitel: "Warum eine Börse mit eigenem Entwicklungsgeschäft Regeln braucht",
    offenLead: "Wer ein Projekt anbietet, gibt sensible Informationen preis: Lage, Flurstücke, Netzanschluss, Verträge. Bei einem Börsenbetreiber, der selbst Projekte entwickelt, ist die Frage berechtigt, was mit diesen Informationen geschieht.",
    offenPunkte: [
      { titel: "Die Gruppe ist Anbieterin", text: "Projekte aus der eigenen Entwicklung der ÖKOVOLT Gruppe stehen in derselben Börse – gekennzeichnet als Gruppenprojekt." },
      { titel: "Die Gruppe kann Interessentin sein", text: "Eine Gesellschaft der Gruppe kann sich für ein Fremdinserat interessieren. Dann gelten für sie dieselben Wege wie für alle anderen Investoren." },
      { titel: "ÖkoInvest wird im Auftrag des Anbieters tätig", text: "Die Provision zahlt der Verkäufer, nur bei Abschluss. Für Investoren ist die Börse kostenfrei." },
    ],
    regelnEyebrow: "Konfliktregeln",
    regelnTitel: "Sieben Regeln, die für jedes Inserat gelten",
    regelnLead: "Sie stehen hier öffentlich, damit Anbieter und Investoren uns daran messen können.",
    regeln: [
      { titel: "Kennzeichnung", text: "Jedes Inserat zeigt, ob der Anbieter zur ÖKOVOLT Gruppe gehört oder ein Dritter ist – in der Liste und im Exposé." },
      { titel: "Informationsbarriere", text: "Vertrauliche Angaben aus Fremdinseraten – Lage, Flurstücke, Netzbetreiber, Unterlagen – sehen nur der Anbieter, das Backoffice der Börse und Investoren mit freigegebener NDA. Projektentwicklung und Flächenakquise der Gruppe erhalten sie nicht." },
      { titel: "Kein Vorkaufsrecht", text: "Die Gruppe hat bei Fremdinseraten kein Vorkaufs-, Eintritts- oder Erstzugriffsrecht. Sie sieht ein Inserat nicht früher als andere Investoren." },
      { titel: "Gleiche Informationen, gleiche Fristen", text: "Ist eine Gesellschaft der Gruppe interessiert, geht sie über die Börse: NDA, Datenraum, dieselben Fristen. Das Inserat trägt dann den Hinweis „Gruppe interessiert“, der Anbieter erfährt es." },
      { titel: "Keine Ansprache am Projekt vorbei", text: "Flächeneigentümer, Gemeinden und Netzbetreiber eines Fremdinserats sprechen wir zu diesem Projekt nicht ohne Zustimmung des Anbieters an." },
      { titel: "Gleiche Konditionen", text: "Provisionsrahmen, Prüfung und Ablauf sind für alle Anbieter gleich. Die Reihenfolge in der Liste folgt Ihren Filtern und der gewählten Sortierung, nicht dem Anbieter." },
      { titel: "Nachvollziehbar", text: "Zugriffe auf den Datenraum werden protokolliert. Anbieter sehen Aufrufe, Merker und NDA-Anfragen in ihrem Portal." },
    ],
    badgesEyebrow: "Badges",
    badgesTitel: "Was die Kennzeichnungen bedeuten",
    badgesLead: "Ein Badge erscheint nur, wenn die Angabe im Inserat hinterlegt ist und das Kriterium erfüllt. Gütesiegel oder Bewertungen vergeben wir nicht.",
    kriterium: "Kriterium",
    bestandEyebrow: "Ehrlicher Bestand",
    bestandTitel: "Was Sie in der Börse sehen – und was nicht",
    bestand: [
      "Nur veröffentlichte Inserate. Test- und Prüfdatensätze erscheinen nie öffentlich.",
      "Läuft die Plattform im Demo-Modus, sind alle Beispielprojekte deutlich als fiktive Vorführdaten markiert.",
      "Kennzahlen wie Anzahl und Leistung zählen nur die gezeigten Inserate. Wir erfinden keine Inserate, Käufer oder Abschlüsse.",
    ],
    rechtEyebrow: "Rechtliche Einordnung",
    rechtTitel: "Keine Börse im Rechtssinn",
    rechtLead: "Der Name „Projektbörse“ beschreibt einen Marktplatz für Projektrechte und Anlagen. Rechtlich ist sie etwas anderes als eine Wertpapierbörse.",
    rechtLand: "Gilt für",
    rechtEntwurf: (d) => `Entwurf, Stand ${d}. Die Rechtsabteilung prüft die Einordnung je Land; bis dahin ist nur verbindlich, was im Einzelfall schriftlich oder im Portal vereinbart ist.`,
    bedingungen: "Besondere Bedingungen Projektbörse (Entwurf)",
    fremdEyebrow: "Für Projektentwickler",
    fremdTitel: "Ihr Projekt, Ihre Kontrolle",
    fremdText: "Sie entscheiden, wann welche Unterlagen wer sieht. Auf Wunsch schließen wir vor der ersten Unterlage eine Vertraulichkeitsvereinbarung mit Ihnen ab, die die Informationsbarriere festschreibt.",
    fremdPrimaer: "Vertraulich anbieten",
    fremdSekundaer: "Muster-NDA (Entwurf)",
    faqEyebrow: "Häufige Fragen",
    faqTitel: "Neutralität: Antworten",
    faq: [
      { q: "Kauft die ÖKOVOLT Gruppe Projekte aus der Börse?", a: "Das kann vorkommen. Dann geht die Gesellschaft der Gruppe denselben Weg wie jeder Investor – NDA, Datenraum, dieselben Fristen –, das Inserat wird als „Gruppe interessiert“ gekennzeichnet und der Anbieter erfährt es. Ein Vorkaufsrecht gibt es nicht." },
      { q: "Wer im Unternehmen sieht meine vertraulichen Angaben?", a: "Das Backoffice der Börse, das Ihr Projekt prüft und den Datenraum freigibt, sowie Investoren, deren NDA freigegeben wurde. Projektentwicklung und Flächenakquise der Gruppe erhalten vertrauliche Angaben aus Fremdinseraten nicht." },
      { q: "Werden Gruppenprojekte bevorzugt angezeigt?", a: "Nein. Die Reihenfolge folgt Ihren Filtern und der gewählten Sortierung – etwa „Neueste zuerst“ oder „Größte zuerst“. Gruppenprojekte sind nur gekennzeichnet." },
      { q: "Was heißt „Unterlagen vorgeprüft“?", a: "Das Backoffice hat die Kernunterlagen zu Flächensicherung, Planungsstand und Netzanschluss auf Vollständigkeit und Plausibilität geprüft. Eine rechtliche und technische Due Diligence ersetzt das nicht; sie bleibt Sache des Käufers." },
      { q: "Kann ich eine NDA mit ÖkoInvest verlangen, bevor ich Unterlagen hochlade?", a: "Ja. Geben Sie es bei der Anfrage an. Wir schicken Ihnen die Vertraulichkeitsvereinbarung vor dem ersten Upload; das Muster finden Sie als Entwurf auf dieser Website." },
    ],
    quer: [
      { href: "/projektboerse", titel: "Projektbörse", text: "Alle veröffentlichten Inserate mit Filtern" },
      { href: "/projektboerse/anbieten", titel: "Projekt anbieten", text: "Ablauf, Prüfung und Provision" },
      { href: "/projektboerse/muster-nda", titel: "Muster-NDA", text: "Vertraulichkeit zwischen Anbieter und ÖkoInvest (Entwurf)" },
    ],
    cta: { eyebrow: "Projektbörse", title: "Neutral vermarkten – mit festen Regeln.", text: "Stellen Sie Ihr Projekt ein oder sprechen Sie zuerst mit uns über Vertraulichkeit und Ablauf.", primary: { label: "Projekt anbieten", href: "/projektboerse/anbieten#fremdentwickler" }, secondary: { label: "Zur Projektbörse", href: "/projektboerse" } },
  },
  en: {
    brot: ["Project exchange", "Neutrality & rules"],
    pill: { marke: "Rules", text: "Information barrier, labelling, legal framework" },
    titel1: "We develop projects ourselves – ",
    titel2: "so firm rules apply here.",
    leadStark: "The ÖKOVOLT Group plans, builds and operates its own solar parks.",
    lead: " So that you can still market your project on our exchange with confidence, we separate the exchange from our own project development – and disclose where the Group is involved.",
    aktionen: [
      { label: "Offer a project confidentially", href: "/projektboerse/anbieten#fremdentwickler" },
      { label: "View the model NDA", href: "/projektboerse/muster-nda" },
    ],
    hinweis: "Rules and legal classification in draft – our lawyers are reviewing them for each country.",
    versprechen: ["Every listing labelled", "No right of first refusal for the Group", "Same information, same deadlines", "Data room with access log"],
    bild: "Diagram of the information barrier",
    offenEyebrow: "Disclosure",
    offenTitel: "Why an exchange with its own development business needs rules",
    offenLead: "Anyone offering a project discloses sensitive information: location, plots, grid connection, contracts. With an exchange operator that develops projects itself, it is fair to ask what happens to this information.",
    offenPunkte: [
      { titel: "The Group is a seller", text: "Projects from the ÖKOVOLT Group's own development are listed on the same exchange – labelled as a group project." },
      { titel: "The Group may be an interested party", text: "A company of the Group may be interested in a third-party listing. It then follows the same route as all other investors." },
      { titel: "ÖkoInvest acts on behalf of the seller", text: "The seller pays the commission, only on closing. The exchange is free of charge for investors." },
    ],
    regelnEyebrow: "Conflict rules",
    regelnTitel: "Seven rules that apply to every listing",
    regelnLead: "They are published here so that sellers and investors can hold us to them.",
    regeln: [
      { titel: "Labelling", text: "Every listing shows whether the seller belongs to the ÖKOVOLT Group or is a third party – in the list and in the exposé." },
      { titel: "Information barrier", text: "Confidential information from third-party listings – location, plots, grid operator, documents – is only seen by the seller, the exchange back office and investors with an approved NDA. The Group's project development and land acquisition do not receive it." },
      { titel: "No right of first refusal", text: "The Group has no right of first refusal, step-in or first access to third-party listings. It does not see a listing earlier than other investors." },
      { titel: "Same information, same deadlines", text: "If a company of the Group is interested, it goes through the exchange: NDA, data room, the same deadlines. The listing then carries the note “Group interested”, and the seller is informed." },
      { titel: "No approaches behind the project's back", text: "We do not approach landowners, municipalities or grid operators of a third-party listing about that project without the seller's consent." },
      { titel: "Same terms", text: "Commission framework, review and process are the same for all sellers. The order in the list follows your filters and the selected sorting, not the seller." },
      { titel: "Traceable", text: "Access to the data room is logged. Sellers see views, saves and NDA requests in their portal." },
    ],
    badgesEyebrow: "Badges",
    badgesTitel: "What the labels mean",
    badgesLead: "A badge only appears if the information is recorded in the listing and meets the criterion. We do not award quality seals or ratings.",
    kriterium: "Criterion",
    bestandEyebrow: "Honest listings",
    bestandTitel: "What you see on the exchange – and what you do not",
    bestand: [
      "Only published listings. Test and check records never appear publicly.",
      "If the platform is running in demo mode, all example projects are clearly marked as fictitious demo data.",
      "Figures such as number and capacity only count the listings shown. We do not invent listings, buyers or deals.",
    ],
    rechtEyebrow: "Legal classification",
    rechtTitel: "Not an exchange in the legal sense",
    rechtLead: "The name “project exchange” describes a marketplace for project rights and plants. Legally, it is something different from a stock exchange.",
    rechtLand: "Applies to",
    rechtEntwurf: (d) => `Draft as of ${d}. Our lawyers are reviewing the classification for each country; until then, only what is agreed in writing or in the portal in the individual case is binding. Translation for information – the German version prevails.`,
    bedingungen: "Special terms for the project exchange (draft)",
    fremdEyebrow: "For project developers",
    fremdTitel: "Your project, your control",
    fremdText: "You decide who sees which documents and when. On request, we conclude a confidentiality agreement with you before the first document that sets out the information barrier.",
    fremdPrimaer: "Offer confidentially",
    fremdSekundaer: "Model NDA (draft)",
    faqEyebrow: "Frequently asked questions",
    faqTitel: "Neutrality: answers",
    faq: [
      { q: "Does the ÖKOVOLT Group buy projects from the exchange?", a: "That can happen. The Group company then takes the same route as every investor – NDA, data room, the same deadlines –, the listing is labelled “Group interested” and the seller is informed. There is no right of first refusal." },
      { q: "Who in the company sees my confidential information?", a: "The exchange back office, which reviews your project and approves the data room, and investors whose NDA has been approved. The Group's project development and land acquisition do not receive confidential information from third-party listings." },
      { q: "Are group projects displayed more prominently?", a: "No. The order follows your filters and the selected sorting – such as “Newest first” or “Largest first”. Group projects are only labelled." },
      { q: "What does “Documents pre-checked” mean?", a: "The back office has checked the core documents on land securing, planning status and grid connection for completeness and plausibility. This does not replace legal and technical due diligence, which remains the buyer's responsibility." },
      { q: "Can I ask for an NDA with ÖkoInvest before uploading documents?", a: "Yes. Say so in your enquiry. We will send you the confidentiality agreement before the first upload; the model is available as a draft on this website." },
    ],
    quer: [
      { href: "/projektboerse", titel: "Project exchange", text: "All published listings with filters" },
      { href: "/projektboerse/anbieten", titel: "Offer a project", text: "Process, review and commission" },
      { href: "/projektboerse/muster-nda", titel: "Model NDA", text: "Confidentiality between seller and ÖkoInvest (draft)" },
    ],
    cta: { eyebrow: "Project exchange", title: "Market neutrally – with firm rules.", text: "List your project or talk to us first about confidentiality and the process.", primary: { label: "Offer a project", href: "/projektboerse/anbieten#fremdentwickler" }, secondary: { label: "Go to the project exchange", href: "/projektboerse" } },
  },
};

const LAND_FLAGGE = { DE: "DE", AT: "AT", CH: "CH" };

export default async function Neutralitaet({ params }) {
  const land = await seitenLand(params);
  const sprache = spracheDerAnfrage();
  const en = sprache === "en";
  const t = uebersetze(TEXTE, sprache);
  const rahmen = rechtsrahmenFuer(land, sprache);

  // Schweiz (/ch, /en/ch): fest geschriebene Texte ohne „ß“
  return schreibweiseBaum(
    <>
      <Hero
        breadcrumbs={[{ name: t.brot[0], href: "/projektboerse" }, { name: t.brot[1], href: SCHLUESSEL }]}
        pill={{ ...t.pill, href: "#regeln" }}
        titel={<>{t.titel1}<span className="ov-text-gradient-light">{t.titel2}</span></>}
        lead={<><span className="font-medium text-white">{t.leadStark}</span>{t.lead}</>}
        aktionen={t.aktionen}
        hinweis={t.hinweis}
        versprechen={t.versprechen}
        buehne={<NeutralitaetBuehne />}
        bildunterschrift={t.bild}
      />

      {/* Offenlegung */}
      <Section tone="white" space="lg">
        <div className="grid gap-10 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:gap-16">
          <SectionHeading eyebrow={t.offenEyebrow} title={t.offenTitel} lead={t.offenLead} />
          <ul className="grid gap-4">
            {t.offenPunkte.map((x, i) => {
              const Icon = OFFEN_ICONS[i] || Building2;
              return (
              <Reveal as="li" key={x.titel} delay={i * 60} className="flex gap-4 rounded-[1.5rem] bg-sand-50 p-5 ring-1 ring-ink-200/60 md:p-6">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-white text-ov-600 shadow-e1 ring-1 ring-ink-200/60">
                  <Icon aria-hidden="true" className="h-5 w-5" />
                </span>
                <span className="min-w-0">
                  <span className="block font-display text-[17px] font-bold text-ink-900">{x.titel}</span>
                  <span className="mt-1 block text-[15px] leading-relaxed text-ink-600">{x.text}</span>
                </span>
              </Reveal>
              );
            })}
          </ul>
        </div>
      </Section>

      {/* Regeln */}
      <Section tone="sand" space="lg" id="regeln" className="scroll-mt-20">
        <SectionHeading eyebrow={t.regelnEyebrow} title={t.regelnTitel} lead={t.regelnLead} />
        <ol className="mt-12 grid gap-4 md:mt-16 md:grid-cols-2 lg:grid-cols-3">
          {t.regeln.map((r, i) => {
            const Icon = REGEL_ICONS[i] || ListOrdered;
            const gross = i === 1; // Informationsbarriere hervorgehoben
            return (
              <Reveal
                as="li"
                key={r.titel}
                delay={i * 50}
                className={cn(
                  "relative flex min-w-0 flex-col overflow-hidden rounded-[1.75rem] p-6 ring-1 md:p-7",
                  gross ? "ov-noise bg-navy-950 text-white ring-navy-900 md:col-span-2 lg:col-span-1 lg:row-span-2" : "bg-white ring-ink-200/60"
                )}
              >
                {gross && <div aria-hidden="true" className="pointer-events-none absolute -right-20 -top-20 h-60 w-60 rounded-full bg-ov-500/25 blur-[80px]" />}
                <div className="relative flex items-center justify-between gap-3">
                  <span className={cn("flex h-11 w-11 items-center justify-center rounded-2xl", gross ? "bg-white/10 text-ov-300" : "bg-ov-50 text-ov-700 ring-1 ring-inset ring-ov-200")}>
                    <Icon aria-hidden="true" className="h-5 w-5" />
                  </span>
                  <span className={cn("ov-num font-display text-[13px] font-bold", gross ? "text-ov-300" : "text-ov-700")}>{String(i + 1).padStart(2, "0")}</span>
                </div>
                <h3 lang={sprache} className={cn("relative mt-5 font-display font-bold leading-snug [hyphens:auto]", gross ? "text-[22px] text-white" : "text-[18px] text-ink-900")}>{r.titel}</h3>
                <p lang={sprache} className={cn("relative mt-2 text-[15px] leading-relaxed [hyphens:auto]", gross ? "text-white/75" : "text-ink-600")}>{r.text}</p>
              </Reveal>
            );
          })}
        </ol>
      </Section>

      {/* Badges */}
      <Section tone="white" space="lg" id="badges" className="scroll-mt-20">
        <div className="grid gap-10 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] lg:gap-16">
          <SectionHeading eyebrow={t.badgesEyebrow} title={t.badgesTitel} lead={t.badgesLead} />
          <dl className="grid gap-3 sm:grid-cols-2">
            {BADGE_REIHENFOLGE.map((id, i) => (
              <Reveal key={id} delay={i * 50} className="flex min-w-0 flex-col gap-3 rounded-[1.5rem] bg-sand-50 p-5 ring-1 ring-ink-200/60">
                <dt><Badge id={id} /></dt>
                <dd className="text-[14.5px] leading-relaxed text-ink-600">
                  <span className="sr-only">{t.kriterium}: </span>
                  {en ? BADGES[id].en.kriterium : BADGES[id].de.kriterium}
                </dd>
              </Reveal>
            ))}
          </dl>
        </div>
        <div className="mt-12 rounded-[1.75rem] bg-sand-50 p-6 ring-1 ring-ink-200/60 md:mt-16 md:p-8">
          <p className="text-[12px] font-semibold uppercase tracking-[0.16em] text-ov-700">{t.bestandEyebrow}</p>
          <p className="mt-2 font-display text-[20px] font-bold text-ink-900 md:text-[22px]">{t.bestandTitel}</p>
          <ul className="mt-5 grid gap-3 md:grid-cols-3">
            {t.bestand.map((x) => (
              <li key={x} className="flex gap-3 text-[15px] leading-relaxed text-ink-700">
                <FileSearch aria-hidden="true" className="mt-0.5 h-5 w-5 shrink-0 text-ov-600" />
                {x}
              </li>
            ))}
          </ul>
        </div>
      </Section>

      {/* Rechtliche Einordnung je Land */}
      <Section tone="navy" space="lg" id="recht" className="ov-verlauf-nacht ov-noise scroll-mt-20 overflow-hidden">
        <div aria-hidden="true" className="ov-grid-bg pointer-events-none absolute inset-0 opacity-40" />
        <div className="relative">
          <SectionHeading dark eyebrow={t.rechtEyebrow} title={t.rechtTitel} lead={t.rechtLead} />
          <div className={cn("mt-12 grid gap-4 md:mt-14", rahmen.length > 1 && "lg:grid-cols-3")}>
            {rahmen.map((r, i) => (
              <Reveal key={r.code} delay={i * 60} data-land={r.code} className="flex min-w-0 flex-col rounded-[1.75rem] bg-white/[0.05] p-6 ring-1 ring-inset ring-white/10 md:p-7">
                <div className="flex items-center gap-3">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/10 font-display text-[13px] font-bold text-ov-300">{LAND_FLAGGE[r.code]}</span>
                  <span className="min-w-0">
                    <span className="block text-[11.5px] font-semibold uppercase tracking-[0.14em] text-white/50">{t.rechtLand}</span>
                    <span className="block font-display text-[18px] font-bold text-white">{r.land}</span>
                  </span>
                </div>
                <p className="mt-4 flex items-start gap-2 text-[13px] font-semibold text-ov-200"><Landmark aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0" />{r.gesetz}</p>
                <ul className={cn("mt-4 space-y-3 text-[14.5px] leading-relaxed text-white/75", rahmen.length === 1 && "md:grid md:grid-cols-3 md:gap-6 md:space-y-0")}>
                  {r.punkte.map((x) => (
                    <li key={x} className="flex gap-2.5"><Scale aria-hidden="true" className="mt-1 h-3.5 w-3.5 shrink-0 text-ov-300" />{x}</li>
                  ))}
                </ul>
              </Reveal>
            ))}
          </div>
          <p className="mt-8 flex items-start gap-3 rounded-2xl bg-sun-300/15 px-5 py-4 text-[14px] leading-relaxed text-white/85 ring-1 ring-inset ring-sun-300/40">
            <Info aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-sun-300" />
            <span>
              {t.rechtEntwurf(datumText(RECHT_STAND, sprache))}{" "}
              <Link href="/bedingungen/projektboerse" className="font-semibold text-white underline decoration-sun-300/70 underline-offset-4 hover:decoration-white">{t.bedingungen}</Link>
            </span>
          </p>
        </div>
      </Section>

      {/* Für Fremdentwickler */}
      <Section tone="white" space="lg">
        <Reveal className="ov-noise relative grid items-center gap-8 overflow-hidden rounded-[2rem] bg-navy-950 p-7 text-white md:p-10 lg:grid-cols-[minmax(0,1.3fr)_auto] lg:gap-12">
          <div aria-hidden="true" className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-ov-500/30 blur-[100px]" />
          <div className="relative">
            <p className="text-[12px] font-semibold uppercase tracking-[0.16em] text-ov-300">{t.fremdEyebrow}</p>
            <p className="ov-h3 mt-3 text-white">{t.fremdTitel}</p>
            <p className="mt-3 max-w-2xl text-[16px] leading-relaxed text-white/70">{t.fremdText}</p>
          </div>
          <div className="relative flex flex-col gap-3 sm:flex-row lg:flex-col">
            <Button href="/projektboerse/anbieten#fremdentwickler" variant="white" pfeil>{t.fremdPrimaer}</Button>
            <Button href="/projektboerse/muster-nda" variant="outlineLight">{t.fremdSekundaer}</Button>
          </div>
        </Reveal>
      </Section>

      <Section tone="sand" space="lg">
        <div className="grid gap-10 lg:grid-cols-[1fr_1.4fr] lg:gap-16">
          <SectionHeading eyebrow={t.faqEyebrow} title={t.faqTitel} />
          <Faq items={t.faq} />
        </div>
      </Section>

      <Querverweise items={t.quer} />
      <CtaBand {...t.cta} />
    </>,
    land
  );
}

export const generateMetadata = seitenMetadata(SCHLUESSEL, metadata, { en: metadataEn });
