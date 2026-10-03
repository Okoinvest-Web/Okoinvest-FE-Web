// src/lib/plattform/backend/frappe/leadkette.js
//
// Frappe-Adapter „Lead-Kette“ (Welle 2, Paket B3). Methoden in oekoinvest_app.plattform.api.einwilligung – Signaturen
// identisch zu backend/demo/leadkette.js. Frappe prüft Rolle UND Bereich selbst (rechte.py). Das Pseudonym berechnet
// Frappe mit dem Pepper aus site_config (lead_pseudonym_pepper) – derselbe Pepper wie in anfrage.py.

import { METHODEN, frappeAufruf as aufruf } from "../frappe";
import { PlattformFehler } from "../../fehler";
import { ZWECK_LABEL } from "@/lib/anfrage/protokoll";

Object.assign(METHODEN, {
  leadProtokollAnhaengen: "einwilligung.protokoll_anhaengen",
  leadWerbekanalErlaubt: "einwilligung.werbekanal_erlaubt",
  leadKanalStand: "einwilligung.kanal_stand",
  leadIpAufraeumen: "einwilligung.ip_aufraeumen",
  leadDesk: "einwilligung.lead_desk",
  leadKetteStatus: "einwilligung.kette_pruefen",
  leadWiderrufen: "einwilligung.widerrufen",
  leadAbsageSetzen: "einwilligung.absage_setzen",
  leadPersonLoeschen: "einwilligung.person_loeschen",
});

export const protokollAnhaengen = (eintrag = {}) => aufruf("leadProtokollAnhaengen", { eintrag });
export const werbekanalErlaubt = async ({ email, pseudonym, zweck } = {}) => (await aufruf("leadWerbekanalErlaubt", { email, pseudonym, zweck })) === true;
export async function werbekanalSicherstellen(args = {}) {
  if (await werbekanalErlaubt(args)) return true;
  throw new PlattformFehler(403, `Werbekontakt gesperrt: Es liegt keine gültige Einwilligung für „${ZWECK_LABEL[args.zweck] || "diesen Zweck"}“ vor.`, "einwilligung_fehlt");
}
export const kanalStand = ({ email, pseudonym } = {}) => aufruf("leadKanalStand", { email, pseudonym });
export const ipAufraeumen = () => aufruf("leadIpAufraeumen", {});
export const leadDesk = (n, filter = {}) => aufruf("leadDesk", filter, n);
export async function slaBericht(n, filter = {}) {
  const r = await leadDesk(n, filter);
  return { ok: true, zeitraum: r?.zeitraum, auswertung: r?.auswertung, slaKlassen: r?.slaKlassen };
}
export const leadKetteStatus = (n) => aufruf("leadKetteStatus", {}, n);
export const widerrufen = (n, daten = {}) => aufruf("leadWiderrufen", { daten }, n);
export const absageSetzen = (n, vorgangId, daten = {}) => aufruf("leadAbsageSetzen", { vorgang_id: vorgangId, daten }, n);
export const personLoeschen = (n, daten = {}) => aufruf("leadPersonLoeschen", { daten }, n);
