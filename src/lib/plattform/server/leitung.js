// src/lib/plattform/server/leitung.js
//
// Leitungs-Cockpit (Querschnitt, Team 10): Unternehmens-Kennzahlen aus allen Modulen – Pipeline MWp je Phase,
// gesicherte Fläche, Deals/Provisionen, Energie-Pool, Anlagen-Performance, KYC-Rückstau, offene Posten, Finanzierung.
//
// Die Kennzahlen werden AUSSCHLIESSLICH über die vorhandenen, rechtegeprüften Backend-Operationen der Module gelesen
// (Demo und Frappe identisch – keine eigenen Datenbankzugriffe). Fällt ein Modul aus (nicht installiert, 403, Dienst
// nicht erreichbar), bleibt der Rest stehen: der Block trägt dann `fehler` statt Werten.
//
// Nur serverseitig verwenden (Seite /portal/admin/leitung, PDF /api/admin/leitung/bericht).

import { backend } from "../backend";
import { entwicklungBackend } from "../backend/entwicklung";
import { kycBackend } from "../backend/kyc";
import { finanzenBackend } from "../backend/finanzen";
import { anlagenBackend } from "../backend/anlagen";
import { energieBackend } from "../backend/energie";
import { finanzierungBackend } from "../backend/finanzierung";
import { closingBackend } from "../backend/closing";
import { anlagenMitStatus } from "../messdaten/auswertung";
import { unterrollen } from "../rechte";
import { verboten } from "../fehler";
import { PHASEN } from "@/lib/invest/markt";

/** Flächenstatus, ab denen eine Fläche als gesichert gilt (Pachtvertrag vorbereitet/unterzeichnet oder weiter) */
export const FLAECHE_GESICHERT = ["vertrag", "planung", "bau", "betrieb"];
const FLAECHE_OFFEN = ["eingegangen", "vorpruefung", "standortanalyse", "pachtangebot"];

export function leitungNoetig(n) {
  if (!n?.rollen?.includes("admin") || !unterrollen(n).includes("leitung")) throw verboten("Das Leitungs-Cockpit ist der Unterrolle „Leitung“ vorbehalten.");
}

async function sicher(fn) {
  try {
    return { ok: true, ...(await fn()) };
  } catch (e) {
    return { ok: false, fehler: e?.status === 403 ? "Keine Berechtigung für dieses Modul." : e?.status === 503 ? "Modul nicht konfiguriert." : "Daten derzeit nicht verfügbar." };
  }
}

const summe = (liste, f) => liste.reduce((s, x) => s + (Number(f(x)) || 0), 0);
const rund = (x, st = 1) => Math.round((Number(x) || 0) * 10 ** st) / 10 ** st;

/** Reine Auswertung der Flächenliste (auch für Tests ohne Server) */
export function flaechenKennzahlen(flaechen = []) {
  const gesichert = flaechen.filter((f) => FLAECHE_GESICHERT.includes(f.status));
  const offen = flaechen.filter((f) => FLAECHE_OFFEN.includes(f.status));
  return {
    gesichertHa: rund(summe(gesichert, (f) => f.ha)),
    gesichertAnzahl: gesichert.length,
    pipelineHa: rund(summe(offen, (f) => f.ha)),
    pipelineAnzahl: offen.length,
    pachtangebotOffen: flaechen.filter((f) => f.status === "pachtangebot").length,
    agriHa: rund(summe(gesichert.filter((f) => f.agri), (f) => f.ha)),
    jeLand: ["DE", "AT", "CH"].map((l) => ({ land: l, ha: rund(summe(gesichert.filter((f) => f.land === l), (f) => f.ha)) })),
  };
}

/** Reine Auswertung der Provisionen */
export function provisionKennzahlen(provisionen = [], { jahr = new Date().getUTCFullYear() } = {}) {
  const st = (s) => provisionen.filter((p) => p.status === s);
  const imJahr = (p) => String(p.bezahltAm || p.geaendertAm || p.erstelltAm || "").startsWith(String(jahr));
  return {
    offen: summe(st("offen"), (p) => p.betrag),
    inRechnung: summe(st("in_rechnung"), (p) => p.betrag),
    bezahlt: summe(st("bezahlt"), (p) => p.betrag),
    bezahltJahr: summe(st("bezahlt").filter(imJahr), (p) => p.betrag),
    anzahl: provisionen.filter((p) => p.status !== "storniert").length,
  };
}

/** Hinweise (Ampel) aus den Kennzahlen – nur Fakten, keine Bewertung */
export function leitungHinweise(k) {
  const h = [];
  if (k.kyc?.ok && k.kyc.treffer) h.push({ ton: "warn", text: `${k.kyc.treffer} möglicher Sanktions-/PEP-Treffer in der KYC-Prüfung`, href: "/portal/admin/compliance" });
  if (k.kyc?.ok && k.kyc.warteschlange >= 5) h.push({ ton: "warn", text: `KYC-Rückstau: ${k.kyc.warteschlange} Fälle in der Warteschlange`, href: "/portal/admin/compliance" });
  if (k.finanzen?.ok && k.finanzen.ueberfaelligAnzahl) h.push({ ton: "warn", text: `${k.finanzen.ueberfaelligAnzahl} überfällige Forderung(en)`, href: "/portal/admin/finanzen" });
  if (k.anlagen?.ok && k.anlagen.kritisch) h.push({ ton: "warn", text: `${k.anlagen.kritisch} kritische bzw. schwere Störung(en) offen`, href: "/portal/admin/anlagen" });
  if (k.finanzierung?.ok && k.finanzierung.ampelRot) h.push({ ton: "warn", text: `${k.finanzierung.ampelRot} Finanzierung(en) mit Covenant-Ampel Rot`, href: "/portal/admin/finanzierung" });
  if (k.betrieb?.ok && k.betrieb.ohneZustaendig) h.push({ ton: "info", text: `${k.betrieb.ohneZustaendig} offene Vorgänge ohne Zuständigen`, href: "/portal/admin/vorgaenge?ohne=1" });
  if (k.pipeline?.ok && k.pipeline.zielJahr && k.pipeline.naechstesJahrMwp < k.pipeline.zielJahr) h.push({ ton: "info", text: `COD-Prognose ${k.pipeline.naechstesJahr}: ${rund(k.pipeline.naechstesJahrMwp)} MWp (Ziel rund ${k.pipeline.zielJahr} MWp/Jahr)`, href: "/portal/admin/entwicklung" });
  return h;
}

/** Alle Kennzahlen des Leitungs-Cockpits */
export async function leitungKennzahlen(n) {
  leitungNoetig(n);
  const b = backend();
  const jahr = new Date().getUTCFullYear();

  const [uebersicht, pipeline, flaechen, deals, energie, anlagen, kyc, finanzen, finanzierung] = await Promise.all([
    sicher(async () => ({ u: await b.adminUebersicht(n) })),
    sicher(async () => {
      const p = await entwicklungBackend().entwicklungPortfolio(n, {});
      const s = p.summen || {};
      const jeJahr = s.jeJahr || [];
      const naechstes = jeJahr.find((j) => j.jahr === jahr + 1) || { mwp: 0 };
      return {
        mwp: s.mwp || 0, mwpGewichtet: s.mwpGewichtet || 0, anzahl: s.anzahl || 0, wert: s.wert || 0, volumen: s.volumen || 0,
        jePhase: (s.jePhase || []).map((x) => ({ phase: x.phase, label: x.label, anzahl: x.anzahl, mwp: x.mwp })),
        jeJahr, zielJahr: s.zielMwpJahr || null, naechstesJahr: jahr + 1, naechstesJahrMwp: naechstes.mwp || 0,
        verzug: (p.verzug || []).length, fristen30: (p.fristen || []).length,
      };
    }),
    sicher(async () => flaechenKennzahlen(await b.flaechen(n, { alle: true }))),
    sicher(async () => {
      const pv = provisionKennzahlen(await b.provisionen(n), { jahr });
      let closing = null;
      try {
        const c = await closingBackend().clListe(n, {});
        closing = c.kennzahlen || null;
      } catch {
        closing = null;
      }
      return { ...pv, closing };
    }),
    sicher(async () => {
      const pf = await energieBackend().energiePortfolio(n);
      const kunden = pf.kunden || [];
      const zonen = Object.entries(pf.zonen || {});
      const perioden = zonen.flatMap(([, z]) => z?.perioden || []);
      const bedarf = summe(perioden, (x) => x.bedarfMwh);
      const gesichert = summe(perioden, (x) => Math.min(x.gesichertMwh ?? 0, x.bedarfMwh ?? 0));
      return { kunden: kunden.length, jahresGwh: rund(summe(kunden, (k) => k.jahresKwh) / 1e6, 2), hedgeQuote: bedarf > 0 ? gesichert / bedarf : null, tranchen: (pf.tranchen || []).length };
    }),
    sicher(async () => {
      const s = await anlagenMitStatus(n, {});
      let kritisch = 0;
      try {
        kritisch = (await anlagenBackend().anlagenLeitstand(n)).zaehler?.kritisch || 0;
      } catch {
        kritisch = 0;
      }
      const kwp = s.summe?.kwp || 0;
      const erzeugung = s.summe?.jahr?.erzeugungKwh || 0;
      return {
        anzahl: (s.anlagen || []).length, kwp, speicherKwh: s.summe?.speicherKwh || 0, ampeln: s.ampeln || {},
        erzeugungJahrMwh: rund(erzeugung / 1000, 1), spezErtrag: kwp > 0 ? Math.round(erzeugung / kwp) : null,
        verfuegbarkeit: (s.anlagen || []).length ? ((s.ampeln?.laeuft || 0) + (s.ampeln?.warnung || 0)) / s.anlagen.length : null,
        co2JahrT: rund((s.summe?.co2JahrKg || 0) / 1000, 1), quelle: s.quelle, messfehler: s.messfehler || null, kritisch,
      };
    }),
    sicher(async () => ({ ...((await kycBackend().kycWarteschlange(n, {})).kennzahlen || {}) })),
    sicher(async () => ({ ...((await finanzenBackend().finanzCockpit(n)).kennzahlen || {}) })),
    sicher(async () => ({ ...((await finanzierungBackend().fzUebersicht(n)).kennzahlen || {}) })),
  ]);

  const u = uebersicht.ok ? uebersicht.u : null;
  const k = {
    stand: new Date().toISOString(),
    pipeline,
    boerse: u ? { ok: true, mwp: u.projekte?.mwpBoerse || 0, inPruefung: u.projekte?.inPruefung || 0, ndaOffen: u.interessen?.ndaOffen || 0, loiOffen: u.interessen?.loiOffen || 0, verkauft: u.projekte?.status?.verkauft || 0 } : { ok: false, fehler: uebersicht.fehler },
    flaechen,
    deals,
    energie,
    anlagen,
    kyc,
    finanzen,
    finanzierung,
    betrieb: u ? { ok: true, vorgaengeOffen: u.vorgaenge?.offen || 0, neu7: u.vorgaenge?.neu7 || 0, ohneZustaendig: u.vorgaenge?.ohneZustaendig || 0, aufgabenUeberfaellig: u.aufgaben?.ueberfaellig || 0, ungelesen: u.nachrichten?.ungelesen || 0 } : { ok: false, fehler: uebersicht.fehler },
    phasen: PHASEN.map((p) => ({ id: p.id, kurz: p.kurz })),
  };
  k.hinweise = leitungHinweise(k);
  return k;
}
