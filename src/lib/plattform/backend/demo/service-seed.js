// src/lib/plattform/backend/demo/service-seed.js
//
// Demo-Daten „Dokumente, Signatur, Termine, Service & HR“ – ALLES FIKTIV (Namen mit „(Demo)“, example.com,
// IP-Adressen aus dem Dokumentationsbereich 198.51.100.0/24). Wird beim ersten Zugriff auf db.service einmalig
// ergänzt (übrige Demo-Daten bleiben unverändert). Synchron (läuft ggf. beim Rendern, siehe service-kern.js).

import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { UPLOAD_ORDNER } from "./speicher";
import { jetzt, neueId, vorTagen } from "./hilfen";
import { ARBEITSZEITEN_STANDARD, TERMIN_ARTEN, heuteTag, lokalNachUtc, tagPlus, wochentagVon } from "../../termine";
import { slaFristen } from "../../tickets";
import { SIGNATUR_ZUSTIMMUNG } from "../../signatur";
import { sha256Hex, signiertesPdf, standardErklaerungPdf } from "../../signatur/pruefseite";
import { pdfSeitenzahl } from "../../signatur/pdfAnhang";

function datei(praefix, daten) {
  mkdirSync(UPLOAD_ORDNER, { recursive: true });
  const name = `${praefix}-demo-${neueId("X").slice(-6)}.pdf`;
  writeFileSync(path.join(UPLOAD_ORDNER, name), daten);
  return name;
}

/** nächster Werktag ab heute + n Tage */
function werktag(n) {
  let t = tagPlus(heuteTag(), n);
  while (wochentagVon(t) > 5) t = tagPlus(t, 1);
  return t;
}
const um = (tag, zeit) => new Date(lokalNachUtc(tag, zeit)).toISOString();
const plusMin = (iso, min) => new Date(new Date(iso).getTime() + min * 60e3).toISOString();
const name = (u) => [u?.vorname, u?.nachname].filter(Boolean).join(" ") || u?.email || "";

const FEIERTAGE_AT = [
  "2026-10-26", "2026-11-01", "2026-12-08", "2026-12-25", "2026-12-26", "2027-01-01", "2027-01-06", "2027-03-29", "2027-05-01", "2027-05-06", "2027-05-17", "2027-05-27",
];

export function serviceSeed(db) {
  const s = db.service;
  const konto = (email) => db.nutzer.find((u) => u.email === email) || null;
  const admin = konto("admin@example.com");
  if (!admin) return;
  const akquise = konto("bo-akquise@example.com");
  const transaktion = konto("bo-transaktion@example.com");
  const betrieb = konto("bo-betrieb@example.com");
  const buchhaltung = konto("bo-buchhaltung@example.com");
  const flaeche = konto("flaeche@example.com");
  const landwirt = konto("landwirt@example.com");
  const investor = konto("investor@example.com");
  const anbieter = konto("anbieter@example.com");
  const unternehmen = konto("unternehmen@example.com");

  // ------------------------------------------------ Mitarbeiter & Verfügbarkeiten
  s.feiertage = FEIERTAGE_AT;
  const ma = (u, daten, arten) => {
    if (!u) return;
    s.mitarbeiter[u.id] = { funktion: daten.funktion, employeeId: daten.employeeId || "", vertretungId: daten.vertretung?.id || null, kapazitaetStunden: daten.kapazitaet ?? 38.5, aktiv: true };
    if (arten) s.verfuegbarkeit[u.id] = { arbeitszeiten: daten.arbeitszeiten || ARBEITSZEITEN_STANDARD, terminarten: arten, aktiv: true };
  };
  ma(admin, { funktion: "Leitung Projektentwicklung (Demo)", employeeId: "HR-EMP-00001", vertretung: transaktion || akquise, kapazitaet: 40 }, ["besichtigung", "beratung_telefon", "beratung_video", "gemeinde", "datenraum"]);
  ma(akquise, { funktion: "Flächenakquise Süd (Demo)", employeeId: "HR-EMP-00002", vertretung: admin }, ["besichtigung", "beratung_telefon", "beratung_video", "gemeinde"]);
  ma(transaktion, { funktion: "Transaktion & Datenraum (Demo)", employeeId: "HR-EMP-00003", vertretung: admin }, ["datenraum", "beratung_video"]);
  ma(betrieb, { funktion: "Betrieb & Service (Demo)", employeeId: "HR-EMP-00004", vertretung: admin, arbeitszeiten: { 1: [["08:00", "12:00"], ["13:00", "16:30"]], 2: [["08:00", "12:00"], ["13:00", "16:30"]], 3: [["08:00", "12:00"], ["13:00", "16:30"]], 4: [["08:00", "12:00"], ["13:00", "16:30"]], 5: [["08:00", "12:00"]] } }, ["beratung_telefon"]);
  ma(buchhaltung, { funktion: "Buchhaltung (Demo)", employeeId: "HR-EMP-00005", vertretung: admin, kapazitaet: 30 }, null);

  // ------------------------------------------------ Abwesenheit mit Vertretung (Akquise nächste Woche im Urlaub)
  const urlaubVon = werktag(7);
  const urlaubBis = tagPlus(urlaubVon, 4);
  if (akquise) s.abwesenheiten.push({ id: neueId("AB"), mitarbeiterId: akquise.id, von: urlaubVon, bis: urlaubBis, art: "urlaub", vertretungId: admin.id, status: "genehmigt", quelle: "plattform", bemerkung: "Demo-Urlaub", erstelltAm: vorTagen(10), erstelltVon: admin.id });

  // ------------------------------------------------ Termine
  const termin = (daten) => {
    const a = TERMIN_ARTEN[daten.art];
    const t = {
      id: neueId("TE"), art: daten.art, start: daten.start, ende: plusMin(daten.start, a.dauer), mitarbeiterId: daten.mitarbeiter.id, vertretungFuerId: daten.vertretungFuer?.id || null,
      kontoId: daten.kunde?.id || null, kontakt: daten.kontakt || { name: name(daten.kunde), email: daten.kunde?.email, telefon: "", firma: daten.kunde?.firma || "" },
      kanal: a.kanal, ort: daten.ort || "", notiz: daten.notiz || "", bezugArt: daten.bezugArt || null, bezugId: daten.bezugId || null, status: daten.status || "gebucht", sequenz: daten.vertretungFuer ? 1 : 0,
      erinnertAm: null, herkunft: daten.herkunft || "portal", tokenHash: null, verlauf: [{ am: vorTagen(3), text: "Gebucht (Demo)", vonId: null }], erstelltAm: vorTagen(3), ip: "",
    };
    if (daten.vertretungFuer) t.verlauf.push({ am: vorTagen(2), text: `Vertretung wegen Abwesenheit: ${name(daten.vertretungFuer)} → ${name(daten.mitarbeiter)}`, vonId: admin.id });
    s.termine.push(t);
    return t;
  };
  const fl = flaeche ? (db.flaechen || []).find((f) => f.nutzerId === flaeche.id) : null;
  if (flaeche && (akquise || admin)) termin({ art: "besichtigung", start: um(werktag(2), "10:00"), mitarbeiter: akquise || admin, kunde: flaeche, ort: fl ? `${fl.plz || ""} ${fl.ort || ""}`.trim() : "Treffpunkt Hofeinfahrt", bezugArt: fl ? "flaeche" : null, bezugId: fl?.id, notiz: "Zufahrt über Feldweg, Gummistiefel empfohlen.", status: "bestaetigt" });
  if (landwirt && akquise) termin({ art: "besichtigung", start: um(tagPlus(urlaubVon, 1), "14:00"), mitarbeiter: admin, vertretungFuer: akquise, kunde: landwirt, ort: "Agri-PV-Fläche (Demo)", notiz: "Agri-PV mit Sonderkulturen – Reihenabstand besprechen." });
  if (investor && (transaktion || admin)) termin({ art: "datenraum", start: um(werktag(3), "14:00"), mitarbeiter: transaktion || admin, kunde: investor, notiz: "Fragen zu Netzanschlusszusage und Pachtverträgen." });
  termin({ art: "gemeinde", start: um(werktag(5), "09:00"), mitarbeiter: admin, kontakt: { name: "Bürgermeisteramt Musterstadt (Demo)", email: "rathaus-musterstadt@example.com", telefon: "", firma: "Gemeinde Musterstadt (Demo)" }, herkunft: "kontakt", ort: "Rathaus Musterstadt (Demo)", notiz: "Vorstellung Bürgerbeteiligung und kommunale Beteiligung nach § 6 EEG." });
  if (unternehmen && betrieb) termin({ art: "beratung_telefon", start: um(tagPlus(heuteTag(), -6), "10:00"), mitarbeiter: betrieb, kunde: unternehmen, status: "erledigt", notiz: "Ertragsabweichung Juli besprochen." });

  // ------------------------------------------------ Tickets
  const ticket = (daten) => {
    const f = slaFristen(daten.prioritaet, daten.erstelltAm);
    const t = {
      id: neueId("TK"), betreff: daten.betreff, kategorie: daten.kategorie, prioritaet: daten.prioritaet, status: daten.status, kontoId: daten.kunde?.id || null, organisationId: null,
      anlageId: daten.anlageId || null, stoerungId: daten.stoerungId || null, herkunft: daten.herkunft || "portal", zustaendigId: daten.zustaendig?.id || admin.id,
      slaReaktionBis: f.reaktionBis, slaLoesungBis: f.loesungBis, ersteReaktionAm: daten.ersteReaktionAm || null, geloestAm: daten.geloestAm || null,
      nachrichten: daten.nachrichten || [], anhaenge: [], verlauf: [{ am: daten.erstelltAm, text: "Ticket eröffnet (Demo)", vonId: daten.kunde?.id || null }],
      erstelltAm: daten.erstelltAm, geaendertAm: daten.geaendertAm || daten.erstelltAm, gelesenKunde: true, gelesenBackoffice: daten.status !== "neu", helpdesk: null,
    };
    s.tickets.push(t);
    return t;
  };
  if (unternehmen) {
    const e = vorTagen(2, 5);
    ticket({
      betreff: "Abrechnung August: Abschlag nicht nachvollziehbar", kategorie: "abrechnung", prioritaet: "normal", status: "wartet_kunde", kunde: unternehmen, zustaendig: betrieb || admin, erstelltAm: e, ersteReaktionAm: vorTagen(2),
      nachrichten: [
        { id: neueId("TN"), am: e, vonId: unternehmen.id, backoffice: false, intern: false, text: "Guten Tag, in der Abrechnung für August ist der Abschlag höher als im Juli, obwohl der Verbrauch niedriger war. Können Sie das bitte prüfen?" },
        { id: neueId("TN"), am: vorTagen(2), vonId: (betrieb || admin).id, backoffice: true, intern: true, text: "Interne Notiz: Zählerwechsel am 14.08. – Monatswert prüfen (Demo)." },
        { id: neueId("TN"), am: vorTagen(1, 20), vonId: (betrieb || admin).id, backoffice: true, intern: false, text: "Vielen Dank für den Hinweis. Im August wurde der Zähler getauscht; der Abschlag enthält einen Nachtrag aus dem Juli. Können Sie uns den Zählerstand vom 31.08. als Foto hochladen?" },
      ],
    });
    // Ticket aus einer Störung, falls das Anlagen-Modul schon Demo-Daten hat
    const st = (db.anlagen?.stoerungen || []).find((x) => ["offen", "in_arbeit"].includes(x.status));
    const an = st ? (db.anlagen?.anlagen || []).find((a) => a.id === st.anlageId) : null;
    if (st && an) ticket({ betreff: `Störung „${an.name}“: ${st.titel}`.slice(0, 160), kategorie: "stoerung", prioritaet: st.schwere === "kritisch" ? "kritisch" : st.schwere === "hoch" ? "hoch" : "normal", status: "in_arbeit", kunde: an.kundeId ? { id: an.kundeId } : null, anlageId: an.id, stoerungId: st.id, herkunft: "stoerung", zustaendig: betrieb || admin, erstelltAm: vorTagen(0, 5), ersteReaktionAm: vorTagen(0, 5), nachrichten: [{ id: neueId("TN"), am: vorTagen(0, 5), vonId: (betrieb || admin).id, backoffice: true, intern: false, text: "Automatisch aus dem Störungs-Leitstand übernommen. Wir prüfen die Anlage und melden uns." }] });
  }
  if (flaeche) {
    const e = vorTagen(0, 3);
    ticket({ betreff: "Zugang für Miteigentümerin einrichten", kategorie: "portal", prioritaet: "niedrig", status: "neu", kunde: flaeche, zustaendig: admin, erstelltAm: e, nachrichten: [{ id: neueId("TN"), am: e, vonId: flaeche.id, backoffice: false, intern: false, text: "Meine Schwester ist Miteigentümerin der Fläche. Wie bekommt sie Zugriff auf die Unterlagen im Portal?" }] });
  }
  if (anbieter) {
    const e = vorTagen(9);
    ticket({ betreff: "Exposé-PDF: Logo des Anbieters ergänzen?", kategorie: "projekt", prioritaet: "normal", status: "geloest", kunde: anbieter, zustaendig: transaktion || admin, erstelltAm: e, ersteReaktionAm: vorTagen(8, 20), geloestAm: vorTagen(7), nachrichten: [{ id: neueId("TN"), am: e, vonId: anbieter.id, backoffice: false, intern: false, text: "Können wir unser Firmenlogo im Exposé zeigen?" }, { id: neueId("TN"), am: vorTagen(8, 20), vonId: (transaktion || admin).id, backoffice: true, intern: false, text: "Das Exposé bleibt bewusst anonym (Umgehungsschutz). Ihr Name wird erst nach NDA und Freigabe weitergegeben." }] });
  }

  // ------------------------------------------------ Signaturvorgänge
  const vorgang = ({ titel, art, ersteller, unterzeichner, pdf, dateiname, bezugArt = null, bezugId = null, tageAlt = 3 }) => {
    const sv = {
      id: neueId("SV"), titel, art, status: "laufend", erstellerId: ersteller?.id || null, bezugArt, bezugId, nachricht: "", frist: tagPlus(heuteTag(), 11), reihenfolge: true,
      datei: datei("SIG", pdf), dokumentName: dateiname, groesse: pdf.length, seiten: pdfSeitenzahl(pdf), sha256Original: sha256Hex(pdf), dateiSigniert: null, sha256Signiert: null,
      unterzeichner: unterzeichner.map((u, i) => ({ id: neueId("SU"), position: i + 1, kontoId: u.id, name: name(u), email: u.email, status: "offen", code: null, unterschrift: null, abgelehnt: null, erinnertAm: null, eingeladenAm: vorTagen(tageAlt) })),
      protokoll: [{ id: neueId("SP"), am: vorTagen(tageAlt), art: "erstellt", text: `Vorgang angelegt (${unterzeichner.length} Unterzeichner, Reihenfolge fest)`, kontoId: ersteller?.id || null, ip: "198.51.100.10", userAgent: "Demo", sha256: sha256Hex(pdf) }],
      standard: null, widerruf: null, erstelltAm: vorTagen(tageAlt), geaendertAm: vorTagen(tageAlt), abgeschlossenAm: null,
    };
    s.signaturen.push(sv);
    return sv;
  };
  const unterschreiben = (sv, u, { tage, stunden = 0, getippt }) => {
    const am = vorTagen(tage, stunden);
    const x = sv.unterzeichner.find((y) => y.kontoId === u.id);
    x.status = "unterschrieben";
    x.unterschrift = { art: "getippt", name: getippt, bildPngBase64: null, am, ip: `198.51.100.${20 + x.position}`, userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Demo-Browser", sha256Dokument: sv.sha256Original, codeBestaetigtAm: am, zustimmung: SIGNATUR_ZUSTIMMUNG };
    sv.protokoll.push({ id: neueId("SP"), am, art: "unterschrieben", text: `${x.name} hat unterschrieben (getippt)`, kontoId: u.id, ip: x.unterschrift.ip, userAgent: x.unterschrift.userAgent, sha256: sv.sha256Original });
    sv.geaendertAm = am;
  };

  if (flaeche) {
    const pdf = standardErklaerungPdf({
      titel: "Pacht-Absichtserklärung (Letter of Intent) – Demo", untertitel: `Fläche ${fl?.bezeichnung || "(Demo)"} · unverbindliche Absichtserklärung`,
      absaetze: [
        "Die Parteien beabsichtigen, über die genannte Fläche einen Pachtvertrag für die Errichtung und den Betrieb einer Photovoltaik-Freiflächenanlage zu schließen.",
        "Die Pacht richtet sich nach dem im Portal übermittelten Pachtangebot; Einzelheiten (Laufzeit, Rückbau, Sicherheiten) regelt der spätere Pachtvertrag.",
        "Diese Erklärung ist unverbindlich und begründet keine Pflicht zum Vertragsschluss. Der Pachtvertrag selbst wird in der gesetzlich vorgeschriebenen Form geschlossen.",
        "Die Parteien behandeln die ausgetauschten Informationen vertraulich.",
      ],
      unterzeichner: `${name(flaeche)} und ÖkoInvest GmbH`, hinweis: "Fiktives Demo-Dokument – keine echten Personen, keine echten Flächen.",
    });
    vorgang({ titel: "Pacht-Absichtserklärung (Demo)", art: "pacht_loi", ersteller: akquise || admin, unterzeichner: [flaeche, admin], pdf, dateiname: "Pacht-LOI-Demo.pdf", bezugArt: fl ? "flaeche" : null, bezugId: fl?.id || null });
  }
  if (landwirt) {
    const pdf = standardErklaerungPdf({
      titel: "Auftrag Bodengutachten – Demo", untertitel: "Beauftragung eines Baugrund- und Bodengutachtens (Rammsondierungen)",
      absaetze: ["Die ÖkoInvest GmbH beauftragt auf eigene Kosten ein Baugrundgutachten auf der Agri-PV-Fläche.", "Der Eigentümer gestattet das Betreten der Fläche nach vorheriger Abstimmung und außerhalb der Erntezeit.", "Flurschäden werden nach den üblichen Sätzen der Landwirtschaftskammer ersetzt."],
      unterzeichner: `${name(landwirt)} und ÖkoInvest GmbH`, hinweis: "Fiktives Demo-Dokument.",
    });
    const sv = vorgang({ titel: "Auftrag Bodengutachten (Demo)", art: "gutachter", ersteller: admin, unterzeichner: [landwirt, admin], pdf, dateiname: "Auftrag-Bodengutachten-Demo.pdf", tageAlt: 9 });
    unterschreiben(sv, landwirt, { tage: 8, getippt: name(landwirt) });
    unterschreiben(sv, admin, { tage: 7, stunden: 3, getippt: name(admin) });
    sv.abgeschlossenAm = vorTagen(7, 3);
    try {
      const r = signiertesPdf(pdf, { ...sv, seitenOriginal: sv.seiten, ersteller: { name: name(admin) }, unterzeichner: sv.unterzeichner.map((u) => ({ ...u, unterschrift: { ...u.unterschrift, zustimmung: true } })) }, { erzeugtAm: sv.abgeschlossenAm });
      sv.dateiSigniert = datei("SIG", r.pdf);
      sv.sha256Signiert = r.sha256;
      sv.groesseSigniert = r.pdf.length;
      sv.seitenSigniert = r.seitenNachher;
      sv.status = "abgeschlossen";
      sv.protokoll.push({ id: neueId("SP"), am: sv.abgeschlossenAm, art: "abgeschlossen", text: `Alle Unterschriften liegen vor – signiertes PDF mit Prüfseite erzeugt (${r.seitenNachher} Seiten)`, kontoId: null, ip: "", userAgent: "", sha256: r.sha256 });
    } catch {
      /* Demo ohne signiertes PDF */
    }
  }
  if (investor) {
    const pdf = standardErklaerungPdf({ titel: "Ergänzende Vertraulichkeitsvereinbarung – Demo", untertitel: "Datenraum Stufe 2 (Netzanschluss- und Pachtverträge)", absaetze: ["Die Unterlagen der Stufe 2 werden ausschließlich zur Prüfung des Erwerbs verwendet.", "Kopien werden nach Abschluss oder Abbruch der Prüfung gelöscht.", "Es gelten im Übrigen die Regeln der Klick-NDA der Projektbörse."], unterzeichner: name(investor), hinweis: "Fiktives Demo-Dokument." });
    vorgang({ titel: "NDA Datenraum Stufe 2 (Demo)", art: "nda", ersteller: transaktion || admin, unterzeichner: [investor], pdf, dateiname: "NDA-Stufe-2-Demo.pdf", tageAlt: 1 });
  }

  // ------------------------------------------------ Zeiterfassung
  const projekte = (db.projekte || []).slice(0, 3);
  const zeit = (u, tage, stunden, p, taetigkeit, text) => u && p && s.zeiten.push({ id: neueId("ZE"), kontoId: u.id, datum: tagPlus(heuteTag(), -tage), stunden, projektId: p.id, erpProjekt: null, taetigkeit, text, erstelltAm: jetzt(), timesheet: null });
  zeit(admin, 1, 2.5, projekte[0], "planung", "Abstimmung Bebauungsplan-Entwurf (Demo)");
  zeit(admin, 2, 1.5, projekte[1], "transaktion", "Q&A Datenraum (Demo)");
  zeit(akquise, 1, 4, projekte[0], "akquise", "Eigentümergespräche (Demo)");
  zeit(akquise, 3, 3, projekte[2], "gemeinde", "Gemeinderatssitzung vorbereitet (Demo)");
  zeit(transaktion, 2, 5, projekte[1], "transaktion", "Bieterverfahren indikative Runde (Demo)");

  // ------------------------------------------------ Wissensdatenbank (intern)
  const artikel = (titel, kategorie, tags, inhalt) => s.wissen.push({ id: neueId("WI"), titel, kategorie, tags, inhalt, autorId: admin.id, erstelltAm: vorTagen(30), geaendertAm: vorTagen(5), version: 1, versionen: [] });
  artikel("Ablauf Flächenprüfung am Kartentisch", "prozesse", ["Fläche", "Vorprüfung", "SLA"], "## Ziel\nJede neue Fläche erhält innerhalb von zwei Werktagen eine erste Einschätzung.\n\n## Schritte\n- Lage prüfen: Schutzgebiete, Überschwemmungsgebiete, Denkmalschutz\n- Netz: Entfernung zum nächsten Umspannwerk, bekannte Kapazitäten\n- Planungsrecht: Privilegierung nach § 35 BauGB (200-m-Korridor an Autobahnen und zweigleisigen Schienenwegen) oder Bebauungsplan\n- Förderkulisse: EEG-Flächenkulisse, benachteiligte Gebiete je Land\n\n## Ergebnis\nAmpel im Portal setzen und Eigentümer telefonisch informieren. Bei Grün Besichtigung anbieten (Terminart „Flächenbesichtigung“).");
  artikel("Kommunale Beteiligung nach § 6 EEG", "recht", ["EEG", "Gemeinde", "Beteiligung"], "## Kurzfassung\nBetreiber können Gemeinden an Freiflächenanlagen mit bis zu 0,2 ct/kWh beteiligen. Die Vereinbarung bedarf der Schriftform; ab wann sie im Bebauungsplanverfahren frühestens geschlossen werden darf, regelt § 6 Abs. 4 EEG – vor Abschluss im Einzelfall prüfen.\n\n## Im Gespräch mit der Gemeinde\n- Beteiligung ist freiwillig, aber üblich\n- Zusätzlich möglich: Bürgerbeteiligung über die Genossenschaft\n- Gewerbesteuer: nach aktuellem Stand überwiegend Zerlegung zugunsten der Standortgemeinde (§ 29 GewStG)\n\nBei Unsicherheit Rechtsabteilung einbinden.");
  artikel("Elektronische Unterschrift: wann EES genügt", "recht", ["Signatur", "eIDAS", "Schriftform"], "## Was wir nutzen\nEinfache elektronische Signatur (EES) nach Art. 3 Nr. 10 eIDAS – keine qualifizierte Signatur.\n\n## Geeignet für\n- NDA, Absichtserklärungen (LOI), Gutachteraufträge, Provisionsvereinbarungen\n\n## Nicht geeignet für\n- Verträge mit gesetzlicher Schriftform (z. B. langfristige Pachtverträge, § 585a BGB) und notariell zu beurkundende Verträge (Grundstückskauf, Dienstbarkeiten)\n\n## Beweis\nPrüfseite mit Zeitpunkt, IP, Browser, Code-Bestätigung und SHA-256; Originalbytes bleiben unverändert (inkrementelles PDF-Update).");
  artikel("Checkliste Datenraum vor Veröffentlichung", "vorlagen", ["Datenraum", "Projektbörse"], "- Nutzungsvertrag bzw. Pachtverträge vollständig\n- Netzanschlusszusage oder Netzverträglichkeitsprüfung\n- Aufstellungs- bzw. Satzungsbeschluss\n- Gutachten: Baugrund, Blendung, Artenschutz\n- Ertragsgutachten (P50/P90)\n- Finanzmodell mit Annahmen\n\nFehlende Punkte im Portal über die Dokumenten-Checkliste anfordern.");
  artikel("Störung vom Kunden gemeldet – Erstreaktion", "technik", ["Störung", "Ticket", "SLA"], "## Erstreaktion\n1. Ticket prüfen: Anlage verknüpft? Sonst Anlage zuordnen.\n2. Live-Daten der Anlage öffnen (Stand der letzten Messung).\n3. Priorität nach Schwere setzen: kritisch = Anlage aus, hoch = Teilausfall.\n4. Kunden innerhalb der SLA-Reaktionszeit antworten – auch wenn die Ursache noch offen ist.\n\n## Vor Ort\nTermin „Beratung am Telefon“ oder Serviceeinsatz über den Betrieb planen.");
  artikel("Portal: Konto für Miteigentümer", "it", ["Portal", "Organisation", "Zugang"], "Miteigentümer erhalten keinen geteilten Zugang. Stattdessen:\n\n- Eigentümer legt unter „Organisation & Team“ eine Organisation an\n- Miteigentümer per E-Mail einladen (Rolle „Mitglied“ oder „Nur lesen“)\n- Fläche der Organisation zuordnen\n\nSo bleiben Protokoll und Rechte je Person nachvollziehbar.");
}
