// src/lib/plattform/finanzierung/foerder.js
//
// Förder-Check je Land und Anlagentyp – HINWEISE mit Quelle, keine Zusagen. Stand September 2026 (Recherche:
// docs/FINANZIERUNG.md). Konditionen ändern sich laufend (Fördercalls, Preisklassen, Auktionsrunden) – vor jeder
// Entscheidung bei der Förderstelle bzw. Hausbank prüfen. Client- und serverseitig nutzbar.

import { FINANZIERUNG } from "../../invest/markt.js";

export const FOERDER_ARTEN = { kredit: "Förderkredit", zuschuss: "Investitionszuschuss", marktpraemie: "Marktprämie / Vergütung", garantie: "Garantie / Haftung", steuer: "Steuerliche Förderung" };
export const PASSUNG = { passt: { label: "Voraussichtlich einschlägig", ton: "ok" }, pruefen: { label: "Im Einzelfall prüfen", ton: "warn" }, nicht: { label: "In der Regel nicht einschlägig", ton: "neutral" } };
export const STAND_FOERDER = "September 2026";

const PV = ["freiflaeche", "agri", "dach", "carport"];
const ALLE = [...PV, "speicher"];

/**
 * Programme. kwp: [min, max] (null = offen); typen: Anlagentypen; kombinierbar: Hinweis; rechenwert: Übernahme ins Cockpit.
 */
export const FOERDERPROGRAMME = [
  // ---------------------------------------------------------------- Deutschland
  {
    id: "de_kfw270", land: "DE", art: "kredit", name: "KfW Erneuerbare Energien – Standard (270)", traeger: "KfW über Hausbank / Finanzierungspartner", typen: ALLE, kwp: [null, null],
    kurz: "Bis 100 % der Investitionskosten, bis 150 Mio. € je Vorhaben, Laufzeit bis 30 Jahre, bis 5 tilgungsfreie Anlaufjahre, danach gleich hohe vierteljährliche Raten, Zinsbindung bis 20 Jahre.",
    hinweise: ["Risikogerechter Zins: Preisklasse hängt von Bonität und Sicherheiten ab – die Hausbank trägt das Kreditrisiko und entscheidet.", "Antrag vor Vorhabenbeginn über die Hausbank.", "Mit EEG-Vergütung/Marktprämie kombinierbar."],
    quelle: { titel: "KfW – Erneuerbare Energien Standard (270)", url: "https://www.kfw.de/270" },
    rechenwert: { variante: "foerder", ...FINANZIERUNG.foerderkredit.DE },
  },
  {
    id: "de_kfw_premium", land: "DE", art: "kredit", name: "KfW-Premium-Varianten (z. B. 271/281)", traeger: "KfW", typen: ALLE, kwp: [null, null], immerPruefen: true,
    kurz: "Premium-Programme mit Tilgungszuschuss richten sich vor allem an Wärmeanwendungen (z. B. große Wärmespeicher, Wärmenetze).",
    hinweise: ["Für PV-Parks und Batteriespeicher zur Stromversorgung in der Regel nicht einschlägig – Stand der Merkblätter prüfen."],
    quelle: { titel: "KfW – Förderprodukte Energie & Umwelt", url: "https://www.kfw.de/inlandsfoerderung/Unternehmen/Energie-Umwelt/" },
    passung: "nicht",
  },
  {
    id: "de_eeg", land: "DE", art: "marktpraemie", name: "EEG 2023 – Ausschreibung bzw. gesetzliche Marktprämie", traeger: "Bundesnetzagentur / Netzbetreiber", typen: PV, kwp: [null, null],
    kurz: "Ab 1 MW: Ausschreibung (Freifläche/Agri-PV erstes Segment, Gebäude zweites Segment), Zuschlag 20 Jahre als gleitende Marktprämie. Darunter gesetzliche Vergütung, Direktvermarktung ab 100 kW.",
    hinweise: ["Kein Rechtsanspruch – Zuschlag im Wettbewerb, Gebotstermine beachten.", "Kommunalbeteiligung nach § 6 EEG (0,2 ct/kWh) möglich.", "Negative Preise: keine Marktprämie in Zeiträumen negativer Preise (neuere Anlagen) – Erlösrisiko einplanen."],
    quelle: { titel: "Bundesnetzagentur – Ausschreibungen Solar", url: "https://www.bundesnetzagentur.de/DE/Fachthemen/ElektrizitaetundGas/Ausschreibungen/Solaranlagen1/start.html" },
  },
  {
    id: "de_land", land: "DE", art: "kredit", name: "Landesförderinstitute (z. B. LfA Bayern, L-Bank, NRW.BANK)", traeger: "Förderbank des Bundeslands", typen: ALLE, kwp: [null, null], immerPruefen: true,
    kurz: "Eigene Energie-/Investitionskredite oder Haftungsfreistellungen, teils als Durchleitung von KfW-Mitteln.",
    hinweise: ["Konditionen je Bundesland verschieden – über die Hausbank anfragen.", "Kumulierung mit KfW-Mitteln nur nach den Programmregeln."],
    quelle: { titel: "Förderdatenbank des Bundes", url: "https://www.foerderdatenbank.de" },
  },
  {
    id: "de_afa", land: "DE", art: "steuer", name: "Degressive AfA (Investitionssofortprogramm 2025)", traeger: "Finanzamt", typen: ALLE, kwp: [null, null], immerPruefen: true,
    kurz: "30 % degressiv (max. 3 × linear) für bewegliche Wirtschaftsgüter, Anschaffung 1.7.2025–31.12.2027. Körperschaftsteuer sinkt ab 2028 schrittweise.",
    hinweise: ["Mit Steuerberatung prüfen: Abgrenzung beweglich/unbeweglich, AfA-Dauer PV 20 Jahre (AfA-Tabelle).", "§ 7g EStG (Investitionsabzugsbetrag/Sonder-AfA) nur für kleinere Betriebe (Gewinngrenze)."],
    quelle: { titel: "Bundesministerium der Finanzen – Investitionssofortprogramm", url: "https://www.bundesfinanzministerium.de" },
  },
  // ---------------------------------------------------------------- Österreich
  {
    id: "at_eag_iz", land: "AT", art: "zuschuss", name: "EAG-Investitionszuschuss Photovoltaik & Speicher", traeger: "OeMAG (EAG-Förderabwicklungsstelle)", typen: [...PV, "speicher"], kwp: [null, 1000],
    kurz: "Fördercalls mehrmals im Jahr, Kategorien A–D bis 1.000 kWp (2026 Kategorie D: bis 120 €/kWp); Zuschläge u. a. für Agri-PV (ab 2 m lichter Höhe), Parkplatzüberdachung, europäische Komponenten, Speicher.",
    hinweise: ["Reihung nach Einlangen bzw. Fördersatz – Budget je Call begrenzt, keine Zusage.", "Nicht mit der Marktprämie für dieselbe Anlage kombinierbar."],
    quelle: { titel: "EAG-Förderabwicklungsstelle (OeMAG)", url: "https://www.eag-abwicklungsstelle.at" },
  },
  {
    id: "at_eag_mp", land: "AT", art: "marktpraemie", name: "EAG-Marktprämie (Ausschreibung PV)", traeger: "OeMAG (EAG-Förderabwicklungsstelle)", typen: PV, kwp: [null, null],
    kurz: "Gleitende Marktprämie über Ausschreibung (anzulegender Wert je Gebot), Laufzeit 20 Jahre.",
    hinweise: ["Für Freiflächenanlagen gelten je nach Flächenkategorie Abschläge – ausgenommen u. a. Agri-PV und vorbelastete Flächen; Details im EAG prüfen.", "Gebotstermine und Höchstwerte je Jahr per Verordnung."],
    quelle: { titel: "EAG-Förderabwicklungsstelle (OeMAG)", url: "https://www.eag-abwicklungsstelle.at" },
  },
  {
    id: "at_aws", land: "AT", art: "garantie", name: "aws – Kredite und Garantien für Investitionen", traeger: "Austria Wirtschaftsservice (aws)", typen: ALLE, kwp: [null, null], immerPruefen: true,
    kurz: "Geförderte Investitionskredite (z. B. erp-Kredit) und Garantien, die Bankkredite besichern – je nach Programm und Unternehmensgröße.",
    hinweise: ["Einschlägigkeit für reine Energieerzeugungsgesellschaften (SPV) im Einzelfall klären.", "Antrag meist über die Hausbank vor Projektbeginn."],
    quelle: { titel: "Austria Wirtschaftsservice", url: "https://www.aws.at" },
  },
  {
    id: "at_oekb", land: "AT", art: "kredit", name: "OeKB – Export- und Investitionsfinanzierung", traeger: "Oesterreichische Kontrollbank", typen: ALLE, kwp: [null, null], passung: "nicht",
    kurz: "Schwerpunkt Exportfinanzierung und Auslandsinvestitionen österreichischer Unternehmen.",
    hinweise: ["Für Solarparks im Inland in der Regel nicht einschlägig; bei Projekten im Ausland (z. B. DE, CH) mit österreichischer Wertschöpfung prüfen."],
    quelle: { titel: "OeKB – Export Services", url: "https://www.oekb.at" },
  },
  {
    id: "at_ufi", land: "AT", art: "zuschuss", name: "Umweltförderung im Inland (UFI)", traeger: "KPC im Auftrag des Klimaschutzministeriums", typen: ALLE, kwp: [null, null], immerPruefen: true,
    kurz: "Betriebliche Umweltförderung – Photovoltaik wird vorrangig über das EAG gefördert; UFI z. B. für bestimmte Speicher- oder Effizienzmaßnahmen.",
    hinweise: ["Keine Doppelförderung mit EAG-Mitteln – Förderschiene vorab klären."],
    quelle: { titel: "Umweltförderung (KPC)", url: "https://www.umweltfoerderung.at" },
  },
  {
    id: "at_ifb", land: "AT", art: "steuer", name: "Investitionsfreibetrag (§ 11 EStG)", traeger: "Finanzamt", typen: ALLE, kwp: [null, null],
    kurz: "Zusätzlicher Abzug 10 % bzw. 15 % (ökologisch) der Anschaffungskosten; befristet für Anschaffungen 11/2025–12/2026: 20 % bzw. 22 %, Bemessung max. 1 Mio. € je Wirtschaftsjahr.",
    hinweise: ["Mit Steuerberatung prüfen: Zuordnung „ökologisch“, Behaltefrist, Kürzung der Bemessung um Investitionszuschüsse."],
    quelle: { titel: "WKO – Investitionsfreibetrag", url: "https://www.wko.at/steuern/investitionsfreibetrag" },
  },
  // ---------------------------------------------------------------- Schweiz
  {
    id: "ch_greiv", land: "CH", art: "zuschuss", name: "Einmalvergütung für grosse PV-Anlagen (GREIV)", traeger: "Pronovo AG im Auftrag des Bundes", typen: PV, kwp: [100, 50000],
    kurz: "Einmalige Investitionshilfe ab 100 kW, höchstens rund 30 % der Investitionskosten von Referenzanlagen (KLEIV unter 100 kW).",
    hinweise: ["Gesuch bei Pronovo, Wartezeiten beachten – keine Zusage.", "Eigenverbrauch möglich; kantonale Programme zusätzlich prüfen."],
    quelle: { titel: "Pronovo – Einmalvergütung Photovoltaik", url: "https://pronovo.ch/de/foerderung/photovoltaik/" },
  },
  {
    id: "ch_heiv", land: "CH", art: "zuschuss", name: "Hohe Einmalvergütung (HEIV) über Auktion", traeger: "Pronovo AG", typen: PV, kwp: [150, null],
    kurz: "Für Anlagen ab 150 kW ohne Eigenverbrauch (Volleinspeisung): bis 60 % der Investitionskosten von Referenzanlagen, Gebote in CHF je kW, mehrere Auktionsrunden pro Jahr.",
    hinweise: ["Zuschlag im Wettbewerb, Realisierungsfristen und Pönalen beachten."],
    quelle: { titel: "Pronovo – PV-Auktionen", url: "https://pronovo.ch/de/foerderung/photovoltaik/auktionen/" },
  },
  {
    id: "ch_solarexpress", land: "CH", art: "zuschuss", name: "Solarexpress – alpine Grossanlagen", traeger: "Bund (BFE) / Pronovo", typen: ["freiflaeche"], kwp: [null, null], immerPruefen: true,
    kurz: "Befristete Förderung alpiner Grossanlagen mit hohem Winterstromanteil (Investitionsbeitrag bis 60 %), Fristen für Teil-/Vollinbetriebnahme.",
    hinweise: ["Nur für Anlagen in alpinen Lagen mit Mindestproduktion – für Mittelland-Projekte nicht einschlägig."],
    quelle: { titel: "Bundesamt für Energie – Solarexpress", url: "https://www.bfe.admin.ch" },
  },
  {
    id: "ch_kanton", land: "CH", art: "zuschuss", name: "Kantonale und kommunale Programme", traeger: "Kantone / Gemeinden / EVU", typen: ALLE, kwp: [null, null], immerPruefen: true,
    kurz: "Ergänzende Beiträge, z. B. für Speicher oder Fassadenanlagen, je Kanton und Gemeinde sehr unterschiedlich.",
    hinweise: ["Übersicht auf energiefranken.ch; Abschreibung nach kantonaler Praxis mit der Treuhand klären."],
    quelle: { titel: "Energiefranken – Förderprogramme", url: "https://www.energiefranken.ch" },
  },
];

/**
 * Förder-Check: Programme des Landes mit Einschätzung je Anlagentyp und Größe.
 * @returns [{...programm, passung, grund}] – sortiert: passt, prüfen, nicht einschlägig
 */
export function foerderCheck({ land = "DE", typ = "freiflaeche", kwp = 0, eigenverbrauch = false } = {}) {
  const reihenfolge = { passt: 0, pruefen: 1, nicht: 2 };
  return FOERDERPROGRAMME.filter((p) => p.land === land)
    .map((p) => {
      let passung = p.passung || (p.immerPruefen ? "pruefen" : "passt");
      let grund = "";
      if (!p.typen.includes(typ)) {
        passung = "nicht";
        grund = "Anlagentyp nicht im Programm.";
      } else if (p.kwp[0] != null && kwp < p.kwp[0]) {
        passung = "nicht";
        grund = `Erst ab ${p.kwp[0].toLocaleString("de-DE")} kWp.`;
      } else if (p.kwp[1] != null && kwp > p.kwp[1]) {
        passung = "nicht";
        grund = `Nur bis ${p.kwp[1].toLocaleString("de-DE")} kWp.`;
      } else if (p.id === "ch_heiv" && eigenverbrauch) {
        passung = "nicht";
        grund = "Nur ohne Eigenverbrauch (Volleinspeisung).";
      } else if (p.id === "de_eeg" && kwp >= 1000) grund = "Ab 1 MW Teilnahme an der Ausschreibung.";
      return { ...p, passung, grund };
    })
    .sort((a, b) => reihenfolge[a.passung] - reihenfolge[b.passung]);
}

export const FOERDER_HINWEIS = "Förder-Check nach Recherchestand " + STAND_FOERDER + " – keine Zusage und keine Beratung. Programme, Budgets und Konditionen ändern sich; maßgeblich sind die Richtlinien der Förderstelle.";
