// src/lib/plattform/backend/demo/akquise-kampagne.js
//
// Akquise-Kampagnen im Demo-Backend (Ausbaustufe A1b). Daten unter `db.akq` = { kampagnen, ziele, sperrliste }.
//   Kampagne → Ziele (Kandidatenflächen) → Empfänger (ermittelte Eigentümer, je ein Einmalcode)
//   Aufgabenkette: Kampagne starten → je Ziel Aufgabe „Grundbuchabfrage“ mit Kostenschätzung → Ergebnis manuell erfassen
//   (Empfänger) → Serienbrief (PDF) + Versandliste → Versand bestätigen → Rücklauf (Aufrufe, Anfragen, Termine) →
//   Nachfassstufen (nach X Tagen ohne Reaktion: Aufgabe „zweiter Brief“ bzw. „Anruf nur mit Einwilligung“)
//   Sperrliste: Widerspruch → Personen- und Flurstücks-Sperre über ALLE Kampagnen (nur Hashwerte + maskierte Anzeige)
// Rechte: Backoffice-Bereich „geodaten“ (Leitung, Akquise); Änderungen zusätzlich „akquise“ schreiben. Öffentlich nur
// die Angebotsseite per Einmalcode (angebot*), ohne Eigentümerdaten.

import * as v from "../../validierung";
import { PlattformFehler, konflikt, nichtGefunden, ungueltig } from "../../fehler";
import { unterrollen } from "../../rechte";
import {
  EMPFAENGER_STATUS, KAMPAGNE_STATUS, NACHFASS_ARTEN, SPERR_GRUENDE, SPERR_QUELLEN, ZIEL_STATUS, codeErzeugen, codeNormalisieren, flurstueckSchluessel,
  grundbuchSchaetzung, kampagnenKennzahlen, nachfassBereinigen, nachfassFaellig, pachtspanne, personMaskiert, personSchluessel,
} from "../../akquise-kampagne";
import { jetzt, neueId, sha256 } from "./hilfen";
import { W, boAendern, boLesen, nameVon, rechtNoetig } from "./bo-kern";

const PFEFFER = () => process.env.SPERRLISTE_PFEFFER || "oekoinvest-sperrliste-demo"; // im Betrieb geheim setzen
const hash = (s) => sha256(`${PFEFFER()}|${s}`);
const plusTage = (tage) => new Date(Date.now() + tage * 86400e3).toISOString().slice(0, 10);

function akqSicher(db) {
  db.akq = db.akq || {};
  db.akq.kampagnen = db.akq.kampagnen || [];
  db.akq.ziele = db.akq.ziele || [];
  db.akq.sperrliste = db.akq.sperrliste || [];
  return db.akq;
}
const leer = { kampagnen: [], ziele: [], sperrliste: [] };

function schreibRecht(n) {
  rechtNoetig(n, "geodaten", 2);
  rechtNoetig(n, "akquise", 2);
}
const istLeitung = (n) => unterrollen(n).includes("leitung");

function kampagneVon(akq, id) {
  const k = akq.kampagnen.find((x) => x.id === v.kennung(id));
  if (!k) throw nichtGefunden("Kampagne nicht gefunden.");
  return k;
}
function zielVon(akq, id) {
  const z = akq.ziele.find((x) => x.id === v.kennung(id));
  if (!z) throw nichtGefunden("Zielfläche nicht gefunden.");
  return z;
}
const zieleVon = (akq, kampagneId) => akq.ziele.filter((z) => z.kampagneId === kampagneId);

// ---------------------------------------------------------------- Sperrliste

function personGesperrt(akq, person) {
  const h = hash(personSchluessel(person));
  return akq.sperrliste.find((s) => s.aktiv !== false && s.personHash === h) || null;
}
function flurstueckGesperrt(akq, land, p) {
  const h = hash(flurstueckSchluessel(land, p.kgNr, p.gstNr));
  return akq.sperrliste.find((s) => s.aktiv !== false && (s.flurstueckHashes || []).includes(h)) || null;
}

function sperreEintragen(db, n, { person, land, flurstuecke = [], grund = "widerspruch", quelle = "brief", kampagneId = null, zielId = null, notiz = "" }) {
  const akq = akqSicher(db);
  const personHash = person ? hash(personSchluessel(person)) : null;
  const vorhanden = personHash ? akq.sperrliste.find((s) => s.aktiv !== false && s.personHash === personHash) : null;
  const fHashes = flurstuecke.map((p) => hash(flurstueckSchluessel(land, p.kgNr, p.gstNr)));
  if (vorhanden) {
    vorhanden.flurstueckHashes = [...new Set([...(vorhanden.flurstueckHashes || []), ...fHashes])];
    return vorhanden;
  }
  const s = {
    id: neueId("SP"),
    personHash,
    anzeige: person ? personMaskiert(person) : `${flurstuecke.length} Flurstück(e)`,
    flurstueckHashes: fHashes,
    land: land || null,
    grund: v.auswahl(grund, SPERR_GRUENDE, "widerspruch"),
    quelle: v.auswahl(quelle, SPERR_QUELLEN, "brief"),
    notiz: v.text(notiz, 300),
    kampagneId,
    zielId,
    am: jetzt(),
    vonId: n?.id || null,
    aktiv: true,
  };
  akq.sperrliste.push(s);
  W.protokoll(db, n || null, "sperrliste", "sperrliste", s.id, `Sperrvermerk (${SPERR_GRUENDE[s.grund]}, ${SPERR_QUELLEN[s.quelle]}) – ${s.anzeige}`);
  // Sofort in allen Kampagnen wirksam: betroffene Empfänger sperren, Codes deaktivieren
  for (const z of akq.ziele) {
    for (const e of z.empfaenger || []) {
      if (e.gesperrt) continue;
      // Bestehende Empfänger: nur dieselbe Person (Miteigentümer bleiben ansprechbar); Flurstücks-Sperre wirkt bei neuen Kampagnen
      if (personHash && e.sperrHash === personHash) {
        e.gesperrt = true;
        e.gesperrtGrund = SPERR_GRUENDE[s.grund];
        e.codeAktiv = false;
        if (s.grund === "widerspruch" && !e.widerspruchAm) e.widerspruchAm = s.am;
        e.status = "widerspruch";
      }
    }
    if ((z.empfaenger || []).length && z.empfaenger.every((e) => e.gesperrt)) z.status = "gesperrt";
  }
  return s;
}

// ---------------------------------------------------------------- Nachfassen (Automationsregeln der Kampagne)

function nachfassIntern(db, heute = jetzt()) {
  const akq = akqSicher(db);
  let neu = 0;
  for (const k of akq.kampagnen.filter((x) => x.status === "aktiv")) {
    for (const z of zieleVon(akq, k.id)) {
      for (const e of z.empfaenger || []) {
        for (const f of nachfassFaellig(k, e, heute)) {
          e.nachfass = e.nachfass || {};
          const eintrag = { am: jetzt(), ergebnis: f.ergebnis, grund: f.grund, aufgabeId: null };
          if (f.ergebnis === "aufgabe") {
            db.aufgaben = db.aufgaben || [];
            const zweiter = f.stufe.art === "zweiter_brief";
            const a = {
              id: neueId("AF"),
              titel: zweiter ? `Zweiten Brief senden (einmalig): ${z.gemeinde} · ${personMaskiert(e)}` : `Anruf (Einwilligung liegt vor): ${z.gemeinde} · ${personMaskiert(e)}`,
              beschreibung: [
                `Kampagne ${k.name} (${k.id}), Zielfläche ${z.id}: ${f.stufe.nachTagen} Tage ohne Reaktion auf den Brief vom ${String(e.briefe?.[0]?.am || "").slice(0, 10)}.`,
                zweiter
                  ? "Zweitbrief über „Serienbrief → Stufe 2“ erzeugen und den Versand bestätigen. Kein weiterer Brief danach; bei Widerspruch sofort Sperrliste."
                  : `Einwilligung Telefon vom ${String(e.einwilligungTelefon?.am || "").slice(0, 10)} (${e.einwilligungTelefon?.quelle || "–"}). Nur im Rahmen dieser Einwilligung anrufen; Ergebnis in der Kampagne erfassen.`,
                `Link: /portal/admin/akquise/kampagnen/${k.id}`,
              ].join("\n"),
              faelligAm: plusTage(3),
              zustaendigId: k.zustaendigId || k.erstelltVon,
              bezugArt: null,
              bezugId: null,
              kampagneId: k.id,
              kampagnenZielId: z.id,
              status: "offen",
              erstelltVon: null,
              erstelltAm: jetzt(),
              erledigtAm: null,
              erledigtVon: null,
              erinnertAm: null,
              quelle: "kampagne_nachfassen",
            };
            db.aufgaben.push(a);
            eintrag.aufgabeId = a.id;
          }
          e.nachfass[f.stufe.id] = eintrag;
          neu++;
        }
      }
    }
  }
  return neu;
}

/** Nachfassen nur schreiben, wenn etwas fällig ist (Probe auf Kopie) – wird beim Lesen der Kampagnen ausgelöst */
async function nachfassenBeiBedarf() {
  const db = await boLesen();
  if (!db.akq?.kampagnen?.some((k) => k.status === "aktiv")) return 0;
  if (!nachfassIntern(structuredClone(db))) return 0;
  return boAendern((d) => nachfassIntern(d));
}

export async function kampagnenNachfassen(n) {
  schreibRecht(n);
  const neu = await boAendern((db) => nachfassIntern(db));
  return { ok: true, ausgeloest: neu };
}

/** Für Cron/Scheduler ohne Nutzer (Frappe: scheduler_events daily) */
export async function kampagnenNachfassenSystem() {
  return boAendern((db) => nachfassIntern(db));
}

// ---------------------------------------------------------------- Ausgabe

function empfaengerAusgabe(e) {
  return { ...e, sperrHash: undefined, anzeige: personMaskiert(e), statusLabel: EMPFAENGER_STATUS[e.status] || e.status };
}
function zielAusgabe(z, { mitEmpfaengern = true } = {}) {
  return { ...z, geometrie: undefined, statusLabel: ZIEL_STATUS[z.status] || z.status, empfaenger: mitEmpfaengern ? (z.empfaenger || []).map(empfaengerAusgabe) : undefined, empfaengerAnzahl: (z.empfaenger || []).length };
}
function kampagneAusgabe(db, k) {
  const ziele = zieleVon(db.akq || leer, k.id);
  return { ...k, statusLabel: KAMPAGNE_STATUS[k.status], erstelltVonName: nameVon(db, k.erstelltVon), zustaendigName: nameVon(db, k.zustaendigId), kennzahlen: kampagnenKennzahlen(k, ziele) };
}

export async function kampagnen(n) {
  rechtNoetig(n, "geodaten", 1);
  await nachfassenBeiBedarf();
  const db = await boLesen();
  const akq = db.akq || leer;
  return { kampagnen: [...akq.kampagnen].reverse().map((k) => kampagneAusgabe(db, k)), sperrlisteAnzahl: akq.sperrliste.filter((s) => s.aktiv !== false).length };
}

export async function kampagne(n, id) {
  rechtNoetig(n, "geodaten", 1);
  await nachfassenBeiBedarf();
  const db = await boLesen();
  const akq = db.akq || leer;
  const k = kampagneVon(akq, id);
  const ziele = zieleVon(akq, k.id);
  const aufgaben = (db.aufgaben || []).filter((a) => a.kampagneId === k.id).map((a) => ({ id: a.id, titel: a.titel, status: a.status, faelligAm: a.faelligAm, kampagnenZielId: a.kampagnenZielId, zustaendig: nameVon(db, a.zustaendigId) }));
  return { kampagne: kampagneAusgabe(db, k), ziele: ziele.map((z) => zielAusgabe(z)), aufgaben, vorlagen: (db.bo?.vorlagen || []).filter((x) => x.aktiv !== false).map((x) => ({ id: x.id, name: x.name })) };
}

// ---------------------------------------------------------------- Anlegen / Ändern

function zielAusKandidat(k, kampagneId, akq) {
  const land = k.land || "AT";
  const parzellen = (k.parzellen || []).slice(0, 60).map((p) => ({ id: v.text(p.id, 60), kg: v.text(p.kg, 80), kgNr: v.text(p.kgNr, 12), gstNr: v.text(p.gstNr, 24), ha: v.zahl(p.ha, { min: 0, max: 100000, stellen: 4 }) }));
  const gesperrteFs = parzellen.filter((p) => flurstueckGesperrt(akq, land, p));
  return {
    id: neueId("KZ"),
    kampagneId,
    kandidatId: v.text(k.id, 80),
    demo: !!k.demo,
    land,
    bundesland: v.text(k.bundesland, 60),
    bezirk: v.text(k.bezirk, 80),
    gemeinde: v.text(k.gemeinde, 80),
    ha: v.zahl(k.ha, { min: 0, max: 100000, stellen: 2 }) || 0,
    mwp: v.zahl(k.mwp, { min: 0, max: 100000, stellen: 1 }) || 0,
    score: v.zahl(k.score, { min: 0, max: 100 }) || 0,
    ampel: v.auswahl(k.ampel, ["gruen", "gelb", "rot"], "gelb"),
    prioritaet: v.auswahl(k.prioritaet, ["A", "B", "C"], "C"),
    parzellen,
    netz: k.netz ? { name: v.text(k.netz.knoten?.name, 120), art: v.text(k.netz.knoten?.art, 10), trasseM: v.zahl(k.netz.trasseM, { min: 0 }), kostenMin: v.zahl(k.netz.kosten?.min, { min: 0 }), kostenMax: v.zahl(k.netz.kosten?.max, { min: 0 }) } : null,
    kulisse: k.merkmale?.kulisse || null,
    widmungText: v.text(k.widmung?.text, 600),
    schwerpunkt: Array.isArray(k.schwerpunkt) ? k.schwerpunkt.slice(0, 2).map(Number) : null,
    geometrie: k.geometrie && JSON.stringify(k.geometrie).length < 200000 ? k.geometrie : null,
    pacht: pachtspanne(k.ha, k.ampel),
    status: gesperrteFs.length && gesperrteFs.length === parzellen.length ? "gesperrt" : "offen",
    gesperrteFlurstuecke: gesperrteFs.map((p) => p.id),
    grundbuch: { schaetzung: grundbuchSchaetzung(land, parzellen.length - gesperrteFs.length), aufgabeId: null, status: "offen", kostenIst: null, ergebnisAm: null },
    empfaenger: [],
    gesichertHa: null,
    notizen: [],
    erstelltAm: jetzt(),
  };
}

/**
 * Kampagne anlegen. `kandidaten` kommen serverseitig aus dem Geodaten-Adapter (nie vom Browser).
 * daten: { name, beschreibung, quelle: { art, filter, gemeinde }, test }
 */
export async function kampagneAnlegen(n, kandidaten = [], daten = {}) {
  schreibRecht(n);
  const name = v.text(daten.name, 120);
  v.pflicht(name.length >= 3, "Bitte einen Namen für die Kampagne angeben (mind. 3 Zeichen).");
  v.pflicht(Array.isArray(kandidaten) && kandidaten.length, "Die Auswahl enthält keine Kandidatenflächen.");
  v.pflicht(kandidaten.length <= 300, "Höchstens 300 Flächen je Kampagne.");
  const laender = [...new Set(kandidaten.map((k) => k.land || "AT"))];
  v.pflicht(laender.length === 1, "Eine Kampagne umfasst Flächen aus genau einem Land (Rechtslage, Brieftext, Kosten).");
  const test = daten.test === true;
  if (test) v.pflicht(istLeitung(n), "Testkampagnen darf nur die Leitung anlegen.");
  return boAendern((db) => {
    const akq = akqSicher(db);
    const k = {
      id: neueId("KA"),
      name,
      beschreibung: v.mehrzeilig(daten.beschreibung, 1000),
      land: laender[0],
      status: "entwurf",
      quelle: { art: v.auswahl(daten.quelle?.art, ["auswahl", "filter", "gemeinde"], "auswahl"), gemeinde: v.text(daten.quelle?.gemeinde, 80), filter: daten.quelle?.filter && typeof daten.quelle.filter === "object" ? JSON.parse(JSON.stringify(daten.quelle.filter).slice(0, 2000)) : null },
      nachfass: nachfassBereinigen(daten.nachfass, laender[0]),
      kosten: { porto: null, druck: null, sonstige: 0 },
      vorlageId: null,
      test,
      demo: kandidaten.some((x) => x.demo),
      zustaendigId: n.id,
      erstelltVon: n.id,
      erstelltAm: jetzt(),
      gestartetAm: null,
    };
    const doppelt = new Set(akq.ziele.filter((z) => akq.kampagnen.some((x) => x.id === z.kampagneId && x.status !== "abgeschlossen")).map((z) => z.kandidatId));
    const ziele = kandidaten.map((c) => ({ ...zielAusKandidat(c, k.id, akq), auchInAndererKampagne: doppelt.has(c.id) }));
    akq.kampagnen.push(k);
    akq.ziele.push(...ziele);
    W.protokoll(db, n, "anlegen", "kampagne", k.id, `Akquise-Kampagne „${name}“ mit ${ziele.length} Zielflächen angelegt${test ? " (Test)" : ""}`);
    return { kampagne: kampagneAusgabe(db, k), ziele: ziele.length, gesperrt: ziele.filter((z) => z.status === "gesperrt").length };
  });
}

export async function kampagneAendern(n, id, daten = {}) {
  schreibRecht(n);
  return boAendern((db) => {
    const akq = akqSicher(db);
    const k = kampagneVon(akq, id);
    if (daten.name !== undefined) {
      const name = v.text(daten.name, 120);
      v.pflicht(name.length >= 3, "Name: mind. 3 Zeichen.");
      k.name = name;
    }
    if (daten.beschreibung !== undefined) k.beschreibung = v.mehrzeilig(daten.beschreibung, 1000);
    if (daten.nachfass !== undefined) {
      k.nachfass = nachfassBereinigen(daten.nachfass, k.land);
      if (k.land === "AT" && k.nachfass.some((s) => s.art === "zweiter_brief" && s.aktiv)) k.hinweisAt = "Österreich: Die DSB hält eine EINMALIGE Zusendung für zulässig – ein zweiter Brief nur nach rechtlicher Prüfung.";
    }
    if (daten.kosten && typeof daten.kosten === "object") {
      for (const f of ["porto", "druck", "sonstige"]) if (daten.kosten[f] !== undefined) k.kosten[f] = v.zahl(daten.kosten[f], { min: 0, max: f === "sonstige" ? 1e7 : 20, stellen: 2 });
    }
    if (daten.vorlageId !== undefined) {
      const vid = v.kennung(daten.vorlageId);
      v.pflicht(!vid || (db.bo?.vorlagen || []).some((x) => x.id === vid), "Vorlage nicht gefunden.");
      k.vorlageId = vid || null;
    }
    if (daten.status !== undefined) {
      const st = v.auswahl(daten.status, KAMPAGNE_STATUS, "");
      v.pflicht(st, "Unbekannter Status.");
      v.pflicht(!(k.status === "abgeschlossen" && st !== "abgeschlossen"), "Abgeschlossene Kampagnen lassen sich nicht wieder öffnen.");
      if (st === "aktiv" && k.status !== "aktiv") throw ungueltig("Bitte „Kampagne starten“ verwenden (legt die Grundbuch-Aufgaben an).");
      k.status = st;
    }
    W.protokoll(db, n, "aendern", "kampagne", k.id, `Kampagne „${k.name}“ geändert`);
    return kampagneAusgabe(db, k);
  });
}

/** Kampagne starten: Status aktiv + je Ziel ohne Eigentümer eine Aufgabe „Grundbuchabfrage“ mit Kostenschätzung */
export async function kampagneStarten(n, id) {
  schreibRecht(n);
  return boAendern((db) => {
    const akq = akqSicher(db);
    const k = kampagneVon(akq, id);
    v.pflicht(k.status === "entwurf", "Nur Entwürfe lassen sich starten.");
    k.status = "aktiv";
    k.gestartetAm = jetzt();
    db.aufgaben = db.aufgaben || [];
    let neu = 0;
    for (const z of zieleVon(akq, k.id)) {
      if (z.status === "gesperrt" || z.grundbuch.aufgabeId) continue;
      const offen = z.parzellen.filter((p) => !z.gesperrteFlurstuecke.includes(p.id));
      const sch = z.grundbuch.schaetzung;
      const a = {
        id: neueId("AF"),
        titel: `Grundbuchabfrage: ${z.gemeinde} (${offen.length} Flurstück${offen.length === 1 ? "" : "e"}) – ca. ${sch.betrag.toLocaleString("de-DE")} ${sch.waehrung === "CHF" ? "CHF" : "€"}`,
        beschreibung: [
          `Kampagne ${k.name} (${k.id}), Zielfläche ${z.id} · ${z.ha.toLocaleString("de-DE")} ha · Score ${z.score}.`,
          `Flurstücke: ${offen.map((p) => `${String(p.kg || "").replace(/^DEMO-(KG|Gemarkung)\s*/, "")} ${p.kgNr}/${p.gstNr}`).join(", ")}.`,
          k.land === "DE"
            ? "Grundbucheinsicht beim Grundbuchamt: berechtigtes Interesse darlegen (§ 12 GBO; Vorhaben erneuerbare Energien ab 750 kW: § 43a GBV, Eigenerklärung). Nur nach Flurstück, nicht nach Person."
            : k.land === "AT"
              ? "Grundbuchauszug je Grundstück über die Verrechnungsstelle (Suche nach KG + Grundstücksnummer, nie nach Person)."
              : "Eigentümerauskunft nach Art. 970 Abs. 2 ZGB beim kantonalen Grundbuchamt bzw. Online-Portal.",
          `Kostenschätzung: ${sch.anzahl} × ${sch.jeAbfrage.toLocaleString("de-DE")} = ${sch.betrag.toLocaleString("de-DE")} ${sch.waehrung} (${sch.text}).`,
          "Ergebnis (Eigentümer, Anschrift, tatsächliche Kosten) in der Kampagne erfassen – die Aufgabe wird dann automatisch erledigt.",
          `Link: /portal/admin/akquise/kampagnen/${k.id}`,
        ].join("\n"),
        faelligAm: plusTage(7),
        zustaendigId: k.zustaendigId || n.id,
        bezugArt: null,
        bezugId: null,
        kampagneId: k.id,
        kampagnenZielId: z.id,
        status: "offen",
        erstelltVon: n.id,
        erstelltAm: jetzt(),
        erledigtAm: null,
        erledigtVon: null,
        erinnertAm: null,
        quelle: "kampagne_grundbuch",
      };
      db.aufgaben.push(a);
      z.grundbuch.aufgabeId = a.id;
      z.grundbuch.status = "beantragt";
      if (z.status === "offen") z.status = "grundbuch";
      neu++;
    }
    W.protokoll(db, n, "aendern", "kampagne", k.id, `Kampagne „${k.name}“ gestartet – ${neu} Grundbuch-Aufgaben`);
    return { kampagne: kampagneAusgabe(db, k), aufgaben: neu };
  });
}

// ---------------------------------------------------------------- Eigentümer-Ergebnis, Empfänger, Rücklauf

function personLesen(p = {}) {
  const e = {
    anrede: v.auswahl(p.anrede, ["Frau", "Herr", "Divers", ""], ""),
    titel: v.text(p.titel, 30),
    vorname: v.text(p.vorname, 80),
    nachname: v.text(p.nachname, 80),
    firma: v.text(p.firma, 120),
    zusatz: v.text(p.zusatz, 80),
    strasse: v.text(p.strasse, 120),
    plz: v.plz(p.plz),
    ort: v.text(p.ort, 80),
    land: v.auswahl(p.land, ["DE", "AT", "CH"], ""),
  };
  v.pflicht(e.nachname || e.firma, "Eigentümer: Nachname oder Firma angeben.");
  v.pflicht(e.strasse && e.plz && e.ort, "Eigentümer: vollständige Postanschrift (Straße, PLZ, Ort) angeben.");
  return e;
}

/** Grundbuch-Ergebnis erfassen: Empfänger (je Eigentümer) mit Einmalcode, Sperrlisten-Abgleich, Aufgabe erledigen */
export async function grundbuchErgebnis(n, zielId, daten = {}) {
  schreibRecht(n);
  const liste = Array.isArray(daten.empfaenger) ? daten.empfaenger.slice(0, 20) : [];
  v.pflicht(liste.length, "Bitte mindestens einen Eigentümer erfassen.");
  const personen = liste.map((p) => ({ ...personLesen(p), flurstuecke: v.textListe(p.flurstuecke, { max: 60, laenge: 60 }) }));
  const kostenIst = daten.kostenIst === undefined || daten.kostenIst === "" ? null : v.zahl(daten.kostenIst, { min: 0, max: 100000, stellen: 2 });
  return boAendern((db) => {
    const akq = akqSicher(db);
    const z = zielVon(akq, zielId);
    const k = kampagneVon(akq, z.kampagneId);
    v.pflicht(k.status !== "abgeschlossen", "Die Kampagne ist abgeschlossen.");
    const codes = new Set(akq.ziele.flatMap((x) => (x.empfaenger || []).map((e) => e.code)));
    const ergebnis = [];
    for (const p of personen) {
      const sperre = personGesperrt(akq, p);
      let code;
      do code = codeErzeugen();
      while (codes.has(code));
      codes.add(code);
      const e = {
        id: neueId("KE"),
        ...p,
        flurstuecke: p.flurstuecke.filter((id) => z.parzellen.some((x) => x.id === id)),
        code,
        codeAktiv: !sperre,
        sperrHash: hash(personSchluessel(p)),
        gesperrt: !!sperre,
        gesperrtGrund: sperre ? SPERR_GRUENDE[sperre.grund] : "",
        status: sperre ? "widerspruch" : "neu",
        briefe: [],
        aufrufe: 0,
        ersterAufrufAm: null,
        letzterAufrufAm: null,
        anfragen: [],
        termine: [],
        rueckmeldungAm: null,
        widerspruchAm: sperre ? sperre.am : null,
        einwilligungTelefon: null,
        einwilligungEmail: null,
        nachfass: {},
        quelle: "grundbuch",
        erfasstAm: jetzt(),
        erfasstVon: n.id,
      };
      z.empfaenger.push(e);
      ergebnis.push({ id: e.id, gesperrt: e.gesperrt, anzeige: personMaskiert(e) });
    }
    z.grundbuch.status = "erledigt";
    z.grundbuch.ergebnisAm = jetzt();
    if (kostenIst !== null) z.grundbuch.kostenIst = kostenIst;
    z.status = z.empfaenger.every((e) => e.gesperrt) ? "gesperrt" : "ermittelt";
    const a = (db.aufgaben || []).find((x) => x.id === z.grundbuch.aufgabeId);
    if (a && a.status === "offen") {
      a.status = "erledigt";
      a.erledigtAm = jetzt();
      a.erledigtVon = n.id;
    }
    W.protokoll(db, n, "aendern", "kampagne", k.id, `Grundbuch-Ergebnis zu ${z.id}: ${ergebnis.length} Eigentümer (${ergebnis.filter((x) => x.gesperrt).length} gesperrt)`);
    return { ziel: zielAusgabe(z), neu: ergebnis };
  });
}

/** Rücklauf/Status je Empfänger pflegen (Rückmeldung per Brief/Telefon, Termin, Einwilligungen, Ergebnis) */
export async function empfaengerAendern(n, zielId, empfaengerId, daten = {}) {
  schreibRecht(n);
  return boAendern((db) => {
    const akq = akqSicher(db);
    const z = zielVon(akq, zielId);
    const e = (z.empfaenger || []).find((x) => x.id === v.kennung(empfaengerId));
    if (!e) throw nichtGefunden("Empfänger nicht gefunden.");
    v.pflicht(!e.gesperrt || daten.status === undefined, "Gesperrte Empfänger (Widerspruch) können nicht weiter bearbeitet werden.");
    if (daten.einwilligungTelefon !== undefined) {
      if (daten.einwilligungTelefon) {
        const q = v.text(daten.einwilligungTelefon.quelle, 120);
        v.pflicht(q.length >= 3, "Einwilligung: Quelle/Nachweis angeben (z. B. „Rückantwort vom 12.10., unterschrieben“).");
        e.einwilligungTelefon = { am: jetzt(), quelle: q, telefon: v.text(daten.einwilligungTelefon.telefon, 40), vonId: n.id };
      } else e.einwilligungTelefon = null;
    }
    if (daten.einwilligungEmail !== undefined) {
      if (daten.einwilligungEmail) {
        const q = v.text(daten.einwilligungEmail.quelle, 120);
        v.pflicht(q.length >= 3, "Einwilligung: Quelle/Nachweis angeben.");
        e.einwilligungEmail = { am: jetzt(), quelle: q, email: v.email(daten.einwilligungEmail.email), vonId: n.id };
      } else e.einwilligungEmail = null;
    }
    if (daten.rueckmeldung) {
      e.rueckmeldungAm = jetzt();
      e.rueckmeldungText = v.mehrzeilig(daten.rueckmeldung, 1000);
      if (e.status === "angeschrieben" || e.status === "neu") e.status = "reaktion";
    }
    if (daten.termin) {
      const am = /^\d{4}-\d{2}-\d{2}/.test(String(daten.termin.am || "")) ? String(daten.termin.am).slice(0, 16) : null;
      v.pflicht(am, "Termin: Datum angeben.");
      e.termine = [...(e.termine || []), { am, notiz: v.text(daten.termin.notiz, 300), vonId: n.id, erfasstAm: jetzt() }];
      e.status = "termin";
      if (!["gesichert"].includes(z.status)) z.status = "termin";
    }
    if (daten.status !== undefined) {
      const st = v.auswahl(daten.status, ["reaktion", "termin", "gesichert", "abgelehnt"], "");
      v.pflicht(st, "Unbekannter Status.");
      e.status = st;
      if (st === "gesichert") {
        z.status = "gesichert";
        z.gesichertHa = v.zahl(daten.gesichertHa, { min: 0, max: 100000, stellen: 2 }) ?? z.ha;
      }
      if (st === "abgelehnt" && z.empfaenger.every((x) => ["abgelehnt", "widerspruch"].includes(x.status))) z.status = "abgelehnt";
    }
    W.protokoll(db, n, "aendern", "kampagne", z.kampagneId, `Rücklauf ${z.id}/${e.id}: ${EMPFAENGER_STATUS[e.status] || e.status}`);
    return { ziel: zielAusgabe(z) };
  });
}

/** Widerspruch/Sperre für einen Empfänger (Brief, Telefon …) – wirkt über alle Kampagnen */
export async function empfaengerSperren(n, zielId, empfaengerId, { grund = "widerspruch", quelle = "brief", notiz = "" } = {}) {
  schreibRecht(n);
  return boAendern((db) => {
    const akq = akqSicher(db);
    const z = zielVon(akq, zielId);
    const e = (z.empfaenger || []).find((x) => x.id === v.kennung(empfaengerId));
    if (!e) throw nichtGefunden("Empfänger nicht gefunden.");
    const fs = z.parzellen.filter((p) => !e.flurstuecke?.length || e.flurstuecke.includes(p.id));
    const s = sperreEintragen(db, n, { person: e, land: z.land, flurstuecke: fs, grund, quelle, kampagneId: z.kampagneId, zielId: z.id, notiz });
    return { sperre: { id: s.id, anzeige: s.anzeige }, ziel: zielAusgabe(z) };
  });
}

// ---------------------------------------------------------------- Serienbrief, Versandliste, Versand

/** Empfänger für Stufe 1 (Erstbrief) bzw. 2 (Zweitbrief nach Nachfass-Aufgabe) */
function versandEmpfaenger(akq, k, stufe) {
  const out = [];
  for (const z of zieleVon(akq, k.id)) {
    for (const e of z.empfaenger || []) {
      if (e.gesperrt || !e.codeAktiv || personGesperrt(akq, e)) continue;
      const n = (e.briefe || []).length;
      if (stufe === 1 && n === 0) out.push({ z, e });
      if (stufe === 2 && n === 1 && Object.entries(e.nachfass || {}).some(([id, x]) => x.ergebnis === "aufgabe" && k.nachfass.find((s) => s.id === id)?.art === "zweiter_brief") && !["reaktion", "termin", "gesichert", "abgelehnt", "widerspruch"].includes(e.status)) out.push({ z, e });
    }
  }
  return out;
}

/** Daten für Serienbrief (PDF) und Versandliste – ändert nichts */
export async function serienbriefDaten(n, id, { stufe = 1 } = {}) {
  rechtNoetig(n, "geodaten", 1);
  rechtNoetig(n, "akquise", 1);
  const db = await boLesen();
  const akq = db.akq || leer;
  const k = kampagneVon(akq, id);
  const st = Number(stufe) === 2 ? 2 : 1;
  const vl = k.vorlageId ? (db.bo?.vorlagen || []).find((x) => x.id === k.vorlageId) : null;
  const aktuell = vl ? vl.versionen.find((x) => x.version === vl.version) || vl.versionen.at(-1) : null;
  const z = db.nutzer.find((u) => u.id === (k.zustaendigId || k.erstelltVon));
  return {
    kampagne: { id: k.id, name: k.name, land: k.land, demo: k.demo || k.test },
    stufe: st,
    vorlage: aktuell ? { betreff: aktuell.betreff, text: aktuell.text, name: vl.name, version: vl.version } : null,
    zustaendig: z ? { name: [z.vorname, z.nachname].filter(Boolean).join(" "), vorname: z.vorname } : null,
    empfaenger: versandEmpfaenger(akq, k, st).map(({ z: ziel, e }) => ({ ziel: { ...zielAusgabe(ziel, { mitEmpfaengern: false }) }, empfaenger: empfaengerAusgabe(e) })),
  };
}

/** Versand bestätigen (Druck + Post erledigt): Brief je Empfänger vermerken */
export async function versandBestaetigen(n, id, { stufe = 1, empfaengerIds } = {}) {
  schreibRecht(n);
  return boAendern((db) => {
    const akq = akqSicher(db);
    const k = kampagneVon(akq, id);
    v.pflicht(k.status === "aktiv", "Nur aktive Kampagnen können versenden.");
    const st = Number(stufe) === 2 ? 2 : 1;
    const nur = Array.isArray(empfaengerIds) ? new Set(empfaengerIds.map(String)) : null;
    let anzahl = 0;
    for (const { z, e } of versandEmpfaenger(akq, k, st)) {
      if (nur && !nur.has(e.id)) continue;
      e.briefe.push({ nr: st, am: jetzt(), art: st === 1 ? "erstbrief" : "zweitbrief", vonId: n.id });
      if (e.status === "neu") e.status = "angeschrieben";
      if (["ermittelt", "grundbuch", "offen"].includes(z.status)) z.status = "angeschrieben";
      anzahl++;
    }
    v.pflicht(anzahl, "Keine versandbereiten Empfänger (Eigentümer erfasst? bereits angeschrieben? gesperrt?).");
    W.protokoll(db, n, "aendern", "kampagne", k.id, `Versand bestätigt: ${anzahl} ${st === 1 ? "Erstbriefe" : "Zweitbriefe"}`);
    return { ok: true, anzahl, kennzahlen: kampagnenKennzahlen(k, zieleVon(akq, k.id)) };
  });
}

// ---------------------------------------------------------------- Sperrliste

export async function sperrliste(n) {
  rechtNoetig(n, "geodaten", 1);
  const db = await boLesen();
  const akq = db.akq || leer;
  return { eintraege: [...akq.sperrliste].reverse().map((s) => ({ id: s.id, anzeige: s.anzeige, flurstuecke: (s.flurstueckHashes || []).length, land: s.land, grund: s.grund, grundLabel: SPERR_GRUENDE[s.grund], quelle: s.quelle, quelleLabel: SPERR_QUELLEN[s.quelle], am: s.am, von: nameVon(db, s.vonId) || (s.quelle === "online" ? "Online (Eigentümer)" : ""), aktiv: s.aktiv !== false, kampagneId: s.kampagneId, notiz: s.notiz })) };
}

/** Manueller Sperrvermerk ohne Kampagnenbezug (z. B. Widerspruch per Brief von einer Person, die noch nicht erfasst ist) */
export async function sperreAnlegen(n, daten = {}) {
  schreibRecht(n);
  const p = daten.person || {};
  const person = { vorname: v.text(p.vorname, 80), nachname: v.text(p.nachname, 80), firma: v.text(p.firma, 120), plz: v.plz(p.plz) };
  v.pflicht(((person.nachname && person.vorname) || person.firma) && person.plz, "Sperrvermerk: Vor- und Nachname (bzw. Firma) und PLZ angeben – der Abgleich läuft über Name + PLZ.");
  return boAendern((db) => {
    const s = sperreEintragen(db, n, { person, land: v.auswahl(daten.land, ["DE", "AT", "CH"], null), grund: daten.grund, quelle: daten.quelle, notiz: daten.notiz });
    return { id: s.id, anzeige: s.anzeige };
  });
}

/** Sperre aufheben – nur Leitung, nur bei irrtümlicher Erfassung (Begründung Pflicht, protokolliert) */
export async function sperreAufheben(n, id, { begruendung = "" } = {}) {
  schreibRecht(n);
  if (!istLeitung(n)) throw new PlattformFehler(403, "Sperren aufheben darf nur die Leitung.", "recht");
  const b = v.text(begruendung, 300);
  v.pflicht(b.length >= 10, "Bitte begründen (mind. 10 Zeichen), z. B. „irrtümlich der falschen Person zugeordnet“.");
  return boAendern((db) => {
    const akq = akqSicher(db);
    const s = akq.sperrliste.find((x) => x.id === v.kennung(id));
    if (!s) throw nichtGefunden("Sperrvermerk nicht gefunden.");
    s.aktiv = false;
    s.aufgehobenAm = jetzt();
    s.aufgehobenVon = n.id;
    s.aufhebungsgrund = b;
    W.protokoll(db, n, "sperrliste", "sperrliste", s.id, `Sperrvermerk aufgehoben: ${b}`);
    return { ok: true };
  });
}

// ---------------------------------------------------------------- Öffentliche Angebotsseite (/angebot/[code])

function empfaengerFuerCode(akq, code) {
  const c = codeNormalisieren(code);
  if (!c) return null;
  for (const z of akq.ziele) for (const e of z.empfaenger || []) if (e.code === c) return { z, e, k: akq.kampagnen.find((x) => x.id === z.kampagneId) };
  return null;
}

/**
 * Angebotsseite: NUR Flächen-Steckbrief (keine Namen, keine Anschrift, keine Flurstücksnummern, keine Kampagnendaten).
 * null = unbekannter/inaktiver Code (Seite zeigt neutral „nicht gefunden“).
 */
export async function angebotFuerCode(code) {
  const db = await boLesen();
  const r = empfaengerFuerCode(db.akq || leer, code);
  if (!r || !r.k || r.k.status === "entwurf") return null;
  const { z, e } = r;
  if (e.gesperrt || !e.codeAktiv) return { gesperrt: true };
  return {
    gemeinde: z.gemeinde,
    bundesland: z.bundesland,
    land: z.land,
    ha: z.ha,
    mwp: z.mwp,
    ampel: z.ampel,
    pacht: z.pacht,
    netzKm: z.netz?.trasseM ? Math.round(z.netz.trasseM / 100) / 10 : null,
    kulisse: z.kulisse ? { randstreifen: (z.kulisse.randstreifenAnteil || 0) >= 0.5, privilegiert: (z.kulisse.privilegiertAnteil || 0) >= 0.5, benachteiligt: (z.kulisse.benachteiligtAnteil || 0) >= 0.5, moor: (z.kulisse.moorAnteil || 0) >= 0.5 } : null,
    flurstueckeAnzahl: (e.flurstuecke?.length || z.parzellen.length),
    geometrie: z.geometrie,
    demo: !!(z.demo || r.k.demo || r.k.test),
    anfrageGestellt: (e.anfragen || []).length > 0,
  };
}

/** Aufruf zählen (vom Browser der Angebotsseite gemeldet, rate-limitiert) */
export async function angebotAufruf(code) {
  return boAendern((db) => {
    const r = empfaengerFuerCode(akqSicher(db), code);
    if (!r || r.e.gesperrt || !r.e.codeAktiv || r.k?.status === "entwurf") return { ok: false };
    r.e.aufrufe = (Number(r.e.aufrufe) || 0) + 1;
    r.e.ersterAufrufAm = r.e.ersterAufrufAm || jetzt();
    r.e.letzterAufrufAm = jetzt();
    return { ok: true };
  });
}

/** Rücklauf „Anfrage“ nach anfrageAnlegen() verknüpfen (Vorgang + ggf. Einwilligung Telefon) */
export async function angebotAnfrageVerknuepfen(code, { vorgangId, einwilligungTelefon = false, telefon = "" } = {}) {
  return boAendern((db) => {
    const r = empfaengerFuerCode(akqSicher(db), code);
    if (!r || r.e.gesperrt || !r.e.codeAktiv) throw nichtGefunden("Code ungültig.");
    r.e.anfragen = [...(r.e.anfragen || []), { am: jetzt(), vorgangId: v.kennung(vorgangId) || null }];
    if (einwilligungTelefon && telefon) r.e.einwilligungTelefon = { am: jetzt(), quelle: "Online-Formular Angebotsseite (ausdrückliche Einwilligung)", telefon: v.text(telefon, 40), vonId: null };
    if (["neu", "angeschrieben"].includes(r.e.status)) r.e.status = "reaktion";
    if (["ermittelt", "angeschrieben", "grundbuch"].includes(r.z.status)) r.z.status = "reaktion";
    W.protokoll(db, null, "aendern", "kampagne", r.z.kampagneId, `Rücklauf: Anfrage über Angebotsseite (${r.z.id}${vorgangId ? `, ${vorgangId}` : ""})`);
    return { ok: true, kampagneId: r.z.kampagneId, zielId: r.z.id, ha: r.z.ha, bundesland: r.z.bundesland, land: r.z.land, gemeinde: r.z.gemeinde };
  });
}

/** Widerspruch online: Sperrliste (Person + Flurstücke), Code sofort inaktiv */
export async function angebotWiderspruch(code) {
  return boAendern((db) => {
    const akq = akqSicher(db);
    const r = empfaengerFuerCode(akq, code);
    if (!r) throw nichtGefunden("Code ungültig.");
    if (r.e.gesperrt) return { ok: true, bereits: true };
    const fs = r.z.parzellen.filter((p) => !r.e.flurstuecke?.length || r.e.flurstuecke.includes(p.id));
    sperreEintragen(db, null, { person: r.e, land: r.z.land, flurstuecke: fs, grund: "widerspruch", quelle: "online", kampagneId: r.z.kampagneId, zielId: r.z.id });
    return { ok: true };
  });
}

// ---------------------------------------------------------------- Löschen (nur Testkampagnen bzw. Entwürfe ohne Versand)

export async function kampagneLoeschen(n, id) {
  schreibRecht(n);
  return boAendern((db) => {
    const akq = akqSicher(db);
    const k = kampagneVon(akq, id);
    const ziele = zieleVon(akq, k.id);
    const versandt = ziele.some((z) => (z.empfaenger || []).some((e) => e.briefe?.length));
    if (!k.test) {
      v.pflicht(k.status === "entwurf" && !versandt, "Nur Entwürfe ohne Versand bzw. Testkampagnen lassen sich löschen.");
    } else if (!istLeitung(n)) throw new PlattformFehler(403, "Testkampagnen löscht die Leitung.", "recht");
    const zielIds = new Set(ziele.map((z) => z.id));
    let entfernt = { ziele: ziele.length, aufgaben: 0, sperren: 0, vorgaenge: 0 };
    const vorgangIds = new Set(ziele.flatMap((z) => (z.empfaenger || []).flatMap((e) => (e.anfragen || []).map((a) => a.vorgangId))).filter(Boolean));
    db.aufgaben = (db.aufgaben || []).filter((a) => {
      const weg = a.kampagneId === k.id;
      if (weg) entfernt.aufgaben++;
      return !weg;
    });
    if (k.test) {
      // Testkampagne: auch Sperrvermerke und Rückläufer-Anfragen (Vorgang + Flächenentwurf) entfernen – keine Dauerverschmutzung
      akq.sperrliste = akq.sperrliste.filter((s) => {
        const weg = s.kampagneId === k.id;
        if (weg) entfernt.sperren++;
        return !weg;
      });
      const flaechenIds = new Set(db.vorgaenge.filter((x) => vorgangIds.has(x.id)).map((x) => x.flaecheId).filter(Boolean));
      const vorher = db.vorgaenge.length;
      db.vorgaenge = db.vorgaenge.filter((x) => !vorgangIds.has(x.id));
      entfernt.vorgaenge = vorher - db.vorgaenge.length;
      db.flaechen = db.flaechen.filter((f) => !flaechenIds.has(f.id));
      if (db.bo) {
        db.bo.kontakte = (db.bo.kontakte || []).map((c) => ({ ...c, bezuege: (c.bezuege || []).filter((b) => !(vorgangIds.has(b.id) || flaechenIds.has(b.id))) }));
        for (const key of Object.keys(db.bo.objektInfo || {})) if ([...vorgangIds, ...flaechenIds].some((x) => key.endsWith(`:${x}`))) delete db.bo.objektInfo[key];
      }
      db.benachrichtigungen = (db.benachrichtigungen || []).filter((b) => !vorgangIds.has(b.objektId));
    }
    akq.ziele = akq.ziele.filter((z) => !zielIds.has(z.id));
    akq.kampagnen = akq.kampagnen.filter((x) => x.id !== k.id);
    W.protokoll(db, n, "loeschen", "kampagne", k.id, `Kampagne „${k.name}“ gelöscht${k.test ? " (Test)" : ""}: ${JSON.stringify(entfernt)}`);
    return { ok: true, entfernt };
  });
}

export const NACHFASS = NACHFASS_ARTEN;
