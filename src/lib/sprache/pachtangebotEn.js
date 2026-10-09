// src/lib/sprache/pachtangebotEn.js – englische Texte zum Pachtangebot-Check
//
// Die Bewertung (Ampel, Zahlen) kommt unverändert aus pruefePachtangebot() (src/lib/rechner/pachtangebot.js).
// Hier stehen nur die englischen Texte zu derselben Bewertung: gleiche Bedingungen, gleiche Werte.
// Ändert sich die Klausellogik dort, hier nachziehen (Test: src/lib/sprache/pachtangebotEn.test.mjs).

import { marktFuer } from "../invest/laender/marktFuer.js";
import { fmtZahl } from "./format.js";

const z = (n, s = 0) => fmtZahl(n, s, "en");
const eur = (n, einheit = "") => `€${z(n)}${einheit}`;
const optionText = (text) => String(text).replace(/ Jahre Option$/, "-year option");

export const OPTIONEN_EN = {
  flaechenart: { freiflaeche: ["Ground-mounted PV", "land used entirely for the park"], agri: ["Agrivoltaics", "farming continues"] },
  modell: { fest: ["Fixed €/ha", "annual lease"], umsatz: ["Revenue", "% of revenue"], kombi: ["Combined", "revenue + minimum lease"] },
  indexArt: { keine: ["None", "amount stays the same"], vpi: ["CPI", "consumer prices"], fest: ["Fixed", "% per year"] },
  rueckbau: { buergschaft: ["Bank guarantee", "or insurance"], konzern: ["Parent guarantee", "parent company liable"], ruecklage: ["Reserve", "saved during operation"], keine: ["None", "not regulated"] },
  rueckbauAb: { baubeginn: ["From start of construction"], spaeter: ["Only later"] },
  kuendigung: { befristet: ["Until construction", "withdrawal time-limited"], unbefristet: ["Open", "withdrawal without deadline"], jederzeit: ["Any time", "even during operation"] },
  nebenflaechen: { keine: ["None", "leased area only"], verguetet: ["Paid", "access, cable, compensation"], teilweise: ["Partly", "only some"], unentgeltlich: ["Free of charge", "without payment"] },
  nichtbau: { entschaedigung: ["Compensation", "+ return"], rueckgabe: ["Return only", "without payment"], nichts: ["Not regulated"] },
  bewirtschaftung: { mitEntschaedigung: ["Yes + compensation", "crop loss paid"], ohne: ["Yes, without compensation"], nein: ["No", "land lies idle"] },
  dienstbarkeit: { baubeginn: ["From financing", "entry before construction"], sofortLoeschung: ["Immediately", "with deletion obligation"], sofortOhne: ["Immediately", "without deletion rule"] },
  anwalt: { voll: ["In full", "lessee pays"], gedeckelt: ["Capped", "up to amount X"], keine: ["None", "you pay yourself"] },
};

/** Auswahlliste mit englischen Texten (id, Werte und Reihenfolge bleiben). */
export const optionenEn = (liste, gruppe) => liste.map((o) => ({ ...o, label: OPTIONEN_EN[gruppe]?.[o.id]?.[0] ?? o.label, sub: OPTIONEN_EN[gruppe]?.[o.id]?.[1] ?? o.sub }));

const lbl = (gruppe, id) => OPTIONEN_EN[gruppe]?.[id]?.[0] ?? id;
const sub = (gruppe, id) => OPTIONEN_EN[gruppe]?.[id]?.[1] ?? "";

export const URTEIL_EN = {
  gut: { titel: "Solid offer", text: "The key points are settled in line with the market. Have the contract text reviewed by a lawyer all the same." },
  kritisch: { titel: "Renegotiate substantially", text: "Several central points are below market standard. Do not sign before these have been clarified." },
  pruefen: { titel: "Renegotiate", text: "The direction is right, but you should improve individual clauses or have them clarified in writing." },
};

export const STANDARDFRAGEN_EN = [
  "Who is the contracting party – a project company? May the contract be transferred to third parties without my consent?",
  "Which insurance policies are in place (liability, damage to neighbouring land), and who is liable for damage to the soil?",
  "How is the condition of the land after decommissioning defined (foundations, cables, soil compaction)?",
  "What does the lease mean for inheritance and property tax and for classification as agricultural and forestry assets? (Involve your tax adviser.)",
  "Which documents will I receive, and may I offer the land elsewhere if the project fails?",
];

/** Englische Fassung einer Klausel (titel, wert, text, frage) zu derselben Bewertung. */
function klauselEn(k, r) {
  const e = r.eingabe;
  const { PACHT, FREIFLAECHE } = marktFuer("DE");
  const spanne = r.spanne;
  const rb = `€${z(Math.round(r.rueckbauKosten / 1000) * 1000)}`;
  switch (k.id) {
    case "hoehe": {
      const p1 = r.proHaErstesJahr;
      return {
        titel: "Lease amount",
        wert: `${eur(p1, "/ha")} in the 1st operating year`,
        text:
          k.ampel === "kritisch"
            ? `Below the usual range of ${eur(spanne.min)}–${eur(spanne.max, "/ha")}. This may be due to the grid, size or planning law – ask for the calculation to be explained and obtain a comparative offer.`
            : k.ampel === "pruefen"
              ? `In the lower part of the usual range (${eur(spanne.min)}–${eur(spanne.max, "/ha")}). With a nearby grid connection and a good eligible area, more is often possible.`
              : `In the upper part of the usual range (${eur(spanne.min)}–${eur(spanne.max, "/ha")}). Make sure the other clauses do not devalue the lease again.`,
        frage: "How is the offered lease made up, and which assumptions on grid connection, capacity and revenue is it based on?",
      };
    }
    case "modell": {
      const ohneMindest = e.modell === "umsatz";
      return {
        titel: "Revenue share",
        wert: `${z(e.umsatzAnteil * 100, 1)}% of power revenue${e.modell === "kombi" ? `, min. ${eur(e.mindestProHa, "/ha")}` : ", without minimum lease"}`,
        text: ohneMindest
          ? "Without a minimum lease, you bear the full price and yield risk – including curtailment and negative electricity prices. A combination with a minimum lease is usual."
          : `${z(PACHT.umsatzbeteiligung.min * 100)}–${z(PACHT.umsatzbeteiligung.max * 100)}% of revenue is usual. Important: what exactly does the percentage refer to (net power revenue, including the market premium, after direct marketing costs?) and what right of inspection do you have?`,
        frage: "Which revenues exactly does the revenue share refer to, how is it settled, and what right do I have to inspect the statements?",
      };
    }
    case "index": {
      const idxWirkt = e.modell !== "umsatz";
      const kaufkraft = 1 / Math.pow(1 + FREIFLAECHE.inflation, e.laufzeit);
      const idxSatz = e.indexArt === "vpi" ? PACHT.indexierung : e.indexArt === "fest" ? e.indexSatz : 0;
      return {
        titel: "Value protection (indexation)",
        wert: !idxWirkt ? "via revenue" : e.indexArt === "keine" ? "none" : e.indexArt === "vpi" ? "Consumer price index" : `fixed ${z(e.indexSatz * 100, 1)}% p.a.`,
        text: !idxWirkt
          ? "A pure revenue share grows with the electricity price and generation – separate indexation is not needed."
          : e.indexArt === "keine"
            ? `Without value protection, the last annual lease payment at ${z(FREIFLAECHE.inflation * 100)}% inflation has only around ${z(kaufkraft * 100)}% of today’s purchasing power. Adjustment to the consumer price index or a fixed step-up is usual.`
            : idxSatz < 0.01
              ? "The increase is below usual inflation – the lease loses value in real terms."
              : "The lease is protected against inflation. Check whether the adjustment applies annually or only above a threshold, and whether it can also work downwards.",
        frage: "How is the lease protected against inflation – index, base year, adjustment interval, threshold – and does this also apply to the minimum lease?",
      };
    }
    case "laufzeit": {
      const gesamt = e.laufzeit + e.verlaengerungJahre;
      const ueblich = `${PACHT.laufzeit} years fixed plus ${optionText(PACHT.verlaengerung)}`;
      return {
        titel: "Term and extension",
        wert: `${e.laufzeit} years fixed${e.verlaengerungJahre ? ` + ${e.verlaengerungJahre}-year option` : ""}`,
        text:
          e.laufzeit < 20
            ? "Below 20 years, a solar park is hard to finance – this may jeopardise the project itself. Ask whether the developer can build on this basis."
            : e.laufzeit > PACHT.festlaufzeitMax + 5 || gesamt > 45
              ? `A commitment of ${gesamt} years reaches far into the next generation. ${ueblich} is usual.`
              : e.laufzeit > PACHT.festlaufzeitMax || e.verlaengerungJahre > PACHT.verlaengerungMax
                ? `Somewhat longer than usual (${PACHT.laufzeit} years + ${optionText(PACHT.verlaengerung)}). Make sure extensions can only be exercised on adjusted terms and with notice.`
                : "Market standard. Important: does the term start when the contract is signed or only at the start of construction/commissioning – and does it end at a fixed date at the latest?",
        frage: "From when does the fixed term run, on what terms are options exercised, and is there a latest end date?",
      };
    }
    case "reservierung": {
      const res = e.reservierungProHa;
      return {
        titel: "Reservation fee until construction",
        wert: res > 0 ? `${eur(res, "/ha")} per year` : "none",
        text:
          res <= 0
            ? `Without a fee, you commit the land for years without being paid for it. ${eur(PACHT.reservierungProHa.min)}–${eur(PACHT.reservierungProHa.max, "/ha")} per year until construction is usual.`
            : res < PACHT.reservierungProHa.min
              ? `Below the usual level (${eur(PACHT.reservierungProHa.min)}–${eur(PACHT.reservierungProHa.max, "/ha·yr")}).`
              : "Market standard. As a rule, you continue to farm the land until construction starts.",
        frage: "Is the reservation fee paid annually in advance, and is it credited against the later lease?",
      };
    }
    case "optionsfrist": {
      const of = e.optionsfrist;
      return {
        titel: "Longest period until construction",
        wert: of === 0 ? "unlimited" : `${of} years`,
        text:
          of === 0
            ? "Without a latest date for the start of construction, the land can be blocked indefinitely. Agree a fixed deadline with automatic termination of the contract."
            : of > PACHT.reservierungJahre.max
              ? `Longer than usual. Planning and approval often take ${PACHT.reservierungJahre.ueblich}–${PACHT.reservierungJahre.max} years – an extension should only be possible against a higher fee.`
              : of > PACHT.reservierungJahre.ueblich
                ? "Acceptable if the fee increases during the extension and you are released afterwards."
                : "Short and clear. Check whether the developer can realistically obtain planning permission and a grid connection within this time.",
        frage: "By what date must construction start at the latest, and what happens automatically if it does not?",
      };
    }
    case "rueckbau": {
      const r2 = e.rueckbau;
      return {
        titel: "Decommissioning security",
        wert: `${lbl("rueckbau", r2)}${r2 !== "keine" ? (e.rueckbauAb === "baubeginn" ? ", from start of construction" : ", only later") : ""}`,
        text:
          r2 === "keine"
            ? `Without security, in the worst case you are left with the decommissioning – an order of magnitude of ${rb} for this land. A bank guarantee is standard.`
            : r2 === "buergschaft"
              ? e.rueckbauAb === "baubeginn"
                ? `Standard. Look for an unlimited, directly enforceable guarantee from a bank or insurer covering at least the decommissioning costs (order of magnitude ${rb}) and regular adjustment.`
                : "The guarantee should be in place by the start of construction at the latest – not years later."
              : r2 === "konzern"
                ? "A parent company guarantee is only worth as much as the parent company in 30 years’ time. A bank or insurance guarantee is better."
                : "A reserve built up during operation is missing if the operating company becomes insolvent first. Demand a guarantee from the start of construction.",
        frage: "Who provides the decommissioning security, in what amount, from when, and how is it adjusted to rising costs?",
      };
    }
    case "kuendigung":
      return {
        titel: "Termination and withdrawal rights",
        wert: `${lbl("kuendigung", e.kuendigung)} – ${sub("kuendigung", e.kuendigung)}`,
        text:
          e.kuendigung === "befristet"
            ? "Usual: the developer may withdraw as long as nothing has been built – but only until a fixed date. You yourself usually have no ordinary right of termination."
            : e.kuendigung === "unbefristet"
              ? "A right of withdrawal without a deadline leaves you in uncertainty for years. Link it to the latest start-of-construction date."
              : "If the lessee can terminate at any time even during operation, you bear the risk that the park disappears early when electricity prices are poor – along with the lease. This is unusual.",
        frage: "What termination and withdrawal rights do both sides have – before and after the start of construction – and what applies if the operator becomes insolvent?",
      };
    case "nebenflaechen": {
      const nf = e.nebenflaechen;
      return {
        titel: "Ancillary areas (access, cables, compensation)",
        wert: lbl("nebenflaechen", nf),
        text:
          nf === "keine"
            ? "No further areas are used. Clarify whether the cable route and compensation areas might later run over your land after all."
            : nf === "verguetet"
              ? "Good: access routes, cable routes and nature conservation compensation areas are paid for separately."
              : "Cable routes, access roads and compensation areas burden further plots, often through easements for decades. Demand separate remuneration per metre or hectare.",
        frage: "Which further areas (access, cable route, compensation areas) will be used, and how will they be remunerated?",
      };
    }
    case "nichtbau":
      return {
        titel: "Compensation if nothing is built",
        wert: lbl("nichtbau", e.nichtbau),
        text:
          e.nichtbau === "entschaedigung"
            ? "Good: if the project fails, you receive compensation and get the land back unencumbered (including deletion of all entries)."
            : e.nichtbau === "rueckgabe"
              ? "The land comes back, but without compensation for the years of commitment. A settlement payment is negotiable."
              : "Not regulated means a dispute is pre-programmed. Agree on return, deletion of the land register entries and a settlement payment.",
        frage: "What do I receive if the project is not built – compensation, deletion of the entries, handover of the surveys and reports?",
      };
    case "bewirtschaftung":
      return {
        titel: "Farming until construction",
        wert: lbl("bewirtschaftung", e.bewirtschaftung),
        text:
          e.bewirtschaftung === "mitEntschaedigung"
            ? "Good: you continue farming, and crop losses due to soil surveys, land surveying or the start of construction are compensated."
            : e.bewirtschaftung === "ohne"
              ? "Continuing to farm is usual – but damage to crops and land should be compensated, and the start of construction should be announced in advance."
              : "If the land lies idle without a lease, you lose the gross margin and possibly direct payments. This is unusual.",
        frage: "May I continue farming until construction starts, with what notice will construction begin, and who compensates damage to the land?",
      };
    case "dienstbarkeit": {
      const db = e.dienstbarkeit;
      return {
        titel: "Easement and ranking in the land register",
        wert: `${lbl("dienstbarkeit", db)} ${sub("dienstbarkeit", db)}${e.rangruecktritt ? ", subordination required" : ""}`,
        text:
          (db === "baubeginn"
            ? "The limited personal easement is necessary and usual for financing – good if it is only entered once construction is really going ahead."
            : db === "sofortLoeschung"
              ? "Immediate entry (or a priority notice) is common. What matters is the obligation to delete it at the lessee’s expense if nothing is built."
              : "Immediate entry without a deletion rule can encumber your property permanently – even if the project never happens.") +
          (e.rangruecktritt
            ? " The park’s banks usually require first rank: existing land charges have to be subordinated – talk to your bank early, as this can affect your own financing."
            : ""),
        frage: "When will the easement be entered, what rank does it need, who bears the costs and when will it be deleted?",
      };
    }
    case "anwalt": {
      const aw = e.anwalt;
      return {
        titel: "Costs for lawyer and notary",
        wert: aw === "gedeckelt" ? `capped at ${eur(e.anwaltBetrag)}` : lbl("anwalt", aw),
        text:
          aw === "keine"
            ? `It is common for the developer to pay for the owner’s legal review – often ${eur(PACHT.anwaltskosten.min)}–${eur(PACHT.anwaltskosten.max)}. Notary and land register costs are usually borne by the lessee.`
            : aw === "gedeckelt" && e.anwaltBetrag < PACHT.anwaltskosten.min
              ? `The cap is tight – a thorough review often costs ${eur(PACHT.anwaltskosten.min)}–${eur(PACHT.anwaltskosten.max)}.`
              : "Good – use an independent law firm of your choice, not the developer’s.",
        frage: "Will you cover the costs of an independent legal review of my choice as well as notary and land register costs?",
      };
    }
    default:
      return {};
  }
}

/**
 * Ergebnis von pruefePachtangebot() mit englischen Texten (Zahlen und Ampeln unverändert).
 * @param {ReturnType<import("../rechner/pachtangebot.js").pruefePachtangebot>} r
 */
export function pachtangebotEn(r) {
  const klauseln = r.klauseln.map((k) => ({ ...k, ...klauselEn(k, r) }));
  const fragen = [
    ...klauseln.filter((k) => k.ampel !== "gut").map((k) => ({ thema: k.titel, frage: k.frage, ampel: k.ampel })),
    ...STANDARDFRAGEN_EN.map((f) => ({ thema: "General", frage: f, ampel: "standard" })),
  ];
  return { ...r, klauseln, fragen, urteil: { ...r.urteil, ...URTEIL_EN[r.urteil.id] } };
}
