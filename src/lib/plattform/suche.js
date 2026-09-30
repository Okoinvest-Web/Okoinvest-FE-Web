// src/lib/plattform/suche.js
//
// Unscharfe Suche (Fuzzy) für Befehlspalette und Listen – ohne Fremdpakete,
// im Browser und auf dem Server nutzbar (keine Hooks, kein Node-Code).
//
//   normalisieren("Größe Äcker") → "groesse aecker"
//   fuzzyWert(anfrage, text)      → 0 (kein Treffer) … 1 (exakt)
//   rangieren(eintraege, anfrage, (e) => [e.titel, e.untertitel])
//
// Bewertung je Suchwort (alle Wörter müssen passen):
//   exakter Wortanfang > Teilstring > Buchstabenfolge (Subsequenz, z. B. „flvp“ → „Fläche verpachten“)
//   kurze Abstände und frühe Positionen zählen mehr. Tippfehler bis 1 Zeichen bei Wörtern ab 5 Zeichen.

/** Kleinbuchstaben, Umlaute ausgeschrieben, Akzente entfernt, Sonderzeichen → Leerzeichen */
export function normalisieren(s) {
  return String(s ?? "")
    .toLowerCase()
    .replace(/ä/g, "ae")
    .replace(/ö/g, "oe")
    .replace(/ü/g, "ue")
    .replace(/ß/g, "ss")
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9@.\-]+/g, " ")
    .trim();
}

/** Levenshtein-Abstand ≤ 1 (schneller Sonderfall) */
function einTippfehler(a, b) {
  if (Math.abs(a.length - b.length) > 1) return false;
  let i = 0;
  let j = 0;
  let fehler = 0;
  while (i < a.length && j < b.length) {
    if (a[i] === b[j]) {
      i++;
      j++;
      continue;
    }
    if (++fehler > 1) return false;
    if (a.length > b.length) i++;
    else if (b.length > a.length) j++;
    else {
      i++;
      j++;
    }
  }
  return fehler + (a.length - i) + (b.length - j) <= 1;
}

/** Wert eines einzelnen Suchworts in einem (normalisierten) Text */
function wortWert(wort, text, woerter) {
  if (!wort) return 1;
  const pos = text.indexOf(wort);
  if (pos === 0) return 1;
  if (pos > 0) {
    const wortanfang = text[pos - 1] === " " || text[pos - 1] === "-" || text[pos - 1] === ".";
    return (wortanfang ? 0.9 : 0.7) - Math.min(0.15, pos / 400);
  }
  // Tippfehler (nur längere Wörter, gegen Wortanfänge gleicher Länge)
  if (wort.length >= 5) {
    for (const w of woerter) {
      if (einTippfehler(wort, w.slice(0, wort.length)) || einTippfehler(wort, w)) return 0.5;
    }
  }
  // Buchstabenfolge
  let j = 0;
  let erste = -1;
  let letzte = -1;
  for (let i = 0; i < text.length && j < wort.length; i++) {
    if (text[i] === wort[j]) {
      if (erste < 0) erste = i;
      letzte = i;
      j++;
    }
  }
  if (j < wort.length) return 0;
  const spanne = letzte - erste + 1;
  const dichte = wort.length / spanne; // 1 = zusammenhängend
  if (dichte < 0.25) return 0;
  return 0.2 + 0.3 * dichte - Math.min(0.1, erste / 500);
}

/**
 * Bewertet, wie gut `anfrage` auf `felder` (String oder Array; erstes Feld zählt am meisten) passt.
 * 0 = kein Treffer. Leere Anfrage → 1 (alles passt).
 */
export function fuzzyWert(anfrage, felder) {
  const q = normalisieren(anfrage);
  if (!q) return 1;
  const liste = (Array.isArray(felder) ? felder : [felder]).map(normalisieren);
  const worte = q.split(" ").filter(Boolean);
  let summe = 0;
  for (const w of worte) {
    let bester = 0;
    liste.forEach((text, idx) => {
      if (!text) return;
      const gewicht = idx === 0 ? 1 : 0.85;
      const wert = wortWert(w, text, text.split(" ")) * gewicht;
      if (wert > bester) bester = wert;
    });
    if (bester === 0) return 0;
    summe += bester;
  }
  // exakter Volltreffer im Titel bekommt einen Bonus
  const bonus = liste[0] === q ? 0.2 : liste[0]?.startsWith(q) ? 0.1 : 0;
  return Math.min(1, summe / worte.length + bonus);
}

/** Sortiert Einträge nach Passung, entfernt Nicht-Treffer. `felder(e)` liefert die durchsuchbaren Texte. */
export function rangieren(eintraege, anfrage, felder, { limit = 50, mindestens = 0.2 } = {}) {
  if (!normalisieren(anfrage)) return eintraege.slice(0, limit);
  return eintraege
    .map((e, i) => ({ e, i, w: fuzzyWert(anfrage, felder(e)) }))
    .filter((x) => x.w >= mindestens)
    .sort((a, b) => b.w - a.w || a.i - b.i)
    .slice(0, limit)
    .map((x) => x.e);
}

/** Gruppen der Suchergebnisse (Reihenfolge = Anzeige in der Befehlspalette) */
export const SUCH_GRUPPEN = {
  aktion: "Aktionen",
  navigation: "Navigation",
  zuletzt: "Zuletzt verwendet",
  flaeche: "Flächen",
  projekt: "Projekte",
  vorgang: "Vorgänge",
  nachricht: "Nachrichten",
  boerse: "Projektbörse",
  nutzer: "Nutzer",
};

export const SUCHE_MIN = 2;
export const SUCHE_MAX = 80;

/** Serverseitig: Anfrage bereinigen (Länge, Steuerzeichen) */
export function anfrageBereinigen(q) {
  return String(q ?? "")
    .replace(/[\u0000-\u001f\u007f]/g, " ")
    .trim()
    .slice(0, SUCHE_MAX);
}

/** Nur interne Portal-Pfade als Ziel zulassen */
export const istPortalPfad = (href) => typeof href === "string" && /^\/portal(\/|$|\?)/.test(href) && !href.startsWith("//");
