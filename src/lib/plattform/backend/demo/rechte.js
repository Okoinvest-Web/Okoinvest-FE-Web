// src/lib/plattform/backend/demo/rechte.js
//
// Backoffice-Unterrollen (Rechte-Matrix: src/lib/plattform/rechte.js) und Prüfung der Hash-Kette
// des Aktivitätsprotokolls im Demo-Backend.

import * as v from "../../validierung";
import { konflikt, nichtGefunden } from "../../fehler";
import { BACKOFFICE_ROLLEN, BACKOFFICE_ROLLEN_IDS, BEREICHE, RECHTE_MATRIX, unterrollen } from "../../rechte";
import { W, boAendern, boLesen, nameVon, rechtNoetig } from "./bo-kern";
import { kettePruefen, ketteSicher } from "./kette";

export async function backofficeRechte(n) {
  rechtNoetig(n, "rechte", 1);
  const db = await boLesen();
  return {
    rollen: BACKOFFICE_ROLLEN,
    bereiche: BEREICHE,
    matrix: RECHTE_MATRIX,
    konten: db.nutzer
      .filter((u) => u.rollen.includes("admin"))
      .map((u) => ({ id: u.id, name: nameVon(db, u.id), email: u.email, aktiv: u.aktiv, backofficeRollen: unterrollen(u), ausdruecklich: Array.isArray(u.backofficeRollen) && u.backofficeRollen.length > 0, demo: !!u.demo })),
  };
}

export async function backofficeRollenSetzen(n, nutzerId, rollen) {
  rechtNoetig(n, "rechte", 2);
  const r = v.mehrfach(rollen, BACKOFFICE_ROLLEN_IDS);
  v.pflicht(r.length, "Mindestens eine Backoffice-Rolle wählen.");
  return boAendern((db) => {
    const u = db.nutzer.find((x) => x.id === v.kennung(nutzerId));
    if (!u || !u.rollen.includes("admin")) throw nichtGefunden("Backoffice-Konto nicht gefunden.");
    if (u.id === n.id && !r.includes("leitung")) throw konflikt("Die eigene Leitungsrolle kann nicht entfernt werden.");
    u.backofficeRollen = r;
    W.protokoll(db, n, "rechte", "nutzer", u.id, `Backoffice-Rollen: ${r.map((x) => BACKOFFICE_ROLLEN[x].label).join(", ")}`);
    return { id: u.id, backofficeRollen: r };
  });
}

/** Hash-Kette prüfen + letzte Einträge mit Hashes */
export async function protokollKette(n, { limit = 30 } = {}) {
  rechtNoetig(n, "protokoll", 1);
  let db = await boLesen();
  if (!db.kette) {
    await boAendern((d) => ketteSicher(d));
    db = await boLesen();
  }
  const pruefung = kettePruefen(db);
  const liste = db.aktivitaeten || [];
  return {
    ...pruefung,
    eintraege: liste
      .slice(-Math.min(200, Number(limit) || 30))
      .reverse()
      .map((a) => ({ id: a.id, am: a.am, aktion: a.aktion, objektArt: a.objektArt, objektId: a.objektId, text: a.text, nutzer: nameVon(db, a.nutzerId) || (a.nutzerId ? a.nutzerId : "Gast/System"), prevHash: a.prevHash, hash: a.hash, nachgesiegelt: !!a.nachgesiegelt })),
  };
}
