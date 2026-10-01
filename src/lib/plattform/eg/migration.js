// src/lib/plattform/eg/migration.js
//
// Migration aus dem Prototyp (mitglied/gemeinschaft.js: JSON-DocTypes Plattform Energiegemeinschaft / EG Teilnahme bzw.
// Demo db.mitglied.gemeinschaften/teilnahmen) in das normalisierte Modell (eg/modell.js). Reine Funktion, idempotent über
// `migriertAus` (alte Kennung). Nur österreichische Gemeinschaften; DE/CH bleiben im Prototyp (eingefroren, Fachkonzept 7.3).
// Python-Spiegel: plattform/eg_stamm_kern.py migration_aus_prototyp (Frappe-Patch plattform/patches/eg_migration_stamm.py).
//
// Abbildung:
//   form eeg_lokal → modell eeg, Zonelevel 3 · eeg_regional → eeg, 4 · beg → beg, 6 · gea → gea, 1
//   status aufbau → in_gruendung · aktiv → aktiv · geschlossen → aufnahmestopp
//   Teilnahme beantragt → entwurf (Mitglied „antrag“) · angemeldet → angefragt · aktiv → aktiv · beendet → beendet · abgelehnt → abgelehnt
//   je Konto bzw. Name ein Mitglied; Zählpunkt Bezug (verbrauch) und Einspeisung (erzeugung) getrennt, TF 100 %
//   Preise → Tarif „Übernahme aus dem Prototyp“; anlageKwp → PV-Anlage am Erzeugungszählpunkt
// Consent-IDs kennt der Prototyp nicht → leer + Warnung (Abgleich per EC_PODLIST, WP2).

import { NETZBETREIBER } from "./netzbetreiber.js";
import { gemeinschaftsIdPruefen, kennungNormalisieren, zaehlpunktPruefen } from "./zaehlpunkt.js";

const FORM = { eeg_lokal: ["eeg", 3], eeg_regional: ["eeg", 4], beg: ["beg", 6], gea: ["gea", 1] };
const GSTATUS = { aufbau: "in_gruendung", aktiv: "aktiv", geschlossen: "aufnahmestopp" };
const TSTATUS = { beantragt: "entwurf", angemeldet: "angefragt", aktiv: "aktiv", beendet: "beendet", abgelehnt: "abgelehnt" };
const MSTATUS = { entwurf: "antrag", angefragt: "aufgenommen", aktiv: "aktiv", beendet: "ausgeschieden", abgelehnt: "abgelehnt" };

function rechtsformAus(t, modell) {
  const s = String(t || "").toLowerCase();
  if (modell === "gea") return "keine";
  if (/genossenschaft|egen/.test(s)) return "egen";
  if (/gmbh/.test(s)) return "gmbh";
  if (/\bog\b|\bkg\b/.test(s)) return "og_kg";
  return "verein";
}
function netzbetreiberAus(text, zps, liste) {
  const s = String(text || "").toLowerCase();
  const n = liste.find((x) => s && (s.includes(x.kurzname.toLowerCase()) || s.includes(x.name.toLowerCase().replace(/ gmbh.*$/, ""))));
  if (n) return n.id;
  for (const z of zps) {
    const p = zaehlpunktPruefen(z, { netzbetreiber: liste });
    if (p.netzbetreiberId) return p.netzbetreiberId;
  }
  if (/ober(ö|oe)sterreich/.test(s)) return "ENB-OOE";
  return "";
}

/**
 * @param {{gemeinschaften:object[], teilnahmen:object[]}} alt Prototyp-Daten
 * @param {{neueId:(praefix:string)=>string, heute:string, vorhanden?:{gemeinschaften:object[]}, netzbetreiber?:object[], namen?:(nutzerId:string)=>{vorname:string,nachname:string,email:string}|null}} o
 */
export function migrationAusPrototyp(alt = {}, { neueId, heute, vorhanden = { gemeinschaften: [] }, netzbetreiber = NETZBETREIBER, namen = () => null } = {}) {
  const r = { gemeinschaften: [], mitglieder: [], zaehlpunkte: [], teilnahmen: [], anlagen: [], tarife: [], warnungen: [], uebersprungen: [] };
  const schon = new Set((vorhanden.gemeinschaften || []).map((g) => g.migriertAus).filter(Boolean));
  const meta = { erstelltAm: `${heute}T00:00:00.000Z`, erstelltVon: null, geaendertAm: `${heute}T00:00:00.000Z`, geaendertVon: null };
  for (const a of alt.gemeinschaften || []) {
    if (a.land !== "AT") { r.uebersprungen.push({ id: a.id, name: a.name, grund: `Land ${a.land}: bleibt im Prototyp (international, vereinfacht).` }); continue; }
    if (schon.has(a.id)) { r.uebersprungen.push({ id: a.id, name: a.name, grund: "bereits migriert" }); continue; }
    const [modell, zonelevel] = FORM[a.form] || ["eeg", 3];
    if (!FORM[a.form]) r.warnungen.push(`${a.name}: unbekannte Form „${a.form}“ – als EEG lokal übernommen, bitte prüfen.`);
    const tn = (alt.teilnahmen || []).filter((t) => t.egId === a.id);
    const zpListe = tn.flatMap((t) => [t.stamm?.zaehlpunkt, t.stamm?.zaehlpunktEinspeisung]).filter(Boolean);
    const nb = netzbetreiberAus(a.netzbetreiber, zpListe, netzbetreiber);
    if (!nb) r.warnungen.push(`${a.name}: Netzbetreiber „${a.netzbetreiber}“ nicht zugeordnet – bitte wählen.`);
    const gidRoh = kennungNormalisieren(String(a.gemeinschaftsId || "").replace(/\(demo\)/i, ""));
    const gid = gemeinschaftsIdPruefen(gidRoh, { modell });
    if (gidRoh && !gid.ok) r.warnungen.push(`${a.name}: Gemeinschafts-ID „${a.gemeinschaftsId}“ entspricht nicht dem Format (${gid.fehler}) – in die Beschreibung übernommen.`);
    const g = {
      id: neueId("EGG"), migriertAus: a.id, name: a.name, kurzname: "", modell, zonelevel, nahebereichRef: a.gebiet || "", rechtsform: rechtsformAus(a.rechtsform, modell), zvrZahl: "", firmenbuchnummer: "",
      sitzAdresse: { strasse: "", plz: (a.plzListe || [])[0] || "", ort: "" }, email: "", telefon: "", uid: "", steuernummer: "", finanzamt: "", ustStatus: "kleinunternehmer", ustOptionSeit: "", iban: "", bic: "", creditorId: "",
      netzbetreiber: nb ? [nb] : [], marktpartnerId: "", gemeinschaftsId: gidRoh && gid.ok ? gidRoh : "", verteilmodell: a.verteilschluessel === "statisch" ? "statisch" : "dynamisch", vorgaengerId: null, nachfolgerId: null,
      edaAnbindung: "anwenderportal", organisatorOrgId: null, organisatorAngezeigtAm: "", dienstleistung: { aktiv: a.status === "aktiv", paket: "migration", seit: heute, avvAm: "" },
      abrechnungsrhythmus: "monat", statutenVersion: "", betreibervertragDatum: "", beschreibung: [a.info, gidRoh && !gid.ok ? `Gemeinschafts-ID laut Prototyp: ${a.gemeinschaftsId}` : ""].filter(Boolean).join("\n"),
      status: GSTATUS[a.status] || "in_gruendung", ...meta, ...(a.demo ? { demo: true } : {}),
    };
    r.gemeinschaften.push(g);
    const abMin = tn.map((t) => t.ab).filter(Boolean).sort()[0] || heute;
    if (a.tarifBezugCt !== null && a.tarifBezugCt !== undefined) {
      r.tarife.push({ id: neueId("ETF"), gemeinschaftId: g.id, bezeichnung: "Übernahme aus dem Prototyp", gueltigAb: abMin, gueltigBis: "", beschluss: { art: "vorstand", datum: abMin, referenz: "Migration Prototyp – Beschluss nachtragen" }, bezugspreisCt: Number(a.tarifBezugCt) || 0, einspeisepreisCt: Number(a.tarifEinspeisungCt) || 0, zeitfenster: [], grundgebuehrMonat: Number(a.grundgebuehrMonat) || 0, zaehlpunktgebuehrMonat: 0, einmalgebuehrBeitritt: 0, mitgliedsbeitragJahr: 0, sozialtarif: { bezugspreisCt: null, kontingentPct: null }, individuell: [], status: "aktiv", ...meta });
    }
    const mitgliedFuer = new Map();
    let nr = 0;
    for (const t of tn) {
      const schluessel = t.nutzerId || `name:${t.name}`;
      const tst = TSTATUS[t.status] || "entwurf";
      let m = mitgliedFuer.get(schluessel);
      if (!m) {
        const n = t.nutzerId ? namen(t.nutzerId) : null;
        const firma = !n && t.name ? t.name : "";
        m = { id: neueId("EMG"), migriertAus: t.id, gemeinschaftId: g.id, kontoId: t.nutzerId || null, mitgliedsnummer: ++nr, art: firma && /gmbh|kg|og|bäckerei|hof|gasthof|tischlerei/i.test(firma) ? "kmu" : "privat",
          person: { vorname: n?.vorname || "", nachname: n?.nachname || "", firma, strasse: "", plz: t.stamm?.plz || "", ort: t.stamm?.ort || "", email: n?.email || "", telefon: "" },
          unternehmensgroesse: { mitarbeiter: null, umsatzMioEur: null, bilanzMioEur: null, nachweis: "" }, steuerstatusErzeuger: "kleinunternehmer", uid: "", schutzbeduerftig: false, iban: "", sepaMandat: { referenz: "", datum: "", status: "" },
          rechnungsweg: t.nutzerId ? "portal" : "email", abrechnungsrhythmus: "", vertraege: [], beitrittAm: t.ab || "", austrittZum: t.bis || "", status: MSTATUS[tst] || "antrag", ...meta };
        mitgliedFuer.set(schluessel, m);
        r.mitglieder.push(m);
        if (m.art === "kmu") r.warnungen.push(`${a.name}: „${firma}“ als KMU übernommen – Mitgliedsart und Steuerstatus prüfen.`);
      }
      const rolle = t.stamm?.rolle || "bezug";
      const paare = [];
      if (t.stamm?.zaehlpunkt) paare.push([t.stamm.zaehlpunkt, rolle === "einspeisung" ? "erzeugung" : "verbrauch"]);
      if (t.stamm?.zaehlpunktEinspeisung && rolle !== "bezug") paare.push([t.stamm.zaehlpunktEinspeisung, "erzeugung"]);
      if (!paare.length) r.warnungen.push(`${a.name}: Teilnahme ${t.id} ohne Zählpunkt – nur Mitglied übernommen.`);
      for (const [nummer, richtung] of paare) {
        const p = zaehlpunktPruefen(nummer, { netzbetreiber });
        if (!p.ok) { r.warnungen.push(`${a.name}: Zählpunkt „${nummer}“ ungültig (${p.fehler}) – übersprungen.`); continue; }
        let anlageId = null;
        if (richtung === "erzeugung" && Number(t.stamm?.anlageKwp) > 0) {
          const an = { id: neueId("EAN"), migriertAus: t.id, gemeinschaftId: g.id, bezeichnung: `PV ${m.person.firma || m.person.nachname || "Mitglied"}`, art: "pv", engpassleistungKw: null, kwp: Number(t.stamm.anlageKwp), ausrichtung: null, neigung: null, standort: { lat: null, lon: null, adresse: "" }, eigentuemerMitgliedId: m.id, betreiber: "", betriebsfuehrung: "", nutzungsmodell: "ueberschuss", foerderung: "keine", inbetriebnahme: "", hknRegistriert: false, speicherKwh: null, speicherLadequelle: "", iotQuelle: "", haushalt: m.art === "privat", status: "aktiv", ...meta };
          r.anlagen.push(an);
          anlageId = an.id;
        }
        const z = { id: neueId("EZP"), migriertAus: t.id, zaehlpunktnummer: p.wert, netzbetreiberId: p.netzbetreiberId || nb, nbNummer: p.nbNummer, plz: p.plz, richtung, anlageId, inhaberKontoId: m.kontoId, inhaberName: m.person.firma || [m.person.vorname, m.person.nachname].filter(Boolean).join(" "), bezeichnung: "", smartMeter: t.stamm?.smartMeter === false || t.stamm?.smartMeter === "nein" ? "nein" : t.stamm?.smartMeter ? "ja" : "unbekannt", qhAktiv: tst === "aktiv", nahebereichRef: g.nahebereichRef, auskunftAm: "", netzebene: 7, lieferant: "", energieabnehmer: "", ...meta };
        r.zaehlpunkte.push(z);
        r.teilnahmen.push({
          id: neueId("ETN"), migriertAus: t.id, zaehlpunktId: z.id, gemeinschaftId: g.id, mitgliedId: m.id, teilnahmefaktor: 100, aufteilungsschluesselPct: g.verteilmodell === "statisch" && richtung === "verbrauch" ? t.anteilPct ?? null : null,
          consentId: "", gueltigAb: tst === "aktiv" || tst === "beendet" ? t.ab || "" : "", gueltigBis: tst === "beendet" ? t.bis || "" : "", tfHistorie: t.ab && ["aktiv", "beendet"].includes(tst) ? [{ gueltigAb: t.ab, tf: 100, prozessId: "" }] : [],
          status: tst, beendetGrund: tst === "beendet" ? "abmeldung" : "", responsecode: "", fristBis: "",
          verlauf: [{ am: meta.erstelltAm, von: "", nach: tst, ereignis: "migration", prozessId: "", text: `Übernahme aus dem Prototyp (Status „${t.status}“)`, vonKonto: null }], ...meta,
        });
      }
    }
    if (tn.some((t) => t.status === "aktiv")) r.warnungen.push(`${a.name}: Consent-IDs fehlen im Prototyp – nach der Übernahme EC_PODLIST anfordern und abgleichen.`);
  }
  return r;
}
