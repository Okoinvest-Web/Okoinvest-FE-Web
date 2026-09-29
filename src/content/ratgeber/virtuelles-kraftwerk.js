// Ratgeber: Virtuelles Kraftwerk erklärt
// Rechtsstand September 2026: EEG 2023 (§ 10b Fernsteuerbarkeit, Direktvermarktung
// ab 100 kW, Solarspitzengesetz 2025), EnWG §§ 13, 13a, 14 (Redispatch 2.0),
// § 14a EnWG, Stromsteuer 0,05 ct/kWh für produzierendes Gewerbe ab 2026.
// Marktwerte aus @/lib/invest/markt (STROM, SPEICHER), Rechenbeispiel mit dem
// Rechenkern des Reststrom-Rechners (@/lib/rechner/reststrom).

import { STROM, SPEICHER, STAND } from "@/lib/invest/markt";
import { berechneReststrom } from "@/lib/rechner/reststrom";
import { fmt, fmtEur, fmtCt } from "@/lib/rechner/annahmen";

/* ------------------------------------------------------------------ */
/* Werte, die (noch) nicht in markt.js stehen – mit Quelle             */
/* ------------------------------------------------------------------ */

// Pflicht zur Direktvermarktung / Redispatch-2.0-Grenze (EEG 2023; EnWG §§ 13 ff., seit 1.10.2021)
const GRENZE_KW = 100;
// § 10b EEG 2023: Fernsteuerbarkeit bei Direktvermarktung ab mehr als 25 kW
const FERNSTEUER_KW = 25;
// Übertragungsnetzbetreiber (regelleistung.net): Mindestangebotsgröße Regelreserve in der Regel 1 MW, Pooling zulässig
const REGELENERGIE_MIN_MW = 1;
// Beispiel für die Größenordnung eines großen VKW (Next Kraftwerke, Pressemitteilung 16.05.2022)
const VKW_BEISPIEL = { mw: 10000, anlagen: 13000, jahr: 2022 };

/* ------------------------------------------------------------------ */
/* Rechenbeispiel: Mittelständler mit geplanter PV im Pool             */
/* ------------------------------------------------------------------ */

const PREIS_CT = Math.round(STROM.bestandteile.reduce((s, b) => s + b.ct, 0));
const BSP = { verbrauchMwh: 800, preisCt: PREIS_CT, profil: "zweischicht", pvKwp: 400, pvBestand: false, produzierend: true };
const R = berechneReststrom(BSP);
const hebel = (id) => R.hebel.find((h) => h.id === id);
const mwh = (kwh) => `${fmt(kwh / 1000)} MWh`;
const ct2 = (n) => fmtCt(n, 2);
const eurR = (n) => fmtEur(Math.round(n / 100) * 100);
const spanneCt = (h) => `${fmt(h.ct.min, 1)}–${fmt(h.ct.max, 1)} ct/kWh`;

const artikel = {
  slug: "virtuelles-kraftwerk",
  title: "Virtuelles Kraftwerk erklärt: Aufbau, Vermarktung und Nutzen",
  seoTitle: "Virtuelles Kraftwerk erklärt: Aufbau & Nutzen | ÖkoInvest",
  kurzTitel: "Virtuelles Kraftwerk",
  description:
    "Virtuelles Kraftwerk erklärt: Bestandteile, Direktvermarktung, Intraday, Regelenergie, Redispatch 2.0 und was Anlagenbetreiber und Mittelstand davon haben.",
  excerpt:
    "Viele Solarparks, Speicher und flexible Verbraucher, gesteuert wie ein großes Kraftwerk: Wie ein virtuelles Kraftwerk funktioniert, wo es Geld verdient und wie Unternehmen ihren Reststrom darüber günstiger beziehen können.",
  hauptKeyword: "virtuelles kraftwerk",
  keywords: [
    "Virtuelles Kraftwerk",
    "Virtuelles Kraftwerk erklärt",
    "Direktvermarktung Solarpark",
    "Regelenergie Pool",
    "Redispatch 2.0",
    "Flexibilitätsvermarktung",
    "Reststrom Unternehmen",
  ],
  veroeffentlicht: "2026-09-29",
  aktualisiert: "2026-09-29",
  kategorie: "Strom, Markt & Gemeinschaft",
  bild: "/img/pv-wind-abend.jpg",
  bildAlt: "Solarmodule im Vordergrund, dahinter Windräder vor orangefarbenem Abendhimmel",
  badge: { wert: `ab ${GRENZE_KW} kW`, text: "Direktvermarktung und Redispatch 2.0 sind für neue Anlagen Pflicht" },

  kurzFazit: [
    "**Ein virtuelles Kraftwerk (VKW) verbindet viele dezentrale Anlagen – Solarparks, Wind, Speicher, flexible Verbraucher – über eine Leitwarte und Fernsteuerung zu einem Verbund**, der am Strommarkt auftritt wie ein großes Kraftwerk.",
    `Neue Erneuerbaren-Anlagen ab **${GRENZE_KW} kW** müssen ihren Strom in der Regel direkt vermarkten und sind in **Redispatch 2.0** eingebunden. Das VKW übernimmt Prognose, Fahrplan, Fernsteuerung und Datenmeldungen.`,
    `Geld verdient wird am **Day-Ahead- und Intraday-Markt**, mit **Regelenergie** (Mindestgebot meist ${REGELENERGIE_MIN_MW} MW – nur im Pool für kleine Einheiten erreichbar) und durch das Verschieben von Strom mit Speichern und flexiblen Lasten.`,
    `Für Unternehmen senkt der Verbund die Beschaffungskosten: Im Beispiel dieses Artikels spart ein Betrieb mit ${fmt(BSP.verbrauchMwh)} MWh Verbrauch und neuer PV rund **${eurR(R.gesamt.eurMin)} bis ${eurR(R.gesamt.eurMax)} im Jahr** beim Reststrom – Orientierung, kein Angebot.`,
  ],

  abschnitte: [
    {
      id: "antwort",
      titel: "Was ist ein virtuelles Kraftwerk?",
      tocLabel: "Die kurze Antwort",
      bloecke: [
        {
          typ: "p",
          text: "**Ein virtuelles Kraftwerk ist ein Verbund aus vielen kleinen und mittleren Erzeugungsanlagen, Speichern und steuerbaren Verbrauchern, die über Software und Fernsteuerung gemeinsam geplant, vermarktet und gesteuert werden.** Physisch bleibt jede Anlage an ihrem Standort. „Virtuell“ ist nur das Kraftwerk als Ganzes: Es entsteht in der Leitwarte, die aus Tausenden Einzelwerten einen Fahrplan macht.",
        },
        {
          typ: "p",
          text: "Der Grund ist einfach: Ein einzelner Solarpark mit 5 MWp ist für den Großhandel zu klein, zu wetterabhängig und zu schlecht prognostizierbar. Im Verbund gleichen sich Prognosefehler aus, Speicher fangen Spitzen ab, und die Menge reicht für Märkte, die ein Einzelbetreiber nicht erreicht. Wie das bei ÖkoInvest aufgebaut ist, zeigt die Seite [Virtuelles Kraftwerk](/virtuelles-kraftwerk); das Grundprinzip erklärt auch das [Lexikon](/wissen/lexikon#virtuelles-kraftwerk).",
        },
        {
          typ: "kennzahl",
          wert: `${fmt(VKW_BEISPIEL.mw)} MW`,
          titel: "vernetzte Leistung eines der großen europäischen virtuellen Kraftwerke",
          text: `Next Kraftwerke meldete ${VKW_BEISPIEL.jahr} über ${fmt(VKW_BEISPIEL.anlagen)} vernetzte Anlagen mit mehr als ${fmt(VKW_BEISPIEL.mw)} MW Leistung – ein Beispiel für die Größenordnung, die solche Verbünde erreichen.`,
        },
      ],
    },
    {
      id: "bestandteile",
      titel: "Die Bestandteile eines virtuellen Kraftwerks",
      tocLabel: "Bestandteile",
      bloecke: [
        {
          typ: "p",
          text: "**Ein virtuelles Kraftwerk besteht aus drei Ebenen: den Anlagen, der Kommunikation dorthin und der Leitwarte mit Prognose und Handel.** Erst das Zusammenspiel macht den Verbund wertvoll – Erzeugung ohne Abnehmer ist Börsenrisiko, Verbrauch ohne eigene Erzeugung ist Preisrisiko.",
        },
        {
          typ: "tabelle",
          caption: "Beteiligte und Komponenten eines virtuellen Kraftwerks",
          kopf: ["Baustein", "Beispiele", "Aufgabe im Verbund"],
          zeilen: [
            ["Erzeuger", "Freiflächen-PV, Agri-PV, Solarcarports, Wind, Biogas", "liefern Energie; Ost/West- und vertikale Anlagen glätten das Tagesprofil"],
            ["Speicher", "Großspeicher am Park oder Netzknoten, Gewerbespeicher", "verschieben Strom in teure Stunden, liefern Regelleistung"],
            ["Flexible Lasten", "Kühlhäuser, Druckluft, Pumpen, Ladeparks, Wärmepumpen", "verbrauchen, wenn Strom günstig ist; reduzieren in Spitzen"],
            ["Steuerbox / Fernwirktechnik", "Fernwirkgerät, Direktvermarkter-Box, Parkregler", "liest Ist-Einspeisung aus, setzt Sollwerte (Abregeln, Laden, Entladen)"],
            ["Smart-Meter-Gateway", "intelligentes Messsystem nach BSI-Standard", "sichere Messwerte im Viertelstundenraster; perspektivisch auch Steuerung"],
            ["Leitwarte / Leitsystem", "Prognose, Fahrplanmanagement, Handelsanbindung", "plant im Viertelstundenraster, handelt, überwacht, meldet"],
            ["Bilanzkreis & Marktpartner", "Direktvermarkter, Lieferant, Netzbetreiber, Übertragungsnetzbetreiber", "Bilanzierung, Abrechnung, Redispatch- und Regelenergie-Prozesse"],
          ],
          minBreite: 680,
          fussnote: `Nach § 10b EEG 2023 müssen direktvermarktete Anlagen mit mehr als ${FERNSTEUER_KW} kW so ausgestattet sein, dass der Direktvermarkter die Ist-Einspeisung abrufen und die Leistung ferngesteuert regeln kann. Ab 2028 kann das nach Einbau eines intelligenten Messsystems über das Smart-Meter-Gateway erfolgen.`,
        },
        {
          typ: "p",
          text: `Besonders wertvoll sind **Speicher**. Ein Batteriespeicher erreicht im Großmaßstab einen Wirkungsgrad um ${fmt(SPEICHER.wirkungsgrad * 100)} % und rund ${fmt(SPEICHER.zyklenProJahr)} Vollzyklen im Jahr – er ist das Werkzeug, mit dem der Verbund Mittagsüberschüsse in den Abend trägt. Mehr zu Erlösen und Investition steht im Ratgeber [Großspeicher-Erlöse](/ratgeber/grossspeicher-erloese) und auf der Seite [Großspeicher](/grossspeicher).`,
        },
      ],
    },
    {
      id: "vermarktung",
      titel: "Wie verdient ein virtuelles Kraftwerk Geld?",
      tocLabel: "Vermarktungswege",
      bloecke: [
        {
          typ: "p",
          text: "**Ein virtuelles Kraftwerk kombiniert mehrere Vermarktungswege: Direktvermarktung mit Marktprämie oder per PPA, den Handel am Day-Ahead- und Intraday-Markt, Regelenergie und die Mitwirkung am Redispatch.** Welche Wege eine Anlage nutzen kann, hängt von Größe, Technik und Förderstatus ab.",
        },
        {
          typ: "tabelle",
          caption: "Vermarktungswege eines virtuellen Kraftwerks im Überblick (Deutschland)",
          kopf: ["Weg", "Was passiert", "Für wen", "Erlös / Nutzen"],
          zeilen: [
            ["Direktvermarktung (Marktprämie)", "Strom wird an der Börse verkauft, Netzbetreiber zahlt Marktprämie bis zum anzulegenden Wert", `Pflicht für neue Anlagen ab ${GRENZE_KW} kW`, "Börsenerlös plus Prämie, abzüglich Vermarktungsentgelt"],
            ["PPA", "Liefervertrag direkt mit einem Abnehmer über mehrere Jahre", "Parks ohne oder neben EEG-Förderung", "planbarer Preis, Herkunftsnachweise"],
            ["Day-Ahead", "Auktion am Vortag für jede Viertelstunde bzw. Stunde des Folgetags", "gesamter Verbund", "Grundlage für Fahrplan, Speicher-Arbitrage"],
            ["Intraday", "kontinuierlicher Handel bis kurz vor Lieferung", "gesamter Verbund", "Prognosefehler ausgleichen, kurzfristige Preisspitzen nutzen"],
            ["Regelenergie (FCR, aFRR, mFRR)", "Leistung wird für den Übertragungsnetzbetreiber vorgehalten und bei Bedarf abgerufen", `präqualifizierte Einheiten, Mindestgebot meist ${REGELENERGIE_MIN_MW} MW im Pool`, "Leistungs- und Arbeitspreis; vor allem für Speicher"],
            ["Redispatch 2.0", "Netzbetreiber regelt Anlagen bei Netzengpässen ab oder hoch", `Anlagen ab ${GRENZE_KW} kW und fernsteuerbare Anlagen`, "Pflichtprozess; finanzieller bzw. bilanzieller Ausgleich"],
          ],
          minBreite: 760,
          fussnote: "Vereinfachte Darstellung. Konkrete Bedingungen, Entgelte und Präqualifikationsanforderungen regeln Direktvermarktungsvertrag, Übertragungsnetzbetreiber (regelleistung.net) und Netzbetreiber.",
        },
        { typ: "h3", text: "Direktvermarktung und negative Preise" },
        {
          typ: "p",
          text: "Seit dem Solarspitzengesetz (Februar 2025) erhalten neue geförderte Anlagen in Viertelstunden mit **negativen Börsenpreisen keine Marktprämie** mehr; die entgangene Förderung wird nach Ende des 20-jährigen Förderzeitraums anteilig nachgeholt. Für den Verbund heißt das: In diesen Viertelstunden wird abgeregelt oder eingespeichert statt draufgezahlt. Wie häufig das vorkommt, zeigt [Energie live](/energie-live); Begriffe wie [Direktvermarktung](/wissen/lexikon#direktvermarktung) und [negative Strompreise](/wissen/lexikon#negative-strompreise) erklärt das Lexikon.",
        },
        { typ: "h3", text: "Regelenergie im Pool" },
        {
          typ: "p",
          text: `Übertragungsnetzbetreiber beschaffen Regelreserve in drei Qualitäten: Primärregelleistung (FCR), Sekundärregelleistung (aFRR) und Minutenreserve (mFRR). Das Mindestgebot liegt in der Regel bei ${REGELENERGIE_MIN_MW} MW, und jede Einheit muss präqualifiziert sein. Ein einzelner Gewerbespeicher erreicht das kaum – im Pool eines VKW können mehrere Einheiten gemeinsam anbieten. Details erklärt das Lexikon unter [Regelenergie](/wissen/lexikon#regelenergie).`,
        },
        { typ: "h3", text: "Redispatch 2.0" },
        {
          typ: "p",
          text: `Seit 1. Oktober 2021 sind alle Erzeugungs- und Speicheranlagen ab ${GRENZE_KW} kW sowie jederzeit fernsteuerbare Anlagen in das Engpassmanagement der Netzbetreiber nach §§ 13, 13a und 14 EnWG einbezogen. Das bringt Stammdaten-, Planungsdaten- und Nichtverfügbarkeitsmeldungen mit sich. Ein VKW übernimmt diese Prozesse gebündelt – für Betreiber mehrerer Parks eine spürbare Entlastung. Mehr unter [Redispatch](/wissen/lexikon#redispatch).`,
        },
      ],
    },
    {
      id: "flexibilitaet",
      titel: "Flexibilität: Warum verschiebbare Last bares Geld ist",
      tocLabel: "Flexibilität",
      bloecke: [
        {
          typ: "p",
          text: "**Strom kostet nicht jede Viertelstunde gleich viel: Mittags drückt Solarstrom die Börsenpreise, abends steigen sie wieder.** Wer Verbrauch in günstige Viertelstunden legt oder Speicher gezielt lädt und entlädt, senkt seine Kosten – ohne weniger Strom zu verbrauchen.",
        },
        {
          typ: "karten",
          cols: 2,
          items: [
            { titel: "Lastverschiebung", text: "Kühlung vorziehen, Druckluftspeicher füllen, Ladevorgänge von Flotten in die Mittagsstunden legen. Oft reichen Verschiebungen von ein bis drei Stunden." },
            { titel: "Speicher-Arbitrage", text: "Laden bei niedrigen, Entladen bei hohen Preisen. Der Hebel steigt mit der Preisdifferenz zwischen Mittag und Abend. Siehe [Arbitrage](/wissen/lexikon#arbitrage)." },
            { titel: "Spitzenkappung", text: "Speicher und steuerbare Lasten senken Lastspitzen – relevant für Betriebe, deren Netzentgelt einen Leistungspreis enthält." },
            { titel: "Abregeln statt draufzahlen", text: "Bei negativen Preisen regelt der Verbund Erzeugung ab oder lädt Speicher. Das schützt Erlöse von Parks in der Direktvermarktung." },
          ],
        },
        {
          typ: "p",
          text: "**Rahmenbedingungen, die nur teilweise relevant sind:** Nach § 14a EnWG erhalten steuerbare Verbrauchseinrichtungen im Niederspannungsnetz – etwa Wärmepumpen, Wallboxen und Speicher – reduzierte Netzentgelte, seit April 2025 auch als zeitvariables Netzentgelt (Modul 3). Für die meisten Mittelständler am Mittelspannungsnetz spielt das keine Rolle; für Filialen, Handel und Büros am Niederspannungsnetz kann es sich lohnen.",
        },
      ],
    },
    {
      id: "nutzen",
      titel: "Was haben Anlagenbetreiber und Mittelstand davon?",
      tocLabel: "Nutzen",
      bloecke: [
        { typ: "h3", text: "Für Betreiber von Solarparks und Speichern" },
        {
          typ: "liste",
          punkte: [
            "**Bessere Prognosen, weniger Ausgleichsenergie:** Im Verbund gleichen sich Abweichungen einzelner Parks aus.",
            "**Zugang zu Märkten:** Regelenergie und kurzfristiger Handel werden auch für kleinere Einheiten erreichbar.",
            "**Pflichten gebündelt erfüllt:** Fernsteuerbarkeit, Redispatch-2.0-Daten und Abregelung bei negativen Preisen laufen über eine Stelle.",
            "**Abnehmer im Verbund:** Ein Pool aus Unternehmen macht [PPA](/wissen/lexikon#ppa)-Vermarktung planbarer. Wer Parks entwickelt oder kauft, findet Projekte in der [Projektbörse](/projektboerse).",
          ],
        },
        { typ: "h3", text: "Für mittelständische Unternehmen" },
        {
          typ: "p",
          text: "Auch ein Betrieb mit eigener Photovoltaik und Speicher bezieht einen großen Teil seines Stroms weiterhin aus dem Netz – nachts, im Winter, in Spitzen. Dieser **Reststrom** wird meist per Einzelvertrag zu einem Stichtag eingekauft. Der Ansatz von ÖkoInvest: Unternehmen, denen die ÖKOVOLT Gruppe Photovoltaik und Speicher baut, beziehen diesen Reststrom **gebündelt über das virtuelle Kraftwerk**. Drei Hebel wirken dabei auf die Beschaffungskomponente – nicht auf Netzentgelte, Umlagen und Steuern:",
        },
        {
          typ: "tabelle",
          caption: "Hebel eines Reststrom-Pools auf die Beschaffungskomponente (Orientierungswerte)",
          kopf: ["Hebel", "Wirkung", "Spanne"],
          zeilen: STROM.poolHebel.map((h) => [
            h.label,
            {
              buendelung: "größere Menge, Einkauf in Tranchen statt zu einem Stichtag",
              ppa: "Solarstrom für die Tagesstunden direkt aus Parks",
              flex: "Verbrauch und Speicher in günstige Viertelstunden legen",
            }[h.id] || "",
            spanneCt(h),
          ]),
          minBreite: 600,
          fussnote: `Spannen je kWh Reststrom, vorsichtige Einschätzung ÖkoInvest, Stand ${STAND}. Der tatsächliche Effekt hängt von Lastprofil, Menge, Vertragslaufzeit und Marktlage ab; die Hebel addieren sich nicht beliebig.`,
        },
      ],
    },
    {
      id: "beispiel",
      titel: "Rechenbeispiel: Mittelständler mit neuer PV im Pool",
      tocLabel: "Rechenbeispiel",
      bloecke: [
        {
          typ: "p",
          text: `**Ein Zweischichtbetrieb mit ${fmt(BSP.verbrauchMwh)} MWh Jahresverbrauch und einer neuen ${fmt(BSP.pvKwp)}-kWp-Dachanlage bezieht trotz PV noch rund ${mwh(R.reststromKwh)} Reststrom aus dem Netz.** Wir rechnen mit einem Gesamtpreis von ${fmtCt(PREIS_CT, 0)} netto, davon ${fmtCt(R.fixSumme)} nicht beeinflussbare Bestandteile (Netz, Umlagen, Konzessionsabgabe, Stromsteuer).`,
        },
        {
          typ: "tabelle",
          caption: `Beispiel: ${fmt(BSP.verbrauchMwh)} MWh Verbrauch, Zweischicht, ${fmt(BSP.pvKwp)} kWp PV (Rechenkern des Reststrom-Rechners)`,
          kopf: ["Position", "Wert"],
          zeilen: [
            ["PV-Ertrag im Jahr", mwh(R.pvErtrag)],
            ["Davon selbst verbraucht", mwh(R.eigenverbrauch)],
            ["Reststrom aus dem Netz", mwh(R.reststromKwh)],
            ["Beschaffungskomponente heute", fmtCt(R.beschaffungVorher)],
            ["Bündelung & strukturierte Beschaffung", `${ct2(hebel("buendelung").ctMin)} – ${ct2(hebel("buendelung").ctMax)}`],
            ["Solarstrom aus Parks (PPA)", `${ct2(hebel("ppa").ctMin)} – ${ct2(hebel("ppa").ctMax)}`],
            ["Flexibilität & Speicher", `${ct2(hebel("flex").ctMin)} – ${ct2(hebel("flex").ctMax)}`],
            ["Ersparnis Pool pro Jahr", `${eurR(R.gesamt.eurMin)} – ${eurR(R.gesamt.eurMax)}`],
            ["Zusätzlich: Stromsteuer-Entlastung (produzierendes Gewerbe)", R.stromsteuer ? eurR(R.stromsteuer.eur) : "–"],
          ],
          markierteZeile: 7,
          minBreite: 340,
          fussnote: `Berechnet mit denselben Annahmen wie der Reststrom-Rechner (Stand ${STAND}). Der PPA-Hebel fällt kleiner aus, weil die eigene PV die Tagesstunden bereits teilweise deckt. Die Stromsteuer-Entlastung ist keine Leistung des Pools, sondern ein Antrag beim Hauptzollamt. Orientierung, kein Angebot.`,
        },
        {
          typ: "p",
          text: `Die Stromsteuer für Unternehmen des produzierenden Gewerbes sowie der Land- und Forstwirtschaft liegt seit 1. Januar 2026 dauerhaft beim EU-Mindestsatz von ${fmtCt(STROM.stromsteuerProduzierend, 2)} statt ${fmtCt(STROM.bestandteile.find((b) => b.id === "stromsteuer").ct, 2)} – in diesem Beispiel ein Effekt in ähnlicher Größenordnung wie der Pool. Beides lässt sich kombinieren. Details zur Stromsteuer finden Sie im [Lexikon](/wissen/lexikon#stromsteuer).`,
        },
        {
          typ: "tool",
          href: "/rechner/reststrom",
          titel: "Rechnen Sie Ihr eigenes Lastprofil durch",
          text: "Verbrauch, Tarif, Schichtmodell und PV eingeben: Der Reststrom-Rechner zeigt die Spanne je Hebel und die Stromsteuer-Entlastung.",
          label: "Zum Reststrom-Rechner",
        },
      ],
    },
    {
      id: "grenzen",
      titel: "Grenzen und typische Missverständnisse",
      bloecke: [
        {
          typ: "checkliste",
          punkte: [
            "**Kein Hebel auf Netzentgelte und Umlagen:** Rund die Hälfte des gewerblichen Strompreises ist staatlich oder regulatorisch bestimmt. Ein virtuelles Kraftwerk senkt die Beschaffungskosten, nicht diese Bestandteile.",
            "**Kleine Mengen, kleiner Effekt:** Unter etwa 100 MWh Jahresverbrauch lohnt sich der Aufwand für Messung und Steuerung in der Regel kaum.",
            "**Flexibilität muss real sein:** Wer Prozesse nicht verschieben kann oder will, profitiert nur von Bündelung und PPA.",
            "**Datenzugang und Technik:** Ohne Viertelstundenwerte (Lastgangzähler oder Smart-Meter-Gateway) und steuerbare Schnittstellen bleibt das Potenzial theoretisch.",
            "**Regelenergie ist kein Selbstläufer:** Präqualifikation, Verfügbarkeitsanforderungen und schwankende Preise machen Erlöse volatil; Prognosen früherer Jahre lassen sich nicht fortschreiben.",
          ],
        },
        {
          typ: "kasten",
          variant: "recht",
          titel: "Rechtsrahmen im DACH-Raum",
          text: "In Deutschland regeln EEG 2023 (Direktvermarktung, § 10b Fernsteuerbarkeit) und EnWG (Redispatch, § 14a) die Pflichten. In Österreich und der Schweiz gibt es vergleichbare Direktvermarktungs- und Regelreservemärkte, aber andere Förderregeln (EAG bzw. Einmalvergütung und Minimalvergütung). Verträge mit Direktvermarkter oder Pool-Betreiber sollten Laufzeit, Entgelte, Haftung bei Fehlprognosen und Datenrechte klar regeln – lassen Sie sich im Zweifel rechtlich beraten.",
        },
      ],
    },
    {
      id: "vorgehen",
      titel: "So kommen Sie ins virtuelle Kraftwerk",
      tocLabel: "Vorgehen",
      bloecke: [
        {
          typ: "ablauf",
          schritte: [
            ["Daten zusammenstellen", "Lastgang der letzten zwölf Monate (Viertelstundenwerte), aktueller Liefervertrag mit Laufzeit, vorhandene oder geplante PV und Speicher."],
            ["Potenzial abschätzen", "Mit dem [Reststrom-Rechner](/rechner/reststrom) die Spanne je Hebel ermitteln und prüfen, ob die Stromsteuer-Entlastung schon beantragt ist."],
            ["Flexibilität identifizieren", "Welche Prozesse lassen sich verschieben, welche Speicher sind vorhanden oder sinnvoll?"],
            ["Technik anbinden", "Messung und Steuerung einrichten: Lastgangzähler bzw. Smart-Meter-Gateway, Steuerbox für PV und Speicher."],
            ["Vertrag und Einstieg", "Beitritt zum Pool mit Beginn nach Ende des laufenden Liefervertrags; Betreiber von Parks vereinbaren Direktvermarktung oder PPA."],
          ],
        },
        {
          typ: "p",
          text: "Wie der Reststrom-Pool aufgebaut ist und für wen er gedacht ist, beschreibt die Seite [Reststrom](/reststrom). Für Bürger und Kommunen ist daneben der Ratgeber [Energy Sharing und Energiegemeinschaften](/ratgeber/energy-sharing-energiegemeinschaften) interessant.",
        },
      ],
    },
  ],

  faq: [
    {
      q: "Was ist ein virtuelles Kraftwerk einfach erklärt?",
      a: "Ein Verbund aus vielen Solar- und Windanlagen, Speichern und steuerbaren Verbrauchern, die über eine zentrale Leitwarte gemeinsam gesteuert und vermarktet werden. Nach außen tritt der Verbund auf wie ein großes Kraftwerk, obwohl jede Anlage an ihrem Standort bleibt.",
    },
    {
      q: "Muss mein Solarpark in ein virtuelles Kraftwerk?",
      a: `Nicht zwingend, aber neue Anlagen ab ${GRENZE_KW} kW müssen ihren Strom in der Regel direkt vermarkten und fernsteuerbar sein. Die meisten Direktvermarkter betreiben dafür ein virtuelles Kraftwerk. Zudem ist jede Anlage ab ${GRENZE_KW} kW in Redispatch 2.0 eingebunden.`,
    },
    {
      q: "Wie verdient ein virtuelles Kraftwerk Geld?",
      a: "Durch den Verkauf von Strom am Day-Ahead- und Intraday-Markt, durch Regelenergie, durch Speicher-Arbitrage und durch Lastverschiebung. Der Betreiber erhält in der Regel ein Vermarktungsentgelt oder einen Anteil an den Zusatzerlösen.",
    },
    {
      q: "Können auch kleine Anlagen teilnehmen?",
      a: `Ja. Gerade für kleine Einheiten ist der Pool wichtig, weil etwa Regelenergie ein Mindestgebot von meist ${REGELENERGIE_MIN_MW} MW verlangt. Voraussetzung sind Fernsteuerbarkeit, Messung im Viertelstundenraster und – für Regelenergie – eine Präqualifikation.`,
    },
    {
      q: "Welche Rolle spielt das Smart-Meter-Gateway?",
      a: "Es liefert sichere Viertelstundenwerte und soll künftig auch Steuerbefehle übertragen. Nach § 10b EEG kann die Fernsteuerbarkeit ab 2028 über das Smart-Meter-Gateway erfüllt werden; bis dahin sind andere Fernwirklösungen nach Stand der Technik üblich.",
    },
    {
      q: "Spart ein Unternehmen über das virtuelle Kraftwerk Netzentgelte?",
      a: "In der Regel nicht direkt. Der Pool wirkt auf die Beschaffungskomponente. Indirekt können Speicher und Lastverschiebung Leistungsspitzen senken und damit leistungsabhängige Netzentgelte reduzieren; § 14a EnWG betrifft nur steuerbare Verbrauchseinrichtungen im Niederspannungsnetz.",
    },
  ],

  passend: [
    { href: "/virtuelles-kraftwerk", titel: "Virtuelles Kraftwerk von ÖkoInvest", text: "Parks, Speicher und Unternehmen im Verbund." },
    { href: "/reststrom", titel: "Reststrom-Pool", text: "Was PV und Speicher nicht decken – gebündelt beschafft." },
    { href: "/ratgeber/ppa-fuer-unternehmen", titel: "PPA für Unternehmen", text: "Solarstrom direkt vom Park beziehen." },
    { href: "/energie-live", titel: "Energie live", text: "Börsenpreise und negative Preise in Echtzeit." },
  ],

  quellen: [
    { titel: "§ 10b EEG 2023 – Anforderungen an Anlagen in der Direktvermarktung (Fernsteuerbarkeit)", url: "https://www.gesetze-im-internet.de/eeg_2014/__10b.html", stand: "09/2026" },
    { titel: "BDEW – Redispatch 2.0", url: "https://www.bdew.de/energie/redispatch-20/", stand: "09/2026" },
    { titel: "Bundesverband Solarwirtschaft – FAQ Solarspitzengesetz", url: "https://www.solarwirtschaft.de/unsere-themen/photovoltaik/standpunkte/faq-solarspitzengesetz/", stand: "09/2026" },
    { titel: "regelleistung.net – FAQ Regelleistung", url: "https://www.regelleistung.net/xspproxy/api/staticfiles/regelleistung/regelleistung_files/faqregelleistung.pdf", stand: "09/2026" },
    { titel: "Bundesnetzagentur – Integration von steuerbaren Verbrauchseinrichtungen (§ 14a EnWG)", url: "https://www.bundesnetzagentur.de/DE/Vportal/Energie/SteuerbareVBE/start.html", stand: "09/2026" },
    { titel: "Deutscher Bundestag – Stromsteuersenkung für Produzenten und Landwirte verstetigt", url: "https://www.bundestag.de/dokumente/textarchiv/2025/kw46-de-energiesteuer-1126268", stand: "09/2026" },
    { titel: "Next Kraftwerke – Next Kraftwerke überschreitet 10.000 MW vernetzter Leistung", url: "https://www.next-kraftwerke.de/neues/next-kraftwerke-10-000-megawatt", stand: "09/2026" },
  ],

  seitenCta: {
    titel: "Was spart Ihr Reststrom im Pool?",
    text: "Spanne je Hebel für Ihr Lastprofil in einer Minute.",
    href: "/rechner/reststrom",
    label: "Zum Reststrom-Rechner",
  },
  cta: {
    title: "Teil des Verbunds werden.",
    text: "Ob Solarpark, Speicher oder Unternehmen mit Reststrom: Schildern Sie uns Ihre Situation – wir prüfen, welche Rolle im virtuellen Kraftwerk für Sie passt.",
    primary: { label: "Reststrom berechnen", href: "/rechner/reststrom" },
    secondary: { label: "Kontakt aufnehmen", href: "/kontakt" },
  },
};

export default artikel;
