// src/lib/plattform/compliance/verdacht.js
//
// Interner Workflow Geldwäsche-Verdachtsfall – reine Funktionen. KEIN automatischer Versand: Die Meldung an die
// zentrale Meldestelle gibt die/der Geldwäschebeauftragte selbst über das Behördenportal (goAML) ab und trägt hier nur
// Datum und Aktenzeichen ein. Ob ÖkoInvest Verpflichtete im Sinne des GwG ist, ist offen (docs/handbuch/backoffice-compliance.md);
// der Workflow ist für die vollen Sorgfaltspflichten gebaut. Python-Gegenstück: plattform/compliance_kern.py
//
// Orientierung (nach aktuellem Stand, keine Rechtsberatung):
//   DE  Meldung „unverzüglich“ an die FIU (Zentralstelle für Finanztransaktionsuntersuchungen) über goAML (§ 43 GwG);
//       Transaktion erst nach Zustimmung oder Ablauf des dritten Werktags (§ 46 Abs. 1 GwG); Verbot der Informationsweitergabe (§ 47 GwG)
//   AT  Meldung an die Geldwäschemeldestelle (A-FIU) im Bundeskriminalamt über goAML (für Gewerbetreibende §§ 365m1 ff. GewO 1994);
//       Verbot der Informationsweitergabe
//   CH  Meldung an die Meldestelle für Geldwäscherei (MROS, fedpol) über goAML (Art. 9 GwG); Informationsverbot (Art. 10a GwG)
// Aufbewahrung: Aufzeichnungen und Belege mindestens 5 Jahre (DE § 8 Abs. 4 GwG; CH Art. 7 GwG: 10 Jahre).

export const MELDESTELLEN = {
  DE: { name: "FIU – Zentralstelle für Finanztransaktionsuntersuchungen", portal: "goAML Web (FIU)", norm: "§ 43 GwG", stillhalte: "Transaktion erst nach Zustimmung der FIU oder nach Ablauf des dritten Werktags nach Abgabe der Meldung (§ 46 Abs. 1 GwG).", info: "§ 47 GwG" },
  AT: { name: "Geldwäschemeldestelle (A-FIU) im Bundeskriminalamt", portal: "goAML (A-FIU)", norm: "§§ 365m1 ff. GewO 1994 (Gewerbetreibende) bzw. einschlägige Materiengesetze", stillhalte: "Bis zur Klärung keine weiteren Schritte der Geschäftsbeziehung setzen; Anweisungen der Meldestelle beachten.", info: "Verbot der Informationsweitergabe (Tipping-off)" },
  CH: { name: "Meldestelle für Geldwäscherei (MROS), fedpol", portal: "goAML (MROS)", norm: "Art. 9 GwG", stillhalte: "Vermögenssperre und Fristen nach Art. 9b/10 GwG beachten.", info: "Art. 10a GwG" },
};

export const VERDACHT_STATUS = {
  erfasst: { label: "Erfasst", ton: "warn" },
  in_pruefung: { label: "In Prüfung (Geldwäschebeauftragte/r)", ton: "warn" },
  meldung_vorbereitet: { label: "Meldung vorbereitet", ton: "info" },
  gemeldet: { label: "Gemeldet", ton: "dunkel" },
  keine_meldung: { label: "Keine Meldung – dokumentiert", ton: "neutral" },
  abgeschlossen: { label: "Abgeschlossen", ton: "ok" },
};
export const VERDACHT_OFFEN = ["erfasst", "in_pruefung", "meldung_vorbereitet"];

export const VERDACHT_ANLAESSE = {
  identitaet: "Zweifel an Identität / Dokumenten",
  herkunft: "Mittelherkunft unplausibel",
  sanktion: "Sanktions-/Embargobezug",
  struktur: "Undurchsichtige Eigentums-/Kontrollstruktur",
  transaktion: "Ungewöhnliche Transaktion (Betrag, Weg, Drittland)",
  video: "Videoidentifizierung mit Verdacht",
  sonstiges: "Sonstiges",
};

export const VERDACHT_UEBERGAENGE = {
  pruefen: { von: ["erfasst"], nach: "in_pruefung", pflicht: [] },
  meldung_vorbereiten: { von: ["in_pruefung"], nach: "meldung_vorbereitet", pflicht: ["begruendung"] },
  gemeldet: { von: ["meldung_vorbereitet"], nach: "gemeldet", pflicht: ["aktenzeichen", "gemeldetAm"] },
  keine_meldung: { von: ["in_pruefung", "meldung_vorbereitet"], nach: "keine_meldung", pflicht: ["begruendung"] },
  abschliessen: { von: ["gemeldet", "keine_meldung"], nach: "abgeschlossen", pflicht: [] },
};

/** Aufbewahrung bis (Ende des Kalenderjahres + n Jahre; DE/AT 5, CH 10) */
export function verdachtAufbewahrungBis(abgeschlossenAm, land = "AT") {
  const j = Number(String(abgeschlossenAm || "").slice(0, 4)) || new Date().getUTCFullYear();
  return `${j + (land === "CH" ? 10 : 5)}-12-31`;
}

/** Übergang prüfen: { ok, nach, fehler } */
export function verdachtUebergang(f, aktion, daten = {}, { heute, ichId } = {}) {
  const u = VERDACHT_UEBERGAENGE[aktion];
  if (!u) return { ok: false, fehler: "Unbekannte Aktion." };
  if (!u.von.includes(f.status)) return { ok: false, fehler: `Aktion nicht möglich im Status „${VERDACHT_STATUS[f.status]?.label || f.status}“.` };
  for (const p of u.pflicht) {
    const w = String(daten[p] ?? "").trim();
    if (p === "begruendung" && w.length < 20) return { ok: false, fehler: "Bitte die Abwägung nachvollziehbar begründen (mind. 20 Zeichen)." };
    if (p === "aktenzeichen" && !/^[A-Za-z0-9./ -]{3,40}$/.test(w)) return { ok: false, fehler: "Bitte das Aktenzeichen/die Referenz der Meldestelle angeben." };
    if (p === "gemeldetAm" && (!/^\d{4}-\d{2}-\d{2}$/.test(w) || (heute && w > heute))) return { ok: false, fehler: "Bitte das Meldedatum angeben (nicht in der Zukunft)." };
  }
  // Vier-Augen: Die Entscheidung trifft nicht die Person, die den Fall erfasst hat
  if (["meldung_vorbereiten", "keine_meldung"].includes(aktion) && ichId && f.erfasstVon === ichId && !f.alleinEntscheidung) return { ok: false, fehler: "Die Entscheidung trifft eine andere Person als die meldende (Vier-Augen-Prinzip)." };
  return { ok: true, nach: u.nach };
}
