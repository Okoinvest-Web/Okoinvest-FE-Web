// src/lib/plattform/backend/demo/datenschutz.js
//
// Compliance – Datenschutz & Geldwäsche im Demo-Backend (Referenz für Frappe plattform/api/datenschutz.py):
//   Betroffenenanfragen Art. 15–21 DSGVO (Frist 1 Monat, Verlängerung, Export, Anonymisierung bei Löschersuchen),
//   interne Verdachtsfälle (ohne Versand an die Meldestelle), VVT-Export, Löschkonzept, SLA der KYC-Warteschlange.
// Daten unter db.dsgvo = { v, anfragen[], verdacht[] }.
//
// Rechte (jede Operation prüft selbst):
//   Anfragen     lesen: Bereich „compliance“ ≥ 1 (Leitung, Compliance); schreiben = 2 (Compliance)
//   Verdacht     NUR Unterrolle mit „compliance“ = 2 (auch Leitung sieht keine Verdachtsakten – Need-to-know);
//                intern melden (verdachtMelden) darf jedes Backoffice-Konto, sieht die Akte danach aber nicht
//   VVT          lesen: „compliance“ ≥ 1

import { PlattformFehler, konflikt, nichtGefunden, ungueltig, verboten } from "../../fehler";
import * as v from "../../validierung";
import * as C from "../../compliance/index.js";
import { darfLesen, darfSchreiben } from "../../rechte";
import { intern } from "../demo";
import { aendern, lesen } from "./speicher";
import { jetzt, neueId, sha256 } from "./hilfen";
import { datenExport } from "./sicherheit";

const { benachrichtigen, protokoll, nutzerById, nameVon } = intern;

const istAdmin = (n) => !!n?.rollen?.includes("admin");
const angemeldet = (n) => {
  if (!n) throw new PlattformFehler(401, "Bitte melden Sie sich an.");
};
function leseNoetig(n) {
  angemeldet(n);
  if (!istAdmin(n) || !darfLesen(n, "compliance")) throw verboten("Nur für Compliance und Leitung.");
}
function schreibNoetig(n) {
  angemeldet(n);
  if (!istAdmin(n) || !darfSchreiben(n, "compliance")) throw verboten("Nur für die Backoffice-Rolle „Compliance“.");
}
const verdachtNoetig = schreibNoetig; // Verdachtsakten: nur Compliance (Geldwäschebeauftragte/r und Vertretung)

const heute = () => new Intl.DateTimeFormat("sv-SE", { timeZone: "Europe/Vienna" }).format(new Date());

async function bereit() {
  let db = await lesen();
  if (!db.dsgvo) {
    await aendern((d) => {
      d.dsgvo ||= { v: 1, anfragen: [], verdacht: [] };
    });
    db = await lesen();
  }
  return db;
}
const aendernBereit = async (fn) => {
  await bereit();
  return aendern((db) => {
    db.dsgvo ||= { v: 1, anfragen: [], verdacht: [] };
    return fn(db);
  });
};

const compliancePersonen = (db) => db.nutzer.filter((u) => u.aktiv && u.rollen?.includes("admin") && String(u.backofficeRollen || "").split(",").map((x) => x.trim()).includes("compliance"));

function aufgabe(db, { titel, beschreibung, faelligAm, zustaendigId, vonId }) {
  db.aufgaben.push({ id: neueId("AF"), titel: v.text(titel, 160), beschreibung: v.text(beschreibung, 500), faelligAm, zustaendigId, bezugArt: null, bezugId: null, status: "offen", erstelltVon: vonId, erstelltAm: jetzt(), erledigtAm: null, erledigtVon: null, erinnertAm: null });
}

// ================================================================ Betroffenenanfragen (DSGVO)

function anfrageAusgabe(db, a, h = heute()) {
  const f = C.dsFristStatus(a, h);
  return {
    ...a,
    artLabel: C.DS_ARTEN[a.art]?.label, norm: C.DS_ARTEN[a.art]?.norm, statusLabel: C.DS_STATUS[a.status]?.label, statusTon: C.DS_STATUS[a.status]?.ton,
    frist: f.frist, restTage: f.restTage, ampel: f.ampel, ueberfaellig: !!f.ueberfaellig,
    konto: a.kontoId ? (() => { const u = nutzerById(db, a.kontoId); return u ? { id: u.id, email: u.email, name: nameVon(db, u.id), geloescht: !!u.geloeschtAm } : null; })() : null,
    zustaendig: a.zustaendigId ? nameVon(db, a.zustaendigId) : "",
    antwortEntwurf: C.dsAntwortEntwurf(a, { frist: f.frist }),
    exportVerfuegbar: !!C.DS_ARTEN[a.art]?.export && !!a.kontoId,
  };
}

export async function dsUebersicht(n, { status = "offen" } = {}) {
  leseNoetig(n);
  const db = await bereit();
  const h = heute();
  const alle = db.dsgvo.anfragen.map((a) => anfrageAusgabe(db, a, h));
  const liste = alle.filter((a) => (status === "alle" ? true : status === "offen" ? C.DS_OFFEN.includes(a.status) : a.status === status)).sort((a, b) => String(a.frist).localeCompare(String(b.frist)));
  return {
    heute: h,
    darfSchreiben: darfSchreiben(n, "compliance"),
    kennzahlen: {
      offen: alle.filter((a) => C.DS_OFFEN.includes(a.status)).length,
      faellig7: alle.filter((a) => a.ampel === "gelb").length,
      ueberfaellig: alle.filter((a) => a.ueberfaellig).length,
      erledigt12m: alle.filter((a) => a.status === "erledigt" && String(a.erledigtAm || "") >= new Date(Date.now() - 365 * 86400e3).toISOString()).length,
    },
    anfragen: liste,
    arten: C.DS_ARTEN,
    loeschkonzept: C.LOESCHKLASSEN,
  };
}

/** Neue Anfrage erfassen: { art, eingangAm, land, name, email, kontoId?, kanal, beschreibung, vorgangId? } */
export async function dsAnlegen(n, d = {}) {
  schreibNoetig(n);
  const art = v.auswahl(d.art, C.DS_ARTEN, "");
  if (!art) throw ungueltig("Bitte die Art der Anfrage wählen.");
  const h = heute();
  const eingang = /^\d{4}-\d{2}-\d{2}$/.test(String(d.eingangAm || "")) ? d.eingangAm : h;
  if (eingang > h) throw ungueltig("Das Eingangsdatum darf nicht in der Zukunft liegen.");
  if (eingang < C.plusMonate(h, -12)) throw ungueltig("Eingang älter als 12 Monate – bitte prüfen.");
  const name = v.text(d.name, 120);
  const email = d.email ? v.email(d.email) : "";
  if (name.length < 2) throw ungueltig("Bitte den Namen der betroffenen Person angeben.");
  return aendernBereit((db) => {
    let konto = d.kontoId ? nutzerById(db, v.kennung(d.kontoId)) : null;
    if (d.kontoId && !konto) throw nichtGefunden("Konto nicht gefunden.");
    if (!konto && email) konto = db.nutzer.find((u) => u.email === email) || null;
    const a = {
      id: neueId("DS"), art, land: v.auswahl(d.land, { AT: 1, DE: 1, CH: 1 }, "AT"), eingangAm: eingang, kanal: v.auswahl(d.kanal, { portal: 1, email: 1, brief: 1, telefon: 1, sonstiges: 1 }, "email"),
      name, email, kontoId: konto?.id || null, beschreibung: v.mehrzeilig(d.beschreibung, 2000), vorgangId: v.kennung(d.vorgangId) || null,
      status: "eingegangen", zustaendigId: n.id, identitaet: null, verlaengertAm: null, verlaengerungsgrund: "", begruendung: "", ergebnis: "", loeschErgebnis: "", exportAm: null, exportSha: "",
      erfasstAm: jetzt(), erfasstVon: n.id, erledigtAm: null, verlauf: [{ am: jetzt(), vonId: n.id, text: `Anfrage erfasst (${C.DS_ARTEN[art].label}, Eingang ${eingang.split("-").reverse().join(".")}, Kanal ${d.kanal || "email"})` }],
    };
    db.dsgvo.anfragen.unshift(a);
    const frist = C.dsFrist(eingang, { land: a.land });
    aufgabe(db, { titel: `DSGVO ${C.DS_ARTEN[art].label}: ${name} (${a.id})`, beschreibung: `Frist bis ${frist.split("-").reverse().join(".")} (${C.DS_ARTEN[art].norm}, Art. 12 Abs. 3 DSGVO). Identität plausibilisieren, bearbeiten, Antwort dokumentieren.`, faelligAm: [h, new Date(new Date(`${frist}T00:00:00Z`).getTime() - 7 * 86400e3).toISOString().slice(0, 10)].sort().pop(), zustaendigId: n.id, vonId: n.id });
    if (konto) benachrichtigen(db, konto, { art: "nachricht", titel: "Ihre Datenschutzanfrage ist eingegangen", text: `Wir bearbeiten Ihre Anfrage (${C.DS_ARTEN[art].label}) und antworten bis spätestens ${frist.split("-").reverse().join(".")}.`, link: "/portal/profil", objektArt: "nutzer", objektId: konto.id }, { mailBetreff: "Eingang Ihrer Datenschutzanfrage – ÖkoInvest", mailText: `Ihre Datenschutzanfrage ist bei uns eingegangen. Wir beantworten sie bis spätestens ${frist.split("-").reverse().join(".")}.` });
    protokoll(db, n, "dsgvo_anfrage", "dsgvo", a.id, `${C.DS_ARTEN[art].label} erfasst (Frist ${frist})${konto ? ` für Konto ${konto.id}` : ""}`);
    return anfrageAusgabe(db, a);
  });
}

/** Aktion: Übergang (identitaet_anfordern|identitaet_bestaetigen|verlaengern|erledigen|ablehnen) oder konto_verknuepfen|anonymisieren */
export async function dsAktion(n, id, d = {}) {
  schreibNoetig(n);
  return aendernBereit((db) => {
    const a = db.dsgvo.anfragen.find((x) => x.id === v.kennung(id));
    if (!a) throw nichtGefunden("Anfrage nicht gefunden.");
    const h = heute();
    const log = (text) => a.verlauf.push({ am: jetzt(), vonId: n.id, text: v.text(text, 300) });
    if (d.aktion === "konto_verknuepfen") {
      if (!C.DS_OFFEN.includes(a.status)) throw konflikt("Die Anfrage ist abgeschlossen.");
      const u = db.nutzer.find((x) => x.id === v.kennung(d.kontoId) || (d.email && x.email === String(d.email).trim().toLowerCase()));
      if (!u) throw nichtGefunden("Kein Konto mit dieser Kennung/E-Mail.");
      a.kontoId = u.id;
      log(`Konto ${u.id} verknüpft`);
    } else if (d.aktion === "anonymisieren") {
      if (a.art !== "loeschung") throw konflikt("Anonymisierung nur bei Löschersuchen.");
      if (!["in_bearbeitung", "verlaengert"].includes(a.status)) throw konflikt("Erst nach bestätigter Identität.");
      if (!["LÖSCHEN", "LOESCHEN"].includes(String(d.bestaetigung || "").trim().toUpperCase())) throw ungueltig("Bitte mit dem Wort LÖSCHEN bestätigen.");
      if (!v.wahr(d.aufbewahrungGeprueft)) throw ungueltig("Bitte bestätigen, dass Aufbewahrungspflichten (Belege, GwG, Verträge) geprüft sind – betroffene Unterlagen bleiben gesperrt erhalten.");
      const u = nutzerById(db, a.kontoId);
      if (!u) throw konflikt("Kein Konto verknüpft.");
      if (u.geloeschtAm) throw konflikt("Das Konto ist bereits anonymisiert.");
      anonymisieren(db, n, u, a);
      a.loeschErgebnis = "geloescht";
      log(`Konto ${u.id} anonymisiert und gesperrt; Unterlagen mit Aufbewahrungspflicht bleiben gesperrt erhalten`);
    } else {
      const pruefung = C.dsUebergang(a, d.aktion, d, h);
      if (!pruefung.ok) throw konflikt(pruefung.fehler);
      const vorher = a.status;
      a.status = pruefung.nach;
      if (d.aktion === "identitaet_anfordern") a.identitaet = { status: "angefordert", notiz: v.text(d.notiz, 300), am: jetzt() };
      if (d.aktion === "identitaet_bestaetigen") a.identitaet = { status: "bestaetigt", notiz: v.text(d.notiz, 300), am: jetzt(), vonId: n.id };
      if (d.aktion === "verlaengern") Object.assign(a, { verlaengertAm: jetzt(), verlaengerungsgrund: v.text(d.begruendung, 500) });
      if (d.aktion === "ablehnen") Object.assign(a, { begruendung: v.text(d.begruendung, 1000), erledigtAm: jetzt() });
      if (d.aktion === "erledigen") Object.assign(a, { ergebnis: v.mehrzeilig(d.ergebnis, 2000), loeschErgebnis: a.art === "loeschung" ? d.loeschErgebnis : "", erledigtAm: jetzt(), loeschbarAb: C.plusMonate(h, 36) });
      log(`${C.DS_STATUS[vorher].label} → ${C.DS_STATUS[a.status].label}${d.begruendung ? `: ${d.begruendung}` : d.notiz ? `: ${d.notiz}` : ""}`);
      const konto = a.kontoId ? nutzerById(db, a.kontoId) : null;
      const frist = C.dsFrist(a.eingangAm, { land: a.land, verlaengert: !!a.verlaengertAm });
      const text = { verlaengern: `Die Beantwortung Ihrer Datenschutzanfrage dauert länger. Neue Frist: ${frist.split("-").reverse().join(".")}.`, erledigen: "Ihre Datenschutzanfrage ist beantwortet.", ablehnen: "Zu Ihrer Datenschutzanfrage liegt eine Antwort vor.", identitaet_anfordern: "Für Ihre Datenschutzanfrage benötigen wir einen Identitätsnachweis." }[d.aktion];
      if (konto && !konto.geloeschtAm && text) benachrichtigen(db, konto, { art: "nachricht", titel: "Ihre Datenschutzanfrage", text, link: "/portal/profil", objektArt: "nutzer", objektId: konto.id }, { mailBetreff: "Ihre Datenschutzanfrage – ÖkoInvest", mailText: `${text} Details erhalten Sie über den vereinbarten Kanal bzw. im Portal.` });
    }
    protokoll(db, n, `dsgvo_${d.aktion}`, "dsgvo", a.id, `${C.DS_ARTEN[a.art].label}: ${d.aktion}`);
    return anfrageAusgabe(db, a);
  });
}

/** Anonymisierung eines Kontos auf Löschersuchen (wie Selbstlöschung in sicherheit.kontoLoeschen, ohne Passwort) */
function anonymisieren(db, n, u, a) {
  if (u.rollen?.includes("admin")) throw konflikt("Backoffice-Konten werden über die Nutzerverwaltung (Leitung) entfernt.");
  const mitglied = (db.mitgliedschaften || []).filter((m) => m.nutzerId === u.id && m.rolle === "inhaber").filter((m) => db.mitgliedschaften.some((x) => x.organisationId === m.organisationId && x.nutzerId !== u.id));
  if (mitglied.length) throw konflikt("Das Konto ist Inhaber einer Organisation mit weiteren Mitgliedern – Inhaberschaft zuerst übertragen lassen.");
  for (const m of (db.mitgliedschaften || []).filter((x) => x.nutzerId === u.id && x.rolle === "inhaber")) {
    for (const liste of [db.flaechen, db.projekte, db.interessen]) for (const o of liste || []) if (o.organisationId === m.organisationId) o.organisationId = null;
    db.organisationen = (db.organisationen || []).filter((o) => o.id !== m.organisationId);
    db.einladungen = (db.einladungen || []).filter((e) => e.organisationId !== m.organisationId);
  }
  db.mitgliedschaften = (db.mitgliedschaften || []).filter((m) => m.nutzerId !== u.id);
  const entwuerfeF = (db.flaechen || []).filter((f) => f.nutzerId === u.id && f.status === "entwurf" && !f.organisationId).map((f) => f.id);
  const entwuerfeP = (db.projekte || []).filter((p) => p.anbieterId === u.id && p.status === "entwurf" && !p.organisationId).map((p) => p.id);
  db.flaechen = (db.flaechen || []).filter((f) => !entwuerfeF.includes(f.id));
  db.projekte = (db.projekte || []).filter((p) => !entwuerfeP.includes(p.id));
  const alteEmail = u.email;
  db.einladungen = (db.einladungen || []).filter((e) => e.email !== alteEmail);
  for (const s of ["zweiFaktor", "sitzungen", "geraete", "anmeldungen", "tokens", "benachrichtigungen"]) db[s] = (db[s] || []).filter((x) => x.nutzerId !== u.id);
  if (db.anmeldeSperren) delete db.anmeldeSperren[alteEmail];
  Object.assign(u, {
    email: `geloescht-${u.id.toLowerCase()}@geloescht.invalid`, vorname: "Gelöschtes", nachname: "Konto", firma: "", telefon: "", passwortHash: null,
    aktiv: false, emailBestaetigt: false, suchprofil: null, komfort: null, mailEinstellungen: null, sitzungVersion: (u.sitzungVersion || 0) + 1, geloeschtAm: jetzt(), geloeschtDurch: `DSGVO ${a.id}`,
  });
  a.email = a.email ? `${a.email[0]}•••@${a.email.split("@")[1] || ""}` : "";
  protokoll(db, n, "konto_geloescht", "nutzer", u.id, `Konto anonymisiert auf Löschersuchen ${a.id} (${entwuerfeF.length + entwuerfeP.length} Entwürfe entfernt)`);
}

/** Datenexport für Auskunft/Übertragbarkeit (Art. 15/20) des verknüpften Kontos – JSON zum Prüfen und Übermitteln */
export async function dsExport(n, id, { ip = "" } = {}) {
  schreibNoetig(n);
  const db = await bereit();
  const a = db.dsgvo.anfragen.find((x) => x.id === v.kennung(id));
  if (!a) throw nichtGefunden("Anfrage nicht gefunden.");
  if (!C.DS_ARTEN[a.art]?.export) throw konflikt("Export nur bei Auskunft oder Datenübertragbarkeit.");
  if (!["in_bearbeitung", "verlaengert"].includes(a.status)) throw konflikt("Export erst nach bestätigter Identität.");
  const u = a.kontoId ? nutzerById(db, a.kontoId) : null;
  if (!u) throw konflikt("Kein Konto verknüpft – Auskunft zu Daten ohne Konto (z. B. Anfragen, Akquise) bitte manuell zusammenstellen.");
  const daten = await datenExport({ id: u.id, rollen: u.rollen });
  const kyc = (db.kyc?.faelle || []).filter((f) => f.kontoId === u.id).map((f) => ({ id: f.id, status: f.status, eingereichtAm: f.eingereichtAm || null, verifiziertAm: f.verifiziertAm || null, naechstePruefung: f.naechstePruefung || null, hinweis: "Unterlagen und Prüfergebnisse liegen verschlüsselt vor und werden auf Wunsch gesondert bereitgestellt; Einschränkungen nach GwG bleiben vorbehalten." }));
  const finanzen = (db.finanzen?.belege || []).filter((b) => b.empfaengerId === u.id).map((b) => ({ nummer: b.nummer, art: b.art, rechnungsdatum: b.rechnungsdatum, brutto: b.brutto, status: b.status }));
  const paket = {
    ...daten,
    anfrage: { id: a.id, art: C.DS_ARTEN[a.art].label, eingangAm: a.eingangAm, erstelltAm: jetzt() },
    informationenArt15: {
      verantwortlicher: C.VVT_VERANTWORTLICHER,
      zwecke: C.VVT.filter((t) => ["konto", "anfragen", "boerse", "kyc", "finanzen", "energie", "anlagen", "signatur"].includes(t.id)).map((t) => ({ taetigkeit: t.titel, zweck: t.zweck, rechtsgrundlage: t.rechtsgrundlage, empfaenger: t.empfaenger, speicherdauer: t.loeschung })),
      rechte: "Berichtigung (Art. 16), Löschung (Art. 17), Einschränkung (Art. 18), Datenübertragbarkeit (Art. 20), Widerspruch (Art. 21), Beschwerde bei der Aufsichtsbehörde (Art. 77 DSGVO).",
      herkunft: "Angaben der betroffenen Person im Portal bzw. in Formularen; Registerauszüge und Prüfergebnisse aus öffentlichen Registern bzw. beauftragten Diensten.",
      automatisierteEntscheidung: "Keine ausschließlich automatisierte Entscheidung im Sinne von Art. 22 DSGVO.",
    },
    kyc,
    abrechnungen: finanzen,
  };
  const text = JSON.stringify(paket, null, 2);
  await aendern((d) => {
    const x = d.dsgvo.anfragen.find((y) => y.id === a.id);
    x.exportAm = jetzt();
    x.exportSha = sha256(text);
    x.verlauf.push({ am: jetzt(), vonId: n.id, text: `Datenexport erstellt (SHA-256 ${x.exportSha.slice(0, 16)}…)` });
    protokoll(d, n, "dsgvo_export", "dsgvo", a.id, `Datenexport für Konto ${u.id} erstellt`, ip);
  });
  return { text, dateiname: `Datenauskunft-${a.id}.json` };
}

/** VVT als CSV oder JSON */
export async function vvtExport(n, { format = "csv" } = {}) {
  leseNoetig(n);
  await aendern((d) => protokoll(d, n, "export", "dsgvo", "VVT", `Verzeichnis der Verarbeitungstätigkeiten exportiert (${format})`)).catch(() => {});
  return format === "json" ? { text: JSON.stringify(C.vvtJson(), null, 2), dateiname: `VVT-${C.VVT_STAND}.json`, typ: "application/json" } : { text: C.vvtCsv(), dateiname: `VVT-${C.VVT_STAND}.csv`, typ: "text/csv; charset=utf-8" };
}

// ================================================================ KYC-SLA

export async function kycSlaUebersicht(n) {
  leseNoetig(n);
  const db = await lesen();
  const h = heute();
  const faelle = (db.kyc?.faelle || []).filter((f) => ["eingereicht", "in_pruefung", "zweitpruefung"].includes(f.status)).map((f) => ({ id: f.id, status: f.status, kontotyp: f.kontotyp, ...C.kycSla(f, h) }));
  return { heute: h, sla: C.KYC_SLA, faelle, rot: faelle.filter((f) => f.ampel === "rot").length, gelb: faelle.filter((f) => f.ampel === "gelb").length };
}

// ================================================================ Verdachtsfälle (GwG)

function verdachtAusgabe(db, f) {
  const kyc = f.kycFallId ? (db.kyc?.faelle || []).find((x) => x.id === f.kycFallId) : null;
  return {
    ...f,
    statusLabel: C.VERDACHT_STATUS[f.status]?.label, statusTon: C.VERDACHT_STATUS[f.status]?.ton, anlassLabel: C.VERDACHT_ANLAESSE[f.anlass] || f.anlass,
    meldestelle: C.MELDESTELLEN[f.land] || C.MELDESTELLEN.AT, erfasstVonName: nameVon(db, f.erfasstVon) || "", konto: f.kontoId ? { id: f.kontoId, name: nameVon(db, f.kontoId) } : null,
    kycStatus: kyc?.status || null, tageOffen: Math.round((Date.now() - new Date(f.erfasstAm).getTime()) / 86400e3),
  };
}

export async function verdachtListe(n, { status = "offen" } = {}) {
  verdachtNoetig(n);
  const db = await bereit();
  const alle = db.dsgvo.verdacht.map((f) => verdachtAusgabe(db, f));
  return {
    faelle: alle.filter((f) => (status === "alle" ? true : status === "offen" ? C.VERDACHT_OFFEN.includes(f.status) : f.status === status)),
    kennzahlen: { offen: alle.filter((f) => C.VERDACHT_OFFEN.includes(f.status)).length, gemeldet: alle.filter((f) => f.status === "gemeldet").length, gesamt: alle.length },
    anlaesse: C.VERDACHT_ANLAESSE, meldestellen: C.MELDESTELLEN,
  };
}

/** Interne Meldung (jedes Backoffice-Konto; Compliance zusätzlich mit Konto-/KYC-Bezug) – kein Versand nach außen */
export async function verdachtMelden(n, d = {}) {
  angemeldet(n);
  if (!istAdmin(n)) throw verboten("Nur für das Backoffice.");
  const sachverhalt = v.mehrzeilig(d.sachverhalt, 4000).trim();
  if (sachverhalt.length < 30) throw ungueltig("Bitte den Sachverhalt konkret beschreiben (mind. 30 Zeichen: wer, was, wann, warum auffällig).");
  const anlass = v.auswahl(d.anlass, C.VERDACHT_ANLAESSE, "sonstiges");
  return aendernBereit((db) => {
    const kontoId = v.kennung(d.kontoId) || null;
    if (kontoId && !nutzerById(db, kontoId)) throw nichtGefunden("Konto nicht gefunden.");
    const kycFallId = v.kennung(d.kycFallId) || (kontoId ? (db.kyc?.faelle || []).find((f) => f.kontoId === kontoId)?.id : null) || null;
    const f = { id: neueId("GW"), status: "erfasst", anlass, land: v.auswahl(d.land, { AT: 1, DE: 1, CH: 1 }, "AT"), sachverhalt, kontoId, kycFallId, projektId: v.kennung(d.projektId) || null, betrag: Number.isFinite(Number(d.betrag)) && Number(d.betrag) > 0 ? Math.round(Number(d.betrag)) : null, erfasstAm: jetzt(), erfasstVon: n.id, entscheidung: null, meldung: null, verlauf: [{ am: jetzt(), vonId: n.id, text: "Intern gemeldet" }], transaktionGesperrt: v.wahr(d.transaktionSperren) };
    db.dsgvo.verdacht.unshift(f);
    for (const c of compliancePersonen(db).filter((u) => u.id !== n.id)) {
      benachrichtigen(db, c, { art: "aufgabe", titel: "Neuer interner Verdachtshinweis", text: `Verdachtsfall ${f.id} (${C.VERDACHT_ANLAESSE[anlass]}) – bitte unverzüglich prüfen. Keine Information an die betroffene Person.`, link: "/portal/admin/compliance/gwg", objektArt: "verdacht", objektId: f.id }, { mailBetreff: "Interner Hinweis zur Prüfung – ÖkoInvest Compliance", mailText: "Im Backoffice liegt ein neuer vertraulicher Hinweis zur Prüfung vor. Details nur im Portal (Compliance)." });
      aufgabe(db, { titel: `Verdachtsfall ${f.id} prüfen`, beschreibung: "Sachverhalt würdigen, Unterlagen sichern, Entscheidung über Meldung dokumentieren. Keine Information an Betroffene (Tipping-off-Verbot).", faelligAm: new Date(Date.now() + 2 * 86400e3).toISOString().slice(0, 10), zustaendigId: c.id, vonId: n.id });
    }
    protokoll(db, n, "verdacht_gemeldet", "verdacht", f.id, `Interner Verdachtshinweis ${f.id} (${C.VERDACHT_ANLAESSE[anlass]})`);
    return { ok: true, id: f.id, hinweis: "Der Hinweis ist bei Compliance eingegangen. Bitte die betroffene Person nicht informieren und keine eigenen Nachforschungen nach außen anstellen." };
  });
}

/** Workflow-Aktion (pruefen|meldung_vorbereiten|gemeldet|keine_meldung|abschliessen|notiz) */
export async function verdachtAktion(n, id, d = {}) {
  verdachtNoetig(n);
  return aendernBereit((db) => {
    const f = db.dsgvo.verdacht.find((x) => x.id === v.kennung(id));
    if (!f) throw nichtGefunden("Verdachtsfall nicht gefunden.");
    const h = heute();
    if (d.aktion === "notiz") {
      const t = v.mehrzeilig(d.text, 2000).trim();
      if (t.length < 5) throw ungueltig("Bitte eine Notiz eingeben.");
      f.verlauf.push({ am: jetzt(), vonId: n.id, text: t });
    } else {
      const p = C.verdachtUebergang(f, d.aktion, d, { heute: h, ichId: n.id });
      if (!p.ok) throw konflikt(p.fehler);
      const vorher = f.status;
      f.status = p.nach;
      if (d.aktion === "pruefen") f.pruefer = n.id;
      if (["meldung_vorbereiten", "keine_meldung"].includes(d.aktion)) f.entscheidung = { art: d.aktion === "keine_meldung" ? "keine_meldung" : "meldung", begruendung: v.mehrzeilig(d.begruendung, 3000), am: jetzt(), vonId: n.id };
      if (d.aktion === "gemeldet") f.meldung = { am: d.gemeldetAm, aktenzeichen: v.text(d.aktenzeichen, 40), stelle: (C.MELDESTELLEN[f.land] || C.MELDESTELLEN.AT).name, erfasstAm: jetzt(), vonId: n.id };
      if (d.aktion === "abschliessen") Object.assign(f, { abgeschlossenAm: jetzt(), aufbewahrenBis: C.verdachtAufbewahrungBis(h, f.land) });
      f.verlauf.push({ am: jetzt(), vonId: n.id, text: `${C.VERDACHT_STATUS[vorher].label} → ${C.VERDACHT_STATUS[f.status].label}${d.aktenzeichen ? ` (Az. ${v.text(d.aktenzeichen, 40)})` : ""}` });
    }
    protokoll(db, n, `verdacht_${d.aktion}`, "verdacht", f.id, `Verdachtsfall ${f.id}: ${d.aktion}`);
    return verdachtAusgabe(db, f);
  });
}
