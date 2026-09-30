// scripts/plattform-test-energie.mjs
//
// Test „Energiebeschaffung & Versorger-Ausschreibung“ (Team A3).
//   node scripts/plattform-test-energie.mjs            → reine Logik + End-to-End gegen den laufenden Dev-Server
//   node scripts/plattform-test-energie.mjs --logik    → nur reine Logik (ohne Server)
//
// Teil A (reine Logik, Node): Kündigungsstichtag, Wechselanalyse-Empfehlungen, normierter Preisvergleich (nachgerechnet),
// Sensitivität, Bestpreis-Hinweis ohne Namen, Preisblatt-Pflichtangaben, Anonymisierung des Loses, Terminpreis-CSV,
// Kaskade Monat → Quartal → Jahr, Portfolio (Hedge-Quote, MtM, Risiko), Spot-Kennzahlen (Peak, negative Stunden).
// Teil B (Server): Lieferant sieht nur eingeladene Ausschreibungen und nur eigene Angebote, Angebote nach Frist gesperrt,
// normierter Vergleich im Backoffice korrekt, Zuschlag nur mit Kundenfreigabe, keine Kundennamen/IDs an Lieferanten,
// Vollmacht-Pflicht, Einladung per Link, Runde 2 mit Hinweis ohne Namen, PDFs, Rechte (Unterrollen, CSRF), Seiten.
// Eigene Konten mit Präfix en-test-<Lauf>@example.com – Demo-Daten bleiben unberührt.

import { ZONEN, aktuelleKurve, kennzahlen, monatsBeginnMs, produktZeitraum, stundenpreiskurve, terminCsvParsen, terminPreisMonat, terminPreisZeitraum, istPeak } from "../src/lib/plattform/energie/markt.js";
import { kuendigungsStichtag, wechselanalyse, portfolio, kundenReihe, verguetung } from "../src/lib/plattform/energie/beschaffung.js";
import { angeboteVergleichen, bestpreisHinweis, normierungKontext, preisblattPruefen, produkteBereinigen, profilAnonymisieren, VERBOTENE_LIEFERANTEN_FELDER } from "../src/lib/plattform/energie/ausschreibung.js";
import { losAnonym, losKontext } from "../src/lib/plattform/energie/los.js";
import { ortszeit } from "../src/lib/plattform/fach/lastgang.js";

const BASIS = (process.argv.find((a) => a.startsWith("http")) || process.env.PLATTFORM_TEST_URL || "http://localhost:3100").replace(/\/$/, "");
const NUR_LOGIK = process.argv.includes("--logik");
const DEMO_PASSWORT = process.env.PLATTFORM_DEMO_PASSWORT || "Demo-2026!";
const LAUF = Date.now().toString(36);
const PASSWORT = "Energie-Test-Passwort-26";

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
const nah = (a, b, tol = 1) => Math.abs(a - b) <= tol;

// ================================================================ Teil A: reine Logik

function teilA() {
  abschnitt("A1. Fristen und Wechselanalyse");
  pruefe(kuendigungsStichtag({ vertragEnde: "2026-12-31", kuendigungsfristMonate: 3 }) === "2026-09-30", "Stichtag 31.12. − 3 Monate = 30.09.");
  pruefe(kuendigungsStichtag({ vertragEnde: "2027-03-31", kuendigungsfristMonate: 1 }) === "2027-02-28", "Monatsende wird gekappt (31.03. − 1 Monat = 28.02.)");
  pruefe(kuendigungsStichtag({ vertragEnde: "2027-01-31", kuendigungsfristWochen: 6 }) === "2026-12-20", "Frist in Wochen (6 Wochen)");
  pruefe(kuendigungsStichtag({}) === null, "ohne Vertragsende kein Stichtag");
  const basis = { preisCt: 14, vertragEnde: "2027-12-31", kuendigungsfristMonate: 3, jahresKwh: 1_000_000 };
  const a1 = wechselanalyse({ vertrag: basis, markt: { forwardEurMwh: 90, profilfaktor: 1.0 }, stichtag: "2026-09-30" });
  pruefe(a1.empfehlung === "ausschreiben" && a1.marktCt < a1.vertragCt, "Markt deutlich günstiger → jetzt ausschreiben", a1);
  pruefe(nah(a1.marktCt, 9 + 1.2, 0.001), "Marktpreis = Termin × Profilfaktor + Lieferantenaufschlag (10,2 ct)", a1.marktCt);
  pruefe(nah(a1.deltaEurJahr, (14 - 10.2) * 10000, 1), "Δ €/Jahr = (Vertrag − Markt) × Menge", a1.deltaEurJahr);
  const a2 = wechselanalyse({ vertrag: { ...basis, preisCt: 10.3 }, markt: { forwardEurMwh: 90, profilfaktor: 1, trend: { richtung: "fallend", prozent: -0.06 } }, stichtag: "2026-09-30" });
  pruefe(a2.empfehlung === "abwarten", "kein Vorteil, viel Zeit, fallende Preise → abwarten", a2.empfehlung);
  const a3 = wechselanalyse({ vertrag: { ...basis, preisCt: 9, verlaengerungPreisCt: 9.5 }, markt: { forwardEurMwh: 90, profilfaktor: 1 }, stichtag: "2026-09-30" });
  pruefe(a3.empfehlung === "verlaengern", "Vertrag und Verlängerungsangebot unter Markt → verlängern", a3.empfehlung);
  const a4 = wechselanalyse({ vertrag: { ...basis, vertragEnde: "2026-12-31" }, markt: { forwardEurMwh: 90 }, stichtag: "2026-10-15" });
  pruefe(a4.empfehlung === "verlaengern" && a4.fristVerpasst && a4.alarm === 0, "Kündigungsfrist verstrichen → Verlängerung, Alarmstufe 0", a4);
  const a5 = wechselanalyse({ vertrag: { ...basis, preisCt: 10.5, vertragEnde: "2027-01-31" }, markt: { forwardEurMwh: 90, profilfaktor: 1 }, stichtag: "2026-09-30" });
  pruefe(a5.empfehlung === "ausschreiben" && a5.alarm === 60, "weniger als 120 Tage bis Stichtag → ausschreiben, Alarm 60 Tage", a5);
  const a6 = wechselanalyse({ vertrag: { preisCt: null }, markt: {} });
  pruefe(a6.empfehlung === "pruefen" && a6.begruendung.length >= 2, "fehlende Daten → „Daten ergänzen“ mit Begründung");
  const a7 = wechselanalyse({ vertrag: { ...basis, preisCt: 21.5, preisArt: "gesamt" }, markt: { forwardEurMwh: 90, profilfaktor: 1 }, stichtag: "2026-09-30" });
  pruefe(a7.vertragCt < 21.5 && a7.vertragCt > 10, "Gesamtpreis wird um Netz/Abgaben bereinigt (Energiepreis)", a7.vertragCt);

  abschnitt("A2. Terminmarkt, Kaskade, Stundenpreiskurve");
  pruefe(produktZeitraum("Q2-27")?.von === "2027-04" && produktZeitraum("M11-26")?.bis === "2026-11" && produktZeitraum("Cal-28")?.monate === 12, "Produktcodes Cal/Q/M");
  pruefe(produktZeitraum("Q5-27") === null && produktZeitraum("M13-27") === null, "ungültige Produkte abgelehnt");
  const csv = terminCsvParsen("Handelstag;Zone;Produkt;Typ;Preis;Quelle\n29.09.2026;DE;Cal-27;base;98,50;Lizenzfeed Test\n29.09.2026;DE;Cal-27;peak;108,10;\n29.09.2026;AT;Q1-27;base;112;Test\nfoo;DE;Cal-27;base;1;x", { quelleStandard: "Standardquelle" });
  pruefe(csv.eintraege.length === 3 && csv.fehler.length === 1 && csv.fehler[0].zeile === 5, "CSV: 3 gültige Zeilen, Fehler mit Zeilennummer", csv);
  pruefe(csv.eintraege[1].quelle === "Standardquelle" && csv.eintraege[0].preisEurMwh === 98.5, "Quelle aus Standard, Dezimalkomma");
  pruefe(terminCsvParsen("Handelstag;Zone;Produkt;Typ;Preis\n29.09.2026;DE;Cal-27;base;98").fehler[0]?.text.includes("Quelle"), "ohne Quelle keine Einspielung");
  const kurve = aktuelleKurve([
    { handelstag: "2026-09-28", zone: "DE", produkt: "Cal-27", typ: "base", preisEurMwh: 100 },
    { handelstag: "2026-09-29", zone: "DE", produkt: "Cal-27", typ: "base", preisEurMwh: 96 },
    { handelstag: "2026-09-29", zone: "DE", produkt: "Cal-27", typ: "peak", preisEurMwh: 104 },
    { handelstag: "2026-09-29", zone: "DE", produkt: "Q1-27", typ: "base", preisEurMwh: 110 },
    { handelstag: "2026-09-29", zone: "DE", produkt: "M01-27", typ: "base", preisEurMwh: 120 },
  ]);
  pruefe(terminPreisMonat(kurve, "DE", "2027-01").preis === 120 && terminPreisMonat(kurve, "DE", "2027-02").preis === 110 && terminPreisMonat(kurve, "DE", "2027-07").preis === 96, "Kaskade Monat → Quartal → Jahr, jüngster Handelstag");
  const hpfc = stundenpreiskurve({ kurve: aktuelleKurve([{ handelstag: "2026-09-29", zone: "DE", produkt: "Cal-27", typ: "base", preisEurMwh: 100 }, { handelstag: "2026-09-29", zone: "DE", produkt: "Cal-27", typ: "peak", preisEurMwh: 120 }]), zone: "DE", von: "2027-01", bis: "2027-12", form: null });
  let s = 0;
  let sp = 0;
  let np = 0;
  for (let i = 0; i < hpfc.werte.length; i++) {
    s += hpfc.werte[i];
    if (istPeak(hpfc.startMs + i * 3600000)) {
      sp += hpfc.werte[i];
      np++;
    }
  }
  pruefe(hpfc.werte.length === 8760 && nah(s / hpfc.werte.length, 100, 0.2) && nah(sp / np, 120, 0.01), "HPFC trifft Base (100) und Peak (120) im Mittel", { base: s / hpfc.werte.length, peak: sp / np });
  pruefe(nah(terminPreisZeitraum(kurve, "DE", "2027-01", "2027-03"), (120 * 744 + 110 * 672 + 110 * 743) / 2159, 0.05), "Terminpreis Zeitraum stundengewichtet");

  abschnitt("A3. Normierter Preisvergleich und Sensitivität");
  const produkte = produkteBereinigen([{ art: "fix", laufzeitJahre: 1 }, { art: "spot", laufzeitJahre: 1 }, { art: "tranchen", laufzeitJahre: 2, tranchen: 4, gruen: true }]);
  pruefe(produkte.map((p) => p.id).join() === "P1,P2,P3" && produkte[2].tranchen === 4, "Produktvarianten mit Kennung");
  const reihe = kundenReihe({ von: "2027-01", bis: "2027-12", jahresKwh: 500000, profilId: "einschicht" });
  pruefe(nah(reihe.jahresKwh, 500000, 1) && reihe.werte.length === 8760, "synthetische Kundenreihe trifft die Jahresmenge");
  const ctx = normierungKontext(reihe, hpfc);
  const frist = "2026-10-20T12:00:00.000Z";
  const pbA = preisblattPruefen({ positionen: [{ produktId: "P1", arbeitspreisCt: "11,500", grundpreisEurMonat: 100 }, { produktId: "P2", aufschlagCt: 0.4, grundpreisEurMonat: 50 }, { produktId: "P3", aufschlagCt: 0.6, grundpreisEurMonat: 0, hknCt: 0.1 }], bindefristBis: "2026-11-01T12:00", zahlungszielTage: 14, sicherheit: "keine" }, produkte, { frist });
  const pbB = preisblattPruefen({ positionen: [{ produktId: "P1", arbeitspreisCt: 11.2, grundpreisEurMonat: 400 }], bindefristBis: "2026-11-01T12:00", zahlungszielTage: 30, sicherheit: "buergschaft" }, produkte, { frist });
  const v = angeboteVergleichen([{ id: "LA-A", lieferantId: "LF-A", positionen: pbA.positionen }, { id: "LA-B", lieferantId: "LF-B", positionen: pbB.positionen }], produkte, ctx);
  const fixA = v.zeilen.find((z) => z.angebotId === "LA-A" && z.produktId === "P1");
  const fixB = v.zeilen.find((z) => z.angebotId === "LA-B");
  const spotA = v.zeilen.find((z) => z.angebotId === "LA-A" && z.produktId === "P2");
  const trA = v.zeilen.find((z) => z.angebotId === "LA-A" && z.produktId === "P3");
  pruefe(nah(fixA.eurJahr, (ctx.kwh * 11.5) / 100 + 1200, 1), "Festpreis: Menge × Arbeitspreis + Grundpreis × 12", fixA.eurJahr);
  pruefe(nah(fixB.eurJahr, (ctx.kwh * 11.2) / 100 + 4800, 1), "Festpreis B mit höherem Grundpreis korrekt normiert", fixB.eurJahr);
  pruefe(nah(spotA.eurJahr, (ctx.kwh * (ctx.lastgewichtetEurMwh / 10 + 0.4)) / 100 + 600, 1), "Spot-Index: Menge × (lastgewichteter Terminpreis + Aufschlag) + Grundpreis", spotA.eurJahr);
  pruefe(nah(trA.eurJahr, (ctx.kwh * (ctx.lastgewichtetEurMwh / 10 + 0.6 + 0.1)) / 100, 1), "Tranchen inkl. Herkunftsnachweisen", trA.eurJahr);
  pruefe(v.zeilen.every((z, i) => i === 0 || z.eurJahr >= v.zeilen[i - 1].eurJahr) && v.zeilen[0].rang === 1 && v.zeilen[0].abstandProzent === 0, "Ranking aufsteigend nach €/Jahr, Abstand 0 beim Besten");
  pruefe(fixA.sensitivitaet[30] === fixA.eurJahr && spotA.sensitivitaet[30] > spotA.eurJahr && trA.sensitivitaet[30] - trA.eurJahr < spotA.sensitivitaet[30] - spotA.eurJahr, "Sensitivität: Festpreis 0, Tranchen < Spot");
  let fehl = "";
  try {
    preisblattPruefen({ positionen: [{ produktId: "P3", aufschlagCt: 0.5, grundpreisEurMonat: 0 }], bindefristBis: "2026-11-01T12:00", zahlungszielTage: 14, sicherheit: "keine" }, produkte, { frist });
  } catch (e) {
    fehl = e.message;
  }
  pruefe(/Herkunftsnachweise/.test(fehl), "Grünstrom-Variante ohne HKN-Aufschlag → Fehler", fehl);
  fehl = "";
  try {
    preisblattPruefen({ positionen: [{ produktId: "P1", arbeitspreisCt: 11, grundpreisEurMonat: 0 }], bindefristBis: "2026-10-20T12:30", zahlungszielTage: 14, sicherheit: "keine" }, produkte, { frist });
  } catch (e) {
    fehl = e.message;
  }
  pruefe(/Bindefrist/.test(fehl), "Bindefrist muss nach der Angebotsfrist liegen", fehl);
  fehl = "";
  try {
    preisblattPruefen({ positionen: [], bindefristBis: "2026-11-01", zahlungszielTage: 14, sicherheit: "keine" }, produkte, {});
  } catch (e) {
    fehl = e.message;
  }
  pruefe(/mindestens eine/.test(fehl), "leeres Preisblatt → Fehler");
  const hb = bestpreisHinweis("abstand", "LF-B", v);
  const hr = bestpreisHinweis("rang", "LF-B", v);
  const hbp = bestpreisHinweis("bestpreis", "LF-B", v);
  pruefe(hb.abstandProzent > 0 && hr.rang === 2 && hr.von === 2 && hbp.bestpreisCt === v.zeilen[0].ctKwh, "Hinweis Folgerunde: Abstand, Rang, Bestpreis");
  pruefe(![hb, hr, hbp].some((h) => JSON.stringify(h).includes("LF-A")), "Hinweis nennt keinen anderen Bieter");
  pruefe(bestpreisHinweis("aus", "LF-B", v) === null, "Regel „aus“ → kein Hinweis");

  abschnitt("A4. Anonymisierung, Portfolio, Spot-Kennzahlen, Vergütung");
  const los = { id: "EA-26-TEST01", lieferbeginn: "2027-01", zone: "DE", lose: [{ kundeId: "U-26-GEHEIM", jahresKwh: 423456, profilId: "zweischicht", land: "DE", spannungsebene: "ms", messart: "rlm", abnahmestellen: 2, maloId: "51238696781", firma: "Geheim GmbH" }] };
  const an = losAnonym(los);
  const txt = JSON.stringify(an);
  pruefe(!/U-26-GEHEIM|51238696781|Geheim/.test(txt) && !VERBOTENE_LIEFERANTEN_FELDER.some((f) => txt.includes(`"${f}"`)), "anonymes Los ohne Kunden-ID, MaLo, Firmenname", an);
  pruefe(an.jahresMengeMwh === 420 && an.spitzeKw % 10 === 0 && an.wochenprofil.length === 7 && an.abnahmestellen === 2, "Menge/Spitze gerundet, Wochenprofil normiert", an);
  pruefe(Math.abs(an.monatsanteileProzent.reduce((a, b) => a + b, 0) - 100) < 0.5, "Monatsanteile summieren sich auf 100 %");
  const pf = portfolio({ bedarf: [{ periode: "Q1-27", mwh: 100 }, { periode: "Q2-27", mwh: 80 }], tranchen: [{ periode: "Q1-27", mwh: 60, preisEurMwh: 100 }, { periode: "Q1-27", mwh: 20, preisEurMwh: 110 }, { periode: "Q2-27", mwh: 10, preisEurMwh: 90, status: "storniert" }], marktpreis: (p) => (p === "Q1-27" ? 105 : 90), schockProzent: 20 });
  const q1 = pf.perioden.find((p) => p.periode === "Q1-27");
  pruefe(q1.hedgeQuote === 0.8 && q1.mittelpreis === 102.5 && q1.mtmEur === 200 && q1.risikoEur === 420, "Portfolio: Hedge-Quote, Einstand, Mark-to-Market, Risiko", q1);
  pruefe(pf.summe.gesichertMwh === 80 && pf.summe.hedgeQuote === Math.round((80 / 180) * 1000) / 1000, "stornierte Tranche zählt nicht", pf.summe);
  const t0 = monatsBeginnMs("2026-06");
  const stunden = Array.from({ length: 24 * 7 }, (_, i) => ({ t: t0 + i * 3600000, eurMwh: istPeak(t0 + i * 3600000) ? 100 : -10 }));
  const k = kennzahlen(stunden, "DE");
  pruefe(k.peak === 100 && k.offpeak === -10 && k.negativ === stunden.filter((x) => !istPeak(x.t)).length, "Peak = Mo–Fr 8–20 Uhr Ortszeit, negative Stunden gezählt", k);
  pruefe(ortszeit(t0).stunde === 0 && ortszeit(t0).tag === 1, "Monatsbeginn in Ortszeit (MESZ)");
  pruefe(ZONEN.DE.bzn === "DE-LU" && ZONEN.AT.bzn === "AT", "Gebotszonen DE-LU und AT getrennt");
  pruefe(verguetung({ mengeMwh: 1000, modell: "fee", serviceFeeEurMwh: 0 }).festgelegt === false && verguetung({ mengeMwh: 1000, ersparnisEur: 10000, modell: "kombi", serviceFeeEurMwh: 1.5, erfolgsAnteil: 0.2 }).gesamtEur === 3500, "Vergütung nur als Parameter (Fee + Erfolg)");
  const kx = losKontext(los, aktuelleKurve([{ handelstag: "2026-09-29", zone: "DE", produkt: "Cal-27", typ: "base", preisEurMwh: 100 }, { handelstag: "2026-09-29", zone: "DE", produkt: "Cal-27", typ: "peak", preisEurMwh: 112 }]));
  pruefe(kx.ctx.lastgewichtetEurMwh > 100 && kx.kennzahlen.profilfaktor > 1, "Zweischicht-Profil: lastgewichteter Preis über Base (Profilfaktor > 1)", kx.kennzahlen.profilfaktor);
  pruefe(profilAnonymisieren([], {}).jahresMengeMwh === 0, "leeres Profil ohne Fehler (Menge 0)");
}

// ================================================================ Teil B: Server

class Client {
  constructor(name) {
    this.name = name;
    this.cookie = "";
  }
  async anfrage(methode, pfad, body, { origin = BASIS, roh = false } = {}) {
    const headers = {};
    if (origin) headers.Origin = origin;
    if (this.cookie) headers.Cookie = this.cookie;
    let payload;
    if (body !== undefined) {
      headers["Content-Type"] = "application/json";
      payload = JSON.stringify(body);
    }
    let res;
    for (let versuch = 1; ; versuch++) {
      try {
        res = await fetch(BASIS + pfad, { method: methode, headers, body: payload, redirect: "manual", signal: AbortSignal.timeout(180000) });
        // Dev-Server: Erstkompilierung liefert gelegentlich 500 (HTML) – dann wiederholen (Routen werden vorab per GET kompiliert)
        const typ = res.headers.get("content-type") || "";
        // bzw. 500 bei gleichzeitigen Zugriffen vieler Teams auf die Demo-Datei (Sperre/EBUSY unter Windows) – vor dem Schreiben
        if (pfad.startsWith("/api/") && versuch < 4 && res.status >= 500) {
          await new Promise((r) => setTimeout(r, 3000 * versuch));
          continue;
        }
        break;
      } catch (e) {
        if (versuch >= 3) throw e;
        await new Promise((r) => setTimeout(r, 3000 * versuch));
      }
    }
    for (const c of res.headers.getSetCookie?.() || []) {
      const [paar] = c.split(";");
      const [name, wert] = paar.split("=");
      if (/oi_sitzung$/.test(name)) this.cookie = wert ? `${name}=${wert}` : "";
    }
    if (roh) return res;
    const text = await res.text();
    let json = null;
    try {
      json = JSON.parse(text);
    } catch {
      json = { text: text.slice(0, 200) };
    }
    return { status: res.status, json, text, headers: res.headers };
  }
  get = (p, o) => this.anfrage("GET", p, undefined, o);
  post = (p, b, o) => this.anfrage("POST", p, b ?? {}, o);
  async login(email, passwort = DEMO_PASSWORT) {
    let r;
    for (let v = 1; v <= 3; v++) {
      r = await this.post("/api/auth/login", { email, passwort });
      if (r.status !== 500) break;
      await new Promise((w) => setTimeout(w, 4000 * v));
    }
    if (r.status !== 200) throw new Error(`Login ${email}: ${r.status} ${JSON.stringify(r.json)}`);
    this.nutzer = r.json.nutzer;
    return r.json.nutzer;
  }
  async registrieren(schluessel, firma) {
    const email = `en-test-${LAUF}-${schluessel}@example.com`;
    const r = await this.post("/api/auth/registrieren", { email, passwort: PASSWORT, vorname: "Test", nachname: `${schluessel} (Test)`, firma, rollen: ["unternehmen"], agb: true });
    if (r.status !== 201) throw new Error(`Registrierung ${email}: ${r.status} ${JSON.stringify(r.json)}`);
    this.nutzer = r.json.nutzer;
    this.email = email;
    return r.json.nutzer;
  }
}

const inStunden = (h) => new Date(Date.now() + h * 3600e3).toISOString();
const lieferbeginn = () => {
  const d = new Date();
  return `${d.getUTCFullYear() + 1}-01`;
};

async function lieferantAnlegen(admin, schluessel, name) {
  const email = `en-test-${LAUF}-${schluessel}@example.com`;
  let r = await admin.post("/api/admin/energie/lieferanten", { daten: { name: `${name} ${LAUF} (Test)`, land: "DE", gebiete: ["DE"], ansprechpartner: [{ name: "Test", email }] } });
  if (r.status !== 200) throw new Error(`Lieferant anlegen: ${r.status} ${JSON.stringify(r.json)}`);
  const l = r.json.lieferant;
  r = await admin.post(`/api/admin/energie/lieferanten/${l.id}`, { aktion: "einladen", email });
  const token = String(r.json.demoLink || "").split("/").pop();
  const c = new Client(schluessel);
  r = await c.get(`/api/portal/ausschreibungen/einladung?token=${token}`);
  const info = r.json;
  r = await c.post("/api/portal/ausschreibungen/einladung", { token, vorname: "Lia", nachname: `${schluessel} (Test)`, passwort: PASSWORT });
  if (r.status !== 200) throw new Error(`Einladung annehmen: ${r.status} ${JSON.stringify(r.json)}`);
  await c.login(email, PASSWORT);
  return { c, l, email, info, token };
}

async function aufwaermen() {
  // Routen einmal per GET kompilieren lassen (405/401 genügt), damit Mutationen nicht in die Erstkompilierung laufen
  const c = new Client("aufwaermen");
  for (const p of ["/api/admin/energie", "/api/admin/energie/lieferanten", "/api/admin/energie/lieferanten/LF-26-XXXXXX", "/api/admin/energie/ausschreibungen", "/api/admin/energie/ausschreibungen/EA-26-XXXXXX", "/api/admin/energie/kunden", "/api/admin/energie/termin", "/api/admin/energie/portfolio", "/api/portal/energie", "/api/portal/energie/vollmacht", "/api/portal/energie/freigabe", "/api/portal/energie/dokument", "/api/portal/ausschreibungen", "/api/portal/ausschreibungen/EA-26-XXXXXX", "/api/portal/ausschreibungen/EA-26-XXXXXX/angebot", "/api/portal/ausschreibungen/EA-26-XXXXXX/fragen", "/api/portal/ausschreibungen/einladung?token=x"]) {
    await c.get(p).catch(() => null);
  }
}

async function teilB() {
  await aufwaermen();
  const admin = new Client("admin");
  const kunde = new Client("kunde");
  const kunde2 = new Client("kunde2");
  const gast = new Client("gast");
  await admin.login("admin@example.com");

  abschnitt("B1. Einladung von Versorgern, Rolle „lieferant“");
  const L1 = await lieferantAnlegen(admin, "l1", "Testversorger Eins");
  pruefe(L1.info.gueltig && L1.info.email.includes("•") && !L1.info.email.includes(`en-test-${LAUF}-l1@`), "Einladungsinfo öffentlich nur mit maskierter E-Mail", L1.info);
  pruefe(L1.c.nutzer.rollen.includes("lieferant"), "Konto aus Einladung hat die Rolle „lieferant“", L1.c.nutzer.rollen);
  let r = await gast.post("/api/portal/ausschreibungen/einladung", { token: L1.token, vorname: "X", nachname: "Y", passwort: PASSWORT });
  pruefe(r.status === 422, "Einladung ist nur einmal gültig", r.status);
  const L2 = await lieferantAnlegen(admin, "l2", "Testversorger Zwei");
  const L3 = await lieferantAnlegen(admin, "l3", "Testversorger Drei (nicht eingeladen)");

  abschnitt("B2. Kunde, Vertrag, Vollmacht");
  await kunde.registrieren("k1", `Kundenfirma ${LAUF} GmbH (Test)`);
  await kunde2.registrieren("k2", `Zweitfirma ${LAUF} AG (Test)`);
  r = await kunde.post("/api/portal/energie", { daten: { lieferant: "Altversorger (Test)", zone: "DE", preisCt: 14.2, preisArt: "energie", vertragEnde: `${new Date().getUTCFullYear()}-12-31`, kuendigungsfristMonate: 3, jahresKwh: 640000, lastprofil: "zweischicht" } });
  pruefe(r.status === 200 && r.json.vertrag?.kuendigungsStichtag, "Kunde erfasst laufenden Vertrag (Stichtag berechnet)", r.json);
  r = await kunde2.post("/api/portal/energie", { daten: { lieferant: "Altversorger 2 (Test)", preisCt: 13.1, vertragEnde: `${new Date().getUTCFullYear() + 1}-06-30`, jahresKwh: 300000, lastprofil: "handel" } });
  pruefe(r.status === 200, "zweiter Kunde erfasst Vertrag");
  r = await kunde.post("/api/portal/energie", { daten: { lieferant: "", preisCt: 14 } });
  pruefe(r.status === 422, "Vertrag ohne Pflichtangaben → 422", r.status);
  r = await L1.c.post("/api/portal/energie", { daten: { lieferant: "x", preisCt: 1, vertragEnde: "2027-01-01", jahresKwh: 1 } });
  pruefe(r.status === 403, "Lieferant darf keine Kundenverträge pflegen → 403", r.status);

  const neuDaten = (kundenIds, titel, lieferantIds) => ({ titel, kundenIds, zone: "DE", lieferbeginn: lieferbeginn(), produkte: [{ art: "fix", laufzeitJahre: 1 }, { art: "spot", laufzeitJahre: 1 }], lieferantIds, bestpreis: "abstand", starten: true, frist: inStunden(3) });
  r = await admin.post("/api/admin/energie/ausschreibungen", neuDaten([kunde.nutzer.id], `Test-Ausschreibung ${LAUF}`, [L1.l.id, L2.l.id]));
  pruefe(r.status === 409 && /vollmacht/i.test(r.json.error), "Ausschreibung ohne Beschaffungsvollmacht → 409", r.json);
  r = await kunde.post("/api/portal/energie/vollmacht", { aktion: "erteilen", zustimmung: false });
  pruefe(r.status === 422, "Vollmacht nur mit Zustimmung", r.status);
  r = await kunde.post("/api/portal/energie/vollmacht", { aktion: "erteilen", zustimmung: true });
  pruefe(r.status === 200 && r.json.vollmacht?.status === "erteilt" && r.json.vollmacht.textHash?.length === 64, "Vollmacht erteilt (Version, Prüfsumme, Zeitpunkt)", r.json);
  r = await kunde.post("/api/portal/energie/vollmacht", { aktion: "erteilen", zustimmung: true });
  pruefe(r.status === 409, "doppelte Vollmacht → 409", r.status);

  abschnitt("B3. Ausschreibung und Sichtbarkeit");
  r = await admin.post("/api/admin/energie/ausschreibungen", neuDaten([kunde.nutzer.id], `Test-Ausschreibung ${LAUF}`, [L1.l.id]));
  pruefe(r.status === 422, "Bieterwettbewerb braucht mindestens zwei Versorger", r.status);
  r = await admin.post("/api/admin/energie/ausschreibungen", neuDaten([kunde.nutzer.id], `Test-Ausschreibung ${LAUF}`, [L1.l.id, L2.l.id]));
  pruefe(r.status === 201 && r.json.ausschreibung?.status === "laufend", "Backoffice legt Ausschreibung an und startet Runde 1", r.json);
  const A = r.json.ausschreibung;
  r = await L3.c.get("/api/portal/ausschreibungen");
  pruefe(r.status === 200 && !r.json.ausschreibungen.some((x) => x.id === A.id), "nicht eingeladener Versorger sieht die Ausschreibung nicht in der Liste");
  r = await L3.c.get(`/api/portal/ausschreibungen/${A.id}`);
  pruefe(r.status === 404, "nicht eingeladener Versorger: Detail → 404", r.status);
  r = await L3.c.post(`/api/portal/ausschreibungen/${A.id}/angebot`, { positionen: [{ produktId: "P1", arbeitspreisCt: 9, grundpreisEurMonat: 0 }], bindefristBis: inStunden(200), zahlungszielTage: 14, sicherheit: "keine" });
  pruefe(r.status === 404, "nicht eingeladener Versorger: Angebot → 404", r.status);
  r = await L1.c.get("/api/portal/ausschreibungen");
  pruefe(r.status === 200 && r.json.ausschreibungen.some((x) => x.id === A.id) && r.json.ausschreibungen.every((x) => !x.kunden), "eingeladener Versorger sieht die Ausschreibung (ohne Kundenliste)");
  r = await L1.c.get(`/api/portal/ausschreibungen/${A.id}`);
  const lfText = r.text;
  pruefe(r.status === 200 && r.json.rolle === "lieferant" && r.json.ausschreibung.darfBieten, "Detail für den eingeladenen Versorger, Angebotsabgabe offen", r.status);
  pruefe(!lfText.includes(`Kundenfirma ${LAUF}`) && !lfText.includes(kunde.nutzer.id) && !lfText.includes(kunde.email) && !lfText.includes("Altversorger") && !VERBOTENE_LIEFERANTEN_FELDER.some((f) => lfText.includes(`"${f}"`)), "Lieferanten-Antwort ohne Kundennamen, Kunden-ID, E-Mail, Vorlieferant, IDs");
  pruefe(r.json.ausschreibung.profil?.jahresMengeMwh === 640 && r.json.ausschreibung.profil.wochenprofil?.length === 7, "anonymisiertes Profil mit gerundeter Menge und normiertem Wochenprofil", r.json.ausschreibung.profil?.jahresMengeMwh);
  r = await kunde.get(`/api/portal/ausschreibungen/${A.id}`);
  pruefe(r.status === 200 && r.json.rolle === "kunde", "Kunde sieht die eigene Ausschreibung");
  r = await kunde2.get(`/api/portal/ausschreibungen/${A.id}`);
  pruefe(r.status === 404, "fremder Kunde → 404", r.status);
  r = await gast.get(`/api/portal/ausschreibungen/${A.id}`);
  pruefe(r.status === 401, "ohne Anmeldung → 401", r.status);

  abschnitt("B4. Verdeckte Angebote");
  const pb = (ap, gp, extra = {}) => ({ positionen: [{ produktId: "P1", arbeitspreisCt: ap, grundpreisEurMonat: gp }, { produktId: "P2", aufschlagCt: 0.45, grundpreisEurMonat: gp }], bindefristBis: inStunden(24 * 20), zahlungszielTage: 14, sicherheit: "keine", ...extra });
  r = await L1.c.post(`/api/portal/ausschreibungen/${A.id}/angebot`, { positionen: [{ produktId: "P1", grundpreisEurMonat: 10 }], bindefristBis: inStunden(24 * 20), zahlungszielTage: 14, sicherheit: "keine" });
  pruefe(r.status === 422, "Preisblatt ohne Arbeitspreis → 422", r.json);
  r = await L1.c.post(`/api/portal/ausschreibungen/${A.id}/angebot`, pb(11.777, 90));
  pruefe(r.status === 200 && r.json.angebot?.version === 1, "Versorger 1 gibt Angebot ab", r.json);
  r = await L1.c.post(`/api/portal/ausschreibungen/${A.id}/angebot`, pb(11.555, 90));
  pruefe(r.status === 200 && r.json.angebot?.version === 2, "Versorger 1 ersetzt sein Angebot (Version 2)");
  r = await L2.c.post(`/api/portal/ausschreibungen/${A.id}/angebot`, pb(10.987, 300));
  pruefe(r.status === 200, "Versorger 2 gibt Angebot ab");
  r = await L1.c.get(`/api/portal/ausschreibungen/${A.id}`);
  pruefe(r.json.ausschreibung.eigeneAngebote.length === 1 && !r.text.includes("10.987") && !r.text.includes(L2.l.name), "Versorger 1 sieht nur das eigene Angebot, nicht Preis/Namen von Versorger 2");
  r = await L2.c.get("/api/portal/ausschreibungen");
  pruefe(!r.text.includes("11.555") && !r.text.includes(L1.l.name), "Liste von Versorger 2 ohne fremde Angebote");
  r = await L1.c.post(`/api/portal/ausschreibungen/${A.id}/fragen`, { text: "Gibt es eine Mengentoleranz für den Pool?" });
  pruefe(r.status === 200, "Versorger stellt eine Frage");
  const frageId = r.json.frage?.id;

  abschnitt("B5. Normierter Vergleich im Backoffice");
  r = await admin.get(`/api/admin/energie/ausschreibungen/${A.id}`);
  const aa = r.json.ausschreibung;
  pruefe(r.status === 200 && aa.vergleich.zeilen.length === 4, "Vergleich mit allen Positionen (2 Versorger × 2 Varianten)", aa?.vergleich?.zeilen?.length);
  const kwh = aa.vergleich.ctx.kwh;
  const z1 = aa.vergleich.zeilen.find((z) => z.lieferantId === L1.l.id && z.produktId === "P1");
  const z2 = aa.vergleich.zeilen.find((z) => z.lieferantId === L2.l.id && z.produktId === "P1");
  pruefe(z1 && nah(z1.eurJahr, (kwh * 11.555) / 100 + 90 * 12, 2) && nah(z2.eurJahr, (kwh * 10.987) / 100 + 300 * 12, 2), "normierter Gesamtpreis €/Jahr = Menge × Arbeitspreis + Grundpreis × 12", { z1: z1?.eurJahr, z2: z2?.eurJahr, kwh });
  pruefe(aa.vergleich.zeilen.every((z, i, l) => i === 0 || z.eurJahr >= l[i - 1].eurJahr) && aa.vergleich.zeilen[0].lieferant, "Ranking aufsteigend, Backoffice sieht Versorgernamen");
  r = await admin.post(`/api/admin/energie/ausschreibungen/${A.id}`, { aktion: "antworten", frageId, antwort: "Ja, ±20 % ohne Aufpreis.", oeffentlich: true });
  pruefe(r.status === 200, "Backoffice beantwortet die Frage für alle");
  r = await L2.c.get(`/api/portal/ausschreibungen/${A.id}`);
  const f2 = r.json.ausschreibung.fragen.find((f) => f.id === frageId);
  pruefe(f2 && f2.antwort && f2.eigene === false && !r.text.includes(L1.l.name), "Antwort für alle sichtbar, ohne Absender");

  abschnitt("B6. Frist, Sperre, Zuschlag nur mit Kundenfreigabe");
  r = await admin.post(`/api/admin/energie/ausschreibungen/${A.id}`, { aktion: "zuschlagVorschlag", angebotId: z2.angebotId, produktId: "P1" });
  pruefe(r.status === 409, "Zuschlagsvorschlag in offener Runde → 409 (Gleichbehandlung)", r.status);
  r = await admin.post(`/api/admin/energie/ausschreibungen/${A.id}`, { aktion: "beenden" });
  pruefe(r.status === 200 && r.json.ausschreibung.status === "auswertung", "Runde beendet → Auswertung", r.json.ausschreibung?.status);
  r = await L1.c.post(`/api/portal/ausschreibungen/${A.id}/angebot`, pb(9.9, 0));
  pruefe(r.status === 409 && /gesperrt|abgelaufen/.test(r.json.error), "Angebot nach Frist gesperrt → 409", r.json);
  r = await L2.c.post(`/api/portal/ausschreibungen/${A.id}/angebot`, { aktion: "zurueckziehen", angebotId: z2.angebotId });
  pruefe(r.status === 409, "Zurückziehen nach Frist → 409", r.status);
  r = await kunde.post("/api/portal/energie/freigabe", { ausschreibungId: A.id, entscheidung: "freigegeben" });
  pruefe(r.status === 409, "Kundenfreigabe ohne Vorschlag → 409", r.status);
  r = await admin.post(`/api/admin/energie/ausschreibungen/${A.id}`, { aktion: "zuschlag" });
  pruefe(r.status === 409, "Zuschlag ohne Vorschlag → 409", r.status);
  r = await admin.post(`/api/admin/energie/ausschreibungen/${A.id}`, { aktion: "zuschlagVorschlag", angebotId: z2.angebotId, produktId: "P1", begruendung: "Günstigster Festpreis." });
  pruefe(r.status === 200 && r.json.ausschreibung.status === "freigabe", "Zuschlagsvorschlag → wartet auf Kundenfreigabe", r.json.ausschreibung?.status);
  r = await admin.post(`/api/admin/energie/ausschreibungen/${A.id}`, { aktion: "zuschlag" });
  pruefe(r.status === 409 && /Kundenfreigabe/.test(r.json.error), "Zuschlag ohne Kundenfreigabe → 409", r.json);
  r = await L2.c.get(`/api/portal/ausschreibungen/${A.id}`);
  pruefe(r.json.ausschreibung.ergebnis === null, "Versorger erfährt vor der Kundenfreigabe nichts vom Vorschlag");
  r = await kunde2.post("/api/portal/energie/freigabe", { ausschreibungId: A.id, entscheidung: "freigegeben" });
  pruefe(r.status === 404, "fremder Kunde kann nicht freigeben → 404", r.status);
  r = await kunde.get("/api/portal/energie");
  const ka = r.json.ausschreibungen?.find((x) => x.id === A.id);
  pruefe(ka?.vorschlag?.lieferant && ka.vergleich?.zeilen?.length >= 2 && Number.isFinite(ka.vorschlag.ersparnisEurJahr), "Kunde sieht Vorschlag, Vergleich und Ersparnis", ka?.vorschlag);
  r = await kunde.get(`/api/portal/energie/dokument?art=vergleich&id=${A.id}`);
  pruefe(r.status === 200 && r.headers.get("content-type") === "application/pdf" && r.text.startsWith("%PDF"), "Angebotsvergleich als PDF für den Kunden");
  r = await L1.c.get(`/api/portal/energie/dokument?art=vergleich&id=${A.id}`);
  pruefe(r.status === 404, "Versorger erhält den Angebotsvergleich nicht → 404", r.status);
  r = await kunde.post("/api/portal/energie/freigabe", { ausschreibungId: A.id, entscheidung: "freigegeben" }, { origin: "https://boese.example" });
  pruefe(r.status === 403, "Freigabe von fremder Herkunft → 403 (CSRF)", r.status);
  r = await kunde.post("/api/portal/energie/freigabe", { ausschreibungId: A.id, entscheidung: "freigegeben" });
  pruefe(r.status === 200 && r.json.zuschlag === true && r.json.ausschreibung.status === "zuschlag", "Kundenfreigabe → Zuschlag erteilt", r.json);
  r = await L2.c.get(`/api/portal/ausschreibungen/${A.id}`);
  pruefe(r.json.ausschreibung.ergebnis === "zuschlag", "Versorger 2 sieht den Zuschlag");
  r = await L1.c.get(`/api/portal/ausschreibungen/${A.id}`);
  pruefe(r.json.ausschreibung.ergebnis === "absage", "Versorger 1 erhält die Absage");
  r = await L2.c.get(`/api/portal/energie/dokument?art=zuschlag&id=${A.id}`);
  pruefe(r.status === 200 && r.text.startsWith("%PDF"), "Zuschlagsschreiben für den bezuschlagten Versorger");
  r = await L1.c.get(`/api/portal/energie/dokument?art=zuschlag&id=${A.id}`);
  pruefe(r.status === 404, "unterlegener Versorger erhält kein Zuschlagsschreiben → 404", r.status);
  r = await kunde.get("/api/portal/energie");
  pruefe(r.json.vertraege.some((x) => x.quelle === "zuschlag" && x.lieferantId === L2.l.id && x.preisCt === 10.987) && r.json.vertraege.some((x) => x.status === "gekuendigt"), "neuer Vertrag aus Zuschlag, Altvertrag gekündigt");

  abschnitt("B7. Pool, Runde 2, Hinweis ohne Namen");
  r = await admin.post("/api/admin/energie/ausschreibungen", neuDaten([kunde.nutzer.id, kunde2.nutzer.id], `Test-Pool ${LAUF}`, [L1.l.id, L2.l.id]));
  pruefe(r.status === 409, "Pool mit Kunde ohne Vollmacht → 409", r.status);
  await kunde2.post("/api/portal/energie/vollmacht", { aktion: "erteilen", zustimmung: true });
  r = await admin.post("/api/admin/energie/ausschreibungen", neuDaten([kunde.nutzer.id, kunde2.nutzer.id], `Test-Pool ${LAUF}`, [L1.l.id, L2.l.id]));
  pruefe(r.status === 201 && r.json.ausschreibung.anonym.anzahlKunden.startsWith("2 Kunden"), "Pool-Ausschreibung mit zwei Kunden", r.json.ausschreibung?.anonym);
  const P = r.json.ausschreibung;
  await L1.c.post(`/api/portal/ausschreibungen/${P.id}/angebot`, pb(12.1, 50));
  await L2.c.post(`/api/portal/ausschreibungen/${P.id}/angebot`, pb(11.4, 50));
  await admin.post(`/api/admin/energie/ausschreibungen/${P.id}`, { aktion: "beenden" });
  r = await admin.post(`/api/admin/energie/ausschreibungen/${P.id}`, { aktion: "naechsteRunde", frist: inStunden(2), lieferantIds: [L1.l.id, L2.l.id, L3.l.id], bestpreisRegel: "abstand" });
  pruefe(r.status === 200 && r.json.ausschreibung.runde.nr === 2 && !r.json.ausschreibung.teilnehmer.some((t) => t.lieferantId === L3.l.id), "Runde 2 nur mit Versorgern, die in Runde 1 geboten haben", r.json.ausschreibung?.teilnehmer);
  r = await L1.c.get(`/api/portal/ausschreibungen/${P.id}`);
  const h = r.json.ausschreibung.hinweis;
  pruefe(h?.regel === "abstand" && h.abstandProzent > 0 && !JSON.stringify(h).includes(L2.l.name) && !r.text.includes(L2.l.name), "Runde 2: Abstand zum Bestpreis ohne Namen des Besten", h);
  r = await L2.c.get(`/api/portal/ausschreibungen/${P.id}`);
  pruefe(/günstigste/.test(r.json.ausschreibung.hinweis?.text || ""), "Bester Bieter erfährt, dass er vorne lag", r.json.ausschreibung.hinweis);
  pruefe(!r.text.includes(`Kundenfirma ${LAUF}`) && !r.text.includes(`Zweitfirma ${LAUF}`), "Pool-Los ohne Kundennamen");
  r = await L1.c.post(`/api/portal/ausschreibungen/${P.id}/angebot`, pb(11.2, 50));
  pruefe(r.status === 200 && r.json.angebot.runde === 2, "Angebot in Runde 2");
  r = await admin.post(`/api/admin/energie/ausschreibungen/${P.id}`, { aktion: "abbrechen", grund: "Testende" });
  pruefe(r.status === 200 && r.json.ausschreibung.status === "abgebrochen", "Ausschreibung abgebrochen (Absagen)");

  abschnitt("B8. Handelsdesk, Wechselanalyse, Rechte");
  r = await admin.get("/api/admin/energie/kunden");
  const kk = r.json.kunden?.find((x) => x.kunde.id === kunde2.nutzer.id);
  pruefe(r.status === 200 && kk?.analyse?.empfehlung && Number.isFinite(kk.analyse.marktCt), "Kundenliste mit Wechselanalyse (Empfehlung, Marktpreis)", kk?.analyse);
  r = await admin.post("/api/admin/energie", { aktion: "lauf" });
  pruefe(r.status === 200 && r.json.lauf.analysen >= 1, "Wechselanalyse-Lauf (Fristen-Alarme)", r.json);
  r = await admin.post("/api/admin/energie/termin", { eintrag: { handelstag: new Date().toISOString().slice(0, 10), zone: "DE", produkt: `Cal-${String(new Date().getUTCFullYear() + 1).slice(2)}`, typ: "base", preisEurMwh: 97.25, quelle: `Test ${LAUF}` } });
  pruefe(r.status === 200 && r.json.neu + r.json.ersetzt === 1, "Terminpreis manuell eingespielt (mit Quelle)", r.json);
  r = await admin.post("/api/admin/energie/termin", { eintrag: { handelstag: "2026-09-29", zone: "DE", produkt: "Cal-27", typ: "base", preisEurMwh: 97 } });
  pruefe(r.status === 422, "Terminpreis ohne Quelle → 422", r.status);
  r = await admin.get("/api/admin/energie/portfolio");
  pruefe(r.status === 200 && r.json.portfolio?.zonen && Object.values(r.json.portfolio.zonen).every((z) => z.summe.hedgeQuote === null || (z.summe.hedgeQuote >= 0 && z.summe.hedgeQuote <= 1)), "Pool-Portfolio mit Hedge-Quote");
  r = await kunde.get("/api/admin/energie/kunden");
  pruefe(r.status === 403, "Kunde → Backoffice-API 403", r.status);
  r = await L1.c.get("/api/admin/energie/ausschreibungen");
  pruefe(r.status === 403, "Lieferant → Backoffice-API 403", r.status);
  const lesen = new Client("bo-lesen");
  if (await lesen.login("bo-lesen@example.com").catch(() => null)) {
    r = await lesen.get("/api/admin/energie/kunden");
    pruefe(r.status === 200, "Unterrolle „lesen“ liest den Handelsdesk");
    r = await lesen.post("/api/admin/energie", { aktion: "lauf" });
    pruefe(r.status === 403, "Unterrolle „lesen“ schreibt nicht → 403", r.status);
  }
  const akq = new Client("bo-akquise");
  if (await akq.login("bo-akquise@example.com").catch(() => null)) {
    r = await akq.get("/api/admin/energie/kunden");
    pruefe(r.status === 403, "Unterrolle „akquise“ ohne Bereich Energie → 403", r.status);
  }
  const bo = new Client("bo-energie");
  if (await bo.login("bo-energie@example.com").catch(() => null)) {
    r = await bo.get("/api/admin/energie/ausschreibungen");
    pruefe(r.status === 200 && r.json.ausschreibungen.length >= 3, "Unterrolle „energie“ sieht die Ausschreibungen (inkl. Demo)", r.json.ausschreibungen?.length);
  }
  r = await L1.c.get("/api/portal/ausschreibungen");
  const demoSichtbar = r.json.ausschreibungen.filter((x) => /Demo/.test(x.titel || "")).length;
  pruefe(demoSichtbar === 0, "Testversorger sieht keine Demo-Ausschreibungen (nicht eingeladen)", demoSichtbar);

  abschnitt("B9. Seiten");
  for (const [cl, pfad, soll] of [
    [admin, "/portal/admin/energie", 200],
    [admin, "/portal/admin/energie?tab=termin", 200],
    [admin, "/portal/admin/energie?tab=portfolio", 200],
    [admin, `/portal/admin/energie/kunden/${kunde.nutzer.id}`, 200],
    [admin, `/portal/admin/energie/ausschreibungen/${A.id}`, 200],
    [admin, "/portal/admin/energie/lieferanten", 200],
    [kunde, "/portal/energie/beschaffung", 200],
    [L1.c, "/portal/ausschreibungen", 200],
    [L1.c, `/portal/ausschreibungen/${P.id}`, 200],
    [L3.c, `/portal/ausschreibungen/${A.id}`, 404],
    [L1.c, "/portal/admin/energie", 404],
    [kunde, "/portal/ausschreibungen", 404],
    [gast, `/einladung/lieferant/${L1.token}`, 200],
  ]) {
    r = await cl.get(pfad);
    const nichtGefunden = r.status === 404 || r.text.includes("NEXT_HTTP_ERROR_FALLBACK;404");
    pruefe(soll === 404 ? nichtGefunden && !r.text.includes(`Kundenfirma ${LAUF}`) : r.status === 200 && !nichtGefunden, `${pfad} (${cl.name}) → ${soll}`, r.status);
  }
}

async function main() {
  console.log(`Energiebeschaffung – Test ${NUR_LOGIK ? "(nur Logik)" : `gegen ${BASIS}`} (Lauf ${LAUF})`);
  teilA();
  if (!NUR_LOGIK) await teilB();
  console.log(`\n${fehler ? rot(`${fehler} Fehler`) : gruen("Alle Prüfungen bestanden")} (${ok} ok)`);
  process.exit(fehler ? 1 : 0);
}

main().catch((e) => {
  console.error(rot(`Abbruch: ${e.stack || e.message}`));
  process.exit(1);
});
