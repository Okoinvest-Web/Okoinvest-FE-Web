// Konfiguration ausschließlich aus Umgebungsvariablen (siehe .env.example). Keine Geheimnisse im Code.
// Fehlende Pflichtwerte → Start bricht mit klarer Meldung ab (ohne Werte auszugeben).

import { readFileSync } from "node:fs";

const env = process.env;
const zahl = (k, standard) => (env[k] === undefined || env[k] === "" ? standard : Number(env[k]));

function pflicht(k, { min = 1 } = {}) {
  const w = env[k];
  if (!w || w.length < min) throw new Error(`Konfiguration: ${k} fehlt oder ist zu kurz (mind. ${min} Zeichen).`);
  return w;
}

const datei = (k) => (env[k] ? readFileSync(env[k]) : undefined);

export function konfigLaden() {
  const k = {
    mqtt: {
      url: pflicht("MQTT_URL"), // mqtts://mosquitto:8883 – nur TLS
      benutzer: pflicht("DIENST_MQTT_BENUTZER"),
      passwort: pflicht("DIENST_MQTT_PASSWORT", { min: 24 }),
      ca: datei("MQTT_CA_DATEI"), // eigene CA; Zertifikatsprüfung ist IMMER an
      clientId: env.DIENST_MQTT_CLIENT_ID || "anlagen-daten-ingest",
      praefix: "oekoinvest/v1",
    },
    db: {
      url: pflicht("DATABASE_URL"),
      ca: datei("DATABASE_CA_DATEI"),
      maxVerbindungen: zahl("DATABASE_POOL", 10),
    },
    http: {
      host: env.HTTP_HOST || "0.0.0.0",
      port: zahl("HTTP_PORT", 8443),
      token: pflicht("DIENST_TOKEN", { min: 32 }), // Service-Token der Website (Bearer)
      tlsKey: datei("HTTP_TLS_KEY_DATEI"),
      tlsCert: datei("HTTP_TLS_CERT_DATEI"),
      maxLiveJeAnlage: zahl("LIVE_MAX_JE_ANLAGE", 50),
    },
    auth: {
      // Broker-Auth-Hook: eigener Port, nur im internen Docker-Netz erreichbar (nicht veröffentlichen!)
      host: env.AUTH_HOST || "0.0.0.0",
      port: zahl("AUTH_PORT", 8081),
      hookToken: env.AUTH_HOOK_TOKEN || "", // optional: EMQX sendet ihn als Kopfzeile X-Auth-Token
    },
    frappe: {
      url: pflicht("FRAPPE_URL").replace(/\/$/, ""),
      apiKey: pflicht("FRAPPE_API_KEY"),
      apiSecret: pflicht("FRAPPE_API_SECRET", { min: 10 }),
    },
    regeln: {
      offlineMinuten: zahl("REGEL_OFFLINE_MINUTEN", 15),
      minderleistungQuote: zahl("REGEL_MINDERLEISTUNG_QUOTE", 0.6),
      sonneMinAnteil: zahl("REGEL_SONNE_MIN_ANTEIL", 0.2),
      sprungFaktor: zahl("REGEL_SPRUNG_FAKTOR", 1.5),
      intervallS: zahl("REGEL_INTERVALL_S", 60),
    },
    zugaengeAktualisierenS: zahl("ZUGAENGE_AKTUALISIEREN_S", 60),
  };
  if (!/^mqtts:\/\//.test(k.mqtt.url)) throw new Error("Konfiguration: MQTT_URL muss mqtts:// (TLS) verwenden.");
  if (!/^https:\/\//.test(k.frappe.url) && env.NODE_ENV === "production") throw new Error("Konfiguration: FRAPPE_URL muss https:// verwenden.");
  return k;
}
