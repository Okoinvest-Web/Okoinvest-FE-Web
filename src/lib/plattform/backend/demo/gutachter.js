// src/lib/plattform/backend/demo/gutachter.js
//
// Gutachter-/Planeraufträge im Demo-Backend – Referenz für plattform/api/gutachterauftrag.py (Vertrag: docs/API.md,
// Abschnitt „Gutachteraufträge“). Ergänzt die Projektentwicklung (Meilenstein-Zuweisung, Rückfragen, Dokumente) um den
// kaufmännischen und fachlichen Auftragsablauf: Leistungsanfrage an einen oder mehrere Gutachter → Angebot (Honorar, Termin,
// Abschlag, Zahlungsziel) → Annahme durch die Projektleitung (Auftragsbestätigung als PDF) → Bestätigung durch den Gutachter
// (Zuweisung am Meilenstein) → Termine/Begehungen, Zwischenstände, Rückfragen → Lieferungen mit Version, Prüfung, Mängeln,
// Freigabe → Abnahme (Abnahmeprotokoll) → Abschlags-/Schlussrechnung → sachliche Prüfung → Zahlung (Finanzen, Ist-Kosten am
// Entwicklungsprojekt) → interne Bewertung. Regeln und Zustandsautomat: src/lib/plattform/gutachter/kern.js.
//
// Rechte (jede Operation prüft Rolle UND Eigentum):
//   Backoffice  – admin mit Bereich „entwicklung“: lesen ≥ 1, schreiben = 2; Zahlung buchen zusätzlich „finanzen“ schreiben
//   Gutachter   – Rolle gutachter UND eigener Auftrag (gutachterId); sieht nie andere Angebote, interne Notizen oder Bewertungen;
//                 Projektunterlagen erst nach Bestätigung des Auftrags und nur „für Gutachter“ freigegebene
//   sonst       – 403 (Seiten: 404)
//
// Daten unter db.gutachterauftraege (eigene Sammlung, beim ersten Zugriff mit Demo-Daten ergänzt).

import { PlattformFehler, konflikt, nichtGefunden, ungueltig, verboten } from "../../fehler";
import * as v from "../../validierung";
import { darfLesen, darfSchreiben } from "../../rechte";
import { UPLOAD } from "../../konstanten";
import {
  AUFTRAG_OFFEN, AUFTRAG_STATUS, GutachterFehler, LIEFER_ARTEN, RECHNUNG_STATUS, TERMIN_STATUS, angebotBereinigen, angebotVergleich, anfrageBereinigen,
  auftragFristen, berichtBereinigen, bewertungBereinigen, bewertungSchnitt, maengelBereinigen, naechsteVersion, plusTage, rechnungBereinigen, rechnungsStand,
  terminBereinigen, uebergang, rund2,
} from "../../gutachter/kern";
import { GUTACHTER_FACHGEBIETE } from "../../entwicklung";
import { intern } from "../demo";
import { aendern, lesen, uploadLesen, uploadSchreiben } from "./speicher";
import { jetzt, neueId, sha256, vorTagen, zufallsToken } from "./hilfen";

const { benachrichtigen, protokoll, nutzerById, nameVon, aktiveAdmins } = intern;
const SCHEMA = 1;
const SYSTEM = { id: "system-gutachter", rollen: ["admin"], backofficeRollen: ["leitung"] };
const MAX_DATEIEN = 60;

const istAdmin = (n) => !!n?.rollen?.includes("admin");
const boLesen = (n) => istAdmin(n) && darfLesen(n, "entwicklung");
const boSchreiben = (n) => istAdmin(n) && darfSchreiben(n, "entwicklung");
const finSchreiben = (n) => istAdmin(n) && darfSchreiben(n, "finanzen");
const heute = () => new Date().toISOString().slice(0, 10);

function angemeldet(n) {
  if (!n) throw new PlattformFehler(401, "Bitte melden Sie sich an.");
}
function boLeseNoetig(n) {
  angemeldet(n);
  if (!boLesen(n)) throw verboten("Nur für das Backoffice (Projektentwicklung).");
}
function boSchreibNoetig(n) {
  angemeldet(n);
  if (!boSchreiben(n)) throw verboten(istAdmin(n) ? "Ihre Backoffice-Rolle erlaubt im Bereich „Projektentwicklung“ kein Schreiben." : "Nur für das Backoffice (Projektentwicklung).");
}
/** Fachfehler der reinen Logik → PlattformFehler mit Status */
function fach(fn) {
  try {
    return fn();
  } catch (e) {
    if (e instanceof GutachterFehler) throw new PlattformFehler(e.status || 422, e.message);
    throw e;
  }
}

// ================================================================ Datenbestand

async function lesenBereit() {
  const db = await lesen();
  if ((db.gutachterauftraege?.v || 0) >= SCHEMA) return db;
  await import("./entwicklung").then((m) => m.entwicklungAuswahl(SYSTEM)).catch(() => null); // Entwicklungs-Demo zuerst
  await aendern(async (d) => {
    if ((d.gutachterauftraege?.v || 0) >= SCHEMA) return;
    d.gutachterauftraege = { v: SCHEMA, auftraege: [], fristenAm: null };
    try {
      await seed(d);
    } catch (e) {
      console.warn("[plattform-demo] Gutachter-Demodaten nicht ergänzt:", e?.message);
    }
  });
  return lesen();
}
async function aendernBereit(fn) {
  await lesenBereit();
  return aendern(fn);
}
const G = (db) => db.gutachterauftraege;
const projektVon = (db, id) => (db.entwicklung?.projekte || []).find((p) => p.id === id) || null;
const meilensteinVon = (db, id) => (id ? (db.entwicklung?.meilensteine || []).find((m) => m.id === id) || null : null);

function auftragLaden(db, id) {
  const a = G(db).auftraege.find((x) => x.id === v.kennung(id));
  if (!a) throw nichtGefunden("Auftrag nicht gefunden.");
  return a;
}
/** Sicht des Nutzers auf den Auftrag: "bo" | "gutachter" – sonst 403 */
function sichtVon(n, a) {
  if (boLesen(n)) return "bo";
  if (n?.rollen?.includes("gutachter") && a.gutachterId === n.id) return "gutachter";
  throw verboten("Dieser Auftrag ist Ihrem Konto nicht zugeordnet.");
}
function verlauf(db, a, n, text, extern = true) {
  a.verlauf ||= [];
  a.verlauf.push({ am: jetzt(), von: n ? nameVon(db, n.id) || (istAdmin(n) ? "ÖkoInvest" : "Gutachter") : "System", text: v.text(text, 300), extern });
  a.geaendertAm = jetzt();
}
/** Empfänger auf ÖkoInvest-Seite: verantwortliche Projektleitung (Auftrag, sonst Projekt) */
function plVon(db, a) {
  const p = projektVon(db, a.projektId);
  return nutzerById(db, a.verantwortlichId || p?.projektleiterId) || null;
}
const MAIL_G = { mailBetreff: "Neuigkeiten zu Ihrem Gutachterauftrag – ÖkoInvest", mailText: "Zu einem Ihrer Aufträge gibt es Neuigkeiten. Details sehen Sie nach der Anmeldung im Portal." };
const MAIL_BO = { mailBetreff: "Gutachterauftrag – ÖkoInvest", mailText: "Zu einem Gutachterauftrag gibt es Neuigkeiten. Details im Backoffice." };
function anGutachter(db, a, titel, text, mail = true) {
  const u = nutzerById(db, a.gutachterId);
  if (u) benachrichtigen(db, u, { art: "entwicklung", titel, text, link: `/portal/gutachter/${a.id}`, objektArt: "gutachterauftrag", objektId: a.id }, { mail, ...MAIL_G });
}
function anPl(db, a, titel, text, mail = true) {
  const u = plVon(db, a);
  if (u) benachrichtigen(db, u, { art: "entwicklung", titel, text, link: `/portal/admin/gutachter/${a.id}`, objektArt: "gutachterauftrag", objektId: a.id }, { mail, ...MAIL_BO });
}

// ================================================================ Ausgabe

function dateiAusgabe(a, d, sicht) {
  return { id: d.id, name: d.name, mime: d.mime, groesse: d.groesse, am: d.am, link: `/api/${sicht === "bo" ? "admin" : "portal"}/gutachter/${a.id}/dateien/${d.id}` };
}

function projektKurz(db, a) {
  const p = projektVon(db, a.projektId);
  const m = meilensteinVon(db, a.meilensteinId);
  return p ? { id: p.id, titel: p.titel, typ: p.typ, land: p.land, bundesland: p.bundesland || "", gemeinde: p.gemeinde || "", mwp: p.mwp || 0, meilenstein: m ? { id: m.id, titel: m.titel } : null } : null;
}

function schnittVon(db, gutachterId) {
  return bewertungSchnitt(G(db).auftraege.filter((x) => x.gutachterId === gutachterId && x.bewertung).map((x) => x.bewertung));
}

function auftragAusgabe(db, a, sicht, { voll = false } = {}) {
  const h = heute();
  const beauftragt = !["angefragt", "angebot", "abgelehnt", "nicht_beauftragt"].includes(a.status) && !!a.beauftragung;
  const u = nutzerById(db, a.gutachterId);
  const aus = {
    id: a.id, gruppe: a.gruppe, titel: a.titel, fachgebiet: a.fachgebiet, fachgebietLabel: GUTACHTER_FACHGEBIETE[a.fachgebiet] || a.fachgebiet,
    status: a.status, statusLabel: AUFTRAG_STATUS[a.status]?.label || a.status, statusTon: AUFTRAG_STATUS[a.status]?.ton || "neutral", schritt: AUFTRAG_STATUS[a.status]?.schritt ?? -1,
    projekt: projektKurz(db, a), angebotsfrist: a.angebotsfrist, wunschtermin: a.wunschtermin || "",
    gutachter: { id: a.gutachterId, name: nameVon(db, a.gutachterId), firma: u?.firma || "" },
    angebot: a.angebot || null, beauftragung: a.beauftragung || null, abnahme: a.abnahme || null, absage: a.absage || null,
    liefertermin: a.beauftragung?.liefertermin || a.angebot?.liefertermin || a.wunschtermin || "",
    fristen: auftragFristen(a, h), rechnungsstand: rechnungsStand(a, h), erstelltAm: a.erstelltAm, geaendertAm: a.geaendertAm,
    fortschritt: (a.berichte || []).length ? a.berichte[a.berichte.length - 1].fortschritt : AUFTRAG_STATUS[a.status]?.schritt >= 5 ? 100 : 0,
  };
  aus.ueberfaellig = aus.fristen.some((f) => f.ueberfaellig && ["angebotsfrist", "liefertermin", "zahlung"].includes(f.art));
  if (sicht === "bo") {
    aus.verantwortlich = nameVon(db, a.verantwortlichId) || "";
    aus.bewertung = a.bewertung || null;
    aus.gutachter.schnitt = schnittVon(db, a.gutachterId);
  }
  if (!voll) return aus;
  const m = meilensteinVon(db, a.meilensteinId);
  const unterlagen = beauftragt && a.status !== "storniert" && m
    ? (db.entwicklung?.dokumente || []).filter((d) => d.meilensteinId === m.id && d.fuerGutachter).map((d) => ({ id: d.id, name: d.name, am: d.am, groesse: d.groesse, link: `/api/portal/entwicklung/dokumente/${d.id}` }))
    : [];
  return {
    ...aus,
    leistung: a.leistung, hinweise: a.hinweise || "",
    termine: (a.termine || []).map((t) => ({ ...t, statusLabel: TERMIN_STATUS[t.status]?.label, von: t.vonSeite === "bo" ? "ÖkoInvest" : "Gutachter" })).sort((x, y) => `${x.datum}${x.uhrzeit}`.localeCompare(`${y.datum}${y.uhrzeit}`)),
    berichte: (a.berichte || []).slice().reverse(),
    lieferungen: (a.lieferungen || []).map((l) => ({ ...l, datei: l.dateiId ? dateiAusgabe(a, (a.dateien || []).find((d) => d.id === l.dateiId) || { id: l.dateiId }, sicht) : null })).reverse(),
    rueckfragen: (a.rueckfragen || []).map((r) => ({ ...r, von: r.seite === "bo" ? "ÖkoInvest Projektentwicklung" : sicht === "gutachter" ? "Sie" : nameVon(db, a.gutachterId) })),
    rechnungen: (a.rechnungen || []).map((r) => ({ ...r, statusLabel: RECHNUNG_STATUS[r.status]?.label, datei: r.dateiId ? dateiAusgabe(a, (a.dateien || []).find((d) => d.id === r.dateiId) || { id: r.dateiId }, sicht) : null, ueberfaellig: r.status !== "bezahlt" && r.faelligAm < heute() })).reverse(),
    unterlagen,
    verlauf: (a.verlauf || []).filter((x) => sicht === "bo" || x.extern).slice(-60).reverse(),
    notiz: sicht === "bo" ? a.notiz || "" : undefined,
    rechte: rechteFuer(a, sicht),
  };
}

/** Welche Aktionen die Oberfläche anbieten darf (Server prüft trotzdem jede Aktion) */
function rechteFuer(a, sicht) {
  const s = a.status;
  if (sicht === "gutachter") {
    const bearbeitung = ["beauftragt", "in_arbeit", "in_pruefung", "nachbesserung", "abnahmebereit"].includes(s);
    return {
      angebot: ["angefragt", "angebot"].includes(s), ablehnen: ["angefragt", "angebot"].includes(s), bestaetigen: s === "beauftragt",
      liefern: ["in_arbeit", "nachbesserung", "in_pruefung", "abnahmebereit"].includes(s), bericht: ["in_arbeit", "in_pruefung", "nachbesserung"].includes(s),
      termin: bearbeitung, rueckfrage: AUFTRAG_OFFEN.includes(s), abschlag: bearbeitung && (a.angebot?.abschlagPct || 0) > 0 && s !== "beauftragt",
      schluss: s === "abgenommen",
    };
  }
  const offen = AUFTRAG_OFFEN.includes(s);
  return {
    beauftragen: s === "angebot", ablehnen: ["angebot", "angefragt"].includes(s), pruefen: s === "in_pruefung", abnehmen: s === "abnahmebereit",
    stornieren: offen && !["abgenommen", "abgerechnet"].includes(s), termin: ["beauftragt", "in_arbeit", "in_pruefung", "nachbesserung", "abnahmebereit"].includes(s),
    rueckfrage: offen, bewerten: ["abgenommen", "abgerechnet", "abgeschlossen"].includes(s), liefertermin: ["beauftragt", "in_arbeit", "in_pruefung", "nachbesserung"].includes(s),
  };
}

// ================================================================ Gutachter (extern)

/** Eigene Aufträge und Anfragen des Gutachters (alle Projekte), Fristen, Kennzahlen */
export async function gaMeine(n) {
  angemeldet(n);
  if (!n.rollen?.includes("gutachter")) throw verboten("Nur für Gutachter und Planer.");
  await fristenLazy();
  const db = await lesen();
  const liste = G(db).auftraege.filter((a) => a.gutachterId === n.id).map((a) => auftragAusgabe(db, a, "gutachter"));
  const fristen = liste.flatMap((a) => a.fristen.filter((f) => f.tage <= 14 && f.art !== "zahlung").map((f) => ({ ...f, auftragId: a.id, auftrag: a.titel, projekt: a.projekt?.titel || "" }))).sort((x, y) => x.datum.localeCompare(y.datum));
  return {
    auftraege: liste.sort((x, y) => String(y.geaendertAm).localeCompare(String(x.geaendertAm))),
    fristen,
    kennzahlen: {
      anfragen: liste.filter((a) => ["angefragt"].includes(a.status)).length,
      laufend: liste.filter((a) => ["beauftragt", "in_arbeit", "in_pruefung", "nachbesserung", "abnahmebereit"].includes(a.status)).length,
      ueberfaellig: liste.filter((a) => a.ueberfaellig).length,
      offenBrutto: rund2(liste.reduce((s, a) => s + (a.rechnungsstand.offenBrutto || 0), 0)),
    },
  };
}

export async function gaAuftrag(n, id) {
  angemeldet(n);
  const db = await lesenBereit();
  const a = auftragLaden(db, id);
  const sicht = sichtVon(n, a);
  const aus = auftragAusgabe(db, a, sicht, { voll: true });
  if (sicht === "bo") {
    const gruppe = G(db).auftraege.filter((x) => x.gruppe === a.gruppe);
    aus.gruppe = { id: a.gruppe, auftraege: gruppe.map((x) => auftragAusgabe(db, x, "bo")), vergleich: angebotVergleich(gruppe.filter((x) => x.angebot && ["angebot", "beauftragt", "in_arbeit", "in_pruefung", "nachbesserung", "abnahmebereit", "abgenommen", "abgerechnet", "abgeschlossen"].includes(x.status)).map((x) => ({ id: x.id, gutachter: nameVon(db, x.gutachterId), angebot: x.angebot, bewertung: schnittVon(db, x.gutachterId)?.schnitt }))) };
    aus.darfSchreiben = boSchreiben(n);
    aus.darfZahlung = finSchreiben(n);
  }
  return aus;
}

/** Aktionen am Auftrag – Gutachter- und Backoffice-Seite (gleiche Schnittstelle, Rechte je Aktion) */
export async function gaAktion(n, id, daten = {}) {
  angemeldet(n);
  const aktion = v.text(daten.aktion, 40);
  const r = await aendernBereit((db) => {
    const a = auftragLaden(db, id);
    const sicht = sichtVon(n, a);
    if (sicht === "bo" && !boSchreiben(n)) throw verboten("Ihre Backoffice-Rolle erlaubt im Bereich „Projektentwicklung“ kein Schreiben.");
    const wer = sicht === "bo" ? "bo" : "gutachter";
    const p = projektVon(db, a.projektId);
    const h = heute();
    const nachStatus = (akt) => fach(() => uebergang(akt, { status: a.status, wer })).nach;

    if (aktion === "angebot_abgeben") {
      const nach = nachStatus("angebot_abgeben");
      if (a.angebotsfrist && a.angebotsfrist < h && a.status === "angefragt") throw konflikt("Die Angebotsfrist ist abgelaufen – bitte wenden Sie sich an die Projektleitung.");
      const ang = fach(() => angebotBereinigen(daten.angebot || {}, { heute: h, land: p?.land }));
      a.angebot = { ...ang, am: jetzt(), version: (a.angebot?.version || 0) + 1 };
      a.status = nach;
      verlauf(db, a, n, `Angebot ${a.angebot.version > 1 ? "aktualisiert" : "abgegeben"}: ${ang.summeNetto.toLocaleString("de-DE")} € netto, Liefertermin ${ang.liefertermin}`);
      anPl(db, a, `Angebot eingegangen: ${a.titel}`, `${nameVon(db, a.gutachterId)} – ${ang.summeNetto.toLocaleString("de-DE")} € netto (${p?.titel || ""})`);
    } else if (aktion === "anfrage_ablehnen") {
      a.status = nachStatus("anfrage_ablehnen");
      a.absage = { grund: v.text(daten.grund, 500) || "ohne Angabe", am: jetzt(), seite: "gutachter" };
      verlauf(db, a, n, `Anfrage abgelehnt: ${a.absage.grund}`);
      anPl(db, a, `Gutachter hat abgelehnt: ${a.titel}`, a.absage.grund, false);
    } else if (aktion === "beauftragen") {
      const nach = nachStatus("beauftragen");
      if (a.angebot?.gueltigBis && a.angebot.gueltigBis < h) throw konflikt("Die Bindefrist des Angebots ist abgelaufen – bitte ein aktualisiertes Angebot anfordern.");
      const lt = /^\d{4}-\d{2}-\d{2}$/.test(String(daten.liefertermin || "")) ? daten.liefertermin : a.angebot.liefertermin;
      if (lt <= h) throw ungueltig("Der Liefertermin muss in der Zukunft liegen.");
      a.status = nach;
      a.beauftragung = { am: jetzt(), vonId: n.id, von: nameVon(db, n.id), nummer: `GA-${new Date().getFullYear()}-${a.id.slice(-6)}`, liefertermin: lt, bedingungen: v.mehrzeilig(daten.bedingungen, 2000), summeNetto: a.angebot.summeNetto, bestaetigtAm: null };
      verlauf(db, a, n, `Beauftragt (Auftrag ${a.beauftragung.nummer}), Liefertermin ${lt}`);
      anGutachter(db, a, `Auftrag erteilt: ${a.titel}`, "Bitte bestätigen Sie den Auftrag im Portal. Danach sehen Sie die Projektunterlagen.");
      for (const x of G(db).auftraege.filter((y) => y.gruppe === a.gruppe && y.id !== a.id && ["angefragt", "angebot"].includes(y.status))) {
        x.status = "nicht_beauftragt";
        verlauf(db, x, n, "Die Leistung wurde anderweitig vergeben. Vielen Dank für Ihr Angebot.");
        anGutachter(db, x, `Anfrage entschieden: ${x.titel}`, "Die Leistung wurde anderweitig vergeben. Vielen Dank für Ihr Angebot.", false);
      }
    } else if (aktion === "angebot_ablehnen") {
      a.status = nachStatus("angebot_ablehnen");
      a.absage = { grund: v.text(daten.grund, 500) || "", am: jetzt(), seite: "bo" };
      verlauf(db, a, n, "Angebot nicht angenommen.");
      anGutachter(db, a, `Anfrage entschieden: ${a.titel}`, "Ihr Angebot wurde nicht angenommen.", false);
    } else if (aktion === "auftrag_bestaetigen") {
      a.status = nachStatus("auftrag_bestaetigen");
      if (!v.wahr(daten.zustimmung)) throw ungueltig("Bitte bestätigen Sie Leistung, Honorar, Termin und die Vertraulichkeitspflichten.");
      a.beauftragung.bestaetigtAm = jetzt();
      a.beauftragung.bestaetigtVon = nameVon(db, n.id);
      a.beauftragung.bestaetigtIpHash = daten.ip ? sha256(String(daten.ip)).slice(0, 16) : "";
      const m = meilensteinVon(db, a.meilensteinId);
      if (m && !(m.gutachterIds || []).includes(n.id)) m.gutachterIds = [...(m.gutachterIds || []), n.id]; // Zuweisung am Meilenstein (Pläne, Unterlagen, Rückfragen)
      if (m && m.status === "offen") {
        m.status = "in_arbeit";
        m.istStart ||= h;
      }
      verlauf(db, a, n, "Auftrag bestätigt");
      anPl(db, a, `Auftrag bestätigt: ${a.titel}`, `${nameVon(db, n.id)} hat den Auftrag angenommen.`, false);
    } else if (aktion === "termin") {
      if (!rechteFuer(a, sicht).termin) throw konflikt("Termine sind nur während der Bearbeitung möglich.");
      const t = fach(() => terminBereinigen(daten.termin || {}, { heute: h }));
      const neu = { id: neueId("GT"), ...t, status: "vorgeschlagen", vonSeite: wer, vonId: n.id, am: jetzt() };
      a.termine = [...(a.termine || []), neu];
      verlauf(db, a, n, `Termin vorgeschlagen: ${t.datum}${t.uhrzeit ? ` ${t.uhrzeit}` : ""} (${t.ort || "ohne Ort"})`);
      if (wer === "bo") anGutachter(db, a, `Terminvorschlag: ${a.titel}`, `${t.datum}${t.uhrzeit ? ` ${t.uhrzeit} Uhr` : ""} – bitte bestätigen.`);
      else anPl(db, a, `Terminvorschlag: ${a.titel}`, `${t.datum}${t.uhrzeit ? ` ${t.uhrzeit} Uhr` : ""} – bitte bestätigen.`);
    } else if (aktion === "termin_status") {
      const t = (a.termine || []).find((x) => x.id === v.kennung(daten.terminId));
      if (!t) throw nichtGefunden("Termin nicht gefunden.");
      const s = v.auswahl(daten.status, ["bestaetigt", "erledigt", "abgesagt"], "");
      if (!s) throw ungueltig("Unbekannter Terminstatus.");
      if (s === "bestaetigt" && t.vonSeite === wer) throw konflikt("Den Vorschlag bestätigt die andere Seite.");
      if (["erledigt", "abgesagt"].includes(t.status)) throw konflikt("Der Termin ist bereits abgeschlossen.");
      if (s === "erledigt" && t.datum > h) throw konflikt("Ein Termin in der Zukunft kann nicht erledigt sein.");
      t.status = s;
      t.protokoll = v.text(daten.protokoll, 1000) || t.protokoll || "";
      verlauf(db, a, n, `Termin ${t.datum}: ${TERMIN_STATUS[s].label}${t.protokoll ? ` – ${t.protokoll}` : ""}`);
      if (wer === "bo") anGutachter(db, a, `Termin ${TERMIN_STATUS[s].label.toLowerCase()}: ${a.titel}`, `${t.datum}`, false);
      else anPl(db, a, `Termin ${TERMIN_STATUS[s].label.toLowerCase()}: ${a.titel}`, `${t.datum}`, false);
    } else if (aktion === "bericht") {
      if (wer !== "gutachter" || !rechteFuer(a, sicht).bericht) throw konflikt("Zwischenstände meldet der beauftragte Gutachter während der Bearbeitung.");
      const letzter = (a.berichte || []).length ? a.berichte[a.berichte.length - 1].fortschritt : 0;
      const b = fach(() => berichtBereinigen(daten, { letzter }));
      a.berichte = [...(a.berichte || []), { id: neueId("GB"), ...b, am: jetzt() }];
      verlauf(db, a, n, `Zwischenstand ${b.fortschritt} %`);
      anPl(db, a, `Zwischenstand ${b.fortschritt} %: ${a.titel}`, b.text.slice(0, 160), false);
    } else if (aktion === "rueckfrage") {
      if (!rechteFuer(a, sicht).rueckfrage) throw konflikt("Der Auftrag ist abgeschlossen.");
      const t = v.mehrzeilig(daten.text, 3000);
      v.pflicht(t.length >= 3, "Bitte formulieren Sie Ihre Rückfrage.");
      const bezug = daten.antwortAuf ? (a.rueckfragen || []).find((x) => x.id === v.kennung(daten.antwortAuf)) : null;
      a.rueckfragen = [...(a.rueckfragen || []), { id: neueId("GR"), seite: wer, vonId: n.id, text: t, am: jetzt(), antwortAuf: bezug?.id || null }];
      if (bezug) bezug.beantwortet = true;
      verlauf(db, a, n, `${bezug ? "Antwort" : "Rückfrage"} (${wer === "bo" ? "ÖkoInvest" : "Gutachter"})`);
      if (wer === "bo") anGutachter(db, a, `Nachricht zu Ihrem Auftrag: ${a.titel}`, t.slice(0, 160));
      else anPl(db, a, `Rückfrage des Gutachters: ${a.titel}`, t.slice(0, 160));
    } else if (aktion === "maengel" || aktion === "freigeben") {
      const l = (a.lieferungen || []).find((x) => x.id === v.kennung(daten.lieferungId)) || (a.lieferungen || []).filter((x) => x.status === "zur_pruefung").slice(-1)[0];
      if (!l || l.status !== "zur_pruefung") throw konflikt("Keine Lieferung in Prüfung.");
      if (aktion === "maengel") {
        a.status = nachStatus("maengel");
        const liste = fach(() => maengelBereinigen(daten.maengel));
        l.status = "maengel";
        l.maengel = liste.map((t) => ({ id: neueId("GM"), text: t, erledigt: false }));
        l.pruefung = { am: jetzt(), von: nameVon(db, n.id), kommentar: v.text(daten.kommentar, 500) };
        verlauf(db, a, n, `Mängel zu Version ${l.version}: ${liste.length} Punkt(e)`);
        anGutachter(db, a, `Nachbesserung erforderlich: ${a.titel}`, `${liste.length} Punkt(e) zu Version ${l.version}.`);
      } else {
        fach(() => uebergang("freigeben", { status: a.status, wer }));
        l.status = "freigegeben";
        l.pruefung = { am: jetzt(), von: nameVon(db, n.id), kommentar: v.text(daten.kommentar, 500) };
        for (const x of a.lieferungen) if (x.id !== l.id && x.status === "freigegeben") x.status = "ersetzt";
        a.status = l.art === "endfassung" ? "abnahmebereit" : "in_arbeit";
        verlauf(db, a, n, `Version ${l.version} (${LIEFER_ARTEN[l.art]}) freigegeben`);
        anGutachter(db, a, `Lieferung freigegeben: ${a.titel}`, `Version ${l.version} (${LIEFER_ARTEN[l.art]})${l.art === "endfassung" ? " – die Abnahme folgt." : ""}`);
      }
    } else if (aktion === "abnehmen") {
      const nach = nachStatus("abnehmen");
      const l = (a.lieferungen || []).find((x) => x.status === "freigegeben" && x.art === "endfassung");
      if (!l) throw konflikt("Abnahme nur mit freigegebener Endfassung.");
      a.status = nach;
      a.abnahme = { am: jetzt(), vonId: n.id, von: nameVon(db, n.id), lieferungId: l.id, version: l.version, vorbehalt: v.mehrzeilig(daten.vorbehalt, 1000) };
      verlauf(db, a, n, `Abgenommen (Version ${l.version})${a.abnahme.vorbehalt ? " unter Vorbehalt" : ""}`);
      anGutachter(db, a, `Abnahme erfolgt: ${a.titel}`, "Sie können jetzt die Schlussrechnung stellen.");
    } else if (aktion === "stornieren") {
      a.status = nachStatus("stornieren");
      const grund = v.mehrzeilig(daten.grund, 1000);
      v.pflicht(grund.length >= 10, "Bitte die Stornierung begründen (mind. 10 Zeichen).");
      a.absage = { grund, am: jetzt(), seite: "bo" };
      const m = meilensteinVon(db, a.meilensteinId);
      const weitere = G(db).auftraege.some((x) => x.id !== a.id && x.gutachterId === a.gutachterId && x.meilensteinId === a.meilensteinId && AUFTRAG_OFFEN.includes(x.status));
      if (m && !weitere) m.gutachterIds = (m.gutachterIds || []).filter((g) => g !== a.gutachterId);
      verlauf(db, a, n, `Storniert: ${grund}`);
      anGutachter(db, a, `Auftrag storniert: ${a.titel}`, grund.slice(0, 160));
    } else if (aktion === "liefertermin") {
      if (wer !== "bo" || !rechteFuer(a, sicht).liefertermin) throw konflikt("Der Liefertermin lässt sich nur während der Bearbeitung ändern.");
      const lt = /^\d{4}-\d{2}-\d{2}$/.test(String(daten.liefertermin || "")) ? daten.liefertermin : "";
      if (!lt || lt < h) throw ungueltig("Bitte einen Liefertermin in der Zukunft angeben.");
      const grund = v.text(daten.grund, 300);
      v.pflicht(grund.length >= 5, "Bitte den Grund der Terminänderung angeben.");
      a.beauftragung.liefertermin = lt;
      a.erinnert = {};
      verlauf(db, a, n, `Liefertermin geändert auf ${lt}: ${grund}`);
      anGutachter(db, a, `Neuer Liefertermin: ${a.titel}`, `${lt} – ${grund}`);
    } else if (aktion === "rechnung_pruefen") {
      if (wer !== "bo") throw verboten("Rechnungen prüft ÖkoInvest.");
      const re = (a.rechnungen || []).find((x) => x.id === v.kennung(daten.rechnungId));
      if (!re) throw nichtGefunden("Rechnung nicht gefunden.");
      if (re.status !== "eingereicht") throw konflikt("Die Rechnung ist bereits geprüft.");
      const ergebnis = v.auswahl(daten.ergebnis, ["geprueft", "zurueckgewiesen"], "");
      if (!ergebnis) throw ungueltig("Bitte „sachlich richtig“ oder „zurückweisen“ wählen.");
      const kommentar = v.text(daten.kommentar, 500);
      if (ergebnis === "zurueckgewiesen") v.pflicht(kommentar.length >= 5, "Bitte den Grund der Zurückweisung angeben.");
      re.status = ergebnis;
      re.pruefung = { am: jetzt(), von: nameVon(db, n.id), kommentar };
      if (ergebnis === "zurueckgewiesen" && re.art === "schluss" && a.status === "abgerechnet") a.status = "abgenommen";
      verlauf(db, a, n, `Rechnung ${re.nummer}: ${RECHNUNG_STATUS[ergebnis].label}${kommentar ? ` – ${kommentar}` : ""}`);
      anGutachter(db, a, `Rechnung ${re.nummer}: ${RECHNUNG_STATUS[ergebnis].label}`, kommentar || a.titel, ergebnis === "zurueckgewiesen");
      if (ergebnis === "geprueft") for (const u of aktiveAdmins(db).filter((x) => darfSchreiben(x, "finanzen"))) benachrichtigen(db, u, { art: "entwicklung", titel: `Gutachter-Rechnung zur Zahlung: ${re.nummer}`, text: `${re.brutto.toLocaleString("de-DE")} € brutto, fällig ${re.faelligAm} – ${a.titel}`, link: `/portal/admin/gutachter/${a.id}`, objektArt: "gutachterauftrag", objektId: a.id }, { mail: false });
    } else if (aktion === "bewerten") {
      if (wer !== "bo" || !rechteFuer(a, sicht).bewerten) throw konflikt("Bewerten lässt sich ein Auftrag nach der Abnahme.");
      a.bewertung = { ...fach(() => bewertungBereinigen(daten.bewertung || {})), am: jetzt(), von: nameVon(db, n.id) };
      verlauf(db, a, n, `Intern bewertet (${a.bewertung.schnitt})`, false);
    } else if (aktion === "notiz") {
      if (wer !== "bo") throw verboten();
      a.notiz = v.mehrzeilig(daten.notiz, 2000);
    } else throw ungueltig("Unbekannte Aktion.");
    protokoll(db, n, `gutachter_${aktion}`, "entwicklung", a.projektId, `Gutachterauftrag ${a.id}: ${aktion}`);
    return { ok: true };
  });
  return { ...r, auftrag: await gaAuftrag(n, id) };
}

/** Datei hochladen: Lieferung (Gutachten/Plan als PDF/Bild, mit Version) oder Rechnung (PDF + Rechnungsdaten) */
export async function gaDateiSpeichern(n, id, { zweck, name, mime, daten, art = "endfassung", kommentar = "", rechnung = null } = {}) {
  angemeldet(n);
  if (!UPLOAD.typen[mime]) throw new PlattformFehler(415, "Erlaubt sind PDF, JPG und PNG.");
  const db0 = await lesenBereit();
  const a0 = auftragLaden(db0, id);
  if (sichtVon(n, a0) !== "gutachter") throw verboten("Lieferungen und Rechnungen lädt der beauftragte Gutachter hoch.");
  if (!["lieferung", "rechnung"].includes(zweck)) throw ungueltig("Unbekannter Zweck des Uploads.");
  if ((a0.dateien || []).length >= MAX_DATEIEN) throw konflikt("Für diesen Auftrag sind bereits sehr viele Dateien hinterlegt – bitte die Projektleitung kontaktieren.");
  // Vorprüfung ohne Schreiben (Datei erst nach bestandener Prüfung ablegen)
  if (zweck === "lieferung") fach(() => uebergang("liefern", { status: a0.status, wer: "gutachter" }));
  else fach(() => rechnungBereinigen(rechnung || {}, a0, { heute: heute() }));
  const datei = `GD-${neueId("GD")}-${zufallsToken().slice(0, 12)}.${UPLOAD.typen[mime]}`;
  await uploadSchreiben(datei, daten);
  const r = await aendern((db) => {
    const a = auftragLaden(db, id);
    const p = projektVon(db, a.projektId);
    const d = { id: neueId("GD"), name: v.text(String(name || "").replace(/[\\/]/g, "_"), 160) || `datei.${UPLOAD.typen[mime]}`, mime, groesse: daten.length, datei, sha256: sha256(daten), vonId: n.id, am: jetzt() };
    a.dateien = [...(a.dateien || []), d];
    if (zweck === "lieferung") {
      const nach = fach(() => uebergang("liefern", { status: a.status, wer: "gutachter" })).nach;
      for (const x of a.lieferungen || []) if (x.status === "zur_pruefung") x.status = "ersetzt";
      const l = { id: neueId("GL"), version: naechsteVersion(a.lieferungen), art: LIEFER_ARTEN[art] ? art : "endfassung", kommentar: v.text(kommentar, 500), dateiId: d.id, status: "zur_pruefung", am: jetzt() };
      a.lieferungen = [...(a.lieferungen || []), l];
      a.status = nach;
      // Anbindung Projektentwicklung: Lieferung erscheint am Meilenstein (Dokumentenakte der Projektleitung)
      const m = meilensteinVon(db, a.meilensteinId);
      if (m && db.entwicklung?.dokumente) {
        db.entwicklung.dokumente.push({ id: neueId("ED"), projektId: a.projektId, meilensteinId: m.id, pflicht: "", name: `${d.name} (Version ${l.version})`, mime, groesse: d.groesse, datei, vonId: n.id, am: jetzt(), freigabeInvestor: false, fuerGutachter: false, gutachterauftragId: a.id });
        m.eingereichtAm = jetzt();
      }
      verlauf(db, a, n, `Lieferung Version ${l.version} (${LIEFER_ARTEN[l.art]}) eingereicht`);
      anPl(db, a, `Lieferung zur Prüfung: ${a.titel}`, `Version ${l.version} (${LIEFER_ARTEN[l.art]}) – ${p?.titel || ""}`);
      return { lieferung: l };
    }
    const re = fach(() => rechnungBereinigen(rechnung || {}, a, { heute: heute() }));
    const neu = { id: neueId("GI"), ...re, dateiId: d.id, status: "eingereicht", am: jetzt() };
    a.rechnungen = [...(a.rechnungen || []), neu];
    if (re.art === "schluss") a.status = "abgerechnet";
    verlauf(db, a, n, `${re.art === "schluss" ? "Schlussrechnung" : "Abschlagsrechnung"} ${re.nummer} über ${re.brutto.toLocaleString("de-DE")} € brutto eingereicht`);
    anPl(db, a, `Rechnung eingegangen: ${re.nummer}`, `${re.brutto.toLocaleString("de-DE")} € brutto, fällig ${re.faelligAm} – ${a.titel}`);
    return { rechnung: neu };
  });
  await aendern((db) => protokoll(db, n, `gutachter_${zweck}`, "entwicklung", a0.projektId, `Gutachterauftrag ${a0.id}: ${zweck} hochgeladen`));
  return { ok: true, ...r, auftrag: await gaAuftrag(n, id) };
}

export async function gaDateiLesen(n, id, dateiId) {
  angemeldet(n);
  const db = await lesenBereit();
  const a = auftragLaden(db, id);
  sichtVon(n, a);
  const d = (a.dateien || []).find((x) => x.id === v.kennung(dateiId));
  if (!d) throw nichtGefunden("Datei nicht gefunden.");
  await aendern((x) => protokoll(x, n, "gutachter_datei_abruf", "entwicklung", a.projektId, `Gutachterauftrag ${a.id}: ${d.name} abgerufen`));
  return { name: d.name, mime: d.mime, daten: await uploadLesen(d.datei) };
}

// ================================================================ Backoffice

/** Übersicht: Aufträge (Filter Projekt/Status), Kennzahlen, Gutachterliste mit Bewertung, Fristen */
export async function gaUebersicht(n, { projektId = "", status = "" } = {}) {
  boLeseNoetig(n);
  await fristenLazy();
  const db = await lesen();
  const pid = v.kennung(projektId);
  const alle = G(db).auftraege.filter((a) => (!pid || a.projektId === pid) && (!status || a.status === status || (status === "offen" && AUFTRAG_OFFEN.includes(a.status))));
  const liste = alle.map((a) => auftragAusgabe(db, a, "bo")).sort((x, y) => String(y.geaendertAm).localeCompare(String(x.geaendertAm)));
  const gutachter = db.nutzer.filter((u) => u.aktiv && u.rollen.includes("gutachter")).map((u) => {
    const prof = (db.entwicklung?.gutachterProfile || []).find((x) => x.nutzerId === u.id);
    const eigene = G(db).auftraege.filter((a) => a.gutachterId === u.id);
    return {
      id: u.id, name: nameVon(db, u.id), firma: u.firma || "", email: u.email, fachgebiete: prof?.fachgebiete || [], fachgebieteLabel: (prof?.fachgebiete || []).map((f) => GUTACHTER_FACHGEBIETE[f] || f),
      schnitt: schnittVon(db, u.id), laufend: eigene.filter((a) => ["beauftragt", "in_arbeit", "in_pruefung", "nachbesserung", "abnahmebereit"].includes(a.status)).length, gesamt: eigene.length,
      termintreue: (() => {
        const fertig = eigene.filter((a) => a.abnahme && a.beauftragung?.liefertermin);
        return fertig.length ? Math.round((fertig.filter((a) => a.abnahme.am.slice(0, 10) <= a.beauftragung.liefertermin).length / fertig.length) * 100) : null;
      })(),
    };
  });
  const fristen = liste.flatMap((a) => a.fristen.filter((f) => f.tage <= 14).map((f) => ({ ...f, auftragId: a.id, auftrag: a.titel, gutachter: a.gutachter.name, projekt: a.projekt?.titel || "" }))).sort((x, y) => x.datum.localeCompare(y.datum));
  return {
    auftraege: liste, gutachter, fristen,
    kennzahlen: {
      offeneAnfragen: liste.filter((a) => ["angefragt", "angebot"].includes(a.status)).length,
      angeboteZuEntscheiden: liste.filter((a) => a.status === "angebot").length,
      inPruefung: liste.filter((a) => a.status === "in_pruefung").length,
      ueberfaellig: liste.filter((a) => a.ueberfaellig).length,
      rechnungenOffen: rund2(liste.reduce((s, a) => s + (a.rechnungsstand.offenBrutto || 0), 0)),
      auftragsvolumen: rund2(liste.filter((a) => a.beauftragung && a.status !== "storniert").reduce((s, a) => s + (a.angebot?.summeNetto || 0), 0)),
    },
    projekte: (db.entwicklung?.projekte || []).filter((p) => p.status !== "abgebrochen").map((p) => ({ id: p.id, titel: p.titel, land: p.land, meilensteine: (db.entwicklung.meilensteine || []).filter((m) => m.projektId === p.id && !["erledigt", "entfaellt"].includes(m.status)).sort((x, y) => (x.reihenfolge ?? 0) - (y.reihenfolge ?? 0)).map((m) => ({ id: m.id, titel: m.titel, kategorie: m.kategorie, gutachten: !!m.gutachten })) })),
    fachgebiete: GUTACHTER_FACHGEBIETE,
    darfSchreiben: boSchreiben(n),
  };
}

/** Leistungsanfrage anlegen: ein Auftrag je gewähltem Gutachter (gemeinsame Gruppe für den Angebotsvergleich) */
export async function gaAnfrageAnlegen(n, daten = {}) {
  boSchreibNoetig(n);
  const ids = [...new Set((Array.isArray(daten.gutachterIds) ? daten.gutachterIds : []).map((x) => v.kennung(x)).filter(Boolean))];
  v.pflicht(ids.length >= 1 && ids.length <= 8, "Bitte einen bis acht Gutachter wählen (für einen Angebotsvergleich meist drei).");
  const a0 = fach(() => anfrageBereinigen(daten, { heute: heute(), fachgebiete: Object.keys(GUTACHTER_FACHGEBIETE) }));
  return aendernBereit((db) => {
    const p = projektVon(db, v.kennung(daten.projektId));
    if (!p) throw nichtGefunden("Entwicklungsprojekt nicht gefunden.");
    if (["abgebrochen", "abgeschlossen"].includes(p.status)) throw konflikt("Das Projekt ist nicht mehr aktiv.");
    const m = daten.meilensteinId ? meilensteinVon(db, v.kennung(daten.meilensteinId)) : null;
    if (daten.meilensteinId && (!m || m.projektId !== p.id)) throw nichtGefunden("Meilenstein nicht gefunden.");
    const gruppe = neueId("GG");
    const neu = [];
    for (const gid of ids) {
      const u = nutzerById(db, gid);
      if (!u || !u.aktiv || !u.rollen.includes("gutachter")) throw ungueltig("Anfragen gehen nur an Konten mit der Rolle Gutachter/Planer (neue Büros bitte zuerst einladen).");
      if (G(db).auftraege.some((x) => x.gutachterId === gid && x.projektId === p.id && x.meilensteinId === (m?.id || null) && AUFTRAG_OFFEN.includes(x.status) && x.fachgebiet === a0.fachgebiet)) throw konflikt(`${nameVon(db, gid)} hat zu dieser Leistung bereits eine offene Anfrage bzw. einen Auftrag.`);
      const a = { id: neueId("GA"), gruppe, projektId: p.id, meilensteinId: m?.id || null, gutachterId: gid, verantwortlichId: n.id, ...a0, status: "angefragt", angebot: null, beauftragung: null, termine: [], berichte: [], lieferungen: [], rueckfragen: [], rechnungen: [], dateien: [], bewertung: null, abnahme: null, erinnert: {}, verlauf: [], erstelltAm: jetzt(), geaendertAm: jetzt() };
      verlauf(db, a, n, `Angebot angefragt, Frist ${a.angebotsfrist}`);
      G(db).auftraege.push(a);
      anGutachter(db, a, `Neue Angebotsanfrage: ${a.titel}`, `${p.titel} – Angebotsfrist ${a.angebotsfrist.split("-").reverse().join(".")}`);
      neu.push(a.id);
    }
    protokoll(db, n, "gutachter_anfrage", "entwicklung", p.id, `Gutachter-Anfrage „${a0.titel}“ an ${ids.length} Büro(s)`);
    return { ok: true, gruppe, ids: neu };
  });
}

/** Zahlung einer geprüften Rechnung buchen (Buchhaltung) – Ist-Kosten am Entwicklungsprojekt (Kostenart „Planung & Gutachten“) */
export async function gaZahlung(n, id, { rechnungId, datum = "", betrag = null } = {}) {
  angemeldet(n);
  if (!finSchreiben(n)) throw verboten("Zahlungen bucht die Buchhaltung (Bereich „Finanzen & Abrechnung“).");
  const r = await aendernBereit((db) => {
    const a = auftragLaden(db, id);
    const re = (a.rechnungen || []).find((x) => x.id === v.kennung(rechnungId));
    if (!re) throw nichtGefunden("Rechnung nicht gefunden.");
    if (re.status !== "geprueft") throw konflikt(re.status === "bezahlt" ? "Die Rechnung ist bereits bezahlt." : "Nur sachlich geprüfte Rechnungen können bezahlt werden.");
    const am = /^\d{4}-\d{2}-\d{2}$/.test(String(datum || "")) ? datum : heute();
    if (am > heute()) throw ungueltig("Das Zahlungsdatum darf nicht in der Zukunft liegen.");
    const b = v.zahl(betrag, { min: 0.01, max: 1e8, stellen: 2 }) ?? re.brutto;
    if (Math.abs(b - re.brutto) > 0.01) throw ungueltig(`Der Zahlbetrag weicht vom Rechnungsbetrag (${re.brutto.toLocaleString("de-DE")} €) ab – Teilzahlungen bitte in der Buchhaltung klären.`);
    re.status = "bezahlt";
    re.zahlung = { am, betrag: b, von: nameVon(db, n.id) };
    // Anbindung Finanzen: Ist-Kosten (netto) am Kostenträger = Entwicklungsprojekt; im Betrieb Purchase Invoice + Payment Entry in ERPNext
    if (Array.isArray(db.finanzen?.kosten)) db.finanzen.kosten.push({ id: neueId("PK"), projektId: a.projektId, kostenart: "planung", betrag: re.netto, datum: am, beleg: re.nummer, beschreibung: `${nameVon(db, a.gutachterId)}: ${a.titel}`.slice(0, 200), quelle: "Eingangsrechnung Gutachter", erstelltAm: jetzt(), vonId: n.id, gutachterauftragId: a.id });
    const stand = rechnungsStand(a, heute());
    if (a.status === "abgerechnet" && stand.schlussVorhanden && stand.offenBrutto <= 0.01) a.status = "abgeschlossen";
    verlauf(db, a, n, `Zahlung ${re.nummer}: ${b.toLocaleString("de-DE")} € am ${am}`);
    anGutachter(db, a, `Zahlung angewiesen: ${re.nummer}`, `${b.toLocaleString("de-DE")} € am ${am.split("-").reverse().join(".")}`);
    protokoll(db, n, "gutachter_zahlung", "finanzen", a.projektId, `Gutachter-Rechnung ${re.nummer} bezahlt (${b} €)`);
    return { ok: true };
  });
  return { ...r, auftrag: await gaAuftrag(n, id) };
}

/** Daten für Auftragsbestätigung bzw. Abnahmeprotokoll (PDF) – Backoffice oder eigener Gutachter */
export async function gaPdfDaten(n, id, { art = "auftrag" } = {}) {
  angemeldet(n);
  const db = await lesenBereit();
  const a = auftragLaden(db, id);
  const sicht = sichtVon(n, a);
  if (art === "auftrag" && !a.beauftragung) throw konflikt("Der Auftrag ist noch nicht erteilt.");
  if (art === "abnahme" && !a.abnahme) throw konflikt("Der Auftrag ist noch nicht abgenommen.");
  const u = nutzerById(db, a.gutachterId);
  await aendern((x) => protokoll(x, n, "gutachter_pdf", "entwicklung", a.projektId, `Gutachterauftrag ${a.id}: ${art === "auftrag" ? "Auftragsbestätigung" : "Abnahmeprotokoll"} (PDF)`));
  return { art, auftrag: auftragAusgabe(db, a, sicht, { voll: true }), gutachter: { name: nameVon(db, a.gutachterId), firma: u?.firma || "", email: u?.email || "" }, ersteller: nameVon(db, n.id) || n.email };
}

// ================================================================ Fristen (Frappe: Scheduler täglich)

/** Erinnerungen: Angebotsfrist (2 Tage vorher), Liefertermin (7 Tage vorher, Verzug), Termine (Vortag), Zahlungsziel (Buchhaltung) */
export async function gaFristen(n = null) {
  if (n) boLeseNoetig(n);
  return aendernBereit((db) => fristenLauf(db));
}
function fristenLauf(db) {
  const h = heute();
  let anzahl = 0;
  for (const a of G(db).auftraege.filter((x) => AUFTRAG_OFFEN.includes(x.status))) {
    a.erinnert ||= {};
    for (const f of auftragFristen(a, h)) {
      const schluessel = `${f.art}:${f.id || ""}:${f.datum}:${f.ueberfaellig ? "v" : "a"}`;
      const faellig = f.art === "angebotsfrist" ? f.tage <= 2 : f.art === "liefertermin" ? f.tage <= 7 : f.art === "termin" ? f.tage <= 1 : f.art === "zahlung" ? f.tage <= 3 : false;
      if (!faellig || a.erinnert[schluessel]) continue;
      a.erinnert[schluessel] = h;
      const titel = `${f.ueberfaellig ? "Überfällig" : `Frist ${f.tage <= 0 ? "heute" : `in ${f.tage} Tag${f.tage === 1 ? "" : "en"}`}`}: ${f.text} – ${a.titel}`;
      if (f.art !== "zahlung") anGutachter(db, a, titel, `Datum ${f.datum.split("-").reverse().join(".")}`);
      if (f.art !== "angebotsfrist" || f.ueberfaellig) anPl(db, a, titel, `${nameVon(db, a.gutachterId)} – ${f.datum.split("-").reverse().join(".")}`, f.ueberfaellig);
      if (f.art === "zahlung") for (const u of aktiveAdmins(db).filter((x) => darfSchreiben(x, "finanzen"))) benachrichtigen(db, u, { art: "entwicklung", titel, text: `Gutachter-Rechnung – ${a.titel}`, link: `/portal/admin/gutachter/${a.id}`, objektArt: "gutachterauftrag", objektId: a.id }, { mail: false });
      anzahl++;
    }
  }
  G(db).fristenAm = h;
  return { erinnerungen: anzahl, geprueftAm: h };
}
async function fristenLazy() {
  const db = await lesenBereit();
  if (G(db).fristenAm === heute()) return;
  await aendern((d) => {
    if (d.gutachterauftraege?.fristenAm === heute()) return;
    fristenLauf(d);
  });
}

/** Zähler für Navigation/Übersicht: offene Anfragen und Aufgaben des Gutachters */
export async function gaZaehler(n) {
  if (!n?.rollen?.includes("gutachter")) return { offen: 0 };
  const db = await lesen();
  if (!db.gutachterauftraege?.v) return { offen: 0 };
  return { offen: G(db).auftraege.filter((a) => a.gutachterId === n.id && ["angefragt", "beauftragt", "nachbesserung"].includes(a.status)).length };
}

// ================================================================ Demo-Daten (fiktiv)

const DEMO_PDF = Buffer.from("%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj\n3 0 obj<</Type/Page/Parent 2 0 R/MediaBox[0 0 595 842]>>endobj\ntrailer<</Root 1 0 R>>\n%%EOF\n");

async function seed(db) {
  const g = db.nutzer.find((u) => u.email === "gutachter@example.com");
  const pl = db.nutzer.find((u) => u.email === "bo-projektleitung@example.com") || db.nutzer.find((u) => u.email === "admin@example.com");
  if (!g || !pl || !db.entwicklung?.projekte?.length) return;
  const proj = (t) => db.entwicklung.projekte.find((p) => p.titel === t);
  const ms = (p, s) => (p ? db.entwicklung.meilensteine.find((m) => m.projektId === p.id && m.schluessel === s) : null);
  const tag = (d) => plusTage(heute(), d);
  const basis = (p, m, x) => ({
    id: neueId("GA"), gruppe: neueId("GG"), projektId: p.id, meilensteinId: m?.id || null, gutachterId: g.id, verantwortlichId: pl.id, hinweise: "", wunschtermin: "",
    termine: [], berichte: [], lieferungen: [], rueckfragen: [], rechnungen: [], dateien: [], bewertung: null, abnahme: null, absage: null, erinnert: {}, verlauf: [], notiz: "", erstelltAm: vorTagen(x.alter || 30), geaendertAm: vorTagen(2), ...x,
  });
  const angebot = (x) => ({ ...angebotBereinigen({ honorarArt: "pauschal", nebenkostenPct: 5, ustPct: 19, zahlungszielTage: 30, ...x }, { land: "DE" }), am: vorTagen(100), version: 1 });
  const datei = async (a, name) => {
    const dn = `GD-${neueId("GD")}-${zufallsToken().slice(0, 12)}.pdf`;
    await uploadSchreiben(dn, DEMO_PDF);
    const d = { id: neueId("GD"), name, mime: "application/pdf", groesse: DEMO_PDF.length, datei: dn, sha256: sha256(DEMO_PDF), vonId: g.id, am: vorTagen(20) };
    a.dateien.push(d);
    return d;
  };
  const v0 = (a, text, tage, extern = true) => a.verlauf.push({ am: vorTagen(tage), von: "Demo", text, extern });

  // 1) Mühlweg – Artenschutz (saP): beauftragt, in Nachbesserung, Abschlag bezahlt, Begehung geplant
  const pM = proj("Solarpark Mühlweg (Demo)");
  const mA = ms(pM, "gutachten_artenschutz");
  if (pM) {
    const a = basis(pM, mA, { titel: "Spezielle artenschutzrechtliche Prüfung (saP)", fachgebiet: "artenschutz", alter: 150, angebotsfrist: tag(-130), leistung: "Brutvogelkartierung (6 Begehungen März–Juni, Schwerpunkt Feldlerche/Rebhuhn), Habitatpotenzialanalyse Zauneidechse, saP-Bericht mit Maßnahmenkonzept (CEF, Lerchenfenster), Abstimmung mit der unteren Naturschutzbehörde." });
    a.angebot = angebot({ honorarNetto: 18500, abschlagPct: 30, liefertermin: tag(40), termineVorschlag: "Begehungen ab Mitte März nach Witterung" });
    a.beauftragung = { am: vorTagen(120), vonId: pl.id, von: nameVon(db, pl.id), nummer: `GA-2026-${a.id.slice(-6)}`, liefertermin: tag(40), bedingungen: "Vertraulichkeit nach Nutzungsbedingungen § 12; Nutzungsrecht am Gutachten für das Genehmigungsverfahren und die Finanzierung.", summeNetto: a.angebot.summeNetto, bestaetigtAm: vorTagen(118), bestaetigtVon: nameVon(db, g.id) };
    a.termine.push({ id: neueId("GT"), art: "begehung", datum: tag(-60), uhrzeit: "06:00", ort: "Treffpunkt Feldweg Nord (fiktiv)", notiz: "Brutvogelkartierung Durchgang 4", status: "erledigt", protokoll: "4 Reviere Feldlerche (fiktiv)", vonSeite: "gutachter", vonId: g.id, am: vorTagen(70) });
    a.termine.push({ id: neueId("GT"), art: "besprechung", datum: tag(10), uhrzeit: "10:00", ort: "Videokonferenz", notiz: "Abstimmung Maßnahmenkonzept mit der UNB", status: "vorgeschlagen", vonSeite: "gutachter", vonId: g.id, am: vorTagen(3) });
    a.berichte.push({ id: neueId("GB"), text: "Kartierung abgeschlossen, Auswertung läuft. Vier Feldlerchen-Reviere im Plangebiet (fiktiv).", fortschritt: 60, am: vorTagen(30) });
    const d1 = await datei(a, "saP-Entwurf-Muehlweg.pdf");
    a.lieferungen.push({ id: neueId("GL"), version: 1, art: "entwurf", kommentar: "Entwurf zur Abstimmung", dateiId: d1.id, status: "maengel", am: vorTagen(12), maengel: [{ id: neueId("GM"), text: "Ausgleichsflächen im Süden ergänzen", erledigt: false }, { id: neueId("GM"), text: "Kartendarstellung der Reviere im Maßstab 1:5.000", erledigt: false }], pruefung: { am: vorTagen(8), von: nameVon(db, pl.id), kommentar: "Bitte vor der UNB-Abstimmung ergänzen." } });
    const d2 = await datei(a, "Abschlagsrechnung-2026-041.pdf");
    const re = { ...rechnungBereinigen({ art: "abschlag", nummer: "2026-041", datum: tag(-90), leistungVon: tag(-118), leistungBis: tag(-90), netto: 5827.5, ustPct: 19 }, { status: "in_arbeit", angebot: a.angebot, rechnungen: [] }), id: neueId("GI"), dateiId: d2.id, status: "bezahlt", am: vorTagen(90), pruefung: { am: vorTagen(85), von: nameVon(db, pl.id), kommentar: "" }, zahlung: { am: tag(-70), betrag: 6934.73, von: "Buchhaltung (Demo)" } };
    re.zahlung.betrag = re.brutto;
    a.rechnungen.push(re);
    a.rueckfragen.push({ id: neueId("GR"), seite: "gutachter", vonId: g.id, text: "Dürfen wir die Ausgleichsfläche Flur 7 schon begehen?", am: vorTagen(6), antwortAuf: null, beantwortet: true });
    a.rueckfragen.push({ id: neueId("GR"), seite: "bo", vonId: pl.id, text: "Ja, der Eigentümer ist informiert (Demo).", am: vorTagen(5), antwortAuf: a.rueckfragen[0].id });
    a.status = "nachbesserung";
    v0(a, "Angebot abgegeben", 140);
    v0(a, "Beauftragt", 120);
    v0(a, "Mängel zu Version 1: 2 Punkt(e)", 8);
    G(db).auftraege.push(a);
  }

  // 2) Batteriespeicher – Schallgutachten: offene Angebotsanfrage
  const pS = proj("Batteriespeicher Umspannwerk Nord (Demo)");
  if (pS) {
    const a = basis(pS, ms(pS, "gutachten_schall"), { titel: "Schallimmissionsprognose nach TA Lärm", fachgebiet: "schall", alter: 4, angebotsfrist: tag(6), wunschtermin: tag(60), leistung: "Schallimmissionsprognose für 20 MW / 40 MWh Batteriespeicher mit Wechselrichtern und Trafos nach TA Lärm (Tag/Nacht), Immissionsorte nächste Wohnbebauung, Variantenvergleich Einhausung, Bericht für den Bauantrag.", hinweise: "Herstellerdatenblätter der Komponenten folgen nach Beauftragung." });
    v0(a, `Angebot angefragt, Frist ${a.angebotsfrist}`, 4);
    G(db).auftraege.push(a);
  }

  // 3) Randstreifen – Landschaftspflegerischer Begleitplan: abgeschlossen, bezahlt, bewertet
  const pR = proj("Solarpark Randstreifen Autobahn (Demo)");
  if (pR) {
    const a = basis(pR, ms(pR, "gutachten_landschaft"), { titel: "Landschaftspflegerischer Begleitplan", fachgebiet: "landschaft", alter: 700, angebotsfrist: tag(-690), leistung: "Bestandsaufnahme Landschaftsbild, Eingriffs-/Ausgleichsbilanz, Eingrünungskonzept, Pflanzliste, Plan 1:2.500." });
    a.angebot = { ...angebot({ honorarNetto: 9800, abschlagPct: 0, liefertermin: tag(-560) }), am: vorTagen(690) };
    a.beauftragung = { am: vorTagen(680), vonId: pl.id, von: nameVon(db, pl.id), nummer: `GA-2024-${a.id.slice(-6)}`, liefertermin: tag(-560), bedingungen: "", summeNetto: a.angebot.summeNetto, bestaetigtAm: vorTagen(679), bestaetigtVon: nameVon(db, g.id) };
    const d1 = await datei(a, "LBP-Randstreifen-Endfassung.pdf");
    a.lieferungen.push({ id: neueId("GL"), version: 1, art: "endfassung", kommentar: "", dateiId: d1.id, status: "freigegeben", am: vorTagen(570), pruefung: { am: vorTagen(565), von: nameVon(db, pl.id), kommentar: "" } });
    a.abnahme = { am: vorTagen(565), vonId: pl.id, von: nameVon(db, pl.id), lieferungId: a.lieferungen[0].id, version: 1, vorbehalt: "" };
    const d2 = await datei(a, "Schlussrechnung-2024-118.pdf");
    const re = { ...rechnungBereinigen({ art: "schluss", nummer: "2024-118", datum: tag(-560), leistungVon: tag(-680), leistungBis: tag(-565), netto: a.angebot.summeNetto, ustPct: 19 }, { status: "abgenommen", angebot: a.angebot, rechnungen: [] }), id: neueId("GI"), dateiId: d2.id, status: "bezahlt", am: vorTagen(560), zahlung: { am: tag(-540), betrag: 0, von: "Buchhaltung (Demo)" } };
    re.zahlung.betrag = re.brutto;
    a.rechnungen.push(re);
    a.bewertung = { ...bewertungBereinigen({ qualitaet: 5, termintreue: 4, kommunikation: 5, preisLeistung: 4, kommentar: "Sauberer Plan, Behörde ohne Nachforderung (fiktiv)." }), am: vorTagen(530), von: nameVon(db, pl.id) };
    a.status = "abgeschlossen";
    G(db).auftraege.push(a);
  }

  // 4) Altdepot – Umweltbericht: abgerechnet, Schlussrechnung geprüft, Zahlung überfällig
  const pA = proj("Solarpark Altdepot (Demo)");
  if (pA) {
    const a = basis(pA, ms(pA, "umweltbericht"), { titel: "Umweltbericht zum Bebauungsplan", fachgebiet: "umwelt", alter: 400, angebotsfrist: tag(-390), leistung: "Umweltbericht nach § 2a BauGB inkl. Eingriffsregelung und Monitoringkonzept." });
    a.angebot = { ...angebot({ honorarNetto: 14200, abschlagPct: 0, liefertermin: tag(-80), zahlungszielTage: 30 }), am: vorTagen(390) };
    a.beauftragung = { am: vorTagen(380), vonId: pl.id, von: nameVon(db, pl.id), nummer: `GA-2025-${a.id.slice(-6)}`, liefertermin: tag(-80), bedingungen: "", summeNetto: a.angebot.summeNetto, bestaetigtAm: vorTagen(379), bestaetigtVon: nameVon(db, g.id) };
    const d1 = await datei(a, "Umweltbericht-Altdepot.pdf");
    a.lieferungen.push({ id: neueId("GL"), version: 1, art: "endfassung", kommentar: "", dateiId: d1.id, status: "freigegeben", am: vorTagen(90), pruefung: { am: vorTagen(85), von: nameVon(db, pl.id), kommentar: "" } });
    a.abnahme = { am: vorTagen(84), vonId: pl.id, von: nameVon(db, pl.id), lieferungId: a.lieferungen[0].id, version: 1, vorbehalt: "" };
    const d2 = await datei(a, "Schlussrechnung-2026-077.pdf");
    a.rechnungen.push({ ...rechnungBereinigen({ art: "schluss", nummer: "2026-077", datum: tag(-35), leistungVon: tag(-380), leistungBis: tag(-84), netto: a.angebot.summeNetto, ustPct: 19 }, { status: "abgenommen", angebot: a.angebot, rechnungen: [] }), id: neueId("GI"), dateiId: d2.id, status: "geprueft", am: vorTagen(35), pruefung: { am: vorTagen(30), von: nameVon(db, pl.id), kommentar: "" } });
    a.bewertung = { ...bewertungBereinigen({ qualitaet: 4, termintreue: 3, kommunikation: 4, preisLeistung: 4, kommentar: "Abgabe zwei Wochen später als vereinbart (fiktiv)." }), am: vorTagen(60), von: nameVon(db, pl.id) };
    a.status = "abgerechnet";
    G(db).auftraege.push(a);
  }
}
