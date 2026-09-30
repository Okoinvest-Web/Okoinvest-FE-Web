// src/lib/plattform/dienste/identitaet/mrz.js
//
// Automatische VORPRÜFUNG von Ausweisdokumenten über die maschinenlesbare Zone (MRZ) nach ICAO Doc 9303
// (Teil 3: Prüfziffern, Teil 4: TD3 = Reisepass, Teil 5: TD1 = Personalausweis im Kartenformat, Teil 6: TD2).
// Client- und serverseitig nutzbar (keine Node-Importe) – das Portal prüft sofort beim Eintippen, der Server
// prüft erneut und hängt das Ergebnis als Hinweis an den KYC-Fall.
//
// WICHTIG: „automatisch plausibel“ ersetzt KEINE Identifizierung nach GwG. Prüfziffern belegen nur, dass die
// abgetippte Zeile in sich stimmig ist – nicht, dass das Dokument echt ist oder der Person gehört. Die Entscheidung
// trifft der zugelassene Identitätsanbieter bzw. die Compliance (manuelle Prüfung).
//
// Frappe-Gegenstück: Backend-Import/oekoinvest_app/oekoinvest_app/plattform/dienste_kern.py (gleiche Regeln).

/** Zeichenwert nach ICAO 9303 Teil 3: 0–9 → 0–9, A–Z → 10–35, „<“ → 0 */
function zeichenWert(c) {
  if (c >= "0" && c <= "9") return c.charCodeAt(0) - 48;
  if (c >= "A" && c <= "Z") return c.charCodeAt(0) - 55;
  if (c === "<") return 0;
  return -1;
}

/** Prüfziffer (Gewichte 7-3-1, Summe mod 10). Liefert Zahl 0–9 oder null bei ungültigen Zeichen. */
export function pruefziffer(feld) {
  const gewichte = [7, 3, 1];
  let summe = 0;
  const s = String(feld || "");
  for (let i = 0; i < s.length; i++) {
    const w = zeichenWert(s[i]);
    if (w < 0) return null;
    summe += w * gewichte[i % 3];
  }
  return summe % 10;
}

/** Stimmt die Prüfziffer? `ziffer` ist das Zeichen aus der MRZ („<“ gilt als 0, z. B. bei leeren optionalen Feldern). */
export function pruefzifferOk(feld, ziffer) {
  const soll = pruefziffer(feld);
  if (soll === null) return false;
  const ist = ziffer === "<" ? 0 : Number(ziffer);
  return Number.isInteger(ist) && ist === soll;
}

/** Eingabe vereinheitlichen: Großbuchstaben, typische OCR-/Tippfehler an Füllzeichen, Zeilen trennen */
export function mrzNormalisieren(eingabe) {
  const zeilen = String(eingabe || "")
    .toUpperCase()
    .replace(/[«‹]/g, "<")
    .replace(/\r/g, "")
    .split("\n")
    .map((z) => z.replace(/\s+/g, "").replace(/[^A-Z0-9<]/g, ""))
    .filter(Boolean);
  // Einzeilige Eingabe (alles hintereinander) nach Länge aufteilen
  if (zeilen.length === 1) {
    const z = zeilen[0];
    if (z.length === 90) return [z.slice(0, 30), z.slice(30, 60), z.slice(60)];
    if (z.length === 88) return [z.slice(0, 44), z.slice(44)];
    if (z.length === 72) return [z.slice(0, 36), z.slice(36)];
  }
  return zeilen;
}

/** Format erkennen: TD1 (3×30), TD2 (2×36), TD3 (2×44) */
export function mrzFormat(zeilen) {
  if (zeilen.length === 3 && zeilen.every((z) => z.length === 30)) return "TD1";
  if (zeilen.length === 2 && zeilen.every((z) => z.length === 44)) return "TD3";
  if (zeilen.length === 2 && zeilen.every((z) => z.length === 36)) return "TD2";
  return null;
}

const fueller = (s) => String(s || "").replace(/</g, " ").replace(/\s+/g, " ").trim();

/** Name aus dem Namensfeld: PRIMÄR<<SEKUNDÄR (Nachname<<Vornamen) */
function nameTeilen(feld) {
  const [nach, ...rest] = String(feld || "").split("<<");
  return { nachname: fueller(nach), vornamen: fueller(rest.join("<<")) };
}

/**
 * Datum JJMMTT → ISO. `art`: „geburt“ (Jahrhundert so, dass das Datum nicht in der Zukunft liegt) oder
 * „ablauf“ (Jahrhundert so, dass das Datum höchstens 50 Jahre zurück liegt).
 */
export function mrzDatum(jjmmtt, art = "geburt", heute = new Date()) {
  if (!/^\d{6}$/.test(String(jjmmtt || ""))) return null;
  const jj = Number(jjmmtt.slice(0, 2));
  const mm = Number(jjmmtt.slice(2, 4));
  const tt = Number(jjmmtt.slice(4, 6));
  if (mm < 1 || mm > 12 || tt < 1 || tt > 31) return null;
  const jetztJ = heute.getUTCFullYear() % 100;
  let jahr;
  if (art === "geburt") jahr = jj > jetztJ ? 1900 + jj : 2000 + jj;
  else jahr = jj >= jetztJ + 50 ? 1900 + jj : 2000 + jj;
  const iso = `${jahr}-${String(mm).padStart(2, "0")}-${String(tt).padStart(2, "0")}`;
  const d = new Date(`${iso}T00:00:00Z`);
  if (Number.isNaN(d.getTime()) || d.getUTCDate() !== tt) return null;
  return iso;
}

const DOKUMENTART = { P: "Reisepass", I: "Personalausweis", A: "Ausweis", C: "Ausweis", V: "Visum" };

/**
 * MRZ zerlegen und alle Prüfziffern prüfen.
 * Liefert { ok, format, fehler[], felder{…}, pruefungen[{feld,label,ok}] } – `ok` = Format gültig UND alle Prüfziffern stimmen.
 */
export function mrzPruefen(eingabe, { heute = new Date() } = {}) {
  const zeilen = Array.isArray(eingabe) ? eingabe.map((z) => String(z).toUpperCase().replace(/\s+/g, "")) : mrzNormalisieren(eingabe);
  const format = mrzFormat(zeilen);
  const fehler = [];
  if (!format) {
    const laengen = zeilen.map((z) => z.length).join(" / ") || "–";
    return {
      ok: false, format: null, felder: {}, pruefungen: [],
      fehler: [`Unbekanntes Format (Zeilenlängen ${laengen}). Erwartet: Personalausweis 3 × 30 Zeichen, Reisepass 2 × 44 Zeichen oder 2 × 36 Zeichen.`],
    };
  }
  if (zeilen.some((z) => /[^A-Z0-9<]/.test(z))) fehler.push("Die Zeilen enthalten unzulässige Zeichen (erlaubt: A–Z, 0–9, <).");

  let f;
  const p = [];
  const pruef = (feld, label, wert, ziffer) => p.push({ feld, label, ok: pruefzifferOk(wert, ziffer) });

  if (format === "TD1") {
    const [a, b, c] = zeilen;
    let nummer = a.slice(5, 14);
    let nummerZiffer = a[14];
    let optional1 = a.slice(15, 30);
    // Dokumentnummer > 9 Zeichen: Rest in den optionalen Daten, Prüfziffer danach, „<“ an Position 15 (ICAO 9303-5 4.2.4)
    if (nummerZiffer === "<" && /[A-Z0-9]/.test(optional1[0] || "")) {
      const ende = optional1.indexOf("<");
      const rest = ende > 0 ? optional1.slice(0, ende) : optional1;
      nummer = `${nummer}${rest.slice(0, -1)}`;
      nummerZiffer = rest.slice(-1);
      optional1 = optional1.slice(rest.length);
    }
    f = {
      dokumentcode: a.slice(0, 2), ausstellerstaat: a.slice(2, 5), dokumentnummer: nummer.replace(/</g, ""),
      geburtsdatumRoh: b.slice(0, 6), geschlecht: b[7], ablaufRoh: b.slice(8, 14), staatsangehoerigkeit: b.slice(15, 18),
      optional: fueller(optional1 + b.slice(18, 29)), ...nameTeilen(c),
    };
    pruef("dokumentnummer", "Dokumentnummer", nummer, nummerZiffer);
    pruef("geburtsdatum", "Geburtsdatum", b.slice(0, 6), b[6]);
    pruef("ablauf", "Gültig bis", b.slice(8, 14), b[14]);
    pruef("gesamt", "Gesamtprüfziffer", a.slice(5, 30) + b.slice(0, 7) + b.slice(8, 15) + b.slice(18, 29), b[29]);
  } else if (format === "TD3") {
    const [a, b] = zeilen;
    f = {
      dokumentcode: a.slice(0, 2), ausstellerstaat: a.slice(2, 5), ...nameTeilen(a.slice(5, 44)),
      dokumentnummer: b.slice(0, 9).replace(/</g, ""), staatsangehoerigkeit: b.slice(10, 13), geburtsdatumRoh: b.slice(13, 19),
      geschlecht: b[20], ablaufRoh: b.slice(21, 27), optional: fueller(b.slice(28, 42)),
    };
    pruef("dokumentnummer", "Dokumentnummer", b.slice(0, 9), b[9]);
    pruef("geburtsdatum", "Geburtsdatum", b.slice(13, 19), b[19]);
    pruef("ablauf", "Gültig bis", b.slice(21, 27), b[27]);
    // Persönliche Nummer: leer („<<<…“) mit Prüfziffer „<“ oder „0“ zulässig
    pruef("optional", "Persönliche Nummer / optionale Daten", b.slice(28, 42), b[42]);
    pruef("gesamt", "Gesamtprüfziffer", b.slice(0, 10) + b.slice(13, 20) + b.slice(21, 43), b[43]);
  } else {
    const [a, b] = zeilen;
    f = {
      dokumentcode: a.slice(0, 2), ausstellerstaat: a.slice(2, 5), ...nameTeilen(a.slice(5, 36)),
      dokumentnummer: b.slice(0, 9).replace(/</g, ""), staatsangehoerigkeit: b.slice(10, 13), geburtsdatumRoh: b.slice(13, 19),
      geschlecht: b[20], ablaufRoh: b.slice(21, 27), optional: fueller(b.slice(28, 35)),
    };
    pruef("dokumentnummer", "Dokumentnummer", b.slice(0, 9), b[9]);
    pruef("geburtsdatum", "Geburtsdatum", b.slice(13, 19), b[19]);
    pruef("ablauf", "Gültig bis", b.slice(21, 27), b[27]);
    pruef("gesamt", "Gesamtprüfziffer", b.slice(0, 10) + b.slice(13, 20) + b.slice(21, 35), b[35]);
  }

  f.dokumentart = DOKUMENTART[f.dokumentcode[0]] || "Reisedokument";
  f.ausstellerstaat = f.ausstellerstaat.replace(/</g, "");
  f.staatsangehoerigkeit = f.staatsangehoerigkeit.replace(/</g, "");
  f.geschlecht = f.geschlecht === "<" ? "X" : f.geschlecht;
  f.geburtsdatum = mrzDatum(f.geburtsdatumRoh, "geburt", heute);
  f.gueltigBis = mrzDatum(f.ablaufRoh, "ablauf", heute);
  if (!f.geburtsdatum) fehler.push("Das Geburtsdatum ist kein gültiges Datum.");
  if (!f.gueltigBis) fehler.push("Das Ablaufdatum ist kein gültiges Datum.");
  if (!f.nachname) fehler.push("Der Name fehlt in der MRZ.");
  for (const x of p) if (!x.ok) fehler.push(`Prüfziffer „${x.label}“ stimmt nicht – bitte Eingabe prüfen.`);
  return { ok: fehler.length === 0, format, felder: f, pruefungen: p, fehler };
}

// ---------------------------------------------------------------- Abgleich mit dem Konto

/** Name in MRZ-Schreibweise (ICAO 9303-3 Transliteration: Ä → AE, Ö → OE, Ü → UE, ß → SS; Akzente entfernt) */
export function mrzName(s) {
  return String(s || "")
    .toUpperCase()
    .replace(/Ä/g, "AE").replace(/Ö/g, "OE").replace(/Ü/g, "UE").replace(/ẞ|ß/g, "SS")
    .normalize("NFKD").replace(/[̀-ͯ]/g, "")
    .replace(/[^A-Z]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

const tokens = (s) => mrzName(s).split(" ").filter((t) => t.length > 1 || /^[A-Z]$/.test(t));

/** Nachname vollständig enthalten, erster Vorname enthalten (MRZ kürzt lange Namen – Präfixe zählen) */
export function nameStimmt({ vorname = "", nachname = "" } = {}, felder = {}) {
  const mrzNach = tokens(felder.nachname);
  const mrzVor = tokens(felder.vornamen);
  const sollNach = tokens(nachname);
  const sollVor = tokens(vorname);
  if (!sollNach.length || !mrzNach.length) return false;
  const nachOk = sollNach.every((t) => mrzNach.some((m) => m === t || (m.length >= 3 && t.startsWith(m))));
  const vorOk = !sollVor.length || mrzVor.some((m) => m === sollVor[0] || (m.length >= 3 && sollVor[0].startsWith(m)));
  return nachOk && vorOk;
}

const tageBis = (iso, heute = new Date()) =>
  iso ? Math.floor((new Date(`${iso}T00:00:00Z`).getTime() - new Date(`${heute.toISOString().slice(0, 10)}T00:00:00Z`).getTime()) / 86400000) : null;

/** Dokumentnummer für Anzeigen und Protokolle: nur die letzten 3 Zeichen */
export const nummerMaskiert = (n) => (n ? `${"•".repeat(Math.max(0, String(n).length - 3))}${String(n).slice(-3)}` : "");

/**
 * Vorprüfung: Prüfziffern + Ablauf + Abgleich mit den Angaben im Konto/KYC-Fall.
 * soll: { vorname, nachname, geburtsdatum (ISO), staatsangehoerigkeit? (ISO-2), ausweisNummer? }
 * Liefert { ergebnis: plausibel|auffaellig|ungueltig, text, hinweise[], mrz, abgleich{…}, tageGueltig }
 *   plausibel  – alle Prüfziffern ok, nicht abgelaufen, Name und Geburtsdatum stimmen
 *   auffaellig – Prüfziffern ok, aber abgelaufen oder Abweichung zu den Angaben
 *   ungueltig  – Format/Prüfziffer falsch (vermutlich Tippfehler oder manipuliert)
 */
export function mrzVorpruefung(eingabe, soll = {}, { heute = new Date() } = {}) {
  const mrz = mrzPruefen(eingabe, { heute });
  const hinweise = [];
  if (!mrz.ok) {
    return { ergebnis: "ungueltig", text: "Die maschinenlesbare Zone ist nicht stimmig.", hinweise: mrz.fehler, mrz, abgleich: {}, tageGueltig: null };
  }
  const f = mrz.felder;
  const tageGueltig = tageBis(f.gueltigBis, heute);
  const abgleich = {
    name: soll.nachname ? nameStimmt(soll, f) : null,
    geburtsdatum: soll.geburtsdatum ? String(soll.geburtsdatum).slice(0, 10) === f.geburtsdatum : null,
    gueltig: tageGueltig !== null && tageGueltig >= 0,
    ausweisNummer: soll.ausweisNummer ? mrzName(soll.ausweisNummer).replace(/\s/g, "") === f.dokumentnummer : null,
  };
  if (!abgleich.gueltig) hinweise.push(`Das Dokument ist seit ${Math.abs(tageGueltig)} Tagen abgelaufen (gültig bis ${f.gueltigBis}).`);
  else if (tageGueltig < 30) hinweise.push(`Das Dokument läuft in ${tageGueltig} Tagen ab.`);
  if (abgleich.name === false) hinweise.push("Der Name in der MRZ weicht von den Angaben im Konto ab.");
  if (abgleich.geburtsdatum === false) hinweise.push("Das Geburtsdatum in der MRZ weicht von den Angaben ab.");
  if (abgleich.ausweisNummer === false) hinweise.push("Die Dokumentnummer weicht von der angegebenen Ausweisnummer ab.");
  if (abgleich.name === null || abgleich.geburtsdatum === null) hinweise.push("Für einen vollständigen Abgleich fehlen Name oder Geburtsdatum in Ihren Angaben.");
  const auffaellig = !abgleich.gueltig || abgleich.name === false || abgleich.geburtsdatum === false || abgleich.ausweisNummer === false;
  return {
    ergebnis: auffaellig ? "auffaellig" : "plausibel",
    text: auffaellig ? "Prüfziffern stimmen, es gibt aber Abweichungen – die Compliance prüft manuell." : "Automatisch plausibel: Prüfziffern, Gültigkeit und Abgleich ohne Auffälligkeit. Die Identifizierung selbst erfolgt durch den Anbieter bzw. die Compliance.",
    hinweise,
    mrz,
    abgleich,
    tageGueltig,
  };
}

/** Beispiele aus ICAO Doc 9303 (Specimen „Anna Maria Eriksson“, Utopia) – für Tests und die Hilfe im Portal */
export const MRZ_BEISPIELE = {
  td3: ["P<UTOERIKSSON<<ANNA<MARIA<<<<<<<<<<<<<<<<<<<", "L898902C36UTO7408122F1204159ZE184226B<<<<<10"],
  td1: ["I<UTOD231458907<<<<<<<<<<<<<<<", "7408122F1204159UTO<<<<<<<<<<<6", "ERIKSSON<<ANNA<MARIA<<<<<<<<<<"],
};
