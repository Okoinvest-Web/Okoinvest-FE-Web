// src/lib/plattform/closing/pdfSatz.js
//
// PDF-Satz der Muster (Grundbuch) und Closing-Dokumente (SPA-Muster, Abschlussbericht) sowie Kalenderdatei des Notartermins.
// Nur serverseitig (nutzt server/pdf.js über dienste/pdf.js). Inhalte: closing/muster.js.

import { dokumentePdf } from "../dienste/pdf";
import { icsText } from "../termine";
import { abschlussbericht, grundbuchMuster, spaMuster } from "./muster";
import { GB_VORLAGEN } from "./grundbuch";

const dateiName = (s) => String(s || "dokument").normalize("NFKD").replace(/[^\w.-]+/g, "_").slice(0, 80);

/** { pdf, name } für eine Grundbuch-Akte ({ vorlage, akte } aus gbMusterDaten) */
export function grundbuchPdf({ vorlage, akte }, { demo = false } = {}) {
  const dokumente = grundbuchMuster(akte, vorlage);
  const pdf = dokumentePdf(dokumente, { titel: GB_VORLAGEN[vorlage]?.label || "Muster", kennzeichen: `GRUNDBUCH · ${akte.land}`, muster: true, demo });
  return { pdf, name: `${dateiName(`${akte.id}-${vorlage}`)}.pdf` };
}

/** { pdf, name } für SPA-Muster bzw. Abschlussbericht ({ art, closing } aus clDokumentDaten) */
export function closingPdf({ art, closing }, { demo = false } = {}) {
  const bericht = art === "bericht";
  const dokumente = bericht ? abschlussbericht(closing) : spaMuster(closing);
  const pdf = dokumentePdf(dokumente, { titel: bericht ? "Abschlussbericht" : "Kaufvertrag (Muster)", kennzeichen: bericht ? "VERTRAULICH · CLOSING" : "MUSTER · CLOSING", muster: !bericht, demo });
  return { pdf, name: `${dateiName(`${closing.id}-${bericht ? "abschlussbericht" : "kaufvertrag-muster"}`)}.pdf` };
}

const icsZeit = (iso) => new Date(iso).toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");

/** Kalenderdatei (ICS) für den Notartermin ({ id, titel, start, dauerMinuten, ort, beschreibung } aus clTermin) */
export function notarIcs(t, { jetzt = new Date().toISOString() } = {}) {
  const ende = new Date(new Date(t.start).getTime() + (Number(t.dauerMinuten) || 120) * 60e3).toISOString();
  const zeilen = [
    "BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//OekoInvest GmbH//Plattform Closing//DE", "CALSCALE:GREGORIAN", "METHOD:PUBLISH",
    "BEGIN:VEVENT", `UID:${t.id}-notar@closing.oekoinvest`, `DTSTAMP:${icsZeit(jetzt)}`, `DTSTART:${icsZeit(t.start)}`, `DTEND:${icsZeit(ende)}`,
    `SUMMARY:${icsText(t.titel).slice(0, 180)}`, `DESCRIPTION:${icsText(`${t.beschreibung || "Notartermin"}\nDetails im Closing-Raum des Portals.`)}`,
    t.ort ? `LOCATION:${icsText(t.ort)}` : null, "STATUS:CONFIRMED", "END:VEVENT", "END:VCALENDAR",
  ];
  return `${zeilen.filter(Boolean).join("\r\n")}\r\n`;
}
