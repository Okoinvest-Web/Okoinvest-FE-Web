// Strukturiertes Log (JSON-Zeilen). Nie Passwörter, Tokens oder Payloads mit Zugangsdaten loggen.

const STUFEN = { debug: 10, info: 20, warn: 30, error: 40 };
const MIN = STUFEN[process.env.LOG_STUFE || "info"] ?? 20;

function schreiben(stufe, text, daten = {}) {
  if (STUFEN[stufe] < MIN) return;
  const zeile = JSON.stringify({ t: new Date().toISOString(), stufe, text, ...daten });
  (stufe === "error" || stufe === "warn" ? process.stderr : process.stdout).write(zeile + "\n");
}

export const log = {
  debug: (t, d) => schreiben("debug", t, d),
  info: (t, d) => schreiben("info", t, d),
  warn: (t, d) => schreiben("warn", t, d),
  error: (t, d) => schreiben("error", t, d),
};
