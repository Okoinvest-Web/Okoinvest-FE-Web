// Ratgeber: DIN SPEC 91434 erklärt – Kategorien, Flächenverlust, 66-%-Regel, Nutzungskonzept
// Recherchestand 29.09.2026. Primärquellen: DIN SPEC 91434:2021-05 (Abschnitte 4–7,
// Anhang A), DIN SPEC 91492:2024-06 (Nutztierhaltung), § 12 Abs. 5 GAPDZV,
// BNetzA-Festlegung besondere Solaranlagen (PM 01.10.2021), C.A.R.M.E.N. zur
// Festlegung Grünland-PV (06/2023), Clearingstelle EEG|KWKG (Rechtsfrage 229).
// Grenzwerte und Bauart-Kennzahlen aus @/lib/invest/markt (AGRI, BAUART).

import { AGRI, BAUART } from "@/lib/invest/markt";
import { fmt, fmtPct } from "@/lib/rechner/annahmen";

/* ------------------------------------------------------------------ */
/* Werte, die (noch) nicht in markt.js stehen – mit Quelle             */
/* ------------------------------------------------------------------ */

// DIN SPEC 91434:2021-05, 6.4.2: Mindest-lichte Höhe Kategorie I
const LICHTE_HOEHE_M = 2.1;
// DIN SPEC 91434, 5.1/5.2.1: Nutzungskonzept für 3 Jahre oder einen Fruchtfolgezyklus
const KONZEPT_JAHRE = 3;
// DIN SPEC 91492:2024-06, 5.2.10: Flächenbesatz (Tiere je Fläche) mind. 85 % der Referenzfläche
const BESATZ_MIN_91492 = 0.85;
// DIN SPEC 91492:2024-06, 5.2.3: Flächenverlust höchstens 15 % (beide Kategorien)
const FLAECHENVERLUST_91492 = 0.15;
// C.A.R.M.E.N. e. V. zur BNetzA-Festlegung Grünland-PV: Nachweis alle 3 Jahre
const NACHWEIS_TURNUS_JAHRE = 3;

/* ------------------------------------------------------------------ */
/* Rechenbeispiele                                                     */
/* ------------------------------------------------------------------ */

// Beispiel Flächenbilanz vertikale Anlage (ANNAHMEN zur Veranschaulichung, keine Norm-Werte)
const FB = {
  gesamtHa: 10,
  reihenabstandM: 12, // Achsabstand der Modulreihen
  streifenM: 1.0, // nicht bearbeitbarer Streifen unter/neben der Reihe inkl. Rammschutz
  sonstigesHa: 0.3, // Trafostation, Wege, Wendeflächen, die nicht mehr bewirtschaftet werden
};
const FB_REIHEN = FB.streifenM / FB.reihenabstandM; // Anteil Streifen
const FB_SONST = FB.sonstigesHa / FB.gesamtHa;
const FB_VERLUST = FB_REIHEN + FB_SONST;

// Beispiel 66-%-Regel: Winterweizen, Referenzertrag (ANNAHME) in dt/ha
const REF_DT = 80;
const MIN_DT = REF_DT * AGRI.mindestErtrag;
const acker = AGRI.kulturen.find((k) => k.id === "acker");
const sonder = AGRI.kulturen.find((k) => k.id === "sonder");
const pct0 = (n) => fmtPct(n, 0);
const pct1 = (n) => fmtPct(n, 1);

const artikel = {
  slug: "agri-pv-din-spec-91434",
  title: "DIN SPEC 91434 erklärt: Was eine Agri-PV-Anlage erfüllen muss",
  seoTitle: "DIN SPEC 91434 einfach erklärt | ÖkoInvest",
  kurzTitel: "DIN SPEC 91434",
  description:
    "DIN SPEC 91434 erklärt: Kategorie I und II, max. 10 bzw. 15 % Flächenverlust, 66 % Mindestertrag, Nutzungskonzept und Nachweis – mit Rechenbeispielen.",
  excerpt:
    "Die DIN SPEC 91434 entscheidet, ob eine Solaranlage auf dem Acker als Agri-PV gilt – und damit über Direktzahlungen, EEG-Förderung und Baurecht. Die Anforderungen verständlich erklärt.",
  hauptKeyword: "din spec 91434",
  keywords: [
    "DIN SPEC 91434",
    "DIN SPEC 91434 Kategorie 1 2",
    "Agri-PV Flächenverlust 10 15 Prozent",
    "Agri-PV 66 Prozent Referenzertrag",
    "landwirtschaftliches Nutzungskonzept Agri-PV",
    "DIN SPEC 91492 Tierhaltung",
    "Agri-PV Anforderungen",
  ],
  veroeffentlicht: "2026-09-29",
  aktualisiert: "2026-09-29",
  kategorie: "Agri-PV & Landwirtschaft",
  bild: "/img/freiflaeche-begehung.jpg",
  bildAlt: "Zwei Fachkräfte mit Schutzhelm und Warnweste gehen zwischen aufgeständerten Solarmodulreihen über eine Wiese",
  badge: { wert: pct0(AGRI.mindestErtrag), text: "des Referenzertrags muss die Landwirtschaft mindestens bringen" },

  kurzFazit: [
    "**Die DIN SPEC 91434 legt fest, wann eine Solaranlage auf landwirtschaftlicher Fläche als Agri-PV gilt:** Die Landwirtschaft bleibt Hauptnutzung, der Strom ist Nebennutzung.",
    `**Kategorie I** (hoch aufgeständert, mindestens ${fmt(LICHTE_HOEHE_M, 2)} m lichte Höhe, Bewirtschaftung unter den Modulen) darf höchstens **${pct0(AGRI.flaechenverlustMaxKat1)}** der Fläche verbrauchen, **Kategorie II** (bodennah, Bewirtschaftung zwischen den Reihen) höchstens **${pct0(AGRI.flaechenverlustMaxKat2)}**.`,
    `Der landwirtschaftliche Ertrag muss mindestens **${pct0(AGRI.mindestErtrag)} des Referenzertrags** erreichen – Flächenverlust und Beschattung zusammengerechnet.`,
    `Pflicht ist ein **landwirtschaftliches Nutzungskonzept** für ${KONZEPT_JAHRE} Jahre oder einen Fruchtfolgezyklus, das Landwirt und Errichter gemeinsam unterzeichnen.`,
    "Die Norm ist der Maßstab für **GAP-Direktzahlungen, EEG-Förderung und Baurecht**. Für Weidehaltung ergänzt sie seit Juni 2024 die DIN SPEC 91492.",
  ],

  abschnitte: [
    {
      id: "antwort",
      titel: "Was regelt die DIN SPEC 91434?",
      tocLabel: "Kurze Antwort",
      bloecke: [
        {
          typ: "p",
          text: `**Die DIN SPEC 91434 definiert die Anforderungen an die landwirtschaftliche Hauptnutzung von [Agri-PV-Anlagen](/wissen/lexikon#agri-pv): Sie legt fest, wie viel Fläche die Anlage höchstens beanspruchen darf, welcher Ernteertrag bleiben muss, was ein landwirtschaftliches Nutzungskonzept enthalten muss und wie die Anlage geplant, gebaut und betrieben wird.** Sie grenzt damit echte Agri-PV von einem klassischen Solarpark ab, auf dem die Fläche nur noch gepflegt wird.`,
        },
        {
          typ: "p",
          text: "Formal ist die DIN SPEC 91434 keine vollwertige DIN-Norm, sondern eine sogenannte Vornorm (Spezifikation), die im Mai 2021 von einem Konsortium aus Forschung, Landwirtschaft, Industrie und Prüfinstituten erarbeitet wurde. Ihre Anwendung ist freiwillig – verbindlich wird sie, weil Gesetzgeber und Behörden auf sie verweisen: die GAP-Direktzahlungen-Verordnung, die Festlegung der Bundesnetzagentur für besondere Solaranlagen im EEG und viele Genehmigungsbehörden. Wer die Norm nicht einhält, riskiert Direktzahlungen und EEG-Förderung zugleich.",
        },
        {
          typ: "kennzahl",
          wert: pct0(AGRI.mindestErtrag),
          titel: "des Referenzertrags muss auf der Fläche mindestens geerntet werden",
          text: "So verlangt es Abschnitt 5.2.10 der DIN SPEC 91434. Anders gesagt: Die Ertragsminderung durch die Anlage darf höchstens ein Drittel betragen.",
        },
      ],
    },
    {
      id: "kategorien",
      titel: "Kategorie I und II: hoch aufgeständert oder bodennah",
      tocLabel: "Kategorien",
      bloecke: [
        {
          typ: "p",
          text: `**Die Norm unterscheidet zwei Bauweisen: Anlagen der Kategorie I stehen mit mindestens ${fmt(LICHTE_HOEHE_M, 2)} m lichter Höhe über der Kultur, bewirtschaftet wird unter den Modulen. Anlagen der Kategorie II sind bodennah aufgeständert, bewirtschaftet wird zwischen den Modulreihen.** Zu Kategorie II zählen sowohl schräg aufgeständerte Reihen als auch senkrecht stehende, meist beidseitig aktive ([bifaziale](/wissen/lexikon#bifazial)) Module und nachgeführte Systeme.`,
        },
        {
          typ: "tabelle",
          caption: "Kategorien und Nutzungsarten nach DIN SPEC 91434, Tabelle 1",
          kopf: ["Nutzung", "Kategorie I (unter den Modulen)", "Kategorie II (zwischen den Reihen)", "Beispiele"],
          zeilen: [
            ["A: Dauerkulturen und mehrjährige Kulturen", "1A", "2A", "Obst, Beeren, Wein, Hopfen"],
            ["B: Einjährige und überjährige Kulturen", "1B", "2B", "Ackerkulturen, Gemüse, Wechselgrünland, Ackerfutter"],
            ["C: Dauergrünland mit Schnittnutzung", "1C", "2C", "intensives und extensives Wirtschaftsgrünland"],
            ["D: Dauergrünland mit Weidenutzung", "1D", "2D", "Dauerweide, Portionsweide mit Rindern, Schafen, Geflügel u. a."],
          ],
          minBreite: 640,
          fussnote: "Anforderungen an die Tierhaltung (1D, 2D) sind nicht Gegenstand der DIN SPEC 91434, sondern der DIN SPEC 91492 (2024). Mischformen beider Kategorien sind möglich, müssen aber im Nutzungskonzept begründet werden.",
        },
        {
          typ: "p",
          text: `Wichtig für Kategorie II: Die Fläche unter Modulen mit weniger als ${fmt(LICHTE_HOEHE_M, 2)} m lichter Höhe gilt grundsätzlich als landwirtschaftlich nicht nutzbar. Nur wenn das Nutzungskonzept belegt, dass dort trotzdem bewirtschaftet wird und ${pct0(AGRI.mindestErtrag)} Ertrag erreicht werden, zählt sie zur nutzbaren Fläche. Bei senkrechten Modulreihen ist dieser Streifen schmal – ein Grund, warum vertikale Systeme für Acker und Grünland beliebt sind.`,
        },
        {
          typ: "p",
          text: "Die Norm schränkt außerdem Nutzungsänderungen ein: Mit dem Bau der Anlage darf eine Acker- oder Dauerkulturfläche (A, B) nicht in Grünland (C, D) umgewandelt werden. Sonst könnte man einen Acker mit Solarpark einfach zur extensiven Wiese erklären – genau das soll verhindert werden.",
        },
      ],
    },
    {
      id: "anforderungen",
      titel: "Die Anforderungen im Überblick",
      tocLabel: "Anforderungen",
      bloecke: [
        {
          typ: "tabelle",
          caption: "Kernanforderungen der DIN SPEC 91434 nach Kategorie, mit typischen Planungswerten",
          kopf: ["Kriterium", "Kategorie I (hoch)", "Kategorie II (bodennah/vertikal)"],
          zeilen: [
            ["Lichte Höhe", `mindestens ${fmt(LICHTE_HOEHE_M, 2)} m`, "keine Mindesthöhe"],
            ["Max. Flächenverlust", pct0(AGRI.flaechenverlustMaxKat1), pct0(AGRI.flaechenverlustMaxKat2)],
            ["Mindestertrag Landwirtschaft", `${pct0(AGRI.mindestErtrag)} des Referenzertrags`, `${pct0(AGRI.mindestErtrag)} des Referenzertrags`],
            ["Bewirtschaftung", "unter den Modulen, Lichtraumprofil für Maschinen", "zwischen den Reihen, Reihenabstand nach Arbeitsbreite"],
            ["Typische Kulturen", "Obst, Beeren, Wein, Gemüse, auch Acker", "Acker, Grünland, Weide"],
            ["Flächenbedarf (Planungswert)", `ca. ${fmt(BAUART.agriHoch.haProMwp, 1)} ha je MWp`, `ca. ${fmt(BAUART.agriVertikal.haProMwp, 1)} ha je MWp (vertikal)`],
            ["Landwirtschaftlicher Ertrag (Orientierung Acker)", `ca. ${pct0(acker.ertrag.hoch)} der Referenz`, `ca. ${pct0(acker.ertrag.vertikal)} der Referenz`],
          ],
          hervorheben: 1,
          minBreite: 640,
          fussnote: "Grenzwerte nach DIN SPEC 91434:2021-05 (Abschnitte 5.2.3, 5.2.10, 6.4). Flächenbedarf und Ertragsanteile sind Planungswerte aus unseren Rechnern (Fraunhofer ISE, Agri-PV-Leitfaden) und schwanken stark nach Standort, Kultur und Anlagendesign.",
        },
        { typ: "h3", text: "Flächenverlust: Was zählt, was nicht" },
        {
          typ: "p",
          text: "Bezugsgröße ist die **Gesamtprojektfläche** – die landwirtschaftliche Fläche vor dem Bau, einschließlich Randbereichen wie dem Vorgewende. Als Verlust zählt alles, was danach nicht mehr bewirtschaftet werden kann: Pfosten und Fundamente, Rammschutz, Trafostationen, neue Wege und Bereiche, die gängige Maschinen nicht mehr erreichen. Die Beschattung zählt hier nicht mit – sie wirkt sich über den Ertrag aus.",
        },
        {
          typ: "p",
          text: `Ein vereinfachtes Beispiel für eine vertikale Anlage auf ${fmt(FB.gesamtHa)} ha: Die Modulreihen stehen im Abstand von ${fmt(FB.reihenabstandM)} m, entlang jeder Reihe bleibt ein nicht bearbeitbarer Streifen von ${fmt(FB.streifenM, 1)} m. Das ergibt ${pct1(FB_REIHEN)} Flächenverlust. Dazu kommen ${fmt(FB.sonstigesHa, 1)} ha für Station, Zufahrt und Wendeflächen, also weitere ${pct1(FB_SONST)}. In Summe sind es **${pct1(FB_VERLUST)}** – zulässig für Kategorie II (${pct0(AGRI.flaechenverlustMaxKat2)}), aber nicht für Kategorie I (${pct0(AGRI.flaechenverlustMaxKat1)}). Planen Sie mit Reserve: Schon ein zusätzlicher Wirtschaftsweg kann die Grenze kippen.`,
        },
        { typ: "h3", text: "Die 66-%-Regel und der Referenzertrag" },
        {
          typ: "p",
          text: `Der Ertrag der Kultur auf der gesamten Projektfläche muss nach dem Bau mindestens ${pct0(AGRI.mindestErtrag)} des Referenzertrags erreichen. Die Minderung setzt sich aus dem Flächenverlust und allen anderen Effekten zusammen: Beschattung, ungleichmäßige Wasserverteilung, verändertes Mikroklima. Der Referenzertrag wird bei Dauerkulturen und Grünland aus dem Mittel der letzten drei Jahre gebildet, bei Ackerfruchtfolgen über drei Fruchtfolgezyklen. Wurde die Kultur bisher nicht angebaut, gelten Durchschnittserträge der letzten drei Jahre aus amtlichen Statistiken.`,
        },
        {
          typ: "p",
          text: `Beispiel: Liegt der Referenzertrag für Winterweizen bei ${fmt(REF_DT)} dt/ha, müssen unter der Anlage mindestens **${fmt(MIN_DT, 1)} dt/ha** geerntet werden. Unsere Planungswerte für Ackerbau liegen bei rund ${pct0(acker.ertrag.vertikal)} (vertikal) bzw. ${pct0(acker.ertrag.hoch)} (hoch aufgeständert) – der Puffer zur Grenze ist also ausreichend, solange die Anlage zur Kultur passt. Bei Sonderkulturen wie Beeren kann der Ertrag unter hoch aufgeständerten Anlagen dank Witterungsschutz sogar nahe am Referenzwert liegen (Planungswert ${pct0(sonder.ertrag.hoch)}).`,
        },
      ],
    },
    {
      id: "nutzungskonzept",
      titel: "Das landwirtschaftliche Nutzungskonzept",
      tocLabel: "Nutzungskonzept",
      bloecke: [
        {
          typ: "p",
          text: `**Herzstück der Norm ist das landwirtschaftliche Nutzungskonzept: Es wird vor dem Bau erstellt, von Landnutzer (Landwirt oder Pächter) und Errichter gemeinsam unterzeichnet und beschreibt die geplante Bewirtschaftung für die ersten ${KONZEPT_JAHRE} Jahre oder einen Fruchtfolgezyklus.** Die Formularvorlage in Anhang A der Norm gibt Inhalt und Aufbau verbindlich vor.`,
        },
        {
          typ: "checkliste",
          punkte: [
            "**Betriebsdaten:** Eigentum oder Pacht, Betriebstyp, Betriebsgröße, Betreiber der Anlage.",
            "**Anlage:** Kategorie und Nutzungsart, lichte Höhe, Leistung in kWp, Größe der Gesamtprojektfläche und der nutzbaren Fläche, erwarteter Flächenverlust.",
            "**Nutzungsplan:** Fruchtfolge oder Dauerkultur mit Aussaat- und Ernteterminen, geplanter Pflanzenschutz, Maschinen- und Arbeitsbreiten inklusive Vorgewende.",
            "**Licht und Wasser:** Lichtbedarf der Kultur und wie das Anlagendesign ihn sicherstellt; Wasserbedarf und Verteilung des Niederschlags.",
            "**Boden:** Maßnahmen gegen Erosion und Verschlämmung an den Abtropfkanten; Maßnahmen für einen rückstandslosen Auf- und Rückbau.",
            "**Wirtschaftlichkeit:** Referenzertrag, Ertragsprognose (dt/ha), Stromertrag (kWh/ha) und die Wirtschaftlichkeit aus Sicht des Landwirts.",
            "**Tierhaltung (1D/2D):** Tierart, Fläche und Zeitraum der Beweidung, Zäune und Unterstände.",
          ],
        },
        {
          typ: "kasten",
          variant: "tipp",
          titel: "Konzept und Pachtvertrag zusammen denken",
          text: "Das Nutzungskonzept bindet beide Seiten über Jahre. Regeln Sie im [Pachtvertrag](/ratgeber/pachtvertrag-solarpark), wer die Bewirtschaftung übernimmt, wer die Erträge dokumentiert, wer Schäden an Kultur oder Anlage trägt und was passiert, wenn der Landwirt die Fläche aufgibt. Sonst hängt die Förderung des Betreibers an einer Pflicht, die niemand vertraglich übernommen hat.",
        },
      ],
    },
    {
      id: "planung",
      titel: "Licht, Wasser, Boden: Anforderungen an Planung und Bau",
      tocLabel: "Licht, Wasser, Boden",
      bloecke: [
        {
          typ: "p",
          text: "**Neben den Kennzahlen stellt die Norm qualitative Anforderungen an das Anlagendesign, damit die Kultur unter oder zwischen den Modulen gleichmäßig wachsen kann.** Sie sind weniger scharf formuliert als die Prozentgrenzen, werden aber in Gutachten und Genehmigungsverfahren geprüft.",
        },
        {
          typ: "karten",
          cols: 2,
          items: [
            { titel: "Lichtverfügbarkeit und -homogenität", text: "Beschattung, Lichtverteilung und Randeffekte müssen zur Kultur passen. Module sind gleichmäßig über die Fläche zu verteilen, damit Pflanzen gleichmäßig reifen und gemeinsam geerntet werden können." },
            { titel: "Wasserverfügbarkeit", text: "Niederschlag soll homogen auf die Kultur verteilt werden. Nachweis entweder über eine Bewässerung oder eine standort- und kulturbezogene Betrachtung für ein typisches Wetterjahr." },
            { titel: "Erosion und Verschlämmung", text: "An den Modulkanten tropft Regen konzentriert ab. Die Konstruktion muss Abschwemmungen minimieren, etwa durch Regenwasserverteiler oder angepasste Modulabstände." },
            { titel: "Bodenschutz und Rückbau", text: "Bau bei trockenem Boden, bodenschonende Reifen oder Fahrstraßen, keine Rückstände. Fundamente und Verankerungen müssen sich vollständig zurückbauen lassen." },
          ],
        },
        {
          typ: "p",
          text: "Dazu kommen technische Details, die im Alltag viel ausmachen: Kabel müssen so tief liegen, dass Pflug und Grubber sie nicht erreichen (Verweis auf DIN VDE 0100-520). Wechselrichter und Anschlusskästen dürfen die Bewirtschaftung nicht behindern. Ein Rammschutz um die Pfosten wird empfohlen, soll aber getrennt von den Pfosten im Boden verankert sein. Bei Kategorie I muss die lichte Höhe den Vorgaben des Arbeitsschutzes entsprechen und das Lichtraumprofil der eingesetzten Maschinen freihalten.",
        },
      ],
    },
    {
      id: "nachweis",
      titel: "Nachweis und Monitoring: Wer prüft was?",
      tocLabel: "Nachweis",
      bloecke: [
        {
          typ: "p",
          text: "**Die Norm selbst schreibt keine Zertifizierung vor, liefert aber Messkennzahlen und Dokumentationspflichten, auf die Gutachter, Netzbetreiber und Behörden zurückgreifen.** Bei Abnahme und Inbetriebnahme sind insbesondere die Einhaltung des Nutzungskonzepts, die Kabelverlegung, der tatsächliche Flächenverlust, die lichte Höhe und die Standsicherheit zu dokumentieren. Die laufende Nutzung lässt sich über die Schlagkartei nachvollziehen.",
        },
        {
          typ: "tabelle",
          caption: "Wo die DIN SPEC 91434 rechtlich wirkt (Deutschland)",
          kopf: ["Regelwerk", "Bezug zur Norm", "Folge bei Verstoß"],
          zeilen: [
            ["GAP-Direktzahlungen (§ 12 Abs. 5 GAPDZV)", "Flächenverlust höchstens 15 % nach DIN SPEC 91434:2021-05, übliche Bearbeitung möglich", "Fläche gilt als nichtlandwirtschaftlich, Direktzahlungen entfallen"],
            ["EEG, besondere Solaranlagen (BNetzA-Festlegung)", "Anforderungen der Norm während der gesamten Förderdauer", "Verlust bzw. Kürzung des Zahlungsanspruchs"],
            ["Baurecht (§ 35 Abs. 1 Nr. 9 BauGB, Bebauungspläne)", "über den Begriff der besonderen Solaranlage im EEG; viele Bebauungspläne verweisen direkt auf die Norm", "Anlage nicht privilegiert bzw. nicht planungskonform"],
          ],
          minBreite: 680,
          fussnote: "Vereinfachte Darstellung; maßgeblich sind jeweils die aktuelle Fassung und die Auslegung der zuständigen Stelle. Zu den Förderwegen im Detail siehe Ratgeber Agri-PV Förderung & GAP.",
        },
        {
          typ: "kasten",
          variant: "recht",
          titel: "Gutachten für den Netzbetreiber",
          text: `Für die EEG-Förderung als besondere Solaranlage verlangt die Festlegung der Bundesnetzagentur, dass die Anlage die DIN SPEC 91434 über die gesamte Förderdauer einhält. Die Einhaltung ist dem Netzbetreiber bei Inbetriebnahme durch ein Sachverständigengutachten nachzuweisen; für Agri-PV auf Grünland ist der Nachweis nach der Festlegung von 2023 zudem alle ${NACHWEIS_TURNUS_JAHRE} Jahre zu erneuern. Welche Nachweise im Einzelfall genau gefordert sind, klären Sie am besten früh mit Netzbetreiber und Gutachter.`,
        },
        {
          typ: "p",
          text: `Wie sich GAP, EEG und Landesprogramme im Detail zusammensetzen, erklärt der Ratgeber [Agri-PV Förderung & GAP](/ratgeber/agri-pv-foerderung-gap). Die Begriffe [DIN SPEC 91434](/wissen/lexikon#din-spec-91434) und [besondere Solaranlagen](/wissen/lexikon#besondere-solaranlagen) finden Sie auch im Lexikon.`,
        },
      ],
    },
    {
      id: "din-spec-91492",
      titel: "DIN SPEC 91492: Ergänzung für die Tierhaltung",
      tocLabel: "DIN SPEC 91492",
      bloecke: [
        {
          typ: "p",
          text: `**Für Agri-PV mit Weidetieren gilt seit Juni 2024 die DIN SPEC 91492 „Agri-Photovoltaik-Anlagen – Anforderungen an die Nutztierhaltung“.** Sie schließt die Lücke der Kategorien 1D und 2D, die die DIN SPEC 91434 ausdrücklich offengelassen hatte. Auch sie unterscheidet hoch aufgeständerte Systeme (ab ${fmt(LICHTE_HOEHE_M, 1)} m) und bodennahe bzw. vertikale Systeme, erlaubt aber in beiden Kategorien höchstens ${pct0(FLAECHENVERLUST_91492)} Flächenverlust.`,
        },
        {
          typ: "p",
          text: `An die Stelle des Ernteertrags tritt der **Flächenbesatz**: Die Fläche muss nach dem Bau mindestens ${pct0(BESATZ_MIN_91492)} des Tierbesatzes einer vergleichbaren Referenzfläche tragen. Abweichungen sind zulässig, wenn das Nutzungskonzept belegt, dass sich die landwirtschaftliche Praxis verbessert – etwa beim Tierwohl. Hinzu kommen Anforderungen an Schutz der Tiere, Tränken, Zäune und eine tiergerechte Anlagenhöhe. Beachten Sie: Die GAPDZV verweist nach aktuellem Stand nur auf die DIN SPEC 91434 in der Fassung von 2021. Ob eine nach DIN SPEC 91492 geplante Weideanlage für die Direktzahlungen anerkannt wird, sollten Sie vorab mit der Landwirtschaftsbehörde abstimmen.`,
        },
      ],
    },
    {
      id: "grenzen",
      titel: "Grenzen und Kritik an der Norm",
      tocLabel: "Grenzen & Kritik",
      bloecke: [
        {
          typ: "p",
          text: "**Die DIN SPEC 91434 hat Agri-PV in Deutschland rechtlich greifbar gemacht, ist aber kein perfektes Instrument.** Wer ein Projekt plant, sollte ihre Schwachstellen kennen:",
        },
        {
          typ: "liste",
          punkte: [
            "**Ein Drittel Ertragsverlust ist erlaubt.** Kritiker halten die 66-%-Schwelle für großzügig; Kommunen und Verbände fordern teils strengere Werte, etwa in Bebauungsplänen.",
            "**Ertrag schwankt mit dem Wetter.** Ob eine Fläche in einem Dürrejahr die Schwelle erreicht, hängt nicht nur von der Anlage ab. Eine saubere Dokumentation von Referenz- und Istertrag schützt im Streitfall.",
            "**Stand 2021.** Die Norm wurde seit ihrer Veröffentlichung nicht überarbeitet; die Praxis – etwa bei vertikalen Anlagen und Weidesystemen – hat sich seither weiterentwickelt.",
            "**Qualitative Kriterien sind auslegungsbedürftig.** Lichthomogenität oder Wasserverteilung lassen Spielraum; Gutachter und Behörden bewerten sie unterschiedlich.",
            "**Die Norm regelt nicht die Wirtschaftlichkeit des Stroms.** Sie verlangt zwar eine Kalkulation aus Sicht des Landwirts, sagt aber nichts darüber, ob sich die Anlage insgesamt trägt.",
          ],
        },
        {
          typ: "p",
          text: "Zum letzten Punkt: Agri-PV ist je Kilowattpeak teurer als ein klassischer Solarpark und braucht mehr Fläche je Megawatt. Welche Erlöse nötig sind und welche Bauart sich für welche Kultur rechnet, zeigt unser Ratgeber zur [Agri-PV-Wirtschaftlichkeit](/ratgeber/agri-pv-wirtschaftlichkeit).",
        },
      ],
    },
    {
      id: "vorgehen",
      titel: "So planen Sie eine normgerechte Agri-PV-Anlage",
      tocLabel: "Vorgehen",
      bloecke: [
        {
          typ: "ablauf",
          schritte: [
            ["Kultur und Betrieb festlegen", "Welche Kultur soll in den nächsten Jahren auf der Fläche stehen, mit welchen Maschinen wird gearbeitet? Daraus folgen Kategorie und Reihenabstand."],
            ["Referenzertrag dokumentieren", "Erträge der letzten drei Jahre bzw. Fruchtfolgezyklen aus der Schlagkartei zusammenstellen, sonst amtliche Durchschnittswerte heranziehen."],
            ["Anlagendesign und Flächenbilanz", `Reihenabstand, Höhe, Stationen und Wege so planen, dass der Flächenverlust sicher unter ${pct0(AGRI.flaechenverlustMaxKat1)} bzw. ${pct0(AGRI.flaechenverlustMaxKat2)} bleibt.`],
            ["Nutzungskonzept unterzeichnen", "Konzept nach Anhang A gemeinsam mit dem Errichter erstellen und Teil der Projektunterlagen machen."],
            ["Bau bodenschonend ausführen", "Bauzeit nach Bodenfeuchte wählen, Kabeltiefe und lichte Höhe bei der Abnahme dokumentieren."],
            ["Betrieb dokumentieren", "Erträge, Bewirtschaftung und Pflege laufend festhalten – für Sammelantrag, Netzbetreiber und Gutachter."],
          ],
        },
        {
          typ: "tool",
          href: "/rechner/agri-pv",
          titel: "Rechnen Sie Ihre Fläche durch",
          text: "Der Agri-PV-Rechner berücksichtigt Kultur, Bauart und Ertragsanteil nach DIN SPEC 91434 – und vergleicht Pacht, Eigeninvestition und Beteiligung.",
          label: "Zum Agri-PV-Rechner",
        },
      ],
    },
  ],

  faq: [
    {
      q: "Ist die DIN SPEC 91434 verpflichtend?",
      a: "Die Norm selbst ist freiwillig. Verbindlich wird sie, weil die GAP-Direktzahlungen-Verordnung, die Bundesnetzagentur für die EEG-Förderung besonderer Solaranlagen und viele Bebauungspläne auf sie verweisen. Wer Direktzahlungen behalten oder EEG-Förderung als Agri-PV erhalten will, muss sie in der Praxis einhalten.",
    },
    {
      q: "Was ist der Unterschied zwischen Kategorie I und II?",
      a: `Kategorie I ist hoch aufgeständert (mindestens ${fmt(LICHTE_HOEHE_M, 2)} m lichte Höhe), bewirtschaftet wird unter den Modulen, der Flächenverlust darf ${pct0(AGRI.flaechenverlustMaxKat1)} nicht überschreiten. Kategorie II ist bodennah oder vertikal, bewirtschaftet wird zwischen den Reihen, zulässig sind ${pct0(AGRI.flaechenverlustMaxKat2)} Flächenverlust.`,
    },
    {
      q: "Wie wird der Referenzertrag ermittelt?",
      a: "Bei Dauerkulturen und Grünland aus dem Durchschnitt der letzten drei Jahre, bei Ackerfruchtfolgen über drei Fruchtfolgezyklen. Wurde die Kultur bisher nicht auf dem Betrieb angebaut, gelten Durchschnittserträge der letzten drei Jahre aus amtlichen Statistiken, etwa von Destatis oder den Statistikämtern der Länder.",
    },
    {
      q: "Zählt die Beschattung zum Flächenverlust?",
      a: `Nein. Zum Flächenverlust zählen nur Flächen, die gar nicht mehr bewirtschaftet werden können – Pfosten, Rammschutz, Stationen, Wege, unerreichbare Bereiche. Die Beschattung wirkt über den Ertrag und ist bei der ${pct0(AGRI.mindestErtrag)}-Regel zu berücksichtigen.`,
    },
    {
      q: "Gilt die DIN SPEC 91434 auch in Österreich und der Schweiz?",
      a: "Nicht unmittelbar. In Österreich knüpfen die EAG-Förderung und die Direktzahlungen an eigene Kriterien, etwa eine Mindesthöhe oder einen Mindestanteil landwirtschaftlich nutzbarer Fläche; in der Schweiz entscheidet Art. 32c RPV. Die Norm wird aber auch dort häufig als fachliche Orientierung herangezogen.",
    },
    {
      q: "Was ist die DIN SPEC 91492?",
      a: `Die DIN SPEC 91492 vom Juni 2024 ergänzt die DIN SPEC 91434 um Anforderungen an die Nutztierhaltung. Statt des Ernteertrags gilt ein Flächenbesatz von mindestens ${pct0(BESATZ_MIN_91492)} gegenüber einer Referenzfläche, der Flächenverlust ist auf ${pct0(FLAECHENVERLUST_91492)} begrenzt.`,
    },
  ],

  passend: [
    { href: "/ratgeber/agri-pv-foerderung-gap", titel: "Agri-PV Förderung & GAP", text: "Direktzahlungen, EEG-Bonus und Baurecht im Überblick." },
    { href: "/ratgeber/agri-pv-wirtschaftlichkeit", titel: "Agri-PV Wirtschaftlichkeit", text: "Was vertikale und hohe Anlagen kosten und erlösen." },
    { href: "/agri-pv", titel: "Agri-PV mit ÖkoInvest", text: "Systeme, Kulturen und Beteiligungsmodelle." },
  ],

  quellen: [
    { titel: "DIN Media – DIN SPEC 91434:2021-05, Agri-Photovoltaik-Anlagen – Anforderungen an die landwirtschaftliche Hauptnutzung", url: "https://www.dinmedia.de/en/technical-rule/din-spec-91434/337886742", stand: "09/2026" },
    { titel: "Clearingstelle EEG|KWKG – DIN SPEC 91492, Agri-Photovoltaik-Anlagen – Anforderungen an die Nutztierhaltung", url: "https://www.clearingstelle-eeg-kwkg.de/suche/type/technische-norm/6962", stand: "09/2026" },
    { titel: "GAP-Direktzahlungen-Verordnung (GAPDZV), § 12", url: "https://www.gesetze-im-internet.de/gapdzv/__12.html", stand: "09/2026" },
    { titel: "Bundesnetzagentur – Anforderungen an besondere Solaranlagen (Festlegung, 01.10.2021)", url: "https://www.bundesnetzagentur.de/SharedDocs/Pressemitteilungen/DE/2021/20211001_PV_Festlegung.html", stand: "09/2026" },
    { titel: "C.A.R.M.E.N. e. V. – Bundesnetzagentur definiert Anforderungen für Grünland-PV und Moor-PV", url: "https://www.carmen-ev.de/2023/06/30/besondere-solaranlagen-bundesnetzagentur-definiert-anforderungen-fuer-gruenland-pv-und-moor-pv/", stand: "09/2026" },
    { titel: "Clearingstelle EEG|KWKG – Unter welchen Voraussetzungen sind Agri-PV-Anlagen nach dem EEG förderfähig?", url: "https://www.clearingstelle-eeg-kwkg.de/haeufige-rechtsfrage/229", stand: "09/2026" },
    { titel: "Fraunhofer ISE – Agri-Photovoltaik: Chance für Landwirtschaft und Energiewende (Leitfaden)", url: "https://www.ise.fraunhofer.de/de/veroeffentlichungen/studien/agri-photovoltaik-chance-fuer-landwirtschaft-und-energiewende.html", stand: "09/2026" },
    { titel: "Becker Büttner Held – Agri-PV: Neue Definition berücksichtigt auch Tierhaltung", url: "https://www.bbh-blog.de/allgemein/agri-pv-neue-definition-beruecksichtigt-auch-tierhaltung/", stand: "09/2026" },
  ],

  seitenCta: {
    titel: "Passt Agri-PV zu Ihrer Kultur?",
    text: "Bauart, Ertragsanteil und Erlöse für Ihre Fläche vergleichen.",
    href: "/rechner/agri-pv",
    label: "Zum Agri-PV-Rechner",
  },
  cta: {
    title: "Agri-PV normgerecht planen.",
    text: "Sie bewirtschaften eine Fläche und möchten wissen, welche Bauart zu Ihrer Kultur passt? Starten Sie mit dem Flächencheck – für Flächeneigentümer und Landwirte kostenfrei.",
    primary: { label: "Flächencheck starten", href: "/flaechencheck" },
    secondary: { label: "Für Landwirte", href: "/landwirte" },
  },
};

export default artikel;
