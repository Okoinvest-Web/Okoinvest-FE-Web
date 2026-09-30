// src/lib/plattform/backend/demo/energie-seed.js
//
// Demo-Daten „Energiebeschaffung & Versorger-Ausschreibung“ – ALLES FIKTIV (Firmen mit „(fiktiv)“, Personen mit
// „(Demo)“, Adressen unter example.com). Wird beim ersten Zugriff auf db.energie einmalig ergänzt; übrige Daten
// bleiben unberührt.
//
//  - 6 Energieversorger (DE/AT) mit Portal-Konten lieferant@example.com, lieferant2 … lieferant6@example.com
//    (Rolle „lieferant“, Passwort wie alle Demo-Konten)
//  - Backoffice-Konto bo-energie@example.com (Unterrolle „Energie“)
//  - Kunden: unternehmen@example.com (Werk Nord, Vertrag aus der Abnahmestelle) und drei Pool-Kunden
//    energie-kunde1 … 3@example.com (Rolle „unternehmen“), alle mit Beschaffungsvollmacht
//  - Ausschreibungen: EA „Werk Nord 2027“ wartet auf Kundenfreigabe (2 Runden, 8 Angebote), EA „Pool Österreich“
//    in der Angebotsphase (lieferant@ hat noch nicht geboten), EA „Pool Süd 2027–2028“ mit Zuschlag
//  - Pool-Tranchen 2027/2028, Bewertungen und Teilnahmehistorie
//  Die Terminkurve ist NICHT gespeichert: Demo-Werte erzeugt markt.js → demoTerminkurve() bei jedem Abruf (gekennzeichnet).

import { jetzt, neueId, sha256, vorTagen } from "./hilfen";
import { ANNAHMEN_STANDARD } from "../../energie/beschaffung";
import { aktuelleKurve, demoTerminkurve } from "../../energie/markt";
import { losKontext, losAnonym } from "../../energie/los";
import { produkteBereinigen } from "../../energie/ausschreibung";
import { VOLLMACHT_TEXT, VOLLMACHT_VERSION } from "../../energie/texte";

const MAIL_AUS = { status: false, nachricht: false, nda: false, suchprofil: false, anfrage: false, aufgabe: false, stoerung: false, energie: false };
const inTagen = (t) => new Date(Date.now() + t * 86400e3).toISOString();

const VERSORGER = [
  { key: "l1", name: "Nordlicht Energie AG (fiktiv)", land: "DE", gebiete: ["DE", "AT"], person: ["Lena", "Nord (Demo)"], email: "lieferant@example.com", sterne: 4 },
  { key: "l2", name: "Alpenstrom Vertrieb GmbH (fiktiv)", land: "AT", gebiete: ["AT"], person: ["Alois", "Berger (Demo)"], email: "lieferant2@example.com", sterne: 5 },
  { key: "l3", name: "Rheintal Energiehandel GmbH (fiktiv)", land: "DE", gebiete: ["DE"], person: ["Rita", "Rhein (Demo)"], email: "lieferant3@example.com", sterne: 3 },
  { key: "l4", name: "Donau Power GmbH (fiktiv)", land: "AT", gebiete: ["AT", "DE"], person: ["Dominik", "Donau (Demo)"], email: "lieferant4@example.com", sterne: 4 },
  { key: "l5", name: "Mittelstand Energie eG (fiktiv)", land: "DE", gebiete: ["DE"], person: ["Maria", "Mittel (Demo)"], email: "lieferant5@example.com", sterne: 4 },
  { key: "l6", name: "Grünwerk Versorgung GmbH (fiktiv)", land: "DE", gebiete: ["DE", "AT"], person: ["Gregor", "Grün (Demo)"], email: "lieferant6@example.com", sterne: 3 },
];

const KUNDEN = [
  { key: "k1", email: "energie-kunde1@example.com", vorname: "Bernd", nachname: "Backstube (Demo)", firma: "Bäckerei Sonnenschein GmbH (fiktiv)", land: "DE", jahresKwh: 420000, profilId: "zweischicht", spannungsebene: "ms_ns", messart: "rlm" },
  { key: "k2", email: "energie-kunde2@example.com", vorname: "Helga", nachname: "Huber (Demo)", firma: "Kunststofftechnik Huber GmbH (fiktiv)", land: "AT", jahresKwh: 1600000, profilId: "dreischicht", spannungsebene: "ms", messart: "rlm" },
  { key: "k3", email: "energie-kunde3@example.com", vorname: "Walter", nachname: "Weber (Demo)", firma: "Autohaus Weber KG (fiktiv)", land: "DE", jahresKwh: 260000, profilId: "handel", spannungsebene: "ns", messart: "rlm" },
];

function konto(db, admin, { email, vorname, nachname, firma, rollen, backofficeRollen }) {
  let u = db.nutzer.find((x) => x.email === email);
  if (u) return u;
  u = {
    id: neueId("U"), email, vorname, nachname, firma, telefon: "", rollen, ...(backofficeRollen ? { backofficeRollen } : {}),
    passwortHash: admin.passwortHash, sitzungVersion: 0, aktiv: true, emailBestaetigt: true, erstelltAm: vorTagen(120), letzterLogin: null,
    suchprofil: null, mailEinstellungen: MAIL_AUS, demo: true,
  };
  db.nutzer.push(u);
  return u;
}

/** Deterministischer Zufall je Schlüssel (reproduzierbare Demo-Gebote) */
function zufall(s) {
  let h = 2166136261;
  for (const c of s) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
  return ((h >>> 0) % 10000) / 10000;
}

function gebotErzeugen(a, lf, runde, ctx, produkte, { faktor = 1 } = {}) {
  const markt = ctx.lastgewichtetEurMwh / 10; // ct/kWh
  const positionen = [];
  for (const p of produkte) {
    const r = zufall(`${a.id}|${lf.id}|${p.id}|${runde}`);
    if (r < 0.12) continue; // nicht jeder bietet jede Variante
    const pos = { produktId: p.id, art: p.art, arbeitspreisCt: null, aufschlagCt: null, grundpreisEurMonat: Math.round(40 + r * 120), hknCt: p.gruen ? Math.round((0.05 + r * 0.15) * 1000) / 1000 : null, mengentoleranzProzent: 20 };
    if (p.art === "fix") pos.arbeitspreisCt = Math.round((markt + (0.9 + r * 1.1) * faktor + (p.laufzeitJahre - 1) * -0.15) * 1000) / 1000;
    else pos.aufschlagCt = Math.round(((p.art === "spot" ? 0.3 : 0.5) + r * 0.5) * faktor * 1000) / 1000;
    positionen.push(pos);
  }
  if (!positionen.length) {
    const p = produkte[0];
    positionen.push({ produktId: p.id, art: p.art, arbeitspreisCt: p.art === "fix" ? Math.round((markt + 1.4) * 1000) / 1000 : null, aufschlagCt: p.art === "fix" ? null : 0.8, grundpreisEurMonat: 90, hknCt: p.gruen ? 0.1 : null, mengentoleranzProzent: 20 });
  }
  return positionen;
}

/** Demo-Daten ergänzen (in einer Schreib-Transaktion, db.energie ist bereits leer angelegt) */
export async function energieSeed(db) {
  const E = db.energie;
  const admin = db.nutzer.find((u) => u.email === "admin@example.com");
  if (!admin) return;
  E.einstellungen = { ...ANNAHMEN_STANDARD, bestpreisRegelStandard: "abstand", demoKurve: true };
  konto(db, admin, { email: "bo-energie@example.com", vorname: "Erik", nachname: "Energie (Demo)", firma: "ÖkoInvest (Demo-Konto)", rollen: ["admin"], backofficeRollen: ["energie"] });

  // Versorger + Konten
  const lf = {};
  for (const x of VERSORGER) {
    const u = konto(db, admin, { email: x.email, vorname: x.person[0], nachname: x.person[1], firma: x.name, rollen: ["lieferant"] });
    const l = {
      id: neueId("LF"), name: x.name, land: x.land, gebiete: x.gebiete, status: "aktiv", marktpartnerId: "", website: "", notiz: "Fiktiver Versorger für die Vorführung.",
      ansprechpartner: [{ name: `${x.person[0]} ${x.person[1]}`, email: x.email, telefon: "", funktion: "Key Account Gewerbe" }],
      kontoIds: [u.id], bewertungen: [{ id: neueId("LB"), am: vorTagen(40), vonId: admin.id, sterne: x.sterne, text: x.sterne >= 4 ? "Schnelle, vollständige Angebote." : "Angebote teils unvollständig (Sicherheiten)." }],
      erstelltAm: vorTagen(150), demo: true,
    };
    E.lieferanten.push(l);
    lf[x.key] = l;
  }

  // Kunden
  const kunden = {};
  const un = db.nutzer.find((u) => u.email === "unternehmen@example.com");
  for (const k of KUNDEN) kunden[k.key] = { ...k, u: konto(db, admin, { email: k.email, vorname: k.vorname, nachname: k.nachname, firma: k.firma, rollen: ["unternehmen"] }) };
  const stelle = (db.fach?.abnahmestellen || []).find((s) => s.nutzerId === un?.id);

  const vollmacht = (u, tage) => E.vollmachten.push({ id: neueId("VM"), kundeId: u.id, version: VOLLMACHT_VERSION, textHash: sha256(VOLLMACHT_TEXT), am: vorTagen(tage), ip: "", userAgent: "Demo", status: "erteilt", widerrufenAm: null, signaturId: null });
  const vertrag = (d) => {
    const v = { id: neueId("EV"), abnahmestelleIds: [], lieferantId: null, preisArt: "energie", struktur: "fix", verlaengerungMonate: 12, verlaengerungPreisCt: null, pvKwp: 0, speicherKwh: 0, pool: false, ausschreibungId: null, vorvertragId: null, quelle: "backoffice", erstelltAm: vorTagen(90), geaendertAm: vorTagen(90), ...d };
    E.vertraege.push(v);
    return v;
  };

  if (un) {
    vollmacht(un, 45);
    vertrag({
      kundeId: un.id, abnahmestelleIds: stelle ? [stelle.id] : [], lieferant: stelle?.lieferant || "Demo-Energie AG (fiktiv)", zone: "DE", preisCt: stelle?.arbeitspreisCt ?? 21.5, preisArt: "gesamt",
      beginn: "2025-01-01", vertragEnde: stelle?.vertragEnde || "2026-12-31", kuendigungsfristMonate: stelle?.kuendigungsfristMonate ?? 3, jahresKwh: stelle?.jahresverbrauchKwh || 850000, lastprofil: "zweischicht",
      pvKwp: 750, speicherKwh: 500, status: "aktiv", quelle: "kunde", bemerkung: "Aus den Stammdaten der Abnahmestelle übernommen. PV/Speicher: Contracting-Anlage Logistikzentrum (Demo).",
    });
  }
  const alt1 = vertrag({ kundeId: kunden.k1.u.id, lieferant: "Stadtwerke Musterstadt (fiktiv)", zone: "DE", preisCt: 13.2, beginn: "2024-01-01", vertragEnde: "2026-12-31", kuendigungsfristMonate: 3, jahresKwh: 420000, lastprofil: "zweischicht", status: "gekuendigt" });
  vertrag({ kundeId: kunden.k2.u.id, lieferant: "Landesenergie AT (fiktiv)", zone: "AT", preisCt: 12.9, beginn: "2025-04-01", vertragEnde: "2027-03-31", kuendigungsfristMonate: 3, jahresKwh: 1600000, lastprofil: "dreischicht", status: "aktiv", verlaengerungPreisCt: 13.4 });
  const alt3 = vertrag({ kundeId: kunden.k3.u.id, lieferant: "Regionalversorger Süd (fiktiv)", zone: "DE", preisCt: 14.1, beginn: "2024-01-01", vertragEnde: "2026-12-31", kuendigungsfristMonate: 3, jahresKwh: 260000, lastprofil: "handel", status: "gekuendigt" });
  for (const k of Object.values(kunden)) vollmacht(k.u, 70);

  const kurve = aktuelleKurve(demoTerminkurve({ stichtag: jetzt().slice(0, 10) }));
  const losEintrag = (u, d) => ({ kundeId: u.id, jahresKwh: d.jahresKwh, profilId: d.profilId, analyse: null, pvKwp: d.pvKwp || 0, speicherKwh: d.speicherKwh || 0, land: d.land, spannungsebene: d.spannungsebene, messart: d.messart, abnahmestellen: 1 });
  const ausschreibung = (d) => {
    const a = { id: neueId("EA"), fragen: [], verlauf: [], zuschlag: null, erstelltVon: admin.id, demo: true, kommune: false, ...d };
    a.anonym = losAnonym(a);
    E.ausschreibungen.push(a);
    return a;
  };
  const angebot = (a, l, runde, positionen, am) => {
    const kid = l.kontoIds[0];
    const g = { id: neueId("LO"), ausschreibungId: a.id, runde, lieferantId: l.id, kontoId: kid, positionen, bindefristBis: inTagen(12), zahlungszielTage: [14, 30][Math.round(zufall(l.id + a.id))], sicherheit: zufall(a.id + l.id + "s") > 0.6 ? "buergschaft" : "keine", bemerkung: "", status: "abgegeben", am, version: 1, historie: [] };
    E.angebote.push(g);
    return g;
  };

  // --- EA 1: Werk Nord 2027 (wartet auf Kundenfreigabe)
  if (un) {
    const produkte = produkteBereinigen([{ art: "fix", laufzeitJahre: 1 }, { art: "fix", laufzeitJahre: 2 }, { art: "tranchen", laufzeitJahre: 2, tranchen: 4 }, { art: "spot", laufzeitJahre: 1 }]);
    const eingeladen = [lf.l1.id, lf.l3.id, lf.l4.id, lf.l5.id, lf.l6.id];
    const a = ausschreibung({
      titel: "Stromlieferung ab 2027 – Werk Nord (Demo)", kundenIds: [un.id], zone: "DE", lieferbeginn: "2027-01", produkte, status: "freigabe",
      lose: [losEintrag(un, { jahresKwh: 850000, profilId: "zweischicht", pvKwp: 0, land: "DE", spannungsebene: "ms", messart: "rlm" })],
      regeln: { bestpreis: "abstand" }, erstelltAm: vorTagen(21),
      runden: [
        { nr: 1, start: vorTagen(20), frist: vorTagen(10), beendetAm: null, eingeladen, bestpreisRegel: "aus", erinnertAm: vorTagen(12) },
        { nr: 2, start: vorTagen(8), frist: vorTagen(3), beendetAm: null, eingeladen: [lf.l1.id, lf.l3.id, lf.l5.id], bestpreisRegel: "abstand", erinnertAm: vorTagen(4) },
      ],
    });
    const { ctx } = losKontext(a, kurve);
    for (const x of eingeladen) {
      const l = E.lieferanten.find((y) => y.id === x);
      angebot(a, l, 1, gebotErzeugen(a, l, 1, ctx, produkte), vorTagen(12));
    }
    let bestes = null;
    for (const x of a.runden[1].eingeladen) {
      const l = E.lieferanten.find((y) => y.id === x);
      const g = angebot(a, l, 2, gebotErzeugen(a, l, 2, ctx, produkte, { faktor: 0.8 }), vorTagen(4));
      const fix = g.positionen.find((p) => p.art === "fix");
      if (fix && (!bestes || fix.arbeitspreisCt < bestes.pos.arbeitspreisCt)) bestes = { g, pos: fix };
    }
    if (bestes) {
      a.zuschlag = { angebotId: bestes.g.id, produktId: bestes.pos.produktId, vorschlagAm: vorTagen(2), vorschlagVon: admin.id, begruendung: "Günstigster normierter Festpreis in Runde 2 – Planungssicherheit für 2027.", kundenFreigaben: {}, am: null };
    }
    a.verlauf.push({ am: vorTagen(21), vonId: admin.id, text: "Ausschreibung angelegt (1 Kunde, 4 Produktvarianten)" }, { am: vorTagen(20), vonId: admin.id, text: "Runde 1 gestartet, 5 Versorger eingeladen" }, { am: vorTagen(8), vonId: admin.id, text: "Runde 2 gestartet (Shortlist 3, Hinweis: Abstand zum Bestpreis)" }, { am: vorTagen(2), vonId: admin.id, text: "Zuschlagsvorschlag an den Kunden gesendet" });
  }

  // --- EA 2: Pool Österreich (Angebotsphase)
  {
    const produkte = produkteBereinigen([{ art: "fix", laufzeitJahre: 1 }, { art: "spot", laufzeitJahre: 2 }, { art: "fix", laufzeitJahre: 2, gruen: true }]);
    const eingeladen = [lf.l1.id, lf.l2.id, lf.l4.id, lf.l6.id];
    const a = ausschreibung({
      titel: "Reststrom-Pool Österreich ab April 2027 (Demo)", kundenIds: [kunden.k2.u.id], zone: "AT", lieferbeginn: "2027-04", produkte, status: "laufend",
      lose: [losEintrag(kunden.k2.u, KUNDEN[1])], regeln: { bestpreis: "rang" }, erstelltAm: vorTagen(6),
      runden: [{ nr: 1, start: vorTagen(5), frist: inTagen(6), beendetAm: null, eingeladen, bestpreisRegel: "aus", erinnertAm: null }],
      fragen: [{ id: neueId("LQ"), lieferantId: lf.l2.id, text: "Ist eine Mengentoleranz von ±20 % ausreichend oder wird eine Vollversorgung ohne Toleranz erwartet?", antwort: "Angebote bitte als Vollversorgung ohne Mengentoleranz; eine abweichende Toleranz kann im Preisblatt angegeben werden.", am: vorTagen(4), beantwortetAm: vorTagen(3), oeffentlich: true }],
    });
    a.verlauf.push({ am: vorTagen(5), vonId: admin.id, text: "Runde 1 gestartet, 4 Versorger eingeladen" });
    const { ctx } = losKontext(a, kurve);
    for (const x of [lf.l2.id, lf.l4.id]) {
      const l = E.lieferanten.find((y) => y.id === x);
      angebot(a, l, 1, gebotErzeugen(a, l, 1, ctx, produkte), vorTagen(2));
    }
  }

  // --- EA 3: Pool Süd 2027–2028 (Zuschlag erteilt) + neue Verträge + Tranchen
  {
    const produkte = produkteBereinigen([{ art: "tranchen", laufzeitJahre: 2, tranchen: 6 }, { art: "fix", laufzeitJahre: 2 }]);
    const eingeladen = [lf.l1.id, lf.l3.id, lf.l5.id, lf.l6.id];
    const k1 = kunden.k1.u;
    const k3 = kunden.k3.u;
    const a = ausschreibung({
      titel: "Reststrom-Pool Süd 2027–2028 (Demo)", kundenIds: [k1.id, k3.id], zone: "DE", lieferbeginn: "2027-01", produkte, status: "zuschlag",
      lose: [losEintrag(k1, KUNDEN[0]), losEintrag(k3, KUNDEN[2])], regeln: { bestpreis: "aus" }, erstelltAm: vorTagen(95),
      runden: [{ nr: 1, start: vorTagen(94), frist: vorTagen(80), beendetAm: null, eingeladen, bestpreisRegel: "aus", erinnertAm: vorTagen(82) }],
    });
    const { ctx } = losKontext(a, kurve);
    let sieger = null;
    for (const x of eingeladen) {
      const l = E.lieferanten.find((y) => y.id === x);
      const g = angebot(a, l, 1, gebotErzeugen(a, l, 1, ctx, produkte, { faktor: x === lf.l1.id ? 0.6 : 1 }), vorTagen(81));
      g.status = x === lf.l1.id ? "zuschlag" : "unterlegen";
      if (x === lf.l1.id) sieger = g;
    }
    const pos = sieger.positionen.find((p) => p.art === "tranchen") || sieger.positionen[0];
    a.zuschlag = { angebotId: sieger.id, produktId: pos.produktId, vorschlagAm: vorTagen(78), vorschlagVon: admin.id, begruendung: "Tranchenmodell mit niedrigstem Aufschlag; Pool sichert Mengen schrittweise.", kundenFreigaben: { [k1.id]: { am: vorTagen(77), ip: "", entscheidung: "freigegeben" }, [k3.id]: { am: vorTagen(76), ip: "", entscheidung: "freigegeben" } }, am: vorTagen(76) };
    a.verlauf.push({ am: vorTagen(94), vonId: admin.id, text: "Runde 1 gestartet, 4 Versorger eingeladen" }, { am: vorTagen(76), vonId: admin.id, text: "Zuschlag nach Freigabe beider Kunden erteilt, Absagen versendet" });
    for (const [k, alt, d] of [[k1, alt1, KUNDEN[0]], [k3, alt3, KUNDEN[2]]]) {
      vertrag({ kundeId: k.id, lieferant: lf.l1.name, lieferantId: lf.l1.id, zone: "DE", preisCt: null, struktur: "tranchen", aufschlagCt: pos.aufschlagCt, beginn: "2027-01-01", vertragEnde: "2028-12-31", kuendigungsfristMonate: 3, jahresKwh: d.jahresKwh, lastprofil: d.profilId, status: "neu", pool: true, quelle: "zuschlag", ausschreibungId: a.id, vorvertragId: alt.id, erstelltAm: vorTagen(76), geaendertAm: vorTagen(76) });
    }
    // Tranchen des Pools (Base, € je MWh, Mengen je Quartal)
    const t = (periode, mwh, preis, tage) => E.tranchen.push({ id: neueId("BT"), periode, zone: "DE", typ: "base", mwh, preisEurMwh: preis, gekauftAm: vorTagen(tage).slice(0, 10), lieferant: lf.l1.name, lieferantId: lf.l1.id, ausschreibungId: a.id, status: "aktiv", vonId: admin.id, bemerkung: "Demo-Tranche" });
    t("Q1-27", 60, 118.4, 70);
    t("Q2-27", 45, 82.9, 70);
    t("Q3-27", 50, 90.2, 55);
    t("Q4-27", 55, 117.6, 55);
    t("Q1-27", 40, 114.9, 30);
    t("Q2-27", 35, 79.8, 30);
    t("Q3-27", 35, 88.4, 14);
    t("Q4-27", 40, 119.1, 14);
    t("Q1-28", 45, 104.3, 14);
  }
}
