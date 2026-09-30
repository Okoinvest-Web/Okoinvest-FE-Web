// src/lib/plattform/ki/regeln.js
//
// Regelbasierte Vorschläge – greifen, wenn kein ANTHROPIC_API_KEY gesetzt ist oder der KI-Dienst
// nicht erreichbar ist. Gleiche Ausgabeform wie der KI-Modus, damit die Oberfläche beides gleich
// darstellt. Arbeiten ausschließlich mit dem (bereits rechtegeprüften) Kontext.

import { BEDINGUNGEN, statusInfo, PROZESSE } from "../prozesse";
import { VORGANG_TYPEN } from "../konstanten";
import { suchen } from "./wissen";
import { naechsteSchritteFlaeche } from "./kontext";
import { fmt } from "@/lib/rechner/annahmen";
import { PACHT } from "@/lib/invest/markt";

const satz = (s) => {
  const t = String(s || "").trim();
  if (!t) return "";
  return /[.!?…]$/.test(t) ? t : `${t}.`;
};
const zahl = (x) => (x === null || x === undefined || x === "" ? null : Number(String(x).replace(",", ".")));
const kuerzen = (s, max) => (s.length > max ? `${s.slice(0, max - 1).trimEnd()}…` : s);

// ------------------------------------------------------------------ Exposé

export function regelExpose({ daten: d, meta }) {
  const p = meta.projekt || {};
  const ort = [d.regionGrob, d.bundeslandOderKanton].filter(Boolean).join(", ");
  const leistung = d.leistungMwp ? `rund ${fmt(d.leistungMwp, d.leistungMwp < 10 ? 1 : 0)} MWp` : "";
  const typ = d.projekttyp || "PV";
  const a1 = [
    `Angeboten wird ein ${typ}-Projekt${leistung ? ` mit ${leistung}` : ""}${d.speicherMwh ? ` und einem Speicher von ${fmt(d.speicherMwh)} MWh` : ""}${ort ? ` in ${ort}` : ""}${d.land ? ` (${d.land})` : ""}.`,
    d.phase ? `Das Projekt befindet sich in der Phase „${d.phase}“.` : "",
    d.netzanschluss ? `Netzanschluss: ${d.netzanschluss}.` : "",
  ].filter(Boolean).join(" ");
  const a2 = [
    d.flaecheHa ? `Die Projektfläche umfasst rund ${fmt(d.flaecheHa, 1)} ha.` : "",
    d.inbetriebnahmeGeplant ? `Die Inbetriebnahme ist für ${d.inbetriebnahmeGeplant} geplant.` : "",
    d.preisindikation ? `Preisindikation: ${d.preisindikation}.` : "",
  ].filter(Boolean).join(" ");
  const a3 = [
    "Das Projekt richtet sich an Investoren, die Projektrechte in dieser Entwicklungsphase erwerben und bis zur Inbetriebnahme weiterführen möchten.",
    typeof d.datenraumQualitaetProzent === "number" ? `Nach Unterzeichnung der Vertraulichkeitsvereinbarung stehen die Unterlagen im Datenraum bereit (Vollständigkeit der erwarteten Unterlagen: ${d.datenraumQualitaetProzent} %).` : "Nach Unterzeichnung der Vertraulichkeitsvereinbarung stehen die Unterlagen im Datenraum bereit.",
  ].join(" ");
  const highlights = [
    leistung ? `${leistung.replace("rund ", "")} ${typ}` : "",
    d.phase ? `Entwicklungsstand: ${d.phase}` : "",
    /zusage|reserviert|vorhanden/i.test(d.netzanschluss || "") ? d.netzanschluss : "",
    d.speicherMwh ? `Speicher ${fmt(d.speicherMwh)} MWh` : "",
    d.inbetriebnahmeGeplant ? `Inbetriebnahme geplant ${d.inbetriebnahmeGeplant}` : "",
    d.datenraumQualitaetProzent >= 60 ? `Datenraum zu ${d.datenraumQualitaetProzent} % vollständig` : "",
  ].filter(Boolean).map((h) => kuerzen(h, 90)).slice(0, 6);
  const risiken = [
    d.typischesRisikoDerPhase ? `Typisches Entwicklungsrisiko der Phase „${d.phase}“: ${d.typischesRisikoDerPhase}.` : "",
    /noch nicht|angefragt/i.test(d.netzanschluss || "") ? "Der Netzanschluss ist noch nicht verbindlich gesichert." : "",
    d.unterlagenFehlend?.length ? `Für die aktuelle Phase fehlen noch Unterlagen: ${d.unterlagenFehlend.join(", ")}.` : "",
    !d.inbetriebnahmeGeplant ? "Ein Zeitplan bis zur Inbetriebnahme ist noch nicht angegeben." : "",
  ].filter(Boolean);
  const fehlend = [
    ...BEDINGUNGEN.projektEinreichbar({ ...p, provisionAkzeptiert: { am: "x" } }),
    !p.codGeplant ? "Geplante Inbetriebnahme" : "",
    !p.flaecheHa && p.typ !== "carport" ? "Flächengröße in ha" : "",
    ...(d.unterlagenFehlend || []).map((x) => `Unterlage: ${x}`),
  ].filter(Boolean);
  return {
    beschreibung: [a1, a2, a3].filter(Boolean).join("\n\n"),
    highlights,
    risiken: risiken.length ? risiken : ["Risiken bitte anhand von Phase, Netzanschluss und Genehmigungsstand ergänzen."],
    fehlendeAngaben: [...new Set(fehlend)],
  };
}

// ------------------------------------------------------------------ Triage

const PFLICHT_JE_TYP = {
  flaeche: [["ha", "Größe der Fläche in ha"], ["plz", "Lage (PLZ/Ort)"], [null, "Eigentumsverhältnisse (Alleineigentum, Miteigentum, Verwaltung)"], [null, "Aktuelle Nutzung und laufende Pachtverträge"]],
  agri: [["ha", "Größe der Fläche in ha"], ["plz", "Lage (PLZ/Ort)"], ["kultur", "Bewirtschaftung bzw. Kultur (Acker, Grünland, Sonderkultur)"], ["modell", "Gewünschtes Modell (verpachten, selbst investieren, Genossenschaft)"]],
  investor: [["ticket", "Investitionsvolumen (Ticketgröße)"], ["fokus", "Anlagefokus (Projekttyp, Phase, Länder)"]],
  projekt: [["mwp", "Leistung in MWp"], ["phase", "Entwicklungsphase"], ["land", "Land/Bundesland"]],
  reststrom: [["verbrauchMwh", "Jahresverbrauch in MWh"], ["standorte", "Anzahl der Standorte"]],
  carport: [["stellplaetze", "Anzahl der Stellplätze"], ["plz", "Standort (PLZ/Ort)"]],
  speicher: [["mw", "Leistung bzw. Kapazität (MW/MWh)"], ["plz", "Standort (PLZ/Ort)"]],
  kommune: [["thema", "Anliegen bzw. Vorhaben"]],
  energiegemeinschaft: [["land", "Land"], ["plz", "Region bzw. Netzgebiet"]],
  genossenschaft: [["anteile", "Gewünschte Anteile"]],
  kontakt: [["nachricht", "Konkretes Anliegen"]],
};

function prioritaetBerechnen(v) {
  const d = v.daten || {};
  const ha = zahl(d.ha);
  const tage = Math.floor((Date.now() - new Date(v.erstelltAm).getTime()) / 864e5);
  let prio = "mittel";
  let grund = "Übliche Anfrage ohne besonderen Zeitdruck.";
  if (["flaeche", "agri"].includes(v.typ) && ha !== null) {
    if (ha >= 20) [prio, grund] = ["hoch", `Große Fläche (${fmt(ha, 1)} ha) mit Potenzial für einen Solarpark.`];
    else if (ha < 3) [prio, grund] = ["niedrig", `Kleine Fläche (${fmt(ha, 1)} ha) – Eignung für Freiflächen-PV eher begrenzt.`];
    else grund = `Fläche von ${fmt(ha, 1)} ha – fachliche Vorprüfung sinnvoll.`;
  } else if (v.typ === "projekt" && zahl(d.mwp) >= 10) [prio, grund] = ["hoch", `Projekt mit ${fmt(zahl(d.mwp), 1)} MWp.`];
  else if (v.typ === "reststrom" && zahl(d.verbrauchMwh) >= 1000) [prio, grund] = ["hoch", `Hoher Jahresverbrauch (${fmt(zahl(d.verbrauchMwh))} MWh).`];
  else if (v.typ === "carport" && zahl(d.stellplaetze) >= 100) [prio, grund] = ["hoch", `Großer Parkplatz (${fmt(zahl(d.stellplaetze))} Stellplätze).`];
  else if (v.typ === "speicher" && zahl(d.mw) >= 5) [prio, grund] = ["hoch", `Großspeicher mit ${fmt(zahl(d.mw))} MW.`];
  else if (v.typ === "kontakt") [prio, grund] = ["niedrig", "Allgemeine Anfrage ohne konkretes Vorhaben."];
  if (v.status === "eingegangen" && tage >= 3) {
    if (prio === "niedrig") prio = "mittel";
    grund += ` Die Anfrage wartet seit ${tage} Tagen auf eine erste Rückmeldung.`;
  }
  return { prio, grund };
}

export function regelTriage({ daten: d, meta }) {
  const v = meta.vorgang;
  const k = v.kontakt || {};
  const angaben = { ...(v.daten || {}), plz: v.daten?.plz || k.plz, land: v.daten?.land || k.land };
  const fehlend = (PFLICHT_JE_TYP[v.typ] || []).filter(([key]) => !key || angaben[key] === undefined || angaben[key] === "" || angaben[key] === null).map(([, label]) => label);
  const { prio, grund } = prioritaetBerechnen(v);
  const name = [k.vorname, k.nachname].filter(Boolean).join(" ");
  const eckdaten = Object.entries(d.angaben || {}).slice(0, 4).map(([l, w]) => `${l}: ${w}`).join("; ");
  const zusammenfassung = [
    `${name || "Eine Person"}${k.firma ? ` (${k.firma})` : ""} hat eine Anfrage „${VORGANG_TYPEN[v.typ] || v.typ}“ gestellt${d.kontakt?.ort ? ` – Ort: ${d.kontakt.ort}` : ""}.`,
    eckdaten ? `Angaben: ${eckdaten}.` : "Es liegen kaum Zusatzangaben vor.",
    d.nachrichten?.length ? `Im Verlauf gibt es ${d.nachrichten.length} Nachricht(en).` : "",
  ].filter(Boolean).join(" ");
  const naechster = {
    eingegangen: "Anfrage sichten, Prüfung beginnen und Rückfragen zu den fehlenden Angaben senden.",
    in_pruefung: fehlend.length ? "Fehlende Angaben nachfordern, danach qualifizieren." : "Fachlich bewerten und als qualifiziert markieren oder begründet ablehnen.",
    qualifiziert: "Angebot bzw. Gesprächstermin vorbereiten.",
    angebot: "Nachfassen und Abschluss dokumentieren.",
  }[v.status] || "Status prüfen und Verlauf dokumentieren.";
  const rueckfragen = fehlend.length ? `\n\nDamit wir Ihr Anliegen zügig prüfen können, benötigen wir noch folgende Angaben:\n${fehlend.map((x) => `- ${x}`).join("\n")}\n\nSie können uns diese direkt hier im Portal als Nachricht senden oder Unterlagen hochladen.` : "\n\nWir prüfen Ihre Angaben und melden uns mit den nächsten Schritten.";
  return {
    zusammenfassung,
    typVorschlag: v.typ,
    prioritaet: prio,
    begruendung: grund,
    fehlendeAngaben: fehlend,
    naechsterSchritt: naechster,
    antwortEntwurf: `Guten Tag${name ? ` ${name}` : ""},\n\nvielen Dank für Ihre Anfrage „${VORGANG_TYPEN[v.typ] || v.typ}“ (Vorgangsnummer ${v.id}).${rueckfragen}\n\nFreundliche Grüße\nIhr ÖkoInvest-Team`,
  };
}

// ------------------------------------------------------------------ Frag das Projekt

const woerter = (s) => String(s || "").toLowerCase().replace(/[^a-z0-9äöüß\s-]/g, " ").split(/[\s-]+/).filter((w) => w.length > 3);

export function regelFrage({ quellen }, frage) {
  const w = [...new Set(woerter(frage))];
  const treffer = quellen
    .map((q) => {
      const titel = q.titel.toLowerCase();
      const text = q.text.toLowerCase();
      let p = 0;
      for (const x of w) {
        const stamm = x.length > 6 ? x.slice(0, 6) : x;
        if (titel.includes(stamm)) p += 3;
        if (text.includes(stamm)) p += 1;
      }
      return { q, p };
    })
    .filter((x) => x.p >= 2)
    .sort((a, b) => b.p - a.p)
    .slice(0, 3);
  if (!treffer.length) {
    return {
      text: "Zu Ihrer Frage habe ich in den freigegebenen Projektangaben keinen passenden Eintrag gefunden. Bitte stellen Sie die Frage über „Nachrichten zu diesem Projekt“ – das Backoffice klärt sie mit dem Anbieter.",
      zitiert: [],
    };
  }
  const zeilen = treffer.map(({ q }) => {
    const auszug = q.text.split("\n").filter((z) => w.some((x) => z.toLowerCase().includes(x.length > 6 ? x.slice(0, 6) : x))).slice(0, 4).join("\n") || q.text.split("\n").slice(0, 3).join("\n");
    return `${q.titel} [${q.id}]:\n${kuerzen(auszug, 600)}`;
  });
  return {
    text: `Passende Angaben aus den freigegebenen Projektdaten:\n\n${zeilen.join("\n\n")}\n\nDie Auswahl beruht auf einer Stichwortsuche. Für eine verbindliche Auskunft stellen Sie Ihre Frage bitte über „Nachrichten zu diesem Projekt“.`,
    zitiert: treffer.map(({ q }) => q.id),
  };
}

// ------------------------------------------------------------------ Flächen-Assistent

export function regelFlaeche({ daten: d, meta }, frage) {
  const f = meta.flaeche;
  const s = statusInfo("flaeche", f.status);
  const teile = [];
  const schritt = PROZESSE.flaeche.pipeline.indexOf(f.status);
  teile.push(`Ihre Fläche „${f.bezeichnung}“ hat den Status „${s.label}“${schritt >= 0 ? ` (Schritt ${schritt + 1} von ${PROZESSE.flaeche.pipeline.length})` : ""}. ${satz(s.text)}`);
  if (f.status === "abgelehnt" && f.ablehnGrund) teile.push(`Begründung: ${satz(f.ablehnGrund)}`);
  const naechste = naechsteSchritteFlaeche(f);
  if (naechste) teile.push(`Wie es weitergeht: ${naechste}`);
  if (d.pachtangebot) {
    const pa = d.pachtangebot;
    teile.push(`Es liegt ein Pachtangebot über ${fmt(pa.euroProHaUndJahr)} € je Hektar und Jahr für ${pa.laufzeitJahre} Jahre vor. Zur Einordnung: Für Freiflächen-PV liegen Pachten im DACH-Raum in der Regel zwischen ${fmt(PACHT.freiflaecheProHa.min)} und ${fmt(PACHT.freiflaecheProHa.max)} € je Hektar und Jahr. Verbindlich ist allein der Vertrag.`);
  }
  const todo = [];
  if (f.status === "entwurf") todo.push("Angaben vervollständigen und die Fläche zur Prüfung einreichen");
  if (f.status === "pachtangebot") todo.push("Pachtangebot prüfen und annehmen oder per Nachricht Rückfragen stellen");
  for (const u of (d.fehlendeUnterlagen || []).slice(0, 2)) todo.push(`Unterlage hochladen: ${u.split(" – ")[0]}`);
  if (!todo.length) todo.push("Nichts – wir melden uns, sobald der nächste Schritt ansteht. Fragen können Sie jederzeit per Nachricht stellen");
  teile.push(`Was Sie jetzt tun können:\n${todo.slice(0, 3).map((x) => `- ${satz(x)}`).join("\n")}`);

  const treffer = frage ? suchen(frage, { anzahl: 3 }) : suchen(`${f.agri ? "agri-pv" : "pacht solarpark"} ${s.label}`, { anzahl: 2 });
  if (!frage) return { text: teile.join("\n\n"), treffer };

  // Mit Frage: Antwort zuerst, danach nur kurz der Stand der Fläche
  const antwort = [];
  const faq = treffer.find((t) => t.faq)?.faq;
  if (faq) antwort.push(`Aus unserem Ratgeber („${faq.q}“):\n${faq.a}`);
  else if (treffer.length) antwort.push(`Antworten auf Ihre Frage finden Sie in diesen Artikeln: ${treffer.map((t) => `[${t.titel}](${t.href})`).join(", ")}.`);
  else antwort.push("Zu Ihrer Frage habe ich in unseren Ratgebern keinen passenden Artikel gefunden. Schreiben Sie uns gern eine Nachricht – wir antworten persönlich.");
  antwort.push(`Zum Stand Ihrer Fläche „${f.bezeichnung}“: ${s.label}. ${naechste || ""}`.trim());
  return { text: antwort.join("\n\n"), treffer };
}

// ------------------------------------------------------------------ Nachrichten-Entwurf

export function regelNachricht({ meta }, stichpunkte) {
  const punkte = String(stichpunkte || "")
    .split(/\n|;/)
    .map((x) => x.replace(/^[-*•\s]+/, "").trim())
    .filter(Boolean)
    .map((x) => satz(x.charAt(0).toUpperCase() + x.slice(1)));
  const letzte = [...(meta.nachrichten || [])].reverse().find((m) => !m.system && !m.eigene);
  if (meta.alsBackoffice) {
    const kern = punkte.length ? punkte.join(" ") : letzte ? "Wir haben Ihr Anliegen aufgenommen, prüfen es und melden uns zeitnah mit einer Rückmeldung." : "Wir melden uns zum aktuellen Stand und stehen für Rückfragen gern zur Verfügung.";
    return `Guten Tag${meta.gegenueber ? ` ${meta.gegenueber}` : ""},\n\n${letzte ? "vielen Dank für Ihre Nachricht. " : ""}${kern}\n\nFreundliche Grüße\nIhr ÖkoInvest-Team`;
  }
  const kern = punkte.length ? punkte.join(" ") : letzte ? "vielen Dank für Ihre Rückmeldung. [Ihre Antwort bzw. Frage]" : "[Ihr Anliegen]";
  return `Guten Tag,\n\n${kern}\n\nFreundliche Grüße\n${meta.meinName || ""}`.trim();
}
