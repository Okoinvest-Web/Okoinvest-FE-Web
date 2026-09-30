// src/lib/plattform/finanzierung/bankakte.js
//
// Bank-Akte je Finanzierungsanfrage – reine Logik (client- und serverseitig, ohne Node-Importe, ohne „@/“). Ergänzt das
// Bank-Portal (bank.js: Bankenpaket, Term Sheet, CPs, Covenants) um den Prozess der Bank nach dem Erstkontakt:
//   Unterlagen anfordern (Checkliste mit Frist) · Q&A (Frage → Antwort, Kategorien) · Sachbearbeitung/Zuständigkeit ·
//   Kreditentscheidung (Kreditgremium: genehmigt, mit Auflagen, abgelehnt) · Bestätigung der Auszahlungsvoraussetzungen (CPs)
//   durch die Bank · Auszahlungsanträge (Ziehungen) mit Freigabe · Monitoring-Berichte (Covenant-Report, Jahresabschluss,
//   Betriebsbericht, Versicherungsnachweis) mit Prüfung
// Spiegel in Python: Backend-Import/…/plattform/bankakte_kern.py.

export const BANK_TEAMROLLEN = {
  leitung: { label: "Leitung / Kreditentscheidung", text: "Alles der Sachbearbeitung, dazu Kreditentscheidung, Auszahlungsfreigabe, Absage und Team verwalten." },
  sachbearbeiter: { label: "Sachbearbeitung", text: "Unterlagen anfordern, Q&A, Term Sheet, CPs bestätigen, Berichte prüfen." },
  lesen: { label: "Nur lesen", text: "Sieht Anfragen und freigegebene Unterlagen, ändert nichts (z. B. Marktfolge, Revision)." },
};
const ROLLEN_STUFE = { lesen: 1, sachbearbeiter: 2, leitung: 3 };
/** Welche Bank-Teamrolle braucht eine Aktion? */
export const BANK_AKTION_ROLLE = {
  termsheet: "sachbearbeiter", rueckfrage: "sachbearbeiter", frage: "sachbearbeiter", anforderung: "sachbearbeiter", anforderung_pruefen: "sachbearbeiter",
  cp_bestaetigen: "sachbearbeiter", bericht_anfordern: "sachbearbeiter", bericht_pruefen: "sachbearbeiter", zustaendig: "sachbearbeiter",
  absage: "leitung", kreditentscheidung: "leitung", auszahlung_entscheiden: "leitung", team: "leitung",
};
export const bankRolleReicht = (rolle, noetig) => (ROLLEN_STUFE[rolle] || 0) >= (ROLLEN_STUFE[noetig] || 99);

/**
 * Teamrolle eines Kontos in einer Bank: aktives Mitglied (mitglieder = [{bankId, nutzerId, rolle, status}]) → dessen Rolle;
 * ohne Mitgliedseintrag, aber im Bankenstamm verknüpft (bank.nutzerIds – Erstkontakt über die Einladung von ÖkoInvest) → „leitung“;
 * sonst null.
 */
export function bankRolleAus(mitglieder = [], bank, nutzerId) {
  if (!bank || !nutzerId) return null;
  const m = mitglieder.find((x) => x.bankId === bank.id && x.nutzerId === nutzerId && x.status !== "eingeladen");
  if (m) return m.status === "aktiv" && BANK_TEAMROLLEN[m.rolle] ? m.rolle : null;
  return (bank.nutzerIds || []).includes(nutzerId) ? "leitung" : null;
}

export const QA_KATEGORIEN = { technik: "Technik / Ertrag", recht: "Recht / Verträge / Genehmigung", kommerziell: "Kommerziell / Erlöse", steuer: "Steuern / Gesellschaft", sonstiges: "Sonstiges" };
export const ANFORDERUNG_STATUS = {
  offen: { label: "Angefordert", ton: "warn" },
  geliefert: { label: "Geliefert – Prüfung durch die Bank", ton: "info" },
  akzeptiert: { label: "Akzeptiert", ton: "ok" },
  nachforderung: { label: "Nachforderung", ton: "warn" },
};
export const KREDIT_ERGEBNIS = {
  genehmigt: { label: "Kredit genehmigt", ton: "ok" },
  genehmigt_auflagen: { label: "Genehmigt mit Auflagen", ton: "warn" },
  abgelehnt: { label: "Abgelehnt", ton: "rot" },
};
export const AUSZAHLUNG_STATUS = {
  beantragt: { label: "Beantragt", ton: "info" },
  freigegeben: { label: "Freigegeben", ton: "ok" },
  ausgezahlt: { label: "Ausgezahlt", ton: "ok" },
  abgelehnt: { label: "Abgelehnt", ton: "warn" },
};
export const BERICHT_ARTEN = {
  covenant: "Covenant-Report (DSCR/LLCR)",
  ertrag: "Ertrags- und Verfügbarkeitsbericht",
  jahresabschluss: "Jahresabschluss der Projektgesellschaft",
  betrieb: "Technischer Betriebsbericht",
  versicherung: "Versicherungsnachweis",
  sonstiges: "Sonstiger Bericht",
};
export const BERICHT_STATUS = {
  angefordert: { label: "Angefordert", ton: "warn" },
  eingereicht: { label: "Eingereicht", ton: "info" },
  geprueft: { label: "Geprüft", ton: "ok" },
  beanstandet: { label: "Beanstandet", ton: "rot" },
};
export const CP_BANK_STATUS = { bestaetigt: { label: "Von der Bank bestätigt", ton: "ok" }, beanstandet: { label: "Von der Bank beanstandet", ton: "warn" } };

class BankakteFehler extends Error {
  constructor(m, status = 422) {
    super(m);
    this.status = status;
  }
}
export { BankakteFehler };
const pflicht = (b, m, status = 422) => {
  if (!b) throw new BankakteFehler(m, status);
};
const txt = (v, max = 500) => (v === undefined || v === null || typeof v === "object" ? "" : String(v).replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, "").trim().slice(0, max));
const datum = (v) => (/^\d{4}-\d{2}-\d{2}$/.test(String(v || "")) && !Number.isNaN(Date.parse(`${v}T00:00:00Z`)) ? String(v) : "");
const zahl = (v, min, max, stellen = 2) => {
  if (v === null || v === undefined || v === "" || typeof v === "object") return null;
  const n = typeof v === "number" ? v : Number(String(v).replace(/\s/g, "").replace(",", "."));
  if (!Number.isFinite(n) || n < min || n > max) return null;
  const f = 10 ** stellen;
  return Math.round(n * f) / f;
};

/** Unterlagen-Anforderungen der Bank (Checkliste): 1–20 Punkte je Aufruf */
export function anforderungenBereinigen(d = {}, { heute, bausteine = [] } = {}) {
  const liste = (Array.isArray(d.punkte) ? d.punkte : [d]).slice(0, 20).map((p) => ({
    titel: txt(p.titel, 200),
    beschreibung: txt(p.beschreibung, 1000),
    baustein: bausteine.includes(p.baustein) ? p.baustein : "",
    frist: datum(p.frist),
  }));
  for (const p of liste) {
    pflicht(p.titel.length >= 3, "Bitte jede angeforderte Unterlage benennen.");
    pflicht(p.frist, "Bitte eine Frist je Unterlage angeben.");
    if (heute) pflicht(p.frist > String(heute).slice(0, 10), "Die Frist muss in der Zukunft liegen.");
  }
  pflicht(liste.length >= 1, "Bitte mindestens eine Unterlage anfordern.");
  return liste;
}

/** Frage der Bank (Q&A) */
export function frageBereinigen(d = {}) {
  const f = { frage: txt(d.frage ?? d.text, 3000), kategorie: QA_KATEGORIEN[d.kategorie] ? d.kategorie : "sonstiges" };
  pflicht(f.frage.length >= 5, "Bitte Ihre Frage eingeben.");
  return f;
}

/**
 * Kreditentscheidung der Bank. Nur für die ausgewählte Bank (Anfrage „ausgewaehlt“) bzw. vor dem Kreditvertrag.
 * betrag ≤ Term-Sheet-Betrag × 1,1 (Aufstockung über 10 % nur per neuem Term Sheet)
 */
export function kreditentscheidungBereinigen(d = {}, { anfrageStatus, termsheetBetrag = null, heute } = {}) {
  pflicht(anfrageStatus === "ausgewaehlt", "Die Kreditentscheidung ist erst möglich, wenn ÖkoInvest Ihr Angebot ausgewählt hat.", 409);
  const k = {
    ergebnis: KREDIT_ERGEBNIS[d.ergebnis] ? d.ergebnis : "",
    gremium: txt(d.gremium, 120),
    beschlussAm: datum(d.beschlussAm),
    betrag: zahl(d.betrag, 1, 5e9, 0),
    gueltigBis: datum(d.gueltigBis),
    auflagen: (Array.isArray(d.auflagen) ? d.auflagen : String(d.auflagen || "").split(/\n+/)).map((x) => txt(x, 300)).filter((x) => x.length >= 3).slice(0, 20),
    begruendung: txt(d.begruendung, 2000),
  };
  pflicht(k.ergebnis, "Bitte das Ergebnis der Kreditentscheidung wählen.");
  pflicht(k.beschlussAm, "Bitte das Beschlussdatum angeben.");
  if (heute) pflicht(k.beschlussAm <= String(heute).slice(0, 10), "Das Beschlussdatum darf nicht in der Zukunft liegen.");
  if (k.ergebnis === "abgelehnt") {
    pflicht(k.begruendung.length >= 10, "Bitte die Ablehnung begründen (mind. 10 Zeichen).");
    k.betrag = null;
    k.auflagen = [];
  } else {
    pflicht(k.betrag > 0, "Bitte den genehmigten Kreditbetrag angeben.");
    if (termsheetBetrag) pflicht(k.betrag <= termsheetBetrag * 1.1 + 0.5, "Der genehmigte Betrag liegt mehr als 10 % über dem Term Sheet – bitte ein neues Term Sheet abgeben.");
    pflicht(k.gueltigBis, "Bitte angeben, bis wann die Kreditzusage gilt.");
    pflicht(k.gueltigBis > k.beschlussAm, "Die Zusage muss nach dem Beschlussdatum gültig sein.");
    if (k.ergebnis === "genehmigt_auflagen") pflicht(k.auflagen.length >= 1, "Bitte die Auflagen benennen.");
  }
  return k;
}

/**
 * Auszahlungsantrag (Ziehung) – durch ÖkoInvest. Voraussetzungen: Kreditvertrag erfasst, alle CPs erledigt UND von der Bank
 * bestätigt (erste Ziehung), Summe aller nicht abgelehnten Ziehungen ≤ Kreditbetrag.
 */
export function auszahlungBereinigen(d = {}, { kreditvertrag, cps = [], cpBank = {}, auszahlungen = [], heute } = {}) {
  pflicht(kreditvertrag, "Ohne Kreditvertrag keine Auszahlung.", 409);
  const a = { betrag: zahl(d.betrag, 1, 5e9, 0), wunschDatum: datum(d.wunschDatum), zweck: txt(d.zweck, 500) };
  pflicht(a.betrag > 0, "Bitte den Auszahlungsbetrag angeben.");
  pflicht(a.wunschDatum, "Bitte das gewünschte Valutadatum angeben.");
  if (heute) pflicht(a.wunschDatum >= String(heute).slice(0, 10), "Das Valutadatum darf nicht in der Vergangenheit liegen.");
  pflicht(a.zweck.length >= 5, "Bitte den Verwendungszweck angeben (z. B. EPC-Rate 1 laut Zahlungsplan).");
  const offen = cpOffen(cps, cpBank);
  pflicht(!offen.length, `Auszahlungsvoraussetzungen offen: ${offen.map((c) => c.label).slice(0, 3).join("; ")}${offen.length > 3 ? " …" : ""}`, 409);
  const summe = auszahlungen.filter((x) => x.status !== "abgelehnt").reduce((s, x) => s + (x.betrag || 0), 0);
  pflicht(summe + a.betrag <= (kreditvertrag.betrag || 0) + 0.5, `Die Ziehungen übersteigen den Kreditbetrag (verfügbar ${Math.max(0, Math.round((kreditvertrag.betrag || 0) - summe)).toLocaleString("de-DE")} €).`);
  return a;
}

/** CPs, die noch nicht erledigt ODER nicht von der Bank bestätigt sind */
export const cpOffen = (cps = [], cpBank = {}) => cps.filter((c) => !c.erledigt || cpBank[c.id]?.status !== "bestaetigt");

/** Bericht (Monitoring) anfordern bzw. einreichen */
export function berichtBereinigen(d = {}, { heute } = {}) {
  const b = { art: BERICHT_ARTEN[d.art] ? d.art : "", periode: txt(d.periode, 40), faelligAm: datum(d.faelligAm), bemerkung: txt(d.bemerkung, 1000) };
  pflicht(b.art, "Bitte die Art des Berichts wählen.");
  pflicht(b.periode.length >= 2, "Bitte den Berichtszeitraum angeben (z. B. Q3/2026 oder GJ 2025).");
  if (d.faelligAm !== undefined) {
    pflicht(b.faelligAm, "Bitte das Fälligkeitsdatum angeben.");
    if (heute) pflicht(b.faelligAm >= String(heute).slice(0, 10), "Das Fälligkeitsdatum darf nicht in der Vergangenheit liegen.");
  }
  return b;
}

/** Offene Punkte und Fristen einer Bank-Akte (für Listen, Zähler, Erinnerungen) */
export function akteStand(akte = {}, heute) {
  const h = String(heute || "").slice(0, 10);
  const anf = akte.anforderungen || [];
  const qa = akte.qa || [];
  const ber = akte.berichte || [];
  return {
    anforderungenOffen: anf.filter((x) => ["offen", "nachforderung"].includes(x.status)).length,
    anforderungenUeberfaellig: anf.filter((x) => ["offen", "nachforderung"].includes(x.status) && x.frist && x.frist < h).length,
    anforderungenZuPruefen: anf.filter((x) => x.status === "geliefert").length,
    fragenOffen: qa.filter((x) => x.status === "offen").length,
    berichteFaellig: ber.filter((x) => x.status === "angefordert").length,
    berichteUeberfaellig: ber.filter((x) => x.status === "angefordert" && x.faelligAm && x.faelligAm < h).length,
    berichteZuPruefen: ber.filter((x) => x.status === "eingereicht").length,
    auszahlungenOffen: (akte.auszahlungen || []).filter((x) => ["beantragt", "freigegeben"].includes(x.status)).length,
  };
}
