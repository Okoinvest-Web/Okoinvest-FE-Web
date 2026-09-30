// Client für die Frappe-App (whitelisted Methoden oekoinvest_app.plattform.api.anlagen.dienst_*).
// Eigener API-Benutzer mit NUR der Rolle „ÖkoInvest Anlagen-Dienst“ (nicht der Website-API-Benutzer).
// Timeout, Wiederholung mit exponentiellem Backoff bei 429/5xx/Netzfehlern; TLS-Prüfung immer an
// (eigene CA über NODE_EXTRA_CA_CERTS). Keine Tokens im Log.

const PRAEFIX = "/api/method/oekoinvest_app.plattform.api.anlagen.";

export class FrappeKlient {
  constructor({ url, apiKey, apiSecret, log, timeoutMs = 10000, versuche = 4 }) {
    this.url = url;
    this.kopf = { Authorization: `token ${apiKey}:${apiSecret}`, "Content-Type": "application/json", Accept: "application/json" };
    this.log = log;
    this.timeoutMs = timeoutMs;
    this.versuche = versuche;
  }

  async aufruf(methode, args = {}) {
    let letzter;
    for (let i = 0; i < this.versuche; i++) {
      try {
        const res = await fetch(this.url + PRAEFIX + methode, { method: "POST", headers: this.kopf, body: JSON.stringify(args), signal: AbortSignal.timeout(this.timeoutMs) });
        if (res.ok) return (await res.json().catch(() => ({}))).message ?? null;
        letzter = new Error(`Frappe ${methode}: HTTP ${res.status}`);
        if (res.status !== 429 && res.status < 500) throw Object.assign(letzter, { endgueltig: true });
      } catch (e) {
        if (e.endgueltig) throw e;
        letzter = e;
      }
      const warte = Math.min(30000, 500 * 2 ** i) + Math.random() * 250;
      this.log?.warn("Frappe-Aufruf wird wiederholt", { methode, versuch: i + 1, fehler: letzter?.message });
      await new Promise((r) => setTimeout(r, warte));
    }
    throw letzter;
  }

  /** [{ benutzer, passwortHash, anlageId, geraetId, gesperrt }] */
  zugaenge = () => this.aufruf("dienst_zugaenge");
  /** [{ id, status, kwp, speicherKw, regionId, geraete (Anzahl verbundener) }] */
  anlagen = () => this.aufruf("dienst_anlagen");
  /** Störungsbefund melden → { id, neu } */
  stoerung = (b) => this.aufruf("dienst_stoerung", { befund: b });
  /** Erste/letzte Nachricht eines Geräts (Assistent „Warte auf erste Nachricht“ → verbunden) */
  verbindung = (geraetId, letzteNachricht) => this.aufruf("dienst_verbindung", { geraetId, letzteNachricht });
}
