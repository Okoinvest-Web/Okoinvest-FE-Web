// src/lib/plattform/backend/demo/service-tickets.js
//
// Service & Support (Tickets mit SLA) im Demo-Backend – Referenz für plattform/api/support.py (docs/API.md, Abschnitt „Dokumente, Signatur, Termine, Service & HR“).
// Ohne Frappe Helpdesk die eigene, schlanke Ticket-Logik; mit Helpdesk spiegelt Frappe nach „HD Ticket“.
//
// Rechte:
//   Kunde         – eigene Tickets (kontoId) bzw. Tickets der Organisation (Teamrolle ≥ lesen; schreiben ab „Mitglied“);
//                   eröffnen, antworten, Anhänge, als gelöst markieren. Sieht nie interne Notizen und keine SLA-Interna.
//   Backoffice    – Bereich „support“: lesen ≥ 1 alle Tickets; schreiben = 2 antworten, interne Notizen, Status, Priorität,
//                   Zuweisung, Ticket aus Anlagen-Störung (Unterrollen leitung, betrieb).
//   sonst         – 403 (Seiten 404)

import { PlattformFehler, konflikt, nichtGefunden, verboten } from "../../fehler";
import * as v from "../../validierung";
import {
  PRIORITAET_AUS_SCHWERE, TICKET_GRENZEN, TICKET_KATEGORIEN, TICKET_KATEGORIE_IDS, TICKET_OFFEN, TICKET_PRIORITAETEN, TICKET_PRIORITAET_IDS, TICKET_STATUS,
  slaFristen, slaStand,
} from "../../tickets";
import { vertretungFinden } from "../../hr";
import { heuteTag } from "../../termine";
import { darfSchreiben } from "../../rechte";
import { jetzt, neueId, sha256 } from "./hilfen";
import { darfTeamLesenObjekt, darfTeamSchreibenObjekt, organisationFuerNeu } from "./teams";
import { angemeldet, aendernBereit, backofficeKonten, boLesen, boSchreiben, dateiLesen, dateiSchreiben, kontoKurz, lesenBereit, melden, nameVon, nutzerById, protokoll, schreibNoetig } from "./service-kern";

const BEREICH = "support";
const LABEL = "Service & Support";

function zugriff(db, n, t) {
  if (!n || !t) return null;
  if (boLesen(n, BEREICH)) return "backoffice";
  if (t.kontoId === n.id) return "kunde";
  if (darfTeamSchreibenObjekt(db, n, t)) return "team-schreiben";
  if (darfTeamLesenObjekt(db, n, t)) return "team-lesen";
  return null;
}

function laden(db, n, id) {
  angemeldet(n);
  const t = db.service.tickets.find((x) => x.id === v.kennung(id));
  if (!t) throw nichtGefunden("Ticket nicht gefunden.");
  if (!zugriff(db, n, t)) throw verboten("Dieses Ticket gehört nicht zu Ihrem Konto.");
  return t;
}

function ausgabe(db, n, t, { detail = false } = {}) {
  const zg = zugriff(db, n, t);
  const bo = zg === "backoffice";
  const sla = slaStand(t);
  const anlage = t.anlageId ? (db.anlagen?.anlagen || []).find((a) => a.id === t.anlageId) : null;
  const basis = {
    id: t.id, betreff: t.betreff, kategorie: t.kategorie, kategorieLabel: TICKET_KATEGORIEN[t.kategorie]?.label || t.kategorie,
    prioritaet: t.prioritaet, prioritaetLabel: TICKET_PRIORITAETEN[t.prioritaet]?.label || t.prioritaet,
    status: t.status, statusLabel: TICKET_STATUS[t.status]?.label || t.status, offen: TICKET_OFFEN.includes(t.status),
    anlage: anlage ? { id: anlage.id, name: anlage.name } : null, stoerungId: t.stoerungId || null,
    kunde: bo ? kontoKurz(db, t.kontoId) : undefined,
    zustaendig: t.zustaendigId ? (bo ? kontoKurz(db, t.zustaendigId) : { name: nameVon(db, t.zustaendigId) }) : null,
    sla: bo ? sla : { ampel: sla.ampel === "verletzt" || sla.ampel === "warn" ? "ok" : sla.ampel, reaktionBis: t.slaReaktionBis, geantwortet: !!t.ersteReaktionAm },
    antworten: t.nachrichten.filter((m) => bo || !m.intern).length,
    ungelesen: bo ? !t.gelesenBackoffice : !t.gelesenKunde,
    erstelltAm: t.erstelltAm, geaendertAm: t.geaendertAm, helpdesk: bo ? t.helpdesk || null : undefined,
    meinZugriff: zg,
    darfAntworten: bo ? boSchreiben(n, BEREICH) : zg === "kunde" || zg === "team-schreiben",
    darfBearbeiten: boSchreiben(n, BEREICH),
  };
  if (!detail) return basis;
  return {
    ...basis,
    nachrichten: t.nachrichten.filter((m) => bo || !m.intern).map((m) => ({ id: m.id, am: m.am, text: m.text, intern: !!m.intern, backoffice: !!m.backoffice, vonName: m.backoffice && !bo ? `${nameVon(db, m.vonId).split(" ")[0] || "ÖkoInvest"} (ÖkoInvest Service)` : nameVon(db, m.vonId) || "System", ich: m.vonId === n.id })),
    anhaenge: t.anhaenge.map((a) => ({ id: a.id, name: a.name, mime: a.mime, groesse: a.groesse, am: a.am, vonName: nameVon(db, a.vonId) })),
    verlauf: bo ? t.verlauf : undefined,
  };
}

function verlauf(t, text, n) {
  t.verlauf.push({ am: jetzt(), text: v.text(text, 300), vonId: n?.id || null });
}

/** Zuständigkeit: Support-Schreibende, abwesende Personen über die Vertretung, sonst die mit den wenigsten offenen Tickets */
function zustaendigWaehlen(db) {
  const kandidaten = backofficeKonten(db).filter((u) => darfSchreiben(u, BEREICH));
  if (!kandidaten.length) return null;
  const offen = (id) => db.service.tickets.filter((t) => t.zustaendigId === id && TICKET_OFFEN.includes(t.status)).length;
  const sortiert = [...kandidaten].sort((a, b) => offen(a.id) - offen(b.id));
  for (const u of sortiert) {
    const z = vertretungFinden({ mitarbeiterId: u.id, tag: heuteTag(), abwesenheiten: db.service.abwesenheiten, mitarbeiter: db.service.mitarbeiter });
    if (z) return z.id;
  }
  return sortiert[0].id;
}

function ticketErzeugen(db, n, { betreff, kategorie, prioritaet, text, kontoId, organisationId = null, anlageId = null, stoerungId = null, herkunft = "portal" }) {
  const erstellt = jetzt();
  const frist = slaFristen(prioritaet, erstellt);
  const t = {
    id: neueId("TK"), betreff, kategorie, prioritaet, status: "neu", kontoId, organisationId, anlageId, stoerungId, herkunft,
    zustaendigId: zustaendigWaehlen(db), slaReaktionBis: frist.reaktionBis, slaLoesungBis: frist.loesungBis,
    ersteReaktionAm: null, geloestAm: null, nachrichten: [], anhaenge: [], verlauf: [], erstelltAm: erstellt, geaendertAm: erstellt,
    gelesenKunde: true, gelesenBackoffice: false, helpdesk: null,
  };
  if (text) t.nachrichten.push({ id: neueId("TN"), am: erstellt, vonId: n?.id || null, backoffice: herkunft === "stoerung", intern: false, text });
  verlauf(t, `Ticket eröffnet (${TICKET_KATEGORIEN[kategorie]?.label}, ${TICKET_PRIORITAETEN[prioritaet]?.label})`, n);
  db.service.tickets.push(t);
  if (t.zustaendigId) melden(db, t.zustaendigId, { art: "ticket", titel: `Neues Ticket: ${betreff}`, text: `${TICKET_PRIORITAETEN[prioritaet].label} · Reaktion bis ${new Date(t.slaReaktionBis).toLocaleString("de-DE", { timeZone: "Europe/Vienna", dateStyle: "short", timeStyle: "short" })}`, link: `/portal/admin/support?ticket=${t.id}`, objektArt: "ticket", objektId: t.id });
  if (kontoId && kontoId !== n?.id) melden(db, kontoId, { art: "ticket", titel: `Ticket eröffnet: ${betreff}`, text: "Wir kümmern uns darum.", link: `/portal/support/${t.id}`, objektArt: "ticket", objektId: t.id });
  return t;
}

// ================================================================ Lesen

export async function tickets(n, { status = "", alle = false, q = "" } = {}) {
  angemeldet(n);
  const db = await lesenBereit();
  const bo = boLesen(n, BEREICH);
  const such = v.text(q, 80).toLowerCase();
  return db.service.tickets
    .filter((t) => (alle && bo ? true : t.kontoId === n.id || darfTeamLesenObjekt(db, n, t)))
    .filter((t) => (status === "offen" ? TICKET_OFFEN.includes(t.status) : status === "erledigt" ? !TICKET_OFFEN.includes(t.status) : !status || t.status === status))
    .filter((t) => !such || [t.id, t.betreff, nameVon(db, t.kontoId)].join(" ").toLowerCase().includes(such))
    .sort((a, b) => {
      if (bo && alle) {
        const pa = (TICKET_OFFEN.includes(a.status) ? 10 : 0) + TICKET_PRIORITAETEN[a.prioritaet].stufe;
        const pb = (TICKET_OFFEN.includes(b.status) ? 10 : 0) + TICKET_PRIORITAETEN[b.prioritaet].stufe;
        if (pa !== pb) return pb - pa;
      }
      return String(b.geaendertAm).localeCompare(String(a.geaendertAm));
    })
    .slice(0, 500)
    .map((t) => ausgabe(db, n, t));
}

export async function ticket(n, id, { markieren = true } = {}) {
  const db0 = await lesenBereit();
  const t0 = laden(db0, n, id);
  const bo = zugriff(db0, n, t0) === "backoffice";
  if (markieren && ((bo && !t0.gelesenBackoffice) || (!bo && !t0.gelesenKunde))) {
    return aendernBereit((db) => {
      const t = laden(db, n, id);
      if (bo) t.gelesenBackoffice = true;
      else t.gelesenKunde = true;
      return ausgabe(db, n, t, { detail: true });
    });
  }
  return ausgabe(db0, n, t0, { detail: true });
}

// ================================================================ Anlegen & Antworten

export async function ticketAnlegen(n, daten = {}, { anlagePruefen } = {}) {
  angemeldet(n);
  const betreff = v.text(daten.betreff, TICKET_GRENZEN.betreff);
  v.pflicht(betreff.length >= 4, "Bitte geben Sie einen Betreff an (mind. 4 Zeichen).");
  const text = v.mehrzeilig(daten.text, TICKET_GRENZEN.text);
  v.pflicht(text.length >= 10, "Bitte beschreiben Sie Ihr Anliegen (mind. 10 Zeichen).");
  const kategorie = v.auswahl(daten.kategorie, TICKET_KATEGORIE_IDS, "sonstiges");
  const bo = boSchreiben(n, BEREICH);
  // Kunden wählen höchstens „hoch“ – „kritisch“ setzt das Backoffice (bzw. die Störungs-Übernahme)
  const prioritaet = v.auswahl(daten.prioritaet, bo ? TICKET_PRIORITAET_IDS : ["niedrig", "normal", "hoch"], kategorie === "stoerung" ? "hoch" : "normal");
  let anlageId = null;
  if (daten.anlageId) {
    // Zugriff auf die Anlage vorab über das Anlagen-Modul (fremde Anlage → 403)
    if (anlagePruefen) await anlagePruefen(v.kennung(daten.anlageId));
    anlageId = v.kennung(daten.anlageId);
  }
  return aendernBereit((db) => {
    const kontoId = bo && daten.fuerKontoId ? nutzerById(db, v.kennung(daten.fuerKontoId))?.id || null : n.id;
    if (bo && daten.fuerKontoId && !kontoId) throw nichtGefunden("Konto nicht gefunden.");
    const organisationId = bo ? null : organisationFuerNeu(db, n);
    const t = ticketErzeugen(db, n, { betreff, kategorie, prioritaet, text, kontoId, organisationId, anlageId, herkunft: bo ? "backoffice" : "portal" });
    protokoll(db, n, "ticket", "ticket", t.id, `Ticket „${betreff}“ eröffnet`);
    return ausgabe(db, n, t, { detail: true });
  });
}

export async function ticketAntworten(n, id, { text, intern = false } = {}) {
  angemeldet(n);
  const inhalt = v.mehrzeilig(text, TICKET_GRENZEN.text);
  v.pflicht(inhalt.length >= 2, "Bitte geben Sie eine Nachricht ein.");
  return aendernBereit((db) => {
    const t = laden(db, n, id);
    const zg = zugriff(db, n, t);
    const bo = zg === "backoffice";
    if (bo && !boSchreiben(n, BEREICH)) throw verboten("Ihre Backoffice-Rolle erlaubt im Bereich „Service & Support“ kein Schreiben.");
    if (!bo && zg === "team-lesen") throw verboten("Mit der Rolle „Nur lesen“ können Sie nicht antworten.");
    if (t.status === "geschlossen") throw konflikt("Das Ticket ist geschlossen. Bitte eröffnen Sie ein neues Ticket.");
    const istIntern = bo && v.wahr(intern);
    t.nachrichten.push({ id: neueId("TN"), am: jetzt(), vonId: n.id, backoffice: bo, intern: istIntern, text: inhalt });
    t.geaendertAm = jetzt();
    if (bo && !istIntern) {
      if (!t.ersteReaktionAm) t.ersteReaktionAm = jetzt();
      if (t.status === "neu") t.status = "in_arbeit";
      t.gelesenKunde = false;
      melden(db, t.kontoId, { art: "ticket", titel: `Antwort zu: ${t.betreff}`, text: "Das Service-Team hat geantwortet.", link: `/portal/support/${t.id}`, objektArt: "ticket", objektId: t.id });
    } else if (!bo) {
      if (["wartet_kunde", "geloest"].includes(t.status)) {
        verlauf(t, "Wieder geöffnet durch Antwort des Kunden", n);
        t.status = "in_arbeit";
        t.geloestAm = null;
      }
      t.gelesenBackoffice = false;
      if (t.zustaendigId) melden(db, t.zustaendigId, { art: "ticket", titel: `Kundenantwort: ${t.betreff}`, text: nameVon(db, n.id), link: `/portal/admin/support?ticket=${t.id}`, objektArt: "ticket", objektId: t.id }, { mail: false });
    }
    return ausgabe(db, n, t, { detail: true });
  });
}

export async function ticketAktion(n, id, { aktion, status, prioritaet, zustaendigId } = {}) {
  angemeldet(n);
  return aendernBereit((db) => {
    const t = laden(db, n, id);
    const zg = zugriff(db, n, t);
    if (zg !== "backoffice") {
      // Kunde: nur „gelöst“ bestätigen bzw. schließen
      if (zg === "team-lesen") throw verboten("Mit der Rolle „Nur lesen“ können Sie das Ticket nicht ändern.");
      if (aktion !== "schliessen") throw verboten("Diese Änderung kann nur das Service-Team vornehmen.");
      if (!TICKET_OFFEN.includes(t.status) && t.status !== "geloest") throw konflikt("Das Ticket ist bereits geschlossen.");
      t.status = "geschlossen";
      t.geloestAm = t.geloestAm || jetzt();
      verlauf(t, "Vom Kunden geschlossen", n);
      t.geaendertAm = jetzt();
      return ausgabe(db, n, t, { detail: true });
    }
    schreibNoetig(n, BEREICH, LABEL);
    if (aktion === "status") {
      const st = v.auswahl(status, TICKET_STATUS, "");
      v.pflicht(st, "Unbekannter Status.");
      if (st === t.status) return ausgabe(db, n, t, { detail: true });
      verlauf(t, `Status: ${TICKET_STATUS[t.status].label} → ${TICKET_STATUS[st].label}`, n);
      t.status = st;
      if (st === "geloest" || st === "geschlossen") t.geloestAm ||= jetzt(); // direkt geschlossen: SLA-Lösungsfrist nicht weiterlaufen lassen
      if (TICKET_OFFEN.includes(st)) t.geloestAm = null;
      if (st !== "neu" && !t.ersteReaktionAm) t.ersteReaktionAm = jetzt();
      melden(db, t.kontoId, { art: "ticket", titel: `${TICKET_STATUS[st].label}: ${t.betreff}`, text: st === "geloest" ? "Bitte prüfen Sie die Lösung – mit einer Antwort öffnen Sie das Ticket wieder." : "Der Status Ihres Tickets hat sich geändert.", link: `/portal/support/${t.id}`, objektArt: "ticket", objektId: t.id }, { mail: st === "geloest" || st === "wartet_kunde" });
    } else if (aktion === "prioritaet") {
      const p = v.auswahl(prioritaet, TICKET_PRIORITAET_IDS, "");
      v.pflicht(p, "Unbekannte Priorität.");
      const f = slaFristen(p, t.erstelltAm);
      verlauf(t, `Priorität: ${TICKET_PRIORITAETEN[t.prioritaet].label} → ${TICKET_PRIORITAETEN[p].label} (SLA neu berechnet)`, n);
      Object.assign(t, { prioritaet: p, slaReaktionBis: f.reaktionBis, slaLoesungBis: f.loesungBis });
    } else if (aktion === "zuweisen") {
      const z = nutzerById(db, v.kennung(zustaendigId));
      v.pflicht(z && z.aktiv && z.rollen.includes("admin"), "Zuständig kann nur ein aktives Backoffice-Konto sein.");
      t.zustaendigId = z.id;
      verlauf(t, `Zugewiesen an ${nameVon(db, z.id)}`, n);
      if (z.id !== n.id) melden(db, z.id, { art: "ticket", titel: `Ticket zugewiesen: ${t.betreff}`, text: `Von ${nameVon(db, n.id)}`, link: `/portal/admin/support?ticket=${t.id}`, objektArt: "ticket", objektId: t.id });
    } else throw new PlattformFehler(422, "Unbekannte Aktion.");
    t.geaendertAm = jetzt();
    protokoll(db, n, "ticket", "ticket", t.id, `Ticket ${aktion}`);
    return ausgabe(db, n, t, { detail: true });
  });
}

/** Ticket aus einer Anlagen-Störung (Backoffice). Idempotent je Störung. */
export async function ticketAusStoerung(n, stoerungId) {
  schreibNoetig(n, BEREICH, LABEL);
  return aendernBereit((db) => {
    const s = (db.anlagen?.stoerungen || []).find((x) => x.id === v.kennung(stoerungId));
    if (!s) throw nichtGefunden("Störung nicht gefunden.");
    const vorhanden = db.service.tickets.find((t) => t.stoerungId === s.id);
    if (vorhanden) return ausgabe(db, n, vorhanden, { detail: true });
    const a = (db.anlagen?.anlagen || []).find((x) => x.id === s.anlageId);
    const t = ticketErzeugen(db, n, {
      betreff: `Störung ${a?.name ? `„${a.name}“` : s.anlageId}: ${s.titel}`.slice(0, TICKET_GRENZEN.betreff), kategorie: "stoerung", prioritaet: PRIORITAET_AUS_SCHWERE[s.schwere] || "normal",
      text: `Automatisch aus dem Störungs-Leitstand übernommen.\n\n${s.text || s.titel}`, kontoId: a?.kundeId || null, organisationId: a?.organisationId || null, anlageId: s.anlageId, stoerungId: s.id, herkunft: "stoerung",
    });
    t.ersteReaktionAm = jetzt(); // Übernahme durch den Betrieb = erste Reaktion
    protokoll(db, n, "ticket", "ticket", t.id, `Ticket aus Störung ${s.id} angelegt`);
    return ausgabe(db, n, t, { detail: true });
  });
}

// ================================================================ Anhänge

export async function ticketAnhangSpeichern(n, id, { name, mime, daten }) {
  angemeldet(n);
  if (!["application/pdf", "image/jpeg", "image/png"].includes(mime)) throw new PlattformFehler(415, "Erlaubt sind PDF, JPG und PNG.");
  if (!daten?.length || daten.length > TICKET_GRENZEN.anhangBytes) throw new PlattformFehler(413, "Die Datei ist leer oder größer als 10 MB.");
  const db0 = await lesenBereit();
  const t0 = laden(db0, n, id);
  const zg0 = zugriff(db0, n, t0);
  if (zg0 === "team-lesen" || (zg0 === "backoffice" && !boSchreiben(n, BEREICH))) throw verboten("Keine Berechtigung für Anhänge.");
  if (t0.anhaenge.length >= TICKET_GRENZEN.anhaenge) throw konflikt(`Höchstens ${TICKET_GRENZEN.anhaenge} Anhänge je Ticket.`);
  const endung = { "application/pdf": "pdf", "image/jpeg": "jpg", "image/png": "png" }[mime];
  const datei = dateiSchreiben("TKA", endung, daten);
  return aendernBereit((db) => {
    const t = laden(db, n, id);
    const sauber = v.text(name, 120).replace(/[\\/:*?"<>|]/g, "_") || `anhang.${endung}`;
    const a = { id: neueId("TA"), name: sauber, mime, groesse: daten.length, datei, am: jetzt(), vonId: n.id, sha256: sha256(daten) };
    t.anhaenge.push(a);
    t.geaendertAm = jetzt();
    verlauf(t, `Anhang ${sauber}`, n);
    return { id: a.id, name: a.name, mime: a.mime, groesse: a.groesse, am: a.am };
  });
}

export async function ticketAnhangLesen(n, id, anhangId) {
  const db = await lesenBereit();
  const t = laden(db, n, id);
  const a = t.anhaenge.find((x) => x.id === anhangId);
  if (!a) throw nichtGefunden("Anhang nicht gefunden.");
  return { meta: { name: a.name, mime: a.mime, groesse: a.groesse }, daten: dateiLesen(a.datei) };
}

/** Kennzahlen für die Backoffice-Liste */
export async function ticketKennzahlen(n) {
  angemeldet(n);
  if (!boLesen(n, BEREICH)) throw verboten("Nur für das Backoffice.");
  const db = await lesenBereit();
  const offen = db.service.tickets.filter((t) => TICKET_OFFEN.includes(t.status));
  const staende = offen.map((t) => slaStand(t));
  return {
    offen: offen.length, neu: offen.filter((t) => t.status === "neu").length, wartetKunde: offen.filter((t) => t.status === "wartet_kunde").length,
    slaVerletzt: staende.filter((s) => s.ampel === "verletzt").length, slaKnapp: staende.filter((s) => s.ampel === "warn").length,
    meine: offen.filter((t) => t.zustaendigId === n.id).length,
  };
}
