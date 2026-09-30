// src/lib/plattform/backend/demo/kette.js
//
// Hash-Kette des Aktivitätsprotokolls im Demo-Backend (Verfahren: src/lib/plattform/hashkette.js).
//  - protokoll() in demo.js hängt jeden Eintrag über protokollAnhaengen() an (prevHash + hash).
//  - Einführung: vorhandene Einträge werden einmalig in ihrer Reihenfolge „nachgesiegelt“ (markiert).
//  - Einträge, die fremder Code ohne protokoll() ans Ende gehängt hat, werden beim nächsten Eintrag
//    nachgesiegelt und markiert (`nachgesiegelt: true`) – Einfügungen mitten in der Kette,
//    Änderungen und Löschungen erkennt verifyChain().
//  - Archivierung (> 5000 Einträge): der Hash des letzten entfernten Eintrags bleibt als Anker.

import { KETTE_START, verketten, verifyChain } from "../../hashkette";
import { jetzt } from "./hilfen";

const MAX = 5000;

/** Kette einführen, falls noch nicht geschehen (vorhandene Einträge werden nachgesiegelt) */
export function ketteSicher(db) {
  if (!db.kette) einfuehren(db);
}

function einfuehren(db) {
  db.aktivitaeten = db.aktivitaeten || [];
  let prev = KETTE_START;
  let n = 0;
  for (const x of db.aktivitaeten) {
    verketten(x, prev);
    x.nachgesiegelt = true;
    prev = x.hash;
    n++;
  }
  db.kette = { seit: jetzt(), nachgesiegelt: n, anker: null, verfahren: "SHA-256(prevHash + LF + kanonischer Inhalt)" };
}

export function protokollAnhaengen(db, eintrag) {
  db.aktivitaeten = db.aktivitaeten || [];
  const liste = db.aktivitaeten;
  if (!db.kette) einfuehren(db);
  let i = liste.length - 1;
  while (i >= 0 && !liste[i].hash) i--;
  let prev = i >= 0 ? liste[i].hash : db.kette.anker?.hash || KETTE_START;
  for (let j = i + 1; j < liste.length; j++) {
    verketten(liste[j], prev);
    liste[j].nachgesiegelt = true;
    prev = liste[j].hash;
    db.kette.nachgesiegelt = (db.kette.nachgesiegelt || 0) + 1;
  }
  verketten(eintrag, prev);
  liste.push(eintrag);
  if (liste.length > MAX) {
    const weg = liste.splice(0, liste.length - MAX);
    const letzter = weg[weg.length - 1];
    db.kette.anker = { hash: letzter.hash, anzahl: (db.kette.anker?.anzahl || 0) + weg.length, bis: letzter.am };
  }
  return eintrag;
}

/** Kette prüfen (alle Brüche melden) */
export function kettePruefen(db, { alleFehler = true } = {}) {
  const liste = db.aktivitaeten || [];
  const r = verifyChain(liste, { anker: db.kette?.anker, alleFehler });
  return {
    ...r,
    eingefuehrt: !!db.kette,
    seit: db.kette?.seit || null,
    nachgesiegelt: liste.filter((x) => x.nachgesiegelt).length,
    anker: db.kette?.anker || null,
    verfahren: db.kette?.verfahren || "SHA-256(prevHash + LF + kanonischer Inhalt)",
    erster: liste[0] ? { id: liste[0].id, am: liste[0].am } : null,
    letzter: liste.length ? { id: liste[liste.length - 1].id, am: liste[liste.length - 1].am, hash: liste[liste.length - 1].hash } : null,
    geprueftAm: jetzt(),
  };
}
