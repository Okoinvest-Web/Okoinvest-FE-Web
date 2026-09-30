// src/lib/plattform/geraet.js
//
// Grobe Geräte- und Ortsangaben für Sitzungsliste und Anmeldehistorie (Client- und serverseitig).
// Bewusst grob (Datensparsamkeit): Browser + Betriebssystem aus dem User-Agent, IP nur gekürzt
// (IPv4 /24, IPv6 /48), Land nur, wenn ein vorgeschalteter Proxy es als Kopfzeile liefert.

const BROWSER = [
  [/Edg(e|A|iOS)?\//, "Edge"],
  [/OPR\/|Opera/, "Opera"],
  [/SamsungBrowser\//, "Samsung Internet"],
  [/Firefox\/|FxiOS\//, "Firefox"],
  [/CriOS\/|Chrome\/|Chromium\//, "Chrome"],
  [/Safari\//, "Safari"],
  [/node|undici|curl|wget|python|axios|Go-http/i, "Programm/Skript"],
];
const SYSTEM = [
  [/iPhone|iPod/, "iPhone"],
  [/iPad/, "iPad"],
  [/Android/, "Android"],
  [/Windows NT/, "Windows"],
  [/Mac OS X|Macintosh/, "macOS"],
  [/CrOS/, "ChromeOS"],
  [/Linux/, "Linux"],
];

/** { browser, system, mobil, label } aus dem User-Agent */
export function geraetAusUserAgent(ua = "") {
  const s = String(ua || "").slice(0, 400);
  const browser = BROWSER.find(([re]) => re.test(s))?.[1] || "Unbekannter Browser";
  const system = SYSTEM.find(([re]) => re.test(s))?.[1] || "";
  const mobil = /Mobi|iPhone|Android.*Mobile/.test(s);
  return { browser, system, mobil, label: system ? `${browser} auf ${system}` : browser };
}

/** IP gekürzt: 203.0.113.17 → 203.0.113.x · 2001:db8:1:2::5 → 2001:db8:1::/48 */
export function ipGrob(ip = "") {
  const s = String(ip || "").trim();
  if (!s) return "";
  if (/^\d+\.\d+\.\d+\.\d+$/.test(s)) return s.replace(/\.\d+$/, ".x");
  if (s.includes(":")) {
    const teile = s.split(":").filter(Boolean).slice(0, 3);
    return `${teile.join(":")}::/48`;
  }
  return "";
}

/** Grober Ort aus IP/Kopfzeilen: „Lokales Netz“, Land (falls vom Proxy geliefert) oder gekürzte IP */
export function ortGrob(ip = "", land = "") {
  const s = String(ip || "").trim();
  if (!s || s === "::1" || /^127\./.test(s) || /^10\./.test(s) || /^192\.168\./.test(s) || /^172\.(1[6-9]|2\d|3[01])\./.test(s) || /^f[cd]/i.test(s)) {
    return "Lokales Netz";
  }
  const l = /^[A-Z]{2}$/.test(String(land || "")) ? String(land) : "";
  const laender = { DE: "Deutschland", AT: "Österreich", CH: "Schweiz", IT: "Italien", FR: "Frankreich", NL: "Niederlande", PL: "Polen", CZ: "Tschechien" };
  return l ? `${laender[l] || l} · ${ipGrob(s)}` : ipGrob(s);
}
