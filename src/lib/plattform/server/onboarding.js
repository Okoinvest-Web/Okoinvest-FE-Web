// src/lib/plattform/server/onboarding.js
//
// Serverseitige Logik der Onboarding-Assistenten (Team B1):
//   onboardingFakten(n)          – Fakten aus echten Daten, ausschließlich über rechtegeprüfte Backend-Operationen
//   assistentLaden(n)            – verfügbare Pfade, aktiver Pfad (ausgewertet), Zustand; speichert den Snapshot und
//                                  legt einmalig die Willkommensmail in den Postausgang
//   onboardingAktion(n, aktion)  – prüft die Änderung (motor.aenderungPruefen: Pfad passt zu Rollen, Schritt existiert,
//                                  bestätigbar, Untertyp erlaubt, Abschluss nur bei erfüllten Pflichtkriterien) und speichert
// Fehler einzelner Quellen blockieren nie – der Fakt gilt dann als nicht erfüllt.

import { backend } from "../backend";
import { bedienung } from "../backend/bedienung";
import { onboardingBackend } from "../backend/onboarding";
import { kycStatus } from "../backend/kyc";
import { serviceBackend } from "../backend/service";
import { fachBackend } from "../backend/fach";
import { energieBackend } from "../backend/energie";
import { anlagenBackend } from "../backend/anlagen";
import { entwicklungBackend } from "../backend/entwicklung";
import { finanzierungBackend } from "../backend/finanzierung";
import { PlattformFehler } from "../fehler";
import { KOMMUNE_GEPRUEFT } from "../kommune";
import { onboardingBereinigen } from "../onboarding";
import { aenderungPruefen, auswertungSnapshot, faelligeMail, pfadAuswerten } from "../onboarding/motor";
import { PFAD_NACH_ID, TOUREN, pfadeFuer, untertypErlaubt, untertypVorschlag } from "../onboarding/pfade";

const hat = (n, ...r) => r.some((x) => n?.rollen?.includes(x));
const sicher = (p, leer = null) => Promise.resolve().then(p).catch(() => leer);
const anzahl = (x) => (Array.isArray(x) ? x.length : 0);

/** Fakten aus echten Daten des angemeldeten Kontos (nur eigene, rechtegeprüfte Daten) */
export async function onboardingFakten(n) {
  const b = backend();
  const extern = !hat(n, "admin") || n.rollen.length > 1;
  const [flaechen, projekte, vorgaenge, interessen, kyc, termine, energieDaten, energieMeine, anlagen, auftraege, ausschreibungen, bankMeine, aufgaben, gebiete] = await Promise.all([
    hat(n, "flaeche", "landwirt") ? sicher(() => b.flaechen(n), []) : [],
    hat(n, "anbieter") ? sicher(() => b.projekte(n), []) : [],
    sicher(() => b.vorgaenge(n), []),
    hat(n, "investor") ? sicher(() => b.interessen(n, {}), []) : [],
    extern ? sicher(() => kycStatus(n), null) : null,
    sicher(() => serviceBackend().termine(n, {}), []),
    hat(n, "unternehmen", "mitglied") ? sicher(() => fachBackend().energieDaten(n, {}), null) : null,
    hat(n, "unternehmen") ? sicher(() => energieBackend().energieMeine(n), null) : null,
    hat(n, "unternehmen") ? sicher(() => anlagenBackend().anlagen(n, {}), []) : [],
    hat(n, "gutachter") ? sicher(() => entwicklungBackend().entwicklungMeine(n), []) : [],
    hat(n, "lieferant") ? sicher(() => energieBackend().energieAusschreibungen(n, {}), []) : [],
    hat(n, "bank") ? sicher(() => finanzierungBackend().fzBankMeine(n), null) : null,
    hat(n, "admin") ? sicher(() => b.aufgaben(n, { zustaendigId: n.id, status: "erledigt" }), []) : [],
    hat(n, "admin") && typeof b.gebiete === "function" ? sicher(() => b.gebiete(n), null) : null,
  ]);
  const flaecheListe = Array.isArray(flaechen) ? flaechen : [];
  const projektListe = Array.isArray(projekte) ? projekte : [];
  const vorgangListe = Array.isArray(vorgaenge) ? vorgaenge.filter((v) => !v.nutzerId || v.nutzerId === n.id) : [];
  const kommuneAnliegen = vorgangListe.filter((v) => v.typ === "kommune");
  const kycSt = kyc?.status || null;
  const gebietListe = Array.isArray(gebiete?.gebiete) ? gebiete.gebiete : Array.isArray(gebiete) ? gebiete : [];
  return {
    name: !!(n.vorname && n.nachname),
    telefon: !!n.telefon,
    firma: !!n.firma,
    emailBestaetigt: !!n.emailBestaetigt,
    mailEinstellungen: !!n.mailEinstellungen,
    zweiFaktor: !!n.zweiFaktorAktiv,
    organisation: !!n.organisation,
    flaechen: flaecheListe.length,
    flaechenDach: flaecheListe.filter((f) => f.nutzung === "dach").length,
    flaechenLand: flaecheListe.filter((f) => f.nutzung !== "dach").length,
    flaechenEingereicht: flaecheListe.filter((f) => f.status && f.status !== "entwurf").length,
    flaechencheck: vorgangListe.some((v) => ["flaeche", "agri"].includes(v.typ) && v.daten?.quelle === "flaechencheck"),
    projekte: projektListe.length,
    projekteBestand: projektListe.filter((p) => p.phase === "cod").length,
    provision: projektListe.filter((p) => p.provisionAkzeptiert).length,
    datenblatt: projektListe.filter((p) => p.datenblatt && typeof p.datenblatt === "object" && Object.keys(p.datenblatt).length > 0).length,
    suchprofil: !!n.suchprofil,
    suchprofilTicket: !!(n.suchprofil && (n.suchprofil.ticketMin || n.suchprofil.ticketMax)),
    suchprofilStruktur: !!(n.suchprofil && ((n.suchprofil.dealStrukturen || []).length || n.suchprofil.finanzierung || n.suchprofil.renditeZielPct)),
    interessen: anzahl(interessen),
    kyc: {
      status: kycSt,
      angestossen: !!kycSt && !["offen", "abgelehnt", "abgelaufen"].includes(kycSt),
      iban: !!kyc?.bank?.vorhanden,
      eigentum: anzahl(kyc?.eigentum),
    },
    termine: (Array.isArray(termine) ? termine : []).filter((t) => t.mitarbeiter?.id !== n.id && ["gebucht", "bestaetigt", "erledigt"].includes(t.status)).length,
    abnahmestellen: anzahl(energieDaten?.abnahmestellen),
    lastgaenge: anzahl(energieDaten?.lastgaenge),
    beteiligung: !!(energieDaten?.geno || energieDaten?.eg),
    energieVertrag: anzahl(energieMeine?.vertraege),
    vollmacht: energieMeine?.vollmacht?.status === "erteilt",
    anlagen: anzahl(anlagen),
    kommuneAnliegen: kommuneAnliegen.length,
    kommuneGeprueft: kommuneAnliegen.some((v) => KOMMUNE_GEPRUEFT.includes(v.status)),
    auftraege: anzahl(auftraege),
    ausschreibungen: anzahl(ausschreibungen),
    bankAnfragen: anzahl(bankMeine?.anfragen),
    aufgabenErledigt: anzahl(aufgaben),
    gebiete: gebietListe.filter((g) => g.mitarbeiterId === n.id || g.mitarbeiter?.id === n.id).length,
  };
}

function auswerten(n, pfadId, pz, fakten, legacy) {
  const pfad = PFAD_NACH_ID[pfadId];
  return pfadAuswerten(pfad, fakten, pz || {}, { untertypVorschlag: untertypVorschlag(pfadId, { nutzer: n, fakten }), legacyMerker: legacy.erledigt });
}

function aktivePfadId(n, zustand) {
  const pfade = pfadeFuer(n.rollen || []);
  if (!pfade.length) return null;
  return pfade.some((p) => p.id === zustand.aktiv) ? zustand.aktiv : pfade[0].id;
}

/**
 * Alles für Assistent und Checkliste. Rückgabe:
 * { pfade: [{id,titel,text}], pfad: Auswertung|null, zustand, legacy, fakten? }
 * optionen.snapshot (Standard true): Auswertung am Konto vermerken (Team-Sicht, Erinnerungen) + Willkommensmail
 */
export async function assistentLaden(n, { snapshot = true } = {}) {
  const ob = onboardingBackend();
  const [zustand, legacy, fakten] = await Promise.all([ob.onbZustand(n), legacyLaden(n), onboardingFakten(n)]);
  const pfadId = aktivePfadId(n, zustand);
  const pfad = pfadId ? auswerten(n, pfadId, zustand.pfade[pfadId], fakten, legacy) : null;
  if (pfad && snapshot) {
    const snap = auswertungSnapshot(pfad, new Date().toISOString());
    const alt = zustand.auswertung;
    const geaendert = !alt || alt.pfad !== snap.pfad || alt.erledigt !== snap.erledigt || alt.gesamt !== snap.gesamt || alt.untertyp !== snap.untertyp || alt.pflichtOffen.join() !== snap.pflichtOffen.join();
    if (geaendert) await ob.onbSpeichern(n, { ...zustand, auswertung: snap }).catch(() => null);
    const art = faelligeMail({ erstelltAm: n.erstelltAm, checklisteAus: legacy.checklisteAus }, { ...zustand, auswertung: snap });
    if (art === "willkommen" && !n.rollen?.includes("admin")) await ob.onbMail(n, "willkommen", { pfadTitel: pfad.titel }).catch(() => null);
  }
  return { pfade: pfadeFuer(n.rollen || []).map((p) => ({ id: p.id, titel: p.titel, text: p.text })), pfad, zustand, legacy, fakten };
}

/** Gespeicherter Zustand des generischen Einstiegs (Status, Merker, checklisteAus) – unverändert inkl. aktualisiertAm */
const legacyLaden = (n) => bedienung().onboarding(n).then((z) => ({ ...onboardingBereinigen(z), aktualisiertAm: z?.aktualisiertAm || null })).catch(() => onboardingBereinigen(null));

const fehler = (status, meldung) => new PlattformFehler(status, meldung);

/** Änderung prüfen und speichern. Rückgabe wie assistentLaden (ohne Fakten). */
export async function onboardingAktion(n, aktion) {
  const ob = onboardingBackend();
  const [zustand, legacy, fakten] = await Promise.all([ob.onbZustand(n), legacyLaden(n), aktion?.aktion === "tour" ? {} : onboardingFakten(n)]);
  const erlaubt = {
    pfade: pfadeFuer(n.rollen || []),
    untertypErlaubt: (pfad, u) => untertypErlaubt(n, pfad, u),
    auswertung: (pfadId, pz) => auswerten(n, pfadId, pz, fakten, legacy),
    touren: TOUREN,
  };
  const neu = aenderungPruefen(zustand, aktion, erlaubt, fehler);
  const pfadId = aktivePfadId(n, neu);
  const pfad = pfadId && aktion?.aktion !== "tour" ? auswerten(n, pfadId, neu.pfade[pfadId], fakten, legacy) : null;
  if (pfad) neu.auswertung = auswertungSnapshot(pfad, new Date().toISOString());
  const protokollText = aktion?.aktion === "abschliessen" ? `Einstieg „${PFAD_NACH_ID[aktion.pfad]?.titel}“ abgeschlossen` : "";
  const gespeichert = await ob.onbSpeichern(n, neu, { aktion: { aktion: aktion?.aktion, pfad: aktion?.pfad || null, schritt: aktion?.schritt || null, untertyp: aktion?.untertyp || null }, auswertung: neu.auswertung, protokollText });
  return { pfade: erlaubt.pfade.map((p) => ({ id: p.id, titel: p.titel, text: p.text })), pfad, zustand: gespeichert };
}

/** Checkliste „Erste Schritte“ aus dem aktiven Pfad (Form wie bisher: { punkte, erledigt, gesamt, quote, fertig }) */
export function checklisteAusPfad(pfad) {
  if (!pfad) return { punkte: [], erledigt: 0, gesamt: 0, quote: 100, fertig: true };
  const punkte = pfad.schritte.map((s) => ({ id: s.id, titel: s.titel, text: s.text, href: `/portal/willkommen?schritt=${s.id}`, erledigt: s.erledigt, pflicht: s.pflicht, spaeter: s.spaeter }));
  return { punkte, erledigt: pfad.erledigt, gesamt: pfad.gesamt, quote: pfad.quote, fertig: pfad.erledigt === pfad.gesamt, pflichtOffen: pfad.pflichtOffen.length };
}
