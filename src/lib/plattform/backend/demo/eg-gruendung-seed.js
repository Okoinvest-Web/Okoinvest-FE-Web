// src/lib/plattform/backend/demo/eg-gruendung-seed.js
//
// Demo-Daten WP5 (Gründung, Wechsel, Verein) – alles FIKTIV („(Demo)“, example.com). Bezug auf die WP1-Demo nur über
// gemeinschaft.seedSchluessel (sonnenland, alpenvorland). Sammlung db.egGruendung.
//  1. Gründungsauftrag „Bürgerenergie Alpenvorland (Demo)“ (BEG, Verein) – Auftraggeber Gemeinde (kommune@), mitten in
//     der Gründung: Statuten beschlossen, Gründungsversammlung abgehalten, Errichtungsanzeige liegt bei der Behörde.
//  2. Anfrage „EEG Mattigtal (Demo)“ – Machbarkeits-Check (mitglied@).
//  3. Wechsel „EEG Seenland (Demo)“ – bestehende EEG aus EEG Faktura, Angebot liegt vor (unternehmen@).
//  4. Sonnenland: ordentliche Mitgliederversammlung 2025 (abgeschlossen, Protokoll mit Prüfsumme), Entwurf 2026 mit
//     ElWG-Statutenänderung, Beschlussregister, Statuten-Eingaben.

import { GR_PAKETE, schritteErzeugen, auftragStatusAusSchritten } from "../../eg/gruendung.js";
import { gvTagesordnungVorlage, beschluesseAusVersammlung } from "../../eg/verein.js";
import { ergebnisRechnen, stimmenKanonisch, versammlungBereinigen } from "../../mitglied/versammlung.js";

export const GR_SEED_VERSION = 1;

const ZEICHEN = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";
function id(praefix, n) {
  let x = (n * 2246822519) >>> 0;
  let s = "";
  for (let i = 0; i < 6; i++) { s += ZEICHEN[x % 32]; x = Math.floor(x / 32) + (i + 11) * 173; }
  return `${praefix}-26-${s}`;
}

/**
 * @param {{gemeinschaften:object[], mitglieder:object[], konten:{kommune?:string, mitglied?:string, unternehmen?:string, obmann?:string}, tag:(t:number)=>string, iso:(t:number)=>string, sha256:(s:string)=>string}} k
 */
export function grSeed({ gemeinschaften = [], mitglieder = [], konten = {}, tag, iso, sha256 }) {
  let z = 1;
  const nid = (p) => id(p, z++);
  const meta = (t) => ({ erstelltAm: iso(t), erstelltVon: null, geaendertAm: iso(Math.max(0, t - 1)), geaendertVon: null, demo: true });
  const x = { v: GR_SEED_VERSION, auftraege: [], importe: [], foerderchecks: [], dokumente: [], versammlungen: [], stimmen: [], beschluesse: [], beitraege: [], aufloesungen: [], statuten: [], kontrollen: [] };
  const g = (k) => gemeinschaften.find((y) => y.seedSchluessel === k) || null;
  const alpen = g("alpenvorland");
  const sonne = g("sonnenland");

  // ------------------------------------------------------------ 1) Gründung BEG Alpenvorland
  const a1 = {
    id: nid("EGA"), paket: "gruendung", paketLabel: GR_PAKETE.gruendung.label, modell: "beg", zonelevel: 7, rechtsform: "verein", arbeitsname: "Bürgerenergie Alpenvorland (Demo)",
    plz: "5121", ort: "Ostermiething", bundesland: "O", netzbetreiberId: "ENB-OOE", erwarteteMitglieder: 60, erzeugungKwp: 85, speicherKwh: 0, haushaltErzeugung: false, gemeindeBeteiligt: true, investitionGeplant: false, organisator: true, zielTermin: tag(-90),
    ansprechpartner: { name: "Greta Gemeinde (Demo)", email: "kommune@example.com", telefon: "" }, nachricht: "Gemeinde und Betriebe wollen eine BEG über zwei Netzgebiete gründen (Demo).", bestehend: null,
    auftraggeberKontoId: konten.kommune || null, auftraggeber: { name: "Demo-Gemeinde Sonnendorf (fiktiv)", anschrift: "Hauptplatz 1, 5121 Ostermiething (Demo)", email: "kommune@example.com" },
    status: "beauftragt", angebot: { nummer: "ANG-2026-0007", betragNetto: 2400, ustPct: 20, ustEur: 480, betragBrutto: 2880, gueltigBis: tag(20), leistungen: GR_PAKETE.gruendung.leistungen, zahlungsplan: "50 % bei Auftrag, 50 % bei „EDA-bereit“ (Demo)", hinweise: "Demo-Angebot – fiktiver Betrag.", erstelltAm: iso(45), erstelltVon: null },
    signaturId: null, auftragAm: tag(40), annahme: { art: "manuell", am: tag(40), nachweis: "Unterschriebenes Angebot per Post (Demo)" }, stichtag: "", gemeinschaftId: alpen?.id || null, bearbeiterId: null,
    statutenEingaben: { taetigkeitsgebiet: "die Netzgebiete der Netz Oberösterreich GmbH und der Salzburg Netz GmbH im Innviertel und Flachgau (Demo)", kuendigungsfristWochen: "6", funktionsperiodeJahre: "3", einladungsfristTage: "14", gvTurnusJahre: 1, onlineGv: true, tarifeDurch: "vorstand" },
    kontrolle: null, verlauf: [{ am: iso(46), von: null, text: "Anfrage eingegangen (Demo)", oeffentlich: true }, { am: iso(45), von: null, text: "Angebot ANG-2026-0007 erstellt (Demo)", oeffentlich: true }, { am: iso(40), von: null, text: "Auftrag erteilt (Demo)", oeffentlich: true }],
    ...meta(46),
  };
  const fertig = { interessenten: [35, "48 Interessenten aus Gemeinde und Betrieben (Demo)"], nb_auskunft: [25, "Keine gemeinsame Trafostation – Zonelevel 7, netzgebietsübergreifend ab Phase 2 (Demo)"], smart_meter: [20, "alle Zählpunkte mit Smart Meter, 3 Einbauanträge offen (Demo)"], simulation: [20, ""], foerdercheck: [18, ""], machbarkeitsbericht: [17, "Bericht mit Empfehlung BEG, Verein (Demo)"], rechtsform: [15, "Verein"], statuten: [12, "Entwurf Musterstatuten BEG (Demo)"], gruendungsversammlung: [8, "Protokoll Gründungsversammlung (Demo)"], vereinsanzeige: [6, "Eingangsbestätigung BH Braunau (Demo)"] };
  a1.schritte = schritteErzeugen(a1, { gemeinschaft: alpen }).map((s) => {
    const f = fertig[s.schluessel];
    if (f) return { ...s, status: "erledigt", datum: tag(f[0]), gestartetAm: tag(f[0] + 3), wert: f[1], notiz: "" };
    if (s.schluessel === "organe") return { ...s, status: "in_arbeit", gestartetAm: tag(7), notiz: "Kassier und Rechnungsprüfer noch erfassen (Demo)." };
    if (s.schluessel === "zvr") return { ...s, status: "wartet_extern", gestartetAm: tag(6) };
    return s;
  });
  a1.status = auftragStatusAusSchritten(a1, a1.schritte);
  x.auftraege.push(a1);

  // ------------------------------------------------------------ 2) Anfrage Machbarkeits-Check
  const a2 = {
    id: nid("EGA"), paket: "check", paketLabel: GR_PAKETE.check.label, modell: "eeg", zonelevel: 3, rechtsform: "verein", arbeitsname: "EEG Mattigtal (Demo)", plz: "5230", ort: "Mattighofen", bundesland: "O", netzbetreiberId: "ENB-OOE",
    erwarteteMitglieder: 25, erzeugungKwp: 40, speicherKwh: 0, haushaltErzeugung: true, gemeindeBeteiligt: false, investitionGeplant: false, organisator: false, zielTermin: "",
    ansprechpartner: { name: "Max Mitglied (Demo)", email: "mitglied@example.com", telefon: "" }, nachricht: "Wir sind 25 Haushalte an einer Trafostation, drei mit PV (Demo).", bestehend: null,
    auftraggeberKontoId: konten.mitglied || null, auftraggeber: { name: "Max Mitglied (Demo)", anschrift: "", email: "mitglied@example.com" },
    status: "anfrage", angebot: null, signaturId: null, auftragAm: "", annahme: null, stichtag: "", gemeinschaftId: null, bearbeiterId: null, statutenEingaben: {}, kontrolle: null,
    verlauf: [{ am: iso(2), von: null, text: "Anfrage eingegangen (Demo)", oeffentlich: true }], ...meta(2),
  };
  a2.schritte = schritteErzeugen(a2);
  x.auftraege.push(a2);

  // ------------------------------------------------------------ 3) Wechsel EEG Seenland
  const a3 = {
    id: nid("EGA"), paket: "wechsel", paketLabel: GR_PAKETE.wechsel.label, modell: "eeg", zonelevel: 3, rechtsform: "verein", arbeitsname: "EEG Seenland (Demo)", plz: "5163", ort: "Mattsee", bundesland: "S", netzbetreiberId: "ENB-SBG",
    erwarteteMitglieder: 42, erzeugungKwp: 135, speicherKwh: 0, haushaltErzeugung: false, gemeindeBeteiligt: false, investitionGeplant: false, organisator: true, zielTermin: tag(-61),
    ansprechpartner: { name: "Uta Unternehmerin (Demo)", email: "unternehmen@example.com", telefon: "" }, nachricht: "Bestehende EEG, bisher mit EEG Faktura; die Selbstverwaltung wird zu aufwendig (Demo).",
    bestehend: { name: "EEG Seenland (Demo)", gemeinschaftsId: "", marktpartnerId: "RC105163", altdienstleister: "eegfaktura", mitglieder: 42, zaehlpunkte: 51, letzteAbrechnung: tag(30).slice(0, 7), verteilmodell: "dynamisch" },
    auftraggeberKontoId: konten.unternehmen || null, auftraggeber: { name: "Verein EEG Seenland (Demo), vertreten durch Uta Unternehmerin", anschrift: "Seeweg 5, 5163 Mattsee (Demo)", email: "unternehmen@example.com" },
    status: "angebot", angebot: { nummer: "ANG-2026-0011", betragNetto: 950, ustPct: 20, ustEur: 190, betragBrutto: 1140, gueltigBis: tag(-21), leistungen: GR_PAKETE.wechsel.leistungen, zahlungsplan: "nach Abschluss des Wechsels (Demo)", hinweise: "Demo-Angebot – fiktiver Betrag.", erstelltAm: iso(3), erstelltVon: null },
    signaturId: null, auftragAm: "", annahme: null, stichtag: "", gemeinschaftId: null, bearbeiterId: null, statutenEingaben: {}, kontrolle: null,
    verlauf: [{ am: iso(6), von: null, text: "Anfrage eingegangen (Demo)", oeffentlich: true }, { am: iso(3), von: null, text: "Angebot ANG-2026-0011 erstellt (Demo)", oeffentlich: true }], ...meta(6),
  };
  a3.schritte = schritteErzeugen(a3);
  x.auftraege.push(a3);

  // ------------------------------------------------------------ 4) Sonnenland: Versammlungen, Beschlüsse, Statuten
  if (sonne) {
    const konfig = { land: "AT", onlineGv: true, einladungsfristTage: 14 };
    const gv1 = { id: nid("EGV"), gemeinschaftId: sonne.id, ...versammlungBereinigen({ titel: "Ordentliche Mitgliederversammlung 2025 (Demo)", art: "ordentlich", form: "hybrid", datum: `${tag(380)}T19:00`, ort: "Gasthaus zur Post, Ried im Innkreis (Demo)", abstimmungBis: `${tag(380)}T21:00`, einleitung: "Bericht über das erste volle Betriebsjahr (Demo).", tagesordnung: gvTagesordnungVorlage({ art: "ordentlich", rechtsform: "verein", tarif: true, beitrag: true }) }, konfig), status: "abgeschlossen", eingeladenAm: iso(400), abgeschlossenAm: iso(380), ...meta(410) };
    const stimmberechtigt = mitglieder.filter((m) => m.gemeinschaftId === sonne.id && ["aufgenommen", "aktiv", "gekuendigt"].includes(m.status)).length || 20;
    const online = [];
    for (let i = 0; i < 7; i++) {
      const st = {};
      for (const t of gv1.tagesordnung.filter((y) => y.beschluss)) st[t.id] = i === 6 && t.titel.startsWith("Beschluss über Tarife") ? "nein" : i === 5 ? "enthaltung" : "ja";
      online.push({ id: nid("EGS"), gvId: gv1.id, mitgliedId: `demo-${i}`, am: iso(381), stimmen: st });
    }
    const zusatz = { anwesend: 6, tops: Object.fromEntries(gv1.tagesordnung.filter((y) => y.beschluss).map((t) => [t.id, { ja: 6, nein: 0, enthaltung: 0 }])) };
    gv1.ergebnis = ergebnisRechnen(gv1, online, stimmberechtigt, zusatz);
    gv1.protokoll = { versammlungsleiter: "Otto Obmann (Demo)", protokollfuehrer: "Sabine Schrift (Demo)", anwesend: 6, tops: zusatz.tops, notiz: "Fiktives Protokoll für die Vorführung.", sha256: sha256(stimmenKanonisch(gv1.id, online)), am: iso(380) };
    x.versammlungen.push(gv1);
    x.stimmen.push(...online);
    for (const b of beschluesseAusVersammlung(gv1, gv1.ergebnis)) x.beschluesse.push({ id: nid("EBS"), gemeinschaftId: sonne.id, ...b, ...meta(380) });
    x.beschluesse.push({ id: nid("EBS"), gemeinschaftId: sonne.id, gremium: "vorstand", datum: tag(100), gegenstand: "Preisblatt 2026 mit Mittagsstrom (Demo)", kategorie: "tarif", text: "Bezugspreis 11,5 ct, Einspeisepreis 8,5 ct, Mittagsstrom 9,5 ct (April–September 11–15 Uhr). Information der Mitglieder einen Monat vorher (Demo).", ja: 3, nein: 0, enthaltung: 0, mehrheit: "einfach", angenommen: true, versammlungId: "", top: "", ...meta(100) });
    const gv2 = { id: nid("EGV"), gemeinschaftId: sonne.id, ...versammlungBereinigen({ titel: "Ordentliche Mitgliederversammlung 2026 (Demo)", art: "ordentlich", form: "hybrid", datum: `${tag(-40)}T19:00`, ort: "Gemeindesaal Sonnendorf (Demo)", abstimmungBis: `${tag(-40)}T21:30`, einleitung: "Schwerpunkt: Anpassung der Statuten an das ElWG und Bestätigung des Organisators (Demo).", tagesordnung: gvTagesordnungVorlage({ art: "ordentlich", rechtsform: "verein", elwg: true, organisator: true, wahl: false }) }, konfig), status: "entwurf", ...meta(5) };
    x.versammlungen.push(gv2);
    x.statuten.push({ gemeinschaftId: sonne.id, eingaben: { taetigkeitsgebiet: "das Gemeindegebiet von Ried im Innkreis im Bereich der Trafostation Ried-Nord (Demo)", kuendigungsfristWochen: "6", funktionsperiodeJahre: "3", einladungsfristTage: "14", gvTurnusJahre: 1, onlineGv: true, tarifeDurch: "vorstand" }, ...meta(30) });
  }
  return x;
}
