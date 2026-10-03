// src/lib/plattform/backend/demo/leadkette.js
//
// Lead-Kette im Demo-Backend (Welle 2, Paket B3): Einwilligungsprotokoll (append-only, Hash-Kette), getrennte
// Personendaten, Routing/Score/SLA am Vorgang, Lead-Desk-Auswertung, Widerruf und Löschung nach Art. 17.
//
// Speicher (.data/plattform.json):
//   db.leadKette     Protokolleinträge – nur Pseudonym + Textversion/-Hash + Zeit/Kanal/Land (src/lib/anfrage/protokoll.js)
//   db.leadPersonen  Personendaten getrennt: { id, pseudonym, vorgangId, vorname, nachname, firma, email, telefon,
//                    ipGekuerzt, ipLoeschenAb, land, erstelltAm } – löschbar; IPs werden beim Zugriff nach 30 Tagen entfernt
//   vorgang.herkunft.lead  { land, typ, groesse, desk, zustaendigQuelle, vertretungId, ohneZustaendigkeit, score,
//                    slaKlasse, frist, pseudonym, erstkontaktAm, absage, loeschung, stand } – unter `herkunft`, weil dieses
//                    Feld dem Anfragenden im Portal nicht gezeigt wird (Demo: vorgang(), Frappe: ausgabe.vorgang_ausgabe)
//                    und Frappe dafür kein eigenes Feld hat (Plattform Vorgang, JSON „herkunft“). vorgang.land = Land.
//
// Personendaten erscheinen nie in Logs, Fehlermeldungen oder im Aktivitätsprotokoll dieses Moduls.
// Frappe-Spiegel: Backend-Import/…/plattform/api/einwilligung.py.

import { createHash } from "node:crypto";
import { aendern, lesen } from "./speicher";
import { jetzt, neueId } from "./hilfen";
import { W, boAendern, erstkontaktAm, nameVon, nutzerVon, rechtNoetig } from "./bo-kern";
import { PlattformFehler, nichtGefunden, ungueltig } from "../../fehler";
import { VORGANG_TYPEN } from "../../konstanten";
import { ABSAGE_CODES, LEAD_DESKS, LEAD_TYPEN, ROUTING_STAND } from "@/data/lead-routing";
import { routen } from "@/lib/anfrage/routing";
import { scoreBerechnen } from "@/lib/anfrage/score";
import { SLA_KLASSEN, fristBerechnen, slaAuswerten, slaAuswertung, slaKlasse } from "@/lib/anfrage/sla";
import { zweckFuer } from "@/lib/anfrage/hinweise";
import { leadLand } from "@/lib/anfrage/laender";
import {
  IP_FRIST_TAGE, NACHWEIS_FRIST_JAHRE, WERBE_ZWECKE, ZWECK_LABEL, anhaengen, ipKuerzen, ipLoeschenAb, kanalAmpel, nachweisBis,
  protokollPruefen, pseudonym as pseudonymBerechnen, werbekanalSicherstellen as sicherstellen,
} from "@/lib/anfrage/protokoll";

const HEX64 = /^[0-9a-f]{64}$/;
/** Lead-Meta eines Vorgangs (siehe Kopf) */
export const metaVon = (vg) => (vg?.herkunft && typeof vg.herkunft === "object" ? vg.herkunft.lead || null : null);
function metaSetzen(vg, meta) {
  vg.herkunft = { ...(vg.herkunft && typeof vg.herkunft === "object" ? vg.herkunft : {}), lead: meta };
  return meta;
}
const sha256 = (s) => createHash("sha256").update(String(s), "utf8").digest("hex");
const txt = (x, max) => (typeof x === "string" ? x.trim().slice(0, max) : "");
const version = (x) => (typeof x === "string" && /^[A-Za-z][A-Za-z0-9_.:-]{0,39}$/.test(x) ? x : "unversioniert");

export function leadSicher(db) {
  db.leadKette = Array.isArray(db.leadKette) ? db.leadKette : [];
  db.leadPersonen = Array.isArray(db.leadPersonen) ? db.leadPersonen : [];
}

/** Gekürzte IPs nach 30 Tagen entfernen (Demo: bei jedem Zugriff auf die Lead-Kette). Liefert die Anzahl. */
export function ipAufraeumenDb(db, jetztMs = Date.now()) {
  leadSicher(db);
  let n = 0;
  for (const p of db.leadPersonen) {
    if (p.ipGekuerzt && (!p.ipLoeschenAb || Date.parse(p.ipLoeschenAb) <= jetztMs)) {
      p.ipGekuerzt = "";
      p.ipLoeschenAb = null;
      n++;
    }
  }
  return n;
}

const aktivesBackoffice = (db) => (id) => {
  const u = nutzerVon(db, id);
  return !!(u?.aktiv && u.rollen?.includes("admin"));
};

/** Lead-Meta (Routing, Score, SLA) für einen Vorgang berechnen – ohne Speichern */
export function leadBerechnen(db, { typ, daten, land, kontakt, rueckruf, gebiet, eingang }) {
  const r = routen({ typ, daten, land, gebiet, aktiv: aktivesBackoffice(db) });
  const score = scoreBerechnen({ typ: r.typ, groesse: r.groesse, landBekannt: r.landBekannt, rueckruf, kontakt, daten });
  const klasse = slaKlasse({ basis: r.slaKlasseBasis, score: score.klasse, rueckruf });
  return {
    land: r.land,
    typ: r.typ,
    groesse: r.groesse,
    desk: r.desk,
    zustaendigId: r.zustaendigId,
    zustaendigQuelle: r.zustaendigQuelle,
    vertretungId: r.vertretungId,
    ohneZustaendigkeit: r.ohneZustaendigkeit,
    routingGruende: r.gruende,
    score,
    slaKlasse: klasse,
    frist: fristBerechnen(eingang || jetzt(), klasse, r.land),
    stand: ROUTING_STAND,
  };
}

/**
 * Teil von anfrageAnlegen (innerhalb der Schreibtransaktion von demo.js):
 * Lead-Meta, getrennte Personenzeile, Protokolleinträge (Hinweis + ausdrücklich erteilte Einwilligungen).
 *  hinweis: { id, version, textHash }  · optional: [{ id, version, textHash, sprache }] (nur erteilte)
 *  kanal: Erfassungskanal (web_formular | portal)
 */
export function leadAnlegenDb(db, { vg, kontakt, daten, ip, hinweis, einwilligungText, optional, gebiet, rueckruf, kanal = "web_formular" }) {
  leadSicher(db);
  ipAufraeumenDb(db);
  const lead = leadBerechnen(db, { typ: vg.typ, daten, land: kontakt.land, kontakt, rueckruf, gebiet, eingang: vg.erstelltAm });
  const ps = kontakt.email ? pseudonymBerechnen(kontakt.email) : null;
  lead.pseudonym = ps;
  lead.erstkontaktAm = null;
  if (ps) {
    const am = vg.erstelltAm;
    db.leadPersonen.push({
      id: neueId("LP"),
      pseudonym: ps,
      vorgangId: vg.id,
      vorname: kontakt.vorname,
      nachname: kontakt.nachname,
      firma: kontakt.firma || "",
      email: kontakt.email,
      telefon: kontakt.telefon || "",
      ipGekuerzt: ipKuerzen(ip),
      ipLoeschenAb: ipKuerzen(ip) ? ipLoeschenAb(am) : null,
      land: lead.land,
      erstelltAm: am,
    });
    // Hinweis nach Art. 6 Abs. 1 lit. b (keine Einwilligung) – Text-Hash wie beim Vorgang gespeichert
    const hw = hinweis && typeof hinweis === "object" ? hinweis : {};
    const hinweisEintrag = HEX64.test(hw.textHash || "")
      ? { textId: "hinweis_anfrage", textVersion: version(hw.version), textHash: hw.textHash }
      : einwilligungText
        ? { textId: "anfrage_text", textVersion: "unversioniert", textHash: sha256(einwilligungText) }
        : null;
    if (hinweisEintrag) anhaengen(db.leadKette, { pseudonym: ps, art: "hinweis", zweck: "anfrage", ...hinweisEintrag, kanal, land: lead.land, zeit: am });
    for (const e of Array.isArray(optional) ? optional : []) {
      const zweck = zweckFuer(e.id);
      if (!zweck || e.erteilt !== true || !HEX64.test(e.textHash || "")) continue; // nur ausdrücklich erteilt, mit Text-Hash
      anhaengen(db.leadKette, { pseudonym: ps, art: "einwilligung", zweck, textId: e.id, textVersion: version(e.version), textHash: e.textHash, kanal, land: lead.land, zeit: am });
    }
  }
  return lead;
}

// ================================================================ Öffentliche Schnittstelle (für B4 u. a.)

function psAus({ email, pseudonym }) {
  if (typeof pseudonym === "string" && HEX64.test(pseudonym)) return pseudonym;
  return pseudonymBerechnen(email);
}

/**
 * Protokolleintrag anhängen (z. B. DOI-Bestätigung des Berichts, Widerruf über Abmeldelink).
 * eintrag: { email | pseudonym, art, zweck, textId, textVersion, textHash, kanal, land, zeit? } → { id, zeit, hash }
 */
export async function protokollAnhaengen(eintrag = {}) {
  const { email, pseudonym, ...rest } = eintrag || {};
  const ps = psAus({ email, pseudonym });
  return aendern((db) => {
    leadSicher(db);
    const e = anhaengen(db.leadKette, { ...rest, pseudonym: ps });
    return { id: e.id, zeit: e.zeit, hash: e.hash };
  });
}

/** Kanal-Ampel: true nur nach ausdrücklicher Einwilligung (Newsletter/Bericht: nach DOI) und ohne späteren Widerruf */
export async function werbekanalErlaubt({ email, pseudonym, zweck } = {}) {
  const db = await lesen();
  return kanalAmpel(db.leadKette || [], psAus({ email, pseudonym }), zweck).erlaubt;
}

/** Für Versandstellen: wirft 403 „Werbekontakt gesperrt“, wenn keine gültige Einwilligung vorliegt */
export async function werbekanalSicherstellen({ email, pseudonym, zweck } = {}) {
  const db = await lesen();
  return sicherstellen(db.leadKette || [], psAus({ email, pseudonym }), zweck);
}

/** Stand aller Werbe-Zwecke für eine Person (Pseudonym oder E-Mail) */
export async function kanalStand({ email, pseudonym } = {}) {
  const db = await lesen();
  const ps = psAus({ email, pseudonym });
  return Object.fromEntries(WERBE_ZWECKE.map((z) => [z, kanalAmpel(db.leadKette || [], ps, z)]));
}

/** IPs älter als 30 Tage entfernen (für Tests und einen späteren Zeitplan) */
export async function ipAufraeumen({ jetztMs = Date.now() } = {}) {
  return aendern((db) => ({ entfernt: ipAufraeumenDb(db, jetztMs) }));
}

// ================================================================ Lead-Desk (Backoffice)

const kurzName = (vorname, nachname) => [vorname, nachname ? `${String(nachname).slice(0, 1)}.` : ""].filter(Boolean).join(" ");

function leadVon(db, vg) {
  if (metaVon(vg)) return metaVon(vg);
  // Altbestand ohne Lead-Meta: nachträglich berechnen (nicht gespeichert, kein Protokoll)
  return { ...leadBerechnen(db, { typ: vg.typ, daten: vg.daten || {}, land: vg.kontakt?.land, kontakt: vg.kontakt || {}, rueckruf: vg.daten?.rueckrufGewuenscht === true, gebiet: null, eingang: vg.erstelltAm }), pseudonym: null, nachberechnet: true };
}

function leadZeile(db, vg, lead, sla) {
  const z = nutzerVon(db, vg.zustaendigId);
  const v = nutzerVon(db, lead.vertretungId);
  const ampel = lead.pseudonym ? Object.fromEntries(WERBE_ZWECKE.map((x) => [x, kanalAmpel(db.leadKette, lead.pseudonym, x).stand])) : null;
  return {
    id: vg.id,
    typ: lead.typ,
    typLabel: LEAD_TYPEN[lead.typ]?.label || VORGANG_TYPEN[vg.typ] || vg.typ,
    status: vg.status,
    land: lead.land,
    eingang: vg.erstelltAm,
    anzeige: lead.loeschung ? "gelöscht (Art. 17)" : kurzName(vg.kontakt?.vorname, vg.kontakt?.nachname) || "–",
    desk: lead.desk,
    zustaendig: z ? { id: z.id, name: nameVon(db, z.id) } : null,
    vertretung: v ? { id: v.id, name: nameVon(db, v.id) } : null,
    ohneZustaendigkeit: !z,
    zustaendigQuelle: z ? (z.id === lead.zustaendigId ? lead.zustaendigQuelle : "manuell") : null,
    score: lead.score,
    slaKlasse: lead.slaKlasse,
    sla,
    groesse: lead.groesse,
    absage: lead.absage || null,
    geloescht: !!lead.loeschung,
    nachberechnet: !!lead.nachberechnet,
    kanaele: ampel,
  };
}

/**
 * Lead-Desk: Liste je Land mit SLA-Ampel, Median/P90, Absagecodes, Kettenstatus.
 * filter: { land: DE|AT|CH|unbekannt|"", tage (1–730, Standard 90) }
 */
export async function leadDesk(n, { land = "", tage = 90 } = {}) {
  rechtNoetig(n, "vorgaenge", 1);
  const t = Math.min(730, Math.max(1, Number.parseInt(tage, 10) || 90));
  const ab = Date.now() - t * 86400000;
  return boAendern((db) => {
    leadSicher(db);
    const ipEntfernt = ipAufraeumenDb(db);
    const alle = [];
    for (const vg of db.vorgaenge) {
      if (Date.parse(vg.erstelltAm) < ab) continue;
      const lead = leadVon(db, vg);
      let ek = lead.erstkontaktAm || erstkontaktAm(db, "vorgang", vg, vg.erstelltAm);
      if (metaVon(vg) && ek && !metaVon(vg).erstkontaktAm) metaVon(vg).erstkontaktAm = ek; // einmal gesetzt, bleibt fest
      if (!ek) ek = null;
      const sla = slaAuswerten({ eingang: vg.erstelltAm, erstkontaktAm: ek, klasse: lead.slaKlasse, land: lead.land });
      alle.push(leadZeile(db, vg, lead, sla));
    }
    const l = leadLand(land) === "unbekannt" && land !== "unbekannt" ? "" : leadLand(land);
    const liste = (l ? alle.filter((x) => x.land === l) : alle).sort((a, b) => (b.sla.ueberfaellig - a.sla.ueberfaellig) || String(b.eingang).localeCompare(String(a.eingang)));
    const auswertung = slaAuswertung(alle.map((x) => ({ land: x.land, typ: x.typ, sla: x.sla, ohneZustaendigkeit: x.ohneZustaendigkeit })));
    delete auswertung.leads;
    const absagen = {};
    for (const x of alle) {
      if (!x.absage) continue;
      const a = (absagen[x.absage.code] ||= { code: x.absage.code, label: ABSAGE_CODES[x.absage.code]?.label || x.absage.code, anzahl: 0, begruendungen: [] });
      a.anzahl++;
      a.begruendungen.push({ vorgangId: x.id, text: x.absage.begruendung });
    }
    const kette = protokollPruefen(db.leadKette);
    return {
      ok: true,
      zeitraum: { tage: t, ab: new Date(ab).toISOString() },
      land: l,
      leads: liste.slice(0, 500),
      anzahl: liste.length,
      auswertung,
      absagen: Object.values(absagen),
      absageCodes: Object.entries(ABSAGE_CODES).map(([id, a]) => ({ id, label: a.label, text: a.text })),
      slaKlassen: Object.entries(SLA_KLASSEN).map(([id, k]) => ({ id, label: k.label, ziel: k.ziel })),
      desks: Object.values(LEAD_DESKS).map((d) => ({ id: d.id, land: d.land, label: d.label, besetzt: !!d.person, vertretung: !!d.vertretung, postfach: !!d.postfach, todo: d.person ? "" : d.todo })),
      kette: { ok: kette.ok, anzahl: kette.anzahl, fehler: kette.fehler.slice(0, 10), letzterHash: kette.letzterHash },
      personen: { anzahl: db.leadPersonen.length, mitIp: db.leadPersonen.filter((p) => p.ipGekuerzt).length, ipEntfernt, ipFristTage: IP_FRIST_TAGE },
      nachweisFristJahre: NACHWEIS_FRIST_JAHRE,
      todo: ["Personen, Vertretungen und Postfächer je Land benennen (TODO Inhaber, E7)", "Nachweisfrist je Land bestätigen (TODO Rechtsabteilung)", "Geschäftszeiten je Desk festlegen (TODO Inhaber/Vertrieb)"],
    };
  });
}

/** Nur die SLA-Auswertung (Median/P90 je Land und Typ) */
export async function slaBericht(n, filter = {}) {
  const r = await leadDesk(n, filter);
  return { ok: true, zeitraum: r.zeitraum, auswertung: r.auswertung, slaKlassen: r.slaKlassen };
}

/** Kettenstatus des Einwilligungsprotokolls */
export async function leadKetteStatus(n) {
  rechtNoetig(n, "vorgaenge", 1);
  const db = await lesen();
  const r = protokollPruefen(db.leadKette || []);
  return { ...r, fehler: r.fehler.slice(0, 20), geprueftAm: jetzt() };
}

function vorgangOderFehler(db, id) {
  const vg = db.vorgaenge.find((x) => x.id === id);
  if (!vg) throw nichtGefunden("Anfrage nicht gefunden.");
  return vg;
}

function pseudonymDesVorgangs(vg) {
  if (metaVon(vg)?.pseudonym) return metaVon(vg).pseudonym;
  if (vg.email) return pseudonymBerechnen(vg.email);
  return null;
}

/** Widerruf eines Werbe-Zwecks durch das Backoffice (z. B. telefonisch erklärt) – eigener Protokolleintrag */
export async function widerrufen(n, { vorgangId, zweck, kanal = "backoffice" } = {}) {
  rechtNoetig(n, "vorgaenge", 2);
  if (!WERBE_ZWECKE.includes(zweck)) throw ungueltig("Unbekannter Zweck.");
  if (!["backoffice", "telefon", "email"].includes(kanal)) throw ungueltig("Unbekannter Kanal.");
  return boAendern((db) => {
    leadSicher(db);
    const vg = vorgangOderFehler(db, vorgangId);
    const ps = pseudonymDesVorgangs(vg);
    if (!ps) throw new PlattformFehler(409, "Zu dieser Anfrage gibt es kein Protokoll.");
    const e = anhaengen(db.leadKette, { pseudonym: ps, art: "widerruf", zweck, textId: "widerruf", textVersion: ROUTING_STAND, textHash: "", kanal, land: metaVon(vg)?.land || leadLand(vg.kontakt?.land) });
    W.protokoll?.(db, n, "lead_widerruf", "vorgang", vg.id, `Widerruf eingetragen: ${ZWECK_LABEL[zweck]}`);
    return { ok: true, eintrag: { id: e.id, zeit: e.zeit }, stand: kanalAmpel(db.leadKette, ps, zweck) };
  });
}

/** Absagecode mit Begründung (Text an den Interessenten; der Statuswechsel selbst läuft über den Vorgang) */
export async function absageSetzen(n, vorgangId, { code, begruendung } = {}) {
  rechtNoetig(n, "vorgaenge", 2);
  if (!Object.hasOwn(ABSAGE_CODES, code)) throw ungueltig("Unbekannter Absagecode.");
  const text = txt(begruendung, 1000) || ABSAGE_CODES[code].text;
  if (!text) throw ungueltig("Bitte geben Sie eine Begründung an.");
  return boAendern((db) => {
    const vg = vorgangOderFehler(db, vorgangId);
    const meta = metaVon(vg) || metaSetzen(vg, { ...leadVon(db, vg) });
    meta.absage = { code, begruendung: text, am: jetzt(), vonId: n.id };
    W.protokoll?.(db, n, "lead_absage", "vorgang", vg.id, `Absagecode „${ABSAGE_CODES[code].label}“`);
    return { ok: true, absage: meta.absage };
  });
}

const GELOESCHT = { anrede: "", vorname: "Gelöscht", nachname: "(Art. 17)", firma: "", email: "", telefon: "", plz: "", ort: "" };

/**
 * Löschung nach Art. 17 DSGVO für die Person hinter einem Vorgang:
 *  - entfernt ihre Personenzeilen (db.leadPersonen) und schwärzt die Kontaktdaten der zugehörigen Vorgänge und
 *    CRM-Kontakte ohne Portal-Konto,
 *  - trägt für jeden noch offenen Werbe-Zweck einen Widerruf ein (Kanal „art17_loeschung“),
 *  - lässt die Kette unverändert (Pseudonym bleibt als Minimaldatensatz bis zum Ende der Nachweisfrist).
 * Ein Portal-Konto wird hier NICHT gelöscht (dafür: Datenschutzanfrage im Bereich Compliance).
 */
export async function personLoeschen(n, { vorgangId, grund = "" } = {}) {
  rechtNoetig(n, "vorgaenge", 2);
  return boAendern((db) => {
    leadSicher(db);
    const vg = vorgangOderFehler(db, vorgangId);
    const ps = pseudonymDesVorgangs(vg);
    const am = jetzt();
    const bis = nachweisBis(am);
    const vorher = db.leadPersonen.length;
    db.leadPersonen = db.leadPersonen.filter((p) => !(p.vorgangId === vg.id || (ps && p.pseudonym === ps)));
    const entfernt = vorher - db.leadPersonen.length;
    const widerrufen = [];
    if (ps) {
      for (const z of WERBE_ZWECKE) {
        const st = kanalAmpel(db.leadKette, ps, z).stand;
        if (st === "erteilt" || st === "doi_ausstehend") {
          anhaengen(db.leadKette, { pseudonym: ps, art: "widerruf", zweck: z, textId: "art17", textVersion: ROUTING_STAND, textHash: "", kanal: "art17_loeschung", land: metaVon(vg)?.land || "unbekannt" });
          widerrufen.push(z);
        }
      }
    }
    const betroffen = db.vorgaenge.filter((x) => x.id === vg.id || (ps && metaVon(x)?.pseudonym === ps));
    let mitKonto = false;
    for (const x of betroffen) {
      if (x.nutzerId) mitKonto = true;
      x.kontakt = { ...x.kontakt, ...GELOESCHT, land: x.kontakt?.land || "" };
      x.email = "";
      x.ip = "";
      if (x.einwilligung) x.einwilligung.ip = "";
      if (x.daten && typeof x.daten === "object") x.daten = { ...x.daten, nachricht: x.daten.nachricht ? "[gelöscht]" : x.daten.nachricht };
      metaSetzen(x, { ...leadVon(db, x), pseudonym: metaVon(x)?.pseudonym || ps, loeschung: { am, nachweisBis: bis, grund: txt(grund, 200), vonId: n.id } });
      for (const k of db.bo?.kontakte || []) {
        if (k.nutzerId || !(k.bezuege || []).some((b) => b.art === "vorgang" && b.id === x.id)) continue;
        Object.assign(k, { anrede: "", vorname: "Gelöscht", nachname: "(Art. 17)", firma: "", email: "", telefon: "", plz: "", ort: "", notiz: "", geaendertAm: am });
      }
    }
    W.protokoll?.(db, n, "lead_geloescht", "vorgang", vg.id, `Personendaten gelöscht (Art. 17), ${betroffen.length} Vorgang/Vorgänge; Nachweis bis ${bis.slice(0, 10)}`);
    const kette = protokollPruefen(db.leadKette);
    return { ok: true, entfernt, vorgaenge: betroffen.map((x) => x.id), widerrufen, nachweisBis: bis, kontoVorhanden: mitKonto, ketteOk: kette.ok };
  });
}
