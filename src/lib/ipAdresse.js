// src/lib/ipAdresse.js
//
// IP-Adresse des Besuchers für Rate-Limits und den Nachweis von Anfragen/Einwilligungen
// (Feld „ip_adresse“ in Frappe). Immer serverseitig ermitteln – nie einen Wert aus dem Formular übernehmen.
//
// Sicherheit (Masterplan Abschnitt 3, S0 Nr. 8): Der LINKE Wert von X-Forwarded-For stammt vom Client
// selbst und ist frei fälschbar. Wer ihn übernimmt, macht jedes IP-Rate-Limit umgehbar und schreibt
// gefälschte IPs in Einwilligungs- und NDA-Nachweise. Deshalb gilt nur, was ein vertrauenswürdiger
// Proxy gesetzt hat:
//
//   Modus 1 (Standard, empfohlen): X-Real-IP
//     nginx setzt den Wert selbst und ÜBERSCHREIBT ihn (Client-Werte gehen verloren):
//       proxy_set_header X-Real-IP       $remote_addr;
//       proxy_set_header X-Forwarded-For $remote_addr;
//     Next.js darf dann nur über den Proxy erreichbar sein (Port 3000 nur an 127.0.0.1 binden).
//
//   Modus 2: TRUSTED_PROXY_HOPS=<n> (Umgebungsvariable, ganze Zahl 1–10)
//     Für Proxy-Ketten, die X-Forwarded-For ANHÄNGEN ($proxy_add_x_forwarded_for, Load-Balancer).
//     Gezählt wird von RECHTS: n = Anzahl der eigenen Proxys vor der App. Der n-te Wert von rechts
//     ist die Adresse, die der äußerste eigene Proxy gesehen hat. Ist die Liste kürzer als n,
//     gibt es keine vertrauenswürdige Adresse (""). X-Real-IP wird in diesem Modus ignoriert.
//     Bei falscher Hop-Zahl erscheinen alle Besucher als Proxy-IP und teilen sich ein Limit –
//     vor dem Go-live auf Staging prüfen.
//
// Rechtlicher Prüfpunkt (Strang R): Zweck und Speicherfrist der IP für Rate-Limit und Nachweis.
// Test: node --test src/lib/ipAdresse.test.mjs

const IP_MUSTER = /^[0-9a-f.:]{3,45}$/i;

/** Hop-Zahl aus der Umgebung; 0 = Modus X-Real-IP. Ungültige Werte zählen als 0. */
export function proxyHops(env = process.env) {
  const roh = String(env.TRUSTED_PROXY_HOPS ?? "").trim();
  if (!/^\d{1,2}$/.test(roh)) return 0;
  const n = Number(roh);
  return n >= 1 && n <= 10 ? n : 0;
}

function bereinigen(wert) {
  const ip = String(wert || "").trim();
  return IP_MUSTER.test(ip) ? ip : "";
}

/**
 * IP-Adresse aus der Anfrage – nur aus vom eigenen Proxy gesetzten Kopfzeilen.
 * @param {Request} request
 * @param {Record<string,string|undefined>} [env] nur für Tests
 * @returns {string} IP oder "" (unbekannt bzw. nicht vertrauenswürdig)
 */
export function ipAdresse(request, env = process.env) {
  const hops = proxyHops(env);
  if (hops > 0) {
    const liste = (request.headers.get("x-forwarded-for") || "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    if (liste.length < hops) return "";
    return bereinigen(liste[liste.length - hops]);
  }
  return bereinigen(request.headers.get("x-real-ip"));
}
