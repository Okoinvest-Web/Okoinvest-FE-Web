// src/lib/plattform/eg/tarif.js
//
// Tarife (versioniert, mit Zeitfenstern/TOU, Gebühren, Sozialtarif, individuellen Abweichungen – Fachkonzept 3.10) und
// statischer Verteilschlüssel (3.11). Reine Funktionen; die Bewertung je Viertelstunde (Preis zur Zeit q) macht WP4 über
// preisFuer(). Python-Spiegel: plattform/eg_stamm_kern.py.

import { auswahl, datum, fehler, plusTage, text, zahl } from "../mitglied/basis.js";
import { TARIF_BESCHLUSS, TARIF_STATUS, WOCHENTAGE } from "./modell.js";

const ZEIT = /^([01]\d|2[0-3]):(00|15|30|45)$/;
const zeit = (v) => (ZEIT.test(String(v || "")) ? String(v) : "");

function zeitfensterBereinigen(z = {}, i = 0) {
  const f = {
    id: text(z.id, 20) || `Z${i + 1}`,
    label: text(z.label, 60),
    tage: [...new Set((Array.isArray(z.tage) ? z.tage : []).filter((x) => WOCHENTAGE[x]))],
    von: zeit(z.von),
    bis: zeit(z.bis),
    monate: [...new Set((Array.isArray(z.monate) ? z.monate : []).map(Number).filter((x) => x >= 1 && x <= 12))].sort((a, b) => a - b),
    bezugspreisCt: zahl(z.bezugspreisCt, 0, 100, 4),
    einspeisepreisCt: zahl(z.einspeisepreisCt, 0, 100, 4),
  };
  if (!f.label) throw fehler("Bitte jedes Zeitfenster benennen (z. B. „Mittagsstrom“).", `zeitfenster.${i}.label`);
  if (!f.von || !f.bis) throw fehler("Zeitfenster: Beginn und Ende im Viertelstundenraster (HH:MM).", `zeitfenster.${i}.von`);
  if (f.bezugspreisCt === null && f.einspeisepreisCt === null) throw fehler("Zeitfenster: Bezugs- oder Einspeisepreis angeben.", `zeitfenster.${i}.bezugspreisCt`);
  return f;
}

/** Tarif bereinigen. Prüft Preislogik (Einspeisung ≤ Bezug, Hinweis Gewinnverbot) */
export function tarifBereinigen(d = {}) {
  const t = {
    bezeichnung: text(d.bezeichnung, 80) || "Tarif",
    gueltigAb: datum(d.gueltigAb),
    gueltigBis: datum(d.gueltigBis),
    beschluss: { art: auswahl(d.beschluss?.art, TARIF_BESCHLUSS, "vorstand"), datum: datum(d.beschluss?.datum), referenz: text(d.beschluss?.referenz, 80) },
    bezugspreisCt: zahl(d.bezugspreisCt, 0, 100, 4),
    einspeisepreisCt: zahl(d.einspeisepreisCt, 0, 100, 4),
    zeitfenster: (Array.isArray(d.zeitfenster) ? d.zeitfenster : []).slice(0, 12).map(zeitfensterBereinigen),
    grundgebuehrMonat: zahl(d.grundgebuehrMonat, 0, 1000, 2) ?? 0,
    zaehlpunktgebuehrMonat: zahl(d.zaehlpunktgebuehrMonat, 0, 1000, 2) ?? 0,
    einmalgebuehrBeitritt: zahl(d.einmalgebuehrBeitritt, 0, 10000, 2) ?? 0,
    mitgliedsbeitragJahr: zahl(d.mitgliedsbeitragJahr, 0, 10000, 2) ?? 0,
    sozialtarif: { bezugspreisCt: zahl(d.sozialtarif?.bezugspreisCt, 0, 100, 4), kontingentPct: zahl(d.sozialtarif?.kontingentPct, 0, 100, 1) },
    individuell: (Array.isArray(d.individuell) ? d.individuell : []).slice(0, 500).map((x, i) => {
      const e = { mitgliedId: text(x.mitgliedId, 40), bezugspreisCt: zahl(x.bezugspreisCt, 0, 100, 4), einspeisepreisCt: zahl(x.einspeisepreisCt, 0, 100, 4), grund: text(x.grund, 200) };
      if (!e.mitgliedId || !e.grund) throw fehler("Individuelle Preise brauchen Mitglied und dokumentierten Grund.", `individuell.${i}.grund`);
      return e;
    }),
    status: auswahl(d.status, TARIF_STATUS, "entwurf"),
  };
  if (!t.gueltigAb) throw fehler("Bitte das Gültigkeitsdatum (ab) angeben.", "gueltigAb");
  if (t.gueltigBis && t.gueltigBis < t.gueltigAb) throw fehler("„Gültig bis“ liegt vor „gültig ab“.", "gueltigBis");
  if (t.bezugspreisCt === null || t.einspeisepreisCt === null) throw fehler("Bitte Bezugs- und Einspeisepreis (netto, ct/kWh) angeben.", "bezugspreisCt");
  if (t.einspeisepreisCt > t.bezugspreisCt) throw fehler("Der Einspeisepreis liegt über dem Bezugspreis – die Gemeinschaft könnte ihre Kosten nicht decken.", "einspeisepreisCt");
  if (["beschlossen", "aktiv"].includes(t.status) && !t.beschluss.datum) throw fehler("Für einen beschlossenen Tarif bitte das Beschlussdatum angeben.", "beschluss.datum");
  return t;
}

/** Tarif, der an einem Tag gilt (jüngstes gueltigAb ≤ Tag, nicht abgelöst/Entwurf) */
export function tarifAm(tarife = [], tag) {
  const d = String(tag || "").slice(0, 10);
  return tarife.filter((t) => ["beschlossen", "aktiv"].includes(t.status) && t.gueltigAb <= d && (!t.gueltigBis || t.gueltigBis >= d)).sort((a, b) => b.gueltigAb.localeCompare(a.gueltigAb))[0] || null;
}

/** Beim Speichern eines neuen gültigen Tarifs: Vorgänger endet am Vortag (Versionierung ohne Lücke) */
export function tarifVersionieren(tarife = [], neu) {
  return tarife.map((t) => (t.id !== neu.id && ["beschlossen", "aktiv"].includes(t.status) && t.gueltigAb < neu.gueltigAb && (!t.gueltigBis || t.gueltigBis >= neu.gueltigAb) ? { ...t, gueltigBis: plusTage(neu.gueltigAb, -1), status: "abgeloest" } : t));
}

const WT = ["so", "mo", "di", "mi", "do", "fr", "sa"];
/**
 * Preis zu einer Viertelstunde (Lokalzeit „JJJJ-MM-TTTHH:MM“): individuell → Zeitfenster → Grundpreis.
 * @returns {{bezugspreisCt:number, einspeisepreisCt:number, zeitfenster:string}}
 */
export function preisFuer(tarif, lokal, { mitgliedId = "" } = {}) {
  const ind = (tarif?.individuell || []).find((x) => x.mitgliedId === mitgliedId);
  const d = new Date(`${String(lokal).slice(0, 10)}T12:00:00Z`);
  const wt = WT[d.getUTCDay()];
  const mon = d.getUTCMonth() + 1;
  const hm = String(lokal).slice(11, 16);
  const f = (tarif?.zeitfenster || []).find((z) => (!z.tage.length || z.tage.includes(wt)) && (!z.monate.length || z.monate.includes(mon)) && (z.von <= z.bis ? hm >= z.von && hm < z.bis : hm >= z.von || hm < z.bis));
  return {
    bezugspreisCt: ind?.bezugspreisCt ?? f?.bezugspreisCt ?? tarif?.bezugspreisCt ?? 0,
    einspeisepreisCt: ind?.einspeisepreisCt ?? f?.einspeisepreisCt ?? tarif?.einspeisepreisCt ?? 0,
    zeitfenster: f?.id || "",
  };
}

/** Statischer Verteilschlüssel: Positionen bereinigen, Summe und Warnung (Normierung durch den NB erst über 100 %) */
export function verteilschluesselBereinigen(d = {}) {
  const v = {
    gueltigAb: datum(d.gueltigAb),
    positionen: (Array.isArray(d.positionen) ? d.positionen : []).slice(0, 2000).map((p) => ({ teilnahmeId: text(p.teilnahmeId, 40), pct: zahl(p.pct, 0, 100, 1) })).filter((p) => p.teilnahmeId && p.pct !== null),
  };
  if (!v.gueltigAb) throw fehler("Bitte das Gültigkeitsdatum angeben.", "gueltigAb");
  if (!v.positionen.length) throw fehler("Bitte mindestens eine Position mit Anteil angeben.", "positionen");
  if (new Set(v.positionen.map((p) => p.teilnahmeId)).size !== v.positionen.length) throw fehler("Jede Teilnahme darf nur einmal vorkommen.", "positionen");
  v.summePct = Math.round(v.positionen.reduce((s, p) => s + p.pct, 0) * 10) / 10;
  v.hinweis = v.summePct > 100 ? "Summe über 100 % – der Netzbetreiber normiert die Anteile (HA II 12.2)." : v.summePct < 100 ? "Summe unter 100 % – nicht zugeteilte Anteile gelten als Überschuss." : "";
  return v;
}
