// scripts/plattform-test-geodaten.mjs
//
// End-to-End-Test „Geodaten & Akquise-Engine“ gegen den laufenden Dev-Server (Demo-Backend + Demo-Geodaten).
//   node scripts/plattform-test-geodaten.mjs [basis-url]
//
// Prüft: Rechte (nur Backoffice-Unterrollen Leitung/Akquise; Transaktion, Nur-lesen, Betrieb, Investor → 403, Gast → 401,
// Seite /portal/admin/akquise/karte → 404 für fremde Unterrollen) · Kandidaten mit Score/Geometrie, Filter (Größe,
// Trasse, Gebiet) · Distanzberechnung (Haversine gegen bekannte Strecke, Luftlinie/Trasse der API nachgerechnet) ·
// Umkreis-Suche um ein Umspannwerk · Steckbrief/404 · Übernahme erzeugt Akquise-Fläche + Aufgabe „Eigentümer ermitteln“,
// doppelt → 409, CSRF → 403 · Export CSV/GeoJSON · Anschreiben mit DSGVO-Information · Kapazitätspflege mit Quellenpflicht.
// Nutzt die Demo-Konten (admin, bo-akquise, bo-transaktion, bo-lesen, bo-betrieb, investor); legt pro Lauf höchstens
// ein Akquise-Ziel an und setzt die gepflegte Kapazität am Ende zurück.

import { distanzM } from "../src/lib/plattform/geodaten/geo.js";

const BASIS = (process.argv[2] || process.env.PLATTFORM_TEST_URL || "http://localhost:3100").replace(/\/$/, "");
const DEMO_PASSWORT = process.env.PLATTFORM_DEMO_PASSWORT || "Demo-2026!";

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

class Client {
  constructor(name) {
    this.name = name;
    this.cookie = "";
  }

  async anfrage(methode, pfad, body, { origin = BASIS, kopf = {} } = {}) {
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
        const html = res.status >= 500 && /text\/html/.test(res.headers.get("content-type") || "") && pfad.startsWith("/api/");
        if (html && versuch < 4) {
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
    const text = await res.text();
    let json = null;
    try {
      json = JSON.parse(text);
    } catch {
      json = { text: text.slice(0, 200) };
    }
    return { status: res.status, json, headers: res.headers, text };
  }

  get = (p, o) => this.anfrage("GET", p, undefined, o);
  post = (p, b, o) => this.anfrage("POST", p, b ?? {}, o);

  async login(email, passwort = DEMO_PASSWORT) {
    let r;
    for (let versuch = 1; versuch <= 3; versuch++) {
      r = await this.post("/api/auth/login", { email, passwort });
      if (r.status !== 500) break;
      await new Promise((w) => setTimeout(w, 5000 * versuch));
    }
    if (r.status !== 200) return null;
    this.nutzer = r.json.nutzer;
    return r.json.nutzer;
  }
}

async function main() {
  console.log(`Geodaten & Akquise-Engine – Test gegen ${BASIS}`);
  const leitung = new Client("admin");
  const akquise = new Client("bo-akquise");
  const gast = new Client("gast");
  if (!(await leitung.login("admin@example.com"))) throw new Error("Login admin fehlgeschlagen");
  if (!(await akquise.login("bo-akquise@example.com"))) throw new Error("Login bo-akquise fehlgeschlagen (Backoffice-Demo-Konten fehlen?)");

  // ------------------------------------------------------------ 1. Rechte
  abschnitt("1. Rechte: nur Leitung und Akquise");
  let r = await gast.get("/api/admin/geodaten");
  pruefe(r.status === 401, "Gast → 401", r.status);
  for (const c of [leitung, akquise]) {
    r = await c.get("/api/admin/geodaten");
    pruefe(r.status === 200 && r.json.kennzahlen?.kandidaten > 0, `${c.name}: Übersicht 200 mit Kandidaten`, r.status);
  }
  pruefe(r.json.modus === "demo" && r.json.quellen?.some((q) => q.lizenz === "ODbL-1.0") && r.json.quellen?.some((q) => /basemap/.test(q.attribution)), "Demo-Modus mit Quellen/Lizenzen (ODbL, basemap.at)", r.json.quellen);
  const fremde = [];
  for (const [email, name] of [["bo-transaktion@example.com", "Transaktion"], ["bo-lesen@example.com", "Nur lesen"], ["bo-betrieb@example.com", "Betrieb"], ["investor@example.com", "Investor"]]) {
    const c = new Client(name);
    if (!(await c.login(email))) {
      pruefe(true, `${name}: Konto nicht vorhanden – übersprungen`);
      continue;
    }
    fremde.push(c);
    r = await c.get("/api/admin/geodaten/kandidaten");
    pruefe(r.status === 403 && !r.json.kandidaten, `${name}: Kandidaten → 403 ohne Daten`, r.status);
    if (name === "Transaktion") {
      r = await c.get("/api/admin/geodaten/export?format=csv"); // Export ist rate-limitiert (10/h) – nur einmal prüfen
      pruefe(r.status === 403 && !r.text.includes("Kandidat;"), `${name}: Export → 403`, r.status);
    }
  }
  r = await akquise.get("/portal/admin/akquise/karte");
  pruefe(r.status === 200 && /Akquise-Karte<\/h1>/.test(r.text), "Seite Akquise-Karte für Akquise → 200", r.status);
  const transaktion = fremde.find((c) => c.name === "Transaktion");
  if (transaktion) {
    r = await transaktion.get("/portal/admin/akquise/karte");
    // Dev-Server liefert notFound() teils mit Status 200 (Streaming) – maßgeblich: 404-Seite statt Inhalt
    pruefe(r.status === 404 || (!/Akquise-Karte<\/h1>/.test(r.text) && /404|nicht gefunden/i.test(r.text)), "Seite Akquise-Karte für Transaktion → 404 (kein Inhalt)", r.status);
  }

  // ------------------------------------------------------------ 2. Kandidaten & Filter
  abschnitt("2. Kandidaten, Score und Filter");
  r = await akquise.get("/api/admin/geodaten/kandidaten");
  const alle = r.json.kandidaten || [];
  pruefe(r.status === 200 && alle.length >= 10, "Kandidatenliste (≥ 10 Flächen)", alle.length);
  pruefe(alle.every((k) => k.score >= 0 && k.score <= 100 && ["gruen", "gelb", "rot"].includes(k.ampel) && k.geometrie?.type === "MultiPolygon"), "Score 0–100, Ampel und Geometrie je Fläche");
  pruefe(alle.every((k, i) => i === 0 || alle[i - 1].score >= k.score), "Nach Score absteigend sortiert");
  pruefe(alle.every((k) => k.demo === true), "Alle Demo-Flächen sind als DEMO markiert");
  pruefe(alle.some((k) => k.ko.some((x) => x.id === "groesse")) && alle.some((k) => k.ko.some((x) => /^schutz_/.test(x.id))), "K.-o.-Fälle vorhanden (zu klein, Schutzgebiet)");
  pruefe(alle.every((k) => k.kriterien.reduce((s, c) => s + (c.max || 0), 0) === 100), "Höchstpunkte der Kriterien summieren sich auf 100");
  r = await akquise.get("/api/admin/geodaten/kandidaten?minHa=20");
  pruefe(r.json.kandidaten.length > 0 && r.json.kandidaten.every((k) => k.ha >= 20), "Filter Mindestgröße 20 ha", r.json.kandidaten.map((k) => k.ha));
  r = await akquise.get("/api/admin/geodaten/kandidaten?maxTrasseKm=3");
  pruefe(r.json.kandidaten.every((k) => k.netz && k.netz.trasseM <= 3000) && r.json.kandidaten.length < alle.length, "Filter max. Trassenlänge 3 km", r.json.kandidaten.length);
  const bezirk = alle[0].bezirk;
  r = await akquise.get(`/api/admin/geodaten/kandidaten?bezirk=${encodeURIComponent(bezirk)}`);
  pruefe(r.json.kandidaten.length > 0 && r.json.kandidaten.every((k) => k.bezirk === bezirk), `Filter Bezirk „${bezirk}“`);
  r = await akquise.get("/api/admin/geodaten/kandidaten?bbox=1,2,3");
  pruefe(r.status === 200, "Ungültige BBox wird ignoriert (kein 500)", r.status);

  // ------------------------------------------------------------ 3. Distanzen
  abschnitt("3. Distanz- und Trassenberechnung");
  const braunauRied = distanzM([13.0346, 48.2566], [13.4886, 48.2107]);
  pruefe(Math.abs(braunauRied / 1000 - 34.0) < 0.6, `Haversine Braunau → Ried ≈ 34 km (${(braunauRied / 1000).toFixed(2)} km)`);
  pruefe(Math.abs(distanzM([0, 0], [0, 1]) - 111195) < 5, "1° Breite ≈ 111,2 km");
  const mitNetz = alle.filter((k) => k.netz);
  let abw = 0;
  for (const k of mitNetz) {
    const d = distanzM(k.schwerpunkt, [k.netz.knoten.lon, k.netz.knoten.lat]);
    abw = Math.max(abw, Math.abs(d - k.netz.luftlinieM));
  }
  pruefe(mitNetz.length > 0 && abw <= 2, `Luftlinie Fläche → Netzknoten nachgerechnet (max. Abweichung ${abw.toFixed(2)} m)`);
  pruefe(mitNetz.every((k) => k.netz.trasseM === Math.round(k.netz.luftlinieM * 1.25) || Math.abs(k.netz.trasseM - k.netz.luftlinieM * 1.25) <= 2), "Trasse = Luftlinie × 1,25 (Demo ohne Querungen)");
  pruefe(mitNetz.every((k) => k.netz.kosten.min < k.netz.kosten.summe && k.netz.kosten.summe < k.netz.kosten.max), "Kostenspanne min < Schätzung < max");
  pruefe(mitNetz.every((k) => k.mwp <= 12 || k.netz.knoten.art !== "trafo"), "Über 12 MWp kein Anschluss an Trafostation");

  // ------------------------------------------------------------ 4. Umkreis, Steckbrief, Netz, Ebenen, Suche
  abschnitt("4. Umkreis-Suche, Steckbrief, Ebenen, Suche");
  const mitUw = alle.find((k) => k.umspannwerk);
  r = await akquise.get(`/api/admin/geodaten/umkreis?knoten=${encodeURIComponent(mitUw.umspannwerk.id)}&km=8`);
  const umk = r.json.kandidaten || [];
  pruefe(r.status === 200 && umk.length > 0 && umk.every((k) => k.abstandZumKnotenM <= 8000), "Umkreis 8 km um Umspannwerk: nur Flächen im Radius", umk.map((k) => k.abstandZumKnotenM));
  pruefe(umk.every((k, i) => i === 0 || umk[i - 1].score >= k.score), "Umkreis: beste Flächen zuerst");
  pruefe(umk.every((k) => Math.abs(distanzM(k.schwerpunkt, [r.json.knoten.lon, r.json.knoten.lat]) - k.abstandZumKnotenM) <= 2), "Umkreis-Abstände nachgerechnet");
  r = await akquise.get("/api/admin/geodaten/umkreis?knoten=osm-n0&km=5");
  pruefe(r.status === 404, "Umkreis um unbekannten Knoten → 404", r.status);
  r = await akquise.get(`/api/admin/geodaten/kandidaten/${encodeURIComponent(alle[0].id)}`);
  pruefe(r.status === 200 && r.json.kandidat.parzellen?.[0]?.gstNr && r.json.kandidat.kriterien?.length >= 9, "Steckbrief mit Grundstücken und Kriterien");
  pruefe(!JSON.stringify(r.json).match(/eigent(ü|ue)mer"\s*:/i), "Steckbrief ohne Eigentümerdaten");
  r = await akquise.get("/api/admin/geodaten/kandidaten/K-GIBTS-NICHT");
  pruefe(r.status === 404, "Unbekannter Kandidat → 404", r.status);
  r = await akquise.get("/api/admin/geodaten/netz?bbox=12.8,47.9,13.6,48.4&arten=uw110,uew");
  pruefe(r.status === 200 && r.json.features.length > 3 && r.json.features.every((f) => ["uw110", "uew"].includes(f.properties.art)), "Netzknoten (UW ≥ 110 kV) im Ausschnitt", r.json.features?.length);
  r = await akquise.get("/api/admin/geodaten/ebenen/schutzgebiete?bbox=12.8,47.9,13.6,48.4");
  pruefe(r.status === 200 && r.json.features.length > 0, "Ebene Schutzgebiete", r.json.features?.length);
  r = await akquise.get("/api/admin/geodaten/ebenen/zonen?bbox=12.8,47.9,13.6,48.4");
  pruefe(r.status === 200 && r.json.features.some((f) => f.properties.art === "ooe_prioritaet_1"), "Ebene OÖ-Prioritätsradien");
  r = await akquise.get("/api/admin/geodaten/ebenen/geheim?bbox=12.8,47.9,13.6,48.4");
  pruefe(r.status === 404, "Unbekannte Ebene → 404", r.status);
  r = await akquise.get("/api/admin/geodaten/suche?q=Ried");
  pruefe(r.status === 200 && r.json.treffer.length > 0, "Suche „Ried“ liefert Treffer", r.json.treffer?.length);
  const p0 = (await akquise.get(`/api/admin/geodaten/kandidaten/${encodeURIComponent(alle[0].id)}`)).json.kandidat.parzellen[0];
  r = await akquise.get(`/api/admin/geodaten/suche?q=${encodeURIComponent(`${p0.kgNr} ${p0.gstNr}`)}`);
  pruefe(r.json.treffer?.some((t) => t.typ === "grundstueck"), "Suche nach KG-Nr + Grundstücksnummer", r.json.treffer);

  // ------------------------------------------------------------ 5. Export & Anschreiben
  abschnitt("5. Export und Anschreiben");
  const csvRes = await fetch(`${BASIS}/api/admin/geodaten/export?format=csv&minHa=5`, { headers: { Cookie: akquise.cookie } });
  const roh = new Uint8Array(await csvRes.arrayBuffer());
  const csvText = new TextDecoder().decode(roh);
  pruefe(csvRes.status === 200 && roh[0] === 0xef && roh[1] === 0xbb && roh[2] === 0xbf && csvText.includes("Kandidat;DEMO;Score"), "CSV mit BOM (UTF-8) und Semikolon", csvRes.status);
  r = await akquise.get("/api/admin/geodaten/export?format=geojson&minHa=5");
  pruefe(r.status === 200 && r.json.type === "FeatureCollection" && r.json.features.length > 0 && /ODbL/.test(r.json.metadata?.hinweis), "GeoJSON-Export mit Lizenzhinweis");
  r = await akquise.get(`/api/admin/geodaten/anschreiben?kandidat=${encodeURIComponent(alle[0].id)}`);
  const v = r.json.vorlage || {};
  pruefe(r.status === 200 && /Datenschutzinformation/.test(v.text) && /WIDERSPRUCH/.test(v.text) && /Grundbuch/.test(v.text), "Anschreiben mit Art.-14-Information, Datenquelle und Widerspruch");
  pruefe(/§ 174 TKG/.test(v.hinweis) && !/@/.test(v.text), "Hinweis Direktwerbung (nur Brief), keine E-Mail-Adresse erfunden");

  // ------------------------------------------------------------ 6. Übernahme als Akquise-Ziel
  abschnitt("6. Übernahme als Akquise-Ziel");
  const zieleVorher = (await akquise.get("/api/admin/geodaten/ziele")).json.ziele || [];
  const frei = alle.find((k) => !zieleVorher.some((z) => z.kandidatId === k.id && z.status !== "verworfen"));
  if (transaktion) {
    r = await transaktion.post("/api/admin/geodaten/ziele", { kandidatId: frei?.id || alle[0].id });
    pruefe(r.status === 403, "Transaktion darf nicht übernehmen → 403", r.status);
  }
  r = await akquise.post("/api/admin/geodaten/ziele", { kandidatId: alle[0].id }, { origin: "https://boese.example" });
  pruefe(r.status === 403, "Übernahme von fremder Herkunft → 403 (CSRF)", r.status);
  if (!frei) {
    pruefe(true, "Alle Demo-Kandidaten bereits übernommen – Übernahme-Test übersprungen");
  } else {
    r = await akquise.post("/api/admin/geodaten/ziele", { kandidatId: frei.id, notiz: "Testlauf" });
    pruefe(r.status === 201 && r.json.flaecheId && r.json.aufgabeId, "Übernahme → 201 mit Fläche und Aufgabe", r.json);
    const flaecheId = r.json.flaecheId;
    r = await akquise.get("/api/admin/akquise?alle=1");
    const zeile = (r.json.flaechen || []).find((f) => f.id === flaecheId);
    pruefe(!!zeile && zeile.tags.includes("Geodaten") && Math.abs(zeile.ha - frei.ha) < 0.01, "Akquise-Pipeline enthält die neue Fläche (Tag „Geodaten“, gleiche Größe)", zeile);
    pruefe(zeile?.zustaendig?.email === "bo-akquise@example.com", "Übernehmende Person ist zuständig");
    r = await akquise.get(`/api/admin/aufgaben?bezug=${encodeURIComponent(`flaeche:${flaecheId}`)}`);
    pruefe((r.json.aufgaben || []).some((a) => a.titel === "Eigentümer ermitteln (Grundbuchabfrage)" && a.status === "offen"), "Aufgabe „Eigentümer ermitteln (Grundbuchabfrage)“ angelegt", r.json.aufgaben);
    r = await akquise.post("/api/admin/geodaten/ziele", { kandidatId: frei.id });
    pruefe(r.status === 409, "Zweite Übernahme derselben Fläche → 409", r.status);
    r = await akquise.get("/api/admin/geodaten/ziele");
    const z = (r.json.ziele || []).find((x) => x.kandidatId === frei.id);
    pruefe(!!z && z.flaecheId === flaecheId && z.umspannwerk !== undefined && z.geometrie === undefined, "Ziel-Liste mit UW-Bezug (Geometrie nur intern)", z);
  }
  r = await akquise.post("/api/admin/geodaten/ziele", { kandidatId: "K-GIBTS-NICHT" });
  pruefe(r.status === 404, "Übernahme eines unbekannten Kandidaten → 404", r.status);

  // ------------------------------------------------------------ 7. Kapazitätspflege
  abschnitt("7. Netzkapazität pflegen");
  const kn = mitNetz[0].netz.knoten;
  r = await akquise.post("/api/admin/geodaten/kapazitaet", { knotenId: kn.id, kapazitaet: "knapp" });
  pruefe(r.status === 422 || r.status === 400, "Ohne Quelle → abgelehnt", r.status);
  r = await akquise.post("/api/admin/geodaten/kapazitaet", { knotenId: kn.id, kapazitaet: "knapp", freiMw: 0, quelle: "Testlauf (keine echte Angabe)", stand: "2026-09-30" });
  pruefe(r.status === 200 && r.json.kapazitaet?.kapazitaet === "knapp", "Kapazität „knapp“ mit Quelle gespeichert", r.status);
  r = await akquise.get(`/api/admin/geodaten/kandidaten/${encodeURIComponent(mitNetz[0].id)}`);
  const nach = r.json.kandidat;
  pruefe(nach.netz?.knoten?.id !== kn.id || nach.netz.knoten.kapazitaet === "knapp", "Bewertung berücksichtigt die gepflegte Kapazität");
  pruefe(nach.score <= mitNetz[0].score, `Score sinkt oder bleibt (${mitNetz[0].score} → ${nach.score})`);
  r = await akquise.post("/api/admin/geodaten/kapazitaet", { knotenId: kn.id, kapazitaet: "unbekannt", quelle: "Testlauf zurückgesetzt" });
  pruefe(r.status === 200, "Kapazität zurückgesetzt", r.status);
  if (transaktion) {
    r = await transaktion.post("/api/admin/geodaten/kapazitaet", { knotenId: kn.id, kapazitaet: "frei", quelle: "x" });
    pruefe(r.status === 403, "Transaktion darf Kapazität nicht pflegen → 403", r.status);
  }

  console.log(`\n${ok} bestanden, ${fehler} fehlgeschlagen`);
  process.exit(fehler ? 1 : 0);
}

main().catch((e) => {
  console.error(rot(`Abbruch: ${e.message}`));
  process.exit(1);
});
