// src/lib/plattform/passwortStaerke.js
//
// Einschätzung der Passwortstärke für die Anzeige (Client). Grobe Entropie aus Länge und
// Zeichenklassen, Abzüge für Wiederholungen, Folgen und häufige Muster. Die verbindliche Regel
// bleibt validierung.passwortFehler (serverseitig), optional ergänzt um die Leak-Prüfung (HIBP).

const HAEUFIG = [
  "passwort", "password", "123456", "qwertz", "qwerty", "asdf", "hallo", "willkommen", "welcome", "letmein", "admin",
  "sommer", "winter", "fruehling", "herbst", "iloveyou", "oekoinvest", "okoinvest", "solar", "demo", "geheim", "master",
];

export function passwortStaerke(pw = "", { email = "", name = "" } = {}) {
  const p = String(pw || "");
  if (!p) return { punkte: 0, stufe: 0, label: "", tipps: [] };
  let pool = 0;
  if (/[a-zäöüß]/.test(p)) pool += 30;
  if (/[A-ZÄÖÜ]/.test(p)) pool += 26;
  if (/\d/.test(p)) pool += 10;
  if (/[^A-Za-zÄÖÜäöüß0-9]/.test(p)) pool += 33;
  let bits = p.length * Math.log2(Math.max(pool, 2));
  const klein = p.toLowerCase();
  const tipps = [];
  if (/(.)\1{2,}/.test(p)) {
    bits -= 12;
    tipps.push("Keine Zeichenwiederholungen wie „aaa“.");
  }
  if (/(0123|1234|2345|3456|4567|5678|6789|abcd|bcde|cdef|qwer|wert|asdf)/i.test(p)) {
    bits -= 14;
    tipps.push("Keine Folgen wie „1234“ oder „qwer“.");
  }
  if (HAEUFIG.some((w) => klein.includes(w))) {
    bits -= 22;
    tipps.push("Keine gängigen Wörter wie „Passwort“ oder „Sommer“.");
  }
  const eigene = [String(email).split("@")[0], ...String(name).split(/\s+/)].map((x) => x.toLowerCase()).filter((x) => x.length >= 3);
  if (eigene.some((w) => klein.includes(w))) {
    bits -= 18;
    tipps.push("Nicht den eigenen Namen oder die E-Mail-Adresse verwenden.");
  }
  if (/(19|20)\d\d/.test(p)) bits -= 6;
  if (p.length < 12) tipps.push("Mindestens 12 Zeichen machen es deutlich sicherer.");
  if (pool < 60) tipps.push("Mischen Sie Groß-/Kleinbuchstaben, Ziffern und Sonderzeichen – oder nutzen Sie eine Passphrase aus 4 Wörtern.");
  const punkte = Math.max(0, Math.round(bits));
  const stufe = punkte < 35 ? 1 : punkte < 55 ? 2 : punkte < 75 ? 3 : 4;
  return { punkte, stufe, label: ["", "Schwach", "Mittel", "Gut", "Sehr gut"][stufe], tipps: tipps.slice(0, 2) };
}
