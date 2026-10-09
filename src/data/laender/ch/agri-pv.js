// Länderinhalt CH für /agri-pv (Ländermodell, Inhalte CH – Gruppe 1). Gleiche Schlüssel wie AT (src/data/laender/at/agri-pv.js).
//
// Quellen (nur geprüfte Aussagen, Stammdaten src/data/regionen/schweiz.js, Recherche 29.09.2026, Nachprüfung 03.10.2026):
//   RPG Stand 01.01.2026, Art. 24ter Abs. 2 (Vorteil für die Produktion oder Versuchs-/Forschungszweck, Interessenabwägung);
//   Kanton Luzern Merkblatt Solaranlagen (ab 01.01.2026); Schweizer Bauernverband, Positionspapier 09.01.2025
//   (Sonder-/Dauerkulturen; Direktzahlungen nach Art. 16 LBV – als Position des SBV zitiert);
//   energeiaplus (BFE) 28.05.2026 (Gelfingen LU > 7'000 m² Himbeeren, Agroscope Conthey, 2 MWp Waadt);
//   Pronovo PV-Auktionen 2026 (HEIV/Marktprämie ab 150 kW ohne Eigenverbrauch).
//   AT-Vergleich aus dem AT-Team (§ 33 EAG, RIS 04.10.2026).
// NICHT geprüft für CH (→ kein Wert, LandHinweis): Agri-PV-Pacht in CHF, Kosten je kWp, Anteil beitragsberechtigter Fläche.
// Bewusst weggelassen (in schweiz.js als unsicher vermerkt): Anforderungen an Fruchtfolgeflächen aus den RPV-Erläuterungen.

import { Landmark, MapPinned, Ruler, Sprout, Sun, Wheat } from "lucide-react";
import { AGRI } from "@/lib/invest/markt";
import { fmt } from "@/lib/rechner/annahmen";
import { chText } from "./schreibung.js";
import { fmtZahl } from "@/lib/sprache/format";

export const AGRI_PV_CH = {
  metadata: {
    title: "Agri-PV in der Schweiz: Art. 24ter RPG und Direktzahlungen | ÖkoInvest",
    description: "Agri-PV in der Schweiz: Bewilligung nur mit Vorteil für die landwirtschaftliche Produktion (Art. 24ter RPG), Direktzahlungen, Sonderkulturen und Förderung über HEIV.",
    openGraph: { locale: "de_CH", title: "Agri-PV in der Schweiz | ÖkoInvest", description: "Art. 24ter RPG, Direktzahlungen, Sonderkulturen und Förderung im Überblick." },
  },
  heroPunkte: ["Geplant nach DIN SPEC 91434 – Kategorie I & II", "Vorteil für die Produktion nach Art. 24ter RPG", "Direktzahlungen vorab mit dem Kanton geklärt", "Rahmen für die Schweiz, Deutschland und Österreich"],
  fakten: [
    { icon: Ruler, wert: "2,10", suffix: "m", einheit: "Lichte Höhe", text: "Mindestmass für Kategorie I nach DIN SPEC 91434 – Bewirtschaftung unter den Modulen" },
    { icon: Sprout, wert: fmt(AGRI.mindestErtrag * 100), suffix: "%", einheit: "Mindestertrag", text: "des Referenzertrags bleibt nach DIN SPEC 91434 landwirtschaftlich erhalten" },
    { icon: Landmark, wert: "Abs. 2", einheit: "Art. 24ter RPG", text: "auf Nutzfläche nur mit Vorteil für die Produktion oder zu Forschungszwecken" },
    { icon: MapPinned, wert: "7’000", suffix: "m²", einheit: "Praxisbeispiel Luzern", text: "über Himbeeren in Gelfingen testet ein Betrieb drei Agri-PV-Systeme (BFE)" },
  ],
  rahmenLabel: "RPG, Direktzahlungen, Förderung",
  rahmenTitel: "Die Rahmenbedingungen in der Schweiz – und wie es in DE und AT aussieht.",
  rahmenLand: { kurz: "CH", name: "Schweiz" },
  rahmen: [
    {
      icon: Landmark,
      t: "Vorteil für die Produktion",
      x: "Auf landwirtschaftlicher Nutzfläche ist eine Solaranlage nur standortgebunden, wenn sie die landwirtschaftlichen Interessen nicht beeinträchtigt und der Produktion Vorteile bringt – etwa Wetterschutz, Ertrags- oder Qualitätssteigerung – oder wenn sie Versuchs- und Forschungszwecken dient (Art. 24ter Abs. 2 RPG). Dazu kommt eine umfassende Interessenabwägung.",
    },
    {
      icon: Sprout,
      t: "Sonder- und Dauerkulturen",
      x: "Der Schweizer Bauernverband sieht Agri-PV vor allem über Sonder- und Dauerkulturen wie Beeren oder Obst mit Hagel- und Witterungsschutz, Anlagen auf Acker- und Grünland dagegen nicht. Agroscope forscht in Conthey (VS) zu Beeren und Obst, im Kanton Waadt schützt eine 2-MWp-Anlage Bio-Heidelbeeren.",
    },
    {
      icon: Wheat,
      t: "Direktzahlungen",
      x: "Flächen mit Solaranlagen zählen grundsätzlich nicht zur landwirtschaftlichen Nutzfläche. Nach dem Positionspapier des Bauernverbands bleiben sie beitragsberechtigt, wenn die Anlage als Agri-PV mit Vorteil für die Produktion oder zu Forschungszwecken rechtskräftig bewilligt ist. Klären Sie das vorab mit dem kantonalen Landwirtschaftsamt.",
    },
    {
      icon: Sun,
      t: "Förderung",
      x: "Anlagen ab 150 kW ohne Eigenverbrauch bewerben sich bei Pronovo um die hohe Einmalvergütung (HEIV) oder die gleitende Marktprämie. Für Anlagen mit Eigenverbrauch – etwa am Hof – gibt es die Einmalvergütung.",
    },
  ],
  nachbarn: [
    {
      kz: "DE",
      t: "Deutschland",
      x: `Agri-PV nach DIN SPEC 91434 bleibt in der Regel GAP-beihilfefähig, ist hofnah bis ${fmt(AGRI.privilegierungHa, 1)} ha im Aussenbereich privilegiert (§ 35 BauGB) und gilt im EEG als besondere Solaranlage – auch auf Ackerflächen ausserhalb der Kulisse.`,
    },
    {
      kz: "AT",
      t: "Österreich",
      x: "Agri-PV braucht in der Regel eine passende Widmung nach Landesraumordnung; mehrere Bundesländer erleichtern Agri-PV gegenüber reinen Freiflächenanlagen. Bei der EAG-Marktprämie entfällt für Agri-PV der Abschlag von 25 % für Acker- und Grünland (§ 33 EAG).",
    },
  ],
  rahmenFuss: "Stand 04.10.2026, ohne Gewähr und ohne Rechtsberatung. Bundesrecht und kantonale Vorgaben ändern sich häufig – wir prüfen die aktuelle Lage für Ihre Parzelle und stimmen uns mit Gemeinde, Kanton und kantonalem Landwirtschaftsamt ab.",
  kostenLead:
    "Agri-PV braucht mehr Stahl und mehr Fläche je Megawatt. In der Schweiz zählt vor allem der belegte Vorteil für die Produktion – etwa Hagel- und Witterungsschutz über Beeren oder Obst. Ehrlich gesagt: Hoch aufgeständerte Systeme rechnen sich meist nur bei wertvollen Sonderkulturen.",
  kostenHinweis: "Pacht- und Kostenwerte für Agri-PV in der Schweiz werden geprüft – Ergebnis auf Anfrage. Die Spannen oben sind Orientierungswerte aus Deutschland in Euro.",
  fussnoteZusatz: " Kostenwerte für Deutschland in Euro; Werte für die Schweiz werden geprüft – Ergebnis auf Anfrage.",
  faq: (FAQ) =>
    FAQ.map((f) => {
      if (f.q.startsWith("Bleiben die GAP"))
        return {
          q: "Bleiben die Direktzahlungen erhalten?",
          a: "Nicht zwingend. Flächen mit Solaranlagen zählen grundsätzlich nicht zur landwirtschaftlichen Nutzfläche. Nach dem Positionspapier des Schweizer Bauernverbands bleiben sie aber beitragsberechtigt, wenn die Anlage als Agri-PV mit Vorteil für die Produktion oder zu Forschungszwecken rechtskräftig bewilligt ist und Sie die Fläche als Eigentümer oder mit schriftlichem Pachtvertrag bewirtschaften. Klären Sie das vorab mit dem kantonalen Landwirtschaftsamt.",
        };
      if (f.q.startsWith("Braucht Agri-PV einen Bebauungsplan"))
        return {
          q: "Braucht Agri-PV in der Schweiz eine Bewilligung?",
          a: "Ja. Ausserhalb der Bauzone braucht es eine Ausnahmebewilligung des Kantons; das Baugesuch wird bei der Gemeinde eingereicht und öffentlich aufgelegt. Bewilligt wird nur, wenn die Anlage der landwirtschaftlichen Produktion Vorteile bringt oder Versuchs- und Forschungszwecken dient (Art. 24ter Abs. 2 RPG), nach einer umfassenden Interessenabwägung. Grössere Anlagen brauchen je nach Kanton zusätzlich eine Nutzungsplanung.",
        };
      if (f.q.startsWith("Lohnt sich Agri-PV"))
        return {
          q: f.q,
          a: "Agri-PV ist teurer als ein klassischer Solarpark. In der Schweiz lohnt sie sich vor allem dort, wo sie Kulturen schützt – bei Beeren, Obst oder anderen Sonderkulturen. Ab 150 kW ohne Eigenverbrauch steht die Förderung über HEIV oder Marktprämie offen. Kosten- und Pachtwerte für die Schweiz werden geprüft – eine Einschätzung für Ihre Parzelle erhalten Sie auf Anfrage.",
        };
      if (f.q.startsWith("Was unterscheidet Agri-PV"))
        return { q: f.q, a: chText(`${f.a} In der Schweiz muss die Anlage der Produktion zudem einen Vorteil bringen (Art. 24ter Abs. 2 RPG).`) };
      return { q: chText(f.q), a: chText(f.a) };
    }),
  querverweise: [
    { href: "/regionen/schweiz", titel: "Solarpark und Agri-PV in der Schweiz", text: "Art. 24ter RPG, Direktzahlungen, Praxisbeispiele und Kantone – mit Quellen." },
    { href: "/landwirte", titel: "Für Landwirte", text: "Verpachten, selbst investieren, Investor oder Genossenschaft – mit Entscheidungshilfe." },
    { href: "/freiflaeche", titel: "Freiflächen-PV", text: "Standortgebundenheit, Bewilligung durch Gemeinde und Kanton, HEIV-Auktion." },
    { href: "/ratgeber/freiflaechen-pv-schweiz", titel: "Freiflächen-PV in der Schweiz", text: "Raumplanungsrecht, Agri-PV und Solarexpress ausführlich erklärt." },
    { href: "/energiegemeinschaften", titel: "Energiegemeinschaften", text: "Strom vom Hof für die Gemeinde – mit LEG oder vZEV." },
    { href: "/ratgeber/agri-pv-din-spec-91434", titel: "DIN SPEC 91434 erklärt", text: "Kategorien, Flächenverlust und Anforderungen im Detail." },
  ],
};


// Englisch (Sprachmodell): Übersetzung von AGRI_PV_CH – gleiche Quellen, keine zusätzlichen Werte.
// Nur Texte; Icons, hrefs und Kennwerte kommen aus AGRI_PV_CH. faq arbeitet auf der englischen FAQ der Seite
// (Reihenfolge wie die deutsche FAQ: 0 Unterschied, 2 GAP/Direktzahlungen, 4 Bewilligung, 5 Wirtschaftlichkeit).
const zEn = (n, stellen = 0) => fmtZahl(n, stellen, "en");

export const AGRI_PV_CH_EN = {
  metadata: {
    title: "Agrivoltaics in Switzerland: Art. 24ter RPG and direct payments | ÖkoInvest",
    description: "Agrivoltaics in Switzerland: approval only with a benefit for agricultural production (Art. 24ter RPG, Swiss Spatial Planning Act), direct payments, special crops and funding via HEIV.",
    openGraph: { title: "Agrivoltaics in Switzerland | ÖkoInvest", description: "Art. 24ter RPG, direct payments, special crops and funding at a glance." },
  },
  heroPunkte: ["Planned under DIN SPEC 91434 – categories I & II", "Benefit for production under Art. 24ter RPG", "Direct payments clarified with the canton in advance", "Framework for Switzerland, Germany and Austria"],
  fakten: [
    { wert: "2.10", einheit: "Clearance", text: "minimum for category I under DIN SPEC 91434 – farming underneath the modules" },
    { wert: zEn(AGRI.mindestErtrag * 100), einheit: "Minimum yield", text: "of the reference yield is retained for agriculture under DIN SPEC 91434" },
    { wert: "para. 2", text: "on agricultural land only with a benefit for production or for research purposes" },
    { wert: zEn(7000), einheit: "Lucerne case study", text: "a farm in Gelfingen is testing three agrivoltaic systems over raspberries (SFOE)" },
  ],
  rahmenLabel: "RPG, direct payments, funding",
  rahmenTitel: "The framework in Switzerland – and how it looks in DE and AT.",
  rahmenLand: { name: "Switzerland" },
  rahmen: [
    {
      t: "Benefit for production",
      x: "On utilised agricultural area, a solar installation is only site-bound if it does not impair agricultural interests and benefits production – for example through weather protection or higher yields or quality – or if it serves trial and research purposes (Art. 24ter (2) RPG). A comprehensive weighing of interests is also required.",
    },
    {
      t: "Special and permanent crops",
      x: "The Swiss Farmers’ Union sees agrivoltaics mainly over special and permanent crops such as berries or fruit with protection against hail and weather, but not on arable land and grassland. Agroscope is researching berries and fruit in Conthey (VS), and in the canton of Vaud a 2 MWp installation protects organic blueberries.",
    },
    {
      t: "Direct payments",
      x: "Land with solar installations does not, in principle, count as utilised agricultural area. According to the Farmers’ Union’s position paper, it remains eligible for payments if the installation has been approved with legal effect as agrivoltaics with a benefit for production or for research purposes. Clarify this in advance with the cantonal agricultural office.",
    },
    {
      t: "Funding",
      x: "Installations from 150 kW without self-consumption bid at Pronovo for the high one-off remuneration (HEIV) or the sliding market premium. For installations with self-consumption – on the farm, for example – the one-off remuneration is available.",
    },
  ],
  nachbarn: [
    {
      t: "Germany",
      x: `Agrivoltaics under DIN SPEC 91434 generally remains eligible for CAP support, is privileged in the outer zone up to ${zEn(AGRI.privilegierungHa, 1)} ha close to the farm (§ 35 BauGB, German Federal Building Code) and counts as a special solar installation under the EEG – also on arable land outside the land categories.`,
    },
    {
      t: "Austria",
      x: "Agrivoltaics generally requires a suitable zoning designation (Widmung) under state spatial planning law; several federal states make agrivoltaics easier than pure ground-mounted plants. Under the EAG market premium, the 25 % reduction for arable land and grassland does not apply to agrivoltaics (§ 33 EAG).",
    },
  ],
  rahmenFuss: "As of 4 October 2026, without guarantee and not legal advice. Federal law and cantonal requirements change frequently – we check the current situation for your plot and coordinate with the municipality, the canton and the cantonal agricultural office.",
  kostenLead:
    "Agrivoltaics needs more steel and more land per megawatt. In Switzerland, what counts above all is a proven benefit for production – such as protection against hail and weather over berries or fruit. To be honest: elevated systems usually only pay off with valuable special crops.",
  kostenHinweis: "Lease and cost figures for agrivoltaics in Switzerland are being reviewed – result on request. The ranges above are guide values from Germany in euros.",
  fussnoteZusatz: " Cost figures for Germany in euros; figures for Switzerland are being reviewed – result on request.",
  faq: (FAQ) =>
    FAQ.map((f, i) => {
      if (i === 2)
        return {
          q: "Are direct payments retained?",
          a: "Not necessarily. Land with solar installations does not, in principle, count as utilised agricultural area. According to the position paper of the Swiss Farmers’ Union, however, it remains eligible for payments if the installation has been approved with legal effect as agrivoltaics with a benefit for production or for research purposes and you farm the land as owner or under a written lease. Clarify this in advance with the cantonal agricultural office.",
        };
      if (i === 4)
        return {
          q: "Does agrivoltaics need a permit in Switzerland?",
          a: "Yes. Outside the building zone, an exemption permit from the canton is required; the building application is submitted to the municipality and publicly displayed. Approval is only granted if the installation benefits agricultural production or serves trial and research purposes (Art. 24ter (2) RPG), following a comprehensive weighing of interests. Depending on the canton, larger installations also need land use planning.",
        };
      if (i === 5)
        return {
          q: f.q,
          a: "Agrivoltaics costs more than a conventional solar park. In Switzerland, it pays off above all where it protects crops – berries, fruit or other special crops. From 150 kW without self-consumption, funding via HEIV or the market premium is available. Cost and lease figures for Switzerland are being reviewed – you can request an assessment for your plot.",
        };
      if (i === 0) return { q: f.q, a: `${f.a} In Switzerland, the installation must also benefit production (Art. 24ter (2) RPG).` };
      return f;
    }),
  querverweise: [
    { titel: "Solar parks and agrivoltaics in Switzerland", text: "Art. 24ter RPG, direct payments, case studies and cantons – with sources." },
    { titel: "For farmers", text: "Lease, invest yourself, investor or cooperative – with a decision aid." },
    { titel: "Ground-mounted PV", text: "Site-bound status, permits from the municipality and canton, HEIV auction." },
    { titel: "Ground-mounted PV in Switzerland", text: "Spatial planning law, agrivoltaics and Solarexpress explained in detail." },
    { titel: "Energy communities", text: "Power from the farm for the municipality – with LEG or vZEV (local electricity communities and self-consumption groups)." },
    { titel: "DIN SPEC 91434 explained", text: "Categories, land loss and requirements in detail." },
  ],
};
