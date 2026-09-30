// src/lib/plattform/backend/demo/kyc.js
//
// KYC/KYB – Identitäts- und Firmenprüfung im Demo-Backend. Referenz für plattform/api/kyc.py (Vertrag: docs/API.md,
// Abschnitt „KYC/KYB“). Daten unter db.kyc (eigene Sammlung, beim ersten Zugriff mit Demo-Daten ergänzt – kyc-seed.js).
// Unterlagen verschlüsselt (AES-256-GCM, server/kycKrypto.js) unter .data/kyc/ – nie im Klartext auf der Platte.
//
// Rechte (jede Operation prüft selbst):
//   Person selbst  – eigener Fall: Angaben, Uploads, eigene Unterlagen ansehen/löschen (solange bearbeitbar), einreichen
//   Compliance     – Backoffice-Unterrolle „compliance“ (rechte.js, Bereich compliance = 2): Warteschlange, Fall, Unterlagen,
//                    Prüfliste, Risiko, Entscheidung, Vier-Augen, Sanktionsabgleich, Einstellungen, Fristen
//   Leitung        – Bereich compliance = 1: nur Warteschlange/Status (keine Unterlagen, keine Personendaten im Detail)
//   sonst          – 403. Jeder Zugriff auf Unterlagen und Falldetails wird im Aktivitätsprotokoll (Hash-Kette) vermerkt.
//
// Sanktionstreffer werden dem Nutzer NIE angezeigt (Status bleibt „In Prüfung“) – Tipping-off-Verbot (§ 47 GwG).

import { readFileSync, existsSync, mkdirSync, writeFileSync } from "node:fs";
import { promises as fs } from "node:fs";
import path from "node:path";
import { PlattformFehler, konflikt, nichtGefunden, ungueltig, verboten } from "../../fehler";
import * as v from "../../validierung";
import { stufe, unterrollen } from "../../rechte";
import {
  KYC_BEARBEITBAR, KYC_DOKUMENTE, KYC_KONTOTYPEN, KYC_KONTROLLE_ARTEN, KYC_MITTEL_QUELLEN, KYC_PRUEFPUNKTE, KYC_SCHRITTE, KYC_SCHRITT_IDS, KYC_STATUS,
  KYC_TICKETS, KYC_UPLOAD, KYC_WARTESCHLANGE, heuteIso, ibanPruefen, kontoinhaberPasst, kycAnforderungen, kycEinstellungenStandard, kycFortschritt, kycGeltung,
  kycRisiko, kycSchrittAktiv, kycStatusLabel, kycUebergangErlaubt, loeschenAb, monateSpaeter, tageBis, ibanMaskiert, ibanFormatiert,
} from "../../kyc";
import { DEMO_SANKTIONSLISTE, prueflingeAusFall, sanktionsAbgleich } from "../../sanktionsliste";
import { kycEntschluesseln, kycSchluesselStatus, kycVerschluesseln } from "../../server/kycKrypto";
import { intern } from "../demo";
import { aendern, lesen, DATEN_ORDNER } from "./speicher";
import { jetzt, neueId, sha256 } from "./hilfen";
import { kycEinstellungenDb, kycErgebnisAnhaengenDb, kycFallFuer, kycFreigabeDb, kycStatusDb } from "./kycRegeln";
import { kycSeed } from "./kyc-seed";

const { benachrichtigen, protokoll, nutzerById, nameVon } = intern;

export const KYC_ORDNER = path.join(DATEN_ORDNER, "kyc");
const LISTE_DATEI = path.join(DATEN_ORDNER, "kyc-sanktionsliste.json");
const MAIL_KYC = "Zu Ihrer Verifizierung gibt es Neuigkeiten. Aus Gründen der Vertraulichkeit enthält diese E-Mail keine Inhalte – bitte melden Sie sich im Portal an.";

// ================================================================ Rechte

const istAdmin = (n) => !!n?.rollen?.includes("admin");
const istCompliance = (n) => istAdmin(n) && unterrollen(n).includes("compliance") && stufe(n, "compliance") >= 2;
const complianceLesen = (n) => istAdmin(n) && stufe(n, "compliance") >= 1;

function angemeldet(n) {
  if (!n) throw new PlattformFehler(401, "Bitte melden Sie sich an.");
}
function complianceNoetig(n) {
  angemeldet(n);
  if (!istCompliance(n)) throw verboten(istAdmin(n) ? "Nur für die Compliance (Backoffice-Rolle „Compliance“)." : "Dafür fehlt Ihnen die Berechtigung.");
}

// ================================================================ Datenbestand

function leer() {
  return { v: 1, faelle: [], dokumente: [], abgleiche: [], einstellungen: kycEinstellungenStandard() };
}

async function lesenBereit() {
  const db = await lesen();
  if (db.kyc?.v) return db;
  await aendern(async (d) => {
    if (d.kyc?.v) return;
    d.kyc = leer();
    try {
      await kycSeed(d, { dateiSchreiben, abgleichen: (f) => abgleichAusfuehren(d, f, null, "Einreichung (Demo)") });
    } catch (e) {
      console.warn("[plattform-demo] KYC-Demodaten nicht ergänzt:", e?.message);
    }
  });
  return lesen();
}

async function aendernBereit(fn) {
  await lesenBereit();
  return aendern(fn);
}

// ---------------------------------------------------------------- Dateien (verschlüsselt)

function dateiSchreiben(datei, verschluesselt) {
  mkdirSync(KYC_ORDNER, { recursive: true });
  writeFileSync(path.join(KYC_ORDNER, path.basename(datei)), verschluesselt);
}
async function dateiLesen(datei) {
  return fs.readFile(path.join(KYC_ORDNER, path.basename(datei)));
}
async function dateiLoeschen(datei) {
  await fs.rm(path.join(KYC_ORDNER, path.basename(datei)), { force: true }).catch(() => {});
}

// ---------------------------------------------------------------- Sanktionsliste

let listeCache = null;
export function sanktionsliste() {
  try {
    if (existsSync(LISTE_DATEI)) {
      const roh = readFileSync(LISTE_DATEI, "utf8");
      if (!listeCache || listeCache.roh !== roh.length) listeCache = { roh: roh.length, liste: JSON.parse(roh) };
      return listeCache.liste;
    }
  } catch (e) {
    console.warn("[plattform-kyc] Sanktionsliste nicht lesbar:", e?.message);
  }
  return { ...DEMO_SANKTIONSLISTE, demo: true };
}

function abgleichAusfuehren(db, f, n, anlass) {
  const liste = sanktionsliste();
  const e = kycEinstellungenDb(db);
  const prueflinge = prueflingeAusFall(f);
  const treffer = prueflinge.flatMap((p) => sanktionsAbgleich(p, liste.eintraege || [], { schwelle: e.trefferSchwelle }).map((t) => ({ ...t, pruefling: p.rolle, prueflingName: p.name })));
  const alt = new Map((f.sanktionen?.treffer || []).map((t) => [`${t.eintragId}|${t.prueflingName}`, t]));
  const neu = treffer.map((t) => {
    const a = alt.get(`${t.eintragId}|${t.prueflingName}`);
    return a?.bewertung ? { ...t, bewertung: a.bewertung, begruendung: a.begruendung, bewertetVon: a.bewertetVon, bewertetAm: a.bewertetAm } : { ...t, bewertung: null };
  });
  const offen = neu.some((t) => !t.bewertung);
  const bestaetigt = neu.some((t) => t.bewertung === "bestaetigt");
  f.sanktionen = { status: bestaetigt ? "bestaetigt" : offen ? "treffer_pruefen" : neu.length ? "ausgeschlossen" : "kein_treffer", treffer: neu, letzterAbgleich: jetzt(), listeStand: liste.stand || "", listeQuelle: liste.quelle || "" };
  const eintrag = { id: neueId("KA"), fallId: f.id, am: jetzt(), anlass, prueflinge: prueflinge.length, treffer: neu.length, listeStand: liste.stand || "", vonId: n?.id || null };
  db.kyc.abgleiche.unshift(eintrag);
  if (db.kyc.abgleiche.length > 2000) db.kyc.abgleiche.length = 2000;
  protokoll(db, n, "kyc_abgleich", "kyc", f.id, `Sanktionsabgleich (${anlass}): ${prueflinge.length} Namen, ${neu.length} Treffer`);
  return f.sanktionen;
}

// ---------------------------------------------------------------- Helfer

const fallById = (db, id) => (db.kyc.faelle || []).find((f) => f.id === v.kennung(id)) || null;
const eigenerFall = (db, n) => (db.kyc.faelle || []).find((f) => f.kontoId === n.id) || null;
const dokumenteVon = (db, f) => (db.kyc.dokumente || []).filter((d) => d.fallId === f.id && !d.geloescht);
const flaechenVon = (db, kontoId) => (db.flaechen || []).filter((x) => x.nutzerId === kontoId).map((x) => ({ id: x.id, bezeichnung: x.bezeichnung, land: x.land }));

function kontextFuer(db, f) {
  const u = nutzerById(db, f.kontoId);
  return { rollen: u?.rollen || [], flaechen: flaechenVon(db, f.kontoId), einstellungen: kycEinstellungenDb(db) };
}

function anforderungenVon(db, f, { nurGeprueft = false } = {}) {
  const docs = dokumenteVon(db, f).filter((d) => !nurGeprueft || d.status === "ok");
  return kycAnforderungen({ ...f, dokumente: docs }, kontextFuer(db, f));
}

function verlauf(f, status, n, rolle, kommentar = "", { oeffentlich = true } = {}) {
  f.verlauf = f.verlauf || [];
  f.verlauf.push({ status, am: jetzt(), vonId: n?.id || null, rolle, kommentar: v.mehrzeilig(kommentar, 1000), oeffentlich });
}

function statusSetzen(db, f, nach, n, wer, kommentar = "", opt = {}) {
  if (!kycUebergangErlaubt(f.status, nach, wer)) throw konflikt(`Statuswechsel „${kycStatusLabel(f.status, { intern: true })}“ → „${kycStatusLabel(nach, { intern: true })}“ ist nicht möglich.`);
  const von = f.status;
  f.status = nach;
  f.geaendertAm = jetzt();
  verlauf(f, nach, n, wer, kommentar, opt);
  protokoll(db, n, "kyc_status", "kyc", f.id, `${kycStatusLabel(von, { intern: true })} → ${kycStatusLabel(nach, { intern: true })}`);
}

function complianceKonten(db) {
  return db.nutzer.filter((u) => u.aktiv && u.rollen.includes("admin") && unterrollen(u).includes("compliance"));
}

function nutzerMelden(db, f, titel, text) {
  const u = nutzerById(db, f.kontoId);
  if (u) benachrichtigen(db, u, { art: "status", titel, text, link: "/portal/verifizierung", objektArt: "kyc", objektId: f.id }, { mailText: MAIL_KYC, mailBetreff: "Neuigkeiten zu Ihrer Verifizierung – ÖkoInvest" });
}

function complianceMelden(db, f, titel, text, { ohneId = null } = {}) {
  for (const u of complianceKonten(db)) {
    if (u.id === ohneId) continue;
    benachrichtigen(db, u, { art: "aufgabe", titel, text, link: `/portal/admin/compliance/${f.id}`, objektArt: "kyc", objektId: f.id }, { mailText: "Im Compliance-Bereich liegt ein Vorgang zur Prüfung bereit. Details nur im Portal." });
  }
}

// ---------------------------------------------------------------- Ausgabe

function dokumentMeta(d, { compliance = false } = {}) {
  return {
    id: d.id, fallId: d.fallId, art: d.art, artLabel: KYC_DOKUMENTE[d.art]?.label || d.art, name: d.name, mime: d.mime, groesse: d.groesse, am: d.am,
    flaecheId: d.flaecheId || null, personId: d.personId || null, ausgestelltAm: d.ausgestelltAm || null, status: d.status,
    grund: d.status === "abgelehnt" ? d.pruefung?.notiz || "" : "",
    ...(compliance ? { sha256: d.sha256, pruefung: d.pruefung || null, verschluesselt: true } : {}),
  };
}

function fallFuerNutzer(db, f) {
  if (!f) return null;
  const sichtStatus = f.status === "zweitpruefung" ? "in_pruefung" : f.status;
  return {
    id: f.id, kontotyp: f.kontotyp, status: sichtStatus, statusLabel: kycStatusLabel(sichtStatus), organisationId: f.organisationId || null,
    person: f.person || {}, firma: f.firma || {}, ubos: f.ubos || [], vertreter: f.vertreter || [], einreicherVertretungsberechtigt: f.einreicherVertretungsberechtigt ?? null,
    pep: f.pep || {}, mittelherkunft: f.mittelherkunft || {}, steuer: f.steuer || {},
    bank: f.bank ? { iban: f.bank.iban ? ibanFormatiert(f.bank.iban) : "", kontoinhaber: f.bank.kontoinhaber || "", bic: f.bank.bic || "", geprueft: f.status === "verifiziert" && !!f.bank.geprueft } : {},
    nachforderung: f.status === "nachgefordert" ? f.nachforderung || "" : "",
    eingereichtAm: f.eingereichtAm || null, verifiziertAm: f.verifiziertAm || null, naechstePruefung: f.naechstePruefung || null,
    verlauf: (f.verlauf || []).filter((x) => x.oeffentlich !== false).map((x) => ({ status: x.status === "zweitpruefung" ? "in_pruefung" : x.status, am: x.am, kommentar: x.rolle === "nutzer" ? "" : x.kommentar })),
    bearbeitbar: KYC_BEARBEITBAR.includes(f.status),
    dokumente: dokumenteVon(db, f).map((d) => dokumentMeta(d)),
  };
}

function freigabenFuer(db, kontoId, status) {
  const e = kycEinstellungenDb(db);
  return Object.fromEntries(KYC_SCHRITT_IDS.map((s) => {
    const aktiv = kycSchrittAktiv(s, kontoId, e, process.env);
    return [s, { label: KYC_SCHRITTE[s].label, aktiv, pflichtBeiGeltung: e.gating?.[s] !== false, ok: status.verifiziert }];
  }));
}

// ================================================================ Nutzer

/** Eigener Fall mit Anforderungen, Fortschritt und Freigaben */
export async function kycFall(n) {
  angemeldet(n);
  const db = await lesenBereit();
  const f = eigenerFall(db, n);
  const status = kycStatusDb(db, { kontoId: n.id, organisationId: n.organisation?.id || null });
  const kontext = { rollen: n.rollen || [], flaechen: flaechenVon(db, n.id), einstellungen: kycEinstellungenDb(db) };
  const anforderungen = kycAnforderungen(f ? { ...f, dokumente: dokumenteVon(db, f) } : null, kontext);
  return {
    fall: fallFuerNutzer(db, f),
    anforderungen,
    fortschritt: kycFortschritt(anforderungen),
    status: { ...status, statusLabel: kycStatusLabel(status.status === "zweitpruefung" ? "in_pruefung" : status.status), status: status.status === "zweitpruefung" ? "in_pruefung" : status.status, risiko: undefined },
    flaechen: kontext.flaechen,
    freigaben: freigabenFuer(db, n.id, status),
    ablage: kycSchluesselStatus(),
  };
}

const datum = (x) => (/^\d{4}-\d{2}-\d{2}$/.test(String(x || "")) ? String(x) : "");
const land = (x) => (/^[A-Z]{2}$/.test(String(x || "").toUpperCase()) ? String(x).toUpperCase() : "");
const personDaten = (d = {}) => ({
  vorname: v.text(d.vorname, 80), nachname: v.text(d.nachname, 80), geburtsdatum: datum(d.geburtsdatum), geburtsort: v.text(d.geburtsort, 80),
  staatsangehoerigkeit: land(d.staatsangehoerigkeit),
  adresse: { strasse: v.text(d.adresse?.strasse, 120), plz: v.text(d.adresse?.plz, 12), ort: v.text(d.adresse?.ort, 80), land: land(d.adresse?.land) },
  ausweis: { art: v.auswahl(d.ausweis?.art, ["personalausweis", "reisepass", "aufenthaltstitel"], ""), nummer: v.text(d.ausweis?.nummer, 30), behoerde: v.text(d.ausweis?.behoerde, 120), gueltigBis: datum(d.ausweis?.gueltigBis) },
});

function listeBereinigen(liste, fn, max = 12) {
  return (Array.isArray(liste) ? liste : []).slice(0, max).map((x) => ({ id: /^[a-z0-9-]{4,20}$/i.test(String(x?.id || "")) ? String(x.id) : neueId("WB").toLowerCase(), ...fn(x || {}) }));
}

const ABSCHNITTE = {
  kontotyp: (d, f, n, db) => {
    const typ = v.auswahl(d.kontotyp, Object.keys(KYC_KONTOTYPEN), "");
    v.pflicht(typ, "Bitte wählen Sie den Kontotyp.");
    f.kontotyp = typ;
    if (typ === "unternehmen" && n.organisation?.id && ["inhaber", "admin"].includes(n.organisation.rolle) && !(db.kyc.faelle || []).some((x) => x.organisationId === n.organisation.id && x.id !== f.id)) {
      f.organisationId = n.organisation.id;
      f.firma = { ...(f.firma || {}), name: f.firma?.name || n.organisation.name };
    }
    if (typ === "privat") f.organisationId = null;
  },
  person: (d, f) => {
    f.person = personDaten(d);
  },
  firma: (d, f) => {
    f.firma = {
      name: v.text(d.name, 160), rechtsform: v.text(d.rechtsform, 60), registernummer: v.text(d.registernummer, 60), registergericht: v.text(d.registergericht, 120),
      land: land(d.land), sitz: v.text(d.sitz, 160), mehrstufig: v.wahr(d.mehrstufig), treuhand: v.wahr(d.treuhand),
    };
    if (d.einreicherVertretungsberechtigt !== undefined) f.einreicherVertretungsberechtigt = v.wahr(d.einreicherVertretungsberechtigt);
  },
  ubos: (d, f) => {
    f.ubos = listeBereinigen(d.liste, (u) => ({
      vorname: v.text(u.vorname, 80), nachname: v.text(u.nachname, 80), geburtsdatum: datum(u.geburtsdatum), staatsangehoerigkeit: land(u.staatsangehoerigkeit), wohnsitzland: land(u.wohnsitzland),
      anteil: v.zahl(u.anteil, { min: 0, max: 100, stellen: 2 }), kontrolleArt: v.auswahl(u.kontrolleArt, Object.keys(KYC_KONTROLLE_ARTEN), "anteil"), pep: v.wahr(u.pep),
    }), 10);
  },
  vertreter: (d, f) => {
    f.vertreter = listeBereinigen(d.liste, (x) => ({ vorname: v.text(x.vorname, 80), nachname: v.text(x.nachname, 80), geburtsdatum: datum(x.geburtsdatum), funktion: v.text(x.funktion, 80), istEinreicher: v.wahr(x.istEinreicher) }), 8);
  },
  pep: (d, f) => {
    f.pep = { istPep: d.istPep === undefined ? undefined : v.wahr(d.istPep), naheStehend: d.naheStehend === undefined ? undefined : v.wahr(d.naheStehend), funktion: v.text(d.funktion, 200), angaben: v.mehrzeilig(d.angaben, 1000) };
  },
  mittelherkunft: (d, f) => {
    f.mittelherkunft = { ticket: v.auswahl(d.ticket, Object.keys(KYC_TICKETS), ""), quellen: v.mehrfach(d.quellen, Object.keys(KYC_MITTEL_QUELLEN)), text: v.mehrzeilig(d.text, 1500) };
  },
  steuer: (d, f) => {
    f.steuer = { land: land(d.land), steuerId: v.text(d.steuerId, 40) };
  },
  bank: (d, f) => {
    const ib = ibanPruefen(d.iban);
    if (d.iban && !ib.ok) throw ungueltig(ib.fehler);
    const inhaber = v.text(d.kontoinhaber, 160);
    f.bank = { iban: ib.ok ? ib.iban : "", bic: v.text(d.bic, 11).toUpperCase(), kontoinhaber: inhaber, ibanOk: ib.ok, geprueft: false, geaendertAm: jetzt() };
  },
};

/** Abschnitt speichern (nur solange bearbeitbar). Legt den Fall beim ersten Aufruf an. */
export async function kycSpeichern(n, { abschnitt, daten = {} } = {}) {
  angemeldet(n);
  if (!ABSCHNITTE[abschnitt]) throw ungueltig("Unbekannter Abschnitt.");
  return aendernBereit((db) => {
    let f = eigenerFall(db, n);
    if (!f) {
      if (abschnitt !== "kontotyp") throw ungueltig("Bitte wählen Sie zuerst den Kontotyp.");
      f = { id: neueId("KY"), kontoId: n.id, organisationId: null, kontotyp: "", status: "offen", verlauf: [], erstelltAm: jetzt(), geaendertAm: jetzt() };
      verlauf(f, "offen", n, "nutzer", "Verifizierung begonnen.");
      db.kyc.faelle.push(f);
    }
    if (!KYC_BEARBEITBAR.includes(f.status)) throw konflikt(f.status === "verifiziert" ? "Ihre Verifizierung ist abgeschlossen. Für Änderungen starten Sie bitte eine erneute Prüfung." : "Ihre Angaben liegen gerade zur Prüfung vor und können nicht geändert werden.");
    ABSCHNITTE[abschnitt](daten || {}, f, n, db);
    f.geaendertAm = jetzt();
    protokoll(db, n, "kyc_angaben", "kyc", f.id, `Angaben gespeichert: ${abschnitt}`);
    return kycFallSync(db, n, f);
  });
}

function kycFallSync(db, n, f) {
  const kontext = { rollen: n.rollen || [], flaechen: flaechenVon(db, n.id), einstellungen: kycEinstellungenDb(db) };
  const anforderungen = kycAnforderungen({ ...f, dokumente: dokumenteVon(db, f) }, kontext);
  return { fall: fallFuerNutzer(db, f), anforderungen, fortschritt: kycFortschritt(anforderungen) };
}

/** Unterlage hochladen (Typ/Größe prüft die Route; hier Art, Bezug, Verschlüsselung) */
export async function kycDokumentSpeichern(n, { art, flaecheId = null, personId = null, ausgestelltAm = null, name, mime, daten } = {}) {
  angemeldet(n);
  if (!KYC_DOKUMENTE[art]) throw ungueltig("Unbekannte Dokumentart.");
  if (!KYC_UPLOAD.typen[mime]) throw new PlattformFehler(415, "Erlaubt sind PDF, JPG und PNG.");
  if (!daten?.length || daten.length > KYC_UPLOAD.maxBytes) throw new PlattformFehler(413, "Die Datei ist leer oder größer als 10 MB.");
  return aendernBereit((db) => {
    const f = eigenerFall(db, n);
    if (!f) throw ungueltig("Bitte wählen Sie zuerst den Kontotyp.");
    if (!KYC_BEARBEITBAR.includes(f.status)) throw konflikt("Ihre Unterlagen liegen gerade zur Prüfung vor bzw. sind geprüft. Für Änderungen starten Sie bitte eine erneute Prüfung.");
    const def = KYC_DOKUMENTE[art];
    let fl = null;
    if (def.bezug === "flaeche") {
      fl = (db.flaechen || []).find((x) => x.id === v.kennung(flaecheId));
      if (!fl || fl.nutzerId !== n.id) throw verboten("Eigentumsnachweise nur für eigene Flächen.");
    }
    if (def.bezug === "vertreter") v.pflicht((f.vertreter || []).some((x) => x.id === String(personId || "")), "Bitte ordnen Sie den Ausweis einer vertretungsberechtigten Person zu.");
    const id = neueId("KD");
    const datei = `${id}-${sha256(`${id}${Math.random()}`).slice(0, 16)}.bin`;
    dateiSchreiben(datei, kycVerschluesseln(Buffer.from(daten), id));
    const d = {
      id, fallId: f.id, kontoId: n.id, art, flaecheId: fl?.id || null, personId: def.bezug === "vertreter" ? String(personId) : null,
      ausgestelltAm: datum(ausgestelltAm) || null, name: v.text(name, 160) || `unterlage.${KYC_UPLOAD.typen[mime]}`, mime, groesse: daten.length,
      sha256: sha256(daten), datei, am: jetzt(), hochgeladenVon: n.id, status: "neu", pruefung: null, geloescht: false,
    };
    db.kyc.dokumente.push(d);
    f.geaendertAm = jetzt();
    protokoll(db, n, "kyc_upload", "kyc", f.id, `Unterlage hochgeladen: ${def.label} (${d.id})`);
    return dokumentMeta(d);
  });
}

/** Unterlage öffnen: Person selbst oder Compliance. Jeder Zugriff wird protokolliert (Hash-Kette). */
export async function kycDokumentLesen(n, id, { ip = "" } = {}) {
  angemeldet(n);
  const db = await lesenBereit();
  const d = (db.kyc.dokumente || []).find((x) => x.id === v.kennung(id) && !x.geloescht);
  if (!d) throw nichtGefunden("Unterlage nicht gefunden.");
  const eigen = d.kontoId === n.id;
  if (!eigen && !istCompliance(n)) {
    await aendern((w) => protokoll(w, n, "kyc_zugriff_verweigert", "kyc", d.fallId, `Zugriff auf Unterlage ${d.id} verweigert`, ip));
    throw verboten("Auf diese Unterlage haben Sie keinen Zugriff.");
  }
  const roh = await dateiLesen(d.datei);
  const daten = kycEntschluesseln(roh, d.id);
  await aendern((w) => protokoll(w, n, "kyc_zugriff", "kyc", d.fallId, `Unterlage ${d.id} (${KYC_DOKUMENTE[d.art]?.label || d.art}) geöffnet${eigen ? " – eigene" : " – Compliance"}`, ip));
  return { meta: dokumentMeta(d), daten };
}

export async function kycDokumentLoeschen(n, id) {
  angemeldet(n);
  let datei = null;
  const r = await aendernBereit((db) => {
    const d = (db.kyc.dokumente || []).find((x) => x.id === v.kennung(id) && !x.geloescht);
    if (!d || d.kontoId !== n.id) throw nichtGefunden("Unterlage nicht gefunden.");
    const f = fallById(db, d.fallId);
    if (!f || !KYC_BEARBEITBAR.includes(f.status) || d.status === "ok") throw konflikt("Geprüfte bzw. eingereichte Unterlagen können nicht gelöscht werden.");
    d.geloescht = true;
    d.geloeschtAm = jetzt();
    datei = d.datei;
    protokoll(db, n, "kyc_upload_geloescht", "kyc", f.id, `Unterlage ${d.id} gelöscht`);
    return { ok: true };
  });
  if (datei) await dateiLoeschen(datei);
  return r;
}

export async function kycEinreichen(n, { ip = "" } = {}) {
  angemeldet(n);
  return aendernBereit((db) => {
    const f = eigenerFall(db, n);
    if (!f) throw ungueltig("Bitte beginnen Sie zuerst mit der Verifizierung.");
    const anf = kycAnforderungen({ ...f, dokumente: dokumenteVon(db, f) }, { rollen: n.rollen || [], flaechen: flaechenVon(db, n.id), einstellungen: kycEinstellungenDb(db) });
    const fp = kycFortschritt(anf);
    if (fp.fehlend.length) throw ungueltig(`Es fehlen noch: ${fp.fehlend.map((x) => x.label).join(" · ")}`);
    statusSetzen(db, f, "eingereicht", n, "nutzer", "Zur Prüfung eingereicht.");
    f.eingereichtAm = jetzt();
    f.nachforderung = "";
    f.einreichungIp = ip || "";
    if (f.bank) f.bank.inhaberPasst = kontoinhaberPasst(f.bank.kontoinhaber, f.kontotyp === "unternehmen" ? { firma: f.firma?.name } : { vorname: f.person?.vorname, nachname: f.person?.nachname });
    abgleichAusfuehren(db, f, n, "Einreichung");
    f.risiko = { ...kycRisiko(f, kycEinstellungenDb(db)), manuell: false };
    complianceMelden(db, f, `KYC ${f.kontotyp === "unternehmen" ? "KYB" : "KYC"} zur Prüfung: ${f.id}`, `Neuer Vorgang in der Warteschlange (Risiko ${f.risiko.stufe}).`);
    nutzerMelden(db, f, "Verifizierung eingereicht", "Vielen Dank – wir prüfen Ihre Angaben und melden uns im Portal.");
    return kycFallSync(db, n, f);
  });
}

/** Erneute Prüfung starten (z. B. neue Angaben nach Verifizierung, Ausweis erneuert) */
export async function kycErneut(n) {
  angemeldet(n);
  return aendernBereit((db) => {
    const f = eigenerFall(db, n);
    if (!f) throw nichtGefunden("Keine Verifizierung vorhanden.");
    if (f.status === "abgelehnt") throw konflikt("Bitte wenden Sie sich über „Nachrichten“ an ÖkoInvest.");
    if (f.status !== "verifiziert") throw konflikt("Ihre Verifizierung kann derzeit bereits bearbeitet werden.");
    f.letzteVerifizierung = { am: f.verifiziertAm, risiko: f.risiko?.stufe || null };
    statusSetzen(db, f, "offen", n, "nutzer", "Erneute Prüfung gestartet.");
    return kycFallSync(db, n, f);
  });
}

/**
 * KYC-Status für andere Module/Teams. ziel: { kontoId } | { organisationId }.
 * Nutzer: nur eigenes Konto bzw. aktive Organisation; Backoffice: alle. Ohne Nutzer (n = null): Systemaufruf im Server.
 */
export async function kycStatus(n, { kontoId = null, organisationId = null } = {}) {
  const db = await lesenBereit();
  if (n && !istAdmin(n)) {
    if (kontoId && kontoId !== n.id) throw verboten();
    if (organisationId && n.organisation?.id !== organisationId) throw verboten();
  }
  const s = kycStatusDb(db, { kontoId: kontoId || (!organisationId ? n?.id : null), organisationId });
  return { ...s, statusLabel: kycStatusLabel(s.status === "zweitpruefung" ? "in_pruefung" : s.status), status: s.status === "zweitpruefung" ? "in_pruefung" : s.status, risiko: n && complianceLesen(n) ? s.risiko : undefined };
}

/** Freigabe eines Schritts prüfen (Gating) – eigenes Konto oder Backoffice für alle */
export async function kycFreigabePruefen(n, { schritt, kontoId = null, organisationId = null, flaecheId = null } = {}) {
  angemeldet(n);
  if (!KYC_SCHRITTE[schritt]) throw ungueltig("Unbekannter Schritt.");
  const ziel = kontoId || n.id;
  if (!istAdmin(n) && (ziel !== n.id || (organisationId && n.organisation?.id !== organisationId))) throw verboten();
  const db = await lesenBereit();
  const r = kycFreigabeDb(db, schritt, { kontoId: ziel, organisationId, flaecheId: flaecheId ? v.kennung(flaecheId) : null });
  return { ...r, schrittLabel: KYC_SCHRITTE[schritt].label };
}

/**
 * Systemaufruf für externe Dienste (Team „Dienste“: Identitätsanbieter, MRZ, Register, Bonität): Prüfergebnis anhängen.
 * Protokolliert (Hash-Kette) und meldet der Compliance auffällige Ergebnisse. Keine automatische Statusänderung.
 */
export async function kycErgebnisAnhaengen(fall, eintrag = {}) {
  return aendernBereit((db) => {
    const e = kycErgebnisAnhaengenDb(db, fall, eintrag);
    const f = fallById(db, e.fallId);
    protokoll(db, null, "kyc_ergebnis", "kyc", e.fallId, `Prüfergebnis ${e.quelle}/${e.art}: ${e.ergebnis}`);
    if (f && ["auffaellig", "fehler"].includes(e.ergebnis)) complianceMelden(db, f, `Externes Prüfergebnis auffällig: ${f.id}`, `${e.quelle}: ${e.zusammenfassung || e.ergebnis}`.slice(0, 280));
    return e;
  });
}

/** Systemaufruf (andere Module im Server, ohne Nutzerkontext): Freigabe eines Schritts */
export async function kycFreigabeSystem(schritt, { kontoId = null, organisationId = null, flaecheId = null } = {}) {
  if (!KYC_SCHRITTE[schritt]) throw ungueltig("Unbekannter Schritt.");
  const db = await lesenBereit();
  return kycFreigabeDb(db, schritt, { kontoId, organisationId, flaecheId });
}

// ================================================================ Compliance

function fallZeile(db, f) {
  const u = nutzerById(db, f.kontoId);
  const org = f.organisationId ? (db.organisationen || []).find((o) => o.id === f.organisationId) : null;
  const wartetSeit = f.eingereichtAm || f.erstelltAm;
  return {
    id: f.id, kontoId: f.kontoId, konto: u ? { name: nameVon(db, u.id), email: u.email, rollen: u.rollen } : null,
    organisation: org ? { id: org.id, name: org.name } : null, kontotyp: f.kontotyp, bezeichnung: f.kontotyp === "unternehmen" ? f.firma?.name || org?.name || "Unternehmen" : [f.person?.vorname, f.person?.nachname].filter(Boolean).join(" ") || nameVon(db, f.kontoId),
    status: f.status, statusLabel: kycStatusLabel(f.status, { intern: true }), risiko: f.risiko?.stufe || null, sanktionen: f.sanktionen?.status || null,
    pep: !!(f.pep?.istPep || f.pep?.naheStehend || (f.ubos || []).some((x) => x.pep)), eingereichtAm: f.eingereichtAm || null, wartetTage: wartetSeit ? Math.max(0, -tageBis(String(wartetSeit).slice(0, 10))) : null,
    bearbeiterId: f.bearbeiterId || null, bearbeiter: f.bearbeiterId ? nameVon(db, f.bearbeiterId) : "", erstPrueferId: f.pruefung?.erstPrueferId || null,
    naechstePruefung: f.naechstePruefung || null, ausweisGueltigBis: f.person?.ausweis?.gueltigBis || null, loeschenAb: f.loeschenAb || null,
  };
}

export async function kycWarteschlange(n, { status = "offen", q = "" } = {}) {
  angemeldet(n);
  if (!complianceLesen(n)) throw verboten("Nur für die Compliance.");
  const db = await lesenBereit();
  const alle = (db.kyc.faelle || []).filter((f) => f.status !== "geloescht");
  let liste = alle;
  if (status === "offen") liste = alle.filter((f) => KYC_WARTESCHLANGE.includes(f.status));
  else if (KYC_STATUS[status]) liste = alle.filter((f) => f.status === status);
  else if (status === "treffer") liste = alle.filter((f) => ["treffer_pruefen", "bestaetigt"].includes(f.sanktionen?.status));
  else if (status === "faellig") liste = alle.filter((f) => f.status === "verifiziert" && f.naechstePruefung && tageBis(f.naechstePruefung) <= 30);
  const suche = v.text(q, 80).toLowerCase();
  let zeilen = liste.map((f) => fallZeile(db, f));
  if (suche) zeilen = zeilen.filter((z) => `${z.id} ${z.bezeichnung} ${z.konto?.email || ""} ${z.organisation?.name || ""}`.toLowerCase().includes(suche));
  const rang = { zweitpruefung: 0, eingereicht: 1, in_pruefung: 2 };
  zeilen.sort((a, b) => (rang[a.status] ?? 5) - (rang[b.status] ?? 5) || (b.risiko === "hoch") - (a.risiko === "hoch") || String(a.eingereichtAm || "").localeCompare(String(b.eingereichtAm || "")));
  const liste2 = sanktionsliste();
  return {
    faelle: complianceLesen(n) && !istCompliance(n) ? zeilen.map((z) => ({ ...z, konto: z.konto ? { name: z.konto.name, rollen: z.konto.rollen } : null })) : zeilen,
    kennzahlen: {
      warteschlange: alle.filter((f) => KYC_WARTESCHLANGE.includes(f.status)).length,
      zweitpruefung: alle.filter((f) => f.status === "zweitpruefung").length,
      treffer: alle.filter((f) => f.sanktionen?.status === "treffer_pruefen").length,
      hoch: alle.filter((f) => f.risiko?.stufe === "hoch" && f.status !== "abgelehnt").length,
      verifiziert: alle.filter((f) => f.status === "verifiziert").length,
      faellig: alle.filter((f) => f.status === "verifiziert" && f.naechstePruefung && tageBis(f.naechstePruefung) <= 30).length,
      nachgefordert: alle.filter((f) => f.status === "nachgefordert").length,
    },
    liste: { quelle: liste2.quelle, stand: liste2.stand, anzahl: (liste2.eintraege || []).length, demo: !!liste2.demo },
    schreiben: istCompliance(n),
  };
}

export async function kycFallDetail(n, id, { ip = "" } = {}) {
  complianceNoetig(n);
  await lesenBereit();
  return aendern((db) => {
    const f = fallById(db, id);
    if (!f) throw nichtGefunden("KYC-Fall nicht gefunden.");
    protokoll(db, n, "kyc_einsicht", "kyc", f.id, "Fall eingesehen (Compliance)", ip);
    const u = nutzerById(db, f.kontoId);
    const e = kycEinstellungenDb(db);
    const anforderungen = anforderungenVon(db, f);
    const zugriffe = (db.aktivitaeten || []).filter((a) => a.objektArt === "kyc" && a.objektId === f.id).slice(-60).reverse()
      .map((a) => ({ id: a.id, am: a.am, aktion: a.aktion, text: a.text, nutzer: nameVon(db, a.nutzerId) || "System", hash: a.hash }));
    return {
      ...fallZeile(db, f),
      konto: u ? { id: u.id, name: nameVon(db, u.id), email: u.email, rollen: u.rollen, firma: u.firma || "" } : null,
      person: f.person || {}, firma: f.firma || {}, ubos: f.ubos || [], vertreter: f.vertreter || [], einreicherVertretungsberechtigt: f.einreicherVertretungsberechtigt ?? null,
      pep: f.pep || {}, mittelherkunft: f.mittelherkunft || {}, steuer: f.steuer || {},
      bank: f.bank ? { ...f.bank, ibanFormatiert: ibanFormatiert(f.bank.iban), ibanPruefung: ibanPruefen(f.bank.iban), inhaberPasst: kontoinhaberPasst(f.bank.kontoinhaber, f.kontotyp === "unternehmen" ? { firma: f.firma?.name } : { vorname: f.person?.vorname, nachname: f.person?.nachname }) } : null,
      risikoDetail: f.risiko || null, risikoRegel: kycRisiko(f, e), sanktionenDetail: f.sanktionen || null,
      abgleiche: (db.kyc.abgleiche || []).filter((a) => a.fallId === f.id).slice(0, 20),
      pruefung: f.pruefung || {}, nachforderung: f.nachforderung || "", entscheidung: f.entscheidung || null,
      verlauf: (f.verlauf || []).map((x) => ({ ...x, von: nameVon(db, x.vonId) || (x.rolle === "system" ? "System" : "") })),
      dokumente: dokumenteVon(db, f).map((d) => ({ ...dokumentMeta(d, { compliance: true }), pruefpunkte: KYC_DOKUMENTE[d.art]?.pruefpunkte || [], flaeche: d.flaecheId ? (db.flaechen || []).find((x) => x.id === d.flaecheId)?.bezeichnung || d.flaecheId : null })),
      anforderungen, fortschritt: kycFortschritt(anforderungen), fortschrittGeprueft: kycFortschritt(anforderungenVon(db, f, { nurGeprueft: true })),
      vierAugen: vierAugenNoetig(f, e),
      pruefergebnisse: [...(f.pruefergebnisse || [])].reverse(),
      zugriffe, beziehungEnde: f.beziehungEnde || null, loeschenAb: f.loeschenAb || null, ichBinErstpruefer: f.pruefung?.erstPrueferId === n.id,
    };
  });
}

const ERGEBNISSE = ["verifiziert", "nachgefordert", "abgelehnt"];

/** Vier-Augen: immer (Einstellung), bei Risiko hoch oder wenn ein Sanktionstreffer als Namensgleichheit ausgeschlossen wurde */
function vierAugenNoetig(f, e) {
  return !!(e.vierAugenImmer || (e.vierAugenBeiHoch && (f.risiko?.stufe === "hoch" || (f.sanktionen?.treffer || []).length > 0)));
}

export async function kycAktion(n, id, daten = {}) {
  complianceNoetig(n);
  const aktion = v.auswahl(daten.aktion, ["uebernehmen", "pruefliste", "risiko", "entscheiden", "zweitfreigabe", "treffer", "abgleich", "beziehungEnde", "notiz"], "");
  if (!aktion) throw ungueltig("Unbekannte Aktion.");
  return aendernBereit((db) => {
    const f = fallById(db, id);
    if (!f) throw nichtGefunden("KYC-Fall nicht gefunden.");
    const e = kycEinstellungenDb(db);
    f.pruefung = f.pruefung || {};
    let hinweis = "";
    if (aktion === "uebernehmen") {
      f.bearbeiterId = n.id;
      if (f.status === "eingereicht") statusSetzen(db, f, "in_pruefung", n, "compliance", "Prüfung begonnen.");
      else protokoll(db, n, "kyc_bearbeiter", "kyc", f.id, "Fall übernommen");
    } else if (aktion === "pruefliste") {
      if (!KYC_WARTESCHLANGE.includes(f.status)) throw konflikt("Die Prüfliste kann nur während der Prüfung bearbeitet werden.");
      const d = dokumenteVon(db, f).find((x) => x.id === v.kennung(daten.dokumentId));
      if (!d) throw nichtGefunden("Unterlage nicht gefunden.");
      const punkte = {};
      for (const p of KYC_DOKUMENTE[d.art]?.pruefpunkte || []) punkte[p] = v.wahr(daten.punkte?.[p]);
      const ergebnis = v.auswahl(daten.ergebnis, ["ok", "abgelehnt", "neu"], "neu");
      const notiz = v.mehrzeilig(daten.notiz, 600);
      if (ergebnis === "ok") v.pflicht(Object.values(punkte).every(Boolean), `Für „geprüft“ müssen alle Prüfpunkte bestätigt sein: ${(KYC_DOKUMENTE[d.art]?.pruefpunkte || []).map((p) => KYC_PRUEFPUNKTE[p]).join(" · ")}`);
      if (ergebnis === "abgelehnt") v.pflicht(notiz.length >= 5, "Bitte begründen Sie die Ablehnung der Unterlage (wird dem Nutzer angezeigt).");
      d.pruefung = { punkte, notiz, vonId: n.id, am: jetzt() };
      d.status = ergebnis;
      if (f.status === "eingereicht") statusSetzen(db, f, "in_pruefung", n, "compliance", "Prüfung begonnen.");
      protokoll(db, n, "kyc_pruefliste", "kyc", f.id, `Unterlage ${d.id}: ${ergebnis}`);
    } else if (aktion === "risiko") {
      const st = v.auswahl(daten.stufe, ["niedrig", "mittel", "hoch"], "");
      const begr = v.mehrzeilig(daten.begruendung, 600);
      v.pflicht(st, "Bitte Risikostufe wählen.");
      v.pflicht(begr.length >= 5, "Bitte begründen Sie die manuelle Einstufung.");
      const regel = kycRisiko(f, e);
      f.risiko = { ...regel, stufe: st, manuell: true, begruendung: begr, regelStufe: regel.stufe, vonId: n.id, am: jetzt() };
      protokoll(db, n, "kyc_risiko", "kyc", f.id, `Risiko manuell: ${st} (Regel: ${regel.stufe})`);
    } else if (aktion === "abgleich") {
      const s = abgleichAusfuehren(db, f, n, "manuell");
      if (!f.risiko?.manuell) f.risiko = { ...kycRisiko(f, e), manuell: false };
      if (f.status === "verifiziert" && s.status === "treffer_pruefen") {
        f.status = "in_pruefung";
        verlauf(f, "in_pruefung", n, "compliance", "Erneute Prüfung nach Sanktionsabgleich.", { oeffentlich: false });
      }
      hinweis = s.treffer.length ? `${s.treffer.length} möglicher Treffer – manuelle Prüfung erforderlich.` : "Kein Treffer.";
    } else if (aktion === "treffer") {
      const t = (f.sanktionen?.treffer || []).find((x) => x.eintragId === String(daten.eintragId || "") && (!daten.prueflingName || x.prueflingName === daten.prueflingName));
      if (!t) throw nichtGefunden("Treffer nicht gefunden.");
      const bew = v.auswahl(daten.bewertung, ["ausgeschlossen", "bestaetigt"], "");
      const begr = v.mehrzeilig(daten.begruendung, 1000);
      v.pflicht(bew, "Bitte bewerten Sie den Treffer.");
      v.pflicht(begr.length >= 10, "Bitte dokumentieren Sie die Begründung (mind. 10 Zeichen).");
      Object.assign(t, { bewertung: bew, begruendung: begr, bewertetVon: n.id, bewertetAm: jetzt() });
      const liste = f.sanktionen.treffer;
      f.sanktionen.status = liste.some((x) => x.bewertung === "bestaetigt") ? "bestaetigt" : liste.some((x) => !x.bewertung) ? "treffer_pruefen" : "ausgeschlossen";
      if (!f.risiko?.manuell) f.risiko = { ...kycRisiko(f, e), manuell: false };
      protokoll(db, n, "kyc_treffer", "kyc", f.id, `Sanktionstreffer ${t.eintragId} (${t.prueflingName}): ${bew}`);
      if (bew === "bestaetigt") hinweis = "Treffer bestätigt: Geldwäschebeauftragten informieren, keine Mittel bereitstellen, Meldepflicht prüfen (§ 43 GwG). Den Kunden nicht informieren (§ 47 GwG).";
    } else if (aktion === "entscheiden" || aktion === "zweitfreigabe") {
      const ergebnis = v.auswahl(daten.ergebnis, ERGEBNISSE, "");
      const grund = v.mehrzeilig(daten.grund, 1500);
      v.pflicht(ergebnis, "Bitte wählen Sie ein Ergebnis.");
      if (aktion === "zweitfreigabe") {
        if (f.status !== "zweitpruefung") throw konflikt("Der Fall wartet nicht auf eine Zweitfreigabe.");
        if (f.pruefung.erstPrueferId === n.id) throw konflikt("Vier-Augen-Prinzip: Die Zweitfreigabe muss eine andere Person erteilen.");
      } else if (!["eingereicht", "in_pruefung"].includes(f.status)) throw konflikt("Der Fall ist nicht in Prüfung.");
      if (ergebnis === "nachgefordert") v.pflicht(grund.length >= 5, "Bitte nennen Sie, was nachzureichen ist (wird dem Nutzer angezeigt).");
      if (ergebnis === "abgelehnt") v.pflicht(grund.length >= 5, "Bitte begründen Sie die Ablehnung (intern).");
      if (ergebnis === "verifiziert") {
        if (["treffer_pruefen", "bestaetigt"].includes(f.sanktionen?.status)) throw konflikt("Offener oder bestätigter Sanktionstreffer – eine Verifizierung ist nicht möglich.");
        const ungeprueft = dokumenteVon(db, f).filter((d) => d.status === "neu");
        if (ungeprueft.length) throw konflikt(`Bitte zuerst alle Unterlagen prüfen (Prüfliste): ${ungeprueft.map((d) => KYC_DOKUMENTE[d.art]?.label || d.art).join(", ")}`);
        const fp = kycFortschritt(anforderungenVon(db, f, { nurGeprueft: true }));
        if (fp.fehlend.length) throw konflikt(`Pflichtangaben/-unterlagen fehlen oder sind nicht geprüft: ${fp.fehlend.map((x) => x.label).join(" · ")}`);
      }
      const vierAugen = vierAugenNoetig(f, e);
      if (ergebnis === "verifiziert" && aktion === "entscheiden" && vierAugen) {
        f.pruefung.erstPrueferId = n.id;
        f.pruefung.erstAm = jetzt();
        f.pruefung.erstGrund = grund;
        statusSetzen(db, f, "zweitpruefung", n, "compliance", "Erstprüfung positiv – Zweitfreigabe (Vier-Augen) erforderlich.", { oeffentlich: false });
        complianceMelden(db, f, `Zweitfreigabe nötig: ${f.id}`, "Hohes Risiko – bitte als zweite Person prüfen.", { ohneId: n.id });
        hinweis = "Zweitfreigabe angefordert (Vier-Augen-Prinzip).";
      } else {
        if (aktion === "zweitfreigabe") {
          f.pruefung.zweitPrueferId = n.id;
          f.pruefung.zweitAm = jetzt();
        } else {
          f.pruefung.erstPrueferId = n.id;
          f.pruefung.erstAm = jetzt();
        }
        f.entscheidung = { ergebnis, grund, vonId: n.id, am: jetzt() };
        if (ergebnis === "verifiziert") {
          statusSetzen(db, f, "verifiziert", n, "compliance", "Verifizierung abgeschlossen.");
          f.verifiziertAm = jetzt();
          f.naechstePruefung = monateSpaeter(heuteIso(), e.wiederholungMonate?.[f.risiko?.stufe || "mittel"] || 24);
          if (f.bank?.iban) {
            f.bank.ibanOk = ibanPruefen(f.bank.iban).ok;
            f.bank.inhaberPasst = kontoinhaberPasst(f.bank.kontoinhaber, f.kontotyp === "unternehmen" ? { firma: f.firma?.name } : { vorname: f.person?.vorname, nachname: f.person?.nachname });
            f.bank.geprueft = f.bank.ibanOk && f.bank.inhaberPasst;
          }
          f.erinnerungen = {};
          nutzerMelden(db, f, "Verifizierung abgeschlossen", "Ihre Identität ist bestätigt. Alle Funktionen stehen Ihnen offen.");
        } else if (ergebnis === "nachgefordert") {
          f.nachforderung = grund;
          statusSetzen(db, f, "nachgefordert", n, "compliance", grund);
          nutzerMelden(db, f, "Bitte Unterlagen ergänzen", "Für Ihre Verifizierung benötigen wir noch Angaben oder Unterlagen.");
        } else {
          statusSetzen(db, f, "abgelehnt", n, "compliance", "Die Verifizierung konnte nicht abgeschlossen werden.");
          f.pruefung.ablehnGrund = grund;
          f.loeschenAb = loeschenAb(heuteIso(), e.aufbewahrungJahre || 5);
          nutzerMelden(db, f, "Verifizierung nicht abgeschlossen", "Ihre Verifizierung konnte nicht abgeschlossen werden. Bei Fragen schreiben Sie uns über „Nachrichten“.");
        }
      }
    } else if (aktion === "beziehungEnde") {
      const d = datum(daten.datum);
      v.pflicht(d, "Bitte geben Sie das Ende der Geschäftsbeziehung an (JJJJ-MM-TT).");
      f.beziehungEnde = d;
      f.loeschenAb = loeschenAb(d, e.aufbewahrungJahre || 5);
      protokoll(db, n, "kyc_frist", "kyc", f.id, `Geschäftsbeziehung beendet am ${d}, Löschung ab ${f.loeschenAb}`);
    } else if (aktion === "notiz") {
      const t = v.mehrzeilig(daten.text, 1000);
      v.pflicht(t.length >= 2, "Bitte Notiz eingeben.");
      verlauf(f, f.status, n, "compliance", t, { oeffentlich: false });
      protokoll(db, n, "kyc_notiz", "kyc", f.id, "Interne Notiz");
    }
    f.geaendertAm = jetzt();
    return { ok: true, status: f.status, hinweis };
  });
}

export async function kycEinstellungen(n) {
  angemeldet(n);
  if (!complianceLesen(n)) throw verboten("Nur für die Compliance.");
  const db = await lesenBereit();
  const e = kycEinstellungenDb(db);
  return { ...e, geltungWirksam: kycGeltung(e, process.env), geltungUmgebung: process.env.PLATTFORM_KYC_GATING || null, schritte: KYC_SCHRITTE, pilotKonten: (e.pilotKonten || []).map((id) => ({ id, name: nameVon(db, id), email: nutzerById(db, id)?.email || "" })) };
}

export async function kycEinstellungenSpeichern(n, daten = {}) {
  complianceNoetig(n);
  return aendernBereit((db) => {
    const e = kycEinstellungenDb(db);
    if (daten.gating && typeof daten.gating === "object") for (const s of KYC_SCHRITT_IDS) if (s in daten.gating) e.gating[s] = v.wahr(daten.gating[s]);
    if ("geltung" in daten) e.geltung = ["alle", "pilot", "aus"].includes(daten.geltung) ? daten.geltung : null;
    if ("vierAugenBeiHoch" in daten) e.vierAugenBeiHoch = v.wahr(daten.vierAugenBeiHoch);
    if ("vierAugenImmer" in daten) e.vierAugenImmer = v.wahr(daten.vierAugenImmer);
    if ("trefferSchwelle" in daten) e.trefferSchwelle = v.zahl(daten.trefferSchwelle, { min: 0.7, max: 0.99, stellen: 2 }) ?? e.trefferSchwelle;
    if (Array.isArray(daten.hochrisikoLaender)) e.hochrisikoLaender = [...new Set(daten.hochrisikoLaender.map(land).filter(Boolean))].slice(0, 80);
    if (daten.pilotKonto) {
      const u = nutzerById(db, v.kennung(daten.pilotKonto.id));
      if (!u) throw nichtGefunden("Konto nicht gefunden.");
      const set = new Set(e.pilotKonten || []);
      if (v.wahr(daten.pilotKonto.an)) set.add(u.id);
      else set.delete(u.id);
      e.pilotKonten = [...set].slice(-500);
    }
    db.kyc.einstellungen = e;
    protokoll(db, n, "kyc_einstellungen", "kyc", "einstellungen", "KYC-Einstellungen geändert");
    return { ok: true, einstellungen: e };
  });
}

export async function kycSanktionsliste(n) {
  angemeldet(n);
  if (!complianceLesen(n)) throw verboten("Nur für die Compliance.");
  const l = sanktionsliste();
  return { quelle: l.quelle, stand: l.stand, importiertAm: l.importiertAm || null, anzahl: (l.eintraege || []).length, demo: !!l.demo, format: l.format || null };
}

/** Einzelprüfung eines Namens (z. B. vor Aufnahme einer Geschäftsbeziehung) */
export async function kycSanktionPruefen(n, { name, geburtsdatum = "", art = "person" } = {}) {
  complianceNoetig(n);
  const nm = v.text(name, 160);
  v.pflicht(nm.length >= 3, "Bitte Namen angeben.");
  const db = await lesenBereit();
  const treffer = sanktionsAbgleich({ name: nm, geburtsdatum: datum(geburtsdatum), art: art === "organisation" ? "organisation" : "person" }, sanktionsliste().eintraege || [], { schwelle: kycEinstellungenDb(db).trefferSchwelle });
  await aendern((w) => protokoll(w, n, "kyc_abgleich", "kyc", "einzel", `Einzelabgleich: ${treffer.length} Treffer`));
  return { treffer };
}

/**
 * Fristen-Lauf (täglich; Demo: manuell im Backoffice bzw. Test): Ausweis-Ablauf erinnern, Wiederholungsprüfung,
 * Sanktions-Neuabgleich bei neuem Listenstand, Löschung nach Aufbewahrungsfrist. `stichtag` nur für Tests/Vorschau.
 */
export async function kycFristen(n, { stichtag = null, fallId = null } = {}) {
  complianceNoetig(n);
  const zuLoeschen = [];
  const r = await aendernBereit((db) => {
    const e = kycEinstellungenDb(db);
    const heute = datum(stichtag) || heuteIso();
    const tage = (d) => (d ? Math.floor((new Date(`${d}T00:00:00Z`) - new Date(`${heute}T00:00:00Z`)) / 86400000) : null);
    const liste = sanktionsliste();
    const erg = { ausweisErinnert: 0, wiederholungErinnert: 0, abgelaufen: 0, neuAbgeglichen: 0, neueTreffer: 0, geloescht: 0 };
    for (const f of db.kyc.faelle) {
      if (f.status === "geloescht" || (fallId && f.id !== fallId)) continue;
      f.erinnerungen = f.erinnerungen || {};
      const gb = f.person?.ausweis?.gueltigBis;
      const t = tage(gb);
      if (f.status === "verifiziert" && t !== null && t <= (e.erinnerungAusweisTage || 30) && f.erinnerungen.ausweis !== gb) {
        f.erinnerungen.ausweis = gb;
        erg.ausweisErinnert++;
        nutzerMelden(db, f, t < 0 ? "Ausweis abgelaufen" : "Ausweis läuft bald ab", "Bitte aktualisieren Sie Ihre Ausweisdaten unter „Verifizierung“ (erneute Prüfung).");
        protokoll(db, n, "kyc_frist", "kyc", f.id, `Erinnerung Ausweis-Ablauf (${gb})`);
      }
      const w = tage(f.naechstePruefung);
      if (f.status === "verifiziert" && w !== null) {
        if (w <= 0) {
          f.status = "abgelaufen";
          verlauf(f, "abgelaufen", null, "system", "Wiederkehrende Überprüfung fällig.");
          erg.abgelaufen++;
          nutzerMelden(db, f, "Verifizierung erneuern", "Ihre regelmäßige Überprüfung ist fällig. Bitte bestätigen bzw. aktualisieren Sie Ihre Angaben.");
          protokoll(db, n, "kyc_frist", "kyc", f.id, "Wiederholungsprüfung fällig → abgelaufen");
        } else if (w <= 30 && f.erinnerungen.wiederholung !== f.naechstePruefung) {
          f.erinnerungen.wiederholung = f.naechstePruefung;
          erg.wiederholungErinnert++;
          nutzerMelden(db, f, "Überprüfung Ihrer Angaben steht an", "In den nächsten Wochen ist die regelmäßige Überprüfung fällig.");
        }
      }
      if (["verifiziert", "in_pruefung", "eingereicht", "zweitpruefung"].includes(f.status) && liste.stand && f.sanktionen?.listeStand !== liste.stand) {
        const vorher = (f.sanktionen?.treffer || []).length;
        const s = abgleichAusfuehren(db, f, null, "Neuer Listenstand");
        erg.neuAbgeglichen++;
        if (s.status === "treffer_pruefen" && s.treffer.length > vorher) {
          erg.neueTreffer++;
          if (f.status === "verifiziert") {
            f.status = "in_pruefung";
            verlauf(f, "in_pruefung", null, "system", "Möglicher Treffer bei Neuabgleich.", { oeffentlich: false });
          }
          complianceMelden(db, f, `Sanktionsabgleich: möglicher Treffer ${f.id}`, "Manuelle Prüfung erforderlich.");
        }
      }
      if (f.loeschenAb && f.loeschenAb <= heute) {
        for (const d of db.kyc.dokumente.filter((x) => x.fallId === f.id && !x.geloescht)) {
          d.geloescht = true;
          d.geloeschtAm = jetzt();
          d.name = "(gelöscht)";
          zuLoeschen.push(d.datei);
        }
        const rest = { id: f.id, kontoId: null, organisationId: null, kontotyp: f.kontotyp, status: "geloescht", verlauf: [], geloeschtAm: jetzt(), loeschenAb: f.loeschenAb, erstelltAm: f.erstelltAm };
        for (const k of Object.keys(f)) delete f[k];
        Object.assign(f, rest);
        erg.geloescht++;
        protokoll(db, n, "kyc_loeschung", "kyc", f.id, "Aufbewahrungsfrist abgelaufen – Unterlagen und personenbezogene Angaben gelöscht");
      }
    }
    return { ok: true, stichtag: heute, ...erg };
  });
  for (const d of zuLoeschen) await dateiLoeschen(d);
  return r;
}

/** Nur Demo/Test: KYC-Bereich eines Kontos für Compliance-Übersicht in Nutzerlisten */
export async function kycKurz(n, kontoIds = []) {
  angemeldet(n);
  if (!complianceLesen(n)) return {};
  const db = await lesenBereit();
  return Object.fromEntries(kontoIds.map((id) => [id, kycStatusDb(db, { kontoId: id }).status]));
}

export { ibanMaskiert };
