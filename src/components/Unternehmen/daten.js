// Inhalte der Seite /unternehmen.
// QUELLEN: Registerangaben aus src/data/site.js (Firmenbuch AT); Gruppen-
// geschichte aus der Ökovolt-DE-Website (src/data/unternehmen.js, dort mit
// Register- und Jahresabschlussangaben belegt). Keine eigenen Kennzahlen
// über ÖkoInvest außer der Entwicklungs-Pipeline (Vorgabe Geschäftsführung).

import { GESELLSCHAFT, KENNZAHLEN } from "@/data/site";

export const MEILENSTEINE = [
  {
    jahr: "2010",
    titel: "Der Anfang in Türkheim",
    text: "Andreas Wegscheider und Susanne Messmer gründen die ÖKOVOLT GmbH, die bis heute ihren Sitz in Türkheim im Unterallgäu hat – mit eigener Montagegesellschaft. Planung, Bau und Inbetriebnahme kommen von Beginn an aus einer Hand.",
    hervorgehoben: true,
  },
  {
    jahr: "2012",
    titel: "Vom Dach aufs Feld",
    text: "Die Gründer bauen die ersten Solarparks – und betreiben sie selbst, jeweils über eine eigene Betreibergesellschaft, etwa in Artern und Tilleda. Für die Fundamente entsteht die Deutsche Solar & Rammtechnik GmbH. Im selben Jahr wird die österreichische Schwestergesellschaft gegründet.",
  },
  {
    jahr: "2013",
    titel: "Solarpark vor der Haustür",
    text: "Mit dem Solarpark in Irsingen, einem Ortsteil von Türkheim, entsteht ein Park direkt am Firmensitz.",
  },
  {
    jahr: "2020",
    titel: "Gründung der ÖkoInvest GmbH",
    text: `Am ${GESELLSCHAFT.eingetragen} wird die ${GESELLSCHAFT.name} in ${GESELLSCHAFT.ort} ins Firmenbuch eingetragen – als Projektgesellschaft der Gruppe für Freiflächen-PV, Agri-PV, Contracting und Stromlieferverträge.`,
    hervorgehoben: true,
  },
  {
    jahr: "2021",
    titel: "Neu aufgestellt",
    text: "Die Gruppe ordnet sich neu: Die Solarparks der Gründer werden in einer Beteiligungsgesellschaft gebündelt, die deutsche ÖKOVOLT konzentriert sich auf Planung und Bau. Die österreichische Schwester errichtet allein in diesem Jahr PV-Anlagen mit 30 MWp.",
  },
  {
    jahr: "2023",
    titel: "Eigene Kraftwerksgesellschaften",
    text: "Mit der GFL – PV-Kraftwerk GmbH entsteht eine hundertprozentige Tochter für den Betrieb von PV-Kraftwerken. Später folgt die HIL PV Kraftwerk GmbH als Gemeinschaftsgesellschaft mit der Prime Energy Solutions GmbH.",
  },
  {
    jahr: "Heute",
    titel: "Plattform für den DACH-Raum",
    text: `Rund ${KENNZAHLEN.entwicklungMwProJahr} MWp gehen jedes Jahr neu in die Entwicklung. Mit Projektbörse, Portal und virtuellem Kraftwerk öffnen wir die Projektentwicklung für Flächeneigentümer, Investoren, Unternehmen und Bürger.`,
    hervorgehoben: true,
  },
];

export const WERTE = [
  { icon: "Factory", title: "Betreiber aus Überzeugung", text: "Die Gruppe betreibt eigene Solarparks seit 2012. Wir entwickeln nur, was wir selbst betreiben würden – mit Erfahrung aus über einem Jahrzehnt Ertrag, Wartung und Direktvermarktung." },
  { icon: "Scale", title: "Ehrliche Zahlen", text: "Spannen statt Versprechen: Unsere Rechner zeigen Annahmen und Quellen offen. Keine Renditezusagen, keine geschönten Zeitpläne." },
  { icon: "Hammer", title: "Alles aus einer Gruppe", text: "Entwicklung, eigene Rammtechnik, Bau und Betrieb liegen in einer Unternehmensgruppe. Das verkürzt Wege und hält Verantwortung an einer Stelle." },
  { icon: "Users", title: "Wertschöpfung vor Ort", text: "Pacht für Eigentümer, Einnahmen für Gemeinden, Beteiligung für Bürger und Landwirte: Ein Solarpark soll der Region nützen, in der er steht." },
];

export const PERSONEN = [
  {
    initialen: "AW",
    name: "Andreas Wegscheider",
    rolle: "Geschäftsführer",
    text: "Gründer der ÖKOVOLT Gruppe und Pionier der Photovoltaik im DACH-Raum. Er hat Anlagen geplant und montiert, als Module noch ein Vielfaches kosteten – und mit den ersten eigenen Solarparks ab 2012 den Schritt vom Dach auf die Freifläche gemacht.",
  },
  {
    initialen: "MT",
    name: "Manuel Thaler",
    rolle: "Geschäftsführer",
    text: "Seit mehr als zehn Jahren Teil der ÖKOVOLT-Familie und in der Gruppe für den Vertrieb verantwortlich. Er kennt Netzbetreiber, Förderlandschaft und die Anforderungen von Gewerbekunden aus der täglichen Projektpraxis.",
  },
];
