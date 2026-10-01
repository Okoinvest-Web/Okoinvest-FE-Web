// src/lib/plattform/eg/zahlung.js
//
// Zahlungsverkehr der Energiegemeinschaft (WP4, Fachkonzept 3.13): SEPA-Lastschrift (pain.008.001.08, Mandatsverwaltung,
// Vorabankündigung auf dem Beleg), SEPA-Überweisung der Gutschriften (pain.001 aus finanzen/sepa.js), Aufrechnung bei
// Prosumern, Kontoauszug-Abgleich (camt.053/054 über buchhaltung/zahlungsimport.js), Rücklastschriften mit fairer
// Gebühr und Mahnwesen (buchhaltung/mahnwesen.js) mit sozial verträglichen Standardwerten. Reine Funktionen;
// Python-Spiegel: plattform/eg_abrechnung_kern.py. Die Plattform führt KEINE Zahlung aus – Dateien werden im
// Online-Banking bzw. per EBICS eingereicht (vor dem ersten Einsatz Testeinreichung mit der Hausbank).
//
// Quellen: EPC SEPA Core Direct Debit Rulebook (Mandat, Vorabankündigung mind. 14 Kalendertage, sofern nicht kürzer
// vereinbart; Mandat verfällt nach 36 Monaten ohne Einzug; Rückgabe ohne Angabe von Gründen binnen 8 Wochen);
// ISO 20022 pain.008.001.08 (zu bestätigen: von der Hausbank angenommene Version).

import { rund2 } from "../mitglied/basis.js";
import { bicPruefen, ibanNormalisieren, ibanPruefen, pain001, sepaId, sepaText } from "../finanzen/sepa.js";
import { mahnKonfigPruefen, mahnVorschlag } from "../buchhaltung/mahnwesen.js";
import { camtLesen, zuordnen } from "../buchhaltung/zahlungsimport.js";
import { belegOffen, BELEG_OFFEN } from "./belege.js";

export const ZAHLUNG_ARTEN = { pain008: "SEPA-Lastschrift (pain.008)", pain001: "SEPA-Überweisung Gutschriften (pain.001)", camt: "Kontoauszug (camt.053/054)", manuell: "Manuell erfasst", ruecklastschrift: "Rücklastschrift" };
export const ZAHLUNG_STATUS = { erzeugt: "Datei erzeugt", eingereicht: "Bei der Bank eingereicht", gebucht: "Gebucht", verworfen: "Verworfen" };
export const VORABANKUENDIGUNG_TAGE = 14;
export const MANDAT_VERFALL_MONATE = 36;
export const GLAEUBIGER_ID = /^AT\d\dZZZ\d{11}$/; // österreichische Creditor-ID (AT + 2 Prüfziffern + ZZZ + 11 Ziffern) (zu bestätigen)

/** Faire Standardwerte des Mahnwesens (Marktanalyse 4.5: andere Anbieter verlangen bis 40 € je Mahnung) */
export const MAHN_FAIR = Object.freeze({
  stufen: [
    { stufe: 1, label: "Freundliche Zahlungserinnerung", abTagen: 10, gebuehr: 0, fristTage: 14 },
    { stufe: 2, label: "Mahnung", abTagen: 30, gebuehr: 3, fristTage: 14 },
    { stufe: 3, label: "Letzte Mahnung", abTagen: 50, gebuehr: 5, fristTage: 14 },
  ],
  verzugszinsen: false, basiszinssatz: null, pauschaleB2b: false, mindestBetrag: 5, aufschlagStufe: 3,
});
/** Rücklastschrift: nur tatsächliche Bankspesen weiterverrechnen (Standard 0 €, Obergrenze 10 €) */
export const RUECKLASTSCHRIFT = { gebuehrStandard: 0, gebuehrMax: 10 };
export const RUECKGABE_GRUENDE = { AC04: "Konto erloschen", AC06: "Konto gesperrt", AM04: "Deckung unzureichend", MD01: "Kein gültiges Mandat", MD06: "Rückgabe auf Wunsch des Zahlers", MS02: "Grund nicht angegeben (Zahler)", MS03: "Grund nicht angegeben (Bank)", SL01: "Dienstleistung der Bank" };

const xml = (s) => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&apos;");
const betragText = (x) => rund2(x).toFixed(2);
const monateZwischen = (a, b) => {
  const [j1, m1] = String(a).slice(0, 7).split("-").map(Number);
  const [j2, m2] = String(b).slice(0, 7).split("-").map(Number);
  return (j2 - j1) * 12 + (m2 - m1);
};

/** Mandatsreferenz-Vorschlag: KURZNAME-MITGLIEDSNUMMER (max. 35, nur A–Z 0–9 -) */
export const mandatsreferenzVorschlag = (kurzname, mitgliedsnummer) => sepaId(`${sepaText(kurzname, 20).replace(/ /g, "")}-${String(mitgliedsnummer).padStart(4, "0")}`);

/**
 * Mandat prüfen. Rückgabe { ok, fehler[], warnungen[], seqTp } – seqTp FRST beim ersten Einzug, sonst RCUR.
 * @param {{referenz:string, datum:string, status:string}} mandat
 */
export function mandatPruefen(mandat = {}, { iban = "", heute = "", letzterEinzug = "" } = {}) {
  const fehler = [];
  const warnungen = [];
  if (!mandat.referenz) fehler.push("Mandatsreferenz fehlt.");
  else if (sepaId(mandat.referenz) !== String(mandat.referenz).toUpperCase() || String(mandat.referenz).length > 35) fehler.push("Mandatsreferenz: höchstens 35 Zeichen, nur Buchstaben, Ziffern und Bindestrich.");
  if (!/^\d\d\d\d-\d\d-\d\d$/.test(String(mandat.datum || ""))) fehler.push("Datum der Mandatserteilung fehlt.");
  else if (heute && mandat.datum > heute) fehler.push("Mandatsdatum liegt in der Zukunft.");
  if (mandat.status !== "aktiv") fehler.push(mandat.status === "widerrufen" ? "Mandat widerrufen." : "Mandat nicht aktiv.");
  if (!ibanPruefen(iban)) fehler.push("IBAN des Mitglieds fehlt oder ist ungültig.");
  const bezug = letzterEinzug || mandat.datum;
  if (heute && bezug && /^\d\d\d\d-\d\d-\d\d$/.test(bezug) && monateZwischen(bezug, heute) >= MANDAT_VERFALL_MONATE) fehler.push("Mandat verfallen (36 Monate ohne Einzug) – neues Mandat einholen.");
  else if (heute && bezug && monateZwischen(bezug, heute) >= MANDAT_VERFALL_MONATE - 3) warnungen.push("Mandat verfällt bald (36 Monate ohne Einzug).");
  return { ok: !fehler.length, fehler, warnungen, seqTp: letzterEinzug ? "RCUR" : "FRST" };
}

/**
 * pain.008.001.08 (SEPA Core Direct Debit) erzeugen.
 * auftrag: { nachrichtId, erstelltAm, einzugAm, glaeubiger:{name, iban, bic?, creditorId}, lastschriften:[{endToEndId, betrag, name, iban, bic?, mandatRef, mandatDatum, seqTp, verwendungszweck}] }
 */
export function pain008(auftrag) {
  const { nachrichtId, erstelltAm, einzugAm, glaeubiger, lastschriften } = auftrag;
  if (!lastschriften?.length) throw new Error("Keine Lastschriften");
  if (!ibanPruefen(glaeubiger?.iban)) throw new Error("IBAN der Gemeinschaft ungültig");
  if (!GLAEUBIGER_ID.test(String(glaeubiger?.creditorId || "").replace(/\s/g, "").toUpperCase())) throw new Error("Gläubiger-ID (Creditor-ID) fehlt oder ist ungültig");
  if (!/^\d\d\d\d-\d\d-\d\d$/.test(einzugAm || "")) throw new Error("Einzugsdatum ungültig");
  for (const l of lastschriften) {
    if (!ibanPruefen(l.iban)) throw new Error(`IBAN ungültig (${l.endToEndId})`);
    if (!(rund2(l.betrag) > 0)) throw new Error(`Betrag ungültig (${l.endToEndId})`);
    if (!l.mandatRef || !/^\d\d\d\d-\d\d-\d\d$/.test(l.mandatDatum || "")) throw new Error(`Mandat unvollständig (${l.endToEndId})`);
  }
  const msgId = sepaId(nachrichtId);
  const zeit = String(erstelltAm || new Date().toISOString()).replace(/\.\d{3}Z$/, "Z");
  const gruppen = ["FRST", "RCUR"].map((seq) => [seq, lastschriften.filter((l) => (l.seqTp || "RCUR") === seq)]).filter(([, l]) => l.length);
  const summe = (l) => betragText(l.reduce((s, x) => s + rund2(x.betrag), 0));
  const glBic = glaeubiger.bic && bicPruefen(glaeubiger.bic) ? `<FinInstnId><BICFI>${xml(glaeubiger.bic.toUpperCase())}</BICFI></FinInstnId>` : "<FinInstnId><Othr><Id>NOTPROVIDED</Id></Othr></FinInstnId>";
  const cid = String(glaeubiger.creditorId).replace(/\s/g, "").toUpperCase();
  const pmtInf = gruppen.map(([seq, liste], i) => `    <PmtInf>
      <PmtInfId>${xml(sepaId(`${msgId}-${i + 1}`))}</PmtInfId>
      <PmtMtd>DD</PmtMtd>
      <BtchBookg>true</BtchBookg>
      <NbOfTxs>${liste.length}</NbOfTxs>
      <CtrlSum>${summe(liste)}</CtrlSum>
      <PmtTpInf><SvcLvl><Cd>SEPA</Cd></SvcLvl><LclInstrm><Cd>CORE</Cd></LclInstrm><SeqTp>${seq}</SeqTp></PmtTpInf>
      <ReqdColltnDt>${xml(einzugAm)}</ReqdColltnDt>
      <Cdtr><Nm>${xml(sepaText(glaeubiger.name, 70))}</Nm></Cdtr>
      <CdtrAcct><Id><IBAN>${xml(ibanNormalisieren(glaeubiger.iban))}</IBAN></Id></CdtrAcct>
      <CdtrAgt>${glBic}</CdtrAgt>
      <ChrgBr>SLEV</ChrgBr>
      <CdtrSchmeId><Id><PrvtId><Othr><Id>${xml(cid)}</Id><SchmeNm><Prtry>SEPA</Prtry></SchmeNm></Othr></PrvtId></Id></CdtrSchmeId>
${liste.map((l) => `      <DrctDbtTxInf>
        <PmtId><EndToEndId>${xml(sepaId(l.endToEndId) || "NOTPROVIDED")}</EndToEndId></PmtId>
        <InstdAmt Ccy="EUR">${betragText(l.betrag)}</InstdAmt>
        <DrctDbtTx><MndtRltdInf><MndtId>${xml(sepaId(l.mandatRef))}</MndtId><DtOfSgntr>${xml(l.mandatDatum)}</DtOfSgntr></MndtRltdInf></DrctDbtTx>
        <DbtrAgt>${l.bic && bicPruefen(l.bic) ? `<FinInstnId><BICFI>${xml(l.bic.toUpperCase())}</BICFI></FinInstnId>` : "<FinInstnId><Othr><Id>NOTPROVIDED</Id></Othr></FinInstnId>"}</DbtrAgt>
        <Dbtr><Nm>${xml(sepaText(l.name, 70))}</Nm></Dbtr>
        <DbtrAcct><Id><IBAN>${xml(ibanNormalisieren(l.iban))}</IBAN></Id></DbtrAcct>
        <RmtInf><Ustrd>${xml(sepaText(l.verwendungszweck, 140))}</Ustrd></RmtInf>
      </DrctDbtTxInf>`).join("\n")}
    </PmtInf>`).join("\n");
  return `<?xml version="1.0" encoding="UTF-8"?>
<Document xmlns="urn:iso:std:iso:20022:tech:xsd:pain.008.001.08" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
  <CstmrDrctDbtInitn>
    <GrpHdr>
      <MsgId>${xml(msgId)}</MsgId>
      <CreDtTm>${xml(zeit)}</CreDtTm>
      <NbOfTxs>${lastschriften.length}</NbOfTxs>
      <CtrlSum>${summe(lastschriften)}</CtrlSum>
      <InitgPty><Nm>${xml(sepaText(glaeubiger.name, 70))}</Nm></InitgPty>
    </GrpHdr>
${pmtInf}
  </CstmrDrctDbtInitn>
</Document>
`;
}

/** Strukturprüfung pain.008 (ohne XSD): Pflichtelemente, Anzahl/Summen, IBAN, Mandate */
export function pain008Pruefen(text) {
  const f = [];
  const s = String(text || "");
  if (!s.includes('xmlns="urn:iso:std:iso:20022:tech:xsd:pain.008.001.08"')) f.push("Namespace pain.008.001.08 fehlt");
  for (const t of ["CstmrDrctDbtInitn", "GrpHdr", "MsgId", "PmtInf", "PmtMtd", "SeqTp", "ReqdColltnDt", "Cdtr", "CdtrAcct", "CdtrSchmeId", "DrctDbtTxInf", "MndtId", "DtOfSgntr"]) if (!new RegExp(`<${t}(\\s|>)`).test(s)) f.push(`Element ${t} fehlt`);
  const tx = s.match(/<DrctDbtTxInf>/g) || [];
  const nb = [...s.matchAll(/<GrpHdr>(?:.|\n)*?<NbOfTxs>(\d+)<\/NbOfTxs>/g)].map((m) => Number(m[1]));
  if (nb.length && nb[0] !== tx.length) f.push("NbOfTxs passt nicht zur Anzahl der Lastschriften");
  const betraege = [...s.matchAll(/<InstdAmt Ccy="EUR">(.*?)<\/InstdAmt>/g)].map((m) => m[1]);
  if (betraege.some((b) => !/^\d+\.\d\d$/.test(b) || Number(b) <= 0)) f.push("Betrag nicht im Format 0.00 oder ≤ 0");
  const summe = betraege.reduce((a, b) => a + Number(b), 0).toFixed(2);
  const kopfSumme = (/<GrpHdr>(?:.|\n)*?<CtrlSum>(.*?)<\/CtrlSum>/.exec(s) || [])[1];
  if (kopfSumme !== summe) f.push("CtrlSum passt nicht zur Summe der Beträge");
  for (const m of s.matchAll(/<IBAN>(.*?)<\/IBAN>/g)) if (!ibanPruefen(m[1])) f.push(`IBAN ungültig: ${m[1].slice(0, 4)}…`);
  return f;
}

const verwendungszweck = (b, g) => `${b.nummer} ${g.kurzname || g.name} ${String(b.von).slice(0, 7)}`;

/**
 * Zahlungslauf bilden. art "pain008" (offene Rechnungen mit aktivem Mandat) bzw. "pain001" (offene Gutschriften).
 * Aufrechnung (Prosumer, Fachkonzept 4.5): offene Gutschrift und Rechnung desselben Mitglieds werden verrechnet – es
 * fließt nur die Differenz; beide Belege erhalten den Verrechnungsvermerk.
 * @returns {{posten:object[], uebersprungen:{belegId:string, nummer:string, grund:string}[], verrechnungen:object[], summe:number, anzahl:number}}
 */
export function zahlungslaufBilden({ art, belege = [], mitglieder = [], gemeinschaft: g, heute, belegIds = null, aufrechnung = true, letzteEinzuege = {} }) {
  const mVon = new Map(mitglieder.map((m) => [m.id, m]));
  const offen = belege.filter((b) => BELEG_OFFEN.includes(b.status) && b.nummer && belegOffen(b) > 0 && !b.zahlungslaufId);
  const typ = art === "pain008" ? "rechnung" : "gutschrift";
  const gegen = art === "pain008" ? "gutschrift" : "rechnung";
  const auswahl = offen.filter((b) => b.typ === typ && (!belegIds || belegIds.includes(b.id)));
  const posten = [];
  const uebersprungen = [];
  const verrechnungen = [];
  const verbraucht = new Set();
  for (const b of auswahl) {
    const m = mVon.get(b.mitgliedId);
    if (!m) {
      uebersprungen.push({ belegId: b.id, nummer: b.nummer, grund: "Mitglied nicht gefunden." });
      continue;
    }
    let betrag = belegOffen(b);
    const gegenbelege = aufrechnung ? offen.filter((x) => x.typ === gegen && x.mitgliedId === m.id && !verbraucht.has(x.id)) : [];
    const gegenSumme = rund2(gegenbelege.reduce((s, x) => s + belegOffen(x), 0));
    if (gegenbelege.length) {
      if (gegenSumme >= betrag) {
        uebersprungen.push({ belegId: b.id, nummer: b.nummer, grund: `Wird mit ${gegenbelege.map((x) => x.nummer).join(", ")} verrechnet (Aufrechnung) – Auszahlung bzw. Einzug nur über den Gegenbeleg.` });
        continue;
      }
      verrechnungen.push({ belegId: b.id, nummer: b.nummer, gegen: gegenbelege.map((x) => ({ belegId: x.id, nummer: x.nummer, betrag: belegOffen(x) })), betrag: gegenSumme });
      for (const x of gegenbelege) verbraucht.add(x.id);
      betrag = rund2(betrag - gegenSumme);
    }
    const zweck = `${verwendungszweck(b, g)}${gegenbelege.length ? ` abzgl. ${gegenbelege.map((x) => x.nummer).join(" ")}` : ""}`;
    if (art === "pain008") {
      const mp = mandatPruefen(m.sepaMandat || {}, { iban: m.iban, heute, letzterEinzug: letzteEinzuege[m.id] || "" });
      if (!mp.ok) {
        uebersprungen.push({ belegId: b.id, nummer: b.nummer, grund: mp.fehler.join(" ") });
        continue;
      }
      posten.push({ belegId: b.id, nummer: b.nummer, mitgliedId: m.id, name: b.empfaenger?.name || "", iban: ibanNormalisieren(m.iban), betrag, mandatRef: m.sepaMandat.referenz, mandatDatum: m.sepaMandat.datum, seqTp: mp.seqTp, endToEndId: b.nummer, verwendungszweck: zweck, verrechnet: gegenbelege.map((x) => x.id) });
    } else {
      if (!ibanPruefen(m.iban)) {
        uebersprungen.push({ belegId: b.id, nummer: b.nummer, grund: "IBAN des Erzeugers fehlt oder ist ungültig." });
        continue;
      }
      posten.push({ belegId: b.id, nummer: b.nummer, mitgliedId: m.id, name: b.empfaenger?.name || "", iban: ibanNormalisieren(m.iban), betrag, endToEndId: b.nummer, verwendungszweck: zweck, verrechnet: gegenbelege.map((x) => x.id) });
    }
  }
  return { posten, uebersprungen, verrechnungen, summe: rund2(posten.reduce((s, p) => s + p.betrag, 0)), anzahl: posten.length };
}

/** Zahlungsdatei zum Lauf (XML-Text) */
export function zahlungsdatei(art, lauf, { gemeinschaft: g, nachrichtId, erstelltAm, ausfuehrungAm }) {
  if (art === "pain008") return pain008({ nachrichtId, erstelltAm, einzugAm: ausfuehrungAm, glaeubiger: { name: g.name, iban: g.iban, bic: g.bic, creditorId: g.creditorId }, lastschriften: lauf.posten });
  return pain001({ nachrichtId, erstelltAm, ausfuehrungAm, auftraggeber: { name: g.name, iban: g.iban, bic: g.bic }, zahlungen: lauf.posten.map((p) => ({ endToEndId: p.endToEndId, betrag: p.betrag, name: p.name, iban: p.iban, verwendungszweck: p.verwendungszweck })) });
}

/** Belege in das Format von buchhaltung/zahlungsimport.js zuordnen() bringen */
export const fuerZuordnung = (b) => ({ id: b.id, nummer: b.nummer, beleg: b.typ === "gutschrift" ? "gutschrift" : "rechnung", status: b.typ === "gutschrift" ? (b.zahlungslaufId ? "angewiesen" : "offen") : "offen", brutto: Math.abs(Number(b.summen?.brutto) || 0), offen: belegOffen(b), partei: { name: b.empfaenger?.name || "" } });

/**
 * Kontoauszug (camt.053/054) einlesen und je Buchung einen Zuordnungsvorschlag liefern; Rücklastschriften erkennen.
 * @returns {{buchungen:object[], ruecklastschriften:object[]}}
 */
export function camtAbgleich(xmlText, belege = []) {
  const zeilen = camtLesen(xmlText);
  const kandidaten = belege.filter((b) => BELEG_OFFEN.includes(b.status) && b.nummer).map(fuerZuordnung);
  const ruecklastschriften = [];
  const buchungen = zeilen.map((z) => {
    const ruecklast = z.richtung === "ausgang" && /RTRN|ruecklast|rücklast|return|MD06|AM04|MS02|AC04/i.test(`${z.zweck} ${z.referenz} ${z.code || ""}`);
    if (ruecklast) {
      const nummern = (`${z.zweck} ${z.referenz}`.toUpperCase().match(/(RE)-20\d\d-\d{5}/g) || []);
      const b = belege.find((x) => nummern.includes(x.nummer));
      const grund = Object.keys(RUECKGABE_GRUENDE).find((k) => `${z.zweck} ${z.referenz}`.toUpperCase().includes(k)) || "";
      const r = { ...z, belegId: b?.id || null, nummer: b?.nummer || "", grund, grundText: RUECKGABE_GRUENDE[grund] || "Rücklastschrift" };
      ruecklastschriften.push(r);
      return { ...z, vorschlag: { art: b ? "ruecklastschrift" : "keiner", belegId: b?.id || null, nummer: b?.nummer || "", text: b ? `Rücklastschrift zu ${b.nummer}${grund ? ` (${grund} ${RUECKGABE_GRUENDE[grund]})` : ""}` : "Rücklastschrift ohne erkennbare Belegnummer – manuell prüfen." } };
    }
    return { ...z, vorschlag: zuordnen(z, kandidaten) };
  });
  return { buchungen, ruecklastschriften };
}

/** Gebühr einer Rücklastschrift (nur tatsächliche Bankspesen, gedeckelt) */
export const ruecklastschriftGebuehr = (bankspesen, konfig = RUECKLASTSCHRIFT) => Math.min(rund2(Math.max(0, Number(bankspesen ?? konfig.gebuehrStandard) || 0)), konfig.gebuehrMax);

/**
 * Mahnvorschlag für einen EG-Beleg (Adapter auf buchhaltung/mahnwesen.js). Schutzbedürftige Haushalte (§ 68 Abs. 6
 * ElWG) erhalten keine Mahngebühren; ab der Eskalationsstufe Hinweis auf Vorstandsbeschluss statt Automatik.
 */
export function egMahnvorschlag(b, heute, konfig = MAHN_FAIR, { schutzbeduerftig = false } = {}) {
  if (b.typ !== "rechnung" || !BELEG_OFFEN.includes(b.status)) return null;
  const k = mahnKonfigPruefen(konfig);
  const adapter = { beleg: "rechnung", status: "offen", nummer: b.nummer, rechnungsdatum: b.datum, faelligAm: b.faelligAm, brutto: Math.abs(Number(b.summen?.brutto) || 0), zahlungen: b.zahlungen || [], mahnungen: b.mahnungen || [], mahnsperre: b.mahnsperre || null, partei: { name: b.empfaenger?.name || "", uid: b.empfaenger?.uid || "" } };
  const v = mahnVorschlag(adapter, heute, k, { land: "AT" });
  if (!v) return null;
  if (schutzbeduerftig && v.faellig) {
    const kosten = rund2(v.kostenGesamt - v.gebuehr);
    return { ...v, gebuehr: 0, kostenGesamt: kosten, gesamt: rund2(v.offen + kosten), sozial: true, hinweisSozial: "Schutzbedürftiger Haushalt: keine Mahngebühr, Ratenzahlung anbieten." };
  }
  return { ...v, sozial: false, hinweisEskalation: v.eskalation ? "Nach der letzten Mahnung entscheidet der Vorstand über Ratenplan, Ausschluss bzw. Abmeldung (CM_REV_SP) – keine Automatik." : "" };
}
