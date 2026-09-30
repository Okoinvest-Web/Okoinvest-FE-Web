// src/lib/plattform/backend/demo/pachtakte.js
//
// Demo-Backend „Pachtakte“ (Team 1 – Flächeneigentümer, Landwirt, Dacheigentümer): alles nach der Unterschrift des
// Pachtvertrags. Referenz für Frappe plattform/api/pachtakte.py. Reine Regeln: src/lib/plattform/pachtakte.js.
//
// Daten unter db.pachtakte = { v, anliegen[], agri[], akten{ [pachtvertragId]: { rueckbau, sicherheit } } }.
// Pachtverträge und Gutschriften kommen aus dem Finanzmodul (db.finanzen, backend/demo/finanzen.js).
//
// Rechte (jede Operation prüft selbst):
//   Eigentümer   – nur eigene Pachtverträge (pachtvertrag.eigentuemerId), Rollen flaeche/landwirt
//   Backoffice   – Rolle admin mit Bereich „pachtakte“ (rechte.js): lesen ≥ 1, schreiben = 2
// Wirkungen: Kündigung erledigt → Vertrag „gekündigt“ (kuendigungZum); Eigentümer-/Erbfall erledigt mit Konto →
// Pachtvertrag und Fläche gehen auf das neue Konto über (künftige Gutschriften an dieses Konto, Auszahlung erst nach
// dessen Verifizierung); Rückbau abgenommen + Sicherheit freigegeben → Vertrag „beendet“ (keine weiteren Gutschriften).

import { PlattformFehler, konflikt, nichtGefunden, ungueltig, verboten } from "../../fehler";
import * as v from "../../validierung";
import * as P from "../../pachtakte.js";
import * as F from "../../finanzen/index.js";
import { darfLesen, darfSchreiben } from "../../rechte";
import { intern } from "../demo";
import { aendern, lesen } from "./speicher";
import { jetzt, neueId } from "./hilfen";
import * as finanzen from "./finanzen";

const { protokoll, benachrichtigen, nutzerById, nameVon } = intern;
const VERSION = 1;
const BEREICH = "pachtakte";
const EIGENTUEMER_ROLLEN = ["flaeche", "landwirt"];

const istAdmin = (n) => !!n?.rollen?.includes("admin");
const boLesen = (n) => istAdmin(n) && darfLesen(n, BEREICH);
const boSchreiben = (n) => istAdmin(n) && darfSchreiben(n, BEREICH);

function angemeldet(n) {
  if (!n) throw new PlattformFehler(401, "Bitte melden Sie sich an.");
}
function leseNoetig(n) {
  angemeldet(n);
  if (!boLesen(n)) throw verboten(istAdmin(n) ? "Ihre Backoffice-Rolle erlaubt im Bereich „Pachtakten“ kein Lesen." : "Nur für das Backoffice.");
}
function schreibNoetig(n) {
  angemeldet(n);
  if (!boSchreiben(n)) throw verboten(istAdmin(n) ? "Ihre Backoffice-Rolle erlaubt im Bereich „Pachtakten“ kein Schreiben." : "Nur für das Backoffice.");
}
function eigentuemerRolle(n) {
  angemeldet(n);
  if (!istAdmin(n) && !EIGENTUEMER_ROLLEN.some((r) => n.rollen?.includes(r))) throw verboten("Die Pachtakte ist für Flächen- und Dacheigentümer sowie Landwirte.");
}

const HEUTE = () => F.heute();
const plusTageIso = (tage) => F.plusTage(HEUTE(), tage);

// ================================================================ Datenbestand

function sicher(db) {
  db.pachtakte ||= { v: 0, anliegen: [], agri: [], akten: {} };
  db.pachtakte.anliegen ||= [];
  db.pachtakte.agri ||= [];
  db.pachtakte.akten ||= {};
  return db.pachtakte;
}

const vertraegeAlle = (db) => db.finanzen?.pachtvertraege || [];
const vertragVon = (db, id) => vertraegeAlle(db).find((p) => p.id === id) || null;
const flaecheVon = (db, id) => (id ? (db.flaechen || []).find((f) => f.id === id) || null : null);
const vertragEnde = (pt) => F.laufzeitEnde(pt.beginn, pt.laufzeitJahre) || "";
const vertragKurz = (pt) => ({ id: pt.id, bezeichnung: pt.bezeichnung, land: pt.land, status: pt.status, objektArt: pt.objektArt, flaecheId: pt.flaecheId || null, vertragsdatum: pt.vertragsdatum || "", beginn: pt.beginn || "", laufzeitJahre: pt.laufzeitJahre, ende: vertragEnde(pt), kuendigungZum: pt.kuendigungZum || "", eigentuemerId: pt.eigentuemerId });

function akteVon(db, pt) {
  const pa = sicher(db);
  if (!pa.akten[pt.id]) pa.akten[pt.id] = P.akteStart(flaecheVon(db, pt.flaecheId)?.pachtangebot || null);
  return pa.akten[pt.id];
}

/** Demo: einmalig realistische Akten ergänzen (Sicherheit hinterlegt, Referenzjahr Agri-PV) */
function demoErgaenzen(db) {
  const pa = sicher(db);
  if (pa.v >= VERSION) return;
  pa.v = VERSION;
  const fl = db.nutzer.find((u) => u.email === "flaeche@example.com");
  const lw = db.nutzer.find((u) => u.email === "landwirt@example.com");
  const lechfeld = vertraegeAlle(db).find((p) => p.eigentuemerId === fl?.id && /Lechfeld/.test(p.bezeichnung));
  if (lechfeld) {
    const a = akteVon(db, lechfeld);
    a.sicherheit = { status: "hinterlegt", art: "buergschaft", betrag: 360000, ab: "baubeginn", geber: "Demo-Bank AG (fiktiv)", hinterlegtAm: "2023-03-15", verlauf: [{ am: "2023-03-15T09:00:00.000Z", von: "vorgesehen", nach: "hinterlegt", wer: "admin", text: "Bankbürgschaft über 360.000 € hinterlegt (Demo)." }] };
  }
  const agri = vertraegeAlle(db).find((p) => p.eigentuemerId === lw?.id && /Agri-PV/.test(p.bezeichnung));
  if (agri && lw) {
    const f = flaecheVon(db, agri.flaecheId);
    akteVon(db, agri);
    const d = { jahr: 2025, art: "referenz", kultur: f?.fach?.agri?.kultur && P.AGRI_NACHWEIS_KULTUREN[f.fach.agri.kultur] ? f.fach.agri.kultur : "getreide", kulturText: "Winterweizen (Demo)", gesamtHa: agri.flaecheHa || 9.8, bewirtschaftetHa: agri.flaecheHa || 9.8, ertrag: 72, einheit: "dt", bewirtschafter: "selbst", bewirtschafterName: "", gap: "ja", gapAktenzeichen: "", besonderheiten: "Referenzjahr vor dem Bau (Demo)." };
    pa.agri.push({ id: neueId("AGN"), vertragId: agri.id, kontoId: lw.id, flaecheId: agri.flaecheId || null, status: "bestaetigt", daten: d, pruefung: P.agriNachweisPruefen(d, { kategorie: f?.fach?.agri?.kategorie || "", referenz: null, land: agri.land }), verlauf: [{ am: jetzt(), von: "entwurf", nach: "eingereicht", wer: "eigentuemer", text: "" }, { am: jetzt(), von: "eingereicht", nach: "bestaetigt", wer: "admin", text: "Referenzjahr bestätigt (Demo)." }], erstelltAm: jetzt(), geaendertAm: jetzt() });
  }
}

/** Finanzmodul-Daten bereitstellen (Seed) und Demo-Akten einmalig ergänzen */
async function bereit(n) {
  await finanzen.meineAbrechnungen(n); // legt db.finanzen einmalig an (Rechte: nur Anmeldung, Ausgabe hier nicht genutzt)
  const db = await lesen();
  if ((db.pachtakte?.v || 0) < VERSION) {
    await aendern((d) => demoErgaenzen(d));
    return lesen();
  }
  return db;
}

// ================================================================ Ausgabe

function verlaufAus(db, liste = [], { backoffice = false } = {}) {
  return (liste || []).map((x) => ({ am: x.am, von: x.von, nach: x.nach, wer: x.wer, text: x.text || "", ...(backoffice && x.nutzerId ? { name: nameVon(db, x.nutzerId) } : {}) }));
}

function anliegenAus(db, a, { backoffice = false } = {}) {
  const pt = vertragVon(db, a.vertragId);
  const info = P.anliegenInfo(a.art, pt?.land);
  const aus = {
    id: a.id, vertragId: a.vertragId, vertrag: pt?.bezeichnung || "", art: a.art, artLabel: info?.label || a.art, status: a.status, statusLabel: P.ANLIEGEN_STATUS[a.status]?.label || a.status,
    daten: a.daten, zusammenfassung: P.anliegenZusammenfassung(a), ergebnis: a.ergebnis || null, hinweise: info?.hinweise || [], unterlagen: info?.unterlagen || [],
    bearbeitungBis: a.bearbeitungBis || "", erstelltAm: a.erstelltAm, geaendertAm: a.geaendertAm, verlauf: verlaufAus(db, a.verlauf, { backoffice }),
    aktionen: P.anliegenAktionen(a.status, backoffice ? "admin" : "eigentuemer").map((u) => ({ nach: u.nach, aktion: u.aktion, pflicht: u.pflicht || [] })),
  };
  if (backoffice) Object.assign(aus, { kontoId: a.kontoId, konto: nameVon(db, a.kontoId), email: nutzerById(db, a.kontoId)?.email || "", land: pt?.land || "", flaecheId: pt?.flaecheId || null, aufgabeId: a.aufgabeId || null });
  return aus;
}

function agriAus(db, x, { backoffice = false, referenz = null, kategorie = "" } = {}) {
  const pt = vertragVon(db, x.vertragId);
  const pruefung = P.agriNachweisPruefen(x.daten, { kategorie, referenz: x.daten.art === "betrieb" ? referenz : null, land: pt?.land });
  const aus = {
    id: x.id, vertragId: x.vertragId, vertrag: pt?.bezeichnung || "", status: x.status, statusLabel: P.AGRI_NACHWEIS_STATUS[x.status]?.label || x.status, daten: x.daten, pruefung,
    bearbeitbar: P.agriBearbeitbar(x), erstelltAm: x.erstelltAm, geaendertAm: x.geaendertAm, verlauf: verlaufAus(db, x.verlauf, { backoffice }),
  };
  if (backoffice) Object.assign(aus, { kontoId: x.kontoId, konto: nameVon(db, x.kontoId), aktionen: P.AGRI_NACHWEIS_UEBERGAENGE.filter((u) => u.wer === "admin" && u.von.includes(x.status)).map((u) => ({ nach: u.nach, aktion: u.aktion, pflicht: u.pflicht || [] })) });
  return aus;
}

const ANGEBOT_FELDER = ["modell", "laufzeitJahre", "laufzeitBeginn", "verlaengerungJahre", "verlaengerung", "vorlaufJahre", "optionsfristJahre", "nichtbau", "kuendigung", "rueckbau", "rueckbauAb", "rueckbauEuro", "dienstbarkeit", "rangruecktritt"];

function akteAus(db, pt, { backoffice = false, vertragAusgabe = null } = {}) {
  const heute = HEUTE();
  const f = flaecheVon(db, pt.flaecheId);
  const pa = f?.pachtangebot || null;
  const akte = akteVon(db, pt);
  const kurz = vertragKurz(pt);
  const agriMoeglich = !!(f?.agri || f?.fach?.agri?.kultur);
  const nachweiseRoh = sicher(db).agri.filter((x) => x.vertragId === pt.id).sort((a, b) => b.daten.jahr - a.daten.jahr || a.daten.art.localeCompare(b.daten.art));
  const kategorie = f?.fach?.agri?.kategorie || "";
  const referenz = (einheit) => P.agriReferenz(nachweiseRoh, f?.fach?.agri || null, einheit);
  return {
    vertrag: { ...(vertragAusgabe || {}), ...kurz, statusLabel: F.PACHTVERTRAG_STATUS[pt.status]?.label || pt.status },
    flaeche: f ? { id: f.id, bezeichnung: f.bezeichnung, status: f.status, agri: !!f.agri, land: f.land, kategorie } : null,
    angebot: pa ? Object.fromEntries(ANGEBOT_FELDER.filter((k) => pa[k] !== undefined && pa[k] !== null && pa[k] !== "").map((k) => [k, pa[k]])) : null,
    fristen: P.vertragsFristen(kurz, pa, { heute }),
    rueckbau: { ...akte.rueckbau, statusLabel: P.RUECKBAU_STATUS[akte.rueckbau.status]?.label, text: P.RUECKBAU_STATUS[akte.rueckbau.status]?.text, verlauf: verlaufAus(db, akte.rueckbau.verlauf, { backoffice }), moeglich: P.rueckbauMoeglich(kurz, heute),
      aktionen: P.RUECKBAU_UEBERGAENGE.filter((u) => u.wer === (backoffice ? "admin" : "eigentuemer") && u.von.includes(akte.rueckbau.status)).map((u) => ({ nach: u.nach, aktion: u.aktion, pflicht: u.pflicht || [] })) },
    sicherheit: { ...akte.sicherheit, statusLabel: P.SICHERHEIT_STATUS[akte.sicherheit.status]?.label, artLabel: P.SICHERHEIT_ARTEN[akte.sicherheit.art] || "", verlauf: verlaufAus(db, akte.sicherheit.verlauf, { backoffice }), hinweise: P.sicherheitHinweise(akte, kurz) },
    anliegen: sicher(db).anliegen.filter((a) => a.vertragId === pt.id).sort((a, b) => String(b.erstelltAm).localeCompare(String(a.erstelltAm))).map((a) => anliegenAus(db, a, { backoffice })),
    agri: agriMoeglich ? { moeglich: true, kategorie, nachweise: nachweiseRoh.map((x) => agriAus(db, x, { backoffice, referenz: referenz(x.daten.einheit), kategorie })), referenz: referenz("") } : { moeglich: false, nachweise: [] },
    historie: (pt.eigentuemerHistorie || []).map((h) => ({ am: h.am, ab: h.ab || "", anlass: h.anlass, ...(backoffice ? { vonName: nameVon(db, h.vonId), nachName: nameVon(db, h.nachId) } : {}) })),
    beendbar: (() => { try { return backoffice && pt.status !== "beendet" && P.beendenPruefen(akte); } catch { return false; } })(),
  };
}

// ================================================================ Portal: Eigentümer

/** Eigene Pachtakten mit Fristen, Anliegen, Rückbau/Sicherheit, Agri-PV-Nachweisen und Bescheinigungsjahren */
export async function meinePachtakte(n) {
  eigentuemerRolle(n);
  const fin = await finanzen.meineAbrechnungen(n);
  const db = await bereit(n);
  const aus = new Map((fin.pacht?.vertraege || []).map((x) => [x.id, x]));
  const eigene = vertraegeAlle(db).filter((p) => p.eigentuemerId === n.id && p.status !== "entwurf");
  const frueher = vertraegeAlle(db).filter((p) => p.eigentuemerId !== n.id && (p.eigentuemerHistorie || []).some((h) => h.vonId === n.id));
  // Akten fehlender Verträge einmalig anlegen (nur Schreiben, wenn nötig)
  if (eigene.some((p) => !db.pachtakte?.akten?.[p.id])) {
    await aendern((d) => { for (const p of eigene) { const pt = vertragVon(d, p.id); if (pt) akteVon(d, pt); } });
  }
  const db2 = await lesen();
  const belege = fin.pacht?.belege || [];
  return {
    vertraege: eigene.map((p) => akteAus(db2, vertragVon(db2, p.id), { vertragAusgabe: aus.get(p.id) || null })),
    frueher: frueher.map((p) => ({ id: p.id, bezeichnung: p.bezeichnung, uebergabe: (p.eigentuemerHistorie || []).filter((h) => h.vonId === n.id).map((h) => ({ am: h.am, ab: h.ab || "", anlass: h.anlass })).pop() || null })),
    bescheinigungsJahre: P.bescheinigungsJahre(belege),
    auszahlung: fin.pacht?.auszahlung || null,
  };
}

function eigenerVertrag(db, n, vertragId) {
  const pt = vertragVon(db, v.kennung(vertragId));
  if (!pt) throw nichtGefunden("Pachtvertrag nicht gefunden.");
  if (pt.eigentuemerId !== n.id) throw verboten("Dieser Pachtvertrag gehört nicht zu Ihrem Konto.");
  return pt;
}

function zustaendigFuer(db, pt) {
  const f = flaecheVon(db, pt.flaecheId);
  const kandidaten = db.nutzer.filter((u) => u.aktiv && u.rollen.includes("admin") && darfSchreiben(u, BEREICH));
  return kandidaten.find((u) => u.id === f?.zustaendigId) || kandidaten[0] || null;
}

function aufgabeAnlegen(db, n, pt, titel, beschreibung) {
  const z = zustaendigFuer(db, pt);
  if (!z) return null;
  db.aufgaben ||= [];
  const a = { id: neueId("AF"), titel: v.text(titel, 160), beschreibung: v.mehrzeilig(beschreibung, 2000), faelligAm: plusTageIso(P.ANLIEGEN_BEARBEITUNG_TAGE), zustaendigId: z.id, bezugArt: pt.flaecheId ? "flaeche" : null, bezugId: pt.flaecheId || null, status: "offen", erstelltVon: n.id, erstelltAm: jetzt(), erledigtAm: null, erledigtVon: null, erinnertAm: null, quelle: "pachtakte" };
  db.aufgaben.push(a);
  benachrichtigen(db, z, { art: "aufgabe", titel: `Neue Aufgabe: ${a.titel}`.slice(0, 160), text: `Fällig ${F.datumDe(a.faelligAm)} · Pachtakte`, link: "/portal/admin/pachtakten", objektArt: a.bezugArt, objektId: a.bezugId });
  return a.id;
}
function aufgabeErledigen(db, n, id) {
  const a = (db.aufgaben || []).find((x) => x.id === id);
  if (a && a.status === "offen") Object.assign(a, { status: "erledigt", erledigtAm: jetzt(), erledigtVon: n?.id || null });
}

function eigentuemerMelden(db, pt, kontoId, titel, t) {
  const u = nutzerById(db, kontoId);
  if (u) benachrichtigen(db, u, { art: "status", titel, text: t, link: "/portal/pachtvertraege", objektArt: "pachtvertrag", objektId: pt.id });
}

/** Neues Anliegen (Kündigung, Eigentümerwechsel, Erbfall, Zahlungsaufteilung, Verlängerung) */
export async function anliegenAnlegen(n, { vertragId, art, daten } = {}, { ip = "" } = {}) {
  eigentuemerRolle(n);
  await bereit(n);
  return aendern((db) => {
    const pt = eigenerVertrag(db, n, vertragId);
    const liste = sicher(db).anliegen;
    const a0 = v.auswahl(art, P.ANLIEGEN_ARTEN, "");
    P.anliegenErlaubt(a0, vertragKurz(pt), liste.filter((x) => x.vertragId === pt.id));
    const d = P.anliegenBereinigen(a0, daten, { heute: HEUTE(), land: pt.land, vertrag: vertragKurz(pt) });
    const a = { id: neueId("PAN"), vertragId: pt.id, kontoId: n.id, art: a0, status: "eingereicht", daten: d, ergebnis: null, bearbeitungBis: plusTageIso(P.ANLIEGEN_BEARBEITUNG_TAGE), verlauf: [{ am: jetzt(), von: "", nach: "eingereicht", wer: "eigentuemer", nutzerId: n.id, text: "" }], erstelltAm: jetzt(), geaendertAm: jetzt() };
    a.aufgabeId = aufgabeAnlegen(db, n, pt, `Pachtakte: ${P.ANLIEGEN_ARTEN[a0].kurz} – ${pt.bezeichnung}`, `${P.anliegenZusammenfassung(a)}\nEigentümer: ${nameVon(db, n.id)}\nBearbeitung: /portal/admin/pachtakten`);
    liste.push(a);
    protokoll(db, n, "pachtakte_anliegen", "pachtvertrag", pt.id, `Anliegen „${P.ANLIEGEN_ARTEN[a0].kurz}“ eingereicht: ${P.anliegenZusammenfassung(a)}`.slice(0, 280), ip);
    eigentuemerMelden(db, pt, n.id, `Anliegen eingegangen: ${P.ANLIEGEN_ARTEN[a0].kurz}`, `Wir bearbeiten Ihr Anliegen zu „${pt.bezeichnung}“ und melden uns bis ${F.datumDe(a.bearbeitungBis)}.`);
    return anliegenAus(db, a);
  });
}

function wirkungAnwenden(db, n, a, pt, ergebnis) {
  if (a.art === "kuendigung") {
    pt.status = "gekuendigt";
    pt.kuendigungZum = ergebnis.wirksamZum;
    pt.geaendertAm = jetzt();
    protokoll(db, n, "pachtvertrag_gekuendigt", "pachtvertrag", pt.id, `Kündigung wirksam zum ${F.datumDe(ergebnis.wirksamZum)} (Anliegen ${a.id})`);
  }
  if (["eigentuemerwechsel", "erbfall"].includes(a.art) && ergebnis.neuesKontoId) {
    const neu = nutzerById(db, v.kennung(ergebnis.neuesKontoId));
    if (!neu || !neu.aktiv || !neu.rollen.some((r) => EIGENTUEMER_ROLLEN.includes(r))) throw ungueltig("Das neue Konto muss ein aktives Eigentümer- oder Landwirt-Konto sein.");
    if (neu.id === pt.eigentuemerId) throw ungueltig("Das neue Konto ist bereits Eigentümer dieses Vertrags.");
    const alt = pt.eigentuemerId;
    pt.eigentuemerHistorie ||= [];
    pt.eigentuemerHistorie.push({ am: jetzt(), ab: ergebnis.ab || "", vonId: alt, nachId: neu.id, anlass: a.art === "erbfall" ? "erbfall" : a.daten?.anlass || "wechsel", anliegenId: a.id });
    pt.eigentuemerId = neu.id;
    pt.geaendertAm = jetzt();
    const f = flaecheVon(db, pt.flaecheId);
    if (f && f.nutzerId === alt) {
      f.nutzerId = neu.id;
      f.geaendertAm = jetzt();
      protokoll(db, n, "flaeche_eigentuemer", "flaeche", f.id, `Fläche an ${nameVon(db, neu.id)} übertragen (Anliegen ${a.id})`);
    }
    protokoll(db, n, "pachtvertrag_eigentuemer", "pachtvertrag", pt.id, `Eigentümer gewechselt: ${nameVon(db, alt)} → ${nameVon(db, neu.id)}${ergebnis.ab ? ` ab ${F.datumDe(ergebnis.ab)}` : ""} (Anliegen ${a.id})`);
    eigentuemerMelden(db, pt, neu.id, "Pachtvertrag übernommen", `Sie sind jetzt Vertragspartner für „${pt.bezeichnung}“. Bitte schließen Sie die Verifizierung ab, damit die Pacht ausgezahlt werden kann.`);
  }
  if (a.art === "zahlungsaufteilung") {
    pt.zahlungsaufteilung = { empfaenger: a.daten.empfaenger, grundlage: a.daten.grundlage, ab: a.daten.ab || "", anliegenId: a.id, am: jetzt() };
    pt.geaendertAm = jetzt();
    protokoll(db, n, "pachtvertrag_aufteilung", "pachtvertrag", pt.id, `Zahlungsaufteilung vermerkt: ${P.anliegenZusammenfassung(a)} (Anliegen ${a.id})`.slice(0, 280));
  }
}

/** Anliegen weiterführen – Eigentümer (Antwort, Zurückziehen) oder Backoffice (Prüfung, Rückfrage, Erledigung) */
export async function anliegenAktion(n, id, { nach, kommentar, wirksamZum, neuesKontoId, ab } = {}, { ip = "" } = {}) {
  angemeldet(n);
  await bereit(n);
  return aendern((db) => {
    const a = sicher(db).anliegen.find((x) => x.id === v.kennung(id));
    if (!a) throw nichtGefunden("Anliegen nicht gefunden.");
    const pt = vertragVon(db, a.vertragId);
    if (!pt) throw nichtGefunden("Pachtvertrag nicht gefunden.");
    const eigen = a.kontoId === n.id && pt.eigentuemerId === n.id;
    const wer = eigen && !istAdmin(n) ? "eigentuemer" : "admin";
    if (wer === "admin") schreibNoetig(n);
    const u = P.anliegenUebergang(a, v.text(nach, 30), wer, { kommentar, wirksamZum, neuesKontoId, ab }, { heute: HEUTE() });
    if (u.nach === "erledigt") wirkungAnwenden(db, n, a, pt, u.ergebnis);
    a.status = u.nach;
    a.geaendertAm = jetzt();
    if (u.nach === "erledigt") a.ergebnis = { text: u.kommentar, ...u.ergebnis, am: jetzt() };
    if (u.nach === "eingereicht") a.bearbeitungBis = plusTageIso(P.ANLIEGEN_BEARBEITUNG_TAGE);
    a.verlauf.push({ am: jetzt(), von: u.von, nach: u.nach, wer, nutzerId: n.id, text: u.kommentar });
    if (["erledigt", "abgelehnt", "zurueckgezogen"].includes(u.nach)) aufgabeErledigen(db, n, a.aufgabeId);
    protokoll(db, n, "pachtakte_anliegen", "pachtvertrag", pt.id, `Anliegen ${a.id}: ${u.aktion}`, ip);
    if (wer === "admin") {
      const texte = {
        in_pruefung: ["Anliegen in Bearbeitung", `Wir bearbeiten Ihr Anliegen zu „${pt.bezeichnung}“.`],
        rueckfrage: ["Rückfrage zu Ihrem Anliegen", `Zu „${pt.bezeichnung}“ brauchen wir noch eine Angabe – bitte antworten Sie in der Pachtakte.`],
        erledigt: ["Anliegen erledigt", `Ihr Anliegen zu „${pt.bezeichnung}“ ist abgeschlossen – das Ergebnis finden Sie in der Pachtakte.`],
        abgelehnt: ["Anliegen abgelehnt", `Ihr Anliegen zu „${pt.bezeichnung}“ konnte so nicht umgesetzt werden – Begründung in der Pachtakte.`],
      }[u.nach];
      if (texte) eigentuemerMelden(db, pt, a.kontoId, ...texte);
    } else if (u.nach === "eingereicht") {
      const z = (db.aufgaben || []).find((x) => x.id === a.aufgabeId);
      const zu = z ? nutzerById(db, z.zustaendigId) : zustaendigFuer(db, pt);
      if (zu) benachrichtigen(db, zu, { art: "aufgabe", titel: `Antwort zur Pachtakte: ${pt.bezeichnung}`.slice(0, 160), text: "Der Eigentümer hat auf die Rückfrage geantwortet.", link: "/portal/admin/pachtakten", objektArt: pt.flaecheId ? "flaeche" : null, objektId: pt.flaecheId || null });
    }
    return anliegenAus(db, a, { backoffice: wer === "admin" });
  });
}

/** Agri-PV-Bewirtschaftungsnachweis speichern (Entwurf) oder einreichen – je Vertrag, Jahr und Art einmal */
export async function agriNachweisSpeichern(n, { vertragId, id = null, daten, einreichen = false } = {}, { ip = "" } = {}) {
  eigentuemerRolle(n);
  await bereit(n);
  return aendern((db) => {
    const pt = eigenerVertrag(db, n, vertragId);
    if (pt.status === "beendet") throw konflikt("Der Pachtvertrag ist beendet.");
    const f = flaecheVon(db, pt.flaecheId);
    if (!(f?.agri || f?.fach?.agri?.kultur)) throw konflikt("Bewirtschaftungsnachweise gibt es nur für Agri-PV-Flächen.");
    const d = P.agriNachweisBereinigen(daten, { heute: HEUTE() });
    if (d.art === "betrieb" && !pt.beginn) throw ungueltig("Betriebsjahre gibt es erst ab Pachtbeginn (Bau bzw. Inbetriebnahme) – bitte als Referenzjahr erfassen.");
    const liste = sicher(db).agri;
    let x = id ? liste.find((y) => y.id === v.kennung(id) && y.vertragId === pt.id) : null;
    if (id && !x) throw nichtGefunden("Nachweis nicht gefunden.");
    const doppelt = liste.find((y) => y.vertragId === pt.id && y.daten.jahr === d.jahr && y.daten.art === d.art && y.id !== x?.id);
    if (doppelt) throw konflikt(`Für ${d.jahr} gibt es bereits einen Nachweis (${P.AGRI_NACHWEIS_ARTEN[d.art]}).`);
    if (x && !P.agriBearbeitbar(x)) throw konflikt("Der Nachweis ist eingereicht bzw. bestätigt und kann nicht mehr geändert werden.");
    if (!x) {
      x = { id: neueId("AGN"), vertragId: pt.id, kontoId: n.id, flaecheId: pt.flaecheId || null, status: "entwurf", daten: d, verlauf: [], erstelltAm: jetzt(), geaendertAm: jetzt() };
      liste.push(x);
    }
    x.daten = d;
    x.geaendertAm = jetzt();
    if (einreichen) {
      const u = P.agriUebergang(x, "eingereicht", "eigentuemer", {});
      x.status = u.nach;
      x.verlauf.push({ am: jetzt(), von: u.von, nach: u.nach, wer: "eigentuemer", nutzerId: n.id, text: "" });
      x.aufgabeId = aufgabeAnlegen(db, n, pt, `Agri-PV-Nachweis ${d.jahr} prüfen – ${pt.bezeichnung}`, `${P.AGRI_NACHWEIS_ARTEN[d.art]}, ${P.AGRI_NACHWEIS_KULTUREN[d.kultur]}, ${d.ertrag} ${P.AGRI_NACHWEIS_EINHEITEN[d.einheit]}\nBearbeitung: /portal/admin/pachtakten`);
      protokoll(db, n, "agri_nachweis", "pachtvertrag", pt.id, `Agri-PV-Nachweis ${d.jahr} eingereicht`, ip);
    }
    const nachweise = liste.filter((y) => y.vertragId === pt.id);
    return agriAus(db, x, { referenz: P.agriReferenz(nachweise, f?.fach?.agri || null, d.einheit), kategorie: f?.fach?.agri?.kategorie || "" });
  });
}

/** Backoffice: Nachweis bestätigen oder Rückfrage stellen */
export async function agriNachweisAktion(n, id, { nach, kommentar } = {}, { ip = "" } = {}) {
  schreibNoetig(n);
  await bereit(n);
  return aendern((db) => {
    const x = sicher(db).agri.find((y) => y.id === v.kennung(id));
    if (!x) throw nichtGefunden("Nachweis nicht gefunden.");
    const pt = vertragVon(db, x.vertragId);
    const u = P.agriUebergang(x, v.text(nach, 30), "admin", { kommentar });
    x.status = u.nach;
    x.geaendertAm = jetzt();
    x.verlauf.push({ am: jetzt(), von: u.von, nach: u.nach, wer: "admin", nutzerId: n.id, text: u.kommentar });
    aufgabeErledigen(db, n, x.aufgabeId);
    protokoll(db, n, "agri_nachweis", "pachtvertrag", x.vertragId, `Agri-PV-Nachweis ${x.daten.jahr}: ${u.aktion}`, ip);
    if (pt) eigentuemerMelden(db, pt, x.kontoId, u.nach === "bestaetigt" ? `Bewirtschaftungsnachweis ${x.daten.jahr} bestätigt` : `Rückfrage zum Nachweis ${x.daten.jahr}`, u.nach === "bestaetigt" ? `Ihr Nachweis zu „${pt.bezeichnung}“ ist geprüft.` : "Bitte ergänzen Sie den Nachweis in der Pachtakte.");
    const f = flaecheVon(db, pt?.flaecheId);
    return agriAus(db, x, { backoffice: true, referenz: P.agriReferenz(sicher(db).agri.filter((y) => y.vertragId === x.vertragId), f?.fach?.agri || null, x.daten.einheit), kategorie: f?.fach?.agri?.kategorie || "" });
  });
}

/**
 * Rückbau, Sicherheit und Vertragsende. ziel: rueckbau | sicherheit | vertrag.
 * Eigentümer: nur Rückbau abnehmen bzw. Mängel melden. Backoffice: alle übrigen Schritte.
 */
export async function rueckbauAktion(n, vertragId, { ziel = "rueckbau", nach, kommentar, termin, art, betrag, geber, hinterlegtAm } = {}, { ip = "" } = {}) {
  angemeldet(n);
  await bereit(n);
  return aendern((db) => {
    const pt = vertragVon(db, v.kennung(vertragId));
    if (!pt) throw nichtGefunden("Pachtvertrag nicht gefunden.");
    const eigen = pt.eigentuemerId === n.id && !istAdmin(n);
    if (!eigen) schreibNoetig(n);
    const akte = akteVon(db, pt);
    const z = v.auswahl(ziel, { rueckbau: 1, sicherheit: 1, vertrag: 1 }, "");
    if (eigen && z !== "rueckbau") throw verboten("Dieser Schritt ist dem Backoffice vorbehalten.");
    if (z === "rueckbau") {
      const u = P.rueckbauUebergang(akte, v.text(nach, 30), eigen ? "eigentuemer" : "admin", { kommentar, termin }, { vertrag: vertragKurz(pt), heute: HEUTE() });
      akte.rueckbau.status = u.nach;
      if (u.termin) akte.rueckbau.termin = u.termin;
      akte.rueckbau.verlauf.push({ am: jetzt(), von: u.von, nach: u.nach, wer: eigen ? "eigentuemer" : "admin", nutzerId: n.id, text: [u.kommentar, u.termin ? `Termin ${F.datumDe(u.termin)}` : ""].filter(Boolean).join(" · ") });
      protokoll(db, n, "pachtakte_rueckbau", "pachtvertrag", pt.id, `Rückbau: ${u.aktion}`, ip);
      if (eigen) {
        const zu = zustaendigFuer(db, pt);
        if (zu) benachrichtigen(db, zu, { art: "aufgabe", titel: `Rückbau ${u.nach === "abgenommen" ? "abgenommen" : "– Mängel gemeldet"}: ${pt.bezeichnung}`.slice(0, 160), text: u.kommentar || "Der Eigentümer hat die Abnahme bestätigt.", link: "/portal/admin/pachtakten", objektArt: pt.flaecheId ? "flaeche" : null, objektId: pt.flaecheId || null });
      } else {
        eigentuemerMelden(db, pt, pt.eigentuemerId, `Rückbau: ${P.RUECKBAU_STATUS[u.nach].label}`, u.nach === "abnahme_bereit" ? `Bitte prüfen Sie die Fläche „${pt.bezeichnung}“ und bestätigen Sie die Abnahme in der Pachtakte.` : `Neuer Stand zum Rückbau „${pt.bezeichnung}“.`);
      }
    } else if (z === "sicherheit") {
      const u = P.sicherheitUebergang(akte, v.text(nach, 30), { kommentar, art, betrag, geber, hinterlegtAm });
      Object.assign(akte.sicherheit, { status: u.nach, ...(u.nach === "hinterlegt" ? { art: u.art, betrag: u.betrag, geber: u.geber, hinterlegtAm: u.hinterlegtAm } : {}) });
      akte.sicherheit.verlauf.push({ am: jetzt(), von: u.von, nach: u.nach, wer: "admin", nutzerId: n.id, text: u.nach === "hinterlegt" ? `${P.SICHERHEIT_ARTEN[u.art]} über ${F.euro(u.betrag)} (${u.geber})${u.kommentar ? ` · ${u.kommentar}` : ""}` : u.kommentar });
      protokoll(db, n, "pachtakte_sicherheit", "pachtvertrag", pt.id, `Rückbausicherheit ${P.SICHERHEIT_STATUS[u.nach].label}`, ip);
      eigentuemerMelden(db, pt, pt.eigentuemerId, `Rückbausicherheit ${P.SICHERHEIT_STATUS[u.nach].label.toLowerCase()}`, `Zu „${pt.bezeichnung}“ gibt es einen neuen Stand der Rückbausicherheit.`);
    } else if (z === "vertrag") {
      if (v.text(nach, 30) !== "beendet") throw ungueltig("Unbekannter Schritt.");
      if (pt.status === "beendet") throw konflikt("Der Pachtvertrag ist bereits beendet.");
      P.beendenPruefen(akte);
      const k = v.mehrzeilig(kommentar, 1000);
      if (k.length < 3) throw ungueltig("Bitte das Vertragsende dokumentieren (z. B. Löschungsbewilligung der Dienstbarkeit erteilt).");
      pt.status = "beendet";
      pt.beendetAm = HEUTE();
      pt.geaendertAm = jetzt();
      akte.rueckbau.verlauf.push({ am: jetzt(), von: "abgenommen", nach: "abgenommen", wer: "admin", nutzerId: n.id, text: `Vertrag beendet: ${k}` });
      protokoll(db, n, "pachtvertrag_beendet", "pachtvertrag", pt.id, `Pachtvertrag beendet: ${k}`.slice(0, 280), ip);
      eigentuemerMelden(db, pt, pt.eigentuemerId, "Pachtvertrag beendet", `Der Pachtvertrag „${pt.bezeichnung}“ ist abgeschlossen. Ihre Abrechnungen bleiben im Portal abrufbar.`);
    } else throw ungueltig("Unbekannter Bereich.");
    return akteAus(db, pt, { backoffice: !eigen });
  });
}

/** Daten der Jahresbescheinigung (eigene Gutschriften eines Jahres) – PDF-Aufbau in server/pachtakte-pdf.js */
export async function jahresbescheinigungDaten(n, { jahr } = {}, { ip = "" } = {}) {
  eigentuemerRolle(n);
  const fin = await finanzen.meineAbrechnungen(n);
  const belege = fin.pacht?.belege || [];
  const jahre = P.bescheinigungsJahre(belege);
  const j = Number(jahr);
  if (!jahre.includes(j)) throw nichtGefunden("Für dieses Jahr liegen keine Pachtabrechnungen vor.");
  const db = await lesen();
  const vertraege = [...vertraegeAlle(db).filter((p) => p.eigentuemerId === n.id), ...vertraegeAlle(db).filter((p) => belege.some((b) => b.bezug?.pachtvertragId === p.id))];
  const b = P.jahresbescheinigung(belege, vertraege.map((p) => ({ id: p.id, bezeichnung: p.bezeichnung, land: p.land })), j);
  const kyc = db.finanzen?.kycDemo?.[n.id] || {};
  const aussteller = belege.find((x) => String(x.zeitraum?.von || "").startsWith(String(j)))?.gesellschaft || "ÖkoInvest GmbH";
  await aendern((d) => protokoll(d, n, "jahresbescheinigung", "konto", n.id, `Jahresbescheinigung ${j} abgerufen`, ip)).catch(() => {});
  return { ...b, empfaenger: { name: nameVon(db, n.id), anschrift: kyc.anschrift || "" }, aussteller, erstelltAm: HEUTE() };
}

// ================================================================ Backoffice

/** Arbeitsliste: offene Anliegen, eingereichte Nachweise, Rückbau/Sicherheit mit Handlungsbedarf, alle Akten */
export async function pachtakteBackoffice(n, { vertragId = null } = {}) {
  leseNoetig(n);
  await bereit(n);
  if (vertragId) {
    const db0 = await lesen();
    const pt0 = vertragVon(db0, v.kennung(vertragId));
    if (!pt0) throw nichtGefunden("Pachtvertrag nicht gefunden.");
    if (!db0.pachtakte?.akten?.[pt0.id]) await aendern((d) => akteVon(d, vertragVon(d, pt0.id)));
    const db = await lesen();
    const pt = vertragVon(db, pt0.id);
    return { akte: akteAus(db, pt, { backoffice: true }), eigentuemer: { id: pt.eigentuemerId, name: nameVon(db, pt.eigentuemerId), email: nutzerById(db, pt.eigentuemerId)?.email || "" }, konten: kontenAuswahl(db), schreiben: boSchreiben(n) };
  }
  const db = await lesen();
  const pa = sicher(db);
  const heute = HEUTE();
  const vertraege = vertraegeAlle(db).filter((p) => p.status !== "entwurf").map((p) => {
    const akte = pa.akten[p.id] || P.akteStart(flaecheVon(db, p.flaecheId)?.pachtangebot || null);
    const kurz = vertragKurz(p);
    const naechste = P.vertragsFristen(kurz, flaecheVon(db, p.flaecheId)?.pachtangebot || null, { heute }).find((x) => x.tage !== null && x.tage >= 0) || null;
    return {
      ...kurz, eigentuemer: nameVon(db, p.eigentuemerId), statusLabel: F.PACHTVERTRAG_STATUS[p.status]?.label || p.status,
      rueckbau: akte.rueckbau.status, rueckbauLabel: P.RUECKBAU_STATUS[akte.rueckbau.status]?.label, sicherheit: akte.sicherheit.status, sicherheitLabel: P.SICHERHEIT_STATUS[akte.sicherheit.status]?.label,
      sicherheitWarnung: P.sicherheitHinweise(akte, kurz).some((h) => h.ton === "warn"), naechsteFrist: naechste, offeneAnliegen: pa.anliegen.filter((a) => a.vertragId === p.id && P.ANLIEGEN_OFFEN.includes(a.status)).length,
    };
  });
  return {
    anliegen: pa.anliegen.filter((a) => P.ANLIEGEN_OFFEN.includes(a.status)).sort((a, b) => String(a.bearbeitungBis).localeCompare(String(b.bearbeitungBis))).map((a) => anliegenAus(db, a, { backoffice: true })),
    erledigt: pa.anliegen.filter((a) => !P.ANLIEGEN_OFFEN.includes(a.status)).sort((a, b) => String(b.geaendertAm).localeCompare(String(a.geaendertAm))).slice(0, 50).map((a) => anliegenAus(db, a, { backoffice: true })),
    nachweise: pa.agri.filter((x) => x.status === "eingereicht").map((x) => {
      const f = flaecheVon(db, vertragVon(db, x.vertragId)?.flaecheId);
      return agriAus(db, x, { backoffice: true, referenz: P.agriReferenz(pa.agri.filter((y) => y.vertragId === x.vertragId), f?.fach?.agri || null, x.daten.einheit), kategorie: f?.fach?.agri?.kategorie || "" });
    }),
    vertraege,
    konten: kontenAuswahl(db),
    schreiben: boSchreiben(n),
  };
}

function kontenAuswahl(db) {
  return db.nutzer.filter((u) => u.aktiv && u.rollen.some((r) => EIGENTUEMER_ROLLEN.includes(r))).map((u) => ({ id: u.id, name: nameVon(db, u.id), email: u.email })).sort((a, b) => a.name.localeCompare(b.name, "de"));
}
