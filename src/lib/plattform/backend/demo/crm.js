// src/lib/plattform/backend/demo/crm.js
//
// CRM im Demo-Backend: Kontakte und Organisationen (auch ohne Portal-Konto), Rollen/Tags,
// Beziehungen zu Vorgängen/Flächen/Projekten/Interessen, Aktivitäten (Anruf, Termin, E-Mail,
// Notiz) mit Wiedervorlage (legt eine Backoffice-Aufgabe an), Verlauf je Kontakt, Dubletten
// (Erkennung + Zusammenführen). Leads aus /api/anfrage werden automatisch zu Kontakten
// (crmAusVorgang, aufgerufen über das Ereignis „vorgang_neu“).

import * as v from "../../validierung";
import { konflikt, nichtGefunden, ungueltig } from "../../fehler";
import { AUFGABE_BEZUG_ARTEN, LAENDER, VORGANG_TYPEN } from "../../konstanten";
import { PROZESSE, statusLabel } from "../../prozesse";
import { AKTIVITAET_TYPEN, BEZUG_ROLLEN, CRM_ROLLE_FUER_KONTO, CRM_ROLLE_FUER_TYP, KONTAKT_ROLLEN, ORG_ARTEN, dublettenFinden, dublettenScore, normEmail, normText } from "../../crm";
import { jetzt, neueId } from "./hilfen";
import { W, adminPfad, boAendern, boLesen, kurzKonto, nameVon, nutzerVon, objektTitel, objektVon, rechtNoetig, tagsVon } from "./bo-kern";

const BEZUG_ARTEN_CRM = ["vorgang", "flaeche", "projekt", "interesse"];
const tag = () => new Date().toLocaleDateString("sv-SE", { timeZone: "Europe/Vienna" });
const DATUM = /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/;

function tagsBereinigen(t) {
  const liste = Array.isArray(t) ? t : String(t || "").split(",");
  return [...new Set(liste.map((x) => v.text(x, 40)).filter((x) => x.length >= 2))].slice(0, 20);
}

const orgName = (db) => (id) => db.bo.organisationen.find((o) => o.id === id)?.name || "";

function kontaktDaten(d, basis = {}) {
  const k = {
    anrede: v.auswahl(d.anrede, ["", "Frau", "Herr", "Divers"], basis.anrede || ""),
    titel: v.text(d.titel ?? basis.titel, 40),
    vorname: v.text(d.vorname ?? basis.vorname, 80),
    nachname: v.text(d.nachname ?? basis.nachname, 80),
    firma: v.text(d.firma ?? basis.firma, 120),
    funktion: v.text(d.funktion ?? basis.funktion, 80),
    email: d.email !== undefined ? v.email(d.email) : basis.email || "",
    telefon: v.text(d.telefon ?? basis.telefon, 40),
    plz: d.plz !== undefined ? v.plz(d.plz) : basis.plz || "",
    ort: v.text(d.ort ?? basis.ort, 80),
    land: v.auswahl(d.land ?? basis.land, LAENDER, basis.land || ""),
    organisationId: d.organisationId !== undefined ? v.kennung(d.organisationId) || null : basis.organisationId || null,
    rollen: d.rollen !== undefined ? v.mehrfach(d.rollen, KONTAKT_ROLLEN) : basis.rollen || [],
    tags: d.tags !== undefined ? tagsBereinigen(d.tags) : basis.tags || [],
    notiz: d.notiz !== undefined ? v.mehrzeilig(d.notiz, 3000) : basis.notiz || "",
    zustaendigId: d.zustaendigId !== undefined ? v.kennung(d.zustaendigId) || null : basis.zustaendigId || null,
  };
  if (d.email !== undefined && d.email && !k.email) throw ungueltig("Bitte eine gültige E-Mail-Adresse angeben (oder leer lassen).");
  return k;
}

function orgDaten(d, basis = {}) {
  return {
    name: v.text(d.name ?? basis.name, 160),
    art: v.auswahl(d.art ?? basis.art, ORG_ARTEN, basis.art || "sonstige"),
    strasse: v.text(d.strasse ?? basis.strasse, 120),
    plz: d.plz !== undefined ? v.plz(d.plz) : basis.plz || "",
    ort: v.text(d.ort ?? basis.ort, 80),
    land: v.auswahl(d.land ?? basis.land, LAENDER, basis.land || "DE"),
    bundesland: v.text(d.bundesland ?? basis.bundesland, 60),
    website: v.text(d.website ?? basis.website, 160).replace(/^javascript:/i, ""),
    telefon: v.text(d.telefon ?? basis.telefon, 40),
    email: d.email !== undefined ? v.email(d.email) : basis.email || "",
    tags: d.tags !== undefined ? tagsBereinigen(d.tags) : basis.tags || [],
    notiz: d.notiz !== undefined ? v.mehrzeilig(d.notiz, 3000) : basis.notiz || "",
  };
}

function zustaendigPruefen(db, id) {
  if (!id) return;
  const z = nutzerVon(db, id);
  v.pflicht(z && z.aktiv && z.rollen.includes("admin"), "Zuständig kann nur ein aktives Backoffice-Konto sein.");
}

// ---------------------------------------------------------------- Lead aus Anfrage / Konto

export function kontaktSuchen(db, { email, nutzerId }) {
  const e = normEmail(email);
  return db.bo.kontakte.find((k) => (e && normEmail(k.email) === e) || (nutzerId && k.nutzerId === nutzerId)) || null;
}

function bezugHinzu(k, art, id, rolle) {
  k.bezuege = k.bezuege || [];
  if (!k.bezuege.some((b) => b.art === art && b.id === id)) k.bezuege.push({ art, id, rolle: rolle || "Ansprechpartner", am: jetzt() });
}

export function orgFinden(db, name) {
  const n = normText(name);
  return n.length >= 3 ? db.bo.organisationen.find((o) => normText(o.name) === n) || null : null;
}

function aktivitaetIntern(db, { kontaktId = null, organisationId = null, typ = "notiz", betreff, text = "", bezugArt = null, bezugId = null, vonId = null, system = false, am }) {
  const a = { id: neueId("KA"), kontaktId, organisationId, typ, betreff: v.text(betreff, 160), text: v.mehrzeilig(text, 3000), am: am || jetzt(), bezugArt, bezugId, vonId, system, aufgabeId: null, wiedervorlageAm: null, erstelltAm: jetzt() };
  db.bo.aktivitaeten.push(a);
  if (db.bo.aktivitaeten.length > 20000) db.bo.aktivitaeten.splice(0, db.bo.aktivitaeten.length - 20000);
  return a;
}

/** Neuer Vorgang → Kontakt anlegen bzw. zuordnen (Dublette per E-Mail wird nicht neu angelegt) */
export function crmAusVorgang(db, vg) {
  if (!vg?.email) return null;
  const kt = vg.kontakt || {};
  let k = kontaktSuchen(db, { email: vg.email, nutzerId: vg.nutzerId });
  const rolle = CRM_ROLLE_FUER_TYP[vg.typ] || "sonstige";
  if (!k) {
    k = {
      id: neueId("K"),
      anrede: ["Frau", "Herr"].includes(kt.anrede) ? kt.anrede : "",
      titel: "",
      vorname: kt.vorname || "",
      nachname: kt.nachname || "",
      firma: kt.firma || "",
      funktion: "",
      email: vg.email,
      telefon: kt.telefon || "",
      plz: kt.plz || "",
      ort: kt.ort || "",
      land: kt.land || "",
      organisationId: null,
      rollen: [rolle],
      tags: [],
      notiz: "",
      zustaendigId: null,
      nutzerId: vg.nutzerId || null,
      quelle: "anfrage",
      herkunft: vg.herkunft?.kanal || "",
      bezuege: [],
      erstelltAm: jetzt(),
      geaendertAm: jetzt(),
    };
    db.bo.kontakte.push(k);
  } else {
    for (const f of ["vorname", "nachname", "firma", "telefon", "plz", "ort", "land"]) if (!k[f] && kt[f]) k[f] = kt[f];
    if (!k.rollen.includes(rolle)) k.rollen.push(rolle);
    if (!k.nutzerId && vg.nutzerId) k.nutzerId = vg.nutzerId;
    k.geaendertAm = jetzt();
  }
  if (vg.typ === "kommune" && kt.firma && !k.organisationId) {
    let org = orgFinden(db, kt.firma);
    if (!org) {
      org = { id: neueId("KO"), ...orgDaten({ name: kt.firma, art: vg.daten?.absender === "stadtwerk" ? "stadtwerk" : "gemeinde", plz: kt.plz, ort: kt.ort, land: kt.land || "DE" }), erstelltAm: jetzt(), geaendertAm: jetzt() };
      db.bo.organisationen.push(org);
    }
    k.organisationId = org.id;
  }
  bezugHinzu(k, "vorgang", vg.id, "Anfragender");
  if (vg.flaecheId) bezugHinzu(k, "flaeche", vg.flaecheId, "Eigentümer");
  aktivitaetIntern(db, { kontaktId: k.id, typ: "notiz", system: true, betreff: `Anfrage eingegangen: ${VORGANG_TYPEN[vg.typ] || vg.typ}`, text: vg.herkunft?.kanal ? `Herkunft: ${vg.herkunft.kanal}${vg.herkunft.utm_campaign ? ` · Kampagne ${vg.herkunft.utm_campaign}` : ""}` : "", bezugArt: "vorgang", bezugId: vg.id });
  return k;
}

/** Kontakt zu einem Portal-Konto (Seed, Registrierung) */
export function crmAusKonto(db, u) {
  if (!u?.email || u.rollen?.includes("admin")) return null;
  let k = kontaktSuchen(db, { email: u.email, nutzerId: u.id });
  const rollen = (u.rollen || []).map((r) => CRM_ROLLE_FUER_KONTO[r]).filter(Boolean);
  if (!k) {
    k = { id: neueId("K"), anrede: "", titel: "", vorname: u.vorname || "", nachname: u.nachname || "", firma: u.firma || "", funktion: "", email: u.email, telefon: u.telefon || "", plz: "", ort: "", land: "", organisationId: null, rollen, tags: [], notiz: "", zustaendigId: null, nutzerId: u.id, quelle: "konto", herkunft: "", bezuege: [], erstelltAm: u.erstelltAm || jetzt(), geaendertAm: jetzt() };
    db.bo.kontakte.push(k);
  } else {
    k.nutzerId = k.nutzerId || u.id;
    for (const r of rollen) if (!k.rollen.includes(r)) k.rollen.push(r);
  }
  const art = { vorgang: "nutzerId", flaeche: "nutzerId", projekt: "anbieterId", interesse: "investorId" };
  for (const [a, feld] of Object.entries(art)) {
    for (const o of db[{ vorgang: "vorgaenge", flaeche: "flaechen", projekt: "projekte", interesse: "interessen" }[a]]) {
      if (o[feld] === u.id) bezugHinzu(k, a, o.id, { vorgang: "Anfragender", flaeche: "Eigentümer", projekt: "Anbieter", interesse: "Investor" }[a]);
    }
  }
  return k;
}

// ---------------------------------------------------------------- Ausgabe

function bezugAusgabe(db, b) {
  const o = objektVon(db, b.art, b.id);
  return { ...b, titel: o ? objektTitel(db, b.art, o) : `${b.art} ${b.id} (nicht mehr vorhanden)`, link: o ? adminPfad(b.art, o) : null, status: o?.status || null, statusLabel: o ? statusLabel(b.art, o.status) : "", tags: tagsVon(db, b.art, b.id) };
}

function kontaktListenEintrag(db, k, dublettenIds) {
  const akt = db.bo.aktivitaeten.filter((a) => a.kontaktId === k.id);
  const letzte = akt.reduce((m, a) => (a.am > (m?.am || "") ? a : m), null);
  const offen = akt.filter((a) => a.aufgabeId && db.aufgaben.find((x) => x.id === a.aufgabeId)?.status === "offen");
  return {
    id: k.id,
    anrede: k.anrede,
    vorname: k.vorname,
    nachname: k.nachname,
    firma: k.firma,
    funktion: k.funktion,
    email: k.email,
    telefon: k.telefon,
    plz: k.plz,
    ort: k.ort,
    land: k.land,
    rollen: k.rollen,
    tags: k.tags,
    organisationId: k.organisationId,
    organisation: k.organisationId ? db.bo.organisationen.find((o) => o.id === k.organisationId)?.name || "" : "",
    nutzerId: k.nutzerId || null,
    quelle: k.quelle,
    herkunft: k.herkunft || "",
    zustaendig: kurzKonto(nutzerVon(db, k.zustaendigId)),
    bezuege: (k.bezuege || []).length,
    letzteAktivitaet: letzte ? { typ: letzte.typ, betreff: letzte.betreff, am: letzte.am } : null,
    wiedervorlage: offen.length ? offen.map((a) => db.aufgaben.find((x) => x.id === a.aufgabeId)?.faelligAm).sort()[0] : null,
    dublette: dublettenIds?.has(k.id) || false,
    erstelltAm: k.erstelltAm,
    geaendertAm: k.geaendertAm,
  };
}

function aktivitaetAusgabe(db, a) {
  const auf = a.aufgabeId ? db.aufgaben.find((x) => x.id === a.aufgabeId) : null;
  const k = a.kontaktId ? db.bo.kontakte.find((x) => x.id === a.kontaktId) : null;
  const o = a.bezugArt ? objektVon(db, a.bezugArt, a.bezugId) : null;
  return {
    ...a,
    von: a.system ? "System" : nameVon(db, a.vonId) || "–",
    kontakt: k ? { id: k.id, name: [k.vorname, k.nachname].filter(Boolean).join(" ") } : null,
    bezugTitel: o ? objektTitel(db, a.bezugArt, o) : "",
    bezugLink: o ? adminPfad(a.bezugArt, o) : null,
    wiedervorlage: auf ? { id: auf.id, faelligAm: auf.faelligAm, status: auf.status, zustaendig: nameVon(db, auf.zustaendigId) } : null,
  };
}

// ---------------------------------------------------------------- Operationen

export async function crmKontakte(n, { q, rolle, tag: t, organisationId, zustaendigId, quelle, nurDubletten, limit = 500 } = {}) {
  rechtNoetig(n, "crm", 1);
  const db = await boLesen();
  let liste = db.bo.kontakte;
  if (rolle) liste = liste.filter((k) => k.rollen.includes(rolle));
  if (t) liste = liste.filter((k) => k.tags.some((x) => x.toLowerCase() === String(t).toLowerCase()));
  if (organisationId) liste = liste.filter((k) => k.organisationId === organisationId);
  if (zustaendigId) liste = liste.filter((k) => k.zustaendigId === zustaendigId);
  if (quelle) liste = liste.filter((k) => k.quelle === quelle);
  if (q) {
    const s = normText(q);
    const roh = String(q).toLowerCase();
    liste = liste.filter((k) => {
      const org = orgName(db)(k.organisationId);
      return normText([k.vorname, k.nachname, k.firma, org, k.ort, k.plz, (k.tags || []).join(" ")].join(" ")).includes(s) || (k.email || "").includes(roh) || k.id === String(q).toUpperCase() || (k.telefon || "").replace(/\D/g, "").includes(String(q).replace(/\D/g, "") || "#");
    });
  }
  const dubletten = new Set(dublettenFinden(db.bo.kontakte, { orgName: orgName(db) }).flatMap((p) => [p.a.id, p.b.id]));
  if (nurDubletten) liste = liste.filter((k) => dubletten.has(k.id));
  const alleTags = [...new Set(db.bo.kontakte.flatMap((k) => k.tags))].sort((a, b) => a.localeCompare(b, "de"));
  const eintraege = [...liste]
    .sort((a, b) => String(b.geaendertAm).localeCompare(String(a.geaendertAm)))
    .slice(0, Math.min(2000, Number(limit) || 500))
    .map((k) => kontaktListenEintrag(db, k, dubletten));
  return { kontakte: eintraege, gesamt: liste.length, tags: alleTags, dubletten: dubletten.size };
}

export async function crmKontakt(n, id) {
  rechtNoetig(n, "crm", 1);
  const db = await boLesen();
  const k = db.bo.kontakte.find((x) => x.id === id);
  if (!k) throw nichtGefunden("Kontakt nicht gefunden.");
  const org = k.organisationId ? db.bo.organisationen.find((o) => o.id === k.organisationId) : null;
  const bezuege = (k.bezuege || []).map((b) => bezugAusgabe(db, b));
  const aktivitaeten = db.bo.aktivitaeten.filter((a) => a.kontaktId === k.id).map((a) => aktivitaetAusgabe(db, a));
  const dubletten = db.bo.kontakte
    .filter((x) => x.id !== k.id)
    .map((x) => ({ x, ...dublettenScore(k, x, orgName(db)) }))
    .filter((r) => r.score >= 60)
    .map((r) => ({ id: r.x.id, name: [r.x.vorname, r.x.nachname].filter(Boolean).join(" "), email: r.x.email, plz: r.x.plz, score: r.score, gruende: r.gruende }));
  return { ...kontaktListenEintrag(db, k), notiz: k.notiz, titel: k.titel, organisationObjekt: org ? { id: org.id, name: org.name, art: org.art } : null, konto: kurzKonto(nutzerVon(db, k.nutzerId)), bezuegeListe: bezuege, aktivitaeten: aktivitaeten.sort((a, b) => b.am.localeCompare(a.am)), verlauf: verlaufFuer(db, k, aktivitaeten), dubletten, zustaendigId: k.zustaendigId };
}

/** Verlauf je Kontakt: CRM-Aktivitäten, Statuswechsel und Nachrichten der verknüpften Objekte, Protokoll */
function verlaufFuer(db, k, aktivitaeten) {
  const eintraege = aktivitaeten.map((a) => ({ am: a.am, art: "aktivitaet", typ: a.typ, titel: `${AKTIVITAET_TYPEN[a.typ] || a.typ}: ${a.betreff}`, text: a.text, von: a.von, link: a.bezugLink }));
  for (const b of k.bezuege || []) {
    const o = objektVon(db, b.art, b.id);
    if (!o) continue;
    const titel = objektTitel(db, b.art, o);
    for (const e of o.statusVerlauf || []) {
      eintraege.push({ am: e.am, art: "status", typ: b.art, titel: `${PROZESSE[b.art]?.label || b.art} „${titel}“: ${statusLabel(b.art, e.status)}`, text: e.kommentar || "", von: e.vonRolle === "system" ? "System" : nameVon(db, e.vonId) || (e.vonRolle === "eigentuemer" ? "Kontakt" : "Backoffice"), link: adminPfad(b.art, o) });
    }
    for (const m of db.nachrichten.filter((x) => x.bezugArt === b.art && x.bezugId === b.id && !x.system)) {
      eintraege.push({ am: m.am, art: "nachricht", typ: b.art, titel: `Nachricht im Thread „${titel}“`, text: m.text.slice(0, 240), von: m.vonAdmin ? nameVon(db, m.vonId) || "Backoffice" : nameVon(db, m.vonId) || "Eigentümer", link: adminPfad(b.art, o) });
    }
  }
  const ids = new Set((k.bezuege || []).map((b) => b.id));
  for (const a of db.aktivitaeten) {
    if (!ids.has(a.objektId) || ["status", "nachricht", "login"].includes(a.aktion)) continue;
    eintraege.push({ am: a.am, art: "protokoll", typ: a.aktion, titel: a.text, text: "", von: nameVon(db, a.nutzerId) || "System", link: null });
  }
  return eintraege.sort((a, b) => String(b.am).localeCompare(String(a.am))).slice(0, 300);
}

export async function crmKontaktSpeichern(n, id, daten = {}) {
  rechtNoetig(n, "crm", 2);
  return boAendern((db) => {
    const alt = id ? db.bo.kontakte.find((x) => x.id === id) : null;
    if (id && !alt) throw nichtGefunden("Kontakt nicht gefunden.");
    const k = kontaktDaten(daten, alt || {});
    v.pflicht(k.nachname || k.firma, "Bitte mindestens Nachname oder Firma angeben.");
    if (k.organisationId) v.pflicht(db.bo.organisationen.some((o) => o.id === k.organisationId), "Organisation nicht gefunden.");
    zustaendigPruefen(db, k.zustaendigId);
    if (k.email) {
      const doppelt = db.bo.kontakte.find((x) => x.id !== id && normEmail(x.email) === k.email);
      if (doppelt && !daten.trotzdem) throw konflikt(`Es gibt bereits einen Kontakt mit dieser E-Mail-Adresse (${[doppelt.vorname, doppelt.nachname].join(" ")}, ${doppelt.id}).`);
    }
    let erg;
    if (alt) {
      Object.assign(alt, k, { geaendertAm: jetzt() });
      erg = alt;
      W.protokoll(db, n, "crm", "kontakt", alt.id, `Kontakt bearbeitet: ${[k.vorname, k.nachname].filter(Boolean).join(" ")}`);
    } else {
      erg = { id: neueId("K"), ...k, nutzerId: null, quelle: "manuell", herkunft: "", bezuege: [], erstelltAm: jetzt(), geaendertAm: jetzt() };
      const konto = k.email ? db.nutzer.find((u) => u.email === k.email) : null;
      if (konto) erg.nutzerId = konto.id;
      db.bo.kontakte.push(erg);
      W.protokoll(db, n, "crm", "kontakt", erg.id, `Kontakt angelegt: ${[k.vorname, k.nachname].filter(Boolean).join(" ") || k.firma}`);
    }
    return kontaktListenEintrag(db, erg);
  });
}

export async function crmBeziehung(n, kontaktId, { art, id, rolle, entfernen = false } = {}) {
  rechtNoetig(n, "crm", 2);
  return boAendern((db) => {
    const k = db.bo.kontakte.find((x) => x.id === kontaktId);
    if (!k) throw nichtGefunden("Kontakt nicht gefunden.");
    v.pflicht(BEZUG_ARTEN_CRM.includes(art), "Unbekannte Objektart.");
    const o = objektVon(db, art, v.kennung(id));
    if (!o) throw nichtGefunden("Objekt nicht gefunden.");
    k.bezuege = k.bezuege || [];
    if (entfernen) k.bezuege = k.bezuege.filter((b) => !(b.art === art && b.id === o.id));
    else {
      const r = v.auswahl(rolle, BEZUG_ROLLEN, "Ansprechpartner");
      const b = k.bezuege.find((x) => x.art === art && x.id === o.id);
      if (b) b.rolle = r;
      else k.bezuege.push({ art, id: o.id, rolle: r, am: jetzt() });
    }
    k.geaendertAm = jetzt();
    W.protokoll(db, n, "crm", art, o.id, `${entfernen ? "Beziehung entfernt" : "Beziehung gesetzt"}: Kontakt ${[k.vorname, k.nachname].filter(Boolean).join(" ")}`);
    return { ok: true, bezuege: k.bezuege.map((b) => bezugAusgabe(db, b)) };
  });
}

export async function crmOrganisationen(n, { q, art } = {}) {
  rechtNoetig(n, "crm", 1);
  const db = await boLesen();
  let liste = db.bo.organisationen;
  if (art) liste = liste.filter((o) => o.art === art);
  if (q) {
    const s = normText(q);
    liste = liste.filter((o) => normText([o.name, o.ort, o.plz, o.bundesland, (o.tags || []).join(" ")].join(" ")).includes(s));
  }
  return liste
    .map((o) => ({ ...o, kontakte: db.bo.kontakte.filter((k) => k.organisationId === o.id).length, aktivitaeten: db.bo.aktivitaeten.filter((a) => a.organisationId === o.id || db.bo.kontakte.some((k) => k.organisationId === o.id && k.id === a.kontaktId)).length }))
    .sort((a, b) => a.name.localeCompare(b.name, "de"));
}

export async function crmOrganisation(n, id) {
  rechtNoetig(n, "crm", 1);
  const db = await boLesen();
  const o = db.bo.organisationen.find((x) => x.id === id);
  if (!o) throw nichtGefunden("Organisation nicht gefunden.");
  const kontakte = db.bo.kontakte.filter((k) => k.organisationId === o.id);
  const ids = new Set(kontakte.map((k) => k.id));
  const aktivitaeten = db.bo.aktivitaeten.filter((a) => a.organisationId === o.id || ids.has(a.kontaktId)).map((a) => aktivitaetAusgabe(db, a)).sort((a, b) => b.am.localeCompare(a.am));
  const bezuege = [];
  const gesehen = new Set();
  for (const k of kontakte) for (const b of k.bezuege || []) if (!gesehen.has(b.id)) (gesehen.add(b.id), bezuege.push({ ...bezugAusgabe(db, b), kontakt: [k.vorname, k.nachname].filter(Boolean).join(" ") }));
  return { ...o, kontakteListe: kontakte.map((k) => kontaktListenEintrag(db, k)), aktivitaeten, bezuege };
}

export async function crmOrganisationSpeichern(n, id, daten = {}) {
  rechtNoetig(n, "crm", 2);
  return boAendern((db) => {
    const alt = id ? db.bo.organisationen.find((x) => x.id === id) : null;
    if (id && !alt) throw nichtGefunden("Organisation nicht gefunden.");
    const o = orgDaten(daten, alt || {});
    v.pflicht(o.name.length >= 2, "Bitte einen Namen angeben.");
    const doppelt = db.bo.organisationen.find((x) => x.id !== id && normText(x.name) === normText(o.name) && x.plz === o.plz);
    if (doppelt) throw konflikt(`Diese Organisation gibt es bereits (${doppelt.id}).`);
    if (alt) {
      Object.assign(alt, o, { geaendertAm: jetzt() });
      W.protokoll(db, n, "crm", "organisation", alt.id, `Organisation bearbeitet: ${o.name}`);
      return alt;
    }
    const neu = { id: neueId("KO"), ...o, erstelltAm: jetzt(), geaendertAm: jetzt() };
    db.bo.organisationen.push(neu);
    W.protokoll(db, n, "crm", "organisation", neu.id, `Organisation angelegt: ${o.name}`);
    return neu;
  });
}

/** Aktivität erfassen (Anruf, Termin, E-Mail, Notiz) – optional mit Wiedervorlage (= Aufgabe) */
export async function crmAktivitaetAnlegen(n, daten = {}) {
  rechtNoetig(n, "crm", 2);
  return boAendern((db) => {
    const typ = v.auswahl(daten.typ, AKTIVITAET_TYPEN, "");
    v.pflicht(typ, "Bitte die Art der Aktivität wählen.");
    const betreff = v.text(daten.betreff, 160);
    v.pflicht(betreff.length >= 3, "Bitte einen Betreff (mind. 3 Zeichen) angeben.");
    const kontaktId = v.kennung(daten.kontaktId) || null;
    const organisationId = v.kennung(daten.organisationId) || null;
    const k = kontaktId ? db.bo.kontakte.find((x) => x.id === kontaktId) : null;
    if (kontaktId && !k) throw nichtGefunden("Kontakt nicht gefunden.");
    if (organisationId && !db.bo.organisationen.some((o) => o.id === organisationId)) throw nichtGefunden("Organisation nicht gefunden.");
    v.pflicht(k || organisationId || daten.bezugArt, "Aktivität braucht einen Kontakt, eine Organisation oder ein Objekt.");
    let bezugArt = null;
    let bezugId = null;
    if (daten.bezugArt) {
      v.pflicht(BEZUG_ARTEN_CRM.includes(daten.bezugArt), "Unbekannte Objektart.");
      const o = objektVon(db, daten.bezugArt, v.kennung(daten.bezugId));
      if (!o) throw nichtGefunden("Objekt nicht gefunden.");
      bezugArt = daten.bezugArt;
      bezugId = o.id;
      if (k) bezugHinzu(k, bezugArt, bezugId, "Ansprechpartner");
    }
    let am = jetzt();
    if (daten.am) {
      const d = new Date(daten.am);
      v.pflicht(!Number.isNaN(d.getTime()) && Math.abs(d.getTime() - Date.now()) < 400 * 86400e3, "Zeitpunkt ungültig.");
      am = d.toISOString();
    }
    const a = aktivitaetIntern(db, { kontaktId, organisationId: organisationId || k?.organisationId || null, typ, betreff, text: daten.text, bezugArt, bezugId, vonId: n.id, am });
    a.dauerMin = v.zahl(daten.dauerMin, { min: 0, max: 600, stellen: 0 });
    a.ergebnis = v.text(daten.ergebnis, 160);
    if (daten.wiedervorlageAm) {
      const f = v.text(daten.wiedervorlageAm, 10);
      v.pflicht(DATUM.test(f) && !Number.isNaN(new Date(`${f}T12:00:00Z`).getTime()) && new Date(`${f}T12:00:00Z`).toISOString().slice(0, 10) === f, "Wiedervorlage: gültiges Datum angeben.");
      const zId = v.kennung(daten.zustaendigId) || k?.zustaendigId || n.id;
      zustaendigPruefen(db, zId);
      const name = k ? [k.vorname, k.nachname].filter(Boolean).join(" ") : db.bo.organisationen.find((o) => o.id === organisationId)?.name || "";
      const auf = {
        id: neueId("AF"),
        titel: v.text(`Wiedervorlage: ${betreff}${name ? ` (${name})` : ""}`, 160),
        beschreibung: v.mehrzeilig(`${AKTIVITAET_TYPEN[typ]} vom ${new Date(am).toLocaleDateString("de-DE", { timeZone: "Europe/Vienna" })}${a.text ? `: ${a.text}` : ""}\nCRM: /portal/admin/crm/${k ? k.id : `organisation/${organisationId}`}`, 2000),
        faelligAm: f,
        zustaendigId: zId,
        bezugArt: AUFGABE_BEZUG_ARTEN.includes(bezugArt) ? bezugArt : null,
        bezugId: AUFGABE_BEZUG_ARTEN.includes(bezugArt) ? bezugId : null,
        status: "offen",
        erstelltVon: n.id,
        erstelltAm: jetzt(),
        erledigtAm: null,
        erledigtVon: null,
        erinnertAm: null,
        crmKontaktId: k?.id || null,
      };
      db.aufgaben.push(auf);
      a.aufgabeId = auf.id;
      a.wiedervorlageAm = f;
      if (zId !== n.id) {
        const z = nutzerVon(db, zId);
        W.benachrichtigen?.(db, z, { art: "aufgabe", titel: `Neue Wiedervorlage: ${auf.titel}`, text: `Fällig ${f.split("-").reverse().join(".")} · von ${nameVon(db, n.id)}`, link: "/portal/admin/aufgaben", objektArt: auf.bezugArt, objektId: auf.bezugId });
      }
    }
    if (k) k.geaendertAm = jetzt();
    W.protokoll(db, n, "crm", bezugArt || (k ? "kontakt" : "organisation"), bezugId || kontaktId || organisationId, `${AKTIVITAET_TYPEN[typ]}: ${betreff}${a.wiedervorlageAm ? ` (Wiedervorlage ${a.wiedervorlageAm})` : ""}`);
    return aktivitaetAusgabe(db, a);
  });
}

export async function crmDubletten(n) {
  rechtNoetig(n, "crm", 1);
  const db = await boLesen();
  return dublettenFinden(db.bo.kontakte, { orgName: orgName(db) }).slice(0, 200).map((p) => ({ score: p.score, gruende: p.gruende, a: kontaktListenEintrag(db, p.a), b: kontaktListenEintrag(db, p.b) }));
}

/** Quelle in Ziel zusammenführen: leere Felder ergänzen, Rollen/Tags/Bezüge vereinigen, Aktivitäten umhängen */
export async function crmZusammenfuehren(n, { zielId, quelleId } = {}) {
  rechtNoetig(n, "crm", 2);
  return boAendern((db) => {
    v.pflicht(zielId && quelleId && zielId !== quelleId, "Bitte zwei verschiedene Kontakte wählen.");
    const z = db.bo.kontakte.find((x) => x.id === zielId);
    const q = db.bo.kontakte.find((x) => x.id === quelleId);
    if (!z || !q) throw nichtGefunden("Kontakt nicht gefunden.");
    if (z.nutzerId && q.nutzerId && z.nutzerId !== q.nutzerId) throw konflikt("Beide Kontakte gehören zu verschiedenen Portal-Konten – bitte nicht zusammenführen.");
    for (const f of ["anrede", "titel", "vorname", "nachname", "firma", "funktion", "email", "telefon", "plz", "ort", "land", "organisationId", "zustaendigId", "nutzerId", "herkunft"]) if (!z[f] && q[f]) z[f] = q[f];
    z.rollen = [...new Set([...(z.rollen || []), ...(q.rollen || [])])];
    z.tags = [...new Set([...(z.tags || []), ...(q.tags || [])])];
    for (const b of q.bezuege || []) bezugHinzu(z, b.art, b.id, b.rolle);
    if (q.notiz) z.notiz = [z.notiz, `Aus ${q.id}: ${q.notiz}`].filter(Boolean).join("\n\n").slice(0, 3000);
    for (const a of db.bo.aktivitaeten) if (a.kontaktId === q.id) a.kontaktId = z.id;
    for (const a of db.aufgaben) if (a.crmKontaktId === q.id) a.crmKontaktId = z.id;
    db.bo.kontakte = db.bo.kontakte.filter((x) => x.id !== q.id);
    z.geaendertAm = jetzt();
    aktivitaetIntern(db, { kontaktId: z.id, typ: "notiz", system: true, betreff: `Dublette zusammengeführt: ${[q.vorname, q.nachname].filter(Boolean).join(" ")} (${q.id})`, text: [q.email, q.plz, q.ort].filter(Boolean).join(" · "), vonId: n.id });
    W.protokoll(db, n, "crm", "kontakt", z.id, `Kontakt ${q.id} in ${z.id} zusammengeführt`);
    return kontaktListenEintrag(db, z);
  });
}

/** Massenaktion: Tag setzen/entfernen, Zuständigen oder Rolle setzen für mehrere Kontakte */
export async function crmMassenaktion(n, { ids, tag: t, tagEntfernen, zustaendigId, rolle } = {}) {
  rechtNoetig(n, "crm", 2);
  return boAendern((db) => {
    const liste = (Array.isArray(ids) ? ids : []).map(v.kennung).filter(Boolean).slice(0, 500);
    v.pflicht(liste.length, "Bitte Kontakte auswählen.");
    const tagSauber = t ? v.text(t, 40) : "";
    if (zustaendigId) zustaendigPruefen(db, zustaendigId);
    const r = rolle ? v.auswahl(rolle, KONTAKT_ROLLEN, "") : "";
    let geaendert = 0;
    for (const k of db.bo.kontakte.filter((x) => liste.includes(x.id))) {
      if (tagSauber && !tagEntfernen && !k.tags.includes(tagSauber)) k.tags.push(tagSauber);
      if (tagSauber && tagEntfernen) k.tags = k.tags.filter((x) => x !== tagSauber);
      if (zustaendigId !== undefined && zustaendigId !== null) k.zustaendigId = zustaendigId || null;
      if (r && !k.rollen.includes(r)) k.rollen.push(r);
      k.geaendertAm = jetzt();
      geaendert++;
    }
    W.protokoll(db, n, "crm", "kontakt", liste[0], `Massenaktion für ${geaendert} Kontakt(e)${tagSauber ? `: Tag ${tagEntfernen ? "entfernt" : "gesetzt"} „${tagSauber}“` : ""}${zustaendigId ? `, zuständig ${nameVon(db, zustaendigId)}` : ""}${r ? `, Rolle ${KONTAKT_ROLLEN[r]}` : ""}`);
    return { ok: true, geaendert };
  });
}


