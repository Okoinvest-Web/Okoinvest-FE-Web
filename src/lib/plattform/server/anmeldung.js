// src/lib/plattform/server/anmeldung.js
//
// Anmeldeablauf der Website (Login, Sicherheit & Teams) – gemeinsam für Passwort, E-Mail-Link,
// Passwort-Reset und Registrierung:
//
//   1. Erster Faktor geprüft (Backend) → anmeldungFortsetzen()
//   2. 2FA aktiv und Gerät nicht gemerkt → kurzlebiges Zwischen-Cookie (5 min, SameSite=Strict), KEINE Sitzung
//      → Browser zeigt den Code-Schritt → POST /api/auth/zwei-faktor → zweiFaktorAbschliessen()
//   3. sitzungStarten(): neuer Sitzungseintrag im Backend (Sitzungsrotation: jede Anmeldung = neue Kennung),
//      signiertes Cookie mit Sitzungskennung, Geräte-Cookie (für „neues Gerät“ und „30 Tage merken“).
//
// Nur serverseitig (Route-Handler).

import { antwort, nutzerFuerBrowser, sitzungSetzen } from "./route";
import { sicherheit } from "../backend/sicherheit";
import { cookieOptionen, zwischenTokenErstellen, zwischenTokenPruefen, ZWISCHEN_DAUER_S } from "../sitzung";
import { PlattformFehler } from "../fehler";

const PROD = () => process.env.NODE_ENV === "production";
export const zwischenCookieName = () => (PROD() ? "__Host-oi_2fa" : "oi_2fa");
export const geraetCookieName = () => (PROD() ? "__Host-oi_geraet" : "oi_geraet");
const GERAET_MAX_S = 400 * 86400; // Obergrenze der Browser für Cookie-Laufzeiten

/** Kontext der Anfrage für Historie/Geräte: IP, User-Agent, Land (nur wenn ein Proxy es liefert) */
export function anfrageKontext(request, ip = "") {
  return {
    ip,
    userAgent: (request.headers.get("user-agent") || "").slice(0, 400),
    land: (request.headers.get("cf-ipcountry") || request.headers.get("x-vercel-ip-country") || "").slice(0, 2).toUpperCase(),
    geraetToken: request.cookies.get(geraetCookieName())?.value || "",
  };
}

function zwischenLoeschen(res) {
  res.cookies.set(zwischenCookieName(), "", { ...cookieOptionen(0), sameSite: "strict", maxAge: 0 });
  return res;
}

/**
 * Sitzung anlegen und Cookies setzen. `daten` wird der JSON-Antwort hinzugefügt.
 * ersetzt: Kennung der bisherigen Sitzung (Rotation nach 2FA-Einrichtung o. Ä.).
 */
export async function sitzungStarten({ request, ip, nutzer, methode, zweiFaktor = false, geraetMerken = false, ersetzt = null, daten = {}, status = 200 }) {
  const k = anfrageKontext(request, ip);
  const r = await sicherheit().sitzungAnlegen(nutzer, { ...k, methode, zweiFaktor, geraetMerken, ersetzt });
  const res = antwort({ ok: true, nutzer: nutzerFuerBrowser(nutzer), ...daten }, status);
  await sitzungSetzen(res, nutzer, { sitzungId: r.sitzung.id });
  if (r.geraetToken) {
    res.cookies.set(geraetCookieName(), r.geraetToken, { httpOnly: true, sameSite: "lax", secure: PROD(), path: "/", maxAge: GERAET_MAX_S });
  }
  return zwischenLoeschen(res);
}

/**
 * Nach dem ersten Faktor: bei aktiver 2FA (und nicht gemerktem Gerät) Zwischenschritt, sonst Sitzung.
 * Antwort im Zwischenschritt: { ok: true, zweiFaktor: true } – ohne Nutzerdaten.
 */
export async function anmeldungFortsetzen({ request, ip, nutzer, methode, daten = {}, status = 200 }) {
  if (nutzer?.zweiFaktorAktiv) {
    const { geraetToken } = anfrageKontext(request, ip);
    const vertraut = geraetToken ? await sicherheit().geraetVertraut({ nutzerId: nutzer.id, geraetToken }) : false;
    if (!vertraut) {
      const res = antwort({ ok: true, zweiFaktor: true, methode });
      const token = await zwischenTokenErstellen({ nutzerId: nutzer.id, version: nutzer.sitzungVersion || 0, methode });
      res.cookies.set(zwischenCookieName(), token, { ...cookieOptionen(ZWISCHEN_DAUER_S), sameSite: "strict" });
      return res;
    }
    return sitzungStarten({ request, ip, nutzer, methode: `${methode} (Gerät gemerkt)`, zweiFaktor: true, daten, status });
  }
  return sitzungStarten({ request, ip, nutzer, methode, daten, status });
}

/** Zweiter Schritt: Code prüfen (Backend zählt Fehlversuche zur Kontosperre), dann Sitzung */
export async function zweiFaktorAbschliessen({ request, ip, code, merken = false }) {
  const z = await zwischenTokenPruefen(request.cookies.get(zwischenCookieName())?.value);
  if (!z) throw new PlattformFehler(401, "Die Anmeldung ist abgelaufen. Bitte melden Sie sich erneut an.", "zwei_faktor_abgelaufen");
  const k = anfrageKontext(request, ip);
  const nutzer = await sicherheit().zweiFaktorPruefen({ nutzerId: z.nutzerId, code: String(code || "").slice(0, 20), ip: k.ip, userAgent: k.userAgent, land: k.land });
  // Passwort zwischenzeitlich geändert/Konto gesperrt → Zwischenschritt ungültig
  if (!nutzer || !nutzer.aktiv || (nutzer.sitzungVersion || 0) !== z.version) throw new PlattformFehler(401, "Die Anmeldung ist abgelaufen. Bitte melden Sie sich erneut an.", "zwei_faktor_abgelaufen");
  return sitzungStarten({
    request, ip, nutzer, methode: z.methode, zweiFaktor: true, geraetMerken: !!merken,
    daten: { zweiFaktorMethode: nutzer.zweiFaktorMethode, codesUebrig: nutzer.codesUebrig },
  });
}
