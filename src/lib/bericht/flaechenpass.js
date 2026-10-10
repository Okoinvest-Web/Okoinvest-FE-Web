// src/lib/bericht/flaechenpass.js – Bericht-Baustein für den Flächenpass (Welle 3, Paket B6)
//
// Feldregeln (Positivliste der Eingaben), Normalisierung und Zusammenfassung für die Berichtsseite. Eingebunden in
// src/lib/bericht/neuRechnen.js (RECHNER.flaechenpass). Rechnet nicht selbst – nur flaechenpass() aus
// src/lib/rechner/flaechenpass.js. Die Fläche kommt als Zeichenkette "lon,lat;…" und wird hier neu gelesen und
// gemessen (ha aus dem Browser wird bei gezeichneter Fläche ignoriert). Keine Geldwerte, in keinem Land.

import { PlattformFehler } from "@/lib/plattform/fehler";
import { fmt } from "@/lib/rechner/annahmen";
import { FLAECHENPASS_VERSION, GRENZEN, OPTIONEN, NETZ_ANNAHME_KM, checkliste, flaecheLesen, flaechenpass, normalisieren, regionenFuer } from "@/lib/rechner/flaechenpass";
import { angabeText, koText, kriteriumZeile, optionText, textePass } from "@/lib/rechner/flaechenpassTexte";
import { SCORING_VERSION, SCHWELLEN } from "@/lib/plattform/geodaten/scoring";
import { regionFuer } from "@/data/regionen";
import { annahmenbuch } from "@/lib/invest/laender/marktFuer";

const LAND_NAME = { DE: "Deutschland", AT: "Österreich", CH: "Schweiz" };
const ALLE_REGIONEN = ["DE", "AT", "CH"].flatMap((l) => regionenFuer(l).map((r) => r.slug));

/** Feldregeln im Format von neuRechnen.js (zahl/wahl/eigen werden dort gebaut und übergeben). */
export function regelnFlaechenpass({ zahl, wahl, eigen }) {
  const r = { region: wahl(ALLE_REGIONEN), ha: zahl(GRENZEN.haMin, GRENZEN.haMax) };
  r.flaeche = eigen((wert) => {
    const g = flaecheLesen(wert);
    if (g.fehler) throw new PlattformFehler(422, "Die eingezeichnete Fläche ist ungültig.", "eingabe");
    return g.text;
  });
  for (const [k, liste] of Object.entries(OPTIONEN)) r[k] = wahl(liste);
  return r;
}

/** Region muss zum Land passen (sonst 422) */
export function landPruefenFlaechenpass(e, land) {
  if (e.region && !regionenFuer(land).some((r) => r.slug === e.region)) throw new PlattformFehler(422, "Region und Land passen nicht zusammen.", "eingabe");
  if (!e.region && regionenFuer(land).length > 1) throw new PlattformFehler(422, "Bitte ein Bundesland angeben.", "eingabe");
  if (!e.flaeche && e.ha === undefined) throw new PlattformFehler(422, "Bitte die Fläche einzeichnen oder die Größe angeben.", "eingabe");
}

/** Normalisierte Eingaben (Grundlage für Prüf-ID, Vorgang und Bericht) */
export const normalisierenFlaechenpass = (e, land) => normalisieren(e, land);

/** Neu rechnen mit dem Ertrag aus den Regionsdaten (wie die Seite) */
export function rechneFlaechenpass(e, land) {
  const rd = regionFuer(e.region);
  return flaechenpass(e, land, { ertragKwhProKwp: rd?.ertrag?.kwhProKwp || null });
}

const t = textePass("de");
const kz = (label, wert, zusatz = "") => ({ label, wert, zusatz });
const STUFE_BERICHT = { gut: "gut", pruefen: "pruefen", kritisch: "kritisch", offen: "info" };

/** Zusammenfassung für die Berichtsseite (nur Formatierung) */
export function zusammenfassungFlaechenpass(p, e, land) {
  const rd = regionFuer(p.region.slug);
  const liste = checkliste(p, rd);
  const ampel = t.ampel[p.ampel];
  const ha = `${fmt(p.ha, p.ha < 10 ? 2 : 1)} ha`;
  const offen = p.offen.filter((x) => x !== "kapazitaet").length;
  const frage = (k) => [t.fragen[k], optionText(t, k, e[k])];
  return {
    urteil: { titel: ampel, text: `${p.score} von 100 Punkten – grobe Ersteinschätzung aus Ihren Angaben`, stufe: p.ampel === "gruen" ? "gut" : p.ampel === "gelb" ? "pruefen" : "kritisch" },
    kennzahlen: [
      kz("Eignung", ampel, `${p.score} von 100 Punkten · Vorrang ${p.prioritaet}`),
      kz("Fläche", ha, p.gezeichnet ? "eingezeichnet" : "angegeben"),
      kz("Mögliche Leistung", `${fmt(p.mwp, 1)} MWp`, "Freifläche Süd, fest"),
      kz("Stromertrag", p.ertragMwh >= 10000 ? `${fmt(p.ertragMwh / 1000, 1)} GWh/Jahr` : `${fmt(p.ertragMwh)} MWh/Jahr`, `≈ ${fmt(p.ertragKwhProKwp)} kWh/kWp (PVGIS)`),
      kz("Offene Punkte", String(offen), offen ? "gehen mit einem mittleren Wert ein, Prüfung im Gespräch" : "alle Fragen beantwortet"),
    ],
    eingabenText: [
      ["Land", LAND_NAME[land]],
      ["Bundesland / Region", rd?.name || p.region.name],
      ["Fläche", `${ha} (${p.gezeichnet ? `eingezeichnet, ${e.flaeche.split(";").length} Eckpunkte${p.schwerpunkt ? `, Mitte ${fmt(p.schwerpunkt[1], 5)} N / ${fmt(p.schwerpunkt[0], 5)} O` : ""}` : "angegeben"})`],
      frage("nutzung"),
      [t.fragen.neigung, e.neigung === "eben" ? optionText(t, "neigung", "eben") : `${optionText(t, "neigung", e.neigung)}, ${optionText(t, "exposition", e.exposition)}`],
      frage("schutz"),
      frage("siedlung"),
      frage("netz"),
      ...["verkehr", "benachteiligt", "zone", "uw", "eignung", "vorbelastet", "fff"].filter((k) => e[k] !== undefined).map(frage),
    ],
    rechenweg: [
      p.gezeichnet ? "Größe und Form: aus der eingezeichneten Fläche gemessen (WGS84, lokal flächentreu); die Form geht als Kompaktheit ein." : "Größe: Ihre Angabe; Form: brauchbare Form angenommen.",
      `Leistung: Fläche ÷ Flächenbedarf je MWp = ${fmt(p.mwp, 1)} MWp; Ertrag: × ${fmt(p.ertragKwhProKwp)} kWh/kWp (PVGIS-Wert der Region).`,
      `Eignung: Bewertungslogik des Flächenteams (Version ${SCORING_VERSION}) – Größe, Form, Gelände, Nutzung, Abstand zur Siedlung, Netzentfernung, Netzanschluss im Verhältnis zur Größe, Planungsrecht bzw. Widmung, Flächenkulisse des Landes und Einstrahlung, zusammen 100 Punkte. Harte Ausschlussgründe deckeln die Punktzahl. Ampel: ab ${SCHWELLEN.ampel.gruen} Punkten „gut geeignet“, ab ${SCHWELLEN.ampel.gelb} „bedingt geeignet“.`,
      p.netzAngenommen ? `Netzentfernung unbekannt: vorsichtig ${NETZ_ANNAHME_KM} km angenommen. Die freie Netzkapazität ist immer offen.` : "Die freie Netzkapazität ist immer offen – sie erfragen wir beim Netzbetreiber.",
    ],
    tabelle: null,
    listen: [
      {
        titel: "So kommt die Eignung zustande",
        art: "gruende",
        eintraege: p.kriterien.map((k) => {
          const z = kriteriumZeile(k, p, t, "de");
          return { titel: `${z.label}: ${k.max > 0 ? `${fmt(k.punkte, k.punkte % 1 ? 1 : 0)} von ${k.max} Punkten` : `${k.punkte > 0 ? "+" : "−"}${fmt(Math.abs(k.punkte), Math.abs(k.punkte) % 1 ? 1 : 0)} Punkte`}`, text: z.text };
        }),
      },
      ...(p.ko.length ? [{ titel: "Ausschlussgründe", art: "pruefliste", eintraege: p.ko.map((k) => ({ text: koText(k, t), stufe: "kritisch" })) }] : []),
      {
        titel: "Restriktionen nach Ihren Angaben",
        art: "pruefliste",
        eintraege: liste.angaben.map((a) => {
          const x = angabeText(a, p, t, rd?.name || p.region.name);
          return { titel: x.titel, stufe: STUFE_BERICHT[a.stufe], stufeText: t.stufe[a.stufe], text: x.quelle ? `${x.text} Quelle: ${x.quelle.titel} (${x.quelle.url})` : x.text };
        }),
      },
      ...(liste.recht.length ? [{ titel: `Rechtsrahmen ${rd?.name || p.region.name}`, art: "quellen", eintraege: liste.recht.map((r) => ({ titel: r.titel, text: `Quelle: ${r.quelle.titel} (${r.quelle.url})` })) }] : []),
      ...(liste.restriktionen.length ? [{ titel: "Ausschluss- und Restriktionskriterien, die wir vor Ort prüfen", art: "schritte", eintraege: liste.restriktionen.map((x) => ({ text: x })) }] : []),
    ],
    hinweise: [
      "Grobe Ersteinschätzung aus Ihren Angaben – kein Angebot, keine Zusage und keine Rechtsauskunft. Netzkapazität, Planungsrecht, Schutzgebiete und Bodenverhältnisse prüfen wir flächengenau.",
      "Der Flächenpass nennt bewusst keine Pacht- oder Kaufpreise.",
      `Flächenpass Version ${FLAECHENPASS_VERSION}.`,
    ],
  };
}

/** Annahmenbuch (Faktenregister): Flächenbedarf und Mindestgröße – die übrigen Punkte stehen als Rechenlogik-Zeilen */
export const FLAECHENPASS_FAKTEN = ["freiflaeche.haProMwp", "freiflaeche.mindestHa"];
export const annahmenFlaechenpass = ({ land = "DE" } = {}) => annahmenbuch(FLAECHENPASS_FAKTEN, { land });
