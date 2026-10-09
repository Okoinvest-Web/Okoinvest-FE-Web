// Ratgeber: Benachteiligte Gebiete und Länderöffnungsklausel (§ 37c EEG) für Freiflächen-PV
// Recherchestand 29.09.2026: EEG 2023 §§ 3 Nr. 7, 37 Abs. 1 Nr. 2 h/i und Abs. 4, 37c (Fassung Solarpaket I,
// in Kraft 16.05.2024); Bundesnetzagentur, Bekanntmachung Gebotstermin 1. Juli 2026; StMELF Bayern
// (Gebietskulisse 2019); KNE-Übersicht Länderöffnungsklausel (10/2021). Marktzahlen aus src/lib/invest/markt.js.

import { PACHT, FREIFLAECHE, ERLOESE, REGIONEN, STAND } from "@/lib/invest/markt";
import { fmt, fmtEur, fmtPct } from "@/lib/rechner/annahmen";
import { pfad } from "../../lib/land/index.js";

/* Werte, die (noch) nicht in markt.js stehen – Vorschlag zur Übernahme */
// § 37c Abs. 2 Nr. 1 EEG: Auslöseschwellen für eine Opt-out-Verordnung der Länder
const SCHWELLE_BIS_2030 = 0.01; // vor dem 1. Januar 2031: mehr als 1 % der landwirtschaftlich genutzten Fläche
const SCHWELLE_AB_2031 = 0.015; // nach dem 31. Dezember 2030: mehr als 1,5 %
// § 37 Abs. 4 EEG: Deckel für Gebote auf landwirtschaftlichen Flächen (Zubau ab 2023, in GW)
const ACKER_DECKEL_GW = 80;
const ACKER_DECKEL_AB_2031_GW = 177.5;
// StMELF Bayern, „Benachteiligte Gebiete in Bayern“ (Gebietskulisse ab 2019), Hektar
const BY_LF_HA = 3195790;
const BY_BENACHTEILIGT_HA = 1967703;
const BY_ANTEIL = BY_BENACHTEILIGT_HA / BY_LF_HA;
// Bundesnetzagentur, Bekanntmachung zum Gebotstermin 1. Juli 2026
const LETZTER_TERMIN = "1. Juli 2026";
const SOLARPAKET_INKRAFT = "16. Mai 2024";

/* Rechenbeispiel: 20 ha in Süddeutschland – mit und ohne EEG-Zugang */
const HA = 20;
const REGION = REGIONEN.find((r) => r.id === "de-sued");
const MWP = HA / FREIFLAECHE.haProMwp;
const MWH = MWP * REGION.ertrag; // MWh im ersten Jahr
const erloesJahr = (ct) => (MWH * 1000 * ct) / 100;
const ERLOES_EEG = erloesJahr(ERLOESE.eegFreiflaecheCt);
const ERLOES_PPA_MIN = erloesJahr(ERLOESE.ppaCt.min);
const ERLOES_PPA_MITTEL = erloesJahr(ERLOESE.ppaCt.mittel);
const PACHT_MITTEL = PACHT.freiflaecheProHa.mittel * HA;
const PACHT_MIN = PACHT.freiflaecheProHa.min * HA;
const eurHa = (n) => `${fmt(n)} €/ha`;

const artikel = {
  slug: "benachteiligte-gebiete-pv-freiflaeche",
  title: "Benachteiligte Gebiete für PV: Länderöffnungsklausel und § 37c EEG",
  seoTitle: "Benachteiligte Gebiete PV & § 37c EEG | ÖkoInvest",
  kurzTitel: "Benachteiligte Gebiete",
  description:
    "Benachteiligte Gebiete für PV-Freiflächen: EU-Abgrenzung, § 37c EEG nach Solarpaket I, Stand je Bundesland, Flächenprüfung und Folgen für Pacht und Zuschlag.",
  excerpt:
    "Acker und Grünland in benachteiligten Gebieten sind für EEG-Solarparks heute grundsätzlich offen. Was die Kulisse ist, welche Länder früher Verordnungen hatten, wie Sie Ihre Fläche prüfen und was das für Pacht und Zuschlag bedeutet.",
  hauptKeyword: "benachteiligte gebiete photovoltaik",
  keywords: [
    "benachteiligte Gebiete Photovoltaik",
    "Länderöffnungsklausel Solarpark",
    "§ 37c EEG",
    "benachteiligte Gebiete Freiflächen-PV Bundesländer",
    "benachteiligtes Gebiet Karte prüfen",
    "Solarpark Ackerland EEG Ausschreibung",
    "Freiflächenöffnungsverordnung",
  ],
  veroeffentlicht: "2026-09-29",
  aktualisiert: "2026-09-29",
  kategorie: "Recht & Genehmigung",
  bild: "/img/freiflaeche-begehung.jpg",
  bildAlt: "Zwei Fachleute mit Schutzhelm und Warnweste gehen zwischen aufgeständerten Modulreihen eines Solarparks",
  badge: { wert: "16 von 16", text: `Ländern ohne Opt-out-Verordnung (BNetzA, Gebotstermin ${LETZTER_TERMIN})` },

  kurzFazit: [
    "**Acker- und Grünland in benachteiligten Gebieten darf nach § 37 Abs. 1 Nr. 2 h und i EEG an der Solar-Ausschreibung teilnehmen** – ausgenommen Natura-2000-Gebiete, geschützte Biotope und Naturschutzgebiete.",
    `Seit dem Solarpaket I (in Kraft seit ${SOLARPAKET_INKRAFT}) gilt **Opt-out statt Opt-in**: Die Flächen sind bundesweit offen, die Länder können sie per Verordnung wieder schließen, wenn Solarparks mehr als ${fmtPct(SCHWELLE_BIS_2030, 0)} (ab 2031: ${fmtPct(SCHWELLE_AB_2031)}) der Agrarfläche belegen.`,
    `Laut Bundesnetzagentur hatte zum Gebotstermin ${LETZTER_TERMIN} **kein Land eine solche Verordnung erlassen** – benachteiligte Gebiete waren in allen 16 Ländern zuschlagsfähig.`,
    `Die Kulisse ist groß: In Bayern liegen nach Angaben des Landwirtschaftsministeriums rund **${fmtPct(BY_ANTEIL, 0)} der landwirtschaftlich genutzten Fläche** in einem benachteiligten Gebiet.`,
    "Für Eigentümer entscheidet die Lage im benachteiligten Gebiet oft darüber, ob ein Projekt mit Marktprämie finanzierbar ist – und damit über Pachtangebot und Verhandlungsposition.",
  ],

  abschnitte: [
    {
      id: "antwort",
      titel: "Was bedeuten benachteiligte Gebiete für einen Solarpark?",
      tocLabel: "Kurze Antwort",
      bloecke: [
        {
          typ: "p",
          text: "**Liegt ein Acker oder eine Grünlandfläche in einem benachteiligten Gebiet, kann ein Solarpark darauf in der Regel an der EEG-Ausschreibung teilnehmen und eine Marktprämie für 20 Jahre erhalten.** Außerhalb dieser Kulisse bleibt Ackerland für klassische Freiflächenanlagen nur über einen Stromliefervertrag (PPA), den privilegierten Korridor an Autobahnen und Bahnlinien oder als besondere Solaranlage wie Agri-PV zugänglich.",
        },
        {
          typ: "p",
          text: "Der Begriff stammt nicht aus dem Energierecht, sondern aus der EU-Agrarpolitik. [Benachteiligte Gebiete](/wissen/lexikon#benachteiligte-gebiete) sind Regionen, in denen Landwirtschaft wegen Klima, Boden, Hangneigung oder Höhenlage schwieriger ist; Betriebe erhalten dort eine Ausgleichszulage. Das EEG knüpft an diese Abgrenzung an, weil ertragsschwächere Böden eher für Solarparks freigegeben werden sollen als Spitzenstandorte des Ackerbaus.",
        },
        {
          typ: "kennzahl",
          wert: fmtPct(BY_ANTEIL, 0),
          titel: "der Agrarfläche Bayerns liegt in benachteiligten Gebieten",
          text: `${fmt(BY_BENACHTEILIGT_HA)} von ${fmt(BY_LF_HA)} ha nach der Gebietskulisse ab 2019 (Bayerisches Landwirtschaftsministerium). Der Anteil unterscheidet sich stark zwischen den Ländern.`,
        },
        {
          typ: "tool",
          href: pfad("/flaechencheck"),
          titel: "Liegt Ihre Fläche in der Förderkulisse?",
          text: "Im Flächencheck prüfen wir Lage, EEG-Kulisse, Netzanschluss und Planungsrecht Ihrer Fläche.",
          label: "Zum Flächencheck",
        },
      ],
    },
    {
      id: "eu-abgrenzung",
      titel: "Wie benachteiligte Gebiete nach EU-Recht abgegrenzt werden",
      tocLabel: "EU-Abgrenzung",
      bloecke: [
        {
          typ: "p",
          text: "**Das EEG verweist in § 3 Nr. 7 auf zwei EU-Rechtsakte: die alte Richtlinie 86/465/EWG und Artikel 32 der Verordnung (EU) Nr. 1305/2013.** Nach der neueren Verordnung unterscheidet man drei Kategorien: Berggebiete, Gebiete mit erheblichen naturbedingten Nachteilen und Gebiete mit anderen spezifischen Nachteilen. Die Länder haben ihre Kulissen danach bis 2019 neu abgegrenzt; manche Gemeinden sind dabei herausgefallen, andere hinzugekommen.",
        },
        {
          typ: "tabelle",
          caption: "Kategorien benachteiligter Gebiete nach Art. 32 VO (EU) Nr. 1305/2013 – Beispiel Bayern",
          kopf: ["Kategorie", "Kriterien (vereinfacht)", "Fläche in Bayern"],
          zeilen: [
            ["Berggebiete", "Höhenlage und/oder Hangneigung erschweren die Bewirtschaftung", "459.625 ha"],
            ["Erhebliche naturbedingte Nachteile", "EU-weit einheitliche biophysikalische Kriterien, z. B. Boden, Klima, Wasserhaushalt", "805.943 ha"],
            ["Andere spezifische Nachteile", "national festgelegte Kriterien in mehreren Bewertungsschritten, z. B. Ertragsmesszahl", "702.135 ha"],
            [`**Summe benachteiligte Gebiete**`, `**rund ${fmtPct(BY_ANTEIL, 0)} der LF**`, `**${fmt(BY_BENACHTEILIGT_HA)} ha**`],
          ],
          hervorheben: 2,
          markierteZeile: 3,
          minBreite: 640,
          fussnote: `Quelle: Bayerisches Staatsministerium für Ernährung, Landwirtschaft, Forsten und Tourismus, Gebietskulisse ab 2019; landwirtschaftlich genutzte Fläche Bayerns ${fmt(BY_LF_HA)} ha. Andere Länder haben andere Anteile.`,
        },
        {
          typ: "p",
          text: "Weil das EEG beide Rechtsakte nennt, kann eine Fläche nach aktuellem Stand auch dann zur Kulisse zählen, wenn sie nur nach der alten Abgrenzung benachteiligt war. Das ist in der Praxis relevant für Gemeinden, die mit der Neuabgrenzung 2019 aus der Ausgleichszulage gefallen sind. Lassen Sie im Zweifel prüfen, auf welche Abgrenzung sich ein Projekt stützt, und dokumentieren Sie das im [Datenraum](/wissen/lexikon#datenraum) – Käufer und Banken fragen danach.",
        },
      ],
    },
    {
      id: "opt-out",
      titel: "Von der Länderöffnungsklausel zum Opt-out: § 37c EEG heute",
      tocLabel: "§ 37c EEG",
      bloecke: [
        {
          typ: "p",
          text: `**Bis Mai 2024 mussten die Länder benachteiligte Gebiete aktiv per Verordnung öffnen; seit dem Solarpaket I sind sie bundesweit offen, und die Länder können sie nur noch unter Bedingungen schließen.** Aus der „Länderöffnungsklausel“ ist damit eine Opt-out-Regel geworden. Die Begriffe werden in Pachtangeboten und Presseberichten trotzdem noch vermischt.`,
        },
        {
          typ: "h3",
          text: "Wann ein Land Gebote wieder ausschließen kann",
        },
        {
          typ: "liste",
          punkte: [
            `**Flächenschwelle:** Vor dem 1. Januar 2031 kann ein Land Gebote ausschließen, wenn und solange Freiflächenanlagen auf mehr als ${fmtPct(SCHWELLE_BIS_2030, 0)} der landwirtschaftlich genutzten Fläche des Landes stehen; danach liegt die Schwelle bei ${fmtPct(SCHWELLE_AB_2031)}. Höhere Schwellen darf das Land festlegen.`,
            "**Landschaftsschutzgebiete und Naturparks:** Das Land kann Flächen ausschließen, die beim Beschluss über den Bebauungsplan als Landschaftsschutzgebiet (§ 26 BNatSchG) oder Naturpark (§ 27 BNatSchG) festgesetzt waren.",
            "**Verfahren:** Wirksam wird der Ausschluss nur, wenn die Rechtsverordnung erlassen ist, die Bundesnetzagentur sie bekannt gemacht hat und – bei der Flächenschwelle – das Land die Überschreitung spätestens drei Monate vor dem Gebotstermin gemeldet hat.",
          ],
        },
        {
          typ: "kasten",
          variant: "recht",
          titel: "Rechtslage in Deutschland (EEG 2023, Stand September 2026)",
          text: `§ 37 Abs. 1 Nr. 2 h und i EEG lassen Acker- und Grünland in benachteiligten Gebieten zu, § 37c EEG erlaubt den Ländern den Ausschluss. Unabhängig davon gilt § 37 Abs. 4 EEG: Gebote auf landwirtschaftlichen Flächen sind unzulässig, sobald mehr als ${fmt(ACKER_DECKEL_GW)} GW solcher Anlagen (Zubau ab 2023) in Betrieb sind, ab 2031 liegt die Schwelle bei ${fmt(ACKER_DECKEL_AB_2031_GW, 1)} GW. Maßgeblich ist die aktuelle Fassung auf gesetze-im-internet.de und die Bekanntmachung der Bundesnetzagentur zum jeweiligen Gebotstermin.`,
        },
        {
          typ: "p",
          text: `Die Folge für die Praxis: Nicht der Blick in eine alte Landesverordnung entscheidet, sondern die **Bekanntmachung der Bundesnetzagentur zum jeweiligen Gebotstermin**. Darin steht, ob ein Land eine Verordnung nach § 37c Abs. 2 EEG erlassen und eine Überschreitung gemeldet hat. Zum Gebotstermin ${LETZTER_TERMIN} war das in keinem Land der Fall. Wie die Ausschreibung selbst abläuft – Termine, Höchstwerte, Sicherheiten –, erklärt der Ratgeber [EEG-Ausschreibung für Freiflächen](/ratgeber/eeg-ausschreibung-freiflaeche).`,
        },
      ],
    },
    {
      id: "bundeslaender",
      titel: "Benachteiligte Gebiete je Bundesland: Stand der Verordnungen",
      tocLabel: "Stand je Bundesland",
      bloecke: [
        {
          typ: "p",
          text: "**Bis zum Solarpaket I hatten zehn Flächenländer benachteiligte Gebiete per Verordnung geöffnet, teils mit jährlichen Obergrenzen; seit Mai 2024 sind diese Öffnungsverordnungen für die Zuschlagsfähigkeit nicht mehr entscheidend.** Die Tabelle zeigt beides: die historische Öffnung (wichtig für ältere Projekte und Zuschläge) und den heutigen Stand eines Ausschlusses nach § 37c Abs. 2 EEG.",
        },
        {
          typ: "tabelle",
          caption: `Benachteiligte Gebiete für Freiflächen-PV nach Bundesland, Stand ${STAND}`,
          kopf: ["Land", "Frühere Öffnung (Opt-in)", `Ausschluss nach § 37c Abs. 2 (Gebotstermin ${LETZTER_TERMIN})`],
          zeilen: [
            ["Baden-Württemberg", "ja, Freiflächenöffnungsverordnung 2017 (Deckel 2022 von 100 auf 500 MW/Jahr angehoben)", "keine Verordnung"],
            ["Bayern", "ja, 2017", "keine Verordnung"],
            ["Hessen", "ja, 2018", "keine Verordnung"],
            ["Rheinland-Pfalz", "ja, 2018", "keine Verordnung"],
            ["Saarland", "ja, 2018", "keine Verordnung"],
            ["Niedersachsen", "ja, 2021", "keine Verordnung"],
            ["Sachsen", "ja, 2021", "keine Verordnung"],
            ["Sachsen-Anhalt", "ja, Freiflächenanlagenverordnung 2022", "keine Verordnung"],
            ["Nordrhein-Westfalen", "ja, 2022", "keine Verordnung"],
            ["Thüringen", "ja, Photovoltaik-Freiflächenverordnung 2023", "keine Verordnung"],
            ["Brandenburg, Mecklenburg-Vorpommern, Schleswig-Holstein", "keine Öffnungsverordnung bekannt", "keine Verordnung – Flächen seit 2024 offen"],
            ["Berlin, Hamburg, Bremen", "kaum landwirtschaftliche Kulisse", "keine Verordnung"],
          ],
          hervorheben: 2,
          minBreite: 760,
          fussnote: "Quellen: Bundesnetzagentur, Bekanntmachung Gebotstermin 1. Juli 2026 (Spalte 3); KNE-Übersicht zur Länderöffnungsklausel (10/2021), Landesministerien und Fachpresse (Spalte 2). Jahresangaben ohne Gewähr; frühere Verordnungen enthielten teils Obergrenzen und Ausschlüsse. Vor jeder Entscheidung die aktuelle BNetzA-Bekanntmachung prüfen.",
        },
        {
          typ: "p",
          text: `Ob ein Land die Schwelle von ${fmtPct(SCHWELLE_BIS_2030, 0)} erreicht, hängt vom Zubau ab. Länder mit großem Solarparkbestand im Verhältnis zur Agrarfläche kommen dieser Marke schneller nahe als Länder mit viel Ackerland und wenigen Parks. Wer heute eine Fläche sichert, sollte deshalb wissen: Die Kulisse ist offen, aber nicht auf Dauer garantiert – zwischen Pachtvertrag und Gebot vergehen oft zwei bis drei Jahre.`,
        },
      ],
    },
    {
      id: "flaechenkulisse",
      titel: "Welche Flächen trotz benachteiligtem Gebiet ausgeschlossen sind",
      tocLabel: "Ausschlüsse",
      bloecke: [
        {
          typ: "p",
          text: "**Auch im benachteiligten Gebiet sind Natura-2000-Gebiete, gesetzlich geschützte Biotope und Naturschutzgebiete von der Förderung ausgeschlossen.** Zudem muss die Fläche als Acker bzw. Grünland genutzt worden sein; nach dem Wortlaut kommt es auf die Nutzung und Lage zum Zeitpunkt des Beschlusses über die Aufstellung oder Änderung des Bebauungsplans an. Ein Bebauungsplan ist in aller Regel ohnehin nötig – die EEG-Kulisse ersetzt kein Baurecht.",
        },
        {
          typ: "tabelle",
          caption: "Benachteiligte Gebiete im Vergleich zu anderen Flächenkategorien für Freiflächen-PV",
          kopf: ["Flächenkategorie", "EEG-Ausschreibung", "Baurecht", "Typische Einordnung"],
          zeilen: [
            ["Acker/Grünland im benachteiligten Gebiet", "zulässig (§ 37 Abs. 1 Nr. 2 h, i), Länder können ausschließen", "Bebauungsplan", "größte Kulisse für klassische Parks auf Agrarland"],
            ["[Randstreifen](/wissen/lexikon#randstreifen) bis 500 m an Autobahn/Schiene", "zulässig (Nr. 2 c)", "B-Plan; im 200-m-Korridor privilegiert", "unabhängig von der Bodengüte"],
            ["Konversions- und versiegelte Flächen", "zulässig (Nr. 2 a, b)", "Bebauungsplan", "oft Altlasten, dafür geringe Konflikte"],
            ["Agri-PV und andere besondere Solaranlagen", "zulässig (Nr. 3)", "B-Plan; Agri-PV bis 2,5 ha mit Hofbezug privilegiert", "landwirtschaftliche Nutzung muss nachgewiesen werden"],
            ["Übriger Acker ohne Kulisse", "nicht zulässig", "Bebauungsplan", "nur mit PPA oder Merchant-Vermarktung"],
          ],
          minBreite: 760,
          fussnote: "Vereinfachte Übersicht nach § 37 Abs. 1 EEG und § 35 BauGB, Stand September 2026. Für alle Kategorien auf Agrarland gilt zusätzlich der Deckel nach § 37 Abs. 4 EEG.",
        },
        {
          typ: "p",
          text: "Die Kategorien überschneiden sich: Eine Fläche kann zugleich im benachteiligten Gebiet und im Randstreifen liegen. Für die Genehmigung ist die Nähe zur Autobahn oft der stärkere Hebel, weil im 200-m-Korridor die [Privilegierung im Außenbereich](/wissen/lexikon#privilegierung-aussenbereich) greift. Die Einzelheiten dazu erklärt der Ratgeber [Solarparks an Autobahn und Bahn](/ratgeber/solarpark-autobahn-bahn-privilegierung), das Bebauungsplanverfahren der Ratgeber [Solarpark-Genehmigung](/ratgeber/solarpark-genehmigung-bebauungsplan).",
        },
        {
          typ: "kasten",
          variant: "wichtig",
          titel: "Naturschutz prüfen, bevor Sie verhandeln",
          text: "Landschaftsschutzgebiete und Naturparks sind nicht automatisch ausgeschlossen, können aber per Landesverordnung herausgenommen werden – und im B-Plan-Verfahren ohnehin Konflikte auslösen. Artenschutz, Vogelrastgebiete und Biotope prüfen Sie am besten früh; mehr dazu im Ratgeber [Artenschutz im Solarpark](/ratgeber/solarpark-artenschutz-biodiversitaet).",
        },
      ],
    },
    {
      id: "pruefen",
      titel: "So prüfen Sie, ob Ihre Fläche in einem benachteiligten Gebiet liegt",
      tocLabel: "Fläche prüfen",
      bloecke: [
        {
          typ: "p",
          text: "**Am schnellsten klären Sie die Lage über den Agrar-Kartendienst Ihres Landes oder bei der zuständigen Landwirtschaftsbehörde.** Die Kulissen sind meist auf Ebene von Gemeinden oder Gemarkungen abgegrenzt; in Bayern zeigt zum Beispiel der Kartenviewer Agrar im Portal iBALIS die neue Gebietskulisse im Detail. Auch die Energieatlanten mehrerer Länder blenden die Kulisse ein.",
        },
        {
          typ: "ablauf",
          schritte: [
            ["Flurstück und Gemarkung notieren", "Aus Grundbuch, Liegenschaftskataster oder Mehrfachantrag. Bei mehreren Schlägen jede Fläche einzeln prüfen."],
            ["Agrar-Kartendienst des Landes öffnen", "Ebene „benachteiligte Gebiete“ bzw. „Ausgleichszulage“ einblenden. Bei Unklarheit das Amt für Landwirtschaft oder die Landwirtschaftskammer fragen."],
            ["Schutzgebiete abgleichen", "Natura 2000, Naturschutzgebiete und Biotope schließen aus; Landschaftsschutzgebiete und Naturparks notieren."],
            ["Aktuelle BNetzA-Bekanntmachung lesen", "Für den nächsten Gebotstermin prüfen, ob Ihr Land eine Verordnung nach § 37c Abs. 2 EEG erlassen hat."],
            ["Netz und Planungsrecht dazunehmen", "Die Kulisse allein reicht nicht: Entfernung zum Umspannwerk, Regionalplan und Haltung der Gemeinde entscheiden mit. Der [Flächencheck](/flaechencheck) bündelt diese Fragen."],
          ],
        },
        {
          typ: "p",
          text: `Ein häufiger Fehler ist, nur die Gemeinde zu prüfen und den Nutzungsstatus zu übersehen. Förderfähig nach Nr. 2 h und i sind Flächen, die als Ackerland oder Grünland genutzt wurden. Wer eine Brache, einen Wald oder eine Sonderfläche einbringen will, ist in einer anderen Kategorie – oder gar nicht in der Kulisse. Unter etwa ${fmt(FREIFLAECHE.mindestHa)} ha wird es zudem selten wirtschaftlich, egal wo die Fläche liegt.`,
        },
      ],
    },
    {
      id: "pacht-zuschlag",
      titel: "Folgen für Pacht, Zuschlag und Projektwert",
      tocLabel: "Pacht und Zuschlag",
      bloecke: [
        {
          typ: "p",
          text: `**Die Lage im benachteiligten Gebiet macht eine Fläche „bankfähig“: Mit Zuschlag erhält der Betreiber 20 Jahre lang einen festen anzulegenden Wert, was die Finanzierung erleichtert und die Pacht stützt.** Außerhalb der Kulisse muss das Projekt über einen PPA oder den Strommarkt laufen, mit kürzeren Laufzeiten und mehr Preisrisiko. Das schlägt sich nicht immer in einer niedrigeren Pacht nieder, aber in weniger Interessenten und strengeren Vertragsbedingungen.`,
        },
        {
          typ: "tabelle",
          caption: `Rechenbeispiel: ${HA} ha in Süddeutschland (${fmt(MWP, 1)} MWp) – Erlöse im ersten Jahr, Stand ${STAND}`,
          kopf: ["Vermarktung", "Preis", "Stromerlös Jahr 1", "Pacht Mittelwert im Verhältnis"],
          zeilen: [
            ["EEG-Zuschlag (benachteiligtes Gebiet)", `${fmt(ERLOESE.eegFreiflaecheCt, 1)} ct/kWh für 20 Jahre`, fmtEur(ERLOES_EEG), fmtPct(PACHT_MITTEL / ERLOES_EEG)],
            ["PPA Mittelwert (ohne Kulisse)", `${fmt(ERLOESE.ppaCt.mittel, 1)} ct/kWh, meist 10 Jahre`, fmtEur(ERLOES_PPA_MITTEL), fmtPct(PACHT_MITTEL / ERLOES_PPA_MITTEL)],
            ["PPA unteres Ende", `${fmt(ERLOESE.ppaCt.min, 1)} ct/kWh`, fmtEur(ERLOES_PPA_MIN), fmtPct(PACHT_MITTEL / ERLOES_PPA_MIN)],
          ],
          hervorheben: 2,
          markierteZeile: 0,
          minBreite: 680,
          fussnote: `Ertrag ${fmt(REGION.ertrag)} kWh/kWp, ${fmt(FREIFLAECHE.haProMwp, 1)} ha je MWp, Pacht ${eurHa(PACHT.freiflaecheProHa.mittel)} (= ${fmtEur(PACHT_MITTEL)} im Jahr). Orientierungswerte aus der ÖkoInvest-Marktübersicht, keine Angebote; negative Preise, Direktvermarktungskosten und Degradation nicht berücksichtigt.`,
        },
        {
          typ: "p",
          text: `Der Unterschied im Preis je Kilowattstunde wirkt klein. Entscheidend ist die **Sicherheit über die Laufzeit**: Eine Bank finanziert einen Zuschlag über 20 Jahre mit höherem Fremdkapitalanteil als einen zehnjährigen PPA mit anschließendem Marktpreisrisiko. Deshalb liegen Pachtangebote für Flächen in der Kulisse eher im mittleren bis oberen Bereich der Spanne von ${fmt(PACHT.freiflaecheProHa.min)} bis ${fmt(PACHT.freiflaecheProHa.max)} €/ha, während Flächen ohne Kulisse häufiger am unteren Ende um ${fmtEur(PACHT_MIN / HA)} je Hektar starten – oder gar kein Angebot erhalten. Die Details zur Pachthöhe finden Sie im Ratgeber [Solarpark-Pacht pro Hektar](/ratgeber/solarpark-pacht-pro-hektar), eine eigene Rechnung im [Pachtrechner](/rechner/pacht).`,
        },
        {
          typ: "kasten",
          variant: "tipp",
          titel: "Kulissenrisiko im Pachtvertrag regeln",
          text: `Fällt eine Fläche nach Vertragsschluss aus der Kulisse – etwa weil das Land die ${fmtPct(SCHWELLE_BIS_2030, 0)}-Schwelle meldet –, wollen Entwickler aussteigen können. Vereinbaren Sie in diesem Fall mindestens ein Reservierungsentgelt für die bisherige Bindung (üblich ${fmt(PACHT.reservierungProHa.min)}–${fmt(PACHT.reservierungProHa.max)} €/ha) und eine klare Frist. Worauf es in den Klauseln ankommt, zeigt der Ratgeber [Pachtvertrag Solarpark](/ratgeber/pachtvertrag-solarpark).`,
        },
        {
          typ: "tool",
          href: pfad("/rechner/solarpark"),
          titel: "EEG oder PPA – was trägt Ihr Projekt?",
          text: "Ertrag, Erlöse und Rendite für beide Vermarktungswege vergleichen.",
          label: "Zum Solarpark-Rechner",
        },
      ],
    },
    {
      id: "oesterreich-schweiz",
      titel: "Gibt es benachteiligte Gebiete als PV-Kulisse auch in Österreich und der Schweiz?",
      tocLabel: "Österreich & Schweiz",
      bloecke: [
        {
          typ: "p",
          text: "**Nein, eine vergleichbare Verknüpfung von Agrarkulisse und Solarförderung gibt es nach unserem Recherchestand weder in Österreich noch in der Schweiz.** Benachteiligte Gebiete spielen dort vor allem für die Ausgleichszulage der Landwirtschaft eine Rolle. Ob ein Solarpark gebaut werden darf, entscheidet in Österreich die Flächenwidmung als Grünland-Photovoltaik bzw. die Zonierung des Landes, gefördert wird über das EAG – mit einem Abschlag für Anlagen auf landwirtschaftlichen Flächen. Details im Ratgeber [Freiflächen-PV in Österreich](/ratgeber/freiflaechen-pv-oesterreich).",
        },
        {
          typ: "p",
          text: "In der Schweiz sind freistehende Anlagen außerhalb der Bauzone nur in engen Grenzen zulässig; landwirtschaftliche Nutzflächen sind besonders geschützt. Einordnung im Ratgeber [Freiflächen-PV in der Schweiz](/ratgeber/freiflaechen-pv-schweiz).",
        },
      ],
    },
    {
      id: "fehler",
      titel: "Typische Fehler bei benachteiligten Gebieten",
      tocLabel: "Typische Fehler",
      bloecke: [
        {
          typ: "checkliste",
          punkte: [
            "**Alte Landesverordnung als Maßstab nehmen:** Frühere Öffnungsverordnungen mit Obergrenzen sind seit 2024 nicht mehr entscheidend – maßgeblich ist die BNetzA-Bekanntmachung zum Gebotstermin.",
            "**Nur die Gemeinde prüfen:** Schutzgebiete und der Nutzungsstatus als Acker oder Grünland entscheiden mit.",
            "**Kulisse mit Baurecht verwechseln:** Auch im benachteiligten Gebiet braucht der Park in aller Regel einen Bebauungsplan und die Zustimmung der Gemeinde.",
            "**Den Agrardeckel übersehen:** § 37 Abs. 4 EEG begrenzt Gebote auf landwirtschaftlichen Flächen insgesamt – unabhängig von der Landesregelung.",
            "**Kein Plan B im Vertrag:** Fällt die Kulisse weg, sollte der Pachtvertrag regeln, ob das Projekt als PPA-Park weiterläuft oder endet.",
          ],
        },
        {
          typ: "p",
          text: "Wer als Landwirt eine Fläche anbietet, sollte außerdem prüfen, ob Agri-PV die bessere Wahl ist: Sie ist unabhängig von der Kulisse ausschreibungsfähig, und ein großer Teil der Fläche bleibt GAP-förderfähig. Mehr dazu unter [Agri-PV](/agri-pv) und für landwirtschaftliche Betriebe unter [Landwirte](/landwirte).",
        },
      ],
    },
  ],

  faq: [
    {
      q: "Was ist ein benachteiligtes Gebiet?",
      a: "Ein nach EU-Agrarrecht abgegrenztes Gebiet, in dem die Landwirtschaft durch Höhenlage, Hangneigung, Klima oder Boden erschwert ist. Das EEG nutzt diese Kulisse, um Acker und Grünland dort für Solarparks in der Ausschreibung zuzulassen.",
    },
    {
      q: "Gilt die Länderöffnungsklausel noch?",
      a: `Nicht mehr in der alten Form. Seit dem Solarpaket I (${SOLARPAKET_INKRAFT}) sind benachteiligte Gebiete bundesweit offen, und die Länder können sie nach § 37c EEG nur noch per Verordnung ausschließen. Zum Gebotstermin ${LETZTER_TERMIN} hatte das laut Bundesnetzagentur kein Land getan.`,
    },
    {
      q: "Wie finde ich heraus, ob mein Acker in einem benachteiligten Gebiet liegt?",
      a: "Über den Agrar-Kartendienst Ihres Landes, etwa den Kartenviewer Agrar in Bayern, oder beim Amt für Landwirtschaft bzw. der Landwirtschaftskammer. Gleichen Sie zusätzlich Schutzgebiete ab. Eine Gesamteinschätzung liefert der [Flächencheck](/flaechencheck).",
    },
    {
      q: "Bekomme ich im benachteiligten Gebiet mehr Pacht?",
      a: `Nicht automatisch, aber die Fläche ist für mehr Betreiber interessant, weil sie mit EEG-Zuschlag finanziert werden kann. Übliche Pachten liegen bei ${fmt(PACHT.freiflaecheProHa.min)} bis ${fmt(PACHT.freiflaecheProHa.max)} €/ha; die Netzanbindung beeinflusst die Höhe oft stärker als die Kulisse.`,
    },
    {
      q: "Kann ein Land die Flächen wieder schließen, nachdem ich einen Pachtvertrag unterschrieben habe?",
      a: `Ja, wenn der Anteil der Solarparks an der Agrarfläche die Schwelle von ${fmtPct(SCHWELLE_BIS_2030, 0)} überschreitet und das Land eine Verordnung erlässt – oder für Landschaftsschutzgebiete und Naturparks. Regeln Sie diesen Fall im Vertrag, zum Beispiel mit Reservierungsentgelt und Rücktrittsfrist.`,
    },
    {
      q: "Brauche ich im benachteiligten Gebiet noch einen Bebauungsplan?",
      a: "In der Regel ja. Die EEG-Kulisse regelt nur die Förderfähigkeit, nicht das Baurecht. Ausnahmen gelten im privilegierten 200-m-Korridor an Autobahnen und zweigleisigen Bahnlinien sowie für kleine Agri-PV-Anlagen mit Hofbezug.",
    },
  ],

  passend: [
    { href: "/ratgeber/eeg-ausschreibung-freiflaeche", titel: "EEG-Ausschreibung Freifläche", text: "Gebotstermine, Zuschlagswerte und Flächenkulisse." },
    { href: "/ratgeber/solarpark-autobahn-bahn-privilegierung", titel: "Solarparks an Autobahn und Bahn", text: "Randstreifen, 200-m-Korridor und Privilegierung." },
    { href: "/ratgeber/solarpark-pacht-pro-hektar", titel: "Solarpark-Pacht pro Hektar", text: "Spannen, Einflussfaktoren und Rechenbeispiel." },
    { href: pfad("/flaechencheck"), titel: "Flächencheck", text: "Kulisse, Netz und Planungsrecht Ihrer Fläche prüfen." },
  ],

  quellen: [
    { titel: "EEG 2023, § 37c – Nichtberücksichtigung von Geboten in benachteiligten Gebieten", url: "https://www.gesetze-im-internet.de/eeg_2014/__37c.html", stand: "09/2026" },
    { titel: "EEG 2023, § 37 – Gebote für Solaranlagen des ersten Segments (Flächenkulisse, Agrardeckel)", url: "https://www.gesetze-im-internet.de/eeg_2014/__37.html", stand: "09/2026" },
    { titel: "EEG 2023, § 3 – Begriffsbestimmungen (Nr. 7 benachteiligtes Gebiet)", url: "https://www.gesetze-im-internet.de/eeg_2014/__3.html", stand: "09/2026" },
    { titel: "Bundesnetzagentur – Ausschreibung Solaranlagen erstes Segment, Gebotstermin 1. Juli 2026", url: "https://www.bundesnetzagentur.de/DE/Fachthemen/ElektrizitaetundGas/Ausschreibungen/Solaranlagen1/01072026/start.html", stand: "09/2026" },
    { titel: "Bayerisches Staatsministerium für Ernährung, Landwirtschaft, Forsten und Tourismus – Benachteiligte Gebiete in Bayern", url: "https://stmelf.bayern.de/agrarpolitik/foerderung/211365/index.php", stand: "09/2026" },
    { titel: "Kompetenzzentrum Naturschutz und Energiewende – Übersicht zur Anwendung der Länderöffnungsklausel", url: "https://www.naturschutz-energiewende.de/aktuelles/kne-veroeffentlicht-uebersicht-ueber-die-anwendung-der-laenderoeffnungsklausel-in-den-bundeslaendern/", stand: "09/2026" },
  ],

  seitenCta: {
    titel: "Liegt Ihre Fläche in der Kulisse?",
    text: "Kulisse, Netz und Planungsrecht in wenigen Minuten vorprüfen.",
    href: pfad("/flaechencheck"),
    label: "Zum Flächencheck",
  },
  cta: {
    title: "Lassen Sie Ihre Fläche kostenfrei einschätzen.",
    text: "Wir prüfen EEG-Kulisse, Netzanschluss und Planungsrecht Ihrer Fläche. Für Flächeneigentümer ist die Plattform von ÖkoInvest kostenfrei.",
    primary: { label: "Zum Flächencheck", href: pfad("/flaechencheck") },
    secondary: { label: "Fläche verpachten", href: pfad("/flaeche-verpachten") },
  },
};

export default artikel;
