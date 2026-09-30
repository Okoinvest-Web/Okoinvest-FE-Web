// src/lib/plattform/backend/demo/gemeinde-screening.js
//
// Gemeinde-Screening im Demo-Backend (Ausbaustufe A1b): manuelle Angaben je Gemeinde (Stand Bauleitplanung,
// Kriterienkatalog, Notiz, Konkurrenzhinweise) unter `db.akq.gemeinden`, Abgleich mit kommunalen Anliegen (Vorgänge
// Typ „kommune“) und CRM-Organisationen (Art „gemeinde“), Ranking und Übergabe an die Kommune-Ansprache (CRM-Aktivität +
// Aufgabe). Rechte: Bereich „geodaten“ (Leitung, Akquise); Änderungen zusätzlich „akquise“ schreiben.

import * as v from "../../validierung";
import { PlattformFehler, nichtGefunden } from "../../fehler";
import { unterrollen } from "../../rechte";
import { BAULEITPLANUNG_STAND, KONKURRENZ_STATUS, KRITERIENKATALOG, gemeindeRanking, gemeindeSchluessel, potenzialJeGemeinde } from "../../gemeinde-screening";
import { jetzt, neueId } from "./hilfen";
import { W, boAendern, boLesen, nameVon, rechtNoetig } from "./bo-kern";

const plusTage = (tage) => new Date(Date.now() + tage * 86400e3).toISOString().slice(0, 10);
const nameNorm = (land, name) => gemeindeSchluessel(land, "", name).replace(/^(\w+):[^:]*:/, "$1:");

function gemSicher(db) {
  db.akq = db.akq || {};
  db.akq.gemeinden = db.akq.gemeinden || {};
  return db.akq.gemeinden;
}
function schreibRecht(n) {
  rechtNoetig(n, "geodaten", 2);
  rechtNoetig(n, "akquise", 2);
}
const schluesselPruefen = (s) => {
  const x = v.text(s, 140);
  v.pflicht(/^(DE|AT|CH):[a-zäöü]{0,3}:[a-z0-9-]{2,120}$/.test(x), "Ungültige Gemeinde.");
  return x;
};

/** Kommunale Anliegen (Vorgänge Typ „kommune“) je Gemeinde: letzter Stand Bauleitplanung/Kriterienkatalog */
function anliegenJeGemeinde(db) {
  const m = new Map();
  for (const vg of (db.vorgaenge || []).filter((x) => x.typ === "kommune" && x.daten?.gemeinde)) {
    const land = vg.daten.land || vg.kontakt?.land || "DE";
    const s = nameNorm(land, vg.daten.gemeinde);
    const alt = m.get(s);
    if (!alt || String(vg.erstelltAm) > String(alt.am)) m.set(s, { vorgangId: vg.id, am: vg.erstelltAm, status: vg.status, bauleitplanung: vg.daten.bauleitplanung || "", kriterienkatalog: vg.daten.kriterienkatalog || "" });
  }
  return m;
}

function orgFuer(db, land, name) {
  const s = nameNorm(land, name);
  return (db.bo?.organisationen || []).find((o) => ["gemeinde", "stadtwerk"].includes(o.art) && (o.land || "DE") === land && nameNorm(land, o.name) === s) || null;
}

/**
 * Screening-Liste: Kandidaten (serverseitig aus dem Geodaten-Adapter) + gepflegte Angaben + Anliegen + CRM → Ranking.
 * filter: { land, bundesland, bezirk, minPunkte }
 */
export async function gemeindenScreening(n, kandidaten = [], kapazitaeten = {}, filter = {}) {
  rechtNoetig(n, "geodaten", 1);
  const db = await boLesen();
  const gem = db.akq?.gemeinden || {};
  const anliegen = anliegenJeGemeinde(db);
  const ziele = db.akq?.ziele || [];
  const kampagnen = db.akq?.kampagnen || [];
  const liste = [];
  for (const g of potenzialJeGemeinde(kandidaten, kapazitaeten).values()) {
    if (filter.land && g.land !== filter.land) continue;
    if (filter.bundesland && g.bundesland !== filter.bundesland) continue;
    if (filter.bezirk && g.bezirk !== filter.bezirk) continue;
    const manuell = gem[g.schluessel] || {};
    const a = anliegen.get(nameNorm(g.land, g.name));
    const info = {
      bauleitplanung: manuell.bauleitplanung || a?.bauleitplanung || "",
      bauleitplanungQuelle: manuell.bauleitplanung ? "manuell" : a?.bauleitplanung ? "anliegen" : "",
      kriterienkatalog: manuell.kriterienkatalog || a?.kriterienkatalog || "",
      konkurrenz: manuell.konkurrenz || [],
    };
    const r = gemeindeRanking(g, info);
    if (filter.minPunkte && r.punkte < filter.minPunkte) continue;
    const org = orgFuer(db, g.land, g.name);
    const zg = ziele.filter((z) => z.land === g.land && z.gemeinde === g.name && kampagnen.some((k) => k.id === z.kampagneId));
    liste.push({
      ...g,
      ...info,
      notiz: manuell.notiz || "",
      ranking: r,
      anliegen: a ? { vorgangId: a.vorgangId, status: a.status, am: a.am } : null,
      crm: org ? { organisationId: org.id, name: org.name, aktivitaeten: (db.bo?.aktivitaeten || []).filter((x) => x.organisationId === org.id).length } : null,
      kampagnen: { ziele: zg.length, gesichertHa: Math.round(zg.reduce((s, z) => s + (z.status === "gesichert" ? Number(z.gesichertHa ?? z.ha) || 0 : 0), 0) * 10) / 10 },
      uebergabe: manuell.uebergabe || null,
      geaendertAm: manuell.geaendertAm || null,
      geaendertVon: manuell.geaendertVon ? nameVon(db, manuell.geaendertVon) : "",
    });
  }
  liste.sort((a, b) => b.ranking.punkte - a.ranking.punkte || b.haGeeignet - a.haGeeignet);
  liste.forEach((x, i) => (x.rang = i + 1));
  return { gemeinden: liste, stand: jetzt(), labels: { bauleitplanung: BAULEITPLANUNG_STAND, kriterienkatalog: KRITERIENKATALOG, konkurrenz: KONKURRENZ_STATUS } };
}

function gemeindeEintrag(gem, schluessel, basis = {}) {
  if (!gem[schluessel]) gem[schluessel] = { schluessel, name: v.text(basis.name, 120), land: v.auswahl(basis.land, ["DE", "AT", "CH"], "DE"), bundesland: v.text(basis.bundesland, 60), konkurrenz: [], bauleitplanung: "", kriterienkatalog: "", notiz: "" };
  return gem[schluessel];
}

export async function gemeindeSpeichern(n, schluessel, daten = {}) {
  schreibRecht(n);
  const s = schluesselPruefen(schluessel);
  return boAendern((db) => {
    const g = gemeindeEintrag(gemSicher(db), s, daten);
    if (daten.bauleitplanung !== undefined) g.bauleitplanung = v.auswahl(daten.bauleitplanung, BAULEITPLANUNG_STAND, "");
    if (daten.kriterienkatalog !== undefined) g.kriterienkatalog = v.auswahl(daten.kriterienkatalog, KRITERIENKATALOG, "");
    if (daten.notiz !== undefined) g.notiz = v.mehrzeilig(daten.notiz, 2000);
    g.geaendertAm = jetzt();
    g.geaendertVon = n.id;
    W.protokoll(db, n, "aendern", "gemeinde", s, `Gemeinde-Screening ${g.name || s}: Stand gepflegt`);
    return { ok: true, gemeinde: g };
  });
}

/** Konkurrenzhinweis (manuell, bekannte Projekte anderer Entwickler) – Quelle Pflicht, keine personenbezogenen Daten */
export async function konkurrenzAnlegen(n, schluessel, daten = {}) {
  schreibRecht(n);
  const s = schluesselPruefen(schluessel);
  const x = {
    id: neueId("KK"),
    entwickler: v.text(daten.entwickler, 120),
    projekt: v.text(daten.projekt, 160),
    mw: v.zahl(daten.mw, { min: 0, max: 5000, stellen: 1 }),
    ha: v.zahl(daten.ha, { min: 0, max: 10000, stellen: 1 }),
    status: v.auswahl(daten.status, KONKURRENZ_STATUS, "geruecht"),
    quelle: v.text(daten.quelle, 200),
    aktiv: true,
  };
  v.pflicht(x.entwickler || x.projekt, "Bitte Entwickler oder Projekt angeben.");
  v.pflicht(x.quelle.length >= 3, "Bitte die Quelle angeben (z. B. Gemeinderatsprotokoll vom …, Presse, Gespräch).");
  return boAendern((db) => {
    const g = gemeindeEintrag(gemSicher(db), s, daten);
    g.konkurrenz.push({ ...x, am: jetzt(), vonId: n.id });
    g.geaendertAm = jetzt();
    g.geaendertVon = n.id;
    W.protokoll(db, n, "aendern", "gemeinde", s, `Konkurrenzhinweis ${g.name || s}: ${x.entwickler || x.projekt}`);
    return { ok: true, id: x.id };
  });
}

export async function konkurrenzEntfernen(n, schluessel, id) {
  schreibRecht(n);
  const s = schluesselPruefen(schluessel);
  return boAendern((db) => {
    const g = gemSicher(db)[s];
    const i = g?.konkurrenz?.findIndex((x) => x.id === v.kennung(id)) ?? -1;
    if (i < 0) throw nichtGefunden("Hinweis nicht gefunden.");
    g.konkurrenz.splice(i, 1);
    W.protokoll(db, n, "aendern", "gemeinde", s, `Konkurrenzhinweis entfernt (${id})`);
    return { ok: true };
  });
}

/**
 * Übergabe an die Kommune-Ansprache: CRM-Organisation (Art „gemeinde“, falls neu), CRM-Aktivität (Termin bzw. Notiz)
 * und Aufgabe „Gemeinde ansprechen“ für die zuständige Person.
 */
export async function gemeindeUebergeben(n, schluessel, daten = {}) {
  schreibRecht(n);
  rechtNoetig(n, "crm", 2);
  const s = schluesselPruefen(schluessel);
  const terminAm = /^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2})?$/.test(String(daten.terminAm || "")) ? String(daten.terminAm) : null;
  return boAendern((db) => {
    const g = gemeindeEintrag(gemSicher(db), s, daten);
    v.pflicht(g.name, "Gemeindename fehlt.");
    db.bo.organisationen = db.bo.organisationen || [];
    let org = orgFuer(db, g.land, g.name);
    let orgNeu = false;
    if (!org) {
      org = { id: neueId("KO"), name: v.text(`Gemeinde ${g.name}`, 160), art: "gemeinde", strasse: "", plz: "", ort: g.name, land: g.land, bundesland: g.bundesland, website: "", telefon: "", email: "", tags: ["Akquise-Screening"], notiz: "Angelegt aus dem Gemeinde-Screening (Flächenakquise).", erstelltAm: jetzt(), geaendertAm: jetzt() };
      db.bo.organisationen.push(org);
      orgNeu = true;
    }
    const zusammenfassung = v.mehrzeilig(daten.notiz, 1500);
    const a = {
      id: neueId("KA"), kontaktId: null, organisationId: org.id, typ: terminAm ? "termin" : "notiz",
      betreff: v.text(terminAm ? `Termin Gemeinde ${g.name}: Freiflächen-PV / Kriterienkatalog` : `Gemeinde ${g.name} für Ansprache vorgemerkt (Screening)`, 160),
      text: [zusammenfassung, `Aus dem Gemeinde-Screening übergeben${daten.punkte ? ` (Ranking ${daten.punkte} Punkte)` : ""}.`].filter(Boolean).join("\n"),
      am: terminAm ? new Date(terminAm).toISOString() : jetzt(), bezugArt: null, bezugId: null, vonId: n.id, system: false, aufgabeId: null, wiedervorlageAm: null, erstelltAm: jetzt(), quelle: "gemeinde_screening",
    };
    db.bo.aktivitaeten.push(a);
    db.aufgaben = db.aufgaben || [];
    const t = {
      id: neueId("AF"), titel: `Gemeinde ${g.name} ansprechen (Freiflächen-PV, Bauleitplanung)`,
      beschreibung: ["Bürgermeister bzw. Bauamt kontaktieren: Haltung zu Freiflächen-PV, Kriterienkatalog/Standortkonzept, Bürgerbeteiligung, § 6 EEG (DE).", `Screening: /portal/admin/akquise/gemeinden · CRM: /portal/admin/crm?organisation=${org.id}`, zusammenfassung].filter(Boolean).join("\n"),
      faelligAm: terminAm ? terminAm.slice(0, 10) : plusTage(7), zustaendigId: n.id, bezugArt: null, bezugId: null, status: "offen", erstelltVon: n.id, erstelltAm: jetzt(), erledigtAm: null, erledigtVon: null, erinnertAm: null, quelle: "gemeinde_screening", gemeindeSchluessel: s,
    };
    db.aufgaben.push(t);
    a.aufgabeId = t.id;
    g.uebergabe = { am: jetzt(), vonId: n.id, organisationId: org.id, orgNeu, aktivitaetId: a.id, aufgabeId: t.id, terminAm };
    g.geaendertAm = jetzt();
    W.protokoll(db, n, "crm", "organisation", org.id, `Gemeinde ${g.name} aus dem Screening an die Kommune-Ansprache übergeben`);
    return { ok: true, organisationId: org.id, aktivitaetId: a.id, aufgabeId: t.id, orgNeu };
  });
}

/** Übergabe zurücknehmen (irrtümlich) – nur Leitung: entfernt Aktivität, Aufgabe und eine dabei neu angelegte Organisation */
export async function uebergabeZuruecknehmen(n, schluessel) {
  schreibRecht(n);
  if (!unterrollen(n).includes("leitung")) throw new PlattformFehler(403, "Nur die Leitung kann eine Übergabe zurücknehmen.", "recht");
  const s = schluesselPruefen(schluessel);
  return boAendern((db) => {
    const g = gemSicher(db)[s];
    const u = g?.uebergabe;
    if (!u) throw nichtGefunden("Keine Übergabe vorhanden.");
    db.bo.aktivitaeten = db.bo.aktivitaeten.filter((x) => x.id !== u.aktivitaetId);
    db.aufgaben = (db.aufgaben || []).filter((x) => x.id !== u.aufgabeId);
    if (u.orgNeu && !db.bo.aktivitaeten.some((x) => x.organisationId === u.organisationId) && !db.bo.kontakte.some((k) => k.organisationId === u.organisationId)) db.bo.organisationen = db.bo.organisationen.filter((o) => o.id !== u.organisationId);
    g.uebergabe = null;
    W.protokoll(db, n, "crm", "gemeinde", s, `Übergabe an Kommune-Ansprache zurückgenommen`);
    return { ok: true };
  });
}

/** Gepflegte Angaben einer Gemeinde vollständig entfernen (nur Leitung; z. B. Testdaten) */
export async function gemeindeZuruecksetzen(n, schluessel) {
  schreibRecht(n);
  if (!unterrollen(n).includes("leitung")) throw new PlattformFehler(403, "Nur die Leitung.", "recht");
  const s = schluesselPruefen(schluessel);
  return boAendern((db) => {
    const gem = gemSicher(db);
    v.pflicht(!gem[s]?.uebergabe, "Erst die Übergabe zurücknehmen.");
    delete gem[s];
    W.protokoll(db, n, "aendern", "gemeinde", s, "Gemeinde-Screening: gepflegte Angaben entfernt");
    return { ok: true };
  });
}
