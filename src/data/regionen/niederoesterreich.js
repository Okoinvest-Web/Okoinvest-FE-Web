// Recherche: 29.09.2026 – NÖ ROG 2014 / FAQ PV Land NÖ (Mai 2025), energie-noe.at (Freiflächen-PV, Agri-PV),
// raumordnung-noe.at (SekRop PV, LGBl. Nr. 94/2022), naturland-noe.at (RED III), Netz NÖ (Kapazitätskarte 02/2025),
// Statistik Austria (Agrarstrukturerhebung 2023, Bevölkerung 01.01.2026), BEV/WKO (Fläche 01.01.2025), PVGIS v5.3, RIS (§ 33 EAG)
import { fristenAT } from "./fristen";

const region = {
  slug: "niederoesterreich",
  land: "AT",
  name: "Niederösterreich",
  inName: "in Niederösterreich",
  kurz: "NÖ",
  seoTitel: "Solarpark & Agri-PV Niederösterreich: Pacht | ÖkoInvest",
  beschreibung:
    "Solarpark Pacht in Niederösterreich: Widmung Grünland-Photovoltaik, 116 PV-Zonen, 2-ha-Grenze, Ökologiekonzept, Netz NÖ und Agri-PV – für Flächeneigentümer.",
  lead:
    "Niederösterreich hat die meiste Agrarfläche Österreichs und ein eigenes Zonenprogramm für Freiflächen-PV. Ob Ihre Fläche passt, entscheidet sich an Zone, Größe und Umspannwerk.",
  akzent: "mit Zonen und Grenzen.",
  ertrag: {
    kwhProKwp: 1190,
    ort: "im Marchfeld östlich von Wien",
    spanne: "rund 1.100 kWh/kWp im Waldviertel bis 1.190 kWh/kWp im Marchfeld",
    hinweis:
      "Das Marchfeld und der Osten des Landes liegen beim Ertrag vorn; im höher gelegenen Waldviertel und im Tullnerfeld (PVGIS rund 1.130 kWh/kWp) fällt er etwas geringer aus.",
  },
  eckdaten: {
    hauptstadt: "St. Pölten",
    flaecheKm2: 19180,
    lfHa: 880435,
    lfJahr: 2023,
    einwohner: 1729541,
    quelle: {
      titel: "Statistik Austria – Land- und forstwirtschaftliche Betriebe nach Flächennutzung 2023 nach Bundesland",
      url: "https://www.statistik.at/fileadmin/pages/155/LuFBetriebeNachFlaechennutzung2023nBL.ods",
    },
  },
  einleitung: [
    "Niederösterreich ist das flächengrößte Bundesland und bewirtschaftet laut Agrarstrukturerhebung 2023 rund 880.000 Hektar landwirtschaftlich genutzte Fläche – gut ein Drittel der österreichischen Agrarfläche. Rund 60 Prozent der Landesfläche zählen zum Dauersiedlungsraum, deutlich mehr als in den Alpenländern. Das Weinviertel, das Marchfeld, das Tullnerfeld und das Steinfeld bieten ebene, gut erschlossene Lagen mit hoher Einstrahlung. Das Land hat sich das Ziel gesetzt, bis 2030 rund 4.500 GWh Strom pro Jahr aus Photovoltaik zu erzeugen.",
    "Gleichzeitig ist Niederösterreich das Land mit den ausdifferenziertesten Regeln für Freiflächenanlagen. **Wer im Grünland mehr als 50 kW errichten will, braucht die Widmung „Grünland-Photovoltaikanlagen“ (Gpv).** Außerhalb der vom Land verordneten Zonen ist eine solche Widmung auf 2 Hektar begrenzt, innerhalb der 116 Zonen des Sektoralen Raumordnungsprogramms sind bis zu 10 Hektar möglich. Für Flächeneigentümer bedeutet das: Die Lage einer Fläche zu einer Zone ist oft wichtiger als ihre Größe.",
    "Hinzu kommt die Netzfrage. Netz Niederösterreich veröffentlicht die freien Einspeisekapazitäten tagesaktuell; einzelne Umspannwerke sind bereits ausgebucht. Ein seriöser Projektentwickler prüft deshalb Zone, Bodenverhältnisse und Netzanschluss, bevor ein Pachtvertrag unterschrieben wird.",
  ],
  recht: [
    {
      titel: "Widmung Gpv ab mehr als 50 kW im Grünland",
      text: "Nach § 20 Abs. 2 Z 21 NÖ ROG 2014 brauchen Photovoltaikanlagen im Grünland (außer auf Bauwerken) die Widmung Grünland-Photovoltaikanlagen, wenn sie allein oder mit räumlich zusammenhängenden Anlagen mehr als 50 kW Engpassleistung erreichen. Die Widmung beschließt der Gemeinderat im örtlichen Raumordnungsprogramm; das Land prüft als Aufsichtsbehörde.",
      quelle: { titel: "Land NÖ – FAQ zu den Regelungen zu Photovoltaikanlagen (Mai 2025)", url: "https://www.raumordnung-noe.at/fileadmin/root_raumordnung/land/ueberoertliche_raumordnung/FAQs_Photovoltaik_20250523.pdf" },
    },
    {
      titel: "Außerhalb der Zonen: 2 ha und Zusammenrechnung im 200-m-Umkreis",
      text: "Außerhalb der Zonen darf eine Gpv-Widmung höchstens 2 Hektar umfassen. Flächen, die weniger als 200 Meter voneinander entfernt liegen, werden zusammengerechnet (§ 20 Abs. 3d NÖ ROG 2014). Eine bis zu 2 ha große Fläche darf zusätzlich direkt an eine Zone anschließen. Größere Widmungen außerhalb von Zonen sind nur in Sonderfällen nach § 20 Abs. 3e möglich, etwa auf stehenden Gewässern oder für die Eigenversorgung einzelner Betriebe.",
      quelle: { titel: "Land NÖ – FAQ Photovoltaik (Mai 2025)", url: "https://www.raumordnung-noe.at/fileadmin/root_raumordnung/land/ueberoertliche_raumordnung/FAQs_Photovoltaik_20250523.pdf" },
    },
    {
      titel: "116 PV-Zonen: 5 ha, mit Ökologiekonzept bis 10 ha",
      text: "Das Sektorale Raumordnungsprogramm über Photovoltaikanlagen im Grünland (LGBl. Nr. 94/2022) legt 116 Zonen fest, in denen Widmungen über 2 ha zulässig sind. Je Zone dürfen insgesamt 5 ha gewidmet werden, eine Erweiterung auf bis zu 10 ha setzt für den Teil über 5 ha ein Ökologiekonzept voraus – mit Erhalt der Bodenqualität, ökologischem Begrünungsanteil, Durchgängigkeit für Niederwild und Maßnahmenpaketen zu Biodiversität oder Ernährung.",
      quelle: { titel: "Raumordnung NÖ – Sektorales Raumordnungsprogramm über PV-Anlagen im Grünland", url: "https://www.raumordnung-noe.at/land/ueberoertliche-raumordnung/raumordnungsprogramme/raumordnungsprogramme-fuer-sachbereiche/sektorales-raumordnungsprogramm-ueber-photovoltaikanlagen-im-gruenland-in-noe" },
    },
    {
      titel: "Vorbelastete Flächen zählen als Zone",
      text: "Als Zonen gelten nach § 2 Abs. 2 SekRop PV auch Altlasten, genehmigte Deponien mit tatsächlich erfolgten Ablagerungen (ohne landwirtschaftlich genutzte Bodenaushubdeponien) und Materialgewinnungsstätten. Liegt eine Kiesgrube nicht in einer der 116 Zonen, muss der Abbau abgeschlossen und die Abbausohle erreicht sein, bevor dort PV gewidmet werden kann.",
      quelle: { titel: "Land NÖ – FAQ Photovoltaik (Mai 2025)", url: "https://www.raumordnung-noe.at/fileadmin/root_raumordnung/land/ueberoertliche_raumordnung/FAQs_Photovoltaik_20250523.pdf" },
    },
    {
      titel: "Elektrizitätsrecht ab 1 MWp, Naturschutz bei jeder Größe",
      text: "Anlagen bis 1 MWp, die von befugten Unternehmen errichtet werden, brauchen nach § 5 Abs. 2 Z 3 NÖ ElWG 2005 keine Anlagengenehmigung; darüber ist eine elektrizitätsrechtliche Genehmigung des Landes nötig. Außerhalb des Ortsgebiets ist nach dem NÖ Naturschutzgesetz 2000 unabhängig von der Größe eine naturschutzrechtliche Bewilligung erforderlich, in Natura-2000-Gebieten regelmäßig eine Naturverträglichkeitsprüfung.",
      quelle: { titel: "Energie in Niederösterreich – Freiflächen-Photovoltaik-Anlagen", url: "https://www.energie-noe.at/freiflaechen-pv-anlagen" },
    },
    {
      titel: "EAG: 25 % Abschlag auf Grünland, Ausnahme Agri-PV",
      text: "Wer eine EAG-Marktprämie anstrebt, muss auf landwirtschaftlich genutzten Flächen und im Grünland mit einem Abschlag von 25 % auf den Zuschlagswert rechnen (§ 33 EAG). Der Abschlag entfällt unter anderem für Deponien, Altlasten, Bergbau- und Infrastrukturstandorte sowie für Agri-PV-Anlagen, die die landwirtschaftliche Hauptnutzung nicht oder nur gering beeinträchtigen – für die vorbelasteten NÖ-Zonen ein wichtiger Vorteil.",
      quelle: { titel: "RIS – Erneuerbaren-Ausbau-Gesetz § 33", url: "https://www.ris.bka.gv.at/eli/bgbl/i/2021/150/P33/NOR40236790" },
    },
    ...fristenAT(),
  ],
  kulisse: {
    text: "Die Flächenkulisse in Niederösterreich wird vor allem durch die 116 Zonen und die 2-ha-Grenze bestimmt. Wer eine größere Ackerfläche außerhalb einer Zone besitzt, kann in der Regel nur einen Teil davon für PV nutzen. Chancen bieten Flächen in oder direkt neben einer Zone, vorbelastete Standorte und Kombinationen mit landwirtschaftlicher Nutzung.",
    gut: [
      "Flächen innerhalb einer der 116 Zonen des SekRop PV (bis 5 + 5 ha)",
      "bis 2 ha große Flächen direkt im Anschluss an eine Zone",
      "ausgekieste Schottergruben, Deponien mit Ablagerungen, Altlasten",
      "ebene Lagen im Weinviertel, Marchfeld und Tullnerfeld mit Umspannwerk mit freier Kapazität",
    ],
    schwierig: [
      "Flächen im 30-jährlichen Hochwasserabflussbereich oder in roten Gefahrenzonen (Gpv nach § 15 Abs. 7 NÖ ROG unzulässig)",
      "Pflegezonen des Biosphärenparks Wienerwald",
      "Natura-2000-Gebiete (Naturverträglichkeitsprüfung, hohe Hürden)",
      "erhaltenswerte Landschaftsteile der regionalen Raumordnungsprogramme",
      "Standorte an ausgebuchten Umspannwerken",
    ],
  },
  ablauf: {
    text: "In Niederösterreich beginnt ein Solarpark mit der Frage, ob die Fläche in einer Zone liegt oder unter 2 ha bleibt. Dann stellt die Gemeinde ihr örtliches Raumordnungsprogramm um (Widmung Gpv); für Widmungen zwischen 3.000 m² und 1,5 ha ist ein Anschlusskonzept vorzulegen, in den Zonen wird die Prüfung der Umspannwerkskapazität empfohlen. Das Ökologiekonzept für Flächen über 5 ha wird über Vertrag oder Widmungszusatz abgesichert und gilt über die gesamte Betriebsdauer. Parallel laufen die naturschutzrechtliche Bewilligung bei der Bezirkshauptmannschaft, ab 1 MWp die elektrizitätsrechtliche Genehmigung und die Netzzugangsanfrage bei Netz Niederösterreich.",
    behoerden: [
      { name: "Gemeinde (Gemeinderat)", rolle: "Änderung des örtlichen Raumordnungsprogramms, Widmung Grünland-Photovoltaikanlagen, Vertrag zum Ökologiekonzept" },
      { name: "Amt der NÖ Landesregierung – Raumordnung", rolle: "Aufsichtsbehörde über die Widmung, Zonen des SekRop PV, Leitfäden", url: "https://www.raumordnung-noe.at" },
      { name: "Bezirkshauptmannschaft", rolle: "naturschutzrechtliche Bewilligung und Naturverträglichkeitsprüfung" },
      { name: "Amt der NÖ Landesregierung – Elektrizitätsrecht", rolle: "Anlagengenehmigung nach NÖ ElWG 2005 für Anlagen über 1 MWp" },
      { name: "Netz Niederösterreich", rolle: "Netzzugang, Kapazitätsauskunft je Umspannwerk", url: "https://netz-noe.at" },
    ],
  },
  agri: [
    "Agri-PV ist in Niederösterreich kein Sonderweg außerhalb der Widmung: Auch eine Agri-PV-Anlage über 50 kW im Grünland braucht nach den Regeln des NÖ ROG die Widmung Gpv und unterliegt denselben Flächengrenzen. Ihren Vorteil spielt sie beim Ökologiekonzept aus, das neben Biodiversitätsmaßnahmen ausdrücklich Maßnahmenpakete zur Ernährung vorsieht, und bei der EAG-Förderung, wo der 25-%-Abschlag entfallen kann.",
    "Das Land führt auf energie-noe.at zwei Beispiele: den Agri-PV-Park in Bruck an der Leitha (2022, 5,5 ha, 3 MWp, rund 80 % der Fläche weiter für Lebensmittelanbau, 18 % Blühstreifen) und ein Öko-Solar-Biotop in Pöchlarn mit Apfelbäumen, die unter den Modulen Hagelschutz erhalten. Für Ackerbaubetriebe im Weinviertel oder Marchfeld kommen vor allem vertikale oder hoch aufgeständerte Systeme infrage, die die Bewirtschaftung mit Maschinen erlauben.",
  ],
  netz: {
    uenb: ["APG (Austrian Power Grid)"],
    vnb: ["Netz Niederösterreich"],
    hinweis:
      "Netz NÖ stellt seit Februar 2025 eine tagesaktuelle Kapazitätskarte bereit; einzelne Umspannwerke weisen keine freie Einspeisekapazität mehr aus. Der Netzbetreiber baut nach seinem Netzentwicklungsplan 2024–2034 Umspannwerke aus.",
    quelle: { titel: "Netz Niederösterreich – Kapazitätskarte für die PV-Planung (02.02.2025)", url: "https://netz-noe.at/unternehmen/presse/presseuebersicht/kapazitaets-karte" },
  },
  besonderheiten: [
    {
      titel: "Zonenlogik statt Einzelfall",
      text: "Anders als in den meisten Bundesländern ist in Niederösterreich genau verordnet, wo große Freiflächenanlagen hindürfen. Innerhalb einer Zone werden alle Gpv-Widmungen unabhängig vom Abstand zusammengerechnet; wer zuerst widmet, verbraucht das Kontingent der Zone. Für Eigentümer lohnt ein früher Blick in die Zonenkarte des Landes.",
    },
    {
      titel: "Kies, Schotter und Deponien",
      text: "Das Wiener Becken und das Tullnerfeld sind von Materialabbau geprägt. Die FAQ des Landes stellen klar, dass PV und Materialabbau in den 116 Zonen kombiniert werden können und nicht zuerst ausgekiest werden muss; außerhalb der Zonen braucht es einen abgeschlossenen Abbau mit Abschlussbetriebsplan.",
    },
    {
      titel: "Hochwasserflächen an Donau, March und Thaya",
      text: "Flächen, die bei einem 30-jährlichen Hochwasser überflutet werden oder in roten Gefahrenzonen liegen, sind als Retentionsflächen freizuhalten; eine Gpv-Widmung ist dort ausgeschlossen. In den Flussniederungen sollte das vor jeder Planung geprüft werden.",
    },
    {
      titel: "RED III: Beschleunigungsgebiete in Vorbereitung",
      text: "Zusätzlich zum SekRop PV bereitet das Land Beschleunigungsgebiete für PV-Freiflächen nach der EU-Richtlinie RED III vor, mit Vorrang für vorbelastete und versiegelte Flächen wie Deponien und ohne Natura-2000-Gebiete. Die rechtliche Umsetzung war für das dritte Quartal 2026 angekündigt.",
    },
  ],
  pacht: {
    tendenz: "mitte",
    begruendung:
      "Gute Einstrahlung und ebene Lagen stehen kleinen zulässigen Widmungsgrößen außerhalb der Zonen, dem EAG-Abschlag und teils knappen Netzkapazitäten gegenüber. Die Pacht bewegt sich daher meist im mittleren Bereich, auf Zonenflächen mit freiem Netz eher darüber.",
  },
  faq: [
    {
      q: "Wie viel Pacht bekomme ich für einen Solarpark in Niederösterreich?",
      a: "Das hängt vor allem davon ab, ob die Fläche in einer Zone liegt, wie weit das nächste Umspannwerk mit freier Kapazität entfernt ist und ob das Projekt mit oder ohne EAG-Abschlag gefördert wird. Eine Orientierung für Ihre Fläche liefert der Pachtrechner; verbindlich wird es erst nach Prüfung von Widmungsfähigkeit und Netz.",
    },
    {
      q: "Wie groß darf ein Solarpark in Niederösterreich sein?",
      a: "Außerhalb der 116 Zonen höchstens 2 ha je Widmung, wobei Flächen im Umkreis von 200 m zusammengerechnet werden. In einer Zone sind insgesamt 5 ha möglich, mit Ökologiekonzept bis 10 ha. Sonderregeln gelten für stehende Gewässer und betriebliche Eigenversorgung.",
    },
    {
      q: "Meine Fläche liegt nicht in einer PV-Zone – geht trotzdem etwas?",
      a: "Ja, aber meist nur bis 2 ha, und im 200-m-Umkreis darf keine weitere Gpv-Fläche liegen. Grenzt Ihre Fläche direkt an eine Zone, kann eine bis zu 2 ha große Fläche zusätzlich gewidmet werden. Für vorbelastete Flächen wie abgeschlossene Kiesgruben gelten eigene Regeln.",
    },
    {
      q: "Braucht ein Solarpark in Niederösterreich eine Naturschutzbewilligung?",
      a: "Außerhalb des Ortsgebiets in der Regel ja, und zwar unabhängig von der Größe. Zuständig ist die Bezirkshauptmannschaft. In Natura-2000-Gebieten kommt eine Naturverträglichkeitsprüfung hinzu, die in der Praxis selten zugunsten einer Freiflächenanlage ausgeht.",
    },
    {
      q: "Kann ich auf meiner Fläche weiter Landwirtschaft betreiben?",
      a: "Bei Agri-PV ja – das ist ihr Zweck. Auch bei klassischen Freiflächenanlagen ist eine Beweidung, etwa mit Schafen, häufig. Das Ökologiekonzept für Flächen über 5 ha verlangt unter anderem den Erhalt der Bodenqualität und kann Maßnahmen zur Ernährung umfassen.",
    },
    {
      q: "Was bedeutet ein ausgebuchtes Umspannwerk für mein Projekt?",
      a: "Ohne freie Einspeisekapazität ist ein Anschluss erst nach einem Netzausbau möglich, der Jahre dauern kann. Netz NÖ zeigt die Kapazitäten tagesaktuell in einer Karte; ein seriöser Entwickler klärt das vor dem Pachtvertrag.",
    },
  ],
  quellen: [
    { titel: "Land Niederösterreich – FAQ zu den Regelungen zu Photovoltaikanlagen (Mai 2025)", url: "https://www.raumordnung-noe.at/fileadmin/root_raumordnung/land/ueberoertliche_raumordnung/FAQs_Photovoltaik_20250523.pdf", stand: "09/2026" },
    { titel: "Raumordnung NÖ – Sektorales Raumordnungsprogramm über Photovoltaikanlagen im Grünland", url: "https://www.raumordnung-noe.at/land/ueberoertliche-raumordnung/raumordnungsprogramme/raumordnungsprogramme-fuer-sachbereiche/sektorales-raumordnungsprogramm-ueber-photovoltaikanlagen-im-gruenland-in-noe", stand: "09/2026" },
    { titel: "Energie in Niederösterreich – Freiflächen-Photovoltaik-Anlagen", url: "https://www.energie-noe.at/freiflaechen-pv-anlagen", stand: "09/2026" },
    { titel: "Energie in Niederösterreich – Agri-PV", url: "https://www.energie-noe.at/agri-pv", stand: "09/2026" },
    { titel: "Naturland NÖ – Die RED III Richtlinie in Niederösterreich", url: "https://www.naturland-noe.at/verstaendlich-erklaert-die-red-iii-richtlinie-in-niederoesterreich", stand: "09/2026" },
    { titel: "Netz Niederösterreich – Kapazitätskarte für die PV-Planung", url: "https://netz-noe.at/unternehmen/presse/presseuebersicht/kapazitaets-karte", stand: "09/2026" },
    { titel: "RIS – Erneuerbaren-Ausbau-Gesetz § 33", url: "https://www.ris.bka.gv.at/eli/bgbl/i/2021/150/P33/NOR40236790", stand: "09/2026" },
    { titel: "Statistik Austria – Betriebe nach Flächennutzung 2023 nach Bundesland", url: "https://www.statistik.at/fileadmin/pages/155/LuFBetriebeNachFlaechennutzung2023nBL.ods", stand: "09/2026" },
    { titel: "WKO Statistik – Fläche und Benützungsarten (BEV/Statistik Austria, Stand 01.01.2025)", url: "https://www.wko.at/statistik/bundesland/flaecheben.pdf", stand: "09/2026" },
    { titel: "Statistik Austria – Bevölkerung zu Jahres-/Quartalsanfang", url: "https://www.statistik.at/statistiken/bevoelkerung-und-soziales/bevoelkerung/bevoelkerungsstand/bevoelkerung-zu-jahres-/-quartalsanfang", stand: "09/2026" },
    { titel: "JRC PVGIS 5.3 – Ertragsberechnung (Marchfeld, Tullnerfeld, Waldviertel)", url: "https://re.jrc.ec.europa.eu/pvg_tools/de/", stand: "09/2026" },
  ],
  unsicher: [
    "Ob die RED-III-Beschleunigungsgebiete in NÖ bis 29.09.2026 tatsächlich verordnet wurden, war nicht belegbar (Quelle nennt Umsetzung „geplant Q3 2026“) – im Text als angekündigt formuliert.",
    "Zuständige Stelle im Amt der NÖ Landesregierung für die elektrizitätsrechtliche Genehmigung nicht exakt benannt (energie-noe.at: Landesbehörde); Behördenbezeichnung allgemein gehalten.",
    "Keine landeseigene Agri-PV-Förderung in NÖ gefunden – daher weggelassen.",
    "Konkrete Kriterien der Zonenfindung (Bodenbonität usw.) im Methodenbericht nicht ausgewertet – nicht genannt.",
    "Weitere kleinere Verteilernetzbetreiber in NÖ (z. B. Stadtwerke) nicht recherchiert – nur Netz NÖ genannt.",
    "PVGIS-Punkte: Marchfeld 48,30/16,70 (1.189), Tullnerfeld 48,20/16,00 (1.127), Waldviertel 48,75/15,30 (1.100).",
  ],
};

export default region;
