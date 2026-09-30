// src/lib/plattform/geodaten/serienbrief.js
//
// Serienbrief der Akquise-Kampagnen (reine Funktionen, Client + Server): Brief je Empfänger mit persönlicher Ansprache,
// Flächendaten, unverbindlicher Pachtspanne, Link/QR-Code zur personalisierten Angebotsseite /angebot/[code],
// Datenschutzinformation (Art. 13/14 DSGVO bzw. Art. 19 DSG) und hervorgehobenem Widerspruchshinweis (Art. 21 DSGVO).
//
// Der Brieftext (Betreff + Hauptteil) läuft über die vorhandene Vorlagen-Engine (src/lib/plattform/vorlagen.js → rendern):
// Standardtext unten oder eine Vorlage aus dem Backoffice (Bereich „Vorlagen“). Pflichtblöcke (Absender, Anschrift,
// Link/QR, Datenschutz, Widerspruch) sind fest und nicht über Vorlagen änderbar.
// Anschriftfeld nach DIN 5008 (Form B) – im Fenster erscheinen nur Name und Anschrift, keine Grundstücksangaben.
// Telefon/E-Mail der ÖkoInvest sind nicht freigegeben und werden NICHT eingesetzt.

import { GESELLSCHAFT } from "@/data/site";
import { rendern } from "../vorlagen";
import { codeLesbar, pachtspanne } from "../akquise-kampagne";

const zahl = (x, st = 0) => (Number(x) || 0).toLocaleString("de-DE", { minimumFractionDigits: st, maximumFractionDigits: st });

export const STANDARD_VORLAGE = {
  version: 1,
  betreff: "Ihre Fläche in {{flaeche.gemeinde}} – Anfrage zur Verpachtung für eine Photovoltaik-Anlage",
  text: [
    "{{briefanrede}},",
    "",
    "wir sind die ÖkoInvest GmbH, ein Unternehmen der ÖKOVOLT Gruppe, und entwickeln Freiflächen- und Agri-Photovoltaikanlagen. Bei unserer Standortsuche sind wir auf Grundstücke in Ihrem Eigentum in {{flaeche.gemeinde}} gestoßen ({{flaeche.flurstuecke}}). Zusammen mit angrenzenden Flächen umfasst der Bereich rund {{flaeche.ha}} ha – genug für eine Anlage mit etwa {{flaeche.mwp}} MWp.",
    "",
    "Nach unserer ersten Einschätzung kommt die Fläche grundsätzlich für einen Solarpark in Frage. Für vergleichbare Flächen zahlen wir in der Regel eine Pacht zwischen {{flaeche.pachtMin}} und {{flaeche.pachtMax}} € je Hektar und Jahr, über 25 bis 30 Jahre und wertgesichert. Die Spanne ist unverbindlich; maßgeblich sind Netzanschluss, Baurecht und Naturschutz, die wir für Sie kostenfrei prüfen. Möglich ist auch Agri-PV, bei der die landwirtschaftliche Nutzung weiterläuft.",
    "",
    "Unter dem Link bzw. QR-Code unten finden Sie einen persönlichen Steckbrief Ihrer Fläche und können die Pacht selbst durchrechnen. Wenn Sie Interesse an einem unverbindlichen Gespräch haben, antworten Sie uns dort oder formlos per Brief.",
  ].join("\n"),
};

/** Datenquelle der Eigentümerdaten je Land (Art. 14 Abs. 2 lit. f DSGVO) */
export const DATENQUELLE = {
  DE: "Ihr Name und Ihre Anschrift stammen aus dem Grundbuch (Einsicht beim Grundbuchamt nach § 12 GBO; für Vorhaben der erneuerbaren Energien § 43a GBV). Lage und Größe der Flurstücke stammen aus dem Liegenschaftskataster (ALKIS, Open Data der Länder) und öffentlichen Geodaten.",
  AT: "Ihr Name und Ihre Anschrift stammen aus dem öffentlichen Grundbuch (Grundbuchauszug über eine Verrechnungsstelle). Lage und Größe der Grundstücke stammen aus dem Kataster (BEV) und öffentlichen Geodaten.",
  CH: "Ihr Name und Ihre Anschrift stammen aus der Eigentümerauskunft des Grundbuchs (Art. 970 Abs. 2 ZGB). Lage und Größe der Parzellen stammen aus der amtlichen Vermessung (geodienste.ch) und öffentlichen Geodaten.",
};

export const BESCHWERDE = {
  DE: "Sie können sich bei einer Datenschutz-Aufsichtsbehörde beschweren, insbesondere in dem Mitgliedstaat Ihres Aufenthaltsorts (z. B. beim Landesamt bzw. Landesbeauftragten für den Datenschutz Ihres Bundeslandes), oder bei der für uns zuständigen Österreichischen Datenschutzbehörde (www.dsb.gv.at).",
  AT: "Sie können sich bei der Österreichischen Datenschutzbehörde (www.dsb.gv.at) beschweren.",
  CH: "Sie können sich an den Eidgenössischen Datenschutz- und Öffentlichkeitsbeauftragten (EDÖB) oder an die Österreichische Datenschutzbehörde (www.dsb.gv.at) wenden.",
};

/** Satz zum Umgang bei fehlendem Interesse – Österreich: einmalige Zusendung */
export const KEIN_INTERESSE = {
  DE: "Haben Sie kein Interesse, müssen Sie nichts tun. Möchten Sie keine weiteren Schreiben von uns erhalten, genügt ein kurzer Widerspruch – dann schreiben wir Sie nie wieder an.",
  AT: "Haben Sie kein Interesse, müssen Sie nichts tun – wir schreiben Sie zu dieser Fläche nicht erneut an.",
  CH: "Haben Sie kein Interesse, müssen Sie nichts tun. Möchten Sie keine weiteren Schreiben von uns erhalten, genügt ein kurzer Widerspruch – dann schreiben wir Sie nie wieder an.",
};

function briefanrede(e) {
  const a = String(e.anrede || "").toLowerCase();
  if (a === "frau" && e.nachname) return `Sehr geehrte Frau ${[e.titel, e.nachname].filter(Boolean).join(" ")}`;
  if (a === "herr" && e.nachname) return `Sehr geehrter Herr ${[e.titel, e.nachname].filter(Boolean).join(" ")}`;
  if (e.firma && !e.nachname) return "Sehr geehrte Damen und Herren";
  return `Guten Tag ${[e.vorname, e.nachname].filter(Boolean).join(" ")}`.trim();
}

/** Flurstücke eines Empfängers als Text (höchstens 4 genannt) */
export function flurstueckText(ziel, empfaenger) {
  const alle = ziel.parzellen || [];
  const eigene = empfaenger?.flurstuecke?.length ? alle.filter((p) => empfaenger.flurstuecke.includes(p.id)) : alle;
  const land = ziel.land || "DE";
  // nach Gemarkung/KG gruppiert: „Gemarkung X, Flst. 12, 13/1 und 2 weitere“
  const gruppen = new Map();
  for (const p of eigene) {
    const gem = String(p.kg || "").replace(/^DEMO-(KG|Gemarkung)\s*/, "") || p.kgNr;
    if (!gruppen.has(gem)) gruppen.set(gem, []);
    gruppen.get(gem).push(p.gstNr);
  }
  const teile = [...gruppen.entries()].map(([gem, nr]) => {
    const liste = nr.length > 4 ? `${nr.slice(0, 4).join(", ")} und ${nr.length - 4} weitere` : nr.join(", ");
    if (land === "AT") return `KG ${gem}, Gst.-Nr. ${liste}`;
    if (land === "CH") return `${gem}, Parzelle ${liste}`;
    return `Gemarkung ${gem}, Flst. ${liste}`;
  });
  return teile.join("; ");
}

/**
 * Brief für einen Empfänger. Liefert strukturierte Blöcke für PDF, Vorschau und Druckformat.
 * opt: { basisUrl, datum, vorlage: { betreff, text } (Standard: STANDARD_VORLAGE), zustaendig: { name } }
 */
export function briefFuer(kampagne, ziel, empfaenger, { basisUrl = "https://www.oekoinvest.com", datum = new Date(), vorlage = STANDARD_VORLAGE, zustaendig = null } = {}) {
  const land = ziel.land || kampagne.land || "DE";
  const sp = pachtspanne(ziel.ha, ziel.ampel);
  const link = `${String(basisUrl).replace(/\/$/, "")}/angebot/${empfaenger.code}`;
  const kontext = {
    anrede: empfaenger.anrede || "",
    briefanrede: briefanrede(empfaenger),
    vorname: empfaenger.vorname || "",
    nachname: empfaenger.nachname || "",
    firma: empfaenger.firma || "",
    ort: empfaenger.ort || "",
    kampagne: { name: kampagne.name },
    flaeche: {
      bezeichnung: `${ziel.gemeinde} · ${zahl(ziel.ha, 1)} ha`,
      gemeinde: ziel.gemeinde || "",
      ha: zahl(ziel.ha, 1),
      mwp: zahl(ziel.mwp, 1),
      ort: ziel.gemeinde || "",
      bundesland: ziel.bundesland || "",
      flurstuecke: flurstueckText(ziel, empfaenger),
      pachtMin: zahl(sp.proHaMin),
      pachtMax: zahl(sp.proHaMax),
    },
    angebot: { link, code: codeLesbar(empfaenger.code) },
    zustaendig: { name: zustaendig?.name || "Ihr ÖkoInvest-Team", vorname: zustaendig?.vorname || "" },
    heute: datum.toLocaleDateString("de-DE", { timeZone: "Europe/Vienna", day: "2-digit", month: "2-digit", year: "numeric" }),
  };
  const b = rendern(vorlage.betreff || STANDARD_VORLAGE.betreff, kontext);
  const t = rendern(vorlage.text || STANDARD_VORLAGE.text, kontext);
  const anschrift = [
    [empfaenger.firma, !empfaenger.firma || empfaenger.nachname ? [empfaenger.anrede, empfaenger.titel, empfaenger.vorname, empfaenger.nachname].filter(Boolean).join(" ") : ""].filter(Boolean).join("\n"),
    empfaenger.zusatz,
    empfaenger.strasse,
    [empfaenger.plz, empfaenger.ort].filter(Boolean).join(" "),
    empfaenger.land && empfaenger.land !== land ? { DE: "DEUTSCHLAND", AT: "ÖSTERREICH", CH: "SCHWEIZ" }[empfaenger.land] || "" : "",
  ]
    .join("\n")
    .split("\n")
    .filter(Boolean);
  const G = GESELLSCHAFT;
  return {
    land,
    absenderZeile: `${G.name} · ${G.sitz} · ${G.plz} ${G.ort} · ${G.land}`,
    anschrift,
    datum: `${G.ort}, ${datum.toLocaleDateString("de-DE", { timeZone: "Europe/Vienna", day: "2-digit", month: "long", year: "numeric" })}`,
    zeichen: `${kampagne.id} · ${ziel.id}`,
    betreff: b.text,
    text: t.text,
    keinInteresse: KEIN_INTERESSE[land] || KEIN_INTERESSE.DE,
    gruss: ["Mit freundlichen Grüßen", "", kontext.zustaendig.name, G.name],
    link,
    code: codeLesbar(empfaenger.code),
    codeRoh: empfaenger.code,
    flaechenDaten: [
      ["Gemeinde", ziel.gemeinde],
      ["Flurstücke", `${(empfaenger?.flurstuecke?.length || (ziel.parzellen || []).length)} in ${[...new Set((ziel.parzellen || []).map((p) => String(p.kg || "").replace(/^DEMO-(KG|Gemarkung)\s*/, "")))].slice(0, 2).join(", ")}`],
      ["Fläche (Bereich)", `rund ${kontext.flaeche.ha} ha`],
      ["Mögliche Leistung", `etwa ${kontext.flaeche.mwp} MWp`],
      ["Pacht (unverbindlich)", `${kontext.flaeche.pachtMin}–${kontext.flaeche.pachtMax} € je ha und Jahr`],
    ],
    widerspruch: `WIDERSPRUCHSRECHT: Sie können der Verwendung Ihrer Daten für diese Kontaktaufnahme jederzeit ohne Angabe von Gründen widersprechen (Art. 21 Abs. 2 DSGVO) – formlos per Brief an die obige Anschrift oder online über den Link bzw. QR-Code („Nicht mehr anschreiben“). Wir vermerken Ihren Widerspruch dann dauerhaft in unserer Sperrliste und schreiben Sie nicht mehr an.`,
    datenschutz: [
      `Verantwortlich: ${G.name}, ${G.sitz}, ${G.plz} ${G.ort}, ${G.land}, ${G.register} (${G.gericht}).`,
      "Zweck: Kontaktaufnahme zur möglichen Verpachtung Ihrer Fläche für eine Photovoltaik-Anlage.",
      `Rechtsgrundlage: berechtigtes Interesse (Art. 6 Abs. 1 lit. f DSGVO) an der Suche geeigneter Flächen für erneuerbare Energien; Direktwerbung per Brief (Erwägungsgrund 47 DSGVO)${land === "CH" ? "; für die Schweiz zusätzlich Art. 31 DSG (überwiegendes Interesse)" : ""}.`,
      "Kategorien: Name, Anschrift, Bezeichnung und Größe Ihrer Grundstücke, Eigentumsverhältnis.",
      `Datenquelle: ${DATENQUELLE[land] || DATENQUELLE.DE}`,
      "Empfänger: gegebenenfalls Druck- und Versanddienstleister als Auftragsverarbeiter; keine Weitergabe an Dritte zu deren Werbezwecken.",
      "Speicherdauer: bis zum Abschluss der Anfrage, höchstens 12 Monate ohne Rückmeldung. Nach einem Widerspruch speichern wir nur einen Sperrvermerk (verschlüsselter Abgleichswert), damit wir Sie nicht erneut anschreiben.",
      `Ihre Rechte: Auskunft, Berichtigung, Löschung, Einschränkung der Verarbeitung, Datenübertragbarkeit und Widerspruch. ${BESCHWERDE[land] || BESCHWERDE.DE}`,
      `Weitere Informationen: ${String(basisUrl).replace(/\/$/, "")}/datenschutz`,
    ],
    unbekanntePlatzhalter: [...new Set([...b.unbekannt, ...t.unbekannt])],
    leerePlatzhalter: [...new Set([...b.leer, ...t.leer])],
  };
}
