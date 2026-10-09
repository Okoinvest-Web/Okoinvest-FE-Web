// Länderinhalt AT für /agri-pv (Ländermodell, Inhalte AT – Gruppe 1).
//
// Quellen (nur geprüfte Aussagen):
//   § 33 EAG (RIS, abgerufen 04.10.2026): 25 % Abschlag auf Acker- und Grünland; entfällt für Agri-PV, sofern die
//     hauptsächliche landwirtschaftliche Nutzung nicht oder nur geringfügig beeinträchtigt wird.
//   Regionsdateien (src/data/regionen/kaernten.js, oberoesterreich.js; Recherche 29.09.2026): Kärnten – Agri-PV
//     über Intensivobst (Stein-/Kernobst), Geflügelhaltung oder Fischzucht ohne eigene Widmung (K-PhV 2024);
//     Oberösterreich – Agri-PV-Konzepte mit mind. 75 % landwirtschaftlich genutzter Fläche gelten als günstig.
//   EAG-Investitionszuschuss: Fristenkasten der Seite (src/data/regionen/fristen.js, EAG-Abwicklungsstelle).
// NICHT geprüft für AT (→ kein Wert): GAP-Anteil der förderfähigen Fläche (AMA-Regeln), Agri-PV-Pacht in €,
// Kosten je kWp in AT. Die DIN SPEC 91434 bleibt unser Planungsstandard (technische Norm, kein Landesrecht).

import { Landmark, MapPinned, Ruler, Scale, Sprout, Sun, ThermometerSun, Wheat } from "lucide-react";
import { AGRI } from "@/lib/invest/markt";
import { fmt } from "@/lib/rechner/annahmen";
import { fmtZahl } from "@/lib/sprache/format";

export const AGRI_PV_AT = {
  heroPunkte: ["Geplant nach DIN SPEC 91434 – Kategorie I & II", "Ohne EAG-Abschlag nach § 33 EAG", "Widmung nach Landesrecht geprüft", "Rahmen für Österreich, Deutschland und Schweiz"],
  fakten: [
    { icon: Ruler, wert: "2,10", suffix: "m", einheit: "Lichte Höhe", text: "Mindestmaß für Kategorie I nach DIN SPEC 91434 – Bewirtschaftung unter den Modulen" },
    { icon: Sprout, wert: fmt(AGRI.mindestErtrag * 100), suffix: "%", einheit: "Mindestertrag", text: "des Referenzertrags bleibt nach DIN SPEC 91434 landwirtschaftlich erhalten" },
    { icon: Scale, wert: "0", suffix: "%", einheit: "EAG-Abschlag", text: "für Agri-PV – statt 25 % für PV auf Acker- und Grünland (§ 33 EAG)" },
    { icon: MapPinned, wert: "9", einheit: "Landesregeln", text: "Widmung nach der Raumordnung des jeweiligen Bundeslandes" },
  ],
  rahmenLabel: "Widmung, EAG, GAP",
  rahmenTitel: "Die Rahmenbedingungen in Österreich – und wie es in DE und CH aussieht.",
  rahmenLand: { kurz: "AT", name: "Österreich" },
  rahmen: [
    {
      icon: Sun,
      t: "EAG: kein Abschlag",
      x: "Bei der Marktprämie sinkt der Zuschlagswert für PV auf landwirtschaftlich genutzten Flächen oder im Grünland um 25 %. Für Agri-PV entfällt dieser Abschlag, sofern die landwirtschaftliche Hauptnutzung nicht oder nur geringfügig beeinträchtigt wird (§ 33 EAG).",
    },
    {
      icon: Landmark,
      t: "Widmung nach Landesrecht",
      x: "Agri-PV braucht in der Regel eine Widmung nach der Raumordnung des Bundeslandes. Einige Länder haben eigene Regeln: In Kärnten ist Agri-PV über Intensivobst, Geflügelhaltung oder Fischzucht ohne eigene Widmung möglich, in Oberösterreich gelten Konzepte mit mindestens 75 % landwirtschaftlich genutzter Fläche als günstig.",
    },
    {
      icon: Wheat,
      t: "GAP und Mehrfachantrag",
      x: "Ob und in welchem Umfang die Fläche unter einer Agri-PV-Anlage förderfähig bleibt, regeln die Vorgaben der AMA. Entscheidend ist, dass die landwirtschaftliche Nutzung Hauptnutzung bleibt – wir klären die Details vorab mit Ihnen und Ihrer Landwirtschaftskammer.",
    },
    { icon: ThermometerSun, t: "Investitionszuschuss", x: "Kleinere Anlagen können einen EAG-Investitionszuschuss beantragen – Sätze und Fristen je Förderaufruf der EAG-Abwicklungsstelle.", frist: true },
  ],
  nachbarn: [
    {
      kz: "DE",
      t: "Deutschland",
      x: `Agri-PV nach DIN SPEC 91434 bleibt in der Regel GAP-beihilfefähig, ist hofnah bis ${fmt(AGRI.privilegierungHa, 1)} ha im Außenbereich privilegiert (§ 35 BauGB) und gilt im EEG als besondere Solaranlage – auch auf Ackerflächen außerhalb der Kulisse.`,
    },
    {
      kz: "CH",
      t: "Schweiz",
      x: "Außerhalb der Bauzone ist Agri-PV bewilligungsfähig, wenn sie Vorteile für die landwirtschaftliche Produktion bewirkt oder Versuchszwecken dient (Raumplanungsverordnung); die Regeln wurden 2026 angepasst. Kantonale Fachstellen früh einbinden.",
    },
  ],
  rahmenFuss: "Stand 04.10.2026, ohne Gewähr und ohne Rechtsberatung. Förder- und Planungsrecht ändern sich häufig – wir prüfen die aktuelle Lage für Ihren Standort und stimmen uns mit Landwirtschaftskammer, Gemeinde und Land ab.",
  kostenLead:
    "Agri-PV braucht mehr Stahl und mehr Fläche je Megawatt. In Österreich gleichen die weiterlaufende Ernte und der Entfall des EAG-Abschlags einen Teil davon aus. Ehrlich gesagt: Hoch aufgeständerte Systeme rechnen sich meist nur bei wertvollen Sonderkulturen.",
  kostenHinweis: "Pacht- und Kostenwerte für Agri-PV in Österreich werden geprüft – Ergebnis auf Anfrage. Die Spannen oben sind Orientierungswerte aus Deutschland.",
  fussnoteZusatz: " Kostenwerte für Deutschland; Werte für Österreich werden geprüft – Ergebnis auf Anfrage.",
  faq: (FAQ) =>
    FAQ.map((f) => {
      if (f.q.startsWith("Bleiben die GAP"))
        return {
          q: f.q,
          a: "Das regeln in Österreich die Vorgaben der AMA zum Mehrfachantrag. Entscheidend ist, dass die landwirtschaftliche Nutzung Hauptnutzung bleibt. Welcher Anteil der Fläche förderfähig bleibt, klären wir für Ihr System vorab mit Ihnen und Ihrer Landwirtschaftskammer – eine pauschale Zahl nennen wir dafür bewusst nicht.",
        };
      if (f.q.startsWith("Braucht Agri-PV einen Bebauungsplan"))
        return {
          q: "Braucht Agri-PV in Österreich eine Widmung?",
          a: "In der Regel ja – nach der Raumordnung des jeweiligen Bundeslandes. Manche Länder erleichtern Agri-PV gegenüber reinen Freiflächenanlagen: In Kärnten ist Agri-PV über Intensivobst, Geflügelhaltung oder Fischzucht ohne eigene Widmung möglich. Welche Regeln für Ihre Fläche gelten, prüfen wir mit Gemeinde und Land.",
        };
      if (f.q.startsWith("Lohnt sich Agri-PV"))
        return {
          q: f.q,
          a: "Agri-PV ist teurer als ein klassischer Solarpark. Dafür entfällt bei der EAG-Marktprämie der Abschlag von 25 %, der für PV auf Acker- und Grünland gilt (§ 33 EAG), und die Ernte bleibt. Kosten- und Pachtwerte für Österreich werden geprüft – eine Einschätzung für Ihre Fläche erhalten Sie auf Anfrage.",
        };
      if (f.q.startsWith("Was unterscheidet Agri-PV"))
        return { q: f.q, a: `${f.a} In Österreich ist Agri-PV zudem vom EAG-Abschlag für Acker- und Grünland ausgenommen.` };
      return f;
    }),
  querverweise: [
    { href: "/landwirte", titel: "Für Landwirte", text: "Verpachten, selbst investieren, Investor oder Genossenschaft – mit Entscheidungshilfe." },
    { href: "/freiflaeche", titel: "Freiflächen-PV", text: "Widmung, Zonen und EAG-Abschlag, wenn die Fläche ganz für einen Solarpark genutzt wird." },
    { href: "/regionen", titel: "Regionen in Österreich", text: "Widmung, Zonen und Agri-PV-Regeln je Bundesland – mit Quellen." },
    { href: "/flaechencheck", titel: "Flächencheck", text: "Eignung und Leistung Ihrer Fläche in zwei Minuten." },
    { href: "/energiegemeinschaften", titel: "Energiegemeinschaften", text: "Strom vom Hof für Gemeinde und Nachbarn im Nahebereich." },
    { href: "/ratgeber/agri-pv-din-spec-91434", titel: "DIN SPEC 91434 erklärt", text: "Kategorien, Flächenverlust und Anforderungen im Detail." },
  ],
};


// Englisch (Sprachmodell): Übersetzung von AGRI_PV_AT – gleiche Quellen, keine zusätzlichen Werte.
// Nur Texte; Icons, hrefs und Kennwerte kommen aus AGRI_PV_AT (Zusammenführung in inhaltFuerSprache()).
// faq: arbeitet auf der englischen FAQ der Seite (Reihenfolge wie die deutsche FAQ: 0 Unterschied,
// 2 GAP, 4 Bebauungsplan, 5 Wirtschaftlichkeit).
const zEn = (n, stellen = 0) => fmtZahl(n, stellen, "en");

export const AGRI_PV_AT_EN = {
  heroPunkte: ["Planned under DIN SPEC 91434 – categories I & II", "No EAG reduction under § 33 EAG", "Zoning (Widmung) under state law checked", "Framework for Austria, Germany and Switzerland"],
  fakten: [
    { wert: "2.10", einheit: "Clearance", text: "minimum for category I under DIN SPEC 91434 – farming underneath the modules" },
    { wert: zEn(AGRI.mindestErtrag * 100), einheit: "Minimum yield", text: "of the reference yield is retained for agriculture under DIN SPEC 91434" },
    { einheit: "EAG reduction", text: "for agrivoltaics – instead of 25 % for PV on arable land and grassland (§ 33 EAG)" },
    { einheit: "State rules", text: "zoning (Widmung) under the spatial planning law of the respective federal state" },
  ],
  rahmenLabel: "Zoning, EAG, CAP",
  rahmenTitel: "The framework in Austria – and how it looks in DE and CH.",
  rahmenLand: { name: "Austria" },
  rahmen: [
    {
      t: "EAG: no reduction",
      x: "Under the market premium, the award value for PV on agriculturally used land or in grassland is reduced by 25 %. For agrivoltaics, this reduction does not apply, provided the main agricultural use is not impaired or only slightly impaired (§ 33 EAG, Austrian Renewable Energy Expansion Act).",
    },
    {
      t: "Zoning under state law",
      x: "Agrivoltaics generally needs a zoning designation (Widmung) under the spatial planning law of the federal state. Some states have their own rules: in Carinthia, agrivoltaics over intensive fruit growing, poultry farming or fish farming is possible without separate zoning; in Upper Austria, concepts with at least 75 % agriculturally used land are considered favourable.",
    },
    {
      t: "CAP and multiple application",
      x: "Whether and to what extent the land under an agrivoltaic installation remains eligible for support is governed by the requirements of the AMA (Agrarmarkt Austria). What matters is that agricultural use remains the main use – we clarify the details in advance with you and your chamber of agriculture.",
    },
    { t: "Investment grant", x: "Smaller installations can apply for an EAG investment grant – rates and deadlines per funding call of the EAG settlement agency (EAG-Abwicklungsstelle)." },
  ],
  nachbarn: [
    {
      t: "Germany",
      x: `Agrivoltaics under DIN SPEC 91434 generally remains eligible for CAP support, is privileged in the outer zone up to ${zEn(AGRI.privilegierungHa, 1)} ha close to the farm (§ 35 BauGB, German Federal Building Code) and counts as a special solar installation under the EEG – also on arable land outside the land categories.`,
    },
    {
      t: "Switzerland",
      x: "Outside the building zone, agrivoltaics can be approved if it benefits agricultural production or serves trial purposes (Spatial Planning Ordinance); the rules were amended in 2026. Involve cantonal specialist agencies early.",
    },
  ],
  rahmenFuss: "As of 4 October 2026, without guarantee and not legal advice. Funding and planning law change frequently – we check the current situation for your site and coordinate with the chamber of agriculture, the municipality and the federal state.",
  kostenLead:
    "Agrivoltaics needs more steel and more land per megawatt. In Austria, the continuing harvest and the exemption from the EAG reduction offset part of this. To be honest: elevated systems usually only pay off with valuable special crops.",
  kostenHinweis: "Lease and cost figures for agrivoltaics in Austria are being reviewed – result on request. The ranges above are guide values from Germany.",
  fussnoteZusatz: " Cost figures for Germany; figures for Austria are being reviewed – result on request.",
  faq: (FAQ) =>
    FAQ.map((f, i) => {
      if (i === 2)
        return {
          q: f.q,
          a: "In Austria, this is governed by the AMA (Agrarmarkt Austria) requirements for the multiple application. What matters is that agricultural use remains the main use. We clarify in advance with you and your chamber of agriculture what share of the land remains eligible for your system – we deliberately do not give a flat figure for this.",
        };
      if (i === 4)
        return {
          q: "Does agrivoltaics need zoning in Austria?",
          a: "As a rule, yes – under the spatial planning law of the respective federal state (Widmung). Some states make agrivoltaics easier than pure ground-mounted plants: in Carinthia, agrivoltaics over intensive fruit growing, poultry farming or fish farming is possible without separate zoning. We check with the municipality and the state which rules apply to your land.",
        };
      if (i === 5)
        return {
          q: f.q,
          a: "Agrivoltaics costs more than a conventional solar park. In return, the 25 % reduction that applies to PV on arable land and grassland under the EAG market premium does not apply (§ 33 EAG), and the harvest continues. Cost and lease figures for Austria are being reviewed – you can request an assessment for your land.",
        };
      if (i === 0) return { q: f.q, a: `${f.a} In Austria, agrivoltaics is also exempt from the EAG reduction for arable land and grassland.` };
      return f;
    }),
  querverweise: [
    { titel: "For farmers", text: "Lease, invest yourself, investor or cooperative – with a decision aid." },
    { titel: "Ground-mounted PV", text: "Zoning, zones and the EAG reduction when the whole site is used for a solar park." },
    { titel: "Regions in Austria", text: "Zoning, zones and agrivoltaics rules by federal state – with sources." },
    { titel: "Land check", text: "Suitability and capacity of your land in two minutes." },
    { titel: "Energy communities", text: "Power from the farm for the municipality and neighbours nearby." },
    { titel: "DIN SPEC 91434 explained", text: "Categories, land loss and requirements in detail." },
  ],
};
