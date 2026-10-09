// Pachtvertrag (Gliederung als Dokument) und Steuern – Inhalte unverändert aus der bisherigen Seite
import {
  CalendarClock, FileSignature, HandCoins, KeyRound, Landmark, Route, Scale, ScrollText, ShieldCheck, Sprout, Wheat,
} from "lucide-react";
import Section from "@/components/ui/Section";
import SectionHeading from "@/components/ui/SectionHeading";
import Reveal from "@/components/ui/Reveal";
import { PACHT, STAND } from "@/lib/invest/markt";
import { landDerAnfrage, spracheDerAnfrage } from "@/lib/land/seite";
import { inhaltFuerSprache, uebersetze } from "@/lib/sprache/woerterbuch";
import { datumText } from "@/lib/sprache/format";

const KLAUSELN_GEMEINSAM = [
  { icon: CalendarClock, t: "Laufzeit", x: `${PACHT.laufzeit} Jahre ab Inbetriebnahme, dazu ${PACHT.verlaengerung} für den Betreiber – an eine höhere Pacht gekoppelt.` },
  { icon: ScrollText, t: "Dienstbarkeit im Grundbuch", x: "Beschränkte persönliche Dienstbarkeit für Anlage, Kabel und Zufahrt – Voraussetzung für jede Bankfinanzierung." },
  { icon: ShieldCheck, t: "Rückbaubürgschaft", x: "Rückbau und Wiederherstellung sind Pflicht des Betreibers, abgesichert durch eine Bank- oder Versicherungsbürgschaft." },
  { icon: Sprout, t: "Bewirtschaftung & Pflege", x: "Bis Baubeginn bewirtschaften Sie weiter. Im Betrieb Pflege durch Mahd oder Beweidung – gern durch Sie oder Ihren Pächter, gegen Vergütung." },
  { icon: Route, t: "Wegerecht & Kabeltrasse", x: "Zufahrt und Kabel über Ihre oder fremde Flurstücke werden gesondert gesichert und entschädigt." },
  { icon: KeyRound, t: "Rücktritt & Fristen", x: "Klare Fristen, bis wann Baurecht und Netz vorliegen müssen. Scheitert das Projekt, erhalten Sie Ihre Fläche frei zurück." },
  { icon: HandCoins, t: "Pacht & Zahlungstermin", x: "Pachtmodell, Indexierung, Fälligkeit (meist jährlich im Voraus) und Reservierungsprämie bis Baubeginn." },
  { icon: Scale, t: "Rechtsnachfolge & Haftung", x: "Vertrag bindet Erben und Käufer; Betreiber versichert Anlage und Haftpflicht und stellt Sie von Schäden frei." },
];

// Österreich: Dienstbarkeit nach österreichischem Recht, Grundstücke statt Flurstücke
const KLAUSELN_AT = KLAUSELN_GEMEINSAM.map((k) =>
  ({
    "Dienstbarkeit im Grundbuch": { ...k, x: "Dienstbarkeit für Anlage, Kabel und Zufahrt, eingetragen im Grundbuch – Voraussetzung für jede Bankfinanzierung." },
    "Wegerecht & Kabeltrasse": { ...k, x: "Zufahrt und Kabel über Ihre oder fremde Grundstücke werden gesondert gesichert und entschädigt." },
  })[k.t] || k
);

const SICHERUNGEN = [
  { t: "Vertrag", x: "Rückbaupflicht und Fristen", c: "bg-white text-navy-950" },
  { t: "Grundbuch", x: "Dienstbarkeit bindet Rechtsnachfolger", c: "bg-ov-300 text-navy-950" },
  { t: "Bürgschaft", x: "Bank oder Versicherung, vor Baubeginn", c: "bg-sun-400 text-navy-950" },
];

// Englisch: Klauseln (gemeinsam und AT), nur Texte je Index
const VERLAENGERUNG_EN = String(PACHT.verlaengerung).replace(/^(.*) Jahre Option$/, "options of $1 years");
const KLAUSELN_EN = [
  { t: "Term", x: `${PACHT.laufzeit} years from commissioning, plus ${VERLAENGERUNG_EN} for the operator – linked to a higher lease.` },
  { t: "Easement in the land register", x: "A limited personal easement (beschränkte persönliche Dienstbarkeit) for the plant, cables and access – a prerequisite for any bank financing." },
  { t: "Decommissioning guarantee", x: "Decommissioning and restoration are the operator’s obligation, secured by a bank or insurance guarantee." },
  { t: "Farming & maintenance", x: "You keep farming until construction starts. During operation, maintenance by mowing or grazing – ideally by you or your tenant, for a fee." },
  { t: "Right of way & cable route", x: "Access and cables across your plots or third-party plots are secured and compensated separately." },
  { t: "Withdrawal & deadlines", x: "Clear deadlines by when building rights and the grid connection must be in place. If the project fails, you get your land back unencumbered." },
  { t: "Lease & payment date", x: "Lease model, indexation, due date (usually annually in advance) and reservation fee until construction starts." },
  { t: "Legal succession & liability", x: "The contract binds heirs and buyers; the operator insures the plant and liability and indemnifies you against damage." },
];
// AT: Dienstbarkeit nach österreichischem Recht (Index 1), Grundstücke (Index 4)
const KLAUSELN_AT_EN = KLAUSELN_EN.map((k, i) =>
  i === 1 ? { ...k, x: "An easement (Dienstbarkeit) for the plant, cables and access, entered in the land register – a prerequisite for any bank financing." } : k
);

/** Sprachmodell: feste Texte des Vertrags-Abschnitts (en nur Texte). */
const W_VERTRAG = {
  de: {
    sicherungen: SICHERUNGEN,
    eyebrow: "Der Pachtvertrag",
    titel: "Was im Vertrag steht – und warum.",
    lead: "Ein Solarpark-Pachtvertrag ist ein Nutzungsvertrag über Jahrzehnte. Wir legen ihn offen vor, erklären jede Klausel und geben Ihnen Zeit für die Prüfung mit Anwalt oder Verband.",
    zurueck: "Ihre Fläche kommt zurück",
    dreifach: "Dreifach gesichert – auch wenn es den Betreiber nicht mehr gibt.",
    dokument: "Nutzungsvertrag Solarpark",
    acht: "Die acht Punkte, auf die es ankommt",
    gliederung: "Gliederung",
  },
  en: {
    sicherungen: [
      { t: "Contract", x: "Decommissioning obligation and deadlines" },
      { t: "Land register", x: "Easement binds legal successors" },
      { t: "Guarantee", x: "Bank or insurer, before construction" },
    ],
    eyebrow: "The lease agreement",
    titel: "What the contract says – and why.",
    lead: "A solar park lease is a land use agreement spanning decades. We share it openly, explain every clause and give you time to review it with a lawyer or your farmers’ association.",
    zurueck: "Your land comes back",
    dreifach: "Triple-secured – even if the operator no longer exists.",
    dokument: "Solar park land use agreement",
    acht: "The eight points that matter",
    gliederung: "Outline",
  },
};

export function Vertrag() {
  const sprache = spracheDerAnfrage();
  const w = uebersetze(W_VERTRAG, sprache);
  const KLAUSELN = inhaltFuerSprache({ de: { gemeinsam: KLAUSELN_GEMEINSAM, AT: KLAUSELN_AT }, en: { gemeinsam: KLAUSELN_EN, AT: KLAUSELN_AT_EN } }, landDerAnfrage(), sprache);
  return (
    <Section tone="sand" space="lg">
      <div className="grid gap-12 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] lg:gap-16">
        <div className="lg:sticky lg:top-28 lg:self-start">
          <SectionHeading
            eyebrow={w.eyebrow}
            title={w.titel}
            lead={w.lead}
          />
          {/* Dreifach gesichert */}
          <Reveal className="ov-noise relative mt-8 overflow-hidden rounded-3xl bg-navy-950 p-6 text-white md:p-7">
            <div aria-hidden="true" className="ov-grid-bg absolute inset-0 opacity-60" />
            <p className="ov-overline relative text-ov-300">{w.zurueck}</p>
            <p className="relative mt-2 font-display text-[20px] font-bold leading-snug">{w.dreifach}</p>
            <ol className="relative mt-6 space-y-2">
              {w.sicherungen.map((s, i) => (
                <li key={i} className="flex items-center gap-3 rounded-2xl bg-white/[0.06] p-2.5 pr-4 ring-1 ring-white/10" style={{ marginLeft: `${i * 14}px` }}>
                  <span className={`flex h-9 min-w-9 items-center justify-center rounded-xl px-2 font-display text-[14px] font-extrabold ${s.c}`}>{i + 1}</span>
                  <span className="min-w-0 text-[14px] leading-snug">
                    <span className="font-bold text-white">{s.t}</span>
                    <span className="text-white/70"> · {s.x}</span>
                  </span>
                </li>
              ))}
            </ol>
          </Reveal>
        </div>

        {/* Gliederung als Vertragsdokument */}
        <Reveal dir="scale" className="relative">
          <div aria-hidden="true" className="absolute inset-x-6 -bottom-3 top-3 rotate-[1.2deg] rounded-[1.75rem] bg-white/60 ring-1 ring-ink-200/60" />
          <div className="relative overflow-hidden rounded-[1.75rem] bg-white shadow-e4 ring-1 ring-ink-200/70">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-ink-100 px-6 py-5 md:px-8">
              <div className="flex items-center gap-3">
                <span aria-hidden="true" className="flex h-10 w-10 items-center justify-center rounded-xl bg-ov-50 text-ov-700 ring-1 ring-ov-200">
                  <FileSignature className="h-5 w-5" />
                </span>
                <div>
                  <h3 className="font-display text-[17px] font-bold leading-tight text-ink-900">{w.dokument}</h3>
                  <p className="text-[13px] text-ink-600">{w.acht}</p>
                </div>
              </div>
              <span className="rounded-full bg-ink-50 px-3 py-1 text-[12px] font-semibold text-ink-600 ring-1 ring-ink-200">{w.gliederung}</span>
            </div>
            <ol className="grid sm:grid-cols-2">
              {KLAUSELN.map((k, i) => (
                <li key={i} className="flex gap-4 border-b border-ink-100 px-6 py-5 sm:odd:border-r md:px-8 md:py-6 sm:[&:nth-last-child(-n+2)]:border-b-0 last:border-b-0">
                  <span aria-hidden="true" className="ov-num mt-0.5 w-7 shrink-0 font-display text-[13px] font-extrabold text-ov-600">§ {i + 1}</span>
                  <div className="min-w-0">
                    <p className="flex items-center gap-2 font-display text-[16.5px] font-bold text-ink-900">
                      <k.icon aria-hidden="true" className="h-4 w-4 shrink-0 text-ink-400" />
                      {k.t}
                    </p>
                    <p className="mt-1.5 text-[14.5px] leading-relaxed text-ink-600">{k.x}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </Reveal>
      </div>
    </Section>
  );
}

const STEUERN_GEMEINSAM = [
  { icon: HandCoins, t: "Einkommensteuer", x: "Pachteinnahmen sind steuerpflichtig – je nach Lage als Einkünfte aus Vermietung und Verpachtung oder, bei Betriebsvermögen, im landwirtschaftlichen Betrieb. Auch eine Entnahme aus dem Betriebsvermögen kann ein Thema sein." },
  { icon: Landmark, t: "Grundsteuer", x: "Solarpark-Flächen werden in Deutschland in der Regel nicht mehr als land- und forstwirtschaftliches Vermögen (Grundsteuer A), sondern als Grundvermögen (Grundsteuer B) bewertet. Bayern weicht davon ab. Die Grundsteuer übernimmt vertraglich oft der Betreiber." },
  { icon: Wheat, t: "Erbschaft & Schenkung", x: "Verpachtete Solarflächen fallen nach derzeitiger Verwaltungsauffassung meist aus dem begünstigten land- und forstwirtschaftlichen Vermögen. Verbände fordern eine Neuregelung; bei Agri-PV bleibt die landwirtschaftliche Nutzung erhalten. Früh gestalten lohnt sich." },
  { icon: FileSignature, t: "Umsatzsteuer", x: "Die Verpachtung von Grundstücken ist grundsätzlich umsatzsteuerfrei, eine Option zur Umsatzsteuer ist möglich. Für pauschalierende Landwirte gelten Besonderheiten." },
];

// Österreich – Quelle: Landwirtschaftskammer Kärnten, „PV auf Freiflächen: Steuerbombe bei Planung vermeiden“
// (ktn.lko.at, abgerufen 04.10.2026): Entnahme aus dem land- und forstwirtschaftlichen Betriebsvermögen,
// Einkünfte aus Vermietung und Verpachtung, Bewertung als Grundvermögen, Grunderwerbsteuer bei Hofübergabe.
const STEUERN_AT = [
  { icon: HandCoins, t: "Einkommensteuer", x: "Das Entgelt für die Überlassung der Fläche führt nach Auffassung des Finanzministeriums in der Regel zu Einkünften aus Vermietung und Verpachtung – nicht mehr aus Land- und Forstwirtschaft." },
  { icon: Landmark, t: "Bewertung & Einheitswert", x: "Die Fläche wird dann meist aus dem land- und forstwirtschaftlichen Betriebsvermögen entnommen und bewertungsrechtlich als Grundvermögen eingestuft. Ausnahmen gibt es – das prüft Ihre Steuerberatung." },
  { icon: Wheat, t: "Hofübergabe", hervor: true, x: "Als Grundvermögen kostet die Übergabe an Angehörige Grunderwerbsteuer von 0,5 bis 3,5 % vom Grundstückswert statt 2 % vom einfachen Einheitswert. Früh gestalten lohnt sich." },
  { icon: FileSignature, t: "Grundverkehr", x: "Pachtverträge über land- und forstwirtschaftliche Grundstücke können nach dem Grundverkehrsgesetz Ihres Bundeslandes genehmigungspflichtig sein. Ob das für Ihre Fläche gilt, klären wir vor Vertragsschluss." },
];

const STEUER_TEXTE = {
  gemeinsam: {
    eyebrow: "Steuern & Erbschaft",
    marke: "Wichtig für die Erbfolge",
    fuss: `Deutschland, Stand ${STAND}; in Österreich und der Schweiz gelten eigene Regeln (z. B. Einheitswert bzw. kantonales Steuerrecht). Die Rechtslage – insbesondere zur Erbschaftsteuer – ist in Bewegung. Bitte lassen Sie Ihren Fall vor Vertragsschluss von Ihrer Steuerberatung prüfen.`,
    punkte: STEUERN_GEMEINSAM,
  },
  AT: {
    eyebrow: "Steuern & Hofübergabe",
    marke: "Wichtig für die Hofübergabe",
    fuss: "Österreich, Stand Oktober 2026; Grundlage u. a. Hinweise der Landwirtschaftskammer Kärnten. Bitte lassen Sie Ihren Fall vor Vertragsschluss von Ihrer Steuerberatung oder Ihrer Landwirtschaftskammer prüfen.",
    punkte: STEUERN_AT,
  },
};

// Englisch: Steuer-Abschnitt (gemeinsam = Deutschland, AT = Österreich), gleiche Quellen, nur Texte
const STEUER_TEXTE_EN = {
  gemeinsam: {
    eyebrow: "Tax & inheritance",
    marke: "Important for succession",
    fuss: `Germany, as of ${datumText(STAND, "en")}; Austria and Switzerland have their own rules (e.g. the assessed standard value (Einheitswert) or cantonal tax law). The legal situation – especially regarding inheritance tax – is in flux. Please have your case reviewed by your tax adviser before signing.`,
    punkte: [
      { t: "Income tax", x: "Lease income is taxable – depending on the situation as income from letting and leasing or, for business assets, within the farm business. A withdrawal from business assets may also be an issue." },
      { t: "Property tax", x: "In Germany, solar park land is generally no longer assessed as agricultural and forestry assets (Grundsteuer A) but as real property (Grundsteuer B). Bavaria takes a different approach. The operator often takes over the property tax by contract." },
      { t: "Inheritance & gifts", x: "According to the current view of the tax authorities, leased solar land usually no longer counts as privileged agricultural and forestry assets. Associations are calling for new rules; with agrivoltaics, agricultural use is retained. Planning early pays off." },
      { t: "VAT", x: "Leasing land is generally exempt from VAT, although opting for VAT is possible. Special rules apply to farmers using the flat-rate scheme." },
    ],
  },
  AT: {
    eyebrow: "Tax & farm handover",
    marke: "Important for the farm handover",
    fuss: "Austria, as of October 2026; based among other things on guidance from the Carinthian Chamber of Agriculture. Please have your case reviewed by your tax adviser or your chamber of agriculture before signing.",
    punkte: [
      { t: "Income tax", x: "According to the Ministry of Finance, payment for making the land available generally results in income from letting and leasing – no longer from agriculture and forestry." },
      { t: "Valuation & assessed standard value", x: "The land is then usually withdrawn from agricultural and forestry business assets and classified as real property (Grundvermögen) for valuation purposes. There are exceptions – your tax adviser will check this." },
      { t: "Farm handover", x: "As real property, a handover to relatives incurs real estate transfer tax of 0.5 to 3.5 % of the property value instead of 2 % of the simple assessed standard value (Einheitswert). Planning early pays off." },
      { t: "Land transfer law", x: "Lease agreements for agricultural and forestry land may require approval under the land transfer act (Grundverkehrsgesetz) of your federal state. We clarify whether this applies to your land before the contract is signed." },
    ],
  },
};

/** Sprachmodell: feste Texte des Steuer-Abschnitts. */
const W_STEUERN = {
  de: {
    titel: "Vor der Unterschrift zur Steuerberatung.",
    lead: "Die Pacht ist attraktiv – steuerlich hat die Verpachtung für einen Solarpark aber Folgen, die Sie kennen sollten. Die Punkte unten sind eine Orientierung, keine Steuerberatung.",
  },
  en: {
    titel: "See your tax adviser before you sign.",
    lead: "The lease is attractive – but leasing land for a solar park has tax consequences you should know about. The points below are for guidance only and do not constitute tax advice.",
  },
};

export function Steuern() {
  const land = landDerAnfrage();
  const sprache = spracheDerAnfrage();
  const w = uebersetze(W_STEUERN, sprache);
  const t = inhaltFuerSprache({ de: STEUER_TEXTE, en: STEUER_TEXTE_EN }, land, sprache);
  const STEUERN = t.punkte;
  // Hervorhebung aus der deutschen Fassung (Titel „Erbschaft …“ bzw. Feld hervor)
  const deutsch = (land === "AT" ? STEUERN_AT : STEUERN_GEMEINSAM);
  const hervor = (k, i) => deutsch[i]?.hervor ?? deutsch[i]?.t.startsWith("Erbschaft") ?? false;
  return (
    <Section tone="white" space="lg">
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
        <SectionHeading
          eyebrow={t.eyebrow}
          title={w.titel}
          lead={w.lead}
        />
        <Reveal>
          <p className="inline-flex items-center gap-2 rounded-full bg-sun-50 px-4 py-2 text-[13.5px] font-semibold text-sun-700 ring-1 ring-sun-200">
            <span aria-hidden="true" className="h-2 w-2 rounded-full bg-sun-400" />
            {t.marke}
          </p>
        </Reveal>
      </div>
      <div className="mt-12 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {STEUERN.map((k, i) => (
          <Reveal key={i} delay={i * 70} className={`relative flex flex-col rounded-3xl p-6 ring-1 md:p-7 ${hervor(k, i) ? "bg-sun-50 ring-sun-200" : "bg-sand-50 ring-ink-200/60"}`}>
            <span aria-hidden="true" className={`flex h-11 w-11 items-center justify-center rounded-2xl bg-white shadow-e1 ring-1 ${hervor(k, i) ? "text-sun-600 ring-sun-200" : "text-ov-600 ring-ink-200"}`}>
              <k.icon className="h-5 w-5" />
            </span>
            <h3 className="mt-5 font-display text-[18px] font-bold text-ink-900">{k.t}</h3>
            <p className="mt-2 text-[14.5px] leading-relaxed text-ink-600">{k.x}</p>
          </Reveal>
        ))}
      </div>
      <p className="mt-8 max-w-4xl text-[13.5px] leading-relaxed text-ink-500">
        {t.fuss}
      </p>
    </Section>
  );
}
