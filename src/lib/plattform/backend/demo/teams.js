// src/lib/plattform/backend/demo/teams.js
//
// Firmenkonten (Organisationen & Teams) im Demo-Backend – Referenz für die Frappe-App
// (plattform/api/organisation.py, plattform/organisation.py). Vertrag: docs/API.md, Abschnitt 8.
//
// Modell
//   db.organisationen   { id O-…, name, art, suchprofil, erstelltVon, erstelltAm, geaendertAm }
//   db.mitgliedschaften { id MG-…, organisationId, nutzerId, rolle (inhaber|admin|mitglied|lesen), seit, eingeladenVon }
//   db.einladungen      { id EL-…, organisationId, email, rolle, hash (SHA-256 des Tokens), ablauf, status, eingeladenVon, … }
//   Flächen, Projekte und Interessen tragen `organisationId` (leer = persönlich).
//
// Rechte (siehe src/lib/plattform/organisation.js): Eigentümer wie bisher; zusätzlich sehen Mitglieder der
// Organisation eines Objekts dieses Objekt (jede Teamrolle), bearbeiten ab „Mitglied“, verwalten ab „Admin“.
// Listen: ohne aktive Organisation die eigenen Objekte (wie bisher), mit aktiver Organisation deren Objekte.
// Die aktive Organisation hängt an der Sitzung (Organisationswechsel im Portal-Kopf).

import {
  EINLADUNG_ROLLEN, EINLADUNG_TAGE, MAX_MITGLIEDER, ORGANISATION_ARTEN, ORGANISATION_OBJEKTE, TEAM_ROLLEN,
  darfTeamSchreiben, darfTeamVerwalten, teamRolleLabel, teamStufe,
} from "../../organisation";
import { PlattformFehler, konflikt, nichtGefunden, ungueltig, verboten } from "../../fehler";
import * as v from "../../validierung";
import { jetzt, neueId, sha256, zufallsToken } from "./hilfen";
import { aendern, lesen } from "./speicher";
import { internSicherheit } from "./sicherheitWerkzeuge";

// ================================================================ Rechte-Helfer (von demo.js genutzt)

const BESITZ_FELD = { flaeche: "nutzerId", projekt: "anbieterId", interesse: "investorId" };
const SAMMLUNG = { flaeche: "flaechen", projekt: "projekte", interesse: "interessen" };

/** Sammlungen anlegen, falls die Demo-Datenbank älter ist (kein Schema-Wechsel nötig) */
export function orgSammlungen(db) {
  db.organisationen ||= [];
  db.mitgliedschaften ||= [];
  db.einladungen ||= [];
  return db;
}

export function mitgliedschaft(db, nutzerId, organisationId) {
  if (!nutzerId || !organisationId) return null;
  return (db.mitgliedschaften || []).find((m) => m.nutzerId === nutzerId && m.organisationId === organisationId) || null;
}

/** Teamrolle des Nutzers in der Organisation oder null */
export const teamRolle = (db, nutzerId, organisationId) => mitgliedschaft(db, nutzerId, organisationId)?.rolle || null;

/** Aktive Organisation der Sitzung – nur, wenn die Mitgliedschaft (noch) besteht */
export function aktiveOrganisation(db, n) {
  const id = n?.organisation?.id || null;
  return id && mitgliedschaft(db, n.id, id) ? id : null;
}

/** Zugriff von n auf ein Objekt der Organisation: "schreiben" | "lesen" | null (ohne Eigentum/Admin) */
export function teamZugriff(db, n, o) {
  if (!n || !o?.organisationId) return null;
  const r = teamRolle(db, n.id, o.organisationId);
  if (!r) return null;
  return darfTeamSchreiben(r) ? "schreiben" : "lesen";
}
export const darfTeamLesenObjekt = (db, n, o) => !!teamZugriff(db, n, o);
export const darfTeamSchreibenObjekt = (db, n, o) => teamZugriff(db, n, o) === "schreiben";
export function darfTeamVerwaltenObjekt(db, n, o) {
  if (!n || !o?.organisationId) return false;
  return darfTeamVerwalten(teamRolle(db, n.id, o.organisationId));
}

/**
 * Filter für Listen: ohne aktive Organisation eigene Objekte (Feld `feld` = n.id),
 * mit aktiver Organisation alle Objekte dieser Organisation.
 */
export function listenFilter(db, n, feld) {
  const aktiv = aktiveOrganisation(db, n);
  return aktiv ? (o) => o.organisationId === aktiv : (o) => o[feld] === n.id;
}

/** Organisation, der ein neu angelegtes Objekt gehört (aktive Organisation, Rolle ≥ Mitglied) */
export function organisationFuerNeu(db, n) {
  const aktiv = aktiveOrganisation(db, n);
  if (!aktiv) return null;
  if (!darfTeamSchreiben(teamRolle(db, n.id, aktiv))) throw verboten("Mit der Rolle „Nur lesen“ können Sie in dieser Organisation nichts anlegen.");
  return aktiv;
}

/** Zusatzfelder für die Ausgabe eines Objekts: organisation {id, name}, meinZugriff */
export function zugriffInfo(db, n, o, besitzerId) {
  const org = o?.organisationId ? (db.organisationen || []).find((x) => x.id === o.organisationId) : null;
  const admin = !!n?.rollen?.includes("admin");
  const meinZugriff = besitzerId === n?.id ? "eigentuemer" : teamZugriff(db, n, o) || (admin ? "admin" : null);
  return { organisation: org ? { id: org.id, name: org.name } : null, meinZugriff };
}

/**
 * Interesse, das n für ein Projekt „gehört“: im Organisationskontext das Interesse der Organisation
 * (von jedem Mitglied angelegt) bzw. sonst das eigene.
 */
export function interesseFuer(db, n, projektId) {
  if (!n) return null;
  const aktiv = aktiveOrganisation(db, n);
  const liste = db.interessen.filter((i) => i.projektId === projektId);
  if (aktiv) {
    const org = liste.find((i) => i.organisationId === aktiv);
    if (org) return org;
  }
  return liste.find((i) => i.investorId === n.id) || null;
}

/** Hat n über eigenes oder Team-Interesse Zugang zum Datenraum (Status aus `status`)? */
export function datenraumUeberInteresse(db, n, projektId, status) {
  return db.interessen.some((i) => i.projektId === projektId && status.includes(i.status) && (i.investorId === n.id || darfTeamLesenObjekt(db, n, i)));
}

/** Suchprofil im aktuellen Kontext (Organisation oder Konto) */
export function suchprofilFuer(db, n) {
  const aktiv = aktiveOrganisation(db, n);
  if (aktiv) return (db.organisationen || []).find((o) => o.id === aktiv)?.suchprofil || null;
  return db.nutzer.find((u) => u.id === n.id)?.suchprofil || null;
}

/** Organisationen des Nutzers für Sitzung/Kopfzeile */
export function organisationenVon(db, nutzerId) {
  return (db.mitgliedschaften || [])
    .filter((m) => m.nutzerId === nutzerId)
    .map((m) => {
      const o = (db.organisationen || []).find((x) => x.id === m.organisationId);
      return o ? { id: o.id, name: o.name, art: o.art, rolle: m.rolle } : null;
    })
    .filter(Boolean)
    .sort((a, b) => a.name.localeCompare(b.name, "de"));
}

/**
 * Suchprofil-Alarm für Organisationen: Mitglieder von Organisationen mit passendem Team-Suchprofil
 * (ohne die Organisation des Anbieters) werden benachrichtigt – je Person höchstens einmal.
 */
export function organisationsAlarm(db, projekt, { matching, schwelleStandard, bereits = new Set(), melden }) {
  for (const org of db.organisationen || []) {
    const sp = org.suchprofil;
    if (!sp?.benachrichtigen || org.id === projekt.organisationId) continue;
    const m = matching(projekt, sp);
    if (m.score < (Number(sp.schwelle) || schwelleStandard)) continue;
    for (const mg of (db.mitgliedschaften || []).filter((x) => x.organisationId === org.id)) {
      const u = db.nutzer.find((x) => x.id === mg.nutzerId);
      if (!u || !u.aktiv || bereits.has(u.id) || u.id === projekt.anbieterId) continue;
      bereits.add(u.id);
      melden(u, m, org);
    }
  }
}

// ================================================================ Ausgabe

const nutzerKurz = (db, id) => {
  const u = db.nutzer.find((x) => x.id === id);
  return u ? { id: u.id, vorname: u.vorname, nachname: u.nachname, email: u.email, firma: u.firma || "" } : null;
};
const nameVon = (db, id) => {
  const u = db.nutzer.find((x) => x.id === id);
  return u ? [u.vorname, u.nachname].filter(Boolean).join(" ") : "";
};

function objektTitel(art, o) {
  if (art === "flaeche") return o.bezeichnung;
  if (art === "projekt") return o.titel;
  return null;
}

function organisationAusgabe(db, org, n) {
  const rolle = teamRolle(db, n.id, org.id);
  const verwalten = darfTeamVerwalten(rolle);
  const zaehle = (art) => db[SAMMLUNG[art]].filter((x) => x.organisationId === org.id).length;
  const interessenOrg = db.interessen.filter((i) => i.organisationId === org.id);
  return {
    id: org.id,
    name: org.name,
    art: org.art,
    rolle,
    erstelltAm: org.erstelltAm,
    suchprofil: org.suchprofil || null,
    mitglieder: db.mitgliedschaften
      .filter((m) => m.organisationId === org.id)
      .sort((a, b) => teamStufe(b.rolle) - teamStufe(a.rolle) || String(a.seit).localeCompare(String(b.seit)))
      .map((m) => ({ id: m.id, nutzer: nutzerKurz(db, m.nutzerId), rolle: m.rolle, seit: m.seit, ich: m.nutzerId === n.id })),
    einladungen: verwalten
      ? db.einladungen
          .filter((e) => e.organisationId === org.id && e.status === "offen")
          .map((e) => ({ id: e.id, email: e.email, rolle: e.rolle, ablauf: e.ablauf, abgelaufen: new Date(e.ablauf) < new Date(), eingeladenVon: nameVon(db, e.eingeladenVon), erstelltAm: e.erstelltAm }))
      : [],
    objekte: {
      flaechen: zaehle("flaeche"),
      projekte: zaehle("projekt"),
      interessen: interessenOrg.length,
      liste: [
        ...db.flaechen.filter((x) => x.organisationId === org.id).map((x) => ({ art: "flaeche", id: x.id, titel: x.bezeichnung, status: x.status, link: `/portal/flaechen/${x.id}` })),
        ...db.projekte.filter((x) => x.organisationId === org.id).map((x) => ({ art: "projekt", id: x.id, titel: x.titel, status: x.status, link: `/portal/projekte/${x.id}` })),
        ...interessenOrg.map((i) => {
          const p = db.projekte.find((x) => x.id === i.projektId);
          return { art: "interesse", id: i.id, titel: p?.titel || i.projektId, status: i.status, link: `/portal/boerse/${i.projektId}` };
        }),
      ].slice(0, 200),
    },
    // Eigene persönliche Objekte, die in die Organisation übernommen werden können (ab Mitglied)
    zuordenbar: darfTeamSchreiben(rolle)
      ? [
          ...db.flaechen.filter((x) => x.nutzerId === n.id && !x.organisationId).map((x) => ({ art: "flaeche", id: x.id, titel: x.bezeichnung })),
          ...db.projekte.filter((x) => x.anbieterId === n.id && !x.organisationId).map((x) => ({ art: "projekt", id: x.id, titel: x.titel })),
          ...db.interessen.filter((x) => x.investorId === n.id && !x.organisationId).map((i) => ({ art: "interesse", id: i.id, titel: db.projekte.find((p) => p.id === i.projektId)?.titel || i.projektId })),
        ].slice(0, 100)
      : [],
  };
}

function orgLaden(db, n, id, { verwalten = false, inhaber = false } = {}) {
  if (!n) throw new PlattformFehler(401, "Bitte melden Sie sich an.");
  const org = (db.organisationen || []).find((o) => o.id === v.kennung(id));
  // Nicht-Mitglieder erfahren nicht, ob es die Organisation gibt → immer 403
  const rolle = org ? teamRolle(db, n.id, org.id) : null;
  if (!org || !rolle) throw verboten("Sie sind kein Mitglied dieser Organisation.");
  if (inhaber && rolle !== "inhaber") throw verboten("Nur der Inhaber kann das.");
  if (verwalten && !darfTeamVerwalten(rolle)) throw verboten("Dafür brauchen Sie die Teamrolle Admin oder Inhaber.");
  return { org, rolle };
}

// ================================================================ Operationen

export async function organisationen(n) {
  if (!n) throw new PlattformFehler(401, "Bitte melden Sie sich an.");
  const db = orgSammlungen(await lesen());
  return { organisationen: organisationenVon(db, n.id).map((o) => ({ ...o, mitglieder: db.mitgliedschaften.filter((m) => m.organisationId === o.id).length })), aktiv: aktiveOrganisation(db, n) };
}

export async function organisationAnlegen(n, daten = {}) {
  if (!n) throw new PlattformFehler(401, "Bitte melden Sie sich an.");
  const name = v.text(daten.name, 120);
  v.pflicht(name.length >= 2, "Bitte geben Sie den Namen der Organisation an.");
  const art = v.auswahl(daten.art, ORGANISATION_ARTEN, "");
  v.pflicht(art, "Bitte wählen Sie die Art der Organisation.");
  return aendern((db) => {
    orgSammlungen(db);
    v.pflicht(db.mitgliedschaften.filter((m) => m.nutzerId === n.id).length < 20, "Sie sind bereits Mitglied in 20 Organisationen.");
    const org = { id: neueId("O"), name, art, suchprofil: null, erstelltVon: n.id, erstelltAm: jetzt(), geaendertAm: jetzt() };
    db.organisationen.push(org);
    db.mitgliedschaften.push({ id: neueId("MG"), organisationId: org.id, nutzerId: n.id, rolle: "inhaber", seit: jetzt(), eingeladenVon: null });
    internSicherheit.protokoll(db, n, "organisation", "organisation", org.id, `Organisation „${name}“ angelegt (${ORGANISATION_ARTEN[art].label})`);
    return organisationAusgabe(db, org, n);
  });
}

export async function organisation(n, id) {
  const db = orgSammlungen(await lesen());
  const { org } = orgLaden(db, n, id);
  return organisationAusgabe(db, org, n);
}

export async function organisationAendern(n, id, daten = {}) {
  return aendern((db) => {
    orgSammlungen(db);
    const { org } = orgLaden(db, n, id, { verwalten: true });
    if (daten.name !== undefined) {
      const name = v.text(daten.name, 120);
      v.pflicht(name.length >= 2, "Bitte geben Sie den Namen der Organisation an.");
      org.name = name;
    }
    if (daten.art !== undefined) {
      const art = v.auswahl(daten.art, ORGANISATION_ARTEN, "");
      v.pflicht(art, "Unbekannte Art.");
      org.art = art;
    }
    org.geaendertAm = jetzt();
    internSicherheit.protokoll(db, n, "organisation", "organisation", org.id, `Organisation bearbeitet: ${org.name}`);
    return organisationAusgabe(db, org, n);
  });
}

export async function organisationLoeschen(n, id) {
  return aendern((db) => {
    orgSammlungen(db);
    const { org } = orgLaden(db, n, id, { inhaber: true });
    // Objekte fallen an ihre Eigentümer zurück (nichts wird gelöscht)
    for (const art of ORGANISATION_OBJEKTE) for (const o of db[SAMMLUNG[art]]) if (o.organisationId === org.id) o.organisationId = null;
    db.mitgliedschaften = db.mitgliedschaften.filter((m) => m.organisationId !== org.id);
    db.einladungen = db.einladungen.filter((e) => e.organisationId !== org.id);
    for (const s of db.sitzungen || []) if (s.organisationId === org.id) s.organisationId = null;
    db.organisationen = db.organisationen.filter((o) => o.id !== org.id);
    internSicherheit.protokoll(db, n, "organisation", "organisation", org.id, `Organisation „${org.name}“ gelöscht`);
    return { ok: true };
  });
}

// ---------------------------------------------------------------- Einladungen

export async function einladungAnlegen(n, id, { email, rolle, basisUrl } = {}) {
  const e = v.email(email);
  v.pflicht(e, "Bitte geben Sie eine gültige E-Mail-Adresse an.");
  const r = v.auswahl(rolle, EINLADUNG_ROLLEN, "");
  v.pflicht(r, "Bitte wählen Sie eine Teamrolle.");
  return aendern((db) => {
    orgSammlungen(db);
    const { org, rolle: eigene } = orgLaden(db, n, id, { verwalten: true });
    if (teamStufe(r) > teamStufe(eigene)) throw verboten("Sie können keine höhere Rolle vergeben als Ihre eigene.");
    const vorhanden = db.nutzer.find((u) => u.email === e);
    if (vorhanden && mitgliedschaft(db, vorhanden.id, org.id)) throw konflikt("Diese Person ist bereits Mitglied.");
    v.pflicht(db.mitgliedschaften.filter((m) => m.organisationId === org.id).length < MAX_MITGLIEDER, "Die Organisation hat die maximale Mitgliederzahl erreicht.");
    // offene Einladung an dieselbe Adresse ersetzen
    for (const x of db.einladungen) if (x.organisationId === org.id && x.email === e && x.status === "offen") x.status = "ersetzt";
    const token = zufallsToken();
    const einl = {
      id: neueId("EL"), organisationId: org.id, email: e, rolle: r, hash: sha256(token),
      ablauf: new Date(Date.now() + EINLADUNG_TAGE * 86400e3).toISOString(), status: "offen", eingeladenVon: n.id, erstelltAm: jetzt(), angenommenAm: null, angenommenVon: null,
    };
    db.einladungen.push(einl);
    const link = `${basisUrl}/einladung/${token}`;
    db.demoLinks.unshift({ am: jetzt(), art: "einladung", email: e, link });
    db.demoLinks = db.demoLinks.slice(0, 50);
    console.info(`[plattform-demo] Einladungs-Link für ${e}: ${link}`);
    internSicherheit.postausgangAnlegen(db, {
      an: e, anName: vorhanden ? [vorhanden.vorname, vorhanden.nachname].filter(Boolean).join(" ") : "", nutzerId: vorhanden?.id || null, art: "einladung",
      betreff: `Einladung in das Team „${org.name}“ – ÖkoInvest`,
      text: `${nameVon(db, n.id)} lädt Sie ein, im Portal von ÖkoInvest dem Team „${org.name}“ beizutreten (Rolle: ${teamRolleLabel(r)}). Der Link ist ${EINLADUNG_TAGE} Tage gültig. Ohne Konto registrieren Sie sich mit dieser E-Mail-Adresse.`,
      link, linkText: "Einladung ansehen", hinweis: "Sie kennen die einladende Person nicht? Dann ignorieren Sie diese E-Mail bitte.",
    });
    internSicherheit.protokoll(db, n, "einladung", "organisation", org.id, `Einladung an ${e} als ${teamRolleLabel(r)}`);
    return { id: einl.id, email: e, rolle: r, ablauf: einl.ablauf };
  });
}

export async function einladungWiderrufen(n, id, einladungId) {
  return aendern((db) => {
    orgSammlungen(db);
    const { org } = orgLaden(db, n, id, { verwalten: true });
    const e = db.einladungen.find((x) => x.id === einladungId && x.organisationId === org.id && x.status === "offen");
    if (!e) throw nichtGefunden("Einladung nicht gefunden.");
    e.status = "widerrufen";
    internSicherheit.protokoll(db, n, "einladung", "organisation", org.id, `Einladung an ${e.email} widerrufen`);
    return { ok: true };
  });
}

function einladungSuchen(db, token) {
  const t = String(token || "");
  if (!/^[A-Za-z0-9_-]{20,200}$/.test(t)) return null;
  const h = sha256(t);
  return (db.einladungen || []).find((x) => x.hash === h) || null;
}

const maskieren = (email) => {
  const [lokal, domain] = String(email).split("@");
  return `${lokal.slice(0, 1)}${"•".repeat(Math.max(2, Math.min(6, lokal.length - 1)))}@${domain}`;
};

/** Öffentliche Kurzinfo zur Einladungsseite (ohne Anmeldung) – verrät nur, was im Link-Empfänger ohnehin weiß */
export async function einladungInfo(token) {
  const db = orgSammlungen(await lesen());
  const e = einladungSuchen(db, token);
  const org = e ? db.organisationen.find((o) => o.id === e.organisationId) : null;
  if (!e || !org || e.status !== "offen" || new Date(e.ablauf) < new Date()) return { gueltig: false, status: e ? (e.status === "offen" ? "abgelaufen" : e.status) : "unbekannt" };
  return { gueltig: true, organisation: { name: org.name, art: org.art }, rolle: e.rolle, eingeladenVon: nameVon(db, e.eingeladenVon), email: maskieren(e.email), ablauf: e.ablauf };
}

export async function einladungAnnehmen(n, token) {
  if (!n) throw new PlattformFehler(401, "Bitte melden Sie sich an.");
  return aendern((db) => {
    orgSammlungen(db);
    const e = einladungSuchen(db, token);
    if (!e || e.status !== "offen" || new Date(e.ablauf) < new Date()) throw ungueltig("Die Einladung ist ungültig, abgelaufen oder wurde widerrufen.");
    const u = db.nutzer.find((x) => x.id === n.id);
    if (u.email !== e.email) throw verboten(`Diese Einladung gilt für eine andere E-Mail-Adresse. Bitte melden Sie sich mit der eingeladenen Adresse an.`);
    const org = db.organisationen.find((o) => o.id === e.organisationId);
    if (!org) throw nichtGefunden("Die Organisation besteht nicht mehr.");
    if (!mitgliedschaft(db, u.id, org.id)) {
      db.mitgliedschaften.push({ id: neueId("MG"), organisationId: org.id, nutzerId: u.id, rolle: e.rolle, seit: jetzt(), eingeladenVon: e.eingeladenVon });
    }
    e.status = "angenommen";
    e.angenommenAm = jetzt();
    e.angenommenVon = u.id;
    // Wer die Einladung per E-Mail erhalten hat, hat die Adresse nachgewiesen
    if (!u.emailBestaetigt) {
      u.emailBestaetigt = true;
      internSicherheit.verknuepfen(db, u);
    }
    const einladender = db.nutzer.find((x) => x.id === e.eingeladenVon);
    if (einladender) {
      internSicherheit.benachrichtigen(db, einladender, { art: "status", titel: `Team „${org.name}“`, text: `${nameVon(db, u.id)} hat die Einladung angenommen (${teamRolleLabel(e.rolle)}).`, link: "/portal/organisation", objektArt: "organisation", objektId: org.id }, { mail: false });
    }
    internSicherheit.protokoll(db, u, "einladung", "organisation", org.id, `Einladung angenommen (${teamRolleLabel(e.rolle)})`);
    return { organisationId: org.id, name: org.name, rolle: e.rolle };
  });
}

// ---------------------------------------------------------------- Mitglieder

export async function mitgliedAendern(n, id, mitgliedId, { rolle } = {}) {
  const r = v.auswahl(rolle, TEAM_ROLLEN, "");
  v.pflicht(r, "Unbekannte Teamrolle.");
  return aendern((db) => {
    orgSammlungen(db);
    const { org, rolle: eigene } = orgLaden(db, n, id, { verwalten: true });
    const m = db.mitgliedschaften.find((x) => x.id === mitgliedId && x.organisationId === org.id);
    if (!m) throw nichtGefunden("Mitglied nicht gefunden.");
    if (r === "inhaber") {
      // Übertragung der Inhaberschaft: nur durch den Inhaber, bisheriger Inhaber wird Admin
      if (eigene !== "inhaber") throw verboten("Nur der Inhaber kann die Inhaberschaft übertragen.");
      if (m.nutzerId === n.id) return organisationAusgabe(db, org, n);
      const alt = db.mitgliedschaften.find((x) => x.organisationId === org.id && x.rolle === "inhaber");
      if (alt) alt.rolle = "admin";
      m.rolle = "inhaber";
    } else {
      if (m.rolle === "inhaber") throw konflikt("Die Rolle des Inhabers ändern Sie, indem Sie die Inhaberschaft übertragen.");
      if (teamStufe(r) > teamStufe(eigene) || teamStufe(m.rolle) > teamStufe(eigene)) throw verboten("Sie können keine Rolle über Ihrer eigenen vergeben oder ändern.");
      m.rolle = r;
    }
    internSicherheit.protokoll(db, n, "mitglied", "organisation", org.id, `${nameVon(db, m.nutzerId)}: Teamrolle ${teamRolleLabel(m.rolle)}`);
    return organisationAusgabe(db, org, n);
  });
}

export async function mitgliedEntfernen(n, id, mitgliedId) {
  return aendern((db) => {
    orgSammlungen(db);
    const { org, rolle: eigene } = orgLaden(db, n, id);
    const m = db.mitgliedschaften.find((x) => x.id === mitgliedId && x.organisationId === org.id);
    if (!m) throw nichtGefunden("Mitglied nicht gefunden.");
    const selbst = m.nutzerId === n.id;
    if (!selbst && !darfTeamVerwalten(eigene)) throw verboten("Dafür brauchen Sie die Teamrolle Admin oder Inhaber.");
    if (m.rolle === "inhaber") throw konflikt(selbst ? "Übertragen Sie zuerst die Inhaberschaft oder löschen Sie die Organisation." : "Der Inhaber kann nicht entfernt werden.");
    if (!selbst && teamStufe(m.rolle) > teamStufe(eigene)) throw verboten();
    db.mitgliedschaften = db.mitgliedschaften.filter((x) => x.id !== m.id);
    for (const s of db.sitzungen || []) if (s.nutzerId === m.nutzerId && s.organisationId === org.id) s.organisationId = null;
    internSicherheit.protokoll(db, n, "mitglied", "organisation", org.id, selbst ? "Organisation verlassen" : `${nameVon(db, m.nutzerId)} entfernt`);
    return selbst ? { ok: true, verlassen: true } : organisationAusgabe(db, org, n);
  });
}

// ---------------------------------------------------------------- Kontext & Zuordnung

/** Aktive Organisation der aktuellen Sitzung setzen (null = persönlich) */
export async function organisationWechseln(n, organisationId) {
  if (!n) throw new PlattformFehler(401, "Bitte melden Sie sich an.");
  const ziel = organisationId ? v.kennung(organisationId) : null;
  return aendern((db) => {
    orgSammlungen(db);
    if (ziel && !mitgliedschaft(db, n.id, ziel)) throw verboten("Sie sind kein Mitglied dieser Organisation.");
    const s = (db.sitzungen || []).find((x) => x.id === n.sitzung?.id && x.nutzerId === n.id);
    if (!s) throw new PlattformFehler(409, "Bitte melden Sie sich neu an, um die Organisation zu wechseln.", "sitzung");
    s.organisationId = ziel;
    const org = ziel ? db.organisationen.find((o) => o.id === ziel) : null;
    return { aktiv: ziel, organisation: org ? { id: org.id, name: org.name, art: org.art, rolle: teamRolle(db, n.id, org.id) } : null };
  });
}

/** Eigenes Objekt einer Organisation zuordnen oder wieder persönlich machen */
export async function objektZuordnen(n, { art, id, organisationId } = {}) {
  if (!n) throw new PlattformFehler(401, "Bitte melden Sie sich an.");
  if (!ORGANISATION_OBJEKTE.includes(art)) throw ungueltig("Unbekannte Objektart.");
  return aendern((db) => {
    orgSammlungen(db);
    const o = db[SAMMLUNG[art]].find((x) => x.id === v.kennung(id));
    if (!o) throw nichtGefunden();
    const eigen = o[BESITZ_FELD[art]] === n.id;
    const ziel = organisationId ? v.kennung(organisationId) : null;
    if (ziel) {
      if (!eigen) throw verboten("Nur eigene Objekte können einer Organisation zugeordnet werden.");
      if (!darfTeamSchreiben(teamRolle(db, n.id, ziel))) throw verboten("Dafür brauchen Sie in der Organisation mindestens die Rolle Mitglied.");
    } else if (!eigen && !darfTeamVerwaltenObjekt(db, n, o)) {
      throw verboten();
    }
    const vorher = o.organisationId || null;
    o.organisationId = ziel;
    o.geaendertAm = jetzt();
    internSicherheit.protokoll(db, n, "zuordnung", art, o.id, ziel ? `Organisation zugeordnet: ${db.organisationen.find((x) => x.id === ziel)?.name}` : `Aus Organisation gelöst (${vorher || "–"})`);
    return { id: o.id, art, organisationId: ziel, titel: objektTitel(art, o) };
  });
}

// ---------------------------------------------------------------- Team-Suchprofil

/** Suchprofil der aktiven Organisation speichern (Rolle ≥ Mitglied) – von suchprofilSpeichern genutzt */
export function teamSuchprofilSetzen(db, n, profil) {
  const aktiv = aktiveOrganisation(db, n);
  if (!aktiv) return false;
  if (!darfTeamSchreiben(teamRolle(db, n.id, aktiv))) throw verboten("Mit der Rolle „Nur lesen“ können Sie das Team-Suchprofil nicht ändern.");
  const org = db.organisationen.find((o) => o.id === aktiv);
  org.suchprofil = profil;
  org.geaendertAm = jetzt();
  internSicherheit.protokoll(db, n, "suchprofil", "organisation", org.id, "Team-Suchprofil gespeichert");
  return true;
}

// ---------------------------------------------------------------- Demo-Daten

/** Demo-Organisationen (fiktiv). Einmalig beim ersten Zugriff ergänzt, ohne bestehende Objekte umzuhängen. */
export function orgSeed(db) {
  orgSammlungen(db);
  if (db.orgSeed) return;
  db.orgSeed = true;
  const u = (email) => db.nutzer.find((x) => x.email === email);
  const investor = u("investor@example.com");
  const anbieter = u("anbieter@example.com");
  const admin = u("admin@example.com");
  const t = jetzt();
  if (investor) {
    const o = { id: neueId("O"), name: "Demo Capital GmbH (fiktiv)", art: "investmenthaus", suchprofil: investor.suchprofil ? { ...investor.suchprofil, benachrichtigen: false } : null, erstelltVon: investor.id, erstelltAm: t, geaendertAm: t, demo: true };
    db.organisationen.push(o);
    db.mitgliedschaften.push({ id: neueId("MG"), organisationId: o.id, nutzerId: investor.id, rolle: "inhaber", seit: t, eingeladenVon: null });
    db.einladungen.push({ id: neueId("EL"), organisationId: o.id, email: "analyst@example.com", rolle: "lesen", hash: sha256(zufallsToken()), ablauf: new Date(Date.now() + 5 * 86400e3).toISOString(), status: "offen", eingeladenVon: investor.id, erstelltAm: t, angenommenAm: null, angenommenVon: null });
  }
  if (anbieter) {
    const o = { id: neueId("O"), name: "Muster Projektentwicklung GmbH (fiktiv)", art: "projektentwickler", suchprofil: null, erstelltVon: anbieter.id, erstelltAm: t, geaendertAm: t, demo: true };
    db.organisationen.push(o);
    db.mitgliedschaften.push({ id: neueId("MG"), organisationId: o.id, nutzerId: anbieter.id, rolle: "inhaber", seit: t, eingeladenVon: null });
    if (admin) db.mitgliedschaften.push({ id: neueId("MG"), organisationId: o.id, nutzerId: admin.id, rolle: "lesen", seit: t, eingeladenVon: anbieter.id });
  }
}
