// MQTT-Ingest: abonnieren → Topic/ACL prüfen → validieren → plausibilisieren → TimescaleDB → Live-Ereignis (SSE)
// → Störungsregeln → Frappe. Periodisch: Offline- und Minderleistungsregel, Zugänge und Anlagen-Stammdaten aktualisieren.

import mqtt from "mqtt";
import { EventEmitter } from "node:events";
import { heartbeatPruefen, messwertPruefen, statusPruefen, topicLesen } from "./schema.js";
import { plausibilisieren } from "./plausibel.js";
import { befund, fehlercodePruefen, minderleistungPruefen, offlinePruefen } from "./regeln.js";

export class Ingest extends EventEmitter {
  constructor({ konfig, db, frappe, zugaenge, log }) {
    super();
    this.setMaxListeners(10000);
    this.k = konfig;
    this.db = db;
    this.frappe = frappe;
    this.zugaenge = zugaenge;
    this.log = log;
    this.stand = new Map(); // `${anlage}|${geraet}` → letzter Messwert (Plausibilisierung)
    this.anlagen = new Map(); // anlageId → Stammdaten aus Frappe
    this.gemeldet = new Map(); // schluessel → Zeitpunkt (Doppelmeldungen vermeiden)
    this.verbindungGemeldet = new Map(); // geraetId → Zeitpunkt
    this.zaehler = { empfangen: 0, gespeichert: 0, verworfen: 0 };
  }

  starten() {
    const m = this.k.mqtt;
    this.client = mqtt.connect(m.url, {
      clientId: m.clientId,
      username: m.benutzer,
      password: m.passwort,
      ca: m.ca,
      rejectUnauthorized: true, // nie abschalten
      clean: false, // persistente Sitzung: QoS-1-Nachrichten gehen bei kurzer Unterbrechung nicht verloren
      reconnectPeriod: 5000,
      connectTimeout: 15000,
      protocolVersion: 5,
    });
    this.client.on("connect", () => {
      this.log.info("MQTT verbunden");
      this.client.subscribe(`${m.praefix}/+/+/+`, { qos: 1 }, (e) => e && this.log.error("Abonnieren fehlgeschlagen", { fehler: e.message }));
    });
    this.client.on("reconnect", () => this.log.warn("MQTT: neuer Verbindungsversuch"));
    this.client.on("error", (e) => this.log.error("MQTT-Fehler", { fehler: e.message }));
    this.client.on("message", (topic, payload) => this.nachricht(topic, payload).catch((e) => this.log.error("Nachricht nicht verarbeitet", { topic, fehler: e.message })));
  }

  async stoppen() {
    await new Promise((r) => (this.client ? this.client.end(false, {}, r) : r()));
  }

  async stammdatenAktualisieren() {
    const liste = await this.frappe.anlagen();
    this.anlagen = new Map((liste || []).map((a) => [a.id, a]));
    return this.anlagen.size;
  }

  async nachricht(topic, payload) {
    this.zaehler.empfangen++;
    const t = topicLesen(topic);
    if (!t) return this.verwerfen("topic", topic);
    // zweite Verteidigungslinie zur Broker-ACL: gehört das Gerät zur Anlage im Topic?
    const zugang = this.zugaenge.nachGeraet.get(t.geraetId);
    if (!zugang || zugang.anlageId !== t.anlageId || zugang.gesperrt) return this.verwerfen("zugang", topic);
    this.verbindungMelden(t.geraetId);

    if (t.kanal === "heartbeat") {
      if (heartbeatPruefen(payload)) await this.db.lebenszeichen(t);
      return;
    }
    if (t.kanal === "status") {
      const s = statusPruefen(payload);
      if (s) await this.db.lebenszeichen({ ...t, status: s });
      if (s === "offline") this.emit(`status:${t.anlageId}`, { geraetId: t.geraetId, status: s });
      return;
    }
    const p = messwertPruefen(payload);
    if (!p.ok) return this.verwerfen(p.fehler, topic);
    const schluessel = `${t.anlageId}|${t.geraetId}`;
    const vorher = this.stand.get(schluessel) || (await this.db.stand(t.anlageId, t.geraetId));
    const pl = plausibilisieren(p.wert, vorher, this.anlagen.get(t.anlageId) || {}, { sprungFaktor: this.k.regeln.sprungFaktor });
    await this.db.messwertSpeichern({ ...t, wert: pl.wert, plausibel: pl.plausibel, flags: [...pl.flags, ...p.hinweise] });
    this.zaehler.gespeichert++;
    if (!pl.flags.includes("nachlieferung")) this.stand.set(schluessel, { ...(vorher || {}), ...pl.wert });
    this.emit(`messwert:${t.anlageId}`, t.geraetId);
    for (const b of pl.befunde) await this.melden(befund(b.regel, t.anlageId, t.geraetId, b.text, `${p.wert.ts.slice(0, 10)}|${t.geraetId}`));
    const fc = fehlercodePruefen(t.anlageId, t.geraetId, p.wert);
    if (fc) await this.melden(fc);
  }

  verwerfen(grund, topic) {
    this.zaehler.verworfen++;
    this.log.debug("Nachricht verworfen", { grund, topic: String(topic).slice(0, 120) });
  }

  verbindungMelden(geraetId) {
    const zuletzt = this.verbindungGemeldet.get(geraetId) || 0;
    if (Date.now() - zuletzt < 5 * 60e3) return;
    this.verbindungGemeldet.set(geraetId, Date.now());
    this.frappe.verbindung(geraetId, new Date().toISOString()).catch((e) => this.log.warn("Verbindung nicht gemeldet", { geraetId, fehler: e.message }));
  }

  async melden(b) {
    const zuletzt = this.gemeldet.get(b.schluessel);
    if (zuletzt && Date.now() - zuletzt < 60 * 60e3) return;
    this.gemeldet.set(b.schluessel, Date.now());
    if (this.gemeldet.size > 20000) this.gemeldet.clear();
    try {
      const r = await this.frappe.stoerung(b);
      this.log.info("Störung gemeldet", { anlageId: b.anlageId, regel: b.regel, neu: !!r?.neu });
    } catch (e) {
      this.gemeldet.delete(b.schluessel); // beim nächsten Durchlauf erneut versuchen
      this.log.error("Störung nicht gemeldet", { anlageId: b.anlageId, regel: b.regel, fehler: e.message });
    }
  }

  /** Zeitgesteuerte Regeln (offline, Minderleistung) */
  async regelnPruefen() {
    const r = this.k.regeln;
    const anlagen = [...this.anlagen.values()];
    const letzte = await this.db.letzteJeAnlage();
    for (const b of offlinePruefen(anlagen, letzte, { offlineMinuten: r.offlineMinuten })) await this.melden(b);
    const pv = await this.db.aktuellePv();
    const werte = pv.map((w) => ({ ...w, kwp: this.anlagen.get(w.anlageId)?.kwp || 0, regionId: this.anlagen.get(w.anlageId)?.regionId || "?" }));
    for (const b of minderleistungPruefen(werte, { quote: r.minderleistungQuote, sonneMinAnteil: r.sonneMinAnteil })) await this.melden(b);
  }
}
