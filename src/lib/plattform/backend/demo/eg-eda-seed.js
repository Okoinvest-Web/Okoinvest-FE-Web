// src/lib/plattform/backend/demo/eg-eda-seed.js
//
// Demo-Bestand WP2 „EDA-Marktkommunikation“ (Sammlung db.egEda) – passend zu den WP1-Demo-Gemeinschaften (Bezug über
// gemeinschaft.seedSchluessel, nie über zufällige IDs). Alles fiktiv: Nachrichten im kanonischen EDA-Format, erzeugt mit
// den reinen Buildern (src/lib/plattform/eg/eda), Absender/Empfänger nach den Demo-Marktpartner-IDs.
//
// Inhalt je Gemeinschaft mit Gemeinschafts-ID (Sonnenland, GEA Linzer Straße):
//  - aktive Teilnahmen: abgeschlossene Anmeldung (ANFORDERUNG → ANTWORT 99 → ZUSTIMMUNG 175 → ABSCHLUSS)
//  - offene Zustimmung: Anmeldung angenommen, Frist läuft (Erinnerungen fällig); eine davon mit früherem Versuch (173)
//  - „wartet auf Technik“: Zustimmung + ANTWORT 182 vor 70 Tagen (rote Ampel, Reklamationsbefund)
//  - beendet: Abmeldung CM_REV_SP bestätigt
//  - Energiedaten der letzten 14 Tage als Journal-Einträge (Rohinhalt archiviert, Prüfsumme bleibt), mit Lücken bei
//    zwei Zählpunkten (Datenqualitäts-Reklamation vorführbar)

import { EDA_PROZESSE, edaId, nachrichtBauen, plusTage, prozessNeu, tagBeginnUtc, RICHTUNG_EDA, MODELL_EDA } from "../../eg/eda/index.js";

export const EDA_SEED_VERSION = 1;

/**
 * @param {{eg:object, heute:string, jetztMs:number, neueId:(p:string)=>string, sha256:(s:string)=>string}} o
 */
export function edaSeed({ eg, heute, jetztMs, neueId, sha256 }) {
  const aus = { v: EDA_SEED_VERSION, basisV: eg?.v || 0, prozesse: [], nachrichten: [], simulator: { ausstehend: [], seed: "oekoinvest-demo" } };
  if (!eg?.gemeinschaften) return aus;
  const iso = (tag, std = 9, min = 0) => `${tag}T${String(std).padStart(2, "0")}:${String(min).padStart(2, "0")}:00.000Z`;
  let zaehler = 1;
  const zufall = () => String(zaehler++).padStart(6, "0");
  for (const g of eg.gemeinschaften.filter((x) => x.gemeinschaftsId && x.marktpartnerId && ["sonnenland", "linzerstrasse"].includes(x.seedSchluessel))) {
    const nbId = g.netzbetreiber[0];
    const nb = eg.netzbetreiber.find((x) => x.id === nbId) || { id: nbId, marktpartnerId: "AT000000" };
    const nbMp = nb.marktpartnerId || "AT000000";
    const teilnahmen = eg.teilnahmen.filter((t) => t.gemeinschaftId === g.id);
    let mitHistorie = false;
    const zpVon = (t) => eg.zaehlpunkte.find((z) => z.id === t.zaehlpunktId);
    const nachricht = (p, { code, richtung, tag, std, daten, zp, teilnahmeId }) => {
      const absender = richtung === "aus" ? g.marktpartnerId : nbMp;
      const empfaenger = richtung === "aus" ? nbMp : g.marktpartnerId;
      const zeit = iso(tag, std);
      const messageId = edaId(absender, zeit, zufall());
      const xml = nachrichtBauen({ code, prozesscode: p.prozesscode, absender, empfaenger, erstellt: `${zeit.slice(0, 19)}Z`, messageId, conversationId: p.conversationId, prozessdatum: tag, daten });
      aus.nachrichten.push({
        id: neueId("EDN"), gemeinschaftId: g.id, prozessId: p.id, teilnahmeId: teilnahmeId || p.teilnahmeId || "", zaehlpunktnummer: zp || p.zaehlpunktnummer || "", richtung, nachrichtencode: code, prozesscode: p.prozesscode,
        messageId, conversationId: p.conversationId, absender, empfaenger, zeitpunkt: zeit, tag: "", kanal: "simulator", versandStatus: richtung === "aus" ? "quittiert" : "", versuche: richtung === "aus" ? 1 : 0,
        verarbeitet: true, verarbeitetAm: zeit, weitergeleitet: false, fehler: "", hinweise: [], kennzahlen: null, sha256: sha256(xml), groesse: xml.length, betreff: "", rohinhalt: xml, rohinhaltArchiviert: false, schluessel: `${absender}|${messageId}`, demo: true,
      });
    };
    const neu = (pc, t, zp, tag, parameter = {}) => {
      const p = prozessNeu({ prozesscode: pc, gemeinschaft: g, teilnahme: t, zaehlpunkt: zp, netzbetreiber: nb, prozessdatum: tag, parameter, jetzt: iso(tag, 8) });
      p.id = neueId("EDP");
      p.conversationId = edaId(g.marktpartnerId, iso(tag, 8), zufall());
      p.demo = true;
      p.erstelltAm = iso(tag, 8);
      p.erstelltVon = null;
      aus.prozesse.push(p);
      return p;
    };
    const schritt = (p, nach, tag, std, code, text) => {
      p.verlauf.push({ am: iso(tag, std), von: p.status, nach, nachricht: code, text, konto: null });
      p.status = nach;
    };
    const anmeldung = (t, zp, start) => {
      const p = neu("EC_REQ_ONL", t, zp, start);
      const basis = { MeteringPoint: zp.zaehlpunktnummer, CMRequestId: p.conversationId };
      nachricht(p, { code: "ANFORDERUNG_ECON", richtung: "aus", tag: start, std: 8, daten: { ...basis, ReqDatType: "EnergyCommunityRegistration", DateFrom: start, ECID: g.gemeinschaftsId, ECPartFact: String(t.teilnahmefaktor), EnergyDirection: RICHTUNG_EDA[zp.richtung], ECShare: g.verteilmodell === "statisch" && t.aufteilungsschluesselPct ? t.aufteilungsschluesselPct : undefined, ECDisModel: MODELL_EDA[g.verteilmodell] } });
      schritt(p, "gesendet", start, 8, "ANFORDERUNG_ECON", "Gesendet");
      p.gesendetAm = iso(start, 8);
      p.versuche = 1;
      nachricht(p, { code: "ANTWORT_ECON", richtung: "ein", tag: start, std: 9, daten: { ...basis, ResponseCode: "99" } });
      schritt(p, "bestaetigt", start, 9, "ANTWORT_ECON", "Netzbetreiber hat die Anmeldung angenommen und die Zustimmung beim Mitglied angefordert (Frist 30 Tage)");
      p.responsecode = "99";
      p.responsetext = "Meldung erhalten – Anfrage angenommen";
      p.fristBis = plusTage(start, 30);
      return { p, basis };
    };
    for (const t of teilnahmen) {
      const zp = zpVon(t);
      if (!zp) continue;
      if (t.status === "aktiv" || t.status === "beendet") {
        const ab = t.gueltigAb || plusTage(heute, -200);
        const start = plusTage(ab, -9);
        const { p, basis } = anmeldung(t, zp, start);
        const zust = plusTage(start, 5);
        nachricht(p, { code: "ZUSTIMMUNG_ECON", richtung: "ein", tag: zust, std: 14, daten: { ...basis, ResponseCode: "175", ConsentId: t.consentId || "Migration" } });
        schritt(p, "bestaetigt", zust, 14, "ZUSTIMMUNG_ECON", `Mitglied hat zugestimmt (Consent-ID ${t.consentId})`);
        p.responsecode = "175";
        p.responsetext = "Zustimmung erteilt";
        p.fristBis = "";
        nachricht(p, { code: "ABSCHLUSS_ECON", richtung: "ein", tag: plusTage(ab, -1), std: 6, daten: { MeteringPoint: zp.zaehlpunktnummer, ECID: g.gemeinschaftsId, ConsentId: t.consentId || "Migration", DateActivate: ab, ECPartFact: String(t.tfHistorie?.[0]?.tf ?? t.teilnahmefaktor), EnergyDirection: RICHTUNG_EDA[zp.richtung] } });
        schritt(p, "abgeschlossen", plusTage(ab, -1), 6, "ABSCHLUSS_ECON", `Zuordnung aktiv ab ${ab.split("-").reverse().join(".")}`);
        p.ergebnis = { aktivAb: ab, consentId: t.consentId };
        if (t.status === "beendet" && t.gueltigBis) {
          const am = plusTage(t.gueltigBis, -21);
          const r = neu("CM_REV_SP", t, zp, t.gueltigBis, { zum: t.gueltigBis });
          nachricht(r, { code: "AUFHEBUNG_CCMS", richtung: "aus", tag: am, std: 10, daten: { MeteringPoint: zp.zaehlpunktnummer, ECID: g.gemeinschaftsId, ConsentId: t.consentId || "Migration", ConsentEnd: t.gueltigBis, Reason: "SP" } });
          schritt(r, "gesendet", am, 10, "AUFHEBUNG_CCMS", "Gesendet");
          r.gesendetAm = iso(am, 10);
          r.versuche = 1;
          nachricht(r, { code: "ANTWORT_CCMS", richtung: "ein", tag: am, std: 11, daten: { MeteringPoint: zp.zaehlpunktnummer, ResponseCode: "99", ConsentEnd: t.gueltigBis } });
          schritt(r, "abgeschlossen", am, 11, "ANTWORT_CCMS", `Abmeldung zum ${t.gueltigBis.split("-").reverse().join(".")} bestätigt`);
          r.responsecode = "99";
          r.responsetext = "Meldung erhalten – Anfrage angenommen";
        }
      } else if (t.status === "zustimmung_offen") {
        const start = plusTage(t.fristBis || plusTage(heute, 24), -30);
        if (!mitHistorie) {
          mitHistorie = true;
          // früherer Versuch: Kunde hat nicht zugestimmt (173), neu gestartet
          const alt = anmeldung(t, zp, plusTage(start, -40));
          nachricht(alt.p, { code: "ABLEHNUNG_ECON", richtung: "ein", tag: plusTage(start, -10), std: 7, daten: { ...alt.basis, ResponseCode: "173" } });
          schritt(alt.p, "zeitueberschreitung", plusTage(start, -10), 7, "ABLEHNUNG_ECON", "Abgelehnt: 173 Kunde hat nicht fristgerecht zugestimmt (Zeitüberschreitung)");
          alt.p.responsecode = "173";
          alt.p.responsetext = "Kunde hat nicht fristgerecht zugestimmt (Zeitüberschreitung)";
          alt.p.fristBis = "";
          const n2 = anmeldung(t, zp, start);
          alt.p.nachfolgerId = n2.p.id;
        } else anmeldung(t, zp, start);
      } else if (t.status === "wartet_technik") {
        const start = plusTage(heute, -78);
        const { p, basis } = anmeldung(t, zp, start);
        const zust = plusTage(start, 6);
        nachricht(p, { code: "ZUSTIMMUNG_ECON", richtung: "ein", tag: zust, std: 18, daten: { ...basis, ResponseCode: "175", ConsentId: t.consentId || `CONSENT-DEMO-${zufall()}` } });
        schritt(p, "bestaetigt", zust, 18, "ZUSTIMMUNG_ECON", "Mitglied hat zugestimmt");
        p.fristBis = "";
        const tech = plusTage(zust, 2);
        nachricht(p, { code: "ANTWORT_ECON", richtung: "ein", tag: tech, std: 7, daten: { ...basis, ResponseCode: "182" } });
        schritt(p, "bestaetigt", tech, 7, "ANTWORT_ECON", "Technik ausständig: Kein fernauslesbarer Zähler (Smart Meter fehlt)");
        p.responsecode = "182";
        p.responsetext = "Kein fernauslesbarer Zähler (Smart Meter fehlt)";
        p.technikSeit = tech;
      }
    }
    // Energiedaten der letzten 14 Tage (nur Journal-Metadaten; Rohinhalt archiviert) mit Lücken
    const aktiv = teilnahmen.filter((t) => t.status === "aktiv").map((t) => ({ t, zp: zpVon(t) })).filter((x) => x.zp);
    const lueckenBei = new Set(aktiv.filter((_, i) => i === 6 || i === 9).map((x) => x.zp.zaehlpunktnummer));
    const monat = {};
    for (let d = 14; d >= 2; d--) {
      const tag = plusTage(heute, -d);
      const mon = tag.slice(0, 7);
      if (!monat[mon]) {
        const p = prozessNeu({ prozesscode: "CR_MSG", gemeinschaft: g, netzbetreiber: nb, prozessdatum: `${mon}-01`, jetzt: iso(tag, 3) });
        Object.assign(p, { id: neueId("EDP"), conversationId: `CRMSG-${g.id}-${mon}`, status: "bestaetigt", demo: true, erstelltAm: iso(tag, 3), erstelltVon: null, ergebnis: { nachrichten: 0, tage: [] } });
        p.verlauf.push({ am: iso(tag, 3), von: "entwurf", nach: "bestaetigt", nachricht: "DATEN_CRMSG", text: `Datenempfang ${mon}`, konto: null });
        aus.prozesse.push(p);
        monat[mon] = p;
      }
      for (const [i, { t, zp }] of aktiv.entries()) {
        if (lueckenBei.has(zp.zaehlpunktnummer) && (d === 4 + (i % 3) || d === 5 + (i % 3) || (i % 2 === 0 && d === 9))) continue;
        const zeit = iso(plusTage(tag, 1), 3, (i * 7) % 60);
        const messageId = edaId(nbMp, zeit, zufall());
        const p = monat[mon];
        p.ergebnis.nachrichten++;
        aus.nachrichten.push({
          id: neueId("EDN"), gemeinschaftId: g.id, prozessId: p.id, teilnahmeId: t.id, zaehlpunktnummer: zp.zaehlpunktnummer, richtung: "ein", nachrichtencode: "DATEN_CRMSG", prozesscode: "CR_MSG",
          messageId, conversationId: edaId(nbMp, zeit, zufall()), absender: nbMp, empfaenger: g.marktpartnerId, zeitpunkt: zeit, tag, kanal: "simulator", versandStatus: "", versuche: 0,
          verarbeitet: true, verarbeitetAm: zeit, weitergeleitet: true, fehler: "", hinweise: [], kennzahlen: { werte: 96 * (zp.richtung === "erzeugung" ? 3 : 4), l3: i === 3 && d === 7 ? 4 : 0, fehlend: 0, von: tagBeginnUtc(tag) },
          sha256: sha256(`${messageId}|${zp.zaehlpunktnummer}|${tag}`), groesse: 0, betreff: "", rohinhalt: "", rohinhaltArchiviert: true, schluessel: `${nbMp}|${messageId}`, demo: true,
        });
      }
    }
  }
  if (!EDA_PROZESSE.EC_REQ_ONL) throw new Error("EDA-Codes fehlen");
  return aus;
}
