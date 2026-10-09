// src/app/agri-pv/page.js – Agri-PV fachlich tief
//
// Sprachmodell: feste Texte im Wörterbuch TEXTE (en nur Texte, Kennwerte aus de), Länderinhalt AT/CH über
// inhaltFuerSprache() mit AGRI_PV_AT_EN / AGRI_PV_CH_EN (gleiche Quellen).

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
import { GiltFuer, LandHinweis } from "@/components/Land/LandHinweis";
import { AGRI_PV_AT, AGRI_PV_AT_EN } from "@/data/laender/at/agri-pv";
import { AGRI_PV_CH, AGRI_PV_CH_EN } from "@/data/laender/ch/agri-pv";
import { seitenLand, seitenMetadata, spracheDerAnfrage } from "@/lib/land/seite";
import { inhaltFuerSprache, uebersetze } from "@/lib/sprache/woerterbuch";
import { datumText, fmtZahl as fmtSprache } from "@/lib/sprache/format";
import Link from "@/components/Land/Link";

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

/* ------------------------------------------------------------------------------------------- */
/* Englisch (Sprachmodell): inhaltlich identisch, Zahlen im englischen Format                    */
/* ------------------------------------------------------------------------------------------- */
const z = (n, stellen = 0) => fmtSprache(n, stellen, "en");
const pctEn = (v) => `${z(v * 100)} %`;

const TITEL_EN = "Agrivoltaics: systems, crops, funding & law | ÖkoInvest";
const BESCHREIBUNG_EN =
  "Agrivoltaics explained: DIN SPEC 91434, vertical, elevated and tracking systems, crops, CAP, building law, EEG and costs. Check your land now.";

const EAG_CALL_FRIST_EN =
  Date.now() < EAG_CALL_AT.ende
    ? " Deadline: the 3rd EAG funding call of 2026 for investment grants for PV plants starts on 8 October 2026 at 5 pm with the ticket draw; applications can be submitted from 9 October (8 am) to 22 October 2026. A ticket alone is not yet an application (source: EAG settlement agency)."
    : "";

const SYSTEME_EN = [
  {
    titel: "Vertical, bifacial",
    kat: "Category II · ground-level",
    katKurz: "Category II",
    text: "Upright, bifacial modules facing east–west as a ‘solar fence’. In between, wide lanes for combine harvesters and seed drills. Generates power in the morning and evening – when power is often worth more.",
    kulturen: "Cereals, rapeseed, maize, grassland",
    staerken: ["low cost", "machine-friendly", "morning/evening power profile"],
    grenzen: ["wind load", "shade strips"],
    flaeche: { text: `approx. ${z(BAUART.agriVertikal.haProMwp, 1)} ha` },
    ertrag: { text: pctEn(BAUART.agriVertikal.faktor) },
    invest: { text: `€${z(AGRI.capexProKwp.vertikal.min)}–${z(AGRI.capexProKwp.vertikal.max)}/kWp` },
  },
  {
    titel: "Elevated",
    kat: "Category I · clearance ≥ 2.1 m",
    katKurz: "Category I",
    text: "A module roof on tall supports with farming underneath. Ideal for fruit, berries and special crops: the modules partly replace hail nets or polytunnels.",
    kulturen: "Fruit, berries, vegetables, vines",
    staerken: ["protection from hail", "protection from sunburn", "protection from heavy rain"],
    grenzen: ["high costs", "structural engineering"],
    flaeche: { text: `approx. ${z(BAUART.agriHoch.haProMwp, 1)} ha` },
    ertrag: { text: pctEn(BAUART.agriHoch.faktor) },
    invest: { text: `€${z(AGRI.capexProKwp.hoch.min)}–${z(AGRI.capexProKwp.hoch.max)}/kWp` },
  },
  {
    titel: "Single-axis tracking",
    kat: "Category II · category I depending on height",
    katKurz: "Category II (partly I)",
    text: "The modules turn with the sun and can be set upright for farming. High yield per kWp, but more technology and maintenance.",
    kulturen: "Arable farming, vegetables",
    staerken: ["highest yield", "flexible positioning"],
    grenzen: ["technology and maintenance"],
    flaeche: { text: `approx. ${z(BAUART.tracker.haProMwp, 1)} ha` },
    ertrag: { text: pctEn(BAUART.tracker.faktor) },
    invest: { text: "between the two" },
  },
  {
    titel: "Ground-level with grazing",
    kat: "Category II · grassland",
    katKurz: "Category II",
    text: "Tilted tables with wider row spacing on grassland. Sheep, poultry and – with higher mounting – cattle use the land and the shade.",
    kulturen: "Grassland, sheep, poultry",
    staerken: ["simple, proven", "animal welfare through shade"],
    grenzen: ["only for pasture/grassland"],
    flaeche: { text: "approx. 1.5–2 ha" },
    ertrag: { text: "approx. 95 %" },
    invest: { text: "close to ground-mounted" },
  },
];

const TABELLE_EN = {
  kopf: ["", "Vertical, bifacial", "Elevated", "Tracking", "Ground-level + grazing"],
  zeilen: [
    ["DIN SPEC category", "II", "I", "II (partly I)", "II"],
    ["Farming", "between the rows", "under the modules", "between the rows", "grazing/mowing under and between"],
    ["Typical crops", "Cereals, rapeseed, maize, grassland", "Fruit, berries, vegetables, vines", "Arable farming, vegetables", "Grassland, sheep, poultry"],
    ["Land per MWp", `approx. ${z(BAUART.agriVertikal.haProMwp, 1)} ha`, `approx. ${z(BAUART.agriHoch.haProMwp, 1)} ha`, `approx. ${z(BAUART.tracker.haProMwp, 1)} ha`, "approx. 1.5–2 ha"],
    ["Power yield per kWp*", pctEn(BAUART.agriVertikal.faktor), pctEn(BAUART.agriHoch.faktor), pctEn(BAUART.tracker.faktor), "approx. 95 %"],
    ["Investment", `€${z(AGRI.capexProKwp.vertikal.min)}–${z(AGRI.capexProKwp.vertikal.max)}/kWp`, `€${z(AGRI.capexProKwp.hoch.min)}–${z(AGRI.capexProKwp.hoch.max)}/kWp`, "between the two", "close to ground-mounted"],
    ["Land loss (DIN SPEC)", `≤ ${pctEn(AGRI.flaechenverlustMaxKat2)}`, `≤ ${pctEn(AGRI.flaechenverlustMaxKat1)}`, `≤ ${pctEn(AGRI.flaechenverlustMaxKat2)}`, `≤ ${pctEn(AGRI.flaechenverlustMaxKat2)}`],
    ["Strengths", "low cost, machine-friendly, morning/evening power profile", "protection from hail, sunburn, heavy rain", "highest yield, flexible positioning", "simple, proven, animal welfare through shade"],
    ["Limitations", "wind load, shade strips", "high costs, structural engineering", "technology and maintenance", "only for pasture/grassland"],
  ],
};

const FUSSNOTE_EN = `* Power yield per kWp compared with a fixed, south-facing ground-mounted plant. Guide values, as of ${datumText(STAND, "en")}; site, layout and crop shift the values considerably.`;

const KULTUREN_EN = [
  { title: "Fruit & berries", system: "Elevated", text: "Elevated as protection from hail and rain. Less sunburn, drier foliage, often less crop protection – sometimes with lower yields due to shade." },
  { title: "Vegetables & herbs", system: "Elevated · tracking", text: "Lettuce, spinach, herbs and many vegetables tolerate partial shade well and benefit from lower water stress in hot summers." },
  { title: "Arable farming", system: "Vertical · tracking", text: "Between vertical rows with standard machinery: lane width matched to the working width of seed drill, sprayer and combine harvester." },
  { title: "Grassland & forage", system: "Ground-level · vertical", text: "Mowing between the rows, hay and silage as usual. Ground-level systems are particularly suitable." },
  { title: "Grazing animals", system: "Ground-level with grazing", text: "Sheep under ground-level installations; cattle only with high, robust mounting. Shade improves animal welfare on hot days." },
  { title: "Free-range poultry", system: "Ground-level with grazing", text: "Modules provide cover from birds of prey – so hens use the run more evenly." },
];

const VORTEILE_EN = [
  { title: "Hail & sun protection", text: "The module roof protects crops from hail, heavy rain and sunburn – an increasing benefit as the climate changes." },
  { title: "Less evaporation", text: "Partial shading lowers soil temperature and evaporation. In dry years, this can stabilise yields." },
  { title: "Double harvest", text: "Food and power from the same land – without permanently giving up farmland." },
  { title: "More per hectare", text: "A higher total yield per hectare than separate use – which strengthens acceptance in the municipality and region." },
];

const RAHMEN_DE_EN = [
  { t: "CAP direct payments", x: `Agrivoltaic land under DIN SPEC 91434 generally remains eligible for support if farming with standard machinery remains possible and the land loss is no more than 15 % – mathematically ${pctEn(AGRI.gapFoerderfaehig)} of the land.` },
  { t: "Building law (§ 35 BauGB)", x: `Agrivoltaic installations with a footprint of up to ${z(AGRI.privilegierungHa, 1)} ha that are spatially and functionally linked to a farm are privileged in the outer zone (German Federal Building Code) – one per farmstead. Beyond that, a development plan is generally required.` },
  { t: "EEG: special solar installations", x: `Under the EEG (German Renewable Energy Sources Act), agrivoltaics counts as a special solar installation and – unlike a solar park – is also eligible for funding on arable land outside the land categories. A dedicated sub-segment with a higher maximum value is planned but, according to the latest information, has not yet received state-aid approval; agrivoltaics therefore bids in the first segment. Elevated installations receive a bonus of ${z(ERLOESE.eegBesondereCt - ERLOESE.eegFreiflaecheCt, 1)} ct/kWh.` },
  { t: "Land categories", x: "Unlike conventional solar parks, agrivoltaic installations on arable land are not restricted to less-favoured areas or roadside strips. Peat soils and protected areas remain excluded; restrictions apply to grassland." },
];

const RAHMEN_NACHBARN_EN = [
  { t: "Austria", x: `Agrivoltaics generally requires a suitable zoning designation (Widmung) under state spatial planning law; several federal states make agrivoltaics easier than pure ground-mounted plants. Funding under the EAG (Austrian Renewable Energy Expansion Act) – details per funding call.${EAG_CALL_FRIST_EN}` },
  { t: "Switzerland", x: "Outside the building zone, agrivoltaics can be approved if it benefits agricultural production or serves trial purposes (Spatial Planning Ordinance); the rules were amended in 2026. Involve cantonal specialist agencies early." },
];

const FAQ_EN = [
  {
    q: "What distinguishes agrivoltaics from a normal solar park?",
    a: `With agrivoltaics, agricultural use remains the main use. DIN SPEC 91434 requires a use concept, limits the land lost to structures (category I at most ${pctEn(AGRI.flaechenverlustMaxKat1)}, category II at most ${pctEn(AGRI.flaechenverlustMaxKat2)}) and requires that at least ${pctEn(AGRI.mindestErtrag)} of the reference yield is retained. A conventional solar park, by contrast, uses the land mainly to generate power.`,
  },
  {
    q: "Which crops are suitable for agrivoltaics?",
    a: "Under elevated installations, mainly crops that tolerate shade or benefit from protection: berries, pome fruit, cherries, lettuce, herbs and sometimes potatoes. Between vertical rows, cereals, rapeseed, maize and grassland can be farmed with standard machinery. Maize and other light-demanding crops tend to yield less under module roofs.",
  },
  {
    q: "Are CAP direct payments retained?",
    a: `In Germany, land with agrivoltaics under DIN SPEC 91434 generally remains eligible for support – with a flat-rate deduction for the area covered by the installation; mathematically, ${pctEn(AGRI.gapFoerderfaehig)} of the land remains eligible. The prerequisite is that farming with standard methods and machinery remains possible. Clarify details and eco-schemes with the agricultural office in advance.`,
  },
  {
    q: "How high does an agrivoltaic installation have to be?",
    a: "For category I (farming underneath the modules), DIN SPEC 91434 specifies a clearance of at least 2.10 m. In practice, we design height and row spacing around your machinery: clearance height, working width and turning circle determine the layout.",
  },
  {
    q: "Does agrivoltaics need a development plan?",
    a: `Not always: agrivoltaics with a footprint of up to ${z(AGRI.privilegierungHa, 1)} ha that is spatially and functionally linked to an agricultural or forestry business is privileged in the outer zone – one installation per farmstead (§ 35 (1) no. 9 BauGB). Larger installations generally require a development plan (Bebauungsplan). Austria and Switzerland have their own rules.`,
  },
  {
    q: "Is agrivoltaics economically worthwhile?",
    a: `Agrivoltaics costs more than a conventional solar park – vertical systems cost €${z(AGRI.capexProKwp.vertikal.min)}–${z(AGRI.capexProKwp.vertikal.max)}/kWp, elevated ones €${z(AGRI.capexProKwp.hoch.min)}–${z(AGRI.capexProKwp.hoch.max)}/kWp, compared with €${z(FREIFLAECHE.capexProKwp.min)}–${z(FREIFLAECHE.capexProKwp.max)}/kWp for a solar park. In return, agrivoltaics is also eligible for EEG funding on arable land, the harvest continues and often most of the CAP payment remains. The agrivoltaics calculator shows the routes with your figures.`,
  },
];

/** Alle festen Texte der Seite. en enthält nur Texte; Listen werden je Index zusammengeführt. */
const TEXTE = {
  de: {
    pct,
    fmtZahl,
    systeme: SYSTEME,
    tabelle: TABELLE,
    fussnote: FUSSNOTE,
    kulturen: KULTUREN,
    vorteile: VORTEILE,
    rahmenDe: RAHMEN_DE,
    nachbarn: RAHMEN_NACHBARN,
    faq: FAQ,
    eagFrist: EAG_CALL_FRIST,
    jsonLd: { name: "Projektentwicklung Agri-Photovoltaik", serviceType: "Planung, Genehmigung, Bau und Betrieb von Agri-PV-Anlagen nach DIN SPEC 91434", description: BESCHREIBUNG },
    hero: {
      brotkrumen: "Agri-PV",
      pill: { marke: "Norm", text: "Agri-Photovoltaik nach DIN SPEC 91434 – Kategorie I & II", textKurz: "DIN SPEC 91434 – Kategorie I & II" },
      titelA: "Agri-PV: zwei Ernten ",
      titelB: "auf einem Feld.",
      lead: "Agri-PV verbindet Landwirtschaft und Stromerzeugung auf derselben Fläche. Richtig geplant schützt sie Kulturen, spart Wasser und bringt ein zweites Einkommen – und die Landwirtschaft bleibt Hauptnutzung.",
      aktionen: ["Agri-PV-Rechner", "Die vier Wege für Landwirte"],
      unterzeile: "Rechner kostenlos und ohne Anmeldung · Pacht, Eigeninvestition und Genossenschaft im Vergleich",
      punkte: ["Kategorie I & II nach DIN SPEC 91434", `GAP-förderfähig – rechnerisch ${pct(AGRI.gapFoerderfaehig)} der Fläche`, "EEG-förderfähig, auch auf Ackerflächen", "Rahmen für Deutschland, Österreich und Schweiz"],
      hinweis: { text: "Fläche schon im Blick?", label: "Flächencheck starten" },
      karten: [
        { marke: "Kategorie I", titel: "Lichte Höhe ≥ 2,10 m", text: "Bewirtschaftung unter den Modulen" },
        { marke: "Kategorie II", titel: "Gassen nach Arbeitsbreite", text: "Bewirtschaftung zwischen den Reihen" },
        { marke: "Mindestertrag", titel: `≥ ${pct(AGRI.mindestErtrag)} des Referenzertrags`, text: "bleibt landwirtschaftlich erhalten" },
      ],
    },
    faktenTitel: "Agri-PV in Zahlen: Regeln und Richtwerte",
    fakten: [
      { icon: Ruler, wert: "2,10", suffix: "m", einheit: "Lichte Höhe", text: "Mindestmaß für Kategorie I – Bewirtschaftung unter den Modulen" },
      { icon: Sprout, wert: fmt(AGRI.mindestErtrag * 100), suffix: "%", einheit: "Mindestertrag", text: "des Referenzertrags muss landwirtschaftlich erhalten bleiben" },
      { icon: Wheat, wert: fmt(AGRI.gapFoerderfaehig * 100), suffix: "%", einheit: "GAP-förderfähig", text: "der Fläche bleiben in Deutschland rechnerisch beihilfefähig" },
      { icon: Landmark, wert: fmt(AGRI.privilegierungHa, 1), suffix: "ha", einheit: "Privilegiert", text: "Grundfläche im Außenbereich (§ 35 BauGB) – eine Anlage je Hofstelle" },
    ],
    sprung: ["Norm", "Systeme", "Kulturen", "Vorteile", "GAP, Baurecht, EEG", "Kosten", "Fragen"],
    systemeKopf: { eyebrow: "Systeme", titel: "Vier Bauweisen – die Kultur entscheidet.", lead: "Erst kommt die landwirtschaftliche Nutzung, dann das System. Diese vier Bauweisen decken die meisten Betriebe ab." },
    tabelleKopf: { titel: "Alle vier Systeme in einer Tabelle", text: "Kategorie, Kulturen, Fläche, Ertrag, Investition, Stärken und Grenzen", caption: "Agri-PV-Systeme im Vergleich", merkmal: "Merkmal", wischen: "Tabelle seitlich wischen, um alle Systeme zu sehen." },
    kulturenKopf: { eyebrow: "Kulturen & Tierhaltung", titel: "Was unter und zwischen den Modulen wächst.", lead: "Jede Kultur hat ihr passendes System – die Zuordnung zeigt, wo Sie mit der Planung beginnen.", passt: "Passt zu" },
    vorteileKopf: {
      eyebrow: "Vorteile",
      titel: "Mehr aus jedem Hektar.",
      lead: "Die Pilotanlage Heggelbach des Fraunhofer ISE erreichte eine Landnutzungseffizienz von 160 % – im Hitzesommer 2018 sogar 186 %: Strom und Ernte zusammen brachten deutlich mehr als dieselbe Fläche getrennt genutzt.",
      werte: [
        { label: "Agri-PV Heggelbach", sub: "Pilotanlage des Fraunhofer ISE" },
        { label: "Im Hitzesommer 2018", sub: "dieselbe Anlage" },
      ],
      quelle: "Quelle: Fraunhofer ISE, Pilotanlage Heggelbach. Werte einzelner Jahre an einem Standort – keine Zusage für andere Flächen.",
    },
    rahmenKopf: {
      label: "GAP, Baurecht, EEG",
      titel: "Die Rahmenbedingungen in Deutschland – und wie es in AT und CH aussieht.",
      lead: "Agri-PV ist politisch gewollt. Die Details sind aber verteilt auf Agrar-, Bau- und Energierecht – wir bringen sie für Ihre Fläche zusammen.",
      landName: "Deutschland",
      fuss: `Stand ${STAND}, ohne Gewähr und ohne Rechtsberatung. Förder- und Planungsrecht ändern sich häufig – wir prüfen die aktuelle Lage für Ihren Standort und stimmen uns mit Landwirtschaftsamt und Gemeinde ab.`,
      button: "Standort prüfen lassen",
    },
    kosten: {
      eyebrow: "Wirtschaftlichkeit",
      titel: "Teurer als ein Solarpark – aber die Ernte bleibt.",
      lead: "Agri-PV braucht mehr Stahl und mehr Fläche je Megawatt. Die EEG-Förderung auch auf Ackerflächen, die weiterlaufende Ernte und die GAP-Zahlung gleichen einen Teil davon aus. Ehrlich gesagt: Hoch aufgeständerte Systeme rechnen sich meist nur bei wertvollen Sonderkulturen.",
      rechnen: "Mit eigenen Zahlen rechnen",
      weg: "Welcher Weg passt?",
      spannenTitel: "Investition je kWp im Vergleich",
      zeilen: [
        { label: "Solarpark (Vergleich)", sub: `${fmt(FREIFLAECHE.haProMwp, 1)} ha je MWp` },
        { label: "Agri-PV vertikal", sub: `${fmt(BAUART.agriVertikal.haProMwp, 1)} ha je MWp` },
        { label: "Agri-PV hoch aufgeständert", sub: `${fmt(BAUART.agriHoch.haProMwp, 1)} ha je MWp` },
      ],
      pacht: "Pacht Agri-PV",
      pachtWert: `${fmt(PACHT.agriProHa.min)}–${fmt(PACHT.agriProHa.max)} €/ha`,
      plus: "plus Ernte und GAP",
      fuss: `Orientierungswerte, Stand ${STAND}. Schlüsselfertige Errichtung je kWp; Netzanschluss und Entwicklung kommen hinzu.`,
    },
    faqKopf: { eyebrow: "Häufige Fragen", titel: "Agri-PV – gut zu wissen", lead: "Ihre Frage ist nicht dabei? Schreiben Sie uns über die Landwirte-Seite – wir antworten persönlich.", button: "Frage stellen" },
    querverweise: [
      { href: pfad("/landwirte"), titel: "Für Landwirte", text: "Verpachten, selbst investieren, Investor oder Genossenschaft – mit Entscheidungshilfe." },
      { href: pfad("/rechner/agri-pv"), titel: "Agri-PV-Rechner", text: "Drei Wege mit IRR, Amortisation, GAP und Deckungsbeitrag." },
      { href: pfad("/freiflaeche"), titel: "Freiflächen-PV", text: "Wenn die Fläche ganz für einen Solarpark genutzt werden soll." },
      { href: pfad("/flaechencheck"), titel: "Flächencheck", text: "Eignung und Leistung Ihrer Fläche in zwei Minuten." },
      { href: "/ratgeber/agri-pv-din-spec-91434", titel: "DIN SPEC 91434 erklärt", text: "Kategorien, Flächenverlust und Anforderungen im Detail." },
      { href: "/ratgeber/agri-pv-foerderung-gap", titel: "Agri-PV Förderung & GAP", text: "Direktzahlungen, EEG und Baurecht im Überblick." },
    ],
    cta: {
      eyebrow: "Agri-PV mit Plan",
      titel: "Erst die Landwirtschaft, dann die Module.",
      text: "Wir entwickeln Ihr Nutzungskonzept mit Ihnen, planen normgerecht nach DIN SPEC 91434 und begleiten Genehmigung, Bau und Betrieb.",
      primaer: "Welcher Weg passt?",
      sekundaer: "Agri-PV-Rechner",
    },
  },
  en: {
    pct: pctEn,
    fmtZahl: (v) => z(v),
    systeme: SYSTEME_EN,
    tabelle: TABELLE_EN,
    fussnote: FUSSNOTE_EN,
    kulturen: KULTUREN_EN,
    vorteile: VORTEILE_EN,
    rahmenDe: RAHMEN_DE_EN,
    nachbarn: RAHMEN_NACHBARN_EN,
    faq: FAQ_EN,
    eagFrist: EAG_CALL_FRIST_EN,
    jsonLd: { name: "Project development for agrivoltaics", serviceType: "Planning, permitting, construction and operation of agrivoltaic installations under DIN SPEC 91434", description: BESCHREIBUNG_EN },
    hero: {
      brotkrumen: "Agrivoltaics",
      pill: { marke: "Standard", text: "Agrivoltaics under DIN SPEC 91434 – categories I & II", textKurz: "DIN SPEC 91434 – categories I & II" },
      titelA: "Agrivoltaics: two harvests ",
      titelB: "from one field.",
      lead: "Agrivoltaics combines farming and power generation on the same land. Planned properly, it protects crops, saves water and brings a second income – and farming remains the main use.",
      aktionen: ["Agrivoltaics calculator", "The four routes for farmers"],
      unterzeile: "Calculator free of charge, no registration · lease, own investment and cooperative compared",
      punkte: ["Categories I & II under DIN SPEC 91434", `CAP-eligible – mathematically ${pctEn(AGRI.gapFoerderfaehig)} of the land`, "EEG-eligible, also on arable land", "Framework for Germany, Austria and Switzerland"],
      hinweis: { text: "Already have land in mind?", label: "Start the land check" },
      karten: [
        { marke: "Category I", titel: "Clearance ≥ 2.10 m", text: "Farming underneath the modules" },
        { marke: "Category II", titel: "Lanes per working width", text: "Farming between the rows" },
        { marke: "Minimum yield", titel: `≥ ${pctEn(AGRI.mindestErtrag)} of the reference yield`, text: "is retained for agriculture" },
      ],
    },
    faktenTitel: "Agrivoltaics in figures: rules and guide values",
    fakten: [
      { wert: "2.10", einheit: "Clearance", text: "minimum for category I – farming underneath the modules" },
      { wert: z(AGRI.mindestErtrag * 100), einheit: "Minimum yield", text: "of the reference yield must be retained for agriculture" },
      { wert: z(AGRI.gapFoerderfaehig * 100), einheit: "CAP-eligible", text: "of the land remains eligible for support in Germany (mathematically)" },
      { wert: z(AGRI.privilegierungHa, 1), einheit: "Privileged", text: "footprint in the outer zone (§ 35 BauGB) – one installation per farmstead" },
    ],
    sprung: ["Standard", "Systems", "Crops", "Benefits", "CAP, building law, EEG", "Costs", "Questions"],
    systemeKopf: { eyebrow: "Systems", titel: "Four designs – the crop decides.", lead: "Agricultural use comes first, then the system. These four designs cover most farms." },
    tabelleKopf: { titel: "All four systems in one table", text: "Category, crops, land, yield, investment, strengths and limitations", caption: "Agrivoltaic systems compared", merkmal: "Feature", wischen: "Swipe the table sideways to see all systems." },
    kulturenKopf: { eyebrow: "Crops & livestock", titel: "What grows under and between the modules.", lead: "Every crop has its matching system – the assignment shows where to start planning.", passt: "Suits" },
    vorteileKopf: {
      eyebrow: "Benefits",
      titel: "More from every hectare.",
      lead: "The Fraunhofer ISE pilot plant in Heggelbach achieved a land use efficiency of 160 % – and even 186 % in the hot summer of 2018: power and crops together yielded considerably more than the same land used separately.",
      werte: [
        { label: "Agrivoltaics Heggelbach", sub: "Fraunhofer ISE pilot plant" },
        { label: "In the hot summer of 2018", sub: "the same plant" },
      ],
      quelle: "Source: Fraunhofer ISE, Heggelbach pilot plant. Values from individual years at one site – no guarantee for other land.",
    },
    rahmenKopf: {
      label: "CAP, building law, EEG",
      titel: "The framework in Germany – and how it looks in AT and CH.",
      lead: "Agrivoltaics has political backing. But the details are spread across agricultural, building and energy law – we bring them together for your land.",
      landName: "Germany",
      fuss: `As of ${datumText(STAND, "en")}, without guarantee and not legal advice. Funding and planning law change frequently – we check the current situation for your site and coordinate with the agricultural office and the municipality.`,
      button: "Have your site checked",
    },
    kosten: {
      eyebrow: "Economics",
      titel: "More expensive than a solar park – but the harvest continues.",
      lead: "Agrivoltaics needs more steel and more land per megawatt. EEG funding also on arable land, the continuing harvest and the CAP payment offset part of this. To be honest: elevated systems usually only pay off with valuable special crops.",
      rechnen: "Calculate with your own figures",
      weg: "Which route suits you?",
      spannenTitel: "Investment per kWp compared",
      zeilen: [
        { label: "Solar park (comparison)", sub: `${z(FREIFLAECHE.haProMwp, 1)} ha per MWp` },
        { label: "Agrivoltaics, vertical", sub: `${z(BAUART.agriVertikal.haProMwp, 1)} ha per MWp` },
        { label: "Agrivoltaics, elevated", sub: `${z(BAUART.agriHoch.haProMwp, 1)} ha per MWp` },
      ],
      pacht: "Agrivoltaics lease",
      pachtWert: `€${z(PACHT.agriProHa.min)}–${z(PACHT.agriProHa.max)}/ha`,
      plus: "plus harvest and CAP",
      fuss: `Guide values, as of ${datumText(STAND, "en")}. Turnkey construction per kWp; grid connection and development come on top.`,
    },
    faqKopf: { eyebrow: "Frequently asked questions", titel: "Agrivoltaics – good to know", lead: "Your question is not listed? Write to us via the farmers page – we will reply personally.", button: "Ask a question" },
    querverweise: [
      { titel: "For farmers", text: "Lease, invest yourself, investor or cooperative – with a decision aid." },
      { titel: "Agrivoltaics calculator", text: "Three routes with IRR, payback, CAP and contribution margin." },
      { titel: "Ground-mounted PV", text: "When the whole site is to be used for a solar park." },
      { titel: "Land check", text: "Suitability and capacity of your land in two minutes." },
      { titel: "DIN SPEC 91434 explained", text: "Categories, land loss and requirements in detail." },
      { titel: "Agrivoltaics funding & CAP", text: "Direct payments, EEG and building law at a glance." },
    ],
    cta: {
      eyebrow: "Agrivoltaics with a plan",
      titel: "Farming first, then the modules.",
      text: "We develop your use concept with you, plan in line with DIN SPEC 91434 and support you through permitting, construction and operation.",
      primaer: "Which route suits you?",
      sekundaer: "Agrivoltaics calculator",
    },
  },
};

// Länderinhalte (Ländermodell): gemeinsam = Stand vor Welle 2; AT = src/data/laender/at/agri-pv.js
const INHALT = {
  de: { gemeinsam: {}, AT: AGRI_PV_AT, CH: AGRI_PV_CH }, // CH = src/data/laender/ch/agri-pv.js
  en: { gemeinsam: {}, AT: AGRI_PV_AT_EN, CH: AGRI_PV_CH_EN },
};

export default async function AgriPvPage({ params }) {
  const land = await seitenLand(params);
  const sprache = spracheDerAnfrage();
  const w = uebersetze(TEXTE, sprache);
  const pct = w.pct;
  const t = inhaltFuerSprache(INHALT, land, sprache);
  const rahmen = t.rahmen ? t.rahmen.map((k) => (k.frist ? { ...k, x: k.x + w.eagFrist } : k)) : w.rahmenDe;
  return (
    <div>
      <JsonLd
        daten={{
          "@context": "https://schema.org",
          "@type": "Service",
          name: w.jsonLd.name,
          serviceType: w.jsonLd.serviceType,
          provider: { "@id": `${abs("/")}/#organization` },
          areaServed: ["DE", "AT", "CH"],
          url: abs(PFAD),
          description: w.jsonLd.description,
        }}
      />

      <AgriHero
        breadcrumbs={[{ name: w.hero.brotkrumen }]}
        pill={{ href: "#norm", ...w.hero.pill }}
        titel={
          <>
            {w.hero.titelA}<span className="ov-text-gradient-light">{w.hero.titelB}</span>
          </>
        }
        lead={w.hero.lead}
        aktionen={[
          { label: w.hero.aktionen[0], href: pfad("/rechner/agri-pv") },
          { label: w.hero.aktionen[1], href: pfad("/landwirte") },
        ]}
        unterzeile={w.hero.unterzeile}
        punkte={t.heroPunkte ?? w.hero.punkte}
        hinweis={{ ...w.hero.hinweis, href: pfad("/flaechencheck") }}
        karten={[
          { icon: Ruler, ...w.hero.karten[0] },
          { icon: Wheat, ...w.hero.karten[1] },
          { icon: Sprout, ...w.hero.karten[2] },
        ]}
      />

      <Faktenleiste
        titel={w.faktenTitel}
        fakten={t.fakten ?? w.fakten}
      />

      <Sprungleiste
        ziele={[
          { href: "#norm", label: w.sprung[0] },
          { href: "#systeme", label: w.sprung[1] },
          { href: "#kulturen", label: w.sprung[2] },
          { href: "#vorteile", label: w.sprung[3] },
          { href: "#rahmen", label: t.rahmenLabel ?? w.sprung[4] },
          { href: "#kosten", label: w.sprung[5] },
          { href: "#fragen", label: w.sprung[6] },
        ]}
      />

      <NormSektion id="norm" kat1Verlust={AGRI.flaechenverlustMaxKat1} kat2Verlust={AGRI.flaechenverlustMaxKat2} mindestErtrag={AGRI.mindestErtrag} pct={pct} />

      {/* Systeme */}
      <Section tone="sand" space="lg" id="systeme" className="scroll-mt-24">
        <div className="mb-10 grid gap-x-16 gap-y-6 md:mb-14 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:items-end">
          <SectionHeading eyebrow={w.systemeKopf.eyebrow} title={w.systemeKopf.titel} />
          <Reveal delay={80}>
            <p className="ov-lead text-pretty text-ink-600">{w.systemeKopf.lead}</p>
          </Reveal>
        </div>

        <Reveal>
          <SystemWahl systeme={w.systeme} skala={{ flaeche: 3, ertrag: 1.2, invest: 1400 }} fussnote={w.fussnote + (t.fussnoteZusatz ?? "")} />
        </Reveal>

        {/* Vergleichstabelle */}
        <details className="group mt-6 overflow-hidden rounded-[1.75rem] bg-white ring-1 ring-ink-200/70">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-6 py-5 transition-colors hover:bg-sand-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ov-500 md:px-8 [&::-webkit-details-marker]:hidden">
            <span>
              <span className="block font-display text-[17px] font-bold text-ink-900">{w.tabelleKopf.titel}</span>
              <span className="mt-0.5 block text-[14px] text-ink-500">{w.tabelleKopf.text}</span>
            </span>
            <span aria-hidden="true" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-sand-50 ring-1 ring-ink-200 transition-transform duration-300 group-open:rotate-180 motion-reduce:transition-none">
              <ChevronDown className="h-5 w-5 text-ink-700" />
            </span>
          </summary>
          <div className="border-t border-ink-100">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[860px] border-collapse text-left text-[14.5px]">
                <caption className="sr-only">{w.tabelleKopf.caption}</caption>
                <thead>
                  <tr className="bg-navy-950 text-white">
                    {w.tabelle.kopf.map((k, i) => (
                      <th key={k || i} scope="col" className="px-5 py-4 font-display text-[15px] font-bold">
                        {k || <span className="sr-only">{w.tabelleKopf.merkmal}</span>}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {w.tabelle.zeilen.map(([label, ...werte], i) => (
                    <tr key={label} className={i % 2 ? "bg-sand-50" : "bg-white"}>
                      <th scope="row" className="sticky left-0 bg-inherit px-5 py-3.5 align-top font-semibold text-ink-800">
                        {label}
                      </th>
                      {werte.map((wert, j) => (
                        <td key={j} className="px-5 py-3.5 align-top leading-snug text-ink-600">
                          {wert}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="px-6 pb-4 pt-3 text-[12.5px] text-ink-500 md:hidden">{w.tabelleKopf.wischen}</p>
          </div>
        </details>
      </Section>

      {/* Kulturen & Tiere */}
      <Section tone="white" space="lg" id="kulturen" className="scroll-mt-24">
        <div className="mb-10 grid gap-x-16 gap-y-6 md:mb-14 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:items-end">
          <SectionHeading eyebrow={w.kulturenKopf.eyebrow} title={w.kulturenKopf.titel} />
          <Reveal delay={80}>
            <p className="ov-lead text-pretty text-ink-600">{w.kulturenKopf.lead}</p>
          </Reveal>
        </div>
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {w.kulturen.map((k, i) => (
            <Reveal as="li" key={i} delay={(i % 3) * 70} className="ov-lift group relative flex flex-col overflow-hidden rounded-[1.75rem] bg-white p-6 shadow-e1 ring-1 ring-ink-200/70 md:p-7">
              <span aria-hidden="true" className="pointer-events-none absolute -right-14 -top-14 h-40 w-40 rounded-full bg-sand-100 opacity-70 blur-2xl transition-opacity duration-300 group-hover:opacity-100" />
              <span aria-hidden="true" className={`relative flex h-12 w-12 items-center justify-center rounded-2xl ring-1 ring-inset ${KULTUR_TON[k.ton]}`}>
                <k.icon className="h-6 w-6" strokeWidth={1.8} />
              </span>
              <h3 className="relative mt-5 font-display text-[19px] font-bold tracking-[-0.01em] text-ink-900">{k.title}</h3>
              <p className="relative mt-2 text-pretty text-[15px] leading-relaxed text-ink-600">{k.text}</p>
              <p className="relative mt-auto flex flex-wrap items-center gap-2 pt-5 text-[12.5px]">
                <span className="text-ink-500">{w.kulturenKopf.passt}</span>
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
              <Eyebrow dark className="mb-4">{w.vorteileKopf.eyebrow}</Eyebrow>
              <h2 id="vorteile-titel" className="ov-h2 text-balance text-white">{w.vorteileKopf.titel}</h2>
            </Reveal>
            <Reveal delay={80}>
              <p className="ov-lead text-pretty text-white/70">{w.vorteileKopf.lead}</p>
            </Reveal>
          </div>
          <div className="mt-12 grid gap-5 md:mt-16 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:gap-6">
            <Reveal>
              <Landnutzung
                werte={[
                  { ...w.vorteileKopf.werte[0], wert: 1.6, text: "160 %" },
                  { ...w.vorteileKopf.werte[1], wert: 1.86, text: "186 %" },
                ]}
                quelle={w.vorteileKopf.quelle}
              />
            </Reveal>
            <ul className="grid gap-4 sm:grid-cols-2">
              {w.vorteile.map((v, i) => (
                <Reveal as="li" key={i} delay={i * 70} className="rounded-[1.5rem] bg-white/[0.04] p-6 ring-1 ring-inset ring-white/10 transition-colors hover:bg-white/[0.07]">
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
          <SectionHeading eyebrow={t.rahmenLabel ?? w.rahmenKopf.label} title={t.rahmenTitel ?? w.rahmenKopf.titel} />
          <Reveal delay={80}>
            <p className="ov-lead text-pretty text-ink-600">{w.rahmenKopf.lead}</p>
          </Reveal>
        </div>

        <div className="grid gap-5 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
          <Reveal className="rounded-[1.75rem] bg-sand-50 p-2 ring-1 ring-ink-200/60">
            <div className="flex items-center gap-3 px-4 pb-3 pt-4 md:px-6">
              <span className="flex h-8 min-w-8 items-center justify-center rounded-lg bg-navy-950 px-2 text-[12px] font-bold tracking-[0.06em] text-white">{t.rahmenLand?.kurz ?? "DE"}</span>
              <p className="font-display text-[17px] font-bold text-ink-900">{t.rahmenLand?.name ?? w.rahmenKopf.landName}</p>
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              {rahmen.map((k, i) => (
                <div key={i} className="rounded-[1.35rem] bg-white p-5 shadow-e1 ring-1 ring-ink-200/60 md:p-6">
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
            {(t.nachbarn ?? w.nachbarn).map((k, i) => (
              <Reveal key={k.kz} delay={80 + i * 70} className="rounded-[1.75rem] bg-white p-6 shadow-e1 ring-1 ring-ink-200/70 md:p-7">
                <div className="flex items-center gap-3">
                  <span className="flex h-8 min-w-8 items-center justify-center rounded-lg bg-ov-600 px-2 text-[12px] font-bold tracking-[0.06em] text-white">{k.kz}</span>
                  <h3 className="font-display text-[17.5px] font-bold text-ink-900">{k.t}</h3>
                </div>
                <p className="mt-3 text-pretty text-[14.5px] leading-relaxed text-ink-600">{k.x}</p>
              </Reveal>
            ))}
            <Reveal delay={220} className="ov-noise relative flex flex-1 flex-col justify-between gap-6 overflow-hidden rounded-[1.75rem] bg-navy-950 p-6 text-white md:p-7">
              <div aria-hidden="true" className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-ov-500/25 blur-3xl" />
              <p className="relative text-pretty text-[14px] leading-relaxed text-white/75">{t.rahmenFuss ?? w.rahmenKopf.fuss}</p>
              <Button href={pfad("/landwirte#anfrage")} variant="white" pfeil className="relative w-full sm:w-auto sm:self-start">
                {w.rahmenKopf.button}
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
              eyebrow={w.kosten.eyebrow}
              title={w.kosten.titel}
              lead={t.kostenLead ?? w.kosten.lead}
            />
            <Reveal delay={120} className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
              <Button href={pfad("/rechner/agri-pv")} variant="navy" size="lg" pfeil className="w-full sm:w-auto">
                {w.kosten.rechnen}
              </Button>
              <Link href={pfad("/landwirte")} className="group inline-flex items-center justify-center gap-1.5 whitespace-nowrap rounded-full px-4 py-3 text-[15px] font-semibold text-ov-800 transition-colors hover:text-ov-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ov-500">
                {w.kosten.weg}
                <ArrowRight aria-hidden="true" className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5 motion-reduce:transition-none" />
              </Link>
            </Reveal>
          </div>
          <div className="grid gap-4">
            <Reveal dir="right">
              <Spannen
                titel={w.kosten.spannenTitel}
                fmt={w.fmtZahl}
                achse={{ max: 1400, schritt: 200, einheit: "€/kWp" }}
                zeilen={[
                  { ...w.kosten.zeilen[0], min: FREIFLAECHE.capexProKwp.min, max: FREIFLAECHE.capexProKwp.max },
                  { ...w.kosten.zeilen[1], min: AGRI.capexProKwp.vertikal.min, max: AGRI.capexProKwp.vertikal.max, hervor: true },
                  { ...w.kosten.zeilen[2], min: AGRI.capexProKwp.hoch.min, max: AGRI.capexProKwp.hoch.max, hervor: true },
                ]}
              />
            </Reveal>
            {t.kostenHinweis ? (
              <LandHinweis land={land} zeile text={INHALT.de[land]?.kostenHinweis} textEn={INHALT.en[land]?.kostenHinweis} />
            ) : (
            <Reveal dir="right" delay={80} className="ov-noise relative flex flex-col gap-4 overflow-hidden rounded-[1.75rem] bg-ov-700 p-6 text-white sm:flex-row sm:items-center sm:justify-between sm:p-7">
              <div aria-hidden="true" className="pointer-events-none absolute -right-10 -top-16 h-48 w-48 rounded-full bg-sun-300/25 blur-3xl" />
              <div className="relative">
                <p className="text-[13px] font-semibold uppercase tracking-[0.12em] text-white/80">{w.kosten.pacht}</p>
                <p className="ov-num mt-1 font-display text-[30px] font-extrabold tracking-tight md:text-[34px]">
                  {w.kosten.pachtWert}
                </p>
              </div>
              <p className="relative self-start rounded-full bg-white/15 px-4 py-2 text-[14px] sm:self-auto font-semibold ring-1 ring-inset ring-white/25">{w.kosten.plus}</p>
            </Reveal>
            )}
            <p className="text-[12.5px] leading-relaxed text-ink-500">{w.kosten.fuss}{!land && <> <GiltFuer /></>}</p>
          </div>
        </div>
      </Section>

      <Section tone="white" space="lg" id="fragen" className="scroll-mt-24">
        <div className="grid gap-12 lg:grid-cols-[0.8fr_1.2fr] lg:gap-20">
          <SectionHeading eyebrow={w.faqKopf.eyebrow} title={w.faqKopf.titel} lead={w.faqKopf.lead}>
            <div className="mt-8">
              <Button href={pfad("/landwirte#anfrage")} variant="secondary" pfeil>
                {w.faqKopf.button}
              </Button>
            </div>
          </SectionHeading>
          <Faq items={t.faq ? t.faq(w.faq) : w.faq} />
        </div>
      </Section>

      <Querverweise
        items={t.querverweise ?? w.querverweise}
      />

      <CtaBand
        eyebrow={w.cta.eyebrow}
        title={w.cta.titel}
        text={w.cta.text}
        primary={{ label: w.cta.primaer, href: pfad("/landwirte") }}
        secondary={{ label: w.cta.sekundaer, href: pfad("/rechner/agri-pv") }}
      />
    </div>
  );
}

// CH: eigener Titel und eigene Beschreibung (Länderinhalt src/data/laender/ch/agri-pv.js)
const metadataEn = {
  title: TITEL_EN,
  description: BESCHREIBUNG_EN,
  openGraph: { title: TITEL_EN, description: BESCHREIBUNG_EN, images: [{ alt: "Module rows on agricultural land" }] },
};

const metadataFuer = (land, p) => {
  const en = p?.sprache === "en";
  const basis = en ? uebersetze({ de: metadata, en: metadataEn }, "en") : metadata;
  if (land !== "CH") return basis;
  const ch = en ? AGRI_PV_CH_EN.metadata : AGRI_PV_CH.metadata;
  return { ...basis, ...ch, openGraph: { ...basis.openGraph, ...AGRI_PV_CH.metadata.openGraph, ...ch.openGraph } };
};

export const generateMetadata = seitenMetadata("/agri-pv", metadataFuer);
