// src/lib/plattform/backend/demo/querschnitt.js
//
// Demo-Backend „Querschnitt“ (Team 10): Dokument-Versionen und -Freigabe, Revisionsprotokoll-Suche,
// E-Mail-Rhythmus und Tages-Digest. Signaturen identisch zu backend/frappe/querschnitt.js.
// Regeln (Filter, Digest-Text, Freigabestatus) aus src/lib/plattform/querschnitt.js – Frappe spiegelt sie in
// plattform/querschnitt_kern.py.

import * as v from "../../validierung";
import { PlattformFehler, konflikt, nichtGefunden, ungueltig, verboten } from "../../fehler";
import { BENACHRICHTIGUNG_ARTEN, mailEinstellungenStandard } from "../../konstanten";
import { DIGEST_AUSNAHMEN, DOKUMENT_FREIGABE, DOKUMENT_FREIGABE_IDS, MAIL_RHYTHMUS_IDS, digestText, protokollFiltern } from "../../querschnitt";
import { stufe } from "../../rechte";
import { intern, dokumentSpeichern } from "../demo";
import { aendern, lesen } from "./speicher";
import { jetzt, neueId } from "./hilfen";

const istAdmin = (n) => !!n?.rollen?.includes("admin");
const angemeldet = (n) => {
  if (!n) throw new PlattformFehler(401, "Bitte melden Sie sich an.");
};

// ================================================================ Dokumente: Versionen & Freigabe

function kette(db, d) {
  // Vorgänger bis zur ersten Version, dann Nachfolger – ohne Endlosschleifen
  const nachId = new Map(db.dokumente.map((x) => [x.id, x]));
  const liste = [];
  const gesehen = new Set();
  let x = d;
  while (x && !gesehen.has(x.id)) {
    gesehen.add(x.id);
    liste.unshift(x);
    x = x.vorgaengerId ? nachId.get(x.vorgaengerId) : null;
  }
  x = d.ersetztDurch ? nachId.get(d.ersetztDurch) : null;
  while (x && !gesehen.has(x.id)) {
    gesehen.add(x.id);
    liste.push(x);
    x = x.ersetztDurch ? nachId.get(x.ersetztDurch) : null;
  }
  return liste;
}

/** Alle Versionen eines Dokuments (älteste zuerst), nur sichtbare */
export async function dokumentVersionen(n, id) {
  angemeldet(n);
  const db = await lesen();
  const d = db.dokumente.find((x) => x.id === v.kennung(id));
  if (!d) throw nichtGefunden("Dokument nicht gefunden.");
  if (!intern.darfDokument(db, n, d)) throw verboten();
  return kette(db, d).filter((x) => intern.darfDokument(db, n, x)).map((x) => ({ ...intern.dokumentMeta(x), vonName: intern.nameVon(db, x.hochgeladenVon) || "" }));
}

/**
 * Neue Version hochladen: Rechte wie beim Upload am Objekt (dokumentSpeichern prüft Schreibrecht am Bezug) und
 * Leserecht an der alten Version. Datenraum-Unterlagen werden im Deal-Room gepflegt (Freigabestufen).
 */
export async function dokumentNeueVersion(n, id, { name, mime, daten }) {
  angemeldet(n);
  const db0 = await lesen();
  const alt = db0.dokumente.find((x) => x.id === v.kennung(id));
  if (!alt) throw nichtGefunden("Dokument nicht gefunden.");
  if (!intern.darfDokument(db0, n, alt)) throw verboten();
  if (alt.kategorie === "datenraum") throw ungueltig("Datenraum-Unterlagen bitte im Deal-Room aktualisieren (Freigabestufen je Unterlage).");
  if (alt.ersetztDurch) throw konflikt("Es gibt bereits eine neuere Version – bitte diese ersetzen.");
  if (!istAdmin(n) && alt.hochgeladenVon !== n.id && !intern.darfDokument(db0, n, alt)) throw verboten();
  const neu = await dokumentSpeichern(n, { bezugArt: alt.bezugArt, bezugId: alt.bezugId, name: name || alt.name, mime, daten, kategorie: alt.kategorie, checkliste: alt.checkliste, stumm: true });
  return aendern((db) => {
    const a = db.dokumente.find((x) => x.id === alt.id);
    const d = db.dokumente.find((x) => x.id === neu.id);
    if (!a || !d) throw nichtGefunden("Dokument nicht gefunden.");
    if (a.ersetztDurch) throw konflikt("Es gibt bereits eine neuere Version – bitte diese ersetzen.");
    d.version = (a.version || 1) + 1;
    d.vorgaengerId = a.id;
    a.ersetztDurch = d.id;
    const alsAdmin = istAdmin(n) && a.hochgeladenVon !== n.id && d.bezugArt !== "nutzer";
    intern.nachricht(db, { bezugArt: d.bezugArt, bezugId: d.bezugId, vonId: n.id, vonAdmin: alsAdmin, system: true, text: `Neue Version ${d.version} hochgeladen: ${d.name}`, ereignis: "nachricht", ...(alsAdmin ? {} : { gelesenNutzer: true, gelesenAdmin: false }) });
    intern.protokoll(db, n, "version", d.bezugArt, d.bezugId, `Dokument ${d.name}: Version ${d.version} ersetzt ${a.id}`);
    return intern.dokumentMeta(d);
  });
}

/** Freigabestatus setzen (Backoffice mit Schreibrecht im Bereich des Bezugs bzw. Vorgänge) – Uploader wird benachrichtigt */
export async function dokumentFreigeben(n, id, { status, kommentar = "" } = {}) {
  angemeldet(n);
  if (!istAdmin(n)) throw verboten("Nur das Backoffice gibt Dokumente frei.");
  const st = v.auswahl(status, DOKUMENT_FREIGABE_IDS, "");
  v.pflicht(st, "Bitte einen gültigen Status wählen.");
  const text = v.mehrzeilig(kommentar, 1000);
  if (st === "abgelehnt") v.pflicht(text.length >= 5, "Bitte begründen Sie, was nachgebessert werden muss.");
  return aendern((db) => {
    const d = db.dokumente.find((x) => x.id === v.kennung(id));
    if (!d) throw nichtGefunden("Dokument nicht gefunden.");
    const bereich = { vorgang: "vorgaenge", flaeche: "flaechen", projekt: "projekte", interesse: "interessen" }[d.bezugArt] || "vorgaenge";
    if (stufe(n, bereich) < 2) throw new PlattformFehler(403, "Ihre Backoffice-Rolle erlaubt hier keine Freigabe.", "recht");
    d.freigabe = { status: st, vonId: n.id, am: jetzt(), kommentar: text };
    intern.protokoll(db, n, "freigabe", d.bezugArt, d.bezugId, `Dokument ${d.name}: ${DOKUMENT_FREIGABE[st].label}`);
    const u = intern.nutzerById(db, d.hochgeladenVon);
    if (u && u.id !== n.id && !u.rollen.includes("admin")) {
      intern.benachrichtigen(db, u, { art: "nachricht", titel: `Dokument ${DOKUMENT_FREIGABE[st].label.toLowerCase()}: ${d.name}`, text: text || DOKUMENT_FREIGABE[st].text, link: "/portal/dokumente", objektArt: d.bezugArt, objektId: d.bezugId });
    }
    return intern.dokumentMeta(d);
  });
}

// ================================================================ Revisionsprotokoll: Suche

export async function protokollSuche(n, filter = {}) {
  angemeldet(n);
  if (!istAdmin(n) || stufe(n, "protokoll") < 1) throw new PlattformFehler(403, "Ihre Backoffice-Rolle erlaubt im Bereich „Protokoll“ kein lesen.", "recht");
  const db = await lesen();
  const namen = new Map();
  const nameVon = (id) => {
    if (!id) return "Gast/System";
    if (!namen.has(id)) namen.set(id, intern.nameVon(db, id) || id);
    return namen.get(id);
  };
  const eintraege = (db.aktivitaeten || []).map((a) => ({ id: a.id, am: a.am, aktion: a.aktion, objektArt: a.objektArt, objektId: a.objektId, text: a.text, nutzerId: a.nutzerId || null, nutzer: nameVon(a.nutzerId), ip: a.ip || "", prevHash: a.prevHash || "", hash: a.hash || "", nachgesiegelt: !!a.nachgesiegelt }));
  return protokollFiltern(eintraege, { ...filter, alle: filter.alle === true });
}

// ================================================================ Benachrichtigungen: Rhythmus & Tages-Digest

export async function mailRhythmus(n) {
  angemeldet(n);
  await digestLauf(null); // Demo: Scheduler-Ersatz (fällige Digests beim Aufruf versenden)
  const db = await lesen();
  const u = intern.nutzerById(db, n.id);
  return {
    rhythmus: MAIL_RHYTHMUS_IDS.includes(u?.mailRhythmus) ? u.mailRhythmus : "sofort",
    digestZuletzt: u?.digestZuletzt || null,
    vorgemerkt: (db.benachrichtigungen || []).filter((b) => b.nutzerId === n.id && b.digest && !b.digestAm).length,
  };
}

export async function mailRhythmusSpeichern(n, { rhythmus } = {}) {
  angemeldet(n);
  const r = v.auswahl(rhythmus, MAIL_RHYTHMUS_IDS, "");
  v.pflicht(r, "Bitte „sofort“ oder „Tages-Digest“ wählen.");
  return aendern((db) => {
    const u = intern.nutzerById(db, n.id);
    u.mailRhythmus = r;
    if (r === "taeglich" && !u.digestZuletzt) u.digestZuletzt = jetzt(); // erster Digest frühestens nach 24 h
    intern.protokoll(db, u, "einstellungen", "nutzer", u.id, `E-Mail-Rhythmus: ${r}`);
    return { rhythmus: r };
  });
}

const STUNDEN_20 = 20 * 3600e3;

/**
 * Tages-Digest versenden: je Konto mit Rhythmus „täglich“ höchstens eine Mail je 20 h mit der Anzahl vorgemerkter
 * Ereignisse (ohne Inhalte). `n` = null (System/Scheduler) oder Leitung (manuell, `erzwingen` ignoriert die 20 h).
 */
export async function digestLauf(n, { erzwingen = false } = {}) {
  if (n && (!istAdmin(n) || stufe(n, "rechte") < 2)) throw verboten("Den Digest-Lauf startet nur die Leitung.");
  const db0 = await lesen();
  const jetztMs = Date.now();
  const faellig = (u) => u.aktiv && u.mailRhythmus === "taeglich" && (erzwingen || !u.digestZuletzt || jetztMs - Date.parse(u.digestZuletzt) >= STUNDEN_20);
  const kandidaten = db0.nutzer.filter((u) => faellig(u) && (db0.benachrichtigungen || []).some((b) => b.nutzerId === u.id && b.digest && !b.digestAm));
  if (!kandidaten.length) return { konten: 0, mails: 0 };
  return aendern((db) => {
    let mails = 0;
    for (const u of db.nutzer.filter(faellig)) {
      const offen = (db.benachrichtigungen || []).filter((b) => b.nutzerId === u.id && b.digest && !b.digestAm && !DIGEST_AUSNAHMEN.includes(b.art));
      if (!offen.length) continue;
      const einstellung = { ...mailEinstellungenStandard(), ...(u.mailEinstellungen || {}) };
      const relevant = offen.filter((b) => einstellung[b.art]);
      const am = jetzt();
      for (const b of offen) b.digestAm = am;
      u.digestZuletzt = am;
      if (!relevant.length || u.komfort?.kanaele?.email === false) continue;
      const t = digestText(relevant, BENACHRICHTIGUNG_ARTEN);
      db.postausgang = db.postausgang || [];
      db.postausgang.unshift({ id: neueId("E"), am, an: u.email, anName: [u.vorname, u.nachname].filter(Boolean).join(" "), nutzerId: u.id, art: "digest", betreff: t.betreff, text: t.text, link: "/portal/benachrichtigungen", linkText: "Zu den Benachrichtigungen", hinweis: "Aus Gründen der Vertraulichkeit enthält diese E-Mail keine Inhalte. Bitte melden Sie sich im Portal an." });
      if (db.postausgang.length > 500) db.postausgang.length = 500;
      for (const b of relevant) b.mail = true;
      mails++;
    }
    if (n) intern.protokoll(db, n, "digest", "system", "digest", `Tages-Digest manuell: ${mails} E-Mail(s)`);
    return { konten: kandidaten.length, mails };
  });
}
