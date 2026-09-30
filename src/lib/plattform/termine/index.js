// src/lib/plattform/termine/index.js
//
// Termine & Kalender – Terminarten, Slot-Berechnung, Zeitzonen-Umrechnung (Europe/Vienna) und ICS (RFC 5545).
// Reine Funktionen ohne Node-Importe: Client, Server, Demo-Backend und Tests nutzen dieselbe Logik.
// Frappe spiegelt die Regeln in plattform/termine/slots.py und plattform/termine/ics.py.
//
// Regeln der Slot-Berechnung (je Mitarbeiter):
//   - Arbeitszeiten je Wochentag (1 = Montag … 7 = Sonntag) als Zeitfenster ["09:00","12:00"]
//   - Feiertage (Holiday List aus HRMS bzw. Demo-Liste) und Abwesenheiten (Leave Application) sperren ganze Tage
//   - belegte Termine + Puffer (Anfahrt/Nachbereitung) sperren Zeiträume; keine Überschneidung (Doppelbuchung)
//   - Vorlauf: frühester Beginn (Stunden ab jetzt), Raster (Minuten), Horizont (Tage)

export const TZ = "Europe/Vienna";

export const TERMIN_ARTEN = {
  besichtigung: {
    label: "Flächenbesichtigung", kurz: "Besichtigung", dauer: 90, puffer: 60, kanal: "vor_ort", oeffentlich: true, vorlaufStunden: 48,
    text: "Gemeinsamer Termin auf Ihrer Fläche: Lage, Zufahrt, Netzanschluss-Möglichkeiten und nächste Schritte.",
  },
  beratung_telefon: {
    label: "Beratung am Telefon", kurz: "Telefon", dauer: 30, puffer: 10, kanal: "telefon", oeffentlich: true, vorlaufStunden: 4,
    text: "Kurzes Gespräch zu Ihrer Frage – wir rufen Sie zum gebuchten Zeitpunkt an.",
  },
  beratung_video: {
    label: "Beratung per Video", kurz: "Video", dauer: 45, puffer: 15, kanal: "video", oeffentlich: true, vorlaufStunden: 4,
    text: "Videogespräch mit Bildschirmfreigabe, z. B. für Flächencheck-Ergebnis, Pachtmodell oder Projektbewertung.",
  },
  gemeinde: {
    label: "Gemeindetermin", kurz: "Gemeinde", dauer: 60, puffer: 30, kanal: "vor_ort", oeffentlich: true, vorlaufStunden: 72,
    text: "Termin mit Bürgermeisterin, Bürgermeister oder Bauamt – Vorstellung, Beteiligungsmodelle, Bauleitplanung.",
  },
  datenraum: {
    label: "Datenraum-Session", kurz: "Datenraum", dauer: 60, puffer: 15, kanal: "video", oeffentlich: false, rollen: ["investor"], vorlaufStunden: 24,
    text: "Geführte Durchsicht des Datenraums mit Fragen an das Transaktionsteam (nach NDA-Freigabe).",
  },
};
export const TERMIN_ART_IDS = Object.keys(TERMIN_ARTEN);

export const KANAELE = { vor_ort: "Vor Ort", telefon: "Telefon", video: "Video" };

export const TERMIN_STATUS = {
  gebucht: { label: "Gebucht", ton: "info" },
  bestaetigt: { label: "Bestätigt", ton: "ok" },
  storniert: { label: "Storniert", ton: "neutral" },
  erledigt: { label: "Stattgefunden", ton: "ok" },
  nicht_erschienen: { label: "Nicht erschienen", ton: "warn" },
};
export const TERMIN_AKTIV = ["gebucht", "bestaetigt"];

export const WOCHENTAGE = ["", "Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"];

/** Standard-Arbeitszeiten (Mo–Fr 9–12 und 13–17 Uhr) */
export const ARBEITSZEITEN_STANDARD = {
  1: [["09:00", "12:00"], ["13:00", "17:00"]],
  2: [["09:00", "12:00"], ["13:00", "17:00"]],
  3: [["09:00", "12:00"], ["13:00", "17:00"]],
  4: [["09:00", "12:00"], ["13:00", "17:00"]],
  5: [["09:00", "12:00"], ["13:00", "15:00"]],
};

export const TERMIN_GRENZEN = { horizontTage: 42, raster: 30, maxSlots: 400, erinnerungStunden: 24 };

const ZEIT = /^([01]\d|2[0-3]):([0-5]\d)$/;
const TAG = /^\d{4}-\d{2}-\d{2}$/;
export const zeitGueltig = (z) => ZEIT.test(String(z || ""));
export const tagGueltig = (t) => TAG.test(String(t || "")) && !Number.isNaN(new Date(`${t}T12:00:00Z`).getTime());

// ---------------------------------------------------------------- Zeitzone

const teileFormat = new Intl.DateTimeFormat("en-US", { timeZone: TZ, hourCycle: "h23", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit", weekday: "short" });

/** Wandzeit in Europe/Vienna für einen Zeitpunkt (ms) */
export function wandzeit(ms) {
  const p = Object.fromEntries(teileFormat.formatToParts(new Date(ms)).map((x) => [x.type, x.value]));
  const wt = { Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6, Sun: 7 }[p.weekday];
  return { tag: `${p.year}-${p.month}-${p.day}`, zeit: `${p.hour}:${p.minute}`, wochentag: wt, jahr: +p.year, monat: +p.month, t: +p.day, h: +p.hour, m: +p.minute, s: +p.second };
}

/** Wandzeit (Tag "YYYY-MM-DD", Zeit "HH:MM") in Europe/Vienna → UTC-Millisekunden */
export function lokalNachUtc(tag, zeit) {
  const [j, mo, d] = tag.split("-").map(Number);
  const [h, mi] = zeit.split(":").map(Number);
  const ziel = Date.UTC(j, mo - 1, d, h, mi);
  let ms = ziel;
  for (let i = 0; i < 3; i++) {
    const w = wandzeit(ms);
    const ist = Date.UTC(w.jahr, w.monat - 1, w.t, w.h, w.m);
    ms += ziel - ist;
  }
  return ms;
}

/** Wochentag (1 = Mo … 7 = So) eines Kalendertags */
export function wochentagVon(tag) {
  const d = new Date(`${tag}T12:00:00Z`).getUTCDay();
  return d === 0 ? 7 : d;
}

export function tagPlus(tag, n) {
  const d = new Date(`${tag}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

export const heuteTag = (ms = Date.now()) => wandzeit(ms).tag;

/** Arbeitszeiten bereinigen: nur gültige, aufsteigende Fenster, Wochentage 1–7 */
export function arbeitszeitenBereinigen(roh) {
  const out = {};
  for (let wt = 1; wt <= 7; wt++) {
    const liste = Array.isArray(roh?.[wt]) ? roh[wt] : [];
    const fenster = liste
      .filter((f) => Array.isArray(f) && zeitGueltig(f[0]) && zeitGueltig(f[1]) && f[0] < f[1])
      .slice(0, 4)
      .sort((a, b) => a[0].localeCompare(b[0]));
    if (fenster.length) out[wt] = fenster.map((f) => [f[0], f[1]]);
  }
  return out;
}

/** Ist der Kalendertag für den Mitarbeiter gesperrt (Feiertag oder Abwesenheit)? */
export function tagGesperrt(tag, { feiertage = [], abwesenheiten = [] } = {}) {
  if (feiertage.includes(tag)) return "feiertag";
  if (abwesenheiten.some((a) => a.von <= tag && tag <= a.bis)) return "abwesend";
  return null;
}

/** Überschneiden sich [a1,a2) und [b1,b2)? (ms) */
export const ueberschneidung = (a1, a2, b1, b2) => a1 < b2 && b1 < a2;

/**
 * Freie Slots eines Mitarbeiters.
 * @param {object} p
 *   arbeitszeiten, feiertage [tag], abwesenheiten [{von,bis}], belegt [{start,ende}] (ISO), dauer, puffer (Minuten),
 *   vonTag, bisTag, jetzt (ms), vorlaufStunden, raster (Minuten)
 * @returns [{ start, ende }] (ISO, UTC)
 */
export function freieSlots({ arbeitszeiten = ARBEITSZEITEN_STANDARD, feiertage = [], abwesenheiten = [], belegt = [], dauer = 60, puffer = 0, vonTag, bisTag, jetzt = Date.now(), vorlaufStunden = 0, raster = TERMIN_GRENZEN.raster } = {}) {
  const slots = [];
  const frueh = jetzt + vorlaufStunden * 3600e3;
  const belegung = belegt.map((b) => [new Date(b.start).getTime(), new Date(b.ende).getTime()]).filter(([a, e]) => Number.isFinite(a) && Number.isFinite(e));
  const az = arbeitszeitenBereinigen(arbeitszeiten);
  for (let tag = vonTag, i = 0; tag <= bisTag && i < 100; tag = tagPlus(tag, 1), i++) {
    if (tagGesperrt(tag, { feiertage, abwesenheiten })) continue;
    for (const [von, bis] of az[wochentagVon(tag)] || []) {
      const fensterEnde = lokalNachUtc(tag, bis);
      for (let start = lokalNachUtc(tag, von); start + dauer * 60e3 <= fensterEnde; start += raster * 60e3) {
        const ende = start + dauer * 60e3;
        if (start < frueh) continue;
        // Puffer vor und nach dem neuen Termin gegen bestehende Termine
        if (belegung.some(([a, e]) => ueberschneidung(start - puffer * 60e3, ende + puffer * 60e3, a, e))) continue;
        slots.push({ start: new Date(start).toISOString(), ende: new Date(ende).toISOString() });
        if (slots.length >= TERMIN_GRENZEN.maxSlots) return slots;
      }
    }
  }
  return slots;
}

/** Liegt ein gewünschter Beginn exakt auf einem freien Slot? (Serverprüfung der Buchung) */
export function slotFrei(startIso, param) {
  const start = new Date(startIso).getTime();
  if (!Number.isFinite(start)) return false;
  const tag = wandzeit(start).tag;
  return freieSlots({ ...param, vonTag: tag, bisTag: tag }).some((s) => new Date(s.start).getTime() === start);
}

// ---------------------------------------------------------------- ICS (RFC 5545)

const icsZeit = (iso) => new Date(iso).toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");

/** Text maskieren (Backslash, Semikolon, Komma, Zeilenumbruch) */
export const icsText = (t) => String(t ?? "").replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");

/** Zeilen auf 75 Oktette falten (UTF-8, ohne Zeichen zu zerteilen) */
function falten(zeile) {
  const enc = new TextEncoder();
  if (enc.encode(zeile).length <= 75) return zeile;
  const teile = [];
  let aktuell = "";
  let bytes = 0;
  for (const z of zeile) {
    const n = enc.encode(z).length;
    const grenze = teile.length ? 74 : 75;
    if (bytes + n > grenze) {
      teile.push(aktuell);
      aktuell = "";
      bytes = 0;
    }
    aktuell += z;
    bytes += n;
  }
  teile.push(aktuell);
  return teile.join("\r\n ");
}

/**
 * ICS-Datei zu einem Termin. `storniert` → STATUS:CANCELLED. METHOD:PUBLISH (ohne Organisator-Adresse,
 * solange keine Kontaktadresse freigegeben ist; mit `organisator` {name,email} → METHOD:REQUEST/CANCEL).
 */
export function icsErstellen(t, { organisator = null, basisUrl = "", jetzt = new Date().toISOString() } = {}) {
  const art = TERMIN_ARTEN[t.art];
  const storniert = t.status === "storniert";
  const methode = organisator?.email ? (storniert ? "CANCEL" : "REQUEST") : "PUBLISH";
  const beschreibung = [
    art ? `${art.label} mit ÖkoInvest` : "Termin mit ÖkoInvest",
    t.mitarbeiterName ? `Ansprechpartner: ${t.mitarbeiterName}` : "",
    t.kanal === "telefon" ? "Wir rufen Sie zum vereinbarten Zeitpunkt an." : t.kanal === "video" ? "Den Link zum Videogespräch erhalten Sie vor dem Termin im Portal." : "",
    t.verwaltenLink ? `Umbuchen oder absagen: ${t.verwaltenLink}` : basisUrl ? `Umbuchen oder absagen im Portal: ${basisUrl}/portal/termine` : "",
  ].filter(Boolean).join("\n");
  const zeilen = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//OekoInvest GmbH//Plattform Termine//DE",
    "CALSCALE:GREGORIAN",
    `METHOD:${methode}`,
    "BEGIN:VEVENT",
    `UID:${t.id}@termine.oekoinvest`,
    `SEQUENCE:${Number(t.sequenz) || 0}`,
    `DTSTAMP:${icsZeit(jetzt)}`,
    `DTSTART:${icsZeit(t.start)}`,
    `DTEND:${icsZeit(t.ende)}`,
    `SUMMARY:${icsText(`${art?.label || "Termin"} – ÖkoInvest`)}`,
    `DESCRIPTION:${icsText(beschreibung)}`,
    t.ort ? `LOCATION:${icsText(t.ort)}` : null,
    organisator?.email ? `ORGANIZER;CN=${icsText(organisator.name || "ÖkoInvest")}:mailto:${organisator.email}` : null,
    `STATUS:${storniert ? "CANCELLED" : "CONFIRMED"}`,
    "TRANSP:OPAQUE",
    storniert ? null : "BEGIN:VALARM",
    storniert ? null : "TRIGGER:-PT30M",
    storniert ? null : "ACTION:DISPLAY",
    storniert ? null : `DESCRIPTION:${icsText(art?.label || "Termin")}`,
    storniert ? null : "END:VALARM",
    "END:VEVENT",
    "END:VCALENDAR",
  ].filter(Boolean);
  return `${zeilen.map(falten).join("\r\n")}\r\n`;
}

export const terminArtLabel = (a) => TERMIN_ARTEN[a]?.label || a;
export const terminStatusLabel = (s) => TERMIN_STATUS[s]?.label || s;

/** Anzeige „Di, 06.10.2026, 10:00–11:30 Uhr“ */
export function zeitraumText(startIso, endeIso) {
  const s = new Date(startIso);
  const e = new Date(endeIso);
  if (Number.isNaN(s.getTime())) return "–";
  const tag = s.toLocaleDateString("de-DE", { weekday: "short", day: "2-digit", month: "2-digit", year: "numeric", timeZone: TZ });
  const z = (d) => d.toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit", timeZone: TZ });
  return `${tag}, ${z(s)}–${Number.isNaN(e.getTime()) ? "" : z(e)} Uhr`;
}
