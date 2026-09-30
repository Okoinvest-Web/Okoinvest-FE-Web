// src/lib/plattform/compliance/datenschutz.js
//
// Betroffenenanfragen nach DSGVO (Art. 15–21) als Workflow – reine Funktionen (ohne Node-/React-Importe).
// Python-Gegenstück: Backend-Import/oekoinvest_app/oekoinvest_app/plattform/compliance_kern.py
//
// Frist (Art. 12 Abs. 3 DSGVO): unverzüglich, spätestens innerhalb EINES Monats nach Eingang; Verlängerung um weitere
// zwei Monate bei Komplexität/Anzahl – die betroffene Person ist innerhalb des ersten Monats mit Gründen zu informieren.
// Monatsfrist nach Art. 3 Abs. 2 lit. c VO (EWG, Euratom) Nr. 1182/71: gleicher Tag im Folgemonat, fehlt dieser → Monatsletzter.
// Ablehnung (Art. 12 Abs. 5 DSGVO: offenkundig unbegründet/exzessiv) nur mit Begründung und Hinweis auf das Beschwerderecht
// (Aufsichtsbehörde: AT Datenschutzbehörde, DE zuständige Landesbehörde, CH EDÖB) und den gerichtlichen Rechtsbehelf.
// Schweiz: revDSG Art. 25 (Auskunft grundsätzlich innert 30 Tagen, Art. 18 DSV) – kürzere Frist, daher 30 Tage bei Land CH.

export const DS_ARTEN = {
  auskunft: { label: "Auskunft", norm: "Art. 15 DSGVO", export: true, text: "Bestätigung, ob Daten verarbeitet werden, Kopie der Daten und Informationen nach Art. 15 Abs. 1 lit. a–h." },
  berichtigung: { label: "Berichtigung", norm: "Art. 16 DSGVO", text: "Unrichtige Daten berichtigen, unvollständige vervollständigen." },
  loeschung: { label: "Löschung", norm: "Art. 17 DSGVO", text: "Löschen, soweit keine Aufbewahrungspflicht (Art. 17 Abs. 3 lit. b) entgegensteht – sonst Sperre bis Fristablauf." },
  einschraenkung: { label: "Einschränkung", norm: "Art. 18 DSGVO", text: "Verarbeitung einschränken (Sperrvermerk), z. B. während einer Richtigkeitsprüfung." },
  uebertragbarkeit: { label: "Datenübertragbarkeit", norm: "Art. 20 DSGVO", export: true, text: "Bereitgestellte Daten in strukturiertem, maschinenlesbarem Format (JSON)." },
  widerspruch: { label: "Widerspruch", norm: "Art. 21 DSGVO", text: "Widerspruch gegen Verarbeitung auf Grundlage berechtigter Interessen; Direktwerbung: sofort Sperrliste (Art. 21 Abs. 3)." },
};
export const DS_ART_IDS = Object.keys(DS_ARTEN);

export const DS_STATUS = {
  eingegangen: { label: "Eingegangen", ton: "warn" },
  identitaet: { label: "Identität wird geprüft", ton: "warn" },
  in_bearbeitung: { label: "In Bearbeitung", ton: "info" },
  verlaengert: { label: "Frist verlängert", ton: "warn" },
  erledigt: { label: "Erledigt", ton: "ok" },
  abgelehnt: { label: "Abgelehnt", ton: "neutral" },
};

/** Zustandsautomat: aktion → { von[], nach, pflicht[] } */
export const DS_UEBERGAENGE = {
  identitaet_anfordern: { von: ["eingegangen"], nach: "identitaet", pflicht: ["notiz"] },
  identitaet_bestaetigen: { von: ["eingegangen", "identitaet"], nach: "in_bearbeitung", pflicht: ["notiz"] },
  verlaengern: { von: ["in_bearbeitung"], nach: "verlaengert", pflicht: ["begruendung"] },
  erledigen: { von: ["in_bearbeitung", "verlaengert"], nach: "erledigt", pflicht: ["ergebnis"] },
  ablehnen: { von: ["eingegangen", "identitaet", "in_bearbeitung", "verlaengert"], nach: "abgelehnt", pflicht: ["begruendung"] },
};
export const DS_OFFEN = ["eingegangen", "identitaet", "in_bearbeitung", "verlaengert"];

const TAG = /^(\d{4})-(\d{2})-(\d{2})$/;

/** Datum + n Monate nach VO 1182/71 (gleicher Tag, sonst Monatsletzter) */
export function plusMonate(iso, n) {
  const m = TAG.exec(String(iso));
  if (!m) throw new Error(`Ungültiges Datum: ${iso}`);
  const j = +m[1];
  const mo = +m[2] - 1 + Number(n);
  const letzter = new Date(Date.UTC(j, mo + 1, 0)).getUTCDate();
  return new Date(Date.UTC(j, mo, Math.min(+m[3], letzter))).toISOString().slice(0, 10);
}
const plusTage = (iso, n) => {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
};
const tage = (a, b) => Math.round((new Date(`${b}T00:00:00Z`) - new Date(`${a}T00:00:00Z`)) / 86400000);

/** Frist einer Anfrage (Ende) – CH 30 Tage, sonst 1 Monat; verlängert + 2 Monate (nur EU) */
export function dsFrist(eingangAm, { land = "AT", verlaengert = false } = {}) {
  if (land === "CH") return plusTage(eingangAm, verlaengert ? 90 : 30);
  return plusMonate(eingangAm, verlaengert ? 3 : 1);
}

/** Fristampel: { frist, restTage, ampel: gruen|gelb|rot|erledigt } */
export function dsFristStatus(a, heute) {
  const frist = dsFrist(a.eingangAm, { land: a.land, verlaengert: a.status === "verlaengert" || !!a.verlaengertAm });
  if (!DS_OFFEN.includes(a.status)) return { frist, restTage: null, ampel: "erledigt" };
  const rest = tage(heute, frist);
  return { frist, restTage: rest, ampel: rest < 0 ? "rot" : rest <= 7 ? "gelb" : "gruen", ueberfaellig: rest < 0 };
}

/**
 * Übergang prüfen: { ok, nach, fehler } – Verlängerung nur innerhalb der ersten Frist und nur einmal.
 */
export function dsUebergang(a, aktion, daten = {}, heute) {
  const u = DS_UEBERGAENGE[aktion];
  if (!u) return { ok: false, fehler: "Unbekannte Aktion." };
  if (!u.von.includes(a.status)) return { ok: false, fehler: `Aktion nicht möglich im Status „${DS_STATUS[a.status]?.label || a.status}“.` };
  for (const p of u.pflicht) if (String(daten[p] || "").trim().length < 10) return { ok: false, fehler: `Bitte ${p === "notiz" ? "eine Notiz zur Identitätsprüfung" : p === "begruendung" ? "eine Begründung" : "das Ergebnis"} angeben (mind. 10 Zeichen).` };
  if (aktion === "verlaengern") {
    if (a.land === "CH") return { ok: false, fehler: "Für Anfragen nach Schweizer Recht ist keine pauschale Verlängerung vorgesehen – Verzögerung begründet mitteilen." };
    if (a.verlaengertAm) return { ok: false, fehler: "Die Frist wurde bereits verlängert." };
    if (heute > dsFrist(a.eingangAm, { land: a.land })) return { ok: false, fehler: "Eine Verlängerung ist nur innerhalb der ersten Monatsfrist möglich (Art. 12 Abs. 3 DSGVO)." };
  }
  if (aktion === "erledigen" && a.art === "loeschung" && !["geloescht", "gesperrt", "keine_daten"].includes(daten.loeschErgebnis)) return { ok: false, fehler: "Bitte das Löschergebnis wählen (gelöscht/anonymisiert, gesperrt wegen Aufbewahrungspflicht, keine Daten)." };
  if (aktion === "erledigen" && DS_ARTEN[a.art]?.export && !a.exportAm) return { ok: false, fehler: "Bitte zuerst den Datenexport erstellen und prüfen (Auskunft/Übertragbarkeit)." };
  return { ok: true, nach: u.nach };
}

/** Standardtexte für die Antwort an die betroffene Person (Entwurf, vor Versand prüfen) */
export function dsAntwortEntwurf(a, { frist } = {}) {
  const art = DS_ARTEN[a.art];
  const beschwerde = a.land === "CH" ? "Eidgenössischen Datenschutz- und Öffentlichkeitsbeauftragten (EDÖB)" : a.land === "DE" ? "zuständigen Datenschutz-Aufsichtsbehörde" : "Österreichischen Datenschutzbehörde";
  if (a.status === "verlaengert") return `Ihre Anfrage (${art.label}, ${art.norm}) vom ${a.eingangAm.split("-").reverse().join(".")} erfordert wegen ihrer Komplexität mehr Zeit. Wir beantworten sie bis spätestens ${String(frist).split("-").reverse().join(".")}. Grund: ${a.verlaengerungsgrund || "…"}`;
  if (a.status === "abgelehnt") return `Wir können Ihrer Anfrage (${art.label}) nicht entsprechen. Begründung: ${a.begruendung || "…"} Sie haben das Recht, Beschwerde bei der ${beschwerde} einzulegen und einen gerichtlichen Rechtsbehelf einzulegen.`;
  return `Wir bestätigen den Eingang Ihrer Anfrage (${art.label}, ${art.norm}) vom ${a.eingangAm.split("-").reverse().join(".")} und beantworten sie bis spätestens ${String(frist).split("-").reverse().join(".")}.`;
}
