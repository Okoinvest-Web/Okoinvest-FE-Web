// src/lib/plattform/backend/demo/buchhaltung.js
//
// Buchhaltung im Demo-Backend (Referenz für Frappe plattform/api/buchhaltung.py): Mahnwesen mit konfigurierbaren
// Stufen/Gebühren und Mahnbeleg, Storno-/Korrekturbelege mit eigenem Nummernkreis, Zahlungseingang (CAMT/CSV) mit
// Zuordnung, OP-Liste, Nummernkreise, DATEV-/BMD-Export und Monatsabschluss. Belege liegen in db.finanzen.belege
// (Team Finanzen), eigene Daten unter db.buchhaltung.
//
// Rechte (jede Operation prüft selbst): Bereich „finanzen“ – lesen ≥ 1 (Leitung, Buchhaltung, Transaktion, Nur lesen,
// Projektleitung), schreiben = 2 (Leitung, Buchhaltung); Exporte zusätzlich Bereich „export“ lesen.
// Empfänger sehen ihre Mahnungen/Stornobelege über bhBelegDokument (Rechte wie die Abrechnung selbst).

import { PlattformFehler, konflikt, nichtGefunden, ungueltig, verboten } from "../../fehler";
import * as v from "../../validierung";
import * as F from "../../finanzen/index.js";
import * as B from "../../buchhaltung/index.js";
import { darfLesen, darfSchreiben } from "../../rechte";
import { intern } from "../demo";
import { aendern, lesen } from "./speicher";
import { jetzt, neueId, sha256 } from "./hilfen";
import { vertragFuerFaelligkeit } from "./finanzen-kern";
import * as fin from "./finanzen";

const { benachrichtigen, protokoll, nutzerById, nameVon } = intern;

const istAdmin = (n) => !!n?.rollen?.includes("admin");
function leseNoetig(n) {
  if (!n) throw new PlattformFehler(401, "Bitte melden Sie sich an.");
  if (!istAdmin(n) || !darfLesen(n, "finanzen")) throw verboten(istAdmin(n) ? "Ihre Backoffice-Rolle erlaubt im Bereich „Finanzen & Abrechnung“ kein Lesen." : "Nur für das Backoffice (Buchhaltung).");
}
function schreibNoetig(n) {
  leseNoetig(n);
  if (!darfSchreiben(n, "finanzen")) throw verboten("Ihre Backoffice-Rolle erlaubt im Bereich „Finanzen & Abrechnung“ kein Schreiben.");
}

const HEUTE = () => F.heute();
const KREIS_LABEL = { PG: "Pacht-Gutschriften", CR: "Contracting-Rechnungen", PR: "Provisionsrechnungen", ST: "Storno-/Korrekturbelege", MA: "Mahnungen" };

function leer() {
  return { v: 1, einstellungen: { mahnwesen: null, konten: null }, nummernkreise: {}, stornos: [], importe: [], eingaenge: [], exporte: [], abschluesse: [] };
}

/** Finanzdaten sicher geladen (Seed der Finanzen) + eigene Sammlung */
async function bereit(n) {
  await fin.finanzAbrechnungen(n, { limit: 1 }); // stellt db.finanzen bereit (Seed, Schema) und prüft Leserecht
  let db = await lesen();
  if (!db.buchhaltung) {
    await aendern((d) => {
      d.buchhaltung ||= leer();
    });
    db = await lesen();
  }
  return db;
}
async function aendernBereit(n, fn) {
  await bereit(n);
  return aendern((db) => {
    db.buchhaltung ||= leer();
    return fn(db);
  });
}

function naechsteNummer(db, kreis, jahr) {
  const k = (db.buchhaltung.nummernkreise[kreis] ||= {});
  k[jahr] = (k[jahr] || 0) + 1;
  return `${kreis}-${jahr}-${String(k[jahr]).padStart(5, "0")}`;
}

const konfigMahn = (db) => B.mahnKonfigPruefen(db.buchhaltung?.einstellungen?.mahnwesen || B.MAHN_STANDARD);
const konfigKonten = (db) => B.kontenPruefen(db.buchhaltung?.einstellungen?.konten || {});
const land = (b) => (["AT", "DE", "CH"].includes(b.aussteller?.land) ? b.aussteller.land : "AT");

/** Empfänger eines Belegs (Konto bzw. Inhaber/Admins der Organisation) */
function empfaengerVon(db, b) {
  const ids = new Set();
  if (b.empfaengerId) ids.add(b.empfaengerId);
  if (!b.empfaengerId && b.organisationId) for (const m of (db.mitgliedschaften || []).filter((x) => x.organisationId === b.organisationId && ["inhaber", "admin"].includes(x.rolle))) ids.add(m.nutzerId);
  return [...ids].map((id) => nutzerById(db, id)).filter(Boolean);
}

function kompakt(b) {
  return { id: b.id, nummer: b.nummer, beleg: b.beleg, art: b.art, status: b.status, brutto: b.brutto, offen: b.beleg === "rechnung" ? B.offenerBetrag(b) : b.brutto, partei: { name: b.partei?.name || "" } };
}

function mahnAusgabe(b, m) {
  return { belegId: b.id, nummer: b.nummer, empfaenger: b.partei?.name || "", faelligAm: b.faelligAm, brutto: b.brutto, ...m };
}

// ================================================================ Übersicht

export async function bhUebersicht(n) {
  leseNoetig(n);
  const db = await bereit(n);
  const heute = HEUTE();
  const belege = db.finanzen.belege;
  const k = konfigMahn(db);
  const op = B.opListe(belege, heute);
  const vorschlaege = belege
    .filter((b) => b.beleg === "rechnung" && b.status === "offen")
    .map((b) => ({ b, m: B.mahnVorschlag(b, heute, k, { land: land(b) }) }))
    .filter((x) => x.m)
    .map(({ b, m }) => mahnAusgabe(b, m))
    .sort((a, b) => Number(b.faellig) - Number(a.faellig) || b.tage - a.tage);
  const jahr = Number(heute.slice(0, 4));
  const kreise = { ...(db.finanzen.nummernkreise || {}), ...(db.buchhaltung.nummernkreise || {}) };
  const mahnungen = [];
  for (const b of belege) for (const m of b.mahnungen || []) if (m.nr) mahnungen.push({ ...m, belegId: b.id, nummer: b.nummer, empfaenger: b.partei?.name || "" });
  mahnungen.sort((a, b) => String(b.am).localeCompare(String(a.am)));
  const steuerCheck = belege
    .filter((b) => b.status !== "storniert" && ((b.pflichtFehlt || []).length || (b.steuer?.art === "reverse_charge" && !b.partei?.uid)))
    .slice(0, 50)
    .map((b) => ({ id: b.id, nummer: b.nummer, empfaenger: b.partei?.name || "", status: b.status, steuer: b.steuer?.label || "", fehlt: [...new Set([...(b.pflichtFehlt || []), ...(b.steuer?.art === "reverse_charge" && !b.partei?.uid ? ["UID des Leistungsempfängers (Reverse Charge)"] : [])])] }));
  return {
    heute,
    darfSchreiben: darfSchreiben(n, "finanzen"),
    darfExport: darfLesen(n, "export"),
    mahnwesen: k,
    konten: konfigKonten(db),
    op: { summen: op.summen, posten: op.posten.slice(0, 300), anzahl: op.posten.length },
    mahnvorschlaege: vorschlaege.slice(0, 100),
    mahnungen: mahnungen.slice(0, 50),
    stornos: db.buchhaltung.stornos.slice(0, 50).map((s) => ({ id: s.id, nummer: s.nummer, ursprungId: s.ursprungId, ursprungNummer: s.ursprungNummer, art: s.art, datum: s.datum, brutto: s.brutto, grund: s.grund, empfaenger: s.partei?.name || "", erstattung: s.erstattung || null, vonName: s.vonName })),
    eingaenge: {
      offen: db.buchhaltung.eingaenge.filter((e) => e.status === "offen").length,
      liste: db.buchhaltung.eingaenge.slice(0, 200),
    },
    importe: db.buchhaltung.importe.slice(0, 10),
    exporte: db.buchhaltung.exporte.slice(0, 10),
    nummernkreise: B.nummernkreise(kreise, KREIS_LABEL, jahr),
    luecken: B.nummernLuecken([...belege.map((b) => b.nummer), ...db.buchhaltung.stornos.map((s) => s.nummer), ...mahnungen.map((m) => m.nr)]),
    steuerCheck,
    abschluesse: db.buchhaltung.abschluesse.slice(0, 12).map((a) => ({ monat: a.monat, status: a.status, am: a.am, vonName: a.vonName })),
  };
}

// ================================================================ Einstellungen

export async function bhEinstellungenSpeichern(n, { mahnwesen, konten } = {}) {
  schreibNoetig(n);
  let km;
  let kk;
  try {
    km = mahnwesen ? B.mahnKonfigPruefen(mahnwesen) : null;
    kk = konten ? B.kontenPruefen(konten) : null;
  } catch (e) {
    throw ungueltig(e.message);
  }
  return aendernBereit(n, (db) => {
    if (km) db.buchhaltung.einstellungen.mahnwesen = km;
    if (kk) db.buchhaltung.einstellungen.konten = kk;
    protokoll(db, n, "buchhaltung_einstellungen", "finanzen", "BUCHHALTUNG", `Einstellungen gespeichert: ${[km && "Mahnwesen", kk && "Kontenzuordnung"].filter(Boolean).join(", ")}`);
    return { ok: true, mahnwesen: konfigMahn(db), konten: konfigKonten(db) };
  });
}

// ================================================================ Mahnwesen

/** Mahnlauf: { ids?: [belegId], trockenlauf? } – erzeugt Mahnbelege (MA-Nummer) für fällige Vorschläge */
export async function bhMahnlauf(n, { ids = [], trockenlauf = false } = {}) {
  schreibNoetig(n);
  const auswahl = new Set((Array.isArray(ids) ? ids : []).map((x) => v.kennung(x)).filter(Boolean).slice(0, 200));
  return aendernBereit(n, (db) => {
    const heute = HEUTE();
    const k = konfigMahn(db);
    const erzeugt = [];
    const uebersprungen = [];
    for (const b of db.finanzen.belege.filter((x) => x.beleg === "rechnung" && x.status === "offen")) {
      if (auswahl.size && !auswahl.has(b.id)) continue;
      const m = B.mahnVorschlag(b, heute, k, { land: land(b) });
      if (!m) {
        if (auswahl.size) uebersprungen.push({ nummer: b.nummer, grund: "Nicht überfällig bzw. kein offener Betrag." });
        continue;
      }
      if (!m.faellig) {
        if (auswahl.size) uebersprungen.push({ nummer: b.nummer, grund: m.grund });
        continue;
      }
      const eintrag = { nr: trockenlauf ? "(Vorschau)" : naechsteNummer(db, B.MAHN_KREIS, heute.slice(0, 4)), am: jetzt(), datum: heute, stufe: m.stufe, label: m.label, offen: m.offen, gebuehr: m.gebuehr, zinsen: m.zinsen, zinssatz: m.zinssatz, zinsNorm: m.zinsNorm, pauschale: m.pauschale, pauschaleNorm: m.pauschaleNorm, kostenGesamt: m.kostenGesamt, gesamt: m.gesamt, frist: m.frist, eskalation: m.eskalation, vonId: n.id, vonName: nameVon(db, n.id) };
      erzeugt.push(mahnAusgabe(b, eintrag));
      if (trockenlauf) continue;
      b.mahnungen = [...(b.mahnungen || []), eintrag];
      for (const u of empfaengerVon(db, b)) {
        benachrichtigen(db, u, { art: "abrechnung", titel: `${m.label} zu ${b.nummer}`, text: `Zur Rechnung ${b.nummer} ist noch keine Zahlung eingegangen. Neue Zahlungsfrist: ${F.datumDe(m.frist)}.`, link: "/portal/abrechnungen", objektArt: "abrechnung", objektId: b.id }, { mailBetreff: `${m.label} – ÖkoInvest`, mailText: `Zu einer Rechnung im Portal von ÖkoInvest ist noch keine Zahlung eingegangen. Das Schreiben (PDF) und die neue Zahlungsfrist finden Sie im Portal unter „Abrechnungen“.` });
      }
      protokoll(db, n, "mahnung", "abrechnung", b.id, `${eintrag.nr} ${m.label} zu ${b.nummer}: offen ${F.euro(m.offen)}, Kosten ${F.euro(m.kostenGesamt)}, Frist ${F.datumDe(m.frist)}`);
    }
    return { trockenlauf: !!trockenlauf, anzahl: erzeugt.length, erzeugt, uebersprungen };
  });
}

/** Mahnsperre setzen/aufheben: { bis?: JJJJ-MM-TT, grund } – z. B. bei Einwand gegen die Rechnung */
export async function bhMahnsperre(n, belegId, { bis = "", grund = "" } = {}) {
  schreibNoetig(n);
  return aendernBereit(n, (db) => {
    const b = db.finanzen.belege.find((x) => x.id === v.kennung(belegId));
    if (!b || b.beleg !== "rechnung") throw nichtGefunden("Rechnung nicht gefunden.");
    if (b.mahnsperre?.anliegenId) throw konflikt("Mahnsperre aus einem Einspruch des Kunden – sie endet mit der Entscheidung über den Einspruch (Anliegen).");
    if (!bis) {
      b.mahnsperre = null;
      protokoll(db, n, "mahnsperre", "abrechnung", b.id, `Mahnsperre ${b.nummer} aufgehoben`);
      return { ok: true, mahnsperre: null };
    }
    const heute = HEUTE();
    if (!F.istDatum(bis) || bis < heute || bis > F.plusTage(heute, 180)) throw ungueltig("Mahnsperre höchstens 180 Tage in die Zukunft.");
    const g = v.text(grund, 200);
    if (g.length < 10) throw ungueltig("Bitte den Grund der Mahnsperre angeben (mind. 10 Zeichen).");
    b.mahnsperre = { bis, grund: g, am: jetzt(), vonId: n.id };
    protokoll(db, n, "mahnsperre", "abrechnung", b.id, `Mahnsperre ${b.nummer} bis ${F.datumDe(bis)}: ${g}`);
    return { ok: true, mahnsperre: b.mahnsperre };
  });
}

// ================================================================ Storno / Korrektur

/** Stornobeleg: { grund, provisionStornieren? } – Ursprung → storniert, Stornobeleg ST-… mit Verweis */
export async function bhStorno(n, belegId, { grund = "", provisionStornieren = false } = {}) {
  schreibNoetig(n);
  const g = v.mehrzeilig(grund, 500).trim();
  if (g.length < 10) throw ungueltig("Bitte den Grund des Stornos angeben (mind. 10 Zeichen) – er steht auf dem Stornobeleg.");
  return aendernBereit(n, (db) => {
    const b = db.finanzen.belege.find((x) => x.id === v.kennung(belegId));
    const ok = B.stornoErlaubt(b);
    if (!b) throw nichtGefunden("Beleg nicht gefunden.");
    if (!ok.ok) throw konflikt(ok.grund);
    const heute = HEUTE();
    const s = { id: neueId("SB"), ...B.stornoBeleg(b, { nummer: naechsteNummer(db, B.STORNO_KREIS, heute.slice(0, 4)), datum: heute, grund: g }), am: jetzt(), vonId: n.id, vonName: nameVon(db, n.id), empfaengerId: b.empfaengerId || null, organisationId: b.organisationId || null };
    if (s.bereitsGezahlt > 0) s.erstattung = { betrag: s.bereitsGezahlt, richtung: b.beleg === "rechnung" ? "an_empfaenger" : "rueckforderung", status: "offen" };
    db.buchhaltung.stornos.unshift(s);
    const alterStatus = b.status;
    Object.assign(b, { status: "storniert", stornoGrund: g, storniertAm: jetzt(), stornoBelegId: s.id, stornoNummer: s.nummer });
    for (const m of b.mahnungen || []) m.storniert = true;
    let provision = null;
    if (b.art === "provision" && b.bezug?.provisionId) {
      const pv = db.provisionen.find((p) => p.id === b.bezug.provisionId);
      if (pv && v.wahr(provisionStornieren) && ["offen", "in_rechnung"].includes(pv.status)) {
        const von = pv.status;
        pv.status = "storniert";
        pv.statusVerlauf = [...(pv.statusVerlauf || []), { status: "storniert", am: jetzt(), vonId: n.id, vonRolle: "admin", kommentar: `Storno ${s.nummer}: ${g}` }];
        protokoll(db, n, "status", "provision", pv.id, `${von} → storniert (Storno ${s.nummer})`);
        provision = "storniert";
      } else if (pv) provision = ["offen", "in_rechnung"].includes(pv.status) ? "neu_abrechnen" : pv.status;
    }
    if (s.erstattung) {
      db.aufgaben.push({ id: neueId("AF"), titel: `${s.erstattung.richtung === "an_empfaenger" ? "Erstattung" : "Rückforderung"} ${F.euro(s.erstattung.betrag)} zu ${s.nummer}`, beschreibung: `Storno von ${b.nummer} (${b.partei?.name || ""}) – bereits ${alterStatus === "bezahlt" ? "bezahlt" : "teilweise gezahlt"}. ${s.erstattung.richtung === "an_empfaenger" ? "Betrag erstatten oder mit einer neuen Rechnung verrechnen." : "Überzahlte Gutschrift zurückfordern oder mit der nächsten Gutschrift verrechnen."}`, faelligAm: F.plusTage(heute, 14), zustaendigId: n.id, bezugArt: null, bezugId: null, status: "offen", erstelltVon: n.id, erstelltAm: jetzt(), erledigtAm: null, erledigtVon: null, erinnertAm: null });
    }
    for (const u of empfaengerVon(db, b)) {
      benachrichtigen(db, u, { art: "abrechnung", titel: `${s.titel} ${s.nummer}`, text: `Der Beleg ${b.nummer} wurde storniert. Der Stornobeleg liegt im Portal bereit.`, link: "/portal/abrechnungen", objektArt: "abrechnung", objektId: b.id }, { mailBetreff: "Stornobeleg im Portal – ÖkoInvest", mailText: "Zu einem Ihrer Belege im Portal von ÖkoInvest wurde ein Stornobeleg erstellt. Details finden Sie unter „Abrechnungen“." });
    }
    protokoll(db, n, "abrechnung_storno", "abrechnung", b.id, `${s.nummer} storniert ${b.nummer} (${F.euro(b.brutto)}): ${v.text(g, 120)}`);
    return { ok: true, storno: { id: s.id, nummer: s.nummer, brutto: s.brutto, erstattung: s.erstattung || null }, provision, hinweis: provision === "neu_abrechnen" ? "Die Provision bleibt bestehen – der nächste Abrechnungslauf erstellt eine neue (korrigierte) Provisionsrechnung." : b.art === "pacht" || b.art === "contracting" ? "Der nächste Abrechnungslauf erzeugt für diese Periode einen neuen Beleg (Korrektur)." : "" };
  });
}

/** Mahn- oder Stornodokument (PDF-Daten) – Empfänger und Backoffice; Rechte wie die Abrechnung */
export async function bhBelegDokument(n, belegId, { art, nr = "", ip = "" } = {}) {
  if (!n) throw new PlattformFehler(401, "Bitte melden Sie sich an.");
  const beleg = await fin.abrechnung(n, belegId); // prüft Empfänger/Team/Backoffice
  const db = await lesen();
  const b = db.finanzen.belege.find((x) => x.id === beleg.id);
  let dokument;
  if (art === "mahnung") {
    const m = (b.mahnungen || []).find((x) => x.nr && x.nr === String(nr));
    if (!m) throw nichtGefunden("Mahnung nicht gefunden.");
    dokument = { art: "mahnung", mahnung: m, text: B.mahnText(b, m) };
  } else if (art === "storno") {
    const s = (db.buchhaltung?.stornos || []).find((x) => x.id === b.stornoBelegId);
    if (!s) throw nichtGefunden("Stornobeleg nicht gefunden.");
    dokument = { art: "storno", storno: s };
  } else throw ungueltig("Unbekanntes Dokument.");
  await aendern((d) => protokoll(d, n, "buchhaltung_pdf", "abrechnung", b.id, `${art === "mahnung" ? `Mahnung ${nr}` : "Stornobeleg"} zu ${b.nummer} abgerufen`, ip)).catch(() => {});
  return { beleg, ...dokument };
}

/** Mahnungen und Stornobelege eines Empfängers (Portal „Abrechnungen“) */
export async function bhMeineDokumente(n) {
  if (!n) throw new PlattformFehler(401, "Bitte melden Sie sich an.");
  const db = await lesen();
  const aus = [];
  for (const b of db.finanzen?.belege || []) {
    // wie zugriff() im Finanzmodul: eigenes Konto oder Mitglied der Organisation
    const eigen = b.empfaengerId === n.id || (b.organisationId && (db.mitgliedschaften || []).some((m) => m.organisationId === b.organisationId && m.nutzerId === n.id));
    if (!eigen) continue;
    for (const m of b.mahnungen || []) if (m.nr && !m.storniert) aus.push({ art: "mahnung", belegId: b.id, nummer: b.nummer, nr: m.nr, titel: m.label, datum: m.datum || String(m.am).slice(0, 10), betrag: m.gesamt, frist: m.frist });
    if (b.stornoBelegId) {
      const s = (db.buchhaltung?.stornos || []).find((x) => x.id === b.stornoBelegId);
      if (s) aus.push({ art: "storno", belegId: b.id, nummer: b.nummer, nr: s.nummer, titel: s.titel, datum: s.datum, betrag: s.brutto });
    }
  }
  return aus.sort((a, b) => String(b.datum).localeCompare(String(a.datum)));
}

// ================================================================ Zahlungseingang

/** Kontoauszug einlesen: { inhalt, dateiname, format? } → { import, buchungen } (Dubletten werden übersprungen) */
export async function bhZahlungImport(n, { inhalt = "", dateiname = "", format = "" } = {}) {
  schreibNoetig(n);
  const text = String(inhalt || "");
  if (text.length > 3_000_000) throw ungueltig("Die Datei ist zu groß (max. ca. 3 MB).");
  let gelesen;
  try {
    gelesen = B.auszugLesen(text, { format: ["camt", "csv"].includes(format) ? format : "" });
  } catch (e) {
    throw ungueltig(e.message);
  }
  const hash = sha256(text);
  return aendernBereit(n, (db) => {
    if (db.buchhaltung.importe.some((i) => i.sha256 === hash)) throw konflikt("Diese Datei wurde bereits importiert.");
    const vorhanden = new Set(db.buchhaltung.eingaenge.map((e) => e.schluessel));
    const belege = db.finanzen.belege.map(kompakt);
    const imp = { id: neueId("ZI"), am: jetzt(), dateiname: v.text(dateiname, 120) || "Kontoauszug", format: gelesen.format, anzahl: gelesen.buchungen.length, neu: 0, doppelt: 0, sicher: 0, sha256: hash, vonName: nameVon(db, n.id) };
    const neu = [];
    for (const bu of gelesen.buchungen) {
      const schluessel = B.buchungSchluessel(bu);
      if (vorhanden.has(schluessel)) {
        imp.doppelt++;
        continue;
      }
      vorhanden.add(schluessel);
      const vorschlag = B.zuordnen(bu, belege);
      if (vorschlag.art === "sicher") imp.sicher++;
      const e = { id: neueId("ZE"), importId: imp.id, ...bu, iban: bu.iban ? F.ibanMaskieren(bu.iban) : "", schluessel, vorschlag, status: "offen", belegId: null, nummer: null, am: jetzt() };
      neu.push(e);
    }
    imp.neu = neu.length;
    db.buchhaltung.eingaenge.unshift(...neu);
    db.buchhaltung.eingaenge = db.buchhaltung.eingaenge.slice(0, 5000);
    db.buchhaltung.importe.unshift(imp);
    protokoll(db, n, "zahlungsimport", "finanzen", imp.id, `Kontoauszug ${imp.dateiname} (${imp.format.toUpperCase()}): ${imp.neu} neue Buchungen, ${imp.doppelt} Dubletten, ${imp.sicher} sichere Treffer (SHA-256 ${hash.slice(0, 16)}…)`);
    return { import: imp, buchungen: neu };
  });
}

/**
 * Buchung verarbeiten: { aktion: zuordnen|ignorieren|zuruecksetzen|sichere_uebernehmen, belegId?, grund? }.
 * zuordnen: Rechnung (Eingang) bzw. Gutschrift (Ausgang); voller Betrag → „bezahlt“ (Provision/Benachrichtigung wie
 * im Finanzmodul), sonst Teilzahlung am Beleg.
 */
export async function bhZahlungAktion(n, id, { aktion, belegId, grund = "" } = {}) {
  schreibNoetig(n);
  if (aktion === "sichere_uebernehmen") {
    const db = await bereit(n);
    const liste = db.buchhaltung.eingaenge.filter((e) => e.status === "offen" && e.vorschlag?.art === "sicher").slice(0, 200);
    const ergebnis = { uebernommen: 0, fehler: [] };
    for (const e of liste) {
      try {
        await zuordnenEinzeln(n, e.id, e.vorschlag.belegId);
        ergebnis.uebernommen++;
      } catch (x) {
        ergebnis.fehler.push(`${e.vorschlag.nummer}: ${x.message}`);
      }
    }
    return ergebnis;
  }
  const eid = v.kennung(id);
  if (aktion === "zuordnen") return zuordnenEinzeln(n, eid, v.kennung(belegId));
  return aendernBereit(n, (db) => {
    const e = db.buchhaltung.eingaenge.find((x) => x.id === eid);
    if (!e) throw nichtGefunden("Buchung nicht gefunden.");
    if (aktion === "ignorieren") {
      if (e.status !== "offen") throw konflikt("Nur offene Buchungen können ignoriert werden.");
      const g = v.text(grund, 200);
      if (g.length < 5) throw ungueltig("Bitte kurz begründen (z. B. „Privatentnahme“, „Bankgebühr“).");
      Object.assign(e, { status: "ignoriert", grund: g, erledigtAm: jetzt(), vonId: n.id });
    } else if (aktion === "zuruecksetzen") {
      if (e.status !== "ignoriert") throw konflikt("Nur ignorierte Buchungen können zurückgesetzt werden – Zuordnungen per Storno/Zahlungsstatus korrigieren.");
      Object.assign(e, { status: "offen", grund: "", erledigtAm: null });
    } else throw ungueltig("Unbekannte Aktion.");
    protokoll(db, n, `zahlung_${aktion}`, "finanzen", e.id, `Buchung ${F.datumDe(e.datum)} ${F.euro(e.betrag)}: ${aktion}`);
    return { ok: true, eingang: e };
  });
}

async function zuordnenEinzeln(n, eid, belegId) {
  const db0 = await bereit(n);
  const e0 = db0.buchhaltung.eingaenge.find((x) => x.id === eid);
  if (!e0) throw nichtGefunden("Buchung nicht gefunden.");
  if (e0.status !== "offen") throw konflikt("Die Buchung ist bereits verarbeitet.");
  const b0 = db0.finanzen.belege.find((x) => x.id === belegId);
  if (!b0) throw nichtGefunden("Beleg nicht gefunden.");
  const eingang = e0.richtung !== "ausgang";
  if (eingang && b0.beleg !== "rechnung") throw konflikt("Zahlungseingänge können nur Rechnungen zugeordnet werden.");
  if (!eingang && b0.beleg !== "gutschrift") throw konflikt("Ausgänge können nur Gutschriften (Auszahlungen) zugeordnet werden.");
  if (eingang ? b0.status !== "offen" : !["offen", "angewiesen"].includes(b0.status)) throw konflikt(`${b0.nummer} ist nicht offen.`);
  if (e0.datum > HEUTE()) throw ungueltig("Das Buchungsdatum liegt in der Zukunft.");
  const offen = eingang ? B.offenerBetrag(b0) : b0.brutto;
  const voll = e0.betrag >= offen - 0.005;
  if (!eingang && !voll) throw konflikt("Auszahlungen werden nur in voller Höhe zugeordnet – Differenz bitte klären.");
  // Voller Betrag: Zahlungsstatus über das Finanzmodul (Provision nachziehen, KYC-Sperre bei Pacht, Benachrichtigung)
  if (voll) await fin.abrechnungAktion(n, b0.id, { aktion: "bezahlt", datum: e0.datum });
  return aendern((db) => {
    const e = db.buchhaltung.eingaenge.find((x) => x.id === eid);
    const b = db.finanzen.belege.find((x) => x.id === belegId);
    const betrag = voll ? Math.min(e.betrag, offen) : e.betrag;
    b.zahlungen = [...(b.zahlungen || []), { am: e.datum, betrag: F.rund2(betrag), eingangId: e.id, vonId: n.id, teil: !voll }];
    const differenz = F.rund2(e.betrag - offen);
    Object.assign(e, { status: "zugeordnet", belegId: b.id, nummer: b.nummer, teilzahlung: !voll, differenz: differenz > 0.005 ? differenz : 0, erledigtAm: jetzt(), vonId: n.id });
    if (!voll) for (const u of empfaengerVon(db, b)) benachrichtigen(db, u, { art: "abrechnung", titel: `Teilzahlung zu ${b.nummer} verbucht`, text: `Es ist eine Teilzahlung eingegangen; offen bleiben ${F.euro(B.offenerBetrag(b))}.`, link: "/portal/abrechnungen", objektArt: "abrechnung", objektId: b.id }, { mailBetreff: "Teilzahlung verbucht – ÖkoInvest", mailText: "Zu einer Rechnung im Portal von ÖkoInvest wurde eine Teilzahlung verbucht. Details finden Sie unter „Abrechnungen“." });
    if (e.differenz) {
      db.aufgaben.push({ id: neueId("AF"), titel: `Überzahlung ${F.euro(e.differenz)} zu ${b.nummer}`, beschreibung: `Zahlungseingang vom ${F.datumDe(e.datum)} (${e.name || "ohne Namen"}) übersteigt den offenen Betrag. Erstattung oder Verrechnung klären.`, faelligAm: F.plusTage(HEUTE(), 7), zustaendigId: n.id, bezugArt: null, bezugId: null, status: "offen", erstelltVon: n.id, erstelltAm: jetzt(), erledigtAm: null, erledigtVon: null, erinnertAm: null });
    }
    protokoll(db, n, "zahlung_zuordnen", "abrechnung", b.id, `Buchung ${F.datumDe(e.datum)} ${F.euro(e.betrag)} → ${b.nummer}${voll ? " (bezahlt)" : " (Teilzahlung)"}${e.differenz ? `, Überzahlung ${F.euro(e.differenz)}` : ""}`);
    return { ok: true, eingang: e, beleg: { id: b.id, nummer: b.nummer, status: b.status, offen: B.offenerBetrag(b) } };
  });
}

// ================================================================ Export (DATEV/BMD/OP)

export async function bhExport(n, { format = "datev", von = "", bis = "" } = {}) {
  leseNoetig(n);
  if (!darfLesen(n, "export")) throw verboten("Ihre Backoffice-Rolle erlaubt keine Exporte.");
  if (!B.EXPORT_FORMATE[format]) throw ungueltig("Unbekanntes Exportformat.");
  const db = await bereit(n);
  const heute = HEUTE();
  if (format === "op") {
    const op = B.opListe(db.finanzen.belege, heute);
    const text = B.opCsv(op.posten.map((p) => ({ ...p, artLabel: F.ABRECHNUNG_ARTEN[p.art]?.label || p.art, statusLabel: p.tageUeberfaellig > 0 ? "überfällig" : p.status })));
    await aendern((d) => protokoll(d, n, "export", "finanzen", "OP", `OP-Liste exportiert (${op.posten.length} Posten)`));
    return { text, dateiname: `OP-Liste-${heute}.csv`, anzahl: op.posten.length, zeichensatz: "utf-8" };
  }
  if (!F.istDatum(von) || !F.istDatum(bis) || von > bis) throw ungueltig("Bitte einen gültigen Zeitraum wählen (von ≤ bis).");
  if (F.tageZwischen(von, bis) > 366) throw ungueltig("Höchstens ein Jahr je Export.");
  const imZeitraum = (d) => d && String(d).slice(0, 10) >= von && String(d).slice(0, 10) <= bis;
  const posten = [];
  for (const b of db.finanzen.belege) {
    const basis = { nummer: b.nummer, art: b.art, steuerArt: b.steuer?.art, steuerVorlage: b.steuer?.vorlage, steuerSatz: b.steuer?.satz, steuerBetrag: b.steuer?.betrag, netto: b.netto };
    if (imZeitraum(b.rechnungsdatum)) posten.push({ ...basis, typ: b.beleg, datum: b.rechnungsdatum, brutto: b.brutto, text: `${b.beleg === "gutschrift" ? "Gutschrift" : "Rechnung"} ${b.partei?.name || ""}` });
    const zahlungen = b.zahlungen || [];
    for (const z of zahlungen) if (imZeitraum(z.am)) posten.push({ ...basis, typ: "zahlung", richtung: b.beleg === "gutschrift" ? "ausgang" : "eingang", datum: z.am, brutto: z.betrag, text: `Zahlung ${b.nummer}` });
    const rest = F.rund2(b.brutto - zahlungen.reduce((s, z) => s + Number(z.betrag || 0), 0));
    if (b.status === "bezahlt" && rest > 0.005 && imZeitraum(b.bezahltAm)) posten.push({ ...basis, typ: "zahlung", richtung: b.beleg === "gutschrift" ? "ausgang" : "eingang", datum: b.bezahltAm, brutto: rest, text: `Zahlung ${b.nummer}` });
  }
  for (const s of db.buchhaltung.stornos) if (imZeitraum(s.datum)) posten.push({ typ: "storno", ursprung: s.ursprung, nummer: s.nummer, art: s.art, datum: s.datum, brutto: s.brutto, steuerArt: s.steuer?.art, steuerVorlage: s.steuer?.vorlage, steuerSatz: s.steuer?.satz, steuerBetrag: Math.abs(s.steuer?.betrag || 0), text: `Storno ${s.ursprungNummer}` });
  const konten = konfigKonten(db);
  const zeilen = B.buchungen(posten, konten, format);
  const text = format === "datev" ? B.datevCsv(zeilen, konten, { von, bis, erzeugtAm: jetzt() }) : B.bmdCsv(zeilen, konten);
  const eintrag = { id: neueId("EX"), format, von, bis, anzahl: zeilen.length, am: jetzt(), vonName: nameVon(db, n.id), sha256: sha256(text) };
  await aendern((d) => {
    d.buchhaltung ||= leer();
    d.buchhaltung.exporte.unshift(eintrag);
    d.buchhaltung.exporte = d.buchhaltung.exporte.slice(0, 200);
    protokoll(d, n, "export", "finanzen", eintrag.id, `${B.EXPORT_FORMATE[format]} ${F.datumDe(von)}–${F.datumDe(bis)}: ${zeilen.length} Buchungen (SHA-256 ${eintrag.sha256.slice(0, 16)}…)`);
  });
  return { text, dateiname: `${format === "datev" ? "EXTF_Buchungsstapel" : "BMD_Buchungen"}_${von}_${bis}.csv`, anzahl: zeilen.length, zeichensatz: format === "datev" ? "latin1" : "utf-8", hinweis: "Kontenzuordnung als Beispiel vorbelegt – vor dem ersten Echtimport mit der Steuerberatung abstimmen." };
}

// ================================================================ Monatsabschluss

function monatPruefen(monat, heute) {
  if (!/^20\d\d-(0[1-9]|1[0-2])$/.test(String(monat || ""))) throw ungueltig("Monat im Format JJJJ-MM.");
  if (monat > heute.slice(0, 7)) throw ungueltig("Künftige Monate können nicht bearbeitet werden.");
  return monat;
}

function fakten(db, monat, heute) {
  const { von, bis } = F.monatsZeitraum(monat);
  const fin_ = db.finanzen;
  const laufOk = (arten) => fin_.laeufe.some((l) => !l.trockenlauf && arten.includes(l.art) && String(l.monat || "") >= monat);
  const aktiv = fin_.pachtvertraege.filter((p) => ["aktiv", "gekuendigt"].includes(p.status));
  let pachtFehlend = 0;
  for (const pt of aktiv) for (const f of F.abzurechnen(vertragFuerFaelligkeit(db, pt), bis)) if (!fin_.belege.some((b) => b.schluessel === f.schluessel && b.status !== "storniert")) pachtFehlend++;
  const eingaenge = db.buchhaltung.eingaenge.filter((e) => e.datum >= von && e.datum <= bis);
  const contractingAnlagen = (db.anlagen?.vertraege || []).filter((x) => x.status === "aktiv").length;
  const k = konfigMahn(db);
  const export_ = db.buchhaltung.exporte.find((x) => ["datev", "bmd"].includes(x.format) && x.von <= von && x.bis >= bis);
  return {
    contractingLauf: laufOk(["contracting", "alle"]) || !contractingAnlagen,
    contractingAnlagen,
    pachtFehlend,
    klaerfaelleOffen: fin_.klaerfaelle.filter((x) => x.status === "offen").length,
    importVorhanden: eingaenge.length > 0,
    eingaengeOffen: eingaenge.filter((e) => e.status === "offen").length,
    zahlungslaeufeOffen: fin_.zahlungslaeufe.filter((z) => z.status === "erstellt" && String(z.am).slice(0, 10) <= bis).length,
    mahnungenFaellig: fin_.belege.filter((b) => B.mahnVorschlag(b, heute, k, { land: land(b) })?.faellig).length,
    pflichtFehlt: fin_.belege.filter((b) => b.status !== "storniert" && b.rechnungsdatum >= von && b.rechnungsdatum <= bis && (b.pflichtFehlt || []).length).length,
    exportErstellt: export_ ? `${export_.format.toUpperCase()} ${F.datumDe(String(export_.am).slice(0, 10))}` : "",
  };
}

function abschlussAusgabe(db, monat, heute) {
  const a = db.buchhaltung.abschluesse.find((x) => x.monat === monat) || { monat, status: "offen", manuell: {}, verlauf: [] };
  const bewertung = a.status === "abgeschlossen" && a.snapshot ? a.snapshot : B.abschlussBewerten(monat, fakten(db, monat, heute), a.manuell || {});
  return { ...bewertung, status: a.status, statusLabel: B.ABSCHLUSS_STATUS[a.status] || a.status, am: a.am || null, vonName: a.vonName || "", verlauf: a.verlauf || [] };
}

export async function bhAbschluss(n, monat) {
  leseNoetig(n);
  const db = await bereit(n);
  const heute = HEUTE();
  return abschlussAusgabe(db, monatPruefen(monat, heute), heute);
}

/** { aktion: punkt|abschliessen|wiedereroeffnen, punkt?, erledigt?, notiz?, grund? } */
export async function bhAbschlussAktion(n, monat, { aktion, punkt, erledigt, notiz = "", grund = "" } = {}) {
  schreibNoetig(n);
  return aendernBereit(n, (db) => {
    const heute = HEUTE();
    const m = monatPruefen(monat, heute);
    let a = db.buchhaltung.abschluesse.find((x) => x.monat === m);
    if (!a) {
      a = { monat: m, status: "offen", manuell: {}, verlauf: [] };
      db.buchhaltung.abschluesse.unshift(a);
      db.buchhaltung.abschluesse.sort((x, y) => y.monat.localeCompare(x.monat));
    }
    const name = nameVon(db, n.id);
    if (aktion === "punkt") {
      if (a.status === "abgeschlossen") throw konflikt("Der Monat ist abgeschlossen – bitte zuerst wiedereröffnen.");
      const def = B.ABSCHLUSS_PUNKTE.find((p) => p.id === punkt);
      if (!def) throw ungueltig("Unbekannter Punkt.");
      const text = v.text(notiz, 300);
      if (def.auto && v.wahr(erledigt) && text.length < 10) throw ungueltig("Automatische Punkte nur mit Begründung manuell bestätigen (mind. 10 Zeichen).");
      a.manuell[punkt] = { erledigt: v.wahr(erledigt), notiz: text, vonId: n.id, vonName: name, am: jetzt() };
      a.verlauf.push({ am: jetzt(), vonName: name, text: `${def.titel}: ${v.wahr(erledigt) ? "erledigt" : "offen"}${text ? ` – ${text}` : ""}` });
    } else if (aktion === "abschliessen") {
      if (a.status === "abgeschlossen") throw konflikt("Der Monat ist bereits abgeschlossen.");
      if (m >= heute.slice(0, 7)) throw konflikt("Der laufende Monat kann erst nach Monatsende abgeschlossen werden.");
      const bew = B.abschlussBewerten(m, fakten(db, m, heute), a.manuell);
      if (!bew.bereit) throw new PlattformFehler(409, `Noch offen: ${bew.offen.join(" · ")}`, "abschluss");
      Object.assign(a, { status: "abgeschlossen", am: jetzt(), vonId: n.id, vonName: name, snapshot: bew });
      a.verlauf.push({ am: jetzt(), vonName: name, text: "Monat abgeschlossen" });
    } else if (aktion === "wiedereroeffnen") {
      if (a.status !== "abgeschlossen") throw konflikt("Nur abgeschlossene Monate können wiedereröffnet werden.");
      const g = v.text(grund, 300);
      if (g.length < 10) throw ungueltig("Bitte den Grund der Wiedereröffnung angeben (mind. 10 Zeichen).");
      Object.assign(a, { status: "wiedereroeffnet", snapshot: null });
      a.verlauf.push({ am: jetzt(), vonName: name, text: `Wiedereröffnet: ${g}` });
    } else throw ungueltig("Unbekannte Aktion.");
    protokoll(db, n, `monatsabschluss_${aktion}`, "finanzen", `MA-${m}`, `Monatsabschluss ${m}: ${aktion}${punkt ? ` (${punkt})` : ""}`);
    return abschlussAusgabe(db, m, heute);
  });
}
