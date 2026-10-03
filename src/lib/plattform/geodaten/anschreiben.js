// src/lib/plattform/geodaten/anschreiben.js
//
// Anschreiben-Vorlage (Serienbrief) an Grundeigentümer einer Kandidatenfläche – reine Funktion.
// Rechtlicher Rahmen (keine Rechtsberatung, vor Einsatz von der Datenschutzberatung freigeben lassen):
//  - Nur BRIEF (Post). Telefon, E-Mail, SMS zu Werbezwecken nur mit vorheriger Einwilligung (§ 174 TKG 2021).
//  - Einmalige postalische Kontaktaufnahme auf Basis öffentlich einsehbarer Grundbuchdaten kann nach Art. 6 Abs. 1
//    lit. f DSGVO zulässig sein (DSB, GZ DSB-D123.626/0006-DSB/2018) – Voraussetzungen: Information nach Art. 14,
//    Widerspruchsmöglichkeit, keine wiederholten Zusendungen, Liegenschaftsdaten nicht von außen sichtbar.
//  - Datenquelle offenlegen (Art. 14 Abs. 2 lit. f DSGVO): Grundbuch (Auszug über Verrechnungsstelle).
// Platzhalter in «…» werden beim Serienbrief aus dem CRM-Kontakt befüllt (Name, Anschrift), nie aus dem Geodaten-Dienst.

import { GESELLSCHAFT, SITE, abs } from "@/data/site";
import { briefFuer } from "./serienbrief";
import { pfad } from "../../land/index.js";

const ha = (x) => `${(Math.round(Number(x) * 10) / 10).toLocaleString("de-DE")} ha`;

export const DSGVO_HINWEIS =
  "Direktwerbung an Eigentümer nur per Brief und nur einmalig ohne Reaktion; Telefon/E-Mail erst nach Einwilligung (§ 174 TKG 2021). Datenquelle (Grundbuch) und Widerspruchsrecht im Brief nennen (Art. 14, Art. 21 DSGVO). Widersprüche sofort im CRM als Sperrvermerk erfassen. Die Vorlage vor dem ersten Einsatz von der Datenschutzberatung freigeben lassen.";

export const DSGVO_HINWEIS_DE_CH =
  "Direktwerbung an Eigentümer nur per Brief (Art. 6 Abs. 1 lit. f DSGVO, § 7 UWG); Telefon und E-Mail nur mit vorheriger ausdrücklicher Einwilligung (§ 7 Abs. 2 UWG). Datenquelle (Grundbuch – DE: § 12 GBO/§ 43a GBV, CH: Art. 970 ZGB) und Widerspruchsrecht im Brief nennen. Für Serienbriefe mit persönlichem Link, Sperrliste und Nachfassen: Akquise-Kampagnen.";

/** Liefert { betreff, text, hinweis } für einen Kandidaten (Objekt aus dem Geodaten-Adapter) */
export function anschreiben(k, { datum = new Date() } = {}) {
  if (k.land && k.land !== "AT") {
    // Deutschland/Schweiz (A1b): gleicher Brief wie der Serienbrief der Kampagnen, Platzhalter statt Eigentümerdaten
    const b = briefFuer({ id: "Vorlage", name: "Anschreiben", land: k.land }, { ...k, id: k.id }, { anrede: "", vorname: "«Vorname»", nachname: "«Nachname»", strasse: "«Straße Hausnummer»", plz: "«PLZ»", ort: "«Ort»", code: "XXXXXXXXXX" }, { basisUrl: SITE.url, datum });
    const text = [b.absenderZeile, "", ...b.anschrift, "", b.datum, "", b.betreff, "", b.text, "", b.keinInteresse, "", "Persönlicher Link (Einmalcode je Empfänger, nur in Kampagnen): " + b.link, "", ...b.gruss, "", b.widerspruch, "", "— Datenschutzinformation —", ...b.datenschutz].join("\n");
    return { betreff: b.betreff, text, hinweis: DSGVO_HINWEIS_DE_CH, absender: SITE.firma };
  }
  const grundstuecke = (k.parzellen || []).map((p) => `KG ${p.kgNr || "«KG»"}, Gst.-Nr. ${p.gstNr || "«Gst.-Nr.»"}`);
  const liste = grundstuecke.length > 4 ? `${grundstuecke.slice(0, 4).join("; ")} und ${grundstuecke.length - 4} weitere` : grundstuecke.join("; ");
  const d = datum.toLocaleDateString("de-AT", { day: "2-digit", month: "long", year: "numeric", timeZone: "Europe/Vienna" });
  const betreff = `Ihre Fläche in ${k.gemeinde || "«Gemeinde»"} – Anfrage zur Verpachtung für eine Photovoltaik-Anlage`;
  const text = [
    `${GESELLSCHAFT.name} · ${GESELLSCHAFT.sitz} · ${GESELLSCHAFT.plz} ${GESELLSCHAFT.ort}`,
    "",
    "«Anrede» «Vorname» «Nachname»",
    "«Straße Hausnummer»",
    "«PLZ» «Ort»",
    "",
    `${GESELLSCHAFT.ort}, ${d}`,
    "",
    betreff,
    "",
    "«Briefanrede»,",
    "",
    `wir sind die ${GESELLSCHAFT.name} aus ${GESELLSCHAFT.ort} und entwickeln Freiflächen- und Agri-Photovoltaikanlagen in Österreich. Bei unserer Standortsuche sind wir auf Grundstücke in Ihrem Eigentum gestoßen (${liste}), die zusammen mit angrenzenden Flächen rund ${ha(k.ha)} umfassen.`,
    "",
    "Ob sich eine Fläche tatsächlich eignet, hängt von Widmung, Netzanschluss und Naturschutz ab – das prüfen wir für Sie kostenfrei und unverbindlich. Möglich sind eine langfristige Verpachtung (in der Regel 25 bis 30 Jahre, wertgesichert) oder Agri-PV, bei der die landwirtschaftliche Nutzung weiterläuft.",
    "",
    `Wenn Sie Interesse an einem Gespräch haben, antworten Sie uns bitte formlos per Brief oder über ${abs(pfad("/flaeche-verpachten"))}. Haben Sie kein Interesse, müssen Sie nichts tun – wir schreiben Sie zu dieser Fläche nicht erneut an.`,
    "",
    "Mit freundlichen Grüßen",
    "",
    "«Name Ansprechperson»",
    GESELLSCHAFT.name,
    "",
    "— Datenschutzinformation (Art. 13/14 DSGVO) —",
    `Verantwortlich: ${GESELLSCHAFT.name}, ${GESELLSCHAFT.sitz}, ${GESELLSCHAFT.plz} ${GESELLSCHAFT.ort}, ${GESELLSCHAFT.register}.`,
    "Zweck: einmalige Kontaktaufnahme zur möglichen Verpachtung Ihrer Fläche für eine Photovoltaik-Anlage.",
    "Rechtsgrundlage: berechtigtes Interesse (Art. 6 Abs. 1 lit. f DSGVO) an der Suche geeigneter Flächen für erneuerbare Energie.",
    "Datenquelle: Ihr Name und Ihre Anschrift stammen aus dem öffentlichen Grundbuch (Grundbuchauszug über eine Verrechnungsstelle); Lage und Größe der Grundstücke aus dem Kataster (BEV) und öffentlichen Geodaten.",
    "Speicherdauer: bis zum Abschluss der Anfrage, höchstens 12 Monate ohne Rückmeldung; bei Widerspruch nur ein Sperrvermerk, damit wir Sie nicht erneut anschreiben.",
    "Ihre Rechte: Auskunft, Berichtigung, Löschung, Einschränkung und insbesondere WIDERSPRUCH gegen diese Verarbeitung (Art. 21 DSGVO) – formlos an die obige Anschrift. Beschwerden sind bei der Österreichischen Datenschutzbehörde (www.dsb.gv.at) möglich.",
    `Weitere Informationen: ${abs("/datenschutz")}`,
  ].join("\n");
  return { betreff, text, hinweis: DSGVO_HINWEIS, absender: SITE.firma };
}
