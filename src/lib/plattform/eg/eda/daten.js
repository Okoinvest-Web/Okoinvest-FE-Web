// src/lib/plattform/eg/eda/daten.js
//
// Energiedaten (CR_MSG → Ereignis eg.energiedaten.empfangen an WP3), Lückenerkennung aus dem Nachrichtenjournal,
// Zählpunktlisten-Abgleich (EC_PODLIST, Soll/Ist) und Datenqualitäts-Reklamation an den Netzbetreiber.
// Reine Funktionen; Python-Spiegel plattform/eg_eda_kern.py.
//
// Quellen: HA II 13 (CR_MSG je Zählpunkt, Inhalte je Richtung), HA II 2.3.1/13.1 (L1/L2/L3, L3 nicht abrechenbar,
// Ersatz binnen 60 bzw. 15 Tagen), HA II 5.5 (EC_PODLIST), ElWG § 70 Abs. 6 (Auskunft Nahebereich binnen 14 Tagen),
// Marktanalyse 4.1/4.2 (Datenlücken als Schmerzpunkt Nr. 1, schriftliche Dokumentation für die Schlichtungsstelle).

import { EDA_FRISTEN, METER_CODES, responsecodeInfo } from "./codes.js";
import { lokalTag, plusTage, tageListe, tageZwischen } from "./zeit.js";

const datumDe = (t) => (t ? String(t).slice(0, 10).split("-").reverse().join(".") : "");

// ---------------------------------------------------------------- CR_MSG → WP3

/**
 * Gelesene DATEN_CRMSG-Nachricht in das Ereignis-Payload für WP3 umwandeln (modell.js EgEnergiedatenPayload).
 * Unbekannte MeterCodes werden ausgelassen (Hinweis). `werte` mit null = fehlende Viertelstunde (Qualität L3).
 * @returns {{payload:object|null, hinweise:string[], tag:string}}
 */
export function energiedatenPayload(n, { gemeinschaftId, nachrichtId }) {
  const e = n?.daten?.Energy;
  const hinweise = [];
  if (!e) return { payload: null, hinweise: ["Keine Energiedaten in der Nachricht."], tag: "" };
  const reihen = [];
  for (const r of e.reihen || []) {
    const groesse = METER_CODES[r.meterCode];
    if (!groesse) {
      hinweise.push(`MeterCode „${r.meterCode}“ unbekannt – Reihe nicht übernommen (Tabelle in eda/codes.js prüfen).`);
      continue;
    }
    reihen.push({ groesse, werte: r.werte, qualitaet: r.qualitaet });
  }
  const payload = { gemeinschaftId, zaehlpunktnummer: n.daten.MeteringPoint, nachrichtId, messageId: n.kopf.messageId, von: e.start, bis: e.ende, reihen };
  return { payload, hinweise, tag: lokalTag(e.start) };
}

/** Kennzahlen einer Energiedaten-Nachricht für das Journal (Summen je Größe, L3-Anteil, fehlende Werte) */
export function energiedatenKennzahlen(payload) {
  const aus = { groessen: {}, werte: 0, l3: 0, fehlend: 0 };
  for (const r of payload?.reihen || []) {
    let s = 0;
    r.werte.forEach((x, i) => {
      aus.werte++;
      if (x === null || x === undefined) aus.fehlend++;
      else s += Number(x);
      if (r.qualitaet[i] === "L3") aus.l3++;
    });
    aus.groessen[r.groesse] = Math.round(s * 1000) / 1000;
  }
  aus.anteilL3 = aus.werte ? Math.round((aus.l3 / aus.werte) * 1000) / 1000 : 0;
  return aus;
}

// ---------------------------------------------------------------- Lücken

/**
 * Datenlücken je aktiver Teilnahme: Tage ohne empfangene Energiedaten (D+1, Verzug laut EDA_FRISTEN.datenVerzugTage).
 * @param {{teilnahmen:{teilnahmeId:string, zaehlpunktnummer:string, gueltigAb:string, gueltigBis?:string}[], empfangen:Object<string,string[]>, von:string, bis:string, heute:string}} o
 * @returns {{teilnahmeId:string, zaehlpunktnummer:string, fehlend:string[], anzahl:number, aeltester:string}[]}
 */
export function datenluecken({ teilnahmen = [], empfangen = {}, von, bis, heute }) {
  const grenze = plusTage(heute, -EDA_FRISTEN.datenVerzugTage);
  const aus = [];
  for (const t of teilnahmen) {
    if (!t.gueltigAb) continue;
    const a = t.gueltigAb > von ? t.gueltigAb : von;
    let b = bis < grenze ? bis : grenze;
    if (t.gueltigBis && t.gueltigBis < b) b = t.gueltigBis;
    if (a > b) continue;
    const da = new Set(empfangen[t.zaehlpunktnummer] || []);
    const fehlend = tageListe(a, b).filter((x) => !da.has(x));
    if (fehlend.length) aus.push({ teilnahmeId: t.teilnahmeId, zaehlpunktnummer: t.zaehlpunktnummer, fehlend, anzahl: fehlend.length, aeltester: fehlend[0] });
  }
  return aus.sort((x, y) => y.anzahl - x.anzahl || (x.zaehlpunktnummer < y.zaehlpunktnummer ? -1 : 1));
}

/** Lücken zu zusammenhängenden Zeiträumen verdichten (für Nachforderung und Reklamation) */
export function zeitraeume(tage = []) {
  const s = [...tage].sort();
  const aus = [];
  for (const t of s) {
    const l = aus[aus.length - 1];
    if (l && plusTage(l.bis, 1) === t) l.bis = t;
    else aus.push({ von: t, bis: t });
  }
  return aus;
}

// ---------------------------------------------------------------- EC_PODLIST-Abgleich

/**
 * Soll (Plattform) gegen Ist (Zählpunktliste des Netzbetreibers).
 * @param {{zaehlpunktnummer:string, teilnahmeId:string, status:string, consentId:string, teilnahmefaktor:number, richtung:string}[]} soll
 * @param {{MeteringPoint:string, ConsentId?:string, EnergyDirection:string, ECPartFact?:string}[]} ist
 * @param {string} heute (optional) beendete Teilnahmen mit gueltigBis ≥ heute gelten beim Netzbetreiber noch als zugeordnet
 * @returns {{zaehlpunktnummer:string, teilnahmeId:string, art:string, text:string, empfehlung:string, soll:object|null, ist:object|null}[]}
 */
export function podlistAbgleich(soll = [], ist = [], heute = "") {
  const RICHTUNG = { verbrauch: "CONSUMPTION", erzeugung: "GENERATION" };
  const nochZugeordnet = (s) => ["aktiv", "abmeldung_angefragt"].includes(s.status) || (s.status === "beendet" && !!heute && !!s.gueltigBis && s.gueltigBis >= heute);
  const erwartet = soll.filter(nochZugeordnet);
  const sollMap = new Map(soll.map((s) => [`${s.zaehlpunktnummer}|${RICHTUNG[s.richtung] || s.richtung}`, s]));
  const istMap = new Map(ist.map((i) => [`${i.MeteringPoint}|${i.EnergyDirection}`, i]));
  const aus = [];
  for (const s of erwartet) {
    const k = `${s.zaehlpunktnummer}|${RICHTUNG[s.richtung] || s.richtung}`;
    const i = istMap.get(k);
    if (!i) {
      aus.push({ zaehlpunktnummer: s.zaehlpunktnummer, teilnahmeId: s.teilnahmeId, art: "fehlt_beim_nb", text: "Beim Netzbetreiber nicht zugeordnet", empfehlung: "Anmeldung prüfen (Verlauf, Responsecodes); ggf. erneut anmelden. Bis dahin keine Gemeinschaftsdaten.", soll: s, ist: null });
      continue;
    }
    const abw = [];
    if (i.ECPartFact !== undefined && i.ECPartFact !== "" && Number(i.ECPartFact) !== Number(s.teilnahmefaktor)) abw.push(["tf_abweichend", `Teilnahmefaktor NB ${i.ECPartFact} % ≠ Plattform ${s.teilnahmefaktor} %`, "TF-Historie prüfen; Wert des Netzbetreibers ist für die Zuteilung maßgeblich – Plattform korrigieren oder EC_PRTFACT_CHG senden."]);
    if (i.ConsentId && s.consentId && i.ConsentId !== s.consentId) abw.push(["consent_abweichend", `Consent-ID NB ${i.ConsentId} ≠ Plattform ${s.consentId}`, "Consent-ID des Netzbetreibers übernehmen (Korrektur mit Begründung)."]);
    if (i.ConsentId && !s.consentId) abw.push(["consent_fehlt", `Consent-ID ${i.ConsentId} fehlt in der Plattform`, "Consent-ID übernehmen (z. B. nach Wechsel vom Altdienstleister)."]);
    if (!abw.length) aus.push({ zaehlpunktnummer: s.zaehlpunktnummer, teilnahmeId: s.teilnahmeId, art: "ok", text: "Übereinstimmung", empfehlung: "", soll: s, ist: i });
    for (const [art, text, empfehlung] of abw) aus.push({ zaehlpunktnummer: s.zaehlpunktnummer, teilnahmeId: s.teilnahmeId, art, text, empfehlung, soll: s, ist: i });
  }
  for (const i of ist) {
    const k = `${i.MeteringPoint}|${i.EnergyDirection}`;
    const s = sollMap.get(k);
    if (s && nochZugeordnet(s)) continue;
    aus.push({ zaehlpunktnummer: i.MeteringPoint, teilnahmeId: s?.teilnahmeId || "", art: "fehlt_bei_uns", text: s ? `Beim Netzbetreiber aktiv, in der Plattform „${s.status}“` : "Beim Netzbetreiber zugeordnet, in der Plattform unbekannt", empfehlung: s ? "Teilnahme-Status per dokumentierter Korrektur angleichen (Begründung: EC_PODLIST)." : "Zählpunkt und Teilnahme anlegen (Wechsel-Import) oder Abmeldung prüfen.", soll: s || null, ist: i });
  }
  const rang = { fehlt_beim_nb: 0, fehlt_bei_uns: 1, tf_abweichend: 2, consent_abweichend: 3, consent_fehlt: 4, ok: 9 };
  return aus.sort((a, b) => rang[a.art] - rang[b.art] || (a.zaehlpunktnummer < b.zaehlpunktnummer ? -1 : a.zaehlpunktnummer > b.zaehlpunktnummer ? 1 : 0));
}

// ---------------------------------------------------------------- Reklamation an den Netzbetreiber

export const BEFUND_ARTEN = {
  datenluecke: { label: "Fehlende Energiedaten (CR_MSG)", quelle: "HA II 13 (tägliche Bereitstellung je Zählpunkt)" },
  l3_anteil: { label: "Nicht belastbare Werte (L3)", quelle: "HA II 2.3.1, 13.1 (L3 nicht abrechenbar, Ersatz binnen 60 bzw. 15 Tagen)" },
  keine_antwort: { label: "Keine Antwort auf EDA-Prozess", quelle: "ebUtilities-Prozessbeschreibung (Antwortpflicht)" },
  aktivierung_verzoegert: { label: "Aktivierung verzögert (Smart Meter)", quelle: "HA II 5.1.1 (Einbau bis zu 2 Monate, zu bestätigen)" },
  zuordnung_abweichend: { label: "Abweichende Zuordnung (Zählpunktliste)", quelle: "HA II 5.5 (EC_PODLIST)" },
  nachforderung_offen: { label: "Nachforderung nicht erfüllt (CR_REQ_PT)", quelle: "Fachkonzept 2.5" },
};

/**
 * Befunde für einen Netzbetreiber zusammenstellen.
 * @returns {{art:string, zaehlpunktnummer:string, text:string, seit:string, umfang:number}[]}
 */
export function reklamationBefunde({ luecken = [], prozesse = [], podlist = [], qualitaet = [], heute }) {
  const b = [];
  for (const l of luecken) for (const z of zeitraeume(l.fehlend)) b.push({ art: "datenluecke", zaehlpunktnummer: l.zaehlpunktnummer, text: z.von === z.bis ? `Keine Daten für ${datumDe(z.von)}` : `Keine Daten vom ${datumDe(z.von)} bis ${datumDe(z.bis)} (${tageZwischen(z.von, z.bis) + 1} Tage)`, seit: z.von, umfang: tageZwischen(z.von, z.bis) + 1 });
  for (const q of qualitaet) if (q.anteilL3 > 0) b.push({ art: "l3_anteil", zaehlpunktnummer: q.zaehlpunktnummer, text: `${Math.round(q.anteilL3 * 1000) / 10} % L3-Werte im ${q.monat}${q.aeltesterL3 ? ` (ältester ${datumDe(q.aeltesterL3)}, Ersatz fällig ${datumDe(plusTage(q.aeltesterL3, EDA_FRISTEN.l3ErsatzTage))})` : ""}`, seit: q.aeltesterL3 || "", umfang: q.anteilL3 });
  for (const p of prozesse) {
    if (p.status === "gesendet" && p.gesendetAm && tageZwischen(String(p.gesendetAm).slice(0, 10), heute) >= EDA_FRISTEN.antwortTage) b.push({ art: "keine_antwort", zaehlpunktnummer: p.zaehlpunktnummer, text: `${p.prozesscode} vom ${datumDe(p.gesendetAm)} (Conversation ${p.conversationId}) ohne Antwort`, seit: String(p.gesendetAm).slice(0, 10), umfang: p.versuche || 1 });
    if (p.status === "zeitueberschreitung" && !p.nachfolgerId && p.prozesscode !== "REKLAMATION" && !["173"].includes(p.responsecode)) b.push({ art: "keine_antwort", zaehlpunktnummer: p.zaehlpunktnummer, text: `${p.prozesscode} (Conversation ${p.conversationId}) nach ${p.versuche || 1} Versuchen ohne Antwort`, seit: String(p.gesendetAm || "").slice(0, 10), umfang: p.versuche || 1 });
    if (p.technikSeit && p.status === "bestaetigt" && tageZwischen(p.technikSeit, heute) >= EDA_FRISTEN.technikHinweisTage) b.push({ art: "aktivierung_verzoegert", zaehlpunktnummer: p.zaehlpunktnummer, text: `Zustimmung liegt vor, Aktivierung offen seit ${datumDe(p.technikSeit)} (${tageZwischen(p.technikSeit, heute)} Tage)${p.responsecode ? `; Responsecode ${p.responsecode} ${responsecodeInfo(p.responsecode).text}` : ""}`, seit: p.technikSeit, umfang: tageZwischen(p.technikSeit, heute) });
    if (p.prozesscode === "CR_REQ_PT" && p.status === "bestaetigt" && p.bestaetigtAm && tageZwischen(String(p.bestaetigtAm).slice(0, 10), heute) >= EDA_FRISTEN.nachforderungTage) b.push({ art: "nachforderung_offen", zaehlpunktnummer: p.zaehlpunktnummer, text: `Nachforderung ${datumDe(p.parameter?.von)}–${datumDe(p.parameter?.bis)} am ${datumDe(p.bestaetigtAm)} angenommen, Daten fehlen`, seit: String(p.bestaetigtAm).slice(0, 10), umfang: 1 });
  }
  for (const z of podlist) if (z.art !== "ok" && z.art !== "consent_fehlt") b.push({ art: "zuordnung_abweichend", zaehlpunktnummer: z.zaehlpunktnummer, text: z.text, seit: "", umfang: 1 });
  return b;
}

/**
 * Reklamationsschreiben (E-Mail an den Netzbetreiber) mit Befundtabelle und Antwortfrist.
 * @returns {{betreff:string, text:string, antwortBis:string, csv:string}}
 */
export function reklamationVorlage({ gemeinschaft, netzbetreiber, befunde = [], heute, absender = "ÖkoInvest GmbH als Organisator (ElWG § 68 Abs. 2)" }) {
  const antwortBis = plusTage(heute, EDA_FRISTEN.reklamationAntwortTage);
  const arten = [...new Set(befunde.map((b) => b.art))];
  const betreff = `Energiegemeinschaft ${gemeinschaft.gemeinschaftsId || gemeinschaft.name}: Reklamation Datenqualität (${befunde.length} ${befunde.length === 1 ? "Befund" : "Befunde"})`;
  const zeilen = [
    `An: ${netzbetreiber?.name || "Netzbetreiber"}${netzbetreiber?.kontaktEmail ? ` <${netzbetreiber.kontaktEmail}>` : ""}`,
    "",
    "Sehr geehrte Damen und Herren,",
    "",
    `für die Energiegemeinschaft „${gemeinschaft.name}“ (Gemeinschafts-ID ${gemeinschaft.gemeinschaftsId || "–"}, Marktpartner-ID ${gemeinschaft.marktpartnerId || "–"}) stellen wir folgende Abweichungen in der Marktkommunikation fest:`,
    "",
    ...befunde.map((b, i) => `${i + 1}. ${b.zaehlpunktnummer || "Gemeinschaft"}: ${b.text}`),
    "",
    "Grundlage:",
    ...arten.map((a) => `• ${BEFUND_ARTEN[a]?.label || a}: ${BEFUND_ARTEN[a]?.quelle || ""}`),
    "",
    `Wir bitten um Behebung bzw. Nachlieferung über EDA und um eine kurze Rückmeldung bis ${datumDe(antwortBis)}. Für die Abrechnung der Gemeinschaft sind ausschließlich die von Ihnen gelieferten Werte maßgeblich (ElWG § 71 Abs. 1 und 4); fehlende oder nicht belastbare Werte verzögern die Abrechnung aller Mitglieder.`,
    "",
    "Die Befundliste liegt als CSV bei. Diese Reklamation wird mit Datum und Inhalt protokolliert.",
    "",
    "Mit freundlichen Grüßen",
    absender,
  ];
  const kopf = "nr;art;zaehlpunkt;befund;seit;umfang";
  const esc = (v) => {
    const s = String(v ?? "");
    const f = s && "=+-@".includes(s[0]) ? `'${s}` : s;
    return f.includes(";") || f.includes('"') || f.includes("\n") ? `"${f.split('"').join('""')}"` : f;
  };
  const csv = [kopf, ...befunde.map((b, i) => [i + 1, BEFUND_ARTEN[b.art]?.label || b.art, b.zaehlpunktnummer, b.text, b.seit, b.umfang].map(esc).join(";"))].join("\n") + "\n";
  return { betreff, text: zeilen.join("\n"), antwortBis, csv };
}

/** Beschwerdeakte (Protokoll) einer Reklamation als Text – für die Schlichtungsstelle der E-Control */
export function reklamationAkte(prozess, nachrichten = []) {
  const z = [
    `Beschwerdeakte ${prozess.id} – ${prozess.ergebnis?.netzbetreiberName || prozess.netzbetreiberId}`,
    `Gemeinschaft: ${prozess.ergebnis?.gemeinschaftName || prozess.gemeinschaftId}`,
    `Status: ${prozess.status}${prozess.fristBis ? ` · Antwortfrist ${datumDe(prozess.fristBis)}` : ""}`,
    "",
    "Verlauf:",
    ...(prozess.verlauf || []).map((v) => `${String(v.am).slice(0, 16).replace("T", " ")} UTC · ${v.nach}${v.nachricht ? ` · ${v.nachricht}` : ""} · ${v.text}`),
    "",
    "Schriftverkehr (mit SHA-256 der Rohinhalte):",
    ...nachrichten.map((n) => `${String(n.zeitpunkt).slice(0, 16).replace("T", " ")} UTC · ${n.richtung === "aus" ? "an NB" : "vom NB"} · ${n.nachrichtencode} · ${n.sha256}`),
  ];
  return `${z.join("\n")}\n`;
}
