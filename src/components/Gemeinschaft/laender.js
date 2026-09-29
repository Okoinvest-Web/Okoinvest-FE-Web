// Energiegemeinschaften im DACH-Vergleich – Stand September 2026.
// Vorsichtig formuliert: Details (v. a. AT ab ElWG, DE-Umsetzung durch die
// Netzbetreiber) sind im Fluss. Titel aus GEMEINSCHAFTEN (markt.js).
//
// Quellen: § 42c EnWG (Energy Sharing); energiegemeinschaften.gv.at
// (Klima- und Energiefonds, AT); BFE/Verteilnetzbetreiber (LEG, CH).

import { GEMEINSCHAFTEN } from "@/lib/invest/markt";

/** Zeilen der Vergleichstabelle */
export const KRITERIEN = [
  { id: "modell", label: "Modell" },
  { id: "grundlage", label: "Rechtsgrundlage" },
  { id: "seit", label: "Möglich seit" },
  { id: "raum", label: "Räumliche Grenze" },
  { id: "vorteil", label: "Vorteil beim Netzentgelt" },
  { id: "form", label: "Organisation" },
  { id: "park", label: "Strom aus einem Solarpark" },
];

export const LAENDER = [
  {
    id: "de",
    kurz: "DE",
    name: "Deutschland",
    titel: GEMEINSCHAFTEN.de.titel,
    intro: GEMEINSCHAFTEN.de.text,
    werte: {
      modell: "Energy Sharing",
      grundlage: "§ 42c EnWG",
      seit: "1. Juni 2026; angrenzende Netzgebiete ab 1. Juni 2028",
      raum: "Bilanzierungsgebiet eines Verteilnetzbetreibers, später auch angrenzende Gebiete derselben Regelzone",
      vorteil: "Nach aktuellem Stand keiner – Netzentgelte und Umlagen fallen auf den geteilten Strom an",
      form: "Vereinbarung der Teilnehmenden, z. B. als Genossenschaft oder Verein",
      park: "Möglich, wenn die Anlage den Teilnehmenden zugeordnet ist (z. B. gemeinsames Eigentum)",
    },
    punkte: [
      "Teilen über das öffentliche Netz – mit Erleichterungen bei Lieferantenpflichten für kleinere Anlagen (nach aktuellem Stand)",
      "Viertelstündliche Messung (intelligentes Messsystem) bei allen Teilnehmenden",
      "Reststrom kommt weiter vom eigenen Lieferanten – oder aus dem Reststrom-Pool",
    ],
    grenzen: "Der wirtschaftliche Vorteil entsteht vor allem über den Strompreis zwischen den Teilnehmenden, nicht über Netzentgelte. Einige Netzbetreiber haben angekündigt, die Abwicklung erst nach dem Stichtag technisch umzusetzen.",
    rolle: "Wir planen Anlage und Beteiligungsmodell so, dass Energy Sharing möglich wird – etwa über eine Genossenschaft, der ein Anteil am Park gehört – und koordinieren die Anmeldung beim Netzbetreiber.",
  },
  {
    id: "at",
    kurz: "AT",
    name: "Österreich",
    titel: GEMEINSCHAFTEN.at.titel,
    intro: GEMEINSCHAFTEN.at.text,
    werte: {
      modell: "Erneuerbare-Energie-Gemeinschaft (EEG) lokal/regional, Bürgerenergiegemeinschaft (BEG)",
      grundlage: "EAG / ElWG (ab Oktober 2026 neu gefasst)",
      seit: "2021",
      raum: "EEG: Nahebereich im Netz (lokal Niederspannung, regional Mittelspannung); BEG: österreichweit",
      vorteil: "EEG: reduzierter Arbeitspreis des Netznutzungsentgelts auf geteilten Strom – lokal 57 %, regional 28 %; BEG: keiner",
      form: "Eigene Rechtsperson, z. B. Verein oder Genossenschaft",
      park: "Möglich im Nahebereich; Großunternehmen können nicht Mitglied einer EEG sein",
    },
    punkte: [
      "Mitglieder: Privatpersonen, Gemeinden, KMU und weitere – je nach Gemeinschaftsform",
      "Teilnahme an mehreren Gemeinschaften gleichzeitig möglich",
      "Nach aktuellem Stand zusätzlich Entlastungen bei Abgaben auf den geteilten Strom",
    ],
    grenzen: "Mit dem Elektrizitätswirtschaftsgesetz (ElWG) werden die Regeln ab Oktober 2026 neu geordnet. Bestehende Gemeinschaften laufen weiter; einzelne Details wie Abschläge je Nahebereich waren zuletzt noch offen.",
    rolle: "Wir bringen Strom aus Parks im Nahebereich ein, unterstützen bei Gründung, Statuten und Netzbetreiber-Anmeldung und können – geplant – die Abrechnung übernehmen.",
  },
  {
    id: "ch",
    kurz: "CH",
    name: "Schweiz",
    titel: GEMEINSCHAFTEN.ch.titel,
    intro: GEMEINSCHAFTEN.ch.text,
    werte: {
      modell: "ZEV, virtueller ZEV (vZEV), lokale Elektrizitätsgemeinschaft (LEG)",
      grundlage: "Energiegesetz / Stromversorgungsgesetz (Mantelerlass)",
      seit: "ZEV 2018, vZEV 2025, LEG 1. Januar 2026",
      raum: "ZEV/vZEV: gleiches oder angrenzende Grundstücke; LEG: gleiche Gemeinde und Netzebene",
      vorteil: "LEG: Abschlag auf das Netznutzungsentgelt – 40 % auf derselben Netzebene, 20 % über mehrere Ebenen",
      form: "ZEV: Vertrag unter Eigentümern; LEG: Vereinbarung der Teilnehmenden",
      park: "Nur innerhalb der Gemeinde (LEG); für ZEV kaum relevant",
    },
    punkte: [
      "ZEV und vZEV: Strom wird hinter dem Netzanschlusspunkt geteilt, ohne öffentliches Netz",
      "LEG: Teilen über das Verteilnetz innerhalb einer Gemeinde",
      "Freier Strommarktzugang erst ab 100 MWh Jahresverbrauch",
    ],
    grenzen: "Für große Freiflächenanlagen ist die LEG an Gemeindegrenzen gebunden. Der Nutzen hängt stark vom Tarif des lokalen Netzbetreibers ab.",
    rolle: "Wir prüfen, ob eine Anlage in der Gemeinde eine LEG sinnvoll versorgen kann, und unterstützen Gemeinden und Eigentümer bei Aufbau und Betrieb.",
  },
];
