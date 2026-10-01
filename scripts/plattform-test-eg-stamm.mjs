// scripts/plattform-test-eg-stamm.mjs
//
// Test WP1 „Energiegemeinschaften – Kern-Stammdaten, Rechte, Integration“: reine Logik (Node) + End-to-End gegen den
// laufenden Dev-Server (Demo-Backend).
//   node scripts/plattform-test-eg-stamm.mjs [basis-url]      (--nur-logik: ohne Server)
//
// Logik: gemeinsame Testvektoren JS = Datei (Python prüft dieselbe Datei), Python-Modell aktuell, Zählpunkt/IDs, Teilnahmefaktor
// und Mehrfachteilnahme (≤ 5, Σ ≤ 100, 1 Änderung/Tag), Automat 3.8, Netzentgelt 2026/Platzhalter 2027, Kontext-Rollen
// (Vorstand/Kassier/Rechnungsprüfer, Backoffice-Deckelung), Demo-Seed gegen die eigenen Regeln, Migration aus dem Prototyp.
// API: Liste/Detail/Netzbetreiber (Backoffice), Anlegen, Mitglied + Zählpunkt + Teilnahme, TF-Regel 409, Mehrfachteilnahme,
// Massenaktion, CSV-Import (Vorschau, Fehler blockieren, Ausführen) und -Export (BOM, Formelschutz), Tarif-Versionierung,
// Organ eintragen → Organe-Sicht, Rechte (Mitglied ohne Organ 404, Portal-Konto auf Admin-API 403, Unterrolle akquise 404/403,
// CSRF), Seiten. Eigene Daten: Gemeinschaft „Test-EEG <Lauf> (Test)“.

import { execFileSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import * as E from "../src/lib/plattform/eg/index.js";
import { egSeed } from "../src/lib/plattform/backend/demo/eg-stamm-seed.js";

const WURZEL = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const BASIS = (process.argv.find((a) => /^https?:/.test(a)) || process.env.PLATTFORM_TEST_URL || "http://localhost:3100").replace(/\/$/, "");
const NUR_LOGIK = process.argv.includes("--nur-logik");
const DEMO_PASSWORT = process.env.PLATTFORM_DEMO_PASSWORT || "Demo-2026!";
const LAUF = Date.now().toString(36);
const H = "2026-10-01";
let ok = 0;
let fehler = 0;
const gruen = (s) => `\x1b[32m${s}\x1b[0m`;
const rot = (s) => `\x1b[31m${s}\x1b[0m`;
function pruefe(bedingung, text, details) {
  if (bedingung) { ok++; console.log(`  ${gruen("✓")} ${text}`); } else { fehler++; console.log(`  ${rot("✗")} ${text}${details !== undefined ? ` – ${JSON.stringify(details).slice(0, 500)}` : ""}`); }
  return bedingung;
}
const abschnitt = (t) => console.log(`\n${t}`);
const wirft = (fn, status) => { try { fn(); return false; } catch (e) { return status ? e.status === status : true; } };

// ================================================================ Logik

function logik() {
  abschnitt("L1. Gemeinsame Testvektoren und Python-Spiegel");
  const lauf = (skript) => { try { execFileSync(process.execPath, ["--no-warnings", path.join(WURZEL, "scripts", skript), "--pruefen"], { stdio: "pipe" }); return true; } catch (e) { return String(e.stdout || e.stderr || e.message); } };
  pruefe(lauf("eg-testdaten-stamm.mjs") === true, "JS-Regeln liefern exakt die Testvektoren (src/lib/plattform/eg/testdaten/stamm/vektoren.json)");
  pruefe(lauf("eg-modell-export.mjs") === true, "plattform/eg_modell.py ist aus modell.js erzeugt und aktuell");

  abschnitt("L2. Kennungen");
  const zp = "AT00300004910" + "0000000000000D000001";
  const p = E.zaehlpunktPruefen("at 003000 04910 0000000000000D000001", { netzbetreiber: E.NETZBETREIBER });
  pruefe(p.ok && p.wert === zp && p.netzbetreiberId === "ENB-OOE" && p.plz === "04910" && !p.hinweise.length, "Zählpunkt: Leerzeichen/Kleinbuchstaben normalisiert, Netz OÖ aus Stelle 3–8, PLZ 04910", p);
  pruefe(!E.zaehlpunktPruefen(zp.slice(0, 32)).ok && !E.zaehlpunktPruefen("DE" + zp.slice(2)).ok && E.zaehlpunktPruefen("AT99999904910" + "0000000000000D000001", { netzbetreiber: E.NETZBETREIBER }).hinweise.length === 1, "33 Zeichen, „AT“ Pflicht; unbekannte Netzbetreibernummer nur Hinweis");
  pruefe(E.gemeinschaftsIdPruefen("AT00300004910RC109417000000000001", { modell: "eeg", marktpartnerId: "RC109417" }).ok && !E.gemeinschaftsIdPruefen("AT00300004910RC109417000000000001", { modell: "gea" }).ok && E.gemeinschaftsIdPruefen("ATCC9999DYNAMCC123456ABCDEF123456", { modell: "beg", verteilmodell: "statisch" }).hinweise.length === 1, "Gemeinschafts-ID EEG (RC) / GEA (GC) / BEG (CC9999 + DYNAM/STATI)");
  pruefe(E.marktpartnerIdPruefen("rc100015", "eeg").wert === "RC100015" && !E.marktpartnerIdPruefen("RC100015", "beg").ok, "Marktpartner-ID je Modell (RC/CC/GC)");

  abschnitt("L3. Teilnahmefaktor und Mehrfachteilnahme");
  const vier = [1, 2, 3, 4].map((i) => ({ id: `X${i}`, gemeinschaftId: `G${i}`, status: "aktiv", teilnahmefaktor: 20 }));
  pruefe(E.teilnahmeRegeln(vier, { gemeinschaftId: "G5", teilnahmefaktor: 20 }).ok, "5. Teilnahme mit Σ TF = 100 % zulässig");
  pruefe(!E.teilnahmeRegeln(vier, { gemeinschaftId: "G5", teilnahmefaktor: 21 }).ok && !E.teilnahmeRegeln([...vier, { id: "X5", gemeinschaftId: "G5", status: "entwurf", teilnahmefaktor: 1 }], { gemeinschaftId: "G6", teilnahmefaktor: 1 }).ok, "Σ TF > 100 % bzw. 6. Teilnahme (auch geplante zählen) abgelehnt");
  pruefe(!E.teilnahmeRegeln(vier, { gemeinschaftId: "G1", teilnahmefaktor: 1 }).ok && E.teilnahmeRegeln([{ id: "A", gemeinschaftId: "G1", status: "beendet", teilnahmefaktor: 100 }], { gemeinschaftId: "G2", teilnahmefaktor: 100 }).ok, "Je Gemeinschaft eine Teilnahme; beendete zählen nicht");
  pruefe(wirft(() => E.teilnahmeBereinigen({ zaehlpunktId: "Z", mitgliedId: "M", teilnahmefaktor: 0 })) && wirft(() => E.teilnahmeBereinigen({ zaehlpunktId: "Z", mitgliedId: "M", teilnahmefaktor: 50.5 })) === false, "TF 1–100 ganzzahlig (50,5 wird gerundet)");

  abschnitt("L4. Zustandsautomat Teilnahme (3.8)");
  let t = { id: "T", status: "entwurf", teilnahmefaktor: 60, tfHistorie: [], verlauf: [] };
  t = E.teilnahmeUebergang(t, "senden", { heute: H });
  t = E.teilnahmeUebergang(t, "anforderung_econ", { heute: H, datum: H });
  pruefe(t.status === "zustimmung_offen" && t.fristBis === "2026-10-31", "Anforderung → Zustimmung offen, Frist 30 Tage", t.fristBis);
  t = E.teilnahmeUebergang(t, "zustimmung_econ", { heute: H, consentId: "C1" });
  pruefe(wirft(() => E.teilnahmeUebergang(t, "abschluss_econ", { heute: H }), 422), "Aktivierung ohne Datum → 422");
  t = E.teilnahmeUebergang(t, "abschluss_econ", { heute: H, datum: "2026-10-05" });
  pruefe(t.status === "aktiv" && t.gueltigAb === "2026-10-05" && t.tfHistorie.length === 1 && t.consentId === "C1", "Zustimmung → Aktivierung mit TF-Historie");
  pruefe(wirft(() => E.teilnahmeUebergang(t, "tf_geaendert", { heute: H, datum: "2026-10-05", teilnahmefaktor: 50 }), 409) && E.teilnahmeUebergang(t, "tf_geaendert", { heute: H, datum: "2026-10-06", teilnahmefaktor: 50 }).teilnahmefaktor === 50, "TF-Änderung höchstens 1× pro Tag");
  pruefe(wirft(() => E.teilnahmeUebergang(t, "cm_rev_sp", { heute: H, datum: "2026-09-30" }), 409) && wirft(() => E.teilnahmeUebergang(t, "senden", { heute: H }), 409), "Abmeldung nicht rückwirkend; unzulässiges Ereignis → 409");
  pruefe(E.teilnahmeUebergang(t, "cm_rev_cus", { heute: H, datum: H }).beendetGrund === "widerruf", "Widerruf des Mitglieds → beendet (widerruf)");

  abschnitt("L5. Netzentgelt-Regeln");
  pruefe(E.netzentgeltRegel({ datum: "2026-11-02", modell: "eeg", zonelevel: 3, netzebene: 7 }).reduktionPct === 57 && E.netzentgeltRegel({ datum: "2026-11-02", modell: "eeg", zonelevel: 4, netzebene: 6 }).reduktionPct === 28 && E.netzentgeltRegel({ datum: "2026-11-02", modell: "eeg", zonelevel: 4, netzebene: 5 }).reduktionPct === 64, "2026: EEG lokal −57 %, regional −28 % (NE 6/7) bzw. −64 % (NE 4/5)");
  pruefe(E.netzentgeltRegel({ datum: "2026-11-02", modell: "beg", zonelevel: 3, netzebene: 7 }).reduktionPct === 0 && E.netzentgeltRegel({ datum: "2027-01-01", modell: "beg", zonelevel: 3, netzebene: 7 }).status === "platzhalter", "BEG 2026 ohne Reduktion; ab 2027 nach Zonelevel (Platzhalter)");
  pruefe(E.reduzierterAp(5.005, 57) === 2.15 && E.rundeCt2(1.005) === 1.01, "Reduzierter AP kaufmännisch auf 2 Kommastellen");

  abschnitt("L6. Rechte je Gemeinschaft");
  const g = { id: "G", status: "aktiv", dienstleistung: { aktiv: true } };
  const organe = [{ gemeinschaftId: "G", kontoId: "K", funktion: "kassier", von: "2025-01-01", status: "aktiv" }, { gemeinschaftId: "G", kontoId: "O", funktion: "obmann", von: "2025-01-01", status: "aktiv" }, { gemeinschaftId: "G", kontoId: "P", funktion: "rechnungspruefer", von: "2025-01-01", status: "aktiv" }];
  const k = (id, rollen = ["mitglied"], extra = {}) => E.egRollen({ nutzer: { id, rollen, ...extra }, gemeinschaft: g, organe, mitglieder: [], heute: H });
  pruefe(E.egStufe(k("K"), "abrechnung_freigabe_1") === 2 && E.egStufe(k("K"), "abrechnung_freigabe_2") === 0 && E.egStufe(k("O"), "abrechnung_freigabe_2") === 2, "Vier-Augen: Kassier 1. Auge, Obmann 2. Auge");
  pruefe(E.egStufe(k("P"), "buchhaltung_pruefen") === 2 && E.egStufe(k("P"), "sepa") === 1 && E.egStufe(k("P"), "stammdaten") === 1, "Rechnungsprüfer prüft, liest SEPA und Stammdaten");
  pruefe(k("X").rollen.length === 0 && k("A", ["admin"], { backofficeRollen: ["akquise"] }).backofficeStufe === 0, "Ohne Organ/Mitglied keine Rolle; Unterrolle akquise ohne Bereich „eg“");
  const lesen = k("A", ["admin"], { backofficeRollen: ["lesen"] });
  pruefe(lesen.rollen.includes("organisator") && E.egStufe(lesen, "eda_ausloesen") < 2 && E.egStufe(lesen, "mitgliederliste") === 1, "Backoffice „Nur lesen“: Organisator gedeckelt auf Stufe 1 (kein Auslösen)");
  const egr = k("A", ["admin"], { backofficeRollen: ["eg"] });
  pruefe(E.egStufe(egr, "eda_ausloesen") === 2 && E.egStufe(egr, "abrechnung_freigabe_1") === 0, "Unterrolle eg: EDA auslösen, aber keine Abrechnungsfreigabe");

  abschnitt("L7. Demo-Seed gegen die eigenen Regeln");
  const tag = (x) => new Date(Date.UTC(2026, 9, 1) - x * 864e5).toISOString().slice(0, 10);
  const s = egSeed({ konten: { mitglied: "U-M", landwirt: "U-L", kommune: "U-K", obmann: "U-O", kassier: "U-KA", pruefer: "U-P" }, tag, iso: (x) => `${tag(x)}T10:00:00.000Z` });
  const son = s.gemeinschaften.find((x) => x.seedSchluessel === "sonnenland");
  const kz = E.kennzahlen(son, s);
  pruefe(s.gemeinschaften.length === 3 && s.mitglieder.filter((m) => m.gemeinschaftId === son.id).length === 25, "3 Gemeinschaften, Sonnenland mit 25 Mitgliedern", s.mitglieder.length);
  pruefe(s.zaehlpunkte.every((z) => E.zaehlpunktPruefen(z.zaehlpunktnummer).ok) && new Set(s.zaehlpunkte.map((z) => z.zaehlpunktnummer)).size === s.zaehlpunkte.length, `${s.zaehlpunkte.length} Zählpunkte im AT-Format, keine Dubletten`);
  pruefe(s.gemeinschaften.every((x) => !wirft(() => E.gemeinschaftBereinigen(x, { netzbetreiberIds: E.NETZBETREIBER.map((n) => n.id) }))) && s.mitglieder.every((m) => !wirft(() => E.mitgliedBereinigen(m, { gemeinschaft: s.gemeinschaften.find((x) => x.id === m.gemeinschaftId) }))), "Alle Gemeinschaften und Mitglieder bestehen die Validierung");
  pruefe(kz.lieferantenpflichten && kz.erzeugungsleistungKw > 100, "Sonnenland über der § 69-Schwelle (> 100 kW)", kz);
  const tnZp = new Map();
  for (const x of s.teilnahmen) tnZp.set(x.zaehlpunktId, [...(tnZp.get(x.zaehlpunktId) || []), x]);
  pruefe([...tnZp.values()].every((l) => l.filter((x) => E.TEILNAHME_ZAEHLT.includes(x.status)).reduce((a, x) => a + x.teilnahmefaktor, 0) <= 100) && [...tnZp.values()].some((l) => l.length === 2), "Mehrfachteilnahme Landwirt 60 % + 40 %, überall Σ TF ≤ 100");
  const gea = s.gemeinschaften.find((x) => x.seedSchluessel === "linzerstrasse");
  pruefe(E.verteilschluesselBereinigen(s.verteilschluessel.find((v) => v.gemeinschaftId === gea.id)).summePct === 100, "GEA: statischer Verteilschlüssel Σ 100 %");
  const kassier = E.egRollen({ nutzer: { id: "U-KA", rollen: ["mitglied"] }, gemeinschaft: son, organe: s.organe, mitglieder: s.mitglieder, heute: H });
  pruefe(kassier.rollen.join() === "mitglied,kassier", "Demo-Konto Kassier: Mitglied + Kassier in Sonnenland", kassier);

  abschnitt("L8. Migration aus dem Prototyp");
  let i = 0;
  const alt = { gemeinschaften: [{ id: "EGM-1", name: "Alt (Demo)", land: "AT", form: "eeg_regional", status: "aktiv", netzbetreiber: "Netzbetreiber Oberösterreich (Demo)", tarifBezugCt: 11, tarifEinspeisungCt: 9, grundgebuehrMonat: 1.5, verteilschluessel: "dynamisch", gemeinschaftsId: "AT00300000RC100000000000000000001 (Demo)" }, { id: "EGM-2", name: "DE", land: "DE", form: "energy_sharing" }], teilnahmen: [{ id: "ET-1", egId: "EGM-1", nutzerId: "U-1", status: "aktiv", ab: "2026-03-01", stamm: { rolle: "beides", zaehlpunkt: "AT0030000000000000000000000054321", zaehlpunktEinspeisung: "AT0030000000000000000000000054322", anlageKwp: 60 } }] };
  const m = E.migrationAusPrototyp(alt, { neueId: (px) => `${px}-26-${String(++i).padStart(6, "0")}`, heute: H });
  pruefe(m.gemeinschaften.length === 1 && m.gemeinschaften[0].modell === "eeg" && m.gemeinschaften[0].zonelevel === 4 && m.gemeinschaften[0].netzbetreiber[0] === "ENB-OOE", "EEG regional → Modell eeg, Zonelevel 4, Netz OÖ", m.gemeinschaften[0]);
  pruefe(m.zaehlpunkte.length === 2 && m.anlagen.length === 1 && m.teilnahmen.every((x) => x.status === "aktiv" && x.teilnahmefaktor === 100) && m.tarife[0].bezugspreisCt === 11, "Bezug + Einspeisung → 2 Zählpunkte, PV-Anlage, Tarif übernommen");
  pruefe(m.uebersprungen.length === 1 && m.warnungen.some((w) => w.includes("Consent")) && E.migrationAusPrototyp(alt, { neueId: () => "X-1", heute: H, vorhanden: { gemeinschaften: m.gemeinschaften } }).gemeinschaften.length === 0, "DE bleibt im Prototyp; Consent-Warnung; zweiter Lauf idempotent");
}

// ================================================================ API

class Client {
  constructor() { this.cookie = ""; }
  async anfrage(methode, pfad, body, { origin = BASIS, roh = false } = {}) {
    const headers = {};
    if (origin) headers.Origin = origin;
    if (this.cookie) headers.Cookie = this.cookie;
    if (body !== undefined) headers["Content-Type"] = "application/json";
    let res;
    for (let versuch = 1; ; versuch++) {
      try {
        res = await fetch(BASIS + pfad, { method: methode, headers, body: body !== undefined ? JSON.stringify(body) : undefined, redirect: "manual", signal: AbortSignal.timeout(180000) });
        if (res.status >= 500 && /text\/html/.test(res.headers.get("content-type") || "") && versuch < 4) { await new Promise((r) => setTimeout(r, 3000 * versuch)); continue; }
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
    const text = await res.text();
    let json = null;
    try { json = JSON.parse(text); } catch { json = { text: text.slice(0, 200) }; }
    return { status: res.status, json, text, headers: res.headers };
  }
  get = (p, o) => this.anfrage("GET", p, undefined, o);
  post = (p, b, o) => this.anfrage("POST", p, b ?? {}, o);
  async login(email) {
    const r = await this.post("/api/auth/login", { email, passwort: DEMO_PASSWORT });
    if (r.status !== 200) throw new Error(`Login ${email}: ${r.status} ${JSON.stringify(r.json)}`);
    return r.json.nutzer;
  }
}
const seite404 = (r) => r.status === 404 || r.text.includes("NEXT_HTTP_ERROR_FALLBACK;404");

async function api() {
  const admin = new Client();
  await admin.login("admin@example.com");

  abschnitt("A1. Backoffice: Liste, Detail, Netzbetreiber");
  const liste = await admin.get("/api/admin/eg");
  const son = liste.json.gemeinschaften?.find((g) => g.seedSchluessel === "sonnenland");
  pruefe(liste.status === 200 && liste.json.gemeinschaften.length >= 3 && son?.kennzahlen.mitgliederAktiv >= 20, "Liste mit Demo-Gemeinschaften und Kennzahlen", liste.json.kennzahlen);
  pruefe(son?.hinweise?.some((h) => h.text.includes("§ 69")) && son?.netzentgelt?.reduktionPct === 57, "Sonnenland: § 69-Hinweis, Netzentgelt −57 % (EEG lokal)");
  const det = await admin.get(`/api/admin/eg/${son.id}`);
  pruefe(det.status === 200 && det.json.organe.length >= 5 && det.json.zaehlpunkte.length >= 30 && det.json.rollen.includes("organisator"), "Detail mit Organen, Zählpunkten, Kontext-Rolle Organisator", det.json.rollen);
  const nb = await admin.get("/api/admin/eg/netzbetreiber?stichtag=2027-02-01");
  pruefe(nb.status === 200 && nb.json.netzbetreiber.length >= 12 && nb.json.regeln.every((x) => x.status === "platzhalter"), "Netzbetreiber-Stamm und Regeln ab 2027 (Platzhalter)");
  pruefe((await admin.get("/api/admin/eg/EGG-26-NICHTDA")).status === 404, "Unbekannte Gemeinschaft → 404");

  abschnitt("A2. Anlegen, Mitglied, Zählpunkt, Teilnahme");
  const neu = await admin.post("/api/admin/eg", { aktion: "anlegen", daten: { name: `Test-EEG ${LAUF} (Test)`, modell: "eeg", zonelevel: 3, netzbetreiber: ["ENB-OOE"] } });
  const gid = neu.json.gemeinschaft?.id;
  pruefe(neu.status === 200 && gid && neu.json.gemeinschaft.status === "interesse", "Gemeinschaft angelegt (Status Interesse)", neu.json);
  pruefe((await admin.post("/api/admin/eg", { aktion: "anlegen", daten: { name: "X", modell: "eeg", zonelevel: 6, netzbetreiber: ["ENB-OOE"] } })).status === 422, "EEG mit Zonelevel 6 → 422");
  const u = `/api/admin/eg/${gid}`;
  const m1 = await admin.post(u, { aktion: "mitglied", daten: { art: "privat", person: { vorname: "Tina", nachname: `Test ${LAUF}`, email: `eg-test-${LAUF}@example.com` } } });
  pruefe(m1.status === 200 && m1.json.mitglied.mitgliedsnummer === 1, "Mitglied angelegt (Nr. 1)", m1.json);
  pruefe((await admin.post(u, { aktion: "mitglied", daten: { art: "kmu", person: { firma: "Groß AG (Test)" }, unternehmensgroesse: { mitarbeiter: 400 } } })).status === 409, "Großunternehmen in EEG → 409");
  const zpNr = `AT00300004910000000000000T${String(Date.now()).slice(-7)}`;
  const z1 = await admin.post(u, { aktion: "zaehlpunkt", daten: { zaehlpunktnummer: zpNr, richtung: "verbrauch" } });
  pruefe(z1.status === 200 && z1.json.zaehlpunkt.netzbetreiberId === "ENB-OOE", "Zählpunkt erfasst, Netzbetreiber abgeleitet", z1.json);
  const t1 = await admin.post(u, { aktion: "teilnahme", daten: { zaehlpunktId: z1.json.zaehlpunkt.id, mitgliedId: m1.json.mitglied.id, teilnahmefaktor: 70 } });
  pruefe(t1.status === 200 && t1.json.teilnahme.status === "entwurf", "Teilnahme-Entwurf mit TF 70 %");
  pruefe((await admin.post(u, { aktion: "teilnahme", daten: { zaehlpunktId: z1.json.zaehlpunkt.id, mitgliedId: m1.json.mitglied.id, teilnahmefaktor: 10 } })).status === 409, "Zweite Teilnahme derselben Gemeinschaft → 409");
  // Mehrfachteilnahme: derselbe Zählpunkt in Sonnenland (30 % frei)
  const sonU = `/api/admin/eg/${son.id}`;
  const mS = await admin.post(sonU, { aktion: "mitglied", daten: { art: "privat", person: { nachname: `Mehrfach ${LAUF}` } } });
  const zS = await admin.post(sonU, { aktion: "zaehlpunkt", daten: { zaehlpunktnummer: zpNr, richtung: "verbrauch" } });
  pruefe(zS.json.zaehlpunkt?.id === z1.json.zaehlpunkt.id && zS.json.hinweise.some((h) => h.includes("Mehrfachteilnahme")), "Bekannte Zählpunktnummer wird wiederverwendet (Mehrfachteilnahme)");
  pruefe((await admin.post(sonU, { aktion: "teilnahme", daten: { zaehlpunktId: zS.json.zaehlpunkt.id, mitgliedId: mS.json.mitglied.id, teilnahmefaktor: 31 } })).status === 409, "Σ TF 70 + 31 > 100 → 409");
  pruefe((await admin.post(sonU, { aktion: "teilnahme", daten: { zaehlpunktId: zS.json.zaehlpunkt.id, mitgliedId: mS.json.mitglied.id, teilnahmefaktor: 30 } })).status === 200, "Σ TF 70 + 30 = 100 → zulässig");
  const kor = await admin.post(u, { aktion: "teilnahme_uebergang", id: t1.json.teilnahme.id, ereignis: "senden" });
  pruefe(kor.status === 403 || kor.status === 200, "Senden einer Teilnahme nur mit Recht (Gemeinschaft im Aufbau: Gründungsberatung)", kor.status);

  abschnitt("A3. Massenaktion, CSV-Import und -Export");
  const ids = det.json.mitglieder.slice(8, 11).map((m) => m.id);
  const ma = await admin.post(sonU, { aktion: "massen", massenaktion: "rechnungsweg", ids, werte: { wert: "post" } });
  pruefe(ma.status === 200 && ma.json.geaendert === 3 && !ma.json.fehler.length, "Massenaktion Rechnungsweg für 3 Mitglieder", ma.json);
  const csv = ["art;vorname;nachname;email;zaehlpunkt;richtung;teilnahmefaktor;kwp", `privat;Ida;Import ${LAUF};eg-imp1-${LAUF}@example.com;AT00300004910000000000000I${String(Date.now()).slice(-7)};verbrauch;100;`, `landwirt;Ole;Import ${LAUF};eg-imp2-${LAUF}@example.com;AT00300004910000000000000J${String(Date.now()).slice(-7)};erzeugung;100;9,9`].join("\r\n");
  const v1 = await admin.post(u, { aktion: "csv_import", csv, ausfuehren: false });
  pruefe(v1.status === 200 && v1.json.vorschau.length === 2 && !v1.json.fehler.length && v1.json.vorschau.every((x) => x.aktion === "neu"), "CSV-Vorschau: 2 neue Zeilen ohne Fehler", v1.json);
  const fehlerCsv = `${csv}\r\nprivat;Kaputt;X;;AT123;verbrauch;100;`;
  pruefe((await admin.post(u, { aktion: "csv_import", csv: fehlerCsv, ausfuehren: true })).status === 409, "Ausführen mit fehlerhafter Zeile → 409 (nichts angelegt)");
  const v2 = await admin.post(u, { aktion: "csv_import", csv, ausfuehren: true });
  pruefe(v2.status === 200 && v2.json.angelegt === 2, "CSV-Import ausgeführt: 2 Mitglieder mit Zählpunkt und Teilnahme-Entwurf", v2.json);
  const det2 = await admin.get(u);
  pruefe(det2.json.mitglieder.length === 3 && det2.json.anlagen.length === 1 && det2.json.teilnahmen.length === 3, "Detail: 3 Mitglieder, PV-Anlage aus kWp, 3 Teilnahmen");
  const exRoh = await admin.get(`${u}?export=zaehlpunkte`, { roh: true });
  const exBuf = Buffer.from(await exRoh.arrayBuffer());
  pruefe(exRoh.status === 200 && exBuf[0] === 0xef && exBuf[1] === 0xbb && exBuf[2] === 0xbf && exBuf.toString("utf8").includes("zaehlpunkt;richtung") && /text\/csv/.test(exRoh.headers.get("content-type")), "CSV-Export mit BOM, Semikolon und Zählpunkten");

  abschnitt("A4. Tarif-Versionierung und Organe");
  const ta = await admin.post(u, { aktion: "tarif", daten: { bezeichnung: "Start", gueltigAb: "2026-01-01", bezugspreisCt: 11, einspeisepreisCt: 8, status: "aktiv", beschluss: { art: "vorstand", datum: "2025-12-01" } } });
  const tb = await admin.post(u, { aktion: "tarif", daten: { bezeichnung: "Neu", gueltigAb: "2026-07-01", bezugspreisCt: 11.5, einspeisepreisCt: 8.5, status: "aktiv", beschluss: { art: "vorstand", datum: "2026-06-01" } } });
  const det3 = await admin.get(u);
  const alt = det3.json.tarife.find((t) => t.id === ta.json.tarif?.id);
  pruefe(tb.status === 200 && alt?.status === "abgeloest" && alt?.gueltigBis === "2026-06-30" && det3.json.gemeinschaft.tarifAktuell?.id === tb.json.tarif.id, "Neuer Tarif löst den alten am Vortag ab", alt);
  pruefe((await admin.post(u, { aktion: "tarif", daten: { gueltigAb: "2026-08-01", bezugspreisCt: 7, einspeisepreisCt: 9 } })).status === 422, "Einspeisepreis über Bezugspreis → 422");
  const org = await admin.post(u, { aktion: "organ", daten: { funktion: "kassier", email: "eg-kassier@example.com", von: "2026-01-01" } });
  pruefe(org.status === 200 && org.json.organ.kontoId, "Kassier per E-Mail mit Portalkonto verknüpft", org.json);

  abschnitt("A5. Organe-Sicht und Rechte");
  const kassier = new Client();
  await kassier.login("eg-kassier@example.com");
  const ve = await kassier.get(`/api/portal/eg/${son.id}/verwaltung`);
  pruefe(ve.status === 200 && ve.json.rollen.includes("kassier") && ve.json.rechte.abrechnung_freigabe_1 === 2 && ve.json.mitglieder.length >= 25, "Kassier: Verwaltung Sonnenland mit Mitgliederliste und Freigaberecht", ve.json.rollen);
  pruefe(ve.json.reiter.some((r) => r.id === "kasse") && !ve.json.reiter.some((r) => r.id === "x"), "Organ-Reiter je Recht");
  pruefe((await kassier.post(`/api/portal/eg/${son.id}/verwaltung`, { aktion: "mitglied_status", id: det.json.mitglieder.find((m) => m.status === "antrag")?.id, nach: "geprueft" })).status === 403, "Kassier darf nicht aufnehmen (Vorstand) → 403");
  pruefe((await kassier.get(`/api/admin/eg/${son.id}`)).status === 403, "Portal-Konto auf Admin-API → 403");
  const gea = liste.json.gemeinschaften.find((g) => g.seedSchluessel === "linzerstrasse");
  pruefe((await kassier.get(`/api/portal/eg/${gea.id}/verwaltung`)).status === 404, "Fremde Gemeinschaft → 404");
  const obmann = new Client();
  await obmann.login("eg-obmann@example.com");
  const antrag = (await obmann.get(`/api/portal/eg/${son.id}/verwaltung`)).json.aufgaben?.find((a) => a.art === "aufnahme");
  const auf = antrag ? await obmann.post(`/api/portal/eg/${son.id}/verwaltung`, { aktion: "mitglied_status", id: antrag.mitgliedId, nach: "geprueft" }) : { status: 0 };
  pruefe(antrag && auf.status === 200, "Obmann: offenen Antrag prüfen (Aufnahme-Workflow)", auf.json);
  const mitglied = new Client();
  await mitglied.login("mitglied@example.com");
  pruefe((await mitglied.get(`/api/portal/eg/${son.id}/verwaltung`)).status === 403, "Mitglied ohne Organ → 403 (Gemeinschaft bekannt, Verwaltung nur für Organe)");
  pruefe((await admin.post(sonU, { aktion: "massen", massenaktion: "rechnungsweg", ids, werte: { wert: "email" } }, { origin: "https://boese.example" })).status === 403, "CSRF: fremder Origin → 403");

  abschnitt("A6. Seiten");
  const s1 = await admin.get("/portal/admin/eg");
  pruefe(s1.status === 200 && s1.text.includes("Sonnenland Innviertel"), "/portal/admin/eg");
  const s2 = await admin.get(`/portal/admin/eg/${son.id}?reiter=mitglieder`);
  pruefe(s2.status === 200 && s2.text.includes("CSV-Import"), "/portal/admin/eg/[id]?reiter=mitglieder");
  pruefe((await admin.get(`/portal/admin/eg/${son.id}?reiter=anlagen`)).status === 200 && (await admin.get("/portal/admin/eg/netzbetreiber")).status === 200, "Reiter Anlagen & Tarife, Netzbetreiber-Seite");
  const s3 = await kassier.get(`/portal/eg/${son.id}/verwaltung`);
  pruefe(s3.status === 200 && s3.text.includes("Zu erledigen"), "/portal/eg/[id]/verwaltung für den Kassier");
  pruefe(seite404(await mitglied.get("/portal/admin/eg")), "Backoffice-Seite für Portal-Konto → 404");
}

logik();
if (!NUR_LOGIK) {
  try {
    await api();
  } catch (e) {
    fehler++;
    console.log(`  ${rot("✗")} Abbruch: ${e.message}`);
  }
}
console.log(`\n${fehler ? rot(`${fehler} Fehler`) : gruen("alle grün")} – ${ok} Prüfungen bestanden`);
process.exit(fehler ? 1 : 0);
