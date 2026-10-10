// src/lib/fakten/daten/kommune-laender.js
//
// Fakten für Kommunal 2.0 (Welle 3, Paket B8): Landesgesetze zur finanziellen Beteiligung der Gemeinden an
// PV-Freiflächenanlagen (DE). Nur Aussagen, die die Website heute schon mit Quelle trifft – Wortlaut und Zahlen aus
// den Regionsdateien src/data/regionen/<bundesland>.js (Stand 09/2026, Quellen dort und hier). Welche Länder ein
// Gesetz haben, steht bereits in de.js (kommune.laenderMitBeteiligungsgesetz, Übersicht der Fachagentur Wind und
// Solar). Alle Einträge status "zu_pruefen": Vor der Freigabe am Gesetzestext nachprüfen (Team Deutschland, E6).
// Für Sachsen ist der Wert nach der Novelle 09/2025 nicht belegt – bewusst null (keine Zahl erfinden).
//
// Österreich und Schweiz: keine Zahlen. Die Gemeinde-Werkzeuge zeigen für AT die Widmungsschritte aus den
// Regionsdateien und die ElWG-Fakten aus eg-at.js; für CH den Länderhinweis.
// Vertrag: ../schema.js. NUR über src/lib/fakten/index.js importieren.

const ABRUF = "2026-09-29"; // Stand der Regionsdateien (Quellen „Stand 09/2026“)
const OFFEN = "TODO-E6 · Fachprüfung Team Deutschland";

const Q = {
  bayern: { titel: "StMWi Bayern – Beteiligung an Windenergie- und PV-Freiflächenanlagen (BayWiVG)", url: "https://www.stmwi.bayern.de/energie/energiewende/beteiligung-an-windenergie-und-pv-freiflaechenanlagen/" },
  brandenburg: { titel: "BRAVORS – BbgEESG vom 27.11.2025", url: "https://bravors.brandenburg.de/gesetze/bbgeesg" },
  mv: {
    titel: "GVOBl. M-V 2026 Nr. 12 vom 28.04.2026 – Bürger- und Gemeindenbeteiligungsgesetz (BüGembeteilG M-V)",
    url: "https://www.regierung-mv.de/static/Regierungsportal/Justizministerium/Inhalte/Rechtliches/GVOBI.M-V/GVOBl.%20Nr.%2012%20v.%2028.4.2026.pdf",
  },
  niedersachsen: { titel: "NWindPVBetG (umwelt-online)", url: "https://www.umwelt-online.de/regelwerk/cgi-bin/suchausgabe.cgi?pfad=%2Fenergie%2Flaender%2Fnds%2Fwindpvbetg24.htm&such=Gesetz" },
  saarland: { titel: "saarland.de (MWIDE) – Windpaket tritt in Kraft, mit SGBG (19.07.2024)", url: "https://www.saarland.de/mwide/DE/aktuelles/aktuelle-meldungen/2024/07/19_windpaket", art: "sekundaer" },
  sachsen: { titel: "energie.sachsen.de – Erneuerbare-Energien-Ertragsbeteiligungsgesetz", url: "https://www.energie.sachsen.de/ertragsbeteiligungsgesetz.html" },
  sachsenAnhalt: {
    titel: "MWU Sachsen-Anhalt – Erläuterungen zum Akzeptanz- und Beteiligungsgesetz (AuBG)",
    url: "https://mwu.sachsen-anhalt.de/energie/erneuerbare-energien/akzeptanz-und-beteiligungsgesetz/page/erlaeuterungen-zum-akzeptanz-und-beteiligungsgesetz",
  },
};

const f = (id, wert, einheit, quelle, notiz, extra = {}) => ({
  id,
  wert,
  einheit,
  land: "DE",
  quelle,
  abruf: ABRUF,
  gueltigAb: null,
  gueltigBis: null,
  status: "zu_pruefen",
  pruefer: OFFEN,
  klasse: "A",
  notiz,
  ...extra,
});

const FAKTEN = [
  // Bayern – BayWiVG
  f("kommune.landesregel.bayern.ctKwh", 0.2, "ct/kWh", Q.bayern, "Mindestwert der Beteiligung („mindestens 0,2 bis etwa 0,3 Cent je Kilowattstunde“); die 0,2 ct können über eine Vereinbarung nach § 6 EEG erbracht werden. Wortlaut src/data/regionen/bayern.js (Nachprüfung 03.10.2026, Paket G).", { abruf: "2026-10-03", gueltigAb: "2026-01-01" }),
  f("kommune.landesregel.bayern.ausgleichCtKwh", 0.3, "ct/kWh", Q.bayern, "Ausgleichsabgabe per Bescheid bei Verletzung der Pflicht, insgesamt 0,3 ct/kWh.", { abruf: "2026-10-03", gueltigAb: "2026-01-01" }),
  f("kommune.landesregel.bayern.abMw", 5, "MW", Q.bayern, "Pflicht für neue PV-Freiflächenanlagen mit MEHR als 5 MW.", { abruf: "2026-10-03", gueltigAb: "2026-01-01" }),
  // Brandenburg – BbgEESG
  f("kommune.landesregel.brandenburg.eurMw", 2000, "€/MW·a", Q.brandenburg, "Sonderabgabe 2.000 € je Megawatt installierter Leistung und Jahr für Freiflächenanlagen über 1 MW mit Inbetriebnahme nach dem 31.12.2024; fällig jeweils bis 30. April des Folgejahres.", { gueltigAb: "2025-11-28" }),
  f("kommune.landesregel.brandenburg.abMw", 1, "MW", Q.brandenburg, "Anlagen ÜBER 1 MW.", { gueltigAb: "2025-11-28" }),
  // Mecklenburg-Vorpommern – BüGembeteilG M-V
  f("kommune.landesregel.mecklenburg-vorpommern.eurMwGemeinde", 1000, "€/MW·a", Q.mv, "Angebot an die Standortgemeinde: jährlich 1.000 € je VOLLES Megawatt.", { gueltigAb: "2026-04-23" }),
  f("kommune.landesregel.mecklenburg-vorpommern.eurMwEinwohner", 1000, "€/MW·a", Q.mv, "Angebot an die Einwohnerinnen und Einwohner: jährlich 1.000 € je Megawatt (Gutschrift auf der Stromrechnung oder Direktzahlung).", { gueltigAb: "2026-04-23" }),
  f("kommune.landesregel.mecklenburg-vorpommern.ersatzEurMw", 2000, "€/MW·a", Q.mv, "Ersatzzahlung, wenn keine Vereinbarung zustande kommt.", { gueltigAb: "2026-04-23" }),
  f("kommune.landesregel.mecklenburg-vorpommern.abMw", 1, "MW", Q.mv, "Freiflächenanlagen ab 1.000 kW; Anlagen, bei denen der Aufstellungsbeschluss für den Bebauungsplan nach Inkrafttreten gefasst wurde.", { gueltigAb: "2026-04-23" }),
  // Niedersachsen – NWindPVBetG
  f("kommune.landesregel.niedersachsen.ctKwh", 0.2, "ct/kWh", Q.niedersachsen, "Akzeptanzabgabe an die Standortgemeinde für neue Freiflächenanlagen ab 1 MW (seit April 2024); zusätzlich Beteiligungsangebot an Anwohner und Kommunen im Umkreis von 2.500 m.", { gueltigAb: "2024-04-19" }),
  f("kommune.landesregel.niedersachsen.abMw", 1, "MW", Q.niedersachsen, "Anlagen ab 1 MW.", { gueltigAb: "2024-04-19" }),
  // Saarland – SGBG
  f("kommune.landesregel.saarland.ersatzCtKwh", 0.2, "ct/kWh", Q.saarland, "Ersatzzahlung, wenn keine Beteiligungsvereinbarung zustande kommt – nach der Übersicht der Fachagentur Wind und Solar; am Gesetzestext nachprüfen.", { gueltigAb: "2024-07-19" }),
  // Sachsen – EEErtrBetG
  f("kommune.landesregel.sachsen.ctKwh", null, "ct/kWh", Q.sachsen, "Ursprüngliche Fassung (in Kraft 29.06.2024): 0,1 ct/kWh. Das Gesetz wurde im September 2025 novelliert; der Wert der geltenden Fassung ist nicht belegt – bewusst null, bis er am Original erhoben ist.", { gueltigAb: "2024-06-29" }),
  f("kommune.landesregel.sachsen.abMw", 1, "MW", Q.sachsen, "Freiflächenanlagen ab 1 MW, genehmigt ab 01.01.2025.", { gueltigAb: "2024-06-29" }),
  // Sachsen-Anhalt – AuBG
  f("kommune.landesregel.sachsen-anhalt.ctKwh", 0.3, "ct/kWh", Q.sachsenAnhalt, "0,3 ct je eingespeister kWh, mindestens 2,50 €/kWp – es gilt der höhere Betrag. Für Freiflächenanlagen mit Inbetriebnahme ab 01.10.2025.", { gueltigAb: "2025-10-01" }),
  f("kommune.landesregel.sachsen-anhalt.mindestEurKwp", 2.5, "€/kWp·a", Q.sachsenAnhalt, "Mindestbetrag 2,50 € je Kilowatt-Peak.", { gueltigAb: "2025-10-01" }),
];

const MODUL = {
  name: "kommune-laender",
  land: "DE",
  fakten: FAKTEN,
  quellen: {
    kommune: Object.values(Q).map((q) => ({ titel: q.titel, url: q.url })),
  },
};

export default MODUL;
