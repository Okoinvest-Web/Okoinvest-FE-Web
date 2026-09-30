// src/lib/plattform/signatur/server.js
//
// Verbindung der elektronischen Unterschrift mit den bestehenden Klick-Erklärungen (Klick-NDA, Provisionsvereinbarung).
// Einstellung je Erklärung unter /portal/signatur (Backoffice): „klick“ (Standard, bisheriges Verhalten) oder „signatur“.
//
//  - signaturModusPruefen(): in den bestehenden Klick-Routen VOR der Backend-Operation aufrufen. Im Modus „signatur“
//    wird – falls noch nicht vollständig unterschrieben – ein Signaturvorgang bereitgestellt und 409 `signatur_noetig`
//    mit Link geworfen. Im Modus „klick“ passiert nichts.
//  - folgeAktionAusfuehren(): nach der letzten Unterschrift einer Standard-Erklärung die bisherige Operation
//    (ndaAnfragen / provisionAkzeptieren) ausführen – Nachweis ist dann die Signatur statt des Klicks.
//
// Nur serverseitig.

import { PlattformFehler } from "../fehler";
import { serviceBackend } from "../backend/service";

export async function signaturModusPruefen(nutzer, art, projektId, { ip = "" } = {}) {
  let r;
  try {
    r = await serviceBackend().signaturStandard(nutzer, { art, projektId, ip });
  } catch (e) {
    // Die Einstellung darf den bisherigen Weg nie blockieren, wenn das Modul nicht erreichbar ist
    if (e instanceof PlattformFehler && [403, 404, 422].includes(e.status)) throw e;
    console.warn("[plattform] Signatur-Modus nicht prüfbar – Klick-Weg bleibt aktiv:", e?.message);
    return;
  }
  if (!r || r.modus !== "signatur" || r.erledigt) return;
  const e = new PlattformFehler(409, `Diese Erklärung wird elektronisch unterschrieben. Das Dokument liegt für Sie bereit: Portal → Unterschriften (/portal/signatur/${r.id}).`, "signatur_noetig");
  e.signaturId = r.id;
  throw e;
}

export async function folgeAktionAusfuehren(backend, nutzer, folge, { ip = "", userAgent = "" } = {}) {
  if (!folge?.projektId) return null;
  try {
    if (folge.art === "nda") return { art: "nda", interesse: await backend.ndaAnfragen(nutzer, folge.projektId, { akzeptiert: true, ip, userAgent }) };
    if (folge.art === "provision") return { art: "provision", projekt: await backend.provisionAkzeptieren(nutzer, folge.projektId, { ip }) };
  } catch (e) {
    console.warn("[plattform] Folgeaktion nach Signatur fehlgeschlagen:", e?.message);
    return { art: folge.art, fehler: e?.message || "fehlgeschlagen" };
  }
  return null;
}
