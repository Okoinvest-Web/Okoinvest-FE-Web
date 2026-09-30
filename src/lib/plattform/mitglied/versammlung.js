// src/lib/plattform/mitglied/versammlung.js
//
// Generalversammlung der Genossenschaft: Anlage (Backoffice/Vorstand), Einladung mit Fristprüfung, Unterlagen,
// Online-Abstimmung je Beschlusspunkt (ja/nein/Enthaltung, eine Stimme je Mitglied – Kopfprinzip, DE § 43 Abs. 3 GenG),
// Auszählung mit gesetzlichen Mehrheiten und Protokoll. Reine Funktionen; Frappe: plattform/mitglied_kern.py (1:1).
//
// Mehrheiten: einfache Mehrheit der abgegebenen Stimmen; Satzungsänderungen DE drei Viertel (§ 16 Abs. 2 GenG),
// CH zwei Drittel (Art. 888 Abs. 2 OR), AT nach aktuellem Stand in der Regel zwei Drittel (Satzung prüfen); Enthaltungen zählen nicht als abgegebene Stimme. Satzung kann strenger sein.
// Online-Versammlung/-Abstimmung nur mit Satzungsgrundlage (DE § 43b GenG) – offener Rechtspunkt (genossenschaft.js).

import { auswahl, datumZeit, fehler, konfliktFehler, mehrzeilig, plusTage, tageZwischen, text } from "./basis.js";
import { einladungsfrist } from "./genossenschaft.js";

export const GV_STATUS = {
  entwurf: { label: "Entwurf", ton: "neutral" },
  eingeladen: { label: "Eingeladen", ton: "info" },
  abstimmung: { label: "Abstimmung läuft", ton: "warn" },
  abgeschlossen: { label: "Abgeschlossen – Protokoll liegt vor", ton: "ok" },
  abgesagt: { label: "Abgesagt", ton: "neutral" },
};
export const GV_ARTEN = { ordentlich: "Ordentliche Generalversammlung", ausserordentlich: "Außerordentliche Generalversammlung" };
export const GV_FORMEN = { praesenz: "Präsenzversammlung", online: "Virtuelle Versammlung (online)", hybrid: "Hybride Versammlung", schriftlich: "Schriftliche bzw. elektronische Beschlussfassung" };
export const MEHRHEITEN = { einfach: { label: "Einfache Mehrheit", anteil: 0.5, strikt: true }, zweidrittel: { label: "Zwei Drittel", anteil: 2 / 3, strikt: false }, dreiviertel: { label: "Drei Viertel", anteil: 0.75, strikt: false } };
export const STIMMEN = { ja: "Ja", nein: "Nein", enthaltung: "Enthaltung" };
/** Übliche Tagesordnung einer ordentlichen Generalversammlung (Vorlage, änderbar) */
export const TAGESORDNUNG_VORLAGE = [
  { titel: "Bericht des Vorstands und des Aufsichtsrats über das Geschäftsjahr", beschluss: false },
  { titel: "Bericht über die gesetzliche Prüfung (Prüfungs- bzw. Revisionsverband)", beschluss: false },
  { titel: "Feststellung des Jahresabschlusses", beschluss: true, mehrheit: "einfach" },
  { titel: "Verwendung des Jahresergebnisses (Dividende/Rückvergütung)", beschluss: true, mehrheit: "einfach" },
  { titel: "Entlastung des Vorstands", beschluss: true, mehrheit: "einfach" },
  { titel: "Entlastung des Aufsichtsrats", beschluss: true, mehrheit: "einfach" },
];

/** Stimmen und Formen, bei denen online abgestimmt werden kann */
export const ONLINE_FORMEN = ["online", "hybrid", "schriftlich"];

export function versammlungBereinigen(d = {}, geno) {
  const g = {
    titel: text(d.titel, 160),
    art: auswahl(d.art, GV_ARTEN, "ordentlich"),
    form: auswahl(d.form, GV_FORMEN, "praesenz"),
    datum: datumZeit(d.datum),
    ort: text(d.ort, 200),
    zugang: text(d.zugang, 300),
    abstimmungBis: datumZeit(d.abstimmungBis),
    einleitung: mehrzeilig(d.einleitung, 3000),
    tagesordnung: [],
    unterlagen: [],
  };
  if (!g.titel) throw fehler("Bitte geben Sie einen Titel an (z. B. „Ordentliche Generalversammlung 2026“).", "titel");
  if (!g.datum) throw fehler("Bitte geben Sie Datum und Uhrzeit der Versammlung an.", "datum");
  if (ONLINE_FORMEN.includes(g.form) && !geno?.onlineGv) throw fehler("Die Satzung sieht keine virtuelle bzw. elektronische Beschlussfassung vor (Stammdaten „Online-Versammlung laut Satzung“).", "form");
  if (g.form === "praesenz" || g.form === "hybrid") {
    if (!g.ort) throw fehler("Bitte geben Sie den Versammlungsort an.", "ort");
  }
  if (ONLINE_FORMEN.includes(g.form)) {
    if (!g.abstimmungBis) throw fehler("Bitte geben Sie an, bis wann online abgestimmt werden kann.", "abstimmungBis");
    if (g.abstimmungBis < g.datum && g.form !== "schriftlich") throw fehler("Die Online-Abstimmung endet frühestens mit der Versammlung.", "abstimmungBis");
  } else g.abstimmungBis = "";
  const top = Array.isArray(d.tagesordnung) ? d.tagesordnung.slice(0, 30) : [];
  top.forEach((t, i) => {
    const titel = text(t?.titel, 200);
    if (!titel) return;
    const beschluss = t?.beschluss === true;
    g.tagesordnung.push({ id: `T${i + 1}`, titel, text: mehrzeilig(t?.text, 2000), beschluss, mehrheit: beschluss ? auswahl(t?.mehrheit, MEHRHEITEN, "einfach") : null, satzung: beschluss && t?.satzung === true });
  });
  g.tagesordnung.forEach((t, i) => (t.id = `T${i + 1}`));
  if (!g.tagesordnung.length) throw fehler("Die Tagesordnung ist leer.", "tagesordnung");
  for (const t of g.tagesordnung) {
    if (t.satzung) {
      const min = geno?.land === "DE" ? "dreiviertel" : "zweidrittel"; // DE § 16 Abs. 2 GenG; CH Art. 888 Abs. 2 OR; AT in der Regel zwei Drittel (GenG AT, Satzung prüfen)
      if (MEHRHEITEN[t.mehrheit].anteil < MEHRHEITEN[min].anteil) t.mehrheit = min; // gesetzliche Mindestmehrheit für Satzungsänderungen
    }
  }
  const unt = Array.isArray(d.unterlagen) ? d.unterlagen.slice(0, 20) : [];
  unt.forEach((u, i) => {
    const titel = text(u?.titel, 160);
    if (titel) g.unterlagen.push({ id: `U${i + 1}`, titel, text: mehrzeilig(u?.text, 8000) });
  });
  return g;
}

/** Einladung erlaubt? Frist bis zur Versammlung (Tage, Ortsdatum) */
export function einladungPruefen(gv, geno, { heute } = {}) {
  if (gv.status !== "entwurf") throw konfliktFehler("Eingeladen werden kann nur zu einer Versammlung im Entwurf.");
  const frist = einladungsfrist(geno);
  const tage = tageZwischen(heute, gv.datum.slice(0, 10));
  if (tage < frist) throw fehler(`Die Einladungsfrist beträgt mindestens ${frist} Tage (${geno?.land === "DE" ? "§ 46 Abs. 1 GenG" : geno?.land === "CH" ? "Art. 882 OR" : "Satzung"}) – frühester Termin: ${plusTage(heute, frist).split("-").reverse().join(".")}.`, "datum");
  return { frist, tage };
}

/** Kann jetzt abgestimmt werden? (jetzt = „JJJJ-MM-TTTHH:MM“ Ortszeit) */
export function abstimmungOffen(gv, jetzt) {
  return gv?.status === "abstimmung" && (!gv.abstimmungBis || !jetzt || jetzt <= gv.abstimmungBis);
}

export function stimmeBereinigen(d = {}, gv) {
  const s = d && typeof d === "object" ? d : {};
  const out = {};
  for (const t of gv.tagesordnung.filter((x) => x.beschluss)) {
    const w = auswahl(s[t.id], STIMMEN, "");
    if (!w) throw fehler(`Bitte stimmen Sie zu „${t.titel}“ ab (Ja, Nein oder Enthaltung).`, t.id);
    out[t.id] = w;
  }
  if (!Object.keys(out).length) throw konfliktFehler("Diese Versammlung hat keine Beschlusspunkte zur Abstimmung.");
  return out;
}

/** Beschluss angenommen? ja/(ja+nein) > 1/2 (einfach) bzw. ≥ 2/3, ≥ 3/4 */
export function angenommen(ja, nein, mehrheit = "einfach") {
  const abgegeben = ja + nein;
  if (!abgegeben) return false;
  const m = MEHRHEITEN[mehrheit] || MEHRHEITEN.einfach;
  const q = ja / abgegeben;
  return m.strikt ? q > m.anteil : q >= m.anteil - 1e-12;
}

/**
 * Ergebnis aus allen Stimmzetteln (stimmen: [{ stimmen: { T1: "ja" … } }]) – ohne Personenbezug.
 * zusatz: Auszählung im Saal (Präsenz/hybrid) { anwesend, tops: { T1: { ja, nein, enthaltung } } }.
 */
export function ergebnisRechnen(gv, stimmen = [], stimmberechtigt = 0, zusatz = {}) {
  const tops = gv.tagesordnung.filter((t) => t.beschluss).map((t) => {
    const z = zusatz?.tops?.[t.id] || {};
    let ja = Number(z.ja) || 0;
    let nein = Number(z.nein) || 0;
    let enthaltung = Number(z.enthaltung) || 0;
    for (const s of stimmen) {
      const w = s?.stimmen?.[t.id];
      if (w === "ja") ja++;
      else if (w === "nein") nein++;
      else if (w === "enthaltung") enthaltung++;
    }
    return { id: t.id, titel: t.titel, mehrheit: t.mehrheit, ja, nein, enthaltung, abgegeben: ja + nein, angenommen: angenommen(ja, nein, t.mehrheit) };
  });
  const teilgenommen = stimmen.length + (Number(zusatz?.anwesend) || 0);
  return { stimmberechtigt, teilgenommen, online: stimmen.length, anwesend: Number(zusatz?.anwesend) || 0, beteiligungPct: stimmberechtigt ? Math.round((teilgenommen / stimmberechtigt) * 1000) / 10 : 0, tops };
}

/** Kanonische Zeichenkette der Stimmzettel für den Protokoll-Hash (sortiert, ohne Namen) */
export function stimmenKanonisch(gvId, stimmen = []) {
  return [gvId, ...stimmen.map((s) => `${s.id}|${s.am}|${Object.entries(s.stimmen || {}).sort().map(([k, x]) => `${k}=${x}`).join(",")}`).sort()].join("\n");
}

const anzahl = (v) => Math.max(0, Math.min(1000000, Math.round(Number(v) || 0)));

/** Abschluss: Versammlungsleitung, Protokollführung, Auszählung im Saal (nur Präsenz/hybrid), Notiz */
export function abschlussBereinigen(d = {}, gv, { stimmberechtigt = 0, online = 0 } = {}) {
  const x = { versammlungsleiter: text(d.versammlungsleiter, 120), protokollfuehrer: text(d.protokollfuehrer, 120), anwesend: 0, tops: {}, notiz: mehrzeilig(d.notiz, 3000) };
  if (!x.versammlungsleiter || !x.protokollfuehrer) throw fehler("Bitte geben Sie Versammlungsleitung und Protokollführung an.", "versammlungsleiter");
  if (gv && ["praesenz", "hybrid"].includes(gv.form)) {
    x.anwesend = anzahl(d.anwesend);
    if (x.anwesend + online > stimmberechtigt) throw fehler(`Mehr Teilnehmende (${x.anwesend + online}) als stimmberechtigte Mitglieder (${stimmberechtigt}).`, "anwesend");
    for (const t of gv.tagesordnung.filter((y) => y.beschluss)) {
      const z = d.tops?.[t.id] || {};
      const e = { ja: anzahl(z.ja), nein: anzahl(z.nein), enthaltung: anzahl(z.enthaltung) };
      if (e.ja + e.nein + e.enthaltung > x.anwesend) throw fehler(`„${t.titel}“: mehr Stimmen im Saal als anwesende Mitglieder.`, t.id);
      x.tops[t.id] = e;
    }
  }
  return x;
}
