// Gerätezugänge und Broker-Auth-Hook.
//
// Frappe ist führend: Gerätezugang (MQTT-Benutzer, scrypt-Hash, Anlage, Gerät, gesperrt). Der Dienst holt die Liste
// alle ZUGAENGE_AKTUALISIEREN_S Sekunden über anlagen.dienst_zugaenge (nur Hashes, nie Passwörter) und hält sie im
// Speicher. Der Broker fragt bei jeder Verbindung (Benutzer/Passwort) und jedem Publish/Subscribe (ACL) hier nach.
//
// Hash-Format (identisch Website-Demo und Frappe): scrypt$N$r$p$<salt base64>$<hash base64>, 64 Byte, NFKC.
// Vergleich zeitkonstant; unbekannte Benutzer rechnen trotzdem (gleiche Antwortzeit).
//
// Endpunkte (nur internes Netz, eigener Port):
//   Mosquitto go-auth (HTTP-Backend, JSON):  POST /auth/user {username,password,clientid} · POST /auth/superuser {username}
//                                            POST /auth/acl {username,topic,clientid,acc} (acc 1 lesen, 2 schreiben, 4 abonnieren)
//                                            → 200 = erlaubt, 403 = verweigert
//   EMQX HTTP-Auth/-Authz:                   POST /auth/emqx {username,password,clientid} · POST /auth/emqx/acl {username,topic,action}
//                                            → 200 {"result":"allow"|"deny"}

import { scrypt, timingSafeEqual, randomBytes } from "node:crypto";
import { publishErlaubt, PRAEFIX } from "./schema.js";

function scryptAsync(passwort, salt, n, r, p) {
  return new Promise((ok, fehler) => scrypt(String(passwort).normalize("NFKC"), salt, 64, { N: n, r, p, maxmem: 64 * 1024 * 1024 }, (e, k) => (e ? fehler(e) : ok(k))));
}

const ATTRAPPE = `scrypt$16384$8$1$${randomBytes(16).toString("base64")}$${randomBytes(64).toString("base64")}`;

export async function passwortPruefen(passwort, gespeichert) {
  const teile = String(gespeichert || ATTRAPPE).split("$");
  if (teile.length !== 6 || teile[0] !== "scrypt") return false;
  const [, n, r, p, salt, hash] = teile;
  if (Number(n) > 1 << 20 || Number(r) > 32 || Number(p) > 16) return false; // keine teuren Fremdparameter
  const soll = Buffer.from(hash, "base64");
  const ist = await scryptAsync(passwort ?? "", Buffer.from(salt, "base64"), Number(n), Number(r), Number(p));
  const gleich = soll.length === ist.length && timingSafeEqual(soll, ist);
  return gleich && !!gespeichert;
}

/** Zugangs-Cache: benutzer → { benutzer, passwortHash, anlageId, geraetId, gesperrt } */
export class Zugaenge {
  constructor({ laden, dienstBenutzer, dienstPasswort, log }) {
    this.laden = laden; // async () => Liste aus Frappe
    this.karte = new Map();
    this.nachGeraet = new Map();
    this.dienstBenutzer = dienstBenutzer;
    this.dienstPasswort = dienstPasswort;
    this.log = log;
    this.stand = 0;
    this.letzterFehlversuch = 0;
  }

  async aktualisieren() {
    const liste = await this.laden();
    const neu = new Map();
    for (const z of liste || []) if (z?.benutzer && z?.passwortHash) neu.set(z.benutzer, z);
    this.karte = neu;
    this.nachGeraet = new Map([...neu.values()].map((z) => [z.geraetId, z]));
    this.stand = Date.now();
    return neu.size;
  }

  /** Unbekannter Benutzer → einmal (höchstens alle 10 s) nachladen: frisch angelegte Zugänge sofort nutzbar */
  async finden(benutzer) {
    let z = this.karte.get(benutzer);
    if (!z && Date.now() - this.letzterFehlversuch > 10e3) {
      this.letzterFehlversuch = Date.now();
      await this.aktualisieren().catch((e) => this.log?.warn("Zugänge nicht aktualisiert", { fehler: e.message }));
      z = this.karte.get(benutzer);
    }
    return z || null;
  }

  istDienst(benutzer) {
    return benutzer === this.dienstBenutzer;
  }

  async anmelden(benutzer, passwort) {
    if (this.istDienst(benutzer)) {
      const a = Buffer.from(String(passwort || ""));
      const b = Buffer.from(this.dienstPasswort);
      return a.length === b.length && timingSafeEqual(a, b);
    }
    const z = await this.finden(benutzer);
    const ok = await passwortPruefen(passwort, z?.passwortHash);
    return ok && !z.gesperrt;
  }

  /** ACL: Gerät darf NUR auf oekoinvest/v1/<eigene Anlage>/<eigenes Gerät>/… veröffentlichen, nichts abonnieren */
  async acl(benutzer, topic, aktion) {
    if (this.istDienst(benutzer)) return aktion !== "publish" && (topic === `${PRAEFIX}/#` || String(topic).startsWith(`${PRAEFIX}/`));
    if (aktion !== "publish") return false;
    const z = await this.finden(benutzer);
    return publishErlaubt(z, topic);
  }
}

/** HTTP-Handler für Broker-Hooks (req-Body bereits als JSON gelesen) */
export async function authAnfrage(zugaenge, pfad, body) {
  const benutzer = String(body?.username || "");
  if (pfad === "/auth/user") return (await zugaenge.anmelden(benutzer, body?.password)) ? 200 : 403;
  if (pfad === "/auth/superuser") return 403; // keine Superuser – auch der Dienst unterliegt der ACL
  if (pfad === "/auth/acl") {
    const acc = Number(body?.acc);
    const aktion = acc === 2 ? "publish" : acc === 4 ? "subscribe" : "read";
    return (await zugaenge.acl(benutzer, body?.topic, aktion)) ? 200 : 403;
  }
  if (pfad === "/auth/emqx") return { result: (await zugaenge.anmelden(benutzer, body?.password)) ? "allow" : "deny" };
  if (pfad === "/auth/emqx/acl") return { result: (await zugaenge.acl(benutzer, body?.topic, body?.action === "publish" ? "publish" : "subscribe")) ? "allow" : "deny" };
  return 404;
}
