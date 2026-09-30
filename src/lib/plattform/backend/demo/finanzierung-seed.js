// src/lib/plattform/backend/demo/finanzierung-seed.js
//
// Demo-Daten „Finanzierung & Banken“ – ALLES FIKTIV (Banken mit „(fiktiv)“, Adressen unter example.com). Wird beim ersten
// Zugriff auf db.finanzierung einmalig ergänzt (demo/finanzierung.js → lesenBereit); übrige Daten bleiben unverändert.
//  - Bankenstamm: drei fiktive Banken (DE Geschäftsbank, DE Genossenschaftsbank, AT Bank)
//  - Konto bank@example.com (Rolle „bank“, Passwort wie alle Demo-Konten) – verknüpft mit „Demo Regionalbank eG (fiktiv)“
//  - Fall 1: Entwicklungsprojekt im Eigenbetrieb – drei Anfragen (zwei Term Sheets, eine Absage), Paket teilweise freigegeben
//  - Fall 2: Freifläche Werk Nord (Anlage) – Kreditvertrag, Covenant-Monitoring aus Zählerwerten (komfortabler DSCR)
//  - Fall 3: Agri-PV Bodensee (Anlage mit Minderleistung) – Kreditvertrag knapp bemessen → Frühwarnung/Lock-up möglich
//  - ein Finanzierungsszenario des Demo-Investors (freies Werkzeug)

import { jetzt, neueId, vorTagen } from "./hilfen";
import { annuitaet } from "@/lib/invest/markt";
import { prognoseJahrKwh } from "../../anlagen";
import { cockpitStandard, cockpitBereinigen, rechneCockpit, ergebnisKurz } from "../../finanzierung/kern";
import { CP_STANDARD, termsheetBereinigen } from "../../finanzierung/bank";

const MAIL_AUS = { status: false, nachricht: false, nda: false, suchprofil: false, anfrage: false, aufgabe: false, finanzierung: false };
const tag = (t) => new Date(Date.now() + t * 86400e3).toISOString().slice(0, 10);

function bankKonto(db) {
  const admin = db.nutzer.find((u) => u.email === "admin@example.com");
  let u = db.nutzer.find((x) => x.email === "bank@example.com");
  if (u || !admin) return u || null;
  u = {
    id: neueId("U"), email: "bank@example.com", vorname: "Berta", nachname: "Kreditbank (Demo)", firma: "Demo Regionalbank eG (fiktiv)", telefon: "",
    rollen: ["bank"], passwortHash: admin.passwortHash, sitzungVersion: 0, aktiv: true, emailBestaetigt: true, erstelltAm: vorTagen(20), letzterLogin: null,
    suchprofil: null, mailEinstellungen: MAIL_AUS, demo: true,
  };
  db.nutzer.push(u);
  return u;
}

/** Kreditbetrag so, dass der erwartete Schuldendienst CFADS ÷ dscr ergibt (Annuität) */
function betragFuer(db, a, e, dscr, zins, jahre, fkMax = 0.8) {
  const vertrag = (db.anlagen?.vertraege || []).find((c) => c.anlageId === a.id);
  const erz = prognoseJahrKwh(a);
  const eigenAnteil = Math.min(0.6, ((a.lastJahrKwh || 0) * 0.5) / Math.max(erz, 1));
  const erloes = (erz * eigenAnteil * (vertrag?.strompreisCt || e.preisCt)) / 100 + (Number(vertrag?.grundgebuehrMonat) || 0) * 12 + (erz * (1 - eigenAnteil) * e.merchantCt) / 100;
  const cfads = erloes - e.mwp * 1000 * e.opexKwp - (e.pachtJahr || 0);
  return Math.max(100000, Math.min(Math.round(e.capex * fkMax), Math.round(cfads / dscr / annuitaet(1, zins, jahre) / 1000) * 1000));
}

export async function finanzierungSeed(db) {
  const F = db.finanzierung;
  const t = jetzt();
  const admin = db.nutzer.find((u) => u.email === "admin@example.com");
  const konto = bankKonto(db);
  const B = (x) => {
    const b = { id: neueId("FB"), nutzerIds: [], erstelltAm: t, geaendertAm: t, telefon: "", notiz: "", demo: true, ...x };
    F.banken.push(b);
    return b;
  };
  const b1 = B({ name: "Demo Regionalbank eG (fiktiv)", land: "DE", art: "genossenschaft", ansprechpartner: "Berta Kreditbank (Demo)", email: "bank@example.com", schwerpunkt: "Erneuerbare Energien bis 30 Mio. €, KfW-Durchleitung", nutzerIds: konto ? [konto.id] : [] });
  const b2 = B({ name: "Demo Landesbank AG (fiktiv)", land: "DE", art: "geschaeftsbank", ansprechpartner: "Paul Projektfinanz (Demo)", email: "projektfinanzierung@example.com", schwerpunkt: "Non-Recourse ab 10 Mio. €" });
  const b3 = B({ name: "Demo Alpenbank AG (fiktiv)", land: "AT", art: "geschaeftsbank", ansprechpartner: "Anna Energie (Demo)", email: "energie-bank@example.com", schwerpunkt: "AT/DE, EAG-Projekte" });

  const fall = (x) => {
    const f = {
      id: neueId("FF"), spv: "", spvOrganisationId: null, bezugArt: "frei", bezugId: null, status: "vorbereitung", paketFreigabe: ["steckbrief", "financial_model"],
      cps: CP_STANDARD.map((c) => ({ ...c, erledigt: false, am: null, von: null, nachweis: "" })), notiz: "", erstelltVon: admin?.id || null, erstelltAm: vorTagen(30), geaendertAm: t, verlauf: [], demo: true, ...x,
    };
    F.faelle.push(f);
    return f;
  };

  // ---------------------------------------------------------------- Fall 1: Entwicklungsprojekt (Eigenbetrieb)
  const ep = (db.entwicklung?.projekte || []).find((p) => p.typ !== "speicher" && p.mwp >= 5) || null;
  const e1 = cockpitBereinigen({ ...cockpitStandard({ land: ep?.land || "DE", typ: ep?.typ === "agri" ? "agri" : "freiflaeche", mwp: ep?.mwp || 12 }) });
  const f1 = fall({
    titel: ep ? `${ep.titel} – Eigenbetrieb` : "Solarpark Demo Süd – Eigenbetrieb (fiktiv)", spv: "Demo Solarpark Süd GmbH & Co. KG (fiktiv, in Gründung)", bezugArt: ep ? "entwicklung" : "frei", bezugId: ep?.id || null,
    eingaben: e1, betragWunsch: Math.round(e1.capex * 0.75 / 1000) * 1000, status: "termsheets", paketFreigabe: ["steckbrief", "financial_model", "ertragsgutachten", "netz", "pacht"],
    geschaeftsmodell: null, verlauf: [{ am: vorTagen(21), von: "Demo-Backoffice", text: "Finanzierungsfall angelegt" }, { am: vorTagen(20), von: "Demo-Backoffice", text: "3 Bank(en) angefragt" }],
  });
  f1.cps.find((c) => c.id === "genehmigung").erledigt = false;
  f1.cps.find((c) => c.id === "netz").erledigt = true;
  f1.cps.find((c) => c.id === "netz").am = vorTagen(12);
  const A = (f, b, x) => {
    const a = { id: neueId("FA"), fallId: f.id, bankId: b.id, status: "offen", frist: tag(10), nachricht: "Bitte um indikatives Term Sheet (Demo).", gesendetAm: vorTagen(20), verlauf: [{ am: vorTagen(20), text: "Anfrage gesendet", fuerBank: true }], ...x };
    F.anfragen.push(a);
    return a;
  };
  const TS = (a, von, daten, tage) => F.termsheets.push({ id: neueId("FT"), anfrageId: a.id, fallId: a.fallId, bankId: a.bankId, von, vonId: von === "bank" ? konto?.id : admin?.id, am: vorTagen(tage), termsheet: termsheetBereinigen(daten) });
  const a11 = A(f1, b1, { status: "termsheet" });
  TS(a11, "bank", { betrag: Math.round(f1.betragWunsch * 0.95), laufzeitJahre: 18, zinsArt: "fix", zinsPct: 4.35, tilgungsprofil: "annuitaet", tilgungsfreiJahre: 1, dscrSizing: 1.15, dscrCovenant: 1.05, dscrLockup: 1.1, dsraMonate: 6, bearbeitungPct: 0.75, sicherheiten: ["uebereignung", "abtretung", "konten", "dienstbarkeit"], cps: CP_STANDARD.map((c) => c.id).slice(0, 10), gueltigBis: tag(40), bemerkung: "Indikativ, vorbehaltlich Kreditentscheidung (Demo)." }, 6);
  a11.verlauf.push({ am: vorTagen(6), text: "Term Sheet von der Bank eingereicht", fuerBank: true });
  const a12 = A(f1, b2, { status: "termsheet" });
  TS(a12, "backoffice", { betrag: f1.betragWunsch, laufzeitJahre: 18, zinsArt: "euribor6", referenzAnnahmePct: 2.7, margePct: 1.65, tilgungsprofil: "skulptiert", dscrSizing: 1.2, dscrCovenant: 1.05, dscrLockup: 1.1, llcrCovenant: 1.1, dsraMonate: 6, bearbeitungPct: 1.25, sicherheiten: ["uebereignung", "abtretung", "verpfaendung", "konten", "direct"], cps: CP_STANDARD.map((c) => c.id), gueltigBis: tag(30), bemerkung: "Per E-Mail erhalten, im Backoffice erfasst (Demo). Zinssicherung (Swap) Pflicht." }, 4);
  a12.verlauf.push({ am: vorTagen(4), text: "Term Sheet durch ÖkoInvest erfasst", fuerBank: true });
  A(f1, b3, { status: "abgesagt", verlauf: [{ am: vorTagen(20), text: "Anfrage gesendet", fuerBank: true }, { am: vorTagen(9), text: "Absage der Bank: Projekte in Deutschland derzeit nur ab 20 MWp (Demo).", fuerBank: true }] });

  // ---------------------------------------------------------------- Fälle 2/3: Anlagen im Betrieb (Covenants)
  const anlagen = db.anlagen?.anlagen || [];
  // Agri-PV: hoch aufgeständert (Capex höher), Kredit knapp bemessen → mit der simulierten Minderleistung Frühwarnung bzw. Lock-up
  for (const [typ, dscr, capexKwp, fkMax, titel, bank] of [["freiflaeche", 1.55, 520, 0.8, "Refinanzierung", b2], ["agri", 1.12, 950, 0.69, "Projektfinanzierung", b1]]) {
    const a = anlagen.find((x) => x.typ === typ && x.demo);
    if (!a) continue;
    const vertrag = (db.anlagen.vertraege || []).find((c) => c.anlageId === a.id);
    const s = cockpitStandard({ land: a.land, typ, mwp: a.kwp / 1000 });
    const e = cockpitBereinigen({ ...s, capex: Math.round(a.kwp * capexKwp), modell: "contracting", preisCt: vertrag?.strompreisCt || s.preisCt, lieferAnteil: 0.6, indexierung: 0.015, vertragJahre: vertrag?.laufzeitJahre || 20, pachtJahr: typ === "agri" ? 2500 : s.pachtJahr });
    const zins = 4.4;
    const betrag = typ === "agri" ? Math.round((e.capex * fkMax) / 1000) * 1000 : betragFuer(db, a, e, dscr, zins / 100, 18, fkMax);
    const beginn = (a.inbetriebnahme || "2024-01-01").slice(0, 10);
    const f = fall({
      titel: `${a.name.replace(" (Demo)", "")} – ${titel} (fiktiv)`, spv: a.eigentuemer || "ÖkoInvest-Projektgesellschaft (fiktiv)", bezugArt: "anlage", bezugId: a.id, eingaben: e, betragWunsch: betrag, status: "auszahlung",
      paketFreigabe: ["steckbrief", "financial_model", "ertragsgutachten", "pacht", "netz", "epc", "om", "erloes", "genehmigung"],
      entscheidung: { anfrageId: null, termsheetId: null, bankId: bank.id, bank: bank.name, begruendung: "Bestandsfinanzierung (Demo) – vor Einführung der Plattform entschieden.", am: beginn, vonId: admin?.id || null, von: "Demo-Backoffice", kennzahlen: null },
      kreditvertrag: {
        nummer: `KV-DEMO-${typ.toUpperCase().slice(0, 3)}-01`, unterzeichnetAm: beginn, auszahlungAm: beginn, bank: bank.name, betrag, zinsPct: zins, laufzeitJahre: 18, tilgungsprofil: "annuitaet", tilgungsfreiJahre: 0,
        dscrCovenant: 1.05, dscrLockup: 1.1, llcrCovenant: null, dsraMonate: 6,
        berichtspflichten: ["Quartalsbericht mit DSCR (rollierend 12 Monate) binnen 45 Tagen nach Quartalsende", "Jahresabschluss der SPV binnen 6 Monaten", "Jährlicher technischer Betriebsbericht", "Versicherungsnachweis jährlich"],
      },
      reporting: { intervall: "quartal", naechsteFrist: tag(typ === "agri" ? -3 : 36), zuletzt: vorTagen(80), gemahnt: false },
      verlauf: [{ am: vorTagen(30), von: "Demo-Backoffice", text: "Bestandsfinanzierung übernommen (Demo)" }],
    });
    for (const c of f.cps) Object.assign(c, { erledigt: true, am: beginn, von: "Demo-Backoffice", nachweis: "Auszahlung erfolgt (Demo)" });
  }

  // ---------------------------------------------------------------- Szenario des Demo-Investors
  const inv = db.nutzer.find((u) => u.email === "investor@example.com");
  if (inv) {
    const e = cockpitStandard({ land: "DE", mwp: 10 });
    F.szenarien.push({ id: neueId("FS"), nutzerId: inv.id, projektId: null, projektTitel: "", name: "Freifläche 10 MWp – Basis (Demo)", fokus: "skulptiert", eingaben: e, ergebnis: ergebnisKurz(rechneCockpit(e)), am: vorTagen(3) });
  }
}
