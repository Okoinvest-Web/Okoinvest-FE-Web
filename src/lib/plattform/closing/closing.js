// src/lib/plattform/closing/closing.js
//
// Deal-Abschluss (Closing) nach Zuschlag im Bieterverfahren bzw. angenommener LOI: Transaktionsstruktur (Asset/Share Deal),
// Signing-Checkliste, Closing Conditions (CPs) mit Verantwortlichen/Fristen/Nachweisen, Kaufpreiszahlung (direkt oder
// Treuhand/Notaranderkonto), Übergabe-Checkliste und die Prüfungen „Signing möglich?“ und „Closing möglich?“.
//
// Reine Funktionen, client- und serverseitig nutzbar. Frappe: plattform/closing_kern.py (gleiche Regeln).
// Keine Rechtsberatung – Recherche und Quellen: docs/GRUNDBUCH-CLOSING.md.

export const CL_STRUKTUREN = {
  asset: { label: "Asset Deal", text: "Kauf der Anlage bzw. der Projektrechte (Verträge, Genehmigungen, Dienstbarkeiten) – jeder Vertrag wird einzeln übertragen, Zustimmungen der Vertragspartner nötig." },
  share: { label: "Share Deal", text: "Kauf der Anteile an der Projektgesellschaft (SPV) – Verträge bleiben bei der Gesellschaft, Change-of-Control-Klauseln prüfen, Formvorschriften für die Anteilsübertragung beachten." },
};

export const CL_STATUS = {
  vorbereitung: { label: "Vorbereitung Signing", ton: "warn" },
  signing: { label: "Signed – Closing Conditions offen", ton: "info" },
  vollzogen: { label: "Closing vollzogen", ton: "ok" },
  abgebrochen: { label: "Abgebrochen", ton: "neutral" },
};
export const CL_OFFEN = ["vorbereitung", "signing"];

export const CL_VERANTWORTLICH = {
  kaeufer: "Käufer",
  verkaeufer: "Verkäufer",
  oekoinvest: "ÖkoInvest (Transaktion)",
  notar: "Notar/Treuhänder",
  dritte: "Dritte (Bank, Behörde, Netzbetreiber)",
};

export const CP_STATUS = {
  offen: { label: "Offen", ton: "neutral" },
  gemeldet: { label: "Als erfüllt gemeldet", ton: "info" },
  erfuellt: { label: "Erfüllt", ton: "ok" },
  verzichtet: { label: "Verzichtet", ton: "neutral" },
};

/** Signing-Checkliste; auto = wird aus dem KYC-Modul gesetzt (nicht manuell abhakbar) */
export const SIGNING_PUNKTE = [
  { schluessel: "kyc_kaeufer", label: "KYC/KYB des Käufers verifiziert", auto: true, text: "Identität, wirtschaftlich Berechtigte, Sanktions-/PEP-Prüfung (KYC-Modul)." },
  { schluessel: "kyc_verkaeufer", label: "KYC/KYB des Verkäufers verifiziert", auto: true, text: "Firmenbuch/Handelsregister, wirtschaftlich Berechtigte, Sanktionsprüfung (KYC-Modul)." },
  { schluessel: "bonitaet", label: "Bonität des Käufers geprüft", text: "Bonitätsauskunft (Dienste-Modul) oder gleichwertiger Nachweis, nicht älter als 3 Monate." },
  { schluessel: "finanzierung", label: "Finanzierungsnachweis liegt vor", text: "Eigenkapitalnachweis, Fonds-Commitment oder Finanzierungszusage der Bank." },
  { schluessel: "gremien", label: "Gremienzustimmungen beider Seiten", text: "Investment Committee, Aufsichtsrat/Beirat bzw. Gesellschafterbeschluss – soweit Satzung oder Geschäftsordnung es verlangen." },
  { schluessel: "dd", label: "Due Diligence abgeschlossen", text: "Technisch, rechtlich, steuerlich; offene Punkte als Garantie, Freistellung oder CP geregelt." },
  { schluessel: "spa", label: "Kaufvertrag (SPA/APA) endverhandelt", text: "Finale Fassung von beiden Seiten freigegeben; bei Share Deal Form der Anteilsübertragung (Notar) geklärt." },
];

/** Standard-CPs je Struktur; LOI-Bedingungen (fach/loi.js LOI_BEDINGUNGEN) werden ergänzt */
const CP = (schluessel, label, verantwortlich, text, fristTage = 45) => ({ schluessel, label, verantwortlich, text, fristTage });
export const CP_STANDARD = {
  gemeinsam: [
    CP("dienstbarkeiten", "Dienstbarkeiten eingetragen bzw. Eintragung gesichert", "verkaeufer", "Grundbuch-Akten der Flächen/Dächer: Eintragung bestätigt oder Antrag gestellt mit Rang vor Grundpfandrechten (Rangrücktritt).", 60),
    CP("banken", "Freigabe der finanzierenden Banken des Verkäufers", "verkaeufer", "Löschung bzw. Freigabe von Sicherheiten (Abtretungen, Verpfändungen) oder Zustimmung zur Übernahme der Finanzierung.", 45),
    CP("kein_mac", "Keine wesentliche nachteilige Veränderung (MAC)", "verkaeufer", "Bestätigung des Verkäufers zum Closing, dass kein Material Adverse Change eingetreten ist (Bring-down der Garantien).", 60),
  ],
  asset: [
    CP("vertragsuebernahme", "Zustimmungen zur Vertragsübernahme", "verkaeufer", "Grundstückseigentümer (Pacht/Dienstbarkeit), Netzbetreiber, Direktvermarkter, Wartung – schriftliche Zustimmung zur Übertragung auf den Käufer.", 45),
    CP("foerderung", "Übertragung der Förderung / Einspeisevergütung geklärt", "verkaeufer", "DE: Betreiberwechsel im Marktstammdatenregister; AT: EAG-Förderabwicklung (OeMAG) bzw. Förderstelle; CH: Pronovo – Voraussetzungen vorab prüfen.", 45),
  ],
  share: [
    CP("zustimmung_anteile", "Zustimmung zur Anteilsübertragung (Vinkulierung)", "verkaeufer", "Gesellschafterbeschluss bzw. Zustimmung nach Gesellschaftsvertrag; Verzicht auf Vorkaufsrechte.", 30),
    CP("change_of_control", "Change-of-Control-Verzichte der Vertragspartner", "verkaeufer", "Pacht-, Netz-, Direktvermarktungs- und Kreditverträge auf Kündigungsrechte bei Gesellschafterwechsel prüfen und Verzichte einholen.", 45),
    CP("abtretung_form", "Form der Anteilsabtretung gesichert (Notartermin)", "notar", "DE GmbH: notarielle Beurkundung (§ 15 Abs. 3, 4 GmbHG); AT GmbH: Notariatsakt (§ 76 Abs. 2 GmbHG); CH GmbH: Schriftform (Art. 785 OR) + Zustimmung (Art. 786 OR). GmbH & Co. KG: Einheitlichkeit prüfen.", 30),
  ],
};

/** LOI-Bedingung → CP */
export const CP_AUS_LOI = {
  gremien: CP("gremien_kaeufer", "Zustimmung der Gremien des Käufers", "kaeufer", "Investment Committee bzw. Aufsichtsrat – schriftliche Bestätigung.", 21),
  finanzierung: CP("finanzierung_kaeufer", "Finanzierungszusage der Bank des Käufers", "kaeufer", "Unterschriebener Kreditvertrag bzw. unbedingte Zusage; Auszahlungsvoraussetzungen der Bank abgestimmt.", 45),
  netz: CP("netz", "Netzanschluss bestätigt bzw. Zusage übertragen", "verkaeufer", "Netzbetreiber bestätigt Anschluss bzw. Übertragung der Netzanschlusszusage/Reservierung.", 45),
  genehmigung: CP("genehmigung", "Genehmigung bestandskräftig", "verkaeufer", "Baugenehmigung/Bebauungsplan (DE), Widmung/Bewilligungen (AT), Baubewilligung (CH) – Rechtskraft bzw. Ablauf der Rechtsmittelfristen nachgewiesen.", 60),
  kartell: CP("kartell", "Fusionskontrolle / Investitionsprüfung", "kaeufer", "Freigabe bzw. Bestätigung, dass keine Anmeldung nötig ist (DE: GWB, AWV; AT: KartG, InvKG; CH: KG). Nur Hinweis – im Einzelfall prüfen.", 60),
};

export const UEBERGABE_PUNKTE = [
  { schluessel: "unterlagen", label: "Unterlagen übergeben", text: "Datenraum-Export, Originalverträge, Genehmigungen, Gutachten, As-built-Dokumentation." },
  { schluessel: "zugaenge", label: "Zugänge übergeben", text: "Monitoring, Datenlogger, Portale (Netzbetreiber, Direktvermarkter), Schlüssel/Schließanlagen – Passwörter neu setzen." },
  { schluessel: "vertraege", label: "Verträge übertragen bzw. angezeigt", text: "Pacht-/Dachnutzungs-, Netzanschluss-, Direktvermarktungs-, Wartungs- und Versicherungsverträge." },
  { schluessel: "netzbetreiber", label: "Anzeige an den Netzbetreiber", text: "Betreiber- bzw. Gesellschafterwechsel, neue Bankverbindung für Einspeisevergütung." },
  { schluessel: "direktvermarkter", label: "Anzeige an den Direktvermarkter / Abnehmer (PPA)", text: "Vertragspartner- bzw. Kontrollwechsel." },
  { schluessel: "behoerden", label: "Anzeigen an Behörden und Register", text: "DE: Marktstammdatenregister (Betreiberwechsel), Finanzamt; AT: Förderstelle/OeMAG, Firmenbuch; CH: Pronovo, Handelsregister; Transparenzregister/WiEReG bei Share Deal." },
  { schluessel: "grundbuch", label: "Grundbuch: Rechte auf Käufer umgestellt", text: "Asset Deal: Übertragung bzw. Neubestellung der Dienstbarkeiten zugunsten des Käufers (Übertragbarkeit nach Landesrecht prüfen)." },
];

export const CL_HINWEIS = "Muster und Checklisten sind Orientierung und ersetzen keine Rechts- oder Steuerberatung. Kaufvertrag, Garantien und Form der Übertragung vor Unterzeichnung durch Rechtsanwalt bzw. Notar prüfen lassen.";

const plusTage = (tag, n) => {
  const d = new Date(`${String(tag).slice(0, 10)}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
};

/** CP-Liste für eine neue Closing-Akte */
export function cpsAnlegen(struktur, { loiBedingungen = [], heute = new Date().toISOString().slice(0, 10) } = {}) {
  const liste = [...CP_STANDARD.gemeinsam, ...(CP_STANDARD[struktur] || [])];
  for (const b of loiBedingungen || []) if (CP_AUS_LOI[b] && !liste.some((c) => c.schluessel === CP_AUS_LOI[b].schluessel)) liste.push(CP_AUS_LOI[b]);
  return liste.map((c, i) => ({ schluessel: c.schluessel, reihenfolge: i + 1, label: c.label, text: c.text, verantwortlich: c.verantwortlich, frist: plusTage(heute, c.fristTage), status: "offen", nachweis: "", erfuelltAm: "", vonId: null, gemeldetVonId: null }));
}

export const signingAnlegen = () => SIGNING_PUNKTE.map((p) => ({ schluessel: p.schluessel, erledigt: false, am: "", vonId: null, notiz: "" }));
export const uebergabeAnlegen = () => UEBERGABE_PUNKTE.map((p) => ({ schluessel: p.schluessel, erledigt: false, am: "", vonId: null, notiz: "" }));

/** Signing-Punkte mit automatischen KYC-Werten */
export function signingStand(c, { kycKaeufer = false, kycVerkaeufer = false } = {}) {
  return SIGNING_PUNKTE.map((p) => {
    const s = (c.signing?.punkte || []).find((x) => x.schluessel === p.schluessel) || {};
    const erledigt = p.schluessel === "kyc_kaeufer" ? !!kycKaeufer : p.schluessel === "kyc_verkaeufer" ? !!kycVerkaeufer : !!s.erledigt;
    return { ...p, erledigt, am: s.am || "", notiz: s.notiz || "" };
  });
}

/** Signing möglich? { ok, gruende[] } – KYC beider Seiten ist Pflicht (Geldwäscheprävention), unabhängig vom Gating-Schalter */
export function signingPruefen(c, kyc = {}) {
  const gruende = [];
  if (c.status !== "vorbereitung") gruende.push("Signing ist nur in der Vorbereitung möglich.");
  if (!kyc.kycKaeufer) gruende.push("KYC/KYB des Käufers ist nicht verifiziert.");
  if (!kyc.kycVerkaeufer) gruende.push("KYC/KYB des Verkäufers ist nicht verifiziert.");
  for (const p of signingStand(c, kyc)) if (!p.auto && !p.erledigt) gruende.push(`Offen: ${p.label}.`);
  if (!(Number(c.kaufpreis) > 0)) gruende.push("Kaufpreis fehlt.");
  return { ok: gruende.length === 0, gruende };
}

/** Closing möglich? { ok, gruende[] } */
export function closingPruefen(c, kyc = {}) {
  const gruende = [];
  if (c.status !== "signing") gruende.push(c.status === "vorbereitung" ? "Zuerst Signing bestätigen." : "Closing ist in diesem Status nicht möglich.");
  if (!kyc.kycKaeufer) gruende.push("KYC/KYB des Käufers ist nicht (mehr) verifiziert.");
  if (!kyc.kycVerkaeufer) gruende.push("KYC/KYB des Verkäufers ist nicht (mehr) verifiziert.");
  const offen = (c.cps || []).filter((x) => !["erfuellt", "verzichtet"].includes(x.status));
  if (offen.length) gruende.push(`${offen.length} Closing Condition(s) offen: ${offen.slice(0, 3).map((x) => x.label).join("; ")}${offen.length > 3 ? " …" : ""}.`);
  if (!c.zahlung?.eingangAm) gruende.push(c.zahlung?.treuhand ? "Eingang des Kaufpreises auf dem Treuhand-/Notaranderkonto ist nicht bestätigt." : "Zahlungseingang des Kaufpreises ist nicht bestätigt.");
  if (!c.notar?.termin && c.struktur === "share") gruende.push("Notartermin für die Anteilsübertragung fehlt.");
  return { ok: gruende.length === 0, gruende };
}

/** Unerledigte CP-Status (offen bzw. als erfüllt gemeldet, aber noch nicht geprüft) */
export const CP_UNERLEDIGT = ["offen", "gemeldet"];

/** Unerledigte Closing Conditions mit abgelaufener Frist (Erinnerungen, Kennzahlen) – nur in offenen Räumen */
export function cpsUeberfaellig(c, heute = new Date().toISOString().slice(0, 10)) {
  if (!CL_OFFEN.includes(c?.status)) return [];
  return (c?.cps || []).filter((x) => CP_UNERLEDIGT.includes(x?.status || "offen") && x?.frist && String(x.frist).slice(0, 10) < heute);
}

/** Kaufpreis aus Zuschlag (Gebot) bzw. LOI ableiten */
export function kaufpreisAbleiten({ gebotGesamt = null, loi = null, mwp = 0 } = {}) {
  if (Number(gebotGesamt) > 0) return { betrag: Math.round(Number(gebotGesamt)), quelle: "zuschlag" };
  if (loi?.betrag > 0) return { betrag: Math.round(loi.betrag), quelle: "loi" };
  if (loi?.preisProKwp > 0 && mwp > 0) return { betrag: Math.round(loi.preisProKwp * mwp * 1000), quelle: "loi" };
  return { betrag: 0, quelle: "" };
}

/** Meilensteine bereinigen (Summe ≤ Kaufpreis) */
export function meilensteineBereinigen(liste, kaufpreis) {
  const out = (Array.isArray(liste) ? liste : []).slice(0, 8).map((m) => ({
    label: String(m?.label || "").trim().slice(0, 120),
    betrag: Math.max(0, Math.round(Number(m?.betrag) || 0)),
    bedingung: String(m?.bedingung || "").trim().slice(0, 200),
    faelligAm: /^20\d\d-\d\d-\d\d$/.test(String(m?.faelligAm || "")) ? m.faelligAm : "",
    bezahltAm: /^20\d\d-\d\d-\d\d$/.test(String(m?.bezahltAm || "")) ? m.bezahltAm : "",
  })).filter((m) => m.label && m.betrag > 0);
  const summe = out.reduce((s, m) => s + m.betrag, 0);
  if (kaufpreis > 0 && summe > kaufpreis) {
    const e = new Error("Die Summe der Meilensteinzahlungen übersteigt den Kaufpreis.");
    e.status = 422;
    throw e;
  }
  return out;
}

/** Hinweise zur Form und zu Steuern je Struktur/Land (Anzeige im Closing-Raum und im SPA-Muster) */
export function formHinweise(struktur, land) {
  const h = [];
  if (struktur === "share") {
    if (land === "DE") h.push("GmbH-Anteile: Verpflichtung und Abtretung notariell beurkunden (§ 15 Abs. 3 und 4 GmbHG); Notar reicht die neue Gesellschafterliste ein (§ 40 GmbHG). Bei GmbH & Co. KG werden KG-Anteile formfrei übertragen – wird die Komplementär-GmbH mitverkauft, kann der gesamte Vertrag beurkundungspflichtig sein.");
    if (land === "AT") h.push("GmbH-Anteile: Verpflichtung und Übertragung bedürfen eines Notariatsakts (§ 76 Abs. 2 GmbHG); Firmenbuch-Anmeldung des Gesellschafterwechsels. KG-Anteile: Übertragung nach Gesellschaftsvertrag, Eintragung im Firmenbuch.");
    if (land === "CH") h.push("GmbH-Stammanteile: Abtretung und Verpflichtung in Schriftform (Art. 785 OR), Zustimmung der Gesellschafterversammlung (Art. 786 OR), Handelsregister. AG-Aktien: Übertragung je nach Titel; Vinkulierung beachten.");
    h.push("Grunderwerbsteuer beim Share Deal: nur relevant, wenn die Gesellschaft Grundstücke (bzw. grundstücksgleiche Rechte) hält – DE Anteilsübergänge ab 90 % (§ 1 Abs. 2b, 3 GrEStG), AT Anteilsvereinigung ab 95 % (§ 1 Abs. 3 GrEStG), CH kantonale Handänderungssteuer bei wirtschaftlicher Handänderung. Steuerberatung einbeziehen.");
  } else {
    h.push("Asset Deal: Jeder Vertrag wird einzeln übertragen (Zustimmung der Vertragspartner). Gehört ein Grundstück dazu, ist der Kaufvertrag beurkundungspflichtig (DE § 311b BGB) bzw. grundbücherlich durchzuführen; Grunderwerbsteuer auf den Grundstücksanteil.");
    if (land === "DE") h.push("Dienstbarkeiten: Die beschränkte persönliche Dienstbarkeit ist grundsätzlich nicht übertragbar (§ 1092 Abs. 1 BGB); Ausnahmen nach § 1092 Abs. 3 BGB im Einzelfall prüfen – üblich sind Eintrittsrechte bzw. Neubestellung zugunsten des Käufers.");
    if (land === "AT") h.push("Dienstbarkeiten: Übertragbarkeit persönlicher Servituten auf den Käufer vertraglich absichern bzw. Neubestellung vereinbaren; Superädifikate über Urkundenhinterlegung übertragen.");
    if (land === "CH") h.push("Dienstbarkeiten: Übertragbarkeit (Art. 781 ZGB, nach Vertrag) bzw. selbständiges Baurecht als eigenes Grundstück (Art. 779 Abs. 3 ZGB) prüfen.");
  }
  h.push("Kartell- und Investitionsprüfung: nur Hinweis – Schwellenwerte und Sektorregeln (Energie als kritische Infrastruktur) im Einzelfall prüfen.");
  return h;
}

export const TREUHAND_HINWEIS = {
  DE: "Notaranderkonto: nur bei berechtigtem Sicherungsinteresse (§ 57 BeurkG); schriftliche Verwahrungsanweisung mit Auszahlungsvoraussetzungen (z. B. Nachweis der CPs, Eintragungen).",
  AT: "Treuhandschaft durch Notar oder Rechtsanwalt über ein Treuhandkonto (Treuhandbuch der Kammer); Auszahlungsvoraussetzungen in der Treuhandvereinbarung festlegen.",
  CH: "Hinterlegung beim Notariat bzw. Escrow über eine Bank; Freigabe gegen Nachweis der Closing Conditions.",
};
