// src/app/agri-pv/page.js – Agri-PV fachlich tief

import { Apple, ArrowRight, Beef, ChevronDown, CloudHail, Droplets, Egg, Landmark, Layers, Ruler, Scale, Sprout, Sun, ThermometerSun, Tractor, Wheat } from "lucide-react";

import Button from "@/components/ui/Button";
import Section from "@/components/ui/Section";
import SectionHeading, { Eyebrow } from "@/components/ui/SectionHeading";
import Reveal from "@/components/ui/Reveal";
import Faq from "@/components/ui/Faq";
import CtaBand from "@/components/ui/CtaBand";
import Querverweise from "@/components/Reusable/Querverweise";
import AgriHero from "@/components/Agri/Seite/AgriHero";
import Faktenleiste from "@/components/Agri/Seite/Faktenleiste";
import Sprungleiste from "@/components/Agri/Seite/Sprungleiste";
import NormSektion from "@/components/Agri/Seite/NormSektion";
import SystemWahl from "@/components/Agri/Seite/SystemWahl";
import { Landnutzung, Spannen } from "@/components/Agri/Seite/Diagramme";
import { abs } from "@/data/site";
import { AGRI, BAUART, ERLOESE, FREIFLAECHE, PACHT, STAND } from "@/lib/invest/markt";
import { fmt } from "@/lib/rechner/annahmen";
import JsonLd from "@/components/JsonLd";
import { EAG_CALL_AT } from "@/data/regionen/fristen";
import { pfad } from "@/lib/land";
import { landDerSeite, landMetadata } from "@/lib/land/seite";

const PFAD = pfad("/agri-pv");
const TITEL = "Agri-PV: Systeme, Kulturen, Förderung & Recht | ÖkoInvest";
const BESCHREIBUNG =
  "Agri-PV erklärt: DIN SPEC 91434, vertikale, hoch aufgeständerte und nachgeführte Systeme, Kulturen, GAP, Baurecht, EEG und Kosten. Jetzt Fläche prüfen.";

const metadata = {
  title: TITEL,
  description: BESCHREIBUNG,
  alternates: { canonical: abs(PFAD) },
  openGraph: {
    type: "website",
    locale: "de_DE",
    url: abs(PFAD),
    siteName: "ÖkoInvest",
    title: TITEL,
    description: BESCHREIBUNG,
    images: [{ url: abs("/img/solarpark-reihen.jpg"), width: 1280, height: 852, alt: "Modulreihen auf landwirtschaftlicher Fläche" }],
  },
};

const pct = (v) => `${fmt(v * 100)} %`;
const fmtZahl = (v) => fmt(v);

/** Bauweisen – Texte und Kennwerte (Kennwerte aus lib/invest/markt) */
const SYSTEME = [
  {
    typ: "vertikal",
    titel: "Vertikal, bifazial",
    kat: "Kategorie II · bodennah",
    katKurz: "Kategorie II",
    text: "Senkrechte, beidseitig aktive Module in Ost-West-Ausrichtung als „Solarzaun“. Dazwischen breite Gassen für Mähdrescher und Sämaschine. Erzeugt morgens und abends – dann, wenn Strom oft mehr wert ist.",
    kulturen: "Getreide, Raps, Mais, Grünland",
    staerken: ["günstig", "maschinenfreundlich", "Stromprofil morgens/abends"],
    grenzen: ["Windlast", "Schattenstreifen"],
    flaeche: { max: BAUART.agriVertikal.haProMwp, text: `ca. ${fmt(BAUART.agriVertikal.haProMwp, 1)} ha` },
    ertrag: { wert: BAUART.agriVertikal.faktor, text: pct(BAUART.agriVertikal.faktor) },
    invest: { min: AGRI.capexProKwp.vertikal.min, max: AGRI.capexProKwp.vertikal.max, text: `${fmt(AGRI.capexProKwp.vertikal.min)}–${fmt(AGRI.capexProKwp.vertikal.max)} €/kWp` },
  },
  {
    typ: "hoch",
    titel: "Hoch aufgeständert",
    kat: "Kategorie I · lichte Höhe ≥ 2,1 m",
    katKurz: "Kategorie I",
    text: "Ein Moduldach auf hohen Stützen, unter dem bewirtschaftet wird. Ideal für Obst, Beeren und Sonderkulturen: Die Module ersetzen teilweise Hagelnetz oder Folie.",
    kulturen: "Obst, Beeren, Gemüse, Wein",
    staerken: ["Schutz vor Hagel", "Schutz vor Sonnenbrand", "Schutz vor Starkregen"],
    grenzen: ["hohe Kosten", "Statik"],
    flaeche: { max: BAUART.agriHoch.haProMwp, text: `ca. ${fmt(BAUART.agriHoch.haProMwp, 1)} ha` },
    ertrag: { wert: BAUART.agriHoch.faktor, text: pct(BAUART.agriHoch.faktor) },
    invest: { min: AGRI.capexProKwp.hoch.min, max: AGRI.capexProKwp.hoch.max, text: `${fmt(AGRI.capexProKwp.hoch.min)}–${fmt(AGRI.capexProKwp.hoch.max)} €/kWp` },
  },
  {
    typ: "tracker",
    titel: "Einachsig nachgeführt",
    kat: "Kategorie II · je nach Höhe auch I",
    katKurz: "Kategorie II (teils I)",
    text: "Die Module drehen sich mit der Sonne und können für die Bewirtschaftung senkrecht gestellt werden. Hoher Ertrag je kWp, aber mehr Technik und Wartung.",
    kulturen: "Ackerbau, Gemüse",
    staerken: ["höchster Ertrag", "flexibel stellbar"],
    grenzen: ["Technik und Wartung"],
    flaeche: { max: BAUART.tracker.haProMwp, text: `ca. ${fmt(BAUART.tracker.haProMwp, 1)} ha` },
    ertrag: { wert: BAUART.tracker.faktor, text: pct(BAUART.tracker.faktor) },
    invest: { text: "zwischen beiden" },
  },
  {
    typ: "bodennah",
    titel: "Bodennah mit Beweidung",
    kat: "Kategorie II · Grünland",
    katKurz: "Kategorie II",
    text: "Schräg aufgeständerte Tische mit größerem Reihenabstand auf Grünland. Schafe, Geflügel und – bei höherer Aufständerung – Rinder nutzen Fläche und Schatten.",
    kulturen: "Grünland, Schafe, Geflügel",
    staerken: ["einfach, bewährt", "Tierwohl durch Schatten"],
    grenzen: ["nur für Weide/Grünland"],
    flaeche: { min: 1.5, max: 2, text: "ca. 1,5–2 ha" },
    ertrag: { wert: 0.95, text: "ca. 95 %" },
    invest: { text: "nahe Freifläche" },
  },
];

const TABELLE = {
  kopf: ["", "Vertikal, bifazial", "Hoch aufgeständert", "Nachgeführt", "Bodennah + Weide"],
  zeilen: [
    ["DIN-SPEC-Kategorie", "II", "I", "II (teils I)", "II"],
    ["Bewirtschaftung", "zwischen den Reihen", "unter den Modulen", "zwischen den Reihen", "Weide/Mahd unter und zwischen"],
    ["Typische Kulturen", "Getreide, Raps, Mais, Grünland", "Obst, Beeren, Gemüse, Wein", "Ackerbau, Gemüse", "Grünland, Schafe, Geflügel"],
    ["Fläche je MWp", `ca. ${fmt(BAUART.agriVertikal.haProMwp, 1)} ha`, `ca. ${fmt(BAUART.agriHoch.haProMwp, 1)} ha`, `ca. ${fmt(BAUART.tracker.haProMwp, 1)} ha`, "ca. 1,5–2 ha"],
    ["Stromertrag je kWp*", pct(BAUART.agriVertikal.faktor), pct(BAUART.agriHoch.faktor), pct(BAUART.tracker.faktor), "ca. 95 %"],
    ["Investition", `${fmt(AGRI.capexProKwp.vertikal.min)}–${fmt(AGRI.capexProKwp.vertikal.max)} €/kWp`, `${fmt(AGRI.capexProKwp.hoch.min)}–${fmt(AGRI.capexProKwp.hoch.max)} €/kWp`, "zwischen beiden", "nahe Freifläche"],
    ["Flächenverlust (DIN SPEC)", `≤ ${pct(AGRI.flaechenverlustMaxKat2)}`, `≤ ${pct(AGRI.flaechenverlustMaxKat1)}`, `≤ ${pct(AGRI.flaechenverlustMaxKat2)}`, `≤ ${pct(AGRI.flaechenverlustMaxKat2)}`],
    ["Stärken", "günstig, maschinenfreundlich, Stromprofil morgens/abends", "Schutz vor Hagel, Sonnenbrand, Starkregen", "höchster Ertrag, flexibel stellbar", "einfach, bewährt, Tierwohl durch Schatten"],
    ["Grenzen", "Windlast, Schattenstreifen", "hohe Kosten, Statik", "Technik und Wartung", "nur für Weide/Grünland"],
  ],
};

const FUSSNOTE = `* Stromertrag je kWp gegenüber einer fest nach Süden aufgeständerten Freiflächenanlage. Orientierungswerte, Stand ${STAND}; Standort, Layout und Kultur verschieben die Werte deutlich.`;

const KULTUREN = [
  { icon: Apple, title: "Obst & Beeren", system: "Hoch aufgeständert", ton: "sonne", text: "Hoch aufgeständert als Hagel- und Regenschutz. Weniger Sonnenbrand, trockeneres Laub, oft weniger Pflanzenschutz – teils mit Mindererträgen durch Schatten." },
  { icon: Sprout, title: "Gemüse & Kräuter", system: "Hoch aufgeständert · nachgeführt", ton: "gruen", text: "Salate, Spinat, Kräuter und viele Gemüse vertragen Halbschatten gut und profitieren in Hitzesommern von geringerem Wasserstress." },
  { icon: Wheat, title: "Ackerbau", system: "Vertikal · nachgeführt", ton: "sonne", text: "Zwischen vertikalen Reihen mit üblicher Technik: Gassenbreite nach Arbeitsbreite von Sämaschine, Spritze und Mähdrescher." },
  { icon: Tractor, title: "Grünland & Futterbau", system: "Bodennah · vertikal", ton: "gruen", text: "Mahd zwischen den Reihen, Heu und Silage wie gewohnt. Bodennahe Systeme eignen sich besonders." },
  { icon: Beef, title: "Weidetiere", system: "Bodennah mit Beweidung", ton: "navy", text: "Schafe unter bodennahen Anlagen; Rinder nur bei hoher, robuster Aufständerung. Schatten verbessert das Tierwohl an heißen Tagen." },
  { icon: Egg, title: "Freiland-Geflügel", system: "Bodennah mit Beweidung", ton: "navy", text: "Module bieten Deckung vor Greifvögeln – Hühner nutzen den Auslauf dadurch gleichmäßiger." },
];

const KULTUR_TON = {
  sonne: "bg-sun-50 text-sun-700 ring-sun-200",
  gruen: "bg-ov-50 text-ov-700 ring-ov-200",
  navy: "bg-navy-50 text-navy-600 ring-navy-100",
};

const VORTEILE = [
  { icon: CloudHail, title: "Hagel- & Sonnenschutz", text: "Das Moduldach schützt Kulturen vor Hagel, Starkregen und Sonnenbrand – ein wachsender Wert im Klimawandel." },
  { icon: Droplets, title: "Weniger Verdunstung", text: "Teilbeschattung senkt die Bodentemperatur und die Verdunstung. In trockenen Jahren kann das den Ertrag stabilisieren." },
  { icon: Layers, title: "Doppelernte", text: "Lebensmittel und Strom von derselben Fläche – ohne landwirtschaftliche Fläche dauerhaft aufzugeben." },
  { icon: Scale, title: "Mehr je Hektar", text: "Mehr Gesamtertrag je Hektar als getrennte Nutzung – das stärkt die Akzeptanz in Gemeinde und Region." },
];

const RAHMEN_DE = [
  { icon: Wheat, t: "GAP-Direktzahlungen", x: `Agri-PV-Flächen nach DIN SPEC 91434 bleiben in der Regel beihilfefähig, wenn die Bewirtschaftung mit üblichen Maschinen möglich bleibt und der Flächenverlust höchstens 15 % beträgt – rechnerisch ${pct(AGRI.gapFoerderfaehig)} der Fläche.` },
  { icon: Landmark, t: "Baurecht (§ 35 BauGB)", x: `Privilegiert im Außenbereich sind Agri-PV-Anlagen bis ${fmt(AGRI.privilegierungHa, 1)} ha Grundfläche im räumlich-funktionalen Zusammenhang mit einem Betrieb – eine je Hofstelle. Darüber hinaus in der Regel Bebauungsplan.` },
  { icon: Sun, t: "EEG: besondere Solaranlagen", x: `Agri-PV gilt im EEG als besondere Solaranlage und ist – anders als ein Solarpark – auch auf Ackerflächen außerhalb der Kulisse förderfähig. Ein eigenes Untersegment mit höherem Höchstwert ist vorgesehen, war nach aktuellem Stand aber noch nicht beihilferechtlich freigegeben; Agri-PV bietet daher im ersten Segment mit. Hoch aufgeständerte Anlagen erhalten einen Bonus von ${fmt(ERLOESE.eegBesondereCt - ERLOESE.eegFreiflaecheCt, 1)} ct/kWh.` },
  { icon: ThermometerSun, t: "Flächenkulisse", x: "Anders als klassische Solarparks sind Agri-PV-Anlagen auf Ackerflächen nicht auf benachteiligte Gebiete oder Randstreifen beschränkt. Moorböden und Schutzgebiete bleiben ausgenommen; für Grünland gelten Einschränkungen." },
];

// Fristenkasten W0-2 (nur Text, rein informativ). Geprüft am 03.10.2026 am Original:
// EAG-Abwicklungsstelle, Meldung vom 18.09.2026, https://www.eag-abwicklungsstelle.at/artikel/3-foerdercall-fuer-photovoltaikanlagen-laeuft-von-8-bis-22-oktober-2026/
// Ablaufdatum zentral in src/data/regionen/fristen.js; der Satz verschwindet nach dem 22.10.2026 (statisch: mit dem nächsten Build). Danach löschen.
const EAG_CALL_FRIST =
  Date.now() < EAG_CALL_AT.ende
    ? " Frist: Der 3. EAG-Fördercall 2026 für Investitionszuschüsse zu PV-Anlagen startet am 8. Oktober 2026 um 17 Uhr mit der Ticketziehung; eingereicht wird vom 9. Oktober (8 Uhr) bis 22. Oktober 2026. Ein Ticket allein ist noch kein Antrag (Quelle: EAG-Abwicklungsstelle)."
    : "";

const RAHMEN_NACHBARN = [
  { kz: "AT", t: "Österreich", x: `Agri-PV braucht in der Regel eine passende Widmung nach Landesraumordnung; mehrere Bundesländer erleichtern Agri-PV gegenüber reinen Freiflächenanlagen. Förderung über das EAG – Details je Förderaufruf.${EAG_CALL_FRIST}` },
  { kz: "CH", t: "Schweiz", x: "Außerhalb der Bauzone ist Agri-PV bewilligungsfähig, wenn sie Vorteile für die landwirtschaftliche Produktion bewirkt oder Versuchszwecken dient (Raumplanungsverordnung); die Regeln wurden 2026 angepasst. Kantonale Fachstellen früh einbinden." },
];

const FAQ = [
  {
    q: "Was unterscheidet Agri-PV von einem normalen Solarpark?",
    a: `Bei Agri-PV bleibt die landwirtschaftliche Nutzung Hauptnutzung. Die DIN SPEC 91434 verlangt ein Nutzungskonzept, begrenzt den Flächenverlust durch Aufbauten (Kategorie I höchstens ${pct(AGRI.flaechenverlustMaxKat1)}, Kategorie II höchstens ${pct(AGRI.flaechenverlustMaxKat2)}) und fordert, dass mindestens ${pct(AGRI.mindestErtrag)} des Referenzertrags erhalten bleiben. Ein klassischer Solarpark nutzt die Fläche dagegen überwiegend zur Stromerzeugung.`,
  },
  {
    q: "Welche Kulturen eignen sich für Agri-PV?",
    a: "Unter hoch aufgeständerten Anlagen vor allem Kulturen, die Schatten vertragen oder von Schutz profitieren: Beeren, Kernobst, Kirschen, Salate, Kräuter, teils Kartoffeln. Zwischen vertikalen Reihen lassen sich Getreide, Raps, Mais und Grünland mit normaler Technik bewirtschaften. Mais und andere lichtbedürftige Kulturen reagieren unter Moduldächern eher mit Mindererträgen.",
  },
  {
    q: "Bleiben die GAP-Direktzahlungen erhalten?",
    a: `In Deutschland bleiben Flächen mit Agri-PV nach DIN SPEC 91434 in der Regel beihilfefähig – mit einem pauschalen Abzug für die Anlagenfläche; rechnerisch sind ${pct(AGRI.gapFoerderfaehig)} der Fläche förderfähig. Voraussetzung ist, dass die Bewirtschaftung mit üblichen Methoden und Maschinen möglich bleibt. Klären Sie Details und Öko-Regelungen vorab mit dem Landwirtschaftsamt.`,
  },
  {
    q: "Wie hoch muss eine Agri-PV-Anlage sein?",
    a: "Für Kategorie I (Bewirtschaftung unter den Modulen) nennt die DIN SPEC 91434 eine lichte Höhe von mindestens 2,10 m. In der Praxis richten wir Höhe und Reihenabstand nach Ihren Maschinen: Durchfahrtshöhe, Arbeitsbreite und Wendekreis entscheiden über das Layout.",
  },
  {
    q: "Braucht Agri-PV einen Bebauungsplan?",
    a: `Nicht immer: Agri-PV bis ${fmt(AGRI.privilegierungHa, 1)} ha Grundfläche im räumlich-funktionalen Zusammenhang mit einem land- oder forstwirtschaftlichen Betrieb ist im Außenbereich privilegiert – eine Anlage je Hofstelle (§ 35 Abs. 1 Nr. 9 BauGB). Größere Anlagen erfordern in der Regel einen Bebauungsplan. In Österreich und der Schweiz gelten eigene Regeln.`,
  },
  {
    q: "Lohnt sich Agri-PV wirtschaftlich?",
    a: `Agri-PV ist teurer als ein klassischer Solarpark – vertikale Systeme liegen bei ${fmt(AGRI.capexProKwp.vertikal.min)}–${fmt(AGRI.capexProKwp.vertikal.max)} €/kWp, hoch aufgeständerte bei ${fmt(AGRI.capexProKwp.hoch.min)}–${fmt(AGRI.capexProKwp.hoch.max)} €/kWp, gegenüber ${fmt(FREIFLAECHE.capexProKwp.min)}–${fmt(FREIFLAECHE.capexProKwp.max)} €/kWp beim Solarpark. Dafür ist Agri-PV auch auf Ackerflächen EEG-förderfähig, die Ernte bleibt und oft auch der größte Teil der GAP-Zahlung. Der Agri-PV-Rechner zeigt die Wege mit Ihren Zahlen.`,
  },
];

export default async function AgriPvPage({ params }) {
  await landDerSeite(params, "/agri-pv");
  return (
    <div>
      <JsonLd
        daten={{
          "@context": "https://schema.org",
          "@type": "Service",
          name: "Projektentwicklung Agri-Photovoltaik",
          serviceType: "Planung, Genehmigung, Bau und Betrieb von Agri-PV-Anlagen nach DIN SPEC 91434",
          provider: { "@id": `${abs("/")}/#organization` },
          areaServed: ["DE", "AT", "CH"],
          url: abs(PFAD),
          description: BESCHREIBUNG,
        }}
      />

      <AgriHero
        breadcrumbs={[{ name: "Agri-PV" }]}
        pill={{ href: "#norm", marke: "Norm", text: "Agri-Photovoltaik nach DIN SPEC 91434 – Kategorie I & II", textKurz: "DIN SPEC 91434 – Kategorie I & II" }}
        titel={
          <>
            Agri-PV: zwei Ernten <span className="ov-text-gradient-light">auf einem Feld.</span>
          </>
        }
        lead="Agri-PV verbindet Landwirtschaft und Stromerzeugung auf derselben Fläche. Richtig geplant schützt sie Kulturen, spart Wasser und bringt ein zweites Einkommen – und die Landwirtschaft bleibt Hauptnutzung."
        aktionen={[
          { label: "Agri-PV-Rechner", href: pfad("/rechner/agri-pv") },
          { label: "Die vier Wege für Landwirte", href: pfad("/landwirte") },
        ]}
        unterzeile="Rechner kostenlos und ohne Anmeldung · Pacht, Eigeninvestition und Genossenschaft im Vergleich"
        punkte={["Kategorie I & II nach DIN SPEC 91434", `GAP-förderfähig – rechnerisch ${pct(AGRI.gapFoerderfaehig)} der Fläche`, "EEG-förderfähig, auch auf Ackerflächen", "Rahmen für Deutschland, Österreich und Schweiz"]}
        hinweis={{ text: "Fläche schon im Blick?", label: "Flächencheck starten", href: pfad("/flaechencheck") }}
        karten={[
          { icon: Ruler, marke: "Kategorie I", titel: "Lichte Höhe ≥ 2,10 m", text: "Bewirtschaftung unter den Modulen" },
          { icon: Wheat, marke: "Kategorie II", titel: "Gassen nach Arbeitsbreite", text: "Bewirtschaftung zwischen den Reihen" },
          { icon: Sprout, marke: "Mindestertrag", titel: `≥ ${pct(AGRI.mindestErtrag)} des Referenzertrags`, text: "bleibt landwirtschaftlich erhalten" },
        ]}
      />

      <Faktenleiste
        titel="Agri-PV in Zahlen: Regeln und Richtwerte"
        fakten={[
          { icon: Ruler, wert: "2,10", suffix: "m", einheit: "Lichte Höhe", text: "Mindestmaß für Kategorie I – Bewirtschaftung unter den Modulen" },
          { icon: Sprout, wert: fmt(AGRI.mindestErtrag * 100), suffix: "%", einheit: "Mindestertrag", text: "des Referenzertrags muss landwirtschaftlich erhalten bleiben" },
          { icon: Wheat, wert: fmt(AGRI.gapFoerderfaehig * 100), suffix: "%", einheit: "GAP-förderfähig", text: "der Fläche bleiben in Deutschland rechnerisch beihilfefähig" },
          { icon: Landmark, wert: fmt(AGRI.privilegierungHa, 1), suffix: "ha", einheit: "Privilegiert", text: "Grundfläche im Außenbereich (§ 35 BauGB) – eine Anlage je Hofstelle" },
        ]}
      />

      <Sprungleiste
        ziele={[
          { href: "#norm", label: "Norm" },
          { href: "#systeme", label: "Systeme" },
          { href: "#kulturen", label: "Kulturen" },
          { href: "#vorteile", label: "Vorteile" },
          { href: "#rahmen", label: "GAP, Baurecht, EEG" },
          { href: "#kosten", label: "Kosten" },
          { href: "#fragen", label: "Fragen" },
        ]}
      />

      <NormSektion id="norm" kat1Verlust={AGRI.flaechenverlustMaxKat1} kat2Verlust={AGRI.flaechenverlustMaxKat2} mindestErtrag={AGRI.mindestErtrag} pct={pct} />

      {/* Systeme */}
      <Section tone="sand" space="lg" id="systeme" className="scroll-mt-24">
        <div className="mb-10 grid gap-x-16 gap-y-6 md:mb-14 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:items-end">
          <SectionHeading eyebrow="Systeme" title="Vier Bauweisen – die Kultur entscheidet." />
          <Reveal delay={80}>
            <p className="ov-lead text-pretty text-ink-600">Erst kommt die landwirtschaftliche Nutzung, dann das System. Diese vier Bauweisen decken die meisten Betriebe ab.</p>
          </Reveal>
        </div>

        <Reveal>
          <SystemWahl systeme={SYSTEME} skala={{ flaeche: 3, ertrag: 1.2, invest: 1400 }} fussnote={FUSSNOTE} />
        </Reveal>

        {/* Vergleichstabelle */}
        <details className="group mt-6 overflow-hidden rounded-[1.75rem] bg-white ring-1 ring-ink-200/70">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-6 py-5 transition-colors hover:bg-sand-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ov-500 md:px-8 [&::-webkit-details-marker]:hidden">
            <span>
              <span className="block font-display text-[17px] font-bold text-ink-900">Alle vier Systeme in einer Tabelle</span>
              <span className="mt-0.5 block text-[14px] text-ink-500">Kategorie, Kulturen, Fläche, Ertrag, Investition, Stärken und Grenzen</span>
            </span>
            <span aria-hidden="true" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-sand-50 ring-1 ring-ink-200 transition-transform duration-300 group-open:rotate-180 motion-reduce:transition-none">
              <ChevronDown className="h-5 w-5 text-ink-700" />
            </span>
          </summary>
          <div className="border-t border-ink-100">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[860px] border-collapse text-left text-[14.5px]">
                <caption className="sr-only">Agri-PV-Systeme im Vergleich</caption>
                <thead>
                  <tr className="bg-navy-950 text-white">
                    {TABELLE.kopf.map((k, i) => (
                      <th key={k || i} scope="col" className="px-5 py-4 font-display text-[15px] font-bold">
                        {k || <span className="sr-only">Merkmal</span>}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {TABELLE.zeilen.map(([label, ...werte], i) => (
                    <tr key={label} className={i % 2 ? "bg-sand-50" : "bg-white"}>
                      <th scope="row" className="sticky left-0 bg-inherit px-5 py-3.5 align-top font-semibold text-ink-800">
                        {label}
                      </th>
                      {werte.map((w, j) => (
                        <td key={j} className="px-5 py-3.5 align-top leading-snug text-ink-600">
                          {w}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="px-6 pb-4 pt-3 text-[12.5px] text-ink-500 md:hidden">Tabelle seitlich wischen, um alle Systeme zu sehen.</p>
          </div>
        </details>
      </Section>

      {/* Kulturen & Tiere */}
      <Section tone="white" space="lg" id="kulturen" className="scroll-mt-24">
        <div className="mb-10 grid gap-x-16 gap-y-6 md:mb-14 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:items-end">
          <SectionHeading eyebrow="Kulturen & Tierhaltung" title="Was unter und zwischen den Modulen wächst." />
          <Reveal delay={80}>
            <p className="ov-lead text-pretty text-ink-600">Jede Kultur hat ihr passendes System – die Zuordnung zeigt, wo Sie mit der Planung beginnen.</p>
          </Reveal>
        </div>
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {KULTUREN.map((k, i) => (
            <Reveal as="li" key={k.title} delay={(i % 3) * 70} className="ov-lift group relative flex flex-col overflow-hidden rounded-[1.75rem] bg-white p-6 shadow-e1 ring-1 ring-ink-200/70 md:p-7">
              <span aria-hidden="true" className="pointer-events-none absolute -right-14 -top-14 h-40 w-40 rounded-full bg-sand-100 opacity-70 blur-2xl transition-opacity duration-300 group-hover:opacity-100" />
              <span aria-hidden="true" className={`relative flex h-12 w-12 items-center justify-center rounded-2xl ring-1 ring-inset ${KULTUR_TON[k.ton]}`}>
                <k.icon className="h-6 w-6" strokeWidth={1.8} />
              </span>
              <h3 className="relative mt-5 font-display text-[19px] font-bold tracking-[-0.01em] text-ink-900">{k.title}</h3>
              <p className="relative mt-2 text-pretty text-[15px] leading-relaxed text-ink-600">{k.text}</p>
              <p className="relative mt-auto flex flex-wrap items-center gap-2 pt-5 text-[12.5px]">
                <span className="text-ink-500">Passt zu</span>
                <span className="rounded-full bg-sand-50 px-2.5 py-1 font-semibold text-ink-800 ring-1 ring-inset ring-ink-200">{k.system}</span>
              </p>
            </Reveal>
          ))}
        </ul>
      </Section>

      {/* Vorteile */}
      <section id="vorteile" data-abschnitt="vorteile" aria-labelledby="vorteile-titel" className="ov-verlauf-nacht ov-noise relative isolate scroll-mt-24 overflow-hidden py-20 text-white md:py-32">
        <div aria-hidden="true" className="ov-grid-bg absolute inset-0 -z-10 opacity-60" />
        <div aria-hidden="true" className="pointer-events-none absolute -right-32 top-0 -z-10 h-[460px] w-[460px] rounded-full bg-sun-400/10 blur-[120px]" />
        <div className="ov-container">
          <div className="grid gap-x-16 gap-y-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:items-end">
            <Reveal>
              <Eyebrow dark className="mb-4">Vorteile</Eyebrow>
              <h2 id="vorteile-titel" className="ov-h2 text-balance text-white">Mehr aus jedem Hektar.</h2>
            </Reveal>
            <Reveal delay={80}>
              <p className="ov-lead text-pretty text-white/70">
                Die Pilotanlage Heggelbach des Fraunhofer ISE erreichte eine Landnutzungseffizienz von 160 % – im Hitzesommer 2018 sogar 186 %: Strom und Ernte zusammen brachten deutlich mehr als dieselbe Fläche getrennt genutzt.
              </p>
            </Reveal>
          </div>
          <div className="mt-12 grid gap-5 md:mt-16 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:gap-6">
            <Reveal>
              <Landnutzung
                werte={[
                  { label: "Agri-PV Heggelbach", sub: "Pilotanlage des Fraunhofer ISE", wert: 1.6, text: "160 %" },
                  { label: "Im Hitzesommer 2018", sub: "dieselbe Anlage", wert: 1.86, text: "186 %" },
                ]}
                quelle="Quelle: Fraunhofer ISE, Pilotanlage Heggelbach. Werte einzelner Jahre an einem Standort – keine Zusage für andere Flächen."
              />
            </Reveal>
            <ul className="grid gap-4 sm:grid-cols-2">
              {VORTEILE.map((v, i) => (
                <Reveal as="li" key={v.title} delay={i * 70} className="rounded-[1.5rem] bg-white/[0.04] p-6 ring-1 ring-inset ring-white/10 transition-colors hover:bg-white/[0.07]">
                  <span aria-hidden="true" className="flex h-11 w-11 items-center justify-center rounded-2xl bg-ov-400/15 text-ov-300 ring-1 ring-inset ring-ov-300/30">
                    <v.icon className="h-5 w-5" strokeWidth={1.8} />
                  </span>
                  <h3 className="mt-5 font-display text-[18px] font-bold text-white">{v.title}</h3>
                  <p className="mt-2 text-pretty text-[14.5px] leading-relaxed text-white/70">{v.text}</p>
                </Reveal>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* Recht & Förderung */}
      <Section tone="white" space="lg" id="rahmen" className="scroll-mt-24">
        <div className="mb-10 grid gap-x-16 gap-y-6 md:mb-14 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)] lg:items-end">
          <SectionHeading eyebrow="GAP, Baurecht, EEG" title="Die Rahmenbedingungen in Deutschland – und wie es in AT und CH aussieht." />
          <Reveal delay={80}>
            <p className="ov-lead text-pretty text-ink-600">Agri-PV ist politisch gewollt. Die Details sind aber verteilt auf Agrar-, Bau- und Energierecht – wir bringen sie für Ihre Fläche zusammen.</p>
          </Reveal>
        </div>

        <div className="grid gap-5 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
          <Reveal className="rounded-[1.75rem] bg-sand-50 p-2 ring-1 ring-ink-200/60">
            <div className="flex items-center gap-3 px-4 pb-3 pt-4 md:px-6">
              <span className="flex h-8 min-w-8 items-center justify-center rounded-lg bg-navy-950 px-2 text-[12px] font-bold tracking-[0.06em] text-white">DE</span>
              <p className="font-display text-[17px] font-bold text-ink-900">Deutschland</p>
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              {RAHMEN_DE.map((k) => (
                <div key={k.t} className="rounded-[1.35rem] bg-white p-5 shadow-e1 ring-1 ring-ink-200/60 md:p-6">
                  <span aria-hidden="true" className="flex h-10 w-10 items-center justify-center rounded-xl bg-ov-50 text-ov-700 ring-1 ring-inset ring-ov-200">
                    <k.icon className="h-5 w-5" strokeWidth={1.8} />
                  </span>
                  <h3 className="mt-4 font-display text-[17.5px] font-bold text-ink-900">{k.t}</h3>
                  <p className="mt-2 text-pretty text-[14.5px] leading-relaxed text-ink-600">{k.x}</p>
                </div>
              ))}
            </div>
          </Reveal>
          <div className="flex flex-col gap-5">
            {RAHMEN_NACHBARN.map((k, i) => (
              <Reveal key={k.t} delay={80 + i * 70} className="rounded-[1.75rem] bg-white p-6 shadow-e1 ring-1 ring-ink-200/70 md:p-7">
                <div className="flex items-center gap-3">
                  <span className="flex h-8 min-w-8 items-center justify-center rounded-lg bg-ov-600 px-2 text-[12px] font-bold tracking-[0.06em] text-white">{k.kz}</span>
                  <h3 className="font-display text-[17.5px] font-bold text-ink-900">{k.t}</h3>
                </div>
                <p className="mt-3 text-pretty text-[14.5px] leading-relaxed text-ink-600">{k.x}</p>
              </Reveal>
            ))}
            <Reveal delay={220} className="ov-noise relative flex flex-1 flex-col justify-between gap-6 overflow-hidden rounded-[1.75rem] bg-navy-950 p-6 text-white md:p-7">
              <div aria-hidden="true" className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-ov-500/25 blur-3xl" />
              <p className="relative text-pretty text-[14px] leading-relaxed text-white/75">Stand {STAND}, ohne Gewähr und ohne Rechtsberatung. Förder- und Planungsrecht ändern sich häufig – wir prüfen die aktuelle Lage für Ihren Standort und stimmen uns mit Landwirtschaftsamt und Gemeinde ab.</p>
              <Button href={pfad("/landwirte#anfrage")} variant="white" pfeil className="relative w-full sm:w-auto sm:self-start">
                Standort prüfen lassen
              </Button>
            </Reveal>
          </div>
        </div>
      </Section>

      {/* Wirtschaftlichkeit */}
      <Section tone="green" space="lg" id="kosten" className="scroll-mt-24 overflow-hidden">
        <div aria-hidden="true" className="ov-grid-bg-light absolute inset-0 opacity-60" />
        <div className="relative grid gap-10 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)] lg:gap-14">
          <div>
            <SectionHeading
              eyebrow="Wirtschaftlichkeit"
              title="Teurer als ein Solarpark – aber die Ernte bleibt."
              lead="Agri-PV braucht mehr Stahl und mehr Fläche je Megawatt. Die EEG-Förderung auch auf Ackerflächen, die weiterlaufende Ernte und die GAP-Zahlung gleichen einen Teil davon aus. Ehrlich gesagt: Hoch aufgeständerte Systeme rechnen sich meist nur bei wertvollen Sonderkulturen."
            />
            <Reveal delay={120} className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
              <Button href={pfad("/rechner/agri-pv")} variant="navy" size="lg" pfeil className="w-full sm:w-auto">
                Mit eigenen Zahlen rechnen
              </Button>
              <a href={pfad("/landwirte")} className="group inline-flex items-center justify-center gap-1.5 whitespace-nowrap rounded-full px-4 py-3 text-[15px] font-semibold text-ov-800 transition-colors hover:text-ov-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ov-500">
                Welcher Weg passt?
                <ArrowRight aria-hidden="true" className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5 motion-reduce:transition-none" />
              </a>
            </Reveal>
          </div>
          <div className="grid gap-4">
            <Reveal dir="right">
              <Spannen
                titel="Investition je kWp im Vergleich"
                fmt={fmtZahl}
                achse={{ max: 1400, schritt: 200, einheit: "€/kWp" }}
                zeilen={[
                  { label: "Solarpark (Vergleich)", sub: `${fmt(FREIFLAECHE.haProMwp, 1)} ha je MWp`, min: FREIFLAECHE.capexProKwp.min, max: FREIFLAECHE.capexProKwp.max },
                  { label: "Agri-PV vertikal", sub: `${fmt(BAUART.agriVertikal.haProMwp, 1)} ha je MWp`, min: AGRI.capexProKwp.vertikal.min, max: AGRI.capexProKwp.vertikal.max, hervor: true },
                  { label: "Agri-PV hoch aufgeständert", sub: `${fmt(BAUART.agriHoch.haProMwp, 1)} ha je MWp`, min: AGRI.capexProKwp.hoch.min, max: AGRI.capexProKwp.hoch.max, hervor: true },
                ]}
              />
            </Reveal>
            <Reveal dir="right" delay={80} className="ov-noise relative flex flex-col gap-4 overflow-hidden rounded-[1.75rem] bg-ov-700 p-6 text-white sm:flex-row sm:items-center sm:justify-between sm:p-7">
              <div aria-hidden="true" className="pointer-events-none absolute -right-10 -top-16 h-48 w-48 rounded-full bg-sun-300/25 blur-3xl" />
              <div className="relative">
                <p className="text-[13px] font-semibold uppercase tracking-[0.12em] text-white/80">Pacht Agri-PV</p>
                <p className="ov-num mt-1 font-display text-[30px] font-extrabold tracking-tight md:text-[34px]">
                  {fmt(PACHT.agriProHa.min)}–{fmt(PACHT.agriProHa.max)} €/ha
                </p>
              </div>
              <p className="relative self-start rounded-full bg-white/15 px-4 py-2 text-[14px] sm:self-auto font-semibold ring-1 ring-inset ring-white/25">plus Ernte und GAP</p>
            </Reveal>
            <p className="text-[12.5px] leading-relaxed text-ink-500">Orientierungswerte, Stand {STAND}. Schlüsselfertige Errichtung je kWp; Netzanschluss und Entwicklung kommen hinzu.</p>
          </div>
        </div>
      </Section>

      <Section tone="white" space="lg" id="fragen" className="scroll-mt-24">
        <div className="grid gap-12 lg:grid-cols-[0.8fr_1.2fr] lg:gap-20">
          <SectionHeading eyebrow="Häufige Fragen" title="Agri-PV – gut zu wissen" lead="Ihre Frage ist nicht dabei? Schreiben Sie uns über die Landwirte-Seite – wir antworten persönlich.">
            <div className="mt-8">
              <Button href={pfad("/landwirte#anfrage")} variant="secondary" pfeil>
                Frage stellen
              </Button>
            </div>
          </SectionHeading>
          <Faq items={FAQ} />
        </div>
      </Section>

      <Querverweise
        items={[
          { href: pfad("/landwirte"), titel: "Für Landwirte", text: "Verpachten, selbst investieren, Investor oder Genossenschaft – mit Entscheidungshilfe." },
          { href: pfad("/rechner/agri-pv"), titel: "Agri-PV-Rechner", text: "Drei Wege mit IRR, Amortisation, GAP und Deckungsbeitrag." },
          { href: pfad("/freiflaeche"), titel: "Freiflächen-PV", text: "Wenn die Fläche ganz für einen Solarpark genutzt werden soll." },
          { href: pfad("/flaechencheck"), titel: "Flächencheck", text: "Eignung und Leistung Ihrer Fläche in zwei Minuten." },
          { href: "/wissen/ratgeber/agri-pv-din-spec-91434", titel: "DIN SPEC 91434 erklärt", text: "Kategorien, Flächenverlust und Anforderungen im Detail." },
          { href: "/wissen/ratgeber/agri-pv-foerderung-gap", titel: "Agri-PV Förderung & GAP", text: "Direktzahlungen, EEG und Baurecht im Überblick." },
        ]}
      />

      <CtaBand
        eyebrow="Agri-PV mit Plan"
        title="Erst die Landwirtschaft, dann die Module."
        text="Wir entwickeln Ihr Nutzungskonzept mit Ihnen, planen normgerecht nach DIN SPEC 91434 und begleiten Genehmigung, Bau und Betrieb."
        primary={{ label: "Welcher Weg passt?", href: pfad("/landwirte") }}
        secondary={{ label: "Agri-PV-Rechner", href: pfad("/rechner/agri-pv") }}
      />
    </div>
  );
}

export const generateMetadata = landMetadata("/agri-pv", metadata);
