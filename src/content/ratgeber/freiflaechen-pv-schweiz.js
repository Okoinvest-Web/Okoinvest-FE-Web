// Ratgeber: Freiflächen-PV in der Schweiz – Raumplanung (RPG/RPV), Solarexpress, Mantelerlass, Förderung, LEG/ZEV
// Recherchestand 29.09.2026: Kanton Luzern Merkblatt Solaranlagen (gültig ab 01.01.2026, Art. 24ter RPG,
// Art. 32c RPV), Swissolar „2026: Was gilt neu“, Pronovo PV-Auktionen (Runde Q4/2026), BFE Förderung PV,
// Stromzeit (Solarexpress-Stand 10/2025 und Fristverlängerung vom 21.03.2025), Swissvotes (Stromgesetz 09.06.2024).

import { REGIONEN, GEMEINSCHAFTEN, regionById } from "@/lib/invest/markt";
import { fmt } from "@/lib/rechner/annahmen";

/* Werte, die (noch) nicht in markt.js stehen – Vorschlag für markt.js siehe Bericht */
// HEIV: bis 60 % der Investitionskosten von Referenzanlagen (BFE, Pronovo)
const HEIV_MAX_ANTEIL = 0.6;
// EIV (KLEIV/GREIV): bis 30 % der Referenzinvestitionskosten (BFE)
const EIV_MAX_ANTEIL = 0.3;
// Auktionen HEIV / gleitende Marktprämie ab 150 kW ohne Eigenverbrauch (Pronovo)
const AUKTION_AB_KW = 150;
// Auktionsrunde Q4/2026 (Pronovo): HEIV 50 MW, Höchstgebot CHF 620/kW; GMP 10 MW, Höchstgebot 10 Rp./kWh
const HEIV_HOECHSTGEBOT_CHF_KW = 620;
const HEIV_VOLUMEN_MW = 50;
const GMP_HOECHSTGEBOT_RP = 10;
const GMP_VOLUMEN_MW = 10;
// Minimalvergütung ab 2026 (Swissolar): 6 Rp./kWh bis 30 kW, sinkend auf 1,2 Rp./kWh bei 149 kW
const MINIMAL_RP_BIS_30KW = 6;
const MINIMAL_RP_149KW = 1.2;
// LEG: Abschlag auf Netznutzungsentgelt 40 %, 20 % bei Nutzung der Transformationsebene (Swissolar)
const LEG_ABSCHLAG = 0.4;
const LEG_ABSCHLAG_TRAFO = 0.2;
// Solarexpress (Art. 71a EnG): Mindestproduktion 10 GWh/a, 500 kWh/kW im Winterhalbjahr, Ziel 2 TWh
const SOLAREXPRESS_MIN_GWH = 10;
const SOLAREXPRESS_WINTER_KWH_KW = 500;
const SOLAREXPRESS_ZIEL_TWH = 2;
// Stromgesetz (Mantelerlass): Ja-Anteil Volksabstimmung 09.06.2024
const MANTELERLASS_JA = 68.7;

const CH = regionById("ch");
const BEISPIEL_KW = 2000;
const BEISPIEL_ERTRAG_KWH = BEISPIEL_KW * CH.ertrag;
const HEIV_OBERGRENZE_CHF = BEISPIEL_KW * HEIV_HOECHSTGEBOT_CHF_KW;
const GMP_MAX_ERLOES_CHF = (BEISPIEL_ERTRAG_KWH * GMP_HOECHSTGEBOT_RP) / 100;
const AT_ERTRAG = REGIONEN.find((r) => r.id === "at").ertrag;

const artikel = {
  slug: "freiflaechen-pv-schweiz",
  title: "Freiflächen-PV in der Schweiz: Raumplanung, Solarexpress, Förderung",
  seoTitle: "Freiflächen-PV Schweiz: RPG, Solarexpress | ÖkoInvest",
  kurzTitel: "Freiflächen-PV Schweiz",
  description:
    "Freiflächen-PV in der Schweiz: Wann Solaranlagen ausserhalb der Bauzone bewilligt werden, Solarexpress, HEIV-Auktionen ab 150 kW, LEG und vZEV – Stand 2026.",
  excerpt:
    "Solarparks auf der grünen Wiese sind in der Schweiz die Ausnahme. Seit dem Stromgesetz gibt es aber neue Wege: freistehende Anlagen in wenig empfindlichen Gebieten, Agri-PV mit landwirtschaftlichem Nutzen, alpine Grossanlagen und Auktionen mit bis zu 60 % Einmalvergütung.",
  hauptKeyword: "freiflächen pv schweiz",
  keywords: [
    "Freiflächen-PV Schweiz",
    "Solaranlage ausserhalb Bauzone",
    "Art. 24ter RPG Solaranlagen",
    "Solarexpress alpine Solaranlagen",
    "HEIV Auktion Photovoltaik",
    "Agri-PV Schweiz Bewilligung",
    "Lokale Elektrizitätsgemeinschaft LEG",
  ],
  veroeffentlicht: "2026-09-29",
  aktualisiert: "2026-09-29",
  kategorie: "Recht & Genehmigung",
  bild: "/img/solarpark-reihen.jpg",
  bildAlt: "Dicht gereihte Solarmodule mit Wechselrichtern und Kabeltrassen aus der Vogelperspektive",
  badge: { wert: `bis ${fmt(HEIV_MAX_ANTEIL * 100)} %`, text: "Einmalvergütung für Anlagen ohne Eigenverbrauch" },

  kurzFazit: [
    "**Ausserhalb der Bauzone ist eine Solaranlage nur zulässig, wenn sie als standortgebunden gilt.** Seit 2025 regelt Art. 24ter RPG das für freistehende Anlagen: wenig empfindliches oder vorbelastetes Gebiet, angemessener Erschliessungsaufwand.",
    "**Agri-PV** auf landwirtschaftlicher Nutzfläche ist nur bewilligungsfähig, wenn sie der Landwirtschaft Vorteile bringt oder Versuchs- und Forschungszwecken dient.",
    `Der **Solarexpress** für alpine Grossanlagen (ab ${fmt(SOLAREXPRESS_MIN_GWH)} GWh/Jahr) setzte eine öffentliche Auflage bis 31.12.2025 voraus; gefördert wird mit bis zu ${fmt(HEIV_MAX_ANTEIL * 100)} % der Investitionskosten. Das ${fmt(SOLAREXPRESS_ZIEL_TWH)}-TWh-Ziel wird nach aktuellem Stand deutlich verfehlt.`,
    `Anlagen ab **${fmt(AUKTION_AB_KW)} kW ohne Eigenverbrauch** erhalten die hohe Einmalvergütung (HEIV) oder die gleitende Marktprämie per Auktion – Runde Q4/2026: HEIV-Höchstgebot CHF ${fmt(HEIV_HOECHSTGEBOT_CHF_KW)}/kW.`,
    `Seit 2026 gelten die Rückliefervergütung zum Referenzmarktpreis mit Minimalvergütung für Anlagen unter 150 kW sowie **lokale Elektrizitätsgemeinschaften (LEG)** mit ${fmt(LEG_ABSCHLAG * 100)} % Rabatt auf das Netznutzungsentgelt.`,
  ],

  abschnitte: [
    {
      id: "antwort",
      titel: "Sind Solarparks in der Schweiz erlaubt?",
      tocLabel: "Kurze Antwort",
      bloecke: [
        {
          typ: "p",
          text: "**Ja, aber nur unter engen Voraussetzungen: Eine Solaranlage ausserhalb der Bauzone braucht eine Bewilligung, und die gibt es nur, wenn die Anlage als standortgebunden gilt.** Die Schweiz trennt Baugebiet und Nichtbaugebiet streng; das Raumplanungsgesetz (RPG) schützt Kulturland und Landschaft. Klassische Solarparks auf Ackerland, wie sie in Deutschland über einen Bebauungsplan entstehen, gibt es deshalb kaum. Der Schwerpunkt des Ausbaus liegt auf Dächern, Fassaden und Infrastruktur.",
        },
        {
          typ: "p",
          text: `Mit dem Stromgesetz („Mantelerlass“), das die Stimmberechtigten am 9. Juni 2024 mit ${fmt(MANTELERLASS_JA, 1)} % angenommen haben, und dem vorangegangenen Solarexpress hat sich der Spielraum erweitert. Heute gibt es drei realistische Wege zur Freifläche: **freistehende Anlagen in wenig empfindlichen oder vorbelasteten Gebieten, Agri-PV mit Nutzen für die Landwirtschaft und grosse Anlagen von nationalem Interesse** – dazu gehören die alpinen Anlagen des Solarexpress. Einen Überblick zu den Unterschieden in Deutschland und Österreich geben die Ratgeber [Solarpark-Genehmigung](/ratgeber/solarpark-genehmigung-bebauungsplan) und [Freiflächen-PV in Österreich](/ratgeber/freiflaechen-pv-oesterreich).`,
        },
      ],
    },
    {
      id: "raumplanung",
      titel: "Raumplanungsrecht: Wann eine Anlage ausserhalb der Bauzone standortgebunden ist",
      tocLabel: "Raumplanung (RPG/RPV)",
      bloecke: [
        {
          typ: "p",
          text: "**Das Bundesrecht unterscheidet vier Fälle: Anlagen auf Bauten, nicht freistehende Anlagen ausserhalb der Bauzone, freistehende Anlagen und Agri-PV.** Für Anlagen auf Dächern genügt nach Art. 18a RPG in der Regel ein Meldeverfahren. Alles, was frei auf einer Fläche steht, braucht dagegen eine Baubewilligung mit Ausnahmebewilligung für das Bauen ausserhalb der Bauzone – und eine umfassende Interessenabwägung.",
        },
        {
          typ: "tabelle",
          caption: "Raumplanerische Einordnung von Solaranlagen in der Schweiz, Stand September 2026",
          kopf: ["Anlagentyp", "Rechtsgrundlage", "Voraussetzung", "Verfahren"],
          zeilen: [
            ["Anlage auf Dach (genügend angepasst)", "Art. 18a Abs. 1 RPG, Art. 32a RPV", "angepasst an Dach, keine Kultur- oder Naturdenkmäler", "Meldeverfahren"],
            ["Nicht freistehend ausserhalb Bauzone (z. B. Parkplatz, Lärmschutzwand, Staumauer)", "Art. 32c RPV", "bildet optisch eine Einheit mit rechtmässigen, längerfristig bestehenden Bauten oder Anlagen; Netzanschluss", "Baubewilligung"],
            ["Freistehend, ausserhalb landwirtschaftlicher Nutzfläche", "Art. 24ter Abs. 1 RPG", "wenig empfindliches oder bereits mit Bauten belastetes Gebiet; Erschliessungs- und Netzanschlussaufwand angemessen", "Baubewilligung mit Interessenabwägung"],
            ["Agri-PV auf landwirtschaftlicher Nutzfläche", "Art. 24ter Abs. 2 RPG", "beeinträchtigt landwirtschaftliche Interessen nicht und bringt Vorteile für die Produktion – oder dient Versuchs- und Forschungszwecken", "Baubewilligung mit Interessenabwägung"],
            ["Grossanlage von nationalem Interesse", "EnG, kantonaler Richtplan", "Mindestproduktion nach Energieverordnung; Interesse an der Realisierung geht anderen nationalen Interessen grundsätzlich vor", "je nach Kanton, teils konzentriert"],
            ["Alpine Grossanlage (Solarexpress)", "Art. 71a EnG (befristet)", `mind. ${fmt(SOLAREXPRESS_MIN_GWH)} GWh/Jahr, mind. ${fmt(SOLAREXPRESS_WINTER_KWH_KW)} kWh/kW im Winterhalbjahr; öffentliche Auflage bis 31.12.2025`, "kantonale Bewilligung, Zustimmung der Standortgemeinde"],
          ],
          minBreite: 880,
          fussnote: "Vereinfachte Darstellung auf Basis von RPG, RPV und Merkblatt Solaranlagen des Kantons Luzern (gültig ab 01.01.2026). Die Kantone regeln Verfahren und Zuständigkeiten; in jedem Fall ist eine umfassende Interessenabwägung zu Landschaft, Natur und Kulturland nötig.",
        },
        {
          typ: "h3",
          text: "Was „wenig empfindlich“ in der Praxis heisst",
        },
        {
          typ: "p",
          text: "Als wenig empfindlich gelten nach den Erläuterungen des Bundes vor allem Flächen, die **an Bauzonen oder bestehende Infrastruktur angrenzen** und möglichst wenige Schutzinteressen berühren – etwa Areale neben Autobahnen, Bahnlinien, Kläranlagen, Kiesgruben oder Gewerbegebieten. Fruchtfolgeflächen, Moorlandschaften, Objekte des Bundesinventars der Landschaften (BLN) und Waldareal sind dagegen in der Regel tabu. Für Agri-PV auf Fruchtfolgeflächen verlangen die Erläuterungen einen nachweisbaren Mehrertrag oder Schutz der Kultur, zum Beispiel vor Hagel, Starkregen oder Sonnenbrand bei Beeren und Obst.",
        },
        {
          typ: "kasten",
          variant: "recht",
          titel: "Agri-PV: Nutzen muss belegt werden",
          text: "Die Schweiz geht bei [Agri-PV](/wissen/lexikon#agri-pv) strenger vor als Deutschland mit der DIN SPEC 91434: Es reicht nicht, dass Landwirtschaft unter den Modulen möglich bleibt. Die Anlage muss der landwirtschaftlichen Produktion einen **Vorteil** bringen oder der Forschung dienen. Bei einer Bewilligung bleibt die Fläche nach Art. 16 der Landwirtschaftlichen Begriffsverordnung (LBV) unter Bedingungen beitragsberechtigt – die Einzelheiten klären Sie am besten mit dem kantonalen Landwirtschaftsamt. Mehr zu Systemen und Kennzahlen im Ratgeber [Agri-PV nach DIN SPEC 91434](/ratgeber/agri-pv-din-spec-91434).",
        },
        {
          typ: "p",
          text: "Mit dem Stromgesetz müssen die Kantone in ihren Richtplänen zudem Gebiete bezeichnen, die sich für grosse Solar- und Windanlagen von nationalem Interesse eignen. Mehrere Kantone haben ihre Richtpläne 2025/26 entsprechend angepasst oder in die Vernehmlassung gegeben. Für Projektentwickler lohnt deshalb immer ein Blick in den **kantonalen Richtplan, Teil Energie**, bevor Flächen gesichert werden.",
        },
      ],
    },
    {
      id: "solarexpress",
      titel: "Solarexpress: Stand der alpinen Grossanlagen",
      tocLabel: "Solarexpress",
      bloecke: [
        {
          typ: "p",
          text: `**Der [Solarexpress](/wissen/lexikon#solarexpress) war eine befristete Sonderregel für grosse alpine Anlagen, die im Winter viel Strom liefern.** Art. 71a EnG, im Herbst 2022 als dringliche Massnahme beschlossen, erklärte solche Anlagen als standortgebunden, stellte ihr Interesse grundsätzlich über andere nationale Interessen und sicherte eine Einmalvergütung von bis zu ${fmt(HEIV_MAX_ANTEIL * 100)} % der anrechenbaren Investitionskosten zu. Voraussetzung sind mindestens ${fmt(SOLAREXPRESS_MIN_GWH)} GWh Jahresproduktion und mindestens ${fmt(SOLAREXPRESS_WINTER_KWH_KW)} kWh je kW im Winterhalbjahr (1. Oktober bis 31. März).`,
        },
        {
          typ: "p",
          text: "Ursprünglich mussten die Anlagen bis Ende 2025 zumindest 10 % ihrer erwarteten Produktion einspeisen. Das Parlament hat die Regel am 21. März 2025 gelockert: **Es genügt, wenn das Baugesuch bis 31. Dezember 2025 öffentlich aufgelegt wurde**; die vollständige Inbetriebnahme muss dann innerhalb von fünf Jahren ab Rechtskraft der letzten Baubewilligung erfolgen. Neue Projekte können den Solarexpress damit nicht mehr nutzen. Für neue Grossanlagen gelten die ordentlichen Regeln für Anlagen von nationalem Interesse und die Förderung über HEIV oder Marktprämie.",
        },
        {
          typ: "p",
          text: `Die Bilanz ist ernüchternd: Nach einer Auswertung vom Oktober 2025 waren von über 50 angekündigten Projekten nur wenige im Bau oder teilweise in Betrieb – etwa Madrisa Solar (Klosters), NalpSolar und Sedrun Solar (Tujetsch) sowie Sidenplangg (Uri) –, rund 43 % waren aufgegeben. Die verbleibenden Projekte erreichen zusammen nur einen Bruchteil der angestrebten ${fmt(SOLAREXPRESS_ZIEL_TWH)} TWh. Gründe sind hohe Baukosten im Gebirge (nach dieser Auswertung im Schnitt rund CHF 4.000 je kW), Netzanschlüsse, Einsprachen und teils fehlende Zustimmung der Gemeinden. Im Wallis lehnten die Stimmberechtigten 2023 zudem ein kantonales Dekret zur Beschleunigung der Verfahren ab.`,
        },
      ],
    },
    {
      id: "foerderung",
      titel: "Förderung: Einmalvergütung, Auktionen und Rückliefervergütung",
      tocLabel: "Förderinstrumente",
      bloecke: [
        {
          typ: "p",
          text: "**Die Schweiz fördert Photovoltaik überwiegend mit Investitionsbeiträgen statt mit laufenden Vergütungen.** Abgewickelt wird alles über die Vollzugsstelle Pronovo. Für Freiflächen- und Grossanlagen ohne Eigenverbrauch sind vor allem die Auktionen relevant; seit 2025 gibt es als Alternative zur Einmalvergütung auch eine gleitende Marktprämie.",
        },
        {
          typ: "tabelle",
          caption: "Förderinstrumente für Photovoltaik in der Schweiz, Stand September 2026",
          kopf: ["Instrument", "Für wen", "Höhe", "Vergabe"],
          zeilen: [
            ["Einmalvergütung (EIV, KLEIV/GREIV)", "Anlagen mit Eigenverbrauch", `bis ${fmt(EIV_MAX_ANTEIL * 100)} % der Investitionskosten von Referenzanlagen`, "auf Gesuch, Warteliste möglich"],
            ["Hohe Einmalvergütung (HEIV)", "Anlagen ohne Eigenverbrauch", `bis ${fmt(HEIV_MAX_ANTEIL * 100)} % der Referenzkosten`, `ab ${fmt(AUKTION_AB_KW)} kW per Auktion; Q4/2026: ${fmt(HEIV_VOLUMEN_MW)} MW, Höchstgebot CHF ${fmt(HEIV_HOECHSTGEBOT_CHF_KW)}/kW`],
            ["Gleitende Marktprämie (GMP)", `ab ${fmt(AUKTION_AB_KW)} kW ohne Eigenverbrauch`, "Differenz zum Referenzmarktpreis, 20 Jahre", `Auktion; Q4/2026: ${fmt(GMP_VOLUMEN_MW)} MW, Höchstgebot ${fmt(GMP_HOECHSTGEBOT_RP)} Rp./kWh`],
            ["Solarexpress-Vergütung", "alpine Grossanlagen nach Art. 71a EnG", `bis ${fmt(HEIV_MAX_ANTEIL * 100)} % der Investitionskosten`, "nur Projekte mit Auflage bis 31.12.2025"],
            ["Winter- und Neigungsbonus", "Winterbonus für neue Anlagen über 100 kW", `bei mehr als ${fmt(SOLAREXPRESS_WINTER_KWH_KW)} kWh/kW im Winterhalbjahr; ersetzt den Höhenbonus`, "Zuschlag zur Einmalvergütung"],
            ["Rückliefervergütung", "alle einspeisenden Anlagen", `quartalsweiser Referenzmarktpreis; Minimalvergütung ${fmt(MINIMAL_RP_BIS_30KW)} Rp./kWh bis 30 kW, sinkend auf ${fmt(MINIMAL_RP_149KW, 1)} Rp./kWh bei 149 kW`, "durch den Netzbetreiber, seit 01.01.2026"],
          ],
          minBreite: 860,
          fussnote: `Quellen: BFE, Pronovo (PV-Auktionen, Runde vom 18.10. bis 01.11.2026), Swissolar. Teilnahmegebühr Auktion CHF 300 je Gebot; Realisierungsfrist 24 Monate nach Zuschlag. Anlagen ab 150 kW erhalten keine Minimalvergütung.`,
        },
        {
          typ: "h3",
          text: "Rechenbeispiel: 2-MW-Anlage im Mittelland",
        },
        {
          typ: "p",
          text: `Eine freistehende Anlage mit ${fmt(BEISPIEL_KW / 1000)} MW auf einer vorbelasteten Fläche im Mittelland erzeugt bei rund ${fmt(CH.ertrag)} kWh/kW etwa **${fmt(BEISPIEL_ERTRAG_KWH / 1e6, 1)} GWh** pro Jahr – etwas weniger als in Österreich (${fmt(AT_ERTRAG)} kWh/kW). In der HEIV-Auktion könnte der Betreiber höchstens **CHF ${fmt(HEIV_OBERGRENZE_CHF)}** Einmalvergütung erhalten (Höchstgebot × Leistung); in der Praxis setzt sich durch, wer weniger Förderung je kW verlangt. Alternativ sichert die gleitende Marktprämie beim Höchstgebot einen Erlös von bis zu rund **CHF ${fmt(GMP_MAX_ERLOES_CHF)}** pro Jahr, wobei ein Teil davon aus dem Strommarkt kommt. Welches Modell besser passt, hängt von Finanzierungsstruktur und Preiserwartung ab – die Mechanik erklärt unser Ratgeber [Solarpark als Investment](/ratgeber/solarpark-investment-rendite).`,
        },
        {
          typ: "tool",
          href: "/rechner/solarpark",
          titel: "Solarpark durchrechnen",
          text: "Leistung, Region, Baukosten und Erlösmodell eingeben – mit IRR, Kapitalwert und Cashflow über die Laufzeit. Für die Schweiz Region „Mittelland“ wählen.",
          label: "Zum Solarpark-Rechner",
        },
      ],
    },
    {
      id: "gemeinschaften",
      titel: "ZEV, vZEV und LEG: Strom lokal vermarkten",
      tocLabel: "ZEV, vZEV, LEG",
      bloecke: [
        {
          typ: "p",
          text: `**Für Anlagen in Siedlungsnähe ist der lokale Verkauf oft attraktiver als die Einspeisung.** Im Zusammenschluss zum Eigenverbrauch ([ZEV](/wissen/lexikon#zev)) teilen sich Verbraucher auf einem Areal den Solarstrom hinter einem gemeinsamen Messpunkt; beim virtuellen ZEV (vZEV) geht das seit 2025 auch über die Anschlussleitungen bis zum Verknüpfungspunkt. Seit dem 1. Januar 2026 können sich zudem Produzenten und Verbraucher in derselben Gemeinde, im selben Netzgebiet und auf derselben Netzebene zu einer **lokalen Elektrizitätsgemeinschaft ([LEG](/wissen/lexikon#leg))** zusammenschliessen und Strom über das öffentliche Netz teilen.`,
        },
        {
          typ: "p",
          text: `Für den intern gehandelten Strom sinkt das Netznutzungsentgelt um ${fmt(LEG_ABSCHLAG * 100)} %, bei Nutzung der Transformationsebene um ${fmt(LEG_ABSCHLAG_TRAFO * 100)} %. ${GEMEINSCHAFTEN.ch.text} Für grosse Freiflächenanlagen fernab von Verbrauchern bleibt die LEG meist eine Ergänzung; bei Anlagen am Siedlungsrand oder bei Gewerbe kann sie die Wirtschaftlichkeit deutlich verbessern. Die Modelle in Deutschland und Österreich vergleicht der Ratgeber [Energy Sharing und Energiegemeinschaften](/ratgeber/energy-sharing-energiegemeinschaften).`,
        },
      ],
    },
    {
      id: "kantone-flaeche",
      titel: "Kantone, Fläche und Verträge",
      tocLabel: "Kantone & Fläche",
      bloecke: [
        {
          typ: "p",
          text: "**Die Bewilligung erteilen Kanton und Gemeinde – deshalb unterscheidet sich die Praxis spürbar.** Bergkantone wie Graubünden, Wallis, Bern oder Uri hatten mit dem Solarexpress die meisten Grossprojekte; im Mittelland stehen Agri-PV-Versuche, Anlagen auf Deponien, Kiesgruben, Parkplätzen und entlang von Verkehrswegen im Vordergrund. Einige Kantone haben eigene Merkblätter oder Richtplan-Kapitel zu Solaranlagen ausserhalb der Bauzone veröffentlicht.",
        },
        {
          typ: "p",
          text: "Für die Flächensicherung wird meist eine **Dienstbarkeit** (Baurecht oder Nutzungsdienstbarkeit) im Grundbuch eingetragen. Landwirtschaftliche Grundstücke unterliegen dem bäuerlichen Bodenrecht (BGBB) und dem landwirtschaftlichen Pachtrecht (LPG); ob und wie ein Entgelt für eine Solarnutzung frei vereinbart werden kann, sollten Sie rechtlich prüfen lassen. Veröffentlichte Vergleichswerte für Solarpacht sind in der Schweiz selten, weil es nur wenige Freiflächenanlagen gibt. Orientierung zur Vertragsgestaltung geben die Ratgeber [Pachtvertrag Solarpark](/ratgeber/pachtvertrag-solarpark) und die Seite [Fläche verpachten](/flaeche-verpachten).",
        },
      ],
    },
    {
      id: "fehler",
      titel: "Typische Fehler bei Solarprojekten in der Schweiz",
      tocLabel: "Fehler & Grenzen",
      bloecke: [
        {
          typ: "checkliste",
          punkte: [
            "**Deutsche Massstäbe übertragen:** Eine Ackerfläche ist in der Schweiz ohne besonderen Standortgrund praktisch nicht bewilligungsfähig.",
            "**Agri-PV ohne Nutzennachweis:** Fehlt ein agronomisches Konzept mit belegtem Vorteil, scheitert das Gesuch an Art. 24ter Abs. 2 RPG.",
            "**Solarexpress-Fristen verkannt:** Neue Projekte können die Sonderregel nicht mehr nutzen.",
            "**Auktion ohne Baureife:** Zum Gebot muss das Projekt netzreif sein, danach bleiben 24 Monate für die Realisierung.",
            "**Netzanschluss unterschätzt:** Gerade im Gebirge treiben Leitungen und Erschliessung die Kosten stark.",
            "**Gemeinde zu spät eingebunden:** Ohne Rückhalt vor Ort drohen Einsprachen und lange Verfahren.",
          ],
        },
      ],
    },
    {
      id: "vorgehen",
      titel: "So gehen Sie bei einer Freiflächenanlage in der Schweiz vor",
      tocLabel: "Vorgehen",
      bloecke: [
        {
          typ: "ablauf",
          schritte: [
            ["Standort einordnen", "Bauzone oder nicht? Vorbelastet, wenig empfindlich, Fruchtfolgefläche oder Schutzgebiet? Kantonalen Richtplan (Teil Energie) prüfen."],
            ["Nutzungskonzept festlegen", "Freistehende Anlage, Agri-PV mit agronomischem Konzept oder nicht freistehende Anlage auf Infrastruktur."],
            ["Netz und Vermarktung klären", "Anschlussgesuch beim Verteilnetzbetreiber; Eigenverbrauch, LEG, HEIV oder gleitende Marktprämie abwägen."],
            ["Vorabklärung mit Kanton und Gemeinde", "Frühe Besprechung mit Raumplanungsamt und Gemeinderat, Umwelt- und Landschaftsaspekte klären."],
            ["Baugesuch und Förderung", "Baugesuch mit Interessenabwägung einreichen; nach Bewilligung an der Auktion teilnehmen oder Einmalvergütung beantragen."],
          ],
        },
      ],
    },
  ],

  faq: [
    {
      q: "Darf man in der Schweiz einen Solarpark auf einer Wiese bauen?",
      a: "Nur ausnahmsweise. Ausserhalb der Bauzone ist eine freistehende Solaranlage nach Art. 24ter RPG bewilligungsfähig, wenn sie in einem wenig empfindlichen oder bereits belasteten Gebiet liegt und die Erschliessung angemessen ist. Auf landwirtschaftlicher Nutzfläche braucht es zusätzlich einen Vorteil für die Landwirtschaft (Agri-PV) oder einen Forschungszweck.",
    },
    {
      q: "Was ist der Solarexpress und gilt er noch?",
      a: `Der Solarexpress (Art. 71a EnG) erleichterte die Bewilligung alpiner Grossanlagen ab ${fmt(SOLAREXPRESS_MIN_GWH)} GWh Jahresproduktion und förderte sie mit bis zu ${fmt(HEIV_MAX_ANTEIL * 100)} % der Investitionskosten. Begünstigt sind nur Projekte, deren Baugesuch bis 31. Dezember 2025 öffentlich aufgelegt wurde. Für neue Projekte gilt er nicht mehr.`,
    },
    {
      q: "Wie funktionieren die PV-Auktionen in der Schweiz?",
      a: `Anlagen ab ${fmt(AUKTION_AB_KW)} kW ohne Eigenverbrauch bewerben sich bei Pronovo um die hohe Einmalvergütung oder die gleitende Marktprämie. Den Zuschlag erhalten die Gebote mit dem geringsten Förderbedarf, bis das Volumen erschöpft ist. In der Runde Q4/2026 liegt das Höchstgebot bei CHF ${fmt(HEIV_HOECHSTGEBOT_CHF_KW)}/kW (HEIV) bzw. ${fmt(GMP_HOECHSTGEBOT_RP)} Rp./kWh (Marktprämie).`,
    },
    {
      q: "Was bekommt man 2026 für eingespeisten Solarstrom?",
      a: `Seit 1. Januar 2026 richtet sich die Rückliefervergütung nach dem quartalsweise gemittelten Marktpreis. Für Anlagen unter 150 kW gilt eine Minimalvergütung: ${fmt(MINIMAL_RP_BIS_30KW)} Rp./kWh bis 30 kW, abnehmend auf ${fmt(MINIMAL_RP_149KW, 1)} Rp./kWh bei 149 kW. Grössere Anlagen tragen das Marktpreisrisiko oder sichern sich über die Marktprämie ab.`,
    },
    {
      q: "Was ist der Unterschied zwischen ZEV, vZEV und LEG?",
      a: `Im ZEV teilen Verbraucher auf einem Areal den Solarstrom hinter einem gemeinsamen Messpunkt, beim vZEV auch über die Anschlussleitungen. Die LEG geht seit 2026 weiter: Teilnehmer in derselben Gemeinde und Netzebene teilen Strom über das öffentliche Netz und zahlen dafür ein um ${fmt(LEG_ABSCHLAG * 100)} % reduziertes Netznutzungsentgelt.`,
    },
    {
      q: "Ist Agri-PV in der Schweiz erlaubt?",
      a: "Ja, wenn die Anlage die landwirtschaftlichen Interessen nicht beeinträchtigt und der Produktion Vorteile bringt – etwa Hagel- oder Sonnenschutz für Beeren und Obst – oder Versuchs- und Forschungszwecken dient. Die Anforderungen sind strenger als in Deutschland. Mehr zu Kosten und Erträgen im Ratgeber [Agri-PV Wirtschaftlichkeit](/ratgeber/agri-pv-wirtschaftlichkeit).",
    },
  ],

  passend: [
    { href: "/ratgeber/freiflaechen-pv-oesterreich", titel: "Freiflächen-PV in Österreich", text: "Widmung je Bundesland und EAG-Förderung." },
    { href: "/ratgeber/solarpark-genehmigung-bebauungsplan", titel: "Solarpark-Genehmigung in Deutschland", text: "Bebauungsplan, Privilegierung und Ablauf." },
    { href: "/ratgeber/energy-sharing-energiegemeinschaften", titel: "Energy Sharing & Energiegemeinschaften", text: "LEG, EEG und Energy Sharing im DACH-Vergleich." },
    { href: "/agri-pv", titel: "Agri-PV", text: "Doppelnutzung von Fläche für Landwirtschaft und Strom." },
  ],

  quellen: [
    { titel: "Kanton Luzern – Merkblatt Solaranlagen (Art. 24ter RPG, Art. 32c RPV), gültig ab 01.01.2026", url: "https://rawi.lu.ch/-/media/RAWI/Dokumente/Downloads/baubewilligungen/Merkblatt_Solaranlagen.pdf", stand: "09/2026" },
    { titel: "Bundesamt für Energie BFE – Förderung Photovoltaikanlagen", url: "https://www.bfe.admin.ch/de/eiv", stand: "09/2026" },
    { titel: "Pronovo – PV-Auktionen Photovoltaik Schweiz 2026", url: "https://pronovo.ch/de/foerderung/photovoltaik/auktionen/", stand: "09/2026" },
    { titel: "Swissolar – 2026: Was gilt neu für Photovoltaikanlagen?", url: "https://www.swissolar.ch/de/news/detail/2026-was-gilt-neu-fuer-photovoltaikanlagen-80786", stand: "09/2026" },
    { titel: "Swissvotes – Stromgesetz (Mantelerlass Energie), Abstimmung vom 9. Juni 2024", url: "https://swissvotes.ch/vote/670.00", stand: "09/2026" },
    { titel: "Kanton Graubünden – Leitfaden Bewilligungsverfahren für Photovoltaik-Grossanlagen (Solarexpress)", url: "https://www.gr.ch/DE/institutionen/verwaltung/dvs/are/BAB/Leitfaden%20Solarexpress_de.pdf", stand: "09/2026" },
    { titel: "Stromzeit – Aktueller Stand Solarexpress alpine Solaranlagen", url: "https://www.stromzeit.ch/blog/strom-7/solarexpress-aktueller-stand-beim-ausbau-der-alpinen-solaranlagen-schweiz-forderziele-deutlich-verfehlt-679", stand: "09/2026" },
  ],

  seitenCta: { titel: "Projekt in der Schweiz?", text: "Ertrag, Förderung und Rendite überschlägig rechnen.", href: "/rechner/solarpark", label: "Zum Solarpark-Rechner" },
  cta: {
    title: "Standort in der Schweiz – lohnt sich eine genauere Prüfung?",
    text: "Wir ordnen Ihre Fläche raumplanerisch ein, vergleichen HEIV, Marktprämie und lokale Vermarktung und sagen offen, wenn ein Projekt keine Chance hat.",
    primary: { label: "Kontakt aufnehmen", href: "/kontakt" },
    secondary: { label: "Solarpark rechnen", href: "/rechner/solarpark" },
  },
};

export default artikel;
