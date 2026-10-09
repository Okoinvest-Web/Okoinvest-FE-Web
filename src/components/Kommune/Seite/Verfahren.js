// Bauleitplanung als Zeitstrahl: sechs Schritte, Beschlüsse des Gemeinderats hervorgehoben,
// darunter die Arbeitsteilung (Gemeinde entscheidet · Entwickler trägt Planung und Kosten) und die Ausnahmen.
import Link from "@/components/Land/Link";
import { ClipboardCheck, Eye, FileText, Megaphone, Route, Vote, Zap } from "lucide-react";
import Section from "@/components/ui/Section";
import SectionHeading from "@/components/ui/SectionHeading";
import Reveal from "@/components/ui/Reveal";
import { cn } from "@/components/ui/cn";
import { landDerAnfrage, spracheDerAnfrage } from "@/lib/land/seite";
import { inhaltFuerSprache, uebersetze } from "@/lib/sprache/woerterbuch";

const SCHRITTE = [
  { icon: Vote, title: "Aufstellungsbeschluss", text: "Der Gemeinderat beschließt, einen Bebauungsplan aufzustellen – oft zusammen mit der Änderung des Flächennutzungsplans im Parallelverfahren.", tag: "beschluss" },
  { icon: Megaphone, title: "Frühzeitige Beteiligung", text: "Öffentlichkeit und Behörden werden früh informiert und können sich äußern (§§ 3 Abs. 1, 4 Abs. 1 BauGB).", tag: "beteiligung" },
  { icon: FileText, title: "Entwurf & Umweltbericht", text: "Planzeichnung, Begründung, Umweltbericht, Artenschutz, Blend- und ggf. Bodengutachten, Ausgleichskonzept.", tag: "entwickler" },
  { icon: Eye, title: "Öffentliche Auslegung", text: "Der Entwurf wird veröffentlicht; Stellungnahmen von Bürgern und Trägern öffentlicher Belange gehen ein.", tag: "beteiligung" },
  { icon: ClipboardCheck, title: "Abwägung & Satzung", text: "Der Gemeinderat wägt die Stellungnahmen ab und beschließt den Bebauungsplan als Satzung (§ 10 BauGB).", tag: "beschluss" },
  { icon: Zap, title: "Bekanntmachung & Bau", text: "Mit der Bekanntmachung tritt der Plan in Kraft. Es folgen Baugenehmigung bzw. -anzeige, Netzanschluss und Bau." },
];

// Österreich (Länderinhalt): Widmungsverfahren statt Bauleitplanung. Grundlage: Regionsdateien NÖ und OÖ
// (Abschnitt „ablauf“, Behörden: Gemeinderat, Amt der Landesregierung als Aufsicht, Bezirkshauptmannschaft,
// Elektrizitätsrecht des Landes über 1 MW). Ohne Verfahrensdauer (für AT nicht geprüft).
const SCHRITTE_AT = [
  { icon: Route, title: "Vorprüfung nach Landesregeln", text: "Liegt die Fläche in einer PV-Zone oder Eignungszone, erfüllt sie die Kriterien und Größengrenzen des Bundeslandes? Netz und Umspannwerk prüfen wir mit.", tag: "entwickler" },
  { icon: Vote, title: "Widmungsbeschluss", text: "Der Gemeinderat ändert den Flächenwidmungsplan bzw. das örtliche Raumordnungsprogramm – etwa zu Grünland-Photovoltaik. Bürger und Behörden können sich äußern.", tag: "beschluss" },
  { icon: ClipboardCheck, title: "Aufsicht des Landes", text: "Das Amt der Landesregierung prüft die Widmung als Aufsichtsbehörde – nach den Zonen, Kriterien und Leitfäden des Landes.", tag: "beteiligung" },
  { icon: FileText, title: "Naturschutz", text: "Naturschutzrechtliche Bewilligung, meist bei der Bezirkshauptmannschaft; in Schutzgebieten mit Naturverträglichkeitsprüfung.", tag: "entwickler" },
  { icon: Eye, title: "Elektrizitätsrecht", text: "Größere Anlagen brauchen eine elektrizitätsrechtliche Bewilligung des Landes – in Niederösterreich und Oberösterreich etwa ab 1 MW.", tag: "entwickler" },
  { icon: Zap, title: "Netzanschluss & Bau", text: "Netzzugang beim Verteilernetzbetreiber, danach Bau und Inbetriebnahme." },
];

// Schweiz (Länderinhalt): Baugesuch und Ausnahmebewilligung statt Bauleitplanung. Grundlage: RPG Stand 01.01.2026
// (Art. 24ter, Art. 25 Abs. 2), Merkblatt Kanton Luzern – wie src/data/laender/ch/freiflaeche.js. Ohne Verfahrensdauer.
const SCHRITTE_CH = [
  { icon: Route, title: "Vorprüfung", text: "Bauzone oder nicht, Eignungsgebiet im kantonalen Richtplan, Standortgebundenheit nach Art. 24ter RPG – Netz und Erschliessung prüfen wir mit.", tag: "entwickler" },
  { icon: Vote, title: "Nutzungsplanung", text: "Je nach Kanton und Grösse braucht es zusätzlich eine Nutzungsplanung der Gemeinde.", tag: "beschluss" },
  { icon: FileText, title: "Baugesuch", text: "Das Baugesuch mit Plänen, Berichten und Gutachten wird bei der Gemeinde eingereicht.", tag: "entwickler" },
  { icon: Eye, title: "Öffentliche Auflage", text: "Die Gemeinde legt das Gesuch öffentlich auf; Einsprachen sind möglich.", tag: "beteiligung" },
  { icon: ClipboardCheck, title: "Ausnahmebewilligung", text: "Ausserhalb der Bauzone entscheidet die kantonale Behörde über die Standortgebundenheit (Art. 25 Abs. 2 RPG).", tag: "beteiligung" },
  { icon: Zap, title: "Netzanschluss & Bau", text: "Anschluss beim Verteilnetzbetreiber, danach Bau und Inbetriebnahme." },
];

const TEXTE = {
  gemeinsam: {
    eyebrow: "Bauleitplanung",
    lead: "Für die meisten Solarparks braucht es einen Bebauungsplan. Planungsbüro, Gutachten und Verfahrenskosten übernimmt der Entwickler über einen städtebaulichen Vertrag.",
    entscheidet: "Aufstellungsbeschluss, Abwägung, Satzung",
    schritte: SCHRITTE,
    dauer: "Für das gesamte Verfahren sind realistisch ein bis zwei Jahre anzusetzen.",
    ausnahmen: true,
  },
  AT: {
    eyebrow: "Widmung",
    lead: "In Österreich widmet die Gemeinde die Fläche nach der Raumordnung des Bundeslandes. Unterlagen, Gutachten und Verfahrenskosten übernimmt der Entwickler.",
    entscheidet: "Widmungsbeschluss im Gemeinderat",
    schritte: SCHRITTE_AT,
    dauer: "Wie lange das Verfahren dauert, hängt von Bundesland, Zone und Netz ab – eine Einschätzung für Ihre Gemeinde geben wir im Gespräch.",
    ausnahmen: false,
  },
  CH: {
    eyebrow: "Bewilligung",
    lead: "In der Schweiz wird das Baugesuch bei der Gemeinde eingereicht; ausserhalb der Bauzone erteilt der Kanton die Ausnahmebewilligung. Unterlagen, Gutachten und Verfahrenskosten übernimmt der Entwickler.",
    entscheidet: "Baugesuch, Auflage, je nach Kanton Nutzungsplanung",
    schritte: SCHRITTE_CH,
    dauer: "Wie lange das Verfahren dauert, hängt von Kanton, Zone und Netz ab – eine Einschätzung für Ihre Gemeinde geben wir im Gespräch.",
    ausnahmen: false,
  },
};

// Englisch (Sprachmodell): gleiche Schritte je Index, deutsche Rechtsbegriffe erklärt
const TEXTE_EN = {
  gemeinsam: {
    eyebrow: "Zoning",
    lead: "Most solar parks need a development plan (Bebauungsplan). The developer covers the planning office, expert reports and procedural costs via an urban development contract.",
    entscheidet: "Resolution to draw up a plan, weighing of interests, adoption",
    schritte: [
      { title: "Resolution to draw up a plan", text: "The municipal council resolves to draw up a development plan – often together with an amendment of the land use plan in a parallel procedure." },
      { title: "Early participation", text: "The public and authorities are informed early and can comment (§§ 3 (1), 4 (1) BauGB, German Federal Building Code)." },
      { title: "Draft & environmental report", text: "Plan drawing, statement of reasons, environmental report, species protection, glare and, where applicable, soil assessments, compensation concept." },
      { title: "Public display", text: "The draft is published; comments from citizens and public agencies are received." },
      { title: "Weighing & adoption", text: "The municipal council weighs the comments and adopts the development plan as a by-law (§ 10 BauGB)." },
      { title: "Publication & construction", text: "The plan enters into force upon publication. Building permit or notification, grid connection and construction follow." },
    ],
    dauer: "Realistically, one to two years should be allowed for the entire procedure.",
  },
  AT: {
    eyebrow: "Zoning (Widmung)",
    lead: "In Austria, the municipality zones the land under the spatial planning law of the federal state. The developer covers documents, expert reports and procedural costs.",
    entscheidet: "Zoning resolution in the municipal council",
    schritte: [
      { title: "Preliminary check under state rules", text: "Is the land in a PV zone or suitability zone, and does it meet the criteria and size limits of the federal state? We check the grid and substation at the same time." },
      { title: "Zoning resolution", text: "The municipal council amends the zoning plan (Flächenwidmungsplan) or the local spatial planning programme – for example to ‘Grünland-Photovoltaik’. Citizens and authorities can comment." },
      { title: "State supervision", text: "The office of the state government reviews the zoning as the supervisory authority – in line with the state’s zones, criteria and guidelines." },
      { title: "Nature conservation", text: "Permit under nature conservation law, usually from the district authority (Bezirkshauptmannschaft); in protected areas with a nature compatibility assessment." },
      { title: "Electricity law", text: "Larger installations need a permit under the state’s electricity law – in Lower Austria and Upper Austria, for example, from 1 MW." },
      { title: "Grid connection & construction", text: "Grid access with the distribution system operator, followed by construction and commissioning." },
    ],
    dauer: "How long the procedure takes depends on the federal state, zone and grid – we will give you an assessment for your municipality in a conversation.",
  },
  CH: {
    eyebrow: "Permit",
    lead: "In Switzerland, the building application is submitted to the municipality; outside the building zone, the canton grants the exemption permit. The developer covers documents, expert reports and procedural costs.",
    entscheidet: "Building application, public display, land use planning depending on the canton",
    schritte: [
      { title: "Preliminary check", text: "Building zone or not, suitability area in the cantonal structure plan, site-bound status under Art. 24ter RPG (Swiss Spatial Planning Act) – we check the grid and access at the same time." },
      { title: "Land use planning", text: "Depending on the canton and size, the municipality may also need to adopt a land use plan." },
      { title: "Building application", text: "The building application with plans, reports and expert opinions is submitted to the municipality." },
      { title: "Public display", text: "The municipality puts the application on public display; objections are possible." },
      { title: "Exemption permit", text: "Outside the building zone, the cantonal authority decides on site-bound status (Art. 25 (2) RPG)." },
      { title: "Grid connection & construction", text: "Connection with the distribution system operator, followed by construction and commissioning." },
    ],
    dauer: "How long the procedure takes depends on the canton, zone and grid – we will give you an assessment for your municipality in a conversation.",
  },
};

/** Feste Texte des Abschnitts. */
const W = {
  de: {
    titel: "Die Gemeinde hat die Planungshoheit – wir tragen die Arbeit.",
    entscheidetTitel: "Die Gemeinde entscheidet",
    arbeitTitel: "Der Entwickler trägt die Arbeit",
    arbeitText: "Planungsbüro, Gutachten, Verfahrenskosten",
    schritt: "Schritt ",
    tags: { beschluss: "Beschluss Gemeinderat", beteiligung: "Beteiligung", entwickler: "Arbeit des Entwicklers" },
    ausnahmenTitel: "Ausnahmen ohne Bebauungsplan",
    ausnahmenText: "Entlang von Autobahnen und zweigleisigen Schienenwegen sind Freiflächenanlagen in einem 200-Meter-Streifen nach § 35 Abs. 1 Nr. 8 b BauGB privilegiert, ebenso kleine Agri-PV-Anlagen bis 2,5 ha mit Hofbezug. Die Gemeinde bleibt über ihr Einvernehmen beteiligt. Mehr im",
    ratgeber: "Ratgeber Genehmigung",
  },
  en: {
    titel: "The municipality has planning authority – we do the work.",
    entscheidetTitel: "The municipality decides",
    arbeitTitel: "The developer does the work",
    arbeitText: "Planning office, expert reports, procedural costs",
    schritt: "Step ",
    tags: { beschluss: "Council resolution", beteiligung: "Participation", entwickler: "Developer’s work" },
    ausnahmenTitel: "Exceptions without a development plan",
    ausnahmenText: "Along motorways and double-track railways, ground-mounted installations in a 200-metre strip are privileged under § 35 (1) no. 8 b BauGB, as are small agrivoltaic installations of up to 2.5 ha linked to a farm. The municipality remains involved through its consent. More in the",
    ratgeber: "permitting guide",
  },
};

const TAGS = {
  beschluss: { label: "Beschluss Gemeinderat", klasse: "bg-navy-700 text-white" },
  beteiligung: { label: "Beteiligung", klasse: "bg-white text-ink-700 ring-1 ring-inset ring-ink-200" },
  entwickler: { label: "Arbeit des Entwicklers", klasse: "bg-ov-100 text-ov-800" },
};

export default function Verfahren() {
  const sprache = spracheDerAnfrage();
  const w = uebersetze(W, sprache);
  const t = inhaltFuerSprache({ de: TEXTE, en: TEXTE_EN }, landDerAnfrage(), sprache);
  return (
    <Section tone="sand" space="lg" id="verfahren" className="scroll-mt-24">
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)] lg:items-end lg:gap-16">
        <SectionHeading eyebrow={t.eyebrow} title={w.titel} />
        <Reveal>
          <p className="ov-lead text-ink-600 lg:pb-1">
            {t.lead}
          </p>
        </Reveal>
      </div>

      {/* Arbeitsteilung */}
      <Reveal className="mt-12 grid gap-3 sm:grid-cols-2 md:mt-14">
        <div className="flex items-center gap-4 rounded-2xl bg-navy-950 p-5 text-white">
          <span aria-hidden="true" className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/10 text-ov-300 ring-1 ring-inset ring-white/15"><Vote className="h-5 w-5" /></span>
          <p className="text-[15px] leading-snug"><span className="block font-display text-[17px] font-bold">{w.entscheidetTitel}</span><span className="text-white/70">{t.entscheidet}</span></p>
        </div>
        <div className="flex items-center gap-4 rounded-2xl bg-white p-5 ring-1 ring-ink-200/70">
          <span aria-hidden="true" className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-ov-50 text-ov-700 ring-1 ring-ov-100"><FileText className="h-5 w-5" /></span>
          <p className="text-[15px] leading-snug"><span className="block font-display text-[17px] font-bold text-ink-900">{w.arbeitTitel}</span><span className="text-ink-600">{w.arbeitText}</span></p>
        </div>
      </Reveal>

      {/* Zeitstrahl */}
      <ol className="relative mt-12 grid gap-0 md:mt-16 lg:grid-cols-6 lg:gap-5">
        <span aria-hidden="true" className="absolute bottom-6 left-[23px] top-6 w-px bg-gradient-to-b from-ov-400 via-ov-300 to-ink-200 lg:bottom-auto lg:left-6 lg:right-6 lg:top-[23px] lg:h-px lg:w-auto lg:bg-gradient-to-r" />
        {t.schritte.map((s, i) => {
          const tag = s.tag && TAGS[s.tag];
          const beschluss = s.tag === "beschluss";
          return (
            <Reveal as="li" key={i} delay={i * 70} className="relative flex gap-5 pb-9 last:pb-0 lg:flex-col lg:gap-0 lg:pb-0">
              <span
                aria-hidden="true"
                className={cn(
                  "relative z-10 flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ring-1",
                  beschluss ? "bg-navy-700 text-white ring-navy-700 shadow-[0_10px_24px_-10px_rgba(0,52,115,0.7)]" : "bg-white text-ov-700 ring-ink-200"
                )}
              >
                <s.icon className="h-5 w-5" />
              </span>
              <div className="min-w-0 lg:mt-6">
                <p className="ov-num text-[12.5px] font-semibold text-ink-400">
                  <span className="sr-only">{w.schritt}</span>0{i + 1}
                </p>
                <p className="mt-1 font-display text-[17px] font-bold leading-snug tracking-[-0.01em] text-ink-900 lg:min-h-[2.75em]">{s.title}</p>
                {tag && <span className={cn("mt-2 inline-flex rounded-full px-2.5 py-0.5 text-[11.5px] font-semibold", tag.klasse)}>{w.tags[s.tag]}</span>}
                <p className="mt-2.5 text-[14.5px] leading-relaxed text-ink-600 lg:text-[14px]">{s.text}</p>
              </div>
            </Reveal>
          );
        })}
      </ol>
      <p className="mt-8 text-[13px] text-ink-500 lg:mt-10">{t.dauer}</p>

      {/* Ausnahmen (nur Deutschland, BauGB) */}
      {t.ausnahmen && (
      <Reveal className="mt-10 flex flex-col gap-5 rounded-[1.75rem] bg-white p-6 ring-1 ring-ink-200/70 sm:flex-row sm:items-start md:p-8">
        <span aria-hidden="true" className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-sun-50 text-sun-700 ring-1 ring-sun-200">
          <Route className="h-5 w-5" />
        </span>
        <div className="min-w-0">
          <p className="font-display text-[18px] font-bold text-ink-900">{w.ausnahmenTitel}</p>
          <p className="mt-2 max-w-3xl text-[15px] leading-relaxed text-ink-600">
            {w.ausnahmenText}{" "}
            <Link href="/ratgeber/solarpark-genehmigung-bebauungsplan" className="rounded font-semibold text-ov-700 underline decoration-ov-300 underline-offset-2 hover:decoration-ov-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ov-500">
              {w.ratgeber}
            </Link>
            .
          </p>
        </div>
      </Reveal>
      )}
    </Section>
  );
}
