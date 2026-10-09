// SEO-Grundlagen aus dem Server-HTML: title, description, canonical, h1-Anzahl, robots, JSON-LD parsebar.
// Aufruf: node seo.mjs <basis> /pfad1 /pfad2 ...
const [basis, ...pfade] = process.argv.slice(2);
const titel = new Map();
for (const p of pfade) {
  try {
    let r, h;
    for (let v = 0; v < 3; v++) {
      try {
        r = await fetch(basis + p, { signal: AbortSignal.timeout(180000), headers: { connection: "close" } });
        h = await r.text();
        break;
      } catch (e) {
        if (v === 2) throw new Error(String(e) + " " + String(e.cause));
        await new Promise((ok) => setTimeout(ok, 5000));
      }
    }
    // Seitentitel = <title> direkt vor <meta name="description"> (die übrigen stecken in SVGs)
    const t = (h.match(/<title>([^<]*)<\/title>(?:<meta[^>]*>)*?<meta name="description"/) || h.match(/<title>([^<]*\|[^<]*)<\/title>/) || [])[1] || "";
    const d = (h.match(/<meta name="description" content="([^"]*)"/) || [])[1] || "";
    const c = (h.match(/<link rel="canonical" href="([^"]*)"/) || [])[1] || "";
    const rob = (h.match(/<meta name="robots" content="([^"]*)"/) || [])[1] || "";
    const h1 = (h.match(/<h1[\s>]/g) || []).length;
    const ld = [...h.matchAll(/<script type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g)].map((m) => m[1]);
    let ldFehler = 0;
    const typen = [];
    for (const x of ld) {
      try {
        const j = JSON.parse(x);
        const arr = Array.isArray(j) ? j : j["@graph"] || [j];
        arr.forEach((o) => typen.push(o["@type"]));
      } catch { ldFehler++; }
    }
    if (titel.has(t)) titel.get(t).push(p); else titel.set(t, [p]);
    const probleme = [];
    if (r.status !== 200) probleme.push("status " + r.status);
    if (!t) probleme.push("kein title");
    if (!d) probleme.push("keine description");
    if (!c && !rob.includes("noindex")) probleme.push("kein canonical");
    if (h1 !== 1) probleme.push(`h1=${h1}`);
    if (ldFehler) probleme.push(`JSON-LD ungültig ×${ldFehler}`);
    console.log(`${probleme.length ? "!!" : "OK"} ${p} | ${t.slice(0, 60)} | d=${d.length} | can=${c.replace(/^https?:\/\/[^/]+/, "")} | robots=${rob || "-"} | h1=${h1} | ld=${typen.join(",")} ${probleme.length ? "| " + probleme.join("; ") : ""}`);
  } catch (e) {
    console.log(`!! ${p} FEHLER ${String(e).slice(0, 100)}`);
  }
}
for (const [t, ps] of titel) if (ps.length > 1) console.log(`DOPPELTER TITLE "${t}": ${ps.join(", ")}`);
