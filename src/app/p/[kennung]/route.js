// GET /p/<kennung>?z=<pfadschlüssel> – Kurzlink für offengelegte Gruppen- und Partnerverweise (Welle 2, Paket GRP)
//
//  - 302 auf ein INTERNES, freigegebenes Ziel mit utm_source=<kennung>&utm_medium=gruppe|partner.
//    Ziele nur aus der Positivliste (Pfadschlüssel in src/lib/gruppe/partner-register.js → ZIELE und je Eintrag
//    `ziele`), zusätzlich durch sicheresZiel() (kein offener Redirect). Location ist ein relativer Pfad – kein
//    Host-Header-Vertrauen.
//  - Unbekannte, formal ungültige oder (in Produktion) Entwurfs-Kennungen → Startseite OHNE Parameter.
//  - Kein Cookie, kein Versand, kein Logging der Kennung, kein Zähler mit Personenbezug.
//  - Land: über `?l=DE|AT|CH` überschreibbar (nur Register-Länder), sonst das Land des Eintrags. Ziel je Land über
//    src/lib/land (Länderrouting aktiv, Welle 2); "start" = Einstieg des Landes (/de, /at, /ch).

import { kennungFinden, mediumFuerArt, REGISTER_LAENDER, zielPfad } from "@/lib/gruppe/partner-register";
import { sicheresZiel } from "@/lib/plattform/client";

const KOPF = {
  "Cache-Control": "no-store",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "X-Robots-Tag": "noindex, nofollow",
};

const weiter = (ziel) => new Response(null, { status: 302, headers: { ...KOPF, Location: ziel } });

/** Ziel für eine Kennung berechnen (Tests über GET: src/lib/gruppe/kurzlink.test.mjs). */
function kurzlinkZiel(kennung, suche) {
  const eintrag = kennungFinden(kennung);
  if (!eintrag) return "/";
  const schluessel = suche.get("z") || "start";
  const erlaubt = eintrag.ziele?.includes(schluessel) ? schluessel : "start";
  const landWunsch = String(suche.get("l") || "").toUpperCase();
  const land = REGISTER_LAENDER.includes(landWunsch) ? landWunsch : eintrag.land;
  const pfad = zielPfad(erlaubt, land) || "/";
  const sicher = sicheresZiel(pfad, "/");
  if (sicher !== pfad) return "/";
  const q = new URLSearchParams({ utm_source: eintrag.kennung, utm_medium: mediumFuerArt(eintrag.art) });
  return `${sicher}?${q}`;
}

export async function GET(request, { params }) {
  const { kennung } = (await params) || {};
  let suche;
  try {
    suche = new URL(request.url).searchParams;
  } catch {
    suche = new URLSearchParams();
  }
  return weiter(kurzlinkZiel(typeof kennung === "string" ? decodeURIComponentSicher(kennung) : "", suche));
}

export const HEAD = GET;

function decodeURIComponentSicher(s) {
  try {
    return decodeURIComponent(s);
  } catch {
    return "";
  }
}
