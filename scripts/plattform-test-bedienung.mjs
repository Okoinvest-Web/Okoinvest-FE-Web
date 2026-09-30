// scripts/plattform-test-bedienung.mjs
//
// Tests „Bedienung & Onboarding“ gegen den laufenden Dev-Server (Demo-Backend):
//   node scripts/plattform-test-bedienung.mjs [basis-url]
//
// Geprüft: globale Suche /api/portal/suche (nur Berechtigtes, fremde Objekte nie, Börse nur Investor,
// Nutzer nur Backoffice, nur interne Portal-Pfade, keine internen Felder, Längen-/Mindestgrenzen),
// Onboarding-Zustand am Konto (/api/portal/onboarding: Positivliste, „erledigt“ nur ergänzend,
// Status nie zurück, fremde Konten unberührt, CSRF/JSON), Checkliste aus echten Daten,
// neue Portalseiten (/portal/hilfe, /portal/willkommen) und PWA-Dateien ohne vertrauliche Inhalte.
// Eigene Testkonten mit Präfix „ux-“ (example.com).

const BASIS = (process.argv[2] || process.env.PLATTFORM_TEST_URL || "http://localhost:3100").replace(/\/$/, "");
const DEMO_PASSWORT = process.env.PLATTFORM_DEMO_PASSWORT || "Demo-2026!";
const LAUF = Date.now().toString(36);

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
        res = await fetch(BASIS + pfad, { method: methode, headers, body: payload, redirect: "manual" });
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
    try {
      json = JSON.parse(text);
    } catch {
      json = { text: text.slice(0, 300) };
    }
    return { status: res.status, json, text, headers: res.headers };
  }

  get = (p, o) => this.anfrage("GET", p, undefined, o);
  post = (p, b, o) => this.anfrage("POST", p, b ?? {}, o);
  put = (p, b, o) => this.anfrage("PUT", p, b ?? {}, o);

  async login(email, passwort = DEMO_PASSWORT) {
    const r = await this.post("/api/auth/login", { email, passwort });
    if (r.status !== 200) throw new Error(`Login ${email} fehlgeschlagen: ${r.status} ${JSON.stringify(r.json)}`);
    return r.json.nutzer;
  }

  async registrieren(praefix, rollen) {
    const r = await this.post("/api/auth/registrieren", { email: `ux-${praefix}-${LAUF}@example.com`, passwort: "Ux-Passwort-2026", vorname: "Ux", nachname: `${praefix} ${LAUF}`, rollen, agb: true });
    if (r.status !== 201) throw new Error(`Registrierung ${praefix} fehlgeschlagen: ${r.status} ${JSON.stringify(r.json)}`);
    return r.json.nutzer;
  }

  suche = (q) => this.get(`/api/portal/suche?q=${encodeURIComponent(q)}`);
}

const nurPortal = (treffer) => treffer.every((t) => typeof t.href === "string" && /^\/portal(\/|$|\?)/.test(t.href));

async function main() {
  console.log(`Bedienung & Onboarding – Test gegen ${BASIS} (Lauf ${LAUF})`);
  const gast = new Client("gast");
  const eigen = new Client("eigentümer");
  const fremd = new Client("fremder eigentümer");
  const investor = new Client("investor");
  const admin = new Client("admin");
  let r;

  // ------------------------------------------------------------ 1. Suche: Anmeldung & Grenzen
  abschnitt("1. Suche – Anmeldung und Grenzen");
  r = await gast.suche("Acker");
  pruefe(r.status === 401, "Suche ohne Sitzung → 401", r.status);
  const eigenNutzer = await eigen.registrieren("eigen", ["flaeche"]);
  await fremd.registrieren("fremd", ["flaeche"]);
  await investor.login("investor@example.com");
  await admin.login("admin@example.com");
  r = await eigen.suche("a");
  pruefe(r.status === 200 && Array.isArray(r.json.treffer) && r.json.treffer.length === 0, "Anfrage < 2 Zeichen → keine Treffer", r.json);
  r = await eigen.suche("x".repeat(300));
  pruefe(r.status === 200 && r.json.q.length <= 80, "Anfrage wird auf 80 Zeichen begrenzt", r.json.q?.length);
  r = await eigen.post("/api/portal/suche", { q: "Acker" });
  pruefe(r.status === 405, "Suche nur per GET (POST → 405)", r.status);

  // ------------------------------------------------------------ 2. Suche: eigene vs. fremde Objekte
  abschnitt("2. Suche – nur Berechtigtes");
  const kennwort = `Uxgeheimacker${LAUF}`;
  r = await eigen.post("/api/portal/flaechen", { bezeichnung: `${kennwort} Nord`, land: "DE", plz: "86825", ort: "Demo-Ort", ha: 7.5 });
  pruefe(r.status === 200 && r.json.flaeche?.id, "eigene Testfläche angelegt", r.json);
  const flaecheId = r.json.flaeche?.id;
  r = await eigen.suche(kennwort);
  pruefe(r.status === 200 && r.json.treffer.some((t) => t.art === "flaeche" && t.id === flaecheId && t.href === `/portal/flaechen/${flaecheId}`), "Eigentümer findet eigene Fläche (Link ins Portal)", r.json.treffer);
  pruefe(nurPortal(r.json.treffer) && r.json.treffer.every((t) => !("felder" in t) && !("nutzerId" in t) && !("ip" in t)), "Treffer ohne interne Felder, nur Portal-Pfade", r.json.treffer[0]);
  r = await eigen.suche(flaecheId);
  pruefe(r.json.treffer.some((t) => t.id === flaecheId), "Suche nach Kennung (F-…) findet die Fläche", r.json.treffer.map((t) => t.id));
  r = await eigen.suche(kennwort.replace("acker", "aker"));
  pruefe(r.json.treffer.some((t) => t.id === flaecheId), "unscharfe Suche (Tippfehler/Teilwort) findet die Fläche", r.json.treffer.map((t) => t.titel));
  r = await fremd.suche(kennwort);
  pruefe(r.status === 200 && !JSON.stringify(r.json.treffer).includes(kennwort) && !r.json.treffer.some((t) => t.id === flaecheId), "fremder Eigentümer findet die Fläche NICHT", r.json.treffer);
  r = await fremd.suche(flaecheId);
  pruefe(!r.json.treffer.some((t) => t.id === flaecheId), "auch nicht über die Kennung", r.json.treffer);
  r = await investor.suche(kennwort);
  pruefe(!r.json.treffer.some((t) => t.art === "flaeche"), "Investor findet keine fremden Flächen", r.json.treffer);
  r = await admin.suche(kennwort);
  pruefe(r.json.treffer.some((t) => t.id === flaecheId), "Backoffice findet die Fläche", r.json.treffer);

  // ------------------------------------------------------------ 3. Suche: Börse & Nutzer je Rolle
  abschnitt("3. Suche – Börse und Nutzer je Rolle");
  r = await investor.suche("MWp");
  const boerseTreffer = r.json.treffer.filter((t) => t.art === "boerse");
  pruefe(boerseTreffer.length > 0 && boerseTreffer.every((t) => t.href.startsWith("/portal/boerse/")), "Investor findet Börsenprojekte (Portal-Börse)", r.json.treffer.slice(0, 3));
  r = await eigen.suche("MWp");
  pruefe(!r.json.treffer.some((t) => t.art === "boerse" || t.art === "projekt"), "Flächeneigentümer: keine Börse, keine Projekte", r.json.treffer.map((t) => t.art));
  r = await eigen.suche("example.com");
  pruefe(!r.json.treffer.some((t) => t.art === "nutzer"), "Nicht-Admin findet keine Nutzerkonten", r.json.treffer.map((t) => t.art));
  r = await admin.suche(`ux-eigen-${LAUF}`);
  pruefe(r.json.treffer.some((t) => t.art === "nutzer" && t.id === eigenNutzer.id && t.href.startsWith("/portal/admin/nutzer")), "Backoffice findet Nutzerkonten", r.json.treffer);
  r = await investor.suche("Mühlweg");
  pruefe(!r.json.treffer.some((t) => t.art === "flaeche"), "Investor findet die Demo-Fläche „Acker am Mühlweg“ nicht", r.json.treffer.map((t) => t.titel));
  const flaecheDemo = new Client("flaeche-demo");
  await flaecheDemo.login("flaeche@example.com");
  r = await flaecheDemo.suche("Mühlweg");
  pruefe(r.json.treffer.some((t) => t.art === "flaeche"), "Eigentümerin der Demo-Fläche findet sie", r.json.treffer.map((t) => t.titel));

  // ------------------------------------------------------------ 4. Onboarding-Zustand
  abschnitt("4. Onboarding – Zustand am Konto");
  r = await gast.get("/api/portal/onboarding");
  pruefe(r.status === 401, "Onboarding ohne Sitzung → 401", r.status);
  r = await fremd.get("/api/portal/onboarding");
  pruefe(r.status === 200 && r.json.zustand?.status === "neu" && r.json.zustand.erledigt.length === 0, "neues Konto: Status „neu“", r.json.zustand);
  const punkte = r.json.liste?.punkte || [];
  pruefe(punkte.some((p) => p.id === "flaeche" && !p.erledigt) && punkte.some((p) => p.id === "profil") && !punkte.some((p) => p.id === "suchprofil"), "Checkliste je Rolle (Fläche offen, kein Suchprofil-Punkt)", punkte.map((p) => `${p.id}:${p.erledigt}`));
  pruefe(punkte.every((p) => /^\/portal/.test(p.href)), "Checklisten-Links nur ins Portal", punkte.map((p) => p.href));
  r = await eigen.get("/api/portal/onboarding");
  pruefe(r.json.liste?.punkte?.find((p) => p.id === "flaeche")?.erledigt === true, "Fläche angelegt → Punkt „Erste Fläche“ erledigt (aus echten Daten)", r.json.liste?.punkte);

  r = await eigen.put("/api/portal/onboarding", { status: "laufend", schritt: 1, erledigt: ["profil", "unsinn", "<script>"], checklisteAus: "ja", fremdesFeld: 1 });
  pruefe(r.status === 200 && r.json.zustand.status === "laufend" && r.json.zustand.schritt === 1 && JSON.stringify(r.json.zustand.erledigt) === '["profil"]' && r.json.zustand.checklisteAus === false && !("fremdesFeld" in r.json.zustand), "Positivliste: nur gültige Werte übernommen", r.json.zustand);
  r = await eigen.put("/api/portal/onboarding", { schritt: 99, status: "hacker", erledigt: ["benachrichtigungen"] });
  pruefe(r.json.zustand.schritt === 1 && r.json.zustand.status === "laufend" && r.json.zustand.erledigt.join() === "profil,benachrichtigungen", "ungültiger Schritt/Status ignoriert, „erledigt“ wird ergänzt", r.json.zustand);
  r = await eigen.put("/api/portal/onboarding", { status: "erledigt", erledigt: ["fertig"] });
  pruefe(r.json.zustand.status === "erledigt", "Einstieg abgeschlossen", r.json.zustand);
  r = await eigen.put("/api/portal/onboarding", { status: "neu", erledigt: [] });
  pruefe(r.json.zustand.status === "erledigt" && r.json.zustand.erledigt.includes("profil"), "Status nie zurück auf „neu“, Merker nie entfernt", r.json.zustand);
  r = await eigen.get("/api/portal/onboarding");
  pruefe(r.json.zustand.status === "erledigt" && !!r.json.zustand.aktualisiertAm, "Zustand dauerhaft am Konto gespeichert", r.json.zustand);
  r = await fremd.get("/api/portal/onboarding");
  pruefe(r.json.zustand.status === "neu" && r.json.zustand.erledigt.length === 0, "anderes Konto unberührt", r.json.zustand);
  r = await eigen.put("/api/portal/onboarding", { checklisteAus: true });
  pruefe(r.status === 200 && r.json.zustand?.checklisteAus === true, "Checkliste ausblendbar", r.json);

  r = await eigen.put("/api/portal/onboarding", { status: "uebersprungen" }, { origin: "https://boese.example" });
  pruefe(r.status === 403, "PUT von fremder Herkunft → 403", r.status);
  r = await eigen.put("/api/portal/onboarding", "status=erledigt", { kopf: { "Content-Type": "application/x-www-form-urlencoded" } });
  pruefe(r.status === 415, "PUT ohne JSON → 415", r.status);
  r = await eigen.put("/api/portal/onboarding", { erledigt: Array.from({ length: 2000 }, () => "profil") });
  pruefe(r.status === 413, "übergroßer Body → 413", r.status);

  // ------------------------------------------------------------ 5. Seiten & PWA
  abschnitt("5. Seiten und PWA-Dateien");
  for (const pfad of ["/portal/hilfe", "/portal/willkommen", "/portal/willkommen?schritt=objekt"]) {
    r = await eigen.get(pfad, { origin: null });
    pruefe(r.status === 200 && !/Application error|Unhandled Runtime Error/.test(r.text), `${pfad} → 200`, r.status);
  }
  r = await gast.get("/portal/hilfe", { origin: null });
  pruefe([302, 303, 307, 308].includes(r.status), "/portal/hilfe ohne Sitzung → Login", r.status);
  r = await gast.get("/portal.webmanifest", { origin: null });
  pruefe(r.status === 200 && r.json.start_url === "/portal" && r.json.icons?.some((i) => i.sizes === "512x512" && i.purpose === "maskable"), "Portal-Manifest mit start_url und maskable Icon", r.json);
  for (const icon of ["/icon-192.png", "/icon-512.png", "/icon-maskable-512.png", "/apple-touch-icon.png"]) {
    const roh = await gast.get(icon, { origin: null, roh: true });
    const b = new Uint8Array(await roh.arrayBuffer());
    pruefe(roh.status === 200 && b[0] === 0x89 && b[1] === 0x50, `${icon} ist ein PNG`, roh.status);
  }
  r = await gast.get("/sw-portal.js", { origin: null });
  pruefe(r.status === 200 && r.text.includes("portal-offline.html") && !/\/api\//.test(r.text.replace(/\/\*[\s\S]*?\*\//, "")), "Service Worker cacht keine APIs", r.status);
  r = await gast.get("/portal-offline.html", { origin: null });
  pruefe(r.status === 200 && r.text.includes("offline") && !r.text.includes("@example.com"), "Offline-Seite statisch, ohne Nutzerdaten", r.status);
  r = await eigen.get("/portal", { origin: null });
  pruefe(r.status === 200 && r.text.includes("/portal.webmanifest"), "Portal verlinkt das Portal-Manifest", r.status);

  console.log(`\n${fehler ? rot(`${fehler} Fehler`) : gruen("Alle Prüfungen bestanden")} (${ok} ok)`);
  process.exit(fehler ? 1 : 0);
}

main().catch((e) => {
  console.error(rot(`Abbruch: ${e.message}`));
  process.exit(1);
});
