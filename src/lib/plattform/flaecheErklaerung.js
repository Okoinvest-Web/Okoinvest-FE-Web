// src/lib/plattform/flaecheErklaerung.js
//
// Erklärungen zur Flächen-Pipeline je Status und Land (DE/AT/CH):
// „Was passiert jetzt? Wie lange dauert das typischerweise? Was brauchen wir von Ihnen?“
// Dauern sind Erfahrungswerte (Spannen), keine Zusagen – so auch in der Oberfläche formuliert.
// Client- und serverseitig nutzbar.

/**
 * Je Status: was (Text, optional je Land), dauer (je Land), vonIhnen (Liste, optional je Land), begriffe (Lexikon-IDs).
 * `land` überschreibt einzelne Felder für AT bzw. CH.
 */
export const PIPELINE_ERKLAERUNG = {
  entwurf: {
    was: "Ihre Fläche ist angelegt, aber noch nicht eingereicht. Erst nach dem Einreichen sehen wir sie in der Prüfung.",
    dauer: { DE: "liegt bei Ihnen", AT: "liegt bei Ihnen", CH: "liegt bei Ihnen" },
    vonIhnen: ["Pflichtangaben ergänzen (Lage, Größe, bei Dach- und Agri-PV die markierten Fachangaben)", "Flurstücke eintragen – das beschleunigt die Vorprüfung deutlich", "„Zur Prüfung einreichen“ klicken"],
    begriffe: [],
  },
  eingegangen: {
    was: "Wir sichten Ihre Angaben, legen die Fläche im Geoinformationssystem an und ordnen Ihnen einen festen Ansprechpartner zu.",
    dauer: { DE: "in der Regel wenige Werktage", AT: "in der Regel wenige Werktage", CH: "in der Regel wenige Werktage" },
    vonIhnen: ["Grundbuchauszug und Flurkarte hochladen (Checkliste rechts)", "bei mehreren Eigentümern: Vollmacht bzw. Zustimmung vorbereiten"],
    begriffe: [],
  },
  vorpruefung: {
    was: "Desktop-Prüfung ohne Kosten für Sie: Schutzgebiete (Natura 2000, Landschafts- und Wasserschutz), Regionalplan und Flächennutzungsplan, EEG-Flächenkulisse (500-m-Randstreifen, benachteiligte Gebiete), Entfernung zum Netz und Mindestgröße.",
    dauer: { DE: "etwa 2–6 Wochen", AT: "etwa 2–6 Wochen", CH: "etwa 3–8 Wochen" },
    vonIhnen: ["Rückfragen zu Leitungen, Drainagen, Wegen und Bewirtschaftung beantworten"],
    begriffe: ["randstreifen", "benachteiligte-gebiete", "flaechennutzungsplan"],
    land: {
      AT: {
        was: "Desktop-Prüfung ohne Kosten für Sie: Flächenwidmungsplan und Photovoltaik-Zonierung bzw. Eignungszonen des Bundeslandes, Schutzgebiete, Bodenqualität, Entfernung zum Netz und Mindestgröße.",
        begriffe: ["gruenland-photovoltaik", "eag"],
      },
      CH: {
        was: "Desktop-Prüfung ohne Kosten für Sie: kantonaler Richtplan und Nutzungsplanung, Fruchtfolgeflächen, Schutzinventare (Landschaften, Moore, Gewässerschutz), Entfernung zum Netz.",
        begriffe: ["solarexpress"],
      },
    },
  },
  standortanalyse: {
    was: "Detailprüfung: Anfrage beim Netzbetreiber zu Verknüpfungspunkt und Kapazität, Ertragsvorabschätzung, Begehung vor Ort, erste Abstimmung mit der Gemeinde und Wirtschaftlichkeitsrechnung.",
    dauer: { DE: "etwa 2–6 Monate – die Antwort des Netzbetreibers ist meist der Engpass", AT: "etwa 2–6 Monate – abhängig von der Netzzugangsprüfung", CH: "etwa 2–6 Monate – abhängig vom Verteilnetzbetreiber" },
    vonIhnen: ["Zufahrt für die Begehung ermöglichen", "Hinweise auf Drainagen, Leitungen, Altlasten oder Bodendenkmäler geben", "bestehenden Pächter informieren (noch unverbindlich)"],
    begriffe: ["netzverknuepfungspunkt", "netzanschlusszusage"],
  },
  pachtangebot: {
    was: "Sie erhalten ein schriftliches Pachtangebot. Der Angebotsbogen unten ordnet jeden Punkt ein und nennt die Fragen, die Sie stellen sollten. Lassen Sie den Vertragsentwurf anwaltlich prüfen – die Kostenübernahme ist Teil des Angebots.",
    dauer: { DE: "Bedenkzeit nach Absprache; Angebote sind meist befristet", AT: "Bedenkzeit nach Absprache; Angebote sind meist befristet", CH: "Bedenkzeit nach Absprache; Angebote sind meist befristet" },
    vonIhnen: ["Angebot prüfen, Rückfragen über „Nachrichten“ stellen", "Steuerberatung einbeziehen (Grund-, Erbschaft- und Einkommensteuer)", "bei Grundschulden: Ihre Bank auf einen Rangrücktritt ansprechen"],
    begriffe: ["flaechenpacht", "rueckbauverpflichtung", "rangruecktritt"],
  },
  vertrag: {
    was: "Der Nutzungsvertrag wird unterzeichnet und die Dienstbarkeit notariell bewilligt; sie sichert das Recht, die Anlage zu bauen und zu betreiben, auch gegenüber späteren Eigentümern und Banken.",
    dauer: { DE: "etwa 4–8 Wochen bis zum Notartermin", AT: "etwa 4–8 Wochen bis zur Unterfertigung", CH: "etwa 4–10 Wochen bis zur Beurkundung" },
    vonIhnen: ["Notartermin wahrnehmen (Ausweis, Grundbuchdaten)", "Unterschriften aller Eigentümer bzw. Vollmachten beibringen"],
    begriffe: ["dienstbarkeit", "grunddienstbarkeit"],
    land: {
      AT: {
        was: "Der Nutzungsvertrag wird unterzeichnet und die Dienstbarkeit mit beglaubigter Unterschrift im Grundbuch einverleibt. In einigen Bundesländern kann die Verpachtung land- und forstwirtschaftlicher Flächen grundverkehrsbehördlich anzeige- oder genehmigungspflichtig sein – das übernehmen wir.",
      },
      CH: {
        was: "Der Nutzungsvertrag wird unterzeichnet; der Dienstbarkeitsvertrag (in der Regel ein Baurecht bzw. eine Personaldienstbarkeit) wird öffentlich beurkundet und im Grundbuch eingetragen.",
      },
    },
  },
  planung: {
    was: "Bauleitplanung durch die Gemeinde: Aufstellungsbeschluss, frühzeitige Beteiligung von Öffentlichkeit und Behörden, Umweltbericht und Fachgutachten, öffentliche Auslegung, Satzungsbeschluss; parallel Netzanschlusszusage und ggf. EEG-Ausschreibung.",
    dauer: { DE: "etwa 12–24 Monate", AT: "etwa 9–24 Monate", CH: "etwa 12–36 Monate" },
    vonIhnen: ["Betretung für Gutachter ermöglichen (Kartierungen, Bodenproben)", "Bewirtschaftung bis Baubeginn wie im Vertrag vereinbart fortführen"],
    begriffe: ["aufstellungsbeschluss", "fruehzeitige-beteiligung", "satzungsbeschluss", "umweltbericht"],
    land: {
      AT: {
        was: "Umwidmung in „Grünland – Photovoltaik“ durch die Gemeinde (Flächenwidmungsplan mit aufsichtsbehördlicher Genehmigung des Landes), elektrizitätsrechtliche und ggf. naturschutzrechtliche Bewilligung; ab bestimmten Größen ist eine UVP zu prüfen. Parallel Netzzugang und EAG-Förderantrag.",
        begriffe: ["gruenland-photovoltaik", "uvp", "eag"],
      },
      CH: {
        was: "Nutzungsplanung bzw. Ausnahmebewilligung außerhalb der Bauzone, Baubewilligung; bei alpinen Großanlagen gelten die besonderen Verfahren des Solarexpress. Parallel Netzanschluss und Antrag auf Einmalvergütung.",
        begriffe: ["solarexpress", "einmalverguetung"],
      },
    },
  },
  bau: {
    was: "Rammarbeiten, Montage der Tische und Module, Kabeltrasse und Trafostation; eine bodenkundliche Baubegleitung schützt Ihren Boden.",
    dauer: { DE: "etwa 3–6 Monate Bauzeit", AT: "etwa 3–6 Monate Bauzeit", CH: "etwa 3–8 Monate Bauzeit" },
    vonIhnen: ["Ernte bzw. Beweidung mit der Bauleitung abstimmen", "Zufahrten und Lagerflächen freihalten wie vereinbart"],
    begriffe: ["epc"],
  },
  betrieb: {
    was: "Die Anlage speist ein. Die Pacht wird laut Vertrag gezahlt (meist jährlich im Voraus), Grünpflege und Wartung laufen, am Ende steht der gesicherte Rückbau.",
    dauer: { DE: "Laufzeit laut Vertrag, üblich 25–30 Jahre plus Optionen", AT: "Laufzeit laut Vertrag, üblich 25–30 Jahre plus Optionen", CH: "Laufzeit laut Vertrag, üblich 25–30 Jahre plus Optionen" },
    vonIhnen: ["Adress- oder Kontoänderungen mitteilen", "Pachtabrechnungen mit Ihrer Steuerberatung abstimmen"],
    begriffe: ["o-und-m", "rueckbauverpflichtung"],
  },
  abgelehnt: {
    was: "Die Fläche eignet sich nach unserer Prüfung derzeit nicht – die Begründung steht im Verlauf. Ändern sich Rahmenbedingungen (Netz, Regionalplan, Nachbarflächen), prüfen wir gern erneut.",
    dauer: { DE: "–", AT: "–", CH: "–" },
    vonIhnen: ["bei neuen Informationen einfach eine Nachricht schreiben"],
    begriffe: [],
  },
};

/** Erklärung für Status und Land (mit Landesabweichungen) */
export function pipelineErklaerung(status, land = "DE") {
  const e = PIPELINE_ERKLAERUNG[status];
  if (!e) return null;
  const l = e.land?.[land] || {};
  return {
    status,
    was: l.was || e.was,
    dauer: e.dauer?.[land] || e.dauer?.DE || "",
    vonIhnen: l.vonIhnen || e.vonIhnen || [],
    begriffe: l.begriffe || e.begriffe || [],
  };
}
