// src/lib/ipAdresse.js
//
// IP-Adresse des Besuchers für den Nachweis von Anfragen/Einwilligungen (Feld „ip_adresse“ in Frappe).
// Immer serverseitig ermitteln – nie einen Wert aus dem Formular übernehmen.

/** IP-Adresse aus der Anfrage (hinter Proxy/Load-Balancer aus X-Forwarded-For bzw. X-Real-IP). */
export function ipAdresse(request) {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || request.headers.get("x-real-ip")?.trim() || "";
  return /^[0-9a-f.:]{3,45}$/i.test(ip) ? ip : "";
}
