// Ratgeber: Freiflächen-PV in Österreich – Widmung je Bundesland, Genehmigungen, EAG-Förderung, Netz, Pacht
// Recherchestand 29.09.2026: EAG § 33 (RIS), Leitfaden PV Land OÖ (Stand Juni 2026), FAQ PV Land NÖ
// (Mai 2025), energie-noe.at, Land Steiermark (SAPRO Solarenergie, 1. Novelle 13.02.2026),
// Land Burgenland (Eignungszonen), Land Kärnten (K-PhV 2024), Parlament (EABG 11.06.2026),
// WKO (EAG-Investitionszuschuss 2026), Solarserver/CMS (ElWG).

import { PACHT, FREIFLAECHE, regionById } from "@/lib/invest/markt";
import { fmt, fmtEur, fmtCt } from "@/lib/rechner/annahmen";

/* Werte, die (noch) nicht in markt.js stehen – Vorschlag für markt.js siehe Bericht */
// EAG-Marktprämie PV 2026: Höchstpreis je Gebotstermin (Leitfaden PV Land OÖ, Stand Juni 2026 / EAG-MPV)
const EAG_HOECHSTPREIS_CT = 7.77;
// Ausschreibungsvolumen je Gebotstermin 2026 in kWp (ebd.)
const EAG_VOLUMEN_KWP = 175000;
// § 33 EAG: Abschlag für PV auf landwirtschaftlich genutzter Fläche oder im Grünland
const EAG_ABSCHLAG = 0.25;
// EAG-Investitionszuschuss 2026, Kategorie D (> 100 bis 1.000 kWp), Höchstfördersatz €/kWp (WKO, Leitfaden OÖ)
const INVZ_KAT_D_EUR = 120;
// Zuschlag für innovative Anlagen inkl. bestimmter Agri-PV (Leitfaden OÖ, § 6 EAG-IZV)
const INVZ_ZUSCHLAG_INNOVATIV = 0.3;
// ElWG: Netzentgelt für Einspeisung ab 2027 bei > 20 kW netzwirksamer Leistung, ct/kWh (Solarserver 12.12.2025)
const ELWG_EINSPEISEENTGELT_CT = 0.05;

const AT = regionById("at");
const BEISPIEL_MWP = 5;
const ERTRAG_KWH = BEISPIEL_MWP * 1000 * AT.ertrag; // Jahr 1
const GEBOT_CT = 7.0; // angenommenes Gebot im Beispiel
const NACH_ABSCHLAG_CT = GEBOT_CT * (1 - EAG_ABSCHLAG);
const DIFF_EUR = (ERTRAG_KWH * (GEBOT_CT - NACH_ABSCHLAG_CT)) / 100;
const FLAECHE_HA = BEISPIEL_MWP * FREIFLAECHE.haProMwp;
const PACHT_MITTEL = FLAECHE_HA * PACHT.freiflaecheProHa.mittel;

const artikel = {
  slug: "freiflaechen-pv-oesterreich",
  title: "Freiflächen-PV in Österreich: Widmung, Genehmigung und Förderung",
  seoTitle: "Freiflächen-PV Österreich: Widmung & EAG | ÖkoInvest",
  kurzTitel: "Freiflächen-PV Österreich",
  description:
    "Freiflächen-PV in Österreich: Widmung je Bundesland, Elektrizitäts- und Naturschutzrecht, UVP, EAG-Marktprämie mit 25-%-Abschlag, EABG und Pacht – Stand 2026.",
  excerpt:
    "Wer in Österreich einen Solarpark bauen will, braucht vor allem eine passende Flächenwidmung – und die regelt jedes Bundesland anders. Dazu kommen Elektrizitätsrecht, Naturschutz und die Frage, ob sich die EAG-Marktprämie mit Grünland-Abschlag noch rechnet.",
  hauptKeyword: "freiflächen pv österreich",
  keywords: [
    "Freiflächen-PV Österreich",
    "Grünland-Photovoltaik Widmung",
    "PV-Freiflächenanlage Genehmigung Österreich",
    "EAG Marktprämie Freifläche Abschlag",
    "Solarpark Österreich Bundesländer",
    "Photovoltaik Zonierung Niederösterreich",
    "EABG Photovoltaik",
  ],
  veroeffentlicht: "2026-09-29",
  aktualisiert: "2026-09-29",
  kategorie: "Recht & Genehmigung",
  bild: "/img/solarpark-himmel.jpg",
  bildAlt: "Reihen aufgeständerter Solarmodule einer Freiflächenanlage unter blauem Himmel mit Schleierwolken",
  badge: { wert: `−${fmt(EAG_ABSCHLAG * 100)} %`, text: "EAG-Abschlag für PV auf Grünland und Agrarflächen" },

  kurzFazit: [
    "**Der Engpass ist die Flächenwidmung.** Freiflächenanlagen im Grünland brauchen in allen Bundesländern ab einer geringen Größe eine eigene Widmung – in Niederösterreich ab mehr als 50 kW, in Oberösterreich ab mehr als 50 m² Modulfläche.",
    "Größere Parks sind fast überall nur in **überörtlich festgelegten Zonen** möglich: Niederösterreich hat 116 PV-Zonen, die Steiermark 36 Vorrangzonen für Anlagen über 10 ha, das Burgenland Eignungszonen.",
    `Ab **1.000 kW** ist in der Regel eine elektrizitätsrechtliche Bewilligung des Landes nötig; eine eigene UVP-Schwelle für Photovoltaik kennt das UVP-G nach aktuellem Stand nicht.`,
    `Die **EAG-Marktprämie** wird per Ausschreibung vergeben (2026: vier Termine zu je ${fmt(EAG_VOLUMEN_KWP)} kWp, Höchstpreis ${fmtCt(EAG_HOECHSTPREIS_CT, 2)}). Auf Grünland und Agrarflächen sinkt der Zuschlagswert um **${fmt(EAG_ABSCHLAG * 100)} %** – Agri-PV kann davon ausgenommen sein.`,
    "Das im Juni 2026 im Nationalrat beschlossene **Erneuerbaren-Ausbau-Beschleunigungsgesetz (EABG)** bringt einen One-Stop-Shop und Beschleunigungsgebiete; die Umsetzung in den Ländern läuft.",
  ],

  abschnitte: [
    {
      id: "antwort",
      titel: "Was braucht ein Solarpark in Österreich?",
      tocLabel: "Kurze Antwort",
      bloecke: [
        {
          typ: "p",
          text: "**Ein Solarpark in Österreich braucht vor allem eine Widmung der Gemeinde im Flächenwidmungsplan, bei größeren Anlagen eine elektrizitätsrechtliche Bewilligung des Landes, meist eine naturschutzrechtliche Bewilligung und einen Netzzugang beim Verteilernetzbetreiber.** Anders als in Deutschland gibt es keinen bundesweiten Bebauungsplan-Mechanismus: Raumordnung, Naturschutz und Elektrizitätsrecht für Erzeugungsanlagen sind Landessache. Deshalb unterscheiden sich die Regeln zwischen Niederösterreich, der Steiermark oder Salzburg teils erheblich.",
        },
        {
          typ: "p",
          text: "Die Bundesebene regelt vor allem die Förderung über das Erneuerbaren-Ausbau-Gesetz ([EAG](/wissen/lexikon#eag)), das neue Elektrizitätswirtschaftsgesetz (ElWG) mit Netzzugang und Netzentgelten sowie das UVP-G. Mit dem Erneuerbaren-Ausbau-Beschleunigungsgesetz kommt ein weiterer Rahmen dazu, der die Länder zu Beschleunigungsgebieten verpflichtet. Wie ein Projekt vom ersten Flächengespräch bis zur Baureife läuft, zeigt unser [Prozess](/prozess) – der Unterschied zu Deutschland liegt vor allem in den ersten beiden Schritten.",
        },
        {
          typ: "kasten",
          variant: "recht",
          titel: "Grundsatz: Länderkompetenz",
          text: "Flächenwidmung (Raumordnungsgesetze), Naturschutz und die Bewilligung von Erzeugungsanlagen (Landes-Elektrizitätsgesetze) liegen in Österreich bei den Ländern. Die folgenden Angaben geben den Stand September 2026 wieder und ersetzen keine Prüfung im Einzelfall – Schwellen und Zonenpläne wurden in den letzten Jahren mehrfach geändert und werden mit dem EABG erneut angepasst.",
        },
      ],
    },
    {
      id: "widmung",
      titel: "Flächenwidmung: Grünland-Photovoltaik je Bundesland",
      tocLabel: "Widmung je Bundesland",
      bloecke: [
        {
          typ: "p",
          text: "**Im Grünland ist eine Freiflächenanlage ohne eigene Widmung nur in sehr kleinem Maßstab zulässig.** Die Gemeinden weisen dafür eine Sonderwidmung aus, etwa „Grünland-Photovoltaikanlagen“ (Gpv) in Niederösterreich, eine Grünland-Sonderausweisung in Oberösterreich oder eine Sondernutzung im Freiland in der Steiermark. Den Begriff erklärt unser Lexikon unter [Grünland-Photovoltaik](/wissen/lexikon#gruenland-photovoltaik). Für größere Parks legen die Länder zusätzlich überörtliche Zonen fest – außerhalb davon sind nur begrenzte Flächengrößen widmungsfähig.",
        },
        {
          typ: "tabelle",
          caption: "Widmung von PV-Freiflächenanlagen nach Bundesland, Stand September 2026",
          kopf: ["Bundesland", "Widmung nötig ab", "Größengrenzen und Zonen", "Besonderheiten"],
          zeilen: [
            ["Niederösterreich", "mehr als **50 kW** Engpassleistung im Grünland (Widmung Gpv, § 20 Abs. 2 Z 21 NÖ ROG 2014)", "außerhalb von Zonen max. **2 ha** je Widmung (Mindestabstand 200 m); in den **116 Zonen** des Sektoralen Raumordnungsprogramms PV bis 10 ha (5 + 5 ha, zweite Hälfte mit Ökologiekonzept)", "vorbelastete Flächen (z. B. Schottergruben, Deponien) über 2 ha möglich; Anschlusskonzept bei Widmungen ab 3.000 m²"],
            ["Oberösterreich", "mehr als **50 m²** Modulfläche im Grünland (Sonderausweisung, § 30a Oö. ROG 1994)", "Prüfung nach Kriterienkatalog der Oö. PV-Strategie 2030; Ausschluss- und Beschleunigungsgebiete für 2026 in Vorbereitung", "Ausnahme für landwirtschaftlichen Eigenbedarf; in Beschleunigungsgebieten entfällt das Widmungserfordernis"],
            ["Steiermark", "Sondernutzung im Freiland durch die Gemeinde", "örtlich in der Regel bis **2 ha**, max. **10 ha**; darüber nur in den **36 Vorrangzonen** (rund 778 ha) des Sachprogramms Solarenergie", "Ausschlusszonen für hochwertige Agrarböden und Landschaftsräume; 1. Novelle seit 13.02.2026"],
            ["Burgenland", "Widmung „Grünfläche-Photovoltaik“ oberhalb kleiner Bagatellgrenzen", "Widmung nur **innerhalb verordneter Eignungszonen**; Zonen-Mindestgröße grundsätzlich 10 ha", "Agri-PV oder extensive Grünlandnutzung in Zonen mit hoher Bodengüte verpflichtend; jährliche Landesabgabe je ha"],
            ["Salzburg", "mehr als **200 m²** Kollektorfläche im Grünland (§ 36 Abs. 7 i. V. m. § 39b ROG)", "Widmung nach landesweitem Kriterienkatalog (seit November 2023); fruchtbare Böden grundsätzlich ausgeschlossen", "auf vorbelasteten Flächen (Parkplätze, Deponien, entlang hochrangiger Straßen, Bahnlinien, Freileitungen) seit 12/2022 keine eigene Widmung"],
            ["Kärnten", "Widmung für Freiflächenanlagen über rund 100 m²", "zusammenhängende Grünland-PV in der Regel max. **4 ha** (Kärntner Photovoltaikanlagen-Verordnung 2024)", "Vorrang für vorbelastete Flächen; Agri-PV mit echter Doppelnutzung zulässig; wertvolle Agrarböden ausgeschlossen"],
            ["Tirol, Vorarlberg, Wien", "Sonderflächenwidmung", "Einzelfallprüfung, kaum größere Freiflächen verfügbar", "Schwerpunkt auf Dach-, Infrastruktur- und Parkplatzanlagen"],
          ],
          minBreite: 900,
          fussnote: "Vereinfachte Übersicht auf Basis der Leitfäden und FAQ der Länder (NÖ Mai 2025, OÖ Juni 2026, Stmk. 2026, Bgld., Sbg., Ktn. 2024). Schwellen beziehen sich teils auf Leistung, teils auf Modul- oder Kollektorfläche. Maßgeblich sind das jeweilige Raumordnungsgesetz und die Verordnungen in der geltenden Fassung.",
        },
        {
          typ: "h3",
          text: "Was die Zonierung für Ihre Fläche bedeutet",
        },
        {
          typ: "p",
          text: "Für Flächeneigentümer ist die entscheidende Frage deshalb nicht nur „Ist die Fläche eben und sonnig?“, sondern: **Liegt sie in einer Zone, grenzt sie an eine Zone oder ist sie vorbelastet?** In Niederösterreich darf eine Fläche von höchstens 2 ha auch direkt an eine Zone angrenzend gewidmet werden. In der Steiermark dürfen Gemeinden außerhalb der Vorrangzonen nur kleinere Anlagen ausweisen. Im Burgenland ist außerhalb der Eignungszonen praktisch nichts möglich. Einen ersten Eindruck, ob Ihre Fläche grundsätzlich infrage kommt, gibt der [Flächencheck](/flaechencheck).",
        },
        {
          typ: "p",
          text: "Die Widmung ist kein Rechtsanspruch. Die Gemeinde entscheidet im Gemeinderat, das Land prüft als Aufsichtsbehörde. Gute Chancen haben Projekte, die Bodenschutz, Landschaftsbild, Netzanschluss und Akzeptanz früh zusammendenken – etwa mit Biodiversitätsflächen, Beweidung oder einer Beteiligung der Bevölkerung über eine [Energiegemeinschaft](/energiegemeinschaften).",
        },
      ],
    },
    {
      id: "genehmigungen",
      titel: "Elektrizitätsrecht, Naturschutz und UVP",
      tocLabel: "Weitere Genehmigungen",
      bloecke: [
        {
          typ: "p",
          text: "**Neben der Widmung braucht ein Solarpark ab 1.000 kW in den meisten Ländern eine elektrizitätsrechtliche Bewilligung und außerhalb des Ortsgebiets fast immer eine naturschutzrechtliche Bewilligung.** Baurechtlich sind Photovoltaikanlagen dagegen häufig bewilligungs- oder zumindest anzeigefrei, weil das Elektrizitätsrecht sie mitregelt.",
        },
        {
          typ: "tabelle",
          caption: "Weitere Verfahren für eine Freiflächenanlage, Beispiele Niederösterreich und Oberösterreich, Stand 2026",
          kopf: ["Verfahren", "Niederösterreich", "Oberösterreich", "Zuständig"],
          zeilen: [
            ["Elektrizitätsrecht", "Bewilligung nach NÖ ElWG 2005 ab 1.000 kWp", "Bewilligung nach § 6 Oö. ElWOG 2006 über 1.000 kW (nicht auf künstlichen Strukturen)", "Amt der Landesregierung"],
            ["Naturschutz", "Bewilligung nach NÖ NSchG 2000 bei jeder Größe außerhalb des Ortsgebiets", "Bewilligung über 500 m² Kollektorfläche im Grünland außerhalb geschlossener Ortschaften; darunter Anzeige", "Bezirksverwaltungsbehörde"],
            ["Baurecht", "anzeigepflichtiges Vorhaben (NÖ BO 2014)", "bewilligungs- und anzeigefrei, Widmung muss passen", "Gemeinde"],
            ["Weitere", "Wasserrecht, Forstrecht, Straßenrecht, ggf. Luftfahrt (Blendung)", "wie NÖ; 500-m-Seeuferschutz und Gewässerschutzbereiche beachten", "je nach Materie"],
          ],
          minBreite: 760,
          fussnote: "Quellen: energie-noe.at, Leitfaden 2026 Photovoltaik Land Oberösterreich. Die übrigen Länder haben vergleichbare, im Detail abweichende Schwellen.",
        },
        {
          typ: "h3",
          text: "Braucht ein Solarpark eine UVP?",
        },
        {
          typ: "p",
          text: "Nach aktuellem Stand **enthält das österreichische UVP-G 2000 keinen eigenen Tatbestand für Photovoltaik-Freiflächenanlagen**. Bei der UVP-Novelle 2023 wurde eine Aufnahme diskutiert, aber nicht umgesetzt; auch der im September 2026 in Begutachtung gegangene Novellenentwurf setzt nach den bisher bekannten Informationen andere Schwerpunkte. Eine [UVP](/wissen/lexikon#uvp) kann sich trotzdem ergeben, wenn ein Projekt andere Tatbestände berührt – etwa Rodungen, Vorhaben in Schutzgebieten oder eine zugehörige Hochspannungsleitung. In Natura-2000-Gebieten ist regelmäßig eine Naturverträglichkeitsprüfung nötig. Zum Vergleich: In Deutschland sind Anlagen ab 10 ha Grundfläche in der Regel UVP-vorprüfungspflichtig.",
        },
        {
          typ: "h3",
          text: "EABG: Was das Beschleunigungsgesetz ändert",
        },
        {
          typ: "p",
          text: "Der Nationalrat hat das **Erneuerbaren-Ausbau-Beschleunigungsgesetz (EABG)** am 11. Juni 2026 mit Verfassungsmehrheit beschlossen. Es setzt die EU-Richtlinie RED III um und sieht einen **One-Stop-Shop** für Genehmigungsverfahren, digitale Verfahrensführung, verbindliche Erzeugungsbeiträge je Bundesland für PV, Wind und Wasserkraft sowie die Pflicht der Länder vor, ausreichend Flächen für Erzeugungs- und Leitungsinfrastruktur auszuweisen. Die Ausbauziele wurden auf 30 TWh bis 2030 und mindestens 40 TWh bis 2035 angehoben. Oberösterreich hat bereits geregelt, dass PV-Anlagen in verordneten Beschleunigungsgebieten keine eigene Widmung brauchen. Wie schnell die Beschleunigungsgebiete in allen Ländern tatsächlich ausgewiesen werden, ist nach aktuellem Stand offen.",
        },
      ],
    },
    {
      id: "foerderung",
      titel: "EAG-Förderung: Marktprämie, Abschlag und Investitionszuschuss",
      tocLabel: "EAG-Förderung",
      bloecke: [
        {
          typ: "p",
          text: `**Für Solarparks ist die EAG-Marktprämie das zentrale Förderinstrument.** Sie wird für Anlagen über 10 kWp per Ausschreibung vergeben, gleicht die Differenz zwischen dem bezuschlagten anzulegenden Wert und dem Referenzmarktwert aus und läuft in der Regel 20 Jahre. Für 2026 sind vier Gebotstermine festgelegt – 17. März, 11. Juni, 24. September und 10. Dezember – mit jeweils ${fmt(EAG_VOLUMEN_KWP)} kWp Volumen und einem Höchstpreis von ${fmtCt(EAG_HOECHSTPREIS_CT, 2)}. Das Prinzip ähnelt der deutschen [EEG-Ausschreibung](/ratgeber/eeg-ausschreibung-freiflaeche) mit gleitender [Marktprämie](/wissen/lexikon#marktpraemie).`,
        },
        {
          typ: "kasten",
          variant: "wichtig",
          titel: "Der 25-%-Abschlag nach § 33 EAG",
          text: `Für Photovoltaikanlagen auf einer landwirtschaftlich genutzten Fläche oder einer Fläche im Grünland verringert sich der Zuschlagswert um **${fmt(EAG_ABSCHLAG * 100)} %**. Der Abschlag entfällt ganz oder teilweise für Anlagen auf Gebäuden oder baulichen Anlagen, auf künstlichen Gewässern, Deponien und Altlasten, Bergbau- und Infrastrukturstandorten, militärischen Flächen (außer Übungsgelände) sowie für **Agri-PV-Anlagen**, bei denen die landwirtschaftliche Hauptnutzung nicht oder nur gering beeinträchtigt wird. Die Details regelt die EAG-Marktprämienverordnung.`,
        },
        {
          typ: "h3",
          text: "Rechenbeispiel: Was der Abschlag kostet",
        },
        {
          typ: "p",
          text: `Ein Park mit ${fmt(BEISPIEL_MWP)} MWp erzeugt in Österreich bei rund ${fmt(AT.ertrag)} kWh/kWp etwa **${fmt(ERTRAG_KWH / 1e6, 1)} GWh** im ersten Jahr. Bietet der Projektierer ${fmtCt(GEBOT_CT)}, bleibt auf einer normalen Grünlandfläche nach Abschlag ein anzulegender Wert von **${fmtCt(NACH_ABSCHLAG_CT, 2)}**. In Jahren, in denen der Marktwert unter diesem Wert liegt, fehlen dem Projekt dadurch bis zu **${fmtEur(DIFF_EUR)}** pro Jahr gegenüber einer Anlage ohne Abschlag. Das erklärt, warum in Österreich viele Freiflächenprojekte als Agri-PV, auf Deponien oder vorbelasteten Flächen geplant oder ganz über [Stromlieferverträge (PPA)](/ratgeber/ppa-fuer-unternehmen) finanziert werden.`,
        },
        {
          typ: "p",
          text: `Der **EAG-Investitionszuschuss** ist die Alternative für kleinere Anlagen bis 1.000 kWp. 2026 gibt es drei Fördercalls. In Kategorie D (über 100 bis 1.000 kWp) gilt ein umgekehrtes Bieterverfahren mit einem Höchstfördersatz von ${fmt(INVZ_KAT_D_EUR)} €/kWp. Auch hier wird auf Agrar- und Grünlandflächen um ${fmt(EAG_ABSCHLAG * 100)} % gekürzt, für innovative Anlagen einschließlich bestimmter Agri-PV-Anlagen gibt es einen Zuschlag von ${fmt(INVZ_ZUSCHLAG_INNOVATIV * 100)} %, dazu je 10 % „Made in Europe“-Bonus für Module, Wechselrichter und Speicher. Für Solarparks im Megawattbereich spielt der Zuschuss kaum eine Rolle.`,
        },
      ],
    },
    {
      id: "netz",
      titel: "Netzzugang und Netzentgelte nach dem neuen ElWG",
      tocLabel: "Netzzugang",
      bloecke: [
        {
          typ: "p",
          text: "**Ohne gesicherten Netzzugang ist jede Widmung wertlos.** Der Netzzugang wird beim Verteilernetzbetreiber beantragt; bei größeren Parks entscheidet die freie Kapazität im nächsten [Umspannwerk](/wissen/lexikon#umspannwerk) über Machbarkeit und Kosten. In Niederösterreich ist schon im Widmungsverfahren ab 3.000 m² ein Anschlusskonzept vorzulegen.",
        },
        {
          typ: "p",
          text: `Mit dem neuen Elektrizitätswirtschaftsgesetz (ElWG, BGBl. I Nr. 91/2025, im Dezember 2025 beschlossen) ändern sich die Entgelte schrittweise: Netzzutritts- und Netzbereitstellungsentgelt werden zu einem **Netzanschlussentgelt** zusammengefasst, das nach Leistung bemessen wird. Einspeiser mit mehr als 20 kW netzwirksamer Leistung sollen ab 2027 zudem ein Netzentgelt von **${fmt(ELWG_EINSPEISEENTGELT_CT, 2)} ct/kWh** zahlen; für neue PV-Anlagen ist eine Begrenzung der Einspeiseleistung vorgesehen. Die konkreten Beträge legt künftig die E-Control per Verordnung fest – kalkulieren Sie hier mit Puffer und lassen Sie sich die Kosten vom Netzbetreiber schriftlich bestätigen.`,
        },
      ],
    },
    {
      id: "pacht",
      titel: "Pacht für Solarparks in Österreich",
      tocLabel: "Pacht",
      bloecke: [
        {
          typ: "p",
          text: `**Die Pacht für Freiflächen-PV liegt im DACH-Raum aktuell meist zwischen ${fmtEur(PACHT.freiflaecheProHa.min)} und ${fmtEur(PACHT.freiflaecheProHa.max)} je Hektar und Jahr.** In Österreich drücken der Grünland-Abschlag und die kleineren zulässigen Flächen je Widmung eher auf die Obergrenze; auf Deponien, Schottergruben oder in Zonen mit guter Netzanbindung sind höhere Werte möglich. Für die ${fmt(FLAECHE_HA, 1)} ha unseres ${fmt(BEISPIEL_MWP)}-MWp-Beispiels ergäbe ein mittlerer Wert rund **${fmtEur(PACHT_MITTEL)}** pro Jahr. Details und Vertragsgestaltung erklären die Ratgeber [Solarpark-Pacht pro Hektar](/ratgeber/solarpark-pacht-pro-hektar) und [Pachtvertrag Solarpark](/ratgeber/pachtvertrag-solarpark).`,
        },
        {
          typ: "p",
          text: `Üblich sind Laufzeiten von ${fmt(PACHT.laufzeit)} Jahren mit Verlängerungsoptionen, eine Indexierung und eine Rückbauverpflichtung mit Sicherheit (Bankgarantie). In Österreich wird das Nutzungsrecht meist über einen Bestandvertrag und eine im Grundbuch eingetragene Dienstbarkeit gesichert. Steuerliche Fragen – etwa ob verpachtete Flächen weiter als land- und forstwirtschaftliches Vermögen gelten – sind in Österreich anders geregelt als in Deutschland und sollten mit einer Steuerberatung geklärt werden. Mit dem [Pachtrechner](/rechner/pacht) können Sie Fixpacht und Umsatzbeteiligung vergleichen.`,
        },
      ],
    },
    {
      id: "fehler",
      titel: "Typische Fehler und Grenzen",
      bloecke: [
        {
          typ: "checkliste",
          punkte: [
            "**Pachtvertrag vor Zonenprüfung:** Wer eine 20-ha-Fläche außerhalb jeder Zone langfristig bindet, hat oft nur 2 ha widmungsfähig.",
            "**Netzanfrage zu spät:** Die Widmung ist beschlossen, das Umspannwerk aber voll – ein häufiger Grund für gescheiterte Projekte.",
            "**Abschlag ignoriert:** Businesspläne mit Marktprämie ohne 25-%-Abschlag auf Grünland rechnen das Projekt schön.",
            "**Agri-PV nur auf dem Papier:** Der Abschlag entfällt nur, wenn die landwirtschaftliche Nutzung tatsächlich weiterläuft und die Kriterien der Verordnung erfüllt sind.",
            "**Landesabgaben übersehen:** Das Burgenland erhebt eine jährliche Abgabe je Hektar Freifläche; sie gehört in jede Kalkulation.",
            "**Gemeinde nicht eingebunden:** Ohne Gemeinderatsbeschluss keine Widmung – frühe Information und Beteiligungsangebote zahlen sich aus.",
          ],
        },
      ],
    },
    {
      id: "vorgehen",
      titel: "So gehen Sie bei einem Solarpark in Österreich vor",
      tocLabel: "Vorgehen",
      bloecke: [
        {
          typ: "ablauf",
          schritte: [
            ["Fläche prüfen", "Zonenpläne des Landes, Bodengüte, Schutzgebiete, Hochwasserzonen und Abstand zum Umspannwerk klären – ein erster Schritt ist der [Flächencheck](/flaechencheck)."],
            ["Netz anfragen", "Netzzugangsanfrage beim Verteilernetzbetreiber stellen; Anschlusskonzept und Kosten schriftlich einholen."],
            ["Gemeinde gewinnen", "Projekt im Gemeinderat vorstellen, Widmungsverfahren anstoßen, Beteiligung (Energiegemeinschaft, Bürgerbeteiligung) anbieten."],
            ["Genehmigungen einholen", "Naturschutz- und ggf. elektrizitätsrechtliche Bewilligung, Wasser- und Forstrecht, Blendgutachten."],
            ["Vermarktung festlegen", "EAG-Ausschreibung (mit oder ohne Abschlag), PPA oder Kombination; Gebot fristgerecht abgeben."],
            ["Bauen und in Betrieb nehmen", "Inbetriebnahmefrist bei Marktprämie: 12 Monate ab Zuschlag für Anlagen über 100 kWp (einmal um bis zu 12 Monate verlängerbar)."],
          ],
        },
        {
          typ: "tool",
          href: "/flaechencheck",
          titel: "Eignet sich Ihre Fläche für einen Solarpark?",
          text: "Lage, Größe und Netzsituation eingeben – mit Einschätzung zu Pacht und nächsten Schritten, auch für Flächen in Österreich.",
          label: "Zum Flächencheck",
        },
      ],
    },
  ],

  faq: [
    {
      q: "Ab welcher Größe braucht eine PV-Freiflächenanlage in Österreich eine Widmung?",
      a: "Das regelt jedes Bundesland selbst. In Niederösterreich brauchen Anlagen im Grünland ab mehr als 50 kW die Widmung Grünland-Photovoltaikanlagen, in Oberösterreich ab mehr als 50 m² Modulfläche eine Grünland-Sonderausweisung, in Salzburg ab mehr als 200 m² Kollektorfläche. Auf vorbelasteten Flächen gibt es teils Erleichterungen.",
    },
    {
      q: "Wie groß darf ein Solarpark in Niederösterreich sein?",
      a: "Außerhalb der 116 Zonen des Sektoralen Raumordnungsprogramms PV ist eine Widmung auf 2 ha begrenzt; mehrere Flächen brauchen 200 m Abstand. Innerhalb einer Zone sind bis zu 10 ha möglich (5 + 5 ha, die zweite Hälfte mit Ökologiekonzept). Vorbelastete Flächen wie ausgekieste Schottergruben dürfen größer sein.",
    },
    {
      q: "Gibt es in Österreich eine UVP-Pflicht für Solarparks?",
      a: "Nach aktuellem Stand enthält das UVP-G keinen eigenen Tatbestand für Photovoltaik-Freiflächenanlagen. Eine Umweltverträglichkeitsprüfung kann sich aber aus anderen Tatbeständen ergeben, etwa bei Rodungen oder in Schutzgebieten. Naturschutzrechtliche Bewilligungen sind dagegen fast immer nötig.",
    },
    {
      q: "Wie hoch ist die EAG-Marktprämie für Freiflächenanlagen?",
      a: `Die Höhe ergibt sich aus der Ausschreibung: Bieter nennen einen anzulegenden Wert, 2026 gilt ein Höchstpreis von ${fmtCt(EAG_HOECHSTPREIS_CT, 2)}. Auf landwirtschaftlich genutzten Flächen und im Grünland wird der Zuschlagswert um ${fmt(EAG_ABSCHLAG * 100)} % gekürzt, außer bei qualifizierten Agri-PV-Anlagen oder vorbelasteten Flächen. Gezahlt wird die Differenz zum Referenzmarktwert, in der Regel 20 Jahre lang.`,
    },
    {
      q: "Lohnt sich Agri-PV in Österreich mehr als eine normale Freiflächenanlage?",
      a: "Förderrechtlich oft ja, weil der 25-%-Abschlag bei der Marktprämie entfallen kann und der Investitionszuschuss einen Zuschlag vorsieht. Dem stehen höhere Baukosten gegenüber. Eine erste Einschätzung liefert der [Agri-PV-Rechner](/rechner/agri-pv), Details der Ratgeber [Agri-PV Wirtschaftlichkeit](/ratgeber/agri-pv-wirtschaftlichkeit).",
    },
    {
      q: "Was ist das EABG?",
      a: "Das Erneuerbaren-Ausbau-Beschleunigungsgesetz wurde am 11. Juni 2026 im Nationalrat beschlossen. Es soll Genehmigungsverfahren über einen One-Stop-Shop beschleunigen, verpflichtet die Länder zur Ausweisung von Flächen und Beschleunigungsgebieten und legt Erzeugungsbeiträge je Bundesland fest. Die Umsetzung in den Ländern läuft.",
    },
    {
      q: "Wie viel Pacht bekomme ich in Österreich für einen Solarpark?",
      a: `Als Orientierung gelten im DACH-Raum ${fmtEur(PACHT.freiflaecheProHa.min)} bis ${fmtEur(PACHT.freiflaecheProHa.max)} je Hektar und Jahr. Entscheidend sind Widmungsfähigkeit, Netzanschluss und Förderfähigkeit der Fläche. Mit dem [Pachtrechner](/rechner/pacht) können Sie Ihre Fläche durchrechnen.`,
    },
  ],

  passend: [
    { href: "/ratgeber/freiflaechen-pv-schweiz", titel: "Freiflächen-PV in der Schweiz", text: "Raumplanung, Solarexpress und Einmalvergütung." },
    { href: "/ratgeber/solarpark-genehmigung-bebauungsplan", titel: "Solarpark-Genehmigung in Deutschland", text: "Bebauungsplan, Privilegierung und Verfahrensschritte." },
    { href: "/ratgeber/solarpark-pacht-pro-hektar", titel: "Solarpark-Pacht pro Hektar", text: "Was Flächeneigentümer realistisch erwarten können." },
    { href: "/flaeche-verpachten", titel: "Fläche verpachten", text: "So läuft die Verpachtung für einen Solarpark ab." },
  ],

  quellen: [
    { titel: "RIS – Erneuerbaren-Ausbau-Gesetz § 33 (Abschlag für Freiflächenanlagen)", url: "https://www.ris.bka.gv.at/eli/bgbl/i/2021/150/P33/NOR40236790", stand: "09/2026" },
    { titel: "Land Oberösterreich – Leitfaden 2026 für die Errichtung und Förderung von Photovoltaikanlagen", url: "https://www.land-oberoesterreich.gv.at/Mediendateien/Formulare/Dokumente%20UWD%20Abt_US/Photovoltaik_Leitfaden.pdf", stand: "09/2026" },
    { titel: "Land Niederösterreich – FAQ zu den Regelungen zu Photovoltaikanlagen (Mai 2025)", url: "https://www.raumordnung-noe.at/fileadmin/root_raumordnung/land/ueberoertliche_raumordnung/FAQs_Photovoltaik_20250523.pdf", stand: "09/2026" },
    { titel: "Energie in Niederösterreich – Freiflächen-Photovoltaik-Anlagen", url: "https://www.energie-noe.at/freiflaechen-pv-anlagen", stand: "09/2026" },
    { titel: "Land Steiermark – Entwicklungsprogramm für den Sachbereich Erneuerbare Energie – Solarenergie", url: "https://www.landesentwicklung.steiermark.at/cms/beitrag/12916430/145230171/", stand: "09/2026" },
    { titel: "Land Burgenland – Häufig gestellte Fragen Eignungszonen PV-Freiflächenanlagen", url: "https://www.burgenland.at/verwaltung/landesverwaltung-im-ueberblick/gruppe-3/abteilung-2-landesplanung-gemeinden-und-wirtschaft/hauptreferat-landesplanung/referat-ueberoertliche-raumplanung/haeufig-gestellte-fragen-eignungszonen-pv-freiflaechenanlagen-1/", stand: "09/2026" },
    { titel: "Parlament Österreich – Nationalrat: Erneuerbaren-Ausbau-Beschleunigungsgesetz (PK0542/11.06.2026)", url: "https://www.parlament.gv.at/aktuelles/pk/jahr_2026/pk0542", stand: "09/2026" },
    { titel: "WKO – EAG-Investitionszuschuss 2026 für Photovoltaik und Stromspeicher", url: "https://www.wko.at/foerderungen/eag-investitionszuschuss-2026-photovoltaik-stromspeicher", stand: "09/2026" },
  ],

  seitenCta: { titel: "Fläche in Österreich?", text: "Wir prüfen Widmung, Zone und Netz für Ihre Fläche.", href: "/flaechencheck", label: "Zum Flächencheck" },
  cta: {
    title: "Ihre Fläche in Österreich realistisch einschätzen.",
    text: "ÖkoInvest sitzt in Ostermiething und kennt die Verfahren beiderseits der Grenze. Wir prüfen Zonierung, Netzanschluss und Förderweg – für Flächeneigentümer kostenfrei.",
    primary: { label: "Fläche prüfen lassen", href: "/flaechencheck" },
    secondary: { label: "Pacht berechnen", href: "/rechner/pacht" },
  },
};

export default artikel;
