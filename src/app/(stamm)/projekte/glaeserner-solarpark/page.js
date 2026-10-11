// src/app/(stamm)/projekte/glaeserner-solarpark/page.js – Gläserner Solarpark (Welle 4, Paket GLAESERN)
//
// Vorzeige-Projektseite als wiederverwendbare Vorlage: EIN Datenobjekt je Park
// (src/lib/projekte/glaesernerPark.js). Erste Instanz = Beispielpark, demo: true –
// deshalb überall das Entwurfs-Badge „Beispieldaten – echte Parkdaten folgen“ und
// die Live-Ansicht als gekennzeichnetes DEMO-Modell (keine echten Messdaten).
// Pachtmodell und Gemeinde-Beteiligung: gekennzeichnete Beispielrechnungen mit
// DE-Werten aus dem Faktenregister; auf /at und /ch ersetzt sie der Länderhinweis.
// Maßnahmenliste neutral (was gemacht wird), ohne Umwelt-Werbeaussagen (EmpCo/§ 5 UWG).
// noindex bis zur Fachprüfung (E6): src/lib/land/seiten.js index: false, englisch
// src/lib/sprache/seiten.js UEBERSETZT mit index: false.
//
// Sprachmodell: feste Texte im Wörterbuch TEXTE, Zahlen über fmt/fmtZahl je Sprache.

import { BookOpen, Calculator, CalendarDays, ClipboardList, Eye, FileSearch, Handshake, Landmark, LandPlot, MapPin, MessageCircle, Phone, Ruler, ShieldCheck, Sun, Users, Zap } from "lucide-react";

import SeitenHero from "@/components/Energie/Seite/SeitenHero";
import Faktenleiste from "@/components/Energie/Seite/Faktenleiste";
import Kopf from "@/components/Energie/Seite/Kopf";
import AnfrageBuehne from "@/components/Energie/Seite/AnfrageBuehne";
import Weiterlesen from "@/components/Energie/Seite/Weiterlesen";
import AuswahlAnfrage from "@/components/Carport/AuswahlAnfrage";
import ParkLiveDemo from "@/components/Projekte/ParkLiveDemo";
import Section from "@/components/ui/Section";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import Faq from "@/components/ui/Faq";
import Reveal from "@/components/ui/Reveal";
import { abs } from "@/data/site";
import { DEMO_PARK } from "@/lib/projekte/glaesernerPark";
import { fmt } from "@/lib/rechner/annahmen";
import { pfad } from "@/lib/land";
import { seitenLand, seitenMetadata, spracheDerAnfrage } from "@/lib/land/seite";
import { NurDEBlock, faqFuerLand } from "@/components/Land/Laenderteile";
import { uebersetze } from "@/lib/sprache/woerterbuch";
import { fmtZahl } from "@/lib/sprache/format";

const PARK = DEMO_PARK;
const PFAD = pfad("/projekte/glaeserner-solarpark");
const TITEL = "Gläserner Solarpark: ein Park, alle Daten offen | ÖkoInvest";
const BESCHREIBUNG =
  "Der gläserne Solarpark macht ein Projekt durchschaubar: Erzeugung im Tagesverlauf, Bautagebuch von der Pacht bis zum Betrieb, Pachtmodell und Gemeinde-Beteiligung am Beispiel, Maßnahmen auf der Fläche und die Fragen der Anwohner – derzeit mit gekennzeichneten Beispieldaten.";

const metadata = {
  title: TITEL,
  description: BESCHREIBUNG,
  keywords: ["gläserner Solarpark", "Solarpark transparent", "Solarpark Bautagebuch", "Solarpark Pachtmodell Beispiel", "Solarpark Gemeinde Beteiligung", "Solarpark Anwohner Fragen"],
  alternates: { canonical: abs(PFAD) },
  openGraph: { type: "website", url: abs(PFAD), siteName: "ÖkoInvest", title: TITEL, description: BESCHREIBUNG, images: [{ url: abs("/img/solarpark-himmel.jpg"), width: 1280, height: 853, alt: "Freiflächen-Solarpark unter freiem Himmel" }] },
};
// Fachprüfung offen (Register index: false) und Beispieldaten: auch die gemeinsame Seite trägt noindex
metadata.robots = { index: false, follow: true };

const TITEL_EN = "The open-book solar park: one park, all data visible | ÖkoInvest";
const BESCHREIBUNG_EN =
  "The open-book solar park makes a project transparent: generation over the day, a construction diary from lease to operation, the lease model and municipal participation as worked examples, measures on the land and the questions residents ask – currently with clearly marked example data.";

const metadataEn = {
  title: TITEL_EN,
  description: BESCHREIBUNG_EN,
  keywords: ["open-book solar park", "transparent solar park", "solar park construction diary", "solar park lease model example", "solar park municipal participation", "solar park residents questions"],
  openGraph: { title: TITEL_EN, description: BESCHREIBUNG_EN, images: [{ alt: "Ground-mounted solar park under an open sky" }] },
};

const K = PARK.kennzahlen;
const MONAT = { de: ["Januar", "Februar", "März", "April", "Mai", "Juni", "Juli", "August", "September", "Oktober", "November", "Dezember"], en: ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"] };
const monat = (iso, sprache) => {
  const [j, m] = iso.split("-").map(Number);
  return `${MONAT[sprache][m - 1]} ${j}`;
};

/** Feste Texte der Seite (en nur Texte; Zahlen rechnet die Seite je Sprache). */
const TEXTE = {
  de: {
    badge: "Beispieldaten – echte Parkdaten folgen",
    hero: {
      brotkrumen: "Gläserner Solarpark",
      pill: { marke: "Entwurf", text: "Beispieldaten – echte Parkdaten folgen", kurz: "Beispieldaten" },
      titelA: "Ein Solarpark, ",
      titelB: "nichts zu verbergen.",
      lead: " Erzeugung, Bautagebuch, Pachtmodell, Maßnahmen auf der Fläche und die Zahlungen an die Gemeinde – alles auf einer Seite. Bis echte Parkdaten freigegeben sind, zeigt die Seite einen gekennzeichneten Beispielpark.",
      leadStark: "So offen legen wir ein Projekt auf den Tisch:",
      primaer: "Zum Bautagebuch",
      sekundaer: "Pachtmodell ansehen",
      hinweis: "Vorlage für echte Parks der Gruppe · derzeit Beispielpark mit Demo-Daten",
      chips: ["Erzeugung im Tagesverlauf", "Bautagebuch Schritt für Schritt", "Pachtmodell am Beispiel", "FAQ der Anwohner"],
      bildunterschrift: "Demo-Ansicht des Beispielparks · keine echten Messdaten",
    },
    fakten: {
      titel: "Der Beispielpark in Zahlen",
      liste: [
        { einheit: "kWp Beispielpark", text: "installierte Leistung (Beispielwert)" },
        { einheit: "MWh pro Jahr", text: "rechnerische Erzeugung (Beispielwert)" },
        { einheit: "Hektar", text: "Fläche des Beispielparks (Beispielwert)" },
        { einheit: "Inbetriebnahme", text: "Beispielpark im Regelbetrieb (fiktiv)" },
      ],
      fussnote: `Beispielwerte, kein echter Park: Erzeugung aus ${K.quellen.ertrag.de}; Fläche aus ${K.quellen.flaeche.de}.`,
    },
    prinzip: {
      eyebrow: "Das Prinzip",
      titel: "Warum wir einen Park gläsern machen",
      lead: "Eigentümer, Gemeinden und Anwohner sollen vor einer Entscheidung sehen können, wie ein Park wirklich läuft – nicht nur Prospektseiten. Diese Seite ist die Vorlage dafür; je Park wird sie mit dessen Daten gefüllt.",
      karten: [
        { titel: "Erzeugung offen", tag: "Tagesverlauf", text: "Was der Park leistet, zeigt die Seite im Tagesverlauf – derzeit als gekennzeichnetes Demo-Modell, später mit Messdaten des Parks." },
        { titel: "Bautagebuch", tag: "Vom Vertrag bis zum Betrieb", text: "Jeder Schritt mit Datum: Pachtvertrag, Gemeinderat, Bebauungsplan, Netzanschluss, Bau, Inbetriebnahme, Betrieb." },
        { titel: "Zahlen am Beispiel", tag: "Pacht & Gemeinde", text: "Pachtmodell und Zahlungen an die Gemeinde als nachvollziehbare Beispielrechnung mit genannten Quellen." },
        { titel: "Ansprechbar", tag: "Fragen & Besichtigung", text: "Die häufigsten Fragen der Anwohner stehen beantwortet auf der Seite; für alles Weitere gibt es einen direkten Draht." },
      ],
    },
    tagebuch: {
      eyebrow: "Bautagebuch",
      titel: "Vom Pachtvertrag bis zum Regelbetrieb",
      lead: "Chronologie des Beispielparks – bei echten Parks wird jeder Eintrag mit Fotos und Unterlagen fortgeschrieben.",
      status: { fertig: "Erledigt", laufend: "Laufend", geplant: "Geplant" },
    },
    pacht: {
      eyebrow: "Pachtmodell",
      titel: "Was Eigentümer am Beispiel verdienen",
      lead: "Eine nachvollziehbare Beispielrechnung – kein Angebot. Jede Fläche wird einzeln bewertet; die Spannen stammen aus unserem Faktenregister für Deutschland.",
      thema: "Pachtwerte",
      karten: [
        { titel: "Pacht je Hektar und Jahr", text: "übliche Spanne Freiflächen-PV in Deutschland (Mittelwert fett)" },
        { titel: "Beispielrechnung Park", text: (ha) => `bei ${ha} Hektar und mittlerer Pacht – Beispielwert, kein Angebot` },
        { titel: "Laufzeit", text: "übliche Vertragslaufzeit, mit Verlängerungsoptionen" },
        { titel: "Anpassung", text: "jährliche Indexierung der Pacht (vereinfacht am Verbraucherpreisindex)" },
      ],
      hinweis: "Beispielrechnung mit Spannen aus dem Faktenregister (pacht.*). Was Ihre Fläche tragen kann, zeigt der Pachtrechner – oder Sie lassen ein konkretes Angebot prüfen.",
      rechner: "Zum Pachtrechner",
      verpachten: "Fläche verpachten",
    },
    massnahmen: {
      eyebrow: "Fläche & Umgebung",
      titel: "Maßnahmen auf der Fläche",
      lead: "Was auf der Fläche des Beispielparks gemacht wird – als sachliche Liste aus Genehmigung und Pflegeplan, ohne Werbeaussagen. Welche Wirkung die Maßnahmen haben, bewertet das begleitende Fachbüro im Monitoring.",
    },
    gemeinde: {
      eyebrow: "Gemeinde",
      titel: "Was die Standortgemeinde erhält",
      lead: "Auch das gehört zum gläsernen Park: die Zahlungen an die Gemeinde, offen vorgerechnet.",
      thema: "Gemeinde-Beteiligung",
      eeg: { titel: "Beteiligung nach § 6 EEG", text: (ct) => `bis zu ${ct} ct je erzeugter Kilowattstunde kann der Betreiber der Gemeinde zahlen – beim Beispielpark ergäbe das:` },
      proJahr: "pro Jahr (Beispielrechnung)",
      dazu: "Dazu kommt Gewerbesteuer am Standort sowie – je nach Projekt – Aufträge für Betriebe aus der Region. Für Gemeinden haben wir Ratsvorlage und Prüffragen vorbereitet.",
      link: "Infos für Kommunen",
    },
    faqKopf: {
      eyebrow: "FAQ",
      titel: "Was Anwohner am häufigsten fragen",
      lead: "Die Fragen aus Gemeinderatssitzungen und Auslegungen – sachlich beantwortet am Beispielpark.",
      button: "Eigene Frage stellen",
    },
    anfrage: {
      titelA: "Sie wollen so ein Projekt ",
      titelB: "aus der Nähe sehen?",
      lead: "Ob als Eigentümer einer Fläche, als Gemeinde oder als Anwohner mit einer Frage: Schreiben Sie uns – wir antworten persönlich und ohne Verkaufsdruck.",
      zusagen: ["Antwort von einer zuständigen Person", "Keine Weitergabe Ihrer Daten", "Besichtigung nach Absprache möglich"],
      ablauf: [
        { titel: "Anliegen schildern", text: "Kurz schreiben, worum es geht – zwei Sätze genügen." },
        { titel: "Wir ordnen ein", text: "Die passende Fachperson meldet sich mit einer ehrlichen Einschätzung." },
        { titel: "Nächster Schritt", text: "Unterlagen, Gespräch oder Besichtigung – Sie entscheiden das Tempo." },
      ],
      formText: "Pflicht sind nur Name und E-Mail. Telefon nur, wenn Sie einen Rückruf möchten.",
      button: "Nachricht senden",
      gruppen: [
        { id: "anliegen", legende: "Ich bin …", optionen: [{ id: "eigentuemer", label: "Eigentümer einer Fläche" }, { id: "gemeinde", label: "Gemeinde / Verwaltung" }, { id: "anwohner", label: "Anwohner" }, { id: "sonstiges", label: "Sonstiges" }] },
      ],
    },
    weiter: {
      text: "Mehr zum Weg von der Fläche zum Park – und zu den Zahlen dahinter.",
      items: [
        { titel: "Fläche verpachten", text: "Was Ihre Fläche können muss und wie der Weg zum Vertrag aussieht." },
        { titel: "Pachtrechner", text: "Spanne für Ihre Fläche rechnen – mit offenen Annahmen." },
        { titel: "Infos für Kommunen", text: "Ratsvorlage, Prüffragen und der Ablauf aus Sicht der Gemeinde." },
        { titel: "Projektprozess", text: "Alle Schritte von der Sicherung bis zum Betrieb im Überblick." },
      ],
    },
  },
  en: {
    badge: "Example data – real park data to follow",
    hero: {
      brotkrumen: "Open-book solar park",
      pill: { marke: "Draft", text: "Example data – real park data to follow", kurz: "Example data" },
      titelA: "One solar park, ",
      titelB: "nothing to hide.",
      lead: " Generation, construction diary, lease model, measures on the land and the payments to the municipality – all on one page. Until real park data is cleared for publication, the page shows a clearly marked example park.",
      leadStark: "This is how openly we put a project on the table:",
      primaer: "To the construction diary",
      sekundaer: "View the lease model",
      hinweis: "Template for real parks of the group · currently an example park with demo data",
      chips: ["Generation over the day", "Construction diary step by step", "Lease model as a worked example", "Residents' FAQ"],
      bildunterschrift: "Demo view of the example park · no real measurement data",
    },
    fakten: {
      titel: "The example park in figures",
      liste: [
        { einheit: "kWp example park", text: "installed capacity (example value)" },
        { einheit: "MWh per year", text: "calculated generation (example value)" },
        { einheit: "hectares", text: "area of the example park (example value)" },
        { einheit: "commissioning", text: "example park in regular operation (fictitious)" },
      ],
      fussnote: `Example values, not a real park: generation from ${K.quellen.ertrag.en}; area from ${K.quellen.flaeche.en}.`,
    },
    prinzip: {
      eyebrow: "The principle",
      titel: "Why we make a park an open book",
      lead: "Owners, municipalities and residents should be able to see how a park really runs before they decide – not just brochure pages. This page is the template; for each park it is filled with that park's data.",
      karten: [
        { titel: "Generation visible", tag: "Daily curve", text: "The page shows what the park delivers over the day – currently as a clearly marked demo model, later with the park's measurement data." },
        { titel: "Construction diary", tag: "From contract to operation", text: "Every step with its date: lease, municipal council, development plan, grid connection, construction, commissioning, operation." },
        { titel: "Figures as examples", tag: "Lease & municipality", text: "Lease model and payments to the municipality as traceable example calculations with named sources." },
        { titel: "Approachable", tag: "Questions & visits", text: "The questions residents ask most are answered on the page; for everything else there is a direct line." },
      ],
    },
    tagebuch: {
      eyebrow: "Construction diary",
      titel: "From lease agreement to regular operation",
      lead: "Chronology of the example park – for real parks, each entry is kept up to date with photos and documents.",
      status: { fertig: "Done", laufend: "Ongoing", geplant: "Planned" },
    },
    pacht: {
      eyebrow: "Lease model",
      titel: "What owners earn in this example",
      lead: "A traceable example calculation – not an offer. Every site is assessed individually; the ranges come from our facts register for Germany.",
      thema: "Lease rates",
      karten: [
        { titel: "Lease per hectare and year", text: "usual range for ground-mounted PV in Germany (median in bold)" },
        { titel: "Example calculation for the park", text: (ha) => `at ${ha} hectares and the mid-range lease – example value, not an offer` },
        { titel: "Term", text: "usual contract term, with extension options" },
        { titel: "Adjustment", text: "annual indexation of the lease (simplified, consumer price index)" },
      ],
      hinweis: "Example calculation with ranges from the facts register (pacht.*). The lease calculator shows what your site could support – or have a concrete offer reviewed.",
      rechner: "To the lease calculator",
      verpachten: "Lease out land",
    },
    massnahmen: {
      eyebrow: "Land & surroundings",
      titel: "Measures on the land",
      lead: "What is done on the example park's land – as a factual list from the permit and maintenance plan, without advertising claims. The supervising consultancy assesses the effect of the measures in its monitoring.",
    },
    gemeinde: {
      eyebrow: "Municipality",
      titel: "What the host municipality receives",
      lead: "This, too, is part of the open book: the payments to the municipality, calculated in the open.",
      thema: "Municipal participation",
      eeg: { titel: "Participation under § 6 EEG", text: (ct) => `the operator can pay the municipality up to ${ct} ct per kilowatt-hour generated – for the example park that would come to:` },
      proJahr: "per year (example calculation)",
      dazu: "Local trade tax comes on top, and – depending on the project – orders for businesses from the region. For municipalities we have prepared a council motion template and review questions.",
      link: "Information for municipalities",
    },
    faqKopf: {
      eyebrow: "FAQ",
      titel: "What residents ask most often",
      lead: "The questions from council meetings and public consultations – answered factually, using the example park.",
      button: "Ask your own question",
    },
    anfrage: {
      titelA: "Would you like to see a project like this ",
      titelB: "up close?",
      lead: "Whether you own land, represent a municipality or live nearby and have a question: write to us – we answer personally and without sales pressure.",
      zusagen: ["Answer from the person responsible", "Your data is not passed on", "Visits possible by arrangement"],
      ablauf: [
        { titel: "Describe your matter", text: "Briefly say what it is about – two sentences are enough." },
        { titel: "We assess it", text: "The right specialist gets back to you with an honest assessment." },
        { titel: "Next step", text: "Documents, a call or a visit – you set the pace." },
      ],
      formText: "Only name and e-mail are required. Phone only if you would like a call back.",
      button: "Send message",
      gruppen: [
        { id: "anliegen", legende: "I am …", optionen: [{ id: "eigentuemer", label: "Owner of a site" }, { id: "gemeinde", label: "Municipality / administration" }, { id: "anwohner", label: "Resident" }, { id: "sonstiges", label: "Other" }] },
      ],
    },
    weiter: {
      text: "More on the path from land to park – and the figures behind it.",
      items: [
        { titel: "Lease out land", text: "What your site needs and what the path to a contract looks like." },
        { titel: "Lease calculator", text: "Calculate the range for your site – with open assumptions." },
        { titel: "Information for municipalities", text: "Council motion template, review questions and the process from the municipality's point of view." },
        { titel: "Project process", text: "All steps from securing the site to operation at a glance." },
      ],
    },
  },
};

const STATUS_TON = { fertig: "success", laufend: "info", geplant: "neutral" };

export default async function GlaesernerSolarparkSeite({ params }) {
  const land = await seitenLand(params);
  const sprache = spracheDerAnfrage();
  const en = sprache === "en";
  const w = uebersetze(TEXTE, sprache);
  const f = en ? (n, s = 0) => fmtZahl(n, s, "en") : fmt;
  const t = (x) => (en ? x.en : x.de);

  const faq = faqFuerLand(
    PARK.faq.map((e) => ({ q: t(e.q), a: t(e.a) })),
    land,
    { sprache }
  );

  return (
    <div>
      <SeitenHero
        breadcrumbs={[{ name: w.hero.brotkrumen }]}
        pill={{ ...w.hero.pill, href: "#bautagebuch" }}
        titel={
          <>
            {w.hero.titelA}<span className="ov-text-gradient-light">{w.hero.titelB}</span>
          </>
        }
        lead={
          <>
            <span className="font-medium text-white">{w.hero.leadStark}</span>
            {w.hero.lead}
          </>
        }
        primaer={{ label: w.hero.primaer, href: "#bautagebuch" }}
        sekundaer={{ label: w.hero.sekundaer, href: "#pacht", icon: Calculator }}
        hinweis={w.hero.hinweis}
        chips={w.hero.chips}
        buehne={<ParkLiveDemo park={PARK} dunkel />}
        bildunterschrift={w.hero.bildunterschrift}
      />

      <Faktenleiste
        titel={w.fakten.titel}
        items={[
          { icon: Zap, wert: f(K.kwp), zahl: { wert: K.kwp }, ...w.fakten.liste[0] },
          { icon: Sun, wert: `≈ ${f(K.ertragMwhJahr)}`, zahl: { wert: K.ertragMwhJahr, vor: "≈ " }, ...w.fakten.liste[1] },
          { icon: Ruler, wert: f(K.flaecheHa, 1), zahl: { wert: K.flaecheHa, nachkomma: 1 }, ...w.fakten.liste[2] },
          { icon: CalendarDays, wert: monat(K.inbetriebnahme, sprache), ...w.fakten.liste[3] },
        ]}
        fussnote={w.fakten.fussnote}
      />

      {/* ---------------- Prinzip ---------------- */}
      <Section tone="white" space="lg" data-abschnitt="prinzip" aria-labelledby="prinzip-titel">
        <Kopf id="prinzip-titel" eyebrow={w.prinzip.eyebrow} titel={w.prinzip.titel} lead={w.prinzip.lead} className="mb-12 md:mb-14" />
        <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {[Eye, ClipboardList, Calculator, MessageCircle].map((Icon, i) => {
            const k = w.prinzip.karten[i];
            return (
              <Reveal as="li" key={k.titel} delay={i * 70} className="ov-card-hover flex flex-col rounded-[2rem] bg-sand-50 p-6 ring-1 ring-ink-200/70 sm:p-7">
                <div className="flex items-start justify-between gap-3">
                  <span aria-hidden="true" className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-ov-600 shadow-e2 ring-1 ring-ink-200/70">
                    <Icon className="h-5 w-5" />
                  </span>
                  <span className="rounded-full bg-white px-2.5 py-1 text-[11.5px] font-semibold text-ink-600 ring-1 ring-ink-200/70">{k.tag}</span>
                </div>
                <h3 className="mt-5 font-display text-[19px] font-bold text-ink-900">{k.titel}</h3>
                <p className="mt-2 text-[14.5px] leading-relaxed text-ink-600">{k.text}</p>
              </Reveal>
            );
          })}
        </ul>
      </Section>

      {/* ---------------- Bautagebuch ---------------- */}
      <Section tone="sand" space="lg" id="bautagebuch" data-abschnitt="bautagebuch" aria-labelledby="bautagebuch-titel" className="scroll-mt-24">
        <div className="mb-10 flex flex-wrap items-end justify-between gap-4 md:mb-12">
          <Kopf id="bautagebuch-titel" eyebrow={w.tagebuch.eyebrow} titel={w.tagebuch.titel} lead={w.tagebuch.lead} className="max-w-2xl" />
          <Badge ton="warn">{w.badge}</Badge>
        </div>
        <ol className="relative mx-auto max-w-3xl space-y-0 border-l border-ink-200/80 pl-6 sm:pl-8">
          {PARK.bautagebuch.map((e, i) => (
            <Reveal as="li" key={e.datum + t(e.titel)} delay={Math.min(i, 6) * 60} className="relative pb-8 last:pb-0">
              <span aria-hidden="true" className={`absolute -left-6 top-1.5 h-3 w-3 -translate-x-1/2 rounded-full ring-4 ring-sand-50 sm:-left-8 ${e.status === "fertig" ? "bg-ov-500" : e.status === "laufend" ? "bg-navy-500" : "bg-ink-300"}`} />
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
                <time dateTime={e.datum} className="text-[13px] font-semibold uppercase tracking-[0.08em] text-ink-500">
                  {monat(e.datum, sprache)}
                </time>
                <Badge ton={STATUS_TON[e.status]} groesse="sm" punkt>
                  {w.tagebuch.status[e.status]}
                </Badge>
              </div>
              <h3 className="mt-1.5 font-display text-[18px] font-bold text-ink-900">{t(e.titel)}</h3>
              <p className="mt-1 max-w-xl text-[14.5px] leading-relaxed text-ink-600">{t(e.text)}</p>
            </Reveal>
          ))}
        </ol>
      </Section>

      {/* ---------------- Pachtmodell ---------------- */}
      <Section tone="white" space="lg" id="pacht" data-abschnitt="pacht" aria-labelledby="pacht-titel" className="scroll-mt-24">
        <div className="mb-10 flex flex-wrap items-end justify-between gap-4 md:mb-12">
          <Kopf id="pacht-titel" eyebrow={w.pacht.eyebrow} titel={w.pacht.titel} lead={w.pacht.lead} className="max-w-2xl" />
          <Badge ton="warn">{w.badge}</Badge>
        </div>
        <NurDEBlock land={land} thema={w.pacht.thema} themaEn="Lease rates">
          <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { icon: LandPlot, wert: <>{f(PARK.pacht.proHa.min)}–<strong>{f(PARK.pacht.proHa.mittel)}</strong>–{f(PARK.pacht.proHa.max)} €</>, ...w.pacht.karten[0], text: w.pacht.karten[0].text },
              { icon: Handshake, wert: <>≈ {f(PARK.pacht.jahrMittel)} €</>, ...w.pacht.karten[1], text: w.pacht.karten[1].text(f(PARK.pacht.flaecheHa, 1)) },
              { icon: CalendarDays, wert: <>{f(PARK.pacht.laufzeitJahre)} {en ? "years" : "Jahre"}</>, ...w.pacht.karten[2], text: w.pacht.karten[2].text },
              { icon: FileSearch, wert: <>{f(PARK.pacht.indexierung * 100, 1)} % {en ? "p.a." : "p. a."}</>, ...w.pacht.karten[3], text: w.pacht.karten[3].text },
            ].map((k, i) => (
              <Reveal as="li" key={k.titel} delay={i * 70} className="flex flex-col rounded-[2rem] bg-sand-50 p-6 ring-1 ring-ink-200/70 sm:p-7">
                <span aria-hidden="true" className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-ov-600 shadow-e2 ring-1 ring-ink-200/70">
                  <k.icon className="h-5 w-5" />
                </span>
                <p className="mt-5 font-display text-[22px] font-bold tabular-nums text-ink-900">{k.wert}</p>
                <h3 className="mt-1 text-[14px] font-semibold text-ink-800">{k.titel}</h3>
                <p className="mt-1.5 text-[13.5px] leading-relaxed text-ink-600">{k.text}</p>
              </Reveal>
            ))}
          </ul>
          <p className="mt-6 max-w-3xl text-[14px] leading-relaxed text-ink-500">{w.pacht.hinweis}</p>
        </NurDEBlock>
        <div className="mt-8 flex flex-wrap gap-3">
          <Button href={pfad("/rechner/pacht")} variant="secondary" pfeil>
            {w.pacht.rechner}
          </Button>
          <Button href={pfad("/flaeche-verpachten")} variant="ghost" pfeil>
            {w.pacht.verpachten}
          </Button>
        </div>
      </Section>

      {/* ---------------- Maßnahmen ---------------- */}
      <Section tone="sand" space="lg" data-abschnitt="massnahmen" aria-labelledby="massnahmen-titel">
        <Kopf id="massnahmen-titel" eyebrow={w.massnahmen.eyebrow} titel={w.massnahmen.titel} lead={w.massnahmen.lead} className="mb-10 md:mb-12" />
        <ul className="grid max-w-5xl gap-x-10 gap-y-4 sm:grid-cols-2">
          {PARK.massnahmen.map((m, i) => (
            <Reveal as="li" key={t(m)} delay={Math.min(i, 5) * 50} className="flex items-start gap-3 rounded-2xl bg-white p-4 ring-1 ring-ink-200/70">
              <span aria-hidden="true" className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-ov-50 text-ov-700 ring-1 ring-ov-200">
                <ShieldCheck className="h-4 w-4" />
              </span>
              <p className="text-[14.5px] leading-relaxed text-ink-700">{t(m)}</p>
            </Reveal>
          ))}
        </ul>
      </Section>

      {/* ---------------- Gemeinde ---------------- */}
      <Section tone="white" space="lg" data-abschnitt="gemeinde" aria-labelledby="gemeinde-titel">
        <div className="grid gap-12 lg:grid-cols-[0.9fr_1.1fr] lg:gap-20">
          <Kopf id="gemeinde-titel" eyebrow={w.gemeinde.eyebrow} titel={w.gemeinde.titel} lead={w.gemeinde.lead} />
          <NurDEBlock land={land} thema={w.gemeinde.thema} themaEn="Municipal participation">
            <Reveal className="rounded-[2rem] bg-sand-50 p-6 ring-1 ring-ink-200/70 sm:p-8">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="flex items-center gap-2 font-display text-[18px] font-bold text-ink-900">
                  <Landmark aria-hidden="true" className="h-5 w-5 text-ov-600" /> {w.gemeinde.eeg.titel}
                </p>
                <Badge ton="warn" groesse="sm">{w.badge}</Badge>
              </div>
              <p className="mt-3 text-[14.5px] leading-relaxed text-ink-600">{w.gemeinde.eeg.text(f(PARK.gemeinde.eeg6CtProKwh, 1))}</p>
              <p className="mt-4 font-display text-[34px] font-bold tabular-nums text-ink-900">
                ≈ {f(PARK.gemeinde.zahlungJahr)} €<span className="ml-2 align-middle text-[14px] font-semibold text-ink-500">{w.gemeinde.proJahr}</span>
              </p>
              <p className="mt-4 text-[14px] leading-relaxed text-ink-600">{w.gemeinde.dazu}</p>
              <Button href={pfad("/kommunen")} variant="secondary" pfeil className="mt-6">
                {w.gemeinde.link}
              </Button>
            </Reveal>
          </NurDEBlock>
        </div>
      </Section>

      {/* ---------------- FAQ der Anwohner ---------------- */}
      <Section tone="sand" space="lg" data-abschnitt="faq" aria-labelledby="faq-titel">
        <div className="grid gap-12 lg:grid-cols-[0.8fr_1.2fr] lg:gap-20">
          <div className="lg:sticky lg:top-28 lg:self-start">
            <Kopf id="faq-titel" eyebrow={w.faqKopf.eyebrow} titel={w.faqKopf.titel} lead={w.faqKopf.lead} />
            <Reveal className="mt-8">
              <Button href="#anfrage" variant="secondary" pfeil>
                {w.faqKopf.button}
              </Button>
            </Reveal>
          </div>
          <Faq items={faq} schema={false} />
        </div>
      </Section>

      {/* ---------------- Anfrage (dezent) ---------------- */}
      <AnfrageBuehne
        titel={
          <>
            {w.anfrage.titelA}<span className="ov-text-gradient-light">{w.anfrage.titelB}</span>
          </>
        }
        lead={w.anfrage.lead}
        zusagen={[
          { icon: Users, text: w.anfrage.zusagen[0] },
          { icon: ShieldCheck, text: w.anfrage.zusagen[1] },
          { icon: MapPin, text: w.anfrage.zusagen[2] },
        ]}
        ablauf={[
          { icon: MessageCircle, ...w.anfrage.ablauf[0] },
          { icon: FileSearch, ...w.anfrage.ablauf[1] },
          { icon: Phone, ...w.anfrage.ablauf[2] },
        ]}
        formText={w.anfrage.formText}
      >
        <AuswahlAnfrage typ="kontakt" felder={["ort", "telefon", "nachricht"]} button={w.anfrage.button} gruppen={w.anfrage.gruppen} />
      </AnfrageBuehne>

      <Weiterlesen
        text={w.weiter.text}
        items={[
          { href: pfad("/flaeche-verpachten"), icon: LandPlot, ...w.weiter.items[0] },
          { href: pfad("/rechner/pacht"), icon: Calculator, ...w.weiter.items[1] },
          { href: pfad("/kommunen"), icon: Landmark, ...w.weiter.items[2] },
          { href: pfad("/prozess"), icon: BookOpen, ...w.weiter.items[3] },
        ]}
      />
    </div>
  );
}

export const generateMetadata = seitenMetadata("/projekte/glaeserner-solarpark", metadata, { en: metadataEn });
