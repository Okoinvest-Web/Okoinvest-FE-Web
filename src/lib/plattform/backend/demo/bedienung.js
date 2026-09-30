// src/lib/plattform/backend/demo/bedienung.js
//
// Demo-Backend „Bedienung & Onboarding“: globale Suche (Befehlspalette) und
// Onboarding-Zustand am Konto. Die Suche setzt ausschließlich auf die bereits
// rechtegeprüften Operationen des Demo-Backends auf (vorgaenge, flaechen, projekte,
// boerse, nachrichtenThreads, nutzerListe) – sie kann dadurch nie mehr liefern,
// als der Nutzer ohnehin sehen darf. Admin-Sammlungen („alle“) nur mit Rolle admin.

import * as demo from "../demo";
import { aendern, lesen } from "./speicher";
import { jetzt } from "./hilfen";
import { PlattformFehler } from "../../fehler";
import { anfrageBereinigen, istPortalPfad, rangieren, SUCHE_MIN } from "../../suche";
import { onboardingAnwenden, onboardingBereinigen, onboardingLeer } from "../../onboarding";
import { FLAECHE_NUTZUNG, LAENDER, PROJEKT_TYPEN, VORGANG_TYPEN, rolleLabel } from "../../konstanten";
import { statusLabel } from "../../prozesse";

const istAdmin = (n) => !!n?.rollen?.includes("admin");
const hat = (n, ...r) => istAdmin(n) || r.some((x) => n?.rollen?.includes(x));
const name = (k) => [k?.vorname, k?.nachname].filter(Boolean).join(" ");

/** Treffer je Quelle – alle Felder, die angezeigt werden, stammen aus der rechtegeprüften Ausgabe */
function trefferVorgaenge(liste, admin) {
  return liste.map((v) => ({
    art: "vorgang",
    id: v.id,
    titel: `${VORGANG_TYPEN[v.typ] || "Anfrage"} · ${v.id}`,
    untertitel: [admin ? name(v.kontakt) || v.kontakt?.email : null, statusLabel("vorgang", v.status)].filter(Boolean).join(" · "),
    href: admin ? `/portal/admin/vorgaenge/${v.id}` : `/portal/anfragen/${v.id}`,
    felder: [VORGANG_TYPEN[v.typ], v.id, admin ? name(v.kontakt) : "", admin ? v.kontakt?.firma : "", admin ? v.kontakt?.email : "", statusLabel("vorgang", v.status)],
  }));
}

function trefferFlaechen(liste, admin) {
  return liste.map((f) => ({
    art: "flaeche",
    id: f.id,
    titel: f.bezeichnung || f.id,
    untertitel: [[f.plz, f.ort].filter(Boolean).join(" "), f.ha ? `${String(f.ha).replace(".", ",")} ha` : null, statusLabel("flaeche", f.status), admin && f.eigentuemer ? name(f.eigentuemer) : null].filter(Boolean).join(" · "),
    href: `/portal/flaechen/${f.id}`,
    felder: [f.bezeichnung, f.id, f.ort, f.plz, f.gemarkung, FLAECHE_NUTZUNG[f.nutzung], statusLabel("flaeche", f.status), admin && f.eigentuemer ? name(f.eigentuemer) : ""],
  }));
}

function trefferProjekte(liste, admin) {
  return liste.map((p) => ({
    art: "projekt",
    id: p.id,
    titel: p.titel || p.id,
    untertitel: [PROJEKT_TYPEN[p.typ], p.mwp ? `${String(p.mwp).replace(".", ",")} MWp` : null, statusLabel("projekt", p.status), admin && p.anbieter ? name(p.anbieter) : null].filter(Boolean).join(" · "),
    href: `/portal/projekte/${p.id}`,
    felder: [p.titel, p.id, PROJEKT_TYPEN[p.typ], p.region, LAENDER[p.land], statusLabel("projekt", p.status), admin && p.anbieter ? name(p.anbieter) : ""],
  }));
}

function trefferBoerse(liste) {
  return liste.map((p) => ({
    art: "boerse",
    id: p.id,
    titel: p.titel,
    untertitel: [PROJEKT_TYPEN[p.typ], p.mwp ? `${String(p.mwp).replace(".", ",")} MWp` : null, LAENDER[p.land], p.matching ? `${p.matching.score} % Passung` : null].filter(Boolean).join(" · "),
    href: `/portal/boerse/${p.id}`,
    felder: [p.titel, p.id, PROJEKT_TYPEN[p.typ], p.region, LAENDER[p.land]],
  }));
}

function trefferThreads(liste) {
  return liste
    .map((t) => ({
      art: "nachricht",
      id: `${t.bezugArt}:${t.bezugId}`,
      titel: t.titel || "Unterhaltung",
      untertitel: `${t.ungelesen ? `${t.ungelesen} ungelesen · ` : ""}${String(t.letzte?.text || "").slice(0, 90)}`,
      href: `/portal/nachrichten?bezug=${encodeURIComponent(t.bezugArt)}:${encodeURIComponent(t.bezugId)}`,
      felder: [t.titel, t.bezugId, t.letzte?.text, t.gegenueber],
    }));
}

function trefferNutzer(liste) {
  return liste.map((u) => ({
    art: "nutzer",
    id: u.id,
    titel: name(u) || u.email,
    untertitel: [u.email, u.firma, (u.rollen || []).map(rolleLabel).join(", ")].filter(Boolean).join(" · "),
    href: `/portal/admin/nutzer?q=${encodeURIComponent(u.email)}`,
    felder: [name(u), u.email, u.firma, u.id],
  }));
}

/**
 * Globale Suche über alles, was der Nutzer sehen darf.
 * Rückgabe: { q, treffer: [{ art, id, titel, untertitel, href }] } – max. `limit` je Art.
 */
export async function suchen(n, { q, limit = 6 } = {}) {
  if (!n) throw new PlattformFehler(401, "Bitte melden Sie sich an.");
  const anfrage = anfrageBereinigen(q);
  const max = Math.min(20, Math.max(1, Number(limit) || 6));
  if (anfrage.length < SUCHE_MIN) return { q: anfrage, treffer: [] };
  const admin = istAdmin(n);
  const leer = () => [];

  const [vorgaenge, flaechen, projekte, boerse, threads, nutzer] = await Promise.all([
    demo.vorgaenge(n, { alle: admin }).catch(leer),
    hat(n, "flaeche", "landwirt") ? demo.flaechen(n, { alle: admin }).catch(leer) : [],
    hat(n, "anbieter") ? demo.projekte(n, { alle: admin }).catch(leer) : [],
    hat(n, "investor") ? demo.boerse(n, {}).then((b) => b.projekte).catch(leer) : [],
    demo.nachrichtenThreads(n).catch(leer),
    admin ? demo.nutzerListe(n, {}).catch(leer) : [],
  ]);

  const quellen = [
    trefferFlaechen(flaechen, admin),
    trefferProjekte(projekte, admin),
    trefferVorgaenge(vorgaenge, admin),
    trefferThreads(threads),
    trefferBoerse(boerse),
    trefferNutzer(nutzer),
  ];
  const treffer = quellen
    .flatMap((liste) => rangieren(liste, anfrage, (e) => e.felder, { limit: max }))
    .filter((t) => istPortalPfad(t.href))
    .map(({ felder: _f, ...t }) => t);
  return { q: anfrage, treffer };
}

// ================================================================ Onboarding

export async function onboarding(n) {
  if (!n) throw new PlattformFehler(401, "Bitte melden Sie sich an.");
  const db = await lesen();
  const u = db.nutzer.find((x) => x.id === n.id);
  if (!u) throw new PlattformFehler(401, "Bitte melden Sie sich an.");
  return u.onboarding ? { ...onboardingBereinigen(u.onboarding), aktualisiertAm: u.onboarding.aktualisiertAm || null } : onboardingLeer();
}

export async function onboardingSpeichern(n, aenderung = {}) {
  if (!n) throw new PlattformFehler(401, "Bitte melden Sie sich an.");
  return aendern((db) => {
    const u = db.nutzer.find((x) => x.id === n.id);
    if (!u) throw new PlattformFehler(401, "Bitte melden Sie sich an.");
    const neu = { ...onboardingAnwenden(u.onboarding, aenderung), aktualisiertAm: jetzt() };
    u.onboarding = neu;
    return neu;
  });
}
