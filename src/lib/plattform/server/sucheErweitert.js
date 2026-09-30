// src/lib/plattform/server/sucheErweitert.js
//
// Erweiterte globale Suche (Querschnitt, Team 10) für die Befehlspalette (Strg/⌘+K): zusätzlich zu
// Flächen/Projekten/Vorgängen/Nachrichten/Börse/Nutzern (backend/bedienung.js) auch Dokumente, Aufgaben, Anlagen,
// Entwicklungsprojekte, CRM-Kontakte, Termine und Support-Tickets.
//
// Nur über die vorhandenen, rechtegeprüften Listen-Operationen der Module (Demo und Frappe identisch) – es wird nie
// mehr gefunden, als der Nutzer auf den jeweiligen Seiten sehen darf. Jede Quelle ist optional (Fehler → leer).
// Links ausschließlich interne Portal-Pfade.

import { backend } from "../backend";
import { anlagenBackend } from "../backend/anlagen";
import { entwicklungBackend } from "../backend/entwicklung";
import { serviceBackend } from "../backend/service";
import { darfLesen } from "../rechte";
import { istPortalPfad, rangieren } from "../suche";
import { DOKUMENT_KATEGORIEN } from "../konstanten";
import { aktuelleVersionen } from "../querschnitt";

const leer = () => [];
const hat = (n, ...r) => r.some((x) => n?.rollen?.includes(x));
const tag = (iso) => (iso ? String(iso).slice(0, 10).split("-").reverse().join(".") : "");

export async function erweiterteTreffer(n, anfrage, { limit = 6 } = {}) {
  const admin = hat(n, "admin");
  const bo = (bereich) => admin && darfLesen(n, bereich);
  const [dokumente, aufgaben, anlagen, entwicklung, kontakte, termine, tickets] = await Promise.all([
    backend().dokumente(n).then(aktuelleVersionen).catch(leer),
    bo("aufgaben") ? backend().aufgaben(n, {}).catch(leer) : [],
    admin ? (bo("anlagen") ? anlagenBackend().anlagen(n, {}).catch(leer) : []) : hat(n, "unternehmen") ? anlagenBackend().anlagen(n, {}).catch(leer) : [],
    bo("entwicklung") ? entwicklungBackend().entwicklungPortfolio(n, {}).then((p) => p.projekte || []).catch(leer) : [],
    bo("crm") && typeof backend().crmKontakte === "function" ? backend().crmKontakte(n, { q: anfrage, limit: 50 }).then((r) => r.kontakte || []).catch(leer) : [],
    serviceBackend().termine(n, {}).catch(leer), // eigene Termine (Kunde bzw. Mitarbeiter) – ohne Erinnerungslauf
    serviceBackend().tickets(n, admin && bo("support") ? { alle: true } : {}).catch(leer),
  ]);

  const quellen = [
    dokumente.map((d) => ({ art: "dokument", id: d.id, titel: d.name, untertitel: [DOKUMENT_KATEGORIEN[d.kategorie] || d.kategorie, d.bezugTitel, (d.version || 1) > 1 ? `Version ${d.version}` : ""].filter(Boolean).join(" · "), href: `/portal/dokumente?q=${encodeURIComponent(d.name)}`, felder: [d.name, d.bezugTitel, d.bezugId, d.id] })),
    aufgaben.map((a) => ({ art: "aufgabe", id: a.id, titel: a.titel, untertitel: [a.faelligAm ? `fällig ${tag(a.faelligAm)}` : "", a.bezugTitel, a.zustaendig ? [a.zustaendig.vorname, a.zustaendig.nachname].filter(Boolean).join(" ") : ""].filter(Boolean).join(" · "), href: a.bezugLink && istPortalPfad(a.bezugLink) ? a.bezugLink : "/portal/admin/aufgaben", felder: [a.titel, a.text, a.bezugTitel, a.id] })),
    anlagen.map((a) => ({ art: "anlage", id: a.id, titel: a.name, untertitel: [a.ort, a.kwp ? `${String(a.kwp).replace(".", ",")} kWp` : "", a.statusLabel].filter(Boolean).join(" · "), href: admin ? `/portal/admin/anlagen/${a.id}` : `/portal/anlagen/${a.id}`, felder: [a.name, a.ort, a.id, a.bundesland, a.eigentuemer] })),
    entwicklung.map((p) => ({ art: "entwicklung", id: p.id, titel: p.titel, untertitel: [p.gemeinde, p.mwp ? `${String(p.mwp).replace(".", ",")} MWp` : "", p.phaseLabel || p.statusLabel].filter(Boolean).join(" · "), href: `/portal/admin/entwicklung/${p.id}`, felder: [p.titel, p.gemeinde, p.bundesland, p.id] })),
    kontakte.map((k) => ({ art: "kontakt", id: k.id, titel: [k.vorname, k.nachname].filter(Boolean).join(" ") || k.firma || k.id, untertitel: [k.firma, k.organisation?.name || k.organisationName, k.ort].filter(Boolean).join(" · "), href: `/portal/admin/crm/${k.id}`, felder: [k.vorname, k.nachname, k.firma, k.email, k.ort, k.id] })),
    termine.map((t) => ({ art: "termin", id: t.id, titel: t.titel || t.artLabel || "Termin", untertitel: [tag(t.start), t.artLabel, t.kontaktName || t.name].filter(Boolean).join(" · "), href: admin && bo("kalender") ? "/portal/admin/kalender" : `/portal/termine`, felder: [t.titel, t.artLabel, t.kontaktName, t.name, t.id] })),
    tickets.map((t) => ({ art: "ticket", id: t.id, titel: t.betreff || t.id, untertitel: [t.id, t.statusLabel || t.status].filter(Boolean).join(" · "), href: `/portal/support/${t.id}`, felder: [t.betreff, t.id] })),
  ];
  return quellen
    .flatMap((liste) => rangieren(liste, anfrage, (e) => e.felder.filter(Boolean), { limit }))
    .filter((t) => istPortalPfad(t.href))
    .map(({ felder: _f, ...t }) => t);
}
