// scripts/plattform-test-anbieter.mjs
//
// Anbieter / Verkäufer (Team 3) – Vermittlungsauftrag, Rückfragen, Anonymisierung, LOI-Stellungnahme, Vorkenntnis, Bestandsanlage.
//   node scripts/plattform-test-anbieter.mjs [basis-url]        (--nur-logik: nur Teil A, ohne Server)
//
// Teil A – reine Logik (src/lib/plattform/anbieter/*.js) und Gleichheit mit Python (plattform/anbieter_kern.py), falls Python da ist:
//   Werktage/Fristen, Auftrag (Eingabe, Wortlaut, Prüfsumme, Stand, Beenden/Kündigen), Prüfpunkte (Übergänge, Rollen),
//   Anonymisierung (Gemeinde, Flurstück, Kontakt, Adresse; keine Fehlalarme bei Kennzahlen), Stellungnahme, Vorkenntnis,
//   Sperren für Einreichen/Veröffentlichen/LOI-Annahme, Ertragshistorie (CSV, PR, Ist/Prognose, Lücken), Verträge, Förderende, DD.
// Teil B – gegen den laufenden Dev-Server (eigene Konten anb-test-<Lauf>-*@example.com, Demo-Daten bleiben unberührt):
//   Rechte (fremd/Investor → 403, Unterrolle Akquise → 403, CSRF), Auftrag bis Gegenbestätigung + PDF, Rückfragen sperren das
//   Einreichen und die Veröffentlichung, Anonymisierung sperrt die Veröffentlichung, LOI: Pseudonym, Ablehnung sperrt Annahme,
//   Vorkenntnis melden/entscheiden, Bestand: Import, Verträge, Förderung, Investor sieht nur Bestandsdaten nach NDA, Cockpit, Seiten.

import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath, pathToFileURL } from "node:url";

const WURZEL = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const lade = (p) => import(pathToFileURL(path.join(WURZEL, p)).href);
const NUR_LOGIK = process.argv.includes("--nur-logik");
const BASIS = (process.argv.find((a) => a.startsWith("http")) || process.env.PLATTFORM_TEST_URL || "http://localhost:3100").replace(/\/$/, "");
const DEMO_PASSWORT = process.env.PLATTFORM_DEMO_PASSWORT || "Demo-2026!";
const LAUF = Date.now().toString(36);
const PASSWORT = "Anbieter-Test-2026";

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
    console.log(`  ${rot("✗")} ${text}${details !== undefined ? ` – ${JSON.stringify(details).slice(0, 600)}` : ""}`);
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

function csvDemo(jahre = 3, rueckgang = 0, ab = 2023) {
  const profil = [30, 55, 90, 120, 140, 150, 155, 135, 100, 65, 35, 25];
  const z = ["Monat;Ertrag kWh;Prognose kWh;Einstrahlung;Verfügbarkeit"];
  for (let i = 0; i < jahre * 12; i++) {
    const y = ab + Math.floor(i / 12);
    const m = (i % 12) + 1;
    const e = 1000 * profil[m - 1] * (1 - rueckgang * (y - ab));
    z.push(`${y}-${String(m).padStart(2, "0")};${(Math.round(e * 10) / 10).toString().replace(".", ",")};${Math.round(e * 1.03)};${(Math.round((e / 1000 / 0.84) * 10) / 10).toString().replace(".", ",")};99,1`);
  }
  return z.join("\n");
}

// ================================================================ Teil A – Logik

async function logik() {
  const R = await lade("src/lib/plattform/anbieter/regeln.js");
  const B = await lade("src/lib/plattform/anbieter/bestand.js");
  const heute = "2026-09-30";

  abschnitt("A1. Fristen");
  pruefe(R.werktagePlus("2026-09-30", 10) === "2026-10-14" && R.werktagePlus("2026-10-02", 1) === "2026-10-05", "Zehn Werktage (Mo–Fr), Freitag + 1 → Montag");
  pruefe(R.monatePlus("2026-01-31", 1) === "2026-02-28" && R.monatsende("2026-02-10") === "2026-02-28", "Monatsrechnung mit Monatsende");
  pruefe(R.vorkenntnisFrist("2026-09-30T22:30:00.000Z") === "2026-10-15", "Vorkenntnis-Frist ab Kalendertag in Wien (UTC+2 → 01.10.)", R.vorkenntnisFrist("2026-09-30T22:30:00.000Z"));

  abschnitt("A2. Vermittlungsauftrag");
  let e = wirft(() => R.mandatEingabe({ art: "exklusiv", name: "Max Muster", zustimmung: true }));
  pruefe(e?.status === 422 && /Mindestlaufzeit/.test(e.message), "Exklusivität ohne Mindestlaufzeit → 422");
  e = wirft(() => R.mandatEingabe({ art: "einfach", name: "Max Muster" }));
  pruefe(e?.status === 422, "Ohne Zustimmung → 422");
  e = wirft(() => R.mandatEingabe({ art: "einfach", name: "Erika Beispiel", zustimmung: true }, { kontoName: "Max Muster" }));
  pruefe(e?.status === 422 && /Nachnamen/.test(e.message), "Getippter Name ohne Nachnamen des Kontos → 422");
  const m = R.mandatEingabe({ art: "exklusiv", dauerMonate: 6, vorbehalte: "Firma A\n\nFirma B", name: "Max Muster", zustimmung: true }, { kontoName: "Max Muster" });
  pruefe(m.dauerMonate === 6 && m.vorbehalte.length === 2, "Gültige Eingabe mit Vorbehaltsliste");
  const txt = R.mandatText({ projekt: { id: "P-26-ABC123", titel: "Freifläche 10 MWp" }, mandat: { art: "einfach", vorbehalte: [] }, anbieter: { vorname: "Max", nachname: "Muster", firma: "Muster GmbH" } });
  pruefe(txt.length === 9 && txt[2].includes("zwischen 1,5 und 3 %") && txt[3].includes("zehn Werktagen") && txt[5].includes("24 Monaten"), "Wortlaut: Provisionsspanne, Vorkenntnis § 4, Umgehungsschutz § 5");
  const ex = { art: "exklusiv", dauerMonate: 6, erteiltAm: "2026-09-01T08:00:00Z" };
  pruefe(R.mandatStand(ex, heute).status === "wartet", "Exklusivität ohne Gegenbestätigung: wartet");
  Object.assign(ex, { bestaetigtAm: "2026-09-02T08:00:00Z", mindestBis: "2027-03-02" });
  pruefe(R.mandatStand(ex, heute).exklusivAktiv && R.exklusivitaetEnde(ex, { heute }) === "2027-03-02", "Bestätigt: exklusiv, Beenden frühestens zum Ende der Mindestlaufzeit");
  e = wirft(() => R.mandatKuendigung(ex, { heute, projektStatus: "entwurf" }));
  pruefe(e?.status === 409 && /Exklusivität/.test(e.message), "Kündigung während laufender Exklusivität → 409");
  e = wirft(() => R.mandatKuendigung({ art: "einfach", erteiltAm: "x" }, { heute, projektStatus: "veroeffentlicht" }));
  pruefe(e?.status === 409, "Kündigung bei veröffentlichtem Projekt → 409");

  abschnitt("A3. Prüfpunkte & Sperren");
  const pp = { ...R.pruefpunktEingabe({ bereich: "unterlagen", text: "Bitte Netzzusage hochladen.", fristTage: 3 }, { heute }), status: "offen" };
  pruefe(pp.fristAm === "2026-10-03" && pp.pflicht, "Frist und Pflicht aus der Eingabe");
  pruefe(wirft(() => R.pruefpunktAktion(pp, { aktion: "antworten", wer: "backoffice", antwort: "x" }))?.status === 403, "Backoffice kann nicht für den Anbieter antworten → 403");
  Object.assign(pp, R.pruefpunktAktion(pp, { aktion: "antworten", wer: "anbieter", antwort: "Hochgeladen." }));
  pruefe(pp.status === "beantwortet" && wirft(() => R.pruefpunktAktion(pp, { aktion: "erneut", wer: "backoffice", kommentar: "" }))?.status === 422, "Antwort → beantwortet; erneut öffnen ohne Begründung → 422");
  const akte = { pruefpunkte: [{ status: "offen", pflicht: true }] };
  pruefe(wirft(() => R.uebergangSperre({ art: "projekt", nach: "pruefung", von: "entwurf", akte }))?.status === 422, "Offene Rückfrage sperrt das Einreichen (422)");
  akte.pruefpunkte[0].status = "beantwortet";
  e = wirft(() => R.uebergangSperre({ art: "projekt", nach: "veroeffentlicht", von: "pruefung", akte, projekt: { titel: "X" } }));
  pruefe(R.uebergangSperre({ art: "projekt", nach: "pruefung", von: "entwurf", akte }) && e?.code === "pruefpunkte", "Beantwortet: Einreichen frei, Veröffentlichen gesperrt bis erledigt");
  akte.pruefpunkte[0].status = "erledigt";
  e = wirft(() => R.uebergangSperre({ art: "projekt", nach: "veroeffentlicht", von: "pruefung", akte, projekt: { titel: "Solarpark Musterdorf", vertraulich: { gemeinde: "Musterdorf" } } }));
  pruefe(e?.status === 409 && e.code === "anonymitaet", "Gemeinde im Titel sperrt die Veröffentlichung (409 anonymitaet)");
  pruefe(R.uebergangSperre({ art: "projekt", nach: "veroeffentlicht", von: "reserviert", akte, projekt: { titel: "Solarpark Musterdorf", vertraulich: { gemeinde: "Musterdorf" } } }), "Reservierung aufheben bleibt möglich (nur Erstfreigabe geprüft)");
  const voten = [{ interesseId: "I-1", loiAm: "a", art: "ablehnung" }];
  pruefe(wirft(() => R.uebergangSperre({ art: "interesse", nach: "loi_angenommen", akte: { voten }, interesseId: "I-1", loiAm: "a" }))?.code === "votum" && R.uebergangSperre({ art: "interesse", nach: "loi_angenommen", akte: { voten }, interesseId: "I-1", loiAm: "b" }), "Ablehnung sperrt nur die abgelehnte LOI-Fassung");

  abschnitt("A4. Anonymisierung");
  const an = R.anonymitaetPruefen({ titel: "Solarpark Musterdorf 12 MWp", beschreibung: "Kontakt max@x.de, Flurstück 123/4, Tel. 0171 1234567, Hauptstraße 5. Inbetriebnahme 2028, 12.000.000 kWh.", vertraulich: { gemeinde: "Musterdorf", flurstuecke: "123/4, 456", netzbetreiber: "LEW" } }, { anbieter: { firma: "Muster GmbH" } });
  const t = an.treffer.map((x) => x.text).join(" ");
  pruefe(!an.ok && ["Gemeinde", "Flurstück (123/4)", "E-Mail", "Telefonnummer", "Straßenadresse"].every((w) => t.includes(w)), "Gemeinde, Flurstück, E-Mail, Telefon, Adresse erkannt", an.treffer);
  const sauber = R.anonymitaetPruefen({ titel: "Freifläche 12 MWp in Schwaben", region: "Schwaben", beschreibung: "Baureif, Netzzusage 2027, 13 ha, 1.100 kWh/kWp, 120 000 000 kWh, 0,5 % p. a.", vertraulich: { gemeinde: "Au" } });
  pruefe(sauber.ok && !sauber.treffer.length, "Keine Fehlalarme bei Kennzahlen, Jahreszahlen und kurzen Gemeindenamen", sauber.treffer);

  abschnitt("A5. Stellungnahme & Vorkenntnis");
  pruefe(wirft(() => R.votumEingabe({ art: "ablehnung", kommentar: "zu kurz" }))?.status === 422 && R.votumEingabe({ art: "zustimmung" }).art === "zustimmung", "Ablehnung nur mit Begründung, Zustimmung ohne");
  e = wirft(() => R.vorkenntnisEingabe({ begruendung: "Kenne den Investor seit Jahren aus Projekt X.", nachweisArt: "korrespondenz", nachweisDatum: "2026-09-25" }, { angezeigtAm: "2026-09-20T08:00:00Z", heute }));
  pruefe(e?.status === 422 && /vor der Anzeige/.test(e.message), "Nachweis nach der Anzeige ist keine Vorkenntnis → 422");
  const vk = R.vorkenntnisEingabe({ begruendung: "Kenne den Investor seit Jahren aus Projekt X.", nachweisArt: "korrespondenz", nachweisDatum: "2026-08-01" }, { angezeigtAm: "2026-09-01T08:00:00Z", heute });
  pruefe(vk.frist === "2026-09-15" && vk.verspaetet, "Meldung nach Fristablauf wird als verspätet markiert");

  abschnitt("A6. Bestandsanlage");
  const r = B.ertragCsvLesen(csvDemo());
  const aw = B.ertragAuswerten(r.monate, { kwp: 1000, heute });
  pruefe(r.monate.length === 36 && !r.fehler.length, "CSV mit Kopfzeile, Dezimalkomma, 36 Monate");
  pruefe(aw.gesamt.spezErtragVollJahr === 1100 && Math.abs(aw.gesamt.pr - 0.84) < 0.005 && aw.gesamt.istZuPrognose === 0.971 && !aw.luecken.length, "Spez. Ertrag 1.100 kWh/kWp, PR 84 %, Ist/Prognose 97,1 %", aw.gesamt);
  const schwach = B.ertragAuswerten(B.ertragCsvLesen(csvDemo(3, 0.03)).monate.map((x) => ({ ...x, einstrahlungKwhM2: null })), { kwp: 1000, heute });
  pruefe(schwach.rueckgangPctJahr > 2 && schwach.hinweise.some((h) => /Rückgang/.test(h.text)), "Rechnerischer Rückgang (3 %/Jahr) erkannt", schwach.rueckgangPctJahr);
  const l = B.ertragCsvLesen("2024-01;100\nxx;5\n2024-03;abc");
  pruefe(l.monate.length === 1 && l.fehler.length === 2, "Fehlerhafte Zeilen werden gemeldet, gültige übernommen");
  pruefe(B.ertragAuswerten(B.ertragCsvLesen("2024-01;100\n2024-03;100").monate, { kwp: 1 }).luecken.includes("2024-02"), "Datenlücken erkannt");
  pruefe(B.foerderEnde({ inbetriebnahme: "2012-06-30", vermarktung: "marktpraemie" }, "DE").datum === "2032-12-31" && !B.foerderEnde({ inbetriebnahme: "2012-06-30", vermarktung: "marktpraemie" }, "AT").datum, "Förderende DE: 20 Jahre + Inbetriebnahmejahr; AT/CH manuell");
  pruefe(wirft(() => B.vertragBereinigen({ art: "om", beginn: "2026-01-01", ende: "2025-01-01" }))?.status === 422, "Vertragsende vor Beginn → 422");
  const vh = B.vertraegeHinweise([{ art: "pacht", ende: "2030-12-31", uebertragbar: "zustimmung" }], { foerderEndeDatum: "2032-12-31", heute }).map((x) => x.text).join(" ");
  pruefe(/O&M/.test(vh) && /vor dem Förderende/.test(vh) && /Vollzugsbedingung/.test(vh), "Hinweise: fehlender O&M, Pacht vor Förderende, Zustimmung als CP");
  pruefe(B.ddStand({ doku: { status: "vorhanden" }, messung: { status: "nz" } }).erfuellt === 2 && !B.foerderungBereinigen({ register: "SEE123" }, "DE").registerFormatOk, "DD-Stand und MaStR-Format");

  abschnitt("A7. Gleichheit JS ↔ Python (anbieter_kern.py)");
  const vektoren = {
    anonym: [
      { titel: "Solarpark Musterdorf 12 MWp", beschreibung: "Kontakt max@x.de, Flurstück 123/4, Tel. 0171 1234567, Hauptstraße 5. 86825 Bad Wörishofen", vertraulich: { gemeinde: "Musterdorf", flurstuecke: "123/4, 456", netzbetreiber: "LEW" } },
      { titel: "Freifläche 12 MWp in Schwaben", region: "Schwaben", beschreibung: "Baureif, 13 ha, 1.100 kWh/kWp, 120 000 000 kWh", highlights: ["Netz 2 km", "UW LEW"], vertraulich: { gemeinde: "Au", netzbetreiber: "LEW" } },
    ],
    csv: csvDemo(3, 0.01),
    mandat: { projekt: { id: "P-26-ABC123", titel: "Freifläche 10 MWp", provisionSatz: 0.0225 }, mandat: { art: "exklusiv", dauerMonate: 6, vorbehalte: ["Firma A"] }, anbieter: { vorname: "Max", nachname: "Muster", firma: "Muster GmbH" } },
  };
  const js = {
    anonym: vektoren.anonym.map((p) => R.anonymitaetPruefen(p, { anbieter: { firma: "Muster GmbH", vorname: "Max", nachname: "Muster" } })),
    ertrag: B.ertragAuswerten(B.ertragCsvLesen(vektoren.csv).monate, { kwp: 1000, heute }),
    mandat: R.mandatText(vektoren.mandat),
    werktage: [R.werktagePlus("2026-12-23", 10), R.monatePlus("2026-08-31", 6)],
  };
  const py = spawnSync("python", ["-c", `
import json,sys
from oekoinvest_app.plattform import anbieter_kern as K
v=json.load(sys.stdin)
a={"firma":"Muster GmbH","vorname":"Max","nachname":"Muster"}
m=v["mandat"]
print(json.dumps({"anonym":[K.anonymitaet_pruefen(p,anbieter=a) for p in v["anonym"]],"ertrag":K.ertrag_auswerten(K.ertrag_csv_lesen(v["csv"])["monate"],kwp=1000,heute="2026-09-30"),"mandat":K.mandat_text(m["projekt"],m["mandat"],m["anbieter"]),"werktage":[K.werktage_plus("2026-12-23",10),K.monate_plus("2026-08-31",6)]},ensure_ascii=False))
`], { cwd: path.join(WURZEL, "Backend-Import", "oekoinvest_app"), input: JSON.stringify(vektoren), encoding: "utf8", env: { ...process.env, PYTHONIOENCODING: "utf-8" } });
  if (py.error || py.status !== 0) {
    console.log(`  (Python nicht verfügbar – Gleichheitsprüfung übersprungen: ${String(py.error?.message || py.stderr).slice(0, 200)})`);
  } else {
    const p = JSON.parse(py.stdout);
    const gleich = (a, b) => JSON.stringify(a) === JSON.stringify(b);
    pruefe(gleich(js.anonym, p.anonym), "Anonymisierung identisch", { js: js.anonym, py: p.anonym });
    pruefe(gleich(js.ertrag, p.ertrag), "Ertragsauswertung identisch", { js: js.ertrag.gesamt, py: p.ertrag.gesamt, jsH: js.ertrag.hinweise, pyH: p.ertrag.hinweise });
    pruefe(gleich(js.mandat, p.mandat), "Wortlaut des Vermittlungsauftrags identisch (gleiche Prüfsumme)", js.mandat.map((x, i) => (x === p.mandat[i] ? "=" : [x, p.mandat[i]])));
    pruefe(gleich(js.werktage, p.werktage), "Werktage/Monate identisch", [js.werktage, p.werktage]);
  }

  // Integration: anerkannte Vorkenntnis → keine Provision; Stellungnahme des Verkäufers zu Geboten im Bieterverfahren
  abschnitt("A8. Integration: Vorkenntnis ↔ Provision, Gebots-Stellungnahme ↔ Zuschlag");
  const akteI = {
    vorkenntnis: [{ id: "VK-1", interesseId: "I-1", status: "gemeldet" }, { id: "VK-2", interesseId: "I-2", status: "anerkannt" }, { id: "VK-3", interesseId: "I-3", status: "abgelehnt" }],
    voten: [
      { interesseId: "I-1", loiAm: "a", art: "zustimmung" },
      { interesseId: "I-1", gebotId: "GB-1", gebotVersion: 1, art: "ablehnung" },
      { interesseId: "I-2", gebotId: "GB-2", gebotVersion: 1, art: "ablehnung" },
      { interesseId: "I-2", gebotId: "GB-2", gebotVersion: 2, art: "verhandeln" },
    ],
  };
  pruefe(R.vorkenntnisAnerkannt(akteI, "I-2")?.id === "VK-2" && !R.vorkenntnisAnerkannt(akteI, "I-1") && !R.vorkenntnisAnerkannt(akteI, "I-3") && !R.vorkenntnisAnerkannt(null, "I-2"), "Nur eine anerkannte Vorkenntnis schließt die Provision aus (gemeldet/abgelehnt nicht)");
  pruefe(R.VORKENNTNIS_VERMERK === "Vorkenntnis anerkannt", "Vermerk „Vorkenntnis anerkannt“");
  pruefe(R.aktuellesVotum(akteI.voten, "I-1", null)?.art === "zustimmung", "LOI-Stellungnahme ignoriert Gebots-Stellungnahmen desselben Interessenten");
  pruefe(R.gebotVotum(akteI.voten, "GB-2", 1)?.art === "ablehnung" && R.gebotVotum(akteI.voten, "GB-2", 2)?.art === "verhandeln" && !R.gebotVotum(akteI.voten, "GB-9", 1), "Gebots-Stellungnahme je Gebotsversion");
  const zs = wirft(() => R.zuschlagSperre({ akte: akteI, gebotId: "GB-1", version: 1 }));
  pruefe(zs?.status === 409 && zs.code === "votum", "Zuschlag auf ein vom Verkäufer abgelehntes Gebot → 409 „votum“", zs);
  pruefe(R.zuschlagSperre({ akte: akteI, gebotId: "GB-2", version: 2 }) && R.zuschlagSperre({ akte: akteI, gebotId: "GB-3", version: 1 }) && R.zuschlagSperre({ akte: null, gebotId: "GB-1", version: 1 }), "Neue Gebotsversion bzw. ohne Ablehnung → Zuschlag möglich");
  const pyI = spawnSync("python", ["-c", `
import json,sys
from oekoinvest_app.plattform import anbieter_kern as K
a=json.load(sys.stdin)
def sperre(g,v):
    try:
        return K.zuschlag_sperre(akte=a,gebot_id=g,version=v)
    except K.AnbieterFehler as e:
        return [e.status,e.code]
print(json.dumps({"vk":[(K.vorkenntnis_anerkannt(a,i) or {}).get("id") for i in ("I-1","I-2","I-3")],"loi":(K.aktuelles_votum(a["voten"],"I-1",None) or {}).get("art"),"gebot":[(K.gebot_votum(a["voten"],"GB-2",v) or {}).get("art") for v in (1,2)],"sperre":[sperre("GB-1",1),sperre("GB-2",2)],"vermerk":K.VORKENNTNIS_VERMERK},ensure_ascii=False))
`], { cwd: path.join(WURZEL, "Backend-Import", "oekoinvest_app"), input: JSON.stringify(akteI), encoding: "utf8", env: { ...process.env, PYTHONIOENCODING: "utf-8" } });
  if (pyI.error || pyI.status !== 0) {
    console.log(`  (Python nicht verfügbar – Gleichheitsprüfung übersprungen: ${String(pyI.error?.message || pyI.stderr).slice(0, 200)})`);
  } else {
    const p = JSON.parse(pyI.stdout);
    const js = { vk: ["I-1", "I-2", "I-3"].map((i) => R.vorkenntnisAnerkannt(akteI, i)?.id ?? null), loi: R.aktuellesVotum(akteI.voten, "I-1", null)?.art, gebot: [1, 2].map((v) => R.gebotVotum(akteI.voten, "GB-2", v)?.art), sperre: [[409, "votum"], true], vermerk: R.VORKENNTNIS_VERMERK };
    pruefe(JSON.stringify(js) === JSON.stringify(p), "Gleichheit JS ↔ Python (Vorkenntnis, Gebots-Stellungnahme, Zuschlagssperre)", { js, py: p });
  }
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
      headers["Content-Type"] ||= "application/json";
      payload = typeof body === "string" ? body : JSON.stringify(body);
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
  async registrieren(schluessel, rollen, { vorname = "Anja", nachname = "Verkauf" } = {}) {
    const email = `anb-test-${LAUF}-${schluessel}@example.com`;
    const r = await this.post("/api/auth/registrieren", { email, passwort: PASSWORT, vorname, nachname, rollen, agb: true });
    if (r.status === 409) return this.login(email, PASSWORT);
    if (r.status !== 201) throw new Error(`Registrierung ${email}: ${r.status} ${JSON.stringify(r.json)}`);
    this.nutzer = r.json.nutzer;
    return r.json.nutzer;
  }
}

const GRUND = {
  typ: "freiflaeche", land: "DE", bundesland: "Bayern", region: "Schwaben (Test)", mwp: 8, phase: "rtb", netzanschluss: "zusage", codGeplant: "2027-10", preisModus: "proKwp", preisProKwp: 95,
  beschreibung: "Testprojekt aus dem automatischen Anbieter-Test. Baureif, Netzzusage vorhanden. Keine echten Angaben, rein fiktiv.",
};

async function projektAnlegen(c, titel, extra = {}) {
  let r = await c.post("/api/portal/projekte", { titel });
  const pid = r.json.projekt?.id;
  if (!pid) throw new Error(`Projekt anlegen: ${r.status} ${JSON.stringify(r.json)}`);
  r = await c.patch(`/api/portal/projekte/${pid}`, { titel, ...GRUND, vertraulich: { gemeinde: `Anbgemeinde${LAUF}` }, ...extra });
  if (r.status !== 200) throw new Error(`Projekt ändern: ${r.status} ${JSON.stringify(r.json)}`);
  return pid;
}

async function http() {
  const admin = new Client("admin");
  const akquise = new Client("bo-akquise");
  const anb = new Client("anbieter");
  const fremd = new Client("fremd");
  const inv = new Client("investor");
  let r;

  abschnitt("B1. Vorbereitung & Rechte");
  await admin.login("admin@example.com");
  await akquise.login("bo-akquise@example.com");
  await anb.registrieren("a", ["anbieter"]);
  await fremd.registrieren("f", ["anbieter"], { vorname: "Fritz", nachname: "Fremd" });
  await inv.registrieren("i", ["investor"], { vorname: "Ines", nachname: "Invest" });
  const p1 = await projektAnlegen(anb, `Freifläche 8 MWp baureif (Test ${LAUF})`);
  r = await anb.get(`/api/portal/anbieter/${p1}`);
  pruefe(r.status === 200 && r.json.akte?.rolle === "anbieter" && r.json.akte.mandat.stand.status === "keiner" && r.json.akte.anonymitaet.ok, "Anbieter: Akte ohne Auftrag, Teaser anonym", r.json);
  r = await fremd.get(`/api/portal/anbieter/${p1}`);
  pruefe(r.status === 403, "Fremder Anbieter → 403", r.status);
  r = await inv.get(`/api/portal/anbieter/${p1}`);
  pruefe(r.status === 403, "Investor ohne Datenraum → 403", r.status);
  r = await anb.post(`/api/portal/anbieter/${p1}`, { aktion: "votum" }, { origin: "https://boese.example" });
  pruefe(r.status === 403, "Fremde Herkunft (CSRF) → 403", r.status);
  r = await akquise.post(`/api/admin/anbieter/${p1}`, { aktion: "pruefpunkt_anlegen", bereich: "datenblatt", text: "Unterrolle ohne Schreibrecht." });
  pruefe(r.status === 403, "Unterrolle Akquise (Projekte nur lesen) → 403", r.status);
  r = await anb.post(`/api/admin/anbieter/${p1}`, { aktion: "mandat_bestaetigen" });
  pruefe(r.status === 403, "Anbieter an der Backoffice-API → 403", r.status);

  abschnitt("B2. Vermittlungsauftrag");
  r = await anb.post(`/api/portal/anbieter/${p1}`, { aktion: "mandat_erteilen", art: "exklusiv", dauerMonate: 6, name: "Anja Verkauf" });
  pruefe(r.status === 422, "Ohne Zustimmung → 422", r.status);
  r = await anb.post(`/api/portal/anbieter/${p1}`, { aktion: "mandat_erteilen", art: "exklusiv", dauerMonate: 6, name: "Erika Beispiel", zustimmung: true });
  pruefe(r.status === 422 && /Nachnamen/.test(r.json.error), "Fremder Name als Unterschrift → 422", r.json);
  r = await anb.post(`/api/portal/anbieter/${p1}`, { aktion: "mandat_erteilen", art: "exklusiv", dauerMonate: 6, vorbehalte: ["Bekannte Energie AG (Test)"], name: "Anja Verkauf", zustimmung: true });
  pruefe(r.status === 200 && r.json.akte.mandat.stand.status === "wartet" && r.json.akte.mandat.sha256?.length === 64, "Exklusivität erteilt: wartet auf Gegenbestätigung, Prüfsumme protokolliert", r.json.akte?.mandat);
  r = await anb.get(`/api/portal/projekte/${p1}`);
  pruefe(r.json.projekt?.provisionAkzeptiert?.mandat === true, "Auftrag gilt als Provisionsvereinbarung (Einreichen möglich)", r.json.projekt?.provisionAkzeptiert);
  r = await anb.post(`/api/portal/anbieter/${p1}`, { aktion: "mandat_erteilen", art: "einfach", name: "Anja Verkauf", zustimmung: true });
  pruefe(r.status === 409, "Zweiter Auftrag → 409", r.status);
  r = await anb.get(`/api/portal/anbieter/${p1}/vermittlungsauftrag`, { roh: true });
  pruefe(r.status === 200 && r.daten.subarray(0, 4).toString() === "%PDF" && /application\/pdf/.test(r.typ), "Vermittlungsauftrag als PDF", r.status);
  r = await fremd.get(`/api/portal/anbieter/${p1}/vermittlungsauftrag`, { roh: true });
  pruefe(r.status === 403, "PDF für fremde Anbieter → 403", r.status);
  r = await admin.get(`/api/portal/anbieter/${p1}`);
  pruefe(r.status === 200 && r.json.akte.mandat.vorbehalte?.length === 1 && typeof r.json.akte.mandat.ip === "string", "Backoffice sieht Vorbehaltsliste und IP", r.json.akte?.mandat);
  r = await admin.post(`/api/admin/anbieter/${p1}`, { aktion: "mandat_bestaetigen" });
  pruefe(r.status === 200 && r.json.akte.mandat.stand.exklusivAktiv && r.json.akte.mandat.mindestBis, "Backoffice bestätigt die Exklusivität (Mindestlaufzeit gesetzt)", r.json.akte?.mandat);
  r = await anb.post(`/api/portal/anbieter/${p1}`, { aktion: "mandat_kuendigen" });
  pruefe(r.status === 409, "Kündigung während der Exklusivität → 409", r.json);

  abschnitt("B3. Rückfragen & Nachbesserung");
  r = await admin.post(`/api/admin/anbieter/${p1}`, { aktion: "pruefpunkt_anlegen", bereich: "unterlagen", text: "Bitte die Netzzusage in den Datenraum (Stufe 1) laden.", pflicht: true, fristTage: 5 });
  const pp = r.json.akte?.pruefpunkte?.[0];
  pruefe(r.status === 200 && pp?.status === "offen" && pp.fristAm, "Rückfrage mit Frist angelegt", r.json);
  r = await anb.post("/api/portal/status", { art: "projekt", id: p1, nach: "pruefung" });
  pruefe(r.status === 422 && /Rückfrage/.test(r.json.error), "Offene Rückfrage sperrt das Einreichen (422)", r.json);
  r = await anb.post(`/api/portal/anbieter/${p1}`, { aktion: "pruefpunkt_antworten", id: pp.id, antwort: "Netzzusage vom 12.03. hochgeladen." });
  pruefe(r.status === 200 && r.json.akte.pruefpunkte[0].status === "beantwortet", "Anbieter antwortet → beantwortet", r.json.akte?.pruefpunkte);
  r = await anb.post("/api/portal/status", { art: "projekt", id: p1, nach: "pruefung" });
  pruefe(r.status === 200, "Nach der Antwort: Einreichen möglich", r.json);
  r = await admin.post("/api/admin/status", { art: "projekt", id: p1, nach: "veroeffentlicht", extra: { provisionSatz: 2 } });
  pruefe(r.status === 409 && /Pflicht-Prüfpunkt/.test(r.json.error), "Ungeklärter Pflicht-Prüfpunkt sperrt die Veröffentlichung (409)", r.json);
  r = await admin.post(`/api/admin/anbieter/${p1}`, { aktion: "pruefpunkt", id: pp.id, schritt: "erneut", kommentar: "" });
  pruefe(r.status === 422, "Erneut öffnen ohne Begründung → 422", r.status);
  r = await admin.post(`/api/admin/anbieter/${p1}`, { aktion: "pruefpunkt", id: pp.id, schritt: "erledigt", kommentar: "Danke." });
  pruefe(r.status === 200 && r.json.akte.pruefpunkte[0].status === "erledigt", "Backoffice: erledigt", r.status);
  r = await admin.post("/api/admin/status", { art: "projekt", id: p1, nach: "veroeffentlicht", extra: { provisionSatz: 2 } });
  pruefe(r.status === 200, "Veröffentlichung nach Klärung", r.json);
  r = await anb.get(`/api/portal/nachrichten?bezug=projekt:${p1}`);
  const nachrichtenText = JSON.stringify(r.json);
  pruefe(r.status === 200 && /Rückfrage des Backoffice/.test(nachrichtenText), "Rückfrage erscheint im Nachrichtenverlauf des Projekts", r.status);

  abschnitt("B4. Anonymisierung");
  const p2 = await projektAnlegen(anb, `Solarpark Anbgemeinde${LAUF} 8 MWp`);
  r = await anb.get(`/api/portal/anbieter/${p2}`);
  pruefe(!r.json.akte.anonymitaet.ok && r.json.akte.anonymitaet.kritisch >= 1, "Gemeinde im Titel wird als kritisch erkannt", r.json.akte?.anonymitaet);
  await anb.post(`/api/portal/projekte/${p2}/provision`, { akzeptiert: true });
  r = await anb.post("/api/portal/status", { art: "projekt", id: p2, nach: "pruefung" });
  pruefe(r.status === 200, "Einreichen bleibt möglich (Backoffice prüft)", r.json);
  r = await admin.post("/api/admin/status", { art: "projekt", id: p2, nach: "veroeffentlicht", extra: { provisionSatz: 2 } });
  pruefe(r.status === 409 && /identifizierende/.test(r.json.error), "Veröffentlichung gesperrt (409, identifizierende Angaben)", r.json);

  abschnitt("B5. Interessenten, LOI-Stellungnahme, Vorkenntnis");
  r = await inv.post(`/api/portal/boerse/${p1}/nda`, { akzeptiert: true });
  const iid = r.json.interesse?.id;
  r = await admin.post("/api/admin/status", { art: "interesse", id: iid, nach: "nda_freigegeben" });
  pruefe(r.status === 200, "NDA freigegeben", r.json);
  r = await inv.post("/api/portal/status", { art: "interesse", id: iid, nach: "loi_abgegeben", extra: { loi: { text: "Indikatives Angebot vorbehaltlich Due Diligence. Rückfragen gern an ines@invest.example.", preisbasis: "gesamt", betrag: 600000 } } });
  pruefe(r.status === 200, "Investor gibt LOI ab", r.json);
  r = await anb.get(`/api/portal/anbieter/${p1}`);
  const ia = r.json.akte?.interessenten?.find((x) => x.interesseId === iid);
  pruefe(ia && /^Investor [A-Z]+$/.test(ia.pseudonym) && !ia.investor && !JSON.stringify(ia).includes("Invest ") && ia.votumMoeglich, "Anbieter sieht den Interessenten nur pseudonym", ia);
  pruefe(ia?.loi?.zeilen?.some((z) => z.label === "Inhalt" && z.wert.includes("[Kontaktangabe entfernt]") && !z.wert.includes("@")), "Kontaktangaben im LOI-Text entfernt", ia?.loi);
  r = await admin.get(`/api/portal/anbieter/${p1}`);
  pruefe(r.json.akte?.interessenten?.find((x) => x.interesseId === iid)?.investor?.nachname === "Invest", "Backoffice sieht den Investor", r.status);
  r = await anb.post(`/api/portal/anbieter/${p1}`, { aktion: "votum", interesseId: iid, art: "ablehnung", kommentar: "" });
  pruefe(r.status === 422, "Ablehnung ohne Begründung → 422", r.status);
  r = await anb.post(`/api/portal/anbieter/${p1}`, { aktion: "votum", interesseId: iid, art: "ablehnung", kommentar: "Preis deutlich unter unserer Erwartung." });
  pruefe(r.status === 200 && r.json.akte.interessenten.find((x) => x.interesseId === iid).votum.art === "ablehnung", "Verkäufer lehnt die LOI ab", r.status);
  r = await admin.post("/api/admin/status", { art: "interesse", id: iid, nach: "loi_angenommen" });
  pruefe(r.status === 409 && /abgelehnt/.test(r.json.error), "Annahme nach Verkäufer-Ablehnung gesperrt (409)", r.json);
  r = await admin.get("/api/portal/anbieter/cockpit");
  pruefe(r.status === 200 && r.json.rolle === "admin" && r.json.projekte.some((x) => x.projekt.id === p1 && x.aufgaben.some((a) => a.art === "votum")), "Backoffice-Cockpit zeigt die Stellungnahme", r.json);
  r = await anb.post(`/api/portal/anbieter/${p1}`, { aktion: "votum", interesseId: iid, art: "zustimmung", kommentar: "Nach Telefonat mit ÖkoInvest einverstanden." });
  r = await admin.post("/api/admin/status", { art: "interesse", id: iid, nach: "loi_angenommen" });
  pruefe(r.status === 200, "Nach Zustimmung: LOI angenommen", r.json);
  r = await anb.post(`/api/portal/anbieter/${p1}`, { aktion: "vorkenntnis_melden", interesseId: iid, begruendung: "Kenne das Unternehmen aus einem früheren Projekt.", nachweisArt: "korrespondenz", nachweisDatum: "2099-01-01" });
  pruefe(r.status === 422, "Nachweis in der Zukunft → 422", r.status);
  r = await anb.post(`/api/portal/anbieter/${p1}`, { aktion: "vorkenntnis_melden", interesseId: iid, begruendung: "Kenne das Unternehmen aus einem früheren Projekt (E-Mail vom Mai).", nachweisArt: "korrespondenz", nachweisDatum: "2026-05-04" });
  const vk = r.json.akte?.interessenten?.find((x) => x.interesseId === iid)?.vorkenntnis;
  pruefe(r.status === 200 && vk?.status === "gemeldet" && vk.verspaetet === false, "Vorkenntnis innerhalb der Frist gemeldet", r.json);
  r = await anb.post(`/api/portal/anbieter/${p1}`, { aktion: "vorkenntnis_melden", interesseId: iid, begruendung: "Doppelte Meldung zum selben Interessenten.", nachweisArt: "termin", nachweisDatum: "2026-05-04" });
  pruefe(r.status === 409, "Doppelte Meldung → 409", r.status);
  r = await admin.post(`/api/admin/anbieter/${p1}`, { aktion: "vorkenntnis_entscheiden", id: vk?.id, entscheidung: "abgelehnt", grund: "" });
  pruefe(r.status === 422, "Ablehnung ohne Begründung → 422", r.status);
  r = await admin.post(`/api/admin/anbieter/${p1}`, { aktion: "vorkenntnis_entscheiden", id: vk?.id, entscheidung: "anerkannt" });
  pruefe(r.status === 200 && r.json.akte.interessenten.find((x) => x.interesseId === iid).vorkenntnis.status === "anerkannt", "Backoffice erkennt die Vorkenntnis an", r.status);

  abschnitt("B6. Bestandsanlage");
  const p3 = await projektAnlegen(anb, `Bestandsanlage 1 MWp in Süddeutschland (Test ${LAUF})`, { phase: "cod", mwp: 1, codGeplant: "2014-06" });
  r = await anb.post(`/api/portal/anbieter/${p3}`, { aktion: "ertrag_import", csv: "Monat;Ertrag\nfoo;bar" });
  pruefe(r.status === 422, "CSV ohne gültige Monate → 422", r.status);
  r = await anb.post(`/api/portal/anbieter/${p3}`, { aktion: "ertrag_import", csv: csvDemo(2, 0, 2024) });
  const ew = r.json.akte?.bestand?.auswertung?.ertrag;
  pruefe(r.status === 200 && ew?.gesamt?.monate === 24 && Math.abs(ew.gesamt.pr - 0.84) < 0.01 && ew.gesamt.spezErtragVollJahr === 1100, "Ertragshistorie importiert: 24 Monate, PR 84 %, 1.100 kWh/kWp", ew?.gesamt);
  r = await anb.post(`/api/portal/anbieter/${p3}`, { aktion: "bestand_speichern", bestand: { vertraege: [{ art: "om", beginn: "2026-01-01", ende: "2025-01-01" }] } });
  pruefe(r.status === 422, "Vertrag mit Ende vor Beginn → 422", r.status);
  r = await anb.post(`/api/portal/anbieter/${p3}`, { aktion: "bestand_speichern", bestand: { vertraege: [{ art: "pacht", partner: "Grundeigentümer (Test)", beginn: "2014-01-01", ende: "2030-12-31", uebertragbar: "zustimmung" }], foerderung: { inbetriebnahme: "2014-06-30", vermarktung: "marktpraemie", register: "SEE912345678901", anzulegenderWertCt: 9.23 }, dd: { doku: { status: "vorhanden" } } } });
  const ba = r.json.akte?.bestand?.auswertung;
  pruefe(r.status === 200 && ba?.foerderEnde?.datum === "2034-12-31" && ba.vertraegeHinweise.some((h) => /vor dem Förderende/.test(h.text)) && ba.dd.erfuellt === 1, "Verträge, Förderende (EEG) und DD gespeichert, Hinweis Pacht vor Förderende", ba);
  r = await inv.get(`/api/portal/anbieter/${p3}`);
  pruefe(r.status === 403, "Investor vor Veröffentlichung/NDA → 403", r.status);
  await anb.post(`/api/portal/projekte/${p3}/provision`, { akzeptiert: true });
  await anb.post("/api/portal/status", { art: "projekt", id: p3, nach: "pruefung" });
  r = await admin.post("/api/admin/status", { art: "projekt", id: p3, nach: "veroeffentlicht", extra: { provisionSatz: 2.5 } });
  pruefe(r.status === 200, "Bestandsanlage veröffentlicht", r.json);
  r = await inv.post(`/api/portal/boerse/${p3}/nda`, { akzeptiert: true });
  const iid3 = r.json.interesse?.id;
  await admin.post("/api/admin/status", { art: "interesse", id: iid3, nach: "nda_freigegeben" });
  r = await inv.get(`/api/portal/anbieter/${p3}`);
  pruefe(r.status === 200 && r.json.akte.rolle === "investor" && r.json.akte.bestand?.auswertung?.ertrag?.gesamt?.monate === 24 && !("mandat" in r.json.akte) && !("pruefpunkte" in r.json.akte) && !("interessenten" in r.json.akte), "Investor mit Datenraum sieht nur die Bestandsdaten", Object.keys(r.json.akte || {}));
  r = await inv.post(`/api/portal/anbieter/${p3}`, { aktion: "bestand_speichern", bestand: { dd: {} } });
  pruefe(r.status === 403, "Investor kann nichts ändern → 403", r.status);

  abschnitt("B7. Cockpit, Frist-Lauf, Seiten");
  r = await anb.get("/api/portal/anbieter/cockpit");
  const c2 = r.json.projekte?.find((x) => x.projekt.id === p2);
  const c3 = r.json.projekte?.find((x) => x.projekt.id === p3);
  pruefe(r.status === 200 && r.json.rolle === "anbieter" && c2?.aufgaben.some((a) => a.art === "anonymitaet") && c3?.aufgaben.some((a) => a.art === "bestand"), "Anbieter-Cockpit: Teaser-Befund und offene DD-Unterlagen", r.json.projekte?.map((x) => [x.projekt.id, x.aufgaben.map((a) => a.art)]));
  r = await fremd.get("/api/portal/anbieter/cockpit");
  pruefe(r.status === 200 && !r.json.projekte.some((x) => [p1, p2, p3].includes(x.projekt.id)), "Cockpit fremder Anbieter ohne fremde Projekte", r.status);
  r = await admin.post("/api/admin/anbieter/fristen", {});
  pruefe(r.status === 200 && typeof r.json.erinnert === "number", "Frist-Lauf (Erinnerung überfälliger Rückfragen)", r.json);
  for (const [cl, pfad, merkmal] of [[anb, "/portal/projekte", "Was ist zu tun?"], [anb, `/portal/projekte/${p1}`, "Vermittlungsauftrag"], [anb, `/portal/projekte/${p1}`, "Interessenten &amp; LOIs"], [admin, `/portal/projekte/${p1}`, "Rückfragen &amp; Nachbesserung"], [anb, `/portal/projekte/${p3}`, "Technische Due Diligence"], [inv, `/portal/boerse/${p3}`, "Bestandsanlage: Ist-Daten"]]) {
    r = await cl.get(pfad);
    pruefe(r.status === 200 && r.text.includes(merkmal), `Seite ${pfad} (${cl.name}) → 200 mit „${merkmal.replace("&amp;", "&")}“`, r.status);
  }
  r = await fremd.get(`/portal/projekte/${p1}`);
  pruefe(r.status === 404 || !r.text.includes("Vermittlungsauftrag"), "Fremde Projektseite ohne Anbieter-Akte", r.status);
}

async function main() {
  console.log(`Anbieter / Verkäufer – Test (${NUR_LOGIK ? "nur Logik" : BASIS}, Lauf ${LAUF})`);
  await logik();
  if (!NUR_LOGIK) await http();
  console.log(`\n${fehler ? rot(`${fehler} Fehler`) : gruen("Alle Prüfungen bestanden")} · ${ok} ok`);
  process.exit(fehler ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
