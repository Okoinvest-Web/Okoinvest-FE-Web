// src/lib/plattform/tickets/index.js
//
// Service & Support – Ticketarten, Prioritäten mit SLA, Status, SLA-Berechnung (reine Funktionen).
// Eigene, schlanke Ticket-Logik der Plattform; optional gespiegelt nach Frappe Helpdesk („HD Ticket“),
// wenn die App installiert und der Schalter `oekoinvest_helpdesk` in site_config gesetzt ist
// (Frappe: plattform/service/helpdesk.py). Frappe spiegelt die Regeln in plattform/service/sla.py.

export const TICKET_KATEGORIEN = {
  stoerung: { label: "Störung an einer Anlage", text: "Anlage liefert keine Daten, Ertrag zu niedrig, Fehlermeldung am Wechselrichter oder Speicher." },
  abrechnung: { label: "Abrechnung & Zähler", text: "Rechnung, Zählerstände, Strompreis, Abschläge." },
  vertrag: { label: "Vertrag & Pacht", text: "Pacht- oder Contracting-Vertrag, Laufzeit, Kündigung, Nachträge." },
  portal: { label: "Portal & Zugang", text: "Anmeldung, Zwei-Faktor, Organisation, Dokumente im Portal." },
  projekt: { label: "Projekt & Börse", text: "Fragen zu Projekten, NDA, Datenraum, Exposé." },
  sonstiges: { label: "Sonstiges", text: "Alles andere." },
};
export const TICKET_KATEGORIE_IDS = Object.keys(TICKET_KATEGORIEN);

/** Prioritäten mit SLA (Stunden, Kalenderzeit): erste Reaktion und Lösung */
export const TICKET_PRIORITAETEN = {
  niedrig: { label: "Niedrig", reaktionH: 48, loesungH: 240, stufe: 0, helpdesk: "Low" },
  normal: { label: "Normal", reaktionH: 24, loesungH: 120, stufe: 1, helpdesk: "Medium" },
  hoch: { label: "Hoch", reaktionH: 8, loesungH: 48, stufe: 2, helpdesk: "High" },
  kritisch: { label: "Kritisch", reaktionH: 2, loesungH: 24, stufe: 3, helpdesk: "Urgent" },
};
export const TICKET_PRIORITAET_IDS = Object.keys(TICKET_PRIORITAETEN);

export const TICKET_STATUS = {
  neu: { label: "Neu", ton: "info", helpdesk: "Open" },
  in_arbeit: { label: "In Bearbeitung", ton: "info", helpdesk: "Open" },
  wartet_kunde: { label: "Wartet auf Ihre Antwort", ton: "warn", helpdesk: "Replied" },
  geloest: { label: "Gelöst", ton: "ok", helpdesk: "Resolved" },
  geschlossen: { label: "Geschlossen", ton: "neutral", helpdesk: "Closed" },
};
export const TICKET_OFFEN = ["neu", "in_arbeit", "wartet_kunde"];

/** Helpdesk-Status → Plattform-Status (Rückweg der Spiegelung) */
export const STATUS_AUS_HELPDESK = { Open: "in_arbeit", Replied: "wartet_kunde", Paused: "wartet_kunde", Resolved: "geloest", Closed: "geschlossen" };

/** Störungsschwere (Anlagen-Modul) → Ticket-Priorität */
export const PRIORITAET_AUS_SCHWERE = { info: "niedrig", niedrig: "niedrig", mittel: "normal", hoch: "hoch", kritisch: "kritisch" };

export const TICKET_GRENZEN = { betreff: 160, text: 5000, anhaenge: 5, anhangBytes: 10 * 1024 * 1024 };

/** SLA-Fristen beim Anlegen (ISO) */
export function slaFristen(prioritaet, erstelltAm = new Date().toISOString()) {
  const p = TICKET_PRIORITAETEN[prioritaet] || TICKET_PRIORITAETEN.normal;
  const t = new Date(erstelltAm).getTime();
  return { reaktionBis: new Date(t + p.reaktionH * 3600e3).toISOString(), loesungBis: new Date(t + p.loesungH * 3600e3).toISOString() };
}

/**
 * SLA-Stand eines Tickets: je Frist { bis, erfuellt, verletzt, restMin } und Ampel ok | warn | verletzt | erledigt.
 * Warnung ab 25 % Restzeit. „Wartet auf Kunde“ hält die Lösungsfrist NICHT an (bewusst einfach, dokumentiert).
 */
export function slaStand(t, jetzt = Date.now()) {
  const pruef = (bis, erfuelltAm, gesamtH) => {
    const b = new Date(bis).getTime();
    if (!Number.isFinite(b)) return null;
    if (erfuelltAm) {
      const e = new Date(erfuelltAm).getTime();
      return { bis, erfuellt: true, verletzt: e > b, restMin: 0 };
    }
    const rest = Math.round((b - jetzt) / 60e3);
    return { bis, erfuellt: false, verletzt: rest < 0, restMin: rest, knapp: rest >= 0 && rest < gesamtH * 60 * 0.25 };
  };
  const p = TICKET_PRIORITAETEN[t.prioritaet] || TICKET_PRIORITAETEN.normal;
  const reaktion = pruef(t.slaReaktionBis, t.ersteReaktionAm, p.reaktionH);
  const loesung = pruef(t.slaLoesungBis, t.geloestAm, p.loesungH);
  const offen = TICKET_OFFEN.includes(t.status);
  let ampel = "ok";
  if (!offen) ampel = reaktion?.verletzt || loesung?.verletzt ? "verletzt" : "erledigt";
  else if (reaktion?.verletzt || loesung?.verletzt) ampel = "verletzt";
  else if (reaktion?.knapp || loesung?.knapp) ampel = "warn";
  return { reaktion, loesung, ampel };
}

export const ticketStatusLabel = (s) => TICKET_STATUS[s]?.label || s;
export const ticketKategorieLabel = (k) => TICKET_KATEGORIEN[k]?.label || k;
export const ticketPrioritaetLabel = (p) => TICKET_PRIORITAETEN[p]?.label || p;

/** Restzeit lesbar: „noch 3 Std.“, „seit 20 Min. überschritten“ */
export function restText(min) {
  if (min === null || min === undefined) return "–";
  const a = Math.abs(min);
  const t = a < 60 ? `${a} Min.` : a < 48 * 60 ? `${Math.round(a / 60)} Std.` : `${Math.round(a / 1440)} Tg.`;
  return min < 0 ? `seit ${t} überschritten` : `noch ${t}`;
}
