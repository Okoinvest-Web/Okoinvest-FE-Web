// src/lib/plattform/server/route.js
//
// Gemeinsamer Rahmen aller Plattform-APIs:
//  - CSRF-Schutz: Mutationen nur mit passendem Origin-Header UND Content-Type JSON
//    (Uploads: multipart + Kopfzeile X-Plattform-Upload). Ein fremdes Formular kann weder
//    JSON senden noch eigene Kopfzeilen setzen; fremde fetch-Aufrufe scheitern am Origin.
//  - Sitzung aus dem signierten Cookie, Nutzer frisch aus dem Backend (Rollen, Sperre, Version)
//  - Rollenprüfung vorab (Eigentum prüft das Backend)
//  - Rate-Limits, Größenbegrenzung des Bodys
//  - Fehler → { ok:false, error, code } mit passendem HTTP-Status, Interna nur ins Log

import { NextResponse } from "next/server";
import { backend } from "../backend";
import { PlattformFehler } from "../fehler";
import { cookieName, cookieOptionen, tokenErstellen, tokenPruefen } from "../sitzung";
import { ipAdresse } from "@/lib/ipAdresse";
import { SITE } from "@/data/site";
import { grenze, rateLimit } from "./rateLimit";
import { adminRechtPruefen } from "./rechte"; // Backoffice-Unterrollen (Rechte-Matrix)

const KEIN_CACHE = { "Cache-Control": "no-store" };

export function antwort(daten, status = 200) {
  return NextResponse.json(daten, { status, headers: KEIN_CACHE });
}

export function fehlerAntwort(e) {
  if (e instanceof PlattformFehler) {
    return antwort({ ok: false, error: e.message, code: e.code }, e.status);
  }
  console.error("[plattform] Unerwarteter Fehler:", e);
  return antwort({ ok: false, error: "Es ist ein Fehler aufgetreten. Bitte versuchen Sie es später erneut.", code: "fehler" }, 500);
}

function hostVon(url) {
  try {
    return new URL(url).host.toLowerCase();
  } catch {
    return "";
  }
}

/** Erlaubte Hosts für den Origin-Abgleich */
function erlaubteHosts(request) {
  const hosts = new Set();
  const h = request.headers.get("x-forwarded-host") || request.headers.get("host");
  if (h) hosts.add(h.split(",")[0].trim().toLowerCase());
  hosts.add(hostVon(SITE.url));
  for (const o of String(process.env.PLATTFORM_ORIGINS || "").split(",")) if (o.trim()) hosts.add(hostVon(o.trim()));
  return hosts;
}

/** CSRF: Origin muss zur eigenen Seite gehören */
export function herkunftPruefen(request) {
  const origin = request.headers.get("origin");
  if (!origin || origin === "null" || !erlaubteHosts(request).has(hostVon(origin))) {
    throw new PlattformFehler(403, "Anfrage von fremder Herkunft abgelehnt.", "herkunft");
  }
}

/** JSON-Body lesen (max. Bytes), muss ein Objekt sein */
export async function jsonLesen(request, maxBytes = 64 * 1024) {
  const typ = request.headers.get("content-type") || "";
  if (!typ.toLowerCase().startsWith("application/json")) throw new PlattformFehler(415, "Erwartet wird JSON.");
  const laenge = Number(request.headers.get("content-length") || 0);
  if (laenge > maxBytes) throw new PlattformFehler(413, "Anfrage zu groß.");
  const text = await request.text();
  if (text.length > maxBytes || Buffer.byteLength(text, "utf8") > maxBytes) throw new PlattformFehler(413, "Anfrage zu groß."); // Bytes, nicht UTF-16-Einheiten (Umlaute/Emoji zählen mehrfach)
  let daten;
  try {
    daten = text ? JSON.parse(text) : {};
  } catch {
    throw new PlattformFehler(400, "Ungültiges JSON.");
  }
  if (!daten || typeof daten !== "object" || Array.isArray(daten)) throw new PlattformFehler(400, "Ungültige Daten.");
  return daten;
}

/** Angemeldeten Nutzer aus dem Cookie lesen (oder null) */
export async function nutzerAusAnfrage(request, b = backend()) {
  const token = request.cookies.get(cookieName())?.value;
  if (!token) return null;
  const s = await tokenPruefen(token);
  if (!s) return null;
  // sitzungId: Sitzungseintrag muss bestehen (einzeln widerrufbar, siehe backend/demo/sicherheit.js)
  const u = await b.nutzerFuerSitzung(s.nutzerId, { sitzungId: s.sitzungId });
  if (!u || !u.aktiv || (u.sitzungVersion || 0) !== s.version) return null;
  return u;
}

/** Sitzungscookie setzen (sitzungId aus sitzungAnlegen – Anmeldung läuft über server/anmeldung.js) */
export async function sitzungSetzen(res, nutzer, { sitzungId = null } = {}) {
  const token = await tokenErstellen({ nutzerId: nutzer.id, version: nutzer.sitzungVersion || 0, sitzungId: sitzungId || nutzer.sitzung?.id || null });
  res.cookies.set(cookieName(), token, cookieOptionen());
  return res;
}

export function sitzungLoeschen(res) {
  res.cookies.set(cookieName(), "", { ...cookieOptionen(0), maxAge: 0 });
  return res;
}

/** Basis-URL für Links in E-Mails: in Produktion fest (kein Host-Header-Vertrauen) */
export function basisUrl(request) {
  if (process.env.NODE_ENV === "production") return (process.env.PLATTFORM_BASIS_URL || SITE.url).replace(/\/$/, "");
  return request.nextUrl.origin;
}

/** Nutzer für die Antwort an den Browser (ohne interne Felder) */
export function nutzerFuerBrowser(u) {
  if (!u) return null;
  return { id: u.id, email: u.email, vorname: u.vorname, nachname: u.nachname, firma: u.firma, telefon: u.telefon, rollen: u.rollen, emailBestaetigt: !!u.emailBestaetigt, suchprofil: u.suchprofil || null, mailEinstellungen: u.mailEinstellungen || null, backofficeRollen: u.backofficeRollen || null,
    // Login, Sicherheit & Teams: Komfort (Avatarfarbe, Sprache), Organisationskontext, 2FA-Status
    komfort: u.komfort || null, organisation: u.organisation || null, organisationen: u.organisationen || [], zweiFaktorAktiv: !!u.zweiFaktorAktiv, zweiFaktorPflichtOffen: !!u.zweiFaktorPflichtOffen };
}

/**
 * Route-Handler mit Rahmen.
 *
 * optionen:
 *   auth      true (Pflicht, Standard) | "optional" | false
 *   rollen    [..] – mindestens eine davon (admin darf immer)
 *   admin     true – nur Rolle admin
 *   limit     Name aus GRENZEN (je IP)
 *   json      true – JSON-Body lesen (Standard bei POST/PATCH/PUT/DELETE)
 *   upload    true – multipart statt JSON (eigene Kopfzeile Pflicht)
 *   maxBytes  Größe des JSON-Bodys
 *   ohne2fa   true – auch erreichbar, solange eine Pflicht-2FA noch nicht eingerichtet ist (Sicherheits-APIs)
 */
export function route(optionen, handler) {
  const o = { auth: true, ...optionen };
  return async (request, ctx) => {
    try {
      const mutation = !["GET", "HEAD", "OPTIONS"].includes(request.method);
      const params = ctx?.params ? await ctx.params : {};
      const ip = ipAdresse(request);

      if (mutation) {
        herkunftPruefen(request);
        if (o.upload && request.headers.get("x-plattform-upload") !== "1") throw new PlattformFehler(403, "Upload nur über das Portal.", "herkunft");
      }
      if (o.limit) rateLimit(`${o.limit}:${ip || "ohne-ip"}`, ...grenze(o.limit));

      const b = backend();
      let nutzer = null;
      if (o.auth) {
        nutzer = await nutzerAusAnfrage(request, b);
        if (!nutzer && o.auth === true) throw new PlattformFehler(401, "Bitte melden Sie sich an.");
        if (nutzer) {
          const admin = nutzer.rollen?.includes("admin");
          if (o.admin && !admin) throw new PlattformFehler(403, "Nur für das Backoffice.");
          if (o.rollen && !admin && !o.rollen.some((r) => nutzer.rollen?.includes(r))) {
            throw new PlattformFehler(403, "Dafür fehlt Ihnen die passende Rolle.");
          }
          // Pflicht-2FA (Rolle, z. B. Backoffice): bis zur Einrichtung nur Sicherheits-APIs
          if (nutzer.zweiFaktorPflichtOffen && !o.ohne2fa && o.auth === true) {
            throw new PlattformFehler(403, "Für Ihr Konto ist die Zwei-Faktor-Anmeldung Pflicht. Bitte richten Sie sie unter „Sicherheit“ ein.", "zwei_faktor_pflicht");
          }
        }
      }

      const body = mutation && !o.upload && o.json !== false ? await jsonLesen(request, o.maxBytes) : undefined;
      if (nutzer) adminRechtPruefen(nutzer, { request, body, params, recht: o.recht }); // feine Backoffice-Rechte für /api/admin/**
      const ergebnis = await handler({ request, params, nutzer, body, backend: b, ip, suche: request.nextUrl.searchParams });
      if (ergebnis instanceof Response) return ergebnis;
      return antwort(ergebnis === undefined ? { ok: true } : ergebnis);
    } catch (e) {
      return fehlerAntwort(e);
    }
  };
}
