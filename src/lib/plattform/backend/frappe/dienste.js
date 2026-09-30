// src/lib/plattform/backend/frappe/dienste.js
//
// Frappe-Adapter „Dienste: Identität, Register, Bonität, Gesellschaften“. Methoden in oekoinvest_app.plattform.api.dienste
// (Vertrag: docs/API.md, Abschnitt „Dienste“). Signaturen identisch zu backend/demo/dienste.js. Frappe prüft Rolle, Bereich
// und Eigentum selbst und spricht die Anbieter (Zefix, Auskunftei, Identitätsanbieter) mit Schlüsseln aus der
// site_config an. PDFs setzt die Website aus den gelieferten Daten (gleiches Layout wie im Demo-Betrieb).

import { METHODEN, frappeAufruf as aufruf } from "../frappe";
import { dokumentenpaket } from "../../dienste/gesellschaft/dokumente";
import { dokumentePdf } from "../../dienste/pdf";
import { REGISTER_LAENDER } from "../../dienste/register/basis";

Object.assign(METHODEN, {
  identStatus: "dienste.ident_status",
  identStarten: "dienste.ident_starten",
  identDemoAbschluss: "dienste.ident_demo_abschluss",
  mrzPruefen: "dienste.mrz_pruefen",
  registerSuche: "dienste.register_suche",
  registerAbruf: "dienste.register_abruf",
  registerAuskuenfte: "dienste.register_auskuenfte",
  registerAuskunft: "dienste.register_auskunft",
  bonitaetUebersicht: "dienste.bonitaet_uebersicht",
  bonitaetBeauftragen: "dienste.bonitaet_beauftragen",
  bonitaetDetail: "dienste.bonitaet_detail",
  bonitaetFreigeben: "dienste.bonitaet_freigeben",
  bonitaetEinstellungenSpeichern: "dienste.bonitaet_einstellungen_speichern",
  bonitaetStatus: "dienste.bonitaet_status",
  gesellschaftenListe: "dienste.gesellschaften_liste",
  gesellschaftAuswahl: "dienste.gesellschaft_auswahl",
  gesellschaftNamenPruefen: "dienste.gesellschaft_namen_pruefen",
  gesellschaftAnlegen: "dienste.gesellschaft_anlegen",
  gesellschaft: "dienste.gesellschaft_holen",
  gesellschaftAendern: "dienste.gesellschaft_aendern",
  gesellschaftSchritt: "dienste.gesellschaft_schritt",
  gesellschaftPaketdaten: "dienste.gesellschaft_paketdaten",
  gesellschaftErp: "dienste.gesellschaft_erp",
  gesellschaftFristen: "dienste.gesellschaft_fristen",
});

export const identStatus = (n) => aufruf("identStatus", {}, n);
export const identStarten = (n, { basisUrl = "" } = {}) => aufruf("identStarten", { basisUrl }, n);
export const identDemoAbschluss = (n, daten = {}) => aufruf("identDemoAbschluss", daten, n);
export const mrzPruefen = (n, { zeilen = "" } = {}) => aufruf("mrzPruefen", { zeilen }, n);

/**
 * Webhook: Frappe prüft die Signatur selbst (Methode dienste.webhook_identitaet, allow_guest mit HMAC + Rate-Limit).
 * Die Website leitet Roh-Body und Signatur-Kopfzeilen unverändert weiter (Anbieter können auch direkt an Frappe senden).
 */
export async function identWebhook({ anbieter, kopf, roh }) {
  const server = String(process.env.SERVER || "").replace(/\/$/, "");
  if (!server) return { status: 503, antwort: { ok: false } };
  const weiter = {};
  for (const h of ["x-hmac-signature", "x-auth-client", "x-payload-digest", "x-payload-digest-alg", "x-sha2-signature", "x-oekoinvest-signatur", "x-oekoinvest-zeit"]) {
    const w = kopf(h);
    if (w) weiter[h] = w;
  }
  try {
    const res = await fetch(`${server}/api/method/oekoinvest_app.plattform.api.dienste.webhook_identitaet?anbieter=${encodeURIComponent(anbieter)}`, {
      method: "POST", headers: { ...weiter, "Content-Type": "application/json" }, body: roh, signal: AbortSignal.timeout(15000), cache: "no-store",
    });
    return { status: res.status === 200 ? 200 : res.status === 401 || res.status === 403 ? 401 : res.status === 429 ? 429 : 502, antwort: { ok: res.status === 200 } };
  } catch {
    return { status: 502, antwort: { ok: false } };
  }
}

export const registerSuche = (n, daten = {}) => aufruf("registerSuche", daten, n);
export const registerAbruf = (n, daten = {}) => aufruf("registerAbruf", daten, n);
export const registerAuskuenfte = (n, daten = {}) => aufruf("registerAuskuenfte", daten, n);
export const registerAuskunft = (n, id) => aufruf("registerAuskunft", { id }, n);
export async function registerAuskunftPdf(n, id) {
  const a = await registerAuskunft(n, id);
  const f = a.firma || {};
  const r = REGISTER_LAENDER[a.land] || REGISTER_LAENDER.AT;
  const pdf = dokumentePdf([{
    id: "register", titel: `Registerauskunft ${r.register}`, untertitel: `${f.name || "Keine Firma gefunden"} · ${a.nummer} · abgerufen am ${String(a.abrufAm).slice(0, 16).replace("T", " ")} UTC über ${a.quelle}`,
    abschnitte: [
      { tabelle: { kopf: ["Angabe", "Wert"], zeilen: [["Firma", f.name || "–"], ["Registernummer", a.nummer], ["Gericht / Amt", f.gericht || r.behoerde], ["Rechtsform", f.rechtsform || "–"], ["Sitz", f.sitz || "–"], ["Status", f.status || "nicht gefunden"], ["Registerstand", f.stand || "–"]] } },
      ...(f.gegenstand ? [{ titel: "Gegenstand / Zweck", text: f.gegenstand }] : []),
      { text: "Diese Zusammenfassung ersetzt keinen amtlichen Registerauszug." },
    ],
  }], { titel: `Registerauskunft ${a.nummer}`, kennzeichen: "REGISTERAUSKUNFT", demo: a.quelle === "demo" });
  return { pdf, name: `registerauskunft-${a.id}.pdf` };
}

export const bonitaetUebersicht = (n, daten = {}) => aufruf("bonitaetUebersicht", daten, n);
export const bonitaetBeauftragen = (n, daten = {}) => aufruf("bonitaetBeauftragen", daten, n);
export const bonitaetDetail = (n, id, { ip = "" } = {}) => aufruf("bonitaetDetail", { id, ip }, n);
export const bonitaetFreigeben = (n, id, daten = {}) => aufruf("bonitaetFreigeben", { id, ...daten }, n);
export const bonitaetEinstellungenSpeichern = (n, daten = {}) => aufruf("bonitaetEinstellungenSpeichern", { daten }, n);
export const bonitaetStatus = (n, daten = {}) => aufruf("bonitaetStatus", daten, n);

export const gesellschaftenListe = (n, daten = {}) => aufruf("gesellschaftenListe", daten, n);
export const gesellschaftAuswahl = (n) => aufruf("gesellschaftAuswahl", {}, n);
export const gesellschaftNamenPruefen = (n, daten = {}) => aufruf("gesellschaftNamenPruefen", daten, n);
export const gesellschaftAnlegen = (n, daten = {}) => aufruf("gesellschaftAnlegen", { daten }, n);
export const gesellschaft = (n, id) => aufruf("gesellschaft", { id }, n);
export const gesellschaftAendern = (n, id, daten = {}) => aufruf("gesellschaftAendern", { id, daten }, n);
export const gesellschaftSchritt = (n, id, daten = {}) => aufruf("gesellschaftSchritt", { id, daten }, n);
export async function gesellschaftDokumente(n, id, { dok = "" } = {}) {
  const g = await aufruf("gesellschaftPaketdaten", { id, dok }, n);
  const alle = dokumentenpaket(g);
  const auswahl = dok ? alle.filter((d) => d.id === dok) : alle;
  const pdf = dokumentePdf(auswahl, { titel: `Gründungspaket ${g.name}`, kennzeichen: "GRÜNDUNGSPAKET · MUSTER", muster: true });
  return { pdf, name: `gruendungspaket-${g.id}${dok ? `-${dok}` : ""}.pdf` };
}
export const gesellschaftErp = (n, id) => aufruf("gesellschaftErp", { id }, n);
export const gesellschaftFristen = (n) => aufruf("gesellschaftFristen", {}, n);
