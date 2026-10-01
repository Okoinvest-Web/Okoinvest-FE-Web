// src/lib/plattform/eg/foerder.js
//
// WP5 – Förder-Check für Energiegemeinschaften und ihre Anlagen (Fachkonzept 6.2 Punkt 7; Marktanalyse 5 Punkt 14):
// Bund (EAG-Investitionszuschuss PV und Speicher, EAG-Marktprämie), Klima- und Energiefonds, Umweltförderung im Inland,
// Kommunalinvestitionen, Landes-Energieberatungen. Jede Angabe mit Quelle und Stand; Förderhöhen, Calls und Fristen
// ändern sich laufend und sind (zu bestätigen) – der Check sagt „geeignet“, „prüfen“ oder „nicht geeignet“ mit Gründen,
// nie eine Zusage. Keine Förderberatung im Rechtssinn.
// Reine Funktionen; Python-Spiegel plattform/eg_gruendung_kern.py (Testvektoren eg/testdaten/gruendung/foerder.json).

export const FOERDER_STAND = "2026-10-01";
export const FOERDER_ERGEBNIS = { geeignet: { label: "geeignet", ton: "ok" }, pruefen: { label: "prüfen", ton: "warn" }, nicht_geeignet: { label: "nicht geeignet", ton: "neutral" } };

/** Kategorien des EAG-Investitionszuschusses Photovoltaik (EAG-Investitionszuschüsseverordnung-Strom, zu bestätigen) */
export const EAG_PV_KATEGORIEN = [
  { id: "A", bisKwp: 10, label: "Kategorie A (bis 10 kWp)" },
  { id: "B", bisKwp: 20, label: "Kategorie B (über 10 bis 20 kWp)" },
  { id: "C", bisKwp: 100, label: "Kategorie C (über 20 bis 100 kWp)" },
  { id: "D", bisKwp: 1000, label: "Kategorie D (über 100 bis 1.000 kWp)" },
];

/**
 * Programme. `traeger`, `art` (zuschuss | praemie | programm | beratung), `quelle`, `quelleUrl`, `status` (gesichert | zu_bestaetigen).
 * Die Regeln (wann geeignet) stehen in foerderCheck().
 */
export const FOERDER_PROGRAMME = {
  eag_invest_pv: { titel: "EAG-Investitionszuschuss Photovoltaik", traeger: "EAG-Förderabwicklungsstelle (OeMAG)", art: "zuschuss", ebene: "bund", quelle: "EAG § 56; EAG-Investitionszuschüsseverordnung-Strom; WKO „EAG-Investitionszuschuss 2026“", quelleUrl: "https://www.eag-abwicklungsstelle.at/wissen/investitionszuschuss-photovoltaik-und-speicher/", status: "zu_bestaetigen", text: "Einmaliger Zuschuss je kWp für neue PV-Anlagen in Fördercalls; Kategorien nach Leistung. Fördersätze, Calltermine und eine allfällige Obergrenze für Gemeinschaften laut aktuellem Call." },
  eag_invest_speicher: { titel: "EAG-Investitionszuschuss Stromspeicher", traeger: "EAG-Förderabwicklungsstelle (OeMAG)", art: "zuschuss", ebene: "bund", quelle: "EAG § 56; EAG-Investitionszuschüsseverordnung-Strom", quelleUrl: "https://www.eag-abwicklungsstelle.at/wissen/investitionszuschuss-photovoltaik-und-speicher/", status: "zu_bestaetigen", text: "Zuschuss für Stromspeicher in Verbindung mit einer PV-Anlage; Mindestgröße im Verhältnis zur PV-Leistung laut Call." },
  eag_marktpraemie: { titel: "EAG-Marktprämie", traeger: "EAG-Förderabwicklungsstelle (OeMAG)", art: "praemie", ebene: "bund", quelle: "EAG §§ 9 ff., § 80; Fachkonzept 1.2", quelleUrl: "https://www.ris.bka.gv.at/GeltendeFassung.wxe?Abfrage=Bundesnormen&Gesetzesnummer=20011619", status: "zu_bestaetigen", text: "Laufende Prämie auf eingespeisten Strom (Ausschreibung bzw. Antrag je Technologie). In EEG und BEG nur für die nicht in der Gemeinschaft verbrauchte Menge; laut Fachkonzept für höchstens 50 % der Erzeugung." },
  klimafonds: { titel: "Programme des Klima- und Energiefonds", traeger: "Klima- und Energiefonds", art: "programm", ebene: "bund", quelle: "klimafonds.gv.at (z. B. Klima- und Energie-Modellregionen, Leitprojekte; EEG Faktura entstand als KEM-Projekt)", quelleUrl: "https://www.klimafonds.gv.at/", status: "zu_bestaetigen", text: "Jährliche Ausschreibungen für Regionen, Gemeinden und Projekte – häufig für Beratung, Pilotierung und Bürgerbeteiligung. Laufende Calls prüfen." },
  umweltfoerderung: { titel: "Umweltförderung im Inland (Betriebe)", traeger: "Kommunalkredit Public Consulting (KPC)", art: "zuschuss", ebene: "bund", quelle: "umweltfoerderung.at", quelleUrl: "https://www.umweltfoerderung.at/", status: "zu_bestaetigen", text: "Förderungen für Betriebe, Vereine und Gemeinden, z. B. Energieeffizienz und Energiemanagement; ob PV bzw. Speicher im konkreten Fall förderfähig sind, hängt von der Förderaktion ab." },
  kommunal: { titel: "Kommunalinvestitionen (Gemeinden)", traeger: "Bund (KPC)", art: "zuschuss", ebene: "bund", quelle: "Kommunalinvestitionsgesetz (aktuelle Fassung, zu bestätigen)", quelleUrl: "https://www.umweltfoerderung.at/", status: "zu_bestaetigen", text: "Gemeinden können Investitionen in Energieeffizienz und erneuerbare Energie über kommunale Investitionsprogramme fördern lassen; Laufzeit und Mittel prüfen." },
  koordinationsstelle: { titel: "Koordinationsstelle für Energiegemeinschaften", traeger: "Klima- und Energiefonds / Bund", art: "beratung", ebene: "bund", quelle: "energiegemeinschaften.gv.at", quelleUrl: "https://energiegemeinschaften.gv.at/", status: "gesichert", text: "Kostenlose Information, Muster (Statuten, Verträge, Lieferbedingungen), Benefit-Tool und Ansprechstellen in den Bundesländern." },
  land_O: { titel: "OÖ Energiesparverband", traeger: "Land Oberösterreich", art: "beratung", ebene: "land", land: "O", quelle: "energiesparverband.at", quelleUrl: "https://www.energiesparverband.at/", status: "zu_bestaetigen", text: "Energieberatung und Informationen zu Landesförderungen in Oberösterreich." },
  land_N: { titel: "Energie- und Umweltagentur NÖ (eNu)", traeger: "Land Niederösterreich", art: "beratung", ebene: "land", land: "N", quelle: "enu.at", quelleUrl: "https://www.enu.at/", status: "zu_bestaetigen", text: "Beratung zu Energiegemeinschaften und Landesförderungen in Niederösterreich." },
  land_W: { titel: "Beratungsservice Erneuerbare Energie Wien", traeger: "Stadt Wien", art: "beratung", ebene: "land", land: "W", quelle: "erneuerbare-energie.wien (Mustervorlagen ElWG)", quelleUrl: "https://www.erneuerbare-energie.wien/", status: "gesichert", text: "Beratung und Mustervorlagen für Energiegemeinschaften in Wien." },
  land_T: { titel: "Energieagentur Tirol", traeger: "Land Tirol", art: "beratung", ebene: "land", land: "T", quelle: "energieagentur.tirol", quelleUrl: "https://www.energieagentur.tirol/", status: "zu_bestaetigen", text: "Beratung und Landesförderungen in Tirol." },
  land_V: { titel: "Energieinstitut Vorarlberg", traeger: "Land Vorarlberg", art: "beratung", ebene: "land", land: "V", quelle: "energieinstitut.at", quelleUrl: "https://www.energieinstitut.at/", status: "zu_bestaetigen", text: "Beratung und Landesförderungen in Vorarlberg." },
  land_sonst: { titel: "Landesförderung und Energieberatung des Bundeslandes", traeger: "Land", art: "beratung", ebene: "land", quelle: "Ansprechstellen laut Koordinationsstelle", quelleUrl: "https://energiegemeinschaften.gv.at/", status: "zu_bestaetigen", text: "Landesförderungen für PV, Speicher und Energiegemeinschaften wechseln häufig – vor der Planung bei der Landes-Energieberatung prüfen." },
};

const kategoriePv = (kwp) => EAG_PV_KATEGORIEN.find((k) => kwp <= k.bisKwp) || null;
const r1 = (x) => Math.round((Number(x) || 0) * 10) / 10;

/**
 * Förder-Check.
 * @param {{modell?:string, bundesland?:string, antragsteller?:"eg"|"privat"|"landwirt"|"unternehmen"|"gemeinde", gemeindeBeteiligt?:boolean,
 *          anlagen?:{art:string, kwp?:number, speicherKwh?:number, status?:"geplant"|"in_bau"|"in_betrieb", bezeichnung?:string}[], stichtag?:string}} d
 * @returns {{stand:string, treffer:object[], hinweise:string[], fristen:object[], kennzahlen:object}}
 */
export function foerderCheck(d = {}) {
  const anlagen = (Array.isArray(d.anlagen) ? d.anlagen : []).slice(0, 50).map((a) => ({ art: String(a.art || "pv"), kwp: Math.max(0, Number(a.kwp) || 0), speicherKwh: Math.max(0, Number(a.speicherKwh) || 0), status: ["geplant", "in_bau", "in_betrieb"].includes(a.status) ? a.status : "geplant", bezeichnung: String(a.bezeichnung || "").slice(0, 80) }));
  const modell = d.modell || "eeg";
  const neuPv = anlagen.filter((a) => a.art === "pv" && a.status !== "in_betrieb");
  const altPv = anlagen.filter((a) => a.art === "pv" && a.status === "in_betrieb");
  const speicher = anlagen.filter((a) => (a.art === "speicher" || a.speicherKwh > 0) && a.status !== "in_betrieb");
  const erzeugend = anlagen.filter((a) => ["pv", "wind", "wasser", "biomasse"].includes(a.art));
  const T = [];
  const P = (id, ergebnis, gruende, bedingungen = [], naechster = "") => T.push({ id, ...FOERDER_PROGRAMME[id], ergebnis, ergebnisLabel: FOERDER_ERGEBNIS[ergebnis].label, ton: FOERDER_ERGEBNIS[ergebnis].ton, gruende, bedingungen, naechsterSchritt: naechster });

  // EAG-Investitionszuschuss PV
  if (neuPv.length) {
    const passend = neuPv.filter((a) => a.kwp > 0 && a.kwp <= 1000);
    const gross = neuPv.filter((a) => a.kwp > 1000);
    const gruende = passend.map((a) => `${a.bezeichnung || "PV-Anlage"} ${r1(a.kwp)} kWp → ${kategoriePv(a.kwp).label}`);
    if (gross.length) gruende.push(`${gross.length} Anlage(n) über 1.000 kWp – Investitionszuschuss nicht vorgesehen, Marktprämie prüfen (zu bestätigen).`);
    P("eag_invest_pv", passend.length ? "pruefen" : "nicht_geeignet", gruende, ["Antrag im Fördercall vor der Bestellung bzw. vor Baubeginn (zu bestätigen)", "Investitionszuschuss und Marktprämie für dieselbe Anlage nicht kombinierbar (zu bestätigen)", "Fördersatz je kWp und Calltermine laut Abwicklungsstelle"], "Calltermine 2026 bei der EAG-Abwicklungsstelle prüfen und Antrag vorbereiten.");
  } else if (altPv.length) P("eag_invest_pv", "nicht_geeignet", ["Alle PV-Anlagen sind bereits in Betrieb – ein Investitionszuschuss ist nur für neue Anlagen möglich (zu bestätigen)."]);
  else P("eag_invest_pv", "nicht_geeignet", ["Keine geplante PV-Anlage angegeben."]);

  // Speicher
  if (speicher.length) P("eag_invest_speicher", neuPv.length || anlagen.some((a) => a.art === "pv") ? "pruefen" : "nicht_geeignet", speicher.map((a) => `${a.bezeichnung || "Speicher"} ${r1(a.speicherKwh || a.kwp)} kWh`), ["nur in Verbindung mit einer PV-Anlage (zu bestätigen)", "Mindestverhältnis kWh je kWp laut Call (zu bestätigen)"], "Speichergröße mit der Simulation (WP3) abstimmen.");

  // Marktprämie
  if (erzeugend.length) {
    const g = [];
    if (["eeg", "beg"].includes(modell)) g.push("In der Gemeinschaft verbrauchte Mengen erhalten keine Marktprämie – nur der Restüberschuss; laut Fachkonzept höchstens 50 % der Erzeugung.");
    if (erzeugend.some((a) => a.art !== "pv")) g.push("Wind, Wasser und Biomasse: Marktprämie je Technologie (Ausschreibung bzw. Antrag).");
    if (neuPv.some((a) => a.kwp > 1000)) g.push("Große PV-Anlagen: Marktprämie über Ausschreibung.");
    P("eag_marktpraemie", g.length ? "pruefen" : "nicht_geeignet", g.length ? g : ["Für kleine PV-Anlagen ist der Investitionszuschuss der übliche Weg."], ["nicht mit dem Investitionszuschuss derselben Anlage kombinierbar (zu bestätigen)"]);
  }

  // Klima- und Energiefonds, Umweltförderung, Kommunal
  P("klimafonds", "pruefen", [d.gemeindeBeteiligt || d.antragsteller === "gemeinde" ? "Gemeinde beteiligt – Programme für Regionen und Gemeinden (z. B. KEM) prüfen." : "Programme richten sich häufig an Regionen, Gemeinden und Pilotprojekte."], ["Ausschreibungen sind befristet"]);
  if (["unternehmen", "landwirt", "gemeinde", "eg"].includes(d.antragsteller || "eg")) P("umweltfoerderung", "pruefen", ["Antragsteller ist Betrieb, Gemeinde bzw. juristische Person – Förderaktionen der Umweltförderung im Inland prüfen."], ["Antrag in der Regel vor Umsetzung (zu bestätigen)"]);
  if (d.gemeindeBeteiligt || d.antragsteller === "gemeinde") P("kommunal", "pruefen", ["Gemeinde investiert selbst (z. B. PV auf Gemeindegebäuden für die Gemeinschaft)."], ["Gemeinderatsbeschluss", "fremdübliche Preise in der Gemeinschaft (Beihilferecht, Fachkonzept 2.5)"]);
  P("koordinationsstelle", "geeignet", ["Kostenlose Muster und Beratung für jede Gemeinschaft."]);
  const landId = `land_${d.bundesland}`;
  P(FOERDER_PROGRAMME[landId] ? landId : "land_sonst", "geeignet", [`Landes-Energieberatung${d.bundesland ? "" : " (Bundesland angeben)"} – aktuelle Landesförderungen erfragen.`]);

  const hinweise = [
    "Förderzusagen gibt nur die Förderstelle. Alle Angaben ohne Gewähr; Fördersätze und Fristen (zu bestätigen).",
    "Bei Investitionen der Gemeinschaft: Finanzierung über Mitgliedsbeiträge, Geschäftsanteile (eGen) oder Bürgerbeteiligung prüfen – ÖkoInvest unterstützt Projektierung und Bau über die ÖKOVOLT-Gruppe.",
  ];
  if (modell === "beg") hinweise.push("BEG: keine Netzentgelt-Reduktion bis 31.12.2026 – die Wirtschaftlichkeit hängt stärker an Förderung und Preisen.");
  const fristen = [];
  if (neuPv.length) fristen.push({ text: "EAG-Fördercall PV: Termine laut Abwicklungsstelle (zu bestätigen) – Antrag vor Bestellung", quelleUrl: FOERDER_PROGRAMME.eag_invest_pv.quelleUrl });
  fristen.push({ text: "Klima- und Energiefonds: laufende Ausschreibungen prüfen", quelleUrl: FOERDER_PROGRAMME.klimafonds.quelleUrl });
  return {
    stand: FOERDER_STAND, treffer: T, hinweise, fristen,
    kennzahlen: { anlagen: anlagen.length, pvNeuKwp: r1(neuPv.reduce((s, a) => s + a.kwp, 0)), speicherKwh: r1(speicher.reduce((s, a) => s + (a.speicherKwh || a.kwp), 0)), geeignet: T.filter((x) => x.ergebnis === "geeignet").length, pruefen: T.filter((x) => x.ergebnis === "pruefen").length },
  };
}
