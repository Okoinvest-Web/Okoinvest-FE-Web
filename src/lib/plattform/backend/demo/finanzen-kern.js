// src/lib/plattform/backend/demo/finanzen-kern.js
//
// Kern der Finanzen im Demo-Backend (ohne Rechteprüfung – die Operationen in finanzen.js prüfen vorher):
// Datenbestand db.finanzen, KYC-Anbindung für Auszahlungen, Rechnungsempfänger, Belege (Gutschrift/Rechnung) mit
// fortlaufender Nummer, Klärfälle und der Abrechnungslauf (Pacht, Contracting, Provision).
// Referenz für Frappe: Backend-Import/oekoinvest_app/oekoinvest_app/plattform/finanzen/abrechnung.py

import * as v from "../../validierung";
import * as F from "../../finanzen/index.js";
import { intern } from "../demo";
import { jetzt, neueId } from "./hilfen";
import { kycFallFuer, kycFreigabeDb } from "./kycRegeln"; // KYC/KYB-Team: Freigabe „auszahlung“ (Gating) und Bankverbindung
import { backofficeEreignis } from "./backoffice";

const { benachrichtigen, protokoll, nutzerById, nameVon } = intern;

/** Technischer Nutzer für Lesezugriffe auf Anlagen-Stammdaten während eines Laufs (nie nach außen gegeben) */
export const SYSTEM_FINANZEN = Object.freeze({ id: "SYSTEM-FINANZEN", rollen: ["admin"], backofficeRollen: ["leitung"], aktiv: true, vorname: "Abrechnungslauf", nachname: "" });

/** Schema der Demo-Sammlung db.finanzen – bei Änderung wird NUR diese Sammlung neu befüllt */
export const FIN_SCHEMA = 3; // 3: Aussteller = Eigentümergesellschaft (Gesellschaftsverzeichnis)

export function leer() {
  return {
    v: FIN_SCHEMA,
    einstellungen: {},
    vpi: F.INDEX_STARTWERTE.map(([reihe, jahr, wert]) => ({ reihe, jahr, wert, quelle: "Beispielwert (Demo) – mit amtlicher Veröffentlichung abgleichen", geaendertAm: null })),
    pachtvertraege: [],
    belege: [],
    klaerfaelle: [],
    laeufe: [],
    zahlungslaeufe: [],
    nummernkreise: {},
    kycDemo: {},
    assets: [],
    kostentraeger: [],
    kosten: [],
  };
}

const adresseText = (a) => {
  if (!a) return "";
  if (typeof a === "string") return v.text(a, 200);
  return [a.strasse, [a.plz, a.ort].filter(Boolean).join(" "), a.land].filter(Boolean).join(", ");
};

// ================================================================ Einstellungen (Aussteller, Auftraggeber SEPA)

/**
 * Stammdaten des Ausstellers und SEPA-Auftraggebers. Betrieb: Frappe „Plattform Finanzen Einstellungen“.
 * Demo: Umgebungsvariablen FINANZEN_UID, FINANZEN_IBAN, FINANZEN_BIC; ohne Angabe eine offensichtliche Beispiel-IBAN.
 */
export function einstellungen(db) {
  const e = db.finanzen?.einstellungen || {};
  return {
    firma: {
      name: "ÖkoInvest GmbH",
      anschrift: "Gewerbegebiet 10, 5121 Ostermiething, Österreich",
      land: "AT",
      firmenbuch: "FN 541505g, LG Ried im Innkreis",
      uid: e.uid ?? process.env.FINANZEN_UID ?? "",
    },
    auftraggeber: {
      name: "ÖkoInvest GmbH",
      iban: e.iban || process.env.FINANZEN_IBAN || "AT611904300234573201",
      bic: e.bic || process.env.FINANZEN_BIC || "",
      beispiel: !(e.iban || process.env.FINANZEN_IBAN),
    },
    zahlungszielTage: Number(e.zahlungszielTage ?? 14),
    vorlaufTage: Number(e.vorlaufTage ?? 14),
    erpnext: { aktiv: false, modus: "Demo-/Eigenbetrieb", hinweis: "ERPNext ist in der Demo nicht angebunden – Belege entstehen als Plattform-Abrechnungen. Im Betrieb mit ERPNext werden Purchase/Sales Invoices erzeugt." },
  };
}

// ================================================================ Gesellschaften (Eigentümergesellschaft / SPV)
//
// Contracting-Anlagen gehören der ÖkoInvest GmbH oder einer Projektgesellschaft (SPV). Rechnungsaussteller der
// Contracting-Rechnung ist die Eigentümergesellschaft der Anlage, Pächter (und damit Aussteller der Gutschrift und
// SEPA-Auftraggeber) die Gesellschaft des Pachtvertrags. Stammdaten liefert das Gesellschaftsverzeichnis (Team A2);
// das Feld an der Anlage pflegt die Fachprüfung (Team B). Beides wird hier TOLERANT gelesen – ohne Angaben gilt die
// ÖkoInvest GmbH. Alle Belege, Aktivierungen und Zahlungsläufe tragen `gesellschaftId` (Auswertung je Gesellschaft,
// später Bankfinanzierung/DSCR je SPV).

export const OEKOINVEST_ID = "OEKOINVEST";

/** Einträge des Gesellschaftsverzeichnisses (Team Dienste: db.dienste.gesellschaften; tolerant auch db.gesellschaften) */
function verzeichnis(db) {
  if (Array.isArray(db.dienste?.gesellschaften)) return db.dienste.gesellschaften;
  const g = db.gesellschaften;
  return Array.isArray(g) ? g : Array.isArray(g?.liste) ? g.liste : Array.isArray(g?.gesellschaften) ? g.gesellschaften : [];
}
const istOekoInvest = (g) => !!g && (g.name || g.firma) === "ÖkoInvest GmbH";

/** Alle bekannten Gesellschaften (ÖkoInvest GmbH + Verzeichnis) */
export function gesellschaftenListe(db) {
  const liste = [gesellschaftFuer(db, OEKOINVEST_ID), ...verzeichnis(db).filter((g) => g?.id && !istOekoInvest(g) && g.status !== "aufgeloest").map((g) => gesellschaftFuer(db, g.id))];
  for (const a of db.anlagen?.anlagen || []) {
    const g = anlageGesellschaft(db, a);
    if (!liste.some((x) => x.id === g.id)) liste.push(g);
  }
  return liste;
}

/** Stammdaten einer Gesellschaft für Belege und SEPA: {id, name, anschrift, land, uid, firmenbuch, iban, bic, erpnextCompany, spv} */
export function gesellschaftFuer(db, id) {
  const e = einstellungen(db);
  // Nur Name bekannt (Feld „Eigentümergesellschaft“ der Anlage, noch ohne Verzeichnis-Eintrag): Anschrift/UID fehlen → Pflichtangaben-Warnung
  if (String(id || "").startsWith("NAME:")) {
    const name = String(id).slice(5);
    return { id, name, anschrift: "", land: "", uid: "", firmenbuch: "", iban: "", bic: "", beispielIban: false, erpnextCompany: name, spv: true, bekannt: true, nurName: true };
  }
  const eintrag = id && id !== OEKOINVEST_ID ? verzeichnis(db).find((x) => x.id === id) : null;
  if (istOekoInvest(eintrag)) id = OEKOINVEST_ID; // ÖkoInvest GmbH steht auch im Verzeichnis – Stammdaten aus den Finanzeinstellungen
  if (!id || id === OEKOINVEST_ID) return { id: OEKOINVEST_ID, name: e.firma.name, anschrift: e.firma.anschrift, land: e.firma.land, uid: e.firma.uid, firmenbuch: e.firma.firmenbuch, iban: e.auftraggeber.iban, bic: e.auftraggeber.bic, beispielIban: e.auftraggeber.beispiel, erpnextCompany: "ÖkoInvest GmbH", spv: false, bekannt: true };
  const g = eintrag || {};
  const bank = g.bank || g.bankverbindung || {};
  return {
    id, name: g.name || g.firma || g.titel || id, anschrift: adresseText(g.anschrift || g.sitz || g.adresse) || "", land: g.land || g.sitzLand || "",
    uid: g.uid || g.uidNummer || "", firmenbuch: [g.firmenbuch || g.registernummer || g.fn, g.gericht].filter(Boolean).join(", "),
    iban: g.iban || bank.iban || "", bic: g.bic || bank.bic || "", beispielIban: false, erpnextCompany: g.erpCompany || g.erpnextCompany || g.company || g.name || "", spv: true, bekannt: !!g.id,
  };
}

/**
 * Eigentümergesellschaft einer Anlage. Felder der Fachprüfung: `eigentuemer` (Name, Standard „ÖkoInvest GmbH“) und
 * `eigentuemerId` (Kennung im Gesellschaftsverzeichnis, folgt). Reihenfolge: Verzeichnis-Eintrag → Name → ÖkoInvest GmbH.
 */
export function anlageGesellschaft(db, a) {
  if (!a) return gesellschaftFuer(db, OEKOINVEST_ID);
  const roh = a.eigentuemerId ?? a.eigentuemerGesellschaftId ?? a.gesellschaftId ?? null;
  const id = (typeof roh === "object" ? roh?.id : roh) || null;
  const name = (typeof a.eigentuemer === "string" ? a.eigentuemer : a.eigentuemer?.name || "").trim();
  const standard = !name || name === "ÖkoInvest GmbH";
  if (id && id !== OEKOINVEST_ID) {
    const g = gesellschaftFuer(db, id);
    if (g.bekannt) return g;
    if (standard) return g;
  }
  if (standard) return gesellschaftFuer(db, OEKOINVEST_ID);
  // Name ohne Kennung: Eintrag gleichen Namens im Verzeichnis (Anschrift, UID), sonst nur der Name (Pflichtangaben-Warnung)
  const treffer = verzeichnis(db).find((x) => (x.name || x.firma) === name && x.status !== "aufgeloest");
  return treffer ? gesellschaftFuer(db, treffer.id) : gesellschaftFuer(db, `NAME:${name}`);
}
export const anlageGesellschaftId = (db, a) => anlageGesellschaft(db, a).id;

/** Stromabnehmer (Rechnungsempfänger Contracting): eigenes Feld der Fachprüfung, sonst Kunde/Organisation der Anlage */
export function stromabnehmerVon(roh, a) {
  const s = roh?.stromabnehmer;
  const id = typeof s === "string" ? s : s?.id || null;
  const kontoId = roh?.stromabnehmerId || roh?.stromabnehmerKontoId || s?.kontoId || (id && id.startsWith("U-") ? id : null);
  const organisationId = roh?.stromabnehmerOrganisationId || s?.organisationId || (id && id.startsWith("O-") ? id : null);
  if (kontoId || organisationId) return { kontoId: kontoId || null, organisationId: organisationId || null, quelle: "stromabnehmer" };
  return { kontoId: a?.kunde?.id || roh?.kundeId || null, organisationId: a?.organisation?.id || roh?.organisationId || null, quelle: "kunde" };
}

// ================================================================ KYC (Auszahlung) und Rechnungsempfänger

/**
 * Freigabe einer Auszahlung an ein Konto (Pacht-Gutschrift) – verbindlich über das KYC-Modul: kycFreigabeDb(db, "auszahlung",
 * {kontoId, flaecheId}) (= kycFreigabe/kycSperre des KYC-Teams: Verifizierung + geprüfte IBAN + Eigentumsnachweis der Fläche;
 * Geltung nach PLATTFORM_KYC_GATING bzw. Compliance-Einstellung – in der Entwicklung nur Pilot-Konten). Zusätzlich gilt immer:
 * Die Empfänger-IBAN stammt ausschließlich aus der Verifizierung – ohne gültige IBAN keine Auszahlung.
 * Nur wenn das KYC-Modul in dieser Demo-Datenbank (noch) keine Daten hat, gelten die Demo-Stammdaten db.finanzen.kycDemo.
 */
export function kycAuszahlung(db, { kontoId, organisationId = null, flaecheId = null }) {
  if (db.kyc) {
    const fr = kycFreigabeDb(db, "auszahlung", { kontoId, organisationId, flaecheId });
    const bank = kycFallFuer(db, { kontoId, organisationId })?.bank || {};
    const gruende = [...fr.gruende];
    if (!F.ibanPruefen(bank.iban)) gruende.push(bank.iban ? "Die IBAN der Bankverbindung ist ungültig." : "In der Verifizierung ist keine Bankverbindung hinterlegt – ohne IBAN keine Auszahlung.");
    return { quelle: "kyc", aktiv: fr.aktiv !== false, status: fr.status, verifiziert: fr.status === "verifiziert", ok: gruende.length === 0, gruende, iban: bank.iban || "", bic: bank.bic || "", kontoinhaber: bank.kontoinhaber || "" };
  }
  const d = db.finanzen?.kycDemo?.[kontoId];
  const gruende = [];
  if (!d || d.status !== "verifiziert") gruende.push("Die Verifizierung ist nicht abgeschlossen.");
  if (!d?.iban || !d?.bankGeprueft) gruende.push("Es fehlt eine geprüfte Bankverbindung (IBAN, Kontoinhaber = verifizierte Person/Firma).");
  else if (!F.ibanPruefen(d.iban)) gruende.push("Die IBAN der geprüften Bankverbindung ist ungültig.");
  if (flaecheId && d?.status === "verifiziert" && !(d.eigentum || []).includes(flaecheId)) gruende.push("Für diese Fläche liegt kein geprüfter Eigentumsnachweis vor.");
  return { quelle: "demo", status: d?.status || "offen", verifiziert: d?.status === "verifiziert", ok: gruende.length === 0, gruende, iban: d?.iban || "", bic: d?.bic || "", kontoinhaber: d?.kontoinhaber || "" };
}

/** Rechnungsempfänger bzw. Gutschriftsempfänger (Name, Anschrift, Land, UID) – aus KYC, sonst aus dem Konto */
export function parteiFuer(db, { kontoId = null, organisationId = null }) {
  const u = kontoId ? nutzerById(db, kontoId) : null;
  const org = organisationId ? (db.organisationen || []).find((o) => o.id === organisationId) : null;
  const fall = db.kyc ? kycFallFuer(db, { kontoId, organisationId }) : null;
  const demo = kontoId ? db.finanzen?.kycDemo?.[kontoId] : null;
  const firma = fall?.firma?.name || org?.name || demo?.firma || u?.firma || "";
  const person = u ? nameVon(db, u.id) : "";
  return {
    name: firma || person || "–",
    zuHaenden: firma && person ? person : "",
    anschrift: adresseText(fall?.firma?.anschrift || fall?.firma?.sitz || fall?.person?.anschrift || fall?.anschrift || demo?.anschrift) || "",
    land: fall?.firma?.land || fall?.person?.land || demo?.land || org?.land || "",
    uid: fall?.firma?.uid || fall?.steuer?.uid || demo?.uid || "",
    email: u?.email || "",
    kleinunternehmer: !!demo?.kleinunternehmer,
  };
}

// ================================================================ Belege

function naechsteNummer(db, kreis, jahr) {
  const k = (db.finanzen.nummernkreise[kreis] ||= {});
  k[jahr] = (k[jahr] || 0) + 1;
  return `${kreis}-${jahr}-${String(k[jahr]).padStart(5, "0")}`;
}

const aktiverBeleg = (db, schluessel) => db.finanzen.belege.find((b) => b.schluessel === schluessel && b.status !== "storniert");

function klaerfallSchliessen(db, schluessel, text) {
  for (const k of db.finanzen.klaerfaelle.filter((x) => x.schluessel === schluessel && x.status === "offen")) {
    k.status = "erledigt";
    k.erledigtAm = jetzt();
    k.kommentar = text;
  }
}

/** Klärfall anlegen bzw. offenen Klärfall zum selben Schlüssel aktualisieren */
export function klaerfallMelden(db, { art, schluessel, bezug, bezugText, gruende, laufId }) {
  const offen = db.finanzen.klaerfaelle.find((k) => k.schluessel === schluessel && k.status === "offen");
  if (offen) {
    Object.assign(offen, { gruende, zuletztAm: jetzt(), anzahl: (offen.anzahl || 1) + 1, laufId });
    return { klaerfall: offen, neu: false };
  }
  const k = { id: neueId("KL"), art, schluessel, bezug, bezugText, gruende, status: "offen", erstelltAm: jetzt(), zuletztAm: jetzt(), anzahl: 1, laufId, kommentar: "", verlauf: [] };
  db.finanzen.klaerfaelle.push(k);
  return { klaerfall: k, neu: true };
}

const TITEL = { pacht: "Gutschrift – Pachtabrechnung", contracting: "Rechnung – Contracting-Strom", provision: "Rechnung – Vermittlungsprovision" };

/** Beleg erzeugen (bzw. im Trockenlauf nur berechnen) */
export function belegAnlegen(db, n, e, { trockenlauf = false, melden = true, heute = F.heute(), erstelltAm = null } = {}) {
  const art = F.ABRECHNUNG_ARTEN[e.art];
  const netto = F.summe(e.positionen, "betrag");
  const steuer = F.steuerBerechnen(netto, e.steuerVorlage);
  const ges = gesellschaftFuer(db, e.gesellschaftId);
  const beleg = {
    id: trockenlauf ? null : neueId("AR"),
    nummer: trockenlauf ? "(Vorschau)" : naechsteNummer(db, art.kreis, F.jahrVon(heute)),
    art: e.art,
    beleg: e.art === "pacht" ? "gutschrift" : "rechnung",
    titel: TITEL[e.art],
    empfaengerId: e.empfaengerId || null,
    organisationId: e.organisationId || null,
    partei: e.partei,
    // Gutschrift: ausstellende Gesellschaft = Pächter; Rechnung: leistende Gesellschaft (Contracting: Eigentümergesellschaft)
    gesellschaftId: ges.id,
    aussteller: { name: ges.name, anschrift: ges.anschrift, land: ges.land, uid: ges.uid, firmenbuch: ges.firmenbuch },
    bezug: e.bezug,
    bezugText: e.bezugText,
    schluessel: e.schluessel,
    zeitraum: e.zeitraum,
    rechnungsdatum: heute,
    faelligAm: e.faelligAm,
    positionen: e.positionen,
    netto,
    steuer: { vorlage: steuer.vorlage, label: steuer.label, satz: steuer.satz, art: steuer.art, betrag: steuer.betrag, text: steuer.text, rechtsgrundlage: steuer.rechtsgrundlage },
    brutto: steuer.brutto,
    waehrung: "EUR",
    erklaerung: e.erklaerung || [],
    zaehlerstaende: e.zaehlerstaende || [],
    hinweise: e.hinweise || [],
    kennzahlen: e.kennzahlen || {},
    status: "offen",
    bezahltAm: null,
    zahlungslaufId: null,
    mahnungen: [],
    erpnext: { doctype: art.erpnext, name: null },
    laufId: e.laufId || null,
    erstelltAm: erstelltAm || jetzt(),
    erstelltVon: n?.id || null,
  };
  beleg.pflichtFehlt = F.pflichtangabenPruefen({ ...beleg, empfaenger: beleg.partei });
  if (trockenlauf) return beleg;
  db.finanzen.belege.push(beleg);
  klaerfallSchliessen(db, e.schluessel, `Beleg ${beleg.nummer} erzeugt.`);
  protokoll(db, n?.id === SYSTEM_FINANZEN.id ? null : n, "abrechnung_erzeugt", "abrechnung", beleg.id, `${art.label} ${beleg.nummer}: ${F.euro(beleg.brutto)} (${e.bezugText})`);
  if (melden) belegMelden(db, beleg, "neu");
  return beleg;
}

/** Benachrichtigung an Empfänger (Konto bzw. Organisationsinhaber) – Glocke + E-Mail ohne Beträge */
export function belegMelden(db, b, ereignis) {
  const empfaenger = new Set();
  if (b.empfaengerId) empfaenger.add(b.empfaengerId);
  if (!b.empfaengerId && b.organisationId) for (const m of (db.mitgliedschaften || []).filter((x) => x.organisationId === b.organisationId && ["inhaber", "admin"].includes(x.rolle))) empfaenger.add(m.nutzerId);
  const label = F.ABRECHNUNG_ARTEN[b.art].label;
  const texte = {
    neu: { titel: `${b.beleg === "gutschrift" ? "Neue Gutschrift" : "Neue Rechnung"} ${b.nummer}`, text: `${label} für ${F.datumDe(b.zeitraum.von)} – ${F.datumDe(b.zeitraum.bis)} liegt im Portal bereit.`, betreff: "Neue Abrechnung im Portal – ÖkoInvest", mail: "Für Sie liegt eine neue Abrechnung im Portal von ÖkoInvest bereit. PDF und Details finden Sie unter „Abrechnungen“." },
    bezahlt: b.beleg === "gutschrift"
      ? { titel: `Auszahlung ${b.nummer} ausgeführt`, text: `Die Pacht für ${F.datumDe(b.zeitraum.von)} – ${F.datumDe(b.zeitraum.bis)} wurde überwiesen.`, betreff: "Pachtzahlung ausgeführt – ÖkoInvest", mail: "Eine Pachtzahlung wurde ausgeführt. Details finden Sie im Portal unter „Abrechnungen“." }
      : { titel: `Zahlung zu ${b.nummer} eingegangen`, text: "Vielen Dank – die Zahlung ist verbucht.", betreff: "Zahlung eingegangen – ÖkoInvest", mail: "Ihre Zahlung ist bei uns eingegangen. Details finden Sie im Portal unter „Abrechnungen“." },
    erinnerung: { titel: `Zahlungserinnerung ${b.nummer}`, text: `Die Rechnung war am ${F.datumDe(b.faelligAm)} fällig.`, betreff: "Zahlungserinnerung – ÖkoInvest", mail: "Zu einer Rechnung im Portal von ÖkoInvest ist noch keine Zahlung eingegangen. Details finden Sie unter „Abrechnungen“." },
  }[ereignis];
  if (!texte) return;
  for (const id of empfaenger) {
    const u = nutzerById(db, id);
    if (u) benachrichtigen(db, u, { art: "abrechnung", titel: texte.titel, text: texte.text, link: "/portal/abrechnungen", objektArt: "abrechnung", objektId: b.id }, { mailBetreff: texte.betreff, mailText: texte.mail });
  }
}

// ================================================================ Provision ↔ Rechnung

/** Provisionsstatus aus dem Zahlungsstatus der Rechnung nachziehen (offen → in_rechnung → bezahlt) */
export function provisionNachziehen(db, n, b) {
  if (b.art !== "provision") return;
  const pv = db.provisionen.find((p) => p.id === b.bezug?.provisionId);
  if (!pv || pv.status === "storniert") return;
  const ziel = F.provisionStatusAusRechnung(b);
  const reihenfolge = ["offen", "in_rechnung", "bezahlt"];
  if (reihenfolge.indexOf(ziel) <= reihenfolge.indexOf(pv.status)) return;
  const von = pv.status;
  pv.status = ziel;
  pv.statusVerlauf = pv.statusVerlauf || [];
  pv.statusVerlauf.push({ status: ziel, am: jetzt(), vonId: n?.id && n.id !== SYSTEM_FINANZEN.id ? n.id : null, vonRolle: "system", kommentar: ziel === "bezahlt" ? `Zahlung zu Rechnung ${b.nummer} verbucht.` : `Rechnung ${b.nummer} gestellt.` });
  pv.rechnung = { id: b.id, nummer: b.nummer, faelligAm: b.faelligAm };
  protokoll(db, n?.id === SYSTEM_FINANZEN.id ? null : n, "status", "provision", pv.id, `${von} → ${ziel} (Rechnung ${b.nummer})`);
  backofficeEreignis(db, { typ: "status", art: "provision", objekt: pv, von, nach: ziel }); // Automationen
}

// ================================================================ Abrechnungslauf

/** Pachtvertrag → Parameter der Fälligkeitsberechnung */
export function vertragFuerFaelligkeit(db, pt) {
  return { ...pt, vorlaufTage: pt.vorlaufTage ?? einstellungen(db).vorlaufTage, zahlungszielTage: pt.zahlungszielTage ?? einstellungen(db).zahlungszielTage };
}

/** Steuervorlage eines Pachtvertrags (eigene Wahl oder Vorschlag nach Land/Option/Kleinunternehmer) */
export function pachtSteuerVorlage(pt) {
  return pt.steuervorlage && F.STEUERVORLAGEN[pt.steuervorlage] ? pt.steuervorlage : F.steuerVorschlag("pacht", pt.land, { option: !!pt.steuerOption, kleinunternehmer: !!pt.kleinunternehmer }).vorlage;
}

/**
 * Gesperrte Auszahlung sichtbar machen: je Eigentümer und Vertrag ein Klärfall „KYC unvollständig“ (nicht stillschweigend
 * überspringen); ist die Freigabe inzwischen erteilt, wird der Klärfall geschlossen.
 */
export function kycKlaerfall(db, lauf, pt, partei, kyc, trocken = false) {
  const schluessel = `KYC:${pt.eigentuemerId}:${pt.id}`;
  if (kyc.ok) {
    if (!trocken) klaerfallSchliessenKyc(db, schluessel);
    return;
  }
  const e = { art: "pacht", schluessel, bezug: { pachtvertragId: pt.id, kontoId: pt.eigentuemerId }, bezugText: `Auszahlung an ${partei?.name || pt.eigentuemerId} (${pt.bezeichnung})`, gruende: [`KYC unvollständig: ${kyc.gruende.join(" ")}`] };
  if (trocken) return;
  const vorher = db.finanzen.klaerfaelle.find((k) => k.schluessel === schluessel && k.status === "offen");
  if (vorher && vorher.laufId === lauf.id) return;
  const { klaerfall, neu } = klaerfallMelden(db, { ...e, laufId: lauf.id });
  lauf.klaerfaelle.push({ id: klaerfall.id, art: "pacht", bezugText: e.bezugText, gruende: e.gruende, neu });
}

export function klaerfallSchliessenKyc(db, schluessel, text = "KYC-Freigabe für Auszahlungen erteilt.") {
  for (const k of db.finanzen.klaerfaelle.filter((x) => x.schluessel === schluessel && x.status === "offen")) Object.assign(k, { status: "erledigt", erledigtAm: jetzt(), kommentar: text });
}

/**
 * Lauf ausführen (innerhalb einer Schreibtransaktion).
 * opt: { art: pacht|contracting|provision|alle, stichtag, monat (Contracting), trockenlauf, vertragIds[], anlageIds[], vorab: { anlagen: {id: {anlage, vertrag, messpunkte, zeilen}} }, melden }
 */
export function laufAusfuehren(db, n, opt) {
  const art = opt.art || "alle";
  const stichtag = opt.stichtag || F.heute();
  const monat = opt.monat || F.vormonat(stichtag.slice(0, 7));
  const trocken = !!opt.trockenlauf;
  const lauf = { id: trocken ? null : neueId("LA"), art, stichtag, monat, trockenlauf: trocken, am: jetzt(), vonId: n?.id && n.id !== SYSTEM_FINANZEN.id ? n.id : null, vonName: n?.id === SYSTEM_FINANZEN.id ? "Scheduler" : nameVon(db, n?.id) || "", erzeugt: [], klaerfaelle: [], vorhanden: 0, uebersprungen: 0 };
  const erzeugen = (e) => {
    const b = belegAnlegen(db, n, { ...e, laufId: lauf.id }, { trockenlauf: trocken, melden: opt.melden !== false, heute: opt.rechnungsdatum || F.heute() });
    lauf.erzeugt.push({ id: b.id, nummer: b.nummer, art: b.art, empfaenger: b.partei?.name, zeitraum: b.zeitraum, netto: b.netto, brutto: b.brutto, bezugText: b.bezugText });
    return b;
  };
  const klaeren = (e) => {
    if (trocken) {
      lauf.klaerfaelle.push({ id: null, art: e.art, bezugText: e.bezugText, gruende: e.gruende, neu: true });
      return;
    }
    const { klaerfall, neu } = klaerfallMelden(db, { ...e, laufId: lauf.id });
    lauf.klaerfaelle.push({ id: klaerfall.id, art: e.art, bezugText: e.bezugText, gruende: e.gruende, neu });
  };
  const anlagen = opt.vorab?.anlagen || {};

  // ---------------------------------------------------------------- Pacht
  if (art === "pacht" || art === "alle") {
    for (const pt of db.finanzen.pachtvertraege) {
      if (!["aktiv", "gekuendigt"].includes(pt.status)) continue;
      if (opt.vertragIds?.length && !opt.vertragIds.includes(pt.id)) continue;
      const eigentuemer = nutzerById(db, pt.eigentuemerId);
      for (const f of F.abzurechnen(vertragFuerFaelligkeit(db, pt), stichtag)) {
        if (aktiverBeleg(db, f.schluessel)) {
          lauf.vorhanden++;
          continue;
        }
        const bezugText = `${pt.bezeichnung} (${pt.id}) ${F.datumDe(f.von)} – ${F.datumDe(f.bis)}`;
        let ertrag = { kwh: null, fehlt: [] };
        if (pt.modell === "umsatz" && f.phase === "pacht") {
          const a = anlagen[pt.anlageId];
          ertrag = a ? F.ertragAusMonatswerten(a.zeilen, a.messpunkte, f.von, f.bis) : { kwh: null, fehlt: ["keine Anlage/Monatswerte verknüpft"] };
        }
        const r = F.pachtPositionen(pt, f, { indexTabelle: db.finanzen.vpi, ertragKwh: ertrag.kwh, ertragFehlt: ertrag.fehlt });
        if (r.klaerung || !eigentuemer) {
          klaeren({ art: "pacht", schluessel: f.schluessel, bezug: { pachtvertragId: pt.id }, bezugText, gruende: [r.klaerung || "Eigentümer-Konto nicht gefunden."] });
          continue;
        }
        if (!(r.netto > 0)) {
          lauf.uebersprungen++;
          continue;
        }
        const partei = parteiFuer(db, { kontoId: pt.eigentuemerId });
        const kyc = kycAuszahlung(db, { kontoId: pt.eigentuemerId, flaecheId: pt.flaecheId || null });
        kycKlaerfall(db, lauf, pt, partei, kyc, trocken);
        const pachtGesellschaft = pt.gesellschaftId || (pt.anlageId && anlagen[pt.anlageId] ? anlageGesellschaftId(db, anlagen[pt.anlageId].roh || anlagen[pt.anlageId].anlage) : OEKOINVEST_ID);
        erzeugen({
          art: "pacht", gesellschaftId: pachtGesellschaft, empfaengerId: pt.eigentuemerId, partei, schluessel: f.schluessel,
          bezug: { pachtvertragId: pt.id, flaecheId: pt.flaecheId || null, anlageId: pt.anlageId || null, phase: f.phase },
          bezugText, zeitraum: { von: f.von, bis: f.bis }, faelligAm: f.faelligAm, positionen: r.positionen, steuerVorlage: pachtSteuerVorlage(pt),
          erklaerung: r.erklaerung, kennzahlen: { ...r.basis, phase: f.phase, zahlweise: f.zahlweise },
          hinweise: kyc.ok ? [] : [`Auszahlung gesperrt: ${kyc.gruende.join(" ")}`],
        });
      }
    }
  }

  // ---------------------------------------------------------------- Contracting (Monat)
  if (art === "contracting" || art === "alle") {
    const z = F.monatsZeitraum(monat);
    for (const [anlageId, a] of Object.entries(anlagen)) {
      if (!a.vertrag || a.vertrag.status !== "aktiv") continue;
      if (opt.anlageIds?.length && !opt.anlageIds.includes(anlageId)) continue;
      if (!a.vertrag.beginn || a.vertrag.beginn > z.bis) continue;
      const schluessel = `CV:${anlageId}:${monat}`;
      if (aktiverBeleg(db, schluessel)) {
        lauf.vorhanden++;
        continue;
      }
      const bezugText = `${a.anlage.name} (${anlageId}) ${monat.slice(5)}/${monat.slice(0, 4)}`;
      const r = F.contractingAbrechnen({ vertrag: a.vertrag, anlage: a.anlage, monat, messpunkte: a.messpunkte, zeilen: a.zeilen, indexTabelle: db.finanzen.vpi });
      const { kontoId, organisationId } = stromabnehmerVon(a.roh, a.anlage);
      const ges = anlageGesellschaft(db, a.roh || a.anlage);
      const gesellschaftId = ges.id;
      if (r.ok && !ges.bekannt) {
        klaeren({ art: "contracting", schluessel, bezug: { anlageId, monat }, bezugText, gruende: [`Eigentümergesellschaft ${gesellschaftId} nicht im Gesellschaftsverzeichnis – Rechnungsaussteller unklar.`] });
        continue;
      }
      if (!r.ok || (!kontoId && !organisationId)) {
        klaeren({ art: "contracting", schluessel, bezug: { anlageId, monat }, bezugText, gruende: r.ok ? ["Kein Rechnungsempfänger (Stromabnehmer bzw. Kunde/Organisation) an der Anlage."] : r.klaerung });
        continue;
      }
      erzeugen({
        art: "contracting", gesellschaftId, empfaengerId: kontoId, organisationId, partei: parteiFuer(db, { kontoId, organisationId }), schluessel,
        bezug: { anlageId, vertragId: a.vertrag.id || null, monat }, bezugText,
        zeitraum: z, faelligAm: F.plusTage(opt.rechnungsdatum || F.heute(), einstellungen(db).zahlungszielTage),
        positionen: r.positionen, steuerVorlage: a.vertrag.steuervorlage || F.steuerVorschlag("contracting", a.anlage.land).vorlage,
        zaehlerstaende: r.zaehlerstaende, hinweise: r.hinweise, kennzahlen: { gelieferteKwh: r.gelieferteKwh, arbeitspreisCt: r.arbeitspreisCt, monat, kwp: a.anlage.kwp },
        erklaerung: r.gelieferteKwh !== null ? [`Gelieferter PV-Strom = Erzeugung (geeichter Erzeugungszähler) abzüglich Einspeisung ins Netz. Grundlage: Zählerstand-Monatswerte des Messstellenbetreibers.`] : ["Abrechnung der monatlichen Grundgebühr laut Contracting-Vertrag."],
      });
    }
  }

  // ---------------------------------------------------------------- Provision
  if (art === "provision" || art === "alle") {
    for (const pv of db.provisionen) {
      if (!["offen", "in_rechnung"].includes(pv.status)) continue;
      const schluessel = `PV:${pv.id}`;
      if (aktiverBeleg(db, schluessel)) {
        lauf.vorhanden++;
        continue;
      }
      const p = db.projekte.find((x) => x.id === pv.projektId);
      const bezugText = `Provision ${pv.id} – ${p?.titel || pv.projektId}`;
      if (!nutzerById(db, pv.anbieterId)) {
        klaeren({ art: "provision", schluessel, bezug: { provisionId: pv.id }, bezugText, gruende: ["Anbieter-Konto nicht gefunden."] });
        continue;
      }
      const partei = parteiFuer(db, { kontoId: pv.anbieterId, organisationId: p?.organisationId || null });
      const land = partei.land || p?.land || "AT";
      const vorschlag = F.steuerVorschlag("provision", land, { grundstuecksbezug: true });
      const b = erzeugen({
        art: "provision", gesellschaftId: OEKOINVEST_ID, empfaengerId: pv.anbieterId, organisationId: p?.organisationId || null, partei, schluessel,
        bezug: { provisionId: pv.id, projektId: pv.projektId }, bezugText,
        zeitraum: { von: String(pv.erstelltAm).slice(0, 10), bis: String(pv.erstelltAm).slice(0, 10) },
        faelligAm: F.plusTage(opt.rechnungsdatum || F.heute(), einstellungen(db).zahlungszielTage),
        positionen: F.provisionPositionen(pv, p?.titel || ""), steuerVorlage: vorschlag.vorlage,
        hinweise: partei.land ? vorschlag.hinweise : [...vorschlag.hinweise, "Sitz des Anbieters unbekannt – Land des Projekts verwendet."],
        erklaerung: [`Provision laut Provisionsvereinbarung: ${F.rund(pv.satz * 100, 2).toLocaleString("de-DE")} % des Kaufpreises, fällig bei Abschluss.`],
        kennzahlen: { kaufpreis: pv.kaufpreis, satz: pv.satz },
      });
      if (!trocken) provisionNachziehen(db, n, b);
    }
  }

  if (!trocken) {
    db.finanzen.laeufe.unshift({ ...lauf, erzeugt: lauf.erzeugt.slice(0, 200) });
    db.finanzen.laeufe = db.finanzen.laeufe.slice(0, 100);
    protokoll(db, n?.id === SYSTEM_FINANZEN.id ? null : n, "abrechnungslauf", "finanzen", lauf.id, `Lauf ${F.LAUF_ARTEN[art]} zum ${F.datumDe(stichtag)}: ${lauf.erzeugt.length} Belege, ${lauf.klaerfaelle.length} Klärfälle`);
  }
  return lauf;
}
