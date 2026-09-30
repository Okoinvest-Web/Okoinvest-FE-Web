// src/lib/plattform/backend/demo/vorlagen.js
//
// E-Mail-/Nachrichtenvorlagen im Demo-Backend: Versionen (jede Änderung = neue Version, alte bleiben
// lesbar und wiederherstellbar), Vorschau mit echtem oder Beispielkontext, Versand an einen Kontakt
// bzw. als Portal-Nachricht im Thread eines Objekts. Platzhalter: src/lib/plattform/vorlagen.js.

import * as v from "../../validierung";
import { nichtGefunden, ungueltig } from "../../fehler";
import { VORLAGE_KANAELE, beispielKontext, rendern, vorlageFehler } from "../../vorlagen";
import { jetzt, neueId } from "./hilfen";
import { W, boAendern, boLesen, kontextFuer, nameVon, objektVon, portalPfad, rechtNoetig } from "./bo-kern";

const ARTEN = ["vorgang", "flaeche", "projekt", "interesse"];

function aktuelle(vl) {
  return vl.versionen.find((x) => x.version === vl.version) || vl.versionen[vl.versionen.length - 1];
}

function ausgabe(db, vl) {
  const a = aktuelle(vl);
  return {
    id: vl.id,
    name: vl.name,
    kanal: vl.kanal,
    aktiv: vl.aktiv !== false,
    version: vl.version,
    betreff: a.betreff,
    text: a.text,
    geaendertAm: a.am,
    geaendertVon: nameVon(db, a.vonId) || "System",
    versionen: [...vl.versionen].reverse().map((x) => ({ ...x, von: nameVon(db, x.vonId) || "System" })),
    verwendetIn: db.bo.regeln.filter((r) => r.aktionen.some((x) => x.vorlageId === vl.id)).map((r) => ({ id: r.id, name: r.name })),
  };
}

/** Vorlage auf ein Objekt anwenden → { betreff, text, unbekannt, leer } */
export function vorlageAnwenden(db, vl, art, o, { kontakt } = {}) {
  const a = aktuelle(vl);
  const ktx = kontextFuer(db, art, o, { kontakt });
  const b = rendern(a.betreff || "", ktx);
  const t = rendern(a.text || "", ktx);
  return { betreff: b.text, text: t.text, unbekannt: [...new Set([...b.unbekannt, ...t.unbekannt])], leer: [...new Set([...b.leer, ...t.leer])], kontext: ktx };
}

export const vorlageVon = (db, id) => db.bo.vorlagen.find((x) => x.id === id) || null;

export async function vorlagen(n) {
  rechtNoetig(n, "vorlagen", 1);
  const db = await boLesen();
  return db.bo.vorlagen.map((vl) => ausgabe(db, vl)).sort((a, b) => Number(b.aktiv) - Number(a.aktiv) || a.name.localeCompare(b.name, "de"));
}

export async function vorlageSpeichern(n, id, daten = {}) {
  rechtNoetig(n, "vorlagen", 2);
  const d = { name: v.text(daten.name, 120), kanal: v.auswahl(daten.kanal, VORLAGE_KANAELE, "email"), betreff: v.text(daten.betreff, 200), text: v.mehrzeilig(daten.text, 8000) };
  const f = vorlageFehler(d);
  if (f) throw ungueltig(f);
  return boAendern((db) => {
    let vl = id ? vorlageVon(db, id) : null;
    if (id && !vl) throw nichtGefunden("Vorlage nicht gefunden.");
    const kommentar = v.text(daten.kommentar, 200);
    if (!vl) {
      vl = { id: neueId("VL"), name: d.name, kanal: d.kanal, aktiv: true, version: 1, versionen: [{ version: 1, betreff: d.betreff, text: d.text, am: jetzt(), vonId: n.id, kommentar: kommentar || "Erste Fassung" }], erstelltAm: jetzt() };
      db.bo.vorlagen.push(vl);
      W.protokoll(db, n, "vorlage", "vorlage", vl.id, `Vorlage angelegt: ${d.name}`);
      return ausgabe(db, vl);
    }
    const a = aktuelle(vl);
    vl.name = d.name;
    vl.kanal = d.kanal;
    if (typeof daten.aktiv === "boolean") vl.aktiv = daten.aktiv;
    if (a.betreff !== d.betreff || a.text !== d.text) {
      const neu = Math.max(...vl.versionen.map((x) => x.version)) + 1;
      vl.versionen.push({ version: neu, betreff: d.betreff, text: d.text, am: jetzt(), vonId: n.id, kommentar });
      if (vl.versionen.length > 50) vl.versionen.splice(0, vl.versionen.length - 50);
      vl.version = neu;
      W.protokoll(db, n, "vorlage", "vorlage", vl.id, `Vorlage „${d.name}“: Version ${neu}${kommentar ? ` (${kommentar})` : ""}`);
    }
    return ausgabe(db, vl);
  });
}

export async function vorlageWiederherstellen(n, id, version) {
  rechtNoetig(n, "vorlagen", 2);
  return boAendern((db) => {
    const vl = vorlageVon(db, id);
    if (!vl) throw nichtGefunden("Vorlage nicht gefunden.");
    const alt = vl.versionen.find((x) => x.version === Number(version));
    if (!alt) throw nichtGefunden("Version nicht gefunden.");
    const neu = Math.max(...vl.versionen.map((x) => x.version)) + 1;
    vl.versionen.push({ version: neu, betreff: alt.betreff, text: alt.text, am: jetzt(), vonId: n.id, kommentar: `Wiederhergestellt aus Version ${alt.version}` });
    vl.version = neu;
    W.protokoll(db, n, "vorlage", "vorlage", vl.id, `Vorlage „${vl.name}“: Version ${alt.version} als ${neu} wiederhergestellt`);
    return ausgabe(db, vl);
  });
}

function zielObjekt(db, bezugArt, bezugId) {
  if (!bezugArt) return null;
  v.pflicht(ARTEN.includes(bezugArt), "Unbekannte Objektart.");
  const o = objektVon(db, bezugArt, v.kennung(bezugId));
  if (!o) throw nichtGefunden("Objekt für die Vorschau nicht gefunden.");
  return o;
}

/** Vorschau: mit Objekt/Kontakt echte Werte, sonst Beispielwerte. Ungespeicherter Text möglich. */
export async function vorlageVorschau(n, { vorlageId, betreff, text, bezugArt, bezugId, kontaktId } = {}) {
  rechtNoetig(n, "vorlagen", 1);
  const db = await boLesen();
  const vl = vorlageId ? vorlageVon(db, vorlageId) : null;
  if (vorlageId && !vl) throw nichtGefunden("Vorlage nicht gefunden.");
  const quelle = { betreff: betreff !== undefined ? v.text(betreff, 200) : vl ? aktuelle(vl).betreff : "", text: text !== undefined ? v.mehrzeilig(text, 8000) : vl ? aktuelle(vl).text : "" };
  const o = zielObjekt(db, bezugArt, bezugId);
  const kontakt = kontaktId ? db.bo.kontakte.find((k) => k.id === kontaktId) : null;
  if (kontaktId && !kontakt) throw nichtGefunden("Kontakt nicht gefunden.");
  const ktx = o || kontakt ? kontextFuer(db, bezugArt, o, { kontakt }) : beispielKontext();
  const b = rendern(quelle.betreff, ktx);
  const t = rendern(quelle.text, ktx);
  return { betreff: b.text, text: t.text, unbekannt: [...new Set([...b.unbekannt, ...t.unbekannt])], leer: [...new Set([...b.leer, ...t.leer])], beispiel: !(o || kontakt) };
}

/** Vorlage senden: E-Mail an Kontakt (Postausgang) oder Portal-Nachricht im Thread des Objekts */
export async function vorlageSenden(n, { vorlageId, kontaktId, bezugArt, bezugId } = {}) {
  rechtNoetig(n, "vorlagen", 1);
  rechtNoetig(n, "crm", 2);
  return boAendern((db) => {
    const vl = vorlageVon(db, v.kennung(vorlageId));
    if (!vl || vl.aktiv === false) throw nichtGefunden("Vorlage nicht gefunden oder inaktiv.");
    const o = zielObjekt(db, bezugArt, bezugId);
    const kontakt = kontaktId ? db.bo.kontakte.find((k) => k.id === kontaktId) : null;
    if (kontaktId && !kontakt) throw nichtGefunden("Kontakt nicht gefunden.");
    const r = vorlageAnwenden(db, vl, bezugArt, o, { kontakt });
    if (r.unbekannt.length) throw ungueltig(`Die Vorlage enthält unbekannte Platzhalter: ${r.unbekannt.join(", ")}`);
    if (vl.kanal === "nachricht") {
      v.pflicht(o, "Portal-Nachrichten brauchen ein Objekt (Vorgang, Fläche, Projekt, Interesse).");
      const m = W.nachricht(db, { bezugArt, bezugId: o.id, vonId: n.id, vonAdmin: true, text: r.text });
      W.protokoll(db, n, "vorlage_gesendet", bezugArt, o.id, `Nachricht aus Vorlage „${vl.name}“ (v${vl.version})`);
      return { ok: true, kanal: "nachricht", id: m.id };
    }
    const email = kontakt?.email || r.kontext.email;
    v.pflicht(email, "Für diesen Kontakt ist keine E-Mail-Adresse hinterlegt.");
    const e = W.postausgangAnlegen(db, { an: email, anName: [r.kontext.vorname, r.kontext.nachname].filter(Boolean).join(" "), nutzerId: kontakt?.nutzerId || null, art: "vorlage", betreff: r.betreff, text: r.text, link: portalPfad(bezugArt, o), linkText: "Zum Portal", hinweis: `Vorlage „${vl.name}“ (Version ${vl.version}), gesendet von ${nameVon(db, n.id)}.` });
    if (kontakt) {
      db.bo.aktivitaeten.push({ id: neueId("KA"), kontaktId: kontakt.id, organisationId: kontakt.organisationId || null, typ: "email", betreff: v.text(r.betreff, 160), text: v.mehrzeilig(r.text, 3000), am: jetzt(), bezugArt: o ? bezugArt : null, bezugId: o?.id || null, vonId: n.id, system: false, aufgabeId: null, wiedervorlageAm: null, erstelltAm: jetzt(), vorlageId: vl.id });
    }
    W.protokoll(db, n, "vorlage_gesendet", o ? bezugArt : "kontakt", o?.id || kontakt?.id || "", `E-Mail aus Vorlage „${vl.name}“ (v${vl.version}) an ${email}`);
    return { ok: true, kanal: "email", id: e.id };
  });
}
