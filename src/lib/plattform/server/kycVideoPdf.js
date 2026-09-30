// src/lib/plattform/server/kycVideoPdf.js
//
// Protokoll der Videoidentifizierung als PDF (gemeinsamer PDF-Satz dienste/pdf.js → server/pdf.js). Eingabe = Ergebnis
// von kycVideoProtokoll() (Demo und Frappe gleich). Nur serverseitig; Auslieferung über kycDateiAntwort (no-store, nosniff).

import { dokumentePdf } from "../dienste/pdf";
import { KYC_VIDEO_ABBRUCHGRUENDE, KYC_VIDEO_CHECKLISTE, KYC_VIDEO_ERGEBNISSE, KYC_VIDEO_HINWEIS, mrzNummerMaskiert } from "../kycIdent";
import { TZ } from "../termine";

const zeit = (iso) => (iso ? new Date(iso).toLocaleString("de-DE", { timeZone: TZ, day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit", second: "2-digit" }) : "–");
const ART = { personalausweis: "Personalausweis / Identitätskarte", reisepass: "Reisepass", aufenthaltstitel: "Aufenthaltstitel" };

export function kycVideoPdf({ fall = {}, person = {}, protokoll: p = {}, namen = {}, erstelltVon = "" } = {}, { demo = false } = {}) {
  const name = (id) => namen[id] || id || "–";
  const punkte = KYC_VIDEO_CHECKLISTE.map((c) => {
    const x = p.punkte?.[c.id];
    return [c.label, x ? (x.ok ? "bestätigt" : "nicht bestätigt") : "offen", x ? zeit(x.am) : "–", x?.notiz || ""];
  });
  const dokument = {
    id: p.id,
    titel: `Protokoll Videoidentifizierung ${p.id}`,
    untertitel: `KYC-Fall ${fall.id} · erstellt ${zeit(new Date().toISOString())} von ${erstelltVon || "–"} · vertraulich (Compliance)`,
    abschnitte: [
      {
        titel: "Überblick",
        tabelle: {
          kopf: ["Angabe", "Wert"],
          zeilen: [
            ["Person", person.name || fall.bezeichnung || "–"],
            ["Geburtsdatum", person.geburtsdatum || "–"],
            ["Dokument", `${ART[person.ausweisArt] || person.ausweisArt || "–"} · Nr. ${mrzNummerMaskiert(String(person.ausweisNummer || "").toUpperCase())}`],
            ["Durchführende Person", name(p.durchfuehrenderId)],
            ["Gebuchter Termin", p.termin ? `${zeit(p.termin.start)} – ${zeit(p.termin.ende)}` : "ohne Termin"],
            ["Beginn / Ende", `${zeit(p.gestartetAm)} / ${zeit(p.beendetAm)}`],
            ["Videokonferenz-Werkzeug", p.link || "nicht hinterlegt"],
            ["Ergebnis", p.ergebnis ? KYC_VIDEO_ERGEBNISSE[p.ergebnis]?.label || p.ergebnis : "laufend"],
            p.abbruchgrund ? ["Abbruchgrund", KYC_VIDEO_ABBRUCHGRUENDE[p.abbruchgrund] || p.abbruchgrund] : null,
            ["Begründung", p.begruendung || "–"],
            ["Einmalcode (TAN)", p.tan ? `${p.tan.bestaetigt ? `bestätigt ${zeit(p.tan.bestaetigtAm)}` : "nicht bestätigt"} · Kanal ${p.tan.kanal} · Fehlversuche ${p.tan.versuche || 0}` : "nicht gesendet"],
          ].filter(Boolean),
        },
      },
      { titel: "Pflicht-Checkliste", tabelle: { kopf: ["Prüfpunkt", "Ergebnis", "Zeitpunkt", "Notiz"], zeilen: punkte } },
      { titel: "Verlauf (mit Zeitstempeln)", tabelle: { kopf: ["Zeitpunkt", "Person", "Eintrag"], zeilen: (p.eintraege || []).map((e) => [zeit(e.am), name(e.vonId), e.text]) } },
      { titel: "Integrität", text: p.hash ? `SHA-256 des abgeschlossenen Protokolls: ${p.hash}` : "Protokoll noch nicht abgeschlossen – kein Integritätswert." },
      { titel: "Hinweis", text: `${KYC_VIDEO_HINWEIS} Es wurde keine Video- oder Tonaufzeichnung angefertigt.` },
    ],
  };
  return dokumentePdf([dokument], { titel: dokument.titel, kennzeichen: "VERTRAULICH · COMPLIANCE", muster: false, demo });
}
