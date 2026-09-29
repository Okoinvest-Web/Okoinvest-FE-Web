// src/lib/plattform/fehler.js
//
// Einheitlicher Fehler für Backend und API. `status` wird 1:1 als HTTP-Status
// zurückgegeben, `message` ist für Nutzer bestimmt (deutsch, ohne Interna).

const CODES = {
  400: "ungueltig",
  401: "nicht_angemeldet",
  403: "verboten",
  404: "nicht_gefunden",
  409: "konflikt",
  413: "zu_gross",
  415: "typ",
  422: "validierung",
  429: "zu_viele",
  502: "backend",
  503: "nicht_konfiguriert",
};

export class PlattformFehler extends Error {
  constructor(status, message, code) {
    super(message);
    this.name = "PlattformFehler";
    this.status = status;
    this.code = code || CODES[status] || "fehler";
  }
}

export const nichtAngemeldet = () => new PlattformFehler(401, "Bitte melden Sie sich an.");
export const verboten = (text = "Dafür fehlt Ihnen die Berechtigung.") => new PlattformFehler(403, text);
export const nichtGefunden = (text = "Nicht gefunden.") => new PlattformFehler(404, text);
export const ungueltig = (text) => new PlattformFehler(422, text);
export const konflikt = (text) => new PlattformFehler(409, text);
