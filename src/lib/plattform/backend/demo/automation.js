// src/lib/plattform/backend/demo/automation.js
//
// Automationsregeln im Demo-Backend: Ausführung bei Ereignissen, Fristenprüfung, Testlauf
// („was würde passieren“ – auf einer Kopie der Datenbank, nichts wird gespeichert außer dem
// Protokolleintrag), Ausführungsprotokoll und Schleifenschutz. Bausteine: src/lib/plattform/automation.js.
//
// Statuswechsel laufen ausschließlich über den bestehenden Automaten (pruefeUebergang + uebergangAnwenden
// aus demo.js, als Backoffice). Folgeereignisse (z. B. Statuswechsel durch eine Aktion) lösen wiederum
// Regeln aus – begrenzt durch SCHLEIFE (Tiefe, einmal je Regel und Objekt je Kette, Drosselung je Stunde).

import * as v from "../../validierung";
import { nichtGefunden, ungueltig } from "../../fehler";
import { AUFGABE_BEZUG_ARTEN } from "../../konstanten";
import { pruefeUebergang, statusLabel } from "../../prozesse";
import { SCHLEIFE, ausloeserPasst, bedingungenPruefen, regelBereinigen, regelText } from "../../automation";
import { gebietFuer, slaStatus } from "../../akquise";
import { rendern } from "../../vorlagen";
import { stufe } from "../../rechte";
import { jetzt, neueId } from "./hilfen";
import { W, adminPfad, boAendern, boLesen, boSicher, eingangAm, erstkontaktAm, faktenFuer, info, kontaktVon, kontextFuer, kurzKonto, nameVon, nutzerVon, objektTitel, objektVon, portalPfad, rechtNoetig, tagSetzen, verwandte } from "./bo-kern";
import { vorlageAnwenden, vorlageVon } from "./vorlagen";

const AUTOMAT = { id: null, rollen: ["admin"], vorname: "Automation", nachname: "" };
const LOG_MAX = 1000;
const tagPlus = (tage) => new Date(Date.now() + tage * 86400e3).toLocaleDateString("sv-SE", { timeZone: "Europe/Vienna" });

let kette = null; // laufende Ereigniskette { id, tiefe, gefeuert:Set, testlauf }

function logEintrag(db, e) {
  const x = { id: neueId("AL"), am: jetzt(), ...e };
  db.bo.lauf.push(x);
  if (db.bo.lauf.length > LOG_MAX) db.bo.lauf.splice(0, db.bo.lauf.length - LOG_MAX);
  return x;
}

function istAktivesBackoffice(db, id) {
  const u = nutzerVon(db, id);
  return !!(u && u.aktiv && u.rollen.includes("admin"));
}

/** Zuständige Person für Aufgaben/Zuweisungen auflösen */
function zustaendigAufloesen(db, regel, art, o, wunsch) {
  const fakten = faktenFuer(db, art, o);
  const r = verwandte(db, art, o);
  if (wunsch && wunsch !== "zustaendig" && wunsch !== "gebiet" && istAktivesBackoffice(db, wunsch)) return { id: wunsch, grund: "fest" };
  if (wunsch === "gebiet") {
    const g = gebietFuer(db.bo.gebiete, fakten);
    if (g && istAktivesBackoffice(db, g.gebiet.mitarbeiterId)) return { id: g.gebiet.mitarbeiterId, grund: `Gebiet „${g.gebiet.name}“ (${g.grund})` };
  }
  const vorhanden = o.zustaendigId || r.flaeche?.zustaendigId || r.vorgang?.zustaendigId;
  if (vorhanden && istAktivesBackoffice(db, vorhanden)) return { id: vorhanden, grund: "bisher zuständig" };
  if (wunsch !== "gebiet") {
    const g = gebietFuer(db.bo.gebiete, fakten);
    if (g && istAktivesBackoffice(db, g.gebiet.mitarbeiterId)) return { id: g.gebiet.mitarbeiterId, grund: `Gebiet „${g.gebiet.name}“` };
  }
  if (istAktivesBackoffice(db, regel.erstelltVon)) return { id: regel.erstelltVon, grund: "Ersteller der Regel" };
  const leitung = db.nutzer.find((u) => u.aktiv && u.rollen.includes("admin") && stufe(u, "rechte") >= 2);
  return leitung ? { id: leitung.id, grund: "Leitung" } : null;
}

function aktionAusfuehren(db, regel, a, ereignis) {
  const { art } = ereignis;
  const o = ereignis.objekt;
  const r = verwandte(db, art, o);
  switch (a.typ) {
    case "zustaendig": {
      const z = zustaendigAufloesen(db, regel, art, o, a.mitarbeiterId);
      if (!z || (a.mitarbeiterId === "gebiet" && z.grund.indexOf("Gebiet") !== 0)) return { typ: a.typ, ok: false, text: "Kein passendes Gebiet mit aktiver Person gefunden." };
      const ziele = [o, art === "vorgang" ? r.flaeche : art === "flaeche" ? r.vorgang : null].filter(Boolean);
      for (const x of ziele) {
        x.zustaendigId = z.id;
        x.geaendertAm = jetzt();
      }
      W.protokoll(db, null, "zuweisen", art, o.id, `Zuständig: ${nameVon(db, z.id)} (Automation „${regel.name}“, ${z.grund})`);
      return { typ: a.typ, ok: true, text: `Zuständig: ${nameVon(db, z.id)} – ${z.grund}` };
    }
    case "aufgabe": {
      const z = zustaendigAufloesen(db, regel, art, o, a.zustaendig);
      if (!z) return { typ: a.typ, ok: false, text: "Keine zuständige Person gefunden." };
      const ktx = kontextFuer(db, art, o);
      const titel = v.text(rendern(a.titel, ktx).text, 160) || a.titel;
      const bezugArt = AUFGABE_BEZUG_ARTEN.includes(art) ? art : null;
      const auf = {
        id: neueId("AF"),
        titel,
        beschreibung: v.mehrzeilig(`${a.beschreibung ? `${rendern(a.beschreibung, ktx).text}\n` : ""}Automatisch angelegt durch Regel „${regel.name}“.`, 2000),
        faelligAm: tagPlus(a.faelligInTagen || 0),
        zustaendigId: z.id,
        bezugArt,
        bezugId: bezugArt ? o.id : null,
        status: "offen",
        erstelltVon: null,
        erstelltAm: jetzt(),
        erledigtAm: null,
        erledigtVon: null,
        erinnertAm: null,
        automationRegelId: regel.id,
      };
      db.aufgaben.push(auf);
      W.benachrichtigen?.(db, nutzerVon(db, z.id), { art: "aufgabe", titel: `Neue Aufgabe: ${titel}`, text: `Fällig ${auf.faelligAm.split("-").reverse().join(".")} · Automation „${regel.name}“`, link: "/portal/admin/aufgaben", objektArt: bezugArt, objektId: auf.bezugId });
      W.protokoll(db, null, "aufgabe", bezugArt || "aufgabe", bezugArt ? o.id : auf.id, `Aufgabe „${titel}“ angelegt (Automation „${regel.name}“, zuständig ${nameVon(db, z.id)})`);
      return { typ: a.typ, ok: true, text: `Aufgabe „${titel}“ für ${nameVon(db, z.id)}, fällig ${auf.faelligAm.split("-").reverse().join(".")}` };
    }
    case "mail":
    case "nachricht": {
      const vl = vorlageVon(db, a.vorlageId);
      if (!vl || vl.aktiv === false) return { typ: a.typ, ok: false, text: "Vorlage fehlt oder ist inaktiv." };
      const inhalt = vorlageAnwenden(db, vl, art, o);
      if (inhalt.unbekannt.length) return { typ: a.typ, ok: false, text: `Unbekannte Platzhalter: ${inhalt.unbekannt.join(", ")}` };
      if (a.typ === "nachricht") {
        if (!["vorgang", "flaeche", "projekt", "interesse"].includes(art)) return { typ: a.typ, ok: false, text: "Keine Nachricht an diesem Objekt möglich." };
        W.nachricht(db, { bezugArt: art, bezugId: o.id, vonId: null, vonAdmin: true, text: inhalt.text });
        W.protokoll(db, null, "vorlage_gesendet", art, o.id, `Nachricht aus Vorlage „${vl.name}“ (Automation „${regel.name}“)`);
        return { typ: a.typ, ok: true, text: `Portal-Nachricht „${vl.name}“ (v${vl.version})` };
      }
      let an = "";
      let anName = "";
      let nutzerId = null;
      if (a.an === "zustaendig") {
        const z = zustaendigAufloesen(db, regel, art, o, "zustaendig");
        const u = z && nutzerVon(db, z.id);
        if (u) [an, anName, nutzerId] = [u.email, nameVon(db, u.id), u.id];
      } else {
        const k = kontaktVon(db, art, o);
        if (k?.email) [an, anName, nutzerId] = [k.email, [k.vorname, k.nachname].filter(Boolean).join(" "), k.nutzerId || null];
      }
      if (!an) return { typ: a.typ, ok: false, text: "Keine E-Mail-Adresse für den Empfänger." };
      W.postausgangAnlegen(db, { an, anName, nutzerId, art: "vorlage", betreff: inhalt.betreff, text: inhalt.text, link: a.an === "zustaendig" ? adminPfad(art, o) : portalPfad(art, o), linkText: a.an === "zustaendig" ? "Im Backoffice öffnen" : "Zum Portal", hinweis: `Automatisch versendet (Regel „${regel.name}“, Vorlage „${vl.name}“ v${vl.version}).` });
      const k = kontaktVon(db, art, o);
      if (a.an !== "zustaendig" && k?.id) {
        db.bo.aktivitaeten.push({ id: neueId("KA"), kontaktId: k.id, organisationId: k.organisationId || null, typ: "email", betreff: v.text(inhalt.betreff, 160), text: v.mehrzeilig(inhalt.text, 3000), am: jetzt(), bezugArt: art, bezugId: o.id, vonId: null, system: true, aufgabeId: null, wiedervorlageAm: null, erstelltAm: jetzt(), vorlageId: vl.id, automatisch: true });
      }
      W.protokoll(db, null, "vorlage_gesendet", art, o.id, `E-Mail „${vl.name}“ an ${an} (Automation „${regel.name}“)`);
      return { typ: a.typ, ok: true, text: `E-Mail „${inhalt.betreff}“ an ${an}` };
    }
    case "tag": {
      tagSetzen(db, art, o.id, a.tag, true);
      return { typ: a.typ, ok: true, text: `Tag „${a.tag}“ gesetzt` };
    }
    case "prioritaet": {
      const f = art === "flaeche" ? o : r.flaeche;
      if (!f) return { typ: a.typ, ok: false, text: "Keine Fläche am Objekt." };
      info(db, "flaeche", f.id, true).prioritaet = a.wert;
      return { typ: a.typ, ok: true, text: `Priorität ${a.wert} für „${f.bezeichnung}“` };
    }
    case "status": {
      const extra = { kommentar: a.kommentar || `Automatisch (Regel „${regel.name}“).`, grund: a.kommentar || `Automatisch (Regel „${regel.name}“).` };
      if (art === "projekt" && a.nach === "veroeffentlicht" && o.provisionSatz) extra.provisionSatz = o.provisionSatz; // bereits vereinbarter Satz (z. B. Reservierung aufheben)
      const p = pruefeUebergang(art, o, a.nach, "admin", extra);
      if (!p.ok) return { typ: a.typ, ok: false, text: p.fehler };
      const von = o.status;
      W.uebergangAnwenden(db, AUTOMAT, art, o, a.nach, "admin", (p.uebergang.pflicht || []).includes("grund") ? extra : { kommentar: extra.kommentar, ...(extra.provisionSatz ? { provisionSatz: extra.provisionSatz } : {}) }, "");
      return { typ: a.typ, ok: true, text: `Status „${statusLabel(art, von)}“ → „${statusLabel(art, a.nach)}“` };
    }
    default:
      return { typ: a.typ, ok: false, text: "Unbekannte Aktion." };
  }
}

/**
 * Ereignis verarbeiten: passende aktive Regeln auswerten und ausführen.
 * ereignis = { typ, art, objekt, von?, nach?, frist?, extra? }
 */
export function automationAusfuehren(db, ereignis, { nurRegeln = null, testlauf = false } = {}) {
  boSicher(db);
  const o = ereignis.objekt;
  if (!o?.id) return [];
  const regeln = nurRegeln || db.bo.regeln.filter((r) => r.aktiv);
  const kandidaten = regeln.filter((r) => ausloeserPasst(r, ereignis));
  if (!kandidaten.length) return [];
  const aussen = !kette;
  if (aussen) kette = { id: neueId("AK"), tiefe: 0, gefeuert: new Set(), testlauf };
  const ergebnisse = [];
  kette.tiefe++;
  try {
    for (const regel of kandidaten) {
      const basis = { regelId: regel.id, regelName: regel.name, ausloeser: ereignis.typ, art: ereignis.art, objektId: o.id, objektTitel: objektTitel(db, ereignis.art, o), tiefe: kette.tiefe, kette: kette.id, testlauf: kette.testlauf };
      const fakten = faktenFuer(db, ereignis.art, o, ereignis.extra || {});
      const pruef = bedingungenPruefen(regel, fakten);
      const bedingungen = pruef.ergebnisse.map((x) => ({ feld: x.bedingung.feld, op: x.bedingung.op, wert: x.bedingung.wert, ist: x.istWert, erfuellt: x.erfuellt }));
      if (!pruef.passt) {
        ergebnisse.push(logEintrag(db, { ...basis, status: "nicht_erfuellt", bedingungen, aktionen: [] }));
        continue;
      }
      const schluessel = `${regel.id}|${ereignis.art}:${o.id}`;
      if (kette.tiefe > SCHLEIFE.tiefe || kette.gefeuert.has(schluessel)) {
        ergebnisse.push(logEintrag(db, { ...basis, status: "schleife", bedingungen, aktionen: [], text: kette.tiefe > SCHLEIFE.tiefe ? `Maximale Kettentiefe ${SCHLEIFE.tiefe} erreicht – abgebrochen.` : "Regel hat in dieser Ereigniskette an diesem Objekt schon ausgelöst – Schleife verhindert." }));
        continue;
      }
      const stunde = Date.now() - 3600e3;
      const zuletzt = db.bo.lauf.filter((x) => x.status === "ausgefuehrt" && !x.testlauf && `${x.regelId}|${x.art}:${x.objektId}` === schluessel && new Date(x.am).getTime() > stunde).length;
      if (!kette.testlauf && zuletzt >= SCHLEIFE.proStunde) {
        ergebnisse.push(logEintrag(db, { ...basis, status: "gedrosselt", bedingungen, aktionen: [], text: `Mehr als ${SCHLEIFE.proStunde} Ausführungen pro Stunde an diesem Objekt – gedrosselt.` }));
        continue;
      }
      kette.gefeuert.add(schluessel);
      const aktionen = [];
      for (const a of regel.aktionen) {
        try {
          aktionen.push(aktionAusfuehren(db, regel, a, ereignis));
        } catch (e) {
          aktionen.push({ typ: a.typ, ok: false, text: e?.message || "Fehler" });
        }
      }
      const fehler = aktionen.some((x) => !x.ok);
      if (!kette.testlauf) {
        const echt = db.bo.regeln.find((x) => x.id === regel.id);
        if (echt) echt.zaehler = { ausgefuehrt: (echt.zaehler?.ausgefuehrt || 0) + 1, zuletzt: jetzt() };
      }
      ergebnisse.push(logEintrag(db, { ...basis, status: fehler ? "teilweise" : "ausgefuehrt", bedingungen, aktionen }));
    }
  } finally {
    kette.tiefe--;
    if (aussen) kette = null;
  }
  return ergebnisse;
}

// ---------------------------------------------------------------- Fristen

const TAG_MS = 86400e3;

/** Fristen prüfen und Regeln „Frist überschritten“ je Objekt einmalig auslösen. Liefert Anzahl Ereignisse. */
export function fristenPruefenIntern(db) {
  boSicher(db);
  const regeln = db.bo.regeln.filter((r) => r.aktiv && r.ausloeser.typ === "frist");
  let anzahl = 0;
  const feuern = (regel, art, o, schluesselZusatz = "") => {
    const k = `${regel.id}|${art}:${o.id}${schluesselZusatz}`;
    if (db.bo.fristen[k]) return;
    db.bo.fristen[k] = jetzt();
    automationAusfuehren(db, { typ: "frist", frist: regel.ausloeser.frist, art, objekt: o }, { nurRegeln: [regel] });
    anzahl++;
  };
  for (const regel of regeln) {
    const a = regel.ausloeser;
    const art = a.art || "flaeche";
    const sammlung = { vorgang: db.vorgaenge, flaeche: db.flaechen, projekt: db.projekte, interesse: db.interessen, provision: db.provisionen }[art] || [];
    if (a.frist === "sla_erstkontakt") {
      for (const o of sammlung) {
        const offen = art === "vorgang" ? o.status === "eingegangen" : ["eingegangen", "vorpruefung"].includes(o.status);
        if (!offen) continue;
        const ein = eingangAm(db, art, o);
        if (!ein || Date.now() - new Date(ein).getTime() > 90 * TAG_MS) continue;
        const sla = slaStatus(ein, erstkontaktAm(db, art, o, ein));
        if (sla.status === "ueberfaellig") feuern(regel, art, o);
      }
    } else if (a.frist === "status_dauer") {
      for (const o of sammlung) {
        if (o.status !== a.status) continue;
        const seit = (o.statusVerlauf || []).filter((e) => e.status === o.status).pop()?.am || o.erstelltAm;
        if (Date.now() - new Date(seit).getTime() > a.tage * TAG_MS) feuern(regel, art, o, `|${seit}`);
      }
    } else if (a.frist === "aufgabe_ueberfaellig") {
      const heute = tagPlus(0);
      for (const t of db.aufgaben) {
        if (t.status !== "offen" || !t.faelligAm || t.faelligAm >= heute || t.bezugArt !== art) continue;
        const o = objektVon(db, art, t.bezugId);
        if (o) feuern(regel, art, o, `|${t.id}`);
      }
    }
  }
  return anzahl;
}

// ---------------------------------------------------------------- Operationen

function regelAusgabe(db, r) {
  const vorlagenNamen = Object.fromEntries(db.bo.vorlagen.map((x) => [x.id, x.name]));
  const konten = Object.fromEntries(db.nutzer.filter((u) => u.rollen.includes("admin")).map((u) => [u.id, nameVon(db, u.id)]));
  const letzte = db.bo.lauf.filter((x) => x.regelId === r.id && !x.testlauf).slice(-1)[0] || null;
  return { ...r, erstelltVonName: nameVon(db, r.erstelltVon), beschreibungKurz: regelText(r, { vorlagen: vorlagenNamen, konten }), letzterLauf: letzte ? { am: letzte.am, status: letzte.status, objektTitel: letzte.objektTitel } : null };
}

/** Fristen prüfen, aber nur schreiben, wenn wirklich eine Frist auslöst (Probe auf einer Kopie) */
export async function fristenBeiBedarf() {
  const probe = await boLesen();
  if (!probe.bo.regeln.some((r) => r.aktiv && r.ausloeser.typ === "frist")) return 0;
  if (!fristenPruefenIntern(structuredClone(probe))) return 0;
  return boAendern((db) => fristenPruefenIntern(db));
}

export async function automationen(n, { protokollLimit = 200, regelId } = {}) {
  rechtNoetig(n, "automationen", 1);
  await fristenBeiBedarf();
  const db = await boLesen();
  let lauf = db.bo.lauf;
  if (regelId) lauf = lauf.filter((x) => x.regelId === regelId);
  return {
    regeln: db.bo.regeln.map((r) => regelAusgabe(db, r)),
    protokoll: lauf.slice(-Math.min(1000, protokollLimit)).reverse(),
    vorlagen: db.bo.vorlagen.map((x) => ({ id: x.id, name: x.name, kanal: x.kanal, aktiv: x.aktiv !== false })),
    konten: db.nutzer.filter((u) => u.aktiv && u.rollen.includes("admin")).map(kurzKonto),
    gebiete: db.bo.gebiete.length,
    statistik: {
      ausgefuehrt24h: db.bo.lauf.filter((x) => x.status === "ausgefuehrt" && !x.testlauf && Date.now() - new Date(x.am).getTime() < TAG_MS).length,
      fehler24h: db.bo.lauf.filter((x) => x.status === "teilweise" && Date.now() - new Date(x.am).getTime() < TAG_MS).length,
      schleifen: db.bo.lauf.filter((x) => x.status === "schleife").length,
    },
  };
}

function regelPruefenGegenDb(db, regel) {
  for (const a of regel.aktionen) {
    if ((a.typ === "mail" || a.typ === "nachricht") && !vorlageVon(db, a.vorlageId)) throw ungueltig("Die gewählte Vorlage gibt es nicht.");
    if ((a.typ === "mail" || a.typ === "nachricht") && vorlageVon(db, a.vorlageId).kanal !== (a.typ === "mail" ? "email" : "nachricht")) throw ungueltig(a.typ === "mail" ? "Für E-Mails bitte eine E-Mail-Vorlage wählen." : "Für Portal-Nachrichten bitte eine Nachrichten-Vorlage wählen.");
    if (a.typ === "zustaendig" && a.mitarbeiterId !== "gebiet") v.pflicht(istAktivesBackoffice(db, a.mitarbeiterId), "Zuständig kann nur ein aktives Backoffice-Konto sein.");
    if (a.typ === "aufgabe" && !["zustaendig", "gebiet"].includes(a.zustaendig)) v.pflicht(istAktivesBackoffice(db, a.zustaendig), "Aufgabe: Zuständig kann nur ein aktives Backoffice-Konto sein.");
  }
}

export async function automationSpeichern(n, id, roh = {}) {
  rechtNoetig(n, "automationen", 2);
  const { regel, fehler } = regelBereinigen(roh);
  if (fehler) throw ungueltig(fehler);
  return boAendern((db) => {
    regelPruefenGegenDb(db, regel);
    const alt = id ? db.bo.regeln.find((x) => x.id === id) : null;
    if (id && !alt) throw nichtGefunden("Regel nicht gefunden.");
    if (alt) {
      Object.assign(alt, regel, { geaendertAm: jetzt(), geaendertVon: n.id });
      W.protokoll(db, n, "automation", "regel", alt.id, `Regel „${regel.name}“ geändert (${regel.aktiv ? "aktiv" : "inaktiv"})`);
      return regelAusgabe(db, alt);
    }
    const neu = { id: neueId("R"), ...regel, erstelltVon: n.id, erstelltAm: jetzt(), geaendertAm: jetzt(), zaehler: { ausgefuehrt: 0, zuletzt: null } };
    db.bo.regeln.push(neu);
    W.protokoll(db, n, "automation", "regel", neu.id, `Regel „${regel.name}“ angelegt (${regel.aktiv ? "aktiv" : "inaktiv"})`);
    return regelAusgabe(db, neu);
  });
}

export async function automationLoeschen(n, id) {
  rechtNoetig(n, "automationen", 2);
  return boAendern((db) => {
    const r = db.bo.regeln.find((x) => x.id === id);
    if (!r) throw nichtGefunden("Regel nicht gefunden.");
    db.bo.regeln = db.bo.regeln.filter((x) => x.id !== id);
    W.protokoll(db, n, "automation", "regel", id, `Regel „${r.name}“ gelöscht`);
    return { ok: true };
  });
}

/**
 * Testlauf: Mit Objekt → Regel auf einer Kopie der Datenbank ausführen (inkl. Folgeregeln) und zeigen,
 * was passieren würde. Ohne Objekt → Rückblick: auf welche der letzten 50 Objekte hätte die Regel gegriffen.
 */
export async function automationTestlauf(n, { regel: roh, regelId, bezugArt, bezugId, score, kategorie } = {}) {
  rechtNoetig(n, "automationen", 1);
  const db0 = await boLesen();
  let regel;
  if (regelId) {
    regel = db0.bo.regeln.find((x) => x.id === regelId);
    if (!regel) throw nichtGefunden("Regel nicht gefunden.");
  } else {
    const r = regelBereinigen(roh || {});
    if (r.fehler) throw ungueltig(r.fehler);
    regel = { id: "R-TESTLAUF", erstelltVon: n.id, ...r.regel };
    regelPruefenGegenDb(db0, regel);
  }
  const a = regel.ausloeser;
  const art = a.art || bezugArt || "vorgang";
  const extra = {};
  if (score !== undefined && score !== "") extra.score = v.zahl(score, { min: 0, max: 100 });
  if (kategorie) extra.kategorie = v.text(kategorie, 20);
  if (!bezugId) {
    const sammlung = { vorgang: db0.vorgaenge, flaeche: db0.flaechen, projekt: db0.projekte, interesse: db0.interessen, provision: db0.provisionen }[art] || [];
    const liste = [...sammlung].sort((x, y) => String(y.erstelltAm).localeCompare(String(x.erstelltAm))).slice(0, 50);
    const treffer = liste.map((o) => {
      const p = bedingungenPruefen(regel, faktenFuer(db0, art, o, extra));
      return { id: o.id, titel: objektTitel(db0, art, o), status: statusLabel(art, o.status), passt: p.passt, bedingungen: p.ergebnisse.map((x) => ({ feld: x.bedingung.feld, ist: x.istWert, erfuellt: x.erfuellt })) };
    });
    return { modus: "rueckblick", art, geprueft: treffer.length, treffer: treffer.filter((t) => t.passt).length, objekte: treffer };
  }
  const o0 = objektVon(db0, art, v.kennung(bezugId));
  if (!o0) throw nichtGefunden("Objekt nicht gefunden.");
  // Auf einer Kopie ausführen – nichts davon wird gespeichert
  const kopie = structuredClone(db0);
  const o = objektVon(kopie, art, o0.id);
  const vorher = { aufgaben: kopie.aufgaben.length, postausgang: (kopie.postausgang || []).length, nachrichten: kopie.nachrichten.length, status: o.status, zustaendigId: o.zustaendigId, tags: [...(info(kopie, art, o.id).tags || [])] };
  const ereignis = { typ: a.typ, art, objekt: o, frist: a.frist, nach: a.nach || o.status, von: a.von || (o.statusVerlauf || []).slice(-2)[0]?.status, extra };
  const nurRegeln = regelId ? [kopie.bo.regeln.find((x) => x.id === regelId)] : [regel];
  const laufVorher = kopie.bo.lauf.length;
  automationAusfuehren(kopie, ereignis, { nurRegeln, testlauf: true });
  const protokoll = kopie.bo.lauf.slice(laufVorher);
  const aenderungen = {
    aufgaben: kopie.aufgaben.slice(vorher.aufgaben).map((x) => ({ titel: x.titel, faelligAm: x.faelligAm, zustaendig: nameVon(kopie, x.zustaendigId) })),
    mails: (kopie.postausgang || []).slice(0, (kopie.postausgang || []).length - vorher.postausgang).map((m) => ({ an: m.an, betreff: m.betreff, text: m.text })),
    nachrichten: kopie.nachrichten.slice(vorher.nachrichten).map((m) => ({ bezug: `${m.bezugArt}:${m.bezugId}`, text: m.text })),
    status: o.status !== vorher.status ? { von: statusLabel(art, vorher.status), nach: statusLabel(art, o.status) } : null,
    zustaendig: o.zustaendigId !== vorher.zustaendigId ? nameVon(kopie, o.zustaendigId) : null,
    tags: (info(kopie, art, o.id).tags || []).filter((t) => !vorher.tags.includes(t)),
  };
  await boAendern((db) => {
    logEintrag(db, { regelId: regel.id, regelName: regel.name, ausloeser: a.typ, art, objektId: o0.id, objektTitel: objektTitel(db, art, o0), tiefe: 0, kette: null, testlauf: true, status: "testlauf", bedingungen: protokoll[0]?.bedingungen || [], aktionen: protokoll.flatMap((x) => x.aktionen || []), text: `Testlauf von ${nameVon(db, n.id)} – nichts wurde ausgeführt.` });
  });
  return { modus: "objekt", art, objekt: { id: o0.id, titel: objektTitel(db0, art, o0), status: statusLabel(art, o0.status) }, protokoll, aenderungen };
}

/** Fristen jetzt prüfen (sonst automatisch beim Öffnen von Automationen/Akquise, in Frappe täglich) */
export async function fristenPruefen(n) {
  rechtNoetig(n, "automationen", 2);
  return boAendern((db) => ({ ok: true, ausgeloest: fristenPruefenIntern(db) }));
}

/** Tag an einem Objekt setzen/entfernen (Recht: Bereich des Objekts, schreiben) */
export async function objektTagSetzen(n, { art, id, tag, an = true } = {}) {
  const BEREICH = { vorgang: "vorgaenge", flaeche: "akquise", projekt: "projekte", interesse: "interessen" };
  v.pflicht(BEREICH[art], "Unbekannte Objektart.");
  rechtNoetig(n, BEREICH[art], 2);
  const t = v.text(tag, 40);
  v.pflicht(t.length >= 2, "Tag: mind. 2 Zeichen.");
  return boAendern((db) => {
    const o = objektVon(db, art, v.kennung(id));
    if (!o) throw nichtGefunden();
    const tags = tagSetzen(db, art, o.id, t, an !== false);
    W.protokoll(db, n, "tag", art, o.id, `Tag ${an !== false ? "gesetzt" : "entfernt"}: ${t}`);
    return { ok: true, tags };
  });
}

