// src/lib/plattform/demoGuard.js
//
// Demo-Guard (Masterplan Abschnitt 3, S0 Nr. 8; Paket A): Das Demo-Backend zeigt auf /login alle
// Demo-Konten einschließlich Backoffice-Admin mit Passwort an. Läuft ein Produktions-Build mit
// PLATTFORM_DEMO=1 unter der echten Domain, wäre das eine vollständige Übernahme. Deshalb gilt im
// Produktions-Build (NODE_ENV=production):
//   - Demo nur mit PLATTFORM_DEMO=1 (wie bisher),
//   - UND nur, wenn PLATTFORM_BASIS_URL bzw. NEXT_PUBLIC_SITE_URL gesetzt ist (ohne Wert fällt
//     SITE.url auf die Produktionsdomain zurück – also sperren: fail-closed),
//   - UND keine dieser URLs auf die Produktionsdomain zeigt (PRODUKTIV_HOSTS).
// Entwicklung (next dev) bleibt unverändert.
//
// Ohne Importe, damit `node --test` die Datei direkt laden kann.
// Test: node --test src/lib/plattform/demoGuard.test.mjs

/** Hosts der Produktivseite (Entscheidung des Inhabers: Domain oekoinvest.com). */
export const PRODUKTIV_HOSTS = ["oekoinvest.com", "www.oekoinvest.com"];

/**
 * Darf das Demo-Backend in dieser Umgebung laufen?
 * @param {Record<string,string|undefined>} [env]
 * @returns {{ erlaubt: boolean, grund: string }}
 */
export function demoPruefung(env = process.env) {
  if (env.NODE_ENV !== "production") return { erlaubt: true, grund: "entwicklung" };
  if (env.PLATTFORM_DEMO !== "1") return { erlaubt: false, grund: "PLATTFORM_DEMO nicht gesetzt" };
  const urls = [env.PLATTFORM_BASIS_URL, env.NEXT_PUBLIC_SITE_URL].map((u) => String(u || "").trim()).filter(Boolean);
  if (!urls.length) return { erlaubt: false, grund: "keine Basis-URL gesetzt (Rückfall auf Produktionsdomain)" };
  for (const u of urls) {
    let host;
    try {
      host = new URL(u).hostname.toLowerCase().replace(/\.$/, "");
    } catch {
      return { erlaubt: false, grund: `ungültige URL ${u}` };
    }
    if (PRODUKTIV_HOSTS.includes(host)) return { erlaubt: false, grund: `Produktionsdomain ${host}` };
  }
  return { erlaubt: true, grund: "vorführung" };
}

export const demoErlaubt = (env = process.env) => demoPruefung(env).erlaubt;
