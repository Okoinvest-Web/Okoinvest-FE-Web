// src/lib/bericht/anforderung.js
//
// Bericht-Baustein (Welle 2, Paket B4): Kontaktangaben und freiwillige Häkchen einer Berichtsanforderung.
// Pflicht sind NUR Vorname, Nachname (= Name) und E-Mail. Telefon ist freiwillig.
// Personendaten erscheinen nie in Fehlermeldungen oder Logs.

import { createHash } from "node:crypto";
import * as v from "@/lib/plattform/validierung";
import { PlattformFehler } from "@/lib/plattform/fehler";
import { einwilligungenAufbereiten } from "@/lib/anfrage/hinweise";

const TELEFON = /^[+0-9][0-9 ()/.-]{4,39}$/;
export const sha256 = (s) => createHash("sha256").update(String(s), "utf8").digest("hex");

/** { vorname, nachname, email, telefon } – sonst 422 mit Feldhinweis */
export function kontaktPruefen(roh) {
  const k = roh && typeof roh === "object" && !Array.isArray(roh) ? roh : {};
  const vorname = v.text(k.vorname, 80);
  const nachname = v.text(k.nachname, 80);
  const email = v.email(k.email);
  const telefonRoh = v.text(k.telefon, 40);
  if (!vorname || !nachname) throw new PlattformFehler(422, "Bitte geben Sie Vor- und Nachnamen an.", "name");
  if (!email) throw new PlattformFehler(422, "Bitte geben Sie eine gültige E-Mail-Adresse an.", "email");
  if (telefonRoh && !TELEFON.test(telefonRoh)) throw new PlattformFehler(422, "Bitte prüfen Sie die Telefonnummer – oder lassen Sie das Feld leer.", "telefon");
  return { vorname, nachname, email, telefon: telefonRoh };
}

/** Getrennte, freiwillige Häkchen (Newsletter, Werbeanruf) – nur ausdrücklich gesetzte, Werbeanruf nur mit Telefon */
export function einwilligungenPruefen(roh, { telefon, am = new Date().toISOString() } = {}) {
  return einwilligungenAufbereiten(roh, { hash: sha256, am, telefon, sprache: "de" });
}
