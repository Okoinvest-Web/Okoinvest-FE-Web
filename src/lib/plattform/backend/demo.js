// src/lib/plattform/backend/demo.js
//
// Demo-Backend: vollständige Referenz-Implementierung der Plattform-Schnittstelle
// (siehe backend/index.js und docs/API.md) auf einer lokalen JSON-Datei.
// Rechte (Rolle UND Eigentum) und Zustandsautomaten (prozesse.js) werden HIER
// erzwungen – die API-Routen prüfen zusätzlich vorab Anmeldung und Rolle.

import { PROVISION } from "@/lib/invest/markt";
import {
  BEZUG_ARTEN, DOKUMENT_KATEGORIEN, FLAECHE_NUTZUNG, LAENDER, NDA, NETZANSCHLUSS, PREIS_MODUS, PROJEKT_TYPEN,
  ROLLE_FUER_TYP, ROLLEN_IDS, UPLOAD, VORGANG_TYPEN, BUNDESLAENDER,
} from "../konstanten";
import { BOERSE_STATUS, DATENRAUM_STATUS, OFFENE_STATUS, PROZESSE, pruefeUebergang, statusLabel } from "../prozesse";
import { PlattformFehler, konflikt, nichtGefunden, ungueltig, verboten } from "../fehler";
import * as v from "../validierung";
import { projektOeffentlich, projektVertraulich } from "../oeffentlich";
import { matching } from "../matching";
import { PHASEN } from "@/lib/invest/markt";
import { passwortHash, passwortPruefen } from "../server/passwort";
import { aendern, lesen, seedSetzen, uploadLesen, uploadLoeschen, uploadSchreiben } from "./demo/speicher";
import { seedErstellen } from "./demo/seed";
import { jetzt, neueId, sha256, slugify, zufallsToken } from "./demo/hilfen";

seedSetzen(seedErstellen);

export const name = "demo";

// ================================================================ Helfer

const SAMMLUNG = { vorgang: "vorgaenge", flaeche: "flaechen", projekt: "projekte", interesse: "interessen", provision: "provisionen" };

const istAdmin = (n) => !!n?.rollen?.includes("admin");
const hatRolle = (n, rollen) => istAdmin(n) || rollen.some((r) => n?.rollen?.includes(r));

function rolleNoetig(n, rollen, text) {
  if (!n) throw new PlattformFehler(401, "Bitte melden Sie sich an.");
  if (!hatRolle(n, rollen)) throw verboten(text);
}
function adminNoetig(n) {
  if (!n) throw new PlattformFehler(401, "Bitte melden Sie sich an.");
  if (!istAdmin(n)) throw verboten("Nur für das Backoffice.");
}

function ohneGeheimnis(u) {
  if (!u) return null;
  const { passwortHash: _p, ...rest } = u;
  return rest;
}
const kurz = (u) => (u ? { id: u.id, vorname: u.vorname, nachname: u.nachname, email: u.email, firma: u.firma || "" } : null);
const nutzerById = (db, id) => db.nutzer.find((u) => u.id === id) || null;

function objekt(db, art, id) {
  const liste = db[SAMMLUNG[art]];
  if (!liste) throw ungueltig("Unbekannte Objektart");
  return liste.find((o) => o.id === id) || null;
}

/** Besitzer eines Objekts (Nutzer-ID) */
function besitzer(db, art, o) {
  if (!o) return null;
  if (art === "vorgang" || art === "flaeche") return o.nutzerId || null;
  if (art === "projekt") return o.anbieterId;
  if (art === "interesse") return o.investorId;
  if (art === "provision") return o.anbieterId;
  if (art === "nutzer") return o.id;
  return null;
}

function bezugObjekt(db, art, id) {
  if (art === "nutzer") return nutzerById(db, id);
  return objekt(db, art, id);
}

function darfBezug(db, n, art, id) {
  if (!BEZUG_ARTEN.includes(art)) throw ungueltig("Unbekannter Bezug");
  const o = bezugObjekt(db, art, id);
  if (!o) throw nichtGefunden();
  if (istAdmin(n)) return o;
  if (besitzer(db, art, o) !== n.id) throw verboten();
  return o;
}

function protokoll(db, n, aktion, objektArt, objektId, text, ip = "") {
  db.aktivitaeten.push({ id: neueId("A"), am: jetzt(), nutzerId: n?.id || null, aktion, objektArt, objektId, text: v.text(text, 300), ip: ip || "" });
  if (db.aktivitaeten.length > 5000) db.aktivitaeten.splice(0, db.aktivitaeten.length - 5000);
}

function nachricht(db, { bezugArt, bezugId, vonId, vonAdmin = false, system = false, text }) {
  const m = {
    id: neueId("M"),
    bezugArt,
    bezugId,
    vonId: vonId || null,
    vonAdmin,
    system,
    text: v.mehrzeilig(text, 5000),
    am: jetzt(),
    gelesenNutzer: !vonAdmin && !system ? true : false,
    gelesenAdmin: vonAdmin,
  };
  db.nachrichten.push(m);
  return m;
}

function verlaufEintrag(status, n, rolle, kommentar = "") {
  return { status, am: jetzt(), vonId: n?.id || null, vonRolle: rolle, kommentar: v.mehrzeilig(kommentar, 1000) };
}

function linkZuDemo(db, art, email, link) {
  db.demoLinks.unshift({ am: jetzt(), art, email, link });
  db.demoLinks = db.demoLinks.slice(0, 50);
  console.info(`[plattform-demo] ${art === "reset" ? "Passwort-Link" : "Bestätigungs-Link"} für ${email}: ${link}`);
}

function tokenAnlegen(db, art, nutzerId, stunden) {
  const token = zufallsToken();
  db.tokens = db.tokens.filter((t) => !(t.nutzerId === nutzerId && t.art === art && !t.benutzt));
  db.tokens.push({ hash: sha256(token), art, nutzerId, ablauf: new Date(Date.now() + stunden * 3600e3).toISOString(), benutzt: false });
  return token;
}

function tokenEinloesen(db, art, token) {
  const h = sha256(String(token || ""));
  const t = db.tokens.find((x) => x.hash === h && x.art === art);
  if (!t || t.benutzt || new Date(t.ablauf) < new Date()) throw ungueltig("Der Link ist ungültig oder abgelaufen. Bitte fordern Sie einen neuen an.");
  t.benutzt = true;
  const u = nutzerById(db, t.nutzerId);
  if (!u || !u.aktiv) throw ungueltig("Der Link ist ungültig oder abgelaufen.");
  return u;
}

/** Offene Anfragen mit gleicher (bestätigter) E-Mail dem Konto zuordnen */
function verknuepfen(db, u) {
  if (!u?.emailBestaetigt) return 0;
  let anzahl = 0;
  for (const vg of db.vorgaenge) {
    if (vg.nutzerId || vg.email !== u.email) continue;
    vg.nutzerId = u.id;
    anzahl++;
    const rolle = ROLLE_FUER_TYP[vg.typ];
    if (rolle && vg.typ !== "kontakt" && !u.rollen.includes(rolle)) u.rollen.push(rolle);
    if (vg.flaecheId) {
      const f = objekt(db, "flaeche", vg.flaecheId);
      if (f && !f.nutzerId) f.nutzerId = u.id;
    }
  }
  return anzahl;
}

/** Freie Zusatzdaten einer Anfrage bereinigen (flach, begrenzt) */
function datenBereinigen(d, tiefe = 0) {
  if (!d || typeof d !== "object" || Array.isArray(d)) return {};
  const out = {};
  for (const [k, wert] of Object.entries(d).slice(0, 60)) {
    const key = String(k).replace(/[^\w.-]/g, "").slice(0, 60);
    if (!key || key === "__proto__" || key === "constructor" || key === "prototype") continue;
    if (typeof wert === "string") out[key] = v.mehrzeilig(wert, 2000);
    else if (typeof wert === "number" && Number.isFinite(wert)) out[key] = wert;
    else if (typeof wert === "boolean") out[key] = wert;
    else if (Array.isArray(wert)) out[key] = wert.slice(0, 30).map((x) => (typeof x === "number" || typeof x === "boolean" ? x : v.text(x, 200)));
    else if (wert && typeof wert === "object" && tiefe < 1) out[key] = datenBereinigen(wert, tiefe + 1);
  }
  return out;
}

const nachDatum = (feld = "geaendertAm") => (a, b) => String(b[feld] || "").localeCompare(String(a[feld] || ""));

// ================================================================ Konto

export async function anmelden({ email, passwort }) {
  const e = v.email(email);
  const db = await lesen();
  const u = db.nutzer.find((x) => x.email === e);
  const ok = await passwortPruefen(String(passwort || ""), u?.passwortHash);
  if (!u || !ok || !u.aktiv) return null;
  return aendern((db2) => {
    const x = nutzerById(db2, u.id);
    x.letzterLogin = jetzt();
    verknuepfen(db2, x);
    protokoll(db2, x, "login", "nutzer", x.id, "Anmeldung");
    return ohneGeheimnis(x);
  });
}

export async function nutzerFuerSitzung(id) {
  const db = await lesen();
  const u = nutzerById(db, id);
  return u && u.aktiv ? ohneGeheimnis(u) : null;
}

export async function registrieren({ email, passwort, vorname, nachname, firma, telefon, rollen, vorgangId, basisUrl, ip }) {
  const e = v.email(email);
  v.pflicht(e, "Bitte geben Sie eine gültige E-Mail-Adresse an.");
  const pwFehler = v.passwortFehler(passwort);
  v.pflicht(!pwFehler, pwFehler);
  const vn = v.text(vorname, 80);
  const nn = v.text(nachname, 80);
  v.pflicht(vn && nn, "Bitte geben Sie Vor- und Nachnamen an.");
  const r = v.mehrfach(rollen, ROLLEN_IDS);
  v.pflicht(r.length > 0, "Bitte wählen Sie mindestens eine Rolle.");
  const hash = await passwortHash(passwort);

  return aendern((db) => {
    if (db.nutzer.some((u) => u.email === e)) {
      throw konflikt("Für diese E-Mail-Adresse besteht bereits ein Konto. Bitte melden Sie sich an oder setzen Sie Ihr Passwort zurück.");
    }
    const u = {
      id: neueId("U"),
      email: e,
      vorname: vn,
      nachname: nn,
      firma: v.text(firma, 120),
      telefon: v.text(telefon, 40),
      rollen: r,
      passwortHash: hash,
      sitzungVersion: 0,
      aktiv: true,
      emailBestaetigt: false,
      erstelltAm: jetzt(),
      letzterLogin: jetzt(),
      suchprofil: null,
    };
    db.nutzer.push(u);

    // Anfrage aus demselben Ablauf sofort zuordnen (Kennung + E-Mail müssen passen)
    let verknuepft = null;
    const vid = v.kennung(vorgangId);
    if (vid) {
      const vg = objekt(db, "vorgang", vid);
      if (vg && !vg.nutzerId && vg.email === e) {
        vg.nutzerId = u.id;
        verknuepft = vg.id;
        if (vg.flaecheId) {
          const f = objekt(db, "flaeche", vg.flaecheId);
          if (f && !f.nutzerId) f.nutzerId = u.id;
        }
      }
    }
    const token = tokenAnlegen(db, "email", u.id, 72);
    linkZuDemo(db, "email", e, `${basisUrl}/api/auth/email-bestaetigen?token=${token}`);
    protokoll(db, u, "registrierung", "nutzer", u.id, `Registrierung als ${r.join(", ")}`, ip);
    nachricht(db, {
      bezugArt: "nutzer",
      bezugId: u.id,
      vonAdmin: true,
      system: true,
      text: "Willkommen im Portal von ÖkoInvest. Bitte bestätigen Sie Ihre E-Mail-Adresse über den Link, den wir Ihnen gesendet haben – danach ordnen wir frühere Anfragen mit dieser Adresse automatisch Ihrem Konto zu.",
    });
    return { nutzer: ohneGeheimnis(u), vorgangVerknuepft: verknuepft };
  });
}

export async function emailBestaetigen({ token }) {
  return aendern((db) => {
    const u = tokenEinloesen(db, "email", token);
    u.emailBestaetigt = true;
    const anzahl = verknuepfen(db, u);
    protokoll(db, u, "email", "nutzer", u.id, `E-Mail bestätigt, ${anzahl} Anfrage(n) zugeordnet`);
    return ohneGeheimnis(u);
  });
}

export async function passwortVergessen({ email, basisUrl, ip }) {
  const e = v.email(email);
  if (!e) return { ok: true };
  await aendern((db) => {
    const u = db.nutzer.find((x) => x.email === e && x.aktiv);
    if (!u) return;
    const token = tokenAnlegen(db, "reset", u.id, 1);
    linkZuDemo(db, "reset", e, `${basisUrl}/passwort-vergessen?token=${token}`);
    protokoll(db, u, "passwort_vergessen", "nutzer", u.id, "Passwort-Link angefordert", ip);
  });
  return { ok: true };
}

export async function passwortSetzen({ token, passwort, ip }) {
  const pwFehler = v.passwortFehler(passwort);
  v.pflicht(!pwFehler, pwFehler);
  const hash = await passwortHash(passwort);
  return aendern((db) => {
    const u = tokenEinloesen(db, "reset", token);
    u.passwortHash = hash;
    u.sitzungVersion = (u.sitzungVersion || 0) + 1;
    u.emailBestaetigt = true; // Besitz der Adresse nachgewiesen
    verknuepfen(db, u);
    protokoll(db, u, "passwort_gesetzt", "nutzer", u.id, "Passwort neu gesetzt", ip);
    return ohneGeheimnis(u);
  });
}

export async function passwortAendern(n, { alt, neu }) {
  if (!n) throw new PlattformFehler(401, "Bitte melden Sie sich an.");
  const pwFehler = v.passwortFehler(neu);
  v.pflicht(!pwFehler, pwFehler);
  const db0 = await lesen();
  const u0 = nutzerById(db0, n.id);
  if (!(await passwortPruefen(String(alt || ""), u0?.passwortHash))) throw ungueltig("Das bisherige Passwort stimmt nicht.");
  const hash = await passwortHash(neu);
  return aendern((db) => {
    const u = nutzerById(db, n.id);
    u.passwortHash = hash;
    u.sitzungVersion = (u.sitzungVersion || 0) + 1;
    protokoll(db, u, "passwort_geaendert", "nutzer", u.id, "Passwort geändert");
    return ohneGeheimnis(u);
  });
}

export async function profilSpeichern(n, daten) {
  if (!n) throw new PlattformFehler(401, "Bitte melden Sie sich an.");
  return aendern((db) => {
    const u = nutzerById(db, n.id);
    const vn = v.text(daten.vorname, 80);
    const nn = v.text(daten.nachname, 80);
    v.pflicht(vn && nn, "Bitte geben Sie Vor- und Nachnamen an.");
    u.vorname = vn;
    u.nachname = nn;
    u.firma = v.text(daten.firma, 120);
    u.telefon = v.text(daten.telefon, 40);
    if (Array.isArray(daten.rollen)) {
      const r = v.mehrfach(daten.rollen, ROLLEN_IDS);
      v.pflicht(r.length > 0, "Bitte wählen Sie mindestens eine Rolle.");
      u.rollen = [...r, ...(u.rollen.includes("admin") ? ["admin"] : [])];
    }
    protokoll(db, u, "profil", "nutzer", u.id, "Profil aktualisiert");
    return ohneGeheimnis(u);
  });
}

export async function suchprofilSpeichern(n, p) {
  rolleNoetig(n, ["investor"], "Suchprofile sind für Investoren.");
  const profil = {
    mwpMin: v.zahl(p?.mwpMin, { min: 0, max: 5000 }),
    mwpMax: v.zahl(p?.mwpMax, { min: 0, max: 5000 }),
    phasen: v.mehrfach(p?.phasen, PHASEN.map((x) => x.id)),
    laender: v.mehrfach(p?.laender, LAENDER),
    typen: v.mehrfach(p?.typen, PROJEKT_TYPEN),
    ticketMin: v.zahl(p?.ticketMin, { min: 0, max: 1e10 }),
    ticketMax: v.zahl(p?.ticketMax, { min: 0, max: 1e10 }),
    benachrichtigen: v.wahr(p?.benachrichtigen),
  };
  if (profil.mwpMin !== null && profil.mwpMax !== null) v.pflicht(profil.mwpMin <= profil.mwpMax, "MWp: Minimum größer als Maximum.");
  if (profil.ticketMin !== null && profil.ticketMax !== null) v.pflicht(profil.ticketMin <= profil.ticketMax, "Ticket: Minimum größer als Maximum.");
  return aendern((db) => {
    const u = nutzerById(db, n.id);
    u.suchprofil = profil;
    protokoll(db, u, "suchprofil", "nutzer", u.id, "Suchprofil gespeichert");
    return profil;
  });
}

// ================================================================ Anfrage (öffentlich)

export async function anfrageAnlegen({ typ, kontakt, daten, herkunft, ip, einwilligungText, nutzer }) {
  const t = v.auswahl(typ, VORGANG_TYPEN);
  v.pflicht(t, "Unbekannter Anfragetyp.");
  const k = {
    anrede: v.text(kontakt?.anrede, 20),
    vorname: v.text(kontakt?.vorname, 80),
    nachname: v.text(kontakt?.nachname, 80),
    firma: v.text(kontakt?.firma, 120),
    email: v.email(kontakt?.email),
    telefon: v.text(kontakt?.telefon, 40),
    plz: v.plz(kontakt?.plz),
    ort: v.text(kontakt?.ort, 80),
    land: v.auswahl(kontakt?.land, LAENDER, ""),
  };
  v.pflicht(k.vorname && k.nachname, "Bitte geben Sie Vor- und Nachnamen an.");
  v.pflicht(k.email, "Bitte geben Sie eine gültige E-Mail-Adresse an.");
  const d = datenBereinigen(daten);
  v.pflicht(JSON.stringify(d).length <= 20000, "Zu viele Zusatzdaten.");
  const h = datenBereinigen(herkunft);

  return aendern((db) => {
    const u = nutzer && nutzer.email === k.email && nutzer.emailBestaetigt ? nutzerById(db, nutzer.id) : null;
    const vg = {
      id: neueId("V"),
      typ: t,
      status: PROZESSE.vorgang.start,
      statusVerlauf: [verlaufEintrag(PROZESSE.vorgang.start, u, "eigentuemer", "")],
      nutzerId: u?.id || null,
      email: k.email,
      kontakt: k,
      daten: d,
      herkunft: h,
      ip: ip || "",
      einwilligung: { am: jetzt(), ip: ip || "", text: v.text(einwilligungText, 400) },
      zustaendigId: null,
      flaecheId: null,
      erstelltAm: jetzt(),
      geaendertAm: jetzt(),
    };
    if (t === "flaeche" || t === "agri") {
      const haWert = v.zahl(d.ha ?? d.hektar ?? d.flaeche ?? d.flaecheHa, { min: 0, max: 100000, stellen: 2 });
      const f = {
        id: neueId("F"),
        nutzerId: u?.id || null,
        vorgangId: vg.id,
        bezeichnung: v.text(d.bezeichnung, 120) || `Fläche ${[k.plz, k.ort].filter(Boolean).join(" ") || "aus Anfrage"}`,
        land: k.land || "DE",
        bundesland: v.auswahl(d.bundesland, BUNDESLAENDER[k.land || "DE"] || [], ""),
        plz: k.plz,
        ort: k.ort,
        gemarkung: "",
        flurstuecke: [],
        ha: haWert,
        nutzung: v.auswahl(d.nutzung, FLAECHE_NUTZUNG, "acker"),
        agri: t === "agri",
        eigentum: "eigentum",
        hinweise: v.mehrzeilig(d.nachricht, 2000),
        status: "entwurf",
        statusVerlauf: [verlaufEintrag("entwurf", u, "system", "Aus Anfrage angelegt")],
        pachtangebot: null,
        ablehnGrund: "",
        zustaendigId: null,
        erstelltAm: jetzt(),
        geaendertAm: jetzt(),
      };
      db.flaechen.push(f);
      vg.flaecheId = f.id;
    }
    db.vorgaenge.push(vg);
    protokoll(db, u, "anfrage", "vorgang", vg.id, `Anfrage ${VORGANG_TYPEN[t]} von ${k.email}`, ip);
    return { id: vg.id, vorgang: { id: vg.id, typ: vg.typ, status: vg.status, flaecheId: vg.flaecheId } };
  });
}

// ================================================================ Vorgänge

function vorgangListenEintrag(db, vg, admin) {
  const z = nutzerById(db, vg.zustaendigId);
  const letzte = vg.statusVerlauf[vg.statusVerlauf.length - 1];
  return {
    id: vg.id,
    typ: vg.typ,
    status: vg.status,
    erstelltAm: vg.erstelltAm,
    geaendertAm: vg.geaendertAm,
    kontakt: { vorname: vg.kontakt.vorname, nachname: vg.kontakt.nachname, firma: vg.kontakt.firma, email: vg.email },
    nutzerId: admin ? vg.nutzerId : undefined,
    zustaendig: z ? kurz(z) : null,
    flaecheId: vg.flaecheId,
    letzterKommentar: letzte?.kommentar || "",
  };
}

export async function vorgaenge(n, { alle = false, status, typ, q } = {}) {
  if (!n) throw new PlattformFehler(401, "Bitte melden Sie sich an.");
  if (alle) adminNoetig(n);
  const db = await lesen();
  let liste = alle ? db.vorgaenge : db.vorgaenge.filter((x) => x.nutzerId === n.id);
  if (status) liste = liste.filter((x) => x.status === status);
  if (typ) liste = liste.filter((x) => x.typ === typ);
  if (q) {
    const s = String(q).toLowerCase();
    liste = liste.filter((x) => [x.id, x.email, x.kontakt.vorname, x.kontakt.nachname, x.kontakt.firma].join(" ").toLowerCase().includes(s));
  }
  return liste.sort(nachDatum()).map((x) => vorgangListenEintrag(db, x, alle));
}

export async function vorgang(n, id) {
  if (!n) throw new PlattformFehler(401, "Bitte melden Sie sich an.");
  const db = await lesen();
  const vg = objekt(db, "vorgang", id);
  if (!vg) throw nichtGefunden("Anfrage nicht gefunden.");
  if (!istAdmin(n) && vg.nutzerId !== n.id) throw verboten();
  const out = { ...vg, zustaendig: kurz(nutzerById(db, vg.zustaendigId)) };
  if (istAdmin(n)) out.nutzer = kurz(nutzerById(db, vg.nutzerId));
  else {
    delete out.ip;
    delete out.herkunft;
  }
  return out;
}

// ================================================================ Flächen

function flaecheDaten(daten, basis = {}) {
  const land = v.auswahl(daten.land, LAENDER, basis.land || "DE");
  const flurstuecke = Array.isArray(daten.flurstuecke)
    ? daten.flurstuecke
        .slice(0, 50)
        .map((f) => ({ gemarkung: v.text(f?.gemarkung, 80), flur: v.text(f?.flur, 20), nummer: v.text(f?.nummer, 30) }))
        .filter((f) => f.nummer || f.gemarkung)
    : basis.flurstuecke || [];
  return {
    bezeichnung: v.text(daten.bezeichnung, 120),
    land,
    bundesland: v.auswahl(daten.bundesland, BUNDESLAENDER[land], ""),
    plz: v.plz(daten.plz),
    ort: v.text(daten.ort, 80),
    gemarkung: v.text(daten.gemarkung, 80),
    flurstuecke,
    ha: v.zahl(daten.ha, { min: 0.01, max: 100000, stellen: 2 }),
    nutzung: v.auswahl(daten.nutzung, FLAECHE_NUTZUNG, "acker"),
    agri: v.wahr(daten.agri),
    eigentum: v.auswahl(daten.eigentum, ["eigentum", "miteigentum", "verwaltung"], "eigentum"),
    hinweise: v.mehrzeilig(daten.hinweise, 3000),
  };
}

function flaecheAusgabe(db, f, n) {
  const out = { ...f, zustaendig: kurz(nutzerById(db, f.zustaendigId)), dokumente: db.dokumente.filter((d) => d.bezugArt === "flaeche" && d.bezugId === f.id).length };
  if (istAdmin(n)) out.eigentuemer = kurz(nutzerById(db, f.nutzerId));
  return out;
}

export async function flaechen(n, { alle = false, status } = {}) {
  if (!n) throw new PlattformFehler(401, "Bitte melden Sie sich an.");
  if (alle) adminNoetig(n);
  const db = await lesen();
  let liste = alle ? db.flaechen : db.flaechen.filter((f) => f.nutzerId === n.id);
  if (status) liste = liste.filter((f) => f.status === status);
  return liste.sort(nachDatum()).map((f) => flaecheAusgabe(db, f, n));
}

export async function flaeche(n, id) {
  if (!n) throw new PlattformFehler(401, "Bitte melden Sie sich an.");
  const db = await lesen();
  const f = objekt(db, "flaeche", id);
  if (!f) throw nichtGefunden("Fläche nicht gefunden.");
  if (!istAdmin(n) && f.nutzerId !== n.id) throw verboten();
  return flaecheAusgabe(db, f, n);
}

export async function flaecheAnlegen(n, daten, { ip } = {}) {
  rolleNoetig(n, ["flaeche", "landwirt"], "Flächen können Flächeneigentümer und Landwirte anlegen.");
  const d = flaecheDaten(daten || {});
  v.pflicht(d.bezeichnung, "Bitte geben Sie eine Bezeichnung an.");
  return aendern((db) => {
    const f = {
      id: neueId("F"),
      nutzerId: n.id,
      vorgangId: null,
      ...d,
      status: "entwurf",
      statusVerlauf: [verlaufEintrag("entwurf", n, "eigentuemer", "")],
      pachtangebot: null,
      ablehnGrund: "",
      zustaendigId: null,
      erstelltAm: jetzt(),
      geaendertAm: jetzt(),
    };
    db.flaechen.push(f);
    protokoll(db, n, "anlegen", "flaeche", f.id, `Fläche „${f.bezeichnung}“ angelegt`, ip);
    // Direkt einreichen, wenn vollständig und gewünscht
    if (v.wahr(daten?.einreichen)) {
      const p = pruefeUebergang("flaeche", f, "eingegangen", "eigentuemer", {});
      if (!p.ok) throw new PlattformFehler(p.status, p.fehler);
      uebergangAnwenden(db, n, "flaeche", f, "eingegangen", "eigentuemer", {}, ip);
    }
    return flaecheAusgabe(db, f, n);
  });
}

export async function flaecheAendern(n, id, daten) {
  if (!n) throw new PlattformFehler(401, "Bitte melden Sie sich an.");
  return aendern((db) => {
    const f = objekt(db, "flaeche", id);
    if (!f) throw nichtGefunden("Fläche nicht gefunden.");
    const admin = istAdmin(n);
    if (!admin && f.nutzerId !== n.id) throw verboten();
    if (!admin && !["entwurf", "eingegangen"].includes(f.status)) throw konflikt("Die Fläche ist bereits in Bearbeitung – Änderungen bitte per Nachricht mitteilen.");
    const d = flaecheDaten(daten || {}, f);
    v.pflicht(d.bezeichnung, "Bitte geben Sie eine Bezeichnung an.");
    Object.assign(f, d, { geaendertAm: jetzt() });
    protokoll(db, n, "aendern", "flaeche", f.id, "Fläche bearbeitet");
    return flaecheAusgabe(db, f, n);
  });
}

// ================================================================ Projekte

function projektDaten(daten, basis = {}) {
  const land = v.auswahl(daten.land, LAENDER, basis.land || "DE");
  const preisModus = v.auswahl(daten.preisModus, PREIS_MODUS, "anfrage");
  const vt = daten.vertraulich && typeof daten.vertraulich === "object" ? daten.vertraulich : {};
  return {
    titel: v.text(daten.titel, 120),
    typ: v.auswahl(daten.typ, PROJEKT_TYPEN, ""),
    land,
    bundesland: v.auswahl(daten.bundesland, BUNDESLAENDER[land], ""),
    region: v.text(daten.region, 80),
    mwp: v.zahl(daten.mwp, { min: 0.05, max: 5000, stellen: 2 }),
    mwhSpeicher: v.zahl(daten.mwhSpeicher, { min: 0, max: 20000, stellen: 1 }),
    flaecheHa: v.zahl(daten.flaecheHa, { min: 0, max: 100000, stellen: 1 }),
    phase: v.auswahl(daten.phase, PHASEN.map((x) => x.id), ""),
    netzanschluss: v.auswahl(daten.netzanschluss, NETZANSCHLUSS, "offen"),
    codGeplant: v.monat(daten.codGeplant),
    preisModus,
    preis: preisModus === "gesamt" ? v.zahl(daten.preis, { min: 0, max: 1e10 }) : null,
    preisProKwp: preisModus === "proKwp" ? v.zahl(daten.preisProKwp, { min: 0, max: 10000 }) : null,
    beschreibung: v.mehrzeilig(daten.beschreibung, 4000),
    highlights: v.textListe(daten.highlights, { max: 6, laenge: 90 }),
    vertraulich: {
      gemeinde: v.text(vt.gemeinde, 120),
      gemarkung: v.text(vt.gemarkung, 120),
      flurstuecke: v.text(vt.flurstuecke, 300),
      netzbetreiber: v.text(vt.netzbetreiber, 120),
      einspeisepunkt: v.text(vt.einspeisepunkt, 160),
      entfernungNetzKm: v.zahl(vt.entfernungNetzKm, { min: 0, max: 500, stellen: 1 }),
      sicherung: v.text(vt.sicherung, 200),
      planungsrecht: v.text(vt.planungsrecht, 200),
      ertragKwhKwp: v.zahl(vt.ertragKwhKwp, { min: 0, max: 3000 }),
      verguetung: v.text(vt.verguetung, 200),
      details: v.mehrzeilig(vt.details, 3000),
    },
  };
}

function projektStatistik(db, p) {
  const ints = db.interessen.filter((i) => i.projektId === p.id);
  return {
    aufrufe: p.aufrufe || 0,
    merker: ints.filter((i) => i.gemerkt).length,
    ndaAnfragen: ints.filter((i) => i.status !== "gemerkt").length,
    lois: ints.filter((i) => ["loi_abgegeben", "loi_angenommen", "abgeschlossen"].includes(i.status)).length,
  };
}

function projektAusgabe(db, p, n) {
  const out = { ...p, statistik: projektStatistik(db, p), dokumente: db.dokumente.filter((d) => d.bezugArt === "projekt" && d.bezugId === p.id).length };
  out.provision = db.provisionen.find((x) => x.projektId === p.id) || null;
  if (istAdmin(n)) {
    out.anbieter = kurz(nutzerById(db, p.anbieterId));
    out.zustaendig = kurz(nutzerById(db, p.zustaendigId));
  }
  return out;
}

export async function projekte(n, { alle = false, status } = {}) {
  if (!n) throw new PlattformFehler(401, "Bitte melden Sie sich an.");
  if (alle) adminNoetig(n);
  else rolleNoetig(n, ["anbieter"], "Nur für Projektanbieter.");
  const db = await lesen();
  let liste = alle ? db.projekte : db.projekte.filter((p) => p.anbieterId === n.id);
  if (status) liste = liste.filter((p) => p.status === status);
  return liste.sort(nachDatum()).map((p) => projektAusgabe(db, p, n));
}

export async function projekt(n, id) {
  if (!n) throw new PlattformFehler(401, "Bitte melden Sie sich an.");
  const db = await lesen();
  const p = objekt(db, "projekt", id);
  if (!p) throw nichtGefunden("Projekt nicht gefunden.");
  if (!istAdmin(n) && p.anbieterId !== n.id) throw verboten();
  return projektAusgabe(db, p, n);
}

export async function projektAnlegen(n, daten, { ip } = {}) {
  rolleNoetig(n, ["anbieter"], "Projekte können Projektanbieter anlegen.");
  const d = projektDaten(daten || {});
  v.pflicht(d.titel, "Bitte geben Sie einen Projekttitel an.");
  return aendern((db) => {
    const p = {
      id: neueId("P"),
      slug: "",
      anbieterId: n.id,
      ...d,
      status: "entwurf",
      statusVerlauf: [verlaufEintrag("entwurf", n, "eigentuemer", "")],
      provisionAkzeptiert: null,
      provisionSatz: null,
      ablehnGrund: "",
      aufrufe: 0,
      zustaendigId: null,
      veroeffentlichtAm: null,
      erstelltAm: jetzt(),
      geaendertAm: jetzt(),
    };
    p.slug = `${slugify(p.titel)}-${p.id.slice(-4).toLowerCase()}`;
    db.projekte.push(p);
    protokoll(db, n, "anlegen", "projekt", p.id, `Projekt „${p.titel}“ angelegt`, ip);
    return projektAusgabe(db, p, n);
  });
}

export async function projektAendern(n, id, daten) {
  if (!n) throw new PlattformFehler(401, "Bitte melden Sie sich an.");
  return aendern((db) => {
    const p = objekt(db, "projekt", id);
    if (!p) throw nichtGefunden("Projekt nicht gefunden.");
    const admin = istAdmin(n);
    if (!admin && p.anbieterId !== n.id) throw verboten();
    if (!admin && p.status !== "entwurf") throw konflikt("Nur Entwürfe können bearbeitet werden. Nehmen Sie das Projekt ggf. zuerst von der Börse bzw. ziehen Sie die Einreichung zurück.");
    const d = projektDaten(daten || {}, p);
    v.pflicht(d.titel, "Bitte geben Sie einen Projekttitel an.");
    Object.assign(p, d, { geaendertAm: jetzt() });
    if (!p.veroeffentlichtAm) p.slug = `${slugify(p.titel)}-${p.id.slice(-4).toLowerCase()}`;
    protokoll(db, n, "aendern", "projekt", p.id, "Projekt bearbeitet");
    return projektAusgabe(db, p, n);
  });
}

export async function provisionAkzeptieren(n, id, { ip } = {}) {
  if (!n) throw new PlattformFehler(401, "Bitte melden Sie sich an.");
  return aendern((db) => {
    const p = objekt(db, "projekt", id);
    if (!p) throw nichtGefunden("Projekt nicht gefunden.");
    if (p.anbieterId !== n.id) throw verboten("Nur der Anbieter kann die Provisionsvereinbarung akzeptieren.");
    p.provisionAkzeptiert = { am: jetzt(), ip: ip || "", version: "2026-09", text: PROVISION.verkaeufer.text };
    p.geaendertAm = jetzt();
    protokoll(db, n, "provision_akzeptiert", "projekt", p.id, "Provisionsvereinbarung akzeptiert", ip);
    return projektAusgabe(db, p, n);
  });
}

// ================================================================ Börse

function boerseEintrag(db, p, n) {
  const o = projektOeffentlich(p);
  if (n && hatRolle(n, ["investor"])) {
    const i = db.interessen.find((x) => x.projektId === p.id && x.investorId === n.id);
    o.meinInteresse = i ? { id: i.id, status: i.status, gemerkt: i.gemerkt } : null;
    const profil = nutzerById(db, n.id)?.suchprofil;
    if (profil) o.matching = matching(p, profil);
  }
  return o;
}

export async function boerse(n, filter = {}) {
  const db = await lesen();
  let liste = db.projekte.filter((p) => BOERSE_STATUS.includes(p.status));
  const typ = v.auswahl(filter.typ, PROJEKT_TYPEN);
  const land = v.auswahl(filter.land, LAENDER);
  const phase = v.auswahl(filter.phase, PHASEN.map((x) => x.id));
  const mwpMin = v.zahl(filter.mwpMin, { min: 0 });
  const mwpMax = v.zahl(filter.mwpMax, { min: 0 });
  if (typ) liste = liste.filter((p) => p.typ === typ);
  if (land) liste = liste.filter((p) => p.land === land);
  if (phase) liste = liste.filter((p) => p.phase === phase);
  if (mwpMin !== null) liste = liste.filter((p) => p.mwp >= mwpMin);
  if (mwpMax !== null) liste = liste.filter((p) => p.mwp <= mwpMax);
  const eintraege = liste.sort(nachDatum("veroeffentlichtAm")).map((p) => boerseEintrag(db, p, n));
  const alleSichtbar = db.projekte.filter((p) => BOERSE_STATUS.includes(p.status));
  return {
    projekte: eintraege,
    kennzahlen: {
      anzahl: alleSichtbar.length,
      mwp: Math.round(alleSichtbar.reduce((s, p) => s + (p.mwp || 0), 0) * 10) / 10,
      laender: [...new Set(alleSichtbar.map((p) => p.land))].length,
      verkauft: db.projekte.filter((p) => p.status === "verkauft").length,
    },
    demo: true,
  };
}

export async function boerseDetail(n, schluessel, { zaehlen = false } = {}) {
  const s = String(schluessel || "");
  const finden = (db) => db.projekte.find((p) => p.slug === s || p.id === s);
  let db = await lesen();
  let p = finden(db);
  if (!p) throw nichtGefunden("Projekt nicht gefunden.");
  const eigentuemer = n && p.anbieterId === n.id;
  const admin = istAdmin(n);
  if (!BOERSE_STATUS.includes(p.status) && !eigentuemer && !admin) throw nichtGefunden("Projekt nicht gefunden.");

  if (zaehlen && !eigentuemer && !admin) {
    await aendern((d) => {
      const x = finden(d);
      if (x) x.aufrufe = (x.aufrufe || 0) + 1;
    });
    db = await lesen();
    p = finden(db);
  }

  const interesse = n ? db.interessen.find((i) => i.projektId === p.id && i.investorId === n.id) || null : null;
  const ndaFrei = interesse && DATENRAUM_STATUS.includes(interesse.status);
  const zugriff = admin ? "admin" : eigentuemer ? "eigentuemer" : ndaFrei ? "nda" : "oeffentlich";
  const out = { projekt: boerseEintrag(db, p, n), zugriff, interesse, vertraulich: null, dokumente: [] };
  if (zugriff !== "oeffentlich") {
    out.vertraulich = projektVertraulich(p);
    out.dokumente = db.dokumente
      .filter((d) => d.bezugArt === "projekt" && d.bezugId === p.id && (zugriff !== "nda" || d.kategorie === "datenraum"))
      .map(dokumentMeta);
  }
  return out;
}

// ================================================================ Interessen

export async function merken(n, projektId, an = true) {
  rolleNoetig(n, ["investor"], "Die Merkliste steht Investoren zur Verfügung.");
  return aendern((db) => {
    const p = objekt(db, "projekt", projektId);
    if (!p || !BOERSE_STATUS.includes(p.status)) throw nichtGefunden("Projekt nicht gefunden.");
    let i = db.interessen.find((x) => x.projektId === p.id && x.investorId === n.id);
    if (!i) {
      if (!an) return null;
      i = neuesInteresse(n, p);
      db.interessen.push(i);
    }
    i.gemerkt = !!an;
    i.geaendertAm = jetzt();
    protokoll(db, n, an ? "merken" : "entmerken", "projekt", p.id, an ? "Projekt gemerkt" : "Von Merkliste entfernt");
    return i;
  });
}

function neuesInteresse(n, p) {
  return {
    id: neueId("I"),
    projektId: p.id,
    investorId: n.id,
    status: "gemerkt",
    gemerkt: false,
    statusVerlauf: [verlaufEintrag("gemerkt", n, "eigentuemer", "")],
    nda: null,
    loi: null,
    ablehnGrund: "",
    erstelltAm: jetzt(),
    geaendertAm: jetzt(),
  };
}

export async function ndaAnfragen(n, projektId, { akzeptiert, ip, userAgent } = {}) {
  rolleNoetig(n, ["investor"], "NDA-Anfragen sind Investoren vorbehalten.");
  return aendern((db) => {
    const p = objekt(db, "projekt", projektId);
    if (!p || !BOERSE_STATUS.includes(p.status)) throw nichtGefunden("Projekt nicht gefunden.");
    if (p.anbieterId === n.id) throw konflikt("Für eigene Projekte ist keine NDA nötig.");
    let i = db.interessen.find((x) => x.projektId === p.id && x.investorId === n.id);
    if (!i) {
      i = neuesInteresse(n, p);
      db.interessen.push(i);
    }
    if (i.status !== "gemerkt") return i; // bereits angefragt – idempotent
    const extra = { ndaAkzeptiert: v.wahr(akzeptiert) };
    const pr = pruefeUebergang("interesse", i, "nda_angefragt", "eigentuemer", extra);
    if (!pr.ok) throw new PlattformFehler(pr.status, pr.fehler);
    i.nda = { version: NDA.version, am: jetzt(), ip: ip || "", userAgent: v.text(userAgent, 300) };
    uebergangAnwenden(db, n, "interesse", i, "nda_angefragt", "eigentuemer", extra, ip);
    protokoll(db, n, "nda", "interesse", i.id, `NDA ${NDA.version} akzeptiert für ${p.id}`, ip);
    return i;
  });
}

function interesseAusgabe(db, i, n) {
  const p = objekt(db, "projekt", i.projektId);
  const out = { ...i, projekt: p ? { ...projektOeffentlich(p), anbieterId: istAdmin(n) ? p.anbieterId : undefined } : null };
  if (istAdmin(n)) {
    out.investor = kurz(nutzerById(db, i.investorId));
    out.anbieter = p ? kurz(nutzerById(db, p.anbieterId)) : null;
  } else if (out.nda) out.nda = { ...out.nda, ip: undefined, userAgent: undefined };
  return out;
}

export async function interessen(n, { alle = false, status, projektId } = {}) {
  if (!n) throw new PlattformFehler(401, "Bitte melden Sie sich an.");
  if (alle) adminNoetig(n);
  const db = await lesen();
  let liste = alle ? db.interessen : db.interessen.filter((i) => i.investorId === n.id);
  if (status) {
    const st = Array.isArray(status) ? status : [status];
    liste = liste.filter((i) => st.includes(i.status));
  }
  if (projektId) {
    // Anbieter sieht anonymisierte Interessen am eigenen Projekt nur als Zählwerte (projektAusgabe) – hier nur Admin/Investor
    liste = liste.filter((i) => i.projektId === projektId);
  }
  return liste.sort(nachDatum()).map((i) => interesseAusgabe(db, i, n));
}

// ================================================================ Statuswechsel

/** Übergang anwenden (nach erfolgreicher Prüfung) inkl. Nebenwirkungen und Nachricht */
function uebergangAnwenden(db, n, art, o, nach, als, extra = {}, ip = "") {
  const von = o.status;
  const kommentar = v.mehrzeilig(extra.grund || extra.kommentar || "", 1000);

  // Nebenwirkungen vor dem Wechsel (Validierung)
  if (extra.grund) o.ablehnGrund = kommentar;
  if (art === "flaeche" && nach === "pachtangebot") {
    const pa = extra.pachtangebot || {};
    const euro = v.zahl(pa.euroProHaJahr, { min: 50, max: 50000 });
    const jahre = v.zahl(pa.laufzeitJahre, { min: 1, max: 60 });
    v.pflicht(euro !== null && jahre !== null, "Pachtangebot: Pacht je ha und Laufzeit angeben.");
    o.pachtangebot = { euroProHaJahr: euro, laufzeitJahre: jahre, verlaengerung: v.text(pa.verlaengerung, 80), text: v.mehrzeilig(pa.text, 2000), am: jetzt() };
  }
  if (art === "projekt" && nach === "veroeffentlicht") {
    let satz = v.zahl(extra.provisionSatz, { min: 0, max: 100 });
    if (satz !== null && satz > 0.2) satz = satz / 100; // Eingabe in Prozent
    v.pflicht(satz !== null && satz >= PROVISION.verkaeufer.min - 1e-9 && satz <= PROVISION.verkaeufer.max + 1e-9, `Provisionssatz muss zwischen ${PROVISION.verkaeufer.min * 100} und ${PROVISION.verkaeufer.max * 100} % liegen.`);
    o.provisionSatz = Math.round(satz * 10000) / 10000;
    if (!o.veroeffentlichtAm) o.veroeffentlichtAm = jetzt();
  }
  if (art === "interesse" && nach === "loi_abgegeben") {
    const l = extra.loi || {};
    const t = v.mehrzeilig(l.text, 3000);
    v.pflicht(t.length >= 10, "Bitte beschreiben Sie Ihre Absichtserklärung (mind. 10 Zeichen).");
    o.loi = { betrag: v.zahl(l.betrag, { min: 0, max: 1e10 }), text: t, bedingungen: v.mehrzeilig(l.bedingungen, 2000), gueltigBis: v.text(l.gueltigBis, 10), am: jetzt() };
  }
  let provision = null;
  if (art === "projekt" && nach === "verkauft") {
    const kaeufer = objekt(db, "interesse", v.kennung(extra.interesseId));
    v.pflicht(kaeufer && kaeufer.projektId === o.id && ["nda_freigegeben", "loi_abgegeben", "loi_angenommen"].includes(kaeufer.status), "Käufer muss ein Interessent mit freigegebenem Datenraum sein.");
    const kaufpreis = v.zahl(extra.kaufpreis, { min: 1, max: 1e11 });
    v.pflicht(kaufpreis, "Bitte Kaufpreis angeben.");
    const satz = o.provisionSatz ?? PROVISION.verkaeufer.min;
    provision = {
      id: neueId("PV"),
      projektId: o.id,
      anbieterId: o.anbieterId,
      investorId: kaeufer.investorId,
      interesseId: kaeufer.id,
      kaufpreis,
      satz,
      betrag: Math.round(kaufpreis * satz),
      status: "offen",
      statusVerlauf: [verlaufEintrag("offen", null, "system", "Automatisch bei Verkauf berechnet.")],
      erstelltAm: jetzt(),
    };
    db.provisionen.push(provision);
    // Käufer → abgeschlossen, alle anderen offenen Interessen → abgelehnt
    for (const i of db.interessen.filter((x) => x.projektId === o.id)) {
      if (i.id === kaeufer.id) systemWechsel(db, "interesse", i, "abgeschlossen", "Kauf abgeschlossen.");
      else if (!["abgelehnt", "abgeschlossen"].includes(i.status)) systemWechsel(db, "interesse", i, "abgelehnt", "Projekt anderweitig verkauft.");
    }
  }

  o.status = nach;
  o.statusVerlauf = o.statusVerlauf || [];
  o.statusVerlauf.push(verlaufEintrag(nach, n, als, kommentar));
  o.geaendertAm = jetzt();

  // Neu veröffentlicht → Investoren mit passendem Suchprofil benachrichtigen
  if (art === "projekt" && nach === "veroeffentlicht") {
    for (const inv of db.nutzer.filter((x) => x.aktiv && x.rollen.includes("investor") && x.suchprofil?.benachrichtigen && x.id !== o.anbieterId)) {
      const m = matching(o, inv.suchprofil);
      if (m.score >= 70) {
        nachricht(db, { bezugArt: "nutzer", bezugId: inv.id, vonAdmin: true, system: true, text: `Neues Projekt passend zu Ihrem Suchprofil (${m.score} % Passung): ${o.titel}. Zum Exposé: /portal/boerse/${o.id}` });
      }
    }
  }

  // LOI angenommen → Projekt reserviert
  if (art === "interesse" && nach === "loi_angenommen") {
    const p = objekt(db, "projekt", o.projektId);
    if (p && p.status === "veroeffentlicht") systemWechsel(db, "projekt", p, "reserviert", "LOI eines Investors angenommen.");
  }

  if (art !== "provision") {
    const text = `Status: „${statusLabel(art, von)}“ → „${statusLabel(art, nach)}“.${kommentar ? ` ${kommentar}` : ""}`;
    const m = nachricht(db, { bezugArt: art, bezugId: o.id, vonId: n?.id, vonAdmin: als === "admin", system: true, text });
    if (als === "eigentuemer") {
      m.gelesenNutzer = true;
      m.gelesenAdmin = false;
    }
  }
  if (provision) {
    protokoll(db, n, "provision", "provision", provision.id, `Provision ${provision.betrag} € (${provision.satz * 100} %) für ${o.id}`, ip);
  }
  protokoll(db, n, "status", art, o.id, `${statusLabel(art, von)} → ${statusLabel(art, nach)}`, ip);
}

function systemWechsel(db, art, o, nach, kommentar) {
  const von = o.status;
  const erlaubt = PROZESSE[art].uebergaenge.some((u) => u.nach === nach && u.von.includes(von) && (u.wer === "system" || u.wer === "admin"));
  if (!erlaubt) return;
  o.status = nach;
  o.statusVerlauf.push(verlaufEintrag(nach, null, "system", kommentar));
  o.geaendertAm = jetzt();
  if (art === "interesse" && nach === "abgelehnt") o.ablehnGrund = kommentar;
  nachricht(db, { bezugArt: art, bezugId: o.id, vonAdmin: true, system: true, text: `Status: „${statusLabel(art, von)}“ → „${statusLabel(art, nach)}“. ${kommentar}` });
}

export async function statusWechsel(n, { art, id, nach, als, extra = {}, ip = "" }) {
  if (!n) throw new PlattformFehler(401, "Bitte melden Sie sich an.");
  if (!PROZESSE[art] || art === undefined) throw ungueltig("Unbekannte Objektart.");
  if (!["admin", "eigentuemer"].includes(als)) throw ungueltig("Ungültige Rolle.");
  if (als === "admin") adminNoetig(n);
  return aendern((db) => {
    const o = objekt(db, art, id);
    if (!o) throw nichtGefunden();
    if (als === "eigentuemer" && besitzer(db, art, o) !== n.id) throw verboten();
    if (art === "interesse" && nach === "nda_angefragt") throw ungueltig("Bitte nutzen Sie die NDA-Anfrage im Projekt.");
    const p = pruefeUebergang(art, o, nach, als, extra || {});
    if (!p.ok) throw new PlattformFehler(p.status, p.fehler);
    uebergangAnwenden(db, n, art, o, nach, als, extra || {}, ip);
    return o;
  });
}

// ================================================================ Nachrichten

function threadInfo(db, art, id, n) {
  const admin = istAdmin(n);
  const o = bezugObjekt(db, art, id);
  if (!o) return null;
  switch (art) {
    case "vorgang":
      return { titel: `Anfrage ${VORGANG_TYPEN[o.typ] || o.typ} · ${o.id}`, link: admin ? `/portal/admin/vorgaenge/${o.id}` : `/portal/anfragen/${o.id}`, gegenueber: [o.kontakt?.vorname, o.kontakt?.nachname].filter(Boolean).join(" ") };
    case "flaeche":
      return { titel: `Fläche: ${o.bezeichnung}`, link: `/portal/flaechen/${o.id}`, gegenueber: nameVon(db, o.nutzerId) };
    case "projekt":
      return { titel: `Projekt: ${o.titel}`, link: `/portal/projekte/${o.id}`, gegenueber: nameVon(db, o.anbieterId) };
    case "interesse": {
      const p = objekt(db, "projekt", o.projektId);
      return { titel: `Interesse: ${p?.titel || o.projektId}`, link: admin ? `/portal/admin/interessen?id=${o.id}` : `/portal/boerse/${o.projektId}`, gegenueber: nameVon(db, o.investorId) };
    }
    case "nutzer":
      return { titel: admin ? `Allgemein · ${nameVon(db, o.id)}` : "Allgemeine Nachrichten", link: `/portal/nachrichten?bezug=nutzer:${o.id}`, gegenueber: nameVon(db, o.id) };
    default:
      return null;
  }
}

function nameVon(db, id) {
  const u = nutzerById(db, id);
  return u ? [u.vorname, u.nachname].filter(Boolean).join(" ") : "";
}

export async function nachrichtenThreads(n, { nurUngelesen = false } = {}) {
  if (!n) throw new PlattformFehler(401, "Bitte melden Sie sich an.");
  const db = await lesen();
  const admin = istAdmin(n);
  const gruppen = new Map();
  for (const m of db.nachrichten) {
    const key = `${m.bezugArt}:${m.bezugId}`;
    if (!gruppen.has(key)) gruppen.set(key, []);
    gruppen.get(key).push(m);
  }
  const threads = [];
  for (const [key, liste] of gruppen) {
    const [art, id] = key.split(":");
    const o = bezugObjekt(db, art, id);
    if (!o) continue;
    const eigen = besitzer(db, art, o) === n.id;
    if (!admin && !eigen) continue;
    const info = threadInfo(db, art, id, n);
    const sortiert = liste.sort((a, b) => a.am.localeCompare(b.am));
    const letzte = sortiert[sortiert.length - 1];
    const ungelesen = sortiert.filter((m) => (admin && !eigen ? !m.gelesenAdmin : !m.gelesenNutzer)).length;
    if (nurUngelesen && !ungelesen) continue;
    threads.push({ bezugArt: art, bezugId: id, ...info, anzahl: sortiert.length, ungelesen, letzte: { text: letzte.text.slice(0, 160), am: letzte.am, vonAdmin: letzte.vonAdmin, system: letzte.system } });
  }
  return threads.sort((a, b) => b.letzte.am.localeCompare(a.letzte.am));
}

export async function nachrichten(n, bezugArt, bezugId, { markieren = true } = {}) {
  if (!n) throw new PlattformFehler(401, "Bitte melden Sie sich an.");
  const db = await lesen();
  const o = darfBezug(db, n, bezugArt, bezugId);
  const eigen = besitzer(db, bezugArt, o) === n.id;
  const alsAdmin = istAdmin(n) && !eigen;
  const liste = db.nachrichten.filter((m) => m.bezugArt === bezugArt && m.bezugId === bezugId).sort((a, b) => a.am.localeCompare(b.am));
  const offen = liste.filter((m) => (alsAdmin ? !m.gelesenAdmin : !m.gelesenNutzer));
  if (markieren && offen.length) {
    await aendern((d) => {
      const ids = new Set(offen.map((m) => m.id));
      for (const m of d.nachrichten) if (ids.has(m.id)) m[alsAdmin ? "gelesenAdmin" : "gelesenNutzer"] = true;
    });
  }
  return {
    ...threadInfo(db, bezugArt, bezugId, n),
    bezugArt,
    bezugId,
    nachrichten: liste.map((m) => ({
      id: m.id,
      text: m.text,
      am: m.am,
      system: m.system,
      vonAdmin: m.vonAdmin,
      eigene: m.vonId === n.id && !m.system,
      vonName: m.vonAdmin ? "ÖkoInvest Backoffice" : nameVon(db, m.vonId) || "Nutzer",
      neu: alsAdmin ? !m.gelesenAdmin : !m.gelesenNutzer,
    })),
  };
}

export async function nachrichtSenden(n, { bezugArt, bezugId, text }) {
  if (!n) throw new PlattformFehler(401, "Bitte melden Sie sich an.");
  const t = v.mehrzeilig(text, 5000);
  v.pflicht(t.length >= 2, "Bitte geben Sie eine Nachricht ein.");
  return aendern((db) => {
    const o = darfBezug(db, n, bezugArt, bezugId);
    const eigen = besitzer(db, bezugArt, o) === n.id;
    const alsAdmin = istAdmin(n) && !eigen;
    const m = nachricht(db, { bezugArt, bezugId, vonId: n.id, vonAdmin: alsAdmin, text: t });
    if (alsAdmin) {
      m.gelesenAdmin = true;
      m.gelesenNutzer = false;
    }
    protokoll(db, n, "nachricht", bezugArt, bezugId, "Nachricht gesendet");
    return { id: m.id, am: m.am };
  });
}

// ================================================================ Dokumente

function dokumentMeta(d) {
  return { id: d.id, bezugArt: d.bezugArt, bezugId: d.bezugId, name: d.name, mime: d.mime, groesse: d.groesse, kategorie: d.kategorie, am: d.am, hochgeladenVon: d.hochgeladenVon };
}

/** Darf n dieses Dokument sehen? */
function darfDokument(db, n, d) {
  if (istAdmin(n)) return true;
  if (d.hochgeladenVon === n.id) return true;
  const o = bezugObjekt(db, d.bezugArt, d.bezugId);
  if (!o) return false;
  if (besitzer(db, d.bezugArt, o) === n.id) return true;
  if (d.bezugArt === "projekt" && d.kategorie === "datenraum" && BOERSE_STATUS.concat(["verkauft"]).includes(o.status)) {
    const i = db.interessen.find((x) => x.projektId === o.id && x.investorId === n.id);
    return !!i && DATENRAUM_STATUS.includes(i.status);
  }
  return false;
}

export async function dokumente(n, { bezugArt, bezugId } = {}) {
  if (!n) throw new PlattformFehler(401, "Bitte melden Sie sich an.");
  const db = await lesen();
  let liste = db.dokumente;
  if (bezugArt) liste = liste.filter((d) => d.bezugArt === bezugArt && d.bezugId === bezugId);
  else if (!istAdmin(n)) {
    // Übersicht: nur Dokumente an eigenen Objekten bzw. eigene Uploads (kein Datenraum fremder Projekte)
    liste = liste.filter((d) => d.hochgeladenVon === n.id || besitzer(db, d.bezugArt, bezugObjekt(db, d.bezugArt, d.bezugId)) === n.id);
  }
  return liste
    .filter((d) => darfDokument(db, n, d))
    .sort((a, b) => b.am.localeCompare(a.am))
    .slice(0, 500)
    .map((d) => ({ ...dokumentMeta(d), bezugTitel: threadInfo(db, d.bezugArt, d.bezugId, n)?.titel || d.bezugId, bezugLink: threadInfo(db, d.bezugArt, d.bezugId, n)?.link || null }));
}

export async function dokumentLesen(n, id) {
  if (!n) throw new PlattformFehler(401, "Bitte melden Sie sich an.");
  const db = await lesen();
  const d = db.dokumente.find((x) => x.id === id);
  if (!d) throw nichtGefunden("Dokument nicht gefunden.");
  if (!darfDokument(db, n, d)) throw verboten();
  const daten = await uploadLesen(d.datei);
  // Download-Protokoll (Datenraum: wer hat wann welche Unterlage geöffnet)
  await aendern((db2) => protokoll(db2, n, "download", d.bezugArt, d.bezugId, `Dokument ${d.name} geöffnet`));
  return { meta: dokumentMeta(d), daten };
}

export async function dokumentSpeichern(n, { bezugArt, bezugId, name: dateiname, mime, daten, kategorie }) {
  if (!n) throw new PlattformFehler(401, "Bitte melden Sie sich an.");
  if (!UPLOAD.typen[mime]) throw new PlattformFehler(415, "Erlaubt sind PDF, JPG und PNG.");
  if (!daten?.length || daten.length > UPLOAD.maxBytes) throw new PlattformFehler(413, "Die Datei ist leer oder größer als 10 MB.");
  const kat = v.auswahl(kategorie, DOKUMENT_KATEGORIEN, "allgemein");
  if (kat === "datenraum" && bezugArt !== "projekt") throw ungueltig("Datenraum-Dokumente gehören zu einem Projekt.");
  const sauber = v.text(dateiname, 120).replace(/[\\/:*?"<>|]/g, "_") || `dokument.${UPLOAD.typen[mime]}`;
  const datei = `${neueId("D")}-${sha256(Math.random() + sauber).slice(0, 16)}.${UPLOAD.typen[mime]}`;
  // Rechte vor dem Schreiben der Datei prüfen
  const db0 = await lesen();
  darfBezug(db0, n, bezugArt, bezugId);
  await uploadSchreiben(datei, daten);
  try {
    return await aendern((db) => {
      const o = darfBezug(db, n, bezugArt, bezugId);
      const eigen = besitzer(db, bezugArt, o) === n.id;
      const d = { id: neueId("D"), bezugArt, bezugId, name: sauber, mime, groesse: daten.length, datei, kategorie: kat, hochgeladenVon: n.id, am: jetzt(), sha256: sha256(daten) };
      db.dokumente.push(d);
      const m = nachricht(db, { bezugArt, bezugId, vonId: n.id, vonAdmin: istAdmin(n) && !eigen, system: true, text: `Dokument hochgeladen: ${sauber}` });
      if (!(istAdmin(n) && !eigen)) {
        m.gelesenNutzer = true;
        m.gelesenAdmin = false;
      }
      protokoll(db, n, "upload", bezugArt, bezugId, `Dokument ${sauber} (${d.groesse} B)`);
      return dokumentMeta(d);
    });
  } catch (e) {
    await uploadLoeschen(datei);
    throw e;
  }
}

export async function dokumentLoeschen(n, id) {
  if (!n) throw new PlattformFehler(401, "Bitte melden Sie sich an.");
  const datei = await aendern((db) => {
    const idx = db.dokumente.findIndex((x) => x.id === id);
    if (idx < 0) throw nichtGefunden("Dokument nicht gefunden.");
    const d = db.dokumente[idx];
    if (!istAdmin(n) && d.hochgeladenVon !== n.id) throw verboten("Nur eigene Uploads können gelöscht werden.");
    db.dokumente.splice(idx, 1);
    protokoll(db, n, "loeschen", d.bezugArt, d.bezugId, `Dokument ${d.name} gelöscht`);
    return d.datei;
  });
  await uploadLoeschen(datei);
  return { ok: true };
}

// ================================================================ Admin

export async function zuweisen(n, { art, id, zustaendigId }) {
  adminNoetig(n);
  return aendern((db) => {
    const o = objekt(db, art, id);
    if (!o) throw nichtGefunden();
    if (zustaendigId) {
      const z = nutzerById(db, zustaendigId);
      v.pflicht(z && z.rollen.includes("admin") && z.aktiv, "Zuständig kann nur ein aktives Backoffice-Konto sein.");
    }
    o.zustaendigId = zustaendigId || null;
    o.geaendertAm = jetzt();
    protokoll(db, n, "zuweisen", art, id, `Zuständig: ${zustaendigId ? nameVon(db, zustaendigId) : "–"}`);
    return { id: o.id, zustaendigId: o.zustaendigId };
  });
}

export async function nutzerListe(n, { q, rolle } = {}) {
  adminNoetig(n);
  const db = await lesen();
  let liste = db.nutzer;
  if (rolle) liste = liste.filter((u) => u.rollen.includes(rolle));
  if (q) {
    const s = String(q).toLowerCase();
    liste = liste.filter((u) => [u.email, u.vorname, u.nachname, u.firma].join(" ").toLowerCase().includes(s));
  }
  return liste
    .sort(nachDatum("erstelltAm"))
    .map((u) => ({
      ...ohneGeheimnis(u),
      zaehler: {
        vorgaenge: db.vorgaenge.filter((x) => x.nutzerId === u.id).length,
        flaechen: db.flaechen.filter((x) => x.nutzerId === u.id).length,
        projekte: db.projekte.filter((x) => x.anbieterId === u.id).length,
        interessen: db.interessen.filter((x) => x.investorId === u.id).length,
      },
    }));
}

export async function nutzerAendern(n, id, { rollen, aktiv }) {
  adminNoetig(n);
  return aendern((db) => {
    const u = nutzerById(db, id);
    if (!u) throw nichtGefunden("Konto nicht gefunden.");
    if (Array.isArray(rollen)) {
      const r = v.mehrfach(rollen, [...ROLLEN_IDS, "admin"]);
      v.pflicht(r.length, "Mindestens eine Rolle.");
      if (u.id === n.id && !r.includes("admin")) throw konflikt("Die eigene Admin-Rolle kann nicht entfernt werden.");
      u.rollen = r;
    }
    if (typeof aktiv === "boolean") {
      if (u.id === n.id && !aktiv) throw konflikt("Das eigene Konto kann nicht gesperrt werden.");
      if (u.aktiv && !aktiv) u.sitzungVersion = (u.sitzungVersion || 0) + 1; // sofort abmelden
      u.aktiv = aktiv;
    }
    protokoll(db, n, "nutzer", "nutzer", u.id, `Rollen: ${u.rollen.join(", ")}, aktiv: ${u.aktiv}`);
    return ohneGeheimnis(u);
  });
}

export async function provisionen(n) {
  adminNoetig(n);
  const db = await lesen();
  return db.provisionen
    .sort(nachDatum("erstelltAm"))
    .map((pv) => ({ ...pv, projekt: projektOeffentlich(objekt(db, "projekt", pv.projektId)), anbieter: kurz(nutzerById(db, pv.anbieterId)), investor: kurz(nutzerById(db, pv.investorId)) }));
}

export async function aktivitaeten(n, { limit = 100, objektId } = {}) {
  adminNoetig(n);
  const db = await lesen();
  let liste = db.aktivitaeten;
  if (objektId) liste = liste.filter((a) => a.objektId === objektId);
  return liste
    .slice(-Math.min(500, limit))
    .reverse()
    .map((a) => ({ ...a, nutzer: nameVon(db, a.nutzerId) || (a.nutzerId ? a.nutzerId : "Gast/System") }));
}

export async function demoLinks(n) {
  adminNoetig(n);
  const db = await lesen();
  return db.demoLinks.slice(0, 20);
}

export async function adminKonten(n) {
  adminNoetig(n);
  const db = await lesen();
  return db.nutzer.filter((u) => u.rollen.includes("admin") && u.aktiv).map(kurz);
}

export async function adminUebersicht(n) {
  adminNoetig(n);
  const db = await lesen();
  const zaehle = (liste, feld = "status") => liste.reduce((acc, x) => ((acc[x[feld]] = (acc[x[feld]] || 0) + 1), acc), {});
  const tage = (iso) => (Date.now() - new Date(iso).getTime()) / 86400e3;
  const erreicht = (liste, art, ziel) => {
    const pipe = PROZESSE[art].pipeline;
    const idx = pipe.indexOf(ziel);
    return liste.filter((x) => (x.statusVerlauf || []).some((e) => pipe.indexOf(e.status) >= idx)).length;
  };
  const ungelesenAdmin = db.nachrichten.filter((m) => !m.gelesenAdmin).length;
  return {
    vorgaenge: {
      gesamt: db.vorgaenge.length,
      neu7: db.vorgaenge.filter((x) => tage(x.erstelltAm) <= 7).length,
      offen: db.vorgaenge.filter((x) => OFFENE_STATUS.vorgang.includes(x.status)).length,
      ohneZustaendig: db.vorgaenge.filter((x) => OFFENE_STATUS.vorgang.includes(x.status) && !x.zustaendigId).length,
      status: zaehle(db.vorgaenge),
      typ: zaehle(db.vorgaenge, "typ"),
      trichter: PROZESSE.vorgang.pipeline.map((s) => ({ status: s, anzahl: erreicht(db.vorgaenge, "vorgang", s) })),
    },
    flaechen: {
      gesamt: db.flaechen.length,
      ha: Math.round(db.flaechen.filter((f) => f.status !== "abgelehnt").reduce((s, f) => s + (f.ha || 0), 0)),
      status: zaehle(db.flaechen),
      trichter: PROZESSE.flaeche.pipeline.map((s) => ({ status: s, anzahl: erreicht(db.flaechen, "flaeche", s) })),
    },
    projekte: {
      gesamt: db.projekte.length,
      inPruefung: db.projekte.filter((p) => p.status === "pruefung").length,
      mwpBoerse: Math.round(db.projekte.filter((p) => BOERSE_STATUS.includes(p.status)).reduce((s, p) => s + (p.mwp || 0), 0) * 10) / 10,
      status: zaehle(db.projekte),
    },
    interessen: {
      status: zaehle(db.interessen),
      ndaOffen: db.interessen.filter((i) => i.status === "nda_angefragt").length,
      loiOffen: db.interessen.filter((i) => i.status === "loi_abgegeben").length,
      trichter: [
        { status: "veroeffentlicht", label: "Projekte in der Börse", anzahl: db.projekte.filter((p) => ["veroeffentlicht", "reserviert", "verkauft"].includes(p.status)).length },
        { status: "nda", label: "NDA angefragt", anzahl: db.interessen.filter((i) => i.nda).length },
        { status: "loi", label: "LOI abgegeben", anzahl: db.interessen.filter((i) => i.loi).length },
        { status: "verkauft", label: "Verkauft", anzahl: db.projekte.filter((p) => p.status === "verkauft").length },
      ],
    },
    provisionen: {
      anzahl: db.provisionen.length,
      offen: db.provisionen.filter((p) => ["offen", "in_rechnung"].includes(p.status)).reduce((s, p) => s + p.betrag, 0),
      bezahlt: db.provisionen.filter((p) => p.status === "bezahlt").reduce((s, p) => s + p.betrag, 0),
    },
    nutzer: { gesamt: db.nutzer.length, rollen: db.nutzer.reduce((acc, u) => (u.rollen.forEach((r) => (acc[r] = (acc[r] || 0) + 1)), acc), {}) },
    nachrichten: { ungelesen: ungelesenAdmin },
  };
}
