// scripts/plattform-test-portfolio.mjs
//
// Investor-Portfolio nach dem Kauf (Team 2 „Investor“).
//   node scripts/plattform-test-portfolio.mjs [basis-url]        (--nur-logik: nur Teil A, ohne Server)
//
// Teil A – reine Logik (portfolio/kern.js, portfolio/bericht.js): Zustandsautomat, Soll/Ist mit Degradation, DSCR/Lock-up/Default
//   (saisonbereinigt), Kapitalabrufe (Frist ≥ 10 Tage, Zusage, Status), Ausschüttungssperre, Quellensteuer-Hinweis, Kennzahlen
//   (Paid-in, DPI, Cash-Rendite), Perioden, Steuerhinweise DE/AT/CH, Wiederverkauf/Börsen-Entwurf, Closing-Übernahme, Bericht.
// Teil B – gegen den laufenden Dev-Server (eigene Positionen „pf-test-<Lauf>“ für investor@example.com, eigenes Fremdkonto):
//   Demo-Portfolio (Bestand DE/AT, Co-Development), Rechte (fremd 404, Unterrollen, CSRF), KYC-Pflicht (409 „kyc“),
//   Monatsertrag, Ausschüttung + Storno, Lock-up, Kapitalabruf melden → bestätigen, Benachrichtigung, Bericht-PDF Quartal/Jahr,
//   Dokument-Upload/Download, Wiederverkauf → Börsen-Entwurf → Provision, Fristenlauf, Seiten.

import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const WURZEL = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const lade = (p) => import(pathToFileURL(path.join(WURZEL, p)).href);
const NUR_LOGIK = process.argv.includes("--nur-logik");
const BASIS = (process.argv.find((a) => a.startsWith("http")) || process.env.PLATTFORM_TEST_URL || "http://localhost:3100").replace(/\/$/, "");
const DEMO_PASSWORT = process.env.PLATTFORM_DEMO_PASSWORT || "Demo-2026!";
const LAUF = Date.now().toString(36);
const PASSWORT = "Portfolio-Test-2026";

let ok = 0;
let fehler = 0;
const gruen = (s) => `\x1b[32m${s}\x1b[0m`;
const rot = (s) => `\x1b[31m${s}\x1b[0m`;
function pruefe(bedingung, text, details) {
  if (bedingung) {
    ok++;
    console.log(`  ${gruen("✓")} ${text}`);
  } else {
    fehler++;
    console.log(`  ${rot("✗")} ${text}${details !== undefined ? ` – ${JSON.stringify(details).slice(0, 500)}` : ""}`);
  }
  return bedingung;
}
const abschnitt = (t) => console.log(`\n${t}`);
const wirft = (fn) => {
  try {
    fn();
    return null;
  } catch (e) {
    return e;
  }
};

// ================================================================ Teil A – Logik

async function logik() {
  const K = await lade("src/lib/plattform/portfolio/kern.js");
  const B = await lade("src/lib/plattform/portfolio/bericht.js");
  const M = await lade("src/lib/invest/markt.js");
  const heute = "2026-09-30";
  const pos = { art: "bestand", status: "betrieb", titel: "Solarpark Test (Demo)", land: "DE", mwp: 8.2, inbetriebnahme: "2022-07", p50KwhJahr: 8692000, verguetungCt: 6.4, opexJahr: 74000, schuldendienstJahr: 380000, anteilProzent: 100, kaufpreis: 5740000, kaufdatum: "2025-03-14" };
  const F = [0.97, 1.03, 0.94, 1.01, 0.99, 1.05, 0.96, 0.92, 1.02, 0.98, 1.04, 0.95];
  const ertr = (p, faktor = 1, n = 12, bis = "2026-08") => K.monateBis(bis, n).map((m, i) => ({ monat: m, kwh: Math.round(K.sollMonat(p, m) * F[i % 12] * faktor) }));

  abschnitt("A1. Zustandsautomat und Closing-Übernahme");
  pruefe(K.uebergangPruefen("uebernahme", "betrieb") === "betrieb" && K.uebergangPruefen("betrieb", "verkauf_angefragt") === "verkauf_angefragt", "Übernahme → Betrieb, Betrieb → Wiederverkauf angefragt");
  let e = wirft(() => K.uebergangPruefen("verkauft", "betrieb"));
  pruefe(e?.status === 409, "Verkauft → Betrieb → 409", e?.message);
  pruefe(wirft(() => K.uebergangPruefen("betrieb", "xyz"))?.status === 422, "Unbekannter Status → 422");
  const P = [{ schluessel: "a" }, { schluessel: "b" }];
  pruefe(K.statusNachUebergabe("bestand", [{ schluessel: "a", erledigt: true }], P) === "uebernahme" && K.statusNachUebergabe("bestand", [{ schluessel: "a", erledigt: true }, { schluessel: "b", erledigt: true }], P) === "betrieb" && K.statusNachUebergabe("projekt", [{ schluessel: "a", erledigt: true }, { schluessel: "b", erledigt: true }], P) === "bau", "Übergabe vollständig → Betrieb (Bestand) bzw. Bau (Projekt)");
  const x = K.positionAusClosing({ id: "CL-1", projektId: "P-1", land: "AT", kaufpreis: 1e6, vollzogenAm: "2026-09-01", anteilProzent: 49 }, { titel: "X", mwp: 2, phase: "rtb", vertraulich: { ertragKwhKwp: 1050 }, datenblatt: { eegZuschlagCt: 5.2 } });
  pruefe(x.art === "projekt" && x.status === "uebernahme" && x.p50KwhJahr === 2100000 && x.verguetungCt === 5.2 && x.opexJahr === 2000 * M.FREIFLAECHE.opexProKwp && x.anteilProzent === 49, "Position aus Closing: Art, P50 aus Exposé, Vergütung aus Datenblatt, Opex aus Markt", x);

  abschnitt("A2. Ertrag Soll/Ist, DSCR und Lock-up");
  pruefe(K.sollMonat(pos, "2022-06") === null && Math.abs(K.sollMonat(pos, "2026-07") - 8692000 * 0.135 * (1 - M.FREIFLAECHE.degradation) ** 4) < 1e-6, "Soll erst ab Inbetriebnahme, Degradation je Betriebsjahr");
  pruefe(Math.abs(M.ALLGEMEIN.pvMonatsanteile.reduce((s, x) => s + x, 0) - 1) < 1e-9, "Monatsverteilung summiert auf 1");
  const eg = K.ertragAuswertung(pos, ertr(pos), { bis: "2026-08" });
  pruefe(eg.summe12.monate === 12 && eg.ampel === "gruen" && eg.spezifisch12 > 900, "12 Monate Ist ≈ Soll → grün, spezifischer Ertrag", eg.summe12);
  pruefe(K.ertragAuswertung(pos, ertr(pos, 0.93), { bis: "2026-08" }).ampel === "gelb" && K.ertragAuswertung(pos, ertr(pos, 0.88), { bis: "2026-08" }).ampel === "rot", "−7 % → gelb, −12 % → rot");
  const cg = K.covenantAuswertung(pos, ertr(pos), { bis: "2026-08" });
  pruefe(cg.ampel === "gruen" && cg.dscr > M.FINANZIERUNG.projekt.dscrLockup && !cg.gesperrt, "DSCR über Lock-up → grün, keine Sperre", cg);
  const cy = K.covenantAuswertung({ ...pos, schuldendienstJahr: 440000 }, ertr(pos), { bis: "2026-08" });
  pruefe(cy.ampel === "gelb" && cy.gesperrt && /Lock-up/.test(cy.grund) && /\d,\d\d/.test(cy.grund), "DSCR unter Lock-up → gelb, Ausschüttungssperre (deutsches Zahlformat)", cy);
  const cr = K.covenantAuswertung({ ...pos, schuldendienstJahr: 480000 }, ertr(pos), { bis: "2026-08" });
  pruefe(cr.ampel === "rot" && /Event of Default/.test(cr.grund), "DSCR unter Default → rot");
  pruefe(K.covenantAuswertung(pos, ertr(pos, 1, 4), { bis: "2026-08" }).ampel === "grau" && K.covenantAuswertung(pos, ertr(pos, 1, 8), { bis: "2026-08" }).hochgerechnet === true, "< 6 Monate → grau; 8 Monate → saisonbereinigt hochgerechnet");
  pruefe(K.covenantAuswertung({ ...pos, schuldendienstJahr: 0 }, [], {}).aktiv === false, "Ohne Fremdkapital keine Covenants");

  abschnitt("A3. Kapitalabrufe und Ausschüttungen");
  const cd = { art: "codev", status: "entwicklung", zusage: 1000000 };
  const a1 = K.abrufPruefen(cd, [], { betrag: 250000, faelligAm: "2026-10-10", zweck: "Netzanschluss" }, { heute });
  pruefe(a1.nummer === 1 && a1.betrag === 250000 && a1.angekuendigtAm === heute, "Abruf innerhalb der Zusage mit 10 Tagen Frist");
  e = wirft(() => K.abrufPruefen(cd, [], { betrag: 1, faelligAm: "2026-10-05", zweck: "Netzanschluss" }, { heute }));
  pruefe(e?.status === 422 && /10 Tage/.test(e.message), "Frist < 10 Tage → 422", e?.message);
  pruefe(wirft(() => K.abrufPruefen(cd, [{ betrag: 900000, status: "bezahlt" }], { betrag: 200000, faelligAm: "2026-11-01", zweck: "Netzanschluss" }, { heute }))?.status === 422, "Über offener Zusage → 422");
  pruefe(K.abrufPruefen(cd, [{ betrag: 900000, status: "storniert" }], { betrag: 200000, faelligAm: "2026-11-01", zweck: "Netzanschluss" }, { heute }).nummer === 2, "Stornierte Abrufe zählen nicht zur Zusage");
  pruefe(wirft(() => K.abrufPruefen({ art: "bestand", status: "betrieb", zusage: 0 }, [], {}, { heute }))?.status === 409, "Bestand ohne Zusage → 409");
  const ab = { status: "angekuendigt", faelligAm: "2026-09-20" };
  pruefe(K.abrufVerzug(ab, heute) === 10 && K.abrufAktion(ab, "melden", {}, { heute, rolle: "investor" }).status === "gemeldet", "Verzug in Tagen; Investor meldet Zahlung");
  pruefe(wirft(() => K.abrufAktion(ab, "bestaetigen", {}, { heute, rolle: "investor" }))?.status === 409 && K.abrufAktion({ status: "gemeldet" }, "bestaetigen", {}, { heute, rolle: "backoffice" }).status === "bezahlt", "Nur Backoffice bestätigt den Eingang");
  pruefe(wirft(() => K.abrufAktion({ status: "gemeldet" }, "bestaetigen", { datum: "2026-10-29" }, { heute, rolle: "backoffice" }))?.status === 422, "Eingang in der Zukunft → 422");
  const d0 = { art: "gewinn", betrag: 50000, periode: "2025", datum: "2026-09-15" };
  pruefe(K.ausschuettungPruefen(pos, d0, { heute }).status === "gebucht", "Ausschüttung buchen");
  pruefe(wirft(() => K.ausschuettungPruefen(pos, d0, { heute, covenant: cy }))?.status === 409 && K.ausschuettungPruefen(pos, { ...d0, bankZustimmung: true }, { heute, covenant: cy }).bankZustimmung, "Lock-up: nur mit Zustimmung der Bank");
  pruefe(K.ausschuettungPruefen(pos, { ...d0, art: "verkauf" }, { heute, covenant: cy }).art === "verkauf", "Verkaufserlös unterliegt nicht der Sperre");
  pruefe(["periode:2025-Q5", "datum:2027-01-01", "art:x", "betrag:0"].every((f) => { const [k, w] = f.split(":"); return wirft(() => K.ausschuettungPruefen(pos, { ...d0, [k]: w }, { heute }))?.status === 422; }), "Periode/Datum/Art/Betrag validiert");
  pruefe(K.quellensteuerHinweis("AT", "gewinn")?.satz === M.FINANZIERUNG.quellensteuerAusschuettung.AT && K.quellensteuerHinweis("DE", "entnahme") === null && /Verrechnungssteuer/.test(K.quellensteuerHinweis("CH", "gewinn").text), "Quellensteuer-Hinweis AT/CH, keiner bei Entnahme");
  const kz = K.cashflowKennzahlen({ ...pos, anteilProzent: 50, kaufpreis: 2000000 }, { ausschuettungen: [{ betrag: 100000, datum: "2026-06-01", status: "gebucht" }, { betrag: 50000, datum: "2025-01-01", status: "gebucht" }, { betrag: 9e6, datum: "2026-06-01", status: "storniert" }] }, { heute });
  pruefe(kz.paidIn === 1000000 && kz.ausgeschuettet === 150000 && kz.ausgeschuettet12 === 100000 && kz.dpi === 0.15 && kz.cashRendite12 === 0.1, "Paid-in (Anteil), DPI, Cash-Rendite 12 Monate, Storno zählt nicht", kz);
  const kc = K.cashflowKennzahlen(cd, { abrufe: [{ betrag: 300000, status: "bezahlt" }, { betrag: 100000, status: "angekuendigt" }] }, { heute });
  pruefe(kc.paidIn === 300000 && kc.zusage.offen === 600000 && kc.zusage.quote === 0.4, "Co-Development: Paid-in = bezahlte Abrufe, offene Zusage");

  abschnitt("A4. Berichte, Steuern, Wiederverkauf");
  pruefe(K.periodeMonate("quartal", "2026-Q2").join() === "2026-04,2026-05,2026-06" && K.periodeMonate("jahr", "2025").length === 12 && K.periodeStandard("quartal", heute) === "2026-Q2" && K.periodeStandard("quartal", "2026-02-10") === "2025-Q4" && K.periodeStandard("jahr", heute) === "2025", "Perioden und Standardperiode");
  const pa = K.periodenAuswahl({ kaufdatum: "2025-03-15" }, heute);
  pruefe(pa.quartal[0] === "2026-Q2" && pa.quartal.at(-1) === "2025-Q1" && pa.jahr.join() === "2025", "Berichtsauswahl ab Kauf", pa);
  pruefe(["DE", "AT", "CH"].every((l) => K.steuerHinweise(l).punkte.length === 3) && /§ 29 GewStG/.test(K.steuerHinweise("DE").punkte.join()) && /KESt/.test(K.steuerHinweise("AT").punkte.join()) && /keine Steuerberatung/.test(K.steuerHinweise("CH").hinweis), "Steuerhinweise je Land (vorsichtig, keine Beratung)");
  const wv = K.wiederverkaufPruefen({ ...pos, anteilProzent: 49 }, { zeitpunkt: "2026-12", grund: "Portfolio-Umschichtung 2027", anteilProzent: 49 }, { heute });
  pruefe(wv.struktur === "share" && wv.anteilProzent === 49 && wv.vorherStatus === "betrieb", "Wiederverkauf-Anfrage bereinigt");
  pruefe(["zeitpunkt:2026-01", "grund:kurz", "anteilProzent:60", "preisvorstellung:abc"].every((f) => { const [k, w] = f.split(":"); return wirft(() => K.wiederverkaufPruefen({ ...pos, anteilProzent: 49 }, { zeitpunkt: "2026-12", grund: "Portfolio-Umschichtung 2027", [k]: w }, { heute }))?.status === 422; }), "Zeitpunkt, Grund, Anteil, Preis validiert");
  pruefe(wirft(() => K.wiederverkaufPruefen({ ...pos, status: "uebernahme" }, {}, { heute }))?.status === 409, "Wiederverkauf während der Übernahme → 409");
  const be = K.boerseEntwurf(pos, { ...wv, preisvorstellung: 6000000 });
  pruefe(be.phase === "cod" && be.netzanschluss === "vorhanden" && be.preisModus === "gesamt" && be.preis === 6000000 && !/Demo/.test(be.titel) && /49 %/.test(be.titel), "Börsen-Entwurf: Bestand, Preis, Titel ohne „(Demo)“", be);
  const br = B.berichtRechnen(pos, { ertraege: ertr(pos, 1, 18), abrufe: [], ausschuettungen: [{ art: "entnahme", periode: "2026", betrag: 110000, datum: "2026-05-15", status: "gebucht" }] }, { art: "quartal", periode: "2026-Q2", heute });
  pruefe(br.monate.length === 3 && br.ertrag.monate.length === 3 && br.summeAusschuettung === 110000 && br.covenant.aktiv, "Bericht Q2: 3 Monate, Ausschüttung im Zeitraum, Covenant", br.summeAusschuettung);
  const doks = B.berichtDokumente({ ...pos, id: "PO-1" }, B.berichtRechnen(pos, { ertraege: ertr(pos, 1, 24) }, { art: "jahr", periode: "2025", heute }), { empfaenger: "Test" });
  const txt = JSON.stringify(doks);
  pruefe(doks.length === 1 && /Jahresbericht 2025/.test(doks[0].titel) && /Steuerunterlagen/.test(txt) && /keine Anlage- oder Steuerberatung/.test(txt), "Jahresbericht mit Steuerabschnitt und Hinweis");
}

// ================================================================ Teil B – HTTP

class Client {
  constructor(name) {
    this.name = name;
    this.cookie = "";
  }
  async anfrage(methode, pfad, body, { origin = BASIS, kopf = {}, roh = false } = {}) {
    const headers = { ...kopf };
    if (origin) headers.Origin = origin;
    if (this.cookie) headers.Cookie = this.cookie;
    let payload;
    if (body !== undefined) {
      if (body instanceof FormData) payload = body;
      else {
        headers["Content-Type"] ||= "application/json";
        payload = typeof body === "string" ? body : JSON.stringify(body);
      }
    }
    let res;
    for (let versuch = 1; ; versuch++) {
      try {
        res = await fetch(BASIS + pfad, { method: methode, headers, body: payload, redirect: "manual", signal: AbortSignal.timeout(180000) });
        if (res.status >= 500 && /text\/html/.test(res.headers.get("content-type") || "") && pfad.startsWith("/api/") && versuch < 4) {
          await new Promise((r) => setTimeout(r, 3000 * versuch));
          continue;
        }
        break;
      } catch (e) {
        if (versuch >= 3) throw e;
        await new Promise((r) => setTimeout(r, 5000 * versuch));
      }
    }
    for (const c of res.headers.getSetCookie?.() || []) {
      const [paar] = c.split(";");
      const [name, wert] = paar.split("=");
      if (/oi_sitzung$/.test(name)) this.cookie = wert ? `${name}=${wert}` : "";
    }
    if (roh) return { status: res.status, typ: res.headers.get("content-type") || "", daten: Buffer.from(await res.arrayBuffer()) };
    const text = await res.text();
    let json = null;
    try {
      json = JSON.parse(text);
    } catch {
      json = { text: text.slice(0, 200) };
    }
    return { status: res.status, json, text };
  }
  get = (p, o) => this.anfrage("GET", p, undefined, o);
  post = (p, b, o) => this.anfrage("POST", p, b ?? {}, o);
  patch = (p, b, o) => this.anfrage("PATCH", p, b ?? {}, o);
  async login(email, passwort = DEMO_PASSWORT) {
    let r = await this.post("/api/auth/login", { email, passwort });
    for (let i = 1; r.status >= 500 && i <= 3; i++) {
      await new Promise((x) => setTimeout(x, 4000 * i));
      r = await this.post("/api/auth/login", { email, passwort });
    }
    if (r.status !== 200) throw new Error(`Login ${email}: ${r.status} ${JSON.stringify(r.json)}`);
    this.nutzer = r.json.nutzer;
    return r.json.nutzer;
  }
  async registrieren(schluessel, rollen) {
    const email = `pf-test-${LAUF}-${schluessel}@example.com`;
    const r = await this.post("/api/auth/registrieren", { email, passwort: PASSWORT, vorname: "Portfolio", nachname: `Test ${schluessel}`, rollen, agb: true });
    if (r.status === 409) return this.login(email, PASSWORT);
    if (r.status !== 201) throw new Error(`Registrierung ${email}: ${r.status} ${JSON.stringify(r.json)}`);
    this.nutzer = r.json.nutzer;
    return r.json.nutzer;
  }
}

const tag = (n) => new Date(Date.now() + n * 864e5).toLocaleDateString("sv-SE", { timeZone: "Europe/Vienna" });
const monatVor = (n) => {
  const d = new Date();
  d.setUTCDate(15);
  d.setUTCMonth(d.getUTCMonth() - n);
  return d.toISOString().slice(0, 7);
};
const PDF_MINI = Buffer.from("%PDF-1.4\n1 0 obj<</Type/Catalog>>endobj\ntrailer<</Root 1 0 R>>\n%%EOF\n");

async function http() {
  const admin = new Client("admin");
  const investor = new Client("investor");
  const fremd = new Client("fremd");
  const akquise = new Client("bo-akquise");
  const buchhaltung = new Client("bo-buchhaltung");
  const lesen = new Client("bo-lesen");
  let r;

  abschnitt("B1. Demo-Portfolio und Rechte");
  await admin.login("admin@example.com");
  await investor.login("investor@example.com");
  await akquise.login("bo-akquise@example.com");
  await buchhaltung.login("bo-buchhaltung@example.com");
  await lesen.login("bo-lesen@example.com");
  await fremd.registrieren("fremd", ["investor"]);
  r = await investor.get("/api/portal/portfolio");
  const pos = r.json.positionen || [];
  pruefe(r.status === 200 && pos.length >= 3 && r.json.kennzahlen?.anzahl >= 3, "Investor: Demo-Portfolio mit ≥ 3 Positionen und Kennzahlen", r.json.kennzahlen);
  const hochfeld = pos.find((p) => p.titel === "Solarpark Hochfeld (Demo)");
  const donautal = pos.find((p) => p.titel === "Agri-PV Donautal (Demo)");
  const muehlweg = pos.find((p) => p.art === "codev");
  pruefe(hochfeld?.status === "betrieb" && hochfeld.kennzahlen.ausgeschuettet > 0 && hochfeld.dscr > 1, "Bestand DE: Betrieb, Ausschüttungen, DSCR", hochfeld && { d: hochfeld.dscr, a: hochfeld.kennzahlen.ausgeschuettet });
  pruefe(donautal?.anteilProzent === 49 && donautal.land === "AT", "Bestand AT: Anteil 49 %");
  pruefe(muehlweg?.zusage === 1200000 && muehlweg.offeneAbrufe >= 1, "Co-Development: Zusage und offener Abruf", muehlweg && { z: muehlweg.zusage, o: muehlweg.offeneAbrufe });
  if (hochfeld) {
    r = await investor.get(`/api/portal/portfolio/${hochfeld.id}`);
    const p = r.json.position || {};
    pruefe(r.status === 200 && p.ertrag?.monate?.length === 12 && p.covenant?.aktiv && p.steuer?.punkte?.length === 3 && p.perioden?.quartal?.length >= 1, "Detail: Ertrag 12 Monate, Covenants, Steuerhinweise, Berichtsperioden", { e: p.ertrag?.monate?.length, c: p.covenant?.ampel });
    pruefe(p.notizIntern === undefined && !p.investor && p.verlauf.every((e) => !("vonId" in e)), "Investor sieht keine internen Angaben");
    r = await fremd.get(`/api/portal/portfolio/${hochfeld.id}`);
    pruefe(r.status === 404, "Fremder Investor → 404", r.status);
    r = await fremd.get("/api/portal/portfolio");
    pruefe(r.status === 200 && r.json.positionen.length === 0, "Fremder Investor: leeres Portfolio");
  }
  if (muehlweg) {
    r = await investor.get(`/api/portal/portfolio/${muehlweg.id}`);
    pruefe(r.status === 200 && r.json.position.entwicklung?.meilensteine?.length > 0 && r.json.position.abrufe.length >= 3, "Co-Development: Meilensteine aus der Projektentwicklung, Abrufhistorie", { m: r.json.position?.entwicklung?.meilensteine?.length });
  }
  r = await akquise.get("/api/admin/portfolio");
  pruefe(r.status === 403, "Unterrolle Akquise → 403", r.status);
  r = await lesen.get("/api/admin/portfolio");
  pruefe(r.status === 200 && r.json.schreiben === false, "Unterrolle Lesen: lesen ja, schreiben nein");
  r = await admin.get("/api/admin/portfolio");
  pruefe(r.status === 200 && r.json.positionen.length >= 3 && r.json.kennzahlen && Array.isArray(r.json.abrufe), "Backoffice: Übersicht mit Positionen, Abrufen, Kennzahlen");
  const cl = await admin.get("/api/admin/closing?status=vollzogen");
  const vollzogen = (cl.json.closings || []).map((c) => c.id);
  const uebernommen = new Set((r.json.positionen || []).map((p) => p.id));
  if (vollzogen.length) {
    const alle = await Promise.all((r.json.positionen || []).slice(0, 60).map((p) => admin.get(`/api/admin/portfolio/${p.id}`)));
    const ids = new Set(alle.map((x) => x.json.position?.closingId).filter(Boolean));
    pruefe(vollzogen.every((id) => ids.has(id)), "Jedes vollzogene Closing ist als Position übernommen", { vollzogen, ids: [...ids] });
  } else pruefe(uebernommen.size >= 3, "Keine vollzogenen Closings in der Demo – Übernahme per Logiktest geprüft");

  abschnitt("B2. Position anlegen, KYC, Stammdaten, Ertrag");
  const auswahl = await admin.get("/api/admin/portfolio/auswahl");
  pruefe(auswahl.status === 200 && auswahl.json.investoren.some((u) => u.id === investor.nutzer.id) && auswahl.json.entwicklung.length > 0, "Auswahl: Investoren und Entwicklungsprojekte");
  r = await admin.post("/api/admin/portfolio", { art: "bestand", investorId: fremd.nutzer.id, titel: `pf-test-${LAUF} ohne KYC`, kaufpreis: 1000000 });
  pruefe(r.status === 409 && r.json.code === "kyc", "Unverifizierter Investor → 409 (kyc)", r.json);
  r = await admin.post("/api/admin/portfolio", { art: "bestand", investorId: investor.nutzer.id, titel: `pf-test-${LAUF} Testpark`, kaufpreis: 2000000, mwp: 2, land: "DE", typ: "freiflaeche", spvName: "Testpark GmbH & Co. KG (fiktiv)" }, { origin: null });
  pruefe(r.status === 403, "Ohne Origin → 403 (CSRF)", r.status);
  r = await admin.post("/api/admin/portfolio", { art: "bestand", investorId: investor.nutzer.id, titel: `pf-test-${LAUF} Testpark`, kaufpreis: 2000000, mwp: 2, land: "DE", typ: "freiflaeche", spvName: "Testpark GmbH & Co. KG (fiktiv)" });
  const tp = r.json.position;
  pruefe(r.status === 200 && tp?.status === "betrieb", "Bestand angelegt → Betrieb", r.json);
  r = await admin.patch(`/api/admin/portfolio/${tp.id}`, { p50KwhJahr: 2100000, verguetungCt: 6.2, opexJahr: 18000, schuldendienstJahr: 150000, inbetriebnahme: "2024-01" });
  pruefe(r.status === 200 && r.json.position.stammdaten.p50KwhJahr === 2100000 && r.json.position.covenant.aktiv, "Stammdaten: P50, Vergütung, Opex, Schuldendienst");
  r = await buchhaltung.post(`/api/admin/portfolio/${tp.id}/aktion`, { aktion: "ertrag", monat: monatVor(1), kwh: 250000, quelle: "Testlauf" });
  pruefe(r.status === 200 && r.json.position.ertrag.monate.some((m) => m.ist === 250000), "Buchhaltung erfasst Monatsertrag", r.json.error);
  r = await admin.post(`/api/admin/portfolio/${tp.id}/aktion`, { aktion: "ertrag", monat: monatVor(-2), kwh: 1 });
  pruefe(r.status === 422, "Ertrag für einen Zukunftsmonat → 422", r.status);
  r = await lesen.post(`/api/admin/portfolio/${tp.id}/aktion`, { aktion: "ertrag", monat: monatVor(2), kwh: 1 });
  pruefe(r.status === 403, "Unterrolle Lesen kann nicht schreiben", r.status);
  r = await investor.post(`/api/admin/portfolio/${tp.id}/aktion`, { aktion: "ertrag", monat: monatVor(2), kwh: 1 });
  pruefe(r.status === 403, "Investor kann keine Backoffice-Aktion ausführen", r.status);

  abschnitt("B3. Ausschüttungen und Lock-up");
  r = await admin.post(`/api/admin/portfolio/${tp.id}/aktion`, { aktion: "ausschuettung", art: "entnahme", periode: tag(0).slice(0, 4), betrag: 30000, datum: tag(0) });
  const as = r.json.position?.ausschuettungen?.[0];
  pruefe(r.status === 200 && as?.betrag === 30000 && r.json.position.kennzahlen.ausgeschuettet === 30000, "Ausschüttung gebucht", r.json.error);
  r = await investor.get("/api/portal/benachrichtigungen?limit=30");
  pruefe(r.status === 200 && (r.json.eintraege || r.json.benachrichtigungen || []).some((b) => b.art === "portfolio" && /Ausschüttung/.test(b.titel)), "Investor erhält Benachrichtigung „Ausschüttung“", Object.keys(r.json));
  r = await admin.post(`/api/admin/portfolio/${tp.id}/aktion`, { aktion: "ausschuettung_storno", ausschuettungId: as?.id, grund: "Fehlbuchung Testlauf" });
  pruefe(r.status === 200 && r.json.position.kennzahlen.ausgeschuettet === 0, "Storno: Kennzahlen ohne stornierte Ausschüttung");
  r = await admin.post(`/api/admin/portfolio/${tp.id}/aktion`, { aktion: "ausschuettung_storno", ausschuettungId: as?.id, grund: "Fehlbuchung Testlauf" });
  pruefe(r.status === 409, "Doppeltes Storno → 409", r.status);
  if (donautal) {
    const d = (await admin.get(`/api/admin/portfolio/${donautal.id}`)).json.position;
    if (d?.covenant?.gesperrt) {
      r = await admin.post(`/api/admin/portfolio/${donautal.id}/aktion`, { aktion: "ausschuettung", art: "gewinn", periode: tag(0).slice(0, 4), betrag: 1000, datum: tag(0) });
      pruefe(r.status === 409 && /Ausschüttungssperre/.test(r.json.error), "Lock-up (Demo AT): Ausschüttung ohne Bankzustimmung → 409", r.json.error);
    } else pruefe(true, `Demo AT ohne Lock-up (DSCR ${d?.covenant?.dscr}) – Sperre per Logiktest geprüft`);
  }

  abschnitt("B4. Kapitalabrufe (Capital Calls)");
  r = await admin.post("/api/admin/portfolio", { art: "projekt", investorId: investor.nutzer.id, titel: `pf-test-${LAUF} Projekt`, kaufpreis: 500000, zusage: 400000, mwp: 5, land: "AT", typ: "agri" });
  const pk = r.json.position;
  pruefe(r.status === 200 && pk?.status === "bau" && pk.zusage === 400000, "Projektkauf mit Kapitalzusage → Bau");
  r = await admin.post(`/api/admin/portfolio/${pk.id}/aktion`, { aktion: "abruf", betrag: 100000, faelligAm: tag(4), zweck: "Netzanschluss Testlauf" });
  pruefe(r.status === 422 && /10 Tage/.test(r.json.error), "Frist < 10 Tage → 422", r.json.error);
  r = await admin.post(`/api/admin/portfolio/${pk.id}/aktion`, { aktion: "abruf", betrag: 500000, faelligAm: tag(20), zweck: "Netzanschluss Testlauf" });
  pruefe(r.status === 422 && /Zusage/.test(r.json.error), "Über der Zusage → 422", r.json.error);
  r = await admin.post(`/api/admin/portfolio/${pk.id}/aktion`, { aktion: "abruf", betrag: 100000, faelligAm: tag(20), zweck: "Netzanschluss Testlauf", meilenstein: "Netzanschlusszusage" });
  const ka = r.json.position?.abrufe?.[0];
  pruefe(r.status === 200 && ka?.status === "angekuendigt" && ka.nummer === 1, "Abruf angekündigt");
  r = await fremd.post(`/api/portal/portfolio/${pk.id}`, { aktion: "abruf_melden", abrufId: ka?.id });
  pruefe(r.status === 404, "Fremder kann keinen Abruf melden", r.status);
  r = await investor.post(`/api/portal/portfolio/${pk.id}`, { aktion: "abruf_melden", abrufId: ka?.id, referenz: `T-${LAUF}` });
  pruefe(r.status === 200 && r.json.position.abrufe[0].status === "gemeldet", "Investor meldet Zahlung", r.json.error);
  r = await investor.post(`/api/portal/portfolio/${pk.id}`, { aktion: "abruf_melden", abrufId: ka?.id });
  pruefe(r.status === 409, "Doppelt melden → 409", r.status);
  r = await admin.post(`/api/admin/portfolio/${pk.id}/aktion`, { aktion: "abruf_bestaetigen", abrufId: ka?.id });
  pruefe(r.status === 200 && r.json.position.abrufe[0].status === "bezahlt" && r.json.position.kennzahlen.paidIn === 600000, "Eingang bestätigt → Paid-in = Kaufpreis + Abruf", r.json.position?.kennzahlen);
  r = await admin.post("/api/admin/portfolio/fristen", {});
  pruefe(r.status === 200 && r.json.lauf?.ok, "Fristenlauf (Erinnerung, Verzug, Covenants)", r.json);

  abschnitt("B5. Berichte und Dokumente");
  r = await investor.get(`/api/portal/portfolio/${hochfeld?.id}/bericht?art=quartal`, { roh: true });
  pruefe(r.status === 200 && r.typ.includes("application/pdf") && r.daten.subarray(0, 5).toString() === "%PDF-", "Quartalsbericht als PDF", r.status);
  r = await investor.get(`/api/portal/portfolio/${hochfeld?.id}/bericht?art=jahr&periode=${Number(tag(0).slice(0, 4)) - 1}`, { roh: true });
  pruefe(r.status === 200 && r.daten.length > 2000, "Jahresbericht als PDF", r.status);
  r = await investor.get(`/api/portal/portfolio/${hochfeld?.id}/bericht?art=quartal&periode=2026-Q9`);
  pruefe(r.status === 422, "Ungültige Periode → 422", r.status);
  r = await fremd.get(`/api/portal/portfolio/${hochfeld?.id}/bericht?art=quartal`);
  pruefe(r.status === 404, "Fremder: kein Bericht", r.status);
  const fd = new FormData();
  fd.append("datei", new Blob([PDF_MINI], { type: "application/pdf" }), "jahresabschluss-test.pdf");
  fd.append("art", "jahresabschluss");
  fd.append("freigabe", "1");
  r = await admin.anfrage("POST", `/api/admin/portfolio/${tp.id}/dokumente`, fd, { kopf: { "X-Plattform-Upload": "1" } });
  const dok = r.json.dokument;
  pruefe(r.status === 200 && dok?.freigabe, "Dokument hochgeladen und freigegeben", r.json);
  const fd2 = new FormData();
  fd2.append("datei", new Blob([PDF_MINI], { type: "application/pdf" }), "intern.pdf");
  fd2.append("freigabe", "0");
  r = await admin.anfrage("POST", `/api/admin/portfolio/${tp.id}/dokumente`, fd2, { kopf: { "X-Plattform-Upload": "1" } });
  const intern = r.json.dokument;
  r = await investor.get(`/api/portal/portfolio/dokumente/${dok?.id}`, { roh: true });
  pruefe(r.status === 200 && r.daten.subarray(0, 5).toString() === "%PDF-", "Investor lädt freigegebenes Dokument", r.status);
  r = await investor.get(`/api/portal/portfolio/dokumente/${intern?.id}`);
  pruefe(r.status === 404, "Internes Dokument für den Investor unsichtbar", r.status);
  r = await fremd.get(`/api/portal/portfolio/dokumente/${dok?.id}`);
  pruefe(r.status === 404, "Fremder: Dokument → 404", r.status);

  abschnitt("B6. Wiederverkauf über die Börse");
  r = await investor.post(`/api/portal/portfolio/${tp.id}`, { aktion: "wiederverkauf", zeitpunkt: tag(-30).slice(0, 7), grund: "Testlauf Wiederverkauf" });
  pruefe(r.status === 422, "Zeitpunkt in der Vergangenheit → 422", r.status);
  r = await investor.post(`/api/portal/portfolio/${tp.id}`, { aktion: "wiederverkauf", zeitpunkt: tag(40).slice(0, 7), struktur: "share", grund: "Testlauf Wiederverkauf der Position", preisvorstellung: 2300000 });
  pruefe(r.status === 200 && r.json.position.status === "verkauf_angefragt" && r.json.position.darf.zurueckziehen, "Wiederverkauf angefragt", r.json.error);
  r = await admin.post(`/api/admin/portfolio/${tp.id}/aktion`, { aktion: "status", nach: "verkauf_boerse" });
  pruefe(r.status === 409, "Börse nur über „In die Börse übernehmen“ → 409", r.status);
  r = await admin.post(`/api/admin/portfolio/${tp.id}/aktion`, { aktion: "boerse" });
  const bp = r.json.position?.wiederverkauf?.boerse;
  pruefe(r.status === 200 && r.json.position.status === "verkauf_boerse" && bp?.status === "entwurf" && !bp.provisionAkzeptiert, "Börsen-Entwurf angelegt (Anbieter = Investor)", r.json.error);
  r = await investor.post(`/api/portal/portfolio/${tp.id}`, { aktion: "provision_akzeptieren" });
  pruefe(r.status === 200 && r.json.position.wiederverkauf.boerse.provisionAkzeptiert, "Investor nimmt Verkäuferprovision an", r.json.error);
  r = await admin.post(`/api/admin/portfolio/${tp.id}/aktion`, { aktion: "status", nach: "betrieb", grund: "Testlauf beendet" });
  pruefe(r.status === 200 && r.json.position.status === "betrieb", "Backoffice beendet den Wiederverkauf (zurück in Betrieb)");
  r = await admin.post(`/api/admin/portfolio/${tp.id}/aktion`, { aktion: "status", nach: "beendet", grund: "Testlauf aufgeräumt" });
  await admin.post(`/api/admin/portfolio/${pk.id}/aktion`, { aktion: "status", nach: "beendet", grund: "Testlauf aufgeräumt" });
  pruefe(r.status === 200 && r.json.position.status === "beendet", "Testposition beendet");

  abschnitt("B7. Seiten");
  r = await investor.get("/portal/portfolio");
  pruefe(r.status === 200 && r.text.includes("Portfolio") && r.text.includes("Solarpark Hochfeld"), "Seite /portal/portfolio", r.status);
  r = await investor.get(`/portal/portfolio/${muehlweg?.id}`);
  pruefe(r.status === 200 && r.text.includes("Kapitalabrufe") && r.text.includes("Steuerunterlagen"), "Seite Position (Co-Development)", r.status);
  r = await admin.get("/portal/admin/portfolio");
  pruefe(r.status === 200 && r.text.includes("Investoren-Portfolio"), "Seite /portal/admin/portfolio", r.status);
  r = await admin.get(`/portal/admin/portfolio/${hochfeld?.id}`);
  pruefe(r.status === 200 && r.text.includes("Ausschüttung buchen"), "Seite Backoffice-Position mit Formularen", r.status);
  r = await akquise.get("/portal/admin/portfolio");
  pruefe(r.status === 404 || !r.text.includes("Investoren-Portfolio"), "Seite für Unterrolle Akquise gesperrt", r.status);
}

async function main() {
  console.log(`Portfolio – Test (${NUR_LOGIK ? "nur Logik" : BASIS}, Lauf ${LAUF})`);
  await logik();
  if (!NUR_LOGIK) await http();
  console.log(`\n${fehler ? rot(`${fehler} Fehler`) : gruen("Alle Prüfungen bestanden")} · ${ok} ok`);
  process.exit(fehler ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
