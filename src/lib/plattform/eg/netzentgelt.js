// src/lib/plattform/eg/netzentgelt.js
//
// Netzentgelt-Regeltabelle (Fachkonzept 1.2, 1.3, 3.3, 4.4, 4.6) – datums-, modell-/zonen- und netzebenenabhängig statt
// „Rabatt je Form“ (ersetzt mitglied/gemeinschaft.js rabattFuer). Reine Funktionen. Python-Spiegel: eg_stamm_kern.py.
//
// Bis 31.12.2026: SNE-V 2018 § 5 Abs. 1a – reduzierter Netznutzungs-Arbeitspreis nur für EEG: lokal −57 % (NE 6, 7),
// regional −28 % (NE 6, 7) bzw. −64 % (NE 4, 5); BEG, P2P, Eigenversorgung keine Reduktion. Der reduzierte Arbeitspreis
// wird in ct/kWh auf zwei Kommastellen kaufmännisch gerundet (§ 5 Abs. 1a letzter Satz).
// Hinweis: Die Marktanalyse (EG-MARKT.md 1.5) nennt für Okt.–Dez. 2026 eine „Übergangslücke ohne reduzierte Netzentgelte“;
// das Fachkonzept geht vom Weitergelten der SNE-V 2018 bis 31.12.2026 aus. Maßgeblich ist ohnehin die Netzrechnung des
// Netzbetreibers – die Plattform weist die Ersparnis nur als Schätzung aus (zu bestätigen).
// Ab 01.01.2027: neue SNE-VO nach Zonelevel – Werte sind PLATZHALTER (Arbeitshypothese des Fachkonzepts), Status
// „platzhalter“, bis die Verordnung kundgemacht ist.
// Elektrizitätsabgabe und arbeitsbezogener Erneuerbaren-Förderbeitrag: Befreiung nur für Eigendeckung in EEG (und
// Eigendeckung hinter dem Zähler bei GEA) [EAG § 75 Abs. 5; Koordinationsstelle; Reichweite unter dem ElWG zu bestätigen].

const SNE = "https://www.ris.bka.gv.at/geltendefassung.wxe?abfrage=bundesnormen&gesetzesnummer=20010107";
const SNE_NEU = "https://www.e-control.at/documents/1785851/0/V+SNE+01_26+SNE-G-V+Begutachtungsentwurf+samt+Erl%C3%A4uterungen.pdf/1425ce2f-897d-bea7-b8e6-e84f67f978ab";
const ALT_BIS = "2026-12-31";
const NEU_AB = "2027-01-01";

const r = (id, d) => ({ id, gueltigAb: "", gueltigBis: "", modelle: [], zonelevel: [], abgabenBefreitModelle: [], quelleUrl: SNE, ...d });

/** @type {import("./modell.js").EgNetzentgeltRegel[]} */
export const NETZENTGELT_REGELN = [
  // ---- bis 31.12.2026 (bezug: modell, EEG lokal = Zonelevel 3, regional = 4/5)
  r("ENR-2026-EEG-LOKAL", { gueltigBis: ALT_BIS, bezug: "modell", modelle: ["eeg"], zonelevel: [3], netzebenen: [6, 7], reduktionPct: 57, abgabenBefreitModelle: ["eeg"], quelle: "SNE-V 2018 § 5 Abs. 1a (EEG lokal, NE 6/7)", status: "gesichert" }),
  r("ENR-2026-EEG-REG-NS", { gueltigBis: ALT_BIS, bezug: "modell", modelle: ["eeg"], zonelevel: [4, 5], netzebenen: [6, 7], reduktionPct: 28, abgabenBefreitModelle: ["eeg"], quelle: "SNE-V 2018 § 5 Abs. 1a (EEG regional, NE 6/7)", status: "gesichert" }),
  r("ENR-2026-EEG-REG-MS", { gueltigBis: ALT_BIS, bezug: "modell", modelle: ["eeg"], zonelevel: [4, 5], netzebenen: [4, 5], reduktionPct: 64, abgabenBefreitModelle: ["eeg"], quelle: "SNE-V 2018 § 5 Abs. 1a (EEG regional, NE 4/5)", status: "gesichert" }),
  r("ENR-2026-GEA", { gueltigBis: ALT_BIS, bezug: "modell", modelle: ["gea"], zonelevel: [1, 2], netzebenen: [7], reduktionPct: 100, abgabenBefreitModelle: ["gea"], quelle: "Eigendeckung hinter dem Netzanschluss ohne Netznutzung (ElWG § 68; Koordinationsstelle)", status: "entwurf" }),
  r("ENR-2026-BEG", { gueltigBis: ALT_BIS, bezug: "modell", modelle: ["beg", "p2p", "eigenversorgung"], zonelevel: [1, 2, 3, 4, 5, 6, 7], netzebenen: [3, 4, 5, 6, 7], reduktionPct: 0, quelle: "SNE-V 2018 § 5 Abs. 1a gilt nur für EEG", status: "gesichert" }),
  // ---- ab 01.01.2027 (bezug: zonelevel) – PLATZHALTER bis zur neuen SNE-VO
  r("ENR-2027-Z1-2", { gueltigAb: NEU_AB, bezug: "zonelevel", zonelevel: [1, 2], netzebenen: [7], reduktionPct: 100, abgabenBefreitModelle: ["eeg", "gea"], quelleUrl: SNE_NEU, quelle: "Arbeitshypothese Fachkonzept 1.3: keine Netzkosten für Eigendeckung (neue SNE-VO)", status: "platzhalter" }),
  r("ENR-2027-Z3", { gueltigAb: NEU_AB, bezug: "zonelevel", zonelevel: [3], netzebenen: [6, 7], reduktionPct: 57, abgabenBefreitModelle: ["eeg"], quelleUrl: SNE_NEU, quelle: "Arbeitshypothese Fachkonzept 1.3 (Lokalbereich, neue SNE-VO)", status: "platzhalter" }),
  r("ENR-2027-Z4-5-NS", { gueltigAb: NEU_AB, bezug: "zonelevel", zonelevel: [4, 5], netzebenen: [6, 7], reduktionPct: 28, abgabenBefreitModelle: ["eeg"], quelleUrl: SNE_NEU, quelle: "Arbeitshypothese Fachkonzept 1.3 (Regionalbereich NE 6/7, neue SNE-VO)", status: "platzhalter" }),
  r("ENR-2027-Z4-5-MS", { gueltigAb: NEU_AB, bezug: "zonelevel", zonelevel: [4, 5], netzebenen: [4, 5], reduktionPct: 64, abgabenBefreitModelle: ["eeg"], quelleUrl: SNE_NEU, quelle: "Arbeitshypothese Fachkonzept 1.3 (Regionalbereich NE 4/5, neue SNE-VO)", status: "platzhalter" }),
  r("ENR-2027-Z6-7", { gueltigAb: NEU_AB, bezug: "zonelevel", zonelevel: [6, 7], netzebenen: [3, 4, 5, 6, 7], reduktionPct: 0, quelleUrl: SNE_NEU, quelle: "Arbeitshypothese Fachkonzept 1.3 (keine Verbindung)", status: "platzhalter" }),
];

const imZeitraum = (x, d) => (!x.gueltigAb || x.gueltigAb <= d) && (!x.gueltigBis || x.gueltigBis >= d);

/**
 * Anwendbare Regel für einen Tag. Ohne Treffer: { regel: null, reduktionPct: 0, … „keine Reduktion“ }.
 * @param {{datum:string, modell:string, zonelevel:number, netzebene:number}} k
 */
export function netzentgeltRegel({ datum, modell, zonelevel, netzebene }, regeln = NETZENTGELT_REGELN) {
  const d = String(datum || "").slice(0, 10);
  const z = Number(zonelevel);
  const ne = Number(netzebene) || 7;
  const treffer = regeln.find((x) => imZeitraum(x, d) && x.netzebenen.includes(ne) && (x.bezug === "modell" ? x.modelle.includes(modell) && (!x.zonelevel.length || x.zonelevel.includes(z)) : x.zonelevel.includes(z)));
  if (!treffer) return { regel: null, reduktionPct: 0, faktor: 0, abgabenBefreit: false, status: "gesichert", quelle: "keine Reduktion", text: "keine Netzentgelt-Reduktion" };
  const pct = treffer.reduktionPct ?? 0;
  return {
    regel: treffer.id, reduktionPct: pct, faktor: pct / 100, abgabenBefreit: treffer.abgabenBefreitModelle.includes(modell), status: treffer.status, quelle: treffer.quelle,
    text: `${pct > 0 ? `−${pct} % Netznutzungs-Arbeitspreis` : "keine Netzentgelt-Reduktion"}${treffer.status === "platzhalter" ? " (Platzhalter bis zur neuen SNE-VO)" : ""}`,
  };
}

/** Kaufmännisch auf 2 Kommastellen (ct/kWh) – SNE-V 2018 § 5 Abs. 1a letzter Satz */
export const rundeCt2 = (x) => Math.sign(x) * Math.round(Math.abs(Number(x) || 0) * 100 + 1e-9) / 100;

/** Reduzierter Netznutzungs-Arbeitspreis in ct/kWh (gerundet) */
export const reduzierterAp = (apCt, reduktionPct) => rundeCt2((Number(apCt) || 0) * (1 - (Number(reduktionPct) || 0) / 100));

/** Regeln, die an einem Stichtag gelten (für Anzeige) */
export const regelnAm = (stichtag, regeln = NETZENTGELT_REGELN) => regeln.filter((x) => imZeitraum(x, String(stichtag || "").slice(0, 10)));
