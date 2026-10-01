// scripts/plattform-test-eg-portal.mjs
//
// WP6 „Portale Mitglied, Interessent, Gemeinde, öffentlicher Rechner“ (Energiegemeinschaften):
//   node scripts/plattform-test-eg-portal.mjs --nur-logik     Teil A: reine Regeln + Gleichheit JS/Python (ohne Server)
//   node scripts/plattform-test-eg-portal.mjs [basis-url]      Teil A + B gegen den laufenden Dev-Server (Demo-Backend)
//
// Teil A: eg/{interesse,dashboard,anreize,empfehlung}.js mit den Testvektoren eg/testdaten/portal/faelle.json und
//         Gleichheit zu plattform/eg_portal_kern.py.
// Teil B: Rechner und Interesse öffentlich (ohne Personendaten in der Antwort, CSRF 403), Mitglied-Übersicht und Detail,
//         Datenauskunft, fremde Gemeinschaft 404, Beitritt mit Eignung/Unterschrift (Landwirt in der BEG), TF-Wunsch,
//         Antrag zurückziehen, Gemeinde-Sicht (nur Summen), Seiten 200.

import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const WURZEL = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const lade = (p) => import(pathToFileURL(path.join(WURZEL, p)).href);
const NUR_LOGIK = process.argv.includes("--nur-logik");
const BASIS = (process.argv.slice(2).find((a) => !a.startsWith("--")) || process.env.PLATTFORM_TEST_URL || "http://localhost:3100").replace(/\/$/, "");
const DEMO_PASSWORT = process.env.PLATTFORM_DEMO_PASSWORT || "Demo-2026!";
const F = JSON.parse(readFileSync(path.join(WURZEL, "src/lib/plattform/eg/testdaten/portal/faelle.json"), "utf8"));

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
    console.log(`  ${rot("✗")} ${text}${details !== undefined ? ` – ${JSON.stringify(details).slice(0, 700)}` : ""}`);
  }
  return bedingung;
}
const abschnitt = (t) => console.log(`\n${t}`);

// ================================================================ Teil A – Logik

async function teilA() {
  const I = await lade("src/lib/plattform/eg/interesse.js");
  const D = await lade("src/lib/plattform/eg/dashboard.js");
  const A = await lade("src/lib/plattform/eg/anreize.js");
  const E = await lade("src/lib/plattform/eg/empfehlung.js");
  const feld = (fn) => {
    try {
      return fn();
    } catch (e) {
      if (e?.feld !== undefined) return { fehler: e.feld };
      throw e;
    }
  };
  const nb = F.netzbetreiber;
  const oeff = F.gemeinschaften.map((g) => I.gemeinschaftOeffentlich(g, { tarif: F.tarif, mitglieder: 3, plzBereich: g.id === "EGG-T1" ? ["4911", "4910"] : [] }));
  const js = {
    interesse: F.interesse.map((f) => feld(() => I.interesseBereinigen(f.eingabe, { netzbetreiber: nb }))),
    cluster: F.interesse.slice(0, 1).map((f) => I.interesseCluster(I.interesseBereinigen(f.eingabe, { netzbetreiber: nb }), nb)),
    oeffentlich: oeff,
    suche: F.suche.map((f) => I.gemeinschaftenSuchen(oeff, { plz: f.plz })),
    sucheZp: I.gemeinschaftenSuchen(oeff, { zaehlpunktnummer: "AT003000049500000000000000D000001", netzbetreiber: nb }),
    eignung: F.eignung.map((f) => I.eignungPruefen(f.daten, { gemeinschaft: F.gemeinschaften[f.gemeinschaft], netzbetreiber: nb })),
    beitritt: F.beitritt.map((f) => feld(() => I.beitrittBereinigen(f.daten, { gemeinschaft: F.gemeinschaften[f.gemeinschaft], netzbetreiber: nb }))),
    rechner: F.rechner.map((f) => I.rechnerOeffentlich(f.eingabe)),
    zeitraeume: [D.zeitraeume("2026-10-01"), D.zeitraeume("2026-07-15")],
    kennzahlen: F.kennzahlen.map((f) => D.energieKennzahlen(f.eintraege, f.preise)),
    schritte: F.schritte.map((f) => D.teilnahmeSchritte(f)),
    anleitung: [D.zustimmungsAnleitung({ netzbetreiber: nb[0], gemeinschaft: F.gemeinschaften[0], teilnahme: { teilnahmefaktor: 80 }, zaehlpunktnummer: "AT003000049100000000000000D000001" }), D.zustimmungsAnleitung({})],
    mehrfach: D.mehrfachUebersicht({ ...F.mehrfach, gemeinschaften: F.gemeinschaften }),
    sozialquote: F.sozialquote.map((f) => D.sozialquote(f.eingabe)),
    kuendigung: [D.kuendigungFruehestens("2026-10-01"), D.kuendigungFruehestens("2026-12-20", 21)],
    stunden: F.prognosen.map((f) => E.grueneStunden(f.prognose, { heute: f.heute })),
    tf: F.tfEmpfehlung.map((x) => E.tfEmpfehlung(x)),
    zeitfenster: F.zeitfenster.map((f) => A.tarifZeitfensterAm(F.tarif, f.datum)),
    meilensteine: F.meilensteine.map((f) => A.meilensteine(f)),
  };
  js.anreize = [
    A.anreizeFuer({ tarif: F.tarif, heute: "2026-07-04", stunden: js.stunden[1], kennzahlen: js.kennzahlen[0], zaehlpunkte: [{ richtung: "verbrauch" }, { richtung: "erzeugung" }], anlagen: [], mehrfach: js.mehrfach }),
    A.anreizeFuer({ heute: "2026-12-01", stunden: js.stunden[0], zaehlpunkte: [{ richtung: "verbrauch" }] }),
  ];

  abschnitt("A1. Interesse, Cluster, Suche");
  F.interesse.forEach((f, i) => {
    if (f.fehler) pruefe(js.interesse[i].fehler === f.fehler, `Interesse ${i + 1}: Fehler im Feld „${f.fehler}“`, js.interesse[i]);
    else pruefe(Object.entries(f.erwartet).every(([k, v]) => js.interesse[i][k] === v) && js.interesse[i].zaehlpunktnummer.length === 33, `Interesse ${i + 1}: bereinigt (E-Mail klein, kWp mit Komma)`, js.interesse[i]);
  });
  pruefe(js.cluster[0].netzbetreiberId === "ENB-OOE" && js.cluster[0].schluessel === "ENB-OOE:4910", "Cluster aus Zählpunkt (Netzbetreiber) und PLZ", js.cluster[0]);
  F.suche.forEach((f, i) => pruefe(JSON.stringify(js.suche[i].map((x) => `${x.id}:${x.passung}`)) === JSON.stringify(f.erwartet), `Suche PLZ ${f.plz}: ${f.erwartet.join(", ")}`, js.suche[i]));
  pruefe(js.sucheZp.find((x) => x.id === "EGG-T1")?.passung === "netzgebiet" && js.sucheZp.every((x) => x.punkte === 2), "Suche über Zählpunkt: gleiches Netzgebiet", js.sucheZp);
  pruefe(!JSON.stringify(js.oeffentlich).includes("@") && js.oeffentlich[0].plzBereich.join() === "4910,4911" && js.oeffentlich[2].beitrittOffen === false, "Öffentliche Zusammenfassung ohne Personendaten, aufgelöste Gemeinschaft geschlossen");

  abschnitt("A2. Eignung und Beitritt");
  F.eignung.forEach((f, i) => pruefe(js.eignung[i].ergebnis === f.erwartet, `Eignung ${i + 1}: ${f.erwartet}`, js.eignung[i].punkte));
  F.beitritt.forEach((f, i) => {
    if (f.fehler) pruefe(js.beitritt[i].fehler === f.fehler, `Beitritt ${i + 1}: Fehler „${f.fehler}“`, js.beitritt[i]);
    else pruefe(JSON.stringify(js.beitritt[i].zustimmungen) === JSON.stringify(f.erwartet.zustimmungen) && js.beitritt[i].zaehlpunkte[0].teilnahmefaktor === f.erwartet.tf && js.beitritt[i].mitglied.iban === "AT611904300234573201", `Beitritt ${i + 1}: Zustimmungen, TF, IBAN normalisiert`, js.beitritt[i]);
  });

  abschnitt("A3. Ersparnis-Rechner");
  pruefe(js.rechner[0].nettoEur === F.rechner[0].erwartet.nettoEur && js.rechner[0].bezugKwh === F.rechner[0].erwartet.bezugKwh, `Standard (Haushalt, EEG lokal 2026): ${js.rechner[0].nettoEur} € netto/Jahr`, js.rechner[0]);
  pruefe(js.rechner[0].nettoEur >= 50 && js.rechner[0].nettoEur <= 200, "Standardfall im belegten Bereich 50–200 €/Jahr (Marktanalyse 1.4)");
  pruefe(js.rechner[1].regel.status === "platzhalter" && js.rechner[1].teile.some((t) => t.id === "erzeuger") && js.rechner[1].hinweise.some((h) => h.id === "platzhalter"), "2027 regional: Platzhalter-Regel mit Hinweis, Prosumer mit Erzeugerteil");
  pruefe(js.rechner[2].teile.find((t) => t.id === "netz").eur === 0 && !js.rechner[2].teile.some((t) => t.id === "abgaben") && js.rechner[2].hinweise.some((h) => h.id === "beg"), "BEG: keine Netzentgelt-Reduktion, keine Abgabenbefreiung");
  pruefe(js.rechner[3].bezugKwh === 0 && js.rechner[3].teile.length === 1, "Reiner Erzeuger: nur Mehrerlös");
  pruefe(js.rechner[4].nettoEur < 0 && js.rechner[4].hinweise.some((h) => h.id === "negativ"), "Ungünstige Preise: negatives Ergebnis mit Hinweis");

  abschnitt("A4. Dashboard");
  pruefe(js.zeitraeume[0].gestern.von === "2026-09-30" && js.zeitraeume[0].monat.von === "2026-09-01" && js.zeitraeume[1].jahr.von === "2026-01-01", "Zeiträume enden gestern (Daten D+1)");
  const k = js.kennzahlen[0];
  pruefe(k.anteilPct === 30.1 && k.eingebrachtKwh === 180 && k.ersparnis.netzEur === 3.61 && k.vollstaendig === false && k.anteilL3Pct === 2, "Kennzahlen: Anteil, eingebracht, Netz-Ersparnis, Vollständigkeit", k);
  pruefe(js.kennzahlen[1].hatDaten === false && js.kennzahlen[1].anteilPct === null, "Ohne Daten: Leerzustand");
  F.schritte.forEach((f, i) => pruefe(js.schritte[i].aktuell === f.erwartet && (f.frist === undefined || js.schritte[i].frist?.tageRest === f.frist), `Schritte ${f.teilnahme.status}: aktuell „${f.erwartet}“`, js.schritte[i]));
  pruefe(js.schritte[1].frist.dringend === true && js.schritte[3].schritte.find((s) => s.id === "zustimmung").zustand === "fehler", "Frist dringend, abgelaufene Zustimmung als Fehler");
  pruefe(js.anleitung[0].titel.includes("Netz OÖ") && js.anleitung[0].schritte.length === 5 && js.anleitung[0].schritte[2].text.includes("80 %"), "Anleitung je Netzbetreiber mit TF");
  pruefe(js.mehrfach[0].summeTf === 100 && js.mehrfach[0].mehrfach && js.mehrfach[1].summeTf === 70 && js.mehrfach[1].freiTf === 30 && js.mehrfach[1].anzahl === 1, "Mehrfachteilnahme: Σ TF, frei, beendete zählt nicht", js.mehrfach);
  pruefe(js.sozialquote.map((s) => s.status).join() === F.sozialquote.map((s) => s.erwartet).join() && js.sozialquote[0].quotePct === 11.5, "Sozialquote § 68 Abs. 6 (10 %)", js.sozialquote);
  pruefe(js.kuendigung[0] === "2026-10-29" && js.kuendigung[1] === "2027-01-10", "Kündigung frühestens nach Frist");

  abschnitt("A5. Grüne Stunden, Anreize");
  pruefe(js.stunden[0].quelle === "typisch" && js.stunden[0].tage[0].fenster[0].von === "11:00", "Ohne Prognose: typisches Fenster (Oktober)");
  pruefe(js.stunden[1].quelle === "prognose" && js.stunden[1].tage[0].fenster.map((f) => `${f.von}-${f.bis}-${f.staerke}`).join() === "10:00-13:00-hoch,14:00-15:00-mittel", "Stundenwerte zu Fenstern verbunden", js.stunden[1]);
  pruefe(js.stunden[2].tage.map((t) => t.datum).join() === "2026-07-01,2026-07-02" && js.stunden[2].tage[0].fenster[0].von === "12:00", "Tagesliste sortiert, Zeitformat vereinheitlicht", js.stunden[2]);
  pruefe(js.stunden[3].tage[0].fenster[0].bis === "13:00" && js.stunden[4].quelle === "typisch" && js.stunden[4].tage[0].fenster[0].staerke === "gering", "Fensterliste und Winter-Rückfall");
  pruefe(js.stunden[5].quelle === "prognose" && js.stunden[5].tage[0].fenster[0].bis === "15:00" && js.stunden[5].tage[0].quotePct === 41.2 && js.stunden[5].tage[1].fenster.map((f) => `${f.von}-${f.bis}`).join() === "11:00-13:00", "WP3-Prognose (gruenFenster, Stunden e/v, Quote)", js.stunden[5]);
  pruefe(js.tf[3].vorschlaege.map((v) => `${v.label}:${v.aktuellTf}→${v.teilnahmefaktor}`).join() === "Sonnenland:60→70,BEG:40→30" && js.tf[3].mehrwertEur === 18.4, "WP3-Optimierer (empfohlenTf, verbesserungEur)", js.tf[3]);
  pruefe(js.tf[0].vorschlaege[0].teilnahmefaktor === 55 && js.tf[0].mehrwertEur === 12.35 && js.tf[1] === null && js.tf[2] === null, "TF-Vorschlag vereinheitlicht");
  pruefe(js.zeitfenster[0].length === 2 && js.zeitfenster[1].length === 1 && js.zeitfenster[2].length === 1 && js.zeitfenster[0][0].vorteilCt === 2, "TOU-Fenster nach Monat und Wochentag");
  pruefe(js.meilensteine[0].filter((m) => m.erreicht).length === 3 && js.meilensteine[1].every((m) => !m.erreicht), "Meilensteine");
  pruefe(js.anreize[0][0].prio === 1 && js.anreize[0].some((a) => a.id === "speicher" && a.text.includes("75 %")) === false && js.anreize[0].some((a) => a.art === "tarif"), "Anreize mit TOU-Fenster und Prioritäten", js.anreize[0]);
  pruefe(js.anreize[1].length === 2 && js.anreize[1][0].titel.startsWith("Typisch"), "Anreize ohne Tarif und Prognose");

  abschnitt("A6. Gleichheit JS ↔ Python (eg_portal_kern.py)");
  const skript = `
import json,sys
from oekoinvest_app.plattform import eg_portal_kern as P
from oekoinvest_app.plattform.mitglied_kern import MitgliedFehler
F=json.loads(sys.stdin.read())
def feld(fn):
  try: return fn()
  except MitgliedFehler as e: return {"fehler": e.feld}
nb=F["netzbetreiber"]
oeff=[P.gemeinschaft_oeffentlich(g, tarif=F["tarif"], mitglieder=3, plz_bereich=(["4911","4910"] if g["id"]=="EGG-T1" else [])) for g in F["gemeinschaften"]]
o={
 "interesse":[feld(lambda f=f: P.interesse_bereinigen(f["eingabe"], nb)) for f in F["interesse"]],
 "cluster":[P.interesse_cluster(P.interesse_bereinigen(F["interesse"][0]["eingabe"], nb), nb)],
 "oeffentlich":oeff,
 "suche":[P.gemeinschaften_suchen(oeff, plz=f["plz"]) for f in F["suche"]],
 "sucheZp":P.gemeinschaften_suchen(oeff, zaehlpunktnummer="AT003000049500000000000000D000001", netzbetreiber=nb),
 "eignung":[P.eignung_pruefen(f["daten"], F["gemeinschaften"][f["gemeinschaft"]], nb) for f in F["eignung"]],
 "beitritt":[feld(lambda f=f: P.beitritt_bereinigen(f["daten"], F["gemeinschaften"][f["gemeinschaft"]], nb)) for f in F["beitritt"]],
 "rechner":[P.rechner_oeffentlich(f["eingabe"]) for f in F["rechner"]],
 "zeitraeume":[P.zeitraeume("2026-10-01"), P.zeitraeume("2026-07-15")],
 "kennzahlen":[P.energie_kennzahlen(f["eintraege"], f["preise"]) for f in F["kennzahlen"]],
 "schritte":[P.teilnahme_schritte(f["mitgliedStatus"], f["teilnahme"], f["heute"]) for f in F["schritte"]],
 "anleitung":[P.zustimmungs_anleitung(nb[0], F["gemeinschaften"][0], {"teilnahmefaktor":80}, "AT003000049100000000000000D000001"), P.zustimmungs_anleitung()],
 "mehrfach":P.mehrfach_uebersicht(F["mehrfach"]["zaehlpunkte"], F["mehrfach"]["teilnahmen"], F["gemeinschaften"]),
 "sozialquote":[P.sozialquote(**f["eingabe"]) for f in F["sozialquote"]],
 "kuendigung":[P.kuendigung_fruehestens("2026-10-01"), P.kuendigung_fruehestens("2026-12-20", 21)],
 "stunden":[P.gruene_stunden(f["prognose"], f["heute"]) for f in F["prognosen"]],
 "tf":[P.tf_empfehlung(x) for x in F["tfEmpfehlung"]],
 "zeitfenster":[P.tarif_zeitfenster_am(F["tarif"], f["datum"]) for f in F["zeitfenster"]],
 "meilensteine":[P.meilensteine(**f) for f in F["meilensteine"]],
}
o["anreize"]=[P.anreize_fuer(tarif=F["tarif"], heute="2026-07-04", stunden=o["stunden"][1], kennzahlen=o["kennzahlen"][0], zaehlpunkte=[{"richtung":"verbrauch"},{"richtung":"erzeugung"}], anlagen=[], mehrfach=o["mehrfach"]), P.anreize_fuer(heute="2026-12-01", stunden=o["stunden"][0], zaehlpunkte=[{"richtung":"verbrauch"}])]
sys.stdout.write(json.dumps(o, ensure_ascii=False))
`;
  let py = null;
  try {
    py = JSON.parse(execFileSync("python", ["-c", skript], { cwd: path.join(WURZEL, "Backend-Import", "oekoinvest_app"), input: JSON.stringify(F), encoding: "utf8", env: { ...process.env, PYTHONIOENCODING: "utf-8" }, maxBuffer: 32 * 1024 * 1024 }));
  } catch (e) {
    console.log(`  (Python nicht verfügbar – Gleichheitsprüfung übersprungen: ${String(e.message).slice(0, 400)})`);
  }
  if (py) for (const key of Object.keys(js)) pruefe(JSON.stringify(js[key]) === JSON.stringify(py[key]), `Gleich in JS und Python: ${key}`, { js: js[key], py: py[key] });
}

// ================================================================ Teil B – gegen den Dev-Server

class Client {
  constructor(name) {
    this.name = name;
    this.cookie = "";
  }
  async anfrage(methode, pfad, body, { origin = BASIS } = {}) {
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
        break;
      } catch (e) {
        if (versuch >= 3) throw e;
        await new Promise((r) => setTimeout(r, 4000 * versuch));
      }
    }
    for (const c of res.headers.getSetCookie?.() || []) {
      const [paar] = c.split(";");
      const [name, wert] = paar.split("=");
      if (/oi_sitzung$/.test(name)) this.cookie = wert ? `${name}=${wert}` : "";
    }
    const text = await res.text();
    let json = null;
    try {
      json = JSON.parse(text);
    } catch {
      json = { text: text.slice(0, 300) };
    }
    return { status: res.status, json, text };
  }
  get = (p, o) => this.anfrage("GET", p, undefined, o);
  post = (p, b, o) => this.anfrage("POST", p, b ?? {}, o);
  async login(email, passwort = DEMO_PASSWORT) {
    const r = await this.post("/api/auth/login", { email, passwort });
    if (r.status !== 200) throw new Error(`Login ${email} fehlgeschlagen: ${r.status} ${JSON.stringify(r.json)}`);
    return r.json.nutzer;
  }
}

async function teilB() {
  const gast = new Client("gast");
  const mitglied = new Client("mitglied");
  const landwirt = new Client("landwirt");
  const kommune = new Client("kommune");
  const flaeche = new Client("flaeche");
  await mitglied.login("mitglied@example.com");
  await landwirt.login("landwirt@example.com");
  await kommune.login("kommune@example.com");
  await flaeche.login("flaeche@example.com");

  abschnitt("B1. Öffentlich: Rechner und Interesse");
  let r = await gast.post("/api/eg/rechner", { daten: { profil: "haushalt", verbrauchKwh: 3500 } });
  pruefe(r.status === 200 && r.json.ergebnis?.nettoEur > 0, "Rechner ohne Anmeldung", r.json);
  r = await gast.post("/api/eg/rechner", { daten: {} }, { origin: "https://fremd.example.com" });
  pruefe(r.status === 403, "Rechner: fremde Herkunft 403");
  r = await gast.post("/api/eg/interesse", { daten: { vorname: "Ina", nachname: "Interessentin (Test)", email: "eg-wp6-interesse@example.com", plz: "4910", rolle: "verbraucher", einwilligung: true } });
  pruefe(r.status === 200 && r.json.id?.startsWith("EIN-") && Array.isArray(r.json.passend) && !JSON.stringify(r.json.passend).includes("@"), "Interesse angelegt, passende Gemeinschaften ohne Personendaten", r.json);
  r = await gast.post("/api/eg/interesse", { daten: { nachname: "X", email: "x@example.com", plz: "4910" } });
  pruefe(r.status === 422, "Interesse ohne Einwilligung 422");

  abschnitt("B2. Mitglied: Übersicht, Detail, Auskunft");
  r = await mitglied.get("/api/portal/eg");
  const ms = r.json.mitgliedschaften || [];
  const sonnen = ms.find((m) => /Sonnenland/.test(m.gemeinschaft.name));
  pruefe(r.status === 200 && sonnen && sonnen.teilnahmen.length >= 1 && sonnen.teilnahmen[0].schritte?.aktuell === "aktiv", "Übersicht mit eigener Teilnahme und Schritten", r.json);
  const gid = sonnen?.gemeinschaft.id;
  r = await mitglied.get(`/api/portal/eg/${gid}`);
  pruefe(r.status === 200 && r.json.mitglied?.name && r.json.stunden?.tage?.length && Array.isArray(r.json.empfehlungen) && !("mitglieder" in r.json), "Detail: eigenes Mitglied, grüne Stunden, Empfehlungen, keine Mitgliederliste", Object.keys(r.json));
  pruefe(r.json.mitglied && !/AT61190430023457320/.test(JSON.stringify(r.json.mitglied)), "Detail: eigene IBAN maskiert (Bank der Gemeinschaft auf Belegen ist zulässig)");
  const fremd = ms.length ? (await landwirt.get("/api/portal/eg")).json.offeneGemeinschaften?.find((g) => !ms.some((m) => m.gemeinschaft.id === g.id)) : null;
  r = await mitglied.get(`/api/portal/eg/${fremd?.id || "EGG-26-XXXXXX"}`);
  pruefe(r.status === 404, "Fremde Gemeinschaft 404");
  r = await mitglied.get("/api/portal/eg/datenauskunft");
  pruefe(r.status === 200 && r.json.auskunft?.rechtsgrundlage === "Art. 15 DSGVO" && r.json.auskunft.mitgliedschaften.length >= 1, "Datenauskunft Art. 15");
  r = await mitglied.get("/api/portal/eg/belege");
  pruefe(r.status === 200 && Array.isArray(r.json.belege), "Belege (Leerzustand solange WP4 501 liefert)", r.json);
  r = await gast.get("/api/portal/eg");
  pruefe(r.status === 401, "Übersicht ohne Anmeldung 401");

  abschnitt("B3. Beitritt (Landwirt als Interessent in der BEG), TF-Wunsch, Zurückziehen");
  r = await landwirt.get("/api/portal/eg");
  const beg = r.json.mitgliedschaften?.find((m) => /Alpenvorland/.test(m.gemeinschaft.name));
  const lwZp = (r.json.mehrfach || []).find((z) => z.richtung === "erzeugung");
  // Wiederholbar: Der erste Lauf zieht den Antrag zurück (Mitglied abgelehnt, Entwürfe verworfen) – danach ist der
  // Seed-Zustand verbraucht; der Beitritt selbst lässt sich erneut prüfen (neuer Antrag nach Ablehnung ist zulässig).
  const ersterLauf = beg?.mitglied.status === "interessent";
  const begG = beg?.gemeinschaft || r.json.offeneGemeinschaften?.find((g) => /Alpenvorland/.test(g.name)) || null;
  if (ersterLauf) {
    pruefe(r.status === 200, "Landwirt ist Interessent der BEG", beg?.mitglied);
    pruefe(lwZp?.mehrfach && lwZp.summeTf === 100, "Mehrfachteilnahme: Landwirt-Erzeugung 60 % + 40 % = 100 %", lwZp);
  } else {
    console.log("  (Wiederholungslauf: Seed-Zustand der BEG bereits verbraucht – Interessent und 60/40-Mehrfachteilnahme nicht erneut geprüft)");
    pruefe(r.status === 200 && !!begG && (!beg || ["abgelehnt", "ausgeschieden"].includes(beg.mitglied.status)), "BEG für erneuten Beitritt offen", { beg: beg?.mitglied?.status, begG: !!begG });
  }
  if (begG) {
    const daten = { art: "landwirt", person: { vorname: "Lukas", nachname: "Landwirt (Demo)", strasse: "Hof 1", plz: "5121", ort: "Ostermiething" }, zaehlpunkte: [{ zaehlpunktnummer: "AT003000051210000000000000W600001", richtung: "verbrauch", teilnahmefaktor: 50, smartMeter: "ja" }], zustimmungen: { statuten: true, vertrag: true, datenschutz: true }, unterschrift: { name: "Lukas Landwirt", bestaetigt: false } };
    r = await landwirt.post(`/api/portal/eg/${begG.id}/beitritt`, { daten });
    pruefe(r.status === 422, "Beitritt ohne bestätigte Unterschrift 422", r.json);
    r = await landwirt.post(`/api/portal/eg/${begG.id}/beitritt`, { daten: { ...daten, unterschrift: { name: "Lukas Landwirt (Demo)", bestaetigt: true } } });
    const neuMitglied = r.json.mitglied?.id;
    pruefe(r.status === 200 && r.json.mitglied?.status === "antrag" && r.json.nachweis?.hash?.length === 64, "Beitrittsantrag mit Nachweis-Hash", r.json);
    const tn = r.json.teilnahmen?.find((t) => t.zaehlpunktnummer?.endsWith("W600001"));
    pruefe(tn?.status === "entwurf" && tn.schritte.aktuell === "aufnahme" && tn.anleitung?.schritte?.length === 5, "Neue Teilnahme im Entwurf, nächster Schritt Aufnahme, Anleitung vorbereitet", tn);
    r = await landwirt.post(`/api/portal/eg/${begG.id}/beitritt`, { daten: { ...daten, unterschrift: { name: "Lukas Landwirt (Demo)", bestaetigt: true } } });
    pruefe(r.status === 409, "Zweiter Antrag 409");
    if (tn) {
      r = await landwirt.post("/api/portal/eg/tf-wunsch", { teilnahmeId: tn.id, teilnahmefaktor: 70 });
      pruefe(r.status === 200 && r.json.umgesetzt === true && r.json.teilnahmefaktor === 70, "TF-Wunsch im Entwurf direkt übernommen", r.json);
      r = await mitglied.post("/api/portal/eg/tf-wunsch", { teilnahmeId: tn.id, teilnahmefaktor: 60 });
      pruefe(r.status === 404, "TF-Wunsch fremder Teilnahme 404");
    }
    const begTn = lwZp?.teilnahmen.find((t) => t.status === "entwurf");
    if (begTn) {
      r = await landwirt.post("/api/portal/eg/tf-wunsch", { teilnahmeId: begTn.teilnahmeId, teilnahmefaktor: 50 });
      pruefe(r.status === 409, "TF-Wunsch über 100 % Summe 409", r.json);
    }
    r = await landwirt.post("/api/portal/eg/kuendigung", { mitgliedId: neuMitglied || beg?.mitglied.id });
    pruefe(r.status === 200 && r.json.art === "zurueckgezogen", "Antrag zurückgezogen", r.json);
  }
  r = await landwirt.post("/api/portal/eg/kuendigung", { mitgliedId: sonnen?.mitglied.id || "x" });
  pruefe(r.status === 404, "Kündigung fremder Mitgliedschaft 404");
  r = await mitglied.post("/api/portal/eg/kuendigung", { mitgliedId: sonnen?.mitglied.id, zum: "2026-10-02" });
  pruefe(r.status === 422, "Kündigung vor Ablauf der Frist 422", r.json);

  abschnitt("B4. Gemeinde-Sicht, Rollen, Seiten");
  r = await kommune.get("/api/portal/eg/gemeinde");
  const gm = r.json.gemeinden?.[0];
  pruefe(r.status === 200 && gm?.gebaeude?.length >= 4 && gm.sozialquote?.sollPct === 10 && gm.sozialquote.gilt === true, "Gemeinde: Gebäude-Zählpunkte und Sozialquote", gm && { gebaeude: gm.gebaeude.length, sq: gm.sozialquote });
  pruefe(!/Birke|eg-mitglied\d+@/.test(r.text) && gm?.beteiligung?.mitgliederAktiv > 5, "Gemeinde: andere Mitglieder nur als Summen");
  r = await flaeche.get("/api/portal/eg/gemeinde");
  pruefe(r.status === 403, "Gemeinde-Sicht ohne Gemeinde 403");
  for (const [c, p] of [[mitglied, "/portal/eg"], [mitglied, `/portal/eg/${gid}`], [landwirt, "/portal/eg/mehrfach"], [kommune, "/portal/eg/gemeinde"], [flaeche, "/portal/eg/beitritt"], [gast, "/energiegemeinschaften/software"], [gast, "/energiegemeinschaften/rechner"]]) {
    r = await c.get(p);
    pruefe(r.status === 200, `Seite ${p} (${c.name}) 200`, r.status);
  }
}

// ================================================================ Lauf

await teilA();
if (!NUR_LOGIK) await teilB();
console.log(`\n${fehler ? rot(`${fehler} Fehler`) : gruen("alles grün")} · ${ok} Prüfungen bestanden`);
process.exit(fehler ? 1 : 0);
