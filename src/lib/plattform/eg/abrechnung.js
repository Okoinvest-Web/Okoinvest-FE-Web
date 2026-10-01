// src/lib/plattform/eg/abrechnung.js
//
// Abrechnungslauf der Energiegemeinschaft (WP4, Fachkonzept 2.5, 3.13, 4.4, 4.5): Perioden, Rhythmus nach § 69 ElWG,
// Tarifsegmente und Zeitfenster (TOU), Preisherkunft (individuell → Tarifgruppe → Zeitfenster → Grundpreis, Sozialtarif),
// Gebühren, Mitgliedsbeiträge, Rabatte, Rechnung und Gutschrift je Mitglied mit USt-Prüfpfad je Zeile, Ersparnis- und
// Herkunftsausweis, Plausibilisierung, Probe-Abrechnung mit Vergleich (Wechsler), Vier-Augen-Freigabe.
// Reine Funktionen; Python-Spiegel: plattform/eg_abrechnung_kern.py (abrechnung_berechnen …), Vektoren eg/testdaten/abrechnung.
//
// Maßgeblich sind die vom Netzbetreiber gelieferten Werte (Eigendeckung, Restüberschuss) [ElWG § 71 Abs. 1 und 4]; WP3
// liefert sie über enPeriodenwerte. L3-Werte und unvollständige Daten sind nicht abrechenbar (HA II 13.1) – die Vorschau
// zeigt sie, die Freigabe ist gesperrt. Geld: Position = kWh (ungerundet, Periodensumme) × Preis, auf Cent gerundet; USt
// je Satz auf die Netto-Summe des Belegs (Fachkonzept 4.4).

import { plusTage, rund2 } from "../mitglied/basis.js";
import { preisFuer } from "./tarif.js";
import { ustFall, ustSummen } from "./ust.js";
import { ersparnisBerechnen, herkunft, netzApFuer, erzeugervorteil } from "./ersparnis.js";
import { pflichtangabenPruefen } from "./belege.js";

/** Ordnung nach Codepunkten (gleiches Ergebnis in JS und Python) */
const vgl = (a, b) => (a < b ? -1 : a > b ? 1 : 0);

export const ABRECHNUNG_STAND = "2026-10-01";
export const PERIODEN_ARTEN = { monat: "Monat", quartal: "Quartal", jahr: "Jahr", schluss: "Schlussabrechnung" };
export const PERIODE_STATUS = {
  offen: { label: "Offen", ton: "neutral" },
  vorschau: { label: "Vorschau berechnet", ton: "info" },
  freigabe_teilweise: { label: "1 von 2 Freigaben", ton: "warn" },
  freigegeben: { label: "Freigegeben", ton: "ok" },
  versendet: { label: "Versendet", ton: "ok" },
  abgeschlossen: { label: "Abgeschlossen", ton: "neutral" },
  storniert: { label: "Storniert", ton: "neutral" },
  probe: { label: "Probe-Abrechnung", ton: "info" },
};
/** Erlaubte Aktionen je Status */
export const PERIODE_AKTIONEN = {
  offen: ["vorschau", "verwerfen"],
  vorschau: ["vorschau", "freigeben", "verwerfen"],
  freigabe_teilweise: ["vorschau", "freigeben"],
  freigegeben: ["versenden", "stornieren"],
  versendet: ["abschliessen", "stornieren"],
  abgeschlossen: ["stornieren"],
  storniert: [],
  probe: ["vorschau", "vergleich", "verwerfen"],
};
export const EINSTELLUNGEN_STANDARD = {
  zahlungszielTage: 14,
  mitgliedsbeitragArt: "unecht",
  beitragMonat: 1,
  netzApCt: null, // Ersatzwert, solange der Netzbetreiber-AP nicht gepflegt ist
  efbApCt: null,
  referenzLieferantCt: null,
  referenzEinspeisungCt: null,
  aufrechnung: true,
  gruppen: [],
  rabatte: [],
  gutschriftverfahren: {},
  toleranzPct: 0.5,
  toleranzKwh: 0.1,
};
export const DATEN_QUELLE = "ElWG § 71 Abs. 1 und 4; HA II 13 (Netzbetreiberwerte maßgeblich, L3 nicht abrechenbar)";

const tag = (v) => String(v || "").slice(0, 10);
const r3 = (x) => Math.round((Number(x) || 0) * 1000) / 1000;
export const kwhText = (x) => r3(x).toFixed(3).replace(".", ",");
export const eurText = (x) => `${rund2(x).toFixed(2).replace(".", ",")} €`;
const ctText = (x) => String(Math.round((Number(x) || 0) * 10000) / 10000).replace(".", ",");

// ---------------------------------------------------------------- Perioden

const monatsEnde = (j, m) => new Date(Date.UTC(j, m, 0)).toISOString().slice(0, 10);
const zweistellig = (n) => String(n).padStart(2, "0");

/** Letzte vollständige Periode vor dem Stichtag */
export function periodeVorschlag(art, stichtag) {
  const [j, m] = tag(stichtag).split("-").map(Number);
  if (art === "jahr") return { von: `${j - 1}-01-01`, bis: `${j - 1}-12-31`, art };
  if (art === "quartal") {
    const q = Math.floor((m - 1) / 3); // aktuelles Quartal 0–3
    const vj = q === 0 ? j - 1 : j;
    const vq = q === 0 ? 3 : q - 1;
    return { von: `${vj}-${zweistellig(vq * 3 + 1)}-01`, bis: monatsEnde(vj, vq * 3 + 3), art };
  }
  const vj = m === 1 ? j - 1 : j;
  const vm = m === 1 ? 12 : m - 1;
  return { von: `${vj}-${zweistellig(vm)}-01`, bis: monatsEnde(vj, vm), art: "monat" };
}

/** Frühester sinnvoller Abrechnungstag: 20. des Folgemonats nach dem Clearing (Koordinationsstelle Schritt 7) */
export function abrechnungFruehestens(bis) {
  const [j, m] = tag(bis).split("-").map(Number);
  return m === 12 ? `${j + 1}-01-20` : `${j}-${zweistellig(m + 1)}-20`;
}

/** Kalendermonate, die der Zeitraum berührt */
export function monateImZeitraum(von, bis) {
  if (!von || !bis || bis < von) return 0;
  const [j1, m1] = tag(von).split("-").map(Number);
  const [j2, m2] = tag(bis).split("-").map(Number);
  return (j2 - j1) * 12 + (m2 - m1) + 1;
}

/** Periode prüfen; wirft Error mit deutscher Meldung */
export function periodeBereinigen({ von, bis, art = "monat", probe = false } = {}, { heute, vorhandene = [] } = {}) {
  const v = tag(von);
  const b = tag(bis);
  const re = /^\d\d\d\d-\d\d-\d\d$/;
  if (!re.test(v) || !re.test(b)) throw new Error("Bitte Beginn und Ende der Periode angeben.");
  if (b < v) throw new Error("Das Ende liegt vor dem Beginn.");
  if (!PERIODEN_ARTEN[art]) throw new Error("Unbekannte Periodenart.");
  if (monateImZeitraum(v, b) > 12) throw new Error("Eine Periode umfasst höchstens 12 Monate.");
  if (heute && b >= tag(heute)) throw new Error("Abgerechnet werden nur abgeschlossene Zeiträume (Ende vor heute).");
  if (!probe) {
    const ueberlapp = vorhandene.find((p) => !p.probe && p.status !== "storniert" && p.art === art && p.von <= b && p.bis >= v);
    if (ueberlapp) throw new Error(`Es gibt bereits eine Periode (${ueberlapp.von} bis ${ueberlapp.bis}) dieser Art im Zeitraum.`);
  }
  const hinweise = [];
  if (heute && tag(heute) < abrechnungFruehestens(b)) hinweise.push(`Die Netzbetreiber-Werte sind erst nach dem Clearing endgültig – Abrechnung frühestens ab ${abrechnungFruehestens(b).split("-").reverse().join(".")} empfohlen (Koordinationsstelle, Schritt 7).`);
  return { von: v, bis: b, art, probe: !!probe, hinweise };
}

// ---------------------------------------------------------------- Tarife und Segmente

const TARIF_GUELTIG = ["beschlossen", "aktiv", "abgeloest"];
/** Tarif an einem Tag (inkl. abgelöster Versionen – für vergangene Perioden) */
export function tarifFuerTag(tarife = [], d) {
  const t = tag(d);
  return tarife.filter((x) => TARIF_GUELTIG.includes(x.status) && x.gueltigAb <= t && (!x.gueltigBis || x.gueltigBis >= t)).sort((a, b) => vgl(b.gueltigAb, a.gueltigAb))[0] || null;
}

/** Periode an Tarifwechseln teilen: [{von, bis, tarifId}] (tarifId null = kein Tarif) */
export function tarifSegmente(tarife = [], von, bis) {
  const grenzen = [...new Set(tarife.filter((x) => TARIF_GUELTIG.includes(x.status)).flatMap((x) => [x.gueltigAb, x.gueltigBis ? plusTage(x.gueltigBis, 1) : ""]).filter((d) => d && d > von && d <= bis))].sort();
  const starts = [von, ...grenzen];
  return starts.map((s, i) => {
    const e = i + 1 < starts.length ? plusTage(starts[i + 1], -1) : bis;
    return { von: s, bis: e, tarifId: tarifFuerTag(tarife, s)?.id || null };
  });
}

/**
 * Viertelstundenwerte je Zeitfenster summieren (für TOU, wenn WP3 nur Reihen liefert).
 * @param {{lokal:string, groessen:Object<string,number>}[]} reihen  lokal = „JJJJ-MM-TTTHH:MM“
 */
export function zeitfensterAufteilen(reihen = [], tarif, { mitgliedId = "" } = {}) {
  const aus = {};
  for (const q of reihen) {
    const zf = preisFuer(tarif, q.lokal, { mitgliedId }).zeitfenster || "";
    const z = aus[zf] || (aus[zf] = {});
    for (const [g, w] of Object.entries(q.groessen || {})) z[g] = (z[g] || 0) + (Number(w) || 0);
  }
  return aus;
}

/** Tarifgruppe (Sondertarif) eines Mitglieds aus den Einstellungen */
export function gruppeVon(mitglied, gruppen = []) {
  return gruppen.find((g) => (g.mitgliedIds || []).includes(mitglied.id)) || gruppen.find((g) => (g.mitgliedArten || []).includes(mitglied.art)) || null;
}

/** Preis einer Position mit Herkunft (Prüfpfad) */
export function preisErmitteln({ tarif, mitglied, gruppen = [], zeitfensterId = "", richtung = "verbrauch" }) {
  const feld = richtung === "erzeugung" ? "einspeisepreisCt" : "bezugspreisCt";
  const ind = (tarif?.individuell || []).find((x) => x.mitgliedId === mitglied.id);
  const grp = gruppeVon(mitglied, gruppen);
  const zf = (tarif?.zeitfenster || []).find((z) => z.id === zeitfensterId);
  const kandidaten = [
    [ind?.[feld], `individueller Preis (${ind?.grund || "dokumentierter Grund"})`],
    [grp?.[feld], `Tarifgruppe „${grp?.label || ""}“`],
    [zf?.[feld], `Zeitfenster „${zf?.label || ""}“`],
    [tarif?.[feld], `Grundpreis ${tarif?.bezeichnung || ""}`.trim()],
  ];
  const [preis, herkunftText] = kandidaten.find(([p]) => p !== null && p !== undefined) || [0, "kein Preis"];
  let p = Number(preis);
  let h = herkunftText;
  const sozial = tarif?.sozialtarif?.bezugspreisCt;
  if (richtung === "verbrauch" && mitglied.schutzbeduerftig && sozial !== null && sozial !== undefined && Number(sozial) < p) {
    p = Number(sozial);
    h = "Sozialtarif für schutzbedürftige Haushalte (ElWG § 68 Abs. 6)";
  }
  return { preisCt: p, herkunft: h };
}

/** Rhythmus eines Mitglieds (Wahl nach § 69 ElWG nur bei Lieferantenpflichten, sonst Vorgabe der Gemeinschaft) */
export function rhythmusVon(mitglied, gemeinschaft, lieferantenpflichten) {
  return (lieferantenpflichten && mitglied.abrechnungsrhythmus) || gemeinschaft.abrechnungsrhythmus || "monat";
}

const ueberlappt = (aVon, aBis, bVon, bBis) => (!aVon || aVon <= bBis) && (!aBis || aBis >= bVon);

// ---------------------------------------------------------------- Abrechnung

/**
 * Abrechnung einer Periode berechnen (Vorschau; Nummern vergibt erst die Freigabe).
 * @param {object} e
 * @param {object} e.gemeinschaft
 * @param {{id:string, von:string, bis:string, art:string}} e.periode
 * @param {object[]} e.mitglieder · e.zaehlpunkte · e.teilnahmen · e.tarife · e.anlagen · e.netzbetreiber
 * @param {{teilnahmeId:string, zaehlpunktId:string, von:string, bis:string, groessen:Object, jeZeitfenster?:Object, vollstaendig:boolean, anteilL3:number}[]} e.werte
 * @param {object} e.einstellungen  (EINSTELLUNGEN_STANDARD)
 * @param {{beitritt:string[], beitrag:string[]}} e.verrechnet  bereits verrechnete Einmalgebühren („mitgliedId“) bzw. Beiträge („mitgliedId:jahr“)
 * @param {boolean} e.lieferantenpflichten  § 69 ElWG
 * @param {string} e.heute
 */
export function abrechnungBerechnen({ gemeinschaft: g, periode, mitglieder = [], zaehlpunkte = [], teilnahmen = [], tarife = [], anlagen = [], netzbetreiber = [], werte = [], einstellungen = {}, verrechnet = {}, lieferantenpflichten = false, heute }) {
  const ein = { ...EINSTELLUNGEN_STANDARD, ...einstellungen };
  const fehler = [];
  const warnungen = [];
  const hinweise = [];
  const zpVon = new Map(zaehlpunkte.map((z) => [z.id, z]));
  const tnVon = new Map(teilnahmen.map((t) => [t.id, t]));
  const tarifVon = new Map(tarife.map((t) => [t.id, t]));
  const anlageVon = new Map(anlagen.map((a) => [a.id, a]));
  const nbVon = new Map(netzbetreiber.map((n) => [n.id, n]));
  const beitritt = new Set(verrechnet.beitritt || []);
  const beitrag = new Set(verrechnet.beitrag || []);
  const jahr = Number(periode.bis.slice(0, 4));
  const aussteller = {
    name: g.name, strasse: g.sitzAdresse?.strasse || "", plz: g.sitzAdresse?.plz || "", ort: g.sitzAdresse?.ort || "", email: g.email || "", telefon: g.telefon || "",
    uid: g.uid || "", zvr: g.zvrZahl || "", fn: g.firmenbuchnummer || "", iban: g.iban || "", bic: g.bic || "", creditorId: g.creditorId || "", gemeinschaftsId: g.gemeinschaftsId || "", ustStatus: g.ustStatus || "kleinunternehmer",
  };

  // Werte je Teilnahme sammeln, Datenqualität prüfen
  const jeTeilnahme = new Map();
  let summeEd = 0;
  let summeG = 0;
  let summeErz = 0;
  let summeRest = 0;
  let summeVerbrauch = 0;
  let nichtAbrechenbar = 0;
  const herkunftMengen = [];
  for (const w of werte) {
    const t = tnVon.get(w.teilnahmeId);
    if (!t || t.gemeinschaftId !== g.id) continue;
    const z = zpVon.get(t.zaehlpunktId);
    if (!z) continue;
    const gr = w.groessen || {};
    if (z.richtung === "verbrauch") {
      summeEd += Number(gr.eigendeckung) || 0;
      summeVerbrauch += Number(gr.verbrauch_gemessen) || 0;
    } else {
      const eingebracht = Math.max(0, (Number(gr.erzeugung_tf) || 0) - (Number(gr.restueberschuss) || 0));
      summeG += eingebracht;
      summeErz += Number(gr.erzeugung_tf) || 0;
      summeRest += Number(gr.restueberschuss) || 0;
      herkunftMengen.push({ art: anlageVon.get(z.anlageId)?.art || "pv", kwh: eingebracht });
    }
    if (w.vollstaendig === false || Number(w.anteilL3) > 0) {
      nichtAbrechenbar += 1;
      fehler.push({ code: "daten", mitgliedId: t.mitgliedId, text: `Zählpunkt ${z.zaehlpunktnummer} (${w.von} bis ${w.bis}): ${w.vollstaendig === false ? "Daten unvollständig" : `${Math.round(Number(w.anteilL3) * 1000) / 10} % L3-Werte`} – nicht abrechenbar, Nachforderung (CR_REQ_PT) auslösen.`, quelle: DATEN_QUELLE });
    }
    const liste = jeTeilnahme.get(t.id) || [];
    liste.push(w);
    jeTeilnahme.set(t.id, liste);
  }
  const herk = herkunft(herkunftMengen);

  const belege = [];
  const ausgeschlossen = [];
  for (const m of [...mitglieder].filter((x) => x.gemeinschaftId === g.id).sort((a, b) => (a.mitgliedsnummer || 0) - (b.mitgliedsnummer || 0))) {
    const tns = teilnahmen.filter((t) => t.mitgliedId === m.id && t.gemeinschaftId === g.id && jeTeilnahme.has(t.id));
    const aktivImZeitraum = ueberlappt(m.beitrittAm || "", m.austrittZum || "", periode.von, periode.bis) && !["interessent", "antrag", "geprueft", "abgelehnt"].includes(m.status);
    if (!tns.length && !aktivImZeitraum) continue;
    const r = rhythmusVon(m, g, lieferantenpflichten);
    if (periode.art !== "schluss" && r !== periode.art) {
      ausgeschlossen.push({ mitgliedId: m.id, grund: `Abrechnungsrhythmus „${r}“ – wird in der entsprechenden Periode abgerechnet.` });
      continue;
    }
    const name = m.person?.firma || [m.person?.vorname, m.person?.nachname].filter(Boolean).join(" ");
    const empfaenger = { name, strasse: m.person?.strasse || "", plz: m.person?.plz || "", ort: m.person?.ort || "", email: m.person?.email || "", uid: m.uid || "", unternehmer: ["kmu", "grossunternehmen", "landwirt"].includes(m.art) || !!m.uid };
    const datumVorschau = tag(heute);
    const basis = { datum: datumVorschau, faelligAm: datumVorschau ? plusTage(datumVorschau, Number(ein.zahlungszielTage) || 14) : "", lieferantenpflichten: !!lieferantenpflichten, gemeinschaftId: g.id, periodeId: periode.id, mitgliedId: m.id, mitgliedsnummer: m.mitgliedsnummer, kontoId: m.kontoId || null, von: periode.von, bis: periode.bis, aussteller, empfaenger, status: "entwurf", herkunft: herk };
    const rech = [];
    const gut = [];
    const zps = [];
    const energieR = { verbrauchGemessen: 0, eigendeckung: 0 };
    const energieG = { erzeugungTf: 0, restueberschuss: 0, eingebracht: 0 };
    const ersparnisSumme = { netzEur: 0, abgabeEur: 0, efbEur: 0, energieEur: 0, summeEur: 0, netzBekannt: false, energieBekannt: false, platzhalter: false, quellen: new Set(), reduktionPct: 0 };
    const fehlerR = [];
    const fehlerG = [];
    const belegWarn = [];

    for (const t of tns) {
      const z = zpVon.get(t.zaehlpunktId);
      zps.push({ nummer: z.zaehlpunktnummer, richtung: z.richtung, bezeichnung: z.bezeichnung || "", teilnahmefaktor: t.teilnahmefaktor });
      for (const w of jeTeilnahme.get(t.id).sort((a, b) => vgl(a.von, b.von))) {
        const tarif = tarifFuerTag(tarife, w.von) || tarifVon.get(w.tarifId);
        const belegFehler = z.richtung === "erzeugung" ? fehlerG : fehlerR;
        if (!tarif) {
          belegFehler.push(`Kein gültiger Tarif am ${w.von} – bitte Preisblatt beschließen.`);
          continue;
        }
        const gr = w.groessen || {};
        const richtung = z.richtung;
        const feld = richtung === "erzeugung" ? "einspeisepreisCt" : "bezugspreisCt";
        const tou = (tarif.zeitfenster || []).some((x) => x[feld] !== null && x[feld] !== undefined);
        let teile;
        if (tou && w.jeZeitfenster) teile = Object.entries(w.jeZeitfenster).sort(([a], [b]) => vgl(a, b));
        else {
          if (tou) belegFehler.push(`Tarif mit Zeitfenstern, aber keine Aufteilung der Werte je Zeitfenster für Zählpunkt ${z.zaehlpunktnummer} (${w.von} bis ${w.bis}).`);
          teile = [["", gr]];
        }
        if (richtung === "verbrauch") {
          energieR.verbrauchGemessen += Number(gr.verbrauch_gemessen) || 0;
          energieR.eigendeckung += Number(gr.eigendeckung) || 0;
          let nettoEnergie = 0;
          for (const [zfId, wz] of teile) {
            const kwh = Number(wz.eigendeckung) || 0;
            if (kwh <= 0) continue;
            const pr = preisErmitteln({ tarif, mitglied: m, gruppen: ein.gruppen, zeitfensterId: zfId, richtung });
            const u = ustFall({ art: "bezug", gemeinschaft: g, mitglied: m });
            const netto = rund2((kwh * pr.preisCt) / 100);
            nettoEnergie += netto;
            const zfLabel = (tarif.zeitfenster || []).find((x) => x.id === zfId)?.label || "";
            rech.push({ art: "bezug", text: `Gemeinschaftsstrom (Eigendeckung)${zfLabel ? ` – ${zfLabel}` : ""}`, zaehlpunkt: z.zaehlpunktnummer, von: w.von, bis: w.bis, menge: r3(kwh), mengeRoh: kwh, einheit: "kWh", preis: pr.preisCt, preisEinheit: "ct/kWh", netto, zeitfenster: zfId, preisHerkunft: pr.herkunft, ust: u, pruefpfad: [{ frage: "Menge", antwort: `${kwhText(kwh)} kWh Eigendeckung laut Netzbetreiber (Teilnahmefaktor ${t.teilnahmefaktor} %)`, quelle: DATEN_QUELLE }, { frage: "Preis", antwort: `${ctText(pr.preisCt)} ct/kWh – ${pr.herkunft}`, quelle: "Tarif der Gemeinschaft (Fachkonzept 3.10)" }, ...u.pruefpfad] });
          }
          const kwh = Number(gr.eigendeckung) || 0;
          if (kwh > 0) {
            const nb = nbVon.get(z.netzbetreiberId);
            const ap = netzApFuer(nb, w.bis, z.netzebene || 7, ein.netzApCt);
            const es = ersparnisBerechnen({ eigendeckungKwh: kwh, datum: w.bis, modell: g.modell, zonelevel: g.zonelevel, netzebene: z.netzebene || 7, netzApCt: ap.ct, haushalt: m.art === "privat", bezugspreisCt: kwh > 0 ? (nettoEnergie * 100) / kwh : 0, lieferantPreisCt: ein.referenzLieferantCt, efbApCt: ein.efbApCt });
            if (es.netzEur !== null) {
              ersparnisSumme.netzEur += es.netzEur;
              ersparnisSumme.netzBekannt = true;
            }
            ersparnisSumme.abgabeEur += es.abgabeEur;
            ersparnisSumme.efbEur += es.efbEur;
            if (es.energieEur !== null) {
              ersparnisSumme.energieEur += es.energieEur;
              ersparnisSumme.energieBekannt = true;
            }
            ersparnisSumme.summeEur += es.summeEur;
            ersparnisSumme.platzhalter = ersparnisSumme.platzhalter || es.platzhalter;
            ersparnisSumme.reduktionPct = es.reduktionPct;
            for (const q of [...es.quellen, ap.quelle]) ersparnisSumme.quellen.add(q);
          }
        } else {
          const tf = Number(gr.erzeugung_tf) || 0;
          const rest = Number(gr.restueberschuss) || 0;
          energieG.erzeugungTf += tf;
          energieG.restueberschuss += rest;
          energieG.eingebracht += Math.max(0, tf - rest);
          for (const [zfId, wz] of teile) {
            const kwh = Math.max(0, (Number(wz.erzeugung_tf) || 0) - (Number(wz.restueberschuss) || 0));
            if (kwh <= 0) continue;
            const pr = preisErmitteln({ tarif, mitglied: m, gruppen: ein.gruppen, zeitfensterId: zfId, richtung });
            const u = ustFall({ art: "einspeisung", gemeinschaft: g, mitglied: m });
            const netto = u.regel === "ERZ_NICHT_UNTERNEHMERISCH" ? 0 : rund2((kwh * pr.preisCt) / 100);
            const zfLabel = (tarif.zeitfenster || []).find((x) => x.id === zfId)?.label || "";
            gut.push({ art: "einspeisung", text: `In die Gemeinschaft eingebrachter Strom${zfLabel ? ` – ${zfLabel}` : ""}`, zaehlpunkt: z.zaehlpunktnummer, von: w.von, bis: w.bis, menge: r3(kwh), mengeRoh: kwh, einheit: "kWh", preis: u.regel === "ERZ_NICHT_UNTERNEHMERISCH" ? 0 : pr.preisCt, preisEinheit: "ct/kWh", netto, zeitfenster: zfId, preisHerkunft: pr.herkunft, ust: u, pruefpfad: [{ frage: "Menge", antwort: `${kwhText(kwh)} kWh = Erzeugung × Teilnahmefaktor − Restüberschuss (Teilnahmefaktor ${t.teilnahmefaktor} %)`, quelle: "Fachkonzept 4.5; HA II 13" }, { frage: "Preis", antwort: `${ctText(pr.preisCt)} ct/kWh – ${pr.herkunft}`, quelle: "Tarif der Gemeinschaft (Fachkonzept 3.10)" }, ...u.pruefpfad] });
            for (const f of u.fehler) if (!fehlerG.includes(f)) fehlerG.push(f);
            for (const x of u.warnungen) if (!belegWarn.includes(x)) belegWarn.push(x);
          }
        }
      }
    }

    // Gebühren und Beiträge (Tarif am Periodenende)
    const tarifEnde = tarifFuerTag(tarife, periode.bis);
    const vonM = m.beitrittAm && m.beitrittAm > periode.von ? m.beitrittAm : periode.von;
    const bisM = m.austrittZum && m.austrittZum < periode.bis ? m.austrittZum : periode.bis;
    const monate = aktivImZeitraum ? monateImZeitraum(vonM, bisM) : 0;
    if (tarifEnde && monate > 0) {
      const geb = (art, text, menge, einheit, preis, extra = {}) => {
        if (!(preis > 0) || !(menge > 0)) return;
        const u = ustFall({ art: art === "mitgliedsbeitrag" ? "mitgliedsbeitrag" : "gebuehr", gemeinschaft: g, mitglied: m, mitgliedsbeitragArt: ein.mitgliedsbeitragArt });
        rech.push({ art, text, zaehlpunkt: "", von: periode.von, bis: periode.bis, menge, einheit, preis, preisEinheit: "€", netto: rund2(menge * preis), zeitfenster: "", preisHerkunft: `${tarifEnde.bezeichnung}`, ust: u, pruefpfad: [{ frage: "Grundlage", antwort: text, quelle: "Tarif der Gemeinschaft (Fachkonzept 3.10, 4.5)" }, ...u.pruefpfad], ...extra });
      };
      geb("grundgebuehr", `Grundgebühr (${monate} ${monate === 1 ? "Monat" : "Monate"})`, monate, "Monat", Number(tarifEnde.grundgebuehrMonat) || 0);
      const zpAnzahl = tns.length;
      geb("zp_gebuehr", `Zählpunktgebühr (${zpAnzahl} ${zpAnzahl === 1 ? "Zählpunkt" : "Zählpunkte"} × ${monate} ${monate === 1 ? "Monat" : "Monate"})`, zpAnzahl * monate, "ZP-Monat", Number(tarifEnde.zaehlpunktgebuehrMonat) || 0);
      if (m.beitrittAm && m.beitrittAm >= periode.von && m.beitrittAm <= periode.bis && !beitritt.has(m.id)) geb("beitrittsgebuehr", "Einmalige Beitrittsgebühr", 1, "Stk", Number(tarifEnde.einmalgebuehrBeitritt) || 0, { verrechnet: `beitritt:${m.id}` });
      const faellig = `${jahr}-${zweistellig(ein.beitragMonat || 1)}-01`;
      const beitragHier = (faellig >= periode.von && faellig <= periode.bis && (!m.beitrittAm || m.beitrittAm <= periode.bis)) || (m.beitrittAm && m.beitrittAm >= periode.von && m.beitrittAm <= periode.bis && m.beitrittAm > faellig);
      if (beitragHier && !beitrag.has(`${m.id}:${jahr}`)) geb("mitgliedsbeitrag", `Mitgliedsbeitrag ${jahr} (${ein.mitgliedsbeitragArt === "echt" ? "echter Beitrag" : "Leistungsentgelt"})`, 1, "Jahr", Number(tarifEnde.mitgliedsbeitragJahr) || 0, { verrechnet: `beitrag:${m.id}:${jahr}` });
    }

    // Rabatte
    for (const rb of ein.rabatte || []) {
      const passt = (!(rb.mitgliedIds || []).length || rb.mitgliedIds.includes(m.id)) && (!(rb.mitgliedArten || []).length || rb.mitgliedArten.includes(m.art)) && (!rb.gruppe || gruppeVon(m, ein.gruppen)?.id === rb.gruppe) && ueberlappt(rb.gueltigAb || "", rb.gueltigBis || "", periode.von, periode.bis);
      if (!passt) continue;
      const bezug = rb.bezug || "energie";
      const basisNetto = rund2(rech.filter((p) => (bezug === "alles" ? p.art !== "rabatt" : bezug === "energie" ? p.art === "bezug" : !["bezug", "rabatt"].includes(p.art))).reduce((s, p) => s + p.netto, 0));
      if (basisNetto <= 0) continue;
      const betrag = rb.art === "pct" ? rund2((basisNetto * Number(rb.wert)) / 100) : Math.min(rund2(Number(rb.wert)), basisNetto);
      if (!(betrag > 0)) continue;
      const u = ustFall({ art: "gebuehr", gemeinschaft: g, mitglied: m });
      rech.push({ art: "rabatt", text: `${rb.label || "Rabatt"}${rb.art === "pct" ? ` (${String(rb.wert).replace(".", ",")} %)` : ""}`, zaehlpunkt: "", von: periode.von, bis: periode.bis, menge: 1, einheit: "Stk", preis: -betrag, preisEinheit: "€", netto: -betrag, zeitfenster: "", preisHerkunft: "Rabatt laut Beschluss", ust: u, pruefpfad: [{ frage: "Rabatt", antwort: `${rb.label || "Rabatt"} auf ${eurText(basisNetto)}`, quelle: rb.beschluss || "Einstellungen der Gemeinschaft" }, ...u.pruefpfad] });
    }

    const nr = (liste) => liste.map((p, i) => ({ nr: i + 1, ...p }));
    if (rech.length) {
      const summen = ustSummen(rech);
      const ed = energieR.eigendeckung;
      const b = {
        ...basis, typ: "rechnung", positionen: nr(rech), summen, zaehlpunkte: zps.some((x) => x.richtung === "verbrauch") ? zps.filter((x) => x.richtung === "verbrauch") : zps,
        energie: { verbrauchGemessen: r3(energieR.verbrauchGemessen), eigendeckung: r3(ed), quoteEigendeckung: energieR.verbrauchGemessen > 0 ? Math.round((ed / energieR.verbrauchGemessen) * 1000) / 10 : null },
        ersparnis: ed > 0 ? { netzEur: ersparnisSumme.netzBekannt ? rund2(ersparnisSumme.netzEur) : null, abgabeEur: rund2(ersparnisSumme.abgabeEur), efbEur: rund2(ersparnisSumme.efbEur), energieEur: ersparnisSumme.energieBekannt ? rund2(ersparnisSumme.energieEur) : null, summeEur: rund2(ersparnisSumme.summeEur), reduktionPct: ersparnisSumme.reduktionPct, platzhalter: ersparnisSumme.platzhalter, quellen: [...ersparnisSumme.quellen], text: "Ihr Vorteil durch die Energiegemeinschaft (Schätzung, die Abrechnung erfolgt durch Ihren Netzbetreiber)" } : null,
        zahlweg: m.sepaMandat?.status === "aktiv" && m.iban && g.creditorId ? { art: "lastschrift", mandatRef: m.sepaMandat.referenz, mandatDatum: m.sepaMandat.datum, creditorId: g.creditorId, iban: m.iban } : { art: "ueberweisung", iban: g.iban || "", bic: g.bic || "" },
        verrechnet: rech.map((p) => p.verrechnet).filter(Boolean),
        fehler: [...fehlerR], warnungen: [],
      };
      if (summen.netto < 0) b.warnungen.push("Negativer Rechnungsbetrag (Rabatt über Entgelt) – bitte prüfen.");
      belege.push(b);
    }
    if (gut.length) {
      const unternehmerisch = gut.some((p) => p.ust.regel !== "ERZ_NICHT_UNTERNEHMERISCH");
      if (!unternehmerisch) {
        hinweise.push(`${name}: Einbringung ohne Entgelt (nicht unternehmerisch) – ${kwhText(energieG.eingebracht)} kWh, keine Gutschrift (nur Mengenbestätigung in der Jahresbescheinigung).`);
      } else {
        const gv = (ein.gutschriftverfahren || {})[m.id];
        const zustimmung = (gv && gv.zugestimmtAm && !gv.widersprochenAm) || (m.vertraege || []).some((v) => ["einspeisung", "gutschriftverfahren"].includes(v.art));
        const summen = ustSummen(gut);
        const b = {
          ...basis, typ: "gutschrift", positionen: nr(gut), summen, zaehlpunkte: zps.filter((x) => x.richtung === "erzeugung"),
          energie: { erzeugungTf: r3(energieG.erzeugungTf), restueberschuss: r3(energieG.restueberschuss), eingebracht: r3(energieG.eingebracht) },
          erzeugervorteilEur: erzeugervorteil({ eingebrachtKwh: energieG.eingebracht, einspeisepreisCt: energieG.eingebracht > 0 ? (summen.netto * 100) / energieG.eingebracht : 0, marktpreisCt: ein.referenzEinspeisungCt }),
          gutschriftZustimmung: !!zustimmung,
          zahlweg: { art: "gutschrift_ueberweisung", iban: m.iban || "" },
          fehler: [...fehlerG],
          warnungen: [...belegWarn],
        };
        if (!m.iban) b.warnungen.push("IBAN des Erzeugers fehlt – Auszahlung manuell.");
        belege.push(b);
      }
    }
    if (!rech.length) for (const f of fehlerR) fehler.push({ code: "tarif", mitgliedId: m.id, text: `${name}: ${f}` });
    if (!gut.length) for (const f of fehlerG) fehler.push({ code: "tarif", mitgliedId: m.id, text: `${name}: ${f}` });
  }

  // Pflichtangaben und Beleg-Prüfung
  for (const b of belege) {
    for (const p of pflichtangabenPruefen(b, { lieferantenpflichten })) {
      if (p.stufe === "fehler") b.fehler.push(`${p.text} fehlt (${p.quelle}).`);
      else b.warnungen.push(`${p.text} fehlt (${p.quelle}).`);
    }
    b.fehler = [...new Set(b.fehler)];
    for (const f of b.fehler) fehler.push({ code: "beleg", mitgliedId: b.mitgliedId, typ: b.typ, text: `${b.empfaenger.name} (${b.typ === "gutschrift" ? "Gutschrift" : "Rechnung"}): ${f}` });
    for (const x of b.warnungen) warnungen.push({ code: "beleg", mitgliedId: b.mitgliedId, typ: b.typ, text: `${b.empfaenger.name}: ${x}` });
  }

  // Kontrolle Σ Eigendeckung = Σ eingebrachte Erzeugung (Fachkonzept 4.5)
  const differenz = r3(summeEd - summeG);
  const toleranz = Math.max(Number(ein.toleranzKwh) * Math.max(1, werte.length), (summeEd * Number(ein.toleranzPct)) / 100);
  const kontrolle = { eigendeckung: r3(summeEd), eingebracht: r3(summeG), differenz, toleranz: r3(toleranz), ok: Math.abs(differenz) <= toleranz };
  if (!kontrolle.ok && werte.length) warnungen.push({ code: "kontrolle", text: `Summe Eigendeckung (${kwhText(summeEd)} kWh) weicht von der eingebrachten Erzeugung (${kwhText(summeG)} kWh) um ${kwhText(differenz)} kWh ab – Abweichungsbericht (WP3) prüfen.` });
  if (!werte.length) fehler.push({ code: "daten", text: "Für die Periode liegen keine Energiedaten des Netzbetreibers vor." });

  const rechnungen = belege.filter((b) => b.typ === "rechnung");
  const gutschriften = belege.filter((b) => b.typ === "gutschrift");
  const nettoBezug = rund2(rechnungen.reduce((s, b) => s + b.positionen.filter((p) => p.art === "bezug").reduce((x, p) => x + p.netto, 0), 0));
  const nettoEinspeisung = rund2(gutschriften.reduce((s, b) => s + b.summen.netto, 0));
  if (["eeg", "beg"].includes(g.modell) && nettoBezug > 0 && nettoBezug - nettoEinspeisung > nettoBezug * 0.25) hinweise.push(`Die Energiemarge beträgt ${eurText(nettoBezug - nettoEinspeisung)} (${Math.round(((nettoBezug - nettoEinspeisung) / nettoBezug) * 100)} % des Bezugs). Hauptzweck der Gemeinschaft ist nicht finanzieller Gewinn (EAG § 79 Abs. 1; ElWG § 67 Abs. 2) – Preissenkung oder Rückvergütung prüfen.`);
  if (lieferantenpflichten) hinweise.push("Lieferantenpflichten nach § 69 ElWG: Rechnungsinhalt nach § 69 Abs. 1 Z 4–6, Wahl Monats-/Jahresrechnung je Mitglied, Erläuterung auf Verlangen kostenlos.");

  const kennzahlen = {
    mitglieder: new Set(belege.map((b) => b.mitgliedId)).size, rechnungen: rechnungen.length, gutschriften: gutschriften.length,
    verbrauch: r3(summeVerbrauch), eigendeckung: r3(summeEd), erzeugungTf: r3(summeErz), eingebracht: r3(summeG), restueberschuss: r3(summeRest),
    quoteEigendeckung: summeVerbrauch > 0 ? Math.round((summeEd / summeVerbrauch) * 1000) / 10 : null,
    nettoRechnungen: rund2(rechnungen.reduce((s, b) => s + b.summen.netto, 0)), bruttoRechnungen: rund2(rechnungen.reduce((s, b) => s + b.summen.brutto, 0)),
    nettoGutschriften: nettoEinspeisung, bruttoGutschriften: rund2(gutschriften.reduce((s, b) => s + b.summen.brutto, 0)),
    ust: rund2(belege.reduce((s, b) => s + b.summen.ust, 0)), rcSteuer: rund2(gutschriften.reduce((s, b) => s + b.summen.rcSteuer, 0)),
    deckungsbeitrag: rund2(nettoBezug - nettoEinspeisung), nichtAbrechenbar, ersparnisSumme: rund2(rechnungen.reduce((s, b) => s + (b.ersparnis?.summeEur || 0), 0)),
  };
  return { belege, kennzahlen, kontrolle, pruefung: { fehler, warnungen, hinweise }, ausgeschlossen, herkunft: herk, heute: tag(heute) };
}

/** Fälligkeit ab Belegdatum */
export const faelligkeit = (datum, tage = EINSTELLUNGEN_STANDARD.zahlungszielTage) => plusTage(tag(datum), Number(tage) || 14);

/** Fingerabdruck einer Vorschau (Freigaben gelten nur für genau diese Zahlen) */
export function vorschauFingerabdruck(belege = []) {
  return belege.map((b) => [b.mitgliedId, b.typ, rund2(b.summen.netto).toFixed(2), rund2(b.summen.brutto).toFixed(2), b.positionen.length].join(":")).sort().join("|");
}

// ---------------------------------------------------------------- Vier-Augen-Freigabe

/**
 * Freigabe prüfen. `stufen`: { freigabe1, freigabe2 } (0–2 aus eg/rechte.js), `kontoId` des Freigebenden.
 * @returns {{ok:boolean, grund:string, auge:1|2|null, vollstaendig:boolean}}
 */
export function freigabePruefen(periode, { stufen = {}, kontoId = "", fingerabdruck = "", blockierendeFehler = 0 } = {}) {
  const nein = (grund) => ({ ok: false, grund, auge: null, vollstaendig: false });
  if (periode.probe) return nein("Eine Probe-Abrechnung kann nicht freigegeben werden.");
  if (!["vorschau", "freigabe_teilweise"].includes(periode.status)) return nein("Freigeben lässt sich nur eine berechnete Vorschau.");
  if (blockierendeFehler > 0) return nein(`Die Vorschau enthält ${blockierendeFehler} blockierende ${blockierendeFehler === 1 ? "Prüfung" : "Prüfungen"} – bitte zuerst klären.`);
  if (!fingerabdruck || periode.fingerabdruck !== fingerabdruck) return nein("Die Zahlen haben sich seit der Vorschau geändert – bitte Vorschau neu berechnen.");
  const fg = (periode.freigaben || []).filter((f) => f.fingerabdruck === periode.fingerabdruck);
  if (fg.some((f) => f.kontoId === kontoId)) return nein("Vier-Augen-Prinzip: Die zweite Freigabe muss eine andere Person erteilen.");
  const hat = (a) => fg.some((f) => f.auge === a);
  let auge = null;
  if (stufen.freigabe1 >= 2 && !hat(1)) auge = 1;
  else if (stufen.freigabe2 >= 2 && !hat(2)) auge = 2;
  if (!auge) return nein(stufen.freigabe1 >= 2 || stufen.freigabe2 >= 2 ? "Ihre Freigabe liegt bereits vor – es fehlt die Freigabe der anderen Funktion (Kassier bzw. Vorstand)." : "Freigeben dürfen Kassier (1. Auge) und Obmann bzw. Vorstand (2. Auge).");
  return { ok: true, grund: "", auge, vollstaendig: hat(auge === 1 ? 2 : 1) };
}

// ---------------------------------------------------------------- Probe-Abrechnung und Vergleich (Wechsler)

/** Altwerte (CSV „mitgliedsnummer;typ;netto“, typ rechnung|gutschrift) lesen */
export function altwerteLesen(csv) {
  const zeilen = String(csv || "").replace(/\r/g, "").split("\n").map((z) => z.trim()).filter(Boolean);
  const aus = [];
  const fehler = [];
  zeilen.forEach((z, i) => {
    const t = z.split(";").map((x) => x.trim());
    if (i === 0 && /mitglied/i.test(t[0])) return;
    const nr = Number(t[0]);
    const typ = (t[1] || "rechnung").toLowerCase();
    const netto = Number(String(t[2] || "").replace(/\./g, "").replace(",", "."));
    if (!Number.isInteger(nr) || nr < 1 || !["rechnung", "gutschrift"].includes(typ) || !Number.isFinite(netto)) fehler.push(`Zeile ${i + 1}: erwartet „Mitgliedsnummer;rechnung|gutschrift;Netto“.`);
    else aus.push({ mitgliedsnummer: nr, typ, netto: rund2(netto) });
  });
  return { werte: aus.slice(0, 5000), fehler };
}

/** Probe-Abrechnung mit den Belegen des Vorsystems vergleichen (zeilengenau, Kontrollabrechnung) */
export function probeVergleich(belege = [], altwerte = [], { toleranzEur = 0.05 } = {}) {
  const schluessel = (nr, typ) => `${nr}|${typ}`;
  const neu = new Map(belege.map((b) => [schluessel(b.mitgliedsnummer, b.typ), b]));
  const alt = new Map(altwerte.map((a) => [schluessel(a.mitgliedsnummer, a.typ), a]));
  const alle = [...new Set([...neu.keys(), ...alt.keys()])].sort((a, b) => Number(a.split("|")[0]) - Number(b.split("|")[0]) || vgl(a, b));
  const zeilen = alle.map((k) => {
    const b = neu.get(k);
    const a = alt.get(k);
    const n = b ? rund2(b.summen.netto) : 0;
    const v = a ? rund2(a.netto) : 0;
    const d = rund2(n - v);
    return { mitgliedsnummer: Number(k.split("|")[0]), typ: k.split("|")[1], name: b?.empfaenger?.name || "", neu: n, alt: v, differenz: d, pct: v ? Math.round((d / v) * 1000) / 10 : null, auffaellig: Math.abs(d) > toleranzEur, nurNeu: !a, nurAlt: !b };
  });
  return { zeilen, summeNeu: rund2(zeilen.reduce((s, z) => s + z.neu, 0)), summeAlt: rund2(zeilen.reduce((s, z) => s + z.alt, 0)), auffaellig: zeilen.filter((z) => z.auffaellig).length };
}
