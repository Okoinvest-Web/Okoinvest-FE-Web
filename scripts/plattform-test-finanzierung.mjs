// scripts/plattform-test-finanzierung.mjs
//
// Test „Finanzierung“: reine Logik (Node) + End-to-End gegen den laufenden Dev-Server (Demo-Backend).
//   node scripts/plattform-test-finanzierung.mjs [basis-url]      (--nur-logik: ohne Server)
//
// Logik: Annuität (Rate = markt.annuitaet, Restschuld 0), DSCR-Skulptierung (Schuldendienst = CFADS ÷ Ziel-DSCR,
// Darlehen = Barwert, Restschuld 0), Kreditbemessung auf Mindest-DSCR, Konsistenz mit rechner/solarpark.js, Leasing/Mietkauf,
// Steuer-Näherung (AfA, IFB AT), Covenant-Ampel und LTM-Prüfung, Term-Sheet-Validierung/-Vergleich, Förder-Check, Geschäftsmodell.
// API: Investor sieht das Cockpit nur für Projekte mit freigegebenem Datenraum (sonst 403), Szenario speichern/PDF/löschen nur
// eigene, Bank sieht nur Anfragen IHRER Bank und darin nur freigegebene Bausteine (Dokumente, Financial Model), Einladung nur
// mit eingeladener E-Mail, Term Sheet → Vergleich → Entscheidung nur Leitung → Bank kann nicht mehr abgeben, Covenant-Lauf mit
// Ampel, Bank-Reporting-PDF, Szenario-PDF, Unterrollen, CSRF, Seiten. Eigene Konten fz-test-<Lauf>-…@example.com.

import { annuitaet, npv, FINANZIERUNG } from "../src/lib/invest/markt.js";
import { rechneSolarpark, investition } from "../src/lib/rechner/solarpark.js";
import { tilgungsplan, skulptieren, varianteRechnen, betriebsJahre, cockpitStandard, cockpitBereinigen, rechneCockpit, afaReihe } from "../src/lib/plattform/finanzierung/kern.js";
import { covenantAmpel, covenantPruefung, termsheetBereinigen, termsheetVergleich, termsheetKennzahlen } from "../src/lib/plattform/finanzierung/bank.js";
import { foerderCheck } from "../src/lib/plattform/finanzierung/foerder.js";
import { geschaeftsmodellVergleich } from "../src/lib/plattform/finanzierung/geschaeftsmodell.js";

const BASIS = (process.argv.find((a) => /^https?:/.test(a)) || process.env.PLATTFORM_TEST_URL || "http://localhost:3100").replace(/\/$/, "");
const NUR_LOGIK = process.argv.includes("--nur-logik");
const DEMO_PASSWORT = process.env.PLATTFORM_DEMO_PASSWORT || "Demo-2026!";
const LAUF = Date.now().toString(36);
const PASSWORT = "Finanzierung-Test-Passwort-26";
const PDF = Buffer.from("%PDF-1.4\n1 0 obj<<>>endobj\ntrailer<<>>\n%%EOF\n");

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
    console.log(`  ${rot("✗")} ${text}${details !== undefined ? ` – ${JSON.stringify(details).slice(0, 400)}` : ""}`);
  }
  return bedingung;
}
const abschnitt = (t) => console.log(`\n${t}`);
const nah = (a, b, tol = 1e-6) => Math.abs(a - b) <= tol * Math.max(1, Math.abs(b));

// ================================================================ Logik

function logik() {
  abschnitt("L1. Annuität und Tilgungsplan");
  const plan = tilgungsplan({ betrag: 1_000_000, zins: 0.045, jahre: 18, profil: "annuitaet", T: 30 });
  const rate = annuitaet(1_000_000, 0.045, 18);
  pruefe(plan.dienst.slice(0, 18).every((d) => nah(d, rate, 1e-9)), "Rate jedes Jahr = markt.annuitaet (gleichbleibend)", [plan.dienst[0], rate]);
  pruefe(nah(plan.tilgung.reduce((s, x) => s + x, 0), 1_000_000, 1e-9) && plan.rest[17] < 0.01 && plan.dienst[18] === 0, "Tilgung = Darlehen, Restschuld nach 18 Jahren 0, danach kein Dienst");
  pruefe(nah(plan.zinsen[0], 45_000) && plan.tilgung[1] > plan.tilgung[0], "Zins Jahr 1 = 4,5 % des Darlehens, Tilgungsanteil steigt");
  const anl = tilgungsplan({ betrag: 1_000_000, zins: 0.04, jahre: 20, profil: "linear", anlauf: 3, T: 20 });
  pruefe(anl.tilgung.slice(0, 3).every((x) => x === 0) && nah(anl.tilgung[3], 1_000_000 / 17) && anl.rest[19] < 0.01, "Förderkredit: 3 tilgungsfreie Jahre, danach gleiche Tilgungsraten (KfW-270-Muster)");

  abschnitt("L2. DSCR-Skulptierung");
  const e = cockpitStandard({ land: "DE", mwp: 10 });
  const jahre = betriebsJahre(e);
  const cf90 = jahre.map((j) => j.cfads90);
  const s = skulptieren({ cfads: cf90, zins: 0.045, jahre: 18, dscrZiel: 1.1 });
  pruefe(s.dienst.every((d, i) => nah(d * 1.1, cf90[i], 1e-9)), "Schuldendienst × Ziel-DSCR = CFADS(P90) in jedem Jahr");
  pruefe(nah(s.betrag, npv(0.045, [0, ...s.dienst]), 1e-9), "Darlehen = Barwert des Schuldendienstes zum Kreditzins");
  const sp = tilgungsplan({ betrag: s.betrag, zins: 0.045, jahre: 18, profil: "skulptiert", dienst: s.dienst, T: 30 });
  pruefe(sp.rest[17] < 1 && sp.dienst.slice(0, 17).every((d, i) => nah(d, s.dienst[i], 1e-6)), "Skulptierter Plan tilgt genau bis Laufzeitende", sp.rest[17]);
  const v = varianteRechnen("skulptiert", { ...e, fkQuote: 0.95 }, jahre);
  pruefe(v.dscrMinP90 !== null && nah(v.dscrMinP90, e.dscrZiel, 1e-6) && !v.fkBegrenzt, "Variante skulptiert: DSCR(P90) = Ziel in allen Jahren", v.dscrMinP90);
  const vGekappt = varianteRechnen("skulptiert", { ...e, fkQuote: 0.3 }, jahre);
  pruefe(vGekappt.fkBegrenzt && nah(vGekappt.fremdkapital, e.capex * 0.3, 1e-9) && vGekappt.dscrMinP90 > e.dscrZiel, "Gearing-Obergrenze kürzt proportional (DSCR steigt)");
  const va = varianteRechnen("annuitaet", { ...e, fkQuote: 0.95 }, jahre);
  pruefe(va.fkBegrenzt && nah(va.dscrMinP90, e.dscrZiel, 1e-6), "Annuitätenkredit wird auf Mindest-DSCR (P90) begrenzt", va.dscrMinP90);
  pruefe(nah(va.dsra, (va.rateJahr1 * e.dsraMonate) / 12, 1e-9) && nah(va.kapitalbedarfEk, e.capex - va.fremdkapital + va.gebuehren + va.dsra, 1e-9), "EK-Bedarf = Capex − FK + Gebühr + DSRA (6 Monate Schuldendienst)");

  abschnitt("L3. Konsistenz mit dem Solarpark-Rechner, Varianten, Steuern");
  const spark = rechneSolarpark({ mwp: 10, spezErtrag: 1100, capexKwp: 470, entwicklungKwp: 40, netzKm: 1, fkQuote: 0.75, dscrBegrenzen: false });
  const inv = investition({ mwp: 10, capexKwp: 470, entwicklungKwp: 40, netzKm: 1 });
  const e2 = cockpitBereinigen({ ...e, capex: inv.summe, p50: 1100, p90: 1000, pachtJahr: spark.flaecheHa * spark.eingabe.pachtHa, modell: "eeg", preisCt: spark.eingabe.preisCt, vertragJahre: 20 });
  const r2 = rechneCockpit(e2);
  pruefe(nah(r2.projekt.projektIrr, spark.projektIrr, 1e-6), "Projekt-IRR identisch mit rechner/solarpark.js", [r2.projekt.projektIrr, spark.projektIrr]);
  pruefe(nah(r2.projekt.lcoeCt, spark.lcoeCt, 1e-6), "LCOE identisch mit rechner/solarpark.js", [r2.projekt.lcoeCt, spark.lcoeCt]);
  pruefe(r2.varianten.length === 7 && r2.varianten.every((x) => Number.isFinite(x.kapitalbedarfEk) && x.reihen.liquiditaet.length === e2.laufzeit + 1), "Sieben Varianten mit Liquiditätsverlauf (Jahr 0 … Laufzeit)");
  const ek = r2.varianten.find((x) => x.art === "ek");
  pruefe(nah(ek.kapitalbedarfEk, e2.capex) && ek.dscrMin === null && ek.gesamtkostenFinanzierung === 0 && nah(ek.ekIrr, r2.projekt.projektIrr, 1e-9), "100 % EK: Kapitalbedarf = Capex, kein DSCR, EK-IRR = Projekt-IRR");
  const le = r2.varianten.find((x) => x.art === "leasing");
  const bar = e2.capex * (1 - e2.leasingSonderzahlung) - (e2.capex * e2.leasingRestwert) / Math.pow(1 + e2.leasingZins, e2.leasingLaufzeit);
  pruefe(nah(le.leasing.rate, annuitaet(bar, e2.leasingZins, e2.leasingLaufzeit), 1e-9) && nah(le.kapitalbedarfEk, e2.capex * e2.leasingSonderzahlung), "Leasing: Rate = Annuität des Barwerts abzgl. Restwert, EK = Sonderzahlung");
  const mk = r2.varianten.find((x) => x.art === "mietkauf");
  pruefe(nah(mk.fremdkapital, e2.capex * (1 - e2.mietkaufAnzahlung)) && nah(mk.rateJahr1, annuitaet(mk.fremdkapital, e2.mietkaufZins, e2.mietkaufLaufzeit), 1e-9), "Mietkauf: Annuität auf Capex abzgl. Anzahlung");
  const afa = afaReihe(1_000_000, 20, 25);
  pruefe(nah(afa.reduce((s1, x) => s1 + x, 0), 1_000_000) && nah(afa[0], 50_000) && afa[20] === 0, "AfA linear 20 Jahre (AfA-Tabelle PV)");
  const deg = afaReihe(1_000_000, 20, 25, { degressivSatz: 0.3 });
  pruefe(nah(deg[0], 150_000) && nah(deg.reduce((s1, x) => s1 + x, 0), 1_000_000, 1e-9), "Degressive AfA: max. 3 × linear (15 %), vollständig abgeschrieben", deg[0]);
  const at = rechneCockpit(cockpitStandard({ land: "AT", mwp: 5 }));
  const atOhne = rechneCockpit({ ...cockpitStandard({ land: "AT", mwp: 5 }), ifb: false });
  const skAt = at.varianten.find((x) => x.art === "skulptiert");
  pruefe(skAt.ifb > 0 && skAt.steuernSumme < atOhne.varianten.find((x) => x.art === "skulptiert").steuernSumme, "AT: Investitionsfreibetrag senkt die Steuerlast (Näherung)", skAt.ifb);
  pruefe(r2.szenarien.length === 5 && r2.szenarien[1].ekIrr < r2.szenarien[0].ekIrr && r2.szenarien[2].ekIrr < r2.szenarien[0].ekIrr, "Stresstest: P90 und Zins +1 Pp. senken die EK-Rendite");

  abschnitt("L4. Covenants, Term Sheets, Förder-Check, Geschäftsmodell");
  pruefe(covenantAmpel({ dscr: 1.3, lockup: 1.1, covenant: 1.05 }).id === "gruen", "Ampel grün bei DSCR 1,30");
  pruefe(covenantAmpel({ dscr: 1.12, lockup: 1.1, covenant: 1.05 }).id === "gelb", "Frühwarnung (gelb) knapp über Lock-up");
  pruefe(covenantAmpel({ dscr: 1.3, lockup: 1.1, covenant: 1.05, vorher: 1.55 }).id === "gelb", "Frühwarnung bei stark fallendem Trend");
  const lock = covenantAmpel({ dscr: 1.08, lockup: 1.1, covenant: 1.05 });
  const bruch = covenantAmpel({ dscr: 1.0, lockup: 1.1, covenant: 1.05 });
  pruefe(lock.id === "rot" && lock.lockup && !lock.verletzt && bruch.id === "rot" && bruch.verletzt, "Rot: Lock-up (Ausschüttungssperre) bzw. Covenant verletzt");
  pruefe(covenantAmpel({ dscr: null }).id === "grau", "Keine Daten → grau");
  const monate = Array.from({ length: 15 }, (_, i) => ({ monat: `2025-${String((i % 12) + 1).padStart(2, "0")}`.replace(/^2025/, i < 12 ? "2025" : "2026"), cfads: 12_000, schuldendienst: 10_000 }));
  const cp = covenantPruefung({ monate, lockup: 1.1, covenant: 1.05 });
  pruefe(cp.pruefungen.length >= 2 && cp.pruefungen.every((p) => nah(p.dscr, 1.2)) && cp.pruefungen.some((p) => /^Q\d\/\d{4}$/.test(p.periode)), "LTM-DSCR je Quartalsende (12 Monate CFADS ÷ Schuldendienst)", cp.pruefungen.map((p) => p.periode));
  let fehlerTs = null;
  try {
    termsheetBereinigen({ betrag: 1e6, laufzeitJahre: 18, zinsArt: "fix", dscrCovenant: 1.2, dscrLockup: 1.1 });
  } catch (x) {
    fehlerTs = x;
  }
  pruefe(fehlerTs?.status === 422, "Term Sheet ohne Zins bzw. Lock-up < Covenant → 422");
  const tA = termsheetBereinigen({ betrag: 5e6, laufzeitJahre: 18, zinsArt: "fix", zinsPct: 4.2, dscrCovenant: 1.05, dscrLockup: 1.1, bearbeitungPct: 1 });
  const tB = termsheetBereinigen({ betrag: 5e6, laufzeitJahre: 18, zinsArt: "euribor6", referenzAnnahmePct: 2.7, margePct: 2.4, dscrCovenant: 1.05, dscrLockup: 1.1, bearbeitungPct: 1 });
  const kA = termsheetKennzahlen(tA, e);
  pruefe(nah(kA.zinsAllIn, 0.042) && nah(kA.rateJahr1, annuitaet(5e6, 0.042, 18), 1e-9) && kA.effektivPa > 0.042, "Term Sheet: Annuität zum All-in-Zins, Effektivkosten > Nominalzins (Gebühr)", kA.effektivPa);
  const vg = termsheetVergleich([{ bank: "A", termsheet: tA }, { bank: "B", termsheet: tB }], e);
  pruefe(vg.zeilen[0].bank === "A" && vg.zeilen[0].rang === 1 && /A:/.test(vg.empfehlung), "Vergleich: günstigeres Angebot (höhere EK-IRR) auf Rang 1");
  const de = foerderCheck({ land: "DE", typ: "freiflaeche", kwp: 10000 });
  pruefe(de.find((p) => p.id === "de_kfw270")?.passung === "passt" && de.every((p) => p.quelle?.url?.startsWith("https://")), "Förder-Check DE: KfW 270 einschlägig, jede Angabe mit Quelle");
  const ch = foerderCheck({ land: "CH", typ: "dach", kwp: 400, eigenverbrauch: true });
  pruefe(ch.find((p) => p.id === "ch_heiv")?.passung === "nicht" && ch.find((p) => p.id === "ch_greiv")?.passung === "passt", "Förder-Check CH: HEIV nur ohne Eigenverbrauch, GREIV ab 100 kW");
  const atF = foerderCheck({ land: "AT", typ: "freiflaeche", kwp: 5000 });
  pruefe(atF.find((p) => p.id === "at_eag_iz")?.passung === "nicht" && atF.some((p) => p.id === "at_ifb"), "Förder-Check AT: Investitionszuschuss nur bis 1 MWp, IFB-Hinweis");
  const gm = geschaeftsmodellVergleich(e, {});
  const max = Math.max(...gm.zeilen.map((z) => z.barwert));
  pruefe(gm.zeilen.length === 4 && gm.zeilen.find((z) => z.id === gm.beste).barwert === max && gm.zeilen.find((z) => z.id === "verkauf").kapitalbindung === 0, "Geschäftsmodell: vier Modelle, Empfehlung = höchster Barwert", gm.zeilen.map((z) => [z.id, Math.round(z.barwert)]));
  pruefe(FINANZIERUNG.projekt?.dscrP90 && FINANZIERUNG.foerderkredit?.DE, "Marktwerte der Finanzierung in markt.js ergänzt");
}

// ================================================================ HTTP

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
        if (versuch >= 4) throw e;
        await new Promise((r) => setTimeout(r, 3000 * versuch));
      }
    }
    for (const c of res.headers.getSetCookie?.() || []) {
      const [paar] = c.split(";");
      const [name, wert] = paar.split("=");
      if (/oi_sitzung$/.test(name)) this.cookie = wert ? `${name}=${wert}` : "";
    }
    if (roh) return res;
    const buf = Buffer.from(await res.arrayBuffer());
    const text = buf.toString("utf8");
    let json = null;
    try {
      json = JSON.parse(text);
    } catch {
      json = { text: text.slice(0, 200) };
    }
    return { status: res.status, json, headers: res.headers, text, buf };
  }
  get = (p, o) => this.anfrage("GET", p, undefined, o);
  post = (p, b, o) => this.anfrage("POST", p, b ?? {}, o);
  patch = (p, b, o) => this.anfrage("PATCH", p, b ?? {}, o);
  del = (p, o) => this.anfrage("DELETE", p, undefined, o);
  async login(email, passwort = DEMO_PASSWORT) {
    let r;
    for (let versuch = 1; versuch <= 3; versuch++) {
      r = await this.post("/api/auth/login", { email, passwort });
      if (r.status !== 500) break;
      await new Promise((w) => setTimeout(w, 5000 * versuch));
    }
    if (r.status !== 200) throw new Error(`Login ${email} fehlgeschlagen: ${r.status} ${JSON.stringify(r.json)}`);
    this.nutzer = r.json.nutzer;
    return r.json.nutzer;
  }
  async registrieren(schluessel, rollen, vorname, nachname) {
    const email = `fz-test-${LAUF}-${schluessel}@example.com`;
    const r = await this.post("/api/auth/registrieren", { email, passwort: PASSWORT, vorname, nachname, firma: "", rollen, agb: true });
    if (r.status !== 201) throw new Error(`Registrierung ${email}: ${r.status} ${JSON.stringify(r.json)}`);
    this.email = email;
    return r.json.nutzer;
  }
}

const token = (link) => String(link || "").split("/einladung/bank/")[1] || "";

async function api() {
  const admin = new Client("admin (Leitung)");
  const trans = new Client("bo-transaktion");
  const akq = new Client("bo-akquise");
  const inv = new Client("investor (Demo)");
  const firma = new Client("unternehmen (Demo)");
  const bank = new Client("bank (Demo)");
  const neu = new Client("Bank neu (Test)");
  const fremd = new Client("fremd (Test)");
  const gast = new Client("gast");
  await admin.login("admin@example.com");
  await inv.login("investor@example.com");

  abschnitt("A1. Investoren-Cockpit: Berechtigung je Projekt");
  let r = await inv.get("/api/portal/finanzierung");
  pruefe(r.status === 200 && Array.isArray(r.json.projekte) && Array.isArray(r.json.szenarien), "Cockpit-Liste (Projekte mit Zugriff, Szenarien)", r.status);
  const erlaubt = r.json.projekte || [];
  pruefe(erlaubt.length >= 1 && erlaubt.every((p) => p.zugriff !== "oeffentlich"), "Mindestens ein Projekt mit freigegebenem Datenraum", erlaubt.length);
  if (erlaubt[0]) {
    r = await inv.get(`/api/portal/finanzierung/projekt/${erlaubt[0].id}`);
    pruefe(r.status === 200 && r.json.vorbelegung?.eingaben?.capex > 0 && r.json.vorbelegung.eingaben.p90 <= r.json.vorbelegung.eingaben.p50, "Vorbelegung aus Datenblatt/Exposé (Capex, P50/P90)", r.json.vorbelegung?.eingaben);
    pruefe(Object.keys(r.json.vorbelegung?.quellen || {}).length >= 3, "Herkunft der Werte ausgewiesen (Datenblatt/Exposé/Markt)");
  }
  const oeff = await gast.get("/api/boerse");
  const ohne = (oeff.json.projekte || []).find((p) => !erlaubt.some((x) => x.id === p.id));
  if (ohne) {
    r = await inv.get(`/api/portal/finanzierung/projekt/${ohne.id}`);
    pruefe(r.status === 403 && !r.text.includes("capex"), "Projekt ohne freigegebenen Datenraum → 403 ohne Daten", r.status);
  }
  await firma.login("unternehmen@example.com");
  r = await firma.get(`/api/portal/finanzierung/projekt/${erlaubt[0]?.id || "P-26-XXXXXX"}`);
  pruefe(r.status === 403, "Rolle ohne Investor/Anbieter → 403", r.status);
  r = await gast.get("/api/portal/finanzierung");
  pruefe(r.status === 401, "Ohne Anmeldung → 401", r.status);

  abschnitt("A2. Szenarien speichern, PDF, fremde Szenarien");
  const eing = { ...cockpitStandard({ land: "DE", mwp: 8 }), zins: 0.05 };
  r = await inv.post("/api/portal/finanzierung", { name: `fz-test-${LAUF} Szenario`, eingaben: eing, fokus: "skulptiert", projektId: erlaubt[0]?.id || "" });
  const sz = r.json.szenario;
  pruefe(r.status === 201 && sz?.ergebnis?.varianten?.length === 7 && nah(sz.eingaben.zins, 0.05), "Szenario gespeichert, Server rechnet selbst nach (7 Varianten)", r.status);
  r = await inv.post("/api/portal/finanzierung", { name: "x", eingaben: eing }, { origin: "https://boese.example" });
  pruefe(r.status === 403, "CSRF: fremde Herkunft → 403", r.status);
  r = await inv.post("/api/portal/finanzierung", { name: "Manipuliert", eingaben: { ...eing, capex: -5, fkQuote: 7, dscrZiel: 0.2 } });
  pruefe(r.status === 201 && r.json.szenario.eingaben.capex >= 1000 && r.json.szenario.eingaben.fkQuote <= 1 && r.json.szenario.eingaben.dscrZiel >= 1, "Eingaben werden serverseitig begrenzt", r.json.szenario?.eingaben);
  if (r.json.szenario?.id) await inv.del(`/api/portal/finanzierung/szenarien/${r.json.szenario.id}`);
  r = await inv.get(`/api/portal/finanzierung/szenarien/${sz?.id}/pdf`);
  pruefe(r.status === 200 && r.buf.slice(0, 5).toString() === "%PDF-" && /attachment/.test(r.headers.get("content-disposition") || ""), "Szenario-PDF (Finanzierungsvergleich)", r.status);
  await fremd.registrieren("fremd", ["investor"], "Fritz", "Fremd (Test)");
  r = await fremd.get(`/api/portal/finanzierung/szenarien/${sz?.id}/pdf`);
  pruefe(r.status === 403, "Fremdes Szenario-PDF → 403", r.status);
  r = await fremd.del(`/api/portal/finanzierung/szenarien/${sz?.id}`);
  pruefe(r.status === 403, "Fremdes Szenario löschen → 403", r.status);
  if (erlaubt[0]) {
    r = await fremd.get(`/api/portal/finanzierung/projekt/${erlaubt[0].id}`);
    pruefe(r.status === 403, "Anderer Investor ohne NDA für dasselbe Projekt → 403", r.status);
  }

  r = await inv.del(`/api/portal/finanzierung/szenarien/${sz?.id}`);
  pruefe(r.status === 200, "Eigenes Szenario löschen (Demo-Konto bleibt aufgeräumt)", r.status);

  abschnitt("A3. Backoffice: Fall, Anfrage an Banken, Paket-Freigabe");
  r = await admin.get("/api/admin/finanzierung");
  pruefe(r.status === 200 && r.json.faelle?.length >= 3 && r.json.banken?.length >= 3, "Übersicht mit Demo-Fällen und Bankenstamm", r.status);
  const banken = r.json.banken || [];
  const bank1 = banken.find((b) => b.email === "bank@example.com");
  const bank2 = banken.find((b) => b.email !== "bank@example.com");
  r = await admin.post("/api/admin/finanzierung", { bezugArt: "frei", titel: `fz-test-${LAUF} Solarpark`, spv: "Test SPV GmbH & Co. KG (fiktiv)", eingaben: { mwp: 12, land: "DE" } });
  const fall = r.json.fall;
  pruefe(r.status === 201 && fall?.betragWunsch > 0 && fall.status === "vorbereitung", "Fall angelegt, Bedarf aus Capex × FK-Quote", r.json);
  const F = `/api/admin/finanzierung/${fall?.id}`;
  r = await admin.post(`${F}/aktion`, { aktion: "paket", freigabe: ["steckbrief"] });
  pruefe(r.status === 200 && r.json.fall.paketFreigabe.length === 1, "Paket: nur Steckbrief freigegeben", r.json.fall?.paketFreigabe);
  const fd = new FormData();
  fd.append("datei", new Blob([PDF], { type: "application/pdf" }), "epc-test.pdf");
  fd.append("baustein", "epc");
  r = await admin.anfrage("POST", `${F}/dokumente`, fd, { kopf: { "X-Plattform-Upload": "1" } });
  const dokId = r.json.dokument?.id;
  pruefe(r.status === 200 && dokId, "EPC-Vertrag hochgeladen (Magic Bytes geprüft)", r.status);
  await bank.login("bank@example.com");
  const bankId3 = (await admin.post("/api/admin/finanzierung/banken", { name: `fz-test-${LAUF} Neue Bank (fiktiv)`, email: `fz-test-${LAUF}-bank@example.com`, land: "AT", ansprechpartner: "Test" })).json.bank?.id;
  pruefe(!!bankId3, "Bank im Bankenstamm angelegt");
  r = await admin.post(`${F}/aktion`, { aktion: "anfragen", bankIds: [bank1?.id, bank2?.id, bankId3], frist: new Date(Date.now() + 10 * 864e5).toISOString().slice(0, 10) });
  pruefe(r.status === 200 && r.json.fall.anfragen.length === 3 && r.json.fall.status === "angefragt", "Anfrage an drei Banken, Status „angefragt“", r.json.fall?.anfragen?.length);
  const links = r.json.demoLinks || [];
  pruefe(links.length === 3 && links.every((l) => /\/einladung\/bank\/[A-Za-z0-9_-]{30,}/.test(l.link)), "Je Bank ein persönlicher Einladungslink (Demo)", links.length);
  const a1 = r.json.fall.anfragen.find((a) => a.bankId === bank1?.id);
  const a2 = r.json.fall.anfragen.find((a) => a.bankId === bank2?.id);
  const a3 = r.json.fall.anfragen.find((a) => a.bankId === bankId3);

  abschnitt("A4. Bank sieht nur ihre Anfrage und freigegebene Bausteine");
  r = await bank.get("/api/portal/bank");
  pruefe(r.status === 200 && r.json.anfragen.some((a) => a.id === a1?.id) && !r.json.anfragen.some((a) => a.id === a2?.id), "Bank-Liste: eigene Anfrage ja, Anfrage an andere Bank nein");
  r = await bank.get(`/api/portal/bank/${a1?.id}`);
  pruefe(r.status === 200 && r.json.paket.map((b) => b.id).join() === "steckbrief" && r.json.nichtFreigegeben >= 10, "Bankenpaket zeigt nur den freigegebenen Steckbrief", r.json.paket?.map((b) => b.id));
  pruefe(!JSON.stringify(r.json).includes(bank2?.name || "§§") && !("vergleich" in r.json), "Keine Namen/Term Sheets anderer Banken");
  r = await bank.get(`/api/portal/bank/${a2?.id}`);
  pruefe(r.status === 403, "Anfrage einer anderen Bank → 403", r.status);
  r = await bank.get(`/api/portal/bank/${a1?.id}/dokument/steckbrief`);
  pruefe(r.status === 200 && r.buf.slice(0, 5).toString() === "%PDF-", "Freigegebener Steckbrief als PDF", r.status);
  r = await bank.get(`/api/portal/bank/${a1?.id}/dokument/financial_model`);
  pruefe(r.status === 403, "Nicht freigegebenes Financial Model → 403", r.status);
  r = await bank.get(`/api/portal/bank/${a1?.id}/dokument/${dokId}`);
  pruefe(r.status === 403, "Nicht freigegebenes Dokument (EPC) → 403", r.status);
  await admin.post(`${F}/aktion`, { aktion: "paket", freigabe: ["steckbrief", "financial_model", "epc"] });
  r = await bank.get(`/api/portal/bank/${a1?.id}/dokument/${dokId}`);
  pruefe(r.status === 200 && r.buf.slice(0, 5).toString() === "%PDF-", "Nach Freigabe: EPC-Dokument abrufbar", r.status);
  r = await bank.get(`/api/portal/bank/${a1?.id}/dokument/financial_model?format=csv`);
  pruefe(r.status === 200 && r.text.startsWith("\ufeff") && r.text.includes("CFADS P90"), "Financial Model als CSV (BOM, Semikolon)", r.status);
  r = await bank.get(`/api/portal/bank/${a2?.id}/dokument/${dokId}`);
  pruefe(r.status === 403, "Dokument über fremde Anfrage-ID → 403", r.status);
  r = await inv.get("/api/portal/bank");
  pruefe(r.status === 403, "Investor ohne Rolle Bank → 403", r.status);
  r = await bank.get("/api/admin/finanzierung");
  pruefe(r.status === 403, "Bank im Backoffice → 403", r.status);

  abschnitt("A5. Einladung annehmen (nur eingeladene E-Mail)");
  await neu.registrieren("bank", ["unternehmen"], "Nora", "Neubank (Test)");
  const t3 = token(links.find((l) => l.bankId === bankId3)?.link);
  r = await fremd.post("/api/portal/bank/einladung", { token: t3 });
  pruefe(r.status === 403, "Andere E-Mail-Adresse → 403", r.status);
  r = await neu.post("/api/portal/bank/einladung", { token: t3 });
  pruefe(r.status === 200 && r.json.anfrageId === a3?.id, "Eingeladene Adresse nimmt an → Anfrage verknüpft", r.json);
  r = await neu.post("/api/portal/bank/einladung", { token: t3 });
  pruefe(r.status === 422, "Einladung nur einmal nutzbar", r.status);
  r = await neu.get("/api/portal/bank");
  pruefe(r.status === 200 && r.json.anfragen.length === 1 && r.json.anfragen[0].id === a3?.id, "Neue Bank sieht genau ihre Anfrage (Rolle „bank“ gesetzt)", r.json.anfragen?.length);
  r = await neu.get(`/api/portal/bank/${a1?.id}`);
  pruefe(r.status === 403, "Neue Bank → Anfrage der Demo-Bank 403", r.status);

  abschnitt("A6. Term Sheets, Vergleich, Entscheidung");
  const ts = { betrag: Math.round(fall.betragWunsch * 0.9), laufzeitJahre: 18, zinsArt: "fix", zinsPct: 4.3, tilgungsprofil: "annuitaet", dscrCovenant: 1.05, dscrLockup: 1.1, dsraMonate: 6, bearbeitungPct: 0.8, sicherheiten: ["uebereignung"], cps: ["kreditvertrag"] };
  r = await bank.post(`/api/portal/bank/${a1?.id}`, { aktion: "termsheet", termsheet: ts });
  pruefe(r.status === 200 && r.json.status === "termsheet", "Bank gibt Term Sheet über das Portal ab", r.json);
  r = await bank.post(`/api/portal/bank/${a1?.id}`, { aktion: "termsheet", termsheet: { ...ts, zinsPct: null } });
  pruefe(r.status === 422, "Unvollständiges Term Sheet → 422", r.status);
  r = await neu.post(`/api/portal/bank/${a3?.id}`, { aktion: "termsheet", termsheet: { ...ts, zinsArt: "euribor6", margePct: 2.6, referenzAnnahmePct: 2.7 } });
  pruefe(r.status === 200, "Zweites Term Sheet (variabel + Marge)", r.status);
  r = await admin.post(`${F}/aktion`, { aktion: "termsheet", anfrageId: a2?.id, termsheet: { ...ts, zinsPct: 4.9 } });
  pruefe(r.status === 200 && r.json.fall.vergleich.zeilen.length === 3, "Backoffice erfasst drittes Term Sheet – Vergleich über drei Angebote", r.json.fall?.vergleich?.zeilen?.length);
  const zeilen = r.json.fall.vergleich.zeilen;
  pruefe(zeilen[0].bank === bank1?.name && zeilen.every((z, i) => i === 0 || (zeilen[i - 1].k.ekIrr ?? -1) >= (z.k.ekIrr ?? -1)), "Rangfolge nach EK-IRR (günstigster Zins vorn)", zeilen.map((z) => [z.bank, z.k.ekIrr]));
  pruefe(zeilen.every((z) => z.k.dscrMinP90 > 0 && z.k.kapitalbedarfEk > 0 && z.k.effektivPa > 0), "Je Angebot DSCR P90, EK-Bedarf, Effektivkosten");
  await trans.login("bo-transaktion@example.com");
  r = await trans.post(`${F}/aktion`, { aktion: "entscheidung", anfrageId: a1?.id, begruendung: "Bestes Angebot laut Vergleich" });
  pruefe(r.status === 403, "Entscheidung durch Transaktion (ohne Leitung) → 403", r.status);
  r = await admin.post(`${F}/aktion`, { aktion: "entscheidung", anfrageId: a1?.id, begruendung: "kurz" });
  pruefe(r.status === 422, "Entscheidung ohne Begründung → 422", r.status);
  r = await admin.post(`${F}/aktion`, { aktion: "entscheidung", anfrageId: a1?.id, begruendung: "Bestes Angebot laut Vergleich, Covenants haltbar" });
  pruefe(r.status === 200 && r.json.fall.status === "entschieden" && r.json.fall.anfragen.find((a) => a.id === a3?.id).status === "nicht_ausgewaehlt", "Leitung entscheidet – andere Banken „nicht ausgewählt“", r.json.fall?.status);
  r = await neu.post(`/api/portal/bank/${a3?.id}`, { aktion: "termsheet", termsheet: ts });
  pruefe([403, 409].includes(r.status), "Nach der Entscheidung kein Term Sheet mehr", r.status);
  r = await admin.post(`${F}/aktion`, { aktion: "kreditvertrag", kreditvertrag: { nummer: `KV-${LAUF}`, unterzeichnetAm: new Date().toISOString().slice(0, 10) } });
  pruefe(r.status === 200 && r.json.fall.kreditvertrag?.betrag === ts.betrag && r.json.fall.status === "vertrag", "Kreditvertrag aus dem gewählten Term Sheet übernommen", r.json.fall?.kreditvertrag);
  r = await admin.post(`${F}/aktion`, { aktion: "cp", cpId: "kreditvertrag", erledigt: true, nachweis: "Test" });
  pruefe(r.status === 200 && r.json.fall.cps.find((c) => c.id === "kreditvertrag").erledigt, "Auszahlungsvoraussetzung abgehakt");

  abschnitt("A7. Covenant-Monitoring, Reporting, Geschäftsmodell, Rechte");
  r = await admin.post("/api/admin/finanzierung/covenants", {});
  const ampeln = (r.json.ergebnisse || []).map((x) => x.ampel);
  pruefe(r.status === 200 && ampeln.includes("gruen") && ampeln.some((a) => ["gelb", "rot"].includes(a)), "Covenant-Lauf aus Zählerwerten: grün und Frühwarnung/Lock-up", r.json);
  r = await admin.get("/api/admin/finanzierung");
  const mitVertrag = (r.json.faelle || []).filter((f) => f.covenant?.letzte);
  pruefe(mitVertrag.length >= 2 && mitVertrag.every((f) => f.covenant.letzte.dscr > 0 && ["gruen", "gelb", "rot"].includes(f.covenant.ampel.id)), "DSCR (12 Monate) und Ampel je Fall", mitVertrag.map((f) => [f.covenant.letzte.dscr, f.covenant.ampel.id]));
  const gelb = (r.json.faelle || []).find((f) => ["gelb", "rot"].includes(f.covenant?.ampel?.id));
  r = await admin.get(`/api/admin/finanzierung/${mitVertrag[0]?.id}/reporting`);
  pruefe(r.status === 200 && r.buf.slice(0, 5).toString() === "%PDF-", "Bank-Reporting als PDF", r.status);
  r = await admin.get(`/api/admin/finanzierung/${mitVertrag[0]?.id}/modell`);
  pruefe(r.status === 200 && r.buf.slice(0, 5).toString() === "%PDF-", "Financial Model als PDF (Backoffice)", r.status);
  r = await admin.post("/api/admin/finanzierung/geschaeftsmodell", { fallId: fall?.id, annahmen: { verkaufspreisKwp: 100 } });
  pruefe(r.status === 200 && r.json.vergleich.zeilen.length === 4 && r.json.vergleich.zeilen.find((z) => z.id === "verkauf").heute === 100 * 12000, "Geschäftsmodell-Vergleich (Verkauf heute = 100 €/kWp × 12 MWp)", r.json.vergleich?.zeilen?.[0]);
  r = await trans.post(`${F}/aktion`, { aktion: "geschaeftsmodell", gewaehlt: "eigenbetrieb" });
  pruefe(r.status === 403, "Geschäftsmodell festlegen nur Leitung → 403", r.status);
  r = await admin.post(`${F}/aktion`, { aktion: "geschaeftsmodell", gewaehlt: "eigenbetrieb", begruendung: "Test" });
  pruefe(r.status === 200 && r.json.fall.geschaeftsmodell?.gewaehlt === "eigenbetrieb", "Leitung legt Eigenbetrieb fest", r.status);
  await akq.login("bo-akquise@example.com");
  r = await akq.get("/api/admin/finanzierung");
  pruefe(r.status === 403, "Unterrolle Akquise ohne Bereich Finanzierung → 403", r.status);
  const lesen = new Client("bo-lesen");
  await lesen.login("bo-lesen@example.com");
  r = await lesen.get(F);
  pruefe(r.status === 200, "Unterrolle Lesen sieht den Fall", r.status);
  r = await lesen.post(`${F}/aktion`, { aktion: "cp", cpId: "netz", erledigt: true });
  pruefe(r.status === 403, "Unterrolle Lesen ändert nichts → 403", r.status);
  r = await admin.post(`${F}/aktion`, { aktion: "paket", freigabe: ["steckbrief"] }, { origin: "https://boese.example" });
  pruefe(r.status === 403, "CSRF im Backoffice → 403", r.status);

  abschnitt("A8. Seiten");
  const bankListe = (await bank.get("/api/portal/bank")).json.anfragen || [];
  for (const [cl, pfad, soll] of [
    [inv, "/portal/finanzierung", 200],
    [inv, `/portal/finanzierung?projekt=${erlaubt[0]?.id}`, 200],
    [fremd, `/portal/finanzierung?projekt=${erlaubt[0]?.id}`, 404],
    [admin, "/portal/admin/finanzierung", 200],
    [admin, `/portal/admin/finanzierung/${fall?.id}?tab=banken`, 200],
    [admin, `/portal/admin/finanzierung/${mitVertrag[0]?.id}?tab=covenants`, 200],
    [bank, "/portal/bank", 200],
    [bank, `/portal/bank/${bankListe[0]?.id}`, 200],
    [inv, "/portal/bank", 404],
    [akq, "/portal/admin/finanzierung", 404],
  ]) {
    r = await cl.get(pfad);
    const nichtGefunden = r.status === 404 || r.text.includes("NEXT_HTTP_ERROR_FALLBACK;404");
    pruefe(soll === 404 ? nichtGefunden : r.status === 200 && !nichtGefunden, `${pfad} (${cl.name}) → ${soll}`, r.status);
  }
}

async function main() {
  console.log(`Finanzierung – Test (Lauf ${LAUF})${NUR_LOGIK ? " – nur Logik" : ` gegen ${BASIS}`}`);
  logik();
  if (!NUR_LOGIK) await api();
  console.log(`\n${fehler ? rot(`${fehler} Fehler`) : gruen("Alle Prüfungen bestanden")} (${ok} ok)`);
  process.exit(fehler ? 1 : 0);
}

main().catch((e) => {
  console.error(rot(`Abbruch: ${e.stack || e.message}`));
  process.exit(1);
});
