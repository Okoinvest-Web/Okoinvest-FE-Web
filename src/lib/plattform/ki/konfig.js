// src/lib/plattform/ki/konfig.js
//
// Konfiguration des KI-Assistenten (nur serverseitig). Der Assistent ist OPTIONAL:
// Ohne ANTHROPIC_API_KEY arbeitet jeder Anwendungsfall mit regelbasierten Vorschlägen
// (siehe regeln.js) – nie mit einem Fehler. Der Schlüssel verlässt nie den Server.
//
// Umgebungsvariablen (docs/PLATTFORM.md, Abschnitt „KI-Assistent“):
//   ANTHROPIC_API_KEY          Schlüssel der Claude API – ohne: regelbasierter Modus
//   KI_MODELL                  Modell-ID, Standard claude-opus-5-5
//   KI_TAGESKONTINGENT         Aufrufe je Konto und Tag (Standard 30), Backoffice: KI_TAGESKONTINGENT_ADMIN (Standard 150)
//   KI_AUS                     „1“ schaltet den KI-Modus ab (z. B. bei Störungen), Regeln bleiben aktiv
//   KI_FALLBACK                „aus“ deaktiviert den serverseitigen Ausweich-Modell-Mechanismus (fallbacks)

export const STANDARD_MODELL = "claude-opus-5-5";

/** Modelle, für die der serverseitige Ausweichmechanismus (`fallbacks: "default"`) gesetzt wird */
const MIT_FALLBACK = new Set(["claude-opus-5-5", "claude-opus-5", "claude-fable-5-1", "claude-sonnet-5-5"]);

export const ANWENDUNGSFAELLE = {
  expose: { label: "Exposé-Assistent", rollen: ["anbieter"] },
  triage: { label: "Anfrage-Zusammenfassung & Triage", admin: true },
  frage: { label: "Frag das Projekt", rollen: ["investor", "anbieter"] },
  flaeche: { label: "Flächen-Assistent", rollen: ["flaeche", "landwirt"] },
  nachricht: { label: "Nachrichten-Entwurf" },
};

export const FALL_IDS = Object.keys(ANWENDUNGSFAELLE);

export function kiAktiv() {
  return !!String(process.env.ANTHROPIC_API_KEY || "").trim() && process.env.KI_AUS !== "1";
}

export function kiModell() {
  return String(process.env.KI_MODELL || "").trim() || STANDARD_MODELL;
}

export function mitFallback(modell = kiModell()) {
  return process.env.KI_FALLBACK !== "aus" && MIT_FALLBACK.has(modell);
}

function zahl(wert, standard) {
  const n = Number(wert);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : standard;
}

/** Tages-Kontingent je Konto (Aufrufe des Assistenten, KI- und Regelmodus) */
export function tagesKontingent(nutzer) {
  const admin = !!nutzer?.rollen?.includes("admin");
  return admin ? zahl(process.env.KI_TAGESKONTINGENT_ADMIN, 150) : zahl(process.env.KI_TAGESKONTINGENT, 30);
}

/** Rate-Limit je Konto: [max, Fenster in ms] – kurzfristiger Schutz zusätzlich zum Tages-Kontingent */
export const RATE_KONTO = [8, 60e3];
/** Rate-Limit je IP (mehrere Konten hinter einer Adresse) */
export const RATE_IP = [30, 60e3];

/** Dev-Lockerung wie server/rateLimit.js (Standard Faktor 10 außerhalb Produktion) */
export function rateFaktor() {
  return process.env.NODE_ENV !== "production" ? Number(process.env.PLATTFORM_RATE_FAKTOR) || 10 : 1;
}
