// src/lib/plattform/backend/demo/service-hr.js
//
// HR & interne Steuerung im Demo-Backend – Referenz für plattform/api/hr.py (docs/API.md, Abschnitt „Dokumente, Signatur, Termine, Service & HR“).
//   Team-Übersicht (Backoffice-Konten ↔ Mitarbeiter/Employee, Gebiete aus der Akquise, Auslastung),
//   Abwesenheiten → automatische Vertretung (Aufgaben, Termine, Tickets; Hinweis-Aufgabe für Zuweisungen),
//   Zeiterfassung auf Projekte (Schnittstelle Projektentwicklung/Finanzen), interne Wissensdatenbank, Integrationsstatus.
//
// Rechte: nur Backoffice (Rolle admin).
//   team   – lesen ≥ 1: Team, Abwesenheiten, Zeiten aller; schreiben = 2 (Leitung): Mitarbeiterdaten, Abwesenheiten anderer.
//            Eigene Abwesenheit und eigene Zeiten erfasst jedes Backoffice-Konto selbst.
//   wissen – lesen ≥ 1: alle Artikel; schreiben = 2: anlegen/ändern/löschen. Für Portal-Konten (Kunden) nie sichtbar.

import { konflikt, nichtGefunden, verboten } from "../../fehler";
import * as v from "../../validierung";
import { darfLesen } from "../../rechte";
import {
  ABWESENHEIT_ARTEN, ABWESENHEIT_ART_IDS, HR_GRENZEN, TAETIGKEITEN, TAETIGKEIT_IDS, WISSEN_KATEGORIEN, WISSEN_KATEGORIE_IDS, abwesenheitAm, auslastung, tageZwischen,
  vertretungFinden, wissenTreffer, zeitenSummieren,
} from "../../hr";
import { TERMIN_AKTIV, heuteTag, tagGueltig, tagPlus } from "../../termine";
import { TICKET_OFFEN } from "../../tickets";
import { jetzt, neueId } from "./hilfen";
import { termineVertreten } from "./service-termine";
import { angemeldet, aendernBereit, backofficeKonten, boLesen, boSchreiben, istAdmin, kontoKurz, lesenBereit, melden, nameVon, nutzerById, protokoll, schreibNoetig } from "./service-kern";

const adminNoetig = (n) => {
  angemeldet(n);
  if (!istAdmin(n)) throw verboten("Nur für das Backoffice.");
};

// ================================================================ Team

function mitarbeiterZeile(db, n, u) {
  const m = db.service.mitarbeiter[u.id] || {};
  const heute = heuteTag();
  const in7 = tagPlus(heute, 7);
  const ab = db.service.abwesenheiten.filter((a) => a.mitarbeiterId === u.id && a.status !== "abgelehnt" && a.bis >= heute).sort((a, b) => a.von.localeCompare(b.von));
  const termineWoche = db.service.termine.filter((t) => t.mitarbeiterId === u.id && TERMIN_AKTIV.includes(t.status) && t.start.slice(0, 10) >= heute && t.start.slice(0, 10) <= in7);
  const aufgabenOffen = (db.aufgaben || []).filter((a) => a.zustaendigId === u.id && a.status === "offen").length;
  const ticketsOffen = db.service.tickets.filter((t) => t.zustaendigId === u.id && TICKET_OFFEN.includes(t.status)).length;
  const signaturenOffen = db.service.signaturen.filter((s) => s.erstellerId === u.id && s.status === "laufend").length;
  const abwesendeTage = ab.reduce((s, a) => {
    const von = a.von > heute ? a.von : heute;
    const bis = a.bis < in7 ? a.bis : in7;
    return s + (bis >= von ? Math.min(5, tageZwischen(von, bis)) : 0);
  }, 0);
  const monat = heute.slice(0, 7);
  const stundenMonat = db.service.zeiten.filter((z) => z.kontoId === u.id && z.datum.startsWith(monat)).reduce((s, z) => s + z.stunden, 0);
  return {
    id: u.id, name: nameVon(db, u.id), email: u.email, backofficeRollen: u.backofficeRollen || ["leitung"], funktion: m.funktion || "", employeeId: m.employeeId || "",
    vertretung: kontoKurz(db, m.vertretungId), kapazitaetStunden: m.kapazitaetStunden ?? 38.5, aktiv: m.aktiv !== false,
    gebiete: (db.bo?.gebiete || []).filter((g) => g.mitarbeiterId === u.id && g.aktiv !== false).map((g) => ({ id: g.id, name: g.name })),
    abwesendHeute: abwesenheitAm(db.service.abwesenheiten, u.id, heute) ? true : false,
    abwesenheiten: ab.slice(0, 5).map((a) => ({ id: a.id, von: a.von, bis: a.bis, art: a.art, artLabel: ABWESENHEIT_ARTEN[a.art], vertretung: kontoKurz(db, a.vertretungId) })),
    last: { termine: termineWoche.length, terminMinuten: termineWoche.reduce((s, t) => s + (new Date(t.ende) - new Date(t.start)) / 60e3, 0), aufgabenOffen, ticketsOffen, signaturenOffen },
    auslastung: auslastung({ kapazitaetStunden: m.kapazitaetStunden ?? 38.5, terminMinuten: termineWoche.reduce((s, t) => s + (new Date(t.ende) - new Date(t.start)) / 60e3, 0), aufgabenOffen, ticketsOffen, signaturenOffen, abwesendeTage }),
    stundenMonat: Math.round(stundenMonat * 100) / 100,
    ich: u.id === n.id,
  };
}

export async function team(n) {
  adminNoetig(n);
  const db = await lesenBereit();
  const alle = darfLesen(n, "team");
  const konten = backofficeKonten(db).filter((u) => alle || u.id === n.id);
  return {
    mitarbeiter: konten.map((u) => mitarbeiterZeile(db, n, u)).sort((a, b) => a.name.localeCompare(b.name, "de")),
    darfBearbeiten: boSchreiben(n, "team"),
    integration: { hrms: false, hinweis: "Demo ohne HRMS: Mitarbeiter, Abwesenheiten und Zeiten werden in der Plattform geführt. Mit HRMS: Employee, Leave Application, Holiday List und Timesheet (siehe docs/API.md, Abschnitt „Dokumente, Signatur, Termine, Service & HR“)." },
  };
}

export async function mitarbeiterSpeichern(n, kontoId, daten = {}) {
  schreibNoetig(n, "team", "Team & HR");
  return aendernBereit((db) => {
    const u = nutzerById(db, v.kennung(kontoId));
    v.pflicht(u && u.rollen.includes("admin"), "Nur Backoffice-Konten sind Mitarbeiter.");
    const m = (db.service.mitarbeiter[u.id] ||= {});
    if (daten.funktion !== undefined) m.funktion = v.text(daten.funktion, 80);
    if (daten.employeeId !== undefined) {
      const e = v.text(daten.employeeId, 40);
      v.pflicht(!e || /^[A-Za-z0-9._/-]{2,40}$/.test(e), "Die Employee-ID (HRMS) enthält ungültige Zeichen.");
      m.employeeId = e;
    }
    if (daten.kapazitaetStunden !== undefined) m.kapazitaetStunden = v.zahl(daten.kapazitaetStunden, { min: 0, max: 60 }) ?? 38.5;
    if (daten.aktiv !== undefined) m.aktiv = !!daten.aktiv;
    if (daten.vertretungId !== undefined) {
      const z = daten.vertretungId ? nutzerById(db, v.kennung(daten.vertretungId)) : null;
      if (daten.vertretungId) v.pflicht(z && z.aktiv && z.rollen.includes("admin") && z.id !== u.id, "Vertretung muss ein anderes, aktives Backoffice-Konto sein.");
      m.vertretungId = z?.id || null;
    }
    protokoll(db, n, "team", "nutzer", u.id, `Mitarbeiterdaten von ${nameVon(db, u.id)} gespeichert`);
    return mitarbeiterZeile(db, n, u);
  });
}

// ================================================================ Abwesenheiten & Vertretung

export async function abwesenheiten(n, { von = "", bis = "", kontoId = "" } = {}) {
  adminNoetig(n);
  const db = await lesenBereit();
  const alle = darfLesen(n, "team");
  return db.service.abwesenheiten
    .filter((a) => (alle ? true : a.mitarbeiterId === n.id))
    .filter((a) => !kontoId || a.mitarbeiterId === kontoId)
    .filter((a) => (!tagGueltig(von) || a.bis >= von) && (!tagGueltig(bis) || a.von <= bis))
    .sort((a, b) => a.von.localeCompare(b.von))
    .map((a) => ({ ...a, mitarbeiter: kontoKurz(db, a.mitarbeiterId), vertretung: kontoKurz(db, a.vertretungId), artLabel: ABWESENHEIT_ARTEN[a.art] || a.art }));
}

/** Offene Aufgaben, Termine und Tickets im Zeitraum an die Vertretung übergeben (innerhalb von aendern) */
function vertretungAnwenden(db, n, abw) {
  const ergebnis = { aufgaben: 0, termine: 0, tickets: 0, hinweis: false };
  const ziel = (tag) => vertretungFinden({ mitarbeiterId: abw.mitarbeiterId, tag, abwesenheiten: db.service.abwesenheiten, mitarbeiter: db.service.mitarbeiter });
  for (const a of db.aufgaben || []) {
    if (a.zustaendigId !== abw.mitarbeiterId || a.status !== "offen" || !a.faelligAm) continue;
    if (a.faelligAm < abw.von || a.faelligAm > abw.bis) continue;
    const z = ziel(a.faelligAm);
    if (!z || z.id === abw.mitarbeiterId) continue;
    a.vertretungFuerId = abw.mitarbeiterId;
    a.zustaendigId = z.id;
    ergebnis.aufgaben++;
    melden(db, z.id, { art: "aufgabe", titel: `Vertretung: ${a.titel}`, text: `für ${nameVon(db, abw.mitarbeiterId)} (abwesend bis ${abw.bis.split("-").reverse().join(".")})`, link: "/portal/admin/aufgaben?ansicht=meine", objektArt: a.bezugArt || "aufgabe", objektId: a.bezugId || a.id });
  }
  ergebnis.termine = termineVertreten(db, n, abw);
  const heute = heuteTag();
  if (abw.von <= heute && heute <= abw.bis) {
    for (const t of db.service.tickets) {
      if (t.zustaendigId !== abw.mitarbeiterId || !TICKET_OFFEN.includes(t.status)) continue;
      const z = ziel(heute);
      if (!z || z.id === abw.mitarbeiterId) continue;
      t.zustaendigId = z.id;
      t.verlauf.push({ am: jetzt(), text: `Vertretung wegen Abwesenheit von ${nameVon(db, abw.mitarbeiterId)}`, vonId: n.id });
      ergebnis.tickets++;
    }
  }
  // Zuweisungen (Vorgänge/Flächen) bleiben beim Verantwortlichen – die Vertretung bekommt eine Hinweis-Aufgabe
  const zuweisungen = [...(db.vorgaenge || []), ...(db.flaechen || [])].filter((o) => o.zustaendigId === abw.mitarbeiterId && !["abgeschlossen", "abgelehnt", "zurueckgezogen", "vertrag"].includes(o.status)).length;
  const zv = ziel(abw.von);
  if (zuweisungen && zv && zv.id !== abw.mitarbeiterId) {
    db.aufgaben = db.aufgaben || [];
    db.aufgaben.push({ id: neueId("AF"), titel: `Vertretung ${nameVon(db, abw.mitarbeiterId)}: ${zuweisungen} offene Zuweisungen im Blick behalten`, beschreibung: `Abwesenheit ${abw.von.split("-").reverse().join(".")}–${abw.bis.split("-").reverse().join(".")}. Neue Nachrichten zu diesen Vorgängen und Flächen bitte vertretungsweise beantworten.`, faelligAm: abw.von, zustaendigId: zv.id, bezugArt: null, bezugId: null, status: "offen", erstelltVon: n.id, erstelltAm: jetzt(), erledigtAm: null, erledigtVon: null, erinnertAm: null, vertretungFuerId: abw.mitarbeiterId });
    ergebnis.hinweis = true;
  }
  return ergebnis;
}

export async function abwesenheitAnlegen(n, daten = {}) {
  adminNoetig(n);
  const von = String(daten.von || "");
  const bis = String(daten.bis || daten.von || "");
  v.pflicht(tagGueltig(von) && tagGueltig(bis) && bis >= von, "Bitte geben Sie einen gültigen Zeitraum an (von ≤ bis).");
  v.pflicht(tageZwischen(von, bis) <= HR_GRENZEN.abwesenheitTageMax, `Höchstens ${HR_GRENZEN.abwesenheitTageMax} Tage je Eintrag.`);
  const art = v.auswahl(daten.art, ABWESENHEIT_ART_IDS, "urlaub");
  return aendernBereit((db) => {
    const kontoId = v.kennung(daten.mitarbeiterId) || n.id;
    if (kontoId !== n.id && !boSchreiben(n, "team")) throw verboten("Abwesenheiten anderer erfasst nur die Leitung.");
    const u = nutzerById(db, kontoId);
    v.pflicht(u && u.rollen.includes("admin"), "Nur für Backoffice-Konten.");
    const ueberschneidung = db.service.abwesenheiten.find((a) => a.mitarbeiterId === kontoId && a.status !== "abgelehnt" && a.von <= bis && von <= a.bis);
    if (ueberschneidung) throw konflikt("Für diesen Zeitraum ist bereits eine Abwesenheit eingetragen.");
    const vz = daten.vertretungId ? nutzerById(db, v.kennung(daten.vertretungId)) : null;
    if (daten.vertretungId) v.pflicht(vz && vz.aktiv && vz.rollen.includes("admin") && vz.id !== kontoId, "Vertretung muss ein anderes, aktives Backoffice-Konto sein.");
    const abw = { id: neueId("AB"), mitarbeiterId: kontoId, von, bis, art, vertretungId: vz?.id || db.service.mitarbeiter[kontoId]?.vertretungId || null, status: "genehmigt", quelle: "plattform", bemerkung: v.text(daten.bemerkung, 200), erstelltAm: jetzt(), erstelltVon: n.id };
    db.service.abwesenheiten.push(abw);
    const ergebnis = vertretungAnwenden(db, n, abw);
    protokoll(db, n, "team", "nutzer", kontoId, `Abwesenheit ${von}–${bis} (${ABWESENHEIT_ARTEN[art]}) – Vertretung: ${ergebnis.aufgaben} Aufgaben, ${ergebnis.termine} Termine, ${ergebnis.tickets} Tickets`);
    return { abwesenheit: { ...abw, mitarbeiter: kontoKurz(db, kontoId), vertretung: kontoKurz(db, abw.vertretungId), artLabel: ABWESENHEIT_ARTEN[art] }, vertretung: ergebnis };
  });
}

export async function abwesenheitLoeschen(n, id) {
  adminNoetig(n);
  return aendernBereit((db) => {
    const i = db.service.abwesenheiten.findIndex((a) => a.id === v.kennung(id));
    if (i < 0) throw nichtGefunden("Abwesenheit nicht gefunden.");
    const a = db.service.abwesenheiten[i];
    if (a.mitarbeiterId !== n.id && !boSchreiben(n, "team")) throw verboten("Abwesenheiten anderer ändert nur die Leitung.");
    if (a.quelle === "hrms") throw konflikt("Diese Abwesenheit stammt aus HRMS und wird dort gepflegt.");
    db.service.abwesenheiten.splice(i, 1);
    protokoll(db, n, "team", "nutzer", a.mitarbeiterId, `Abwesenheit ${a.von}–${a.bis} gelöscht (Vertretungen bleiben bestehen)`);
    return { ok: true };
  });
}

/** Wer vertritt kontoId am Tag? (für andere Module, z. B. Zuweisung neuer Vorgänge) */
export async function vertretung(n, { kontoId, tag } = {}) {
  adminNoetig(n);
  const db = await lesenBereit();
  const t = tagGueltig(tag) ? tag : heuteTag();
  const r = vertretungFinden({ mitarbeiterId: v.kennung(kontoId), tag: t, abwesenheiten: db.service.abwesenheiten, mitarbeiter: db.service.mitarbeiter });
  return r ? { ...r, konto: kontoKurz(db, r.id), tag: t } : { id: null, kette: [], grund: "niemand verfügbar", tag: t };
}

// ================================================================ Zeiterfassung (Schnittstelle Projektentwicklung / Finanzen)

function projektPruefen(db, daten) {
  const pid = v.kennung(daten.projektId);
  const erp = v.text(daten.erpProjekt, 60);
  v.pflicht(pid || erp, "Bitte wählen Sie ein Projekt.");
  if (pid) {
    const bekannt = (db.projekte || []).some((p) => p.id === pid) || Object.values(db.entwicklung || {}).some((liste) => Array.isArray(liste) && liste.some((x) => x?.id === pid));
    v.pflicht(bekannt, "Projekt nicht gefunden.");
  }
  if (erp) v.pflicht(/^[A-Za-z0-9._/ -]{2,60}$/.test(erp), "Ungültige ERPNext-Projektkennung.");
  return { projektId: pid || null, erpProjekt: erp || null };
}

function zeitAusgabe(db, z) {
  const p = z.projektId ? (db.projekte || []).find((x) => x.id === z.projektId) : null;
  return { ...z, name: nameVon(db, z.kontoId), projektTitel: p?.titel || z.erpProjekt || z.projektId || "", taetigkeitLabel: TAETIGKEITEN[z.taetigkeit] || z.taetigkeit };
}

export async function zeiten(n, { kontoId = "", monat = "", projektId = "" } = {}) {
  adminNoetig(n);
  const db = await lesenBereit();
  const alle = darfLesen(n, "team");
  const m = /^\d{4}-\d{2}$/.test(monat) ? monat : heuteTag().slice(0, 7);
  const liste = db.service.zeiten
    .filter((z) => (kontoId && alle ? z.kontoId === kontoId : alle && !kontoId ? true : z.kontoId === n.id))
    .filter((z) => z.datum.startsWith(m))
    .filter((z) => !projektId || z.projektId === projektId || z.erpProjekt === projektId)
    .sort((a, b) => b.datum.localeCompare(a.datum));
  return { monat: m, eintraege: liste.map((z) => zeitAusgabe(db, z)), summe: Math.round(liste.reduce((s, z) => s + z.stunden, 0) * 100) / 100, jeProjekt: zeitenSummieren(liste) };
}

export async function zeitErfassen(n, daten = {}) {
  adminNoetig(n);
  const datum = String(daten.datum || heuteTag());
  v.pflicht(tagGueltig(datum) && datum <= tagPlus(heuteTag(), 1), "Bitte geben Sie ein gültiges Datum an (nicht in der Zukunft).");
  const stunden = Math.round((v.zahl(daten.stunden, { min: 0.25, max: HR_GRENZEN.stundenTagMax }) || 0) * 4) / 4;
  v.pflicht(stunden >= 0.25, "Bitte geben Sie die Stunden an (0,25–12).");
  const taetigkeit = v.auswahl(daten.taetigkeit, TAETIGKEIT_IDS, "");
  v.pflicht(taetigkeit, "Bitte wählen Sie eine Tätigkeit.");
  return aendernBereit((db) => {
    const kontoId = v.kennung(daten.kontoId) || n.id;
    if (kontoId !== n.id && !boSchreiben(n, "team")) throw verboten("Zeiten anderer erfasst nur die Leitung.");
    const bezug = projektPruefen(db, daten);
    const tagSumme = db.service.zeiten.filter((z) => z.kontoId === kontoId && z.datum === datum).reduce((s, z) => s + z.stunden, 0);
    if (tagSumme + stunden > HR_GRENZEN.stundenTagMax) throw konflikt(`Für diesen Tag sind bereits ${tagSumme} Stunden erfasst (höchstens ${HR_GRENZEN.stundenTagMax}).`);
    const z = { id: neueId("ZE"), kontoId, datum, stunden, ...bezug, taetigkeit, text: v.text(daten.text, 200), erstelltAm: jetzt(), timesheet: null };
    db.service.zeiten.push(z);
    return zeitAusgabe(db, z);
  });
}

export async function zeitLoeschen(n, id) {
  adminNoetig(n);
  return aendernBereit((db) => {
    const i = db.service.zeiten.findIndex((z) => z.id === v.kennung(id));
    if (i < 0) throw nichtGefunden("Eintrag nicht gefunden.");
    const z = db.service.zeiten[i];
    if (z.kontoId !== n.id && !boSchreiben(n, "team")) throw verboten("Nur eigene Einträge.");
    if (z.timesheet) throw konflikt("Der Eintrag ist bereits in ein Timesheet übernommen und wird dort korrigiert.");
    db.service.zeiten.splice(i, 1);
    return { ok: true };
  });
}

/**
 * Schnittstelle für Projektentwicklung/Finanzen: Stunden je Projekt und Tätigkeit im Zeitraum.
 * Lesen mit Bereich team, entwicklung oder finanzen (Stufe ≥ 1). Kosten rechnet das Finanzmodul (Stundensätze liegen dort).
 */
export async function zeitenAuswertung(n, { projektId = "", von = "", bis = "" } = {}) {
  adminNoetig(n);
  if (!["team", "entwicklung", "finanzen"].some((b) => darfLesen(n, b))) throw verboten("Keine Berechtigung für Zeitauswertungen.");
  const db = await lesenBereit();
  const liste = db.service.zeiten.filter((z) => (!projektId || z.projektId === projektId || z.erpProjekt === projektId) && (!tagGueltig(von) || z.datum >= von) && (!tagGueltig(bis) || z.datum <= bis));
  return { projekte: zeitenSummieren(liste), summe: Math.round(liste.reduce((s, z) => s + z.stunden, 0) * 100) / 100, eintraege: liste.length };
}

// ================================================================ Wissensdatenbank (nur intern)

function wissenAusgabe(db, a, { detail = false, punkte } = {}) {
  const basis = { id: a.id, titel: a.titel, kategorie: a.kategorie, kategorieLabel: WISSEN_KATEGORIEN[a.kategorie] || a.kategorie, tags: a.tags, autor: nameVon(db, a.autorId), geaendertAm: a.geaendertAm, version: a.version, auszug: a.inhalt.replace(/[#*_>`-]/g, "").replace(/\s+/g, " ").slice(0, 180), punkte };
  return detail ? { ...basis, inhalt: a.inhalt, versionen: (a.versionen || []).map((x) => ({ version: x.version, am: x.am, autor: nameVon(db, x.autorId) })) } : basis;
}

export async function wissen(n, { q = "", kategorie = "" } = {}) {
  angemeldet(n);
  if (!boLesen(n, "wissen")) throw verboten("Die Wissensdatenbank ist nur intern verfügbar.");
  const db = await lesenBereit();
  return db.service.wissen
    .filter((a) => !kategorie || a.kategorie === kategorie)
    .map((a) => ({ a, p: wissenTreffer(a, q) }))
    .filter((x) => x.p > 0)
    .sort((x, y) => y.p - x.p || String(y.a.geaendertAm).localeCompare(String(x.a.geaendertAm)))
    .map((x) => wissenAusgabe(db, x.a, { punkte: x.p }));
}

export async function wissenArtikel(n, id) {
  angemeldet(n);
  if (!boLesen(n, "wissen")) throw verboten("Die Wissensdatenbank ist nur intern verfügbar.");
  const db = await lesenBereit();
  const a = db.service.wissen.find((x) => x.id === v.kennung(id));
  if (!a) throw nichtGefunden("Artikel nicht gefunden.");
  return wissenAusgabe(db, a, { detail: true });
}

export async function wissenSpeichern(n, daten = {}) {
  schreibNoetig(n, "wissen", "Wissensdatenbank");
  const titel = v.text(daten.titel, 160);
  v.pflicht(titel.length >= 4, "Bitte geben Sie einen Titel an (mind. 4 Zeichen).");
  const inhalt = v.mehrzeilig(daten.inhalt, HR_GRENZEN.wissenInhalt);
  v.pflicht(inhalt.length >= 20, "Der Artikel ist zu kurz (mind. 20 Zeichen).");
  const kategorie = v.auswahl(daten.kategorie, WISSEN_KATEGORIE_IDS, "prozesse");
  const tags = v.textListe(daten.tags, { max: 10, laenge: 30 });
  return aendernBereit((db) => {
    let a = daten.id ? db.service.wissen.find((x) => x.id === v.kennung(daten.id)) : null;
    if (daten.id && !a) throw nichtGefunden("Artikel nicht gefunden.");
    if (a) {
      a.versionen = [{ version: a.version, am: a.geaendertAm, autorId: a.autorId, titel: a.titel, inhalt: a.inhalt }, ...(a.versionen || [])].slice(0, 10);
      Object.assign(a, { titel, inhalt, kategorie, tags, autorId: n.id, geaendertAm: jetzt(), version: (a.version || 1) + 1 });
    } else {
      a = { id: neueId("WI"), titel, inhalt, kategorie, tags, autorId: n.id, erstelltAm: jetzt(), geaendertAm: jetzt(), version: 1, versionen: [] };
      db.service.wissen.push(a);
    }
    protokoll(db, n, "wissen", "wissen", a.id, `Wissensartikel „${titel}“ gespeichert (Version ${a.version})`);
    return wissenAusgabe(db, a, { detail: true });
  });
}

export async function wissenLoeschen(n, id) {
  schreibNoetig(n, "wissen", "Wissensdatenbank");
  return aendernBereit((db) => {
    const i = db.service.wissen.findIndex((x) => x.id === v.kennung(id));
    if (i < 0) throw nichtGefunden("Artikel nicht gefunden.");
    const [a] = db.service.wissen.splice(i, 1);
    protokoll(db, n, "wissen", "wissen", a.id, `Wissensartikel „${a.titel}“ gelöscht`);
    return { ok: true };
  });
}

// ================================================================ Integrationsstatus (Drive, Helpdesk, HRMS)

export async function ablageStatus(n) {
  adminNoetig(n);
  return {
    backend: "demo",
    drive: { installiert: false, aktiv: false, hinweis: "Demo ohne Frappe Drive: Dokumente liegen in der Plattform-Ablage. Mit Drive (Schalter oekoinvest_drive) werden Datenraum-, Flächen- und Projektakten für das interne Team gespiegelt; Rechte bleiben in der Plattform." },
    helpdesk: { installiert: false, aktiv: false, hinweis: "Eigene Ticket-Logik der Plattform. Mit Frappe Helpdesk (Schalter oekoinvest_helpdesk) werden Tickets als „HD Ticket“ gespiegelt." },
    hrms: { installiert: false, aktiv: false, hinweis: "Abwesenheiten und Zeiten in der Plattform. Mit HRMS (Schalter oekoinvest_hrms): Leave Application, Holiday List, Timesheet." },
    kalender: { event: false, hinweis: "Mit Frappe: jeder Termin zusätzlich als „Event“ im Desk-Kalender des Mitarbeiters." },
  };
}
