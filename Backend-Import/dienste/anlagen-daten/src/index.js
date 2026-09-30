// Einstieg des Ingest-Dienstes „anlagen-daten“ (siehe README.md und docs/ANLAGEN-IOT.md).

import { konfigLaden } from "./config.js";
import { log } from "./log.js";
import { Datenbank } from "./db.js";
import { FrappeKlient } from "./frappe.js";
import { Zugaenge } from "./auth.js";
import { Ingest } from "./ingest.js";
import { apiServer, authServer } from "./http.js";

async function main() {
  const konfig = konfigLaden();
  const db = new Datenbank(konfig.db);
  await db.schemaAnlegen();
  log.info("Datenbankschema bereit");

  const frappe = new FrappeKlient({ ...konfig.frappe, log });
  const zugaenge = new Zugaenge({ laden: () => frappe.zugaenge(), dienstBenutzer: konfig.mqtt.benutzer, dienstPasswort: konfig.mqtt.passwort, log });
  await zugaenge.aktualisieren().then((n) => log.info("Gerätezugänge geladen", { anzahl: n })).catch((e) => log.error("Gerätezugänge nicht geladen", { fehler: e.message }));

  const ingest = new Ingest({ konfig, db, frappe, zugaenge, log });
  await ingest.stammdatenAktualisieren().catch((e) => log.error("Anlagen nicht geladen", { fehler: e.message }));

  const auth = authServer({ konfig, zugaenge, log }).listen(konfig.auth.port, konfig.auth.host, () => log.info("Auth-Hook bereit", { port: konfig.auth.port }));
  const api = apiServer({ konfig, db, ingest, log }).listen(konfig.http.port, konfig.http.host, () => log.info("Abfrage-API bereit", { port: konfig.http.port }));
  ingest.starten();

  const takte = [
    setInterval(() => zugaenge.aktualisieren().catch((e) => log.warn("Zugänge nicht aktualisiert", { fehler: e.message })), konfig.zugaengeAktualisierenS * 1000),
    setInterval(() => ingest.stammdatenAktualisieren().catch((e) => log.warn("Anlagen nicht aktualisiert", { fehler: e.message })), 5 * 60e3),
    setInterval(() => ingest.regelnPruefen().catch((e) => log.warn("Regelprüfung fehlgeschlagen", { fehler: e.message })), konfig.regeln.intervallS * 1000),
  ];

  const ende = async (signal) => {
    log.info("Beende", { signal });
    takte.forEach(clearInterval);
    api.close();
    auth.close();
    await ingest.stoppen().catch(() => {});
    await db.ende().catch(() => {});
    process.exit(0);
  };
  process.on("SIGTERM", ende);
  process.on("SIGINT", ende);
}

main().catch((e) => {
  log.error("Start fehlgeschlagen", { fehler: e.message });
  process.exit(1);
});
