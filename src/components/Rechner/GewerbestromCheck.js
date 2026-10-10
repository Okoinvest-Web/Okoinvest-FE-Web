"use client";

// src/components/Rechner/GewerbestromCheck.js – Rechnungs-Check Gewerbestrom (Welle 3, Paket B5, Preisradar Schritt 1)
//
// Eingaben aus der eigenen Rechnung → Zerlegung in amtliche Bestandteile, Netzentgelt (Ihre Angabe) und Energieanteil,
// Vergleich mit Börsenwert (SMARD, CC BY 4.0) plus üblichem Aufschlag. Drei sichtbare Qualitätsstufen: amtlich,
// berechnet, Schätzung (dazu „Ihre Angabe“ für Werte aus der Rechnung). Ehrliches Urteil, auch „marktgerecht“.
// Lastgang: Datei wird NUR im Browser gelesen (FileReader) – es wird nichts hochgeladen. An den Bericht gehen nur
// Jahresverbrauch, Spitzenleistung und der Profilfaktor.
// Rechenlogik: src/lib/rechner/gewerbestrom.js (Werte aus dem Faktenregister). Nur Deutschland.

import { useId, useMemo, useRef, useState } from "react";
import { BadgeCheck, Calculator, CalendarClock, Factory, FileSpreadsheet, Gauge, Info, Landmark, Lock, MapPin, Receipt, Scale, Trash2, Upload, Zap } from "lucide-react";
import Button from "@/components/ui/Button";
import { cn } from "@/components/ui/cn";
import { Auswahl, Belege, Gruppe, Hauptzahl, Kennzahl, Schalter, Zahl } from "./bausteine";
import { useTeilbarerZustand } from "./kontext";
import { ErgebnisKopf, Hinweis, MobilKurz, RechnerRahmen } from "./InvestTeile";
import { DiagrammKarte, ZahlFeld } from "./ToolTeile";
import PreisBalken from "@/components/Reststrom/PreisBalken";
import BerichtAnfordern from "@/components/Bericht/BerichtAnfordern";
import { pfad } from "@/lib/land";
import { useTexte } from "@/components/Sprache/SpracheKontext";
import { useFormate } from "@/components/Sprache/useFormate";
import { BUNDESLAENDER, KAV_GRUPPEN, LASTPROFILE, NETZ_MODI, PREISARTEN, SPANNUNGEN, STANDARD, gewerbestromCheck, lastgangAuswerten, lastgangLesen, preisradar } from "@/lib/rechner/gewerbestrom";

const MAX_DATEI = 15 * 1024 * 1024;
const MONATE_DE = ["Jan", "Feb", "Mär", "Apr", "Mai", "Jun", "Jul", "Aug", "Sep", "Okt", "Nov", "Dez"];
const MONATE_EN = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

const TEXTE = {
  de: {
    intro: "Übertragen Sie die Werte aus Ihrer letzten Jahresrechnung – alle Beträge netto, ohne Umsatzsteuer.",
    beispiel: "Vorbelegt ist ein Beispielbetrieb. Ersetzen Sie die Werte durch Ihre eigenen.",
    g1: "1 · Verbrauch",
    verbrauch: "Jahresverbrauch",
    leistung: "Höchste Leistung (Spitze)",
    leistungHinweis: "Steht bei Leistungsmessung (RLM) auf der Rechnung. 0 = unbekannt.",
    spannung: "Anschluss",
    lastprofil: "Wann verbrauchen Sie Strom?",
    lastgangTitel: "Lastgang einlesen (optional)",
    lastgangText: "CSV- oder Textdatei mit Zeitstempel und Viertelstunden- oder Stundenwerten, z. B. aus dem Portal Ihres Netzbetreibers.",
    lokal: "Die Datei wird nur in Ihrem Browser ausgewertet und nicht hochgeladen oder gespeichert.",
    datei: "Datei wählen",
    einheit: "Werte in der Datei",
    einheiten: [
      { id: "auto", label: "Automatisch" },
      { id: "kwh", label: "kWh je Intervall" },
      { id: "kw", label: "kW (Leistung)" },
    ],
    lastgangOk: (a, f) => `${f.fmt(a.tage)} Tage · ${a.intervallMin}-Minuten-Werte · ${f.fmt(a.kwh)} kWh${a.hochgerechnet ? ` → hochgerechnet ${f.fmt(a.jahresKwh)} kWh/Jahr` : ""} · Spitze ${f.fmt(a.spitzeKw, 1)} kW · Profilfaktor ${f.fmt(a.profilFaktor, 3)}`,
    lastgangFehler: {
      zu_gross: "Die Datei ist zu groß (höchstens 15 MB bzw. 200.000 Zeilen).",
      leer: "Die Datei ist leer.",
      zu_wenig: "In der Datei wurden zu wenige Zeitstempel mit Werten erkannt (mindestens eine Woche).",
      intervall: "Das Intervall wurde nicht erkannt – erwartet werden 15-, 30- oder 60-Minuten-Werte.",
      lesen: "Die Datei konnte nicht gelesen werden.",
    },
    entfernen: "Lastgang entfernen",
    g2: "2 · Ihre Rechnung",
    preisArt: "Was enthält Ihr Arbeitspreis?",
    arbeitspreis: "Arbeitspreis",
    grundpreis: "Grundpreis des Lieferanten",
    proMonat: "€/Monat",
    g3: "3 · Netzentgelt",
    netzModus: "Netzentgelt laut Rechnung",
    netzCt: "Netz-Arbeitspreis",
    netzFix: "Leistungspreis, Netz-Grundpreis und Messstellenbetrieb",
    proJahr: "€/Jahr",
    netzHinweis: "Netzbetreiber müssen das Netzentgelt auf der Rechnung ausweisen (§ 40 EnWG). Netzentgelte je Netzbetreiber ergänzen wir im nächsten Schritt.",
    netzFixHinweis: "Nur Beträge, die als eigene Posten in €/Jahr bzw. €/kW auf der Rechnung stehen – nicht, was schon im Grundpreis des Lieferanten steckt.",
    netzUnbekannt: "Ohne Netzentgelt lässt sich ein Gesamtpreis nicht in Energie und Netz trennen – das Urteil bleibt dann offen.",
    g4: "4 · Ihr Betrieb",
    bundesland: "Bundesland",
    bundeslandLeer: "Bitte wählen",
    kav: "Konzessionsabgabe",
    kavHinweis: (g) =>
      ({
        gewaehlt: "wie gewählt",
        mittelspannung: "Mittelspannung: Sondervertragskunde",
        verbrauch: "bis 30.000 kWh im Jahr: Tarifkunde (§ 2 Abs. 7 KAV)",
        leistung: "nach Leistung über/unter 30 kW (§ 2 Abs. 7 KAV)",
        annahme: "Leistung unbekannt – angenommen: Sondervertrag",
      })[g],
    gemeinde: "Einwohner Ihrer Gemeinde",
    gemeinden: [
      { id: "bis25", label: "bis 25.000" },
      { id: "bis100", label: "bis 100.000" },
      { id: "bis500", label: "bis 500.000" },
      { id: "ueber500", label: "über 500.000" },
    ],
    produzierend: "Produzierendes Gewerbe oder Land- und Forstwirtschaft",
    produzierendText: "Stromsteuer-Entlastung nach § 9b StromStG möglich",
    gruppeC: "Stromkosten über 4 % des Umsatzes",
    gruppeCText: "Geringerer Aufschlag für besondere Netznutzung über 1 GWh",
    // Ergebnis
    titel: "Ihr Strompreis zerlegt",
    plakette: "Stand Umlagen 2026",
    energieanteil: "Ihr Energieanteil",
    restanteil: "Energie und Netz zusammen",
    proKwh: "ct/kWh",
    proJahrText: (f, eur) => `${f.fmtEur(eur)} pro Jahr, inkl. Grundpreis`,
    spanne: "Marktspanne",
    spanneText: "Börsenwert + üblicher Aufschlag",
    amtlich: "Amtliche Bestandteile",
    amtlichZusatz: "Umlagen, Konzessionsabgabe, Stromsteuer",
    boerse: "Börsenwert",
    boerseZusatz: (f, b) => `Ø ${MONATE_DE[Number(b.von.slice(5)) - 1]} ${b.von.slice(0, 4)}–${MONATE_DE[Number(b.bis.slice(5)) - 1]} ${b.bis.slice(0, 4)}, Profil × ${f.fmt(b.faktor, 2)}`,
    rechnung: "Rechnung netto",
    rechnungZusatz: (f, r) => `${f.fmt(r.ct, 2)} ct/kWh im Schnitt`,
    differenz: "Über dem Marktniveau",
    differenzZusatz: (f, d) => `${f.fmtEur(d.minEur)}–${f.fmtEur(d.maxEur)} pro Jahr`,
    entlastung: "Stromsteuer zurück",
    entlastungZusatz: "pro Jahr auf Antrag (§ 9b StromStG)",
    urteil: {
      marktgerecht: { titel: "Ihr Vertrag ist marktgerecht", text: (f, r) => `Ihr Energieanteil von ${f.fmt(r.energie.ct, 2)} ct/kWh liegt in der üblichen Spanne von ${f.fmt(r.spanne.min, 2)} bis ${f.fmt(r.spanne.max, 2)} ct/kWh. Allein wegen des Preises lohnt ein Wechsel kaum – achten Sie auf Laufzeit und Kündigungsfrist.` },
      guenstig: { titel: "Günstiger als die übliche Spanne", text: (f, r) => `Ihr Energieanteil von ${f.fmt(r.energie.ct, 2)} ct/kWh liegt unter der üblichen Spanne (ab ${f.fmt(r.spanne.min, 2)} ct/kWh). Oft ein früh abgeschlossener Vertrag – prüfen Sie die Eingaben und wann der Vertrag endet.` },
      etwas_ueber: { titel: "Etwas über der Marktspanne", text: (f, r) => `Ihr Energieanteil von ${f.fmt(r.energie.ct, 2)} ct/kWh liegt etwas über der üblichen Spanne (bis ${f.fmt(r.spanne.max, 2)} ct/kWh). Ein Vergleichsangebot zum nächsten Kündigungstermin kann sich lohnen.` },
      deutlich_ueber: { titel: "Deutlich über der Marktspanne", text: (f, r) => `Ihr Energieanteil von ${f.fmt(r.energie.ct, 2)} ct/kWh liegt deutlich über der üblichen Spanne (bis ${f.fmt(r.spanne.max, 2)} ct/kWh) – rechnerisch ${f.fmtEur(r.differenz.minEur)} bis ${f.fmtEur(r.differenz.maxEur)} pro Jahr. Mit Blick auf den Kündigungstermin lohnt sich ein Vergleich.` },
      offen: { titel: "Ohne Netzentgelt kein Urteil", text: () => "Ihr Arbeitspreis enthält das Netzentgelt. Tragen Sie Netz-Arbeitspreis und Fixkosten aus Ihrer Rechnung ein, dann trennen wir Energie und Netz." },
      pruefen: { titel: "Bitte Eingaben prüfen", text: () => "Nach Abzug der amtlichen Bestandteile und des Netzentgelts bleibt kein Energieanteil übrig. Ist der Arbeitspreis netto ohne Umsatzsteuer eingetragen?" },
    },
    stufen: { amtlich: "amtlich", berechnet: "berechnet", schaetzung: "Schätzung", angabe: "Ihre Angabe" },
    stufenText: {
      amtlich: "aus Gesetz oder amtlicher Veröffentlichung",
      berechnet: "aus offenen Daten und Ihren Angaben berechnet",
      schaetzung: "eigene Einschätzung, Orientierung",
      angabe: "aus Ihrer Rechnung übernommen",
    },
    zeilen: {
      kwkg: "KWKG-Umlage",
      offshore: "Offshore-Netzumlage",
      aufschlag: "Aufschlag für besondere Netznutzung",
      kav: "Konzessionsabgabe",
      stromsteuer: "Stromsteuer (Regelsatz)",
      netz: "Netzentgelt und Messung",
      energie: "Energie und Vertrieb",
      rest: "Energie, Vertrieb und Netz",
    },
    balken: { ihre: "Ihr Preis", markt: "Mitte der Marktspanne", beschaffung: "Energie und Vertrieb", netz: "Netzentgelt und Messung", umlagen: "Umlagen", konzession: "Konzessionsabgabe", stromsteuer: "Stromsteuer" },
    fuss: "Orientierung, kein Angebot und keine Rechts- oder Steuerberatung. Alle Werte netto.",
    vorjahr: "Für das laufende Jahr ist noch kein Wert veröffentlicht – gerechnet wird mit dem Wert 2026.",
    // unten
    tabelleTitel: "Zerlegung mit Qualitätsstufe",
    tabelleZusatz: "Jede Zahl mit Herkunft",
    spalten: ["Bestandteil", "ct/kWh", "€/Jahr", "Qualität"],
    aufschlagDetail: (f, d) => `erste ${f.fmt(d.bisKwh)} kWh zu ${f.fmt(d.ct, 3)} ct, darüber ${f.fmt(d.ctUeber, 3)} ct (Gruppe ${d.gruppe}‘)`,
    kavDetail: (f, k) => (k.gruppe === "sonder" ? `Sondervertrag, Höchstbetrag ${f.fmt(k.ct, 2)} ct` : `Tarifkunde, ${f.fmt(k.ct, 2)} ct je nach Gemeindegröße`),
    quelle: "Quelle",
    stand: "Stand",
    boerseTitel: "Börsenpreis Day-Ahead der letzten 12 Monate",
    boerseText: (f, b) => `Monatsmittel in ct/kWh. Ø ${f.fmt(b.baseCt, 2)} ct/kWh; mit Ihrem Lastprofil gewichtet ${f.fmt(b.ct, 2)} ct/kWh.`,
    smard: "Daten: Bundesnetzagentur | SMARD.de, Lizenz CC BY 4.0",
    radarTitel: "Preisradar: amtliche Bestandteile je Bundesland",
    radarLead: "Umlagen und Stromsteuer sind in allen 16 Bundesländern gleich. Unterschiede entstehen beim Netzentgelt Ihres Netzbetreibers und bei der Konzessionsabgabe für Tarifkunden, die von der Einwohnerzahl der Gemeinde abhängt. Endpreise zeigen wir bewusst nicht – sie sind Verhandlungssache.",
    radarWahl: "Bundesland für die Übersicht",
    gilt: { bundesweit: "bundesweit gleich", gemeinde: "je Gemeindegröße", netzbetreiber: "je Netzbetreiber" },
    radarNetz: "aus Ihrer Rechnung – je Netzbetreiber folgt",
    radarSumme: "Summe amtlich (erste GWh)",
    radarSonder: "Sondervertrag",
    radarTarif: "Tarifkunde",
    radarIn: (n) => `in ${n}`,
    radarUeber: (f, z) => `über 1 GWh: ${f.fmt(z.ueber, 3)} ct (produzierendes Gewerbe mit hohen Stromkosten ${f.fmt(z.produzierend, 3)} ct)`,
    umlagen2027: (datum) => `Umlagen 2027: Die Übertragungsnetzbetreiber veröffentlichen sie bis ${datum}. Bis dahin rechnet der Check mit den Werten 2026.`,
    umlagen2027Da: (f, v) => `Umlagen 2027 sind veröffentlicht: für Ihren Verbrauch ${v.deltaEur >= 0 ? "+" : "−"}${f.fmtEur(Math.abs(v.deltaEur))} pro Jahr gegenüber 2026.`,
    grenzen: "Nicht eingerechnet: Begrenzungen für stromkostenintensive Unternehmen (§§ 30 ff. EnFG) und der Wegfall der Konzessionsabgabe unter dem Grenzpreis (§ 2 Abs. 4 KAV). Der Börsenwert zeigt die letzten zwölf Monate – Ihr Vertragspreis hängt vom Terminmarkt zum Abschlusszeitpunkt ab.",
    pool: "Zu teuer oder Vertrag läuft aus?",
    poolText: "Im Reststrom-Pool beschaffen Unternehmen gemeinsam und strukturiert. Wir prüfen Ihr Profil und Ihre Kündigungsfristen – kostenlos und unverbindlich.",
    poolKnopf: "Reststrom-Pool ansehen",
    sr: (u, e) => `${u}. Energieanteil ${e} Cent je Kilowattstunde.`,
    datum: (iso) => (iso ? iso.split("-").reverse().join(".") : "–"),
  },
  en: {
    intro: "Enter the figures from your last annual bill – all amounts net, excluding VAT.",
    beispiel: "Pre-filled with an example business. Replace the values with your own.",
    g1: "1 · Consumption",
    verbrauch: "Annual consumption",
    leistung: "Peak demand",
    leistungHinweis: "Shown on the bill for metered demand (RLM). 0 = unknown.",
    spannung: "Connection",
    lastprofil: "When do you use electricity?",
    lastgangTitel: "Read in a load profile (optional)",
    lastgangText: "CSV or text file with timestamps and 15-minute or hourly values, e.g. from your grid operator’s portal.",
    lokal: "The file is analysed in your browser only and is neither uploaded nor stored.",
    datei: "Choose file",
    einheit: "Values in the file",
    einheiten: [
      { id: "auto", label: "Automatic" },
      { id: "kwh", label: "kWh per interval" },
      { id: "kw", label: "kW (demand)" },
    ],
    lastgangOk: (a, f) => `${f.fmt(a.tage)} days · ${a.intervallMin}-minute values · ${f.fmt(a.kwh)} kWh${a.hochgerechnet ? ` → extrapolated ${f.fmt(a.jahresKwh)} kWh/year` : ""} · peak ${f.fmt(a.spitzeKw, 1)} kW · profile factor ${f.fmt(a.profilFaktor, 3)}`,
    lastgangFehler: {
      zu_gross: "The file is too large (max. 15 MB or 200,000 lines).",
      leer: "The file is empty.",
      zu_wenig: "Too few timestamps with values were found in the file (at least one week).",
      intervall: "The interval was not recognised – 15, 30 or 60-minute values are expected.",
      lesen: "The file could not be read.",
    },
    entfernen: "Remove load profile",
    g2: "2 · Your bill",
    preisArt: "What does your energy price include?",
    arbeitspreis: "Energy price",
    grundpreis: "Supplier’s standing charge",
    proMonat: "€/month",
    g3: "3 · Grid fees",
    netzModus: "Grid fees as on the bill",
    netzCt: "Grid energy price",
    netzFix: "Demand charge, grid standing charge and metering",
    proJahr: "€/year",
    netzHinweis: "Grid fees must be shown separately on the bill (§ 40 EnWG). We will add grid fees per grid operator in the next step.",
    netzFixHinweis: "Only amounts shown as separate items in €/year or €/kW on the bill – not what is already included in the supplier’s standing charge.",
    netzUnbekannt: "Without the grid fee, a total price cannot be split into energy and grid – the verdict then remains open.",
    g4: "4 · Your business",
    bundesland: "Federal state",
    bundeslandLeer: "Please choose",
    kav: "Concession fee",
    kavHinweis: (g) =>
      ({
        gewaehlt: "as selected",
        mittelspannung: "medium voltage: special contract customer",
        verbrauch: "up to 30,000 kWh a year: tariff customer (§ 2(7) KAV)",
        leistung: "by demand above/below 30 kW (§ 2(7) KAV)",
        annahme: "demand unknown – assumed: special contract",
      })[g],
    gemeinde: "Population of your municipality",
    gemeinden: [
      { id: "bis25", label: "up to 25,000" },
      { id: "bis100", label: "up to 100,000" },
      { id: "bis500", label: "up to 500,000" },
      { id: "ueber500", label: "over 500,000" },
    ],
    produzierend: "Manufacturing, agriculture or forestry",
    produzierendText: "Electricity tax relief under § 9b StromStG possible",
    gruppeC: "Electricity costs above 4% of turnover",
    gruppeCText: "Lower surcharge for special grid use above 1 GWh",
    titel: "Your electricity price broken down",
    plakette: "Levies as of 2026",
    energieanteil: "Your energy component",
    restanteil: "Energy and grid combined",
    proKwh: "ct/kWh",
    proJahrText: (f, eur) => `${f.fmtEur(eur)} per year, incl. standing charge`,
    spanne: "Market range",
    spanneText: "exchange value + usual mark-up",
    amtlich: "Official components",
    amtlichZusatz: "levies, concession fee, electricity tax",
    boerse: "Exchange value",
    boerseZusatz: (f, b) => `Ø ${MONATE_EN[Number(b.von.slice(5)) - 1]} ${b.von.slice(0, 4)}–${MONATE_EN[Number(b.bis.slice(5)) - 1]} ${b.bis.slice(0, 4)}, profile × ${f.fmt(b.faktor, 2)}`,
    rechnung: "Bill, net",
    rechnungZusatz: (f, r) => `${f.fmt(r.ct, 2)} ct/kWh on average`,
    differenz: "Above market level",
    differenzZusatz: (f, d) => `${f.fmtEur(d.minEur)}–${f.fmtEur(d.maxEur)} per year`,
    entlastung: "Electricity tax refund",
    entlastungZusatz: "per year on application (§ 9b StromStG)",
    urteil: {
      marktgerecht: { titel: "Your contract is in line with the market", text: (f, r) => `Your energy component of ${f.fmt(r.energie.ct, 2)} ct/kWh lies within the usual range of ${f.fmt(r.spanne.min, 2)} to ${f.fmt(r.spanne.max, 2)} ct/kWh. Price alone is hardly a reason to switch – keep an eye on the term and notice period.` },
      guenstig: { titel: "Cheaper than the usual range", text: (f, r) => `Your energy component of ${f.fmt(r.energie.ct, 2)} ct/kWh is below the usual range (from ${f.fmt(r.spanne.min, 2)} ct/kWh). Often a contract signed early – check your inputs and when the contract ends.` },
      etwas_ueber: { titel: "Slightly above the market range", text: (f, r) => `Your energy component of ${f.fmt(r.energie.ct, 2)} ct/kWh is slightly above the usual range (up to ${f.fmt(r.spanne.max, 2)} ct/kWh). A comparison offer for the next notice date may be worthwhile.` },
      deutlich_ueber: { titel: "Well above the market range", text: (f, r) => `Your energy component of ${f.fmt(r.energie.ct, 2)} ct/kWh is well above the usual range (up to ${f.fmt(r.spanne.max, 2)} ct/kWh) – arithmetically ${f.fmtEur(r.differenz.minEur)} to ${f.fmtEur(r.differenz.maxEur)} per year. With a view to your notice date, a comparison is worthwhile.` },
      offen: { titel: "No verdict without the grid fee", text: () => "Your energy price includes the grid fee. Enter the grid energy price and fixed costs from your bill, and we will separate energy and grid." },
      pruefen: { titel: "Please check your inputs", text: () => "After deducting the official components and the grid fee, no energy component is left. Did you enter the energy price net, excluding VAT?" },
    },
    stufen: { amtlich: "official", berechnet: "calculated", schaetzung: "estimate", angabe: "your input" },
    stufenText: {
      amtlich: "from law or official publication",
      berechnet: "calculated from open data and your inputs",
      schaetzung: "own estimate, for guidance",
      angabe: "taken from your bill",
    },
    zeilen: {
      kwkg: "CHP levy (KWKG)",
      offshore: "Offshore grid levy",
      aufschlag: "Surcharge for special grid use",
      kav: "Concession fee",
      stromsteuer: "Electricity tax (standard rate)",
      netz: "Grid fees and metering",
      energie: "Energy and sales",
      rest: "Energy, sales and grid",
    },
    balken: { ihre: "Your price", markt: "Middle of the market range", beschaffung: "Energy and sales", netz: "Grid fees and metering", umlagen: "Levies", konzession: "Concession fee", stromsteuer: "Electricity tax" },
    fuss: "For guidance only, not an offer and no legal or tax advice. All values net.",
    vorjahr: "No value has been published for the current year yet – the 2026 value is used.",
    tabelleTitel: "Breakdown with quality level",
    tabelleZusatz: "Every figure with its origin",
    spalten: ["Component", "ct/kWh", "€/year", "Quality"],
    aufschlagDetail: (f, d) => `first ${f.fmt(d.bisKwh)} kWh at ${f.fmt(d.ct, 3)} ct, above that ${f.fmt(d.ctUeber, 3)} ct (group ${d.gruppe}′)`,
    kavDetail: (f, k) => (k.gruppe === "sonder" ? `special contract, maximum ${f.fmt(k.ct, 2)} ct` : `tariff customer, ${f.fmt(k.ct, 2)} ct depending on municipality size`),
    quelle: "Source",
    stand: "As of",
    boerseTitel: "Day-ahead exchange price over the last 12 months",
    boerseText: (f, b) => `Monthly averages in ct/kWh. Ø ${f.fmt(b.baseCt, 2)} ct/kWh; weighted with your load profile ${f.fmt(b.ct, 2)} ct/kWh.`,
    smard: "Data: Bundesnetzagentur | SMARD.de, licence CC BY 4.0",
    radarTitel: "Price radar: official components by federal state",
    radarLead: "Levies and electricity tax are the same in all 16 federal states. Differences arise from your grid operator’s grid fee and from the concession fee for tariff customers, which depends on the municipality’s population. We deliberately show no end prices – they are a matter of negotiation.",
    radarWahl: "Federal state for the overview",
    gilt: { bundesweit: "same nationwide", gemeinde: "by municipality size", netzbetreiber: "by grid operator" },
    radarNetz: "from your bill – per grid operator to follow",
    radarSumme: "Total official (first GWh)",
    radarSonder: "Special contract",
    radarTarif: "Tariff customer",
    radarIn: (n) => `in ${n}`,
    radarUeber: (f, z) => `above 1 GWh: ${f.fmt(z.ueber, 3)} ct (manufacturing with high electricity costs ${f.fmt(z.produzierend, 3)} ct)`,
    umlagen2027: (datum) => `Levies for 2027: the transmission system operators publish them by ${datum}. Until then, the check uses the 2026 values.`,
    umlagen2027Da: (f, v) => `Levies for 2027 are published: for your consumption ${v.deltaEur >= 0 ? "+" : "−"}${f.fmtEur(Math.abs(v.deltaEur))} per year compared with 2026.`,
    grenzen: "Not included: caps for electricity-intensive companies (§§ 30 ff. EnFG) and the waiver of the concession fee below the threshold price (§ 2(4) KAV). The exchange value reflects the last twelve months – your contract price depends on the forward market at the time of signing.",
    pool: "Too expensive or contract ending?",
    poolText: "In the residual power pool, businesses procure together and in a structured way. We check your profile and notice periods – free of charge and without obligation.",
    poolKnopf: "See the residual power pool",
    sr: (u, e) => `${u}. Energy component ${e} cents per kilowatt hour.`,
    datum: (iso) => iso || "–",
  },
};

const OPTION_EN = {
  preisArt: { gesamt: ["Total price", "incl. grid fee, levies, concession fee and electricity tax"], energie: ["Energy only", "grid fee, levies and taxes listed separately"] },
  netzModus: { angegeben: "From my bill", unbekannt: "I don’t know" },
  spannung: { ns: "Low voltage", ms: "Medium voltage or higher" },
  kav: { auto: "Automatic", sonder: "Special contract", tarif: "Tariff customer" },
  lastprofil: { base: "Evenly around the clock", tag: "Day shift Mon–Fri (7am–6pm)", zweischicht: "Two shifts Mon–Fri (6am–10pm)", dreischicht: "Three shifts Mon–Fri, reduced at weekends", handel: "Retail Mon–Sat (8am–8pm)", lastgang: "Own load profile (file)" },
};

const STUFE_KLASSE = {
  amtlich: "bg-navy-50 text-navy-800 ring-navy-200",
  berechnet: "bg-ov-50 text-ov-800 ring-ov-200",
  schaetzung: "bg-sun-300/25 text-ink-900 ring-sun-400/50",
  angabe: "bg-ink-100 text-ink-700 ring-ink-200",
};

function StufenMarke({ stufe, t }) {
  return (
    <span title={t.stufenText[stufe]} className={cn("inline-flex shrink-0 items-center rounded-full px-2 py-0.5 text-[11.5px] font-semibold ring-1", STUFE_KLASSE[stufe])}>
      {t.stufen[stufe]}
    </span>
  );
}

/** Eingaben für den Bericht: genau die Felder der Positivliste (leeres Bundesland weglassen). */
const berichtEingaben = (e) => {
  const { bundesland, ...rest } = e;
  return bundesland ? { ...rest, bundesland } : rest;
};

export default function GewerbestromCheck() {
  const t = useTexte(TEXTE);
  const f = useFormate();
  const en = f.sprache === "en";
  const id = useId();
  const dateiRef = useRef(null);
  const [e, setE] = useState(() => ({ ...STANDARD }));
  const [lastgang, setLastgang] = useState(null); // { name, text, einheit, auswertung, fehler }
  const set = (k) => (v) => setE((alt) => ({ ...alt, [k]: v }));
  useTeilbarerZustand(e, (neu) => setE((alt) => ({ ...alt, ...neu, ...(neu.lastprofil === "lastgang" ? { lastprofil: STANDARD.lastprofil } : {}) })), {
    optionen: {
      preisArt: PREISARTEN.map((x) => x.id),
      netzModus: NETZ_MODI.map((x) => x.id),
      spannung: SPANNUNGEN.map((x) => x.id),
      kav: KAV_GRUPPEN.map((x) => x.id),
      gemeinde: ["bis25", "bis100", "bis500", "ueber500"],
      lastprofil: LASTPROFILE.filter((x) => x.id !== "lastgang").map((x) => x.id),
      bundesland: ["", ...BUNDESLAENDER.map((x) => x.id)],
    },
    grenzen: { verbrauchMwh: [1, 200000], arbeitspreisCt: [0.5, 150], netzCt: [0, 50], profilFaktor: [0.5, 1.5] },
    pruefen: (z) => gewerbestromCheck(z),
  });
  const r = useMemo(() => gewerbestromCheck(e), [e]);
  const radar = useMemo(() => preisradar(e.bundesland), [e.bundesland]);

  const opt = (liste, gruppe) =>
    liste.map((o) => {
      if (!en) return o.text ? { id: o.id, label: o.label, sub: undefined } : { id: o.id, label: o.label };
      const x = OPTION_EN[gruppe]?.[o.id];
      return { id: o.id, label: Array.isArray(x) ? x[0] : x || o.label };
    });

  function lastgangAnwenden(text, name, einheit) {
    const gelesen = lastgangLesen(text, { einheit });
    if (gelesen.fehler) {
      setLastgang({ name, text, einheit, fehler: gelesen.fehler });
      return;
    }
    const a = lastgangAuswerten(gelesen);
    setLastgang({ name, text, einheit, auswertung: a });
    setE((alt) => ({ ...alt, verbrauchMwh: Math.max(1, a.verbrauchMwh), leistungKw: a.spitzeKw, lastprofil: "lastgang", profilFaktor: a.profilFaktor }));
  }

  function dateiGewaehlt(ev) {
    const datei = ev.target.files?.[0];
    ev.target.value = "";
    if (!datei) return;
    if (datei.size > MAX_DATEI) {
      setLastgang({ name: datei.name, fehler: "zu_gross" });
      return;
    }
    const leser = new FileReader();
    leser.onload = () => lastgangAnwenden(String(leser.result || ""), datei.name, lastgang?.einheit || "auto");
    leser.onerror = () => setLastgang({ name: datei.name, fehler: "lesen" });
    leser.readAsText(datei);
  }

  function lastgangEntfernen() {
    setLastgang(null);
    setE((alt) => ({ ...alt, lastprofil: STANDARD.lastprofil, profilFaktor: 1 }));
  }

  const feld = "block h-12 w-full rounded-2xl bg-white px-4 text-[15px] text-ink-900 outline-none ring-1 ring-ink-200 focus-visible:ring-2 focus-visible:ring-ov-500";
  const urteilTexte = t.urteil[r.urteil.id];
  const hauptCt = r.energie ? r.energie.ct : r.zeilen.find((z) => z.id === "rest")?.ct ?? 0;
  const tarifAktiv = r.kav.gruppe === "tarif";

  // Balken: Ihr Preis vs. Mitte der Marktspanne (gleiche amtliche Teile und gleiches Netz)
  const umlagenCt = r.zeilen.filter((z) => ["kwkg", "offshore", "aufschlag"].includes(z.id)).reduce((s, z) => s + z.ct, 0);
  const kavCt = r.zeilen.find((z) => z.id === "kav").ct;
  const steuerCt = r.zeilen.find((z) => z.id === "stromsteuer").ct;
  const teile = (energieCt) => [
    { id: "beschaffung", label: t.balken.beschaffung, ct: Math.max(0, energieCt) },
    ...(r.netz ? [{ id: "netz", label: t.balken.netz, ct: r.netz.ct }] : []),
    { id: "umlagen", label: t.balken.umlagen, ct: umlagenCt },
    { id: "konzession", label: t.balken.konzession, ct: kavCt },
    { id: "stromsteuer", label: t.balken.stromsteuer, ct: steuerCt },
  ];

  return (
    <div>
      <RechnerRahmen
        mitlaufend
        breiteLinks={430}
        eingaben={
          <div>
            <MobilKurz
              werte={[
                [r.energie ? t.energieanteil : t.restanteil, `${f.fmt(hauptCt, 2)} ct`],
                [t.spanne, `${f.fmt(r.spanne.min, 1)}–${f.fmt(r.spanne.max, 1)} ct`],
                [t.amtlich, `${f.fmt(r.amtlich.ct, 2)} ct`],
              ]}
            />
            <p className="text-[14px] leading-relaxed text-ink-600">{t.intro}</p>
            <p className="mb-6 mt-2 flex items-start gap-2 text-[13px] leading-relaxed text-ink-500">
              <Info aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-ink-400" />
              {t.beispiel}
            </p>
            <div className="space-y-8">
              <Gruppe titel={t.g1}>
                <ZahlFeld id={`${id}-kwh`} label={t.verbrauch} wert={Math.round(e.verbrauchMwh * 1000)} onChange={(v) => set("verbrauchMwh")(Math.max(1, v / 1000))} min={1000} max={200000000} step={1000} einheit="kWh" />
                <ZahlFeld id={`${id}-kw`} label={t.leistung} wert={e.leistungKw} onChange={set("leistungKw")} min={0} max={100000} step={1} einheit="kW" hinweis={t.leistungHinweis} />
                <Auswahl legende={t.spannung} wert={e.spannung} onChange={set("spannung")} optionen={opt(SPANNUNGEN, "spannung")} klein />
                <Auswahl
                  legende={t.lastprofil}
                  wert={e.lastprofil}
                  onChange={(v) => (v === "lastgang" ? dateiRef.current?.click() : set("lastprofil")(v))}
                  optionen={opt(lastgang?.auswertung ? LASTPROFILE : LASTPROFILE.filter((p) => p.id !== "lastgang"), "lastprofil")}
                  spalten={1}
                  klein
                />
                <div className="rounded-2xl bg-white p-4 ring-1 ring-ink-200" data-lastgang="">
                  <p className="flex items-center gap-2 text-[14.5px] font-semibold text-ink-800">
                    <FileSpreadsheet aria-hidden="true" className="h-4 w-4 text-ov-600" />
                    {t.lastgangTitel}
                  </p>
                  <p className="mt-1 text-[13px] leading-relaxed text-ink-500">{t.lastgangText}</p>
                  <p className="mt-2 flex items-start gap-2 rounded-xl bg-ov-50 px-3 py-2 text-[12.5px] font-medium leading-snug text-ov-800 ring-1 ring-ov-200">
                    <Lock aria-hidden="true" className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                    {t.lokal}
                  </p>
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <label className="inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-full bg-navy-900 px-4 text-[13.5px] font-semibold text-white hover:bg-navy-800 has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ov-500 has-[:focus-visible]:ring-offset-2">
                      <Upload aria-hidden="true" className="h-4 w-4" />
                      {t.datei}
                      <input ref={dateiRef} type="file" accept=".csv,.txt,.tsv,text/csv,text/plain" className="sr-only" onChange={dateiGewaehlt} />
                    </label>
                    {lastgang && (
                      <button type="button" onClick={lastgangEntfernen} className="inline-flex min-h-11 items-center gap-1.5 rounded-full px-3 text-[13px] font-semibold text-ink-600 hover:bg-ink-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ov-500">
                        <Trash2 aria-hidden="true" className="h-4 w-4" />
                        {t.entfernen}
                      </button>
                    )}
                  </div>
                  {lastgang && (
                    <div className="mt-3 space-y-3">
                      <p className={cn("break-words text-[12.5px] leading-snug", lastgang.fehler ? "text-danger-700" : "text-ink-600")} role="status">
                        <span className="font-semibold">{lastgang.name}</span>: {lastgang.fehler ? t.lastgangFehler[lastgang.fehler] : t.lastgangOk(lastgang.auswertung, f)}
                      </p>
                      {lastgang.text && (
                        <Auswahl legende={t.einheit} wert={lastgang.einheit} onChange={(v) => lastgangAnwenden(lastgang.text, lastgang.name, v)} optionen={t.einheiten} klein />
                      )}
                    </div>
                  )}
                </div>
              </Gruppe>

              <Gruppe titel={t.g2}>
                <Auswahl legende={t.preisArt} wert={e.preisArt} onChange={set("preisArt")} optionen={opt(PREISARTEN, "preisArt")} klein />
                <p className="-mt-2 text-[12.5px] leading-snug text-ink-500">{en ? OPTION_EN.preisArt[e.preisArt][1] : PREISARTEN.find((p) => p.id === e.preisArt).text}</p>
                <ZahlFeld id={`${id}-ap`} label={t.arbeitspreis} wert={e.arbeitspreisCt} onChange={set("arbeitspreisCt")} min={0.5} max={150} step={0.01} einheit="ct/kWh" />
                <ZahlFeld id={`${id}-gp`} label={t.grundpreis} wert={e.grundpreisEurMonat} onChange={set("grundpreisEurMonat")} min={0} max={10000} step={0.5} einheit={t.proMonat} />
              </Gruppe>

              <Gruppe titel={t.g3}>
                <Auswahl legende={t.netzModus} wert={e.netzModus} onChange={set("netzModus")} optionen={opt(NETZ_MODI, "netzModus")} klein />
                {e.netzModus === "angegeben" ? (
                  <>
                    <ZahlFeld id={`${id}-nct`} label={t.netzCt} wert={e.netzCt} onChange={set("netzCt")} min={0} max={50} step={0.01} einheit="ct/kWh" />
                    <ZahlFeld id={`${id}-nfix`} label={t.netzFix} wert={e.netzFixEurJahr} onChange={set("netzFixEurJahr")} min={0} max={5000000} step={10} einheit={t.proJahr} hinweis={`${t.netzFixHinweis} ${t.netzHinweis}`} />
                  </>
                ) : (
                  <Hinweis icon={Info}>{e.preisArt === "gesamt" ? t.netzUnbekannt : t.netzHinweis}</Hinweis>
                )}
              </Gruppe>

              <Gruppe titel={t.g4}>
                <div>
                  <label htmlFor={`${id}-bl`} className="mb-2 block text-[14.5px] font-semibold text-ink-800">
                    {t.bundesland}
                  </label>
                  <select id={`${id}-bl`} value={e.bundesland} onChange={(ev) => set("bundesland")(ev.target.value)} className={feld}>
                    <option value="">{t.bundeslandLeer}</option>
                    {BUNDESLAENDER.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <Auswahl legende={t.kav} wert={e.kav} onChange={set("kav")} optionen={opt(KAV_GRUPPEN, "kav")} klein />
                  <p className="mt-2 text-[12.5px] leading-snug text-ink-500">
                    {r.kav.gruppe === "sonder" ? opt(KAV_GRUPPEN, "kav")[1].label : opt(KAV_GRUPPEN, "kav")[2].label} · {f.fmt(r.kav.ct, 2)} ct/kWh · {t.kavHinweis(r.kav.grund)}
                  </p>
                </div>
                {tarifAktiv && <Auswahl legende={t.gemeinde} wert={e.gemeinde} onChange={set("gemeinde")} optionen={t.gemeinden} spalten={2} klein />}
                <Schalter icon={Factory} label={t.produzierend} beschreibung={t.produzierendText} an={e.produzierend} onChange={(v) => setE((alt) => ({ ...alt, produzierend: v, gruppeC: v ? alt.gruppeC : false }))}>
                  {r.kwh > 1000000 && (
                    <Schalter icon={Scale} label={t.gruppeC} beschreibung={t.gruppeCText} an={e.gruppeC} onChange={set("gruppeC")} />
                  )}
                </Schalter>
              </Gruppe>
            </div>
          </div>
        }
        ergebnis={
          <>
            <p className="sr-only" aria-live="polite">
              {t.sr(urteilTexte.titel, f.fmt(hauptCt, 2))}
            </p>
            <ErgebnisKopf titel={t.titel} plakette={t.plakette} />

            <Urteil id={r.urteil.id} titel={urteilTexte.titel} text={urteilTexte.text(f, r)} />

            <Hauptzahl
              className="mt-5"
              icon={Zap}
              label={r.energie ? t.energieanteil : t.restanteil}
              zusatz={r.energie ? t.proJahrText(f, r.energie.eur) : undefined}
              rechts={
                <div className="sm:text-right">
                  <p className="flex items-center gap-1.5 text-[12.5px] text-white/75 sm:justify-end">
                    <Gauge aria-hidden="true" className="h-3.5 w-3.5" />
                    {t.spanne}
                  </p>
                  <p className="ov-kpi mt-0.5 whitespace-nowrap text-white">
                    {f.fmt(r.spanne.min, 1)}–{f.fmt(r.spanne.max, 1)}
                  </p>
                  <p className="text-[12.5px] text-white/75">{t.spanneText}</p>
                </div>
              }
            >
              <Zahl wert={hauptCt} stellen={2} suffix={` ${t.proKwh}`} delta="dunkel" einlauf />
            </Hauptzahl>

            <Belege spalten={2}>
              <Kennzahl icon={Landmark} label={t.amtlich} zusatz={t.amtlichZusatz}>
                <Zahl wert={r.amtlich.ct} stellen={2} suffix=" ct" />
              </Kennzahl>
              <Kennzahl icon={Calculator} label={t.boerse} zusatz={t.boerseZusatz(f, r.boerse)}>
                <Zahl wert={r.boerse.ct} stellen={2} suffix=" ct" />
              </Kennzahl>
              {r.rechnung && (
                <Kennzahl icon={Receipt} label={t.rechnung} zusatz={t.rechnungZusatz(f, r.rechnung)}>
                  <Zahl wert={r.rechnung.eur} format={(v) => f.fmtEur(v)} />
                </Kennzahl>
              )}
              {r.differenz ? (
                <Kennzahl ton="akzent" icon={Scale} label={t.differenz} zusatz={t.differenzZusatz(f, r.differenz)}>
                  <Zahl wert={r.differenz.mittelEur} format={(v) => f.fmtEur(v)} />
                </Kennzahl>
              ) : r.entlastung.eur > 0 ? (
                <Kennzahl ton="akzent" icon={BadgeCheck} label={t.entlastung} zusatz={t.entlastungZusatz}>
                  <Zahl wert={r.entlastung.eur} format={(v) => f.fmtEur(v)} />
                </Kennzahl>
              ) : null}
            </Belege>

            {r.energie && (
              <div className="mt-5 rounded-2xl bg-ink-50 p-4 md:p-5">
                <PreisBalken
                  sprache={f.sprache}
                  zeilen={[
                    { titel: t.balken.ihre, teile: teile(r.energie.ct) },
                    { titel: t.balken.markt, teile: teile(r.spanne.mittel) },
                  ]}
                  max={Math.max(r.energie.ct, r.spanne.mittel) + r.amtlich.ct + (r.netz?.ct || 0)}
                />
              </div>
            )}

            {r.differenz && r.entlastung.eur > 0 && (
              <Hinweis ton="gut" icon={BadgeCheck} className="mt-4">
                {t.entlastung}: {f.fmtEur(r.entlastung.eur)} {t.entlastungZusatz}
              </Hinweis>
            )}
            {r.vorjahr && (
              <Hinweis ton="warnung" icon={CalendarClock} className="mt-4">
                {t.vorjahr}
              </Hinweis>
            )}

            <p className="mt-6 border-t border-ink-100 pt-5 text-[13px] leading-relaxed text-ink-500">{t.fuss}</p>
            <BerichtAnfordern rechner="gewerbestrom" land="DE" eingaben={berichtEingaben(e)} />
          </>
        }
        unten={
          <div className="space-y-6">
            <Zerlegung r={r} t={t} f={f} />
            <BoerseMonate r={r} t={t} f={f} />
            <Preisradar radar={radar} t={t} f={f} bundesland={e.bundesland} setBundesland={set("bundesland")} feld={feld} idBasis={id} />
            <Hinweis icon={CalendarClock}>{r.vorschau2027.offen ? t.umlagen2027(t.datum(r.vorschau2027.bis)) : t.umlagen2027Da(f, r.vorschau2027)}</Hinweis>
            <Hinweis icon={Info}>{t.grenzen}</Hinweis>
            <div className="flex flex-col gap-4 rounded-3xl bg-navy-950 p-6 text-white md:flex-row md:items-center md:justify-between md:p-8 print:hidden">
              <div className="max-w-xl">
                <p className="font-display text-[20px] font-extrabold tracking-tight">{t.pool}</p>
                <p className="mt-1.5 text-[14.5px] leading-relaxed text-white/75">{t.poolText}</p>
              </div>
              <div className="flex shrink-0 flex-col gap-2 sm:flex-row">
                <Button href={pfad("/reststrom")} variant="white" size="lg" pfeil>
                  {t.poolKnopf}
                </Button>
              </div>
            </div>
          </div>
        }
      />
    </div>
  );
}

function Urteil({ id, titel, text }) {
  const ton = id === "marktgerecht" || id === "guenstig" ? "bg-ov-50 ring-ov-200" : id === "deutlich_ueber" ? "bg-ink-900 text-white ring-ink-900" : id === "etwas_ueber" ? "bg-sun-300/25 ring-sun-400/50" : "bg-ink-50 ring-ink-200";
  const dunkel = id === "deutlich_ueber";
  return (
    <div className={cn("mt-5 rounded-3xl p-5 ring-1 md:p-6", ton)} data-urteil={id}>
      <p className={cn("font-display text-[21px] font-extrabold tracking-tight", dunkel ? "text-white" : "text-ink-900")}>{titel}</p>
      <p className={cn("mt-2 text-[14.5px] leading-relaxed", dunkel ? "text-white/80" : "text-ink-700")}>{text}</p>
    </div>
  );
}

function Zerlegung({ r, t, f }) {
  const detail = (z) => (z.id === "aufschlag" && z.detail ? t.aufschlagDetail(f, z.detail) : z.id === "kav" ? t.kavDetail(f, z.detail) : null);
  return (
    <section aria-labelledby="gs-zerlegung" className="rounded-3xl ring-1 ring-ink-200/70">
      <div className="flex flex-wrap items-end justify-between gap-3 px-5 pt-5 md:px-6">
        <div>
          <h3 id="gs-zerlegung" className="font-display text-[19px] font-extrabold tracking-tight text-ink-900">
            {t.tabelleTitel}
          </h3>
          <p className="text-[12.5px] text-ink-500">{t.tabelleZusatz}</p>
        </div>
        <ul className="flex flex-wrap gap-1.5" aria-label={t.spalten[3]}>
          {["amtlich", "berechnet", "schaetzung", "angabe"].map((s) => (
            <li key={s} className="flex items-center gap-1.5 text-[12px] text-ink-500">
              <StufenMarke stufe={s} t={t} />
              <span className="hidden xl:inline">{t.stufenText[s]}</span>
            </li>
          ))}
        </ul>
      </div>
      <div className="mt-4 overflow-x-auto border-t border-ink-100" role="region" aria-labelledby="gs-zerlegung" tabIndex={0}>
        <table className="w-full min-w-[34rem] text-left text-[14px]">
          <thead>
            <tr className="text-[12px] uppercase tracking-[0.08em] text-ink-500">
              {t.spalten.map((s, i) => (
                <th key={s} scope="col" className={cn("px-5 py-3 font-semibold md:px-6", i === 1 || i === 2 ? "text-right" : "")}>
                  {s}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-ink-100">
            {r.zeilen.map((z) => (
              <tr key={z.id} className={z.id === "energie" || z.id === "rest" ? "bg-ov-50/40 font-semibold" : undefined}>
                <th scope="row" className="px-5 py-3 font-medium text-ink-800 md:px-6">
                  {t.zeilen[z.id] || z.label}
                  {detail(z) && <span className="block text-[12px] font-normal text-ink-500">{detail(z)}</span>}
                  {z.quelle && (
                    <span className="block text-[12px] font-normal text-ink-500">
                      {t.quelle}:{" "}
                      {z.quelle.quelle?.url ? (
                        <a href={z.quelle.quelle.url} target="_blank" rel="noopener noreferrer" className="underline decoration-ink-300 underline-offset-2 hover:text-ink-800">
                          {z.quelle.quelle.titel.split(" – ")[0]}
                        </a>
                      ) : (
                        z.quelle.quelle?.titel
                      )}{" "}
                      · {t.stand} {t.datum(z.quelle.abruf)}
                    </span>
                  )}
                </th>
                <td className="ov-num px-5 py-3 text-right text-ink-900 md:px-6">{z.ct === null ? "–" : f.fmt(z.ct, 3)}</td>
                <td className="ov-num px-5 py-3 text-right text-ink-900 md:px-6">{z.eur === null ? "–" : f.fmtEur(z.eur)}</td>
                <td className="px-5 py-3 md:px-6">
                  <StufenMarke stufe={z.stufe} t={t} />
                </td>
              </tr>
            ))}
            <tr className="text-ink-700">
              <th scope="row" className="px-5 py-3 font-medium md:px-6">
                {t.spanne}
                <span className="block text-[12px] font-normal text-ink-500">
                  {t.boerse} {f.fmt(r.boerse.ct, 2)} ct ({t.smard}) + {f.fmt(r.spanne.aufschlag.min, 1)}–{f.fmt(r.spanne.aufschlag.max, 1)} ct
                </span>
              </th>
              <td className="ov-num px-5 py-3 text-right md:px-6">
                {f.fmt(r.spanne.min, 2)}–{f.fmt(r.spanne.max, 2)}
              </td>
              <td className="px-5 py-3 text-right md:px-6">–</td>
              <td className="px-5 py-3 md:px-6">
                <span className="inline-flex flex-wrap gap-1">
                  <StufenMarke stufe="berechnet" t={t} />
                  <StufenMarke stufe="schaetzung" t={t} />
                </span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>
  );
}

function BoerseMonate({ r, t, f }) {
  const monate = r.boerse.monate;
  const max = Math.max(...monate.map((m) => m.eurMwh / 10), 1);
  const namen = f.sprache === "en" ? MONATE_EN : MONATE_DE;
  return (
    <DiagrammKarte titel={t.boerseTitel} zusatz={t.boerseText(f, r.boerse)}>
      <div className="mt-2 flex h-40 items-end gap-1.5 sm:gap-2" role="img" aria-label={`${t.boerseTitel}: ${monate.map((m) => `${namen[Number(m.monat.slice(5)) - 1]} ${f.fmt(m.eurMwh / 10, 1)}`).join(", ")} ct/kWh`}>
        {monate.map((m) => {
          const ct = m.eurMwh / 10;
          return (
            <div key={m.monat} className="flex h-full min-w-0 flex-1 flex-col items-center justify-end gap-1">
              <span className="ov-num hidden text-[11px] font-semibold text-ink-700 sm:block">{f.fmt(ct, 1)}</span>
              <div className="w-full rounded-t-md bg-navy-400" style={{ height: `${(ct / max) * 100}%` }} title={`${namen[Number(m.monat.slice(5)) - 1]} ${m.monat.slice(0, 4)}: ${f.fmt(ct, 2)} ct/kWh`} />
              <span className="text-[10.5px] text-ink-500">{namen[Number(m.monat.slice(5)) - 1]}</span>
            </div>
          );
        })}
      </div>
      <p className="mt-3 text-[12px] text-ink-500">
        <a href="https://www.smard.de/home/marktdaten" target="_blank" rel="noopener noreferrer" className="underline decoration-ink-300 underline-offset-2 hover:text-ink-800">
          {t.smard}
        </a>{" "}
        · {t.stand} {t.datum(r.boerse.quelle.abruf)}
      </p>
    </DiagrammKarte>
  );
}

function Preisradar({ radar, t, f, bundesland, setBundesland, feld, idBasis }) {
  const name = radar.bundesland?.label;
  return (
    <section aria-labelledby="gs-radar" className="rounded-3xl bg-sand-50 p-5 ring-1 ring-ink-200/60 md:p-6" data-preisradar="">
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,18rem)] lg:items-end">
        <div>
          <h3 id="gs-radar" className="flex items-center gap-2.5 font-display text-[19px] font-extrabold tracking-tight text-ink-900">
            <MapPin aria-hidden="true" className="h-5 w-5 shrink-0 text-ov-600" /> {t.radarTitel}
          </h3>
          <p className="mt-1.5 max-w-2xl text-[13.5px] leading-relaxed text-ink-600">{t.radarLead}</p>
        </div>
        <div>
          <label htmlFor={`${idBasis}-radar`} className="mb-1.5 block text-[13px] font-semibold text-ink-700">
            {t.radarWahl}
          </label>
          <select id={`${idBasis}-radar`} value={bundesland} onChange={(ev) => setBundesland(ev.target.value)} className={feld}>
            <option value="">{t.bundeslandLeer}</option>
            {BUNDESLAENDER.map((b) => (
              <option key={b.id} value={b.id}>
                {b.label}
              </option>
            ))}
          </select>
        </div>
      </div>
      <ul className="mt-5 divide-y divide-ink-200/70 rounded-2xl bg-white ring-1 ring-ink-200/70">
        {radar.zeilen.map((z) => (
          <li key={z.id} className="grid gap-1 px-4 py-3 sm:grid-cols-[minmax(0,1fr)_auto_auto] sm:items-center sm:gap-4 md:px-5">
            <div className="min-w-0">
              <p className="text-[14px] font-semibold text-ink-800">{t.zeilen[z.id] || (z.id === "kavSonder" ? `${t.zeilen.kav} · ${t.radarSonder}` : z.id === "kavTarif" ? `${t.zeilen.kav} · ${t.radarTarif}` : z.label)}</p>
              <p className="text-[12px] text-ink-500">
                {t.gilt[z.gilt]}
                {z.zusatz ? ` · ${t.radarUeber(f, z.zusatz)}` : ""}
              </p>
            </div>
            <p className="ov-num text-[14px] font-semibold text-ink-900 sm:text-right">
              {z.stufen ? z.stufen.map((s) => f.fmt(s.ct, 2)).join(" · ") + " ct" : z.ct === null ? t.radarNetz : `${f.fmt(z.ct, 3)} ct`}
            </p>
            <StufenMarke stufe={z.stufe} t={t} />
          </li>
        ))}
      </ul>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <div className="rounded-2xl bg-white p-4 ring-1 ring-ink-200/70">
          <p className="text-[12.5px] font-medium text-ink-500">
            {t.radarSumme} · {t.radarSonder}
            {name ? ` · ${t.radarIn(name)}` : ""}
          </p>
          <p className="ov-num mt-1 font-display text-[22px] font-extrabold text-ink-900">{f.fmt(radar.summeSonder, 3)} ct/kWh</p>
        </div>
        <div className="rounded-2xl bg-white p-4 ring-1 ring-ink-200/70">
          <p className="text-[12.5px] font-medium text-ink-500">
            {t.radarSumme} · {t.radarTarif}
            {name ? ` · ${t.radarIn(name)}` : ""}
          </p>
          <p className="ov-num mt-1 font-display text-[22px] font-extrabold text-ink-900">
            {f.fmt(radar.summeTarif.min, 3)}–{f.fmt(radar.summeTarif.max, 3)} ct/kWh
          </p>
        </div>
      </div>
      <p className="mt-3 text-[12px] text-ink-500">
        {t.stand} {t.datum(radar.stand.abruf)} · netztransparenz.de, StromStG, KAV
      </p>
    </section>
  );
}
