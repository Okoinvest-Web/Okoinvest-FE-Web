// Energiegemeinschaften im DACH-Vergleich – Stand September 2026 (AT: Oktober 2026, ElWG).
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
    // Stand ElWG (Koordinationsstelle Energiegemeinschaften, FAQ zum ElWG, abgerufen 04.10.2026);
    // Netzentgelt-Sätze bis 31.12.2026: SNE-V 2018 § 5 Abs. 1a (RIS). Der Text in markt.js bleibt
    // unverändert (Charakterisierungs-Snapshot), die Länderkarte nutzt diese Fassung.
    intro:
      "Lokale und regionale EEG erhalten bis Ende 2026 reduzierte Netzentgelte; BEG dürfen österreichweit tätig sein. Seit 1. Oktober 2026 regelt das ElWG die gemeinsame Energienutzung neu – mit zusätzlichen Modellen. Teilnahme an mehreren Gemeinschaften ist möglich.",
    werte: {
      modell: "Erneuerbare-Energie-Gemeinschaft (EEG) lokal/regional, Bürgerenergiegemeinschaft (BEG); nach ElWG zusätzlich gemeinschaftliche Erzeugungsanlage (GEA), Peer-to-Peer-Vertrag (P2P) und Eigenversorgungsanlage (EVA)",
      grundlage: "ElWG (Regeln zur gemeinsamen Energienutzung seit 1. Oktober 2026)",
      seit: "2021; neue Modelle nach ElWG ab 5. Oktober 2026",
      raum: "EEG: Nahebereich im Netz (lokal Niederspannung, regional Mittelspannung); BEG: österreichweit. Neue Modelle zunächst nur mit Zählpunkten desselben Netzbetreibers, österreichweit voraussichtlich ab April 2027",
      vorteil:
        "Bestehende lokale und regionale EEG bis Ende 2026: reduzierter Arbeitspreis des Netznutzungsentgelts auf geteilten Strom – lokal 57 %, regional 28 % (Netzebene 6/7) bzw. 64 % (Netzebene 4/5). Neue Modelle: Oktober bis Dezember 2026 keine Reduktion. Ab 2027 Reduktionen nach neuer Systemnutzungsentgelte-Verordnung, auch für lokale und regionale BEG, P2P und EVA – Höhe noch nicht kundgemacht",
      form: "Eigene Rechtsperson, z. B. Verein oder Genossenschaft",
      park: "Möglich im Nahebereich; Großunternehmen können nicht Mitglied einer EEG sein",
    },
    punkte: [
      "Mitglieder: Privatpersonen, Gemeinden, KMU und weitere – je nach Gemeinschaftsform",
      "Teilnahme an mehreren Gemeinschaften gleichzeitig möglich",
      "Bestehende Gemeinschaften laufen unter dem ElWG weiter",
    ],
    grenzen:
      "Seit 1. Oktober 2026 gelten die Regeln des Elektrizitätswirtschaftsgesetzes (ElWG). Neue Modelle erhalten bis Ende 2026 keine reduzierten Netzentgelte; die Sätze ab 2027 legt die neue Systemnutzungsentgelte-Verordnung fest, die noch nicht kundgemacht ist. Bis dahin rechnen wir nur mit Szenarien.",
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

/* ------------------------------------------------------------------ */
/* Sprachmodell: englische Fassung (gleiche ids, gleiche Reihenfolge)  */
/* Landesbegriffe bleiben im Original und werden beim ersten Auftreten */
/* erklärt (z. B. EEG in Österreich = Energiegemeinschaft, nicht das   */
/* deutsche EEG-Gesetz).                                               */
/* ------------------------------------------------------------------ */

export const KRITERIEN_EN = [
  { id: "modell", label: "Model" },
  { id: "grundlage", label: "Legal basis" },
  { id: "seit", label: "Possible since" },
  { id: "raum", label: "Geographical limit" },
  { id: "vorteil", label: "Grid fee advantage" },
  { id: "form", label: "Organisation" },
  { id: "park", label: "Power from a solar park" },
];

export const LAENDER_EN = [
  {
    id: "de",
    kurz: "DE",
    name: "Germany",
    inName: "Germany",
    titel: "Energy sharing (§ 42c EnWG, German Energy Industry Act)",
    intro: "Joint use of power from installations in the same region via the public grid – initially within the grid area of one distribution system operator, later also in neighbouring areas.",
    werte: {
      modell: "Energy sharing",
      grundlage: "§ 42c EnWG (German Energy Industry Act)",
      seit: "1 June 2026; neighbouring grid areas from 1 June 2028",
      raum: "Balancing area of one distribution system operator, later also neighbouring areas within the same control area",
      vorteil: "None at present – grid fees and levies apply to the shared power",
      form: "Agreement among the participants, e.g. as a cooperative or association",
      park: "Possible if the installation is allocated to the participants (e.g. joint ownership)",
    },
    punkte: [
      "Sharing via the public grid – with simplified supplier obligations for smaller installations (as things stand)",
      "Quarter-hourly metering (smart metering system) for all participants",
      "Residual power continues to come from your own supplier – or from the residual power pool",
    ],
    grenzen: "The economic advantage arises mainly from the power price between participants, not from grid fees. Some grid operators have announced that they will only implement the processing technically after the start date.",
    rolle: "We plan the installation and participation model so that energy sharing becomes possible – for example via a cooperative that owns a share of the park – and coordinate registration with the grid operator.",
  },
  {
    id: "at",
    kurz: "AT",
    name: "Austria",
    inName: "Austria",
    titel: "Renewable energy community (EEG) and citizens’ energy community (BEG)",
    intro:
      "Local and regional EEGs (Erneuerbare-Energie-Gemeinschaften, renewable energy communities – not to be confused with Germany’s EEG law) receive reduced grid fees until the end of 2026; BEGs (Bürgerenergiegemeinschaften, citizens’ energy communities) may operate throughout Austria. Since 1 October 2026, the ElWG (Elektrizitätswirtschaftsgesetz, Austria’s Electricity Industry Act) has reorganised joint energy use – with additional models. Participation in several communities is possible.",
    werte: {
      modell: "Renewable energy community (EEG), local/regional; citizens’ energy community (BEG); under the ElWG also joint generation installation (GEA), peer-to-peer contract (P2P) and self-supply installation (EVA)",
      grundlage: "ElWG (Electricity Industry Act; rules on joint energy use since 1 October 2026)",
      seit: "2021; new models under the ElWG from 5 October 2026",
      raum: "EEG: proximity area in the grid (local: low voltage, regional: medium voltage); BEG: throughout Austria. New models initially only with metering points of the same grid operator, throughout Austria probably from April 2027",
      vorteil:
        "Existing local and regional EEGs until the end of 2026: reduced energy charge of the grid usage fee on shared power – local 57 %, regional 28 % (grid levels 6/7) or 64 % (grid levels 4/5). New models: no reduction from October to December 2026. From 2027, reductions under the new system usage fee ordinance, also for local and regional BEGs, P2P and EVA – amount not yet published",
      form: "Separate legal entity, e.g. association or cooperative",
      park: "Possible within the proximity area; large companies cannot be members of an EEG",
    },
    punkte: [
      "Members: private individuals, municipalities, SMEs and others – depending on the type of community",
      "Participation in several communities at the same time is possible",
      "Existing communities continue under the ElWG",
    ],
    grenzen:
      "Since 1 October 2026, the rules of the Electricity Industry Act (ElWG) apply. New models receive no reduced grid fees until the end of 2026; the rates from 2027 will be set by the new system usage fee ordinance, which has not yet been published. Until then, we only calculate with scenarios.",
    rolle: "We contribute power from parks in the proximity area, support founding, articles of association and registration with the grid operator, and – as planned – can take over billing.",
  },
  {
    id: "ch",
    kurz: "CH",
    name: "Switzerland",
    inName: "Switzerland",
    titel: "ZEV, vZEV and local electricity community (LEG)",
    intro: "Since 2026, consumers within one municipality can share power via the distribution grid (LEG, lokale Elektrizitätsgemeinschaft) – with a reduced grid usage fee.",
    werte: {
      modell: "ZEV (Zusammenschluss zum Eigenverbrauch, self-consumption group), virtual ZEV (vZEV), local electricity community (LEG)",
      grundlage: "Energy Act / Electricity Supply Act (Mantelerlass, the Swiss omnibus energy act)",
      seit: "ZEV 2018, vZEV 2025, LEG 1 January 2026",
      raum: "ZEV/vZEV: same or adjacent plots; LEG: same municipality and grid level",
      vorteil: "LEG: discount on the grid usage fee – 40 % on the same grid level, 20 % across several levels",
      form: "ZEV: contract among owners; LEG: agreement among the participants",
      park: "Only within the municipality (LEG); hardly relevant for ZEV",
    },
    punkte: [
      "ZEV and vZEV: power is shared behind the grid connection point, without the public grid",
      "LEG: sharing via the distribution grid within one municipality",
      "Free access to the electricity market only from 100 MWh annual consumption",
    ],
    grenzen: "For large ground-mounted installations, the LEG is bound to municipal boundaries. The benefit depends heavily on the tariff of the local grid operator.",
    rolle: "We check whether an installation in the municipality can sensibly supply an LEG, and support municipalities and owners in setting it up and running it.",
  },
];

/** Daten je Sprache: { laender, kriterien } */
export const laenderFuer = (sprache) => (sprache === "en" ? { laender: LAENDER_EN, kriterien: KRITERIEN_EN } : { laender: LAENDER, kriterien: KRITERIEN });
