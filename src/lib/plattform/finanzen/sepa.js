// src/lib/plattform/finanzen/sepa.js
//
// IBAN/BIC prüfen und SEPA-Überweisungsdatei (pain.001.001.09, ISO 20022) erzeugen – reine Funktionen.
// Die Datei wird im Online-Banking bzw. per EBICS eingereicht; die App führt selbst KEINE Zahlung aus.
// Version 09 wird von österreichischen und deutschen Banken (DK-Verfahren ab 3.7) angenommen – vor dem ersten Einsatz
// mit der Hausbank abstimmen (Testeinreichung).

import { rund2 } from "./basis.js";

/** Länge der IBAN je Land (Auszug SEPA-Raum) */
export const IBAN_LAENGE = {
  AT: 20, BE: 16, BG: 22, CH: 21, CY: 28, CZ: 24, DE: 22, DK: 18, EE: 20, ES: 24, FI: 18, FR: 27, GB: 22, GR: 27, HR: 21, HU: 28, IE: 22,
  IS: 26, IT: 27, LI: 21, LT: 20, LU: 20, LV: 21, MC: 27, MT: 31, NL: 18, NO: 15, PL: 28, PT: 25, RO: 24, SE: 24, SI: 19, SK: 24, SM: 27,
};

export const ibanNormalisieren = (s) => String(s || "").replace(/\s+/g, "").toUpperCase();

function mod97(ziffern) {
  let rest = 0;
  for (let i = 0; i < ziffern.length; i += 7) rest = Number(String(rest) + ziffern.slice(i, i + 7)) % 97;
  return rest;
}
const alsZiffern = (s) => s.replace(/[A-Z]/g, (c) => String(c.charCodeAt(0) - 55));

/** IBAN gültig (Länge je Land, nur A–Z/0–9, Prüfziffer mod 97 = 1) */
export function ibanPruefen(iban) {
  const i = ibanNormalisieren(iban);
  if (!/^[A-Z]{2}\d{2}[A-Z0-9]{8,30}$/.test(i)) return false;
  const laenge = IBAN_LAENGE[i.slice(0, 2)];
  if (!laenge || i.length !== laenge) return false;
  return mod97(alsZiffern(i.slice(4) + i.slice(0, 4))) === 1;
}

/** IBAN aus Land + BBAN mit korrekter Prüfziffer (für Test- und Demodaten) */
export function ibanBauen(land, bban) {
  const b = ibanNormalisieren(bban);
  const pz = 98 - mod97(alsZiffern(`${b}${land.toUpperCase()}00`));
  return `${land.toUpperCase()}${String(pz).padStart(2, "0")}${b}`;
}

export const bicPruefen = (bic) => /^[A-Z]{4}[A-Z]{2}[A-Z0-9]{2}([A-Z0-9]{3})?$/.test(String(bic || "").toUpperCase());

/** IBAN für Anzeige maskieren: AT61 **** **** **** 3201 */
export function ibanMaskieren(iban) {
  const i = ibanNormalisieren(iban);
  if (i.length < 8) return i ? "****" : "";
  const mitte = i.slice(4, -4).replace(/./g, "*");
  return `${i.slice(0, 4)}${mitte}${i.slice(-4)}`.replace(/(.{4})/g, "$1 ").trim();
}

/**
 * Text auf den SEPA-Zeichensatz (EPC: a–z A–Z 0–9 / - ? : ( ) . , ' + Leerzeichen) bringen: Umlaute umschreiben,
 * alles andere durch Leerzeichen ersetzen, kürzen.
 */
export function sepaText(s, max = 140) {
  const t = String(s ?? "")
    .replace(/Ä/g, "Ae").replace(/Ö/g, "Oe").replace(/Ü/g, "Ue").replace(/ä/g, "ae").replace(/ö/g, "oe").replace(/ü/g, "ue").replace(/ß/g, "ss")
    .replace(/&/g, "+").replace(/[„“”"]/g, "'").replace(/[–—]/g, "-").replace(/€/g, "EUR")
    .normalize("NFKD").replace(/[̀-ͯ]/g, "")
    .replace(/[^A-Za-z0-9/\-?:().,'+ ]/g, " ")
    .replace(/\s{2,}/g, " ")
    .trim();
  return t.slice(0, max).trim();
}

/** Kennung für MsgId/PmtInfId/EndToEndId: max. 35 Zeichen, nur A–Z 0–9 - */
export const sepaId = (s) => String(s || "").toUpperCase().replace(/[^A-Z0-9-]/g, "").slice(0, 35);

const xml = (s) => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&apos;");
const betragText = (x) => rund2(x).toFixed(2);

/**
 * pain.001.001.09 erzeugen.
 * auftrag: { nachrichtId, erstelltAm (ISO), ausfuehrungAm (JJJJ-MM-TT), auftraggeber: {name, iban, bic?},
 *           zahlungen: [{ endToEndId, betrag, name, iban, bic?, verwendungszweck }] }
 * Wirft Error bei ungültigen Daten (IBAN, Betrag ≤ 0, leere Liste) – die Aufrufer prüfen vorher und melden verständlich.
 */
export function pain001(auftrag) {
  const { nachrichtId, erstelltAm, ausfuehrungAm, auftraggeber, zahlungen } = auftrag;
  if (!zahlungen?.length) throw new Error("Keine Zahlungen");
  if (!ibanPruefen(auftraggeber?.iban)) throw new Error("IBAN des Auftraggebers ungültig");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(ausfuehrungAm || "")) throw new Error("Ausführungsdatum ungültig");
  for (const z of zahlungen) {
    if (!ibanPruefen(z.iban)) throw new Error(`IBAN ungültig (${z.endToEndId})`);
    if (!(rund2(z.betrag) > 0)) throw new Error(`Betrag ungültig (${z.endToEndId})`);
    if (z.bic && !bicPruefen(z.bic)) throw new Error(`BIC ungültig (${z.endToEndId})`);
  }
  const anzahl = zahlungen.length;
  const summe = betragText(zahlungen.reduce((s, z) => s + rund2(z.betrag), 0));
  const msgId = sepaId(nachrichtId);
  const zeit = String(erstelltAm || new Date().toISOString()).replace(/\.\d{3}Z$/, "Z");
  const agBic = auftraggeber.bic && bicPruefen(auftraggeber.bic) ? `<FinInstnId><BICFI>${xml(auftraggeber.bic.toUpperCase())}</BICFI></FinInstnId>` : "<FinInstnId><Othr><Id>NOTPROVIDED</Id></Othr></FinInstnId>";
  const tx = zahlungen
    .map((z) => {
      const cdtrAgt = z.bic && bicPruefen(z.bic) ? `\n        <CdtrAgt><FinInstnId><BICFI>${xml(z.bic.toUpperCase())}</BICFI></FinInstnId></CdtrAgt>` : "";
      return `      <CdtTrfTxInf>
        <PmtId><EndToEndId>${xml(sepaId(z.endToEndId) || "NOTPROVIDED")}</EndToEndId></PmtId>
        <Amt><InstdAmt Ccy="EUR">${betragText(z.betrag)}</InstdAmt></Amt>${cdtrAgt}
        <Cdtr><Nm>${xml(sepaText(z.name, 70))}</Nm></Cdtr>
        <CdtrAcct><Id><IBAN>${xml(ibanNormalisieren(z.iban))}</IBAN></Id></CdtrAcct>
        <RmtInf><Ustrd>${xml(sepaText(z.verwendungszweck, 140))}</Ustrd></RmtInf>
      </CdtTrfTxInf>`;
    })
    .join("\n");
  return `<?xml version="1.0" encoding="UTF-8"?>
<Document xmlns="urn:iso:std:iso:20022:tech:xsd:pain.001.001.09" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:schemaLocation="urn:iso:std:iso:20022:tech:xsd:pain.001.001.09 pain.001.001.09.xsd">
  <CstmrCdtTrfInitn>
    <GrpHdr>
      <MsgId>${xml(msgId)}</MsgId>
      <CreDtTm>${xml(zeit)}</CreDtTm>
      <NbOfTxs>${anzahl}</NbOfTxs>
      <CtrlSum>${summe}</CtrlSum>
      <InitgPty><Nm>${xml(sepaText(auftraggeber.name, 70))}</Nm></InitgPty>
    </GrpHdr>
    <PmtInf>
      <PmtInfId>${xml(sepaId(`${msgId}-1`))}</PmtInfId>
      <PmtMtd>TRF</PmtMtd>
      <BtchBookg>true</BtchBookg>
      <NbOfTxs>${anzahl}</NbOfTxs>
      <CtrlSum>${summe}</CtrlSum>
      <PmtTpInf><SvcLvl><Cd>SEPA</Cd></SvcLvl></PmtTpInf>
      <ReqdExctnDt><Dt>${xml(ausfuehrungAm)}</Dt></ReqdExctnDt>
      <Dbtr><Nm>${xml(sepaText(auftraggeber.name, 70))}</Nm></Dbtr>
      <DbtrAcct><Id><IBAN>${xml(ibanNormalisieren(auftraggeber.iban))}</IBAN></Id></DbtrAcct>
      <DbtrAgt>${agBic}</DbtrAgt>
      <ChrgBr>SLEV</ChrgBr>
${tx}
    </PmtInf>
  </CstmrCdtTrfInitn>
</Document>
`;
}

/**
 * Strukturprüfung einer pain.001-Datei (ohne XSD): Namespace, Pflichtelemente, Anzahl/Kontrollsumme, IBANs,
 * Beträge mit zwei Nachkommastellen, Kennungen ≤ 35 Zeichen. Liefert Liste der Fehler (leer = in Ordnung).
 */
export function pain001Pruefen(text) {
  const f = [];
  const s = String(text || "");
  if (!s.startsWith('<?xml version="1.0" encoding="UTF-8"?>')) f.push("XML-Deklaration fehlt");
  if (!s.includes('xmlns="urn:iso:std:iso:20022:tech:xsd:pain.001.001.09"')) f.push("Namespace pain.001.001.09 fehlt");
  for (const tag of ["CstmrCdtTrfInitn", "GrpHdr", "MsgId", "CreDtTm", "NbOfTxs", "CtrlSum", "InitgPty", "PmtInf", "PmtInfId", "PmtMtd", "ReqdExctnDt", "Dbtr", "DbtrAcct", "DbtrAgt", "ChrgBr"]) {
    if (!new RegExp(`<${tag}[ >]`).test(s)) f.push(`Element ${tag} fehlt`);
  }
  const auf = (s.match(/<[A-Za-z]+[ >]/g) || []).length;
  const zu = (s.match(/<\/[A-Za-z]+>/g) || []).length;
  if (auf !== zu) f.push("Elemente nicht ausgeglichen geöffnet/geschlossen");
  const txs = s.match(/<CdtTrfTxInf>[\s\S]*?<\/CdtTrfTxInf>/g) || [];
  const betraege = [...s.matchAll(/<InstdAmt Ccy="EUR">([^<]+)<\/InstdAmt>/g)].map((m) => m[1]);
  const nb = [...s.matchAll(/<NbOfTxs>(\d+)<\/NbOfTxs>/g)].map((m) => Number(m[1]));
  const ctrl = [...s.matchAll(/<CtrlSum>([^<]+)<\/CtrlSum>/g)].map((m) => m[1]);
  if (!txs.length) f.push("Keine Transaktionen");
  if (nb.some((x) => x !== txs.length)) f.push("NbOfTxs passt nicht zur Anzahl der Transaktionen");
  if (betraege.some((b) => !/^\d+\.\d{2}$/.test(b) || Number(b) <= 0)) f.push("Betrag nicht im Format 0.00 oder ≤ 0");
  const summe = betraege.reduce((a, b) => a + Number(b), 0).toFixed(2);
  if (ctrl.some((c) => c !== summe)) f.push("CtrlSum passt nicht zur Summe der Beträge");
  for (const m of s.matchAll(/<IBAN>([^<]+)<\/IBAN>/g)) if (!ibanPruefen(m[1])) f.push(`IBAN ungültig: ${m[1].slice(0, 4)}…`);
  for (const tag of ["MsgId", "PmtInfId", "EndToEndId"]) for (const m of s.matchAll(new RegExp(`<${tag}>([^<]*)</${tag}>`, "g"))) if (!m[1] || m[1].length > 35) f.push(`${tag} leer oder länger als 35 Zeichen`);
  for (const m of s.matchAll(/<(Nm|Ustrd)>([^<]*)<\/\1>/g)) if (/[^A-Za-z0-9/\-?:().,'+ &;]/.test(m[2])) f.push(`Unzulässige Zeichen in ${m[1]}`);
  return f;
}
