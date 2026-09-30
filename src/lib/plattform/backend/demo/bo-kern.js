// src/lib/plattform/backend/demo/bo-kern.js
//
// Gemeinsamer Kern des Backoffice-Ausbaus im Demo-Backend (CRM, Akquise, Automationen, Vorlagen,
// Berichte, Rechte). Eigene Daten liegen unter `db.bo` (wird beim ersten Zugriff angelegt und mit
// Beispieldaten befüllt – ohne den Rest der Demo-Datenbank anzutasten).
//
// Interne Helfer des Demo-Backends (Nachricht, Benachrichtigung, Postausgang, Statuswechsel …)
// registriert demo.js über werkzeugeSetzen() – so bleibt es bei EINER Implementierung dieser Regeln.

import { aendern, lesen } from "./speicher";
import { jetzt } from "./hilfen";
import { PlattformFehler } from "../../fehler";
import { BEREICHE, STUFE_LABEL, stufe } from "../../rechte";
import { flaechenScore } from "../../akquise";
import { LAENDER, PROJEKT_TYPEN, VORGANG_TYPEN } from "../../konstanten";
import { statusLabel } from "../../prozesse";
import { PHASEN } from "@/lib/invest/markt";

export const BO_VERSION = 1;

/** Werkzeuge aus demo.js (protokoll, nachricht, benachrichtigen, postausgangAnlegen, uebergangAnwenden, objekt, nutzerById, besitzer, aktiveAdmins, verlaufEintrag) */
export const W = {};
export function werkzeugeSetzen(w) {
  Object.assign(W, w);
}

let seedFn = null;
export function boSeedSetzen(fn) {
  seedFn = fn;
}

/** Struktur sicherstellen (idempotent). Liefert db.bo */
export function boSicher(db) {
  if (!db.bo || db.bo.version !== BO_VERSION) {
    const alt = db.bo || {};
    db.bo = {
      version: BO_VERSION,
      angelegtAm: jetzt(),
      kontakte: alt.kontakte || [],
      organisationen: alt.organisationen || [],
      aktivitaeten: alt.aktivitaeten || [],
      objektInfo: alt.objektInfo || {},
      gebiete: alt.gebiete || [],
      regeln: alt.regeln || [],
      lauf: alt.lauf || [],
      vorlagen: alt.vorlagen || [],
      fristen: alt.fristen || {},
    };
    if (seedFn && !alt.version) seedFn(db);
  }
  return db.bo;
}

/** Lesen mit sichergestellter Backoffice-Struktur */
export async function boLesen() {
  const db = await lesen();
  if (db.bo?.version === BO_VERSION) return db;
  await aendern((d) => {
    boSicher(d);
  });
  return lesen();
}

/** Ändern mit sichergestellter Backoffice-Struktur */
export function boAendern(fn) {
  return aendern((db) => {
    boSicher(db);
    return fn(db);
  });
}

// ---------------------------------------------------------------- Rechte (zusätzlich zur Route)

export function rechtNoetig(n, bereich, st = 1) {
  if (!n) throw new PlattformFehler(401, "Bitte melden Sie sich an.");
  if (!n.rollen?.includes("admin")) throw new PlattformFehler(403, "Nur für das Backoffice.");
  if (stufe(n, bereich) < st) {
    throw new PlattformFehler(403, `Ihre Backoffice-Rolle erlaubt im Bereich „${BEREICHE[bereich] || bereich}“ kein ${STUFE_LABEL[st]}.`, "recht");
  }
}

// ---------------------------------------------------------------- kleine Helfer

export const kurzKonto = (u) => (u ? { id: u.id, vorname: u.vorname, nachname: u.nachname, email: u.email, firma: u.firma || "" } : null);
export const nutzerVon = (db, id) => (id ? db.nutzer.find((u) => u.id === id) || null : null);
export const nameVon = (db, id) => {
  const u = nutzerVon(db, id);
  return u ? [u.vorname, u.nachname].filter(Boolean).join(" ") : "";
};
export const aktiveBackoffice = (db) => db.nutzer.filter((u) => u.aktiv && u.rollen.includes("admin"));

export const SAMMLUNG = { vorgang: "vorgaenge", flaeche: "flaechen", projekt: "projekte", interesse: "interessen", provision: "provisionen" };
export const objektVon = (db, art, id) => (SAMMLUNG[art] ? db[SAMMLUNG[art]].find((o) => o.id === id) || null : null);

/** Zusatzinfos je Objekt (Tags, Priorität, Akquise-Angaben) */
export function info(db, art, id, erzeugen = false) {
  const k = `${art}:${id}`;
  if (!db.bo.objektInfo[k] && erzeugen) db.bo.objektInfo[k] = { tags: [] };
  return db.bo.objektInfo[k] || { tags: [] };
}
export const tagsVon = (db, art, id) => db.bo?.objektInfo?.[`${art}:${id}`]?.tags || [];

export function tagSetzen(db, art, id, tag, an = true) {
  const i = info(db, art, id, true);
  i.tags = i.tags || [];
  const t = String(tag).trim().slice(0, 40);
  const vorhanden = i.tags.some((x) => x.toLowerCase() === t.toLowerCase());
  if (an && !vorhanden) i.tags.push(t);
  if (!an) i.tags = i.tags.filter((x) => x.toLowerCase() !== t.toLowerCase());
  return i.tags;
}

export function basisUrl() {
  return String(process.env.PLATTFORM_BASIS_URL || process.env.NEXT_PUBLIC_SITE_URL || "https://www.oekoinvest.com").replace(/\/$/, "");
}

/** Pfad für den Eigentümer im Portal */
export function portalPfad(art, o) {
  if (!o) return "/portal";
  if (art === "vorgang") return `/portal/anfragen/${o.id}`;
  if (art === "flaeche") return `/portal/flaechen/${o.id}`;
  if (art === "projekt") return `/portal/projekte/${o.id}`;
  if (art === "interesse") return `/portal/boerse/${o.projektId}`;
  return "/portal";
}

/** Pfad für das Backoffice */
export function adminPfad(art, o) {
  if (!o) return "/portal/admin";
  if (art === "vorgang") return `/portal/admin/vorgaenge/${o.id}`;
  if (art === "flaeche") return `/portal/flaechen/${o.id}`;
  if (art === "projekt") return `/portal/projekte/${o.id}`;
  if (art === "interesse") return `/portal/admin/interessen?id=${o.id}`;
  if (art === "provision") return "/portal/admin/deals";
  return "/portal/admin";
}

export function objektTitel(db, art, o) {
  if (!o) return "";
  if (art === "vorgang") return `${VORGANG_TYPEN[o.typ] || "Anfrage"} · ${[o.kontakt?.vorname, o.kontakt?.nachname].filter(Boolean).join(" ")}`;
  if (art === "flaeche") return o.bezeichnung || o.id;
  if (art === "projekt") return o.titel || o.id;
  if (art === "interesse") {
    const p = objektVon(db, "projekt", o.projektId);
    return `Interesse ${nameVon(db, o.investorId)} · ${p?.titel || o.projektId}`;
  }
  if (art === "provision") return `Provision ${o.id}`;
  return o.id;
}

/** Zugehörige Objekte (Vorgang ↔ Fläche, Interesse → Projekt) */
export function verwandte(db, art, o) {
  const r = { vorgang: null, flaeche: null, projekt: null, interesse: null };
  if (!o) return r;
  r[art] = o;
  if (art === "vorgang" && o.flaecheId) r.flaeche = objektVon(db, "flaeche", o.flaecheId);
  if (art === "flaeche" && o.vorgangId) r.vorgang = objektVon(db, "vorgang", o.vorgangId);
  if (art === "interesse") r.projekt = objektVon(db, "projekt", o.projektId);
  if (art === "provision") r.projekt = objektVon(db, "projekt", o.projektId);
  return r;
}

/** Kontaktperson eines Objekts: CRM-Kontakt mit Bezug, sonst Kontakt aus Vorgang bzw. Eigentümerkonto */
export function kontaktVon(db, art, o) {
  if (!o) return null;
  const crm = db.bo.kontakte.find((k) => (k.bezuege || []).some((b) => b.art === art && b.id === o.id));
  if (crm) return crm;
  const r = verwandte(db, art, o);
  if (r.vorgang?.kontakt?.email) {
    const k = db.bo.kontakte.find((x) => x.email && x.email === r.vorgang.email);
    return k || { ...r.vorgang.kontakt, email: r.vorgang.email };
  }
  const eigentuemerId = W.besitzer ? W.besitzer(db, art, o) : null;
  const u = nutzerVon(db, eigentuemerId);
  if (u) return db.bo.kontakte.find((x) => x.nutzerId === u.id) || { vorname: u.vorname, nachname: u.nachname, email: u.email, firma: u.firma, nutzerId: u.id };
  return null;
}

const zahl1 = (x) => (Number.isFinite(Number(x)) ? Math.round(Number(x) * 10) / 10 : null);

/** Kontext für Vorlagen ({{…}}) – nur unkritische Felder, nie vertrauliche Projektangaben */
export function kontextFuer(db, art, o, { kontakt } = {}) {
  const r = o ? verwandte(db, art, o) : { vorgang: null, flaeche: null, projekt: null, interesse: null };
  const k = kontakt || (o ? kontaktVon(db, art, o) : null) || {};
  const z = nutzerVon(db, o?.zustaendigId || r.flaeche?.zustaendigId || r.vorgang?.zustaendigId);
  const anrede = /^(herr|frau)$/i.test(k.anrede || "") ? k.anrede[0].toUpperCase() + k.anrede.slice(1).toLowerCase() : "";
  const briefanrede = anrede === "Frau" ? `Sehr geehrte Frau ${k.nachname || ""}`.trim() : anrede === "Herr" ? `Sehr geehrter Herr ${k.nachname || ""}`.trim() : `Guten Tag ${[k.vorname, k.nachname].filter(Boolean).join(" ")}`.trim();
  const f = r.flaeche;
  const fs = f ? flaechenScore(f, info(db, "flaeche", f.id)) : null;
  const p = r.projekt;
  return {
    anrede,
    briefanrede,
    vorname: k.vorname || "",
    nachname: k.nachname || "",
    firma: k.firma || "",
    email: k.email || "",
    ort: k.ort || f?.ort || "",
    vorgang: r.vorgang ? { id: r.vorgang.id, typ: VORGANG_TYPEN[r.vorgang.typ] || r.vorgang.typ, status: statusLabel("vorgang", r.vorgang.status) } : null,
    flaeche: f ? { bezeichnung: f.bezeichnung, ha: zahl1(f.ha), ort: f.ort, bundesland: f.bundesland, score: fs.score, mwp: fs.mwp, status: statusLabel("flaeche", f.status) } : null,
    projekt: p ? { titel: p.titel, mwp: zahl1(p.mwp), phase: PHASEN.find((x) => x.id === p.phase)?.label || p.phase, land: LAENDER[p.land] || p.land, status: statusLabel("projekt", p.status), typ: PROJEKT_TYPEN[p.typ] } : null,
    zustaendig: z ? { name: [z.vorname, z.nachname].filter(Boolean).join(" "), vorname: z.vorname } : { name: "Ihr ÖkoInvest-Team", vorname: "" },
    portal: { link: `${basisUrl()}${portalPfad(art, o)}` },
    heute: new Date().toLocaleDateString("de-DE", { timeZone: "Europe/Vienna", day: "2-digit", month: "2-digit", year: "numeric" }),
  };
}

/** Fakten für Bedingungen (typ, land, bundesland, plz, mwp, ha, score, kanal, status, kategorie, tags) */
export function faktenFuer(db, art, o, extra = {}) {
  const r = verwandte(db, art, o);
  const f = r.flaeche;
  const vg = r.vorgang;
  const p = r.projekt;
  const d = vg?.daten || {};
  const haWert = f?.ha ?? (Number(d.ha ?? d.hektar ?? d.flaecheHa) || null);
  let score = null;
  if (f) score = flaechenScore(f, info(db, "flaeche", f.id)).score;
  const mwpWert = p?.mwp ?? (Number(d.mwp) || (haWert ? Math.round((haWert / 1.1) * 10) / 10 : null));
  const tags = [...new Set([...tagsVon(db, art, o?.id), ...(f && art !== "flaeche" ? tagsVon(db, "flaeche", f.id) : []), ...(vg && art !== "vorgang" ? tagsVon(db, "vorgang", vg.id) : [])])];
  return {
    typ: art === "projekt" || art === "interesse" ? p?.typ : vg?.typ || (f ? (f.agri ? "agri" : "flaeche") : null),
    land: p?.land || f?.land || vg?.kontakt?.land || null,
    bundesland: p?.bundesland || f?.bundesland || d.bundesland || null,
    plz: f?.plz || vg?.kontakt?.plz || null,
    mwp: mwpWert,
    ha: haWert,
    score,
    kanal: vg?.herkunft?.kanal || vg?.herkunft?.utm_source || null,
    status: o?.status || null,
    kategorie: null,
    tags,
    ...extra,
  };
}

/**
 * Zeitpunkt des Erstkontakts (SLA): frühester Kontakt des Backoffice nach Eingang –
 * CRM-Aktivität (Anruf/E-Mail/Termin) am Objekt oder am Kontakt, Nachricht des Backoffice
 * im Thread (nicht System) oder ein Statuswechsel durch das Backoffice.
 */
export function erstkontaktAm(db, art, o, eingangAm) {
  if (!o) return null;
  const r = verwandte(db, art, o);
  const ids = new Set([r.vorgang?.id, r.flaeche?.id].filter(Boolean));
  const k = kontaktVon(db, art, o);
  const zeiten = [];
  for (const a of db.bo.aktivitaeten) {
    if (!["anruf", "email", "termin"].includes(a.typ)) continue;
    if ((a.bezugId && ids.has(a.bezugId)) || (k?.id && a.kontaktId === k.id)) zeiten.push(a.am);
  }
  for (const m of db.nachrichten) if (ids.has(m.bezugId) && m.vonAdmin && !m.system) zeiten.push(m.am);
  for (const x of [r.vorgang, r.flaeche].filter(Boolean)) {
    for (const e of x.statusVerlauf || []) if (e.vonRolle === "admin" && !["eingegangen", "entwurf"].includes(e.status)) zeiten.push(e.am);
  }
  const ab = eingangAm ? new Date(eingangAm).getTime() : 0;
  const gueltig = zeiten.filter((t) => t && new Date(t).getTime() >= ab - 60e3).sort();
  return gueltig[0] || null;
}

/** Eingang eines Objekts für die SLA (Vorgang: Anfrage; Fläche: Einreichung bzw. Anfrage) */
export function eingangAm(db, art, o) {
  if (!o) return null;
  if (art === "vorgang") return o.erstelltAm;
  if (art === "flaeche") {
    const vg = o.vorgangId ? objektVon(db, "vorgang", o.vorgangId) : null;
    const e = (o.statusVerlauf || []).find((x) => x.status === "eingegangen");
    return vg?.erstelltAm || e?.am || o.erstelltAm;
  }
  return o.erstelltAm;
}
