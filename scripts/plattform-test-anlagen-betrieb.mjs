// scripts/plattform-test-anlagen-betrieb.mjs
//
// Teil der Testreihe scripts/plattform-test-anlagen.mjs (nicht einzeln starten):
//   0. Betriebsführung – reine Regeln (src/lib/plattform/betrieb/kern.js), läuft auch mit --nur-logik ohne Server
//   8. Betriebsführung Ende zu Ende gegen den Dev-Server (Ticket, Auftrag, Versicherung, Wartung, Prüfung, Lager, Zähler, Bericht)
//   9. Energie – Beschaffungsbericht je Kunde (PDF, Rechte)
// T = { pruefe, abschnitt, Client, LAUF, monatVor } aus der Haupt-Testreihe.

import * as BK from "../src/lib/plattform/betrieb/kern.js";

const istPdf = (bytes) => String.fromCharCode(...bytes.slice(0, 5)) === "%PDF-";

// ============================================================ 0. reine Regeln
export function logikBetrieb({ pruefe, abschnitt }) {
  abschnitt("0. Betriebsführung – reine Regeln (betrieb/kern.js)");
  const wirft = (fn, status) => {
    try {
      fn();
      return false;
    } catch (e) {
      return e instanceof BK.BetriebFehler && (!status || e.status === status);
    }
  };
  const jetzt = Date.parse("2026-09-30T12:00:00Z");
  let s = BK.slaStatus({ schwere: "kritisch", erkanntAm: "2026-09-30T09:00:00Z" }, jetzt);
  pruefe(s.ampel === "rot" && s.reaktion.verletzt, "SLA kritisch: Reaktion 2 h überschritten → rot", s);
  s = BK.slaStatus({ schwere: "kritisch", erkanntAm: "2026-09-30T09:00:00Z", quittiertAm: "2026-09-30T10:30:00Z" }, jetzt);
  pruefe(s.reaktion.erfuellt && s.ampel === "gruen", "SLA: rechtzeitig quittiert → grün");
  pruefe(BK.slaStatus({ schwere: "mittel", erkanntAm: "2026-09-29T18:00:00Z" }, jetzt).ampel === "gelb", "SLA mittel: 75 % der Reaktionszeit verbraucht → gelb");
  const jahr = BK.erwarteteEnergieKwh({ jahresKwh: 100000, vonMs: Date.UTC(2025, 0, 1), bisMs: Date.UTC(2026, 0, 1) });
  pruefe(Math.abs(jahr - 100000) < 500, "Ertragsprofil: Jahressumme = Prognose (± 0,5 %)", Math.round(jahr));
  pruefe(BK.erwarteteEnergieKwh({ jahresKwh: 100000, vonMs: Date.UTC(2025, 5, 15, 21), bisMs: Date.UTC(2025, 5, 16, 2) }) === 0, "Nachts keine erwartete Erzeugung");
  const ea = BK.ertragsausfall({ jahresKwh: 100000, von: "2026-06-10T08:00:00Z", bis: "2026-06-12T08:00:00Z", betroffenPct: 50, arbeitspreisCt: 12 });
  pruefe(ea.stunden === 48 && Math.abs(ea.ausfallKwh - ea.sollKwh / 2) < 0.2 && Math.abs(ea.erloesCtKwh - (0.7 * 12 + 0.3 * 4)) < 0.001, "Ertragsausfall: 50 % × Soll, Erlös Eigenverbrauch/Marktwert", ea);
  pruefe(wirft(() => BK.ertragsausfall({ jahresKwh: 1, von: "2026-06-12T08:00:00Z", bis: "2026-06-10T08:00:00Z" }), 422) && wirft(() => BK.ertragsausfall({ jahresKwh: 1, von: new Date().toISOString(), bis: new Date(Date.now() + 86400e3).toISOString() }), 422), "Ertragsausfall: Ende vor Beginn bzw. in der Zukunft → 422");
  pruefe(wirft(() => BK.behebungPruefen({ ursacheKategorie: "", massnahme: "Tausch" }), 422) && BK.behebungPruefen({ ursacheKategorie: "modul", massnahme: "Modul getauscht" }), "Beheben nur mit Ursache und Maßnahme");
  pruefe(wirft(() => BK.auftragUebergang({ status: "angelegt", dienstleister: "X GmbH" }, "erledigt", { bericht: "lang genug berichtet" }), 409), "Auftrag: angelegt → erledigt unzulässig (409)");
  pruefe(wirft(() => BK.auftragUebergang({ status: "beauftragt" }, "terminiert", {}), 422) && BK.auftragUebergang({ status: "beauftragt" }, "terminiert", { termin: "2026-10-02T08:00" }).termin === "2026-10-02T08:00", "Auftrag: Termin Pflicht beim Terminieren");
  pruefe(wirft(() => BK.auftragUebergang({ status: "vor_ort" }, "erledigt", { bericht: "kurz" }), 422), "Auftrag: Einsatzbericht Pflicht");
  const fall = { status: "entwurf", versicherer: "V AG", schadentag: "2026-09-20", schadenEur: 1800, schadenbeschreibung: "Hagel an zwei Modulen", meldefristBis: BK.meldefristBis("2026-09-20") };
  pruefe(fall.meldefristBis === "2026-09-27" && BK.versicherungUebergang(fall, "gemeldet", { gemeldetAm: "2026-09-30" }, "2026-09-30").verspaetet === true, "Versicherung: Meldefrist 7 Tage, verspätete Meldung markiert");
  pruefe(wirft(() => BK.versicherungUebergang(fall, "reguliert", { erstattetEur: 1 }), 409) && wirft(() => BK.versicherungUebergang({ ...fall, schadenbeschreibung: "" }, "gemeldet", {}), 422), "Versicherung: Automat und Pflichtangaben");
  const de = BK.planVorschlag({ land: "DE", typ: "dach" });
  pruefe(de.find((p) => p.art === "pruefung")?.intervallMonate === 48 && /DGUV/.test(de.find((p) => p.art === "pruefung").norm), "Wartungsvorlage DE: E-Check/DGUV V3, 48 Monate");
  pruefe(/ESV 2012/.test(BK.planVorschlag({ land: "AT" }).find((p) => p.art === "pruefung").norm) && /NIV/.test(BK.planVorschlag({ land: "CH" }).find((p) => p.art === "pruefung").norm), "Wartungsvorlagen AT (ESV/OVE E 8101) und CH (NIV/SiNa)");
  pruefe(!BK.planVorschlag({ land: "AT", typ: "speicher", speicherKwh: 500 }).some((p) => ["thermografie", "reinigung"].includes(p.art)) && BK.planVorschlag({ land: "DE" }, de).length === 0, "Speicher ohne PV-Wartung; vorhandene Pläne nicht doppelt");
  pruefe(BK.plusMonate("2026-01-31", 1) === "2026-02-28" && BK.planStand({ aktiv: true, naechsteFaelligkeit: "2026-09-01" }, "2026-09-30").stufe === "ueberfaellig", "Fälligkeit: Monatsende gekappt, überfällig erkannt");
  pruefe(BK.pruefungBewerten({ strings: [{ bezeichnung: "S1", uocV: 700, rIsoMOhm: 0.8 }] }).ergebnis === "nicht_bestanden" && BK.pruefungBewerten({ strings: [{ bezeichnung: "S1", uocV: 100, rIsoMOhm: 0.8 }] }).ergebnis === "bestanden", "Prüfung: Riso-Grenzwert IEC 62446-1 (1 MΩ bzw. 0,5 MΩ bis 120 V)");
  pruefe(BK.pruefungBewerten({ thermografie: [{ ort: "M3", deltaK: 25 }] }).ergebnis === "maengel" && BK.pruefungBewerten({ punkte: { rcd: false } }).ergebnis === "nicht_bestanden", "Prüfung: Thermografie ΔT > 20 K Mangel, RCD nicht i. O. = Gefahr");
  pruefe(wirft(() => BK.bestandNach({ bestand: 1 }, { art: "entnahme", menge: 2 }), 409) && BK.bestandNach({ bestand: 5 }, { art: "korrektur", menge: 3 }) === 3 && BK.nachbestellung({ bestand: 1, mindestbestand: 2 }).menge === 3, "Lager: kein negativer Bestand, Korrektur, Nachbestellvorschlag");
  const fr = BK.fristenErmitteln({ anlage: { id: "AL-X" }, messpunkte: [{ id: "M1", zaehlernummer: "1", abrechnungsrelevant: true, eichgueltigBis: "2026-09-01" }, { id: "M2", zaehlernummer: "2", abrechnungsrelevant: true }], komponenten: [{ id: "K1", garantieBis: "2026-11-01" }, { id: "K2", garantieBis: "2031-01-01" }] }, "2026-09-30");
  pruefe(fr[0].stufe === "ueberfaellig" && fr.some((f) => f.stufe === "fehlt") && fr.filter((f) => f.art === "garantie").length === 1, "Fristen: Eichung überfällig/fehlend, Garantie im 180-Tage-Fenster", fr);
  const kz = BK.kennzahlen({ kwp: 100, istKwh: 10000, sollKwh: 12000, einstrahlungKwhM2: 120, ausfallKwh: 600 });
  pruefe(Math.abs(kz.pr - 10000 / 12000) < 1e-9 && Math.abs(kz.verfuegbarkeit - 0.95) < 1e-9 && BK.kennzahlen({ kwp: 100, istKwh: 1, sollKwh: 2 }).pr === null, "PR nur mit Einstrahlung, energetische Verfügbarkeit");
  pruefe(Math.round(BK.ausfallJeMonat([{ ertragsausfall: { ausfallKwh: 100 }, ausfallBeginn: "2026-06-30T12:00:00Z", ausfallEnde: "2026-07-01T12:00:00Z" }])["2026-06"]) === 50, "Ausfall über den Monatswechsel anteilig verteilt");
  const pl = BK.plausibilisieren({ monat: "2026-08", menge: 10000, monitoringKwh: 7000, eichgueltigBis: "2031-12-31" });
  pruefe(pl.stufe === "fehler" && wirft(() => BK.freigabePruefen(pl, "kurz"), 422) && BK.freigabePruefen(pl, "Wandlerfaktor korrigiert, vor Ort bestätigt"), "Plausibilisierung: > 25 % Abweichung nur mit Begründung freigebbar");
  const eich = BK.plausibilisieren({ monat: "2026-08", menge: 1, monitoringKwh: 1, eichgueltigBis: "2026-08-15" });
  pruefe(eich.eichFehler && wirft(() => BK.freigabePruefen(eich, "Begründung ausreichend lang"), 409), "Eichfrist abgelaufen → Freigabe gesperrt (409)");
  pruefe(BK.berichtZeitraum("2026-08").monate.length === 1 && BK.berichtZeitraum("2025").monate.length === 12 && wirft(() => BK.berichtZeitraum("2026-13"), 422) && wirft(() => BK.berichtZeitraum("2099-01"), 422), "Berichtszeitraum Monat/Jahr, ungültig bzw. Zukunft → 422");
}

// ============================================================ 8. Betriebsführung Ende zu Ende
export async function betriebsfuehrung({ pruefe, abschnitt, LAUF, monatVor }, { admin, betrieb, fremd, kunde, akquise, lesen, tid }) {
  abschnitt("8. Betriebsführung: Ticket, Auftrag, Versicherung, Wartung, Prüfung, Lager, Zähler, Bericht");
  const B = "/api/admin/anlagen/betrieb";
  let r = await kunde.get(B);
  pruefe(r.status === 403, "Kunde: Betriebsführung → 403", r.status);
  if (akquise?.nutzer) {
    r = await akquise.get(B);
    pruefe(r.status === 403, "Unterrolle Akquise: Betriebsführung → 403", r.status);
  }
  r = await betrieb.get(B);
  pruefe(r.status === 200 && r.json.zaehler && Array.isArray(r.json.fristen) && r.json.ersatzteile?.length >= 1, "Betrieb: Übersicht mit Kennzahlen, Fristen, Lager", r.status);
  pruefe((r.json.tickets || []).every((t) => t.sla && ["rot", "gelb", "gruen"].includes(t.sla.ampel)), "Offene Störungen mit SLA-Ampel");

  // Ticket
  r = await betrieb.post("/api/admin/anlagen/stoerungen", { anlageId: tid, schwere: "hoch", titel: `Totalausfall Wechselrichter ${LAUF}`, text: "Wechselrichter ohne Anzeige (Test)." });
  const st = r.json.stoerung?.id;
  pruefe(r.status === 201 && st, "Störung für das Ticket erfasst", r.status);
  r = await betrieb.get(`${B}/stoerung/${st}`);
  pruefe(r.status === 200 && r.json.ticket?.sla?.vorgabe?.reaktionH === 4, "Ticket mit SLA (hoch: Reaktion 4 h)", r.json.ticket?.sla);
  r = await betrieb.post(`${B}/stoerung/${st}`, { aktion: "beheben" });
  pruefe(r.status === 422, "Beheben ohne Ursache → 422", r.status);
  const beginn = new Date(Date.now() - 2 * 86400e3);
  beginn.setUTCHours(6, 0, 0, 0);
  r = await betrieb.post(`${B}/stoerung/${st}`, { aktion: "speichern", daten: { ursacheKategorie: "wechselrichter", ursacheText: "Lüfter blockiert", massnahme: "Lüftereinheit getauscht", ausfallBeginn: beginn.toISOString(), ausfallEnde: new Date(Date.now() - 3600e3).toISOString(), betroffenPct: 50 }, kontext: { jahresKwh: 1e12 } });
  const ea = r.json.ticket?.ertragsausfall;
  pruefe(r.status === 200 && ea?.ausfallKwh > 0 && ea.ausfallEur > 0 && ea.betroffenPct === 50, "Ertragsausfall berechnet (kWh, €)", ea);
  pruefe(ea && ea.sollKwh < 240 * 24 * 2, "Kontext aus dem Browser wird ignoriert (Prognose serverseitig)", ea?.sollKwh);
  r = await betrieb.post(`${B}/stoerung/${st}`, { aktion: "speichern", daten: { ursacheKategorie: "wechselrichter", massnahme: "Tausch", ausfallBeginn: beginn.toISOString(), ausfallEnde: new Date(Date.now() + 86400e3).toISOString(), betroffenPct: 50 } });
  pruefe(r.status === 422, "Ausfallende in der Zukunft → 422", r.status);
  r = await kunde.get(`${B}/stoerung/${st}`);
  pruefe(r.status === 403, "Kunde: Ticket-API → 403", r.status);

  // Serviceauftrag
  r = await betrieb.post(`${B}/auftraege`, { anlageId: tid, stoerungId: st, art: "dienstleister", dienstleister: "Service-Partner (Test)", beschreibung: "Wechselrichter prüfen, Lüfter tauschen" });
  const au = r.json.auftrag?.id;
  pruefe(r.status === 200 && r.json.auftrag?.status === "angelegt", "Serviceauftrag angelegt", r.status);
  r = await betrieb.post(`${B}/auftraege/${au}`, { status: "erledigt", bericht: "Alles erledigt und geprüft." });
  pruefe(r.status === 409, "Auftrag: angelegt → erledigt → 409", r.status);
  r = await betrieb.post(`${B}/auftraege/${au}`, { status: "beauftragt" });
  pruefe(r.status === 200 && r.json.auftrag?.status === "beauftragt", "Auftrag beauftragt", r.status);
  r = await betrieb.post(`${B}/auftraege/${au}`, { status: "terminiert" });
  pruefe(r.status === 422, "Terminieren ohne Termin → 422", r.status);
  const termin = `${new Date(Date.now() + 2 * 86400e3).toISOString().slice(0, 10)}T08:00`;
  r = await betrieb.post(`${B}/auftraege/${au}`, { status: "terminiert", termin });
  pruefe(r.status === 200 && r.json.auftrag?.termin === termin, "Termin gesetzt", r.json.auftrag?.termin);
  r = await fremd.get("/api/portal/benachrichtigungen");
  pruefe((r.json.eintraege || []).some((b) => /Servicetermin/.test(b.titel)), "Kunde wird über den Servicetermin informiert (Zugang)");
  r = await betrieb.post(`${B}/stoerung/${st}`, { aktion: "beheben" });
  pruefe(r.status === 409, "Beheben mit offenem Auftrag → 409", r.status);
  const pdf = await betrieb.anfrage("GET", `${B}/auftraege/${au}`, undefined, { roh: true });
  const pdfBytes = new Uint8Array(await pdf.arrayBuffer());
  pruefe(pdf.status === 200 && /application\/pdf/.test(pdf.headers.get("content-type") || "") && istPdf(pdfBytes), "Auftragsschreiben als PDF", pdf.status);
  r = await betrieb.post(`${B}/auftraege/${au}`, { status: "erledigt", bericht: "kurz" });
  pruefe(r.status === 422, "Erledigt ohne Einsatzbericht → 422", r.status);
  r = await betrieb.post(`${B}/auftraege/${au}`, { status: "erledigt", bericht: "Lüftereinheit getauscht, Wechselrichter speist wieder ein." });
  pruefe(r.status === 200 && r.json.auftrag?.status === "erledigt", "Auftrag erledigt", r.status);

  // Ersatzteil
  r = await betrieb.post(`${B}/ersatzteile`, { bezeichnung: `Lüftereinheit ${LAUF} (Test)`, art: "wechselrichter", hersteller: "Test", artikelnummer: `LE-${LAUF}`, bestand: 2, mindestbestand: 2 });
  const et = r.json.teil?.id;
  pruefe(r.status === 200 && r.json.teil?.nachbestellung?.menge === 2, "Ersatzteil angelegt, Nachbestellvorschlag (Bestand ≤ Mindestbestand)", r.json.teil);
  r = await betrieb.post(`${B}/ersatzteile/${et}`, { bewegung: "entnahme", menge: 5, stoerungId: st });
  pruefe(r.status === 409, "Entnahme über Bestand → 409", r.status);
  r = await betrieb.post(`${B}/ersatzteile/${et}`, { bewegung: "entnahme", menge: 1 });
  pruefe(r.status === 422, "Entnahme ohne Anlage/Störung → 422", r.status);
  r = await betrieb.post(`${B}/ersatzteile/${et}`, { bewegung: "entnahme", menge: 1, stoerungId: st });
  pruefe(r.status === 200 && r.json.teil?.bestand === 1 && r.json.bewegung?.anlageId === tid, "Entnahme der Störung zugeordnet, Bestand 1", r.json.teil?.bestand);
  r = await betrieb.post(`${B}/ersatzteile/${et}`, { bewegung: "korrektur", menge: 4 });
  pruefe(r.status === 422, "Inventurkorrektur ohne Begründung → 422", r.status);

  // Beheben
  r = await betrieb.post(`${B}/stoerung/${st}`, { aktion: "beheben" });
  pruefe(r.status === 200 && r.json.ticket?.status === "behoben" && r.json.ticket?.entnahmen?.length === 1, "Behoben mit Ursache/Maßnahme (Entnahme im Ticket)", r.json.ticket?.status);
  r = await fremd.get("/api/portal/benachrichtigungen");
  pruefe((r.json.eintraege || []).some((b) => /behoben/i.test(b.titel)), "Kunde über die Behebung informiert");

  // Versicherungsfall
  const tag = new Date(Date.now() - 10 * 86400e3).toISOString().slice(0, 10);
  r = await betrieb.post(`${B}/versicherungen`, { anlageId: tid, stoerungId: st, art: "allgefahren", versicherer: "Beispiel-Versicherung (Test)", schadentag: tag, schadenEur: 2400, schadenbeschreibung: "Überspannungsschaden am Wechselrichter (Test)" });
  const vf = r.json.fall?.id;
  pruefe(r.status === 200 && r.json.fall?.meldefristTage < 0 && r.json.fall?.ertragsausfallEur > 0, "Versicherungsfall: Meldefrist überschritten, Ertragsausfall aus dem Ticket übernommen", r.json.fall);
  r = await betrieb.post(`${B}/versicherungen`, { anlageId: tid, stoerungId: st, art: "allgefahren", versicherer: "X", schadentag: tag });
  pruefe(r.status === 409, "Zweiter offener Fall gleicher Art zur Störung → 409", r.status);
  r = await betrieb.post(`${B}/versicherungen/${vf}`, { status: "reguliert", erstattetEur: 100 });
  pruefe(r.status === 409, "Entwurf → reguliert → 409", r.status);
  r = await betrieb.post(`${B}/versicherungen/${vf}`, { status: "gemeldet", schadennummer: "S-4711" });
  pruefe(r.status === 200 && r.json.fall?.verspaetet === true && r.json.fall?.schadennummer === "S-4711", "Gemeldet (nach interner Frist markiert)", r.json.fall);
  r = await betrieb.post(`${B}/versicherungen/${vf}`, { status: "reguliert", erstattetEur: 1900 });
  pruefe(r.status === 200 && r.json.fall?.status === "reguliert" && r.json.fall?.erstattetEur === 1900, "Reguliert mit Erstattung", r.json.fall?.status);

  // Wartungsplan und Prüfprotokoll
  r = await betrieb.post(`${B}/anlage/${tid}`, { aktion: "vorschlag" });
  pruefe(r.status === 200 && r.json.angelegt >= 5, "Standard-Wartungsplan DE übernommen (inkl. Speicher)", r.json);
  r = await betrieb.post(`${B}/anlage/${tid}`, { aktion: "vorschlag" });
  pruefe(r.status === 200 && r.json.angelegt === 0, "Vorlage nicht doppelt", r.json);
  r = await betrieb.post(`${B}/anlage/${tid}`, { aktion: "plan", daten: { art: "inspektion", bezeichnung: "Ohne Datum", intervallMonate: 12 } });
  pruefe(r.status === 422, "Plan ohne Fälligkeit → 422", r.status);
  const heute = new Date().toISOString().slice(0, 10);
  r = await betrieb.post(`${B}/anlage/${tid}`, { aktion: "protokoll", daten: { art: "thermografie", datum: heute, pruefer: "Thermograf (Test)", einstrahlungWm2: 400, thermografie: [{ ort: "Modul 1", deltaK: 12 }] } });
  pruefe(r.status === 422, "Thermografie unter 600 W/m² → 422", r.status);
  r = await betrieb.post(`${B}/anlage/${tid}`, { aktion: "protokoll", daten: { art: "wiederkehrend", datum: "2099-01-01", pruefer: "EFK (Test)", strings: [{ bezeichnung: "S1", uocV: 700, rIsoMOhm: 50 }] } });
  pruefe(r.status === 422, "Prüfdatum in der Zukunft → 422", r.status);
  r = await betrieb.post(`${B}/anlage/${tid}`, { aktion: "protokoll", daten: { art: "wiederkehrend", datum: heute, pruefer: "Elektrofachkraft (Test)", firma: "Prüfdienst (Test)", strings: [{ bezeichnung: "S1", uocV: 702, iscA: 10.2, rIsoMOhm: 0.4 }, { bezeichnung: "S2", uocV: 700, iscA: 10.1, rIsoMOhm: 30 }], punkte: { rcd: true, schutzleiter: true } } });
  const pk = r.json.protokoll;
  pruefe(r.status === 200 && pk?.ergebnis === "nicht_bestanden" && pk?.stoerungId, "Prüfprotokoll: Riso zu niedrig → nicht bestanden, Störung angelegt", pk?.ergebnis);
  r = await admin.get(`/api/portal/anlagen/stoerungen?anlage=${tid}`);
  pruefe((r.json.stoerungen || []).some((s) => s.id === pk?.stoerungId && s.schwere === "kritisch"), "Folge-Störung (kritisch) im Leitstand");
  const ppdf = await betrieb.anfrage("GET", `${B}/protokolle/${pk?.id}`, undefined, { roh: true });
  pruefe(ppdf.status === 200 && /application\/pdf/.test(ppdf.headers.get("content-type") || ""), "Prüfprotokoll als PDF", ppdf.status);
  r = await betrieb.get(`${B}/anlage/${tid}`);
  const plan = (r.json.plaene || []).find((p) => p.art === "pruefung");
  pruefe(r.status === 200 && plan?.letzteDurchfuehrung === heute && plan?.naechsteFaelligkeit > heute, "Wartungsplan nach Prüfung fortgeschrieben", plan);
  pruefe((r.json.protokolle || []).length === 1 && r.json.kennzahlen?.zeilen?.length === 12, "Anlagen-Detail: Protokolle, Kennzahlen 12 Monate", r.json.kennzahlen?.zeilen?.length);
  pruefe((r.json.fristen || []).some((f) => f.art === "eichung"), "Fristen: Eichgültigkeit des Zählers (nicht gepflegt) gemeldet");

  // Einstrahlung → PR
  const vormonat = monatVor(1);
  r = await betrieb.post(`${B}/anlage/${tid}`, { aktion: "einstrahlung", monat: vormonat, kwhM2: 110 });
  pruefe(r.status === 422, "Einstrahlung ohne Quelle → 422", r.status);
  r = await betrieb.post(`${B}/anlage/${tid}`, { aktion: "einstrahlung", monat: vormonat, kwhM2: 110, quelle: "Referenzzelle vor Ort (Test)" });
  pruefe(r.status === 200, "Einstrahlung erfasst", r.status);
  r = await betrieb.get(`${B}/anlage/${tid}`);
  const zk = (r.json.kennzahlen?.zeilen || []).find((z) => z.monat === vormonat);
  pruefe(zk && zk.einstrahlungKwhM2 === 110 && (zk.istKwh === null || zk.pr > 0), "Performance Ratio für den Monat mit Einstrahlung", zk);

  // Zählerfreigabe
  const zeilen = r.json.plausibilisierung?.zeilen || [];
  const z1 = zeilen.find((z) => z.monat === vormonat && z.register === "1.8.0");
  pruefe(!!z1 && z1.befund && z1.befund.befunde.some((b) => /Eichgültigkeit/.test(b.text)), "Plausibilisierung: Befund je Monatswert (Eichfrist fehlt)", z1?.befund);
  if (z1) {
    r = await betrieb.post(`${B}/anlage/${tid}`, { aktion: "freigabe", messpunktId: z1.messpunktId, register: "1.8.0", monat: vormonat });
    if (z1.befund.stufe === "fehler") {
      pruefe(r.status === 422, "Auffälliger Wert ohne Begründung → 422", r.status);
      r = await betrieb.post(`${B}/anlage/${tid}`, { aktion: "freigabe", messpunktId: z1.messpunktId, register: "1.8.0", monat: vormonat, begruendung: "Ablesung vor Ort bestätigt (Test)" });
    }
    pruefe(r.status === 200, "Monatswert freigegeben", r.status);
    r = await admin.get(`/api/portal/anlagen/${tid}/zaehler`);
    pruefe((r.json.abrechnung || []).some((z) => z.monat === vormonat && z.register === "1.8.0" && z.geprueft), "Freigegebener Wert gilt für die Abrechnung als geprüft", r.json.abrechnung?.slice(0, 3));
  }
  r = await admin.post(`/api/admin/anlagen/${tid}/eintraege`, { art: "messpunkt", daten: { zaehlernummer: `1ALT${LAUF}`, art: "erzeugung", messstelle: "geeicht", abrechnungsrelevant: true, eichgueltigBis: "2025-01-31" } });
  const mpAlt = r.json.eintrag?.id;
  await admin.post(`/api/admin/anlagen/${tid}/eintraege`, { art: "monatswert", daten: { messpunktId: mpAlt, register: "2.8.0", monat: vormonat, stand: 5000 } });
  r = await betrieb.post(`${B}/anlage/${tid}`, { aktion: "freigabe", messpunktId: mpAlt, register: "2.8.0", monat: vormonat, begruendung: "Begründung ausreichend lang" });
  pruefe(r.status === 409, "Eichfrist abgelaufen → Freigabe 409", r.status);

  // Bericht
  const bpdf = await betrieb.anfrage("GET", `${B}/bericht?anlageId=${tid}&zeitraum=${vormonat}`, undefined, { roh: true });
  const bBytes = new Uint8Array(await bpdf.arrayBuffer());
  pruefe(bpdf.status === 200 && istPdf(bBytes) && bBytes.length > 3000, "Monatsbericht als PDF", bpdf.status);
  const jpdf = await betrieb.anfrage("GET", `${B}/bericht?anlageId=${tid}&zeitraum=${new Date().getUTCFullYear()}`, undefined, { roh: true });
  pruefe(jpdf.status === 200 && /application\/pdf/.test(jpdf.headers.get("content-type") || ""), "Jahresbericht (laufend) als PDF", jpdf.status);
  r = await betrieb.get(`${B}/bericht?anlageId=${tid}&zeitraum=2099-01`);
  pruefe(r.status === 422, "Bericht in der Zukunft → 422", r.status);
  r = await kunde.get(`${B}/bericht?anlageId=${tid}&zeitraum=${vormonat}`);
  pruefe(r.status === 403, "Kunde: Bericht der Betriebsführung → 403", r.status);

  // Lauf, Rechte, CSRF, Seiten
  r = await betrieb.post(B, { aktion: "lauf" });
  pruefe(r.status === 200 && typeof r.json.ergebnis?.fristen === "number", "Fristen-Lauf (Aufgaben, SLA, Lager)", r.json.ergebnis);
  r = await betrieb.post(B, { aktion: "lauf" });
  pruefe(r.status === 200 && r.json.ergebnis?.fristen === 0 && r.json.ergebnis?.lager === 0, "Zweiter Lauf meldet nichts doppelt", r.json.ergebnis);
  if (lesen?.nutzer) {
    r = await lesen.get(B);
    pruefe(r.status === 200 && r.json.darfSchreiben === false, "Nur-lesen: Übersicht ohne Schreibrecht", r.status);
    r = await lesen.post(B, { aktion: "lauf" });
    pruefe(r.status === 403, "Nur-lesen: Lauf → 403", r.status);
  }
  r = await betrieb.post(`${B}/auftraege`, { anlageId: tid, art: "techniker", beschreibung: "Test" }, { origin: "https://boese.example.org" });
  pruefe(r.status === 403, "CSRF: fremder Origin → 403", r.status);
  for (const [cl, pfad, soll] of [[betrieb, "/portal/admin/anlagen/betrieb", 200], [betrieb, `/portal/admin/anlagen/betrieb/${tid}`, 200], [betrieb, `/portal/admin/anlagen/betrieb/stoerung/${st}`, 200], [kunde, "/portal/admin/anlagen/betrieb", 404]]) {
    r = await cl.get(pfad);
    const nf = r.status === 404 || r.text.includes("NEXT_HTTP_ERROR_FALLBACK;404");
    pruefe(soll === 404 ? nf : r.status === 200 && !nf, `${pfad} (${cl.name}) → ${soll}`, r.status);
  }
}

// ============================================================ 9. Energie: Beschaffungsbericht je Kunde
export async function energieBericht({ pruefe, abschnitt, Client }, { kunde, fremd }) {
  abschnitt("9. Energie: Beschaffungsbericht je Kunde (PDF)");
  const energie = new Client("bo-energie");
  const ek1 = new Client("energie-kunde1");
  if (!(await energie.versucheLogin("bo-energie@example.com")) || !(await ek1.versucheLogin("energie-kunde1@example.com"))) {
    pruefe(true, "Energie-Demokonten nicht vorhanden – übersprungen");
    return;
  }
  const url = (id) => `/api/portal/energie/dokument?art=kundenbericht&id=${id}`;
  let res = await energie.anfrage("GET", url(ek1.nutzer.id), undefined, { roh: true });
  let b = new Uint8Array(await res.arrayBuffer());
  pruefe(res.status === 200 && istPdf(b) && /beschaffungsbericht/.test(res.headers.get("content-disposition") || ""), "Backoffice Energie: Bericht für den Kunden", res.status);
  res = await ek1.anfrage("GET", url(ek1.nutzer.id), undefined, { roh: true });
  pruefe(res.status === 200 && /application\/pdf/.test(res.headers.get("content-type") || ""), "Kunde: eigener Bericht", res.status);
  res = await fremd.anfrage("GET", url(ek1.nutzer.id), undefined, { roh: true });
  b = new Uint8Array(await res.arrayBuffer());
  const text = new TextDecoder("latin1").decode(b);
  pruefe(res.status === 200 && !(ek1.nutzer.firma && text.includes(ek1.nutzer.firma)), "Anderer Kunde erhält nur den eigenen Bericht (Kennung wird ignoriert)", res.status);
  const lf = new Client("lieferant");
  if (await lf.versucheLogin("lieferant@example.com")) {
    res = await lf.anfrage("GET", url(ek1.nutzer.id), undefined, { roh: true });
    pruefe(res.status === 403, "Versorger: Beschaffungsbericht → 403", res.status);
  }
  const r = await kunde.get("/api/portal/energie/dokument?art=unbekannt");
  pruefe(r.status === 422, "Unbekannte Dokumentart → 422", r.status);
}
