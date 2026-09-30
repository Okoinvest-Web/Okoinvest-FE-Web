// src/lib/plattform/kycIdent.js
//
// Eigene Identifizierung im KYC-Fall (Team „Eigene Identifizierung“) – reine Funktionen ohne Importe
// (Client, Server, Node-Tests). Frappe-Gegenstück: Backend-Import/oekoinvest_app/oekoinvest_app/plattform/kyc_ident_kern.py
// (gleiche Regeln, gleiche Befund-Kennungen).
//
// 1. MRZ-Prüfung nach ICAO Doc 9303 (Teil 3: Zeichensatz, Prüfziffern 7-3-1; Teil 4: TD3 Reisepass 2 × 44;
//    Teil 5: TD1 Ausweiskarte 3 × 30; Teil 6: TD2 2 × 36). Die Person tippt die maschinenlesbare Zone ab – keine
//    Bilderkennung, kein OCR. Ergebnis: Befundliste mit Ampel (gruen/gelb/rot), Abgleich mit den Personendaten des Falls.
//    WICHTIG: Stimmige Prüfziffern belegen nur, dass die Zeilen in sich konsistent sind – nicht, dass das Dokument echt
//    ist oder der Person gehört. Die MRZ ist ein Hinweis für die Compliance, keine Identifizierung.
// 2. Identifizierungswege (Methodenwahl) mit Zulässigkeit je Risiko/Investorentyp (Einstellung der Compliance).
// 3. Videoidentifizierung durch eigene Compliance-Mitarbeiter („video_intern“): Pflicht-Checkliste als MUSTER in
//    Anlehnung an FMA Online-Identifikationsverordnung (Online-IDV) und BaFin-Rundschreiben 3/2017 (GW) – keine
//    Zulassung, keine Rechtsberatung. Ob ein eigenes Videoverfahren für ÖkoInvest geldwäscherechtlich genügt, ist vor
//    dem Einsatz rechtlich zu klären (siehe docs/PLATTFORM.md, Abschnitt „Eigene Identifizierung“).

// ================================================================ MRZ – Grundlagen

export const MRZ_FORMATE = {
  TD1: { zeilen: 3, laenge: 30, label: "Ausweiskarte (TD1, 3 × 30 Zeichen)" },
  TD2: { zeilen: 2, laenge: 36, label: "Ausweisdokument (TD2, 2 × 36 Zeichen)" },
  TD3: { zeilen: 2, laenge: 44, label: "Reisepass (TD3, 2 × 44 Zeichen)" },
};

/** Zeichenwert ICAO 9303-3: 0–9 → 0–9, A–Z → 10–35, „<“ → 0; sonst -1 */
function zeichenWert(c) {
  if (c >= "0" && c <= "9") return c.charCodeAt(0) - 48;
  if (c >= "A" && c <= "Z") return c.charCodeAt(0) - 55;
  if (c === "<") return 0;
  return -1;
}

/** Prüfziffer (Gewichte 7-3-1, Summe mod 10) oder null bei unzulässigen Zeichen */
export function mrzPruefziffer(feld) {
  const s = String(feld ?? "");
  let summe = 0;
  for (let i = 0; i < s.length; i++) {
    const w = zeichenWert(s[i]);
    if (w < 0) return null;
    summe += w * [7, 3, 1][i % 3];
  }
  return summe % 10;
}

/** Stimmt die Prüfziffer? „<“ gilt als 0 (leere optionale Felder). */
export function mrzPruefzifferOk(feld, ziffer) {
  const soll = mrzPruefziffer(feld);
  if (soll === null || ziffer === undefined) return false;
  const ist = ziffer === "<" ? 0 : /^\d$/.test(ziffer) ? Number(ziffer) : -1;
  return ist === soll;
}

/**
 * Eingabe vereinheitlichen: Großbuchstaben, typische Ersatzzeichen für „<“ („«“, „‹“), Leerzeichen entfernen.
 * Nimmt einen Text (Zeilen durch Umbruch getrennt) oder ein Array von Zeilen. Eine einzeilige Eingabe mit
 * 90/72/88 Zeichen wird auf die Formatlängen aufgeteilt.
 */
export function mrzZeilen(eingabe) {
  const roh = Array.isArray(eingabe) ? eingabe.map((z) => String(z ?? "")) : String(eingabe ?? "").replace(/\r/g, "").split("\n");
  const zeilen = roh.map((z) => z.toUpperCase().replace(/[«‹]/g, "<").replace(/\s+/g, "")).filter(Boolean).slice(0, 3);
  if (zeilen.length === 1) {
    const z = zeilen[0];
    if (z.length === 90) return [z.slice(0, 30), z.slice(30, 60), z.slice(60)];
    if (z.length === 88) return [z.slice(0, 44), z.slice(44)];
    if (z.length === 72) return [z.slice(0, 36), z.slice(36)];
  }
  return zeilen;
}

/** Format an Zeilenzahl und -länge erkennen */
export function mrzFormat(zeilen) {
  const z = (zeilen || []).filter(Boolean);
  for (const [id, f] of Object.entries(MRZ_FORMATE)) if (z.length === f.zeilen && z.every((x) => x.length === f.laenge)) return id;
  return null;
}

/** Erwartetes Format aus der Dokumentart des Falls (für die Eingabefelder) */
export function mrzFormatFuerArt(art) {
  return art === "reisepass" ? "TD3" : "TD1";
}

const fueller = (s) => String(s || "").replace(/</g, " ").replace(/\s+/g, " ").trim();

function nameTeilen(feld) {
  const [nach, ...rest] = String(feld || "").split("<<");
  return { nachname: fueller(nach), vornamen: fueller(rest.join("<<")) };
}

/** JJMMTT → ISO. art „geburt“: nie in der Zukunft; „ablauf“: Jahrhundert so, dass höchstens 50 Jahre zurück. */
export function mrzDatum(jjmmtt, art = "geburt", heute = new Date()) {
  const s = String(jjmmtt || "");
  if (!/^\d{6}$/.test(s)) return null;
  const jj = Number(s.slice(0, 2));
  const mm = Number(s.slice(2, 4));
  const tt = Number(s.slice(4, 6));
  if (mm < 1 || mm > 12 || tt < 1 || tt > 31) return null;
  const jetztJ = heute.getUTCFullYear() % 100;
  const jahr = art === "geburt" ? (jj > jetztJ ? 1900 + jj : 2000 + jj) : jj >= jetztJ + 50 ? 1900 + jj : 2000 + jj;
  const iso = `${jahr}-${String(mm).padStart(2, "0")}-${String(tt).padStart(2, "0")}`;
  const d = new Date(`${iso}T00:00:00Z`);
  if (Number.isNaN(d.getTime()) || d.getUTCDate() !== tt) return null;
  return iso;
}

/** Staatsangehörigkeit/Ausstellerstaat ICAO (Alpha-3, Deutschland „D“) → ISO-3166 Alpha-2 (Auswahl) */
export const MRZ_STAATEN = {
  D: "DE", DEU: "DE", AUT: "AT", CHE: "CH", LIE: "LI", ITA: "IT", FRA: "FR", NLD: "NL", BEL: "BE", LUX: "LU", DNK: "DK", POL: "PL", CZE: "CZ",
  SVK: "SK", HUN: "HU", SVN: "SI", HRV: "HR", ESP: "ES", PRT: "PT", IRL: "IE", SWE: "SE", FIN: "FI", NOR: "NO", GBR: "GB", USA: "US", ROU: "RO",
  BGR: "BG", GRC: "GR", TUR: "TR", UKR: "UA", ARE: "AE", ISL: "IS", EST: "EE", LVA: "LV", LTU: "LT", MLT: "MT", CYP: "CY",
};
export const mrzStaat = (c) => MRZ_STAATEN[String(c || "").replace(/</g, "")] || null;

/** Dokumentart laut MRZ-Code (1. Zeichen, bei Aufenthaltstiteln „A“/„AR“) */
export function mrzDokumentart(code) {
  const c = String(code || "").replace(/</g, "");
  if (c[0] === "P") return "reisepass";
  if (c === "AR") return "aufenthaltstitel"; // z. B. deutscher elektronischer Aufenthaltstitel
  if (c[0] === "I" || c[0] === "A" || c[0] === "C") return "personalausweis";
  if (c[0] === "V") return "visum";
  return "unbekannt";
}
const ART_LABEL = { reisepass: "Reisepass", personalausweis: "Personalausweis / Identitätskarte", aufenthaltstitel: "Aufenthaltstitel", visum: "Visum", unbekannt: "unbekannt" };

/**
 * MRZ zerlegen und alle Prüfziffern prüfen (ohne Abgleich).
 * Liefert { format, felder, pruefziffern: [{ feld, label, ok }], zeichenOk, datumOk }
 */
export function mrzZerlegen(eingabe, { heute = new Date() } = {}) {
  const zeilen = mrzZeilen(eingabe);
  const format = mrzFormat(zeilen);
  if (!format) return { format: null, zeilen, felder: {}, pruefziffern: [], zeichenOk: zeilen.every((z) => /^[A-Z0-9<]*$/.test(z)) };
  const p = [];
  const pz = (feld, label, wert, ziffer) => p.push({ feld, label, ok: mrzPruefzifferOk(wert, ziffer) });
  let f;
  if (format === "TD1") {
    const [a, b, c] = zeilen;
    let nummer = a.slice(5, 14);
    let ziffer = a[14];
    let optional1 = a.slice(15, 30);
    // Dokumentnummer > 9 Zeichen: Fortsetzung in den optionalen Daten, Prüfziffer danach, „<“ an Position 15 (9303-5)
    if (ziffer === "<" && /[A-Z0-9]/.test(optional1[0] || "")) {
      const ende = optional1.indexOf("<");
      const rest = ende > 0 ? optional1.slice(0, ende) : optional1;
      nummer = `${nummer}${rest.slice(0, -1)}`;
      ziffer = rest.slice(-1);
      optional1 = optional1.slice(rest.length);
    }
    f = {
      dokumentcode: a.slice(0, 2).replace(/<$/, ""), ausstellerstaat: a.slice(2, 5), dokumentnummer: nummer.replace(/</g, ""), optional: fueller(optional1 + b.slice(18, 29)),
      geburtsdatumRoh: b.slice(0, 6), geschlecht: b[7], ablaufRoh: b.slice(8, 14), staatsangehoerigkeit: b.slice(15, 18), ...nameTeilen(c),
    };
    pz("dokumentnummer", "Dokumentnummer", nummer, ziffer);
    pz("geburtsdatum", "Geburtsdatum", b.slice(0, 6), b[6]);
    pz("ablauf", "Ablaufdatum", b.slice(8, 14), b[14]);
    pz("gesamt", "Gesamtprüfziffer", a.slice(5, 30) + b.slice(0, 7) + b.slice(8, 15) + b.slice(18, 29), b[29]);
  } else {
    const [a, b] = zeilen;
    const td3 = format === "TD3";
    f = {
      dokumentcode: a.slice(0, 2).replace(/<$/, ""), ausstellerstaat: a.slice(2, 5), ...nameTeilen(a.slice(5, td3 ? 44 : 36)),
      dokumentnummer: b.slice(0, 9).replace(/</g, ""), staatsangehoerigkeit: b.slice(10, 13), geburtsdatumRoh: b.slice(13, 19), geschlecht: b[20], ablaufRoh: b.slice(21, 27),
      optional: fueller(b.slice(28, td3 ? 42 : 35)),
    };
    pz("dokumentnummer", "Dokumentnummer", b.slice(0, 9), b[9]);
    pz("geburtsdatum", "Geburtsdatum", b.slice(13, 19), b[19]);
    pz("ablauf", "Ablaufdatum", b.slice(21, 27), b[27]);
    if (td3) {
      pz("optional", "Optionale Daten (persönliche Nummer)", b.slice(28, 42), b[42]);
      pz("gesamt", "Gesamtprüfziffer", b.slice(0, 10) + b.slice(13, 20) + b.slice(21, 43), b[43]);
    } else {
      pz("gesamt", "Gesamtprüfziffer", b.slice(0, 10) + b.slice(13, 20) + b.slice(21, 35), b[35]);
    }
  }
  f.ausstellerstaat = f.ausstellerstaat.replace(/</g, "");
  f.staatsangehoerigkeit = f.staatsangehoerigkeit.replace(/</g, "");
  f.geschlecht = f.geschlecht === "<" ? "X" : f.geschlecht;
  f.dokumentart = mrzDokumentart(f.dokumentcode);
  f.geburtsdatum = mrzDatum(f.geburtsdatumRoh, "geburt", heute);
  f.gueltigBis = mrzDatum(f.ablaufRoh, "ablauf", heute);
  return { format, zeilen, felder: f, pruefziffern: p, zeichenOk: zeilen.every((z) => /^[A-Z0-9<]+$/.test(z)) };
}

// ================================================================ MRZ – Abgleich und Befund

/** Name in MRZ-Schreibweise (ICAO 9303-3 Transliteration: Ä → AE, Ö → OE, Ü → UE, ß → SS, Akzente entfernt) */
export function mrzName(s) {
  return String(s || "")
    .toUpperCase()
    .replace(/Ä/g, "AE").replace(/Ö/g, "OE").replace(/Ü/g, "UE").replace(/ẞ|ß/g, "SS")
    .replace(/Å/g, "AA").replace(/Æ/g, "AE").replace(/Ø/g, "OE")
    .normalize("NFKD").replace(/[̀-ͯ]/g, "")
    .replace(/[^A-Z]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Tolerante Variante (für Namen, die ohne Umlaut-Transliteration geschrieben wurden: Ä → A) */
const mrzNameEinfach = (s) => String(s || "").toUpperCase().replace(/ẞ|ß/g, "SS").normalize("NFKD").replace(/[̀-ͯ]/g, "").replace(/[^A-Z]+/g, " ").replace(/\s+/g, " ").trim();

const woerter = (s) => s.split(" ").filter(Boolean);

/** Stimmen die Wortfolgen überein? MRZ kürzt lange Namen – ein gekürztes letztes Wort (≥ 2 Zeichen) zählt. */
function namenGleich(soll, mrz) {
  for (const t of [mrzName, mrzNameEinfach]) {
    const a = woerter(t(soll));
    const b = woerter(mrzName(mrz));
    if (!a.length || !b.length) continue;
    if (a.join(" ") === b.join(" ")) return true;
    // gekürzte MRZ: alle MRZ-Wörter gleich, letztes darf Präfix sein
    if (b.length <= a.length && b.every((w, i) => w === a[i] || (i === b.length - 1 && w.length >= 2 && a[i].startsWith(w)))) return true;
  }
  return false;
}

/** Erster Vorname enthalten? (MRZ enthält alle Vornamen, Person gibt evtl. nur den Rufnamen an) */
function vornameGleich(soll, mrzVornamen) {
  const b = woerter(mrzName(mrzVornamen));
  for (const t of [mrzName, mrzNameEinfach]) {
    const a = woerter(t(soll));
    if (a.length && b.length && (namenGleich(soll, mrzVornamen) || a.every((w) => b.includes(w)) || b.includes(a[0]))) return true;
  }
  return false;
}

const tageZwischen = (vonIso, bisIso) => Math.round((new Date(`${bisIso}T00:00:00Z`) - new Date(`${vonIso}T00:00:00Z`)) / 86400000);
const heuteIsoVon = (heute) => heute.toISOString().slice(0, 10);

/** Alter in vollen Jahren am Stichtag */
export function alterAm(geburtIso, stichtagIso) {
  if (!geburtIso || !stichtagIso) return null;
  const [gj, gm, gt] = geburtIso.split("-").map(Number);
  const [sj, sm, st] = stichtagIso.split("-").map(Number);
  return sj - gj - (sm < gm || (sm === gm && st < gt) ? 1 : 0);
}

/** Nur die letzten 3 Zeichen einer Dokumentnummer anzeigen */
export const mrzNummerMaskiert = (n) => (n ? `${"•".repeat(Math.max(0, String(n).length - 3))}${String(n).slice(-3)}` : "");

export const MRZ_AMPEL = { gruen: { label: "unauffällig", ton: "ok" }, gelb: { label: "Hinweis", ton: "info" }, rot: { label: "auffällig", ton: "warn" } };
const RANG = { gruen: 0, gelb: 1, rot: 2 };
export const ampelMax = (liste) => liste.reduce((m, x) => (RANG[x] > RANG[m] ? x : m), "gruen");

/** Muster-/Specimen-Daten (ICAO „Utopia“, deutsche Musterdaten „Mustermann“) */
function istMuster(f) {
  return f.ausstellerstaat === "UTO" || f.staatsangehoerigkeit === "UTO" || /^(MUSTERMANN|MUSTERFRAU|SPECIMEN)$/.test(f.nachname || "");
}

/**
 * Vollständiger MRZ-Befund mit Ampel.
 * soll (Angaben im KYC-Fall): { vorname, nachname, geburtsdatum (ISO), staatsangehoerigkeit (ISO-2),
 *   ausweis: { art: personalausweis|reisepass|aufenthaltstitel, nummer, gueltigBis } }
 * Liefert { format, formatLabel, ampel, befunde: [{ id, ampel, text }], pruefziffern, felder, zusammenfassung, geprueftAm }.
 * Regeln: Format/Zeichen/Prüfziffer/Datum ungültig, abgelaufen, minderjährig, Nachname, Geburtsdatum oder Dokumentnummer
 * weichen ab → rot. Vorname, Staatsangehörigkeit, Dokumentart, „gültig bis“ weichen ab, Ablauf < 30 Tage, Muster-
 * daten, unvollständige Angaben → gelb. Sonst grün.
 */
export function mrzBefund(eingabe, soll = {}, { heute = new Date() } = {}) {
  const z = mrzZerlegen(eingabe, { heute });
  const befunde = [];
  const b = (id, ampel, text) => befunde.push({ id, ampel, text });
  const ergebnis = (zusatz = {}) => {
    const ampel = ampelMax(befunde.map((x) => x.ampel));
    const rot = befunde.filter((x) => x.ampel === "rot").length;
    const gelb = befunde.filter((x) => x.ampel === "gelb").length;
    return {
      format: z.format, formatLabel: z.format ? MRZ_FORMATE[z.format].label : "unbekannt", ampel, befunde, pruefziffern: z.pruefziffern,
      zusammenfassung: ampel === "gruen" ? "MRZ stimmig, Abgleich mit den Angaben ohne Auffälligkeit." : `${rot ? `${rot} auffällig` : ""}${rot && gelb ? ", " : ""}${gelb ? `${gelb} Hinweis${gelb === 1 ? "" : "e"}` : ""}.`,
      geprueftAm: heute.toISOString(),
      ...zusatz,
    };
  };
  if (!z.format) {
    const laengen = z.zeilen.filter(Boolean).map((x) => x.length).join(" / ") || "–";
    b("format", "rot", `Unbekanntes Format (Zeilenlängen ${laengen}). Erwartet: Ausweiskarte 3 × 30, Reisepass 2 × 44 oder 2 × 36 Zeichen.`);
    return ergebnis({ felder: {} });
  }
  if (!z.zeichenOk) b("zeichen", "rot", "Die Zeilen enthalten unzulässige Zeichen (erlaubt: A–Z, 0–9 und „<“).");
  for (const p of z.pruefziffern) b(`pz_${p.feld}`, p.ok ? "gruen" : "rot", p.ok ? `Prüfziffer ${p.label} korrekt.` : `Prüfziffer ${p.label} falsch – Tippfehler oder verändertes Dokument.`);
  const f = z.felder;
  const heuteIso = heuteIsoVon(heute);
  if (!f.geburtsdatum) b("datum_geburt", "rot", "Das Geburtsdatum in der MRZ ist kein gültiges Datum.");
  if (!f.gueltigBis) b("datum_ablauf", "rot", "Das Ablaufdatum in der MRZ ist kein gültiges Datum.");
  if (!f.nachname) b("name_fehlt", "rot", "Der Name fehlt in der MRZ.");
  if (f.gueltigBis) {
    const t = tageZwischen(heuteIso, f.gueltigBis);
    if (t < 0) b("abgelaufen", "rot", `Das Dokument ist abgelaufen (gültig bis ${f.gueltigBis}).`);
    else if (t < 30) b("laeuft_ab", "gelb", `Das Dokument läuft in ${t} Tagen ab (${f.gueltigBis}).`);
    else b("gueltig", "gruen", `Dokument gültig bis ${f.gueltigBis}.`);
  }
  if (f.geburtsdatum) {
    const alter = alterAm(f.geburtsdatum, heuteIso);
    if (alter < 18) b("minderjaehrig", "rot", `Die Person ist laut MRZ ${alter} Jahre alt – Geschäftsbeziehungen nur mit Volljährigen.`);
  }
  if (istMuster(f)) b("muster", "gelb", "Muster- bzw. Specimen-Daten erkannt (z. B. „Utopia“, „Mustermann“) – kein echtes Dokument.");

  // Abgleich mit den Angaben im Fall
  const aw = soll.ausweis || {};
  const fehlend = [];
  if (soll.nachname) {
    if (namenGleich(soll.nachname, f.nachname)) b("name_nachname", "gruen", "Nachname stimmt mit den Angaben überein.");
    else b("name_nachname", "rot", `Nachname weicht ab (MRZ: ${f.nachname || "–"}).`);
  } else fehlend.push("Nachname");
  if (soll.vorname) {
    if (vornameGleich(soll.vorname, f.vornamen)) b("name_vorname", "gruen", "Vorname stimmt mit den Angaben überein.");
    else b("name_vorname", "gelb", `Vorname weicht ab (MRZ: ${f.vornamen || "–"}) – Schreibweise prüfen.`);
  } else fehlend.push("Vorname");
  if (soll.geburtsdatum) {
    if (String(soll.geburtsdatum).slice(0, 10) === f.geburtsdatum) b("geburtsdatum", "gruen", "Geburtsdatum stimmt überein.");
    else b("geburtsdatum", "rot", `Geburtsdatum weicht ab (MRZ: ${f.geburtsdatum || f.geburtsdatumRoh}).`);
  } else fehlend.push("Geburtsdatum");
  if (soll.staatsangehoerigkeit) {
    const iso2 = mrzStaat(f.staatsangehoerigkeit);
    if (iso2 === String(soll.staatsangehoerigkeit).toUpperCase()) b("staatsangehoerigkeit", "gruen", "Staatsangehörigkeit stimmt überein.");
    else b("staatsangehoerigkeit", "gelb", `Staatsangehörigkeit weicht ab oder ist nicht zuordenbar (MRZ: ${f.staatsangehoerigkeit || "–"}).`);
  } else fehlend.push("Staatsangehörigkeit");
  if (aw.art) {
    // Aufenthaltstitel anderer Staaten tragen oft „I“/„A“ – als Karte akzeptiert
    const passt = aw.art === f.dokumentart || (aw.art === "aufenthaltstitel" && f.dokumentart === "personalausweis");
    if (passt) b("dokumentart", "gruen", `Dokumentart passt (${ART_LABEL[f.dokumentart]}).`);
    else b("dokumentart", "gelb", `Dokumentart weicht ab (Angabe: ${ART_LABEL[aw.art] || aw.art}, MRZ: ${ART_LABEL[f.dokumentart]}).`);
  }
  if (aw.nummer) {
    const n = String(aw.nummer).toUpperCase().replace(/[^A-Z0-9]/g, "");
    if (n === f.dokumentnummer) b("dokumentnummer", "gruen", "Dokumentnummer stimmt mit der angegebenen Ausweisnummer überein.");
    else b("dokumentnummer", "rot", "Dokumentnummer weicht von der angegebenen Ausweisnummer ab.");
  } else fehlend.push("Ausweisnummer");
  if (aw.gueltigBis && f.gueltigBis) {
    if (aw.gueltigBis === f.gueltigBis) b("gueltig_bis", "gruen", "„Gültig bis“ stimmt mit den Angaben überein.");
    else b("gueltig_bis", "gelb", `„Gültig bis“ weicht ab (Angabe ${aw.gueltigBis}, MRZ ${f.gueltigBis}).`);
  }
  if (fehlend.length) b("abgleich_unvollstaendig", "gelb", `Abgleich unvollständig – in den Angaben fehlt: ${fehlend.join(", ")}.`);
  return ergebnis({
    felder: {
      dokumentart: f.dokumentart, dokumentcode: f.dokumentcode, ausstellerstaat: f.ausstellerstaat, nachname: f.nachname, vornamen: f.vornamen, geburtsdatum: f.geburtsdatum,
      staatsangehoerigkeit: f.staatsangehoerigkeit, geschlecht: f.geschlecht, gueltigBis: f.gueltigBis, dokumentnummerMaskiert: mrzNummerMaskiert(f.dokumentnummer),
    },
  });
}

/** Offizielle Beispiele: ICAO Doc 9303 Specimen „Anna Maria Eriksson“ (Utopia) und deutsche Musterdaten „Erika Mustermann“ */
export const MRZ_BEISPIELE = {
  icaoTd3: ["P<UTOERIKSSON<<ANNA<MARIA<<<<<<<<<<<<<<<<<<<", "L898902C36UTO7408122F1204159ZE184226B<<<<<10"],
  icaoTd1: ["I<UTOD231458907<<<<<<<<<<<<<<<", "7408122F1204159UTO<<<<<<<<<<<6", "ERIKSSON<<ANNA<MARIA<<<<<<<<<<"],
  icaoTd2: ["I<UTOERIKSSON<<ANNA<MARIA<<<<<<<<<<<", "D231458907UTO7408122F1204159<<<<<<<6"],
  deTd1: ["IDD<<T220001293<<<<<<<<<<<<<<<", "6408125<2010315D<<<<<<<<<<<<<4", "MUSTERMANN<<ERIKA<<<<<<<<<<<<<"],
};

// ================================================================ Identifizierungswege (Methodenwahl)

export const KYC_METHODEN_REIHENFOLGE = ["eid", "video_intern", "extern"];

/** Standard der Compliance-Einstellung „Zulässige Wege“ je Risikostufe; investorTypen: optionale Einschränkung je Typ */
export function kycMethodenStandard() {
  return {
    niedrig: ["eid", "video_intern", "extern"],
    mittel: ["eid", "video_intern", "extern"],
    hoch: ["eid", "video_intern"],
    investorTypen: {},
  };
}

/**
 * Wege bewerten. methoden: [{ id, label, verfuegbar, … }] (KYC_METHODEN aus kyc.js); regeln: Einstellung „methoden“;
 * risiko: niedrig|mittel|hoch (Regel-Risiko des Falls); investorTyp optional.
 * Liefert je Weg { …, zulaessig, grund, empfohlen } – empfohlen = erster verfügbarer und zulässiger Weg in der Reihenfolge.
 */
export function kycMethodenBewerten(methoden = [], { regeln = kycMethodenStandard(), risiko = "mittel", investorTyp = "" } = {}) {
  const r = { ...kycMethodenStandard(), ...(regeln || {}) };
  const jeRisiko = r[risiko] || r.mittel || [];
  const jeTyp = investorTyp && Array.isArray(r.investorTypen?.[investorTyp]) && r.investorTypen[investorTyp].length ? r.investorTypen[investorTyp] : null;
  const liste = [...methoden].sort((a, b) => KYC_METHODEN_REIHENFOLGE.indexOf(a.id) - KYC_METHODEN_REIHENFOLGE.indexOf(b.id)).map((m) => {
    let grund = "";
    if (!m.verfuegbar) grund = "derzeit nicht verfügbar";
    else if (!jeRisiko.includes(m.id)) grund = `bei Risiko „${risiko}“ nicht zugelassen`;
    else if (jeTyp && !jeTyp.includes(m.id)) grund = "für Ihren Investorentyp nicht zugelassen";
    return { ...m, zulaessig: !grund, grund, empfohlen: false };
  });
  const erster = liste.find((m) => m.zulaessig);
  if (erster) erster.empfohlen = true;
  return liste;
}

// ================================================================ Videoidentifizierung durch eigene Mitarbeiter

export const KYC_VIDEO_HINWEIS =
  "Muster-Checkliste in Anlehnung an die FMA Online-Identifikationsverordnung und das BaFin-Rundschreiben 3/2017 (GW) in der jeweils geltenden Fassung – keine Zulassung und keine Rechtsberatung. Ob ein eigenes Videoverfahren für ÖkoInvest genügt, ist vor dem Einsatz rechtlich zu klären.";

export const KYC_VIDEO_DATENSCHUTZ =
  "Das Gespräch findet über das angegebene Videokonferenz-Werkzeug statt. ÖkoInvest zeichnet kein Video auf; protokolliert werden die Prüfschritte mit Zeitpunkt und Ergebnis sowie die durchführende Person. Nähere Informationen in der Datenschutzerklärung (Abschnitt Identitätsprüfung).";

/** Pflicht-Checkliste (Reihenfolge = Gesprächsablauf). `tan`: wird durch die TAN-Prüfung automatisch gesetzt. */
export const KYC_VIDEO_CHECKLISTE = [
  { id: "einwilligung", label: "Einwilligung in die Protokollierung eingeholt, Datenschutzhinweis erteilt", pflicht: true, hinweis: "Ausdrückliche Zustimmung zu Beginn; ohne Einwilligung abbrechen." },
  { id: "umgebung", label: "Bild- und Tonqualität ausreichend, Person allein, keine Anzeichen von Beeinflussung durch Dritte", pflicht: true, hinweis: "Bei schlechter Verbindung oder Einfluss Dritter abbrechen." },
  { id: "lichtbild", label: "Lichtbildabgleich: Die Person entspricht dem Foto im Dokument", pflicht: true, hinweis: "Gesicht frontal und im Profil, Dokument neben das Gesicht halten lassen." },
  { id: "vorderseite", label: "Vorderseite vollständig gezeigt, Angaben mit dem KYC-Fall abgeglichen", pflicht: true, hinweis: "Name, Geburtsdatum, Staatsangehörigkeit, Dokumentnummer, Gültigkeit." },
  { id: "rueckseite", label: "Rückseite gezeigt (bei Karten), Anschrift und ausstellende Behörde abgeglichen", pflicht: true, hinweis: "Beim Reisepass: Datenseite und Unterschriftenseite." },
  { id: "hologramm", label: "Sicherheitsmerkmale: Hologramm bzw. Kinegramm durch Kippen geprüft", pflicht: true, hinweis: "Farbwechsel und Bewegung der Merkmale beim Kippen vor der Kamera." },
  { id: "schriftbild", label: "Schriftbild, Schrifttyp und Anordnung unauffällig", pflicht: true, hinweis: "Keine abweichenden Schriften, Überklebungen oder verschobenen Felder." },
  { id: "beschaedigung", label: "Dokument unbeschädigt (Foto, Laminat, Ränder, Chip-Bereich)", pflicht: true, hinweis: "Beschädigte Dokumente sind ungeeignet." },
  { id: "seriennummer", label: "Dokumentnummer von der Person vorgelesen und übereinstimmend", pflicht: true, hinweis: "Mit der MRZ bzw. der Angabe im Fall vergleichen." },
  { id: "plausibilitaet", label: "Plausibilitätsfragen stimmig beantwortet", pflicht: true, hinweis: "z. B. Geburtsort, Anschrift, Zweck der Geschäftsbeziehung – ohne Vorsagen." },
  { id: "tan", label: "Einmalcode (TAN) während des Gesprächs bestätigt", pflicht: true, automatisch: true, hinweis: "Code per E-Mail senden, Person liest ihn vor, hier eingeben." },
];
export const KYC_VIDEO_PUNKT_IDS = KYC_VIDEO_CHECKLISTE.map((p) => p.id);

export const KYC_VIDEO_ERGEBNISSE = {
  bestanden: { label: "Bestanden", ton: "ok" },
  abgebrochen: { label: "Abgebrochen", ton: "neutral" },
  verdacht: { label: "Verdacht", ton: "warn" },
};

export const KYC_VIDEO_ABBRUCHGRUENDE = {
  technik: "Bild oder Ton unzureichend",
  dokument: "Dokument ungeeignet, beschädigt oder abgelaufen",
  lichtbild: "Person entspricht nicht dem Lichtbild",
  dritte: "Anwesenheit oder Einfluss Dritter",
  mitwirkung: "Mitwirkung verweigert (z. B. Kippen, Vorlesen)",
  tan: "Einmalcode nicht bestätigt",
  einwilligung: "Keine Einwilligung",
  kunde: "Abbruch durch die Person",
  sonstiges: "Sonstiger Grund",
};

export const KYC_TAN = { stellen: 6, gueltigMinuten: 10, versuche: 3 };

/**
 * Abschluss prüfen. protokoll: { punkte: { [id]: { ok } }, tan: { bestaetigt } }.
 * Liefert { ok, fehler[] } – bestanden nur mit allen Pflichtpunkten und bestätigter TAN; jede Entscheidung mit
 * Begründung (≥ 10 Zeichen); Abbruch mit Abbruchgrund.
 */
export function videoAbschlussPruefen(protokoll = {}, { ergebnis, begruendung = "", abbruchgrund = "" } = {}) {
  const fehler = [];
  if (!KYC_VIDEO_ERGEBNISSE[ergebnis]) fehler.push("Bitte wählen Sie ein Ergebnis.");
  if (String(begruendung || "").trim().length < 10) fehler.push("Bitte begründen Sie das Ergebnis (mindestens 10 Zeichen).");
  if (ergebnis === "abgebrochen" && !KYC_VIDEO_ABBRUCHGRUENDE[abbruchgrund]) fehler.push("Bitte wählen Sie einen Abbruchgrund.");
  if (ergebnis === "bestanden") {
    const offen = KYC_VIDEO_CHECKLISTE.filter((p) => p.pflicht && p.id !== "tan" && protokoll.punkte?.[p.id]?.ok !== true);
    if (offen.length) fehler.push(`Nicht bestätigte Pflichtpunkte: ${offen.map((p) => p.label).join(" · ")}`);
    if (!protokoll.tan?.bestaetigt) fehler.push("Der Einmalcode (TAN) wurde nicht bestätigt.");
  }
  return { ok: fehler.length === 0, fehler };
}

/** Kanonische Darstellung für den Protokoll-Hash (Schlüssel sortiert) */
export function kanonischJson(wert) {
  if (Array.isArray(wert)) return `[${wert.map(kanonischJson).join(",")}]`;
  if (wert && typeof wert === "object") return `{${Object.keys(wert).sort().filter((k) => wert[k] !== undefined).map((k) => `${JSON.stringify(k)}:${kanonischJson(wert[k])}`).join(",")}}`;
  return JSON.stringify(wert ?? null);
}
