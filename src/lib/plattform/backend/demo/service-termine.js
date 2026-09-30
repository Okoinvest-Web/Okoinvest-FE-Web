// src/lib/plattform/backend/demo/service-termine.js
//
// Termine & Kalender im Demo-Backend – Referenz für plattform/api/termine.py (docs/API.md, Abschnitt „Dokumente, Signatur, Termine, Service & HR“).
//
// Rechte:
//   öffentlich     – Slots und Buchung für Terminarten mit `oeffentlich` (Formulare, Flächencheck); Verwaltung nur mit
//                    dem Einmal-Link aus der Bestätigungs-E-Mail (Token, nur Hash gespeichert).
//   Portal-Konto   – eigene Termine (kontoId) sehen, umbuchen, stornieren; Datenraum-Session nur für Investoren.
//   Backoffice     – Bereich „kalender“: lesen ≥ 1 alle Termine und Verfügbarkeiten, schreiben = 2 buchen für Kunden,
//                    zuweisen, bestätigen, Status setzen, Verfügbarkeiten pflegen.
// Doppelbuchung: Prüfung „Slot frei“ unter der Schreibsperre (409, falls inzwischen vergeben).
// Abwesenheit (HR): abwesende Mitarbeiter haben keine Slots; bestehende Termine gehen an die Vertretung (service-hr.js).
// Zuständigkeit: Besichtigungen/Gemeindetermine bevorzugt an den Gebietsverantwortlichen aus der Akquise (db.bo.gebiete).

import { PlattformFehler, konflikt, nichtGefunden, verboten } from "../../fehler";
import * as v from "../../validierung";
import {
  KANAELE, TERMIN_AKTIV, TERMIN_ARTEN, TERMIN_ART_IDS, TERMIN_GRENZEN, TERMIN_STATUS, ARBEITSZEITEN_STANDARD, arbeitszeitenBereinigen, freieSlots, heuteTag,
  icsErstellen, slotFrei, tagGueltig, tagPlus, zeitraumText,
} from "../../termine";
import { vertretungFinden } from "../../hr";
import { gebietFuer } from "../../akquise";
import { jetzt, neueId, sha256, zufallsToken } from "./hilfen";
import { angemeldet, aendernBereit, boLesen, boSchreiben, backofficeKonten, kontoKurz, lesenBereit, mailAblegen, melden, nameVon, nutzerById, protokoll, schreibNoetig } from "./service-kern";

const BEREICH = "kalender";
const LABEL = "Termine & Kalender";

// ================================================================ Helfer

/** Mitarbeiter, die eine Terminart anbieten (aktiv, mit Verfügbarkeit) */
function anbieter(db, art) {
  return backofficeKonten(db)
    .map((u) => ({ u, vf: db.service.verfuegbarkeit[u.id] }))
    .filter(({ vf }) => vf && vf.aktiv !== false && (vf.terminarten || []).includes(art))
    .map(({ u, vf }) => ({ id: u.id, vf }));
}

const abwesenheitenVon = (db, kontoId) => db.service.abwesenheiten.filter((a) => a.mitarbeiterId === kontoId && a.status !== "abgelehnt");
const belegtVon = (db, kontoId, ohneId = null) => db.service.termine.filter((t) => t.mitarbeiterId === kontoId && TERMIN_AKTIV.includes(t.status) && t.id !== ohneId).map((t) => ({ start: t.start, ende: t.ende }));

function slotParameter(db, kontoId, art, { ohneId = null } = {}) {
  const a = TERMIN_ARTEN[art];
  const vf = db.service.verfuegbarkeit[kontoId] || {};
  return {
    arbeitszeiten: vf.arbeitszeiten || ARBEITSZEITEN_STANDARD, feiertage: db.service.feiertage, abwesenheiten: abwesenheitenVon(db, kontoId),
    belegt: belegtVon(db, kontoId, ohneId), dauer: a.dauer, puffer: a.puffer, vorlaufStunden: a.vorlaufStunden, jetzt: Date.now(),
  };
}

function artPruefen(n, art) {
  const a = TERMIN_ARTEN[art];
  if (!a) throw new PlattformFehler(422, "Unbekannte Terminart.");
  if (a.oeffentlich) return a;
  if (!n) throw new PlattformFehler(401, "Bitte melden Sie sich an.");
  if (!n.rollen?.includes("admin") && !(a.rollen || []).some((r) => n.rollen?.includes(r))) throw verboten("Diese Terminart steht Ihrem Konto nicht zur Verfügung.");
  return a;
}

function zeitraum({ von, bis } = {}) {
  const heute = heuteTag();
  const vonTag = tagGueltig(von) && von >= heute ? von : heute;
  const maxBis = tagPlus(heute, TERMIN_GRENZEN.horizontTage);
  let bisTag = tagGueltig(bis) ? bis : tagPlus(vonTag, 13);
  if (bisTag > maxBis) bisTag = maxBis;
  if (bisTag < vonTag) bisTag = vonTag;
  return { vonTag, bisTag };
}

function rolleIm(db, n, t) {
  if (!n) return null;
  if (boLesen(n, BEREICH)) return "backoffice";
  if (t.mitarbeiterId === n.id) return "mitarbeiter";
  if (t.kontoId && t.kontoId === n.id) return "kunde";
  return null;
}

function laden(db, n, id) {
  angemeldet(n);
  const t = db.service.termine.find((x) => x.id === v.kennung(id));
  if (!t) throw nichtGefunden("Termin nicht gefunden.");
  if (!rolleIm(db, n, t)) throw verboten("Dieser Termin gehört nicht zu Ihrem Konto.");
  return t;
}

function ausgabe(db, n, t) {
  const rolle = n ? rolleIm(db, n, t) : "token";
  const intern = rolle === "backoffice" || rolle === "mitarbeiter";
  const a = TERMIN_ARTEN[t.art];
  const kommend = new Date(t.start).getTime() > Date.now();
  return {
    id: t.id, art: t.art, artLabel: a?.label || t.art, kanal: t.kanal, kanalLabel: KANAELE[t.kanal] || t.kanal, start: t.start, ende: t.ende, zeitraum: zeitraumText(t.start, t.ende),
    status: t.status, statusLabel: TERMIN_STATUS[t.status]?.label || t.status, ort: t.ort || "", herkunft: t.herkunft,
    mitarbeiter: t.mitarbeiterId ? (intern ? kontoKurz(db, t.mitarbeiterId) : { name: nameVon(db, t.mitarbeiterId) }) : null,
    vertretungFuer: t.vertretungFuerId ? { id: intern ? t.vertretungFuerId : undefined, name: nameVon(db, t.vertretungFuerId) } : null,
    kunde: intern || rolle === "kunde" || rolle === "token" ? { name: t.kontakt?.name || "", email: t.kontakt?.email || "", telefon: t.kontakt?.telefon || "", firma: t.kontakt?.firma || "" } : null,
    kontoId: intern ? t.kontoId || null : undefined,
    notiz: t.notiz || "",
    bezug: t.bezugArt ? { art: t.bezugArt, id: t.bezugId } : null,
    sequenz: t.sequenz || 0,
    darfUmbuchen: kommend && TERMIN_AKTIV.includes(t.status) && (rolle === "kunde" || rolle === "token" || boSchreiben(n, BEREICH)),
    darfBearbeiten: !!n && boSchreiben(n, BEREICH),
    verlauf: intern ? t.verlauf || [] : undefined,
    erstelltAm: t.erstelltAm,
  };
}

function verlauf(t, text, n = null) {
  t.verlauf = t.verlauf || [];
  t.verlauf.push({ am: jetzt(), text: v.text(text, 300), vonId: n?.id || null });
}

/** Einladung/Änderung/Absage als E-Mail mit ICS an Kunde und Mitarbeiter (Postausgang) */
function icsVersenden(db, t, { anlass }) {
  const a = TERMIN_ARTEN[t.art];
  const ics = icsErstellen({ ...t, mitarbeiterName: nameVon(db, t.mitarbeiterId), verwaltenLink: t.token ? `/termin/verwalten?token=${t.token}` : "" });
  const betreff = { neu: "Terminbestätigung", umgebucht: "Termin verschoben", storniert: "Termin abgesagt", vertretung: "Neue Ansprechperson für Ihren Termin", erinnerung: "Erinnerung an Ihren Termin", bestaetigt: "Termin bestätigt" }[anlass] || "Ihr Termin";
  const text = `${a?.label || "Termin"}: ${zeitraumText(t.start, t.ende)}\nAnsprechperson: ${nameVon(db, t.mitarbeiterId) || "ÖkoInvest"}\n${t.kanal === "telefon" ? "Wir rufen Sie zum vereinbarten Zeitpunkt an." : t.kanal === "video" ? "Den Link zum Videogespräch erhalten Sie vor dem Termin." : t.ort ? `Ort: ${t.ort}` : "Den Treffpunkt stimmen wir mit Ihnen ab."}\n\nDie Kalenderdatei (ICS) ist angehängt.`;
  const anhang = { name: "termin.ics", mime: "text/calendar", inhalt: ics };
  if (t.kontakt?.email) {
    mailAblegen(db, {
      an: t.kontakt.email, anName: t.kontakt.name, nutzerId: t.kontoId || null, art: "termin", betreff: `${betreff} – ÖkoInvest`, text,
      link: t.kontoId ? "/portal/termine" : t.tokenLink || "/portal", linkText: t.kontoId ? "Termin im Portal" : "Termin verwalten", hinweis: "Umbuchen oder absagen können Sie über den Link – bis zum Beginn des Termins.", anhang,
    });
  }
  const m = nutzerById(db, t.mitarbeiterId);
  if (m && anlass !== "erinnerung") mailAblegen(db, { an: m.email, anName: nameVon(db, m.id), nutzerId: m.id, art: "termin", betreff: `${betreff} (${t.kontakt?.name || "Kunde"}) – Kalender`, text, link: "/portal/admin/kalender", linkText: "Zum Kalender", anhang });
}

/** Mitarbeiter für eine Buchung wählen: Wunsch → Gebietsverantwortlicher → geringste Belegung */
function mitarbeiterWaehlen(db, art, start, { wunschId = null, ort = {} } = {}) {
  const kandidaten = anbieter(db, art).filter((k) => slotFrei(start, slotParameter(db, k.id, art)));
  if (wunschId) return kandidaten.find((k) => k.id === wunschId)?.id || null;
  if (!kandidaten.length) return null;
  if (["besichtigung", "gemeinde"].includes(art) && ort.land) {
    const g = gebietFuer(db.bo?.gebiete || [], ort);
    const gid = g?.gebiet?.mitarbeiterId;
    if (gid && kandidaten.some((k) => k.id === gid)) return gid;
  }
  const last = (id) => db.service.termine.filter((t) => t.mitarbeiterId === id && TERMIN_AKTIV.includes(t.status) && new Date(t.start) > new Date()).length;
  return [...kandidaten].sort((a, b) => last(a.id) - last(b.id))[0].id;
}

// ================================================================ Erinnerungen (Demo: bei Kalenderabruf; Frappe: stündlich)

export function erinnerungenPruefen(db) {
  const grenze = Date.now() + TERMIN_GRENZEN.erinnerungStunden * 3600e3;
  let anzahl = 0;
  for (const t of db.service.termine) {
    if (!TERMIN_AKTIV.includes(t.status) || t.erinnertAm) continue;
    const s = new Date(t.start).getTime();
    if (s < Date.now() || s > grenze) continue;
    t.erinnertAm = jetzt();
    icsVersenden(db, t, { anlass: "erinnerung" });
    if (t.kontoId) melden(db, t.kontoId, { art: "termin", titel: `Erinnerung: ${TERMIN_ARTEN[t.art]?.label}`, text: zeitraumText(t.start, t.ende), link: "/portal/termine", objektArt: "termin", objektId: t.id }, { mail: false });
    anzahl++;
  }
  return anzahl;
}

// ================================================================ Slots & Buchung

export async function terminSlots(n, { art, von, bis, mitarbeiterId = "" } = {}) {
  const a = artPruefen(n, art);
  const db = await lesenBereit();
  const { vonTag, bisTag } = zeitraum({ von, bis });
  const bo = n && boLesen(n, BEREICH);
  let liste = anbieter(db, art);
  if (mitarbeiterId && bo) liste = liste.filter((k) => k.id === mitarbeiterId);
  const map = new Map();
  for (const k of liste) {
    for (const s of freieSlots({ ...slotParameter(db, k.id, art), vonTag, bisTag })) {
      const e = map.get(s.start) || { start: s.start, ende: s.ende, anzahl: 0, mitarbeiter: [] };
      e.anzahl++;
      if (bo) e.mitarbeiter.push({ id: k.id, name: nameVon(db, k.id) });
      map.set(s.start, e);
    }
  }
  const slots = [...map.values()].sort((x, y) => x.start.localeCompare(y.start)).slice(0, TERMIN_GRENZEN.maxSlots).map((s) => (bo ? s : { start: s.start, ende: s.ende }));
  return { art, artLabel: a.label, dauer: a.dauer, kanal: a.kanal, von: vonTag, bis: bisTag, slots };
}

function kontaktPruefen(k = {}) {
  const name = v.text(k.name || [k.vorname, k.nachname].filter(Boolean).join(" "), 120);
  v.pflicht(name.length >= 2, "Bitte geben Sie Ihren Namen an.");
  const email = v.email(k.email);
  v.pflicht(email, "Bitte geben Sie eine gültige E-Mail-Adresse an.");
  return { name, email, telefon: v.text(k.telefon, 40), firma: v.text(k.firma, 120), plz: v.text(k.plz, 10), ort: v.text(k.ort, 80), land: v.auswahl(k.land, ["DE", "AT", "CH"], "") };
}

/**
 * Termin buchen. n = angemeldetes Konto oder null (öffentlich). Backoffice kann `fuerKontoId` und `mitarbeiterId` setzen.
 * Liefert { termin, verwaltenToken? } – das Token nur bei öffentlichen Buchungen (steht auch in der Bestätigungs-Mail).
 */
export async function terminBuchen(n, daten = {}, { ip = "" } = {}) {
  const art = v.auswahl(daten.art, TERMIN_ART_IDS, "");
  const a = artPruefen(n, art);
  const start = new Date(daten.start || "");
  v.pflicht(!Number.isNaN(start.getTime()), "Bitte wählen Sie einen Termin.");
  const bo = n && boSchreiben(n, BEREICH);
  if (!n) v.pflicht(v.wahr(daten.einwilligung), "Bitte stimmen Sie der Verarbeitung Ihrer Angaben zur Terminvereinbarung zu.");
  const kanal = a.kanal === "vor_ort" || !daten.kanal ? a.kanal : v.auswahl(daten.kanal, ["telefon", "video"], a.kanal);
  const notiz = v.mehrzeilig(daten.notiz, 1000);
  return aendernBereit((db) => {
    let kontoId = null;
    let kontakt;
    if (n && !bo) {
      const u = nutzerById(db, n.id);
      kontoId = u.id;
      kontakt = { name: nameVon(db, u.id), email: u.email, telefon: v.text(daten.telefon, 40) || u.telefon || "", firma: u.firma || "", plz: v.text(daten.kontakt?.plz, 10), ort: v.text(daten.kontakt?.ort, 80), land: v.auswahl(daten.kontakt?.land, ["DE", "AT", "CH"], "") };
    } else if (bo && daten.fuerKontoId) {
      const u = nutzerById(db, v.kennung(daten.fuerKontoId));
      if (!u) throw nichtGefunden("Konto nicht gefunden.");
      kontoId = u.id;
      kontakt = { name: nameVon(db, u.id), email: u.email, telefon: u.telefon || "", firma: u.firma || "" };
    } else kontakt = kontaktPruefen(daten.kontakt);
    // Missbrauchsschutz: höchstens 3 künftige aktive Termine je E-Mail-Adresse
    const offen = db.service.termine.filter((t) => t.kontakt?.email === kontakt.email && TERMIN_AKTIV.includes(t.status) && new Date(t.start) > new Date());
    if (!bo && offen.length >= 3) throw konflikt("Sie haben bereits drei offene Termine. Bitte sagen Sie einen ab oder melden Sie sich über das Portal.");
    const iso = start.toISOString();
    const mitarbeiterId = mitarbeiterWaehlen(db, art, iso, { wunschId: bo ? v.kennung(daten.mitarbeiterId) || null : null, ort: { land: kontakt.land, bundesland: v.text(daten.kontakt?.bundesland, 60), plz: kontakt.plz } });
    if (!mitarbeiterId) throw konflikt("Dieser Zeitpunkt ist nicht (mehr) frei. Bitte wählen Sie einen anderen Termin.");
    const t = {
      id: neueId("TE"), art, start: iso, ende: new Date(start.getTime() + a.dauer * 60e3).toISOString(), mitarbeiterId, vertretungFuerId: null, kontoId, kontakt,
      kanal, ort: a.kanal === "vor_ort" ? v.text(daten.ort || [kontakt.plz, kontakt.ort].filter(Boolean).join(" "), 160) : "", notiz,
      bezugArt: v.auswahl(daten.bezugArt, ["vorgang", "flaeche", "projekt"], "") || null, bezugId: v.kennung(daten.bezugId) || null,
      status: "gebucht", sequenz: 0, erinnertAm: null, herkunft: bo ? "backoffice" : n ? "portal" : v.auswahl(daten.herkunft, ["kontakt", "flaechencheck", "website"], "website"),
      tokenHash: null, verlauf: [], erstelltAm: jetzt(), ip: ip || "",
    };
    let token = null;
    if (!kontoId) {
      token = zufallsToken();
      t.tokenHash = sha256(token);
      t.token = token; // nur für den Versand in dieser Transaktion, wird unten entfernt
      t.tokenLink = `/termin/verwalten?token=${token}`;
    }
    verlauf(t, `Gebucht (${t.herkunft}) – zuständig ${nameVon(db, mitarbeiterId)}`, n);
    db.service.termine.push(t);
    icsVersenden(db, t, { anlass: "neu" });
    delete t.token;
    delete t.tokenLink;
    melden(db, mitarbeiterId, { art: "termin", titel: `Neuer Termin: ${a.label}`, text: `${zeitraumText(t.start, t.ende)} · ${kontakt.name}`, link: "/portal/admin/kalender", objektArt: "termin", objektId: t.id }, { mail: false });
    if (kontoId) melden(db, kontoId, { art: "termin", titel: `Termin gebucht: ${a.label}`, text: zeitraumText(t.start, t.ende), link: "/portal/termine", objektArt: "termin", objektId: t.id }, { mail: false });
    protokoll(db, n, "termin", "termin", t.id, `Termin ${a.label} gebucht (${zeitraumText(t.start, t.ende)})`, ip);
    return { termin: ausgabe(db, n || null, t), verwaltenToken: token };
  });
}

// ================================================================ Lesen

export async function termine(n, { alle = false, von = "", bis = "", mitarbeiterId = "", status = "" } = {}) {
  angemeldet(n);
  const bo = boLesen(n, BEREICH);
  if (alle && bo) {
    // Erinnerungen fällig? (Demo-Ersatz für den stündlichen Frappe-Job)
    await aendernBereit((db) => erinnerungenPruefen(db));
  }
  const db = await lesenBereit();
  const vonMs = tagGueltig(von) ? new Date(`${von}T00:00:00Z`).getTime() - 86400e3 : -Infinity;
  const bisMs = tagGueltig(bis) ? new Date(`${bis}T23:59:59Z`).getTime() + 86400e3 : Infinity;
  return db.service.termine
    .filter((t) => (alle && bo ? true : t.kontoId === n.id || t.mitarbeiterId === n.id))
    .filter((t) => !mitarbeiterId || t.mitarbeiterId === mitarbeiterId)
    .filter((t) => !status || t.status === status)
    .filter((t) => {
      const s = new Date(t.start).getTime();
      return s >= vonMs && s <= bisMs;
    })
    .sort((a, b) => a.start.localeCompare(b.start))
    .slice(0, 1000)
    .map((t) => ausgabe(db, n, t));
}

export async function termin(n, id) {
  const db = await lesenBereit();
  return ausgabe(db, n, laden(db, n, id));
}

export async function terminIcs(n, id) {
  const db = await lesenBereit();
  const t = laden(db, n, id);
  return icsErstellen({ ...t, mitarbeiterName: nameVon(db, t.mitarbeiterId) });
}

// ================================================================ Ändern

function aktionAnwenden(db, n, t, { aktion, start, grund = "", mitarbeiterId }, { alsKunde }) {
  const a = TERMIN_ARTEN[t.art];
  const kommend = new Date(t.start).getTime() > Date.now();
  if (aktion === "stornieren") {
    if (!TERMIN_AKTIV.includes(t.status)) throw konflikt("Der Termin ist nicht mehr aktiv.");
    if (alsKunde && !kommend) throw konflikt("Vergangene Termine können nicht abgesagt werden.");
    t.status = "storniert";
    t.sequenz = (t.sequenz || 0) + 1;
    verlauf(t, `Abgesagt${grund ? `: ${v.text(grund, 200)}` : ""}`, n);
    icsVersenden(db, t, { anlass: "storniert" });
    melden(db, alsKunde ? t.mitarbeiterId : t.kontoId, { art: "termin", titel: `Termin abgesagt: ${a.label}`, text: zeitraumText(t.start, t.ende), link: alsKunde ? "/portal/admin/kalender" : "/portal/termine", objektArt: "termin", objektId: t.id }, { mail: false });
    return;
  }
  if (aktion === "umbuchen") {
    if (!TERMIN_AKTIV.includes(t.status) || !kommend) throw konflikt("Nur künftige, aktive Termine können verschoben werden.");
    const neu = new Date(start || "");
    v.pflicht(!Number.isNaN(neu.getTime()), "Bitte wählen Sie einen neuen Termin.");
    const iso = neu.toISOString();
    // gleiche Person bevorzugt, sonst eine andere mit freiem Slot
    let ziel = slotFrei(iso, slotParameter(db, t.mitarbeiterId, t.art, { ohneId: t.id })) ? t.mitarbeiterId : null;
    if (!ziel) ziel = mitarbeiterWaehlen(db, t.art, iso);
    if (!ziel) throw konflikt("Dieser Zeitpunkt ist nicht (mehr) frei. Bitte wählen Sie einen anderen Termin.");
    const alt = zeitraumText(t.start, t.ende);
    t.start = iso;
    t.ende = new Date(neu.getTime() + a.dauer * 60e3).toISOString();
    t.mitarbeiterId = ziel;
    t.status = "gebucht";
    t.erinnertAm = null;
    t.sequenz = (t.sequenz || 0) + 1;
    verlauf(t, `Verschoben von ${alt} auf ${zeitraumText(t.start, t.ende)}`, n);
    icsVersenden(db, t, { anlass: "umgebucht" });
    melden(db, alsKunde ? t.mitarbeiterId : t.kontoId, { art: "termin", titel: `Termin verschoben: ${a.label}`, text: zeitraumText(t.start, t.ende), link: alsKunde ? "/portal/admin/kalender" : "/portal/termine", objektArt: "termin", objektId: t.id }, { mail: false });
    return;
  }
  if (alsKunde) throw verboten("Diese Änderung kann nur das Backoffice vornehmen.");
  if (aktion === "bestaetigen") {
    if (t.status !== "gebucht") throw konflikt("Nur gebuchte Termine können bestätigt werden.");
    t.status = "bestaetigt";
    verlauf(t, "Bestätigt", n);
    icsVersenden(db, t, { anlass: "bestaetigt" });
    return;
  }
  if (aktion === "erledigt" || aktion === "nicht_erschienen") {
    if (!TERMIN_AKTIV.includes(t.status)) throw konflikt("Der Termin ist nicht mehr aktiv.");
    t.status = aktion;
    verlauf(t, TERMIN_STATUS[aktion].label, n);
    return;
  }
  if (aktion === "zuweisen") {
    const z = nutzerById(db, v.kennung(mitarbeiterId));
    v.pflicht(z && z.aktiv && z.rollen.includes("admin"), "Zuständig kann nur ein aktives Backoffice-Konto sein.");
    if (!slotFrei(t.start, { ...slotParameter(db, z.id, t.art, { ohneId: t.id }), vorlaufStunden: 0 })) throw konflikt(`${nameVon(db, z.id)} ist zu diesem Zeitpunkt nicht verfügbar.`);
    t.mitarbeiterId = z.id;
    t.sequenz = (t.sequenz || 0) + 1;
    verlauf(t, `Zugewiesen an ${nameVon(db, z.id)}`, n);
    icsVersenden(db, t, { anlass: "vertretung" });
    melden(db, z.id, { art: "termin", titel: `Termin übernommen: ${a.label}`, text: zeitraumText(t.start, t.ende), link: "/portal/admin/kalender", objektArt: "termin", objektId: t.id }, { mail: false });
    return;
  }
  throw new PlattformFehler(422, "Unbekannte Aktion.");
}

export async function terminAendern(n, id, daten = {}) {
  angemeldet(n);
  return aendernBereit((db) => {
    const t = laden(db, n, id);
    const bo = boSchreiben(n, BEREICH);
    const alsKunde = !bo && t.kontoId === n.id;
    if (!bo && !alsKunde) throw verboten("Diesen Termin können Sie nicht ändern.");
    aktionAnwenden(db, n, t, daten, { alsKunde });
    protokoll(db, n, "termin", "termin", t.id, `Termin ${daten.aktion}`);
    return ausgabe(db, n, t);
  });
}

// ================================================================ Öffentliche Verwaltung per Einmal-Link

function perToken(db, token) {
  const h = sha256(String(token || ""));
  const t = String(token || "").length >= 32 ? db.service.termine.find((x) => x.tokenHash === h) : null;
  if (!t) throw nichtGefunden("Der Link ist ungültig oder der Termin existiert nicht mehr.");
  return t;
}

export async function terminPerToken(token) {
  const db = await lesenBereit();
  return ausgabe(db, null, perToken(db, token));
}

export async function terminPerTokenAendern(token, daten = {}) {
  v.pflicht(["umbuchen", "stornieren"].includes(daten.aktion), "Unbekannte Aktion.");
  return aendernBereit((db) => {
    const t = perToken(db, token);
    t.token = String(token);
    t.tokenLink = `/termin/verwalten?token=${t.token}`; // nur für die E-Mail dieser Änderung
    try {
      aktionAnwenden(db, null, t, daten, { alsKunde: true });
    } finally {
      delete t.token;
      delete t.tokenLink;
    }
    protokoll(db, null, "termin", "termin", t.id, `Termin ${daten.aktion} (Link aus E-Mail)`);
    return ausgabe(db, null, t);
  });
}

// ================================================================ Verfügbarkeiten (Backoffice)

export async function verfuegbarkeiten(n) {
  angemeldet(n);
  if (!boLesen(n, BEREICH)) throw verboten("Nur für das Backoffice.");
  const db = await lesenBereit();
  const heute = heuteTag();
  return {
    mitarbeiter: backofficeKonten(db).map((u) => {
      const vf = db.service.verfuegbarkeit[u.id] || null;
      return {
        id: u.id, name: nameVon(db, u.id), email: u.email,
        arbeitszeiten: vf?.arbeitszeiten || {}, terminarten: vf?.terminarten || [], aktiv: vf ? vf.aktiv !== false : false,
        abwesenheiten: abwesenheitenVon(db, u.id).filter((a) => a.bis >= heute).map((a) => ({ id: a.id, von: a.von, bis: a.bis, art: a.art, vertretung: kontoKurz(db, a.vertretungId) })),
      };
    }),
    feiertage: db.service.feiertage.filter((f) => f >= heute).slice(0, 20),
    darfBearbeiten: boSchreiben(n, BEREICH),
  };
}

export async function verfuegbarkeitSpeichern(n, kontoId, daten = {}) {
  schreibNoetig(n, BEREICH, LABEL);
  return aendernBereit((db) => {
    const u = nutzerById(db, v.kennung(kontoId));
    v.pflicht(u && u.rollen.includes("admin"), "Verfügbarkeiten gibt es nur für Backoffice-Konten.");
    const alt = db.service.verfuegbarkeit[u.id] || {};
    db.service.verfuegbarkeit[u.id] = {
      arbeitszeiten: daten.arbeitszeiten !== undefined ? arbeitszeitenBereinigen(daten.arbeitszeiten) : alt.arbeitszeiten || ARBEITSZEITEN_STANDARD,
      terminarten: daten.terminarten !== undefined ? v.mehrfach(daten.terminarten, TERMIN_ART_IDS) : alt.terminarten || [],
      aktiv: daten.aktiv !== undefined ? !!daten.aktiv : alt.aktiv !== false,
    };
    protokoll(db, n, "termin", "verfuegbarkeit", u.id, `Verfügbarkeit von ${nameVon(db, u.id)} gespeichert`);
    return db.service.verfuegbarkeit[u.id];
  });
}

/** Für HR: aktive Termine eines Mitarbeiters im Zeitraum an die Vertretung übergeben (innerhalb von aendern) */
export function termineVertreten(db, n, abw) {
  let anzahl = 0;
  for (const t of db.service.termine) {
    if (t.mitarbeiterId !== abw.mitarbeiterId || !TERMIN_AKTIV.includes(t.status)) continue;
    const tag = new Date(t.start).toLocaleDateString("sv-SE", { timeZone: "Europe/Vienna" });
    if (tag < abw.von || tag > abw.bis) continue;
    const ziel = vertretungFinden({ mitarbeiterId: abw.mitarbeiterId, tag, abwesenheiten: db.service.abwesenheiten, mitarbeiter: db.service.mitarbeiter });
    if (!ziel || ziel.id === abw.mitarbeiterId) continue;
    // Keine Doppelbuchung bei der Vertretung: belegt → Termin bleibt, Hinweis im Verlauf (Backoffice klärt manuell)
    const s = new Date(t.start).getTime();
    const e = new Date(t.ende).getTime();
    if (belegtVon(db, ziel.id, t.id).some((b) => new Date(b.start).getTime() < e && s < new Date(b.ende).getTime())) {
      verlauf(t, `Vertretung ${nameVon(db, ziel.id)} ist zu dieser Zeit belegt – bitte manuell zuweisen`, n);
      continue;
    }
    t.vertretungFuerId = t.vertretungFuerId || abw.mitarbeiterId;
    t.mitarbeiterId = ziel.id;
    t.sequenz = (t.sequenz || 0) + 1;
    verlauf(t, `Vertretung wegen Abwesenheit: ${nameVon(db, abw.mitarbeiterId)} → ${nameVon(db, ziel.id)}`, n);
    icsVersenden(db, t, { anlass: "vertretung" });
    anzahl++;
  }
  return anzahl;
}
