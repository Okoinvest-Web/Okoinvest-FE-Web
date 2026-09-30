// src/lib/plattform/signatur/pdfAnhang.js
//
// Seiten an ein bestehendes PDF anhängen – als INKREMENTELLES UPDATE (ISO 32000-1, 7.5.6):
// Die Bytes des Originals bleiben vollständig und unverändert am Anfang der Datei stehen; angehängt
// werden nur neue Objekte (Seiten, Schriften, Bilder), eine neue Fassung des Seitenbaums und ein
// neuer Querverweis-Abschnitt mit /Prev. Dadurch gilt:
//     signiert.subarray(0, original.length) === original   und   SHA-256(original) bleibt nachprüfbar.
//
// Unterstützt klassische Querverweistabellen und Querverweis-Ströme (PDF 1.5+, Objekt-Ströme werden
// zum Lesen des Katalogs/Seitenbaums entpackt). Verschlüsselte PDFs werden abgelehnt.
// Die anzuhängenden Seiten kommen aus dem eigenen Erzeuger (server/pdf.js → PdfDokument.alsBuffer()).
//
// Nur serverseitig (Buffer, node:zlib).

import { inflateSync } from "node:zlib";

export class PdfAnhangFehler extends Error {}

const L = (b) => b.toString("latin1");

/** Balanciertes Dictionary ab Position i (zeigt auf "<<") → [text, endeIndex] */
function dictAb(s, i) {
  if (s.slice(i, i + 2) !== "<<") throw new PdfAnhangFehler("PDF-Struktur nicht lesbar (Dictionary).");
  let tiefe = 0;
  for (let k = i; k < s.length - 1; k++) {
    const c = s[k];
    if (c === "(") {
      // Stringliteral überspringen (mit Maskierung und Klammerzählung)
      let t = 1;
      k++;
      while (k < s.length && t > 0) {
        if (s[k] === "\\") k++;
        else if (s[k] === "(") t++;
        else if (s[k] === ")") t--;
        k++;
      }
      k--;
      continue;
    }
    if (c === "<" && s[k + 1] === "<") {
      tiefe++;
      k++;
    } else if (c === ">" && s[k + 1] === ">") {
      tiefe--;
      k++;
      if (tiefe === 0) return [s.slice(i, k + 1), k + 1];
    }
  }
  throw new PdfAnhangFehler("PDF-Struktur nicht lesbar (Dictionary offen).");
}

const ref = (dict, schluessel) => {
  const m = new RegExp(`/${schluessel}\\s+(\\d+)\\s+(\\d+)\\s+R`).exec(dict);
  return m ? { nr: Number(m[1]), gen: Number(m[2]) } : null;
};
const zahlWert = (dict, schluessel) => {
  const m = new RegExp(`/${schluessel}\\s+(\\d+)`).exec(dict);
  return m ? Number(m[1]) : null;
};

/** Beginn der Stromdaten nach dem Dictionary (Schlüsselwort "stream" + Zeilenende) */
function stromDaten(s, dictEnde) {
  let start = s.indexOf("stream", dictEnde);
  if (start < 0) throw new PdfAnhangFehler("PDF-Strom fehlt.");
  start += 6;
  if (s[start] === "\r") start++;
  if (s[start] === "\n") start++;
  return { start };
}

function entpacken(roh, dict) {
  if (!/\/Filter\s*\/FlateDecode/.test(dict) && !/\/Filter\s*\[\s*\/FlateDecode\s*\]/.test(dict)) {
    if (/\/Filter/.test(dict)) throw new PdfAnhangFehler("PDF nutzt einen nicht unterstützten Kompressionsfilter.");
    return roh;
  }
  try {
    return inflateSync(roh);
  } catch {
    // manche Erzeuger hängen Zeilenenden an – bis auf Prüfsumme tolerant entpacken
    try {
      return inflateSync(roh, { finishFlush: 2 });
    } catch {
      throw new PdfAnhangFehler("PDF-Strom beschädigt.");
    }
  }
}

/** Letzte Definition „nr gen obj“ im Klartext suchen → Text des Objekts (ohne obj/endobj) oder null */
function objektKlartext(s, nr) {
  const re = new RegExp(`(?:^|[^0-9])${nr}\\s+(\\d+)\\s+obj\\b`, "g");
  let m;
  let letzte = null;
  while ((m = re.exec(s))) letzte = { index: m.index + m[0].indexOf(String(nr)), laenge: m[0].length - m[0].indexOf(String(nr)), gen: Number(m[1]) };
  if (!letzte) return null;
  const start = letzte.index + letzte.laenge;
  const ende = s.indexOf("endobj", start);
  if (ende < 0) return null;
  return { text: s.slice(start, ende).trim(), gen: letzte.gen };
}

/** Objekt aus Objekt-Strömen (PDF 1.5+) lesen */
function objektAusObjStm(buf, s, nr) {
  const re = /(\d+)\s+(\d+)\s+obj\s*<</g;
  let m;
  while ((m = re.exec(s))) {
    const dictStart = m.index + m[0].length - 2;
    let dict;
    let ende;
    try {
      [dict, ende] = dictAb(s, dictStart);
    } catch {
      continue;
    }
    if (!/\/Type\s*\/ObjStm/.test(dict)) continue;
    const n = zahlWert(dict, "N");
    const first = zahlWert(dict, "First");
    if (n === null || first === null) continue;
    const { start } = stromDaten(s, ende);
    let laenge = /\/Length\s+(\d+)\b(?!\s+\d+\s+R)/.exec(dict);
    laenge = laenge ? Number(laenge[1]) : s.indexOf("endstream", start) - start;
    const daten = L(entpacken(buf.subarray(start, start + laenge), dict));
    const kopf = daten.slice(0, first).trim().split(/\s+/).map(Number);
    for (let i = 0; i < n; i++) {
      if (kopf[i * 2] !== nr) continue;
      const von = first + kopf[i * 2 + 1];
      const bis = i + 1 < n ? first + kopf[(i + 1) * 2 + 1] : daten.length;
      return { text: daten.slice(von, bis).trim(), gen: 0 };
    }
  }
  return null;
}

function objektLesen(buf, s, nr) {
  const o = objektKlartext(s, nr) || objektAusObjStm(buf, s, nr);
  if (!o) throw new PdfAnhangFehler(`PDF-Objekt ${nr} nicht gefunden.`);
  return o;
}

/** Trailer (klassisch oder Querverweis-Strom) des letzten Abschnitts lesen */
function trailerLesen(s) {
  const sx = s.lastIndexOf("startxref");
  if (sx < 0) throw new PdfAnhangFehler("PDF ohne Querverweis (startxref).");
  const offset = Number(/startxref\s+(\d+)/.exec(s.slice(sx))?.[1]);
  if (!Number.isFinite(offset) || offset <= 0 || offset >= s.length) throw new PdfAnhangFehler("PDF-Querverweis ungültig.");
  const ab = s.slice(offset, offset + 40);
  if (/^\s*xref/.test(ab)) {
    const t = s.indexOf("trailer", offset);
    if (t < 0) throw new PdfAnhangFehler("PDF-Trailer fehlt.");
    const [dict] = dictAb(s, s.indexOf("<<", t));
    return { dict, offset, strom: false };
  }
  const m = /^\s*\d+\s+\d+\s+obj\s*/.exec(ab);
  if (!m) throw new PdfAnhangFehler("PDF-Querverweis nicht lesbar.");
  const [dict] = dictAb(s, offset + m[0].length);
  if (!/\/Type\s*\/XRef/.test(dict)) throw new PdfAnhangFehler("PDF-Querverweis-Strom nicht lesbar.");
  return { dict, offset, strom: true };
}

/** Objekte eines selbst erzeugten PDFs (server/pdf.js) über dessen xref-Tabelle zerlegen */
function eigeneObjekte(pdf) {
  const s = L(pdf);
  const sx = Number(/startxref\s+(\d+)/.exec(s.slice(s.lastIndexOf("startxref")))[1]);
  const kopf = /xref\s+0\s+(\d+)\s+/.exec(s.slice(sx));
  const anzahl = Number(kopf[1]);
  const zeilenStart = sx + kopf[0].length;
  const offsets = [];
  for (let i = 1; i < anzahl; i++) offsets.push(Number(s.slice(zeilenStart + i * 20, zeilenStart + i * 20 + 10)));
  const objekte = new Map();
  offsets.forEach((o, i) => {
    const ende = i + 1 < offsets.length ? offsets[i + 1] : sx;
    const roh = s.slice(o, ende);
    const nr = i + 1;
    const koerper = roh.slice(roh.indexOf("obj\n") + 4, roh.lastIndexOf("\nendobj"));
    objekte.set(nr, koerper);
  });
  const trailer = s.slice(s.indexOf("trailer", sx));
  return { objekte, root: ref(trailer, "Root").nr, info: ref(trailer, "Info")?.nr };
}

/** Verweise „n 0 R“ nur im Dictionary-Teil umnummerieren (nie in Strömen) */
function umnummerieren(koerper, abbildung) {
  const strom = koerper.indexOf("\nstream\n");
  const kopf = strom >= 0 ? koerper.slice(0, strom) : koerper;
  const rest = strom >= 0 ? koerper.slice(strom) : "";
  return kopf.replace(/\b(\d+) 0 R\b/g, (x, nr) => abbildung.get(Number(nr)) || x) + rest;
}

/**
 * Hängt alle Seiten von `zusatz` (PDF aus PdfDokument) an `original` an.
 * Liefert { pdf (Buffer), seitenVorher, seitenNachher }.
 */
export function pdfSeitenAnhaengen(original, zusatz) {
  if (!Buffer.isBuffer(original) || original.length < 20) throw new PdfAnhangFehler("Leeres PDF.");
  const s = L(original);
  if (!s.slice(0, 1024).includes("%PDF-")) throw new PdfAnhangFehler("Keine PDF-Datei.");
  const trailer = trailerLesen(s);
  if (/\/Encrypt\b/.test(trailer.dict)) throw new PdfAnhangFehler("Verschlüsselte PDFs können nicht signiert werden. Bitte ohne Kennwortschutz hochladen.");
  const root = ref(trailer.dict, "Root");
  const groesse = zahlWert(trailer.dict, "Size");
  if (!root || !groesse) throw new PdfAnhangFehler("PDF-Trailer unvollständig.");
  const katalog = objektLesen(original, s, root.nr).text;
  const pagesRef = ref(katalog, "Pages");
  if (!pagesRef) throw new PdfAnhangFehler("PDF ohne Seitenbaum.");
  const pages = objektLesen(original, s, pagesRef.nr);
  const kids = /\/Kids\s*\[([^\]]*)\]/.exec(pages.text);
  const count = zahlWert(pages.text, "Count");
  if (!kids || count === null) throw new PdfAnhangFehler("PDF-Seitenbaum nicht lesbar.");

  // Eigene Objekte übernehmen (ohne Katalog, Seitenbaum, Info) und ab /Size neu nummerieren
  const eigen = eigeneObjekte(zusatz);
  const eigenPages = ref(eigen.objekte.get(eigen.root), "Pages").nr;
  const eigenKids = [...eigen.objekte.get(eigenPages).matchAll(/(\d+) 0 R/g)].map((m) => Number(m[1]));
  const abbildung = new Map([[eigenPages, `${pagesRef.nr} ${pagesRef.gen} R`]]);
  let naechste = groesse;
  const uebernehmen = [...eigen.objekte.keys()].filter((nr) => ![eigen.root, eigenPages, eigen.info].includes(nr));
  for (const nr of uebernehmen) abbildung.set(nr, `${naechste++} 0 R`);
  const neueObjekte = uebernehmen.map((nr) => ({ nr: Number(abbildung.get(nr).split(" ")[0]), gen: 0, text: umnummerieren(eigen.objekte.get(nr), abbildung) }));
  const neueKids = eigenKids.map((k) => abbildung.get(k));

  // Seitenbaum in neuer Fassung (gleiche Objektnummer): Kinder ergänzen, Anzahl erhöhen
  const pagesNeu = pages.text
    .replace(/\/Kids\s*\[([^\]]*)\]/, (_, innen) => `/Kids [${innen.trim()} ${neueKids.join(" ")}]`)
    .replace(/\/Count\s+\d+/, `/Count ${count + neueKids.length}`);

  const teile = [];
  let laenge = original.length;
  const schreiben = (t) => {
    teile.push(Buffer.from(t, "latin1"));
    laenge += Buffer.byteLength(t, "latin1");
  };
  const eintraege = [];
  schreiben(s.endsWith("\n") || s.endsWith("\r") ? "" : "\n");
  const objektSchreiben = (nr, gen, text) => {
    eintraege.push({ nr, gen, offset: laenge });
    schreiben(`${nr} ${gen} obj\n${text}\nendobj\n`);
  };
  objektSchreiben(pagesRef.nr, pagesRef.gen, pagesNeu);
  for (const o of neueObjekte) objektSchreiben(o.nr, o.gen, o.text);

  const info = ref(trailer.dict, "Info");
  const id = /\/ID\s*\[[^\]]*\]/.exec(trailer.dict)?.[0] || "";
  const zusatzTrailer = `${info ? ` /Info ${info.nr} ${info.gen} R` : ""}${id ? ` ${id}` : ""}`;

  // Querverweise: zusammenhängende Nummernbereiche
  const abschnitte = (liste) => {
    const sortiert = [...liste].sort((a, b) => a.nr - b.nr);
    const out = [];
    for (const e of sortiert) {
      const letzter = out[out.length - 1];
      if (letzter && letzter.start + letzter.eintraege.length === e.nr) letzter.eintraege.push(e);
      else out.push({ start: e.nr, eintraege: [e] });
    }
    return out;
  };

  if (!trailer.strom) {
    const xref = laenge;
    let t = "xref\n0 1\n0000000000 65535 f \n"; // freier Eintrag 0 (strenge Leser erwarten den Nullindex)
    for (const a of abschnitte(eintraege)) {
      t += `${a.start} ${a.eintraege.length}\n`;
      for (const e of a.eintraege) t += `${String(e.offset).padStart(10, "0")} ${String(e.gen).padStart(5, "0")} n \n`;
    }
    t += `trailer\n<< /Size ${naechste} /Root ${root.nr} ${root.gen} R /Prev ${trailer.offset}${zusatzTrailer} >>\nstartxref\n${xref}\n%%EOF\n`;
    schreiben(t);
  } else {
    // Querverweis-Strom (Typ 1 = belegt: Offset 4 Byte, Generation 2 Byte), unkomprimiert
    const xrefNr = naechste++;
    const xref = laenge;
    const alle = [...eintraege, { nr: xrefNr, gen: 0, offset: xref }];
    const bereiche = [{ start: 0, eintraege: [{ frei: true }] }, ...abschnitte(alle)];
    const daten = Buffer.alloc((alle.length + 1) * 7);
    let p = 0;
    for (const a of bereiche) {
      for (const e of a.eintraege) {
        daten[p] = e.frei ? 0 : 1;
        daten.writeUInt32BE(e.frei ? 0 : e.offset, p + 1);
        daten.writeUInt16BE(e.frei ? 65535 : e.gen, p + 5);
        p += 7;
      }
    }
    const index = bereiche.map((a) => `${a.start} ${a.eintraege.length}`).join(" ");
    schreiben(`${xrefNr} 0 obj\n<< /Type /XRef /Size ${naechste} /Root ${root.nr} ${root.gen} R /Prev ${trailer.offset}${zusatzTrailer} /Index [${index}] /W [1 4 2] /Length ${daten.length} >>\nstream\n`);
    teile.push(daten);
    laenge += daten.length;
    schreiben(`\nendstream\nendobj\nstartxref\n${xref}\n%%EOF\n`);
  }
  return { pdf: Buffer.concat([original, ...teile]), seitenVorher: count, seitenNachher: count + neueKids.length };
}

/** Seitenzahl eines PDFs (für die Anzeige; 0, wenn nicht lesbar) */
export function pdfSeitenzahl(pdf) {
  try {
    const s = L(pdf);
    const t = trailerLesen(s);
    const root = ref(t.dict, "Root");
    const pages = ref(objektLesen(pdf, s, root.nr).text, "Pages");
    return zahlWert(objektLesen(pdf, s, pages.nr).text, "Count") || 0;
  } catch {
    return 0;
  }
}

/** Prüft, dass `signiert` mit den unveränderten Bytes von `original` beginnt (inkrementelles Update) */
export const beginntMitOriginal = (signiert, original) =>
  Buffer.isBuffer(signiert) && Buffer.isBuffer(original) && signiert.length > original.length && signiert.subarray(0, original.length).equals(original);
