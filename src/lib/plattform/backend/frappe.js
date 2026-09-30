// src/lib/plattform/backend/frappe.js
//
// Frappe-Backend: spricht die Frappe-App `oekoinvest_app` über whitelisted Methoden an.
// Vertrag (Methoden, Felder, Rechte, Fehler): docs/API.md.
//
//  - Server-zu-Server mit API-Key/Secret (SERVER, API_KEY, API_SECRET wie src/lib/apiBaseUrl.js).
//    Der API-Nutzer hat in Frappe nur die Rolle „ÖkoInvest API“.
//  - Aktionen im Namen des eingeloggten Nutzers: jedes Argument-Objekt enthält `als_benutzer`
//    (Konto-ID `nutzer.id`, z. B. U-26-7KQ2XM). Die Frappe-App löst daraus den Frappe-User auf,
//    wechselt per frappe.set_user() in den Nutzer und prüft Rolle UND Eigentum selbst –
//    die Next.js-Seite ist nur die erste Verteidigungslinie.
//  - Argumente und Antworten in camelCase-JSON, identisch zum Demo-Backend.
//  - Liefert eine Methode `None` (z. B. anmelden mit falschen Daten), fehlt `message` in der
//    Frappe-Antwort – der Adapter gibt dann `null` zurück (wie das Demo-Backend).

import { API_BASE_URL, getApiHeaders, isApiConfigured } from "@/lib/apiBaseUrl";
import { PlattformFehler } from "../fehler";

export const name = "frappe";

const PRAEFIX = "oekoinvest_app.plattform.api.";
const TIMEOUT_MS = 15000;

/** Methodenname je Operation – muss mit docs/API.md übereinstimmen */
export const METHODEN = {
  anmelden: "auth.anmelden",
  nutzerFuerSitzung: "auth.nutzer_fuer_sitzung",
  registrieren: "auth.registrieren",
  emailBestaetigen: "auth.email_bestaetigen",
  passwortVergessen: "auth.passwort_vergessen",
  passwortSetzen: "auth.passwort_setzen",
  passwortAendern: "konto.passwort_aendern",
  profilSpeichern: "konto.profil_speichern",
  suchprofilSpeichern: "konto.suchprofil_speichern",
  anfrageAnlegen: "anfrage.anlegen",
  vorgaenge: "vorgang.liste",
  vorgang: "vorgang.holen",
  flaechen: "flaeche.liste",
  flaeche: "flaeche.holen",
  flaecheAnlegen: "flaeche.anlegen",
  flaecheAendern: "flaeche.aendern",
  projekte: "projekt.liste",
  projekt: "projekt.holen",
  projektAnlegen: "projekt.anlegen",
  projektAendern: "projekt.aendern",
  provisionAkzeptieren: "projekt.provision_akzeptieren",
  boerse: "boerse.liste",
  boerseDetail: "boerse.detail",
  merken: "interesse.merken",
  ndaAnfragen: "interesse.nda_anfragen",
  interessen: "interesse.liste",
  statusWechsel: "prozess.status_wechsel",
  nachrichtenThreads: "nachricht.threads",
  nachrichten: "nachricht.liste",
  nachrichtSenden: "nachricht.senden",
  dokumente: "dokument.liste",
  dokumentLesen: "dokument.lesen",
  dokumentSpeichern: "dokument.speichern",
  dokumentLoeschen: "dokument.loeschen",
  zuweisen: "admin.zuweisen",
  nutzerListe: "admin.nutzer_liste",
  nutzerAendern: "admin.nutzer_aendern",
  provisionen: "admin.provisionen",
  aktivitaeten: "admin.aktivitaeten",
  adminKonten: "admin.admin_konten",
  adminUebersicht: "admin.uebersicht",
  protokollEintrag: "admin.protokoll_eintrag",
  benachrichtigungen: "benachrichtigung.liste",
  benachrichtigungenGelesen: "benachrichtigung.gelesen",
  mailEinstellungenSpeichern: "benachrichtigung.einstellungen_speichern",
  aufgaben: "aufgabe.liste",
  aufgabeAnlegen: "aufgabe.anlegen",
  aufgabeAendern: "aufgabe.aendern",
  exposeDaten: "boerse.expose",
  // Bedienung & Onboarding (Adapter-Teil: backend/frappe/bedienung.js)
  suchen: "bedienung.suchen",
  onboarding: "bedienung.onboarding",
  onboardingSpeichern: "bedienung.onboarding_speichern",
  // Fachprüfung Kommunen: Gemeinde-Sicht (Adapter-Teil: backend/frappe/kommune.js)
  kommuneUebersicht: "kommune.uebersicht",
};

function meldung(daten) {
  let text = "";
  try {
    const liste = JSON.parse(daten?._server_messages || "[]");
    text = JSON.parse(liste[0] || "{}").message || "";
  } catch {
    /* keine Servermeldung */
  }
  if (!text && typeof daten?.exception === "string") text = daten.exception.replace(/^[\w.]*(Error|Exception):\s*/, "");
  return text.replace(/<[^>]*>/g, "").replace(/\s+/g, " ").trim().slice(0, 240);
}

export async function aufruf(op, args = {}, nutzer = null) {
  if (!isApiConfigured() || !process.env.SERVER) {
    throw new PlattformFehler(503, "Das Plattform-Backend (Frappe) ist nicht konfiguriert.");
  }
  const url = `${API_BASE_URL}${PRAEFIX}${METHODEN[op]}`;
  let res;
  try {
    res = await fetch(url, {
      method: "POST",
      headers: getApiHeaders(),
      // als_organisation: aktive Organisation der Sitzung – Frappe prüft die Mitgliedschaft selbst (kern.nutzer)
      body: JSON.stringify({ ...args, ...(nutzer ? { als_benutzer: nutzer.id } : {}), ...(nutzer?.organisation?.id ? { als_organisation: nutzer.organisation.id } : {}) }),
      cache: "no-store",
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
  } catch (e) {
    console.error(`[plattform-frappe] ${op}: nicht erreichbar`, e?.message);
    throw new PlattformFehler(502, "Der Server ist vorübergehend nicht erreichbar.");
  }
  if (res.ok) {
    const j = await res.json().catch(() => ({}));
    return j.message ?? null;
  }
  const roh = await res.text().catch(() => "");
  let daten = {};
  try {
    daten = JSON.parse(roh);
  } catch {
    daten = {};
  }
  // Interna (Traceback) nur ins Server-Log – nie an den Browser
  console.error(`[plattform-frappe] ${op}: HTTP ${res.status} ${daten.exc_type || ""}`);
  const text = meldung(daten);
  const typ = String(daten.exc_type || "");
  if (res.status === 401 || /AuthenticationError/.test(typ)) throw new PlattformFehler(401, "Bitte melden Sie sich an.");
  if (res.status === 403 || /PermissionError/.test(typ)) throw new PlattformFehler(403, text || "Dafür fehlt Ihnen die Berechtigung.");
  if (res.status === 404 || /DoesNotExistError/.test(typ)) throw new PlattformFehler(404, text || "Nicht gefunden.");
  if (/KycErforderlich/.test(typ)) throw new PlattformFehler(409, text || "Bitte Verifizierung abschließen.", "kyc"); // KYC/KYB: Freigabe-Sperre (plattform/kyc_kern.py)
  if (/BonitaetErforderlich/.test(typ)) throw new PlattformFehler(409, text || "Vor LOI bzw. Gebot ist eine Bonitätsprüfung nötig.", "bonitaet"); // Dienste: Bonität vor LOI (plattform/dienste_kern.py)
  if (res.status === 409 || /DuplicateEntryError|TimestampMismatchError/.test(typ)) throw new PlattformFehler(409, text || "Konflikt – bitte neu laden.");
  if (res.status === 429 || /TooManyRequestsError/.test(typ)) throw new PlattformFehler(429, text || "Zu viele Anfragen – bitte warten Sie einen Moment.", "gesperrt");
  if (/ValidationError|MandatoryError|LinkValidationError/.test(typ) || res.status === 417) throw new PlattformFehler(422, text || "Eingabe ungültig.");
  throw new PlattformFehler(502, "Der Server ist vorübergehend nicht erreichbar.");
}

// ---------------------------------------------------------------- Konto
export const anmelden = ({ email, passwort, ip, userAgent, land }) => aufruf("anmelden", { email, passwort, ip, userAgent, land });
/** kontext { sitzungId } – Frappe prüft den Sitzungseintrag (Plattform Sitzung) */
export const nutzerFuerSitzung = (id, kontext = {}) => aufruf("nutzerFuerSitzung", { nutzerId: id, sitzungId: kontext.sitzungId || null });
export const registrieren = (daten) => aufruf("registrieren", daten);
export const emailBestaetigen = ({ token }) => aufruf("emailBestaetigen", { token });
export const passwortVergessen = ({ email, basisUrl, ip }) => aufruf("passwortVergessen", { email, basisUrl, ip });
export const passwortSetzen = ({ token, passwort, ip }) => aufruf("passwortSetzen", { token, passwort, ip });
export const passwortAendern = (n, { alt, neu }) => aufruf("passwortAendern", { alt, neu }, n);
export const profilSpeichern = (n, daten) => aufruf("profilSpeichern", { daten }, n);
export const suchprofilSpeichern = (n, profil) => aufruf("suchprofilSpeichern", { profil }, n);

// ---------------------------------------------------------------- Anfrage
export const anfrageAnlegen = ({ nutzer, ...daten }) => aufruf("anfrageAnlegen", daten, nutzer || null);

// ---------------------------------------------------------------- Vorgänge, Flächen, Projekte
export const vorgaenge = (n, filter = {}) => aufruf("vorgaenge", filter, n);
export const vorgang = (n, id) => aufruf("vorgang", { id }, n);
export const flaechen = (n, filter = {}) => aufruf("flaechen", filter, n);
export const flaeche = (n, id) => aufruf("flaeche", { id }, n);
export const flaecheAnlegen = (n, daten, { ip } = {}) => aufruf("flaecheAnlegen", { daten, ip }, n);
export const flaecheAendern = (n, id, daten) => aufruf("flaecheAendern", { id, daten }, n);
export const projekte = (n, filter = {}) => aufruf("projekte", filter, n);
export const projekt = (n, id) => aufruf("projekt", { id }, n);
export const projektAnlegen = (n, daten, { ip } = {}) => aufruf("projektAnlegen", { daten, ip }, n);
export const projektAendern = (n, id, daten) => aufruf("projektAendern", { id, daten }, n);
export const provisionAkzeptieren = (n, id, { ip } = {}) => aufruf("provisionAkzeptieren", { id, ip }, n);

// ---------------------------------------------------------------- Börse & Interessen
export const boerse = (n, filter = {}) => aufruf("boerse", filter, n);
export const boerseDetail = (n, schluessel, { zaehlen = false } = {}) => aufruf("boerseDetail", { schluessel, zaehlen }, n);
export const merken = (n, projektId, an = true) => aufruf("merken", { projektId, an }, n);
export const ndaAnfragen = (n, projektId, { akzeptiert, ip, userAgent } = {}) => aufruf("ndaAnfragen", { projektId, akzeptiert, ip, userAgent }, n);
export const interessen = (n, filter = {}) => aufruf("interessen", filter, n);
export const statusWechsel = (n, daten) => aufruf("statusWechsel", daten, n);

// ---------------------------------------------------------------- Nachrichten & Dokumente
export const nachrichtenThreads = (n, filter = {}) => aufruf("nachrichtenThreads", filter, n);
export const nachrichten = (n, bezugArt, bezugId, { markieren = true } = {}) => aufruf("nachrichten", { bezugArt, bezugId, markieren }, n);
export const nachrichtSenden = (n, daten) => aufruf("nachrichtSenden", daten, n);
export const dokumente = (n, filter = {}) => aufruf("dokumente", filter, n);
export async function dokumentLesen(n, id) {
  const r = await aufruf("dokumentLesen", { id }, n);
  return { meta: r.meta, daten: Buffer.from(r.inhaltBase64 || "", "base64") };
}
export const dokumentSpeichern = (n, { daten, ...meta }) => aufruf("dokumentSpeichern", { ...meta, inhaltBase64: Buffer.from(daten).toString("base64") }, n);
export const dokumentLoeschen = (n, id) => aufruf("dokumentLoeschen", { id }, n);

// ---------------------------------------------------------------- Admin
export const zuweisen = (n, daten) => aufruf("zuweisen", daten, n);
export const nutzerListe = (n, filter = {}) => aufruf("nutzerListe", filter, n);
export const nutzerAendern = (n, id, daten) => aufruf("nutzerAendern", { id, ...daten }, n);
export const provisionen = (n) => aufruf("provisionen", {}, n);
export const aktivitaeten = (n, filter = {}) => aufruf("aktivitaeten", filter, n);
export const adminKonten = (n) => aufruf("adminKonten", {}, n);
export const adminUebersicht = (n) => aufruf("adminUebersicht", {}, n);

export const protokollEintrag = (n, daten) => aufruf("protokollEintrag", daten, n);

// ---------------------------------------------------------------- Benachrichtigungen, Aufgaben, Exposé
export const benachrichtigungen = (n, filter = {}) => aufruf("benachrichtigungen", filter, n);
export const benachrichtigungenGelesen = (n, { ids, alle } = {}) => aufruf("benachrichtigungenGelesen", { ids, alle }, n);
export const mailEinstellungenSpeichern = (n, einstellungen) => aufruf("mailEinstellungenSpeichern", { einstellungen }, n);
export const aufgaben = (n, filter = {}) => aufruf("aufgaben", filter, n);
export const aufgabeAnlegen = (n, daten) => aufruf("aufgabeAnlegen", { daten }, n);
export const aufgabeAendern = (n, id, daten) => aufruf("aufgabeAendern", { id, daten }, n);
export const exposeDaten = (n, id, { ip } = {}) => aufruf("exposeDaten", { id, ip }, n);

/** Nur Demo: Links für Bestätigung/Passwort. In Frappe verschickt das Backend E-Mails. */
export const demoLinks = async () => [];
/** Nur Demo: Postausgang. In Frappe landen E-Mails in der Mail-Warteschlange (Email Queue) und werden versendet. */
export const postausgang = async () => [];

/** Für Themen-Adapter (backend/frappe/<thema>.js): Methodenaufruf mit derselben Fehlerbehandlung */
export { aufruf as frappeAufruf };

// Backoffice: CRM, Akquise, Automationen, Vorlagen, Berichte, Rechte, Hash-Kette (backend/frappe/backoffice.js)
export * from "./frappe/backoffice";
