// src/components/Gruppe/VerweisBaustein.js
//
// Vorlage für offengelegte Verweise auf Websites der ÖKOVOLT-Gruppe (oekovolt.de, oekovolt.com) und bei Partnern
// (Welle 2, Paket GRP). Liefert statisches HTML und Klartext ZUM KOPIEREN – der Einbau auf fremden Domains gehört
// nicht in dieses Repo und erfolgt durch die Gruppe bzw. den Partner.
//
// Grundsätze:
//  - Der Verweis nennt die Gruppenzugehörigkeit offen („Teil der ÖKOVOLT-Gruppe“) und ist als Link zur
//    Projektentwicklung der Gruppe erkennbar; keine versteckten Links, keine Tracking-Pixel, kein Skript.
//  - Ziel ist immer der Kurzlink /p/<kennung>?z=<pfadschlüssel> – die Weiterleitung prüft Kennung und Ziel serverseitig.
//  - Keine Vergütungs-, Provisions- oder Erfolgsaussagen (Stop-Liste), keine Zahlen, keine Umweltaussagen.
//  - Inline-Stile, weil die Zielseite fremdes CSS hat; Farben aus dem Design-System (ov-700, ink-700, ink-200).
// Prüfung Rechtsabteilung: Wortlaut der Offenlegung (Kennzeichnung als Verweis innerhalb der Unternehmensgruppe
// nach Lauterkeitsrecht DE/AT/CH – einschlägige Normen zu prüfen) vor dem ersten Einbau.
//
// Reines JavaScript ohne JSX/Hooks – in Server-, Client-Komponenten und Tests nutzbar.

import { SITE } from "@/data/site";
import { kennungFinden, ZIELE } from "@/lib/gruppe/partner-register";

const ESC = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };
export const html = (s) => String(s ?? "").replace(/[&<>"']/g, (z) => ESC[z]);

/** Kurzlink-URL für Kennung und Pfadschlüssel (oder null, wenn die Kennung nicht wirksam ist). */
export function verweisUrl({ kennung, ziel = "start", basis = SITE.url, optionen } = {}) {
  const e = kennungFinden(kennung, optionen);
  if (!e) return null;
  const z = e.ziele?.includes(ziel) && Object.hasOwn(ZIELE, ziel) ? ziel : "start";
  const b = String(basis || "").replace(/\/+$/, "");
  return `${b}/p/${encodeURIComponent(e.kennung)}${z === "start" ? "" : `?z=${encodeURIComponent(z)}`}`;
}

/** Textbausteine je Partnerart (gruppe: Verweis von Gruppen-Websites; sonst: Partnerverweis). */
export function verweisTexte(eintrag) {
  const gruppe = eintrag?.art === "gruppe";
  return {
    titel: gruppe ? "Projektentwicklung der Gruppe" : "Photovoltaik-Projektentwicklung",
    text: gruppe
      ? `Photovoltaik-Projekte auf Freiflächen und als Agri-PV entwickelt in unserer Gruppe die ${SITE.firma}.`
      : `Informationen zur Photovoltaik-Projektentwicklung auf Freiflächen und als Agri-PV finden Sie bei der ${SITE.firma}.`,
    offenlegung: gruppe
      ? `Hinweis: Die ${SITE.firma} ist Teil der ${SITE.gruppe}. Dies ist ein Verweis innerhalb der Unternehmensgruppe.`
      : `Hinweis: Die ${SITE.firma} ist Teil der ${SITE.gruppe}. Dieser Link führt auf deren Website.`,
    linkText: `Zur ${SITE.name}-Website`,
  };
}

/**
 * Statisches HTML-Snippet zum Einbau. Gibt null zurück, wenn die Kennung nicht wirksam ist.
 * optionen.basis: Domain (Standard SITE.url); optionen.optionen: Register-Optionen (Tests).
 */
export function verweisHtml({ kennung, ziel = "start", basis, optionen } = {}) {
  const e = kennungFinden(kennung, optionen);
  const url = verweisUrl({ kennung, ziel, basis, optionen });
  if (!e || !url) return null;
  const t = verweisTexte(e);
  return [
    `<!-- ${html(SITE.name)}: offengelegter Verweis (${html(e.kennung)}) – unverändert einbauen; kein Skript, kein Pixel -->`,
    `<aside aria-label="${html(t.titel)}" style="border:1px solid #dfe3ea;border-radius:16px;padding:16px 20px;max-width:560px;font:15px/1.5 system-ui,-apple-system,'Segoe UI',sans-serif;color:#394050;background:#ffffff">`,
    `  <p style="margin:0 0 4px;font-weight:600;color:#151a24">${html(t.titel)}</p>`,
    `  <p style="margin:0 0 10px">${html(t.text)}</p>`,
    `  <p style="margin:0 0 10px"><a href="${html(url)}" style="color:#436621;font-weight:600;text-decoration:underline">${html(t.linkText)}</a></p>`,
    `  <p style="margin:0;font-size:13px;color:#5a6375">${html(t.offenlegung)}</p>`,
    `</aside>`,
  ].join("\n");
}

/** Klartext-Variante (z. B. für Newsletter-Vorlagen der Gruppe – Versand nicht aus diesem Repo). */
export function verweisText({ kennung, ziel = "start", basis, optionen } = {}) {
  const e = kennungFinden(kennung, optionen);
  const url = verweisUrl({ kennung, ziel, basis, optionen });
  if (!e || !url) return null;
  const t = verweisTexte(e);
  return `${t.titel}\n${t.text}\n${url}\n${t.offenlegung}`;
}
