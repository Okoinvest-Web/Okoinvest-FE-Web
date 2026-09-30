// src/lib/plattform/backend/demo/kundenenergie.js
//
// Kundenseite Energie (Team 4) im Demo-Backend – Referenz für Frappe plattform/api/kundenenergie.py.
// Daten unter db.kundenenergie { v, anliegen[], wechsel[] }; Regeln in src/lib/plattform/kundenenergie.js.
//
// Rechte (jede Operation prüft Rolle UND Eigentum selbst):
//   Kunde      – Rolle „unternehmen“: eigene Anliegen (Konto bzw. Organisation der Rechnung/Anlage; Einreichen und
//                Annehmen nur Konto oder Teamrolle mit Schreibrecht), eigene Lieferantenwechsel, eigener Kostenbericht
//   Lieferant  – Rolle „lieferant“ des bezuschlagten Versorgers: Vertragsdaten und Wechsel NUR dieser Ausschreibung
//   Backoffice – Anliegen: Bereich „finanzen“ (lesen ≥ 1, entscheiden = 2); Wechsel: Bereich „energie“
//   sonst      – 403 bzw. 404 (keine Existenz verraten)
//
// Folgeaktionen: Einspruch → Mahnsperre an der Rechnung, bei (Teil-)Stattgabe Klärfall „Korrektur“ in Finanzen;
// Kündigung bestätigt → Contracting-Vertrag „gekündigt“; Angebot angenommen → Aufgabe Backoffice (Nachtrag bzw. Kaufvertrag);
// Wechsel „Belieferung begonnen“ → neuer Vertrag aktiv, Altvertrag beendet. Jede Statusänderung benachrichtigt die Gegenseite.

import { PlattformFehler, konflikt, nichtGefunden, ungueltig, verboten } from "../../fehler";
import * as v from "../../validierung";
import { darfLesen, darfSchreiben } from "../../rechte";
import { darfTeamSchreiben } from "../../organisation";
import { intern } from "../demo";
import { aendern, lesen } from "./speicher";
import { jetzt, neueId } from "./hilfen";
import { teamRolle } from "./teams";
import { klaerfallMelden } from "./finanzen-kern";
import * as anlagenDemo from "./anlagen";
import * as finanzenDemo from "./finanzen";
import * as energieDemo from "./energie";
import { kuendigungsStichtag, vertragEnergiepreisCt, STRUKTUREN } from "../../energie/beschaffung";
import {
  ANLIEGEN_ARTEN, ANLIEGEN_OFFEN, ANLIEGEN_STATUS, AKTION_LABEL, EINSPRUCH_GRUENDE, WECHSEL_SCHRITTE, aktionPruefen, anliegenPruefen, erlaubteAktionen,
  kostenreport as kostenreportRechnen, kuendigungContracting, uebergang, wechselAnlegen, wechselSchrittErledigen, wechselStand, zielDatum,
} from "../../kundenenergie";

const benachrichtigen = (...a) => intern.benachrichtigen(...a);
const protokoll = (...a) => intern.protokoll(...a);
const nutzerById = (...a) => intern.nutzerById(...a);
const nameVon = (...a) => intern.nameVon(...a);
const aktiveAdmins = (...a) => intern.aktiveAdmins(...a);

const MAIL_KUNDE = "Zu Ihrem Anliegen gibt es Neuigkeiten. Details finden Sie im Portal von ÖkoInvest.";
const MAIL_WECHSEL = "Zu Ihrem Lieferantenwechsel gibt es Neuigkeiten. Details finden Sie im Portal von ÖkoInvest.";

const istAdmin = (n) => !!n?.rollen?.includes("admin");
const finLesen = (n) => istAdmin(n) && darfLesen(n, "finanzen");
const finSchreiben = (n) => istAdmin(n) && darfSchreiben(n, "finanzen");
const enLesen = (n) => istAdmin(n) && darfLesen(n, "energie");
const enSchreiben = (n) => istAdmin(n) && darfSchreiben(n, "energie");
const heute = () => jetzt().slice(0, 10);

function angemeldet(n) {
  if (!n) throw new PlattformFehler(401, "Bitte melden Sie sich an.");
}
/** Fachfehler der reinen Logik (status 403/409/422) übersetzen */
function fach(fn) {
  try {
    return fn();
  } catch (e) {
    if (e instanceof PlattformFehler || !e?.status) throw e;
    if (e.status === 403) throw verboten(e.message);
    if (e.status === 409) throw konflikt(e.message);
    throw ungueltig(e.message);
  }
}

async function lesenBereit() {
  const db = await lesen();
  if (db.kundenenergie?.v) return db;
  await aendern((d) => {
    if (!d.kundenenergie?.v) d.kundenenergie = { v: 1, anliegen: [], wechsel: [] };
  });
  return lesen();
}
const K = (db) => db.kundenenergie;

function aufgabeAnlegen(db, { titel, beschreibung, faelligAm, zustaendigId, vonId }) {
  db.aufgaben = db.aufgaben || [];
  const a = { id: neueId("AF"), titel: v.text(titel, 160), beschreibung: v.mehrzeilig(beschreibung, 2000), faelligAm, zustaendigId, bezugArt: null, bezugId: null, status: "offen", erstelltVon: vonId || zustaendigId, erstelltAm: jetzt(), erledigtAm: null, erledigtVon: null, erinnertAm: null };
  db.aufgaben.push(a);
  return a;
}
const adminsMit = (db, bereich) => aktiveAdmins(db).filter((u) => darfLesen(u, bereich));
function zustaendig(db, bereich, unterrolle) {
  const liste = aktiveAdmins(db).filter((u) => darfSchreiben(u, bereich));
  return liste.find((u) => (u.backofficeRollen || []).includes(unterrolle)) || liste.find((u) => u.email === "admin@example.com") || liste[0] || null;
}
const eur = (x) => (Number.isFinite(x) ? `${x.toLocaleString("de-DE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €` : "–");
const tag = (iso) => (iso ? String(iso).slice(0, 10).split("-").reverse().join(".") : "–");

// ================================================================ Anliegen – Zugriff & Ausgabe

/** Zugriff: backoffice | kunde | team-schreiben | team-lesen | null */
function zugriffAnliegen(db, n, a) {
  if (!n || !a) return null;
  if (finLesen(n)) return "backoffice";
  if (a.kundeId === n.id) return "kunde";
  const r = a.organisationId ? teamRolle(db, n.id, a.organisationId) : null;
  if (r) return darfTeamSchreiben(r) ? "team-schreiben" : "team-lesen";
  return null;
}

function anliegenAusgabe(db, n, a) {
  const zg = zugriffAnliegen(db, n, a);
  const bo = zg === "backoffice";
  const kundeDarf = zg === "kunde" || zg === "team-schreiben";
  const aktionen = bo ? (finSchreiben(n) ? erlaubteAktionen(a.art, a.status, "bo") : []) : kundeDarf ? erlaubteAktionen(a.art, a.status, "kunde") : [];
  const k = nutzerById(db, a.kundeId);
  return {
    id: a.id, art: a.art, artLabel: ANLIEGEN_ARTEN[a.art]?.label || a.art, status: a.status, statusLabel: ANLIEGEN_STATUS[a.status]?.label || a.status, ton: ANLIEGEN_STATUS[a.status]?.ton || "neutral",
    offen: ANLIEGEN_OFFEN.includes(a.status), eingereichtAm: a.eingereichtAm, zielAm: a.zielAm, entschiedenAm: a.entschiedenAm || null,
    ueberfaellig: ANLIEGEN_OFFEN.includes(a.status) && a.status !== "angebot" && a.zielAm < heute(),
    anlageId: a.anlageId || null, anlageName: a.anlageName || "", belegId: a.belegId || null, belegNummer: a.belegNummer || "", belegBrutto: a.belegBrutto ?? null, belegZeitraum: a.belegZeitraum || null,
    grund: a.grund || "", grundLabel: EINSPRUCH_GRUENDE[a.grund] || "", text: a.text || "", betragStrittigEur: a.betragStrittigEur ?? null,
    wunschJahre: a.wunschJahre ?? null, wunschTermin: a.wunschTermin || "", wirksamZum: a.wirksamZum || "", stichtag: a.stichtag || "",
    angebot: a.angebot || null, begruendung: a.begruendung || "", korrekturEur: a.korrekturEur ?? null, klaerfallId: bo ? a.klaerfallId || null : undefined,
    kunde: { id: a.kundeId, name: nameVon(db, a.kundeId), firma: k?.firma || "" },
    verlauf: (a.verlauf || []).map((x) => ({ am: x.am, text: x.text, wer: x.wer })),
    aktionen: aktionen.map((id) => ({ id, label: AKTION_LABEL[id] })),
    meinZugriff: zg,
  };
}

function kundenMelden(db, a, titel, text) {
  const empf = new Map();
  const k = nutzerById(db, a.kundeId);
  if (k) empf.set(k.id, k);
  if (a.organisationId) for (const m of (db.mitgliedschaften || []).filter((x) => x.organisationId === a.organisationId)) empf.set(m.nutzerId, nutzerById(db, m.nutzerId));
  for (const u of empf.values()) if (u) benachrichtigen(db, u, { art: "abrechnung", titel, text, link: `/portal/anliegen#${a.id}`, objektArt: "kundenanliegen", objektId: a.id }, { mailText: MAIL_KUNDE, mailBetreff: `${ANLIEGEN_ARTEN[a.art].kurz}: ${ANLIEGEN_STATUS[a.status]?.label} – ÖkoInvest` });
}
function boMelden(db, a, titel, text) {
  for (const u of adminsMit(db, "finanzen")) benachrichtigen(db, u, { art: "aufgabe", titel, text, link: `/portal/admin/finanzen/anliegen#${a.id}`, objektArt: "kundenanliegen", objektId: a.id }, { mail: false });
}

/** Rechnung (roh) inkl. Zugriffsprüfung wie in Finanzen */
function belegRoh(db, n, belegId) {
  const b = (db.finanzen?.belege || []).find((x) => x.id === v.kennung(belegId));
  if (!b) throw nichtGefunden("Rechnung nicht gefunden.");
  const eigen = b.empfaengerId === n.id;
  const r = b.organisationId ? teamRolle(db, n.id, b.organisationId) : null;
  if (!eigen && !r) throw verboten("Diese Rechnung gehört nicht zu Ihrem Konto.");
  if (!eigen && !darfTeamSchreiben(r)) throw verboten("Ihre Teamrolle erlaubt nur das Lesen.");
  return b;
}

// ================================================================ Anliegen – Kunde

/** Eigene Anliegen (Kunde) bzw. alle (Backoffice Finanzen); status: offen | alle */
export async function kundenAnliegen(n, { status = "alle" } = {}) {
  angemeldet(n);
  if (!finLesen(n) && !n.rollen?.includes("unternehmen")) throw verboten();
  const db = await lesenBereit();
  return K(db).anliegen
    .filter((a) => zugriffAnliegen(db, n, a))
    .filter((a) => status !== "offen" || ANLIEGEN_OFFEN.includes(a.status))
    .sort((x, y) => String(y.eingereichtAm).localeCompare(String(x.eingereichtAm)))
    .slice(0, 300)
    .map((a) => anliegenAusgabe(db, n, a));
}

/** Auswahl für das Formular: eigene Contracting-Rechnungen (letzte 24) und Anlagen mit Vertrag */
export async function kundenAnliegenAuswahl(n) {
  angemeldet(n);
  if (!n.rollen?.includes("unternehmen") || istAdmin(n)) throw verboten("Anliegen reichen Contracting-Kunden ein.");
  const [abr, anl] = await Promise.all([finanzenDemo.meineAbrechnungen(n, {}).catch(() => null), anlagenDemo.anlagen(n, {}).catch(() => [])]);
  const belege = (abr?.contracting?.belege || []).filter((b) => b.beleg === "rechnung").slice(0, 24).map((b) => ({ id: b.id, nummer: b.nummer, titel: b.titel, zeitraum: b.zeitraum, brutto: b.brutto, status: b.status, anlageId: b.bezug?.anlageId || null }));
  const anlagen = [];
  for (const a of anl.slice(0, 40)) {
    let vt = null;
    try {
      vt = (await anlagenDemo.anlage(n, a.id)).vertrag;
    } catch {
      vt = null;
    }
    anlagen.push({ id: a.id, name: a.name, ort: a.ort, meinZugriff: a.meinZugriff, vertrag: vt ? { status: vt.status, ende: vt.ende, kuendigungsfristMonate: vt.kuendigungsfristMonate, endschaft: vt.endschaft || "", kaufoptionEur: vt.kaufoptionEur || null, kuendigung: kuendigungContracting(vt, heute()) } : null });
  }
  return { belege, anlagen, gruende: EINSPRUCH_GRUENDE };
}

export async function kundenAnliegenAnlegen(n, daten = {}) {
  angemeldet(n);
  if (!n.rollen?.includes("unternehmen") || istAdmin(n)) throw verboten("Anliegen reichen Contracting-Kunden ein.");
  const art = v.auswahl(daten.art, ANLIEGEN_ARTEN, "");
  if (!art) throw ungueltig("Bitte wählen Sie die Art des Anliegens.");
  // Vorab (außerhalb der Schreibsperre): Anlage bzw. Rechnung mit den Zugriffsregeln der Module laden
  let anlage = null;
  if (art !== "einspruch") {
    anlage = await anlagenDemo.anlage(n, daten.anlageId);
    if (!["kunde", "team-schreiben"].includes(anlage.meinZugriff)) throw verboten("Ihre Teamrolle erlaubt nur das Lesen.");
  } else {
    await finanzenDemo.abrechnung(n, daten.belegId); // 403/404 für fremde Belege, stellt die Finanzdaten sicher
  }
  await lesenBereit();
  return aendern((db) => {
    let beleg = null;
    if (art === "einspruch") beleg = belegRoh(db, n, daten.belegId);
    const d = fach(() => anliegenPruefen(art, daten, { beleg, vertrag: anlage?.vertrag || null, heute: heute() }));
    const bezug = art === "einspruch" ? { belegId: beleg.id } : { anlageId: anlage.id };
    const doppelt = K(db).anliegen.find((x) => x.art === art && ANLIEGEN_OFFEN.includes(x.status) && (art === "einspruch" ? x.belegId === beleg.id : x.anlageId === anlage.id));
    if (doppelt) throw konflikt(`Zu ${art === "einspruch" ? "dieser Rechnung" : "dieser Anlage"} ist bereits ein Anliegen dieser Art offen.`);
    if (K(db).anliegen.filter((x) => x.kundeId === n.id && ANLIEGEN_OFFEN.includes(x.status)).length >= 30) throw konflikt("Höchstens 30 offene Anliegen je Konto.");
    const t = jetzt();
    const a = {
      id: neueId("KN"), art, status: "eingereicht", kundeId: n.id,
      organisationId: art === "einspruch" ? beleg.organisationId || null : anlage.organisation?.id || null,
      ...bezug,
      anlageId: art === "einspruch" ? beleg.bezug?.anlageId || null : anlage.id,
      anlageName: art === "einspruch" ? (db.anlagen?.anlagen || []).find((x) => x.id === beleg.bezug?.anlageId)?.name || "" : anlage.name,
      belegNummer: beleg?.nummer || "", belegBrutto: beleg?.brutto ?? null, belegZeitraum: beleg?.zeitraum || null,
      grund: d.grund, text: d.text, betragStrittigEur: d.betragStrittigEur, wunschJahre: d.wunschJahre, wunschTermin: d.wunschTermin, wirksamZum: d.wirksamZum, stichtag: d.stichtag,
      angebot: null, begruendung: "", korrekturEur: null, klaerfallId: null,
      eingereichtAm: t, zielAm: zielDatum(art, t), entschiedenAm: null,
      verlauf: [{ am: t, wer: "kunde", text: `${ANLIEGEN_ARTEN[art].label} eingereicht von ${nameVon(db, n.id)}` }],
    };
    K(db).anliegen.push(a);
    if (beleg) {
      beleg.mahnsperre = { anliegenId: a.id, seit: t, grund: "Einspruch in Prüfung" };
      a.verlauf.push({ am: t, wer: "system", text: `Mahnsperre für Rechnung ${beleg.nummer} gesetzt, solange der Einspruch geprüft wird` });
    }
    const z = zustaendig(db, "finanzen", "buchhaltung");
    const kurz = `${ANLIEGEN_ARTEN[art].kurz}: ${nutzerById(db, n.id)?.firma || nameVon(db, n.id)}${beleg ? ` · ${beleg.nummer}` : ` · ${a.anlageName}`}`;
    if (z) aufgabeAnlegen(db, { titel: kurz, beschreibung: `${ANLIEGEN_ARTEN[art].label}\n${d.text || ""}\nBearbeitungsziel: ${tag(a.zielAm)}\n/portal/admin/finanzen/anliegen#${a.id}`, faelligAm: a.zielAm, zustaendigId: z.id, vonId: n.id });
    boMelden(db, a, `Neues Kundenanliegen – ${kurz}`, `Bearbeitungsziel ${tag(a.zielAm)}`);
    kundenMelden(db, a, `Eingangsbestätigung: ${ANLIEGEN_ARTEN[art].kurz}`, `Ihr Anliegen ${a.id} ist eingegangen. Wir melden uns bis voraussichtlich ${tag(a.zielAm)}.`);
    protokoll(db, n, "anliegen_anlegen", "kundenanliegen", a.id, `${ANLIEGEN_ARTEN[art].label}${beleg ? ` zu ${beleg.nummer}` : ` zu ${a.anlageName}`}`);
    return anliegenAusgabe(db, n, a);
  });
}

/**
 * Aktion an einem Anliegen – wer ergibt sich aus der Rolle: Backoffice (Finanzen schreiben) oder Kunde (Konto/Team schreiben).
 *   bo:    pruefen · stattgeben {begruendung, korrekturEur?} · teilweise {begruendung, korrekturEur} · ablehnen {begruendung}
 *          bestaetigen {begruendung} · angebot {betragEur, stichtag | jahre, preisCt, grundgebuehrMonat; gueltigBis, text}
 *   kunde: zurueckziehen · annehmen {bestaetigt: true} · ausschlagen {begruendung?}
 */
export async function kundenAnliegenAktion(n, id, daten = {}) {
  angemeldet(n);
  await lesenBereit();
  return aendern((db) => {
    const a = K(db).anliegen.find((x) => x.id === v.kennung(id));
    const zg = a ? zugriffAnliegen(db, n, a) : null;
    if (!a || !zg) throw nichtGefunden("Anliegen nicht gefunden.");
    let wer;
    if (zg === "backoffice") {
      if (!finSchreiben(n)) throw verboten("Ihre Backoffice-Rolle erlaubt im Bereich „Finanzen & Abrechnung“ kein Schreiben.");
      wer = "bo";
    } else if (zg === "kunde" || zg === "team-schreiben") wer = "kunde";
    else throw verboten("Ihre Teamrolle erlaubt nur das Lesen.");
    const aktion = String(daten.aktion || "");
    const neu = fach(() => uebergang(a.art, a.status, aktion, wer));
    const d = fach(() => aktionPruefen(a.art, aktion, daten, { anliegen: a, heute: heute() }));
    const t = jetzt();
    const vorher = a.status;
    a.status = neu;
    const wname = wer === "bo" ? `ÖkoInvest (${nameVon(db, n.id)})` : nameVon(db, n.id);
    let text = `${AKTION_LABEL[aktion]} – ${wname}`;
    if (d.begruendung) a.begruendung = d.begruendung;
    if (aktion === "angebot") {
      a.angebot = { ...d.angebot, am: t };
      text = a.art === "kaufoption" ? `Angebot: Kaufpreis ${eur(d.angebot.betragEur)} netto, Übergabe ${tag(d.angebot.stichtag)}, gültig bis ${tag(d.angebot.gueltigBis)}` : `Angebot: ${d.angebot.jahre} Jahre zu ${d.angebot.preisCt.toLocaleString("de-DE")} ct/kWh, gültig bis ${tag(d.angebot.gueltigBis)}`;
    }
    if (["stattgeben", "teilweise"].includes(aktion)) a.korrekturEur = d.korrekturEur;
    if (!ANLIEGEN_STATUS[neu].offen) a.entschiedenAm = t;
    a.verlauf.push({ am: t, wer, text: d.begruendung && aktion !== "angebot" ? `${text}: ${d.begruendung.slice(0, 300)}` : text });

    // ---------------------------------------------------------------- Folgeaktionen
    const beleg = a.belegId ? (db.finanzen?.belege || []).find((b) => b.id === a.belegId) : null;
    if (a.art === "einspruch" && !ANLIEGEN_STATUS[neu].offen && beleg?.mahnsperre?.anliegenId === a.id) {
      delete beleg.mahnsperre;
      a.verlauf.push({ am: t, wer: "system", text: "Mahnsperre aufgehoben" });
    }
    if (a.art === "einspruch" && ["stattgegeben", "teilweise"].includes(neu) && db.finanzen?.klaerfaelle) {
      const { klaerfall } = klaerfallMelden(db, {
        art: "contracting", schluessel: `EINSPRUCH:${a.id}`, bezug: { anlageId: a.anlageId, belegId: a.belegId, anliegenId: a.id },
        bezugText: `Einspruch ${a.belegNummer || a.belegId}`, gruende: [`Einspruch ${neu === "teilweise" ? "teilweise " : ""}stattgegeben: Korrektur ${a.korrekturEur !== null ? `${eur(a.korrekturEur)} ` : ""}per Gutschrift bzw. Korrekturrechnung zu ${a.belegNummer} erstellen.`], laufId: null,
      });
      a.klaerfallId = klaerfall.id;
      a.verlauf.push({ am: t, wer: "system", text: `Korrektur an die Buchhaltung übergeben (Klärfall ${klaerfall.id})` });
    }
    if (a.art === "kuendigung" && neu === "bestaetigt") {
      const c = (db.anlagen?.vertraege || []).find((x) => x.anlageId === a.anlageId);
      if (c) {
        c.status = "gekuendigt";
        c.kuendigungAm = t;
        c.kuendigungZum = a.wirksamZum;
        c.geaendertAm = t;
      }
      a.verlauf.push({ am: t, wer: "system", text: `Vertrag zum ${tag(a.wirksamZum)} als gekündigt vermerkt` });
    }
    if (neu === "angenommen") {
      const z = zustaendig(db, "finanzen", "buchhaltung");
      const was = a.art === "kaufoption" ? `Übernahme ${a.anlageName}: Kaufvertrag, Übergabeprotokoll, Grundbuch/Dienstbarkeit und Abmeldung Betriebsführung vorbereiten (Stichtag ${tag(a.angebot?.stichtag)})` : `Verlängerung ${a.anlageName}: Nachtrag zum Stromliefervertrag (${a.angebot?.jahre} Jahre, ${a.angebot?.preisCt} ct/kWh) zur Unterschrift senden`;
      if (z) aufgabeAnlegen(db, { titel: was.slice(0, 150), beschreibung: `${was}\nAnliegen ${a.id} – vom Kunden angenommen am ${tag(t)}.`, faelligAm: heute(), zustaendigId: z.id, vonId: n.id });
      a.verlauf.push({ am: t, wer: "system", text: "Angenommen – Backoffice bereitet die Vertragsunterlagen vor" });
    }
    if (wer === "bo") kundenMelden(db, a, `${ANLIEGEN_ARTEN[a.art].kurz}: ${ANLIEGEN_STATUS[neu].label}`, neu === "angebot" ? "Ihnen liegt ein Angebot vor – bitte im Portal annehmen oder ablehnen." : a.begruendung ? a.begruendung.slice(0, 200) : `Status: ${ANLIEGEN_STATUS[neu].label}`);
    else boMelden(db, a, `${ANLIEGEN_ARTEN[a.art].kurz} ${a.id}: ${ANLIEGEN_STATUS[neu].label}`, `${nameVon(db, n.id)} – ${AKTION_LABEL[aktion]}`);
    protokoll(db, n, `anliegen_${aktion}`, "kundenanliegen", a.id, `${ANLIEGEN_ARTEN[a.art].kurz}: ${ANLIEGEN_STATUS[vorher].label} → ${ANLIEGEN_STATUS[neu].label}`);
    return anliegenAusgabe(db, n, a);
  });
}

/** Daten für das PDF (Eingangsbestätigung bzw. Entscheidung) – gleiche Rechte wie das Lesen */
export async function kundenAnliegenDokument(n, id) {
  angemeldet(n);
  const db = await lesenBereit();
  const a = K(db).anliegen.find((x) => x.id === v.kennung(id));
  if (!a || !zugriffAnliegen(db, n, a)) throw nichtGefunden("Anliegen nicht gefunden.");
  const k = nutzerById(db, a.kundeId);
  const anlage = a.anlageId ? (db.anlagen?.anlagen || []).find((x) => x.id === a.anlageId) : null;
  return { anliegen: anliegenAusgabe(db, n, a), kunde: { name: nameVon(db, a.kundeId), firma: k?.firma || "", email: k?.email || "" }, eigentuemer: anlage?.eigentuemer || "ÖkoInvest GmbH" };
}

// ================================================================ Störung melden (Kunde)

const AUSWIRKUNG = { kein_ertrag: "hoch", weniger_ertrag: "mittel", sicherheit: "kritisch", sonstiges: "niedrig" };

/** Kunde meldet eine Störung an einer eigenen Anlage (Konto oder Teamrolle mit Schreibrecht) → Betrieb wird informiert */
export async function kundenStoerungMelden(n, { anlageId, titel, text, auswirkung } = {}) {
  angemeldet(n);
  if (!n.rollen?.includes("unternehmen") || istAdmin(n)) throw verboten("Störungen melden Kunden hier; das Backoffice erfasst sie im Leitstand.");
  const t0 = v.text(titel, 140);
  v.pflicht(t0.length >= 5, "Bitte beschreiben Sie die Störung kurz (mindestens 5 Zeichen).");
  const beschreibung = v.mehrzeilig(text, 2000);
  const schwere = AUSWIRKUNG[auswirkung] || "mittel";
  const a0 = await anlagenDemo.anlage(n, anlageId); // 403/404 für fremde Anlagen, stellt die Anlagendaten sicher
  if (!["kunde", "team-schreiben"].includes(a0.meinZugriff)) throw verboten("Ihre Teamrolle erlaubt nur das Lesen.");
  const id = await aendern((db) => {
    const a = db.anlagen.anlagen.find((x) => x.id === a0.id);
    const offen = db.anlagen.stoerungen.filter((s) => s.anlageId === a.id && s.gemeldetVon === n.id && ["offen", "in_arbeit"].includes(s.status));
    if (offen.length >= 5) throw konflikt("Sie haben bereits fünf offene Meldungen zu dieser Anlage – bitte ergänzen Sie dort einen Kommentar.");
    const t = jetzt();
    const wer = nameVon(db, n.id);
    const s = {
      id: neueId("ST"), anlageId: a.id, geraetId: null, regel: "manuell", schwere, titel: t0, text: beschreibung, status: "offen", erkanntAm: t, zuletztAm: t, anzahl: 1,
      quittiertAm: null, quittiertVon: null, zustaendigId: null, behobenAm: null, kommentare: [], verlauf: [{ am: t, text: `Vom Kunden gemeldet (${wer})` }], schluessel: null, gemeldetVon: n.id,
    };
    db.anlagen.stoerungen.push(s);
    for (const u of adminsMit(db, "anlagen")) benachrichtigen(db, u, { art: "stoerung", titel: `Kundenmeldung: ${a.name}`, text: `${wer}: ${t0}`, link: `/portal/anlagen/${a.id}?tab=stoerungen`, objektArt: "anlage", objektId: a.id }, { mailBetreff: "Störungsmeldung eines Kunden – ÖkoInvest", mailText: "Ein Kunde hat eine Störung gemeldet. Details finden Sie im Portal." });
    const k = nutzerById(db, n.id);
    if (k) benachrichtigen(db, k, { art: "stoerung", titel: `Störungsmeldung eingegangen: ${a.name}`, text: `${t0} – der Betrieb ist informiert.`, link: `/portal/anlagen/${a.id}?tab=stoerungen`, objektArt: "anlage", objektId: a.id }, { mail: false });
    protokoll(db, n, "stoerung_kunde", "anlage", a.id, `Störung gemeldet: ${t0}`);
    return s.id;
  });
  const liste = await anlagenDemo.stoerungen(n, { anlageId: a0.id, status: "alle" });
  return liste.find((x) => x.id === id) || { id };
}

// ================================================================ Lieferantenwechsel (Reststrom)

const lieferantVon = (db, n) => (n?.rollen?.includes("lieferant") ? (db.energie?.lieferanten || []).find((l) => l.status !== "gesperrt" && (l.kontoIds || []).includes(n.id)) || null : null);

/** Fehlende Wechsel zu Zuschlags-Verträgen anlegen; überfällige kritische Schritte einmalig als Aufgabe melden */
function wechselPflegen(db) {
  if (!db.energie?.vertraege) return false;
  let geaendert = false;
  for (const vt of db.energie.vertraege.filter((x) => x.quelle === "zuschlag" && x.ausschreibungId)) {
    if (K(db).wechsel.some((w) => w.vertragId === vt.id)) continue;
    const a = (db.energie.ausschreibungen || []).find((x) => x.id === vt.ausschreibungId);
    if (!a || a.status !== "zuschlag") continue;
    const alt = vt.vorvertragId ? db.energie.vertraege.find((x) => x.id === vt.vorvertragId) : null;
    K(db).wechsel.push({
      id: neueId("LW"), ausschreibungId: a.id, vertragId: vt.id, kundeId: vt.kundeId, lieferantId: vt.lieferantId, vorvertragId: alt?.id || null, lieferbeginn: a.lieferbeginn,
      schritte: wechselAnlegen({ zuschlagAm: a.zuschlag?.am || vt.erstelltAm, lieferbeginn: a.lieferbeginn, stichtagAlt: alt ? kuendigungsStichtag(alt) : null, mitVorvertrag: !!alt }),
      verlauf: [{ am: jetzt(), wer: "system", text: "Lieferantenwechsel angelegt (nach Zuschlag)" }], alarme: {}, erstelltAm: jetzt(),
    });
    geaendert = true;
  }
  const h = heute();
  for (const w of K(db).wechsel) {
    const st = wechselStand(w.schritte, h);
    for (const sid of st.ueberfaellig.filter((x) => ["kuendigung_alt", "anmeldung_netz", "vertrag_kunde"].includes(x))) {
      if (w.alarme?.[sid]) continue;
      w.alarme = { ...(w.alarme || {}), [sid]: jetzt() };
      const z = zustaendig(db, "energie", "energie");
      const def = WECHSEL_SCHRITTE.find((x) => x.id === sid);
      const k = nutzerById(db, w.kundeId);
      if (z) aufgabeAnlegen(db, { titel: `Wechsel ${k?.firma || nameVon(db, w.kundeId)}: „${def.label}“ überfällig`, beschreibung: `Frist ${tag(w.schritte.find((x) => x.id === sid)?.frist)} überschritten.\n/portal/admin/energie/wechsel#${w.id}`, faelligAm: h, zustaendigId: z.id, vonId: null });
      geaendert = true;
    }
  }
  return geaendert;
}

/** Ist etwas anzulegen bzw. zu melden? (ohne Schreibzugriff – Aufruf bei jedem Seitenabruf) */
function wechselPflegeNoetig(db) {
  if (!db.energie?.vertraege) return false;
  const vorhanden = new Set(K(db).wechsel.map((w) => w.vertragId));
  const fehlt = db.energie.vertraege.some((vt) => vt.quelle === "zuschlag" && vt.ausschreibungId && !vorhanden.has(vt.id) && (db.energie.ausschreibungen || []).some((a) => a.id === vt.ausschreibungId && a.status === "zuschlag"));
  if (fehlt) return true;
  const h = heute();
  return K(db).wechsel.some((w) => wechselStand(w.schritte, h).ueberfaellig.some((sid) => ["kuendigung_alt", "anmeldung_netz", "vertrag_kunde"].includes(sid) && !w.alarme?.[sid]));
}

async function wechselLesen() {
  const db = await lesenBereit();
  if (!wechselPflegeNoetig(db)) return db;
  await aendern((d) => {
    if (!d.kundenenergie?.v) d.kundenenergie = { v: 1, anliegen: [], wechsel: [] };
    wechselPflegen(d);
  });
  return lesen();
}

function wechselAusgabe(db, n, w, rolle) {
  const vt = db.energie.vertraege.find((x) => x.id === w.vertragId);
  const alt = w.vorvertragId ? db.energie.vertraege.find((x) => x.id === w.vorvertragId) : null;
  const a = db.energie.ausschreibungen.find((x) => x.id === w.ausschreibungId);
  const l = db.energie.lieferanten.find((x) => x.id === w.lieferantId);
  const k = nutzerById(db, w.kundeId);
  const st = wechselStand(w.schritte, heute());
  const wer = rolle === "backoffice" ? (enSchreiben(n) ? "bo" : null) : rolle;
  const schritte = w.schritte.map((s) => {
    const def = WECHSEL_SCHRITTE.find((x) => x.id === s.id);
    const vorOk = (def.nach || []).every((id) => ["erledigt", "entfaellt"].includes(w.schritte.find((x) => x.id === id)?.status));
    return { ...s, label: def.label, text: def.text, wer: def.wer, ueberfaellig: st.ueberfaellig.includes(s.id), darf: !!wer && s.status === "offen" && def.wer.includes(wer) && vorOk };
  });
  return {
    id: w.id, ausschreibungId: w.ausschreibungId, titel: rolle === "lieferant" ? `Stromlieferung ab ${String(w.lieferbeginn).split("-").reverse().join("/")}` : a?.titel || "", lieferbeginn: w.lieferbeginn,
    lieferant: l?.name || vt?.lieferant || "", kunde: rolle === "kunde" ? null : { id: w.kundeId, name: nameVon(db, w.kundeId), firma: k?.firma || "" },
    vertrag: vt ? { id: vt.id, status: vt.status, struktur: STRUKTUREN[vt.struktur]?.kurz || vt.struktur, preisCt: vt.preisCt, aufschlagCt: vt.aufschlagCt ?? null, beginn: vt.beginn, vertragEnde: vt.vertragEnde } : null,
    vorvertrag: alt && rolle !== "lieferant" ? { id: alt.id, lieferant: alt.lieferant, vertragEnde: alt.vertragEnde, stichtag: kuendigungsStichtag(alt), status: alt.status } : null,
    schritte, stand: st, verlauf: rolle === "lieferant" ? [] : (w.verlauf || []).slice(-30), rolle,
  };
}

/** Wechsel des Kunden bzw. (Backoffice Energie) alle bzw. (Lieferant) des eigenen Zuschlags */
export async function lieferantenwechsel(n, { ausschreibungId = "" } = {}) {
  angemeldet(n);
  const db = await wechselLesen();
  if (!db.energie?.vertraege) return [];
  const aid = v.kennung(ausschreibungId);
  if (enLesen(n)) return K(db).wechsel.filter((w) => !aid || w.ausschreibungId === aid).sort((x, y) => String(y.erstelltAm).localeCompare(String(x.erstelltAm))).map((w) => wechselAusgabe(db, n, w, "backoffice"));
  const l = lieferantVon(db, n);
  if (l) return K(db).wechsel.filter((w) => w.lieferantId === l.id && (!aid || w.ausschreibungId === aid)).map((w) => wechselAusgabe(db, n, w, "lieferant"));
  if (n.rollen?.includes("unternehmen") && !istAdmin(n)) return K(db).wechsel.filter((w) => w.kundeId === n.id && (!aid || w.ausschreibungId === aid)).map((w) => wechselAusgabe(db, n, w, "kunde"));
  throw verboten();
}

/** Schritt bestätigen { schritt, bemerkung } – Rolle aus Konto: Kunde, Versorger (bezuschlagt) oder Backoffice Energie */
export async function lieferantenwechselAktion(n, id, { schritt, bemerkung = "" } = {}) {
  angemeldet(n);
  await wechselLesen();
  return aendern((db) => {
    const w = K(db).wechsel.find((x) => x.id === v.kennung(id));
    if (!w) throw nichtGefunden("Lieferantenwechsel nicht gefunden.");
    let wer = null;
    let rolle = null;
    if (enLesen(n)) {
      if (!enSchreiben(n)) throw verboten("Ihre Backoffice-Rolle erlaubt im Bereich „Energiebeschaffung“ kein Schreiben.");
      wer = "bo";
      rolle = "backoffice";
    } else if (lieferantVon(db, n)?.id === w.lieferantId) wer = rolle = "lieferant";
    else if (n.rollen?.includes("unternehmen") && !istAdmin(n) && w.kundeId === n.id) wer = rolle = "kunde";
    else throw nichtGefunden("Lieferantenwechsel nicht gefunden.");
    const t = jetzt();
    w.schritte = fach(() => wechselSchrittErledigen(w.schritte, String(schritt || ""), wer, { am: t, bemerkung: v.text(bemerkung, 300) }));
    const def = WECHSEL_SCHRITTE.find((x) => x.id === schritt);
    const wname = wer === "bo" ? `ÖkoInvest (${nameVon(db, n.id)})` : wer === "lieferant" ? `Versorger (${nameVon(db, n.id)})` : nameVon(db, n.id);
    w.verlauf.push({ am: t, wer, text: `${def.label} – bestätigt von ${wname}${bemerkung ? `: ${v.text(bemerkung, 200)}` : ""}` });
    const vt = db.energie.vertraege.find((x) => x.id === w.vertragId);
    const alt = w.vorvertragId ? db.energie.vertraege.find((x) => x.id === w.vorvertragId) : null;
    if (schritt === "kuendigung_alt" && alt) {
      alt.status = "gekuendigt";
      alt.kuendigungAm = t;
    }
    if (schritt === "lieferbeginn") {
      if (vt && vt.status === "neu") vt.status = "aktiv";
      if (alt && alt.status !== "beendet") alt.status = "beendet";
      w.verlauf.push({ am: t, wer: "system", text: "Neuer Vertrag aktiv, bisheriger Vertrag beendet" });
    }
    const st = wechselStand(w.schritte, heute());
    if (st.abgeschlossen) w.verlauf.push({ am: t, wer: "system", text: "Lieferantenwechsel abgeschlossen" });
    // Benachrichtigungen an die jeweils anderen Beteiligten
    const titel = st.abgeschlossen ? "Lieferantenwechsel abgeschlossen" : `Lieferantenwechsel: ${def.label}`;
    if (wer !== "kunde") {
      const k = nutzerById(db, w.kundeId);
      if (k) benachrichtigen(db, k, { art: "energie", titel, text: `Bestätigt von ${wer === "bo" ? "ÖkoInvest" : "Ihrem neuen Versorger"}.`, link: "/portal/energie/beschaffung#wechsel", objektArt: "lieferantenwechsel", objektId: w.id }, { mailText: MAIL_WECHSEL, mailBetreff: "Ihr Lieferantenwechsel – ÖkoInvest" });
    }
    if (wer !== "lieferant" && ["vertrag_kunde", "kuendigung_bestaetigt", "erste_rechnung"].includes(schritt)) {
      for (const kid of db.energie.lieferanten.find((x) => x.id === w.lieferantId)?.kontoIds || []) {
        const u = nutzerById(db, kid);
        if (u) benachrichtigen(db, u, { art: "energie", titel, text: `Los ${w.ausschreibungId}`, link: `/portal/ausschreibungen/${w.ausschreibungId}#wechsel`, objektArt: "lieferantenwechsel", objektId: w.id }, { mailText: MAIL_WECHSEL, mailBetreff: "Lieferantenwechsel – ÖkoInvest" });
      }
    }
    if (wer !== "bo") for (const u of adminsMit(db, "energie")) benachrichtigen(db, u, { art: "aufgabe", titel, text: `${nutzerById(db, w.kundeId)?.firma || nameVon(db, w.kundeId)} – ${wname}`, link: `/portal/admin/energie/wechsel#${w.id}`, objektArt: "lieferantenwechsel", objektId: w.id }, { mail: false });
    protokoll(db, n, "wechsel_schritt", "lieferantenwechsel", w.id, `${def.label} bestätigt (${wer})`);
    return wechselAusgabe(db, n, w, rolle);
  });
}

// ================================================================ Vertragsdaten für den bezuschlagten Versorger

/**
 * Kundendaten für Liefervertrag und Anmeldung beim Netzbetreiber – erst nach Zuschlag (= Freigabe durch alle Kunden),
 * nur für den bezuschlagten Versorger bzw. das Backoffice (Energie). Jeder Abruf wird protokolliert.
 */
export async function vertragsdaten(n, ausschreibungId, { ip = "" } = {}) {
  angemeldet(n);
  const db = await lesenBereit();
  const a = (db.energie?.ausschreibungen || []).find((x) => x.id === v.kennung(ausschreibungId));
  if (!a) throw nichtGefunden("Ausschreibung nicht gefunden.");
  const zuschlagAngebot = a.zuschlag?.angebotId ? db.energie.angebote.find((g) => g.id === a.zuschlag.angebotId) : null;
  const l = lieferantVon(db, n);
  const bo = enLesen(n);
  if (!bo && !(l && zuschlagAngebot?.lieferantId === l.id)) throw nichtGefunden("Vertragsdaten nicht gefunden.");
  if (a.status !== "zuschlag" || !a.zuschlag?.am) throw konflikt("Vertragsdaten gibt es erst nach dem Zuschlag.");
  const lf = db.energie.lieferanten.find((x) => x.id === zuschlagAngebot.lieferantId);
  const pos = zuschlagAngebot.positionen.find((p) => p.produktId === a.zuschlag.produktId);
  const produkt = a.produkte.find((p) => p.id === a.zuschlag.produktId);
  const kunden = a.kundenIds.map((kid) => {
    const u = nutzerById(db, kid);
    const vt = db.energie.vertraege.find((x) => x.ausschreibungId === a.id && x.kundeId === kid);
    const ids = a.abnahmestelleIds?.[kid] || [];
    const stellen = (db.fach?.abnahmestellen || []).filter((s) => s.nutzerId === kid && (!ids.length || ids.includes(s.id)));
    const los = (a.lose || []).find((x) => x.kundeId === kid);
    return {
      firma: u?.firma || "", ansprechpartner: nameVon(db, kid), email: u?.email || "", telefon: u?.telefon || "",
      jahresKwh: los?.jahresKwh || vt?.jahresKwh || null, vertragId: vt?.id || null, beginn: vt?.beginn || `${a.lieferbeginn}-01`, vertragEnde: vt?.vertragEnde || "",
      abnahmestellen: stellen.map((s) => ({ bezeichnung: s.bezeichnung, land: s.land, plz: s.plz || "", ort: s.ort || "", maloId: s.maloId || "", meloId: s.meloId || "", zaehlpunkt: s.zaehlpunkt || "", messart: s.messart || "", netzbetreiber: s.netzbetreiber || "", spannungsebene: s.spannungsebene || s.netzebeneAt || "", jahresverbrauchKwh: s.jahresverbrauchKwh || null })),
    };
  });
  if (!bo) {
    await aendern((d) => protokoll(d, n, "vertragsdaten_abruf", "ausschreibung", a.id, `Vertragsdaten (Kundendaten, Lokationen) durch Versorger ${lf?.name || ""} abgerufen`, ip));
  }
  return {
    ausschreibung: { id: a.id, titel: a.titel, lieferbeginn: a.lieferbeginn, zone: a.zone, zuschlagAm: a.zuschlag.am },
    lieferant: lf?.name || "",
    produkt: { id: produkt?.id, art: produkt?.art, laufzeitJahre: produkt?.laufzeitJahre, arbeitspreisCt: pos?.arbeitspreisCt ?? null, aufschlagCt: pos?.aufschlagCt ?? null, grundpreisEurMonat: pos?.grundpreisEurMonat ?? null, hknCt: pos?.hknCt ?? null },
    angebot: { zahlungszielTage: zuschlagAngebot.zahlungszielTage, sicherheit: zuschlagAngebot.sicherheit, bindefristBis: zuschlagAngebot.bindefristBis },
    kunden,
    hinweis: "Die Daten dürfen nur für Abschluss und Abwicklung dieses Liefervertrags verwendet werden (Zweckbindung). Die Kunden haben der Weitergabe mit der Freigabe des Zuschlags zugestimmt.",
  };
}

// ================================================================ Energiekostenbericht

export async function kostenbericht(n, { jahr } = {}) {
  angemeldet(n);
  if (!n.rollen?.includes("unternehmen") || istAdmin(n)) throw verboten("Den Kostenbericht sehen Unternehmen für ihre eigenen Verträge.");
  const j = Number(jahr) >= 2020 && Number(jahr) <= 2100 ? Number(jahr) : Number(heute().slice(0, 4));
  const [meine, abr] = await Promise.all([energieDemo.energieMeine(n).catch(() => ({ vertraege: [] })), finanzenDemo.meineAbrechnungen(n, { jahr: j }).catch(() => null)]);
  const db = await lesen();
  const lg = (db.fach?.lastgaenge || []).filter((l) => l.nutzerId === n.id && l.analyse?.monate?.length === 12).sort((a, b) => String(b.am).localeCompare(String(a.am)))[0] || null;
  const netzMonate = lg ? lg.analyse.monate.map((m) => Number(m.kwh) || 0) : null;
  const vertraege = (meine.vertraege || []).map((x) => ({ id: x.id, lieferant: x.lieferantName || x.lieferant, beginn: x.beginn || "", vertragEnde: x.vertragEnde || "", energiepreisCt: Number.isFinite(x.energiepreisCt) ? x.energiepreisCt : vertragEnergiepreisCt(x), struktur: x.strukturLabel || x.struktur, jahresKwh: x.jahresKwh || null, status: x.status }));
  const pvMonate = (abr?.jahr === j ? abr?.contracting?.monate || [] : []).map((m) => ({ monat: m.monat, kwh: m.kwh, netto: m.netto }));
  const r = kostenreportRechnen({ jahr: j, vertraege, netzMonate, pvMonate });
  const u = nutzerById(db, n.id);
  return { ...r, kunde: { name: nameVon(db, n.id), firma: u?.firma || "" }, quelleNetz: lg ? `Lastgang „${lg.name || "Upload"}“ (Monatssummen, gemittelt über die Jahre des Uploads)` : "Jahresmenge laut Vertrag", jahre: [j - 2, j - 1, j, j + 1].filter((x) => x <= Number(heute().slice(0, 4)) + 1), vertraege };
}
