// Inhalte der Seite /unternehmen.
// QUELLEN: Registerangaben aus src/data/site.js (Firmenbuch AT); Gruppen-
// geschichte aus der Ökovolt-DE-Website (src/data/unternehmen.js, dort mit
// Register- und Jahresabschlussangaben belegt). Keine eigenen Kennzahlen
// über ÖkoInvest außer der Entwicklungs-Pipeline (Vorgabe Geschäftsführung).

import { GESELLSCHAFT, KENNZAHLEN } from "@/data/site";
import { datumText } from "@/lib/sprache/format";

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
    text: "Gründer der ÖKOVOLT Gruppe. Er hat Anlagen geplant und montiert, als Module noch ein Vielfaches kosteten – und mit den ersten eigenen Solarparks ab 2012 den Schritt vom Dach auf die Freifläche gemacht.",
  },
  {
    initialen: "MT",
    name: "Manuel Thaler",
    rolle: "Geschäftsführer",
    text: "Seit mehr als zehn Jahren Teil der ÖKOVOLT-Familie und in der Gruppe für den Vertrieb verantwortlich. Er kennt Netzbetreiber, Förderlandschaft und die Anforderungen von Gewerbekunden aus der täglichen Projektpraxis.",
  },
];

/* ------------------------------------------------------------------ */
/* Englisch (Sprachmodell): gleiche Reihenfolge, nur Texte              */
/* ------------------------------------------------------------------ */

export const MEILENSTEINE_EN = [
  { jahr: "2010", titel: "The beginning in Türkheim", text: "Andreas Wegscheider and Susanne Messmer found ÖKOVOLT GmbH, which is still based in Türkheim in the Unterallgäu district (Bavaria) today – with its own installation company. From the outset, planning, construction and commissioning come from a single source." },
  { jahr: "2012", titel: "From the roof to the field", text: "The founders build their first solar parks – and operate them themselves, each through its own operating company, for example in Artern and Tilleda. Deutsche Solar & Rammtechnik GmbH is set up for the foundations. In the same year, the Austrian sister company is founded." },
  { jahr: "2013", titel: "A solar park on the doorstep", text: "The solar park in Irsingen, a district of Türkheim, creates a park right next to the company headquarters." },
  { jahr: "2020", titel: "ÖkoInvest GmbH is founded", text: `On ${datumText(GESELLSCHAFT.eingetragen, "en")}, ${GESELLSCHAFT.name} in ${GESELLSCHAFT.ort} is entered in the Austrian commercial register (Firmenbuch) – as the group's project company for ground-mounted PV, agrivoltaics, contracting and power purchase agreements.` },
  { jahr: "2021", titel: "A new structure", text: "The group reorganises: the founders' solar parks are pooled in a holding company, and the German ÖKOVOLT focuses on planning and construction. In this year alone, the Austrian sister company installs PV systems with 30 MWp." },
  { jahr: "2023", titel: "Own power plant companies", text: "GFL – PV-Kraftwerk GmbH is founded as a wholly owned subsidiary for operating PV power plants. HIL PV Kraftwerk GmbH later follows as a joint company with Prime Energy Solutions GmbH." },
  { jahr: "Today", titel: "A platform for the DACH region", text: `Around ${KENNZAHLEN.entwicklungMwProJahr} MWp enters development every year. With the project exchange, portal and virtual power plant, we open up project development to landowners, investors, companies and citizens.` },
];

export const WERTE_EN = [
  { title: "Operators by conviction", text: "The group has been operating its own solar parks since 2012. We only develop what we would operate ourselves – with experience from more than a decade of yield, maintenance and direct marketing." },
  { title: "Honest figures", text: "Ranges instead of promises: our calculators show assumptions and sources openly. No promised returns, no embellished schedules." },
  { title: "Everything from one group", text: "Development, our own pile-driving equipment, construction and operation are all within one group of companies. That shortens the routes and keeps responsibility in one place." },
  { title: "Local value creation", text: "Lease income for owners, revenue for municipalities, participation for citizens and farmers: a solar park should benefit the region it stands in." },
];

export const PERSONEN_EN = [
  { rolle: "Managing Director", text: "Founder of the ÖKOVOLT Group. He planned and installed systems when modules still cost many times what they do today – and, with the first in-house solar parks from 2012, took the step from the roof to open land." },
  { rolle: "Managing Director", text: "Part of the ÖKOVOLT family for more than ten years and responsible for sales within the group. He knows grid operators, the subsidy landscape and the requirements of commercial customers from day-to-day project work." },
];
