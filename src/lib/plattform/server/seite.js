// src/lib/plattform/server/seite.js
//
// Sitzung in Server-Komponenten (Seiten, Layouts). Die Middleware prüft vorab nur die
// Signatur; hier wird der Nutzer frisch geladen (Rollen, Sperre, Sitzungsversion).

import { cookies, headers } from "next/headers";
import { redirect, notFound } from "next/navigation";
import { backend } from "../backend";
import { cookieName, tokenPruefen } from "../sitzung";
import { PlattformFehler } from "../fehler";
import { seitenRechtOk } from "./rechte"; // Backoffice-Unterrollen

export async function aktuellerNutzer() {
  const token = (await cookies()).get(cookieName())?.value;
  if (!token) return null;
  const s = await tokenPruefen(token);
  if (!s) return null;
  const u = await backend().nutzerFuerSitzung(s.nutzerId, { sitzungId: s.sitzungId }); // Sitzungseintrag muss bestehen
  if (!u || !u.aktiv || (u.sitzungVersion || 0) !== s.version) return null;
  return u;
}

/** Aktuellen Pfad (von der Middleware als Kopfzeile gesetzt) für ?weiter= */
async function aktuellerPfad() {
  const h = await headers();
  const p = h.get("x-oi-pfad") || "/portal";
  return p.startsWith("/portal") ? p : "/portal";
}

/**
 * Für Portalseiten: Nutzer oder Weiterleitung zum Login.
 * rollen: mindestens eine davon (admin darf immer), sonst 404 (keine Existenz verraten).
 */
export async function portalNutzer({ rollen, admin } = {}) {
  const u = await aktuellerNutzer();
  if (!u) redirect(`/login?weiter=${encodeURIComponent(await aktuellerPfad())}`);
  // Pflicht-2FA noch nicht eingerichtet → nur die Sicherheitsseite
  if (u.zweiFaktorPflichtOffen && !(await aktuellerPfad()).startsWith("/portal/sicherheit")) redirect("/portal/sicherheit?pflicht=1");
  const istAdmin = u.rollen.includes("admin");
  if (admin && !istAdmin) notFound();
  if (admin && istAdmin && !seitenRechtOk(u, await aktuellerPfad())) notFound(); // Bereich ohne Leserecht der Unterrolle
  if (rollen && !istAdmin && !rollen.some((r) => u.rollen.includes(r))) notFound();
  return u;
}

export const istAdmin = (u) => !!u?.rollen?.includes("admin");
export const hatRolle = (u, ...rollen) => istAdmin(u) || rollen.some((r) => u?.rollen?.includes(r));

/** Backend-Aufruf in Seiten: 403/404 → notFound(), sonst weiterwerfen */
export async function laden(fn) {
  try {
    return await fn();
  } catch (e) {
    if (e instanceof PlattformFehler && [403, 404].includes(e.status)) notFound();
    throw e;
  }
}
