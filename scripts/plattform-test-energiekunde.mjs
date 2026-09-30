// scripts/plattform-test-energiekunde.mjs
//
// Test „Kundenseite Energie“ (Team 4: Contracting-Kunde, Reststrom-Kunde, Energieversorger).
//   node scripts/plattform-test-energiekunde.mjs              → reine Logik + End-to-End gegen den laufenden Dev-Server
//   node scripts/plattform-test-energiekunde.mjs --nur-logik  → nur reine Logik (ohne Server, inkl. Gleichheit JS/Python)
//
// Teil A (Logik): Zustandsautomat der Anliegen (Rollen, unzulässige Übergänge), Einspruch-/Kündigungs-/Angebotsprüfung,
// Fristen (Monatsende-Kappung), Lieferantenwechsel (Rolle, Reihenfolge, Ampel), Kostenbericht (nachgerechnet), Mahnsperre.
// Teil B (Server): Einspruch mit Mahnsperre → Teilstattgabe → Klärfall + PDF; Kündigung mit Fristprüfung → Vertrag gekündigt;
// Übernahme mit Angebot → Annahme → Aufgabe; Zurückziehen; Kunden-Störungsmeldung; fremde Konten 403/404; Unterrollen; CSRF;
// Ausschreibung bis Zuschlag → Lieferantenwechsel Schritt für Schritt (Kunde, Versorger, Backoffice) → Verträge aktiv/beendet;
// Vertragsdatenblatt nur für den bezuschlagten Versorger; Kostenbericht (JSON, CSV, PDF); Seiten.
// Eigene Konten mit Präfix ek-test-<Lauf>@example.com – Demo-Daten bleiben unberührt.

import { spawnSync } from "node:child_process";
import {
  aktionPruefen, anliegenPruefen, erlaubteAktionen, kostenreport, kuendigungContracting, monateZurueck, uebergang, wechselAnlegen, wechselSchrittErledigen, wechselStand,
} from "../src/lib/plattform/kundenenergie.js";
import { mahnhinweis } from "../src/lib/plattform/finanzen/provision.js";

const BASIS = (process.argv.find((a) => a.startsWith("http")) || process.env.PLATTFORM_TEST_URL || "http://localhost:3100").replace(/\/$/, "");
const NUR_LOGIK = process.argv.includes("--nur-logik") || process.argv.includes("--logik");
const DEMO_PASSWORT = process.env.PLATTFORM_DEMO_PASSWORT || "Demo-2026!";
const LAUF = Date.now().toString(36);
const PASSWORT = "Energiekunde-Test-26";

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
const status = (fn) => {
  try {
    fn();
    return null;
  } catch (e) {
    return e.status || "?";
  }
};

// ================================================================ Teil A: reine Logik

const HEUTE = "2026-10-01";
const BELEG = { art: "contracting", beleg: "rechnung", status: "offen", brutto: 1309 };
const VERTRAG = { status: "aktiv", ende: "2040-06-01", kuendigungsfristMonate: 6, endschaft: "kaufoption", kaufoptionEur: 120000 };

function teilA() {
  abschnitt("A1. Zustandsautomat der Kundenanliegen");
  pruefe(uebergang("einspruch", "eingereicht", "pruefen", "bo") === "in_pruefung" && uebergang("einspruch", "in_pruefung", "teilweise", "bo") === "teilweise", "Einspruch: eingereicht → in Prüfung → teilweise stattgegeben");
  pruefe(status(() => uebergang("einspruch", "eingereicht", "stattgeben", "kunde")) === 403, "Kunde kann sich nicht selbst stattgeben (403)");
  pruefe(status(() => uebergang("einspruch", "abgelehnt", "zurueckziehen", "kunde")) === 409, "Entschiedenes Anliegen nicht mehr zurückziehbar (409)");
  pruefe(status(() => uebergang("einspruch", "eingereicht", "angebot", "bo")) === 409, "Kein Angebot bei Einsprüchen");
  pruefe(uebergang("kaufoption", "angebot", "annehmen", "kunde") === "angenommen" && status(() => uebergang("kaufoption", "angebot", "zurueckziehen", "kunde")) === 409, "Übernahme: Angebot annehmen ja, zurückziehen nach Angebot nein");
  pruefe(JSON.stringify(erlaubteAktionen("kuendigung", "eingereicht", "kunde")) === '["zurueckziehen"]' && JSON.stringify(erlaubteAktionen("verlaengerung", "angebot", "bo")) === '["angebot"]', "Erlaubte Aktionen je Rolle und Status");

  abschnitt("A2. Prüfung von Einspruch, Kündigung und Angebot");
  const gut = { grund: "menge", text: "Zählerstand Ende August laut Foto 650.100 kWh statt 650.000", betragStrittigEur: "12,00" };
  pruefe(anliegenPruefen("einspruch", gut, { beleg: BELEG, heute: HEUTE }).betragStrittigEur === 12, "Einspruch mit Grund, Begründung und strittigem Betrag (Dezimalkomma)");
  pruefe(status(() => anliegenPruefen("einspruch", { ...gut, text: "zu kurz" }, { beleg: BELEG, heute: HEUTE })) === 422, "Einspruch ohne nachvollziehbare Begründung → 422");
  pruefe(status(() => anliegenPruefen("einspruch", { ...gut, betragStrittigEur: 5000 }, { beleg: BELEG, heute: HEUTE })) === 422, "Strittiger Betrag über dem Rechnungsbetrag → 422");
  pruefe(status(() => anliegenPruefen("einspruch", gut, { beleg: { ...BELEG, art: "pacht" }, heute: HEUTE })) === 422 && status(() => anliegenPruefen("einspruch", gut, { beleg: { ...BELEG, status: "storniert" }, heute: HEUTE })) === 409, "Nur gegen nicht stornierte Contracting-Rechnungen");
  pruefe(monateZurueck("2026-12-31", 3) === "2026-09-30" && monateZurueck("2028-03-31", 1) === "2028-02-29" && monateZurueck("2027-03-31", 1) === "2027-02-28", "Frist mit Monatsende-Kappung (inkl. Schaltjahr)");
  const k = anliegenPruefen("kuendigung", { bestaetigt: true }, { vertrag: VERTRAG, heute: HEUTE });
  pruefe(k.wirksamZum === "2040-06-01" && k.stichtag === "2039-12-01", "Kündigung zum Laufzeitende, fristgerecht bis Ende − 6 Monate", k);
  pruefe(status(() => anliegenPruefen("kuendigung", {}, { vertrag: VERTRAG, heute: HEUTE })) === 422, "Kündigung nur mit ausdrücklicher Erklärung");
  pruefe(status(() => anliegenPruefen("kuendigung", { bestaetigt: true }, { vertrag: { ...VERTRAG, ende: "2027-01-31" }, heute: HEUTE })) === 409, "Verspätete Kündigung → 409 mit Hinweis auf Verlängerungsregelung");
  pruefe(kuendigungContracting({ ende: "2027-01-31", kuendigungsfristMonate: 6 }, HEUTE).fristgerecht === false, "Fristprüfung erkennt abgelaufene Frist");
  pruefe(status(() => aktionPruefen("einspruch", "teilweise", { begruendung: "Zählerstand teilweise korrigiert", korrekturEur: 100 }, { anliegen: { betragStrittigEur: 100 }, heute: HEUTE })) === 422, "Teilweise Stattgabe braucht Korrektur unter dem strittigen Betrag");
  pruefe(aktionPruefen("einspruch", "stattgeben", { begruendung: "Zählerstand korrigiert." }, { anliegen: { betragStrittigEur: 100 }, heute: HEUTE }).korrekturEur === 100, "Stattgabe übernimmt den strittigen Betrag als Korrektur");
  pruefe(status(() => aktionPruefen("kaufoption", "angebot", { betragEur: 98000, stichtag: "2040-06-01", gueltigBis: HEUTE }, { heute: HEUTE })) === 422, "Angebot muss in der Zukunft gültig sein");
  pruefe(status(() => aktionPruefen("kaufoption", "annehmen", { bestaetigt: true }, { anliegen: { angebot: { gueltigBis: "2026-09-01" } }, heute: HEUTE })) === 409, "Abgelaufenes Angebot kann nicht angenommen werden");

  abschnitt("A3. Lieferantenwechsel");
  let s = wechselAnlegen({ zuschlagAm: "2026-10-01T08:00:00.000Z", lieferbeginn: "2027-01", stichtagAlt: "2026-12-31", mitVorvertrag: true });
  pruefe(s[0].status === "erledigt" && s.find((x) => x.id === "anmeldung_netz").frist === "2026-12-31" && s.find((x) => x.id === "erste_rechnung").frist === "2027-02-15", "Schritte mit Fristen (Anmeldung am Vortag des Lieferbeginns, erste Rechnung +45 Tage)");
  pruefe(status(() => wechselSchrittErledigen(s, "vertrag_versorger", "kunde", { am: "x" })) === 403, "Liefervertrag stellt der Versorger bereit, nicht der Kunde (403)");
  pruefe(status(() => wechselSchrittErledigen(s, "vertrag_kunde", "kunde", { am: "x" })) === 409, "Gegenzeichnen erst nach Bereitstellung (409)");
  s = wechselSchrittErledigen(s, "vertrag_versorger", "lieferant", { am: "x" });
  pruefe(wechselStand(s, "2027-01-05").ampel === "rot", "Überfällige Kündigung/Anmeldung → Ampel rot");
  for (const [sid, wer] of [["vertrag_kunde", "kunde"], ["kuendigung_alt", "bo"], ["kuendigung_bestaetigt", "kunde"], ["anmeldung_netz", "lieferant"], ["lieferbeginn", "lieferant"], ["erste_rechnung", "kunde"]]) s = wechselSchrittErledigen(s, sid, wer, { am: "x" });
  const st = wechselStand(s, "2027-03-01");
  pruefe(st.abgeschlossen && st.prozent === 100 && st.ampel === "gruen", "Alle Schritte bestätigt → abgeschlossen");
  const ohne = wechselAnlegen({ zuschlagAm: "2026-10-01", lieferbeginn: "2027-01" });
  pruefe(ohne.find((x) => x.id === "kuendigung_alt").status === "entfaellt" && status(() => wechselSchrittErledigen(ohne, "kuendigung_alt", "bo", { am: "x" })) === 409, "Ohne Vorvertrag entfallen die Kündigungsschritte");

  abschnitt("A4. Kostenbericht und Mahnsperre");
  const vt = [{ id: "a", lieferant: "X", beginn: "2024-01-01", vertragEnde: "2026-12-31", energiepreisCt: 13.2, jahresKwh: 120000, status: "aktiv" }];
  const r = kostenreport({ jahr: 2026, vertraege: vt, netzMonate: null, pvMonate: [{ monat: "2026-08", kwh: 90000, netto: 10950 }] });
  pruefe(r.summe.netzEur === 15840 && r.summe.pvErsparnisEur === 930 && r.monate[0].netzGeschaetzt && r.monate[7].pvCt === 12.167, "Netz 120.000 kWh × 13,2 ct = 15.840 €; Solarstrom 90.000 kWh zu 12,167 ct → Ersparnis 930 €", r.summe);
  const r2 = kostenreport({ jahr: 2026, vertraege: vt, netzMonate: Array(12).fill(10000), pvMonate: [] });
  pruefe(!r2.monate[0].netzGeschaetzt && r2.summe.mischpreisCt === 13.2, "Mit Lastgang: Monatswerte statt Schätzung, Mischpreis = Energiepreis");
  const r3 = kostenreport({ jahr: 2026, vertraege: [{ ...vt[0], energiepreisCt: null }], netzMonate: Array(12).fill(10000), pvMonate: [] });
  pruefe(r3.monate[0].netzEur === null && r3.hinweise.some((h) => h.includes("Tranchen")), "Tranchen/Spot ohne festen Preis: Betrag offen, Hinweis");
  pruefe(mahnhinweis({ status: "offen", faelligAm: "2026-08-01", mahnsperre: { anliegenId: "KN-26-X" } }, HEUTE)?.faellig === false && mahnhinweis({ status: "offen", faelligAm: "2026-08-01" }, HEUTE)?.faellig === true, "Mahnsperre bei offenem Einspruch unterdrückt den Mahnvorschlag");

  abschnitt("A5. Gleichheit JS / Python (kundenenergie_kern.py)");
  const faelle = {
    stichtag: ["monate_zurueck", ["2026-12-31", 3]],
    kuendigung: ["kuendigung_contracting", [VERTRAG, HEUTE]],
    wechsel: ["wechsel_anlegen", ["2026-10-01T08:00:00.000Z", "2027-01", "2026-12-31", true]],
    kosten: ["kostenreport", [2026, vt, null, [{ monat: "2026-08", kwh: 90000, netto: 10950 }]]],
    aktionen: ["erlaubte_aktionen", ["kaufoption", "angebot", "kunde"]],
  };
  const py = spawnSync(process.env.PYTHON || "python", ["-c", "import sys,json;sys.path.insert(0,'Backend-Import/oekoinvest_app');from oekoinvest_app.plattform import kundenenergie_kern as k;d=json.loads(sys.stdin.buffer.read().decode('utf-8'));print(json.dumps({n:getattr(k,f)(*a) for n,(f,a) in d.items()}))"], { input: JSON.stringify(faelle), encoding: "utf8", timeout: 30000 });
  if (py.status === 0) {
    const p = JSON.parse(py.stdout);
    const js = {
      stichtag: monateZurueck("2026-12-31", 3),
      kuendigung: kuendigungContracting(VERTRAG, HEUTE),
      wechsel: wechselAnlegen({ zuschlagAm: "2026-10-01T08:00:00.000Z", lieferbeginn: "2027-01", stichtagAlt: "2026-12-31", mitVorvertrag: true }),
      kosten: kostenreport({ jahr: 2026, vertraege: vt, netzMonate: null, pvMonate: [{ monat: "2026-08", kwh: 90000, netto: 10950 }] }),
      aktionen: erlaubteAktionen("kaufoption", "angebot", "kunde"),
    };
    const norm = (x) => JSON.stringify(x, (k, v) => (typeof v === "number" ? Math.round(v * 1000) / 1000 : v));
    for (const n of Object.keys(js)) pruefe(norm(js[n]) === norm(p[n]), `JS und Python identisch: ${n}`, { js: js[n], py: p[n] });
  } else console.log(`  – Python nicht verfügbar, Gleichheitsprüfung übersprungen (${(py.stderr || py.error?.message || "").slice(0, 160)})`);
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
    const email = `ek-test-${LAUF}-${schluessel}@example.com`;
    const r = await this.post("/api/auth/registrieren", { email, passwort: PASSWORT, vorname: "Test", nachname: `${schluessel} (Test)`, firma, rollen: ["unternehmen"], agb: true });
    if (r.status !== 201) throw new Error(`Registrierung ${email}: ${r.status} ${JSON.stringify(r.json)}`);
    this.nutzer = r.json.nutzer;
    this.email = email;
    return r.json.nutzer;
  }
}

const inStunden = (h) => new Date(Date.now() + h * 3600e3).toISOString();
const inTagen = (t) => new Date(Date.now() + t * 86400e3).toISOString().slice(0, 10);
const JAHR = new Date().getUTCFullYear();

async function lieferantAnlegen(admin, schluessel, name) {
  const email = `ek-test-${LAUF}-${schluessel}@example.com`;
  let r = await admin.post("/api/admin/energie/lieferanten", { daten: { name: `${name} ${LAUF} (Test)`, land: "DE", gebiete: ["DE"], ansprechpartner: [{ name: "Test", email }] } });
  if (r.status !== 200) throw new Error(`Lieferant anlegen: ${r.status} ${JSON.stringify(r.json)}`);
  const l = r.json.lieferant;
  r = await admin.post(`/api/admin/energie/lieferanten/${l.id}`, { aktion: "einladen", email });
  const token = String(r.json.demoLink || "").split("/").pop();
  const c = new Client(schluessel);
  r = await c.post("/api/portal/ausschreibungen/einladung", { token, vorname: "Lia", nachname: `${schluessel} (Test)`, passwort: PASSWORT });
  if (r.status !== 200) throw new Error(`Einladung annehmen: ${r.status} ${JSON.stringify(r.json)}`);
  await c.login(email, PASSWORT);
  return { c, l, email };
}

async function aufwaermen() {
  const c = new Client("aufwaermen");
  for (const p of ["/api/portal/kundenenergie/anliegen", "/api/portal/kundenenergie/anliegen/KN-26-XXXXXX", "/api/portal/kundenenergie/anliegen/KN-26-XXXXXX/pdf", "/api/portal/kundenenergie/stoerung", "/api/portal/kundenenergie/wechsel", "/api/portal/kundenenergie/wechsel/LW-26-XXXXXX", "/api/portal/kundenenergie/vertragsdaten", "/api/portal/kundenenergie/kosten", "/api/admin/finanzen/anliegen", "/api/admin/finanzen/anliegen/KN-26-XXXXXX", "/api/admin/energie/wechsel", "/api/admin/energie/wechsel/LW-26-XXXXXX", "/api/admin/anlagen", "/api/admin/finanzen/lauf", "/api/admin/energie/ausschreibungen"]) {
    await c.get(p).catch(() => null);
  }
}

async function teilB() {
  await aufwaermen();
  const admin = new Client("admin");
  const buch = new Client("bo-buchhaltung");
  const lesen = new Client("bo-lesen");
  const akquise = new Client("bo-akquise");
  const kunde = new Client("kunde");
  const fremd = new Client("fremd");
  const gast = new Client("gast");
  await admin.login("admin@example.com");
  await buch.login("bo-buchhaltung@example.com");
  await lesen.login("bo-lesen@example.com");
  await akquise.login("bo-akquise@example.com");
  await kunde.registrieren("k1", `Contracting ${LAUF} GmbH (Test)`);
  await fremd.registrieren("k2", `Fremdfirma ${LAUF} AG (Test)`);

  // ------------------------------------------------------------ Contracting-Anlage mit Rechnung
  abschnitt("B1. Contracting-Kunde: Anlage, Vertrag, Rechnung");
  let r = await admin.post("/api/admin/anlagen", { eigentuemer: `Solar SPV ${LAUF} GmbH (Test)`, dachgeberIstKunde: true, name: `Kundendach ${LAUF} (Test)`, typ: "dach", status: "betrieb", land: "DE", bundesland: "Bayern", ort: "Raum Augsburg", kwp: 500, wechselrichterAnzahl: 3, lastprofil: "gewerbe", lastJahrKwh: 600000, inbetriebnahme: "2025-06-01", kundeId: kunde.nutzer.id });
  const aid = r.json.anlage?.id;
  pruefe(r.status === 201 && aid, "Backoffice legt Contracting-Anlage für den Testkunden an", r.json);
  const eintrag = async (art, daten) => {
    let e = await admin.post(`/api/admin/anlagen/${aid}/eintraege`, { art, daten });
    for (let i = 1; i <= 3 && e.status === 500; i++) {
      await new Promise((w) => setTimeout(w, 5000 * i));
      e = await admin.post(`/api/admin/anlagen/${aid}/eintraege`, { art, daten });
    }
    return e;
  };
  r = await eintrag("messpunkt", { bezeichnung: "Erzeugung (geeicht)", zaehlernummer: `1EK${LAUF}`, art: "erzeugung", messstelle: "geeicht", abrechnungsrelevant: true });
  const mp = r.json.eintrag?.id;
  r = await eintrag("vertrag", { beginn: "2025-06-01", laufzeitJahre: 15, strompreisCt: 12, grundgebuehrMonat: 150, indexierungPct: 0, indexBasis: "fest", kuendigungsfristMonate: 6, endschaft: "kaufoption", kaufoptionEur: 120000 });
  pruefe(r.status === 200, "Stromliefervertrag (15 Jahre, Kaufoption) an der Anlage", r.json);
  for (const [monat, stand] of [["2026-06", 100000], ["2026-07", 170000], ["2026-08", 240000]]) await eintrag("monatswert", { messpunktId: mp, monat, register: "2.8.0", stand, geprueft: true });
  r = await admin.post("/api/admin/finanzen/lauf", { art: "contracting", monat: "2026-08", anlageIds: [aid] });
  const rechnung = r.json.lauf?.erzeugt?.[0];
  pruefe(r.status === 200 && rechnung?.netto === 70000 * 0.12 + 150, "Contracting-Rechnung August: 70.000 kWh × 12 ct + 150 € Grundgebühr", r.json.lauf);

  // ------------------------------------------------------------ Einspruch
  abschnitt("B2. Einspruch gegen die Rechnung");
  r = await kunde.get("/api/portal/kundenenergie/anliegen?auswahl=1");
  pruefe(r.status === 200 && r.json.auswahl?.belege?.some((b) => b.id === rechnung?.id) && r.json.auswahl.anlagen.some((a) => a.id === aid && a.vertrag?.kuendigung?.fristgerecht), "Formular-Auswahl: eigene Rechnung und Anlage mit Fristprüfung", r.json.auswahl);
  const einspruch = { art: "einspruch", belegId: rechnung?.id, grund: "menge", text: "Unser Kontrollzähler zeigt Ende August 238.500 kWh statt 240.000 kWh.", betragStrittigEur: 180 };
  r = await kunde.post("/api/portal/kundenenergie/anliegen", { ...einspruch, text: "falsch" });
  pruefe(r.status === 422, "Einspruch ohne nachvollziehbare Begründung → 422", r.status);
  r = await fremd.post("/api/portal/kundenenergie/anliegen", einspruch);
  pruefe([403, 404].includes(r.status), "Fremdes Unternehmen kann gegen die Rechnung keinen Einspruch einlegen", r.status);
  r = await kunde.post("/api/portal/kundenenergie/anliegen", einspruch, { origin: "https://boese.example.org" });
  pruefe(r.status === 403, "CSRF: fremde Herkunft → 403", r.status);
  r = await kunde.post("/api/portal/kundenenergie/anliegen", einspruch);
  const E1 = r.json.anliegen;
  pruefe(r.status === 201 && E1?.status === "eingereicht" && E1.zielAm && E1.belegNummer === rechnung?.nummer, "Einspruch eingereicht (Bearbeitungsziel, Rechnungsbezug)", r.json);
  pruefe(E1?.verlauf?.some((x) => /Mahnsperre/.test(x.text)), "Mahnsperre an der Rechnung vermerkt", E1?.verlauf);
  r = await kunde.post("/api/portal/kundenenergie/anliegen", einspruch);
  pruefe(r.status === 409, "Zweiter offener Einspruch zur selben Rechnung → 409", r.status);
  r = await kunde.post(`/api/portal/kundenenergie/anliegen/${E1?.id}`, { aktion: "stattgeben", begruendung: "Das mache ich selbst." });
  pruefe(r.status === 403, "Kunde kann sich nicht selbst stattgeben → 403", r.status);
  r = await fremd.get("/api/portal/kundenenergie/anliegen");
  pruefe(r.status === 200 && !r.json.anliegen.some((a) => a.id === E1?.id), "Fremder Kunde sieht das Anliegen nicht");
  r = await fremd.get(`/api/portal/kundenenergie/anliegen/${E1?.id}/pdf`);
  pruefe(r.status === 404, "Fremder Kunde: PDF → 404", r.status);
  r = await akquise.get("/api/admin/finanzen/anliegen");
  pruefe(r.status === 403, "Unterrolle Akquise: kein Zugriff auf Kundenanliegen → 403", r.status);
  r = await lesen.get("/api/admin/finanzen/anliegen");
  pruefe(r.status === 200 && r.json.anliegen.some((a) => a.id === E1?.id && a.aktionen.length === 0), "Unterrolle „Nur lesen“ sieht, aber ohne Aktionen");
  r = await lesen.post(`/api/admin/finanzen/anliegen/${E1?.id}`, { aktion: "pruefen" });
  pruefe(r.status === 403, "Unterrolle „Nur lesen“ entscheidet nicht → 403", r.status);
  r = await buch.post(`/api/admin/finanzen/anliegen/${E1?.id}`, { aktion: "pruefen" });
  pruefe(r.status === 200 && r.json.anliegen.status === "in_pruefung", "Buchhaltung nimmt den Einspruch in Prüfung", r.json);
  r = await buch.post(`/api/admin/finanzen/anliegen/${E1?.id}`, { aktion: "teilweise", begruendung: "Zählerstand teilweise bestätigt." });
  pruefe(r.status === 422, "Teilweise Stattgabe ohne Korrekturbetrag → 422", r.status);
  r = await buch.post(`/api/admin/finanzen/anliegen/${E1?.id}`, { aktion: "teilweise", begruendung: "Der Ablesewert des Messstellenbetreibers wurde geprüft; 1.000 kWh werden gutgeschrieben.", korrekturEur: 120 });
  const E1b = r.json.anliegen;
  pruefe(r.status === 200 && E1b?.status === "teilweise" && E1b.korrekturEur === 120 && E1b.klaerfallId, "Teilweise stattgegeben: Korrektur 120 €, Klärfall für die Buchhaltung", E1b);
  pruefe(E1b?.verlauf?.some((x) => /Mahnsperre aufgehoben/.test(x.text)), "Mahnsperre nach der Entscheidung aufgehoben");
  r = await admin.get("/api/admin/finanzen/klaerfaelle");
  pruefe((r.json.klaerfaelle || []).some((k) => k.id === E1b?.klaerfallId && k.status === "offen"), "Klärfall „Korrektur“ in Finanzen offen");
  r = await kunde.get("/api/portal/kundenenergie/anliegen");
  const E1k = r.json.anliegen?.find((a) => a.id === E1?.id);
  pruefe(E1k?.status === "teilweise" && E1k.begruendung && E1k.klaerfallId === undefined, "Kunde sieht Entscheidung und Begründung (ohne interne Klärfall-ID)", E1k);
  r = await kunde.anfrage("GET", `/api/portal/kundenenergie/anliegen/${E1?.id}/pdf`, undefined, { roh: true });
  const pdf = Buffer.from(await r.arrayBuffer());
  pruefe(r.status === 200 && pdf.subarray(0, 5).toString() === "%PDF-" && pdf.includes(Buffer.from("Entscheidung", "latin1")), "Entscheidung als PDF", r.status);
  r = await kunde.post(`/api/portal/kundenenergie/anliegen/${E1?.id}`, { aktion: "zurueckziehen" });
  pruefe(r.status === 409, "Entschiedener Einspruch kann nicht zurückgezogen werden → 409", r.status);

  // ------------------------------------------------------------ Übernahme (Kaufoption), Verlängerung
  abschnitt("B3. Übernahme der Anlage und Verlängerung");
  r = await kunde.post("/api/portal/kundenenergie/anliegen", { art: "kaufoption", anlageId: aid, wunschTermin: "2040-06-01", text: "Wir möchten die Anlage zum Laufzeitende übernehmen." });
  const U = r.json.anliegen;
  pruefe(r.status === 201 && U?.status === "eingereicht", "Übernahme angefragt", r.json);
  r = await fremd.post("/api/portal/kundenenergie/anliegen", { art: "kaufoption", anlageId: aid });
  pruefe(r.status === 403, "Fremdes Unternehmen: Anlage gesperrt → 403", r.status);
  r = await buch.post(`/api/admin/finanzen/anliegen/${U?.id}`, { aktion: "angebot", betragEur: 98000, stichtag: "2040-06-01" });
  pruefe(r.status === 422, "Angebot ohne Gültigkeit → 422", r.status);
  r = await buch.post(`/api/admin/finanzen/anliegen/${U?.id}`, { aktion: "angebot", betragEur: 98000, stichtag: "2040-06-01", gueltigBis: inTagen(30), text: "Kaufpreis nach Restwert, zzgl. USt." });
  pruefe(r.status === 200 && r.json.anliegen.status === "angebot" && r.json.anliegen.angebot?.betragEur === 98000, "Backoffice unterbreitet Kaufangebot", r.json);
  r = await kunde.post(`/api/portal/kundenenergie/anliegen/${U?.id}`, { aktion: "annehmen" });
  pruefe(r.status === 422, "Annahme ohne ausdrückliche Bestätigung → 422", r.status);
  r = await kunde.post(`/api/portal/kundenenergie/anliegen/${U?.id}`, { aktion: "annehmen", bestaetigt: true });
  pruefe(r.status === 200 && r.json.anliegen.status === "angenommen" && r.json.anliegen.verlauf.some((x) => /Vertragsunterlagen/.test(x.text)), "Kunde nimmt an → Backoffice bereitet Kaufvertrag vor", r.json.anliegen?.status);
  r = await kunde.post("/api/portal/kundenenergie/anliegen", { art: "verlaengerung", anlageId: aid, wunschJahre: 5 });
  const V = r.json.anliegen;
  pruefe(r.status === 201, "Verlängerung angefragt", r.status);
  r = await kunde.post(`/api/portal/kundenenergie/anliegen/${V?.id}`, { aktion: "zurueckziehen" });
  pruefe(r.status === 200 && r.json.anliegen.status === "zurueckgezogen", "Kunde zieht die Anfrage zurück", r.json.anliegen?.status);

  // ------------------------------------------------------------ Kündigung
  abschnitt("B4. Kündigung zum Laufzeitende");
  r = await kunde.post("/api/portal/kundenenergie/anliegen", { art: "kuendigung", anlageId: aid });
  pruefe(r.status === 422, "Kündigung ohne Erklärung → 422", r.status);
  r = await kunde.post("/api/portal/kundenenergie/anliegen", { art: "kuendigung", anlageId: aid, bestaetigt: true, text: "Rückbau zum Laufzeitende gewünscht." });
  const KU = r.json.anliegen;
  pruefe(r.status === 201 && KU?.wirksamZum === "2040-06-01" && KU.stichtag === "2039-12-01", "Kündigung fristgerecht zum 01.06.2040 (Frist bis 01.12.2039)", KU);
  r = await buch.post(`/api/admin/finanzen/anliegen/${KU?.id}`, { aktion: "bestaetigen", begruendung: "Kündigung zum Laufzeitende bestätigt; Rückbau wird abgestimmt." });
  pruefe(r.status === 200 && r.json.anliegen.status === "bestaetigt", "Backoffice bestätigt die Kündigung", r.json.anliegen?.status);
  r = await kunde.get(`/api/portal/anlagen/${aid}`);
  pruefe(r.json.anlage?.vertrag?.status === "gekuendigt", "Contracting-Vertrag an der Anlage als gekündigt vermerkt", r.json.anlage?.vertrag?.status);
  r = await kunde.post("/api/portal/kundenenergie/anliegen", { art: "verlaengerung", anlageId: aid, wunschJahre: 3 });
  pruefe(r.status === 409, "Nach Kündigung keine weitere Vertragsanfrage (Vertrag nicht aktiv) → 409", r.status);

  // ------------------------------------------------------------ Störung melden
  abschnitt("B5. Störungsmeldung durch den Kunden");
  r = await kunde.post("/api/portal/kundenenergie/stoerung", { anlageId: aid, titel: "Aus", auswirkung: "kein_ertrag" });
  pruefe(r.status === 422, "Zu kurze Beschreibung → 422", r.status);
  r = await fremd.post("/api/portal/kundenenergie/stoerung", { anlageId: aid, titel: "Wechselrichter 2 zeigt rote LED", auswirkung: "kein_ertrag" });
  pruefe(r.status === 403, "Fremdes Unternehmen meldet keine Störung an fremder Anlage → 403", r.status);
  r = await kunde.post("/api/portal/kundenenergie/stoerung", { anlageId: aid, titel: "Wechselrichter 2 zeigt rote LED", text: "Seit heute Morgen, Display: Fehler 23.", auswirkung: "weniger_ertrag" });
  const ST = r.json.stoerung;
  pruefe(r.status === 201 && ST?.id && ST.schwere === "mittel" && ST.status === "offen", "Kunde meldet Störung (Schwere aus Auswirkung)", r.json);
  r = await kunde.get(`/api/portal/anlagen/stoerungen?anlage=${aid}`);
  pruefe(r.json.stoerungen?.some((s) => s.id === ST?.id), "Meldung erscheint in den Störungen der Anlage");
  r = await admin.post(`/api/portal/anlagen/stoerungen/${ST?.id}`, { aktion: "quittieren" });
  pruefe(r.status === 200, "Betrieb quittiert die Kundenmeldung", r.status);

  // ------------------------------------------------------------ Reststrom: Ausschreibung → Zuschlag → Wechsel
  abschnitt("B6. Reststrom-Kunde: Zuschlag und Lieferantenwechsel");
  const L1 = await lieferantAnlegen(admin, "l1", "Wechselversorger Eins");
  const L2 = await lieferantAnlegen(admin, "l2", "Wechselversorger Zwei");
  r = await kunde.post("/api/portal/fach/energie/abnahmestellen", { daten: { bezeichnung: "Werk Test", land: "DE", plz: "86150", ort: "Augsburg", maloId: "51238696781", messart: "rlm", jahresverbrauchKwh: 480000, spitzeKw: 160 } });
  pruefe(r.status === 200, "Kunde legt Abnahmestelle mit MaLo an", r.json);
  r = await kunde.post("/api/portal/energie", { daten: { lieferant: `Altversorger ${LAUF} (Test)`, zone: "DE", preisCt: 14.1, preisArt: "energie", beginn: `${JAHR - 1}-01-01`, vertragEnde: `${JAHR + 1}-12-31`, kuendigungsfristMonate: 3, jahresKwh: 480000, lastprofil: "zweischicht" } });
  pruefe(r.status === 200, "Laufender Stromvertrag erfasst", r.status);
  await kunde.post("/api/portal/energie/vollmacht", { aktion: "erteilen", zustimmung: true });
  r = await admin.post("/api/admin/energie/ausschreibungen", { titel: `Wechseltest ${LAUF}`, kundenIds: [kunde.nutzer.id], zone: "DE", lieferbeginn: `${JAHR + 2}-01`, produkte: [{ art: "fix", laufzeitJahre: 1 }], lieferantIds: [L1.l.id, L2.l.id], bestpreis: "abstand", starten: true, frist: inStunden(3) });
  const A = r.json.ausschreibung;
  pruefe(r.status === 201 && A?.id, "Ausschreibung gestartet", r.json);
  const pb = (ap) => ({ positionen: [{ produktId: "P1", arbeitspreisCt: ap, grundpreisEurMonat: 50 }], bindefristBis: inStunden(24 * 20), zahlungszielTage: 14, sicherheit: "keine" });
  await L1.c.post(`/api/portal/ausschreibungen/${A?.id}/angebot`, pb(12.4));
  r = await L2.c.post(`/api/portal/ausschreibungen/${A?.id}/angebot`, pb(11.8));
  const sieger = r.json.angebot?.id;
  await admin.post(`/api/admin/energie/ausschreibungen/${A?.id}`, { aktion: "beenden" });
  await admin.post(`/api/admin/energie/ausschreibungen/${A?.id}`, { aktion: "zuschlagVorschlag", angebotId: sieger, produktId: "P1", begruendung: "Günstigster Festpreis." });
  r = await L2.c.get(`/api/portal/kundenenergie/vertragsdaten?ausschreibung=${A?.id}`);
  pruefe(r.status === 409 || r.status === 404, "Vor Kundenfreigabe keine Vertragsdaten für den Versorger", r.status);
  r = await kunde.post("/api/portal/energie/freigabe", { ausschreibungId: A?.id, entscheidung: "freigegeben" });
  pruefe(r.status === 200 && r.json.zuschlag === true, "Kunde bestätigt den Zuschlag", r.json);

  r = await kunde.get("/api/portal/kundenenergie/wechsel");
  const W = r.json.wechsel?.find((w) => w.ausschreibungId === A?.id);
  pruefe(r.status === 200 && W && W.schritte.find((s) => s.id === "zuschlag")?.status === "erledigt" && W.schritte.find((s) => s.id === "kuendigung_alt")?.status === "offen" && W.vorvertrag?.stichtag === `${JAHR + 1}-09-30`, "Lieferantenwechsel automatisch angelegt (Kündigungsstichtag des Altvertrags)", W);
  r = await fremd.get("/api/portal/kundenenergie/wechsel");
  pruefe(r.status === 200 && !r.json.wechsel.some((w) => w.id === W?.id), "Fremder Kunde sieht den Wechsel nicht");
  r = await L1.c.get("/api/portal/kundenenergie/wechsel");
  pruefe(r.status === 200 && !r.json.wechsel.some((w) => w.id === W?.id), "Unterlegener Versorger sieht den Wechsel nicht");
  r = await L1.c.get(`/api/portal/kundenenergie/vertragsdaten?ausschreibung=${A?.id}`);
  pruefe(r.status === 404, "Unterlegener Versorger erhält keine Vertragsdaten → 404", r.status);
  r = await L2.c.get(`/api/portal/kundenenergie/vertragsdaten?ausschreibung=${A?.id}`);
  const vd = r.json.vertragsdaten;
  pruefe(r.status === 200 && vd?.kunden?.[0]?.firma === `Contracting ${LAUF} GmbH (Test)` && vd.kunden[0].abnahmestellen.some((s) => s.maloId === "51238696781") && vd.produkt.arbeitspreisCt === 11.8, "Bezuschlagter Versorger erhält Firma, MaLo und Konditionen", vd);
  r = await L2.c.anfrage("GET", `/api/portal/kundenenergie/vertragsdaten?ausschreibung=${A?.id}&format=pdf`, undefined, { roh: true });
  const vpdf = Buffer.from(await r.arrayBuffer());
  pruefe(r.status === 200 && vpdf.subarray(0, 5).toString() === "%PDF-" && vpdf.includes(Buffer.from("51238696781", "latin1")), "Vertragsdatenblatt als PDF", r.status);
  r = await kunde.get(`/api/portal/kundenenergie/vertragsdaten?ausschreibung=${A?.id}`);
  pruefe(r.status === 403, "Kunde ruft keine Versorger-Vertragsdaten ab → 403 (Rolle)", r.status);

  const schritt = (c, s, b = {}) => c.post(`/api/portal/kundenenergie/wechsel/${W?.id}`, { schritt: s, ...b });
  r = await schritt(kunde, "vertrag_versorger");
  pruefe(r.status === 403, "Kunde kann den Schritt des Versorgers nicht bestätigen → 403", r.status);
  r = await schritt(kunde, "vertrag_kunde");
  pruefe(r.status === 409, "Gegenzeichnen erst nach Bereitstellung des Liefervertrags → 409", r.status);
  r = await schritt(L1.c, "vertrag_versorger");
  pruefe(r.status === 404, "Unterlegener Versorger kann keinen Schritt bestätigen → 404", r.status);
  r = await schritt(L2.c, "vertrag_versorger", { bemerkung: `Vertragsnr. LV-${LAUF}` });
  pruefe(r.status === 200 && r.json.wechsel.schritte.find((s) => s.id === "vertrag_versorger")?.status === "erledigt" && r.json.wechsel.verlauf.length === 0, "Versorger stellt Liefervertrag bereit (Versorger sieht keinen internen Verlauf)", r.json);
  r = await schritt(kunde, "vertrag_kunde");
  pruefe(r.status === 200, "Kunde bestätigt die Gegenzeichnung", r.status);
  r = await lesen.post(`/api/admin/energie/wechsel/${W?.id}`, { schritt: "kuendigung_alt" });
  pruefe(r.status === 403, "Unterrolle „Nur lesen“ bestätigt keine Schritte → 403", r.status);
  r = await admin.post(`/api/admin/energie/wechsel/${W?.id}`, { schritt: "kuendigung_alt", bemerkung: "Kündigung per Vollmacht versendet" });
  pruefe(r.status === 200, "Backoffice kündigt den Altvertrag (Vollmacht)", r.status);
  r = await schritt(kunde, "kuendigung_bestaetigt");
  pruefe(r.status === 200, "Kunde meldet die Kündigungsbestätigung", r.status);
  r = await schritt(L2.c, "lieferbeginn");
  pruefe(r.status === 409, "Lieferbeginn erst nach Anmeldung beim Netzbetreiber → 409", r.status);
  r = await schritt(L2.c, "anmeldung_netz");
  pruefe(r.status === 200, "Versorger bestätigt die Anmeldung beim Netzbetreiber", r.status);
  r = await schritt(L2.c, "lieferbeginn");
  pruefe(r.status === 200, "Versorger bestätigt den Lieferbeginn", r.status);
  r = await kunde.get("/api/portal/energie");
  const neuV = r.json.vertraege?.find((x) => x.ausschreibungId === A?.id);
  const altV = r.json.vertraege?.find((x) => x.lieferant === `Altversorger ${LAUF} (Test)`);
  pruefe(neuV?.status === "aktiv" && altV?.status === "beendet", "Neuer Vertrag aktiv, Altvertrag beendet", { neu: neuV?.status, alt: altV?.status });
  r = await schritt(kunde, "erste_rechnung", { bemerkung: "Preis stimmt" });
  pruefe(r.status === 200 && r.json.wechsel.stand.abgeschlossen, "Erste Rechnung geprüft → Wechsel abgeschlossen", r.json.wechsel?.stand);
  r = await admin.get("/api/admin/energie/wechsel");
  pruefe(r.status === 200 && r.json.wechsel.some((w) => w.id === W?.id && w.stand.abgeschlossen && w.kunde?.firma), "Backoffice-Übersicht zeigt den abgeschlossenen Wechsel");
  r = await akquise.get("/api/admin/energie/wechsel");
  pruefe(r.status === 403, "Unterrolle Akquise: kein Zugriff auf Wechsel → 403", r.status);

  // ------------------------------------------------------------ Kostenbericht
  abschnitt("B7. Energiekostenbericht");
  r = await kunde.get("/api/portal/kundenenergie/kosten?jahr=2026");
  const kb = r.json.bericht;
  const aug = kb?.monate?.find((m) => m.monat === "2026-08");
  pruefe(r.status === 200 && kb.monate.length === 12 && aug?.pvKwh === 70000 && aug.netzGeschaetzt && aug.netzCt === 14.1, "Kostenbericht: Solarstrom aus der Rechnung, Netzbezug zum Energiepreis (geschätzt ohne Lastgang)", aug);
  pruefe(Math.abs(aug.pvEur - (70000 * 0.12 + 150)) < 0.01 && Math.abs(aug.netzEur - Math.round(480000 / 12) * 0.141) < 0.01, "Monatsbeträge nachgerechnet", { pv: aug?.pvEur, netz: aug?.netzEur });
  r = await kunde.anfrage("GET", "/api/portal/kundenenergie/kosten?jahr=2026&format=csv", undefined, { roh: true });
  const csvRoh = Buffer.from(await r.arrayBuffer());
  const csvText = csvRoh.toString("utf8");
  pruefe(r.status === 200 && csvRoh[0] === 0xef && csvRoh[1] === 0xbb && csvRoh[2] === 0xbf && csvText.includes("Mischpreis ct/kWh") && csvText.includes(";"), "CSV für Excel (BOM, Semikolon)", r.status);
  r = await kunde.anfrage("GET", "/api/portal/kundenenergie/kosten?jahr=2026&format=pdf", undefined, { roh: true });
  pruefe(r.status === 200 && (r.headers.get("content-type") || "").includes("pdf"), "Kostenbericht als PDF", r.status);
  r = await L2.c.get("/api/portal/kundenenergie/kosten");
  pruefe(r.status === 403, "Versorger hat keinen Kostenbericht → 403", r.status);
  r = await gast.get("/api/portal/kundenenergie/kosten");
  pruefe(r.status === 401, "Ohne Anmeldung → 401", r.status);

  // ------------------------------------------------------------ Seiten
  abschnitt("B8. Seiten");
  for (const [c, pfad, text] of [[kunde, "/portal/anliegen", "Anliegen"], [kunde, "/portal/energie/kosten", "Energiekostenbericht"], [kunde, "/portal/energie/beschaffung", "Lieferantenwechsel"], [admin, "/portal/admin/finanzen/anliegen", "Kundenanliegen"], [admin, "/portal/admin/energie/wechsel", "Lieferantenwechsel"], [L2.c, `/portal/ausschreibungen/${A?.id}`, "Vertragsdatenblatt"]]) {
    r = await c.get(pfad);
    pruefe(r.status === 200 && r.text.includes(text), `Seite ${pfad} (${c.name})`, r.status);
  }
  r = await L2.c.get("/portal/anliegen");
  pruefe(!r.text.includes("Neues Anliegen"), "Versorger sieht die Anliegen-Seite nicht (nicht gefunden)", r.status);
  r = await akquise.get("/portal/admin/finanzen/anliegen");
  pruefe(!r.text.includes("Einsprüche gegen Contracting-Rechnungen"), "Unterrolle Akquise: Backoffice-Seite nicht sichtbar");
}

async function main() {
  console.log(`Kundenseite Energie – Test ${NUR_LOGIK ? "(nur Logik)" : `gegen ${BASIS}`}`);
  teilA();
  if (!NUR_LOGIK) {
    try {
      await teilB();
    } catch (e) {
      fehler++;
      console.log(rot(`  ✗ Abbruch: ${e.message}`));
    }
  }
  console.log(`\n${ok} bestanden, ${fehler} fehlgeschlagen`);
  process.exit(fehler ? 1 : 0);
}
main();
